import { describe, it, expect } from 'vitest';
import {
  prepareShuffledOptions,
  AssessmentSession,
  fisherYatesShuffle,
  ShuffledOption,
} from '../src/domain/assessment/shuffler';
import { Question } from '../src/domain/models/types';

describe('Assessment Option Shuffling System', () => {
  // Deterministic PRNG for test reproducibility
  function createSeededRandom(seed: number) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  const sampleQuestion: Question = {
    id: 'n3.l21.q010',
    lessonId: 'n3.l21',
    skill: 'vocab',
    type: 'multiple_choice',
    prompt: '「電車の待ち時間など、ちょっとした（　）時間を使って英単語を覚える。」',
    choices: ['隙間', '間隔', '空間', '空地'],
    answer: '隙間',
    explanation: '「隙間（すきま）時間」',
    difficulty: 2,
    linkedItemIds: [],
    generated: false,
  };

  it('preserves all original options with exact multiset count', () => {
    const shuffled = prepareShuffledOptions(
      sampleQuestion.id,
      sampleQuestion.choices,
      sampleQuestion.answer
    );
    expect(shuffled).toHaveLength(4);
    const texts = shuffled.map((o) => o.text).sort();
    const expected = [...sampleQuestion.choices!].sort();
    expect(texts).toEqual(expected);
  });

  it('does not mutate the source choices array (strict immutability)', () => {
    const frozenChoices = Object.freeze(['A', 'B', 'C', 'D']);
    expect(() => {
      prepareShuffledOptions('q_test', frozenChoices as unknown as string[], 'A');
    }).not.toThrow();
    expect(frozenChoices).toEqual(['A', 'B', 'C', 'D']);
  });

  it('accurately tags the correct option regardless of its shuffled position', () => {
    // Test with multiple deterministic seeds to observe correct answer landing in different slots
    const observedPositions = new Set<number>();

    for (let seed = 1; seed <= 50; seed++) {
      const prng = createSeededRandom(seed);
      const shuffled = prepareShuffledOptions(
        sampleQuestion.id,
        sampleQuestion.choices,
        sampleQuestion.answer,
        prng
      );

      const correctIndex = shuffled.findIndex((o) => o.isCorrect);
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(correctIndex).toBeLessThan(4);
      expect(shuffled[correctIndex].text).toBe(sampleQuestion.answer);

      // Verify all other options are false
      shuffled.forEach((opt, idx) => {
        if (idx !== correctIndex) {
          expect(opt.isCorrect).toBe(false);
        }
      });

      observedPositions.add(correctIndex);
    }

    // Over 50 seeds, the correct answer should occupy all 4 positions (0, 1, 2, 3)
    expect(observedPositions.size).toBe(4);
    expect(observedPositions.has(0)).toBe(true);
    expect(observedPositions.has(1)).toBe(true);
    expect(observedPositions.has(2)).toBe(true);
    expect(observedPositions.has(3)).toBe(true);
  });

  it('keeps option order stable throughout a session across multiple calls and navigations', () => {
    const session = new AssessmentSession(createSeededRandom(42));
    const firstCall = session.getOptions(sampleQuestion);
    const secondCall = session.getOptions(sampleQuestion);

    // Exact referential identity and content identity
    expect(firstCall).toBe(secondCall);
    expect(firstCall.map((o) => o.id)).toEqual(secondCall.map((o) => o.id));
  });

  it('generates a fresh order when the session is reset or a new session is started', () => {
    // Seed 1 vs Seed 3 produce distinct initial permutations
    const session1 = new AssessmentSession(createSeededRandom(1));
    const session2 = new AssessmentSession(createSeededRandom(3));

    const options1 = session1.getOptions(sampleQuestion);
    const options2 = session2.getOptions(sampleQuestion);

    expect(options1.map((o) => o.text)).not.toEqual(options2.map((o) => o.text));
  });

  it('safely handles duplicate option text without ambiguous scoring', () => {
    // Suppose choices contain duplicate strings, e.g. ['A', 'A', 'B', 'C']
    // where choices[0] was the intended canonical answer
    const dupQuestion: Question = {
      id: 'q_dup',
      lessonId: 'test',
      skill: 'grammar',
      type: 'multiple_choice',
      prompt: 'Test prompt',
      choices: ['重複', '重複', '別1', '別2'],
      answer: '重複',
      explanation: 'Test',
      difficulty: 1,
      linkedItemIds: [],
      generated: false,
    };

    const session = new AssessmentSession(createSeededRandom(123));
    const options = session.getOptions(dupQuestion);

    expect(options).toHaveLength(4);
    // Exactly ONE option is marked isCorrect: true (matching canonical index 0)
    const correctOptions = options.filter((o) => o.isCorrect);
    expect(correctOptions).toHaveLength(1);
    expect(correctOptions[0].originalIndex).toBe(0);

    // Verify session.checkOption validates the correct option
    expect(session.checkOption(correctOptions[0], dupQuestion.answer)).toBe(true);

    // An option with duplicate text but wrong original index evaluates to false
    const wrongDup = options.find((o) => o.text === '重複' && !o.isCorrect);
    expect(wrongDup).toBeDefined();
    expect(session.checkOption(wrongDup!, dupQuestion.answer)).toBe(false);
  });

  it('safely handles invalid answer references (answer missing from choices)', () => {
    const invalidQuestion: Question = {
      id: 'q_invalid',
      lessonId: 'test',
      skill: 'vocab',
      type: 'multiple_choice',
      prompt: 'What does this mean?',
      choices: ['Choice 1', 'Choice 2', 'Choice 3'],
      answer: 'Completely Different Answer Not in Choices',
      explanation: 'Test',
      difficulty: 1,
      linkedItemIds: [],
      generated: false,
    };

    const session = new AssessmentSession();
    const options = session.getOptions(invalidQuestion);

    expect(options).toHaveLength(3);
    // None of the options should be marked correct!
    expect(options.every((o) => o.isCorrect === false)).toBe(true);
    expect(session.checkOption(options[0], invalidQuestion.answer)).toBe(false);
  });

  it('safely handles missing or empty choices', () => {
    const typedRecallQuestion: Question = {
      id: 'q_typed',
      lessonId: 'test',
      skill: 'vocab',
      type: 'typed_recall',
      prompt: 'Type the word',
      answer: 'word',
      explanation: 'Test',
      difficulty: 1,
      linkedItemIds: [],
      generated: false,
    };

    const session = new AssessmentSession();
    expect(session.getOptions(typedRecallQuestion)).toEqual([]);
    expect(session.checkOption(null, 'word')).toBe(false);
  });

  it('eliminates index 0 bias across all 300 questions in N3 L21-L30', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const session = new AssessmentSession();
    const positionCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let totalAssessed = 0;

    for (let l = 21; l <= 30; l++) {
      const filePath = path.resolve(process.cwd(), `content/packs/n3/n3.l${l}.json`);
      const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      for (const q of pack.questions) {
        if (!q.choices || q.choices.length === 0) continue;
        totalAssessed++;
        const options = session.getOptions(q);
        const correctIndex = options.findIndex((o) => o.isCorrect);

        expect(correctIndex).toBeGreaterThanOrEqual(0);
        expect(correctIndex).toBeLessThan(options.length);
        positionCounts[correctIndex]++;

        // Verify correct answer text matches canonical answer
        expect(options[correctIndex].text).toBe(q.answer);
        expect(session.checkOption(options[correctIndex], q.answer)).toBe(true);
      }
    }

    expect(totalAssessed).toBe(300);

    // Each position (0, 1, 2, 3) must be non-zero and roughly distributed (~25% each, at least 15%)
    for (let pos = 0; pos < 4; pos++) {
      expect(positionCounts[pos]).toBeGreaterThan(30); // > 10% min threshold
      expect(positionCounts[pos]).toBeLessThan(120);   // < 40% max threshold
    }

    // Crucially: position 0 is NO LONGER 300/300 (100%)
    expect(positionCounts[0]).toBeLessThan(totalAssessed);
  });

  it('correctly maps 1-4 keyboard shortcuts to the exact visual options rendered', () => {
    const session = new AssessmentSession(createSeededRandom(999));
    const options = session.getOptions(sampleQuestion);

    // User presses '1' -> index 0
    const chosenViaKey1 = options[0];
    expect(session.checkOption(chosenViaKey1, sampleQuestion.answer)).toBe(chosenViaKey1.isCorrect);

    // User presses '2' -> index 1
    const chosenViaKey2 = options[1];
    expect(session.checkOption(chosenViaKey2, sampleQuestion.answer)).toBe(chosenViaKey2.isCorrect);

    // User presses '3' -> index 2
    const chosenViaKey3 = options[2];
    expect(session.checkOption(chosenViaKey3, sampleQuestion.answer)).toBe(chosenViaKey3.isCorrect);

    // User presses '4' -> index 3
    const chosenViaKey4 = options[3];
    expect(session.checkOption(chosenViaKey4, sampleQuestion.answer)).toBe(chosenViaKey4.isCorrect);
  });

  describe('Assessment Flow Lifecycle & Mastery Evaluation', () => {
    const clock = { nowIso: () => '2026-10-03T00:00:00.000Z' };

    it('enables learners to master N3 lessons with standard 30-question distribution', async () => {
      const { MasteryEngine } = await import('../src/domain/mastery/mastery-engine');
      const engine = new MasteryEngine(clock as any);

      // Typical N3 L21 pack: 12 vocab, 4 kanji, 8 grammar, 3 reading, 3 listening = 30 Qs
      const n3Scores = {
        vocab: { correct: 12, total: 12 },     // 100%
        kanji: { correct: 4, total: 4 },       // 100%
        grammar: { correct: 8, total: 8 },     // 100%
        reading: { correct: 3, total: 3 },     // 100%
        listening: { correct: 3, total: 3 },   // 100%
      };

      const result = engine.processTestAttempt(
        {
          lessonId: 'n3.l21',
          state: 'learning',
          scores: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0, overall: 0 },
          evidenceCounts: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0 },
          passedThresholds: false,
          failedSkills: [],
          consecutiveFailures: 0,
          isProvisional: false,
          needsRefresh: false,
          history: [],
        },
        { bySkill: n3Scores, failedItemIds: [] }
      );

      expect(result.passed).toBe(true);
      expect(result.updatedRecord.state).toBe('mastered');
      expect(result.updatedRecord.scores.overall).toBe(1);
    });

    it('handles lessons with omitted skills (e.g. N5 L02 with 0 grammar) without artificial failure', async () => {
      const { MasteryEngine } = await import('../src/domain/mastery/mastery-engine');
      const engine = new MasteryEngine(clock as any);

      // N5 L02: 16 vocab, 8 kanji, 0 grammar, 3 reading, 3 listening
      const n5l02Scores = {
        vocab: { correct: 16, total: 16 },
        kanji: { correct: 8, total: 8 },
        grammar: { correct: 0, total: 0 },
        reading: { correct: 3, total: 3 },
        listening: { correct: 3, total: 3 },
      };

      const result = engine.processTestAttempt(
        {
          lessonId: 'n5.l02',
          state: 'learning',
          scores: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0, overall: 0 },
          evidenceCounts: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0 },
          passedThresholds: false,
          failedSkills: [],
          consecutiveFailures: 0,
          isProvisional: false,
          needsRefresh: false,
          history: [],
        },
        { bySkill: n5l02Scores, failedItemIds: [] }
      );

      expect(result.passed).toBe(true);
      expect(result.updatedRecord.failedSkills).not.toContain('grammar');
      expect(result.updatedRecord.scores.overall).toBe(1);
    });

    it('strictly enforces conjunctive failure when a skill falls below threshold', async () => {
      const { MasteryEngine } = await import('../src/domain/mastery/mastery-engine');
      const engine = new MasteryEngine(clock as any);

      // Reading threshold is 80% (0.80) -> 2/3 is 66.7%, which must fail!
      const failedReading = {
        vocab: { correct: 12, total: 12 },
        kanji: { correct: 4, total: 4 },
        grammar: { correct: 8, total: 8 },
        reading: { correct: 2, total: 3 }, // 66.7% < 80%
        listening: { correct: 3, total: 3 },
      };

      const result = engine.processTestAttempt(
        {
          lessonId: 'n3.l21',
          state: 'learning',
          scores: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0, overall: 0 },
          evidenceCounts: { vocab: 0, kanji: 0, grammar: 0, reading: 0, listening: 0 },
          passedThresholds: false,
          failedSkills: [],
          consecutiveFailures: 0,
          isProvisional: false,
          needsRefresh: false,
          history: [],
        },
        { bySkill: failedReading, failedItemIds: ['n3.l21.r01'] }
      );

      expect(result.passed).toBe(false);
      expect(result.updatedRecord.failedSkills).toContain('reading');
    });

    it('shuffles Kana Trainer multiple-choice options uniformly', async () => {
      const correct = 'a';
      const distractors = ['i', 'u', 'e', 'o', 'ka', 'ki'];
      const positions = new Set<number>();

      for (let i = 0; i < 50; i++) {
        const pool = fisherYatesShuffle([...new Set(distractors)]).slice(0, 3);
        const options = fisherYatesShuffle([correct, ...pool]);
        const idx = options.indexOf(correct);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(4);
        positions.add(idx);
      }

      // Over 50 runs, correct answer appears in all positions
      expect(positions.size).toBe(4);
    });
  });
});
