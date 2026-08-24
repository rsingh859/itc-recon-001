package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/middleware"
)

// WriteJSON sends a standardized API response with telemetry meta
func WriteJSON(w http.ResponseWriter, r *http.Request, status int, data interface{}, message string, startTime time.Time) {
	duration := time.Since(startTime)
	durationUs := duration.Microseconds()
	durationMs := fmt.Sprintf("%.2fms", float64(duration.Nanoseconds())/1e6)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := domain.APIResponse{
		Success: status >= 200 && status < 300,
		Message: message,
		Data:    data,
		Meta: &domain.APIMeta{
			CorrelationID:   middleware.GetCorrelationID(r),
			ExecutionTimeUs: durationUs,
			ExecutionTimeMs: durationMs,
			Version:         "1.0.0-go-native",
		},
	}

	_ = json.NewEncoder(w).Encode(resp)
}

// WriteError sends an error JSON envelope
func WriteError(w http.ResponseWriter, r *http.Request, status int, errMsg string, startTime time.Time) {
	duration := time.Since(startTime)
	durationUs := duration.Microseconds()
	durationMs := fmt.Sprintf("%.2fms", float64(duration.Nanoseconds())/1e6)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := domain.APIResponse{
		Success: false,
		Error:   errMsg,
		Meta: &domain.APIMeta{
			CorrelationID:   middleware.GetCorrelationID(r),
			ExecutionTimeUs: durationUs,
			ExecutionTimeMs: durationMs,
			Version:         "1.0.0-go-native",
		},
	}

	_ = json.NewEncoder(w).Encode(resp)
}
