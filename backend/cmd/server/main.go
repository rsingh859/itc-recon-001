package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/autotax/backend/internal/handlers"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	var datastore store.DataStore
	var storageEngineName string

	// Initialize Dual-Mode Storage Engine
	if databaseURL != "" {
		log.Printf("Connecting to PostgreSQL at: %s", maskDatabaseURL(databaseURL))
		initCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		pgStore, err := store.NewPostgresStore(initCtx, databaseURL)
		cancel()

		if err != nil {
			log.Printf("⚠️ PostgreSQL connection failed (%v). Falling back to thread-safe in-memory store.", err)
			datastore = store.NewMemoryStore()
			storageEngineName = "In-Memory Store (Fallback)"
		} else {
			datastore = pgStore
			storageEngineName = "PostgreSQL 16 (ACID Transactions & Multi-Tenant RLS Active)"
		}
	} else {
		log.Println("ℹ️ No DATABASE_URL specified. Running with high-performance in-memory datastore.")
		datastore = store.NewMemoryStore()
		storageEngineName = "In-Memory Store (Thread-Safe)"
	}

	defer func() {
		_ = datastore.Close()
	}()

	// Instantiate handlers
	healthH := handlers.NewHealthHandler(datastore)
	tenantsH := handlers.NewTenantsHandler(datastore)
	authH := handlers.NewAuthHandler(datastore)
	docH := handlers.NewDocumentsHandler(datastore)
	reconH := handlers.NewReconHandler(datastore)
	invoicesH := handlers.NewInvoicesHandler(datastore)
	ingestH := handlers.NewIngestHandler(datastore)
	noticesH := handlers.NewNoticesHandler(datastore)
	complianceH := handlers.NewComplianceHandler(datastore)
	oemH := handlers.NewOEMHandler(datastore)
	gstr3bH := handlers.NewGstr3bHandler(datastore)

	// Router
	mux := http.NewServeMux()

	// Health & Telemetry
	mux.HandleFunc("/healthz", healthH.Healthz)
	mux.HandleFunc("/api/v1/metrics", healthH.Metrics)

	// Authentication & Identity
	mux.HandleFunc("/api/v1/auth/login", authH.Login)
	mux.HandleFunc("/api/v1/auth/signup", authH.SignUp)
	mux.HandleFunc("/api/v1/auth/demo", authH.DemoLogin)
	mux.HandleFunc("/api/v1/auth/me", authH.Me)

	// Tenants & Identity
	mux.HandleFunc("/api/v1/tenants/dealerships", func(w http.ResponseWriter, r *http.Request) {
		tenantsH.ListDealerships(w, r)
	})
	mux.HandleFunc("/api/v1/tenants/dealerships/", func(w http.ResponseWriter, r *http.Request) {
		tenantsH.GetDealership(w, r)
	})
	mux.HandleFunc("/api/v1/tenants/current", tenantsH.GetCurrentTenant)

	// Reconciliation Compute Engine
	mux.HandleFunc("/api/v1/recon/run", reconH.RunReconciliation)
	mux.HandleFunc("/api/v1/recon/records", reconH.GetRecords)
	mux.HandleFunc("/api/v1/recon/summary", reconH.GetSummary)
	mux.HandleFunc("/api/v1/recon/override", reconH.OverrideRecord)
	mux.HandleFunc("/api/v1/recon/jobs", reconH.RunReconciliation) // Batch job runner

	// Documents & Smart OCR Hub
	mux.HandleFunc("/api/v1/documents/upload", docH.Upload)
	mux.HandleFunc("/api/v1/documents", docH.ListDocuments)
	mux.HandleFunc("/api/v1/documents/confirm", docH.ConfirmExtraction)

	// Ingestion & GSP Sync & Manual Ingestion
	mux.HandleFunc("/api/v1/ingest/sync", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			ingestH.SyncGSP(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/v1/ingest/status", ingestH.GetStatus)
	mux.HandleFunc("/api/v1/ingest/manual/pr", ingestH.IngestManualPR)
	mux.HandleFunc("/api/v1/ingest/manual/2b", ingestH.IngestManual2B)
	mux.HandleFunc("/api/v1/ingest/seed-demo", ingestH.SeedDemo)

	// Outbound Sales Invoices & IRN
	mux.HandleFunc("/api/v1/invoices", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			invoicesH.ListInvoices(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/v1/invoices/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/irn") && r.Method == http.MethodPost {
			invoicesH.GenerateIRN(w, r)
		} else {
			invoicesH.ListInvoices(w, r)
		}
	})

	// Notices & Communications
	mux.HandleFunc("/api/v1/notices/dispatch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			noticesH.DispatchNotice(w, r)
		} else {
			http.NotFound(w, r)
		}
	})
	mux.HandleFunc("/api/v1/notices/logs", noticesH.GetLogs)

	// Compliance Alerts & Workflow
	mux.HandleFunc("/api/v1/compliance/alerts", complianceH.ListAlerts)
	mux.HandleFunc("/api/v1/compliance/alerts/", complianceH.ResolveAlert)
	mux.HandleFunc("/api/v1/compliance/workflow", complianceH.ListWorkflow)

	// OEM Schemes
	mux.HandleFunc("/api/v1/oem/schemes", oemH.ListSchemes)
	mux.HandleFunc("/api/v1/oem/audit", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			oemH.TriggerAudit(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// GSTR-3B Table 4 Returns
	mux.HandleFunc("/api/v1/gstr3b/summary", gstr3bH.GetSummary)

	mux.HandleFunc("/api/v1/gstr3b/export", gstr3bH.ExportJSON)

	// Chain middlewares: Recovery -> CORS -> Tenant Context -> Logger -> Router
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
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown listener
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		fmt.Printf("\n===================================================\n")
		fmt.Printf("🚀 AutoTax Go Microservice Core Running on :%s\n", port)
		fmt.Printf("⚡ Storage Engine: %s\n", storageEngineName)
		fmt.Printf("⚡ Native Goroutine 7-Tier Reconciliation Engine Active\n")
		fmt.Printf("📊 Endpoints:\n")
		fmt.Printf("   • Health & Telemetry: http://localhost:%s/healthz\n", port)
		fmt.Printf("   • Runtime Metrics:   http://localhost:%s/api/v1/metrics\n", port)
		fmt.Printf("   • Tenants & Dealers: http://localhost:%s/api/v1/tenants/dealerships\n", port)
		fmt.Printf("   • Recon Engine:      http://localhost:%s/api/v1/recon/records\n", port)
		fmt.Printf("   • Sales Invoices:    http://localhost:%s/api/v1/invoices\n", port)
		fmt.Printf("   • GSTR-3B Table 4:   http://localhost:%s/api/v1/gstr3b/summary\n", port)
		fmt.Printf("===================================================\n\n")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down AutoTax Go backend gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}

	log.Println("AutoTax Go Backend stopped cleanly.")
}

func maskDatabaseURL(raw string) string {
	if strings.Contains(raw, "@") {
		parts := strings.Split(raw, "@")
		return "postgres://***@" + parts[1]
	}
	return "postgres://***"
}
