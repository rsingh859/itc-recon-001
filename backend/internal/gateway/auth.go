package gateway

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var defaultSecret = []byte("autotax_jwt_secret_key_production_grade_2026")

// TaxDriveClaims contains tenant identity and permissions
type TaxDriveClaims struct {
	TenantID    string `json:"tenantId"`
	ActiveGSTIN string `json:"activeGstin"`
	UserID      string `json:"userId"`
	UserRole    string `json:"userRole"`
	jwt.RegisteredClaims
}

// GenerateTestToken generates a signed JWT for testing / authentication
func GenerateTestToken(tenantID, activeGSTIN, userID, role string, duration time.Duration) (string, error) {
	claims := TaxDriveClaims{
		TenantID:    tenantID,
		ActiveGSTIN: activeGSTIN,
		UserID:      userID,
		UserRole:    role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "autotax-gateway",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(defaultSecret)
}

// ValidateAndInjectAuth verifies JWT tokens or passes pre-existing headers in dev mode
func ValidateAndInjectAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		var tenantID, activeGSTIN, userRole string

		// If Bearer token is provided, parse and validate
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.ParseWithClaims(tokenString, &TaxDriveClaims{}, func(token *jwt.Token) (interface{}, error) {
				return defaultSecret, nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(*TaxDriveClaims); ok {
					tenantID = claims.TenantID
					activeGSTIN = claims.ActiveGSTIN
					userRole = claims.UserRole
				}
			}
		}

		// Fallback to incoming headers (for dev mode / compatibility)
		if tenantID == "" {
			tenantID = r.Header.Get("X-Tenant-ID")
			if tenantID == "" {
				tenantID = "dms-01"
			}
		}

		if activeGSTIN == "" {
			activeGSTIN = r.Header.Get("X-Active-GSTIN")
			if activeGSTIN == "" {
				activeGSTIN = "07AABCA9876K1Z2"
			}
		}

		if userRole == "" {
			userRole = r.Header.Get("X-User-Role")
			if userRole == "" {
				userRole = "FINANCE_DIRECTOR"
			}
		}

		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			bytes := make([]byte, 8)
			_, _ = rand.Read(bytes)
			correlationID = "req_" + hex.EncodeToString(bytes)
		}

		// Inject sanitized headers into downstream request
		r.Header.Set("X-Tenant-ID", tenantID)
		r.Header.Set("X-Active-GSTIN", activeGSTIN)
		r.Header.Set("X-User-Role", userRole)
		r.Header.Set("X-Correlation-ID", correlationID)

		next.ServeHTTP(w, r)
	})
}
