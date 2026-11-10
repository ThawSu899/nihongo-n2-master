import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  Plus,
  BookmarkCheck,
  Volume2,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react';
import {
  QuickSearchEngine,
  QuickSearchResult,
} from '../../domain/search/quick-search-engine';
import { KanjiDetail } from '../../domain/dictionary/kanji-catalog';
import { db } from '../../data/db/dexie-db';
import { SRSCard } from '../../domain/models/types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectKanji?: (kanji: KanjiDetail) => void;
  onOpenReference?: (tab: 'counters' | 'expressions' | 'mistakes') => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onInspectKanji,
  onOpenReference,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [minedSet, setMinedSet] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input upon open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown listener for palette shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Debounced search querying
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await QuickSearchEngine.search(query);
      setResults(res);
      setSelectedIndex(0);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle action on result item
  const handleSelectResult = (item: QuickSearchResult) => {
    if (item.category === 'kanji' && item.kanjiData && onInspectKanji) {
      onInspectKanji(item.kanjiData);
      onClose();
    } else if (item.referenceTab && onOpenReference) {
      onOpenReference(item.referenceTab);
      onClose();
    } else {
      // 1-Click mine to SRS
      handleAddResultToSRS(item);
    }
  };

  // 1-Click Add item to SRS
  const handleAddResultToSRS = async (item: QuickSearchResult) => {
    try {
      const profile = await db.profile.get('current_user');
      const activeDeckId = profile?.currentLessonId || 'n2.quick_search';

      const cardId = `quick_${item.category}_${item.title}_${Date.now()}`;
      const newCard: SRSCard = {
        id: cardId,
        itemId: `item_${item.title}`,
        lessonId: activeDeckId,
        itemType: item.category === 'kanji' ? 'kanji' : item.category === 'grammar' ? 'grammar' : 'vocab',
        facet: 'meaning',
        prompt: item.title,
        reading: item.reading || item.title,
        meaning: item.meaningEn,
        state: 'new',
        intervalDays: 1,
        repetition: 0,
        stability: 1.0,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };

      const existing = await db.srs_cards.where('itemId').equals(`item_${item.title}`).first();
      if (!existing) {
        await db.srs_cards.add(newCard);
      }

      setMinedSet((prev) => new Set([...prev, item.id]));
      setToastMessage(`「${item.title}」をSRSキューに追加しました`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Failed to add card from search:', err);
    }
  };

  // Native Speech
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Search Header */}
          <div className="p-4 border-b border-stone-200 flex items-center gap-3 bg-stone-50/60">
            <Search className="w-5 h-5 text-stone-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kanji, Vocabulary, N2 Grammar, or Leeches (e.g. 契, 把握, 契機, わけには)..."
              className="flex-1 bg-transparent text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none font-japanese"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-stone-400 hover:text-stone-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] text-stone-500 font-mono">
              ESC
            </kbd>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Results List */}
          <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
            {loading && (
              <div className="py-8 text-center text-xs text-stone-500 font-mono">
                Searching curriculum database...
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm text-stone-700">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-stone-500">
                  Try searching by Kanji character, English meaning, or Japanese reading.
                </p>
              </div>
            )}

            {!query.trim() && (
              <div className="py-10 px-6 text-center space-y-3">
                <div className="flex justify-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-600 font-mono">
                    漢字 · Kanji
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-600 font-mono">
                    語彙 · Vocabulary
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-600 font-mono">
                    文法 · N2 Grammar
                  </span>
                </div>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Type any keyword to query all JLPT N2 curriculum items, official dokkai glossary terms, and your active SRS flashcard deck instantly.
                </p>
              </div>
            )}

            {results.map((item, index) => {
              const isSelected = selectedIndex === index;
              const isMined = minedSet.has(item.id);

              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
              if (item.category === 'kanji') {
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (item.category === 'grammar') {
                badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              } else if (item.category === 'srs_card') {
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              } else if (item.category === 'counter') {
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (item.category === 'expression') {
                badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              } else if (item.category === 'trap') {
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              } else {
                badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Leading Badge / Char */}
                    <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <span className="text-lg font-bold font-japanese text-stone-900">
                        {item.title.slice(0, 2)}
                      </span>
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 font-japanese truncate">
                          {item.title}
                        </span>
                        {item.reading && (
                          <span className="text-xs text-indigo-700 font-japanese truncate">
                            【{item.reading}】
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 truncate">{item.meaningEn}</p>
                      {item.meaningMy && (
                        <p className="text-[11px] text-amber-800 font-myanmar truncate">
                          {item.meaningMy}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleSpeak(item.title, e)}
                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition"
                      title="Pronounce"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {item.category === 'kanji' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.kanjiData && onInspectKanji) {
                            onInspectKanji(item.kanjiData);
                            onClose();
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition"
                        title="Open in Kanji Drawer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {item.referenceTab && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenReference && item.referenceTab) {
                            onOpenReference(item.referenceTab);
                            onClose();
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Open in N5 Reference Workbench"
                      >
                        <span>Open Ref</span>
                        <ArrowRight className="w-3 h-3 text-amber-600" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddResultToSRS(item);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        isMined
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                      }`}
                      title="Add to active SRS queue"
                    >
                      {isMined ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add SRS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Hotkeys */}
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <div className="flex items-center gap-3">
              <span>Navigate: <kbd className="text-stone-700 font-semibold">↑</kbd> <kbd className="text-stone-700 font-semibold">↓</kbd></span>
              <span>Select: <kbd className="text-stone-700 font-semibold">↵</kbd></span>
              <span>Close: <kbd className="text-stone-700 font-semibold">ESC</kbd></span>
            </div>
            <div>
              <span>JLPT N2 Command Palette</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
