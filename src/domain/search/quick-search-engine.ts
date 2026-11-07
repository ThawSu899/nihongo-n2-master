/**
 * Quick Search Engine for Global Command Palette
 * Performs fast, fuzzy, offline querying across Kanji, Vocabulary, Grammar, and Dexie SRS cards.
 */

import { CURATED_KANJI_CATALOG, KanjiDetail } from '../dictionary/kanji-catalog';
import { CHOUKAI_SCENARIOS } from '../assessment/choukai-catalog';
import { CURATED_DOKKAI_CATALOG } from '../assessment/dokkai-catalog';
import {
  N5_COUNTERS_TABLE,
  N5_CONVERSATIONAL_EXPRESSIONS,
  N5_CALENDAR_DATES,
  N5_PHONETIC_SHIFTS,
} from '../curriculum/n5-expressions-catalog';
import { N5_COMMON_MISTAKES_CATALOG } from '../curriculum/n5-common-mistakes-catalog';
import { db } from '../../data/db/dexie-db';
import { SRSCard } from '../models/types';

export interface QuickSearchResult {
  id: string;
  category: 'kanji' | 'vocab' | 'grammar' | 'srs_card' | 'counter' | 'expression' | 'trap';
  title: string;
  reading?: string;
  meaningEn: string;
  meaningMy?: string;
  badge: string;
  detail?: string;
  kanjiData?: KanjiDetail;
  srsCardData?: SRSCard;
  referenceTab?: 'counters' | 'expressions' | 'mistakes';
}

// Curated high-frequency JLPT N2 grammar patterns for instant lookup
export const CURATED_N2_GRAMMAR = [
  {
    id: 'n2_g_keiki',
    pattern: '〜を契機に / 〜を契機として',
    formation: '名詞 ＋ を契機に',
    meaningEn: 'As a result of; Taking ... as an opportunity / turning point',
    meaningMy: '...ကို အခွင့်အရေး / အလှည့်အပြောင်းအဖြစ် ယူ၍',
    example: '転勤を契機に新しい言語の学習を始めた。',
    level: 'N2',
  },
  {
    id: 'n2_g_saishite',
    pattern: '〜に際して / 〜に際し',
    formation: '動詞辞書形 / 名詞 ＋ に際して',
    meaningEn: 'On the occasion of; At the time of; Prior to',
    meaningMy: '...ပြုလုပ်ရာတွင် / ...အခိုက်အတန့်တွင်',
    example: '新事業の立ち上げに際して、綿密な計画を策定した。',
    level: 'N2',
  },
  {
    id: 'n2_g_motoduite',
    pattern: '〜に基づいて / 〜に基づき',
    formation: '名詞 ＋ に基づいて',
    meaningEn: 'Based on; On the basis of',
    meaningMy: '...ကို အခြေခံ၍ / ...အပေါ် မူတည်၍',
    example: '綿密な市場調査の結果に基づいて経営判断を下す。',
    level: 'N2',
  },
  {
    id: 'n2_g_megutte',
    pattern: '〜をめぐって / 〜をめぐる',
    formation: '名詞 ＋ をめぐって',
    meaningEn: 'Concerning; In dispute over; Centering around',
    meaningMy: '...နှင့် ပတ်သက်၍ အငြင်းပွားခြင်း / ဗဟိုပြုခြင်း',
    example: '新制度の導入をめぐって激しい議論が交わされた。',
    level: 'N2',
  },
  {
    id: 'n2_g_shidai',
    pattern: '〜次第（で / だ）',
    formation: '名詞 ＋ 次第だ / 次第で',
    meaningEn: 'Depending on; As soon as (when with verb stem)',
    meaningMy: '...အပေါ် မူတည်၍ / ...ပြီးသည်နှင့်တပြိုင်နက်',
    example: '努力次第で可能性はいくらでも広がる。',
    level: 'N2',
  },
  {
    id: 'n2_g_totan',
    pattern: '〜とたん（に）',
    formation: '動詞た形 ＋ とたんに',
    meaningEn: 'The moment that; Just as; As soon as',
    meaningMy: '...ပြီးပြီးချင်း ချက်ချင်း',
    example: 'ドアを開けたとたんに冷たい風が吹き込んできた。',
    level: 'N2',
  },
  {
    id: 'n2_g_ippou',
    pattern: '〜一方（で）',
    formation: '名詞・形容詞・動詞普通形 ＋ 一方で',
    meaningEn: 'On one hand ..., but on the other hand ...; Meanwhile',
    meaningMy: 'တစ်ဖက်တွင် ... ဖြစ်သော်လည်း အခြားတစ်ဖက်တွင် ...',
    example: '利便性が高まる一方で、セキュリティ上のリスクも懸念される。',
    level: 'N2',
  },
  {
    id: 'n2_g_tomonatte',
    pattern: '〜に伴って / 〜に伴い',
    formation: '動詞辞書形 / 名詞 ＋ に伴って',
    meaningEn: 'Along with; As ... changes; Consequent upon',
    meaningMy: '...နှင့်အတူ လိုက်လျောညီထွေ ပြောင်းလဲခြင်း',
    example: '人口の高齢化に伴って医療費の負担が増加している。',
    level: 'N2',
  },
  {
    id: 'n2_g_wakenihakanai',
    pattern: '〜わけにはいかない',
    formation: '動詞辞書形 / ない形 ＋ わけにはいかない',
    meaningEn: 'Cannot afford to; Must not; Impossible to (for social/moral reasons)',
    meaningMy: '...လုပ်၍ မဖြစ်ပါ / ...မလုပ်ဘဲ နေ၍ မရပါ',
    example: '大切な約束がある以上、遅刻するわけにはいかない。',
    level: 'N2',
  },
];

export class QuickSearchEngine {
  /**
   * Search across all dictionaries and user database
   */
  static async search(query: string, maxResults = 25): Promise<QuickSearchResult[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const results: QuickSearchResult[] = [];
    const seenIds = new Set<string>();

    // 1. Search Curated Kanji Catalog
    for (const [char, k] of Object.entries(CURATED_KANJI_CATALOG)) {
      const matchChar = char === cleanQuery || char.includes(cleanQuery);
      const matchReading =
        k.onyomi.some((o) => o.toLowerCase().includes(cleanQuery)) ||
        k.kunyomi.some((ku) => ku.toLowerCase().includes(cleanQuery));
      const matchMeaning = k.meaningEn.toLowerCase().includes(cleanQuery);
      const matchMy = k.meaningMy && k.meaningMy.includes(cleanQuery);
      const matchExamples = k.examples.some(
        (ex) =>
          ex.word.includes(cleanQuery) ||
          ex.reading.includes(cleanQuery) ||
          ex.meaningEn.toLowerCase().includes(cleanQuery)
      );

      if (matchChar || matchReading || matchMeaning || matchMy || matchExamples) {
        const id = `kanji_${char}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'kanji',
            title: char,
            reading: [...k.onyomi, ...k.kunyomi].join(' / '),
            meaningEn: k.meaningEn,
            meaningMy: k.meaningMy,
            badge: `JLPT ${k.level}`,
            detail: `${k.strokes} 画 · 部首: ${k.radical} (${k.radicalName})`,
            kanjiData: k,
          });
        }
      }
    }

    // 2. Search Curated N2 Grammar Patterns
    for (const g of CURATED_N2_GRAMMAR) {
      const matchPattern = g.pattern.toLowerCase().includes(cleanQuery);
      const matchFormation = g.formation.toLowerCase().includes(cleanQuery);
      const matchMeaning = g.meaningEn.toLowerCase().includes(cleanQuery);
      const matchMy = g.meaningMy && g.meaningMy.includes(cleanQuery);

      if (matchPattern || matchFormation || matchMeaning || matchMy) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          results.push({
            id: g.id,
            category: 'grammar',
            title: g.pattern,
            reading: g.formation,
            meaningEn: g.meaningEn,
            meaningMy: g.meaningMy,
            badge: `Grammar ${g.level}`,
            detail: g.example,
          });
        }
      }
    }

    // 3. Search Key Vocabulary from Choukai & Dokkai Catalogs
    for (const scenario of CHOUKAI_SCENARIOS) {
      for (const vocab of scenario.keyVocabulary) {
        const matchTerm = vocab.term.toLowerCase().includes(cleanQuery);
        const matchReading = vocab.reading.toLowerCase().includes(cleanQuery);
        const matchEn = vocab.meaningEn.toLowerCase().includes(cleanQuery);
        const matchMy = vocab.meaningMy && vocab.meaningMy.includes(cleanQuery);

        if (matchTerm || matchReading || matchEn || matchMy) {
          const id = `vocab_${vocab.term}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              category: 'vocab',
              title: vocab.term,
              reading: vocab.reading,
              meaningEn: vocab.meaningEn,
              meaningMy: vocab.meaningMy,
              badge: 'Choukai Vocab',
              detail: `Part of Speech: ${vocab.pos}`,
            });
          }
        }
      }
    }

    for (const dokkai of CURATED_DOKKAI_CATALOG) {
      for (const g of dokkai.glossary) {
        const matchTerm = g.term.toLowerCase().includes(cleanQuery);
        const matchReading = g.reading.toLowerCase().includes(cleanQuery);
        const matchEn = g.meaningEn.toLowerCase().includes(cleanQuery);
        const matchMy = g.meaningMy && g.meaningMy.includes(cleanQuery);

        if (matchTerm || matchReading || matchEn || matchMy) {
          const id = `vocab_dokkai_${g.term}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              category: 'vocab',
              title: g.term,
              reading: g.reading,
              meaningEn: g.meaningEn,
              meaningMy: g.meaningMy,
              badge: 'Dokkai Glossary',
              detail: g.reading,
            });
          }
        }
      }
    }

    // 4. Search N5 Counters & Specific Counter Items
    const strippedQuery = cleanQuery.replace(/^[~〜]/, '');
    for (const [key, counter] of Object.entries(N5_COUNTERS_TABLE)) {
      const matchCounterKanji = counter.counterKanji.includes(cleanQuery) || (strippedQuery ? counter.counterKanji.includes(strippedQuery) : false);
      const matchCounterKana = counter.counterKana.toLowerCase().includes(cleanQuery) || (strippedQuery ? counter.counterKana.toLowerCase().includes(strippedQuery) : false);
      const matchTargetEn = counter.targetCategoryEn.toLowerCase().includes(cleanQuery);
      const matchTargetMy = counter.targetCategoryMy.includes(cleanQuery);
      const matchQuestionJa = counter.questionWord.japanese.toLowerCase().includes(cleanQuery);
      const matchQuestionKana = counter.questionWord.kana.toLowerCase().includes(cleanQuery);
      const matchKey = `~${key}`.includes(cleanQuery) || `〜${key}`.includes(cleanQuery) || key.includes(cleanQuery) || (strippedQuery ? key.includes(strippedQuery) : false);

      if (matchCounterKanji || matchCounterKana || matchTargetEn || matchTargetMy || matchQuestionJa || matchQuestionKana || matchKey) {
        const id = `counter_def_${key}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'counter',
            title: `〜${counter.counterKanji} (${counter.counterKana})`,
            reading: counter.counterKana,
            meaningEn: `${counter.targetCategoryEn} · Q: ${counter.questionWord.japanese} (${counter.questionWord.kana})`,
            meaningMy: `${counter.targetCategoryMy} (${counter.questionWord.meaningMy})`,
            badge: 'N5 Counter',
            detail: `Target: ${counter.targetCategoryEn}`,
            referenceTab: 'counters',
          });
        }
      }

      // Search individual counter items (e.g., 一本 / いっぽん / ippon / 一人 / ひとり / hitori)
      for (const item of counter.items) {
        const matchItemJa = item.japanese.toLowerCase().includes(cleanQuery);
        const matchItemKana = item.kana.toLowerCase().includes(cleanQuery);
        const matchItemRomaji = item.romaji.toLowerCase().includes(cleanQuery);
        const matchItemMy = item.burmese.includes(cleanQuery);
        const matchItemCount = `${item.count}${counter.counterKanji}`.includes(cleanQuery) || `${item.count}${counter.counterKana}`.includes(cleanQuery);

        if (matchItemJa || matchItemKana || matchItemRomaji || matchItemMy || matchItemCount) {
          const id = `counter_item_${key}_${item.count}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              category: 'counter',
              title: `${item.japanese} (${item.kana})`,
              reading: item.romaji,
              meaningEn: `${item.burmese} · ${counter.targetCategoryEn}`,
              meaningMy: `${counter.targetCategoryMy} (${item.burmese})`,
              badge: item.isIrregular ? 'N5 Counter 🚨 Irregular' : 'N5 Counter',
              detail: `Counter: 〜${counter.counterKanji} (${counter.counterKana})`,
              referenceTab: 'counters',
            });
          }
        }
      }
    }

    // 5. Search N5 Conversational Expressions
    for (const exp of N5_CONVERSATIONAL_EXPRESSIONS) {
      const matchJa = exp.japanese.toLowerCase().includes(cleanQuery);
      const matchKana = exp.kana.toLowerCase().includes(cleanQuery);
      const matchRomaji = exp.romaji.toLowerCase().includes(cleanQuery);
      const matchEn = exp.english.toLowerCase().includes(cleanQuery);
      const matchMy = exp.burmese.includes(cleanQuery);
      const matchSit = exp.situationMy.includes(cleanQuery);
      const matchGreeting = cleanQuery === 'greeting' || cleanQuery === 'greetings';

      if (matchJa || matchKana || matchRomaji || matchEn || matchMy || matchSit || (matchGreeting && exp.category === 'greetings')) {
        const id = `exp_${exp.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'expression',
            title: exp.japanese,
            reading: `${exp.kana} (${exp.romaji})`,
            meaningEn: exp.english,
            meaningMy: exp.burmese,
            badge: `N5 Expression (${exp.category})`,
            detail: exp.situationMy,
            referenceTab: 'expressions',
          });
        }
      }
    }

    // 6. Search N5 Common Mistakes & Learner Traps (言わない!)
    for (const mistake of N5_COMMON_MISTAKES_CATALOG) {
      const matchInc = mistake.incorrect.toLowerCase().includes(cleanQuery);
      const matchCor = mistake.correct.toLowerCase().includes(cleanQuery);
      const matchRuleJa = mistake.ruleJa.toLowerCase().includes(cleanQuery);
      const matchRuleEn = mistake.ruleEn.toLowerCase().includes(cleanQuery);
      const matchRuleMy = mistake.ruleMy.includes(cleanQuery);
      const matchWarn = mistake.warningBurmese.includes(cleanQuery);
      const matchExpl = mistake.detailedExplanationMy.includes(cleanQuery);
      const matchTrapKeyword = cleanQuery === 'trap' || cleanQuery === 'mistake' || cleanQuery === 'iwanai' || cleanQuery === '言わない';

      if (matchInc || matchCor || matchRuleJa || matchRuleEn || matchRuleMy || matchWarn || matchExpl || matchTrapKeyword) {
        const id = `mistake_${mistake.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'trap',
            title: `${mistake.incorrect} ➔ ${mistake.correct}`,
            reading: mistake.ruleJa,
            meaningEn: mistake.ruleEn,
            meaningMy: mistake.warningBurmese,
            badge: 'N5 Trap (言わない!)',
            detail: mistake.detailedExplanationMy,
            referenceTab: 'mistakes',
          });
        }
      }
    }

    // 7. Search N5 Calendar Dates & Phonetic Shifts
    for (const date of N5_CALENDAR_DATES) {
      const matchJa = date.japanese.toLowerCase().includes(cleanQuery);
      const matchKana = date.kana.toLowerCase().includes(cleanQuery);
      const matchRomaji = date.romaji.toLowerCase().includes(cleanQuery);
      const matchMy = date.burmese.includes(cleanQuery);
      const matchDay = `${date.day}日`.includes(cleanQuery) || `${date.day}` === cleanQuery;

      if (matchJa || matchKana || matchRomaji || matchMy || matchDay) {
        const id = `date_${date.day}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'counter',
            title: `${date.japanese} (${date.kana})`,
            reading: date.romaji,
            meaningEn: `${date.day}th of the month · ${date.burmese}`,
            meaningMy: date.burmese,
            badge: date.isIrregular ? 'N5 Date 🚨 Irregular' : 'N5 Date',
            detail: date.phoneticNoteMy || 'Calendar Date',
            referenceTab: 'counters',
          });
        }
      }
    }

    for (const shift of N5_PHONETIC_SHIFTS) {
      const matchKanji = shift.baseKanji.toLowerCase().includes(cleanQuery);
      const matchReading = shift.reading.toLowerCase().includes(cleanQuery);
      const matchNum = String(shift.number).toLowerCase().includes(cleanQuery);
      const matchMy = shift.burmese.includes(cleanQuery);

      if (matchKanji || matchReading || matchNum || matchMy) {
        const id = `shift_${shift.baseKanji}_${shift.number}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            category: 'counter',
            title: `${shift.baseKanji} (${shift.reading})`,
            reading: shift.reading,
            meaningEn: `${shift.shiftType} · ${shift.burmese}`,
            meaningMy: `${shift.burmese}: ${shift.explanationMy}`,
            badge: 'N5 Phonetic Shift',
            detail: shift.explanationMy,
            referenceTab: 'counters',
          });
        }
      }
    }

    // 8. Search Dexie Database SRS Cards (including active Leech cards)
    try {
      const srsCards = await db.srs_cards.toArray();
      for (const card of srsCards) {
        const matchPrompt = card.prompt.toLowerCase().includes(cleanQuery);
        const matchReading = card.reading && card.reading.toLowerCase().includes(cleanQuery);
        const matchMeaning = card.meaning && card.meaning.toLowerCase().includes(cleanQuery);

        if (matchPrompt || matchReading || matchMeaning) {
          const id = `srs_${card.id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              category: 'srs_card',
              title: card.prompt,
              reading: card.reading,
              meaningEn: card.meaning,
              badge: card.isLeech ? '⚠️ Leech (Quarantine)' : `SRS: ${card.state.toUpperCase()}`,
              detail: `Interval: ${card.intervalDays}d · Due: ${new Date(card.due).toLocaleDateString()}`,
              srsCardData: card,
            });
          }
        }
      }
    } catch {
      // IndexedDB query error fallback
    }

    // Sorting: exact matches at the top, then startsWith, then general
    return results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === cleanQuery ? 1 : 0;
        const bExact = b.title.toLowerCase() === cleanQuery ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aStarts = a.title.toLowerCase().startsWith(cleanQuery) ? 1 : 0;
        const bStarts = b.title.toLowerCase().startsWith(cleanQuery) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;

        return 0;
      })
      .slice(0, maxResults);
  }
}
