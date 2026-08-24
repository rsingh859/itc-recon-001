package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/engine"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// ReconHandler exposes reconciliation compute endpoints
type ReconHandler struct {
	store store.DataStore
}

// NewReconHandler creates a new reconciliation handler
func NewReconHandler(s store.DataStore) *ReconHandler {
	return &ReconHandler{store: s}
}

// RunReconciliation triggers the 7-tier matching engine
func (h *ReconHandler) RunReconciliation(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)

	var req domain.ReconRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	prList := req.PurchaseRegister
	if len(prList) == 0 {
		prList, _ = h.store.GetPurchaseRegister(r.Context(), tenantID, activeGSTIN)
	}

	b2List := req.GSTR2BList
	if len(b2List) == 0 {
		b2List, _ = h.store.GetGstr2B(r.Context(), tenantID, activeGSTIN)
	}

	tolerance := req.Tolerance
	if tolerance <= 0 {
		tolerance = 10.0
	}

	// Execute reconciliation via high-performance Go engine
	var results []domain.ReconciledRecord
	if len(prList) > 500 {
		results = engine.BatchReconcileParallel(prList, b2List, tolerance)
	} else {
		results = engine.Reconcile(prList, b2List, tolerance)
	}

	// Persist to store
	_ = h.store.SaveReconciledRecords(r.Context(), tenantID, activeGSTIN, results)
	summary := engine.GenerateSummary(results)

	data := map[string]interface{}{
		"records":     results,
		"summary":     summary,
		"totalCount":  len(results),
		"period":      req.Period,
		"gstin":       activeGSTIN,
	}

	WriteJSON(w, r, http.StatusOK, data, "Reconciliation executed successfully", start)
}

// GetRecords returns current reconciled records with optional filtering
func (h *ReconHandler) GetRecords(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)
	records, err := h.store.GetReconciledRecords(r.Context(), tenantID, activeGSTIN)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}

	statusFilter := r.URL.Query().Get("status")
	categoryFilter := r.URL.Query().Get("category")
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))

	var filtered []domain.ReconciledRecord
	for _, rec := range records {
		if statusFilter != "" && statusFilter != "ALL" && string(rec.MatchStatus) != statusFilter {
			continue
		}

		if categoryFilter != "" && categoryFilter != "ALL" {
			if rec.PRItem == nil || string(rec.PRItem.Category) != categoryFilter {
				continue
			}
		}

		if query != "" {
			matched := false
			if rec.PRItem != nil {
				if strings.Contains(strings.ToLower(rec.PRItem.InvoiceNo), query) ||
					strings.Contains(strings.ToLower(rec.PRItem.VendorName), query) ||
					strings.Contains(strings.ToLower(rec.PRItem.VendorGSTIN), query) {
					matched = true
				}
			}
			if rec.GSTR2BItem != nil {
				if strings.Contains(strings.ToLower(rec.GSTR2BItem.InvoiceNo), query) ||
					strings.Contains(strings.ToLower(rec.GSTR2BItem.SupplierName), query) ||
					strings.Contains(strings.ToLower(rec.GSTR2BItem.SupplierGSTIN), query) {
					matched = true
				}
			}
			if !matched {
				continue
			}
		}

		filtered = append(filtered, rec)
	}

	WriteJSON(w, r, http.StatusOK, filtered, "Reconciled records retrieved", start)
}

// GetSummary returns dashboard summary metrics
func (h *ReconHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)
	records, _ := h.store.GetReconciledRecords(r.Context(), tenantID, activeGSTIN)
	summary := engine.GenerateSummary(records)

	WriteJSON(w, r, http.StatusOK, summary, "Reconciliation summary metrics", start)
}

// OverrideRecord updates manual approval or payment hold on a record within an ACID transaction
func (h *ReconHandler) OverrideRecord(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)

	var payload struct {
		RecordID           string `json:"recordId"`
		ActionRecommended  string `json:"actionRecommended"`
		VendorActionStatus string `json:"vendorActionStatus"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid JSON request payload", start)
		return
	}

	if payload.RecordID == "" {
		WriteError(w, r, http.StatusBadRequest, "Record ID is required", start)
		return
	}

	audit := &domain.AuditLogEntry{
		ID:            fmt.Sprintf("AUD-%d", time.Now().UnixNano()%1000000),
		TenantID:      tenantID,
		UserID:        "finance_controller",
		ActionType:    "MATCH_OVERRIDE",
		EntityType:    "RECON_RECORD",
		EntityID:      payload.RecordID,
		NewState:      payload,
		CorrelationID: middleware.GetCorrelationID(r),
		IPAddress:     r.RemoteAddr,
		Timestamp:     time.Now(),
	}

	err := h.store.UpdateRecordActionTx(r.Context(), tenantID, payload.RecordID, payload.ActionRecommended, payload.VendorActionStatus, audit)
	if err != nil {
		WriteError(w, r, http.StatusNotFound, err.Error(), start)
		return
	}

	WriteJSON(w, r, http.StatusOK, map[string]string{"recordId": payload.RecordID, "status": "UPDATED"}, "Record action updated successfully", start)
}
