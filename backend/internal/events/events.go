package events

import (
	"time"
)

// Event is the base interface for all domain events in the system
type Event interface {
	Type() string
	Tenant() string
	Timestamp() time.Time
}

// BaseEvent provides standard event metadata
type BaseEvent struct {
	EventType string    `json:"type"`
	TenantID  string    `json:"tenantId"`
	CreatedAt time.Time `json:"createdAt"`
}

func (e BaseEvent) Type() string          { return e.EventType }
func (e BaseEvent) Tenant() string        { return e.TenantID }
func (e BaseEvent) Timestamp() time.Time { return e.CreatedAt }

// Event Type Constants
const (
	TypeGstr2bIngestionCompleted = "gstr2b.ingestion.completed"
	TypeReconBatchCompleted      = "recon.batch.completed"
	TypePaymentHoldTriggered     = "payment.hold.triggered"
	TypeNoticeDispatched         = "notice.dispatched"
)

// Gstr2bIngestionCompletedEvent is emitted when GSP 2B pull completes
type Gstr2bIngestionCompletedEvent struct {
	BaseEvent
	BranchGSTIN   string `json:"branchGstin"`
	FilingPeriod  string `json:"filingPeriod"`
	RecordsSynced int    `json:"recordsSynced"`
}

// ReconBatchCompletedEvent is emitted when 7-tier reconciliation finishes
type ReconBatchCompletedEvent struct {
	BaseEvent
	BranchGSTIN       string  `json:"branchGstin"`
	FilingPeriod      string  `json:"filingPeriod"`
	TotalRecordsCount int     `json:"totalRecordsCount"`
	MatchedTax        float64 `json:"matchedTax"`
	AtRiskTax         float64 `json:"atRiskTax"`
	Missing2BCount    int     `json:"missing2bCount"`
	Rule37Count       int     `json:"rule37Count"`
}

// PaymentHoldTriggeredEvent is emitted when an ERP payment block is placed on non-compliant vendor
type PaymentHoldTriggeredEvent struct {
	BaseEvent
	RecordID    string  `json:"recordId"`
	VendorGSTIN string  `json:"vendorGstin"`
	VendorName  string  `json:"vendorName"`
	InvoiceNo   string  `json:"invoiceNo"`
	AmountAtRisk float64 `json:"amountAtRisk"`
	Reason      string  `json:"reason"`
}

// StatutoryNoticeDispatchedEvent is emitted when WhatsApp/Email notice is sent
type StatutoryNoticeDispatchedEvent struct {
	BaseEvent
	NoticeID    string `json:"noticeId"`
	RecordID    string `json:"recordId"`
	VendorGSTIN string `json:"vendorGstin"`
	Channel     string `json:"channel"`
}
