import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Car, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  Download, 
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { OEM_SCHEMES_MOCK } from '../data/mockDealershipData';
import { DealershipProfile } from '../types';
import confetti from 'canvas-confetti';

interface OEMIncentiveTrackerProps {
  dealership: DealershipProfile;
}

export const OEMIncentiveTracker: React.FC<OEMIncentiveTrackerProps> = ({ dealership }) => {
  const { theme } = useTheme();
  const [schemes, setSchemes] = useState(OEM_SCHEMES_MOCK);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1-FY26');

  const totals = schemes.reduce(
    (acc, s) => {
      acc.claimed += s.claimedAmount;
      acc.passed += s.oemPassedAmount;
      acc.gstLoss += s.gstCreditLoss;
      return acc;
    },
    { claimed: 0, passed: 0, gstLoss: 0 }
  );

  const handleAuditRecon = () => {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    alert(`OEM Scheme Audit run completed for ${dealership.authorizedDealerFor}. Financial vouchers matched against GSTR-2B CDNR credit notes.`);
  };

  const titleText = theme.isLight ? 'text-slate-900' : 'text-white';
  const bodyText = theme.isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = theme.isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Title */}
      <div className={`${theme.cardBg} rounded-lg p-5 border ${theme.cardBorder} shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors duration-200`}>
        <div>
          <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded ${
            theme.isLight ? 'bg-sky-100 text-sky-900 border-sky-300' : 'bg-sky-950 text-sky-300 border-sky-800'
          } border text-[10px] font-mono font-bold uppercase tracking-wider mb-2`}>
            <Car className="w-3 h-3" />
            <span>OEM Incentive & Credit Note Matrix</span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${titleText}`}>
            {dealership.authorizedDealerFor} Scheme & CDNR Credit Reconciler
          </h1>
          <p className={`text-[11px] mt-1 max-w-2xl ${bodyText}`}>
            Automated reconciliation between dealership target achievement circulars, DMS incentive claims, and OEM GSTR-2B Credit Notes (CDNR).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAuditRecon}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-[11px] font-semibold ${theme.accentBg} ${theme.accentHover} text-white transition-colors cursor-pointer shadow-xs`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Reconcile OEM Schemes</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${theme.cardBg} p-3.5 rounded-lg border ${theme.cardBorder} shadow-sm transition-colors duration-200`}>
          <span className={`text-[10px] font-mono uppercase ${mutedText}`}>Total Claimed on OEM</span>
          <div className={`text-xl font-bold font-mono mt-1 ${titleText}`}>₹{(totals.claimed / 100000).toFixed(2)} Lakhs</div>
          <p className={`text-[10px] mt-0.5 ${mutedText}`}>As per Dealership Retail Sales Registers</p>
        </div>

        <div className={`${theme.cardBg} p-3.5 rounded-lg border ${theme.cardBorder} shadow-sm transition-colors duration-200`}>
          <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-semibold">OEM Passed in GSTR-2B</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">₹{(totals.passed / 100000).toFixed(2)} Lakhs</div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">Credit Notes (CDNR) active in 2B</p>
        </div>

        <div className={`${theme.cardBg} p-3.5 rounded-lg border ${theme.cardBorder} shadow-sm transition-colors duration-200`}>
          <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-semibold">Blocked ITC / Shortfall</span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">₹{(totals.gstLoss / 1000).toFixed(0)}k</div>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Short settlement & missing CDNR in GSTR-2B</p>
        </div>
      </div>

      {/* Main High Density Table */}
      <div className={`${theme.cardBg} rounded-lg border ${theme.cardBorder} shadow-sm overflow-hidden transition-colors duration-200`}>
        <div className={`px-4 py-2.5 border-b ${theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'} flex items-center justify-between`}>
          <h2 className={`text-xs font-semibold font-mono uppercase tracking-wider flex items-center space-x-2 ${titleText}`}>
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span>Quarterly OEM Circular & Scheme Breakdown</span>
          </h2>
          <span className={`text-[10px] font-mono ${mutedText}`}>OEM Code: MARUTI-HQ-DELHI</span>
        </div>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead className={`uppercase text-[10px] font-mono tracking-wider border-b ${
              theme.isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}>
              <tr>
                <th className="px-3 py-2">Scheme Name & Circular</th>
                <th className="px-3 py-2">Quarter</th>
                <th className="px-3 py-2 text-right">Dealership Claim</th>
                <th className="px-3 py-2 text-right">OEM Passed (CDNR)</th>
                <th className="px-3 py-2 text-right">Tax Shortfall</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Audit Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.isLight ? 'divide-slate-200' : 'divide-slate-700/50'}`}>
              {schemes.map((s) => (
                <tr key={s.id} className={`transition-colors ${theme.isLight ? 'hover:bg-slate-100/70' : 'hover:bg-slate-700/30'}`}>
                  <td className="px-3 py-2.5">
                    <div className={`font-semibold ${titleText}`}>{s.schemeName}</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${mutedText}`}>Circular: {s.circularNo}</div>
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${bodyText}`}>{s.quarter}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-medium ${titleText}`}>
                    ₹{s.claimedAmount.toLocaleString('en-IN')}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-medium ${titleText}`}>
                    ₹{s.oemPassedAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">
                    {s.gstCreditLoss > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">₹{s.gstCreditLoss.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {s.status === 'RECONCILED' && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        theme.isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                      }`}>
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        Reconciled
                      </span>
                    )}
                    {s.status === 'SHORT_PASSED' && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        theme.isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950/70 text-amber-400 border border-amber-800'
                      }`}>
                        <AlertCircle className="w-2.5 h-2.5 mr-1" />
                        Short Passed
                      </span>
                    )}
                    {s.status === 'PENDING_OEM_CREDIT' && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        theme.isLight ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-rose-950/70 text-rose-400 border border-rose-800'
                      }`}>
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        Missing in 2B
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => alert(`Escalation docket generated for OEM ASM (Area Sales Manager) regarding ${s.schemeName}.`)}
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono transition-colors cursor-pointer ${
                        theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      Export Docket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
