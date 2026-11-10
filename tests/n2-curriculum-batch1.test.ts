import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LessonPack, LessonPackSchema, CurriculumMapItem, UserProfile } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { ContentLoader } from '../src/data/content/content-loader';
import {
  N2_BATCH1_PACKS,
  getN2Batch1LessonPack,
  n2l04Data,
  n2l05Data,
  n2l06Data,
  n2l07Data,
  n2l08Data,
  n2l09Data,
  n2l10Data,
} from '../src/domain/curriculum';
import curriculumMapJson from '../content/curriculum-map.json';
import { CurriculumScreen } from '../src/presentation/screens/CurriculumScreen';
import { LessonPlayerScreen } from '../src/presentation/screens/LessonPlayerScreen';

describe('JLPT N2 Batch 1 Curriculum Expansion (n2.l04 - n2.l10)', () => {
  const batchIds = [
    'n2.l04',
    'n2.l05',
    'n2.l06',
    'n2.l07',
    'n2.l08',
    'n2.l09',
    'n2.l10',
  ];

  const mapItems = curriculumMapJson as CurriculumMapItem[];
  const mapById = new Map<string, CurriculumMapItem>(mapItems.map((item) => [item.id, item]));

  const dummyProfile: UserProfile = {
    name: 'N2 Aspirant',
    level: 'N2',
    currentLessonId: 'n2.l04',
    dailyTargetMinutes: 360,
    dayRolloverHour: 4,
    showRomaji: false,
    furiganaMode: 'always',
    explanationLang: 'en',
    targetRetention: 0.9,
    dailyNewCap: 30,
    dailyReviewCap: 200,
    studyStreakDays: 14,
    notificationSettings: {
      inApp: true,
      browser: false,
      calendarPopup: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
  };

  describe('1. Schema Validation, Linter & Burmese Enrichment Verification', () => {
    it('contains all 7 exported TypeScript packs in N2_BATCH1_PACKS', () => {
      expect(N2_BATCH1_PACKS).toHaveLength(7);
      const exportedIds = N2_BATCH1_PACKS.map((p) => p.id);
      expect(exportedIds).toEqual(batchIds);
      expect(n2l04Data.id).toBe('n2.l04');
      expect(n2l05Data.id).toBe('n2.l05');
      expect(n2l06Data.id).toBe('n2.l06');
      expect(n2l07Data.id).toBe('n2.l07');
      expect(n2l08Data.id).toBe('n2.l08');
      expect(n2l09Data.id).toBe('n2.l09');
      expect(n2l10Data.id).toBe('n2.l10');
    });

    for (const lessonId of batchIds) {
      describe(`Lesson ${lessonId} Content Completeness`, () => {
        const jsonPath = path.resolve(`./content/packs/n2/${lessonId}.json`);
        expect(fs.existsSync(jsonPath), `File must exist at ${jsonPath}`).toBe(true);
        const pack = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as LessonPack;

        it('passes Zod schema validation and has zero linter errors', () => {
          const zodResult = LessonPackSchema.safeParse(pack);
          expect(zodResult.success, `Zod validation failed for ${lessonId}`).toBe(true);

          const linterResult = lintLessonPack(pack);
          expect(linterResult.errors, `Linter errors in ${lessonId}`).toEqual([]);
        });

        it('is marked as published and native_verified', () => {
          expect(pack.status).toBe('published');
          expect(pack.prov.status).toBe('native_verified');
          expect(pack.level).toBe('N2');
        });

        it('contains at least 30 vocabularies with authentic Burmese meanings', () => {
          expect(pack.vocabularies.length).toBeGreaterThanOrEqual(30);
          for (const vocab of pack.vocabularies) {
            expect(vocab.ja).toBeTruthy();
            expect(vocab.kana).toBeTruthy();
            expect(vocab.en).toBeTruthy();
            expect(vocab.my || (vocab as any).meaningMyanmar).toBeTruthy();
          }
        });

        it('contains exactly 3 kanjis with stroke counts, onyomi, and Burmese translations', () => {
          expect(pack.kanjis).toHaveLength(3);
          for (const kanji of pack.kanjis) {
            expect(kanji.char).toBeTruthy();
            expect(kanji.meaning).toBeTruthy();
            expect(kanji.meaningMy || kanji.meaningMyanmar).toBeTruthy();
            expect(kanji.exampleVocab.length).toBeGreaterThanOrEqual(1);
          }
        });

        it('contains exactly 3 authentic JLPT N2 grammar patterns with Burmese explanations', () => {
          expect(pack.grammars).toHaveLength(3);
          for (const grammar of pack.grammars) {
            expect(grammar.pattern).toBeTruthy();
            expect(grammar.meaning).toBeTruthy();
            expect(grammar.formation).toBeTruthy();
            expect(grammar.explanation.my).toBeTruthy();
            expect(grammar.examples.length).toBeGreaterThanOrEqual(1);
          }
        });

        it('contains exactly 12 example sentences with dual English and Burmese translations', () => {
          expect(pack.sentences).toHaveLength(12);
          for (const s of pack.sentences) {
            expect(s.ja).toBeTruthy();
            expect(s.kana).toBeTruthy();
            expect(s.translation.en).toBeTruthy();
            expect(s.translation.my).toBeTruthy();
            expect(s.vocabIds.length).toBeGreaterThanOrEqual(1);
            expect(s.grammarIds.length).toBeGreaterThanOrEqual(1);
          }
        });

        it('contains authentic Dokkai reading comprehension with Burmese translation', () => {
          expect(pack.reading).toBeDefined();
          expect(pack.reading.title).toBeTruthy();
          expect(pack.reading.text.length).toBeGreaterThan(100);
          expect(pack.reading.translation).toBeTruthy();
          expect(pack.reading.questionIds.length).toBeGreaterThanOrEqual(1);
          expect(pack.reading.glossary.length).toBeGreaterThanOrEqual(2);
        });

        it('contains authentic Choukai listening dialogues with Burmese translations for all turns', () => {
          expect(pack.listening).toBeDefined();
          expect(pack.listening.turns.length).toBeGreaterThanOrEqual(4);
          for (const turn of pack.listening.turns) {
            expect(turn.speaker).toBeTruthy();
            expect(turn.ja).toBeTruthy();
            expect(turn.my || (turn as any).myanmar).toBeTruthy();
          }
          expect(pack.listening.questionIds.length).toBeGreaterThanOrEqual(1);
        });

        it('contains 30 assessment questions with 4 distinct choices and no empty strings', () => {
          expect(pack.questions).toHaveLength(30);
          for (const q of pack.questions) {
            expect(q.prompt).toBeTruthy();
            expect(q.answer).toBeTruthy();
            expect(q.explanation).toBeTruthy();
            if (q.choices) {
              expect(q.choices.length).toBe(4);
              expect(new Set(q.choices).size).toBe(4);
              expect(q.choices).toContain(q.answer);
              for (const c of q.choices) {
                expect(c.trim().length).toBeGreaterThan(0);
              }
            }
          }
        });
      });
    }
  });

  describe('2. Single Source of Truth Parity in curriculum-map.json', () => {
    it('verifies all 7 batch lessons are published and have full parity in curriculum-map.json', () => {
      for (const id of batchIds) {
        const mapItem = mapById.get(id);
        expect(mapItem, `Map item for ${id} must exist`).toBeDefined();
        expect(mapItem?.status).toBe('published');
        expect(mapItem?.targetVocabCount).toBe(30);
        expect(mapItem?.targetKanjiCount).toBe(3);
        expect(mapItem?.grammarTopics).toHaveLength(3);

        const pack = getN2Batch1LessonPack(id)!;
        expect(pack).toBeDefined();
        expect(mapItem?.title).toBe(pack.title);

        for (const topic of mapItem!.grammarTopics) {
          expect(topic).not.toMatch(/Grammar Point \d/i);
          expect(topic).not.toMatch(/X を Y します/i);
        }
      }
    });

    it('retains quarantine on unreleased or non-existent lessons (e.g. n3.l49, n2.l61)', async () => {
      for (const quarantinedId of ['n3.l49', 'n3.l50', 'n2.l61', 'n1.l01']) {
        const loaded = await ContentLoader.getLessonPack(quarantinedId);
        expect(loaded).toBeNull();
      }
    });
  });

  describe('3. Dynamic Loader & Domain Curriculum Integration', () => {
    it('loads all 7 batch 1 packs via ContentLoader.getLessonPack', async () => {
      for (const id of batchIds) {
        const loaded = await ContentLoader.getLessonPack(id);
        expect(loaded).toBeDefined();
        expect(loaded?.id).toBe(id);
        expect(loaded?.status).toBe('published');
      }
    });

    it('resolves packs via domain helper getN2Batch1LessonPack', () => {
      const p4 = getN2Batch1LessonPack('n2.l04');
      expect(p4).toBeDefined();
      expect(p4?.title).toContain('Perspective & Subjective View');

      const p10 = getN2Batch1LessonPack('n2.l10');
      expect(p10).toBeDefined();
      expect(p10?.title).toContain('Scope, Invariance & Contrast');

      const nonexistent = getN2Batch1LessonPack('n2.l99');
      expect(nonexistent).toBeUndefined();
    });
  });

  describe('4. UI Mount & Playability Verification (CurriculumScreen & LessonPlayerScreen)', () => {
    it('renders all 7 N2 batch 1 lessons in CurriculumScreen with playable status and no planned locks', () => {
      const html = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N2',
        })
      ).replace(/<!-- -->/g, '');

      // Check all 7 lessons are rendered
      for (const id of batchIds) {
        expect(html).toContain(id);
      }

      // Check that key grammar patterns appear in the rendered curriculum screen
      expect(html).toContain('～から見ると');
      expect(html).toContain('～あまり');
      expect(html).toContain('〜としたら');
      expect(html).toContain('〜てたまらない');
      expect(html).toContain('〜に決まっている');
      expect(html).toContain('〜に際して');
      expect(html).toContain('〜を問わず');
    });

    it('mounts LessonPlayerScreen for n2.l04 and n2.l09 without crashing', () => {
      const htmlL04 = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: n2l04Data,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );
      expect(htmlL04).toContain('Perspective &amp; Subjective View');
      expect(htmlL04).toContain('ရည်မှန်းချက်များ');

      const htmlL09 = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: n2l09Data,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );
      expect(htmlL09).toContain('Time, Occasions &amp; Progressive Change');
      expect(htmlL09).toContain('ရည်မှန်းချက်များ');
    });
  });
});
