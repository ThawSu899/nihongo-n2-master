import { Vocabulary } from '../models/types';

export type VocabularyItem = Vocabulary;

export interface VocabularyChunk {
  partNumber: number;
  title: string;
  items: VocabularyItem[];
  startIndex: number;
  endIndex: number;
  totalParts: number;
  itemCount: number;
}

export const DEFAULT_VOCAB_CHUNK_SIZE = 15;

/**
 * Dynamically splits a lesson's vocabulary array into clean chunks of 15 items per batch.
 * Generates structured sub-batch labels (e.g., Part 1: Items 1–15, Part 2: Items 16–30).
 * Gracefully handles lessons with fewer than 15 items (returns a single chunk seamlessly).
 */
export function chunkVocabulary(
  vocabulary: VocabularyItem[],
  chunkSize: number = DEFAULT_VOCAB_CHUNK_SIZE
): VocabularyChunk[] {
  if (!Array.isArray(vocabulary) || vocabulary.length === 0) {
    return [];
  }

  const effectiveChunkSize = chunkSize > 0 ? Math.floor(chunkSize) : DEFAULT_VOCAB_CHUNK_SIZE;
  const totalItems = vocabulary.length;
  const totalParts = Math.ceil(totalItems / effectiveChunkSize);

  const chunks: VocabularyChunk[] = [];

  for (let i = 0; i < totalParts; i++) {
    const startIndex = i * effectiveChunkSize;
    const endIndex = Math.min(startIndex + effectiveChunkSize - 1, totalItems - 1);
    const items = vocabulary.slice(startIndex, endIndex + 1);
    const partNumber = i + 1;
    const title = `Part ${partNumber}: Items ${startIndex + 1}–${endIndex + 1}`;

    chunks.push({
      partNumber,
      title,
      items,
      startIndex,
      endIndex,
      totalParts,
      itemCount: items.length,
    });
  }

  return chunks;
}

/**
 * Calculates which chunk index (0-based) contains the given global vocabulary index.
 */
export function getChunkIndexForVocabIndex(
  vocabIndex: number,
  chunkSize: number = DEFAULT_VOCAB_CHUNK_SIZE
): number {
  if (vocabIndex <= 0) return 0;
  const size = chunkSize > 0 ? Math.floor(chunkSize) : DEFAULT_VOCAB_CHUNK_SIZE;
  return Math.floor(vocabIndex / size);
}

/**
 * Formats a clean, user-friendly badge label for a sub-batch part.
 * E.g., "Part 1 (1–15)" or "Part 2 (16–30)"
 */
export function formatPartBadge(
  partNumber: number,
  startIndex: number,
  endIndex: number
): string {
  return `Part ${partNumber} (${startIndex + 1}–${endIndex + 1})`;
}
