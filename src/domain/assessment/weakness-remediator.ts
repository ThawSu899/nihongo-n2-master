import { db } from '../../data/db/dexie-db';
import {
  SRSCard,
  ReviewLogEntry,
  Question,
  QuestionSkill,
  AssessmentResult,
  StudyEvent,
} from '../models/types';
import {
  TestAnalyticsAggregator,
  TestAnalyticsSummary,
} from './test-analytics-aggregator';
import { ContentLoader } from '../../data/content/content-loader';
import { fisherYatesShuffle } from './shuffler';

export interface LeechItem {
  cardId: string;
  itemId: string;
  lessonId: string;
  itemType: 'vocab' | 'kanji' | 'grammar' | 'sentence' | 'kana';
  skill: QuestionSkill;
  prompt: string;
  reading?: string;
  meaning: string;
  lapses: number;
  errorCount: number;
  reviewCount: number;
  accuracyPct: number;
  lastReviewed?: string;
  isLeech: boolean;
  status: 'quarantined' | 'rehabilitated' | 'under_review';
  exampleSentence?: string;
}

export interface WeaknessReport {
  weakestSkill: QuestionSkill;
  weakestSkillLabel: string;
  weakestSkillScore: number;
  targetThresholdPct: number;
  deficitPct: number;
  allSkills: Array<{
    skill: QuestionSkill;
    label: string;
    scorePct: number;
    thresholdPct: number;
    isWeak: boolean;
    testedCount: number;
  }>;
  leeches: LeechItem[];
  totalLeechCount: number;
  totalCardsCount: number;
  recommendedAction: string;
}

export interface WeakPointDrillSession {
  id: string;
  title: string;
  subtitle: string;
  focusSkill: QuestionSkill | 'mixed_leeches';
  skillLabel: string;
  questions: Question[];
  createdAt: string;
  targetCount: number;
  isLeechDrill: boolean;
  leechCardIds: string[];
}

const SKILL_LABELS: Record<QuestionSkill, string> = {
  vocab: 'Vocabulary',
  kanji: 'Kanji & Radicals',
  grammar: 'Grammar Patterns',
  reading: 'Reading Comprehension',
  listening: 'Listening Comprehension',
};

const SKILL_THRESHOLDS: Record<QuestionSkill, number> = {
  vocab: 90,
  kanji: 85,
  grammar: 85,
  reading: 80,
  listening: 80,
};

function mapItemTypeToSkill(itemType: string): QuestionSkill {
  switch (itemType) {
    case 'vocab':
      return 'vocab';
    case 'kanji':
      return 'kanji';
    case 'grammar':
      return 'grammar';
    case 'sentence':
      return 'reading';
    case 'kana':
      return 'vocab';
    default:
      return 'vocab';
  }
}

export class WeaknessRemediator {
  /**
   * Analyzes db.srs_cards, db.mastery_records, db.review_logs, and TestAnalyticsAggregator
   * to produce a comprehensive weakness and leech report.
   */
  static async analyzeWeaknesses(): Promise<WeaknessReport> {
    const analytics = await TestAnalyticsAggregator.getAnalyticsSummary();
    const srsCards = await db.srs_cards.toArray();
    const reviewLogs = await db.review_logs.toArray();

    // Map review logs by cardId
    const cardLogsMap = new Map<string, ReviewLogEntry[]>();
    for (const log of reviewLogs) {
      if (!cardLogsMap.has(log.cardId)) {
        cardLogsMap.set(log.cardId, []);
      }
      cardLogsMap.get(log.cardId)!.push(log);
    }

    // Identify leeches (cards marked isLeech OR lapses >= 3 OR review logs with >= 2 'again' and < 60% accuracy)
    const leeches: LeechItem[] = [];

    for (const card of srsCards) {
      const logs = cardLogsMap.get(card.id) || [];
      const reviewCount = logs.length;
      const errorCount = logs.filter((l) => l.rating === 'again').length;
      const correctCount = logs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
      const accuracyPct = reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : 0;

      const isLeechCard =
        card.isLeech === true ||
        card.lapses >= 3 ||
        (reviewCount >= 3 && accuracyPct < 55) ||
        errorCount >= 3;

      if (isLeechCard) {
        leeches.push({
          cardId: card.id,
          itemId: card.itemId,
          lessonId: card.lessonId,
          itemType: card.itemType,
          skill: mapItemTypeToSkill(card.itemType),
          prompt: card.prompt,
          reading: card.reading,
          meaning: card.meaning,
          lapses: Math.max(card.lapses, errorCount),
          errorCount,
          reviewCount,
          accuracyPct,
          lastReviewed: card.lastReviewed,
          isLeech: true,
          status: 'quarantined',
          exampleSentence: card.exampleSentence,
        });
      }
    }

    // Sort leeches by highest lapses, then highest error count
    leeches.sort((a, b) => b.lapses - a.lapses || b.errorCount - a.errorCount);

    // Identify weakest skill from Radar Analytics
    let weakestSkill: QuestionSkill = 'grammar';
    let weakestSkillLabel = 'Grammar';
    let weakestSkillScore = 0;
    let targetThresholdPct = 85;

    if (analytics.weakestSkill) {
      weakestSkill = analytics.weakestSkill.skill;
      weakestSkillLabel = analytics.weakestSkill.label;
      weakestSkillScore = analytics.weakestSkill.scorePct;
      targetThresholdPct = SKILL_THRESHOLDS[weakestSkill] || 85;
    } else {
      // Default fallback
      weakestSkill = 'vocab';
      weakestSkillLabel = 'Vocabulary';
      weakestSkillScore = 70;
      targetThresholdPct = 90;
    }

    const deficitPct = Math.max(0, targetThresholdPct - weakestSkillScore);

    const allSkills = analytics.skills.map((s) => ({
      skill: s.skill,
      label: s.label,
      scorePct: s.scorePct,
      thresholdPct: s.thresholdPct,
      isWeak: s.scorePct < s.thresholdPct,
      testedCount: s.testedCount,
    }));

    let recommendedAction = `Targeted ${weakestSkillLabel} Drill recommended to bridge the ${deficitPct}% threshold gap.`;
    if (leeches.length > 0) {
      recommendedAction = `${leeches.length} stubborn leech items detected in quarantine. High-lapse items require isolated retrieval reinforcement.`;
    }

    return {
      weakestSkill,
      weakestSkillLabel,
      weakestSkillScore,
      targetThresholdPct,
      deficitPct,
      allSkills,
      leeches,
      totalLeechCount: leeches.length,
      totalCardsCount: srsCards.length,
      recommendedAction,
    };
  }

  /**
   * Fetches all items currently quarantined in the leech registry
   */
  static async getLeechQuarantineItems(): Promise<LeechItem[]> {
    const report = await this.analyzeWeaknesses();
    return report.leeches;
  }

  /**
   * Rehabilitates a stubborn leech card:
   * Clears isLeech flag, resets lapses, and restores card to review ladder
   */
  static async rehabilitateLeech(cardId: string): Promise<void> {
    const card = await db.srs_cards.get(cardId);
    if (!card) return;

    await db.srs_cards.update(cardId, {
      isLeech: false,
      lapses: 0,
      state: 'learning',
      intervalDays: 1,
      repetition: 1,
      due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Record study event
    await db.study_events.add({
      id: `evt_rehab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'srs_reviewed',
      lessonId: card.lessonId,
      data: {
        action: 'leech_rehabilitated',
        cardId,
        prompt: card.prompt,
      },
    });
  }

  /**
   * Generates a targeted 10-to-20 question drill session focusing specifically on
   * the user's lowest-scoring radar axis or stubborn leech items.
   */
  static async generateWeakPointDrill(options?: {
    focusSkill?: QuestionSkill | 'mixed_leeches';
    count?: number;
    userLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  }): Promise<WeakPointDrillSession> {
    const targetCount = Math.max(10, Math.min(20, options?.count || 12));
    const report = await this.analyzeWeaknesses();
    const targetSkill = options?.focusSkill || report.weakestSkill;
    const isLeechMode = targetSkill === 'mixed_leeches';
    const skillLabel = isLeechMode ? 'Leech Quarantine Drill' : SKILL_LABELS[targetSkill as QuestionSkill] || 'Weakness Drill';

    const questions: Question[] = [];
    const leechCardIds: string[] = [];

    // 1. Gather all SRS cards for distractor building
    const allSrsCards = await db.srs_cards.toArray();
    const otherMeanings = allSrsCards.map((c) => c.meaning).filter(Boolean);
    const otherReadings = allSrsCards.map((c) => c.reading).filter(Boolean) as string[];

    // 2. If in leech mode or if leeches exist matching target skill, prioritize them!
    const targetLeeches = isLeechMode
      ? report.leeches
      : report.leeches.filter((l) => l.skill === targetSkill);

    for (const leech of targetLeeches) {
      if (questions.length >= targetCount) break;

      leechCardIds.push(leech.cardId);

      // Synthesize a targeted multiple choice question from the leech
      const distractors = this.generateDistractors(
        leech.meaning,
        otherMeanings.length >= 4 ? otherMeanings : ['To study', 'Teacher', 'Library', 'Yesterday', 'Friend', 'Train']
      );

      const choices = fisherYatesShuffle([leech.meaning, ...distractors.slice(0, 3)]);

      questions.push({
        id: `drill_leech_${leech.cardId}_${questions.length}`,
        lessonId: leech.lessonId,
        skill: leech.skill,
        type: 'multiple_choice',
        prompt: leech.reading
          ? `Leech Remediation: What is the meaning of 「${leech.prompt}」 (${leech.reading})?`
          : `Leech Remediation: What is the meaning of 「${leech.prompt}」?`,
        choices,
        answer: leech.meaning,
        explanation: `Persistent error item with ${leech.lapses} prior lapses. Focus on encoding: 「${leech.prompt}」 ${leech.reading ? `(${leech.reading})` : ''} = "${leech.meaning}".`,
        difficulty: 3,
        linkedItemIds: [leech.itemId],
        generated: true,
        hint: leech.exampleSentence || `Think about context: ${leech.meaning.substring(0, 3)}...`,
      });
    }

    // 3. Load questions from published lesson packs matching target skill
    if (!isLeechMode && questions.length < targetCount) {
      try {
        const packs = await db.lesson_packs.toArray();
        const packQuestions = packs
          .flatMap((p) => p.questions || [])
          .filter((q) => q.skill === targetSkill);

        const shuffledPackQ = fisherYatesShuffle(packQuestions);
        for (const q of shuffledPackQ) {
          if (questions.length >= targetCount) break;
          // Avoid duplicate prompts
          if (!questions.some((existing) => existing.prompt === q.prompt)) {
            questions.push(q);
          }
        }
      } catch {
        // Continue to fallbacks if error
      }
    }

    // 4. If we still need more questions to meet targetCount (10 to 20),
    // synthesize high-yield curriculum drill items for the skill!
    if (questions.length < targetCount) {
      const needed = targetCount - questions.length;
      const synthetic = this.generateSkillFallbackQuestions(targetSkill, needed);
      questions.push(...synthetic);
    }

    return {
      id: `drill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: isLeechMode
        ? `Leech Quarantine Remediation (${questions.length} Items)`
        : `Targeted ${skillLabel} Weak-Point Drill`,
      subtitle: isLeechMode
        ? `Isolated high-friction review to break interference patterns on ${leechCardIds.length} stubborn items.`
        : `Concentrated practice addressing your lowest-scoring radar axis (${report.weakestSkillScore}% vs ${report.targetThresholdPct}% req).`,
      focusSkill: targetSkill,
      skillLabel,
      questions: questions.slice(0, targetCount),
      createdAt: new Date().toISOString(),
      targetCount: Math.min(questions.length, targetCount),
      isLeechDrill: isLeechMode || leechCardIds.length > 0,
      leechCardIds,
    };
  }

  /**
   * Records the completion of a drill session, updating Leech statuses,
   * saving an assessment record for the radar chart, and logging study events.
   */
  static async recordDrillCompletion(
    drill: WeakPointDrillSession,
    answers: Array<{ question: Question; isCorrect: boolean }>,
    durationSeconds: number
  ): Promise<{
    score: number;
    accuracy: number;
    rehabilitatedCount: number;
    drillResult: AssessmentResult;
  }> {
    const total = answers.length;
    const correct = answers.filter((a) => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) / 100 : 0;
    const score = Math.round(accuracy * 100);
    const passed = score >= 80;

    let rehabilitatedCount = 0;

    // Check each answered question for rehabilitated leeches
    for (const { question, isCorrect } of answers) {
      if (question.id.startsWith('drill_leech_') && isCorrect) {
        // Extract cardId
        const parts = question.id.split('_');
        const cardId = parts.slice(2, parts.length - 1).join('_');
        if (cardId) {
          await this.rehabilitateLeech(cardId);
          rehabilitatedCount += 1;
        }
      }
    }

    // Build skill breakdown
    const bySkill: Record<QuestionSkill, { correct: number; total: number; accuracy: number }> = {
      vocab: { correct: 0, total: 0, accuracy: 0 },
      kanji: { correct: 0, total: 0, accuracy: 0 },
      grammar: { correct: 0, total: 0, accuracy: 0 },
      reading: { correct: 0, total: 0, accuracy: 0 },
      listening: { correct: 0, total: 0, accuracy: 0 },
    };

    answers.forEach(({ question, isCorrect }) => {
      bySkill[question.skill].total += 1;
      if (isCorrect) bySkill[question.skill].correct += 1;
    });

    (Object.keys(bySkill) as QuestionSkill[]).forEach((s) => {
      const data = bySkill[s];
      data.accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) / 100 : 0;
    });

    const drillResult: AssessmentResult = {
      id: `asmt_drill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'weekly', // records as weekly test entry to update radar rolling scores
      level: 'N5',
      takenAt: new Date().toISOString(),
      score,
      accuracy,
      totalQuestions: total,
      correctQuestions: correct,
      durationSeconds,
      bySkill,
      passed,
      weakSkills: passed ? [] : [drill.focusSkill === 'mixed_leeches' ? 'grammar' : drill.focusSkill],
      failedItemIds: answers.filter((a) => !a.isCorrect).flatMap((a) => a.question.linkedItemIds),
    };

    await db.assessments.add(drillResult);

    // Record study session log
    await db.study_sessions.add({
      id: `sess_drill_${Date.now()}`,
      blockId: 'block_weakness_drill',
      skill: drill.focusSkill,
      startedAt: new Date(Date.now() - durationSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds,
      exercisesCompleted: total,
    });

    // Record study event
    await db.study_events.add({
      id: `evt_drill_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'test_completed',
      data: {
        drillId: drill.id,
        focusSkill: drill.focusSkill,
        score,
        rehabilitatedCount,
      },
    });

    return {
      score,
      accuracy,
      rehabilitatedCount,
      drillResult,
    };
  }

  /**
   * Seeds 4 realistic Leech cards and review logs if none exist,
   * enabling immediate demonstration and testing of Leech Quarantine.
   */
  static async seedSampleLeechesIfEmpty(): Promise<number> {
    const existing = await db.srs_cards.toArray();
    const leeches = existing.filter((c) => c.isLeech || c.lapses >= 3);
    if (leeches.length > 0) return leeches.length;

    const sampleLeeches: SRSCard[] = [
      {
        id: 'leech_sample_v1',
        itemId: 'n5.l01.v008',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'recall',
        prompt: 'はじめまして',
        reading: 'はじめまして',
        meaning: 'Nice to meet you (for the first time)',
        state: 'relearning',
        intervalDays: 1,
        repetition: 1,
        stability: 0.8,
        difficulty: 4,
        lapses: 5,
        isLeech: true,
        due: new Date(Date.now() - 3600000).toISOString(),
        lastReviewed: new Date(Date.now() - 86400000).toISOString(),
        exampleSentence: 'はじめまして、田中です。よろしくおねがいします。',
      },
      {
        id: 'leech_sample_g1',
        itemId: 'n5.l01.g003',
        lessonId: 'n5.l01',
        itemType: 'grammar',
        facet: 'cloze',
        prompt: 'X の Y (Possessive particle の)',
        reading: 'の',
        meaning: 'Noun modifier / Possessive "of"',
        state: 'relearning',
        intervalDays: 1,
        repetition: 1,
        stability: 0.6,
        difficulty: 5,
        lapses: 6,
        isLeech: true,
        due: new Date(Date.now() - 7200000).toISOString(),
        lastReviewed: new Date(Date.now() - 172800000).toISOString(),
        exampleSentence: 'これは わたし の ほんです。(This is my book.)',
      },
      {
        id: 'leech_sample_k1',
        itemId: 'n5.l01.k003',
        lessonId: 'n5.l01',
        itemType: 'kanji',
        facet: 'reading',
        prompt: '何',
        reading: 'なに / なん',
        meaning: 'What',
        state: 'relearning',
        intervalDays: 1,
        repetition: 2,
        stability: 0.9,
        difficulty: 4,
        lapses: 4,
        isLeech: true,
        due: new Date(Date.now() - 1800000).toISOString(),
        lastReviewed: new Date(Date.now() - 259200000).toISOString(),
        exampleSentence: 'これは 何 ですか。(What is this?)',
      },
      {
        id: 'leech_sample_v2',
        itemId: 'n5.l01.v009',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'recog',
        prompt: 'よろしくおねがいします',
        reading: 'よろしくおねがいします',
        meaning: 'Please treat me favorably / Nice to work with you',
        state: 'relearning',
        intervalDays: 1,
        repetition: 1,
        stability: 0.5,
        difficulty: 5,
        lapses: 7,
        isLeech: true,
        due: new Date(Date.now() - 500000).toISOString(),
        lastReviewed: new Date(Date.now() - 345600000).toISOString(),
        exampleSentence: 'こちらこそ よろしくおねがいします。',
      },
    ];

    for (const card of sampleLeeches) {
      await db.srs_cards.put(card);

      // Create corresponding review logs indicating persistent lapses
      for (let i = 0; i < card.lapses; i++) {
        await db.review_logs.put({
          id: `log_seed_${card.id}_${i}`,
          cardId: card.id,
          rating: 'again',
          elapsedMs: 2500,
          reviewedAt: new Date(Date.now() - (card.lapses - i) * 86400000).toISOString(),
          priorIntervalDays: 1,
          newIntervalDays: 1,
        });
      }
    }

    return sampleLeeches.length;
  }

  // Helper to generate distinct distractor options
  private static generateDistractors(correctAnswer: string, pool: string[]): string[] {
    const filtered = pool.filter(
      (item) => item.toLowerCase() !== correctAnswer.toLowerCase()
    );
    return fisherYatesShuffle(filtered).slice(0, 3);
  }

  // Generates high quality fallback drill questions per skill
  private static generateSkillFallbackQuestions(
    skill: QuestionSkill | 'mixed_leeches',
    count: number
  ): Question[] {
    const skillQuestionsMap: Record<QuestionSkill, Question[]> = {
      grammar: [
        {
          id: 'fb_g1',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'Which particle indicates the topic of the sentence?',
          choices: ['は (wa)', 'が (ga)', 'を (wo/o)', 'に (ni)'],
          answer: 'は (wa)',
          explanation: 'Particle は marks the contextual topic of the sentence.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_g2',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'Complete the sentence: これ ___ たなかさんの かばんです。',
          choices: ['は', 'の', 'を', 'も'],
          answer: 'は',
          explanation: 'これ は ... makes 「これ」 (this) the sentence topic.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_g3',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'How do you turn 「たなかさんは せんせいです」 into a question?',
          choices: [
            'たなかさんは せんせいですか',
            'たなかさんは せんせいでの',
            'たなかさんは せんせいですよ',
            'たなかさんは せんせいですわ',
          ],
          answer: 'たなかさんは せんせいですか',
          explanation: 'Adding sentence-final particle 「か」 creates a polite question without changing word order.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_g4',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'Select the correct possessive phrase: "My university"',
          choices: [
            'わたし の だいがく',
            'だいがく の わたし',
            'わたし は だいがく',
            'わたし に だいがく',
          ],
          answer: 'わたし の だいがく',
          explanation: '[Owner] の [Possession] expresses ownership.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_g5',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'Negative form: What is the polite negative of 「〜です」?',
          choices: [
            '〜ではありません',
            '〜でした',
            '〜ません',
            '〜ないです',
          ],
          answer: '〜ではありません',
          explanation: '「〜ではありません」 (or 〜じゃありません) is the negative form of 「〜です」.',
          difficulty: 2,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_g6',
          lessonId: 'n5.l01',
          skill: 'grammar',
          type: 'multiple_choice',
          prompt: 'Fill in the blank: すずきさんも にほんじん ___。("Suzuki-san is also Japanese.")',
          choices: ['です', 'ます', 'でした', 'だ'],
          answer: 'です',
          explanation: 'Copula 「です」 completes noun predicate sentences politely.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
      ],
      vocab: [
        {
          id: 'fb_v1',
          lessonId: 'n5.l01',
          skill: 'vocab',
          type: 'multiple_choice',
          prompt: 'What does 「せんせい」 mean in Japanese?',
          choices: ['Teacher / Doctor', 'Student', 'Employee', 'Customer'],
          answer: 'Teacher / Doctor',
          explanation: '「先生 (せんせい)」 refers to teachers, instructors, and medical doctors.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_v2',
          lessonId: 'n5.l01',
          skill: 'vocab',
          type: 'multiple_choice',
          prompt: 'What is the English meaning of 「がくせい」?',
          choices: ['Student', 'School', 'Classroom', 'Friend'],
          answer: 'Student',
          explanation: '「学生 (がくせい)」 means student.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_v3',
          lessonId: 'n5.l01',
          skill: 'vocab',
          type: 'multiple_choice',
          prompt: 'Choose the greeting used when meeting someone for the first time:',
          choices: [
            'はじめまして',
            'こんにちは',
            'さようなら',
            'おやすみなさい',
          ],
          answer: 'はじめまして',
          explanation: '「はじめまして」 originates from 初めて (for the first time).',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_v4',
          lessonId: 'n5.l01',
          skill: 'vocab',
          type: 'multiple_choice',
          prompt: 'What does 「だいがくいんせい」 mean?',
          choices: ['Graduate student', 'High schooler', 'Elementary student', 'Teacher assistant'],
          answer: 'Graduate student',
          explanation: '大学院 (graduate school) + 生 (student).',
          difficulty: 2,
          linkedItemIds: [],
          generated: true,
        },
      ],
      kanji: [
        {
          id: 'fb_k1',
          lessonId: 'n5.l01',
          skill: 'kanji',
          type: 'multiple_choice',
          prompt: 'What is the Onyomi reading of 「学」 in 「学生」?',
          choices: ['がく (gaku)', 'せい (sei)', 'まな (mana)', 'せん (sen)'],
          answer: 'がく (gaku)',
          explanation: '「学」 has the Onyomi がく, as in 学生 (がくせい) or 大学 (だいがく).',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_k2',
          lessonId: 'n5.l01',
          skill: 'kanji',
          type: 'multiple_choice',
          prompt: 'What does the kanji 「生」 mean?',
          choices: ['Life / Birth / Student', 'Death / Ending', 'Water / Flow', 'Fire / Flame'],
          answer: 'Life / Birth / Student',
          explanation: '「生」 signifies birth, life, and person born/studying (as in 先生, 学生).',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_k3',
          lessonId: 'n5.l01',
          skill: 'kanji',
          type: 'multiple_choice',
          prompt: 'Which kanji represents "person / people"?',
          choices: ['人', '大', '入', '八'],
          answer: '人',
          explanation: '「人」 (ひと / じん / にん) represents human / person.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_k4',
          lessonId: 'n5.l01',
          skill: 'kanji',
          type: 'multiple_choice',
          prompt: 'What is the reading of 「何」 in 「何ですか」?',
          choices: ['なん (nan)', 'なに (nani)', 'か (ka)', 'どこ (doko)'],
          answer: 'なん (nan)',
          explanation: 'Before です, 何 is pronounced なん (nan).',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
      ],
      reading: [
        {
          id: 'fb_r1',
          lessonId: 'n5.l01',
          skill: 'reading',
          type: 'multiple_choice',
          prompt: 'Read: 「はじめまして。わたしは たなかです。がくせいです。」 What is Tanaka\'s occupation?',
          choices: ['Student', 'Teacher', 'Company employee', 'Doctor'],
          answer: 'Student',
          explanation: '「がくせいです」 indicates Tanaka is a student.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_r2',
          lessonId: 'n5.l01',
          skill: 'reading',
          type: 'multiple_choice',
          prompt: 'Read: 「すずきさんは とうきょうだいがくの せんせいです。」 Where does Suzuki-san work?',
          choices: ['Tokyo University', 'Kyoto High School', 'Osaka Hospital', 'City Bank'],
          answer: 'Tokyo University',
          explanation: 'とうきょうだいがく (Tokyo University) の せんせい (teacher).',
          difficulty: 2,
          linkedItemIds: [],
          generated: true,
        },
      ],
      listening: [
        {
          id: 'fb_l1',
          lessonId: 'n5.l01',
          skill: 'listening',
          type: 'multiple_choice',
          prompt: 'Audio Context: When someone says 「はじめまして、どうぞよろしくおねがいします」, what is the standard reply?',
          choices: [
            'こちらこそ よろしくおねがいします',
            'さようなら、またあした',
            'どういたしまして',
            'おやすみなさい',
          ],
          answer: 'こちらこそ よろしくおねがいします',
          explanation: '「こちらこそ」 (likewise / it is I who should say so) is the standard polite reply.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
        {
          id: 'fb_l2',
          lessonId: 'n5.l01',
          skill: 'listening',
          type: 'multiple_choice',
          prompt: 'Audio Prompt: "すずきさんは アメリカじん ですか。" Speaker tone rises at the end. What is the speaker doing?',
          choices: [
            'Asking if Suzuki-san is American',
            'Confirming Suzuki-san is Japanese',
            'Saying goodbye to Suzuki-san',
            'Introducing themselves as American',
          ],
          answer: 'Asking if Suzuki-san is American',
          explanation: 'Particle か with rising intonation indicates a direct question.',
          difficulty: 1,
          linkedItemIds: [],
          generated: true,
        },
      ],
    };

    const targetKey = skill === 'mixed_leeches' ? 'grammar' : skill;
    const base = skillQuestionsMap[targetKey] || skillQuestionsMap.grammar;
    const result: Question[] = [];

    while (result.length < count) {
      const remaining = count - result.length;
      result.push(
        ...base.slice(0, remaining).map((q, idx) => ({
          ...q,
          id: `${q.id}_cycle_${result.length + idx}`,
        }))
      );
    }

    return result.slice(0, count);
  }
}
