import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  AlertCircle,
  Award,
  Clock,
  ArrowRight,
  Check,
  X,
  ShieldAlert,
  BarChart3,
  Zap,
  Bug,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Flame,
  BookOpen,
  Headphones,
  Star,
} from 'lucide-react';
import {
  MasteryRecord,
  UserProfile,
  AssessmentResult,
  AssessmentType,
  Question,
  QuestionSkill,
  N2ReadinessMetric,
} from '../../domain/models/types';
import { AssessmentEngine } from '../../domain/assessment/assessment-engine';
import { SystemClock } from '../../domain/common/clock';
import { db } from '../../data/db/dexie-db';
import { calculateTrueRetention } from '../../domain/srs/srs-scheduler';
import { ContentLoader } from '../../data/content/content-loader';
import {
  AssessmentSession,
  ShuffledOption,
  fisherYatesShuffle,
} from '../../domain/assessment/shuffler';
import {
  WeaknessRemediator,
  WeakPointDrillSession,
  LeechItem,
  WeaknessReport,
} from '../../domain/assessment/weakness-remediator';
import { TestAnalyticsScreen } from './TestAnalyticsScreen';
import { DokkaiReaderWorkbench } from '../components/DokkaiReaderWorkbench';
import { useScopedShortcuts } from '../context/GlobalShortcutContext';
import { CURATED_DOKKAI_CATALOG } from '../../domain/assessment/dokkai-catalog';
import { ChoukaiWorkbench } from '../components/ChoukaiWorkbench';
import { StarScrambleTrainer } from '../components/StarScrambleTrainer';
import { OfficialMockExamScreen } from './OfficialMockExamScreen';
import { GhostQuarantineHub } from '../components/GhostQuarantineHub';
import { GrammarCramLab } from '../components/GrammarCramLab';

export type TestsScreenTab =
  | 'tests'
  | 'cram'
  | 'analytics'
  | 'quarantine'
  | 'dokkai'
  | 'choukai'
  | 'scramble';

interface TestsScreenProps {
  profile: UserProfile;
  masteryRecord?: MasteryRecord;
  onStartLessonTest: (lessonId: string) => void;
  onTestActiveChange?: (active: boolean) => void;
  defaultTab?: TestsScreenTab;
}

export const TestsScreen: React.FC<TestsScreenProps> = ({
  profile,
  masteryRecord,
  onStartLessonTest,
  onTestActiveChange,
  defaultTab = 'tests',
}) => {
  const clock = new SystemClock();
  const engine = new AssessmentEngine(clock);

  const [activeTab, setActiveTab] = useState<TestsScreenTab>(defaultTab);
  const [activeTestType, setActiveTestType] = useState<AssessmentType | null>(null);
  const [isMockExamActive, setIsMockExamActive] = useState<boolean>(false);

  // Active assessment test execution state
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [assessmentSession, setAssessmentSession] = useState(() => new AssessmentSession());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question: Question; isCorrect: boolean }>>([]);
  const [testStartMs, setTestStartMs] = useState<number>(Date.now());
  const [testResult, setTestResult] = useState<AssessmentResult | null>(null);

  // Active Weak-Point / Leech Drill execution state
  const [activeDrill, setActiveDrill] = useState<WeakPointDrillSession | null>(null);
  const [drillAnswers, setDrillAnswers] = useState<Array<{ question: Question; isCorrect: boolean }>>([]);
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [drillStartMs, setDrillStartMs] = useState<number>(Date.now());
  const [drillResult, setDrillResult] = useState<{
    score: number;
    accuracy: number;
    rehabilitatedCount: number;
    drillResult: AssessmentResult;
  } | null>(null);
  const [drillSelectedChoice, setDrillSelectedChoice] = useState<string | null>(null);
  const [drillAnswerSubmitted, setDrillAnswerSubmitted] = useState(false);

  // General assessment data
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentResult[]>([]);
  const [readiness, setReadiness] = useState<N2ReadinessMetric | null>(() => {
    return engine.calculateReadiness({
      totalCurriculumLessons: 174,
      masteredLessonsCount: 0,
      retainedLessonsCount: 0,
      srs30DayRetention: 0,
      recentWeeklyTestAccuracies: [],
      skillRollingAccuracies: {
        vocab: masteryRecord?.scores.vocab || 0.85,
        kanji: masteryRecord?.scores.kanji || 0.85,
        grammar: masteryRecord?.scores.grammar || 0.85,
        reading: masteryRecord?.scores.reading || 0.8,
        listening: masteryRecord?.scores.listening || 0.8,
      },
      srsBacklogCount: 0,
      srsDailyCap: profile.dailyReviewCap || 200,
      levelTestPassed: false,
      hasSrsData: false,
    });
  });
  const [weaknessReport, setWeaknessReport] = useState<WeaknessReport | null>(null);
  const [quarantineLeeches, setQuarantineLeeches] = useState<LeechItem[]>([]);
  const [rehabilitatingCardId, setRehabilitatingCardId] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const prevIsAnyActiveRef = useRef<boolean>(false);
  useEffect(() => {
    const isAnyActive = activeTestType !== null || activeDrill !== null;
    if (onTestActiveChange && prevIsAnyActiveRef.current !== isAnyActive) {
      prevIsAnyActiveRef.current = isAnyActive;
      onTestActiveChange(isAnyActive);
    }
    return () => {
      if (onTestActiveChange && prevIsAnyActiveRef.current) {
        prevIsAnyActiveRef.current = false;
        onTestActiveChange(false);
      }
    };
  }, [activeTestType, activeDrill, onTestActiveChange]);

  const curriculumMap = ContentLoader.getCurriculumMap();
  const activeLesson =
    curriculumMap.find((m) => m.id === (profile.currentLessonId || 'n5.l01')) ||
    curriculumMap[0];

  useEffect(() => {
    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    const history = await db.assessments.orderBy('takenAt').reverse().toArray();
    setAssessmentHistory(history);

    const records = await db.mastery_records.toArray();
    const masteredCount = records.filter(
      (r) => r.state === 'mastered' || r.state === 'retained'
    ).length;
    const retainedCount = records.filter((r) => r.state === 'retained').length;

    const cards = await db.srs_cards.toArray();
    const dueCount = cards.filter((c) => new Date(c.due).getTime() <= Date.now()).length;

    const logs = await db.review_logs.toArray();
    const hasSrsData = logs.length > 0;
    const srsRetention = hasSrsData ? calculateTrueRetention(logs, clock) : 0;

    const weeklyAccuracies = history.filter((h) => h.type === 'weekly').map((h) => h.accuracy);
    const levelPassed = history.some((h) => h.type === 'level' && h.passed);

    const calculated = engine.calculateReadiness({
      totalCurriculumLessons: 174,
      masteredLessonsCount: masteredCount,
      retainedLessonsCount: retainedCount,
      srs30DayRetention: srsRetention,
      recentWeeklyTestAccuracies: weeklyAccuracies,
      skillRollingAccuracies: {
        vocab: masteryRecord?.scores.vocab || 0.85,
        kanji: masteryRecord?.scores.kanji || 0.85,
        grammar: masteryRecord?.scores.grammar || 0.85,
        reading: masteryRecord?.scores.reading || 0.8,
        listening: masteryRecord?.scores.listening || 0.8,
      },
      srsBacklogCount: dueCount,
      srsDailyCap: profile.dailyReviewCap || 200,
      levelTestPassed: levelPassed,
      hasSrsData,
    });

    setReadiness(calculated);

    // Load weakness analysis
    const report = await WeaknessRemediator.analyzeWeaknesses();
    setWeaknessReport(report);
    setQuarantineLeeches(report.leeches);
  };

  const isBrandNewLearner = Boolean(
    readiness &&
    readiness.lessonMasteryPct === 0 &&
    !readiness.hasSrsData &&
    readiness.weeklyTestsAvgPct === 0 &&
    !readiness.levelTestPassed
  );

  const getRecommendedNextStep = () => {
    if (!readiness) return null;

    const gate1Passed = readiness.lessonMasteryPct >= 90;
    const gate2Passed = readiness.lessonRetentionPct >= 50;
    const gate3Passed = Boolean(readiness.hasSrsData && readiness.srs30DayRetentionPct >= 85);
    const gate4Passed = readiness.weeklyTestsAvgPct >= 75;
    const gate5Passed = Boolean(readiness.levelTestPassed);

    if (gate1Passed && gate2Passed && gate3Passed && gate4Passed && gate5Passed) {
      return {
        gateName: 'All 5 Gates Passed (သတ်မှတ်ချက် ၅ ချက်စလုံး ပြည့်မီပြီး)',
        title: 'Ready for Official Mock Exam (တကယ့်စာမေးပွဲပုံစံ စတင်ဖြေဆိုနိုင်ပါပြီ)',
        descriptionEn: 'You have satisfied all 5 curriculum, retention, and assessment benchmark gates. Test your endurance in a timed official mock simulation.',
        descriptionMy: 'သတ်မှတ်ထားသော အရည်အချင်းစစ် အဆင့် ၅ ချက်စလုံးကို အောင်မြင်ပြီးဖြစ်ပါသည်။ တကယ့်စာမေးပွဲ အချိန်သတ်မှတ်ချက်အတိုင်း စတင်ဖြေဆိုပါ။',
        actionLabel: 'Launch Full Mock Exam (本番模試)',
        actionIcon: Play,
        onClick: () => setIsMockExamActive(true),
        badgeText: 'Official Qualification · အရည်အချင်းပြည့်မီ',
      };
    }

    if (!gate1Passed) {
      return {
        gateName: 'Gate 1: Lesson Curriculum Mastery (သင်ရိုးပြီးမြောက်မှု)',
        title: `Complete Current Lesson ${activeLesson.number} (${activeLesson.title})`,
        descriptionEn: `Curriculum mastery is currently at ${readiness.lessonMasteryPct}% (target: 90%). Complete Lesson ${activeLesson.number} to advance syllabus coverage.`,
        descriptionMy: `လက်ရှိ သင်ရိုးပြီးမြောက်မှုမှာ ${readiness.lessonMasteryPct}% ဖြစ်ပြီး သတ်မှတ်ချက် ၉၀% ပြည့်မီရန် သင်ခန်းစာ ${activeLesson.number} ကို ဆက်လက်လေ့လာပါ။`,
        actionLabel: `Start Lesson ${activeLesson.number} Assessment`,
        actionIcon: BookOpen,
        onClick: () => onStartLessonTest(activeLesson.id),
        badgeText: 'Highest Priority · အဓိကဦးစားပေး',
      };
    }

    if (!gate3Passed) {
      const isZero = !readiness.hasSrsData;
      return {
        gateName: 'Gate 3: SRS 30-Day True Retention (ရက် ၃၀ SRS မှတ်ဉာဏ်ထိန်းသိမ်းမှု)',
        title: isZero
          ? 'Start First SRS Flashcard Reviews (SRS ကတ်များ စတင်လေ့ကျင့်ပါ)'
          : 'Reinforce SRS Retention & Clear Backlog (SRS မှတ်မိမှုနှုန်း မြှင့်တင်ပါ)',
        descriptionEn: isZero
          ? 'No SRS review data recorded yet. Practice flashcards in the Cram Lab to activate spaced repetition toward the 85% benchmark.'
          : `Current 30-day retention is ${readiness.srs30DayRetentionPct}% (target: 85%). Clear due flashcards and eliminate leeches.`,
        descriptionMy: isZero
          ? 'SRS ပြန်လှန်လေ့ကျင့်မှု ဒေတာ မရှိသေးပါ။ ၈၅% ပြည့်မီရန် Cram Lab တွင် ဝေါဟာရနှင့် သဒ္ဒါကတ်များကို စတင်လေ့ကျင့်ပါ။'
          : `လက်ရှိ ရက် ၃၀ မှတ်မိမှုနှုန်းမှာ ${readiness.srs30DayRetentionPct}% ဖြစ်ပြီး ၈၅% ပြည့်မီရန် မှတ်ဉာဏ်ကတ်များကို ပြန်လည်လေ့ကျင့်ပါ။`,
        actionLabel: 'Open Grammar & Vocab Cram Lab',
        actionIcon: Zap,
        onClick: () => setActiveTab('cram'),
        badgeText: 'SRS Memory Gate · မှတ်ဉာဏ်အဆင့်',
      };
    }

    if (!gate2Passed) {
      return {
        gateName: 'Gate 2: Lesson Retention Rate (သင်ခန်းစာ မှတ်မိမှုနှုန်း)',
        title: 'Strengthen Retained Lessons (သင်ခန်းစာများ ပြန်လည်စစ်ဆေးပါ)',
        descriptionEn: `Lesson retention rate is at ${readiness.lessonRetentionPct}% (target: 50%). Re-test previously studied units to lock in long-term mastery.`,
        descriptionMy: `သင်ခန်းစာ မှတ်မိမှုနှုန်းမှာ ${readiness.lessonRetentionPct}% ဖြစ်ပြီး သတ်မှတ်ချက် ၅၀% ပြည့်မီရန် ယခင်သင်ခန်းစာများကို ပြန်လည်ဖြေဆိုပါ။`,
        actionLabel: `Take Lesson ${activeLesson.number} Assessment`,
        actionIcon: RotateCcw,
        onClick: () => onStartLessonTest(activeLesson.id),
        badgeText: 'Retention Prerequisite · မှတ်မိမှုလိုအပ်ချက်',
      };
    }

    if (!gate4Passed) {
      return {
        gateName: 'Gate 4: Weekly Tests Avg Score (အပတ်စဉ် စာမေးပွဲ ပျမ်းမျှရမှတ်)',
        title: 'Take Multi-Skill Weekly Review Test (အပတ်စဉ် စာမေးပွဲ ဖြေဆိုပါ)',
        descriptionEn: `Weekly tests average score is ${readiness.weeklyTestsAvgPct}% (target: 75%). Complete a comprehensive 45-minute multi-skill test to raise your benchmark.`,
        descriptionMy: `အပတ်စဉ် စာမေးပွဲ ပျမ်းမျှရမှတ်မှာ ${readiness.weeklyTestsAvgPct}% ဖြစ်ပြီး သတ်မှတ်ချက် ၇၅% ပြည့်မီရန် ၄၅ မိနစ် စာမေးပွဲကို ဖြေဆိုပါ။`,
        actionLabel: 'Start Weekly Review Test',
        actionIcon: Clock,
        onClick: () => startAssessment('weekly'),
        badgeText: 'Audit Benchmark · အပတ်စဉ်စစ်ဆေးမှု',
      };
    }

    return {
      gateName: `Gate 5: JLPT ${profile.level} Level Readiness Test (${profile.level} အဆင့်စစ် စာမေးပွဲ)`,
      title: `Pass Official ${profile.level} Level Evaluation (အဆင့်စစ် စာမေးပွဲ ဖြေဆိုပါ)`,
      descriptionEn: `All syllabus and retention requirements met! Complete the official ${profile.level} evaluation test to unlock honban mock simulation readiness.`,
      descriptionMy: `သင်ရိုးနှင့် မှတ်မိမှု လိုအပ်ချက်များ ပြည့်မီပါပြီ။ အဆင့်စစ် စာမေးပွဲ ဖြေဆိုအောင်မြင်ပါက အပြည့်အဝ အရည်အချင်းပြည့်မီပါမည်။`,
      actionLabel: `Take ${profile.level} Level Evaluation Test`,
      actionIcon: Award,
      onClick: () => startAssessment('level'),
      badgeText: 'Final Prerequisite · နောက်ဆုံးလိုအပ်ချက်',
    };
  };

  // --- Formal Assessment Handlers ---
  const startAssessment = async (type: AssessmentType) => {
    const publishedMap = new Map(ContentLoader.getCurriculumMap().map((m) => [m.id, m.status]));
    const packs = (await db.lesson_packs.toArray()).filter(
      (p) =>
        p.level === profile.level &&
        p.status === 'published' &&
        publishedMap.get(p.id) === 'published'
    );
    const allQuestions = packs.flatMap((p) => p.questions);

    const qPool =
      allQuestions.length >= 10
        ? allQuestions
        : [
            {
              id: 'sample_v1',
              lessonId: 'n5.l01',
              skill: 'vocab' as const,
              type: 'multiple_choice' as const,
              prompt: 'What does 「学生」 mean?',
              choices: ['Student', 'Teacher', 'Book', 'Water'],
              answer: 'Student',
              explanation: '学生 means student.',
              difficulty: 1,
              linkedItemIds: [],
              generated: false,
            },
            {
              id: 'sample_k1',
              lessonId: 'n5.l01',
              skill: 'kanji' as const,
              type: 'multiple_choice' as const,
              prompt: 'What is the reading of 「学」?',
              choices: ['がく', 'せい', 'せん', 'ほん'],
              answer: 'がく',
              explanation: '学 is read がく.',
              difficulty: 1,
              linkedItemIds: [],
              generated: false,
            },
            {
              id: 'sample_g1',
              lessonId: 'n5.l01',
              skill: 'grammar' as const,
              type: 'multiple_choice' as const,
              prompt: 'Complete: わたし ___ がくせいです。',
              choices: ['は', 'の', 'を', 'に'],
              answer: 'は',
              explanation: 'Topic particle は.',
              difficulty: 1,
              linkedItemIds: [],
              generated: false,
            },
            {
              id: 'sample_r1',
              lessonId: 'n5.l01',
              skill: 'reading' as const,
              type: 'multiple_choice' as const,
              prompt: 'Reading check: Who is Tanaka-san?',
              choices: ['Teacher', 'Student', 'Doctor', 'Tourist'],
              answer: 'Teacher',
              explanation: 'Tanaka is the teacher.',
              difficulty: 1,
              linkedItemIds: [],
              generated: false,
            },
            {
              id: 'sample_l1',
              lessonId: 'n5.l01',
              skill: 'listening' as const,
              type: 'multiple_choice' as const,
              prompt: 'Greeting question: Morning greeting?',
              choices: ['おはようございます', 'こんにちは', 'こんばんは', 'さようなら'],
              answer: 'おはようございます',
              explanation: 'Good morning.',
              difficulty: 1,
              linkedItemIds: [],
              generated: false,
            },
          ];

    setTestQuestions(fisherYatesShuffle(qPool).slice(0, 10));
    setAssessmentSession(new AssessmentSession());
    setCurrentQIndex(0);
    setAnswers([]);
    setTestStartMs(Date.now());
    setTestResult(null);
    setActiveTestType(type);
  };

  const handleSelectOption = async (option: ShuffledOption) => {
    const q = testQuestions[currentQIndex];
    const isCorrect = assessmentSession.checkOption(option, q.answer);
    const updatedAnswers = [...answers, { question: q, isCorrect }];
    setAnswers(updatedAnswers);

    if (currentQIndex < testQuestions.length - 1) {
      setCurrentQIndex((p) => p + 1);
    } else {
      const blueprint = engine.getBlueprint(activeTestType!, profile.level);
      const durationSec = Math.round((Date.now() - testStartMs) / 1000);
      const prior = assessmentHistory.find((h) => h.type === activeTestType);
      const result = engine.evaluateAssessment(blueprint, updatedAnswers, durationSec, prior);

      await db.assessments.add(result);
      setTestResult(result);
      await loadAssessmentData();
    }
  };

  // Centralized scoped keyboard shortcuts (1-4 for choices) in formal tests
  useScopedShortcuts({
    scopeId: 'tests_screen',
    enabled: Boolean(activeTestType) && !testResult && Boolean(testQuestions[currentQIndex]),
    priority: 15,
    handlers: {
      SELECT_CHOICE_1: () => {
        const currentQ = testQuestions[currentQIndex];
        if (currentQ) {
          const opts = assessmentSession.getOptions(currentQ);
          if (opts[0]) handleSelectOption(opts[0]);
        }
      },
      SELECT_CHOICE_2: () => {
        const currentQ = testQuestions[currentQIndex];
        if (currentQ) {
          const opts = assessmentSession.getOptions(currentQ);
          if (opts[1]) handleSelectOption(opts[1]);
        }
      },
      SELECT_CHOICE_3: () => {
        const currentQ = testQuestions[currentQIndex];
        if (currentQ) {
          const opts = assessmentSession.getOptions(currentQ);
          if (opts[2]) handleSelectOption(opts[2]);
        }
      },
      SELECT_CHOICE_4: () => {
        const currentQ = testQuestions[currentQIndex];
        if (currentQ) {
          const opts = assessmentSession.getOptions(currentQ);
          if (opts[3]) handleSelectOption(opts[3]);
        }
      },
    },
  });

  // --- Weak-Point Drill & Leech Remediation Handlers ---
  const startWeakPointDrill = async (focusSkill?: QuestionSkill | 'mixed_leeches') => {
    const drillSession = await WeaknessRemediator.generateWeakPointDrill({
      focusSkill: focusSkill || weaknessReport?.weakestSkill || 'grammar',
      count: 12,
      userLevel: profile.level,
    });

    setActiveDrill(drillSession);
    setDrillAnswers([]);
    setCurrentDrillIndex(0);
    setDrillStartMs(Date.now());
    setDrillResult(null);
    setDrillSelectedChoice(null);
    setDrillAnswerSubmitted(false);
  };

  const handleSelectDrillChoice = (choice: string) => {
    if (drillAnswerSubmitted) return;
    setDrillSelectedChoice(choice);
  };

  const handleSubmitDrillAnswer = async () => {
    if (!activeDrill || !drillSelectedChoice || drillAnswerSubmitted) return;

    const q = activeDrill.questions[currentDrillIndex];
    const isCorrect = drillSelectedChoice.trim().toLowerCase() === q.answer.trim().toLowerCase();

    setDrillAnswerSubmitted(true);
    const updated = [...drillAnswers, { question: q, isCorrect }];
    setDrillAnswers(updated);
  };

  const handleNextDrillQuestion = async () => {
    if (!activeDrill) return;

    if (currentDrillIndex < activeDrill.questions.length - 1) {
      setCurrentDrillIndex((prev) => prev + 1);
      setDrillSelectedChoice(null);
      setDrillAnswerSubmitted(false);
    } else {
      // Completed drill session!
      const durationSec = Math.round((Date.now() - drillStartMs) / 1000);
      const res = await WeaknessRemediator.recordDrillCompletion(activeDrill, drillAnswers, durationSec);
      setDrillResult(res);
      await loadAssessmentData();
    }
  };

  const handleRehabilitateItem = async (cardId: string) => {
    setRehabilitatingCardId(cardId);
    await WeaknessRemediator.rehabilitateLeech(cardId);
    await loadAssessmentData();
    setRehabilitatingCardId(null);
    setStatusNotification('Item rehabilitated and returned to review pool.');
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleSeedQuarantine = async () => {
    await WeaknessRemediator.seedSampleLeechesIfEmpty();
    await loadAssessmentData();
    setStatusNotification('Diagnostic leech cards loaded into Quarantine.');
    setTimeout(() => setStatusNotification(null), 3000);
  };

  if (isMockExamActive) {
    return (
      <OfficialMockExamScreen
        onExit={() => {
          setIsMockExamActive(false);
          onTestActiveChange?.(false);
        }}
        onExamCompleted={async (report) => {
          await loadAssessmentData();
          setStatusNotification(
            report.passed
              ? `【合格】公式模試スコア ${report.totalScaledScore}/180 点！レーダーチャートが更新されました。`
              : `公式模試結果が保存されました（${report.totalScaledScore}/180 点）。弱点補強ドリルで復習しましょう。`
          );
          setTimeout(() => setStatusNotification(null), 5000);
        }}
        onLaunchRemediationDrill={async () => {
          setIsMockExamActive(false);
          onTestActiveChange?.(false);
          await startWeakPointDrill();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28">
      {/* Toast Notification */}
      {statusNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{statusNotification}</span>
          </div>
          <button onClick={() => setStatusNotification(null)} className="text-emerald-600 hover:text-emerald-900 transition cursor-pointer">✕</button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold uppercase">
              {profile.level} Assessment Center
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
            Assessments, Radar &amp; Remediation
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Blueprint-driven tests, conjunctive skill radar, and 1-click targeted weak-point drills.
          </p>
        </div>

        {/* 7-Way Segmented Navigation Tab Bar with Active Neon Pill Glides */}
        <div className="flex items-center space-x-1 bg-stone-200/80 border border-stone-300 rounded-2xl p-1.5 self-start sm:self-auto flex-wrap gap-1 shadow-2xs relative">
          {[
            { id: 'tests' as const, label: 'Tests & Blueprints', icon: <CheckSquare className="w-3.5 h-3.5" /> },
            { id: 'cram' as const, label: 'သဒ္ဒါ Cram Lab', icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> },
            { id: 'dokkai' as const, label: 'Dokkai Workbench (読解)', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'choukai' as const, label: 'Choukai Lab (聴解)', icon: <Headphones className="w-3.5 h-3.5" /> },
            { id: 'scramble' as const, label: '★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)', icon: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> },
            { id: 'analytics' as const, label: 'Radar Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'quarantine' as const, label: `Leech Quarantine (${quarantineLeeches.length})`, icon: <Bug className="w-3.5 h-3.5 text-rose-500" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 cursor-pointer flex items-center space-x-1.5 ${
                  isActive ? 'text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTestTab"
                    className="absolute inset-0 bg-indigo-600 rounded-xl shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center space-x-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE WEAK-POINT / LEECH DRILL RUNNER MODAL */}
      {activeDrill && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />

          {!drillResult ? (
            <div className="space-y-4">
              {/* Drill Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold uppercase tracking-wider flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-indigo-600" />
                    <span>{activeDrill.title}</span>
                  </span>
                  {activeDrill.isLeechDrill && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px]">
                      Leech Remediation
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-stone-500 font-mono">
                  <span>Question {currentDrillIndex + 1} of {activeDrill.questions.length}</span>
                  <button
                    onClick={() => setActiveDrill(null)}
                    className="text-stone-500 hover:text-stone-900 transition cursor-pointer"
                  >
                    Exit Drill
                  </button>
                </div>
              </div>

              {/* Current Question */}
              {activeDrill.questions[currentDrillIndex] && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-stone-500 uppercase">
                        Skill Focus: {activeDrill.questions[currentDrillIndex].skill}
                      </span>
                      {activeDrill.questions[currentDrillIndex].hint && (
                        <span className="text-[11px] text-amber-700 font-mono italic">
                          Hint: {activeDrill.questions[currentDrillIndex].hint}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 font-japanese tracking-wide leading-relaxed">
                      {activeDrill.questions[currentDrillIndex].prompt}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(activeDrill.questions[currentDrillIndex].choices || [
                      activeDrill.questions[currentDrillIndex].answer,
                      'Other option A',
                      'Other option B',
                      'Other option C',
                    ]).map((choice, i) => {
                      const isSelected = drillSelectedChoice === choice;
                      const isCorrectAnswer =
                        choice.trim().toLowerCase() ===
                        activeDrill.questions[currentDrillIndex].answer.trim().toLowerCase();

                      let btnStyle =
                        'bg-white border-stone-200 text-stone-800 hover:border-stone-300 hover:bg-stone-50 shadow-xs';

                      if (drillAnswerSubmitted) {
                        if (isCorrectAnswer) {
                          btnStyle = 'bg-green-50 border-green-300 text-green-800';
                        } else if (isSelected && !isCorrectAnswer) {
                          btnStyle = 'bg-red-50 border-red-300 text-red-800';
                        } else {
                          btnStyle = 'bg-stone-50 border-stone-200 text-stone-400 opacity-60';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500 shadow-xs';
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectDrillChoice(choice)}
                          disabled={drillAnswerSubmitted}
                          className={`p-3.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                        >
                          <span className="flex items-center space-x-2.5">
                            <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[10px] flex items-center justify-center font-mono shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-japanese text-sm">{choice}</span>
                          </span>

                          {drillAnswerSubmitted && (
                            <span>
                              {isCorrectAnswer ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : isSelected ? (
                                <X className="w-4 h-4 text-rose-600" />
                              ) : null}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Feedback Box */}
                  {drillAnswerSubmitted && (
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center space-x-2">
                        {drillSelectedChoice?.trim().toLowerCase() ===
                        activeDrill.questions[currentDrillIndex].answer.trim().toLowerCase() ? (
                          <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold font-mono">
                            <Check className="w-4 h-4" />
                            <span>အဖြေမှန် (Correct)</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-rose-700 text-xs font-bold font-mono">
                            <X className="w-4 h-4" />
                            <span>အဖြေမှား (Incorrect)</span>
                          </div>
                        )}
                        <span className="text-[10px] text-stone-600 font-mono">
                          • အဖြေမှန်: {activeDrill.questions[currentDrillIndex].answer}
                        </span>
                      </div>
                      <p className="text-xs text-stone-700">
                        {activeDrill.questions[currentDrillIndex].explanation}
                      </p>
                    </div>
                  )}

                  {/* Drill Bottom Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-stone-500 font-mono">
                      Keys 1-4 for quick selection
                    </span>

                    {!drillAnswerSubmitted ? (
                      <button
                        onClick={handleSubmitDrillAnswer}
                        disabled={!drillSelectedChoice}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        အဖြေစစ်ဆေးမည် (Check)
                      </button>
                    ) : (
                      <button
                        onClick={handleNextDrillQuestion}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <span>
                          {currentDrillIndex < activeDrill.questions.length - 1
                            ? 'နောက်မေးခွန်းသို့ (Next)'
                            : 'ရလဒ်ကို ကြည့်မည် (View Results)'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Drill Completed Screen */
            <div className="space-y-5 text-center py-4">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-xs ${
                  drillResult.score >= 80
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {drillResult.score >= 80 ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <Flame className="w-8 h-8 text-rose-600" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-stone-900">
                  {drillResult.score >= 80 ? 'Targeted Drill Cleared!' : 'Remediation Session Completed'}
                </h3>
                <p className="text-xs text-stone-600">
                  Target: {activeDrill.skillLabel} • Score: {drillResult.score}% (
                  {drillAnswers.filter((a) => a.isCorrect).length}/{drillAnswers.length} correct)
                </p>
              </div>

              {drillResult.rehabilitatedCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-md mx-auto text-xs text-emerald-800 flex items-center justify-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully rehabilitated <strong>{drillResult.rehabilitatedCount} stubborn leech item(s)</strong>!
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setActiveDrill(null);
                    setActiveTab('analytics');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  View Radar Analytics Progress
                </button>
                <button
                  onClick={() => startWeakPointDrill(activeDrill.focusSkill)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition cursor-pointer border border-stone-200 shadow-xs"
                >
                  ထပ်မံလေ့ကျင့်မည် (Drill Again)
                </button>
                <button
                  onClick={() => setActiveDrill(null)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition cursor-pointer shadow-xs"
                >
                  ပိတ်မည် (Close)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Dokkai Reading Workbench */}
      {activeTab === 'dokkai' && (
        <div className="space-y-4">
          <DokkaiReaderWorkbench
            availablePassages={CURATED_DOKKAI_CATALOG}
            onExit={() => setActiveTab('tests')}
            onComplete={async (summary) => {
              const assessmentResult: AssessmentResult = {
                id: `asmt_dokkai_${Date.now()}`,
                type: 'weekly',
                level: profile.level,
                takenAt: new Date().toISOString(),
                score: Math.round(summary.accuracy),
                accuracy: Math.round(summary.accuracy) / 100,
                totalQuestions: summary.totalQuestions,
                correctQuestions: summary.correctCount,
                durationSeconds: summary.elapsedSeconds,
                bySkill: {
                  vocab: { correct: 0, total: 0, accuracy: 0 },
                  kanji: { correct: 0, total: 0, accuracy: 0 },
                  grammar: { correct: 0, total: 0, accuracy: 0 },
                  reading: {
                    correct: summary.correctCount,
                    total: summary.totalQuestions,
                    accuracy: summary.totalQuestions > 0 ? summary.correctCount / summary.totalQuestions : 0,
                  },
                  listening: { correct: 0, total: 0, accuracy: 0 },
                },
                passed: summary.accuracy >= 80,
                weakSkills: summary.accuracy < 80 ? ['reading'] : [],
                failedItemIds: [],
              };
              await db.assessments.add(assessmentResult);
              await loadAssessmentData();
              setStatusNotification(
                summary.accuracy >= 80
                  ? `読解スコア（${summary.cpm} CPM）が正常に記録され、レーダーチャートが更新されました！`
                  : `読解スコア（${summary.cpm} CPM）が記録されました。弱点補強ドリルで読解力を鍛えましょう。`
              );
              setTimeout(() => setStatusNotification(null), 4000);
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: Choukai Listening Studio */}
      {activeTab === 'choukai' && (
        <div className="space-y-4">
          <ChoukaiWorkbench
            onExit={() => setActiveTab('tests')}
            onComplete={async (result) => {
              const assessmentResult: AssessmentResult = {
                id: `asmt_choukai_${Date.now()}`,
                type: 'weekly',
                level: profile.level,
                takenAt: new Date().toISOString(),
                score: result.score,
                accuracy: result.accuracy,
                totalQuestions: result.total,
                correctQuestions: result.correct,
                durationSeconds: 90,
                bySkill: {
                  vocab: { correct: 0, total: 0, accuracy: 0 },
                  kanji: { correct: 0, total: 0, accuracy: 0 },
                  grammar: { correct: 0, total: 0, accuracy: 0 },
                  reading: { correct: 0, total: 0, accuracy: 0 },
                  listening: {
                    correct: result.correct,
                    total: result.total,
                    accuracy: result.accuracy,
                  },
                },
                passed: result.accuracy >= 0.8,
                weakSkills: result.accuracy < 0.8 ? ['listening'] : [],
                failedItemIds: result.accuracy < 0.8 ? [result.scenarioId] : [],
              };
              await db.assessments.add(assessmentResult);
              await loadAssessmentData();
              setStatusNotification(
                result.accuracy >= 0.8
                  ? '聴解スコアが正常に記録され、レーダーチャートが更新されました！'
                  : '聴解スコアが記録されました。弱点補強ドリルで復習しましょう。'
              );
              setTimeout(() => setStatusNotification(null), 4000);
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: Star Scramble Lab (★ 文法・並べ替え) */}
      {activeTab === 'scramble' && (
        <div className="space-y-4">
          <StarScrambleTrainer
            onExit={() => setActiveTab('tests')}
            onComplete={async (summary) => {
              const assessmentResult: AssessmentResult = {
                id: `asmt_scramble_${Date.now()}`,
                type: 'weekly',
                level: profile.level,
                takenAt: new Date().toISOString(),
                score: summary.score,
                accuracy: summary.accuracy / 100,
                totalQuestions: summary.totalPuzzles,
                correctQuestions: Math.round((summary.accuracy / 100) * summary.totalPuzzles),
                durationSeconds: 150,
                bySkill: {
                  vocab: { correct: 0, total: 0, accuracy: 0 },
                  kanji: { correct: 0, total: 0, accuracy: 0 },
                  grammar: {
                    correct: Math.round((summary.accuracy / 100) * summary.totalPuzzles),
                    total: summary.totalPuzzles,
                    accuracy: summary.accuracy / 100,
                  },
                  reading: {
                    correct: Math.round((summary.accuracy / 100) * summary.totalPuzzles),
                    total: summary.totalPuzzles,
                    accuracy: summary.accuracy / 100,
                  },
                  listening: { correct: 0, total: 0, accuracy: 0 },
                },
                passed: summary.score >= 75,
                weakSkills: summary.score < 75 ? ['grammar'] : [],
                failedItemIds: [],
              };
              await db.assessments.add(assessmentResult);
              await loadAssessmentData();
              setStatusNotification(
                summary.score >= 75
                  ? '★ 文法・並べ替えスコアが正常に記録され、レーダー分析が更新されました！'
                  : '★ 文法・並べ替えスコアが記録されました。接続ルールを確認して再挑戦しましょう。'
              );
              setTimeout(() => setStatusNotification(null), 4000);
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: Grammar Cram Lab (သဒ္ဒါ အထူးလေ့ကျင့်ရေး) */}
      {activeTab === 'cram' && (
        <div className="space-y-4">
          <GrammarCramLab profile={profile} onExit={() => setActiveTab('tests')} />
        </div>
      )}

      {/* TAB CONTENT: Radar Analytics */}
      {activeTab === 'analytics' && (
        <TestAnalyticsScreen
          profile={profile}
          onNavigateToTests={() => setActiveTab('tests')}
          onLaunchDrill={startWeakPointDrill}
        />
      )}

      {/* TAB CONTENT: Leech Quarantine */}
      {activeTab === 'quarantine' && (
        <div className="space-y-6">
          {/* Bunpro-Inspired 4-Stage Leech Ghost Quarantine */}
          <GhostQuarantineHub />

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold uppercase">
                    Quarantine Sandbox
                  </span>
                  <span className="text-xs text-stone-600 font-mono">
                    {quarantineLeeches.length} items flagged with persistent failure
                  </span>
                </div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
                  <Bug className="w-5 h-5 text-amber-600" />
                  <span>Stubborn Item Quarantine &amp; Isolated Review</span>
                </h2>
                <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
                  When a flashcard accumulates high lapse counts (≥3-5 failures), it enters Leech Quarantine. This prevents interference loops from dragging down your regular daily SRS retention. Practice these items in targeted quarantine drills to restore fluency.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => startWeakPointDrill('mixed_leeches')}
                  disabled={quarantineLeeches.length === 0}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Drill All Quarantined Items</span>
                </button>
                <button
                  onClick={() => setActiveTab('cram')}
                  className="px-4 py-3 rounded-xl bg-white border border-stone-300 hover:border-amber-400 text-amber-800 text-xs font-semibold shadow-xs transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="font-myanmar">သဒ္ဒါ Cram Lab သို့</span>
                </button>
                {quarantineLeeches.length === 0 && (
                  <button
                    onClick={handleSeedQuarantine}
                    className="px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs transition cursor-pointer shadow-xs"
                  >
                    Simulate Diagnostic Leeches
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quarantined List */}
          {quarantineLeeches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {quarantineLeeches.map((leech) => (
                <div
                  key={leech.cardId}
                  className="bg-white border border-stone-200 hover:border-amber-400 rounded-xl p-4 space-y-3 transition group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600 uppercase">
                          {leech.itemType}
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">{leech.lessonId}</span>
                      </div>
                      <h4 className="text-xl font-bold font-japanese text-stone-900 tracking-wide mt-1">
                        {leech.prompt}
                      </h4>
                      {leech.reading && leech.reading !== leech.prompt && (
                        <p className="text-xs text-indigo-600 font-japanese font-medium">
                          「{leech.reading}」
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono font-bold">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>{leech.lapses} Lapses</span>
                      </span>
                      <div className="text-[10px] font-mono text-stone-500">
                        {leech.errorCount} failures / {leech.reviewCount || leech.lapses} reviews
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 space-y-1">
                    <div className="text-stone-800">
                      <strong>Meaning:</strong> {leech.meaning}
                    </div>
                    {leech.exampleSentence && (
                      <div className="text-[11px] text-stone-600 font-japanese italic truncate">
                        {leech.exampleSentence}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => startWeakPointDrill('mixed_leeches')}
                      className="text-amber-700 hover:text-amber-800 font-medium flex items-center space-x-1 transition cursor-pointer"
                    >
                      <span>Practice in Isolation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRehabilitateItem(leech.cardId)}
                      disabled={rehabilitatingCardId === leech.cardId}
                      className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-700 hover:text-emerald-800 text-[11px] font-medium transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {rehabilitatingCardId === leech.cardId ? (
                        <RotateCcw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Rehabilitate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900">Quarantine Zone Clean</h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto">
                  No stubborn leech items currently detected with repetitive failure lapses.
                </p>
              </div>
              <button
                onClick={handleSeedQuarantine}
                className="px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition cursor-pointer shadow-xs"
              >
                Populate Diagnostic Leeches for Demonstration
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Tests & Blueprints */}
      {activeTab === 'tests' && (
        <>
          {/* Prominent Official N2 Mock Simulation (本番模試) Hero Card with Obsidian Glass & Readiness Ring */}
          <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 hover:border-indigo-300 p-6 sm:p-8 shadow-sm transition duration-300 group">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-100/50 transition-all duration-500" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                  {/* Readiness HUD Circle Ring */}
                  {readiness && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-stone-100 border border-stone-200 shadow-2xs">
                      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                        <svg className="w-8 h-8 transform -rotate-90">
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-stone-200"
                            fill="transparent"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-indigo-600 transition-all duration-1000"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 12}
                            strokeDashoffset={2 * Math.PI * 12 * (1 - (readiness.overallReadinessPct || 0) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-stone-900">
                          {readiness.overallReadinessPct}%
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-600 uppercase tracking-wider">
                        Readiness
                      </span>
                    </div>
                  )}

                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>HONBAN SIMULATION · 本番模試</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-mono">
                    Official JLPT N2 Standard
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-japanese">
                    Official JLPT N2 Mock Exam Simulator (本番シミュレーション)
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
                    Test your authentic exam stamina in strict dual sessions: <strong>Section 1 (105 min)</strong> Language Knowledge &amp; split-pane Dokkai reading passages, followed by <strong>Section 2 (50 min)</strong> non-stop Choukai listening tape track. Evaluated under official 180-point scaled algorithms with sectional 19/60 benchmark verification.
                  </p>
                </div>

                {/* Badges / Metrics Pills */}
                <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono text-stone-700 pt-1">
                  <span className="px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sec 1: 105 Min (言語知識・読解)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-1.5">
                    <Headphones className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sec 2: 50 Min (聴解)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>180 Scaled Points (60 / 60 / 60)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    Pass: ≥ 90 Total &amp; ≥ 19/Section
                  </span>
                </div>

                {/* Latest Mock Exam Score banner if taken */}
                {(() => {
                  const latestMock = assessmentHistory.find(
                    (a) => a.id.startsWith('asmt_mock_n2') || (a.type === 'level' && a.durationSeconds && a.durationSeconds > 600)
                  );
                  if (!latestMock) return null;
                  return (
                    <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl text-xs flex items-center space-x-3 text-stone-700 shadow-2xs">
                      <span className="text-[10px] uppercase font-mono text-stone-500">Latest Honban Record:</span>
                      <span className="font-mono font-bold text-stone-900">
                        {Math.round(latestMock.score * 1.8)} / 180 点
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                          latestMock.passed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {latestMock.passed ? '合格 PASS' : '不合格 FAIL'}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {new Date(latestMock.takenAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Start Simulation CTA Button */}
              <div className="shrink-0 flex flex-col items-stretch sm:items-center">
                <button
                  onClick={() => {
                    setIsMockExamActive(true);
                    onTestActiveChange?.(true);
                  }}
                  className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition active:scale-95 flex items-center justify-center space-x-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Start Full Simulation (本番模試を開始)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-stone-500 font-mono text-center mt-2">
                  Strict exam rules • Official scoring
                </span>
              </div>
            </div>
          </div>

          {/* Quick Weak-Point Action Banner (Rose/Amber) */}
          {weaknessReport && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-stone-900">
                      Weak-Point Remediation Available: {weaknessReport.weakestSkillLabel}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {weaknessReport.weakestSkillScore}% vs {weaknessReport.targetThresholdPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Launch a 12-question custom practice session targeted at your lowest radar competency.
                  </p>
                </div>
              </div>

              <button
                onClick={() => startWeakPointDrill(weaknessReport.weakestSkill)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Launch Drill</span>
              </button>
            </div>
          )}

          {/* Interactive Dokkai (Reading Comprehension) Workbench Spotlight Card */}
          <div className="bg-white border border-stone-200 hover:border-indigo-300 rounded-xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600 shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 font-japanese">
                    Interactive Dokkai (Reading Comprehension) Workbench
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                    短文 · 中文 · 長文
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Train reading stamina with split-pane passages, toggleable Furigana, paragraph numbers (¶), sentence arguments highlighter (筆者の主張), real-time CPM speed metrics, answer evidence-linking, and 1-Click Vocab Mining to SRS.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('dokkai')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer self-start md:self-center"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Launch Dokkai Workbench</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {/* Interactive Choukai (Listening Comprehension) & Shadowing Studio Spotlight Card */}
          <div className="bg-white border border-stone-200 hover:border-indigo-300 rounded-xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600 shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 font-japanese">
                    Choukai (Listening Comprehension) &amp; Shadowing Studio
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                    課題理解 · ポイント理解 · 即時応答
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Train listening acuity with 3-stage visibility (Blind Exam, Script, Clue Breakdown), speaker pitch modulation, speed selection (0.75x–1.25x), sentence-by-sentence shadowing loops (AB-Repeat), and distractor trap breakdowns.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('choukai')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-95 shadow-xs flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer self-start md:self-center"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Launch Choukai Lab</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {/* Interactive Star Scramble Lab Spotlight Card */}
          <div className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600 shadow-2xs">
                <Star className="w-5 h-5 fill-amber-500/20" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 font-japanese">
                    ★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                    配点対象 · 接続連鎖分析
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Master the highest-weight grammar question on the JLPT with authentic 4-blank puzzle slots <code className="text-amber-800 font-mono">[ 1 ] [ 2 ] [ ★ ] [ 4 ]</code>, number shortcuts (1–4), instant grammatical connection diagrams (<span className="font-japanese text-stone-800">接続の理由</span>), and English &amp; Burmese translations.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('scramble')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition active:scale-95 shadow-xs flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer self-start md:self-center"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>★ စတင်လေ့ကျင့်မည် (Launch Star Puzzle)</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {/* Required Honest Readiness Indicator Policy Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-stone-900">Learning Readiness Indicator Policy:</strong>
              <span>
                This tool provides a <strong>learning readiness indicator — not a prediction of actual JLPT results</strong>. Official JLPT outcomes depend on examination room performance, official test scoring, and broader unscripted exposure.
              </span>
            </div>
          </div>

          {/* Active Formal Assessment Test Modal/View */}
          {activeTestType && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
              {!testResult ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-stone-500 pb-2 border-b border-stone-200">
                    <span className="font-semibold text-indigo-600 uppercase font-mono">
                      {activeTestType.toUpperCase()} ASSESSMENT
                    </span>
                    <span>Question {currentQIndex + 1} of {testQuestions.length}</span>
                  </div>

                  {testQuestions[currentQIndex] && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-stone-900 font-japanese">
                        {testQuestions[currentQIndex].prompt}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {assessmentSession.getOptions(testQuestions[currentQIndex]).map((opt, i) => (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(opt)}
                            className="p-3 rounded-xl border border-stone-200 bg-white hover:border-indigo-400 hover:bg-stone-50 text-stone-800 text-left text-xs font-medium transition flex items-center justify-between cursor-pointer shadow-xs"
                          >
                            <span className="flex items-center">
                              <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 text-[10px] flex items-center justify-center mr-2 font-mono">
                                {i + 1}
                              </span>
                              <span className="font-japanese">{opt.text}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div
                    className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-xs ${
                      testResult.passed
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {testResult.passed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">
                    {testResult.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
                  </h3>
                  <p className="text-xs text-stone-600">
                    Score: {testResult.score}% • Duration: {Math.round(testResult.durationSeconds / 60)} min
                  </p>

                  {testResult.comparisonWithPrior && (
                    <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200 inline-block">
                      Comparison vs prior:{' '}
                      {testResult.comparisonWithPrior.scoreDiff >= 0
                        ? `+${testResult.comparisonWithPrior.scoreDiff}%`
                        : `${testResult.comparisonWithPrior.scoreDiff}%`}{' '}
                      score change
                    </div>
                  )}

                  {/* Review of incorrect answers */}
                  {answers.some((a) => !a.isCorrect) && (
                    <div className="text-left mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 max-w-xl mx-auto">
                      <h4 className="text-xs font-semibold uppercase text-rose-700">Questions to Review</h4>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {answers
                          .filter((a) => !a.isCorrect)
                          .map((item, idx) => (
                            <div key={idx} className="border-b border-stone-200 pb-2 last:border-0 text-xs space-y-1">
                              <p className="text-stone-800 font-medium font-japanese">{item.question.prompt}</p>
                              <p className="text-rose-700 text-[11px]">Correct Answer: {item.question.answer}</p>
                              {item.question.explanation && (
                                <p className="text-stone-600 text-[10px]">{item.question.explanation}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTestType(null)}
                    className="px-6 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Close Assessment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Brand-New Learner: Non-Destructive "Start Here" Onboarding Roadmap */}
          {isBrandNewLearner && (
            <div className="bg-gradient-to-br from-indigo-50/90 via-white to-stone-50 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-zinc-800/80 border border-indigo-200/80 dark:border-indigo-950/60 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-zinc-100 flex items-center gap-2">
                      Start Here · စတင်လေ့လာရန် လမ်းညွှန်
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        New Learner Roadmap
                      </span>
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-zinc-400 mt-0.5 font-myanmar">
                      JLPT {profile.level} အောင်မြင်ရန်အတွက် လိုက်နာရမည့် အခြေခံ အဆင့် ၃ ဆင့်
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartLessonTest(activeLesson.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Step 1 (Lesson {activeLesson.number})</span>
                </button>
              </div>

              {/* 3-Step Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/70 border border-stone-200/80 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-bold font-mono text-xs flex items-center justify-center">
                      1
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                      Current Step
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                    Step 1: First Lesson (ပထမဆုံး သင်ခန်းစာ)
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Study Lesson {activeLesson.number}: {activeLesson.title}. Complete vocabulary, kanji, and grammar stages, then pass the immediate lesson assessment.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/70 border border-stone-200/80 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300 font-bold font-mono text-xs flex items-center justify-center">
                      2
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-zinc-400">
                      Next Up
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                    Step 2: First SRS Review (ပထမဆုံး SRS ကတ်လေ့ကျင့်မှု)
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Open the Cram Lab or Flashcard deck to review new cards. Spaced repetition solidifies long-term memory toward the 85% retention gate.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-800/70 border border-stone-200/80 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300 font-bold font-mono text-xs flex items-center justify-center">
                      3
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-zinc-400">
                      Milestone
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                    Step 3: First Assessment (ပထမဆုံး အကဲဖြတ် စာမေးပွဲ)
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                    Take a Weekly Review Test or Chapter Audit to test reading, listening, vocabulary, and grammar under exam conditions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Next Step Action Panel */}
          {readiness && (() => {
            const recommendation = getRecommendedNextStep();
            if (!recommendation) return null;
            const ActionIcon = recommendation.actionIcon;

            return (
              <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                        Recommended Next Step · အကြံပြုထားသော နောက်တစ်ဆင့်
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-zinc-100">
                        {recommendation.title}
                      </h3>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700 shrink-0">
                    {recommendation.badgeText}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-stone-600 dark:text-zinc-400">
                  <p>{recommendation.descriptionEn}</p>
                  <p className="font-myanmar text-[11px] text-stone-500 dark:text-zinc-500">
                    {recommendation.descriptionMy}
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 dark:border-zinc-800">
                  <span className="text-[11px] font-mono text-stone-500 dark:text-zinc-500">
                    Target: <strong className="text-stone-700 dark:text-zinc-300">{recommendation.gateName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={recommendation.onClick}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1.5"
                  >
                    <ActionIcon className="w-3.5 h-3.5" />
                    <span>{recommendation.actionLabel}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* JLPT Learning Readiness Engine Gauge */}
          {readiness && (
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
                <div className="flex items-center space-x-4">
                  {/* Readiness HUD Percentage Ring */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        stroke="currentColor"
                        strokeWidth="4.5"
                        className="text-stone-200 dark:text-zinc-700"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        stroke="currentColor"
                        strokeWidth="4.5"
                        className="text-emerald-600 dark:text-emerald-500 transition-all duration-1000"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 25}
                        strokeDashoffset={2 * Math.PI * 25 * (1 - (readiness.overallReadinessPct || 0) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                      <span className="text-sm font-bold text-stone-900 dark:text-zinc-100">
                        {readiness.overallReadinessPct}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 flex items-center space-x-2">
                      <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                      <span>JLPT {profile.level} Conjunctive Readiness Engine</span>
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-zinc-400 mt-0.5">
                      Overall composite requires meeting all 5 prerequisite retention &amp; score gates.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-mono border ${
                      readiness.status === 'ready'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                        : readiness.status === 'approaching_readiness'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                        : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-700'
                    }`}
                  >
                    {readiness.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* All 5 Prerequisite Readiness Gates (Itemized explicitly with Bilingual Labels, Target Thresholds, Visual Bars, and Pass/Pending Badges) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Gate 1: Lesson Curriculum Mastery */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      Lesson Curriculum Mastery (သင်ရိုးပြီးမြောက်မှု)
                    </span>
                    {readiness.lessonMasteryPct >= 90 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pass (အောင်မြင်ပြီး)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending (လိုအပ်နေသေးသည်)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-zinc-400 font-mono">
                    <span>Progress / Target:</span>
                    <span className="text-stone-900 dark:text-zinc-100 font-bold">
                      {readiness.lessonMasteryPct}% / 90%
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, readiness.lessonMasteryPct)}%` }}
                    />
                  </div>
                </div>

                {/* Gate 2: Lesson Retention Rate */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      Lesson Retention Rate (သင်ခန်းစာ မှတ်မိမှုနှုန်း)
                    </span>
                    {readiness.lessonRetentionPct >= 50 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pass (အောင်မြင်ပြီး)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending (လိုအပ်နေသေးသည်)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-zinc-400 font-mono">
                    <span>Progress / Target:</span>
                    <span className="text-stone-900 dark:text-zinc-100 font-bold">
                      {readiness.lessonRetentionPct}% / 50%
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, readiness.lessonRetentionPct)}%` }}
                    />
                  </div>
                </div>

                {/* Gate 3: SRS 30-Day True Retention */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      SRS 30-Day True Retention (ရက် ၃၀ SRS မှတ်ဉာဏ်ထိန်းသိမ်းမှု)
                    </span>
                    {readiness.hasSrsData && readiness.srs30DayRetentionPct >= 85 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pass (အောင်မြင်ပြီး)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending (လိုအပ်နေသေးသည်)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-zinc-400 font-mono">
                    <span>Progress / Target:</span>
                    <span className="text-stone-900 dark:text-zinc-100 font-bold">
                      {readiness.hasSrsData ? `${readiness.srs30DayRetentionPct}% / 85%` : 'No data yet (ဒေတာမရှိသေးပါ)'}
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: readiness.hasSrsData ? `${Math.min(100, readiness.srs30DayRetentionPct)}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* Gate 4: Weekly Tests Avg Score */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      Weekly Tests Avg Score (အပတ်စဉ် စာမေးပွဲ ပျမ်းမျှရမှတ်)
                    </span>
                    {readiness.weeklyTestsAvgPct >= 75 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pass (အောင်မြင်ပြီး)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending (လိုအပ်နေသေးသည်)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-zinc-400 font-mono">
                    <span>Progress / Target:</span>
                    <span className="text-stone-900 dark:text-zinc-100 font-bold">
                      {readiness.weeklyTestsAvgPct > 0 ? `${readiness.weeklyTestsAvgPct}% / 75%` : 'No tests yet (0%) / 75%'}
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, readiness.weeklyTestsAvgPct)}%` }}
                    />
                  </div>
                </div>

                {/* Gate 5: JLPT Level Readiness Test */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-800 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      JLPT {profile.level} Level Readiness Test ({profile.level} အဆင့်စစ် စာမေးပွဲ အောင်မြင်မှု)
                    </span>
                    {readiness.levelTestPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Pass (အောင်မြင်ပြီး)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending (လိုအပ်နေသေးသည်)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 dark:text-zinc-400 font-mono">
                    <span>Progress / Target:</span>
                    <span className="text-stone-900 dark:text-zinc-100 font-bold">
                      {readiness.levelTestPassed ? 'Passed (အောင်မြင်ပြီး) · 100% / Pass' : 'Pending Examination (မဖြေရသေး/မအောင်သေး) · 0% / Pass'}
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: readiness.levelTestPassed ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Battery Cards with Obsidian Glass Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3.5">
            {/* Dynamic Current Lesson Test Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-emerald-400 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono uppercase">
                    Immediate
                  </span>
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Current Lesson Test</h3>
                <p className="text-xs text-stone-600">
                  Lesson {activeLesson.number}: {activeLesson.title}
                </p>
              </div>

              <button
                onClick={() => onStartLessonTest(activeLesson.id)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Start Lesson {activeLesson.number}
              </button>
            </div>

            {/* Weekly Test Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-stone-300 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-mono uppercase">
                    Audit
                  </span>
                  <Clock className="w-4 h-4 text-stone-400" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Weekly Review Test</h3>
                <p className="text-xs text-stone-600">
                  45 min • 33 questions covering all 5 skills across recent units.
                </p>
              </div>

              <button
                onClick={() => startAssessment('weekly')}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Start Weekly
              </button>
            </div>

            {/* Monthly Test Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-indigo-300 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono uppercase">
                    Stage
                  </span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Monthly Synthesis</h3>
                <p className="text-xs text-stone-600">
                  75 min • 51 questions with mixed synthesis &amp; recall.
                </p>
              </div>

              <button
                onClick={() => startAssessment('monthly')}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Start Monthly
              </button>
            </div>

            {/* Dokkai Reading Stamina Benchmark Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-indigo-300 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono uppercase">
                    Stamina
                  </span>
                  <BookOpen className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Dokkai Lab</h3>
                <p className="text-xs text-stone-600">
                  55 min • Tanki, Chuki &amp; Choubun with live CPM speed gauge.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('dokkai')}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Reading</span>
              </button>
            </div>

            {/* Choukai Listening Studio Benchmark Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-indigo-300 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono uppercase">
                    Aural
                  </span>
                  <Headphones className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">Choukai Lab</h3>
                <p className="text-xs text-stone-600">
                  Kadai, Point &amp; Sokuji scenarios with 3-stage visibility.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('choukai')}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Open Listening</span>
              </button>
            </div>

            {/* Star Question Scramble Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-amber-400 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono uppercase">
                    ★ Grammar
                  </span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">★ 문장 조립 / JLPT Star Grammar Puzzle</h3>
                <p className="text-xs text-stone-600">
                  ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း • JLPT sentence reordering with grammatical connection chains.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('scramble')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>★ စတင်လေ့ကျင့်မည် (Star Puzzle)</span>
              </button>
            </div>

            {/* Level Test (Test Out) Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between hover:border-indigo-300 transition shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono uppercase">
                    Simulation
                  </span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">{profile.level} Level Test</h3>
                <p className="text-xs text-stone-600">
                  90 min • 70 questions • Full JLPT readiness verification.
                </p>
              </div>

              <button
                onClick={() => startAssessment('level')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Take Level Test
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
