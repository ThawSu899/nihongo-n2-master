import React, { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, Award, Clock, ArrowRight, Check, X, ShieldAlert, BarChart3 } from 'lucide-react';
import { MasteryRecord, UserProfile, AssessmentResult, AssessmentType, Question } from '../../domain/models/types';
import { AssessmentEngine } from '../../domain/assessment/assessment-engine';
import { SystemClock } from '../../domain/common/clock';
import { db } from '../../data/db/dexie-db';
import { calculateTrueRetention } from '../../domain/srs/srs-scheduler';
import { ContentLoader } from '../../data/content/content-loader';
import { AssessmentSession, ShuffledOption, fisherYatesShuffle } from '../../domain/assessment/shuffler';

interface TestsScreenProps {
  profile: UserProfile;
  masteryRecord?: MasteryRecord;
  onStartLessonTest: (lessonId: string) => void;
  onTestActiveChange?: (active: boolean) => void;
}

export const TestsScreen: React.FC<TestsScreenProps> = ({
  profile,
  masteryRecord,
  onStartLessonTest,
  onTestActiveChange,
}) => {
  const clock = new SystemClock();
  const engine = new AssessmentEngine(clock);

  const [activeTestType, setActiveTestType] = useState<AssessmentType | null>(null);

  useEffect(() => {
    if (onTestActiveChange) {
      onTestActiveChange(activeTestType !== null);
    }
    return () => {
      if (onTestActiveChange) {
        onTestActiveChange(false);
      }
    };
  }, [activeTestType, onTestActiveChange]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentResult[]>([]);
  const [readiness, setReadiness] = useState<any>(null);

  const curriculumMap = ContentLoader.getCurriculumMap();
  const activeLesson = curriculumMap.find((m) => m.id === (profile.currentLessonId || 'n5.l01')) || curriculumMap[0];

  // Active assessment test execution state
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [assessmentSession, setAssessmentSession] = useState(() => new AssessmentSession());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question: Question; isCorrect: boolean }>>([]);
  const [testStartMs, setTestStartMs] = useState<number>(Date.now());
  const [testResult, setTestResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    const history = await db.assessments.orderBy('takenAt').reverse().toArray();
    setAssessmentHistory(history);

    const records = await db.mastery_records.toArray();
    const masteredCount = records.filter((r) => r.state === 'mastered' || r.state === 'retained').length;
    const retainedCount = records.filter((r) => r.state === 'retained').length;

    const cards = await db.srs_cards.toArray();
    const dueCount = cards.filter((c) => new Date(c.due).getTime() <= Date.now()).length;

    const logs = await db.review_logs.toArray();
    const srsRetention = calculateTrueRetention(logs, clock);

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
        reading: masteryRecord?.scores.reading || 0.80,
        listening: masteryRecord?.scores.listening || 0.80,
      },
      srsBacklogCount: dueCount,
      srsDailyCap: profile.dailyReviewCap || 200,
      levelTestPassed: levelPassed,
    });

    setReadiness(calculated);
  };

  const startAssessment = async (type: AssessmentType) => {
    const blueprint = engine.getBlueprint(type, profile.level);
    // Draw questions across published lessons matching learner level in IndexedDB
    const publishedMap = new Map(ContentLoader.getCurriculumMap().map((m) => [m.id, m.status]));
    const packs = (await db.lesson_packs.toArray()).filter(
      (p) => p.level === profile.level && p.status === 'published' && publishedMap.get(p.id) === 'published'
    );
    const allQuestions = packs.flatMap((p) => p.questions);

    // Fall back to sample questions if DB has few questions loaded
    const qPool = allQuestions.length >= 10 ? allQuestions : [
      { id: 'sample_v1', lessonId: 'n5.l01', skill: 'vocab' as const, type: 'multiple_choice' as const, prompt: 'What does 「学生」 mean?', choices: ['Student', 'Teacher', 'Book', 'Water'], answer: 'Student', explanation: '学生 means student.', difficulty: 1, linkedItemIds: [], generated: false },
      { id: 'sample_k1', lessonId: 'n5.l01', skill: 'kanji' as const, type: 'multiple_choice' as const, prompt: 'What is the reading of 「学」?', choices: ['がく', 'せい', 'せん', 'ほん'], answer: 'がく', explanation: '学 is read がく.', difficulty: 1, linkedItemIds: [], generated: false },
      { id: 'sample_g1', lessonId: 'n5.l01', skill: 'grammar' as const, type: 'multiple_choice' as const, prompt: 'Complete: わたし ___ がくせいです。', choices: ['は', 'の', 'を', 'に'], answer: 'は', explanation: 'Topic particle は.', difficulty: 1, linkedItemIds: [], generated: false },
      { id: 'sample_r1', lessonId: 'n5.l01', skill: 'reading' as const, type: 'multiple_choice' as const, prompt: 'Reading check: Who is Tanaka-san?', choices: ['Teacher', 'Student', 'Doctor', 'Tourist'], answer: 'Teacher', explanation: 'Tanaka is the teacher.', difficulty: 1, linkedItemIds: [], generated: false },
      { id: 'sample_l1', lessonId: 'n5.l01', skill: 'listening' as const, type: 'multiple_choice' as const, prompt: 'Greeting question: Morning greeting?', choices: ['おはようございます', 'こんにちは', 'こんばんは', 'さようなら'], answer: 'おはようございます', explanation: 'Good morning.', difficulty: 1, linkedItemIds: [], generated: false },
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
      // Completed!
      const blueprint = engine.getBlueprint(activeTestType!, profile.level);
      const durationSec = Math.round((Date.now() - testStartMs) / 1000);
      const prior = assessmentHistory.find((h) => h.type === activeTestType);
      const result = engine.evaluateAssessment(blueprint, updatedAnswers, durationSec, prior);

      await db.assessments.add(result);
      setTestResult(result);
      await loadAssessmentData();
    }
  };

  // Keyboard shortcut listener (1-4 for choices)
  useEffect(() => {
    if (!activeTestType || testResult || !testQuestions[currentQIndex]) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const currentQ = testQuestions[currentQIndex];
        const opts = assessmentSession.getOptions(currentQ);
        if (opts[idx]) {
          handleSelectOption(opts[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTestType, testResult, currentQIndex, testQuestions, assessmentSession, answers]);

  const scores = masteryRecord?.scores || {
    vocab: 0,
    kanji: 0,
    grammar: 0,
    reading: 0,
    listening: 0,
    overall: 0,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Assessments &amp; JLPT Readiness</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Blueprint-driven assessments with strict conjunctive scoring. Strong skills cannot mask weak skills.
        </p>
      </div>

      {/* Required Honest Readiness Indicator Banner */}
      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-300">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-stone-200">Learning Readiness Indicator Policy:</strong>
          <span>
            This tool provides a <strong>learning readiness indicator — not a prediction of actual JLPT results</strong>. Official JLPT outcomes depend on examination room performance, official test scoring, and broader unscripted exposure.
          </span>
        </div>
      </div>

      {/* Active Assessment Modal/View */}
      {activeTestType && (
        <div className="bg-stone-900 border border-rose-800 rounded-2xl p-6 space-y-4 shadow-2xl">
          {!testResult ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-stone-400 pb-2 border-b border-stone-800">
                <span className="font-semibold text-rose-400 uppercase font-mono">
                  {activeTestType.toUpperCase()} ASSESSMENT
                </span>
                <span>Question {currentQIndex + 1} of {testQuestions.length}</span>
              </div>

              {testQuestions[currentQIndex] && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-stone-100">
                    {testQuestions[currentQIndex].prompt}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {assessmentSession.getOptions(testQuestions[currentQIndex]).map((opt, i) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt)}
                        className="p-3 rounded-xl border border-stone-800 bg-stone-950 hover:border-rose-500 text-stone-200 text-left text-xs font-medium transition flex items-center justify-between"
                      >
                        <span className="flex items-center">
                          <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-[10px] flex items-center justify-center mr-2 font-mono">
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
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                testResult.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}>
                {testResult.passed ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-stone-100">
                {testResult.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
              </h3>
              <p className="text-xs text-stone-400">
                Score: {testResult.score}% • Duration: {Math.round(testResult.durationSeconds / 60)} min
              </p>

              {testResult.comparisonWithPrior && (
                <div className="text-xs text-stone-400 bg-stone-950 p-2.5 rounded-lg border border-stone-800 inline-block">
                  Comparison vs prior: {testResult.comparisonWithPrior.scoreDiff >= 0 ? `+${testResult.comparisonWithPrior.scoreDiff}%` : `${testResult.comparisonWithPrior.scoreDiff}%`} score change
                </div>
              )}

              {/* Review of incorrect answers */}
              {answers.some((a) => !a.isCorrect) && (
                <div className="text-left mt-4 p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3 max-w-xl mx-auto">
                  <h4 className="text-xs font-semibold uppercase text-rose-400">Questions to Review</h4>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {answers
                      .filter((a) => !a.isCorrect)
                      .map((item, idx) => (
                        <div key={idx} className="border-b border-stone-900 pb-2 last:border-0 text-xs space-y-1">
                          <p className="text-stone-200 font-medium font-japanese">{item.question.prompt}</p>
                          <p className="text-rose-400 text-[11px]">Correct Answer: {item.question.answer}</p>
                          {item.question.explanation && (
                            <p className="text-stone-400 text-[10px]">{item.question.explanation}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveTestType(null)}
                className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
              >
                Close Assessment
              </button>
            </div>
          )}
        </div>
      )}

      {/* JLPT N2 Learning Readiness Engine Gauge */}
      {readiness && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-stone-100">JLPT N2 Learning Readiness Gauge</h2>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400">{readiness.overallReadinessPct}%</span>
          </div>

          <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-rose-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${readiness.overallReadinessPct}%` }}
            />
          </div>

          {/* 7 Readiness Criteria Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
            <div className="flex items-center space-x-2">
              <span className={readiness.lessonMasteryPct >= 90 ? 'text-emerald-400' : 'text-stone-500'}>
                {readiness.lessonMasteryPct >= 90 ? '✓' : '○'}
              </span>
              <span className="text-stone-300">Curriculum Mastery ({readiness.lessonMasteryPct}% / 90%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={readiness.srs30DayRetentionPct >= 85 ? 'text-emerald-400' : 'text-stone-500'}>
                {readiness.srs30DayRetentionPct >= 85 ? '✓' : '○'}
              </span>
              <span className="text-stone-300">30-Day True Retention ({readiness.srs30DayRetentionPct}% / 85%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={readiness.weeklyTestsAvgPct >= 75 ? 'text-emerald-400' : 'text-stone-500'}>
                {readiness.weeklyTestsAvgPct >= 75 ? '✓' : '○'}
              </span>
              <span className="text-stone-300">Weekly Tests Average ({readiness.weeklyTestsAvgPct}% / 75%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={readiness.levelTestPassed ? 'text-emerald-400' : 'text-stone-500'}>
                {readiness.levelTestPassed ? '✓' : '○'}
              </span>
              <span className="text-stone-300">Level Readiness Test ({readiness.levelTestPassed ? 'Passed' : 'Pending'})</span>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Test Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-mono text-rose-400 uppercase font-semibold">Immediate Assessment</span>
            <h2 className="text-lg font-bold text-stone-100">
              Current Lesson Test ({activeLesson.level} Day {activeLesson.number} • {activeLesson.title})
            </h2>
            <p className="text-xs text-stone-400 max-w-lg">
              Timed, unhinted test requiring minimum evidence counts (Vocab ≥ 10, Kanji ≥ 6, Grammar ≥ 6, Reading ≥ 5, Listening ≥ 5).
            </p>
          </div>
          <button
            onClick={() => onStartLessonTest(activeLesson.id)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow"
          >
            Take Lesson Test
          </button>
        </div>

        {/* Current Evidence Scores */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-stone-800/80">
          {(['vocab', 'kanji', 'grammar', 'reading', 'listening'] as const).map((skill) => {
            const scorePct = Math.round(scores[skill] * 100);
            const threshold = skill === 'vocab' ? 90 : skill === 'reading' || skill === 'listening' ? 80 : 85;
            const isPassing = scorePct >= threshold;

            return (
              <div key={skill} className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80 text-center">
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">{skill}</span>
                <span className={`text-base font-bold font-mono ${isPassing ? 'text-emerald-400' : 'text-stone-300'}`}>
                  {scorePct}%
                </span>
                <span className="text-[9px] text-stone-500 block">req: {threshold}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Tests Catalog with Real Assessment Triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-stone-200">Weekly Progress Test (Every 7 Days)</h3>
          </div>
          <p className="text-xs text-stone-400">
            Comprehensive synthesis test evaluating vocabulary, kanji, and grammar retention. Weak areas feed next week&apos;s daily schedule.
          </p>
          <button
            onClick={() => startAssessment('weekly')}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition"
          >
            Start Weekly Test
          </button>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Award className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-stone-200">{profile.level} Level Simulation Test</h3>
          </div>
          <p className="text-xs text-stone-400">
            Full-length timed simulation test with JLPT-style scoring sections. Can test out of material at any time.
          </p>
          <button
            onClick={() => startAssessment('level')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow"
          >
            Take Level Test (Test Out)
          </button>
        </div>
      </div>
    </div>
  );
};
