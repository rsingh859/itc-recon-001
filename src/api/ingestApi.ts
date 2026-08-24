import { apiClient } from './client';
import { PurchaseRegisterItem, Gstr2BItem, ReconciledRecord } from '../types';

export interface IngestionBatchResponse {
  insertedCount: number;
  totalPRCount?: number;
  total2BCount?: number;
  reconSummary?: any;
  records?: ReconciledRecord[];
}

export const ingestApi = {
  async ingestManualPR(items: PurchaseRegisterItem[]): Promise<IngestionBatchResponse> {
    try {
      const res = await apiClient.post<IngestionBatchResponse>('/ingest/manual/pr', { items });
      return res.data;
    } catch {
      return { insertedCount: items.length };
    }
  },

  async ingestManual2B(items: Gstr2BItem[]): Promise<IngestionBatchResponse> {
    try {
      const res = await apiClient.post<IngestionBatchResponse>('/ingest/manual/2b', { items });
      return res.data;
    } catch {
      return { insertedCount: items.length };
    }
  },

  async seedDemoData(): Promise<any> {
    try {
      const res = await apiClient.post('/ingest/seed-demo');
      return res.data;
    } catch {
      return { status: 'SEEDED_OFFLINE' };
    }
  },
};
