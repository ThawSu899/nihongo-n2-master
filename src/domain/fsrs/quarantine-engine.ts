import {
  GhostCardReason,
  QuarantinedCard,
  QuarantineStats,
} from './quarantine-types';

export interface QuarantineEvaluationInput {
  lapses: number;
  difficulty: number;
  stability: number;
  mockFailCount?: number;
  responseTimeMs?: number;
}

export interface QuarantineEvaluationResult {
  shouldQuarantine: boolean;
  reason?: GhostCardReason;
}

export interface DrillProcessResult {
  updatedCard: QuarantinedCard;
  graduatedNow: boolean;
  boostedStability: number;
}

export class QuarantineEngine {
  static readonly LAPSE_THRESHOLD = 3;
  static readonly DIFFICULTY_THRESHOLD = 8.5;
  static readonly MIN_STABILITY_THRESHOLD = 1.2;
  static readonly GRADUATION_STREAK_TARGET = 3;
  static readonly BURMESE_LATENCY_THRESHOLD_MS = 25000;
  static readonly MOCK_FAIL_THRESHOLD = 2;

  /**
   * Deterministically evaluates whether a card should enter ghost card quarantine.
   * Priority:
   * 1. HIGH_LAPSE_COUNT: lapses >= 3
   * 2. LOW_STABILITY_PLATEAU: difficulty >= 8.5 && stability <= 1.2
   * 3. MOCK_TEST_REPEATED_MISS: mockFailCount >= 2
   * 4. BURMESE_MISALIGNMENT: responseTimeMs > 25000 && lapses >= 2
   */
  static evaluateForQuarantine(
    input: QuarantineEvaluationInput
  ): QuarantineEvaluationResult {
    const {
      lapses,
      difficulty,
      stability,
      mockFailCount = 0,
      responseTimeMs = 0,
    } = input;

    if (lapses >= this.LAPSE_THRESHOLD) {
      return { shouldQuarantine: true, reason: 'HIGH_LAPSE_COUNT' };
    }

    if (
      difficulty >= this.DIFFICULTY_THRESHOLD &&
      stability <= this.MIN_STABILITY_THRESHOLD
    ) {
      return { shouldQuarantine: true, reason: 'LOW_STABILITY_PLATEAU' };
    }

    if (mockFailCount >= this.MOCK_FAIL_THRESHOLD) {
      return { shouldQuarantine: true, reason: 'MOCK_TEST_REPEATED_MISS' };
    }

    if (
      responseTimeMs > this.BURMESE_LATENCY_THRESHOLD_MS &&
      lapses >= 2
    ) {
      return { shouldQuarantine: true, reason: 'BURMESE_MISALIGNMENT' };
    }

    return { shouldQuarantine: false };
  }

  /**
   * Processes a micro-drill outcome on a quarantined card.
   * - Correct: recoveryStreak + 1. If streak reaches 3, card graduates with boosted stability.
   * - Incorrect: recoveryStreak resets to 0, lapses increments by 1.
   */
  static processDrillResult(
    card: QuarantinedCard,
    isCorrect: boolean
  ): DrillProcessResult {
    if (isCorrect) {
      const nextStreak = card.recoveryStreak + 1;
      const graduatedNow = nextStreak >= this.GRADUATION_STREAK_TARGET;
      const boostedStability = graduatedNow
        ? Math.max(card.currentStability * 2.2, 3.5)
        : card.currentStability;

      const updatedCard: QuarantinedCard = {
        ...card,
        recoveryStreak: nextStreak,
        isGraduated: graduatedNow ? true : card.isGraduated,
        currentStability: boostedStability,
      };

      return {
        updatedCard,
        graduatedNow,
        boostedStability,
      };
    }

    // Incorrect answer resets streak
    const updatedCard: QuarantinedCard = {
      ...card,
      recoveryStreak: 0,
      lapses: card.lapses + 1,
      isGraduated: false,
    };

    return {
      updatedCard,
      graduatedNow: false,
      boostedStability: card.currentStability,
    };
  }

  /**
   * Computes aggregated telemetry and distribution stats across all quarantined cards.
   */
  static computeStats(cards: QuarantinedCard[]): QuarantineStats {
    const byLevel: Record<'N5' | 'N4' | 'N3' | 'N2', number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
    };

    const byReason: Record<GhostCardReason, number> = {
      HIGH_LAPSE_COUNT: 0,
      LOW_STABILITY_PLATEAU: 0,
      MOCK_TEST_REPEATED_MISS: 0,
      BURMESE_MISALIGNMENT: 0,
    };

    let activeCount = 0;
    let graduatedCount = 0;

    for (const card of cards) {
      if (card.isGraduated) {
        graduatedCount++;
      } else {
        activeCount++;
      }

      if (byLevel[card.jlptLevel] !== undefined) {
        byLevel[card.jlptLevel]++;
      }

      if (byReason[card.quarantineReason] !== undefined) {
        byReason[card.quarantineReason]++;
      }
    }

    return {
      totalQuarantined: cards.length,
      activeCount,
      graduatedCount,
      byLevel,
      byReason,
    };
  }
}
