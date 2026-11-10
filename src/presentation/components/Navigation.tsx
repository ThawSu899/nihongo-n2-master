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
  Library,
  Award,
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
    { id: 'level-bulk-study', label: 'Level Decks (単語帳)', shortLabel: 'Decks', icon: Library },
    { id: 'mock-exam', label: 'JLPT Mock Exam (模試)', shortLabel: 'Mock', icon: Award },
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
            ? 'text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? item.isAction
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-100 text-indigo-700'
                : item.isAction
                ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                : 'bg-stone-200/70 text-stone-500 group-hover:text-stone-700'
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
                ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Active Pill Indicator */}
        {active && (
          <motion.div
            layoutId="activeDesktopNavBorder"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full"
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
      <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 h-screen sticky top-0 bg-stone-100 border-r border-stone-200 p-4 z-30 select-none">
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Brand Emblem & Level Header */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-3 cursor-pointer group px-1 py-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-500/30 flex items-center justify-center font-bold text-white shadow-xs group-hover:shadow-sm transition-all duration-200 relative overflow-hidden shrink-0">
              <span className="absolute inset-0.5 rounded-[9px] border border-white/20 pointer-events-none" />
              <span className="font-japanese font-semibold text-base">日</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-stone-900 tracking-tight font-sans truncate">
                  NIHONGO N2
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200 shrink-0">
                  {profile?.level || 'N2'}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-sans block truncate">
                JLPT OS • 174 Lessons
              </span>
            </div>
          </div>

          {/* Quick Search Shortcut Trigger */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-xs text-stone-600 hover:text-stone-900 transition group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-stone-500 group-hover:text-indigo-600 transition-colors" />
                <span>Search curriculum...</span>
              </div>
              <kbd className="px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-500">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Navigation Groups */}
          <nav className="space-y-4">
            {/* Core Learning Group */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-stone-500 px-3.5 py-1 block">
                Daily Study
              </span>
              {coreNavItems.map(renderDesktopNavItem)}
            </div>

            {/* Assessment & Analytics Group */}
            <div className="space-y-1 pt-2 border-t border-stone-200">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-stone-500 px-3.5 py-1 block">
                Mastery &amp; Tools
              </span>
              {secondaryNavItems.map(renderDesktopNavItem)}
            </div>
          </nav>
        </div>

        {/* Bottom Sidebar Utility: Daily Target Meter & Storage Status */}
        <div className="space-y-3 pt-3 border-t border-stone-200">
          {/* Daily Study Progress Widget */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> Daily Target
              </span>
              <span className="font-mono text-indigo-700 font-bold text-[11px]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>{todayMinutes}m studied</span>
              <span>{goalMinutes}m goal</span>
            </div>
          </div>

          {/* Storage & Sync Status Indicator */}
          <div className="flex items-center justify-between px-1 text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              </span>
              <span className="text-[10px] text-stone-600">Offline DB Primed</span>
            </div>
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                className="text-stone-500 hover:text-stone-700 transition p-1.5 hover:bg-stone-200/60 rounded-lg cursor-pointer"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200 px-2 py-1.5 safe-area-bottom flex items-center justify-around select-none shadow-lg">
        {mobileBottomTabs.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => handleMobileSelect(item.id)}
                className="relative -top-3 p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition cursor-pointer border border-indigo-700"
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
                active ? 'text-indigo-700 font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <div className="relative">
                <Icon className="w-4.5 h-4.5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-indigo-600 text-white text-[9px] font-bold font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {active && (
                <motion.div
                  layoutId="activeMobileDot"
                  className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5"
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
            ['progress', 'kana', 'settings', 'shadowing', 'quarantine', 'level-bulk-study'].includes(currentView)
              ? 'text-indigo-700 font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
          aria-label="More navigation options"
        >
          <div className="relative">
            <Menu className="w-4.5 h-4.5" />
            {['progress', 'kana', 'settings', 'shadowing', 'quarantine', 'level-bulk-study'].includes(currentView) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600" />
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
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 bg-white border-t border-stone-200 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-10 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    日
                  </div>
                  <span className="text-sm font-bold text-stone-900">Quick Navigation &amp; Tools</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of secondary destinations */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleMobileSelect('level-bulk-study')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'level-bulk-study'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Library className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Level Decks (単語帳)</span>
                    <span className="text-[10px] text-stone-500">N5–N2 bulk vocabulary</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('shadowing')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'shadowing'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Mic className="w-5 h-5 text-sky-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Shadowing (発音)</span>
                    <span className="text-[10px] text-stone-500">Audio pitch &amp; speech</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('quarantine')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'quarantine'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Flame className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Ghost Cards (鬼)</span>
                    <span className="text-[10px] text-stone-500">Leech recovery drills</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('progress')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'progress'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Progress &amp; Radar</span>
                    <span className="text-[10px] text-stone-500">Skill mastery analytics</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('kana')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'kana'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Kana Trainer</span>
                    <span className="text-[10px] text-stone-500">Hiragana &amp; Katakana</span>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileSelect('settings')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start space-y-2 transition cursor-pointer text-left ${
                    currentView === 'settings'
                      ? 'bg-indigo-50 border-indigo-300 text-stone-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Settings className="w-5 h-5 text-stone-600" />
                  <div>
                    <span className="text-xs font-semibold block text-stone-900">Settings</span>
                    <span className="text-[10px] text-stone-500">Anki, audio &amp; profile</span>
                  </div>
                </button>

                {onOpenDiagnostics && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenDiagnostics();
                    }}
                    className="p-3.5 rounded-2xl border bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100 flex flex-col items-start space-y-2 transition cursor-pointer text-left"
                  >
                    <Database className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-semibold block text-stone-900">Storage &amp; Sync</span>
                      <span className="text-[10px] text-stone-500">Offline DB diagnostics</span>
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
                  className="w-full py-3 px-4 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between text-xs text-stone-700 hover:text-stone-900 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-indigo-600" />
                    <span>Quick Search Curriculum...</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
