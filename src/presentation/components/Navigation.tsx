import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, Layers, CheckSquare, BarChart2, Settings, Play } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  dueSrsCount: number;
  hasActiveSession?: boolean;
  isTestActive?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  dueSrsCount,
  hasActiveSession,
  isTestActive = false,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'player', label: hasActiveSession ? 'Continue' : 'Study', icon: Play, isAction: true },
    { id: 'srs', label: 'SRS', icon: Layers, badge: dueSrsCount > 0 ? dueSrsCount : undefined },
    { id: 'tests', label: 'Tests', icon: CheckSquare },
    { id: 'progress', label: 'Progress', icon: BarChart2, hideOnMobile: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Auto-hide during formal test or mock exam session to maximize screen focus
  if (isTestActive) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/70 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex items-center gap-1 sm:gap-2 max-w-[95vw] sm:max-w-max select-none"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-medium flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                item.hideOnMobile ? 'hidden md:flex' : 'flex'
              } ${
                active
                  ? 'text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {/* Framer Motion Active Tab Slider Pill */}
              {active && (
                <motion.div
                  layoutId="activeNavGlow"
                  className={`absolute inset-0 rounded-full -z-10 ${
                    item.isAction
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 shadow-[0_0_18px_rgba(244,63,94,0.6)]'
                      : 'bg-zinc-800/90 border border-zinc-600/60 shadow-[0_0_14px_rgba(99,102,241,0.25)]'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon & Label */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                    active
                      ? item.isAction
                        ? 'text-white'
                        : 'text-rose-400'
                      : item.isAction
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                />

                {/* Notification Badge (SRS Due) */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold font-mono shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] sm:text-xs tracking-tight hidden sm:inline">
                {item.label}
              </span>
            </button>
          );
        })}
      </motion.nav>
    </AnimatePresence>
  );
};
