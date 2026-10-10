import { useState, useEffect, useCallback, useRef } from 'react';
import { StudyTimerState } from '../../domain/models/types';
import { TimerEngine } from '../../domain/timer/timer-engine';
import { SystemClock } from '../../domain/common/clock';
import { db } from '../../data/db/dexie-db';
import { EventRepository } from '../../data/repositories/event-repository';

const clock = new SystemClock();
const timerEngine = new TimerEngine(clock);
const TIMER_STORAGE_KEY = 'nihongo_n2_active_timer';

export function useTimer(onBlockCompleted?: (blockId: string, durationSec: number) => void) {
  const [timerState, setTimerState] = useState<StudyTimerState>(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return timerEngine.createInitialState(60, null);
  });

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(60 * 60);
  const [isIdlePaused, setIsIdlePaused] = useState(false);
  const onBlockCompletedRef = useRef(onBlockCompleted);
  onBlockCompletedRef.current = onBlockCompleted;

  // Persist state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    } catch {
      // Ignore
    }
  }, [timerState]);

  // Main 1-second interval to update display & check idle
  useEffect(() => {
    const updateDisplay = () => {
      setElapsedSec(timerEngine.getElapsedSeconds(timerState));
      setRemainingSec(timerEngine.getRemainingSeconds(timerState));

      // Idle check
      if (timerState.state === 'running') {
        const { isIdle, newState } = timerEngine.checkIdleTimeout(timerState, 2);
        if (isIdle) {
          setIsIdlePaused(true);
          setTimerState(newState);
        }
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  // User activity tracker
  const recordUserActivity = useCallback(() => {
    setTimerState((prev) => timerEngine.recordInteraction(prev));
    if (isIdlePaused) {
      setIsIdlePaused(false);
    }
  }, [isIdlePaused]);

  useEffect(() => {
    const handler = () => recordUserActivity();
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [recordUserActivity]);

  const startBlock = useCallback((blockId: string, targetMinutes = 60) => {
    setIsIdlePaused(false);
    setTimerState((prev) => timerEngine.start(prev, blockId, targetMinutes));
    EventRepository.record('block_completed', { action: 'started', blockId, targetMinutes });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => timerEngine.pause(prev));
  }, []);

  const resumeTimer = useCallback(() => {
    setIsIdlePaused(false);
    setTimerState((prev) => timerEngine.resume(prev));
  }, []);

  const finishBlock = useCallback(async () => {
    const { updatedState, totalElapsedSeconds } = timerEngine.finish(timerState);
    setTimerState(updatedState);

    if (timerState.blockId) {
      await db.study_sessions.add({
        id: `sess_${Date.now()}`,
        blockId: timerState.blockId,
        startedAt: new Date(Date.now() - totalElapsedSeconds * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: totalElapsedSeconds,
        exercisesCompleted: 0,
      });

      await EventRepository.record('block_completed', {
        blockId: timerState.blockId,
        durationSeconds: totalElapsedSeconds,
      });

      if (onBlockCompletedRef.current) {
        onBlockCompletedRef.current(timerState.blockId, totalElapsedSeconds);
      }
    }
  }, [timerState]);

  const skipBlock = useCallback(() => {
    setTimerState(timerEngine.createInitialState(60, null));
  }, []);

  return {
    timerState,
    elapsedSec,
    remainingSec,
    isIdlePaused,
    startBlock,
    pauseTimer,
    resumeTimer,
    finishBlock,
    skipBlock,
    recordUserActivity,
  };
}
