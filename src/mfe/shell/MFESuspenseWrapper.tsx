import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MFESuspenseWrapperProps {
  remoteName: string;
  description?: string;
}

export const MFESuspenseWrapper: React.FC<MFESuspenseWrapperProps> = ({
  remoteName,
  description = 'Initializing Micro Frontend domain workspace...',
}) => {
  const { theme } = useTheme();

  return (
    <div className={`w-full rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-8 flex flex-col items-center justify-center min-h-[420px] shadow-xl animate-pulse`}>
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-amber-300 animate-ping" />
        </div>
      </div>

      <div className="text-center max-w-md">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-mono text-indigo-400 uppercase tracking-widest mb-3">
          <span>Remote MFE Container</span>
          <span>•</span>
          <strong className="text-white">{remoteName}</strong>
        </div>
        <h3 className="text-base font-semibold text-white mb-1.5">
          Loading Micro Frontend Module
        </h3>
        <p className="text-xs text-slate-400">
          {description}
        </p>
      </div>

      {/* Modern Skeleton Table Simulation */}
      <div className="w-full max-w-2xl mt-8 space-y-2.5 opacity-60">
        <div className="h-4 bg-slate-800/60 rounded-md w-full" />
        <div className="h-4 bg-slate-800/40 rounded-md w-5/6" />
        <div className="h-4 bg-slate-800/30 rounded-md w-4/6" />
      </div>
    </div>
  );
};
