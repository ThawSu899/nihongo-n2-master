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
  focusedLesson?: CurriculumMapItem;
  totalLessonsInLevel?: number;
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
  focusedLesson,
  totalLessonsInLevel,
}) => {
  const goalMinutes = profile.dailyTargetMinutes || 360;
  const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

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
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'retained':
        return 'bg-purple-950 text-purple-300 border-purple-700';
      case 'familiar':
        return 'bg-blue-950 text-blue-300 border-blue-700';
      case 'learning':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      default:
        return 'bg-stone-800 text-stone-300 border-stone-700';
    }
  };

  // Title formatting: extract japanese subtitle if in parentheses like "This, That (これ・それ・あれ)"
  const titleMatch = activeLesson.title.match(/^(.*?)(?:\s*[（(](.*?)[）)])?$/);
  const mainTitle = titleMatch?.[1] || activeLesson.title;
  const jaTitle = titleMatch?.[2] ? `（${titleMatch[2]}）` : (activeLesson.id === 'n5.l01' ? '（挨拶・自己紹介）' : '');

  // Dynamic description
  const descriptionNode =
    activeLesson.id === 'n5.l01' ? (
      <>
        Foundational Japanese greetings, affirmative copula (<code className="text-rose-300 bg-stone-950/60 px-1.5 py-0.5 rounded border border-rose-950">X は Y です</code>),
        question formation, and kanji in context (<ruby>学<rt className="text-[9px]">がく</rt></ruby>, <ruby>生<rt className="text-[9px]">せい</rt></ruby>, <ruby>先<rt className="text-[9px]">せん</rt></ruby>).
      </>
    ) : (
      <>
        {activeLesson.module} • {activeLesson.grammarTopics?.length ? activeLesson.grammarTopics.join(' · ') : 'Core Patterns'}. Target:{' '}
        <span className="text-stone-300 font-mono">{activeLesson.targetVocabCount} vocabulary</span> and{' '}
        <span className="text-stone-300 font-mono">{activeLesson.targetKanjiCount} kanji</span>.
      </>
    );

  const startButtonText = isSessionActive
    ? 'CONTINUE LESSON'
    : masteryState === 'mastered' || masteryState === 'retained'
    ? `REVIEW LESSON (${activeLesson.level} D${activeLesson.number})`
    : `START STUDY (${activeLesson.level} DAY ${activeLesson.number})`;

  // Find next pending study block
  const nextBlock = dailyPlan.blocks.find((b) => b.status === 'pending');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Reminder Banner */}
      <ReminderBanner
        blocks={dailyPlan.blocks}
        dateIso={dailyPlan.date}
      />

      {/* Hero Study CTA Card with Traditional Mon & Japanese Botanical Gradient */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900/95 to-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden bg-pattern-clover-mon">
        {/* Subtle decorative Kanji watermarks in traditional Sumi style */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-8xl font-japanese font-bold text-stone-800/15 select-none pointer-events-none">
          道
        </div>
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-rose-400 font-mono">Current Focus</span>
              <span className="text-stone-600">·</span>
              <span className="text-stone-300 font-mono">
                {activeLesson.level} Day {activeLesson.number} • Lesson {activeLesson.number} of {totalInLevel}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getMasteryBadgeClass(
                  masteryState
                )}`}
              >
                {masteryState}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-stone-100 tracking-tight flex items-baseline gap-2">
              <span>{mainTitle}</span>
              {jaTitle && <span className="text-stone-500 font-japanese text-sm font-normal">{jaTitle}</span>}
            </h1>
            <p className="text-xs md:text-sm text-stone-400 max-w-xl leading-relaxed">
              {descriptionNode}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onStartStudy(activeLesson.id)}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/70 hover:scale-[1.02] active:scale-[0.98] border border-rose-500/30"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{startButtonText}</span>
            </button>
            <button
              onClick={() => onNavigate('curriculum')}
              className="px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium transition border border-stone-800 hover:border-stone-700 text-center shadow-sm"
            >
              View Curriculum Map
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Vital Metrics Grid - Minimalist Traditional Alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: 6-Hour Daily Learning Goal (Sakura motif) */}
        <div className="bg-stone-900/90 border border-stone-800/90 hover:border-rose-900/40 rounded-xl p-4.5 space-y-2.5 transition shadow-sm bg-washi-card">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="flex items-center font-medium">
              <Clock className="w-4 h-4 mr-1.5 text-rose-400" /> Daily Target (6h)
            </span>
            <span className="font-mono text-rose-300 font-semibold">{progressPercent}%</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-stone-100 font-mono">{todayMinutes}</span>
            <span className="text-xs text-stone-400">/ {goalMinutes} min</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Reviews Due Today (Fuji indigo motif) */}
        <div
          onClick={onOpenSrs}
          className="bg-stone-900/90 border border-stone-800/90 hover:border-indigo-900/50 rounded-xl p-4.5 space-y-2.5 cursor-pointer transition group shadow-sm bg-washi-card"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="flex items-center font-medium">
              <Layers className="w-4 h-4 mr-1.5 text-indigo-400" /> Reviews Due Today
            </span>
            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-stone-100 font-mono">{dueSrsCount}</span>
            <span className="text-xs text-stone-400">cards</span>
          </div>
          <p className="text-[11px] text-stone-500">
            {dueSrsCount > 0 ? 'Cards due before 04:00 AM rollover' : 'All caught up! No reviews pending.'}
          </p>
        </div>

        {/* Metric 3: Current Mastery (Matcha green motif) */}
        <div
          onClick={onOpenTests}
          className="bg-stone-900/90 border border-stone-800/90 hover:border-emerald-900/50 rounded-xl p-4.5 space-y-2.5 cursor-pointer transition shadow-sm bg-washi-card"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="flex items-center font-medium">
              <Award className="w-4 h-4 mr-1.5 text-emerald-400" /> Mastery Evidence
            </span>
            <span className="text-[10px] text-stone-500 uppercase font-mono">{masteryState}</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-stone-100 font-mono">
              {masteryRecord ? `${Math.round((masteryRecord.scores?.overall || 0) * 100)}%` : '0%'}
            </span>
            <span className="text-xs text-stone-400">/ 85% target</span>
          </div>
          <p className="text-[11px] text-stone-500">
            {masteryRecord?.passedThresholds
              ? 'Conjunctive thresholds satisfied'
              : 'Requires test evidence across 5 skills'}
          </p>
        </div>

        {/* Metric 4: Weakest Skill & Scheduler Balance (Kin Gold motif) */}
        <div className="bg-stone-900/90 border border-stone-800/90 hover:border-amber-900/50 rounded-xl p-4.5 space-y-2.5 transition shadow-sm bg-washi-card">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="flex items-center font-medium">
              <TrendingUp className="w-4 h-4 mr-1.5 text-amber-400" /> Adaptive Scheduler
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-lg font-bold text-stone-100 capitalize">
              {dailyPlan.weakSkills?.[0] || 'Balanced'}
            </span>
            {dailyPlan.weakSkills?.[0] && (
              <span className="text-[11px] text-amber-400 font-medium font-mono">+15m allocated</span>
            )}
          </div>
          <p className="text-[11px] text-stone-500">
            {dailyPlan.weakSkills?.[0]
              ? `Reallocated time to bolster ${dailyPlan.weakSkills[0]}`
              : 'Skill accuracy within balanced threshold'}
          </p>
        </div>
      </div>

      {/* Scheduler Explanation Notice */}
      {Boolean(dailyPlan.explanations && dailyPlan.explanations.length > 0) && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-3.5 text-xs text-stone-400 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-stone-300 font-semibold block">Explainable Adaptation Policy:</span>
            {dailyPlan.explanations.map((exp, idx) => (
              <p key={idx} className="leading-relaxed">{exp}</p>
            ))}
          </div>
        </div>
      )}

      {/* Today's 6-Hour Schedule Breakdown */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-rose-400" />
            <h2 className="text-base font-semibold text-stone-100">Today&apos;s 6-Hour Study Plan</h2>
          </div>
          <span className="text-xs text-stone-500">6 blocks • 360 min total goal</span>
        </div>

        <div className="space-y-2">
          {dailyPlan.blocks.map((block) => (
            <div
              key={block.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                block.status === 'completed'
                  ? 'bg-stone-950/40 border-stone-800/60 text-stone-500'
                  : block.countsTowardGoal
                  ? 'bg-stone-950/80 border-stone-800 text-stone-200 hover:border-stone-700'
                  : 'bg-stone-950/20 border-stone-900 text-stone-400'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-stone-400 shrink-0">
                  {block.startTime} – {block.endTime}
                </span>
                <div>
                  <div className="text-xs font-medium text-stone-200 flex items-center space-x-1.5">
                    <span>{block.title}</span>
                    {!block.countsTowardGoal && (
                      <span className="text-[10px] text-stone-500 bg-stone-800/80 px-1.5 py-0.2 rounded">admin</span>
                    )}
                  </div>
                  {block.reason && <p className="text-[10px] text-stone-500">{block.reason}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto">
                <span className="text-xs font-mono text-stone-400">{block.plannedMinutes} min</span>
                {block.status === 'completed' ? (
                  <span className="text-xs text-emerald-400 flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => onStartStudy(activeLesson.id)}
                    className="text-xs px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
