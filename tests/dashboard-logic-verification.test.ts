import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTrueRetention,
} from '../src/domain/srs/srs-scheduler';
import { ReviewLogEntry } from '../src/domain/models/types';
import {
  calculateMissionControlReadiness,
} from '../src/domain/analytics/mission-control-calculator';
import {
  buildDailyPlan,
  getStoredWorkHours,
  saveStoredWorkHours,
  WORK_HOURS_STORAGE_KEY,
  WorkHoursConfig,
} from '../src/domain/scheduler/daily-scheduler';
import { DeterministicClock } from '../src/domain/common/clock';

const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe('Dashboard Logic Verification: Priority 1 — FSRS True Retention N/A Baseline', () => {
  const clock = new DeterministicClock('2026-11-25T12:00:00.000Z');

  it('returns null when review logs array is empty', () => {
    const logs: ReviewLogEntry[] = [];
    const retention = calculateTrueRetention(logs, clock);
    expect(retention).toBeNull();
  });

  it('returns null when reviews exist but none are mature (priorIntervalDays < 1)', () => {
    const immatureLogs: ReviewLogEntry[] = [
      {
        id: 'log-1',
        cardId: 'c1',
        rating: 'good',
        elapsedMs: 2000,
        reviewedAt: '2026-11-25T10:00:00.000Z',
        priorIntervalDays: 0,
        newIntervalDays: 0.1,
      },
      {
        id: 'log-2',
        cardId: 'c2',
        rating: 'easy',
        elapsedMs: 1500,
        reviewedAt: '2026-11-25T10:30:00.000Z',
        priorIntervalDays: 0.05,
        newIntervalDays: 0.2,
      },
    ];

    const retention = calculateTrueRetention(immatureLogs, clock);
    expect(retention).toBeNull();
  });

  it('returns null when mature reviews exist but are older than 30 days', () => {
    const expiredMatureLogs: ReviewLogEntry[] = [
      {
        id: 'log-old',
        cardId: 'c1',
        rating: 'good',
        elapsedMs: 2000,
        reviewedAt: '2026-10-10T10:00:00.000Z', // > 30 days before Nov 25
        priorIntervalDays: 5,
        newIntervalDays: 12,
      },
    ];

    const retention = calculateTrueRetention(expiredMatureLogs, clock);
    expect(retention).toBeNull();
  });

  it('returns calculated ratio when mature reviews exist within 30-day window', () => {
    const validLogs: ReviewLogEntry[] = [
      {
        id: 'log-1',
        cardId: 'c1',
        rating: 'good', // remembered
        elapsedMs: 2000,
        reviewedAt: '2026-11-20T10:00:00.000Z',
        priorIntervalDays: 3,
        newIntervalDays: 7,
      },
      {
        id: 'log-2',
        cardId: 'c2',
        rating: 'again', // forgotten
        elapsedMs: 3000,
        reviewedAt: '2026-11-21T10:00:00.000Z',
        priorIntervalDays: 4,
        newIntervalDays: 0.1,
      },
      {
        id: 'log-3',
        cardId: 'c3',
        rating: 'hard', // remembered
        elapsedMs: 4000,
        reviewedAt: '2026-11-22T10:00:00.000Z',
        priorIntervalDays: 1,
        newIntervalDays: 1.5,
      },
      {
        id: 'log-4',
        cardId: 'c4',
        rating: 'good', // immature, ignored
        elapsedMs: 1000,
        reviewedAt: '2026-11-22T11:00:00.000Z',
        priorIntervalDays: 0.2,
        newIntervalDays: 0.5,
      },
    ];

    // 3 mature cards: c1 (good), c2 (again), c3 (hard). Remembered = 2/3 = 0.667
    const retention = calculateTrueRetention(validLogs, clock);
    expect(retention).toBe(0.667);
  });
});

describe('Dashboard Logic Verification: Priority 2 — BOOST Readiness Calculation & Validation', () => {
  it('identifies PASSING status when required velocity <= 1.0 lesson/day', () => {
    // 30 lessons in 60 days = 0.5 lessons/day
    const result = calculateMissionControlReadiness({
      remainingLessons: 30,
      daysRemaining: 60,
    });

    expect(result.status).toBe('PASSING');
    expect(result.isOnTrack).toBe(true);
    expect(result.requiredDailyVelocity).toBe(0.5);
    expect(result.estimatedDailyStudyMinutes).toBe(30); // 0.5 * 60m
    expect(result.readinessStatusEn).toBe('On Track');
    expect(result.explanationEn).toContain('PASSING Pacing');
    expect(result.explanationMy).toContain('အချိန်မီနေပါသည်');
  });

  it('triggers BOOST status when required velocity exceeds 1.0 lesson/day', () => {
    // 90 lessons in 45 days = 2.0 lessons/day (> 1.0 baseline)
    const result = calculateMissionControlReadiness({
      remainingLessons: 90,
      daysRemaining: 45,
    });

    expect(result.status).toBe('BOOST');
    expect(result.isOnTrack).toBe(false);
    expect(result.requiredDailyVelocity).toBe(2.0);
    expect(result.estimatedDailyStudyMinutes).toBe(120); // 2.0 * 60m
    expect(result.readinessStatusEn).toBe('Accelerate');
    expect(result.explanationEn).toContain('BOOST Required');
    expect(result.explanationMy).toContain('အရှိန်မြှင့်ရန်လိုသည်');
  });

  it('triggers BOOST status when exam date is reached or passed with uncompleted lessons', () => {
    const result = calculateMissionControlReadiness({
      remainingLessons: 12,
      daysRemaining: 0,
    });

    expect(result.status).toBe('BOOST');
    expect(result.isOnTrack).toBe(false);
    expect(result.explanationEn).toContain('BOOST Critical: Target exam date reached with 12 uncompleted lessons');
    expect(result.explanationMy).toContain('အရေးပေါ် အရှိန်မြှင့်ရန်လိုသည်');
  });

  it('identifies PASSING status when all lessons are completed', () => {
    const result = calculateMissionControlReadiness({
      remainingLessons: 0,
      daysRemaining: 15,
    });

    expect(result.status).toBe('PASSING');
    expect(result.isOnTrack).toBe(true);
    expect(result.requiredDailyVelocity).toBe(0);
    expect(result.estimatedDailyStudyMinutes).toBe(0);
    expect(result.explanationEn).toContain('All syllabus units completed');
  });
});

describe('Dashboard Logic Verification: Priority 3 — Separation of Required Study Time from 360m Target', () => {
  it('maintains distinct properties for estimated daily study minutes and configured daily target', () => {
    const result = calculateMissionControlReadiness({
      remainingLessons: 45,
      daysRemaining: 90,
      targetMinutesPerLesson: 60,
      configuredDailyTargetMinutes: 360,
    });

    // Required pacing = 45 / 90 * 60m = 30 minutes/day
    expect(result.estimatedDailyStudyMinutes).toBe(30);
    // Configured immersion target remains 360 minutes/day
    expect(result.configuredDailyTargetMinutes).toBe(360);
    // They are distinctly decoupled
    expect(result.estimatedDailyStudyMinutes).not.toBe(result.configuredDailyTargetMinutes);
  });
});

describe('Dashboard Logic Verification: Priority 4 — Study Schedule Configurable Around Work Hours', () => {
  const clock = new DeterministicClock('2026-11-25T07:30:00.000Z');

  beforeEach(() => {
    (globalThis as any).localStorage = createMockLocalStorage();
  });

  it('generates work-adaptive schedule when work hours are enabled', () => {
    const plan = buildDailyPlan(
      {
        level: 'N2',
        currentLessonId: 'n2.l01',
        targetDailyMinutes: 360,
        srsDueCount: 10,
        srsAvgSecondsPerReview: 15,
        srsDailyCap: 200,
        recentDaysMissed: 0,
        rollingAccuracy14d: {
          vocab: { correct: 25, total: 25 },
          kanji: { correct: 25, total: 25 },
          grammar: { correct: 25, total: 25 },
          reading: { correct: 25, total: 25 },
          listening: { correct: 25, total: 25 },
        },
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
        workHours: {
          enabled: true,
          start: '09:00',
          end: '18:00',
        },
      },
      clock
    );

    expect(plan.scheduleMode).toBe('around_work');

    // Protected work hours block must exist
    const workBlock = plan.blocks.find((b) => b.category === 'work');
    expect(workBlock).toBeDefined();
    expect(workBlock?.startTime).toBe('09:00');
    expect(workBlock?.endTime).toBe('18:00');
    expect(workBlock?.countsTowardGoal).toBe(false);

    // Morning study blocks must conclude before workStart (09:00)
    const morningStudyBlocks = plan.blocks.filter(
      (b) => b.category === 'focused_study' && b.endTime <= '09:00'
    );
    expect(morningStudyBlocks.length).toBe(2); // Vocab (60m) + Kanji (60m)

    // Evening study blocks must start at or after workEnd (18:00)
    const eveningStudyBlocks = plan.blocks.filter(
      (b) => b.category === 'focused_study' && b.startTime >= '18:00'
    );
    expect(eveningStudyBlocks.length).toBe(4); // Grammar + Reading + Listening + Mastery Test

    // Total focused minutes must still equal 360 minutes
    const focusedMinutes = plan.blocks
      .filter((b) => b.countsTowardGoal)
      .reduce((acc, b) => acc + b.plannedMinutes, 0);
    expect(focusedMinutes).toBe(360);
  });

  it('saves and retrieves work hours from storage correctly', () => {
    const customConfig: WorkHoursConfig = {
      enabled: true,
      start: '08:30',
      end: '17:30',
    };

    saveStoredWorkHours(customConfig);
    const retrieved = getStoredWorkHours();
    expect(retrieved).toEqual(customConfig);
  });
});

describe('Dashboard Logic Verification: Priority 5 — Separation of 360m Focused Study from Admin & Breaks', () => {
  const clock = new DeterministicClock('2026-11-25T07:30:00.000Z');

  beforeEach(() => {
    (globalThis as any).localStorage = createMockLocalStorage();
  });

  it('standard immersion mode separates 360m focused study from 30m admin setup and breaks', () => {
    const plan = buildDailyPlan(
      {
        level: 'N5',
        currentLessonId: 'n5.l01',
        targetDailyMinutes: 360,
        srsDueCount: 20,
        srsAvgSecondsPerReview: 15,
        srsDailyCap: 200,
        recentDaysMissed: 0,
        rollingAccuracy14d: {
          vocab: { correct: 20, total: 20 },
          kanji: { correct: 20, total: 20 },
          grammar: { correct: 20, total: 20 },
          reading: { correct: 20, total: 20 },
          listening: { correct: 20, total: 20 },
        },
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
      },
      clock
    );

    expect(plan.scheduleMode).toBe('standard');
    expect(plan.targetMinutes).toBe(360);
    expect(plan.focusedMinutes).toBe(360);
    expect(plan.adminMinutes).toBe(30);

    // Exactly 6 blocks count toward the 360m goal
    const goalBlocks = plan.blocks.filter((b) => b.countsTowardGoal);
    expect(goalBlocks.length).toBe(6);
    expect(goalBlocks.every((b) => b.category === 'focused_study')).toBe(true);
    const totalGoalMinutes = goalBlocks.reduce((acc, b) => acc + b.plannedMinutes, 0);
    expect(totalGoalMinutes).toBe(360);

    // Admin blocks (Morning Setup & Strategy 15m + Daily Wrap-up 15m) do NOT count toward 360m goal
    const adminBlocks = plan.blocks.filter((b) => b.category === 'admin');
    expect(adminBlocks.length).toBe(2);
    expect(adminBlocks.every((b) => !b.countsTowardGoal)).toBe(true);
    const totalAdminMinutes = adminBlocks.reduce((acc, b) => acc + b.plannedMinutes, 0);
    expect(totalAdminMinutes).toBe(30);

    // Inter-block breaks and lunch (12:00 - 12:45, 45 min) do NOT count toward 360m goal
    const breakBlocks = plan.blocks.filter((b) => b.category === 'break');
    expect(breakBlocks.every((b) => !b.countsTowardGoal)).toBe(true);

    // Total elapsed minutes (07:30 to 15:45 = 8h 15m = 495 min) covers focused + admin + lunch
    expect(plan.totalElapsedMinutes).toBe(495);
  });
});
