import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  LessonPack,
  LessonPackSchema,
  CurriculumMapItem,
} from '../src/domain/models/types';
import { lintLessonPack, isZawgyi } from '../src/domain/linter/content-linter';
import {
  N3_BATCH1_PACKS,
  N3_BATCH2_PACKS,
  ALL_N3_PACKS,
  getN3Batch2LessonPack,
  getN3LessonPack,
} from '../src/domain/curriculum/content-loader';
import curriculumMapJson from '../content/curriculum-map.json';

describe('JLPT N3 Curriculum Batch 2 (n3.l31 - n3.l48) & 174/174 Milestone', () => {
  const mapItems = curriculumMapJson as CurriculumMapItem[];
  const batch2Ids = Array.from({ length: 18 }, (_, i) => `n3.l${(i + 31).toString().padStart(2, '0')}`);

  it('verifies 174/174 (100%) published milestone with 0 planned lessons', () => {
    expect(mapItems).toHaveLength(174);
    const publishedCount = mapItems.filter((m) => m.status === 'published').length;
    const plannedCount = mapItems.filter((m) => m.status === 'planned').length;

    expect(publishedCount).toBe(174);
    expect(plannedCount).toBe(0);

    const n5 = mapItems.filter((m) => m.level === 'N5');
    const n4 = mapItems.filter((m) => m.level === 'N4');
    const n3 = mapItems.filter((m) => m.level === 'N3');
    const n2 = mapItems.filter((m) => m.level === 'N2');

    expect(n5).toHaveLength(30);
    expect(n5.every((m) => m.status === 'published')).toBe(true);
    expect(n4).toHaveLength(36);
    expect(n4.every((m) => m.status === 'published')).toBe(true);
    expect(n3).toHaveLength(48);
    expect(n3.every((m) => m.status === 'published')).toBe(true);
    expect(n2).toHaveLength(60);
    expect(n2.every((m) => m.status === 'published')).toBe(true);
  });

  it('confirms all 18 N3 Batch 2 JSON packs exist and parse strictly against LessonPackSchema', () => {
    for (const packId of batch2Ids) {
      const filePath = path.resolve(`./content/packs/n3/${packId}.json`);
      expect(fs.existsSync(filePath), `JSON file must exist: ${filePath}`).toBe(true);

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const parsed = LessonPackSchema.safeParse(raw);
      expect(parsed.success, `Schema validation failed for ${packId}`).toBe(true);
    }
  });

  it('validates 10-stage schema & content structure for each Batch 2 pack', () => {
    let totalQuestions = 0;

    for (const packId of batch2Ids) {
      const filePath = path.resolve(`./content/packs/n3/${packId}.json`);
      const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LessonPack;

      // Basic metadata
      expect(pack.id).toBe(packId);
      expect(pack.level).toBe('N3');
      expect(pack.status).toBe('published');
      expect(pack.title).toBeDefined();
      expect(pack.description.length).toBeGreaterThan(10);

      // Stage 2: 12 Vocabularies
      expect(pack.vocabularies).toHaveLength(12);
      for (const v of pack.vocabularies) {
        expect(v.ja).toBeTruthy();
        expect(v.kana).toBeTruthy();
        expect(v.my || v.meaningMy).toBeTruthy();
      }

      // Stage 3: 3 Kanjis with >= 2 example words
      expect(pack.kanjis).toHaveLength(3);
      for (const k of pack.kanjis) {
        expect(k.char).toBeTruthy();
        expect(k.exampleVocab.length).toBeGreaterThanOrEqual(2);
      }

      // Stage 4: 3 Grammars
      expect(pack.grammars).toHaveLength(3);
      for (const g of pack.grammars) {
        expect(g.pattern).toBeTruthy();
        expect(g.formation).toBeTruthy();
        expect(g.meaning || g.meaningMy).toBeTruthy();
      }

      // Stage 5 & 6: Reading passage and Listening dialogue
      expect(pack.reading.text.length).toBeGreaterThan(100);
      expect(pack.reading.glossary.length).toBeGreaterThanOrEqual(2);
      for (const item of pack.reading.glossary) {
        expect(item.term).toBeTruthy();
        expect(item.meaning || item.meaningMy).toBeTruthy();
      }

      expect(pack.listening.speakers).toHaveLength(2);
      expect(pack.listening.turns.length).toBeGreaterThanOrEqual(4);

      // Stages 7-10: Exactly 30 questions
      expect(pack.questions).toHaveLength(30);
      totalQuestions += pack.questions.length;

      // Question choices invariants
      for (const q of pack.questions) {
        expect(q.choices).toBeDefined();
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        expect(q.explanation).toBeTruthy();
      }

      // Content Linter check
      const lint = lintLessonPack(pack);
      expect(lint.errors, `Lint errors in ${packId}`).toEqual([]);
    }

    // 18 lessons * 30 questions = 540 total questions
    expect(totalQuestions).toBe(540);
  });

  it('guarantees clean Myanmar Unicode with zero Zawgyi encoding across Batch 2', () => {
    for (const packId of batch2Ids) {
      const filePath = path.resolve(`./content/packs/n3/${packId}.json`);
      const rawText = fs.readFileSync(filePath, 'utf-8');

      const pack = JSON.parse(rawText) as LessonPack;

      // Vocab meanings
      for (const v of pack.vocabularies) {
        expect(isZawgyi(v.my || '')).toBe(false);
        expect(isZawgyi(v.meaningMy || '')).toBe(false);
      }

      // Grammar explanations
      for (const g of pack.grammars) {
        expect(isZawgyi(g.meaning || '')).toBe(false);
        expect(isZawgyi(g.explanation.my || '')).toBe(false);
      }

      // Sentences
      for (const s of pack.sentences) {
        expect(isZawgyi(s.translation.my || '')).toBe(false);
      }

      // Question explanations
      for (const q of pack.questions) {
        expect(isZawgyi(q.explanation || '')).toBe(false);
        expect(isZawgyi(q.explanationMy || '')).toBe(false);
      }
    }
  });

  it('verifies ContentLoader exports and getters for N3 Batch 1 and Batch 2', () => {
    expect(N3_BATCH1_PACKS).toHaveLength(30);
    expect(N3_BATCH2_PACKS).toHaveLength(18);
    expect(ALL_N3_PACKS).toHaveLength(48);

    // Test getters
    const l31 = getN3Batch2LessonPack('n3.l31');
    expect(l31).toBeDefined();
    expect(l31?.id).toBe('n3.l31');
    expect(l31?.title).toContain('Hearsay, Quotes');

    const l48 = getN3LessonPack('n3.l48');
    expect(l48).toBeDefined();
    expect(l48?.id).toBe('n3.l48');
    expect(l48?.title).toContain('N3 Comprehensive Review');

    const invalid = getN3Batch2LessonPack('n3.l99');
    expect(invalid).toBeUndefined();
  });
});
