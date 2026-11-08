import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Play,
  Layers,
  CheckSquare,
  BarChart2,
  Settings,
  Sparkles,
  Clock,
  Database,
  Search,
  Menu,
  X,
  ChevronRight,
  Zap,
  Mic,
  Flame,
} from 'lucide-react';
import { UserProfile } from '../../domain/models/types';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  dueSrsCount: number;
  hasActiveSession?: boolean;
  isTestActive?: boolean;
  todayMinutes?: number;
  goalMinutes?: number;
  profile?: UserProfile | null;
  onOpenDiagnostics?: () => void;
  onOpenSearch?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  dueSrsCount,
  hasActiveSession,
  isTestActive = false,
  todayMinutes = 0,
  goalMinutes = 360,
  profile,
  onOpenDiagnostics,
  onOpenSearch,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Group 1: Core Daily Learning
  const coreNavItems = [
    { id: 'home', label: 'Dashboard', icon: Home, shortLabel: 'Home' },
    { id: 'curriculum', label: 'Curriculum (174)', icon: BookOpen, shortLabel: 'Curriculum' },
    {
      id: 'player',
      label: hasActiveSession ? 'Continue Lesson' : 'Study Room',
      shortLabel: hasActiveSession ? 'Continue' : 'Study',
      icon: Play,
      isAction: true,
      badge: hasActiveSession ? 'Active' : undefined,
    },
    {
      id: 'srs',
      label: 'SRS Flashcards',
      shortLabel: 'SRS',
      icon: Layers,
      badge: dueSrsCount > 0 ? dueSrsCount : undefined,
    },
  ];

  // Group 2: Mastery, Analytics & System
  const secondaryNavItems = [
    { id: 'shadowing', label: 'Shadowing (発音)', shortLabel: 'Shadow', icon: Mic },
    { id: 'quarantine', label: 'Ghost Cards (鬼)', shortLabel: 'Quarantine', icon: Flame },
    { id: 'tests', label: 'Mock & Tests', shortLabel: 'Tests', icon: CheckSquare },
    { id: 'progress', label: 'Progress & Radar', shortLabel: 'Progress', icon: BarChart2 },
    { id: 'kana', label: 'Kana Trainer', shortLabel: 'Kana', icon: Sparkles },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ];

  // Mobile bottom bar tabs (5 touch-friendly anchors + More menu)
  const mobileBottomTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    {
      id: 'player',
      label: hasActiveSession ? 'Continue' : 'Study',
      icon: Play,
      isAction: true,
    },
    {
      id: 'srs',
      label: 'SRS',
      icon: Layers,
      badge: dueSrsCount > 0 ? dueSrsCount : undefined,
    },
    { id: 'tests', label: 'Tests', icon: CheckSquare },
  ];

  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

  // Auto-hide during formal test or mock exam session to maximize screen focus
  if (isTestActive) {
    return null;
  }

  const handleMobileSelect = (viewId: string) => {
    onNavigate(viewId);
    setIsMobileMenuOpen(false);
  };

  const renderDesktopNavItem = (item: (typeof coreNavItems)[0]) => {
    const Icon = item.icon;
    const active = currentView === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
          active
            ? 'text-white font-semibold bg-zinc-900 border border-zinc-750 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? item.isAction
                  ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-zinc-800 text-rose-400'
                : item.isAction
                ? 'bg-rose-950/60 text-rose-400 group-hover:bg-rose-900/80'
                : 'bg-zinc-900/80 text-zinc-400 group-hover:text-zinc-200'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="tracking-tight">{item.label}</span>
        </div>

        {/* Badges */}
        {item.badge !== undefined && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              typeof item.badge === 'number'
                ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-amber-950 text-amber-300 border border-amber-800/60'
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Active Pill Indicator */}
        {active && (
          <motion.div
            layoutId="activeDesktopNavBorder"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-rose-500 rounded-r-full"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </button>
    );
  };

  return (
    <>
      {/* =========================================================================
          1. PERSISTENT DESKTOP SIDEBAR (md:flex)
          ========================================================================= */}
      <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 h-screen sticky top-0 bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-850 p-4 z-30 select-none">
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Brand Emblem & Level Header */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-3 cursor-pointer group px-1 py-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-900 border border-rose-500/40 flex items-center justify-center font-bold text-white shadow-md shadow-rose-950/60 group-hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all duration-200 relative overflow-hidden shrink-0">
              <span className="absolute inset-0.5 rounded-[9px] border border-white/20 pointer-events-none" />
              <span className="font-japanese font-semibold text-base">日</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-zinc-100 tracking-tight font-sans truncate">
                  NIHONGO N2
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/80 text-rose-300 font-mono font-bold border border-rose-500/40 shrink-0">
                  {profile?.level || 'N2'}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-sans block truncate">
                JLPT OS • 174 Lessons
              </span>
            </div>
          </div>

          {/* Quick Search Shortcut Trigger */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition group cursor-pointer shadow-inner"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-400 transition-colors" />
                <span>Search curriculum...</span>
              </div>
              <kbd className="px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-500">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Navigation Groups */}
          <nav className="space-y-4">
            {/* Core Learning Group */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-3.5 py-1 block">
                Daily Study
              </span>
              {coreNavItems.map(renderDesktopNavItem)}
            </div>

            {/* Assessment & Analytics Group */}
            <div className="space-y-1 pt-2 border-t border-zinc-850/80">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-zinc-500 px-3.5 py-1 block">
                Mastery &amp; Tools
              </span>
              {secondaryNavItems.map(renderDesktopNavItem)}
            </div>
          </nav>
        </div>

        {/* Bottom Sidebar Utility: Daily Target Meter & Storage Status */}
        <div className="space-y-3 pt-3 border-t border-zinc-850/80">
          {/* Daily Study Progress Widget */}
          <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" /> Daily Target
              </span>
              <span className="font-mono text-rose-300 font-bold text-[11px]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-800/90 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>{todayMinutes}m studied</span>
              <span>{goalMinutes}m goal</span>
            </div>
          </div>

          {/* Storage & Sync Status Indicator */}
          <div className="flex items-center justify-between px-1 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              </span>
              <span className="text-[10px] text-zinc-400">Offline DB Primed</span>
            </div>
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                className="text-zinc-400 hover:text-zinc-200 transition p-1.5 hover:bg-zinc-850 rounded-lg cursor-pointer"
                title="Open Storage & Sync Diagnostics"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE DOCKED BOTTOM NAVIGATION (md:hidden)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/90 px-2 py-1.5 safe-area-bottom flex items-center justify-around select-none shadow-[0_-8px_28px_rgba(0,0,0,0.85)]">
        {mobileBottomTabs.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => handleMobileSelect(item.id)}
                className="relative -top-3 p-3 rounded-full bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-[0_0_18px_rgba(244,63,94,0.6)] active:scale-95 transition cursor-pointer border border-rose-500/40"
                aria-label={item.label}
              >
                <Icon className="w-5 h-5 fill-white" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleMobileSelect(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition cursor-pointer min-w-[56px] min-h-[44px] ${
                active ? 'text-rose-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4.5 h-4.5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="activeMobileDot"
                  className="w-1 h-1 rounded-full bg-rose-500 mt-0.5"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        {/* Mobile "More" Drawer Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition cursor-pointer min-w-[56px] min-h-[44px] ${
            ['progress', 'kana', 'settings', 'shadowing', 'quarantine'].includes(currentView)
              ? 'text-rose-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="More navigation options"
        >
          <div className="relative">
            <Menu className="w-4.5 h-4.5" />
            {['progress', 'kana', 'settings', 'shadowing', 'quarantine'].includes(currentView) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <span className="mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* =========================================================================
          3. MOBILE "MORE" DRAWER MODAL
          ========================================================================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-10"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-xs">
                    日
                  </div>
                  <span className="text-sm font-bold text-zinc-100">Quick Navigation &amp; Tools</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of secondary destinations */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleMobileSelect('shadowing')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'shadowing'
                      ? 'bg-zinc-800 border-cyan-500/60 text-white'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <Mic className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold block">Shadowing (発音)</span>
                    <span className="text-[10px] text-zinc-500">Audio pitch &amp; speech</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('quarantine')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'quarantine'
                      ? 'bg-zinc-800 border-rose-500/60 text-white'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <Flame className="w-5 h-5 text-rose-400" />
                  <div>
                    <span className="text-xs font-semibold block">Ghost Cards (鬼)</span>
                    <span className="text-[10px] text-zinc-500">Leech recovery drills</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('progress')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'progress'
                      ? 'bg-zinc-800 border-rose-500/60 text-white'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold block">Progress &amp; Radar</span>
                    <span className="text-[10px] text-zinc-500">Skill mastery analytics</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('kana')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'kana'
                      ? 'bg-zinc-800 border-rose-500/60 text-white'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold block">Kana Trainer</span>
                    <span className="text-[10px] text-zinc-500">Hiragana &amp; Katakana</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('settings')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'settings'
                      ? 'bg-zinc-800 border-rose-500/60 text-white'
                      : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold block">Settings</span>
                    <span className="text-[10px] text-zinc-500">Anki, audio &amp; profile</span>
                  </div>
                </button>

                {onOpenDiagnostics && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenDiagnostics();
                    }}
                    className="p-3.5 rounded-2xl border bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700 flex flex-col items-start space-y-2 transition cursor-pointer text-left"
                  >
                    <Database className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold block">Storage &amp; Sync</span>
                      <span className="text-[10px] text-zinc-500">Offline DB diagnostics</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Mobile Quick Search Button */}
              {onOpenSearch && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSearch();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-800/80 border border-zinc-750 flex items-center justify-between text-xs text-zinc-300 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-rose-400" />
                    <span>Quick Search Curriculum...</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
