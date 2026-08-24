import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Lock, 
  Mail, 
  User, 
  Building2, 
  Car, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2
} from 'lucide-react';

interface SignUpPageProps {
  onNavigate: (route: string) => void;
  onSuccessRedirect: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate, onSuccessRedirect }) => {
  const { signUp, isLoading } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [brand, setBrand] = useState<string>('Maruti Suzuki (Arena & Nexa)');
  const [headquarters, setHeadquarters] = useState<string>('New Delhi');
  const [activeGstin, setActiveGstin] = useState<string>('07AABCA9876K1Z2');
  const [dmsSoftware, setDmsSoftware] = useState<string>('MARUTI_EDMS');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || !email || !password || !groupName || !activeGstin) {
      setErrorMessage('Please fill in all required organization and user fields.');
      return;
    }

    // Validate GSTIN 15-char format regex
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(activeGstin.trim().toUpperCase())) {
      setErrorMessage('Invalid GSTIN format. Expected 15-character alphanumeric format (e.g. 07AABCA9876K1Z2).');
      return;
    }

    try {
      const ok = await signUp({
        fullName,
        email,
        password,
        groupName,
        brand,
        authorizedDealerFor: brand,
        headquarters,
        activeGstin: activeGstin.trim().toUpperCase(),
        dmsSoftware,
      });

      if (ok) {
        onSuccessRedirect();
      } else {
        setErrorMessage('Registration failed. Please verify the submitted details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    }
  };

  return (
    <div className={`min-h-screen ${theme.canvasBg} text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans selection:bg-indigo-600 selection:text-white relative`}>
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10">
        <div 
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center justify-center space-x-2.5 cursor-pointer mb-2"
        >
          <div className={`w-10 h-10 rounded-xl ${theme.accentBg} flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-600/30`}>
            AT
          </div>
          <span className="text-2xl font-black text-white tracking-tight">AutoTax</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
          Onboard Your Dealership Group
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Provision your multi-tenant workspace with PostgreSQL Row-Level Security &amp; 7-Tier Recon Engine
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-xl">
          
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Section 1: User Admin Details */}
            <div className="border-b border-slate-800/80 pb-3 mb-2">
              <span className="text-[11px] font-mono uppercase text-indigo-400 font-bold tracking-wider">
                1. Operator Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Vikram Singhania"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corporate Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="cfo@dealership.com"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 8 characters (Bcrypt Hashed)"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>

            {/* Section 2: Organization Details */}
            <div className="border-b border-slate-800/80 pb-3 pt-3 mb-2">
              <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                2. Dealership Organization Details
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dealership / Conglomerate Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  placeholder="e.g. Landmark Mobility Automotive Pvt Ltd"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  OEM Brand Network <span className="text-rose-400">*</span>
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Maruti Suzuki (Arena, Nexa & True Value)">Maruti Suzuki (Arena, Nexa &amp; True Value)</option>
                  <option value="Tata Motors Commercial & Passenger">Tata Motors Commercial &amp; Passenger</option>
                  <option value="Hyundai Motor India">Hyundai Motor India</option>
                  <option value="Mahindra & Mahindra Auto">Mahindra &amp; Mahindra Auto</option>
                  <option value="Toyota Kirloskar Motor">Toyota Kirloskar Motor</option>
                  <option value="BMW & Mercedes-Benz Luxury Network">BMW &amp; Mercedes-Benz Luxury Network</option>
                  <option value="Multi-Brand Automotive Group">Multi-Brand Automotive Group</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Branch GSTIN <span className="text-rose-400">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={activeGstin}
                    onChange={(e) => setActiveGstin(e.target.value)}
                    required
                    placeholder="07AABCA9876K1Z2"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Headquarters City
                </label>
                <input
                  type="text"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="e.g. Mumbai / Delhi NCR"
                  className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  DMS / ERP Integration
                </label>
                <select
                  value={dmsSoftware}
                  onChange={(e) => setDmsSoftware(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MARUTI_EDMS">Maruti eDMS</option>
                  <option value="TATA_MOTHER">Tata Mother DMS</option>
                  <option value="CDK_GLOBAL">CDK Global Drive</option>
                  <option value="SAP_DMS">SAP S/4HANA DMS</option>
                  <option value="TALLY_PRIME">Tally Prime 4.0</option>
                  <option value="AUTOLINE">Autoline DMS</option>
                </select>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50`}
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Initialize Workspace &amp; Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer ml-1"
              >
                Sign In to existing workspace
              </button>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PostgreSQL Row-Level Security Enabled • Statutory WORM Audit Trail Active</span>
        </div>
      </div>
    </div>
  );
};
