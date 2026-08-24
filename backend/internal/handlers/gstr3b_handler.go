package handlers

import (
	"net/http"
	"time"

	"github.com/autotax/backend/internal/engine"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// Gstr3bHandler provides statutory GSTR-3B Table 4 computations and JSON return export payloads
type Gstr3bHandler struct {
	store store.DataStore
}

// NewGstr3bHandler creates a new Gstr3b handler
func NewGstr3bHandler(s store.DataStore) *Gstr3bHandler {
	return &Gstr3bHandler{store: s}
}

// GetSummary returns GSTR-3B Table 4 computed numbers
func (h *Gstr3bHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "July 2026"
	}

	records, _ := h.store.GetReconciledRecords(r.Context(), tenantID, activeGSTIN)
	table4 := engine.ComputeGSTR3BTable4(records, period, activeGSTIN)

	WriteJSON(w, r, http.StatusOK, table4, "GSTR-3B Table 4 computed successfully", start)
}

// ExportJSON generates GST portal upload payload
func (h *Gstr3bHandler) ExportJSON(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	activeGSTIN := middleware.GetActiveGSTIN(r)
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "July 2026"
	}

	records, _ := h.store.GetReconciledRecords(r.Context(), tenantID, activeGSTIN)
	table4 := engine.ComputeGSTR3BTable4(records, period, activeGSTIN)

	exportPayload := map[string]interface{}{
		"gstin":   activeGSTIN,
		"fp":      "072026",
		"version": "GSTR3B_v1.0",
		"itc_elg": map[string]interface{}{
			"itc_avl": []map[string]interface{}{
				{"ty": "OTH", "iamt": 0, "camt": table4.Table4A5AllOtherITC / 2, "samt": table4.Table4A5AllOtherITC / 2, "csamt": 0},
			},
			"itc_rev": []map[string]interface{}{
				{"ty": "OTH", "iamt": 0, "camt": table4.Table4B2Rule37Reversal / 2, "samt": table4.Table4B2Rule37Reversal / 2, "csamt": 0},
			},
			"itc_net": map[string]interface{}{
				"iamt": 0, "camt": table4.Table4CNetITC / 2, "samt": table4.Table4CNetITC / 2, "csamt": 0,
			},
			"itc_inelg": []map[string]interface{}{
				{"ty": "RFL", "iamt": 0, "camt": table4.Table4D1BlockedSection / 2, "samt": table4.Table4D1BlockedSection / 2, "csamt": 0},
			},
		},
	}

	WriteJSON(w, r, http.StatusOK, exportPayload, "GSTR-3B Table 4 GSTN payload generated", start)
}
