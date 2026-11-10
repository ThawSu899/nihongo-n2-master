import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateLongestStreak,
  getWeeklyHabitHistory,
} from '../src/domain/analytics/streak-calculator';
import {
  DailyTargetStreakWidget,
  DailyTargetStreakWidgetProps,
} from '../src/presentation/components/DailyTargetStreakWidget';
import { StudySessionRecord } from '../src/data/db/dexie-db';

describe('Daily Target & Study Streak Widget Engine', () => {
  describe('1. Streak & Habit History Calculations', () => {
    it('computes longest streak across historical sessions with gaps', () => {
      const mockSessions: StudySessionRecord[] = [
        // Run 1: 3 days (Nov 1, 2, 3)
        { id: '1', blockId: 'b1', startedAt: '2026-11-01T10:00:00Z', completedAt: '2026-11-01T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '2', blockId: 'b2', startedAt: '2026-11-02T10:00:00Z', completedAt: '2026-11-02T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '3', blockId: 'b3', startedAt: '2026-11-03T10:00:00Z', completedAt: '2026-11-03T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        // Gap: Nov 4 missing
        // Run 2: 5 days (Nov 5, 6, 7, 8, 9)
        { id: '4', blockId: 'b4', startedAt: '2026-11-05T10:00:00Z', completedAt: '2026-11-05T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '5', blockId: 'b5', startedAt: '2026-11-06T10:00:00Z', completedAt: '2026-11-06T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '6', blockId: 'b6', startedAt: '2026-11-07T10:00:00Z', completedAt: '2026-11-07T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '7', blockId: 'b7', startedAt: '2026-11-08T10:00:00Z', completedAt: '2026-11-08T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
        { id: '8', blockId: 'b8', startedAt: '2026-11-09T10:00:00Z', completedAt: '2026-11-09T10:10:00Z', durationSeconds: 600, exercisesCompleted: 10 },
      ];

      const longest = calculateLongestStreak(mockSessions, 4);
      expect(longest).toBe(5);
    });

    it('returns 0 for empty or invalid sessions in calculateLongestStreak', () => {
      expect(calculateLongestStreak([])).toBe(0);
      expect(calculateLongestStreak([{ id: 'x', blockId: 'b', startedAt: '', completedAt: '', durationSeconds: 0, exercisesCompleted: 0 }])).toBe(0);
    });

    it('generates 7-day habit history ending on referenceDate', () => {
      const mockSessions: StudySessionRecord[] = [
        { id: '1', blockId: 'b1', startedAt: '2026-11-09T10:00:00Z', completedAt: '2026-11-09T10:10:00Z', durationSeconds: 600, exercisesCompleted: 15 },
        { id: '2', blockId: 'b2', startedAt: '2026-11-10T10:00:00Z', completedAt: '2026-11-10T10:10:00Z', durationSeconds: 600, exercisesCompleted: 20 },
      ];
      const refDate = new Date('2026-11-10T12:00:00Z');
      const weekly = getWeeklyHabitHistory(mockSessions, 4, refDate);

      expect(weekly.length).toBe(7);
      // Today (Nov 10) must be the last item
      const todayItem = weekly[weekly.length - 1];
      expect(todayItem.isToday).toBe(true);
      expect(todayItem.date).toBe('2026-11-10');
      expect(todayItem.completed).toBe(true);
      expect(todayItem.count).toBe(20);

      // Yesterday (Nov 9) must be completed
      const yesterdayItem = weekly[weekly.length - 2];
      expect(yesterdayItem.completed).toBe(true);
      expect(yesterdayItem.count).toBe(15);
    });
  });

  describe('2. DailyTargetStreakWidget Component Rendering', () => {
    it('renders streak counter, target progress, and 7-day matrix', () => {
      const mockWeekly = [
        { day: 'Wed', date: '2026-11-04', completed: true, isToday: false, count: 10 },
        { day: 'Thu', date: '2026-11-05', completed: true, isToday: false, count: 12 },
        { day: 'Fri', date: '2026-11-06', completed: true, isToday: false, count: 15 },
        { day: 'Sat', date: '2026-11-07', completed: true, isToday: false, count: 20 },
        { day: 'Sun', date: '2026-11-08', completed: true, isToday: false, count: 25 },
        { day: 'Mon', date: '2026-11-09', completed: true, isToday: false, count: 30 },
        { day: 'Tue', date: '2026-11-10', completed: true, isToday: true, count: 18 },
      ];

      const html = renderToString(
        React.createElement(DailyTargetStreakWidget, {
          currentStreak: 7,
          longestStreak: 14,
          todayCompletedCount: 18,
          defaultTarget: 30,
          weeklyHistory: mockWeekly,
          isStreakProtected: false,
        })
      );

      // Header & Title
      expect(html).toContain('Daily Target &amp; Study Streak');
      expect(html).toContain('နေ့စဉ် လေ့လာရေး ပန်းတိုင်နှင့် ရက်ဆက် လေ့လာမှု အလေ့အကျင့်');

      // Streak section
      expect(html).toContain('Study Streak');
      expect(html).toContain('7');
      expect(html).toContain('Days / ရက်ဆက်');
      expect(html).toContain('Active 🔥');
      expect(html).toContain('Longest: <strong class="text-zinc-200">14d</strong>');

      // Today's Target section
      expect(html).toContain('Today&#x27;s Target');
      expect(html).toContain('18');
      expect(html).toContain('/ 30 words');
      expect(html).toContain('60%'); // 18 / 30 = 60%
      expect(html).toContain('ပန်းတိုင်ရောက်ရန် 12 လိုပါသည်');

      // Preset goal pills
      expect(html).toContain('15w');
      expect(html).toContain('30w');
      expect(html).toContain('50w');

      // 7-day habit tracker
      expect(html).toContain('7-Day Habit Tracker');
      expect(html).toContain('7/7 days');
      expect(html).toContain('Mon');
      expect(html).toContain('Tue');
    });

    it('renders freeze/protected badge when streak is protected', () => {
      const html = renderToString(
        React.createElement(DailyTargetStreakWidget, {
          currentStreak: 5,
          longestStreak: 5,
          todayCompletedCount: 10,
          isStreakProtected: true,
        })
      );

      expect(html).toContain('Protected');
    });

    it('displays celebration when today target is 100% achieved', () => {
      const html = renderToString(
        React.createElement(DailyTargetStreakWidget, {
          currentStreak: 4,
          longestStreak: 10,
          todayCompletedCount: 35,
          defaultTarget: 30,
        })
      );

      expect(html).toContain('100%');
      expect(html).toContain('🎉 ယနေ့ ပန်းတိုင် ပြည့်မီပါပြီ!');
    });
  });
});
