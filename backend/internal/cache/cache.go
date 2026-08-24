package cache

import (
	"context"
	"errors"
	"time"
)

var (
	// ErrCacheMiss is returned when a requested key is not present or expired
	ErrCacheMiss = errors.New("cache: key not found")
)

// Cache provides high-speed caching for reconciled records, metrics, and filter buckets
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) error
	Close() error
}
