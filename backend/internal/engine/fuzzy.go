package engine

import (
	"math"
	"strings"
)

// CalculateFuzzyScore calculates string similarity percentage (0 to 100) between two invoice numbers
// using normalized strings, substring containment heuristic, and Levenshtein distance.
func CalculateFuzzyScore(str1, str2 string) int {
	norm1 := NormalizeInvoiceNumber(str1)
	norm2 := NormalizeInvoiceNumber(str2)

	if norm1 == norm2 {
		return 100
	}
	if norm1 == "" || norm2 == "" {
		return 0
	}

	// Substring containment check
	if strings.Contains(norm1, norm2) || strings.Contains(norm2, norm1) {
		minLen := float64(min(len(norm1), len(norm2)))
		maxLen := float64(max(len(norm1), len(norm2)))
		ratio := minLen / maxLen
		score := int(math.Round(75.0 + ratio*20.0))
		if score > 100 {
			score = 100
		}
		return score
	}

	// Levenshtein distance calculation with single-row memory optimization
	m := len(norm1)
	n := len(norm2)

	// Keep previous row and current row to avoid 2D slice overhead
	prev := make([]int, n+1)
	curr := make([]int, n+1)

	for j := 0; j <= n; j++ {
		prev[j] = j
	}

	for i := 1; i <= m; i++ {
		curr[0] = i
		r1 := norm1[i-1]
		for j := 1; j <= n; j++ {
			r2 := norm2[j-1]
			if r1 == r2 {
				curr[j] = prev[j-1]
			} else {
				insertOp := curr[j-1]
				deleteOp := prev[j]
				replaceOp := prev[j-1]
				curr[j] = 1 + min(insertOp, min(deleteOp, replaceOp))
			}
		}
		copy(prev, curr)
	}

	distance := prev[n]
	maxLen := float64(max(m, n))
	similarity := math.Max(0.0, 1.0-float64(distance)/maxLen)

	return int(math.Round(similarity * 100.0))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
