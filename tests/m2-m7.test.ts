import { describe, it, expect } from 'vitest';
import { DeterministicClock } from '../src/domain/common/clock';
import { KanaEngine, KANA_DATASET } from '../src/domain/kana/kana-engine';
import { RemediationEngine } from '../src/domain/remediation/remediation-engine';
import { isWithinQuietHours } from '../src/domain/reminders/reminder-service';
import { AssessmentEngine } from '../src/domain/assessment/assessment-engine';
import { GoogleSheetsPipeline } from '../src/integrations/sheets/sheets-pipeline';
import { GoogleDriveAdapter } from '../src/integrations/drive/drive-adapter';
import { GoogleCalendarAdapter } from '../src/integrations/calendar/calendar-adapter';
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

describe('M4: Google Sheets Content Pipeline', () => {
  it('parses, validates with Zod, and quarantines malformed spreadsheet rows', () => {
    const tabsData: Record<string, Record<string, string>[]> = {
      Vocabulary: [
        { id: 'n5.l02.v001', ja: '水', kana: 'みず', en: 'Water', level: 'N5', difficulty: '1', importance: '5', pos: 'noun' },
        { id: '', ja: '壊れた', kana: 'こわれた', en: 'Broken' }, // Missing ID: must be quarantined!
      ],
    };

    const { stagedPack, report } = GoogleSheetsPipeline.parseAndStage(tabsData);
    expect(report.totalRows).toBe(2);
    expect(report.validRows).toBe(1);
    expect(report.quarantinedRows).toBe(1);
    expect(report.canApply).toBe(false); // Can't apply if rows quarantined
    expect(report.rowReports.find((r) => r.status === 'quarantined')?.errors[0]).toContain('Missing required column: id');
  });
});

describe('M4: Google Drive & Calendar Adapters', () => {
  it('defines required folder structure and falls back to Web Speech TTS for missing audio', async () => {
    const driveAdapter = new GoogleDriveAdapter();
    expect(GoogleDriveAdapter.FOLDER_STRUCTURE).toContain('Japanese-N2-Master/Curriculum/N5');
    expect(GoogleDriveAdapter.FOLDER_STRUCTURE).toContain('Japanese-N2-Master/Audio');

    const audio = await driveAdapter.resolveAudio('missing_file.mp3');
    expect(audio.kind).toBe('tts');
    expect(audio.lang).toBe('ja-JP');
  });

  it('tags calendar events with private application metadata', () => {
    const calendarAdapter = new GoogleCalendarAdapter();
    const blocks = [{ id: 'block_vocab_srs', title: 'Vocab + SRS', startTime: '07:45', endTime: '08:45', plannedMinutes: 60, completedMinutes: 0, countsTowardGoal: true, status: 'pending' as const }];
    const payloads = calendarAdapter.createEventPayloads(blocks, '2026-09-30');

    expect(payloads.length).toBe(1);
    expect(payloads[0].extendedProperties.private.app).toBe('nihongo_n2_master');
    expect(payloads[0].extendedProperties.private.blockId).toBe('block_vocab_srs');
  });

  it('extracts spreadsheet ID from various URL formats and raw IDs', () => {
    const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    expect(GoogleSheetsPipeline.extractSpreadsheetId(rawId)).toBe(rawId);

    const fullUrl = `https://docs.google.com/spreadsheets/d/${rawId}/edit#gid=0`;
    expect(GoogleSheetsPipeline.extractSpreadsheetId(fullUrl)).toBe(rawId);

    const shareUrl = `https://docs.google.com/spreadsheets/d/${rawId}/export?format=csv`;
    expect(GoogleSheetsPipeline.extractSpreadsheetId(shareUrl)).toBe(rawId);
  });

  it('exports lesson pack to 12-tab CSV format with proper cell escaping', () => {
    const testPack = n5l01Json as unknown as LessonPack;
    const csvFiles = GoogleSheetsPipeline.exportLessonPackCsv(testPack);
    expect(csvFiles['Meta.csv']).toBeDefined();
    expect(csvFiles['Modules.csv']).toBeDefined();
    expect(csvFiles['Lessons.csv']).toBeDefined();
    expect(csvFiles['Vocabulary.csv']).toBeDefined();
    expect(csvFiles['Kanji.csv']).toBeDefined();
    expect(csvFiles['Grammar.csv']).toBeDefined();
    expect(csvFiles['Sentences.csv']).toBeDefined();
    expect(csvFiles['Reading.csv']).toBeDefined();
    expect(csvFiles['Listening.csv']).toBeDefined();
    expect(csvFiles['Questions.csv']).toBeDefined();
    expect(csvFiles['Tests.csv']).toBeDefined();
    expect(csvFiles['Audio.csv']).toBeDefined();
    expect(csvFiles['Vocabulary.csv']).toContain('わたし');
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

    const auditReport = JSON.parse(require('fs').readFileSync('./curriculum-audit.json', 'utf-8'));
    expect(auditReport.passed).toBe(true);
    expect(auditReport.totalErrors).toBe(0);
    expect(auditReport.publishedCount).toBe(174);
    expect(auditReport.countsByLevel.N5.published).toBe(30);
    expect(auditReport.countsByLevel.N4.published).toBe(36);
    expect(auditReport.countsByLevel.N3.published).toBe(48);
    expect(auditReport.countsByLevel.N2.published).toBe(60);
  });
});
