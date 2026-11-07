import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { DokkaiReaderWorkbench } from '../components/DokkaiReaderWorkbench';
import { ShadowingPracticeScreen } from '../components/ShadowingPracticeScreen';
import { N5ReferenceWorkbench } from '../components/N5ReferenceWorkbench';
import {
  N5_COMMON_MISTAKES_CATALOG,
  N5CommonMistake,
} from '../../domain/curriculum/n5-common-mistakes-catalog';
import {
  convertLessonReadingToDokkai,
  CURATED_DOKKAI_CATALOG,
} from '../../domain/assessment/dokkai-catalog';
import { useGlobalShortcuts, useScopedShortcuts } from '../context/GlobalShortcutContext';

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
  'မိတ်ဆက်နှင့် ရည်မှန်းချက် (Goals)',
  'ဝေါဟာရ လေ့လာခြင်း (Vocabulary)',
  'အကြောင်းအရာနှင့် ကန်ဂျီ (Kanji)',
  'သဒ္ဒါပုံစံများ (Grammar)',
  'နမူနာဝါကျများ (Sentences)',
  'လမ်းညွှန် လေ့ကျင့်ခန်း (Guided Practice)',
  'အလွတ်ပြန်လည်မှတ်မိခြင်း (Active Recall)',
  'စာဖတ်စွမ်းရည် လေ့ကျင့်ခန်း (Reading)',
  'နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Listening)',
  'လိုက်ဆိုလေ့ကျင့်ခြင်း (Shadowing)',
  'ကျွမ်းကျင်မှု စစ်ဆေးမေးခွန်းများ (Mastery Questions)',
  'SRS ကတ်များ ထုတ်ယူခြင်း (SRS Cards)',
  'ကျွမ်းကျင်မှု စာမေးပွဲ (Mastery Test)',
  'အားနည်းချက် ပြန်လည်ကုစားခြင်း (Remediation)',
  'တိုးတက်မှု အခြေအနေ (Progress Update)',
];

function getMatchingMistakes(pack: LessonPack): N5CommonMistake[] {
  if (pack.level !== 'N5') return [];
  const textCorpus = [
    pack.title,
    pack.module,
    ...pack.grammars.map((g) => `${g.pattern} ${g.formation} ${g.meaning} ${g.meaningMy || ''} ${g.explanation.en} ${g.explanation.my || ''} ${g.commonMistakes.join(' ')}`),
    ...pack.questions.map((q) => `${q.prompt} ${q.choices?.join(' ') || ''}`),
  ].join(' ').toLowerCase();

  const matched = N5_COMMON_MISTAKES_CATALOG.filter((m) => {
    if (m.category === 'i_adjective' && (textCorpus.includes('い') || textCorpus.includes('寒') || textCorpus.includes('adjective') || textCorpus.includes('かった') || textCorpus.includes('でした'))) {
      return true;
    }
    if (m.category === 'na_adjective' && (textCorpus.includes('きれい') || textCorpus.includes('好き') || textCorpus.includes('綺麗') || textCorpus.includes('な-adj'))) {
      return true;
    }
    if (m.category === 'verb_state' && (textCorpus.includes('知っ') || textCorpus.includes('しって') || textCorpus.includes('てい'))) {
      return true;
    }
    if (m.category === 'wear_verb' && (textCorpus.includes('着る') || textCorpus.includes('かぶる') || textCorpus.includes('帽子') || textCorpus.includes('服'))) {
      return true;
    }
    if (m.category === 'particle_reciprocal' && (textCorpus.includes('結婚') || textCorpus.includes('と') || textCorpus.includes('particle'))) {
      return true;
    }
    if (m.category === 'particle_motion' && (textCorpus.includes('道') || textCorpus.includes('行く') || textCorpus.includes('ကို') || textCorpus.includes('သို့'))) {
      return true;
    }
    if (m.category === 'irregular_verb' && (textCorpus.includes('来る') || textCorpus.includes('くる') || textCorpus.includes('こない') || textCorpus.includes('きない'))) {
      return true;
    }
    if (m.category === 'manner_particle' && (textCorpus.includes('歩い') || textCorpus.includes('で') || textCorpus.includes('manner'))) {
      return true;
    }
    return false;
  });

  return matched.length > 0 ? matched : [N5_COMMON_MISTAKES_CATALOG[0]];
}

function getMatchingMistakeForQuestion(q?: Question): N5CommonMistake | null {
  if (!q) return null;
  const qText = `${q.prompt} ${q.choices?.join(' ') || ''} ${q.explanation || ''}`.toLowerCase();
  for (const m of N5_COMMON_MISTAKES_CATALOG) {
    if (
      qText.includes(m.incorrect.replace('× ', '').toLowerCase()) ||
      qText.includes(m.correct.replace('○ ', '').toLowerCase()) ||
      (m.category === 'i_adjective' && (qText.includes('寒い') || qText.includes('かった') || qText.includes('でした'))) ||
      (m.category === 'na_adjective' && (qText.includes('きれい') || qText.includes('好き'))) ||
      (m.category === 'verb_state' && qText.includes('知っ')) ||
      (m.category === 'wear_verb' && (qText.includes('帽子') || qText.includes('かぶる') || qText.includes('着る'))) ||
      (m.category === 'particle_reciprocal' && qText.includes('結婚')) ||
      (m.category === 'particle_motion' && (qText.includes('道') || qText.includes('橋'))) ||
      (m.category === 'irregular_verb' && (qText.includes('来ない') || qText.includes('くる'))) ||
      (m.category === 'manner_particle' && qText.includes('歩いて'))
    ) {
      return m;
    }
  }
  return null;
}

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
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [referenceTab, setReferenceTab] = useState<'counters' | 'expressions' | 'mistakes'>('counters');
  const {
    play,
    stop,
    isPlaying,
    currentPlayingText,
    playbackRate,
    setPlaybackRate,
    replayCount,
    isShadowingLoop,
    shadowingTurnDelay,
    setShadowingTurnDelay,
    activeTurnIndex,
    startShadowingLoop,
    stopShadowingLoop,
  } = useAudioPlayer();
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
    Array<{ prompt: string; answer: string; explanation?: string; promptMy?: string; questionMy?: string; explanationMy?: string }>
  >([]);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  // Listening state: transcript hidden until answered
  const [hasAnsweredListening, setHasAnsweredListening] = useState(false);

  // Vocabulary view index
  const [vocabIndex, setVocabIndex] = useState(0);
  const [isKanjiDrawerOpen, setIsKanjiDrawerOpen] = useState(false);

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
          {
            prompt: q.prompt,
            promptMy: (q as any).promptMy || (q as any).questionMy,
            questionMy: (q as any).questionMy,
            answer: q.answer,
            explanation: q.explanation,
            explanationMy: (q as any).explanationMy,
          },
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
            prompt: q.promptMy || q.prompt,
            promptMy: q.promptMy,
            meaning: q.answer,
            meaningMyanmar: q.explanationMy,
            meaningMy: q.explanationMy,
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
      const vBurmese = v.meaningMyanmar || v.my || v.meaningMy || v.en;
      await db.srs_cards.put({
        id: `${v.id}:recog`,
        itemId: v.id,
        lessonId: pack.id,
        itemType: 'vocab',
        facet: 'recog',
        prompt: v.ja,
        reading: v.kana,
        meaning: vBurmese,
        meaningMyanmar: vBurmese,
        meaningMy: vBurmese,
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
        prompt: vBurmese,
        promptMy: vBurmese,
        meaning: v.ja,
        reading: v.kana,
        meaningMyanmar: vBurmese,
        meaningMy: vBurmese,
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
      const kBurmese = k.meaningMyanmar || k.meaningMy || k.meaning;
      await db.srs_cards.put({
        id: `${k.id}:meaning`,
        itemId: k.id,
        lessonId: pack.id,
        itemType: 'kanji',
        facet: 'meaning',
        prompt: k.char,
        meaning: kBurmese,
        meaningMyanmar: kBurmese,
        meaningMy: kBurmese,
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

  const handlePlayAudio = useCallback(() => {
    if (currentStage === 2) {
      const v = pack.vocabularies[vocabIndex];
      if (v) {
        if (isPlaying && currentPlayingText === v.ja) {
          stop();
        } else {
          play(v.ja, v.audio);
        }
      }
    } else if (currentStage === 5) {
      const s = pack.sentences[0];
      if (s) {
        if (isPlaying && currentPlayingText === s.ja) {
          stop();
        } else {
          play(s.ja, s.audio);
        }
      }
    } else if (currentStage === 9) {
      if (isPlaying && currentPlayingText === pack.listening.transcript) {
        stop();
      } else {
        play(pack.listening.transcript, pack.listening.audio);
      }
    } else if ([6, 7, 11, 13].includes(currentStage)) {
      const q = getCurrentQuestion();
      if (q) {
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
      }
    }
  }, [currentStage, pack, vocabIndex, isPlaying, currentPlayingText, play, stop, exerciseIndex]);

  const handleNextCard = useCallback(() => {
    if (currentStage === 1) {
      setCurrentStage(2);
    } else if (currentStage === 2) {
      if (vocabIndex < pack.vocabularies.length - 1) {
        setVocabIndex((p) => p + 1);
      } else {
        setCurrentStage(3);
      }
    } else if (currentStage === 3) {
      setCurrentStage(4);
    } else if (currentStage === 4) {
      setCurrentStage(5);
    } else if (currentStage === 5) {
      setCurrentStage(6);
    } else if ([6, 7, 9, 11, 13].includes(currentStage)) {
      if (feedback) {
        handleNextQuestion();
      } else if (selectedOption || userTypedInput.trim()) {
        handleCheckAnswer();
      }
    } else if (currentStage === 8) {
      setCurrentStage(9);
      setExerciseIndex(0);
    } else if (currentStage === 10) {
      setCurrentStage(11);
    } else if (currentStage === 12) {
      generateLessonCards();
    } else if (currentStage === 14) {
      setCurrentStage(15);
    } else if (currentStage === 15) {
      if (onLessonCompleted) {
        onLessonCompleted(pack.id);
      }
      onExit();
    }
  }, [
    currentStage,
    vocabIndex,
    pack.vocabularies.length,
    pack.id,
    feedback,
    selectedOption,
    userTypedInput,
    handleCheckAnswer,
    handleNextQuestion,
    generateLessonCards,
    onLessonCompleted,
    onExit,
  ]);

  const handlePrevCard = useCallback(() => {
    if (currentStage === 2) {
      if (vocabIndex > 0) {
        setVocabIndex((p) => p - 1);
      } else {
        setCurrentStage(1);
      }
    } else if (currentStage > 1 && currentStage <= 15) {
      setCurrentStage((p) => Math.max(1, p - 1));
      setExerciseIndex(0);
    }
  }, [currentStage, vocabIndex]);

  const { getDisplayBadge } = useGlobalShortcuts();

  const handleSelectChoiceByIndex = useCallback(
    (choiceIdx: number) => {
      if (feedback || ![6, 7, 9, 11, 13].includes(currentStage)) return;
      const currentQ = getCurrentQuestion();
      if (currentQ?.choices && currentQ.choices.length > 0) {
        const opts = assessmentSession.getOptions(currentQ);
        if (opts[choiceIdx]) {
          setSelectedOption(opts[choiceIdx]);
        }
      }
    },
    [feedback, currentStage, exerciseIndex, pack, assessmentSession]
  );

  // Scoped keyboard shortcut listener via centralized GlobalShortcutContext
  useScopedShortcuts({
    scopeId: 'lesson_player',
    handlers: {
      PLAY_AUDIO: () => {
        handlePlayAudio();
      },
      NEXT_ITEM: () => {
        handleNextCard();
      },
      PREV_ITEM: () => {
        handlePrevCard();
      },
      SUBMIT_ANSWER: () => {
        handleNextCard();
      },
      SELECT_CHOICE_1: () => handleSelectChoiceByIndex(0),
      SELECT_CHOICE_2: () => handleSelectChoiceByIndex(1),
      SELECT_CHOICE_3: () => handleSelectChoiceByIndex(2),
      SELECT_CHOICE_4: () => handleSelectChoiceByIndex(3),
      TOGGLE_HINT: () => {
        if (currentStage === 6 && !usedHint && !feedback) {
          setUsedHint(true);
        }
      },
    },
    priority: 10,
    allowInInputs: true,
    enabled: currentStage !== 8 && currentStage !== 10 && !isKanjiDrawerOpen,
  });

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
            <span className="font-medium">ထွက်မည် (Exit)</span>
          </button>

          <div className="flex items-center space-x-2 text-center">
            <span className="font-semibold text-rose-400 font-mono text-xs sm:text-sm">
              အဆင့် {currentStage}/၁၅:
            </span>
            <span className="text-stone-200 font-medium text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
              {STAGE_NAMES[currentStage - 1]}
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setReferenceTab('counters');
                setIsReferenceOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 text-amber-300 text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
              title="Open N5 Reference Workbench (Counters, Expressions & Common Traps)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-mono">N5 Ref</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.max(1, p - 1))}
              disabled={currentStage === 1}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition cursor-pointer"
              title="Previous stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.min(15, p + 1))}
              disabled={currentStage === 15}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 transition cursor-pointer"
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
                  အဆင့် ၁ • ရည်မှန်းချက်များ (Can-Do Goals)
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
                  {pack.titleMyanmar || (pack as any).titleMy || pack.title}
                </h2>
                <p className="text-sm text-stone-400 leading-relaxed font-myanmar">{pack.descriptionMy || pack.description}</p>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-inner">
                <h3 className="text-sm font-semibold text-stone-200 flex items-center">
                  <Award className="w-4 h-4 mr-2 text-rose-400" /> သင်ခန်းစာ ရည်မှန်းချက်များ
                </h3>
                <ul className="space-y-2.5 text-xs text-stone-300">
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>အဓိက ဝေါဟာရများနှင့် လက်တွေ့အသုံးအနှုန်းများကို ကျွမ်းကျင်စွာ တတ်မြောက်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>အခြေခံ ကန်ဂျီစာလုံးများကို စကားလုံးတွဲများနှင့် အတူတကွ မှတ်မိနားလည်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>သဒ္ဒါပုံစံများ၏ တည်ဆောက်ပုံနှင့် သတိပြုရမည့် အချက်များကို ရှင်းလင်းစွာ သဘောပေါက်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>စာဖတ်ခြင်း၊ နားထောင်ခြင်း၊ အလွတ်မှတ်မိခြင်းနှင့် စာမေးပွဲတို့ကို အောင်မြင်စွာ ဖြေဆိုနိုင်စေရန်။</span>
                  </li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(2)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <span>ဝေါဟာရ စတင်လေ့လာမည်</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800/80 border border-rose-400/40 font-mono text-rose-100">
                  Enter ↵
                </kbd>
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
                    အဆင့် ၂ • အဓိက ဝေါဟာရများ (Vocabulary)
                  </span>
                  <h2 className="text-xl font-bold text-stone-100 font-mono">
                    ဝေါဟာရ {vocabIndex + 1} / {pack.vocabularies.length}
                  </h2>
                </div>
                <div className="flex items-center space-x-1.5 bg-stone-900 px-2.5 py-1 rounded-xl border border-stone-800">
                  <span className="text-xs text-stone-400 font-myanmar mr-1">အမြန်နှုန်း:</span>
                  {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackRate(spd)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                        playbackRate === spd
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-stone-850 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
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
                          } text-xs font-medium flex items-center space-x-2 transition shadow cursor-pointer`}
                          title="အသံနားထောင်မည် [Space / R]"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{isPlaying && currentPlayingText === v.ja ? 'ဖွင့်နေသည်...' : 'နားထောင်မည်'}</span>
                          <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-rose-700/60 font-mono text-rose-200">
                            {getDisplayBadge('PLAY_AUDIO')}
                          </kbd>
                        </motion.button>
                        {replayCount[v.ja] && (
                          <span className="text-[11px] text-stone-500 font-mono">
                            ဖွင့်ပြီး: {replayCount[v.ja]} ကြိမ်
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-800/80 space-y-1.5">
                        <p className="text-xl font-bold text-stone-100 font-myanmar">
                          {v.meaningMyanmar || v.my || v.meaningMy || v.en}
                        </p>
                        {v.en && (v.meaningMyanmar || v.my) && (
                          <p className="text-xs text-stone-400">{v.en}</p>
                        )}
                        <span className="inline-block text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                          စကားပြောအပိုင်း: {v.pos}
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
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  title="ရှေ့ဝေါဟာရ [←]"
                >
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 font-mono text-stone-400">
                    {getDisplayBadge('PREV_ITEM')}
                  </kbd>
                  <span>ရှေ့ဝေါဟာရ</span>
                </motion.button>
                {vocabIndex < pack.vocabularies.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setVocabIndex((p) => p + 1)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-md shadow-rose-950/30 cursor-pointer flex items-center gap-2"
                    title={`နောက်ဝေါဟာရ [${getDisplayBadge('NEXT_ITEM')}]`}
                  >
                    <span>နောက်ဝေါဟာရ ({vocabIndex + 1}/{pack.vocabularies.length})</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800 border border-rose-400/40 font-mono text-rose-100">
                      {getDisplayBadge('NEXT_ITEM')}
                    </kbd>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentStage(3)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-950/30 cursor-pointer flex items-center gap-2"
                    title={`ကန်ဂျီသို့ ဆက်သွားမည် [${getDisplayBadge('NEXT_ITEM')}]`}
                  >
                    <span>ကန်ဂျီသို့ ဆက်သွားမည် →</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800 border border-emerald-400/40 font-mono text-emerald-100">
                      {getDisplayBadge('NEXT_ITEM')}
                    </kbd>
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
                  အဆင့် ၃ • အကြောင်းအရာနှင့် ကန်ဂျီ (Kanji)
                </span>
                <h2 className="text-xl font-bold text-stone-100">အခြေခံ ကန်ဂျီစာလုံးများ</h2>
                <p className="text-xs text-stone-400">
                  ကန်ဂျီကို သီးသန့်မဟုတ်ဘဲ စကားလုံးတွဲများနှင့် အတူတကွ လက်တွေ့လေ့လာပါမည်။
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
                      <div className="text-sm font-semibold text-stone-200 font-myanmar">
                        {k.meaningMyanmar || k.meaningMy || k.meaning}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">ဆွဲချက်: {k.strokes} ချက်</div>
                    </div>

                    <div className="border-t border-stone-800/80 pt-2.5 text-xs space-y-1">
                      <div>
                        <span className="text-stone-500">အွန်းယောမိ (Onyomi): </span>
                        <span className="font-japanese text-stone-300">{k.onyomi.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">ကွန်းယောမိ (Kunyomi): </span>
                        <span className="font-japanese text-stone-300">{k.kunyomi.join(', ')}</span>
                      </div>
                    </div>

                    <div className="border-t border-stone-800/80 pt-2.5 space-y-1.5">
                      <span className="text-[10px] text-stone-500 uppercase font-semibold">
                        စကားလုံးတွဲ အသုံးအနှုန်းများ:
                      </span>
                      {k.exampleVocab.map((ev, i) => (
                        <div
                          key={i}
                          className="text-xs flex justify-between items-baseline bg-stone-900/60 px-2.5 py-1.5 rounded-lg border border-stone-800/60"
                        >
                          <span className="font-japanese text-stone-200 font-medium">{ev.word}</span>
                          <span className="text-stone-400 text-[11px] font-myanmar">
                            {ev.meaningMyanmar || ev.meaningMy || ev.meaning}
                          </span>
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <span>သဒ္ဒါပုံစံများသို့ ဆက်သွားမည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800/80 border border-rose-400/40 font-mono text-rose-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 4: GRAMMAR */}
          {currentStage === 4 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  အဆင့် ၄ • သဒ္ဒါပုံစံများ (Grammar)
                </span>
                <h2 className="text-xl font-bold text-stone-100">အဓိက သဒ္ဒါပုံစံများ</h2>
              </div>

              <div className="space-y-4">
                {pack.grammars.map((g) => (
                  <div
                    key={g.id}
                    className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3.5 shadow-inner"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold font-japanese text-rose-300">{g.pattern}</h3>
                      <span className="text-xs text-stone-400 font-myanmar">
                        {g.meaningMyanmar || g.meaningMy || g.meaning}
                      </span>
                    </div>

                    <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 text-xs font-mono text-stone-300">
                      <span className="text-stone-500">ဝါကျတည်ဆောက်ပုံ: </span>
                      {g.formation}
                    </div>

                    <p className="text-xs text-stone-300 font-myanmar leading-relaxed">
                      {g.explanation.my || g.explanationMy || g.explanation.en}
                    </p>
                    {g.nuanceExplanationMy && (
                      <p className="text-xs text-amber-300 font-myanmar leading-relaxed mt-1">
                        {g.nuanceExplanationMy}
                      </p>
                    )}

                    {g.commonMistakes.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-3 text-xs text-amber-300 space-y-1">
                        <span className="font-semibold block text-amber-200">အမှားဖြစ်လေ့ရှိသော အချက်:</span>
                        {g.commonMistakes.map((m, idx) => (
                          <p key={idx} className="text-amber-300/90">• {m}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Matching Learner Trap Callout Card for Lesson Grammars */}
              {(() => {
                const matchingTraps = getMatchingMistakes(pack);
                if (matchingTraps.length === 0) return null;
                return (
                  <div className="bg-amber-950/20 border border-amber-600/40 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs font-myanmar">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>⚠️ သတိပြုရန် (Common Learner Trap / 言わない!)</span>
                      </div>
                      <button
                        onClick={() => {
                          setReferenceTab('mistakes');
                          setIsReferenceOpen(true);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-200 underline font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <span>All Traps</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {matchingTraps.slice(0, 2).map((m) => (
                        <div key={m.id} className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold font-japanese text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40 line-through">
                              {m.incorrect}
                            </span>
                            <span className="text-xs font-bold font-japanese text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              {m.correct}
                            </span>
                          </div>
                          <p className="text-xs text-stone-200 font-myanmar leading-relaxed">
                            {m.warningBurmese}
                          </p>
                          <p className="text-[11px] text-stone-400 font-myanmar leading-relaxed">
                            {m.detailedExplanationMy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(5)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <span>နမူနာဝါကျများသို့ ဆက်သွားမည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800/80 border border-rose-400/40 font-mono text-rose-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 5: EXAMPLE SENTENCES */}
          {currentStage === 5 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold">
                  အဆင့် ၅ • နမူနာဝါကျများ (Sentences)
                </span>
                <h2 className="text-xl font-bold text-stone-100">ဝါကျတွင်း လက်တွေ့အသုံးများ</h2>
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
                      <div className="text-xs text-stone-300 font-myanmar">
                        {s.translation.my || s.translationMy || s.translation.en}
                      </div>
                      {s.translation.en && (s.translation.my || s.translationMy) && (
                        <div className="text-[11px] text-stone-500">{s.translation.en}</div>
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <span>လမ်းညွှန်လေ့ကျင့်ခန်း စတင်မည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800/80 border border-rose-400/40 font-mono text-rose-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 8: INTERACTIVE DOKKAI (READING COMPREHENSION) WORKBENCH */}
          {currentStage === 8 && (
            <div className="space-y-4">
              <DokkaiReaderWorkbench
                passage={convertLessonReadingToDokkai(pack)}
                availablePassages={[convertLessonReadingToDokkai(pack), ...CURATED_DOKKAI_CATALOG]}
                embeddedMode={true}
                onComplete={({ accuracy }) => {
                  setTestScores((prev) => ({
                    ...prev,
                    reading: {
                      correct: prev.reading.correct + (accuracy >= 80 ? 4 : accuracy >= 60 ? 3 : 2),
                      total: prev.reading.total + 4,
                    },
                  }));
                  setCurrentStage(9);
                  setExerciseIndex(0);
                }}
              />
              <div className="flex justify-between items-center px-1">
                <button
                  onClick={() => {
                    setCurrentStage(7);
                    setExerciseIndex(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>အဆင့် ၇: အလွတ်ပြန်လည်မှတ်မိခြင်း (Active Recall)</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentStage(9);
                    setExerciseIndex(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <span>အဆင့် ၉: နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Listening) →</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGES 6, 7, 9, 11, 13: EXERCISE RUNNER */}
          {[6, 7, 9, 11, 13].includes(currentStage) && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold block">
                    {currentStage === 6 && 'အဆင့် ၆ • လမ်းညွှန် လေ့ကျင့်ခန်း (Guided Practice)'}
                    {currentStage === 7 && 'အဆင့် ၇ • အလွတ်ပြန်လည်မှတ်မိခြင်း (Active Recall)'}
                    {currentStage === 9 && 'အဆင့် ၉ • နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Listening Comprehension)'}
                    {currentStage === 11 && 'အဆင့် ၁၁ • ကျွမ်းကျင်မှု စစ်ဆေးမေးခွန်းများ (Mastery Questions)'}
                    {currentStage === 13 && 'အဆင့် ၁၃ • တရားဝင် သင်ခန်းစာ စာမေးပွဲ (Mastery Test • အချိန်ကန့်သတ်)'}
                  </span>
                  <h2 className="text-base font-bold text-stone-100 mt-0.5">
                    မေးခွန်း {exerciseIndex + 1}
                  </h2>
                </div>
                {currentStage === 13 && (
                  <span className="text-xs font-mono text-rose-300 bg-rose-950 border border-rose-800/80 px-3 py-1 rounded-full font-semibold">
                    စာမေးပွဲ စနစ် (Test Mode)
                  </span>
                )}
              </div>

              {/* Listening audio control if Stage 9 */}
              {currentStage === 9 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 text-center space-y-3 mb-4 shadow-inner">
                  <span className="text-[10px] text-stone-500 uppercase font-mono block">
                    စကားပြောခန်း: {pack.listening.titleMy || pack.listening.title}
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
                    className={`px-6 py-3 rounded-2xl text-white text-xs font-semibold inline-flex items-center space-x-2 transition shadow-lg cursor-pointer ${
                      isPlaying && currentPlayingText === pack.listening.transcript
                        ? 'bg-rose-500 ring-4 ring-rose-500/30 shadow-rose-950/60 animate-pulse'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    }`}
                    title="စကားပြောအသံ ဖွင့်မည် [Space]"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>
                      {isPlaying && currentPlayingText === pack.listening.transcript
                        ? 'စကားပြောအသံ ဖွင့်နေသည်...'
                        : 'စကားပြောအသံ ဖွင့်မည်'}
                    </span>
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-rose-400/40 font-mono text-white">
                      Space
                    </kbd>
                  </motion.button>
                  {hasAnsweredListening && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-3 border-t border-stone-800 text-left text-xs font-japanese text-stone-300 whitespace-pre-line bg-stone-900/60 p-4 rounded-xl"
                    >
                      <span className="text-[10px] text-stone-500 uppercase font-mono block mb-1 font-sans">
                        စကားပြောစာသား (ဖွင့်ပြထားသည်):
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
                      <p className="text-stone-400 text-xs">အဆင့်ပြီးဆုံးပါပြီ — နောက်ထပ်မေးခွန်း မရှိတော့ပါ။</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextQuestion}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        နောက်တစ်ဆင့်သို့ ဆက်သွားမည် →
                      </motion.button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="text-base font-semibold text-stone-100 flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="leading-snug font-myanmar block">
                          {q.promptMy || q.questionMy || q.prompt}
                        </span>
                        {q.promptMy && q.prompt !== q.promptMy && (
                          <span className="text-xs text-stone-400 font-japanese block">
                            {q.prompt}
                          </span>
                        )}
                      </div>
                      {q.audio && (
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
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
                          className={`p-2 rounded-xl transition ml-3 shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            isPlaying && (currentPlayingText === q.prompt || (q.explanation && currentPlayingText === q.explanation))
                              ? 'bg-rose-600 text-white ring-2 ring-rose-500/50 shadow-md animate-pulse'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                          }`}
                          title="Play question audio [Space]"
                        >
                          <Volume2 className="w-4 h-4" />
                          <kbd className="text-[10px] px-1 rounded bg-stone-900 border border-stone-700 font-mono text-stone-400">
                            {getDisplayBadge('PLAY_AUDIO')}
                          </kbd>
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
                              className={`p-3.5 rounded-2xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950/30'
                                  : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                              }`}
                            >
                              <span className="flex items-center">
                                <kbd className="w-5 h-5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 text-[10px] flex items-center justify-center mr-2.5 font-mono shadow-xs">
                                  {i + 1}
                                </kbd>
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
                          placeholder="ဂျပန်ဘာသာဖြင့် ရိုက်ထည့်ပါ (Romaji ရိုက်လျှင် Kana သို့ ပြောင်းလဲပေးပါမည်)..."
                          disabled={Boolean(feedback)}
                          autoFocus
                          className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-4 py-3.5 text-sm text-stone-100 font-japanese focus:outline-none focus:border-rose-500 shadow-inner"
                        />
                        <span className="text-[10px] text-stone-500 block font-myanmar">
                          အကြံပြုချက်: Romaji တိုက်ရိုက်ရိုက်နိုင်ပါသည် (ဥပမာ &quot;watashi&quot; -&gt; &quot;わたし&quot;)။
                        </span>
                      </div>
                    )}

                    {/* Hint option if guided practice */}
                    {currentStage === 6 && !usedHint && !feedback && (
                      <button
                        onClick={() => setUsedHint(true)}
                        className="text-xs text-stone-400 hover:text-stone-300 flex items-center space-x-1.5 transition cursor-pointer font-myanmar"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>အရိပ်အမြွက် ကြည့်မည် (အမှတ်လျော့နိုင်ပါသည်)</span>
                      </button>
                    )}
                    {usedHint && (q.hintMy || q.hint || q.explanationMy) && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-amber-300/90 bg-amber-950/40 p-3 rounded-xl border border-amber-900/50 font-myanmar"
                      >
                        {q.hintMy || (q.hint ? `အရိပ်အမြွက်: ${q.hint}` : q.explanationMy || q.explanation)}
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
                          <div className="font-bold flex items-center space-x-2 text-sm font-myanmar">
                            {feedback.isCorrect ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>အဖြေမှန် (Correct!)</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-rose-400" />
                                <span>အဖြေမှား (အဖြေမှန်: {q.answer})</span>
                              </>
                            )}
                          </div>
                          <p className="leading-relaxed font-myanmar">
                            {q.explanationMy || feedback.explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Matching Learner Trap Warning Card (言わない!) */}
                    {(() => {
                      const matchingTrap = getMatchingMistakeForQuestion(q);
                      if (!matchingTrap) return null;
                      return (
                        <div className="bg-amber-950/30 border border-amber-600/40 rounded-2xl p-3.5 space-y-1.5 text-xs font-myanmar">
                          <div className="flex items-center justify-between text-amber-300 font-bold">
                            <span className="flex items-center space-x-1.5">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>⚠️ သတိပြုရန် (Common Learner Trap / 言わない!)</span>
                            </span>
                            <button
                              onClick={() => {
                                setReferenceTab('mistakes');
                                setIsReferenceOpen(true);
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-200 underline font-mono flex items-center space-x-0.5 cursor-pointer"
                            >
                              <span>Rule</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-stone-200 font-medium">
                            {matchingTrap.warningBurmese}
                          </div>
                          <p className="text-[11px] text-stone-400 leading-relaxed">
                            {matchingTrap.detailedExplanationMy}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Submit / Next Button */}
                    <div className="pt-2">
                      {!feedback ? (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCheckAnswer}
                          disabled={q.choices && q.choices.length > 0 ? !selectedOption : !userTypedInput.trim()}
                          className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-rose-950/30 cursor-pointer font-myanmar flex items-center justify-center gap-2"
                        >
                          <span>အဖြေစစ်ဆေးမည် (Check)</span>
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800 border border-rose-400/40 font-mono text-rose-100">
                            {getDisplayBadge('SUBMIT_ANSWER')}
                          </kbd>
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextQuestion}
                          className="w-full py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs tracking-wide transition shadow-lg cursor-pointer font-myanmar flex items-center justify-center gap-2"
                        >
                          <span>နောက်မေးခွန်းသို့ (Next) →</span>
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-600 font-mono text-stone-300">
                            {getDisplayBadge('NEXT_ITEM')}
                          </kbd>
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
            <ShadowingPracticeScreen
              pack={pack}
              isPlaying={isPlaying}
              currentPlayingText={currentPlayingText}
              play={play}
              stop={stop}
              isShadowingLoop={isShadowingLoop}
              shadowingTurnDelay={shadowingTurnDelay}
              setShadowingTurnDelay={setShadowingTurnDelay}
              activeTurnIndex={activeTurnIndex}
              startShadowingLoop={startShadowingLoop}
              stopShadowingLoop={stopShadowingLoop}
              playbackRate={playbackRate}
              setPlaybackRate={setPlaybackRate}
              onProceed={() => setCurrentStage(11)}
            />
          )}

          {/* STAGE 12: SRS CARD CREATION */}
          {currentStage === 12 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl font-myanmar">
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
                  အဆင့် ၁၂ • SRS စနစ်သို့ ထည့်သွင်းခြင်း
                </span>
                <h2 className="text-2xl font-bold text-stone-100 tracking-tight">
                  SRS ကတ်များ ထုတ်ယူခြင်း
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  ရေရှည်မှတ်မိစေရန်အတွက် ဝေါဟာရနှင့် ခန်ဂျီတစ်ခုချင်းစီကို မှတ်မိစစ်ဆေးခြင်း၊ ရိုက်ထည့်ဖြေဆိုခြင်း နှင့် အသံထွက်ဖတ်ရှုခြင်း SRS ကတ်များအဖြစ် အလိုအလျောက် ခွဲခြမ်းထည့်သွင်းပေးမည် ဖြစ်ပါသည်။
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateLessonCards}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm transition shadow-lg shadow-rose-950/40 inline-flex items-center space-x-2"
              >
                <span>SRS ကတ်များ ထုတ်ယူပြီး စာမေးပွဲ စတင်မည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-rose-800 border border-rose-400/40 font-mono text-rose-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 14: REMEDIATION / OUTCOME */}
          {currentStage === 14 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl font-myanmar">
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
                  {lastTestResult?.passed
                    ? `${pack.titleMyanmar || pack.title} အောင်မြင်ပါပြီ!`
                    : 'စာမေးပွဲ ပြီးဆုံးပါပြီ — အားနည်းချက်များကို ပြန်လည်လေ့လာပါ'}
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  {lastTestResult?.summary}
                </p>
              </div>

              {/* Score breakdown across all 5 skills */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2.5 shadow-inner">
                <span className="text-xs uppercase font-semibold text-stone-400 block mb-2 font-mono">
                  ဘာသာရပ်စွမ်းရည် ၅ မျိုး ရလဒ်ခွဲခြမ်းစိတ်ဖြာချက်
                </span>
                {(['vocab', 'kanji', 'grammar', 'reading', 'listening'] as QuestionSkill[]).map((skill) => {
                  const data = testScores[skill];
                  const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  const threshold = skill === 'vocab' ? 90 : skill === 'reading' || skill === 'listening' ? 80 : 85;
                  const passed = pct >= threshold;

                  const skillLabelMap: Record<QuestionSkill, string> = {
                    vocab: 'ဝေါဟာရ (Vocab)',
                    kanji: 'ခန်ဂျီ (Kanji)',
                    grammar: 'သဒ္ဒါ (Grammar)',
                    reading: 'စာဖတ် (Reading)',
                    listening: 'နားထောင် (Listening)'
                  };

                  return (
                    <div
                      key={skill}
                      className="flex items-center justify-between text-xs py-2 border-b border-stone-900 last:border-0"
                    >
                      <span className="text-stone-300 font-medium">{skillLabelMap[skill]}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-stone-400 font-mono text-xs">
                          {data.correct}/{data.total} ({pct}%)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {passed ? 'အောင်မြင် (PASS)' : `ကျရှုံး (< ${threshold}%)`}
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
                    ပြန်လည်သုံးသပ်ရမည့် မေးခွန်းများ ({testIncorrectQuestions.length})
                  </span>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {testIncorrectQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="border-b border-stone-900 pb-2.5 last:border-0 text-xs space-y-1"
                      >
                        <p className="text-stone-200 font-medium font-japanese">{q.promptMy || q.questionMy || q.prompt}</p>
                        <p className="text-rose-400 text-[11px]">အဖြေမှန်: {q.answer}</p>
                        {(q.explanationMy || q.explanation) && (
                          <p className="text-stone-400 text-[10px] leading-relaxed">{q.explanationMy || q.explanation}</p>
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
                    🔄 မေးခွန်းအသစ်များဖြင့် ပြန်လည်ဖြေဆိုမည်
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStage(15)}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wide transition shadow"
                >
                  အဆင့် ၁၅ တိုးတက်မှုရလဒ် ကြည့်မည် →
                </motion.button>
              </div>
            </div>
          )}

          {/* STAGE 15: PROGRESS UPDATE */}
          {currentStage === 15 && (
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl font-myanmar">
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
                  အဆင့် ၁၅ • သင်ယူမှု တိုးတက်မှု သိမ်းဆည်းခြင်း
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
                  အဆင့် ၁၅ ဆင့်စလုံး ပြီးမြောက်ပါပြီ
                </h2>
                <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                  သင်၏ စာမေးပွဲမှတ်တမ်း၊ SRS ကတ်များနှင့် သင်ယူမှု အချက်အလက်များကို IndexedDB တွင် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။
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
                  ပြီးဆုံး၍ ပင်မစာမျက်နှာသို့ ပြန်သွားမည်
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* N5 Reference Workbench Modal */}
      <N5ReferenceWorkbench
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        initialTab={referenceTab}
      />
    </div>
  );
};
