import { describe, it, expect } from 'vitest';
import { DeterministicClock } from '../src/domain/common/clock';
import {
  MasteryEngine,
  DEFAULT_THRESHOLDS,
  MIN_EVIDENCE_COUNTS,
  TestAttemptScore,
} from '../src/domain/mastery/mastery-engine';
import { MasteryRecord } from '../src/domain/models/types';
import {
  LadderScheduler,
  FSRSScheduler,
  burySiblings,
  calculateTrueRetention,
  getCardsDueToday,
} from '../src/domain/srs/srs-scheduler';
import { SRSCard, ReviewLogEntry } from '../src/domain/models/types';
import { buildDailyPlan } from '../src/domain/scheduler/daily-scheduler';
import { checkAnswer, normalizeAnswer, deriveSRSRating } from '../src/domain/assessment/answer-checker';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { TimerEngine } from '../src/domain/timer/timer-engine';
import n5l01Json from '../content/packs/n5/n5.l01.json';
import { LessonPack } from '../src/domain/models/types';

describe('Domain: MasteryEngine', () => {
  const clock = new DeterministicClock('2026-09-30T10:00:00.000Z');
  const engine = new MasteryEngine(clock);

  const initialRecord: MasteryRecord = {
    lessonId: 'n5.l01',
    state: 'new',
    scores: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0, overall: 0 },
    evidenceCounts: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0 },
    passedThresholds: false,
    failedSkills: [],
    consecutiveFailures: 0,
    isProvisional: false,
    needsRefresh: false,
    history: [],
  };

  it('rejects mastery if evidence counts are insufficient even with 100% score', () => {
    // Insufficient counts (e.g. only 2 questions per skill)
    const insufficientAttempt: TestAttemptScore = {
      bySkill: {
        vocab: { correct: 2, total: 2 },
        kanji: { correct: 2, total: 2 },
        grammar: { correct: 2, total: 2 },
        reading: { correct: 2, total: 2 },
        listening: { correct: 2, total: 2 },
      },
      failedItemIds: [],
    };

    const res = engine.processTestAttempt(initialRecord, insufficientAttempt);
    expect(res.passed).toBe(false);
    expect(res.updatedRecord.state).toBe('learning');
    expect(res.summary).toContain('did not meet minimum question evidence count');
  });

  it('awards mastery when all 5 skills meet minimum evidence and conjunctive thresholds', () => {
    // Vocab >= 10, Kanji >= 6, Grammar >= 6, Reading >= 5, Listening >= 5
    const passingAttempt: TestAttemptScore = {
      bySkill: {
        vocab: { correct: 10, total: 10 },    // 100% (target 90%)
        kanji: { correct: 6, total: 6 },      // 100% (target 85%)
        grammar: { correct: 6, total: 6 },    // 100% (target 85%)
        reading: { correct: 5, total: 5 },    // 100% (target 80%)
        listening: { correct: 5, total: 5 },  // 100% (target 80%)
      },
      failedItemIds: [],
    };

    const res = engine.processTestAttempt(initialRecord, passingAttempt);
    expect(res.passed).toBe(true);
    expect(res.updatedRecord.state).toBe('mastered');
    expect(res.updatedRecord.firstMasteredAt).toBe('2026-09-30T10:00:00.000Z');
  });

  it('fails if even one skill fails its threshold (conjunctive rule)', () => {
    const oneSkillFailedAttempt: TestAttemptScore = {
      bySkill: {
        vocab: { correct: 10, total: 10 },   // 100%
        kanji: { correct: 6, total: 6 },     // 100%
        grammar: { correct: 6, total: 6 },   // 100%
        reading: { correct: 5, total: 5 },   // 100%
        listening: { correct: 3, total: 5 }, // 60% < 80% threshold!
      },
      failedItemIds: ['n5.l01.q032'],
    };

    const res = engine.processTestAttempt(initialRecord, oneSkillFailedAttempt);
    expect(res.passed).toBe(false);
    expect(res.updatedRecord.state).toBe('learning');
    expect(res.updatedRecord.failedSkills).toContain('listening');
  });

  it('triggers provisional unlock after 3 consecutive failures', () => {
    const failedAttempt: TestAttemptScore = {
      bySkill: {
        vocab: { correct: 5, total: 10 },
        kanji: { correct: 3, total: 6 },
        grammar: { correct: 3, total: 6 },
        reading: { correct: 2, total: 5 },
        listening: { correct: 2, total: 5 },
      },
      failedItemIds: ['v1', 'k1'],
    };

    let rec = initialRecord;
    let res = engine.processTestAttempt(rec, failedAttempt);
    rec = res.updatedRecord;
    expect(res.unlockedProvisional).toBe(false);

    res = engine.processTestAttempt(rec, failedAttempt);
    rec = res.updatedRecord;
    expect(res.unlockedProvisional).toBe(false);

    res = engine.processTestAttempt(rec, failedAttempt);
    rec = res.updatedRecord;
    expect(res.unlockedProvisional).toBe(true);
    expect(rec.consecutiveFailures).toBe(3);
  });
});

describe('Domain: SRS Engine', () => {
  const clock = new DeterministicClock('2026-09-30T10:00:00.000Z');
  const ladderScheduler = new LadderScheduler(clock);
  const fsrsScheduler = new FSRSScheduler(clock);

  const baseCard: SRSCard = {
    id: 'n5.l01.v001:recog',
    itemId: 'n5.l01.v001',
    lessonId: 'n5.l01',
    itemType: 'vocab',
    facet: 'recog',
    prompt: 'おはようございます',
    meaning: 'Good morning',
    state: 'new',
    intervalDays: 0,
    repetition: 0,
    stability: 2,
    difficulty: 5,
    lapses: 0,
    isLeech: false,
    due: '2026-09-30T10:00:00.000Z',
  };

  it('resets interval and increments lapses on Again rating (Ladder)', () => {
    const { updatedCard } = ladderScheduler.scheduleReview(baseCard, 'again');
    expect(updatedCard.lapses).toBe(1);
    expect(updatedCard.state).toBe('relearning');
    expect(updatedCard.intervalDays).toBeLessThan(0.05); // ~10m
  });

  it('flags card as leech when lapses reach 8', () => {
    let card: SRSCard = { ...baseCard, lapses: 7 };
    const { updatedCard } = ladderScheduler.scheduleReview(card, 'again');
    expect(updatedCard.lapses).toBe(8);
    expect(updatedCard.isLeech).toBe(true);
  });

  it('schedules reviews with FSRS scheduler', () => {
    const { updatedCard } = fsrsScheduler.scheduleReview(baseCard, 'good');
    expect(updatedCard.repetition).toBeGreaterThanOrEqual(1);
    expect(new Date(updatedCard.due).getTime()).toBeGreaterThan(clock.nowMs());
  });

  it('buries siblings so same item facets do not appear back-to-back', () => {
    const cards: SRSCard[] = [
      { ...baseCard, id: 'item1:recog', itemId: 'item1' },
      { ...baseCard, id: 'item1:recall', itemId: 'item1' },
      { ...baseCard, id: 'item2:recog', itemId: 'item2' },
      { ...baseCard, id: 'item2:recall', itemId: 'item2' },
    ];

    const buried = burySiblings(cards);
    expect(buried[0].itemId).not.toBe(buried[1].itemId);
  });

  it('calculates true retention over rolling 30 days', () => {
    const logs: ReviewLogEntry[] = [
      { id: '1', cardId: 'c1', rating: 'good', elapsedMs: 3000, reviewedAt: '2026-09-29T10:00:00Z', priorIntervalDays: 3, newIntervalDays: 7 },
      { id: '2', cardId: 'c2', rating: 'good', elapsedMs: 2500, reviewedAt: '2026-09-28T10:00:00Z', priorIntervalDays: 1, newIntervalDays: 3 },
      { id: '3', cardId: 'c3', rating: 'again', elapsedMs: 4000, reviewedAt: '2026-09-27T10:00:00Z', priorIntervalDays: 7, newIntervalDays: 0.01 },
      { id: '4', cardId: 'c4', rating: 'again', elapsedMs: 1500, reviewedAt: '2026-09-27T10:00:00Z', priorIntervalDays: 0.01, newIntervalDays: 0.01 }, // prior < 1d, excluded!
    ];

    // 3 mature cards (priorIntervalDays >= 1): c1 (good), c2 (good), c3 (again). 2/3 = 0.667
    const retention = calculateTrueRetention(logs, clock);
    expect(retention).toBe(0.667);
  });
});

describe('Domain: Adaptive Daily Scheduler', () => {
  const clock = new DeterministicClock('2026-09-30T07:30:00.000Z');

  it('produces 60-minute blocks totaling 360 min learning target on balanced data', () => {
    const plan = buildDailyPlan(
      {
        level: 'N5',
        currentLessonId: 'n5.l01',
        targetDailyMinutes: 360,
        srsDueCount: 15,
        srsAvgSecondsPerReview: 15,
        srsDailyCap: 200,
        recentDaysMissed: 0,
        rollingAccuracy14d: {
          vocab: { correct: 0, total: 0 },
          kanji: { correct: 0, total: 0 },
          grammar: { correct: 0, total: 0 },
          reading: { correct: 0, total: 0 },
          listening: { correct: 0, total: 0 },
        },
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
      },
      clock
    );

    const countingBlocks = plan.blocks.filter((b) => b.countsTowardGoal);
    const totalMinutes = countingBlocks.reduce((sum, b) => sum + b.plannedMinutes, 0);
    expect(totalMinutes).toBe(360);
    expect(plan.explanations[0]).toContain('Balanced Baseline Schedule');
  });

  it('reallocates time to weak skills citing exact accuracy percentages', () => {
    const plan = buildDailyPlan(
      {
        level: 'N5',
        currentLessonId: 'n5.l01',
        targetDailyMinutes: 360,
        srsDueCount: 10,
        srsAvgSecondsPerReview: 15,
        srsDailyCap: 200,
        recentDaysMissed: 0,
        rollingAccuracy14d: {
          vocab: { correct: 24, total: 25 },    // 96% (strong)
          kanji: { correct: 20, total: 20 },    // 100%
          grammar: { correct: 20, total: 20 },  // 100%
          reading: { correct: 20, total: 20 },  // 100%
          listening: { correct: 14, total: 25 }, // 56% (weak < 80%)
        },
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
      },
      clock
    );

    expect(plan.weakSkills).toContain('listening');
    expect(plan.strongSkills).toContain('vocab');

    // Listening boosted from 60 to 75m, vocab decreased from 60 to 45m
    const listeningBlock = plan.blocks.find((b) => b.skill === 'listening');
    const vocabBlock = plan.blocks.find((b) => b.skill === 'vocab');

    expect(listeningBlock?.plannedMinutes).toBe(75);
    expect(vocabBlock?.plannedMinutes).toBe(45);
    expect(plan.explanations[0]).toContain('Listening +15 min');
    expect(plan.explanations[0]).toContain('56%');
  });
});

describe('Domain: Answer Checker', () => {
  it('normalizes full-width and romaji input correctly', () => {
    expect(normalizeAnswer('watashi')).toBe('わたし');
    expect(normalizeAnswer(' わたし 。 ')).toBe('わたし');
    expect(normalizeAnswer('こんにちは！')).toBe('こんにちは');
  });

  it('accepts valid answers, hiragana equivalents, and accepted alternatives', () => {
    const res1 = checkAnswer('watashi', 'わたし');
    expect(res1.isCorrect).toBe(true);

    const res2 = checkAnswer('がくせい', '学生', ['がくせい']);
    expect(res2.isCorrect).toBe(true);

    const res3 = checkAnswer('ちがう', 'わたし');
    expect(res3.isCorrect).toBe(false);
  });

  it('derives SRS ratings accurately based on latency and hints', () => {
    expect(deriveSRSRating({ isCorrect: false, usedHint: false, elapsedMs: 2000, medianResponseMs: 4000, isTypedRecall: true })).toBe('again');
    expect(deriveSRSRating({ isCorrect: true, usedHint: true, elapsedMs: 2000, medianResponseMs: 4000, isTypedRecall: true })).toBe('hard');
    expect(deriveSRSRating({ isCorrect: true, usedHint: false, elapsedMs: 9000, medianResponseMs: 4000, isTypedRecall: true })).toBe('hard');
    expect(deriveSRSRating({ isCorrect: true, usedHint: false, elapsedMs: 1800, medianResponseMs: 4000, isTypedRecall: true })).toBe('easy');
    expect(deriveSRSRating({ isCorrect: true, usedHint: false, elapsedMs: 3500, medianResponseMs: 4000, isTypedRecall: false })).toBe('good');
  });
});

describe('Domain: Content Linter on N5 Day 1 Pack', () => {
  it('passes N5 Day 1 pack with zero errors', () => {
    const report = lintLessonPack(n5l01Json as LessonPack);
    if (!report.passed) {
      console.error('Linter errors found:', report.errors);
    }
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
  });
});

describe('Domain: Study Timer Engine', () => {
  const clock = new DeterministicClock('2026-09-30T07:45:00.000Z');
  const timer = new TimerEngine(clock);

  it('starts, pauses, and tracks elapsed time accurately across clock advances', () => {
    let state = timer.createInitialState(60, 'block_vocab_srs');
    expect(state.state).toBe('idle');

    state = timer.start(state);
    expect(state.state).toBe('running');

    clock.advanceMinutes(15);
    expect(timer.getElapsedSeconds(state)).toBe(15 * 60);

    state = timer.pause(state);
    expect(state.state).toBe('paused');
    expect(state.accumulatedMs).toBe(15 * 60 * 1000);

    // Advancing clock while paused must not increase elapsed time
    clock.advanceMinutes(10);
    expect(timer.getElapsedSeconds(state)).toBe(15 * 60);

    state = timer.resume(state);
    clock.advanceMinutes(5);
    expect(timer.getElapsedSeconds(state)).toBe(20 * 60);

    const { updatedState, totalElapsedSeconds } = timer.finish(state);
    expect(updatedState.state).toBe('completed');
    expect(totalElapsedSeconds).toBe(20 * 60);
  });

  it('detects idle timeouts and auto-pauses', () => {
    let state = timer.createInitialState(60, 'b1');
    state = timer.start(state);

    clock.advanceMinutes(3); // 3 minutes with no interaction (threshold is 2m)
    const { isIdle, newState } = timer.checkIdleTimeout(state, 2);
    expect(isIdle).toBe(true);
    expect(newState.state).toBe('paused');
  });
});
