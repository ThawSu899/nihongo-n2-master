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
} from '../../domain/models/types';

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

  constructor() {
    super('NihongoN2MasterDB');

    // Schema versioning: preserves existing tables and adds Kana, Assessments, Remediation
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
