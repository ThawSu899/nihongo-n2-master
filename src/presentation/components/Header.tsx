import React from 'react';
import { BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../domain/models/types';

interface HeaderProps {
  profile: UserProfile;
  todayMinutes: number;
  onNavigate: (view: string) => void;
  isTestActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  todayMinutes,
  onNavigate,
  isTestActive = false,
}) => {
  const goalMinutes = profile.dailyTargetMinutes || 360;
  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  return (
    <header className="sticky top-0 z-30 bg-stone-950/85 backdrop-blur-md border-b border-stone-800/90 px-4 py-2.5 relative">
      {/* Subtle top lacquer accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500/30 via-amber-500/25 to-emerald-500/30" />

      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand with Kamon (Family Crest) inspired crest */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 border border-rose-500/40 flex items-center justify-center font-bold text-white shadow-md shadow-rose-950 group-hover:from-rose-500 group-hover:to-rose-700 transition relative overflow-hidden">
            {/* Subtle inner circular crest ring */}
            <span className="absolute inset-0.5 rounded-[9px] border border-white/20 pointer-events-none" />
            <span className="font-japanese font-semibold text-sm">日</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm text-stone-100 tracking-tight font-sans">NIHONGO N2 MASTER</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-900/90 text-rose-300 font-mono font-semibold border border-rose-900/40">
                {profile.level}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 flex items-center space-x-1 font-sans">
              <span>JLPT-Aligned Mastery OS</span>
              <span className="text-stone-600">·</span>
              <span className="text-emerald-400 flex items-center">
                <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline text-emerald-400" /> Offline-First Platform
              </span>
            </div>
          </div>
        </div>

        {/* Center Progress Preview with Japanese Traditional Ink & Sakura Meter */}
        <div className="hidden md:flex items-center space-x-3 bg-stone-900/80 px-3.5 py-1.5 rounded-full border border-stone-800 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-rose-400/80" />
          <div className="w-24 bg-stone-850 rounded-full h-1.5 overflow-hidden ring-1 ring-stone-800">
            <div
              className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300 shadow-sm shadow-rose-500/40"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-stone-300 font-medium font-mono">
            {todayMinutes}m / {goalMinutes}m <span className="text-stone-500">({Math.round(todayMinutes / 60 * 10) / 10}h / 6h)</span>
          </span>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-900/90 border border-stone-800 text-[11px] text-stone-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Local Offline Storage</span>
          </div>
        </div>
      </div>
    </header>
  );
};
