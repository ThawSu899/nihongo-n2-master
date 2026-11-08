import fs from 'fs';
import path from 'path';
import { segmentMoras, classifyPitchPattern, PitchPattern } from '../src/domain/audio/pitch-accent';

/**
 * Standard NHK Tokyo Japanese Pitch Accent Lexicon
 * Key: word or reading (hiragana/katakana)
 * Value: dropIndex (0 = Heiban, 1 = Atamadaka, 2..N-1 = Nakadaka, N = Odaka)
 */
const NHK_LEXICON: Record<string, number> = {
  // Greetings & Conversational Core
  おはようございます: 0,
  こんにちは: 0,
  こんばんは: 0,
  ありがとう: 2,
  ありがとうございます: 0,
  さようなら: 4,
  すみません: 4,
  ごめんなさい: 4,
  いただきます: 4,
  ごちそうさまでした: 6,
  はじめまして: 4,
  どうぞよろしく: 5,
  おねがいします: 6,
  はい: 1,
  いいえ: 3,
  どうも: 1,
  さあ: 1,
  ちょっと: 1,
  だめ: 1,
  もちろん: 2,
  ぜひ: 1,
  たぶん: 1,

  // Pronouns & Demonstratives
  わたし: 0,
  わたくし: 0,
  ぼく: 1,
  おれ: 0,
  あなた: 2,
  かれ: 1,
  かのじょ: 1,
  これ: 0,
  それ: 0,
  あれ: 0,
  どれ: 1,
  この: 0,
  その: 0,
  あの: 0,
  どの: 1,
  ここ: 0,
  そこ: 0,
  あそこ: 0,
  どこ: 1,
  こちら: 0,
  そちら: 0,
  あちら: 0,
  どちら: 1,
  だれ: 1,
  どなた: 1,
  なに: 1,
  なん: 1,
  いつ: 1,
  どう: 1,
  いかが: 0,
  いくら: 1,
  いくつ: 1,

  // People, Family & Roles
  ひと: 2,
  かた: 2,
  おとこ: 3,
  おんな: 3,
  こども: 0,
  かぞく: 1,
  りょうしん: 1,
  ちち: 2,
  はは: 2,
  おとうさん: 2,
  おかあさん: 2,
  あに: 1,
  あね: 0,
  おとうと: 4,
  いもうと: 4,
  おっと: 0,
  つま: 1,
  ともだち: 0,
  せんせい: 3,
  がくせい: 0,
  留学生: 0,
  りゅうがくせい: 0,
  かいしゃいん: 3,
  ぎんこういん: 4,
  いしゃ: 0,
  けんきゅうしゃ: 4,
  きょうし: 1,
  てんいん: 0,
  きゃく: 0,
  おきゃくさん: 0,
  しゃちょう: 0,
  ぶちょう: 0,
  かちょう: 0,
  どうりょう: 0,
  せんぱい: 0,
  こうはい: 0,
  じょし: 1,
  ぶか: 1,

  // Places, Buildings & Nature
  がっこう: 0,
  だいがく: 0,
  こうこう: 0,
  ちゅうがっこう: 3,
  しょうがっこう: 3,
  きょうしつ: 3,
  しょくどう: 0,
  じむしょ: 2,
  かいぎしつ: 3,
  としょかん: 2,
  びょういん: 0,
  ぎんこう: 0,
  ゆうびんきょく: 5,
  えき: 1,
  くうこう: 0,
  みなと: 0,
  こうえん: 0,
  みせ: 2,
  うけつけ: 0,
  へや: 2,
  いえ: 2,
  うち: 0,
  くに: 0,
  がいこく: 0,
  にほん: 2,
  やま: 2,
  かわ: 2,
  うみ: 1,
  そら: 1,
  もり: 0,
  たいよう: 1,
  つき: 2,
  ほし: 0,
  あめ: 1,
  ゆき: 2,
  かぜ: 0,

  // Common Nouns, Tools & Objects
  ほん: 1,
  じしょ: 1,
  ざっし: 0,
  しんぶん: 0,
  ノート: 1,
  えんぴつ: 0,
  ボールペン: 4,
  けしゴム: 0,
  てちょう: 0,
  めいし: 0,
  カード: 1,
  おかね: 0,
  さいふ: 0,
  とけい: 0,
  かさ: 1,
  かばん: 0,
  くるま: 0,
  じてんしゃ: 2,
  でんしゃ: 0,
  バス: 1,
  タクシー: 1,
  ひこうき: 2,
  ふね: 1,
  カメラ: 1,
  パソコン: 0,
  コンピューター: 4,
  スマホ: 0,
  ケータイ: 0,
  テレビ: 1,
  ラジオ: 1,
  でんわ: 0,
  てがみ: 0,
  にもつ: 1,
  きっぷ: 0,
  パスポート: 3,

  // Food, Drink & Daily Living
  ごはん: 1,
  あさごはん: 3,
  ひるごはん: 3,
  ばんごはん: 3,
  パン: 1,
  たまご: 2,
  にく: 2,
  さかな: 0,
  やさい: 0,
  くだもの: 2,
  みず: 0,
  おちゃ: 0,
  こうちゃ: 0,
  コーヒー: 3,
  ミルク: 1,
  ぎゅうにゅう: 0,
  ジュース: 1,
  ビール: 1,
  おさけ: 0,
  りょうり: 1,
  あさ: 1,
  ひる: 2,
  ばん: 0,
  よる: 1,
  きょう: 1,
  あした: 3,
  きのう: 2,
  あさって: 2,
  おととい: 3,
  まいあさ: 1,
  まいばん: 1,
  まいにち: 1,
  こんしゅう: 0,
  せんしゅう: 0,
  らいしゅう: 0,
  ことし: 0,
  きょねん: 1,
  らいねん: 0,

  // Adjectives
  おおきい: 3,
  ちいさい: 3,
  あたらしい: 4,
  ふるい: 2,
  いい: 1,
  よい: 1,
  わるい: 2,
  あつい: 2,
  さむい: 2,
  つめたい: 3,
  むずかしい: 4,
  やさしい: 0,
  たかい: 2,
  やすい: 2,
  ひくい: 2,
  おもしろい: 4,
  おいしい: 3,
  いそがしい: 4,
  たのしい: 3,
  しろい: 2,
  くろい: 2,
  あかい: 2,
  あおい: 2,
  ちかい: 2,
  とおい: 2,
  はやい: 2,
  おそい: 2,
  おおい: 2,
  すくない: 3,
  あたたかい: 4,
  すずしい: 3,
  からい: 2,
  あまい: 2,
  おもい: 2,
  かるい: 2,
  しずか: 1,
  にぎやか: 2,
  べんり: 1,
  ふべん: 1,
  げんき: 1,
  ひま: 0,
  すき: 2,
  きらい: 0,
  じょうず: 3,
  へた: 2,
  たいせつ: 0,
  だいじょうぶ: 3,

  // Verbs (Dictionary form)
  たべる: 2,
  のむ: 1,
  かう: 0,
  うる: 0,
  かく: 1,
  よむ: 1,
  きく: 0,
  みる: 1,
  はなす: 2,
  いう: 0,
  いく: 0,
  くる: 1,
  かえる: 1,
  おきる: 2,
  ねる: 0,
  はたらく: 0,
  やすむ: 2,
  べんきょうする: 0,
  あう: 1,
  まつ: 1,
  とる: 1,
  つくる: 2,
  わかる: 2,
  ある: 1,
  いる: 0,
  あげる: 0,
  もらう: 0,
  かす: 0,
  かりる: 0,
  おしえる: 0,
  ならう: 2,
  かける: 2,
  あける: 0,
  しめる: 2,
  つける: 2,
  けす: 0,
  およぐ: 2,
  あそぶ: 0,
  はいる: 1,
  でる: 1,

  // N2/N3 Advanced Academic & Business Terms
  けいざい: 1,
  せいじ: 0,
  しゃかい: 1,
  ほうりつ: 0,
  こくさい: 0,
  かんきょう: 0,
  もんだい: 0,
  かいけつ: 0,
  はってん: 0,
  せいこう: 0,
  しっぱい: 0,
  ちょうさ: 1,
  けんきゅう: 0,
  じっけん: 0,
  けっか: 0,
  げんいん: 0,
  りゆう: 0,
  もくてき: 0,
  けいかく: 0,
  よてい: 0,
  じゅんび: 1,
  せつめい: 0,
  いけん: 1,
  きかく: 0,
  ていあん: 0,
  こうしょう: 0,
  けいやく: 0,
  せきにん: 0,
  ぎょうむ: 1,
  うりあげ: 0,
  りえき: 1,
  そんしつ: 0,
  ぼうえき: 0,
  しじょう: 0,
  きぎょう: 1,
  さんぎょう: 1,
  せいひん: 0,
  ひんしつ: 0,
  かかく: 0,
  じゅよう: 0,
  きょうきゅう: 0,
  とうし: 0,
  しほん: 0,
  よさん: 0,
  けいえい: 0,
  せんりゃく: 0,
  きそく: 2,
  せいど: 1,
  たいさく: 0,
  じょうほう: 0,
  ぎじゅつ: 1,
  かいはつ: 0,
  そうぞう: 0,
  へんか: 1,
  えいきょう: 0,
  かんけい: 0,
  わりあい: 0,
  ひかく: 0,
  こうか: 1,
  げんしょう: 0,
  じょうきょう: 0,
  たいおう: 0,
  じっし: 1,
  てきおう: 0,
  きょうちょう: 0,
  はんだん: 1,
  けってい: 0,
  りかい: 0,
  にんしき: 0,
  いしき: 1,
  かんしん: 0,
  きたい: 0,
  きんちょう: 0,
  ふあん: 0,
  まんぞく: 1,
  ふまん: 0,
  じしん: 0,
  どりょく: 1,
  くふう: 0,
  ちょうせん: 0,
  けいけん: 0,
  のうりょく: 1,
  さいのう: 0,
  たいど: 1,
  しせい: 0,
  こうどう: 0,
  しゅうかん: 0,
  でんとう: 0,
  ぶんか: 1,
  れきし: 0,
  きおく: 2,
  ちしき: 1,
  そうぞうりょく: 4,
  しゅうちゅうりょく: 4,
  せきにんかん: 4,
  きんちょうかん: 4,
};

/**
 * Phonological heuristics for Tokyo pitch accent inference
 */
export function inferDropIndex(
  ja: string,
  reading: string,
  pos: string = '',
  moras: string[]
): number {
  const moraCount = moras.length;
  if (moraCount <= 0) return 0;

  // 1. Exact Lexicon Lookup (by Kanji or Reading)
  if (NHK_LEXICON[ja] !== undefined) {
    return Math.min(moraCount, NHK_LEXICON[ja]);
  }
  if (NHK_LEXICON[reading] !== undefined) {
    return Math.min(moraCount, NHK_LEXICON[reading]);
  }

  // 2. Monomoraic words (1 mora e.g. 歯, 目, 木, 川, 日)
  if (moraCount === 1) {
    // 歯, 目, 日, 火, 手, 胃, 湯 are typically Type 1
    if (['は', 'め', 'ひ', 'て', 'い', 'ゆ', 'き'].includes(reading)) {
      return 1;
    }
    return 0; // Default heiban
  }

  // 3. Katakana Loanwords (Gairaigo rule: Antepenultimate drop for >= 3 moras)
  const isKatakana = /^[\u30A0-\u30FF\u30FC]+$/.test(reading);
  if (isKatakana) {
    if (moraCount <= 2) return 1; // パン, ドア, バス, ペン
    return Math.max(1, moraCount - 2); // チョコレート (3), コンピューター (4), エレベーター (4)
  }

  // 4. I-Adjectives (Keiyoushi rule: Penultimate drop before final い)
  const isAdjective =
    pos.toLowerCase().includes('adj') ||
    pos.toLowerCase().includes('い形容詞') ||
    (reading.endsWith('い') && !reading.endsWith('せい') && !reading.endsWith('めい') && moraCount >= 3);

  if (isAdjective && reading.endsWith('い') && moraCount >= 2) {
    return moraCount - 1; // おいしい (3), たかい (2), おもしろい (4)
  }

  // 5. Verb Conjugations & Polite endings
  if (reading.endsWith('ます') || reading.endsWith('ました') || reading.endsWith('ません')) {
    // Drop on the 'ま' mora
    const maIndex = moras.findIndex((m) => m === 'ま');
    if (maIndex >= 0) {
      return maIndex + 1;
    }
    return Math.max(1, moraCount - 1);
  }

  // 6. Compound Suffixes in Academic / Business Japanese
  // 〜しゃ (者/車), 〜いん (員), 〜かん (館/感), 〜じょ (所), 〜てき (的), 〜りょく (力), 〜せい (性), 〜しょう (症), 〜ほう (法)
  if (
    reading.endsWith('しゃ') ||
    reading.endsWith('いん') ||
    reading.endsWith('かん') ||
    reading.endsWith('じょ') ||
    reading.endsWith('てき') ||
    reading.endsWith('りょく') ||
    reading.endsWith('せい') ||
    reading.endsWith('しょう') ||
    reading.endsWith('ほう') ||
    reading.endsWith('りつ') ||
    reading.endsWith('か')
  ) {
    // Drop nucleus typically falls on the antepenultimate or penultimate syllable
    if (moraCount >= 4) {
      return moraCount - 2;
    }
    return Math.max(1, moraCount - 1);
  }

  // 7. Conversational Starters / Greetings
  if (
    reading.startsWith('はい') ||
    reading.startsWith('いいえ') ||
    reading.startsWith('どうも') ||
    reading.startsWith('ちょっと') ||
    reading.startsWith('だめ') ||
    reading.startsWith('さあ')
  ) {
    return 1;
  }

  // 8. 2-Mora Nouns: Frequently Odaka or Atamadaka if everyday native Yamato kotoba
  if (moraCount === 2) {
    if (['いぬ', 'ねこ', 'あめ', 'はる', 'なつ', 'あき', 'ふゆ', 'あさ', 'よる'].includes(reading)) {
      return 1; // Atamadaka
    }
    if (['やま', 'かわ', 'はな', 'みせ', 'いえ', 'へや', 'おと', 'こえ', 'ゆき'].includes(reading)) {
      return 2; // Odaka
    }
    return 0; // Default Heiban
  }

  // 9. Sino-Japanese 2-Kanji Kango (2 kanji, 3-4 moras): Vast majority (over 65%) are Heiban in Tokyo Dialect
  return 0; // Heiban (Type 0)
}

/**
 * Enriches all 174 lesson packs non-destructively
 */
export function enrichPitchAccents() {
  const rootDir = process.cwd();
  const packsDir = path.join(rootDir, 'content', 'packs');
  const levels = ['n5', 'n4', 'n3', 'n2'];

  let totalUpdatedPacks = 0;
  let totalEnrichedVocabs = 0;

  for (const level of levels) {
    const levelDir = path.join(packsDir, level);
    if (!fs.existsSync(levelDir)) continue;

    const files = fs.readdirSync(levelDir).filter((f) => f.endsWith('.json')).sort();

    for (const file of files) {
      const filePath = path.join(levelDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const pack = JSON.parse(rawContent);

      let packModified = false;

      if (Array.isArray(pack.vocabularies)) {
        for (const v of pack.vocabularies) {
          const reading = (v.kana || v.reading || '').trim();
          const ja = v.ja || '';
          const pos = v.pos || '';
          const moras = segmentMoras(reading);
          const moraCount = moras.length;

          // Check if pitchPattern and dropIndex need assignment or correction
          const needsEnrichment =
            typeof v.pitchPattern !== 'string' ||
            typeof v.dropIndex !== 'number' ||
            Number.isNaN(v.dropIndex) ||
            v.dropIndex < 0 ||
            v.dropIndex > moraCount;

          if (needsEnrichment) {
            const drop = inferDropIndex(ja, reading, pos, moras);
            const pattern: PitchPattern = classifyPitchPattern(drop, moraCount);

            v.pitchPattern = pattern;
            v.dropIndex = drop;

            packModified = true;
            totalEnrichedVocabs++;
          } else {
            // Validate mathematical consistency
            const expectedPattern = classifyPitchPattern(v.dropIndex, moraCount);
            if (v.pitchPattern !== expectedPattern) {
              v.pitchPattern = expectedPattern;
              packModified = true;
            }
          }
        }
      }

      if (packModified) {
        fs.writeFileSync(filePath, JSON.stringify(pack, null, 2) + '\n', 'utf-8');
        totalUpdatedPacks++;
      }
    }
  }

  console.log(`[Enrichment Complete] Updated ${totalUpdatedPacks} packs, enriched ${totalEnrichedVocabs} vocabularies.`);
  return { totalUpdatedPacks, totalEnrichedVocabs };
}

// Direct execution
if (process.argv[1]?.endsWith('enrich-pitch-accents.ts') || process.argv[1]?.endsWith('enrich-pitch-accents.js')) {
  enrichPitchAccents();
}
