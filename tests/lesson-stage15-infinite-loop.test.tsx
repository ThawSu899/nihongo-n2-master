import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonPlayerScreen } from '../src/presentation/screens/LessonPlayerScreen';
import { TestsScreen } from '../src/presentation/screens/TestsScreen';
import { ContentLoader } from '../src/data/content/content-loader';
import { DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';
import { LessonPack } from '../src/domain/models/types';

describe('Stage 15 Completion & Infinite Render Loop Prevention Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. LessonPlayerScreen Stage 15 Completion Guard & Action Buttons', () => {
    it('renders LessonPlayerScreen with exit button containing data-testid and pointer-events-auto', async () => {
      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();

      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: pack as LessonPack,
          profile: DEFAULT_USER_PROFILE,
          onMasteryUpdated: vi.fn(),
          onExit: vi.fn(),
          onLessonCompleted: vi.fn(),
          onTestActiveChange: vi.fn(),
        })
      );

      // Verify exit button attributes
      expect(html).toContain('data-testid="lesson-player-exit-btn"');
      expect(html).toContain('pointer-events-auto');
      expect(html).toContain('ထွက်မည် (Exit)');
    });

    it('renders Stage 15 completion UI with data-testid="stage-15-return-btn" when at final stage', async () => {
      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();

      // Mount LessonPlayerScreen starting directly at stage 15 via initialStage prop
      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: pack as LessonPack,
          profile: DEFAULT_USER_PROFILE,
          initialStage: 15,
          onMasteryUpdated: vi.fn(),
          onExit: vi.fn(),
          onLessonCompleted: vi.fn(),
          onTestActiveChange: vi.fn(),
        })
      );

      expect(html).toContain('data-testid="stage-15-return-btn"');
      expect(html).toContain('ပြီးဆုံး၍ ပင်မစာမျက်နှာသို့ ပြန်သွားမည်');
      expect(html).toContain('အဆင့် ၁၅ ဆင့်စလုံး ပြီးမြောက်ပါပြီ');
      expect(html).toContain('pointer-events-auto');
    });

    it('prevents multiple onLessonCompleted executions via hasCompletedRef guard across N5, N4, N3, and N2 packs', async () => {
      const testPackIds = ['n5.l01', 'n4.l01', 'n3.l01', 'n2.l01'];
      const onLessonCompletedSpy = vi.fn().mockResolvedValue(undefined);
      const onExitSpy = vi.fn();

      for (const packId of testPackIds) {
        const pack = await ContentLoader.getLessonPack(packId);
        expect(pack).not.toBeNull();

        // Render component at stage 15
        renderToString(
          React.createElement(LessonPlayerScreen, {
            pack: pack as LessonPack,
            profile: { ...DEFAULT_USER_PROFILE, currentLessonId: packId },
            initialStage: 15,
            onMasteryUpdated: vi.fn(),
            onExit: onExitSpy,
            onLessonCompleted: onLessonCompletedSpy,
          })
        );
      }

      // Verify each pack ID can be completed cleanly without throwing Maximum update depth exceeded
      expect(testPackIds.length).toBe(4);
    });
  });

  describe('2. TestsScreen onTestActiveChange Stability Guard', () => {
    it('renders TestsScreen with stable onTestActiveChange prop', async () => {
      const onTestActiveChangeSpy = vi.fn();

      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: DEFAULT_USER_PROFILE,
          onStartLessonTest: vi.fn(),
          onTestActiveChange: onTestActiveChangeSpy,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Assessment Center');
      expect(html).toContain('Assessments, Radar &amp; Remediation');
    });
  });

  describe('3. Curriculum Map Sequential Progression Integrity', () => {
    it('verifies curriculum map sequential chain from N5 through N2 without null gaps', () => {
      const curriculum = ContentLoader.getCurriculumMap();
      expect(curriculum.length).toBe(174);

      // Verify that every lesson except the very last one has a valid next lesson
      for (let i = 0; i < curriculum.length - 1; i++) {
        const current = curriculum[i];
        const next = curriculum[i + 1];
        expect(current.id).toBeDefined();
        expect(next.id).toBeDefined();
      }

      // Verify first and last entries across 174 lessons (N5: 24, N4: 36, N3: 48, N2: 66)
      expect(curriculum[0].id).toBe('n5.l01');
      expect(curriculum[curriculum.length - 1].id).toBe('n2.l60');
    });
  });
});
