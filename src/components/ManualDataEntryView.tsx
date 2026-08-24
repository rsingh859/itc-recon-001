import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  PurchaseRegisterItem, 
  DealershipCategory, 
  DealershipProfile 
} from '../types';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Building2,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { ingestApi } from '../api';
import confetti from 'canvas-confetti';

interface ManualDataEntryViewProps {
  dealership: DealershipProfile;
  activeGstin: string;
  onNavigateTab: (tabId: string) => void;
  onRefreshRecon: () => void;
}

interface EditablePRRow {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  vendorGstin: string;
  vendorName: string;
  category: DealershipCategory;
  taxableValue: number;
  gstRate: number; // 0, 5, 12, 18, 28
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  daysOutstanding: number;
}

export const ManualDataEntryView: React.FC<ManualDataEntryViewProps> = ({
  dealership,
  activeGstin,
  onNavigateTab,
  onRefreshRecon,
}) => {
  const { theme } = useTheme();
  const branchStateCode = activeGstin.substring(0, 2);

  const initialRow = (): EditablePRRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    invoiceNo: `INV/PR/${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    vendorGstin: '07AAACU1234F1Z8',
    vendorName: 'Uno Minda Auto Components Pvt Ltd',
    category: 'SPARE_PARTS',
    taxableValue: 100000,
    gstRate: 18,
    paymentStatus: 'UNPAID',
    daysOutstanding: 15,
  });

  const [rows, setRows] = useState<EditablePRRow[]>([initialRow()]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddRow = () => {
    setRows((prev) => [...prev, initialRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof EditablePRRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Compute calculated values for a row
  const computeRowTaxes = (row: EditablePRRow) => {
    const taxable = Number(row.taxableValue) || 0;
    const rate = Number(row.gstRate) || 0;
    const vendorStateCode = (row.vendorGstin || '').substring(0, 2);

    const isInterState = vendorStateCode !== '' && vendorStateCode !== branchStateCode;

    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (isInterState) {
      igst = Math.round((taxable * (rate / 100)) * 100) / 100;
    } else {
      const halfRate = rate / 200;
      cgst = Math.round((taxable * halfRate) * 100) / 100;
      sgst = Math.round((taxable * halfRate) * 100) / 100;
    }

    const totalTax = igst + cgst + sgst;
    const totalInvoiceValue = taxable + totalTax;

    const isRule37Risk = row.daysOutstanding > 180 && row.paymentStatus === 'UNPAID';
    const isBlocked175 = row.category === 'STAFF_WELFARE' || row.category === 'DEMO_VEHICLE';

    return {
      isInterState,
      igst,
      cgst,
      sgst,
      totalTax,
      totalInvoiceValue,
      isRule37Risk,
      isBlocked175,
    };
  };

  const handleSubmitBatch = async () => {
    setIsSubmitting(true);
    try {
      const prItems: PurchaseRegisterItem[] = rows.map((r) => {
        const computed = computeRowTaxes(r);
        return {
          id: `PR-${Date.now()}-${r.invoiceNo.replace(/[^A-Z0-9]/gi, '')}`,
          internalVoucherNo: `VCH/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          invoiceNo: r.invoiceNo,
          invoiceDate: r.invoiceDate,
          vendorGstin: r.vendorGstin.toUpperCase(),
          vendorName: r.vendorName,
          category: r.category,
          taxableValue: r.taxableValue,
          igst: computed.igst,
          cgst: computed.cgst,
          sgst: computed.sgst,
          cess: 0,
          totalTax: computed.totalTax,
          totalInvoiceValue: computed.totalInvoiceValue,
          paymentStatus: r.paymentStatus,
          daysOutstanding: r.daysOutstanding,
          isEligibleITC: !computed.isBlocked175,
          branchName: 'Main Facility',
          gstin: activeGstin,
        };
      });

      await ingestApi.ingestManualPR(prItems);
      await onRefreshRecon();

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.3 } });
      setToastMessage(`Successfully ingested ${rows.length} manual purchase register records and updated 7-tier recon!`);
      setTimeout(() => setToastMessage(null), 5000);
      setRows([initialRow()]);
    } catch {
      setToastMessage('Error ingesting records. Please check format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBatchTaxable = rows.reduce((acc, r) => acc + (Number(r.taxableValue) || 0), 0);
  const totalBatchTax = rows.reduce((acc, r) => acc + computeRowTaxes(r).totalTax, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-xl animate-bounce">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => onNavigateTab('recon-workbench')}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            View Recon Matrix →
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Structured Inward Ingestion Grid
            </span>
          </div>
          <h1 className={`text-2xl font-black ${theme.isLight ? 'text-slate-900' : 'text-white'} tracking-tight`}>
            Manual Purchase Register Entry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active GSTIN: <strong className="text-indigo-400 font-mono">{activeGstin}</strong> (State: {branchStateCode}) • Auto-calculates IGST vs CGST/SGST by comparing vendor state
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitBatch}
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Commit {rows.length} {rows.length === 1 ? 'Record' : 'Records'} to Recon</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className={`rounded-2xl ${theme.cardBg} border ${theme.cardBorder} shadow-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-mono uppercase select-none">
              <tr>
                <th className="px-3.5 py-3">#</th>
                <th className="px-3.5 py-3">Invoice No</th>
                <th className="px-3.5 py-3">Date</th>
                <th className="px-3.5 py-3">Vendor GSTIN</th>
                <th className="px-3.5 py-3">Vendor Name</th>
                <th className="px-3.5 py-3">Category</th>
                <th className="px-3.5 py-3 text-right">Taxable (₹)</th>
                <th className="px-3.5 py-3 text-center">Rate</th>
                <th className="px-3.5 py-3 text-right">Tax Split</th>
                <th className="px-3.5 py-3 text-center">Status</th>
                <th className="px-3.5 py-3 text-center">Days</th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {rows.map((row, idx) => {
                const computed = computeRowTaxes(row);
                return (
                  <tr key={row.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                    
                    {/* Invoice No */}
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={row.invoiceNo}
                        onChange={(e) => handleUpdateRow(row.id, 'invoiceNo', e.target.value)}
                        className="w-32 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-3.5 py-2.5">
                      <input
                        type="date"
                        value={row.invoiceDate}
                        onChange={(e) => handleUpdateRow(row.id, 'invoiceDate', e.target.value)}
                        className="w-28 px-1.5 py-1 bg-slate-950/80 border border-slate-700 rounded text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Vendor GSTIN */}
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={row.vendorGstin}
                        onChange={(e) => handleUpdateRow(row.id, 'vendorGstin', e.target.value.toUpperCase())}
                        className="w-36 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded text-slate-100 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Vendor Name */}
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={row.vendorName}
                        onChange={(e) => handleUpdateRow(row.id, 'vendorName', e.target.value)}
                        className="w-44 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Category */}
                    <td className="px-3.5 py-2.5">
                      <select
                        value={row.category}
                        onChange={(e) => handleUpdateRow(row.id, 'category', e.target.value as DealershipCategory)}
                        className="w-36 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="SPARE_PARTS">Spare Parts</option>
                        <option value="OEM_VEHICLE">OEM Vehicle</option>
                        <option value="LUBRICANTS">Lubricants</option>
                        <option value="BODYSHOP_PAINT">Bodyshop Paint</option>
                        <option value="ACCESSORIES">Accessories</option>
                        <option value="WORKSHOP_TOOLS">Workshop Tools</option>
                        <option value="TRANSPORTER_RCM">Transporter RCM</option>
                        <option value="STAFF_WELFARE">Staff Welfare (Blocked)</option>
                        <option value="DEMO_VEHICLE">Demo Car (Blocked)</option>
                      </select>
                    </td>

                    {/* Taxable Value */}
                    <td className="px-3.5 py-2.5 text-right">
                      <input
                        type="number"
                        value={row.taxableValue}
                        onChange={(e) => handleUpdateRow(row.id, 'taxableValue', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded text-right font-mono text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="px-3.5 py-2.5 text-center">
                      <select
                        value={row.gstRate}
                        onChange={(e) => handleUpdateRow(row.id, 'gstRate', parseInt(e.target.value, 10))}
                        className="w-16 px-1.5 py-1 bg-slate-950/80 border border-slate-700 rounded text-center text-slate-100 text-xs font-mono"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Tax Split Display */}
                    <td className="px-3.5 py-2.5 text-right font-mono text-[11px]">
                      {computed.isInterState ? (
                        <span className="text-cyan-400">IGST: ₹{computed.igst.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-indigo-300">
                          C: ₹{computed.cgst} + S: ₹{computed.sgst}
                        </span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="px-3.5 py-2.5 text-center">
                      <select
                        value={row.paymentStatus}
                        onChange={(e) => handleUpdateRow(row.id, 'paymentStatus', e.target.value)}
                        className="px-1.5 py-1 bg-slate-950/80 border border-slate-700 rounded text-center text-slate-100 text-xs"
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PAID">PAID</option>
                        <option value="PARTIALLY_PAID">PARTIAL</option>
                      </select>
                    </td>

                    {/* Days Outstanding */}
                    <td className="px-3.5 py-2.5 text-center">
                      <input
                        type="number"
                        value={row.daysOutstanding}
                        onChange={(e) => handleUpdateRow(row.id, 'daysOutstanding', parseInt(e.target.value, 10) || 0)}
                        className={`w-14 px-1 py-1 bg-slate-950/80 border rounded text-center font-mono text-xs ${
                          computed.isRule37Risk ? 'border-rose-500 text-rose-400 font-bold' : 'border-slate-700 text-slate-200'
                        }`}
                      />
                    </td>

                    {/* Action */}
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length === 1}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Total Rows: <strong className="text-white">{rows.length}</strong></span>
            <span>•</span>
            <span>Total Taxable: <strong className="text-white">₹{totalBatchTaxable.toLocaleString('en-IN')}</strong></span>
            <span>•</span>
            <span>Computed GST: <strong className="text-emerald-400">₹{totalBatchTax.toLocaleString('en-IN')}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              + Add Another Line
            </button>
            <button
              onClick={handleSubmitBatch}
              disabled={isSubmitting}
              className={`px-4 py-1.5 rounded ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-md transition-all cursor-pointer`}
            >
              Commit to Engine →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
