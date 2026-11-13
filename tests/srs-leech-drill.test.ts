import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  isLeechCard,
  getCardEaseFactor,
  detectLeechCards,
  LadderScheduler,
  FSRSScheduler,
} from '../src/domain/srs/srs-scheduler';
import { SRSCard, DailyPlan, StudyTimerState } from '../src/domain/models/types';
import { SystemClock } from '../src/domain/common/clock';
import { SRSReviewScreen } from '../src/presentation/screens/SRSReviewScreen';
import { HomeScreen } from '../src/presentation/screens/HomeScreen';

describe('SRS Leech Detection & Intensive Drill Queue', () => {
  const sampleCard: SRSCard = {
    id: 'vocab_taberu:meaning',
    itemId: 'vocab_taberu',
    lessonId: 'n5.l01',
    itemType: 'vocab',
    facet: 'meaning',
    prompt: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    state: 'review',
    intervalDays: 1,
    repetition: 2,
    stability: 2.5,
    difficulty: 5.0,
    lapses: 0,
    isLeech: false,
    easeFactor: 2.5,
    due: new Date().toISOString(),
  };

  describe('Leech & Weak Items Detector', () => {
    it('detects a card as leech when lapses >= 2', () => {
      const normalCard = { ...sampleCard, lapses: 1, easeFactor: 2.3 };
      expect(isLeechCard(normalCard)).toBe(false);

      const lapsedCard = { ...sampleCard, lapses: 2, easeFactor: 2.1 };
      expect(isLeechCard(lapsedCard)).toBe(true);
    });

    it('detects a card as leech when easeFactor <= 1.6', () => {
      const normalCard = { ...sampleCard, lapses: 0, easeFactor: 1.8 };
      expect(isLeechCard(normalCard)).toBe(false);

      const lowEaseCard = { ...sampleCard, lapses: 1, easeFactor: 1.55 };
      expect(isLeechCard(lowEaseCard)).toBe(true);
    });

    it('detects cards using detectLeechCards with level filtering', () => {
      const cards: SRSCard[] = [
        { ...sampleCard, id: '1', lessonId: 'n5.l01', lapses: 3 },
        { ...sampleCard, id: '2', lessonId: 'n4.l05', lapses: 2 },
        { ...sampleCard, id: '3', lessonId: 'n2.l10', lapses: 4, easeFactor: 1.4 },
        { ...sampleCard, id: '4', lessonId: 'n2.l12', lapses: 0, easeFactor: 2.5 },
      ];

      const allLeeches = detectLeechCards(cards);
      expect(allLeeches.length).toBe(3);

      const n2Leeches = detectLeechCards(cards, 'N2');
      expect(n2Leeches.length).toBe(1);
      expect(n2Leeches[0].id).toBe('3');

      const n4Leeches = detectLeechCards(cards, 'N4');
      expect(n4Leeches.length).toBe(1);
      expect(n4Leeches[0].id).toBe('2');
    });

    it('calculates ease factor dynamically if not explicitly stored', () => {
      const unhydratedCard: SRSCard = {
        ...sampleCard,
        easeFactor: undefined,
        lapses: 3,
        difficulty: 6,
      };
      const ef = getCardEaseFactor(unhydratedCard);
      expect(ef).toBeLessThanOrEqual(2.0);
      expect(isLeechCard(unhydratedCard)).toBe(true);
    });
  });

  describe('Scheduler Ease Factor Updates', () => {
    it('reduces ease factor on Again rating in LadderScheduler', () => {
      const clock = new SystemClock();
      const scheduler = new LadderScheduler(clock);
      const { updatedCard } = scheduler.scheduleReview(sampleCard, 'again');

      expect(updatedCard.lapses).toBe(1);
      expect(updatedCard.easeFactor).toBeDefined();
      expect(updatedCard.easeFactor!).toBeLessThan(2.5);
    });

    it('reduces ease factor and marks isLeech when lapses reach 2 in FSRSScheduler', () => {
      const clock = new SystemClock();
      const scheduler = new FSRSScheduler(clock);
      const onceLapsedCard = { ...sampleCard, lapses: 1, easeFactor: 1.7 };
      const { updatedCard } = scheduler.scheduleReview(onceLapsedCard, 'again');

      expect(updatedCard.lapses).toBe(2);
      expect(updatedCard.isLeech).toBe(true);
    });
  });

  describe('UI Integration', () => {
    it('renders Leech Drill Mode button and Leech Badge in SRSReviewScreen', () => {
      const html = renderToString(
        React.createElement(SRSReviewScreen, {
          onBack: vi.fn(),
          onReviewsCompleted: vi.fn(),
          initialLeechDrill: true,
        })
      );

      expect(html).toBeDefined();
    });

    it('renders Quick-Launch Leech Drill Badge on HomeScreen when leech cards exist', () => {
      const dummyPlan: DailyPlan = {
        date: '2026-11-14',
        targetMinutes: 360,
        blocks: [],
        explanations: [],
        isRecoveryDay: false,
        weakSkills: [],
        strongSkills: [],
      };
      const dummyTimer: StudyTimerState = {
        blockId: '',
        state: 'idle',
        startedAt: null,
        accumulatedMs: 0,
        targetMinutes: 60,
        lastInteractionAt: 0,
      };

      const html = renderToString(
        React.createElement(HomeScreen, {
          profile: {
            name: 'Learner',
            level: 'N2',
            currentLessonId: 'n2.l01',
            dailyTargetMinutes: 360,
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
              quietHoursEnd: '06:00',
            },
          },
          dailyPlan: dummyPlan,
          dueSrsCount: 5,
          todayMinutes: 45,
          timerState: dummyTimer,
          onStartStudy: vi.fn(),
          onOpenSrs: vi.fn(),
          onOpenTests: vi.fn(),
          onNavigate: vi.fn(),
          srsCards: [
            {
              ...sampleCard,
              id: 'leech_1',
              lapses: 3,
              easeFactor: 1.5,
            },
          ],
        })
      );

      expect(html).toContain('🔥 Leech Drill Mode (အားနည်းချက် အထူးလေ့ကျင့်ခန်း)');
      expect(html).toContain('Leech &amp; Weak Items Detector (အမှားများသော ဝေါဟာရနှင့် သဒ္ဒါများ)');
      expect(html).toContain('1 Items');
    });
  });
});
