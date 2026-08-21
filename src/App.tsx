import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DailyActionHub } from './components/DailyActionHub';
import { SalesInvoicesAndIrnView } from './components/SalesInvoicesAndIrnView';
import { LiveReconWorkbench } from './components/LiveReconWorkbench';
import { OEMIncentiveTracker } from './components/OEMIncentiveTracker';
import { GSTR3BSummaryView } from './components/GSTR3BSummaryView';
import { VendorNoticeModal } from './components/VendorNoticeModal';
import { 
  DEALERSHIP_PROFILES, 
  MOCK_PURCHASE_REGISTER, 
  MOCK_GSTR_2B 
} from './data/mockDealershipData';
import { runReconciliation } from './utils/reconciliationEngine';
import { ReconciledRecord, DealershipProfile } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import confetti from 'canvas-confetti';

function AppContent() {
  const { theme } = useTheme();
  const [dealerships] = useState<DealershipProfile[]>(DEALERSHIP_PROFILES);
  const [selectedDealership, setSelectedDealership] = useState<DealershipProfile>(DEALERSHIP_PROFILES[0]);
  const [selectedGstin, setSelectedGstin] = useState<string>(DEALERSHIP_PROFILES[0].activeGstin);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('July 2026');
  
  // Default to the clean executive Daily Action Hub
  const [currentTab, setCurrentTab] = useState<string>('daily-hub');

  // Reconciled Records State
  const [reconciledRecords, setReconciledRecords] = useState<ReconciledRecord[]>([]);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState<boolean>(false);
  const [activeNoticeRecord, setActiveNoticeRecord] = useState<ReconciledRecord | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Initial Run
  useEffect(() => {
    const results = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
    setReconciledRecords(results);
  }, [selectedDealership, selectedGstin]);

  const handleRefreshRecon = () => {
    const results = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
    setReconciledRecords(results);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.2 } });
    setSyncToastMessage(`GSTR-2B synced via GSP & 7-tier reconciliation updated for ${selectedDealership.groupName}!`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleOpenNoticeModal = (record: ReconciledRecord) => {
    setActiveNoticeRecord(record);
    setIsNoticeModalOpen(true);
  };

  const handleOpenGeneralNotice = () => {
    const missingRec = reconciledRecords.find((r) => r.matchStatus === 'MISSING_IN_2B') || reconciledRecords[0];
    if (missingRec) {
      setActiveNoticeRecord(missingRec);
      setIsNoticeModalOpen(true);
    }
  };

  const handleNoticeSent = (recordId: string, channel: 'WHATSAPP' | 'EMAIL') => {
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
    setReconciledRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              actionRecommended: r.actionRecommended === 'HOLD_PAYMENT' ? 'APPROVE_FOR_3B' : 'HOLD_PAYMENT',
            }
          : r
      )
    );
  };

  const handleApproveRecord = (recordId: string) => {
    setSyncToastMessage('Record verified for GSTR-3B Table 4(A)(5).');
    setTimeout(() => setSyncToastMessage(null), 3000);
  };

  return (
    <div className={`min-h-screen ${theme.canvasBg} flex flex-col font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200`}>
      {/* Top Clean Header */}
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

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {/* TAB 1: Clean Executive Action Hub */}
        {currentTab === 'daily-hub' && (
          <DailyActionHub 
            onNavigateTab={(tab) => setCurrentTab(tab)} 
            onOpenNoticeModal={handleOpenGeneralNotice}
          />
        )}

        {/* TAB 2: Sales Invoicing, IRN & Delivery Gate Pass */}
        {currentTab === 'sales-invoices' && (
          <SalesInvoicesAndIrnView />
        )}

        {/* TAB 3: Inbound Purchases & ITC 2B Recon Workbench */}
        {currentTab === 'recon-workbench' && (
          <LiveReconWorkbench
            records={reconciledRecords}
            dealership={selectedDealership}
            activeGstin={selectedGstin}
            period={selectedPeriod}
            onOpenNoticeModal={handleOpenNoticeModal}
            onToggleHoldPayment={handleToggleHoldPayment}
            onApproveRecord={handleApproveRecord}
          />
        )}

        {/* TAB 4: OEM Scheme & Volume Bonus Claims */}
        {currentTab === 'oem-tracker' && (
          <OEMIncentiveTracker dealership={selectedDealership} />
        )}

        {/* TAB 5: GSTR-3B Table 4 & Statutory Notice Defense */}
        {currentTab === 'gstr3b-summary' && (
          <GSTR3BSummaryView
            records={reconciledRecords}
            dealership={selectedDealership}
            period={selectedPeriod}
          />
        )}
      </main>

      {/* Vendor Notice Modal */}
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
      <AppContent />
    </ThemeProvider>
  );
}
