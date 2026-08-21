import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 
  | 'zurich' 
  | 'mayfair' 
  | 'nordic' 
  | 'obsidian' 
  | 'geneva' 
  | 'emerald-light' 
  | 'platinum';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  headerBg: string;
  canvasBg: string;
  cardBg: string;
  cardBorder: string;
  accentBg: string;
  accentHover: string;
  accentText: string;
  tabActive: string;
  tabInactive: string;
  statBg: string;
  isLight?: boolean;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  zurich: {
    id: 'zurich',
    name: 'Zurich Swiss (Dark)',
    tagline: 'Cobalt & Navy Financial',
    accentColor: '#6366f1',
    badgeBg: 'bg-indigo-950/90',
    badgeText: 'text-indigo-300 border-indigo-800',
    headerBg: 'bg-slate-900 border-slate-700',
    canvasBg: 'bg-slate-950 text-slate-100',
    cardBg: 'bg-slate-900/90',
    cardBorder: 'border-slate-800',
    accentBg: 'bg-indigo-600',
    accentHover: 'hover:bg-indigo-500',
    accentText: 'text-white',
    tabActive: 'bg-indigo-600 text-white shadow-sm',
    tabInactive: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
    statBg: 'bg-slate-950/90 border-slate-800',
    isLight: false,
  },
  mayfair: {
    id: 'mayfair',
    name: 'Mayfair Forest (Dark)',
    tagline: 'Emerald & Gold Audit',
    accentColor: '#10b981',
    badgeBg: 'bg-amber-950/90',
    badgeText: 'text-amber-300 border-amber-800',
    headerBg: 'bg-emerald-950 border-emerald-800/90',
    canvasBg: 'bg-slate-950 text-emerald-100',
    cardBg: 'bg-emerald-950/40',
    cardBorder: 'border-emerald-800/60',
    accentBg: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-500',
    accentText: 'text-white',
    tabActive: 'bg-emerald-600 text-white shadow-sm',
    tabInactive: 'text-emerald-300/70 hover:text-emerald-100 hover:bg-emerald-900/50',
    statBg: 'bg-emerald-950/80 border-emerald-800/80',
    isLight: false,
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Alpine (Dark)',
    tagline: 'Teal & Mint High-Legibility',
    accentColor: '#14b8a6',
    badgeBg: 'bg-teal-950/90',
    badgeText: 'text-teal-200 border-teal-800',
    headerBg: 'bg-teal-950 border-teal-800',
    canvasBg: 'bg-slate-950 text-teal-100',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-teal-900/60',
    accentBg: 'bg-teal-600',
    accentHover: 'hover:bg-teal-500',
    accentText: 'text-white',
    tabActive: 'bg-teal-600 text-white shadow-sm',
    tabInactive: 'text-teal-300/70 hover:text-teal-100 hover:bg-teal-900/50',
    statBg: 'bg-teal-950/80 border-teal-900/80',
    isLight: false,
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Dark',
    tagline: 'High Contrast Sleek Dark',
    accentColor: '#8b5cf6',
    badgeBg: 'bg-purple-950/90',
    badgeText: 'text-purple-300 border-purple-800',
    headerBg: 'bg-black border-slate-800',
    canvasBg: 'bg-slate-950 text-slate-200',
    cardBg: 'bg-slate-900/90',
    cardBorder: 'border-slate-800',
    accentBg: 'bg-violet-600',
    accentHover: 'hover:bg-violet-500',
    accentText: 'text-white',
    tabActive: 'bg-violet-600 text-white shadow-sm',
    tabInactive: 'text-slate-400 hover:text-slate-200 hover:bg-slate-900',
    statBg: 'bg-black/90 border-slate-800',
    isLight: false,
  },
  geneva: {
    id: 'geneva',
    name: 'Geneva Swiss (Light)',
    tagline: 'Crisp White & Royal Blue',
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900 border-blue-300',
    headerBg: 'bg-white border-slate-200 text-slate-900 shadow-xs',
    canvasBg: 'bg-slate-100 text-slate-900',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200/90 shadow-sm',
    accentBg: 'bg-blue-600',
    accentHover: 'hover:bg-blue-500',
    accentText: 'text-white',
    tabActive: 'bg-blue-600 text-white shadow-sm',
    tabInactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    statBg: 'bg-white border-slate-200',
    isLight: true,
  },
  'emerald-light': {
    id: 'emerald-light',
    name: 'Emerald Mint (Light)',
    tagline: 'Clean Mint & Audit Green',
    accentColor: '#059669',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900 border-emerald-300',
    headerBg: 'bg-white border-emerald-200 text-slate-900 shadow-xs',
    canvasBg: 'bg-emerald-50/40 text-slate-900',
    cardBg: 'bg-white',
    cardBorder: 'border-emerald-200/80 shadow-sm',
    accentBg: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-500',
    accentText: 'text-white',
    tabActive: 'bg-emerald-600 text-white shadow-sm',
    tabInactive: 'text-emerald-800/80 hover:text-emerald-950 hover:bg-emerald-100/60',
    statBg: 'bg-white border-emerald-200',
    isLight: true,
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum Minimal (Light)',
    tagline: 'Bank-Grade Minimalist Studio',
    accentColor: '#4f46e5',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900 border-indigo-300',
    headerBg: 'bg-slate-200/80 border-slate-300 text-slate-900 shadow-xs',
    canvasBg: 'bg-slate-200/60 text-slate-900',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-300 shadow-sm',
    accentBg: 'bg-indigo-600',
    accentHover: 'hover:bg-indigo-500',
    accentText: 'text-white',
    tabActive: 'bg-indigo-600 text-white shadow-sm',
    tabInactive: 'text-slate-700 hover:text-slate-950 hover:bg-slate-300/60',
    statBg: 'bg-white border-slate-300',
    isLight: true,
  },
};

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'autotax_active_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in THEMES) {
      return saved as ThemeId;
    }
    return 'zurich';
  });

  const setTheme = (id: ThemeId) => {
    if (THEMES[id]) {
      setThemeId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
  }, [themeId]);

  const value = {
    themeId,
    theme: THEMES[themeId],
    setTheme,
    availableThemes: Object.values(THEMES),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
