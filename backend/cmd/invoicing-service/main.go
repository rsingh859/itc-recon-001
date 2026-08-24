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
		port = "8084"
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

	invoicesH := handlers.NewInvoicesHandler(datastore)
	noticesH := handlers.NewNoticesHandler(datastore)
	complianceH := handlers.NewComplianceHandler(datastore)
	oemH := handlers.NewOEMHandler(datastore)
	gstr3bH := handlers.NewGstr3bHandler(datastore)
	healthH := handlers.NewHealthHandler(datastore)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthH.Healthz)

	// Sales Invoices & IRN
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
		fmt.Printf("📑 Invoicing, Compliance & OEM Microservice Running on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Invoicing service failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down Invoicing service...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
