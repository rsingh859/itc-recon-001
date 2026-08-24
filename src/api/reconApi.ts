import { apiClient } from './client';
import { ReconciledRecord, PurchaseRegisterItem, Gstr2BItem } from '../types';
import { MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B } from '../data/mockDealershipData';
import { runReconciliation } from '../utils/reconciliationEngine';

export interface ReconRunResponse {
  records: ReconciledRecord[];
  summary: any;
  totalCount: number;
}

export const reconApi = {
  async runReconciliation(
    purchaseRegister?: PurchaseRegisterItem[],
    gstr2bList?: Gstr2BItem[],
    tolerance: number = 10
  ): Promise<ReconciledRecord[]> {
    try {
      const res = await apiClient.post<ReconRunResponse>('/recon/run', {
        purchaseRegister,
        gstr2bList,
        tolerance,
      });
      return res.data?.records || [];
    } catch {
      // Graceful offline fallback
      return runReconciliation(
        purchaseRegister || MOCK_PURCHASE_REGISTER,
        gstr2bList || MOCK_GSTR_2B,
        tolerance
      );
    }
  },

  async getRecords(params?: {
    status?: string;
    category?: string;
    q?: string;
  }): Promise<ReconciledRecord[]> {
    try {
      const res = await apiClient.get<ReconciledRecord[]>('/recon/records', params);
      return res.data || [];
    } catch {
      // Local filter fallback
      let results = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
      if (params?.status && params.status !== 'ALL') {
        results = results.filter((r) => r.matchStatus === params.status);
      }
      return results;
    }
  },

  async overrideRecord(
    recordId: string,
    actionRecommended?: string,
    vendorActionStatus?: string
  ): Promise<boolean> {
    try {
      await apiClient.post('/recon/override', {
        recordId,
        actionRecommended,
        vendorActionStatus,
      });
      return true;
    } catch {
      return true; // Local update handled in React state
    }
  },

  async syncGSP(): Promise<any> {
    try {
      const res = await apiClient.post('/ingest/sync');
      return res.data;
    } catch {
      return { status: 'COMPLETED_OFFLINE' };
    }
  },
};
