import React from 'react';
import { Home, BookOpen, Layers, CheckSquare, BarChart2, Settings, Play } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  dueSrsCount: number;
  hasActiveSession?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  dueSrsCount,
  hasActiveSession,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
    { id: 'kana', label: 'Kana', icon: Layers },
    { id: 'player', label: hasActiveSession ? 'Continue' : 'Study', icon: Play, highlight: true },
    { id: 'srs', label: 'SRS Reviews', icon: Layers, badge: dueSrsCount > 0 ? dueSrsCount : undefined },
    { id: 'tests', label: 'Tests & Readiness', icon: CheckSquare },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation Bar */}
      <nav className="hidden md:block bg-stone-950/75 border-b border-stone-850 px-4 bg-pattern-clover-mon">
        <div className="max-w-6xl mx-auto flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition relative ${
                  active
                    ? 'border-rose-500 text-rose-300 font-semibold bg-stone-900/40'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-rose-400' : 'text-stone-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm shadow-rose-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Android & Mobile touch optimized) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-stone-950/95 border-t border-stone-850 backdrop-blur-md px-1 py-1.5 shadow-2xl safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            navItems[0], // Home
            navItems[1], // Curriculum
            navItems[3], // Study (Player)
            navItems[4], // SRS Reviews
            navItems[5], // Tests
            navItems[7], // Settings
          ].map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1 relative transition rounded-lg active:scale-95 ${
                  active
                    ? 'text-rose-400 font-semibold bg-stone-900/60'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4.5 h-4.5 mb-0.5" />
                <span className="text-[10px] tracking-tight">{item.label.split(' ')[0]}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-0.5 right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold shadow-sm shadow-rose-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
