import { apiClient } from './client';
import { OEMScheme } from '../types';
import { OEM_SCHEMES_MOCK } from '../data/mockDealershipData';

export const oemApi = {
  async getSchemes(): Promise<OEMScheme[]> {
    try {
      const res = await apiClient.get<{ schemes: OEMScheme[] }>('/oem/schemes');
      return res.data?.schemes || OEM_SCHEMES_MOCK;
    } catch {
      return OEM_SCHEMES_MOCK;
    }
  },

  async triggerAudit(): Promise<any> {
    try {
      const res = await apiClient.post('/oem/audit');
      return res.data;
    } catch {
      return { status: 'COMPLETED_OFFLINE' };
    }
  },
};
