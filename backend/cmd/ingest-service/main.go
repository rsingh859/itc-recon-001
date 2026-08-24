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

	"github.com/autotax/backend/internal/events"
	"github.com/autotax/backend/internal/handlers"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
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

	broker := events.NewInMemoryEventBroker(4, 256)
	defer broker.Close()
	events.RegisterDefaultConsumers(broker, datastore)

	ingestH := handlers.NewIngestHandler(datastore)
	docH := handlers.NewDocumentsHandler(datastore)
	healthH := handlers.NewHealthHandler(datastore)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthH.Healthz)
	mux.HandleFunc("/api/v1/ingest/sync", func(w http.ResponseWriter, r *http.Request) {
		ingestH.SyncGSP(w, r)
		// Publish event to event broker
		activeGSTIN := middleware.GetActiveGSTIN(r)
		tenantID := middleware.GetTenantID(r)
		_ = broker.Publish(r.Context(), events.Gstr2bIngestionCompletedEvent{
			BaseEvent: events.BaseEvent{
				EventType: events.TypeGstr2bIngestionCompleted,
				TenantID:  tenantID,
				CreatedAt: time.Now(),
			},
			BranchGSTIN:   activeGSTIN,
			FilingPeriod:  "July 2026",
			RecordsSynced: 6,
		})
	})
	mux.HandleFunc("/api/v1/ingest/status", ingestH.GetStatus)
	mux.HandleFunc("/api/v1/ingest/manual/pr", ingestH.IngestManualPR)
	mux.HandleFunc("/api/v1/ingest/manual/2b", ingestH.IngestManual2B)
	mux.HandleFunc("/api/v1/ingest/seed-demo", ingestH.SeedDemo)

	// Documents & Smart OCR
	mux.HandleFunc("/api/v1/documents/upload", docH.Upload)
	mux.HandleFunc("/api/v1/documents", docH.ListDocuments)
	mux.HandleFunc("/api/v1/documents/confirm", docH.ConfirmExtraction)


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
		fmt.Printf("📥 Ingestion & GSP Pipeline Microservice Running on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Ingestion service failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down Ingestion service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
