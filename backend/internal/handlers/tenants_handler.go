package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// TenantsHandler handles dealership organizational profiles and branch metadata
type TenantsHandler struct {
	store store.DataStore
}

// NewTenantsHandler creates a new tenant handler
func NewTenantsHandler(s store.DataStore) *TenantsHandler {
	return &TenantsHandler{store: s}
}

// ListDealerships returns all registered dealership groups
func (h *TenantsHandler) ListDealerships(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	dealerships, err := h.store.GetDealerships(r.Context())
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}
	WriteJSON(w, r, http.StatusOK, dealerships, "Dealership profiles retrieved", start)
}

// GetDealership returns a single dealership profile
func (h *TenantsHandler) GetDealership(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/tenants/dealerships/")
	if id == "" {
		id = middleware.GetTenantID(r)
	}

	dealer, err := h.store.GetDealershipByID(r.Context(), id)
	if err != nil {
		WriteError(w, r, http.StatusNotFound, err.Error(), start)
		return
	}

	WriteJSON(w, r, http.StatusOK, dealer, "Dealership profile retrieved", start)
}

// GetCurrentTenant returns the active tenant profile based on headers
func (h *TenantsHandler) GetCurrentTenant(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	dealer, err := h.store.GetDealershipByID(r.Context(), tenantID)
	if err != nil {
		// Fallback to first
		dealers, _ := h.store.GetDealerships(r.Context())
		if len(dealers) > 0 {
			dealer = &dealers[0]
		}
	}

	WriteJSON(w, r, http.StatusOK, dealer, "Current tenant context", start)
}
