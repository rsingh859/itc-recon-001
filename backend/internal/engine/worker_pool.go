package engine

import (
	"runtime"
	"sync"

	"github.com/autotax/backend/internal/domain"
)

// BatchReconcileParallel runs the reconciliation engine concurrently across goroutines,
// splitting large purchase registers across available CPU cores.
func BatchReconcileParallel(
	purchaseRegister []domain.PurchaseRegisterItem,
	gstr2bList []domain.Gstr2BItem,
	tolerance float64,
) []domain.ReconciledRecord {
	totalPR := len(purchaseRegister)
	numCPU := runtime.NumCPU()

	// If the dataset is small, run single-threaded to avoid goroutine sync overhead
	if totalPR < 200 || numCPU <= 1 {
		return Reconcile(purchaseRegister, gstr2bList, tolerance)
	}

	chunkSize := (totalPR + numCPU - 1) / numCPU
	var wg sync.WaitGroup
	chunks := make([][]domain.PurchaseRegisterItem, 0, numCPU)

	for i := 0; i < totalPR; i += chunkSize {
		end := i + chunkSize
		if end > totalPR {
			end = totalPR
		}
		chunks = append(chunks, purchaseRegister[i:end])
	}

	resultsChan := make(chan []domain.ReconciledRecord, len(chunks))

	for _, chunk := range chunks {
		wg.Add(1)
		go func(prChunk []domain.PurchaseRegisterItem) {
			defer wg.Done()
			// Each goroutine reconciles its chunk against the full 2B list
			res := Reconcile(prChunk, gstr2bList, tolerance)
			resultsChan <- res
		}(chunk)
	}

	wg.Wait()
	close(resultsChan)

	var combined []domain.ReconciledRecord
	seen2BMissing := make(map[string]bool)

	for resChunk := range resultsChan {
		for _, record := range resChunk {
			// For MISSING_IN_PR records, deduplicate since each chunk might generate them
			if record.MatchStatus == domain.MatchMissingInPR && record.GSTR2BItem != nil {
				if seen2BMissing[record.GSTR2BItem.ID] {
					continue
				}
				seen2BMissing[record.GSTR2BItem.ID] = true
			}
			combined = append(combined, record)
		}
	}

	return combined
}
