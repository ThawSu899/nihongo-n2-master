import React from 'react';
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
} from 'lucide-react';
import {
  UserProfile,
  MasteryRecord,
  DailyPlan,
  StudyTimerState,
  CurriculumMapItem,
} from '../../domain/models/types';
import { ContentLoader } from '../../data/content/content-loader';
import { ReminderBanner } from '../components/ReminderBanner';

interface HomeScreenProps {
  profile: UserProfile;
  masteryRecord?: MasteryRecord;
  dailyPlan: DailyPlan;
  dueSrsCount: number;
  todayMinutes: number;
  timerState: StudyTimerState;
  onStartStudy: (lessonId?: string) => void;
  onOpenSrs: () => void;
  onOpenTests: () => void;
  onNavigate: (view: string) => void;
  onOpenReference?: (tab?: 'counters' | 'expressions' | 'mistakes') => void;
  focusedLesson?: CurriculumMapItem;
  totalLessonsInLevel?: number;
  streakDays?: number;
  trueRetention?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  masteryRecord,
  dailyPlan,
  dueSrsCount,
  todayMinutes,
  timerState,
  onStartStudy,
  onOpenSrs,
  onOpenTests,
  onNavigate,
  onOpenReference,
  focusedLesson,
  totalLessonsInLevel,
  streakDays,
  trueRetention,
}) => {
  const goalMinutes = profile.dailyTargetMinutes || 360;
  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  const effectiveStreak = streakDays ?? profile.studyStreakDays ?? 0;
  const effectiveRetention = trueRetention !== undefined ? trueRetention : 1.0;

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
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70 shadow-sm';
      case 'retained':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-600/70 shadow-sm';
      case 'familiar':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60';
      case 'learning':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/70 shadow-sm';
      default:
        return 'bg-zinc-800/90 text-zinc-300 border-zinc-700/80';
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
        <code className="text-rose-300 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-rose-900/40">
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
        <span className="text-zinc-200 font-mono font-medium">
          {activeLesson.targetVocabCount} vocabulary
        </span>{' '}
        and{' '}
        <span className="text-zinc-200 font-mono font-medium">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>Welcome back, {profile.name || 'Learner'}</span>
            <span className="text-sm font-normal text-zinc-400 hidden sm:inline">👋</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">
            JLPT {activeLesson.level} Track • {Math.round(progressPercent)}% of today&apos;s 6-hour goal achieved
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {effectiveStreak > 0 && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-600/40 text-xs font-mono font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{effectiveStreak}d Streak</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            {todayMinutes}m / {goalMinutes}m
          </span>
        </div>
      </div>

      {/* Reminder Banner */}
      <ReminderBanner blocks={dailyPlan.blocks} dateIso={dailyPlan.date} />

      {/* =========================================================================
          HERO STUDY CTA CARD: Obsidian Glass with Clean Visual Hierarchy
          ========================================================================= */}
      <section
        aria-label="Continue Learning Hero Section"
        className="bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300"
      >
        {/* Subtle decorative Kanji watermark in stroke style */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-9xl font-japanese font-bold text-zinc-800/10 select-none pointer-events-none">
          道
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            {/* Meta Tags: Focus, Lesson Position, Mastery, Streak */}
            <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1.5">
              <span className="font-semibold uppercase tracking-wider text-rose-400 font-mono text-[11px] bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-800/40">
                Current Focus
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300 font-mono text-[11px]">
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
                <span className="flex items-center space-x-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/50">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{`${effectiveStreak}d Streak`}</span>
                </span>
              ) : null}
            </div>

            {/* Lesson Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight flex items-baseline gap-2 flex-wrap">
                <span>{mainTitle}</span>
                {jaTitle && (
                  <span className="text-zinc-400 font-japanese text-sm sm:text-base font-normal">
                    {jaTitle}
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-2">
                {descriptionNode}
              </p>
            </div>

            {/* Competency Badges */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950/70 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                🎯 {activeLesson.targetVocabCount} Vocabulary
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950/70 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                ✍️ {activeLesson.targetKanjiCount} Kanji
              </span>
              {activeLesson.grammarTopics?.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-950/70 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                  📖 {activeLesson.grammarTopics.length} Patterns
                </span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
            <button
              onClick={() => onStartStudy(activeLesson.id)}
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm flex items-center justify-center space-x-2.5 transition shadow-[0_4px_24px_rgba(244,63,94,0.4)] hover:shadow-[0_4px_32px_rgba(244,63,94,0.6)] active:scale-[0.98] cursor-pointer border border-rose-500/50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{startButtonText}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('curriculum')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition border border-zinc-700/80 hover:border-zinc-600 text-center cursor-pointer active:scale-95 shadow-sm"
              >
                Curriculum Map
              </button>
              {onOpenReference && (
                <button
                  onClick={() => onOpenReference('counters')}
                  className="px-3 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition border border-zinc-700/80 hover:border-zinc-600 flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer active:scale-95"
                  title="Open N5 Counters & Expressions Reference Workbench"
                >
                  <BookOpen className="w-3.5 h-3.5 text-rose-400" />
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
          className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/80 to-rose-950/40 border border-rose-600/40 hover:border-rose-500/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer shadow-lg backdrop-blur-xl transition group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Zap className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-zinc-100">
                  {dueSrsCount} Cards Due for FSRS Review
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                  Due Now
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cards due before 04:00 AM rollover. Regular SRS review ensures 90% target retention.
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSrs();
            }}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            <span>Review Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          STREAMLINED BENTO METRICS GRID (Obsidian Glass)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Metric 1: Daily Target (6h) */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-5 space-y-3 transition shadow-lg backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="flex items-center font-medium text-zinc-300">
                <Clock className="w-4 h-4 mr-1.5 text-rose-400" /> Daily Target (6h)
              </span>
              <span className="font-mono text-rose-300 font-bold">{progressPercent}%</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
                {todayMinutes}
              </span>
              <span className="text-xs text-zinc-400">/ {goalMinutes} min</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 font-sans truncate">
              {todayMinutes >= goalMinutes
                ? '🎉 နေ့စဉ် ရည်မှန်းချက် ပြည့်မီပါပြီ!'
                : 'နေ့စဉ် ၆ နာရီ လေ့လာရေး ပန်းတိုင်'}
            </p>
          </div>
        </div>

        {/* Metric 2: Reviews Due Today */}
        <div
          onClick={onOpenSrs}
          className="bg-zinc-900/70 border border-zinc-800/80 hover:border-indigo-500/40 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-lg backdrop-blur-xl group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="flex items-center font-medium text-indigo-300">
                <Layers className="w-4 h-4 mr-1.5 text-indigo-400" /> Reviews Due Today
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
                {dueSrsCount}
              </span>
              <span className="text-xs text-zinc-400">cards</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 font-sans leading-tight">
            {dueSrsCount > 0
              ? 'Cards due before 04:00 AM rollover'
              : 'All caught up! No reviews pending.'}
          </p>
        </div>

        {/* Metric 3: Active Study Streak */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-5 space-y-3 transition shadow-lg backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="flex items-center font-medium text-amber-300">
                <Flame className="w-4 h-4 mr-1.5 text-amber-400" /> Study Streak
              </span>
              <span className="font-mono text-[10px] text-amber-400 font-bold uppercase bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/50">
                {effectiveStreak > 0 ? 'Active 🔥' : 'Start'}
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight text-amber-100">
                {effectiveStreak}
              </span>
              <span className="text-xs text-amber-400/90 font-medium font-sans">
                {`${effectiveStreak === 1 ? 'Day' : 'Days'} / ရက်ဆက်`}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans leading-tight">
            {effectiveStreak > 0
              ? `${effectiveStreak} ရက် ဆက်တိုက်လေ့လာထားသည်`
              : 'ယနေ့ စတင်လေ့လာပါ (04:00 AM Rollover)'}
          </p>
        </div>

        {/* Metric 4: 30-Day True Retention */}
        <div
          onClick={onOpenSrs}
          className="bg-zinc-900/70 border border-zinc-800/80 hover:border-cyan-500/40 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-lg backdrop-blur-xl group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="flex items-center font-medium text-cyan-300">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-cyan-400" /> True Retention
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight text-cyan-100">
                {Math.round(effectiveRetention * 100)}%
              </span>
              <span className="text-xs text-zinc-400">/ 90% target</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(effectiveRetention * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 font-sans truncate">
              FSRS ရေရှည်မှတ်မိနှုန်း • ၃၀ ရက် ပျမ်းမျှ
            </p>
          </div>
        </div>

        {/* Metric 5: Mastery Evidence & Tests */}
        <div
          onClick={onOpenTests}
          className="bg-zinc-900/70 border border-zinc-800/80 hover:border-emerald-500/40 rounded-2xl p-5 space-y-3 cursor-pointer transition shadow-lg backdrop-blur-xl group flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="flex items-center font-medium text-emerald-300">
                <Award className="w-4 h-4 mr-1.5 text-emerald-400" /> Mastery Evidence
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">{masteryState}</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
                {masteryRecord ? `${Math.round((masteryRecord.scores?.overall || 0) * 100)}%` : '0%'}
              </span>
              <span className="text-xs text-zinc-400">/ 85% target</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 font-sans leading-tight">
            {masteryRecord?.passedThresholds
              ? 'Conjunctive thresholds satisfied'
              : 'Requires test evidence across 5 skills'}
          </p>
        </div>
      </div>

      {/* Adaptive Shift Notice (if active) */}
      {Boolean(dailyPlan.weakSkills?.[0]) && (
        <div
          onClick={onOpenTests}
          className="bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition backdrop-blur-xl"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-zinc-200">
                Adaptive Shift Active: Bolstering {dailyPlan.weakSkills?.[0]} (+15 min)
              </span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                The scheduler dynamically allocated extra time to reinforce lower accuracy areas.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        </div>
      )}

      {/* Scheduler Explanation Notice */}
      {Boolean(dailyPlan.explanations && dailyPlan.explanations.length > 0) && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 flex items-start space-x-3 backdrop-blur-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-zinc-200 font-semibold block">Explainable Adaptation Policy:</span>
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
        className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-4 h-4 text-rose-400" />
            <h2 className="text-base font-bold text-zinc-100">Today&apos;s 6-Hour Study Plan</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">6 blocks • 360 min total goal</span>
        </div>

        <div className="space-y-2.5">
          {dailyPlan.blocks.map((block) => (
            <div
              key={block.id}
              className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                block.status === 'completed'
                  ? 'bg-zinc-950/40 border-zinc-850 text-zinc-500'
                  : block.countsTowardGoal
                  ? 'bg-zinc-950/70 border-zinc-800/90 text-zinc-200 hover:border-zinc-700'
                  : 'bg-zinc-950/20 border-zinc-900 text-zinc-400'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <span className="text-xs font-mono text-zinc-400 shrink-0 min-w-[90px]">
                  {block.startTime} – {block.endTime}
                </span>
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                    <span>{block.title}</span>
                    {!block.countsTowardGoal && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-850 px-1.5 py-0.2 rounded font-mono">
                        admin
                      </span>
                    )}
                  </div>
                  {block.reason && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">{block.reason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                <span className="text-xs font-mono text-zinc-400">{block.plannedMinutes} min</span>
                {block.status === 'completed' ? (
                  <span className="text-xs text-emerald-400 flex items-center font-medium font-mono px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => onStartStudy(activeLesson.id)}
                    className="text-xs px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition cursor-pointer active:scale-95 border border-zinc-700/60"
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
