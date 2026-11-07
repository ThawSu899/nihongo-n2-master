import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/data/db/dexie-db';
import {
  CRAM_CATEGORIES,
  CRAM_QUESTION_BANK,
  CramCategoryKey,
} from '../src/presentation/components/GrammarCramLab';
import { NuanceInterceptor } from '../src/domain/srs/nuance-interceptor';
import { CramDrillRecord } from '../src/domain/models/types';

describe('GrammarCramLab Thematic Engine & Question Bank', () => {
  beforeEach(async () => {
    await db.cram_drills.clear();
  });

  describe('Thematic Category Specifications', () => {
    it('defines all 7 required thematic categories', () => {
      const keys = CRAM_CATEGORIES.map((c) => c.key);
      expect(keys).toContain('conditions');
      expect(keys).toContain('emotions');
      expect(keys).toContain('assertions');
      expect(keys).toContain('tendencies');
      expect(keys).toContain('simultaneous');
      expect(keys).toContain('ghosts');
      expect(keys).toContain('all');
    });

    it('each category includes valid Burmese and English titles and descriptions', () => {
      for (const cat of CRAM_CATEGORIES) {
        expect(cat.titleEn).toBeTruthy();
        expect(cat.titleMy).toBeTruthy();
        expect(cat.descriptionEn).toBeTruthy();
        expect(cat.descriptionMy).toBeTruthy();
        expect(cat.patterns.length).toBeGreaterThan(0);
        expect(cat.badgeClass).toBeTruthy();
      }
    });
  });

  describe('Cram Question Bank Verification', () => {
    it('contains at least 30 authentic N2 grammar questions across categories', () => {
      expect(CRAM_QUESTION_BANK.length).toBeGreaterThanOrEqual(30);
    });

    it('every question has valid Japanese sentence blank structure and matching target', () => {
      for (const q of CRAM_QUESTION_BANK) {
        expect(q.id).toBeTruthy();
        expect(q.grammarPattern).toBeTruthy();
        expect(q.sentenceWithBlank).toContain('____');
        expect(q.prefix).toBeDefined();
        expect(q.suffix).toBeDefined();
        expect(q.target).toBeTruthy();
        expect(q.sentenceWithBlank).toBe(q.prefix + '____' + q.suffix);

        // Choices verification
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(q.target);

        // No duplicate choices
        const uniqueChoices = new Set(q.choices);
        expect(uniqueChoices.size).toBe(4);

        // Bilingual definitions
        expect(q.meaningEn).toBeTruthy();
        expect(q.meaningMy).toBeTruthy();
        expect(q.formation).toBeTruthy();
        expect(q.hint).toBeTruthy();
        expect(q.explanationEn).toBeTruthy();
        expect(q.explanationMy).toBeTruthy();
      }
    });

    it('covers all 15 authentic N2 target patterns', () => {
      const patternsInBank = new Set(CRAM_QUESTION_BANK.map((q) => q.grammarPattern));
      const expectedPatterns = [
        'ものなら',
        'としたら',
        'ないことには',
        'てたまらない',
        'てならない',
        'ないではいられない',
        'に決まっている',
        'にほかならない',
        'にすぎない',
        'がち',
        '気味',
        'きり',
        'ついでに',
        'つつある',
        'つつ',
      ];

      for (const p of expectedPatterns) {
        expect(patternsInBank.has(p)).toBe(true);
      }
    });

    it('verifies cloze check against question bank targets using NuanceInterceptor', () => {
      const monoNaraQ = CRAM_QUESTION_BANK.find((q) => q.grammarPattern === 'ものなら');
      expect(monoNaraQ).toBeDefined();

      // Exact match
      const exactMatch = NuanceInterceptor.inspect('ものなら', monoNaraQ!.target);
      expect(exactMatch.status).toBe('exact_match');

      // Synonym warning interceptor
      const synonymWarning = NuanceInterceptor.inspect('としたら', monoNaraQ!.target);
      expect(synonymWarning.status).toBe('synonym_warning');
      expect(synonymWarning.warningMessageMy).toBeTruthy();

      // Incorrect
      const incorrect = NuanceInterceptor.inspect('がち', monoNaraQ!.target);
      expect(incorrect.status).toBe('incorrect');
    });
  });

  describe('Dexie Cram Drill Telemetry Persistence', () => {
    it('saves and retrieves unranked cram drill telemetry records in Dexie', async () => {
      const record: CramDrillRecord = {
        id: `cram_${Date.now()}`,
        category: 'conditions',
        level: 'N2',
        totalQuestions: 10,
        correctAnswers: 9,
        accuracy: 0.9,
        testedGrammarIds: ['ものなら', 'としたら', 'ないことには'],
        failedGrammarIds: ['ものなら'],
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 60,
      };

      await db.cram_drills.add(record);

      const count = await db.cram_drills.count();
      expect(count).toBe(1);

      const retrieved = await db.cram_drills.get(record.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.category).toBe('conditions');
      expect(retrieved?.accuracy).toBe(0.9);
      expect(retrieved?.correctAnswers).toBe(9);
      expect(retrieved?.testedGrammarIds).toEqual(['ものなら', 'としたら', 'ないことには']);
    });
  });
});
