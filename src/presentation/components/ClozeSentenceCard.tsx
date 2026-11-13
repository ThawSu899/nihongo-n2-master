import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as wanakana from 'wanakana';
import {
  Volume2,
  Sparkles,
  HelpCircle,
  CornerDownLeft,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Flame,
} from 'lucide-react';
import { SRSCard, SRSRating } from '../../domain/models/types';
import { isLeechCard, getCardEaseFactor } from '../../domain/srs/srs-scheduler';
import { NuanceInterceptor, NuanceCheckResult } from '../../domain/srs/nuance-interceptor';
import { NuanceWarningBanner } from './NuanceWarningBanner';
import { InteractiveKanjiText } from './InteractiveKanjiText';

export interface ClozeSentenceCardProps {
  card: SRSCard;
  englishTranslation?: string;
  meaningMyanmar?: string;
  onRate: (rating: SRSRating) => void;
  onInspectKanji?: (char: string, contextText: string) => void;
  onAudioPlay?: (text: string) => void;
}

export const ClozeSentenceCard: React.FC<ClozeSentenceCardProps> = ({
  card,
  englishTranslation = card.meaning,
  meaningMyanmar = (card as any).meaningMyanmar,
  onRate,
  onInspectKanji,
  onAudioPlay,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [nuanceWarning, setNuanceWarning] = useState<NuanceCheckResult | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Target grammar pattern to formulate
  const targetPattern = (card.reading || card.prompt).trim();
  const rawSentence = card.exampleSentence || `${card.prompt}を使います。`;

  // Parse sentence into prefix and suffix around target pattern or blank
  const [prefix, suffix] = React.useMemo(() => {
    if (rawSentence.includes('____')) {
      const parts = rawSentence.split('____');
      return [parts[0] || '', parts[1] || ''];
    }
    if (rawSentence.includes(targetPattern)) {
      const parts = rawSentence.split(targetPattern);
      return [parts[0] || '', parts.slice(1).join(targetPattern) || ''];
    }
    return [rawSentence, ''];
  }, [rawSentence, targetPattern]);

  // Focus input on mount or card change
  useEffect(() => {
    setInputVal('');
    setShowHint(false);
    setNuanceWarning(null);
    setIsEvaluated(false);
    setIsCorrect(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [card.id]);

  // Handle typing with Wanakana auto-conversion
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const kana = wanakana.toHiragana(raw, { IMEMode: true });
    setInputVal(kana);
    if (nuanceWarning) {
      setNuanceWarning(null);
    }
  };

  // Submit and evaluate cloze input
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isEvaluated) return;

    const check = NuanceInterceptor.inspect(inputVal, targetPattern);

    if (check.status === 'exact_match') {
      setIsEvaluated(true);
      setIsCorrect(true);
      setNuanceWarning(null);
      if (onAudioPlay) {
        onAudioPlay(rawSentence.replace('____', targetPattern));
      }
    } else if (check.status === 'synonym_warning') {
      setNuanceWarning(check);
    } else {
      setIsEvaluated(true);
      setIsCorrect(false);
      setNuanceWarning(null);
    }
  };

  // Reveal answer manually
  const handleReveal = () => {
    setIsEvaluated(true);
    setIsCorrect(false);
  };

  return (
    <div className="w-full space-y-4">
      {/* Cloze Container with Modern Academic Paper Styling */}
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-3xl bg-white border ${
          isEvaluated && isCorrect
            ? 'border-emerald-500/50 shadow-sm'
            : isEvaluated && !isCorrect
            ? 'border-rose-500/50 shadow-sm'
            : nuanceWarning
            ? 'border-amber-500/50 shadow-sm'
            : 'border-stone-200 shadow-sm'
        } p-6 sm:p-8 min-h-[350px] flex flex-col justify-between text-center transition-all duration-300 relative`}
      >
        {/* Subtle Ambient Micro-Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500/40 via-indigo-500/40 to-emerald-500/40" />

        {/* Header Metadata */}
        <div className="flex items-center justify-between text-[10px] font-mono flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
              Cloze Active Recall
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600">
              {card.facet || 'grammar'}
            </span>
            {isLeechCard(card) && (
              <span
                className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-mono font-bold shadow-2xs"
                title="Leech & Weak Item: lapses >= 2 or easeFactor <= 1.6"
              >
                <Flame className="w-2.5 h-2.5 text-rose-600 fill-rose-500 animate-pulse" />
                <span>Leech Badge (Lapses: {card.lapses} · EF: {getCardEaseFactor(card).toFixed(2)})</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showHint ? 'Hide Hint' : 'Nuance Hint'}</span>
          </button>
        </div>

        {/* Center Prompt: Japanese Sentence with Cloze Blank */}
        <div className="my-auto py-6 space-y-5">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold font-japanese text-stone-900 tracking-tight leading-relaxed">
            {onInspectKanji ? (
              <InteractiveKanjiText
                text={prefix}
                sentenceContext={rawSentence}
                onInspectKanji={onInspectKanji}
              />
            ) : (
              <span>{prefix}</span>
            )}

            {/* Glowing Cloze Slot */}
            <span className="inline-block mx-2 px-3.5 py-1 rounded-xl bg-stone-50 border-2 border-indigo-500 text-indigo-900 font-mono shadow-xs min-w-[130px] ring-2 ring-indigo-500/10 align-middle">
              {isEvaluated ? (
                <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  {targetPattern}
                </span>
              ) : (
                <span>{inputVal || '____'}</span>
              )}
            </span>

            {onInspectKanji ? (
              <InteractiveKanjiText
                text={suffix}
                sentenceContext={rawSentence}
                onInspectKanji={onInspectKanji}
              />
            ) : (
              <span>{suffix}</span>
            )}
          </div>

          {/* Form input for typing cloze text */}
          {!isEvaluated ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto relative pt-2">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={handleInputChange}
                placeholder="文法パターンをひらがなで入力..."
                className="w-full bg-white border border-stone-300 focus:border-indigo-600 rounded-2xl px-4 py-3 text-center text-lg font-japanese text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold shadow-xs"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="absolute right-3 top-5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 cursor-pointer shadow-xs"
                title="Submit Answer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="space-y-3 pt-3">
              {isCorrect ? (
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>အဖြေမှန် (Correct) &bull; 正解</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-semibold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>အဖြေမှန် (Expected): {targetPattern}</span>
                </div>
              )}

              <div className="text-sm sm:text-base font-semibold text-stone-800 font-myanmar">
                {meaningMyanmar || englishTranslation || card.meaning}
              </div>
            </div>
          )}

          {/* Nuance Warning Interceptor Banner */}
          <AnimatePresence>
            {nuanceWarning && (
              <NuanceWarningBanner
                enteredSynonym={nuanceWarning.entered}
                expectedTarget={nuanceWarning.target}
                nuanceMessage={nuanceWarning.warningMessageEn || ''}
                nuanceMessageMy={nuanceWarning.warningMessageMy}
                warningMessageEn={nuanceWarning.warningMessageEn || ''}
                warningMessageMy={nuanceWarning.warningMessageMy}
                conjugationNote={nuanceWarning.conjugationNote}
                onRetry={() => {
                  setInputVal('');
                  setNuanceWarning(null);
                  inputRef.current?.focus();
                }}
              />
            )}
          </AnimatePresence>

          {/* Progressive Hint Drawer */}
          <AnimatePresence>
            {showHint && !isEvaluated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-700 space-y-1.5 max-w-md mx-auto shadow-xs"
              >
                <span className="font-mono text-[10px] uppercase text-indigo-600 font-bold block">
                  Grammar Nuance Clue:
                </span>
                <p className="text-stone-600 italic font-myanmar">&ldquo;{meaningMyanmar || englishTranslation}&rdquo;</p>
                {card.facet && (
                  <p className="text-[11px] text-stone-500 font-mono">Facet: {card.facet}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card Footer Controls */}
        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 pt-3 border-t border-stone-200 flex-wrap gap-2">
          {!isEvaluated ? (
            <>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-myanmar text-stone-600">ဟီရဂနဖြင့် ရိုက်ထည့်ပါ • Enter ခေါက်၍ အတည်ပြုပါ</span>
                <span className="text-stone-400 hidden sm:inline">&bull;</span>
                <span className="font-myanmar text-stone-500 hidden sm:inline">Space Bar နှိပ်၍ Flashcard သို့ ပြောင်းနိုင်သည်</span>
              </div>
              <button
                type="button"
                onClick={handleReveal}
                className="flex items-center space-x-1 text-stone-600 hover:text-rose-600 transition cursor-pointer shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Give Up / Reveal</span>
              </button>
            </>
          ) : (
            <span className="text-stone-600 text-center w-full">
              Rate your recall difficulty below to advance the FSRS schedule
            </span>
          )}
        </div>
      </motion.div>

      {/* Post-evaluation Rating Controls with Paper Card Styling */}
      {isEvaluated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onRate('again')}
              className="py-3 px-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition shadow-xs flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="flex items-center space-x-1">
                <span>Again</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-rose-200 text-rose-700 font-mono font-normal">
                  1
                </span>
              </span>
              <span className="text-[10px] text-rose-600 font-normal mt-1">&lt; 10m</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onRate('hard')}
              className="py-3 px-3 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-semibold text-xs transition shadow-xs flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="flex items-center space-x-1">
                <span>Hard</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-amber-200 text-amber-700 font-mono font-normal">
                  2
                </span>
              </span>
              <span className="text-[10px] text-amber-600 font-normal mt-1">~1.2x</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onRate('good')}
              className="py-3 px-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition shadow-xs flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="flex items-center space-x-1">
                <span>Good</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-emerald-200 text-emerald-700 font-mono font-normal">
                  3
                </span>
              </span>
              <span className="text-[10px] text-emerald-600 font-normal mt-1">~2.5x</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onRate('easy')}
              className="py-3 px-3 rounded-2xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition shadow-xs flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="flex items-center space-x-1">
                <span>Easy</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-indigo-200 text-indigo-700 font-mono font-normal">
                  4
                </span>
              </span>
              <span className="text-[10px] text-indigo-600 font-normal mt-1">&gt; 3.0x</span>
            </motion.button>
          </div>
          <p className="text-[10px] text-center text-stone-500 font-mono">
            Press numeric keys [1], [2], [3], [4] on your keyboard
          </p>
        </motion.div>
      )}
    </div>
  );
};
