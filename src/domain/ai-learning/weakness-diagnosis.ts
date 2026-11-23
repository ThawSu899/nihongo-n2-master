import {
  MasteryRecord,
  SRSCard,
  ReviewLogEntry,
  AssessmentResult,
  QuestionSkill,
} from '../models/types';
import { ExamResultRecord, db } from '../../data/db/dexie-db';

export type SkillType = 'grammar' | 'vocabulary' | 'kanji' | 'reading' | 'listening';
export type SeverityLevel = 'high' | 'medium' | 'low';
export type EvidenceClassification =
  | 'Confirmed Weakness'
  | 'Possible Weakness'
  | 'Insufficient Data';
export type PerformanceTrend = 'improving' | 'declining' | 'stable' | 'unknown';

export interface WeaknessFinding {
  skill: SkillType;
  severity: SeverityLevel;
  classification: EvidenceClassification;
  evidence: string;
  relevantLessonIds: string[];
  relevantItemIds: string[];
  accuracy: number | null; // 0.0 - 1.0, or null if insufficient data
  attemptCount: number;
  recentTrend: PerformanceTrend;
  recommendedAction: string;
}

export interface LearnerDiagnosticProfile {
  targetLevel: 'N5' | 'N4' | 'N3' | 'N2';
  analyzedAt: string;
  totalItemsTracked: number;
  confirmedWeaknesses: WeaknessFinding[];
  possibleWeaknesses: WeaknessFinding[];
  insufficientDataSkills: WeaknessFinding[];
  strongSkills: SkillType[];
  overallSummary: {
    en: string;
    my: string;
  };
}

export interface DiagnosticInputData {
  targetLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  masteryRecords?: MasteryRecord[];
  srsCards?: SRSCard[];
  reviewLogs?: ReviewLogEntry[];
  examResults?: ExamResultRecord[];
  assessments?: AssessmentResult[];
}

/**
 * Pure deterministic diagnosis engine.
 * Evaluates learner performance records across Grammar, Vocabulary, Kanji, Reading, and Listening.
 * Strictly separates confirmed weaknesses from lack of practice / insufficient data.
 */
export function diagnoseLearnerWeaknesses(data: DiagnosticInputData): LearnerDiagnosticProfile {
  const targetLevel = data.targetLevel || 'N5';
  const masteryRecords = data.masteryRecords || [];
  const srsCards = data.srsCards || [];
  const reviewLogs = data.reviewLogs || [];
  const examResults = (data.examResults || []).filter((e) => e.level === targetLevel);
  const assessments = (data.assessments || []).filter((a) => a.level === targetLevel);

  const findings: Record<SkillType, WeaknessFinding> = {
    grammar: evaluateGrammar(masteryRecords, srsCards, reviewLogs, examResults, assessments),
    vocabulary: evaluateVocabulary(masteryRecords, srsCards, reviewLogs, examResults, assessments),
    kanji: evaluateKanji(masteryRecords, srsCards, examResults, assessments),
    reading: evaluateReading(masteryRecords, examResults, assessments),
    listening: evaluateListening(masteryRecords, assessments),
  };

  const confirmedWeaknesses: WeaknessFinding[] = [];
  const possibleWeaknesses: WeaknessFinding[] = [];
  const insufficientDataSkills: WeaknessFinding[] = [];
  const strongSkills: SkillType[] = [];

  (Object.keys(findings) as SkillType[]).forEach((skill) => {
    const finding = findings[skill];
    if (
      finding.accuracy !== null &&
      finding.accuracy >= 0.80 &&
      finding.severity === 'low' &&
      finding.attemptCount >= 3
    ) {
      strongSkills.push(skill);
    } else if (finding.classification === 'Confirmed Weakness') {
      confirmedWeaknesses.push(finding);
    } else if (finding.classification === 'Possible Weakness') {
      possibleWeaknesses.push(finding);
    } else if (finding.classification === 'Insufficient Data') {
      insufficientDataSkills.push(finding);
    }
  });

  // Calculate total items tracked
  const totalItemsTracked =
    srsCards.length +
    masteryRecords.length +
    examResults.length +
    assessments.length;

  // Build bilingual summary
  const summaryEn = buildSummaryTextEn(confirmedWeaknesses, possibleWeaknesses, insufficientDataSkills, strongSkills);
  const summaryMy = buildSummaryTextMy(confirmedWeaknesses, possibleWeaknesses, insufficientDataSkills, strongSkills);

  return {
    targetLevel,
    analyzedAt: new Date().toISOString(),
    totalItemsTracked,
    confirmedWeaknesses,
    possibleWeaknesses,
    insufficientDataSkills,
    strongSkills,
    overallSummary: {
      en: summaryEn,
      my: summaryMy,
    },
  };
}

/**
 * Loads all relevant tables from Dexie DB and executes weakness diagnosis.
 */
export async function diagnoseLearnerFromDB(targetLevel?: 'N5' | 'N4' | 'N3' | 'N2'): Promise<LearnerDiagnosticProfile> {
  const profile = await db.profile.get('current_user');
  const level = targetLevel || (profile?.level as any) || 'N5';

  const [masteryRecords, srsCards, reviewLogs, examResults, assessments] = await Promise.all([
    db.mastery_records.toArray(),
    db.srs_cards.toArray(),
    db.review_logs.toArray(),
    db.exam_results.where('level').equals(level).toArray(),
    db.assessments.where('level').equals(level).toArray(),
  ]);

  return diagnoseLearnerWeaknesses({
    targetLevel: level,
    masteryRecords,
    srsCards,
    reviewLogs,
    examResults,
    assessments,
  });
}

// ==============================================================================
// Skill Evaluation Algorithms
// ==============================================================================

function evaluateGrammar(
  masteryRecords: MasteryRecord[],
  srsCards: SRSCard[],
  reviewLogs: ReviewLogEntry[],
  examResults: ExamResultRecord[],
  assessments: AssessmentResult[]
): WeaknessFinding {
  const grammarCards = srsCards.filter((c) => c.itemType === 'grammar');
  const leechCount = grammarCards.filter((c) => c.isLeech || c.lapses >= 3).length;
  const highLapseItems = grammarCards.filter((c) => c.lapses >= 2).map((c) => c.itemId);

  let totalAttempts = 0;
  let correctAttempts = 0;
  const failedItemIds = new Set<string>(highLapseItems);
  const relevantLessonIds = new Set<string>();

  // Review logs for grammar cards
  const grammarCardIds = new Set(grammarCards.map((c) => c.id));
  reviewLogs.forEach((r) => {
    if (grammarCardIds.has(r.cardId)) {
      totalAttempts++;
      if (r.rating === 'good' || r.rating === 'easy') {
        correctAttempts++;
      }
    }
  });

  // Mastery records grammar evaluation
  masteryRecords.forEach((m) => {
    if (m.evidenceCounts && m.evidenceCounts.grammar > 0) {
      totalAttempts += m.evidenceCounts.grammar;
      correctAttempts += Math.round((m.scores?.grammar || 0) * m.evidenceCounts.grammar);
      if (m.scores && m.scores.grammar < 0.85) {
        relevantLessonIds.add(m.lessonId);
      }
    }
    m.history?.forEach((h) => {
      h.failedItemIds?.forEach((id) => {
        if (id.includes('grammar') || id.includes('g') || id.includes('gm')) {
          failedItemIds.add(id);
        }
      });
    });
  });

  // Exam answers grammar evaluation
  examResults.forEach((e) => {
    totalAttempts += e.sections.grammar.total;
    correctAttempts += e.sections.grammar.correct;
  });

  // Assessment results grammar evaluation
  assessments.forEach((a) => {
    if (a.bySkill?.grammar) {
      totalAttempts += a.bySkill.grammar.total;
      correctAttempts += a.bySkill.grammar.correct;
    }
    a.failedItemIds?.forEach((id) => failedItemIds.add(id));
  });

  const accuracy = totalAttempts > 0 ? Number((correctAttempts / totalAttempts).toFixed(2)) : null;

  // Evidence classification
  if (totalAttempts < 3 && grammarCards.length < 3 && leechCount === 0) {
    return {
      skill: 'grammar',
      severity: 'low',
      classification: 'Insufficient Data',
      evidence: 'Not enough grammar exercises or reviews recorded yet to evaluate performance.',
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'unknown',
      recommendedAction: 'Practice more grammar points and take lesson assessments to generate diagnostic data.',
    };
  }

  if (leechCount >= 2 || (accuracy !== null && accuracy < 0.70 && totalAttempts >= 3)) {
    return {
      skill: 'grammar',
      severity: accuracy !== null && accuracy < 0.55 ? 'high' : 'medium',
      classification: 'Confirmed Weakness',
      evidence: `Grammar accuracy is ${accuracy !== null ? Math.round(accuracy * 100) : 0}% across ${totalAttempts} questions with ${leechCount} persistent struggle cards.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: calculateTrend(accuracy, leechCount),
      recommendedAction: 'Focus on particle nuances, grammar formation rules, and comparative cloze drills.',
    };
  }

  if (leechCount === 1 || (accuracy !== null && accuracy < 0.85)) {
    return {
      skill: 'grammar',
      severity: 'low',
      classification: 'Possible Weakness',
      evidence: `Moderate grammar accuracy (${accuracy !== null ? Math.round(accuracy * 100) : 0}%) with occasional particle or formation errors.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'stable',
      recommendedAction: 'Review target lesson grammar notes and practice 5 targeted exercises daily.',
    };
  }

  return {
    skill: 'grammar',
    severity: 'low',
    classification: 'Possible Weakness',
    evidence: `Good grammar retention (${accuracy !== null ? Math.round(accuracy * 100) : 100}%) across ${totalAttempts} evaluated attempts.`,
    relevantLessonIds: Array.from(relevantLessonIds),
    relevantItemIds: [],
    accuracy,
    attemptCount: totalAttempts,
    recentTrend: 'improving',
    recommendedAction: 'Maintain daily SRS reviews to sustain high retention.',
  };
}

function evaluateVocabulary(
  masteryRecords: MasteryRecord[],
  srsCards: SRSCard[],
  reviewLogs: ReviewLogEntry[],
  examResults: ExamResultRecord[],
  assessments: AssessmentResult[]
): WeaknessFinding {
  const vocabCards = srsCards.filter((c) => c.itemType === 'vocab');
  const leechCount = vocabCards.filter((c) => c.isLeech || c.lapses >= 3).length;
  const highLapseItems = vocabCards.filter((c) => c.lapses >= 2).map((c) => c.itemId);

  let totalAttempts = 0;
  let correctAttempts = 0;
  const failedItemIds = new Set<string>(highLapseItems);
  const relevantLessonIds = new Set<string>();

  // Review logs for vocabulary cards
  const vocabCardIds = new Set(vocabCards.map((c) => c.id));
  reviewLogs.forEach((r) => {
    if (vocabCardIds.has(r.cardId)) {
      totalAttempts++;
      if (r.rating === 'good' || r.rating === 'easy') {
        correctAttempts++;
      }
    }
  });

  masteryRecords.forEach((m) => {
    if (m.evidenceCounts && m.evidenceCounts.vocab > 0) {
      totalAttempts += m.evidenceCounts.vocab;
      correctAttempts += Math.round((m.scores?.vocab || 0) * m.evidenceCounts.vocab);
      if (m.scores && m.scores.vocab < 0.90) {
        relevantLessonIds.add(m.lessonId);
      }
    }
  });

  examResults.forEach((e) => {
    totalAttempts += e.sections.vocabulary.total;
    correctAttempts += e.sections.vocabulary.correct;
  });

  assessments.forEach((a) => {
    if (a.bySkill?.vocab) {
      totalAttempts += a.bySkill.vocab.total;
      correctAttempts += a.bySkill.vocab.correct;
    }
    a.failedItemIds?.forEach((id) => failedItemIds.add(id));
  });

  const accuracy = totalAttempts > 0 ? Number((correctAttempts / totalAttempts).toFixed(2)) : null;

  if (totalAttempts < 5 && vocabCards.length < 5) {
    return {
      skill: 'vocabulary',
      severity: 'low',
      classification: 'Insufficient Data',
      evidence: 'Fewer than 5 vocabulary items or assessments evaluated.',
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'unknown',
      recommendedAction: 'Complete more vocabulary flashcard reviews and lesson tests.',
    };
  }

  if (leechCount >= 3 || (accuracy !== null && accuracy < 0.70 && totalAttempts >= 10)) {
    return {
      skill: 'vocabulary',
      severity: accuracy !== null && accuracy < 0.55 ? 'high' : 'medium',
      classification: 'Confirmed Weakness',
      evidence: `Vocabulary accuracy is ${accuracy !== null ? Math.round(accuracy * 100) : 0}% with ${leechCount} high-lapse words requiring active recall reinforcement.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: calculateTrend(accuracy, leechCount),
      recommendedAction: 'Review collocations, sample sentences, and Burmese definitions for high-lapse words.',
    };
  }

  if (leechCount >= 1 || (accuracy !== null && accuracy < 0.90)) {
    return {
      skill: 'vocabulary',
      severity: 'low',
      classification: 'Possible Weakness',
      evidence: `Vocabulary accuracy is ${accuracy !== null ? Math.round(accuracy * 100) : 0}% with ${leechCount} lapse items.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'stable',
      recommendedAction: 'Run 10-minute vocabulary recall drills focusing on confused word pairs.',
    };
  }

  return {
    skill: 'vocabulary',
    severity: 'low',
    classification: 'Possible Weakness',
    evidence: `Strong vocabulary retention (${accuracy !== null ? Math.round(accuracy * 100) : 100}%) across ${totalAttempts} tested words.`,
    relevantLessonIds: Array.from(relevantLessonIds),
    relevantItemIds: [],
    accuracy,
    attemptCount: totalAttempts,
    recentTrend: 'improving',
    recommendedAction: 'Continue scheduled SRS reviews to solidify long-term memory.',
  };
}

function evaluateKanji(
  masteryRecords: MasteryRecord[],
  srsCards: SRSCard[],
  examResults: ExamResultRecord[],
  assessments: AssessmentResult[]
): WeaknessFinding {
  const kanjiCards = srsCards.filter((c) => c.itemType === 'kanji');
  const readingCards = kanjiCards.filter((c) => c.facet === 'reading' || c.facet === 'recog');
  const meaningCards = kanjiCards.filter((c) => c.facet === 'meaning');

  const readingLapses = readingCards.reduce((acc, c) => acc + c.lapses, 0);
  const meaningLapses = meaningCards.reduce((acc, c) => acc + c.lapses, 0);
  const failedItemIds = new Set<string>(kanjiCards.filter((c) => c.lapses >= 2).map((c) => c.itemId));
  const relevantLessonIds = new Set<string>();

  let totalAttempts = 0;
  let correctAttempts = 0;

  masteryRecords.forEach((m) => {
    if (m.evidenceCounts && m.evidenceCounts.kanji > 0) {
      totalAttempts += m.evidenceCounts.kanji;
      correctAttempts += Math.round((m.scores?.kanji || 0) * m.evidenceCounts.kanji);
      if (m.scores && m.scores.kanji < 0.85) {
        relevantLessonIds.add(m.lessonId);
      }
    }
  });

  assessments.forEach((a) => {
    if (a.bySkill?.kanji) {
      totalAttempts += a.bySkill.kanji.total;
      correctAttempts += a.bySkill.kanji.correct;
    }
  });

  const accuracy = totalAttempts > 0 ? Number((correctAttempts / totalAttempts).toFixed(2)) : null;

  if (totalAttempts < 3 && kanjiCards.length < 3) {
    return {
      skill: 'kanji',
      severity: 'low',
      classification: 'Insufficient Data',
      evidence: 'Fewer than 3 Kanji items or reviews recorded.',
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'unknown',
      recommendedAction: 'Practice Onyomi and Kunyomi stroke drills in the Kanji Deck.',
    };
  }

  const isReadingDominated = readingLapses > meaningLapses * 1.5;
  if (failedItemIds.size >= 2 || (accuracy !== null && accuracy < 0.70)) {
    const nuance = isReadingDominated
      ? 'Onyomi/Kunyomi readings cause more lapses than Kanji meanings.'
      : 'Both Kanji readings and compound meanings need reinforcement.';
    return {
      skill: 'kanji',
      severity: accuracy !== null && accuracy < 0.60 ? 'high' : 'medium',
      classification: 'Confirmed Weakness',
      evidence: `Kanji accuracy is ${accuracy !== null ? Math.round(accuracy * 100) : 0}%. ${nuance}`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: Array.from(failedItemIds),
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: calculateTrend(accuracy, failedItemIds.size),
      recommendedAction: 'Practice high-frequency Jukugo compounds and distinguish similar Kanji radicals.',
    };
  }

  return {
    skill: 'kanji',
    severity: 'low',
    classification: 'Possible Weakness',
    evidence: `Kanji recognition is solid (${accuracy !== null ? Math.round(accuracy * 100) : 100}%).`,
    relevantLessonIds: Array.from(relevantLessonIds),
    relevantItemIds: [],
    accuracy,
    attemptCount: totalAttempts,
    recentTrend: 'stable',
    recommendedAction: 'Maintain current Kanji flashcard schedule.',
  };
}

function evaluateReading(
  masteryRecords: MasteryRecord[],
  examResults: ExamResultRecord[],
  assessments: AssessmentResult[]
): WeaknessFinding {
  let totalAttempts = 0;
  let correctAttempts = 0;
  const relevantLessonIds = new Set<string>();

  masteryRecords.forEach((m) => {
    if (m.evidenceCounts && m.evidenceCounts.reading > 0) {
      totalAttempts += m.evidenceCounts.reading;
      correctAttempts += Math.round((m.scores?.reading || 0) * m.evidenceCounts.reading);
      if (m.scores && m.scores.reading < 0.80) {
        relevantLessonIds.add(m.lessonId);
      }
    }
  });

  examResults.forEach((e) => {
    totalAttempts += e.sections.reading.total;
    correctAttempts += e.sections.reading.correct;
  });

  assessments.forEach((a) => {
    if (a.bySkill?.reading) {
      totalAttempts += a.bySkill.reading.total;
      correctAttempts += a.bySkill.reading.correct;
    }
  });

  const accuracy = totalAttempts > 0 ? Number((correctAttempts / totalAttempts).toFixed(2)) : null;

  if (totalAttempts < 3) {
    return {
      skill: 'reading',
      severity: 'low',
      classification: 'Insufficient Data',
      evidence: 'Fewer than 3 reading comprehension passages completed.',
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: [],
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'unknown',
      recommendedAction: 'Read short lesson passages and complete comprehension questions.',
    };
  }

  if (accuracy !== null && accuracy < 0.70) {
    return {
      skill: 'reading',
      severity: accuracy < 0.55 ? 'high' : 'medium',
      classification: 'Confirmed Weakness',
      evidence: `Reading comprehension accuracy is ${Math.round(accuracy * 100)}% across ${totalAttempts} passage questions.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: [],
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: calculateTrend(accuracy, 0),
      recommendedAction: 'Practice sentence structure parsing, reference pronoun resolution, and time management.',
    };
  }

  return {
    skill: 'reading',
    severity: 'low',
    classification: 'Possible Weakness',
    evidence: `Reading comprehension is performing reliably (${accuracy !== null ? Math.round(accuracy * 100) : 100}%).`,
    relevantLessonIds: Array.from(relevantLessonIds),
    relevantItemIds: [],
    accuracy,
    attemptCount: totalAttempts,
    recentTrend: 'stable',
    recommendedAction: 'Read full lesson texts to increase reading speed.',
  };
}

function evaluateListening(
  masteryRecords: MasteryRecord[],
  assessments: AssessmentResult[]
): WeaknessFinding {
  let totalAttempts = 0;
  let correctAttempts = 0;
  const relevantLessonIds = new Set<string>();

  masteryRecords.forEach((m) => {
    if (m.evidenceCounts && m.evidenceCounts.listening > 0) {
      totalAttempts += m.evidenceCounts.listening;
      correctAttempts += Math.round((m.scores?.listening || 0) * m.evidenceCounts.listening);
      if (m.scores && m.scores.listening < 0.80) {
        relevantLessonIds.add(m.lessonId);
      }
    }
  });

  assessments.forEach((a) => {
    if (a.bySkill?.listening) {
      totalAttempts += a.bySkill.listening.total;
      correctAttempts += a.bySkill.listening.correct;
    }
  });

  const accuracy = totalAttempts > 0 ? Number((correctAttempts / totalAttempts).toFixed(2)) : null;

  if (totalAttempts < 3) {
    return {
      skill: 'listening',
      severity: 'low',
      classification: 'Insufficient Data',
      evidence: 'Fewer than 3 listening audio exercises evaluated.',
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: [],
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: 'unknown',
      recommendedAction: 'Listen to native dialogues in Lesson Stage 9 and Shadowing mode.',
    };
  }

  if (accuracy !== null && accuracy < 0.70) {
    return {
      skill: 'listening',
      severity: accuracy < 0.55 ? 'high' : 'medium',
      classification: 'Confirmed Weakness',
      evidence: `Listening accuracy is ${Math.round(accuracy * 100)}% across ${totalAttempts} audio questions.`,
      relevantLessonIds: Array.from(relevantLessonIds),
      relevantItemIds: [],
      accuracy,
      attemptCount: totalAttempts,
      recentTrend: calculateTrend(accuracy, 0),
      recommendedAction: 'Engage in audio shadowing practice and focus on conversational contractions and particle sounds.',
    };
  }

  return {
    skill: 'listening',
    severity: 'low',
    classification: 'Possible Weakness',
    evidence: `Listening comprehension accuracy is good (${accuracy !== null ? Math.round(accuracy * 100) : 100}%).`,
    relevantLessonIds: Array.from(relevantLessonIds),
    relevantItemIds: [],
    accuracy,
    attemptCount: totalAttempts,
    recentTrend: 'stable',
    recommendedAction: 'Continue daily shadowing and dialogue listening.',
  };
}

function calculateTrend(accuracy: number | null, struggleCount: number): PerformanceTrend {
  if (accuracy === null) return 'unknown';
  if (accuracy >= 0.80 && struggleCount === 0) return 'improving';
  if (accuracy < 0.60 || struggleCount >= 3) return 'declining';
  return 'stable';
}

function buildSummaryTextEn(
  confirmed: WeaknessFinding[],
  possible: WeaknessFinding[],
  insufficient: WeaknessFinding[],
  strong: SkillType[]
): string {
  if (confirmed.length === 0 && possible.length === 0) {
    return 'Learning records show balanced progress with no critical weaknesses detected.';
  }
  const confirmedList = confirmed.map((c) => c.skill.toUpperCase()).join(', ');
  const needsData = insufficient.map((i) => i.skill.toUpperCase()).join(', ');
  return `Priority review required for ${confirmedList || 'recent topics'}. ${needsData ? `More practice needed in ${needsData} to confirm skill level.` : ''}`;
}

function buildSummaryTextMy(
  confirmed: WeaknessFinding[],
  possible: WeaknessFinding[],
  insufficient: WeaknessFinding[],
  strong: SkillType[]
): string {
  if (confirmed.length === 0 && possible.length === 0) {
    return 'လေ့လာမှုမှတ်တမ်းများအရ မျှတသော တိုးတက်မှုရှိပြီး အဓိကအားနည်းချက် ကြီးကြီးမားမား မရှိသေးပါ။';
  }
  const confirmedList = confirmed
    .map((c) => {
      if (c.skill === 'grammar') return 'သဒ္ဒါ (Grammar)';
      if (c.skill === 'vocabulary') return 'ဝေါဟာရ (Vocabulary)';
      if (c.skill === 'kanji') return 'ခန်းဂျီး (Kanji)';
      if (c.skill === 'reading') return 'စာဖတ်နားလည်မှု (Reading)';
      return 'နားထောင်မှု (Listening)';
    })
    .join(' နှင့် ');
  return `အထူးအာရုံစိုက် လေ့ကျင့်ရန် လိုအပ်သော ကဏ္ဍ: ${confirmedList}။ အားနည်းချက်များကို အခြေခံ၍ သီးသန့်လေ့ကျင့်ခန်းများ ဖြေဆိုရန် အကြံပြုပါသည်။`;
}
