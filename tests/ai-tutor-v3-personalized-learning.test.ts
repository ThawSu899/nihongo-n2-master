import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  diagnoseLearnerWeaknesses,
  LearnerDiagnosticProfile,
  WeaknessFinding,
} from '../src/domain/ai-learning/weakness-diagnosis';
import {
  buildLearnerDiagnosticDigest,
  getPersonalizationConsent,
  setPersonalizationConsent,
} from '../src/domain/ai-learning/learner-context';
import {
  generatePersonalizedExercises,
} from '../src/domain/ai-learning/exercise-generator';
import {
  recommendSmartLessons,
} from '../src/domain/ai-learning/lesson-recommender';
import {
  buildPersonalizedStudyPlan,
  toggleActivityCompletion,
  toggleActivitySkipped,
} from '../src/domain/ai-learning/study-planner';
import {
  saveLearningReportToNotes,
  loadSavedLearningReports,
  deleteLearningReport,
} from '../src/domain/ai-learning/learning-reports';
import { assembleSystemInstruction } from '../server/gemini-tutor-service';
import { db } from '../src/data/db/dexie-db';
import { SRSCard, MasteryRecord, ReviewLogEntry, LessonPack } from '../src/domain/models/types';

// Mock in-memory localStorage for node test runner
const storageMap = new Map<string, string>();
const memoryLocalStorage = {
  getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (i: number) => Array.from(storageMap.keys())[i] || null,
  get length() {
    return storageMap.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryLocalStorage,
  writable: true,
  configurable: true,
});

describe('AI Japanese Tutor V3 — Personalized Learning Engine', () => {
  beforeEach(async () => {
    storageMap.clear();
    try {
      await db.ai_notes.clear();
    } catch {
      // Ignore in-memory db setup
    }
  });

  // ============================================================================
  // 1. WEAKNESS DIAGNOSIS ENGINE
  // ============================================================================
  describe('Weakness Diagnosis Engine (weakness-diagnosis.ts)', () => {
    it('classifies skill as Insufficient Data when there are fewer than 3 attempts', () => {
      const profile = diagnoseLearnerWeaknesses({
        targetLevel: 'N5',
        masteryRecords: [],
        srsCards: [],
        reviewLogs: [],
        examResults: [],
        assessments: [],
      });

      expect(profile.targetLevel).toBe('N5');
      expect(profile.insufficientDataSkills.length).toBeGreaterThan(0);
      const grammarFinding = profile.insufficientDataSkills.find((f) => f.skill === 'grammar');
      expect(grammarFinding).toBeDefined();
      expect(grammarFinding?.classification).toBe('Insufficient Data');
      expect(grammarFinding?.accuracy).toBeNull();
      expect(grammarFinding?.attemptCount).toBe(0);
    });

    it('identifies Confirmed Weakness when accuracy < 70% with >= 3 attempts or high lapses', () => {
      const mockCards: Partial<SRSCard>[] = [
        {
          id: 'card_g1',
          itemId: 'grammar_wa_ga',
          lessonId: 'n5.l01',
          itemType: 'grammar',
          state: 'learning',
          lapses: 4,
          isLeech: true,
          repetition: 6,
        },
        {
          id: 'card_g2',
          itemId: 'grammar_ni_de',
          lessonId: 'n5.l02',
          itemType: 'grammar',
          state: 'review',
          lapses: 3,
          isLeech: true,
          repetition: 5,
        },
      ];

      const mockLogs: Partial<ReviewLogEntry>[] = [
        { id: 'log1', cardId: 'card_g1', rating: 'again', reviewedAt: '2026-11-20T10:00:00Z' },
        { id: 'log2', cardId: 'card_g1', rating: 'again', reviewedAt: '2026-11-20T11:00:00Z' },
        { id: 'log3', cardId: 'card_g1', rating: 'hard', reviewedAt: '2026-11-20T12:00:00Z' },
        { id: 'log4', cardId: 'card_g2', rating: 'again', reviewedAt: '2026-11-21T10:00:00Z' },
        { id: 'log5', cardId: 'card_g2', rating: 'good', reviewedAt: '2026-11-21T11:00:00Z' },
      ];

      const profile = diagnoseLearnerWeaknesses({
        targetLevel: 'N5',
        srsCards: mockCards as SRSCard[],
        reviewLogs: mockLogs as ReviewLogEntry[],
      });

      const confirmedGrammar = profile.confirmedWeaknesses.find((w) => w.skill === 'grammar');
      expect(confirmedGrammar).toBeDefined();
      expect(confirmedGrammar?.classification).toBe('Confirmed Weakness');
      expect(confirmedGrammar?.relevantItemIds).toContain('grammar_wa_ga');
    });

    it('identifies Strong Skills when accuracy is high (>= 80%) with sufficient practice', () => {
      const mockMastery: Partial<MasteryRecord>[] = [
        {
          lessonId: 'n5.l01',
          state: 'mastered',
          scores: { vocab: 0.95, grammar: 0.90, kanji: 0.90, reading: 0.90, listening: 0.90, overall: 0.91 },
          evidenceCounts: { vocab: 25, grammar: 25, kanji: 20, reading: 10, listening: 10 },
        },
      ];

      const mockLogs: Partial<ReviewLogEntry>[] = Array.from({ length: 15 }, (_, i) => ({
        id: `log_${i}`,
        cardId: 'card_vocab_1',
        rating: 'easy',
        reviewedAt: '2026-11-21T10:00:00Z',
      }));

      const mockCards: Partial<SRSCard>[] = [
        {
          id: 'card_vocab_1',
          itemId: 'vocab_watashi',
          lessonId: 'n5.l01',
          itemType: 'vocab',
          state: 'review',
          lapses: 0,
          isLeech: false,
          repetition: 15,
        },
      ];

      const profile = diagnoseLearnerWeaknesses({
        targetLevel: 'N5',
        masteryRecords: mockMastery as MasteryRecord[],
        srsCards: mockCards as SRSCard[],
        reviewLogs: mockLogs as ReviewLogEntry[],
      });

      expect(profile.strongSkills).toContain('vocabulary');
    });

    it('generates bilingual overall summaries (English & Burmese)', () => {
      const profile = diagnoseLearnerWeaknesses({
        targetLevel: 'N5',
      });

      expect(profile.overallSummary.en).toBeTruthy();
      expect(profile.overallSummary.my).toBeTruthy();
      expect(typeof profile.overallSummary.en).toBe('string');
      expect(typeof profile.overallSummary.my).toBe('string');
    });
  });

  // ============================================================================
  // 2. LEARNER CONTEXT & CONSENT (learner-context.ts)
  // ============================================================================
  describe('Learner Context & Consent (learner-context.ts)', () => {
    it('manages personalization consent via localStorage', () => {
      expect(getPersonalizationConsent()).toBe(true); // default true

      setPersonalizationConsent(false);
      expect(getPersonalizationConsent()).toBe(false);

      setPersonalizationConsent(true);
      expect(getPersonalizationConsent()).toBe(true);
    });

    it('builds a privacy-safe compact diagnostic digest when consent is given', () => {
      setPersonalizationConsent(true);

      const mockProfile: LearnerDiagnosticProfile = {
        targetLevel: 'N5',
        analyzedAt: new Date().toISOString(),
        totalItemsTracked: 45,
        confirmedWeaknesses: [
          {
            skill: 'grammar',
            severity: 'high',
            classification: 'Confirmed Weakness',
            evidence: 'High failure rate on particle markers.',
            relevantLessonIds: ['n5.l01', 'n5.l02'],
            relevantItemIds: ['wa_ga_particle'],
            accuracy: 0.45,
            attemptCount: 12,
            recentTrend: 'declining',
            recommendedAction: 'Practice particle drills.',
          },
        ],
        possibleWeaknesses: [],
        insufficientDataSkills: [],
        strongSkills: ['kanji'],
        overallSummary: {
          en: 'Grammar review needed.',
          my: 'သဒ္ဒါ လေ့ကျင့်ရန် လိုအပ်ပါသည်။',
        },
      };

      const digest = buildLearnerDiagnosticDigest(mockProfile, 'n5.l01', ['n5.l01', 'n5.l02']);
      expect(digest).toBeDefined();
      expect(digest?.targetLevel).toBe('N5');
      expect(digest?.currentLessonId).toBe('n5.l01');
      expect(digest?.confirmedWeaknesses.length).toBe(1);
      expect(digest?.confirmedWeaknesses[0].skill).toBe('grammar');
      expect(digest?.confirmedWeaknesses[0].accuracyPct).toBe(45);
      expect(digest?.strongSkills).toContain('kanji');

      // Verify data minimization: no sensitive tokens, raw logs, or private credentials
      const digestJson = JSON.stringify(digest);
      expect(digestJson).not.toContain('password');
      expect(digestJson).not.toContain('token');
      expect(digestJson).not.toContain('credential');
    });

    it('returns undefined if user personalization consent is disabled', () => {
      setPersonalizationConsent(false);

      const mockProfile: LearnerDiagnosticProfile = {
        targetLevel: 'N5',
        analyzedAt: new Date().toISOString(),
        totalItemsTracked: 10,
        confirmedWeaknesses: [],
        possibleWeaknesses: [],
        insufficientDataSkills: [],
        strongSkills: [],
        overallSummary: { en: 'All good', my: 'ကောင်းမွန်ပါသည်' },
      };

      const digest = buildLearnerDiagnosticDigest(mockProfile);
      expect(digest).toBeUndefined();
    });
  });

  // ============================================================================
  // 3. GEMINI TUTOR SERVICE INTEGRATION (gemini-tutor-service.ts)
  // ============================================================================
  describe('Gemini Tutor Service Integration (assembleSystemInstruction)', () => {
    it('generates system instruction for "learning" mode with learnerContext attached', () => {
      const instruction = assembleSystemInstruction(
        'learning',
        'N5',
        'my',
        undefined,
        {
          targetLevel: 'N5',
          currentLessonId: 'n5.l02',
          confirmedWeaknesses: [
            {
              skill: 'grammar',
              severity: 'high',
              evidence: 'Low accuracy on particles は and が.',
              accuracyPct: 40,
              relevantLessonIds: ['n5.l01'],
              relevantItemIds: ['wa_ga_particle'],
              recommendedAction: 'Focus on topic vs subject marker distinctions.',
            },
          ],
          possibleWeaknesses: [],
          insufficientDataSkills: ['listening'],
          strongSkills: ['vocabulary'],
          recommendedLessonIds: ['n5.l01', 'n5.l02'],
        }
      );

      expect(instruction).toContain('PERSONALIZED LEARNING ADVISOR');
      expect(instruction).toContain('LEARNER DIAGNOSTIC CONTEXT (OFFICIAL LOCAL RECORDS)');
      expect(instruction).toContain('Confirmed Weaknesses');
      expect(instruction).toContain('[GRAMMAR]');
      expect(instruction).toContain('Low accuracy on particles は and が');
      expect(instruction).toContain('Confirmed Strong Skills: vocabulary');
    });

    it('generates standard mode instructions in "learning" mode when no learnerContext is attached', () => {
      const instruction = assembleSystemInstruction('learning', 'N5', 'my', undefined, undefined);

      expect(instruction).toContain('PERSONALIZED LEARNING ADVISOR');
      expect(instruction).not.toContain('LEARNER DIAGNOSTIC CONTEXT (OFFICIAL LOCAL RECORDS)');
    });
  });

  // ============================================================================
  // 4. EXERCISE GENERATOR (exercise-generator.ts)
  // ============================================================================
  describe('Exercise Generator (exercise-generator.ts)', () => {
    it('generates targeted exercises for confirmed weaknesses', () => {
      const weaknesses: WeaknessFinding[] = [
        {
          skill: 'grammar',
          severity: 'high',
          classification: 'Confirmed Weakness',
          evidence: 'Grammar issues detected',
          relevantLessonIds: ['n5.l01'],
          relevantItemIds: ['n5_g_wa'],
          accuracy: 0.5,
          attemptCount: 10,
          recentTrend: 'declining',
          recommendedAction: 'Practice wa vs ga',
        },
      ];

      const exercises = generatePersonalizedExercises(weaknesses, [], 3);

      expect(exercises.length).toBeGreaterThan(0);
      exercises.forEach((ex) => {
        expect(ex.id).toBeTruthy();
        expect(ex.question).toBeTruthy();
        expect(ex.answer).toBeTruthy();
        expect(ex.explanation).toBeTruthy();
        expect(ex.isAIGenerated).toBe(true);
      });
    });

    it('provides fallback review questions if weaknesses are empty', () => {
      const exercises = generatePersonalizedExercises([], [], 2);

      expect(exercises.length).toBeGreaterThanOrEqual(1);
      expect(exercises[0].isAIGenerated).toBe(true);
    });
  });

  // ============================================================================
  // 5. LESSON RECOMMENDER (lesson-recommender.ts)
  // ============================================================================
  describe('Lesson Recommender (lesson-recommender.ts)', () => {
    it('recommends valid published lessons mapped to confirmed weaknesses', () => {
      const weaknesses: WeaknessFinding[] = [
        {
          skill: 'grammar',
          severity: 'high',
          classification: 'Confirmed Weakness',
          evidence: 'Struggling with early particles',
          relevantLessonIds: ['n5.l01', 'n5.l02'],
          relevantItemIds: [],
          accuracy: 0.5,
          attemptCount: 5,
          recentTrend: 'declining',
          recommendedAction: 'Review Lesson 1 & 2',
        },
      ];

      const recommendations = recommendSmartLessons(weaknesses, [], 'n5.l01', 'N5', 3);

      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach((rec) => {
        expect(rec.lessonId).toBeTruthy();
        expect(rec.title).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.reason).toBeTruthy();
        expect(rec.learningObjective).toBeTruthy();
      });
    });
  });

  // ============================================================================
  // 6. PERSONALIZED STUDY PLANNER (study-planner.ts)
  // ============================================================================
  describe('Personalized Study Planner (study-planner.ts)', () => {
    it('constructs a balanced study plan respecting target minutes', () => {
      const plan30 = buildPersonalizedStudyPlan({
        targetMinutes: 30,
        dueSrsCount: 15,
        weaknesses: [
          {
            skill: 'grammar',
            severity: 'high',
            classification: 'Confirmed Weakness',
            evidence: 'Particle mistakes',
            relevantLessonIds: ['n5.l01'],
            relevantItemIds: [],
            accuracy: 0.4,
            attemptCount: 8,
            recentTrend: 'declining',
            recommendedAction: 'Grammar drill',
          },
        ],
        currentLessonId: 'n5.l01',
        targetLevel: 'N5',
      });

      expect(plan30.targetMinutes).toBe(30);
      expect(plan30.activities.length).toBeGreaterThan(0);
      expect(plan30.completedMinutes).toBe(0);

      const hasSrsActivity = plan30.activities.some((a) => a.id.includes('srs'));
      expect(hasSrsActivity).toBe(true);

      const hasWeaknessActivity = plan30.activities.some((a) => a.id.includes('weakness'));
      expect(hasWeaknessActivity).toBe(true);
    });

    it('toggles activity completion and skipped state cleanly', () => {
      const plan = buildPersonalizedStudyPlan({
        targetMinutes: 20,
        dueSrsCount: 5,
        weaknesses: [],
        currentLessonId: 'n5.l01',
        targetLevel: 'N5',
      });

      const firstActivityId = plan.activities[0].id;

      // Mark completed
      const updatedPlan = toggleActivityCompletion(plan, firstActivityId, true);
      expect(updatedPlan.activities[0].completed).toBe(true);
      expect(updatedPlan.completedMinutes).toBeGreaterThan(0);

      // Mark uncompleted
      const undonePlan = toggleActivityCompletion(updatedPlan, firstActivityId, false);
      expect(undonePlan.activities[0].completed).toBe(false);
      expect(undonePlan.completedMinutes).toBe(0);

      // Skip activity
      const skippedPlan = toggleActivitySkipped(undonePlan, firstActivityId, true);
      expect(skippedPlan.activities[0].skipped).toBe(true);
    });
  });

  // ============================================================================
  // 7. AI LEARNING REPORTS PERSISTENCE (learning-reports.ts)
  // ============================================================================
  describe('AI Learning Reports Persistence (learning-reports.ts)', () => {
    it('saves, loads, and deletes AI reports from db.ai_notes safely', async () => {
      const mockProfile: LearnerDiagnosticProfile = {
        targetLevel: 'N5',
        analyzedAt: new Date().toISOString(),
        totalItemsTracked: 30,
        confirmedWeaknesses: [
          {
            skill: 'grammar',
            severity: 'medium',
            classification: 'Confirmed Weakness',
            evidence: 'Needs more wa vs ga distinction practice.',
            relevantLessonIds: ['n5.l01'],
            relevantItemIds: [],
            accuracy: 0.65,
            attemptCount: 10,
            recentTrend: 'stable',
            recommendedAction: 'Practice wa vs ga drills.',
          },
        ],
        possibleWeaknesses: [],
        insufficientDataSkills: [],
        strongSkills: ['vocabulary', 'kanji'],
        overallSummary: {
          en: 'Good overall progress.',
          my: 'တိုးတက်မှု ကောင်းမွန်ပါသည်။',
        },
      };

      // 1. Save report
      const noteId = await saveLearningReportToNotes('weakness_diagnosis', 'N5', mockProfile);
      expect(noteId).toBeTruthy();

      // 2. Load reports
      const reports = await loadSavedLearningReports();
      expect(reports.length).toBeGreaterThan(0);
      const savedReport = reports.find((r) => r.id === noteId);
      expect(savedReport).toBeDefined();
      expect(savedReport?.title).toContain('[AI REPORT]');

      // 3. Delete report
      await deleteLearningReport(noteId);
      const afterDelete = await loadSavedLearningReports();
      expect(afterDelete.find((r) => r.id === noteId)).toBeUndefined();
    });
  });
});
