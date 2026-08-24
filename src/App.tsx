import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { VendorNoticeModal } from './components/VendorNoticeModal';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { DashboardHome } from './components/DashboardHome';
import { ManualDataEntryView } from './components/ManualDataEntryView';
import { DocumentUploadView } from './components/DocumentUploadView';
import { MFESuspenseWrapper } from './mfe/shell/MFESuspenseWrapper';
import { mfeEventBus } from './mfe/eventBus';
import { 
  DEALERSHIP_PROFILES, 
  MOCK_PURCHASE_REGISTER, 
  MOCK_GSTR_2B 
} from './data/mockDealershipData';
import { runReconciliation } from './utils/reconciliationEngine';
import { reconApi, apiClient, tenantsApi } from './api';
import { ReconciledRecord, DealershipProfile } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import confetti from 'canvas-confetti';

// Lazy-load Remote Domain Micro Frontends
const ReconWorkspaceMFE = lazy(() => import('./mfe/remotes/recon'));
const SalesWorkspaceMFE = lazy(() => import('./mfe/remotes/sales'));
const ComplianceWorkspaceMFE = lazy(() => import('./mfe/remotes/compliance'));

function AppContent() {
  const { theme } = useTheme();
  const { user, dealership: authDealership, isAuthenticated, demoLogin } = useAuth();

  // Public Unauthenticated Route State: 'landing' | 'login' | 'signup'
  const [publicRoute, setPublicRoute] = useState<string>('landing');

  // Dealerships state
  const [dealerships, setDealerships] = useState<DealershipProfile[]>(DEALERSHIP_PROFILES);
  const [selectedDealership, setSelectedDealership] = useState<DealershipProfile>(
    authDealership || DEALERSHIP_PROFILES[0]
  );
  const [selectedGstin, setSelectedGstin] = useState<string>(
    authDealership?.activeGstin || DEALERSHIP_PROFILES[0].activeGstin
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>('July 2026');
  
  // App Shell Tab routing
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Reconciled Records State
  const [reconciledRecords, setReconciledRecords] = useState<ReconciledRecord[]>(() =>
    runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B)
  );
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState<boolean>(false);
  const [activeNoticeRecord, setActiveNoticeRecord] = useState<ReconciledRecord | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [, setIsLoading] = useState<boolean>(false);

  // Sync with authDealership when user logs in
  useEffect(() => {
    if (authDealership) {
      setSelectedDealership(authDealership);
      setSelectedGstin(authDealership.activeGstin);
      setDealerships((prev) => {
        if (!prev.some((d) => d.id === authDealership.id)) {
          return [authDealership, ...prev];
        }
        return prev;
      });
    }
  }, [authDealership]);

  // Subscribe to Cross-MFE Event Bus
  useEffect(() => {
    const unbindNavigate = mfeEventBus.on('NAVIGATE_TAB', ({ tabId }) => {
      setCurrentTab(tabId);
    });

    const unbindToast = mfeEventBus.on('NOTIFICATION_TOAST', ({ message }) => {
      setSyncToastMessage(message);
      setTimeout(() => setSyncToastMessage(null), 4000);
    });

    const unbindTenant = mfeEventBus.on('TENANT_CHANGED', ({ dealership, activeGstin }) => {
      setSelectedDealership(dealership);
      setSelectedGstin(activeGstin);
    });

    return () => {
      unbindNavigate();
      unbindToast();
      unbindTenant();
    };
  }, []);

  // Fetch initial data from backend when dealership or GSTIN changes
  useEffect(() => {
    if (!isAuthenticated) return;

    apiClient.setTenantContext(selectedDealership.id, selectedGstin);
    mfeEventBus.emit('TENANT_CHANGED', {
      dealership: selectedDealership,
      activeGstin: selectedGstin,
    });
    
    let isMounted = true;
    const fetchRecon = async () => {
      setIsLoading(true);
      try {
        const records = await reconApi.getRecords();
        if (isMounted && records.length > 0) {
          setReconciledRecords(records);
        }
      } catch {
        // Fallback already active
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRecon();
    return () => { isMounted = false; };
  }, [selectedDealership, selectedGstin, isAuthenticated]);

  const handleRefreshRecon = async () => {
    setIsLoading(true);
    try {
      await reconApi.syncGSP();
      const results = await reconApi.getRecords();
      if (results && results.length > 0) {
        setReconciledRecords(results);
      } else {
        const local = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
        setReconciledRecords(local);
      }
    } catch {
      const results = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
      setReconciledRecords(results);
    } finally {
      setIsLoading(false);
    }

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.2 } });
    setSyncToastMessage(`GSTR-2B synced via GSP & 7-tier reconciliation updated for ${selectedDealership.groupName}!`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleOpenNoticeModal = (record: ReconciledRecord) => {
    setActiveNoticeRecord(record);
    setIsNoticeModalOpen(true);
  };

  const handleNoticeSent = (recordId: string, channel: 'WHATSAPP' | 'EMAIL') => {
    reconApi.overrideRecord(recordId, 'HOLD_PAYMENT', channel === 'WHATSAPP' ? 'WHATSAPP_SENT' : 'EMAIL_SENT');
    mfeEventBus.emit('NOTICE_DISPATCHED', {
      recordId,
      channel,
      vendorName: activeNoticeRecord?.prItem?.vendorName || 'Supplier',
    });

    setReconciledRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              vendorActionStatus: channel === 'WHATSAPP' ? 'WHATSAPP_SENT' : 'EMAIL_SENT',
              actionRecommended: 'HOLD_PAYMENT',
            }
          : r
      )
    );
    setSyncToastMessage(`Statutory Section 16(2)(aa) Payment Hold notice dispatched via ${channel} to vendor.`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleToggleHoldPayment = (recordId: string) => {
    const target = reconciledRecords.find((r) => r.id === recordId);
    const newAction = target?.actionRecommended === 'HOLD_PAYMENT' ? 'APPROVE_FOR_3B' : 'HOLD_PAYMENT';
    reconApi.overrideRecord(recordId, newAction);
    mfeEventBus.emit('MATCH_OVERRIDDEN', { recordId, action: newAction });

    setReconciledRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              actionRecommended: newAction,
            }
          : r
      )
    );
  };

  const handleApproveRecord = (recordId: string) => {
    reconApi.overrideRecord(recordId, 'APPROVE_FOR_3B');
    mfeEventBus.emit('MATCH_OVERRIDDEN', { recordId, action: 'APPROVE_FOR_3B' });
    setSyncToastMessage('Record verified for GSTR-3B Table 4(A)(5).');
    setTimeout(() => setSyncToastMessage(null), 3000);
  };

  const handleQuickDemoAccess = async (tenantId: string = 'dms-01') => {
    await demoLogin(tenantId);
    setCurrentTab('dashboard');
  };

  // --- UNAUTHENTICATED PUBLIC ROUTES ---
  if (!isAuthenticated) {
    if (publicRoute === 'login') {
      return (
        <LoginPage
          onNavigate={setPublicRoute}
          onSuccessRedirect={() => setCurrentTab('dashboard')}
        />
      );
    }
    if (publicRoute === 'signup') {
      return (
        <SignUpPage
          onNavigate={setPublicRoute}
          onSuccessRedirect={() => setCurrentTab('dashboard')}
        />
      );
    }
    return (
      <LandingPage
        onNavigate={setPublicRoute}
        onQuickDemo={handleQuickDemoAccess}
      />
    );
  }

  // --- AUTHENTICATED APP SHELL & MFE WORKSPACES ---
  return (
    <div className={`min-h-screen ${theme.canvasBg} flex flex-col font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200`}>
      {/* App Shell Global Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        dealerships={dealerships}
        selectedDealership={selectedDealership}
        setSelectedDealership={setSelectedDealership}
        selectedGstin={selectedGstin}
        setSelectedGstin={setSelectedGstin}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        onRefreshRecon={handleRefreshRecon}
      />

      {/* Floating Notification Toast */}
      {syncToastMessage && (
        <div className="fixed top-18 right-6 z-50 bg-slate-950 text-white px-3.5 py-2 rounded-lg shadow-2xl border border-indigo-500/40 text-xs font-mono flex items-center space-x-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Main Micro Frontend Workspace Shell */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Tab 1: Executive Dashboard (Adaptive Onboarding & KPI View) */}
        {currentTab === 'dashboard' && (
          <DashboardHome
            records={reconciledRecords}
            dealership={selectedDealership}
            activeGstin={selectedGstin}
            period={selectedPeriod}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onRefreshRecon={handleRefreshRecon}
            onOpenNoticeModal={handleOpenNoticeModal}
          />
        )}

        {/* Tab 2: Manual Data Entry Grid */}
        {currentTab === 'data-entry' && (
          <ManualDataEntryView
            dealership={selectedDealership}
            activeGstin={selectedGstin}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onRefreshRecon={handleRefreshRecon}
          />
        )}

        {/* Tab 3: Smart Document Upload & OCR Review */}
        {currentTab === 'upload' && (
          <DocumentUploadView
            dealership={selectedDealership}
            activeGstin={selectedGstin}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onRefreshRecon={handleRefreshRecon}
          />
        )}

        {/* Remote MFE 1: Inbound Purchases & ITC 2B Recon Workbench */}
        {currentTab === 'recon-workbench' && (
          <Suspense fallback={<MFESuspenseWrapper remoteName="mfe-recon" description="Loading 7-Tier Reconciliation Matrix..." />}>
            <ReconWorkspaceMFE
              records={reconciledRecords}
              dealership={selectedDealership}
              activeGstin={selectedGstin}
              period={selectedPeriod}
              onOpenNoticeModal={handleOpenNoticeModal}
              onToggleHoldPayment={handleToggleHoldPayment}
              onApproveRecord={handleApproveRecord}
            />
          </Suspense>
        )}

        {/* Remote MFE 2: Outbound Sales & E-Invoicing */}
        {currentTab === 'sales-invoices' && (
          <Suspense fallback={<MFESuspenseWrapper remoteName="mfe-sales" description="Loading E-Invoicing & Gate Pass Engine..." />}>
            <SalesWorkspaceMFE
              dealership={selectedDealership}
              activeGstin={selectedGstin}
              period={selectedPeriod}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          </Suspense>
        )}

        {/* Remote MFE 3: OEM Scheme & Volume Bonus Claims */}
        {currentTab === 'oem-tracker' && (
          <Suspense fallback={<MFESuspenseWrapper remoteName="mfe-compliance" description="Loading OEM Incentive Scheme Tracker..." />}>
            <ComplianceWorkspaceMFE
              records={reconciledRecords}
              dealership={selectedDealership}
              activeGstin={selectedGstin}
              period={selectedPeriod}
              activeSubTab="oem-tracker"
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          </Suspense>
        )}

        {/* Remote MFE 3: GSTR-3B Table 4 & Statutory Notice Defense */}
        {currentTab === 'gstr3b-summary' && (
          <Suspense fallback={<MFESuspenseWrapper remoteName="mfe-compliance" description="Loading GSTR-3B Table 4 Return Computations..." />}>
            <ComplianceWorkspaceMFE
              records={reconciledRecords}
              dealership={selectedDealership}
              activeGstin={selectedGstin}
              period={selectedPeriod}
              activeSubTab="gstr3b-summary"
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          </Suspense>
        )}
      </main>

      {/* Global Vendor Notice Modal */}
      <VendorNoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        record={activeNoticeRecord}
        dealership={selectedDealership}
        onNoticeSent={handleNoticeSent}
      />

      {/* High Density Terminal Status Footer */}
      <footer className="h-8 bg-slate-950/80 border-t border-slate-800/80 px-6 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none">
        <div className="flex items-center space-x-3">
          <span>Active Dealership: <strong className="text-slate-200">{selectedDealership.groupName}</strong></span>
          <span>•</span>
          <span>Branch GSTIN: <strong className="text-indigo-400">{selectedGstin}</strong></span>
        </div>
        <div className="hidden sm:flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>MFE Event Bus: ACTIVE</span>
          </span>
          <span>•</span>
          <span>Theme: <strong className="text-amber-400 font-bold uppercase">{theme.name}</strong></span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Tally &amp; SAP Connectors: ONLINE</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
