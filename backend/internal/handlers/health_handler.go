package handlers

import (
	"net/http"
	"runtime"
	"time"

	"github.com/autotax/backend/internal/store"
)

// HealthHandler provides health check and telemetry metrics
type HealthHandler struct {
	store store.DataStore
}

// NewHealthHandler creates a health handler
func NewHealthHandler(s store.DataStore) *HealthHandler {
	return &HealthHandler{store: s}
}

// Healthz responds to liveness probes
func (h *HealthHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	data := map[string]interface{}{
		"status":    "UP",
		"service":   "autotax-go-backend",
		"timestamp": time.Now().Format(time.RFC3339),
		"uptimeSec": int(time.Since(h.store.GetStartTime()).Seconds()),
	}
	WriteJSON(w, r, http.StatusOK, data, "Service healthy", start)
}

// Metrics returns runtime telemetry including goroutine count and memory footprint
func (h *HealthHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	metrics := map[string]interface{}{
		"goroutines":    runtime.NumGoroutine(),
		"numCPU":        runtime.NumCPU(),
		"allocBytes":    memStats.Alloc,
		"allocMB":       float64(memStats.Alloc) / (1024 * 1024),
		"totalAllocMB":  float64(memStats.TotalAlloc) / (1024 * 1024),
		"sysMB":         float64(memStats.Sys) / (1024 * 1024),
		"numGC":         memStats.NumGC,
		"uptimeSec":     int(time.Since(h.store.GetStartTime()).Seconds()),
		"goVersion":     runtime.Version(),
		"engineEngine":  "Native Go SIMD + Goroutine Worker Pool",
		"targetArch":    runtime.GOOS + "/" + runtime.GOARCH,
	}

	WriteJSON(w, r, http.StatusOK, metrics, "Telemetry metrics retrieved", start)
}
