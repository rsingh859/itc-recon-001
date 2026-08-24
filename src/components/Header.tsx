import React, { useState, useEffect } from 'react';
import { DealershipProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiClient, ServerTelemetry } from '../api/client';
import { 
  Building2, 
  Layers, 
  FileSpreadsheet, 
  FileCheck2, 
  Calculator,
  RefreshCw, 
  Sparkles, 
  ChevronDown, 
  Car, 
  LayoutDashboard,
  UploadCloud,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  dealerships: DealershipProfile[];
  selectedDealership: DealershipProfile;
  setSelectedDealership: (dealer: DealershipProfile) => void;
  selectedGstin: string;
  setSelectedGstin: (gstin: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  onRefreshRecon: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  dealerships,
  selectedDealership,
  setSelectedDealership,
  selectedGstin,
  setSelectedGstin,
  selectedPeriod,
  setSelectedPeriod,
  onRefreshRecon,
}) => {
  const { theme, themeId, setTheme, availableThemes } = useTheme();
  const { user, logout } = useAuth();
  const [telemetry, setTelemetry] = useState<ServerTelemetry>(apiClient.getTelemetry());

  useEffect(() => {
    // Subscribe to live telemetry updates
    const unsubscribe = apiClient.subscribeTelemetry((t) => setTelemetry(t));
    apiClient.checkHealth();

    const interval = setInterval(() => {
      apiClient.checkHealth();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Primary Clean End-User Business Tabs
  const businessTabs = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, badge: 'Overview' },
    { id: 'data-entry', label: 'Manual Entry Grid', icon: FileSpreadsheet, badge: 'Input' },
    { id: 'upload', label: 'Invoice OCR Hub', icon: UploadCloud, badge: 'AI Parse' },
    { id: 'recon-workbench', label: '7-Tier Recon Matrix', icon: FileCheck2, badge: 'Match' },
    { id: 'sales-invoices', label: 'E-Invoicing & IRN', icon: Car, badge: 'Sales' },
    { id: 'oem-tracker', label: 'OEM Claims', icon: Layers, badge: 'Bonus' },
    { id: 'gstr3b-summary', label: 'GSTR-3B Table 4', icon: Calculator, badge: 'Returns' },
  ];

  const selectBgClass = theme.isLight 
    ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-800' 
    : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200';

  return (
    <header className={`${theme.headerBg} sticky top-0 z-40 select-none transition-colors duration-200 border-b ${theme.cardBorder}`}>

      {/* Top High-Density Control Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Product Badge */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`w-8 h-8 rounded ${theme.accentBg} ${theme.accentHover} border border-indigo-400/40 flex items-center justify-center font-black text-white text-xs shadow-sm cursor-pointer transition-colors`}
            >
              AT
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-bold text-sm tracking-tight ${theme.isLight ? 'text-slate-900' : 'text-white'}`}>
                  AutoTax <span className="text-indigo-500">ITC</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono font-bold">
                  v2.0 Go Core
                </span>
              </div>
            </div>
          </div>

          {/* Dealership Selectors & Live Telemetry */}
          <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
            {/* Live Backend Telemetry Pill */}
            <button
              onClick={() => apiClient.checkHealth()}
              title={`Click to re-ping backend. Engine: ${telemetry.engine}`}
              className={`flex items-center space-x-1.5 text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                telemetry.serverType === 'GO_NATIVE'
                  ? theme.isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                  : telemetry.serverType === 'MOCK_SERVER'
                  ? theme.isLight ? 'bg-cyan-50 border-cyan-300 text-cyan-800' : 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300'
                  : theme.isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/70 border-amber-700/60 text-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                telemetry.serverType === 'GO_NATIVE' ? 'bg-emerald-400 animate-ping' :
                telemetry.serverType === 'MOCK_SERVER' ? 'bg-cyan-400 animate-pulse' :
                'bg-amber-400'
              }`} />
              <span className="font-semibold">
                {telemetry.serverType === 'GO_NATIVE' ? `Go Core (8080): ${telemetry.latencyMs}ms` :
                 telemetry.serverType === 'MOCK_SERVER' ? `Mock API (8081): ${telemetry.latencyMs}ms` :
                 'In-Memory Store'}
              </span>
            </button>

            {/* Selectors */}
            <div className="flex items-center space-x-2">
              
              {/* Dealer Group Selector */}
              <div className="relative">
                <select
                  value={selectedDealership.id}
                  onChange={(e) => {
                    const found = dealerships.find((d) => d.id === e.target.value);
                    if (found) {
                      setSelectedDealership(found);
                      setSelectedGstin(found.activeGstin);
                    }
                  }}
                  className={`appearance-none ${selectBgClass} font-semibold rounded px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[150px] truncate`}
                >
                  {dealerships.map((d) => (
                    <option key={d.id} value={d.id}>
                      🏢 {d.groupName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Branch GSTIN Selector */}
              <div className="relative">
                <select
                  value={selectedGstin}
                  onChange={(e) => setSelectedGstin(e.target.value)}
                  className={`appearance-none ${selectBgClass} font-mono font-semibold rounded px-2 py-1 pr-5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                >
                  {selectedDealership.branches.map((b) => (
                    <option key={b.gstin} value={b.gstin}>
                      📍 {b.gstin.substring(0, 2)} - {b.city.split('&')[0]} ({b.gstin})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Tax Period Selector */}
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={`appearance-none ${selectBgClass} font-semibold rounded px-2 py-1 pr-5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                >
                  <option value="July 2026">July 2026 (Active Return)</option>
                  <option value="June 2026">June 2026 (Filed)</option>
                  <option value="May 2026">May 2026 (Filed)</option>
                  <option value="Q1-FY27">Q1-FY27 Consolidated</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Theme Selector */}
              <div className="relative">
                <select
                  value={themeId}
                  onChange={(e) => setTheme(e.target.value)}
                  className={`appearance-none ${selectBgClass} font-mono text-[10px] font-semibold rounded px-2 py-1 pr-5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer`}
                  title="Switch Theme"
                >
                  {availableThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      🎨 {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-amber-500 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Quick Sync & Recon Button */}
              <button
                id="header-rerun-recon-btn"
                onClick={onRefreshRecon}
                className={`inline-flex items-center space-x-1 ${theme.accentBg} ${theme.accentHover} text-white text-[11px] font-medium px-2 py-1 rounded transition-colors cursor-pointer shadow-xs`}
                title="Trigger real-time reconciliation"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>

            {/* User Pill & Logout */}
            <div className={`hidden sm:flex items-center space-x-2 pl-2 border-l ${theme.isLight ? 'border-slate-300' : 'border-slate-700'}`}>
              <div className={`w-6 h-6 rounded-full ${theme.isLight ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white'} border border-slate-400/40 flex items-center justify-center font-bold text-[10px]`}>
                {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'FD'}
              </div>
              <div className="text-left leading-tight">
                <div className={`text-[11px] font-semibold ${theme.isLight ? 'text-slate-900' : 'text-slate-200'} truncate max-w-[100px]`}>
                  {user?.fullName || 'Finance Director'}
                </div>
                <div className={`text-[9px] ${theme.isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {user?.role || 'FINANCE_DIRECTOR'}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t ${theme.isLight ? 'border-slate-200 bg-slate-50/80' : 'border-slate-800/80 bg-slate-950/40'} flex flex-wrap items-center justify-between`}>
        <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none" aria-label="Tabs">
          {businessTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setCurrentTab(tab.id)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? theme.tabActive
                    : theme.tabInactive
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
