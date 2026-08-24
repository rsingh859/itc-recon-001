package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/autotax/backend/internal/cache"
	"github.com/autotax/backend/internal/handlers"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	var datastore store.DataStore
	if databaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		pgStore, err := store.NewPostgresStore(ctx, databaseURL)
		cancel()
		if err != nil {
			log.Printf("⚠️ PostgreSQL connection failed (%v). Falling back to MemoryStore.", err)
			datastore = store.NewMemoryStore()
		} else {
			datastore = pgStore
		}
	} else {
		datastore = store.NewMemoryStore()
	}
	defer datastore.Close()

	// Initialize Cache Layer (Redis or In-Memory TTL)
	redisURL := os.Getenv("REDIS_URL")
	var fastCache cache.Cache
	if redisURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		rCache, err := cache.NewRedisCache(ctx, redisURL)
		cancel()
		if err != nil {
			log.Printf("⚠️ Redis connection failed (%v). Falling back to high-speed in-memory cache.", err)
			fastCache = cache.NewMemoryCache()
		} else {
			log.Println("⚡ Connected to Redis Cache on port :6379 successfully.")
			fastCache = rCache
		}
	} else {
		fastCache = cache.NewMemoryCache()
	}
	defer fastCache.Close()

	reconH := handlers.NewReconHandler(datastore)
	healthH := handlers.NewHealthHandler(datastore)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthH.Healthz)

	// Cached / Fast Query Handlers
	mux.HandleFunc("/api/v1/recon/records", func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r)
		activeGSTIN := middleware.GetActiveGSTIN(r)
		cacheKey := fmt.Sprintf("recon:records:%s:%s:%s", tenantID, activeGSTIN, r.URL.RawQuery)

		var cachedPayload []byte
		if err := fastCache.Get(r.Context(), cacheKey, &cachedPayload); err == nil && len(cachedPayload) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			_, _ = w.Write(cachedPayload)
			return
		}

		// Cache Miss - execute handler and cache response
		reconH.GetRecords(w, r)
	})

	mux.HandleFunc("/api/v1/recon/summary", func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r)
		activeGSTIN := middleware.GetActiveGSTIN(r)
		cacheKey := fmt.Sprintf("recon:summary:%s:%s", tenantID, activeGSTIN)

		var cachedSummary interface{}
		if err := fastCache.Get(r.Context(), cacheKey, &cachedSummary); err == nil && cachedSummary != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			handlers.WriteJSON(w, r, http.StatusOK, cachedSummary, "Reconciliation summary (cached)", time.Now())
			return
		}

		reconH.GetSummary(w, r)
	})

	mux.HandleFunc("/api/v1/recon/run", func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r)
		_ = fastCache.DeletePrefix(r.Context(), fmt.Sprintf("recon:%s", tenantID))
		_ = fastCache.DeletePrefix(r.Context(), "recon:records")
		_ = fastCache.DeletePrefix(r.Context(), "recon:summary")
		reconH.RunReconciliation(w, r)
	})

	mux.HandleFunc("/api/v1/recon/override", func(w http.ResponseWriter, r *http.Request) {
		tenantID := middleware.GetTenantID(r)
		_ = fastCache.DeletePrefix(r.Context(), fmt.Sprintf("recon:%s", tenantID))
		_ = fastCache.DeletePrefix(r.Context(), "recon:records")
		_ = fastCache.DeletePrefix(r.Context(), "recon:summary")
		reconH.OverrideRecord(w, r)
	})

	mux.HandleFunc("/api/v1/recon/jobs", reconH.RunReconciliation)

	handler := middleware.Recovery(
		middleware.CORS(
			middleware.TenantMiddleware(
				middleware.Logger(mux),
			),
		),
	)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		fmt.Printf("⚡ Reconciliation Compute Engine Microservice (+Redis) Running on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Recon service failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down Recon service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
