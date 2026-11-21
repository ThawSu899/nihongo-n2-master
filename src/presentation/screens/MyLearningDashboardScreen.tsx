import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Calendar,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  FileText,
  Play,
  RotateCcw,
  Trash2,
  Lock,
} from 'lucide-react';
import { UserProfile, LessonPack } from '../../domain/models/types';
import {
  diagnoseLearnerFromDB,
  LearnerDiagnosticProfile,
  WeaknessFinding,
} from '../../domain/ai-learning/weakness-diagnosis';
import {
  getPersonalizationConsent,
  setPersonalizationConsent,
} from '../../domain/ai-learning/learner-context';
import {
  recommendSmartLessons,
  SmartLessonRecommendation,
} from '../../domain/ai-learning/lesson-recommender';
import {
  buildPersonalizedStudyPlan,
  loadPersistedDailyPlan,
  savePersistedDailyPlan,
  toggleActivityCompletion,
  toggleActivitySkipped,
  PersonalizedDailyStudyPlan,
} from '../../domain/ai-learning/study-planner';
import {
  generatePersonalizedExercises,
  PersonalizedExercise,
} from '../../domain/ai-learning/exercise-generator';
import {
  saveLearningReportToNotes,
  loadSavedLearningReports,
  deleteLearningReport,
  AIReportData,
} from '../../domain/ai-learning/learning-reports';
import { ContentLoader } from '../../data/content/content-loader';

interface MyLearningDashboardProps {
  profile?: UserProfile | null;
  dueSrsCount?: number;
  onNavigate?: (view: string) => void;
  onOpenLesson?: (lessonId: string) => void;
}

export const MyLearningDashboardScreen: React.FC<MyLearningDashboardProps> = ({
  profile,
  dueSrsCount = 0,
  onNavigate,
  onOpenLesson,
}) => {
  const [level, setLevel] = useState<'N5' | 'N4' | 'N3' | 'N2'>(
    () => (profile?.level as any) || 'N5'
  );
  const [diagnostic, setDiagnostic] = useState<LearnerDiagnosticProfile | null>(null);
  const [studyPlan, setStudyPlan] = useState<PersonalizedDailyStudyPlan | null>(null);
  const [reports, setReports] = useState<AIReportData[]>([]);
  const [hasConsent, setHasConsent] = useState<boolean>(() => getPersonalizationConsent());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Targeted exercise interactive state
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState<boolean>(false);
  const [exercises, setExercises] = useState<PersonalizedExercise[]>([]);
  const [currentExIdx, setCurrentExIdx] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Active lesson packs for context
  const [lessonPacks, setLessonPacks] = useState<LessonPack[]>([]);

  // Load diagnostics and study plan
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const diag = await diagnoseLearnerFromDB(level);
        if (isCancelled) return;
        setDiagnostic(diag);

        // Load or build study plan
        const plan = loadPersistedDailyPlan({
          targetMinutes: profile?.dailyTargetMinutes || 30,
          dueSrsCount,
          weaknesses: diag.confirmedWeaknesses,
          currentLessonId: profile?.currentLessonId,
          targetLevel: level,
        });
        setStudyPlan(plan);

        // Load saved reports
        const saved = await loadSavedLearningReports();
        if (isCancelled) return;
        setReports(saved);

        // Preload sample lesson pack for exercise generator
        const samplePack = await ContentLoader.getLessonPack(profile?.currentLessonId || `${level.toLowerCase()}.l01`);
        if (samplePack && !isCancelled) {
          setLessonPacks([samplePack]);
        }
      } catch (err) {
        console.error('[MyLearningDashboard] Error loading data:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [level, profile, dueSrsCount]);

  // Derived smart recommendations
  const recommendations: SmartLessonRecommendation[] = useMemo(() => {
    if (!diagnostic) return [];
    return recommendSmartLessons(
      diagnostic.confirmedWeaknesses,
      [],
      profile?.currentLessonId,
      level,
      4
    );
  }, [diagnostic, profile, level]);

  // Toggle personalization consent
  const handleToggleConsent = () => {
    const next = !hasConsent;
    setHasConsent(next);
    setPersonalizationConsent(next);
  };

  // Toggle activity completion
  const handleToggleActivity = (actId: string) => {
    if (!studyPlan) return;
    const updatedPlan = toggleActivityCompletion(studyPlan, actId);
    setStudyPlan(updatedPlan);
    savePersistedDailyPlan(updatedPlan);
  };

  // Skip activity
  const handleSkipActivity = (actId: string) => {
    if (!studyPlan) return;
    const updatedPlan = toggleActivitySkipped(studyPlan, actId);
    setStudyPlan(updatedPlan);
    savePersistedDailyPlan(updatedPlan);
  };

  // Refresh study plan
  const handleRegeneratePlan = () => {
    if (!diagnostic) return;
    const fresh = buildPersonalizedStudyPlan({
      targetMinutes: profile?.dailyTargetMinutes || 30,
      dueSrsCount,
      weaknesses: diagnostic.confirmedWeaknesses,
      currentLessonId: profile?.currentLessonId,
      targetLevel: level,
    });
    setStudyPlan(fresh);
    savePersistedDailyPlan(fresh);
  };

  // Launch targeted exercises
  const handleLaunchExercises = () => {
    if (!diagnostic) return;
    const drills = generatePersonalizedExercises(
      diagnostic.confirmedWeaknesses,
      lessonPacks,
      5
    );
    setExercises(drills);
    setCurrentExIdx(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setIsExerciseModalOpen(true);
  };

  // Save diagnostic report
  const handleSaveReport = async () => {
    if (!diagnostic) return;
    try {
      await saveLearningReportToNotes('weakness_diagnosis', level, diagnostic, studyPlan || undefined);
      const updated = await loadSavedLearningReports();
      setReports(updated);
      alert('သင်ယူမှုအစီရင်ခံစာကို AI Notes ထဲတွင် သိမ်းဆည်းပြီးပါပြီ။ (Report saved!)');
    } catch (err: any) {
      alert(`Report save failed: ${err.message}`);
    }
  };

  // Delete saved report
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Delete this saved learning report?')) return;
    await deleteLearningReport(reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const currentExercise = exercises[currentExIdx];

  return (
    <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-28 text-stone-900 dark:text-stone-100">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span>My Learning Dashboard</span>
              <span className="text-xs font-normal text-stone-500 font-myanmar">
                (AI ကိုယ်ပိုင် လေ့လာမှု ဆန်းစစ်ချက်)
              </span>
            </h1>
            <p className="text-xs text-stone-500 font-myanmar">
              လက်ရှိ လေ့လာမှုမှတ်တမ်းများနှင့် အားနည်းချက်များကို အခြေခံ၍ သီးသန့် အကြံပြုချက်များ
            </p>
          </div>
        </div>

        {/* Level Switcher & Consent */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-0.5">
            {(['N5', 'N4', 'N3', 'N2'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  level === lvl
                    ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleConsent}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              hasConsent
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 border-stone-200'
            }`}
            title="Toggle sending compact learning context to AI"
          >
            {hasConsent ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Personalization: ON</span>
              </>
            ) : (
              <>
                <ShieldOff className="w-3.5 h-3.5 text-stone-400" />
                <span>AI Personalization: OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm text-stone-500 flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>ဆန်းစစ်ချက်များကို တွက်ချက်နေပါသည်...</span>
        </div>
      ) : diagnostic ? (
        <>
          {/* 2. Overview Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium block">Total Items Analyzed</span>
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                {diagnostic.totalItemsTracked}
              </span>
              <span className="text-[10px] text-stone-400 font-myanmar">ကတ်များနှင့် စစ်ဆေးချက်များ</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium block">Confirmed Weaknesses</span>
              <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
                {diagnostic.confirmedWeaknesses.length}
              </span>
              <span className="text-[10px] text-stone-400 font-myanmar">အမှန်တကယ် အားနည်းချက်</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium block">Strong Skills</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
                {diagnostic.strongSkills.length}
              </span>
              <span className="text-[10px] text-stone-400 font-myanmar">ကျွမ်းကျင်သော ကဏ္ဍများ</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <span className="text-xs text-stone-500 font-medium block">Needs More Practice</span>
              <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
                {diagnostic.insufficientDataSkills.length}
              </span>
              <span className="text-[10px] text-stone-400 font-myanmar">အချက်အလက် မလုံလောက်သေး</span>
            </div>
          </div>

          {/* 3. Skill Diagnosis Details */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Skill-by-Skill Weakness Diagnosis</span>
                </h2>
                <p className="text-[11px] text-stone-500 font-myanmar">
                  ကဏ္ဍတစ်ခုချင်းစီ၏ တိကျသော စစ်ဆေးတွေ့ရှိချက်များ
                </p>
              </div>

              <button
                type="button"
                onClick={handleLaunchExercises}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Targeted Practice</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {[
                ...diagnostic.confirmedWeaknesses,
                ...diagnostic.possibleWeaknesses,
                ...diagnostic.insufficientDataSkills,
              ].map((finding, idx) => {
                const isConfirmed = finding.classification === 'Confirmed Weakness';
                const isPossible = finding.classification === 'Possible Weakness';
                const isDataNeeded = finding.classification === 'Insufficient Data';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {finding.skill}
                        </span>
                        {finding.accuracy !== null && (
                          <span className="text-xs font-mono font-semibold text-stone-600 dark:text-stone-300">
                            ({Math.round(finding.accuracy * 100)}%)
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isConfirmed
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isPossible
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-stone-100 text-stone-600 border-stone-300'
                        }`}
                      >
                        {finding.classification}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-snug">
                      {finding.evidence}
                    </p>

                    <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                      Action: {finding.recommendedAction}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Personalized Daily Study Plan */}
          {studyPlan && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Personal Daily Study Plan</span>
                  </h2>
                  <p className="text-[11px] text-stone-500 font-myanmar">
                    ယနေ့အတွက် အချိန်နှင့် အားနည်းချက်ကို ညှိနှိုင်းထားသော လေ့လာမှု အစီအစဉ်
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRegeneratePlan}
                  className="flex items-center space-x-1 text-xs text-stone-500 hover:text-indigo-600 transition cursor-pointer"
                  title="Recalculate plan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refresh Plan</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-stone-600 font-mono">
                  <span>
                    Completed: {studyPlan.completedMinutes} / {studyPlan.totalPlannedMinutes} mins
                  </span>
                  <span>
                    {Math.round((studyPlan.completedMinutes / Math.max(1, studyPlan.totalPlannedMinutes)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((studyPlan.completedMinutes / Math.max(1, studyPlan.totalPlannedMinutes)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Activities List */}
              <div className="space-y-2 pt-1">
                {studyPlan.activities.map((act) => (
                  <div
                    key={act.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      act.completed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 opacity-80'
                        : act.skipped
                        ? 'bg-stone-100/50 border-stone-200 opacity-50 line-through'
                        : 'bg-stone-50/50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={act.completed}
                        onChange={() => handleToggleActivity(act.id)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-semibold truncate">{act.title}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600">
                            {act.estimatedMinutes}m
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-myanmar truncate">
                          {act.titleMy}
                        </p>
                      </div>
                    </div>

                    {!act.completed && !act.skipped && (
                      <button
                        type="button"
                        onClick={() => handleSkipActivity(act.id)}
                        className="text-[10px] text-stone-400 hover:text-stone-600 px-2 py-1 cursor-pointer"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Smart Lesson Recommendations */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Smart Lesson Recommendations</span>
              </h2>
              <p className="text-[11px] text-stone-500 font-myanmar">
                သင်၏ အားနည်းချက်များကို ဦးတည်၍ ဆက်လက်လေ့လာသင့်သော သင်ခန်းစာများ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.lessonId}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {rec.level} {rec.lessonId.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          rec.priority === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-1">{rec.title}</p>
                    <p className="text-[11px] text-stone-500 font-myanmar mt-0.5">
                      {rec.reason.my}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenLesson && onOpenLesson(rec.lessonId)}
                    className="flex items-center justify-between w-full pt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    <span>Start Lesson</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 6. AI Reports & Diagnosis Persistence */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Saved AI Learning Reports</span>
                </h2>
                <p className="text-[11px] text-stone-500 font-myanmar">
                  မှတ်တမ်းတင်ထားသော ဆန်းစစ်ချက် အစီရင်ခံစာများ
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveReport}
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-semibold transition cursor-pointer"
              >
                + Save Current Diagnosis
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 font-myanmar">
                သိမ်းဆည်းထားသော အစီရင်ခံစာ မရှိသေးပါ
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold">{rep.title}</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {new Date(rep.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(rep.id)}
                      className="p-1 hover:text-rose-600 transition cursor-pointer text-stone-400"
                      title="Delete Report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Targeted Exercise Modal */}
      {isExerciseModalOpen && currentExercise && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 block">
                  Question {currentExIdx + 1} of {exercises.length}
                </span>
                <h3 className="text-sm font-bold">{currentExercise.prompt}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExerciseModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {currentExercise.question}
            </div>

            {/* Choices */}
            <div className="space-y-2">
              {currentExercise.choices?.map((choice, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => {
                    setSelectedAnswer(choice);
                    setShowExplanation(true);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs border transition cursor-pointer ${
                    showExplanation
                      ? choice === currentExercise.answer
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : selectedAnswer === choice
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'border-stone-200 opacity-60'
                      : 'border-stone-200 dark:border-stone-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>

            {/* Hint & Explanation */}
            {showHint && !showExplanation && (
              <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800">
                Hint: {currentExercise.hintMy || currentExercise.hint}
              </div>
            )}

            {showExplanation && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-xs space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                  {selectedAnswer === currentExercise.answer ? '✓ Correct!' : '✗ Incorrect'}
                </span>
                <p className="text-stone-700 dark:text-stone-300">
                  {currentExercise.explanationMy || currentExercise.explanation}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {!showExplanation ? (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-amber-600 hover:underline cursor-pointer"
                >
                  Show Hint
                </button>
              ) : (
                <div />
              )}

              {showExplanation && currentExIdx < exercises.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentExIdx((prev) => prev + 1);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                    setShowHint(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Next Question →
                </button>
              )}

              {showExplanation && currentExIdx >= exercises.length - 1 && (
                <button
                  type="button"
                  onClick={() => setIsExerciseModalOpen(false)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Finish Practice ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
