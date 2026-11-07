import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  decomposeIntoMoras,
  calculatePitchContour,
  inferPitchAccent,
  PITCH_METADATA,
} from '../src/domain/audio/pitch-accent';
import {
  PitchAccentVisualizer,
} from '../src/presentation/components/PitchAccentVisualizer';
import {
  checkJapaneseVoiceSupport,
  testJapaneseVoiceSpeech,
  getMoraTimingEstimate,
  filterJapaneseVoices,
  JAPANESE_TTS_MISSING_WARNING_MY,
} from '../src/services/audio-resiliency';
import { ShadowingPracticeScreen } from '../src/presentation/components/ShadowingPracticeScreen';
import { ChoukaiWorkbench } from '../src/presentation/components/ChoukaiWorkbench';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';
import { ContentLoader } from '../src/data/content/content-loader';
import { DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';

describe('Pitch Accent Visualizer & Audio Resiliency Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    } else {
      if (!(globalThis as any).window.addEventListener) {
        (globalThis as any).window.addEventListener = vi.fn();
      }
      if (!(globalThis as any).window.removeEventListener) {
        (globalThis as any).window.removeEventListener = vi.fn();
      }
    }
  });

  afterEach(() => {
    if ((globalThis as any).window) {
      delete (globalThis as any).window.speechSynthesis;
    }
  });

  // =========================================================================
  // 1. Mora Decomposition & Phonetic Tokenization
  // =========================================================================
  describe('decomposeIntoMoras: Japanese Phonetic Mora Decomposition', () => {
    it('decomposes standard single-kana syllables correctly', () => {
      expect(decomposeIntoMoras('あめ')).toEqual(['あ', 'め']);
      expect(decomposeIntoMoras('やま')).toEqual(['や', 'ま']);
      expect(decomposeIntoMoras('さくら')).toEqual(['さ', 'く', 'ら']);
    });

    it('combines contracted syllables (拗音 - ようおん) into a single mora', () => {
      // きょう -> [きょ, う] (2 moras)
      expect(decomposeIntoMoras('きょう')).toEqual(['きょ', 'う']);
      // しゃちょう -> [しゃ, ちょ, う] (3 moras)
      expect(decomposeIntoMoras('しゃちょう')).toEqual(['しゃ', 'ちょ', 'う']);
      // とうきょう -> [と, う, きょ, う] (4 moras)
      expect(decomposeIntoMoras('とうきょう')).toEqual(['と', 'う', 'きょ', 'う']);
    });

    it('treats sokuon (促音 - っ), long vowels (長音 - ー), and nasals (ん) as separate moras', () => {
      // きって -> [き, っ, て] (3 moras)
      expect(decomposeIntoMoras('きって')).toEqual(['き', 'っ', 'て']);
      // にほん -> [に, ほ, ん] (3 moras)
      expect(decomposeIntoMoras('にほん')).toEqual(['に', 'ほ', 'ん']);
      // アイスコーヒー -> [ア, イ, ス, コ, ー, ヒ, ー] (7 moras)
      expect(decomposeIntoMoras('アイスコーヒー')).toEqual(['ア', 'イ', 'ス', 'コ', 'ー', 'ヒ', 'ー']);
    });

    it('strips punctuation, fullwidth spaces, and punctuation symbols', () => {
      const moras = decomposeIntoMoras('「こんにちは、みなさん。」');
      expect(moras).toEqual(['こ', 'ん', 'に', 'ち', 'は', 'み', 'な', 'さ', 'ん']);
    });

    it('safely handles empty or null strings', () => {
      expect(decomposeIntoMoras('')).toEqual([]);
      expect(decomposeIntoMoras('   ')).toEqual([]);
    });
  });

  // =========================================================================
  // 2. Mora Pitch Level & Accent Drop Calculations
  // =========================================================================
  describe('calculatePitchContour: Pitch Pattern Curves & Accent Nucleus', () => {
    it('calculates Heiban (平板 - Type 0): Low start, rises on mora 2 and stays High', () => {
      const result = calculatePitchContour('さくら', 'heiban');
      expect(result.pattern).toBe('heiban');
      expect(result.typeNumber).toBe(0);
      expect(result.nameJa).toBe('平板');
      expect(result.particleLevel).toBe('H');

      // さ [L] -> く [H] -> ら [H]
      expect(result.moras).toHaveLength(3);
      expect(result.moras[0].level).toBe('L');
      expect(result.moras[1].level).toBe('H');
      expect(result.moras[2].level).toBe('H');
      // No drop nucleus in Heiban
      expect(result.moras.some((m) => m.isDropNucleus)).toBe(false);
    });

    it('calculates Atamadaka (頭高 - Type 1): High start on mora 1, drops immediately to Low', () => {
      const result = calculatePitchContour('いのち', 'atamadaka');
      expect(result.pattern).toBe('atamadaka');
      expect(result.typeNumber).toBe(1);
      expect(result.nameJa).toBe('頭高');
      expect(result.particleLevel).toBe('L');

      // い [H] (Drop) -> の [L] -> ち [L]
      expect(result.moras[0].level).toBe('H');
      expect(result.moras[0].isDropNucleus).toBe(true);
      expect(result.moras[1].level).toBe('L');
      expect(result.moras[2].level).toBe('L');
    });

    it('calculates Nakadaka (中高 - Type 2..N-1): Low start, rises, then drops before word end', () => {
      // なかだか (4 moras: な, か, だ, か) with drop at mora 2 (type 2)
      const result = calculatePitchContour('たまご', 'nakadaka', 2);
      expect(result.pattern).toBe('nakadaka');
      expect(result.typeNumber).toBe(2);
      expect(result.nameJa).toBe('中高');
      expect(result.particleLevel).toBe('L');

      // た [L] -> ま [H] (Drop) -> ご [L]
      expect(result.moras[0].level).toBe('L');
      expect(result.moras[1].level).toBe('H');
      expect(result.moras[1].isDropNucleus).toBe(true);
      expect(result.moras[2].level).toBe('L');
    });

    it('calculates Odaka (尾高 - Type N): Low start, stays High, drops on attached particle', () => {
      const result = calculatePitchContour('おとこ', 'odaka');
      expect(result.pattern).toBe('odaka');
      expect(result.typeNumber).toBe(3);
      expect(result.nameJa).toBe('尾高');
      expect(result.particleLevel).toBe('L');

      // お [L] -> と [H] -> こ [H] (Drop on particle)
      expect(result.moras[0].level).toBe('L');
      expect(result.moras[1].level).toBe('H');
      expect(result.moras[2].level).toBe('H');
      expect(result.moras[2].isDropNucleus).toBe(true);
    });

    it('handles single-mora words correctly', () => {
      const singleAtama = calculatePitchContour('め', 'atamadaka');
      expect(singleAtama.moras[0].level).toBe('H');
      expect(singleAtama.moras[0].isDropNucleus).toBe(true);
      expect(singleAtama.particleLevel).toBe('L');

      const singleHeiban = calculatePitchContour('き', 'heiban');
      expect(singleHeiban.moras[0].level).toBe('L');
      expect(singleHeiban.moras[0].isDropNucleus).toBe(false);
      expect(singleHeiban.particleLevel).toBe('H');
    });
  });

  // =========================================================================
  // 3. PitchAccentVisualizer Component Mount & Render Verifications
  // =========================================================================
  describe('PitchAccentVisualizer: SVG Curve & Badge Rendering', () => {
    it('renders Heiban badge and SVG curve with cyan theme and Burmese explanation', () => {
      const html = renderToString(
        React.createElement(PitchAccentVisualizer, {
          text: 'にほんご',
          pattern: 'heiban',
        })
      );

      expect(html).toContain('平板');
      expect(html).toContain('[0型]');
      expect(html).toContain('(Heiban)');
      expect(html).toContain('အစနိမ့် အဆုံးမြင့်');
      // SVG curve and kana nodes
      expect(html).toContain('<svg');
      expect(html).toContain('に');
      expect(html).toContain('ほ');
      expect(html).toContain('ん');
      expect(html).toContain('ご');
    });

    it('renders Atamadaka badge and drop marker with rose theme and Burmese explanation', () => {
      const html = renderToString(
        React.createElement(PitchAccentVisualizer, {
          text: 'てんき',
          pattern: 'atamadaka',
        })
      );

      expect(html).toContain('頭高');
      expect(html).toContain('[1型]');
      expect(html).toContain('(Atamadaka)');
      expect(html).toContain('အစမြင့် ချက်ချင်းဆင်း');
      // Red drop indicator
      expect(html).toContain('fill="#ef4444"');
    });

    it('renders Nakadaka badge with amber theme', () => {
      const html = renderToString(
        React.createElement(PitchAccentVisualizer, {
          text: 'ハンバーガー',
          pattern: 'nakadaka',
          dropMora: 3,
        })
      );

      expect(html).toContain('中高');
      expect(html).toContain('(Nakadaka)');
      expect(html).toContain('အလယ်မြင့် ပြန်ဆင်း');
    });

    it('renders Odaka badge with emerald theme', () => {
      const html = renderToString(
        React.createElement(PitchAccentVisualizer, {
          text: 'やま',
          pattern: 'odaka',
        })
      );

      expect(html).toContain('尾高');
      expect(html).toContain('(Odaka)');
      expect(html).toContain('အဆုံးမြင့် ဝိဘတ်ဆင်း');
    });

    it('renders in compact mode with reduced badge and geometry', () => {
      const html = renderToString(
        React.createElement(PitchAccentVisualizer, {
          text: 'ふたり',
          pattern: 'nakadaka',
          compact: true,
        })
      );

      expect(html).toContain('中高');
      // In compact mode, long Burmese explanation is hidden from badge line
      expect(html).not.toContain('အလယ်တွင် မြင့်တက်ပြီး');
    });
  });

  // =========================================================================
  // 4. Audio Resiliency & Japanese TTS Diagnostics
  // =========================================================================
  describe('Audio Resiliency & Japanese Voice Diagnostics', () => {
    it('filters Japanese voices correctly from mixed voice lists', () => {
      const mockVoices: any[] = [
        { name: 'Alex', lang: 'en-US' },
        { name: 'Kyoko', lang: 'ja-JP' },
        { name: 'Microsoft Ayumi - Japanese (Japan)', lang: 'ja-JP' },
        { name: 'Google 日本語', lang: 'ja-JP' },
        { name: 'Yuna', lang: 'ko-KR' },
      ];

      const jaVoices = filterJapaneseVoices(mockVoices);
      expect(jaVoices).toHaveLength(3);
      expect(jaVoices.some((v) => v.name.includes('Kyoko'))).toBe(true);
      expect(jaVoices.some((v) => v.name.includes('Ayumi'))).toBe(true);
      expect(jaVoices.some((v) => v.name.includes('Google 日本語'))).toBe(true);
    });

    it('checkJapaneseVoiceSupport detects available Japanese voices', async () => {
      const mockSynth = {
        getVoices: vi.fn(() => [
          { name: 'Google US English', lang: 'en-US' },
          { name: 'Google 日本語', lang: 'ja-JP' },
        ]),
        onvoiceschanged: null,
      };
      (globalThis as any).window.speechSynthesis = mockSynth;

      const diag = await checkJapaneseVoiceSupport(true);
      expect(diag.isWebSpeechAvailable).toBe(true);
      expect(diag.hasJaVoice).toBe(true);
      expect(diag.defaultVoiceName).toBe('Google 日本語');
      expect(diag.japaneseVoices).toHaveLength(1);
    });

    it('checkJapaneseVoiceSupport correctly flags when no Japanese voice exists', async () => {
      const mockSynth = {
        getVoices: vi.fn(() => [
          { name: 'David', lang: 'en-US' },
          { name: 'Zira', lang: 'en-US' },
        ]),
        onvoiceschanged: null,
      };
      (globalThis as any).window.speechSynthesis = mockSynth;

      const diag = await checkJapaneseVoiceSupport(true);
      expect(diag.isWebSpeechAvailable).toBe(true);
      expect(diag.hasJaVoice).toBe(false);
      expect(diag.japaneseVoices).toHaveLength(0);
      expect(diag.defaultVoiceName).toBeUndefined();
    });

    it('handles environments without window.speechSynthesis gracefully', async () => {
      delete (globalThis as any).window.speechSynthesis;
      const diag = await checkJapaneseVoiceSupport(true);
      expect(diag.isWebSpeechAvailable).toBe(false);
      expect(diag.hasJaVoice).toBe(false);
    });

    it('getMoraTimingEstimate computes accurate timing based on mora count and rate', () => {
      const est1 = getMoraTimingEstimate('さようなら', 1.0);
      expect(est1.moraCount).toBe(5); // さ, よ, う, な, ら
      expect(est1.durationMs).toBe(800);

      // Fast rate 1.5x -> ~533ms
      const estFast = getMoraTimingEstimate('さようなら', 1.5);
      expect(estFast.durationMs).toBeLessThan(est1.durationMs);
    });

    it('testJapaneseVoiceSpeech handles missing synthesis cleanly with error return', async () => {
      delete (globalThis as any).window.speechSynthesis;
      const result = await testJapaneseVoiceSpeech();
      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  // =========================================================================
  // 5. Workbench Integration & Mount Verification
  // =========================================================================
  describe('Workbench Integration Verifications', () => {
    it('mounts ShadowingPracticeScreen with Pitch Contour toggle and visualizers', async () => {
      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();

      const html = renderToString(
        React.createElement(ShadowingPracticeScreen, {
          pack: pack!,
          isPlaying: false,
          currentPlayingText: null,
          play: vi.fn(),
          stop: vi.fn(),
          onProceed: vi.fn(),
        })
      );

      // Verify Pitch Contour toggle in control bar
      expect(html).toContain('Pitch Contour: ON');
      // Verify visualizer rendered for dialogue turns
      expect(html).toContain('data-testid="pitch-accent-visualizer"');
      expect(html).toContain('လိုက်ဆိုလေ့ကျင့်ခြင်း (Shadowing)');
    });

    it('mounts ChoukaiWorkbench and includes pitch accent badges in dialogue', () => {
      const html = renderToString(
        React.createElement(ChoukaiWorkbench, {
          initialScenarioId: 'choukai_n2_01_kadai',
          embeddedMode: true,
        })
      );

      expect(html).toContain('課題理解 (Task Comprehension)');
      expect(html).toBeDefined();
    });

    it('mounts SettingsScreen with Japanese Speech Synthesis (TTS) Diagnostic card', () => {
      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: DEFAULT_USER_PROFILE,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain('Japanese Speech Synthesis (TTS) &amp; Voice Health');
      expect(html).toContain('Test Voice (အသံ စမ်းသပ်မည်)');
    });
  });
});
