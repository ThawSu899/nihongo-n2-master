import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimer } from '../src/presentation/hooks/useTimer';
import { useChoukaiAudio } from '../src/presentation/hooks/useChoukaiAudio';
import { ChoukaiScenario } from '../src/domain/assessment/choukai-catalog';
import { db } from '../src/data/db/dexie-db';

describe('Presentation Hooks: useTimer & useChoukaiAudio', () => {
  const originalLocalStorage = global.localStorage;
  const store: Record<string, string> = {};

  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    (global as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    await db.study_events.clear();
  });

  afterEach(() => {
    (global as any).localStorage = originalLocalStorage;
  });

  describe('useTimer hook', () => {
    it('initializes with default idle state and 60-minute target', () => {
      let timer: ReturnType<typeof useTimer> | null = null;
      function TestComponent() {
        timer = useTimer();
        return React.createElement('div', null, timer.timerState.state);
      }

      renderToString(React.createElement(TestComponent));

      expect(timer).not.toBeNull();
      expect(timer!.timerState.state).toBe('idle');
      expect(timer!.timerState.targetMinutes).toBe(60);
      expect(timer!.timerState.blockId).toBeNull();
      expect(timer!.elapsedSec).toBe(0);
      expect(timer!.remainingSec).toBe(3600);
      expect(timer!.isIdlePaused).toBe(false);
    });

    it('loads previously stored active timer state from localStorage', () => {
      const persistedState = {
        state: 'running',
        blockId: 'block_vocab_test',
        targetMinutes: 25,
        elapsedSeconds: 300,
        remainingSeconds: 1200,
        lastInteractionAt: Date.now(),
        startedAt: Date.now() - 300000,
        pausedAt: null,
      };
      mockLocalStorage.setItem('nihongo_n2_active_timer', JSON.stringify(persistedState));

      let timer: ReturnType<typeof useTimer> | null = null;
      function TestComponent() {
        timer = useTimer();
        return React.createElement('div', null, timer.timerState.state);
      }

      renderToString(React.createElement(TestComponent));

      expect(timer).not.toBeNull();
      expect(timer!.timerState.state).toBe('running');
      expect(timer!.timerState.blockId).toBe('block_vocab_test');
      expect(timer!.timerState.targetMinutes).toBe(25);
    });

    it('provides callable controls for startBlock, pauseTimer, resumeTimer, finishBlock, and skipBlock', async () => {
      let timer: ReturnType<typeof useTimer> | null = null;
      const onCompleted = vi.fn();

      function TestComponent() {
        timer = useTimer(onCompleted);
        return React.createElement('div', null, 'timer');
      }

      renderToString(React.createElement(TestComponent));
      expect(timer).not.toBeNull();

      // Test startBlock action
      timer!.startBlock('block_grammar_1', 30);
      const events = await db.study_events.toArray();
      expect(events.some((e) => e.type === 'block_completed' && e.data.action === 'started')).toBe(true);

      // Verify callable control signatures
      expect(typeof timer!.pauseTimer).toBe('function');
      expect(typeof timer!.resumeTimer).toBe('function');
      expect(typeof timer!.finishBlock).toBe('function');
      expect(typeof timer!.skipBlock).toBe('function');
      expect(typeof timer!.recordUserActivity).toBe('function');
    });
  });

  describe('useChoukaiAudio hook', () => {
    const mockScenario: ChoukaiScenario = {
      id: 'test-scenario-01',
      title: 'Office Conversation',
      titleJa: 'オフィスの会話',
      level: 'N2',
      type: 'kadai_rikai',
      typeLabel: 'Task Comprehension',
      typeDescription: 'Listen and identify required task',
      situation: '会社で男の人と女の人が話しています。',
      speakers: [],
      dialogue: [
        {
          id: 'line-1',
          speakerId: 'Tanaka-sensei',
          japanese: '明日の会議は何時からですか。',
          reading: 'あしたのかいぎはなんじからですか。',
          english: 'What time does tomorrow’s meeting start?',
          burmese: 'မနက်ဖြန် အစည်းအဝေး ဘယ်အချိန် စမလဲခင်ဗျာ။',
        },
        {
          id: 'line-2',
          speakerId: 'Kyoko',
          japanese: '午前十時からです。',
          reading: 'ごぜんじゅうじからです。',
          english: 'It starts at 10:00 AM.',
          burmese: 'မနက် ၁၀ နာရီ စပါမယ်။',
        },
      ],
      questionPromptJa: '会議は何時からですか。',
      questionPromptEn: 'When is the meeting?',
      choices: ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM'],
      correctAnswer: '10:00 AM',
      answerIndex: 1,
      distractorAnalyses: [],
      strategyTipEn: 'Listen for time expressions.',
      strategyTipJa: '時間表現に注意する。',
      keyVocabulary: [],
    };

    it('initializes without scenario cleanly', () => {
      let audio: ReturnType<typeof useChoukaiAudio> | null = null;
      function TestComponent() {
        audio = useChoukaiAudio();
        return React.createElement('div', null, 'choukai');
      }

      renderToString(React.createElement(TestComponent));

      expect(audio).not.toBeNull();
      expect(audio!.isPlaying).toBe(false);
      expect(audio!.isPaused).toBe(false);
      expect(audio!.currentLineIndex).toBe(0);
      expect(audio!.currentLine).toBeNull();
      expect(audio!.playbackRate).toBe(1.0);
      expect(audio!.isShadowingLoop).toBe(false);
      expect(audio!.shadowingTurnDelay).toBe(2000);
      expect(audio!.isComplete).toBe(false);
    });

    it('initializes with scenario and sets the first dialogue line', () => {
      let audio: ReturnType<typeof useChoukaiAudio> | null = null;
      function TestComponent() {
        audio = useChoukaiAudio(mockScenario);
        return React.createElement('div', null, 'choukai');
      }

      renderToString(React.createElement(TestComponent));

      expect(audio).not.toBeNull();
      expect(audio!.currentLine).not.toBeNull();
      expect(audio!.currentLine?.japanese).toBe('明日の会議は何時からですか。');
      expect(audio!.currentLine?.speakerId).toBe('Tanaka-sensei');
    });

    it('provides playback and configuration methods', () => {
      let audio: ReturnType<typeof useChoukaiAudio> | null = null;
      function TestComponent() {
        audio = useChoukaiAudio(mockScenario);
        return React.createElement('div', null, 'choukai');
      }

      renderToString(React.createElement(TestComponent));

      expect(typeof audio!.play).toBe('function');
      expect(typeof audio!.playSingleLine).toBe('function');
      expect(typeof audio!.pause).toBe('function');
      expect(typeof audio!.resume).toBe('function');
      expect(typeof audio!.stop).toBe('function');
      expect(typeof audio!.setSpeed).toBe('function');
      expect(typeof audio!.loadScenario).toBe('function');
      expect(typeof audio!.toggleShadowingLoop).toBe('function');
      expect(typeof audio!.setShadowingTurnDelay).toBe('function');

      // Call methods to verify safe execution
      audio!.setSpeed(1.25);
      audio!.toggleShadowingLoop();
      audio!.setShadowingTurnDelay(3000);
      audio!.stop();
    });
  });
});
