import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  JLPTMissionControl,
  EXAM_TARGET_STORAGE_KEY,
  DEFAULT_EXAM_DATE,
  DEFAULT_EXAM_LEVEL,
  getStoredExamTarget,
  saveStoredExamTarget,
} from '../src/presentation/components/JLPTMissionControl';

describe('JLPTMissionControl - Predictive Burn-Down & Velocity Planner', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('retrieves default exam target when localStorage is unpopulated', () => {
    const target = getStoredExamTarget();
    expect(target.targetDate).toBe(DEFAULT_EXAM_DATE);
    expect(target.targetLevel).toBe(DEFAULT_EXAM_LEVEL);
  });

  it('persists and retrieves configured exam target in localStorage under nihongo_exam_target', () => {
    saveStoredExamTarget({
      targetDate: '2026-12-06',
      targetLevel: 'N3',
    });

    const retrieved = getStoredExamTarget();
    expect(retrieved.targetDate).toBe('2026-12-06');
    expect(retrieved.targetLevel).toBe('N3');

    const raw = localStorage.getItem(EXAM_TARGET_STORAGE_KEY);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!)).toEqual({
      targetDate: '2026-12-06',
      targetLevel: 'N3',
    });
  });

  it('renders JLPT Mission Control component with required metrics and Burmese translations', () => {
    const html = renderToString(
      React.createElement(JLPTMissionControl, {
        masteryRecords: {
          'n2.l01': {
            lessonId: 'n2.l01',
            state: 'mastered',
            scores: { vocab: 1, kanji: 1, grammar: 1, reading: 1, listening: 1, overall: 1 },
            evidenceCounts: { vocab: 10, kanji: 6, grammar: 6, reading: 5, listening: 5 },
            passedThresholds: true,
            failedSkills: [],
            consecutiveFailures: 0,
            isProvisional: false,
            needsRefresh: false,
            history: [],
          },
        },
      })
    );

    // Verify Title & Bilingual indicators
    expect(html).toContain('JLPT Mission Control');
    expect(html).toContain('Days Remaining');
    expect(html).toContain('ကျန်ရှိရက်');
    expect(html).toContain('Daily Velocity');
    expect(html).toContain('သတ်မှတ်နှုန်း');
    expect(html).toContain('Est. Daily Study');
    expect(html).toContain('နေ့စဉ်လေ့လာချိန်');
    expect(html).toContain('Readiness Status');

    // Verify readiness strings in Burmese & English
    const hasOnTrack = html.includes('On Track / အချိန်မီနေသည်');
    const hasAccelerate = html.includes('Accelerate / အရှိန်မြှင့်ရန်လိုသည်');
    expect(hasOnTrack || hasAccelerate).toBe(true);

    // Verify visual progress bar container exists
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Curriculum Mastery');
  });
});
