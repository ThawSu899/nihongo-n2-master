import React, { useState, useEffect, useCallback } from 'react';
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
import { useScopedShortcuts } from '../context/GlobalShortcutContext';

interface StarScrambleTrainerProps {
  onExit?: () => void;
  onComplete?: (summary: { score: number; accuracy: number; totalPuzzles: number }) => void;
}

export const StarScrambleTrainer: React.FC<StarScrambleTrainerProps> = ({
  onExit,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Current slot allocations: array of 4 (option numbers 1-4, or null)
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
  const [evaluation, setEvaluation] = useState<ScrambleEvaluation | null>(null);
  const [historyScores, setHistoryScores] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentPuzzle: StarScramblePuzzle =
    STAR_SCRAMBLE_CATALOG[currentIndex] || STAR_SCRAMBLE_CATALOG[0];

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
    if (currentIndex < STAR_SCRAMBLE_CATALOG.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all puzzles
      const totalScore = historyScores.reduce((a, b) => a + b, 0);
      const avg = Math.round(totalScore / STAR_SCRAMBLE_CATALOG.length);
      if (onComplete) {
        onComplete({
          score: avg,
          accuracy: avg,
          totalPuzzles: STAR_SCRAMBLE_CATALOG.length,
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
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <span className="font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>★ 文法・並べ替え (Sentence Scramble)</span>
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs font-myanmar">
          <span className="text-zinc-200">
            မေးခွန်း {currentIndex + 1} / {STAR_SCRAMBLE_CATALOG.length}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px]">
            JLPT {currentPuzzle.level}
          </span>
        </div>
      </div>

      {/* Main Puzzle Card */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden font-myanmar">
        {/* Question Header & Title */}
        <div className="space-y-1.5 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">
              မေးခွန်း: အောက်ပါဝါကျရှိ ★ နေရာတွင် ဝင်ရမည့် အသင့်တော်ဆုံးကို ရွေးချယ်ပါ။
            </span>
            <span className="text-xs font-mono text-amber-400/90 font-semibold">
              အမှတ်ပေးမည့်နေရာ: ★ အကွက်
            </span>
          </div>
          <h3 className="text-base font-bold text-zinc-200 font-japanese">
            {currentPuzzle.title}
          </h3>
        </div>

        {/* The Sentence with 4 Blank Slots */}
        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-inner space-y-4">
          <div className="text-lg sm:text-xl md:text-2xl font-japanese leading-loose text-zinc-100 flex flex-wrap items-center gap-x-2 gap-y-3">
            {/* Sentence Prefix */}
            <span className="text-zinc-300 font-medium">{currentPuzzle.prefix}</span>

            {/* 4 Interactive Blank Slots */}
            {slots.map((optNum, slotIdx) => {
              const isStar = slotIdx === currentPuzzle.starSlotIndex;
              const token = getToken(optNum);

              let slotBorder = 'border-dashed border-zinc-700 bg-zinc-900/60 text-zinc-500';
              if (token) {
                slotBorder = 'border-solid border-indigo-500/60 bg-indigo-950/40 text-indigo-200 shadow-md';
              }
              if (isStar) {
                slotBorder = token
                  ? 'border-solid border-amber-400 bg-amber-950/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/50'
                  : 'border-dashed border-amber-500/70 bg-amber-950/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
              }

              // After evaluation
              if (evaluation) {
                const correctOptionForThisSlot = currentPuzzle.correctTokenOrder[slotIdx];
                const isThisSlotCorrect = optNum === correctOptionForThisSlot;
                if (isStar) {
                  slotBorder = evaluation.isStarCorrect
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                    : 'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.4)]';
                } else if (isThisSlotCorrect) {
                  slotBorder = 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300';
                } else {
                  slotBorder = 'border-rose-500/50 bg-rose-950/30 text-rose-300';
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
                    <span className="absolute -top-3 -right-2 w-6 h-6 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-md font-bold text-xs select-none">
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
            <span className="text-zinc-300 font-medium">{currentPuzzle.suffix}</span>
          </div>
        </div>

        {/* Available Phrase Tokens Tray */}
        <div className="space-y-3 font-myanmar">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>ရွေးချယ်ရန် စကားစုများ (Options):</span>
            <span className="text-[11px] text-zinc-500">
              ကီးဘုတ် <kbd className="text-zinc-300 font-bold">[1]</kbd> <kbd className="text-zinc-300 font-bold">[2]</kbd> <kbd className="text-zinc-300 font-bold">[3]</kbd> <kbd className="text-zinc-300 font-bold">[4]</kbd> သို့မဟုတ် ကလစ်နှိပ်၍ ရွေးချယ်နိုင်သည်
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
                  className={`p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 relative ${
                    isUsed
                      ? 'opacity-30 bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-950/90 border-zinc-800/90 hover:border-indigo-500/60 hover:bg-zinc-900/90 text-zinc-100 shadow-sm hover:shadow-[0_0_16px_rgba(99,102,241,0.25)] active:scale-95'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-400 flex items-center justify-center">
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
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ပြန်စမည် (Reset)</span>
          </button>

          {!evaluation ? (
            <button
              onClick={handleSubmit}
              disabled={!isAllFilled}
              className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg ${
                isAllFilled
                  ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-zinc-950 shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed'
              }`}
            >
              <span>အဖြေစစ်ဆေးမည် (Submit)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNextPuzzle}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-zinc-950 font-bold text-xs flex items-center space-x-2 shadow-[0_0_24px_rgba(16,185,129,0.4)] hover:shadow-[0_0_36px_rgba(16,185,129,0.6)] transition cursor-pointer active:scale-95"
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
              className="space-y-6 pt-6 border-t border-zinc-800/80 font-myanmar"
            >
              {/* Outcome Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-start justify-between gap-4 shadow-xl ${
                  evaluation.isStarCorrect
                    ? 'bg-emerald-950/70 border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-950/70 border-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.25)]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      evaluation.isStarCorrect
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
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
                          evaluation.isStarCorrect ? 'text-emerald-200' : 'text-rose-200'
                        }`}
                      >
                        {evaluation.isStarCorrect ? '★ အဖြေမှန် (Correct) !' : '★ အဖြေမှား (Incorrect)'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300">
                        ရမှတ်: {evaluation.score} မှတ်
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {evaluation.feedbackMessage}
                    </p>

                    <div className="text-xs font-mono pt-1 text-zinc-400">
                      အဖြေမှန် စီစဉ်မှု (Correct Order):{' '}
                      <strong className="text-zinc-100">
                        {currentPuzzle.correctTokenOrder.join(' → ')}
                      </strong>{' '}
                      (★ = {currentPuzzle.starOptionNumber})
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeak(currentPuzzle.fullSentenceJa)}
                  className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
                  title="Speak complete sentence"
                >
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                </button>
              </div>

              {/* Complete Correct Sentence Card */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 space-y-2.5 shadow-md">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block">
                  အဖြေမှန် ဝါကျ အပြည့်အစုံ
                </span>
                <p className="text-base sm:text-lg font-bold font-japanese text-zinc-100 leading-relaxed">
                  {currentPuzzle.fullSentenceJa}
                </p>
                {currentPuzzle.fullSentenceMy ? (
                  <>
                    <p className="text-xs text-amber-300/90 font-myanmar leading-relaxed">
                      {currentPuzzle.fullSentenceMy}
                    </p>
                    {currentPuzzle.fullSentenceEn && (
                      <p className="text-xs text-zinc-400 font-sans">
                        {currentPuzzle.fullSentenceEn}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-300 font-medium">
                    {currentPuzzle.fullSentenceEn}
                  </p>
                )}
              </div>

              {/* Grammatical Chain Linkage Diagram (接続チェーン解説) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 font-mono">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>သဒ္ဒါစကားဆက် ဆက်စပ်မှု ရှင်းလင်းချက် (Chain Logic)</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentPuzzle.chainReasoning.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center space-x-2 text-xs font-bold font-japanese text-zinc-200">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-[10px] text-zinc-400">
                          အဆင့် {idx + 1}
                        </span>
                        <span className="text-indigo-300">{link.fromText}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-amber-300">{link.toText}</span>
                      </div>

                      <p className="text-xs text-zinc-300 font-japanese leading-relaxed">
                        {link.ruleJa}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {link.ruleEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400 space-y-1 leading-relaxed">
                <span className="font-bold text-zinc-200 block font-mono">
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
