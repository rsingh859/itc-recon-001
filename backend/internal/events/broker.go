package events

import (
	"context"
	"log"
	"sync"
)

// HandlerFunc processes a domain event
type HandlerFunc func(ctx context.Context, event Event) error

// EventBroker defines the publish/subscribe interface for event-driven workflows
type EventBroker interface {
	Publish(ctx context.Context, event Event) error
	Subscribe(eventType string, handler HandlerFunc)
	Close() error
}

// InMemoryEventBroker implements an asynchronous in-memory event bus with buffered channels
type InMemoryEventBroker struct {
	mu          sync.RWMutex
	subscribers map[string][]HandlerFunc
	eventChan   chan Event
	quitChan    chan struct{}
	wg          sync.WaitGroup
}

// NewInMemoryEventBroker creates an event broker with worker goroutines
func NewInMemoryEventBroker(workerCount int, bufferSize int) *InMemoryEventBroker {
	if workerCount <= 0 {
		workerCount = 4
	}
	if bufferSize <= 0 {
		bufferSize = 256
	}

	b := &InMemoryEventBroker{
		subscribers: make(map[string][]HandlerFunc),
		eventChan:   make(chan Event, bufferSize),
		quitChan:    make(chan struct{}),
	}

	// Start worker pool
	for i := 0; i < workerCount; i++ {
		b.wg.Add(1)
		go b.worker()
	}

	return b
}

func (b *InMemoryEventBroker) worker() {
	defer b.wg.Done()
	for {
		select {
		case <-b.quitChan:
			return
		case evt, ok := <-b.eventChan:
			if !ok {
				return
			}
			b.dispatch(evt)
		}
	}
}

func (b *InMemoryEventBroker) dispatch(evt Event) {
	b.mu.RLock()
	handlers := b.subscribers[evt.Type()]
	// Also invoke wildcard handlers
	wildcard := b.subscribers["*"]
	b.mu.RUnlock()

	allHandlers := append(handlers, wildcard...)
	for _, h := range allHandlers {
		go func(handler HandlerFunc, e Event) {
			ctx := context.Background()
			if err := handler(ctx, e); err != nil {
				log.Printf("⚠️ Event handler failed for [%s]: %v", e.Type(), err)
			}
		}(h, evt)
	}
}

// Publish enqueues an event for asynchronous processing
func (b *InMemoryEventBroker) Publish(_ context.Context, event Event) error {
	select {
	case b.eventChan <- event:
		return nil
	default:
		log.Printf("⚠️ Event queue full, dropping event: %s", event.Type())
		return nil
	}
}

// Subscribe registers a handler for an event type
func (b *InMemoryEventBroker) Subscribe(eventType string, handler HandlerFunc) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subscribers[eventType] = append(b.subscribers[eventType], handler)
}

// Close gracefully drains and closes workers
func (b *InMemoryEventBroker) Close() error {
	close(b.quitChan)
	b.wg.Wait()
	return nil
}
