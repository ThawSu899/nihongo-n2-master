import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Award,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Flag,
  BookOpen,
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  buildOfficialN2MockExam,
  MockExamEngine,
  MockExamQuestionMeta,
  MockExamScoreReport,
  OFFICIAL_N2_SECTIONS,
  MockExamSection,
} from '../../domain/assessment/mock-exam-engine';
import { DokkaiPassageModel } from '../../domain/assessment/dokkai-catalog';
import { ChoukaiScenario } from '../../domain/assessment/choukai-catalog';
import { ChoukaiAudioEngine, ChoukaiSpeed } from '../../domain/audio/choukai-audio-engine';
import { QuestionSkill } from '../../domain/models/types';
import { useScopedShortcuts } from '../context/GlobalShortcutContext';

interface OfficialMockExamScreenProps {
  onExit: () => void;
  onLaunchRemediationDrill?: (missedQuestionIds: string[]) => void;
  onExamCompleted?: (report: MockExamScoreReport) => void;
}

export const OfficialMockExamScreen: React.FC<OfficialMockExamScreenProps> = ({
  onExit,
  onLaunchRemediationDrill,
  onExamCompleted,
}) => {
  // 1. Build canonical exam structure
  const examData = useMemo(() => buildOfficialN2MockExam(), []);

  // Exam state
  const [activeSection, setActiveSection] = useState<MockExamSection>('section_1');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<
    Record<string, { choice: string | null; timeSpent: number; isFlagged: boolean }>
  >({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Timers: Section countdown & Total elapsed
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState<number>(
    OFFICIAL_N2_SECTIONS.section_1.allocatedSeconds
  );
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [section1TimeSpent, setSection1TimeSpent] = useState<number>(0);
  const [section2TimeSpent, setSection2TimeSpent] = useState<number>(0);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  // Modals & Drawers
  const [isNavigatorOpen, setIsNavigatorOpen] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [scoreReport, setScoreReport] = useState<MockExamScoreReport | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed' | 'flagged'>('all');

  // Dokkai Reading Pane preferences
  const [dokkaiFuriganaMode, setDokkaiFuriganaMode] = useState<'off' | 'adaptive' | 'full'>('adaptive');
  const [dokkaiHighlightClaims, setDokkaiHighlightClaims] = useState<boolean>(true);

  // Choukai Audio Engine for Section 2
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<ChoukaiSpeed>(1.0);
  const [audioWaveform, setAudioWaveform] = useState<number>(0);
  const audioEngineRef = useRef<ChoukaiAudioEngine | null>(null);

  // Initialize and clean up Audio Engine
  useEffect(() => {
    const engine = new ChoukaiAudioEngine({
      onStateChange: (playing) => setIsAudioPlaying(playing),
      onWaveformTick: (amp) => setAudioWaveform(amp),
      onComplete: () => setIsAudioPlaying(false),
    });
    audioEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  // Questions for active section
  const currentSectionQuestions = useMemo(() => {
    return activeSection === 'section_1'
      ? examData.section1Questions
      : examData.section2Questions;
  }, [activeSection, examData]);

  const activeQuestionMeta: MockExamQuestionMeta | undefined =
    currentSectionQuestions[currentQuestionIndex];

  // Map passages and scenarios for quick lookup
  const passageMap = useMemo(() => {
    const map = new Map<string, DokkaiPassageModel>();
    examData.dokkaiPassages.forEach((p) => map.set(p.id, p));
    return map;
  }, [examData.dokkaiPassages]);

  const scenarioMap = useMemo(() => {
    const map = new Map<string, ChoukaiScenario>();
    examData.choukaiScenarios.forEach((s) => map.set(s.id, s));
    return map;
  }, [examData.choukaiScenarios]);

  // Dual Timer Interval
  useEffect(() => {
    if (scoreReport || isTimerPaused) return;

    const interval = setInterval(() => {
      setTotalElapsedSeconds((prev) => prev + 1);

      if (activeSection === 'section_1') {
        setSection1TimeSpent((prev) => prev + 1);
      } else {
        setSection2TimeSpent((prev) => prev + 1);
      }

      setSectionTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time expired for this section
          if (activeSection === 'section_1') {
            handleSectionTransition();
            return OFFICIAL_N2_SECTIONS.section_2.allocatedSeconds;
          } else {
            handleFinalSubmit();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scoreReport, isTimerPaused, activeSection]);

  // Audio scenario sync for Choukai question changes
  useEffect(() => {
    if (activeSection === 'section_2' && activeQuestionMeta?.choukaiScenarioId) {
      const sc = scenarioMap.get(activeQuestionMeta.choukaiScenarioId);
      if (sc && audioEngineRef.current) {
        audioEngineRef.current.loadScenario(sc);
      }
    } else {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    }
  }, [activeSection, activeQuestionMeta?.choukaiScenarioId, scenarioMap]);

  // Play audio toggle
  const handleToggleAudio = () => {
    if (!audioEngineRef.current) return;
    if (isAudioPlaying) {
      audioEngineRef.current.pause();
    } else {
      audioEngineRef.current.play();
    }
  };

  const handleChangeAudioSpeed = (speed: ChoukaiSpeed) => {
    setAudioSpeed(speed);
    if (audioEngineRef.current) {
      audioEngineRef.current.setSpeed(speed);
    }
  };

  // Record Answer & update question start time
  const handleSelectChoice = (choice: string) => {
    if (!activeQuestionMeta) return;
    const qId = activeQuestionMeta.question.id;
    const now = Date.now();
    const timeSpent = Math.max(1, Math.round((now - questionStartTime) / 1000));

    setAnswers((prev) => {
      const existing = prev[qId];
      return {
        ...prev,
        [qId]: {
          choice,
          timeSpent: (existing?.timeSpent || 0) + timeSpent,
          isFlagged: existing?.isFlagged || false,
        },
      };
    });
    setQuestionStartTime(now);
  };

  // Toggle Flag for Review (後で見直す)
  const handleToggleFlag = () => {
    if (!activeQuestionMeta) return;
    const qId = activeQuestionMeta.question.id;
    setAnswers((prev) => {
      const existing = prev[qId];
      return {
        ...prev,
        [qId]: {
          choice: existing?.choice || null,
          timeSpent: existing?.timeSpent || 0,
          isFlagged: !existing?.isFlagged,
        },
      };
    });
  };

  // Centralized scoped keyboard navigation (1-4 to answer, arrow keys to navigate)
  useScopedShortcuts({
    scopeId: 'official_mock_exam',
    enabled: !scoreReport && !showSubmitConfirmModal && !showExitConfirmModal && Boolean(activeQuestionMeta),
    priority: 15,
    handlers: {
      SELECT_CHOICE_1: () => {
        const choices = activeQuestionMeta?.question.choices || [];
        if (choices[0]) handleSelectChoice(choices[0]);
      },
      SELECT_CHOICE_2: () => {
        const choices = activeQuestionMeta?.question.choices || [];
        if (choices[1]) handleSelectChoice(choices[1]);
      },
      SELECT_CHOICE_3: () => {
        const choices = activeQuestionMeta?.question.choices || [];
        if (choices[2]) handleSelectChoice(choices[2]);
      },
      SELECT_CHOICE_4: () => {
        const choices = activeQuestionMeta?.question.choices || [];
        if (choices[3]) handleSelectChoice(choices[3]);
      },
      NEXT_ITEM: () => {
        if (currentQuestionIndex < currentSectionQuestions.length - 1) {
          goToQuestion(currentQuestionIndex + 1);
        }
      },
      PREV_ITEM: () => {
        if (currentQuestionIndex > 0) {
          goToQuestion(currentQuestionIndex - 1);
        }
      },
    },
  });

  const goToQuestion = (index: number) => {
    setQuestionStartTime(Date.now());
    setCurrentQuestionIndex(index);
  };

  // Section 1 -> Section 2 transition
  const handleSectionTransition = () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
    }
    setActiveSection('section_2');
    setCurrentQuestionIndex(0);
    setSectionTimeRemaining(OFFICIAL_N2_SECTIONS.section_2.allocatedSeconds);
    setQuestionStartTime(Date.now());
  };

  // Final Exam Submission & Scoring
  const handleFinalSubmit = async () => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
    }
    setShowSubmitConfirmModal(false);

    const report = MockExamEngine.evaluateMockExam({
      section1Questions: examData.section1Questions,
      section2Questions: examData.section2Questions,
      answers,
      durationSeconds: totalElapsedSeconds,
      section1DurationSeconds: section1TimeSpent,
      section2DurationSeconds: section2TimeSpent,
    });

    setScoreReport(report);

    // Persist to DB
    await MockExamEngine.persistMockExamResult(report);

    if (onExamCompleted) {
      onExamCompleted(report);
    }
  };

  // Helper formats
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Unanswered count for current section
  const sectionAnsweredCount = useMemo(() => {
    return currentSectionQuestions.filter((q) => Boolean(answers[q.question.id]?.choice)).length;
  }, [currentSectionQuestions, answers]);

  const sectionFlaggedCount = useMemo(() => {
    return currentSectionQuestions.filter((q) => Boolean(answers[q.question.id]?.isFlagged)).length;
  }, [currentSectionQuestions, answers]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans select-none">
      {/* =========================================================================
          TOP FORMAL EXAM HEADER
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-2.5 shadow-sm flex items-center justify-between gap-2">
        {/* Left: Exam branding & Active Section Badge */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
            title="Quit Mock Exam"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider font-mono">
                JLPT N2 HONBAN MOCK
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 font-japanese font-semibold">
                {OFFICIAL_N2_SECTIONS[activeSection].titleJa}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              {activeSection === 'section_1'
                ? 'Section 1: Language Knowledge & Reading (105 min)'
                : 'Section 2: Listening Comprehension (50 min)'}
            </p>
          </div>
        </div>

        {/* Center: Live Timers */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          {/* Section Countdown */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-mono ${
              sectionTimeRemaining <= 300
                ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse'
                : sectionTimeRemaining <= 900
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-stone-500">
                Section Left
              </div>
              <div className="text-sm font-bold leading-none">
                {formatTime(sectionTimeRemaining)}
              </div>
            </div>
          </div>

          {/* Total Elapsed Timer */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-stone-500 font-mono">
            <span>Total Elapsed:</span>
            <span className="text-stone-800 font-semibold">{formatTime(totalElapsedSeconds)}</span>
          </div>
        </div>

        {/* Right: Actions (Navigator Drawer, Flag, Submit) */}
        <div className="flex items-center space-x-2">
          {/* Question Navigator Drawer Button */}
          <button
            onClick={() => setIsNavigatorOpen(!isNavigatorOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer shadow-xs ${
              isNavigatorOpen
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nav Grid</span>
            <span className="px-1.5 py-0.2 rounded bg-stone-100 text-[10px] font-mono text-stone-600">
              {currentQuestionIndex + 1}/{currentSectionQuestions.length}
            </span>
          </button>

          {/* Section 1 -> Section 2 or Finish Button */}
          {activeSection === 'section_1' ? (
            <button
              onClick={() => {
                if (sectionAnsweredCount < currentSectionQuestions.length) {
                  setShowSubmitConfirmModal(true);
                } else {
                  handleSectionTransition();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-xs transition cursor-pointer"
            >
              <span>Next: 聴解</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          QUESTION NAVIGATOR DRAWER (Collapsible top / side)
         ========================================================================= */}
      {isNavigatorOpen && (
        <div className="bg-white border-b border-stone-200 p-4 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center space-x-4">
                <span className="font-semibold text-stone-800">
                  {OFFICIAL_N2_SECTIONS[activeSection].titleJa} • Questions
                </span>
                <span className="flex items-center space-x-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Answered: {sectionAnsweredCount}</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-700">
                  <Flag className="w-3 h-3 text-amber-600" />
                  <span>Flagged: {sectionFlaggedCount}</span>
                </span>
                <span className="flex items-center space-x-1.5 text-stone-500">
                  <span className="w-2 h-2 rounded-full bg-stone-300" />
                  <span>Remaining: {currentSectionQuestions.length - sectionAnsweredCount}</span>
                </span>
              </div>
              <button
                onClick={() => setIsNavigatorOpen(false)}
                className="text-stone-500 hover:text-stone-800 text-xs cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {/* Grid of Question Badges */}
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5 pt-1">
              {currentSectionQuestions.map((qMeta, idx) => {
                const ans = answers[qMeta.question.id];
                const isAnswered = Boolean(ans?.choice);
                const isFlagged = Boolean(ans?.isFlagged);
                const isCurrent = idx === currentQuestionIndex;

                return (
                  <button
                    key={qMeta.question.id}
                    onClick={() => {
                      goToQuestion(idx);
                      setIsNavigatorOpen(false);
                    }}
                    className={`relative h-8 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-500 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold shadow-xs'
                        : isAnswered
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN TEST CONTENT AREA
         ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        {activeQuestionMeta ? (
          <div className="space-y-4">
            {/* Mondai Instruction Banner */}
            <div className="bg-white border border-stone-200 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-sm">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold font-japanese">
                    {activeQuestionMeta.mondaiTitleJa}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Question {currentQuestionIndex + 1} of {currentSectionQuestions.length} (Overall #
                    {activeQuestionMeta.index})
                  </span>
                </div>
                <p className="text-xs text-stone-700 font-japanese pt-0.5">
                  {activeQuestionMeta.mondaiInstructionJa}
                </p>
              </div>

              {/* Flag for Review toggle */}
              <button
                onClick={handleToggleFlag}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer shrink-0 shadow-xs ${
                  answers[activeQuestionMeta.question.id]?.isFlagged
                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
                title="Flag question for review later (Hotkey: F)"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {answers[activeQuestionMeta.question.id]?.isFlagged ? 'Flagged (見直す)' : 'Flag (後で見直す)'}
                </span>
              </button>
            </div>

            {/* -------------------------------------------------------------------
                BRANCH 1: DOKKAI READING SPLIT-PANE (When question has dokkaiPassageId)
               ------------------------------------------------------------------- */}
            {activeQuestionMeta.dokkaiPassageId && passageMap.get(activeQuestionMeta.dokkaiPassageId) ? (
              (() => {
                const passage = passageMap.get(activeQuestionMeta.dokkaiPassageId)!;
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Pane: Authentic Reading Editorial Passage */}
                    <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                      {/* Passage Controls Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <h3 className="text-sm font-bold text-stone-900 font-japanese">
                            {passage.titleJa || passage.title}
                          </h3>
                        </div>

                        {/* Furigana & Claims highlighter toggles */}
                        <div className="flex items-center space-x-2 text-[11px]">
                          <button
                            onClick={() =>
                              setDokkaiFuriganaMode((m) =>
                                m === 'off' ? 'adaptive' : m === 'adaptive' ? 'full' : 'off'
                              )
                            }
                            className="px-2 py-1 rounded bg-stone-100 text-stone-700 hover:text-stone-900 border border-stone-200 font-mono transition cursor-pointer"
                          >
                            Furigana: {dokkaiFuriganaMode.toUpperCase()}
                          </button>
                          <button
                            onClick={() => setDokkaiHighlightClaims((h) => !h)}
                            className={`px-2 py-1 rounded border font-mono transition cursor-pointer ${
                              dokkaiHighlightClaims
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-stone-100 border-stone-200 text-stone-600'
                            }`}
                          >
                            筆者の主張
                          </button>
                        </div>
                      </div>

                      {/* Passage Text Body */}
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 text-stone-800 leading-relaxed font-japanese text-sm sm:text-base">
                        {passage.paragraphs.map((p, pIdx) => {
                          const hasClaim = dokkaiHighlightClaims && p.sentences.some((s) => s.isAuthorClaim);
                          return (
                            <p
                              key={pIdx}
                              className={`p-2.5 rounded-lg transition ${
                                hasClaim
                                  ? 'bg-amber-50/80 border-l-2 border-amber-500 pl-3 text-stone-900 font-medium'
                                  : 'bg-transparent'
                              }`}
                            >
                              <span className="text-stone-400 font-mono text-xs mr-2 select-none">
                                ¶{pIdx + 1}
                              </span>
                              <span>{p.rawText}</span>
                            </p>
                          );
                        })}
                      </div>

                      <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-200 flex items-center justify-between">
                        <span>Characters: ~{passage.fullText.length} chars</span>
                        <span>Format: {passage.formatLabel}</span>
                      </div>
                    </div>

                    {/* Right Pane: Question & Choices */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                        <div className="text-sm font-bold text-stone-900 font-japanese leading-relaxed whitespace-pre-wrap">
                          {activeQuestionMeta.question.prompt}
                        </div>

                        {/* Choices List (1-4) */}
                        <div className="space-y-2.5 pt-2">
                          {activeQuestionMeta.question.choices?.map((choice, cIdx) => {
                            const isSelected =
                              answers[activeQuestionMeta.question.id]?.choice === choice;
                            return (
                              <button
                                key={cIdx}
                                onClick={() => handleSelectChoice(choice)}
                                className={`w-full text-left p-3.5 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                                  }`}
                                >
                                  {cIdx + 1}
                                </span>
                                <span className="text-xs sm:text-sm font-japanese leading-relaxed">
                                  {choice}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : activeQuestionMeta.choukaiScenarioId && scenarioMap.get(activeQuestionMeta.choukaiScenarioId) ? (
              /* -------------------------------------------------------------------
                  BRANCH 2: CHOUKAI LISTENING SCENARIO (Section 2)
                 ------------------------------------------------------------------- */
              (() => {
                const scenario = scenarioMap.get(activeQuestionMeta.choukaiScenarioId)!;
                return (
                  <div className="max-w-3xl mx-auto space-y-5">
                    {/* Audio Player Studio Bar */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                            <Headphones className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-600 font-mono uppercase">
                              Official Choukai Track • {scenario.typeLabel}
                            </span>
                            <h4 className="text-sm font-semibold text-stone-900 font-japanese">
                              場面: {scenario.situation}
                            </h4>
                          </div>
                        </div>

                        {/* Speed Pills */}
                        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                          {([0.75, 1.0, 1.25, 1.5] as ChoukaiSpeed[]).map((spd) => (
                            <button
                              key={spd}
                              onClick={() => handleChangeAudioSpeed(spd)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                                audioSpeed === spd
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Waveform & Play Controller */}
                      <div className="flex items-center space-x-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                        <button
                          onClick={handleToggleAudio}
                          className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer transition active:scale-95"
                          title={isAudioPlaying ? 'Pause Audio' : 'Play Scenario Dialogue'}
                        >
                          {isAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>

                        {/* Animated Waveform Bars */}
                        <div className="flex-1 flex items-center justify-center space-x-1 h-8">
                          {Array.from({ length: 32 }).map((_, wIdx) => {
                            const barHeight = isAudioPlaying
                              ? Math.max(15, Math.min(100, Math.sin(wIdx + audioWaveform * 10) * 80 + 30))
                              : 20;
                            return (
                              <div
                                key={wIdx}
                                className={`w-1 rounded-full transition-all duration-75 ${
                                  isAudioPlaying ? 'bg-indigo-600' : 'bg-stone-300'
                                }`}
                                style={{ height: `${barHeight}%` }}
                              />
                            );
                          })}
                        </div>

                        <span className="text-[11px] font-mono text-stone-500 shrink-0">
                          {isAudioPlaying ? 'Playing ja-JP...' : 'Tape Ready'}
                        </span>
                      </div>
                    </div>

                    {/* Question Prompt and Choices */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="text-sm sm:text-base font-bold text-stone-900 font-japanese leading-relaxed">
                        {activeQuestionMeta.question.prompt}
                      </div>

                      {/* 4 Choices */}
                      <div className="space-y-3 pt-2">
                        {activeQuestionMeta.question.choices?.map((choice, cIdx) => {
                          const isSelected =
                            answers[activeQuestionMeta.question.id]?.choice === choice;
                          return (
                            <button
                              key={cIdx}
                              onClick={() => handleSelectChoice(choice)}
                              className={`w-full text-left p-4 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                                  : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                              }`}
                            >
                              <span
                                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-stone-100 text-stone-600 border border-stone-200'
                                }`}
                              >
                                {cIdx + 1}
                              </span>
                              <span className="text-sm font-japanese leading-relaxed">{choice}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* -------------------------------------------------------------------
                  BRANCH 3: STANDARD LANGUAGE KNOWLEDGE (Kanji, Vocab, Grammar, Star)
                 ------------------------------------------------------------------- */
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
                  {/* Prompt Text with HTML <u> formatting */}
                  <div
                    className="text-base sm:text-lg font-bold text-stone-900 font-japanese leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: activeQuestionMeta.question.prompt.replace(/\n/g, '<br />'),
                    }}
                  />

                  {/* Scrambled parts for Mondai 8 (文の組み立て) */}
                  {activeQuestionMeta.starParts && (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                      <span className="text-[11px] text-stone-600 font-mono">
                        選択肢の部分（1〜4）を並べ替えて、★に入るものを選びなさい：
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {activeQuestionMeta.starParts.map((part, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-white border border-stone-200 p-2.5 rounded-lg text-xs font-japanese text-stone-800 flex items-center space-x-2 shadow-xs"
                          >
                            <span className="w-5 h-5 rounded bg-stone-100 text-stone-600 font-mono font-bold flex items-center justify-center text-[10px]">
                              {pIdx + 1}
                            </span>
                            <span>{part}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4 Choices */}
                  <div className="space-y-3 pt-2">
                    {activeQuestionMeta.question.choices?.map((choice, cIdx) => {
                      const isSelected =
                        answers[activeQuestionMeta.question.id]?.choice === choice;
                      return (
                        <button
                          key={cIdx}
                          onClick={() => handleSelectChoice(choice)}
                          className={`w-full text-left p-4 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                              : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            {cIdx + 1}
                          </span>
                          <span className="text-sm font-japanese leading-relaxed">{choice}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Bottom Pagination Bar */}
        <div className="pt-6 pb-2 flex items-center justify-between max-w-3xl mx-auto w-full">
          <button
            onClick={() => currentQuestionIndex > 0 && goToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>前の問題 (Prev)</span>
          </button>

          <span className="text-xs text-stone-500 font-mono">
            Keys 1-4 to select • F to flag • Arrows to navigate
          </span>

          <button
            onClick={() =>
              currentQuestionIndex < currentSectionQuestions.length - 1 &&
              goToQuestion(currentQuestionIndex + 1)
            }
            disabled={currentQuestionIndex === currentSectionQuestions.length - 1}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
          >
            <span>次の問題 (Next)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* =========================================================================
          SUBMIT CONFIRMATION MODAL
         ========================================================================= */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {activeSection === 'section_1' ? 'Proceed to Section 2 (聴解)?' : 'Submit Mock Exam?'}
                </h3>
                <p className="text-xs text-stone-600">
                  {activeSection === 'section_1'
                    ? 'You will not be able to return to Section 1 once Listening starts.'
                    : 'Your final score will be calculated and persisted.'}
                </p>
              </div>
            </div>

            {/* Answer tally stats */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-700">
                <span>Section Answered:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {sectionAnsweredCount} / {currentSectionQuestions.length}
                </span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Unanswered in this section:</span>
                <span className="font-mono font-bold text-rose-600">
                  {currentSectionQuestions.length - sectionAnsweredCount}
                </span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Flagged for Review:</span>
                <span className="font-mono font-bold text-amber-600">{sectionFlaggedCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium cursor-pointer shadow-xs"
              >
                Review Answers
              </button>

              {activeSection === 'section_1' ? (
                <button
                  onClick={() => {
                    setShowSubmitConfirmModal(false);
                    handleSectionTransition();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirm &amp; Start Listening
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirm Final Submission
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EXIT CONFIRMATION MODAL
         ========================================================================= */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-stone-900">Quit Honban Simulation?</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Exiting now will abandon the current official mock exam session. Your progress will not be logged.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium cursor-pointer shadow-xs"
              >
                Continue Exam
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Abandon Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMPREHENSIVE SCORECARD & PASS CERTIFICATE MODAL
         ========================================================================= */}
      {scoreReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Certificate Header Banner */}
            <div className="text-center space-y-2 pb-4 border-b border-stone-200">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-xs font-mono font-medium">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>OFFICIAL JLPT N2 EXAMINATION SCORECARD</span>
              </div>

              {/* Pass / Fail / Sectional Disqualification Outcome */}
              {scoreReport.passed ? (
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold text-emerald-600 tracking-tight font-japanese">
                    合 格 (PASS)
                  </h2>
                  <p className="text-xs text-emerald-700">
                    Congratulations! You have satisfied both the aggregate score and all sectional minimum benchmarks.
                  </p>
                </div>
              ) : scoreReport.isSectionalDisqualified ? (
                <div className="space-y-1 bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                  <h2 className="text-2xl font-extrabold text-amber-800 tracking-tight font-japanese">
                    不合格（基準点割れ・足切り）
                  </h2>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {scoreReport.disqualificationReason}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold text-rose-600 tracking-tight font-japanese">
                    不 合 格 (FAIL)
                  </h2>
                  <p className="text-xs text-rose-700">
                    Total score did not reach the 90/180 benchmark. Focus on remediation drills to bridge the deficit.
                  </p>
                </div>
              )}
            </div>

            {/* Official 180-Point Scaled Score Overview */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-500 font-mono">
                  Total Scaled Score
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-stone-900 font-mono">
                    {scoreReport.totalScaledScore}
                  </span>
                  <span className="text-sm text-stone-500 font-mono">/ 180 点</span>
                </div>
                <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                  Passing Threshold: 90点 • Grade: {scoreReport.grade}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-[10px] text-stone-500 uppercase font-mono">Raw Accuracy</div>
                  <div className="text-lg font-bold text-stone-800 font-mono">
                    {scoreReport.overallRawScore.pct}%
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    {scoreReport.overallRawScore.correct} of {scoreReport.overallRawScore.total}
                  </div>
                </div>

                <div className="text-right border-l border-stone-200 pl-4">
                  <div className="text-[10px] text-stone-500 uppercase font-mono">Duration</div>
                  <div className="text-lg font-bold text-stone-800 font-mono">
                    {formatTime(scoreReport.durationSeconds)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    Sec 1: {formatTime(scoreReport.section1DurationSeconds)} • Sec 2: {formatTime(scoreReport.section2DurationSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Sectional Breakdown Gauges (3 sections, 60 pts each, threshold 19 pts) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                Official Sectional Breakdown (Benchmark: ≥ 19 / 60 点)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Language Knowledge (Vocab & Grammar) */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-800 font-japanese">言語知識 (語彙・文法)</span>
                    <span
                      className={`font-mono font-bold ${
                        scoreReport.languageScaledScore >= 19 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scoreReport.languageScaledScore} / 60 点
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden relative">
                    {/* 19/60 point benchmark line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                      style={{ left: `${(19 / 60) * 100}%` }}
                      title="19-point minimum benchmark"
                    />
                    <div
                      className={`h-full rounded-full ${
                        scoreReport.languageScaledScore >= 19 ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${(scoreReport.languageScaledScore / 60) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>Benchmark: 19点</span>
                    <span>Raw: {scoreReport.languageRawScore.correct}/{scoreReport.languageRawScore.total}</span>
                  </div>
                </div>

                {/* 2. Reading Comprehension */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-800 font-japanese">読解 (Reading)</span>
                    <span
                      className={`font-mono font-bold ${
                        scoreReport.readingScaledScore >= 19 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scoreReport.readingScaledScore} / 60 点
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden relative">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                      style={{ left: `${(19 / 60) * 100}%` }}
                    />
                    <div
                      className={`h-full rounded-full ${
                        scoreReport.readingScaledScore >= 19 ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${(scoreReport.readingScaledScore / 60) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>Benchmark: 19点</span>
                    <span>Raw: {scoreReport.readingRawScore.correct}/{scoreReport.readingRawScore.total}</span>
                  </div>
                </div>

                {/* 3. Listening Comprehension */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-800 font-japanese">聴解 (Listening)</span>
                    <span
                      className={`font-mono font-bold ${
                        scoreReport.listeningScaledScore >= 19 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scoreReport.listeningScaledScore} / 60 点
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden relative">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                      style={{ left: `${(19 / 60) * 100}%` }}
                    />
                    <div
                      className={`h-full rounded-full ${
                        scoreReport.listeningScaledScore >= 19 ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${(scoreReport.listeningScaledScore / 60) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>Benchmark: 19点</span>
                    <span>Raw: {scoreReport.listeningRawScore.correct}/{scoreReport.listeningRawScore.total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Review Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider font-mono">
                  Detailed Answer Review ({scoreReport.missedQuestionIds.length} missed)
                </h4>

                {/* Filter chips */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <button
                    onClick={() => setReviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-mono transition cursor-pointer ${
                      reviewFilter === 'all'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All ({scoreReport.answers.length})
                  </button>
                  <button
                    onClick={() => setReviewFilter('missed')}
                    className={`px-2.5 py-1 rounded-lg font-mono transition cursor-pointer ${
                      reviewFilter === 'missed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Missed Only ({scoreReport.missedQuestionIds.length})
                  </button>
                </div>
              </div>

              {/* Scrollable list of questions */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {scoreReport.answers
                  .filter((a) => {
                    if (reviewFilter === 'missed') return !a.isCorrect;
                    if (reviewFilter === 'flagged') return a.isFlaggedForReview;
                    return true;
                  })
                  .map((ans, idx) => {
                    const allQ = [...examData.section1Questions, ...examData.section2Questions];
                    const qMeta = allQ.find((q) => q.question.id === ans.questionId);
                    if (!qMeta) return null;

                    return (
                      <div
                        key={ans.questionId}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          ans.isCorrect
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-japanese font-semibold text-stone-900">
                            #{qMeta.index} · {qMeta.mondaiTitleJa}
                          </span>
                          <span
                            className={`font-mono font-bold flex items-center space-x-1 ${
                              ans.isCorrect ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {ans.isCorrect ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>အဖြေမှန် (Correct)</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" />
                                <span>အဖြေမှား (Incorrect)</span>
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-stone-700 font-japanese line-clamp-2">
                          {qMeta.question.prompt.replace(/<[^>]+>/g, '')}
                        </p>

                        <div className="text-[11px] flex items-center space-x-3 text-stone-500 pt-1 border-t border-stone-200">
                          <span>
                            Your choice: <strong>{ans.selectedChoice || '(Unanswered)'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            အဖြေမှန် (Correct): <strong>{qMeta.question.answer}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bottom Actions: Remediation Drill CTA & Exit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200">
              {scoreReport.missedQuestionIds.length > 0 && onLaunchRemediationDrill ? (
                <button
                  onClick={() => onLaunchRemediationDrill(scoreReport.missedQuestionIds)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-white" />
                  <span>Generate Remediation Drill ({scoreReport.missedQuestionIds.length} Missed Items)</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={onExit}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Return to Assessment Battery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
