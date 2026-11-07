import { describe, it, expect } from 'vitest';
import { DeterministicClock } from '../src/domain/common/clock';
import { buildDailyPlan } from '../src/domain/scheduler/daily-scheduler';
import { MasteryEngine, TestAttemptScore } from '../src/domain/mastery/mastery-engine';
import { FSRSScheduler, getCardsDueToday } from '../src/domain/srs/srs-scheduler';
import { checkAnswer, deriveSRSRating } from '../src/domain/assessment/answer-checker';
import { TimerEngine } from '../src/domain/timer/timer-engine';
import { generateIcsCalendar } from '../src/domain/reminders/reminder-service';
import n5l01Json from '../content/packs/n5/n5.l01.json';
import { LessonPack, SRSCard, MasteryRecord } from '../src/domain/models/types';

describe('M1 Vertical Slice Acceptance: 15-Step Learner Journey', () => {
  const clock = new DeterministicClock('2026-09-30T07:30:00.000Z');
  const timer = new TimerEngine(clock);
  const masteryEngine = new MasteryEngine(clock);
  const srsScheduler = new FSRSScheduler(clock);
  const pack = n5l01Json as LessonPack;

  let masteryRecord: MasteryRecord = {
    lessonId: pack.id,
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

  const srsDeck: SRSCard[] = [];

  it('Step 1 & 2: Learner opens app and sees today’s 6-hour plan (360 min counting time)', () => {
    const plan = buildDailyPlan(
      {
        level: 'N5',
        currentLessonId: pack.id,
        targetDailyMinutes: 360,
        srsDueCount: 0,
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

    expect(plan.targetMinutes).toBe(360);
    const countingMinutes = plan.blocks
      .filter((b) => b.countsTowardGoal)
      .reduce((sum, b) => sum + b.plannedMinutes, 0);
    expect(countingMinutes).toBe(360);
    expect(plan.blocks.length).toBe(8); // 6 study + 2 admin
  });

  it('Step 3: Learner starts N5 Day 1 and study timer tracks session', () => {
    let timerState = timer.createInitialState(60, 'block_vocab_srs');
    timerState = timer.start(timerState);
    expect(timerState.state).toBe('running');

    clock.advanceMinutes(20);
    expect(timer.getElapsedSeconds(timerState)).toBe(20 * 60);
  });

  it('Step 4, 5, 6: Learner studies vocabulary (12), kanji (3), and grammar (3)', () => {
    expect(pack.vocabularies.length).toBe(12);
    expect(pack.kanjis.length).toBe(3);
    expect(pack.grammars.length).toBe(3);

    // Each kanji taught in context
    pack.kanjis.forEach((k) => {
      expect(k.exampleVocab.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('Step 7 & 8: Learner completes reading passage and listening dialogue', () => {
    expect(pack.reading.text.length).toBeGreaterThan(20);
    expect(pack.reading.questionIds.length).toBeGreaterThanOrEqual(5);
    expect(pack.listening.turns.length).toBeGreaterThanOrEqual(4);
    expect(pack.listening.questionIds.length).toBeGreaterThanOrEqual(5);
  });

  it('Step 9: Learner completes exercises with answer checking & romaji normalization', () => {
    // Check answer with wanakana conversion
    const res = checkAnswer('watashi', 'わたし');
    expect(res.isCorrect).toBe(true);

    const srsRating = deriveSRSRating({
      isCorrect: true,
      usedHint: false,
      elapsedMs: 2500,
      medianResponseMs: 4000,
      isTypedRecall: true,
    });
    expect(srsRating).toBe('easy');
  });

  it('Step 10 & 11: Learner takes mastery test and receives mastery result', () => {
    // Simulate passing test attempt with all minimum counts met
    const testAttempt: TestAttemptScore = {
      bySkill: {
        vocab: { correct: 10, total: 10 },
        kanji: { correct: 6, total: 6 },
        grammar: { correct: 6, total: 6 },
        reading: { correct: 5, total: 5 },
        listening: { correct: 5, total: 5 },
      },
      failedItemIds: [],
    };

    const outcome = masteryEngine.processTestAttempt(masteryRecord, testAttempt);
    expect(outcome.passed).toBe(true);
    expect(outcome.updatedRecord.state).toBe('mastered');
    masteryRecord = outcome.updatedRecord;
  });

  it('Step 12: Failed and weak items are scheduled into SRS with multi-facet cards', () => {
    // Generate card for vocabulary item
    const card: SRSCard = {
      id: `${pack.vocabularies[0].id}:recall`,
      itemId: pack.vocabularies[0].id,
      lessonId: pack.id,
      itemType: 'vocab',
      facet: 'recall',
      prompt: pack.vocabularies[0].en,
      meaning: pack.vocabularies[0].ja,
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 2,
      difficulty: 5,
      lapses: 0,
      isLeech: false,
      due: clock.nowIso(),
    };

    const review = srsScheduler.scheduleReview(card, 'good');
    expect(review.updatedCard.repetition).toBe(1);
    expect(new Date(review.updatedCard.due).getTime()).toBeGreaterThan(clock.nowMs());
  });

  it('Step 13 & 14: Progress updates and daily schedule continues', () => {
    expect(masteryRecord.state).toBe('mastered');
    expect(masteryRecord.firstMasteredAt).toBeDefined();
  });

  it('Step 15: In-app reminders and honest offline .ics export are generated with alarms', () => {
    const plan = buildDailyPlan(
      {
        level: 'N5',
        currentLessonId: pack.id,
        targetDailyMinutes: 360,
        srsDueCount: 5,
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

    const icsContent = generateIcsCalendar(plan.blocks, '2026-09-30');
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('BEGIN:VALARM');
    expect(icsContent).toContain('TRIGGER:-PT10M');
    expect(icsContent).toContain('SUMMARY:Nihongo N2: Vocabulary + SRS');
  });

  it('Step 16: Automatically resolves next lesson in sequence when previous lesson is mastered', async () => {
    const { ContentLoader } = await import('../src/data/content/content-loader');
    const curriculum = ContentLoader.getCurriculumMap();

    const currentIndex = curriculum.findIndex((item) => item.id === 'n5.l01');
    expect(currentIndex).toBe(0);
    const nextItem = curriculum[currentIndex + 1];
    expect(nextItem).toBeDefined();
    expect(nextItem.id).toBe('n5.l02');
    expect(nextItem.number).toBe(2);
    expect(nextItem.title).toContain('This, That, and Over There');
  });
});
