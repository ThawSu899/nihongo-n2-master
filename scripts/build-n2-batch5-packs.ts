import * as fs from 'fs';
import * as path from 'path';
import {
  LessonPack,
  LessonPackSchema,
  Vocabulary,
  Kanji,
  Grammar,
  Sentence,
  ReadingPassage,
  ListeningDialogue,
  Question,
} from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { syncCurriculumMap } from './sync-curriculum-map';
import { LessonSpec } from './data/batch2-specs-12-15';
import { specs41to60 } from './data/batch5-specs';

function buildPackFromSpec(spec: LessonSpec): LessonPack {
  const packId = `n2.l${spec.num.toString().padStart(2, '0')}`;

  const vocabularies: Vocabulary[] = spec.vocabs.map((v, idx) => ({
    id: `${packId}.v${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    ja: v.ja,
    kana: v.kana,
    en: v.en,
    my: v.my,
    meaningMy: v.my,
    meaningMyanmar: v.my,
    pos: v.pos as any,
    exampleSentenceId: `${packId}.s${((idx % 12) + 1).toString().padStart(3, '0')}`,
    kanjiIds: v.kidx !== undefined ? [`${packId}.k${(v.kidx + 1).toString().padStart(3, '0')}`] : [],
    level: 'N2',
    difficulty: 4,
    importance: 5,
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  }));

  const kanjis: Kanji[] = spec.kanjis.map((k, idx) => ({
    id: `${packId}.k${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    char: k.char,
    meaning: k.meaning,
    meaningMy: k.my,
    meaningMyanmar: k.my,
    onyomi: k.onyomi,
    kunyomi: k.kunyomi,
    exampleVocab: k.vocab.map((item) => ({
      word: item.word,
      reading: item.reading,
      meaning: item.meaning,
      meaningMy: item.my,
      preview: item.preview,
    })),
    exampleSentenceIds: [`${packId}.s${(idx + 1).toString().padStart(3, '0')}`],
    components: k.comp,
    strokes: k.strokes,
    difficulty: 4,
    level: 'N2',
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  }));

  const sentences: Sentence[] = spec.sentences.map((s, idx) => ({
    id: `${packId}.s${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    ja: s.ja,
    kana: s.kana,
    translation: {
      en: s.en,
      my: s.my,
    },
    translationMy: s.my,
    vocabIds: s.vIdxs.map((v) => `${packId}.v${(v + 1).toString().padStart(3, '0')}`),
    grammarIds: s.gIdxs.map((g) => `${packId}.g${(g + 1).toString().padStart(3, '0')}`),
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  }));

  const grammars: Grammar[] = spec.grammars.map((g, idx) => {
    const gId = `${packId}.g${(idx + 1).toString().padStart(3, '0')}`;
    const matchingSentenceIds = sentences
      .filter((s) => s.grammarIds.includes(gId))
      .map((s) => s.id);

    const fallbackSentenceId = `${packId}.s${(idx + 1).toString().padStart(3, '0')}`;
    const exampleSentenceIds = matchingSentenceIds.length > 0 ? matchingSentenceIds : [fallbackSentenceId];

    return {
      id: gId,
      lessonId: packId,
      pattern: g.pattern,
      meaning: g.meaning,
      meaningMy: g.my,
      meaningMyanmar: g.my,
      formation: g.formation,
      explanation: {
        en: g.enExp,
        my: g.myExp,
      },
      explanationMy: g.myExp,
      examples: exampleSentenceIds.map((sid) => ({
        sentenceId: sid,
        note: `${g.pattern} usage in authentic context`,
      })),
      similarGrammarIds: spec.grammars
        .filter((_, oIdx) => oIdx !== idx)
        .map((_, oIdx) => `${packId}.g${(oIdx + 1).toString().padStart(3, '0')}`),
      commonMistakes: [
        `Pay careful attention to the nuance and formation of ${g.pattern}.`,
      ],
      difficulty: 4,
      level: 'N2',
      prov: {
        source: 'Nihongo N2 Master Editorial Team',
        license: 'CC-BY-4.0',
        status: 'native_verified',
        updatedAt: '2026-11-01T10:00:00Z',
        rev: 2,
      },
      clozeSentence: g.cloze,
      clozeTarget: g.clozeTarget,
      clozeHint: g.clozeHint,
      acceptableSynonyms: g.synonyms,
      nuanceExplanationMy: g.nuanceMy,
    };
  });

  const reading: ReadingPassage = {
    id: `${packId}.r001`,
    lessonId: packId,
    title: spec.reading.title,
    level: 'N2',
    text: spec.reading.text,
    kanaText: spec.reading.kana,
    translation: spec.reading.my,
    translationMy: spec.reading.my,
    questionIds: [`${packId}.q025`, `${packId}.q026`, `${packId}.q027`],
    difficulty: 4,
    glossary: spec.reading.glossary.map((glo) => ({
      term: glo.term,
      reading: glo.reading,
      meaning: glo.meaning,
      meaningMy: glo.meaning,
      meaningMyanmar: glo.meaning,
    })),
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  };

  const listening: ListeningDialogue = {
    id: `${packId}.lis001`,
    lessonId: packId,
    title: spec.listening.title,
    level: 'N2',
    audio: { kind: 'tts', lang: 'ja-JP' },
    speakers: spec.listening.speakers,
    transcript: spec.listening.dialogue.map((d) => `${d.spk}: ${d.ja}`).join('\n'),
    translation: spec.listening.dialogue.map((d) => `${d.spk}: ${d.my}`).join('\n'),
    translationMy: spec.listening.dialogue.map((d) => `${d.spk}: ${d.my}`).join('\n'),
    turns: spec.listening.dialogue.map((d) => ({
      speaker: d.spk,
      ja: d.ja,
      kana: d.kana,
      en: d.en,
      my: d.my,
      translationMy: d.my,
      myanmar: d.my,
    })),
    questionIds: [`${packId}.q028`, `${packId}.q029`, `${packId}.q030`],
    difficulty: 4,
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  };

  const questions: Question[] = [];

  // q001 to q008: Vocab
  spec.quizPrompts.vPrompts.forEach((vp, idx) => {
    const qNum = (idx + 1).toString().padStart(3, '0');
    questions.push({
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill: 'vocab',
      type: 'multiple_choice',
      prompt: vp.p,
      choices: vp.choices,
      answer: vp.a,
      explanation: vp.exp,
      explanationMy: vp.myExp,
      difficulty: 4,
      linkedItemIds: [`${packId}.v${(vp.vIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  // q009 to q014: Kanji
  spec.quizPrompts.kPrompts.forEach((kp, idx) => {
    const qNum = (idx + 9).toString().padStart(3, '0');
    questions.push({
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill: 'kanji',
      type: 'multiple_choice',
      prompt: kp.p,
      choices: kp.choices,
      answer: kp.a,
      explanation: kp.exp,
      explanationMy: kp.myExp,
      difficulty: 4,
      linkedItemIds: [`${packId}.k${(kp.kIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  // q015 to q024: Grammar
  spec.quizPrompts.gPrompts.forEach((gp, idx) => {
    const qNum = (idx + 15).toString().padStart(3, '0');
    questions.push({
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill: 'grammar',
      type: 'multiple_choice',
      prompt: gp.p,
      choices: gp.choices,
      answer: gp.a,
      explanation: gp.exp,
      explanationMy: gp.myExp,
      difficulty: 4,
      linkedItemIds: [`${packId}.g${(gp.gIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  // q025 to q027: Reading
  spec.reading.qPrompts.forEach((rp, idx) => {
    const qNum = (idx + 25).toString().padStart(3, '0');
    questions.push({
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill: 'reading',
      type: 'multiple_choice',
      prompt: rp.p,
      choices: rp.choices,
      answer: rp.a,
      explanation: rp.exp,
      explanationMy: rp.myExp,
      difficulty: 4,
      linkedItemIds: [`${packId}.g001`],
      generated: false,
    });
  });

  // q028 to q030: Listening
  spec.listening.qPrompts.forEach((lp, idx) => {
    const qNum = (idx + 28).toString().padStart(3, '0');
    questions.push({
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill: 'listening',
      type: 'multiple_choice',
      prompt: lp.p,
      choices: lp.choices,
      answer: lp.a,
      explanation: lp.exp,
      explanationMy: lp.myExp,
      difficulty: 4,
      linkedItemIds: [`${packId}.g002`],
      generated: false,
    });
  });

  return {
    id: packId,
    level: 'N2',
    module: 'N2 Mastery & Professional Japanese',
    number: spec.num,
    title: spec.title,
    description: spec.desc,
    status: 'published',
    masteryThresholds: {
      vocab: 0.9,
      kanji: 0.85,
      grammar: 0.85,
      reading: 0.8,
      listening: 0.8,
      overall: 0.85,
    },
    vocabularies,
    kanjis,
    grammars,
    sentences,
    reading,
    listening,
    questions,
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-01T10:00:00Z',
      rev: 2,
    },
  };
}

// Assemble all 20 lesson packs (n2.l41 to n2.l60)
const constructedPacks: LessonPack[] = specs41to60.map(buildPackFromSpec);

console.log(`Assembled ${constructedPacks.length} packs (n2.l41 to n2.l60). Validating...`);

for (const pack of constructedPacks) {
  const parsed = LessonPackSchema.safeParse(pack);
  if (!parsed.success) {
    console.error(`Validation failed for pack ${pack.id}:`, parsed.error.format());
    process.exit(1);
  }

  const lintResult = lintLessonPack(pack);
  if (lintResult.errors.length > 0) {
    console.error(`Lint errors for pack ${pack.id}:`, lintResult.errors);
    process.exit(1);
  }

  // Also check choices uniqueness and answer existence
  for (const q of pack.questions) {
    if (!q.choices || q.choices.length !== 4) {
      console.error(`Question ${q.id} in pack ${pack.id} does not have exactly 4 choices.`);
      process.exit(1);
    }
    if (new Set(q.choices).size !== 4) {
      console.error(`Question ${q.id} in pack ${pack.id} has duplicate choices:`, q.choices);
      process.exit(1);
    }
    if (!q.choices.includes(q.answer)) {
      console.error(`Question ${q.id} answer "${q.answer}" is not in choices:`, q.choices);
      process.exit(1);
    }
  }

  console.log(`Pack ${pack.id} passed validation, linting & choice invariants with 0 errors.`);
}

// 1. Write JSON files to content/packs/n2/
const jsonDir = path.resolve('./content/packs/n2');
for (const pack of constructedPacks) {
  const filePath = path.join(jsonDir, `${pack.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
  console.log(`Saved JSON: ${filePath}`);
}

// 2. Write individual TS packs to src/domain/curriculum/packs/n2/
const tsDir = path.resolve('./src/domain/curriculum/packs/n2');
for (const pack of constructedPacks) {
  const varName = `${pack.id.replace('.', '')}Data`;
  const tsPath = path.join(tsDir, `${pack.id}.ts`);
  const content = `import { LessonPack } from '../../../models/types';\n\nexport const ${varName}: LessonPack = ${JSON.stringify(
    pack,
    null,
    2
  )};\n`;
  fs.writeFileSync(tsPath, content, 'utf-8');
  console.log(`Saved TS: ${tsPath}`);
}

// 3. Update src/domain/curriculum/packs/n2/index.ts
const allPackNumbers = Array.from({ length: 60 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const n2IndexImports = [
  "import { LessonPack } from '../../../models/types';",
  ...allPackNumbers.map((num) => `import { n2l${num}Data } from './n2.l${num}';`),
].join('\n');

const n2IndexExports = [
  'export {',
  ...allPackNumbers.map((num) => `  n2l${num}Data,`),
  '};',
].join('\n');

const initialPackNames = ['n2l01Data', 'n2l02Data', 'n2l03Data'];
const batch1PackNames = ['n2l04Data', 'n2l05Data', 'n2l06Data', 'n2l07Data', 'n2l08Data', 'n2l09Data', 'n2l10Data'];
const batch2PackNames = Array.from({ length: 10 }, (_, i) => `n2l${(i + 11).toString().padStart(2, '0')}Data`);
const batch3PackNames = Array.from({ length: 10 }, (_, i) => `n2l${(i + 21).toString().padStart(2, '0')}Data`);
const batch4PackNames = Array.from({ length: 10 }, (_, i) => `n2l${(i + 31).toString().padStart(2, '0')}Data`);
const batch5PackNames = Array.from({ length: 20 }, (_, i) => `n2l${(i + 41).toString().padStart(2, '0')}Data`);

const n2IndexBatches = [
  'export const N2_INITIAL_PACKS: LessonPack[] = [',
  ...initialPackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const N2_BATCH1_PACKS: LessonPack[] = [',
  ...batch1PackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const N2_BATCH2_PACKS: LessonPack[] = [',
  ...batch2PackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const N2_BATCH3_PACKS: LessonPack[] = [',
  ...batch3PackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const N2_BATCH4_PACKS: LessonPack[] = [',
  ...batch4PackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const N2_BATCH5_PACKS: LessonPack[] = [',
  ...batch5PackNames.map((name) => `  ${name},`),
  '];',
  '',
  'export const ALL_N2_PACKS: LessonPack[] = [',
  '  ...N2_INITIAL_PACKS,',
  '  ...N2_BATCH1_PACKS,',
  '  ...N2_BATCH2_PACKS,',
  '  ...N2_BATCH3_PACKS,',
  '  ...N2_BATCH4_PACKS,',
  '  ...N2_BATCH5_PACKS,',
  '];',
].join('\n');

const n2IndexPath = path.join(tsDir, 'index.ts');
fs.writeFileSync(
  n2IndexPath,
  `${n2IndexImports}\n\n${n2IndexExports}\n\n${n2IndexBatches}\n`,
  'utf-8'
);
console.log(`Updated: ${n2IndexPath}`);

// 4. Update src/domain/curriculum/content-loader.ts
const domainContentLoaderPath = path.resolve('./src/domain/curriculum/content-loader.ts');
const domainContentLoaderContent = `import { ContentLoader } from '../../data/content/content-loader';
import {
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
  N2_BATCH5_PACKS,
  ALL_N2_PACKS,
} from './packs/n2';
import { LessonPack } from '../models/types';

export {
  ContentLoader,
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
  N2_BATCH5_PACKS,
  ALL_N2_PACKS,
};

export function getN2InitialLessonPack(lessonId: string): LessonPack | undefined {
  return N2_INITIAL_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH1_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch2LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH2_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch3LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH3_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch4LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH4_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch5LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH5_PACKS.find((p) => p.id === lessonId);
}

export function getN2LessonPack(lessonId: string): LessonPack | undefined {
  return ALL_N2_PACKS.find((p) => p.id === lessonId);
}
`;
fs.writeFileSync(domainContentLoaderPath, domainContentLoaderContent, 'utf-8');
console.log(`Updated: ${domainContentLoaderPath}`);

// 5. Sync curriculum-map.json
const syncResult = syncCurriculumMap();
console.log('Curriculum map synced successfully:', {
  syncedCount: syncResult.syncedCount,
  publishedCount: syncResult.publishedCount,
  draftedCount: syncResult.draftedCount,
  plannedCount: syncResult.plannedCount,
});
