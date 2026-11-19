import { describe, it, expect } from 'vitest';
import {
  FSRSScheduler,
  getCardsDueToday,
  calculateTrueRetention,
  getCardEaseFactor,
} from '../src/domain/srs/srs-scheduler';
import { Clock } from '../src/domain/common/clock';
import { SRSCard, ReviewLogEntry } from '../src/domain/models/types';

class MockClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  nowMs(): number {
    return this.current.getTime();
  }
  nowIso(): string {
    return this.current.toISOString();
  }
  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * 24 * 60 * 60 * 1000);
  }
  advanceHours(hours: number): void {
    this.current = new Date(this.current.getTime() + hours * 60 * 60 * 1000);
  }
}

describe('FSRS Algorithm & Learning-Data Integrity Suite (Phase D)', () => {
  const baseDate = new Date('2026-11-19T10:00:00.000Z');

  const createInitialCard = (id = 'card_test_01'): SRSCard => ({
    id,
    itemId: 'item_vocab_01',
    lessonId: 'n5.l01',
    itemType: 'vocab',
    facet: 'meaning',
    prompt: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    meaningMy: 'စားသည်',
    intervalDays: 0,
    repetition: 0,
    easeFactor: 2.5,
    lapses: 0,
    state: 'new',
    isLeech: false,
    due: baseDate.toISOString(),
    stability: 2,
    difficulty: 5,
  });

  it('schedules new card correctly across all 4 rating grades (Again, Hard, Good, Easy)', () => {
    const clock = new MockClock(baseDate);
    const scheduler = new FSRSScheduler(clock, 0.9);

    // Again
    const { updatedCard: cardAgain, logEntry: logAgain } = scheduler.scheduleReview(createInitialCard(), 'again');
    expect(cardAgain.state).toBe('relearning');
    expect(cardAgain.lapses).toBe(1);
    expect(logAgain.rating).toBe('again');
    expect(logAgain.cardId).toBe('card_test_01');

    // Hard
    const { updatedCard: cardHard, logEntry: logHard } = scheduler.scheduleReview(createInitialCard(), 'hard');
    expect(cardHard.state).toBe('review');
    expect(cardHard.lapses).toBe(0);
    expect(logHard.rating).toBe('hard');

    // Good
    const { updatedCard: cardGood, logEntry: logGood } = scheduler.scheduleReview(createInitialCard(), 'good');
    expect(cardGood.state).toBe('review');
    expect(cardGood.intervalDays).toBeGreaterThan(0);
    expect(logGood.rating).toBe('good');

    // Easy
    const { updatedCard: cardEasy, logEntry: logEasy } = scheduler.scheduleReview(createInitialCard(), 'easy');
    expect(cardEasy.state).toBe('review');
    expect(cardEasy.intervalDays).toBeGreaterThan(cardGood.intervalDays);
    expect(logEasy.rating).toBe('easy');
  });

  it('correctly advances stability and intervals across successive successful reviews', () => {
    const clock = new MockClock(baseDate);
    const scheduler = new FSRSScheduler(clock, 0.9);

    let card = createInitialCard();

    // 1st review: Good
    const r1 = scheduler.scheduleReview(card, 'good');
    card = r1.updatedCard;
    expect(card.repetition).toBe(1);
    const firstInterval = card.intervalDays;

    // Advance clock to due date
    clock.advanceDays(firstInterval);

    // 2nd review: Good
    const r2 = scheduler.scheduleReview(card, 'good');
    card = r2.updatedCard;
    expect(card.repetition).toBe(2);
    expect(card.intervalDays).toBeGreaterThanOrEqual(firstInterval);

    // Advance clock to due date
    clock.advanceDays(card.intervalDays);

    // 3rd review: Easy
    const r3 = scheduler.scheduleReview(card, 'easy');
    card = r3.updatedCard;
    expect(card.repetition).toBe(3);
    expect(card.stability).toBeGreaterThan(r2.updatedCard.stability || 0);
  });

  it('evaluates getCardsDueToday accurately respecting the 04:00 local time rollover', () => {
    // 03:00 on Nov 19 -> prior study day cutoff is Nov 19 04:00
    const clock = new MockClock(new Date('2026-11-19T03:00:00'));

    const cards: SRSCard[] = [
      {
        ...createInitialCard('due_today_1'),
        due: new Date('2026-11-18T20:00:00').toISOString(),
      },
      {
        ...createInitialCard('due_future_tomorrow'),
        due: new Date('2026-11-20T12:00:00').toISOString(),
      },
    ];

    const dueCards = getCardsDueToday(cards, clock, 4);
    expect(dueCards.map((c) => c.id)).toContain('due_today_1');
    expect(dueCards.map((c) => c.id)).not.toContain('due_future_tomorrow');
  });

  it('calculates true retention rate correctly across review history logs', () => {
    const logs: ReviewLogEntry[] = [
      { id: '1', cardId: 'c1', rating: 'good', elapsedMs: 1000, reviewedAt: '2026-11-19T00:00:00Z', priorIntervalDays: 1, newIntervalDays: 3 },
      { id: '2', cardId: 'c2', rating: 'easy', elapsedMs: 1000, reviewedAt: '2026-11-19T00:00:00Z', priorIntervalDays: 1, newIntervalDays: 4 },
      { id: '3', cardId: 'c3', rating: 'hard', elapsedMs: 1000, reviewedAt: '2026-11-19T00:00:00Z', priorIntervalDays: 1, newIntervalDays: 2 },
      { id: '4', cardId: 'c4', rating: 'again', elapsedMs: 1000, reviewedAt: '2026-11-19T00:00:00Z', priorIntervalDays: 1, newIntervalDays: 0.1 },
    ];

    const clock = new MockClock(baseDate);
    const retention = calculateTrueRetention(logs, clock);
    expect(retention).toBe(0.75);
  });
});
