package middleware

import "net/http"

// CORS adds Cross-Origin Resource Sharing headers for local frontend development and production
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, X-Tenant-ID, X-Active-GSTIN, X-Correlation-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Correlation-ID, X-Execution-Time-Us, X-Server-Engine")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
