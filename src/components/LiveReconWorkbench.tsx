import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  FileWarning, 
  Download, 
  MessageSquare, 
  Layers, 
  Car,
  ChevronRight,
  Info,
  ShieldAlert,
  Sparkles,
  Activity,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { ReconciledRecord, MatchStatus, DealershipProfile } from '../types';
import confetti from 'canvas-confetti';

interface LiveReconWorkbenchProps {
  records: ReconciledRecord[];
  dealership: DealershipProfile;
  activeGstin: string;
  period: string;
  onOpenNoticeModal: (record: ReconciledRecord) => void;
  onToggleHoldPayment: (recordId: string) => void;
  onApproveRecord: (recordId: string) => void;
}

export const LiveReconWorkbench: React.FC<LiveReconWorkbenchProps> = ({
  records,
  dealership,
  activeGstin,
  period,
  onOpenNoticeModal,
  onToggleHoldPayment,
  onApproveRecord,
}) => {
  const { theme } = useTheme();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compute Metrics
  const metrics = useMemo(() => {
    let prTotalTax = 0;
    let b2TotalTax = 0;
    let matchedTax = 0;
    let atRiskTax = 0;
    let rule37Tax = 0;
    let blocked175Tax = 0;

    records.forEach((r) => {
      if (r.prItem) {
        prTotalTax += r.prItem.totalTax;
      }
      if (r.gstr2bItem) {
        b2TotalTax += r.gstr2bItem.totalTax;
      }

      if (r.matchStatus === 'EXACT_MATCH' || r.matchStatus === 'FUZZY_MATCH' || r.matchStatus === 'OEM_CREDIT_PENDING') {
        matchedTax += (r.prItem ? r.prItem.totalTax : r.gstr2bItem ? r.gstr2bItem.totalTax : 0);
      } else if (r.matchStatus === 'MISSING_IN_2B') {
        atRiskTax += (r.prItem ? r.prItem.totalTax : 0);
      } else if (r.matchStatus === 'RULE_37_RISK') {
        rule37Tax += (r.prItem ? r.prItem.totalTax : 0);
      } else if (r.matchStatus === 'BLOCKED_17_5') {
        blocked175Tax += (r.prItem ? r.prItem.totalTax : 0);
      }
    });

    const matchPercent = prTotalTax > 0 ? Math.min(100, Math.round((matchedTax / prTotalTax) * 100)) : 0;

    return {
      prTotalTax,
      b2TotalTax,
      matchedTax,
      atRiskTax,
      rule37Tax,
      blocked175Tax,
      matchPercent,
    };
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'ALL' && r.matchStatus !== statusFilter) return false;

      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'OEM' && !r.isOemItem) return false;
        if (categoryFilter === 'NON_OEM' && r.isOemItem) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vendor = r.prItem?.vendorName.toLowerCase() || r.gstr2bItem?.supplierName.toLowerCase() || '';
        const inv = r.prItem?.invoiceNo.toLowerCase() || r.gstr2bItem?.invoiceNo.toLowerCase() || '';
        const gstin = r.prItem?.vendorGstin.toLowerCase() || r.gstr2bItem?.supplierGstin.toLowerCase() || '';
        if (!vendor.includes(q) && !inv.includes(q) && !gstin.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [records, statusFilter, categoryFilter, searchQuery]);

  const triggerExport = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    alert(`Reconciliation CSV payload downloaded for ${dealership.groupName} (${activeGstin}).`);
  };

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'EXACT_MATCH':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
            Exact Match
          </span>
        );
      case 'FUZZY_MATCH':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-800">
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            Fuzzy (Syntax)
          </span>
        );
      case 'VALUE_MISMATCH':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950/70 text-amber-400 border border-amber-800">
            <AlertCircle className="w-2.5 h-2.5 mr-1" />
            Value Mismatch
          </span>
        );
      case 'MISSING_IN_2B':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-800">
            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
            Missing in 2B
          </span>
        );
      case 'MISSING_IN_PR':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-800">
            <Info className="w-2.5 h-2.5 mr-1" />
            Unclaimed in Books
          </span>
        );
      case 'RULE_37_RISK':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-orange-950/70 text-orange-400 border border-orange-800">
            <FileWarning className="w-2.5 h-2.5 mr-1" />
            Rule 37 (&gt;180d)
          </span>
        );
      case 'BLOCKED_17_5':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-600">
            <ShieldAlert className="w-2.5 h-2.5 mr-1" />
            Blocked 17(5)
          </span>
        );
      case 'OEM_CREDIT_PENDING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-sky-950/70 text-sky-300 border border-sky-800">
            <Car className="w-2.5 h-2.5 mr-1" />
            OEM Scheme CDNR
          </span>
        );
    }
  };

  const titleText = theme.isLight ? 'text-slate-900' : 'text-white';
  const bodyText = theme.isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = theme.isLight ? 'text-slate-500' : 'text-slate-400';
  const inputBg = theme.isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-900 border-slate-700 text-slate-200';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      
      {/* High-Density Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        
        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>Total ITC in Books</p>
          <p className={`text-xl font-bold font-mono mt-1 ${titleText}`}>₹{(metrics.prTotalTax / 100000).toFixed(2)}L</p>
          <div className="mt-1 flex items-center text-[10px] text-indigo-500 font-medium">
            <span>DMS Purchase Register</span>
          </div>
        </div>

        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-300 font-semibold">GSTR-2B Available</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">₹{(metrics.b2TotalTax / 100000).toFixed(2)}L</p>
          <div className={`mt-1 flex items-center text-[10px] ${mutedText} font-medium`}>
            <span>Auto-Drafted from GSTN</span>
          </div>
        </div>

        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Matched Ratio</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{metrics.matchPercent}%</p>
          <div className="mt-1 flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Approved for 3B Table 4</span>
          </div>
        </div>

        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">At-Risk (Missing 2B)</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">₹{(metrics.atRiskTax / 1000).toLocaleString('en-IN')}k</p>
          <div className="mt-1 flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-medium">
            <span>Payment Hold Active</span>
          </div>
        </div>

        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-orange-400 font-semibold">Rule 37 Reversals</p>
          <p className="text-xl font-bold text-amber-600 dark:text-orange-400 font-mono mt-1">₹{(metrics.rule37Tax / 1000).toLocaleString('en-IN')}k</p>
          <div className="mt-1 flex items-center text-[10px] text-amber-600 dark:text-orange-300 font-medium">
            <span>&gt;180 Days Unpaid</span>
          </div>
        </div>

        <div className={`${theme.cardBg} p-3.5 border ${theme.cardBorder} rounded-lg shadow-sm transition-colors duration-200`}>
          <p className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>Blocked Sec 17(5)</p>
          <p className={`text-xl font-bold font-mono mt-1 ${titleText}`}>₹{(metrics.blocked175Tax / 1000).toLocaleString('en-IN')}k</p>
          <div className={`mt-1 flex items-center text-[10px] ${mutedText} font-medium`}>
            <span>Staff Welfare / Catering</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className={`${theme.cardBg} p-3 rounded-lg border ${theme.cardBorder} flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs shadow-sm transition-colors duration-200`}>
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            id="recon-search-input"
            type="text"
            placeholder="Search Supplier, GSTIN, Invoice No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${inputBg}`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`text-[11px] rounded px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputBg}`}
          >
            <option value="ALL">All Statuses ({records.length})</option>
            <option value="EXACT_MATCH">Exact Match</option>
            <option value="FUZZY_MATCH">Fuzzy Match (Syntax)</option>
            <option value="VALUE_MISMATCH">Value Mismatch</option>
            <option value="MISSING_IN_2B">Missing in 2B (At-Risk)</option>
            <option value="MISSING_IN_PR">Unclaimed in Books</option>
            <option value="RULE_37_RISK">Rule 37 (&gt;180 Days)</option>
            <option value="BLOCKED_17_5">Blocked 17(5)</option>
            <option value="OEM_CREDIT_PENDING">OEM Scheme CDNR</option>
          </select>

          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`text-[11px] rounded px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inputBg}`}
          >
            <option value="ALL">All Supply Categories</option>
            <option value="OEM">OEM Items (Vehicles, Spares, Rebates)</option>
            <option value="NON_OEM">Local Vendors & Logistics</option>
          </select>

          <button
            id="export-recon-excel-btn"
            onClick={triggerExport}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-[11px] font-semibold ${theme.accentBg} ${theme.accentHover} text-white transition-colors cursor-pointer shadow-xs`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>

      {/* Main High-Density Grid Table & Quick Health Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left 3 Columns: Grid Table */}
        <div className={`lg:col-span-3 ${theme.cardBg} border ${theme.cardBorder} rounded-lg flex flex-col overflow-hidden shadow-sm transition-colors duration-200`}>
          
          <div className={`px-4 py-2.5 border-b ${theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-slate-700'} flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              <h2 className={`text-xs font-semibold ${titleText}`}>
                Urgent Discrepancy & ITC Reconciliation Grid
              </h2>
              <span className={`text-[10px] font-mono ${mutedText}`}>({filteredRecords.length} records)</span>
            </div>
            <span className={`text-[10px] font-mono ${mutedText}`}>
              GSTIN: <span className={`font-semibold ${titleText}`}>{activeGstin}</span> • {period}
            </span>
          </div>

          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-10 text-[10px] font-mono uppercase tracking-wider border-b ${
                theme.isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                <tr>
                  <th className="px-3 py-2 text-center w-28">Status</th>
                  <th className="px-3 py-2">DMS Purchase Register (Books)</th>
                  <th className="px-3 py-2 text-right">DMS Tax</th>
                  <th className="px-3 py-2">GSTR-2B (GSTN Auto-Draft)</th>
                  <th className="px-3 py-2 text-right">2B Tax</th>
                  <th className="px-3 py-2 text-right">Diff</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${theme.isLight ? 'divide-slate-200' : 'divide-slate-700/50'}`}>
                {filteredRecords.map((record) => {
                  const pr = record.prItem;
                  const b2 = record.gstr2bItem;

                  return (
                    <tr 
                      key={record.id} 
                      className={`transition-colors ${
                        theme.isLight 
                          ? (record.matchStatus === 'MISSING_IN_2B' ? 'bg-rose-50/70' : record.matchStatus === 'RULE_37_RISK' ? 'bg-amber-50/70' : 'hover:bg-slate-100/70')
                          : (record.matchStatus === 'MISSING_IN_2B' ? 'bg-rose-950/20' : record.matchStatus === 'RULE_37_RISK' ? 'bg-orange-950/20' : 'hover:bg-slate-700/30')
                      }`}
                    >
                      {/* Status */}
                      <td className="px-3 py-2.5 text-center align-top">
                        {getStatusBadge(record.matchStatus)}
                        {record.matchScore > 0 && record.matchScore < 100 && (
                          <div className="text-[9px] font-mono text-indigo-500 font-bold mt-0.5">
                            {record.matchScore}% Match
                          </div>
                        )}
                      </td>

                      {/* DMS Item */}
                      <td className="px-3 py-2.5 align-top max-w-xs">
                        {pr ? (
                          <div>
                            <div className={`font-semibold flex items-center space-x-1.5 ${titleText}`}>
                              <span>{pr.vendorName}</span>
                              {pr.category === 'DEMO_VEHICLE' && (
                                <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                                  theme.isLight ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-indigo-900/60 text-indigo-300'
                                }`}>DEMO</span>
                              )}
                            </div>
                            <div className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                              Inv: <span className={`font-semibold ${titleText}`}>{pr.invoiceNo}</span> • {pr.invoiceDate}
                            </div>
                            <div className={`text-[9px] font-mono ${mutedText}`}>
                              GSTIN: {pr.vendorGstin}
                            </div>
                            {pr.paymentStatus === 'UNPAID' && (
                              <div className="text-[9px] font-mono text-amber-600 dark:text-orange-400 font-semibold mt-0.5">
                                Unpaid ({pr.daysOutstanding}d aging)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`${mutedText} italic text-[10px]`}>— Unbooked in DMS —</span>
                        )}
                      </td>

                      {/* DMS Tax */}
                      <td className={`px-3 py-2.5 text-right align-top font-mono font-medium ${titleText}`}>
                        {pr ? `₹${pr.totalTax.toLocaleString('en-IN')}` : '—'}
                        {pr && pr.cess > 0 && (
                          <div className={`text-[9px] ${mutedText}`}>
                            (Cess: ₹{(pr.cess / 1000).toFixed(0)}k)
                          </div>
                        )}
                      </td>

                      {/* 2B Item */}
                      <td className="px-3 py-2.5 align-top max-w-xs">
                        {b2 ? (
                          <div>
                            <div className={`font-semibold ${titleText}`}>{b2.supplierName}</div>
                            <div className={`text-[10px] font-mono mt-0.5 ${mutedText}`}>
                              Inv: <span className={`font-semibold ${titleText}`}>{b2.invoiceNo}</span> ({b2.invoiceType})
                            </div>
                            <div className={`text-[9px] font-mono ${mutedText}`}>
                              GSTIN: {b2.supplierGstin} • Filed: {b2.gstr1FilingDate}
                            </div>
                            {b2.itcAvailability === 'N' && (
                              <div className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                                Ineligible: {b2.itcReason || 'Sec 17(5)'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-rose-600 dark:text-rose-400 font-semibold text-[10px] flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Supplier omitted GSTR-1</span>
                          </div>
                        )}
                      </td>

                      {/* 2B Tax */}
                      <td className={`px-3 py-2.5 text-right align-top font-mono font-medium ${titleText}`}>
                        {b2 ? `₹${b2.totalTax.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Diff */}
                      <td className="px-3 py-2.5 text-right align-top font-mono font-bold">
                        {record.taxDifference === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">₹{record.taxDifference.toLocaleString('en-IN')}</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2.5 text-center align-top">
                        <div className="flex flex-col items-center space-y-1">
                          
                          {record.matchStatus === 'MISSING_IN_2B' && (
                            <button
                              onClick={() => onOpenNoticeModal(record)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-[10px] font-semibold transition-colors shadow-xs cursor-pointer"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>{record.vendorActionStatus === 'WHATSAPP_SENT' ? 'Notice Sent' : 'Send Notice'}</span>
                            </button>
                          )}

                          {(record.matchStatus === 'EXACT_MATCH' || record.matchStatus === 'FUZZY_MATCH' || record.matchStatus === 'OEM_CREDIT_PENDING') && (
                            <button
                              onClick={() => onApproveRecord(record.id)}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-colors cursor-pointer ${
                                theme.isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
                              }`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                              <span>Approved</span>
                            </button>
                          )}

                          {record.matchStatus === 'RULE_37_RISK' && (
                            <button
                              onClick={() => onOpenNoticeModal(record)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold transition-colors shadow-xs cursor-pointer"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>Escalate</span>
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right 1 Column: Health Donut & Security Sidebar */}
        <div className="space-y-4">
          
          {/* Health Donut Card */}
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-4 shadow-sm transition-colors duration-200`}>
            <h3 className={`text-xs font-mono uppercase ${mutedText} mb-3 tracking-wider flex items-center justify-between`}>
              <span>Reconciliation Health</span>
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
            </h3>

            <div className="flex items-center justify-center h-20 mb-3">
              <div className={`relative w-18 h-18 rounded-full border-4 border-indigo-600 flex items-center justify-center ${
                theme.isLight ? 'bg-indigo-50 border-t-slate-300' : 'bg-slate-900/50 border-t-slate-700'
              }`}>
                <span className={`text-base font-mono font-bold ${titleText}`}>{metrics.matchPercent}%</span>
              </div>
            </div>

            <ul className={`space-y-2 text-[11px] border-t ${theme.isLight ? 'border-slate-200' : 'border-slate-700/60'} pt-2.5`}>
              <li className="flex justify-between items-center">
                <span className={mutedText}>Fully Matched</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">₹{(metrics.matchedTax / 100000).toFixed(2)}L</span>
              </li>
              <li className="flex justify-between items-center">
                <span className={mutedText}>At Risk (Missing 2B)</span>
                <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">₹{(metrics.atRiskTax / 1000).toFixed(0)}k</span>
              </li>
              <li className="flex justify-between items-center">
                <span className={mutedText}>Rule 37 Reversal</span>
                <span className="text-amber-600 dark:text-orange-400 font-mono font-bold">₹{(metrics.rule37Tax / 1000).toFixed(0)}k</span>
              </li>
            </ul>
          </div>

          {/* Quick Security Badge Box */}
          <div className={`border rounded-lg p-3.5 ${
            theme.isLight ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950' : 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300'
          }`}>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider mb-2">
              Security & Engine Info
            </h3>
            <div className={`space-y-1.5 text-[10px] ${theme.isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>AES-256 GSTR Data Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>ISO 27001 / DPDP 2023 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Postgres RLS Tenant Isolation</span>
              </div>
            </div>
          </div>

          {/* Quick OEM Notice summary */}
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg p-3 text-[11px] shadow-sm transition-colors duration-200`}>
            <span className={`text-[10px] font-mono uppercase ${mutedText}`}>OEM Connection</span>
            <div className={`font-semibold mt-0.5 ${titleText}`}>{dealership.authorizedDealerFor}</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-300 font-mono mt-1">DMS: {dealership.dmsSoftware} (Auto-Sync)</div>
          </div>

        </div>

      </div>

    </div>
  );
};
