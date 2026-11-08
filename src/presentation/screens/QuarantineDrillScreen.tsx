import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Flame,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Layers,
  AlertTriangle,
  BrainCircuit,
  Award,
  Volume2,
} from 'lucide-react';
import {
  QuarantinedCard,
  GhostCardReason,
  QuarantineStats,
} from '../../domain/fsrs/quarantine-types';
import { QuarantineEngine } from '../../domain/fsrs/quarantine-engine';
import { db } from '../../data/db/dexie-db';
import { PitchAccentVisualizer } from '../components/PitchAccentVisualizer';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface QuarantineDrillScreenProps {
  onBack: () => void;
  className?: string;
}

// Built-in Seeded Diagnostic Fallback Cards for zero-state demo
const SEED_QUARANTINE_CARDS: QuarantinedCard[] = [
  {
    id: 'seed-n2-v01',
    itemType: 'vocabulary',
    wordOrPattern: '際',
    reading: 'さい',
    meaningBurmese: 'အခါ၊ အခွင့်အရေး (〜際（に） ယဉ်ကျေးသောအသုံး)',
    meaningEn: 'Time / occasion / circumstance (polite)',
    jlptLevel: 'N2',
    quarantineReason: 'HIGH_LAPSE_COUNT',
    quarantinedAt: Date.now() - 86400000 * 2,
    lapses: 4,
    currentStability: 0.9,
    currentDifficulty: 8.8,
    recoveryStreak: 1,
    isGraduated: false,
    pitchPattern: 'atamadaka',
    dropIndex: 1,
  },
  {
    id: 'seed-n2-v02',
    itemType: 'vocabulary',
    wordOrPattern: '契機',
    reading: 'けいき',
    meaningBurmese: 'လှုံ့ဆော်မှု၊ အစပျိုးပေးသောအရာ (အပြောင်းအလဲအတွက် အဓိကအကြောင်းအရင်း)',
    meaningEn: 'Opportunity / turning point / trigger',
    jlptLevel: 'N2',
    quarantineReason: 'LOW_STABILITY_PLATEAU',
    quarantinedAt: Date.now() - 86400000,
    lapses: 3,
    currentStability: 1.1,
    currentDifficulty: 9.0,
    recoveryStreak: 0,
    isGraduated: false,
    pitchPattern: 'atamadaka',
    dropIndex: 1,
  },
  {
    id: 'seed-n2-g01',
    itemType: 'grammar',
    wordOrPattern: '〜に伴って',
    reading: '〜にともなって',
    meaningBurmese: 'နှင့်အမျှ / ဖြစ်ပေါ်လာသည်နှင့်အတူ (အချိုးကျ ပြောင်းလဲမှု)',
    meaningEn: 'Along with / as a result of / as X changes, Y changes',
    jlptLevel: 'N2',
    quarantineReason: 'BURMESE_MISALIGNMENT',
    quarantinedAt: Date.now() - 3600000 * 12,
    lapses: 2,
    currentStability: 1.4,
    currentDifficulty: 8.6,
    recoveryStreak: 2,
    isGraduated: false,
    pitchPattern: 'nakadaka',
    dropIndex: 3,
  },
  {
    id: 'seed-n3-v01',
    itemType: 'vocabulary',
    wordOrPattern: '状況',
    reading: 'じょうきょう',
    meaningBurmese: 'အခြေအနေ၊ အခြေအနေအရပ်ရပ်',
    meaningEn: 'Situation / state of affairs',
    jlptLevel: 'N3',
    quarantineReason: 'MOCK_TEST_REPEATED_MISS',
    quarantinedAt: Date.now() - 3600000 * 6,
    lapses: 3,
    currentStability: 1.2,
    currentDifficulty: 7.9,
    recoveryStreak: 0,
    isGraduated: false,
    pitchPattern: 'heiban',
    dropIndex: 0,
  },
];

const REASON_METADATA: Record<
  GhostCardReason,
  { labelEn: string; labelMy: string; theme: string }
> = {
  HIGH_LAPSE_COUNT: {
    labelEn: 'High Lapse Count (3+)',
    labelMy: 'အကြိမ်ကြိမ် မှားယွင်းမှု',
    theme: 'bg-rose-950/70 border-rose-500/50 text-rose-300',
  },
  LOW_STABILITY_PLATEAU: {
    labelEn: 'Low Stability Plateau',
    labelMy: 'မှတ်ဉာဏ် မတည်ငြိမ်မှု',
    theme: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
  },
  MOCK_TEST_REPEATED_MISS: {
    labelEn: 'Repeated Mock Test Miss',
    labelMy: 'စာမေးပွဲတွင် ထပ်ခါမှားမှု',
    theme: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
  },
  BURMESE_MISALIGNMENT: {
    labelEn: 'Burmese Recall Delay (>25s)',
    labelMy: 'မြန်မာပြန် အမှတ်ရနှေးမှု',
    theme: 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300',
  },
};

export const QuarantineDrillScreen: React.FC<QuarantineDrillScreenProps> = ({
  onBack,
  className = '',
}) => {
  const [cards, setCards] = useState<QuarantinedCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [graduatedFeedback, setGraduatedFeedback] = useState<boolean>(false);
  const { play, stop, isPlaying, currentPlayingText } = useAudioPlayer();

  // Load from Dexie DB or initialize with seed demo cards
  useEffect(() => {
    async function loadQuarantinedCards() {
      try {
        const stored = await db.getAllQuarantinedCards();
        if (stored.length > 0) {
          setCards(stored);
        } else {
          // Persist seed demo cards so learner can immediately drill
          for (const seed of SEED_QUARANTINE_CARDS) {
            await db.upsertQuarantinedCard(seed);
          }
          setCards(SEED_QUARANTINE_CARDS);
        }
      } catch (err) {
        console.warn('[QuarantineDrill] IndexedDB read fallback to memory seeds:', err);
        setCards(SEED_QUARANTINE_CARDS);
      } finally {
        setLoading(false);
      }
    }
    loadQuarantinedCards();
  }, []);

  // Filter cards by level
  const filteredCards = cards.filter((c) => {
    if (selectedLevel === 'ALL') return true;
    return c.jlptLevel === selectedLevel;
  });

  const activeCards = filteredCards.filter((c) => !c.isGraduated);
  const currentCard: QuarantinedCard | undefined = activeCards[currentIndex % Math.max(1, activeCards.length)];
  const stats: QuarantineStats = QuarantineEngine.computeStats(cards);

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentCard) return;

    const result = QuarantineEngine.processDrillResult(currentCard, isCorrect);
    try {
      await db.upsertQuarantinedCard(result.updatedCard);
    } catch (e) {
      console.warn('[QuarantineDrill] Error saving card state:', e);
    }

    // Update in-memory state
    setCards((prev) =>
      prev.map((c) => (c.id === result.updatedCard.id ? result.updatedCard : c))
    );

    if (result.graduatedNow) {
      setGraduatedFeedback(true);
      setTimeout(() => {
        setGraduatedFeedback(false);
        setIsRevealed(false);
        setCurrentIndex((prev) => (activeCards.length > 1 ? prev : 0));
      }, 1500);
    } else {
      setIsRevealed(false);
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, activeCards.length));
    }
  };

  const handleResetCard = async () => {
    if (!currentCard) return;
    const resetCard: QuarantinedCard = {
      ...currentCard,
      recoveryStreak: 0,
      isGraduated: false,
    };
    await db.upsertQuarantinedCard(resetCard);
    setCards((prev) => prev.map((c) => (c.id === resetCard.id ? resetCard : c)));
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-zinc-400">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl text-zinc-100 ${className}`}
    >
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-850">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-[11px] font-bold text-rose-300">
                <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Ghost Card Quarantine (鬼カード)</span>
              </span>
              <span className="text-xs font-mono text-zinc-500">
                FSRS Recovery Engine
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-myanmar text-zinc-100 mt-1">
              အခက်အခဲရှိသော ကတ်များ အထူးပြန်လည်ဆယ်တင် လေ့ကျင့်ခန်း
            </h1>
          </div>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center space-x-2 bg-zinc-900/90 px-3.5 py-1.5 rounded-2xl border border-zinc-800 self-start sm:self-auto font-mono text-xs">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-zinc-400">Active Quarantined:</span>
          <span className="text-rose-400 font-bold">{stats.activeCount}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400 font-bold">
            {stats.graduatedCount} Graduated
          </span>
        </div>
      </div>

      {/* 2. Level Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-850">
          {['ALL', 'N5', 'N4', 'N3', 'N2'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                setCurrentIndex(0);
                setIsRevealed(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-400 font-myanmar">
          ဆက်တိုက် ၃ ကြိမ် မှန်ပါက ပုံမှန် SRS စနစ်သို့ ပြန်လည်ရောက်ရှိမည်ဖြစ်သည်
        </span>
      </div>

      {/* 3. Main Flashcard Area */}
      {currentCard ? (
        <div className="relative">
          {/* Card Frame */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
            {/* Background Subtle Accent Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header & Reason Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 ${
                    REASON_METADATA[currentCard.quarantineReason]?.theme ||
                    'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {REASON_METADATA[currentCard.quarantineReason]?.labelEn}
                  </span>
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {currentCard.jlptLevel} • {currentCard.itemType}
                </span>
              </div>

              {/* Recovery Streak Step Dots (0/3 to 3/3) */}
              <div className="flex items-center space-x-2 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
                <span className="text-[11px] font-mono text-zinc-400">
                  Streak: {currentCard.recoveryStreak}/3
                </span>
                <div className="flex items-center space-x-1.5">
                  {[0, 1, 2].map((step) => {
                    const filled = currentCard.recoveryStreak > step;
                    return (
                      <div
                        key={step}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          filled
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110'
                            : 'bg-zinc-800 border border-zinc-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Japanese Word / Pattern */}
            <div className="text-center py-6 space-y-2 relative z-10">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-5xl font-japanese font-bold text-zinc-100 tracking-wide">
                  {currentCard.wordOrPattern}
                </span>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    const isCurrent =
                      isPlaying &&
                      (currentPlayingText === currentCard.wordOrPattern ||
                        currentPlayingText === currentCard.reading);
                    if (isCurrent) {
                      stop();
                    } else {
                      play(currentCard.wordOrPattern, undefined, undefined, currentCard.reading);
                    }
                  }}
                  className={`p-2.5 rounded-full border transition cursor-pointer shadow-md ${
                    isPlaying &&
                    (currentPlayingText === currentCard.wordOrPattern ||
                      currentPlayingText === currentCard.reading)
                      ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                  title="Play Japanese pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </motion.button>
              </div>
              {currentCard.reading && currentCard.reading !== currentCard.wordOrPattern && (
                <div className="text-sm sm:text-base font-japanese text-indigo-300 font-mono">
                  {currentCard.reading}
                </div>
              )}
            </div>

            {/* Revealable Section: Pitch Accent, Burmese Meaning, English Meaning */}
            <AnimatePresence>
              {isRevealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 pt-4 border-t border-zinc-800 relative z-10"
                >
                  {/* Pitch Accent Visualizer */}
                  {currentCard.reading && (
                    <div className="flex justify-center pb-2">
                      <PitchAccentVisualizer
                        text={currentCard.reading}
                        pattern={currentCard.pitchPattern}
                        dropIndex={currentCard.dropIndex}
                        showBadge={true}
                        showContour={true}
                        compact={false}
                      />
                    </div>
                  )}

                  {/* Burmese Meaning */}
                  <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 space-y-1 text-center">
                    <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Burmese Translation (မြန်မာအဓိပ္ပာယ်)
                    </span>
                    <p className="text-base sm:text-lg font-myanmar text-zinc-100 font-semibold leading-relaxed">
                      {currentCard.meaningBurmese}
                    </p>
                  </div>

                  {/* English Meaning */}
                  <div className="text-center text-xs sm:text-sm text-zinc-400 font-sans">
                    <span className="font-mono text-zinc-500 mr-2">EN:</span>
                    {currentCard.meaningEn}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
              {!isRevealed ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-semibold text-sm flex items-center justify-center space-x-2 transition cursor-pointer border border-zinc-700/80 shadow-md"
                >
                  <Eye className="w-4 h-4 text-rose-400" />
                  <span className="font-myanmar">အဖြေကြည့်မည် (Show Answer)</span>
                </motion.button>
              ) : (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Failure / Reset Streak */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleAnswer(false)}
                    className="py-3.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-semibold text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-rose-950/40"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span className="font-myanmar">
                      မမှတ်မိသေးပါ (Streak 0 ပြန်စမည်)
                    </span>
                  </motion.button>

                  {/* Success / +1 Recovery */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleAnswer(true)}
                    className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-myanmar">
                      မှတ်မိပါပြီ (+1 Recovery Streak)
                    </span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Graduation Feedback Overlay */}
          <AnimatePresence>
            {graduatedFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3 z-30 border border-emerald-500/50 shadow-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                  <Award className="w-9 h-9 animate-bounce" />
                </div>
                <h3 className="text-xl font-bold font-myanmar text-emerald-300">
                  ဂုဏ်ယူပါသည်! ကတ်ကို အောင်မြင်စွာ ပြန်လည်ဆယ်တင်ပြီးပါပြီ
                </h3>
                <p className="text-xs font-mono text-zinc-400 max-w-sm">
                  3/3 Recovery Streak Achieved • Card stability boosted and returned to regular SRS review rotation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty / All Graduated State */
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950/70 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-myanmar text-zinc-100">
              Quarantine စာရင်းတွင် ကတ်များ မရှိတော့ပါ
            </h3>
            <p className="text-xs text-zinc-400 font-myanmar max-w-md mx-auto">
              အခက်အခဲရှိသော ကတ်အားလုံးကို အောင်မြင်စွာ ပြန်လည်ဆယ်တင်ပြီးပါပြီ သို့မဟုတ် သတ်မှတ်ထားသော Level တွင် ကတ်မရှိပါ။
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedLevel('ALL');
              setCurrentIndex(0);
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
          >
            Show All Levels
          </button>
        </div>
      )}

      {/* 4. Quarantine Diagnostic Stats Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-850 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">
            Total In Quarantine
          </span>
          <span className="text-base font-bold font-mono text-zinc-200">
            {stats.totalQuarantined}
          </span>
        </div>
        <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-850 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">
            Active Needing Drill
          </span>
          <span className="text-base font-bold font-mono text-rose-400">
            {stats.activeCount}
          </span>
        </div>
        <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-850 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">
            Graduated (Saved)
          </span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {stats.graduatedCount}
          </span>
        </div>
        <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-850 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">
            N2 High-Priority
          </span>
          <span className="text-base font-bold font-mono text-amber-400">
            {stats.byLevel.N2 || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
