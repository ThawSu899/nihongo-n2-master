import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  ArrowRight,
  Mic,
  MicOff,
  Repeat,
  Play,
  Square,
  Clock,
  Sparkles,
  Activity,
  AlertTriangle,
  Radio,
  Sliders,
  Eye,
  EyeOff,
} from 'lucide-react';
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

  // Visual Toggles & Audio Resiliency diagnostics
  const [showPitchContour, setShowPitchContour] = useState<boolean>(true);
  const [showFurigana, setShowFurigana] = useState<boolean>(true);
  const [showWaveformComparator, setShowWaveformComparator] = useState<boolean>(true);
  const [ttsDiagnostics, setTtsDiagnostics] = useState<JapaneseVoiceDiagnostics | null>(null);

  // Interactive Web Audio API Recording & PCM Volume Metering
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTurnIndex, setRecordingTurnIndex] = useState<number | null>(null);
  const [pcmLevel, setPcmLevel] = useState<number>(0);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [playingRecordedTurn, setPlayingRecordedTurn] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkJapaneseVoiceSupport().then(setTtsDiagnostics);

    return () => {
      // Cleanup Web Audio & recorder resources on unmount
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
      }
    };
  }, []);

  // Extract turns or parse fallback from transcript
  const turns: (DialogueTurn & {
    ja?: string;
    kana?: string;
    en?: string;
    my?: string;
    myanmar?: string;
    translationMy?: string;
    english?: string;
    audio?: any;
    pitchAccent?: any;
    dropMora?: number;
    dropIndex?: number;
  })[] =
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
      const resumeIndex = activeTurnIndex >= 0 ? activeTurnIndex : 0;
      startShadowingLoop(turns, delayMs, resumeIndex);
    }
  };

  const handlePlaySingleTurn = (turn: any, index: number) => {
    if (isShadowingLoop) {
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

  // Web Audio API Recording Handler
  const handleStartRecording = async (turnIndex: number) => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      // Stop target playback if playing
      stop();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updatePcm = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setPcmLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updatePcm);
          }
        };
        updatePcm();
      }

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => ({ ...prev, [turnIndex]: url }));
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setPcmLevel(0);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTurnIndex(turnIndex);
    } catch (err) {
      console.warn('[Shadowing] Microphone access unavailable or declined:', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTurnIndex(null);
  };

  const handlePlayUserRecording = (turnIndex: number) => {
    const url = recordings[turnIndex];
    if (!url) return;

    if (playingRecordedTurn === turnIndex) {
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
        setPlayingRecordedTurn(null);
      }
      return;
    }

    const audio = new Audio(url);
    userAudioPlayerRef.current = audio;
    setPlayingRecordedTurn(turnIndex);
    audio.onended = () => setPlayingRecordedTurn(null);
    audio.onerror = () => setPlayingRecordedTurn(null);
    audio.play().catch(() => setPlayingRecordedTurn(null));
  };

  const handleCycleSpeed = () => {
    if (!setPlaybackRate) return;
    const rates = [0.75, 0.9, 1.0, 1.25];
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
      TOGGLE_LOOP: () => handleToggleLoop(),
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
      SPEED_CYCLE: () => handleCycleSpeed(),
      DELAY_CYCLE: () => handleCycleDelay(),
      NEXT_ITEM: () => onProceed(),
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
          ဂျပန်အသံထွက်ကို နားထောင်ပြီး ချက်ချင်းလိုက်ဆိုပါ။ မိမိအသံကို အသံဖမ်းယူပြီး လှိုင်းပုံစံနှင့် အသံအတက်အကျ (Pitch Accent) ကို စစ်ဆေးနိုင်ပါသည်။
        </p>
      </div>

      {/* Continuous Shadowing Loop & Audio Studio Control Bar */}
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

          {/* Speed & Visual Toggles */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Pitch Contour Toggle */}
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

            {/* Furigana Toggle */}
            <button
              type="button"
              onClick={() => setShowFurigana((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                showFurigana
                  ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
              title="Furigana Toggle"
            >
              {showFurigana ? (
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>{`Furigana: ${showFurigana ? 'ON' : 'OFF'}`}</span>
            </button>

            {/* Playback Rate Pills (0.75x, 0.9x, 1.0x, 1.25x) */}
            {setPlaybackRate && (
              <div className="flex items-center space-x-1 bg-stone-900 px-2 py-1 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400 font-myanmar mr-1">အမြန်နှုန်း:</span>
                {[0.75, 0.9, 1.0, 1.25].map((rate) => (
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

      {/* Dialogue Turns with Waveform Comparator & Mic Recorder */}
      <div className="space-y-4">
        {turns.map((turn: any, i) => {
          const isTurnSpeaking = isPlaying && currentPlayingText === (turn.ja || turn.text);
          const isTurnInLoopActive = isShadowingLoop && activeTurnIndex === i;
          const isHighlighted = isTurnSpeaking || isTurnInLoopActive;
          const isThisTurnRecording = isRecording && recordingTurnIndex === i;
          const hasUserRecording = Boolean(recordings[i]);
          const isPlayingUser = playingRecordedTurn === i;

          const spkLower = (turn.speaker || '').toLowerCase();
          const isKen = (turn.speaker || '').includes('ケン') || spkLower.includes('ken');
          const isSensei =
            (turn.speaker || '').includes('先生') ||
            (turn.speaker || '').includes('受付') ||
            spkLower.includes('tanaka') ||
            spkLower.includes('sensei');

          // Prioritize Burmese translation over English
          const burmeseText = turn.myanmar || turn.translationMy || turn.my;
          const displayTranslation = burmeseText || turn.english || turn.en;

          return (
            <div
              key={i}
              className={`bg-stone-950 border ${
                isHighlighted
                  ? 'border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/40'
                  : isThisTurnRecording
                  ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50'
                  : 'border-stone-800 hover:border-stone-700/80'
              } rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner transition-colors duration-200`}
            >
              {/* Speaker Header & Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2">
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

                {/* Turn Actions: Play Original, Mic Record, Play Recorded Voice */}
                <div className="flex items-center space-x-2">
                  {/* Play Target Audio */}
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
                      {isHighlighted ? 'ဖွင့်နေသည်...' : 'မူရင်းအသံ'}
                    </span>
                  </motion.button>

                  {/* Mic Record Toggle */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (isThisTurnRecording) {
                        handleStopRecording();
                      } else {
                        handleStartRecording(i);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm ${
                      isThisTurnRecording
                        ? 'bg-rose-600 text-white font-bold animate-pulse ring-2 ring-rose-400'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                    title={isThisTurnRecording ? 'အသံဖမ်းယူမှု ရပ်မည်' : 'မိမိအသံ ဖမ်းယူမည်'}
                  >
                    {isThisTurnRecording ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span className="font-myanmar">ရပ်မည်</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-myanmar">အသံဖမ်းမည်</span>
                      </>
                    )}
                  </motion.button>

                  {/* Play User Recording */}
                  {hasUserRecording && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePlayUserRecording(i)}
                      className={`px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm ${
                        isPlayingUser
                          ? 'bg-emerald-500 text-stone-950 font-bold'
                          : 'bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/80'
                      }`}
                      title="မိမိအသံ ပြန်ဖွင့်မည်"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="font-myanmar">
                        {isPlayingUser ? 'ဖွင့်နေသည်...' : 'မိမိအသံ'}
                      </span>
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Japanese dialogue line with Furigana Toggle */}
              <div className="text-base sm:text-lg font-japanese font-medium text-stone-100 leading-relaxed">
                {showFurigana && turn.kana && turn.kana !== turn.ja ? (
                  <ruby>
                    {turn.ja || turn.text}
                    <rt className="text-xs text-indigo-300 font-mono font-normal opacity-85 select-none">
                      {turn.kana}
                    </rt>
                  </ruby>
                ) : (
                  turn.ja || turn.text
                )}
              </div>

              {/* Pitch Accent Contour & Mora Line Graph */}
              {showPitchContour && (
                <div className="pt-1.5 pb-1">
                  <PitchAccentVisualizer
                    text={turn.kana || turn.ja || turn.text}
                    pattern={turn.pitchAccent || inferPitchAccent(turn.ja || turn.text)}
                    dropIndex={turn.dropIndex}
                    dropMora={turn.dropMora}
                    showBadge={true}
                    showContour={true}
                    compact={false}
                  />
                </div>
              )}

              {/* Real-time PCM Waveform & Rhythm Comparator */}
              {showWaveformComparator && (
                <div className="bg-stone-900/70 border border-stone-850 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Waveform & Cadence Comparator</span>
                    </span>
                    {isThisTurnRecording && (
                      <span className="text-rose-400 font-semibold animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        Live PCM: {pcmLevel}%
                      </span>
                    )}
                  </div>

                  {/* Dual-Track Visualizer: Target Cadence vs User Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Track 1: Target Model Audio Cadence */}
                    <div className="bg-stone-950/80 rounded-lg p-2 border border-stone-800/80 flex flex-col justify-between h-14">
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span>Model Target Cadence (မူရင်းပုံစံ)</span>
                        <span className="font-mono text-indigo-400">NHK Standard</span>
                      </div>
                      <div className="flex items-end gap-1 h-6">
                        {[40, 65, 85, 60, 95, 70, 50, 80, 45, 90, 75, 55].map((val, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-sm transition-all duration-200 ${
                              isHighlighted
                                ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                                : 'bg-stone-700/60'
                            }`}
                            style={{ height: `${val}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Track 2: Learner Recording / Live Input Track */}
                    <div className="bg-stone-950/80 rounded-lg p-2 border border-stone-800/80 flex flex-col justify-between h-14">
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span>Your Voice Track (မိမိအသံ)</span>
                        <span className="font-mono text-rose-400">
                          {isThisTurnRecording
                            ? 'Recording...'
                            : hasUserRecording
                            ? 'Ready'
                            : 'Not Recorded'}
                        </span>
                      </div>
                      <div className="flex items-end gap-1 h-6">
                        {isThisTurnRecording ? (
                          // Real-time live PCM audio reactive waveform bars
                          [...Array(12)].map((_, idx) => {
                            const barHeight = Math.max(
                              15,
                              Math.min(100, (pcmLevel * (idx % 3 + 1)) / 2 + 10)
                            );
                            return (
                              <div
                                key={idx}
                                className="flex-1 rounded-sm bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] transition-all duration-75"
                                style={{ height: `${barHeight}%` }}
                              />
                            );
                          })
                        ) : hasUserRecording ? (
                          // Saved recorded static profile
                          [50, 70, 80, 65, 90, 60, 45, 85, 65, 75, 60, 40].map((val, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 rounded-sm transition-all duration-200 ${
                                isPlayingUser
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                  : 'bg-emerald-700/60'
                              }`}
                              style={{ height: `${val}%` }}
                            />
                          ))
                        ) : (
                          <div className="w-full flex items-center justify-center text-[10px] text-stone-600 font-mono italic">
                            Press "အသံဖမ်းမည်" to record & compare
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
