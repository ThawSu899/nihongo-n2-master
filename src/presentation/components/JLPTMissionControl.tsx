import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Compass,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Target,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MasteryRecord, UserProfile } from '../../domain/models/types';
import { ContentLoader } from '../../data/content/content-loader';
import { db } from '../../data/db/dexie-db';
import {
  calculateMissionControlReadiness,
  MissionControlReadinessResult,
} from '../../domain/analytics/mission-control-calculator';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2';

export interface JLPTExamTarget {
  targetDate: string; // ISO date 'YYYY-MM-DD'
  targetLevel: JLPTLevel;
}

export const EXAM_TARGET_STORAGE_KEY = 'nihongo_exam_target';
export const DEFAULT_EXAM_DATE = '2026-12-06';
export const DEFAULT_EXAM_LEVEL: JLPTLevel = 'N2';
export const TARGET_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2'];

export function getStoredExamTarget(fallbackLevel?: string): JLPTExamTarget {
  const validFallback: JLPTLevel =
    fallbackLevel && (TARGET_LEVELS as string[]).includes(fallbackLevel)
      ? (fallbackLevel as JLPTLevel)
      : DEFAULT_EXAM_LEVEL;

  if (typeof globalThis.localStorage === 'undefined') {
    return { targetDate: DEFAULT_EXAM_DATE, targetLevel: validFallback };
  }

  try {
    const raw = globalThis.localStorage.getItem(EXAM_TARGET_STORAGE_KEY);
    if (!raw) {
      return { targetDate: DEFAULT_EXAM_DATE, targetLevel: validFallback };
    }
    const parsed = JSON.parse(raw);
    const targetDate =
      typeof parsed?.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.targetDate)
        ? parsed.targetDate
        : DEFAULT_EXAM_DATE;
    const targetLevel: JLPTLevel = (TARGET_LEVELS as string[]).includes(parsed?.targetLevel)
      ? parsed.targetLevel
      : validFallback;

    return { targetDate, targetLevel };
  } catch {
    return { targetDate: DEFAULT_EXAM_DATE, targetLevel: validFallback };
  }
}

export function saveStoredExamTarget(target: JLPTExamTarget): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(EXAM_TARGET_STORAGE_KEY, JSON.stringify(target));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nihongo_exam_target_updated', { detail: target }));
    }
  } catch (err) {
    console.warn('Failed to save JLPT exam target to localStorage:', err);
  }
}

export interface JLPTMissionControlProps {
  masteryRecords?: Record<string, MasteryRecord>;
  profile?: UserProfile;
  onNavigate?: (view: string) => void;
  onSelectLevel?: (level: JLPTLevel) => void;
  className?: string;
}

export const JLPTMissionControl: React.FC<JLPTMissionControlProps> = ({
  masteryRecords: propMasteryRecords,
  profile,
  onNavigate,
  onSelectLevel,
  className = '',
}) => {
  // Configurable Target State (Persisted in localStorage under nihongo_exam_target)
  const [examTarget, setExamTarget] = useState<JLPTExamTarget>(() =>
    getStoredExamTarget(profile?.level)
  );

  // Synchronize state across multiple instances or tabs
  useEffect(() => {
    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<JLPTExamTarget>;
      if (customEvent.detail) {
        setExamTarget(customEvent.detail);
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === EXAM_TARGET_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setExamTarget({
            targetDate: parsed.targetDate || DEFAULT_EXAM_DATE,
            targetLevel: parsed.targetLevel || DEFAULT_EXAM_LEVEL,
          });
        } catch {
          // ignore malformed storage update
        }
      }
    };

    window.addEventListener('nihongo_exam_target_updated', handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('nihongo_exam_target_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Hydrate mastery records from IndexedDB
  const [dbRecords, setDbRecords] = useState<MasteryRecord[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const fetchRecords = async () => {
      try {
        const records = await db.mastery_records.toArray();
        if (!isCancelled) {
          setDbRecords(records);
        }
      } catch (err) {
        console.warn('Could not query mastery_records from IndexedDB:', err);
      }
    };

    fetchRecords();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Curriculum map items for the target level
  const curriculumMap = useMemo(() => ContentLoader.getCurriculumMap(), []);
  const levelLessons = useMemo(
    () => curriculumMap.filter((item) => item.level === examTarget.targetLevel),
    [curriculumMap, examTarget.targetLevel]
  );
  const totalLessonsInLevel = levelLessons.length || 1;

  // Completed lessons calculation
  const completedLessonsCount = useMemo(() => {
    const levelLessonIds = new Set(levelLessons.map((l) => l.id.toLowerCase()));
    const completedSet = new Set<string>();

    // 1. From prop masteryRecords if provided
    if (propMasteryRecords) {
      Object.values(propMasteryRecords).forEach((rec) => {
        if (
          (rec.state === 'mastered' || rec.state === 'retained') &&
          (rec.lessonId.toLowerCase().startsWith(`${examTarget.targetLevel.toLowerCase()}.`) ||
            levelLessonIds.has(rec.lessonId.toLowerCase()))
        ) {
          completedSet.add(rec.lessonId.toLowerCase());
        }
      });
    }

    // 2. From IndexedDB live records
    dbRecords.forEach((rec) => {
      if (
        (rec.state === 'mastered' || rec.state === 'retained') &&
        (rec.lessonId.toLowerCase().startsWith(`${examTarget.targetLevel.toLowerCase()}.`) ||
          levelLessonIds.has(rec.lessonId.toLowerCase()))
      ) {
        completedSet.add(rec.lessonId.toLowerCase());
      }
    });

    return completedSet.size;
  }, [propMasteryRecords, dbRecords, levelLessons, examTarget.targetLevel]);

  // Uncompleted lessons remaining
  const remainingLessons = Math.max(0, totalLessonsInLevel - completedLessonsCount);

  // Days remaining calculation
  const daysRemaining = useMemo(() => {
    try {
      const [year, month, day] = examTarget.targetDate.split('-').map(Number);
      const targetMidnight = new Date(year, (month || 1) - 1, day || 1).getTime();
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffMs = targetMidnight - todayMidnight;
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  }, [examTarget.targetDate]);

  // Pure calculation of JLPT Mission Control Readiness and Required Daily Velocity
  const readinessResult: MissionControlReadinessResult = useMemo(() => {
    return calculateMissionControlReadiness({
      remainingLessons,
      daysRemaining,
      targetMinutesPerLesson: 60,
      configuredDailyTargetMinutes: profile?.dailyTargetMinutes || 360,
    });
  }, [remainingLessons, daysRemaining, profile?.dailyTargetMinutes]);

  const requiredDailyVelocity = readinessResult.requiredDailyVelocity;
  const estimatedDailyStudyMinutes = readinessResult.estimatedDailyStudyMinutes;
  const isOnTrack = readinessResult.isOnTrack;
  const readinessTextCombined = readinessResult.readinessTextCombined;

  // Progress percentage
  const progressPercent = Math.min(
    100,
    Math.round((completedLessonsCount / totalLessonsInLevel) * 100)
  );

  // Handlers for user interaction
  const handleLevelChange = useCallback(
    (lvl: JLPTLevel) => {
      const updated: JLPTExamTarget = { ...examTarget, targetLevel: lvl };
      setExamTarget(updated);
      saveStoredExamTarget(updated);
      if (onSelectLevel) {
        onSelectLevel(lvl);
      }
    },
    [examTarget, onSelectLevel]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val) {
        const updated: JLPTExamTarget = { ...examTarget, targetDate: val };
        setExamTarget(updated);
        saveStoredExamTarget(updated);
      }
    },
    [examTarget]
  );

  const handleResetDefaultDate = useCallback(() => {
    const updated: JLPTExamTarget = {
      ...examTarget,
      targetDate: DEFAULT_EXAM_DATE,
    };
    setExamTarget(updated);
    saveStoredExamTarget(updated);
  }, [examTarget]);

  return (
    <section
      aria-label="JLPT Mission Control"
      className={`bg-card border border-border hover:border-indigo-200/80 rounded-3xl p-6 sm:p-7 shadow-sm transition-all duration-300 relative overflow-hidden ${className}`}
    >
      {/* Background Accent Pill */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Compass className="w-5 h-5 text-indigo-600" />
            </span>
            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>JLPT Mission Control</span>
              <span className="text-xs font-normal text-muted-foreground hidden sm:inline font-sans">
                (Predictive Burn-Down &amp; Velocity Planner)
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            JLPT စာမေးပွဲ အထူးကွပ်ကဲရေးစင်တာ • Real-time curriculum burn-down and study pacing
          </p>
        </div>

        {/* Level & Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Level Pills */}
          <div
            role="group"
            aria-label="Target JLPT Level"
            className="flex items-center p-1 bg-muted rounded-xl border border-border text-xs font-mono font-semibold"
          >
            {TARGET_LEVELS.map((lvl) => {
              const isSelected = examTarget.targetLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => handleLevelChange(lvl)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-card text-indigo-700 shadow-xs font-bold border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={isSelected}
                  title={`Target JLPT ${lvl}`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>

          {/* Target Exam Date Input */}
          <div className="flex items-center space-x-1.5 bg-muted/50 border border-border rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={examTarget.targetDate}
              onChange={handleDateChange}
              aria-label="Target JLPT Exam Date"
              className="text-xs font-mono text-foreground bg-transparent border-0 focus:outline-hidden focus:ring-0 cursor-pointer"
            />
            {examTarget.targetDate !== DEFAULT_EXAM_DATE && (
              <button
                onClick={handleResetDefaultDate}
                className="p-1 text-muted-foreground hover:text-indigo-600 rounded transition cursor-pointer"
                title="Reset to December 6, 2026"
                aria-label="Reset target date to default"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Burn-Down & Velocity Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 relative z-10">
        {/* Metric 1: Countdown to Exam */}
        <div className="bg-muted/50/70 border border-border rounded-2xl p-4.5 space-y-1.5 hover:bg-muted/50 hover:border-border transition">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center font-medium font-sans text-foreground">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Days Remaining
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">ကျန်ရှိရက်</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {daysRemaining}
            </span>
            <span className="text-xs text-muted-foreground">days / ရက်</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Target: <span className="font-mono font-medium">{examTarget.targetDate}</span> (
            {examTarget.targetLevel})
          </p>
        </div>

        {/* Metric 2: Required Daily Velocity */}
        <div className="bg-muted/50/70 border border-border rounded-2xl p-4.5 space-y-1.5 hover:bg-muted/50 hover:border-border transition">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center font-medium font-sans text-foreground">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Daily Velocity
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">သတ်မှတ်နှုန်း</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {requiredDailyVelocity.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">lessons / day</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {remainingLessons} uncompleted lessons remaining
          </p>
        </div>

        {/* Metric 3: Estimated Daily Study Minutes */}
        <div className="bg-muted/50/70 border border-border rounded-2xl p-4.5 space-y-1.5 hover:bg-muted/50 hover:border-border transition">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center font-medium font-sans text-foreground">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Est. Daily Study
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">နေ့စဉ်လေ့လာချိန်</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {estimatedDailyStudyMinutes}
            </span>
            <span className="text-xs text-muted-foreground">min / day</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate" title={`Target goal: ${readinessResult.configuredDailyTargetMinutes}m immersion`}>
            {estimatedDailyStudyMinutes >= 60
              ? `~${(estimatedDailyStudyMinutes / 60).toFixed(1)}h required pace (Target: ${readinessResult.configuredDailyTargetMinutes}m)`
              : `Required pace: ~${estimatedDailyStudyMinutes}m/d (Target: ${readinessResult.configuredDailyTargetMinutes}m)`}
          </p>
        </div>

        {/* Metric 4: Readiness Status Indicator */}
        <div
          className={`border rounded-2xl p-4.5 space-y-1.5 transition ${
            isOnTrack
              ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
              : 'bg-amber-50/60 border-amber-200 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`flex items-center font-semibold font-sans ${
                isOnTrack ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
              }`}
            >
              {isOnTrack ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
              )}
              Readiness Status
            </span>
            <span
              className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full border ${
                isOnTrack
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700'
                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700'
              }`}
            >
              {readinessResult.status}
            </span>
          </div>
          <div
            className={`text-base font-bold font-sans tracking-tight ${
              isOnTrack ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'
            }`}
          >
            {readinessTextCombined}
          </div>
          <p
            className={`text-[11px] leading-tight ${
              isOnTrack ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
            }`}
            title={readinessResult.explanationMy}
          >
            {readinessResult.explanationEn}
          </p>
        </div>
      </div>

      {/* Visual Burn-Down Progress Bar */}
      <div className="mt-5 pt-4 border-t border-border space-y-2 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground font-sans">
              JLPT {examTarget.targetLevel} Curriculum Mastery
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground font-mono text-[11px]">
              {completedLessonsCount} of {totalLessonsInLevel} lessons completed
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground font-mono text-[11px]">
              {remainingLessons} to burn down
            </span>
            <span
              className={`font-mono font-bold text-xs ${
                isOnTrack ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Progress bar container */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`JLPT ${examTarget.targetLevel} progress: ${progressPercent}%`}
          className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border border-border"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isOnTrack
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
