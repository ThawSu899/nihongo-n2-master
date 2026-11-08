import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizePhoneticText,
  getPhoneticUtteranceText,
  getVoicePriorityScore,
  rankJapaneseVoices,
  selectOptimalJapaneseVoice,
  speakVocabulary,
  VocabularyAudioItem,
} from '../src/domain/audio/tts-engine';

describe('TTS & Pronunciation Accuracy Engine', () => {
  describe('sanitizePhoneticText', () => {
    it('strips tildes, wave dashes, and formatting brackets', () => {
      expect(sanitizePhoneticText('〜によると')).toBe('によると');
      expect(sanitizePhoneticText('～ばかりか～')).toBe('ばかりか');
      expect(sanitizePhoneticText('【なおす】')).toBe('なおす');
      expect(sanitizePhoneticText('からい (な)')).toBe('からい');
      expect(sanitizePhoneticText('べんきょう（する）')).toBe('べんきょう');
    });

    it('preserves valid Kana, sokuon (っ), and long vowel markers (ー)', () => {
      expect(sanitizePhoneticText('がっこう')).toBe('がっこう');
      expect(sanitizePhoneticText('コーヒー')).toBe('コーヒー');
      expect(sanitizePhoneticText('もっとも')).toBe('もっとも');
    });

    it('handles empty or whitespace strings gracefully', () => {
      expect(sanitizePhoneticText('')).toBe('');
      expect(sanitizePhoneticText('   ')).toBe('');
    });
  });

  describe('getPhoneticUtteranceText', () => {
    it('prioritizes explicit kana reading over kanji headword', () => {
      const vocabItem: VocabularyAudioItem = {
        ja: '直す',
        kana: 'なおす',
      };
      // Must return 'なおす' to prevent browser TTS guessing 'ただす'
      expect(getPhoneticUtteranceText(vocabItem)).toBe('なおす');
    });

    it('prioritizes reading field if kana is absent', () => {
      const vocabItem: VocabularyAudioItem = {
        word: '辛い',
        reading: 'からい',
      };
      // Must return 'からい' to prevent browser TTS guessing 'つらい'
      expect(getPhoneticUtteranceText(vocabItem)).toBe('からい');
    });

    it('falls back to word/ja if no explicit reading exists', () => {
      const vocabItem: VocabularyAudioItem = {
        ja: 'さくら',
      };
      expect(getPhoneticUtteranceText(vocabItem)).toBe('さくら');
    });

    it('supports direct string inputs', () => {
      expect(getPhoneticUtteranceText('〜にしたがって')).toBe('にしたがって');
    });
  });

  describe('Voice Ranking & Selection Architecture', () => {
    const mockVoices: SpeechSynthesisVoice[] = [
      {
        name: 'Microsoft David Desktop',
        lang: 'en-US',
        default: false,
        localService: true,
        voiceURI: 'david',
      },
      {
        name: 'Microsoft Ayumi - Japanese (Japan)',
        lang: 'ja-JP',
        default: false,
        localService: true,
        voiceURI: 'ayumi',
      },
      {
        name: 'Google 日本語',
        lang: 'ja-JP',
        default: false,
        localService: false,
        voiceURI: 'google-ja',
      },
      {
        name: 'Microsoft Nanami Online (Natural) - Japanese (Japan)',
        lang: 'ja-JP',
        default: true,
        localService: false,
        voiceURI: 'nanami-natural',
      },
      {
        name: 'Kyoko (Enhanced)',
        lang: 'ja-JP',
        default: false,
        localService: false,
        voiceURI: 'kyoko-enhanced',
      },
      {
        name: 'Microsoft Keita Online (Natural) - Japanese (Japan)',
        lang: 'ja-JP',
        default: false,
        localService: false,
        voiceURI: 'keita-natural',
      },
    ];

    it('assigns correct priority scores according to neural quality tiers', () => {
      expect(getVoicePriorityScore(mockVoices[0])).toBe(-1); // English
      expect(getVoicePriorityScore(mockVoices[3])).toBe(1000); // Nanami Natural (Tier 1)
      expect(getVoicePriorityScore(mockVoices[5])).toBe(990); // Keita Natural (Tier 1)
      expect(getVoicePriorityScore(mockVoices[2])).toBe(800); // Google 日本語 (Tier 2)
      expect(getVoicePriorityScore(mockVoices[4])).toBe(650); // Kyoko Enhanced (Tier 3)
      expect(getVoicePriorityScore(mockVoices[1])).toBe(410); // Ayumi (Tier 4)
    });

    it('ranks Japanese voices with Tier 1 Neural voices at the top', () => {
      const ranked = rankJapaneseVoices(mockVoices);
      expect(ranked.length).toBe(5); // Only ja-JP voices included
      expect(ranked[0].name).toContain('Nanami');
      expect(ranked[1].name).toContain('Keita');
      expect(ranked[2].name).toContain('Google 日本語');
    });

    it('selects optimal voice respecting gender preference', () => {
      const optimalFemale = selectOptimalJapaneseVoice(mockVoices, 'female');
      expect(optimalFemale?.name).toContain('Nanami');

      const optimalMale = selectOptimalJapaneseVoice(mockVoices, 'male');
      expect(optimalMale?.name).toContain('Keita');

      const optimalNeutral = selectOptimalJapaneseVoice(mockVoices, 'neutral');
      expect(optimalNeutral?.name).toContain('Nanami');
    });
  });

  describe('speakVocabulary Audio Synthesis', () => {
    let speakMock: any;
    let cancelMock: any;
    let originalSpeechSynthesis: any;

    beforeEach(() => {
      speakMock = vi.fn();
      cancelMock = vi.fn();

      if (typeof (globalThis as any).window === 'undefined') {
        (globalThis as any).window = globalThis;
      }

      const mockSynth = {
        speak: speakMock,
        cancel: cancelMock,
        resume: vi.fn(),
        paused: false,
        getVoices: () => [
          {
            name: 'Microsoft Nanami Online (Natural) - Japanese (Japan)',
            lang: 'ja-JP',
            default: true,
            localService: false,
            voiceURI: 'nanami-natural',
          },
        ],
      };

      const mockUtterance = class {
        text: string;
        lang: string = '';
        rate: number = 1.0;
        pitch: number = 1.0;
        voice: any = null;
        onstart: any = null;
        onend: any = null;
        onerror: any = null;
        constructor(text: string) {
          this.text = text;
        }
      };

      originalSpeechSynthesis = (globalThis as any).speechSynthesis;
      (globalThis as any).speechSynthesis = mockSynth;
      (globalThis as any).window.speechSynthesis = mockSynth;
      (globalThis as any).SpeechSynthesisUtterance = mockUtterance;
      (globalThis as any).window.SpeechSynthesisUtterance = mockUtterance;
    });

    afterEach(() => {
      (globalThis as any).speechSynthesis = originalSpeechSynthesis;
      vi.restoreAllMocks();
    });

    it('synthesizes using verified Kana reading instead of kanji homograph', () => {
      const item: VocabularyAudioItem = {
        ja: '人気',
        kana: 'にんき',
      };

      const utterance = speakVocabulary(item);
      expect(cancelMock).toHaveBeenCalled();
      expect(speakMock).toHaveBeenCalled();
      expect(utterance).not.toBeNull();
      // Crucial phonological guarantee: SpeechSynthesis text MUST be 'にんき'
      expect(utterance?.text).toBe('にんき');
      expect(utterance?.lang).toBe('ja-JP');
      expect(utterance?.voice?.name).toContain('Nanami');
    });

    it('verifies phonetic disambiguation for core JLPT homographs', () => {
      const homographs: Array<{ ja: string; kana: string }> = [
        { ja: '直す', kana: 'なおす' },
        { ja: '辛い', kana: 'からい' },
        { ja: '生物', kana: 'せいぶつ' },
        { ja: '一日', kana: 'ついたち' },
        { ja: '明日', kana: 'あした' },
        { ja: '角', kana: 'かど' },
        { ja: '行く', kana: 'いく' },
      ];

      for (const h of homographs) {
        const utt = speakVocabulary(h);
        expect(utt?.text).toBe(h.kana);
        expect(utt?.text).not.toBe(h.ja);
      }
    });
  });
});
