import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ReconciledRecord, 
  DealershipProfile 
} from '../types';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Building2, 
  Zap, 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  FileCheck2, 
  Clock, 
  ChevronRight,
  Database,
  Play
} from 'lucide-react';
import { ingestApi } from '../api';
import confetti from 'canvas-confetti';

interface DashboardHomeProps {
  records: ReconciledRecord[];
  dealership: DealershipProfile;
  activeGstin: string;
  period: string;
  onNavigateTab: (tabId: string) => void;
  onRefreshRecon: () => void;
  onOpenNoticeModal: (record: ReconciledRecord) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  records,
  dealership,
  activeGstin,
  period,
  onNavigateTab,
  onRefreshRecon,
  onOpenNoticeModal,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccessMessage, setSeedSuccessMessage] = useState<string | null>(null);

  // Compute aggregate metrics
  const totalRecords = records.length;
  const matchedRecords = records.filter((r) => r.matchStatus === 'EXACT_MATCH' || r.matchStatus === 'FUZZY_MATCH');
  const matchedTax = matchedRecords.reduce((acc, r) => acc + (r.prItem?.totalTax || r.gstr2bItem?.totalTax || 0), 0);
  const totalTax = records.reduce((acc, r) => acc + (r.prItem?.totalTax || r.gstr2bItem?.totalTax || 0), 0);
  const atRiskRecords = records.filter((r) => r.matchStatus === 'MISSING_IN_2B' || r.matchStatus === 'VALUE_MISMATCH');
  const atRiskTax = atRiskRecords.reduce((acc, r) => acc + (r.prItem?.totalTax || 0), 0);
  const rule37Records = records.filter((r) => r.matchStatus === 'RULE_37_RISK');
  const rule37Tax = rule37Records.reduce((acc, r) => acc + (r.prItem?.totalTax || 0), 0);

  const matchPercentage = totalRecords > 0 ? Math.round((matchedRecords.length / totalRecords) * 100) : 0;

  const handleSeedDataset = async () => {
    setIsSeeding(true);
    try {
      await ingestApi.seedDemoData();
      await onRefreshRecon();
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.3 } });
      setSeedSuccessMessage('Enterprise multi-branch automotive dataset successfully hydrated into workspace!');
      setTimeout(() => setSeedSuccessMessage(null), 5000);
    } catch {
      onRefreshRecon();
    } finally {
      setIsSeeding(false);
    }
  };

  const isEmpty = totalRecords === 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {seedSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{seedSuccessMessage}</span>
          </div>
          <button 
            onClick={() => onNavigateTab('recon-workbench')}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition-colors"
          >
            View Recon Matrix →
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} shadow-xl relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                {dealership.brand} • {dealership.dmsSoftware}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className={`text-2xl font-black ${theme.isLight ? 'text-slate-900' : 'text-white'} tracking-tight`}>
              Welcome back, {user?.fullName || 'Finance Director'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active Organization: <strong className={theme.isLight ? 'text-slate-700' : 'text-slate-200'}>{dealership.groupName}</strong> | Branch GSTIN: <strong className="text-indigo-400 font-mono">{activeGstin}</strong> ({period})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('data-entry')}
              className={`px-3.5 py-2 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>+ Add Inward Entry</span>
            </button>

            <button
              onClick={() => onNavigateTab('upload')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer hover:border-indigo-500/40"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Document / OCR</span>
            </button>

            <button
              onClick={onRefreshRecon}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sync GSP (2B)</span>
            </button>
          </div>
        </div>
      </div>

      {/* EMPTY STATE / ONBOARDING LAUNCHPAD */}
      {isEmpty ? (
        <div className={`p-8 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} text-center space-y-8`}>
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className={`text-xl font-bold ${theme.isLight ? 'text-slate-900' : 'text-white'}`}>
              Your Workspace is Ready for Ingestion
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Start by ingesting your Purchase Register and GSTR-2B datasets. Choose any of the 4 ingestion paths below to activate the 7-tier reconciliation engine.
            </p>
          </div>

          {/* 4 Launchpad Ingestion Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Card 1: Manual Data Entry */}
            <div 
              onClick={() => onNavigateTab('data-entry')}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Manual Data Entry Grid</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Enter invoice line items through a high-density spreadsheet grid with automatic GST tax calculations.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Launch Grid</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Card 2: Document Upload & OCR */}
            <div 
              onClick={() => onNavigateTab('upload')}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Smart Invoice / Receipt OCR</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Drag and drop PDF or photo scans. AI extracts tax rates, GSTINs, and totals with side-by-side review.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                <span>Upload Files</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Card 3: Connect GSP / DMS */}
            <div 
              onClick={onRefreshRecon}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Sync GSP Suvidha (GSTN)</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Trigger live or simulated GSTR-2B synchronization from the GSTN portal for {activeGstin}.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Sync Now</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Card 4: 1-Click Sample Dataset Hydration */}
            <div 
              onClick={handleSeedDataset}
              className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Load Sample Automotive Dataset</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Populate with 5,000+ realistic Maruti/Tata dealership records to test the 7-tier engine immediately.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>{isSeeding ? 'Hydrating...' : '1-Click Load'}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE OPERATIONS DASHBOARD (Populated State) */
        <div className="space-y-6">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-xl ${theme.cardBg} border ${theme.cardBorder} shadow-sm`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Reconciled Match Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {matchPercentage}%
              </div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">
                ₹{(matchedTax / 100000).toFixed(2)}L matched ITC claimable
              </p>
            </div>

            <div className={`p-5 rounded-xl ${theme.cardBg} border ${theme.cardBorder} shadow-sm`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Sec 16(2)(aa) At-Risk</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 font-mono">
                ₹{(atRiskTax / 100000).toFixed(2)}L
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {atRiskRecords.length} missing supplier 2B filings
              </p>
            </div>

            <div className={`p-5 rounded-xl ${theme.cardBg} border ${theme.cardBorder} shadow-sm`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Rule 37 180-Day Risk</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ₹{(rule37Tax / 100000).toFixed(2)}L
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {rule37Records.length} aging unpaid invoices
              </p>
            </div>

            <div className={`p-5 rounded-xl ${theme.cardBg} border ${theme.cardBorder} shadow-sm`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Active Records</span>
                <Database className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {totalRecords} Invoices
              </div>
              <p className="text-[11px] text-indigo-400 font-medium mt-1">
                Across {dealership.branches.length} authorized branches
              </p>
            </div>
          </div>

          {/* Quick Action Hub & Compliance Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Quick Ingestion Hub */}
            <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-4`}>
              <h3 className={`text-sm font-bold ${theme.isLight ? 'text-slate-900' : 'text-white'} flex items-center space-x-2`}>
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Quick Ingestion Tools</span>
              </h3>

              <div className="space-y-2.5">
                <button
                  onClick={() => onNavigateTab('data-entry')}
                  className="w-full p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block">Manual Batch Entry</span>
                      <span className="text-[10px] text-slate-400">Add custom invoice line items</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => onNavigateTab('upload')}
                  className="w-full p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block">Smart OCR Extraction</span>
                      <span className="text-[10px] text-slate-400">Upload PDF &amp; image scans</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <button
                  onClick={() => onNavigateTab('recon-workbench')}
                  className="w-full p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block">Open 7-Tier Recon Matrix</span>
                      <span className="text-[10px] text-slate-400">Review matches &amp; payment holds</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Middle & Right: Immediate Action Items */}
            <div className={`lg:col-span-2 p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${theme.isLight ? 'text-slate-900' : 'text-white'} flex items-center space-x-2`}>
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>High-Priority Statutory Actions (Sec 16(2)(aa))</span>
                </h3>
                <span className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer" onClick={() => onNavigateTab('recon-workbench')}>
                  View all in Matrix →
                </span>
              </div>

              <div className="space-y-2.5">
                {atRiskRecords.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/20 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white">{rec.prItem?.invoiceNo}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono">
                          {rec.matchStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {rec.prItem?.vendorName} • ITC at Risk: <strong className="text-rose-400 font-mono">₹{rec.prItem?.totalTax.toLocaleString('en-IN')}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenNoticeModal(rec)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                      Hold &amp; Dispatch Notice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
