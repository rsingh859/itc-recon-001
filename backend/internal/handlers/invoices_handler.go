package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/middleware"
	"github.com/autotax/backend/internal/store"
)

// InvoicesHandler handles outbound sales invoices, IRN generation, and gate passes
type InvoicesHandler struct {
	store store.DataStore
}

// NewInvoicesHandler creates a new invoices handler
func NewInvoicesHandler(s store.DataStore) *InvoicesHandler {
	return &InvoicesHandler{store: s}
}

// ListInvoices returns outbound invoices with optional filters
func (h *InvoicesHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	invoices, err := h.store.GetSalesInvoices(r.Context(), tenantID)
	if err != nil {
		WriteError(w, r, http.StatusInternalServerError, err.Error(), start)
		return
	}

	filterType := r.URL.Query().Get("filter")
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))

	var filtered []domain.SalesInvoiceItem
	for _, inv := range invoices {
		if filterType == "IRN_GENERATED" && inv.IRNStatus != "GENERATED" {
			continue
		}
		if filterType == "PENDING_IRN" && inv.IRNStatus != "PENDING" {
			continue
		}
		if filterType == "FAILED" && inv.IRNStatus != "FAILED" {
			continue
		}
		if filterType == "EWB" && inv.EWBStatus != "GENERATED" {
			continue
		}

		if query != "" {
			qMatch := strings.Contains(strings.ToLower(inv.InvoiceNumber), query) ||
				strings.Contains(strings.ToLower(inv.CustomerName), query) ||
				strings.Contains(strings.ToLower(inv.ChassisVIN), query) ||
				strings.Contains(strings.ToLower(inv.VehicleModel), query)
			if !qMatch {
				continue
			}
		}

		filtered = append(filtered, inv)
	}

	WriteJSON(w, r, http.StatusOK, filtered, "Sales invoices retrieved", start)
}

// GenerateIRN simulates instant GSP NIC API call to generate IRN hash and 2D QR Code within an ACID transaction
func (h *InvoicesHandler) GenerateIRN(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tenantID := middleware.GetTenantID(r)
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/invoices/")
	id = strings.TrimSuffix(id, "/irn")

	if id == "" {
		WriteError(w, r, http.StatusBadRequest, "Invoice ID is required", start)
		return
	}

	// Generate deterministic hash for IRN
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("%s-%d", id, time.Now().UnixNano())))
	irnHash := hex.EncodeToString(hasher.Sum(nil))

	ackNumber := fmt.Sprintf("112609%06d", time.Now().Unix()%1000000)
	ackDate := time.Now().Format("2006-01-02 15:04:05")
	qrPayload := fmt.Sprintf("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%%23fff'/><path d='M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z' fill='%%23000'/></svg>")

	audit := &domain.AuditLogEntry{
		ID:            fmt.Sprintf("AUD-IRN-%d", time.Now().UnixNano()%1000000),
		TenantID:      tenantID,
		UserID:        "system_irn_worker",
		ActionType:    "IRN_GENERATED",
		EntityType:    "SALES_INVOICE",
		EntityID:      id,
		NewState:      map[string]string{"irn": irnHash, "ackNo": ackNumber},
		CorrelationID: middleware.GetCorrelationID(r),
		IPAddress:     r.RemoteAddr,
		Timestamp:     time.Now(),
	}

	updated, err := h.store.UpdateSalesInvoiceIRNTx(r.Context(), tenantID, id, irnHash, ackNumber, ackDate, qrPayload, audit)
	if err != nil {
		WriteError(w, r, http.StatusNotFound, err.Error(), start)
		return
	}

	WriteJSON(w, r, http.StatusOK, updated, "IRN and digital QR generated successfully", start)
}
