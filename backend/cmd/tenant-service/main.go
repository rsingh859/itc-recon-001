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

	"github.com/autotax/backend/internal/handlers"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
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

	tenantsH := handlers.NewTenantsHandler(datastore)
	authH := handlers.NewAuthHandler(datastore)
	healthH := handlers.NewHealthHandler(datastore)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthH.Healthz)
	mux.HandleFunc("/api/v1/auth/login", authH.Login)
	mux.HandleFunc("/api/v1/auth/signup", authH.SignUp)
	mux.HandleFunc("/api/v1/auth/demo", authH.DemoLogin)
	mux.HandleFunc("/api/v1/auth/me", authH.Me)
	mux.HandleFunc("/api/v1/tenants/dealerships", tenantsH.ListDealerships)
	mux.HandleFunc("/api/v1/tenants/dealerships/", tenantsH.GetDealership)
	mux.HandleFunc("/api/v1/tenants/current", tenantsH.GetCurrentTenant)


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
		fmt.Printf("🏢 Tenant & Identity Microservice Running on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Tenant service failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down Tenant service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
