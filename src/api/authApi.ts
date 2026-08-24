import { apiClient } from './client';
import { AuthResponse, User, DealershipProfile } from '../types';
import { DEALERSHIP_PROFILES } from '../data/mockDealershipData';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      if (res.data?.token) {
        apiClient.setAuthToken(res.data.token);
      }
      return res.data;
    } catch {
      // Offline / dev fallback
      const user: User = {
        id: 'usr-local-01',
        tenantId: 'dms-01',
        email: email || 'demo@autotax.io',
        fullName: 'Vikramaditya Singhania',
        role: 'FINANCE_DIRECTOR',
        authProvider: 'LOCAL',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const dealership = DEALERSHIP_PROFILES[0];
      const fallbackResp: AuthResponse = {
        success: true,
        token: 'dev_mock_jwt_token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user,
        dealership,
        tenantId: dealership.id,
        activeGstin: dealership.activeGstin,
      };
      apiClient.setAuthToken('dev_mock_jwt_token');
      return fallbackResp;
    }
  },

  async signUp(payload: {
    fullName: string;
    email: string;
    password: string;
    groupName: string;
    brand: string;
    authorizedDealerFor: string;
    headquarters: string;
    activeGstin: string;
    dmsSoftware: string;
  }): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/signup', payload);
      if (res.data?.token) {
        apiClient.setAuthToken(res.data.token);
      }
      return res.data;
    } catch {
      // Offline fallback
      const tenantId = `dms-${Date.now().toString(36)}`;
      const dealership: DealershipProfile = {
        id: tenantId,
        groupName: payload.groupName || `${payload.fullName} Automotive`,
        brand: payload.brand || 'Multi-Brand',
        authorizedDealerFor: payload.authorizedDealerFor || 'Authorized Dealer',
        headquarters: payload.headquarters || 'Delhi NCR',
        monthlyInvoiceVolume: 500,
        dmsSoftware: (payload.dmsSoftware as any) || 'CDK_GLOBAL',
        activeGstin: payload.activeGstin || '07AABCA9876K1Z2',
        branches: [
          {
            gstin: payload.activeGstin || '07AABCA9876K1Z2',
            state: 'Delhi (07)',
            city: 'Main Showroom',
            type: 'SHOWROOM_AND_WORKSHOP',
          },
        ],
      };
      const user: User = {
        id: `usr-${Date.now().toString(36)}`,
        tenantId,
        email: payload.email,
        fullName: payload.fullName,
        role: 'FINANCE_DIRECTOR',
        authProvider: 'LOCAL',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      apiClient.setAuthToken('dev_mock_jwt_token');
      return {
        success: true,
        token: 'dev_mock_jwt_token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user,
        dealership,
        tenantId,
        activeGstin: dealership.activeGstin,
      };
    }
  },

  async demoLogin(tenantId: string = 'dms-01'): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>(`/auth/demo?tenantId=${tenantId}`);
      if (res.data?.token) {
        apiClient.setAuthToken(res.data.token);
      }
      return res.data;
    } catch {
      const dealer = DEALERSHIP_PROFILES.find((d) => d.id === tenantId) || DEALERSHIP_PROFILES[0];
      const user: User = {
        id: 'usr-demo-01',
        tenantId: dealer.id,
        email: tenantId === 'dms-02' ? 'tax@vertexmobility.in' : 'demo@autotax.io',
        fullName: tenantId === 'dms-02' ? 'Ananya Deshmukh (Head of Tax)' : 'Rajesh Sharma (CFO)',
        role: tenantId === 'dms-02' ? 'TAX_ACCOUNTANT' : 'FINANCE_DIRECTOR',
        authProvider: 'LOCAL',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      apiClient.setAuthToken('dev_mock_jwt_token');
      return {
        success: true,
        token: 'dev_mock_jwt_token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user,
        dealership: dealer,
        tenantId: dealer.id,
        activeGstin: dealer.activeGstin,
      };
    }
  },

  async getMe(): Promise<AuthResponse | null> {
    try {
      const res = await apiClient.get<AuthResponse>('/auth/me');
      return res.data;
    } catch {
      return null;
    }
  },

  logout() {
    apiClient.setAuthToken(null);
  },
};
