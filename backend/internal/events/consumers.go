package events

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/autotax/backend/internal/domain"
	"github.com/autotax/backend/internal/engine"
	"github.com/autotax/backend/internal/store"
)

// RegisterDefaultConsumers registers workflow consumers for cross-service events
func RegisterDefaultConsumers(broker EventBroker, s store.DataStore) {
	// 1. Ingestion Completed -> Automatically trigger 7-tier reconciliation
	broker.Subscribe(TypeGstr2bIngestionCompleted, func(ctx context.Context, evt Event) error {
		ingestEvt, ok := evt.(Gstr2bIngestionCompletedEvent)
		if !ok {
			return nil
		}

		log.Printf("📢 [Event Consumer] Ingestion completed for %s (%d records). Triggering reconciliation...",
			ingestEvt.BranchGSTIN, ingestEvt.RecordsSynced)

		prs, err := s.GetPurchaseRegister(ctx, ingestEvt.TenantID, ingestEvt.BranchGSTIN)
		if err != nil {
			return err
		}
		b2s, err := s.GetGstr2B(ctx, ingestEvt.TenantID, ingestEvt.BranchGSTIN)
		if err != nil {
			return err
		}

		results := engine.Reconcile(prs, b2s, 10.0)
		_ = s.SaveReconciledRecords(ctx, ingestEvt.TenantID, ingestEvt.BranchGSTIN, results)
		summary := engine.GenerateSummary(results)

		// Publish ReconBatchCompletedEvent
		_ = broker.Publish(ctx, ReconBatchCompletedEvent{
			BaseEvent: BaseEvent{
				EventType: TypeReconBatchCompleted,
				TenantID:  ingestEvt.TenantID,
				CreatedAt: time.Now(),
			},
			BranchGSTIN:       ingestEvt.BranchGSTIN,
			FilingPeriod:      ingestEvt.FilingPeriod,
			TotalRecordsCount: len(results),
			MatchedTax:        summary.MatchedTax,
			AtRiskTax:         summary.AtRiskTax,
			Missing2BCount:    summary.Missing2BCount,
			Rule37Count:       summary.Rule37Count,
		})

		return nil
	})

	// 2. Reconciliation Completed -> Auto-detect high-risk invoices and trigger Section 16(2)(aa) payment holds
	broker.Subscribe(TypeReconBatchCompleted, func(ctx context.Context, evt Event) error {
		reconEvt, ok := evt.(ReconBatchCompletedEvent)
		if !ok {
			return nil
		}

		log.Printf("📢 [Event Consumer] Reconciliation completed for %s. (Matched Tax: ₹%.2f, At Risk: ₹%.2f)",
			reconEvt.BranchGSTIN, reconEvt.MatchedTax, reconEvt.AtRiskTax)

		if reconEvt.Missing2BCount > 0 || reconEvt.Rule37Count > 0 {
			log.Printf("⚠️ High tax risk detected for %s: %d missing 2B records, %d Rule 37 violations.",
				reconEvt.BranchGSTIN, reconEvt.Missing2BCount, reconEvt.Rule37Count)
		}

		return nil
	})

	// 3. Payment Hold Triggered -> Record statutory audit trail entry
	broker.Subscribe(TypePaymentHoldTriggered, func(ctx context.Context, evt Event) error {
		holdEvt, ok := evt.(PaymentHoldTriggeredEvent)
		if !ok {
			return nil
		}

		log.Printf("🔒 [Event Consumer] ERP Payment Hold active for vendor %s (%s) - ₹%.2f",
			holdEvt.VendorName, holdEvt.VendorGSTIN, holdEvt.AmountAtRisk)

		audit := &domain.AuditLogEntry{
			ID:         fmt.Sprintf("AUD-HOLD-%d", time.Now().UnixNano()%1000000),
			TenantID:   holdEvt.TenantID,
			UserID:     "event_bus_worker",
			ActionType: "PAYMENT_HOLD",
			EntityType: "RECON_RECORD",
			EntityID:   holdEvt.RecordID,
			NewState:   holdEvt,
			Timestamp:  time.Now(),
		}

		return s.UpdateRecordActionTx(ctx, holdEvt.TenantID, holdEvt.RecordID, "HOLD_PAYMENT", "PAYMENT_LOCKED", audit)
	})
}
