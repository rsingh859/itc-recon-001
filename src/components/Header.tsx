import React from 'react';
import { DealershipProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  Building2, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileCheck2, 
  Calculator,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Activity,
  Server,
  Zap,
  Trophy,
  Users,
  Key,
  Workflow,
  LayoutDashboard,
  Car,
  Palette
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

  // Primary Clean End-User Business Tabs
  const businessTabs = [
    { id: 'daily-hub', label: 'Daily Action Hub', icon: LayoutDashboard, badge: 'Overview' },
    { id: 'sales-invoices', label: 'E-Invoicing & Gate Pass', icon: Car, badge: 'Sales' },
    { id: 'recon-workbench', label: 'ITC Recon & Vendor Guard', icon: FileSpreadsheet, badge: 'Purchases' },
    { id: 'oem-tracker', label: 'OEM Scheme Claims', icon: Layers, badge: 'Bonus' },
    { id: 'gstr3b-summary', label: 'GSTR-3B Table 4', icon: FileCheck2, badge: 'Returns' },
  ];

  const selectBgClass = theme.isLight 
    ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-800' 
    : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200';

  return (
    <header className={`${theme.headerBg} sticky top-0 z-40 select-none transition-colors duration-200`}>
      {/* Top High-Density Control Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Product Badge */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setCurrentTab('daily-hub')}
              className={`w-8 h-8 rounded ${theme.accentBg} ${theme.accentHover} border border-indigo-400/40 flex items-center justify-center font-black text-white text-xs shadow-sm cursor-pointer transition-colors`}
            >
              AT
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-bold text-sm tracking-tight ${theme.isLight ? 'text-slate-900' : 'text-white'}`}>
                  AutoTax <span className="text-indigo-500">ITC</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dealership Selectors & Live Telemetry */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className={`hidden lg:flex items-center space-x-2 text-[10px] font-mono px-2.5 py-1 rounded border ${
              theme.isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                ERP Sync: Active
              </span>
            </div>

            {/* Selectors */}
            <div className="flex items-center space-x-2">
              
              {/* Dealer Group Selector */}
              <div className="relative">
                <select
                  id="dealer-group-selector"
                  value={selectedDealership.id}
                  onChange={(e) => {
                    const found = dealerships.find((d) => d.id === e.target.value);
                    if (found) {
                      setSelectedDealership(found);
                      setSelectedGstin(found.branches[0].gstin);
                    }
                  }}
                  className={`appearance-none ${selectBgClass} text-[11px] font-medium rounded px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                >
                  {dealerships.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.groupName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Branch GSTIN Selector */}
              <div className="relative">
                <select
                  id="branch-gstin-selector"
                  value={selectedGstin}
                  onChange={(e) => setSelectedGstin(e.target.value)}
                  className={`appearance-none ${selectBgClass} font-mono text-[11px] font-medium rounded px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                >
                  {selectedDealership.branches.map((b) => (
                    <option key={b.gstin} value={b.gstin}>
                      {b.gstin} ({b.state.split(' ')[0]})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Period Selector */}
              <div className="relative">
                <select
                  id="return-period-selector"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={`appearance-none ${selectBgClass} text-[11px] font-medium rounded px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer`}
                >
                  <option value="July 2026">July 2026</option>
                  <option value="June 2026">June 2026</option>
                  <option value="May 2026">May 2026</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Global Theme Selector */}
              <div className="relative">
                <select
                  id="global-theme-selector"
                  value={themeId}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className={`appearance-none ${selectBgClass} font-mono text-[11px] font-semibold rounded px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer`}
                  title="Switch Application Theme"
                >
                  {availableThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      🎨 {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-amber-500 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Quick Sync & Recon Button */}
              <button
                id="header-rerun-recon-btn"
                onClick={onRefreshRecon}
                className={`inline-flex items-center space-x-1 ${theme.accentBg} ${theme.accentHover} text-white text-[11px] font-medium px-2.5 py-1.5 rounded transition-colors cursor-pointer shadow-xs`}
                title="Trigger real-time reconciliation"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Sync &amp; Recon</span>
              </button>

            </div>

            {/* User Pill */}
            <div className={`hidden sm:flex items-center space-x-2 pl-2 border-l ${theme.isLight ? 'border-slate-300' : 'border-slate-700'}`}>
              <div className={`w-6 h-6 rounded-full ${theme.isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'} border border-slate-400/40 flex items-center justify-center font-bold text-[10px]`}>
                RK
              </div>
              <div className="text-left leading-tight">
                <div className={`text-[11px] font-semibold ${theme.isLight ? 'text-slate-900' : 'text-slate-200'}`}>Rajesh Kumar</div>
                <div className={`text-[9px] ${theme.isLight ? 'text-slate-600' : 'text-slate-400'}`}>Finance Controller</div>
              </div>
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
