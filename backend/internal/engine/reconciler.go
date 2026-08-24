package engine

import (
	"fmt"
	"math"
	"strings"

	"github.com/autotax/backend/internal/domain"
)

// Reconcile performs the full 7-tier GST reconciliation between ERP Purchase Register and GSTR-2B
func Reconcile(
	purchaseRegister []domain.PurchaseRegisterItem,
	gstr2bList []domain.Gstr2BItem,
	tolerance float64,
) []domain.ReconciledRecord {
	if tolerance <= 0 {
		tolerance = 10.0 // Default ₹10 INR tolerance
	}

	results := make([]domain.ReconciledRecord, 0, len(purchaseRegister)+len(gstr2bList))
	matched2BMap := make(map[string]bool, len(gstr2bList))

	// Fast index: Map from (GSTIN_PAN_PREFIX + "|" + NormalizedInvoiceNo) -> []Gstr2BItem
	exactIndex := make(map[string][]*domain.Gstr2BItem, len(gstr2bList))
	// Secondary index by GSTIN prefix for fast candidate bucket retrieval during fuzzy matching
	gstinBucket := make(map[string][]*domain.Gstr2BItem, len(gstr2bList))

	for i := range gstr2bList {
		item := &gstr2bList[i]
		gstinPrefix := ExtractGSTINPrefix(item.SupplierGSTIN)
		normInv := NormalizeInvoiceNumber(item.InvoiceNo)
		key := gstinPrefix + "|" + normInv

		exactIndex[key] = append(exactIndex[key], item)
		gstinBucket[gstinPrefix] = append(gstinBucket[gstinPrefix], item)
	}

	// 1. Process each Purchase Register record
	for _, pr := range purchaseRegister {
		prCopy := pr
		isOEM := isOEMVendor(pr.VendorName, pr.Category)

		// Rule 37 Check: Unpaid for 180+ days
		if pr.PaymentStatus == "UNPAID" && pr.DaysOutstanding > 180 {
			results = append(results, domain.ReconciledRecord{
				ID:                fmt.Sprintf("REC-PR-%s", pr.ID),
				MatchStatus:       domain.MatchRule37Risk,
				MatchScore:        100,
				PRItem:            &prCopy,
				TaxDifference:     0,
				TaxableDifference: 0,
				Notes: []string{
					fmt.Sprintf("Rule 37 Warning: Vendor invoice is unpaid for %d days (>180 days limit).", pr.DaysOutstanding),
					"Mandatory statutory reversal required in GSTR-3B Table 4(B)(2) with 18% annual interest under Section 50.",
				},
				ActionRecommended: "REVERSE_RULE_37",
				IsOEMItem:         isOEM,
			})
			continue
		}

		// Section 17(5) Blocked ITC Check
		if pr.Category == domain.CatStaffWelfare {
			results = append(results, domain.ReconciledRecord{
				ID:                fmt.Sprintf("REC-PR-%s", pr.ID),
				MatchStatus:       domain.MatchBlocked175,
				MatchScore:        100,
				PRItem:            &prCopy,
				TaxDifference:     0,
				TaxableDifference: 0,
				Notes: []string{
					"Blocked ITC under Section 17(5)(b)(i) of CGST Act (Food, beverage, catering, staff welfare).",
					"Must be reported under GSTR-3B Table 4(D)(1) Ineligible ITC.",
				},
				ActionRecommended: "MANUAL_OVERRIDE",
				IsOEMItem:         isOEM,
			})
			continue
		}

		// Search for Best Match in GSTR-2B
		var bestMatch *domain.Gstr2BItem
		bestScore := 0

		gstinPrefix := ExtractGSTINPrefix(pr.VendorGSTIN)
		normPRInv := NormalizeInvoiceNumber(pr.InvoiceNo)
		exactKey := gstinPrefix + "|" + normPRInv

		// Step A: Check exact hash index
		if candidates, ok := exactIndex[exactKey]; ok {
			for _, cand := range candidates {
				if !matched2BMap[cand.ID] {
					bestMatch = cand
					bestScore = 100
					break
				}
			}
		}

		// Step B: If no exact match, search within the GSTIN bucket for fuzzy candidate
		if bestMatch == nil {
			if candidates, ok := gstinBucket[gstinPrefix]; ok {
				for _, cand := range candidates {
					if matched2BMap[cand.ID] {
						continue
					}

					// Raw invoice string exact match
					if cand.InvoiceNo == pr.InvoiceNo {
						bestMatch = cand
						bestScore = 100
						break
					}

					score := CalculateFuzzyScore(cand.InvoiceNo, pr.InvoiceNo)
					if score > bestScore && score >= 70 {
						bestMatch = cand
						bestScore = score
					}
				}
			}
		}

		// Process match outcome
		if bestMatch != nil {
			matched2BMap[bestMatch.ID] = true
			b2Copy := *bestMatch

			taxDiff := math.Abs(pr.TotalTax - bestMatch.TotalTax)
			taxableDiff := math.Abs(pr.TaxableValue - bestMatch.TaxableValue)

			status := domain.MatchExact
			var notes []string
			action := "APPROVE_FOR_3B"

			if pr.Category == domain.CatOEMSchemeIncentive || bestMatch.InvoiceType == "CDNR" {
				status = domain.MatchOEMPending
				notes = append(notes, "OEM Scheme Incentive / Tax Credit Note successfully matched against DMS scheme ledger.")
				action = "APPROVE_FOR_3B"
			} else if bestScore == 100 && taxDiff <= tolerance {
				status = domain.MatchExact
				notes = append(notes, "Perfect match: Invoice No, Vendor GSTIN, and Tax Values match perfectly within tolerance.")
				action = "APPROVE_FOR_3B"
			} else if bestScore < 100 && taxDiff <= tolerance {
				status = domain.MatchFuzzy
				notes = append(notes, fmt.Sprintf("Syntax variance resolved (DMS: \"%s\" vs 2B: \"%s\"). Match confidence: %d%%.", pr.InvoiceNo, bestMatch.InvoiceNo, bestScore))
				action = "APPROVE_FOR_3B"
			} else if taxDiff > tolerance {
				status = domain.MatchValueMismatch
				notes = append(notes, fmt.Sprintf("Tax mismatch detected: DMS books ₹%.2f vs GSTR-2B ₹%.2f (Diff: ₹%.2f).", pr.TotalTax, bestMatch.TotalTax, taxDiff))
				action = "HOLD_PAYMENT"
			}

			if bestMatch.ITCAvailability == "N" {
				reason := bestMatch.ITCReason
				if reason == "" {
					reason = "Unspecified statutory restriction"
				}
				notes = append(notes, fmt.Sprintf("GSTR-2B flag marked ITC Ineligible by supplier: %s", reason))
				action = "HOLD_PAYMENT"
			}

			results = append(results, domain.ReconciledRecord{
				ID:                 fmt.Sprintf("REC-PR-%s", pr.ID),
				MatchStatus:        status,
				MatchScore:         bestScore,
				PRItem:             &prCopy,
				GSTR2BItem:         &b2Copy,
				TaxDifference:      taxDiff,
				TaxableDifference:  taxableDiff,
				Notes:              notes,
				ActionRecommended:  action,
				VendorActionStatus: "NOT_NOTIFIED",
				IsOEMItem:          isOEM,
			})
		} else {
			// Missing in GSTR-2B
			results = append(results, domain.ReconciledRecord{
				ID:                fmt.Sprintf("REC-PR-%s", pr.ID),
				MatchStatus:       domain.MatchMissingIn2B,
				MatchScore:        0,
				PRItem:            &prCopy,
				TaxDifference:     pr.TotalTax,
				TaxableDifference: pr.TaxableValue,
				Notes: []string{
					"CRITICAL ITC RISK: Supplier has NOT uploaded invoice in GSTR-1 for this tax period.",
					"ITC is not claimable under Section 16(2)(aa) of CGST Act. Dealer cash flow at risk.",
					"Hold vendor pending payment and issue auto-notice via WhatsApp/Email.",
				},
				ActionRecommended:  "HOLD_PAYMENT",
				VendorActionStatus: "NOT_NOTIFIED",
				IsOEMItem:          isOEM,
			})
		}
	}

	// 2. Process GSTR-2B records NOT matched in Purchase Register (Missing in PR)
	for i := range gstr2bList {
		b2 := &gstr2bList[i]
		if !matched2BMap[b2.ID] {
			b2Copy := *b2
			isOEM := strings.Contains(strings.ToLower(b2.SupplierName), "maruti") ||
				strings.Contains(strings.ToLower(b2.SupplierName), "tata") ||
				strings.Contains(strings.ToLower(b2.SupplierName), "hyundai")

			results = append(results, domain.ReconciledRecord{
				ID:                fmt.Sprintf("REC-2B-%s", b2.ID),
				MatchStatus:       domain.MatchMissingInPR,
				MatchScore:        0,
				GSTR2BItem:        &b2Copy,
				TaxDifference:     b2.TotalTax,
				TaxableDifference: b2.TaxableValue,
				Notes: []string{
					"CASH FLOW OPPORTUNITY: Invoice present in GSTR-2B but unbooked in Dealership DMS.",
					fmt.Sprintf("Supplier %s filed tax of ₹%.2f. Book voucher in DMS to claim ITC.", b2.SupplierName, b2.TotalTax),
				},
				ActionRecommended: "CLAIM_IN_NEXT_MONTH",
				IsOEMItem:         isOEM,
			})
		}
	}

	return results
}

// GenerateSummary aggregates metrics from reconciled records
func GenerateSummary(records []domain.ReconciledRecord) domain.ReconSummary {
	var summary domain.ReconSummary
	summary.TotalRecordsCount = len(records)

	for _, r := range records {
		if r.PRItem != nil {
			summary.TotalPRTax += r.PRItem.TotalTax
		}
		if r.GSTR2BItem != nil {
			summary.Total2BTax += r.GSTR2BItem.TotalTax
		}

		switch r.MatchStatus {
		case domain.MatchExact:
			summary.ExactMatchCount++
			if r.GSTR2BItem != nil {
				summary.MatchedTax += r.GSTR2BItem.TotalTax
			}
		case domain.MatchFuzzy:
			summary.FuzzyMatchCount++
			if r.GSTR2BItem != nil {
				summary.MatchedTax += r.GSTR2BItem.TotalTax
			}
		case domain.MatchOEMPending:
			summary.OEMCreditPending++
			if r.GSTR2BItem != nil {
				summary.MatchedTax += r.GSTR2BItem.TotalTax
			}
		case domain.MatchValueMismatch, domain.MatchDateMismatch:
			summary.MismatchCount++
			if r.PRItem != nil {
				summary.AtRiskTax += r.PRItem.TotalTax
			}
		case domain.MatchMissingIn2B:
			summary.Missing2BCount++
			if r.PRItem != nil {
				summary.AtRiskTax += r.PRItem.TotalTax
			}
		case domain.MatchMissingInPR:
			summary.MissingPRCount++
		case domain.MatchRule37Risk:
			summary.Rule37Count++
			if r.PRItem != nil {
				summary.Rule37Tax += r.PRItem.TotalTax
			}
		case domain.MatchBlocked175:
			summary.Blocked175Count++
			if r.PRItem != nil {
				summary.Blocked175Tax += r.PRItem.TotalTax
			}
		}
	}

	return summary
}

// ComputeGSTR3BTable4 calculates Section 16/17 return values
func ComputeGSTR3BTable4(records []domain.ReconciledRecord, period, gstin string) domain.GSTR3BTable4Summary {
	var summary domain.GSTR3BTable4Summary
	summary.Period = period
	summary.DealershipGSTIN = gstin

	for _, r := range records {
		tax := 0.0
		if r.GSTR2BItem != nil {
			tax = r.GSTR2BItem.TotalTax
		} else if r.PRItem != nil {
			tax = r.PRItem.TotalTax
		}

		switch r.MatchStatus {
		case domain.MatchExact, domain.MatchFuzzy, domain.MatchOEMPending:
			summary.Table4A5AllOtherITC += tax
			summary.EligibleRecordCount++
		case domain.MatchRule37Risk:
			summary.Table4A5AllOtherITC += tax
			summary.Table4B2Rule37Reversal += tax
			summary.Rule37RecordCount++
		case domain.MatchBlocked175:
			summary.Table4D1BlockedSection += tax
			summary.Blocked175RecordCount++
		}
	}

	summary.Table4CNetITC = summary.Table4A5AllOtherITC - summary.Table4B2Rule37Reversal
	return summary
}

func isOEMVendor(vendorName string, cat domain.DealershipCategory) bool {
	vn := strings.ToLower(vendorName)
	return strings.Contains(vn, "maruti") ||
		strings.Contains(vn, "tata") ||
		strings.Contains(vn, "hyundai") ||
		cat == domain.CatOEMVehicle ||
		cat == domain.CatOEMSchemeIncentive
}
