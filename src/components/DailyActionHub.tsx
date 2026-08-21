import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  FileSpreadsheet, 
  MessageSquare, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Truck,
  Car,
  FileCheck2
} from 'lucide-react';
import { SAMPLE_COMPLIANCE_ALERTS } from '../data/complianceOsData';

interface DailyActionHubProps {
  onNavigateTab: (tabId: string) => void;
  onOpenNoticeModal?: () => void;
}

export const DailyActionHub: React.FC<DailyActionHubProps> = ({ 
  onNavigateTab,
  onOpenNoticeModal 
}) => {
  const { theme } = useTheme();
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);
  const [isFixingIrn, setIsFixingIrn] = useState<boolean>(false);
  const [irnFixed, setIrnFixed] = useState<boolean>(false);
  const [scfClaimed, setScfClaimed] = useState<boolean>(false);
  const [copilotQuery, setCopilotQuery] = useState<string>('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);

  const handleResolveAlert = (id: string) => {
    setResolvedAlerts((prev) => [...prev, id]);
  };

  const handleAutoFixIrn = () => {
    setIsFixingIrn(true);
    setTimeout(() => {
      setIsFixingIrn(false);
      setIrnFixed(true);
      setResolvedAlerts((prev) => [...prev, 'ALT-102']);
    }, 800);
  };

  const handleClaimScf = () => {
    setScfClaimed(true);
  };

  const handleAskQuickCopilot = (question: string) => {
    setCopilotQuery(question);
    if (question.includes('blocked') || question.includes('ITC')) {
      setCopilotAnswer(
        "💡 **ITC Safety Report:** ₹48.60L safe in GSTR-2B. ₹3.42L blocked on 6 non-filing vendors with ERP payment locks active. No 180-day Rule 37 interest risk if top 3 items are cleared this week."
      );
    } else {
      setCopilotAnswer(
        "💡 **Filing Readiness:** GSTR-3B Table 4 is 98.4% ready. Net claimable ITC is ₹47.06L after excluding ₹1.20L in ineligible 17(5) and reversed credits."
      );
    }
  };

  // Helper theme-adaptive class definitions
  const titleText = theme.isLight ? 'text-slate-900' : 'text-white';
  const bodyText = theme.isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = theme.isLight ? 'text-slate-500' : 'text-slate-400';
  const subCardBg = theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800';
  const cardBorderDivider = theme.isLight ? 'border-slate-200' : 'border-slate-800';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Welcome & High-Impact Executive Summary */}
      <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-5 shadow-lg relative overflow-hidden transition-colors duration-200`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                theme.isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              } border`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                DMS & GSP Pipeline Synchronized
              </span>
              <span className={`text-xs ${mutedText}`}>August 2026 Filing Period</span>
            </div>
            <h1 className={`text-xl font-bold tracking-tight mt-1.5 ${titleText}`}>
              Welcome back, Finance Controller
            </h1>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${bodyText}`}>
              AutoTax ITC is actively protecting your input tax credit, generating e-invoices in real-time, and locking ERP payments to non-compliant suppliers.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
            <div className={`p-2.5 rounded-lg border text-right ${subCardBg}`}>
              <span className={`text-[10px] block ${mutedText}`}>Connected ERP:</span>
              <strong className={`font-sans text-xs ${titleText}`}>CDK Global + Tally Prime</strong>
            </div>
            <button
              onClick={() => onNavigateTab('recon-workbench')}
              className={`px-4 py-2.5 ${theme.accentBg} ${theme.accentHover} text-white rounded-lg font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer font-sans`}
            >
              <span>Open 2B Recon Grid</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top 4 Core Metrics for Business Owner */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t ${cardBorderDivider}`}>
          
          <div className={`p-3.5 rounded-lg border transition-all ${subCardBg}`}>
            <div className={`flex items-center justify-between text-xs ${mutedText}`}>
              <span>Compliance Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500 mt-1">98.4%</div>
            <div className={`text-[11px] mt-0.5 ${mutedText}`}>Zero ASMT-10 tax variance</div>
          </div>

          <div className={`p-3.5 rounded-lg border transition-all ${subCardBg}`}>
            <div className={`flex items-center justify-between text-xs ${mutedText}`}>
              <span>Safe Claimable ITC (2B)</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className={`text-2xl font-bold mt-1 ${titleText}`}>₹48,60,400</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">100% matched & verified</div>
          </div>

          <div className={`p-3.5 rounded-lg border transition-all ${subCardBg}`}>
            <div className={`flex items-center justify-between text-xs ${mutedText}`}>
              <span>At-Risk / Action Required</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500 mt-1">₹4,18,200</div>
            <div className={`text-[11px] mt-0.5 ${mutedText}`}>14 invoices nearing 180 days</div>
          </div>

          <div className={`p-3.5 rounded-lg border transition-all ${subCardBg}`}>
            <div className={`flex items-center justify-between text-xs ${mutedText}`}>
              <span>FinTech Early-Pay Rebate</span>
              <DollarSign className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">₹2,42,000</div>
            <div className="text-[11px] text-teal-600 dark:text-teal-300 mt-0.5">Instant cash discount ready</div>
          </div>

        </div>
      </div>

      {/* 2. Priority Attention Queue - 3 High-Impact Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-bold flex items-center space-x-2 ${titleText}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Priority Attention Queue (Action Required Today)</span>
          </h2>
          <span className={`text-xs ${mutedText}`}>
            3 items require decision
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Action Card 1: Outbound E-Invoice Failure */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            irnFixed 
              ? (theme.isLight ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-800') 
              : (theme.isLight ? 'bg-rose-50/50 border-rose-300 shadow-sm' : 'bg-slate-900 border-rose-800/80 shadow-md')
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  theme.isLight ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  🔴 URGENT • SALES
                </span>
                <span className={`text-xs font-mono font-bold ${titleText}`}>4 Invoices</span>
              </div>
              <h3 className={`font-bold text-sm ${titleText}`}>Outbound IRN Generation Blocked</h3>
              <p className={`text-xs mt-1 leading-relaxed ${bodyText}`}>
                State code mismatch on Exide & Fleet customer invoices (MH 27 vs GJ 24). Deliveries held at gate.
              </p>
              <div className="mt-2.5 text-xs text-rose-600 dark:text-rose-300 font-mono font-semibold">
                Impact: <strong>₹1,84,500 billing held</strong>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t ${cardBorderDivider}`}>
              {irnFixed ? (
                <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>State codes auto-corrected & IRNs generated!</span>
                </div>
              ) : (
                <button
                  onClick={handleAutoFixIrn}
                  disabled={isFixingIrn}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFixingIrn ? 'animate-spin' : ''}`} />
                  <span>{isFixingIrn ? 'Sanitizing & Retrying...' : '1-Click Auto-Fix & Push IRN'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Card 2: Rule 37 180-Day Interest Risk */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            resolvedAlerts.includes('ALT-101') 
              ? (theme.isLight ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/20 border-emerald-800') 
              : (theme.isLight ? 'bg-amber-50/50 border-amber-300 shadow-sm' : 'bg-slate-900 border-amber-800/80 shadow-md')
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  theme.isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  🟡 RULE 37 CLAWBACK
                </span>
                <span className={`text-xs font-mono font-bold ${titleText}`}>14 Invoices</span>
              </div>
              <h3 className={`font-bold text-sm ${titleText}`}>Invoices Approaching 180 Days</h3>
              <p className={`text-xs mt-1 leading-relaxed ${bodyText}`}>
                ₹4.18L ITC must be reversed with daily 18% p.a. interest under Section 50 if unpaid within 15 days.
              </p>
              <div className="mt-2.5 text-xs text-amber-600 dark:text-amber-300 font-mono font-semibold">
                Daily interest risk: <strong>₹206/day</strong>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t ${cardBorderDivider}`}>
              {resolvedAlerts.includes('ALT-101') ? (
                <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marked for Table 4(B)(2) Reversal</span>
                </div>
              ) : (
                <button
                  onClick={() => handleResolveAlert('ALT-101')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Release Payment or Schedule Reversal</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Card 3: Non-Filing Vendors */}
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-4 flex flex-col justify-between shadow-sm transition-colors duration-200`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  theme.isLight ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}>
                  🛡️ VENDOR GUARD
                </span>
                <span className={`text-xs font-mono font-bold ${titleText}`}>6 Suppliers</span>
              </div>
              <h3 className={`font-bold text-sm ${titleText}`}>ERP Payment Locks Active</h3>
              <p className={`text-xs mt-1 leading-relaxed ${bodyText}`}>
                6 suppliers did not file GSTR-1. ₹3.42L in payment vouchers locked in Tally/SAP to protect your cash.
              </p>
              <div className="mt-2.5 text-xs text-indigo-600 dark:text-indigo-300 font-mono font-semibold">
                Status: <strong>Payments securely halted</strong>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t ${cardBorderDivider}`}>
              <button
                onClick={() => {
                  if (onOpenNoticeModal) {
                    onOpenNoticeModal();
                  } else {
                    onNavigateTab('recon-workbench');
                  }
                }}
                className={`w-full py-2 ${theme.accentBg} ${theme.accentHover} text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send WhatsApp Sec 16(2)(aa) Notice</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Operational Quick Navigation & Real-World Dealer Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Left: Quick Workflow Shortcuts (7 Cols) */}
        <div className={`md:col-span-7 ${theme.cardBg} border ${theme.cardBorder} rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200`}>
          <div className={`flex items-center justify-between border-b ${cardBorderDivider} pb-3`}>
            <div>
              <h3 className={`font-bold text-sm ${titleText}`}>Frequent Operational Tasks</h3>
              <p className={`text-xs ${mutedText}`}>Direct shortcuts to daily accounting and compliance workflows</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <button
              onClick={() => onNavigateTab('sales-invoices')}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer group ${
                theme.isLight ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300' : 'bg-slate-950 border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/20'
              }`}
            >
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <Car className="w-5 h-5" />
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <strong className={`text-xs block font-bold ${titleText}`}>E-Invoicing & E-Way Bills</strong>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Generate IRN and Delivery Bay Gate Passes for vehicles.</p>
            </button>

            <button
              onClick={() => onNavigateTab('recon-workbench')}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer group ${
                theme.isLight ? 'bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300' : 'bg-slate-950 border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/20'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <FileSpreadsheet className="w-5 h-5" />
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <strong className={`text-xs block font-bold ${titleText}`}>GSTR-2B vs ERP Recon</strong>
              <p className={`text-[11px] mt-1 ${mutedText}`}>7-tier matching for spare parts, lubricants, and OEM bills.</p>
            </button>

            <button
              onClick={() => onNavigateTab('oem-tracker')}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer group ${
                theme.isLight ? 'bg-slate-50 border-slate-200 hover:bg-amber-50 hover:border-amber-300' : 'bg-slate-950 border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/20'
              }`}
            >
              <div className="flex items-center justify-between text-amber-500 mb-1">
                <TrendingUp className="w-5 h-5" />
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <strong className={`text-xs block font-bold ${titleText}`}>OEM Scheme & Bonus Claims</strong>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Reconcile Maruti/Hyundai exchange bonus circulars vs credit notes.</p>
            </button>

            <button
              onClick={() => onNavigateTab('gstr3b-summary')}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer group ${
                theme.isLight ? 'bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-300' : 'bg-slate-950 border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/20'
              }`}
            >
              <div className="flex items-center justify-between text-teal-500 mb-1">
                <FileCheck2 className="w-5 h-5" />
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
              </div>
              <strong className={`text-xs block font-bold ${titleText}`}>GSTR-3B Table 4 & Filing</strong>
              <p className={`text-[11px] mt-1 ${mutedText}`}>Auto-drafted Table 4 and 1-click ASMT-10 notice defense dossier.</p>
            </button>

          </div>
        </div>

        {/* Right: FinTech Rebates & Quick Copilot Bar (5 Cols) */}
        <div className="md:col-span-5 space-y-4">
          
          {/* FinTech SCF Cash Discount Banner */}
          <div className={`border rounded-xl p-4.5 transition-colors duration-200 ${
            theme.isLight 
              ? 'bg-gradient-to-br from-teal-50 to-emerald-100/70 border-teal-200 shadow-sm' 
              : 'bg-gradient-to-br from-teal-950/70 to-slate-900 border-teal-800/80 shadow-md'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  theme.isLight ? 'bg-teal-200 text-teal-950 border border-teal-300' : 'bg-teal-900 text-teal-200 border border-teal-700'
                }`}>
                  FINTECH EARNINGS
                </span>
                <h4 className={`font-bold text-sm mt-1.5 ${titleText}`}>Vayana Early-Pay Cash Discount</h4>
                <p className={`text-xs mt-1 ${bodyText}`}>
                  ₹1.42 Cr in 100% matched GSTR-2B invoices qualify for 1.75% vendor cash discounting.
                </p>
                <div className="text-xs text-teal-700 dark:text-teal-300 font-mono font-bold mt-2">
                  Net Dealer Gain: <strong>₹2,42,000 EBITDA</strong>
                </div>
              </div>
            </div>

            <div className={`mt-3.5 pt-3 border-t ${theme.isLight ? 'border-teal-200' : 'border-teal-900/60'}`}>
              {scfClaimed ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-300 font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dispatched to Vayana TradeX Financing Desk!</span>
                </div>
              ) : (
                <button
                  onClick={handleClaimScf}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Unlock ₹2.42L Early Payment Rebate
                </button>
              )}
            </div>
          </div>

          {/* Quick Copilot Questions */}
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-4 space-y-2.5 shadow-sm transition-colors duration-200`}>
            <div className="flex items-center space-x-2 text-xs font-bold text-purple-600 dark:text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Ask Compliance Copilot</span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                onClick={() => handleAskQuickCopilot('How much ITC is blocked?')}
                className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                "How much ITC is blocked?"
              </button>
              <button
                onClick={() => handleAskQuickCopilot('Is GSTR-3B Table 4 ready to file?')}
                className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                "Is GSTR-3B Table 4 ready?"
              </button>
            </div>

            {copilotAnswer && (
              <div className={`p-3 rounded-lg border text-xs leading-relaxed font-sans mt-2 animate-in fade-in ${
                theme.isLight ? 'bg-purple-50 text-slate-900 border-purple-200' : 'bg-slate-950 text-slate-200 border-purple-900/60'
              }`}>
                {copilotAnswer}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
