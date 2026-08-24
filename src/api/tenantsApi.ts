import { apiClient } from './client';
import { DealershipProfile } from '../types';
import { DEALERSHIP_PROFILES } from '../data/mockDealershipData';

export const tenantsApi = {
  async getDealerships(): Promise<DealershipProfile[]> {
    try {
      const res = await apiClient.get<DealershipProfile[]>('/tenants/dealerships');
      return res.data || DEALERSHIP_PROFILES;
    } catch {
      return DEALERSHIP_PROFILES;
    }
  },

  async getDealership(id: string): Promise<DealershipProfile> {
    try {
      const res = await apiClient.get<DealershipProfile>(`/tenants/dealerships/${id}`);
      return res.data || DEALERSHIP_PROFILES[0];
    } catch {
      return DEALERSHIP_PROFILES.find((d) => d.id === id) || DEALERSHIP_PROFILES[0];
    }
  },
};
