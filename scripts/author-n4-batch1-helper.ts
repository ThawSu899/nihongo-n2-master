import * as fs from 'fs';
import * as path from 'path';
import { LessonPack, LessonPackSchema, Question } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

export const prov = {
  source: 'Nihongo N2 Master Editorial Team (Native Review)',
  license: 'CC-BY-4.0',
  status: 'reviewed' as const,
  updatedAt: '2026-10-01T00:00:00Z',
  rev: 2,
};

export interface RawQuestionInput {
  id: string;
  lessonId: string;
  skill: 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' | string;
  type?: string;
  prompt: string;
  choices?: string[];
  options?: string[]; // support options alias for choices
  answerIndex?: number; // support answerIndex to compute answer string
  answer?: string;
  acceptedAnswers?: string[];
  explanation: string | { en: string; my?: string };
  difficulty?: number;
  linkedItemIds?: string[];
}

export function formatQuestion(q: RawQuestionInput): Question {
  const choices = q.choices || q.options;
  let answer = q.answer;
  if (!answer && choices && q.answerIndex !== undefined) {
    answer = choices[q.answerIndex];
  }
  if (!answer) {
    answer = choices ? choices[0] : '';
  }

  const explanationStr = typeof q.explanation === 'string'
    ? q.explanation
    : `${q.explanation.en}${q.explanation.my ? ' [' + q.explanation.my + ']' : ''}`;

  let qType: any = q.type;
  if (!qType) {
    qType = (
      q.skill === 'reading' ? 'reading_comprehension' :
      q.skill === 'listening' ? 'listening_choice' :
      q.skill === 'kanji' ? 'kanji_reading' :
      'multiple_choice'
    );
  } else {
    qType = qType.replace(/-/g, '_');
  }

  return {
    id: q.id,
    lessonId: q.lessonId,
    skill: q.skill as any,
    type: qType,
    prompt: q.prompt,
    choices: choices,
    answer: answer,
    acceptedAnswers: q.acceptedAnswers || (choices ? [answer] : [answer]),
    explanation: explanationStr,
    difficulty: q.difficulty ?? 2,
    linkedItemIds: q.linkedItemIds || [],
    generated: false,
  };
}

export interface LessonData {
  id: string;
  number: number;
  module?: string;
  title: string;
  description: string;
  vocabularies: any[];
  kanjis: any[];
  grammars: any[];
  sentences: any[];
  reading: any;
  listening: any;
  questions: RawQuestionInput[];
}

export function buildLessonPack(data: LessonData): LessonPack {
  const pack: LessonPack = {
    id: data.id,
    level: 'N4',
    module: data.module || (
      data.number <= 12 ? 'N4 Intermediate Grammar 1' :
      data.number <= 24 ? 'N4 Expressions & Relations' :
      'N4 Complex Structures'
    ),
    number: data.number,
    title: data.title,
    description: data.description,
    status: 'published',
    masteryThresholds: {
      vocab: 0.90,
      kanji: 0.85,
      grammar: 0.85,
      reading: 0.80,
      listening: 0.80,
      overall: 0.85,
    },
    vocabularies: data.vocabularies.map(v => ({
      id: v.id,
      lessonId: data.id,
      ja: v.ja,
      kana: v.kana,
      en: v.en,
      my: v.my,
      pos: v.pos || 'noun',
      exampleSentenceId: v.exampleSentenceId || `${data.id}.s001`,
      kanjiIds: v.kanjiIds || [],
      level: 'N4' as const,
      difficulty: v.difficulty ?? 2,
      importance: v.importance ?? 5,
      audio: v.audio || { kind: 'tts', lang: 'ja-JP' },
      prov,
    })),
    kanjis: data.kanjis.map(k => {
      const onyomi = k.onyomi || (k.readings?.on) || [];
      const kunyomi = k.kunyomi || (k.readings?.kun) || [];
      const meaningStr = typeof k.meaning === 'string'
        ? k.meaning
        : (k.meanings?.en || (k.meaning?.en) || 'meaning');
      const exampleVocab = (k.exampleVocab || []).map((ev: any) => ({
        word: ev.word || ev.ja,
        reading: ev.reading || ev.kana,
        meaning: ev.meaning || ev.en,
        preview: ev.preview ?? false,
      }));
      return {
        id: k.id,
        lessonId: data.id,
        char: k.char,
        meaning: meaningStr,
        onyomi,
        kunyomi,
        exampleVocab,
        exampleSentenceIds: k.exampleSentenceIds || [`${data.id}.s001`],
        components: k.components || [],
        strokes: k.strokes || 8,
        level: 'N4' as const,
        difficulty: k.difficulty ?? 2,
        prov,
      };
    }),
    grammars: data.grammars.map(g => ({
      id: g.id,
      lessonId: data.id,
      pattern: g.pattern,
      meaning: typeof g.meaning === 'string' ? g.meaning : (g.title?.en || g.pattern),
      formation: g.formation || '',
      explanation: g.explanation,
      examples: g.examples || [
        { sentenceId: `${data.id}.s001`, note: 'Example 1' },
        { sentenceId: `${data.id}.s002`, note: 'Example 2' },
      ],
      similarGrammarIds: g.similarGrammarIds || [],
      commonMistakes: g.commonMistakes || (g.notes ? [g.notes] : []),
      level: 'N4' as const,
      difficulty: g.difficulty ?? 2,
      prov,
    })),
    sentences: data.sentences.map(s => ({
      id: s.id,
      lessonId: data.id,
      ja: s.ja,
      kana: s.kana,
      translation: s.translation,
      vocabIds: s.vocabIds || [],
      grammarIds: s.grammarIds || [`${data.id}.g001`],
      audio: s.audio || { kind: 'tts', lang: 'ja-JP' },
      prov,
    })),
    reading: {
      id: data.reading.id,
      lessonId: data.id,
      title: data.reading.title,
      level: 'N4' as const,
      text: data.reading.text,
      kanaText: data.reading.kanaText || data.reading.text,
      translation: typeof data.reading.translation === 'string'
        ? data.reading.translation
        : (data.reading.translation?.en || ''),
      questionIds: data.reading.questionIds,
      difficulty: data.reading.difficulty ?? 2,
      glossary: data.reading.glossary || [],
      prov,
    },
    listening: {
      id: data.listening.id,
      lessonId: data.id,
      title: data.listening.title,
      level: 'N4' as const,
      audio: data.listening.audio || { kind: 'tts', lang: 'ja-JP' },
      speakers: data.listening.speakers || ['A', 'B'],
      transcript: data.listening.transcript,
      translation: typeof data.listening.translation === 'string'
        ? data.listening.translation
        : (data.listening.translation?.en || ''),
      turns: (data.listening.turns || []).map((t: any) => ({
        speaker: t.speaker || 'Speaker',
        ja: t.ja || t.text || '',
        kana: t.kana || t.text || '',
        en: t.en || t.translation || '',
      })),
      questionIds: data.listening.questionIds,
      difficulty: data.listening.difficulty ?? 2,
      prov,
    },
    questions: data.questions.map(q => formatQuestion(q)),
    prov,
  };

  const parsed = LessonPackSchema.safeParse(pack);
  if (!parsed.success) {
    console.error(`Validation error in ${data.id}:`, parsed.error.issues);
    throw new Error(`Invalid schema for ${data.id}`);
  }

  const lintResult = lintLessonPack(pack);
  if (lintResult.errors.length > 0) {
    console.error(`Linter errors in ${data.id}:`, lintResult.errors);
    throw new Error(`Linter errors in ${data.id}`);
  }

  return pack;
}
