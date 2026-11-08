import React from 'react';
import { Clock, ShieldCheck, Flame, Database, Search } from 'lucide-react';
import { UserProfile } from '../../domain/models/types';

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

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-6 py-2.5 transition-all">
      {/* Top ambient micro-gradient hairline */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500/40 via-indigo-500/30 to-emerald-500/40" />

      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Brand Mon / Desktop Breadcrumb */}
        <div className="flex items-center space-x-3">
          {/* Mobile Only Brand Mon */}
          <div
            onClick={() => onNavigate('home')}
            className="md:hidden flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-600 to-indigo-900 border border-rose-500/40 flex items-center justify-center font-bold text-white shadow-md text-xs font-japanese">
              日
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs text-zinc-100 tracking-tight font-sans">
                NIHONGO N2
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-950/80 text-rose-300 font-mono font-bold border border-rose-500/40">
                {profile.level}
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumb Status */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="text-zinc-400 font-medium font-sans">Learner:</span>
            <span className="font-semibold text-zinc-200">{profile.name || 'Learner'}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 font-mono font-bold border border-rose-500/40">
              {profile.level} Track
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 flex items-center text-[11px] font-medium">
              <ShieldCheck className="w-3 h-3 mr-1 inline text-emerald-400" /> Offline DB Synced
            </span>
          </div>
        </div>

        {/* Center: Daily Progress Meter */}
        <div className="hidden sm:flex items-center space-x-3 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden ring-1 ring-zinc-700/60">
            <div
              className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-300 font-medium font-mono tabular-nums">
            {todayMinutes}m / {goalMinutes}m{' '}
            <span className="text-zinc-500 font-normal hidden lg:inline">
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
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-xs text-zinc-300 font-medium transition cursor-pointer active:scale-95 group shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400 transition-colors" />
              <span className="hidden sm:inline text-zinc-400 group-hover:text-zinc-200">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
                /
              </kbd>
            </button>
          )}

          {profile.studyStreakDays && profile.studyStreakDays > 0 ? (
            <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.studyStreakDays}d</span>
            </div>
          ) : null}

          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              title="Inspect PWA Offline Storage & Dexie Sync Diagnostics"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-xs text-zinc-300 font-medium transition cursor-pointer active:scale-95 group shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </span>
              <span className="group-hover:text-zinc-100 hidden md:inline">Storage</span>
              <Database className="w-3.5 h-3.5 text-zinc-400 md:hidden" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
