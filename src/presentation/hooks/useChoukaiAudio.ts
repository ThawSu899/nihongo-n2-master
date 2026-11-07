import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChoukaiAudioEngine,
  ChoukaiSpeed,
} from '../../domain/audio/choukai-audio-engine';
import { ChoukaiScenario, ChoukaiLine } from '../../domain/assessment/choukai-catalog';

export function useChoukaiAudio(initialScenario?: ChoukaiScenario) {
  const engineRef = useRef<ChoukaiAudioEngine | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [currentLine, setCurrentLine] = useState<ChoukaiLine | null>(
    initialScenario?.dialogue[0] || null
  );
  const [playbackRate, setPlaybackRateState] = useState<ChoukaiSpeed>(1.0);
  const [isShadowingLoop, setIsShadowingLoopState] = useState<boolean>(false);
  const [shadowingTurnDelay, setShadowingTurnDelayState] = useState<number>(2000);
  const [waveformAmplitude, setWaveformAmplitude] = useState<number>(0.05);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Initialize engine once
  if (!engineRef.current) {
    engineRef.current = new ChoukaiAudioEngine();
  }

  // Subscribe to callbacks
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setCallbacks({
      onLineChange: (index, line) => {
        setCurrentLineIndex(index);
        setCurrentLine(line);
      },
      onStateChange: (playing, paused) => {
        setIsPlaying(playing);
        setIsPaused(paused);
      },
      onComplete: () => {
        setIsComplete(true);
      },
      onWaveformTick: (amp) => {
        setWaveformAmplitude(amp);
      },
    });

    if (initialScenario) {
      engine.loadScenario(initialScenario);
      setCurrentLine(initialScenario.dialogue[0] || null);
    }

    return () => {
      engine.stop();
    };
  }, []);

  // Update scenario when prop changes
  const loadScenario = useCallback((scenario: ChoukaiScenario) => {
    if (!engineRef.current) return;
    engineRef.current.loadScenario(scenario);
    setCurrentLineIndex(0);
    setCurrentLine(scenario.dialogue[0] || null);
    setIsComplete(false);
  }, []);

  const play = useCallback((startLineIndex?: number) => {
    if (!engineRef.current) return;
    setIsComplete(false);
    engineRef.current.play(startLineIndex ?? currentLineIndex);
  }, [currentLineIndex]);

  const playSingleLine = useCallback((lineIndex: number) => {
    if (!engineRef.current) return;
    setIsComplete(false);
    engineRef.current.playLine(lineIndex);
  }, []);

  const pause = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resume();
  }, []);

  const stop = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stop();
  }, []);

  const setSpeed = useCallback((speed: ChoukaiSpeed) => {
    if (!engineRef.current) return;
    engineRef.current.setSpeed(speed);
    setPlaybackRateState(speed);
  }, []);

  const toggleShadowingLoop = useCallback(() => {
    if (!engineRef.current) return;
    const nextState = !isShadowingLoop;
    engineRef.current.setShadowingLoop(nextState);
    setIsShadowingLoopState(nextState);
  }, [isShadowingLoop]);

  const setShadowingTurnDelay = useCallback((delayMs: number) => {
    if (!engineRef.current) return;
    engineRef.current.setShadowingTurnDelay(delayMs);
    setShadowingTurnDelayState(delayMs);
  }, []);

  return {
    isPlaying,
    isPaused,
    currentLineIndex,
    currentLine,
    playbackRate,
    isShadowingLoop,
    shadowingTurnDelay,
    waveformAmplitude,
    isComplete,
    play,
    playSingleLine,
    pause,
    resume,
    stop,
    setSpeed,
    toggleShadowingLoop,
    setShadowingTurnDelay,
    loadScenario,
  };
}
