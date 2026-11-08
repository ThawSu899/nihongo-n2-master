import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentLoader } from '../src/data/content/content-loader';
import {
  LevelBulkStudyScreen,
  generateQuizSession,
} from '../src/presentation/screens/LevelBulkStudyScreen';
import { quarantineCard } from '../src/domain/fsrs/quarantine-engine';
import { db } from '../src/data/db/dexie-db';

describe('LevelBulkStudyScreen & ContentLoader Bulk Vocabulary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates and deduplicates vocabulary for N5', async () => {
    const n5Vocab = await ContentLoader.getVocabularyForLevel('N5');
    expect(n5Vocab.length).toBeGreaterThan(0);
    // All items must be N5 level
    const nonN5 = n5Vocab.filter((v) => v.level !== 'N5');
    expect(nonN5.length).toBe(0);

    // Verify deduplication: no duplicate (ja + kana)
    const seen = new Set<string>();
    for (const v of n5Vocab) {
      const key = `${v.ja}_${v.kana}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('aggregates and deduplicates vocabulary for N2', async () => {
    const n2Vocab = await ContentLoader.getVocabularyForLevel('N2');
    expect(n2Vocab.length).toBeGreaterThan(0);
    const nonN2 = n2Vocab.filter((v) => v.level !== 'N2');
    expect(nonN2.length).toBe(0);
  });

  it('generates a 10-question multiple-choice quiz session with 4 choices per question', async () => {
    const n5Vocab = await ContentLoader.getVocabularyForLevel('N5');
    const quiz = generateQuizSession(n5Vocab, 10);

    expect(quiz.length).toBe(10);
    for (const q of quiz) {
      expect(q.vocab).toBeDefined();
      expect(q.correctAnswer).toBeDefined();
      expect(q.correctAnswer.length).toBeGreaterThan(0);
      expect(q.options.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
      // Ensure choices are distinct
      const uniqueOptions = new Set(q.options);
      expect(uniqueOptions.size).toBe(4);
    }
  });

  it('renders LevelBulkStudyScreen with 3-mode switcher tabs without crashing', () => {
    const html = renderToString(
      React.createElement(LevelBulkStudyScreen, {
        onBack: () => {},
        initialLevel: 'N5',
      })
    );

    expect(html).toContain('Level Decks');
    expect(html).toContain('単語帳');
    expect(html).toContain('JLPT N5');
    expect(html).toContain('JLPT N4');
    expect(html).toContain('JLPT N3');
    expect(html).toContain('JLPT N2');
    expect(html).toContain('Search N5 words');
    expect(html).toContain('စာရင်းကြည့် (List View)');
    expect(html).toContain('Flashcard လေ့ကျင့်ရန် (Drill Mode)');
    expect(html).toContain('အမြန်စစ်ဆေးမေးခွန်း (Quiz Mode)');
  });

  it('connects mistakes and lapses to FSRS Ghost Card Quarantine idempotently', async () => {
    const vocabItem = {
      id: 'bulk-study-lapse-test-01',
      itemType: 'vocabulary' as const,
      wordOrPattern: '失敗',
      reading: 'しっぱい',
      meaningBurmese: 'ကျရှုံးခြင်း၊ အမှား',
      meaningEn: 'Failure / mistake',
      jlptLevel: 'N4' as const,
      quarantineReason: 'MOCK_TEST_REPEATED_MISS' as const,
    };

    // Simulate quiz miss
    const quarantined = await quarantineCard(vocabItem);
    expect(quarantined.id).toBe(vocabItem.id);
    expect(quarantined.lapses).toBe(1);
    expect(quarantined.quarantineReason).toBe('MOCK_TEST_REPEATED_MISS');

    // Verify stored in DB
    const inDb = await db.quarantined_cards.get(vocabItem.id);
    expect(inDb).toBeDefined();
    expect(inDb?.wordOrPattern).toBe('失敗');

    // Simulate subsequent flashcard drill lapse on same item
    const lapsedAgain = await quarantineCard({
      ...vocabItem,
      quarantineReason: 'HIGH_LAPSE_COUNT',
    });
    expect(lapsedAgain.lapses).toBe(2);
    expect(lapsedAgain.recoveryStreak).toBe(0);

    const countInDb = await db.quarantined_cards.where('id').equals(vocabItem.id).count();
    expect(countInDb).toBe(1);
  });
});
