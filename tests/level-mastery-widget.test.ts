import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import {
  LevelMasteryWidget,
  LevelMasteryWidgetProps,
} from '../src/presentation/components/LevelMasteryWidget';

describe('LevelMasteryWidget Component', () => {
  const dummyStats: LevelMasteryWidgetProps['stats'] = {
    N5: { completedLessons: 15, masteredVocab: 450 },
    N4: { completedLessons: 9, masteredVocab: 270 },
    N3: { completedLessons: 12, masteredVocab: 360 },
    N2: { completedLessons: 0, masteredVocab: 0 },
  };

  it('renders the header and all 4 JLPT level cards without crashing', () => {
    const onSelectLevel = vi.fn();
    const html = renderToString(
      React.createElement(LevelMasteryWidget, {
        stats: dummyStats,
        onSelectLevel,
      })
    );

    expect(html).toContain('JLPT Level Progress &amp; Mastery');
    expect(html).toContain('JLPT N5');
    expect(html).toContain('JLPT N4');
    expect(html).toContain('JLPT N3');
    expect(html).toContain('JLPT N2');
  });

  it('displays accurate lesson targets and elevated vocabulary targets', () => {
    const onSelectLevel = vi.fn();
    const html = renderToString(
      React.createElement(LevelMasteryWidget, {
        stats: dummyStats,
        onSelectLevel,
      })
    );

    // N5 targets: 30 lessons, 900 vocab
    expect(html).toContain('15/30 Lessons');
    expect(html).toContain('450/900 Vocab');
    expect(html).toContain('50%'); // 15/30 = 50%, 450/900 = 50%

    // N4 targets: 36 lessons, 1080 vocab
    expect(html).toContain('9/36 Lessons');
    expect(html).toContain('270/1080 Vocab');
    expect(html).toContain('25%'); // 9/36 = 25%, 270/1080 = 25%

    // N3 targets: 48 lessons, 1440 vocab
    expect(html).toContain('12/48 Lessons');
    expect(html).toContain('360/1440 Vocab');

    // N2 targets: 60 lessons, 1800 vocab
    expect(html).toContain('0/60 Lessons');
    expect(html).toContain('0/1800 Vocab');
    expect(html).toContain('0%');

    // Global curriculum aggregate: 174 lessons, 5220 vocab
    expect(html).toContain('/ 174');
    expect(html).toContain('/ 5,220');
  });

  it('handles zero or missing stats gracefully', () => {
    const emptyStats: LevelMasteryWidgetProps['stats'] = {
      N5: { completedLessons: 0, masteredVocab: 0 },
      N4: { completedLessons: 0, masteredVocab: 0 },
      N3: { completedLessons: 0, masteredVocab: 0 },
      N2: { completedLessons: 0, masteredVocab: 0 },
    };

    const html = renderToString(
      React.createElement(LevelMasteryWidget, {
        stats: emptyStats,
        onSelectLevel: vi.fn(),
      })
    );

    expect(html).toContain('0/30 Lessons');
    expect(html).toContain('0/900 Vocab');
    expect(html).toContain('0 <span class="text-stone-500">/ 174</span>');
    expect(html).toContain('0 <span class="text-stone-500">/ 5,220</span>');
  });

  it('caps percentages at 100% when values exceed standard totals', () => {
    const maxedStats: LevelMasteryWidgetProps['stats'] = {
      N5: { completedLessons: 35, masteredVocab: 1000 },
      N4: { completedLessons: 36, masteredVocab: 1080 },
      N3: { completedLessons: 48, masteredVocab: 1440 },
      N2: { completedLessons: 60, masteredVocab: 1800 },
    };

    const html = renderToString(
      React.createElement(LevelMasteryWidget, {
        stats: maxedStats,
        onSelectLevel: vi.fn(),
      })
    );

    expect(html).toContain('100%');
    expect(html).not.toContain('117%');
  });
});
