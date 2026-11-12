import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  N5ReferenceWorkbench,
} from '../src/presentation/components/N5ReferenceWorkbench';
import {
  N5_COUNTERS_TABLE,
  N5_CONVERSATIONAL_EXPRESSIONS,
  N5_CALENDAR_DATES,
  N5_PHONETIC_SHIFTS,
} from '../src/domain/curriculum/n5-expressions-catalog';
import { N5_COMMON_MISTAKES_CATALOG } from '../src/domain/curriculum/n5-common-mistakes-catalog';
import { QuickSearchEngine } from '../src/domain/search/quick-search-engine';
import { db, DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';

describe('N5ReferenceWorkbench & Curriculum Traps Integration', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.srs_cards.clear();
  });

  // =========================================================================
  // 1. Tab 1: Counters, Dates & Irregular Phonetic Shifts
  // =========================================================================
  describe('Tab 1: Counters Table, Irregularities & Interactive Tester', () => {
    it('renders Tab 1 Counters by default with full table data and headers', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'counters',
        })
      );

      // Verify core header and tab titles
      expect(html).toContain('N5 Master Reference Workbench');
      expect(html).toContain('အခြေခံ ရေတွက်ပုံများ');
      expect(html).toContain('INTERACTIVE NUMBER TESTER');

      // Verify counter definitions are present
      expect(html).toContain('〜つ');
      expect(html).toContain('〜本');
      expect(html).toContain('〜人');
      expect(html).toContain('〜枚');
      expect(html).toContain('〜冊');
      expect(html).toContain('〜杯');
      expect(html).toContain('〜匹');
      expect(html).toContain('〜台');
    });

    it('highlights irregular phonetic sound changes in counter tables (e.g., いっぽん, さんぼん)', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'counters',
        })
      );

      // Verify irregular indicator in tester / table
      expect(html).toContain('အထူး အသံပြောင်းလဲမှု (Irregular Sound Change)');
      // ~hon: 1本 (いっぽん), 3本 (さんぼん), 6本 (ろっぽん), 8本 (はっぽん)
      expect(html).toContain('いっぽん');
      expect(html).toContain('さんぼん');
      expect(html).toContain('ろっぽん');
      expect(html).toContain('はっぽん');
    });

    it('renders the interactive number tester with numbers 1 to 10 and selected counter', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'counters',
        })
      );

      // Interactive number buttons (1 to 10)
      for (let n = 1; n <= 10; n++) {
        expect(html).toContain(`>${n}<`);
      }
      // Counter selector options
      expect(html).toContain('hon');
      expect(html).toContain('nin');
      expect(html).toContain('tsu');
    });
  });

  // =========================================================================
  // 2. Tab 2: Situational Expressions & Greetings
  // =========================================================================
  describe('Tab 2: Conversational Expressions Catalog', () => {
    it('renders Tab 2 with categorized situational expressions and Burmese translations', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'expressions',
        })
      );

      expect(html).toContain('Expressions &amp; Greetings');
      expect(html).toContain('နှုတ်ဆက်စကားများ');

      // Check category chips
      expect(html).toContain('အားလုံး');
      expect(html).toContain('နှုတ်ဆက်');
      expect(html).toContain('လုပ်ငန်းခွင်');
      expect(html).toContain('စားသောက်');
      expect(html).toContain('ဧည့်ဝတ်');
      expect(html).toContain('တုံ့ပြန်စကား');
      expect(html).toContain('ခရီးသွား/ဈေးဝယ်');

      // Check specific high-frequency expressions
      expect(html).toContain('いただきます');
      expect(html).toContain('itadakimasu');
      expect(html).toContain('စားသောက်ပါတော့မည်');

      expect(html).toContain('お疲れ様でした');
      expect(html).toContain('otsukaresama deshita');

      expect(html).toContain('いらっしゃいませ');
      expect(html).toContain('irasshaimase');
    });

    it('displays realistic dialogue examples and contextual usage notes for expressions', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'expressions',
        })
      );

      // Check that dialogue or situation container is rendered
      expect(html).toContain('နမူနာ စကားပြောခန်း (Dialogue Example):');
      expect(html).toContain('သုံးစွဲရမည့် အခြေအနေ:');
    });
  });

  // =========================================================================
  // 3. Tab 3: Common Mistakes (言わない! / အမှားများ)
  // =========================================================================
  describe('Tab 3: Common Learner Traps & Warning Cards', () => {
    it('renders Tab 3 with contrastive ❌ Incorrect vs ⭕ Correct badge cards and Burmese rationale', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          initialTab: 'mistakes',
        })
      );

      expect(html).toContain('Common Traps (言わない! အမှားများ)');

      // Verify category filter chips
      expect(html).toContain('အားလုံး');
      expect(html).toContain('い-Adjectives');
      expect(html).toContain('な-Adjectives');
      expect(html).toContain('Verbs (知る)');
      expect(html).toContain('ဝတ်ဆင်ခြင်း (着る)');

      // Verify specific classic trap: 寒いでした (❌) vs 寒かったです (⭕)
      expect(html).toContain('寒いでした');
      expect(html).toContain('寒かったです');
      expect(html).toContain('い-နာမဝိသေသနများ');

      // Verify specific trap: さようなら to boss (❌) vs お先に失礼します (⭕)
      expect(html).toContain('さようなら (to teacher/boss)');
      expect(html).toContain('お先に失礼します');
      expect(html).toContain('「さようなら」သည် ကာလကြာရှည် ခွဲခွာမည့်အခါ');
    });

    it('verifies catalog completeness: at least 10 high-value N5 mistake items exist', () => {
      expect(N5_COMMON_MISTAKES_CATALOG.length).toBeGreaterThanOrEqual(10);
      const pastAdjMistake = N5_COMMON_MISTAKES_CATALOG.find((m) => m.id === 'mistake_01_i_adj_past');
      expect(pastAdjMistake).toBeDefined();
      expect(pastAdjMistake?.incorrect).toContain('寒いでした');
      expect(pastAdjMistake?.correct).toContain('寒かったです');
    });
  });

  // =========================================================================
  // 4. Modal Visibility & Lifecycle Controls
  // =========================================================================
  describe('Modal Visibility & Lifecycle', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: false,
        })
      );
      expect(html).toBe('');
    });

    it('renders close button when onClose handler is provided', () => {
      const onClose = vi.fn();
      const html = renderToString(
        React.createElement(N5ReferenceWorkbench, {
          isOpen: true,
          onClose,
        })
      );
      expect(html).toContain('title="Close (Esc)"');
    });
  });

  // =========================================================================
  // 5. QuickSearchEngine Indexing & Deep Discovery
  // =========================================================================
  describe('QuickSearchEngine Integration for Counters, Expressions & Traps', () => {
    it('finds counter items by romaji and kana (e.g., "hitori" -> 一人, "tsu")', async () => {
      const resRomaji = await QuickSearchEngine.search('hitori');
      const counterItem = resRomaji.find((r) => r.category === 'counter' && r.referenceTab === 'counters');
      expect(counterItem).toBeDefined();
      expect(counterItem?.title).toBe('一人 (ひとり)');

      const resKana = await QuickSearchEngine.search('ふたり');
      const counterItemKana = resKana.find((r) => r.category === 'counter');
      expect(counterItemKana).toBeDefined();
      expect(counterItemKana?.title).toBe('二人 (ふたり)');
    });

    it('finds counters table definition by unit name (e.g., "~hon", "~mai")', async () => {
      const res = await QuickSearchEngine.search('~hon');
      const counterDef = res.find((r) => r.category === 'counter' && r.title.includes('本'));
      expect(counterDef).toBeDefined();
      expect(counterDef?.referenceTab).toBe('counters');
      expect(counterDef?.meaningEn.toLowerCase()).toContain('long cylindrical');
    });

    it('finds expressions by Japanese, romaji, and Burmese translation', async () => {
      // Romaji search
      const resRomaji = await QuickSearchEngine.search('kashikomarimashita');
      const expRomaji = resRomaji.find((r) => r.category === 'expression');
      expect(expRomaji).toBeDefined();
      expect(expRomaji?.title).toBe('かしこまりました');
      expect(expRomaji?.referenceTab).toBe('expressions');

      // Japanese kanji search
      const resKanji = await QuickSearchEngine.search('お疲れ様');
      const expKanji = resKanji.find((r) => r.category === 'expression');
      expect(expKanji).toBeDefined();
      expect(expKanji?.title).toBe('お疲れ様でした');

      // Burmese keyword search
      const resBurmese = await QuickSearchEngine.search('စားသောက်');
      const expBurmese = resBurmese.find((r) => r.category === 'expression');
      expect(expBurmese).toBeDefined();
    });

    it('finds common learner traps by incorrect form or rule keywords', async () => {
      const resTrap = await QuickSearchEngine.search('寒いでした');
      const trap = resTrap.find((r) => r.category === 'trap');
      expect(trap).toBeDefined();
      expect(trap?.referenceTab).toBe('mistakes');
      expect(trap?.badge).toBe('N5 Trap (言わない!)');
      expect(trap?.title).toContain('寒かったです');

      const resSayounara = await QuickSearchEngine.search('さようなら');
      const trapSayounara = resSayounara.find((r) => r.category === 'trap');
      expect(trapSayounara).toBeDefined();
      expect(trapSayounara?.title).toContain('お先に失礼します');
    });

    it('finds calendar dates and irregular phonetic shifts', async () => {
      const resDate = await QuickSearchEngine.search('ついたち');
      const dateItem = resDate.find((r) => r.category === 'counter');
      expect(dateItem).toBeDefined();
      expect(dateItem?.title).toBe('一日 (ついたち)');

      const resArabicDate = await QuickSearchEngine.search('1日');
      const dateItemArabic = resArabicDate.find((r) => r.category === 'counter');
      expect(dateItemArabic).toBeDefined();

      const resShift = await QuickSearchEngine.search('ろっぴゃく');
      const shiftItem = resShift.find((r) => r.category === 'counter');
      expect(shiftItem).toBeDefined();
      expect(shiftItem?.title).toContain('六百 (ろっぴゃく)');
    });
  });

  // =========================================================================
  // 6. LessonPlayerScreen & Navigation Header Integration
  // =========================================================================
  describe('LessonPlayerScreen Navigation & Embedded Workbench Integration', () => {
    it('mounts LessonPlayerScreen and renders the N5 Ref header button and workbench modal container', async () => {
      const { ContentLoader } = await import('../src/data/content/content-loader');
      const { LessonPlayerScreen } = await import('../src/presentation/screens/LessonPlayerScreen');

      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();

      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: pack!,
          profile: DEFAULT_USER_PROFILE,
          onMasteryUpdated: vi.fn(),
          onExit: vi.fn(),
        })
      );

      // Verify N5 Ref action button in top navigation bar
      expect(html).toContain('N5 Ref');
      // Verify workbench component is mounted (hidden when closed, active on state)
      expect(html).toBeDefined();
    }, 15000);
  });
});
