import { describe, it, expect } from 'vitest';
import {
  StarScrambleEngine,
  STAR_SCRAMBLE_CATALOG,
} from '../src/domain/assessment/star-scramble-engine';

describe('StarScrambleEngine: JLPT N2 Star Question Assessment', () => {
  it('has a non-empty catalog of authentic N2 scramble puzzles', () => {
    const puzzles = StarScrambleEngine.getAllPuzzles();
    expect(puzzles.length).toBeGreaterThan(0);

    for (const puzzle of puzzles) {
      expect(puzzle.tokens.length).toBe(4);
      expect(puzzle.correctTokenOrder.length).toBe(4);
      expect(puzzle.chainReasoning.length).toBeGreaterThanOrEqual(2);
      expect([0, 1, 2, 3]).toContain(puzzle.starSlotIndex);
      expect(puzzle.tokens.map((t) => t.optionNumber).sort()).toEqual([1, 2, 3, 4]);
    }
  });

  it('correctly evaluates incomplete submissions as score 0', () => {
    const puzzle = STAR_SCRAMBLE_CATALOG[0];
    const evalResult = StarScrambleEngine.evaluate(puzzle, [1, 2, null, null]);
    expect(evalResult.isComplete).toBe(false);
    expect(evalResult.score).toBe(0);
    expect(evalResult.isFullyCorrect).toBe(false);
    expect(evalResult.isStarCorrect).toBe(false);
  });

  it('awards 100 points for a completely correct sequence', () => {
    const puzzle = STAR_SCRAMBLE_CATALOG[0];
    const evalResult = StarScrambleEngine.evaluate(puzzle, puzzle.correctTokenOrder);
    expect(evalResult.isComplete).toBe(true);
    expect(evalResult.isFullyCorrect).toBe(true);
    expect(evalResult.isStarCorrect).toBe(true);
    expect(evalResult.score).toBe(100);
  });

  it('awards 75 points if only the star slot is correct (JLPT official scoring)', () => {
    const puzzle = STAR_SCRAMBLE_CATALOG[0];
    // Create an order where star slot is correct, but other slots differ
    const starOption = puzzle.starOptionNumber;
    const starIdx = puzzle.starSlotIndex;

    const modifiedOrder: number[] = [99, 99, 99, 99];
    modifiedOrder[starIdx] = starOption;

    // Fill other slots with arbitrary wrong numbers
    let wrongNum = 1;
    for (let i = 0; i < 4; i++) {
      if (i !== starIdx) {
        while (wrongNum === starOption || modifiedOrder.includes(wrongNum)) {
          wrongNum++;
        }
        modifiedOrder[i] = wrongNum;
      }
    }

    const evalResult = StarScrambleEngine.evaluate(puzzle, modifiedOrder);
    expect(evalResult.isComplete).toBe(true);
    expect(evalResult.isFullyCorrect).toBe(false);
    expect(evalResult.isStarCorrect).toBe(true);
    expect(evalResult.score).toBe(75);
  });

  it('awards 0 points if the star slot is incorrect', () => {
    const puzzle = STAR_SCRAMBLE_CATALOG[0];
    const starIdx = puzzle.starSlotIndex;
    const wrongStarOrder = [...puzzle.correctTokenOrder];
    // Swap star slot with another option
    const otherIdx = starIdx === 0 ? 1 : 0;
    const temp = wrongStarOrder[starIdx];
    wrongStarOrder[starIdx] = wrongStarOrder[otherIdx];
    wrongStarOrder[otherIdx] = temp;

    const evalResult = StarScrambleEngine.evaluate(puzzle, wrongStarOrder);
    expect(evalResult.isComplete).toBe(true);
    expect(evalResult.isStarCorrect).toBe(false);
    expect(evalResult.score).toBe(0);
  });

  it('can retrieve specific puzzle by id', () => {
    const puzzle = StarScrambleEngine.getPuzzleById('star_n2_01');
    expect(puzzle).toBeDefined();
    expect(puzzle?.title).toBe('プロジェクトの成功と努力');
  });
});
