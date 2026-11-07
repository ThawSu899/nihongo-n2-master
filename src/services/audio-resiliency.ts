/**
 * Audio Resiliency & Japanese TTS Diagnostics Engine
 * Provides browser TTS voice detection, fallback visual phonetics calculation,
 * and speech health verification across mobile and desktop environments.
 */

import { decomposeIntoMoras } from '../domain/audio/pitch-accent';

export interface JapaneseVoiceDiagnostics {
  isWebSpeechAvailable: boolean;
  hasJaVoice: boolean;
  japaneseVoices: SpeechSynthesisVoice[];
  defaultVoiceName?: string;
  totalVoicesCount: number;
}

let cachedDiagnostics: JapaneseVoiceDiagnostics | null = null;
let diagnosticPromise: Promise<JapaneseVoiceDiagnostics> | null = null;

/**
 * Filter voices matching Japanese language tags or common Japanese voice names.
 */
export function filterJapaneseVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return (
      lang.startsWith('ja') ||
      lang.includes('jp') ||
      name.includes('japanese') ||
      name.includes('nihongo') ||
      name.includes('kyoko') ||
      name.includes('ayumi') ||
      name.includes('haruka') ||
      name.includes('sayaka') ||
      name.includes('otoya') ||
      name.includes('ichiro')
    );
  });
}

/**
 * Checks whether the browser has native Japanese TTS voice support.
 * Handles asynchronously loaded voices via onvoiceschanged with a safety fallback timeout.
 */
export function checkJapaneseVoiceSupport(
  forceRefresh = false
): Promise<JapaneseVoiceDiagnostics> {
  if (!forceRefresh && cachedDiagnostics) {
    return Promise.resolve(cachedDiagnostics);
  }

  if (diagnosticPromise && !forceRefresh) {
    return diagnosticPromise;
  }

  diagnosticPromise = new Promise<JapaneseVoiceDiagnostics>((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      const result: JapaneseVoiceDiagnostics = {
        isWebSpeechAvailable: false,
        hasJaVoice: false,
        japaneseVoices: [],
        totalVoicesCount: 0,
      };
      cachedDiagnostics = result;
      resolve(result);
      return;
    }

    const synth = window.speechSynthesis;
    const initialVoices = synth.getVoices ? synth.getVoices() : [];

    if (initialVoices && initialVoices.length > 0) {
      const jaVoices = filterJapaneseVoices(initialVoices);
      const result: JapaneseVoiceDiagnostics = {
        isWebSpeechAvailable: true,
        hasJaVoice: jaVoices.length > 0,
        japaneseVoices: jaVoices,
        defaultVoiceName: jaVoices[0]?.name,
        totalVoicesCount: initialVoices.length,
      };
      cachedDiagnostics = result;
      resolve(result);
      return;
    }

    // Voices not loaded yet; listen for onvoiceschanged with a safety timeout
    let resolved = false;

    const finalize = () => {
      if (resolved) return;
      resolved = true;
      const loadedVoices = synth.getVoices ? synth.getVoices() : [];
      const jaVoices = filterJapaneseVoices(loadedVoices);
      const result: JapaneseVoiceDiagnostics = {
        isWebSpeechAvailable: true,
        hasJaVoice: jaVoices.length > 0,
        japaneseVoices: jaVoices,
        defaultVoiceName: jaVoices[0]?.name,
        totalVoicesCount: loadedVoices.length,
      };
      cachedDiagnostics = result;
      resolve(result);
    };

    const timer = setTimeout(finalize, 350);

    const onVoicesChanged = () => {
      clearTimeout(timer);
      if (synth.onvoiceschanged === onVoicesChanged) {
        synth.onvoiceschanged = null;
      }
      finalize();
    };

    try {
      synth.onvoiceschanged = onVoicesChanged;
    } catch {
      // Fallback if assigning onvoiceschanged throws in strict sandboxes
    }
  });

  return diagnosticPromise;
}

/**
 * Synchronous accessor for cached Japanese TTS diagnostics.
 */
export function getJapaneseVoiceSupportSync(): JapaneseVoiceDiagnostics | null {
  return cachedDiagnostics;
}

/**
 * Tests audio output by triggering a short Japanese diagnostic utterance.
 */
export function testJapaneseVoiceSpeech(
  phrase = 'こんにちは！日本語の練習を始めましょう。'
): Promise<{ success: boolean; voiceName?: string; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve({
        success: false,
        error: 'Web Speech API is not supported in this environment.',
      });
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;

      const jaVoices = filterJapaneseVoices(window.speechSynthesis.getVoices());
      if (jaVoices.length > 0) {
        utterance.voice = jaVoices[0];
      }

      utterance.onend = () => {
        resolve({
          success: true,
          voiceName: utterance.voice?.name || 'Default Browser Voice',
        });
      };

      utterance.onerror = (e) => {
        resolve({
          success: false,
          error: e.error || 'Speech synthesis error encountered.',
        });
      };

      window.speechSynthesis.speak(utterance);
    } catch (err: any) {
      resolve({
        success: false,
        error: err.message || 'Exception during speech synthesis playback.',
      });
    }
  });
}

/**
 * Calculates estimated mora-by-mora duration for visual timing fallback
 * when native TTS is unavailable.
 */
export function getMoraTimingEstimate(
  text: string,
  playbackRate = 1.0
): {
  moraCount: number;
  durationMs: number;
  moras: string[];
} {
  const moras = decomposeIntoMoras(text);
  const count = Math.max(1, moras.length);
  // Average Japanese speech duration is ~160ms per mora
  const durationMs = Math.round((count * 160) / Math.max(0.5, playbackRate));

  return {
    moraCount: count,
    durationMs,
    moras,
  };
}

export const JAPANESE_TTS_MISSING_WARNING_MY =
  '⚠️ စက်တွင် ဂျပန်အသံထွက် (Japanese TTS) မပါဝင်သေးပါ။ အသံအတက်အကျ မျဉ်းကွေးများနှင့် Romaji ဖတ်နည်းကို အသုံးပြုနိုင်ပါသည်။';
