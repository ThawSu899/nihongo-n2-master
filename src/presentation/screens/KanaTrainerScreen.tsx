import React, { useState, useEffect } from 'react';
import { Volume2, Award, Check, X, RotateCcw, Clock, Layers, Sparkles, Filter } from 'lucide-react';
import { KANA_DATASET, KanaEngine, RawKanaDef } from '../../domain/kana/kana-engine';
import { KanaRecord, SRSCard } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import { SystemClock } from '../../domain/common/clock';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { fisherYatesShuffle } from '../../domain/assessment/shuffler';

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
  const [stats, setStats] = useState({ mastered: 0, learning: 0, total: 0 });

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

  const currentKana: RawKanaDef | undefined = filteredKana[currentIndex % Math.max(1, filteredKana.length)];

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

  const handleCheck = async (answerToCheck: string) => {
    if (!currentKana || feedback) return;

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
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedOption(null);
    setUserTyped('');
    setQuestionStartMs(Date.now());
    setCurrentIndex((prev) => (prev + 1) % filteredKana.length);
  };

  // Keyboard shortcut listener (1-4 for choices, Enter for next)
  useEffect(() => {
    if (!currentKana || mode !== 'practice') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (['1', '2', '3', '4'].includes(e.key) && !feedback) {
        const idx = parseInt(e.key, 10) - 1;
        if (options[idx]) {
          setSelectedOption(options[idx]);
          handleCheck(options[idx]);
        }
      } else if (e.key === 'Enter' && feedback) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentKana, options, feedback, mode]);

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
              onClick={() => { setSelectedScript('hiragana'); setCurrentIndex(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedScript === 'hiragana' ? 'bg-rose-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hiragana (ひらがな)
            </button>
            <button
              onClick={() => { setSelectedScript('katakana'); setCurrentIndex(0); }}
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
              onClick={() => { setSelectedCategory(cat); setCurrentIndex(0); }}
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
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-6 shadow-2xl">
          <div className="flex justify-between items-center text-xs text-stone-500 font-mono">
            <span>Character {currentIndex + 1} of {filteredKana.length}</span>
            <span className="capitalize">{currentKana.category}</span>
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
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-between ${
                    isSelected
                      ? feedback?.isCorrect
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-600 text-rose-200'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-[10px] flex items-center justify-center mr-2 font-mono">
                      {i + 1}
                    </span>
                    <span>{opt}</span>
                  </span>
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
                    handleCheck(userTyped.trim());
                  }
                }
              }}
              placeholder="Or type romaji / character and press Enter..."
              disabled={Boolean(feedback)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 text-center focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                feedback.isCorrect
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.isCorrect ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                <span>{feedback.isCorrect ? 'Correct!' : `Answer: ${feedback.answer}`}</span>
              </div>
              <button
                onClick={handleNext}
                className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold"
              >
                Next (Enter) →
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
