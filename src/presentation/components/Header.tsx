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
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-2.5 transition-all">
      {/* Top ambient micro-gradient hairline */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500/40 via-indigo-500/30 to-emerald-500/40" />

      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand: Minimalist Japanese Mon Crest + Level Pill */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-900 border border-rose-500/40 flex items-center justify-center font-bold text-white shadow-md shadow-rose-950/60 group-hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all duration-200 relative overflow-hidden">
            <span className="absolute inset-0.5 rounded-[9px] border border-white/20 pointer-events-none" />
            <span className="font-japanese font-semibold text-sm">日</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-zinc-100 tracking-tight font-sans">
                NIHONGO N2 MASTER
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 font-mono font-bold border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                {profile.level}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center space-x-1.5 font-sans">
              <span>JLPT Mastery OS</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 flex items-center font-medium">
                <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline text-emerald-400" /> Offline IndexedDB
              </span>
            </div>
          </div>
        </div>

        {/* Center Progress Meter */}
        <div className="hidden md:flex items-center space-x-3 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden ring-1 ring-zinc-700/60">
            <div
              className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-300 font-medium font-mono tabular-nums">
            {todayMinutes}m / {goalMinutes}m <span className="text-zinc-500 font-normal">({(todayMinutes / 60).toFixed(1)}h / 6h)</span>
          </span>
        </div>

        {/* Right Status Badges & Diagnostics Button */}
        <div className="flex items-center space-x-2">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              title="Global Quick Search (Ctrl+K or /)"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 font-medium transition cursor-pointer active:scale-95 group shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400 transition-colors" />
              <span className="hidden md:inline text-zinc-400 group-hover:text-zinc-200">Search</span>
              <kbd className="px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                /
              </kbd>
            </button>
          )}

          {profile.studyStreakDays && profile.studyStreakDays > 0 ? (
            <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.studyStreakDays}d</span>
            </div>
          ) : null}

          {onOpenDiagnostics ? (
            <button
              onClick={onOpenDiagnostics}
              title="Inspect PWA Offline Storage & Dexie Sync Diagnostics"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 font-medium transition cursor-pointer active:scale-95 group shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </span>
              <span className="group-hover:text-zinc-100 hidden sm:inline">Storage &amp; Sync</span>
              <Database className="w-3 h-3 text-zinc-400 sm:hidden" />
            </button>
          ) : (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_#10b981]"></span>
              <span className="hidden sm:inline">Local Offline Storage</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
