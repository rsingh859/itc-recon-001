import { DealershipProfile, ReconciledRecord } from '../types';
import { SalesInvoiceItem } from '../data/salesInvoicesData';

/**
 * Global Cross-MFE Event Map
 */
export interface MFEEventMap {
  'TENANT_CHANGED': {
    dealership: DealershipProfile;
    activeGstin: string;
  };
  'RECON_COMPLETED': {
    dealershipId: string;
    gstin: string;
    totalRecords: number;
    matchedTax: number;
    atRiskTax: number;
  };
  'MATCH_OVERRIDDEN': {
    recordId: string;
    action: string;
    vendorStatus?: string;
  };
  'IRN_GENERATED': {
    invoiceId: string;
    irnNumber: string;
    ackNumber: string;
  };
  'NOTICE_DISPATCHED': {
    recordId: string;
    channel: 'WHATSAPP' | 'EMAIL';
    vendorName: string;
  };
  'NAVIGATE_TAB': {
    tabId: string;
  };
  'NOTIFICATION_TOAST': {
    message: string;
    type?: 'success' | 'warning' | 'info';
  };
}

export type MFEEventType = keyof MFEEventMap;

/**
 * Standard Props for Remote Micro Frontend Workspaces
 */
export interface RemoteMFEProps {
  dealership: DealershipProfile;
  activeGstin: string;
  period: string;
  onNavigateTab?: (tabId: string) => void;
  onShowToast?: (message: string) => void;
}

export interface ReconMFEProps extends RemoteMFEProps {
  records: ReconciledRecord[];
  onOpenNoticeModal: (record: ReconciledRecord) => void;
  onToggleHoldPayment: (recordId: string) => void;
  onApproveRecord: (recordId: string) => void;
}

export interface SalesMFEProps extends RemoteMFEProps {
  invoices?: SalesInvoiceItem[];
}

export interface ComplianceMFEProps extends RemoteMFEProps {
  records: ReconciledRecord[];
  activeSubTab?: 'daily-hub' | 'oem-tracker' | 'gstr3b-summary';
  onOpenNoticeModal?: (record: ReconciledRecord) => void;
}
