import { PurchaseRegisterItem, Gstr2BItem, ReconciledRecord, MatchStatus } from '../types';

export function normalizeInvoiceNumber(inv: string): string {
  if (!inv) return '';
  return inv
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // remove slashes, dashes, dots, spaces
    .replace(/^0+/, ''); // remove leading zeroes
}

export function calculateFuzzyScore(str1: string, str2: string): number {
  const norm1 = normalizeInvoiceNumber(str1);
  const norm2 = normalizeInvoiceNumber(str2);

  if (norm1 === norm2) return 100;
  if (!norm1 || !norm2) return 0;

  // Check if one is a substring of another
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const ratio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    return Math.round(75 + ratio * 20);
  }

  // Levenshtein distance calculation
  const m = norm1.length;
  const n = norm2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[m][n];
  const maxLength = Math.max(m, n);
  const similarity = Math.max(0, 1 - distance / maxLength);
  return Math.round(similarity * 100);
}

export function runReconciliation(
  purchaseRegister: PurchaseRegisterItem[],
  gstr2bList: Gstr2BItem[],
  tolerance: number = 10 // INR rounding tolerance
): ReconciledRecord[] {
  const results: ReconciledRecord[] = [];
  const matched2BIds = new Set<string>();

  // 1. Process each Purchase Register record
  for (const pr of purchaseRegister) {
    const isOem = pr.vendorName.toLowerCase().includes('maruti') || 
                  pr.vendorName.toLowerCase().includes('tata') || 
                  pr.vendorName.toLowerCase().includes('hyundai') ||
                  pr.category === 'OEM_VEHICLE' ||
                  pr.category === 'OEM_SCHEME_INCENTIVE';

    // Check Rule 37 condition (180+ days unpaid)
    if (pr.paymentStatus === 'UNPAID' && pr.daysOutstanding > 180) {
      results.push({
        id: `REC-PR-${pr.id}`,
        matchStatus: 'RULE_37_RISK',
        matchScore: 100,
        prItem: pr,
        taxDifference: 0,
        taxableDifference: 0,
        notes: [
          `Rule 37 Warning: Vendor invoice is unpaid for ${pr.daysOutstanding} days (>180 days limit).`,
          'Mandatory statutory reversal required in GSTR-3B Table 4(B)(2) with 18% annual interest under Section 50.',
        ],
        actionRecommended: 'REVERSE_RULE_37',
        isOemItem: isOem,
      });
      continue;
    }

    // Check Section 17(5) Blocked ITC condition
    if (pr.category === 'STAFF_WELFARE') {
      results.push({
        id: `REC-PR-${pr.id}`,
        matchStatus: 'BLOCKED_17_5',
        matchScore: 100,
        prItem: pr,
        taxDifference: 0,
        taxableDifference: 0,
        notes: [
          'Blocked ITC under Section 17(5)(b)(i) of CGST Act (Food, beverage, catering).',
          'Must be reported under GSTR-3B Table 4(D)(1) Ineligible ITC.',
        ],
        actionRecommended: 'MANUAL_OVERRIDE',
        isOemItem: isOem,
      });
      continue;
    }

    // Attempt to match against GSTR-2B
    let bestMatch: Gstr2BItem | null = null;
    let bestScore = 0;

    for (const b2 of gstr2bList) {
      if (matched2BIds.has(b2.id)) continue;

      // Check GSTIN alignment (Allow OEM subsidiary GSTINs or match vendor GSTIN)
      const gstinMatch = b2.supplierGstin.slice(0, 10) === pr.vendorGstin.slice(0, 10);
      if (!gstinMatch) continue;

      // Exact Invoice Match
      if (b2.invoiceNo === pr.invoiceNo) {
        bestMatch = b2;
        bestScore = 100;
        break;
      }

      // Fuzzy Normalized Match
      const fuzzyScore = calculateFuzzyScore(b2.invoiceNo, pr.invoiceNo);
      if (fuzzyScore > bestScore && fuzzyScore >= 70) {
        bestMatch = b2;
        bestScore = fuzzyScore;
      }
    }

    if (bestMatch) {
      matched2BIds.add(bestMatch.id);
      const taxDiff = Math.abs(pr.totalTax - bestMatch.totalTax);
      const taxableDiff = Math.abs(pr.taxableValue - bestMatch.taxableValue);

      let status: MatchStatus = 'EXACT_MATCH';
      const notes: string[] = [];
      let action: ReconciledRecord['actionRecommended'] = 'APPROVE_FOR_3B';

      if (pr.category === 'OEM_SCHEME_INCENTIVE' || bestMatch.invoiceType === 'CDNR') {
        status = 'OEM_CREDIT_PENDING';
        notes.push('OEM Scheme Incentive / Tax Credit Note successfully matched against DMS scheme ledger.');
        action = 'APPROVE_FOR_3B';
      } else if (bestScore === 100 && taxDiff <= tolerance) {
        status = 'EXACT_MATCH';
        notes.push('Perfect match: Invoice No, Vendor GSTIN, and Tax Values match perfectly within tolerance.');
        action = 'APPROVE_FOR_3B';
      } else if (bestScore < 100 && taxDiff <= tolerance) {
        status = 'FUZZY_MATCH';
        notes.push(`Syntax variance resolved (DMS: "${pr.invoiceNo}" vs 2B: "${bestMatch.invoiceNo}"). Match confidence: ${bestScore}%.`);
        action = 'APPROVE_FOR_3B';
      } else if (taxDiff > tolerance) {
        status = 'VALUE_MISMATCH';
        notes.push(`Tax mismatch detected: DMS books ₹${pr.totalTax.toLocaleString('en-IN')} vs GSTR-2B ₹${bestMatch.totalTax.toLocaleString('en-IN')} (Diff: ₹${taxDiff.toLocaleString('en-IN')}).`);
        action = 'HOLD_PAYMENT';
      }

      if (bestMatch.itcAvailability === 'N') {
        notes.push(`GSTR-2B flag marked ITC Ineligible by supplier: ${bestMatch.itcReason || 'Unspecified reason'}`);
        action = 'HOLD_PAYMENT';
      }

      results.push({
        id: `REC-PR-${pr.id}`,
        matchStatus: status,
        matchScore: bestScore,
        prItem: pr,
        gstr2bItem: bestMatch,
        taxDifference: taxDiff,
        taxableDifference: taxableDiff,
        notes,
        actionRecommended: action,
        isOemItem: isOem,
      });
    } else {
      // Missing in GSTR-2B
      results.push({
        id: `REC-PR-${pr.id}`,
        matchStatus: 'MISSING_IN_2B',
        matchScore: 0,
        prItem: pr,
        taxDifference: pr.totalTax,
        taxableDifference: pr.taxableValue,
        notes: [
          'CRITICAL ITC RISK: Supplier has NOT uploaded invoice in GSTR-1 for this tax period.',
          'ITC is not claimable under Section 16(2)(aa) of CGST Act. Dealer cash flow at risk.',
          'Hold vendor pending payment and issue auto-notice via WhatsApp/Email.',
        ],
        actionRecommended: 'HOLD_PAYMENT',
        vendorActionStatus: 'NOT_NOTIFIED',
        isOemItem: isOem,
      });
    }
  }

  // 2. Process GSTR-2B items that were NOT found in Purchase Register
  for (const b2 of gstr2bList) {
    if (!matched2BIds.has(b2.id)) {
      results.push({
        id: `REC-2B-${b2.id}`,
        matchStatus: 'MISSING_IN_PR',
        matchScore: 0,
        gstr2bItem: b2,
        taxDifference: b2.totalTax,
        taxableDifference: b2.taxableValue,
        notes: [
          'CASH FLOW OPPORTUNITY: Invoice present in GSTR-2B but unbooked in Dealership DMS.',
          `Supplier ${b2.supplierName} filed tax of ₹${b2.totalTax.toLocaleString('en-IN')}. Book voucher in DMS to claim ITC.`,
        ],
        actionRecommended: 'CLAIM_IN_NEXT_MONTH',
        isOemItem: b2.supplierName.toLowerCase().includes('maruti') || b2.supplierName.toLowerCase().includes('tata'),
      });
    }
  }

  return results;
}
