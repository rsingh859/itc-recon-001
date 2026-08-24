import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DealershipProfile } from '../types';
import { authApi, apiClient } from '../api';
import { DEALERSHIP_PROFILES } from '../data/mockDealershipData';
import { mfeEventBus } from '../mfe/eventBus';

interface AuthContextType {
  user: User | null;
  dealership: DealershipProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (payload: {
    fullName: string;
    email: string;
    password: string;
    groupName: string;
    brand: string;
    authorizedDealerFor: string;
    headquarters: string;
    activeGstin: string;
    dmsSoftware: string;
  }) => Promise<boolean>;
  demoLogin: (tenantId?: string) => Promise<void>;
  logout: () => void;
  setDealership: (dealership: DealershipProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dealership, setDealership] = useState<DealershipProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = apiClient.getAuthToken();
      if (existingToken) {
        try {
          const profile = await authApi.getMe();
          if (profile && profile.user) {
            setUser(profile.user);
            if (profile.dealership) {
              setDealership(profile.dealership);
              apiClient.setTenantContext(profile.dealership.id, profile.dealership.activeGstin);
            }
          } else {
            // Restore default demo session
            setUser({
              id: 'usr-demo-01',
              tenantId: 'dms-01',
              email: 'demo@autotax.io',
              fullName: 'Rajesh Sharma (CFO)',
              role: 'FINANCE_DIRECTOR',
              authProvider: 'LOCAL',
              isActive: true,
              createdAt: new Date().toISOString(),
            });
            setDealership(DEALERSHIP_PROFILES[0]);
            apiClient.setTenantContext(DEALERSHIP_PROFILES[0].id, DEALERSHIP_PROFILES[0].activeGstin);
          }
        } catch {
          // Keep offline session
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const resp = await authApi.login(email, password);
      if (resp && resp.user) {
        setUser(resp.user);
        const dealer = resp.dealership || DEALERSHIP_PROFILES[0];
        setDealership(dealer);
        apiClient.setTenantContext(dealer.id, dealer.activeGstin);
        mfeEventBus.emit('TENANT_CHANGED', {
          dealership: dealer,
          activeGstin: dealer.activeGstin,
        });
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (payload: any): Promise<boolean> => {
    setIsLoading(true);
    try {
      const resp = await authApi.signUp(payload);
      if (resp && resp.user) {
        setUser(resp.user);
        const dealer = resp.dealership || {
          id: resp.tenantId,
          groupName: payload.groupName,
          brand: payload.brand,
          authorizedDealerFor: payload.authorizedDealerFor,
          headquarters: payload.headquarters,
          monthlyInvoiceVolume: 500,
          dmsSoftware: payload.dmsSoftware,
          activeGstin: payload.activeGstin,
          branches: [
            {
              gstin: payload.activeGstin,
              state: 'Delhi (07)',
              city: 'Main Facility',
              type: 'SHOWROOM_AND_WORKSHOP',
            },
          ],
        };
        setDealership(dealer);
        apiClient.setTenantContext(dealer.id, dealer.activeGstin);
        mfeEventBus.emit('TENANT_CHANGED', {
          dealership: dealer,
          activeGstin: dealer.activeGstin,
        });
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (tenantId: string = 'dms-01') => {
    setIsLoading(true);
    try {
      const resp = await authApi.demoLogin(tenantId);
      if (resp && resp.user) {
        setUser(resp.user);
        const dealer = resp.dealership || (tenantId === 'dms-02' ? DEALERSHIP_PROFILES[1] : DEALERSHIP_PROFILES[0]);
        setDealership(dealer);
        apiClient.setTenantContext(dealer.id, dealer.activeGstin);
        mfeEventBus.emit('TENANT_CHANGED', {
          dealership: dealer,
          activeGstin: dealer.activeGstin,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setDealership(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dealership,
        isAuthenticated: !!user,
        isLoading,
        login,
        signUp,
        demoLogin,
        logout,
        setDealership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
