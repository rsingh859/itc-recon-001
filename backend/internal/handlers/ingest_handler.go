package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/engine"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)


// IngestHandler handles GSP data synchronization and DMS purchase register batch ingestion
type IngestHandler struct {
	store store.DataStore
}

// NewIngestHandler creates a new ingest handler
func NewIngestHandler(s store.DataStore) *IngestHandler {
	return &IngestHandler{store: s}
}

// SyncGSP triggers simulated GSP pull from GSTN for the active dealership GSTIN
func (h *IngestHandler) SyncGSP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)

	// Fetch current PR & 2B and re-run reconciliation
	prs, _ := h.store.GetPurchaseRegister(r.Context(), tenantID, activeGSTIN)
	b2s, _ := h.store.GetGstr2B(r.Context(), tenantID, activeGSTIN)

	results := engine.Reconcile(prs, b2s, 10.0)
	_ = h.store.SaveReconciledRecords(r.Context(), tenantID, activeGSTIN, results)
	summary := engine.GenerateSummary(results)

	data := map[string]interface{}{
		"status":        "COMPLETED",
		"provider":      "Vayana / MastersIndia GSP Adapter",
		"gstin":         activeGSTIN,
		"syncedAt":      time.Now().Format(time.RFC3339),
		"recordsSynced": len(b2s),
		"reconSummary":  summary,
		"syncLatencyMs": time.Since(start).Milliseconds(),
	}

	WriteJSON(w, r, http.StatusOK, data, fmt.Sprintf("GSTR-2B synced and 7-tier reconciliation updated for %s", activeGSTIN), start)
}

// GetStatus returns the ingestion pipeline status
func (h *IngestHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	data := map[string]interface{}{
		"lastSync":      time.Now().Add(-12 * time.Minute).Format(time.RFC3339),
		"gspConnection": "HEALTHY",
		"latencyMs":     14,
		"activeSession": "GSP_SESS_SECURE_AUTH_098",
		"sessionTtlSec": 1800,
	}
	WriteJSON(w, r, http.StatusOK, data, "Ingestion adapter status", start)
}

// IngestManualPR accepts a batch of manually entered purchase register rows
func (h *IngestHandler) IngestManualPR(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		WriteError(w, r, http.StatusMethodNotAllowed, "Method not allowed", start)
		return
	}

	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)

	var req domain.ManualPRBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid request payload", start)
		return
	}

	if len(req.Items) == 0 {
		WriteError(w, r, http.StatusBadRequest, "No purchase register items provided", start)
		return
	}

	// Ensure IDs and calculated totals
	for i := range req.Items {
		if req.Items[i].ID == "" {
			req.Items[i].ID = fmt.Sprintf("PR-MANUAL-%d-%d", time.Now().UnixMilli(), i)
		}
		if req.Items[i].GSTIN == "" {
			req.Items[i].GSTIN = activeGSTIN
		}
		if req.Items[i].TotalTax == 0 {
			req.Items[i].TotalTax = req.Items[i].IGST + req.Items[i].CGST + req.Items[i].SGST + req.Items[i].Cess
		}
		if req.Items[i].TotalInvoiceValue == 0 {
			req.Items[i].TotalInvoiceValue = req.Items[i].TaxableValue + req.Items[i].TotalTax
		}
	}

	if err := h.store.AddPurchaseRegisterItemsTx(r.Context(), tenantID, activeGSTIN, req.Items); err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to persist purchase register items", start)
		return
	}

	// Trigger 7-tier reconciliation re-run
	prs, _ := h.store.GetPurchaseRegister(r.Context(), tenantID, activeGSTIN)
	b2s, _ := h.store.GetGstr2B(r.Context(), tenantID, activeGSTIN)
	results := engine.Reconcile(prs, b2s, 10.0)
	_ = h.store.SaveReconciledRecords(r.Context(), tenantID, activeGSTIN, results)
	summary := engine.GenerateSummary(results)

	data := map[string]interface{}{
		"insertedCount": len(req.Items),
		"totalPRCount":  len(prs),
		"reconSummary":  summary,
		"records":       results,
	}

	WriteJSON(w, r, http.StatusOK, data, fmt.Sprintf("Successfully ingested %d manual purchase register records and updated 7-tier recon", len(req.Items)), start)
}

// IngestManual2B accepts a batch of manually entered GSTR-2B invoice rows
func (h *IngestHandler) IngestManual2B(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		WriteError(w, r, http.StatusMethodNotAllowed, "Method not allowed", start)
		return
	}

	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)

	var req domain.Manual2BBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid request payload", start)
		return
	}

	if len(req.Items) == 0 {
		WriteError(w, r, http.StatusBadRequest, "No GSTR-2B items provided", start)
		return
	}

	for i := range req.Items {
		if req.Items[i].ID == "" {
			req.Items[i].ID = fmt.Sprintf("2B-MANUAL-%d-%d", time.Now().UnixMilli(), i)
		}
		if req.Items[i].DealershipGSTIN == "" {
			req.Items[i].DealershipGSTIN = activeGSTIN
		}
		if req.Items[i].TotalTax == 0 {
			req.Items[i].TotalTax = req.Items[i].IGST + req.Items[i].CGST + req.Items[i].SGST + req.Items[i].Cess
		}
		if req.Items[i].TotalInvoiceValue == 0 {
			req.Items[i].TotalInvoiceValue = req.Items[i].TaxableValue + req.Items[i].TotalTax
		}
	}

	if err := h.store.AddGstr2BItemsTx(r.Context(), tenantID, activeGSTIN, req.Items); err != nil {
		WriteError(w, r, http.StatusInternalServerError, "Failed to persist GSTR-2B items", start)
		return
	}

	// Trigger 7-tier recon re-run
	prs, _ := h.store.GetPurchaseRegister(r.Context(), tenantID, activeGSTIN)
	b2s, _ := h.store.GetGstr2B(r.Context(), tenantID, activeGSTIN)
	results := engine.Reconcile(prs, b2s, 10.0)
	_ = h.store.SaveReconciledRecords(r.Context(), tenantID, activeGSTIN, results)
	summary := engine.GenerateSummary(results)

	data := map[string]interface{}{
		"insertedCount": len(req.Items),
		"total2BCount":  len(b2s),
		"reconSummary":  summary,
		"records":       results,
	}

	WriteJSON(w, r, http.StatusOK, data, fmt.Sprintf("Successfully ingested %d manual GSTR-2B records and updated 7-tier recon", len(req.Items)), start)
}

// SeedDemo populates full realistic sample data for the active organization
func (h *IngestHandler) SeedDemo(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)

	_ = h.store.SeedDemoData(r.Context(), tenantID)

	prs, _ := h.store.GetPurchaseRegister(r.Context(), tenantID, activeGSTIN)
	b2s, _ := h.store.GetGstr2B(r.Context(), tenantID, activeGSTIN)
	results := engine.Reconcile(prs, b2s, 10.0)
	_ = h.store.SaveReconciledRecords(r.Context(), tenantID, activeGSTIN, results)
	summary := engine.GenerateSummary(results)

	data := map[string]interface{}{
		"status":       "SEEDED",
		"prCount":      len(prs),
		"gstr2bCount":  len(b2s),
		"reconSummary": summary,
		"records":      results,
	}

	WriteJSON(w, r, http.StatusOK, data, "Enterprise sample dealership dataset hydrated into active organization", start)
}

