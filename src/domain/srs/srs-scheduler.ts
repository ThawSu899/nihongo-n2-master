import {
  fsrs,
  Rating,
  createEmptyCard,
  RecordLogItem,
  Card as FSRSCardType,
  Grade,
} from 'ts-fsrs';
import { SRSCard, SRSRating, ReviewLogEntry } from '../models/types';
import { Clock } from '../common/clock';

export interface SRSScheduler {
  scheduleReview(
    card: SRSCard,
    rating: SRSRating
  ): {
    updatedCard: SRSCard;
    logEntry: ReviewLogEntry;
  };
}

export const LADDER_STEPS_DAYS = [0.007, 1, 3, 7, 14, 30, 60]; // 0.007 days ≈ 10 minutes

export function getLadderBandLabel(intervalDays: number): string {
  if (intervalDays < 0.05) return 'Learning (10m)';
  if (intervalDays <= 1.5) return '1 Day';
  if (intervalDays <= 4) return '3 Days';
  if (intervalDays <= 10) return '1 Week';
  if (intervalDays <= 20) return '2 Weeks';
  if (intervalDays <= 45) return '1 Month';
  return 'Mature (2M+)';
}

/**
 * Deterministic Interval Ladder Scheduler (Fallback & Benchmark)
 */
export class LadderScheduler implements SRSScheduler {
  constructor(private clock: Clock) {}

  scheduleReview(
    card: SRSCard,
    rating: SRSRating
  ): {
    updatedCard: SRSCard;
    logEntry: ReviewLogEntry;
  } {
    const now = this.clock.now();
    const nowIso = this.clock.nowIso();
    const priorInterval = card.intervalDays;
    let nextIntervalDays = 1;
    let newLapses = card.lapses;
    let repetition = card.repetition;
    let state: SRSCard['state'] = card.state;

    if (rating === 'again') {
      newLapses += 1;
      repetition = 0;
      nextIntervalDays = 0.007; // 10 minutes
      state = 'relearning';
    } else if (rating === 'hard') {
      nextIntervalDays = Math.max(1, priorInterval * 1.2);
      repetition += 1;
      state = 'review';
    } else if (rating === 'good') {
      // Find current ladder step index
      let stepIdx = LADDER_STEPS_DAYS.findIndex((step) => priorInterval < step);
      if (stepIdx === -1) {
        stepIdx = LADDER_STEPS_DAYS.length - 1;
      }
      nextIntervalDays = LADDER_STEPS_DAYS[Math.min(stepIdx, LADDER_STEPS_DAYS.length - 1)];
      repetition += 1;
      state = 'review';
    } else {
      // 'easy'
      let stepIdx = LADDER_STEPS_DAYS.findIndex((step) => priorInterval < step);
      if (stepIdx === -1) stepIdx = LADDER_STEPS_DAYS.length - 1;
      nextIntervalDays = LADDER_STEPS_DAYS[Math.min(stepIdx + 1, LADDER_STEPS_DAYS.length - 1)] * 1.3;
      repetition += 1;
      state = 'review';
    }

    const nextDueMs = now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000;
    const isLeech = newLapses >= 8;

    const updatedCard: SRSCard = {
      ...card,
      intervalDays: Math.round(nextIntervalDays * 100) / 100,
      repetition,
      lapses: newLapses,
      isLeech,
      state,
      lastReviewed: nowIso,
      due: new Date(nextDueMs).toISOString(),
    };

    const logEntry: ReviewLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: card.id,
      rating,
      elapsedMs: 0,
      reviewedAt: nowIso,
      priorIntervalDays: priorInterval,
      newIntervalDays: updatedCard.intervalDays,
    };

    return { updatedCard, logEntry };
  }
}

/**
 * Modern FSRS Algorithm Scheduler
 */
export class FSRSScheduler implements SRSScheduler {
  private fsrsInstance: ReturnType<typeof fsrs>;

  constructor(
    private clock: Clock,
    requestRetention = 0.90
  ) {
    this.fsrsInstance = fsrs({
      request_retention: Math.min(Math.max(requestRetention, 0.80), 0.95),
      maximum_interval: 365,
    });
  }

  private mapRatingToFSRS(rating: SRSRating): Grade {
    switch (rating) {
      case 'again':
        return Rating.Again;
      case 'hard':
        return Rating.Hard;
      case 'good':
        return Rating.Good;
      case 'easy':
        return Rating.Easy;
    }
  }

  scheduleReview(
    card: SRSCard,
    rating: SRSRating
  ): {
    updatedCard: SRSCard;
    logEntry: ReviewLogEntry;
  } {
    const now = this.clock.now();
    const nowIso = this.clock.nowIso();
    const grade = this.mapRatingToFSRS(rating);

    // Reconstruct FSRS Card object
    const fsrsCard: FSRSCardType = createEmptyCard(now);
    fsrsCard.due = new Date(card.due);
    fsrsCard.stability = card.stability || 2;
    fsrsCard.difficulty = card.difficulty || 5;
    fsrsCard.elapsed_days = Math.max(0, (now.getTime() - new Date(card.lastReviewed || card.due).getTime()) / (1000 * 60 * 60 * 24));
    fsrsCard.scheduled_days = card.intervalDays;
    fsrsCard.reps = card.repetition;
    fsrsCard.lapses = card.lapses;

    const recordLog = this.fsrsInstance.repeat(fsrsCard, now);
    const resultItem: RecordLogItem = recordLog[grade];
    const newFsrsCard = resultItem.card;

    const intervalDays = Math.max(
      0.007,
      Math.round((newFsrsCard.scheduled_days || (newFsrsCard.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) * 100) / 100
    );

    const newLapses = rating === 'again' ? card.lapses + 1 : card.lapses;
    const isLeech = newLapses >= 8;

    const updatedCard: SRSCard = {
      ...card,
      intervalDays,
      repetition: newFsrsCard.reps,
      stability: Math.round(newFsrsCard.stability * 100) / 100,
      difficulty: Math.round(newFsrsCard.difficulty * 100) / 100,
      lapses: newLapses,
      isLeech,
      state: rating === 'again' ? 'relearning' : 'review',
      due: newFsrsCard.due.toISOString(),
      lastReviewed: nowIso,
    };

    const logEntry: ReviewLogEntry = {
      id: `log_${this.clock.nowMs()}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: card.id,
      rating,
      elapsedMs: 0,
      reviewedAt: nowIso,
      priorIntervalDays: card.intervalDays,
      newIntervalDays: intervalDays,
    };

    return { updatedCard, logEntry };
  }
}

/**
 * Filter cards due today respecting the 04:00 local time rollover
 */
export function getCardsDueToday(
  cards: SRSCard[],
  clock: Clock,
  rolloverHour = 4
): SRSCard[] {
  const now = clock.now();
  // Next rollover timestamp
  const nextRollover = new Date(now);
  if (now.getHours() >= rolloverHour) {
    nextRollover.setDate(nextRollover.getDate() + 1);
  }
  nextRollover.setHours(rolloverHour, 0, 0, 0);

  const nextRolloverMs = nextRollover.getTime();

  return cards.filter((card) => {
    const dueMs = new Date(card.due).getTime();
    return dueMs <= nextRolloverMs;
  });
}

/**
 * Sibling burying: prevents facets of the same item from being presented back-to-back
 */
export function burySiblings(cards: SRSCard[]): SRSCard[] {
  if (cards.length <= 1) return [...cards];

  const result: SRSCard[] = [];
  const remaining = [...cards];
  let lastItemId = '';

  while (remaining.length > 0) {
    const nextIdx = remaining.findIndex((c) => c.itemId !== lastItemId);
    if (nextIdx !== -1) {
      const [chosen] = remaining.splice(nextIdx, 1);
      result.push(chosen);
      lastItemId = chosen.itemId;
    } else {
      // Must take remaining
      result.push(...remaining);
      break;
    }
  }

  return result;
}

/**
 * True retention metric: percentage of non-Again ratings on cards with prior interval >= 1 day
 * over rolling 30 days
 */
export function calculateTrueRetention(logs: ReviewLogEntry[], clock: Clock): number {
  const thirtyDaysAgoMs = clock.nowMs() - 30 * 24 * 60 * 60 * 1000;

  const matureReviews = logs.filter(
    (log) =>
      new Date(log.reviewedAt).getTime() >= thirtyDaysAgoMs &&
      log.priorIntervalDays >= 1
  );

  if (matureReviews.length === 0) return 1.0; // default 100% until mature data arrives

  const successful = matureReviews.filter((log) => log.rating !== 'again').length;
  return Math.round((successful / matureReviews.length) * 1000) / 1000;
}
