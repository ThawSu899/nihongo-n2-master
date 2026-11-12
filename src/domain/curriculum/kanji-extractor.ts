import { ContentLoader } from '../../data/content/content-loader';
import { CURATED_KANJI_CATALOG } from '../dictionary/kanji-catalog';

export interface KanjiCardItem {
  id: string;
  literal: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2';
  lessonId?: string;
  onyomi: string[];
  kunyomi: string[];
  meaningBurmese: string;
  meaningEn: string;
  strokeCount: number;
  radicals?: string[];
  examples?: { word: string; reading: string; meaningBurmese: string }[];
}

const LOWER_LEVELS: Record<'N5' | 'N4' | 'N3' | 'N2', ('N5' | 'N4' | 'N3' | 'N2')[]> = {
  N5: [],
  N4: ['N5'],
  N3: ['N5', 'N4'],
  N2: ['N5', 'N4', 'N3'],
};

// In-memory cache for raw level extractions to accelerate lookup & avoid repeated disk IO
const rawLevelCache = new Map<'N5' | 'N4' | 'N3' | 'N2', KanjiCardItem[]>();
const levelExtractCache = new Map<'N5' | 'N4' | 'N3' | 'N2', KanjiCardItem[]>();

export function clearKanjiExtractorCache(): void {
  rawLevelCache.clear();
  levelExtractCache.clear();
}

async function extractRawKanji(level: 'N5' | 'N4' | 'N3' | 'N2'): Promise<KanjiCardItem[]> {
  if (rawLevelCache.has(level)) {
    return rawLevelCache.get(level)!;
  }

  const packs = await ContentLoader.getPacksForLevel(level);
  const seenLiterals = new Set<string>();
  const items: KanjiCardItem[] = [];

  const hasRomaji = (arr: string[]) => arr.some((s) => /[A-Za-z]/.test(s));

  for (const pack of packs) {
    if (Array.isArray(pack.kanjis)) {
      for (const k of pack.kanjis) {
        if (!k.char || seenLiterals.has(k.char)) continue;
        seenLiterals.add(k.char);

        const catalogEntry = CURATED_KANJI_CATALOG[k.char];

        let meaningBurmese =
          k.meaningMyanmar ||
          k.meaningMy ||
          k.myanmar ||
          catalogEntry?.meaningMy ||
          '';

        // Ensure Burmese meaning is never blank or English-only
        if (!meaningBurmese || /^[\x00-\x7F]+$/.test(meaningBurmese.trim())) {
          if (catalogEntry?.meaningMy && !/^[\x00-\x7F]+$/.test(catalogEntry.meaningMy)) {
            meaningBurmese = catalogEntry.meaningMy;
          } else {
            meaningBurmese = `ခန်းဂျီးစာလုံး (${k.char})`;
          }
        }

        const meaningEn = k.meaning || catalogEntry?.meaningEn || 'Kanji character';

        // Prefer verified dictionary stroke count over unverified pack metadata
        const strokeCount = catalogEntry?.strokes || k.strokes || 1;

        // Clean phonetic readings: reject any uppercase or lowercase Romaji in favor of catalog Katakana/Hiragana
        const onyomi =
          k.onyomi && k.onyomi.length > 0 && !hasRomaji(k.onyomi)
            ? k.onyomi
            : catalogEntry?.onyomi || [];

        const kunyomi =
          k.kunyomi && k.kunyomi.length > 0 && !hasRomaji(k.kunyomi)
            ? k.kunyomi
            : catalogEntry?.kunyomi || [];

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
                  ex.meaningMyanmar || ex.meaningMy || catalogEntry?.examples?.[0]?.meaningMy || 'ဥပမာဝေါဟာရ',
              }))
            : catalogEntry?.examples?.map((ex) => ({
                word: ex.word,
                reading: ex.reading,
                meaningBurmese: ex.meaningMy || 'ဥပမာဝေါဟာရ',
              })) || [];

        items.push({
          id: k.id || `${level.toLowerCase()}-k-${k.char}`,
          literal: k.char,
          jlptLevel: level,
          lessonId: pack.id,
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

  // Supplement with any curated catalog kanji registered under this level
  for (const [char, detail] of Object.entries(CURATED_KANJI_CATALOG)) {
    if (detail.level === level && !seenLiterals.has(char)) {
      seenLiterals.add(char);
      items.push({
        id: `${level.toLowerCase()}-curated-${char}`,
        literal: char,
        jlptLevel: level,
        onyomi: detail.onyomi || [],
        kunyomi: detail.kunyomi || [],
        meaningBurmese: detail.meaningMy || `ခန်းဂျီးစာလုံး (${char})`,
        meaningEn: detail.meaningEn,
        strokeCount: detail.strokes || 1,
        radicals:
          detail.components?.map((c) => `${c.char} (${c.name})`) ||
          (detail.radical ? [detail.radical] : undefined),
        examples: detail.examples?.map((ex) => ({
          word: ex.word,
          reading: ex.reading,
          meaningBurmese: ex.meaningMy || 'ဥပမာဝေါဟာရ',
        })),
      });
    }
  }

  rawLevelCache.set(level, items);
  return items;
}

/**
 * Extracts and deduplicates canonical Kanji for a given JLPT level with strict cross-level deduplication:
 * - N5: Canonical N5 Kanji (from packs and curated catalog)
 * - N4: Canonical N4 Kanji (excluding all N5 Kanji)
 * - N3: Canonical N3 Kanji (excluding all N5 and N4 Kanji)
 * - N2: Canonical N2 Kanji (excluding all N5, N4, and N3 Kanji)
 */
export async function extractKanjiForLevel(
  level: 'N5' | 'N4' | 'N3' | 'N2'
): Promise<KanjiCardItem[]> {
  if (levelExtractCache.has(level)) {
    return levelExtractCache.get(level)!;
  }

  // 1. Gather all excluded literals from lower levels
  const excludedLiterals = new Set<string>();
  for (const lowerLevel of LOWER_LEVELS[level]) {
    const lowerItems = await extractRawKanji(lowerLevel);
    for (const item of lowerItems) {
      excludedLiterals.add(item.literal);
    }
  }

  // 2. Extract raw items for the current level
  const rawItems = await extractRawKanji(level);

  // 3. Filter out any kanji characters already introduced in lower levels
  const deduplicatedItems = rawItems.filter((item) => !excludedLiterals.has(item.literal));

  levelExtractCache.set(level, deduplicatedItems);
  return deduplicatedItems;
}
