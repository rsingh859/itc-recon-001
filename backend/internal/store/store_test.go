package store

import (
	"context"
	"testing"
	"time"

	"github.com/autotax/backend/internal/domain"
)

func TestMemoryStoreImplementation(t *testing.T) {
	ctx := context.Background()
	var s DataStore = NewMemoryStore()
	defer s.Close()

	// 1. Test Tenants
	dealers, err := s.GetDealerships(ctx)
	if err != nil {
		t.Fatalf("GetDealerships failed: %v", err)
	}
	if len(dealers) == 0 {
		t.Fatal("Expected pre-seeded dealerships, got 0")
	}

	d, err := s.GetDealershipByID(ctx, "dms-01")
	if err != nil || d == nil {
		t.Fatalf("GetDealershipByID('dms-01') failed: %v", err)
	}

	// 2. Test Purchase Register & 2B
	prs, err := s.GetPurchaseRegister(ctx, "dms-01", "07AABCA9876K1Z2")
	if err != nil || len(prs) == 0 {
		t.Fatalf("GetPurchaseRegister failed: %v", err)
	}

	b2s, err := s.GetGstr2B(ctx, "dms-01", "07AABCA9876K1Z2")
	if err != nil || len(b2s) == 0 {
		t.Fatalf("GetGstr2B failed: %v", err)
	}

	// 3. Test Reconciled Records
	recs, err := s.GetReconciledRecords(ctx, "dms-01", "07AABCA9876K1Z2")
	if err != nil || len(recs) == 0 {
		t.Fatalf("GetReconciledRecords failed: %v", err)
	}

	// 4. Test Transactional Override & Audit Log
	audit := &domain.AuditLogEntry{
		ID:            "AUD-TEST-001",
		TenantID:      "dms-01",
		UserID:        "auditor_user",
		ActionType:    "MATCH_OVERRIDE",
		EntityType:    "RECON_RECORD",
		EntityID:      recs[0].ID,
		CorrelationID: "req_test",
		Timestamp:     time.Now(),
	}

	err = s.UpdateRecordActionTx(ctx, "dms-01", recs[0].ID, "HOLD_PAYMENT", "PAYMENT_BLOCKED", audit)
	if err != nil {
		t.Fatalf("UpdateRecordActionTx failed: %v", err)
	}

	auditLogs, err := s.GetAuditLogs(ctx, "dms-01")
	if err != nil {
		t.Fatalf("GetAuditLogs failed: %v", err)
	}
	if len(auditLogs) != 1 {
		t.Fatalf("Expected 1 audit log entry, got %d", len(auditLogs))
	}
	if auditLogs[0].ActionType != "MATCH_OVERRIDE" {
		t.Errorf("Expected ActionType MATCH_OVERRIDE, got %s", auditLogs[0].ActionType)
	}
}
