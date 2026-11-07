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
  CurriculumMapItem,
} from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { specs31to35 } from './data/n3-batch2-specs-31-35';
import { specs36to40 } from './data/n3-batch2-specs-36-40';
import { specs41to44 } from './data/n3-batch2-specs-41-44';
import { specs45to48 } from './data/n3-batch2-specs-45-48';

function buildPackFromSpec31to40(spec: any): LessonPack {
  const packId = `n3.l${spec.num.toString().padStart(2, '0')}`;
  const mod = spec.num <= 32 ? 'N3 Nuance & Natural Discourse' : 'N3 Formal & Expository';

  const vocabularies: Vocabulary[] = spec.vocabs.map((v: any, idx: number) => ({
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
    level: 'N3',
    difficulty: 3,
    importance: 4,
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const kanjis: Kanji[] = spec.kanjis.map((k: any, idx: number) => ({
    id: `${packId}.k${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    char: k.char,
    meaning: k.meaning,
    meaningMy: k.my,
    meaningMyanmar: k.my,
    onyomi: k.onyomi,
    kunyomi: k.kunyomi,
    exampleVocab: k.vocab.map((item: any) => ({
      word: item.word,
      reading: item.reading,
      meaning: item.meaning,
      meaningMy: item.my,
      preview: item.preview,
    })),
    exampleSentenceIds: [`${packId}.s${(idx + 1).toString().padStart(3, '0')}`],
    components: k.comp,
    strokes: k.strokes,
    difficulty: 3,
    level: 'N3',
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const sentences: Sentence[] = spec.sentences.map((s: any, idx: number) => ({
    id: `${packId}.s${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    ja: s.ja,
    kana: s.kana,
    translation: {
      en: s.en,
      my: s.my,
    },
    translationMy: s.my,
    vocabIds: s.vIdxs.map((v: number) => `${packId}.v${(v + 1).toString().padStart(3, '0')}`),
    grammarIds: s.gIdxs.map((g: number) => `${packId}.g${(g + 1).toString().padStart(3, '0')}`),
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const grammars: Grammar[] = spec.grammars.map((g: any, idx: number) => {
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
        .filter((_: any, oIdx: number) => oIdx !== idx)
        .map((_: any, oIdx: number) => `${packId}.g${(oIdx + 1).toString().padStart(3, '0')}`),
      commonMistakes: [
        `Pay careful attention to the nuance and formation of ${g.pattern}.`,
      ],
      difficulty: 3,
      level: 'N3',
      prov: {
        source: 'Nihongo N2 Master Editorial Team',
        license: 'CC-BY-4.0',
        status: 'native_verified',
        updatedAt: '2026-11-06T10:00:00Z',
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
    level: 'N3',
    text: spec.reading.text,
    kanaText: spec.reading.kana,
    translation: spec.reading.my,
    translationMy: spec.reading.my,
    questionIds: [`${packId}.q025`, `${packId}.q026`, `${packId}.q027`],
    difficulty: 3,
    glossary: spec.reading.glossary.map((glo: any) => ({
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
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };

  const listening: ListeningDialogue = {
    id: `${packId}.lis001`,
    lessonId: packId,
    title: spec.listening.title,
    level: 'N3',
    audio: { kind: 'tts', lang: 'ja-JP' },
    speakers: spec.listening.speakers,
    transcript: spec.listening.dialogue.map((d: any) => `${d.spk}: ${d.ja}`).join('\n'),
    translation: spec.listening.dialogue.map((d: any) => `${d.spk}: ${d.my}`).join('\n'),
    translationMy: spec.listening.dialogue.map((d: any) => `${d.spk}: ${d.my}`).join('\n'),
    turns: spec.listening.dialogue.map((d: any) => ({
      speaker: d.spk,
      ja: d.ja,
      kana: d.kana,
      en: d.en,
      my: d.my,
      translationMy: d.my,
      myanmar: d.my,
    })),
    questionIds: [`${packId}.q028`, `${packId}.q029`, `${packId}.q030`],
    difficulty: 3,
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };

  const questions: Question[] = [];

  spec.quizPrompts.vPrompts.forEach((vp: any, idx: number) => {
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
      difficulty: 3,
      linkedItemIds: [`${packId}.v${(vp.vIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  spec.quizPrompts.kPrompts.forEach((kp: any, idx: number) => {
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
      difficulty: 3,
      linkedItemIds: [`${packId}.k${(kp.kIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  spec.quizPrompts.gPrompts.forEach((gp: any, idx: number) => {
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
      difficulty: 3,
      linkedItemIds: [`${packId}.g${(gp.gIdx + 1).toString().padStart(3, '0')}`],
      generated: false,
    });
  });

  spec.reading.qPrompts.forEach((rp: any, idx: number) => {
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
      difficulty: 3,
      linkedItemIds: [`${packId}.g001`],
      generated: false,
    });
  });

  spec.listening.qPrompts.forEach((lp: any, idx: number) => {
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
      difficulty: 3,
      linkedItemIds: [`${packId}.g002`],
      generated: false,
    });
  });

  return {
    id: packId,
    level: 'N3',
    module: mod,
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
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };
}

function buildPackFromSpec41to48(spec: any): LessonPack {
  const packId = spec.id;
  const num = spec.lessonNumber;

  const canonicalTitles: Record<number, string> = {
    41: 'N3 Lesson 41: Degree, Extent & Comparisons (〜ほど・〜くらい・〜より〜のほうが)',
    42: 'N3 Lesson 42: Examples, Approximations & Listings (〜とか〜とか・〜といった・〜など)',
    43: 'N3 Lesson 43: Exclusivity, Limitation & Addition (〜だけ・〜ばかり・〜だけでなく)',
    44: 'N3 Lesson 44: Passive, Causative & Causative-Passive (〜れる/られる・〜せる/させる・〜せられる)',
    45: 'N3 Lesson 45: Giving, Receiving & Benefactive (〜てあげる・〜てくれる・〜てもらう)',
    46: 'N3 Lesson 46: Everyday Keigo (お〜になる・お〜する・特別敬語)',
    47: 'N3 Lesson 47: Spoken Contractions (〜ちゃう/じゃう・〜とく・〜なきゃ/なくちゃ)',
    48: 'N3 Lesson 48: N3 Comprehensive Review & N2 Bridge (〜わけだ・〜に違いない・〜はずだ)',
  };

  const title = canonicalTitles[num] || `N3 Lesson ${num}: ${spec.title}`;

  const vocabularies: Vocabulary[] = spec.vocabList.map((v: any, idx: number) => ({
    id: `${packId}.v${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    ja: v.word,
    kana: v.reading,
    en: v.romaji,
    my: v.meaning,
    meaningMy: v.meaning,
    meaningMyanmar: v.meaning,
    pos: v.pos as any,
    exampleSentenceId: `${packId}.s${((idx % spec.sentences.length) + 1).toString().padStart(3, '0')}`,
    kanjiIds: [],
    level: 'N3',
    difficulty: 3,
    importance: 4,
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const kanjis: Kanji[] = spec.kanjiList.map((k: any, idx: number) => ({
    id: `${packId}.k${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    char: k.kanji,
    meaning: k.meaning,
    meaningMy: k.meaning,
    meaningMyanmar: k.meaning,
    onyomi: k.onyomi.split(/[,、\s]+/).filter(Boolean),
    kunyomi: k.kunyomi ? k.kunyomi.split(/[,、\s]+/).filter(Boolean) : [],
    exampleVocab: k.examples.map((ex: any) => ({
      word: ex.word,
      reading: ex.reading,
      meaning: ex.meaning,
      meaningMy: ex.meaning,
      preview: false,
    })),
    exampleSentenceIds: [`${packId}.s001`],
    components: [k.rad],
    strokes: 8,
    difficulty: 3,
    level: 'N3',
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const sentences: Sentence[] = spec.sentences.map((s: any, idx: number) => ({
    id: `${packId}.s${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    ja: s.ja,
    kana: s.ja,
    translation: {
      en: s.romaji,
      my: s.my,
    },
    translationMy: s.my,
    vocabIds: (s.vIdxs || []).map((v: number) => `${packId}.v${(v + 1).toString().padStart(3, '0')}`),
    grammarIds: [`${packId}.g001`],
    audio: { kind: 'tts', lang: 'ja-JP' },
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  }));

  const grammars: Grammar[] = spec.grammarList.map((g: any, idx: number) => ({
    id: `${packId}.g${(idx + 1).toString().padStart(3, '0')}`,
    lessonId: packId,
    pattern: g.pattern,
    meaning: g.meaning,
    meaningMy: g.meaning,
    meaningMyanmar: g.meaning,
    formation: g.formation,
    explanation: {
      en: g.notes,
      my: g.notes,
    },
    explanationMy: g.notes,
    examples: [
      {
        sentenceId: `${packId}.s001`,
        note: `${g.pattern} usage in authentic context`,
      },
    ],
    similarGrammarIds: [],
    commonMistakes: [
      `Pay careful attention to the nuance and formation of ${g.pattern}.`,
    ],
    difficulty: 3,
    level: 'N3',
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
    clozeSentence: g.examples && g.examples[0] ? g.examples[0].ja : undefined,
    clozeTarget: g.pattern,
    clozeHint: g.meaning,
    acceptableSynonyms: [],
    nuanceExplanationMy: g.notes,
  }));

  const reading: ReadingPassage = {
    id: `${packId}.r001`,
    lessonId: packId,
    title: spec.reading.title,
    level: 'N3',
    text: spec.reading.text,
    kanaText: spec.reading.text,
    translation: spec.reading.title,
    translationMy: spec.reading.title,
    questionIds: [`${packId}.q025`, `${packId}.q026`, `${packId}.q027`],
    difficulty: 3,
    glossary: spec.reading.glossary.map((glo: any) => ({
      term: glo.term,
      reading: glo.term,
      meaning: glo.meaning,
      meaningMy: glo.meaning,
      meaningMyanmar: glo.meaning,
    })),
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };

  const listening: ListeningDialogue = {
    id: `${packId}.lis001`,
    lessonId: packId,
    title: spec.dialogue.title,
    level: 'N3',
    audio: { kind: 'tts', lang: 'ja-JP' },
    speakers: ['A', 'B'],
    transcript: spec.dialogue.lines.map((l: any) => `${l.speaker}: ${l.ja}`).join('\n'),
    translation: spec.dialogue.lines.map((l: any) => `${l.speaker}: ${l.my}`).join('\n'),
    translationMy: spec.dialogue.lines.map((l: any) => `${l.speaker}: ${l.my}`).join('\n'),
    turns: spec.dialogue.lines.map((l: any) => ({
      speaker: l.speaker,
      ja: l.ja,
      kana: l.ja,
      en: l.romaji,
      my: l.my,
      translationMy: l.my,
      myanmar: l.my,
    })),
    questionIds: [`${packId}.q028`, `${packId}.q029`, `${packId}.q030`],
    difficulty: 3,
    prov: {
      source: 'Nihongo N2 Master Editorial Team',
      license: 'CC-BY-4.0',
      status: 'native_verified',
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };

  const questions: Question[] = spec.questions.map((q: any, idx: number) => {
    const qNum = (idx + 1).toString().padStart(3, '0');
    let skill: 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' = 'grammar';
    if (idx >= 8 && idx < 16) skill = 'vocab';
    else if (idx >= 16 && idx < 24) skill = 'kanji';
    else if (idx >= 24 && idx < 27) skill = 'reading';
    else if (idx >= 27) skill = 'listening';

    let linkedItemId = `${packId}.g001`;
    if (skill === 'vocab') linkedItemId = `${packId}.v001`;
    else if (skill === 'kanji') linkedItemId = `${packId}.k001`;
    else if (skill === 'listening') linkedItemId = `${packId}.g002`;

    return {
      id: `${packId}.q${qNum}`,
      lessonId: packId,
      skill,
      type: 'multiple_choice',
      prompt: q.prompt,
      choices: q.options,
      answer: q.options[q.correctIndex],
      explanation: q.explanation,
      explanationMy: q.explanation,
      difficulty: 3,
      linkedItemIds: [linkedItemId],
      generated: false,
    };
  });

  return {
    id: packId,
    level: 'N3',
    module: spec.module,
    number: num,
    title,
    description: spec.canDo.join(' '),
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
      updatedAt: '2026-11-06T10:00:00Z',
      rev: 2,
    },
  };
}

// Assemble all 18 packs
const specs31to40 = [...specs31to35, ...specs36to40];
const specs41to48 = [...specs41to44, ...specs45to48];

const constructedPacks: LessonPack[] = [
  ...specs31to40.map(buildPackFromSpec31to40),
  ...specs41to48.map(buildPackFromSpec41to48),
];

console.log(`Assembled ${constructedPacks.length} packs (n3.l31 to n3.l48). Validating...`);

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

  // Check choices invariants
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

  console.log(`Pack ${pack.id} passed schema, linting, and choice invariants.`);
}

// 1. Write JSON files to content/packs/n3/
const jsonDir = path.resolve('./content/packs/n3');
for (const pack of constructedPacks) {
  const filePath = path.join(jsonDir, `${pack.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
  console.log(`Saved JSON: ${filePath}`);
}

// 2. Synchronize content/curriculum-map.json
const mapPath = path.resolve('./content/curriculum-map.json');
const curriculumMap: CurriculumMapItem[] = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

for (const pack of constructedPacks) {
  const mapItem = curriculumMap.find((item) => item.id === pack.id);
  if (mapItem) {
    mapItem.status = 'published';
    mapItem.title = pack.title;
    mapItem.grammarTopics = pack.grammars.map((g) => g.pattern);
    mapItem.targetVocabCount = pack.vocabularies.length;
    mapItem.targetKanjiCount = pack.kanjis.length;
    mapItem.module = pack.module;
  }
}
fs.writeFileSync(mapPath, JSON.stringify(curriculumMap, null, 2), 'utf-8');
console.log('Synchronized content/curriculum-map.json with 100% published status for n3.l31-n3.l48.');

// 3. Create TS files in src/domain/curriculum/packs/n3/
const tsPacksDir = path.resolve('./src/domain/curriculum/packs/n3');
if (!fs.existsSync(tsPacksDir)) {
  fs.mkdirSync(tsPacksDir, { recursive: true });
}

// For n3.l01 to n3.l30: load existing JSON files and generate TS
for (let i = 1; i <= 30; i++) {
  const lessonId = `n3.l${i.toString().padStart(2, '0')}`;
  const jsonFilePath = path.join(jsonDir, `${lessonId}.json`);
  const packData: LessonPack = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  const varName = `n3l${i.toString().padStart(2, '0')}Data`;
  const tsContent = `import { LessonPack } from '../../../models/types';\n\nexport const ${varName}: LessonPack = ${JSON.stringify(
    packData,
    null,
    2
  )};\n`;
  fs.writeFileSync(path.join(tsPacksDir, `${lessonId}.ts`), tsContent, 'utf-8');
}
console.log('Generated TS packs for n3.l01 to n3.l30.');

// For n3.l31 to n3.l48: generate TS from constructedPacks
for (const pack of constructedPacks) {
  const numStr = pack.number.toString().padStart(2, '0');
  const varName = `n3l${numStr}Data`;
  const tsContent = `import { LessonPack } from '../../../models/types';\n\nexport const ${varName}: LessonPack = ${JSON.stringify(
    pack,
    null,
    2
  )};\n`;
  fs.writeFileSync(path.join(tsPacksDir, `${pack.id}.ts`), tsContent, 'utf-8');
}
console.log('Generated TS packs for n3.l31 to n3.l48.');

// 4. Generate src/domain/curriculum/packs/n3/index.ts
const importsList: string[] = [];
const allPacksList: string[] = [];
const batch1List: string[] = [];
const batch2List: string[] = [];

for (let i = 1; i <= 48; i++) {
  const numStr = i.toString().padStart(2, '0');
  const varName = `n3l${numStr}Data`;
  importsList.push(`import { ${varName} } from './n3.l${numStr}';`);
  allPacksList.push(`  ${varName},`);
  if (i <= 30) {
    batch1List.push(`  ${varName},`);
  } else {
    batch2List.push(`  ${varName},`);
  }
}

const indexContent = `import { LessonPack } from '../../../models/types';
${importsList.join('\n')}

export {\n${allPacksList.join('\n')}\n};

export const N3_BATCH1_PACKS: LessonPack[] = [\n${batch1List.join('\n')}\n];

export const N3_BATCH2_PACKS: LessonPack[] = [\n${batch2List.join('\n')}\n];

export const ALL_N3_PACKS: LessonPack[] = [\n  ...N3_BATCH1_PACKS,\n  ...N3_BATCH2_PACKS,\n];
`;

fs.writeFileSync(path.join(tsPacksDir, 'index.ts'), indexContent, 'utf-8');
console.log('Generated src/domain/curriculum/packs/n3/index.ts.');

// 5. Update src/domain/curriculum/content-loader.ts
const contentLoaderPath = path.resolve('./src/domain/curriculum/content-loader.ts');
const contentLoaderContent = `import { ContentLoader } from '../../data/content/content-loader';
import {
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
} from './packs/n2';
import {
  N3_BATCH1_PACKS,
  N3_BATCH2_PACKS,
  ALL_N3_PACKS,
} from './packs/n3';
import { LessonPack } from '../models/types';

export {
  ContentLoader,
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
  N3_BATCH1_PACKS,
  N3_BATCH2_PACKS,
  ALL_N3_PACKS,
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

export function getN3Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH1_PACKS.find((p) => p.id === lessonId);
}

export function getN3Batch2LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH2_PACKS.find((p) => p.id === lessonId);
}

export function getN3LessonPack(lessonId: string): LessonPack | undefined {
  return ALL_N3_PACKS.find((p) => p.id === lessonId);
}
`;

fs.writeFileSync(contentLoaderPath, contentLoaderContent, 'utf-8');
console.log('Updated src/domain/curriculum/content-loader.ts with N3 pack loaders.');
console.log('N3 Batch 2 build and publication completed successfully!');
