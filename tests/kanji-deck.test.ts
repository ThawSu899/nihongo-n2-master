import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import {
  extractKanjiForLevel,
  KanjiCardItem,
} from '../src/domain/curriculum/kanji-extractor';
import { KanjiDetailModal } from '../src/presentation/components/KanjiDetailModal';
import {
  LevelBulkStudyScreen,
  formatKanjiReadings,
  generateKanjiQuizSession,
} from '../src/presentation/screens/LevelBulkStudyScreen';
import { ContentLoader } from '../src/data/content/content-loader';

describe('Kanji Deck & Stroke Visualizer System', () => {
  describe('1. Kanji Extractor (Domain Layer)', () => {
    it('extracts and deduplicates canonical N5 Kanji from lesson packs', async () => {
      const n5Kanjis = await extractKanjiForLevel('N5');
      expect(n5Kanjis.length).toBeGreaterThanOrEqual(103);

      // Verify deduplication and quality assertions
      const seenLiterals = new Set<string>();
      for (const k of n5Kanjis) {
        expect(seenLiterals.has(k.literal)).toBe(false);
        seenLiterals.add(k.literal);

        // Verify required properties
        expect(k.literal).toBeDefined();
        expect(k.literal.length).toBe(1);
        expect(k.jlptLevel).toBe('N5');
        expect(k.strokeCount).toBeGreaterThan(0);
        expect(k.meaningBurmese.length).toBeGreaterThan(0);
        expect(k.meaningEn.length).toBeGreaterThan(0);
        expect(Array.isArray(k.onyomi)).toBe(true);
        expect(Array.isArray(k.kunyomi)).toBe(true);

        // Zero Romaji in readings
        for (const on of k.onyomi) {
          expect(/[A-Za-z]/.test(on)).toBe(false);
        }
        for (const kun of k.kunyomi) {
          expect(/[A-Za-z]/.test(kun)).toBe(false);
        }

        // Zero English-only meaningBurmese
        expect(/^[\x00-\x7F]+$/.test(k.meaningBurmese.trim())).toBe(false);
      }
    }, 20000);

    it('extracts canonical Kanji for N4, N3, and N2 levels with quality gates', async () => {
      const n4Kanjis = await extractKanjiForLevel('N4');
      expect(n4Kanjis.length).toBeGreaterThanOrEqual(180);
      expect(n4Kanjis.every((k) => k.jlptLevel === 'N4')).toBe(true);

      const n3Kanjis = await extractKanjiForLevel('N3');
      expect(n3Kanjis.length).toBeGreaterThanOrEqual(250);
      expect(n3Kanjis.every((k) => k.jlptLevel === 'N3')).toBe(true);

      const n2Kanjis = await extractKanjiForLevel('N2');
      expect(n2Kanjis.length).toBeGreaterThanOrEqual(250);
      expect(n2Kanjis.every((k) => k.jlptLevel === 'N2')).toBe(true);

      // Zero Romaji and zero English-only Burmese check across all tiers
      for (const k of [...n4Kanjis, ...n3Kanjis, ...n2Kanjis]) {
        for (const on of k.onyomi) {
          expect(/[A-Za-z]/.test(on)).toBe(false);
        }
        for (const kun of k.kunyomi) {
          expect(/[A-Za-z]/.test(kun)).toBe(false);
        }
        expect(/^[\x00-\x7F]+$/.test(k.meaningBurmese.trim())).toBe(false);
      }
    }, 25000);

    it('enriches items with radicals and compound examples where available', async () => {
      const n5Kanjis = await extractKanjiForLevel('N5');
      const gaku = n5Kanjis.find((k) => k.literal === '学');
      expect(gaku).toBeDefined();
      if (gaku) {
        expect(gaku.strokeCount).toBe(8);
        expect(gaku.onyomi).toContain('ガク');
        expect(gaku.examples).toBeDefined();
        expect(gaku.examples?.length).toBeGreaterThan(0);
        expect(gaku.radicals).toBeDefined();
      }
    });

    it('ContentLoader.getKanjiForLevel returns raw pack kanji', async () => {
      const rawN5 = await ContentLoader.getKanjiForLevel('N5');
      expect(rawN5.length).toBeGreaterThanOrEqual(103);
      expect(rawN5[0].char).toBeDefined();
    });
  });

  describe('2. KanjiDetailModal Component', () => {
    const dummyKanji: KanjiCardItem = {
      id: 'n5-k-gaku',
      literal: '学',
      jlptLevel: 'N5',
      onyomi: ['ガク'],
      kunyomi: ['まな・ぶ'],
      meaningBurmese: 'သင်ယူသည် / ပညာသင်သည်',
      meaningEn: 'Study / Learning / School',
      strokeCount: 8,
      radicals: ['宀 (crown)', '子 (child)'],
      examples: [
        {
          word: '学生',
          reading: 'がくせい',
          meaningBurmese: 'ကျောင်းသား / ကျောင်းသူ',
        },
        {
          word: '大学',
          reading: 'だいがく',
          meaningBurmese: 'တက္ကသိုလ်',
        },
      ],
    };

    it('renders large central Kanji, stroke count, readings, and Burmese definition', () => {
      const onClose = vi.fn();
      const html = renderToString(
        React.createElement(KanjiDetailModal, {
          kanji: dummyKanji,
          isOpen: true,
          onClose,
        })
      );

      // Character & Header
      expect(html).toContain('学');
      expect(html).toContain('JLPT N5');
      expect(html).toContain('総画数: 8 画');
      expect(html).toContain('သင်ယူသည် / ပညာသင်သည်');
      expect(html).toContain('Study / Learning / School');

      // Readings
      expect(html).toContain('ガク');
      expect(html).toContain('まな・ぶ');

      // Radicals
      expect(html).toContain('宀 (crown)');
      expect(html).toContain('子 (child)');

      // Compound examples
      expect(html).toContain('学生');
      expect(html).toContain('がくせい');
      expect(html).toContain('ကျောင်းသား / ကျောင်းသူ');
      expect(html).toContain('大学');
      expect(html).toContain('တက္ကသိုလ်');

      // Calligraphy grid & stroke buttons
      expect(html).toContain('Stroke Step: 1 / 8');
      expect(html).toContain('Auto Play');
      expect(html).toContain('လက်ရေးလေ့ကျင့်ရန်');
    });

    it('returns null when kanji is null or isOpen is false', () => {
      const html1 = renderToString(
        React.createElement(KanjiDetailModal, {
          kanji: null,
          isOpen: true,
          onClose: () => {},
        })
      );
      expect(html1).toBe('');

      const html2 = renderToString(
        React.createElement(KanjiDetailModal, {
          kanji: dummyKanji,
          isOpen: false,
          onClose: () => {},
        })
      );
      expect(html2).toBe('');
    });
  });

  describe('3. LevelBulkStudyScreen Kanji Mode Integration', () => {
    it('renders primary segmented switcher with Vocabulary and Kanji Deck options', () => {
      const html = renderToString(
        React.createElement(LevelBulkStudyScreen, {
          onBack: () => {},
          initialLevel: 'N5',
        })
      );

      expect(html).toContain('📖 ဝေါဟာရ (Vocabulary)');
      expect(html).toContain('🈁 ခန်းဂျီး (Kanji Deck)');
    });

    it('renders Kanji Deck tab with mode switcher, mastery progress bar, and sort/filter controls', () => {
      const html = renderToString(
        React.createElement(LevelBulkStudyScreen, {
          onBack: () => {},
          initialLevel: 'N5',
          initialTab: 'kanji',
        })
      );

      // Tab switcher
      expect(html).toContain('📖 ဝေါဟာရ (Vocabulary)');
      expect(html).toContain('🈁 ခန်းဂျီး (Kanji Deck)');

      // 3-Mode switcher
      expect(html).toContain('一覧 (Grid View)');
      expect(html).toContain('フラッシュカード (Flashcards)');
      expect(html).toContain('クイズ (Kanji Quiz)');

      // Mastery progress bar
      expect(html).toContain('Mastered (တတ်မြောက်ပြီး)');

      // Filter pills
      expect(html).toContain('All (အားလုံး)');
      expect(html).toContain('Unmastered (လေ့လာဆဲ)');
      expect(html).toContain('Mastered (တတ်မြောက်ပြီး)');

      // Sort selector
      expect(html).toContain('Default Order (မူလအစဉ်)');
      expect(html).toContain('Strokes: Low → High (ရေးချက် နည်း → များ)');
      expect(html).toContain('Strokes: High → Low (ရေးချက် များ → နည်း)');

      // Search input placeholder
      expect(html).toContain('Search N5 kanji by Character (例: 学), Onyomi (例: ガク), Kunyomi, or Burmese...');
    });
  });

  describe('4. Readings, Examples & Kanji Quiz Domain Utilities', () => {
    it('formatKanjiReadings formats both Onyomi and Kunyomi properly', () => {
      const k1: KanjiCardItem = {
        id: 'test-1',
        literal: '学',
        jlptLevel: 'N5',
        onyomi: ['ガク'],
        kunyomi: ['まな・ぶ'],
        meaningBurmese: 'သင်ယူသည်',
        meaningEn: 'Study',
        strokeCount: 8,
      };
      expect(formatKanjiReadings(k1)).toBe('音: ガク | 訓: まな・ぶ');

      const k2: KanjiCardItem = {
        id: 'test-2',
        literal: '一',
        jlptLevel: 'N5',
        onyomi: ['イチ'],
        kunyomi: [],
        meaningBurmese: 'တစ်ခု',
        meaningEn: 'One',
        strokeCount: 1,
      };
      expect(formatKanjiReadings(k2)).toBe('音: イチ');

      const k3: KanjiCardItem = {
        id: 'test-3',
        literal: '々',
        jlptLevel: 'N5',
        onyomi: [],
        kunyomi: [],
        meaningBurmese: 'ထပ်ခါ',
        meaningEn: 'Repetition',
        strokeCount: 3,
      };
      expect(formatKanjiReadings(k3)).toBe('—');
    });

    it('generateKanjiQuizSession generates 4-choice questions testing reading, meaning, and kanji characters', async () => {
      const n5Kanjis = await extractKanjiForLevel('N5');
      const session = generateKanjiQuizSession(n5Kanjis, 9);

      expect(session.length).toBe(9);

      const types = new Set(session.map((q) => q.type));
      expect(types.has('kanji_to_reading')).toBe(true);
      expect(types.has('kanji_to_meaning')).toBe(true);
      expect(types.has('meaning_to_kanji')).toBe(true);

      for (const q of session) {
        expect(q.prompt).toBeDefined();
        expect(q.correctAnswer).toBeDefined();
        expect(q.options.length).toBe(4);
        expect(q.options).toContain(q.correctAnswer);

        // Distinct options
        const unique = new Set(q.options);
        expect(unique.size).toBe(4);
      }
    });

    it('extractKanjiForLevel retains lessonId and top compound examples for cards', async () => {
      const n5Kanjis = await extractKanjiForLevel('N5');
      const withLesson = n5Kanjis.filter((k) => k.lessonId);
      expect(withLesson.length).toBeGreaterThan(0);
      expect(withLesson[0].lessonId).toMatch(/^n5\.l\d+/);

      const withExamples = n5Kanjis.filter((k) => k.examples && k.examples.length > 0);
      expect(withExamples.length).toBeGreaterThan(0);
      expect(withExamples[0].examples![0].word).toBeDefined();
      expect(withExamples[0].examples![0].meaningBurmese).toBeDefined();
    });
  });
});
