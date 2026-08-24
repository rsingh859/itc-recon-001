package gateway

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	tokens     float64
	lastRefill time.Time
}

// TokenBucketLimiter provides thread-safe in-memory rate limiting
type TokenBucketLimiter struct {
	mu         sync.Mutex
	buckets    map[string]*bucket
	rate       float64 // tokens per second
	capacity   float64 // maximum bucket burst capacity
}

// NewTokenBucketLimiter creates a rate limiter
func NewTokenBucketLimiter(rate float64, capacity float64) *TokenBucketLimiter {
	limiter := &TokenBucketLimiter{
		buckets:  make(map[string]*bucket),
		rate:     rate,
		capacity: capacity,
	}

	go limiter.cleanupLoop()
	return limiter
}

func (l *TokenBucketLimiter) cleanupLoop() {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		l.mu.Lock()
		now := time.Now()
		for k, b := range l.buckets {
			if now.Sub(b.lastRefill) > 5*time.Minute {
				delete(l.buckets, k)
			}
		}
		l.mu.Unlock()
	}
}

// Allow checks if a request with key should be allowed
func (l *TokenBucketLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, exists := l.buckets[key]
	if !exists {
		l.buckets[key] = &bucket{
			tokens:     l.capacity - 1.0,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens = b.tokens + elapsed*l.rate
	if b.tokens > l.capacity {
		b.tokens = l.capacity
	}
	b.lastRefill = now

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}

	return false
}

// RateLimitMiddleware enforces rate limiting per tenant/IP
func RateLimitMiddleware(limiter *TokenBucketLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get("X-Tenant-ID")
			if key == "" {
				key = r.RemoteAddr
			}

			if !limiter.Allow(key) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "1")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"success": false,
					"error":   "Rate limit exceeded. Please throttle your request rate.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
