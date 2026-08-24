package middleware

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	status      int
	written     int64
	wroteHeader bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.wroteHeader {
		rw.status = code
		rw.wroteHeader = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.WriteHeader(http.StatusOK)
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.written += int64(n)
	return n, err
}

// Logger logs incoming HTTP requests with microsecond latency precision
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		durationUs := duration.Microseconds()
		durationMs := float64(duration.Nanoseconds()) / 1e6

		w.Header().Set("X-Execution-Time-Us", fmt.Sprintf("%d", durationUs))
		w.Header().Set("X-Server-Engine", "Go-Goroutine-V1")

		log.Printf("[%s] %s %s - %d (%d bytes) in %.2fms (%d µs)",
			r.Method, r.URL.Path, r.RemoteAddr, rw.status, rw.written, durationMs, durationUs)
	})
}
