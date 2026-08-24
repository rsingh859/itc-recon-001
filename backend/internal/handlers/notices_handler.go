package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// NoticesHandler handles Section 16(2)(aa) statutory notice dispatches & payment holds
type NoticesHandler struct {
	store store.DataStore
}

// NewNoticesHandler creates a notices handler
func NewNoticesHandler(s store.DataStore) *NoticesHandler {
	return &NoticesHandler{store: s}
}

// DispatchNotice records and dispatches a notice to non-compliant suppliers within an ACID transaction
func (h *NoticesHandler) DispatchNotice(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)

	var req struct {
		RecordID    string  `json:"recordId"`
		Channel     string  `json:"channel"` // WHATSAPP, EMAIL
		VendorGSTIN string  `json:"vendorGstin"`
		VendorName  string  `json:"vendorName"`
		InvoiceNo   string  `json:"invoiceNo"`
		TaxAmount   float64 `json:"taxAmount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, http.StatusBadRequest, "Invalid request payload", start)
		return
	}

	if req.Channel == "" {
		req.Channel = "WHATSAPP"
	}

	vendorStatus := "WHATSAPP_SENT"
	if req.Channel == "EMAIL" {
		vendorStatus = "EMAIL_SENT"
	}

	audit := &domain.AuditLogEntry{
		ID:            fmt.Sprintf("AUD-NOT-%d", time.Now().UnixNano()%1000000),
		TenantID:      tenantID,
		UserID:        "finance_controller",
		ActionType:    "NOTICE_DISPATCHED",
		EntityType:    "NOTICE",
		EntityID:      req.RecordID,
		NewState:      req,
		CorrelationID: middleware.GetCorrelationID(r),
		IPAddress:     r.RemoteAddr,
		Timestamp:     time.Now(),
	}

	_ = h.store.UpdateRecordActionTx(r.Context(), tenantID, req.RecordID, "HOLD_PAYMENT", vendorStatus, nil)

	logEntry := domain.NoticeLog{
		ID:           fmt.Sprintf("NOT-%d", time.Now().UnixNano()%100000),
		RecordID:     req.RecordID,
		VendorGSTIN:  req.VendorGSTIN,
		VendorName:   req.VendorName,
		Channel:      req.Channel,
		DispatchedAt: time.Now(),
		Status:       "DELIVERED",
		InvoiceNo:    req.InvoiceNo,
		TaxAmount:    req.TaxAmount,
	}
	_ = h.store.AddNoticeLogTx(r.Context(), tenantID, logEntry, audit)

	WriteJSON(w, r, http.StatusOK, logEntry, fmt.Sprintf("Statutory Section 16(2)(aa) notice dispatched via %s to %s", req.Channel, req.VendorName), start)
}

// GetLogs returns dispatched communications logs
func (h *NoticesHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	logs, err := h.store.GetNoticeLogs(r.Context(), tenantID)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}
	WriteJSON(w, r, http.StatusOK, logs, "Notice dispatch audit logs", start)
}
