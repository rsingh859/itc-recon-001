package events

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestInMemoryEventBroker(t *testing.T) {
	ctx := context.Background()
	broker := NewInMemoryEventBroker(2, 64)
	defer broker.Close()

	var counter int32

	// Subscribe
	broker.Subscribe(TypeGstr2bIngestionCompleted, func(_ context.Context, evt Event) error {
		ingest, ok := evt.(Gstr2bIngestionCompletedEvent)
		if !ok {
			t.Errorf("Unexpected event type")
		}
		if ingest.BranchGSTIN == "07AABCA9876K1Z2" {
			atomic.AddInt32(&counter, 1)
		}
		return nil
	})

	// Publish
	err := broker.Publish(ctx, Gstr2bIngestionCompletedEvent{
		BaseEvent: BaseEvent{
			EventType: TypeGstr2bIngestionCompleted,
			TenantID:  "dms-01",
			CreatedAt: time.Now(),
		},
		BranchGSTIN:   "07AABCA9876K1Z2",
		FilingPeriod:  "July 2026",
		RecordsSynced: 42,
	})
	if err != nil {
		t.Fatalf("Publish failed: %v", err)
	}

	// Wait for worker
	time.Sleep(50 * time.Millisecond)

	if atomic.LoadInt32(&counter) != 1 {
		t.Fatalf("Expected counter to be 1, got %d", counter)
	}
}
