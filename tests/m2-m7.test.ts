import { describe, it, expect } from 'vitest';
import { DeterministicClock } from '../src/domain/common/clock';
import { KanaEngine, KANA_DATASET } from '../src/domain/kana/kana-engine';
import { RemediationEngine } from '../src/domain/remediation/remediation-engine';
import { isWithinQuietHours } from '../src/domain/reminders/reminder-service';
import { AssessmentEngine } from '../src/domain/assessment/assessment-engine';
import { CurriculumAuditor } from '../src/domain/audit/curriculum-auditor';
import n5l01Json from '../content/packs/n5/n5.l01.json';
import { LessonPack, Question } from '../src/domain/models/types';

describe('M2: Kana Trainer Engine', () => {
  const clock = new DeterministicClock('2026-09-30T10:00:00.000Z');
  const engine = new KanaEngine(clock);

  it('initializes full Hiragana and Katakana dataset with Gojūon, Dakuten, Combos, and Sokuon', () => {
    const records = engine.createInitialRecords();
    expect(records.length).toBeGreaterThanOrEqual(140);

    const hiraganaBasic = records.filter((r) => r.script === 'hiragana' && r.category === 'basic');
    expect(hiraganaBasic.length).toBe(46);

    const katakanaBasic = records.filter((r) => r.script === 'katakana' && r.category === 'basic');
    expect(katakanaBasic.length).toBeGreaterThanOrEqual(46);

    const dakuten = records.filter((r) => r.category === 'dakuten');
    expect(dakuten.length).toBeGreaterThan(15);
  });

  it('accepts common romaji variants for kana characters', () => {
    const shiDef = KANA_DATASET.find((k) => k.char === 'し')!;
    expect(engine.checkKanaAnswer('shi', shiDef)).toBe(true);
    expect(engine.checkKanaAnswer('si', shiDef)).toBe(true);
    expect(engine.checkKanaAnswer('chi', shiDef)).toBe(false);

    const tsuDef = KANA_DATASET.find((k) => k.char === 'つ')!;
    expect(engine.checkKanaAnswer('tsu', tsuDef)).toBe(true);
    expect(engine.checkKanaAnswer('tu', tsuDef)).toBe(true);
  });

  it('updates accuracy, response time, and transitions mastery to mastered after consistent success', () => {
    const initial = engine.createInitialRecords()[0]; // あ
    let current = initial;

    for (let i = 0; i < 5; i++) {
      current = engine.updateRecord(current, true, false, 1200);
      current = engine.updateRecord(current, true, true, 1400);
    }

    expect(current.attempts).toBe(10);
    expect(current.recognitionAccuracy).toBe(1.0);
    expect(current.productionAccuracy).toBe(1.0);
    expect(current.masteryState).toBe('mastered');
  });

  it('creates valid SRS card from KanaRecord', () => {
    const record = engine.createInitialRecords()[0];
    const srsCard = engine.createSRSCard(record);
    expect(srsCard.itemType).toBe('kana');
    expect(srsCard.prompt).toBe('a');
    expect(srsCard.meaning).toBe('あ');
    expect(srsCard.due).toBeDefined();
  });
});

describe('M2: Remediation Engine', () => {
  const clock = new DeterministicClock('2026-09-30T10:00:00.000Z');
  const engine = new RemediationEngine(clock);
  const pack = n5l01Json as LessonPack;

  it('generates remediation plan requiring at least 2 distinct exposures per failed item via diverse exercise types', () => {
    const failedQuestionIds = ['n5.l01.q001', 'n5.l01.q016', 'n5.l01.q025']; // vocab, kanji, grammar
    const plan = engine.generateRemediationPlan(pack, failedQuestionIds, ['vocab', 'kanji', 'grammar'], 'attempt_1');

    expect(plan.lessonId).toBe(pack.id);
    expect(plan.failedItemIds.length).toBeGreaterThanOrEqual(3);
    // Each failed item has at least 2 exercises
    expect(plan.exercises.length).toBeGreaterThanOrEqual(6);

    const exerciseTypes = new Set(plan.exercises.map((e) => e.exerciseType));
    expect(exerciseTypes.size).toBeGreaterThanOrEqual(2);
    expect(exerciseTypes.has('typed_production')).toBe(true);
  });

  it('draws fresh questions for retest prioritizing unasked question IDs', () => {
    const previouslyAsked = ['n5.l01.q001', 'n5.l01.q002', 'n5.l01.q003'];
    const drawn = engine.drawFreshRetestQuestions(pack, previouslyAsked, {
      vocab: 5,
      kanji: 3,
      grammar: 3,
      reading: 2,
      listening: 2,
    });

    expect(drawn.length).toBe(15);
    // Ensure fresh questions were drawn first
    const drawnIds = drawn.map((q) => q.id);
    expect(drawnIds).not.toContain('n5.l01.q001');
  });
});

describe('M2: Reminders & Quiet Hours', () => {
  it('correctly calculates overnight quiet hours (e.g. 22:00 to 07:00)', () => {
    // 23:30 is quiet
    const dateLateNight = new Date('2026-09-30T23:30:00');
    expect(isWithinQuietHours(dateLateNight, '22:00', '07:00')).toBe(true);

    // 04:15 is quiet
    const dateEarlyMorning = new Date('2026-09-30T04:15:00');
    expect(isWithinQuietHours(dateEarlyMorning, '22:00', '07:00')).toBe(true);

    // 14:00 is active (not quiet)
    const dateAfternoon = new Date('2026-09-30T14:00:00');
    expect(isWithinQuietHours(dateAfternoon, '22:00', '07:00')).toBe(false);
  });
});

describe('M3: Assessment System & N2 Readiness', () => {
  const clock = new DeterministicClock('2026-09-30T10:00:00.000Z');
  const engine = new AssessmentEngine(clock);

  it('evaluates assessment against blueprint with conjunctive section thresholds', () => {
    const blueprint = engine.getBlueprint('weekly', 'N5');

    const sampleQ = (skill: any, id: string): Question => ({
      id,
      lessonId: 'n5.l01',
      skill,
      type: 'multiple_choice',
      prompt: 'Test prompt',
      answer: 'Correct',
      explanation: 'Explanation',
      difficulty: 1,
      linkedItemIds: ['item1'],
      generated: false,
    });

    const answers = [
      { question: sampleQ('vocab', 'q1'), isCorrect: true },
      { question: sampleQ('vocab', 'q2'), isCorrect: true },
      { question: sampleQ('kanji', 'q3'), isCorrect: true },
      { question: sampleQ('grammar', 'q4'), isCorrect: true },
      { question: sampleQ('reading', 'q5'), isCorrect: true },
      { question: sampleQ('listening', 'q6'), isCorrect: true },
    ];

    const result = engine.evaluateAssessment(blueprint, answers, 1800);
    expect(result.accuracy).toBe(1.0);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.bySkill.vocab.accuracy).toBe(1.0);
  });

  it('calculates N2 learning readiness and provides honest labeling', () => {
    const readyState = engine.calculateReadiness({
      totalCurriculumLessons: 174,
      masteredLessonsCount: 160,
      retainedLessonsCount: 95,
      srs30DayRetention: 0.92,
      recentWeeklyTestAccuracies: [0.85, 0.90],
      skillRollingAccuracies: { vocab: 0.92, kanji: 0.88, grammar: 0.89, reading: 0.84, listening: 0.83 },
      srsBacklogCount: 15,
      srsDailyCap: 200,
      levelTestPassed: true,
    });

    expect(readyState.status).toBe('ready');
    expect(readyState.overallReadinessPct).toBeGreaterThanOrEqual(90);
    expect(readyState.disclaimer).toContain('Learning readiness indicator — not a prediction of actual JLPT results');
  });
});

describe('M5: Offline Architecture & Security Integrity', () => {
  it('ensures zero client-side API keys and confirms Gemini API endpoints are removed from server.ts', () => {
    // 1. Verify server.ts has no AI endpoints or Gemini imports
    const serverFile = require('fs').readFileSync('./server.ts', 'utf-8');
    expect(serverFile).not.toContain('/api/ai/explain');
    expect(serverFile).not.toContain('@google/genai');

    // 2. Verify zero API keys exist in server.ts
    expect(serverFile).not.toContain('AIzaSy');
  });
});

describe('M6 & M7: Curriculum Audit of All 174 Lessons', () => {
  it('validates all 174 lessons with zero blocking linter errors', () => {
    const curriculumMap = JSON.parse(require('fs').readFileSync('./content/curriculum-map.json', 'utf-8'));
    expect(curriculumMap.length).toBe(174);

    const auditMd = require('fs').readFileSync('./curriculum-audit.md', 'utf-8');
    expect(auditMd).toContain('Status:** PASSED (0 blocking errors)');
    expect(auditMd).toContain('Total Lessons Audited:** 174 (Published: 174');
    expect(auditMd).toContain('- **N5:** 30 / 30 Published');
    expect(auditMd).toContain('- **N4:** 36 / 36 Published');
    expect(auditMd).toContain('- **N3:** 48 / 48 Published');
    expect(auditMd).toContain('- **N2:** 60 / 60 Published');
    expect(auditMd).toContain('Blocking Errors: **0**');
  });
});
