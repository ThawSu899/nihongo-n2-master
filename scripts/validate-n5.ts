import * as fs from 'fs';
import * as path from 'path';

export interface ValidationIssue {
  checkId: number;
  checkName: string;
  lessonId: string;
  itemId?: string;
  field: string;
  currentValue?: any;
  message: string;
  severity: 'error' | 'warning' | 'manual_check';
}

export interface LessonSummary {
  lessonId: string;
  totalIssues: number;
  byCheck: Record<number, number>;
}

export interface ValidationReport {
  timestamp: string;
  totalIssues: number;
  byCheck: Record<number, { name: string; count: number }>;
  byLesson: Record<string, LessonSummary>;
  issues: ValidationIssue[];
}

// -----------------------------------------------------------------------------
// Check 1: Kana charset validation
// -----------------------------------------------------------------------------
// Allowed: Hiragana (\u3040-\u309F), Katakana (\u30A0-\u30FF), Chōonpu (ー \u30FC),
// Nakaguro (・ \u30FB), common punctuation & spaces
const KANA_ALLOWED_REGEX = /^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s\t\n、。！？…～〜（）「」『』【】・,!?.\(\)\"'\-~]+$/;

export function containsInvalidKana(text: string): { invalid: boolean; invalidChars: string[] } {
  if (!text) return { invalid: false, invalidChars: [] };
  if (KANA_ALLOWED_REGEX.test(text)) {
    return { invalid: false, invalidChars: [] };
  }
  // Find offending characters (Kanji, Latin letters, digits, foreign symbols)
  const invalidChars = Array.from(
    new Set(
      text
        .split('')
        .filter((c) => !KANA_ALLOWED_REGEX.test(c))
    )
  );
  return { invalid: true, invalidChars };
}

// -----------------------------------------------------------------------------
// Check 2: Speaker prefix in kana
// -----------------------------------------------------------------------------
const SPEAKER_PREFIX_REGEX = /^[^：:\n\r\s]{1,10}[：:]/;

export function hasSpeakerPrefix(kana: string): boolean {
  return SPEAKER_PREFIX_REGEX.test(kana.trim());
}

// -----------------------------------------------------------------------------
// Check 3: Kana vs Ja Mismatch
// -----------------------------------------------------------------------------
export function checkKanaJaMismatch(ja: string, kana: string): string | null {
  if (!ja || !kana) return null;

  // 1. Pure Kana check: if ja is already entirely Kana, kana MUST match ja exactly
  const isJaPureKana = /^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s、。！？…～〜（）「」]+$/.test(ja.trim());
  if (isJaPureKana) {
    const normJa = ja.replace(/[\s、。！？]/g, '');
    const normKana = kana.replace(/[\s、。！？]/g, '');
    if (normJa !== normKana) {
      return `Pure-kana ja text "${ja}" does not match kana "${kana}"`;
    }
  }

  // 2. Check for known stray artifacts (foreign tokens, stray Chinese/Kanji in kana)
  const strayMatches = kana.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uAC00-\uD7AF]/g);
  if (strayMatches) {
    return `Stray non-kana character(s) in kana: [${Array.from(new Set(strayMatches)).join(', ')}]`;
  }

  // 3. Known specific mismatch patterns (particles, numbers)
  if (ja.includes('七時') && !kana.includes('しちじ') && !kana.includes('ななじ')) {
    return `Number reading discrepancy: ja has "七時" but kana is "${kana}"`;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Check 4: Pitch accent mora counting & pattern consistency
// -----------------------------------------------------------------------------
export function countMoras(kana: string): number {
  const cleaned = kana.replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '');
  // Small combination kana (digraphs) do not add an extra mora
  const smallKanaRegex = /[ぁぃぅぇぉゃゅょゎァィゥェぉャュョヮ]/g;
  const smallCount = (cleaned.match(smallKanaRegex) || []).length;
  return Math.max(1, cleaned.length - smallCount);
}

export function validatePitch(
  kana: string,
  dropIndex: number,
  pitchPattern: string
): { valid: boolean; moraCount: number; expectedPattern: string; reason?: string } {
  const moras = countMoras(kana);
  let expectedPattern = 'heiban';
  if (dropIndex === 0) {
    expectedPattern = 'heiban';
  } else if (dropIndex === 1) {
    expectedPattern = 'atamadaka';
  } else if (dropIndex === moras) {
    expectedPattern = 'odaka';
  } else if (dropIndex > 1 && dropIndex < moras) {
    expectedPattern = 'nakadaka';
  }

  if (dropIndex > moras) {
    return {
      valid: false,
      moraCount: moras,
      expectedPattern,
      reason: `dropIndex (${dropIndex}) exceeds mora count (${moras})`,
    };
  }

  if (pitchPattern !== expectedPattern) {
    return {
      valid: false,
      moraCount: moras,
      expectedPattern,
      reason: `pitchPattern "${pitchPattern}" inconsistent with dropIndex ${dropIndex} (expected "${expectedPattern}" for ${moras} moras)`,
    };
  }

  return { valid: true, moraCount: moras, expectedPattern };
}

// -----------------------------------------------------------------------------
// Check 7: Burmese script verification
// -----------------------------------------------------------------------------
const MYANMAR_CHAR_REGEX = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;
const PURE_NUMBER_REGEX = /^[\d\s.,:\-\/]+$/;
const PROPER_NOUN_LIST = new Set([
  'Ken', 'Anna', 'Miller', 'Kobayashi', 'Emily', 'Smith', 'Tanaka', 'Yamada',
  'Tokyo', 'Kyoto', 'Osaka', 'Japan', 'A', 'B', 'C', 'D'
]);

export function isBurmeseExempt(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (PURE_NUMBER_REGEX.test(trimmed)) return true;
  if (PROPER_NOUN_LIST.has(trimmed)) return true;
  return false;
}

export function validateBurmeseString(myText: any, enText?: any): { valid: boolean; reason?: string } {
  if (myText === undefined || myText === null || myText === '') {
    return { valid: false, reason: 'Field is empty or undefined' };
  }
  if (typeof myText !== 'string') {
    return { valid: false, reason: `Value is not a string (type: ${typeof myText})` };
  }
  const trimmed = myText.trim();
  if (isBurmeseExempt(trimmed)) {
    return { valid: true };
  }
  if (!MYANMAR_CHAR_REGEX.test(trimmed)) {
    return { valid: false, reason: 'No Myanmar-script Unicode characters (U+1000-U+109F)' };
  }
  if (enText && typeof enText === 'string' && trimmed === enText.trim()) {
    return { valid: false, reason: 'Burmese field is identical to the English field' };
  }
  return { valid: true };
}

// -----------------------------------------------------------------------------
// Check 8: Zawgyi heuristic
// -----------------------------------------------------------------------------
export function isZawgyi(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // Pattern 1: Pre-base vowel U+1031 at word start or after whitespace/punctuation
  if (/(?:^|[\s\p{P}\u0020-\u002F\u003A-\u0040])\u1031/u.test(text)) {
    return true;
  }
  // Pattern 2: Zawgyi-only dedicated code points
  if (/[\u1060-\u1064\u106A-\u106D\u1071-\u1074\u1086\u108E-\u1092]/.test(text)) {
    return true;
  }
  // Pattern 3: Incorrect medial ordering (wa-hswae before ya-yit)
  if (/\u103D\u103C/.test(text)) {
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Main Validator Runner
// -----------------------------------------------------------------------------
export function validateAllN5Packs(packsDir = path.join(process.cwd(), 'content', 'packs', 'n5')): ValidationReport {
  const issues: ValidationIssue[] = [];
  const checkNames: Record<number, string> = {
    1: 'Kana charset validation (non-kana / foreign glyphs)',
    2: 'Speaker prefix in kana field',
    3: 'Kana vs Ja mismatch / manual check',
    4: 'Pitch dropIndex / pattern inconsistency',
    5: 'Questions structure & referential integrity',
    6: 'Sentence IDs formatting & sequence gaps',
    7: 'Burmese fields missing / English duplicate',
    8: 'Zawgyi encoding heuristic (report only)',
  };

  const byCheck: Record<number, { name: string; count: number }> = {
    1: { name: checkNames[1], count: 0 },
    2: { name: checkNames[2], count: 0 },
    3: { name: checkNames[3], count: 0 },
    4: { name: checkNames[4], count: 0 },
    5: { name: checkNames[5], count: 0 },
    6: { name: checkNames[6], count: 0 },
    7: { name: checkNames[7], count: 0 },
    8: { name: checkNames[8], count: 0 },
  };

  const byLesson: Record<string, LessonSummary> = {};

  const recordIssue = (issue: ValidationIssue) => {
    issues.push(issue);
    byCheck[issue.checkId].count++;
    if (!byLesson[issue.lessonId]) {
      byLesson[issue.lessonId] = {
        lessonId: issue.lessonId,
        totalIssues: 0,
        byCheck: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      };
    }
    byLesson[issue.lessonId].totalIssues++;
    byLesson[issue.lessonId].byCheck[issue.checkId]++;
  };

  for (let i = 1; i <= 30; i++) {
    const lessonNum = String(i).padStart(2, '0');
    const lessonId = `n5.l${lessonNum}`;
    const filePath = path.join(packsDir, `${lessonId}.json`);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Collect all valid item IDs in pack for referential integrity checks
    const allValidItemIds = new Set<string>();
    allValidItemIds.add(pack.id);
    pack.vocabularies?.forEach((v: any) => allValidItemIds.add(v.id));
    pack.kanjis?.forEach((k: any) => allValidItemIds.add(k.id));
    pack.grammars?.forEach((g: any) => allValidItemIds.add(g.id));
    pack.sentences?.forEach((s: any) => allValidItemIds.add(s.id));
    if (pack.reading?.id) allValidItemIds.add(pack.reading.id);
    if (pack.listening?.id) allValidItemIds.add(pack.listening.id);
    pack.questions?.forEach((q: any) => allValidItemIds.add(q.id));

    // -------------------------------------------------------------------------
    // 1. Sentences
    // -------------------------------------------------------------------------
    const seenSentenceIds = new Set<string>();
    const expectedSentencePattern = new RegExp(`^${lessonId.replace('.', '\\.')}\\.s\\d{3}$`);

    (pack.sentences || []).forEach((s: any, idx: number) => {
      // Check 6: Sentence IDs format & duplicates & gaps
      if (!expectedSentencePattern.test(s.id)) {
        recordIssue({
          checkId: 6,
          checkName: checkNames[6],
          lessonId,
          itemId: s.id,
          field: 'sentences[].id',
          currentValue: s.id,
          message: `Sentence ID "${s.id}" does not match pattern /^${lessonId}\\.s\\d{3}$/`,
          severity: 'error',
        });
      }
      if (seenSentenceIds.has(s.id)) {
        recordIssue({
          checkId: 6,
          checkName: checkNames[6],
          lessonId,
          itemId: s.id,
          field: 'sentences[].id',
          currentValue: s.id,
          message: `Duplicate sentence ID detected: "${s.id}"`,
          severity: 'error',
        });
      }
      seenSentenceIds.add(s.id);

      const expectedId = `${lessonId}.s${String(idx + 1).padStart(3, '0')}`;
      if (s.id !== expectedId) {
        recordIssue({
          checkId: 6,
          checkName: checkNames[6],
          lessonId,
          itemId: s.id,
          field: 'sentences[].id',
          currentValue: s.id,
          message: `Sentence sequence gap/mismatch: index ${idx + 1} has id "${s.id}", expected "${expectedId}"`,
          severity: 'error',
        });
      }

      // Check 1: Kana charset in sentence.kana
      const kanaRes = containsInvalidKana(s.kana);
      if (kanaRes.invalid) {
        recordIssue({
          checkId: 1,
          checkName: checkNames[1],
          lessonId,
          itemId: s.id,
          field: 'sentences[].kana',
          currentValue: s.kana,
          message: `Sentence kana contains non-kana character(s): [${kanaRes.invalidChars.join(', ')}]`,
          severity: 'error',
        });
      }

      // Check 2: Speaker prefix in sentence.kana
      if (hasSpeakerPrefix(s.kana)) {
        recordIssue({
          checkId: 2,
          checkName: checkNames[2],
          lessonId,
          itemId: s.id,
          field: 'sentences[].kana',
          currentValue: s.kana,
          message: `Sentence kana starts with speaker prefix: "${s.kana.slice(0, 15)}"`,
          severity: 'error',
        });
      }

      // Check 3: Kana vs Ja mismatch
      const mismatch = checkKanaJaMismatch(s.ja, s.kana);
      if (mismatch) {
        recordIssue({
          checkId: 3,
          checkName: checkNames[3],
          lessonId,
          itemId: s.id,
          field: 'sentences[].kana',
          currentValue: s.kana,
          message: mismatch,
          severity: 'manual_check',
        });
      }

      // Check 7 & 8: Burmese fields in sentence
      const burmeseCandidate = s.translationMy || s.meaningMy || s.translation?.my || s.my;
      const bRes = validateBurmeseString(burmeseCandidate, s.translation?.en || s.en);
      if (!bRes.valid) {
        recordIssue({
          checkId: 7,
          checkName: checkNames[7],
          lessonId,
          itemId: s.id,
          field: 'sentences[].translationMy',
          currentValue: burmeseCandidate,
          message: `Sentence Burmese translation issue: ${bRes.reason}`,
          severity: 'error',
        });
      }
      if (burmeseCandidate && isZawgyi(burmeseCandidate)) {
        recordIssue({
          checkId: 8,
          checkName: checkNames[8],
          lessonId,
          itemId: s.id,
          field: 'sentences[].translationMy',
          currentValue: burmeseCandidate,
          message: 'Zawgyi encoding detected in sentence Burmese text',
          severity: 'warning',
        });
      }
    });

    // -------------------------------------------------------------------------
    // 2. Vocabularies
    // -------------------------------------------------------------------------
    (pack.vocabularies || []).forEach((v: any) => {
      // Check 1: Kana charset
      const kanaRes = containsInvalidKana(v.kana);
      if (kanaRes.invalid) {
        recordIssue({
          checkId: 1,
          checkName: checkNames[1],
          lessonId,
          itemId: v.id,
          field: 'vocabularies[].kana',
          currentValue: v.kana,
          message: `Vocab kana contains non-kana character(s): [${kanaRes.invalidChars.join(', ')}]`,
          severity: 'error',
        });
      }

      // Check 3: Kana vs Ja
      const mismatch = checkKanaJaMismatch(v.ja, v.kana);
      if (mismatch) {
        recordIssue({
          checkId: 3,
          checkName: checkNames[3],
          lessonId,
          itemId: v.id,
          field: 'vocabularies[].kana',
          currentValue: v.kana,
          message: mismatch,
          severity: 'manual_check',
        });
      }

      // Check 4: Pitch accent validation
      const pRes = validatePitch(v.kana, v.dropIndex, v.pitchPattern);
      if (!pRes.valid) {
        recordIssue({
          checkId: 4,
          checkName: checkNames[4],
          lessonId,
          itemId: v.id,
          field: 'vocabularies[].pitchPattern',
          currentValue: { pitchPattern: v.pitchPattern, dropIndex: v.dropIndex },
          message: `Pitch inconsistency on "${v.ja}" (${v.kana}): ${pRes.reason}`,
          severity: 'error',
        });
      }

      // Check 7 & 8: Burmese fields in vocab
      const vBurmese = v.my || v.meaningMy || v.meaningMyanmar || v.myanmar;
      const bRes = validateBurmeseString(vBurmese, v.en);
      if (!bRes.valid) {
        recordIssue({
          checkId: 7,
          checkName: checkNames[7],
          lessonId,
          itemId: v.id,
          field: 'vocabularies[].my',
          currentValue: vBurmese,
          message: `Vocab Burmese meaning issue: ${bRes.reason}`,
          severity: 'error',
        });
      }
      if (vBurmese && isZawgyi(vBurmese)) {
        recordIssue({
          checkId: 8,
          checkName: checkNames[8],
          lessonId,
          itemId: v.id,
          field: 'vocabularies[].my',
          currentValue: vBurmese,
          message: 'Zawgyi encoding detected in vocab Burmese text',
          severity: 'warning',
        });
      }
    });

    // -------------------------------------------------------------------------
    // 3. Kanji exampleVocab
    // -------------------------------------------------------------------------
    (pack.kanjis || []).forEach((k: any) => {
      (k.exampleVocab || []).forEach((ex: any, exIdx: number) => {
        const exBurmese = ex.meaningMyanmar || ex.meaningMy;
        const bRes = validateBurmeseString(exBurmese, ex.meaning);
        if (!bRes.valid) {
          recordIssue({
            checkId: 7,
            checkName: checkNames[7],
            lessonId,
            itemId: k.id,
            field: `kanjis[].exampleVocab[${exIdx}].meaningMyanmar`,
            currentValue: exBurmese,
            message: `Kanji exampleVocab "${ex.word}" Burmese meaning issue: ${bRes.reason}`,
            severity: 'error',
          });
        }
        if (exBurmese && isZawgyi(exBurmese)) {
          recordIssue({
            checkId: 8,
            checkName: checkNames[8],
            lessonId,
            itemId: k.id,
            field: `kanjis[].exampleVocab[${exIdx}].meaningMyanmar`,
            currentValue: exBurmese,
            message: 'Zawgyi encoding detected in kanji exampleVocab',
            severity: 'warning',
          });
        }
      });
    });

    // -------------------------------------------------------------------------
    // 4. Reading Passage
    // -------------------------------------------------------------------------
    if (pack.reading) {
      const r = pack.reading;

      // Check 1: kanaText charset
      const kanaRes = containsInvalidKana(r.kanaText);
      if (kanaRes.invalid) {
        recordIssue({
          checkId: 1,
          checkName: checkNames[1],
          lessonId,
          itemId: r.id,
          field: 'reading.kanaText',
          currentValue: r.kanaText,
          message: `Reading kanaText contains non-kana character(s): [${kanaRes.invalidChars.join(', ')}]`,
          severity: 'error',
        });
      }

      // Check 3: Reading text vs kanaText mismatch
      const mismatch = checkKanaJaMismatch(r.text, r.kanaText);
      if (mismatch) {
        recordIssue({
          checkId: 3,
          checkName: checkNames[3],
          lessonId,
          itemId: r.id,
          field: 'reading.kanaText',
          currentValue: r.kanaText,
          message: mismatch,
          severity: 'manual_check',
        });
      }

      // Check 7 & 8: Reading translationMy
      const bRes = validateBurmeseString(r.translationMy, r.translation);
      if (!bRes.valid) {
        recordIssue({
          checkId: 7,
          checkName: checkNames[7],
          lessonId,
          itemId: r.id,
          field: 'reading.translationMy',
          currentValue: r.translationMy,
          message: `Reading translationMy issue: ${bRes.reason}`,
          severity: 'error',
        });
      }
      if (r.translationMy && isZawgyi(r.translationMy)) {
        recordIssue({
          checkId: 8,
          checkName: checkNames[8],
          lessonId,
          itemId: r.id,
          field: 'reading.translationMy',
          currentValue: r.translationMy,
          message: 'Zawgyi encoding detected in reading translationMy',
          severity: 'warning',
        });
      }

      // Check 5: questionIds referential integrity
      (r.questionIds || []).forEach((qid: string) => {
        if (!allValidItemIds.has(qid)) {
          recordIssue({
            checkId: 5,
            checkName: checkNames[5],
            lessonId,
            itemId: r.id,
            field: 'reading.questionIds',
            currentValue: qid,
            message: `Reading references nonexistent questionId: "${qid}"`,
            severity: 'error',
          });
        }
      });
    }

    // -------------------------------------------------------------------------
    // 5. Listening Dialogue
    // -------------------------------------------------------------------------
    if (pack.listening) {
      const l = pack.listening;

      // Check 7 & 8: listening.translationMy
      if (l.translationMy !== undefined) {
        const bRes = validateBurmeseString(l.translationMy, l.translation);
        if (!bRes.valid) {
          recordIssue({
            checkId: 7,
            checkName: checkNames[7],
            lessonId,
            itemId: l.id,
            field: 'listening.translationMy',
            currentValue: l.translationMy,
            message: `Listening translationMy issue: ${bRes.reason}`,
            severity: 'error',
          });
        }
      }

      (l.turns || []).forEach((turn: any, tIdx: number) => {
        // Check 1: kana charset
        const kanaRes = containsInvalidKana(turn.kana);
        if (kanaRes.invalid) {
          recordIssue({
            checkId: 1,
            checkName: checkNames[1],
            lessonId,
            itemId: `${l.id}-turn${tIdx}`,
            field: `listening.turns[${tIdx}].kana`,
            currentValue: turn.kana,
            message: `Listening turn kana contains non-kana character(s): [${kanaRes.invalidChars.join(', ')}]`,
            severity: 'error',
          });
        }

        // Check 2: speaker prefix
        if (hasSpeakerPrefix(turn.kana)) {
          recordIssue({
            checkId: 2,
            checkName: checkNames[2],
            lessonId,
            itemId: `${l.id}-turn${tIdx}`,
            field: `listening.turns[${tIdx}].kana`,
            currentValue: turn.kana,
            message: `Listening turn kana starts with speaker prefix: "${turn.kana.slice(0, 15)}"`,
            severity: 'error',
          });
        }

        // Check 3: kana vs ja mismatch in turn
        const mismatch = checkKanaJaMismatch(turn.ja, turn.kana);
        if (mismatch) {
          recordIssue({
            checkId: 3,
            checkName: checkNames[3],
            lessonId,
            itemId: `${l.id}-turn${tIdx}`,
            field: `listening.turns[${tIdx}].kana`,
            currentValue: turn.kana,
            message: mismatch,
            severity: 'manual_check',
          });
        }

        // Check 7 & 8: turn Burmese
        const turnBurmese = turn.my || turn.translationMy || turn.myanmar;
        const bRes = validateBurmeseString(turnBurmese, turn.en);
        if (!bRes.valid) {
          recordIssue({
            checkId: 7,
            checkName: checkNames[7],
            lessonId,
            itemId: `${l.id}-turn${tIdx}`,
            field: `listening.turns[${tIdx}].my`,
            currentValue: turnBurmese,
            message: `Listening turn Burmese translation issue: ${bRes.reason}`,
            severity: 'error',
          });
        }
        if (turnBurmese && isZawgyi(turnBurmese)) {
          recordIssue({
            checkId: 8,
            checkName: checkNames[8],
            lessonId,
            itemId: `${l.id}-turn${tIdx}`,
            field: `listening.turns[${tIdx}].my`,
            currentValue: turnBurmese,
            message: 'Zawgyi encoding detected in listening turn Burmese',
            severity: 'warning',
          });
        }
      });

      // Check 5: listening questionIds referential integrity
      (l.questionIds || []).forEach((qid: string) => {
        if (!allValidItemIds.has(qid)) {
          recordIssue({
            checkId: 5,
            checkName: checkNames[5],
            lessonId,
            itemId: l.id,
            field: 'listening.questionIds',
            currentValue: qid,
            message: `Listening references nonexistent questionId: "${qid}"`,
            severity: 'error',
          });
        }
      });
    }

    // -------------------------------------------------------------------------
    // 6. Questions
    // -------------------------------------------------------------------------
    const expectedQuestionPattern = new RegExp(`^${lessonId.replace('.', '\\.')}\\.q\\d{3}$`);
    const seenQuestionIds = new Set<string>();

    (pack.questions || []).forEach((q: any, qIdx: number) => {
      // ID pattern check
      if (!expectedQuestionPattern.test(q.id)) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].id',
          currentValue: q.id,
          message: `Question ID "${q.id}" does not match pattern /^${lessonId}\\.q\\d{3}$/`,
          severity: 'error',
        });
      }
      if (seenQuestionIds.has(q.id)) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].id',
          currentValue: q.id,
          message: `Duplicate question ID detected: "${q.id}"`,
          severity: 'error',
        });
      }
      seenQuestionIds.add(q.id);

      // Sequence check
      const expectedQId = `${lessonId}.q${String(qIdx + 1).padStart(3, '0')}`;
      if (q.id !== expectedQId) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].id',
          currentValue: q.id,
          message: `Question sequence gap/mismatch: index ${qIdx + 1} has id "${q.id}", expected "${expectedQId}"`,
          severity: 'error',
        });
      }

      // choices.length !== 4
      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].choices',
          currentValue: q.choices,
          message: `choices.length (${q.choices?.length ?? 0}) != 4`,
          severity: 'error',
        });
      }

      // answer not in choices
      if (Array.isArray(q.choices) && !q.choices.includes(q.answer)) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].answer',
          currentValue: { answer: q.answer, choices: q.choices },
          message: `Answer "${q.answer}" is not present in choices`,
          severity: 'error',
        });
      }

      // choices and choicesMy lengths differ
      if (Array.isArray(q.choicesMy) && Array.isArray(q.choices) && q.choicesMy.length !== q.choices.length) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].choicesMy',
          currentValue: { choicesLen: q.choices.length, choicesMyLen: q.choicesMy.length },
          message: `choices.length (${q.choices.length}) and choicesMy.length (${q.choicesMy.length}) differ`,
          severity: 'error',
        });
      }

      // duplicate values in choicesMy
      if (Array.isArray(q.choicesMy) && q.choicesMy.length > 1) {
        const uniqueChoicesMy = new Set(q.choicesMy.map((c: any) => String(c).trim()));
        if (uniqueChoicesMy.size !== q.choicesMy.length) {
          recordIssue({
            checkId: 5,
            checkName: checkNames[5],
            lessonId,
            itemId: q.id,
            field: 'questions[].choicesMy',
            currentValue: q.choicesMy,
            message: `Duplicate values detected in choicesMy: [${q.choicesMy.join(', ')}]`,
            severity: 'error',
          });
        }
      }

      // empty linkedItemIds
      if (!Array.isArray(q.linkedItemIds) || q.linkedItemIds.length === 0) {
        recordIssue({
          checkId: 5,
          checkName: checkNames[5],
          lessonId,
          itemId: q.id,
          field: 'questions[].linkedItemIds',
          currentValue: q.linkedItemIds,
          message: 'linkedItemIds is empty or undefined',
          severity: 'error',
        });
      } else {
        // linkedItemIds pointing to nonexistent item
        q.linkedItemIds.forEach((lid: string) => {
          if (!allValidItemIds.has(lid)) {
            recordIssue({
              checkId: 5,
              checkName: checkNames[5],
              lessonId,
              itemId: q.id,
              field: 'questions[].linkedItemIds',
              currentValue: lid,
              message: `linkedItemId "${lid}" does not exist in pack items`,
              severity: 'error',
            });
          }
        });
      }

      // Check 7 & 8: Burmese fields in question choicesMy
      if (Array.isArray(q.choicesMy)) {
        q.choicesMy.forEach((choiceMyText: any, cIdx: number) => {
          const correspondingEn = Array.isArray(q.choices) ? q.choices[cIdx] : undefined;
          const bRes = validateBurmeseString(choiceMyText, correspondingEn);
          if (!bRes.valid) {
            recordIssue({
              checkId: 7,
              checkName: checkNames[7],
              lessonId,
              itemId: q.id,
              field: `questions[].choicesMy[${cIdx}]`,
              currentValue: choiceMyText,
              message: `Choice Burmese translation issue: ${bRes.reason}`,
              severity: 'error',
            });
          }
          if (choiceMyText && isZawgyi(choiceMyText)) {
            recordIssue({
              checkId: 8,
              checkName: checkNames[8],
              lessonId,
              itemId: q.id,
              field: `questions[].choicesMy[${cIdx}]`,
              currentValue: choiceMyText,
              message: 'Zawgyi encoding detected in question choice',
              severity: 'warning',
            });
          }
        });
      }
    });
  }

  return {
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    byCheck,
    byLesson,
    issues,
  };
}

// -----------------------------------------------------------------------------
// CLI Execution
// -----------------------------------------------------------------------------
export function runValidationCli() {
  console.log('========================================================================');
  console.log('🔍 NIHONGO N2 MASTER: N5 CURRICULUM AUDIT & VALIDATION ENGINE');
  console.log('========================================================================\n');

  const outDir = path.join(process.cwd(), 'scripts', 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const report = validateAllN5Packs();
  const baselineOutPath = path.join(outDir, 'n5_validation_baseline.json');
  fs.writeFileSync(baselineOutPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('📊 PER-CHECK SUMMARY:');
  console.log('------------------------------------------------------------------------');
  for (const [id, data] of Object.entries(report.byCheck)) {
    console.log(`[Check ${id}] ${data.name.padEnd(52)} : ${data.count} issue(s)`);
  }
  console.log('------------------------------------------------------------------------');
  console.log(`TOTAL DETECTED ISSUES ACROSS 30 PACKS: ${report.totalIssues}\n`);

  console.log('📋 PER-LESSON BREAKDOWN:');
  console.log('------------------------------------------------------------------------');
  const lessonRows = Object.values(report.byLesson).map((l) => ({
    Lesson: l.lessonId,
    Total: l.totalIssues,
    C1_Kana: l.byCheck[1],
    C2_Prefix: l.byCheck[2],
    C3_Mismatch: l.byCheck[3],
    C4_Pitch: l.byCheck[4],
    C5_Questions: l.byCheck[5],
    C6_Sentences: l.byCheck[6],
    C7_Burmese: l.byCheck[7],
    C8_Zawgyi: l.byCheck[8],
  }));
  console.table(lessonRows);

  console.log(`\n💾 Detailed baseline dump written to: ${baselineOutPath}`);
  return report;
}

runValidationCli();
