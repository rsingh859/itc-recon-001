package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/gateway"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// AuthHandler handles authentication, registration, OAuth, and session tokens
type AuthHandler struct {
	store store.DataStore
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(s store.DataStore) *AuthHandler {
	return &AuthHandler{store: s}
}

// Login authenticates a user with email/password and returns a JWT
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		WriteError(w, r, http.StatusMethodNotAllowed, "Method not allowed", start)
		return
	}

	var req domain.AuthLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid request payload", start)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		WriteError(w, r, http.StatusBadRequest, "Email and password are required", start)
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		WriteError(w, r, http.StatusUnauthorized, "Invalid email or password", start)
		return
	}

	// In production, compare bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	// In dev/memory store, accept valid demo password or non-empty string
	dealership, _ := h.store.GetDealershipByID(r.Context(), user.TenantID)
	activeGstin := "07AABCA9876K1Z2"
	if dealership != nil && dealership.ActiveGSTIN != "" {
		activeGstin = dealership.ActiveGSTIN
	}

	token, err := gateway.GenerateTestToken(user.TenantID, activeGstin, user.ID, user.Role, 24*time.Hour)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to sign authentication token", start)
		return
	}

	resp := domain.AuthResponse{
		Success:     true,
		Token:       token,
		TokenType:   "Bearer",
		ExpiresIn:   86400,
		User:        *user,
		Dealership:  dealership,
		TenantID:    user.TenantID,
		ActiveGSTIN: activeGstin,
	}

	WriteJSON(w, r, http.StatusOK, resp, fmt.Sprintf("Welcome back, %s", user.FullName), start)
}

// SignUp handles new user registration and dealership organization onboarding
func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		WriteError(w, r, http.StatusMethodNotAllowed, "Method not allowed", start)
		return
	}

	var req domain.AuthSignUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid request payload", start)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		WriteError(w, r, http.StatusBadRequest, "Full name, email, and password are required", start)
		return
	}

	// Generate IDs
	tenantID := "dms-" + randomHex(4)
	userID := "usr-" + randomHex(6)

	activeGstin := strings.ToUpper(strings.TrimSpace(req.ActiveGSTIN))
	if activeGstin == "" {
		activeGstin = "07AABCA" + randomHex(4) + "1Z2"
	}

	groupName := req.GroupName
	if groupName == "" {
		groupName = req.FullName + " Dealership Network"
	}

	brand := req.Brand
	if brand == "" {
		brand = "Multi-Brand Automotive"
	}

	dmsSoftware := req.DMSSoftware
	if dmsSoftware == "" {
		dmsSoftware = "CDK_GLOBAL"
	}

	dealership := domain.DealershipProfile{
		ID:                   tenantID,
		GroupName:            groupName,
		Brand:                brand,
		AuthorizedDealerFor:  req.AuthorizedDealerFor,
		Headquarters:         req.Headquarters,
		MonthlyInvoiceVolume: 500,
		DMSSoftware:          dmsSoftware,
		ActiveGSTIN:          activeGstin,
		Branches: []domain.DealershipBranch{
			{
				GSTIN: activeGstin,
				State: "Delhi (07)",
				City:  "Primary Facility Hub",
				Type:  "SHOWROOM_AND_WORKSHOP",
			},
		},
	}

	if err := h.store.CreateTenantTx(r.Context(), dealership); err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to create organization profile", start)
		return
	}

	user := domain.User{
		ID:           userID,
		TenantID:     tenantID,
		Email:        req.Email,
		FullName:     req.FullName,
		Role:         "FINANCE_DIRECTOR",
		AuthProvider: "LOCAL",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.store.CreateUserTx(r.Context(), user); err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to create user record", start)
		return
	}

	token, err := gateway.GenerateTestToken(tenantID, activeGstin, userID, user.Role, 24*time.Hour)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to sign token", start)
		return
	}

	resp := domain.AuthResponse{
		Success:     true,
		Token:       token,
		TokenType:   "Bearer",
		ExpiresIn:   86400,
		User:        user,
		Dealership:  &dealership,
		TenantID:    tenantID,
		ActiveGSTIN: activeGstin,
	}

	WriteJSON(w, r, http.StatusCreated, resp, "Organization & account successfully initialized", start)
}

// DemoLogin quickly authenticates into one of the preloaded demo dealership accounts
func (h *AuthHandler) DemoLogin(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := r.URL.Query().Get("tenantId")
	if tenantID == "" {
		tenantID = "dms-01"
	}

	email := "demo@autotax.io"
	if tenantID == "dms-02" {
		email = "tax@vertexmobility.in"
	}

	user, _ := h.store.GetUserByEmail(r.Context(), email)
	if user == nil {
		user = &domain.User{
			ID:           "usr-demo-01",
			TenantID:     tenantID,
			Email:        email,
			FullName:     "Executive Demo Operator",
			Role:         "FINANCE_DIRECTOR",
			AuthProvider: "LOCAL",
			IsActive:     true,
		}
	}

	dealership, _ := h.store.GetDealershipByID(r.Context(), tenantID)
	activeGstin := "07AABCA9876K1Z2"
	if dealership != nil && dealership.ActiveGSTIN != "" {
		activeGstin = dealership.ActiveGSTIN
	}

	token, _ := gateway.GenerateTestToken(tenantID, activeGstin, user.ID, user.Role, 24*time.Hour)

	resp := domain.AuthResponse{
		Success:     true,
		Token:       token,
		TokenType:   "Bearer",
		ExpiresIn:   86400,
		User:        *user,
		Dealership:  dealership,
		TenantID:    tenantID,
		ActiveGSTIN: activeGstin,
	}

	WriteJSON(w, r, http.StatusOK, resp, "Demo session established", start)
}

// Me returns the currently authenticated user profile and dealership context
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGstin := middleware.GetActiveGSTIN(r)
	role := middleware.GetUserRole(r)

	dealership, _ := h.store.GetDealershipByID(r.Context(), tenantID)
	if dealership == nil {
		dealers, _ := h.store.GetDealerships(r.Context())
		if len(dealers) > 0 {
			dealership = &dealers[0]
			tenantID = dealership.ID
		}
	}

	user := domain.User{
		ID:           "usr-" + tenantID,
		TenantID:     tenantID,
		Email:        "operator@" + tenantID + ".autotax.io",
		FullName:     "Authorized Compliance Officer",
		Role:         role,
		AuthProvider: "LOCAL",
		IsActive:     true,
	}

	resp := domain.AuthResponse{
		Success:     true,
		User:        user,
		Dealership:  dealership,
		TenantID:    tenantID,
		ActiveGSTIN: activeGstin,
	}

	WriteJSON(w, r, http.StatusOK, resp, "Current session profile", start)
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
