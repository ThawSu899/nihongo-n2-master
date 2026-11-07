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
  Clock,
  Pause,
  Play,
  Edit3,
} from 'lucide-react';
import { SRSCard, SRSRating, GhostCardRecord } from '../../domain/models/types';
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
import { isKanjiChar, getOrDecomposeKanji, KanjiDetail } from '../../domain/dictionary/kanji-catalog';
import { KanjiDrawer } from '../components/KanjiDrawer';
import { InteractiveKanjiText } from '../components/InteractiveKanjiText';
import { ClozeSentenceCard } from '../components/ClozeSentenceCard';
import { GhostQuarantineHub } from '../components/GhostQuarantineHub';
import { GhostScheduler, GHOST_STAGE_INTERVALS_HOURS } from '../../domain/srs/ghost-scheduler';
import { useGlobalShortcuts, useScopedShortcuts } from '../context/GlobalShortcutContext';

interface SRSReviewScreenProps {
  onBack: () => void;
  onReviewsCompleted: () => void;
}

const ITEM_TYPE_STYLES: Record<string, { label: string; badge: string }> = {
  vocab: { label: 'ဝေါဟာရ (Vocab)', badge: 'bg-rose-950/80 text-rose-300 border-rose-800/80' },
  kanji: { label: 'ခန်ဂျီ (Kanji)', badge: 'bg-purple-950/80 text-purple-300 border-purple-800/80' },
  grammar: { label: 'သဒ္ဒါ (Grammar)', badge: 'bg-sky-950/80 text-sky-300 border-sky-800/80' },
  sentence: { label: 'ဝါကျ (Sentence)', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' },
  kana: { label: 'ခါနာ (Kana)', badge: 'bg-amber-950/80 text-amber-300 border-amber-800/80' },
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
  const [selectedKanji, setSelectedKanji] = useState<KanjiDetail | null>(null);
  const [selectedKanjiContext, setSelectedKanjiContext] = useState<string | undefined>(undefined);
  const [autoAdvanceSec, setAutoAdvanceSec] = useState<number>(0); // 0 = off, 4s, 7s
  const [timerRemaining, setTimerRemaining] = useState<number>(0);

  // Bunpro Replica Enhancements: Cloze Mode & Ghost Quarantine
  const [viewMode, setViewMode] = useState<'review' | 'ghosts'>('review');
  const [clozeMode, setClozeMode] = useState<boolean>(true);
  const [activeGhostDrill, setActiveGhostDrill] = useState<GhostCardRecord | null>(null);
  const [ghostCount, setGhostCount] = useState<number>(0);

  const clock = new SystemClock();
  const scheduler = new FSRSScheduler(clock);
  const { play, stop, isPlaying, currentPlayingText, playbackRate, setPlaybackRate } = useAudioPlayer();

  const isDrawerOpen = selectedKanji !== null;

  // Reset timer when card changes or flips
  useEffect(() => {
    if (autoAdvanceSec > 0) {
      setTimerRemaining(autoAdvanceSec);
    }
  }, [currentIndex, isFlipped, autoAdvanceSec]);

  // Auto-advance countdown: paused if KanjiDrawer is open or audio is actively playing
  useEffect(() => {
    if (autoAdvanceSec <= 0 || loading || cards.length === 0) return;
    if (isDrawerOpen || isPlaying) {
      // Pauses while inspecting kanji drawer or playing audio
      return;
    }

    const timer = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          if (!isFlipped) {
            setIsFlipped(true);
            return autoAdvanceSec;
          } else {
            handleRate('good');
            return autoAdvanceSec;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoAdvanceSec, isDrawerOpen, isPlaying, isFlipped, loading, cards.length, currentIndex]);

  const handleInspectKanji = (char: string, sentenceText: string) => {
    if (!isKanjiChar(char)) return;
    const detail = getOrDecomposeKanji(char, sentenceText);
    setSelectedKanji(detail);
    setSelectedKanjiContext(sentenceText);
    if (isPlaying) {
      stop();
    }
  };

  const refreshGhostCount = async () => {
    try {
      const active = await GhostScheduler.getActiveGhosts();
      setGhostCount(active.length);
    } catch {
      // Ignore background error
    }
  };

  const loadDueCards = async () => {
    setLoading(true);
    const allCards = await db.srs_cards.toArray();
    const due = getCardsDueToday(allCards, clock, 4);
    const buried = burySiblings(due);
    setCards(buried);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedKanji(null);
    setSelectedKanjiContext(undefined);
    setLoading(false);
  };

  useEffect(() => {
    loadDueCards();
    refreshGhostCount();
  }, []);

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

    // Auto-quarantine stubborn leeches (>= 3 lapses) into Ghost Quarantine
    if (updatedCard.lapses >= 3 || updatedCard.isLeech) {
      await GhostScheduler.spawnGhost(updatedCard);
      await refreshGhostCount();
    }

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

  const { getDisplayBadge } = useGlobalShortcuts();

  // Centralized scoped keyboard shortcuts for SRS reviews
  useScopedShortcuts({
    scopeId: 'srs_review',
    enabled: cards.length > 0 && !loading && selectedKanji === null && activeGhostDrill === null,
    priority: 15,
    handlers: {
      FLIP_CARD: () => {
        setIsFlipped((prev) => !prev);
      },
      SRS_AGAIN: () => {
        if (isFlipped) handleRate('again');
      },
      SRS_HARD: () => {
        if (isFlipped) handleRate('hard');
      },
      SRS_GOOD: () => {
        if (isFlipped) handleRate('good');
      },
      SRS_EASY: () => {
        if (isFlipped) handleRate('easy');
      },
      PLAY_AUDIO: () => {
        const currentCard = cards[currentIndex];
        if (currentCard) {
          const isCurrentPlaying = isPlaying && currentPlayingText === currentCard.prompt;
          if (isCurrentPlaying) {
            stop();
          } else {
            play(currentCard.prompt, currentCard.audio);
          }
        }
      },
    },
  });

  // Dedicated Ghost Quarantine review handler
  const handleGhostDrillRate = async (rating: SRSRating) => {
    if (!activeGhostDrill) return;
    const passed = rating === 'good' || rating === 'easy';
    await GhostScheduler.advanceGhost(activeGhostDrill.id, passed);
    await refreshGhostCount();
    setActiveGhostDrill(null);
  };

  // 1. Ghost Quarantine Drill Screen
  if (activeGhostDrill) {
    const ghostAsCard: SRSCard = {
      id: activeGhostDrill.id,
      itemId: activeGhostDrill.grammarId,
      lessonId: '',
      itemType: 'grammar',
      facet: 'cloze',
      prompt: activeGhostDrill.clozeTarget,
      reading: activeGhostDrill.clozeTarget,
      meaning: activeGhostDrill.nuanceExplanationEn,
      exampleSentence: activeGhostDrill.clozeSentence,
      state: 'relearning',
      intervalDays: 0,
      repetition: activeGhostDrill.stage,
      stability: 1,
      difficulty: 4.5,
      lapses: 3,
      isLeech: true,
      due: activeGhostDrill.due,
    };

    return (
      <div className="max-w-xl mx-auto space-y-5 pb-24 px-3 sm:px-0">
        <div className="flex items-center justify-between text-xs text-stone-400 font-myanmar">
          <button
            onClick={() => setActiveGhostDrill(null)}
            className="flex items-center space-x-1.5 hover:text-stone-200 transition py-1 px-2 -ml-2 rounded-lg hover:bg-stone-800/50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">လေ့ကျင့်ခန်းမှ ထွက်မည်</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/50 text-[10px] font-mono font-bold uppercase shadow-sm">
              Ghost Quarantine &bull; Stage {activeGhostDrill.stage} (+{GHOST_STAGE_INTERVALS_HOURS[activeGhostDrill.stage]}h)
            </span>
          </div>
        </div>

        <ClozeSentenceCard
          card={ghostAsCard}
          meaningMyanmar={activeGhostDrill.nuanceExplanationMy}
          englishTranslation={activeGhostDrill.nuanceExplanationEn}
          onRate={handleGhostDrillRate}
          onInspectKanji={handleInspectKanji}
          onAudioPlay={(text) => play(text)}
        />

        <KanjiDrawer
          kanji={selectedKanji}
          isOpen={Boolean(selectedKanji)}
          onClose={() => setSelectedKanji(null)}
          sentenceContext={selectedKanjiContext}
        />
      </div>
    );
  }

  // 2. Ghost Quarantine Hub Screen
  if (viewMode === 'ghosts') {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24 px-3 sm:px-0 font-myanmar">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('review')}
            className="flex items-center space-x-1.5 text-xs text-stone-400 hover:text-stone-200 transition py-1 px-2 -ml-2 rounded-lg hover:bg-stone-800/50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">ပုံမှန် SRS စာရင်းသို့ ပြန်သွားမည်</span>
          </button>
          <span className="px-2.5 py-1 rounded-full bg-rose-950/90 border border-rose-500/40 text-[10px] font-mono text-rose-300 font-bold uppercase">
            အားနည်းချက် စီမံခန့်ခွဲရာ ဗဟို
          </span>
        </div>

        <GhostQuarantineHub
          onStartGhostReview={(ghost) => setActiveGhostDrill(ghost)}
          onRefreshParentQueue={() => {
            refreshGhostCount();
            loadDueCards();
          }}
        />

        <KanjiDrawer
          kanji={selectedKanji}
          isOpen={Boolean(selectedKanji)}
          onClose={() => setSelectedKanji(null)}
          sentenceContext={selectedKanjiContext}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4 font-myanmar">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-rose-500/30 border-t-rose-500 rounded-full"
        />
        <p className="text-stone-400 text-xs font-medium tracking-wide">
          SRS မှတ်ဉာဏ်လေ့ကျင့်ရေး ကတ်များကို ဆွဲယူနေပါသည်...
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
        className="max-w-md mx-auto text-center py-12 px-6 sm:px-8 space-y-6 bg-stone-900/90 backdrop-blur-sm border border-stone-800 rounded-3xl shadow-2xl font-myanmar"
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
            လေ့ကျင့်မှု ပြီးမြောက်ပါပြီ
          </span>
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight">ဒီကနေ့အတွက် အားလုံးပြီးပါပြီ!</h2>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            မနက် ၄:၀၀ မတိုင်မီ ပြန်လည်လေ့ကျင့်ရန် ကျန်ရှိသော ကတ်များ မရှိတော့ပါ။ ခေတ္တအနားယူပါ သို့မဟုတ် သင်ခန်းစာများကို ဆက်လက်လေ့လာနိုင်ပါသည်။
          </p>
        </div>

        {reviewedCount > 0 && (
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-4 flex items-center justify-around text-center">
            <div>
              <span className="text-2xl font-bold text-rose-400 font-mono">{reviewedCount}</span>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">လေ့ကျင့်ပြီး</p>
            </div>
            <div className="h-8 w-px bg-stone-800" />
            <div>
              <span className="text-2xl font-bold text-emerald-400 font-mono">100%</span>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">ပြီးစီးမှု</p>
            </div>
          </div>
        )}

        {ghostCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('ghosts')}
            className="w-full py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 text-xs font-semibold tracking-wide transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>သဒ္ဒါအားနည်းချက် ပြန်လေ့ကျင့်ရန် ({ghostCount} ခု)</span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold tracking-wide transition shadow-lg shadow-rose-950/40 cursor-pointer"
        >
          ပင်မစာမျက်နှာသို့ ပြန်သွားမည်
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
  const isGrammarCloze =
    clozeMode && (currentCard.itemType === 'grammar' || currentCard.facet === 'cloze');

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 px-3 sm:px-0">
      {/* Top Header & Progress */}
      <div className="space-y-3 font-myanmar">
        <div className="flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 hover:text-stone-200 transition py-1 px-2 -ml-2 rounded-lg hover:bg-stone-800/50 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">ထွက်မည်</span>
          </button>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* View Mode Toggle: Queue vs Ghosts */}
            <div className="flex items-center bg-zinc-950/80 border border-zinc-800/80 rounded-full p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setViewMode('review')}
                className="px-2.5 py-0.5 rounded-full transition cursor-pointer bg-rose-950 text-rose-300 font-bold border border-rose-500/40"
              >
                SRS စာရင်း ({cards.length})
              </button>
              <button
                onClick={() => setViewMode('ghosts')}
                className="px-2.5 py-0.5 rounded-full transition flex items-center space-x-1 cursor-pointer text-zinc-500 hover:text-zinc-300"
              >
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                <span>အားနည်းချက် ({ghostCount})</span>
              </button>
            </div>

            {/* Cloze Mode Toggle for Grammar Cards */}
            {(currentCard.itemType === 'grammar' || currentCard.facet === 'cloze') && (
              <button
                onClick={() => setClozeMode(!clozeMode)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition cursor-pointer ${
                  clozeMode
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50 font-bold'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Toggle between Cloze Active Production and Flip Card"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{clozeMode ? 'Cloze' : 'Flip'}</span>
              </button>
            )}

            {/* Auto-Advance Mode Toggle with Drawer Pause Indicator */}
            <div className="flex items-center space-x-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-full px-2.5 py-0.5 text-[10px] font-mono">
              <Clock className="w-3 h-3 text-zinc-400" />
              {autoAdvanceSec > 0 && isDrawerOpen ? (
                <span className="text-amber-400 font-semibold animate-pulse flex items-center space-x-1">
                  <Pause className="w-2.5 h-2.5 inline" />
                  <span>ခေတ္တရပ်ထားသည်</span>
                </span>
              ) : autoAdvanceSec > 0 ? (
                <span className="text-emerald-400 font-semibold">
                  {timerRemaining}s
                </span>
              ) : null}
              <button
                onClick={() => {
                  setAutoAdvanceSec((prev) => {
                    if (prev === 0) return 4;
                    if (prev === 4) return 7;
                    return 0;
                  });
                }}
                className="hover:text-zinc-200 text-zinc-400 underline decoration-zinc-700 underline-offset-2 transition cursor-pointer"
                title="Toggle Auto-advance pace (pauses automatically when KanjiDrawer is open)"
              >
                Auto: {autoAdvanceSec === 0 ? 'ပိတ်' : `${autoAdvanceSec}s`}
              </button>
            </div>

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
            className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 text-xs text-amber-300 flex items-start space-x-2.5 shadow-sm font-myanmar"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-amber-200">
                ခက်ခဲသောအချက်အဖြစ် သတ်မှတ်ထားသည် (အမှားအကြိမ်: {currentCard.lapses})
              </span>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                ဤအချက်သည် အကြိမ်ကြိမ် မှားယွင်းဖူးပါသည်။ အလွတ်ကျက်မည့်အစား နမူနာဝါကျ သို့မဟုတ် မှတ်သားနည်း အထောက်အကူများဖြင့် တွဲစပ်မှတ်သားပါ။
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cloze Active Production Card OR 3D Flip Card Container */}
      {isGrammarCloze ? (
        <ClozeSentenceCard
          card={currentCard}
          meaningMyanmar={(currentCard as any).meaningMyanmar}
          englishTranslation={currentCard.meaning}
          onRate={handleRate}
          onInspectKanji={handleInspectKanji}
          onAudioPlay={(text) => play(text)}
        />
      ) : (
        <>
          {/* 3D Flip Card Container */}
          <div className="perspective-1000 w-full" style={{ perspective: 1000 }}>
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => !isFlipped && setIsFlipped(true)}
              className={`bg-zinc-900/80 backdrop-blur-xl border ${
                isFlipped
                  ? 'border-rose-500/40 shadow-[0_0_30px_-6px_rgba(244,63,94,0.25)]'
                  : 'border-zinc-800/80 hover:border-zinc-700/80 shadow-black/80'
              } rounded-3xl p-6 sm:p-8 min-h-[340px] flex flex-col justify-between text-center cursor-pointer transition-colors shadow-2xl relative select-none`}
            >
          {/* Card Meta Badges */}
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span
              className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${typeStyle.badge}`}
            >
              {typeStyle.label}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-zinc-400 uppercase tracking-wider">
              {currentCard.facet}
            </span>
          </div>

          {/* Card Body */}
          <div className="my-auto py-6 space-y-4">
            <motion.div
              layout
              className="text-4xl sm:text-5xl md:text-6xl font-bold font-japanese text-zinc-100 tracking-tight leading-normal"
            >
              <InteractiveKanjiText
                text={currentCard.prompt}
                sentenceContext={currentCard.exampleSentence || currentCard.prompt}
                onInspectKanji={handleInspectKanji}
                kanjiClassName="hover:text-rose-300"
              />
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
                  className="space-y-3 pt-4 border-t border-zinc-800/80 font-myanmar"
                >
                  {currentCard.reading && (
                    <div className="text-xl sm:text-2xl text-rose-300 font-japanese font-medium tracking-wide">
                      {currentCard.reading}
                    </div>
                  )}

                  <div className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                    {(currentCard as any).meaningMyanmar || currentCard.meaning}
                  </div>

                  {(currentCard as any).meaningMyanmar && currentCard.meaning && (currentCard as any).meaningMyanmar !== currentCard.meaning && (
                    <div className="text-xs text-zinc-400 font-sans">
                      {currentCard.meaning}
                    </div>
                  )}

                  {currentCard.exampleSentence && (
                    <div className="text-xs sm:text-sm text-zinc-300 italic bg-zinc-950/70 p-3.5 rounded-2xl border border-zinc-800/80 max-w-md mx-auto leading-relaxed shadow-inner">
                      &ldquo;
                      <InteractiveKanjiText
                        text={currentCard.exampleSentence}
                        sentenceContext={currentCard.exampleSentence}
                        onInspectKanji={handleInspectKanji}
                        kanjiClassName="hover:text-rose-300 not-italic"
                      />
                      &rdquo;
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="prompt-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4 flex items-center justify-center space-x-1.5 text-xs text-zinc-500 font-myanmar"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
                  <span>ကတ်ကို နှိပ်ပါ သို့မဟုတ် <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-mono">{getDisplayBadge('FLIP_CARD')}</kbd> ကို နှိပ်ပါ</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Audio Pronunciation Button & Speed Pills (Plays audio file or Japanese TTS) */}
          {(currentCard.audio || currentCard.itemType === 'vocab' || currentCard.itemType === 'kanji' || currentCard.itemType === 'sentence') && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
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
                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                } border border-zinc-700/80 transition-colors shadow-md cursor-pointer`}
                title={isPlaying && currentPlayingText === currentCard.prompt ? 'Stop audio' : 'Play Japanese pronunciation'}
              >
                <Volume2 className="w-4 h-4" />
              </motion.button>

              {/* TTS Speed Controls (0.75x, 1.0x, 1.25x, 1.5x) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center space-x-1 bg-zinc-900/90 px-2 py-1 rounded-xl border border-zinc-800 text-xs font-mono"
              >
                {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackRate(spd)}
                    className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      playbackRate === spd
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Action Controls & Rating Bar with Semantic Neon Glow Borders */}
      <AnimatePresence mode="wait">
        {isFlipped ? (
          <motion.div
            key="ratings"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            className="space-y-2 font-myanmar"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('again')}
                className="py-3 px-3 rounded-2xl bg-zinc-950/90 border border-rose-500/40 hover:bg-rose-950/60 text-rose-300 font-semibold text-xs transition shadow-[0_0_16px_-4px_rgba(244,63,94,0.3)] hover:shadow-[0_0_24px_-2px_rgba(244,63,94,0.5)] flex flex-col items-center justify-center relative group cursor-pointer"
              >
                <span className="flex items-center space-x-1">
                  <span>ထပ်လုပ်မည်</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono font-normal">
                    {getDisplayBadge('SRS_AGAIN')}
                  </span>
                </span>
                <span className="text-[10px] text-rose-400/80 font-normal mt-1">&lt; 10 မိနစ်</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('hard')}
                className="py-3 px-3 rounded-2xl bg-zinc-950/90 border border-amber-500/40 hover:bg-amber-950/60 text-amber-300 font-semibold text-xs transition shadow-[0_0_16px_-4px_rgba(245,158,11,0.3)] hover:shadow-[0_0_24px_-2px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center relative group cursor-pointer"
              >
                <span className="flex items-center space-x-1">
                  <span>ခက်သည်</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono font-normal">
                    {getDisplayBadge('SRS_HARD')}
                  </span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-normal mt-1">1.2x</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('good')}
                className="py-3 px-3 rounded-2xl bg-zinc-950/90 border border-emerald-500/40 hover:bg-emerald-950/60 text-emerald-300 font-semibold text-xs transition shadow-[0_0_16px_-4px_rgba(16,185,129,0.3)] hover:shadow-[0_0_24px_-2px_rgba(16,185,129,0.5)] flex flex-col items-center justify-center relative group cursor-pointer"
              >
                <span className="flex items-center space-x-1">
                  <span>ကောင်းသည်</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-normal">
                    {getDisplayBadge('SRS_GOOD')}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-400/80 font-normal mt-1">ပုံမှန်</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRate('easy')}
                className="py-3 px-3 rounded-2xl bg-zinc-950/90 border border-indigo-500/40 hover:bg-indigo-950/60 text-indigo-300 font-semibold text-xs transition shadow-[0_0_16px_-4px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_-2px_rgba(99,102,241,0.5)] flex flex-col items-center justify-center relative group cursor-pointer"
              >
                <span className="flex items-center space-x-1">
                  <span>လွယ်ကူသည်</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono font-normal">
                    {getDisplayBadge('SRS_EASY')}
                  </span>
                </span>
                <span className="text-[10px] text-indigo-400/80 font-normal mt-1">1.3x+</span>
              </motion.button>
            </div>
            <p className="text-[10px] text-center text-zinc-500 font-mono">
              ကီးဘုတ်ရှိ နံပါတ်ခလုတ် [{getDisplayBadge('SRS_AGAIN')}], [{getDisplayBadge('SRS_HARD')}], [{getDisplayBadge('SRS_GOOD')}], [{getDisplayBadge('SRS_EASY')}] များကို နှိပ်နိုင်ပါသည်
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reveal-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-myanmar"
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 text-zinc-100 font-semibold text-xs tracking-wide transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>အဖြေကြည့်မည် (Show Answer)</span>
              <kbd className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-[10px] text-zinc-400 font-mono">
                {getDisplayBadge('FLIP_CARD')}
              </kbd>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}

      {/* Kanji Drawer for Instant Inspection */}
      <KanjiDrawer
        kanji={selectedKanji}
        isOpen={Boolean(selectedKanji)}
        onClose={() => setSelectedKanji(null)}
        sentenceContext={selectedKanjiContext}
      />
    </div>
  );
};
