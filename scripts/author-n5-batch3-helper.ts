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
  skill: 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening';
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
    skill: q.skill,
    type: qType,
    prompt: q.prompt,
    choices: choices,
    answer: answer,
    acceptedAnswers: q.acceptedAnswers || (choices ? [answer] : [answer]),
    explanation: explanationStr,
    difficulty: q.difficulty ?? 1,
    linkedItemIds: q.linkedItemIds || [],
    generated: false,
  };
}

export interface LessonData {
  id: string;
  number: number;
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
    level: 'N5',
    module: 'N5 Communication & Integration',
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
    vocabularies: data.vocabularies.map(v => ({ ...v, level: 'N5', prov })),
    kanjis: data.kanjis.map(k => ({ ...k, level: 'N5', prov })),
    grammars: data.grammars.map(g => ({ ...g, level: 'N5', prov })),
    sentences: data.sentences.map(s => ({ ...s, prov })),
    reading: { ...data.reading, level: 'N5', prov },
    listening: { ...data.listening, level: 'N5', prov },
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
