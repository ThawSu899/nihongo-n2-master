import React, { useState } from 'react';
import { Play, Pause, CheckCircle, SkipForward, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { StudyTimerState } from '../../domain/models/types';

interface TimerWidgetProps {
  timerState: StudyTimerState;
  elapsedSec: number;
  remainingSec: number;
  isIdlePaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onSkip: () => void;
  todayStudiedMinutes: number;
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
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

  return (
    <aside
      aria-label="Active Study Timer"
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-30 transition-all duration-200 select-none"
    >
      <div className="bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 text-zinc-100 flex flex-col space-y-2 min-w-[210px] sm:min-w-[240px]">
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
                className="stroke-zinc-800"
                strokeWidth="3"
                fill="transparent"
              />
              {/* Progress Stroke */}
              <circle
                cx="20"
                cy="20"
                r={radius}
                stroke={isRunning ? '#10b981' : '#f59e0b'}
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
              className="absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center text-zinc-200 hover:text-white transition cursor-pointer"
              title={isRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
            </button>
          </div>

          {/* Time & Block Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-zinc-100 font-mono tracking-wider tabular-nums">
                {formatTime(remainingSec)}
              </span>
              {isIdlePaused && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50 font-mono">
                  PAUSED
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 truncate font-medium">
              {blockTitle}
            </div>
          </div>

          {/* Expand / Minimize Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand Details'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandable Details Pane */}
        {isExpanded && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex justify-between text-zinc-400 text-[11px] font-mono">
              <span>Elapsed: {formatTime(elapsedSec)}</span>
              <span>Target: {timerState.targetMinutes}m</span>
            </div>

            {/* Quick Micro Action Controls */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <button
                onClick={onFinish}
                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold flex items-center justify-center space-x-1 transition cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>

              <button
                onClick={onSkip}
                className="py-1.5 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-300 text-[11px] font-medium flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Skip Block"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-zinc-400 text-center font-mono">
              Today's Session Total: {todayStudiedMinutes}m
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
