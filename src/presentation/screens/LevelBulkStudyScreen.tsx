import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  X,
  Volume2,
  BookOpen,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  HelpCircle,
  Zap,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Vocabulary } from '../../domain/models/types';
import { ContentLoader } from '../../data/content/content-loader';
import { quarantineCard } from '../../domain/fsrs/quarantine-engine';
import { PitchAccentVisualizer } from '../components/PitchAccentVisualizer';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { KanjiCardItem, extractKanjiForLevel } from '../../domain/curriculum/kanji-extractor';
import { KanjiDetailModal } from '../components/KanjiDetailModal';
import { StarScrambleTrainer } from '../components/StarScrambleTrainer';
import {
  ActiveRecallMaskingBar,
  ActiveRecallMaskState,
  loadSavedMaskState,
  saveMaskState,
  cycleActiveRecallMask,
} from '../components/ActiveRecallMaskingBar';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2';
export type StudyMode = 'list' | 'drill' | 'quiz';
export type BulkTab = 'vocab' | 'kanji';
export type KanjiViewMode = 'grid' | 'flashcard' | 'quiz';
export type KanjiFilter = 'all' | 'unmastered' | 'mastered';
export type KanjiSort = 'default' | 'strokes_asc' | 'strokes_desc';

export interface QuizQuestion {
  vocab: Vocabulary;
  correctAnswer: string;
  options: string[];
}

export interface KanjiQuizQuestion {
  kanji: KanjiCardItem;
  type: 'kanji_to_reading' | 'kanji_to_meaning' | 'meaning_to_kanji';
  prompt: string;
  promptSub?: string;
  correctAnswer: string;
  options: string[];
}

interface LevelBulkStudyScreenProps {
  onBack: () => void;
  className?: string;
  initialLevel?: JLPTLevel;
  initialTab?: BulkTab;
}

const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2'];
const PAGE_SIZE = 60;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function formatKanjiReadings(k: KanjiCardItem): string {
  const parts: string[] = [];
  if (k.onyomi && k.onyomi.length > 0) {
    parts.push(`音: ${k.onyomi.join('、')}`);
  }
  if (k.kunyomi && k.kunyomi.length > 0) {
    parts.push(`訓: ${k.kunyomi.join('、')}`);
  }
  return parts.length > 0 ? parts.join(' | ') : '—';
}

export function generateKanjiQuizSession(
  kanjiPool: KanjiCardItem[],
  questionCount = 10
): KanjiQuizQuestion[] {
  if (!Array.isArray(kanjiPool) || kanjiPool.length === 0) return [];

  const validPool = kanjiPool.filter(
    (k) => k.literal && k.meaningBurmese && (k.onyomi.length > 0 || k.kunyomi.length > 0)
  );
  if (validPool.length === 0) return [];

  const shuffledPool = shuffleArray(validPool);
  const selected = shuffledPool.slice(0, Math.min(questionCount, shuffledPool.length));

  const types: ('kanji_to_reading' | 'kanji_to_meaning' | 'meaning_to_kanji')[] = [
    'kanji_to_reading',
    'kanji_to_meaning',
    'meaning_to_kanji',
  ];

  return selected.map((k, idx) => {
    const qType = types[idx % types.length];

    if (qType === 'kanji_to_reading') {
      const correctAnswer = formatKanjiReadings(k);
      const otherReadings = validPool
        .filter((other) => other.literal !== k.literal)
        .map((other) => formatKanjiReadings(other))
        .filter((r) => r !== correctAnswer && r !== '—');
      const uniqueDistractors = Array.from(new Set(otherReadings));
      const distractors = shuffleArray(uniqueDistractors).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`音: カン${distractors.length + 1}`);
      }
      const options = shuffleArray([correctAnswer, ...distractors]);
      return {
        kanji: k,
        type: qType,
        prompt: k.literal,
        promptSub: 'မှန်ကန်သော အသံထွက် (Reading) ကို ရွေးချယ်ပါ',
        correctAnswer,
        options,
      };
    } else if (qType === 'kanji_to_meaning') {
      const correctAnswer = k.meaningBurmese;
      const otherMeanings = validPool
        .filter((other) => other.literal !== k.literal && other.meaningBurmese !== correctAnswer)
        .map((other) => other.meaningBurmese);
      const uniqueDistractors = Array.from(new Set(otherMeanings));
      const distractors = shuffleArray(uniqueDistractors).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`အဓိပ္ပာယ် နမူနာ ${distractors.length + 1}`);
      }
      const options = shuffleArray([correctAnswer, ...distractors]);
      return {
        kanji: k,
        type: qType,
        prompt: k.literal,
        promptSub: 'မှန်ကန်သော မြန်မာအဓိပ္ပာယ် (Meaning) ကို ရွေးချယ်ပါ',
        correctAnswer,
        options,
      };
    } else {
      // meaning_to_kanji
      const readings = formatKanjiReadings(k);
      const correctAnswer = k.literal;
      const otherLiterals = validPool
        .filter((other) => other.literal !== k.literal)
        .map((other) => other.literal);
      const uniqueDistractors = Array.from(new Set(otherLiterals));
      const distractors = shuffleArray(uniqueDistractors).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(String.fromCharCode(0x4e00 + distractors.length));
      }
      const options = shuffleArray([correctAnswer, ...distractors]);
      return {
        kanji: k,
        type: qType,
        prompt: k.meaningBurmese,
        promptSub: `အသံထွက်: ${readings} • သက်ဆိုင်ရာ ခန်းဂျီးစာလုံးကို ရွေးပါ`,
        correctAnswer,
        options,
      };
    }
  });
}

export function getBurmeseMeaning(v: Vocabulary): string {
  return (
    v.meaningMyanmar ||
    v.meaningMy ||
    v.my ||
    (v as any).meaningBurmese ||
    v.myanmar ||
    v.en ||
    ''
  );
}

export function generateQuizSession(vocabPool: Vocabulary[], questionCount = 10): QuizQuestion[] {
  if (!Array.isArray(vocabPool) || vocabPool.length === 0) return [];

  const validPool = vocabPool.filter((v) => getBurmeseMeaning(v).trim().length > 0);
  if (validPool.length === 0) return [];

  const shuffledPool = shuffleArray(validPool);
  const selectedVocab = shuffledPool.slice(0, Math.min(questionCount, shuffledPool.length));
  const allMeanings = Array.from(new Set(validPool.map((v) => getBurmeseMeaning(v))));

  return selectedVocab.map((vocab) => {
    const correctAnswer = getBurmeseMeaning(vocab);
    const distractors = shuffleArray(allMeanings.filter((m) => m !== correctAnswer)).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...distractors]);

    return {
      vocab,
      correctAnswer,
      options,
    };
  });
}

export const LevelBulkStudyScreen: React.FC<LevelBulkStudyScreenProps> = ({
  onBack,
  className = '',
  initialLevel = 'N5',
  initialTab = 'vocab',
}) => {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(initialLevel);
  const [studyMode, setStudyMode] = useState<StudyMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);

  // Flashcard Drill State
  const [drillIndex, setDrillIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [drillDeck, setDrillDeck] = useState<Vocabulary[]>([]);

  // Quick Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);

  // Kanji Deck State
  const [bulkTab, setBulkTab] = useState<BulkTab>(initialTab);
  const [kanjiList, setKanjiList] = useState<KanjiCardItem[]>([]);
  const [kanjiLoading, setKanjiLoading] = useState<boolean>(true);
  const [selectedKanji, setSelectedKanji] = useState<KanjiCardItem | null>(null);
  const [kanjiSearchQuery, setKanjiSearchQuery] = useState<string>('');

  // Kanji Modes, Filtering & Mastery State
  const [kanjiViewMode, setKanjiViewMode] = useState<KanjiViewMode>('grid');
  const [kanjiFilter, setKanjiFilter] = useState<KanjiFilter>('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');
  const [kanjiSort, setKanjiSort] = useState<KanjiSort>('default');
  const [isStarScrambleOpen, setIsStarScrambleOpen] = useState<boolean>(false);

  const [masteredKanji, setMasteredKanji] = useState<Set<string>>(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem(`nihongo_mastered_kanji_${initialLevel}`)
          : null;
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Keep in sync with selectedLevel
  useEffect(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem(`nihongo_mastered_kanji_${selectedLevel}`)
          : null;
      setMasteredKanji(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch {
      setMasteredKanji(new Set());
    }
  }, [selectedLevel]);

  // Flashcard Drill State for Kanji
  const [kanjiDrillIndex, setKanjiDrillIndex] = useState<number>(0);
  const [isKanjiRevealed, setIsKanjiRevealed] = useState<boolean>(false);
  const [isKanjiShuffled, setIsKanjiShuffled] = useState<boolean>(false);
  const [kanjiDrillDeck, setKanjiDrillDeck] = useState<KanjiCardItem[]>([]);

  // Kanji Quiz State
  const [kanjiQuizQuestions, setKanjiQuizQuestions] = useState<KanjiQuizQuestion[]>([]);
  const [kanjiQuizCurrentIndex, setKanjiQuizCurrentIndex] = useState<number>(0);
  const [kanjiQuizScore, setKanjiQuizScore] = useState<number>(0);
  const [kanjiQuizSelectedOption, setKanjiQuizSelectedOption] = useState<string | null>(null);
  const [isKanjiQuizSubmitted, setIsKanjiQuizSubmitted] = useState<boolean>(false);
  const [isKanjiQuizCompleted, setIsKanjiQuizCompleted] = useState<boolean>(false);
  const [missedKanjiList, setMissedKanjiList] = useState<KanjiCardItem[]>([]);

  // Quarantine Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const { play, stop, isPlaying, currentPlayingText } = useAudioPlayer();

  // Multi-Layer Active Recall Masking State
  const [maskState, setMaskState] = useState<ActiveRecallMaskState>(() => loadSavedMaskState());
  const [revealedItems, setRevealedItems] = useState<
    Record<string, { furigana?: boolean; burmese?: boolean; kanji?: boolean }>
  >({});

  const handleToggleFurigana = useCallback(() => {
    setMaskState((prev) => {
      const next = { ...prev, hideFurigana: !prev.hideFurigana };
      saveMaskState(next);
      return next;
    });
  }, []);

  const handleToggleBurmese = useCallback(() => {
    setMaskState((prev) => {
      const next = { ...prev, hideBurmese: !prev.hideBurmese };
      saveMaskState(next);
      return next;
    });
  }, []);

  const handleToggleKanji = useCallback(() => {
    setMaskState((prev) => {
      const next = { ...prev, hideKanji: !prev.hideKanji };
      saveMaskState(next);
      return next;
    });
  }, []);

  const handleResetMasks = useCallback(() => {
    const next = { hideFurigana: false, hideBurmese: false, hideKanji: false };
    setMaskState(next);
    saveMaskState(next);
    setRevealedItems({});
  }, []);

  const handleCycleMask = useCallback(() => {
    setMaskState((prev) => {
      const next = cycleActiveRecallMask(prev);
      saveMaskState(next);
      return next;
    });
  }, []);

  const toggleRevealItem = useCallback((id: string, field: 'furigana' | 'burmese' | 'kanji') => {
    setRevealedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: !prev[id]?.[field],
      },
    }));
  }, []);

  // Keyboard shortcut: 'M' to cycle masking modes when not in input fields
  useEffect(() => {
    const handleMaskShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleCycleMask();
      }
    };

    window.addEventListener('keydown', handleMaskShortcut);
    return () => window.removeEventListener('keydown', handleMaskShortcut);
  }, [handleCycleMask]);

  // Load and aggregate vocabulary across all lesson packs for selectedLevel
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setDisplayCount(PAGE_SIZE);

    ContentLoader.getVocabularyForLevel(selectedLevel)
      .then((loadedWords) => {
        if (!isCancelled) {
          setWords(loadedWords);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(`[LevelBulkStudyScreen] Failed to load words for ${selectedLevel}:`, err);
        if (!isCancelled) {
          setWords([]);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedLevel]);

  // Search filtering by Kanji, Kana, English, or Burmese
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return words;

    return words.filter((v) => {
      const ja = (v.ja || '').toLowerCase();
      const kana = (v.kana || '').toLowerCase();
      const en = (v.en || '').toLowerCase();
      const burmese = getBurmeseMeaning(v).toLowerCase();

      return ja.includes(q) || kana.includes(q) || en.includes(q) || burmese.includes(q);
    });
  }, [words, searchQuery]);

  // Load and aggregate Kanji across all lesson packs for selectedLevel
  useEffect(() => {
    let isCancelled = false;
    setKanjiLoading(true);

    extractKanjiForLevel(selectedLevel)
      .then((loaded) => {
        if (!isCancelled) {
          setKanjiList(loaded);
          setKanjiLoading(false);
        }
      })
      .catch((err) => {
        console.error(`[LevelBulkStudyScreen] Failed to load kanji for ${selectedLevel}:`, err);
        if (!isCancelled) {
          setKanjiList([]);
          setKanjiLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedLevel]);

  // Available lessons from kanjiList
  const availableLessons = useMemo(() => {
    const set = new Set<string>();
    for (const k of kanjiList) {
      if (k.lessonId) set.add(k.lessonId);
    }
    return Array.from(set).sort();
  }, [kanjiList]);

  // Search, Filter & Sort for Kanji
  const filteredKanji = useMemo(() => {
    let result = kanjiList;

    // 1. Search filtering (supports Literal, Onyomi, Kunyomi, Burmese, English, and compound examples)
    const q = kanjiSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((k) => {
        const literal = (k.literal || '').toLowerCase();
        const onyomi = (k.onyomi || []).join(' ').toLowerCase();
        const kunyomi = (k.kunyomi || []).join(' ').toLowerCase();
        const burmese = (k.meaningBurmese || '').toLowerCase();
        const en = (k.meaningEn || '').toLowerCase();
        const inExamples = (k.examples || []).some(
          (ex) =>
            ex.word.toLowerCase().includes(q) ||
            ex.reading.toLowerCase().includes(q) ||
            ex.meaningBurmese.toLowerCase().includes(q)
        );

        return (
          literal.includes(q) ||
          onyomi.includes(q) ||
          kunyomi.includes(q) ||
          burmese.includes(q) ||
          en.includes(q) ||
          inExamples
        );
      });
    }

    // 2. Mastery Filter
    if (kanjiFilter === 'mastered') {
      result = result.filter((k) => masteredKanji.has(k.literal));
    } else if (kanjiFilter === 'unmastered') {
      result = result.filter((k) => !masteredKanji.has(k.literal));
    }

    // 3. Lesson Filter
    if (selectedLessonFilter !== 'all') {
      result = result.filter((k) => k.lessonId === selectedLessonFilter);
    }

    // 4. Sort
    if (kanjiSort === 'strokes_asc') {
      result = [...result].sort((a, b) => a.strokeCount - b.strokeCount);
    } else if (kanjiSort === 'strokes_desc') {
      result = [...result].sort((a, b) => b.strokeCount - a.strokeCount);
    }

    return result;
  }, [kanjiList, kanjiSearchQuery, kanjiFilter, selectedLessonFilter, kanjiSort, masteredKanji]);

  // Mastery counts
  const masteredCount = useMemo(
    () => kanjiList.filter((k) => masteredKanji.has(k.literal)).length,
    [kanjiList, masteredKanji]
  );
  const masteryPercent =
    kanjiList.length > 0 ? Math.round((masteredCount / kanjiList.length) * 100) : 0;

  // Toggle or mark Mastered kanji
  const toggleMastery = useCallback(
    (literal: string) => {
      setMasteredKanji((prev) => {
        const next = new Set(prev);
        if (next.has(literal)) {
          next.delete(literal);
        } else {
          next.add(literal);
        }
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `nihongo_mastered_kanji_${selectedLevel}`,
              JSON.stringify(Array.from(next))
            );
          }
        } catch (err) {
          console.error('Failed to save kanji mastery to localStorage', err);
        }
        return next;
      });
    },
    [selectedLevel]
  );

  const markMastered = useCallback(
    (literal: string) => {
      setMasteredKanji((prev) => {
        if (prev.has(literal)) return prev;
        const next = new Set(prev);
        next.add(literal);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `nihongo_mastered_kanji_${selectedLevel}`,
              JSON.stringify(Array.from(next))
            );
          }
        } catch (err) {
          console.error('Failed to save kanji mastery to localStorage', err);
        }
        return next;
      });
    },
    [selectedLevel]
  );

  // Synchronize Kanji flashcard drill deck
  useEffect(() => {
    if (isKanjiShuffled) {
      setKanjiDrillDeck(shuffleArray(filteredKanji));
    } else {
      setKanjiDrillDeck(filteredKanji);
    }
    setKanjiDrillIndex(0);
    setIsKanjiRevealed(false);
  }, [filteredKanji, isKanjiShuffled]);

  // Flashcard keyboard navigation
  useEffect(() => {
    if (bulkTab !== 'kanji' || kanjiViewMode !== 'flashcard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsKanjiRevealed((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setKanjiDrillIndex((prev) => Math.max(0, prev - 1));
        setIsKanjiRevealed(false);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setKanjiDrillIndex((prev) => Math.min(kanjiDrillDeck.length - 1, prev + 1));
        setIsKanjiRevealed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bulkTab, kanjiViewMode, kanjiDrillDeck.length]);

  // Start new Kanji Quiz session helper
  const startNewKanjiQuiz = useCallback((pool: KanjiCardItem[]) => {
    const qs = generateKanjiQuizSession(pool, 10);
    setKanjiQuizQuestions(qs);
    setKanjiQuizCurrentIndex(0);
    setKanjiQuizScore(0);
    setKanjiQuizSelectedOption(null);
    setIsKanjiQuizSubmitted(false);
    setIsKanjiQuizCompleted(false);
    setMissedKanjiList([]);
  }, []);

  const retryMissedKanji = useCallback(() => {
    if (missedKanjiList.length === 0) return;
    startNewKanjiQuiz(missedKanjiList);
  }, [missedKanjiList, startNewKanjiQuiz]);

  const handleSelectKanjiQuizOption = useCallback(
    (option: string) => {
      if (isKanjiQuizSubmitted || !kanjiQuizQuestions[kanjiQuizCurrentIndex]) return;

      setKanjiQuizSelectedOption(option);
      setIsKanjiQuizSubmitted(true);

      const currentQ = kanjiQuizQuestions[kanjiQuizCurrentIndex];
      const isCorrect = option === currentQ.correctAnswer;

      if (isCorrect) {
        setKanjiQuizScore((prev) => prev + 1);
        markMastered(currentQ.kanji.literal);
      } else {
        setMissedKanjiList((prev) => {
          if (prev.some((k) => k.literal === currentQ.kanji.literal)) return prev;
          return [...prev, currentQ.kanji];
        });
      }
    },
    [isKanjiQuizSubmitted, kanjiQuizQuestions, kanjiQuizCurrentIndex, markMastered]
  );

  const handleNextKanjiQuizQuestion = useCallback(() => {
    if (kanjiQuizCurrentIndex < kanjiQuizQuestions.length - 1) {
      setKanjiQuizCurrentIndex((prev) => prev + 1);
      setKanjiQuizSelectedOption(null);
      setIsKanjiQuizSubmitted(false);
    } else {
      setIsKanjiQuizCompleted(true);
    }
  }, [kanjiQuizCurrentIndex, kanjiQuizQuestions.length]);

  const currentKanjiDrill = kanjiDrillDeck[kanjiDrillIndex] || kanjiDrillDeck[0];
  const currentKanjiQuizQ = kanjiQuizQuestions[kanjiQuizCurrentIndex];

  // Synchronize drill deck with filtered words
  useEffect(() => {
    if (isShuffled) {
      setDrillDeck(shuffleArray(filteredWords));
    } else {
      setDrillDeck(filteredWords);
    }
    setDrillIndex(0);
    setIsRevealed(false);
  }, [filteredWords, isShuffled]);

  // Start new quiz session helper
  const startNewQuiz = useCallback((pool: Vocabulary[]) => {
    const qs = generateQuizSession(pool, 10);
    setQuizQuestions(qs);
    setQuizCurrentIndex(0);
    setQuizScore(0);
    setQuizSelectedOption(null);
    setIsQuizSubmitted(false);
    setIsQuizCompleted(false);
  }, []);

  // When switching levels or words change while in quiz mode, regenerate questions
  useEffect(() => {
    if (studyMode === 'quiz' && words.length > 0) {
      startNewQuiz(filteredWords.length > 0 ? filteredWords : words);
    }
  }, [selectedLevel, studyMode, words, filteredWords, startNewQuiz]);

  // Sliced view for snappy rendering performance in list view
  const displayedWords = useMemo(() => {
    return filteredWords.slice(0, displayCount);
  }, [filteredWords, displayCount]);

  const handleTogglePlay = useCallback(
    (vocab: Vocabulary) => {
      if (isPlaying && (currentPlayingText === vocab.ja || currentPlayingText === vocab.kana)) {
        stop();
      } else {
        play(vocab.ja, vocab.audio, undefined, vocab.kana);
      }
    },
    [isPlaying, currentPlayingText, play, stop]
  );

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  };

  const handleNextDrill = useCallback(() => {
    if (drillIndex < drillDeck.length - 1) {
      setDrillIndex((prev) => prev + 1);
      setIsRevealed(false);
    }
  }, [drillIndex, drillDeck.length]);

  const handlePrevDrill = useCallback(() => {
    if (drillIndex > 0) {
      setDrillIndex((prev) => prev - 1);
      setIsRevealed(false);
    }
  }, [drillIndex]);

  const handleHardLapseDrill = useCallback(() => {
    const currentWord = drillDeck[drillIndex];
    if (!currentWord) return;

    // 1. Optimistic & Non-blocking Quarantine write
    quarantineCard({
      id: currentWord.id,
      itemType: 'vocabulary',
      wordOrPattern: currentWord.ja,
      reading: currentWord.kana,
      meaningBurmese: getBurmeseMeaning(currentWord),
      meaningEn: currentWord.en,
      jlptLevel: selectedLevel,
      quarantineReason: 'HIGH_LAPSE_COUNT',
      pitchPattern: currentWord.pitchPattern,
      dropIndex: currentWord.dropIndex,
    }).catch((err) => {
      console.warn('[LevelBulkStudyScreen] Failed to quarantine lapsed card:', err);
    });

    // 2. Push back into session queue for immediate reinforcement
    setDrillDeck((prev) => [...prev, currentWord]);

    // 3. Show subtle notification
    setToastMessage({
      id: Date.now(),
      text: `👻 "${currentWord.ja}" ကို Ghost Card ထဲသို့ ထည့်သွင်းပြီး`,
    });

    // 4. Advance to the next card and reset reveal state
    setDrillIndex((prev) => prev + 1);
    setIsRevealed(false);
  }, [drillDeck, drillIndex, selectedLevel]);

  const handleToggleShuffle = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setDrillDeck(filteredWords);
    } else {
      setIsShuffled(true);
      setDrillDeck(shuffleArray(filteredWords));
    }
    setDrillIndex(0);
    setIsRevealed(false);
  };

  // Automatic audio pronunciation when card is revealed in Flashcard Drill Mode
  useEffect(() => {
    if (studyMode === 'drill' && isRevealed) {
      const v = drillDeck[drillIndex];
      if (v) {
        play(v.ja, v.audio, undefined, v.kana);
      }
    }
  }, [studyMode, isRevealed, drillIndex, drillDeck, play]);

  // Global keyboard shortcuts for Flashcard Drill Mode & Quiz Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (studyMode === 'drill' && drillDeck.length > 0) {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsRevealed((prev) => !prev);
        } else if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
          e.preventDefault();
          handleNextDrill();
        } else if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
          e.preventDefault();
          handlePrevDrill();
        } else if (e.key.toLowerCase() === 'h' || e.code === 'KeyH') {
          e.preventDefault();
          handleHardLapseDrill();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          const v = drillDeck[drillIndex];
          if (v) {
            play(v.ja, v.audio, undefined, v.kana);
          }
        }
      } else if (studyMode === 'quiz' && quizQuestions.length > 0 && !isQuizCompleted) {
        const currentQ = quizQuestions[quizCurrentIndex];
        if (!isQuizSubmitted && currentQ) {
          if (['1', '2', '3', '4'].includes(e.key)) {
            const optIdx = parseInt(e.key, 10) - 1;
            if (currentQ.options[optIdx]) {
              e.preventDefault();
              handleSelectQuizOption(currentQ.options[optIdx]);
            }
          }
        } else if (isQuizSubmitted) {
          if (e.code === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            handleNextQuizQuestion();
          }
        }

        if (e.key.toLowerCase() === 'r' && currentQ) {
          e.preventDefault();
          play(currentQ.vocab.ja, currentQ.vocab.audio, undefined, currentQ.vocab.kana);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    studyMode,
    drillIndex,
    drillDeck,
    handleNextDrill,
    handlePrevDrill,
    handleHardLapseDrill,
    quizQuestions,
    quizCurrentIndex,
    isQuizSubmitted,
    isQuizCompleted,
    play,
  ]);

  // Quiz Option Click Handler
  const handleSelectQuizOption = (option: string) => {
    if (isQuizSubmitted) return;

    const currentQ = quizQuestions[quizCurrentIndex];
    if (!currentQ) return;

    setQuizSelectedOption(option);
    setIsQuizSubmitted(true);

    const isCorrect = option === currentQ.correctAnswer;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      // Play speech synthesis on correct answer
      play(currentQ.vocab.ja, currentQ.vocab.audio, undefined, currentQ.vocab.kana);
    } else {
      // Optimistic & non-blocking quarantine write
      quarantineCard({
        id: currentQ.vocab.id,
        itemType: 'vocabulary',
        wordOrPattern: currentQ.vocab.ja,
        reading: currentQ.vocab.kana,
        meaningBurmese: getBurmeseMeaning(currentQ.vocab),
        meaningEn: currentQ.vocab.en,
        jlptLevel: selectedLevel,
        quarantineReason: 'MOCK_TEST_REPEATED_MISS',
        pitchPattern: currentQ.vocab.pitchPattern,
        dropIndex: currentQ.vocab.dropIndex,
      }).catch((err) => {
        console.warn('[LevelBulkStudyScreen] Failed to quarantine missed quiz card:', err);
      });

      setToastMessage({
        id: Date.now(),
        text: `👻 "${currentQ.vocab.ja}" ကို Ghost Card ထဲသို့ ထည့်သွင်းပြီး`,
      });
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizCurrentIndex < quizQuestions.length - 1) {
      setQuizCurrentIndex((prev) => prev + 1);
      setQuizSelectedOption(null);
      setIsQuizSubmitted(false);
    } else {
      setIsQuizCompleted(true);
    }
  };

  const currentDrillWord: Vocabulary | undefined = drillDeck[drillIndex];
  const currentQuizQ: QuizQuestion | undefined = quizQuestions[quizCurrentIndex];

  if (isStarScrambleOpen) {
    return (
      <div className={`space-y-6 max-w-4xl mx-auto pb-28 ${className}`}>
        <StarScrambleTrainer
          initialLevel={selectedLevel}
          onExit={() => setIsStarScrambleOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-28 ${className}`}>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer shadow-2xs"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Level Decks (単語帳)</span>
              </span>
              <span className="text-xs font-mono text-stone-500">
                {`JLPT ${selectedLevel} Bulk Study`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
              {bulkTab === 'vocab'
                ? `${selectedLevel} Comprehensive Vocabulary Deck`
                : `${selectedLevel} Kanji Deck & Stroke Visualizer`}
            </h1>
          </div>
        </div>

        {/* Primary Segmented Mode Selector: Vocabulary vs Kanji */}
        <div className="flex items-center p-1 bg-stone-200/80 border border-stone-300 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => setBulkTab('vocab')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-burmese font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              bulkTab === 'vocab'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>📖 ဝေါဟာရ (Vocabulary)</span>
          </button>
          <button
            type="button"
            onClick={() => setBulkTab('kanji')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-burmese font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
              bulkTab === 'kanji'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>🈁 ခန်းဂျီး (Kanji Deck)</span>
          </button>
        </div>

        {/* Header Right: Total Count Badge & Segmented 3-Mode Switcher */}
        {bulkTab === 'vocab' ? (
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-700 flex items-center gap-1.5 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>{`${selectedLevel} Deck: ${words.length} words`}</span>
            </span>

            {/* Star Grammar Puzzle Launcher */}
            <button
              type="button"
              onClick={() => setIsStarScrambleOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
              title="★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
              <span>★ Star Puzzle (ဝါကျစီ)</span>
            </button>

            {/* 3-Mode Segmented Switcher */}
            <div className="flex items-center space-x-1 p-1 bg-stone-200/80 border border-stone-300 rounded-2xl shadow-2xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setStudyMode('list')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  studyMode === 'list'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span>📜 စာရင်းကြည့် (List View)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudyMode('drill');
                  setIsRevealed(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  studyMode === 'drill'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span>🎴 Flashcard လေ့ကျင့်ရန် (Drill Mode)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudyMode('quiz');
                  startNewQuiz(filteredWords.length > 0 ? filteredWords : words);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  studyMode === 'quiz'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span>⚡ အမြန်စစ်ဆေးမေးခွန်း (Quiz Mode)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-xs font-mono text-stone-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{`${selectedLevel} Kanji: ${kanjiList.length} 字`}</span>
            </span>

            {/* Star Grammar Puzzle Launcher */}
            <button
              type="button"
              onClick={() => setIsStarScrambleOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
              title="★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />
              <span>★ Star Puzzle (ဝါကျစီ)</span>
            </button>

            {/* Kanji 3-Mode Segmented Switcher */}
            <div className="flex items-center space-x-1 p-1 bg-stone-200/80 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setKanjiViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  kanjiViewMode === 'grid'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>一覧 (Grid View)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setKanjiViewMode('flashcard');
                  setIsKanjiRevealed(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  kanjiViewMode === 'flashcard'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>🎴 フラッシュカード (Flashcards)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setKanjiViewMode('quiz');
                  startNewKanjiQuiz(filteredKanji.length > 0 ? filteredKanji : kanjiList);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  kanjiViewMode === 'quiz'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>⚡ クイズ (Kanji Quiz)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Header Controls: Level Selector & Sticky Search Bar (Visible across all tabs) */}
      <div className="sticky top-0 z-30 bg-stone-100/95 backdrop-blur-2xl border-y border-stone-200 py-3.5 px-1 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Level Selector Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            {JLPT_LEVELS.map((lvl) => {
              const active = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(lvl);
                    setSearchQuery('');
                    setKanjiSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600 scale-105'
                      : 'bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                >
                  <span>{`JLPT ${lvl}`}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
                </button>
              );
            })}
          </div>

          {/* Results Summary Counter */}
          <div className="text-xs font-mono text-stone-600 shrink-0">
            {bulkTab === 'vocab' ? (
              studyMode === 'quiz' ? (
                <span>
                  Active Quiz: <strong className="text-stone-900">{quizQuestions.length}</strong> questions sampled from {words.length} words
                </span>
              ) : searchQuery.trim() ? (
                <span>
                  Matching: <strong className="text-stone-900">{filteredWords.length}</strong> / {words.length} words
                </span>
              ) : (
                <span>
                  Showing: <strong className="text-stone-900">{Math.min(displayCount, words.length)}</strong> of {words.length} words
                </span>
              )
            ) : kanjiSearchQuery.trim() ? (
              <span>
                Matching: <strong className="text-stone-900">{filteredKanji.length}</strong> / {kanjiList.length} kanji
              </span>
            ) : (
              <span>
                Total: <strong className="text-stone-900">{kanjiList.length}</strong> kanji characters
              </span>
            )}
          </div>
        </div>

        {/* Search Bar with Instant Clear */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={bulkTab === 'vocab' ? searchQuery : kanjiSearchQuery}
            onChange={(e) => {
              if (bulkTab === 'vocab') {
                setSearchQuery(e.target.value);
              } else {
                setKanjiSearchQuery(e.target.value);
              }
            }}
            placeholder={
              bulkTab === 'vocab'
                ? `Search ${selectedLevel} words by Kanji (例: 行く), Kana (例: いく), English, or Burmese...`
                : `Search ${selectedLevel} kanji by Character (例: 学), Onyomi (例: ガク), Kunyomi, or Burmese...`
            }
            className="w-full bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-stone-900 dark:text-zinc-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition font-sans shadow-2xs"
          />
          {(bulkTab === 'vocab' ? searchQuery : kanjiSearchQuery) && (
            <button
              onClick={() => {
                if (bulkTab === 'vocab') {
                  setSearchQuery('');
                } else {
                  setKanjiSearchQuery('');
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Kanji Deck Specific Controls: Mastery Progress Bar & Sort/Filter Controls */}
        {bulkTab === 'kanji' && (
          <div className="space-y-3 pt-1">
            {/* 1. Mastery Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 font-myanmar">
                  Mastered (တတ်မြောက်ပြီး):
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {masteredCount} / {kanjiList.length} ({masteryPercent}%)
                </span>
              </div>
              <div className="w-full sm:w-56 bg-stone-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-stone-200 dark:border-zinc-700">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
            </div>

            {/* 2. Sort & Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-zinc-950 p-1 rounded-xl border border-stone-200 dark:border-zinc-800 font-myanmar">
                <button
                  type="button"
                  onClick={() => setKanjiFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    kanjiFilter === 'all'
                      ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold shadow-2xs'
                      : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                >
                  All (အားလုံး)
                </button>
                <button
                  type="button"
                  onClick={() => setKanjiFilter('unmastered')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    kanjiFilter === 'unmastered'
                      ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold shadow-2xs'
                      : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Unmastered (လေ့လာဆဲ)
                </button>
                <button
                  type="button"
                  onClick={() => setKanjiFilter('mastered')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    kanjiFilter === 'mastered'
                      ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold shadow-2xs'
                      : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                >
                  Mastered (တတ်မြောက်ပြီး)
                </button>
              </div>

              {/* Lesson Dropdown & Sort Dropdown */}
              <div className="flex items-center gap-2 flex-wrap font-sans">
                {availableLessons.length > 0 && (
                  <select
                    value={selectedLessonFilter}
                    onChange={(e) => setSelectedLessonFilter(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Lessons (သင်ခန်းစာအားလုံး)</option>
                    {availableLessons.map((lId) => (
                      <option key={lId} value={lId}>
                        {lId.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={kanjiSort}
                  onChange={(e) => setKanjiSort(e.target.value as KanjiSort)}
                  className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="default">Default Order (မူလအစဉ်)</option>
                  <option value="strokes_asc">Strokes: Low → High (ရေးချက် နည်း → များ)</option>
                  <option value="strokes_desc">Strokes: High → Low (ရေးချက် များ → နည်း)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Multi-Layer Active Recall Masking Bar */}
      {bulkTab === 'vocab' && studyMode !== 'quiz' && (
        <ActiveRecallMaskingBar
          maskState={maskState}
          onToggleFurigana={handleToggleFurigana}
          onToggleBurmese={handleToggleBurmese}
          onToggleKanji={handleToggleKanji}
          onResetAll={handleResetMasks}
          sticky={true}
        />
      )}

      {/* =========================================================================
          MAIN TAB 2: KANJI DECK VIEW
          ========================================================================= */}
      {bulkTab === 'kanji' ? (
        kanjiLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-500 font-mono">
              {`Loading JLPT ${selectedLevel} Kanji Deck...`}
            </p>
          </div>
        ) : filteredKanji.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3 shadow-sm">
            <Sparkles className="w-8 h-8 text-stone-400 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-zinc-200 font-myanmar">ရှာဖွေတွေ့ရှိသော ခန်းဂျီး မရှိပါ (No matching kanji found)</h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-md mx-auto">
              Try adjusting your search query or clear the filter to view all {selectedLevel} kanji characters.
            </p>
            {(kanjiSearchQuery || kanjiFilter !== 'all' || selectedLessonFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setKanjiSearchQuery('');
                  setKanjiFilter('all');
                  setSelectedLessonFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 border border-stone-300 dark:border-zinc-700 text-xs font-medium transition cursor-pointer mt-2 shadow-2xs"
              >
                Clear Filters & Search
              </button>
            )}
          </div>
        ) : kanjiViewMode === 'flashcard' ? (
          /* =========================================================================
             KANJI MODE 2: FLASHCARD DRILL
             ========================================================================= */
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Flashcard Header Controls */}
            <div className="flex items-center justify-between text-xs font-mono text-stone-600 dark:text-zinc-400 px-2">
              <span className="flex items-center gap-1.5 font-bold">
                <span>Card {kanjiDrillIndex + 1} of {kanjiDrillDeck.length}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsKanjiShuffled((prev) => !prev)}
                  className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs ${
                    isKanjiShuffled
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                  title="Shuffle Cards"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>
              </div>
            </div>

            {/* Flashcard Card Body */}
            {currentKanjiDrill && (
              <div
                onClick={() => setIsKanjiRevealed((prev) => !prev)}
                className="group relative min-h-[380px] bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center cursor-pointer shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all select-none"
              >
                {/* Top Badge Row */}
                <div className="w-full flex items-center justify-between">
                  <span className="text-xs font-mono text-stone-500 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-stone-200 dark:border-zinc-700">
                    {`画数: ${currentKanjiDrill.strokeCount}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {currentKanjiDrill.lessonId && (
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {currentKanjiDrill.lessonId.replace(/^n\d\./i, 'L').toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {currentKanjiDrill.jlptLevel}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMastery(currentKanjiDrill.literal);
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        masteredKanji.has(currentKanjiDrill.literal)
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-stone-300 dark:text-zinc-600 hover:text-amber-400'
                      }`}
                      title={masteredKanji.has(currentKanjiDrill.literal) ? 'တတ်မြောက်ပြီး (Mastered)' : 'လေ့လာဆဲ (Unmastered)'}
                    >
                      <CheckCircle2 className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>

                {/* Center Content */}
                <div className="my-auto py-4 space-y-4 w-full">
                  <div className="text-7xl sm:text-8xl font-japanese font-bold text-stone-900 dark:text-zinc-100 group-hover:scale-105 transition-transform">
                    {currentKanjiDrill.literal}
                  </div>

                  {!isKanjiRevealed ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 pt-4 font-myanmar">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      <span>နှိပ်၍ အဖြေနှင့် ရှင်းလင်းချက်ကြည့်ပါ (Click to Flip)</span>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 w-full text-left bg-stone-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-stone-200 dark:border-zinc-800"
                    >
                      {/* Readings */}
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 mr-1.5">音 (Onyomi):</span>
                          <span className="font-japanese text-stone-900 dark:text-zinc-100 font-bold">
                            {currentKanjiDrill.onyomi.length > 0 ? currentKanjiDrill.onyomi.join('、') : '—'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="font-mono font-semibold text-sky-600 dark:text-sky-400 mr-1.5">訓 (Kunyomi):</span>
                          <span className="font-japanese text-stone-900 dark:text-zinc-100 font-bold">
                            {currentKanjiDrill.kunyomi.length > 0 ? currentKanjiDrill.kunyomi.join('、') : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Meanings */}
                      <div className="pt-2 border-t border-stone-200 dark:border-zinc-800">
                        <div className="text-sm font-burmese font-bold text-stone-900 dark:text-zinc-100">
                          {currentKanjiDrill.meaningBurmese}
                        </div>
                        <div className="text-xs font-sans text-stone-600 dark:text-zinc-400 mt-0.5">
                          {currentKanjiDrill.meaningEn}
                        </div>
                      </div>

                      {/* Compound Examples */}
                      {currentKanjiDrill.examples && currentKanjiDrill.examples.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 dark:border-zinc-800 space-y-1.5">
                          <span className="text-[10px] font-mono uppercase text-stone-500 dark:text-zinc-400 block font-myanmar">
                            နမူနာ ဝေါဟာရများ (Compound Examples):
                          </span>
                          {currentKanjiDrill.examples.slice(0, 2).map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="flex items-center justify-between text-xs bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-zinc-800"
                            >
                              <div className="truncate">
                                <span className="font-japanese font-bold text-stone-900 dark:text-zinc-100">{ex.word}</span>
                                <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-japanese ml-1.5">【{ex.reading}】</span>
                                <span className="text-[11px] text-stone-700 dark:text-zinc-300 font-burmese ml-1.5">· {ex.meaningBurmese}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  play(ex.word, undefined, undefined, ex.reading);
                                }}
                                className="p-1 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 cursor-pointer transition rounded"
                                title={`TTS: ${ex.word}`}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="w-full pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedKanji(currentKanjiDrill);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-myanmar"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>ရေးချက်ကြည့်ရန် (Stroke Visualizer)</span>
                  </button>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-mono">
                    Space / Click to Flip
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setKanjiDrillIndex((prev) => Math.max(0, prev - 1));
                  setIsKanjiRevealed(false);
                }}
                disabled={kanjiDrillIndex === 0}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setIsKanjiRevealed((prev) => !prev)}
                className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isKanjiRevealed ? 'Hide Details' : 'Flip Card'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setKanjiDrillIndex((prev) => Math.min(kanjiDrillDeck.length - 1, prev + 1));
                  setIsKanjiRevealed(false);
                }}
                disabled={kanjiDrillIndex >= kanjiDrillDeck.length - 1}
                className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : kanjiViewMode === 'quiz' ? (
          /* =========================================================================
             KANJI MODE 3: INTERACTIVE KANJI QUIZ
             ========================================================================= */
          <div className="space-y-6 max-w-2xl mx-auto">
            {isKanjiQuizCompleted ? (
              /* Quiz Completion Summary Card */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-md"
              >
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <Trophy className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900 dark:text-zinc-100 font-myanmar">
                    ခန်းဂျီး စစ်ဆေးမေးခွန်း ပြီးဆုံးပါပြီ!
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-zinc-400">
                    JLPT {selectedLevel} Kanji Deck Quiz Session
                  </p>
                </div>

                <div className="bg-stone-50 dark:bg-zinc-950 p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 space-y-2">
                  <div className="text-4xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {kanjiQuizScore} / {kanjiQuizQuestions.length}
                  </div>
                  <div className="text-xs font-medium text-stone-600 dark:text-zinc-400 font-myanmar">
                    ရမှတ်: {Math.round((kanjiQuizScore / (kanjiQuizQuestions.length || 1)) * 100)}%
                  </div>
                  {kanjiQuizScore === kanjiQuizQuestions.length ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-myanmar pt-1">
                      ဂုဏ်ယူပါသည်! ဖြေဆိုခဲ့သော ခန်းဂျီးအားလုံးကို မှန်ကန်စွာ ဖြေဆိုနိုင်ခဲ့ပါသည်။
                    </p>
                  ) : (
                    <p className="text-xs text-stone-600 dark:text-zinc-400 font-myanmar pt-1">
                      မှားယွင်းခဲ့သော ခန်းဂျီး {missedKanjiList.length} လုံး ရှိပါသည်။
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {missedKanjiList.length > 0 && (
                    <button
                      type="button"
                      onClick={retryMissedKanji}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs font-myanmar"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>မှားယွင်းခဲ့သော ခန်းဂျီးများ ပြန်လည်ဖြေဆိုမည် ({missedKanjiList.length} လုံး)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startNewKanjiQuiz(filteredKanji.length > 0 ? filteredKanji : kanjiList)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs font-myanmar"
                  >
                    <Zap className="w-4 h-4" />
                    <span>မေးခွန်းအသစ် စတင်မည် (New Quiz)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKanjiViewMode('grid')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-medium transition cursor-pointer font-myanmar"
                  >
                    <span>ခန်းဂျီးစာရင်းသို့ ပြန်သွားမည်</span>
                  </button>
                </div>
              </motion.div>
            ) : currentKanjiQuizQ ? (
              /* Active Quiz Question Card */
              <div className="space-y-4">
                {/* Progress Header */}
                <div className="flex items-center justify-between text-xs font-mono text-stone-600 dark:text-zinc-400 px-1">
                  <span>
                    Question {kanjiQuizCurrentIndex + 1} of {kanjiQuizQuestions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Score: {kanjiQuizScore}
                    </span>
                  </div>
                </div>

                {/* Question Prompt Card */}
                <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-md">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
                      {currentKanjiQuizQ.kanji.jlptLevel}
                    </span>
                    {currentKanjiQuizQ.kanji.lessonId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                        {currentKanjiQuizQ.kanji.lessonId.replace(/^n\d\./i, 'L').toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-stone-500 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-stone-200 dark:border-zinc-700">
                      {`画数: ${currentKanjiQuizQ.kanji.strokeCount}`}
                    </span>
                  </div>

                  <div className="py-2">
                    {currentKanjiQuizQ.type === 'meaning_to_kanji' ? (
                      <div className="space-y-1">
                        <span className="text-2xl sm:text-3xl font-burmese font-bold text-stone-900 dark:text-zinc-100">
                          {currentKanjiQuizQ.prompt}
                        </span>
                        {currentKanjiQuizQ.promptSub && (
                          <p className="text-xs text-stone-500 dark:text-zinc-400 font-japanese">
                            {currentKanjiQuizQ.promptSub}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-6xl sm:text-7xl font-japanese font-bold text-stone-900 dark:text-zinc-100 inline-block">
                          {currentKanjiQuizQ.prompt}
                        </span>
                        {currentKanjiQuizQ.promptSub && (
                          <p className="text-xs text-stone-500 dark:text-zinc-400 font-myanmar">
                            {currentKanjiQuizQ.promptSub}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4-Choice Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentKanjiQuizQ.options.map((option, optIdx) => {
                    const isSelected = kanjiQuizSelectedOption === option;
                    const isCorrect = option === currentKanjiQuizQ.correctAnswer;

                    let btnClass =
                      'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-200 hover:border-indigo-400 hover:bg-stone-50 dark:hover:bg-zinc-800/60';

                    if (isKanjiQuizSubmitted) {
                      if (isCorrect) {
                        btnClass =
                          'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/50';
                      } else if (isSelected && !isCorrect) {
                        btnClass =
                          'bg-rose-50 dark:bg-rose-950/60 border-rose-500 dark:border-rose-600 text-rose-900 dark:text-rose-200';
                      } else {
                        btnClass =
                          'bg-stone-50/50 dark:bg-zinc-900/40 border-stone-200 dark:border-zinc-800 text-stone-400 dark:text-zinc-500 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectKanjiQuizOption(option)}
                        disabled={isKanjiQuizSubmitted}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs ${btnClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {optIdx + 1}
                          </span>
                          <span className={`text-sm ${currentKanjiQuizQ.type === 'meaning_to_kanji' ? 'text-2xl font-japanese font-bold' : 'font-japanese'}`}>
                            {option}
                          </span>
                        </div>
                        {isKanjiQuizSubmitted && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        {isKanjiQuizSubmitted && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Next Step */}
                {isKanjiQuizSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-2"
                  >
                    <div className="bg-stone-50 dark:bg-zinc-950 p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-japanese font-bold text-stone-900 dark:text-zinc-100">
                            {currentKanjiQuizQ.kanji.literal}
                          </span>
                          <span className="font-mono text-stone-500 dark:text-zinc-400">
                            【{formatKanjiReadings(currentKanjiQuizQ.kanji)}】
                          </span>
                        </div>
                        <span className="font-burmese font-bold text-stone-800 dark:text-zinc-200">
                          {currentKanjiQuizQ.kanji.meaningBurmese}
                        </span>
                      </div>
                      {currentKanjiQuizQ.kanji.examples && currentKanjiQuizQ.kanji.examples.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 dark:border-zinc-800 flex items-center gap-2 flex-wrap">
                          <span className="text-stone-500 dark:text-zinc-400 font-myanmar">နမူနာ:</span>
                          {currentKanjiQuizQ.kanji.examples.slice(0, 2).map((ex, exIdx) => (
                            <span key={exIdx} className="bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-stone-200 dark:border-zinc-800 font-japanese text-stone-800 dark:text-zinc-200">
                              {ex.word} ({ex.reading}) - {ex.meaningBurmese}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextKanjiQuizQuestion}
                        className="px-6 py-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer font-myanmar"
                      >
                        <span>
                          {kanjiQuizCurrentIndex < kanjiQuizQuestions.length - 1
                            ? 'နောက်မေးခွန်းသို့ (Next)'
                            : 'ရလဒ်ကို ကြည့်မည် (View Results)'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* =========================================================================
             KANJI MODE 1: ENHANCED GRID VIEW
             ========================================================================= */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredKanji.map((k) => (
                <div
                  key={k.id}
                  onClick={() => setSelectedKanji(k)}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 p-4 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer hover:scale-[1.01] shadow-sm flex flex-col justify-between"
                >
                  {/* Top: Stroke count badge & JLPT Level & Lesson badge & Mastered toggle */}
                  <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
                    <span className="text-[10px] font-mono text-stone-500 dark:text-zinc-400 bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
                      {`画数: ${k.strokeCount}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {k.lessonId && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {k.lessonId.replace(/^n\d\./i, 'L').toUpperCase()}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                        {k.jlptLevel}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMastery(k.literal);
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          masteredKanji.has(k.literal)
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-stone-300 dark:text-zinc-600 hover:text-amber-400'
                        }`}
                        title={masteredKanji.has(k.literal) ? 'တတ်မြောက်ပြီး (Mastered)' : 'လေ့လာဆဲ (Unmastered)'}
                      >
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Center: Prominent Kanji character */}
                  <div className="my-2 text-center">
                    <span className="text-4xl sm:text-5xl font-japanese font-bold text-stone-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 transition-transform duration-300 inline-block">
                      {k.literal}
                    </span>
                  </div>

                  {/* Bottom: On/Kun readings & Burmese meaning */}
                  <div className="space-y-1 pt-2 border-t border-stone-200 dark:border-zinc-800 text-left">
                    <div className="flex items-baseline gap-1 text-[11px] truncate">
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 font-mono shrink-0">音:</span>
                      <span className="font-japanese text-stone-800 dark:text-zinc-200 truncate">
                        {k.onyomi && k.onyomi.length > 0 ? k.onyomi.join('、') : '—'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 text-[11px] truncate">
                      <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 font-mono shrink-0">訓:</span>
                      <span className="font-japanese text-stone-800 dark:text-zinc-200 truncate">
                        {k.kunyomi && k.kunyomi.length > 0 ? k.kunyomi.join('、') : '—'}
                      </span>
                    </div>
                    <div className="font-burmese text-xs text-stone-700 dark:text-zinc-300 font-medium line-clamp-1 pt-0.5">
                      {k.meaningBurmese}
                    </div>
                  </div>

                  {/* Top Compound Examples (1-2) with TTS */}
                  {k.examples && k.examples.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-100 dark:border-zinc-800 space-y-1 text-left">
                      {k.examples.slice(0, 2).map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="flex items-center justify-between text-[11px] gap-1 group/ex bg-stone-50 dark:bg-zinc-800/50 rounded-lg px-2 py-1"
                        >
                          <div className="truncate">
                            <span className="font-japanese font-bold text-stone-900 dark:text-zinc-100">{ex.word}</span>
                            <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-japanese ml-1">【{ex.reading}】</span>
                            <span className="text-[10px] text-stone-600 dark:text-zinc-300 font-burmese ml-1">· {ex.meaningBurmese}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              play(ex.word, undefined, undefined, ex.reading);
                            }}
                            className="p-1 text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 cursor-pointer transition rounded"
                            title={`TTS: ${ex.word}`}
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ) : loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-mono">
            {`Loading JLPT ${selectedLevel} comprehensive vocabulary deck...`}
          </p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <Sparkles className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-sm font-semibold text-stone-800">No matching vocabulary found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Try adjusting your search query or clear the filter to view all {selectedLevel} words.
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer mt-2 shadow-xs"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : studyMode === 'quiz' ? (
        /* =========================================================================
           STUDY MODE 3: QUICK MULTIPLE-CHOICE VOCABULARY QUIZ
           ========================================================================= */
        <div className="space-y-6 max-w-2xl mx-auto">
          {isQuizCompleted ? (
            /* QUIZ COMPLETION SUMMARY CARD */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-700 font-semibold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  JLPT {selectedLevel} Quiz Completed
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-myanmar pt-1">
                  စစ်ဆေးမှု ပြီးဆုံးပါပြီ!
                </h2>
                <p className="text-xs text-stone-600 font-sans">
                  {quizScore >= 8
                    ? 'ဂုဏ်ယူပါတယ်! ထူးချွန်စွာ အောင်မြင်ပါသည် 🌟'
                    : quizScore >= 5
                    ? 'ကောင်းမွန်သော ကြိုးစားမှုဖြစ်သည်! ဆက်လက်လေ့ကျင့်ပါ 💪'
                    : 'နောက်တစ်ကြိမ် ပြန်လည်လေ့ကျင့်ကြည့်ပါ 📖'}
                </p>
              </div>

              {/* Score Metric Cards */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <span className="text-xs text-stone-600 font-sans block">Score / ရမှတ်</span>
                  <span className="text-2xl font-bold font-mono text-stone-900">
                    {quizScore} / {quizQuestions.length}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <span className="text-xs text-stone-600 font-sans block">Accuracy / တိကျမှု</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600">
                    {quizQuestions.length > 0 ? Math.round((quizScore / quizQuestions.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => startNewQuiz(filteredWords.length > 0 ? filteredWords : words)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>🔄 ပြန်လည်ဖြေဆိုမည် (Retry)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyMode('list')}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs border border-stone-200 transition cursor-pointer shadow-xs"
                >
                  📜 စာရင်းကြည့်မည် (List View)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudyMode('drill');
                    setIsRevealed(false);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs border border-stone-200 transition cursor-pointer shadow-xs"
                >
                  🎴 Flashcard လေ့ကျင့်မည်
                </button>
              </div>
            </motion.div>
          ) : currentQuizQ ? (
            /* ACTIVE QUIZ QUESTION VIEW */
            <div className="space-y-4">
              {/* Quiz Progress & Score Header */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-700 font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Question {quizCurrentIndex + 1} / {quizQuestions.length}</span>
                  </span>
                  <span className="text-stone-600">
                    Score: <strong className="text-emerald-600 font-bold">{quizScore}</strong> / {quizCurrentIndex + (isQuizSubmitted ? 1 : 0)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(((quizCurrentIndex + (isQuizSubmitted ? 1 : 0)) / quizQuestions.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Central Prompt Card */}
              <motion.div
                key={currentQuizQ.vocab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm relative"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                    JLPT {selectedLevel}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500 uppercase px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                    {currentQuizQ.vocab.pos || 'vocabulary'}
                  </span>
                </div>

                {/* Question Prompt Headword */}
                <div className="py-2 space-y-2">
                  <h2 className="font-japanese text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                    {currentQuizQ.vocab.ja}
                  </h2>

                  {/* Furigana Reading & Pitch Accent (Revealed after submission) */}
                  {isQuizSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-2 pt-1"
                    >
                      <div>
                        <span className="text-indigo-700 font-japanese text-lg font-bold bg-indigo-50 px-4 py-1 rounded-full border border-indigo-200 inline-block shadow-inner">
                          【{currentQuizQ.vocab.kana}】
                        </span>
                      </div>

                      {currentQuizQ.vocab.pitchPattern && currentQuizQ.vocab.dropIndex !== undefined && (
                        <div className="flex justify-center py-1">
                          <PitchAccentVisualizer
                            text={currentQuizQ.vocab.kana || currentQuizQ.vocab.ja}
                            pattern={currentQuizQ.vocab.pitchPattern}
                            dropIndex={currentQuizQ.vocab.dropIndex}
                            compact={true}
                            showBadge={true}
                            showContour={true}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Prompt Audio Playback Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(currentQuizQ.vocab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                      isPlaying &&
                      (currentPlayingText === currentQuizQ.vocab.ja ||
                        currentPlayingText === currentQuizQ.vocab.kana)
                        ? 'bg-indigo-600 text-white shadow-sm animate-pulse'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Pronounce</span>
                    <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 border border-stone-300 font-mono text-stone-600">
                      R
                    </kbd>
                  </button>
                </div>
              </motion.div>

              {/* 4 Choices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuizQ.options.map((option, optIdx) => {
                  const isSelected = quizSelectedOption === option;
                  const isCorrect = option === currentQuizQ.correctAnswer;

                  let optionStyle =
                    'bg-white hover:bg-stone-50 hover:border-stone-300 border-stone-200 text-stone-800 cursor-pointer shadow-xs';

                  if (isQuizSubmitted) {
                    if (isCorrect) {
                      optionStyle =
                        'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs';
                    } else if (isSelected) {
                      optionStyle =
                        'bg-rose-50 border-rose-300 text-rose-900 shadow-xs';
                    } else {
                      optionStyle = 'bg-stone-50 border-stone-200 text-stone-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isQuizSubmitted}
                      onClick={() => handleSelectQuizOption(option)}
                      className={`p-4 rounded-2xl border transition text-left flex items-center justify-between gap-2.5 ${optionStyle}`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center font-mono text-xs text-stone-600 shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <p className="font-burmese text-sm sm:text-base font-medium truncate">
                          {option}
                        </p>
                      </div>

                      {isQuizSubmitted && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isQuizSubmitted && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Banner & Next Button */}
              {isQuizSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pt-2"
                >
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      quizSelectedOption === currentQuizQ.correctAnswer
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="text-xs font-sans">
                      {quizSelectedOption === currentQuizQ.correctAnswer ? (
                        <span className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>🎉 မှန်ကန်ပါသည်! (Correct!)</span>
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>❌ မှားယွင်းပါသည်။</span>
                          </div>
                          <p className="font-burmese text-xs text-rose-700">
                            အဖြေမှန်: {currentQuizQ.correctAnswer}
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-[11px] font-mono text-rose-800 mt-1 shadow-inner">
                            <span>👻</span>
                            <span className="font-burmese">Ghost Card ထဲသို့ ထည့်သွင်းပြီး</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextQuizQuestion}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center space-x-1.5 shrink-0"
                    >
                      <span>
                        {quizCurrentIndex < quizQuestions.length - 1
                          ? 'Next Question'
                          : 'View Results'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="text-center text-[11px] font-mono text-stone-500 pt-1">
                Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">1</kbd>–<kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">4</kbd> Pick Option • <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">Space</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">Enter</kbd> Next Question • <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">R</kbd> Pronounce
              </div>
            </div>
          ) : null}
        </div>
      ) : studyMode === 'drill' ? (
        /* =========================================================================
           STUDY MODE 2: INTERACTIVE FLASHCARD DRILL VIEW
           ========================================================================= */
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Progress Header & Shuffle Toolbar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-stone-700 font-semibold flex items-center gap-1.5">
                <span>Card {drillIndex + 1} / {drillDeck.length}</span>
                {isShuffled && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-mono border border-amber-200">
                    Shuffled 🔀
                  </span>
                )}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleToggleShuffle}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center space-x-1.5 ${
                    isShuffled
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-xs'
                  }`}
                  title="Randomize card sequence"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isShuffled ? 'Shuffled' : 'Shuffle (မွှေမည်)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrillIndex(0);
                    setIsRevealed(false);
                  }}
                  className="p-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 border border-stone-200 cursor-pointer shadow-xs"
                  title="Reset to first card"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((drillIndex + 1) / Math.max(1, drillDeck.length)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Central Tactile Flashcard Container */}
          {currentDrillWord && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentDrillWord.id}-${isRevealed ? 'revealed' : 'hidden'}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsRevealed((prev) => !prev)}
                className="bg-white border border-stone-200 hover:border-stone-300 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm relative overflow-hidden cursor-pointer select-none group min-h-[360px] flex flex-col justify-between"
              >
                {/* Top Card Meta Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                      JLPT {selectedLevel}
                    </span>
                    {currentDrillWord.lessonId && (
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono text-[10px] border border-stone-200 uppercase">
                        {currentDrillWord.lessonId}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 uppercase px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                    {currentDrillWord.pos || 'vocabulary'}
                  </span>
                </div>

                {/* Main Card Content: Front vs Back */}
                {!isRevealed ? (
                  /* FRONT SIDE */
                  <div className="space-y-4 py-8">
                    <h2 className="font-japanese text-5xl sm:text-6xl font-extrabold text-stone-900 tracking-tight">
                      {currentDrillWord.ja}
                    </h2>
                    <p className="text-xs text-stone-600 font-sans">
                      💡 နှိပ်၍ အဖြေကြည့်ပါ (Click or press Space to reveal answer)
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRevealed(true);
                        }}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer inline-flex items-center space-x-2 border border-indigo-500/30"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Show Answer (အဖြေကြည့်မည်)</span>
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700/60 border border-indigo-400 font-mono text-white">
                          Space
                        </kbd>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* BACK SIDE (REVEALED) */
                  <div className="space-y-5 py-4">
                    {/* Headword & Furigana Kana Reading */}
                    <div className="space-y-2">
                      <h2
                        onClick={(e) => {
                          if (maskState.hideKanji) {
                            e.stopPropagation();
                            toggleRevealItem(currentDrillWord.id, 'kanji');
                          }
                        }}
                        className={`font-japanese text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight transition duration-200 ${
                          maskState.hideKanji && !revealedItems[currentDrillWord.id]?.kanji
                            ? 'filter blur-md select-none cursor-pointer'
                            : ''
                        }`}
                        title={maskState.hideKanji && !revealedItems[currentDrillWord.id]?.kanji ? 'Tap to reveal Kanji' : undefined}
                      >
                        {currentDrillWord.ja}
                      </h2>
                      <div>
                        <span
                          onClick={(e) => {
                            if (maskState.hideFurigana) {
                              e.stopPropagation();
                              toggleRevealItem(currentDrillWord.id, 'furigana');
                            }
                          }}
                          className={`text-indigo-700 font-japanese text-xl font-bold bg-indigo-50 px-4 py-1 rounded-full border border-indigo-200 inline-block shadow-inner transition duration-200 ${
                            maskState.hideFurigana && !revealedItems[currentDrillWord.id]?.furigana
                              ? 'filter blur-md select-none cursor-pointer hover:bg-indigo-100'
                              : ''
                          }`}
                          title={maskState.hideFurigana && !revealedItems[currentDrillWord.id]?.furigana ? 'Tap to reveal Furigana' : undefined}
                        >
                          【{currentDrillWord.kana}】
                        </span>
                      </div>
                    </div>

                    {/* Pitch Accent Visualizer */}
                    {currentDrillWord.pitchPattern && currentDrillWord.dropIndex !== undefined && (
                      <div className="flex justify-center py-1">
                        <PitchAccentVisualizer
                          text={currentDrillWord.kana || currentDrillWord.ja}
                          pattern={currentDrillWord.pitchPattern}
                          dropIndex={currentDrillWord.dropIndex}
                          compact={false}
                          showBadge={true}
                          showContour={true}
                        />
                      </div>
                    )}

                    {/* Pronunciation Audio Button */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePlay(currentDrillWord);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-2 ${
                          isPlaying &&
                          (currentPlayingText === currentDrillWord.ja ||
                            currentPlayingText === currentDrillWord.kana)
                            ? 'bg-indigo-600 text-white shadow-sm animate-pulse'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Replay Audio</span>
                        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 border border-stone-300 font-mono text-stone-600">
                          R
                        </kbd>
                      </button>
                    </div>

                    {/* Burmese & English Meanings */}
                    <div className="pt-4 border-t border-stone-200 space-y-1.5">
                      <p
                        onClick={(e) => {
                          if (maskState.hideBurmese) {
                            e.stopPropagation();
                            toggleRevealItem(currentDrillWord.id, 'burmese');
                          }
                        }}
                        className={`font-burmese text-emerald-700 text-xl font-bold leading-relaxed transition duration-200 ${
                          maskState.hideBurmese && !revealedItems[currentDrillWord.id]?.burmese
                            ? 'filter blur-md select-none cursor-pointer'
                            : ''
                        }`}
                        title={maskState.hideBurmese && !revealedItems[currentDrillWord.id]?.burmese ? 'Tap to reveal Burmese' : undefined}
                      >
                        {getBurmeseMeaning(currentDrillWord)}
                      </p>
                      {currentDrillWord.en && (
                        <p className="text-stone-600 text-xs sm:text-sm font-sans leading-normal">
                          {currentDrillWord.en}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Card Footer Hint */}
                <div className="text-[11px] font-mono text-stone-500 pt-2 border-t border-stone-200 flex items-center justify-between">
                  <span>{isRevealed ? 'Answer revealed' : 'Card hidden'}</span>
                  <span>Click card to {isRevealed ? 'hide' : 'flip'}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Flashcard Drill Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrevDrill}
              disabled={drillIndex === 0}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-stone-50 disabled:opacity-30 text-stone-700 text-xs font-semibold border border-stone-200 transition cursor-pointer flex items-center space-x-2 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous (ရှေ့သို့)</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-stone-500 hidden sm:inline">
                ←
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsRevealed((prev) => !prev)}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{isRevealed ? 'Hide (ဝှက်မည်)' : 'Flip (လှန်မည်)'}</span>
            </button>

            {/* Hard / Not Remembered (Lapse) Action Button */}
            <button
              type="button"
              onClick={handleHardLapseDrill}
              className="px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300 shadow-xs transition cursor-pointer flex items-center space-x-2"
              title="Mark as hard, push to Quarantine engine, and review again later in this session"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-burmese">ခက်ခဲသည် / မမှတ်မိပါ (Hard)</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-amber-800 hidden sm:inline">
                H
              </kbd>
            </button>

            <button
              type="button"
              onClick={handleNextDrill}
              disabled={drillIndex >= drillDeck.length - 1}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center space-x-2"
            >
              <span>Next (နောက်သို့)</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-700 border border-indigo-400 font-mono text-indigo-100 hidden sm:inline">
                →
              </kbd>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Keyboard Legend */}
          <div className="text-center text-[11px] font-mono text-stone-500 pt-2">
            Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">Space</kbd> Flip / Reveal • <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">→</kbd> Prev / Next • <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">H</kbd> Hard / Lap • <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">R</kbd> Pronounce
          </div>
        </div>
      ) : (
        /* =========================================================================
           STUDY MODE 1: RESPONSIVE CARD GRID (LIST VIEW)
           ========================================================================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedWords.map((v) => {
              const burmeseMeaning = getBurmeseMeaning(v);
              const isItemPlaying =
                isPlaying && (currentPlayingText === v.ja || currentPlayingText === v.kana);

              return (
                <div
                  key={v.id}
                  className="bg-white border border-stone-200 hover:border-indigo-300 rounded-2xl p-5 transition shadow-sm flex flex-col justify-between space-y-3.5 group relative overflow-hidden"
                >
                  {/* Top Row: Headword & Audio Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {/* Large Headword & Kana Reading in Furigana Style */}
                      <div className="flex items-baseline space-x-2 flex-wrap">
                        <span
                          onClick={(e) => {
                            if (maskState.hideKanji) {
                              e.stopPropagation();
                              toggleRevealItem(v.id, 'kanji');
                            }
                          }}
                          className={`font-japanese text-xl text-stone-900 font-bold tracking-tight transition duration-200 ${
                            maskState.hideKanji && !revealedItems[v.id]?.kanji
                              ? 'filter blur-md select-none cursor-pointer bg-stone-100 dark:bg-zinc-800 px-2 rounded hover:bg-stone-200'
                              : ''
                          }`}
                          title={maskState.hideKanji && !revealedItems[v.id]?.kanji ? 'Tap to reveal Kanji' : undefined}
                        >
                          {v.ja}
                        </span>
                        <span
                          onClick={(e) => {
                            if (maskState.hideFurigana) {
                              e.stopPropagation();
                              toggleRevealItem(v.id, 'furigana');
                            }
                          }}
                          className={`text-indigo-700 dark:text-indigo-300 font-japanese text-sm font-semibold transition duration-200 ${
                            maskState.hideFurigana && !revealedItems[v.id]?.furigana
                              ? 'filter blur-md select-none cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 px-2 rounded hover:bg-indigo-100'
                              : ''
                          }`}
                          title={maskState.hideFurigana && !revealedItems[v.id]?.furigana ? 'Tap to reveal Furigana' : undefined}
                        >
                          【{v.kana}】
                        </span>
                      </div>

                      {/* Part of Speech & Lesson badge */}
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-stone-500 pt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200 text-stone-600">
                          {v.pos || 'vocab'}
                        </span>
                        {v.lessonId && (
                          <span className="px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200 text-stone-600 uppercase">
                            {v.lessonId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Audio Playback Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(v)}
                      className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                        isItemPlaying
                          ? 'bg-indigo-600 text-white shadow-sm animate-pulse'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200'
                      }`}
                      title="Listen to Japanese pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pitch Accent Visualizer (when present) */}
                  {v.pitchPattern && v.dropIndex !== undefined && (
                    <div className="pt-0.5">
                      <PitchAccentVisualizer
                        text={v.kana || v.ja}
                        pattern={v.pitchPattern}
                        dropIndex={v.dropIndex}
                        compact={true}
                        showBadge={true}
                        showContour={true}
                      />
                    </div>
                  )}

                  {/* Burmese & English Meanings */}
                  <div className="pt-2.5 border-t border-stone-200 space-y-1">
                    {burmeseMeaning && (
                      <p
                        onClick={(e) => {
                          if (maskState.hideBurmese) {
                            e.stopPropagation();
                            toggleRevealItem(v.id, 'burmese');
                          }
                        }}
                        className={`font-burmese text-stone-800 text-sm font-medium leading-relaxed transition duration-200 ${
                          maskState.hideBurmese && !revealedItems[v.id]?.burmese
                            ? 'filter blur-md select-none cursor-pointer bg-stone-100 dark:bg-zinc-800 px-2 rounded hover:bg-stone-200'
                            : ''
                        }`}
                        title={maskState.hideBurmese && !revealedItems[v.id]?.burmese ? 'Tap to reveal Burmese' : undefined}
                      >
                        {burmeseMeaning}
                      </p>
                    )}
                    {v.en && (
                      <p className="text-stone-600 text-xs leading-normal">
                        {v.en}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button when items exceed displayCount */}
          {filteredWords.length > displayCount && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 text-xs font-semibold text-stone-700 hover:text-stone-900 transition shadow-sm cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Show More ({filteredWords.length - displayCount} remaining)</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Kanji Detail & Stroke Visualizer Modal */}
      <KanjiDetailModal
        kanji={selectedKanji}
        isOpen={Boolean(selectedKanji)}
        onClose={() => setSelectedKanji(null)}
      />

      {/* Subtle Floating Toast Notification for Ghost Card Quarantine */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-rose-200 shadow-xl text-rose-800 text-xs font-medium flex items-center space-x-2.5 shadow-stone-400/20"
          >
            <span className="text-base">👻</span>
            <span className="font-burmese leading-relaxed">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
