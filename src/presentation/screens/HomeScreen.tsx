import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Clock,
  Layers,
  Award,
  AlertTriangle,
  ChevronRight,
  Calendar,
  CheckCircle,
  TrendingUp,
  Flame,
  ShieldCheck,
  BookOpen,
  Zap,
  Mic,
  Library,
} from 'lucide-react';
import {
  UserProfile,
  MasteryRecord,
  DailyPlan,
  StudyTimerState,
  CurriculumMapItem,
  SRSCard,
} from '../../domain/models/types';
import { ContentLoader } from '../../data/content/content-loader';
import { db } from '../../data/db/dexie-db';
import { detectLeechCards } from '../../domain/srs/srs-scheduler';
import { ReminderBanner } from '../components/ReminderBanner';
import { LevelMasteryWidget } from '../components/LevelMasteryWidget';
import { DailyTargetStreakWidget } from '../components/DailyTargetStreakWidget';
import { JLPTMissionControl } from '../components/JLPTMissionControl';

interface HomeScreenProps {
  profile: UserProfile;
  masteryRecord?: MasteryRecord;
  masteryRecords?: Record<string, MasteryRecord>;
  srsCards?: SRSCard[];
  dailyPlan: DailyPlan;
  dueSrsCount: number;
  todayMinutes: number;
  timerState: StudyTimerState;
  onStartStudy: (lessonId?: string) => void;
  onOpenSrs: () => void;
  onOpenTests: () => void;
  onNavigate: (view: string) => void;
  onSelectLevel?: (level: 'N5' | 'N4' | 'N3' | 'N2') => void;
  onOpenReference?: (tab?: 'counters' | 'expressions' | 'mistakes') => void;
  focusedLesson?: CurriculumMapItem;
  totalLessonsInLevel?: number;
  streakDays?: number;
  longestStreak?: number;
  todayCompletedWords?: number;
  trueRetention?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  masteryRecord,
  masteryRecords,
  srsCards,
  dailyPlan,
  dueSrsCount,
  todayMinutes,
  timerState,
  onStartStudy,
  onOpenSrs,
  onOpenTests,
  onNavigate,
  onSelectLevel,
  onOpenReference,
  focusedLesson,
  totalLessonsInLevel,
  streakDays,
  longestStreak,
  todayCompletedWords,
  trueRetention,
}) => {
  const goalMinutes = profile.dailyTargetMinutes || 360;
  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const effectiveStreak = streakDays ?? profile.studyStreakDays ?? 0;
  const effectiveRetention = trueRetention !== undefined ? trueRetention : 1.0;

  // Real-time Leech & Weak items detection (lapses >= 2 or easeFactor <= 1.6)
  const [leechCardsCount, setLeechCardsCount] = useState<number>(() => {
    if (srsCards && srsCards.length > 0) {
      return detectLeechCards(srsCards).length;
    }
    return 0;
  });

  useEffect(() => {
    let isCancelled = false;
    const fetchLeeches = async () => {
      try {
        const cards = await db.srs_cards.toArray();
        if (!isCancelled) {
          setLeechCardsCount(detectLeechCards(cards).length);
        }
      } catch {
        // ignore background error
      }
    };
    fetchLeeches();
    return () => {
      isCancelled = true;
    };
  }, [srsCards]);

  const handleLaunchLeechDrill = () => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('nihongo_srs_leech_mode', 'true');
    }
    onOpenSrs();
  };

  const levelStats = useMemo(() => {
    const stats: Record<'N5' | 'N4' | 'N3' | 'N2', { completedLessons: number; masteredVocab: number }> = {
      N5: { completedLessons: 0, masteredVocab: 0 },
      N4: { completedLessons: 0, masteredVocab: 0 },
      N3: { completedLessons: 0, masteredVocab: 0 },
      N2: { completedLessons: 0, masteredVocab: 0 },
    };

    if (masteryRecords) {
      Object.values(masteryRecords).forEach((rec) => {
        const lvl = rec.lessonId.split('.')[0]?.toUpperCase() as 'N5' | 'N4' | 'N3' | 'N2';
        if (lvl && stats[lvl] && (rec.state === 'mastered' || rec.state === 'retained')) {
          stats[lvl].completedLessons += 1;
        }
      });
    }

    if (srsCards && srsCards.length > 0) {
      srsCards.forEach((card) => {
        if (
          card.itemType === 'vocab' &&
          (card.stability >= 5 || card.intervalDays >= 14 || card.state === 'review')
        ) {
          const lvl = card.lessonId.split('.')[0]?.toUpperCase() as 'N5' | 'N4' | 'N3' | 'N2';
          if (lvl && stats[lvl]) {
            stats[lvl].masteredVocab += 1;
          }
        }
      });
    } else if (masteryRecords) {
      // Direct proportion estimation if raw SRS cards aren't hydrated
      (['N5', 'N4', 'N3', 'N2'] as const).forEach((lvl) => {
        stats[lvl].masteredVocab = stats[lvl].completedLessons * 30;
      });
    }

    return stats;
  }, [masteryRecords, srsCards]);

  const allCurriculum = ContentLoader.getCurriculumMap();
  const currentLessonId = profile.currentLessonId || 'n5.l01';
  const activeLesson: CurriculumMapItem =
    focusedLesson ||
    allCurriculum.find((m) => m.id === currentLessonId) ||
    allCurriculum[0];

  const levelLessons = allCurriculum.filter((m) => m.level === activeLesson.level);
  const totalInLevel = totalLessonsInLevel || levelLessons.length || 30;

  const isSessionActive = timerState.state === 'running' || timerState.state === 'paused';
  const masteryState = masteryRecord?.state || 'new';

  const getMasteryBadgeClass = (state: string) => {
    switch (state) {
      case 'mastered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs';
      case 'retained':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs';
      case 'familiar':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 shadow-xs';
      case 'learning':
        return 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  // Title formatting: extract japanese subtitle if in parentheses
  const titleMatch = activeLesson.title.match(/^(.*?)(?:\s*[（(](.*?)[）)])?$/);
  const mainTitle = titleMatch?.[1] || activeLesson.title;
  const jaTitle = titleMatch?.[2]
    ? `（${titleMatch[2]}）`
    : activeLesson.id === 'n5.l01'
    ? '（挨拶・自己紹介）'
    : '';

  // Dynamic description
  const descriptionNode =
    activeLesson.id === 'n5.l01' ? (
      <>
        Foundational Japanese greetings, affirmative copula (
        <code className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
          X は Y です
        </code>
        ), question formation, and kanji in context (
        <ruby>
          学<rt className="text-[9px]">がく</rt>
        </ruby>
        ,{' '}
        <ruby>
          生<rt className="text-[9px]">せい</rt>
        </ruby>
        ,{' '}
        <ruby>
          先<rt className="text-[9px]">せん</rt>
        </ruby>
        ).
      </>
    ) : (
      <>
        {activeLesson.module} •{' '}
        {activeLesson.grammarTopics?.length
          ? activeLesson.grammarTopics.join(' · ')
          : 'Core Patterns'}
        . Target:{' '}
        <span className="text-stone-800 font-mono font-medium">
          {activeLesson.targetVocabCount} vocabulary
        </span>{' '}
        and{' '}
        <span className="text-stone-800 font-mono font-medium">
          {activeLesson.targetKanjiCount} kanji
        </span>
        .
      </>
    );

  const startButtonText = isSessionActive
    ? 'CONTINUE LESSON'
    : masteryState === 'mastered' || masteryState === 'retained'
    ? `REVIEW LESSON (${activeLesson.level} D${activeLesson.number})`
    : `START STUDY (${activeLesson.level} DAY ${activeLesson.number})`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Welcome & Progression Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>Welcome back, {profile.name || 'Learner'}</span>
            <span className="text-sm font-normal text-stone-400 hidden sm:inline">👋</span>
          </h2>
          <p className="text-xs text-stone-600 mt-0.5 font-sans">
            JLPT {activeLesson.level} Track • {Math.round(progressPercent)}% of today&apos;s 6-hour goal achieved
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {effectiveStreak > 0 && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{effectiveStreak}d Streak</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-mono text-stone-700">
            {todayMinutes}m / {goalMinutes}m
          </span>
        </div>
      </div>

      {/* Reminder Banner */}
      <ReminderBanner blocks={dailyPlan.blocks} dateIso={dailyPlan.date} />

      {/* =========================================================================
          HERO STUDY CTA CARD: Modern Academic Paper Styling
          ========================================================================= */}
      <section
        aria-label="Continue Learning Hero Section"
        className="bg-white border border-stone-200 hover:border-stone-300 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all duration-300"
      >
        {/* Subtle decorative Kanji watermark in stroke style */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-9xl font-japanese font-bold text-stone-200/50 select-none pointer-events-none">
          道
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            {/* Meta Tags: Focus, Lesson Position, Mastery, Streak */}
            <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1.5">
              <span className="font-semibold uppercase tracking-wider text-indigo-700 font-mono text-[11px] bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Current Focus
              </span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-600 font-mono text-[11px]">
                {activeLesson.level} Day {activeLesson.number} • Lesson {activeLesson.number} of {totalInLevel}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getMasteryBadgeClass(
                  masteryState
                )}`}
              >
                {masteryState}
              </span>
              {effectiveStreak > 0 ? (
                <span className="flex items-center space-x-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>{`${effectiveStreak}d Streak`}</span>
                </span>
              ) : null}
            </div>

            {/* Lesson Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-baseline gap-2 flex-wrap">
                <span>{mainTitle}</span>
                {jaTitle && (
                  <span className="text-stone-600 font-japanese text-sm sm:text-base font-normal">
                    {jaTitle}
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mt-2">
                {descriptionNode}
              </p>
            </div>

            {/* Competency Badges */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                🎯 {activeLesson.targetVocabCount} Vocabulary
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                ✍️ {activeLesson.targetKanjiCount} Kanji
              </span>
              {activeLesson.grammarTopics?.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                  📖 {activeLesson.grammarTopics.length} Patterns
                </span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
            <button
              onClick={() => onStartStudy(activeLesson.id)}
              className="px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center space-x-2.5 transition shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{startButtonText}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('curriculum')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition border border-stone-300 hover:border-stone-400 text-center cursor-pointer active:scale-95 shadow-xs"
              >
                Curriculum Map
              </button>
              {onOpenReference && (
                <button
                  onClick={() => onOpenReference('counters')}
                  className="px-3 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition border border-stone-300 hover:border-stone-400 flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="Open N5 Counters & Expressions Reference Workbench"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Reference</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRIORITY CALLOUT: Urgent SRS Reviews Due Today
          ========================================================================= */}
      {dueSrsCount > 0 && (
        <div
          onClick={onOpenSrs}
          className="bg-white border border-stone-200 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer shadow-sm transition group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900">
                  {dueSrsCount} Cards Due for FSRS Review
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                  Due Now
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Cards due before 04:00 AM rollover. Regular SRS review ensures 90% target retention.
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSrs();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <span>Review Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          PRIORITY CALLOUT: Leech & Weak Items Drill Quick-Launch Badge
          ========================================================================= */}
      {leechCardsCount > 0 && (
        <div
          onClick={handleLaunchLeechDrill}
          className="bg-white border border-rose-200 hover:border-rose-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer shadow-sm transition group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-rose-600 fill-rose-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 group-hover:text-rose-800 transition-colors">
                  🔥 Leech Drill Mode (အားနည်းချက် အထူးလေ့ကျင့်ခန်း)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                  {leechCardsCount} Items
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-sans">
                Leech &amp; Weak Items Detector (အမှားများသော ဝေါဟာရနှင့် သဒ္ဒါများ) • Isolate and master high-failure items without waiting for standard intervals (Lapses ≥ 2 or EF ≤ 1.6).
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLaunchLeechDrill();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            <span>Drill Now (အထူးလေ့ကျင့်မည်)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          JLPT MISSION CONTROL (Burn-Down & Velocity Engine)
          ========================================================================= */}
      <JLPTMissionControl
        masteryRecords={masteryRecords}
        profile={profile}
        onNavigate={onNavigate}
        onSelectLevel={onSelectLevel}
      />

      {/* =========================================================================
          STREAMLINED BENTO METRICS GRID (Modern Academic Paper)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Metric 1: Daily Target (6h) */}
        <div className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-5 space-y-3 transition shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 text-xs">
              <span className="flex items-center font-medium text-stone-800">
                <Clock className="w-4 h-4 mr-1.5 text-indigo-600" /> Daily Target (6h)
              </span>
              <span className="font-mono text-indigo-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-stone-900 font-mono tracking-tight">
                {todayMinutes}
              </span>
              <span className="text-xs text-stone-600">/ {goalMinutes} min</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-600 font-sans truncate">
              {todayMinutes >= goalMinutes
                ? '🎉 နေ့စဉ် ရည်မှန်းချက် ပြည့်မီပါပြီ!'
                : 'နေ့စဉ် ၆ နာရီ လေ့လာရေး ပန်းတိုင်'}
            </p>
          </div>
        </div>

        {/* Metric 2: Reviews Due Today */}
        <div
          onClick={onOpenSrs}
          className="bg-white border border-stone-200 hover:border-indigo-300 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 text-xs">
              <span className="flex items-center font-medium text-indigo-700">
                <Layers className="w-4 h-4 mr-1.5 text-indigo-600" /> Reviews Due Today
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-stone-900 font-mono tracking-tight">
                {dueSrsCount}
              </span>
              <span className="text-xs text-stone-600">cards</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-600 font-sans leading-tight">
            {dueSrsCount > 0
              ? 'Cards due before 04:00 AM rollover'
              : 'All caught up! No reviews pending.'}
          </p>
        </div>

        {/* Metric 3: Active Study Streak */}
        <div className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-5 space-y-3 transition shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 text-xs">
              <span className="flex items-center font-medium text-amber-700">
                <Flame className="w-4 h-4 mr-1.5 text-amber-600" /> Study Streak
              </span>
              <span className="font-mono text-[10px] text-amber-800 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {effectiveStreak > 0 ? 'Active 🔥' : 'Start'}
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-stone-900 font-mono tracking-tight">
                {effectiveStreak}
              </span>
              <span className="text-xs text-amber-800 font-medium font-sans">
                {`${effectiveStreak === 1 ? 'Day' : 'Days'} / ရက်ဆက်`}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-stone-600 font-sans leading-tight">
            {effectiveStreak > 0
              ? `${effectiveStreak} ရက် ဆက်တိုက်လေ့လာထားသည်`
              : 'ယနေ့ စတင်လေ့လာပါ (04:00 AM Rollover)'}
          </p>
        </div>

        {/* Metric 4: 30-Day True Retention */}
        <div
          onClick={onOpenSrs}
          className="bg-white border border-stone-200 hover:border-cyan-300 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 text-xs">
              <span className="flex items-center font-medium text-cyan-800">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-cyan-600" /> True Retention
              </span>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-stone-900 font-mono tracking-tight text-cyan-900">
                {Math.round(effectiveRetention * 100)}%
              </span>
              <span className="text-xs text-stone-600">/ 90% target</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(effectiveRetention * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-600 font-sans truncate">
              FSRS ရေရှည်မှတ်မိနှုန်း • ၃၀ ရက် ပျမ်းမျှ
            </p>
          </div>
        </div>

        {/* Metric 5: Mastery Evidence & Tests */}
        <div
          onClick={onOpenTests}
          className="bg-white border border-stone-200 hover:border-emerald-300 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-sm group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 text-xs">
              <span className="flex items-center font-medium text-emerald-800">
                <Award className="w-4 h-4 mr-1.5 text-emerald-600" /> Mastery Evidence
              </span>
              <span className="text-[10px] text-stone-600 uppercase font-mono">{masteryState}</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-stone-900 font-mono tracking-tight">
                {masteryRecord ? `${Math.round((masteryRecord.scores?.overall || 0) * 100)}%` : '0%'}
              </span>
              <span className="text-xs text-stone-600">/ 85% target</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-600 font-sans leading-tight">
            {masteryRecord?.passedThresholds
              ? 'Conjunctive thresholds satisfied'
              : 'Requires test evidence across 5 skills'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          DAILY TARGET & STUDY STREAK ENGINE WIDGET
          ========================================================================= */}
      <DailyTargetStreakWidget
        currentStreak={effectiveStreak}
        longestStreak={longestStreak}
        todayCompletedCount={todayCompletedWords}
        onStartStudy={() => onStartStudy(activeLesson.id)}
      />

      {/* =========================================================================
          JLPT LEVEL PROGRESS & MASTERY WORKBENCH
          ========================================================================= */}
      <LevelMasteryWidget
        stats={levelStats}
        onSelectLevel={(lvl) => {
          if (onSelectLevel) {
            onSelectLevel(lvl);
          } else {
            onNavigate('level-bulk-study');
          }
        }}
      />

      {/* =========================================================================
          SPECIALIZED MASTERY WORKBENCHES: Decks, Mock Exam, Shadowing & Quarantine
          ========================================================================= */}
      <section aria-label="Specialized Mastery Workbenches" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level Decks (単語帳) */}
        <div
          onClick={() => onNavigate('level-bulk-study')}
          className="bg-white border border-stone-200 hover:border-amber-300 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
              <Library className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                  Level Decks
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-mono border border-amber-200">
                  単語帳
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-sans">
                Comprehensive N5–N2 bulk vocabulary decks with instant search and audio.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition shrink-0" />
        </div>

        {/* JLPT Timed Mock Exam Simulator */}
        <div
          onClick={() => onNavigate('mock-exam')}
          className="bg-white border border-stone-200 hover:border-emerald-300 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                  JLPT Mock Exam
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-mono border border-emerald-200">
                  模擬試験
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-sans">
                Official N5–N2 timed simulations with 180-scale scoring and auto-quarantine.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition shrink-0" />
        </div>

        {/* Shadowing Practice Workbench */}
        <div
          onClick={() => onNavigate('shadowing')}
          className="bg-white border border-stone-200 hover:border-cyan-300 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shrink-0 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 group-hover:text-cyan-800 transition-colors">
                  Shadowing Audio Workbench
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[10px] font-mono border border-cyan-200">
                  発音練習
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-sans">
                Native Japanese TTS looping, pitch accent visualization, and speaker dialogue pacing.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition shrink-0" />
        </div>

        {/* Ghost Cards Quarantine */}
        <div
          onClick={() => onNavigate('quarantine')}
          className="bg-white border border-stone-200 hover:border-rose-300 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 group-hover:text-rose-800 transition-colors">
                  Ghost Card Quarantine
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-mono border border-rose-200">
                  鬼カード
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 font-sans">
                High-lapse leeches quarantined with 3-in-a-row recovery drills and stability boosts.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition shrink-0" />
        </div>
      </section>

      {/* Adaptive Shift Notice (if active) */}
      {Boolean(dailyPlan.weakSkills?.[0]) && (
        <div
          onClick={onOpenTests}
          className="bg-white border border-stone-200 hover:border-violet-300 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-4 h-4 text-violet-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-stone-900">
                Adaptive Shift Active: Bolstering {dailyPlan.weakSkills?.[0]} (+15 min)
              </span>
              <p className="text-[11px] text-stone-600 mt-0.5">
                The scheduler dynamically allocated extra time to reinforce lower accuracy areas.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
        </div>
      )}

      {/* Scheduler Explanation Notice */}
      {Boolean(dailyPlan.explanations && dailyPlan.explanations.length > 0) && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-600 flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-stone-900 font-semibold block">Explainable Adaptation Policy:</span>
            {dailyPlan.explanations.map((exp, idx) => (
              <p key={idx} className="leading-relaxed">
                {exp}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TODAY'S 6-HOUR SCHEDULE BREAKDOWN
          ========================================================================= */}
      <section
        aria-label="Today's 6-Hour Study Plan"
        className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-stone-900">Today&apos;s 6-Hour Study Plan</h2>
          </div>
          <span className="text-xs text-stone-600 font-mono">6 blocks • 360 min total goal</span>
        </div>

        <div className="space-y-2.5">
          {dailyPlan.blocks.map((block) => (
            <div
              key={block.id}
              className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                block.status === 'completed'
                  ? 'bg-stone-50 border-stone-200 text-stone-500'
                  : block.countsTowardGoal
                  ? 'bg-stone-50/70 border-stone-200 text-stone-800 hover:border-stone-300 hover:bg-white'
                  : 'bg-stone-50/40 border-stone-100 text-stone-600'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <span className="text-xs font-mono text-stone-600 shrink-0 min-w-[90px]">
                  {block.startTime} – {block.endTime}
                </span>
                <div>
                  <div className="text-xs font-semibold text-stone-900 flex items-center space-x-1.5">
                    <span>{block.title}</span>
                    {!block.countsTowardGoal && (
                      <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded font-mono">
                        admin
                      </span>
                    )}
                  </div>
                  {block.reason && (
                    <p className="text-[11px] text-stone-600 mt-0.5">{block.reason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                <span className="text-xs font-mono text-stone-600">{block.plannedMinutes} min</span>
                {block.status === 'completed' ? (
                  <span className="text-xs text-emerald-700 flex items-center font-medium font-mono px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => onStartStudy(activeLesson.id)}
                    className="text-xs px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold transition cursor-pointer active:scale-95 border border-stone-300"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
