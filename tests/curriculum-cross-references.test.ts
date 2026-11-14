import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LessonPack, Grammar } from '../src/domain/models/types';

interface BrokenReferenceReport {
  packId: string;
  field: string;
  sourceId: string;
  targetId: string;
}

interface BrokenSimilarGrammarReport {
  sourceLesson: string;
  sourceGrammarId: string;
  missingTargetId: string;
}

describe('Curriculum Cross-References & Referential Integrity Suite', () => {
  const packsBaseDir = path.resolve(process.cwd(), 'content', 'packs');
  const levels = ['n5', 'n4', 'n3', 'n2'];

  function loadAllPacks(): { file: string; pack: LessonPack }[] {
    const packs: { file: string; pack: LessonPack }[] = [];
    for (const lvl of levels) {
      const lvlDir = path.join(packsBaseDir, lvl);
      if (!fs.existsSync(lvlDir)) continue;
      for (const fileName of fs.readdirSync(lvlDir)) {
        if (fileName.endsWith('.json')) {
          const filePath = path.join(lvlDir, fileName);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const pack = JSON.parse(raw) as LessonPack;
          packs.push({ file: `${lvl}/${fileName}`, pack });
        }
      }
    }
    return packs;
  }

  const allPacksWithMeta = loadAllPacks();

  // Global index of all curriculum grammar items across all 174 lesson packs
  const globalGrammarMap = new Map<string, { packId: string; grammar: Grammar }>();
  for (const { pack } of allPacksWithMeta) {
    for (const g of pack.grammars || []) {
      globalGrammarMap.set(g.id, { packId: pack.id, grammar: g });
    }
  }

  describe('Part 1 Regression Tests: Confirmed Broken References & Semantic Integrity', () => {
    it('1. verifies n5.l22.v012 (ううん) exampleSentenceId links semantically to n5.l22.s010 and contains v012 in vocabIds', () => {
      const filePath = path.join(packsBaseDir, 'n5', 'n5.l22.json');
      const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LessonPack;
      const vocab = pack.vocabularies.find((v) => v.id === 'n5.l22.v012');

      expect(vocab, 'Vocabulary n5.l22.v012 must exist').toBeDefined();
      expect(vocab?.ja).toBe('ううん');
      expect(vocab?.exampleSentenceId).toBe('n5.l22.s010');
      expect(vocab?.exampleSentenceId).not.toBe('n5.l22.s009_2');
      expect(vocab?.exampleSentenceId).not.toBe('n5.l22.s009'); // s009 is "drinking cold water", unrelated to ううん

      const targetSentence = pack.sentences.find((s) => s.id === 'n5.l22.s010');
      expect(targetSentence, 'Sentence n5.l22.s010 must exist in pack sentences').toBeDefined();
      expect(targetSentence?.vocabIds, 'Target sentence s010 must reference n5.l22.v012 in vocabIds').toContain('n5.l22.v012');
      expect(targetSentence?.ja, 'Target sentence s010 Japanese text must contain ううん').toContain('ううん');
      expect(targetSentence?.translation?.en).toBe('"Did you already finish the homework?" "No, not yet."');
    });

    it('2-6. verifies n2.l06 listening questions q026 through q030 link to n2.l06.l01 (not n2.l06.l001)', () => {
      const filePath = path.join(packsBaseDir, 'n2', 'n2.l06.json');
      const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LessonPack;
      expect(pack.listening, 'Listening passage must exist in n2.l06').toBeDefined();
      expect(pack.listening.id).toBe('n2.l06.l01');

      const targetQuestions = ['n2.l06.q026', 'n2.l06.q027', 'n2.l06.q028', 'n2.l06.q029', 'n2.l06.q030'];
      for (const qid of targetQuestions) {
        const question = pack.questions.find((q) => q.id === qid);
        expect(question, `Question ${qid} must exist in n2.l06`).toBeDefined();
        expect(question?.linkedItemIds).toContain('n2.l06.l01');
        expect(question?.linkedItemIds).not.toContain('n2.l06.l001');
      }
    });

    it('7. verifies n2.l55.q020 linkedItemIds points to n2.l55.g003 (not n2.l55.gNaN)', () => {
      const filePath = path.join(packsBaseDir, 'n2', 'n2.l55.json');
      const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LessonPack;

      const question = pack.questions.find((q) => q.id === 'n2.l55.q020');
      expect(question, 'Question n2.l55.q020 must exist').toBeDefined();
      expect(question?.linkedItemIds).toContain('n2.l55.g003');
      expect(question?.linkedItemIds).not.toContain('n2.l55.gNaN');

      const grammar = pack.grammars.find((g) => g.id === 'n2.l55.g003');
      expect(grammar, 'Target grammar n2.l55.g003 must exist in n2.l55').toBeDefined();
      expect(grammar?.pattern).toContain('〜にあって');
    });
  });

  describe('Part 2 Global Verification: All 174 Lesson Packs Internal Cross-References', () => {
    it('verifies that all 174 lesson packs are loaded and validated', () => {
      expect(allPacksWithMeta).toHaveLength(174);
    });

    it('verifies zero broken cross-references across vocabulary, kanji, grammar, reading, listening and questions', () => {
      const brokenRefs: BrokenReferenceReport[] = [];

      for (const { pack } of allPacksWithMeta) {
        const sentenceIds = new Set(pack.sentences.map((s) => s.id));
        const vocabIds = new Set(pack.vocabularies.map((v) => v.id));
        const kanjiIds = new Set(pack.kanjis.map((k) => k.id));
        const grammarIds = new Set(pack.grammars.map((g) => g.id));
        const questionIds = new Set(pack.questions.map((q) => q.id));
        const readingIds = new Set(pack.reading ? [pack.reading.id] : []);
        const listeningIds = new Set(pack.listening ? [pack.listening.id] : []);

        const allDeclaredItemIds = new Set([
          ...sentenceIds,
          ...vocabIds,
          ...kanjiIds,
          ...grammarIds,
          ...questionIds,
          ...readingIds,
          ...listeningIds,
        ]);

        // 1. Vocabulary -> Sentence (exampleSentenceId)
        for (const vocab of pack.vocabularies) {
          if (vocab.exampleSentenceId && !sentenceIds.has(vocab.exampleSentenceId)) {
            brokenRefs.push({
              packId: pack.id,
              field: 'vocabularies.exampleSentenceId',
              sourceId: vocab.id,
              targetId: vocab.exampleSentenceId,
            });
          }
          // Vocabulary -> Kanji (kanjiIds)
          for (const kid of vocab.kanjiIds || []) {
            if (!kanjiIds.has(kid)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'vocabularies.kanjiIds',
                sourceId: vocab.id,
                targetId: kid,
              });
            }
          }
        }

        // 2. Kanji -> Sentences (exampleSentenceIds)
        for (const kanji of pack.kanjis) {
          for (const sId of kanji.exampleSentenceIds || []) {
            if (!sentenceIds.has(sId)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'kanjis.exampleSentenceIds',
                sourceId: kanji.id,
                targetId: sId,
              });
            }
          }
        }

        // 3. Grammar -> Sentences (examples[].sentenceId)
        for (const grammar of pack.grammars) {
          for (const ex of grammar.examples || []) {
            if (ex.sentenceId && !sentenceIds.has(ex.sentenceId)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'grammars.examples.sentenceId',
                sourceId: grammar.id,
                targetId: ex.sentenceId,
              });
            }
          }
          // Grammar -> Similar Grammars (similarGrammarIds: validated against global curriculum contract)
          for (const simId of grammar.similarGrammarIds || []) {
            if (!globalGrammarMap.has(simId)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'grammars.similarGrammarIds',
                sourceId: grammar.id,
                targetId: simId,
              });
            }
          }
        }

        // 4. Sentences -> Vocab & Grammar
        for (const sent of pack.sentences) {
          for (const vid of sent.vocabIds || []) {
            if (!vocabIds.has(vid)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'sentences.vocabIds',
                sourceId: sent.id,
                targetId: vid,
              });
            }
          }
          for (const gid of sent.grammarIds || []) {
            if (!grammarIds.has(gid)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'sentences.grammarIds',
                sourceId: sent.id,
                targetId: gid,
              });
            }
          }
        }

        // 5. Reading -> Questions
        if (pack.reading) {
          for (const qid of pack.reading.questionIds || []) {
            if (!questionIds.has(qid)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'reading.questionIds',
                sourceId: pack.reading.id,
                targetId: qid,
              });
            }
          }
        }

        // 6. Listening -> Questions
        if (pack.listening) {
          for (const qid of pack.listening.questionIds || []) {
            if (!questionIds.has(qid)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'listening.questionIds',
                sourceId: pack.listening.id,
                targetId: qid,
              });
            }
          }
        }

        // 7. Questions -> Linked Items
        for (const q of pack.questions) {
          for (const itemId of q.linkedItemIds || []) {
            if (!allDeclaredItemIds.has(itemId)) {
              brokenRefs.push({
                packId: pack.id,
                field: 'questions.linkedItemIds',
                sourceId: q.id,
                targetId: itemId,
              });
            }
          }
        }
      }

      if (brokenRefs.length > 0) {
        const errorDetails = brokenRefs
          .map(
            (b) =>
              `Lesson [${b.packId}] Field [${b.field}] Source [${b.sourceId}] -> Missing Target [${b.targetId}]`
          )
          .join('\n');
        expect.fail(`Found ${brokenRefs.length} broken cross-reference(s):\n${errorDetails}`);
      }

      expect(brokenRefs).toEqual([]);
    });

    it('verifies all GrammarSchema.similarGrammarIds across all 174 packs resolve to authentic grammar items in the curriculum', () => {
      expect(globalGrammarMap.size).toBe(427);

      const brokenSimilarRefs: BrokenSimilarGrammarReport[] = [];
      let totalSimilarChecked = 0;

      for (const { pack } of allPacksWithMeta) {
        for (const grammar of pack.grammars || []) {
          for (const targetId of grammar.similarGrammarIds || []) {
            totalSimilarChecked++;
            if (!globalGrammarMap.has(targetId)) {
              brokenSimilarRefs.push({
                sourceLesson: pack.id,
                sourceGrammarId: grammar.id,
                missingTargetId: targetId,
              });
            }
          }
        }
      }

      expect(totalSimilarChecked).toBe(423);

      if (brokenSimilarRefs.length > 0) {
        const errorDetails = brokenSimilarRefs
          .map(
            (b) =>
              `Lesson [${b.sourceLesson}] Source Grammar [${b.sourceGrammarId}] -> Missing Target Grammar [${b.missingTargetId}]`
          )
          .join('\n');
        expect.fail(
          `Found ${brokenSimilarRefs.length} broken similarGrammarIds reference(s):\n${errorDetails}`
        );
      }

      expect(brokenSimilarRefs).toEqual([]);
    });
  });
});
