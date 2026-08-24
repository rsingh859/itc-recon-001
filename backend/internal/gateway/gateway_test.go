package gateway

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAuthAndRateLimiting(t *testing.T) {
	// 1. Test JWT Generation & Validation
	token, err := GenerateTestToken("dms-01", "07AABCA9876K1Z2", "user_test", "TAX_AUDITOR", 1*time.Hour)
	if err != nil {
		t.Fatalf("GenerateTestToken failed: %v", err)
	}

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenant := r.Header.Get("X-Tenant-ID")
		gstin := r.Header.Get("X-Active-GSTIN")
		role := r.Header.Get("X-User-Role")
		if tenant != "dms-01" || gstin != "07AABCA9876K1Z2" || role != "TAX_AUDITOR" {
			t.Errorf("Claims mismatch: tenant=%s, gstin=%s, role=%s", tenant, gstin, role)
		}
		w.WriteHeader(http.StatusOK)
	})

	wrappedHandler := ValidateAndInjectAuth(testHandler)

	req := httptest.NewRequest("GET", "/api/v1/recon/records", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", rec.Code)
	}

	// 2. Test Rate Limiter
	limiter := NewTokenBucketLimiter(5.0, 2.0)
	if !limiter.Allow("tenant-test") {
		t.Fatal("First request should be allowed")
	}
	if !limiter.Allow("tenant-test") {
		t.Fatal("Second request within capacity should be allowed")
	}
	if limiter.Allow("tenant-test") {
		t.Fatal("Third burst request should be rate-limited")
	}
}
