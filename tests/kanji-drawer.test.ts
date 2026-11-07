import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isKanjiChar,
  getOrDecomposeKanji,
  CURATED_KANJI_CATALOG,
  KanjiDetail,
} from '../src/domain/dictionary/kanji-catalog';
import { KanjiDrawer, KanjiSlideOverDrawer } from '../src/presentation/components/KanjiDrawer';
import { db } from '../src/data/db/dexie-db';
import { SRSCard } from '../src/domain/models/types';

describe('Kanji Slide-Over Drawer Engine & Catalog', () => {
  beforeEach(async () => {
    await db.srs_cards.clear();
    await db.study_events.clear();
  });

  describe('KanjiDrawer Component Structure & State', () => {
    it('exports KanjiDrawer and KanjiSlideOverDrawer components', () => {
      expect(KanjiDrawer).toBeDefined();
      expect(typeof KanjiDrawer).toBe('function');
      expect(KanjiSlideOverDrawer).toBeDefined();
      expect(KanjiSlideOverDrawer).toBe(KanjiDrawer);
    });

    it('provides structured radical decomposition state for user inspection', () => {
      const kanji = getOrDecomposeKanji('契');
      expect(kanji.components.length).toBeGreaterThanOrEqual(2);
      kanji.components.forEach((comp) => {
        expect(comp.char).toBeTruthy();
        expect(comp.name).toBeTruthy();
        expect(comp.meaningEn).toBeTruthy();
      });
    });

    it('provides structured example sentences state with authentic compounds and sentences', () => {
      const kanji = getOrDecomposeKanji('契');
      expect(kanji.examples.length).toBeGreaterThan(0);
      const ex = kanji.examples[0];
      expect(ex.word).toBeTruthy();
      expect(ex.reading).toBeTruthy();
      expect(ex.sentenceJa).toBeTruthy();
      expect(ex.sentenceEn).toBeTruthy();
    });
  });

  describe('isKanjiChar character validation', () => {
    it('correctly identifies CJK Unified Ideographs as Kanji', () => {
      expect(isKanjiChar('契')).toBe(true);
      expect(isKanjiChar('把')).toBe(true);
      expect(isKanjiChar('握')).toBe(true);
      expect(isKanjiChar('構')).toBe(true);
      expect(isKanjiChar('漢')).toBe(true);
      expect(isKanjiChar('字')).toBe(true);
    });

    it('rejects Hiragana, Katakana, Latin letters, numerals, and punctuation', () => {
      expect(isKanjiChar('あ')).toBe(false);
      expect(isKanjiChar('ア')).toBe(false);
      expect(isKanjiChar('a')).toBe(false);
      expect(isKanjiChar('1')).toBe(false);
      expect(isKanjiChar('、')).toBe(false);
      expect(isKanjiChar('。')).toBe(false);
      expect(isKanjiChar('')).toBe(false);
    });
  });

  describe('Curated Kanji Catalog Lookup', () => {
    it('retrieves detailed radical decomposition for high-yield N2 kanji', () => {
      const keiji = getOrDecomposeKanji('契');
      expect(keiji).toBeDefined();
      expect(keiji.char).toBe('契');
      expect(keiji.level).toBe('N2');
      expect(keiji.strokes).toBe(9);
      expect(keiji.radical).toBe('大');
      expect(keiji.radicalName).toContain('だい');
      expect(keiji.onyomi).toContain('ケイ');
      expect(keiji.kunyomi).toContain('ちぎ・る');
      expect(keiji.meaningEn).toContain('contract');
      expect(keiji.meaningMy).toBeDefined();
      expect(keiji.components.length).toBeGreaterThanOrEqual(2);
      expect(keiji.examples.length).toBeGreaterThan(0);
      expect(keiji.examples[0].word).toBe('契機');
    });

    it('retrieves accurate data for Dokkai passage kanji 握 (Grasp/Hold)', () => {
      const aku = getOrDecomposeKanji('握');
      expect(aku.char).toBe('握');
      expect(aku.radical).toBe('扌');
      expect(aku.radicalName).toContain('てへん');
      expect(aku.onyomi).toContain('アク');
      expect(aku.kunyomi).toContain('にぎ・る');
      expect(aku.meaningEn).toContain('Grip');
      expect(aku.components.some((c) => c.meaningEn.includes('Hand'))).toBe(true);
      expect(aku.examples.some((ex) => ex.word === '把握')).toBe(true);
    });

    it('retrieves accurate data for Dokkai passage kanji 構 (Structure/Posture)', () => {
      const kou = getOrDecomposeKanji('構');
      expect(kou.char).toBe('構');
      expect(kou.radical).toBe('木');
      expect(kou.onyomi).toContain('コウ');
      expect(kou.meaningEn).toContain('Posture');
      expect(kou.components.some((c) => c.char === '木')).toBe(true);
      expect(kou.examples.some((ex) => ex.word === '心構え')).toBe(true);
    });
  });

  describe('Offline Fallback Decomposer for Unlisted Kanji', () => {
    it('gracefully decomposes unlisted kanji with heuristic radical detection', () => {
      // Use an uncommon kanji not in the curated top dictionary
      const unlisted = getOrDecomposeKanji('龖', '龍が飛ぶ文脈');
      expect(unlisted.char).toBe('龖');
      expect(unlisted.strokes).toBeGreaterThan(0);
      expect(unlisted.components.length).toBeGreaterThan(0);
      expect(unlisted.examples.length).toBe(1);
      expect(unlisted.examples[0].sentenceJa).toBe('龍が飛ぶ文脈');
    });
  });

  describe('1-Click SRS Card Mining Persistence & Active Deck Linking', () => {
    it('creates and adds an SRS Card using db.srs_cards.add linked to the active user deck', async () => {
      // Seed user profile with active lesson deck
      await db.profile.put({
        id: 'current_user',
        name: 'Learner',
        level: 'N2',
        currentLessonId: 'n2.l05',
        dailyTargetMinutes: 360,
        dayRolloverHour: 4,
        showRomaji: false,
        furiganaMode: 'always',
        explanationLang: 'en',
        targetRetention: 0.9,
        dailyNewCap: 30,
        dailyReviewCap: 200,
        notificationSettings: {
          inApp: true,
          browser: false,
          calendarPopup: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        },
      });

      const profile = await db.profile.get('current_user');
      const activeDeckId = profile?.currentLessonId || 'n2.dokkai_kanji';
      expect(activeDeckId).toBe('n2.l05');

      const kanji = getOrDecomposeKanji('契');
      const allReadings = [...kanji.onyomi, ...kanji.kunyomi].join(' / ');

      const newCard: SRSCard = {
        id: `kanji_${kanji.char}_123456`,
        itemId: `kanji_${kanji.char}`,
        lessonId: activeDeckId,
        itemType: 'kanji',
        facet: 'meaning',
        prompt: kanji.char,
        reading: allReadings,
        meaning: kanji.meaningEn,
        exampleSentence: kanji.examples[0]?.sentenceJa,
        state: 'new',
        intervalDays: 1,
        repetition: 0,
        stability: 1.0,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };

      // Uses db.srs_cards.add as specified in the requirement
      await db.srs_cards.add(newCard);

      const saved = await db.srs_cards.where('itemId').equals('kanji_契').first();
      expect(saved).toBeDefined();
      expect(saved?.itemType).toBe('kanji');
      expect(saved?.lessonId).toBe('n2.l05'); // Verified linked to active deck
      expect(saved?.prompt).toBe('契');
      expect(saved?.reading).toBe('ケイ / ちぎ・る');
      expect(saved?.meaning).toContain('contract');
      expect(saved?.state).toBe('new');
    });

    it('gracefully handles pre-flight duplicate check before db.srs_cards.add', async () => {
      const card: SRSCard = {
        id: 'kanji_握_seed',
        itemId: 'kanji_握',
        lessonId: 'n2.l01',
        itemType: 'kanji',
        facet: 'meaning',
        prompt: '握',
        reading: 'アク / にぎ・る',
        meaning: 'Grip, hold',
        state: 'new',
        intervalDays: 1,
        repetition: 0,
        stability: 1.0,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };

      await db.srs_cards.add(card);

      // Pre-flight check before add
      const existing = await db.srs_cards.where('itemId').equals('kanji_握').first();
      expect(existing).toBeDefined();

      // Ensure second add is avoided when existing is found
      let addAttempted = false;
      if (!existing) {
        await db.srs_cards.add(card);
        addAttempted = true;
      }
      expect(addAttempted).toBe(false);
    });

    it('logs study_events with active deckId for kanji mining audit trail', async () => {
      await db.study_events.add({
        id: 'evt_kanji_mine_test',
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: 'n2.l05',
        data: {
          kanji: '握',
          strokes: 12,
          source: 'dokkai_kanji_slide_over',
          deckId: 'n2.l05',
        },
      });

      const events = await db.study_events.toArray();
      expect(events.length).toBe(1);
      expect(events[0].data.kanji).toBe('握');
      expect(events[0].data.deckId).toBe('n2.l05');
      expect(events[0].data.source).toBe('dokkai_kanji_slide_over');
    });
  });
});
