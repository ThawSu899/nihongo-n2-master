import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { QuickSearchEngine } from '../src/domain/search/quick-search-engine';
import { db } from '../src/data/db/dexie-db';

describe('QuickSearchEngine: Global Command Palette Search', () => {
  beforeEach(async () => {
    await db.srs_cards.clear();
  });

  it('returns empty array when query is blank or whitespace', async () => {
    const res1 = await QuickSearchEngine.search('');
    const res2 = await QuickSearchEngine.search('   ');
    expect(res1).toEqual([]);
    expect(res2).toEqual([]);
  });

  it('searches curated Kanji by character, readings, and English meaning', async () => {
    const resChar = await QuickSearchEngine.search('契');
    expect(resChar.some((r) => r.category === 'kanji' && r.title === '契')).toBe(true);

    const resReading = await QuickSearchEngine.search('けい');
    expect(resReading.some((r) => r.category === 'kanji' && r.title === '契')).toBe(true);

    const resMeaning = await QuickSearchEngine.search('pledge');
    expect(resMeaning.some((r) => r.category === 'kanji' && r.title === '契')).toBe(true);
  });

  it('searches N2 Grammar patterns by pattern name and formation', async () => {
    const resGrammar = await QuickSearchEngine.search('契機');
    expect(resGrammar.some((r) => r.category === 'grammar' && r.title.includes('契機'))).toBe(true);

    const resFormation = await QuickSearchEngine.search('名詞');
    expect(resFormation.some((r) => r.category === 'grammar')).toBe(true);
  });

  it('searches vocabulary terms from Choukai & Dokkai catalogs', async () => {
    const resVocab = await QuickSearchEngine.search('把握');
    expect(resVocab.some((r) => r.category === 'vocab' || r.category === 'kanji')).toBe(true);
  });

  it('searches Dexie SRS cards and flags leeches with warning badge', async () => {
    await db.srs_cards.add({
      id: 'test_card_1',
      itemId: 'item_test_1',
      lessonId: 'n2.l01',
      itemType: 'vocab',
      facet: 'meaning',
      prompt: '妥協',
      reading: 'だきょう',
      meaning: 'Compromise',
      state: 'review',
      intervalDays: 1,
      repetition: 2,
      stability: 1.0,
      difficulty: 3,
      lapses: 4,
      isLeech: true,
      due: new Date().toISOString(),
    });

    const res = await QuickSearchEngine.search('妥協');
    const srsItem = res.find((r) => r.category === 'srs_card');
    expect(srsItem).toBeDefined();
    expect(srsItem?.badge).toContain('Leech');
  });

  it('sorts exact matches higher than partial matches', async () => {
    const res = await QuickSearchEngine.search('契');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title).toBe('契');
  });
});
