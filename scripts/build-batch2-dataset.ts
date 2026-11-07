import * as fs from 'fs';
import * as path from 'path';

console.log('Generating N2 Batch 2 lesson datasets (n2.l12 to n2.l20)...');

interface LessonSpec {
  num: number;
  title: string;
  desc: string;
  kanjis: Array<{
    char: string;
    meaning: string;
    my: string;
    onyomi: string[];
    kunyomi: string[];
    comp: string[];
    strokes: number;
    vocab: Array<{ word: string; reading: string; meaning: string; my: string; preview: boolean }>;
  }>;
  grammars: Array<{
    pattern: string;
    meaning: string;
    my: string;
    formation: string;
    enExp: string;
    myExp: string;
    cloze: string;
    clozeTarget: string;
    clozeHint: string;
    synonyms: string[];
    nuanceMy: string;
  }>;
  vocabs: Array<{ ja: string; kana: string; en: string; my: string; pos: string; kidx?: number }>;
  sentences: Array<{ ja: string; kana: string; en: string; my: string; vIdxs: number[]; gIdxs: number[] }>;
  reading: {
    title: string;
    text: string;
    kana: string;
    my: string;
    glossary: Array<{ term: string; reading: string; meaning: string }>;
    qPrompts: Array<{ p: string; choices: string[]; a: string; exp: string; myExp: string }>;
  };
  listening: {
    title: string;
    speakers: [string, string];
    dialogue: Array<{ spk: string; ja: string; kana: string; en: string; my: string }>;
    qPrompts: Array<{ p: string; choices: string[]; a: string; exp: string; myExp: string }>;
  };
  quizPrompts: {
    vPrompts: Array<{ p: string; choices: string[]; a: string; exp: string; myExp: string; vIdx: number }>;
    kPrompts: Array<{ p: string; choices: string[]; a: string; exp: string; myExp: string; kIdx: number; type: string }>;
    gPrompts: Array<{ p: string; choices: string[]; a: string; exp: string; myExp: string; gIdx: number }>;
  };
}

// We will define specs and run generation.
export type { LessonSpec };
