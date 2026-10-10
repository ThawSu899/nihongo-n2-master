import * as wanakana from 'wanakana';

export interface AnswerCheckOptions {
  caseSensitive?: boolean;
  convertRomajiToKana?: boolean;
  acceptedAlternatives?: string[];
}

export interface AnswerCheckResult {
  isCorrect: boolean;
  normalizedInput: string;
  normalizedExpected: string;
  matchedAlternative?: string;
}

/**
 * Clean up text for robust comparison:
 * 1. NFKC unicode normalization
 * 2. Strip leading/trailing whitespaces and extra internal spaces
 * 3. Strip Japanese and ASCII punctuation (。、！？!?.,~〜・-ー)
 */
export function normalizeAnswer(text: string, toKana = true): string {
  if (!text) return '';

  // 1. NFKC unicode normalize
  let normalized = text.normalize('NFKC').trim();

  // 2. Romaji to hiragana if enabled and contains Latin characters
  if (toKana && /[a-zA-Z]/.test(normalized)) {
    normalized = wanakana.toKana(normalized);
  }

  // 3. Remove punctuation and space
  normalized = normalized
    .replace(/[。、，．！？!?,.\s~〜・\-_—–()（）「」『』【】[\]]/g, '')
    .toLowerCase();

  return normalized;
}

/**
 * Compare learner input with expected answer and accepted alternatives
 */
export function checkAnswer(
  input: string,
  expected: string,
  acceptedAlternatives: string[] = []
): AnswerCheckResult {
  const normInput = normalizeAnswer(input);
  const normExpected = normalizeAnswer(expected);

  if (normInput === normExpected && normInput.length > 0) {
    return {
      isCorrect: true,
      normalizedInput: normInput,
      normalizedExpected: normExpected,
    };
  }

  // Check katakana/hiragana conversion equivalence
  const inputAsHiragana = wanakana.toHiragana(normInput);
  const expectedAsHiragana = wanakana.toHiragana(normExpected);

  if (inputAsHiragana === expectedAsHiragana && inputAsHiragana.length > 0) {
    return {
      isCorrect: true,
      normalizedInput: normInput,
      normalizedExpected: normExpected,
    };
  }

  // Check accepted alternatives
  for (const alt of acceptedAlternatives) {
    const normAlt = normalizeAnswer(alt);
    const altAsHiragana = wanakana.toHiragana(normAlt);

    if (normInput === normAlt || inputAsHiragana === altAsHiragana) {
      return {
        isCorrect: true,
        normalizedInput: normInput,
        normalizedExpected: normExpected,
        matchedAlternative: alt,
      };
    }
  }

  return {
    isCorrect: false,
    normalizedInput: normInput,
    normalizedExpected: normExpected,
  };
}

/**
 * Rate learner response time and hint usage to determine SRS rating:
 * - Wrong -> Again
 * - Hinted OR slow (> 2x median) -> Hard
 * - Clean correct -> Good (Multiple Choice capped at Good)
 * - Fast clean typed recall -> Easy
 */
export function deriveSRSRating(params: {
  isCorrect: boolean;
  usedHint: boolean;
  elapsedMs: number;
  medianResponseMs: number;
  isTypedRecall: boolean;
}): 'again' | 'hard' | 'good' | 'easy' {
  if (!params.isCorrect) {
    return 'again';
  }

  const isSlow = params.medianResponseMs > 0 && params.elapsedMs > params.medianResponseMs * 2;

  if (params.usedHint || isSlow) {
    return 'hard';
  }

  if (params.isTypedRecall && params.elapsedMs < Math.max(2500, params.medianResponseMs * 0.75)) {
    return 'easy';
  }

  return 'good';
}
