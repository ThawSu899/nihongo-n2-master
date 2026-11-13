import React, { useState } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  SkipForward,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Flame,
  Sparkles,
  Timer,
} from 'lucide-react';
import { StudyTimerState } from '../../domain/models/types';
import {
  PomodoroFocusEngine,
  PomodoroMilestone,
} from '../../domain/timer/pomodoro-focus-engine';

export interface TimerWidgetProps {
  timerState: StudyTimerState;
  elapsedSec: number;
  remainingSec: number;
  isIdlePaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onSkip: () => void;
  todayStudiedMinutes: number;
  onStartPomodoro?: (durationMinutes?: number) => void;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  timerState,
  elapsedSec,
  remainingSec,
  isIdlePaused,
  onPause,
  onResume,
  onFinish,
  onSkip,
  todayStudiedMinutes,
  onStartPomodoro,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [celebration, setCelebration] = useState<PomodoroMilestone | null>(null);
  const [todayStreak, setTodayStreak] = useState<number>(() =>
    PomodoroFocusEngine.getTodayStreak()
  );

  if (timerState.state === 'idle') {
    return null;
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const targetSec = timerState.targetMinutes * 60;
  const progressRatio = Math.min(1, Math.max(0, elapsedSec / (targetSec || 1)));

  // SVG circular countdown stroke metrics (r = 16, C ~ 100.53)
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const isRunning = timerState.state === 'running' && !isIdlePaused;
  const blockTitle =
    timerState.blockId?.replace('block_', '').replace('_', ' ').toUpperCase() || 'STUDY BLOCK';

  const isPomodoroSprint =
    timerState.targetMinutes === 25 || timerState.blockId?.includes('pomodoro');

  const handleFinish = () => {
    const res = PomodoroFocusEngine.logCompletedSession(
      timerState.targetMinutes,
      timerState.blockId || 'block_pomodoro_sprint'
    );
    setTodayStreak(res.streakCount);
    setCelebration(res.milestone);
    onFinish();
  };

  const currentMilestone = celebration || PomodoroFocusEngine.getMilestoneCelebration(todayStreak);

  return (
    <aside
      aria-label="Active Study Timer"
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-30 transition-all duration-200 select-none"
    >
      <div className="bg-white border border-stone-200 rounded-2xl shadow-lg p-2.5 sm:p-3 text-stone-900 flex flex-col space-y-2 min-w-[220px] sm:min-w-[260px]">
        {/* Compact Island Header */}
        <div className="flex items-center justify-between space-x-3">
          {/* Circular SVG Progress Ring with Center Icon */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
              {/* Background Track */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                className="stroke-stone-200"
                strokeWidth="3"
                fill="transparent"
              />
              {/* Progress Stroke */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                stroke={isPomodoroSprint ? '#ef4444' : isRunning ? '#10b981' : '#f59e0b'}
                strokeWidth="3.2"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-300"
              />
            </svg>

            {/* Play/Pause Micro-Action Icon in Center */}
            <button
              onClick={isRunning ? onPause : onResume}
              className="absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center text-stone-700 hover:text-stone-900 transition cursor-pointer"
              title={isRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
              )}
            </button>
          </div>

          {/* Time & Block Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-stone-900 font-mono tracking-wider tabular-nums">
                {formatTime(remainingSec)}
              </span>
              {isPomodoroSprint && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold flex items-center space-x-0.5">
                  <span>🍅</span>
                  <span>25m</span>
                </span>
              )}
              {isIdlePaused && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-medium">
                  PAUSED
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-600 truncate font-medium flex items-center space-x-1">
              <span>{blockTitle}</span>
              {todayStreak > 0 && (
                <span className="text-[10px] text-amber-600 font-mono font-bold">
                  🔥{todayStreak}
                </span>
              )}
            </div>
          </div>

          {/* Expand / Minimize Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand Details'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandable Details Pane */}
        {isExpanded && (
          <div className="pt-2 border-t border-stone-200 space-y-2 text-xs animate-in fade-in duration-150">
            {/* Pomodoro Focus Sprint Milestone Celebration in Burmese */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-rose-800 flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  <span>၂၅ မိနစ် Pomodoro Sprint</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white text-rose-700 border border-rose-200">
                  {todayStreak} Sessions
                </span>
              </div>
              <p className="text-[10px] text-rose-900 leading-snug font-myanmar">
                {currentMilestone.burmese}
              </p>
            </div>

            <div className="flex justify-between text-stone-500 text-[11px] font-mono">
              <span>Elapsed: {formatTime(elapsedSec)}</span>
              <span>Target: {timerState.targetMinutes}m</span>
            </div>

            {/* Quick Micro Action Controls */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <button
                onClick={handleFinish}
                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center justify-center space-x-1 transition cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>

              <button
                onClick={onSkip}
                className="py-1.5 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[11px] font-medium flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Skip Block"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Start Next Pomodoro sprint shortcut if provided */}
            {onStartPomodoro && (
              <button
                onClick={() => onStartPomodoro(25)}
                className="w-full py-1 px-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold font-myanmar flex items-center justify-center space-x-1 transition cursor-pointer"
              >
                <span>🍅 ၂၅ မိနစ် Pomodoro အသစ်စတင်မည်</span>
              </button>
            )}

            <div className="text-[10px] text-stone-500 text-center font-mono">
              Today's Session Total: {todayStudiedMinutes}m
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
