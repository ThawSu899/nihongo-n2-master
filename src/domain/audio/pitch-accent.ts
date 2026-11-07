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
 * Decomposes a Japanese string into authentic phonetic moras (拍).
 * Compound moras (拗音 e.g. きょ, しゃ, チュ) count as a single mora.
 * Geminates (っ, ッ), long vowels (ー), and syllabic nasals (ん, ン) count as separate individual moras.
 */
export function decomposeIntoMoras(text: string): string[] {
  if (!text) return [];
  // Strip punctuation, whitespace, and formatting symbols
  const cleaned = text.replace(/[\s\u3000\u3001\u3002,.!?"'()（）「」『』〜~・/\\-]/g, '');
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
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
      badgeBg: 'bg-cyan-900/50',
      stroke: '#06b6d4',
      fill: '#0891b2',
      accent: 'cyan',
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
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-900/50',
      stroke: '#10b981',
      fill: '#059669',
      accent: 'emerald',
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
  const moras = decomposeIntoMoras(text);
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

  // Single-mora words (e.g. 歯 [は], 木 [き], 目 [め])
  if (count === 1) {
    if (pattern === 'atamadaka' || pattern === 'odaka') {
      return {
        pattern,
        typeNumber: 1,
        nameJa: meta.nameJa,
        nameRomaji: meta.nameRomaji,
        meaningEn: meta.meaningEn,
        explanationMy: meta.explanationMy,
        theme: meta.theme,
        moras: [{ mora: moras[0], level: 'H', isDropNucleus: true, stepIndex: 0 }],
        particleLevel: 'L',
      };
    }
    return {
      pattern,
      typeNumber: 0,
      nameJa: meta.nameJa,
      nameRomaji: meta.nameRomaji,
      meaningEn: meta.meaningEn,
      explanationMy: meta.explanationMy,
      theme: meta.theme,
      moras: [{ mora: moras[0], level: 'L', isDropNucleus: false, stepIndex: 0 }],
      particleLevel: 'H',
    };
  }

  // Multi-mora pitch level distribution
  let dropIndex = -1; // 0-based index of the mora after which pitch drops
  let typeNumber = 0;
  let particleLevel: 'H' | 'L' = 'H';

  const pitchMoras: PitchMora[] = moras.map((mora, idx) => ({
    mora,
    level: 'L',
    isDropNucleus: false,
    stepIndex: idx,
  }));

  switch (pattern) {
    case 'atamadaka':
      // Type 1: Mora 0 is H, all subsequent moras are L.
      typeNumber = 1;
      dropIndex = 0;
      particleLevel = 'L';
      pitchMoras[0].level = 'H';
      pitchMoras[0].isDropNucleus = true;
      for (let i = 1; i < count; i++) {
        pitchMoras[i].level = 'L';
      }
      break;

    case 'heiban':
      // Type 0: Mora 0 is L, all subsequent moras are H. Particle is H.
      typeNumber = 0;
      dropIndex = -1;
      particleLevel = 'H';
      pitchMoras[0].level = 'L';
      for (let i = 1; i < count; i++) {
        pitchMoras[i].level = 'H';
      }
      break;

    case 'nakadaka': {
      // Type 2..count-1: Mora 0 is L, moras 1..dropIndex are H, subsequent moras are L.
      const targetDrop = explicitDropMora
        ? Math.max(1, Math.min(count - 1, explicitDropMora - 1))
        : Math.max(1, Math.min(count - 2, Math.floor(count / 2)));

      typeNumber = targetDrop + 1;
      dropIndex = targetDrop;
      particleLevel = 'L';

      pitchMoras[0].level = 'L';
      for (let i = 1; i <= dropIndex; i++) {
        pitchMoras[i].level = 'H';
      }
      pitchMoras[dropIndex].isDropNucleus = true;
      for (let i = dropIndex + 1; i < count; i++) {
        pitchMoras[i].level = 'L';
      }
      break;
    }

    case 'odaka':
      // Type count: Mora 0 is L, moras 1..count-1 are H. Particle drops to L.
      typeNumber = count;
      dropIndex = count - 1;
      particleLevel = 'L';
      pitchMoras[0].level = 'L';
      for (let i = 1; i < count; i++) {
        pitchMoras[i].level = 'H';
      }
      pitchMoras[count - 1].isDropNucleus = true;
      break;
  }

  return {
    pattern,
    typeNumber,
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
