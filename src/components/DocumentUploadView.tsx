import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  DocumentUpload, 
  ExtractedInvoiceData, 
  DealershipProfile 
} from '../types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Eye, 
  RefreshCw, 
  Layers, 
  ShieldCheck,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { documentsApi } from '../api';
import confetti from 'canvas-confetti';

interface DocumentUploadViewProps {
  dealership: DealershipProfile;
  activeGstin: string;
  onNavigateTab: (tabId: string) => void;
  onRefreshRecon: () => void;
}

export const DocumentUploadView: React.FC<DocumentUploadViewProps> = ({
  dealership,
  activeGstin,
  onNavigateTab,
  onRefreshRecon,
}) => {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [activeDocument, setActiveDocument] = useState<DocumentUpload | null>(null);
  const [extractedForm, setExtractedForm] = useState<ExtractedInvoiceData | null>(null);
  const [documentsHistory, setDocumentsHistory] = useState<DocumentUpload[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const docs = await documentsApi.listDocuments();
      setDocumentsHistory(docs);
    } catch {
      // Ignored
    }
  };

  const handleFileProcess = async (file: File) => {
    setIsUploading(true);
    try {
      const doc = await documentsApi.uploadFile(file);
      setActiveDocument(doc);
      if (doc.extractedData) {
        setExtractedForm(doc.extractedData);
      }
      setDocumentsHistory((prev) => [doc, ...prev]);
    } catch (err: any) {
      setToastMessage('Upload or OCR extraction failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleFieldUpdate = (field: keyof ExtractedInvoiceData, value: any) => {
    if (!extractedForm) return;
    setExtractedForm({
      ...extractedForm,
      [field]: value,
    });
  };

  const handleConfirmAndIngest = async () => {
    if (!activeDocument || !extractedForm) return;
    setIsConfirming(true);
    try {
      await documentsApi.confirmExtraction(activeDocument.id, extractedForm);
      await onRefreshRecon();

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.3 } });
      setToastMessage(`Invoice ${extractedForm.invoiceNo} successfully confirmed & ingested into 7-tier recon!`);
      setTimeout(() => setToastMessage(null), 5000);
      setActiveDocument(null);
      setExtractedForm(null);
    } catch {
      setToastMessage('Failed to commit invoice.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Smart Inward Document Processing Hub
            </span>
          </div>
          <h1 className={`text-2xl font-black ${theme.isLight ? 'text-slate-900' : 'text-white'} tracking-tight`}>
            Invoice &amp; Receipt OCR Ingestion
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Drag &amp; drop PDF invoices, parts receipts, or photos • AI extracts GSTIN, line totals, and tax splits for side-by-side review
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Select File from Computer</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            className="hidden"
          />
        </div>
      </div>

      {/* Drag and Drop Zone */}
      {!activeDocument && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-12 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-white">Extracting Invoice Data via AI Vision...</p>
              <p className="text-xs text-slate-400">Parsing vendor GSTIN, HSN codes, and tax breakdown</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                Drag and drop your Tax Invoice or Receipt here
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Supports PDF, JPG, PNG scans up to 15MB. Extracts supplier name, GSTIN, invoice date, taxable value, and tax rates.
              </p>
              <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] font-mono text-indigo-400">
                <span>Try uploading sample:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">minda_spare_parts_inv.pdf</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">castrol_oil_invoice.jpg</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Review Section */}
      {activeDocument && extractedForm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Document File Preview */}
          <div className={`lg:col-span-5 p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white truncate max-w-[200px]">{activeDocument.fileName}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                {extractedForm.confidenceScore}% Confidence
              </span>
            </div>

            {/* Visual Document Card */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>FILE SIZE</span>
                <span className="text-slate-200">{(activeDocument.fileSizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>DIGITAL HASH (SHA-256)</span>
                <span className="text-slate-300 truncate max-w-[150px]">{activeDocument.sha256Hash}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">OCR RAW TEXT EXTRACT</div>
                <p className="font-mono text-[11px] text-slate-300 italic">{extractedForm.rawTextSnippet}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Review the extracted fields on the right. You can modify any value before committing to the 7-tier engine.</span>
            </div>
          </div>

          {/* Right Column: Editable Extracted Form */}
          <div className={`lg:col-span-7 p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-indigo-400" />
                <span>Extracted Invoice Fields</span>
              </h3>
              <button
                onClick={() => { setActiveDocument(null); setExtractedForm(null); }}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Cancel / Re-upload
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={extractedForm.invoiceNo}
                  onChange={(e) => handleFieldUpdate('invoiceNo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={extractedForm.invoiceDate}
                  onChange={(e) => handleFieldUpdate('invoiceDate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={extractedForm.supplierGstin}
                  onChange={(e) => handleFieldUpdate('supplierGstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white font-mono text-xs uppercase focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={extractedForm.supplierName}
                  onChange={(e) => handleFieldUpdate('supplierName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={extractedForm.category}
                  onChange={(e) => handleFieldUpdate('category', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="SPARE_PARTS">Spare Parts</option>
                  <option value="OEM_VEHICLE">OEM Vehicle</option>
                  <option value="LUBRICANTS">Lubricants</option>
                  <option value="BODYSHOP_PAINT">Bodyshop Paint</option>
                  <option value="ACCESSORIES">Accessories</option>
                  <option value="WORKSHOP_TOOLS">Workshop Tools</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Taxable Value (₹)</label>
                <input
                  type="number"
                  value={extractedForm.taxableValue}
                  onChange={(e) => handleFieldUpdate('taxableValue', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">IGST Amount (₹)</label>
                <input
                  type="number"
                  value={extractedForm.igst}
                  onChange={(e) => handleFieldUpdate('igst', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-cyan-400 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CGST / SGST Total (₹)</label>
                <input
                  type="number"
                  value={extractedForm.cgst + extractedForm.sgst}
                  onChange={(e) => {
                    const half = (parseFloat(e.target.value) || 0) / 2;
                    handleFieldUpdate('cgst', half);
                    handleFieldUpdate('sgst', half);
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-indigo-300 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Total Invoice Value (₹)</label>
                <input
                  type="number"
                  value={extractedForm.totalAmount}
                  onChange={(e) => handleFieldUpdate('totalAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-emerald-500/40 rounded-lg text-emerald-400 font-mono font-bold text-sm focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleConfirmAndIngest}
                disabled={isConfirming}
                className={`px-6 py-2.5 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50`}
              >
                {isConfirming ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Confirm &amp; Ingest to 7-Tier Recon Engine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploads History */}
      {documentsHistory.length > 0 && (
        <div className={`p-6 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-3`}>
          <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider font-mono">
            Recent Inward Uploads &amp; OCR Dossiers ({documentsHistory.length})
          </h3>

          <div className="divide-y divide-slate-800 text-xs">
            {documentsHistory.slice(0, 5).map((doc) => (
              <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3 font-mono">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-semibold">{doc.fileName}</span>
                  <span className="text-slate-500 text-[11px]">({(doc.fileSizeBytes / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                    {doc.ocrStatus}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {doc.extractedData?.invoiceNo || 'INV/PARSED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
