import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Edit3,
  Eye,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { KanjiCardItem } from '../../domain/curriculum/kanji-extractor';
import { speakVocabulary } from '../../domain/audio/tts-engine';

export interface KanjiDetailModalProps {
  kanji: KanjiCardItem | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const KanjiDetailModal: React.FC<KanjiDetailModalProps> = ({
  kanji,
  isOpen = true,
  onClose,
}) => {
  const [activeStrokeStep, setActiveStrokeStep] = useState<number>(1);
  const [isPlayingStrokes, setIsPlayingStrokes] = useState<boolean>(false);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [activeAudioReading, setActiveAudioReading] = useState<string | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Reset states on kanji change
  useEffect(() => {
    setActiveStrokeStep(1);
    setIsPlayingStrokes(false);
    setIsDrawingMode(false);
    setActiveAudioReading(null);
  }, [kanji]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Stroke Auto-play timer
  useEffect(() => {
    if (!isPlayingStrokes || !kanji || kanji.strokeCount <= 1) return;

    const timer = setInterval(() => {
      setActiveStrokeStep((prev) => {
        if (prev >= kanji.strokeCount) {
          return 1;
        }
        return prev + 1;
      });
    }, 650);

    return () => clearInterval(timer);
  }, [isPlayingStrokes, kanji]);

  // TTS speak handler
  const handleSpeak = useCallback((text: string, reading?: string) => {
    if (typeof window === 'undefined') return;

    setActiveAudioReading(text);
    try {
      speakVocabulary(
        {
          word: text,
          reading: reading || text.replace(/・/g, ''),
        },
        {
          rate: 0.85,
          onEnd: () => setActiveAudioReading(null),
          onError: () => setActiveAudioReading(null),
        }
      );
    } catch {
      setActiveAudioReading(null);
    }
  }, []);

  // Canvas clear helper
  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#f43f5e'; // Rose accent
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  if (!kanji || !isOpen) {
    return null;
  }

  const primaryReading =
    kanji.kunyomi[0]?.replace(/・/g, '') || kanji.onyomi[0] || kanji.literal;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/40 backdrop-blur-sm">
        {/* Backdrop click to close */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Kanji detail for ${kanji.literal}`}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl bg-white border border-stone-200 rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {`JLPT ${kanji.jlptLevel}`}
              </span>
              <span className="text-xs font-mono text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full">
                {`総画数: ${kanji.strokeCount} 画`}
              </span>
              {kanji.radicals && kanji.radicals.length > 0 && (
                <span className="text-xs font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  {`部首: ${kanji.radicals.join(', ')}`}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              title="Close (Esc)"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Central Showcase Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            {/* Left: Traditional Calligraphy Box & Drawing Canvas */}
            <div className="flex flex-col items-center">
              <div className="relative w-44 h-44 rounded-2xl bg-stone-50 border-2 border-stone-200 shadow-inner flex items-center justify-center overflow-hidden">
                {/* 4-Quadrant Calligraphy Crosslines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none select-none text-stone-300"
                  viewBox="0 0 100 100"
                >
                  <line
                    x1="50"
                    y1="0"
                    x2="50"
                    y2="100"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="100"
                    y2="50"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>

                {/* Character Glyph */}
                {!isDrawingMode && (
                  <motion.span
                    key={`${kanji.literal}-${activeStrokeStep}`}
                    initial={{ opacity: 0.8, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-7xl font-japanese font-bold text-stone-900 drop-shadow-sm select-none"
                  >
                    {kanji.literal}
                  </motion.span>
                )}

                {/* Interactive Drawing Canvas */}
                {isDrawingMode && (
                  <>
                    <span className="text-7xl font-japanese font-bold text-stone-300 select-none pointer-events-none absolute">
                      {kanji.literal}
                    </span>
                    <canvas
                      ref={canvasRef}
                      width={176}
                      height={176}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    />
                  </>
                )}
              </div>

              {/* Mode Switch & Canvas Clear */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsDrawingMode((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-burmese font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    isDrawingMode
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {isDrawingMode ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>ပုံမှန်ကြည့်ရန်</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>လက်ရေးလေ့ကျင့်ရန်</span>
                    </>
                  )}
                </button>

                {isDrawingMode && (
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="p-1.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                    title="Clear Canvas"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Character Meaning & TTS Audio */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2 font-japanese">
                    <span>{kanji.literal}</span>
                    <span className="text-sm font-normal text-stone-500 font-mono">
                      {`(${kanji.strokeCount}画)`}
                    </span>
                  </h3>
                  <div className="font-burmese text-emerald-700 text-lg font-bold leading-snug mt-1">
                    {kanji.meaningBurmese}
                  </div>
                  <div className="text-stone-600 text-xs sm:text-sm mt-0.5">
                    {kanji.meaningEn}
                  </div>
                </div>

                {/* Primary Audio Pronunciation Trigger */}
                <button
                  type="button"
                  onClick={() => handleSpeak(kanji.literal, primaryReading)}
                  className={`p-3 rounded-2xl border transition active:scale-95 cursor-pointer shadow-xs ${
                    activeAudioReading === kanji.literal
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                  }`}
                  title="Pronounce Japanese Character"
                  aria-label={`Pronounce ${kanji.literal}`}
                >
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                </button>
              </div>

              {/* Stroke Order Stepper & Auto-Play */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600 flex items-center gap-1.5 font-mono text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{`Stroke Step: ${activeStrokeStep} / ${kanji.strokeCount}`}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlayingStrokes((prev) => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-[11px] font-mono text-stone-700 hover:bg-stone-100 cursor-pointer"
                  >
                    {isPlayingStrokes ? (
                      <>
                        <Pause className="w-3 h-3 text-amber-600" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-emerald-600" />
                        <span>Auto Play</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Stroke Step Indicator Pills */}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {Array.from({ length: kanji.strokeCount }, (_, i) => i + 1).map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        setActiveStrokeStep(step);
                        setIsPlayingStrokes(false);
                      }}
                      className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition cursor-pointer ${
                        activeStrokeStep === step
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Readings Section (Onyomi & Kunyomi) */}
          <div className="space-y-3 pt-1 border-t border-stone-200">
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Readings (読み方)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Onyomi (音読み - Katakana) */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="text-[11px] font-mono text-indigo-700 uppercase font-semibold block">
                  音読み (Onyomi)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {kanji.onyomi && kanji.onyomi.length > 0 ? (
                    kanji.onyomi.map((on) => (
                      <button
                        key={on}
                        type="button"
                        onClick={() => handleSpeak(on)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-japanese text-xs flex items-center gap-1.5 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        <span>{on}</span>
                        <Volume2 className="w-3 h-3 opacity-70" />
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 font-mono">—</span>
                  )}
                </div>
              </div>

              {/* Kunyomi (訓読み - Hiragana) */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <span className="text-[11px] font-mono text-teal-800 uppercase font-semibold block">
                  訓読み (Kunyomi)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {kanji.kunyomi && kanji.kunyomi.length > 0 ? (
                    kanji.kunyomi.map((kun) => (
                      <button
                        key={kun}
                        type="button"
                        onClick={() => handleSpeak(kun.replace(/・/g, ''))}
                        className="px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-japanese text-xs flex items-center gap-1.5 hover:bg-teal-100 transition cursor-pointer"
                      >
                        <span>{kun}</span>
                        <Volume2 className="w-3 h-3 opacity-70" />
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 font-mono">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compound Vocabulary Examples */}
          {kanji.examples && kanji.examples.length > 0 && (
            <div className="space-y-3 pt-1 border-t border-stone-200">
              <h4 className="text-xs font-mono uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compound Vocabulary Examples (熟語)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {kanji.examples.map((ex, idx) => (
                  <div
                    key={`${ex.word}-${idx}`}
                    className="p-3 rounded-2xl bg-stone-50 border border-stone-200 hover:border-stone-300 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-japanese font-bold text-stone-900 text-sm">
                          {ex.word}
                        </span>
                        <span className="text-xs text-stone-500 font-mono font-normal">
                          {`[${ex.reading}]`}
                        </span>
                      </div>
                      <div className="text-[11px] font-burmese text-emerald-700 line-clamp-1">
                        {ex.meaningBurmese}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeak(ex.word, ex.reading)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition cursor-pointer shrink-0"
                      title="Pronounce word"
                      aria-label={`Pronounce ${ex.word}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
