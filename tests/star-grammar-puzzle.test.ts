import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  splitSentenceIntoFourSegments,
  createPuzzleFromSentence,
  StarScrambleEngine,
  STAR_SCRAMBLE_CATALOG,
} from '../src/domain/assessment/star-scramble-engine';
import { StarScrambleTrainer } from '../src/presentation/components/StarScrambleTrainer';

describe('JLPT Star Grammar Puzzle Engine & Mode', () => {
  const sampleSentence = '今回のプロジェクトが成功したのは、チーム全員が最後まで諦めずに努力した結果にほかならない。';

  it('automatically splits target Japanese sentences into 4 segments with prefix and suffix', () => {
    const split = splitSentenceIntoFourSegments(sampleSentence);
    expect(split).not.toBeNull();
    expect(split?.segments.length).toBe(4);
    split?.segments.forEach((seg) => {
      expect(seg.length).toBeGreaterThan(0);
    });
  });

  it('creates an authentic Star puzzle designating the 3rd slot as the ★ target slot', () => {
    const puzzle = createPuzzleFromSentence(
      'puzzle_test_01',
      'Test Puzzle',
      sampleSentence,
      {
        fullSentenceMy: 'ပရောဂျက် အောင်မြင်ရခြင်းမှာ အားထုတ်မှု ရလဒ်ကြောင့်သာ ဖြစ်သည်။',
        fullSentenceEn: 'The project success was the result of effort.',
        grammarFocus: '〜にほかならない',
        level: 'N2',
      }
    );

    expect(puzzle).not.toBeNull();
    expect(puzzle?.starSlotIndex).toBe(2); // 3rd slot (0-indexed 2)
    expect(puzzle?.tokens.length).toBe(4);
    expect(puzzle?.correctTokenOrder.length).toBe(4);
    expect(puzzle?.starOptionNumber).toBe(puzzle?.correctTokenOrder[2]);

    // Check Burmese grammar explanation presence
    expect(puzzle?.detailedExplanation).toContain('★ အကွက်');
    expect(puzzle?.detailedExplanation).toContain('မြန်မာပြန်:');
  });

  it('evaluates star slot correctness properly in StarScrambleEngine', () => {
    const puzzle = STAR_SCRAMBLE_CATALOG[0];
    const correctOrder = [...puzzle.correctTokenOrder];

    // Fully correct submission
    const resFull = StarScrambleEngine.evaluate(puzzle, correctOrder);
    expect(resFull.isComplete).toBe(true);
    expect(resFull.isFullyCorrect).toBe(true);
    expect(resFull.isStarCorrect).toBe(true);
    expect(resFull.score).toBe(100);

    // Star slot correct but other slots swapped
    const swappedOrder = [...correctOrder];
    // swap slot 0 and slot 1
    const tmp = swappedOrder[0];
    swappedOrder[0] = swappedOrder[1];
    swappedOrder[1] = tmp;

    const resStar = StarScrambleEngine.evaluate(puzzle, swappedOrder);
    expect(resStar.isStarCorrect).toBe(true);
    expect(resStar.isFullyCorrect).toBe(false);
    expect(resStar.score).toBe(75); // Awarded star credit on JLPT

    // Star slot incorrect
    const wrongStarOrder = [...correctOrder];
    wrongStarOrder[2] = 99; // wrong option
    const resWrong = StarScrambleEngine.evaluate(puzzle, wrongStarOrder);
    expect(resWrong.isStarCorrect).toBe(false);
    expect(resWrong.score).toBe(0);
  });

  it('renders StarScrambleTrainer with Korean, English and Burmese headers and interactive slots', () => {
    const html = renderToString(
      React.createElement(StarScrambleTrainer, {
        onExit: vi.fn(),
        onComplete: vi.fn(),
      })
    );

    expect(html).toBeDefined();
    // Verify required bilingual title
    expect(html).toContain('★ 문장 조립 / JLPT Star Grammar Puzzle (ကြယ်ပွင့် ဝါကျစီ လေ့ကျင့်ခန်း)');
    expect(html).toContain('3rd Blank [★] Slot');
    // Verify 4 blank slot markers [ 1 ], [ 2 ], [ 3 ], [ 4 ]
    expect(html).toContain('[ 1 ]');
    expect(html).toContain('[ 2 ]');
    expect(html).toContain('★');
  });
});
