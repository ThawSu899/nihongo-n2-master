import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CurriculumMapItem, LessonPack } from '../src/domain/models/types';
import curriculumMapJson from '../content/curriculum-map.json';
import { ContentLoader } from '../src/data/content/content-loader';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CurriculumScreen } from '../src/presentation/screens/CurriculumScreen';

describe('Phase 3: Curriculum Audit Fixes Verification', () => {
  const mapItems = curriculumMapJson as CurriculumMapItem[];

  describe('Priority 1: Assessment Choices Fixes', () => {
    it('verifies n4.l19.q017 has 4 distinct choices with plausible distractors', () => {
      const pack = JSON.parse(
        fs.readFileSync(path.resolve('./content/packs/n4/n4.l19.json'), 'utf-8')
      ) as LessonPack;
      const q = pack.questions.find((item) => item.id === 'n4.l19.q017');
      expect(q).toBeDefined();
      expect(q?.choices).toHaveLength(4);
      expect(new Set(q?.choices).size).toBe(4);
      expect(q?.choices).toContain('なくなりました');
      expect(q?.answer).toBe('なくなりました');
      expect(q?.choices).toContain('ないでした');
      expect(q?.choices).toContain('ありませんでした');
      expect(q?.choices).toContain('なかったです');
    });

    const eighteenDuplicateQuestions = [
      { file: 'content/packs/n4/n4.l11.json', qid: 'n4.l11.q019', answer: 'こられる' },
      { file: 'content/packs/n4/n4.l13.json', qid: 'n4.l13.q019', answer: 'させられました' },
      { file: 'content/packs/n4/n4.l15.json', qid: 'n4.l15.q012', answer: '拝見' },
      { file: 'content/packs/n4/n4.l17.json', qid: 'n4.l17.q012', answer: '健康' },
      { file: 'content/packs/n3/n3.l13.json', qid: 'n3.l13.q011', answer: 'きかい' },
      { file: 'content/packs/n3/n3.l17.json', qid: 'n3.l17.q014', answer: '応援' },
      { file: 'content/packs/n3/n3.l18.json', qid: 'n3.l18.q014', answer: '適切' },
      { file: 'content/packs/n3/n3.l22.json', qid: 'n3.l22.q014', answer: '怖' },
      { file: 'content/packs/n3/n3.l22.json', qid: 'n3.l22.q015', answer: '面積' },
      { file: 'content/packs/n3/n3.l22.json', qid: 'n3.l22.q016', answer: '南極' },
      { file: 'content/packs/n3/n3.l23.json', qid: 'n3.l23.q015', answer: '批評' },
      { file: 'content/packs/n3/n3.l25.json', qid: 'n3.l25.q010', answer: '追及' },
      { file: 'content/packs/n3/n3.l25.json', qid: 'n3.l25.q014', answer: '普及' },
      { file: 'content/packs/n3/n3.l26.json', qid: 'n3.l26.q014', answer: '子供' },
      { file: 'content/packs/n3/n3.l26.json', qid: 'n3.l26.q015', answer: '設計' },
      { file: 'content/packs/n3/n3.l27.json', qid: 'n3.l27.q004', answer: 'しゅくしょう' },
      { file: 'content/packs/n3/n3.l28.json', qid: 'n3.l28.q013', answer: '基礎' },
      { file: 'content/packs/n3/n3.l28.json', qid: 'n3.l28.q014', answer: '水準' },
    ];

    it('verifies all 18 previously duplicate-choice questions have strictly unique choices', () => {
      for (const target of eighteenDuplicateQuestions) {
        const pack = JSON.parse(
          fs.readFileSync(path.resolve(target.file), 'utf-8')
        ) as LessonPack;
        const q = pack.questions.find((item) => item.id === target.qid);
        expect(q, `Question ${target.qid} must exist in ${target.file}`).toBeDefined();
        expect(q?.choices).toHaveLength(4);
        expect(
          new Set(q?.choices).size,
          `Choices in ${target.qid} must be unique: ${JSON.stringify(q?.choices)}`
        ).toBe(4);
        expect(q?.choices).toContain(target.answer);
        expect(q?.answer).toBe(target.answer);
      }
    });

    it('confirms ZERO duplicate choices across ALL questions in published N5, N4, and N3 lessons', () => {
      const levels = ['n5', 'n4', 'n3'];
      const failures: Array<{ qid: string; lesson: string; choices: string[] }> = [];

      for (const lvl of levels) {
        const publishedPacks = mapItems.filter(
          (m) => m.level === lvl.toUpperCase() && m.status === 'published'
        );
        for (const m of publishedPacks) {
          const pack = JSON.parse(
            fs.readFileSync(path.resolve(`./content/packs/${lvl}/${m.id}.json`), 'utf-8')
          ) as LessonPack;
          for (const q of pack.questions || []) {
            if (q.choices && q.choices.length > 0) {
              const unique = new Set(q.choices);
              if (unique.size !== q.choices.length) {
                failures.push({ qid: q.id, lesson: m.id, choices: q.choices });
              }
            }
          }
        }
      }

      expect(failures).toEqual([]);
    });
  });

  describe('Priority 2: N5 Duplicate Grammar Fixes', () => {
    const n5l20Pack = JSON.parse(
      fs.readFileSync(path.resolve('./content/packs/n5/n5.l20.json'), 'utf-8')
    ) as LessonPack;
    const n5l21Pack = JSON.parse(
      fs.readFileSync(path.resolve('./content/packs/n5/n5.l21.json'), 'utf-8')
    ) as LessonPack;
    const n5l20Map = mapItems.find((m) => m.id === 'n5.l20');
    const n5l21Map = mapItems.find((m) => m.id === 'n5.l21');

    it('keeps 〜たり〜たり in n5.l21 and its curriculum map entry', () => {
      const tariPattern = '[V1-ta] り、[V2-ta] り します';
      expect(n5l21Pack.grammars.some((g) => g.pattern === tariPattern)).toBe(true);
      expect(n5l21Map?.grammarTopics).toContain(tariPattern);
      expect(n5l21Pack.title).toContain('〜たり〜たり');
    });

    it('removes 〜たり〜たり from n5.l20 and updates with 一度も [Verb-ta] ことが ありません', () => {
      const tariPattern = '[V1-ta] り、[V2-ta] り します';
      expect(n5l20Pack.grammars.some((g) => g.pattern === tariPattern)).toBe(false);
      expect(n5l20Map?.grammarTopics).not.toContain(tariPattern);

      const expNegPattern = '一度も [Verb-ta] ことが ありません';
      expect(n5l20Pack.grammars.some((g) => g.pattern === expNegPattern)).toBe(true);
      expect(n5l20Map?.grammarTopics).toContain(expNegPattern);
    });

    it('verifies n5.l20 sentences and reading properly integrate the updated grammar', () => {
      const g002 = n5l20Pack.grammars.find(
        (g) => g.pattern === '一度も [Verb-ta] ことが ありません'
      );
      expect(g002).toBeDefined();

      const linkedSentences = n5l20Pack.sentences.filter((s) =>
        s.grammarIds.includes(g002!.id)
      );
      expect(linkedSentences.length).toBeGreaterThanOrEqual(2);
      expect(linkedSentences.some((s) => s.ja.includes('一度も'))).toBe(true);

      // Verify reading passage references negative experience
      expect(n5l20Pack.reading.text).toContain('一度も見たことがありません');
    });

    it('verifies zero duplicate grammar patterns across all published N5 lessons', () => {
      const n5Published = mapItems.filter((m) => m.level === 'N5' && m.status === 'published');
      const seenPatterns = new Map<string, string>();
      const dups: Array<{ pattern: string; lessons: string[] }> = [];

      for (const m of n5Published) {
        const pack = JSON.parse(
          fs.readFileSync(path.resolve(`./content/packs/n5/${m.id}.json`), 'utf-8')
        ) as LessonPack;
        for (const g of pack.grammars) {
          if (seenPatterns.has(g.pattern)) {
            dups.push({ pattern: g.pattern, lessons: [seenPatterns.get(g.pattern)!, m.id] });
          } else {
            seenPatterns.set(g.pattern, m.id);
          }
        }
      }

      expect(dups).toEqual([]);
    });
  });

  describe('Priority 3: N3 Scaffold Quarantine Fixes', () => {
    const quarantinedN3Ids = Array.from({ length: 18 }, (_, i) => `n3.l${i + 31}`);

    it('sets status: "planned" for n3.l31 through n3.l48 in curriculum-map.json', () => {
      for (const id of quarantinedN3Ids) {
        const mapItem = mapItems.find((m) => m.id === id);
        expect(mapItem, `Map item for ${id} must exist`).toBeDefined();
        expect(mapItem?.status, `${id} must have status planned in curriculum map`).toBe('planned');
      }
    });

    it('sets status: "planned" for n3.l31 through n3.l48 in their pack files while preserving files', () => {
      for (const id of quarantinedN3Ids) {
        const packPath = path.resolve(`./content/packs/n3/${id}.json`);
        expect(fs.existsSync(packPath), `Pack file ${id}.json must be preserved`).toBe(true);
        const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8')) as LessonPack;
        expect(pack.status, `Pack ${id} status must be planned`).toBe('planned');
      }
    });

    it('prevents ContentLoader.getLessonPack from loading quarantined N3 packs', async () => {
      for (const id of ['n3.l31', 'n3.l35', 'n3.l40', 'n3.l48']) {
        const pack = await ContentLoader.getLessonPack(id);
        expect(pack, `Quarantined pack ${id} must not be loaded`).toBeNull();
      }
    });

    it('ensures published N3 packs (n3.l01-n3.l30) load cleanly via ContentLoader', async () => {
      for (const id of ['n3.l01', 'n3.l10', 'n3.l20', 'n3.l30']) {
        const pack = await ContentLoader.getLessonPack(id);
        expect(pack, `Published pack ${id} must load`).not.toBeNull();
        expect(pack?.status).toBe('published');
      }
    });

    it('CurriculumScreen renders quarantined N3 lessons with Planned badge and Outline only notice', async () => {
      const htmlN3 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N3',
        })
      ).replace(/<!-- -->/g, '');

      // n3.l30 is published
      expect(htmlN3).toContain('n3.l30');
      // n3.l31 is planned
      expect(htmlN3).toContain('n3.l31');
      // Verify planned badge is rendered
      expect(htmlN3).toContain('Planned');
      expect(htmlN3).toContain('Outline only');
    });

    it('confirms ZERO duplicate titles exist among published lessons across N5, N4, and N3', () => {
      const publishedItems = mapItems.filter((m) => m.status === 'published');
      const seenTitles = new Map<string, string>();
      const duplicateTitles: Array<{ title: string; lessons: string[] }> = [];

      for (const item of publishedItems) {
        if (seenTitles.has(item.title)) {
          duplicateTitles.push({
            title: item.title,
            lessons: [seenTitles.get(item.title)!, item.id],
          });
        } else {
          seenTitles.set(item.title, item.id);
        }
      }

      expect(duplicateTitles).toEqual([]);
    });
  });
});
