import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('N2 Burmese Question Explanations & Reading Translations Integrity', () => {
  const packsDir = path.resolve(process.cwd(), 'content/packs/n2');
  const questionPackIds = ['n2.l04', 'n2.l05', 'n2.l06', 'n2.l07', 'n2.l08', 'n2.l09', 'n2.l10'];
  const readingPackIds = ['n2.l04', 'n2.l05', 'n2.l06', 'n2.l07', 'n2.l08', 'n2.l09', 'n2.l10', 'n2.l11'];

  it('all 210 questions across n2.l04 to n2.l10 have non-empty explanationMy string', () => {
    let totalQuestionsChecked = 0;
    for (const packId of questionPackIds) {
      const filePath = path.join(packsDir, `${packId}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(30);

      data.questions.forEach((q: any, idx: number) => {
        totalQuestionsChecked++;
        expect(typeof q.explanationMy).toBe('string');
        expect(q.explanationMy.trim().length).toBeGreaterThan(0);
        // Ensure original explanation is preserved
        expect(typeof q.explanation).toBe('string');
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      });
    }
    expect(totalQuestionsChecked).toBe(210);
  });

  it('all 8 reading passages across n2.l04 to n2.l11 have non-empty translationMy string', () => {
    let totalReadingsChecked = 0;
    for (const packId of readingPackIds) {
      const filePath = path.join(packsDir, `${packId}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data.reading).toBeDefined();
      expect(typeof data.reading.translationMy).toBe('string');
      expect(data.reading.translationMy.trim().length).toBeGreaterThan(0);
      expect(typeof data.reading.translation).toBe('string');
      expect(data.reading.translation.trim().length).toBeGreaterThan(0);
      totalReadingsChecked++;
    }
    expect(totalReadingsChecked).toBe(8);
  });

  it('preserves top-level metadata across all 8 touched packs', () => {
    for (const packId of readingPackIds) {
      const filePath = path.join(packsDir, `${packId}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data.id).toBe(packId);
      expect(data.level).toBe('N2');
      expect(typeof data.title).toBe('string');
      expect(data.title.length).toBeGreaterThan(0);
      expect(Array.isArray(data.grammars)).toBe(true);
      expect(Array.isArray(data.vocabularies)).toBe(true);
    }
  });
});
