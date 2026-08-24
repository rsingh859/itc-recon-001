export type MatchStatus =
  | 'EXACT_MATCH'
  | 'FUZZY_MATCH'
  | 'VALUE_MISMATCH'
  | 'DATE_MISMATCH'
  | 'MISSING_IN_2B'
  | 'MISSING_IN_PR'
  | 'RULE_37_RISK'
  | 'BLOCKED_17_5'
  | 'OEM_CREDIT_PENDING';

export type DealershipCategory = 
  | 'OEM_VEHICLE'
  | 'SPARE_PARTS'
  | 'LUBRICANTS'
  | 'ACCESSORIES'
  | 'BODYSHOP_PAINT'
  | 'WORKSHOP_TOOLS'
  | 'TRANSPORTER_RCM'
  | 'INSURANCE_COMMISSION'
  | 'MARKETING_PROMOTION'
  | 'OEM_SCHEME_INCENTIVE'
  | 'STAFF_WELFARE'
  | 'DEMO_VEHICLE';

export interface PurchaseRegisterItem {
  id: string;
  internalVoucherNo: string;
  invoiceNo: string;
  invoiceDate: string;
  vendorGstin: string;
  vendorName: string;
  category: DealershipCategory;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  totalInvoiceValue: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  paymentDueDate?: string;
  daysOutstanding: number;
  isEligibleITC: boolean;
  ineligibilityReason?: string;
  branchName: string;
  gstin: string; // Dealership branch GSTIN
  oemSchemeRef?: string;
}

export interface Gstr2BItem {
  id: string;
  invoiceNo: string;
  invoiceType: 'B2B' | 'CDNR' | 'B2BA' | 'ISD' | 'IMPG' | 'RCM';
  invoiceDate: string;
  supplierGstin: string;
  supplierName: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  totalInvoiceValue: number;
  itcAvailability: 'Y' | 'N';
  itcReason?: string;
  filingPeriod: string; // e.g., 'July 2026'
  gstr1FilingDate: string;
  irnStatus?: 'GENERATED' | 'NOT_APPLICABLE' | 'CANCELLED';
  dealershipGstin: string;
}

export interface ReconciledRecord {
  id: string;
  matchStatus: MatchStatus;
  matchScore: number; // 0 to 100
  prItem?: PurchaseRegisterItem;
  gstr2bItem?: Gstr2BItem;
  taxDifference: number;
  taxableDifference: number;
  notes: string[];
  actionRecommended: 'APPROVE_FOR_3B' | 'HOLD_PAYMENT' | 'SEND_VENDOR_NOTICE' | 'REVERSE_RULE_37' | 'CLAIM_IN_NEXT_MONTH' | 'MANUAL_OVERRIDE';
  vendorActionStatus?: 'NOT_NOTIFIED' | 'WHATSAPP_SENT' | 'EMAIL_SENT' | 'PAYMENT_BLOCKED';
  isOemItem: boolean;
}

export interface DealershipProfile {
  id: string;
  groupName: string;
  brand: string;
  authorizedDealerFor: string;
  headquarters: string;
  branches: {
    gstin: string;
    state: string;
    city: string;
    type: 'SHOWROOM_AND_WORKSHOP' | 'NEXA_SHOWROOM' | 'ARENA_SHOWROOM' | 'TRUE_VALUE' | 'BODYSHOP_HUB';
  }[];
  activeGstin: string;
  monthlyInvoiceVolume: number;
  dmsSoftware: 'CDK_GLOBAL' | 'SAP_DMS' | 'AUTOLINE' | 'TALLY_PRIME' | 'MARUTI_EDMS' | 'TATA_MOTHER';
}

export interface OEMScheme {
  id: string;
  schemeName: string;
  circularNo: string;
  quarter: string;
  claimedAmount: number;
  oemPassedAmount: number;
  gstCreditLoss: number;
  status: 'RECONCILED' | 'SHORT_PASSED' | 'PENDING_OEM_CREDIT';
}

export interface ComplianceWorkflowStep {
  id: string;
  stepName: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'PENDING';
  automated: boolean;
  timestamp: string;
  details: string;
  sourceModule: 'DMS_INGEST' | 'VALIDATOR' | 'IRN_SERVICE' | 'EWB_SERVICE' | 'ERP_SYNC' | 'COMM_TRIGGER';
}

export interface ComplianceExceptionAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'GSTIN_MISMATCH' | 'IRN_FAILURE' | 'EWB_EXPIRED' | 'BLOCKED_ITC_17_5' | 'RULE_37_180D' | 'OEM_CLAIM_SHORT';
  title: string;
  description: string;
  impactAmount: number;
  affectedEntity: string;
  suggestedAction: string;
  autoResolutionAvailable: boolean;
  status: 'OPEN' | 'RESOLVED' | 'MUTED';
}

export interface ErpIntegrationConnector {
  id: string;
  name: string;
  erpType: 'TALLY_PRIME' | 'SAP_S4HANA' | 'ZOHO_BOOKS' | 'CDK_GLOBAL' | 'MARUTI_EDMS' | 'ORACLE_NETSUITE';
  icon: string;
  status: 'CONNECTED' | 'SYNCING' | 'CONFIG_REQUIRED' | 'DISABLED';
  syncMode: 'REALTIME_WEBHOOK' | 'SCHEDULED_BATCH_5M' | 'ON_PREMISE_AGENT';
  lastSyncTime: string;
  recordsSyncedToday: number;
  pendingPushCount: number;
  healthScore: number;
}

export interface ProviderAdapterConfig {
  providerId: 'VAYANA' | 'IRIS_GST' | 'MASTERS_INDIA' | 'DIRECT_GSTN';
  providerName: string;
  priority: number;
  status: 'ACTIVE' | 'HOT_STANDBY' | 'CIRCUIT_BROKEN';
  latencyMs: number;
  successRate24h: number;
  currentSessionTtl: string;
  isFailoverTarget: boolean;
}

export interface CopilotInsight {
  id: string;
  type: 'PREDICTIVE_FAILURE' | 'TAX_OPTIMIZATION' | 'AUDIT_SHIELD' | 'CASHFLOW_SAVINGS';
  headline: string;
  insight: string;
  financialImpact: number;
  recommendedCommand: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: 'FINANCE_DIRECTOR' | 'TAX_ACCOUNTANT' | 'AUDITOR' | 'STORE_MANAGER';
  authProvider: 'LOCAL' | 'GOOGLE' | 'MICROSOFT';
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  dealership?: DealershipProfile;
  tenantId: string;
  activeGstin: string;
}

export interface ExtractedInvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  supplierGstin: string;
  supplierName: string;
  buyerGstin: string;
  category: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  totalAmount: number;
  confidenceScore: number;
  rawTextSnippet?: string;
}

export interface DocumentUpload {
  id: string;
  tenantId: string;
  branchGstin: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  storagePath: string;
  sha256Hash: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedData?: ExtractedInvoiceData;
  uploadedBy?: string;
  createdAt: string;
}


