package cache

import (
	"context"
	"testing"
	"time"
)

func TestMemoryCache(t *testing.T) {
	ctx := context.Background()
	c := NewMemoryCache()
	defer c.Close()

	type Sample struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// 1. Test Set and Get
	sample := Sample{Name: "Maruti", Value: 4250}
	err := c.Set(ctx, "recon:dms-01:summary", sample, 1*time.Minute)
	if err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	var fetched Sample
	err = c.Get(ctx, "recon:dms-01:summary", &fetched)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if fetched.Name != "Maruti" || fetched.Value != 4250 {
		t.Fatalf("Expected {Maruti 4250}, got %+v", fetched)
	}

	// 2. Test DeletePrefix
	_ = c.Set(ctx, "recon:dms-01:records", []string{"REC-1", "REC-2"}, 1*time.Minute)
	_ = c.Set(ctx, "recon:dms-02:records", []string{"REC-3"}, 1*time.Minute)

	err = c.DeletePrefix(ctx, "recon:dms-01")
	if err != nil {
		t.Fatalf("DeletePrefix failed: %v", err)
	}

	err = c.Get(ctx, "recon:dms-01:summary", &fetched)
	if err != ErrCacheMiss {
		t.Fatalf("Expected ErrCacheMiss after DeletePrefix, got %v", err)
	}

	// dms-02 should still exist
	var dms2 []string
	err = c.Get(ctx, "recon:dms-02:records", &dms2)
	if err != nil || len(dms2) != 1 {
		t.Fatalf("Expected dms-02 to remain intact, got err: %v", err)
	}
}
