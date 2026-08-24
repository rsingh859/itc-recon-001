package store

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/engine"
)

// MemoryStore implements the DataStore interface in-memory with thread-safe operations
type MemoryStore struct {
	mu                 sync.RWMutex
	dealerships        []domain.DealershipProfile
	users              map[string]domain.User       // Key: email & ID
	sessions           map[string]domain.UserSession // Key: sessionID
	documents          map[string][]domain.DocumentUpload // Key: tenantID
	purchaseRegister   map[string][]domain.PurchaseRegisterItem // Key: gstin
	gstr2bList         map[string][]domain.Gstr2BItem           // Key: gstin
	salesInvoices      []domain.SalesInvoiceItem
	complianceAlerts   []domain.ComplianceExceptionAlert
	complianceWorkflow []domain.ComplianceWorkflowStep
	oemSchemes         []domain.OEMScheme
	reconciledRecords  map[string][]domain.ReconciledRecord
	noticeLogs         []domain.NoticeLog
	auditLogs          []domain.AuditLogEntry
	startTime          time.Time
}

// NewMemoryStore initializes the memory store with realistic automotive dealership seed data
func NewMemoryStore() *MemoryStore {
	s := &MemoryStore{
		users:             make(map[string]domain.User),
		sessions:          make(map[string]domain.UserSession),
		documents:         make(map[string][]domain.DocumentUpload),
		purchaseRegister:  make(map[string][]domain.PurchaseRegisterItem),
		gstr2bList:        make(map[string][]domain.Gstr2BItem),
		reconciledRecords: make(map[string][]domain.ReconciledRecord),
		noticeLogs:        make([]domain.NoticeLog, 0),
		auditLogs:         make([]domain.AuditLogEntry, 0),
		startTime:         time.Now(),
	}

	s.seedData()
	return s
}

// GetStartTime returns the instance boot time
func (s *MemoryStore) GetStartTime() time.Time {
	return s.startTime
}

// Close satisfies DataStore lifecycle
func (s *MemoryStore) Close() error {
	return nil
}

// CreateTenantTx adds a new organization
func (s *MemoryStore) CreateTenantTx(_ context.Context, tenant domain.DealershipProfile) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, d := range s.dealerships {
		if d.ID == tenant.ID {
			s.dealerships[i] = tenant
			return nil
		}
	}
	s.dealerships = append(s.dealerships, tenant)
	return nil
}

// CreateUserTx creates a new user
func (s *MemoryStore) CreateUserTx(_ context.Context, user domain.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[user.Email] = user
	s.users[user.ID] = user
	return nil
}

// GetUserByEmail returns a user by email
func (s *MemoryStore) GetUserByEmail(_ context.Context, email string) (*domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if user, ok := s.users[email]; ok {
		copyU := user
		return &copyU, nil
	}
	return nil, fmt.Errorf("user not found with email: %s", email)
}

// GetUserByID returns a user by ID
func (s *MemoryStore) GetUserByID(_ context.Context, id string) (*domain.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if user, ok := s.users[id]; ok {
		copyU := user
		return &copyU, nil
	}
	return nil, fmt.Errorf("user not found with ID: %s", id)
}

// CreateSessionTx records a user session
func (s *MemoryStore) CreateSessionTx(_ context.Context, session domain.UserSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = session
	return nil
}

// GetSessionByID retrieves a session
func (s *MemoryStore) GetSessionByID(_ context.Context, sessionID string) (*domain.UserSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if sess, ok := s.sessions[sessionID]; ok {
		copyS := sess
		return &copyS, nil
	}
	return nil, fmt.Errorf("session not found: %s", sessionID)
}

// AddPurchaseRegisterItemsTx appends manual or extracted PR items
func (s *MemoryStore) AddPurchaseRegisterItemsTx(_ context.Context, _, gstin string, items []domain.PurchaseRegisterItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.purchaseRegister[gstin] = append(s.purchaseRegister[gstin], items...)
	s.purchaseRegister["default"] = append(s.purchaseRegister["default"], items...)
	return nil
}

// AddGstr2BItemsTx appends manual or synced 2B items
func (s *MemoryStore) AddGstr2BItemsTx(_ context.Context, _, gstin string, items []domain.Gstr2BItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gstr2bList[gstin] = append(s.gstr2bList[gstin], items...)
	s.gstr2bList["default"] = append(s.gstr2bList["default"], items...)
	return nil
}

// SaveDocumentUploadTx records a document upload
func (s *MemoryStore) SaveDocumentUploadTx(_ context.Context, doc domain.DocumentUpload) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.documents[doc.TenantID] = append(s.documents[doc.TenantID], doc)
	return nil
}

// GetDocumentUploads returns all uploaded documents for a tenant
func (s *MemoryStore) GetDocumentUploads(_ context.Context, tenantID string) ([]domain.DocumentUpload, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if docs, ok := s.documents[tenantID]; ok {
		res := make([]domain.DocumentUpload, len(docs))
		copy(res, docs)
		return res, nil
	}
	return []domain.DocumentUpload{}, nil
}

// GetDocumentUploadByID retrieves a single document
func (s *MemoryStore) GetDocumentUploadByID(_ context.Context, tenantID, id string) (*domain.DocumentUpload, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if docs, ok := s.documents[tenantID]; ok {
		for _, d := range docs {
			if d.ID == id {
				copyD := d
				return &copyD, nil
			}
		}
	}
	return nil, fmt.Errorf("document not found: %s", id)
}

// UpdateDocumentOCRTx updates extraction status and data
func (s *MemoryStore) UpdateDocumentOCRTx(_ context.Context, tenantID, id, status string, extracted *domain.ExtractedInvoiceData) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if docs, ok := s.documents[tenantID]; ok {
		for i := range docs {
			if docs[i].ID == id {
				docs[i].OCRStatus = status
				if extracted != nil {
					docs[i].ExtractedData = extracted
				}
				s.documents[tenantID] = docs
				return nil
			}
		}
	}
	return fmt.Errorf("document not found: %s", id)
}

// SeedDemoData rehydrates complete sample data for a newly created tenant
func (s *MemoryStore) SeedDemoData(_ context.Context, tenantID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Copy default PR and 2B to tenant's active GSTIN
	for _, d := range s.dealerships {
		if d.ID == tenantID {
			s.purchaseRegister[d.ActiveGSTIN] = s.purchaseRegister["default"]
			s.gstr2bList[d.ActiveGSTIN] = s.gstr2bList["default"]
			results := engine.Reconcile(s.purchaseRegister["default"], s.gstr2bList["default"], 10.0)
			s.reconciledRecords[d.ActiveGSTIN] = results
			return nil
		}
	}
	return nil
}

// GetDealerships returns all registered dealership groups
func (s *MemoryStore) GetDealerships(_ context.Context) ([]domain.DealershipProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.DealershipProfile, len(s.dealerships))
	copy(res, s.dealerships)
	return res, nil
}

// GetDealershipByID returns a specific profile
func (s *MemoryStore) GetDealershipByID(_ context.Context, id string) (*domain.DealershipProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, d := range s.dealerships {
		if d.ID == id {
			copyD := d
			return &copyD, nil
		}
	}
	return nil, fmt.Errorf("dealership not found with ID: %s", id)
}

// GetPurchaseRegister returns PR items for a dealership/gstin
func (s *MemoryStore) GetPurchaseRegister(_ context.Context, _, gstin string) ([]domain.PurchaseRegisterItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if items, ok := s.purchaseRegister[gstin]; ok && len(items) > 0 {
		return items, nil
	}
	return s.purchaseRegister["default"], nil
}

// GetGstr2B returns 2B items for a dealership/gstin
func (s *MemoryStore) GetGstr2B(_ context.Context, _, gstin string) ([]domain.Gstr2BItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if items, ok := s.gstr2bList[gstin]; ok && len(items) > 0 {
		return items, nil
	}
	return s.gstr2bList["default"], nil
}

// GetReconciledRecords returns reconciled records
func (s *MemoryStore) GetReconciledRecords(_ context.Context, _, gstin string) ([]domain.ReconciledRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if recs, ok := s.reconciledRecords[gstin]; ok && len(recs) > 0 {
		return recs, nil
	}
	return s.reconciledRecords["default"], nil
}

// SaveReconciledRecords updates the cache of reconciled records
func (s *MemoryStore) SaveReconciledRecords(_ context.Context, _, gstin string, records []domain.ReconciledRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reconciledRecords[gstin] = records
	s.reconciledRecords["default"] = records
	return nil
}

// UpdateRecordActionTx updates manual action or payment lock with an audit log entry
func (s *MemoryStore) UpdateRecordActionTx(_ context.Context, _, recordID, action, vendorStatus string, audit *domain.AuditLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	found := false
	for k, recs := range s.reconciledRecords {
		for i := range recs {
			if recs[i].ID == recordID {
				if action != "" {
					recs[i].ActionRecommended = action
				}
				if vendorStatus != "" {
					recs[i].VendorActionStatus = vendorStatus
				}
				found = true
			}
		}
		s.reconciledRecords[k] = recs
	}

	if !found {
		return fmt.Errorf("record %s not found", recordID)
	}

	if audit != nil {
		s.auditLogs = append(s.auditLogs, *audit)
	}

	return nil
}

// GetSalesInvoices returns outbound invoices
func (s *MemoryStore) GetSalesInvoices(_ context.Context, _ string) ([]domain.SalesInvoiceItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.SalesInvoiceItem, len(s.salesInvoices))
	copy(res, s.salesInvoices)
	return res, nil
}

// UpdateSalesInvoiceIRNTx generates IRN and QR payload with audit log
func (s *MemoryStore) UpdateSalesInvoiceIRNTx(_ context.Context, _, id, irn, ackNo, ackDate, qr string, audit *domain.AuditLogEntry) (*domain.SalesInvoiceItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.salesInvoices {
		if s.salesInvoices[i].ID == id {
			s.salesInvoices[i].IRNStatus = "GENERATED"
			s.salesInvoices[i].IRNNumber = irn
			s.salesInvoices[i].AckNumber = ackNo
			s.salesInvoices[i].AckDate = ackDate
			s.salesInvoices[i].SignedQRPayload = qr
			copyItem := s.salesInvoices[i]

			if audit != nil {
				s.auditLogs = append(s.auditLogs, *audit)
			}
			return &copyItem, nil
		}
	}
	return nil, fmt.Errorf("invoice with ID %s not found", id)
}

// GetComplianceAlerts returns active compliance exception alerts
func (s *MemoryStore) GetComplianceAlerts(_ context.Context, _ string) ([]domain.ComplianceExceptionAlert, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.ComplianceExceptionAlert, len(s.complianceAlerts))
	copy(res, s.complianceAlerts)
	return res, nil
}

// ResolveAlertTx marks an alert as resolved with audit log
func (s *MemoryStore) ResolveAlertTx(_ context.Context, _, id string, audit *domain.AuditLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.complianceAlerts {
		if s.complianceAlerts[i].ID == id {
			s.complianceAlerts[i].Status = "RESOLVED"
			if audit != nil {
				s.auditLogs = append(s.auditLogs, *audit)
			}
			return nil
		}
	}
	return fmt.Errorf("alert not found: %s", id)
}

// GetComplianceWorkflow returns live pipeline steps
func (s *MemoryStore) GetComplianceWorkflow(_ context.Context, _ string) ([]domain.ComplianceWorkflowStep, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.ComplianceWorkflowStep, len(s.complianceWorkflow))
	copy(res, s.complianceWorkflow)
	return res, nil
}

// GetOEMSchemes returns OEM schemes and CDNR reconciliations
func (s *MemoryStore) GetOEMSchemes(_ context.Context, _ string) ([]domain.OEMScheme, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.OEMScheme, len(s.oemSchemes))
	copy(res, s.oemSchemes)
	return res, nil
}

// AddNoticeLogTx logs dispatched vendor communications
func (s *MemoryStore) AddNoticeLogTx(_ context.Context, _ string, log domain.NoticeLog, audit *domain.AuditLogEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.noticeLogs = append(s.noticeLogs, log)
	if audit != nil {
		s.auditLogs = append(s.auditLogs, *audit)
	}
	return nil
}

// GetNoticeLogs returns all communication logs
func (s *MemoryStore) GetNoticeLogs(_ context.Context, _ string) ([]domain.NoticeLog, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.NoticeLog, len(s.noticeLogs))
	copy(res, s.noticeLogs)
	return res, nil
}

// GetAuditLogs returns immutable audit entries
func (s *MemoryStore) GetAuditLogs(_ context.Context, _ string) ([]domain.AuditLogEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]domain.AuditLogEntry, len(s.auditLogs))
	copy(res, s.auditLogs)
	return res, nil
}

// seedData populates rich initial data mirroring production dealership scenarios
func (s *MemoryStore) seedData() {
	s.dealerships = []domain.DealershipProfile{
		{
			ID:                   "dms-01",
			GroupName:            "Apex Motorcorp Automotive Group",
			Brand:                "Maruti Suzuki (Arena, Nexa & True Value)",
			AuthorizedDealerFor:  "Maruti Suzuki India Limited (MSIL)",
			Headquarters:         "Connaught Place, New Delhi",
			MonthlyInvoiceVolume: 4250,
			DMSSoftware:          "MARUTI_EDMS",
			ActiveGSTIN:          "07AABCA9876K1Z2",
			Branches: []domain.DealershipBranch{
				{GSTIN: "07AABCA9876K1Z2", State: "Delhi (07)", City: "South Delhi & Okhla Phase III", Type: "NEXA_SHOWROOM"},
				{GSTIN: "06AABCA9876K1ZY", State: "Haryana (06)", City: "Gurugram Sector 29 & Manesar", Type: "SHOWROOM_AND_WORKSHOP"},
				{GSTIN: "09AABCA9876K1ZX", State: "Uttar Pradesh (09)", City: "Noida Sector 63 & Greater Noida", Type: "BODYSHOP_HUB"},
			},
		},
		{
			ID:                   "dms-02",
			GroupName:            "Vertex Wheels & Mobility Pvt Ltd",
			Brand:                "Tata Motors Commercial & Passenger",
			AuthorizedDealerFor:  "Tata Motors Limited (TML)",
			Headquarters:         "Andheri East, Mumbai",
			MonthlyInvoiceVolume: 3100,
			DMSSoftware:          "TATA_MOTHER",
			ActiveGSTIN:          "27AAACV1234F1Z8",
			Branches: []domain.DealershipBranch{
				{GSTIN: "27AAACV1234F1Z8", State: "Maharashtra (27)", City: "Mumbai & Thane Central", Type: "SHOWROOM_AND_WORKSHOP"},
				{GSTIN: "24AAACV1234F1Z1", State: "Gujarat (24)", City: "Ahmedabad SG Highway", Type: "ARENA_SHOWROOM"},
			},
		},
	}

	s.users["demo@autotax.io"] = domain.User{

		ID:           "usr-demo-01",
		TenantID:     "dms-01",
		Email:        "demo@autotax.io",
		FullName:     "Rajesh Sharma (CFO)",
		Role:         "FINANCE_DIRECTOR",
		AuthProvider: "LOCAL",
		IsActive:     true,
		CreatedAt:    time.Now().Add(-30 * 24 * time.Hour),
		UpdatedAt:    time.Now(),
	}
	s.users["director@apexmotors.in"] = domain.User{
		ID:           "usr-apex-01",
		TenantID:     "dms-01",
		Email:        "director@apexmotors.in",
		FullName:     "Vikramaditya Singhania",
		Role:         "FINANCE_DIRECTOR",
		AuthProvider: "LOCAL",
		IsActive:     true,
		CreatedAt:    time.Now().Add(-60 * 24 * time.Hour),
		UpdatedAt:    time.Now(),
	}
	s.users["tax@vertexmobility.in"] = domain.User{
		ID:           "usr-vertex-01",
		TenantID:     "dms-02",
		Email:        "tax@vertexmobility.in",
		FullName:     "Ananya Deshmukh",
		Role:         "TAX_ACCOUNTANT",
		AuthProvider: "LOCAL",
		IsActive:     true,
		CreatedAt:    time.Now().Add(-45 * 24 * time.Hour),
		UpdatedAt:    time.Now(),
	}

	prItems := []domain.PurchaseRegisterItem{

		{
			ID:                "PR-101",
			InternalVoucherNo: "VCH/2026/07/0041",
			InvoiceNo:         "MSIL/DEL/2627/00892",
			InvoiceDate:       "2026-07-04",
			VendorGSTIN:       "06AAACM1234H1Z1",
			VendorName:        "Maruti Suzuki India Limited (OEM)",
			Category:          domain.CatOEMVehicle,
			TaxableValue:      48500000,
			IGST:              13580000,
			CGST:              0,
			SGST:              0,
			Cess:              8245000,
			TotalTax:          21825000,
			TotalInvoiceValue: 70325000,
			PaymentStatus:     "PAID",
			DaysOutstanding:   22,
			IsEligibleITC:     true,
			BranchName:        "Nexa Okhla Prime",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-102",
			InternalVoucherNo: "VCH/2026/07/0055",
			InvoiceNo:         "MSIL/SPR/26-27/4120",
			InvoiceDate:       "2026-07-08",
			VendorGSTIN:       "06AAACM1234H1Z1",
			VendorName:        "Maruti Suzuki India Limited (OEM Spares)",
			Category:          domain.CatSpareParts,
			TaxableValue:      3420000,
			IGST:              615600,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          615600,
			TotalInvoiceValue: 4035600,
			PaymentStatus:     "PAID",
			DaysOutstanding:   18,
			IsEligibleITC:     true,
			BranchName:        "Nexa Okhla Prime",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-103",
			InternalVoucherNo: "VCH/2026/07/0082",
			InvoiceNo:         "CAST/NOI/2026/9112",
			InvoiceDate:       "2026-07-11",
			VendorGSTIN:       "09AAACC4321J1Z3",
			VendorName:        "Castrol India Limited (Engine Oils & Lubes)",
			Category:          domain.CatLubricants,
			TaxableValue:      890000,
			IGST:              160200,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          160200,
			TotalInvoiceValue: 1050200,
			PaymentStatus:     "PAID",
			DaysOutstanding:   15,
			IsEligibleITC:     true,
			BranchName:        "Workshop Bodyshop Hub",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-104",
			InternalVoucherNo: "VCH/2026/07/0104",
			InvoiceNo:         "PPG/AS/2627/0441",
			InvoiceDate:       "2026-07-14",
			VendorGSTIN:       "07AAACP9988E1Z4",
			VendorName:        "PPG Asian Paints Pvt Ltd (Automotive Refinish)",
			Category:          domain.CatBodyshopPaint,
			TaxableValue:      1240000,
			IGST:              0,
			CGST:              111600,
			SGST:              111600,
			Cess:              0,
			TotalTax:          223200,
			TotalInvoiceValue: 1463200,
			PaymentStatus:     "PAID",
			DaysOutstanding:   12,
			IsEligibleITC:     true,
			BranchName:        "Workshop Bodyshop Hub",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-105",
			InternalVoucherNo: "VCH/2026/07/0118",
			InvoiceNo:         "VND/GZB/2026/0091",
			InvoiceDate:       "2026-07-16",
			VendorGSTIN:       "09AABCS8811K1Z9",
			VendorName:        "Sharma Body Works & Denting Fabricators",
			Category:          domain.CatSpareParts,
			TaxableValue:      420000,
			IGST:              75600,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          75600,
			TotalInvoiceValue: 495600,
			PaymentStatus:     "UNPAID",
			DaysOutstanding:   10,
			IsEligibleITC:     true,
			BranchName:        "Workshop Bodyshop Hub",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-106",
			InternalVoucherNo: "VCH/2026/01/0019",
			InvoiceNo:         "OLD/FAST/25-26/184",
			InvoiceDate:       "2026-01-10",
			VendorGSTIN:       "07AABCF4433D1Z2",
			VendorName:        "FastTrack Tools & Garage Equipment",
			Category:          domain.CatWorkshopTools,
			TaxableValue:      680000,
			IGST:              0,
			CGST:              61200,
			SGST:              61200,
			Cess:              0,
			TotalTax:          122400,
			TotalInvoiceValue: 802400,
			PaymentStatus:     "UNPAID",
			DaysOutstanding:   194, // Rule 37 Risk
			IsEligibleITC:     true,
			BranchName:        "Nexa Okhla Prime",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-107",
			InternalVoucherNo: "VCH/2026/07/0142",
			InvoiceNo:         "CATER/OKH/26/004",
			InvoiceDate:       "2026-07-19",
			VendorGSTIN:       "07AABCH5566G1Z7",
			VendorName:        "Hotel Royal Caterers & Staff Canteen",
			Category:          domain.CatStaffWelfare,
			TaxableValue:      150000,
			IGST:              0,
			CGST:              3750,
			SGST:              3750,
			Cess:              0,
			TotalTax:          7500,
			TotalInvoiceValue: 157500,
			PaymentStatus:     "PAID",
			DaysOutstanding:   6,
			IsEligibleITC:     false, // Blocked 17(5)
			IneligibilityReason: "Section 17(5)(b)(i) - Food, beverages and staff welfare services",
			BranchName:        "Nexa Okhla Prime",
			GSTIN:             "07AABCA9876K1Z2",
		},
		{
			ID:                "PR-108",
			InternalVoucherNo: "VCH/2026/07/0150",
			InvoiceNo:         "SCHEME/Q1/MSIL/09",
			InvoiceDate:       "2026-07-20",
			VendorGSTIN:       "06AAACM1234H1Z1",
			VendorName:        "Maruti Suzuki India Limited (OEM Scheme)",
			Category:          domain.CatOEMSchemeIncentive,
			TaxableValue:      1850000,
			IGST:              333000,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          333000,
			TotalInvoiceValue: 2183000,
			PaymentStatus:     "PAID",
			DaysOutstanding:   5,
			IsEligibleITC:     true,
			BranchName:        "Nexa Okhla Prime",
			GSTIN:             "07AABCA9876K1Z2",
			OEMSchemeRef:      "MSIL-Q1-BONUS-094",
		},
	}

	gstr2bItems := []domain.Gstr2BItem{
		{
			ID:                "2B-501",
			InvoiceNo:         "MSIL/DEL/2627/00892",
			InvoiceType:       "B2B",
			InvoiceDate:       "2026-07-04",
			SupplierGSTIN:     "06AAACM1234H1Z1",
			SupplierName:      "Maruti Suzuki India Limited",
			TaxableValue:      48500000,
			IGST:              13580000,
			CGST:              0,
			SGST:              0,
			Cess:              8245000,
			TotalTax:          21825000,
			TotalInvoiceValue: 70325000,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-10",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
		{
			ID:                "2B-502",
			InvoiceNo:         "MSIL-SPR-2627-4120",
			InvoiceType:       "B2B",
			InvoiceDate:       "2026-07-08",
			SupplierGSTIN:     "06AAACM1234H1Z1",
			SupplierName:      "Maruti Suzuki India Limited",
			TaxableValue:      3420000,
			IGST:              615600,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          615600,
			TotalInvoiceValue: 4035600,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-11",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
		{
			ID:                "2B-503",
			InvoiceNo:         "CAST/NOI/2026/9112",
			InvoiceType:       "B2B",
			InvoiceDate:       "2026-07-11",
			SupplierGSTIN:     "09AAACC4321J1Z3",
			SupplierName:      "Castrol India Limited",
			TaxableValue:      890000,
			IGST:              160200,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          160200,
			TotalInvoiceValue: 1050200,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-09",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
		{
			ID:                "2B-504",
			InvoiceNo:         "PPG/AS/2627/0441",
			InvoiceType:       "B2B",
			InvoiceDate:       "2026-07-14",
			SupplierGSTIN:     "07AAACP9988E1Z4",
			SupplierName:      "PPG Asian Paints Pvt Ltd",
			TaxableValue:      1240000,
			IGST:              0,
			CGST:              105000,
			SGST:              105000,
			Cess:              0,
			TotalTax:          210000,
			TotalInvoiceValue: 1450000,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-11",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
		{
			ID:                "2B-505",
			InvoiceNo:         "SCHEME/Q1/MSIL/09",
			InvoiceType:       "CDNR",
			InvoiceDate:       "2026-07-20",
			SupplierGSTIN:     "06AAACM1234H1Z1",
			SupplierName:      "Maruti Suzuki India Limited",
			TaxableValue:      1850000,
			IGST:              333000,
			CGST:              0,
			SGST:              0,
			Cess:              0,
			TotalTax:          333000,
			TotalInvoiceValue: 2183000,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-11",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
		{
			ID:                "2B-506",
			InvoiceNo:         "LUMAX/DL/26/9021",
			InvoiceType:       "B2B",
			InvoiceDate:       "2026-07-22",
			SupplierGSTIN:     "07AAACL1234K1Z5",
			SupplierName:      "Lumax Auto Technologies Ltd (Headlamps)",
			TaxableValue:      420000,
			IGST:              0,
			CGST:              37800,
			SGST:              37800,
			Cess:              0,
			TotalTax:          75600,
			TotalInvoiceValue: 495600,
			ITCAvailability:   "Y",
			FilingPeriod:      "July 2026",
			GSTR1FilingDate:   "2026-08-11",
			IRNStatus:         "GENERATED",
			DealershipGSTIN:   "07AABCA9876K1Z2",
		},
	}

	s.purchaseRegister["default"] = prItems
	s.purchaseRegister["07AABCA9876K1Z2"] = prItems
	s.gstr2bList["default"] = gstr2bItems
	s.gstr2bList["07AABCA9876K1Z2"] = gstr2bItems

	// Pre-run reconciliation
	initialRecon := engine.Reconcile(prItems, gstr2bItems, 10.0)
	s.reconciledRecords["default"] = initialRecon
	s.reconciledRecords["07AABCA9876K1Z2"] = initialRecon

	s.salesInvoices = []domain.SalesInvoiceItem{
		{
			ID:                  "SINV-001",
			InvoiceNumber:       "INV/2026/0942",
			InvoiceDate:         "2026-08-21",
			CustomerName:        "Apex Logistics & Fleet Pvt Ltd",
			CustomerGSTIN:       "27AABCA9871M1Z5",
			CustomerStateCode:   "27",
			InvoiceType:         "B2B_VEHICLE",
			ChassisVIN:          "MA3FBEB1S00984120",
			VehicleModel:        "Maruti Super Carry CNG (White)",
			TaxableValue:        560000,
			IGST:                0,
			CGST:                78400,
			SGST:                78400,
			Cess:                0,
			TotalAmount:         716800,
			IRNStatus:           "GENERATED",
			IRNNumber:           "9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345",
			AckNumber:           "112609847162",
			AckDate:             "2026-08-21 09:15:22",
			SignedQRPayload:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fff'/><path d='M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z' fill='%23000'/></svg>",
			EWBStatus:           "GENERATED",
			EWBNumber:           "241009871234",
			EWBValidUntil:       "2026-08-22 23:59",
			VehicleRegistration: "MH-04-AX-9912",
			ERPSyncStatus:       "SYNCED",
		},
		{
			ID:                  "SINV-002",
			InvoiceNumber:       "INV/2026/0943",
			InvoiceDate:         "2026-08-21",
			CustomerName:        "Shree Balaji Transporters",
			CustomerGSTIN:       "24AABCS4412K1Z9",
			CustomerStateCode:   "24",
			InvoiceType:         "B2B_VEHICLE",
			ChassisVIN:          "MALCA51HLFM109842",
			VehicleModel:        "Hyundai Creta SX (O) Diesel 1.5",
			TaxableValue:        1420000,
			IGST:                397600,
			CGST:                0,
			SGST:                0,
			Cess:                241400,
			TotalAmount:         2059000,
			IRNStatus:           "GENERATED",
			IRNNumber:           "4a7c1e92d8f34567b8a91234cdef567890123456789abcdef0123456789abcde",
			AckNumber:           "112609847163",
			AckDate:             "2026-08-21 09:45:10",
			SignedQRPayload:     "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23fff'/><path d='M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M45,45 h25 v10 h-25 z' fill='%23000'/></svg>",
			EWBStatus:           "GENERATED",
			EWBNumber:           "291009847162",
			EWBValidUntil:       "2026-08-22 18:00",
			VehicleRegistration: "MH-04-AB-1290",
			ERPSyncStatus:       "SYNCED",
		},
		{
			ID:                "SINV-003",
			InvoiceNumber:     "INV/2026/0944",
			InvoiceDate:       "2026-08-21",
			CustomerName:      "Tata Autocomp Systems Hub",
			CustomerGSTIN:     "27AABCT2390J1Z1",
			CustomerStateCode: "27",
			InvoiceType:       "B2B_PARTS",
			TaxableValue:      84500,
			IGST:              0,
			CGST:              11830,
			SGST:              11830,
			Cess:              0,
			TotalAmount:       108160,
			IRNStatus:         "FAILED",
			FailureReason:     "2150: Error in Recipient State Code vs POS Pin Code (411018 mismatch)",
			EWBStatus:         "NOT_REQUIRED",
			ERPSyncStatus:     "PENDING_PUSH",
		},
		{
			ID:                "SINV-004",
			InvoiceNumber:     "INV/2026/0945",
			InvoiceDate:       "2026-08-21",
			CustomerName:      "Global Auto Fleet Rentals LLP",
			CustomerGSTIN:     "27AAAFG8876L1Z4",
			CustomerStateCode: "27",
			InvoiceType:       "B2B_VEHICLE",
			ChassisVIN:        "MA3EKEB1S00112233",
			VehicleModel:      "Maruti Grand Vitara Alpha Hybrid (Celestial Blue)",
			TaxableValue:      1790000,
			IGST:              0,
			CGST:              250600,
			SGST:              250600,
			Cess:              268500,
			TotalAmount:       2559700,
			IRNStatus:         "PENDING",
			EWBStatus:         "PENDING",
			ERPSyncStatus:     "PENDING_PUSH",
		},
	}

	s.complianceAlerts = []domain.ComplianceExceptionAlert{
		{
			ID:                      "ALT-101",
			Severity:                "CRITICAL",
			Category:                "RULE_37_180D",
			Title:                   "Rule 37 ITC Clawback Alert: 14 Invoices Approaching 180 Days",
			Description:             "₹4,18,200 in Input Tax Credit must be reversed with daily 18% interest under Section 50 if unpaid within 15 days.",
			ImpactAmount:            418200,
			AffectedEntity:          "Spare Parts & Lubricants Vendors (14 Unpaid Invoices)",
			SuggestedAction:         "Release payment voucher immediately or trigger partial credit reversal in GSTR-3B Table 4(B)(2).",
			AutoResolutionAvailable: true,
			Status:                  "OPEN",
		},
		{
			ID:                      "ALT-102",
			Severity:                "HIGH",
			Category:                "IRN_FAILURE",
			Title:                   "IRN Schema Validation Failure: State Code POS Discrepancy",
			Description:             "Invoice INV/2026/0944 blocked by IRP portal error 2150. Delivery vehicle gate pass held at showroom.",
			ImpactAmount:            108160,
			AffectedEntity:          "Tata Autocomp Systems Hub (Chassis VIN MALCA51)",
			SuggestedAction:         "Auto-correct buyer POS State Code in DMS & trigger instant retry to NIC portal.",
			AutoResolutionAvailable: true,
			Status:                  "OPEN",
		},
		{
			ID:                      "ALT-103",
			Severity:                "HIGH",
			Category:                "OEM_CLAIM_SHORT",
			Title:                   "OEM Q1 Sales Incentive Short-Pass: ₹8,42,000 Discrepancy",
			Description:             "Manufacturer credit note is ₹8,42,000 lower than dealer booking ledger for retail exchange bonus.",
			ImpactAmount:            842000,
			AffectedEntity:          "MSIL Q1 Exchange Scheme Circular No. 2026/094",
			SuggestedAction:         "Generate ASMT-10 commercial defense dossier and issue GST commercial dispute claim.",
			AutoResolutionAvailable: false,
			Status:                  "OPEN",
		},
	}

	s.complianceWorkflow = []domain.ComplianceWorkflowStep{
		{
			ID:           "STP-01",
			StepName:     "DMS Transaction Ingestion & Invariant Check",
			Status:       "COMPLETED",
			Automated:    true,
			Timestamp:    "11:04:12 AM",
			Details:      "Ingested 342 sales vouchers & purchase entries from CDK Global. HSN and mandatory e-invoice schema fields parsed.",
			SourceModule: "DMS_INGEST",
		},
		{
			ID:           "STP-02",
			StepName:     "Multi-Layer GSTIN & State Code Validation",
			Status:       "COMPLETED",
			Automated:    true,
			Timestamp:    "11:04:13 AM",
			Details:      "Verified buyer/supplier GSTIN active status against cached public taxpayer directory with zero API latency penalty.",
			SourceModule: "VALIDATOR",
		},
		{
			ID:           "STP-03",
			StepName:     "Auto-IRN Generation via GSP Abstraction Pipe",
			Status:       "COMPLETED",
			Automated:    true,
			Timestamp:    "11:04:15 AM",
			Details:      "Generated 28 IRNs with digital signatures and 2D QR codes via primary GSP provider. 0 retries needed.",
			SourceModule: "IRN_SERVICE",
		},
		{
			ID:           "STP-04",
			StepName:     "Conditional E-Way Bill Auto-Trigger (>₹50k Goods)",
			Status:       "COMPLETED",
			Automated:    true,
			Timestamp:    "11:04:17 AM",
			Details:      "Identified 12 inter-branch vehicle chassis movements; dispatched E-Way Bill generation with vehicle registration numbers.",
			SourceModule: "EWB_SERVICE",
		},
		{
			ID:           "STP-05",
			StepName:     "Two-Way ERP Ledger Back-Sync & Payment Lock Injection",
			Status:       "IN_PROGRESS",
			Automated:    true,
			Timestamp:    "11:04:18 AM",
			Details:      "Updating ERP voucher IDs with signed IRN numbers. Injecting payment hold on 8 missing GSTR-2B vendor invoices.",
			SourceModule: "ERP_SYNC",
		},
		{
			ID:           "STP-06",
			StepName:     "Stakeholder Escalation & WhatsApp Statutory Notice",
			Status:       "PENDING",
			Automated:    true,
			Timestamp:    "Scheduled for 11:05:00 AM",
			Details:      "Batching WhatsApp default notices to 6 non-filing vendors with Section 16(2)(aa) statutory demand copy.",
			SourceModule: "COMM_TRIGGER",
		},
	}

	s.oemSchemes = []domain.OEMScheme{
		{
			ID:              "SCH-01",
			SchemeName:      "Q1 FY26 Retail Volume Growth Target Bonus",
			CircularNo:      "MSIL/MKT/2026/041",
			Quarter:         "Q1-FY26",
			ClaimedAmount:   2450000,
			OEMPassedAmount: 2450000,
			GSTCreditLoss:   0,
			Status:          "RECONCILED",
		},
		{
			ID:              "SCH-02",
			SchemeName:      "Grand Vitara & Invicto Institutional Demo Car Subsidy",
			CircularNo:      "MSIL/SCH/2026/089",
			Quarter:         "Q1-FY26",
			ClaimedAmount:   1820000,
			OEMPassedAmount: 1420000,
			GSTCreditLoss:   72000,
			Status:          "SHORT_PASSED",
		},
		{
			ID:              "SCH-03",
			SchemeName:      "Monsoon Bodyshop Paint & Spares Consignment Rebate",
			CircularNo:      "MSIL/SPR/26/112",
			Quarter:         "Q1-FY26",
			ClaimedAmount:   940000,
			OEMPassedAmount: 0,
			GSTCreditLoss:   169200,
			Status:          "PENDING_OEM_CREDIT",
		},
	}
}
