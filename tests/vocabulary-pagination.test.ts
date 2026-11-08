import { describe, it, expect } from 'vitest';
import {
  chunkVocabulary,
  getChunkIndexForVocabIndex,
  formatPartBadge,
  VocabularyItem,
} from '../src/domain/curriculum/vocabulary-pagination';

describe('Vocabulary Sub-Batch Pagination', () => {
  const createMockItem = (index: number, lessonId = 'n2.l01'): VocabularyItem => ({
    id: `${lessonId}-v${index.toString().padStart(2, '0')}`,
    lessonId,
    ja: `単語${index}`,
    kana: `たんご${index}`,
    en: `Word ${index}`,
    meaningMyanmar: `ဝေါဟာရ ${index}`,
    pos: 'noun',
    kanjiIds: [],
    level: 'N2',
    difficulty: 3,
    importance: 4,
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: { source: 'curated', license: 'CC-BY-4.0', status: 'native_verified', updatedAt: '2026-01-01', rev: 1 },
    pitchPattern: 'heiban',
    dropIndex: 0,
  });

  it('handles empty or invalid vocabulary array gracefully', () => {
    expect(chunkVocabulary([])).toEqual([]);
    expect(chunkVocabulary(null as any)).toEqual([]);
    expect(chunkVocabulary(undefined as any)).toEqual([]);
  });

  it('returns a single chunk when items count <= chunkSize (e.g. 12 items)', () => {
    const items = Array.from({ length: 12 }, (_, i) => createMockItem(i + 1));
    const chunks = chunkVocabulary(items, 15);

    expect(chunks.length).toBe(1);
    expect(chunks[0].partNumber).toBe(1);
    expect(chunks[0].startIndex).toBe(0);
    expect(chunks[0].endIndex).toBe(11);
    expect(chunks[0].itemCount).toBe(12);
    expect(chunks[0].title).toBe('Part 1: Items 1–12');
    expect(chunks[0].items.length).toBe(12);
  });

  it('splits high-density lessons (35 items) into 3 clean chunks of 15, 15, and 5', () => {
    const items = Array.from({ length: 35 }, (_, i) => createMockItem(i + 1));
    const chunks = chunkVocabulary(items, 15);

    expect(chunks.length).toBe(3);

    // Part 1
    expect(chunks[0].partNumber).toBe(1);
    expect(chunks[0].startIndex).toBe(0);
    expect(chunks[0].endIndex).toBe(14);
    expect(chunks[0].itemCount).toBe(15);
    expect(chunks[0].title).toBe('Part 1: Items 1–15');
    expect(chunks[0].items[0].ja).toBe('単語1');
    expect(chunks[0].items[14].ja).toBe('単語15');

    // Part 2
    expect(chunks[1].partNumber).toBe(2);
    expect(chunks[1].startIndex).toBe(15);
    expect(chunks[1].endIndex).toBe(29);
    expect(chunks[1].itemCount).toBe(15);
    expect(chunks[1].title).toBe('Part 2: Items 16–30');
    expect(chunks[1].items[0].ja).toBe('単語16');
    expect(chunks[1].items[14].ja).toBe('単語30');

    // Part 3
    expect(chunks[2].partNumber).toBe(3);
    expect(chunks[2].startIndex).toBe(30);
    expect(chunks[2].endIndex).toBe(34);
    expect(chunks[2].itemCount).toBe(5);
    expect(chunks[2].title).toBe('Part 3: Items 31–35');
    expect(chunks[2].items[0].ja).toBe('単語31');
    expect(chunks[2].items[4].ja).toBe('単語35');
  });

  it('calculates the correct chunk index for a given global vocabulary index', () => {
    expect(getChunkIndexForVocabIndex(0, 15)).toBe(0);
    expect(getChunkIndexForVocabIndex(14, 15)).toBe(0);
    expect(getChunkIndexForVocabIndex(15, 15)).toBe(1);
    expect(getChunkIndexForVocabIndex(29, 15)).toBe(1);
    expect(getChunkIndexForVocabIndex(30, 15)).toBe(2);
    expect(getChunkIndexForVocabIndex(44, 15)).toBe(2);
    expect(getChunkIndexForVocabIndex(45, 15)).toBe(3);
    expect(getChunkIndexForVocabIndex(-5, 15)).toBe(0);
  });

  it('formats user-friendly badge labels', () => {
    expect(formatPartBadge(1, 0, 14)).toBe('Part 1 (1–15)');
    expect(formatPartBadge(2, 15, 29)).toBe('Part 2 (16–30)');
    expect(formatPartBadge(3, 30, 34)).toBe('Part 3 (31–35)');
  });
});
