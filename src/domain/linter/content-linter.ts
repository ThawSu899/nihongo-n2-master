import { LessonPack } from '../models/types';

export interface LintIssue {
  severity: 'error' | 'warning';
  rule: string;
  itemId?: string;
  message: string;
}

export interface LintReport {
  lessonId: string;
  passed: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
}

/**
 * Checks for Zawgyi font encoding artifacts in Myanmar text.
 * In Zawgyi, the visual pre-base vowel U+1031 is typed before the consonant (e.g. at the start of a word or after space/punctuation).
 * In standard Unicode, U+1031 is a combining vowel that only follows a consonant.
 */
export function isZawgyi(text: string): boolean {
  if (!text) return false;

  // Pattern 1: Pre-base vowel U+1031 at word start or after whitespace/punctuation (classic Zawgyi visual typing)
  if (/(?:^|[\s\p{P}\u0020-\u002F\u003A-\u0040])\u1031/u.test(text)) {
    return true;
  }

  // Pattern 2: Zawgyi-only dedicated glyph codepoints that do not exist in standard Myanmar Unicode orthography
  // (e.g. U+1060-U+1064, U+106A-U+106D, U+1071-U+1074, U+1086, U+108E-U+1092)
  const zawgyiSpecificCodePoints = /[\u1060-\u1064\u106A-\u106D\u1071-\u1074\u1086\u108E-\u1092]/;
  if (zawgyiSpecificCodePoints.test(text)) {
    return true;
  }

  // Pattern 3: Incorrect medial ordering specific to Zawgyi (e.g. ya-yit U+103C preceded by wa-hswae U+103D)
  if (/\u103D\u103C/.test(text)) {
    return true;
  }

  return false;
}

export function lintLessonPack(pack: LessonPack, allKnownVocabJa: string[] = []): LintReport {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];

  const seenIds = new Set<string>();

  // Rule 1: ID uniqueness and referential integrity
  const recordId = (id: string, rule = 'unique-ids') => {
    if (seenIds.has(id)) {
      errors.push({
        severity: 'error',
        rule,
        itemId: id,
        message: `Duplicate ID detected: ${id}`,
      });
    }
    seenIds.add(id);
  };

  recordId(pack.id);
  pack.vocabularies.forEach((v) => recordId(v.id));
  pack.kanjis.forEach((k) => recordId(k.id));
  pack.grammars.forEach((g) => recordId(g.id));
  pack.sentences.forEach((s) => recordId(s.id));
  recordId(pack.reading.id);
  recordId(pack.listening.id);
  pack.questions.forEach((q) => recordId(q.id));

  // Check referenced IDs
  const vocabIds = new Set(pack.vocabularies.map((v) => v.id));
  const kanjiIds = new Set(pack.kanjis.map((k) => k.id));
  const grammarIds = new Set(pack.grammars.map((g) => g.id));
  const sentenceIds = new Set(pack.sentences.map((s) => s.id));
  const questionIds = new Set(pack.questions.map((q) => q.id));

  pack.vocabularies.forEach((v) => {
    v.kanjiIds.forEach((kid) => {
      if (!kanjiIds.has(kid)) {
        errors.push({
          severity: 'error',
          rule: 'ref-integrity',
          itemId: v.id,
          message: `Vocabulary references unknown kanjiId: ${kid}`,
        });
      }
    });
    if (v.exampleSentenceId && !sentenceIds.has(v.exampleSentenceId)) {
      errors.push({
        severity: 'error',
        rule: 'ref-integrity',
        itemId: v.id,
        message: `Vocabulary references unknown exampleSentenceId: ${v.exampleSentenceId}`,
      });
    }
  });

  // Rule 2: Kanji lacks >= 2 example words
  pack.kanjis.forEach((k) => {
    if (!k.exampleVocab || k.exampleVocab.length < 2) {
      errors.push({
        severity: 'error',
        rule: 'kanji-example-words',
        itemId: k.id,
        message: `Kanji ${k.char} (${k.id}) must have at least 2 example words. Found: ${k.exampleVocab?.length || 0}`,
      });
    }
  });

  // Rule 3: Vocabulary appears in at least one sentence
  const allSentencesText = pack.sentences.map((s) => s.ja).join(' ');
  pack.vocabularies.forEach((v) => {
    const appearsInJa = allSentencesText.includes(v.ja) || allSentencesText.includes(v.kana);
    const referencedBySentences = pack.sentences.some((s) => s.vocabIds.includes(v.id));

    if (!appearsInJa && !referencedBySentences) {
      errors.push({
        severity: 'error',
        rule: 'vocab-in-sentence',
        itemId: v.id,
        message: `Vocabulary ${v.ja} (${v.id}) does not appear in any lesson sentence.`,
      });
    }
  });

  // Rule 4: Grammar target is present in reading or listening text
  const readingText = pack.reading.text;
  const listeningText = pack.listening.transcript;

  pack.grammars.forEach((g) => {
    // Check key pattern tokens (e.g. は ... です or の)
    const patternKey = g.pattern.replace(/[XY]/g, '').trim();
    const inReading = patternKey ? readingText.includes(patternKey) : false;
    const inListening = patternKey ? listeningText.includes(patternKey) : false;

    if (!inReading && !inListening) {
      warnings.push({
        severity: 'warning',
        rule: 'grammar-in-text',
        itemId: g.id,
        message: `Grammar pattern '${g.pattern}' (${g.id}) was not found in either reading passage or listening transcript.`,
      });
    }
  });

  // Rule 5: Reading/listening questions refer to valid IDs
  pack.reading.questionIds.forEach((qid) => {
    if (!questionIds.has(qid)) {
      errors.push({
        severity: 'error',
        rule: 'reading-question-id',
        itemId: pack.reading.id,
        message: `Reading passage references unknown questionId: ${qid}`,
      });
    }
  });

  pack.listening.questionIds.forEach((qid) => {
    if (!questionIds.has(qid)) {
      errors.push({
        severity: 'error',
        rule: 'listening-question-id',
        itemId: pack.listening.id,
        message: `Listening dialogue references unknown questionId: ${qid}`,
      });
    }
  });

  // Rule 6: Myanmar Unicode check (Non-Zawgyi)
  const checkMyanmarField = (text: string | undefined, itemId: string) => {
    if (!text) return;
    if (isZawgyi(text)) {
      errors.push({
        severity: 'error',
        rule: 'myanmar-unicode',
        itemId,
        message: `Myanmar text in ${itemId} failed Unicode validation (detected Zawgyi encoding): "${text}"`,
      });
    }
  };

  pack.vocabularies.forEach((v) => checkMyanmarField(v.my, v.id));
  pack.grammars.forEach((g) => checkMyanmarField(g.explanation.my, g.id));
  pack.sentences.forEach((s) => checkMyanmarField(s.translation.my, s.id));

  // Check question bank size: must be >= 1.5x test size per skill (§5)
  // vocab 10 * 1.5 = 15; kanji 6 * 1.5 = 9; grammar 6 * 1.5 = 9; reading 5 * 1.5 = 8; listening 5 * 1.5 = 8
  const questionsBySkill = pack.questions.reduce((acc, q) => {
    acc[q.skill] = (acc[q.skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const minBankReqs: Record<string, number> = {
    vocab: 15,
    kanji: 9,
    grammar: 9,
    reading: 5, // passages provide their authored set
    listening: 5,
  };

  for (const [skill, minReq] of Object.entries(minBankReqs)) {
    const actual = questionsBySkill[skill] || 0;
    if (actual < minReq) {
      warnings.push({
        severity: 'warning',
        rule: 'question-bank-size',
        message: `Question bank for ${skill} has ${actual} questions (recommended >= ${minReq} for retake variety).`,
      });
    }
  }

  return {
    lessonId: pack.id,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}
