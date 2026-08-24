package gateway

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

// ServiceRoutes maps prefix paths to downstream microservices
type ServiceRoutes struct {
	TenantServiceURL    string
	IngestServiceURL    string
	ReconServiceURL     string
	InvoicingServiceURL string
}

// DefaultServiceRoutes reads environment variables or defaults
func DefaultServiceRoutes() ServiceRoutes {
	getEnv := func(k, def string) string {
		v := os.Getenv(k)
		if v != "" {
			return v
		}
		return def
	}

	return ServiceRoutes{
		TenantServiceURL:    getEnv("TENANT_SERVICE_URL", "http://localhost:8081"),
		IngestServiceURL:    getEnv("INGEST_SERVICE_URL", "http://localhost:8082"),
		ReconServiceURL:     getEnv("RECON_SERVICE_URL", "http://localhost:8083"),
		InvoicingServiceURL: getEnv("INVOICING_SERVICE_URL", "http://localhost:8084"),
	}
}

// Router dispatches requests to appropriate downstream microservices
type Router struct {
	routes       ServiceRoutes
	tenantProxy  *httputil.ReverseProxy
	ingestProxy  *httputil.ReverseProxy
	reconProxy   *httputil.ReverseProxy
	invoiceProxy *httputil.ReverseProxy
	startTime    time.Time
}

// NewRouter creates a reverse proxy router
func NewRouter(routes ServiceRoutes) (*Router, error) {
	tURL, err := url.Parse(routes.TenantServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant service url: %w", err)
	}
	igURL, err := url.Parse(routes.IngestServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid ingest service url: %w", err)
	}
	rcURL, err := url.Parse(routes.ReconServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid recon service url: %w", err)
	}
	ivURL, err := url.Parse(routes.InvoicingServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid invoicing service url: %w", err)
	}

	createProxy := func(target *url.URL) *httputil.ReverseProxy {
		proxy := httputil.NewSingleHostReverseProxy(target)
		proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Microservice upstream unavailable (%s): %v", target.Host, err),
			})
		}
		return proxy
	}

	return &Router{
		routes:       routes,
		tenantProxy:  createProxy(tURL),
		ingestProxy:  createProxy(igURL),
		reconProxy:   createProxy(rcURL),
		invoiceProxy: createProxy(ivURL),
		startTime:    time.Now(),
	}, nil
}

// ServeHTTP routes HTTP traffic
func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Gateway direct endpoints
	if path == "/healthz" {
		rt.handleHealth(w, r)
		return
	}

	if path == "/api/v1/metrics" {
		rt.handleMetrics(w, r)
		return
	}

	if path == "/api/v1/auth/token" && r.Method == http.MethodPost {
		rt.handleGenerateToken(w, r)
		return
	}

	// Route to Domain Services
	switch {
	case strings.HasPrefix(path, "/api/v1/auth"),
		strings.HasPrefix(path, "/api/v1/tenants"):
		rt.tenantProxy.ServeHTTP(w, r)

	case strings.HasPrefix(path, "/api/v1/ingest"),
		strings.HasPrefix(path, "/api/v1/documents"):
		rt.ingestProxy.ServeHTTP(w, r)

	case strings.HasPrefix(path, "/api/v1/recon"):
		rt.reconProxy.ServeHTTP(w, r)


	case strings.HasPrefix(path, "/api/v1/invoices"),
		strings.HasPrefix(path, "/api/v1/notices"),
		strings.HasPrefix(path, "/api/v1/compliance"),
		strings.HasPrefix(path, "/api/v1/oem"),
		strings.HasPrefix(path, "/api/v1/gstr3b"):
		rt.invoiceProxy.ServeHTTP(w, r)

	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Gateway route not found: %s", path),
		})
	}
}

func (rt *Router) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "HEALTHY",
		"service": "autotax-api-gateway",
		"uptime":  time.Since(rt.startTime).String(),
		"routes":  rt.routes,
		"version": "1.0.0-microservices",
	})
}

func (rt *Router) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"service":     "autotax-api-gateway",
		"uptime_sec":  int(time.Since(rt.startTime).Seconds()),
		"target_mesh": rt.routes,
	})
}

func (rt *Router) handleGenerateToken(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = "dms-01"
	}
	gstin := r.URL.Query().Get("gstin")
	if gstin == "" {
		gstin = "07AABCA9876K1Z2"
	}
	role := r.URL.Query().Get("role")
	if role == "" {
		role = "FINANCE_DIRECTOR"
	}

	token, err := GenerateTestToken(tenantID, gstin, "user_demo", role, 24*time.Hour)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"token":       token,
		"tokenType":   "Bearer",
		"tenantId":    tenantID,
		"activeGstin": gstin,
		"role":        role,
		"expiresIn":   86400,
	})
}
