package domain

import "time"

// MatchStatus represents the 7-tier classification of reconciliation
type MatchStatus string

const (
	MatchExact         MatchStatus = "EXACT_MATCH"
	MatchFuzzy         MatchStatus = "FUZZY_MATCH"
	MatchValueMismatch MatchStatus = "VALUE_MISMATCH"
	MatchDateMismatch  MatchStatus = "DATE_MISMATCH"
	MatchMissingIn2B   MatchStatus = "MISSING_IN_2B"
	MatchMissingInPR   MatchStatus = "MISSING_IN_PR"
	MatchRule37Risk    MatchStatus = "RULE_37_RISK"
	MatchBlocked175    MatchStatus = "BLOCKED_17_5"
	MatchOEMPending    MatchStatus = "OEM_CREDIT_PENDING"
)

// DealershipCategory represents standard automotive accounting ledger categories
type DealershipCategory string

const (
	CatOEMVehicle         DealershipCategory = "OEM_VEHICLE"
	CatSpareParts         DealershipCategory = "SPARE_PARTS"
	CatLubricants         DealershipCategory = "LUBRICANTS"
	CatAccessories        DealershipCategory = "ACCESSORIES"
	CatBodyshopPaint      DealershipCategory = "BODYSHOP_PAINT"
	CatWorkshopTools      DealershipCategory = "WORKSHOP_TOOLS"
	CatTransporterRCM     DealershipCategory = "TRANSPORTER_RCM"
	CatInsuranceComm      DealershipCategory = "INSURANCE_COMMISSION"
	CatMarketingPromotion DealershipCategory = "MARKETING_PROMOTION"
	CatOEMSchemeIncentive DealershipCategory = "OEM_SCHEME_INCENTIVE"
	CatStaffWelfare       DealershipCategory = "STAFF_WELFARE"
	CatDemoVehicle        DealershipCategory = "DEMO_VEHICLE"
)

// PurchaseRegisterItem represents an ERP/DMS inward supply entry
type PurchaseRegisterItem struct {
	ID                  string             `json:"id"`
	InternalVoucherNo   string             `json:"internalVoucherNo"`
	InvoiceNo           string             `json:"invoiceNo"`
	InvoiceDate         string             `json:"invoiceDate"`
	VendorGSTIN         string             `json:"vendorGstin"`
	VendorName          string             `json:"vendorName"`
	Category            DealershipCategory `json:"category"`
	TaxableValue        float64            `json:"taxableValue"`
	IGST                float64            `json:"igst"`
	CGST                float64            `json:"cgst"`
	SGST                float64            `json:"sgst"`
	Cess                float64            `json:"cess"`
	TotalTax            float64            `json:"totalTax"`
	TotalInvoiceValue   float64            `json:"totalInvoiceValue"`
	PaymentStatus       string             `json:"paymentStatus"` // PAID, PARTIALLY_PAID, UNPAID
	PaymentDueDate      string             `json:"paymentDueDate,omitempty"`
	DaysOutstanding     int                `json:"daysOutstanding"`
	IsEligibleITC       bool               `json:"isEligibleITC"`
	IneligibilityReason string             `json:"ineligibilityReason,omitempty"`
	BranchName          string             `json:"branchName"`
	GSTIN               string             `json:"gstin"` // Dealership branch GSTIN
	OEMSchemeRef        string             `json:"oemSchemeRef,omitempty"`
}

// Gstr2BItem represents a supplier invoice line reported on the GST Portal
type Gstr2BItem struct {
	ID                string  `json:"id"`
	InvoiceNo         string  `json:"invoiceNo"`
	InvoiceType       string  `json:"invoiceType"` // B2B, CDNR, B2BA, ISD, IMPG, RCM
	InvoiceDate       string  `json:"invoiceDate"`
	SupplierGSTIN     string  `json:"supplierGstin"`
	SupplierName      string  `json:"supplierName"`
	TaxableValue      float64 `json:"taxableValue"`
	IGST              float64 `json:"igst"`
	CGST              float64 `json:"cgst"`
	SGST              float64 `json:"sgst"`
	Cess              float64 `json:"cess"`
	TotalTax          float64 `json:"totalTax"`
	TotalInvoiceValue float64 `json:"totalInvoiceValue"`
	ITCAvailability   string  `json:"itcAvailability"` // Y, N
	ITCReason         string  `json:"itcReason,omitempty"`
	FilingPeriod      string  `json:"filingPeriod"` // e.g. "July 2026"
	GSTR1FilingDate   string  `json:"gstr1FilingDate"`
	IRNStatus         string  `json:"irnStatus,omitempty"` // GENERATED, NOT_APPLICABLE, CANCELLED
	DealershipGSTIN   string  `json:"dealershipGstin"`
}

// ReconciledRecord represents the computed match verdict between PR and 2B
type ReconciledRecord struct {
	ID                 string                `json:"id"`
	MatchStatus        MatchStatus           `json:"matchStatus"`
	MatchScore         int                   `json:"matchScore"` // 0 to 100
	PRItem             *PurchaseRegisterItem `json:"prItem,omitempty"`
	GSTR2BItem         *Gstr2BItem           `json:"gstr2bItem,omitempty"`
	TaxDifference      float64               `json:"taxDifference"`
	TaxableDifference  float64               `json:"taxableDifference"`
	Notes              []string              `json:"notes"`
	ActionRecommended  string                `json:"actionRecommended"` // APPROVE_FOR_3B, HOLD_PAYMENT, SEND_VENDOR_NOTICE, REVERSE_RULE_37, CLAIM_IN_NEXT_MONTH, MANUAL_OVERRIDE
	VendorActionStatus string                `json:"vendorActionStatus,omitempty"` // NOT_NOTIFIED, WHATSAPP_SENT, EMAIL_SENT, PAYMENT_BLOCKED
	IsOEMItem          bool                  `json:"isOemItem"`
}

// DealershipBranch represents a physical dealership branch with distinct GSTIN
type DealershipBranch struct {
	GSTIN string `json:"gstin"`
	State string `json:"state"`
	City  string `json:"city"`
	Type  string `json:"type"` // SHOWROOM_AND_WORKSHOP, NEXA_SHOWROOM, ARENA_SHOWROOM, TRUE_VALUE, BODYSHOP_HUB
}

// DealershipProfile represents the enterprise organization
type DealershipProfile struct {
	ID                   string             `json:"id"`
	GroupName            string             `json:"groupName"`
	Brand                string             `json:"brand"`
	AuthorizedDealerFor  string             `json:"authorizedDealerFor"`
	Headquarters         string             `json:"headquarters"`
	Branches             []DealershipBranch `json:"branches"`
	ActiveGSTIN          string             `json:"activeGstin"`
	MonthlyInvoiceVolume int                `json:"monthlyInvoiceVolume"`
	DMSSoftware          string             `json:"dmsSoftware"` // CDK_GLOBAL, SAP_DMS, AUTOLINE, TALLY_PRIME, MARUTI_EDMS, TATA_MOTHER
}

// SalesInvoiceItem represents an outbound vehicle or spare parts invoice
type SalesInvoiceItem struct {
	ID                  string  `json:"id"`
	InvoiceNumber       string  `json:"invoiceNumber"`
	InvoiceDate         string  `json:"invoiceDate"`
	CustomerName        string  `json:"customerName"`
	CustomerGSTIN       string  `json:"customerGstin"`
	CustomerStateCode   string  `json:"customerStateCode"`
	InvoiceType         string  `json:"invoiceType"` // B2B_VEHICLE, B2B_PARTS, B2B_SERVICE, B2C_RETAIL
	ChassisVIN          string  `json:"chassisVin,omitempty"`
	VehicleModel        string  `json:"vehicleModel,omitempty"`
	TaxableValue        float64 `json:"taxableValue"`
	IGST                float64 `json:"igst"`
	CGST                float64 `json:"cgst"`
	SGST                float64 `json:"sgst"`
	Cess                float64 `json:"cess"`
	TotalAmount         float64 `json:"totalAmount"`
	IRNStatus           string  `json:"irnStatus"` // GENERATED, PENDING, FAILED, NOT_APPLICABLE
	IRNNumber           string  `json:"irnNumber,omitempty"`
	AckNumber           string  `json:"ackNumber,omitempty"`
	AckDate             string  `json:"ackDate,omitempty"`
	SignedQRPayload     string  `json:"signedQrPayload,omitempty"`
	EWBStatus           string  `json:"ewbStatus"` // GENERATED, NOT_REQUIRED, PENDING, EXPIRED
	EWBNumber           string  `json:"ewbNumber,omitempty"`
	EWBValidUntil       string  `json:"ewbValidUntil,omitempty"`
	VehicleRegistration string  `json:"vehicleRegistration,omitempty"`
	ERPSyncStatus       string  `json:"erpSyncStatus"` // SYNCED, PENDING_PUSH
	FailureReason       string  `json:"failureReason,omitempty"`
}

// OEMScheme represents an OEM target incentive program or commercial scheme
type OEMScheme struct {
	ID              string  `json:"id"`
	SchemeName      string  `json:"schemeName"`
	CircularNo      string  `json:"circularNo"`
	Quarter         string  `json:"quarter"`
	ClaimedAmount   float64 `json:"claimedAmount"`
	OEMPassedAmount float64 `json:"oemPassedAmount"`
	GSTCreditLoss   float64 `json:"gstCreditLoss"`
	Status          string  `json:"status"` // RECONCILED, SHORT_PASSED, PENDING_OEM_CREDIT
}

// ComplianceWorkflowStep represents a step in the automated compliance pipeline
type ComplianceWorkflowStep struct {
	ID           string `json:"id"`
	StepName     string `json:"stepName"`
	Status       string `json:"status"` // COMPLETED, IN_PROGRESS, FAILED, PENDING
	Automated    bool   `json:"automated"`
	Timestamp    string `json:"timestamp"`
	Details      string `json:"details"`
	SourceModule string `json:"sourceModule"` // DMS_INGEST, VALIDATOR, IRN_SERVICE, EWB_SERVICE, ERP_SYNC, COMM_TRIGGER
}

// ComplianceExceptionAlert represents a flagged risk or tax clawback notice
type ComplianceExceptionAlert struct {
	ID                      string  `json:"id"`
	Severity                string  `json:"severity"` // CRITICAL, HIGH, MEDIUM, LOW
	Category                string  `json:"category"` // GSTIN_MISMATCH, IRN_FAILURE, EWB_EXPIRED, BLOCKED_ITC_17_5, RULE_37_180D, OEM_CLAIM_SHORT
	Title                   string  `json:"title"`
	Description             string  `json:"description"`
	ImpactAmount            float64 `json:"impactAmount"`
	AffectedEntity          string  `json:"affectedEntity"`
	SuggestedAction         string  `json:"suggestedAction"`
	AutoResolutionAvailable bool    `json:"autoResolutionAvailable"`
	Status                  string  `json:"status"` // OPEN, RESOLVED, MUTED
}

// APIResponse is the unified response envelope for all endpoints
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *APIMeta    `json:"meta,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// APIMeta contains execution telemetry
type APIMeta struct {
	CorrelationID   string `json:"correlationId,omitempty"`
	ExecutionTimeUs int64  `json:"executionTimeUs"`
	ExecutionTimeMs string `json:"executionTimeMs"`
	TotalCount      int    `json:"totalCount,omitempty"`
	Version         string `json:"version"`
}

// ReconRequest represents payload sent to trigger reconciliation
type ReconRequest struct {
	PurchaseRegister []PurchaseRegisterItem `json:"purchaseRegister,omitempty"`
	GSTR2BList       []Gstr2BItem           `json:"gstr2bList,omitempty"`
	Tolerance        float64                `json:"tolerance,omitempty"` // Default 10.0 INR
	DealershipID     string                 `json:"dealershipId,omitempty"`
	GSTIN            string                 `json:"gstin,omitempty"`
	Period           string                 `json:"period,omitempty"`
}

// ReconSummary provides aggregate figures for the dashboard
type ReconSummary struct {
	TotalPRTax        float64 `json:"totalPrTax"`
	Total2BTax        float64 `json:"total2bTax"`
	MatchedTax        float64 `json:"matchedTax"`
	AtRiskTax         float64 `json:"atRiskTax"`
	Rule37Tax         float64 `json:"rule37Tax"`
	Blocked175Tax     float64 `json:"blocked175Tax"`
	ExactMatchCount   int     `json:"exactMatchCount"`
	FuzzyMatchCount   int     `json:"fuzzyMatchCount"`
	MismatchCount     int     `json:"mismatchCount"`
	Missing2BCount    int     `json:"missing2bCount"`
	MissingPRCount    int     `json:"missingPrCount"`
	Rule37Count       int     `json:"rule37Count"`
	Blocked175Count   int     `json:"blocked175Count"`
	OEMCreditPending  int     `json:"oemCreditPendingCount"`
	TotalRecordsCount int     `json:"totalRecordsCount"`
}

// GSTR3BTable4Summary contains statutory return values
type GSTR3BTable4Summary struct {
	Period                  string  `json:"period"`
	DealershipGSTIN         string  `json:"dealershipGstin"`
	Table4A1ImportGoods     float64 `json:"table4A1ImportGoods"`
	Table4A5AllOtherITC     float64 `json:"table4A5AllOtherITC"`
	Table4B1PermanentRev    float64 `json:"table4B1PermanentRev"`
	Table4B2Rule37Reversal  float64 `json:"table4B2Rule37Reversal"`
	Table4CNetITC           float64 `json:"table4CNetITC"`
	Table4D1BlockedSection  float64 `json:"table4D1BlockedSection"`
	EligibleRecordCount     int     `json:"eligibleRecordCount"`
	Rule37RecordCount       int     `json:"rule37RecordCount"`
	Blocked175RecordCount   int     `json:"blocked175RecordCount"`
}

// NoticeLog tracks dispatched vendor communications
type NoticeLog struct {
	ID           string    `json:"id"`
	RecordID     string    `json:"recordId"`
	VendorGSTIN  string    `json:"vendorGstin"`
	VendorName   string    `json:"vendorName"`
	Channel      string    `json:"channel"` // WHATSAPP, EMAIL
	DispatchedAt time.Time `json:"dispatchedAt"`
	Status       string    `json:"status"`
	InvoiceNo    string    `json:"invoiceNo"`
	TaxAmount    float64   `json:"taxAmount"`
}

// AuditLogEntry represents an immutable record for tax audit defense (Section 16(2)(aa) proofs)
type AuditLogEntry struct {
	ID            string      `json:"id"`
	TenantID      string      `json:"tenantId"`
	UserID        string      `json:"userId"`
	ActionType    string      `json:"actionType"` // MATCH_OVERRIDE, PAYMENT_HOLD, NOTICE_DISPATCHED, 3B_TABLE4_CLAIMED
	EntityType    string      `json:"entityType"` // RECON_RECORD, SALES_INVOICE, NOTICE, COMPLIANCE_ALERT
	EntityID      string      `json:"entityId"`
	PreviousState interface{} `json:"previousState,omitempty"`
	NewState      interface{} `json:"newState,omitempty"`
	CorrelationID string      `json:"correlationId,omitempty"`
	IPAddress     string      `json:"ipAddress,omitempty"`
	Timestamp     time.Time   `json:"timestamp"`
}

// User represents an authenticated operator in the system
type User struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"fullName"`
	Role         string    `json:"role"` // FINANCE_DIRECTOR, TAX_ACCOUNTANT, AUDITOR, STORE_MANAGER
	AuthProvider string    `json:"authProvider"` // LOCAL, GOOGLE, MICROSOFT
	OAuthSub     string    `json:"oauthSub,omitempty"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// UserSession tracks active refresh tokens and sessions
type UserSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	TenantID  string    `json:"tenantId"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expiresAt"`
	IPAddress string    `json:"ipAddress,omitempty"`
	UserAgent string    `json:"userAgent,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// AuthLoginRequest represents credentials for local authentication
type AuthLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthSignUpRequest represents new registration and organization creation
type AuthSignUpRequest struct {
	FullName             string `json:"fullName"`
	Email                string `json:"email"`
	Password             string `json:"password"`
	GroupName            string `json:"groupName"`
	Brand                string `json:"brand"`
	AuthorizedDealerFor  string `json:"authorizedDealerFor"`
	Headquarters         string `json:"headquarters"`
	ActiveGSTIN          string `json:"activeGstin"`
	DMSSoftware          string `json:"dmsSoftware"`
}

// AuthResponse represents the payload returned upon successful auth
type AuthResponse struct {
	Success     bool               `json:"success"`
	Token       string             `json:"token"`
	TokenType   string             `json:"tokenType"`
	ExpiresIn   int64              `json:"expiresIn"`
	User        User               `json:"user"`
	Dealership  *DealershipProfile `json:"dealership,omitempty"`
	TenantID    string             `json:"tenantId"`
	ActiveGSTIN string             `json:"activeGstin"`
}

// ExtractedInvoiceData represents OCR structured fields
type ExtractedInvoiceData struct {
	InvoiceNo       string  `json:"invoiceNo"`
	InvoiceDate     string  `json:"invoiceDate"`
	SupplierGSTIN   string  `json:"supplierGstin"`
	SupplierName    string  `json:"supplierName"`
	BuyerGSTIN      string  `json:"buyerGstin"`
	Category        string  `json:"category"`
	TaxableValue    float64 `json:"taxableValue"`
	IGST            float64 `json:"igst"`
	CGST            float64 `json:"cgst"`
	SGST            float64 `json:"sgst"`
	Cess            float64 `json:"cess"`
	TotalTax        float64 `json:"totalTax"`
	TotalAmount     float64 `json:"totalAmount"`
	ConfidenceScore int     `json:"confidenceScore"` // 0 - 100
	RawTextSnippet  string  `json:"rawTextSnippet,omitempty"`
}

// DocumentUpload represents an uploaded invoice/receipt document metadata
type DocumentUpload struct {
	ID             string                `json:"id"`
	TenantID       string                `json:"tenantId"`
	BranchGSTIN    string                `json:"branchGstin"`
	FileName       string                `json:"fileName"`
	FileType       string                `json:"fileType"`
	FileSizeBytes  int64                 `json:"fileSizeBytes"`
	StoragePath    string                `json:"storagePath"`
	SHA256Hash     string                `json:"sha256Hash"`
	OCRStatus      string                `json:"ocrStatus"` // PENDING, PROCESSING, COMPLETED, FAILED
	ExtractedData  *ExtractedInvoiceData `json:"extractedData,omitempty"`
	UploadedBy     string                `json:"uploadedBy,omitempty"`
	CreatedAt      time.Time             `json:"createdAt"`
}

// ManualPRBatchRequest represents a payload for manual purchase register entry
type ManualPRBatchRequest struct {
	Items []PurchaseRegisterItem `json:"items"`
}

// Manual2BBatchRequest represents a payload for manual GSTR-2B entry
type Manual2BBatchRequest struct {
	Items []Gstr2BItem `json:"items"`
}


