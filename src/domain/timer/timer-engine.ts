import { StudyTimerState } from '../models/types';
import { Clock } from '../common/clock';

export class TimerEngine {
  constructor(private clock: Clock) {}

  createInitialState(targetMinutes = 60, blockId: string | null = null): StudyTimerState {
    return {
      blockId,
      state: 'idle',
      startedAt: null,
      accumulatedMs: 0,
      targetMinutes,
      lastInteractionAt: this.clock.nowMs(),
    };
  }

  start(state: StudyTimerState, blockId?: string, targetMinutes?: number): StudyTimerState {
    const now = this.clock.nowMs();
    return {
      ...state,
      blockId: blockId ?? state.blockId,
      targetMinutes: targetMinutes ?? state.targetMinutes,
      state: 'running',
      startedAt: now,
      lastInteractionAt: now,
    };
  }

  pause(state: StudyTimerState): StudyTimerState {
    if (state.state !== 'running' || !state.startedAt) return state;

    const now = this.clock.nowMs();
    const elapsedSinceStart = Math.max(0, now - state.startedAt);

    return {
      ...state,
      state: 'paused',
      startedAt: null,
      accumulatedMs: state.accumulatedMs + elapsedSinceStart,
      lastInteractionAt: now,
    };
  }

  resume(state: StudyTimerState): StudyTimerState {
    if (state.state !== 'paused' && state.state !== 'idle') return state;

    const now = this.clock.nowMs();
    return {
      ...state,
      state: 'running',
      startedAt: now,
      lastInteractionAt: now,
    };
  }

  finish(state: StudyTimerState): { updatedState: StudyTimerState; totalElapsedSeconds: number } {
    let totalMs = state.accumulatedMs;
    if (state.state === 'running' && state.startedAt) {
      totalMs += Math.max(0, this.clock.nowMs() - state.startedAt);
    }

    const updatedState: StudyTimerState = {
      ...state,
      state: 'completed',
      startedAt: null,
      accumulatedMs: totalMs,
      lastInteractionAt: this.clock.nowMs(),
    };

    return {
      updatedState,
      totalElapsedSeconds: Math.round(totalMs / 1000),
    };
  }

  recordInteraction(state: StudyTimerState): StudyTimerState {
    return {
      ...state,
      lastInteractionAt: this.clock.nowMs(),
    };
  }

  checkIdleTimeout(state: StudyTimerState, maxIdleMinutes = 2): { isIdle: boolean; newState: StudyTimerState } {
    if (state.state !== 'running') {
      return { isIdle: false, newState: state };
    }

    const idleMs = this.clock.nowMs() - state.lastInteractionAt;
    if (idleMs >= maxIdleMinutes * 60 * 1000) {
      // Auto-pause due to idle
      const paused = this.pause(state);
      return { isIdle: true, newState: paused };
    }

    return { isIdle: false, newState: state };
  }

  getElapsedSeconds(state: StudyTimerState): number {
    let ms = state.accumulatedMs;
    if (state.state === 'running' && state.startedAt) {
      ms += Math.max(0, this.clock.nowMs() - state.startedAt);
    }
    return Math.floor(ms / 1000);
  }

  getRemainingSeconds(state: StudyTimerState): number {
    const targetMs = state.targetMinutes * 60 * 1000;
    const elapsedMs = state.accumulatedMs + (state.state === 'running' && state.startedAt ? Math.max(0, this.clock.nowMs() - state.startedAt) : 0);
    return Math.max(0, Math.floor((targetMs - elapsedMs) / 1000));
  }
}
