package store

import (
	"context"
	"time"

	"github.com/autotax/backend/internal/domain"
)

// DataStore is the common interface for both PostgreSQL and in-memory storage implementations
type DataStore interface {
	// Lifecycle
	GetStartTime() time.Time
	Close() error

	// Tenants & Dealership Profiles
	GetDealerships(ctx context.Context) ([]domain.DealershipProfile, error)
	GetDealershipByID(ctx context.Context, id string) (*domain.DealershipProfile, error)
	CreateTenantTx(ctx context.Context, tenant domain.DealershipProfile) error

	// Users & Authentication
	CreateUserTx(ctx context.Context, user domain.User) error
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id string) (*domain.User, error)
	CreateSessionTx(ctx context.Context, session domain.UserSession) error
	GetSessionByID(ctx context.Context, sessionID string) (*domain.UserSession, error)

	// Inward Supplies & 2B (including Manual Entry)
	GetPurchaseRegister(ctx context.Context, tenantID, gstin string) ([]domain.PurchaseRegisterItem, error)
	GetGstr2B(ctx context.Context, tenantID, gstin string) ([]domain.Gstr2BItem, error)
	AddPurchaseRegisterItemsTx(ctx context.Context, tenantID, gstin string, items []domain.PurchaseRegisterItem) error
	AddGstr2BItemsTx(ctx context.Context, tenantID, gstin string, items []domain.Gstr2BItem) error

	// Document Uploads & OCR
	SaveDocumentUploadTx(ctx context.Context, doc domain.DocumentUpload) error
	GetDocumentUploads(ctx context.Context, tenantID string) ([]domain.DocumentUpload, error)
	GetDocumentUploadByID(ctx context.Context, tenantID, id string) (*domain.DocumentUpload, error)
	UpdateDocumentOCRTx(ctx context.Context, tenantID, id, status string, extracted *domain.ExtractedInvoiceData) error

	// Demo Data Seeding
	SeedDemoData(ctx context.Context, tenantID string) error

	// Reconciliation Matrix
	SaveReconciledRecords(ctx context.Context, tenantID, gstin string, records []domain.ReconciledRecord) error
	GetReconciledRecords(ctx context.Context, tenantID, gstin string) ([]domain.ReconciledRecord, error)
	UpdateRecordActionTx(ctx context.Context, tenantID, recordID, action, vendorStatus string, audit *domain.AuditLogEntry) error

	// Outbound Sales Invoices & IRN
	GetSalesInvoices(ctx context.Context, tenantID string) ([]domain.SalesInvoiceItem, error)
	UpdateSalesInvoiceIRNTx(ctx context.Context, tenantID, id, irn, ackNo, ackDate, qr string, audit *domain.AuditLogEntry) (*domain.SalesInvoiceItem, error)

	// Compliance & Alerts
	GetComplianceAlerts(ctx context.Context, tenantID string) ([]domain.ComplianceExceptionAlert, error)
	ResolveAlertTx(ctx context.Context, tenantID, alertID string, audit *domain.AuditLogEntry) error
	GetComplianceWorkflow(ctx context.Context, tenantID string) ([]domain.ComplianceWorkflowStep, error)

	// OEM Commercial Schemes
	GetOEMSchemes(ctx context.Context, tenantID string) ([]domain.OEMScheme, error)

	// Statutory Section 16(2)(aa) Notice Logs
	AddNoticeLogTx(ctx context.Context, tenantID string, log domain.NoticeLog, audit *domain.AuditLogEntry) error
	GetNoticeLogs(ctx context.Context, tenantID string) ([]domain.NoticeLog, error)

	// Statutory Audit Trail (WORM)
	GetAuditLogs(ctx context.Context, tenantID string) ([]domain.AuditLogEntry, error)
}

