import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trophy,
  Snowflake,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  WeeklyHabitDay,
  calculateLongestStreak,
  getWeeklyHabitHistory,
  getLogicalDayKey,
} from '../../domain/analytics/streak-calculator';
import { db } from '../../data/db/dexie-db';

export interface DailyTargetStreakWidgetProps {
  currentStreak?: number;
  longestStreak?: number;
  todayCompletedCount?: number;
  defaultTarget?: number;
  onTargetChange?: (newTarget: number) => void;
  weeklyHistory?: WeeklyHabitDay[];
  isStreakProtected?: boolean;
  onStartStudy?: () => void;
  className?: string;
}

const TARGET_PRESETS = [15, 30, 50];
const STORAGE_TARGET_KEY = 'nihongo_daily_target_words';
const STORAGE_FREEZE_KEY = 'nihongo_streak_freeze';

export const DailyTargetStreakWidget: React.FC<DailyTargetStreakWidgetProps> = ({
  currentStreak: propStreak,
  longestStreak: propLongest,
  todayCompletedCount: propCompleted,
  defaultTarget = 30,
  onTargetChange,
  weeklyHistory: propWeekly,
  isStreakProtected: propProtected,
  onStartStudy,
  className = '',
}) => {
  // Target Setting State (Persisted to localStorage)
  const [target, setTarget] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_TARGET_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (TARGET_PRESETS.includes(parsed)) return parsed;
      }
    }
    return defaultTarget;
  });

  // Local Hydrated State from Dexie DB
  const [dbStreak, setDbStreak] = useState<number>(propStreak ?? 0);
  const [dbLongest, setDbLongest] = useState<number>(propLongest ?? 0);
  const [dbCompletedToday, setDbCompletedToday] = useState<number>(propCompleted ?? 0);
  const [dbWeeklyHistory, setDbWeeklyHistory] = useState<WeeklyHabitDay[]>(propWeekly ?? []);
  const [isProtected, setIsProtected] = useState<boolean>(() => {
    if (propProtected !== undefined) return propProtected;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_FREEZE_KEY) === 'true';
    }
    return false;
  });

  // Query DB asynchronously for live stats
  useEffect(() => {
    let isCancelled = false;

    const loadLiveStats = async () => {
      try {
        const sessions = await db.study_sessions.toArray();
        const longest = calculateLongestStreak(sessions);
        const weekly = getWeeklyHabitHistory(sessions);

        // Calculate today's reviews/exercises
        const now = new Date();
        const todayKey = getLogicalDayKey(now, 4);

        let todayCount = 0;
        // Count from review_logs
        const reviews = await db.review_logs.toArray();
        for (const r of reviews) {
          if (r.reviewedAt && getLogicalDayKey(r.reviewedAt, 4) === todayKey) {
            todayCount++;
          }
        }

        // Add from sessions if reviews are 0
        if (todayCount === 0) {
          for (const s of sessions) {
            if (s.startedAt && getLogicalDayKey(s.startedAt, 4) === todayKey) {
              todayCount += s.exercisesCompleted || 0;
            }
          }
        }

        if (!isCancelled) {
          if (propLongest === undefined) setDbLongest(longest);
          if (propWeekly === undefined) setDbWeeklyHistory(weekly);
          if (propCompleted === undefined) setDbCompletedToday(todayCount);
        }
      } catch {
        // Fallback gracefully in test/SSR environments
      }
    };

    loadLiveStats();

    return () => {
      isCancelled = true;
    };
  }, [propLongest, propWeekly, propCompleted]);

  // Sync prop changes
  useEffect(() => {
    if (propStreak !== undefined) setDbStreak(propStreak);
  }, [propStreak]);

  useEffect(() => {
    if (propLongest !== undefined) setDbLongest(propLongest);
  }, [propLongest]);

  useEffect(() => {
    if (propCompleted !== undefined) setDbCompletedToday(propCompleted);
  }, [propCompleted]);

  useEffect(() => {
    if (propWeekly !== undefined) setDbWeeklyHistory(propWeekly);
  }, [propWeekly]);

  useEffect(() => {
    if (propProtected !== undefined) setIsProtected(propProtected);
  }, [propProtected]);

  // Target change handler
  const handleSetTarget = useCallback(
    (newTarget: number) => {
      setTarget(newTarget);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_TARGET_KEY, String(newTarget));
      }
      onTargetChange?.(newTarget);
    },
    [onTargetChange]
  );

  const effectiveStreak = propStreak !== undefined ? propStreak : dbStreak;
  const effectiveLongest = Math.max(
    effectiveStreak,
    propLongest !== undefined ? propLongest : dbLongest
  );
  const effectiveCompleted = propCompleted !== undefined ? propCompleted : dbCompletedToday;

  const percent = Math.min(100, Math.round((effectiveCompleted / target) * 100));
  const isGoalAchieved = effectiveCompleted >= target;

  // Fallback 7-day matrix if history not yet populated
  const displayWeekly: WeeklyHabitDay[] = useMemo(() => {
    if (dbWeeklyHistory && dbWeeklyHistory.length === 7) {
      return dbWeeklyHistory;
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d, i) => ({
      day: d,
      date: `2026-11-0${i + 1}`,
      completed: i < effectiveStreak,
      isToday: i === 6,
      count: i < effectiveStreak ? 1 : 0,
    }));
  }, [dbWeeklyHistory, effectiveStreak]);

  // SVG Circular progress math (r=38, circumference=238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percent / 100) * circumference;

  return (
    <section
      aria-label="Daily Target and Study Streak Dashboard"
      className={`w-full bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0 shadow-xs">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-stone-900 font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Daily Target &amp; Study Streak</span>
              {isProtected && (
                <span className="text-[10px] font-mono font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Snowflake className="w-3 h-3 text-cyan-600" />
                  <span>Protected</span>
                </span>
              )}
            </h3>
            <p className="text-stone-600 text-xs font-burmese mt-0.5">
              နေ့စဉ် လေ့လာရေး ပန်းတိုင်နှင့် ရက်ဆက် လေ့လာမှု အလေ့အကျင့်
            </p>
          </div>
        </div>

        {/* Quick Goal Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-stone-500 uppercase">Goal:</span>
          <div className="flex items-center gap-1 p-1 bg-stone-50 border border-stone-200 rounded-xl">
            {TARGET_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSetTarget(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  target === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title={`Set daily target to ${t} words`}
              >
                {`${t}w`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Consecutive Study Streak & Flame */}
        <div className="bg-stone-50/70 border border-amber-200/80 hover:border-amber-300 rounded-2xl p-4.5 space-y-3 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-600" /> Study Streak
            </span>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              {effectiveStreak > 0 ? 'Active 🔥' : 'Start Today'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-amber-700 tracking-tight">
              {effectiveStreak}
            </span>
            <span className="text-xs text-amber-700/80 font-medium font-sans">
              {`${effectiveStreak === 1 ? 'Day' : 'Days'} / ရက်ဆက်`}
            </span>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Longest: <strong className="text-zinc-200">{`${effectiveLongest}d`}</strong></span>
            <span className="text-stone-400">04:00 AM Rollover</span>
          </div>
        </div>

        {/* Card 2: Today's Target Circular & Linear Progress */}
        <div className="bg-stone-50/70 border border-stone-200 hover:border-stone-300 rounded-2xl p-4.5 transition shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-stone-600 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-indigo-600" /> Today&apos;s Target
              </span>
              <span className="font-mono font-bold text-indigo-600">{percent}%</span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-stone-900">
                {effectiveCompleted}
              </span>
              <span className="text-xs font-mono text-stone-500">{`/ ${target} words`}</span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="text-[10px] font-burmese text-stone-600 truncate">
              {isGoalAchieved
                ? '🎉 ယနေ့ ပန်းတိုင် ပြည့်မီပါပြီ!'
                : `ပန်းတိုင်ရောက်ရန် ${Math.max(0, target - effectiveCompleted)} လိုပါသည်`}
            </p>
          </div>

          {/* Circular SVG Ring */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              {/* Background Ring */}
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="stroke-stone-200 fill-none"
                strokeWidth="6"
              />
              {/* Progress Ring */}
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="stroke-indigo-600 fill-none transition-all duration-700 ease-out"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono font-bold text-stone-900">{percent}%</span>
              {isGoalAchieved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            </div>
          </div>
        </div>

        {/* Card 3: 7-Day Weekly Habit Matrix */}
        <div className="bg-stone-50/70 border border-stone-200 hover:border-stone-300 rounded-2xl p-4.5 space-y-3 transition shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" /> 7-Day Habit Tracker
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              {`${displayWeekly.filter((w) => w.completed).length}/7 days`}
            </span>
          </div>

          {/* 7-Day Visual Matrix Pills */}
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {displayWeekly.map((item, idx) => {
              return (
                <div key={`${item.date}-${idx}`} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition shadow-xs ${
                      item.completed
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 shadow-xs'
                        : item.isToday
                        ? 'bg-amber-50 border border-amber-300 text-amber-700 animate-pulse'
                        : 'bg-stone-100 border border-stone-200 text-stone-400'
                    }`}
                    title={`${item.day} (${item.date}): ${
                      item.completed ? 'Study session completed' : 'No study'
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-[10px]">{item.day.slice(0, 1)}</span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-mono ${
                      item.isToday ? 'text-amber-600 font-bold' : 'text-stone-500'
                    }`}
                  >
                    {item.day.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <span className="font-burmese text-[10px] truncate">၇ ရက်တာ လေ့လာမှုမှတ်တမ်း</span>
            {onStartStudy && (
              <button
                type="button"
                onClick={onStartStudy}
                className="text-indigo-600 hover:text-indigo-700 font-mono text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Study</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
