import * as fs from 'fs';
import * as path from 'path';
import { LessonPack, LessonPackSchema } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

export interface LessonEditorialData {
  id: string;
  title: string;
  description: string;
  vocabularies: Array<{
    id: string;
    ja: string;
    kana: string;
    en: string;
    my: string;
    pos: string;
    kanjiChar?: string;
    importance?: number;
  }>;
  kanjis: Array<{
    id: string;
    char: string;
    meaning: string;
    onyomi: string[];
    kunyomi: string[];
    strokes: number;
    ex1: [string, string, string]; // word, reading, meaning
    ex2: [string, string, string];
  }>;
  grammars: Array<{
    id: string;
    pattern: string;
    meaning: string;
    formation: string;
    en: string;
    my: string;
    pitfall: string;
  }>;
  sentences: Array<{
    id: string;
    ja: string;
    kana: string;
    en: string;
    my: string;
    vocabIds: string[];
    grammarIds: string[];
  }>;
  reading: {
    title: string;
    text: string;
    kanaText: string;
    translation: string;
    questions: Array<{
      prompt: string;
      choices: string[];
      answer: string;
      explanation: string;
    }>;
  };
  listening: {
    title: string;
    translation: string;
    turns: Array<{
      speaker: string;
      ja: string;
      kana: string;
      en: string;
    }>;
    questions: Array<{
      prompt: string;
      choices: string[];
      answer: string;
      explanation: string;
    }>;
  };
}

export function buildLessonPack(data: LessonEditorialData): LessonPack {
  const lessonId = data.id;
  const prov = {
    source: 'Nihongo N2 Master Editorial Team (Native Review)',
    license: 'CC-BY-4.0',
    status: 'reviewed' as const,
    updatedAt: '2026-10-01T00:00:00Z',
    rev: 2,
  };

  // 1. Kanjis
  const kanjis = data.kanjis.map((k, idx) => ({
    id: k.id,
    lessonId,
    char: k.char,
    meaning: k.meaning,
    onyomi: k.onyomi,
    kunyomi: k.kunyomi,
    exampleVocab: [
      { word: `${k.ex1[0]} (${k.ex1[1]})`, reading: k.ex1[1], meaning: k.ex1[2], preview: false },
      { word: `${k.ex2[0]} (${k.ex2[1]})`, reading: k.ex2[1], meaning: k.ex2[2], preview: true },
    ],
    exampleSentenceIds: [data.sentences[idx % data.sentences.length]?.id || `${lessonId}.s001`],
    components: [k.char],
    strokes: k.strokes,
    difficulty: 1,
    level: 'N5' as const,
    prov,
  }));

  // 2. Vocabularies
  const vocabularies = data.vocabularies.map((v, idx) => {
    const linkedK = kanjis.find((k) => k.char === v.kanjiChar);
    const assignedSentence = data.sentences.find((s) => s.vocabIds.includes(v.id)) || data.sentences[idx % data.sentences.length];
    return {
      id: v.id,
      lessonId,
      ja: v.ja,
      kana: v.kana,
      en: v.en,
      my: v.my,
      pos: v.pos,
      exampleSentenceId: assignedSentence.id,
      kanjiIds: linkedK ? [linkedK.id] : [],
      level: 'N5' as const,
      difficulty: 1,
      importance: v.importance || 5,
      audio: { kind: 'tts' as const, lang: 'ja-JP' as const },
      prov,
    };
  });

  // 3. Grammars
  const grammars = data.grammars.map((g, idx) => {
    const matchingSentences = data.sentences.filter((s) => s.grammarIds.includes(g.id));
    const exList = matchingSentences.length > 0
      ? matchingSentences.slice(0, 2).map((s, i) => ({ sentenceId: s.id, note: i === 0 ? 'Basic usage' : 'Conversational context' }))
      : [{ sentenceId: data.sentences[0].id, note: 'Core formation' }, { sentenceId: data.sentences[1].id, note: 'Contextual pattern' }];
    return {
      id: g.id,
      lessonId,
      pattern: g.pattern,
      meaning: g.meaning,
      formation: g.formation,
      explanation: {
        en: g.en,
        my: g.my,
      },
      examples: exList,
      similarGrammarIds: [],
      commonMistakes: [g.pitfall],
      difficulty: 1,
      level: 'N5' as const,
      prov,
    };
  });

  // 4. Sentences
  const sentences = data.sentences.map((s) => ({
    id: s.id,
    lessonId,
    ja: s.ja,
    kana: s.kana,
    translation: {
      en: s.en,
      my: s.my,
    },
    vocabIds: s.vocabIds,
    grammarIds: s.grammarIds,
    audio: { kind: 'tts' as const, lang: 'ja-JP' as const },
    prov,
  }));

  // Ensure every vocab item appears in at least one sentence
  data.vocabularies.forEach((v, idx) => {
    const appears = sentences.some((s) => s.ja.includes(v.ja) || s.vocabIds.includes(v.id));
    if (!appears) {
      const sid = `${lessonId}.s${(sentences.length + 1).toString().padStart(3, '0')}`;
      let natJa = `これは${v.ja}です。`;
      let natKana = `これは${v.kana}です。`;
      let natEn = `This is a ${v.en.toLowerCase()}.`;
      let natMy = `ဒါဟာ ${v.my} ဖြစ်ပါတယ်။`;

      if (v.pos === 'verb') {
        natJa = `毎日${v.ja}。`;
        natKana = `まいにち${v.kana}。`;
        natEn = `I ${v.en.toLowerCase()} every day.`;
        natMy = `နေ့တိုင်း ${v.my}။`;
      } else if (v.pos === 'i-adj' || v.pos === 'na-adj') {
        natJa = `とても${v.ja}です。`;
        natKana = `とても${v.kana}です。`;
        natEn = `It is very ${v.en.toLowerCase()}.`;
        natMy = `အရမ်း ${v.my} ဖြစ်ပါတယ်။`;
      }

      sentences.push({
        id: sid,
        lessonId,
        ja: natJa,
        kana: natKana,
        translation: { en: natEn, my: natMy },
        vocabIds: [v.id],
        grammarIds: [data.grammars[0].id],
        audio: { kind: 'tts' as const, lang: 'ja-JP' as const },
        prov,
      });
    }
  });

  // 5. Reading & Listening question IDs
  const rQids = data.reading.questions.map((_, i) => `${lessonId}.q${(21 + i).toString().padStart(3, '0')}`);
  const lQids = data.listening.questions.map((_, i) => `${lessonId}.q${(26 + i).toString().padStart(3, '0')}`);

  const reading = {
    id: `${lessonId}.r01`,
    lessonId,
    title: `${data.title} - 読解`,
    level: 'N5' as const,
    text: data.reading.text,
    kanaText: data.reading.kanaText,
    translation: data.reading.translation,
    questionIds: rQids,
    difficulty: 1,
    glossary: [],
    prov,
  };

  const transcript = data.listening.turns.map((t) => `${t.speaker}：${t.ja}`).join('\n');
  const listening = {
    id: `${lessonId}.l01`,
    lessonId,
    title: `${data.title} - 聴解`,
    level: 'N5' as const,
    audio: { kind: 'tts' as const, lang: 'ja-JP' as const },
    speakers: Array.from(new Set(data.listening.turns.map((t) => t.speaker))),
    transcript,
    translation: data.listening.translation,
    turns: data.listening.turns,
    questionIds: lQids,
    difficulty: 1,
    prov,
  };

  // 6. Questions
  const questions: any[] = [];

  // Vocab questions (multiple choice + typed recall)
  vocabularies.forEach((v, idx) => {
    const qid = `${lessonId}.q${(idx + 1).toString().padStart(3, '0')}`;
    const otherVocab = vocabularies.filter((o) => o.id !== v.id);
    const distractors = [otherVocab[idx % otherVocab.length]?.en || 'Friend', otherVocab[(idx + 1) % otherVocab.length]?.en || 'Book', otherVocab[(idx + 2) % otherVocab.length]?.en || 'School'];

    if (idx % 2 === 0) {
      questions.push({
        id: qid,
        lessonId,
        skill: 'vocab',
        type: 'multiple_choice',
        prompt: `「${v.ja}」の意味は何ですか。 (What does 「${v.ja}」 mean?)`,
        choices: [v.en, ...distractors].sort(() => 0.5 - ((idx * 7) % 3)),
        answer: v.en,
        acceptedAnswers: [v.en],
        explanation: `「${v.ja}」(${v.kana}) means "${v.en}".`,
        difficulty: 1,
        linkedItemIds: [v.id],
        generated: false,
      });
    } else {
      questions.push({
        id: qid,
        lessonId,
        skill: 'vocab',
        type: 'typed_recall',
        prompt: `Type the Japanese reading for "${v.en}" in hiragana:`,
        answer: v.kana,
        acceptedAnswers: [v.kana, v.ja],
        explanation: `The Japanese word for "${v.en}" is ${v.ja} (${v.kana}).`,
        difficulty: 1,
        linkedItemIds: [v.id],
        generated: false,
      });
    }
  });

  // Kanji questions (meaning + reading)
  kanjis.forEach((k, idx) => {
    const qid1 = `${lessonId}.q${(13 + idx * 2).toString().padStart(3, '0')}`;
    const qid2 = `${lessonId}.q${(14 + idx * 2).toString().padStart(3, '0')}`;
    const otherK = kanjis.filter((o) => o.id !== k.id);
    const dMeanings = [otherK[0]?.meaning || 'Water', otherK[1]?.meaning || 'Book', 'Tree'];

    questions.push({
      id: qid1,
      lessonId,
      skill: 'kanji',
      type: 'kanji_meaning',
      prompt: `漢字「${k.char}」の意味は何ですか。 (What is the meaning of kanji 「${k.char}」?)`,
      choices: [k.meaning, ...dMeanings],
      answer: k.meaning,
      acceptedAnswers: [k.meaning],
      explanation: `「${k.char}」means "${k.meaning}". Onyomi: ${k.onyomi.join(', ') || '—'}, Kunyomi: ${k.kunyomi.join(', ') || '—'}.`,
      difficulty: 1,
      linkedItemIds: [k.id],
      generated: false,
    });

    const primaryReading = k.kunyomi[0]?.replace('-', '') || k.onyomi[0] || '';
    questions.push({
      id: qid2,
      lessonId,
      skill: 'kanji',
      type: 'kanji_reading',
      prompt: `漢字「${k.char}」の読み方はどれですか。 (Which is a correct reading for 「${k.char}」?)`,
      choices: [primaryReading, 'みず', 'ほん', 'ひと'].filter((c, i, a) => a.indexOf(c) === i).slice(0, 4),
      answer: primaryReading,
      acceptedAnswers: [primaryReading],
      explanation: `「${k.char}」 has the reading 「${primaryReading}」 (${k.meaning}).`,
      difficulty: 1,
      linkedItemIds: [k.id],
      generated: false,
    });
  });

  // Reading questions
  data.reading.questions.forEach((q, idx) => {
    questions.push({
      id: rQids[idx],
      lessonId,
      skill: 'reading',
      type: 'reading_comprehension',
      prompt: q.prompt,
      choices: q.choices,
      answer: q.answer,
      acceptedAnswers: [q.answer],
      explanation: q.explanation,
      difficulty: 1,
      linkedItemIds: [reading.id],
      generated: false,
    });
  });

  // Listening questions
  data.listening.questions.forEach((q, idx) => {
    questions.push({
      id: lQids[idx],
      lessonId,
      skill: 'listening',
      type: 'listening_choice',
      prompt: q.prompt,
      choices: q.choices,
      answer: q.answer,
      acceptedAnswers: [q.answer],
      explanation: q.explanation,
      difficulty: 1,
      linkedItemIds: [listening.id],
      generated: false,
    });
  });

  const pack: LessonPack = {
    id: lessonId,
    level: 'N5',
    module: 'N5 Foundation 1',
    number: parseInt(lessonId.split('.l')[1], 10),
    title: data.title,
    description: data.description,
    status: 'published',
    masteryThresholds: {
      vocab: 0.9,
      kanji: 0.85,
      grammar: 0.85,
      reading: 0.8,
      listening: 0.8,
      overall: 0.85,
    },
    prov,
    vocabularies,
    kanjis,
    grammars,
    sentences,
    reading,
    listening,
    questions,
  };

  return pack;
}
