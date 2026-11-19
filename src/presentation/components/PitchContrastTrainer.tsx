import React, { useState } from 'react';
import { Volume2, Play, Sparkles, CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react';
import { PitchPattern } from '../../domain/audio/pitch-accent';
import { PitchAccentVisualizer } from './PitchAccentVisualizer';
import { filterJapaneseVoices } from '../../services/audio-resiliency';

export interface PitchPairWord {
  kanji: string;
  reading: string;
  pattern: PitchPattern;
  dropIndex?: number;
  meaningEn: string;
  meaningMy: string;
  exampleSentence?: string;
}

export interface PitchMinimalPair {
  id: string;
  title: string;
  note: string;
  words: PitchPairWord[];
}

export const MINIMAL_PAIRS_CATALOG: PitchMinimalPair[] = [
  {
    id: 'ame',
    title: '雨 (Rain) vs 飴 (Candy)',
    note: 'Classic [1] 頭高 (Atamadaka) vs [0] 平板 (Heiban) contrast. Notice the high pitch on the first mora for rain.',
    words: [
      {
        kanji: '雨',
        reading: 'あめ',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'Rain',
        meaningMy: 'မိုး',
        exampleSentence: '雨が降っています。 (It is raining.)',
      },
      {
        kanji: '飴',
        reading: 'あめ',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Candy',
        meaningMy: 'သကြားလုံး',
        exampleSentence: '飴を食べます。 (I eat candy.)',
      },
    ],
  },
  {
    id: 'hashi',
    title: '箸 (Chopsticks) vs 橋 (Bridge) vs 端 (Edge)',
    note: 'Three-way distinction: [1] 頭高 (Atamadaka) vs [2] 尾高 (Odaka) vs [0] 平板 (Heiban). With particle が: は↗し↘が (chopsticks), は↗しが↘ (bridge), は↗しが (edge).',
    words: [
      {
        kanji: '箸',
        reading: 'はし',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'Chopsticks',
        meaningMy: 'တူ',
        exampleSentence: '箸でご飯を食べます。',
      },
      {
        kanji: '橋',
        reading: 'はし',
        pattern: 'odaka',
        dropIndex: 2,
        meaningEn: 'Bridge',
        meaningMy: 'တံတား',
        exampleSentence: '長い橋を渡ります。',
      },
      {
        kanji: '端',
        reading: 'はし',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Edge / Corner',
        meaningMy: 'အစွန်း',
        exampleSentence: '道の端を歩きます。',
      },
    ],
  },
  {
    id: 'kaki',
    title: '牡蠣 (Oyster) vs 柿 (Persimmon)',
    note: 'Food homophone contrast: [1] 頭高 (Atamadaka) for oyster vs [0] 平板 (Heiban) for persimmon fruit.',
    words: [
      {
        kanji: '牡蠣',
        reading: 'かき',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'Oyster',
        meaningMy: 'ကမာ',
        exampleSentence: '新鮮な牡蠣を注文します。',
      },
      {
        kanji: '柿',
        reading: 'かき',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Persimmon',
        meaningMy: 'တည်သီး',
        exampleSentence: '秋に甘い柿を収穫します。',
      },
    ],
  },
  {
    id: 'shiro',
    title: '白 (White) vs 城 (Castle)',
    note: '[1] 頭高 (Atamadaka) adjective stem / color vs [0] 平板 (Heiban) architectural fortress.',
    words: [
      {
        kanji: '白',
        reading: 'しろ',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'White (Color)',
        meaningMy: 'အဖြူရောင်',
        exampleSentence: '白のシャツを選びました。',
      },
      {
        kanji: '城',
        reading: 'しろ',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Castle',
        meaningMy: 'ရဲတိုက်',
        exampleSentence: '古い城を見学しました。',
      },
    ],
  },
  {
    id: 'hana',
    title: '鼻 (Nose) vs 花 (Flower)',
    note: '[0] 平板 (Heiban) flat vs [2] 尾高 (Odaka) drop after particle が.',
    words: [
      {
        kanji: '鼻',
        reading: 'はな',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Nose',
        meaningMy: 'နှာခေါင်း',
        exampleSentence: '鼻がむずむずします。',
      },
      {
        kanji: '花',
        reading: 'はな',
        pattern: 'odaka',
        dropIndex: 2,
        meaningEn: 'Flower',
        meaningMy: 'ပန်း',
        exampleSentence: '綺麗な花が咲きました。',
      },
    ],
  },
  {
    id: 'kumo',
    title: '雲 (Cloud) vs 蜘蛛 (Spider)',
    note: '[1] 頭高 (Atamadaka) weather vs [0] 平板 (Heiban) arachnid.',
    words: [
      {
        kanji: '雲',
        reading: 'くも',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'Cloud',
        meaningMy: 'တိမ်',
        exampleSentence: '空に白い雲が浮かんでいます。',
      },
      {
        kanji: '蜘蛛',
        reading: 'くも',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Spider',
        meaningMy: 'ပင့်ကူ',
        exampleSentence: '蜘蛛が巣を作っています。',
      },
    ],
  },
  {
    id: 'sake',
    title: '鮭 (Salmon) vs 酒 (Sake / Alcohol)',
    note: '[1] 頭高 (Atamadaka) fish vs [0] 平板 (Heiban) traditional beverage.',
    words: [
      {
        kanji: '鮭',
        reading: 'さけ',
        pattern: 'atamadaka',
        dropIndex: 1,
        meaningEn: 'Salmon (Fish)',
        meaningMy: 'ဆယ်လ်မွန်ငါး',
        exampleSentence: '朝食に焼き鮭を食べます。',
      },
      {
        kanji: '酒',
        reading: 'さけ',
        pattern: 'heiban',
        dropIndex: 0,
        meaningEn: 'Sake / Alcohol',
        meaningMy: 'အရက် / ဂျပန်အရက်',
        exampleSentence: 'お酒を一杯飲みましょう。',
      },
    ],
  },
];

export interface PitchContrastTrainerProps {
  className?: string;
  onClose?: () => void;
}

export const PitchContrastTrainer: React.FC<PitchContrastTrainerProps> = ({
  className = '',
  onClose,
}) => {
  const [selectedPairIndex, setSelectedPairIndex] = useState<number>(0);
  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [quizTargetWord, setQuizTargetWord] = useState<PitchPairWord | null>(null);
  const [quizSelectedWord, setQuizSelectedWord] = useState<PitchPairWord | null>(null);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [isPlayingSeq, setIsPlayingSeq] = useState<boolean>(false);

  const currentPair = MINIMAL_PAIRS_CATALOG[selectedPairIndex];

  const playWordAudio = (word: PitchPairWord, overrideRate = 0.95): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.reading);
        utterance.lang = 'ja-JP';
        utterance.rate = overrideRate;

        // Slight pitch differentiation hint for synthetic voices
        if (word.pattern === 'atamadaka') {
          utterance.pitch = 1.15;
        } else if (word.pattern === 'heiban') {
          utterance.pitch = 0.95;
        } else {
          utterance.pitch = 1.05;
        }

        const jaVoices = filterJapaneseVoices(window.speechSynthesis.getVoices());
        if (jaVoices.length > 0) {
          utterance.voice = jaVoices[0];
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  };

  const playContrastSequence = async (words: PitchPairWord[]) => {
    if (isPlayingSeq) return;
    setIsPlayingSeq(true);
    for (let i = 0; i < words.length; i++) {
      await playWordAudio(words[i]);
      if (i < words.length - 1) {
        await new Promise((r) => setTimeout(r, 650));
      }
    }
    setIsPlayingSeq(false);
  };

  const startQuiz = () => {
    setQuizMode(true);
    setQuizSelectedWord(null);
    const words = currentPair.words;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setQuizTargetWord(randomWord);
    playWordAudio(randomWord);
  };

  const handleQuizAnswer = (word: PitchPairWord) => {
    if (quizSelectedWord || !quizTargetWord) return;
    setQuizSelectedWord(word);
    const isCorrect = word.kanji === quizTargetWord.kanji && word.pattern === quizTargetWord.pattern;
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  return (
    <div className={`bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Pitch Accent Contrast Trainer (アクセント対比訓練)
            </h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Auditory minimal pair distinction across Tokyo Standard Accent patterns (NHK日本語発音アクセント新辞典準拠)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (quizMode) {
                setQuizMode(false);
                setQuizSelectedWord(null);
              } else {
                startQuiz();
              }
            }}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              quizMode
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {quizMode ? 'Exit Ear Quiz' : 'Ear Quiz Mode'}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* TTS Disclaimer Notice */}
      <div className="mt-4 p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <span className="font-semibold">Phonological Note:</span> Browser TTS audio synthesis provides an approximate auditory guide. Always rely on the visual NHK Tokyo pitch accent contour diagrams below for definitive morae pitch contours (頭高, 中高, 尾高, 平板).
        </div>
      </div>

      {/* Pair Selector Tabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {MINIMAL_PAIRS_CATALOG.map((pair, idx) => (
          <button
            key={pair.id}
            type="button"
            onClick={() => {
              setSelectedPairIndex(idx);
              setQuizMode(false);
              setQuizSelectedWord(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedPairIndex === idx
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            {pair.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Pair Explanation */}
      <div className="mt-4 p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {currentPair.title}
        </h3>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
          {currentPair.note}
        </p>
      </div>

      {/* Quiz Mode Banner if active */}
      {quizMode && quizTargetWord && (
        <div className="mt-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                Listening Discrimination Drill: Which word did you hear?
              </span>
              <button
                type="button"
                onClick={() => playWordAudio(quizTargetWord)}
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                title="Replay Audio"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Score: {quizScore.correct} / {quizScore.total}
            </div>
          </div>
          {quizSelectedWord && (
            <div className="mt-3 flex items-center gap-2">
              {quizSelectedWord.kanji === quizTargetWord.kanji && quizSelectedWord.pattern === quizTargetWord.pattern ? (
                <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Correct! You recognized {quizTargetWord.kanji} ({quizTargetWord.pattern}).
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                  <XCircle className="w-4 h-4" /> Not quite! The spoken word was {quizTargetWord.kanji} ({quizTargetWord.pattern}).
                </div>
              )}
              <button
                type="button"
                onClick={startQuiz}
                className="ml-auto px-3 py-1 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Next Drill
              </button>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Word Cards */}
      <div className={`mt-5 grid grid-cols-1 ${currentPair.words.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {currentPair.words.map((word) => {
          const isTargetQuizOption = quizMode;
          const isSelectedInQuiz = quizSelectedWord?.kanji === word.kanji && quizSelectedWord?.pattern === word.pattern;

          return (
            <div
              key={`${word.kanji}-${word.pattern}`}
              className={`p-5 rounded-2xl border transition-all ${
                isSelectedInQuiz
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/40'
              }`}
            >
              {/* Word Top Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-black text-stone-900 dark:text-stone-50">
                    {word.kanji}
                  </div>
                  <div className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                    {word.reading}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => playWordAudio(word)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition"
                  title={`Play ${word.kanji}`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pitch Visualizer */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-700/60">
                <PitchAccentVisualizer
                  text={word.reading}
                  pattern={word.pattern}
                  dropIndex={word.dropIndex}
                  showBadge={true}
                  showContour={true}
                />
              </div>

              {/* Meanings */}
              <div className="mt-4 space-y-1 text-sm">
                <div className="text-stone-800 dark:text-stone-200 font-medium">
                  {word.meaningEn}
                </div>
                <div className="text-stone-600 dark:text-stone-400 text-xs">
                  {word.meaningMy}
                </div>
              </div>

              {/* Example sentence */}
              {word.exampleSentence && (
                <div className="mt-3 p-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-xs text-stone-600 dark:text-stone-400 italic">
                  {word.exampleSentence}
                </div>
              )}

              {/* Quiz Selection Button */}
              {isTargetQuizOption && (
                <button
                  type="button"
                  onClick={() => handleQuizAnswer(word)}
                  disabled={quizSelectedWord !== null}
                  className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition"
                >
                  Select {word.kanji}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Play Contrast Button */}
      {!quizMode && (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={isPlayingSeq}
            onClick={() => playContrastSequence(currentPair.words)}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            {isPlayingSeq ? 'Playing Contrast...' : 'Play Auditory Contrast (Back-to-Back)'}
          </button>
        </div>
      )}
    </div>
  );
};
