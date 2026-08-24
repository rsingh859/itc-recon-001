import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  ShieldCheck, 
  Zap, 
  Layers, 
  FileSpreadsheet, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Server, 
  Cpu, 
  Building2, 
  Car, 
  Sparkles,
  TrendingUp,
  FileCheck2,
  ChevronRight,
  Database,
  Eye,
  Play
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  onQuickDemo: (tenantId?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onQuickDemo }) => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme.canvasBg} text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white`}>
      {/* Top Navigation Bar */}
      <nav className={`border-b ${theme.cardBorder} ${theme.headerBg} sticky top-0 z-50 backdrop-blur-md`}>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className={`w-9 h-9 rounded-lg ${theme.accentBg} flex items-center justify-center font-black text-white text-sm shadow-md`}>
              AT
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">AutoTax</span>
              <span className="text-[10px] text-indigo-400 font-mono block -mt-1 font-semibold">TAXDRIVE ENTERPRISE OS</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">7-Tier Engine</a>
            <a href="#compliance" className="hover:text-white transition-colors">Statutory Section 16(2)(aa)</a>
            <a href="#integrations" className="hover:text-white transition-colors">DMS & GSP Connectors</a>
            <a href="#security" className="hover:text-white transition-colors">Security & RLS</a>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('login')}
              className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className={`text-xs font-bold text-white px-4 py-2 rounded-lg ${theme.accentBg} ${theme.accentHover} shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center space-x-1.5`}
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[250px] bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Native Go Microservices Engine + 7-Tier GST Reconciliation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Autonomous GST Reconciliation &amp; <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Tax Compliance OS</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Engineered for high-volume automotive dealerships and enterprise supply chains. Reconcile 5,000+ invoices in under 6 milliseconds, automate Section 16(2)(aa) vendor payment holds, audit OEM scheme bonuses, and claim 100% eligible Input Tax Credit.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('signup')}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl ${theme.accentBg} ${theme.accentHover} font-bold text-white text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center space-x-2 transition-all cursor-pointer`}
            >
              <span>Onboard Dealership Group</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onQuickDemo('dms-01')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer hover:border-indigo-500/50 shadow-md"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Explore Live Demo (Maruti Nexa)</span>
            </button>

            <button
              onClick={() => onQuickDemo('dms-02')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tata Motors Demo</span>
            </button>
          </div>

          {/* High-Velocity Architecture Badges */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-black text-white font-mono flex items-center space-x-1">
                <span className="text-emerald-400">&lt;6ms</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Reconciliation Latency (5k rows)</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-black text-white font-mono flex items-center space-x-1">
                <span className="text-indigo-400">7-Tier</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Algorithmic Matching Engine</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-black text-white font-mono flex items-center space-x-1">
                <span className="text-cyan-400">100%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Sec 16(2)(aa) Audit Proof</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="text-2xl font-black text-white font-mono flex items-center space-x-1">
                <span className="text-amber-400">RLS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Multi-Tenant Cryptographic Isolation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section: 7-Tier Matching Matrix */}
      <section id="features" className="py-16 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase">Algorithmic Superiority</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              The 7-Tier GST Reconciliation Compute Matrix
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Combines exact byte-normalized index matching with banded Ukkonen Levenshtein fuzzy string distance to catch vendor discrepancies before tax filing deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Tier 1: O(1) Exact Match</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Normalized byte hash indexing across Invoice No, Supplier GSTIN, Taxable Value, and IGST/CGST/SGST for sub-millisecond precision.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Tier 2: Ukkonen Fuzzy Match</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Detects invoice typos, missing forward slashes, OEM consignment prefixes, and formatting variations within configurable tolerances.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Tier 3 &amp; 4: Statutory Defense</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Evaluates Section 17(5) blocked credits, Rule 37 180-day vendor aging clawbacks, and Section 16(2)(aa) missing supplier filings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ingestion & Workflows Section */}
      <section className="py-16 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase">Streamlined Ingestion</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
                Flexible Data Ingestion: Manual, OCR &amp; Direct API Sync
              </h2>
              <p className="text-sm text-slate-300 mt-4 leading-relaxed">
                Whether you prefer structured tabular manual entry, drag-and-drop document upload with AI entity extraction, or automated DMS webhooks, AutoTax standardizes all inward supplies into clean, validated records.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">High-Density Manual Entry Grid</h4>
                    <p className="text-xs text-slate-400">Inline tax auto-computation (IGST vs CGST/SGST based on vendor state code).</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Smart OCR Document Extraction</h4>
                    <p className="text-xs text-slate-400">Extracts invoice number, dates, GSTINs, and tax breakdown from PDFs and mobile scans with confidence indicators.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Automated GSP Suvidha Pipeline</h4>
                    <p className="text-xs text-slate-400">Direct integration with GSTN via authorized GSP adapters for live GSTR-2B pulls.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center space-x-4">
                <button
                  onClick={() => onNavigate('signup')}
                  className={`px-6 py-3 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-md transition-all`}
                >
                  Create Free Workspace
                </button>
                <button
                  onClick={() => onQuickDemo('dms-01')}
                  className="px-5 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                >
                  View Sample Workspace
                </button>
              </div>
            </div>

            {/* Ingestion Visual Mock */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-xs font-mono">
                <span className="text-slate-400">INWARD INGESTION PIPELINE</span>
                <span className="text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>GO ENGINE READY</span>
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-slate-200">Manual Batch Grid</span>
                  </div>
                  <span className="font-mono text-indigo-400 text-[11px]">Instant Validation</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-200">Smart Document OCR</span>
                  </div>
                  <span className="font-mono text-cyan-400 text-[11px]">96% Confidence</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">GSP GSTN Live Sync</span>
                  </div>
                  <span className="font-mono text-emerald-400 text-[11px]">Auto 7-Tier Match</span>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-center">
                <span className="text-[11px] text-indigo-300 font-mono">
                  → Emits InwardDataChangedEvent → Auto-Recon in 5.2ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Ecosystem Marquee */}
      <section id="integrations" className="py-12 border-t border-slate-800/80 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Seamlessly Integrated with Automotive DMS, ERPs &amp; GSP Providers
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-slate-400">
            <span className="hover:text-white transition-colors">Maruti Suzuki eDMS</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Tata Motors Mother DMS</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">CDK Global Drive</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">SAP S/4HANA Auto</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Tally Prime 4.0</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">Vayana GSP</span>
            <span>•</span>
            <span className="hover:text-white transition-colors">NIC E-Invoice Portal</span>
          </div>
        </div>
      </section>

      {/* Security & RLS Section */}
      <section id="security" className="py-16 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider uppercase">Enterprise Security</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              Bank-Grade Cryptographic &amp; Multi-Tenant Isolation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Lock className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="font-bold text-white text-sm">Bcrypt 12 Credential Security</h4>
              <p className="text-xs text-slate-400 mt-1">
                Zero plaintext password storage. JWT tokens with short 15m expiration and rotating refresh tokens.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Database className="w-6 h-6 text-cyan-400 mb-3" />
              <h4 className="font-bold text-white text-sm">PostgreSQL Row-Level Security</h4>
              <p className="text-xs text-slate-400 mt-1">
                Hardware-enforced database multi-tenancy. Zero data leakage vectors across dealership groups.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
              <h4 className="font-bold text-white text-sm">WORM Statutory Audit Trail</h4>
              <p className="text-xs text-slate-400 mt-1">
                Append-only immutable defense log for all Section 16(2)(aa) payment holds and statutory notices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              AT
            </div>
            <span className="font-bold text-slate-300">AutoTax TaxDrive OS 2.0</span>
          </div>

          <div className="flex items-center space-x-6 text-slate-400">
            <button onClick={() => onNavigate('login')} className="hover:text-white">Login</button>
            <button onClick={() => onNavigate('signup')} className="hover:text-white">Sign Up</button>
            <button onClick={() => onQuickDemo('dms-01')} className="hover:text-white">Demo Mode</button>
          </div>

          <p className="font-mono text-[10px] text-slate-500">
            &copy; 2026 AutoTax Enterprise Systems. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
