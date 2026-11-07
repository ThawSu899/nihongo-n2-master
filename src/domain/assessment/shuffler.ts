import { Question } from '../models/types';

export interface ShuffledOption {
  id: string;            // Stable unique ID for this option: `${questionId}_opt_${originalIndex}`
  text: string;          // Display text
  originalIndex: number; // Original position in q.choices
  isCorrect: boolean;    // Whether this option matches canonical q.answer
}

/**
 * Pure Fisher-Yates shuffle algorithm.
 * Uses a provided randomFn (defaulting to Math.random) for deterministic testing.
 */
export function fisherYatesShuffle<T>(items: readonly T[], randomFn: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prepares shuffled options for a question while preserving correct-answer identity.
 * Unambiguously handles duplicate strings by matching on original index first.
 * Safely handles missing choices or invalid answers.
 */
export function prepareShuffledOptions(
  questionId: string,
  choices: string[] | undefined,
  canonicalAnswer: string,
  randomFn: () => number = Math.random
): ShuffledOption[] {
  if (!choices || choices.length === 0) {
    return [];
  }

  // Identify canonical correct index in original choices
  const exactIndex = choices.indexOf(canonicalAnswer);

  const rawOptions: ShuffledOption[] = choices.map((text, idx) => ({
    id: `${questionId}_opt_${idx}`,
    text,
    originalIndex: idx,
    // Only mark true if this choice index matches canonical index (resolves duplicates),
    // or fallback to trimmed string match if exact match wasn't found.
    isCorrect: exactIndex >= 0 ? idx === exactIndex : text.trim() === canonicalAnswer.trim(),
  }));

  return fisherYatesShuffle(rawOptions, randomFn);
}

/**
 * Assessment session manager that caches shuffled options per question attempt.
 * Ensures stable option ordering throughout renders, back-and-forth navigation,
 * and user interactions during a single attempt.
 */
export class AssessmentSession {
  private cache = new Map<string, ShuffledOption[]>();
  private randomFn: () => number;

  constructor(randomFn: () => number = Math.random) {
    this.randomFn = randomFn;
  }

  /**
   * Retrieves shuffled options for a question, using cached order if already prepared.
   */
  getOptions(q: Question): ShuffledOption[] {
    if (!q || !q.choices || q.choices.length === 0) {
      return [];
    }
    const cached = this.cache.get(q.id);
    if (cached) {
      return cached;
    }
    const shuffled = prepareShuffledOptions(q.id, q.choices, q.answer, this.randomFn);
    this.cache.set(q.id, shuffled);
    return shuffled;
  }

  /**
   * Verifies an answer choice safely using the option's isCorrect flag or canonical match.
   */
  checkOption(selectedOption: ShuffledOption | null, canonicalAnswer: string): boolean {
    if (!selectedOption) return false;
    // Primary: rely on option identity
    if (typeof selectedOption.isCorrect === 'boolean') {
      return selectedOption.isCorrect;
    }
    // Fallback
    return selectedOption.text === canonicalAnswer;
  }

  /**
   * Resets session cache for a fresh attempt (e.g. retake or new test).
   */
  reset(): void {
    this.cache.clear();
  }
}
