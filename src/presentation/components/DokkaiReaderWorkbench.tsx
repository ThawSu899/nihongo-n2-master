import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Zap,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Highlighter,
  Eraser,
  Eye,
  EyeOff,
  Type,
  Target,
  Plus,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Award,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  DokkaiPassageModel,
  DokkaiSentence,
  DokkaiGlossaryItem,
  CURATED_DOKKAI_CATALOG,
} from '../../domain/assessment/dokkai-catalog';
import { db } from '../../data/db/dexie-db';
import { useGlobalShortcuts, useScopedShortcuts } from '../context/GlobalShortcutContext';
import { SRSCard } from '../../domain/models/types';
import { KanjiDetail, getOrDecomposeKanji, isKanjiChar } from '../../domain/dictionary/kanji-catalog';
import { KanjiDrawer } from './KanjiDrawer';

export type HighlightTool = 'claim' | 'evidence' | 'contrast' | 'eraser' | null;

const toBurmeseNumeral = (num: number | string): string => {
  const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return String(num).replace(/[0-9]/g, (d) => burmeseDigits[parseInt(d, 10)]);
};

interface HighlightRecord {
  type: 'claim' | 'evidence' | 'contrast';
  note?: string;
}

interface DokkaiReaderWorkbenchProps {
  passage?: DokkaiPassageModel;
  onExit?: () => void;
  onComplete?: (summary: {
    passageId: string;
    elapsedSeconds: number;
    cpm: number;
    accuracy: number;
    correctCount: number;
    totalQuestions: number;
    minedCardsCount: number;
  }) => void;
  embeddedMode?: boolean; // When rendered inside Stage 8 of LessonPlayer
  availablePassages?: DokkaiPassageModel[];
}

export const DokkaiReaderWorkbench: React.FC<DokkaiReaderWorkbenchProps> = ({
  passage: initialPassage,
  onExit,
  onComplete,
  embeddedMode = false,
  availablePassages = CURATED_DOKKAI_CATALOG,
}) => {
  // Current active passage
  const [selectedPassageId, setSelectedPassageId] = useState<string>(
    initialPassage?.id || availablePassages[0]?.id || CURATED_DOKKAI_CATALOG[0].id
  );

  const activePassage = useMemo<DokkaiPassageModel>(() => {
    if (initialPassage && initialPassage.id === selectedPassageId) {
      return initialPassage;
    }
    const found = availablePassages.find((p) => p.id === selectedPassageId);
    return found || initialPassage || CURATED_DOKKAI_CATALOG[0];
  }, [initialPassage, availablePassages, selectedPassageId]);

  // Typography & Reader display settings
  const [showFurigana, setShowFurigana] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<'mincho' | 'gothic'>('mincho');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Interactive Highlighter Tool: 'claim' (筆者の主張), 'evidence' (根拠), 'contrast' (逆説・対比), 'eraser'
  const [activeHighlightTool, setActiveHighlightTool] = useState<HighlightTool>('claim');
  const [userSentenceHighlights, setUserSentenceHighlights] = useState<Record<string, HighlightRecord>>({});

  // Questions and Answering State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedEvidenceForQuestion, setRevealedEvidenceForQuestion] = useState<string | null>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showSessionSummary, setShowSessionSummary] = useState<boolean>(false);

  // Timer & CPM Tracking
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const timerRef = useRef<any>(null);

  // Vocab Miner Popover State
  const [minerPopover, setMinerPopover] = useState<{
    item: DokkaiGlossaryItem;
    sentenceContext: string;
    position: { x: number; y: number };
  } | null>(null);
  const [minedCardIds, setMinedCardIds] = useState<Set<string>>(new Set());
  const [miningStatus, setMiningStatus] = useState<string | null>(null);

  // Kanji Slide-Over Drawer State
  const [selectedKanji, setSelectedKanji] = useState<KanjiDetail | null>(null);
  const [selectedKanjiContext, setSelectedKanjiContext] = useState<string | undefined>(undefined);

  // Sentence DOM element refs for smooth scrolling to evidence
  const sentenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  // Reset state when passage changes
  useEffect(() => {
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setRevealedEvidenceForQuestion(null);
    setSubmittedQuestions({});
    setShowSessionSummary(false);
    setUserSentenceHighlights({});
    setMinerPopover(null);
    setSelectedKanji(null);
    setSelectedKanjiContext(undefined);
  }, [activePassage.id]);

  // Timer tick
  useEffect(() => {
    if (isTimerRunning && !showSessionSummary) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, showSessionSummary]);

  // Compute live character count and CPM
  const totalCharacters = useMemo(() => {
    return activePassage.fullText.replace(/[\s\n\r]/g, '').length;
  }, [activePassage.fullText]);

  const currentCpm = useMemo(() => {
    if (elapsedSeconds < 2) return 0;
    const minutes = elapsedSeconds / 60;
    return Math.round(totalCharacters / minutes);
  }, [totalCharacters, elapsedSeconds]);

  // CPM pace analysis
  const cpmAssessment = useMemo(() => {
    const target = activePassage.targetCpm || 300;
    if (elapsedSeconds < 5) return { label: 'တိုင်းတာနေသည်...', color: 'text-stone-400' };
    if (currentCpm < target * 0.6) {
      return { label: 'အသေးစိတ်ဖတ်နှုန်း (Deliberate)', color: 'text-sky-400', badge: '精読' };
    }
    if (currentCpm >= target * 0.6 && currentCpm <= target * 1.35) {
      return { label: `စံနှုန်းဖတ်နှုန်း (${target} CPM)`, color: 'text-emerald-400', badge: '適正' };
    }
    return { label: 'အမြန်ဖတ်နှုန်း (Skimming)', color: 'text-amber-400', badge: '速読' };
  }, [currentCpm, activePassage.targetCpm, elapsedSeconds]);

  // Format MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sentence Click: Apply active highlight tool
  const handleSentenceClick = (sentence: DokkaiSentence) => {
    if (!activeHighlightTool) return;

    if (activeHighlightTool === 'eraser') {
      setUserSentenceHighlights((prev) => {
        const next = { ...prev };
        delete next[sentence.id];
        return next;
      });
      return;
    }

    setUserSentenceHighlights((prev) => ({
      ...prev,
      [sentence.id]: {
        type: activeHighlightTool,
      },
    }));
  };

  // Inspect Kanji: Open Kanji Slide-Over Drawer
  const handleInspectKanji = (char: string, sentenceText: string) => {
    if (!isKanjiChar(char)) return;
    const detail = getOrDecomposeKanji(char, sentenceText);
    setSelectedKanji(detail);
    setSelectedKanjiContext(sentenceText);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch {
        // Ignore vibration error
      }
    }
  };

  // Vocab click: Open vocab miner popover
  const handleWordClick = (
    e: React.MouseEvent,
    item: DokkaiGlossaryItem,
    sentenceText: string
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMinerPopover({
      item,
      sentenceContext: sentenceText,
      position: {
        x: Math.min(window.innerWidth - 320, Math.max(16, rect.left)),
        y: rect.bottom + window.scrollY + 8,
      },
    });
  };

  // 1-Click Mine to SRS
  const handleMineToSRS = async (item: DokkaiGlossaryItem, sentenceContext: string) => {
    const cardId = `mine_${item.term}_${Date.now()}`;
    const newCard: SRSCard = {
      id: cardId,
      itemId: `vocab_dokkai_${item.term}`,
      lessonId: activePassage.id,
      itemType: 'vocab',
      facet: 'meaning',
      prompt: item.term,
      reading: item.reading,
      meaning: item.meaningMy || item.meaningEn,
      meaningMyanmar: item.meaningMy,
      exampleSentence: sentenceContext,
      state: 'new',
      intervalDays: 1,
      repetition: 0,
      stability: 1.0,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: new Date().toISOString(),
    };

    try {
      await db.srs_cards.put(newCard);
      await db.study_events.add({
        id: `evt_mine_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: activePassage.id,
        data: {
          term: item.term,
          source: 'dokkai_reader_miner',
          passageId: activePassage.id,
        },
      });

      setMinedCardIds((prev) => new Set([...prev, item.term]));
      setMiningStatus(`「${item.term}」ကို SRS ထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
      setTimeout(() => setMiningStatus(null), 3000);
    } catch (err) {
      console.error('Failed to mine vocab card to SRS:', err);
    }
  };

  // Question Answer Selection
  const activeQuestion = activePassage.questions[currentQuestionIndex];

  const handleSelectOption = (choice: string) => {
    if (!activeQuestion) return;
    if (submittedQuestions[activeQuestion.id]) return; // Already submitted

    setSelectedAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: choice,
    }));
  };

  const handleSubmitAnswer = () => {
    if (!activeQuestion) return;
    const chosen = selectedAnswers[activeQuestion.id];
    if (!chosen) return;

    setSubmittedQuestions((prev) => ({
      ...prev,
      [activeQuestion.id]: true,
    }));

    // Auto-reveal evidence linking upon submission
    setRevealedEvidenceForQuestion(activeQuestion.id);

    // Scroll to the evidence sentence in the passage
    const firstEvidenceId = activeQuestion.evidenceSentenceIds[0];
    if (firstEvidenceId && sentenceRefs.current[firstEvidenceId]) {
      sentenceRefs.current[firstEvidenceId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    // Check if this was the last question
    const allSubmitted =
      activePassage.questions.every((q) => q.id === activeQuestion.id || submittedQuestions[q.id]);

    if (allSubmitted) {
      setIsTimerRunning(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activePassage.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      const nextQ = activePassage.questions[currentQuestionIndex + 1];
      // Keep or reset evidence reveal for next question
      setRevealedEvidenceForQuestion(submittedQuestions[nextQ?.id] ? nextQ.id : null);
    } else {
      setShowSessionSummary(true);
    }
  };

  const { getDisplayBadge } = useGlobalShortcuts();

  const handleSelectChoiceByIndex = useCallback(
    (idx: number) => {
      if (showSessionSummary || !activeQuestion) return;
      if (activeQuestion.choices[idx]) {
        handleSelectOption(activeQuestion.choices[idx]);
      }
    },
    [showSessionSummary, activeQuestion, handleSelectOption]
  );

  // Scoped keyboard shortcut listener via centralized GlobalShortcutContext
  useScopedShortcuts({
    scopeId: 'dokkai_workbench',
    handlers: {
      SELECT_CHOICE_1: () => handleSelectChoiceByIndex(0),
      SELECT_CHOICE_2: () => handleSelectChoiceByIndex(1),
      SELECT_CHOICE_3: () => handleSelectChoiceByIndex(2),
      SELECT_CHOICE_4: () => handleSelectChoiceByIndex(3),
      SUBMIT_ANSWER: () => {
        if (!activeQuestion) return;
        if (!submittedQuestions[activeQuestion.id] && selectedAnswers[activeQuestion.id]) {
          handleSubmitAnswer();
        } else if (submittedQuestions[activeQuestion.id]) {
          handleNextQuestion();
        }
      },
      NEXT_ITEM: () => {
        if (!activeQuestion) return;
        if (submittedQuestions[activeQuestion.id]) {
          handleNextQuestion();
        } else if (selectedAnswers[activeQuestion.id]) {
          handleSubmitAnswer();
        }
      },
      CYCLE_MARKER: () => {
        setActiveHighlightTool((prev: HighlightTool) => {
          if (prev === 'claim') return 'evidence';
          if (prev === 'evidence') return 'contrast';
          if (prev === 'contrast') return 'eraser';
          return 'claim';
        });
      },
      TOGGLE_TRANSLATION: () => {
        setShowFurigana((prev) => !prev);
      },
    },
    priority: 20,
    enabled: !showSessionSummary && Boolean(activeQuestion),
  });

  // Compute accuracy summary
  const summaryMetrics = useMemo(() => {
    let correctCount = 0;
    activePassage.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        correctCount += 1;
      }
    });
    const totalQuestions = activePassage.questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return {
      correctCount,
      totalQuestions,
      accuracy,
      cpm: currentCpm,
      elapsedSeconds,
      minedCount: minedCardIds.size,
    };
  }, [activePassage.questions, selectedAnswers, currentCpm, elapsedSeconds, minedCardIds]);

  return (
    <div className={`flex flex-col h-full bg-stone-950 text-stone-100 ${embeddedMode ? 'rounded-2xl border border-stone-800/90 overflow-hidden' : ''}`}>
      {/* 1. WORKBENCH TOP COMMAND BAR */}
      <header className="px-5 py-3 border-b border-stone-800/90 bg-stone-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h1 className="text-sm font-semibold tracking-wide text-stone-100 font-myanmar">
              ဖတ်ရှုနားလည်မှု လေ့ကျင့်ခန်း (Dokkai Reader)
            </h1>
          </div>
          <span className="text-xs text-stone-500 font-mono">·</span>
          <span className="text-xs font-mono text-rose-300 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/40">
            {activePassage.formatLabel}
          </span>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            JLPT {activePassage.level}
          </span>
        </div>

        {/* Passage Format Switcher (if multiple available) */}
        {availablePassages.length > 1 && (
          <div className="flex items-center gap-1 bg-stone-950/80 p-1 rounded-lg border border-stone-800 text-xs font-myanmar">
            {availablePassages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPassageId(p.id)}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  selectedPassageId === p.id
                    ? 'bg-stone-800 text-stone-100 shadow-sm border border-stone-700/60'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {p.format === 'tanki' ? 'စာပိုဒ်တို (Tanki)' : p.format === 'chuki' ? 'စာပိုဒ်လတ် (Chuki)' : 'စာပိုဒ်ရှည် (Choubun)'}
              </button>
            ))}
          </div>
        )}

        {/* Action Controls & Reader Tools */}
        <div className="flex items-center gap-2">
          {/* Furigana Toggle */}
          <button
            onClick={() => setShowFurigana((v) => !v)}
            title="ဖူရိဂါနာ ပြောင်းလဲရန်"
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition border ${
              showFurigana
                ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            {showFurigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>ふりがな</span>
          </button>

          {/* Mincho vs Gothic Font Toggle */}
          <button
            onClick={() => setFontFamily((f) => (f === 'mincho' ? 'gothic' : 'mincho'))}
            title="Switch Japanese Font (Mincho / Gothic)"
            className="px-2.5 py-1 rounded text-xs flex items-center gap-1.5 bg-stone-950 border border-stone-800 text-stone-300 hover:text-stone-100 transition"
          >
            <Type className="w-3.5 h-3.5 text-stone-400" />
            <span>{fontFamily === 'mincho' ? '明朝体' : 'ゴシック'}</span>
          </button>

          {/* Font Size Selector */}
          <div className="flex items-center bg-stone-950 rounded border border-stone-800 text-xs text-stone-400">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 ${fontSize === 'sm' ? 'text-stone-100 font-bold bg-stone-800' : 'hover:text-stone-200'}`}
              title="Small Text"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 ${fontSize === 'base' ? 'text-stone-100 font-bold bg-stone-800' : 'hover:text-stone-200'}`}
              title="Regular Text"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 ${fontSize === 'lg' ? 'text-stone-100 font-bold bg-stone-800' : 'hover:text-stone-200'}`}
              title="Large Text"
            >
              A+
            </button>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded transition"
              title="Exit Dokkai Workbench"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MINING STATUS NOTIFICATION */}
      <AnimatePresence>
        {miningStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 z-20 font-myanmar"
          >
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              <span>{miningStatus}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">SRS သို့ ထည့်ပြီးပါပြီ</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN SPLIT-PANE BODY */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* ========================================================= */}
        {/* LEFT PANE: JAPANESE PASSAGE & ANNOTATION WORKBENCH         */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800/90 bg-stone-950/60 overflow-hidden">
          {/* Left Toolbar: Sentence Highlighter palette */}
          <div className="px-5 py-2.5 bg-stone-900/70 border-b border-stone-800/80 flex items-center justify-between gap-3 text-xs font-myanmar">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
                <Highlighter className="w-3.5 h-3.5 text-stone-500" />
                မီးမောင်းထိုးရန်:
              </span>

              {/* 1. Author Claim (စာရေးသူ၏ သဘောထား) */}
              <button
                onClick={() => setActiveHighlightTool(activeHighlightTool === 'claim' ? null : 'claim')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition ${
                  activeHighlightTool === 'claim'
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>စာရေးသူ၏ သဘောထား (Claim)</span>
              </button>

              {/* 2. Evidence / Concrete reason (အထောက်အထား/အကြောင်းပြချက်) */}
              <button
                onClick={() => setActiveHighlightTool(activeHighlightTool === 'evidence' ? null : 'evidence')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition ${
                  activeHighlightTool === 'evidence'
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>အထောက်အထား/အကြောင်းပြချက် (Evidence)</span>
              </button>

              {/* 3. Contrast / Counterargument (ဆန့်ကျင်ဘက်/နှိုင်းယှဉ်ချက်) */}
              <button
                onClick={() => setActiveHighlightTool(activeHighlightTool === 'contrast' ? null : 'contrast')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition ${
                  activeHighlightTool === 'contrast'
                    ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span>ဆန့်ကျင်ဘက်/နှိုင်းယှဉ်ချက် (Contrast)</span>
              </button>

              {/* Eraser */}
              <button
                onClick={() => setActiveHighlightTool(activeHighlightTool === 'eraser' ? null : 'eraser')}
                className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition ${
                  activeHighlightTool === 'eraser'
                    ? 'bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/50'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
                title="Click a sentence to erase its highlight"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>ဖျက်ဆေး (Eraser)</span>
              </button>
            </div>

            {/* Clear all highlights */}
            {Object.keys(userSentenceHighlights).length > 0 && (
              <button
                onClick={() => setUserSentenceHighlights({})}
                className="text-[11px] text-stone-500 hover:text-stone-300 transition"
              >
                အားလုံးဖျက်မည် ({Object.keys(userSentenceHighlights).length})
              </button>
            )}
          </div>

          {/* Reading Passage Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Passage Header Banner */}
            <div className="border-b border-stone-800/80 pb-4">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider block mb-1">
                {activePassage.formatLabel} · JLPT {activePassage.level}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-stone-100 font-japanese leading-snug">
                {activePassage.titleJa}
              </h2>
              <p className="text-xs text-stone-400 mt-1">{activePassage.title}</p>
            </div>

            {/* Paragraphs */}
            <div
              className={`space-y-6 leading-relaxed ${
                fontFamily === 'mincho'
                  ? 'font-serif font-japanese tracking-wide'
                  : 'font-sans font-japanese tracking-normal'
              } ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}`}
            >
              {activePassage.paragraphs.map((paragraph) => (
                <div key={paragraph.index} className="relative pl-7 group">
                  {/* Paragraph Number Indicator (¶ 1, ¶ 2) */}
                  <span className="absolute left-0 top-1 text-xs font-mono text-stone-600 select-none group-hover:text-stone-400 transition font-sans">
                    ¶{paragraph.index}
                  </span>

                  {/* Paragraph Sentences */}
                  <div className="inline">
                    {paragraph.sentences.map((sentence) => {
                      const userHighlight = userSentenceHighlights[sentence.id];
                      const isEvidenceRevealed =
                        revealedEvidenceForQuestion &&
                        activeQuestion?.evidenceSentenceIds.includes(sentence.id);

                      // Determine background highlight classes
                      let highlightStyle = '';
                      if (isEvidenceRevealed) {
                        highlightStyle =
                          'bg-amber-500/20 ring-2 ring-amber-500/70 rounded px-1 py-0.5 shadow-lg animate-pulse';
                      } else if (userHighlight?.type === 'claim') {
                        highlightStyle = 'bg-rose-500/20 border-b-2 border-rose-500/80 px-1 py-0.5 rounded-sm';
                      } else if (userHighlight?.type === 'evidence') {
                        highlightStyle = 'bg-sky-500/20 border-b-2 border-sky-500/80 px-1 py-0.5 rounded-sm';
                      } else if (userHighlight?.type === 'contrast') {
                        highlightStyle = 'bg-violet-500/20 border-b-2 border-violet-500/80 px-1 py-0.5 rounded-sm';
                      }

                      return (
                        <span
                          key={sentence.id}
                          ref={(el) => {
                            sentenceRefs.current[sentence.id] = el;
                          }}
                          onClick={() => handleSentenceClick(sentence)}
                          className={`inline transition cursor-pointer hover:bg-stone-800/40 rounded-sm relative ${highlightStyle}`}
                          title={
                            activeHighlightTool
                              ? `Click to apply ${activeHighlightTool}`
                              : 'Click sentence to highlight'
                          }
                        >
                          {/* Evidence badge when revealed */}
                          {isEvidenceRevealed && (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-stone-950 font-sans font-bold text-[10px] px-1.5 py-0.5 rounded mr-1.5 align-middle select-none shadow">
                              <Target className="w-3 h-3 inline" />
                              မေးခွန်း {toBurmeseNumeral(currentQuestionIndex + 1)} အထောက်အထား
                            </span>
                          )}

                          {/* Render sentence content with interactive glossary tokens & kanji inspector */}
                          {renderSentenceWithGlossary(
                            sentence.text,
                            activePassage.glossary,
                            showFurigana,
                            (e, item) => handleWordClick(e, item, sentence.text),
                            minedCardIds,
                            handleInspectKanji
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Passage Footer & Instructions */}
            <div className="pt-6 border-t border-stone-800/80 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2 font-myanmar">
              <div className="flex items-center gap-3 font-mono">
                <span>စာလုံးရေ: {totalCharacters} လုံး</span>
                <span>·</span>
                <span>စာပိုဒ်ရေ: {activePassage.paragraphs.length}</span>
                <span>·</span>
                <span>အဓိကဝေါဟာရ: {activePassage.glossary.length} လုံး</span>
              </div>
              <div className="text-[11px] text-stone-400">
                💡 ဝေါဟာရကို နှိပ်၍ SRS ထဲသို့ ထည့်သွင်းနိုင်သည် • ခန်ဂျီကို ဖိထားခြင်း/နှစ်ချက်နှိပ်ခြင်းဖြင့် အသေးစိတ်ကြည့်နိုင်ပါသည်
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANE: CPM SPEED METER & COMPREHENSION QUESTIONS     */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-stone-900/50 overflow-hidden shrink-0 font-myanmar">
          {/* Top Gauge: Timer & Characters Per Minute (CPM) */}
          <div className="p-4 bg-stone-900/90 border-b border-stone-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono font-bold text-sm text-stone-100">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-500 font-mono uppercase">ဖတ်နှုန်း (CPM)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-base text-stone-100">
                        {currentCpm}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">လုံး/မိနစ်</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CPM Status Indicator */}
              <div className="text-right">
                <span className={`text-xs font-semibold ${cpmAssessment.color}`}>
                  {cpmAssessment.label}
                </span>
                <span className="text-[10px] text-stone-500 block font-mono">
                  စံနှုန်း: ~{activePassage.targetCpm} CPM
                </span>
              </div>
            </div>

            {/* Questions Step Progress */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <span className="text-xs text-stone-400 font-mono">
                မေးခွန်း {toBurmeseNumeral(currentQuestionIndex + 1)} / {toBurmeseNumeral(activePassage.questions.length)}
              </span>
              <div className="flex items-center gap-1.5">
                {activePassage.questions.map((q, idx) => {
                  const isSubmitted = submittedQuestions[q.id];
                  const isCorrect = isSubmitted && selectedAnswers[q.id] === q.answer;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        if (submittedQuestions[q.id]) {
                          setRevealedEvidenceForQuestion(q.id);
                        }
                      }}
                      className={`w-6 h-6 rounded text-xs font-mono font-semibold transition ${
                        currentQuestionIndex === idx
                          ? 'ring-2 ring-rose-500 bg-stone-800 text-stone-100'
                          : isSubmitted
                          ? isCorrect
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-stone-950 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {toBurmeseNumeral(idx + 1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question / Summary Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {!showSessionSummary && activeQuestion ? (
              <div className="space-y-5">
                {/* Question Prompt */}
                <div className="space-y-1.5 bg-stone-950/80 border border-stone-800/80 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                      မေးခွန်း {toBurmeseNumeral(currentQuestionIndex + 1)}
                    </span>
                    {submittedQuestions[activeQuestion.id] && (
                      <span
                        className={`text-xs font-mono font-semibold flex items-center gap-1 ${
                          selectedAnswers[activeQuestion.id] === activeQuestion.answer
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {selectedAnswers[activeQuestion.id] === activeQuestion.answer ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> အဖြေမှန် (Correct)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> အဖြေမှား (Incorrect)
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-100 font-japanese leading-relaxed">
                    {(activeQuestion as any).promptMy || (activeQuestion as any).questionMy || activeQuestion.prompt}
                  </h3>
                  {activeQuestion.promptJa && activeQuestion.promptJa !== activeQuestion.prompt && (
                    <p className="text-xs text-stone-400 font-japanese">{activeQuestion.promptJa}</p>
                  )}
                </div>

                {/* Choices (with 1-4 shortcut badges) */}
                <div className="space-y-2.5">
                  {activeQuestion.choices.map((choice, cIdx) => {
                    const isSelected = selectedAnswers[activeQuestion.id] === choice;
                    const isSubmitted = submittedQuestions[activeQuestion.id];
                    const isCorrectAnswer = choice === activeQuestion.answer;

                    let choiceStyle =
                      'bg-stone-950 border-stone-800 text-stone-200 hover:border-stone-700';

                    if (isSelected && !isSubmitted) {
                      choiceStyle = 'bg-stone-800/90 border-rose-500/80 text-stone-100 ring-1 ring-rose-500/50';
                    } else if (isSubmitted) {
                      if (isCorrectAnswer) {
                        choiceStyle = 'bg-emerald-950/60 border-emerald-600/80 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
                      } else if (isSelected && !isCorrectAnswer) {
                        choiceStyle = 'bg-rose-950/60 border-rose-600/80 text-rose-200';
                      } else {
                        choiceStyle = 'bg-stone-950/60 border-stone-800/60 text-stone-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={choice}
                        onClick={() => handleSelectOption(choice)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${choiceStyle}`}
                      >
                        <span className="w-5 h-5 rounded bg-stone-900 border border-stone-700 text-stone-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {cIdx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-japanese leading-relaxed flex-1">
                          {choice}
                        </span>
                        {isSubmitted && isCorrectAnswer && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {isSubmitted && isSelected && !isCorrectAnswer && (
                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Evidence Linking Button & Explanation Card (Post-submission) */}
                {submittedQuestions[activeQuestion.id] && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-2"
                  >
                    {/* Evidence Toggle Button */}
                    <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-medium text-amber-200">
                          စာပိုဒ်ပါ အထောက်အထား
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const willReveal = revealedEvidenceForQuestion !== activeQuestion.id;
                          setRevealedEvidenceForQuestion(willReveal ? activeQuestion.id : null);
                          if (willReveal) {
                            const firstId = activeQuestion.evidenceSentenceIds[0];
                            if (firstId && sentenceRefs.current[firstId]) {
                              sentenceRefs.current[firstId]?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                              });
                            }
                          }
                        }}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{revealedEvidenceForQuestion === activeQuestion.id ? 'အထောက်အထားကို ပြသထားပါသည်' : 'စာပိုဒ်တွင် စစ်ဆေးရန်'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Explanation */}
                    <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-stone-300 font-semibold">
                        <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>အဖြေမှန် ရှင်းလင်းချက်</span>
                      </div>
                      <p className="text-stone-300 font-japanese leading-relaxed">
                        {(activeQuestion as any).explanationMy || activeQuestion.explanation}
                      </p>

                      {activeQuestion.strategyTip && (
                        <div className="mt-2 pt-2 border-t border-stone-800/80 text-[11px] text-amber-300 font-japanese">
                          <span className="font-semibold text-amber-400">⚡ ဖြေဆိုနည်း: </span>
                          {activeQuestion.strategyTip === '設問で問われている主語と述語を特定し、該当箇所の前後の接続詞（しかし、だから等）に注意してください。'
                            ? 'မေးခွန်းရှိ ကတ္တရာနှင့် ကြိယာကို ရှာဖွေပြီး၊ ရှေ့နောက် စကားဆက်များကို သတိပြုပါ။'
                            : activeQuestion.strategyTip}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Question Action Bottom Bar */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-stone-500 font-mono">
                    ကီးဘုတ်: <kbd className="bg-stone-950 px-1 py-0.5 rounded border border-stone-800">1-4</kbd> ရွေးချယ်ရန် / <kbd className="bg-stone-950 px-1 py-0.5 rounded border border-stone-800">Enter</kbd>
                  </div>

                  {!submittedQuestions[activeQuestion.id] ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswers[activeQuestion.id]}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                        selectedAnswers[activeQuestion.id]
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <span>အဖြေစစ်ဆေးမည် (Submit)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 text-stone-950 hover:bg-white transition flex items-center gap-2 shadow cursor-pointer"
                    >
                      <span>
                        {currentQuestionIndex < activePassage.questions.length - 1
                          ? 'နောက်မေးခွန်းသို့ (Next)'
                          : 'ရလဒ်ကို ကြည့်မည် (View Results)'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Dokkai Session Summary */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-100 font-japanese">
                    စာဖတ်စွမ်းရည် လေ့ကျင့်ခန်း ပြီးဆုံးပါပြီ
                  </h3>
                  <p className="text-xs text-stone-400 font-japanese">
                    {activePassage.titleJa}
                  </p>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-center space-y-1">
                    <span className="text-[10px] text-stone-500 font-mono uppercase">မှန်ကန်မှုနှုန်း (Accuracy)</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {summaryMetrics.accuracy}%
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {summaryMetrics.correctCount} / {summaryMetrics.totalQuestions} ပုစ္ဆာမှန်ကန်
                    </span>
                  </div>

                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-center space-y-1">
                    <span className="text-[10px] text-stone-500 font-mono uppercase">ဖတ်နှုန်း (CPM)</span>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      {summaryMetrics.cpm}
                    </div>
                    <span className="text-[10px] text-stone-400">
                      ကြာချိန်: {formatTimer(summaryMetrics.elapsedSeconds)}
                    </span>
                  </div>
                </div>

                {/* Reading Stamina & Efficiency Assessment */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>JLPT စာဖတ်စွမ်းရည် သုံးသပ်ချက်</span>
                  </div>
                  <p className="text-stone-300 font-myanmar leading-relaxed">
                    {summaryMetrics.accuracy >= 80 && summaryMetrics.cpm >= 250
                      ? 'အလွန်ကောင်းမွန်သော စာဖတ်နှုန်း ဖြစ်ပါသည်။ အမှန်တကယ် JLPT N2 စာမေးပွဲတွင်လည်း အချိန်လုံလောက်စွာဖြင့် တိကျမှန်ကန်စွာ ဖြေဆိုနိုင်မည့် စွမ်းရည်ရှိပါသည်။'
                      : summaryMetrics.accuracy >= 70
                      ? 'စာပိုဒ်ဖွဲ့စည်းပုံကို ကောင်းစွာ နားလည်နိုင်ပါသည်။ စကားဆက်များနှင့် စာရေးသူ၏ သဘောထားဖော်ပြချက်များကို သတိပြု၍ စာဖတ်နှုန်းကို တဖြည်းဖြည်း မြှင့်တင်သွားပါ။'
                      : 'မေးခွန်း၏ အထောက်အထားစာကြောင်းကို တိကျစွာ ရှာဖွေဖတ်ရှုသည့် လေ့ကျင့်မှုကို ပိုမိုလုပ်ဆောင်ပါ။ မှားယွင်းစေရန် ထောင်ထားသော အဖြေမှားများကို ချန်လှပ်ဖြေဆိုသည့် နည်းလမ်းကို အသုံးပြုပါ။'}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-800">
                    <span>SRS ထဲသို့ ထည့်သွင်းထားသော ဝေါဟာရ:</span>
                    <span className="font-mono font-bold text-amber-300">{minedCardIds.size} လုံး</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      if (onComplete) {
                        onComplete({
                          passageId: activePassage.id,
                          elapsedSeconds: summaryMetrics.elapsedSeconds,
                          cpm: summaryMetrics.cpm,
                          accuracy: summaryMetrics.accuracy,
                          correctCount: summaryMetrics.correctCount,
                          totalQuestions: summaryMetrics.totalQuestions,
                          minedCardsCount: summaryMetrics.minedCount,
                        });
                      }
                      if (onExit) onExit();
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-md shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ရလဒ်မှတ်တမ်းတင်ပြီး အဆုံးသတ်မည် (Finish)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setShowSessionSummary(false);
                      setCurrentQuestionIndex(0);
                      setSelectedAnswers({});
                      setSubmittedQuestions({});
                      setElapsedSeconds(0);
                      setIsTimerRunning(true);
                    }}
                    className="w-full py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>နောက်တစ်ကြိမ် ပြန်ဖြေမည် (Retry Passage)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE VOCAB MINER POPOVER                         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {minerPopover && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
            onClick={() => setMinerPopover(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-stone-900 border border-stone-700/80 rounded-2xl p-5 shadow-2xl text-stone-100 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-japanese text-stone-100">
                      {minerPopover.item.term}
                    </span>
                    <span className="text-sm font-japanese text-rose-300 font-medium">
                      【{minerPopover.item.reading}】
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 font-mono">
                    <span>{minerPopover.item.pos || '語彙'}</span>
                    <span>·</span>
                    <span className="text-amber-400 font-bold">{minerPopover.item.level || activePassage.level}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMinerPopover(null)}
                  className="p-1 text-stone-400 hover:text-stone-200 rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Definitions */}
              <div className="space-y-1.5 bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-xs font-myanmar">
                <div>
                  <span className="text-[10px] text-stone-500 font-mono block">မြန်မာ အဓိပ္ပာယ်</span>
                  <p className="text-amber-300 font-medium text-sm">{minerPopover.item.meaningMy || minerPopover.item.meaningEn}</p>
                </div>
                {minerPopover.item.meaningEn && minerPopover.item.meaningMy && (
                  <div className="pt-1.5 border-t border-stone-800/80">
                    <span className="text-[10px] text-stone-500 font-mono block">English Definition</span>
                    <p className="text-stone-400 font-sans">{minerPopover.item.meaningEn}</p>
                  </div>
                )}
              </div>

              {/* Sentence Context */}
              <div className="space-y-1 bg-stone-950/50 border border-stone-800/60 rounded-xl p-3 text-xs font-myanmar">
                <span className="text-[10px] text-stone-500 font-mono block">စာပိုဒ်ပါ အသုံးအနှုန်း နမူနာ (Context)</span>
                <p className="text-stone-300 font-japanese leading-relaxed italic">
                  「{minerPopover.sentenceContext}」
                </p>
              </div>

              {/* 1-Click Mine to SRS Button */}
              <div className="font-myanmar">
                {minedCardIds.has(minerPopover.item.term) ? (
                  <div className="w-full py-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>✓ SRS ထဲသို့ ထည့်သွင်းပြီးပါပြီ (In SRS)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleMineToSRS(minerPopover.item, minerPopover.sentenceContext);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>SRS ထဲသို့ ထည့်မည် (Add to SRS)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kanji Slide-Over Inspector Drawer */}
      <KanjiDrawer
        kanji={selectedKanji}
        onClose={() => setSelectedKanji(null)}
        sentenceContext={selectedKanjiContext}
        onMined={(char) => {
          setMiningStatus(`「${char}」ကို SRS ထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
          setTimeout(() => setMiningStatus(null), 3000);
        }}
      />
    </div>
  );
};

interface InteractiveKanjiSpanProps {
  char: string;
  sentenceText: string;
  onInspect: (char: string, sentenceText: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const InteractiveKanjiSpan: React.FC<InteractiveKanjiSpanProps> = ({
  char,
  sentenceText,
  onInspect,
  className = '',
  children,
}) => {
  const timerRef = useRef<any>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      onInspect(char, sentenceText);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      touchStartPos.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartPos.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInspect(char, sentenceText);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onInspect(char, sentenceText);
  };

  return (
    <span
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`inline cursor-pointer transition-colors duration-150 hover:text-rose-300 hover:underline decoration-rose-400/50 decoration-1 underline-offset-2 ${className}`}
      title={`漢字: ${char} (長押し/ダブルクリック/右クリックで詳細)`}
    >
      {children || char}
    </span>
  );
};

function renderTextWithKanji(
  text: string,
  sentenceText: string,
  onInspectKanji: (char: string, sentenceText: string) => void
): React.ReactNode {
  const chars = Array.from(text);
  return chars.map((ch, idx) => {
    if (isKanjiChar(ch)) {
      return (
        <InteractiveKanjiSpan
          key={idx}
          char={ch}
          sentenceText={sentenceText}
          onInspect={onInspectKanji}
        />
      );
    }
    return ch;
  });
}

/**
 * Helper to highlight recognized vocabulary terms in sentences and render ruby furigana
 */
function renderSentenceWithGlossary(
  sentenceText: string,
  glossary: DokkaiGlossaryItem[],
  showFurigana: boolean,
  onWordClick: (e: React.MouseEvent, item: DokkaiGlossaryItem) => void,
  minedSet: Set<string>,
  onInspectKanji: (char: string, sentenceText: string) => void
): React.ReactNode {
  if (!glossary || glossary.length === 0) {
    return renderTextWithKanji(sentenceText, sentenceText, onInspectKanji);
  }

  // Sort glossary items by length descending so longer compound words match first
  const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);

  // Build a regex matching any of the glossary terms
  const escapedTerms = sorted.map((g) => g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'g');

  const parts = sentenceText.split(regex);

  return parts.map((part, index) => {
    const matchedItem = sorted.find((g) => g.term === part);

    if (matchedItem) {
      const isMined = minedSet.has(matchedItem.term);
      const termChars = Array.from(matchedItem.term);
      return (
        <span
          key={index}
          onClick={(e) => onWordClick(e, matchedItem)}
          className={`cursor-pointer inline-flex flex-col items-center mx-0.5 px-1 py-0.5 rounded transition ${
            isMined
              ? 'bg-emerald-950/60 text-emerald-300 underline decoration-emerald-500/60'
              : 'bg-rose-950/30 text-rose-200 hover:bg-rose-900/50 underline decoration-rose-500/50'
          }`}
          title={`Click to view definition: ${matchedItem.reading}`}
        >
          {showFurigana && matchedItem.reading ? (
            <ruby className="leading-tight">
              {termChars.map((ch, chIdx) =>
                isKanjiChar(ch) ? (
                  <InteractiveKanjiSpan
                    key={chIdx}
                    char={ch}
                    sentenceText={sentenceText}
                    onInspect={onInspectKanji}
                  >
                    {ch}
                  </InteractiveKanjiSpan>
                ) : (
                  ch
                )
              )}
              <rt className="text-[10px] text-rose-300 select-none font-japanese font-normal pointer-events-none">
                {matchedItem.reading}
              </rt>
            </ruby>
          ) : (
            <span>
              {termChars.map((ch, chIdx) =>
                isKanjiChar(ch) ? (
                  <InteractiveKanjiSpan
                    key={chIdx}
                    char={ch}
                    sentenceText={sentenceText}
                    onInspect={onInspectKanji}
                  >
                    {ch}
                  </InteractiveKanjiSpan>
                ) : (
                  ch
                )
              )}
            </span>
          )}
        </span>
      );
    }

    return (
      <span key={index}>
        {renderTextWithKanji(part, sentenceText, onInspectKanji)}
      </span>
    );
  });
}
