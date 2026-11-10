import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  BookOpen,
  ChevronRight,
  Check,
  X,
  Layers,
  HelpCircle,
  ListOrdered,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import {
  JLPTLevel,
  ExamQuestion,
  UserExamAnswer,
  ExamScoreReport,
  JLPT_EXAM_CONFIGS,
  generateMockExam,
  calculateScaledScore,
  quarantineMissedExamQuestions,
  persistExamResult,
} from '../../domain/exam/exam-engine';
import { db, ExamResultRecord } from '../../data/db/dexie-db';
import { ExamResultModal } from '../components/ExamResultModal';

interface MockExamScreenProps {
  initialLevel?: JLPTLevel;
  onExit: () => void;
  onTestActiveChange?: (active: boolean) => void;
}

export const MockExamScreen: React.FC<MockExamScreenProps> = ({
  initialLevel = 'N5',
  onExit,
  onTestActiveChange,
}) => {
  // Screen Mode: 'lobby' | 'exam' | 'result'
  const [examState, setExamState] = useState<'lobby' | 'exam' | 'result'>('lobby');
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(initialLevel);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Active Exam Data
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, UserExamAnswer>>({});

  // Countdown Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const targetEndTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);

  // Modals & Drawers
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [scoreReport, setScoreReport] = useState<ExamScoreReport | null>(null);
  const [quarantinedCount, setQuarantinedCount] = useState<number>(0);

  // History for selected level
  const [examHistory, setExamHistory] = useState<ExamResultRecord[]>([]);

  // Load history on mount or level change
  const loadHistory = useCallback(async (lvl: JLPTLevel) => {
    try {
      const records = await db.getExamResults(lvl);
      setExamHistory(records);
    } catch (e) {
      console.warn('[MockExam] Error loading history:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory(selectedLevel);
  }, [selectedLevel, loadHistory]);

  // Notify parent if test is active (to hide nav bars)
  useEffect(() => {
    onTestActiveChange?.(examState === 'exam');
    return () => {
      onTestActiveChange?.(false);
    };
  }, [examState, onTestActiveChange]);

  // Start Exam Handler
  const handleStartExam = async () => {
    setIsLoading(true);
    try {
      const generated = await generateMockExam(selectedLevel);
      setQuestions(generated);
      setCurrentIndex(0);

      // Initialize answers map
      const initialAnswers: Record<string, UserExamAnswer> = {};
      for (const q of generated) {
        initialAnswers[q.id] = {
          selectedChoice: null,
          isFlagged: false,
        };
      }
      setAnswers(initialAnswers);

      const config = JLPT_EXAM_CONFIGS[selectedLevel];
      const duration = config.durationSeconds;
      setSecondsRemaining(duration);
      targetEndTimeRef.current = Date.now() + duration * 1000;

      setExamState('exam');
    } catch (err) {
      console.error('[MockExam] Failed to generate exam:', err);
      alert('စာမေးပွဲ မေးခွန်းများ ပြင်ဆင်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit & Evaluation
  const finalizeExam = useCallback(
    async (currentAnswers: Record<string, UserExamAnswer>) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      const report = calculateScaledScore(currentAnswers, questions, selectedLevel);

      // Auto-quarantine missed questions
      let qCount = 0;
      if (report.missedQuestions.length > 0) {
        qCount = await quarantineMissedExamQuestions(report.missedQuestions);
      }
      report.quarantinedCount = qCount;
      setQuarantinedCount(qCount);

      // Persist report
      await persistExamResult(report);
      setScoreReport(report);
      setExamState('result');
      setShowSubmitConfirm(false);
      loadHistory(selectedLevel);
    },
    [questions, selectedLevel, loadHistory]
  );

  // Resilient Countdown Engine with visibility change listener
  useEffect(() => {
    if (examState !== 'exam') return;

    const checkTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        // Time expired! Auto-submit
        finalizeExam(answers);
      }
    };

    checkTimer();
    timerIntervalRef.current = setInterval(checkTimer, 500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [examState, finalizeExam, answers]);

  // Hotkeys: 1-4 for choices, F for flag, Arrows for navigation
  useEffect(() => {
    if (examState !== 'exam' || questions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentQ = questions[currentIndex];
      if (!currentQ) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const choiceIdx = parseInt(e.key, 10) - 1;
        if (currentQ.choices[choiceIdx]) {
          handleSelectChoice(currentQ.id, currentQ.choices[choiceIdx]);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFlag(currentQ.id);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [examState, questions, currentIndex]);

  const handleSelectChoice = (questionId: string, choice: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedChoice: choice,
      },
    }));
  };

  const handleToggleFlag = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isFlagged: !prev[questionId]?.isFlagged,
      },
    }));
  };

  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : null;

  // Answered stats for drawer & submit modal
  const answeredCount = Object.values(answers).filter((a) => a.selectedChoice !== null).length;
  const flaggedCount = Object.values(answers).filter((a) => a.isFlagged).length;
  const unansweredCount = questions.length - answeredCount;

  // --------------------------------------------------------------------------
  // 1. LOBBY VIEW
  // --------------------------------------------------------------------------
  if (examState === 'lobby') {
    const config = JLPT_EXAM_CONFIGS[selectedLevel];
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2'];

    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 sm:p-10 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>JLPT Official-Style Simulator</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                JLPT ပုံစံတူ စာမေးပွဲ (Mock Exam)
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-burmese">
                တရားဝင် JLPT အချိန်ကန့်သတ်ချက်များ၊ ကဏ္ဍအလိုက် အမှတ်ပေးစည်းမျဉ်းများနှင့် ၁၈၀ မှတ်
                Scaled Scoring စနစ်ဖြင့် သင့်အရည်အချင်းကို အချိန်နှင့်တပြေးညီ တိုင်းတာပါ။
              </p>
            </div>

            <button
              onClick={onExit}
              className="self-start md:self-auto px-4 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-300 transition cursor-pointer shadow-xs"
            >
              ← ပင်မစာမျက်နှာသို့ (Home)
            </button>
          </div>
        </div>

        {/* Level Selector Tabs */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-stone-500" />
            <span>JLPT အဆင့် ရွေးချယ်ပါ (Select Target Level)</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {levels.map((lvl) => {
              const active = selectedLevel === lvl;
              const lvlConfig = JLPT_EXAM_CONFIGS[lvl];
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between bg-white ${
                    active
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-2xl font-black font-mono ${
                        active ? 'text-indigo-600' : 'text-stone-900'
                      }`}
                    >
                      {lvl}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="mt-3 text-[11px] space-y-0.5 text-stone-600">
                    <div>⏱️ {lvlConfig.durationMinutes} mins</div>
                    <div>📝 {lvlConfig.totalQuestions} questions</div>
                    <div className="text-emerald-700 font-mono font-medium">
                      🎯 Pass: {lvlConfig.passThreshold}/180
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Level Exam Specification Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center space-x-2">
                <span>{config.titleBurmese}</span>
              </h3>
              <p className="text-xs text-stone-600 mt-1">{config.descriptionBurmese}</p>
            </div>

            <button
              onClick={handleStartExam}
              disabled={isLoading}
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-sm transition active:scale-95 flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>မေးခွန်းများ ပြင်ဆင်နေသည်...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
                  <span>စာမေးပွဲ စတင်မည် (Start Exam)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* 3 Section Breakdown Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-xs">
              <div className="text-stone-700 font-medium">ကဏ္ဍ ၁: 文字・語彙</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                {config.sectionDistribution.vocabulary} မေးခွန်း
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                ဝေါဟာရ၊ ခန်ဂျီအသံထွက်နှင့် အဓိပ္ပာယ်
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-xs">
              <div className="text-stone-700 font-medium">ကဏ္ဍ ၂: 文法</div>
              <div className="text-lg font-bold text-sky-700 font-mono mt-1">
                {config.sectionDistribution.grammar} မေးခွန်း
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                သဒ္ဒါပုံစံ၊ ဝါကျဖွဲ့စည်းပုံနှင့် ကွက်လပ်ဖြည့်
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-xs">
              <div className="text-stone-700 font-medium">ကဏ္ဍ ၃: 読解</div>
              <div className="text-lg font-bold text-amber-700 font-mono mt-1">
                {config.sectionDistribution.reading} မေးခွန်း
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                သတင်းစကား၊ အီးမေးလ်နှင့် စာပိုဒ်တိုဖတ်ရှုနားလည်မှု
              </div>
            </div>
          </div>
        </div>

        {/* Past Exam History */}
        {examHistory.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-stone-500" />
              <span>ယခင်ဖြေဆိုခဲ့သော ရလဒ်များ ({selectedLevel} Exam History)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {examHistory.slice(0, 4).map((hist) => (
                <div
                  key={hist.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hist.passed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {hist.passed ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      <span className="font-mono font-bold text-stone-900 text-sm">
                        {hist.scaledScore} / 180
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      {new Date(hist.completedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-stone-600 font-mono">
                    <div>
                      မှန်: {hist.correctQuestions} / {hist.totalQuestions}
                    </div>
                    {hist.quarantinedCount > 0 && (
                      <div className="text-amber-700 text-[10px]">
                        🔥 {hist.quarantinedCount} quarantined
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. ACTIVE EXAM VIEW
  // --------------------------------------------------------------------------
  if (examState === 'exam' && currentQ) {
    const isWarningTime = secondsRemaining <= 300; // < 5 mins
    const isDangerTime = secondsRemaining <= 60; // < 1 min

    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col pb-16">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-200 px-4 py-3 shadow-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Exam tag + Progress */}
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-mono font-bold text-indigo-700">
                {selectedLevel} Mock
              </span>
              <div className="text-xs font-mono font-medium text-stone-800">
                {currentIndex + 1}{' '}
                <span className="text-stone-400 font-normal">/ {questions.length}</span>
              </div>
            </div>

            {/* Center: Resilient Countdown Timer */}
            <div
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold transition-all ${
                isDangerTime
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse shadow-xs'
                  : isWarningTime
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-stone-50 border-stone-200 text-stone-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Right: Matrix Drawer Toggle + Submit */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-300 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                title="မေးခွန်းများ စာရင်း"
              >
                <ListOrdered className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">မေးခွန်းများ</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
                  {answeredCount}/{questions.length}
                </span>
              </button>

              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                အဖြေလွှာတင်မည်
              </button>
            </div>
          </div>
        </header>

        {/* Main Exam Content Container */}
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Section Indicator Bar */}
          <div className="flex items-center justify-between text-xs text-stone-600 border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="font-bold text-stone-900">{currentQ.sectionTitleJa}</span>
              <span className="text-stone-500 font-burmese">({currentQ.sectionTitleMy})</span>
            </div>

            <button
              onClick={() => handleToggleFlag(currentQ.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                currentAnswer?.isFlagged
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-stone-300 text-stone-600 hover:text-stone-900 shadow-xs'
              }`}
            >
              <Flag
                className={`w-3.5 h-3.5 ${
                  currentAnswer?.isFlagged ? 'fill-amber-600 text-amber-600' : ''
                }`}
              />
              <span>{currentAnswer?.isFlagged ? 'အလံပြထားသည်' : 'အလံပြရန်'}</span>
              <kbd className="hidden sm:inline text-[9px] bg-stone-100 px-1 py-0.2 rounded text-stone-500">
                F
              </kbd>
            </button>
          </div>

          {/* Question Card */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Prompt */}
            <div className="space-y-2">
              <div className="text-lg sm:text-2xl font-bold text-stone-900 tracking-wide leading-relaxed whitespace-pre-wrap">
                {currentQ.prompt}
              </div>
              {currentQ.promptMy && (
                <div className="text-xs sm:text-sm text-stone-600 font-burmese leading-relaxed">
                  {currentQ.promptMy}
                </div>
              )}
            </div>

            {/* 4 Choices Radio Cards */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.choices.map((choice, idx) => {
                const isSelected = currentAnswer?.selectedChoice === choice;
                const hotkeyNumber = idx + 1;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectChoice(currentQ.id, choice)}
                    className={`group relative flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm text-stone-900'
                        : 'bg-stone-50/70 hover:bg-white border-stone-200 hover:border-stone-300 text-stone-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold border transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white border-stone-300 text-stone-600 group-hover:border-stone-400'
                        }`}
                      >
                        {hotkeyNumber}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-medium ${
                          isSelected ? 'text-stone-900 font-bold' : 'text-stone-800'
                        }`}
                      >
                        {choice}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              className="py-3 px-5 rounded-2xl bg-white hover:bg-stone-50 disabled:opacity-40 text-stone-700 border border-stone-300 text-xs font-bold flex items-center space-x-2 transition cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ယခင် (Previous)</span>
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>အဖြေလွှာ စစ်ဆေးတင်မည် (Review & Submit)</span>
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer shadow-xs"
              >
                <span>နောက်တစ်ခု (Next)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Question Matrix Drawer / Modal */}
        {isMatrixOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl bg-white border border-stone-200 rounded-3xl p-6 shadow-xl max-h-[85vh] flex flex-col text-stone-900">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span>မေးခွန်းများ စာရင်း (Question Navigator)</span>
                  </h3>
                  <div className="text-xs text-stone-600">
                    ဖြေဆိုပြီး: <strong className="text-emerald-700">{answeredCount}</strong> /{' '}
                    {questions.length} | အလံပြထား: <strong className="text-amber-700">{flaggedCount}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setIsMatrixOpen(false)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Matrix Grid */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                  {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    const isAnswered = ans?.selectedChoice !== null;
                    const isFlagged = ans?.isFlagged;
                    const isCurrent = idx === currentIndex;

                    let bgClass = 'bg-stone-50 border-stone-200 text-stone-600';
                    if (isFlagged) {
                      bgClass = 'bg-amber-50 border-amber-300 text-amber-800 font-bold';
                    } else if (isAnswered) {
                      bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setIsMatrixOpen(false);
                        }}
                        className={`p-3 rounded-xl border text-xs font-mono flex flex-col items-center justify-center transition cursor-pointer relative ${bgClass} ${
                          isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : ''
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {isFlagged && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>ဖြေပြီး</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>အလံပြ</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                    <span>မဖြေရသေး</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMatrixOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold border border-stone-300 cursor-pointer"
                >
                  ပိတ်မည်
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl space-y-4 text-stone-900">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">အဖြေလွှာ တင်သွင်းမည်လား။</h3>
                <p className="text-xs text-stone-600 font-burmese leading-relaxed">
                  အဖြေလွှာတင်ပြီးပါက အမှတ်များကို တွက်ချက်ကာ အမှားများကို FSRS Quarantine သို့
                  ပေးပို့သွားမည် ဖြစ်ပါသည်။
                </p>
              </div>

              {/* Status metrics pill */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-stone-600">
                  <span>ဖြေဆိုပြီး မေးခွန်း:</span>
                  <span className="font-bold text-emerald-700">
                    {answeredCount} / {questions.length}
                  </span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>မဖြေရသေးသော မေးခွန်း:</span>
                    <span className="font-bold">{unansweredCount}</span>
                  </div>
                )}
                {flaggedCount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>အလံပြထားသော မေးခွန်း:</span>
                    <span className="font-bold">{flaggedCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200">
                  <span>ကျန်ရှိချိန်:</span>
                  <span className="font-bold text-stone-900">{formatTime(secondsRemaining)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold border border-stone-300 transition cursor-pointer"
                >
                  ဆက်လက်ဖြေဆိုမည်
                </button>
                <button
                  onClick={() => finalizeExam(answers)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  အတည်ပြု တင်သွင်းမည်
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. RESULT VIEW
  // --------------------------------------------------------------------------
  if (examState === 'result' && scoreReport) {
    return (
      <ExamResultModal
        report={scoreReport}
        quarantinedCount={quarantinedCount}
        onRetake={() => {
          setExamState('lobby');
          setScoreReport(null);
        }}
        onExit={onExit}
      />
    );
  }

  return null;
};
