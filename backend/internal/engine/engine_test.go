package engine

import (
	"fmt"
	"testing"

	"github.com/autotax/backend/internal/domain"
)

func TestNormalizeInvoiceNumber(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"INV/2026/00942", "INV202600942"},
		{"MSIL/SPR/26-27/4120", "MSILSPR26274120"},
		{"000012345", "12345"},
		{"", ""},
		{"000", "0"},
	}

	for _, tt := range tests {
		got := NormalizeInvoiceNumber(tt.input)
		if got != tt.expected {
			t.Errorf("NormalizeInvoiceNumber(%q) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}

func TestCalculateFuzzyScore(t *testing.T) {
	tests := []struct {
		str1     string
		str2     string
		minScore int
	}{
		{"INV/2026/0942", "INV-2026-0942", 100},
		{"MSIL/SPR/26-27/4120", "MSIL-SPR-2627-4120", 100},
		{"INV/2026/00942", "INV-2026-0942", 85},
		{"INV/942", "INV/943", 70},
		{"COMPLETELY_DIFFERENT", "UNRELATED", 0},
	}

	for _, tt := range tests {
		score := CalculateFuzzyScore(tt.str1, tt.str2)
		if score < tt.minScore {
			t.Errorf("CalculateFuzzyScore(%q, %q) = %d; want >= %d", tt.str1, tt.str2, score, tt.minScore)
		}
	}
}

func TestReconciliationEngine(t *testing.T) {
	pr := []domain.PurchaseRegisterItem{
		{
			ID:              "PR-1",
			InvoiceNo:       "MSIL/2026/001",
			VendorGSTIN:     "06AAACM1234H1Z1",
			VendorName:      "Maruti Suzuki India Limited",
			Category:        domain.CatOEMVehicle,
			TotalTax:        100000,
			TaxableValue:    500000,
			PaymentStatus:   "PAID",
			DaysOutstanding: 10,
			IsEligibleITC:   true,
		},
		{
			ID:              "PR-2-RULE37",
			InvoiceNo:       "VND/2026/099",
			VendorGSTIN:     "07AABCS9999K1Z5",
			VendorName:      "Old Unpaid Vendor",
			Category:        domain.CatSpareParts,
			TotalTax:        50000,
			TaxableValue:    250000,
			PaymentStatus:   "UNPAID",
			DaysOutstanding: 195,
			IsEligibleITC:   true,
		},
		{
			ID:              "PR-3-BLOCKED",
			InvoiceNo:       "CAT/2026/101",
			VendorGSTIN:     "07AABCC1111K1Z3",
			VendorName:      "Hotel Staff Catering",
			Category:        domain.CatStaffWelfare,
			TotalTax:        18000,
			TaxableValue:    100000,
			PaymentStatus:   "PAID",
			DaysOutstanding: 5,
			IsEligibleITC:   false,
		},
	}

	gstr2b := []domain.Gstr2BItem{
		{
			ID:              "2B-1",
			InvoiceNo:       "MSIL-2026-001",
			SupplierGSTIN:   "06AAACM1234H1Z1",
			SupplierName:    "Maruti Suzuki India Limited",
			InvoiceType:     "B2B",
			TotalTax:        100000,
			TaxableValue:    500000,
			ITCAvailability: "Y",
		},
		{
			ID:              "2B-2-ORPHAN",
			InvoiceNo:       "ORPHAN/2026/500",
			SupplierGSTIN:   "07AABCO5555K1Z2",
			SupplierName:    "Unbooked Vendor In 2B",
			InvoiceType:     "B2B",
			TotalTax:        25000,
			TaxableValue:    150000,
			ITCAvailability: "Y",
		},
	}

	results := Reconcile(pr, gstr2b, 10.0)

	if len(results) != 4 {
		t.Fatalf("Expected 4 results (3 PR + 1 missing in PR), got %d", len(results))
	}

	summary := GenerateSummary(results)
	if summary.ExactMatchCount != 1 {
		t.Errorf("Expected 1 exact match, got %d", summary.ExactMatchCount)
	}
	if summary.Rule37Count != 1 {
		t.Errorf("Expected 1 Rule 37 risk, got %d", summary.Rule37Count)
	}
	if summary.Blocked175Count != 1 {
		t.Errorf("Expected 1 Blocked 17(5), got %d", summary.Blocked175Count)
	}
	if summary.MissingPRCount != 1 {
		t.Errorf("Expected 1 Missing in PR, got %d", summary.MissingPRCount)
	}
}

func BenchmarkReconciliationEngine(b *testing.B) {
	const N = 5000
	prs := make([]domain.PurchaseRegisterItem, N)
	b2s := make([]domain.Gstr2BItem, N)

	for i := 0; i < N; i++ {
		prs[i] = domain.PurchaseRegisterItem{
			ID:              fmt.Sprintf("PR-%d", i),
			InvoiceNo:       fmt.Sprintf("INV/2026/%05d", i),
			VendorGSTIN:     fmt.Sprintf("07AABCV%04dK1Z%d", i%1000, i%10),
			VendorName:      "Vendor Automotive Ltd",
			Category:        domain.CatSpareParts,
			TotalTax:        float64(1000 + i),
			TaxableValue:    float64(5000 + i*5),
			PaymentStatus:   "PAID",
			DaysOutstanding: 15,
			IsEligibleITC:   true,
		}

		b2s[i] = domain.Gstr2BItem{
			ID:              fmt.Sprintf("2B-%d", i),
			InvoiceNo:       fmt.Sprintf("INV-2026-%05d", i),
			SupplierGSTIN:   fmt.Sprintf("07AABCV%04dK1Z%d", i%1000, i%10),
			SupplierName:    "Vendor Automotive Ltd",
			InvoiceType:     "B2B",
			TotalTax:        float64(1000 + i),
			TaxableValue:    float64(5000 + i*5),
			ITCAvailability: "Y",
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = Reconcile(prs, b2s, 10.0)
	}
}
