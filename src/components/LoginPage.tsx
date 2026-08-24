import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Play, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  onSuccessRedirect: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccessRedirect }) => {
  const { login, demoLogin, isLoading } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState<string>('demo@autotax.io');
  const [password, setPassword] = useState<string>('Demo1234!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    try {
      const ok = await login(email, password);
      if (ok) {
        onSuccessRedirect();
      } else {
        setErrorMessage('Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    }
  };

  const handleQuickDemo = async (tenantId: string) => {
    setErrorMessage(null);
    try {
      await demoLogin(tenantId);
      onSuccessRedirect();
    } catch {
      setErrorMessage('Demo login failed.');
    }
  };

  return (
    <div className={`min-h-screen ${theme.canvasBg} text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-600 selection:text-white relative`}>
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
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
          Sign in to your Dealership OS
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your enterprise credentials or launch a sandbox demo session
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-xl">
          
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address
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
                  placeholder="name@dealershipgroup.com"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-lg ${theme.accentBg} ${theme.accentHover} text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50`}
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate &amp; Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-mono">Or 1-Click Executive Demo</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickDemo('dms-01')}
                className="py-2.5 px-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer hover:border-indigo-500/40"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Apex / Maruti</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('dms-02')}
                className="py-2.5 px-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer hover:border-indigo-500/40"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Vertex / Tata</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('signup')}
                className="font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer ml-1"
              >
                Sign up &amp; Onboard Organization
              </button>
            </p>
          </div>
        </div>

        {/* Security assurance */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bcrypt 12 Hashing • PostgreSQL RLS Active</span>
        </div>
      </div>
    </div>
  );
};
