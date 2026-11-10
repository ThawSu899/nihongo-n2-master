import Dexie, { Table } from 'dexie';
import {
  SRSCard,
  ReviewLogEntry,
  MasteryRecord,
  StudyEvent,
  UserProfile,
  LessonPack,
  KanaRecord,
  AssessmentResult,
  RemediationPlan,
  GhostCardRecord,
  CramDrillRecord,
} from '../../domain/models/types';
import { QuarantinedCard, QuarantineCardInput } from '../../domain/fsrs/quarantine-types';
import { QuarantineEngine, DrillProcessResult } from '../../domain/fsrs/quarantine-engine';

export interface StudySessionRecord {
  id: string;
  blockId: string;
  skill?: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  exercisesCompleted: number;
}

export interface AINoteRecord {
  id: string;
  topic: string;
  prompt: string;
  response: string;
  provenance: 'ai';
  status: 'ai_draft' | 'reviewed';
  createdAt: string;
}

export interface ExamResultSectionScore {
  correct: number;
  total: number;
  scaledScore: number;
}

export interface ExamAnswerRecord {
  questionId: string;
  selectedChoice: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isFlagged: boolean;
}

export interface ExamResultRecord {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctQuestions: number;
  scaledScore: number; // 0 - 180
  passed: boolean;
  passThreshold: number;
  sections: {
    vocabulary: ExamResultSectionScore;
    grammar: ExamResultSectionScore;
    reading: ExamResultSectionScore;
  };
  answers: ExamAnswerRecord[];
  quarantinedCount: number;
}

export class NihongoMasterDB extends Dexie {
  study_events!: Table<StudyEvent, string>;
  srs_cards!: Table<SRSCard, string>;
  review_logs!: Table<ReviewLogEntry, string>;
  mastery_records!: Table<MasteryRecord, string>;
  study_sessions!: Table<StudySessionRecord, string>;
  profile!: Table<UserProfile & { id: string }, string>;
  lesson_packs!: Table<LessonPack, string>;
  ai_notes!: Table<AINoteRecord, string>;
  kana_records!: Table<KanaRecord, string>;
  assessments!: Table<AssessmentResult, string>;
  remediations!: Table<RemediationPlan, string>;
  ghost_cards!: Table<GhostCardRecord, string>;
  cram_drills!: Table<CramDrillRecord, string>;
  quarantined_cards!: Table<QuarantinedCard, string>;
  exam_results!: Table<ExamResultRecord, string>;

  constructor() {
    super('NihongoN2MasterDB');

    // Schema versioning: preserves existing tables and adds Kana, Assessments, Remediation, Ghost Cards, Cram Drills, Quarantined Cards, Exam Results
    this.version(1).stores({
      study_events: 'id, timestamp, type, lessonId',
      srs_cards: 'id, itemId, lessonId, facet, state, due, lapses, isLeech',
      review_logs: 'id, cardId, reviewedAt, rating',
      mastery_records: 'lessonId, state, lastTestedAt',
      study_sessions: 'id, blockId, startedAt',
      profile: 'id',
      lesson_packs: 'id, level, module, number, status',
      ai_notes: 'id, topic, status, createdAt',
    });

    this.version(2).stores({
      kana_records: 'character, script, category, masteryState, attempts',
      assessments: 'id, type, level, takenAt, passed',
      remediations: 'id, lessonId, status, createdAt',
    });

    this.version(3).stores({
      ghost_cards: 'id, parentCardId, grammarId, stage, due, conquered',
    });

    this.version(4).stores({
      cram_drills: 'id, category, level, startedAt, completedAt',
    });

    this.version(5).stores({
      quarantined_cards: 'id, itemType, jlptLevel, quarantineReason, isGraduated, quarantinedAt',
    });

    this.version(6).stores({
      exam_results: 'id, level, completedAt, passed, scaledScore',
    });
  }

  async getActiveQuarantinedCards(level?: 'N5' | 'N4' | 'N3' | 'N2'): Promise<QuarantinedCard[]> {
    let collection = this.quarantined_cards.filter((c) => !c.isGraduated);
    if (level) {
      collection = collection.filter((c) => c.jlptLevel === level);
    }
    return collection.toArray();
  }

  async getAllQuarantinedCards(): Promise<QuarantinedCard[]> {
    return this.quarantined_cards.toArray();
  }

  async upsertQuarantinedCard(card: QuarantinedCard): Promise<void> {
    await this.quarantined_cards.put(card);
  }

  async graduateQuarantinedCard(id: string, boostedStability?: number): Promise<void> {
    const card = await this.quarantined_cards.get(id);
    if (card) {
      await this.quarantined_cards.update(id, {
        isGraduated: true,
        currentStability: boostedStability ?? Math.max(card.currentStability * 2.2, 3.5),
      });
    }
  }

  async processQuarantineDrillAttempt(
    id: string,
    isCorrect: boolean
  ): Promise<DrillProcessResult | null> {
    const card = await this.quarantined_cards.get(id);
    if (!card) return null;
    const result = QuarantineEngine.processDrillResult(card, isCorrect);
    await this.quarantined_cards.put(result.updatedCard);
    return result;
  }

  async quarantineCard(input: QuarantineCardInput): Promise<QuarantinedCard> {
    const existing = await this.quarantined_cards.get(input.id);
    const card = QuarantineEngine.buildQuarantinedCard(input, existing);
    await this.upsertQuarantinedCard(card);
    return card;
  }

  async saveExamResult(result: ExamResultRecord): Promise<void> {
    await this.exam_results.put(result);
  }

  async getExamResults(level?: 'N5' | 'N4' | 'N3' | 'N2'): Promise<ExamResultRecord[]> {
    let results: ExamResultRecord[];
    if (level) {
      results = await this.exam_results.where('level').equals(level).toArray();
    } else {
      results = await this.exam_results.toArray();
    }
    return results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }
}

export const db = new NihongoMasterDB();

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Learner',
  level: 'N5',
  currentLessonId: 'n5.l01',
  dailyTargetMinutes: 360, // 6 hours
  dayRolloverHour: 4,      // 04:00 AM
  showRomaji: true,        // helpful for N5 day 1
  furiganaMode: 'always',
  explanationLang: 'en',
  targetRetention: 0.90,
  dailyNewCap: 30,
  dailyReviewCap: 200,
  ankiTargetDeck: 'Nihongo N2 Master',
  notificationSettings: {
    inApp: true,
    browser: false,
    calendarPopup: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
};

/**
 * Initialize default user profile if empty
 */
export async function ensureInitialProfile(): Promise<UserProfile> {
  const existing = await db.profile.get('current_user');
  if (existing) {
    return existing;
  }
  const initial = { ...DEFAULT_USER_PROFILE, id: 'current_user' };
  await db.profile.put(initial);
  return initial;
}
