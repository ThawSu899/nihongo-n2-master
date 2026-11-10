import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LessonPack, LessonPackSchema, CurriculumMapItem, UserProfile } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { ContentLoader } from '../src/data/content/content-loader';
import {
  N2_INITIAL_PACKS,
  getN2InitialLessonPack,
  n2l01Data,
  n2l02Data,
  n2l03Data,
} from '../src/domain/curriculum';
import curriculumMapJson from '../content/curriculum-map.json';
import { CurriculumScreen } from '../src/presentation/screens/CurriculumScreen';
import { LessonPlayerScreen } from '../src/presentation/screens/LessonPlayerScreen';

describe('JLPT N2 Initial Lessons Unquarantine & Expansion (n2.l01 - n2.l03)', () => {
  const initialIds = ['n2.l01', 'n2.l02', 'n2.l03'];

  const mapItems = curriculumMapJson as CurriculumMapItem[];
  const mapById = new Map<string, CurriculumMapItem>(mapItems.map((item) => [item.id, item]));

  const dummyProfile: UserProfile = {
    name: 'N2 Pioneer',
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
    studyStreakDays: 30,
    notificationSettings: {
      inApp: true,
      browser: false,
      calendarPopup: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
  };

  describe('1. Schema Validation, Linter & Burmese Enrichment Verification', () => {
    it('contains all 3 exported TypeScript packs in N2_INITIAL_PACKS', () => {
      expect(N2_INITIAL_PACKS).toHaveLength(3);
      const exportedIds = N2_INITIAL_PACKS.map((p) => p.id);
      expect(exportedIds).toEqual(initialIds);
      expect(n2l01Data.id).toBe('n2.l01');
      expect(n2l02Data.id).toBe('n2.l02');
      expect(n2l03Data.id).toBe('n2.l03');
    });

    for (const lessonId of initialIds) {
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

  describe('2. Single Source of Truth Parity & Continuous Sequence (n2.l01 - n2.l30)', () => {
    it('verifies all 3 initial lessons are published and have full parity in curriculum-map.json', () => {
      for (const id of initialIds) {
        const mapItem = mapById.get(id);
        expect(mapItem, `Map item for ${id} must exist`).toBeDefined();
        expect(mapItem?.status).toBe('published');
        expect(mapItem?.targetVocabCount).toBe(30);
        expect(mapItem?.targetKanjiCount).toBe(3);
        expect(mapItem?.grammarTopics).toHaveLength(3);

        const pack = getN2InitialLessonPack(id)!;
        expect(pack).toBeDefined();
        expect(mapItem?.title).toBe(pack.title);

        for (const topic of mapItem!.grammarTopics) {
          expect(topic).not.toMatch(/Grammar Point \d/i);
          expect(topic).not.toMatch(/X を Y します/i);
        }
      }
    });

    it('verifies all 30 initial N2 lessons (n2.l01 through n2.l30) form a continuous published sequence', () => {
      for (let i = 1; i <= 30; i++) {
        const id = `n2.l${i.toString().padStart(2, '0')}`;
        const mapItem = mapById.get(id);
        expect(mapItem, `Map item for ${id} must exist`).toBeDefined();
        expect(mapItem?.status, `Lesson ${id} must be published`).toBe('published');
        expect(mapItem?.targetVocabCount).toBe(30);
        expect(mapItem?.targetKanjiCount).toBe(3);
        expect(mapItem?.grammarTopics.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('retains quarantine on unreleased future or non-existent lessons (e.g. n3.l49, n2.l61)', async () => {
      for (const quarantinedId of ['n3.l49', 'n3.l50', 'n2.l61', 'n1.l01']) {
        const loaded = await ContentLoader.getLessonPack(quarantinedId);
        expect(loaded, `Lesson ${quarantinedId} must remain quarantined`).toBeNull();
      }
    });
  });

  describe('3. Dynamic Loading & UI Screen Integration', () => {
    it('successfully loads n2.l01, n2.l02, and n2.l03 via ContentLoader', async () => {
      for (const testId of initialIds) {
        const loaded = await ContentLoader.getLessonPack(testId);
        expect(loaded).toBeDefined();
        expect(loaded?.id).toBe(testId);
        expect(loaded?.status).toBe('published');
        expect(loaded?.questions).toHaveLength(30);
      }
    });

    it('renders CurriculumScreen displaying N2 Initial lessons as Published', () => {
      const html = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N2',
        })
      ).replace(/<!-- -->/g, '');

      // Verify initial lessons appear in rendered HTML
      expect(html).toContain('n2.l01');
      expect(html).toContain('n2.l02');
      expect(html).toContain('n2.l03');
      expect(html).toContain('Time &amp; Occasions');
      expect(html).toContain('〜際（に）');
    });

    it('renders LessonPlayerScreen for n2.l01 without runtime errors', () => {
      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: n2l01Data,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );

      expect(html).toContain('N2 Lesson 1');
      expect(html).toContain('Time &amp; Occasions');
    });

    it('renders LessonPlayerScreen for n2.l02 without runtime errors', () => {
      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: n2l02Data,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );

      expect(html).toContain('N2 Lesson 2');
      expect(html).toContain('Sequential');
    });

    it('renders LessonPlayerScreen for n2.l03 without runtime errors', () => {
      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: n2l03Data,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );

      expect(html).toContain('N2 Lesson 3');
      expect(html).toContain('Correlative');
    });
  });
});
