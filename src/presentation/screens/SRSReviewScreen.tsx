import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Volume2,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Layers,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { SRSCard, SRSRating } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import {
  FSRSScheduler,
  getCardsDueToday,
  burySiblings,
  getLadderBandLabel,
} from '../../domain/srs/srs-scheduler';
import { SystemClock } from '../../domain/common/clock';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { EventRepository } from '../../data/repositories/event-repository';

interface SRSReviewScreenProps {
  onBack: () => void;
  onReviewsCompleted: () => void;
}

const ITEM_TYPE_STYLES: Record<string, { label: string; badge: string }> = {
  vocab: { label: 'Vocabulary', badge: 'bg-rose-950/80 text-rose-300 border-rose-800/80' },
  kanji: { label: 'Kanji', badge: 'bg-purple-950/80 text-purple-300 border-purple-800/80' },
  grammar: { label: 'Grammar', badge: 'bg-sky-950/80 text-sky-300 border-sky-800/80' },
  sentence: { label: 'Sentence', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' },
  kana: { label: 'Kana', badge: 'bg-amber-950/80 text-amber-300 border-amber-800/80' },
};

export const SRSReviewScreen: React.FC<SRSReviewScreenProps> = ({
  onBack,
  onReviewsCompleted,
}) => {
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const clock = new SystemClock();
  const scheduler = new FSRSScheduler(clock);
  const { play, stop, isPlaying, currentPlayingText } = useAudioPlayer();

  const loadDueCards = async () => {
    setLoading(true);
    const allCards = await db.srs_cards.toArray();
    const due = getCardsDueToday(allCards, clock, 4);
    const buried = burySiblings(due);
    setCards(buried);
    setCurrentIndex(0);
    setIsFlipped(false);
    setLoading(false);
  };

  useEffect(() => {
    loadDueCards();
  }, []);

  // Keyboard shortcut listener (Space to flip, 1-4 to rate)
  useEffect(() => {
    if (cards.length === 0 || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        else if (e.key === '2') handleRate('hard');
        else if (e.key === '3') handleRate('good');
        else if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, currentIndex, isFlipped, loading]);

  const handleRate = async (rating: SRSRating) => {
    if (cards.length === 0) return;
    const currentCard = cards[currentIndex];

    const { updatedCard, logEntry } = scheduler.scheduleReview(currentCard, rating);

    await db.srs_cards.put(updatedCard);
    await db.review_logs.add(logEntry);
    await EventRepository.record('srs_reviewed', {
      cardId: currentCard.id,
      rating,
      priorInterval: logEntry.priorIntervalDays,
      newInterval: logEntry.newIntervalDays,
    });

    setReviewedCount((prev) => prev + 1);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      // Completed all cards in queue
      onReviewsCompleted();
      loadDueCards();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-rose-500/30 border-t-rose-500 rounded-full"
        />
        <p className="text-stone-400 text-xs font-medium tracking-wide">
          Loading spaced repetition review queue...
        </p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-md mx-auto text-center py-12 px-6 sm:px-8 space-y-6 bg-stone-900/90 backdrop-blur-sm border border-stone-800 rounded-3xl shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-950/90 border border-emerald-600/80 mx-auto flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 inline-block">
            Queue Complete
          </span>
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight">All Caught Up!</h2>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            No reviews due before the 04:00 AM daily rollover. Take a well-earned break or continue with today&apos;s curriculum lessons.
          </p>
        </div>

        {reviewedCount > 0 && (
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-4 flex items-center justify-around text-center">
            <div>
              <span className="text-2xl font-bold text-rose-400 font-mono">{reviewedCount}</span>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Reviewed</p>
            </div>
            <div className="h-8 w-px bg-stone-800" />
            <div>
              <span className="text-2xl font-bold text-emerald-400 font-mono">100%</span>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Cleared</p>
            </div>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-rose-950/40"
        >
          Return to Dashboard
        </motion.button>
      </motion.div>
    );
  }

  const currentCard = cards[currentIndex];
  const ladderBand = getLadderBandLabel(currentCard.intervalDays);
  const typeStyle = ITEM_TYPE_STYLES[currentCard.itemType] || {
    label: currentCard.itemType,
    badge: 'bg-stone-800 text-stone-300 border-stone-700',
  };
  const progressPct = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 px-3 sm:px-0">
      {/* Top Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 hover:text-stone-200 transition py-1 px-2 -ml-2 rounded-lg hover:bg-stone-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">Exit</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-rose-400 font-semibold text-xs">
              {currentIndex + 1} / {cards.length}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-800/80 text-[10px] text-stone-300 border border-stone-700/80 font-mono">
              {ladderBand}
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800/80">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Leech Flag Notice */}
      <AnimatePresence>
        {currentCard.isLeech && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 text-xs text-amber-300 flex items-start space-x-2.5 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-amber-200">
                Leech Card Flagged (Lapses: {currentCard.lapses})
              </span>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                This item has lapsed multiple times. Connect it with mnemonics or example context rather than rote repetition.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 w-full" style={{ perspective: 1000 }}>
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={() => !isFlipped && setIsFlipped(true)}
          className={`bg-stone-900 border ${
            isFlipped ? 'border-rose-900/60 shadow-rose-950/20' : 'border-stone-800 hover:border-stone-700'
          } rounded-3xl p-6 sm:p-8 min-h-[340px] flex flex-col justify-between text-center cursor-pointer transition-colors shadow-2xl relative select-none`}
        >
          {/* Card Meta Badges */}
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span
              className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${typeStyle.badge}`}
            >
              {typeStyle.label}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-stone-950/80 border border-stone-800 text-stone-400 uppercase tracking-wider">
              {currentCard.facet}
            </span>
          </div>

          {/* Card Body */}
          <div className="my-auto py-6 space-y-4">
            <motion.div
              layout
              className="text-4xl sm:text-5xl md:text-6xl font-bold font-japanese text-stone-100 tracking-tight leading-normal"
            >
              {currentCard.prompt}
            </motion.div>

            {/* Flipped content reveal */}
            <AnimatePresence mode="wait">
              {isFlipped ? (
                <motion.div
                  key="answer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-4 border-t border-stone-800/80"
                >
                  {currentCard.reading && (
                    <div className="text-xl sm:text-2xl text-rose-300 font-japanese font-medium tracking-wide">
                      {currentCard.reading}
                    </div>
                  )}

                  <div className="text-xl sm:text-2xl font-bold text-stone-100 tracking-tight">
                    {currentCard.meaning}
                  </div>

                  {currentCard.exampleSentence && (
                    <p className="text-xs sm:text-sm text-stone-400 italic bg-stone-950/50 p-3 rounded-xl border border-stone-800/60 max-w-md mx-auto leading-relaxed">
                      &ldquo;{currentCard.exampleSentence}&rdquo;
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="prompt-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4 flex items-center justify-center space-x-1.5 text-xs text-stone-500"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-600 animate-pulse" />
                  <span>Click card or press <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] text-stone-300 font-mono">Space</kbd> to reveal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Audio Pronunciation Button (Plays audio file or Japanese TTS) */}
          {(currentCard.audio || currentCard.itemType === 'vocab' || currentCard.itemType === 'kanji' || currentCard.itemType === 'sentence') && (
            <div className="flex justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const isCurrentPlaying = isPlaying && currentPlayingText === currentCard.prompt;
                  if (isCurrentPlaying) {
                    stop();
                  } else {
                    play(currentCard.prompt, currentCard.audio);
                  }
                }}
                className={`p-3 rounded-full ${
                  isPlaying && currentPlayingText === currentCard.prompt
                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                } border border-stone-700/80 transition-colors shadow-md`}
                title={isPlaying && currentPlayingText === currentCard.prompt ? 'Stop audio' : 'Play Japanese pronunciation'}
              >
                <Volume2 className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Action Controls & Rating Bar */}
      <AnimatePresence mode="wait">
        {isFlipped ? (
          <motion.div
            key="ratings"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('again')}
                className="py-3 px-3 rounded-2xl bg-stone-950 border border-rose-900/60 hover:bg-rose-950/70 text-rose-300 font-semibold text-xs transition shadow-sm flex flex-col items-center justify-center relative group"
              >
                <span className="flex items-center space-x-1">
                  <span>Again</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-rose-900/50 text-rose-300 font-mono font-normal">
                    1
                  </span>
                </span>
                <span className="text-[10px] text-rose-400/80 font-normal mt-0.5">&lt; 10m</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('hard')}
                className="py-3 px-3 rounded-2xl bg-stone-950 border border-amber-900/60 hover:bg-amber-950/70 text-amber-300 font-semibold text-xs transition shadow-sm flex flex-col items-center justify-center relative group"
              >
                <span className="flex items-center space-x-1">
                  <span>Hard</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-900/50 text-amber-300 font-mono font-normal">
                    2
                  </span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-normal mt-0.5">1.2x</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('good')}
                className="py-3 px-3 rounded-2xl bg-stone-950 border border-emerald-900/60 hover:bg-emerald-950/70 text-emerald-300 font-semibold text-xs transition shadow-sm flex flex-col items-center justify-center relative group"
              >
                <span className="flex items-center space-x-1">
                  <span>Good</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-900/50 text-emerald-300 font-mono font-normal">
                    3
                  </span>
                </span>
                <span className="text-[10px] text-emerald-400/80 font-normal mt-0.5">Standard</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('easy')}
                className="py-3 px-3 rounded-2xl bg-stone-950 border border-sky-900/60 hover:bg-sky-950/70 text-sky-300 font-semibold text-xs transition shadow-sm flex flex-col items-center justify-center relative group"
              >
                <span className="flex items-center space-x-1">
                  <span>Easy</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-sky-900/50 text-sky-300 font-mono font-normal">
                    4
                  </span>
                </span>
                <span className="text-[10px] text-sky-400/80 font-normal mt-0.5">1.3x+</span>
              </motion.button>
            </div>
            <p className="text-[10px] text-center text-stone-500 font-mono">
              Press numeric keys [1], [2], [3], [4] on your keyboard
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reveal-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 rounded-2xl bg-stone-800 hover:bg-stone-700/90 border border-stone-700 text-stone-100 font-semibold text-xs tracking-wide transition shadow-lg flex items-center justify-center space-x-2"
            >
              <span>Show Answer</span>
              <kbd className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-[10px] text-stone-400 font-mono">
                Space
              </kbd>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
