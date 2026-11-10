import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  JLPT_EXAM_CONFIGS,
  synthesizeChoices,
  generateMockExam,
  calculateScaledScore,
  quarantineMissedExamQuestions,
  persistExamResult,
  ExamQuestion,
  JLPTLevel,
} from '../src/domain/exam/exam-engine';
import { db } from '../src/data/db/dexie-db';
import { ExamResultModal } from '../src/presentation/components/ExamResultModal';
import { MockExamScreen } from '../src/presentation/screens/MockExamScreen';

describe('Multi-Level (N5–N2) JLPT Timed Mock Exam Simulator Suite', () => {
  beforeEach(async () => {
    await db.exam_results.clear();
    await db.quarantined_cards.clear();
  });

  describe('1. Official JLPT Exam Configuration Constants', () => {
    it('accurately specifies N5 official parameters', () => {
      const n5 = JLPT_EXAM_CONFIGS.N5;
      expect(n5.durationMinutes).toBe(50);
      expect(n5.durationSeconds).toBe(3000);
      expect(n5.totalQuestions).toBe(30);
      expect(n5.passThreshold).toBe(80);
      expect(n5.sectionDistribution.vocabulary).toBe(12);
      expect(n5.sectionDistribution.grammar).toBe(10);
      expect(n5.sectionDistribution.reading).toBe(8);
      expect(
        n5.sectionDistribution.vocabulary +
          n5.sectionDistribution.grammar +
          n5.sectionDistribution.reading
      ).toBe(30);
    });

    it('accurately specifies N4 official parameters', () => {
      const n4 = JLPT_EXAM_CONFIGS.N4;
      expect(n4.durationMinutes).toBe(55);
      expect(n4.durationSeconds).toBe(3300);
      expect(n4.totalQuestions).toBe(35);
      expect(n4.passThreshold).toBe(90);
      expect(n4.sectionDistribution.vocabulary).toBe(14);
      expect(n4.sectionDistribution.grammar).toBe(12);
      expect(n4.sectionDistribution.reading).toBe(9);
      expect(
        n4.sectionDistribution.vocabulary +
          n4.sectionDistribution.grammar +
          n4.sectionDistribution.reading
      ).toBe(35);
    });

    it('accurately specifies N3 official parameters', () => {
      const n3 = JLPT_EXAM_CONFIGS.N3;
      expect(n3.durationMinutes).toBe(65);
      expect(n3.durationSeconds).toBe(3900);
      expect(n3.totalQuestions).toBe(40);
      expect(n3.passThreshold).toBe(95);
      expect(n3.sectionDistribution.vocabulary).toBe(16);
      expect(n3.sectionDistribution.grammar).toBe(14);
      expect(n3.sectionDistribution.reading).toBe(10);
      expect(
        n3.sectionDistribution.vocabulary +
          n3.sectionDistribution.grammar +
          n3.sectionDistribution.reading
      ).toBe(40);
    });

    it('accurately specifies N2 official parameters', () => {
      const n2 = JLPT_EXAM_CONFIGS.N2;
      expect(n2.durationMinutes).toBe(105);
      expect(n2.durationSeconds).toBe(6300);
      expect(n2.totalQuestions).toBe(50);
      expect(n2.passThreshold).toBe(90);
      expect(n2.sectionDistribution.vocabulary).toBe(20);
      expect(n2.sectionDistribution.grammar).toBe(18);
      expect(n2.sectionDistribution.reading).toBe(12);
      expect(
        n2.sectionDistribution.vocabulary +
          n2.sectionDistribution.grammar +
          n2.sectionDistribution.reading
      ).toBe(50);
    });
  });

  describe('2. Choice Synthesizer Engine', () => {
    it('produces exactly 4 unique choices containing the correct answer', () => {
      const correct = '食べる';
      const pool = ['飲む', '寝る', '話す', '歩く', '走る'];
      const choices = synthesizeChoices(correct, pool);

      expect(choices.length).toBe(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices.includes(correct)).toBe(true);
    });

    it('gracefully handles small or empty distractor pools with filler synthesis', () => {
      const correct = '勉強する';
      const choices = synthesizeChoices(correct, []);

      expect(choices.length).toBe(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices.includes(correct)).toBe(true);
    });
  });

  describe('3. Dynamic Mock Exam Generation (N5–N2)', () => {
    it('generates 30 verified questions for N5 with valid 4 choices each', async () => {
      const questions = await generateMockExam('N5');
      expect(questions.length).toBe(30);

      // Verify distribution
      const vocabCount = questions.filter((q) => q.section === 'vocabulary').length;
      const grammarCount = questions.filter((q) => q.section === 'grammar').length;
      const readingCount = questions.filter((q) => q.section === 'reading').length;

      expect(vocabCount).toBe(12);
      expect(grammarCount).toBe(10);
      expect(readingCount).toBe(8);

      for (const q of questions) {
        expect(q.choices.length).toBe(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.includes(q.correctAnswer)).toBe(true);
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(q.level).toBe('N5');
      }
    }, 25000);

    it('generates 35 questions for N4 and 40 questions for N3', async () => {
      const n4Questions = await generateMockExam('N4');
      expect(n4Questions.length).toBe(35);
      expect(n4Questions.filter((q) => q.section === 'vocabulary').length).toBe(14);
      expect(n4Questions.filter((q) => q.section === 'grammar').length).toBe(12);
      expect(n4Questions.filter((q) => q.section === 'reading').length).toBe(9);

      const n3Questions = await generateMockExam('N3');
      expect(n3Questions.length).toBe(40);
      expect(n3Questions.filter((q) => q.section === 'vocabulary').length).toBe(16);
      expect(n3Questions.filter((q) => q.section === 'grammar').length).toBe(14);
      expect(n3Questions.filter((q) => q.section === 'reading').length).toBe(10);
    }, 25000);

    it('generates 50 questions for N2 with strict JLPT distribution', async () => {
      const n2Questions = await generateMockExam('N2');
      expect(n2Questions.length).toBe(50);
      expect(n2Questions.filter((q) => q.section === 'vocabulary').length).toBe(20);
      expect(n2Questions.filter((q) => q.section === 'grammar').length).toBe(18);
      expect(n2Questions.filter((q) => q.section === 'reading').length).toBe(12);

      for (const q of n2Questions) {
        expect(q.choices.length).toBe(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.includes(q.correctAnswer)).toBe(true);
      }
    }, 25000);
  });

  describe('4. Scaled Scoring & Section Breakdown', () => {
    it('scores 180/180 (60 each) when all answers are correct', async () => {
      const questions = await generateMockExam('N5');
      const answers: Record<string, string> = {};
      for (const q of questions) {
        answers[q.id] = q.correctAnswer;
      }

      const report = calculateScaledScore(answers, questions, 'N5');
      expect(report.scaledScore).toBe(180);
      expect(report.sections.vocabulary.scaledScore).toBe(60);
      expect(report.sections.grammar.scaledScore).toBe(60);
      expect(report.sections.reading.scaledScore).toBe(60);
      expect(report.passed).toBe(true);
      expect(report.missedQuestions.length).toBe(0);
      expect(report.correctQuestions).toBe(30);
    });

    it('scores 0/180 when all answers are wrong or unanswered', async () => {
      const questions = await generateMockExam('N5');
      const answers: Record<string, string> = {};
      for (const q of questions) {
        answers[q.id] = 'WRONG_ANSWER';
      }

      const report = calculateScaledScore(answers, questions, 'N5');
      expect(report.scaledScore).toBe(0);
      expect(report.passed).toBe(false);
      expect(report.missedQuestions.length).toBe(30);
      expect(report.correctQuestions).toBe(0);
    });

    it('determines pass/fail based on level pass threshold', async () => {
      const questions = await generateMockExam('N5'); // Pass threshold: 80/180
      // Answer 50% correctly in each section:
      // Vocab: 6/12 -> 30 pts
      // Grammar: 5/10 -> 30 pts
      // Reading: 4/8 -> 30 pts
      // Total: 90 pts >= 80 -> Pass!
      const answers: Record<string, string> = {};
      let vCount = 0;
      let gCount = 0;
      let rCount = 0;

      for (const q of questions) {
        if (q.section === 'vocabulary' && vCount < 6) {
          answers[q.id] = q.correctAnswer;
          vCount++;
        } else if (q.section === 'grammar' && gCount < 5) {
          answers[q.id] = q.correctAnswer;
          gCount++;
        } else if (q.section === 'reading' && rCount < 4) {
          answers[q.id] = q.correctAnswer;
          rCount++;
        } else {
          answers[q.id] = 'INCORRECT';
        }
      }

      const report = calculateScaledScore(answers, questions, 'N5');
      expect(report.scaledScore).toBe(90);
      expect(report.passed).toBe(true);
      expect(report.missedQuestions.length).toBe(15);
    });
  });

  describe('5. FSRS Quarantine Bridge & Dexie Persistence', () => {
    it('quarantines missed questions with MOCK_TEST_REPEATED_MISS into quarantined_cards table', async () => {
      const mockMissedQuestions: ExamQuestion[] = [
        {
          id: 'mock-n5-q01',
          originalId: 'n5.l01.v001',
          level: 'N5',
          section: 'vocabulary',
          sectionTitleJa: '文字・語彙',
          sectionTitleMy: 'စာလုံးနှင့် ဝေါဟာရ',
          prompt: 'おはようございます',
          promptMy: 'မင်္ဂလာနံနက်ခင်းပါ',
          choices: ['おはよう', 'こんにちは', 'こんばんは', 'さようなら'],
          correctAnswer: 'おはよう',
          wordOrPattern: 'おはようございます',
          reading: 'おはようございます',
          meaningBurmese: 'မင်္ဂလာနံနက်ခင်းပါ',
          itemType: 'vocabulary',
        },
        {
          id: 'mock-n5-q02',
          originalId: 'n5.l01.g001',
          level: 'N5',
          section: 'grammar',
          sectionTitleJa: '文法',
          sectionTitleMy: 'သဒ္ဒါ',
          prompt: '私は学生（　★　）。',
          promptMy: 'ကျွန်တော်သည် ကျောင်းသားဖြစ်ပါသည်။',
          choices: ['です', 'ます', 'でした', 'ません'],
          correctAnswer: 'です',
          wordOrPattern: '〜です',
          meaningBurmese: 'ဖြစ်ပါသည်',
          itemType: 'grammar',
        },
      ];

      const count = await quarantineMissedExamQuestions(mockMissedQuestions);
      expect(count).toBe(2);

      const inDb = await db.quarantined_cards.toArray();
      expect(inDb.length).toBe(2);
      expect(inDb.every((c) => c.quarantineReason === 'MOCK_TEST_REPEATED_MISS')).toBe(true);
      expect(inDb.some((c) => c.wordOrPattern === 'おはようございます')).toBe(true);
      expect(inDb.some((c) => c.wordOrPattern === '〜です')).toBe(true);
    });

    it('persists exam score report into db.exam_results table and retrieves it', async () => {
      const questions = await generateMockExam('N5');
      const answers: Record<string, string> = {};
      for (const q of questions) {
        answers[q.id] = q.correctAnswer;
      }
      const report = calculateScaledScore(answers, questions, 'N5');

      await persistExamResult(report);

      const history = await db.getExamResults('N5');
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(report.id);
      expect(history[0].scaledScore).toBe(180);
      expect(history[0].passed).toBe(true);
      expect(history[0].level).toBe('N5');
      expect(history[0].sections.vocabulary.scaledScore).toBe(60);
    });
  });

  describe('6. Component Rendering & UI Smoke Tests', () => {
    it('renders ExamResultModal in passed state', () => {
      const mockReport = {
        id: 'exam_test_01',
        level: 'N5' as JLPTLevel,
        completedAt: new Date().toISOString(),
        durationSeconds: 3000,
        totalQuestions: 30,
        correctQuestions: 25,
        scaledScore: 150,
        passed: true,
        passThreshold: 80,
        sections: {
          vocabulary: { correct: 10, total: 12, scaledScore: 50 },
          grammar: { correct: 8, total: 10, scaledScore: 48 },
          reading: { correct: 7, total: 8, scaledScore: 52 },
        },
        answers: {},
        missedQuestions: [],
        quarantinedCount: 0,
      };

      const html = renderToString(
        React.createElement(ExamResultModal, {
          report: mockReport,
          quarantinedCount: 0,
          onRetake: () => {},
          onExit: () => {},
        })
      );

      expect(html).toContain('စာမေးပွဲ အောင်မြင်ပါသည်');
      expect(html).toContain('150');
      expect(html).toContain('/ 180 မှတ်');
    });

    it('renders MockExamScreen in lobby mode with N5–N2 level selectors', () => {
      const html = renderToString(
        React.createElement(MockExamScreen, {
          initialLevel: 'N5',
          onExit: () => {},
        })
      );

      expect(html).toContain('JLPT ပုံစံတူ စာမေးပွဲ (Mock Exam)');
      expect(html).toContain('စာမေးပွဲ စတင်မည်');
      expect(html).toContain('N5');
      expect(html).toContain('N4');
      expect(html).toContain('N3');
      expect(html).toContain('N2');
    });
  });
});
