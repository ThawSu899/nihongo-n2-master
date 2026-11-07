import { KanaRecord, SRSCard } from '../models/types';
import { Clock } from '../common/clock';

export interface RawKanaDef {
  char: string;
  romaji: string[];
  script: 'hiragana' | 'katakana';
  category: 'basic' | 'dakuten' | 'handakuten' | 'combo' | 'sokuon';
}

export const KANA_DATASET: RawKanaDef[] = [
  // Hiragana Basic (46)
  { char: 'あ', romaji: ['a'], script: 'hiragana', category: 'basic' },
  { char: 'い', romaji: ['i'], script: 'hiragana', category: 'basic' },
  { char: 'う', romaji: ['u'], script: 'hiragana', category: 'basic' },
  { char: 'え', romaji: ['e'], script: 'hiragana', category: 'basic' },
  { char: 'お', romaji: ['o'], script: 'hiragana', category: 'basic' },
  { char: 'か', romaji: ['ka'], script: 'hiragana', category: 'basic' },
  { char: 'き', romaji: ['ki'], script: 'hiragana', category: 'basic' },
  { char: 'く', romaji: ['ku'], script: 'hiragana', category: 'basic' },
  { char: 'け', romaji: ['ke'], script: 'hiragana', category: 'basic' },
  { char: 'こ', romaji: ['ko'], script: 'hiragana', category: 'basic' },
  { char: 'さ', romaji: ['sa'], script: 'hiragana', category: 'basic' },
  { char: 'し', romaji: ['shi', 'si'], script: 'hiragana', category: 'basic' },
  { char: 'す', romaji: ['su'], script: 'hiragana', category: 'basic' },
  { char: 'せ', romaji: ['se'], script: 'hiragana', category: 'basic' },
  { char: 'そ', romaji: ['so'], script: 'hiragana', category: 'basic' },
  { char: 'た', romaji: ['ta'], script: 'hiragana', category: 'basic' },
  { char: 'ち', romaji: ['chi', 'ti'], script: 'hiragana', category: 'basic' },
  { char: 'つ', romaji: ['tsu', 'tu'], script: 'hiragana', category: 'basic' },
  { char: 'て', romaji: ['te'], script: 'hiragana', category: 'basic' },
  { char: 'と', romaji: ['to'], script: 'hiragana', category: 'basic' },
  { char: 'な', romaji: ['na'], script: 'hiragana', category: 'basic' },
  { char: 'に', romaji: ['ni'], script: 'hiragana', category: 'basic' },
  { char: 'ぬ', romaji: ['nu'], script: 'hiragana', category: 'basic' },
  { char: 'ね', romaji: ['ne'], script: 'hiragana', category: 'basic' },
  { char: 'の', romaji: ['no'], script: 'hiragana', category: 'basic' },
  { char: 'は', romaji: ['ha'], script: 'hiragana', category: 'basic' },
  { char: 'ひ', romaji: ['hi'], script: 'hiragana', category: 'basic' },
  { char: 'ふ', romaji: ['fu', 'hu'], script: 'hiragana', category: 'basic' },
  { char: 'へ', romaji: ['he'], script: 'hiragana', category: 'basic' },
  { char: 'ほ', romaji: ['ho'], script: 'hiragana', category: 'basic' },
  { char: 'ま', romaji: ['ma'], script: 'hiragana', category: 'basic' },
  { char: 'み', romaji: ['mi'], script: 'hiragana', category: 'basic' },
  { char: 'む', romaji: ['mu'], script: 'hiragana', category: 'basic' },
  { char: 'め', romaji: ['me'], script: 'hiragana', category: 'basic' },
  { char: 'も', romaji: ['mo'], script: 'hiragana', category: 'basic' },
  { char: 'や', romaji: ['ya'], script: 'hiragana', category: 'basic' },
  { char: 'ゆ', romaji: ['yu'], script: 'hiragana', category: 'basic' },
  { char: 'よ', romaji: ['yo'], script: 'hiragana', category: 'basic' },
  { char: 'ら', romaji: ['ra'], script: 'hiragana', category: 'basic' },
  { char: 'り', romaji: ['ri'], script: 'hiragana', category: 'basic' },
  { char: 'る', romaji: ['ru'], script: 'hiragana', category: 'basic' },
  { char: 'れ', romaji: ['re'], script: 'hiragana', category: 'basic' },
  { char: 'ろ', romaji: ['ro'], script: 'hiragana', category: 'basic' },
  { char: 'わ', romaji: ['wa'], script: 'hiragana', category: 'basic' },
  { char: 'を', romaji: ['wo', 'o'], script: 'hiragana', category: 'basic' },
  { char: 'ん', romaji: ['n', 'nn'], script: 'hiragana', category: 'basic' },

  // Hiragana Dakuten & Handakuten
  { char: 'が', romaji: ['ga'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぎ', romaji: ['gi'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぐ', romaji: ['gu'], script: 'hiragana', category: 'dakuten' },
  { char: 'げ', romaji: ['ge'], script: 'hiragana', category: 'dakuten' },
  { char: 'ご', romaji: ['go'], script: 'hiragana', category: 'dakuten' },
  { char: 'ざ', romaji: ['za'], script: 'hiragana', category: 'dakuten' },
  { char: 'じ', romaji: ['ji', 'zi'], script: 'hiragana', category: 'dakuten' },
  { char: 'ず', romaji: ['zu'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぜ', romaji: ['ze'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぞ', romaji: ['zo'], script: 'hiragana', category: 'dakuten' },
  { char: 'だ', romaji: ['da'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぢ', romaji: ['ji', 'di'], script: 'hiragana', category: 'dakuten' },
  { char: 'づ', romaji: ['zu', 'du'], script: 'hiragana', category: 'dakuten' },
  { char: 'で', romaji: ['de'], script: 'hiragana', category: 'dakuten' },
  { char: 'ど', romaji: ['do'], script: 'hiragana', category: 'dakuten' },
  { char: 'ば', romaji: ['ba'], script: 'hiragana', category: 'dakuten' },
  { char: 'び', romaji: ['bi'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぶ', romaji: ['bu'], script: 'hiragana', category: 'dakuten' },
  { char: 'べ', romaji: ['be'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぼ', romaji: ['bo'], script: 'hiragana', category: 'dakuten' },
  { char: 'ぱ', romaji: ['pa'], script: 'hiragana', category: 'handakuten' },
  { char: 'ぴ', romaji: ['pi'], script: 'hiragana', category: 'handakuten' },
  { char: 'ぷ', romaji: ['pu'], script: 'hiragana', category: 'handakuten' },
  { char: 'ぺ', romaji: ['pe'], script: 'hiragana', category: 'handakuten' },
  { char: 'ぽ', romaji: ['po'], script: 'hiragana', category: 'handakuten' },

  // Hiragana Combos (Yōon)
  { char: 'きゃ', romaji: ['kya'], script: 'hiragana', category: 'combo' },
  { char: 'きゅ', romaji: ['kyu'], script: 'hiragana', category: 'combo' },
  { char: 'きょ', romaji: ['kyo'], script: 'hiragana', category: 'combo' },
  { char: 'しゃ', romaji: ['sha', 'sya'], script: 'hiragana', category: 'combo' },
  { char: 'しゅ', romaji: ['shu', 'syu'], script: 'hiragana', category: 'combo' },
  { char: 'しょ', romaji: ['sho', 'syo'], script: 'hiragana', category: 'combo' },
  { char: 'ちゃ', romaji: ['cha', 'tya'], script: 'hiragana', category: 'combo' },
  { char: 'ちゅ', romaji: ['chu', 'tyu'], script: 'hiragana', category: 'combo' },
  { char: 'ちょ', romaji: ['cho', 'tyo'], script: 'hiragana', category: 'combo' },
  { char: 'にゃ', romaji: ['nya'], script: 'hiragana', category: 'combo' },
  { char: 'にゅ', romaji: ['nyu'], script: 'hiragana', category: 'combo' },
  { char: 'にょ', romaji: ['nyo'], script: 'hiragana', category: 'combo' },
  { char: 'ひゃ', romaji: ['hya'], script: 'hiragana', category: 'combo' },
  { char: 'ひゅ', romaji: ['hyu'], script: 'hiragana', category: 'combo' },
  { char: 'ひょ', romaji: ['hyo'], script: 'hiragana', category: 'combo' },
  { char: 'みゃ', romaji: ['mya'], script: 'hiragana', category: 'combo' },
  { char: 'みゅ', romaji: ['myu'], script: 'hiragana', category: 'combo' },
  { char: 'みょ', romaji: ['myo'], script: 'hiragana', category: 'combo' },
  { char: 'りゃ', romaji: ['rya'], script: 'hiragana', category: 'combo' },
  { char: 'りゅ', romaji: ['ryu'], script: 'hiragana', category: 'combo' },
  { char: 'りょ', romaji: ['ryo'], script: 'hiragana', category: 'combo' },
  { char: 'ぎゃ', romaji: ['gya'], script: 'hiragana', category: 'combo' },
  { char: 'ぎゅ', romaji: ['gyu'], script: 'hiragana', category: 'combo' },
  { char: 'ぎょ', romaji: ['gyo'], script: 'hiragana', category: 'combo' },
  { char: 'じゃ', romaji: ['ja', 'zya', 'jya'], script: 'hiragana', category: 'combo' },
  { char: 'じゅ', romaji: ['ju', 'zyu', 'jyu'], script: 'hiragana', category: 'combo' },
  { char: 'じょ', romaji: ['jo', 'zyo', 'jyo'], script: 'hiragana', category: 'combo' },
  { char: 'びゃ', romaji: ['bya'], script: 'hiragana', category: 'combo' },
  { char: 'びゅ', romaji: ['byu'], script: 'hiragana', category: 'combo' },
  { char: 'びょ', romaji: ['byo'], script: 'hiragana', category: 'combo' },
  { char: 'ぴゃ', romaji: ['pya'], script: 'hiragana', category: 'combo' },
  { char: 'ぴゅ', romaji: ['pyu'], script: 'hiragana', category: 'combo' },
  { char: 'ぴょ', romaji: ['pyo'], script: 'hiragana', category: 'combo' },
  { char: 'っ', romaji: ['xtsu', 'ltsu', 'pause'], script: 'hiragana', category: 'sokuon' },

  // Katakana Basic (46)
  { char: 'ア', romaji: ['a'], script: 'katakana', category: 'basic' },
  { char: 'イ', romaji: ['i'], script: 'katakana', category: 'basic' },
  { char: 'ウ', romaji: ['u'], script: 'katakana', category: 'basic' },
  { char: 'エ', romaji: ['e'], script: 'katakana', category: 'basic' },
  { char: 'オ', romaji: ['o'], script: 'katakana', category: 'basic' },
  { char: 'カ', romaji: ['ka'], script: 'katakana', category: 'basic' },
  { char: 'キ', romaji: ['ki'], script: 'katakana', category: 'basic' },
  { char: 'ク', romaji: ['ku'], script: 'katakana', category: 'basic' },
  { char: 'ケ', romaji: ['ke'], script: 'katakana', category: 'basic' },
  { char: 'コ', romaji: ['ko'], script: 'katakana', category: 'basic' },
  { char: 'サ', romaji: ['sa'], script: 'katakana', category: 'basic' },
  { char: 'シ', romaji: ['shi', 'si'], script: 'katakana', category: 'basic' },
  { char: 'ス', romaji: ['su'], script: 'katakana', category: 'basic' },
  { char: 'セ', romaji: ['se'], script: 'katakana', category: 'basic' },
  { char: 'ソ', romaji: ['so'], script: 'katakana', category: 'basic' },
  { char: 'タ', romaji: ['ta'], script: 'katakana', category: 'basic' },
  { char: 'チ', romaji: ['chi', 'ti'], script: 'katakana', category: 'basic' },
  { char: 'ツ', romaji: ['tsu', 'tu'], script: 'katakana', category: 'basic' },
  { char: 'テ', romaji: ['te'], script: 'katakana', category: 'basic' },
  { char: 'ト', romaji: ['to'], script: 'katakana', category: 'basic' },
  { char: 'ナ', romaji: ['na'], script: 'katakana', category: 'basic' },
  { char: 'ニ', romaji: ['ni'], script: 'katakana', category: 'basic' },
  { char: 'ヌ', romaji: ['nu'], script: 'katakana', category: 'basic' },
  { char: 'ネ', romaji: ['ne'], script: 'katakana', category: 'basic' },
  { char: 'ノ', romaji: ['no'], script: 'katakana', category: 'basic' },
  { char: 'ハ', romaji: ['ha'], script: 'katakana', category: 'basic' },
  { char: 'ヒ', romaji: ['hi'], script: 'katakana', category: 'basic' },
  { char: 'フ', romaji: ['fu', 'hu'], script: 'katakana', category: 'basic' },
  { char: 'ヘ', romaji: ['he'], script: 'katakana', category: 'basic' },
  { char: 'ホ', romaji: ['ho'], script: 'katakana', category: 'basic' },
  { char: 'マ', romaji: ['ma'], script: 'katakana', category: 'basic' },
  { char: 'ミ', romaji: ['mi'], script: 'katakana', category: 'basic' },
  { char: 'ム', romaji: ['mu'], script: 'katakana', category: 'basic' },
  { char: 'メ', romaji: ['me'], script: 'katakana', category: 'basic' },
  { char: 'モ', romaji: ['mo'], script: 'katakana', category: 'basic' },
  { char: 'ヤ', romaji: ['ya'], script: 'katakana', category: 'basic' },
  { char: 'ユ', romaji: ['yu'], script: 'katakana', category: 'basic' },
  { char: 'ヨ', romaji: ['yo'], script: 'katakana', category: 'basic' },
  { char: 'ラ', romaji: ['ra'], script: 'katakana', category: 'basic' },
  { char: 'リ', romaji: ['ri'], script: 'katakana', category: 'basic' },
  { char: 'ル', romaji: ['ru'], script: 'katakana', category: 'basic' },
  { char: 'レ', romaji: ['re'], script: 'katakana', category: 'basic' },
  { char: 'ロ', romaji: ['ro'], script: 'katakana', category: 'basic' },
  { char: 'ワ', romaji: ['wa'], script: 'katakana', category: 'basic' },
  { char: 'ヲ', romaji: ['wo', 'o'], script: 'katakana', category: 'basic' },
  { char: 'ン', romaji: ['n', 'nn'], script: 'katakana', category: 'basic' },

  // Katakana Dakuten & Handakuten
  { char: 'ガ', romaji: ['ga'], script: 'katakana', category: 'dakuten' },
  { char: 'ギ', romaji: ['gi'], script: 'katakana', category: 'dakuten' },
  { char: 'グ', romaji: ['gu'], script: 'katakana', category: 'dakuten' },
  { char: 'ゲ', romaji: ['ge'], script: 'katakana', category: 'dakuten' },
  { char: 'ゴ', romaji: ['go'], script: 'katakana', category: 'dakuten' },
  { char: 'ザ', romaji: ['za'], script: 'katakana', category: 'dakuten' },
  { char: 'ジ', romaji: ['ji', 'zi'], script: 'katakana', category: 'dakuten' },
  { char: 'ズ', romaji: ['zu'], script: 'katakana', category: 'dakuten' },
  { char: 'ゼ', romaji: ['ze'], script: 'katakana', category: 'dakuten' },
  { char: 'ゾ', romaji: ['zo'], script: 'katakana', category: 'dakuten' },
  { char: 'ダ', romaji: ['da'], script: 'katakana', category: 'dakuten' },
  { char: 'ヂ', romaji: ['ji', 'di'], script: 'katakana', category: 'dakuten' },
  { char: 'ヅ', romaji: ['zu', 'du'], script: 'katakana', category: 'dakuten' },
  { char: 'デ', romaji: ['de'], script: 'katakana', category: 'dakuten' },
  { char: 'ド', romaji: ['do'], script: 'katakana', category: 'dakuten' },
  { char: 'バ', romaji: ['ba'], script: 'katakana', category: 'dakuten' },
  { char: 'ビ', romaji: ['bi'], script: 'katakana', category: 'dakuten' },
  { char: 'ブ', romaji: ['bu'], script: 'katakana', category: 'dakuten' },
  { char: 'ベ', romaji: ['be'], script: 'katakana', category: 'dakuten' },
  { char: 'ボ', romaji: ['bo'], script: 'katakana', category: 'dakuten' },
  { char: 'パ', romaji: ['pa'], script: 'katakana', category: 'handakuten' },
  { char: 'ピ', romaji: ['pi'], script: 'katakana', category: 'handakuten' },
  { char: 'プ', romaji: ['pu'], script: 'katakana', category: 'handakuten' },
  { char: 'ペ', romaji: ['pe'], script: 'katakana', category: 'handakuten' },
  { char: 'ポ', romaji: ['po'], script: 'katakana', category: 'handakuten' },
  { char: 'ッ', romaji: ['xtsu', 'ltsu', 'pause'], script: 'katakana', category: 'sokuon' },
  { char: 'ー', romaji: ['-'], script: 'katakana', category: 'basic' },
];

export class KanaEngine {
  constructor(private clock: Clock) {}

  /**
   * Initializes Kana progress records for all characters
   */
  createInitialRecords(): KanaRecord[] {
    return KANA_DATASET.map((k) => ({
      character: k.char,
      romaji: k.romaji,
      script: k.script,
      category: k.category,
      recognitionAccuracy: 0,
      productionAccuracy: 0,
      responseTime: 0,
      attempts: 0,
      masteryState: 'new',
      srsCardId: `kana:${k.char}`,
    }));
  }

  /**
   * Check learner answer against accepted romaji variants or kana character
   */
  checkKanaAnswer(input: string, kana: RawKanaDef): boolean {
    const cleanInput = input.trim().toLowerCase();
    // Match against any valid romaji variant or the character itself
    return (
      kana.romaji.some((r) => r.toLowerCase() === cleanInput) ||
      kana.char === input.trim()
    );
  }

  /**
   * Updates record performance metrics after an attempt
   */
  updateRecord(
    record: KanaRecord,
    isCorrect: boolean,
    isProduction: boolean,
    elapsedMs: number
  ): KanaRecord {
    const attempts = record.attempts + 1;
    const nowIso = this.clock.nowIso();

    // Rolling weighted response time
    const responseTime =
      record.attempts === 0
        ? elapsedMs
        : Math.round(record.responseTime * 0.7 + elapsedMs * 0.3);

    let recognitionAccuracy = record.recognitionAccuracy;
    let productionAccuracy = record.productionAccuracy;

    if (isProduction) {
      productionAccuracy =
        record.productionAccuracy === 0
          ? (isCorrect ? 1.0 : 0.0)
          : Math.round((record.productionAccuracy * 0.7 + (isCorrect ? 1 : 0) * 0.3) * 100) / 100;
    } else {
      recognitionAccuracy =
        record.recognitionAccuracy === 0
          ? (isCorrect ? 1.0 : 0.0)
          : Math.round((record.recognitionAccuracy * 0.7 + (isCorrect ? 1 : 0) * 0.3) * 100) / 100;
    }

    let masteryState: KanaRecord['masteryState'] = record.masteryState;
    if (attempts >= 5 && recognitionAccuracy >= 0.85 && (productionAccuracy >= 0.80 || productionAccuracy === 0)) {
      masteryState = 'mastered';
    } else if (attempts > 0) {
      masteryState = 'learning';
    }

    return {
      ...record,
      attempts,
      recognitionAccuracy,
      productionAccuracy,
      responseTime,
      lastSeen: nowIso,
      masteryState,
    };
  }

  /**
   * Converts KanaRecord to an SRS card for spacing practice
   */
  createSRSCard(record: KanaRecord): SRSCard {
    return {
      id: record.srsCardId || `kana:${record.character}`,
      itemId: record.character,
      lessonId: 'kana',
      itemType: 'kana',
      facet: 'recall',
      prompt: record.romaji[0],
      meaning: record.character,
      reading: record.character,
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 2,
      difficulty: 4,
      lapses: 0,
      isLeech: false,
      due: this.clock.nowIso(),
    };
  }
}
