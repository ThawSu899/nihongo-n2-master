import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  N5_CONVERSATIONAL_EXPRESSIONS,
  N5_COUNTERS_TABLE,
  N5_CALENDAR_DATES,
  N5_PHONETIC_SHIFTS,
  N5_COMMON_MISTAKES_CATALOG,
  BEGINNER_SHADOWING_SCENARIOS,
} from '../src/domain/curriculum';
import { CURATED_KANJI_CATALOG } from '../src/domain/dictionary/kanji-catalog';
import { LessonPackSchema } from '../src/domain/models/types';

describe('N5 Curriculum Enrichment: Expressions, Counters, Traps, Kanji, and Shadowing', () => {
  describe('1. N5 Essential Conversational Expressions', () => {
    it('contains core situational greetings and quick-responses with authentic Burmese translations', () => {
      expect(N5_CONVERSATIONAL_EXPRESSIONS.length).toBeGreaterThanOrEqual(20);

      const expressionsMap = new Map(N5_CONVERSATIONAL_EXPRESSIONS.map((e) => [e.japanese, e]));

      // Verify specific required expressions from prompt
      expect(expressionsMap.has('かしこまりました')).toBe(true);
      expect(expressionsMap.get('かしこまりました')?.burmese).toContain('ကောင်းပါပြီ');

      expect(expressionsMap.has('お先に失礼します')).toBe(true);
      expect(expressionsMap.get('お先に失礼します')?.burmese).toContain('အရင်ပြန်နှင့်ပါရစေ');

      expect(expressionsMap.has('ごちそうさまでした')).toBe(true);
      expect(expressionsMap.get('ごちそうさまでした')?.burmese).toContain('ကျေးဇူးတင်ပါသည်');

      expect(expressionsMap.has('お大事に')).toBe(true);
      expect(expressionsMap.get('お大事に')?.burmese).toContain('ဂရုစိုက်ပါနော်');

      expect(expressionsMap.has('まだまだです')).toBe(true);
      expect(expressionsMap.get('まだまだです')?.burmese).toContain('မတော်သေးပါဘူး');

      expect(expressionsMap.has('どういたしまして')).toBe(true);
      expect(expressionsMap.get('どういたしまして')?.burmese).toContain('ရပါတယ်');

      for (const expr of N5_CONVERSATIONAL_EXPRESSIONS) {
        expect(expr.id).toBeTruthy();
        expect(expr.japanese).toBeTruthy();
        expect(expr.kana).toBeTruthy();
        expect(expr.english).toBeTruthy();
        expect(expr.burmese).toBeTruthy();
        expect(expr.situationMy).toBeTruthy();
      }
    });

    it('contains comprehensive counters table (~つ, ~人, ~枚, ~台, ~冊, ~本, ~杯, ~匹)', () => {
      const counterKeys = ['tsu', 'nin', 'mai', 'dai', 'satsu', 'hon', 'hai', 'hiki'];
      for (const key of counterKeys) {
        expect(N5_COUNTERS_TABLE[key]).toBeDefined();
        const entry = N5_COUNTERS_TABLE[key];
        expect(entry.items.length).toBe(10);
        expect(entry.questionWord.meaningMy).toBeTruthy();

        for (const item of entry.items) {
          expect(item.japanese).toBeTruthy();
          expect(item.kana).toBeTruthy();
          expect(item.burmese).toBeTruthy();
        }
      }

      // Check specific irregular counters
      const nin = N5_COUNTERS_TABLE['nin'].items;
      expect(nin[0].kana).toBe('ひとり');
      expect(nin[1].kana).toBe('ふたり');
      expect(nin[3].kana).toBe('よにん');

      const hon = N5_COUNTERS_TABLE['hon'].items;
      expect(hon[0].kana).toBe('いっぽん');
      expect(hon[2].kana).toBe('さんぼん');
      expect(hon[5].kana).toBe('ろっぽん');
      expect(hon[7].kana).toBe('はっぽん');
      expect(hon[9].kana).toBe('じゅっぽん / じっぽん');

      const hai = N5_COUNTERS_TABLE['hai'].items;
      expect(hai[0].kana).toBe('いっぱい');
      expect(hai[2].kana).toBe('さんばい');
      expect(hai[5].kana).toBe('ろっぱい');
      expect(hai[7].kana).toBe('はっぱい');
      expect(hai[9].kana).toBe('じゅっぱい / じっぱい');
    });

    it('contains complete 1日 - 31日 calendar dates with all irregular readings', () => {
      expect(N5_CALENDAR_DATES.length).toBe(31);

      const day1 = N5_CALENDAR_DATES[0];
      expect(day1.japanese).toBe('一日');
      expect(day1.kana).toBe('ついたち');
      expect(day1.isIrregular).toBe(true);

      const day4 = N5_CALENDAR_DATES[3];
      expect(day4.kana).toBe('よっか');

      const day8 = N5_CALENDAR_DATES[7];
      expect(day8.kana).toBe('ようか');

      const day14 = N5_CALENDAR_DATES[13];
      expect(day14.kana).toBe('じゅうよっか');

      const day20 = N5_CALENDAR_DATES[19];
      expect(day20.kana).toBe('はつか');

      const day24 = N5_CALENDAR_DATES[23];
      expect(day24.kana).toBe('にじゅうよっか');

      for (const d of N5_CALENDAR_DATES) {
        expect(d.burmese).toBeTruthy();
        expect(d.burmese).toContain('ရက်နေ့');
      }
    });

    it('contains irregular phonetic shifts and special vocabulary (300, 600, 800, 八百屋, etc.)', () => {
      const shiftMap = new Map(N5_PHONETIC_SHIFTS.map((s) => [s.baseKanji, s]));

      expect(shiftMap.get('三百')?.reading).toBe('さんびゃく');
      expect(shiftMap.get('六百')?.reading).toBe('ろっぴゃく');
      expect(shiftMap.get('八百')?.reading).toBe('はっぴゃく');
      expect(shiftMap.get('三千')?.reading).toBe('さんぜん');
      expect(shiftMap.get('八千')?.reading).toBe('はっせん');
      expect(shiftMap.get('八百屋')?.reading).toBe('やおや');
      expect(shiftMap.get('一日')?.reading).toBe('ついたち');
      expect(shiftMap.get('二十歳')?.reading).toBe('はたち');

      for (const shift of N5_PHONETIC_SHIFTS) {
        expect(shift.burmese).toBeTruthy();
        expect(shift.explanationMy).toBeTruthy();
      }
    });
  });

  describe('2. Common Mistakes & 言わない! Trap Annotations', () => {
    it('covers all 6 explicit traps from standard JLPT N5 reference materials', () => {
      const mistakeMap = new Map(N5_COMMON_MISTAKES_CATALOG.map((m) => [m.id, m]));

      // 1. 寒いでした -> 寒かったです
      const m1 = mistakeMap.get('mistake_01_i_adj_past');
      expect(m1?.incorrect).toContain('寒いでした');
      expect(m1?.correct).toContain('寒かったです');
      expect(m1?.warningBurmese).toContain('言わない!');
      expect(m1?.warningBurmese).toContain('寒かったです');

      // 2. 知っていません -> 知りません
      const m2 = mistakeMap.get('mistake_02_shitte_imasen');
      expect(m2?.incorrect).toContain('知っていません');
      expect(m2?.correct).toContain('知りません');
      expect(m2?.warningBurmese).toContain('言わない!');

      // 3. 帽子を着る -> 帽子をかぶる
      const m3 = mistakeMap.get('mistake_03_boushi_o_kiru');
      expect(m3?.incorrect).toContain('帽子を着る');
      expect(m3?.correct).toContain('帽子をかぶる');
      expect(m3?.detailedExplanationMy).toContain('かぶる');

      // 4. イギリス人に結婚する -> イギリス人と結婚する
      const m4 = mistakeMap.get('mistake_04_kekkon_particle');
      expect(m4?.incorrect).toContain('イギリス人に結婚する');
      expect(m4?.correct).toContain('イギリス人と結婚する');
      expect(m4?.detailedExplanationMy).toContain('と');

      // 5. この道に行ってください -> この道を行ってください
      const m5 = mistakeMap.get('mistake_05_michi_motion_particle');
      expect(m5?.incorrect).toContain('この道に行ってください');
      expect(m5?.correct).toContain('この道を行ってください');
      expect(m5?.detailedExplanationMy).toContain('を');

      // 6. 来ない (きない) -> 来ない (こない)
      const m6 = mistakeMap.get('mistake_06_konai_irregular');
      expect(m6?.incorrect).toContain('来ない (きない)');
      expect(m6?.correct).toContain('来ない (こない)');
      expect(m6?.detailedExplanationMy).toContain('こない');
    });

    it('verifies N5 lesson packs contain annotated 言わない! warnings', () => {
      const checkPackCommonMistakes = (filename: string, expectedSnippet: string) => {
        const filePath = path.resolve(__dirname, `../content/packs/n5/${filename}`);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const parsed = LessonPackSchema.parse(content);
        const allMistakes = parsed.grammars.flatMap((g) => g.commonMistakes);
        const match = allMistakes.some((m) => m.includes(expectedSnippet));
        expect(match).toBe(true);
      };

      checkPackCommonMistakes('n5.l12.json', '寒かったです');
      checkPackCommonMistakes('n5.l16.json', '知りません');
      checkPackCommonMistakes('n5.l16.json', 'イギリス人と結婚する');
      checkPackCommonMistakes('n5.l18.json', 'こない');
      checkPackCommonMistakes('n5.l25.json', '帽子をかぶる');
      checkPackCommonMistakes('n5.l26.json', 'この道を行ってください');
    });
  });

  describe('3. N5 Kanji Catalog Expansion & Authentic Compounds', () => {
    it('includes high-frequency N5 Kanji and specified compound words with Burmese definitions', () => {
      // 1. 人口 (じんこう) လူဦးရေ
      expect(CURATED_KANJI_CATALOG['人']).toBeDefined();
      const jinkou = CURATED_KANJI_CATALOG['人'].examples.find((e) => e.word === '人口');
      expect(jinkou).toBeDefined();
      expect(jinkou?.reading).toBe('じんこう');
      expect(jinkou?.meaningMy).toContain('လူဦးရေ');

      // 2. 非常口 (ひじょうぐち) အရေးပေါ်ထွက်ပေါက်
      expect(CURATED_KANJI_CATALOG['口']).toBeDefined();
      const hijouguchi = CURATED_KANJI_CATALOG['口'].examples.find((e) => e.word === '非常口');
      expect(hijouguchi).toBeDefined();
      expect(hijouguchi?.reading).toBe('ひじょうぐち');
      expect(hijouguchi?.meaningMy).toContain('အရေးပေါ်ထွက်ပေါက်');

      // 3. 往復 (おうふく) အသွားအပြန်
      expect(CURATED_KANJI_CATALOG['往']).toBeDefined();
      const oufuku = CURATED_KANJI_CATALOG['往'].examples.find((e) => e.word === '往復');
      expect(oufuku).toBeDefined();
      expect(oufuku?.reading).toBe('おうふく');
      expect(oufuku?.meaningMy).toContain('အသွားအပြန်');

      // 4. 発明 (はつめい) တီထွင်မှု
      expect(CURATED_KANJI_CATALOG['明']).toBeDefined();
      const hatsumei = CURATED_KANJI_CATALOG['明'].examples.find((e) => e.word === '発明');
      expect(hatsumei).toBeDefined();
      expect(hatsumei?.reading).toBe('はつめい');
      expect(hatsumei?.meaningMy).toContain('တီထွင်မှု');

      // 5. 暗証番号 (あんしょうばんごう) လျှို့ဝှက်နံပါတ်
      expect(CURATED_KANJI_CATALOG['番']).toBeDefined();
      const anshou = CURATED_KANJI_CATALOG['番'].examples.find((e) => e.word === '暗証番号');
      expect(anshou).toBeDefined();
      expect(anshou?.reading).toBe('あんしょうばんごう');
      expect(anshou?.meaningMy).toContain('လျှို့ဝှက်နံပါတ်');

      // 6. 都合 (つごう) အခြေအနေ
      expect(CURATED_KANJI_CATALOG['合']).toBeDefined();
      const tsugou = CURATED_KANJI_CATALOG['合'].examples.find((e) => e.word === '都合');
      expect(tsugou).toBeDefined();
      expect(tsugou?.reading).toBe('つごう');
      expect(tsugou?.meaningMy).toContain('အခြေအနေ');
    });
  });

  describe('4. Authentic Short Beginner Shadowing Dialogues', () => {
    it('provides natural 4-turn shadowing dialogues with complete Burmese localization', () => {
      expect(BEGINNER_SHADOWING_SCENARIOS.length).toBe(4);

      const scenarioMap = new Map(BEGINNER_SHADOWING_SCENARIOS.map((s) => [s.id, s]));

      // 1. Restaurant Ordering
      const s1 = scenarioMap.get('shadowing_n5_01_restaurant');
      expect(s1).toBeDefined();
      expect(s1?.turns.length).toBe(4);
      expect(s1?.turns[0].ja).toContain('いらっしゃいませ');
      expect(s1?.turns[1].ja).toContain('二人です');
      expect(s1?.turns[3].ja).toContain('ハンバーガーを二つと');
      expect(s1?.turns[3].my).toContain('ဟမ်ဘာဂါ');

      // 2. Train Platform Numbers
      const s2 = scenarioMap.get('shadowing_n5_02_train_platform');
      expect(s2).toBeDefined();
      expect(s2?.turns.length).toBe(4);
      expect(s2?.turns[0].ja).toContain('何番線ですか');
      expect(s2?.turns[1].ja).toContain('三番線ですよ');
      expect(s2?.turns[0].my).toContain('ပလက်ဖောင်း');

      // 3. Declining Invitations with ちょっと...
      const s3 = scenarioMap.get('shadowing_n5_03_declining_chotto');
      expect(s3).toBeDefined();
      expect(s3?.turns.length).toBe(4);
      expect(s3?.turns[0].ja).toContain('飲みに行きませんか');
      expect(s3?.turns[1].ja).toContain('ちょっと用事がありまして');
      expect(s3?.turns[1].my).toContain('နည်းနည်းရှိနေလို့ပါ');

      // 4. Talking About Health & Fever
      const s4 = scenarioMap.get('shadowing_n5_04_health_fever');
      expect(s4).toBeDefined();
      expect(s4?.turns.length).toBe(4);
      expect(s4?.turns[0].ja).toContain('顔色が悪いですね');
      expect(s4?.turns[1].ja).toContain('今朝から熱があって');
      expect(s4?.turns[1].my).toContain('ကိုယ်ပူနေပြီး');
    });

    it('verifies n5.l05.json and n5.l06.json have authentic Burmese translations in listening turns', () => {
      const p05 = path.resolve(__dirname, '../content/packs/n5/n5.l05.json');
      const d05 = LessonPackSchema.parse(JSON.parse(fs.readFileSync(p05, 'utf-8')));
      expect(d05.listening.turns[0].my).toContain('ဒီတစ်ခေါက် တနင်္ဂနွေနေ့မှာ');
      expect(d05.listening.turns[1].my).toContain('ကျည်ဆန်ရထားစီးပြီး');

      const p06 = path.resolve(__dirname, '../content/packs/n5/n5.l06.json');
      const d06 = LessonPackSchema.parse(JSON.parse(fs.readFileSync(p06, 'utf-8')));
      expect(d06.listening.turns[0].my).toContain('၁၂ နာရီ ထိုးပြီနော်');
      expect(d06.listening.turns[2].my).toContain('ဘူတာရှေ့က ထမင်းဆိုင်မှာ');
    });
  });
});
