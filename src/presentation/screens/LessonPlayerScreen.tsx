import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Headphones,
  Award,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import {
  LessonPack,
  Question,
  QuestionSkill,
  MasteryRecord,
  SRSCard,
  UserProfile,
} from '../../domain/models/types';
import { FuriganaRuby } from '../components/FuriganaRuby';
import { useAudioPlayer, cleanJapanesePrompt, parseDialogueTranscript } from '../hooks/useAudioPlayer';
import { checkAnswer, deriveSRSRating } from '../../domain/assessment/answer-checker';
import { AssessmentSession, ShuffledOption } from '../../domain/assessment/shuffler';
import { MasteryEngine, TestAttemptScore } from '../../domain/mastery/mastery-engine';
import { RemediationEngine } from '../../domain/remediation/remediation-engine';
import { SystemClock } from '../../domain/common/clock';
import { EventRepository } from '../../data/repositories/event-repository';
import { db } from '../../data/db/dexie-db';

interface LessonPlayerScreenProps {
  pack: LessonPack;
  profile: UserProfile;
  masteryRecord?: MasteryRecord;
  onMasteryUpdated: (record: MasteryRecord) => void;
  onExit: () => void;
  onLessonCompleted?: (lessonId: string) => void | Promise<void>;
  onBlockProgress?: (minutes: number) => void;
  onTestActiveChange?: (active: boolean) => void;
}

const STAGE_NAMES = [
  'Introduction & Goals',
  'Vocabulary Study',
  'Kanji in Context',
  'Grammar Patterns',
  'Example Sentences',
  'Guided Practice',
  'Active Recall',
  'Reading Passage',
  'Listening Comprehension',
  'Shadowing Practice',
  'Mastery Questions',
  'SRS Card Creation',
  'Mastery Test',
  'Remediation',
  'Progress Update',
];

export const LessonPlayerScreen: React.FC<LessonPlayerScreenProps> = ({
  pack,
  profile,
  masteryRecord,
  onMasteryUpdated,
  onExit,
  onLessonCompleted,
  onBlockProgress,
  onTestActiveChange,
}) => {
  const [currentStage, setCurrentStage] = useState<number>(1);
  const { play, stop, isPlaying, currentPlayingText, playbackRate, setPlaybackRate, replayCount } = useAudioPlayer();
  const clock = useRef(new SystemClock()).current;
  const masteryEngine = useRef(new MasteryEngine(clock)).current;

  useEffect(() => {
    if (onTestActiveChange) {
      onTestActiveChange(currentStage === 13);
    }
    return () => {
      if (onTestActiveChange) {
        onTestActiveChange(false);
      }
    };
  }, [currentStage, onTestActiveChange]);

  useEffect(() => {
    if (currentStage === 15 && onLessonCompleted) {
      onLessonCompleted(pack.id);
    }
  }, [currentStage, pack.id, onLessonCompleted]);

  // Active exercises state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [userTypedInput, setUserTypedInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<ShuffledOption | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [assessmentSession, setAssessmentSession] = useState(() => new AssessmentSession());

  // Test Attempt Aggregator
  const [testScores, setTestScores] = useState<Record<QuestionSkill, { correct: number; total: number }>>({
    vocab: { correct: 0, total: 0 },
    kanji: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
  });
  const [testFailedItemIds, setTestFailedItemIds] = useState<string[]>([]);
  const [testIncorrectQuestions, setTestIncorrectQuestions] = useState<
    Array<{ prompt: string; answer: string; explanation?: string }>
  >([]);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  // Listening state: transcript hidden until answered
  const [hasAnsweredListening, setHasAnsweredListening] = useState(false);

  // Vocabulary view index
  const [vocabIndex, setVocabIndex] = useState(0);

  // Reset exercise state when stage changes
  useEffect(() => {
    setExerciseIndex(0);
    setUserTypedInput('');
    setSelectedOption(null);
    setUsedHint(false);
    setFeedback(null);
    setQuestionStartTime(Date.now());
    setAssessmentSession(new AssessmentSession());
    setTestIncorrectQuestions([]);
    EventRepository.record('stage_completed', { stage: currentStage }, pack.id, currentStage);
  }, [currentStage, pack.id]);

  // Keyboard shortcut listener (1-4 for choices, Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a text field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && !feedback) {
          handleCheckAnswer();
        }
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key) && !feedback) {
        const choiceIdx = parseInt(e.key, 10) - 1;
        const currentQ = getCurrentQuestion();
        if (currentQ?.choices && currentQ.choices.length > 0) {
          const opts = assessmentSession.getOptions(currentQ);
          if (opts[choiceIdx]) {
            setSelectedOption(opts[choiceIdx]);
          }
        }
      }

      if (e.key === 'Enter') {
        if (feedback) {
          handleNextQuestion();
        } else if (selectedOption || userTypedInput.trim()) {
          handleCheckAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const getCurrentQuestion = (): Question | null => {
    if (currentStage === 6) {
      // Guided practice (first 6 questions)
      return pack.questions[exerciseIndex % 6] || null;
    }
    if (currentStage === 7) {
      // Active recall (typed questions)
      const typed = pack.questions.filter((q) => q.type === 'typed_recall');
      if (typed.length === 0) {
        const vocabPool = pack.questions.filter((q) => q.skill === 'vocab');
        const pool = vocabPool.length > 0 ? vocabPool : pack.questions;
        return pool[exerciseIndex % pool.length] || null;
      }
      return typed[exerciseIndex % typed.length] || null;
    }
    if (currentStage === 8) {
      // Reading questions
      const readingQs = pack.questions.filter((q) => pack.reading.questionIds.includes(q.id));
      return readingQs[exerciseIndex % readingQs.length] || null;
    }
    if (currentStage === 9) {
      // Listening questions
      const listeningQs = pack.questions.filter((q) => pack.listening.questionIds.includes(q.id));
      return listeningQs[exerciseIndex % listeningQs.length] || null;
    }
    if (currentStage === 11) {
      // Mastery questions
      return pack.questions[exerciseIndex % pack.questions.length] || null;
    }
    if (currentStage === 13) {
      // Lesson test
      return pack.questions[exerciseIndex % pack.questions.length] || null;
    }
    return null;
  };

  const handleCheckAnswer = async () => {
    const q = getCurrentQuestion();
    if (!q || feedback) return;

    const isMultipleChoice = Boolean(q.choices && q.choices.length > 0);
    if (isMultipleChoice && !selectedOption) return;

    let isCorrect = false;
    if (isMultipleChoice && selectedOption) {
      isCorrect = assessmentSession.checkOption(selectedOption, q.answer);
    } else {
      const checkResult = checkAnswer(userTypedInput, q.answer, q.acceptedAnswers || []);
      isCorrect = checkResult.isCorrect;
    }

    const elapsedMs = Date.now() - questionStartTime;

    const srsRating = deriveSRSRating({
      isCorrect,
      usedHint,
      elapsedMs,
      medianResponseMs: 4000,
      isTypedRecall: q.type === 'typed_recall',
    });

    setFeedback({
      isCorrect,
      explanation: q.explanation,
    });

    if (currentStage === 9) {
      setHasAnsweredListening(true);
    }

    // Record attempt event
    await EventRepository.record('exercise_attempted', {
      questionId: q.id,
      skill: q.skill,
      isCorrect,
      usedHint,
      elapsedMs,
      srsRating,
    }, pack.id, currentStage);

    // Track for Lesson Test (Stage 13)
    if (currentStage === 13) {
      setTestScores((prev) => ({
        ...prev,
        [q.skill]: {
          correct: prev[q.skill].correct + (isCorrect ? 1 : 0),
          total: prev[q.skill].total + 1,
        },
      }));

      if (!isCorrect) {
        setTestFailedItemIds((prev) => [...prev, ...q.linkedItemIds]);
        setTestIncorrectQuestions((prev) => [
          ...prev,
          { prompt: q.prompt, answer: q.answer, explanation: q.explanation },
        ]);
        await scheduleFailedItemIntoSRS(q);
      }
    }
  };

  const scheduleFailedItemIntoSRS = async (q: Question) => {
    for (const itemId of q.linkedItemIds) {
      const cardId = `${itemId}:recall`;
      const existing: SRSCard | undefined = await db.srs_cards.get(cardId);
      const nowIso = clock.nowIso();
      const currentLapses = existing ? existing.lapses : 0;
      const newLapses = currentLapses + 1;

      const card: SRSCard = existing
        ? {
            ...existing,
            lapses: newLapses,
            isLeech: newLapses >= 8,
            due: nowIso,
            state: 'learning',
            intervalDays: 0.007,
          }
        : {
            id: cardId,
            itemId,
            lessonId: pack.id,
            itemType: q.skill === 'kanji' ? 'kanji' : q.skill === 'grammar' ? 'grammar' : 'vocab',
            facet: 'recall',
            prompt: q.prompt,
            meaning: q.answer,
            state: 'learning',
            intervalDays: 0.007,
            repetition: 0,
            stability: 2,
            difficulty: 5,
            lapses: newLapses,
            isLeech: newLapses >= 8,
            due: nowIso,
          };

      await db.srs_cards.put(card);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setSelectedOption(null);
    setUserTypedInput('');
    setUsedHint(false);
    setQuestionStartTime(Date.now());

    const testTotal = pack.questions.length <= 32 ? pack.questions.length : 32;
    if (currentStage === 6 && exerciseIndex >= 5) {
      setCurrentStage(7);
    } else if (currentStage === 7 && exerciseIndex >= 4) {
      setCurrentStage(8);
    } else if (currentStage === 8 && exerciseIndex >= 4) {
      setCurrentStage(9);
    } else if (currentStage === 9 && exerciseIndex >= 4) {
      setCurrentStage(10);
    } else if (currentStage === 11 && exerciseIndex >= 9) {
      setCurrentStage(12);
    } else if (currentStage === 13 && exerciseIndex >= testTotal - 1) {
      evaluateCompletedTest();
    } else {
      setExerciseIndex((prev) => prev + 1);
    }
  };

  const evaluateCompletedTest = async () => {
    const attemptScore: TestAttemptScore = {
      bySkill: testScores,
      failedItemIds: testFailedItemIds,
    };

    const currentRec = masteryRecord || {
      lessonId: pack.id,
      state: 'learning',
      scores: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0, overall: 0 },
      evidenceCounts: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0 },
      passedThresholds: false,
      failedSkills: [],
      consecutiveFailures: 0,
      isProvisional: false,
      needsRefresh: false,
      history: [],
    };

    const result = masteryEngine.processTestAttempt(currentRec, attemptScore);
    setLastTestResult(result);
    onMasteryUpdated(result.updatedRecord);
    await db.mastery_records.put(result.updatedRecord);

    if (!result.passed) {
      const remediationEngine = new RemediationEngine(clock);
      const plan = remediationEngine.generateRemediationPlan(
        pack,
        testFailedItemIds,
        result.updatedRecord.failedSkills,
        `attempt_${Date.now()}`
      );
      await db.remediations.add(plan);
    }

    setCurrentStage(14);
  };

  const generateLessonCards = async () => {
    for (const v of pack.vocabularies) {
      await db.srs_cards.put({
        id: `${v.id}:recog`,
        itemId: v.id,
        lessonId: pack.id,
        itemType: 'vocab',
        facet: 'recog',
        prompt: v.ja,
        reading: v.kana,
        meaning: v.en,
        audio: v.audio,
        state: 'new',
        intervalDays: 0,
        repetition: 0,
        stability: 2,
        difficulty: 5,
        lapses: 0,
        isLeech: false,
        due: clock.nowIso(),
      });
      await db.srs_cards.put({
        id: `${v.id}:recall`,
        itemId: v.id,
        lessonId: pack.id,
        itemType: 'vocab',
        facet: 'recall',
        prompt: v.en,
        meaning: v.ja,
        reading: v.kana,
        state: 'new',
        intervalDays: 0,
        repetition: 0,
        stability: 2,
        difficulty: 5,
        lapses: 0,
        isLeech: false,
        due: clock.nowIso(),
      });
    }

    for (const k of pack.kanjis) {
      await db.srs_cards.put({
        id: `${k.id}:meaning`,
        itemId: k.id,
        lessonId: pack.id,
        itemType: 'kanji',
        facet: 'meaning',
        prompt: k.char,
        meaning: k.meaning,
        reading: k.onyomi.join(', '),
        state: 'new',
        intervalDays: 0,
        repetition: 0,
        stability: 2,
        difficulty: 5,
        lapses: 0,
        isLeech: false,
        due: clock.nowIso(),
      });
    }

    setCurrentStage(13);
  };

  const progressPct = ((currentStage - 1) / (STAGE_NAMES.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 px-3 sm:px-4">
      {/* Stage Progress Bar & Navigation Header */}
      <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <button
            onClick={async () => {
              if (currentStage === 15 && onLessonCompleted) {
                await onLessonCompleted(pack.id);
              }
              onExit();
            }}
            className="flex items-center space-x-1.5 hover:text-stone-200 transition py-1 px-2.5 -ml-2 rounded-xl hover:bg-stone-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">Exit</span>
          </button>

          <div className="flex items-center space-x-2 text-center">
            <span className="font-semibold text-rose-400 font-mono text-xs sm:text-sm">
              Stage {currentStage}/15:
            </span>
            <span className="text-stone-200 font-medium text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
              {STAGE_NAMES[currentStage - 1]}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.max(1, p - 1))}
              disabled={currentStage === 1}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition"
              title="Previous stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.min(15, p + 1))}
              disabled={currentStage === 15}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition"
              title="Next stage"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* 15 Stage Steps Grid */}
        <div className="w-full bg-stone-950 p-1.5 rounded-2xl border border-stone-800/80">
          <div className="grid grid-cols-15 gap-1 w-full">
            {STAGE_NAMES.map((name, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStage;
              const isCurrent = stepNum === currentStage;
              return (
                <button
                  key={stepNum}
                  onClick={() => setCurrentStage(stepNum)}
                  className={`h-2.5 rounded-full transition-all focus:outline-none ${
                    isCurrent
                      ? 'bg-rose-500 ring-2 ring-rose-400/50 shadow-sm shadow-rose-500/50'
                      : isCompleted
                      ? 'bg-emerald-500/90'
                      : 'bg-stone-800 hover:bg-stone-700'
                  }`}
                  title={`Stage ${stepNum}: ${name}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* STAGE CONTAINER WITH ANIMATED TRANSITIONS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* STAGE 1: INTRODUCTION & CAN-DO GOALS */}
          {currentStage === 1 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-900/60 inline-block">
                  Stage 1 • Can-Do Goals
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
                  {pack.title}
                </h2>
                <p className="text-sm text-stone-400 leading-relaxed">{pack.description}</p>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-inner">
                <h3 className="text-sm font-semibold text-stone-200 flex items-center">
                  <Award className="w-4 h-4 mr-2 text-rose-400" /> Lesson Objectives
                </h3>
                <ul className="space-y-2.5 text-xs text-stone-300">
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Master core vocabulary and active contextual application.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Recognize foundational Kanji in whole-word combinations.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Understand grammar patterns with explicit formations and pitfalls.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Complete reading, listening, active recall, and official conjunctive test.</span>
                  </li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(2)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40"
              >
                <span>Begin Vocabulary Study</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 2: VOCABULARY */}
          {currentStage === 2 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                    Stage 2 • Core Vocabulary
                  </span>
                  <h2 className="text-xl font-bold text-stone-100">
                    Item {vocabIndex + 1} of {pack.vocabularies.length}
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-stone-400">Speed:</span>
                  <button
                    onClick={() => setPlaybackRate(playbackRate === 1.0 ? 0.75 : 1.0)}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-xs font-mono hover:bg-stone-700 transition"
                  >
                    {playbackRate}x
                  </button>
                </div>
              </div>

              {/* Vocabulary Card */}
              {(() => {
                const v = pack.vocabularies[vocabIndex];
                return (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="bg-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-inner"
                    >
                      <div className="flex justify-center py-2">
                        <FuriganaRuby
                          kanji={v.ja}
                          kana={v.kana}
                          showRomaji={profile.showRomaji}
                          className="text-4xl sm:text-5xl font-bold font-japanese"
                        />
                      </div>

                      <div className="flex items-center justify-center space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isPlaying && currentPlayingText === v.ja) {
                              stop();
                            } else {
                              play(v.ja, v.audio);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl ${
                            isPlaying && currentPlayingText === v.ja
                              ? 'bg-rose-600 text-white shadow-rose-950/50 ring-2 ring-rose-500/40 animate-pulse'
                              : 'bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300'
                          } text-xs font-medium flex items-center space-x-2 transition shadow`}
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{isPlaying && currentPlayingText === v.ja ? 'Playing...' : 'Listen'}</span>
                        </motion.button>
                        {replayCount[v.ja] && (
                          <span className="text-[11px] text-stone-500 font-mono">
                            Played: {replayCount[v.ja]}x
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-800/80 space-y-1.5">
                        <p className="text-xl font-bold text-stone-100">{v.en}</p>
                        {v.my && (
                          <p className="text-sm text-stone-400 font-myanmar">{v.my}</p>
                        )}
                        <span className="inline-block text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                          Part of Speech: {v.pos}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                );
              })()}

              {/* Navigation between words */}
              <div className="flex items-center justify-between pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVocabIndex((p) => Math.max(0, p - 1))}
                  disabled={vocabIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 text-xs font-medium transition"
                >
                  Previous Word
                </motion.button>
                {vocabIndex < pack.vocabularies.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setVocabIndex((p) => p + 1)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-md shadow-rose-950/30"
                  >
                    Next Word ({vocabIndex + 1}/{pack.vocabularies.length})
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentStage(3)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-950/30"
                  >
                    Proceed to Kanji →
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: KANJI IN CONTEXT */}
          {currentStage === 3 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  Stage 3 • Kanji In Context First
                </span>
                <h2 className="text-xl font-bold text-stone-100">Foundational Kanji</h2>
                <p className="text-xs text-stone-400">
                  Kanji is taught in whole-word combinations, never as isolated abstract symbols.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pack.kanjis.map((k) => (
                  <motion.div
                    key={k.id}
                    whileHover={{ y: -3 }}
                    className="bg-stone-950 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 space-y-3.5 transition shadow"
                  >
                    <div className="text-center">
                      <div className="text-5xl font-bold font-japanese text-rose-300 mb-1">
                        {k.char}
                      </div>
                      <div className="text-sm font-semibold text-stone-200">{k.meaning}</div>
                      <div className="text-[11px] text-stone-400 font-mono">Strokes: {k.strokes}</div>
                    </div>

                    <div className="border-t border-stone-800/80 pt-2.5 text-xs space-y-1">
                      <div>
                        <span className="text-stone-500">Onyomi: </span>
                        <span className="font-japanese text-stone-300">{k.onyomi.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Kunyomi: </span>
                        <span className="font-japanese text-stone-300">{k.kunyomi.join(', ')}</span>
                      </div>
                    </div>

                    <div className="border-t border-stone-800/80 pt-2.5 space-y-1.5">
                      <span className="text-[10px] text-stone-500 uppercase font-semibold">
                        Vocabulary Context:
                      </span>
                      {k.exampleVocab.map((ev, i) => (
                        <div
                          key={i}
                          className="text-xs flex justify-between items-baseline bg-stone-900/60 px-2.5 py-1.5 rounded-lg border border-stone-800/60"
                        >
                          <span className="font-japanese text-stone-200 font-medium">{ev.word}</span>
                          <span className="text-stone-400 text-[11px]">{ev.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(4)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40"
              >
                <span>Proceed to Grammar Patterns</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 4: GRAMMAR */}
          {currentStage === 4 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  Stage 4 • Grammar Formations
                </span>
                <h2 className="text-xl font-bold text-stone-100">Core Patterns</h2>
              </div>

              <div className="space-y-4">
                {pack.grammars.map((g) => (
                  <div
                    key={g.id}
                    className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-inner"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold font-japanese text-rose-300">{g.pattern}</h3>
                      <span className="text-xs text-stone-400">{g.meaning}</span>
                    </div>

                    <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 text-xs font-mono text-stone-300">
                      <span className="text-stone-500">Formation: </span>
                      {g.formation}
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">{g.explanation.en}</p>
                    {g.explanation.my && (
                      <p className="text-xs text-stone-400 font-myanmar leading-relaxed">
                        {g.explanation.my}
                      </p>
                    )}

                    {g.commonMistakes.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-300 space-y-1">
                        <span className="font-semibold block text-amber-200">Common Pitfall:</span>
                        {g.commonMistakes.map((m, idx) => (
                          <p key={idx} className="text-amber-300/90">• {m}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(5)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40"
              >
                <span>Proceed to Example Sentences</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 5: EXAMPLE SENTENCES */}
          {currentStage === 5 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  Stage 5 • Context Sentences
                </span>
                <h2 className="text-xl font-bold text-stone-100">Sentences in Action</h2>
              </div>

              <div className="space-y-3">
                {pack.sentences.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.005 }}
                    className="bg-stone-950 border border-stone-800 hover:border-stone-700 rounded-2xl p-4 flex items-center justify-between gap-4 transition shadow"
                  >
                    <div className="space-y-1">
                      <div className="text-base font-japanese font-medium text-stone-100">{s.ja}</div>
                      <div className="text-xs text-stone-400">{s.translation.en}</div>
                      {s.translation.my && (
                        <div className="text-[11px] text-stone-500 font-myanmar">{s.translation.my}</div>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        if (isPlaying && currentPlayingText === s.ja) {
                          stop();
                        } else {
                          play(s.ja, s.audio);
                        }
                      }}
                      className={`p-3 rounded-xl transition shrink-0 ${
                        isPlaying && currentPlayingText === s.ja
                          ? 'bg-rose-600 text-white ring-2 ring-rose-500/50 shadow-md animate-pulse'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                      }`}
                      aria-label="Play sentence audio"
                    >
                      <Volume2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(6)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40"
              >
                <span>Start Guided Practice</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGES 6, 7, 8, 9, 11, 13: EXERCISE RUNNER */}
          {[6, 7, 8, 9, 11, 13].includes(currentStage) && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold block">
                    {currentStage === 6 && 'Stage 6 • Guided Practice (Hints Allowed)'}
                    {currentStage === 7 && 'Stage 7 • Active Recall (No-Choice Production)'}
                    {currentStage === 8 && 'Stage 8 • Reading Comprehension'}
                    {currentStage === 9 && 'Stage 9 • Listening Comprehension'}
                    {currentStage === 11 && 'Stage 11 • Mastery Questions'}
                    {currentStage === 13 && 'Stage 13 • Official Lesson Test (Timed • No Hints)'}
                  </span>
                  <h2 className="text-base font-bold text-stone-100 mt-0.5">
                    Question {exerciseIndex + 1}
                  </h2>
                </div>
                {currentStage === 13 && (
                  <span className="text-xs font-mono text-rose-300 bg-rose-950 border border-rose-800/80 px-3 py-1 rounded-full font-semibold">
                    Test Mode
                  </span>
                )}
              </div>

              {/* Reading passage display if Stage 8 */}
              {currentStage === 8 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 text-stone-200 font-japanese text-sm leading-relaxed mb-4 shadow-inner">
                  <span className="text-[10px] text-stone-500 uppercase font-mono block mb-1.5 font-sans">
                    Reading Passage: {pack.reading.title}
                  </span>
                  {pack.reading.text}
                </div>
              )}

              {/* Listening audio control if Stage 9 */}
              {currentStage === 9 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center space-y-3 mb-4 shadow-inner">
                  <span className="text-[10px] text-stone-500 uppercase font-mono block">
                    Dialogue: {pack.listening.title}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (isPlaying && currentPlayingText === pack.listening.transcript) {
                        stop();
                      } else {
                        play(pack.listening.transcript, pack.listening.audio);
                      }
                    }}
                    className={`px-6 py-3 rounded-2xl text-white text-xs font-semibold inline-flex items-center space-x-2 transition shadow-lg ${
                      isPlaying && currentPlayingText === pack.listening.transcript
                        ? 'bg-rose-500 ring-4 ring-rose-500/30 shadow-rose-950/60 animate-pulse'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>
                      {isPlaying && currentPlayingText === pack.listening.transcript
                        ? 'Playing Dialogue...'
                        : 'Play Dialogue Audio'}
                    </span>
                  </motion.button>
                  {hasAnsweredListening && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-3 border-t border-stone-800 text-left text-xs font-japanese text-stone-300 whitespace-pre-line bg-stone-900/60 p-4 rounded-xl"
                    >
                      <span className="text-[10px] text-stone-500 uppercase font-mono block mb-1 font-sans">
                        Transcript (Revealed):
                      </span>
                      {pack.listening.transcript}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Question Box */}
              {(() => {
                const q = getCurrentQuestion();
                if (!q) {
                  return (
                    <div className="text-center py-8 space-y-3">
                      <p className="text-stone-400 text-xs">Stage complete — no further questions.</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextQuestion}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                      >
                        Proceed to Next Stage →
                      </motion.button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="text-base font-semibold text-stone-100 flex items-start justify-between">
                      <span className="leading-snug">{q.prompt}</span>
                      {q.audio && (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            // Extract audio prompt: check if prompt has Japanese, or if an explanation/answer/dialogue line is linked
                            const hasJaInPrompt = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q.prompt);
                            const targetText = hasJaInPrompt
                              ? q.prompt
                              : (q.explanation && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(q.explanation)
                                  ? q.explanation
                                  : (q.choices?.find((c) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(c)) || q.prompt));

                            if (isPlaying && currentPlayingText === targetText) {
                              stop();
                            } else {
                              play(targetText, q.audio);
                            }
                          }}
                          className={`p-2 rounded-xl transition ml-3 shrink-0 ${
                            isPlaying && (currentPlayingText === q.prompt || (q.explanation && currentPlayingText === q.explanation))
                              ? 'bg-rose-600 text-white ring-2 ring-rose-500/50 shadow-md animate-pulse'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          }`}
                          title="Play question audio"
                        >
                          <Volume2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>

                    {/* Multiple choice options */}
                    {q.choices && q.choices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {assessmentSession.getOptions(q).map((opt, i) => {
                          const isSelected = selectedOption?.id === opt.id;
                          return (
                            <motion.button
                              key={opt.id}
                              whileHover={!feedback ? { scale: 1.015, x: 2 } : {}}
                              whileTap={!feedback ? { scale: 0.98 } : {}}
                              onClick={() => !feedback && setSelectedOption(opt)}
                              disabled={Boolean(feedback)}
                              className={`p-3.5 rounded-2xl border text-left text-xs font-medium transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950/30'
                                  : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                              }`}
                            >
                              <span className="flex items-center">
                                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-[10px] flex items-center justify-center mr-2.5 font-mono">
                                  {i + 1}
                                </span>
                                <span className="font-japanese text-sm">{opt.text}</span>
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Typed Recall input with romaji -> kana assistance */
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={userTypedInput}
                          onChange={(e) => setUserTypedInput(e.target.value)}
                          placeholder="Type in Japanese (romaji will auto-convert to kana)..."
                          disabled={Boolean(feedback)}
                          autoFocus
                          className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-4 py-3.5 text-sm text-stone-100 font-japanese focus:outline-none focus:border-rose-500 shadow-inner"
                        />
                        <span className="text-[10px] text-stone-500 block">
                          Tip: You can type romaji directly (e.g. &quot;watashi&quot; becomes &quot;わたし&quot;).
                        </span>
                      </div>
                    )}

                    {/* Hint option if guided practice */}
                    {currentStage === 6 && !usedHint && !feedback && (
                      <button
                        onClick={() => setUsedHint(true)}
                        className="text-xs text-stone-400 hover:text-stone-300 flex items-center space-x-1.5 transition"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Show hint (reduces credit)</span>
                      </button>
                    )}
                    {usedHint && q.hint && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-amber-300/90 bg-amber-950/40 p-3 rounded-xl border border-amber-900/50"
                      >
                        Hint: {q.hint || q.explanation}
                      </motion.div>
                    )}

                    {/* Feedback Panel */}
                    <AnimatePresence>
                      {feedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-2xl border space-y-1.5 text-xs ${
                            feedback.isCorrect
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200 shadow-md shadow-emerald-950/20'
                              : 'bg-rose-950/60 border-rose-800 text-rose-200 shadow-md shadow-rose-950/20'
                          }`}
                        >
                          <div className="font-bold flex items-center space-x-2 text-sm">
                            {feedback.isCorrect ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Correct!</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-rose-400" />
                                <span>Incorrect (Answer: {q.answer})</span>
                              </>
                            )}
                          </div>
                          <p className="leading-relaxed">{feedback.explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit / Next Button */}
                    <div className="pt-2">
                      {!feedback ? (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCheckAnswer}
                          disabled={q.choices && q.choices.length > 0 ? !selectedOption : !userTypedInput.trim()}
                          className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-rose-950/30"
                        >
                          Check Answer (Enter)
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextQuestion}
                          className="w-full py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs tracking-wide transition shadow-lg"
                        >
                          Next Question →
                        </motion.button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STAGE 10: SHADOWING PRACTICE */}
          {currentStage === 10 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  Stage 10 • Shadowing Practice
                </span>
                <h2 className="text-xl font-bold text-stone-100">Listen, Repeat, &amp; Self-Rate</h2>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Listen to native Japanese intonation and repeat each phrase immediately after hearing it. Note: Self-assessment only — no automated pronunciation claim.
                </p>
              </div>

              <div className="space-y-3">
                {(() => {
                  const turns = pack.listening.turns && pack.listening.turns.length > 0
                    ? pack.listening.turns
                    : parseDialogueTranscript(pack.listening.transcript).map((t) => ({
                        speaker: t.speaker || 'Narrator',
                        ja: t.text,
                        kana: t.text,
                        en: 'Spoken dialogue line',
                        audio: pack.listening.audio,
                      }));

                  return turns.map((turn, i) => {
                    const isCurrentTurnPlaying = isPlaying && currentPlayingText === turn.ja;
                    const spkLower = (turn.speaker || '').toLowerCase();
                    const isKen = turn.speaker.includes('ケン') || spkLower.includes('ken');
                    const isSensei = turn.speaker.includes('先生') || spkLower.includes('tanaka') || spkLower.includes('sensei');

                    return (
                      <div
                        key={i}
                        className={`bg-stone-950 border ${
                          isCurrentTurnPlaying ? 'border-rose-600/70 shadow-rose-950/40 ring-1 ring-rose-500/30' : 'border-stone-800'
                        } rounded-2xl p-4 space-y-2 shadow-inner transition-colors duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              isSensei
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : isKen
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-900/60'
                            }`}>
                              {turn.speaker}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {isSensei ? 'Low Pitch' : isKen ? 'High Pitch' : 'Native TTS'}
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (isCurrentTurnPlaying) {
                                stop();
                              } else {
                                play(turn.ja, turn.audio, turn.speaker);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition ${
                              isCurrentTurnPlaying
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{isCurrentTurnPlaying ? 'Playing' : 'Play'}</span>
                          </motion.button>
                        </div>
                        <div className="text-sm font-japanese font-medium text-stone-100">{turn.ja}</div>
                        <div className="text-xs text-stone-400">{turn.en}</div>
                      </div>
                    );
                  });
                })()}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(11)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40"
              >
                <span>Proceed to Mastery Questions</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 12: SRS CARD CREATION */}
          {currentStage === 12 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-rose-950/80 border border-rose-700 mx-auto flex items-center justify-center text-rose-300 shadow-lg shadow-rose-950/50"
              >
                <Layers className="w-10 h-10" />
              </motion.div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold px-3 py-1 rounded-full bg-rose-950/60 border border-rose-900/60 inline-block">
                  Stage 12 • SRS Engine Integration
                </span>
                <h2 className="text-2xl font-bold text-stone-100 tracking-tight">
                  Generate Multi-Facet SRS Cards
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  Every vocabulary item and kanji will be indexed into independent SRS cards (recognition, typed recall, and reading) for long-term retention.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateLessonCards}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm transition shadow-lg shadow-rose-950/40 inline-flex items-center space-x-2"
              >
                <span>Create SRS Cards &amp; Enter Lesson Test</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 14: REMEDIATION / OUTCOME */}
          {currentStage === 14 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg ${
                    lastTestResult?.passed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 shadow-emerald-950/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-600/80 shadow-amber-950/40'
                  }`}
                >
                  <Award className="w-10 h-10" />
                </motion.div>

                <h2 className="text-2xl font-bold text-stone-100 tracking-tight">
                  {lastTestResult?.passed ? `${pack.title} Mastered!` : 'Test Complete — Review Weak Areas'}
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  {lastTestResult?.summary}
                </p>
              </div>

              {/* Score breakdown across all 5 skills */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2.5 shadow-inner">
                <span className="text-xs uppercase font-semibold text-stone-400 block mb-2 font-mono">
                  Conjunctive Skill Breakdown
                </span>
                {(['vocab', 'kanji', 'grammar', 'reading', 'listening'] as QuestionSkill[]).map((skill) => {
                  const data = testScores[skill];
                  const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  const threshold = skill === 'vocab' ? 90 : skill === 'reading' || skill === 'listening' ? 80 : 85;
                  const passed = pct >= threshold;

                  return (
                    <div
                      key={skill}
                      className="flex items-center justify-between text-xs py-2 border-b border-stone-900 last:border-0"
                    >
                      <span className="capitalize text-stone-300 font-medium">{skill}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-stone-400 font-mono text-xs">
                          {data.correct}/{data.total} ({pct}%)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {passed ? 'PASS' : `FAIL (< ${threshold}%)`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Review of incorrect test questions */}
              {testIncorrectQuestions.length > 0 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3 text-left shadow-inner">
                  <span className="text-xs uppercase font-semibold text-rose-400 block font-mono">
                    Questions to Review ({testIncorrectQuestions.length})
                  </span>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {testIncorrectQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="border-b border-stone-900 pb-2.5 last:border-0 text-xs space-y-1"
                      >
                        <p className="text-stone-200 font-medium font-japanese">{q.prompt}</p>
                        <p className="text-rose-400 text-[11px]">Correct Answer: {q.answer}</p>
                        {q.explanation && (
                          <p className="text-stone-400 text-[10px]">{q.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {!lastTestResult?.passed && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setTestScores({
                        vocab: { correct: 0, total: 0 },
                        kanji: { correct: 0, total: 0 },
                        grammar: { correct: 0, total: 0 },
                        reading: { correct: 0, total: 0 },
                        listening: { correct: 0, total: 0 },
                      });
                      setTestFailedItemIds([]);
                      setTestIncorrectQuestions([]);
                      setExerciseIndex(0);
                      setAssessmentSession(new AssessmentSession());
                      setCurrentStage(13);
                    }}
                    className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs tracking-wide transition shadow"
                  >
                    🔄 Retest with Fresh Question Draw
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStage(15)}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wide transition shadow"
                >
                  View Stage 15 Progress Summary →
                </motion.button>
              </div>
            </div>
          )}

          {/* STAGE 15: PROGRESS UPDATE */}
          {currentStage === 15 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-950/90 border border-emerald-600 mx-auto flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40"
              >
                <Check className="w-10 h-10" />
              </motion.div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold px-3 py-1 rounded-full bg-rose-950/60 border border-rose-900/60 inline-block">
                  Stage 15 • Progress Committed
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
                  All 15 Stages Completed
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  Your test evidence, SRS cards, and event history have been securely saved to IndexedDB.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (onLessonCompleted) {
                      await onLessonCompleted(pack.id);
                    }
                    onExit();
                  }}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-rose-950/40 cursor-pointer"
                >
                  Complete &amp; Return to Dashboard
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
