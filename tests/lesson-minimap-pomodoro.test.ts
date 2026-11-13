import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  PomodoroFocusEngine,
  PomodoroSession,
} from '../src/domain/timer/pomodoro-focus-engine';
import {
  StageMinimap,
  STAGE_MINIMAP_DEFINITIONS,
} from '../src/presentation/components/StageMinimap';
import { TimerWidget } from '../src/presentation/components/TimerWidget';
import { StudyTimerState } from '../src/domain/models/types';

describe('ADVANCED FEATURE 8/10: 15-Stage Minimap & Focus Mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('PomodoroFocusEngine', () => {
    it('initializes with 0 sessions and returns ready milestone', () => {
      expect(PomodoroFocusEngine.getSessions()).toEqual([]);
      expect(PomodoroFocusEngine.getTodayStreak()).toBe(0);

      const milestone = PomodoroFocusEngine.getMilestoneCelebration(0);
      expect(milestone.badge).toBe('🎯 Ready');
      expect(milestone.burmese).toContain('၂၅ မိနစ်');
    });

    it('logs 25-minute Pomodoro focus session and calculates streak and Burmese celebration', () => {
      const res1 = PomodoroFocusEngine.logCompletedSession(25, 'block_pomodoro_sprint');
      expect(res1.streakCount).toBe(1);
      expect(res1.session.durationMinutes).toBe(25);
      expect(res1.milestone.badge).toBe('🎯 1x Sprint');
      expect(res1.milestone.burmese).toContain('ပထမဆုံး ၂၅ မိနစ်');

      const res2 = PomodoroFocusEngine.logCompletedSession(25, 'block_pomodoro_sprint');
      expect(res2.streakCount).toBe(2);
      expect(res2.milestone.badge).toBe('🔥 2x Streak');
      expect(res2.milestone.burmese).toContain('၂ ကြိမ်ဆက်');

      const res3 = PomodoroFocusEngine.logCompletedSession(25, 'block_pomodoro_sprint');
      expect(res3.streakCount).toBe(3);
      expect(res3.milestone.badge).toBe('⚡ 3x Streak');
      expect(res3.milestone.burmese).toContain('၃ ကြိမ်ဆက်');

      const res4 = PomodoroFocusEngine.logCompletedSession(25, 'block_pomodoro_sprint');
      expect(res4.streakCount).toBe(4);
      expect(res4.milestone.badge).toContain('Master Streak');
      expect(res4.milestone.burmese).toContain('စူပါ အာရုံစိုက်မှု');
    });
  });

  describe('StageMinimap Component', () => {
    it('defines exactly 15 stages with Burmese and English labels', () => {
      expect(STAGE_MINIMAP_DEFINITIONS).toHaveLength(15);
      expect(STAGE_MINIMAP_DEFINITIONS[0].shortNameMm).toBe('ရည်မှန်းချက်');
      expect(STAGE_MINIMAP_DEFINITIONS[1].shortNameMm).toBe('ဝေါဟာရ');
      expect(STAGE_MINIMAP_DEFINITIONS[12].shortNameMm).toBe('စာမေးပွဲ');
      expect(STAGE_MINIMAP_DEFINITIONS[14].shortNameMm).toBe('တိုးတက်မှု');
    });

    it('renders StageMinimap with completion ticks and accuracies', () => {
      const completed = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
      const accuracies: Record<number, number> = {
        6: 80,
        7: 100,
        8: 85,
      };

      const html = renderToString(
        React.createElement(StageMinimap, {
          currentStage: 9,
          completedStages: completed,
          stageAccuracies: accuracies,
          onJumpToStage: () => {},
        })
      );

      expect(html).toContain('Stage Minimap');
      expect(html).toContain('အဆင့် ၁ မှ ၁၅ အမြန်သွားရန်');
      expect(html).toContain('8/15 ပြီးစီး');
      expect(html).toContain('St 13 Test');
    });
  });

  describe('TimerWidget Pomodoro Focus Sprint Enhancement', () => {
    it('renders Pomodoro sprint indicators and celebration milestones', () => {
      PomodoroFocusEngine.logCompletedSession(25, 'block_pomodoro_sprint');

      const pomodoroTimerState: StudyTimerState = {
        state: 'running',
        blockId: 'block_pomodoro_sprint',
        targetMinutes: 25,
        startedAt: Date.now() - 300000,
        accumulatedMs: 300000,
        lastInteractionAt: Date.now(),
      };

      const html = renderToString(
        React.createElement(TimerWidget, {
          timerState: pomodoroTimerState,
          elapsedSec: 300,
          remainingSec: 1200,
          isIdlePaused: false,
          onPause: () => {},
          onResume: () => {},
          onFinish: () => {},
          onSkip: () => {},
          todayStudiedMinutes: 25,
          onStartPomodoro: () => {},
        })
      );

      expect(html).toContain('Active Study Timer');
      expect(html).toContain('POMODORO SPRINT');
      expect(html).toContain('20:00'); // 1200s
      expect(html).toContain('25m');
    });
  });
});
