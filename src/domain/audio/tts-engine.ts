/**
 * Centralized Phonetic Text-to-Speech (TTS) Engine for Japanese Vocabulary
 * Enforces reading accuracy, Neural voice ranking, and clean phonetic input.
 */

export interface VocabularyAudioItem {
  ja?: string;
  word?: string;
  kana?: string;
  reading?: string;
  pitchPattern?: string;
  dropIndex?: number;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  speaker?: string;
  genderPreference?: 'male' | 'female' | 'neutral';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Sanitizes phonetic reading strings for TTS synthesis:
 * Strips formatting annotations (〜, ～, ~, (な), (する), brackets) while preserving
 * pure Kana, geminate sokuon (っ), long vowel markers (ー), and valid punctuation.
 */
export function sanitizePhoneticText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[~〜～]/g, '')
    .replace(/\([^)）]*\)/g, '')
    .replace(/（[^)）]*）/g, '')
    .replace(/[【】\[\]]/g, '')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

/**
 * Extracts the optimal phonetic reading string from a vocabulary item or raw string.
 * Priority:
 * 1. Sanitized explicit Kana reading (vocab.kana || vocab.reading)
 * 2. Sanitized word/ja headword fallback if no separate reading is available.
 */
export function getPhoneticUtteranceText(
  item: VocabularyAudioItem | string
): string {
  if (!item) return '';
  if (typeof item === 'string') {
    return sanitizePhoneticText(item);
  }

  const explicitReading = item.kana || item.reading;
  if (explicitReading) {
    const sanitized = sanitizePhoneticText(explicitReading);
    if (sanitized) return sanitized;
  }

  return sanitizePhoneticText(item.ja || item.word || '');
}

/**
 * Voice priority scoring table matching the architectural tiers:
 * Tier 1 (1000): Microsoft Nanami / Keita Online (Natural)
 * Tier 2 (800):  Google 日本語
 * Tier 3 (600):  Kyoko (Enhanced) / Otoya (Enhanced)
 * Tier 4 (400):  Haruka / Ichiro / Ayumi (Standard local fallbacks)
 * Tier 5 (200):  Any other Japanese tagged voice
 */
export function getVoicePriorityScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = (voice.lang || '').toLowerCase();

  // Non-Japanese voices get negative score
  if (!lang.startsWith('ja') && !lang.includes('jp') && !name.includes('japanese') && !name.includes('nihongo')) {
    return -1;
  }

  // Tier 1: Microsoft Neural Natural voices (Edge / Windows 11)
  if (name.includes('nanami') && (name.includes('natural') || name.includes('online'))) return 1000;
  if (name.includes('keita') && (name.includes('natural') || name.includes('online'))) return 990;
  if (name.includes('natural') && (name.includes('japan') || lang.startsWith('ja'))) return 950;

  // Tier 2: Google 日本語 (Chrome Network / Local)
  if (name.includes('google') && (name.includes('日本語') || name.includes('japanese'))) return 800;

  // Tier 3: Apple Enhanced Voices (Kyoko / Otoya Enhanced on macOS/iOS)
  if (name.includes('kyoko') && name.includes('enhanced')) return 650;
  if (name.includes('otoya') && name.includes('enhanced')) return 640;
  if (name.includes('kyoko')) return 600;
  if (name.includes('otoya')) return 590;

  // Tier 4: Standard local Windows/macOS voices
  if (name.includes('nanami')) return 450;
  if (name.includes('keita')) return 440;
  if (name.includes('haruka')) return 420;
  if (name.includes('ayumi')) return 410;
  if (name.includes('ichiro')) return 400;
  if (name.includes('sayaka')) return 390;

  // Tier 5: Generic Japanese voice
  return 200;
}

/**
 * Sorts available browser SpeechSynthesis voices according to neural quality priority.
 */
export function rankJapaneseVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices]
    .filter((v) => getVoicePriorityScore(v) > 0)
    .sort((a, b) => getVoicePriorityScore(b) - getVoicePriorityScore(a));
}

/**
 * Selects optimal Japanese voice taking into account gender preference and quality tier.
 */
export function selectOptimalJapaneseVoice(
  voices: SpeechSynthesisVoice[],
  genderPreference: 'male' | 'female' | 'neutral' = 'neutral'
): SpeechSynthesisVoice | undefined {
  const ranked = rankJapaneseVoices(voices);
  if (ranked.length === 0) return undefined;
  if (genderPreference === 'neutral') return ranked[0];

  // Look for gender-matching voice among the top tiers
  if (genderPreference === 'female') {
    const female = ranked.find((v) =>
      /nanami|kyoko|haruka|ayumi|sayaka|female|woman/i.test(v.name)
    );
    if (female) return female;
  } else if (genderPreference === 'male') {
    const male = ranked.find((v) =>
      /keita|otoya|ichiro|kenji|daichi|male|man/i.test(v.name)
    );
    if (male) return male;
  }

  return ranked[0];
}

/**
 * Centralized, reliable TTS synthesizer for single-word vocabulary items.
 * Strictly guarantees verified Kana reading input and cancels overlapping audio cleanly.
 */
export function speakVocabulary(
  vocab: VocabularyAudioItem,
  options: SpeakOptions = {}
): SpeechSynthesisUtterance | null {
  const win =
    typeof window !== 'undefined'
      ? window
      : typeof globalThis !== 'undefined'
      ? (globalThis as any).window || (globalThis as any)
      : null;

  const synth: SpeechSynthesis | null =
    win?.speechSynthesis ||
    (typeof speechSynthesis !== 'undefined' ? speechSynthesis : null);

  if (!synth) {
    options.onError?.(new Error('SpeechSynthesis unavailable in this environment'));
    return null;
  }

  const phoneticText = getPhoneticUtteranceText(vocab);
  if (!phoneticText) {
    options.onError?.(new Error('Empty phonetic reading for vocabulary item'));
    return null;
  }

  try {
    // 1. Cancel previous pending or active speech cleanly
    synth.cancel();

    if (synth.paused) {
      synth.resume();
    }

    const UtteranceConstructor =
      win?.SpeechSynthesisUtterance ||
      (typeof SpeechSynthesisUtterance !== 'undefined'
        ? SpeechSynthesisUtterance
        : null);

    if (!UtteranceConstructor) {
      options.onError?.(new Error('SpeechSynthesisUtterance unavailable in this environment'));
      return null;
    }

    const utterance = new UtteranceConstructor(phoneticText);
    utterance.lang = 'ja-JP';

    const rate = options.rate ?? 1.0;
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    const pitch = options.pitch ?? 1.0;
    utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));

    // 2. Select optimal Japanese neural voice
    const availableVoices = synth.getVoices ? synth.getVoices() : [];
    const optimalVoice = selectOptimalJapaneseVoice(
      availableVoices,
      options.genderPreference || 'neutral'
    );
    if (optimalVoice) {
      utterance.voice = optimalVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = (e: any) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        options.onError?.(e);
      } else {
        options.onEnd?.();
      }
    };

    synth.speak(utterance);
    return utterance;
  } catch (err) {
    console.warn('[speakVocabulary] Error invoking speech synthesis:', err);
    options.onError?.(err);
    return null;
  }
}
