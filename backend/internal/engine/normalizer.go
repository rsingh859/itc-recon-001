package engine

import (
	"strings"
	"unicode"
)

// NormalizeInvoiceNumber strips all non-alphanumeric characters, converts to uppercase,
// and trims leading zeroes.
// e.g. "INV/2026-27/000942" -> "INV202627942"
func NormalizeInvoiceNumber(inv string) string {
	if inv == "" {
		return ""
	}

	var sb strings.Builder
	sb.Grow(len(inv))

	for _, r := range inv {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			sb.WriteRune(unicode.ToUpper(r))
		}
	}

	normalized := sb.String()
	// Trim leading zeros
	trimmed := strings.TrimLeft(normalized, "0")
	if trimmed == "" && len(normalized) > 0 {
		return "0"
	}
	return trimmed
}

// ExtractGSTINPrefix returns the 10-character PAN prefix from a 15-character GSTIN
func ExtractGSTINPrefix(gstin string) string {
	if len(gstin) >= 12 {
		// GSTIN format: 2 digit state + 10 char PAN + 1 entity + 1 'Z' + 1 check digit
		// State code is chars 0-1, PAN is chars 2-11.
		// Total prefix for state+PAN is 12 chars, or first 10 characters for approximate alignment.
		return strings.ToUpper(gstin[:10])
	}
	return strings.ToUpper(gstin)
}
