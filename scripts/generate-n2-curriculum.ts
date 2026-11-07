import fs from 'fs';
import path from 'path';
import { LessonPackSchema, LessonPack } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { syncCurriculumMap } from './sync-curriculum-map';
import { n2l02Data } from './data/n2-l02-data';
import { n2l03Data } from './data/n2-l03-data';
import { n2l04Data } from './data/n2-l04-data';
import { n2l05Data } from './data/n2-l05-data';
import { n2l06Data } from './data/n2-l06-data';
import { n2l07Data } from './data/n2-l07-data';
import { n2l08Data } from './data/n2-l08-data';

const packsToGenerate: LessonPack[] = [
  n2l02Data,
  n2l03Data,
  n2l04Data,
  n2l05Data,
  n2l06Data,
  n2l07Data,
  n2l08Data,
];

console.log(`Starting generation and validation of ${packsToGenerate.length} N2 lesson packs...`);

for (const pack of packsToGenerate) {
  console.log(`\n======================================================`);
  console.log(`Validating & Writing: ${pack.id} - ${pack.title}`);
  console.log(`======================================================`);

  // 1. Zod schema validation
  const validated = LessonPackSchema.parse(pack);
  console.log(`✓ LessonPackSchema validation PASSED for ${pack.id}`);

  // 2. Referential integrity validation
  const vocabIds = new Set(validated.vocabularies.map((v) => v.id));
  const kanjiIds = new Set(validated.kanjis.map((k) => k.id));
  const grammarIds = new Set(validated.grammars.map((g) => g.id));
  const sentenceIds = new Set(validated.sentences.map((s) => s.id));
  const questionIds = new Set(validated.questions.map((q) => q.id));

  // Check 30 questions with 4 distinct choices
  if (validated.questions.length !== 30) {
    throw new Error(`${pack.id} must have exactly 30 questions, found ${validated.questions.length}`);
  }

  validated.questions.forEach((q) => {
    if (q.choices) {
      if (q.choices.length !== 4) {
        throw new Error(`Question ${q.id} in ${pack.id} must have 4 choices, found ${q.choices.length}`);
      }
      const uniqueChoices = new Set(q.choices);
      if (uniqueChoices.size !== 4) {
        throw new Error(`Question ${q.id} in ${pack.id} has duplicate choices! Choices: ${JSON.stringify(q.choices)}`);
      }
      if (!q.choices.includes(q.answer)) {
        throw new Error(`Question ${q.id} in ${pack.id} choices must contain answer: ${q.answer}`);
      }
      // Verify no placeholder options
      for (const choice of q.choices) {
        if (/Option [B-D]/i.test(choice)) {
          throw new Error(`Question ${q.id} in ${pack.id} contains placeholder choice: ${choice}`);
        }
      }
    }
  });

  // Verify vocab items (12 items)
  if (validated.vocabularies.length !== 12) {
    throw new Error(`${pack.id} must have 12 vocabularies, found ${validated.vocabularies.length}`);
  }
  for (const v of validated.vocabularies) {
    if (["本", "水", "車"].includes(v.ja)) {
      throw new Error(`Vocab ${v.id} in ${pack.id} is an N5 placeholder word: ${v.ja}`);
    }
    if (!v.en || !v.my) {
      throw new Error(`Vocab ${v.id} in ${pack.id} missing en or my definitions.`);
    }
    v.kanjiIds.forEach((kid) => {
      if (!kanjiIds.has(kid)) {
        throw new Error(`Vocab ${v.id} references missing kanji ${kid}`);
      }
    });
    if (v.exampleSentenceId && !sentenceIds.has(v.exampleSentenceId)) {
      throw new Error(`Vocab ${v.id} references missing sentence ${v.exampleSentenceId}`);
    }
  }

  // Verify kanjis (3 items)
  if (validated.kanjis.length !== 3) {
    throw new Error(`${pack.id} must have 3 kanjis, found ${validated.kanjis.length}`);
  }
  validated.kanjis.forEach((k) => {
    if (!k.exampleVocab || k.exampleVocab.length < 2) {
      throw new Error(`Kanji ${k.char} in ${pack.id} must have >= 2 example words`);
    }
    k.exampleSentenceIds.forEach((sId) => {
      if (!sentenceIds.has(sId)) {
        throw new Error(`Kanji ${k.id} references missing sentence ${sId}`);
      }
    });
  });

  // Verify grammars (3 items)
  if (validated.grammars.length !== 3) {
    throw new Error(`${pack.id} must have 3 grammars, found ${validated.grammars.length}`);
  }
  validated.grammars.forEach((g) => {
    if (!g.explanation.en || !g.explanation.my) {
      throw new Error(`Grammar ${g.id} missing bilingual explanation.`);
    }
    g.examples.forEach((ex) => {
      if (!sentenceIds.has(ex.sentenceId)) {
        throw new Error(`Grammar ${g.id} references missing sentence ${ex.sentenceId}`);
      }
    });
  });

  // Check reading questionIds
  if (validated.reading.questionIds.length !== 5) {
    throw new Error(`Reading in ${pack.id} must reference 5 questions, found ${validated.reading.questionIds.length}`);
  }
  validated.reading.questionIds.forEach((qId) => {
    if (!questionIds.has(qId)) {
      throw new Error(`Reading in ${pack.id} references missing question ${qId}`);
    }
  });

  // Check listening questionIds
  if (validated.listening.questionIds.length !== 5) {
    throw new Error(`Listening in ${pack.id} must reference 5 questions, found ${validated.listening.questionIds.length}`);
  }
  validated.listening.questionIds.forEach((qId) => {
    if (!questionIds.has(qId)) {
      throw new Error(`Listening in ${pack.id} references missing question ${qId}`);
    }
  });

  // 3. Content linter checks
  const lintResult = lintLessonPack(validated);
  if (lintResult.errors.length > 0) {
    console.error(`Lint errors in ${pack.id}:`, lintResult.errors);
    throw new Error(`Lint failed for ${pack.id}`);
  }
  if (lintResult.warnings.length > 0) {
    console.warn(`Lint warnings in ${pack.id}:`, lintResult.warnings);
  }
  console.log(`✓ Linter PASSED for ${pack.id} with 0 errors!`);

  // 4. Write pack file
  const targetPackPath = path.resolve(`./content/packs/n2/${pack.id}.json`);
  fs.writeFileSync(targetPackPath, JSON.stringify(validated, null, 2), 'utf-8');
  console.log(`✓ Written 100% valid lesson pack JSON to: ${targetPackPath}`);
}

// 5. Synchronize curriculum-map.json
console.log(`\nSynchronizing curriculum-map.json...`);
const syncResult = syncCurriculumMap();
console.log(`✓ Curriculum map synchronized: ${syncResult.publishedCount} published, ${syncResult.draftedCount} drafted, ${syncResult.plannedCount} planned.`);

console.log(`\nAll N2 curriculum packs (n2.l02, n2.l03, n2.l04, n2.l05, n2.l06, n2.l07, n2.l08) generated and synchronized successfully!`);
