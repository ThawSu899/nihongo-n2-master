/**
 * Centralized Phonetic Text-to-Speech (TTS) Engine for Japanese Vocabulary
 * Enforces reading accuracy, Neural voice ranking, clean phonetic input,
 * and frozen SpeechSynthesis queue recovery for Chrome/Edge/Safari.
 */

export const AUDIO_SPEED_STORAGE_KEY = 'nihongo_audio_speed';
export const BLIND_LISTENING_STORAGE_KEY = 'nihongo_blind_listening_mode';

export interface TtsSpeedPreset {
  rate: number;
  label: string;
  labelBurmese: string;
}

export const TTS_SPEED_PRESETS: readonly TtsSpeedPreset[] = [
  { rate: 0.75, label: '0.75x', labelBurmese: '0.75x နှေး' },
  { rate: 1.0, label: '1.0x', labelBurmese: '1.0x ပုံမှန်' },
  { rate: 1.2, label: '1.2x', labelBurmese: '1.2x မြန်' },
] as const;

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
 * Extracts pure, speakable Japanese text from any mixed-language string,
 * prompt, sentence, or vocabulary item:
 * 1. Priority-extracts content inside Japanese quotation marks 「...」 or 『...』.
 * 2. Strips ruby/furigana square brackets (e.g. 漢字[かんじ] -> 漢字) and
 *    parenthetical readings (e.g. 漢字(かんじ) or 漢字（かんじ） -> 漢字).
 * 3. Extracts contiguous Japanese characters:
 *    Hiragana (\u3040-\u309F), Katakana (\u30A0-\u30FF),
 *    Kanji (\u4E00-\u9FAF), prolonged mark (ー), iteration mark (々), and
 *    Japanese punctuation (\u3000-\u303F).
 * 4. Strips foreign scripts (Burmese, Latin) so TTS never attempts
 *    to read foreign scripts with Japanese phonemes.
 */
export function extractPureJapaneseText(raw: string): string {
  if (!raw) return '';
  let text = String(raw).trim();

  // 1. Priority-extract inside Japanese quotes 「...」 or 『...』 if they contain Japanese
  const quoteMatches = Array.from(text.matchAll(/[「『]([^」』]+)[」』]/g));
  if (quoteMatches.length > 0) {
    const jaQuotes = quoteMatches
      .map((m) => m[1])
      .filter((inner) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFー々]/.test(inner));
    if (jaQuotes.length > 0) {
      text = jaQuotes.join(' ');
    }
  }

  // 2. Strip ruby/furigana brackets:
  // (a) Square brackets: 漢字[かんじ] -> 漢字
  text = text.replace(/\[[^\]]*\]/g, '');
  // (b) Parenthetical furigana following kanji: 漢字(かんじ) -> 漢字
  text = text.replace(/([\u4E00-\u9FAF])\s*[\(（][\u3040-\u309F\u30A0-\u30FFー々]+[\)）]/g, '$1');
  // (c) Any remaining parenthetical annotations: (な), (する), etc.
  text = text.replace(/\([^)）]*\)/g, '');
  text = text.replace(/（[^)）]*）/g, '');
  text = text.replace(/[【】]/g, '');

  // 3. Extract contiguous Japanese substrings
  const japaneseSegments = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303Fー々]+/g);
  if (japaneseSegments && japaneseSegments.length > 0) {
    return japaneseSegments.join(' ').replace(/\s+/g, ' ').trim();
  }

  return '';
}

/**
 * Extracts speakable Japanese from any assessment question, quiz prompt,
 * choices, answer, or explanation across Stages 6–15.
 */
export function extractSpeakableJapaneseFromQuestion(q?: any): string {
  if (!q) return '';

  // 1. Try prompt first
  const promptJa = extractPureJapaneseText(q.prompt || q.promptMy || q.questionMy || '');
  if (promptJa) return promptJa;

  // 2. Try choices (find first choice with Japanese)
  if (Array.isArray(q.choices) && q.choices.length > 0) {
    for (const choice of q.choices) {
      const choiceJa = extractPureJapaneseText(choice);
      if (choiceJa) return choiceJa;
    }
  }

  // 3. Try answer
  if (q.answer) {
    const answerJa = extractPureJapaneseText(q.answer);
    if (answerJa) return answerJa;
  }

  // 4. Try acceptedAnswers
  if (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0) {
    for (const ans of q.acceptedAnswers) {
      const ansJa = extractPureJapaneseText(ans);
      if (ansJa) return ansJa;
    }
  }

  // 5. Try explanation
  if (q.explanation || q.explanationMy) {
    const expJa = extractPureJapaneseText(q.explanation || q.explanationMy || '');
    if (expJa) return expJa;
  }

  return '';
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
  const lang = (voice.lang || '').toLowerCase().replace(/_/g, '-');

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
 * Speaks Japanese text directly via Web Speech API with Chrome/Edge unfreezing,
 * automatic voice fallback, and strict ja-JP phonetic synthesis.
 */
export function speakDirectJapanese(
  text: string,
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

  const cleanJa = extractPureJapaneseText(text) || sanitizePhoneticText(text);
  if (!cleanJa.trim()) {
    options.onError?.(new Error('No speakable Japanese text found in input'));
    return null;
  }

  try {
    // 1. Unfreeze Chrome / Edge frozen speech queue bug
    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }
    try {
      synth.resume();
    } catch {
      // ignore
    }

    const UtteranceConstructor =
      win?.SpeechSynthesisUtterance ||
      (typeof SpeechSynthesisUtterance !== 'undefined'
        ? SpeechSynthesisUtterance
        : null);

    if (!UtteranceConstructor) {
      options.onError?.(new Error('SpeechSynthesisUtterance unavailable'));
      return null;
    }

    const utterance = new UtteranceConstructor(cleanJa);
    utterance.lang = 'ja-JP';

    const rate = options.rate ?? 1.0;
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    const pitch = options.pitch ?? 1.0;
    utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));

    // 2. Select best ja-JP voice with async fallback
    let availableVoices = synth.getVoices ? synth.getVoices() : [];
    let optimalVoice = selectOptimalJapaneseVoice(
      availableVoices,
      options.genderPreference || 'neutral'
    );

    if (optimalVoice) {
      utterance.voice = optimalVoice;
    } else if (typeof synth.addEventListener === 'function') {
      const onVoicesChanged = () => {
        const updatedVoices = synth.getVoices();
        const asyncVoice = selectOptimalJapaneseVoice(
          updatedVoices,
          options.genderPreference || 'neutral'
        );
        if (asyncVoice) {
          utterance.voice = asyncVoice;
        }
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
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
    console.warn('[speakDirectJapanese] Error speaking:', err);
    options.onError?.(err);
    return null;
  }
}

/**
 * Centralized, reliable TTS synthesizer for single-word vocabulary items.
 * Strictly guarantees verified Kana reading input and cancels overlapping audio cleanly.
 */
export function speakVocabulary(
  vocab: VocabularyAudioItem,
  options: SpeakOptions = {}
): SpeechSynthesisUtterance | null {
  const phoneticText = getPhoneticUtteranceText(vocab);
  return speakDirectJapanese(phoneticText, options);
}

export interface Shadowing3xController {
  cancel: () => void;
  isCancelled: () => boolean;
}

/**
 * Speaks Japanese text 3 times with a 1200ms pause between repetitions.
 * Allows clean cancellation at any time.
 */
export function play3xLoopTts(
  text: string,
  options: SpeakOptions = {},
  onIteration?: (iteration: number) => void
): Shadowing3xController {
  let cancelled = false;
  let timerId: any = null;

  const controller: Shadowing3xController = {
    cancel: () => {
      cancelled = true;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      const win =
        typeof window !== 'undefined'
          ? window
          : typeof globalThis !== 'undefined'
          ? (globalThis as any).window || (globalThis as any)
          : null;
      if (win?.speechSynthesis) {
        win.speechSynthesis.cancel();
      }
    },
    isCancelled: () => cancelled,
  };

  const playTurn = (iter: number) => {
    if (cancelled) return;
    onIteration?.(iter);

    speakDirectJapanese(text, {
      ...options,
      onEnd: () => {
        if (cancelled) return;
        if (iter < 3) {
          timerId = setTimeout(() => {
            if (cancelled) return;
            playTurn(iter + 1);
          }, 1200);
        } else {
          options.onEnd?.();
        }
      },
      onError: (err) => {
        if (cancelled) return;
        options.onError?.(err);
      },
    });
  };

  playTurn(1);
  return controller;
}

/**
 * Speaks a Japanese vocabulary item or sentence 3 times with a 1.5-second pause between repetitions
 * for intensive vocal shadowing practice.
 */
export function play3xShadowingTts(
  vocab: VocabularyAudioItem | string,
  options: SpeakOptions = {},
  onIteration?: (iteration: number) => void
): Shadowing3xController {
  const text = typeof vocab === 'string' ? vocab : getPhoneticUtteranceText(vocab);
  return play3xLoopTts(text, options, onIteration);
}
