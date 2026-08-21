import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  X, 
  Send, 
  MessageSquare, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  FileText,
  ShieldAlert
} from 'lucide-react';
import { ReconciledRecord, DealershipProfile } from '../types';

interface VendorNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReconciledRecord | null;
  dealership: DealershipProfile;
  onNoticeSent: (recordId: string, channel: 'WHATSAPP' | 'EMAIL') => void;
}

export const VendorNoticeModal: React.FC<VendorNoticeModalProps> = ({
  isOpen,
  onClose,
  record,
  dealership,
  onNoticeSent,
}) => {
  const { theme } = useTheme();
  const [activeChannel, setActiveChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record || !record.prItem) return null;

  const pr = record.prItem;

  const whatsappMessage = `⚠️ *URGENT: STATUTORY GST ITC DEFAULT NOTICE & PAYMENT HOLD*
From: *${dealership.groupName}* (GSTIN: ${dealership.activeGstin})
To: *${pr.vendorName}* (GSTIN: ${pr.vendorGstin})

Dear Accounts Team,
Our automated GST reconciliation system indicates that the following purchase invoice has *NOT been uploaded* in your GSTR-1, and consequently is *MISSING in our GSTR-2B*:

📄 *Invoice No:* ${pr.invoiceNo}
📅 *Invoice Date:* ${pr.invoiceDate}
💰 *Taxable Value:* ₹${pr.taxableValue.toLocaleString('en-IN')}
💵 *GST Credit At Risk:* ₹${pr.totalTax.toLocaleString('en-IN')}

As per *Section 16(2)(aa)* of the CGST Act, our input tax credit is blocked. 
Pursuant to our Dealership Procurement Policy:
1. Payment of *₹${pr.totalTax.toLocaleString('en-IN')}* is placed on *STATUTORY SYSTEM HOLD*.
2. Please upload this invoice in your upcoming GSTR-1 filing / IFF before the 11th.

Kindly share the ARN / acknowledgment once filed to release the payment voucher.

*Accounts & Taxation Department*
*${dealership.groupName}*`;

  const emailSubject = `URGENT: Missing GSTR-2B Invoice ${pr.invoiceNo} (Tax ₹${pr.totalTax.toLocaleString('en-IN')}) - Payment on Hold`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    onNoticeSent(record.id, activeChannel);
    onClose();
  };

  const titleText = theme.isLight ? 'text-slate-900' : 'text-white';
  const bodyText = theme.isLight ? 'text-slate-700' : 'text-slate-300';
  const mutedText = theme.isLight ? 'text-slate-500' : 'text-slate-400';
  const innerBoxBg = theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-lg max-w-2xl w-full text-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors duration-200`}>
        
        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'} flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-xs font-mono uppercase tracking-wider ${titleText}`}>
                Statutory Payment Hold & Vendor Notice Dispatcher
              </h3>
              <p className={`text-[10px] ${mutedText}`}>Section 16(2)(aa) CGST Act Default Escalation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${mutedText} hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 text-xs">
          
          {/* Summary Box */}
          <div className={`p-3 rounded border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono ${innerBoxBg}`}>
            <div>
              <span className={`${mutedText} uppercase`}>Vendor</span>
              <div className={`font-bold truncate ${titleText}`}>{pr.vendorName}</div>
            </div>
            <div>
              <span className={`${mutedText} uppercase`}>Invoice No</span>
              <div className="font-bold text-indigo-600 dark:text-indigo-300">{pr.invoiceNo}</div>
            </div>
            <div>
              <span className={`${mutedText} uppercase`}>Tax At Risk</span>
              <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">₹{pr.totalTax.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className={`${mutedText} uppercase`}>ERP Action</span>
              <div className="font-bold text-amber-600 dark:text-amber-400">Payment Held</div>
            </div>
          </div>

          {/* Channel Selector */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveChannel('WHATSAPP')}
              className={`flex-1 py-1.5 px-3 rounded text-[11px] font-medium font-mono flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeChannel === 'WHATSAPP'
                  ? (theme.isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs' : 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-xs')
                  : (theme.isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700')
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Business Notice</span>
            </button>
            <button
              onClick={() => setActiveChannel('EMAIL')}
              className={`flex-1 py-1.5 px-3 rounded text-[11px] font-medium font-mono flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeChannel === 'EMAIL'
                  ? (theme.isLight ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-xs' : 'bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-xs')
                  : (theme.isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700')
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Official Accounts Email</span>
            </button>
          </div>

          {/* Preview Text Box */}
          <div className="space-y-1">
            {activeChannel === 'EMAIL' && (
              <div className={`text-[11px] p-2 rounded border font-mono ${innerBoxBg} ${bodyText}`}>
                <strong className={mutedText}>Subject: </strong>{emailSubject}
              </div>
            )}
            <div className="relative">
              <textarea
                rows={9}
                readOnly
                value={whatsappMessage}
                className={`w-full text-[10px] font-mono p-3 rounded border focus:outline-none leading-relaxed resize-none ${
                  theme.isLight ? 'bg-white text-slate-800 border-slate-300 selection:bg-indigo-200' : 'bg-slate-950 text-slate-200 border-slate-800 selection:bg-indigo-700'
                }`}
              />
              <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 border px-2 py-1 rounded text-[9px] font-mono flex items-center space-x-1 transition-colors cursor-pointer ${
                  theme.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <p className={`text-[10px] ${mutedText}`}>
            ⚡ Sending this notice logs a permanent audit trail and creates a webhook in CDK/SAP to lock vendor payments.
          </p>

        </div>

        {/* Footer Actions */}
        <div className={`px-4 py-2.5 border-t ${theme.isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'} flex items-center justify-between`}>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold font-mono transition-colors cursor-pointer shadow-xs"
          >
            <Send className="w-3 h-3" />
            <span>Dispatch Notice & Lock Payment</span>
          </button>
        </div>

      </div>
    </div>
  );
};
