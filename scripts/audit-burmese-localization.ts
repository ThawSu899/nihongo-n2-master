import fs from 'fs';
import path from 'path';

interface PackSummary {
  id: string;
  level: string;
  missingVocabMy: number;
  totalVocab: number;
  missingKanjiMy: number;
  totalKanji: number;
  missingGrammarMy: number;
  totalGrammar: number;
  missingSentenceMy: number;
  totalSentence: number;
  readingHasMy: boolean;
  listeningHasMy: boolean;
  questionsTotal: number;
  questionsMissingPromptMy: number;
  questionsMissingExplanationMy: number;
}

const packsDir = path.resolve('content/packs');
const levels = ['n5', 'n4', 'n3', 'n2'];
const results: PackSummary[] = [];

for (const level of levels) {
  const dir = path.join(packsDir, level);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const pack = JSON.parse(raw);

    let missingVocabMy = 0;
    for (const v of pack.vocabularies || []) {
      if (!v.my && !v.meaningMy && !v.meaningMyanmar && !v.myanmar) missingVocabMy++;
    }

    let missingKanjiMy = 0;
    for (const k of pack.kanjis || []) {
      if (!k.meaningMy && !k.meaningMyanmar && !k.myanmar) missingKanjiMy++;
    }

    let missingGrammarMy = 0;
    for (const g of pack.grammars || []) {
      if (!g.explanation?.my && !g.nuanceExplanationMy && !g.meaningMy) missingGrammarMy++;
    }

    let missingSentenceMy = 0;
    for (const s of pack.sentences || []) {
      if (!s.translation?.my && !s.translationMy) missingSentenceMy++;
    }

    const readingHasMy = Boolean(pack.reading?.translationMy || /[\u1000-\u109F]/.test(pack.reading?.translation || ''));
    const listeningHasMy = Boolean(
      pack.listening?.translationMy ||
      /[\u1000-\u109F]/.test(pack.listening?.translation || '') ||
      (pack.listening?.turns && pack.listening.turns.some((t: any) => t.my || t.myanmar || t.translationMy))
    );

    let questionsMissingPromptMy = 0;
    let questionsMissingExplanationMy = 0;
    for (const q of pack.questions || []) {
      if (!q.promptMy && !/[\u1000-\u109F]/.test(q.prompt || '')) questionsMissingPromptMy++;
      if (!q.explanationMy && !/[\u1000-\u109F]/.test(q.explanation || '')) questionsMissingExplanationMy++;
    }

    results.push({
      id: pack.id,
      level: pack.level,
      totalVocab: pack.vocabularies?.length || 0,
      missingVocabMy,
      totalKanji: pack.kanjis?.length || 0,
      missingKanjiMy,
      totalGrammar: pack.grammars?.length || 0,
      missingGrammarMy,
      totalSentence: pack.sentences?.length || 0,
      missingSentenceMy,
      readingHasMy,
      listeningHasMy,
      questionsTotal: pack.questions?.length || 0,
      questionsMissingPromptMy,
      questionsMissingExplanationMy,
    });
  }
}

console.log(`Total packs scanned: ${results.length}`);
const summary = {
  totalVocab: results.reduce((acc, r) => acc + r.totalVocab, 0),
  missingVocabMy: results.reduce((acc, r) => acc + r.missingVocabMy, 0),
  totalKanji: results.reduce((acc, r) => acc + r.totalKanji, 0),
  missingKanjiMy: results.reduce((acc, r) => acc + r.missingKanjiMy, 0),
  totalGrammar: results.reduce((acc, r) => acc + r.totalGrammar, 0),
  missingGrammarMy: results.reduce((acc, r) => acc + r.missingGrammarMy, 0),
  totalSentence: results.reduce((acc, r) => acc + r.totalSentence, 0),
  missingSentenceMy: results.reduce((acc, r) => acc + r.missingSentenceMy, 0),
  readingWithoutMy: results.filter(r => !r.readingHasMy).length,
  listeningWithoutMy: results.filter(r => !r.listeningHasMy).length,
  totalQuestions: results.reduce((acc, r) => acc + r.questionsTotal, 0),
  questionsMissingPromptMy: results.reduce((acc, r) => acc + r.questionsMissingPromptMy, 0),
  questionsMissingExplanationMy: results.reduce((acc, r) => acc + r.questionsMissingExplanationMy, 0),
};

console.log('Summary:', JSON.stringify(summary, null, 2));

const sampleMissing = results.filter(r => r.missingVocabMy > 0 || r.missingKanjiMy > 0 || r.missingGrammarMy > 0).slice(0, 5);
console.log('Sample missing:', JSON.stringify(sampleMissing, null, 2));
