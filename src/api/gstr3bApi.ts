import { apiClient } from './client';

export interface GSTR3BTable4Summary {
  period?: string;
  dealershipGstin?: string;
  table4A1ImportGoods?: number;
  table4A5AllOtherITC: number;
  table4B1PermanentRev?: number;
  table4B2Rule37Reversal: number;
  table4CNetITC: number;
  table4D1BlockedSection: number;
}

export const gstr3bApi = {
  async getTable4Summary(period?: string): Promise<GSTR3BTable4Summary | null> {
    try {
      const res = await apiClient.get<GSTR3BTable4Summary>('/gstr3b/summary', { period });
      return res.data;
    } catch {
      return null;
    }
  },

  async exportJSON(period?: string): Promise<any> {
    try {
      const res = await apiClient.get('/gstr3b/export', { period });
      return res.data;
    } catch {
      return null;
    }
  },
};
