/**
 * Pitch Accent Domain Models & Mora Decomposition Utilities
 * Aligned with NHK Japanese Pitch Accent Dictionary (NHK日本語発音アクセント新辞典)
 * and authentic Tokyo standard dialect (共通語) accent patterns:
 * 1. 平板 (Heiban - Type 0): Low start, rises on 2nd mora, stays high into particles.
 * 2. 頭高 (Atamadaka - Type 1): High start on 1st mora, drops immediately on 2nd mora.
 * 3. 中高 (Nakadaka - Type 2..N-1): Low start, rises, drops before end of word.
 * 4. 尾高 (Odaka - Type N): Low start, stays high till end of word, drops on attached particle.
 */

export type PitchPattern = 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka';

export interface PitchMora {
  mora: string; // The phonetic mora unit (e.g., "しゅ", "ん", "た", "っ", "ー")
  level: 'H' | 'L'; // High or Low pitch
  isDropNucleus: boolean; // True if this mora is the accent nucleus (下がり目)
  stepIndex: number; // 0-based mora index
}

export interface PitchContourNode {
  char: string;
  isHigh: boolean;
  isDrop: boolean;
}

export interface PitchAccentTheme {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  stroke: string;
  fill: string;
  accent: string;
}

export interface PitchAccentDetails {
  pattern: PitchPattern;
  typeNumber: number; // 0 for heiban, 1 for atamadaka, 2..N-1 for nakadaka, N for odaka
  nameJa: string; // 平板 | 頭高 | 中高 | 尾高
  nameRomaji: string; // Heiban | Atamadaka | Nakadaka | Odaka
  meaningEn: string;
  explanationMy: string;
  theme: PitchAccentTheme;
  moras: PitchMora[];
  particleLevel: 'H' | 'L'; // Pitch of the attached particle (e.g. が, を, に)
}

const SMALL_KANA_SET = new Set([
  'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ',
  'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ',
]);

/**
 * Deconstructs reading into true linguistic moras (拍).
 * Groups palatalized/contracted digraphs (拗音 e.g. きゃ, しゅ, ちょ, チュ) into single moras.
 * Sokuon (っ, ッ), long vowels (ー), and syllabic nasals (ん, ン) count as separate independent moras.
 */
export function segmentMoras(reading: string): string[] {
  if (!reading) return [];
  // Strip punctuation, fullwidth spaces, brackets, tilde, and whitespace
  const cleaned = reading.replace(/[\s\u3000\u3001\u3002,.!?"'()（）「」『』〜~・/\\-]/g, '');
  const moras: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (nextChar && SMALL_KANA_SET.has(nextChar)) {
      moras.push(char + nextChar);
      i++; // Skip the small kana
    } else {
      moras.push(char);
    }
  }

  return moras;
}

/**
 * Backward-compatible alias for segmentMoras.
 */
export function decomposeIntoMoras(text: string): string[] {
  return segmentMoras(text);
}

/**
 * Classifies pitch pattern strictly based on dropIndex and total mora count.
 */
export function classifyPitchPattern(dropIndex: number, moraCount: number): PitchPattern {
  if (dropIndex === 0) return 'heiban';
  if (dropIndex === 1) return 'atamadaka';
  if (moraCount > 0 && dropIndex === moraCount) return 'odaka';
  return 'nakadaka';
}

/**
 * Computes high/low contour and drop nucleus across linguistic moras.
 * - Rule 1 (Heiban, drop = 0): Mora 1 = Low, Mora 2..N = High. Particle = High.
 * - Rule 2 (Atamadaka, drop = 1): Mora 1 = High (Drop = true), Mora 2..N = Low. Particle = Low.
 * - Rule 3 (Nakadaka, 1 < drop < N): Mora 1 = Low, Mora 2..Drop = High (Drop = true at dropIndex), Mora (Drop+1)..N = Low.
 * - Rule 4 (Odaka, drop = N): Mora 1 = Low, Mora 2..N = High (Drop = true on final mora). Particle = Low.
 */
export function computePitchContour(
  moras: string[],
  dropIndex: number
): PitchContourNode[] {
  const count = moras.length;
  if (count === 0) return [];

  // Clamp dropIndex to valid range [0, count]
  const validDrop = Math.max(0, Math.min(count, Math.floor(dropIndex)));

  // Monomoraic edge cases (1 mora e.g. 歯, 木, 目)
  if (count === 1) {
    if (validDrop === 1) {
      return [{ char: moras[0], isHigh: true, isDrop: true }];
    }
    return [{ char: moras[0], isHigh: false, isDrop: false }];
  }

  // Rule 1: Heiban (Type 0)
  if (validDrop === 0) {
    return moras.map((char, idx) => ({
      char,
      isHigh: idx > 0,
      isDrop: false,
    }));
  }

  // Rule 2: Atamadaka (Type 1)
  if (validDrop === 1) {
    return moras.map((char, idx) => ({
      char,
      isHigh: idx === 0,
      isDrop: idx === 0,
    }));
  }

  // Rule 4: Odaka (Type N)
  if (validDrop === count) {
    return moras.map((char, idx) => ({
      char,
      isHigh: idx > 0,
      isDrop: idx === count - 1,
    }));
  }

  // Rule 3: Nakadaka (1 < drop < N)
  return moras.map((char, idx) => {
    const isHigh = idx > 0 && idx < validDrop;
    const isDrop = idx === validDrop - 1;
    return {
      char,
      isHigh,
      isDrop,
    };
  });
}

export const PITCH_METADATA: Record<
  PitchPattern,
  {
    nameJa: string;
    nameRomaji: string;
    meaningEn: string;
    explanationMy: string;
    theme: PitchAccentTheme;
  }
> = {
  heiban: {
    nameJa: '平板',
    nameRomaji: 'Heiban',
    meaningEn: 'Flat / Unaccented (Low start, stays High)',
    explanationMy: 'အစနိမ့် အဆုံးမြင့် (ပထမအသံနိမ့်၊ ဒုတိယအသံမှစ၍ ဝိဘတ်အထိ အသံမြင့်နေမည်)',
    theme: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-900/50',
      stroke: '#10b981',
      fill: '#059669',
      accent: 'emerald',
    },
  },
  atamadaka: {
    nameJa: '頭高',
    nameRomaji: 'Atamadaka',
    meaningEn: 'Head-High (High start, drops immediately)',
    explanationMy: 'အစမြင့် ချက်ချင်းဆင်း (ပထမအသံမြင့်ပြီး ဒုတိယအသံမှစ၍ ချက်ချင်းအသံကျမည်)',
    theme: {
      bg: 'bg-rose-950/60',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
      badgeBg: 'bg-rose-900/50',
      stroke: '#f43f5e',
      fill: '#e11d48',
      accent: 'rose',
    },
  },
  nakadaka: {
    nameJa: '中高',
    nameRomaji: 'Nakadaka',
    meaningEn: 'Middle-High (Rises in middle, drops before end)',
    explanationMy: 'အလယ်မြင့် ပြန်ဆင်း (ပထမအသံနိမ့်၊ အလယ်တွင် မြင့်တက်ပြီး စကားလုံးမဆုံးမီ ပြန်ကျမည်)',
    theme: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-900/50',
      stroke: '#f59e0b',
      fill: '#d97706',
      accent: 'amber',
    },
  },
  odaka: {
    nameJa: '尾高',
    nameRomaji: 'Odaka',
    meaningEn: 'Tail-High (High at end, drops on particle)',
    explanationMy: 'အဆုံးမြင့် ဝိဘတ်ဆင်း (စကားလုံးအဆုံးအထိ မြင့်တက်ပြီး နောက်ဆက်ဝိဘတ်တွင် အသံကျမည်)',
    theme: {
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
      badgeBg: 'bg-cyan-900/50',
      stroke: '#06b6d4',
      fill: '#0891b2',
      accent: 'cyan',
    },
  },
};

/**
 * Calculates mora-level pitch levels (H/L) and identifies the accent drop nucleus.
 */
export function calculatePitchContour(
  text: string,
  pattern: PitchPattern,
  explicitDropMora?: number
): PitchAccentDetails {
  const moras = segmentMoras(text);
  const meta = PITCH_METADATA[pattern];
  const count = moras.length;

  // Fallback for empty text
  if (count === 0) {
    return {
      pattern,
      typeNumber: pattern === 'heiban' ? 0 : pattern === 'atamadaka' ? 1 : 2,
      nameJa: meta.nameJa,
      nameRomaji: meta.nameRomaji,
      meaningEn: meta.meaningEn,
      explanationMy: meta.explanationMy,
      theme: meta.theme,
      moras: [],
      particleLevel: pattern === 'heiban' ? 'H' : 'L',
    };
  }

  // Determine dropIndex
  let dropIndex = 0;
  if (pattern === 'heiban') {
    dropIndex = 0;
  } else if (pattern === 'atamadaka') {
    dropIndex = 1;
  } else if (pattern === 'odaka') {
    dropIndex = count;
  } else {
    // nakadaka
    dropIndex = explicitDropMora
      ? Math.max(2, Math.min(count - 1, explicitDropMora))
      : Math.max(2, Math.min(count - 1, Math.floor(count / 2) + 1));
  }

  const nodes = computePitchContour(moras, dropIndex);
  const pitchMoras: PitchMora[] = nodes.map((node, idx) => ({
    mora: node.char,
    level: node.isHigh ? 'H' : 'L',
    isDropNucleus: node.isDrop,
    stepIndex: idx,
  }));

  const particleLevel: 'H' | 'L' = pattern === 'heiban' ? 'H' : 'L';

  return {
    pattern,
    typeNumber: dropIndex,
    nameJa: meta.nameJa,
    nameRomaji: meta.nameRomaji,
    meaningEn: meta.meaningEn,
    explanationMy: meta.explanationMy,
    theme: meta.theme,
    moras: pitchMoras,
    particleLevel,
  };
}

/**
 * Calculates pitch accent details directly from a reading and dropIndex.
 */
export function calculatePitchAccentFromDrop(
  reading: string,
  dropIndex: number
): PitchAccentDetails {
  const moras = segmentMoras(reading);
  const pattern = classifyPitchPattern(dropIndex, moras.length);
  return calculatePitchContour(reading, pattern, dropIndex);
}

/**
 * Heuristically infers natural pitch accent pattern for phrases lacking explicit database annotations.
 */
export function inferPitchAccent(text: string): PitchPattern {
  if (!text) return 'heiban';
  const trimmed = text.trim();

  // Greetings & interjections that are typically Atamadaka (Type 1)
  if (
    trimmed.startsWith('はい') ||
    trimmed.startsWith('いいえ') ||
    trimmed.startsWith('どうも') ||
    trimmed.startsWith('ちょっと') ||
    trimmed.startsWith('だめ') ||
    trimmed.startsWith('さあ')
  ) {
    return 'atamadaka';
  }

  // Sentences with questions / requests ending with high nuance
  if (
    trimmed.endsWith('ですか') ||
    trimmed.endsWith('ですか。') ||
    trimmed.endsWith('ますか') ||
    trimmed.endsWith('ますか。') ||
    trimmed.endsWith('ね') ||
    trimmed.endsWith('ね。')
  ) {
    return 'heiban';
  }

  // Desu / Masu polite endings with medial drop
  if (
    trimmed.includes('でした') ||
    trimmed.includes('ました') ||
    trimmed.includes('ません') ||
    trimmed.includes('ください')
  ) {
    return 'nakadaka';
  }

  // Words ending with noun + particle patterns
  if (trimmed.endsWith('です') || trimmed.endsWith('です。')) {
    return 'nakadaka';
  }

  return 'heiban';
}
