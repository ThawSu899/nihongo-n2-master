import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  PitchContrastTrainer,
  MINIMAL_PAIRS_CATALOG,
} from '../src/presentation/components/PitchContrastTrainer';

describe('Pitch Contrast Trainer & Phonological Minimal Pairs', () => {
  it('contains curated minimal pairs with required Tokyo accent patterns and Burmese translations', () => {
    expect(MINIMAL_PAIRS_CATALOG.length).toBeGreaterThanOrEqual(7);

    for (const pair of MINIMAL_PAIRS_CATALOG) {
      expect(pair.id).toBeDefined();
      expect(pair.title).toBeDefined();
      expect(pair.words.length).toBeGreaterThanOrEqual(2);

      for (const word of pair.words) {
        expect(word.kanji.length).toBeGreaterThan(0);
        expect(word.reading.length).toBeGreaterThan(0);
        expect(['atamadaka', 'heiban', 'nakadaka', 'odaka']).toContain(word.pattern);
        expect(typeof word.meaningEn).toBe('string');
        expect(word.meaningEn.length).toBeGreaterThan(0);
        expect(typeof word.meaningMy).toBe('string');
        expect(word.meaningMy.length).toBeGreaterThan(0);

        if (word.pattern === 'atamadaka') {
          expect(word.dropIndex).toBe(1);
        } else if (word.pattern === 'heiban') {
          expect(word.dropIndex).toBe(0);
        }
      }
    }
  });

  it('renders PitchContrastTrainer with header, disclaimer, and initial minimal pair cards', () => {
    const html = renderToString(React.createElement(PitchContrastTrainer));

    expect(html).toContain('Pitch Accent Contrast Trainer');
    expect(html).toContain('Phonological Note:');
    expect(html).toContain('雨');
    expect(html).toContain('飴');
    expect(html).toContain('Play Auditory Contrast');
  });
});
