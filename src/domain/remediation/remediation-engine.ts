import {
  LessonPack,
  Question,
  QuestionSkill,
  RemediationPlan,
  RemediationExercise,
} from '../models/types';
import { Clock } from '../common/clock';
import { fisherYatesShuffle } from '../assessment/shuffler';

export class RemediationEngine {
  constructor(private clock: Clock) {}

  /**
   * Generates a remediation plan when a test attempt fails or has weak skills.
   * Enforces at least 2 distinct exposures per failed item via different exercise types.
   */
  generateRemediationPlan(
    pack: LessonPack,
    failedQuestionIds: string[],
    weakSkills: QuestionSkill[],
    attemptId: string
  ): RemediationPlan {
    const failedQuestions = pack.questions.filter((q) => failedQuestionIds.includes(q.id));
    const failedItemIds = Array.from(new Set(failedQuestions.flatMap((q) => q.linkedItemIds)));

    const exercises: RemediationExercise[] = [];

    // For each failed item, generate >= 2 exposures using diverse exercise types
    failedItemIds.forEach((itemId) => {
      // Check if it's vocabulary
      const vocab = pack.vocabularies.find((v) => v.id === itemId);
      if (vocab) {
        // Exposure 1: Meaning match / Multiple choice
        const distractors = pack.vocabularies
          .filter((v) => v.id !== vocab.id)
          .slice(0, 3)
          .map((v) => v.en);
        const choices = fisherYatesShuffle([...distractors, vocab.en]);

        exercises.push({
          itemId: vocab.id,
          itemType: 'vocab',
          exerciseType: 'meaning_match',
          prompt: `Select the correct meaning for 「${vocab.ja}」:`,
          answer: vocab.en,
          choices,
          explanation: `${vocab.ja} (${vocab.kana}) means "${vocab.en}".`,
          completed: false,
        });

        // Exposure 2: Typed Production (No-choice recall)
        exercises.push({
          itemId: vocab.id,
          itemType: 'vocab',
          exerciseType: 'typed_production',
          prompt: `Type the Japanese word for "${vocab.en}":`,
          answer: vocab.ja,
          explanation: `The Japanese word is ${vocab.ja} (${vocab.kana}).`,
          completed: false,
        });
      }

      // Check if it's kanji
      const kanji = pack.kanjis.find((k) => k.id === itemId);
      if (kanji) {
        // Exposure 1: Reading in compound context
        exercises.push({
          itemId: kanji.id,
          itemType: 'kanji',
          exerciseType: 'multiple_choice',
          prompt: `What is the reading of 「${kanji.char}」 in ${kanji.exampleVocab[0]?.word || kanji.char}?`,
          answer: kanji.onyomi[0] || kanji.kunyomi[0],
          choices: fisherYatesShuffle([
            kanji.onyomi[0] || kanji.kunyomi[0],
            'せい',
            'せん',
            'がく',
          ].slice(0, 4)),
          explanation: `In this compound, 「${kanji.char}」 is read as ${kanji.onyomi[0] || kanji.kunyomi[0]}.`,
          completed: false,
        });

        // Exposure 2: Meaning recall
        exercises.push({
          itemId: kanji.id,
          itemType: 'kanji',
          exerciseType: 'typed_production',
          prompt: `Type the reading for 「${kanji.exampleVocab[0]?.word || kanji.char}」:`,
          answer: kanji.exampleVocab[0]?.reading || kanji.onyomi[0],
          explanation: `${kanji.char} means "${kanji.meaning}".`,
          completed: false,
        });
      }

      // Check if it's grammar
      const grammar = pack.grammars.find((g) => g.id === itemId);
      if (grammar) {
        // Exposure 1: Cloze particle / copula completion
        exercises.push({
          itemId: grammar.id,
          itemType: 'grammar',
          exerciseType: 'cloze',
          prompt: `Complete the pattern: ${grammar.pattern.replace(/[XY]/g, '___')}`,
          answer: grammar.pattern,
          explanation: `${grammar.pattern}: ${grammar.explanation.en}`,
          completed: false,
        });

        // Exposure 2: Multiple choice error correction
        exercises.push({
          itemId: grammar.id,
          itemType: 'grammar',
          exerciseType: 'multiple_choice',
          prompt: `Which formation correctly represents 「${grammar.meaning}」?`,
          answer: grammar.formation,
          choices: fisherYatesShuffle([
            grammar.formation,
            grammar.formation.replace('は', 'の'),
            grammar.formation.replace('です', 'だ'),
          ].slice(0, 3)),
          explanation: `Formation: ${grammar.formation}`,
          completed: false,
        });
      }
    });

    return {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      lessonId: pack.id,
      attemptId,
      createdAt: this.clock.nowIso(),
      weakSkills,
      failedItemIds,
      exercises,
      status: 'pending',
      retestRequired: true,
    };
  }

  /**
   * Draw fresh question bank questions for a retest to avoid repeating identical items
   */
  drawFreshRetestQuestions(
    pack: LessonPack,
    previouslyAskedQuestionIds: string[],
    targetCountPerSkill: Record<QuestionSkill, number>
  ): Question[] {
    const selected: Question[] = [];
    const skills: QuestionSkill[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening'];

    skills.forEach((skill) => {
      const needed = targetCountPerSkill[skill] || 5;
      const available = pack.questions.filter((q) => q.skill === skill);

      // Prioritize questions not in previouslyAskedQuestionIds
      const freshQuestions = available.filter((q) => !previouslyAskedQuestionIds.includes(q.id));
      const repeatedQuestions = available.filter((q) => previouslyAskedQuestionIds.includes(q.id));

      const pool = [...freshQuestions, ...repeatedQuestions];
      selected.push(...pool.slice(0, needed));
    });

    return selected;
  }
}
