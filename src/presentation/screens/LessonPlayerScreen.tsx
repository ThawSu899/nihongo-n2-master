import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { PitchAccentVisualizer } from '../components/PitchAccentVisualizer';
import { useAudioPlayer, cleanJapanesePrompt, parseDialogueTranscript } from '../hooks/useAudioPlayer';
import {
  TTS_SPEED_PRESETS,
  BLIND_LISTENING_STORAGE_KEY,
} from '../../domain/audio/tts-engine';
import { chunkVocabulary, formatPartBadge, VocabularyChunk } from '../../domain/curriculum/vocabulary-pagination';
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
  initialStage?: number;
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
  initialStage,
}) => {
  const [currentStage, setCurrentStage] = useState<number>(initialStage ?? 1);
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [referenceTab, setReferenceTab] = useState<'counters' | 'expressions' | 'mistakes'>('counters');
  const {
    play,
    play3xShadowingLoop,
    isShadowing3x,
    shadowing3xIteration,
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

  const prevTestActiveRef = useRef<boolean>(false);
  useEffect(() => {
    const isTestStage = currentStage === 13;
    if (onTestActiveChange && prevTestActiveRef.current !== isTestStage) {
      prevTestActiveRef.current = isTestStage;
      onTestActiveChange(isTestStage);
    }
    return () => {
      if (onTestActiveChange && prevTestActiveRef.current) {
        prevTestActiveRef.current = false;
        onTestActiveChange(false);
      }
    };
  }, [currentStage, onTestActiveChange]);

  const hasCompletedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (currentStage === 15 && onLessonCompleted && !hasCompletedRef.current[pack.id]) {
      hasCompletedRef.current[pack.id] = true;
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

  // Vocabulary view index & sub-batch pagination
  const [vocabIndex, setVocabIndex] = useState(0);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const vocabContainerRef = useRef<HTMLDivElement>(null);
  const [isKanjiDrawerOpen, setIsKanjiDrawerOpen] = useState(false);

  // Blind Listening Mode preference (persisted to localStorage)
  const [blindListeningMode, setBlindListeningMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(BLIND_LISTENING_STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleBlindListeningMode = useCallback(() => {
    setBlindListeningMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(BLIND_LISTENING_STORAGE_KEY, String(next));
        } catch {
          // Ignore storage error
        }
      }
      return next;
    });
  }, []);

  const [blindRevealed, setBlindRevealed] = useState<boolean>(false);

  // Reset blind revealed status on stage, exercise, or vocab change
  useEffect(() => {
    setBlindRevealed(false);
  }, [currentStage, exerciseIndex, vocabIndex]);

  // When audio finishes playing in blind mode, auto reveal text
  const wasPlayingAudioRef = useRef<boolean>(false);
  useEffect(() => {
    if (wasPlayingAudioRef.current && !isPlaying && blindListeningMode) {
      setBlindRevealed(true);
    }
    wasPlayingAudioRef.current = isPlaying;
  }, [isPlaying, blindListeningMode]);

  const vocabChunks = useMemo(
    () => chunkVocabulary(pack.vocabularies, 15),
    [pack.vocabularies]
  );

  const dokkaiPassage = useMemo(
    () => convertLessonReadingToDokkai(pack),
    [pack]
  );

  const dokkaiAvailablePassages = useMemo(
    () => [dokkaiPassage, ...CURATED_DOKKAI_CATALOG],
    [dokkaiPassage]
  );

  const handleDokkaiComplete = useCallback(({ accuracy }: { accuracy: number }) => {
    setTestScores((prev) => ({
      ...prev,
      reading: {
        correct: prev.reading.correct + (accuracy >= 80 ? 4 : accuracy >= 60 ? 3 : 2),
        total: prev.reading.total + 4,
      },
    }));
    setCurrentStage(9);
    setExerciseIndex(0);
  }, []);

  // Reset stage and vocab pagination when pack.id changes
  useEffect(() => {
    setCurrentStage(1);
    setVocabIndex(0);
    setActivePartIndex(0);
    setExerciseIndex(0);
  }, [pack.id]);

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
        if (isPlaying && (currentPlayingText === v.ja || currentPlayingText === v.kana)) {
          stop();
        } else {
          play(v.ja, v.audio, undefined, v.kana);
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
        const nextIdx = vocabIndex + 1;
        setVocabIndex(nextIdx);
        setActivePartIndex(Math.floor(nextIdx / 15));
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
      if (onLessonCompleted && !hasCompletedRef.current[pack.id]) {
        hasCompletedRef.current[pack.id] = true;
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
        const prevIdx = vocabIndex - 1;
        setVocabIndex(prevIdx);
        setActivePartIndex(Math.floor(prevIdx / 15));
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
      <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <button
            type="button"
            data-testid="lesson-player-exit-btn"
            onClick={async () => {
              if (currentStage === 15 && onLessonCompleted && !hasCompletedRef.current[pack.id]) {
                hasCompletedRef.current[pack.id] = true;
                await onLessonCompleted(pack.id);
              }
              onExit();
            }}
            className="flex items-center space-x-1.5 text-stone-600 hover:text-stone-900 transition py-1 px-2.5 -ml-2 rounded-xl hover:bg-stone-100 cursor-pointer pointer-events-auto relative z-20"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">ထွက်မည် (Exit)</span>
          </button>

          <div className="flex items-center space-x-2 text-center">
            <span className="font-semibold text-indigo-600 font-mono text-xs sm:text-sm">
              အဆင့် {currentStage}/၁၅:
            </span>
            <span className="text-stone-900 font-medium text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
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
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
              title="Open N5 Reference Workbench (Counters, Expressions & Common Traps)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline font-mono">N5 Ref</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.max(1, p - 1))}
              disabled={currentStage === 1}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 disabled:opacity-30 text-stone-700 transition cursor-pointer shadow-xs"
              title="Previous stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentStage((p) => Math.min(15, p + 1))}
              disabled={currentStage === 15}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 disabled:opacity-30 text-stone-700 transition cursor-pointer shadow-xs"
              title="Next stage"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* 15 Stage Steps Grid */}
        <div className="w-full bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
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
                      ? 'bg-indigo-600 ring-2 ring-indigo-400/50 shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-500/90'
                      : 'bg-stone-200 hover:bg-stone-300'
                  }`}
                  title={`Stage ${stepNum}: ${name}`}
                />
              );
            })}
          </div>
        </div>

        {/* Audio Toolbar: Multi-Speed TTS & Blind Listening Mode */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Blind Listening Mode Toggle */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={toggleBlindListeningMode}
            className={`px-3 py-1.5 rounded-xl border font-medium flex items-center space-x-1.5 transition cursor-pointer font-myanmar ${
              blindListeningMode
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
            title="Blind Listening Mode: Blurs/hides Japanese and Burmese text until audio completes or clicked"
          >
            <span>🎧</span>
            <span>Blind Listening Mode (အသံအရင်နားထောင်မည်)</span>
            {blindListeningMode && (
              <span className="ml-1 text-[10px] bg-purple-800 text-white px-1.5 py-0.2 rounded-md font-sans">
                ON
              </span>
            )}
          </motion.button>

          {/* Speed Presets */}
          <div className="flex items-center space-x-1 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200">
            <span className="text-[10px] text-stone-500 font-mono mr-1">Speed:</span>
            {TTS_SPEED_PRESETS.map((preset) => (
              <button
                key={preset.rate}
                type="button"
                onClick={() => setPlaybackRate(preset.rate)}
                className={`px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer font-myanmar ${
                  playbackRate === preset.rate
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                }`}
                title={preset.labelBurmese}
              >
                {preset.labelBurmese}
              </button>
            ))}
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
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 inline-block">
                  အဆင့် ၁ • ရည်မှန်းချက်များ (Can-Do Goals)
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                  {pack.titleMyanmar || (pack as any).titleMy || pack.title}
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed font-myanmar">{pack.descriptionMy || pack.description}</p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3.5">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center">
                  <Award className="w-4 h-4 mr-2 text-indigo-600" /> သင်ခန်းစာ ရည်မှန်းချက်များ
                </h3>
                <ul className="space-y-2.5 text-xs text-stone-700">
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>အဓိက ဝေါဟာရများနှင့် လက်တွေ့အသုံးအနှုန်းများကို ကျွမ်းကျင်စွာ တတ်မြောက်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>အခြေခံ ကန်ဂျီစာလုံးများကို စကားလုံးတွဲများနှင့် အတူတကွ မှတ်မိနားလည်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>သဒ္ဒါပုံစံများ၏ တည်ဆောက်ပုံနှင့် သတိပြုရမည့် အချက်များကို ရှင်းလင်းစွာ သဘောပေါက်စေရန်။</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>စာဖတ်ခြင်း၊ နားထောင်ခြင်း၊ အလွတ်မှတ်မိခြင်းနှင့် စာမေးပွဲတို့ကို အောင်မြင်စွာ ဖြေဆိုနိုင်စေရန်။</span>
                  </li>
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(2)}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <span>ဝေါဟာရ စတင်လေ့လာမည်</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 2: VOCABULARY */}
          {currentStage === 2 && (
            <div ref={vocabContainerRef} className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold">
                    အဆင့် ၂ • အဓိက ဝေါဟာရများ (Vocabulary)
                  </span>
                  <h2 className="text-xl font-bold text-stone-900 font-mono">
                    ဝေါဟာရ {vocabIndex + 1} / {pack.vocabularies.length}
                    {vocabChunks.length > 1 && (
                      <span className="text-xs font-normal text-stone-500 ml-2">
                        (Part {activePartIndex + 1} of {vocabChunks.length})
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex items-center space-x-1.5 bg-stone-50 dark:bg-stone-900/60 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800 shrink-0">
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-myanmar whitespace-nowrap mr-1">အမြန်နှုန်း:</span>
                  {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackRate(spd)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                        playbackRate === spd
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Batch Navigation Header / Tab Bar (Visible when total vocabulary > 15) */}
              {vocabChunks.length > 1 && (
                <div className="sticky top-0 z-20 bg-stone-100 dark:bg-zinc-900 backdrop-blur-xl border border-stone-200 dark:border-zinc-800 rounded-2xl p-2.5 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs uppercase font-mono text-stone-500 dark:text-zinc-400 font-semibold px-2">
                      Batch:
                    </span>
                    {vocabChunks.map((chunk: VocabularyChunk, idx: number) => (
                      <button
                        key={chunk.partNumber}
                        type="button"
                        onClick={() => {
                          setActivePartIndex(idx);
                          setVocabIndex(chunk.startIndex);
                          if (typeof window !== 'undefined') {
                            vocabContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          activePartIndex === idx
                            ? 'bg-indigo-600 text-white font-bold shadow-xs border border-indigo-600'
                            : 'bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700'
                        }`}
                      >
                        <span>{formatPartBadge(chunk.partNumber, chunk.startIndex, chunk.endIndex)}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          activePartIndex === idx ? 'bg-indigo-700 text-white' : 'bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300'
                        }`}>
                          {chunk.itemCount}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-stone-500 dark:text-zinc-400 font-mono hidden sm:inline shrink-0 pr-2">
                    {pack.vocabularies.length} Total Words
                  </span>
                </div>
              )}

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
                      className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 text-center space-y-4"
                    >
                      {/* Blind Mode Reveal Trigger / Indicator */}
                      {blindListeningMode && !blindRevealed && (
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => setBlindRevealed(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-xs font-myanmar"
                          >
                            <span>👁️</span>
                            <span>စာသားဖွင့်ကြည့်မည် (Click to Reveal)</span>
                          </button>
                        </div>
                      )}

                      <div
                        onClick={() => {
                          if (blindListeningMode && !blindRevealed) setBlindRevealed(true);
                        }}
                        className={`flex flex-col items-center justify-center py-2 space-y-1.5 transition duration-300 ${
                          blindListeningMode && !blindRevealed ? 'filter blur-md select-none cursor-pointer' : ''
                        }`}
                      >
                        <FuriganaRuby
                          kanji={v.ja}
                          kana={v.kana}
                          showRomaji={profile.showRomaji}
                          className="text-4xl sm:text-5xl font-bold font-japanese text-stone-900 dark:text-zinc-100"
                        />
                        {v.ja !== v.kana && (
                          <span className="text-sm font-mono text-indigo-700 dark:text-indigo-300 font-semibold tracking-wider select-none bg-indigo-50 dark:bg-indigo-950/50 px-3 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                            【{v.kana}】
                          </span>
                        )}
                      </div>

                      {/* Visual Pitch Accent Stepped Contour Curve */}
                      <div
                        onClick={() => {
                          if (blindListeningMode && !blindRevealed) setBlindRevealed(true);
                        }}
                        className={`flex justify-center py-1 transition duration-300 ${
                          blindListeningMode && !blindRevealed ? 'filter blur-md select-none cursor-pointer' : ''
                        }`}
                      >
                        <PitchAccentVisualizer
                          text={v.kana || v.ja}
                          pattern={v.pitchPattern}
                          dropIndex={v.dropIndex}
                          showBadge={true}
                          showContour={true}
                          compact={false}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isPlaying && (currentPlayingText === v.ja || currentPlayingText === v.kana)) {
                              stop();
                            } else {
                              play(v.ja, v.audio, undefined, v.kana);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl ${
                            isPlaying && (currentPlayingText === v.ja || currentPlayingText === v.kana)
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/40 animate-pulse'
                              : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700'
                          } text-xs font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer`}
                          title="အသံနားထောင်မည် [Space / R]"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>{isPlaying && (currentPlayingText === v.ja || currentPlayingText === v.kana) ? 'ဖွင့်နေသည်...' : 'နားထောင်မည်'}</span>
                          <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white border border-indigo-300 font-mono text-indigo-800">
                            {getDisplayBadge('PLAY_AUDIO')}
                          </kbd>
                        </motion.button>

                        {/* 🔁 3x Shadowing Loop Button */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isShadowing3x) {
                              stop();
                            } else {
                              play3xShadowingLoop(v.ja, v.audio, undefined, v.kana);
                            }
                          }}
                          className={`px-3 py-2.5 rounded-xl ${
                            isShadowing3x && (currentPlayingText === v.ja || currentPlayingText === v.kana)
                              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40 animate-pulse'
                              : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900'
                          } text-xs font-medium flex items-center space-x-1.5 transition shadow-xs cursor-pointer font-myanmar`}
                          title="3x Shadowing Loop (1.5s pause between repetitions)"
                        >
                          <span>🔁</span>
                          <span>
                            {isShadowing3x && (currentPlayingText === v.ja || currentPlayingText === v.kana)
                              ? `3x (${shadowing3xIteration}/3)`
                              : '🔁 3x Shadowing Loop'}
                          </span>
                        </motion.button>

                        {(replayCount[v.ja] || replayCount[v.kana]) && (
                          <span className="text-[11px] text-stone-500 font-mono">
                            ဖွင့်ပြီး: {replayCount[v.ja] || replayCount[v.kana]} ကြိမ်
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => {
                          if (blindListeningMode && !blindRevealed) setBlindRevealed(true);
                        }}
                        className={`pt-3 border-t border-stone-200 space-y-1.5 transition duration-300 ${
                          blindListeningMode && !blindRevealed ? 'filter blur-md select-none cursor-pointer' : ''
                        }`}
                      >
                        <p className="text-xl font-bold text-stone-900 font-myanmar">
                          {v.meaningMyanmar || v.my || v.meaningMy || v.en}
                        </p>
                        {v.en && (v.meaningMyanmar || v.my) && (
                          <p className="text-xs text-stone-600">{v.en}</p>
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
                  onClick={() => {
                    const prev = Math.max(0, vocabIndex - 1);
                    setVocabIndex(prev);
                    setActivePartIndex(Math.floor(prev / 15));
                  }}
                  disabled={vocabIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 disabled:opacity-30 text-stone-700 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  title="ရှေ့ဝေါဟာရ [←]"
                >
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600">
                    {getDisplayBadge('PREV_ITEM')}
                  </kbd>
                  <span>ရှေ့ဝေါဟာရ</span>
                </motion.button>
                {vocabIndex < pack.vocabularies.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const next = vocabIndex + 1;
                      setVocabIndex(next);
                      setActivePartIndex(Math.floor(next / 15));
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer flex items-center gap-2"
                    title={`နောက်ဝေါဟာရ [${getDisplayBadge('NEXT_ITEM')}]`}
                  >
                    <span>နောက်ဝေါဟာရ ({vocabIndex + 1}/{pack.vocabularies.length})</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                      {getDisplayBadge('NEXT_ITEM')}
                    </kbd>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentStage(3)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer flex items-center gap-2"
                    title={`ကန်ဂျီသို့ ဆက်သွားမည် [${getDisplayBadge('NEXT_ITEM')}]`}
                  >
                    <span>ကန်ဂျီသို့ ဆက်သွားမည် →</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-700 border border-emerald-500 font-mono text-emerald-100">
                      {getDisplayBadge('NEXT_ITEM')}
                    </kbd>
                  </motion.button>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: KANJI IN CONTEXT */}
          {currentStage === 3 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold">
                  အဆင့် ၃ • အကြောင်းအရာနှင့် ကန်ဂျီ (Kanji)
                </span>
                <h2 className="text-xl font-bold text-stone-900">အခြေခံ ကန်ဂျီစာလုံးများ</h2>
                <p className="text-xs text-stone-600">
                  ကန်ဂျီကို သီးသန့်မဟုတ်ဘဲ စကားလုံးတွဲများနှင့် အတူတကွ လက်တွေ့လေ့လာပါမည်။
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pack.kanjis.map((k) => (
                  <motion.div
                    key={k.id}
                    whileHover={{ y: -3 }}
                    className="bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-2xl p-5 space-y-3.5 transition shadow-xs"
                  >
                    <div className="text-center">
                      <div className="text-5xl font-bold font-japanese text-indigo-600 mb-1">
                        {k.char}
                      </div>
                      <div className="text-sm font-semibold text-stone-900 font-myanmar">
                        {k.meaningMyanmar || k.meaningMy || k.meaning}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">ဆွဲချက်: {k.strokes} ချက်</div>
                    </div>

                    <div className="border-t border-stone-200 pt-2.5 text-xs space-y-1">
                      <div>
                        <span className="text-stone-500">အွန်းယောမိ (Onyomi): </span>
                        <span className="font-japanese text-stone-800">{k.onyomi.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">ကွန်းယောမိ (Kunyomi): </span>
                        <span className="font-japanese text-stone-800">{k.kunyomi.join(', ')}</span>
                      </div>
                    </div>

                    <div className="border-t border-stone-200 pt-2.5 space-y-1.5">
                      <span className="text-[10px] text-stone-500 uppercase font-semibold">
                        စကားလုံးတွဲ အသုံးအနှုန်းများ:
                      </span>
                      {k.exampleVocab.map((ev, i) => (
                        <div
                          key={i}
                          className="text-xs flex justify-between items-baseline bg-white px-2.5 py-1.5 rounded-lg border border-stone-200"
                        >
                          <span className="font-japanese text-stone-900 font-medium">{ev.word}</span>
                          <span className="text-stone-600 text-[11px] font-myanmar">
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
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <span>သဒ္ဒါပုံစံများသို့ ဆက်သွားမည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 4: GRAMMAR */}
          {currentStage === 4 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold">
                  အဆင့် ၄ • သဒ္ဒါပုံစံများ (Grammar)
                </span>
                <h2 className="text-xl font-bold text-stone-900">အဓိက သဒ္ဒါပုံစံများ</h2>
              </div>

              <div className="space-y-4">
                {pack.grammars.map((g) => (
                  <div
                    key={g.id}
                    className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold font-japanese text-indigo-700">{g.pattern}</h3>
                      <span className="text-xs text-stone-600 font-myanmar">
                        {g.meaningMyanmar || g.meaningMy || g.meaning}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs font-mono text-stone-800">
                      <span className="text-stone-500">ဝါကျတည်ဆောက်ပုံ: </span>
                      {g.formation}
                    </div>

                    <p className="text-xs text-stone-700 font-myanmar leading-relaxed">
                      {g.explanation.my || g.explanationMy || g.explanation.en}
                    </p>
                    {g.nuanceExplanationMy && (
                      <p className="text-xs text-amber-800 font-myanmar leading-relaxed mt-1">
                        {g.nuanceExplanationMy}
                      </p>
                    )}

                    {g.commonMistakes.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                        <span className="font-semibold block text-amber-900">အမှားဖြစ်လေ့ရှိသော အချက်:</span>
                        {g.commonMistakes.map((m, idx) => (
                          <p key={idx} className="text-amber-800">• {m}</p>
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
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs font-myanmar">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>⚠️ သတိပြုရန် (Common Learner Trap / 言わない!)</span>
                      </div>
                      <button
                        onClick={() => {
                          setReferenceTab('mistakes');
                          setIsReferenceOpen(true);
                        }}
                        className="text-[11px] text-amber-700 hover:text-amber-900 underline font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <span>All Traps</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {matchingTraps.slice(0, 2).map((m) => (
                        <div key={m.id} className="bg-white border border-amber-200 rounded-xl p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold font-japanese text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 line-through">
                              {m.incorrect}
                            </span>
                            <span className="text-xs font-bold font-japanese text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {m.correct}
                            </span>
                          </div>
                          <p className="text-xs text-stone-800 font-myanmar leading-relaxed">
                            {m.warningBurmese}
                          </p>
                          <p className="text-[11px] text-stone-600 font-myanmar leading-relaxed">
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
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <span>နမူနာဝါကျများသို့ ဆက်သွားမည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 5: EXAMPLE SENTENCES */}
          {currentStage === 5 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-1">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold">
                  အဆင့် ၅ • နမူနာဝါကျများ (Sentences)
                </span>
                <h2 className="text-xl font-bold text-stone-900">ဝါကျတွင်း လက်တွေ့အသုံးများ</h2>
              </div>

              {/* Blind Mode Notice in Stage 5 */}
              {blindListeningMode && !blindRevealed && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center space-x-2 text-xs text-purple-900 font-myanmar">
                    <span>🎧</span>
                    <span>Blind Listening Mode ဖွင့်ထားပါသည် — အသံအရင်နားထောင်ပြီးမှ စာသားကို ဖွင့်ကြည့်ပါ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlindRevealed(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0 cursor-pointer transition font-myanmar shadow-xs"
                  >
                    စာသားဖွင့်ကြည့်မည်
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {pack.sentences.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.005 }}
                    className="bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-2xl p-4 flex items-center justify-between gap-4 transition shadow-xs"
                  >
                    <div
                      onClick={() => {
                        if (blindListeningMode && !blindRevealed) setBlindRevealed(true);
                      }}
                      className={`space-y-1 transition duration-300 ${
                        blindListeningMode && !blindRevealed
                          ? 'filter blur-md select-none cursor-pointer'
                          : ''
                      }`}
                    >
                      <div className="text-base font-japanese font-medium text-stone-900">{s.ja}</div>
                      <div className="text-xs text-stone-700 font-myanmar">
                        {s.translation.my || s.translationMy || s.translation.en}
                      </div>
                      {s.translation.en && (s.translation.my || s.translationMy) && (
                        <div className="text-[11px] text-stone-500">{s.translation.en}</div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
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
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/50 shadow-sm animate-pulse'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                        aria-label="Play sentence audio"
                      >
                        <Volume2 className="w-4 h-4" />
                      </motion.button>

                      {/* 🔁 3x Shadowing Loop Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isShadowing3x && currentPlayingText === s.ja) {
                            stop();
                          } else {
                            play3xShadowingLoop(s.ja, s.audio);
                          }
                        }}
                        className={`px-2.5 py-2.5 rounded-xl text-xs font-medium border flex items-center space-x-1 transition cursor-pointer font-myanmar ${
                          isShadowing3x && currentPlayingText === s.ja
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs animate-pulse'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                        }`}
                        aria-label="3x Shadowing Loop"
                        title="Replay 3 times with 1.5s pause for vocal shadowing practice"
                      >
                        <span>🔁</span>
                        <span className="text-[11px]">
                          {isShadowing3x && currentPlayingText === s.ja
                            ? `3x (${shadowing3xIteration}/3)`
                            : '3x Loop'}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentStage(6)}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <span>လမ်းညွှန်လေ့ကျင့်ခန်း စတင်မည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
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
                passage={dokkaiPassage}
                availablePassages={dokkaiAvailablePassages}
                embeddedMode={true}
                onComplete={handleDokkaiComplete}
              />
              <div className="flex justify-between items-center px-1">
                <button
                  onClick={() => {
                    setCurrentStage(7);
                    setExerciseIndex(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>အဆင့် ၇: အလွတ်ပြန်လည်မှတ်မိခြင်း (Active Recall)</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentStage(9);
                    setExerciseIndex(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <span>အဆင့် ၉: နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Listening) →</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGES 6, 7, 9, 11, 13: EXERCISE RUNNER */}
          {[6, 7, 9, 11, 13].includes(currentStage) && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold block">
                    {currentStage === 6 && 'အဆင့် ၆ • လမ်းညွှန် လေ့ကျင့်ခန်း (Guided Practice)'}
                    {currentStage === 7 && 'အဆင့် ၇ • အလွတ်ပြန်လည်မှတ်မိခြင်း (Active Recall)'}
                    {currentStage === 9 && 'အဆင့် ၉ • နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Listening Comprehension)'}
                    {currentStage === 11 && 'အဆင့် ၁၁ • ကျွမ်းကျင်မှု စစ်ဆေးမေးခွန်းများ (Mastery Questions)'}
                    {currentStage === 13 && 'အဆင့် ၁၃ • တရားဝင် သင်ခန်းစာ စာမေးပွဲ (Mastery Test • အချိန်ကန့်သတ်)'}
                  </span>
                  <h2 className="text-base font-bold text-stone-900 mt-0.5">
                    မေးခွန်း {exerciseIndex + 1}
                  </h2>
                </div>
                {currentStage === 13 && (
                  <span className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full font-semibold">
                    စာမေးပွဲ စနစ် (Test Mode)
                  </span>
                )}
              </div>

              {/* Listening audio control if Stage 9 */}
              {currentStage === 9 && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center space-y-3 mb-4">
                  <span className="text-[10px] text-stone-500 uppercase font-mono block">
                    စကားပြောခန်း: {pack.listening.titleMy || pack.listening.title}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
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
                      className={`px-6 py-3 rounded-2xl text-white text-xs font-semibold inline-flex items-center space-x-2 transition shadow-sm cursor-pointer ${
                        isPlaying && currentPlayingText === pack.listening.transcript
                          ? 'bg-indigo-600 ring-4 ring-indigo-500/30 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="စကားပြောအသံ ဖွင့်မည် [Space]"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>
                        {isPlaying && currentPlayingText === pack.listening.transcript
                          ? 'စကားပြောအသံ ဖွင့်နေသည်...'
                          : 'စကားပြောအသံ ဖွင့်မည်'}
                      </span>
                      <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/20 border border-white/30 font-mono text-white">
                        Space
                      </kbd>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (isShadowing3x && currentPlayingText === pack.listening.transcript) {
                          stop();
                        } else {
                          play3xShadowingLoop(pack.listening.transcript, pack.listening.audio);
                        }
                      }}
                      className={`px-4 py-3 rounded-2xl text-xs font-semibold inline-flex items-center space-x-1.5 transition shadow-sm cursor-pointer border font-myanmar ${
                        isShadowing3x && currentPlayingText === pack.listening.transcript
                          ? 'bg-amber-600 text-white border-amber-600 ring-4 ring-amber-500/30 animate-pulse'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                      }`}
                      title="🔁 3x Shadowing Loop (1.5-second pause between repetitions)"
                    >
                      <span>🔁</span>
                      <span>
                        {isShadowing3x && currentPlayingText === pack.listening.transcript
                          ? `3x Loop (${shadowing3xIteration}/3)`
                          : '🔁 3x Shadowing Loop'}
                      </span>
                    </motion.button>
                  </div>
                  {hasAnsweredListening && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 pt-3 border-t border-stone-200 text-left text-xs font-japanese text-stone-800 whitespace-pre-line bg-white p-4 rounded-xl border border-stone-200 shadow-xs"
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
                      <p className="text-stone-500 text-xs">အဆင့်ပြီးဆုံးပါပြီ — နောက်ထပ်မေးခွန်း မရှိတော့ပါ။</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextQuestion}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        နောက်တစ်ဆင့်သို့ ဆက်သွားမည် →
                      </motion.button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="text-base font-semibold text-stone-900 flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="leading-snug font-myanmar block">
                          {q.promptMy || q.questionMy || q.prompt}
                        </span>
                        {q.promptMy && q.prompt !== q.promptMy && (
                          <span className="text-xs text-stone-500 font-japanese block">
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
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/50 shadow-sm animate-pulse'
                              : 'bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 shadow-xs'
                          }`}
                          title="Play question audio [Space]"
                        >
                          <Volume2 className="w-4 h-4" />
                          <kbd className="text-[10px] px-1 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600">
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
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500 shadow-xs'
                                  : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-white hover:border-stone-300 shadow-xs'
                              }`}
                            >
                              <span className="flex items-center">
                                <kbd className="w-5 h-5 rounded-md bg-white border border-stone-200 text-stone-600 text-[10px] flex items-center justify-center mr-2.5 font-mono shadow-xs">
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
                          className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-3.5 text-sm text-stone-900 font-japanese focus:outline-none focus:border-indigo-500 shadow-xs"
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
                        className="text-xs text-stone-600 hover:text-stone-900 flex items-center space-x-1.5 transition cursor-pointer font-myanmar"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>အရိပ်အမြွက် ကြည့်မည် (အမှတ်လျော့နိုင်ပါသည်)</span>
                      </button>
                    )}
                    {usedHint && (q.hintMy || q.hint || q.explanationMy) && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-myanmar"
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
                              ? 'bg-green-50 border-green-200 text-green-800 shadow-xs'
                              : 'bg-red-50 border-red-200 text-red-800 shadow-xs'
                          }`}
                        >
                          <div className="font-bold flex items-center space-x-2 text-sm font-myanmar">
                            {feedback.isCorrect ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>အဖြေမှန် (Correct!)</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-rose-600" />
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
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-xs font-myanmar">
                          <div className="flex items-center justify-between text-amber-800 font-bold">
                            <span className="flex items-center space-x-1.5">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>⚠️ သတိပြုရန် (Common Learner Trap / 言わない!)</span>
                            </span>
                            <button
                              onClick={() => {
                                setReferenceTab('mistakes');
                                setIsReferenceOpen(true);
                              }}
                              className="text-[11px] text-amber-700 hover:text-amber-900 underline font-mono flex items-center space-x-0.5 cursor-pointer"
                            >
                              <span>Rule</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-stone-800 font-medium">
                            {matchingTrap.warningBurmese}
                          </div>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
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
                          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition shadow-sm cursor-pointer font-myanmar flex items-center justify-center gap-2"
                        >
                          <span>အဖြေစစ်ဆေးမည် (Check)</span>
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                            {getDisplayBadge('SUBMIT_ANSWER')}
                          </kbd>
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextQuestion}
                          className="w-full py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold text-xs tracking-wide transition shadow-xs cursor-pointer font-myanmar flex items-center justify-center gap-2"
                        >
                          <span>နောက်မေးခွန်းသို့ (Next) →</span>
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-600">
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
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-sm font-myanmar">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-200 mx-auto flex items-center justify-center text-indigo-600 shadow-xs"
              >
                <Layers className="w-10 h-10" />
              </motion.div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 inline-block">
                  အဆင့် ၁၂ • SRS စနစ်သို့ ထည့်သွင်းခြင်း
                </span>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                  SRS ကတ်များ ထုတ်ယူခြင်း
                </h2>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  ရေရှည်မှတ်မိစေရန်အတွက် ဝေါဟာရနှင့် ခန်ဂျီတစ်ခုချင်းစီကို မှတ်မိစစ်ဆေးခြင်း၊ ရိုက်ထည့်ဖြေဆိုခြင်း နှင့် အသံထွက်ဖတ်ရှုခြင်း SRS ကတ်များအဖြစ် အလိုအလျောက် ခွဲခြမ်းထည့်သွင်းပေးမည် ဖြစ်ပါသည်။
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateLessonCards}
                className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm inline-flex items-center space-x-2 cursor-pointer"
              >
                <span>SRS ကတ်များ ထုတ်ယူပြီး စာမေးပွဲ စတင်မည် →</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-500 font-mono text-indigo-100">
                  Enter ↵
                </kbd>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

          {/* STAGE 14: REMEDIATION / OUTCOME */}
          {currentStage === 14 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm font-myanmar">
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-xs ${
                    lastTestResult?.passed
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}
                >
                  <Award className="w-10 h-10" />
                </motion.div>

                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                  {lastTestResult?.passed
                    ? `${pack.titleMyanmar || pack.title} အောင်မြင်ပါပြီ!`
                    : 'စာမေးပွဲ ပြီးဆုံးပါပြီ — အားနည်းချက်များကို ပြန်လည်လေ့လာပါ'}
                </h2>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  {lastTestResult?.summary}
                </p>
              </div>

              {/* Score breakdown across all 5 skills */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-2.5">
                <span className="text-xs uppercase font-semibold text-stone-500 block mb-2 font-mono">
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
                      className="flex items-center justify-between text-xs py-2 border-b border-stone-200 last:border-0"
                    >
                      <span className="text-stone-800 font-medium">{skillLabelMap[skill]}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-stone-600 font-mono text-xs">
                          {data.correct}/{data.total} ({pct}%)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3 text-left">
                  <span className="text-xs uppercase font-semibold text-rose-700 block font-mono">
                    ပြန်လည်သုံးသပ်ရမည့် မေးခွန်းများ ({testIncorrectQuestions.length})
                  </span>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {testIncorrectQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="border-b border-stone-200 pb-2.5 last:border-0 text-xs space-y-1"
                      >
                        <p className="text-stone-800 font-medium font-japanese">{q.promptMy || q.questionMy || q.prompt}</p>
                        <p className="text-rose-700 text-[11px]">အဖြေမှန်: {q.answer}</p>
                        {(q.explanationMy || q.explanation) && (
                          <p className="text-stone-600 text-[10px] leading-relaxed">{q.explanationMy || q.explanation}</p>
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
                    className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wide transition shadow-xs cursor-pointer"
                  >
                    🔄 မေးခွန်းအသစ်များဖြင့် ပြန်လည်ဖြေဆိုမည်
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentStage(15)}
                  className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide transition shadow-xs cursor-pointer"
                >
                  အဆင့် ၁၅ တိုးတက်မှုရလဒ် ကြည့်မည် →
                </motion.button>
              </div>
            </div>
          )}

          {/* STAGE 15: PROGRESS UPDATE */}
          {currentStage === 15 && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm font-myanmar">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-emerald-600 shadow-xs"
              >
                <Check className="w-10 h-10" />
              </motion.div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-700 font-semibold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 inline-block">
                  အဆင့် ၁၅ • သင်ယူမှု တိုးတက်မှု သိမ်းဆည်းခြင်း
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                  အဆင့် ၁၅ ဆင့်စလုံး ပြီးမြောက်ပါပြီ
                </h2>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  သင်၏ စာမေးပွဲမှတ်တမ်း၊ SRS ကတ်များနှင့် သင်ယူမှု အချက်အလက်များကို IndexedDB တွင် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 relative z-20">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  data-testid="stage-15-return-btn"
                  onClick={async () => {
                    if (onLessonCompleted && !hasCompletedRef.current[pack.id]) {
                      hasCompletedRef.current[pack.id] = true;
                      await onLessonCompleted(pack.id);
                    }
                    onExit();
                  }}
                  className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs tracking-wide transition shadow-sm cursor-pointer pointer-events-auto"
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
