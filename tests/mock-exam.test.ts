import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildOfficialN2MockExam,
  MockExamEngine,
  OFFICIAL_N2_SECTIONS,
} from '../src/domain/assessment/mock-exam-engine';
import { db } from '../src/data/db/dexie-db';

describe('Official JLPT N2 Mock Exam Simulator Engine', () => {
  beforeEach(async () => {
    await db.assessments.clear();
    await db.study_events.clear();
  });

  it('builds canonical 2-session exam structure with authentic questions and timing', () => {
    const exam = buildOfficialN2MockExam();

    expect(OFFICIAL_N2_SECTIONS.section_1.allocatedMinutes).toBe(105);
    expect(OFFICIAL_N2_SECTIONS.section_2.allocatedMinutes).toBe(50);

    expect(exam.section1Questions.length).toBeGreaterThan(20);
    expect(exam.section2Questions.length).toBeGreaterThanOrEqual(3);

    // Verify Section 1 questions have subskills
    const hasKanji = exam.section1Questions.some((q) => q.subskill === 'kanji');
    const hasVocab = exam.section1Questions.some((q) => q.subskill === 'vocab');
    const hasGrammar = exam.section1Questions.some((q) => q.subskill === 'grammar');
    const hasReading = exam.section1Questions.some((q) => q.subskill === 'reading');

    expect(hasKanji).toBe(true);
    expect(hasVocab).toBe(true);
    expect(hasGrammar).toBe(true);
    expect(hasReading).toBe(true);

    // Verify Section 2 questions are listening
    const allListening = exam.section2Questions.every((q) => q.subskill === 'listening');
    expect(allListening).toBe(true);
  });

  it('correctly calculates passing score when meeting both overall (>=90) and sectional (>=19) thresholds', () => {
    const exam = buildOfficialN2MockExam();

    // Mock all correct answers
    const answers: Record<string, { choice: string | null; timeSpent: number; isFlagged: boolean }> = {};
    [...exam.section1Questions, ...exam.section2Questions].forEach((qMeta) => {
      answers[qMeta.question.id] = {
        choice: qMeta.question.answer,
        timeSpent: 10,
        isFlagged: false,
      };
    });

    const report = MockExamEngine.evaluateMockExam({
      section1Questions: exam.section1Questions,
      section2Questions: exam.section2Questions,
      answers,
      durationSeconds: 3600,
      section1DurationSeconds: 2400,
      section2DurationSeconds: 1200,
    });

    expect(report.totalScaledScore).toBe(180);
    expect(report.languageScaledScore).toBe(60);
    expect(report.readingScaledScore).toBe(60);
    expect(report.listeningScaledScore).toBe(60);
    expect(report.passed).toBe(true);
    expect(report.isSectionalDisqualified).toBe(false);
    expect(report.grade).toBe('A');
    expect(report.missedQuestionIds.length).toBe(0);
  });

  it('enforces sectional disqualification (足切り) when total score >= 90 but a section drops below 19', () => {
    const exam = buildOfficialN2MockExam();

    // Answer all Language & Reading questions correctly, but 0 Listening questions
    const answers: Record<string, { choice: string | null; timeSpent: number; isFlagged: boolean }> = {};
    exam.section1Questions.forEach((qMeta) => {
      answers[qMeta.question.id] = {
        choice: qMeta.question.answer,
        timeSpent: 10,
        isFlagged: false,
      };
    });
    exam.section2Questions.forEach((qMeta) => {
      answers[qMeta.question.id] = {
        choice: 'WRONG_CHOICE',
        timeSpent: 10,
        isFlagged: false,
      };
    });

    const report = MockExamEngine.evaluateMockExam({
      section1Questions: exam.section1Questions,
      section2Questions: exam.section2Questions,
      answers,
      durationSeconds: 3600,
      section1DurationSeconds: 2400,
      section2DurationSeconds: 1200,
    });

    // Language (60) + Reading (60) = 120 >= 90 total points!
    expect(report.totalScaledScore).toBe(120);
    expect(report.listeningScaledScore).toBe(0);
    // Despite 120/180 total, listening is 0 < 19, so must be disqualified!
    expect(report.passed).toBe(false);
    expect(report.isSectionalDisqualified).toBe(true);
    expect(report.disqualificationReason).toContain('基準点（19点以上）を下回ったため');
  });

  it('correctly persists mock exam results into db.assessments with question logs', async () => {
    const exam = buildOfficialN2MockExam();
    const answers: Record<string, { choice: string | null; timeSpent: number; isFlagged: boolean }> = {};
    exam.section1Questions.forEach((qMeta) => {
      answers[qMeta.question.id] = {
        choice: qMeta.question.answer,
        timeSpent: 5,
        isFlagged: false,
      };
    });

    const report = MockExamEngine.evaluateMockExam({
      section1Questions: exam.section1Questions,
      section2Questions: exam.section2Questions,
      answers,
      durationSeconds: 1800,
      section1DurationSeconds: 1200,
      section2DurationSeconds: 600,
    });

    const saved = await MockExamEngine.persistMockExamResult(report);
    expect(saved.id).toContain('asmt_mock_n2');

    const inDb = await db.assessments.get(saved.id);
    expect(inDb).toBeDefined();
    expect(inDb?.bySkill.reading).toBeDefined();
    expect(inDb?.bySkill.listening).toBeDefined();
  });
});
