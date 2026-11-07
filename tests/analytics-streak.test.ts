import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/data/db/dexie-db';
import {
  calculateDailyStudyStreak,
  getLogicalDate,
  getLogicalDayKey,
  formatLogicalDay,
  syncUserStudyStreak,
} from '../src/domain/analytics/streak-calculator';
import {
  get14DayRollingAccuracy,
} from '../src/domain/analytics/rolling-accuracy';
import { buildDailyPlan } from '../src/domain/scheduler/daily-scheduler';
import { SystemClock } from '../src/domain/common/clock';
import { StudySessionRecord } from '../src/data/db/dexie-db';
import { HomeScreen } from '../src/presentation/screens/HomeScreen';

describe('Dynamic Study Streak and 14-Day Rolling Analytics Suite', () => {
  beforeEach(async () => {
    await db.study_sessions.clear();
    await db.assessments.clear();
    await db.study_events.clear();
    await db.profile.clear();
    await db.profile.put({
      id: 'current_user',
      name: 'Test Learner',
      level: 'N5',
      currentLessonId: 'n5.l01',
      dailyTargetMinutes: 360,
      dayRolloverHour: 4,
      showRomaji: true,
      furiganaMode: 'always',
      explanationLang: 'en',
      targetRetention: 0.9,
      dailyNewCap: 30,
      dailyReviewCap: 200,
      studyStreakDays: 0,
      notificationSettings: {
        inApp: true,
        browser: false,
        calendarPopup: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      },
    });
  });

  describe('1. Logical Day Shifting & 04:00 AM Rollover Arithmetic', () => {
    it('shifts late-night sessions (< 04:00 AM) to the preceding calendar date', () => {
      // 2026-10-23 at 02:30 AM should belong to logical day 2026-10-22
      const lateNight = new Date(2026, 9, 23, 2, 30, 0); // Oct 23, 2:30 AM
      const shifted = getLogicalDate(lateNight, 4);
      const key = getLogicalDayKey(lateNight, 4);

      expect(shifted.getDate()).toBe(22);
      expect(key).toBe('2026-10-22');
    });

    it('credits sessions after 04:00 AM to the current calendar date', () => {
      // 2026-10-23 at 04:15 AM should belong to logical day 2026-10-23
      const morning = new Date(2026, 9, 23, 4, 15, 0); // Oct 23, 4:15 AM
      const shifted = getLogicalDate(morning, 4);
      const key = getLogicalDayKey(morning, 4);

      expect(shifted.getDate()).toBe(23);
      expect(key).toBe('2026-10-23');
    });

    it('formats dates consistently in local YYYY-MM-DD format', () => {
      const d = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatLogicalDay(d)).toBe('2026-01-05');
    });
  });

  describe('2. calculateDailyStudyStreak Pure Engine', () => {
    it('returns 0 when sessions list is empty or invalid', () => {
      expect(calculateDailyStudyStreak([])).toBe(0);
      expect(calculateDailyStudyStreak(null as any)).toBe(0);
    });

    it('returns 1 for a single completed session on the current logical day', () => {
      const refDate = new Date(2026, 9, 23, 10, 0, 0); // Oct 23, 10:00 AM
      const sessions: StudySessionRecord[] = [
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 23, 8, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 23, 9, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 10,
        },
      ];

      const streak = calculateDailyStudyStreak(sessions, 4, refDate);
      expect(streak).toBe(1);
    });

    it('preserves active streak when studied yesterday but not yet today', () => {
      const refDate = new Date(2026, 9, 23, 10, 0, 0); // Oct 23, 10:00 AM (no study yet today)
      const sessions: StudySessionRecord[] = [
        // Studied Oct 21
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 21, 14, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 21, 15, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
        // Studied Oct 22 (yesterday)
        {
          id: 'sess_2',
          blockId: 'b2',
          startedAt: new Date(2026, 9, 22, 14, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 22, 15, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
      ];

      // Streak remains active at 2 days (Oct 21, Oct 22) because today is still open
      const streak = calculateDailyStudyStreak(sessions, 4, refDate);
      expect(streak).toBe(2);
    });

    it('increments streak to 3 when user completes a session today', () => {
      const refDate = new Date(2026, 9, 23, 10, 0, 0);
      const sessions: StudySessionRecord[] = [
        // Oct 21
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 21, 14, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 21, 15, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
        // Oct 22
        {
          id: 'sess_2',
          blockId: 'b2',
          startedAt: new Date(2026, 9, 22, 14, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 22, 15, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
        // Oct 23 (today)
        {
          id: 'sess_3',
          blockId: 'b3',
          startedAt: new Date(2026, 9, 23, 9, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 23, 10, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
      ];

      const streak = calculateDailyStudyStreak(sessions, 4, refDate);
      expect(streak).toBe(3);
    });

    it('resets streak to 0 if both today and yesterday were missed', () => {
      const refDate = new Date(2026, 9, 25, 10, 0, 0); // Oct 25
      const sessions: StudySessionRecord[] = [
        // Studied on Oct 22, but missed Oct 23 and Oct 24
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 22, 14, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 22, 15, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
      ];

      const streak = calculateDailyStudyStreak(sessions, 4, refDate);
      expect(streak).toBe(0);
    });

    it('correctly credits a 2:00 AM session towards yesterday without breaking streak', () => {
      // Current time is Oct 23, 03:30 AM (before 4 AM rollover, so logical day is still Oct 22!)
      const refDate = new Date(2026, 9, 23, 3, 30, 0);
      const sessions: StudySessionRecord[] = [
        // Studied Oct 21 at 20:00 (Logical day: Oct 21)
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 21, 20, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 21, 21, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
        // Studied Oct 23 at 02:00 AM (Logical day: Oct 22)
        {
          id: 'sess_2',
          blockId: 'b2',
          startedAt: new Date(2026, 9, 23, 2, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 23, 3, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 5,
        },
      ];

      // Logical today is Oct 22, and user studied on Oct 22 (via late-night session) and Oct 21!
      const streak = calculateDailyStudyStreak(sessions, 4, refDate);
      expect(streak).toBe(2);
    });
  });

  describe('3. Database Synchronization via syncUserStudyStreak', () => {
    it('persists calculated streak into db.profile.studyStreakDays', async () => {
      const refDate = new Date(2026, 9, 23, 12, 0, 0);

      // Add 2 consecutive sessions
      await db.study_sessions.bulkAdd([
        {
          id: 'sess_1',
          blockId: 'b1',
          startedAt: new Date(2026, 9, 22, 10, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 22, 11, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 10,
        },
        {
          id: 'sess_2',
          blockId: 'b2',
          startedAt: new Date(2026, 9, 23, 10, 0, 0).toISOString(),
          completedAt: new Date(2026, 9, 23, 11, 0, 0).toISOString(),
          durationSeconds: 3600,
          exercisesCompleted: 10,
        },
      ]);

      const calculatedStreak = await syncUserStudyStreak(db, 4, refDate);
      expect(calculatedStreak).toBe(2);

      const profile = await db.profile.get('current_user');
      expect(profile?.studyStreakDays).toBe(2);
    });
  });

  describe('4. 14-Day Rolling Accuracy & Days Missed Engine', () => {
    it('aggregates question totals and accuracies from db.assessments in 14-day window', async () => {
      const now = new Date(2026, 9, 23, 12, 0, 0);

      // 1 Assessment taken 2 days ago (within 14 days)
      await db.assessments.add({
        id: 'asmt_1',
        type: 'weekly',
        level: 'N5',
        takenAt: new Date(2026, 9, 21, 10, 0, 0).toISOString(),
        score: 85,
        accuracy: 0.85,
        totalQuestions: 20,
        correctQuestions: 17,
        durationSeconds: 900,
        passed: true,
        weakSkills: [],
        failedItemIds: [],
        bySkill: {
          vocab: { correct: 9, total: 10, accuracy: 0.9 },
          kanji: { correct: 8, total: 10, accuracy: 0.8 },
          grammar: { correct: 0, total: 0, accuracy: 0 },
          reading: { correct: 0, total: 0, accuracy: 0 },
          listening: { correct: 0, total: 0, accuracy: 0 },
        },
      });

      // 1 Assessment taken 25 days ago (older than 14 days, should be ignored)
      await db.assessments.add({
        id: 'asmt_old',
        type: 'weekly',
        level: 'N5',
        takenAt: new Date(2026, 8, 20, 10, 0, 0).toISOString(),
        score: 50,
        accuracy: 0.5,
        totalQuestions: 10,
        correctQuestions: 5,
        durationSeconds: 900,
        passed: false,
        weakSkills: [],
        failedItemIds: [],
        bySkill: {
          vocab: { correct: 5, total: 10, accuracy: 0.5 },
          kanji: { correct: 0, total: 0, accuracy: 0 },
          grammar: { correct: 0, total: 0, accuracy: 0 },
          reading: { correct: 0, total: 0, accuracy: 0 },
          listening: { correct: 0, total: 0, accuracy: 0 },
        },
      });

      const metrics = await get14DayRollingAccuracy(db, 4, now);

      expect(metrics.rollingAccuracy14d.vocab).toEqual({ correct: 9, total: 10 });
      expect(metrics.rollingAccuracy14d.kanji).toEqual({ correct: 8, total: 10 });
      expect(metrics.totalQuestions).toBe(20);
      expect(metrics.totalCorrect).toBe(17);
    });

    it('aggregates exercise attempts from db.study_events', async () => {
      const now = new Date(2026, 9, 23, 12, 0, 0);

      // Add 2 grammar exercise events from lesson study
      await db.study_events.bulkAdd([
        {
          id: 'evt_1',
          timestamp: new Date(2026, 9, 22, 10, 0, 0).toISOString(),
          type: 'exercise_attempted',
          data: {
            skill: 'grammar',
            isCorrect: true,
          },
        },
        {
          id: 'evt_2',
          timestamp: new Date(2026, 9, 22, 10, 5, 0).toISOString(),
          type: 'exercise_attempted',
          data: {
            skill: 'grammar',
            isCorrect: false,
          },
        },
      ]);

      const metrics = await get14DayRollingAccuracy(db, 4, now);
      expect(metrics.rollingAccuracy14d.grammar).toEqual({ correct: 1, total: 2 });
    });

    it('accurately detects recent consecutive days missed before today', async () => {
      const now = new Date(2026, 9, 23, 12, 0, 0); // Friday Oct 23

      // User last studied on Tuesday Oct 20 (Missed Oct 21 and Oct 22 = 2 days away)
      await db.study_sessions.add({
        id: 'sess_1',
        blockId: 'b1',
        startedAt: new Date(2026, 9, 20, 14, 0, 0).toISOString(),
        completedAt: new Date(2026, 9, 20, 15, 0, 0).toISOString(),
        durationSeconds: 3600,
        exercisesCompleted: 5,
      });

      const metrics = await get14DayRollingAccuracy(db, 4, now);
      expect(metrics.recentDaysMissed).toBe(2);
    });

    it('returns 0 recentDaysMissed if user studied yesterday', async () => {
      const now = new Date(2026, 9, 23, 12, 0, 0); // Oct 23

      await db.study_sessions.add({
        id: 'sess_1',
        blockId: 'b1',
        startedAt: new Date(2026, 9, 22, 14, 0, 0).toISOString(), // Oct 22 (yesterday)
        completedAt: new Date(2026, 9, 22, 15, 0, 0).toISOString(),
        durationSeconds: 3600,
        exercisesCompleted: 5,
      });

      const metrics = await get14DayRollingAccuracy(db, 4, now);
      expect(metrics.recentDaysMissed).toBe(0);
    });
  });

  describe('5. Adaptive Daily Scheduler Integration with Live Metrics', () => {
    it('triggers weak-skill time reallocation when rolling accuracy is below threshold', () => {
      const clock = new SystemClock();

      // Given grammar has low rolling accuracy (< 0.85 threshold) with >= 20 questions
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
            vocab: { correct: 30, total: 30 }, // 100% (strong, > 0.90 + 0.05)
            kanji: { correct: 0, total: 0 },
            grammar: { correct: 12, total: 20 }, // 60% (weak, < 0.85)
            reading: { correct: 0, total: 0 },
            listening: { correct: 0, total: 0 },
          },
          skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
        },
        clock
      );

      // Weak skills should detect grammar
      expect(plan.weakSkills).toContain('grammar');
      expect(plan.strongSkills).toContain('vocab');

      // Grammar block should have reallocated extra time (+15m -> 75 min)
      const grammarBlock = plan.blocks.find((b) => b.skill === 'grammar');
      expect(grammarBlock?.plannedMinutes).toBe(75);

      // Strong block should donate time (-15m -> 45 min)
      const vocabBlock = plan.blocks.find((b) => b.skill === 'vocab');
      expect(vocabBlock?.plannedMinutes).toBe(45);
    });

    it('generates welcome back explanation when recentDaysMissed >= 2', () => {
      const clock = new SystemClock();

      const plan = buildDailyPlan(
        {
          level: 'N5',
          currentLessonId: 'n5.l01',
          targetDailyMinutes: 360,
          srsDueCount: 10,
          srsAvgSecondsPerReview: 15,
          srsDailyCap: 200,
          recentDaysMissed: 3,
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

      expect(plan.explanations.some((exp) => exp.includes('After 3 days away'))).toBe(true);
    });
  });

  describe('6. HomeScreen Metrics UI Rendering', () => {
    it('renders the streak flame badge and 30-day true retention metrics in Bento Grid', () => {
      const clock = new SystemClock();
      const plan = buildDailyPlan(
        {
          level: 'N5',
          currentLessonId: 'n5.l01',
          targetDailyMinutes: 360,
          srsDueCount: 12,
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

      const html = renderToString(
        React.createElement(HomeScreen, {
          profile: {
            name: 'Learner',
            level: 'N5',
            currentLessonId: 'n5.l01',
            dailyTargetMinutes: 360,
            dayRolloverHour: 4,
            showRomaji: true,
            furiganaMode: 'always',
            explanationLang: 'en',
            targetRetention: 0.9,
            dailyNewCap: 30,
            dailyReviewCap: 200,
            studyStreakDays: 5,
            notificationSettings: {
              inApp: true,
              browser: false,
              calendarPopup: true,
              quietHoursStart: '22:00',
              quietHoursEnd: '07:00',
            },
          },
          dailyPlan: plan,
          dueSrsCount: 12,
          todayMinutes: 120,
          timerState: {
            blockId: null,
            state: 'idle',
            startedAt: null,
            accumulatedMs: 0,
            targetMinutes: 60,
            lastInteractionAt: 0,
          },
          onStartStudy: () => {},
          onOpenSrs: () => {},
          onOpenTests: () => {},
          onNavigate: () => {},
          focusedLesson: {
            id: 'n5.l01',
            level: 'N5',
            module: 'Greetings & Introductions',
            number: 1,
            title: 'Greetings & Affirmative Sentences',
            grammarTopics: ['X wa Y desu', 'Greeting phrases'],
            targetKanjiCount: 3,
            targetVocabCount: 12,
            status: 'published',
          },
          streakDays: 5,
          trueRetention: 0.95,
        })
      );

      // Verify streak display
      expect(html).toContain('Study Streak');
      expect(html).toContain('5d Streak');
      expect(html).toContain('Days / ရက်ဆက်');
      expect(html).toContain('5 ရက် ဆက်တိုက်လေ့လာထားသည်');

      // Verify true retention display
      expect(html).toContain('True Retention');
      expect(html).toContain('95%');
      expect(html).toContain('FSRS ရေရှည်မှတ်မိနှုန်း');
    });
  });
});
