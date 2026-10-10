import * as fs from 'fs';
import * as path from 'path';
import { buildLessonPack, LessonEditorialData } from './editorial-pass-n5';
import { lessonN5L11, lessonN5L12, lessonN5L13 } from './editorial-data-n5-11-13';
import { lessonN5L14, lessonN5L15, lessonN5L16, lessonN5L17 } from './editorial-data-n5-14-17';
import { lessonN5L18, lessonN5L19, lessonN5L20 } from './editorial-data-n5-18-20';
import { LessonPackSchema } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

const lessons: LessonEditorialData[] = [
  lessonN5L11,
  lessonN5L12,
  lessonN5L13,
  lessonN5L14,
  lessonN5L15,
  lessonN5L16,
  lessonN5L17,
  lessonN5L18,
  lessonN5L19,
  lessonN5L20,
];

console.log(`Starting native editorial quality pass for N5 Foundation 2 (${lessons.length} lessons)...`);

let totalVocab = 0;
let totalKanji = 0;
let totalGrammar = 0;
let totalSentences = 0;
let totalQuestions = 0;

for (const lessonData of lessons) {
  const pack = buildLessonPack(lessonData);

  // 1. Zod schema validation
  const validated = LessonPackSchema.parse(pack);

  // 2. Content linter validation
  const lintResult = lintLessonPack(validated);
  if (lintResult.errors.length > 0) {
    console.error(`Blocking linter errors in ${pack.id}:`, lintResult.errors);
    process.exit(1);
  }

  // 3. Write file
  const targetPath = path.resolve(`./content/packs/n5/${pack.id}.json`);
  fs.writeFileSync(targetPath, JSON.stringify(validated, null, 2), 'utf-8');

  totalVocab += validated.vocabularies.length;
  totalKanji += validated.kanjis.length;
  totalGrammar += validated.grammars.length;
  totalSentences += validated.sentences.length;
  totalQuestions += validated.questions.length;

  console.log(`✓ [${pack.id}] ${pack.title} - ${validated.vocabularies.length} vocab, ${validated.kanjis.length} kanji, ${validated.grammars.length} grammar, ${validated.sentences.length} sentences, ${validated.questions.length} questions (0 blocking errors, ${lintResult.warnings.length} warnings)`);
}

console.log('\n=== EDITORIAL PASS COMPLETED FOR N5.L11-N5.L20 ===');
console.log(`Lessons reviewed: ${lessons.length}`);
console.log(`Total Vocab reviewed: ${totalVocab}`);
console.log(`Total Kanji reviewed: ${totalKanji}`);
console.log(`Total Grammar reviewed: ${totalGrammar}`);
console.log(`Total Sentences reviewed: ${totalSentences}`);
console.log(`Total Questions reviewed: ${totalQuestions}`);

