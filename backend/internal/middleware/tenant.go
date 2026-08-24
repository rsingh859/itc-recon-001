package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

type contextKey string

const (
	TenantIDKey      contextKey = "tenantId"
	ActiveGSTINKey   contextKey = "activeGstin"
	UserRoleKey      contextKey = "userRole"
	CorrelationIDKey contextKey = "correlationId"
)

// TenantMiddleware extracts tenant context, GSTIN, and generates or propagates correlation IDs
func TenantMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get("X-Tenant-ID")
		if tenantID == "" {
			tenantID = "dms-01" // Default fallback tenant
		}

		activeGSTIN := r.Header.Get("X-Active-GSTIN")
		if activeGSTIN == "" {
			activeGSTIN = "07AABCA9876K1Z2" // Default branch GSTIN
		}

		userRole := r.Header.Get("X-User-Role")
		if userRole == "" {
			userRole = "FINANCE_DIRECTOR"
		}

		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			bytes := make([]byte, 8)
			_, _ = rand.Read(bytes)
			correlationID = "req_" + hex.EncodeToString(bytes)
		}

		ctx := context.WithValue(r.Context(), TenantIDKey, tenantID)
		ctx = context.WithValue(ctx, ActiveGSTINKey, activeGSTIN)
		ctx = context.WithValue(ctx, UserRoleKey, userRole)
		ctx = context.WithValue(ctx, CorrelationIDKey, correlationID)

		w.Header().Set("X-Correlation-ID", correlationID)
		w.Header().Set("X-Tenant-ID", tenantID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetTenantID retrieves tenant ID from request context
func GetTenantID(r *http.Request) string {
	if val, ok := r.Context().Value(TenantIDKey).(string); ok {
		return val
	}
	return "dms-01"
}

// GetActiveGSTIN retrieves active branch GSTIN from request context
func GetActiveGSTIN(r *http.Request) string {
	if val, ok := r.Context().Value(ActiveGSTINKey).(string); ok {
		return val
	}
	return "07AABCA9876K1Z2"
}

// GetUserRole retrieves user role from request context
func GetUserRole(r *http.Request) string {
	if val, ok := r.Context().Value(UserRoleKey).(string); ok {
		return val
	}
	return "FINANCE_DIRECTOR"
}

// GetCorrelationID retrieves correlation ID from request context
func GetCorrelationID(r *http.Request) string {
	if val, ok := r.Context().Value(CorrelationIDKey).(string); ok {
		return val
	}
	return "req_unknown"
}

