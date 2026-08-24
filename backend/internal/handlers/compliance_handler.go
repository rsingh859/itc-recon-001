package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// ComplianceHandler handles compliance alerts and autonomous pipeline steps
type ComplianceHandler struct {
	store store.DataStore
}

// NewComplianceHandler creates a compliance handler
func NewComplianceHandler(s store.DataStore) *ComplianceHandler {
	return &ComplianceHandler{store: s}
}

// ListAlerts returns active compliance exception alerts
func (h *ComplianceHandler) ListAlerts(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	alerts, err := h.store.GetComplianceAlerts(r.Context(), tenantID)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}
	WriteJSON(w, r, http.StatusOK, alerts, "Compliance alerts retrieved", start)
}

// ResolveAlert marks an alert as resolved in a transaction
func (h *ComplianceHandler) ResolveAlert(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	var payload struct {
		ID string `json:"id"`
	}

	if r.Method == http.MethodPost {
		_ = json.NewDecoder(r.Body).Decode(&payload)
	}

	if payload.ID == "" {
		payload.ID = strings.TrimPrefix(r.URL.Path, "/api/v1/compliance/alerts/")
		payload.ID = strings.TrimSuffix(payload.ID, "/resolve")
	}

	if payload.ID == "" {
		WriteError(w, r, http.StatusBadRequest, "Alert ID is required", start)
		return
	}

	audit := &domain.AuditLogEntry{
		ID:            fmt.Sprintf("AUD-ALT-%d", time.Now().UnixNano()%1000000),
		TenantID:      tenantID,
		UserID:        "compliance_officer",
		ActionType:    "ALERT_RESOLVED",
		EntityType:    "COMPLIANCE_ALERT",
		EntityID:      payload.ID,
		NewState:      map[string]string{"status": "RESOLVED"},
		CorrelationID: middleware.GetCorrelationID(r),
		IPAddress:     r.RemoteAddr,
		Timestamp:     time.Now(),
	}

	err := h.store.ResolveAlertTx(r.Context(), tenantID, payload.ID, audit)
	if err != nil {
		WriteError(w, r, http.StatusNotFound, err.Error(), start)
		return
	}

	WriteJSON(w, r, http.StatusOK, map[string]string{"id": payload.ID, "status": "RESOLVED"}, "Alert resolved", start)
}

// ListWorkflow returns automated pipeline telemetry
func (h *ComplianceHandler) ListWorkflow(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	steps, err := h.store.GetComplianceWorkflow(r.Context(), tenantID)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}
	WriteJSON(w, r, http.StatusOK, steps, "Compliance workflow steps", start)
}
