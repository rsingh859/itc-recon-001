import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Car, 
  Truck, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  FileText,
  FileCheck2,
  X
} from 'lucide-react';
import { SAMPLE_SALES_INVOICES, SalesInvoiceItem } from '../data/salesInvoicesData';

export const SalesInvoicesAndIrnView: React.FC = () => {
  const { theme } = useTheme();
  const [invoices, setInvoices] = useState<SalesInvoiceItem[]>(SAMPLE_SALES_INVOICES);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [selectedInvoiceForPass, setSelectedInvoiceForPass] = useState<SalesInvoiceItem | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    if (filterType === 'IRN_GENERATED' && inv.irnStatus !== 'GENERATED') return false;
    if (filterType === 'PENDING_IRN' && inv.irnStatus !== 'PENDING') return false;
    if (filterType === 'FAILED' && inv.irnStatus !== 'FAILED') return false;
    if (filterType === 'EWB' && inv.ewbStatus !== 'GENERATED') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.chassisVin && inv.chassisVin.toLowerCase().includes(q)) ||
        (inv.vehicleModel && inv.vehicleModel.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleGenerateIrnSingle = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          return {
            ...inv,
            irnStatus: 'GENERATED',
            irnNumber: '9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345',
            ackNumber: '112609847199',
            ackDate: '2026-08-21 11:42:00',
            signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z" fill="%23000"/></svg>',
            erpSyncStatus: 'SYNCED',
            failureReason: undefined,
          };
        }
        return inv;
      })
    );
  };

  const handleBatchGenerateIrn = () => {
    setIsBatchGenerating(true);
    setTimeout(() => {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.irnStatus === 'PENDING') {
            return {
              ...inv,
              irnStatus: 'GENERATED',
              irnNumber: '8a7b6c5d4e3f2109876543210fedcba9876543210fedcba9876543210fedcba',
              ackNumber: '112609847990',
              ackDate: '2026-08-21 11:45:00',
              erpSyncStatus: 'SYNCED',
            };
          }
          return inv;
        })
      );
      setIsBatchGenerating(false);
    }, 1200);
  };

  const titleText = theme.isLight ? 'text-slate-900' : 'text-white';
  const bodyText = theme.isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = theme.isLight ? 'text-slate-500' : 'text-slate-400';
  const inputBg = theme.isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500';
  const inactiveBtnBg = theme.isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300' : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner & Operational Actions */}
      <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-5 shadow-lg relative overflow-hidden transition-colors duration-200`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                theme.isLight ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-indigo-950 text-indigo-300 border-indigo-800'
              } border`}>
                <Car className="w-3.5 h-3.5 mr-1" />
                Dealership Outbound Billing Desk
              </span>
              <span className={`text-xs ${mutedText}`}>NIC E-Invoice & E-Way Bill Portal</span>
            </div>
            <h1 className={`text-xl font-bold tracking-tight mt-1.5 ${titleText}`}>
              Sales Invoicing & Gate Pass Manager
            </h1>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${bodyText}`}>
              Auto-generate government IRNs, encrypted 2D QR codes, and E-Way bills for vehicle deliveries and spare parts dispatches.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 text-xs font-mono">
            <button
              onClick={handleBatchGenerateIrn}
              disabled={isBatchGenerating}
              className={`px-4 py-2.5 ${theme.accentBg} ${theme.accentHover} text-white rounded-lg font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer font-sans`}
            >
              <Zap className={`w-4 h-4 ${isBatchGenerating ? 'animate-spin' : ''}`} />
              <span>{isBatchGenerating ? 'Submitting to GSP...' : 'Batch Generate Pending IRNs'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className={`mt-5 pt-4 border-t ${theme.isLight ? 'border-slate-200' : 'border-slate-800'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                filterType === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : inactiveBtnBg
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setFilterType('IRN_GENERATED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                filterType === 'IRN_GENERATED'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : inactiveBtnBg
              }`}
            >
              IRN Ready ({invoices.filter((i) => i.irnStatus === 'GENERATED').length})
            </button>
            <button
              onClick={() => setFilterType('PENDING_IRN')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                filterType === 'PENDING_IRN'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : inactiveBtnBg
              }`}
            >
              Pending IRN ({invoices.filter((i) => i.irnStatus === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterType('FAILED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                filterType === 'FAILED'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : inactiveBtnBg
              }`}
            >
              Failed / Blocked ({invoices.filter((i) => i.irnStatus === 'FAILED').length})
            </button>
            <button
              onClick={() => setFilterType('EWB')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer border ${
                filterType === 'EWB'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : inactiveBtnBg
              }`}
            >
              E-Way Bill Active ({invoices.filter((i) => i.ewbStatus === 'GENERATED').length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VIN, Chassis, Invoice #..."
              className={`rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64 ${inputBg}`}
            />
          </div>

        </div>
      </div>

      {/* Invoice Table */}
      <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden shadow-lg transition-colors duration-200`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase text-[10px] font-mono border-b ${
              theme.isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              <tr>
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Customer & Vehicle / Goods</th>
                <th className="py-3 px-4 text-right">Taxable & Total</th>
                <th className="py-3 px-4">IRN Status</th>
                <th className="py-3 px-4">E-Way Bill</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className={`transition-colors ${theme.isLight ? 'hover:bg-slate-100/70' : 'hover:bg-slate-800/40'}`}>
                  
                  {/* Invoice / Date */}
                  <td className="py-3.5 px-4">
                    <div className={`font-mono font-bold text-xs ${titleText}`}>{inv.invoiceNumber}</div>
                    <div className={`text-[11px] ${mutedText}`}>{inv.invoiceDate}</div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded inline-block mt-1 ${
                      theme.isLight ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {inv.invoiceType.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Customer & Vehicle */}
                  <td className="py-3.5 px-4">
                    <div className={`font-bold font-sans text-xs ${titleText}`}>{inv.customerName}</div>
                    <div className={`text-[10px] font-mono ${mutedText}`}>
                      GSTIN: {inv.customerGstin} ({inv.customerStateCode})
                    </div>
                    {inv.vehicleModel && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-300 font-mono mt-0.5 flex items-center space-x-1">
                        <Car className="w-3 h-3 shrink-0" />
                        <span>{inv.vehicleModel}</span>
                      </div>
                    )}
                    {inv.chassisVin && (
                      <div className={`text-[10px] font-mono ${mutedText}`}>
                        VIN: {inv.chassisVin}
                      </div>
                    )}
                  </td>

                  {/* Amounts */}
                  <td className="py-3.5 px-4 text-right">
                    <div className={`font-mono font-bold ${titleText}`}>
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div className={`text-[10px] font-mono ${mutedText}`}>
                      Taxable: ₹{inv.taxableValue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      GST: ₹{(inv.cgst + inv.sgst + inv.igst + inv.cess).toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* IRN Status */}
                  <td className="py-3.5 px-4">
                    {inv.irnStatus === 'GENERATED' && (
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          theme.isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          IRN GENERATED
                        </span>
                        <div className={`text-[9px] font-mono mt-1 truncate max-w-[140px] ${mutedText}`} title={inv.irnNumber}>
                          {inv.irnNumber?.slice(0, 16)}...
                        </div>
                      </div>
                    )}
                    {inv.irnStatus === 'PENDING' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        theme.isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        <Clock className="w-3 h-3 mr-1" />
                        PENDING SUBMISSION
                      </span>
                    )}
                    {inv.irnStatus === 'FAILED' && (
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          theme.isLight ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          ERROR: PIN/STATE
                        </span>
                        <p className="text-[10px] text-rose-600 dark:text-rose-300 mt-1 max-w-[180px] leading-tight">
                          {inv.failureReason}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* E-Way Bill */}
                  <td className="py-3.5 px-4">
                    {inv.ewbStatus === 'GENERATED' && (
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          theme.isLight ? 'bg-teal-100 text-teal-900 border border-teal-300' : 'bg-teal-950 text-teal-300 border border-teal-800'
                        }`}>
                          <Truck className="w-3 h-3 mr-1" />
                          EWB ACTIVE
                        </span>
                        <div className={`text-[10px] font-mono mt-0.5 ${bodyText}`}>
                          {inv.vehicleRegistration || 'MH-04-AX-9912'}
                        </div>
                      </div>
                    )}
                    {inv.ewbStatus === 'PENDING' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                        EWB Required (&gt;₹50k)
                      </span>
                    )}
                    {inv.ewbStatus === 'NOT_REQUIRED' && (
                      <span className={`text-[10px] font-mono ${mutedText}`}>
                        Not Required (Services)
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right">
                    {inv.irnStatus === 'GENERATED' ? (
                      <button
                        onClick={() => setSelectedInvoiceForPass(inv)}
                        className={`px-2.5 py-1.5 rounded font-mono text-[11px] transition-colors inline-flex items-center space-x-1 cursor-pointer border ${
                          theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                        }`}
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Gate Pass</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateIrnSingle(inv.id)}
                        className={`px-3 py-1.5 ${theme.accentBg} ${theme.accentHover} text-white rounded font-mono text-[11px] transition-colors inline-flex items-center space-x-1 cursor-pointer font-bold shadow-sm`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>Generate IRN</span>
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Delivery Bay Gate Pass Modal */}
      {selectedInvoiceForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-mono text-xs transition-colors duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${theme.isLight ? 'border-slate-200' : 'border-slate-800'} pb-3`}>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-bold text-sm font-sans ${titleText}`}>
                  Statutory Vehicle Delivery Bay Gate Pass
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPass(null)}
                className={`${mutedText} hover:text-slate-900 dark:hover:text-white cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white text-slate-950 p-4 rounded-lg space-y-3 font-sans shadow-inner border border-slate-200">
              <div className="text-center border-b pb-2">
                <h4 className="font-black text-sm uppercase tracking-tight">SAI MOTORS AUTOMOTIVE HUB</h4>
                <p className="text-[10px] text-slate-600 font-mono">GSTIN: 27AAACS1234A1Z5 • Mumbai Showroom Delivery Bay</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded">
                  E-INVOICE VERIFIED &amp; GATE DISPATCH CLEARED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px]">INVOICE NUMBER</span>
                  <strong>{selectedInvoiceForPass.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">CUSTOMER NAME</span>
                  <strong className="truncate block">{selectedInvoiceForPass.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">VEHICLE CHASSIS / VIN</span>
                  <strong>{selectedInvoiceForPass.chassisVin || 'N/A (Spare Parts)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">E-WAY BILL NUMBER</span>
                  <strong>{selectedInvoiceForPass.ewbNumber || '291009847162'}</strong>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                <div className="text-[10px] font-mono">
                  <span className="text-slate-500 block">NIC IRN ACK NUMBER:</span>
                  <span className="font-bold">{selectedInvoiceForPass.ackNumber || '112609847162'}</span>
                  <span className="text-slate-500 block mt-1">TOTAL INVOICE VALUE:</span>
                  <span className="text-emerald-700 font-bold text-sm">
                    ₹{selectedInvoiceForPass.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-16 h-16 bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-slate-700">
                  <QrCode className="w-12 h-12" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedInvoiceForPass(null)}
                className={`px-3 py-1.5 rounded cursor-pointer text-xs ${
                  theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert("Printing Delivery Bay Gate Pass with embedded NIC QR code.");
                  setSelectedInvoiceForPass(null);
                }}
                className={`px-4 py-1.5 ${theme.accentBg} ${theme.accentHover} text-white rounded font-bold text-xs cursor-pointer shadow-md flex items-center space-x-1`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statutory Gate Pass</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
