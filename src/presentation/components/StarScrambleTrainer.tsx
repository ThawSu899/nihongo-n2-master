import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Star,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Award,
  ChevronRight,
  BookOpen,
  Volume2,
  Layers,
  Check,
} from 'lucide-react';
import {
  STAR_SCRAMBLE_CATALOG,
  StarScramblePuzzle,
  StarScrambleEngine,
  ScrambleEvaluation,
  ScrambleToken,
} from '../../domain/assessment/star-scramble-engine';
import { db } from '../../data/db/dexie-db';
import { ContentLoader } from '../../data/content/content-loader';
import { useScopedShortcuts } from '../context/GlobalShortcutContext';

interface StarScrambleTrainerProps {
  onExit?: () => void;
  onComplete?: (summary: { score: number; accuracy: number; totalPuzzles: number }) => void;
  initialLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  customPuzzles?: StarScramblePuzzle[];
}

export const StarScrambleTrainer: React.FC<StarScrambleTrainerProps> = ({
  onExit,
  onComplete,
  initialLevel = 'N2',
  customPuzzles,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'N5' | 'N4' | 'N3' | 'N2'>(initialLevel);
  const [curriculumPuzzles, setCurriculumPuzzles] = useState<StarScramblePuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Current slot allocations: array of 4 (option numbers 1-4, or null)
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
  const [evaluation, setEvaluation] = useState<ScrambleEvaluation | null>(null);
  const [historyScores, setHistoryScores] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load example sentences from curriculum packs and generate interactive Star puzzles
  useEffect(() => {
    let isCancelled = false;
    const generateFromCurriculum = async () => {
      try {
        const lvl = selectedLevel === 'All' ? 'N2' : selectedLevel;
        const packs = await ContentLoader.getPacksForLevel(lvl);
        const generated: StarScramblePuzzle[] = [];

        for (const pack of packs) {
          // 1. From grammar example sentences
          if (Array.isArray(pack.grammars)) {
            for (const g of pack.grammars) {
              const sentenceObj = pack.sentences?.find((s) => g.examples?.some((e) => e.sentenceId === s.id));
              const textJa = sentenceObj?.ja || g.clozeSentence;
              if (textJa && textJa.length >= 10) {
                const puzzle = StarScrambleEngine.createFromSentence(
                  `star_${pack.id}_${g.id}`,
                  `${g.pattern} - ${g.meaning}`,
                  textJa,
                  {
                    fullSentenceMy: sentenceObj?.translation?.my || (sentenceObj as any)?.translationMy || g.meaningMy,
                    fullSentenceEn: sentenceObj?.translation?.en || g.meaning,
                    grammarFocus: g.pattern,
                    detailedExplanationMy: g.explanationMy || g.explanation?.my,
                    level: pack.level,
                  }
                );
                if (puzzle) generated.push(puzzle);
              }
            }
          }

          // 2. From pack sentences
          if (Array.isArray(pack.sentences)) {
            for (const s of pack.sentences.slice(0, 3)) {
              if (s.ja && s.ja.length >= 14 && generated.length < 35) {
                const puzzle = StarScrambleEngine.createFromSentence(
                  `star_${s.id}`,
                  s.ja.slice(0, 18) + '...',
                  s.ja,
                  {
                    fullSentenceMy: s.translation?.my || (s as any).translationMy,
                    fullSentenceEn: s.translation?.en,
                    level: pack.level,
                  }
                );
                if (puzzle) generated.push(puzzle);
              }
            }
          }
        }

        if (!isCancelled && generated.length > 0) {
          setCurriculumPuzzles(generated);
        }
      } catch {
        // fallback to catalog
      }
    };

    generateFromCurriculum();
    return () => {
      isCancelled = true;
    };
  }, [selectedLevel]);

  // Combined puzzle pool: custom -> curriculum -> fallback catalog
  const activePuzzlePool = useMemo(() => {
    if (customPuzzles && customPuzzles.length > 0) return customPuzzles;
    if (curriculumPuzzles.length > 0) {
      if (selectedLevel === 'All') return [...curriculumPuzzles, ...STAR_SCRAMBLE_CATALOG];
      const filtered = curriculumPuzzles.filter((p) => p.level === selectedLevel);
      return filtered.length > 0 ? filtered : [...curriculumPuzzles, ...STAR_SCRAMBLE_CATALOG];
    }
    if (selectedLevel === 'All') return STAR_SCRAMBLE_CATALOG;
    const catFiltered = STAR_SCRAMBLE_CATALOG.filter((p) => p.level === selectedLevel);
    return catFiltered.length > 0 ? catFiltered : STAR_SCRAMBLE_CATALOG;
  }, [customPuzzles, curriculumPuzzles, selectedLevel]);

  const currentPuzzle: StarScramblePuzzle =
    activePuzzlePool[currentIndex] || activePuzzlePool[0] || STAR_SCRAMBLE_CATALOG[0];

  // Placed option numbers set
  const placedOptions = new Set(slots.filter((n): n is number => n !== null));

  // Reset when puzzle advances
  const resetPuzzleState = useCallback(() => {
    setSlots([null, null, null, null]);
    setEvaluation(null);
    setShowExplanation(false);
  }, []);

  useEffect(() => {
    resetPuzzleState();
  }, [currentIndex, resetPuzzleState]);

  // Handle assigning an option to the first available slot
  const handleAssignOption = useCallback(
    (optionNumber: number) => {
      if (evaluation) return; // Locked after submission
      if (placedOptions.has(optionNumber)) return;

      const firstEmptyIndex = slots.findIndex((s) => s === null);
      if (firstEmptyIndex === -1) return;

      const newSlots = [...slots];
      newSlots[firstEmptyIndex] = optionNumber;
      setSlots(newSlots);
    },
    [slots, placedOptions, evaluation]
  );

  // Handle clearing a slot
  const handleClearSlot = useCallback(
    (slotIdx: number) => {
      if (evaluation) return;
      if (slots[slotIdx] === null) return;
      const newSlots = [...slots];
      newSlots[slotIdx] = null;
      setSlots(newSlots);
    },
    [slots, evaluation]
  );

  // Handle submitting
  const handleSubmit = useCallback(async () => {
    if (slots.some((s) => s === null)) return;
    const res = StarScrambleEngine.evaluate(currentPuzzle, slots);
    setEvaluation(res);
    setHistoryScores((prev) => [...prev, res.score]);

    // Save study event
    try {
      await db.study_events.add({
        id: `evt_scramble_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: 'grammar.star_scramble',
        data: {
          puzzleId: currentPuzzle.id,
          score: res.score,
          isStarCorrect: res.isStarCorrect,
          isFullyCorrect: res.isFullyCorrect,
        },
      });
    } catch {
      // Ignore Dexie background write errors
    }
  }, [slots, currentPuzzle]);

  // Centralized scoped keyboard shortcuts (1-4 to assign, Enter to submit/proceed)
  useScopedShortcuts({
    scopeId: 'star_scramble_trainer',
    priority: 20,
    handlers: {
      SELECT_CHOICE_1: () => handleAssignOption(1),
      SELECT_CHOICE_2: () => handleAssignOption(2),
      SELECT_CHOICE_3: () => handleAssignOption(3),
      SELECT_CHOICE_4: () => handleAssignOption(4),
      SUBMIT_ANSWER: () => {
        if (evaluation) {
          handleNextPuzzle();
        } else if (slots.every((s) => s !== null)) {
          handleSubmit();
        }
      },
      NEXT_ITEM: () => {
        if (evaluation) {
          handleNextPuzzle();
        }
      },
      PREV_ITEM: () => {
        for (let i = slots.length - 1; i >= 0; i--) {
          if (slots[i] !== null) {
            handleClearSlot(i);
            break;
          }
        }
      },
    },
  });

  const handleNextPuzzle = () => {
    if (currentIndex < activePuzzlePool.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all puzzles
      const totalScore = historyScores.reduce((a, b) => a + b, 0);
      const avg = Math.round(totalScore / (activePuzzlePool.length || 1));
      if (onComplete) {
        onComplete({
          score: avg,
          accuracy: avg,
          totalPuzzles: activePuzzlePool.length,
        });
      }
    }
  };

  // Helper to get token object by optionNumber
  const getToken = (optNum: number | null): ScrambleToken | undefined => {
    if (optNum === null) return undefined;
    return currentPuzzle.tokens.find((t) => t.optionNumber === optNum);
  };

  const isAllFilled = slots.every((s) => s !== null);

  // Native Speech
  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center space-x-2">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <span className="font-mono text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs font-myanmar">
          {/* Level Switcher */}
          <div className="flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[10px]">
            {(['All', 'N5', 'N4', 'N3', 'N2'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedLevel(lvl);
                  setCurrentIndex(0);
                  resetPuzzleState();
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                  selectedLevel === lvl
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <span className="text-stone-700">
            မေးခွန်း {currentIndex + 1} / {activePuzzlePool.length}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px]">
            JLPT {currentPuzzle.level}
          </span>
        </div>
      </div>

      {/* Main Puzzle Card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm relative overflow-hidden font-myanmar">
        {/* Question Header & Title */}
        <div className="space-y-1.5 border-b border-stone-200 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)</span>
            </h2>
            <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold">
              အမှတ်ပေးမည့်နေရာ: 3rd Blank [★] Slot
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>မေးခွန်း: အောက်ပါဝါကျရှိ ★ နေရာတွင် ဝင်ရမည့် အသင့်တော်ဆုံးကို ရွေးချယ်ပါ။</span>
            <span className="font-japanese font-semibold text-stone-800">{currentPuzzle.title}</span>
          </div>
        </div>

        {/* The Sentence with 4 Blank Slots */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="text-lg sm:text-xl md:text-2xl font-japanese leading-loose text-stone-900 flex flex-wrap items-center gap-x-2 gap-y-3">
            {/* Sentence Prefix */}
            <span className="text-stone-700 font-medium">{currentPuzzle.prefix}</span>

            {/* 4 Interactive Blank Slots */}
            {slots.map((optNum, slotIdx) => {
              const isStar = slotIdx === currentPuzzle.starSlotIndex;
              const token = getToken(optNum);

              let slotBorder = 'border-dashed border-stone-300 bg-white text-stone-400';
              if (token) {
                slotBorder = 'border-solid border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs';
              }
              if (isStar) {
                slotBorder = token
                  ? 'border-solid border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40 shadow-xs'
                  : 'border-dashed border-amber-400 bg-amber-50/50 text-amber-700';
              }

              // After evaluation
              if (evaluation) {
                const correctOptionForThisSlot = currentPuzzle.correctTokenOrder[slotIdx];
                const isThisSlotCorrect = optNum === correctOptionForThisSlot;
                if (isStar) {
                  slotBorder = evaluation.isStarCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-rose-500 bg-rose-50 text-rose-800';
                } else if (isThisSlotCorrect) {
                  slotBorder = 'border-emerald-300 bg-emerald-50/70 text-emerald-700';
                } else {
                  slotBorder = 'border-rose-300 bg-rose-50/70 text-rose-700';
                }
              }

              return (
                <button
                  key={slotIdx}
                  onClick={() => handleClearSlot(slotIdx)}
                  disabled={Boolean(evaluation)}
                  className={`min-w-[90px] sm:min-w-[120px] h-12 sm:h-14 px-3 rounded-xl border-2 flex items-center justify-center font-bold text-sm sm:text-base transition cursor-pointer relative group ${slotBorder}`}
                  title={
                    token
                      ? `နှိပ်၍ ဖယ်ရှားရန် (ရွေးချယ်မှု ${token.optionNumber})`
                      : `အကွက် ${slotIdx + 1}${isStar ? ' ★ ပစ်မှတ်' : ''}`
                  }
                >
                  {isStar && (
                    <span className="absolute -top-3 -right-2 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs font-bold text-xs select-none">
                      ★
                    </span>
                  )}

                  {token ? (
                    <span className="flex items-center gap-1 font-japanese">
                      <span className="text-[10px] font-mono opacity-60">({token.optionNumber})</span>
                      <span>{token.text}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs opacity-50">
                      [ {slotIdx + 1} ]
                    </span>
                  )}
                </button>
              );
            })}

            {/* Sentence Suffix */}
            <span className="text-stone-700 font-medium">{currentPuzzle.suffix}</span>
          </div>
        </div>

        {/* Available Phrase Tokens Tray */}
        <div className="space-y-3 font-myanmar">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span>ရွေးချယ်ရန် စကားစုများ (Options):</span>
            <span className="text-[11px] text-stone-500">
              ကီးဘုတ် <kbd className="text-stone-700 font-bold">[1]</kbd> <kbd className="text-stone-700 font-bold">[2]</kbd> <kbd className="text-stone-700 font-bold">[3]</kbd> <kbd className="text-stone-700 font-bold">[4]</kbd> သို့မဟုတ် ကလစ်နှိပ်၍ ရွေးချယ်နိုင်သည်
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currentPuzzle.tokens.map((token) => {
              const isUsed = placedOptions.has(token.optionNumber);
              return (
                <button
                  key={token.id}
                  onClick={() => handleAssignOption(token.optionNumber)}
                  disabled={isUsed || Boolean(evaluation)}
                  className={`p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 relative shadow-2xs ${
                    isUsed
                      ? 'opacity-30 bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-white border-stone-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-stone-900 active:scale-95'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-stone-100 border border-stone-300 text-[10px] font-mono text-stone-600 flex items-center justify-center">
                    {token.optionNumber}
                  </span>
                  <span className="text-sm sm:text-base font-bold font-japanese">
                    {token.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button: Submit or Next */}
        <div className="flex items-center justify-between pt-2 font-myanmar">
          <button
            onClick={() => setSlots([null, null, null, null])}
            disabled={slots.every((s) => s === null) || Boolean(evaluation)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono text-stone-500 hover:text-stone-800 disabled:opacity-30 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ပြန်စမည် (Reset)</span>
          </button>

          {!evaluation ? (
            <button
              onClick={handleSubmit}
              disabled={!isAllFilled}
              className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-xs ${
                isAllFilled
                  ? 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                  : 'bg-stone-200 text-stone-400 border border-stone-200 cursor-not-allowed'
              }`}
            >
              <span>အဖြေစစ်ဆေးမည် (Submit)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNextPuzzle}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-2 transition cursor-pointer active:scale-95 shadow-xs"
            >
              <span>
                {currentIndex < STAR_SCRAMBLE_CATALOG.length - 1 ? 'နောက်မေးခွန်းသို့ (Next)' : 'ရလဒ်ကို ကြည့်မည် (View Results)'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* POST-SUBMISSION RESULTS & GRAMMATICAL CHAIN LINKAGE DIAGRAM    */}
        {/* ------------------------------------------------------------- */}
        <AnimatePresence>
          {evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pt-6 border-t border-stone-200 font-myanmar"
            >
              {/* Outcome Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-start justify-between gap-4 shadow-sm ${
                  evaluation.isStarCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      evaluation.isStarCorrect
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {evaluation.isStarCorrect ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          evaluation.isStarCorrect ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {evaluation.isStarCorrect ? '★ အဖြေမှန် (Correct) !' : '★ အဖြေမှား (Incorrect)'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700">
                        ရမှတ်: {evaluation.score} မှတ်
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {evaluation.feedbackMessage}
                    </p>

                    <div className="text-xs font-mono pt-1 text-stone-500">
                      အဖြေမှန် စီစဉ်မှု (Correct Order):{' '}
                      <strong className="text-stone-900">
                        {currentPuzzle.correctTokenOrder.join(' → ')}
                      </strong>{' '}
                      (★ = {currentPuzzle.starOptionNumber})
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeak(currentPuzzle.fullSentenceJa)}
                  className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                  title="Speak complete sentence"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                </button>
              </div>

              {/* Complete Correct Sentence Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-2.5 shadow-2xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 block">
                  အဖြေမှန် ဝါကျ အပြည့်အစုံ
                </span>
                <p className="text-base sm:text-lg font-bold font-japanese text-stone-900 leading-relaxed">
                  {currentPuzzle.fullSentenceJa}
                </p>
                {currentPuzzle.fullSentenceMy ? (
                  <>
                    <p className="text-xs text-amber-800 font-myanmar leading-relaxed">
                      {currentPuzzle.fullSentenceMy}
                    </p>
                    {currentPuzzle.fullSentenceEn && (
                      <p className="text-xs text-stone-600 font-sans">
                        {currentPuzzle.fullSentenceEn}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-stone-600 font-medium">
                    {currentPuzzle.fullSentenceEn}
                  </p>
                )}
              </div>

              {/* Grammatical Chain Linkage Diagram (接続チェーン解説) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-stone-700 font-mono">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>သဒ္ဒါစကားဆက် ဆက်စပ်မှု ရှင်းလင်းချက် (Chain Logic)</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentPuzzle.chainReasoning.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1.5 hover:border-stone-300 transition shadow-2xs"
                    >
                      <div className="flex items-center space-x-2 text-xs font-bold font-japanese text-stone-800">
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[10px] text-stone-600">
                          အဆင့် {idx + 1}
                        </span>
                        <span className="text-indigo-700">{link.fromText}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-amber-700">{link.toText}</span>
                      </div>

                      <p className="text-xs text-stone-800 font-japanese leading-relaxed">
                        {link.ruleJa}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {link.ruleEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1 leading-relaxed shadow-2xs">
                <span className="font-bold text-stone-900 block font-mono">
                  💡 ဖြေဆိုနည်း အဓိကအချက် (Strategy Insight):
                </span>
                <p>{currentPuzzle.detailedExplanation}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
