import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestsScreen } from '../src/presentation/screens/TestsScreen';
import { AssessmentEngine } from '../src/domain/assessment/assessment-engine';
import { SystemClock } from '../src/domain/common/clock';
import { UserProfile } from '../src/domain/models/types';

const mockProfile: UserProfile = {
  name: 'Akira',
  level: 'N2',
  currentLessonId: 'n2.l01',
  dailyTargetMinutes: 120,
  dayRolloverHour: 4,
  showRomaji: false,
  furiganaMode: 'always',
  explanationLang: 'en',
  targetRetention: 0.9,
  dailyNewCap: 30,
  dailyReviewCap: 200,
  studyStreakDays: 3,
  notificationSettings: {
    inApp: true,
    browser: false,
    calendarPopup: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
};

describe('Assessment Center Readiness & UX Enhancements', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. SRS 30-Day True Retention 0-Review Fix', () => {
    it('evaluates 0 reviews as hasSrsData=false and srs30DayRetentionPct=0 in AssessmentEngine', () => {
      const clock = new SystemClock();
      const engine = new AssessmentEngine(clock);

      const readiness = engine.calculateReadiness({
        totalCurriculumLessons: 174,
        masteredLessonsCount: 160,
        retainedLessonsCount: 90,
        srs30DayRetention: 0,
        recentWeeklyTestAccuracies: [0.85],
        skillRollingAccuracies: { vocab: 0.9, kanji: 0.9, grammar: 0.9, reading: 0.85, listening: 0.85 },
        srsBacklogCount: 0,
        srsDailyCap: 200,
        levelTestPassed: true,
        hasSrsData: false,
      });

      expect(readiness.hasSrsData).toBe(false);
      expect(readiness.srs30DayRetentionPct).toBe(0);
      // Even if other gates are >= benchmark, status cannot be ready without SRS data
      expect(readiness.status).not.toBe('ready');
    });

    it('renders "No data yet (ဒေတာမရှိသေးပါ)" and marks gate as pending for 0-review learners', () => {
      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: mockProfile,
          onStartLessonTest: vi.fn(),
        })
      );

      // Gate 3 title & text
      expect(html).toContain('SRS 30-Day True Retention (ရက် ၃၀ SRS မှတ်ဉာဏ်ထိန်းသိမ်းမှု)');
      expect(html).toContain('No data yet (ဒေတာမရှိသေးပါ)');
      expect(html).not.toContain('100% / 85%');
    });
  });

  describe('2. Explicitly Itemizing All 5 Prerequisite Readiness Gates', () => {
    it('renders all 5 prerequisite gates with bilingual labels, target thresholds, and status badges', () => {
      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: mockProfile,
          onStartLessonTest: vi.fn(),
        })
      );

      // Gate 1: Lesson Curriculum Mastery
      expect(html).toContain('Lesson Curriculum Mastery (သင်ရိုးပြီးမြောက်မှု)');
      expect(html).toContain('90%');

      // Gate 2: Lesson Retention Rate
      expect(html).toContain('Lesson Retention Rate (သင်ခန်းစာ မှတ်မိမှုနှုန်း)');
      expect(html).toContain('50%');

      // Gate 3: SRS 30-Day True Retention
      expect(html).toContain('SRS 30-Day True Retention (ရက် ၃၀ SRS မှတ်ဉာဏ်ထိန်းသိမ်းမှု)');
      expect(html).toContain('85%');

      // Gate 4: Weekly Tests Avg Score
      expect(html).toContain('Weekly Tests Avg Score (အပတ်စဉ် စာမေးပွဲ ပျမ်းမျှရမှတ်)');
      expect(html).toContain('75%');

      // Gate 5: Level Readiness Test
      expect(html).toContain('Level Readiness Test');
      expect(html).toContain('အဆင့်စစ် စာမေးပွဲ အောင်မြင်မှု');
      expect(html).toContain('Pass');

      // Badge states
      expect(html).toContain('Pending (လိုအပ်နေသေးသည်)');
    });
  });

  describe('3. Recommended Next Step Action Panel', () => {
    it('renders a prominent Recommended Next Step banner identifying the highest priority action', () => {
      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: mockProfile,
          onStartLessonTest: vi.fn(),
        })
      );

      expect(html).toContain('Recommended Next Step · အကြံပြုထားသော နောက်တစ်ဆင့်');
      expect(html).toContain('Gate 1: Lesson Curriculum Mastery (သင်ရိုးပြီးမြောက်မှု)');
      expect(html).toContain('Start Lesson 1 Assessment');
    });

    it('correctly assesses all 5 gates passed in AssessmentEngine', () => {
      const clock = new SystemClock();
      const engine = new AssessmentEngine(clock);

      const allPassed = engine.calculateReadiness({
        totalCurriculumLessons: 174,
        masteredLessonsCount: 165, // > 90%
        retainedLessonsCount: 100, // > 50%
        srs30DayRetention: 0.92,   // > 85%
        recentWeeklyTestAccuracies: [0.88, 0.90], // > 75%
        skillRollingAccuracies: { vocab: 0.9, kanji: 0.9, grammar: 0.9, reading: 0.85, listening: 0.85 },
        srsBacklogCount: 10,
        srsDailyCap: 200,
        levelTestPassed: true,
        hasSrsData: true,
      });

      expect(allPassed.status).toBe('ready');
      expect(allPassed.overallReadinessPct).toBeGreaterThanOrEqual(90);
    });
  });

  describe('4. Brand-New Learner "Start Here" Onboarding Guide', () => {
    it('renders 3-step Start Here roadmap above readiness gates without unmounting assessment cards', () => {
      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: mockProfile,
          onStartLessonTest: vi.fn(),
        })
      );

      // Onboarding header
      expect(html).toContain('Start Here · စတင်လေ့လာရန် လမ်းညွှန်');
      expect(html).toContain('New Learner Roadmap');

      // 3 Steps
      expect(html).toContain('Step 1: First Lesson (ပထမဆုံး သင်ခန်းစာ)');
      expect(html).toContain('Step 2: First SRS Review (ပထမဆုံး SRS ကတ်လေ့ကျင့်မှု)');
      expect(html).toContain('Step 3: First Assessment (ပထမဆုံး အကဲဖြတ် စာမေးပွဲ)');

      // Critical non-destructive guardrail: existing cards remain rendered
      expect(html).toContain('Current Lesson Test');
      expect(html).toContain('Weekly Review Test');
      expect(html).toContain('Conjunctive Readiness Engine');
    });
  });

  describe('5. High-Contrast Light/Dark Mode Classes', () => {
    it('includes dark mode background and typography utility classes', () => {
      const html = renderToString(
        React.createElement(TestsScreen, {
          profile: mockProfile,
          onStartLessonTest: vi.fn(),
        })
      );

      expect(html).toContain('dark:bg-zinc-900');
      expect(html).toContain('dark:text-zinc-100');
      expect(html).toContain('dark:border-zinc-800');
    });
  });
});
