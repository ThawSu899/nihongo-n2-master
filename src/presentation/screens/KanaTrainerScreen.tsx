import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Award, Check, X, RotateCcw, Clock, Layers, Sparkles, Filter, Zap } from 'lucide-react';
import { KANA_DATASET, KanaEngine, RawKanaDef } from '../../domain/kana/kana-engine';
import { KanaRecord, SRSCard } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import { SystemClock } from '../../domain/common/clock';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { fisherYatesShuffle } from '../../domain/assessment/shuffler';
import { useScopedShortcuts } from '../context/GlobalShortcutContext';

interface KanaTrainerScreenProps {
  onBack: () => void;
}

export const KanaTrainerScreen: React.FC<KanaTrainerScreenProps> = ({ onBack }) => {
  const [selectedScript, setSelectedScript] = useState<'hiragana' | 'katakana'>('hiragana');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'dakuten' | 'combo'>('basic');
  const [mode, setMode] = useState<'practice' | 'chart'>('practice');

  const [records, setRecords] = useState<Record<string, KanaRecord>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTyped, setUserTyped] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; answer: string } | null>(null);
  const [questionStartMs, setQuestionStartMs] = useState<number>(Date.now());
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [stats, setStats] = useState({ mastered: 0, learning: 0, total: 0 });

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clock = new SystemClock();
  const engine = new KanaEngine(clock);
  const { play, stop, isPlaying, currentPlayingText } = useAudioPlayer();

  const loadKanaRecords = async () => {
    const existing = await db.kana_records.toArray();
    const map: Record<string, KanaRecord> = {};
    existing.forEach((r) => {
      map[r.character] = r;
    });

    if (existing.length === 0) {
      const initial = engine.createInitialRecords();
      await db.kana_records.bulkAdd(initial);
      initial.forEach((r) => {
        map[r.character] = r;
      });
    }

    setRecords(map);

    const values = Object.values(map);
    const mastered = values.filter((v) => v.masteryState === 'mastered').length;
    const learning = values.filter((v) => v.masteryState === 'learning').length;
    setStats({ mastered, learning, total: values.length });
  };

  useEffect(() => {
    loadKanaRecords();
  }, []);

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const filteredKana = KANA_DATASET.filter((k) => {
    const scriptMatch = k.script === selectedScript;
    const categoryMatch =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'dakuten'
        ? k.category === 'dakuten' || k.category === 'handakuten'
        : k.category === selectedCategory;
    return scriptMatch && categoryMatch;
  });

  const totalKana = Math.max(1, filteredKana.length);
  const currentKana: RawKanaDef | undefined = filteredKana[currentIndex % totalKana];

  // Options for multiple choice
  const options = React.useMemo(() => {
    if (!currentKana) return [];
    const correct = currentKana.romaji[0];
    const pool = filteredKana
      .filter((k) => k.char !== currentKana.char)
      .map((k) => k.romaji[0]);
    const shuffledPool = fisherYatesShuffle([...new Set(pool)]).slice(0, 3);
    return fisherYatesShuffle([correct, ...shuffledPool]);
  }, [currentKana, filteredKana]);

  const handleNext = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setFeedback(null);
    setSelectedOption(null);
    setUserTyped('');
    setQuestionStartMs(Date.now());
    setCurrentIndex((prev) => (prev + 1) % totalKana);
  };

  const handleCheck = async (answerToCheck: string) => {
    if (!currentKana || feedback) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    const isCorrect = engine.checkKanaAnswer(answerToCheck, currentKana);
    const elapsed = Date.now() - questionStartMs;

    setFeedback({
      isCorrect,
      answer: currentKana.romaji[0],
    });

    const existingRec = records[currentKana.char] || {
      character: currentKana.char,
      romaji: currentKana.romaji,
      script: currentKana.script,
      category: currentKana.category,
      recognitionAccuracy: 0,
      productionAccuracy: 0,
      responseTime: 0,
      attempts: 0,
      masteryState: 'new',
    };

    const updated = engine.updateRecord(existingRec, isCorrect, false, elapsed);
    await db.kana_records.put(updated);
    setRecords((prev) => ({ ...prev, [updated.character]: updated }));

    // Auto-advance if enabled: quick 750ms transition on correct, 1400ms on incorrect so user can see correct answer
    if (autoAdvance) {
      const delay = isCorrect ? 750 : 1400;
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleNext();
      }, delay);
    }
  };

  // Centralized scoped keyboard shortcuts (1-4 for choices, Enter for next)
  useScopedShortcuts({
    scopeId: 'kana_trainer',
    enabled: Boolean(currentKana) && mode === 'practice',
    priority: 15,
    handlers: {
      SELECT_CHOICE_1: () => {
        if (!feedback && options[0]) {
          setSelectedOption(options[0]);
          handleCheck(options[0]);
        }
      },
      SELECT_CHOICE_2: () => {
        if (!feedback && options[1]) {
          setSelectedOption(options[1]);
          handleCheck(options[1]);
        }
      },
      SELECT_CHOICE_3: () => {
        if (!feedback && options[2]) {
          setSelectedOption(options[2]);
          handleCheck(options[2]);
        }
      },
      SELECT_CHOICE_4: () => {
        if (!feedback && options[3]) {
          setSelectedOption(options[3]);
          handleCheck(options[3]);
        }
      },
      SUBMIT_ANSWER: () => {
        if (feedback) {
          handleNext();
        }
      },
      NEXT_ITEM: () => {
        if (feedback) {
          handleNext();
        }
      },
      PLAY_AUDIO: () => {
        if (currentKana) {
          play(currentKana.char);
        }
      },
    },
  });

  const handleAddAllToSRS = async () => {
    for (const k of filteredKana) {
      const rec = records[k.char];
      if (rec) {
        const card = engine.createSRSCard(rec);
        await db.srs_cards.put(card);
      }
    }
    alert(`Added ${filteredKana.length} ${selectedScript} cards to your SRS review queue!`);
  };

  const handleSwitchScript = (script: 'hiragana' | 'katakana') => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setSelectedScript(script);
    setCurrentIndex(0);
    setFeedback(null);
    setSelectedOption(null);
    setUserTyped('');
  };

  const handleSwitchCategory = (cat: 'all' | 'basic' | 'dakuten' | 'combo') => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setFeedback(null);
    setSelectedOption(null);
    setUserTyped('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-stone-400 hover:text-stone-200 transition mb-1 block">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Kana Mastery Trainer</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Gojūon, Dakuten, Handakuten, and Yōon combinations for Hiragana and Katakana.
          </p>
        </div>

        {/* Script & Mode Switchers */}
        <div className="flex items-center space-x-2">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-1 flex">
            <button
              onClick={() => handleSwitchScript('hiragana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScript === 'hiragana' ? 'bg-rose-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hiragana (ひらがな)
            </button>
            <button
              onClick={() => handleSwitchScript('katakana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScript === 'katakana' ? 'bg-rose-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Katakana (カタカナ)
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Category Filter */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['basic', 'dakuten', 'combo', 'all'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => handleSwitchCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                selectedCategory === cat
                  ? 'bg-stone-800 text-stone-100 border border-stone-700'
                  : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              {cat === 'basic' ? 'Basic Gojūon (46)' : cat === 'dakuten' ? 'Dakuten / Handakuten' : cat === 'combo' ? 'Combos (Yōon)' : 'All Characters'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          {/* Auto advance toggle */}
          <button
            onClick={() => setAutoAdvance(!autoAdvance)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              autoAdvance
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-300'
            }`}
            title="Auto-advance immediately to the next character after answering"
          >
            <Zap className={`w-3.5 h-3.5 ${autoAdvance ? 'text-rose-400' : 'text-stone-500'}`} />
            <span>Auto Advance {autoAdvance ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setMode(mode === 'practice' ? 'chart' : 'practice')}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            {mode === 'practice' ? 'View Kana Chart' : 'Switch to Practice'}
          </button>
          <button
            onClick={handleAddAllToSRS}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-medium flex items-center space-x-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Send to SRS</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Practice Card */}
      {mode === 'practice' && currentKana && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-6 shadow-2xl relative">
          <div className="flex justify-between items-center text-xs text-stone-500 font-mono">
            <span>Character {currentIndex + 1} of {filteredKana.length}</span>
            <div className="flex items-center space-x-2">
              <span className="capitalize">{currentKana.category}</span>
              <button
                onClick={handleNext}
                className="text-rose-400 hover:text-rose-300 font-sans font-medium hover:underline text-[11px]"
              >
                Skip →
              </button>
            </div>
          </div>

          <div className="py-6 space-y-3">
            <div className="text-7xl font-bold font-japanese text-stone-100">{currentKana.char}</div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (isPlaying && currentPlayingText === currentKana.char) {
                    stop();
                  } else {
                    play(currentKana.char);
                  }
                }}
                className={`p-2.5 rounded-full transition ${
                  isPlaying && currentPlayingText === currentKana.char
                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
                title={isPlaying && currentPlayingText === currentKana.char ? 'Stop audio' : 'Play pronunciation'}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multiple choice selections */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = currentKana.romaji.includes(opt);

              let buttonStyle = 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700';
              if (feedback) {
                if (isSelected && feedback.isCorrect) {
                  buttonStyle = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30';
                } else if (isSelected && !feedback.isCorrect) {
                  buttonStyle = 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500/30';
                } else if (!isSelected && isCorrectAnswer && !feedback.isCorrect) {
                  // Show which choice was correct when learner got it wrong
                  buttonStyle = 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300';
                } else {
                  buttonStyle = 'bg-stone-950/60 border-stone-900 text-stone-500 opacity-60';
                }
              }

              return (
                <button
                  key={`${currentKana.char}_${opt}_${i}`}
                  onClick={() => {
                    if (!feedback) {
                      setSelectedOption(opt);
                      handleCheck(opt);
                    }
                  }}
                  disabled={Boolean(feedback)}
                  className={`py-3.5 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-between cursor-pointer active:scale-98 ${buttonStyle}`}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-[10px] flex items-center justify-center mr-2 font-mono">
                      {i + 1}
                    </span>
                    <span>{opt}</span>
                  </span>
                  {feedback && isSelected && (
                    <span>
                      {feedback.isCorrect ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Direct typing alternative */}
          <div className="pt-2">
            <input
              type="text"
              value={userTyped}
              onChange={(e) => setUserTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (feedback) {
                    handleNext();
                  } else if (userTyped.trim()) {
                    setSelectedOption(userTyped.trim());
                    handleCheck(userTyped.trim());
                  }
                }
              }}
              placeholder="Or type romaji / character and press Enter..."
              disabled={Boolean(feedback)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 text-center focus:outline-none focus:border-rose-500 placeholder:text-stone-600"
            />
          </div>

          {/* Feedback & manual Next button */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all duration-300 ${
                feedback.isCorrect
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.isCorrect ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                <span className="font-medium">
                  {feedback.isCorrect ? 'အဖြေမှန် (Correct!)' : `အဖြေမှန်: ${feedback.answer}`}
                </span>
                {autoAdvance && (
                  <span className="text-[10px] text-stone-400 font-mono">
                    (advancing...)
                  </span>
                )}
              </div>
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold cursor-pointer shadow-sm transition active:scale-95"
              >
                နောက်မေးခွန်းသို့ (Next) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Full Kana Grid Chart */}
      {mode === 'chart' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold text-stone-200 mb-4 capitalize">
            {selectedScript} Grid Table ({filteredKana.length} characters)
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {filteredKana.map((k) => {
              const rec = records[k.char];
              const isMastered = rec?.masteryState === 'mastered';
              return (
                <div
                  key={k.char}
                  onClick={() => {
                    if (isPlaying && currentPlayingText === k.char) {
                      stop();
                    } else {
                      play(k.char);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition hover:scale-105 ${
                    isPlaying && currentPlayingText === k.char
                      ? 'bg-rose-600 border-rose-500 text-white ring-2 ring-rose-400/50 scale-105'
                      : isMastered
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : 'bg-stone-950 border-stone-800 text-stone-200 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xl font-bold font-japanese">{k.char}</div>
                  <div className="text-[10px] text-stone-400 font-mono">{k.romaji[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
