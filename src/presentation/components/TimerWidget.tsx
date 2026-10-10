import React from 'react';
import { Play, Pause, CheckCircle, SkipForward, AlertCircle, Clock } from 'lucide-react';
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
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (timerState.state === 'idle') {
    return null;
  }

  const targetSec = timerState.targetMinutes * 60;
  const progressPercent = Math.min(100, Math.round((elapsedSec / (targetSec || 1)) * 100));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 border-t border-stone-800 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Block info & countdown */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-300">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider text-rose-400 font-semibold">Active Study Block</span>
              {isIdlePaused && (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50">
                  <AlertCircle className="w-3 h-3 mr-1" /> Auto-paused (idle)
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-stone-200">
              {timerState.blockId?.replace('block_', '').replace('_', ' ').toUpperCase() || 'STUDY SESSION'}
            </div>
          </div>
        </div>

        {/* Center: Timer Numbers & Progress Bar */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>Elapsed: {formatTime(elapsedSec)}</span>
            <span className="font-mono font-bold text-stone-200">Remaining: {formatTime(remainingSec)}</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-rose-600 h-2 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex justify-between">
            <span>Block Target: {timerState.targetMinutes}m</span>
            <span>Today: {todayStudiedMinutes} / 360m (6h goal)</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-2">
          {timerState.state === 'running' ? (
            <button
              onClick={onPause}
              aria-label="Pause timer"
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center transition border border-stone-700"
            >
              <Pause className="w-4 h-4 mr-1 text-amber-400" /> Pause
            </button>
          ) : (
            <button
              onClick={onResume}
              aria-label="Resume timer"
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center transition shadow-md"
            >
              <Play className="w-4 h-4 mr-1 fill-white" /> Resume
            </button>
          )}

          <button
            onClick={onFinish}
            aria-label="Finish study block"
            className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium flex items-center transition border border-emerald-600/50"
          >
            <CheckCircle className="w-4 h-4 mr-1 text-emerald-300" /> Finish
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to skip or discard this block timer session?')) {
                onSkip();
              }
            }}
            aria-label="Skip study block"
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-300 transition"
            title="Skip Block"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
