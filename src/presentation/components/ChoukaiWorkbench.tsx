import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  HelpCircle,
  Check,
  X,
  ChevronRight,
  BookmarkCheck,
  Plus,
  Award,
  ShieldCheck,
  Repeat,
  Radio,
  FileText,
  Target,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  ChoukaiScenario,
  ChoukaiLine,
  ChoukaiSpeaker,
  CHOUKAI_SCENARIOS,
} from '../../domain/assessment/choukai-catalog';
import { ChoukaiSpeed } from '../../domain/audio/choukai-audio-engine';
import { useChoukaiAudio } from '../hooks/useChoukaiAudio';
import { db } from '../../data/db/dexie-db';
import { SRSCard } from '../../domain/models/types';
import { KanjiDrawer } from './KanjiDrawer';
import { InteractiveKanjiSpan, renderTextWithKanji, InteractiveKanjiText } from './InteractiveKanjiText';
import { isKanjiChar, getOrDecomposeKanji, KanjiDetail } from '../../domain/dictionary/kanji-catalog';
import { useScopedShortcuts } from '../context/GlobalShortcutContext';
import { PitchAccentVisualizer } from './PitchAccentVisualizer';
import { inferPitchAccent } from '../../domain/audio/pitch-accent';

export type VisibilityMode = 'blind' | 'script' | 'clue';

interface ChoukaiWorkbenchProps {
  initialScenarioId?: string;
  onExit?: () => void;
  onComplete?: (result: {
    score: number;
    accuracy: number;
    correct: number;
    total: number;
    scenarioId: string;
  }) => void;
  embeddedMode?: boolean;
}

export const ChoukaiWorkbench: React.FC<ChoukaiWorkbenchProps> = ({
  initialScenarioId,
  onExit,
  onComplete,
  embeddedMode = false,
}) => {
  // Scenario state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    initialScenarioId || CHOUKAI_SCENARIOS[0].id
  );

  const scenario =
    CHOUKAI_SCENARIOS.find((s) => s.id === selectedScenarioId) || CHOUKAI_SCENARIOS[0];

  // 3-Stage Visibility Toggle: 'blind' | 'script' | 'clue'
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('blind');

  // Question answering state
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [minedCardTerms, setMinedCardTerms] = useState<Set<string>>(new Set());
  const [minerPopover, setMinerPopover] = useState<{
    vocab: {
      term: string;
      reading: string;
      pos: string;
      meaningEn: string;
      meaningMy?: string;
    };
    lineContext: string;
  } | null>(null);
  const [miningStatus, setMiningStatus] = useState<string | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<KanjiDetail | null>(null);
  const [selectedKanjiContext, setSelectedKanjiContext] = useState<string | undefined>(undefined);

  const handleInspectKanji = (char: string, sentenceText: string) => {
    if (!isKanjiChar(char)) return;
    const detail = getOrDecomposeKanji(char, sentenceText);
    setSelectedKanji(detail);
    setSelectedKanjiContext(sentenceText);
    if (isPlaying) {
      pause();
    }
  };

  // Audio Hook
  const {
    isPlaying,
    isPaused,
    currentLineIndex,
    playbackRate,
    isShadowingLoop,
    shadowingTurnDelay,
    waveformAmplitude,
    play,
    playSingleLine,
    pause,
    resume,
    stop,
    setSpeed,
    toggleShadowingLoop,
    setShadowingTurnDelay,
    loadScenario,
  } = useChoukaiAudio(scenario);

  // Line element refs for scrolling into view
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reset answer states when changing scenario
  useEffect(() => {
    loadScenario(scenario);
    setSelectedChoiceIndex(null);
    setIsAnswerSubmitted(false);
    setVisibilityMode('blind');
    setMinerPopover(null);
  }, [scenario.id, loadScenario]);

  // Scroll active line into view in script mode
  useEffect(() => {
    if (visibilityMode !== 'blind' && isPlaying) {
      const activeLine = scenario.dialogue[currentLineIndex];
      if (activeLine && lineRefs.current[activeLine.id]) {
        lineRefs.current[activeLine.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [currentLineIndex, isPlaying, visibilityMode, scenario.dialogue]);

  // Handle choice submission
  const handleSubmitAnswer = () => {
    if (selectedChoiceIndex === null) return;
    setIsAnswerSubmitted(true);
    // Automatically reveal Clue Breakdown Mode post-submission for pedagogical insight
    setVisibilityMode('clue');

    if (onComplete) {
      const isCorrect = selectedChoiceIndex === scenario.answerIndex;
      onComplete({
        score: isCorrect ? 100 : 0,
        accuracy: isCorrect ? 1 : 0,
        correct: isCorrect ? 1 : 0,
        total: 1,
        scenarioId: scenario.id,
      });
    }
  };

  // Centralized scoped keyboard shortcuts (1-4 for choices, Enter to submit)
  useScopedShortcuts({
    scopeId: 'choukai_workbench',
    priority: 20,
    handlers: {
      SELECT_CHOICE_1: () => {
        if (!isAnswerSubmitted && scenario.choices.length > 0) setSelectedChoiceIndex(0);
      },
      SELECT_CHOICE_2: () => {
        if (!isAnswerSubmitted && scenario.choices.length > 1) setSelectedChoiceIndex(1);
      },
      SELECT_CHOICE_3: () => {
        if (!isAnswerSubmitted && scenario.choices.length > 2) setSelectedChoiceIndex(2);
      },
      SELECT_CHOICE_4: () => {
        if (!isAnswerSubmitted && scenario.choices.length > 3) setSelectedChoiceIndex(3);
      },
      SUBMIT_ANSWER: () => {
        if (!isAnswerSubmitted && selectedChoiceIndex !== null) {
          handleSubmitAnswer();
        }
      },
    },
  });

  // 1-Click Mine to SRS
  const handleMineVocab = async (
    vocab: {
      term: string;
      reading: string;
      pos: string;
      meaningEn: string;
      meaningMy?: string;
    },
    lineContext: string
  ) => {
    const cardId = `choukai_mine_${vocab.term}_${Date.now()}`;
    const card: SRSCard = {
      id: cardId,
      itemId: `choukai_v_${vocab.term}`,
      lessonId: scenario.id,
      itemType: 'vocab',
      facet: 'meaning',
      prompt: vocab.term,
      reading: vocab.reading,
      meaning: vocab.meaningMy || vocab.meaningEn,
      meaningMyanmar: vocab.meaningMy,
      exampleSentence: lineContext,
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
      await db.srs_cards.put(card);
      await db.study_events.add({
        id: `evt_choukai_mine_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: scenario.id,
        data: {
          term: vocab.term,
          source: 'choukai_audio_miner',
          scenarioId: scenario.id,
        },
      });

      setMinedCardTerms((prev) => new Set([...prev, vocab.term]));
      setMiningStatus(`「${vocab.term}」ကို SRS ထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
      setTimeout(() => setMiningStatus(null), 3000);
    } catch (err) {
      console.error('Failed to mine choukai vocab:', err);
    }
  };

  const isCurrentChoiceCorrect =
    selectedChoiceIndex !== null && selectedChoiceIndex === scenario.answerIndex;

  return (
    <div
      className={`flex flex-col h-full bg-stone-950 text-stone-100 ${
        embeddedMode ? 'rounded-2xl border border-stone-800/90 overflow-hidden' : ''
      }`}
    >
      {/* 1. TOP HEADER & SCENARIO SELECTOR */}
      <header className="px-5 py-3 border-b border-stone-800/90 bg-stone-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h1 className="text-sm font-semibold tracking-wide text-stone-100 font-japanese flex items-center gap-1.5 font-myanmar">
              <Headphones className="w-4 h-4 text-rose-400" />
              <span>နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Choukai Lab)</span>
            </h1>
          </div>
          <span className="text-xs text-stone-500 font-mono">·</span>
          <span className="text-xs font-mono text-rose-300 font-medium bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/40">
            {scenario.typeLabel}
          </span>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            JLPT {scenario.level}
          </span>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex items-center gap-1 bg-stone-950/80 p-1 rounded-lg border border-stone-800 text-xs font-myanmar">
          {CHOUKAI_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenarioId(s.id)}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                selectedScenarioId === s.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {s.type === 'kadai_rikai'
                ? 'တာဝန်နားလည်ခြင်း'
                : s.type === 'point_rikai'
                ? 'အဓိကအချက်'
                : 'ချက်ချင်းတုံ့ပြန်'}
            </button>
          ))}
        </div>

        {onExit && (
          <button
            onClick={() => {
              stop();
              onExit();
            }}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded transition cursor-pointer"
            title="Exit Choukai Lab"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* MINING STATUS TOAST */}
      <AnimatePresence>
        {miningStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 z-20 shrink-0 font-myanmar"
          >
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              <span>{miningStatus}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">SRS သို့ ထည့်ပြီးပါပြီ</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SPLIT-PANE CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* ========================================================= */}
        {/* LEFT PANE: AUDIO STUDIO & 3-STAGE TRANSCRIPT VIEWER      */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800/90 bg-stone-950/60 overflow-hidden">
          {/* Audio Player Studio Bar */}
          <div className="p-4 bg-stone-900/80 border-b border-stone-800/80 space-y-3 shrink-0">
            {/* Top row: Play/Pause, Waveform & Shadowing Loop */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (isPlaying) pause();
                    else if (isPaused) resume();
                    else play(0);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white transition shadow-lg ${
                    isPlaying
                      ? 'bg-rose-500 hover:bg-rose-400 ring-2 ring-rose-500/40 shadow-rose-950/60'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  }`}
                  title={isPlaying ? 'Pause Audio' : 'Play Audio Scenario'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </button>

                {/* Animated Waveform Display */}
                <div className="flex items-center gap-1 h-8 px-3 py-1 bg-stone-950 rounded-xl border border-stone-800">
                  {[0.4, 0.7, 1.0, 0.6, 0.9, 0.3, 0.8, 0.5, 0.95, 0.4].map((baseHeight, i) => {
                    const dynamicHeight = isPlaying
                      ? Math.max(0.15, Math.min(1.0, baseHeight * waveformAmplitude * 1.8))
                      : 0.15;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-100 ${
                          isPlaying ? 'bg-rose-400' : 'bg-stone-700'
                        }`}
                        style={{ height: `${Math.round(dynamicHeight * 24)}px` }}
                      />
                    );
                  })}
                </div>

                {/* Current Speaker / Status Pill */}
                <div className="hidden sm:flex flex-col font-myanmar">
                  <span className="text-[10px] text-stone-500 font-mono uppercase">
                    စကားပြောသူ
                  </span>
                  <span className="text-xs font-semibold text-stone-200 font-japanese">
                    {scenario.dialogue[currentLineIndex]
                      ? scenario.speakers.find(
                          (s) => s.id === scenario.dialogue[currentLineIndex].speakerId
                        )?.nameJa || 'Speaker'
                      : 'အဆင်သင့်'}
                  </span>
                </div>
              </div>

              {/* Right tools: Speed selector & Shadowing Loop toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Speed Selection */}
                <div className="flex items-center bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs font-mono">
                  {([0.75, 1.0, 1.25, 1.5] as ChoukaiSpeed[]).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSpeed(spd)}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        playbackRate === spd
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Shadowing Loop (Continuous Echo) Button */}
                <button
                  onClick={toggleShadowingLoop}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border font-myanmar cursor-pointer ${
                    isShadowingLoop
                      ? 'bg-amber-950/60 text-amber-300 border-amber-600/70 ring-2 ring-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                  }`}
                  title="စဉ်ဆက်မပြတ် လိုက်ဆိုလေ့ကျင့်ခြင်း"
                >
                  <Repeat className={`w-3.5 h-3.5 ${isShadowingLoop ? 'animate-spin text-amber-400' : ''}`} />
                  <span>လိုက်ဆိုလေ့ကျင့်ခြင်း (Shadowing Loop)</span>
                </button>

                {/* Configurable Speaker Turn Delay (1s - 3s) */}
                {isShadowingLoop && (
                  <div className="flex items-center space-x-1 bg-amber-950/40 border border-amber-800/60 p-1 rounded-lg text-xs font-mono">
                    <span className="text-[10px] text-amber-300 font-myanmar px-1">ကြားကာလ:</span>
                    {[1000, 1500, 2000, 2500, 3000].map((delayMs) => (
                      <button
                        key={delayMs}
                        type="button"
                        onClick={() => setShadowingTurnDelay(delayMs)}
                        className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                          shadowingTurnDelay === delayMs
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                            : 'text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/40'
                        }`}
                      >
                        {delayMs / 1000}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Situation Context Banner */}
            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl px-3.5 py-2 text-xs text-stone-300 flex items-center gap-2 font-myanmar">
              <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold shrink-0">
                အခြေအနေ အကြောင်းအရာ:
              </span>
              <p className="font-japanese truncate">{scenario.situation}</p>
            </div>
          </div>

          {/* 3-Stage Visibility Segmented Control Bar */}
          <div className="px-5 py-2 bg-stone-900/60 border-b border-stone-800/70 flex items-center justify-between gap-3 text-xs font-myanmar">
            <span className="text-stone-400 font-medium">စာသား ပြသမည့် ပုံစံ:</span>
            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              {/* 1. Blind Exam Mode */}
              <button
                onClick={() => setVisibilityMode('blind')}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  visibilityMode === 'blind'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="အမှန်တကယ် စာမေးပွဲပုံစံ စာသားမပါဘဲ နားထောင်ရန်"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>၁။ နားထောင်စစ်ဆေးခြင်း (Blind)</span>
              </button>

              {/* 2. Script Mode */}
              <button
                onClick={() => setVisibilityMode('script')}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  visibilityMode === 'script'
                    ? 'bg-stone-800 text-stone-100 shadow-xs border border-stone-700/60'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="ဂျပန်စာသား အပြည့်အစုံ ကြည့်ရှုရန်"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>၂။ စကားပြောစာသား (Script)</span>
              </button>

              {/* 3. Clue Breakdown Mode */}
              <button
                onClick={() => setVisibilityMode('clue')}
                className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  visibilityMode === 'clue'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="အဖြေမှန်၏ အထောက်အထားစာကြောင်းကို ပြသရန်"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>၃။ အထောက်အထားနှင့် ရှင်းလင်းချက် (Clue)</span>
              </button>
            </div>
          </div>

          {/* Transcript Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 relative">
            {/* 1. BLIND EXAM OVERLAY */}
            {visibilityMode === 'blind' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-950/85 backdrop-blur-md p-6 text-center space-y-4 font-myanmar">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-inner">
                  <Headphones className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-stone-100">
                    စစ်မှန်သော နားထောင်စစ်ဆေးမှု ပုံစံ
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    အမှန်တကယ် JLPT စာမေးပွဲပုံစံအတိုင်း စာသားကို မကြည့်ဘဲ နားထောင်လေ့ကျင့်ပါ။ ညာဘက်ရှိ မေးခွန်းကို ဖြေဆိုနိုင်သလို၊ အောက်ပါခလုတ်ဖြင့် စာသားကို ဖွင့်ကြည့်နိုင်ပါသည်။
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!isPlaying) play(0);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>အသံဖွင့်မည်</span>
                  </button>
                  <button
                    onClick={() => setVisibilityMode('script')}
                    className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-stone-400" />
                    <span>စာသားကြည့်မည် (Reveal)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2 & 3. SCRIPT & CLUE BREAKDOWN LIST */}
            <div className="space-y-4">
              {scenario.dialogue.map((line, idx) => {
                const speaker = scenario.speakers.find((s) => s.id === line.speakerId);
                const isCurrentActive = currentLineIndex === idx && isPlaying;
                const isClue = line.isAnswerClue && visibilityMode === 'clue';

                let cardStyle =
                  'bg-stone-900/60 border-stone-800/80 hover:border-stone-750 text-stone-200';

                if (isCurrentActive) {
                  cardStyle =
                    'bg-stone-850 border-rose-500/80 ring-2 ring-rose-500/30 text-stone-100 shadow-md';
                } else if (isClue) {
                  cardStyle =
                    'bg-emerald-950/40 border-emerald-600/80 ring-2 ring-emerald-500/40 shadow-lg';
                }

                return (
                  <div
                    key={line.id}
                    ref={(el) => {
                      lineRefs.current[line.id] = el;
                    }}
                    className={`p-4 rounded-2xl border transition relative space-y-2.5 ${cardStyle}`}
                  >
                    {/* Speaker Header & Jump Audio Button */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                            speaker?.avatarBg || 'bg-stone-800'
                          }`}
                        >
                          {speaker?.gender === 'female' ? 'မ' : speaker?.gender === 'male' ? 'ကျား' : 'ကြေညာ'}
                        </span>
                        <span className="font-semibold text-stone-200 font-japanese">
                          {speaker?.nameJa || 'စကားပြောသူ'}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          · {speaker?.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-myanmar">
                        {isClue && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs animate-pulse">
                            <Target className="w-3 h-3 text-emerald-400" />
                            <span>အဖြေမှန်၏ အထောက်အထား (Answer Clue)</span>
                          </span>
                        )}
                        <button
                          onClick={() => playSingleLine(idx)}
                          className="px-2 py-1 rounded bg-stone-950/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-[11px] font-mono flex items-center gap-1 transition border border-stone-800 cursor-pointer"
                          title="Play this sentence"
                        >
                          <Volume2 className="w-3 h-3 text-rose-400" />
                          <span>ဖွင့်မည်</span>
                        </button>
                      </div>
                    </div>

                    {/* Japanese Text (with clickable vocabulary tokens & kanji inspector) */}
                    <div className="text-sm sm:text-base font-japanese leading-relaxed text-stone-100">
                      {renderLineWithTokens(
                        line.japanese,
                        scenario.keyVocabulary,
                        (vocab) => setMinerPopover({ vocab, lineContext: line.japanese }),
                        minedCardTerms,
                        handleInspectKanji
                      )}
                    </div>

                    {/* Pitch Accent Badge (Script & Clue Visibility Modes) */}
                    <div className="pt-0.5">
                      <PitchAccentVisualizer
                        text={line.reading || line.japanese}
                        pattern={line.pitchAccent || inferPitchAccent(line.japanese)}
                        dropMora={line.dropMora}
                        compact={true}
                        showBadge={true}
                        showContour={false}
                      />
                    </div>

                    {/* English & Burmese Subtitles */}
                    <div className="space-y-1 text-xs pt-1 border-t border-stone-800/60 font-myanmar">
                      {line.burmese ? (
                        <>
                          <p className="text-amber-300/90 font-myanmar text-xs leading-relaxed">
                            {line.burmese}
                          </p>
                          {line.english && (
                            <p className="text-stone-500 text-[11px] font-sans">
                              {line.english}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-stone-400 font-sans">{line.english}</p>
                      )}
                    </div>

                    {/* Clue Rationale Box (Visible in Clue mode for the clue line) */}
                    {isClue && (line.clueRationaleEn || line.clueRationaleMy) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl space-y-1.5 text-xs text-emerald-200 font-myanmar"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>အဖြေမှန်ဖြစ်ရသည့် အကြောင်းပြချက် (Clue Rationale):</span>
                        </div>
                        {line.clueRationaleMy ? (
                          <>
                            <p className="text-emerald-200 font-myanmar text-xs leading-relaxed">
                              {line.clueRationaleMy}
                            </p>
                            {line.clueRationaleEn && (
                              <p className="text-emerald-400/80 text-[11px] pt-1 border-t border-emerald-800/50 font-sans">
                                {line.clueRationaleEn}
                              </p>
                            )}
                          </>
                        ) : (
                          line.clueRationaleEn && (
                            <p className="leading-relaxed font-sans">{line.clueRationaleEn}</p>
                          )
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANE: QUESTION PANEL & DISTRACTOR TRAP ANALYSIS      */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-stone-900/50 overflow-hidden shrink-0 font-myanmar">
          <div className="p-5 border-b border-stone-800/80 space-y-1 shrink-0">
            <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
              JLPT N2 မေးခွန်း
            </span>
            <h2 className="text-base font-bold text-stone-100 font-japanese leading-snug">
              <InteractiveKanjiText
                text={scenario.questionPromptJa}
                sentenceContext={scenario.questionPromptJa}
                onInspectKanji={handleInspectKanji}
                kanjiClassName="hover:text-rose-300"
              />
            </h2>
            <p className="text-xs text-amber-300/90 font-myanmar">{(scenario as any).questionPromptMy || scenario.questionPromptEn}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Choices list */}
            <div className="space-y-3">
              {scenario.choices.map((choice, cIdx) => {
                const isSelected = selectedChoiceIndex === cIdx;
                const isCorrect = cIdx === scenario.answerIndex;

                let choiceStyle =
                  'bg-stone-950 border-stone-800 text-stone-200 hover:border-stone-700';

                if (isSelected && !isAnswerSubmitted) {
                  choiceStyle =
                    'bg-stone-850 border-rose-500/80 text-stone-100 ring-1 ring-rose-500/50';
                } else if (isAnswerSubmitted) {
                  if (isCorrect) {
                    choiceStyle =
                      'bg-emerald-950/60 border-emerald-600/80 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
                  } else if (isSelected && !isCorrect) {
                    choiceStyle = 'bg-rose-950/60 border-rose-600/80 text-rose-200';
                  } else {
                    choiceStyle = 'bg-stone-950/60 border-stone-800/60 text-stone-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={cIdx}
                    onClick={() => {
                      if (!isAnswerSubmitted) {
                        setSelectedChoiceIndex(cIdx);
                      }
                    }}
                    disabled={isAnswerSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${choiceStyle}`}
                  >
                    <span className="w-5 h-5 rounded bg-stone-900 border border-stone-700 text-stone-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {cIdx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-japanese leading-relaxed flex-1">
                      <InteractiveKanjiText
                        text={choice}
                        sentenceContext={choice}
                        onInspectKanji={handleInspectKanji}
                        kanjiClassName="hover:text-rose-300"
                      />
                    </span>
                    {isAnswerSubmitted && isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit Action Button */}
            {!isAnswerSubmitted ? (
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] text-stone-500 font-mono">
                  ကီးဘုတ်: <kbd className="bg-stone-950 px-1 py-0.5 rounded border border-stone-800">1-4</kbd> / <kbd className="bg-stone-950 px-1 py-0.5 rounded border border-stone-800">Enter</kbd>
                </span>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedChoiceIndex === null}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    selectedChoiceIndex !== null
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 cursor-pointer'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <span>အဖြေစစ်ဆေးမည် (Submit)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* POST-SUBMISSION ANALYSIS CARD */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-2"
              >
                {/* Result Indicator */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    isCurrentChoiceCorrect
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-800 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isCurrentChoiceCorrect ? (
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {isCurrentChoiceCorrect ? 'အဖြေမှန် (Correct)' : 'အဖြေမှား (Incorrect)'}
                      </h4>
                      <p className="text-xs opacity-90 font-japanese">
                        အဖြေမှန်: ရွေးချယ်မှု {scenario.answerIndex + 1}「{scenario.correctAnswer}」
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Distractor Trap Breakdown */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-stone-300 uppercase font-mono tracking-wider">
                    အဖြေမှားထောင်ချောက်များနှင့် အသေးစိတ်ရှင်းလင်းချက် (Distractor Trap Analysis):
                  </h4>
                  {scenario.distractorAnalyses.map((analysis, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        analysis.isCorrect
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-stone-200'
                          : 'bg-stone-950 border-stone-800/80 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-japanese font-semibold">
                          ရွေးချယ်မှု {idx + 1}: {analysis.choiceText}
                        </span>
                        {analysis.trapType && (
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50 text-[10px] font-mono">
                            {analysis.trapType}
                          </span>
                        )}
                      </div>
                      {analysis.explanationMy ? (
                        <>
                          <p className="text-amber-200/90 font-myanmar text-xs leading-relaxed">
                            {analysis.explanationMy}
                          </p>
                          {analysis.explanationEn && (
                            <p className="text-stone-400 text-[11px] pt-1 border-t border-stone-800/60 font-sans">
                              {analysis.explanationEn}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-stone-400 leading-relaxed font-sans">{analysis.explanationEn}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Strategy Tip Box */}
                <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5 text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ JLPT နားထောင်စွမ်းရည် ဖြေဆိုနည်း:</span>
                  </span>
                  <p className="text-amber-300/90 font-myanmar text-xs leading-relaxed">
                    {(scenario as any).strategyTipMy || scenario.strategyTipEn}
                  </p>
                  {scenario.strategyTipJa && (
                    <p className="text-stone-400 font-japanese text-[11px] pt-1 border-t border-stone-800/60">
                      {scenario.strategyTipJa}
                    </p>
                  )}
                </div>

                {/* Scenario Navigation Footer */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsAnswerSubmitted(false);
                      setSelectedChoiceIndex(null);
                      setVisibilityMode('blind');
                      play(0);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>နောက်တစ်ကြိမ် ပြန်ဖြေမည် (Retry)</span>
                  </button>

                  {/* Switch to next scenario */}
                  <button
                    onClick={() => {
                      const curIdx = CHOUKAI_SCENARIOS.findIndex((s) => s.id === scenario.id);
                      const nextScenario =
                        CHOUKAI_SCENARIOS[(curIdx + 1) % CHOUKAI_SCENARIOS.length];
                      setSelectedScenarioId(nextScenario.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <span>နောက်မေးခွန်းသို့ (Next)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. VOCAB MINER POPOVER                                    */}
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
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-japanese text-stone-100">
                      {minerPopover.vocab.term}
                    </span>
                    <span className="text-sm font-japanese text-rose-300 font-medium">
                      【{minerPopover.vocab.reading}】
                    </span>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">{minerPopover.vocab.pos}</span>
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
                  <p className="text-amber-300 font-medium text-sm">{minerPopover.vocab.meaningMy || minerPopover.vocab.meaningEn}</p>
                </div>
                {minerPopover.vocab.meaningEn && minerPopover.vocab.meaningMy && (
                  <div className="pt-1.5 border-t border-stone-800/80">
                    <span className="text-[10px] text-stone-500 font-mono block">English Meaning</span>
                    <p className="text-stone-400 font-sans">{minerPopover.vocab.meaningEn}</p>
                  </div>
                )}
              </div>

              {/* Spoken Line Context */}
              <div className="space-y-1 bg-stone-950/50 border border-stone-800/60 rounded-xl p-3 text-xs font-myanmar">
                <span className="text-[10px] text-stone-500 font-mono block">
                  စကားပြော အသုံးအနှုန်း နမူနာ (Context)
                </span>
                <p className="text-stone-300 font-japanese leading-relaxed italic">
                  「{minerPopover.lineContext}」
                </p>
              </div>

              {/* 1-Click Mine to SRS Button */}
              <div className="font-myanmar">
                {minedCardTerms.has(minerPopover.vocab.term) ? (
                  <div className="w-full py-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>✓ SRS ထဲသို့ ထည့်သွင်းပြီးပါပြီ (In SRS)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleMineVocab(minerPopover.vocab, minerPopover.lineContext);
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

      {/* Kanji Drawer for Instant Inspection */}
      <KanjiDrawer
        kanji={selectedKanji}
        isOpen={Boolean(selectedKanji)}
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

/**
 * Tokenizes sentence text to highlight recognized vocabulary words for inline mining
 * and allows instant kanji inspection via long-press, double-click, or right-click.
 */
function renderLineWithTokens(
  text: string,
  vocabularies: ChoukaiScenario['keyVocabulary'],
  onVocabClick: (vocab: ChoukaiScenario['keyVocabulary'][0]) => void,
  minedSet: Set<string>,
  onInspectKanji: (char: string, sentenceText: string) => void
): React.ReactNode {
  if (!vocabularies || vocabularies.length === 0) {
    return renderTextWithKanji(text, text, onInspectKanji);
  }

  const sorted = [...vocabularies].sort((a, b) => b.term.length - a.term.length);
  const regex = new RegExp(`(${sorted.map((v) => v.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const matched = sorted.find((v) => v.term === part);
    if (matched) {
      const isMined = minedSet.has(matched.term);
      const termChars = Array.from(matched.term);
      return (
        <span
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            onVocabClick(matched);
          }}
          className={`cursor-pointer inline-block mx-0.5 px-1 py-0.5 rounded transition ${
            isMined
              ? 'bg-emerald-950/60 text-emerald-300 underline decoration-emerald-500/60'
              : 'bg-rose-950/30 text-rose-200 hover:bg-rose-900/50 underline decoration-rose-500/50'
          }`}
          title={`Click to view definition: ${matched.reading} · Double-click kanji for Kanji Drawer`}
        >
          {termChars.map((ch, chIdx) =>
            isKanjiChar(ch) ? (
              <InteractiveKanjiSpan
                key={chIdx}
                char={ch}
                sentenceText={text}
                onInspect={onInspectKanji}
              >
                {ch}
              </InteractiveKanjiSpan>
            ) : (
              ch
            )
          )}
        </span>
      );
    }
    return (
      <span key={index}>
        {renderTextWithKanji(part, text, onInspectKanji)}
      </span>
    );
  });
}
