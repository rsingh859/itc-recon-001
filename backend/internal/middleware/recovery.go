package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/autotax/backend/internal/domain"
)

// Recovery catches any unhandled panics and returns a clean 500 JSON envelope
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				stack := string(debug.Stack())
				log.Printf("[PANIC RECOVERED] %v\nStack: %s", err, stack)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)

				_ = json.NewEncoder(w).Encode(domain.APIResponse{
					Success: false,
					Error:   fmt.Sprintf("Internal Server Error: %v", err),
					Meta: &domain.APIMeta{
						CorrelationID: GetCorrelationID(r),
						Version:       "1.0.0-go",
					},
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}
