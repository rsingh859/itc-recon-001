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

	"github.com/autotax/backend/internal/gateway"
	"github.com/autotax/backend/internal/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	routes := gateway.DefaultServiceRoutes()
	router, err := gateway.NewRouter(routes)
	if err != nil {
		log.Fatalf("Failed to initialize gateway router: %v", err)
	}

	limiter := gateway.NewTokenBucketLimiter(100.0, 200.0) // 100 req/sec, burst 200

	// Chain middlewares: Recovery -> CORS -> Rate Limit -> Auth Validation & Context Injection -> Router
	handler := middleware.Recovery(
		middleware.CORS(
			gateway.RateLimitMiddleware(limiter)(
				gateway.ValidateAndInjectAuth(
					middleware.Logger(router),
				),
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

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		fmt.Printf("\n===================================================\n")
		fmt.Printf("🌐 AutoTax API Gateway Running on :%s\n", port)
		fmt.Printf("🔒 JWT Validation, RLS Claim Injection & Rate Limiter Active\n")
		fmt.Printf("🔀 Upstream Service Routing Mesh:\n")
		fmt.Printf("   • Tenants & Identity:    %s\n", routes.TenantServiceURL)
		fmt.Printf("   • Ingestion & GSP Sync:  %s\n", routes.IngestServiceURL)
		fmt.Printf("   • Recon Engine (+Redis): %s\n", routes.ReconServiceURL)
		fmt.Printf("   • Invoicing & Compliance:%s\n", routes.InvoicingServiceURL)
		fmt.Printf("===================================================\n\n")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Gateway server failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down API Gateway gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	log.Println("API Gateway stopped.")
}
