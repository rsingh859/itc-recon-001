package cache

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"
)

type cacheItem struct {
	data      []byte
	expiresAt time.Time
}

// MemoryCache implements in-memory TTL caching with thread-safety
type MemoryCache struct {
	mu    sync.RWMutex
	items map[string]cacheItem
}

// NewMemoryCache initializes an in-memory cache
func NewMemoryCache() *MemoryCache {
	c := &MemoryCache{
		items: make(map[string]cacheItem),
	}
	// Background cleaner goroutine
	go c.cleanupLoop()
	return c
}

func (c *MemoryCache) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.items {
			if !v.expiresAt.IsZero() && now.After(v.expiresAt) {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}

// Get retrieves and unmarshals an item
func (c *MemoryCache) Get(_ context.Context, key string, dest interface{}) error {
	c.mu.RLock()
	item, ok := c.items[key]
	c.mu.RUnlock()

	if !ok {
		return ErrCacheMiss
	}

	if !item.expiresAt.IsZero() && time.Now().After(item.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return ErrCacheMiss
	}

	return json.Unmarshal(item.data, dest)
}

// Set marshals and stores an item with TTL
func (c *MemoryCache) Set(_ context.Context, key string, value interface{}, ttl time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	var expiresAt time.Time
	if ttl > 0 {
		expiresAt = time.Now().Add(ttl)
	}

	c.mu.Lock()
	c.items[key] = cacheItem{
		data:      bytes,
		expiresAt: expiresAt,
	}
	c.mu.Unlock()

	return nil
}

// Delete removes a single key
func (c *MemoryCache) Delete(_ context.Context, key string) error {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
	return nil
}

// DeletePrefix invalidates all keys starting with a prefix
func (c *MemoryCache) DeletePrefix(_ context.Context, prefix string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for k := range c.items {
		if strings.HasPrefix(k, prefix) {
			delete(c.items, k)
		}
	}
	return nil
}

// Close satisfies Cache interface
func (c *MemoryCache) Close() error {
	c.mu.Lock()
	c.items = make(map[string]cacheItem)
	c.mu.Unlock()
	return nil
}
