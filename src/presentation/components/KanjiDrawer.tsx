import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  BookmarkCheck,
  Plus,
  Layers,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  KanjiDetail,
  KanjiRadicalComponent,
} from '../../domain/dictionary/kanji-catalog';
import { db } from '../../data/db/dexie-db';
import { SRSCard } from '../../domain/models/types';

export interface KanjiDrawerProps {
  kanji: KanjiDetail | null;
  isOpen?: boolean;
  onClose: () => void;
  sentenceContext?: string;
  onMined?: (kanjiChar: string, deckId?: string) => void;
}

export const KanjiDrawer: React.FC<KanjiDrawerProps> = ({
  kanji,
  isOpen = true,
  onClose,
  sentenceContext,
  onMined,
}) => {
  // 1. Explicit State for Radical Decomposition
  const [selectedComponent, setSelectedComponent] = useState<KanjiRadicalComponent | null>(null);

  // 2. Explicit State for Example Sentences
  const [showAllExamples, setShowAllExamples] = useState<boolean>(false);

  // 3. Audio synthesis state
  const [activeAudioTarget, setActiveAudioTarget] = useState<string | null>(null);

  // 4. SRS mining & toast state
  const [isMined, setIsMined] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; deck: string } | null>(null);

  // Reset internal states when kanji changes
  useEffect(() => {
    if (!kanji) {
      setSelectedComponent(null);
      setShowAllExamples(false);
      return;
    }

    setSelectedComponent(null);
    setShowAllExamples(false);
    setIsMined(false);

    db.srs_cards
      .where('itemId')
      .equals(`kanji_${kanji.char}`)
      .first()
      .then((existing) => {
        if (existing) {
          setIsMined(true);
        }
      })
      .catch(() => {});
  }, [kanji]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!kanji || !isOpen) {
    return null;
  }

  // Web Speech API Native Japanese Speech Synthesis
  const handleSpeak = (text: string, audioId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;

    setActiveAudioTarget(audioId);
    utterance.onend = () => setActiveAudioTarget(null);
    utterance.onerror = () => setActiveAudioTarget(null);

    window.speechSynthesis.speak(utterance);
  };

  // 1-Click Add Kanji to User's Active SRS Deck
  const handleAddKanjiToSRS = async () => {
    if (isMined) return;

    let activeDeckId = 'n2.dokkai_kanji';
    let activeDeckName = 'N2 読解漢字 (Dokkai Deck)';
    try {
      const profile = await db.profile.get('current_user');
      if (profile?.currentLessonId) {
        activeDeckId = profile.currentLessonId;
        activeDeckName = `Active Deck: ${profile.currentLessonId.toUpperCase()}`;
      }
    } catch {
      // Fallback to default
    }

    const allReadings = [...kanji.onyomi, ...kanji.kunyomi].join(' / ');
    const newCard: SRSCard = {
      id: `kanji_${kanji.char}_${Date.now()}`,
      itemId: `kanji_${kanji.char}`,
      lessonId: activeDeckId,
      itemType: 'kanji',
      facet: 'meaning',
      prompt: kanji.char,
      reading: allReadings || kanji.char,
      meaning: kanji.meaningEn,
      exampleSentence:
        sentenceContext || (kanji.examples[0] ? kanji.examples[0].sentenceJa : undefined),
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
      const existing = await db.srs_cards.where('itemId').equals(`kanji_${kanji.char}`).first();
      if (!existing) {
        await db.srs_cards.add(newCard);
      }

      await db.study_events.add({
        id: `evt_kanji_mine_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: activeDeckId,
        data: {
          kanji: kanji.char,
          strokes: kanji.strokes,
          source: 'dokkai_kanji_drawer',
          deckId: activeDeckId,
        },
      });

      setIsMined(true);
      if (onMined) {
        onMined(kanji.char, activeDeckId);
      }
      setToastMessage({
        title: `「${kanji.char}」をSRS単語帳に追加しました`,
        deck: activeDeckName,
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to add kanji to SRS:', err);
    }
  };

  // Filtered/Paged example sentences
  const displayedExamples = showAllExamples ? kanji.examples : kanji.examples.slice(0, 2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end select-none">
        {/* Semi-translucent dark glass backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Slide-Over Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-white border-l border-stone-200 shadow-2xl flex flex-col h-full overflow-hidden"
        >
          {/* Drawer Top Bar */}
          <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
                KANJI DRAWER · 漢字詳細
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                JLPT {kanji.level}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Visual Success Toast Indicator with Emerald Glow */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl shadow-xs flex items-start space-x-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="text-xs font-bold text-emerald-900">{toastMessage.title}</div>
                    <div className="text-[11px] font-mono text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>{toastMessage.deck}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setToastMessage(null)}
                    className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md transition"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Character Showcase Card */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
              <div className="flex items-center space-x-5">
                {/* Big Kanji Display Glyph */}
                <div className="w-20 h-20 rounded-2xl bg-white border border-stone-200 flex items-center justify-center shadow-inner relative group">
                  <span className="text-5xl font-bold font-japanese text-stone-900">
                    {kanji.char}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-stone-500 font-mono">
                    <span>
                      総画数: <strong className="text-stone-900">{kanji.strokes} 画</strong>
                    </span>
                    <span>·</span>
                    <span>
                      部首: <strong className="text-indigo-700">{kanji.radical}</strong>
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-stone-800 font-japanese">
                    {kanji.radicalName}
                  </div>
                  <div className="text-[11px] text-stone-600">{kanji.radicalMeaning}</div>
                </div>
              </div>

              {/* Japanese Speech Audio Button */}
              <button
                onClick={() =>
                  handleSpeak(
                    kanji.kunyomi[0]?.replace('・', '') || kanji.onyomi[0] || kanji.char,
                    'kanji_main'
                  )
                }
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs ${
                  activeAudioTarget === 'kanji_main'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-stone-300 text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
                title="Pronounce Japanese Reading"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RADICAL DECOMPOSITION SECTION (With Interactive State)        */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 font-mono">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>RADICAL BREAKDOWN (部首・構成要素)</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">
                  {kanji.components.length} components · click to inspect
                </span>
              </div>

              {/* Clickable Radical Component Grid */}
              <div className="grid grid-cols-2 gap-2">
                {kanji.components.map((comp, idx) => {
                  const isSelected = selectedComponent?.char === comp.char;
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setSelectedComponent(isSelected ? null : comp)
                      }
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 text-stone-900 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 hover:border-stone-300 hover:bg-stone-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold font-japanese text-indigo-700">
                          {comp.char}
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">
                          Part {idx + 1}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-stone-800 font-japanese truncate">
                        {comp.name}
                      </div>
                      <div className="text-[11px] text-stone-600 truncate">
                        {comp.meaningEn}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Selected Radical Spotlight Card */}
              <AnimatePresence>
                {selectedComponent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-800 font-semibold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-600" />
                        <span>構成要素: {selectedComponent.char} ({selectedComponent.name})</span>
                      </span>
                      <button
                        onClick={() => setSelectedComponent(null)}
                        className="text-stone-400 hover:text-stone-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-stone-800 font-medium leading-relaxed">
                      意味・由来: {selectedComponent.meaningEn}
                    </p>
                    <p className="text-[11px] text-stone-600 font-japanese">
                      この構成要素は「{kanji.char}」の成り立ちにおいて重要な意味的・表音的役割を果たしています。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Readings & Meanings */}
            <div className="space-y-3">
              {/* On'yomi */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 font-mono uppercase block">
                    音読み (On&apos;yomi)
                  </span>
                  <div className="text-sm font-bold text-stone-900 font-japanese mt-0.5">
                    {kanji.onyomi.length > 0 ? kanji.onyomi.join('、 ') : '—'}
                  </div>
                </div>
                {kanji.onyomi.length > 0 && (
                  <button
                    onClick={() => handleSpeak(kanji.onyomi.join('、 '), 'onyomi')}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      activeAudioTarget === 'onyomi'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                    title="Pronounce On'yomi"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Kun'yomi */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 font-mono uppercase block">
                    訓読み (Kun&apos;yomi)
                  </span>
                  <div className="text-sm font-bold text-stone-900 font-japanese mt-0.5">
                    {kanji.kunyomi.length > 0
                      ? kanji.kunyomi.map((k) => k.replace('・', '')).join('、 ')
                      : '—'}
                  </div>
                </div>
                {kanji.kunyomi.length > 0 && (
                  <button
                    onClick={() =>
                      handleSpeak(
                        kanji.kunyomi.map((k) => k.replace('・', '')).join('、 '),
                        'kunyomi'
                      )
                    }
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      activeAudioTarget === 'kunyomi'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                    title="Pronounce Kun'yomi"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Meanings */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 font-mono uppercase block">
                    English Meaning
                  </span>
                  <p className="text-stone-900 font-semibold">{kanji.meaningEn}</p>
                </div>
                {kanji.meaningMy && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-[10px] text-stone-500 font-mono uppercase block">
                      Burmese Meaning
                    </span>
                    <p className="text-amber-800 font-myanmar">{kanji.meaningMy}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CONTEXTUAL EXAMPLE SENTENCES (With Interactive Expansion)     */}
            {/* ------------------------------------------------------------- */}
            {kanji.examples.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>COMPOUNDS &amp; CONTEXT (用例・例文)</span>
                  </div>
                  {kanji.examples.length > 2 && (
                    <button
                      onClick={() => setShowAllExamples((prev) => !prev)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <span>{showAllExamples ? 'Show Less' : `View All (${kanji.examples.length})`}</span>
                      {showAllExamples ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {displayedExamples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 hover:border-stone-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-base font-bold font-japanese text-stone-900">
                            {ex.word}
                          </span>
                          <span className="text-xs font-japanese text-indigo-700 font-medium">
                            【{ex.reading}】
                          </span>
                        </div>

                        <button
                          onClick={() => handleSpeak(ex.sentenceJa || ex.word, `ex_${idx}`)}
                          className={`p-1 rounded transition cursor-pointer ${
                            activeAudioTarget === `ex_${idx}`
                              ? 'text-indigo-600'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                          title="Speak sentence"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-stone-700 font-medium">{ex.meaningEn}</p>
                      {ex.meaningMy && (
                        <p className="text-xs text-amber-800 font-myanmar">{ex.meaningMy}</p>
                      )}

                      <div className="pt-1.5 border-t border-stone-200 text-xs text-stone-600 font-japanese leading-relaxed">
                        「{ex.sentenceJa}」
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Bottom Action: 1-Click Mine to SRS */}
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50">
            {isMined ? (
              <div className="w-full py-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-2 shadow-2xs">
                <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                <span>✓ SRS漢字帳に追加済み (Linked to Active Deck)</span>
              </div>
            ) : (
              <button
                onClick={handleAddKanjiToSRS}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>1-Click Add to SRS (アクティブ単語帳に登録)</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const KanjiSlideOverDrawer = KanjiDrawer;
