import { ContentLoader } from '../../data/content/content-loader';
import { CURATED_KANJI_CATALOG } from '../dictionary/kanji-catalog';

export interface KanjiCardItem {
  id: string;
  literal: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2';
  onyomi: string[];
  kunyomi: string[];
  meaningBurmese: string;
  meaningEn: string;
  strokeCount: number;
  radicals?: string[];
  examples?: { word: string; reading: string; meaningBurmese: string }[];
}

/**
 * Extracts and deduplicates canonical Kanji for a given JLPT level.
 * Aggregates items from lesson packs and enriches them with the curated catalog.
 */
export async function extractKanjiForLevel(
  level: 'N5' | 'N4' | 'N3' | 'N2'
): Promise<KanjiCardItem[]> {
  const packs = await ContentLoader.getPacksForLevel(level);
  const seenLiterals = new Set<string>();
  const items: KanjiCardItem[] = [];

  for (const pack of packs) {
    if (Array.isArray(pack.kanjis)) {
      for (const k of pack.kanjis) {
        if (!k.char || seenLiterals.has(k.char)) continue;
        seenLiterals.add(k.char);

        const catalogEntry = CURATED_KANJI_CATALOG[k.char];

        const meaningBurmese =
          k.meaningMyanmar ||
          k.meaningMy ||
          k.myanmar ||
          catalogEntry?.meaningMy ||
          k.meaning ||
          '';

        const meaningEn = k.meaning || catalogEntry?.meaningEn || 'Kanji character';

        const strokeCount = k.strokes || catalogEntry?.strokes || 1;

        const onyomi =
          k.onyomi && k.onyomi.length > 0 ? k.onyomi : catalogEntry?.onyomi || [];

        const kunyomi =
          k.kunyomi && k.kunyomi.length > 0 ? k.kunyomi : catalogEntry?.kunyomi || [];

        const radicals =
          k.components && k.components.length > 0
            ? k.components
            : catalogEntry?.components?.map((c) => `${c.char} (${c.name})`) ||
              (catalogEntry?.radical ? [catalogEntry.radical] : undefined);

        const examples =
          k.exampleVocab && k.exampleVocab.length > 0
            ? k.exampleVocab.map((ex) => ({
                word: ex.word,
                reading: ex.reading,
                meaningBurmese:
                  ex.meaningMyanmar || ex.meaningMy || ex.meaning || '',
              }))
            : catalogEntry?.examples?.map((ex) => ({
                word: ex.word,
                reading: ex.reading,
                meaningBurmese: ex.meaningMy || ex.meaningEn || '',
              })) || [];

        items.push({
          id: k.id || `${level.toLowerCase()}-k-${k.char}`,
          literal: k.char,
          jlptLevel: level,
          onyomi,
          kunyomi,
          meaningBurmese,
          meaningEn,
          strokeCount,
          radicals,
          examples,
        });
      }
    }
  }

  // Also supplement with any curated catalog kanji registered under this level
  for (const [char, detail] of Object.entries(CURATED_KANJI_CATALOG)) {
    if (detail.level === level && !seenLiterals.has(char)) {
      seenLiterals.add(char);
      items.push({
        id: `${level.toLowerCase()}-curated-${char}`,
        literal: char,
        jlptLevel: level,
        onyomi: detail.onyomi || [],
        kunyomi: detail.kunyomi || [],
        meaningBurmese: detail.meaningMy || detail.meaningEn,
        meaningEn: detail.meaningEn,
        strokeCount: detail.strokes || 1,
        radicals:
          detail.components?.map((c) => `${c.char} (${c.name})`) ||
          (detail.radical ? [detail.radical] : undefined),
        examples: detail.examples?.map((ex) => ({
          word: ex.word,
          reading: ex.reading,
          meaningBurmese: ex.meaningMy || ex.meaningEn,
        })),
      });
    }
  }

  return items;
}
