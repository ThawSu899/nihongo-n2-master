import {
  LessonThresholds,
  MasteryRecord,
  MasteryState,
  QuestionSkill,
} from '../models/types';
import { Clock } from '../common/clock';

export const DEFAULT_THRESHOLDS: LessonThresholds = {
  vocab: 0.90,
  kanji: 0.85,
  grammar: 0.85,
  reading: 0.80,
  listening: 0.80,
  overall: 0.85,
};

export const MIN_EVIDENCE_COUNTS: Record<QuestionSkill, number> = {
  vocab: 6,
  kanji: 3,
  grammar: 3,
  reading: 3,
  listening: 3,
};

export const SKILL_WEIGHTS: Record<QuestionSkill, number> = {
  vocab: 0.25,
  kanji: 0.15,
  grammar: 0.25,
  reading: 0.175,
  listening: 0.175,
};

export interface TestAttemptScore {
  bySkill: Record<QuestionSkill, { correct: number; total: number }>;
  failedItemIds: string[];
}

export class MasteryEngine {
  constructor(
    private clock: Clock,
    private thresholds: LessonThresholds = DEFAULT_THRESHOLDS,
    private minCounts: Record<QuestionSkill, number> = MIN_EVIDENCE_COUNTS
  ) {}

  /**
   * Calculate weighted overall score and per-skill accuracy percentages
   */
  calculateScores(attempt: TestAttemptScore): {
    scores: Record<QuestionSkill, number>;
    counts: Record<QuestionSkill, number>;
    overall: number;
    failedSkills: QuestionSkill[];
    hasMinimumEvidence: boolean;
    passedThresholds: boolean;
  } {
    const skills: QuestionSkill[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening'];
    const scores = {} as Record<QuestionSkill, number>;
    const counts = {} as Record<QuestionSkill, number>;
    const failedSkills: QuestionSkill[] = [];
    let hasMinimumEvidence = true;
    let testedWeight = 0;
    let weightedSum = 0;
    let totalQuestions = 0;

    for (const skill of skills) {
      const data = attempt.bySkill[skill] || { correct: 0, total: 0 };
      counts[skill] = data.total;
      scores[skill] = data.total > 0 ? data.correct / data.total : 0;
      totalQuestions += data.total;

      if (data.total > 0) {
        if (data.total < this.minCounts[skill]) {
          hasMinimumEvidence = false;
        }

        if (scores[skill] < this.thresholds[skill]) {
          failedSkills.push(skill);
        }

        testedWeight += SKILL_WEIGHTS[skill];
        weightedSum += scores[skill] * SKILL_WEIGHTS[skill];
      }
    }

    if (totalQuestions < 10) {
      hasMinimumEvidence = false;
    }

    const overall = testedWeight > 0 ? weightedSum / testedWeight : 0;

    // Conjunctive: ALL skill thresholds + overall threshold + minimum evidence counts
    const passedThresholds =
      failedSkills.length === 0 &&
      overall >= this.thresholds.overall &&
      hasMinimumEvidence;

    return {
      scores,
      counts,
      overall,
      failedSkills,
      hasMinimumEvidence,
      passedThresholds,
    };
  }

  /**
   * Evaluate a lesson test attempt and transition mastery record state
   */
  processTestAttempt(
    currentRecord: MasteryRecord,
    attempt: TestAttemptScore
  ): {
    updatedRecord: MasteryRecord;
    passed: boolean;
    unlockedProvisional: boolean;
    summary: string;
  } {
    const { scores, counts, overall, failedSkills, hasMinimumEvidence, passedThresholds } =
      this.calculateScores(attempt);

    const nowIso = this.clock.nowIso();
    const passed = passedThresholds;

    const newHistoryEntry = {
      attemptAt: nowIso,
      scores: {
        ...scores,
        overall,
      },
      passed,
      failedItemIds: attempt.failedItemIds,
    };

    let newState: MasteryState = currentRecord.state;
    let consecutiveFailures = currentRecord.consecutiveFailures;
    let isProvisional = currentRecord.isProvisional;
    let unlockedProvisional = false;
    let firstMasteredAt = currentRecord.firstMasteredAt;

    if (passed) {
      newState = 'mastered';
      consecutiveFailures = 0;
      if (!firstMasteredAt) {
        firstMasteredAt = nowIso;
      }
    } else {
      consecutiveFailures += 1;
      if (newState === 'new') {
        newState = 'learning';
      }
      if (consecutiveFailures >= 3 && !isProvisional) {
        unlockedProvisional = true;
      }
    }

    const updatedRecord: MasteryRecord = {
      ...currentRecord,
      state: newState,
      scores: {
        ...scores,
        overall,
      },
      evidenceCounts: counts,
      passedThresholds: passed,
      failedSkills,
      consecutiveFailures,
      isProvisional,
      needsRefresh: false,
      firstMasteredAt,
      lastTestedAt: nowIso,
      history: [...currentRecord.history, newHistoryEntry],
    };

    let summary = '';
    if (passed) {
      summary = `Mastered! Overall ${Math.round(overall * 100)}% met all conjunctive criteria.`;
    } else if (!hasMinimumEvidence) {
      summary = `Test incomplete: did not meet minimum question evidence count requirements.`;
    } else {
      summary = `Test not passed. Weak skills: ${failedSkills.join(', ')}. Failure count: ${consecutiveFailures}.`;
    }

    return {
      updatedRecord,
      passed,
      unlockedProvisional,
      summary,
    };
  }

  /**
   * Check for Retention qualification:
   * >= 7 days after Mastered AND >= 80% cards have interval >= 21 days AND recent recall >= 90%
   */
  evaluateRetention(
    record: MasteryRecord,
    cardStats: { totalCards: number; cardsWith21dInterval: number; recentRecallRate: number }
  ): MasteryRecord {
    if (record.state !== 'mastered' || !record.firstMasteredAt) {
      return record;
    }

    const masteredDate = new Date(record.firstMasteredAt).getTime();
    const daysSinceMastery = (this.clock.nowMs() - masteredDate) / (1000 * 60 * 60 * 24);

    const longIntervalRatio =
      cardStats.totalCards > 0 ? cardStats.cardsWith21dInterval / cardStats.totalCards : 0;

    if (
      daysSinceMastery >= 7 &&
      longIntervalRatio >= 0.80 &&
      cardStats.recentRecallRate >= 0.90
    ) {
      return {
        ...record,
        state: 'retained',
        needsRefresh: false,
      };
    }

    return record;
  }

  /**
   * Demote if 30-day retention drops below 80%
   */
  evaluateDemotion(record: MasteryRecord, rolling30DayRetention: number): MasteryRecord {
    if ((record.state === 'mastered' || record.state === 'retained') && rolling30DayRetention < 0.80) {
      return {
        ...record,
        state: 'familiar',
        needsRefresh: true,
      };
    }
    return record;
  }
}
