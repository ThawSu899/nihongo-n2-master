import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ArrowRight, Mic, Repeat, Play, Pause, Clock, Sparkles, Activity, AlertTriangle } from 'lucide-react';
import { LessonPack } from '../../domain/models/types';
import { parseDialogueTranscript, DialogueTurn } from '../hooks/useAudioPlayer';
import { useGlobalShortcuts, useScopedShortcuts } from '../context/GlobalShortcutContext';
import { PitchAccentVisualizer } from './PitchAccentVisualizer';
import { inferPitchAccent } from '../../domain/audio/pitch-accent';
import {
  checkJapaneseVoiceSupport,
  getMoraTimingEstimate,
  JapaneseVoiceDiagnostics,
  JAPANESE_TTS_MISSING_WARNING_MY,
} from '../../services/audio-resiliency';

export interface ShadowingPracticeScreenProps {
  pack: LessonPack;
  isPlaying: boolean;
  currentPlayingText: string | null;
  play: (text: string, audioRef?: any, speaker?: string) => void;
  stop: () => void;
  isShadowingLoop?: boolean;
  shadowingTurnDelay?: number;
  setShadowingTurnDelay?: (delayMs: number) => void;
  activeTurnIndex?: number;
  startShadowingLoop?: (turns: DialogueTurn[] | string, delayMs?: number, startIdx?: number) => void;
  stopShadowingLoop?: () => void;
  playbackRate?: number;
  setPlaybackRate?: (rate: number) => void;
  onProceed: () => void;
  className?: string;
}

export const ShadowingPracticeScreen: React.FC<ShadowingPracticeScreenProps> = ({
  pack,
  isPlaying,
  currentPlayingText,
  play,
  stop,
  isShadowingLoop = false,
  shadowingTurnDelay = 2000,
  setShadowingTurnDelay,
  activeTurnIndex = -1,
  startShadowingLoop,
  stopShadowingLoop,
  playbackRate = 1.0,
  setPlaybackRate,
  onProceed,
  className = '',
}) => {
  // Local fallback state if not supplied from parent
  const [localTurnDelay, setLocalTurnDelay] = useState<number>(shadowingTurnDelay);
  const currentDelay = shadowingTurnDelay ?? localTurnDelay;

  // Visual Pitch Contour toggle & Audio Resiliency diagnostics
  const [showPitchContour, setShowPitchContour] = useState<boolean>(true);
  const [ttsDiagnostics, setTtsDiagnostics] = useState<JapaneseVoiceDiagnostics | null>(null);

  useEffect(() => {
    checkJapaneseVoiceSupport().then(setTtsDiagnostics);
  }, []);

  // Extract turns or parse fallback from transcript
  const turns: (DialogueTurn & { ja?: string; kana?: string; en?: string; my?: string; myanmar?: string; translationMy?: string; english?: string; audio?: any })[] =
    pack.listening.turns && pack.listening.turns.length > 0
      ? pack.listening.turns.map((t) => ({
          ...t,
          speaker: t.speaker || 'Narrator',
          text: (t as any).text || t.ja || '',
        }))
      : parseDialogueTranscript(pack.listening.transcript).map((t) => ({
          ...t,
          speaker: t.speaker || 'Narrator',
          text: t.text,
          ja: t.text,
          kana: t.text,
          en: 'Spoken dialogue line',
          my: 'နားထောင်လေ့ကျင့်ခန်း စကားပြော',
          myanmar: 'နားထောင်လေ့ကျင့်ခန်း စကားပြော',
          audio: pack.listening.audio,
        }));

  const handleToggleLoop = () => {
    if (isShadowingLoop) {
      if (stopShadowingLoop) {
        stopShadowingLoop();
      } else {
        stop();
      }
    } else {
      if (startShadowingLoop) {
        startShadowingLoop(turns, currentDelay, 0);
      }
    }
  };

  const handleSelectDelay = (delayMs: number) => {
    setLocalTurnDelay(delayMs);
    setShadowingTurnDelay?.(delayMs);
    if (isShadowingLoop && startShadowingLoop) {
      // Re-trigger loop with new delay
      const resumeIndex = activeTurnIndex >= 0 ? activeTurnIndex : 0;
      startShadowingLoop(turns, delayMs, resumeIndex);
    }
  };

  const handlePlaySingleTurn = (turn: any, index: number) => {
    if (isShadowingLoop) {
      // If loop was running, restart loop from this specific turn
      startShadowingLoop?.(turns, currentDelay, index);
    } else {
      const isCurrentTurnPlaying = isPlaying && currentPlayingText === (turn.ja || turn.text);
      if (isCurrentTurnPlaying) {
        stop();
      } else {
        play(turn.ja || turn.text, turn.audio, turn.speaker);
      }
    }
  };

  const { getDisplayBadge } = useGlobalShortcuts();

  const handleCycleSpeed = () => {
    if (!setPlaybackRate) return;
    const rates = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  const handleCycleDelay = () => {
    const delays = [1000, 2000, 3000];
    const nextIdx = (delays.indexOf(currentDelay) + 1) % delays.length;
    handleSelectDelay(delays[nextIdx]);
  };

  useScopedShortcuts({
    scopeId: 'shadowing_practice',
    handlers: {
      TOGGLE_LOOP: () => {
        handleToggleLoop();
      },
      PLAY_AUDIO: () => {
        if (turns.length > 0) {
          const idx = activeTurnIndex >= 0 ? activeTurnIndex : 0;
          handlePlaySingleTurn(turns[idx], idx);
        }
      },
      NEXT_TURN: () => {
        if (turns.length === 0) return;
        const nextIdx = activeTurnIndex < turns.length - 1 ? activeTurnIndex + 1 : 0;
        handlePlaySingleTurn(turns[nextIdx], nextIdx);
      },
      PREV_TURN: () => {
        if (turns.length === 0) return;
        const prevIdx = activeTurnIndex > 0 ? activeTurnIndex - 1 : turns.length - 1;
        handlePlaySingleTurn(turns[prevIdx], prevIdx);
      },
      SPEED_CYCLE: () => {
        handleCycleSpeed();
      },
      DELAY_CYCLE: () => {
        handleCycleDelay();
      },
      NEXT_ITEM: () => {
        onProceed();
      },
    },
    priority: 20,
  });

  return (
    <div
      className={`bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="space-y-1.5">
        <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-semibold px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-900/60 inline-flex items-center gap-1.5">
          <Mic className="w-3 h-3 text-rose-400" />
          <span>အဆင့် ၁၀ • လိုက်ဆိုလေ့ကျင့်ခြင်း (Shadowing)</span>
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-100 font-myanmar">
          နားထောင်ပါ၊ လိုက်ဆိုပါ၊ ကိုယ်တိုင်အကဲဖြတ်ပါ
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 font-myanmar leading-relaxed">
          ဂျပန်အသံထွက်ကို နားထောင်ပြီး ချက်ချင်းလိုက်ဆိုပါ။ (မှတ်ချက် - မိမိကိုယ်တိုင် အကဲဖြတ်ရမည့် လေ့ကျင့်ခန်းသာ ဖြစ်ပါသည်)
        </p>
      </div>

      {/* Continuous Shadowing Loop Studio Control Bar */}
      <div className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Continuous Loop Toggle */}
          <button
            type="button"
            onClick={handleToggleLoop}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold font-myanmar flex items-center justify-center space-x-2 transition cursor-pointer ${
              isShadowingLoop
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] font-bold'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            }`}
          >
            <Repeat className={`w-4 h-4 ${isShadowingLoop ? 'animate-spin' : ''}`} />
            <span>
              {isShadowingLoop
                ? 'Shadowing Loop ရပ်တန့်မည် (Pause)'
                : 'Continuous Shadowing Loop စတင်မည် (Start)'}
            </span>
          </button>

          {/* Speed Pills (0.75x, 1.0x, 1.25x, 1.5x) */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Pitch Contour Toggle (အသံအတက်အကျမျဉ်း) */}
            <button
              type="button"
              onClick={() => setShowPitchContour((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                showPitchContour
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
              title="Pitch Accent Contour Toggle"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{`Pitch Contour: ${showPitchContour ? 'ON' : 'OFF'}`}</span>
            </button>

            {setPlaybackRate && (
              <div className="flex items-center space-x-1.5 bg-stone-900 px-2 py-1 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400 font-myanmar mr-1">အမြန်နှုန်း:</span>
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-stone-850 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configurable Speaker Turn Delay Pills (1.0s, 1.5s, 2.0s, 2.5s, 3.0s) */}
        <div className="pt-2 border-t border-stone-850 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-stone-400 font-myanmar">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>လိုက်ဆိုရန် ကြားကာလ (Turn Delay):</span>
          </div>
          <div className="flex items-center space-x-1 font-mono">
            {[1000, 1500, 2000, 2500, 3000].map((delayMs) => (
              <button
                key={delayMs}
                type="button"
                onClick={() => handleSelectDelay(delayMs)}
                className={`px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer ${
                  currentDelay === delayMs
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {delayMs / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Live Loop Status Feedback */}
        {isShadowingLoop && (
          <div className="pt-1 text-[11px] text-amber-300 font-myanmar flex items-center space-x-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {activeTurnIndex >= 0
                ? `စကားပြောသူ ${turns[activeTurnIndex]?.speaker || 'Turn'} • သင့်အလှည့် လိုက်ဆိုပါ (${currentDelay / 1000}s ကြားကာလ)`
                : 'Shadowing Loop လည်ပတ်နေပါသည်...'}
            </span>
          </div>
        )}
      </div>

      {/* Soft Audio Resiliency Fallback Banner when Japanese TTS is unavailable */}
      {ttsDiagnostics && !ttsDiagnostics.hasJaVoice && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-200 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-myanmar font-semibold leading-relaxed">
              {JAPANESE_TTS_MISSING_WARNING_MY}
            </p>
            <p className="text-[11px] text-amber-400/80 font-mono">
              Visual Phonetics Mode Active • Pitch contours and mora timing available for visual shadowing.
            </p>
          </div>
        </div>
      )}

      {/* Dialogue Turns */}
      <div className="space-y-3">
        {turns.map((turn: any, i) => {
          const isTurnSpeaking = isPlaying && currentPlayingText === (turn.ja || turn.text);
          const isTurnInLoopActive = isShadowingLoop && activeTurnIndex === i;
          const isHighlighted = isTurnSpeaking || isTurnInLoopActive;

          const spkLower = (turn.speaker || '').toLowerCase();
          const isKen = (turn.speaker || '').includes('ケン') || spkLower.includes('ken');
          const isSensei =
            (turn.speaker || '').includes('先生') ||
            (turn.speaker || '').includes('受付') ||
            spkLower.includes('tanaka') ||
            spkLower.includes('sensei');

          // Prioritize Burmese translation over English
          const burmeseText =
            turn.myanmar ||
            turn.translationMy ||
            turn.my;
          const displayTranslation = burmeseText || turn.english || turn.en;

          return (
            <div
              key={i}
              className={`bg-stone-950 border ${
                isHighlighted
                  ? 'border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/40'
                  : 'border-stone-800 hover:border-stone-700/80'
              } rounded-2xl p-4 sm:p-5 space-y-2 shadow-inner transition-colors duration-200`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                      isSensei
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        : isKen
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-900/60'
                    }`}
                  >
                    {turn.speaker}
                  </span>
                  <span className="text-[10px] text-stone-500 font-myanmar">
                    {isSensei ? 'အသံနိမ့်' : isKen ? 'အသံမြင့်' : 'မူရင်းအသံ'}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePlaySingleTurn(turn, i)}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm ${
                    isHighlighted
                      ? 'bg-amber-500 text-stone-950 font-bold animate-pulse'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="font-myanmar">
                    {isHighlighted ? 'ဖွင့်နေသည်...' : 'ဖွင့်မည်'}
                  </span>
                </motion.button>
              </div>

              {/* Japanese dialogue line */}
              <div className="text-sm sm:text-base font-japanese font-medium text-stone-100 leading-relaxed">
                {turn.ja || turn.text}
              </div>

              {/* Pitch Accent Contour & Mora Line Graph */}
              {showPitchContour && (
                <div className="pt-1.5 pb-1">
                  <PitchAccentVisualizer
                    text={turn.kana || turn.ja || turn.text}
                    pattern={turn.pitchAccent || inferPitchAccent(turn.ja || turn.text)}
                    dropMora={turn.dropMora}
                    showBadge={true}
                    showContour={true}
                    compact={false}
                  />
                </div>
              )}

              {/* Translation: Burmese prioritized, fallback to English */}
              <div className="text-xs sm:text-sm text-stone-300 font-myanmar leading-relaxed">
                {displayTranslation}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onProceed}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-rose-950/40 cursor-pointer"
      >
        <span className="font-myanmar font-bold">မေးခွန်းများ ဖြေဆိုရန် ဆက်သွားမည်</span>
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
};
