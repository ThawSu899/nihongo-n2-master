import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Flame, Database, Search, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../../domain/models/types';
import { getStoredTheme, applyTheme, ThemeMode } from '../../services/theme';

interface HeaderProps {
  profile: UserProfile;
  todayMinutes: number;
  onNavigate: (view: string) => void;
  isTestActive?: boolean;
  onOpenDiagnostics?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  todayMinutes,
  onNavigate,
  isTestActive = false,
  onOpenDiagnostics,
  onOpenSearch,
}) => {
  const goalMinutes = profile.dailyTargetMinutes || 360;
  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : getStoredTheme();
    }
    return 'light';
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-stone-200 px-4 sm:px-6 py-2.5 transition-all">
      {/* Top ambient micro-gradient hairline */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500/40 via-amber-500/30 to-emerald-500/40" />

      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Brand Mon / Desktop Breadcrumb */}
        <div className="flex items-center space-x-3">
          {/* Mobile Only Brand Mon */}
          <div
            onClick={() => onNavigate('home')}
            className="md:hidden flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-500/40 flex items-center justify-center font-bold text-white shadow-xs text-xs font-japanese">
              日
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs text-stone-900 tracking-tight font-sans">
                NIHONGO N2
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                {profile.level}
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumb Status */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-medium font-sans">Learner:</span>
            <span className="font-semibold text-stone-900">{profile.name || 'Learner'}</span>
            <span className="text-stone-300">·</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
              {profile.level} Track
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-emerald-700 flex items-center text-[11px] font-medium">
              <ShieldCheck className="w-3 h-3 mr-1 inline text-emerald-600" /> Offline DB Synced
            </span>
          </div>
        </div>

        {/* Center: Daily Progress Meter */}
        <div className="hidden sm:flex items-center space-x-3 bg-stone-100 px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <div className="w-24 bg-stone-200 rounded-full h-1.5 overflow-hidden ring-1 ring-stone-300/60">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-stone-700 font-medium font-mono tabular-nums">
            {todayMinutes}m / {goalMinutes}m{' '}
            <span className="text-stone-500 font-normal hidden lg:inline">
              ({(todayMinutes / 60).toFixed(1)}h / 6h)
            </span>
          </span>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center space-x-2">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              title="Global Quick Search (Ctrl+K or /)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-xs text-stone-700 font-medium transition cursor-pointer active:scale-95 group shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 text-stone-500 group-hover:text-indigo-600 transition-colors" />
              <span className="hidden sm:inline text-stone-600 group-hover:text-stone-900">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200 text-[10px] text-stone-500 font-mono">
                /
              </kbd>
            </button>
          )}

          {profile.studyStreakDays && profile.studyStreakDays > 0 ? (
            <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-medium shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{profile.studyStreakDays}d</span>
            </div>
          ) : null}

          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              title="Inspect PWA Offline Storage & Dexie Sync Diagnostics"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-xs text-stone-700 font-medium transition cursor-pointer active:scale-95 group shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </span>
              <span className="group-hover:text-stone-900 hidden md:inline">Storage</span>
              <Database className="w-3.5 h-3.5 text-stone-500 md:hidden" />
            </button>
          )}

          {/* Light / Dark Theme Switch Button */}
          <button
            type="button"
            onClick={handleToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme (Modern Academic Paper)' : 'Switch to Dark Theme (Obsidian Glass)'}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-xs text-stone-700 font-medium transition cursor-pointer active:scale-95 group shadow-2xs"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
                <span className="hidden sm:inline text-stone-600 group-hover:text-stone-900">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-stone-500 group-hover:text-indigo-600 transition-colors" />
                <span className="hidden sm:inline text-stone-600 group-hover:text-stone-900">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
