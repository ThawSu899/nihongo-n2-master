import { z } from 'zod';

export const ProvenanceSchema = z.object({
  source: z.string(),
  license: z.string(),
  status: z.enum(['draft', 'reviewed', 'native_verified']),
  updatedAt: z.string(),
  rev: z.number().int().nonnegative(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const AudioRefSchema = z.object({
  kind: z.enum(['file', 'tts', 'missing']),
  fileId: z.string().optional(),
  lang: z.literal('ja-JP').optional().default('ja-JP'),
  speaker: z.string().optional(),
});
export type AudioRef = z.infer<typeof AudioRefSchema>;

export const VocabularySchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  ja: z.string(),
  kana: z.string(),
  en: z.string(),
  my: z.string().optional(),
  pos: z.string(),
  exampleSentenceId: z.string().optional(),
  kanjiIds: z.array(z.string()),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  difficulty: z.number().min(1).max(5),
  importance: z.number().min(1).max(5),
  audio: AudioRefSchema,
  prov: ProvenanceSchema,
});
export type Vocabulary = z.infer<typeof VocabularySchema>;

export const KanjiSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  char: z.string(),
  meaning: z.string(),
  onyomi: z.array(z.string()),
  kunyomi: z.array(z.string()),
  exampleVocab: z.array(z.object({
    word: z.string(),
    reading: z.string(),
    meaning: z.string(),
    preview: z.boolean().default(false),
  })),
  exampleSentenceIds: z.array(z.string()),
  components: z.array(z.string()),
  strokes: z.number().int().positive().optional(),
  difficulty: z.number().min(1).max(5),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  audio: AudioRefSchema.optional(),
  prov: ProvenanceSchema,
});
export type Kanji = z.infer<typeof KanjiSchema>;

export const GrammarSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  pattern: z.string(),
  meaning: z.string(),
  formation: z.string(),
  explanation: z.object({
    en: z.string(),
    my: z.string().optional(),
  }),
  examples: z.array(z.object({
    sentenceId: z.string(),
    note: z.string().optional(),
  })),
  similarGrammarIds: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  difficulty: z.number().min(1).max(5),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  prov: ProvenanceSchema,
});
export type Grammar = z.infer<typeof GrammarSchema>;

export const SentenceSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  ja: z.string(),
  kana: z.string(),
  translation: z.object({
    en: z.string(),
    my: z.string().optional(),
  }),
  vocabIds: z.array(z.string()),
  grammarIds: z.array(z.string()),
  audio: AudioRefSchema,
  prov: ProvenanceSchema,
});
export type Sentence = z.infer<typeof SentenceSchema>;

export const QuestionSkillSchema = z.enum(['vocab', 'kanji', 'grammar', 'reading', 'listening']);
export type QuestionSkill = z.infer<typeof QuestionSkillSchema>;

export const QuestionTypeSchema = z.enum([
  'multiple_choice',
  'typed_recall',
  'listening_choice',
  'reorder',
  'reading_comprehension',
  'kanji_reading',
  'kanji_meaning',
  'stroke_practice',
  'shadowing',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  skill: QuestionSkillSchema,
  type: QuestionTypeSchema,
  prompt: z.string(),
  audio: AudioRefSchema.optional(),
  choices: z.array(z.string()).optional(),
  answer: z.string(),
  acceptedAnswers: z.array(z.string()).optional(),
  explanation: z.string(),
  difficulty: z.number().min(1).max(5),
  linkedItemIds: z.array(z.string()),
  generated: z.boolean().default(false),
  hint: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const ReadingPassageSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  text: z.string(),
  kanaText: z.string(),
  translation: z.string(),
  questionIds: z.array(z.string()),
  difficulty: z.number().min(1).max(5),
  glossary: z.array(z.object({
    term: z.string(),
    reading: z.string(),
    meaning: z.string(),
  })).default([]),
  prov: ProvenanceSchema,
});
export type ReadingPassage = z.infer<typeof ReadingPassageSchema>;

export const ListeningTurnSchema = z.object({
  speaker: z.string(),
  ja: z.string(),
  kana: z.string(),
  en: z.string(),
  audio: AudioRefSchema.optional(),
});
export type ListeningTurn = z.infer<typeof ListeningTurnSchema>;

export const ListeningDialogueSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  audio: AudioRefSchema,
  speakers: z.array(z.string()),
  transcript: z.string(),
  translation: z.string(),
  turns: z.array(ListeningTurnSchema).default([]),
  questionIds: z.array(z.string()),
  difficulty: z.number().min(1).max(5),
  prov: ProvenanceSchema,
});
export type ListeningDialogue = z.infer<typeof ListeningDialogueSchema>;

export const LessonStageNumSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10),
  z.literal(11), z.literal(12), z.literal(13), z.literal(14), z.literal(15),
]);
export type LessonStageNum = z.infer<typeof LessonStageNumSchema>;

export const LessonThresholdsSchema = z.object({
  vocab: z.number().default(0.90),
  kanji: z.number().default(0.85),
  grammar: z.number().default(0.85),
  reading: z.number().default(0.80),
  listening: z.number().default(0.80),
  overall: z.number().default(0.85),
});
export type LessonThresholds = z.infer<typeof LessonThresholdsSchema>;

export const LessonPackSchema = z.object({
  id: z.string(),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  module: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'reviewed', 'published', 'planned']),
  masteryThresholds: LessonThresholdsSchema.default({
    vocab: 0.90,
    kanji: 0.85,
    grammar: 0.85,
    reading: 0.80,
    listening: 0.80,
    overall: 0.85,
  }),
  vocabularies: z.array(VocabularySchema),
  kanjis: z.array(KanjiSchema),
  grammars: z.array(GrammarSchema),
  sentences: z.array(SentenceSchema),
  reading: ReadingPassageSchema,
  listening: ListeningDialogueSchema,
  questions: z.array(QuestionSchema),
  prov: ProvenanceSchema,
});
export type LessonPack = z.infer<typeof LessonPackSchema>;

export const CurriculumMapItemSchema = z.object({
  id: z.string(),
  level: z.enum(['N5', 'N4', 'N3', 'N2']),
  module: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  grammarTopics: z.array(z.string()),
  targetKanjiCount: z.number(),
  targetVocabCount: z.number(),
  status: z.enum(['planned', 'drafted', 'reviewed', 'published']),
  reviewStatus: z.enum(['ai-authored', 'human-reviewed']).optional(),
});
export type CurriculumMapItem = z.infer<typeof CurriculumMapItemSchema>;

export type MasteryState = 'new' | 'learning' | 'familiar' | 'mastered' | 'retained';

export interface MasteryRecord {
  lessonId: string;
  state: MasteryState;
  scores: {
    vocab: number;
    kanji: number;
    grammar: number;
    reading: number;
    listening: number;
    overall: number;
  };
  evidenceCounts: {
    vocab: number;
    kanji: number;
    grammar: number;
    reading: number;
    listening: number;
  };
  passedThresholds: boolean;
  failedSkills: QuestionSkill[];
  consecutiveFailures: number;
  isProvisional: boolean;
  needsRefresh: boolean;
  firstMasteredAt?: string;
  lastTestedAt?: string;
  history: Array<{
    attemptAt: string;
    scores: Record<QuestionSkill | 'overall', number>;
    passed: boolean;
    failedItemIds: string[];
  }>;
}

export type SRSCardFacet = 'recog' | 'recall' | 'listening' | 'meaning' | 'reading' | 'stroke' | 'cloze';

export interface SRSCard {
  id: string; // itemId:facet
  itemId: string;
  lessonId: string;
  itemType: 'vocab' | 'kanji' | 'grammar' | 'sentence' | 'kana';
  facet: SRSCardFacet;
  prompt: string;
  reading?: string;
  meaning: string;
  audio?: AudioRef;
  exampleSentence?: string;
  state: 'new' | 'learning' | 'review' | 'relearning';
  intervalDays: number;
  repetition: number;
  stability: number;
  difficulty: number;
  lapses: number;
  isLeech: boolean;
  due: string; // ISO UTC
  lastReviewed?: string; // ISO UTC
}

export interface KanaRecord {
  character: string;
  romaji: string[];
  script: 'hiragana' | 'katakana';
  category: 'basic' | 'dakuten' | 'handakuten' | 'combo' | 'sokuon';
  recognitionAccuracy: number;
  productionAccuracy: number;
  responseTime: number;
  attempts: number;
  lastSeen?: string;
  masteryState: 'new' | 'learning' | 'mastered';
  srsCardId?: string;
}

export interface RemediationExercise {
  itemId: string;
  itemType: 'vocab' | 'kanji' | 'grammar';
  exerciseType: 'typed_production' | 'multiple_choice' | 'cloze' | 'meaning_match';
  prompt: string;
  answer: string;
  choices?: string[];
  explanation: string;
  completed: boolean;
  isCorrect?: boolean;
}

export interface RemediationPlan {
  id: string;
  lessonId: string;
  attemptId: string;
  createdAt: string;
  weakSkills: QuestionSkill[];
  failedItemIds: string[];
  exercises: RemediationExercise[];
  status: 'pending' | 'in_progress' | 'completed';
  retestRequired: boolean;
}

export type AssessmentType = 'weekly' | 'monthly' | 'level';

export interface AssessmentResult {
  id: string;
  type: AssessmentType;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  takenAt: string;
  score: number; // 0 - 100
  accuracy: number; // 0.0 - 1.0
  totalQuestions: number;
  correctQuestions: number;
  durationSeconds: number;
  bySkill: Record<QuestionSkill, { correct: number; total: number; accuracy: number }>;
  passed: boolean;
  weakSkills: QuestionSkill[];
  failedItemIds: string[];
  comparisonWithPrior?: {
    scoreDiff: number;
    accuracyDiff: number;
    speedDiff: number;
  };
}

export interface N2ReadinessMetric {
  lessonMasteryPct: number; // >= 90%
  lessonRetentionPct: number; // >= 50%
  srs30DayRetentionPct: number; // >= 85%
  weeklyTestsAvgPct: number; // >= 75%
  skillRollingAccuracies: Record<QuestionSkill, number>;
  srsBacklogCount: number;
  levelTestPassed: boolean;
  overallReadinessPct: number;
  status: 'not_ready' | 'progressing' | 'approaching_readiness' | 'ready';
  disclaimer: string;
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSScheduleResult {
  card: SRSCard;
  nextIntervalDays: number;
  nextDue: string;
}

export interface ReviewLogEntry {
  id: string;
  cardId: string;
  rating: SRSRating;
  elapsedMs: number;
  reviewedAt: string;
  priorIntervalDays: number;
  newIntervalDays: number;
}

export interface StudyBlock {
  id: string;
  title: string;
  skill?: QuestionSkill;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  plannedMinutes: number;
  completedMinutes: number;
  countsTowardGoal: boolean;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  reason?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  targetMinutes: number; // default 360 = 6 hours
  blocks: StudyBlock[];
  explanations: string[];
  isRecoveryDay: boolean;
  weakSkills: QuestionSkill[];
  strongSkills: QuestionSkill[];
}

export interface StudyTimerState {
  blockId: string | null;
  state: 'idle' | 'running' | 'paused' | 'completed';
  startedAt: number | null; // epoch ms
  accumulatedMs: number;
  targetMinutes: number;
  lastInteractionAt: number;
}

export interface StudyEvent {
  id: string;
  timestamp: string; // ISO UTC
  type:
    | 'lesson_started'
    | 'stage_completed'
    | 'exercise_attempted'
    | 'test_completed'
    | 'srs_reviewed'
    | 'block_completed'
    | 'daily_plan_generated'
    | 'profile_updated';
  lessonId?: string;
  stageNumber?: number;
  data: Record<string, any>;
}

export interface UserProfile {
  name: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  currentLessonId: string;
  dailyTargetMinutes: number; // default 360
  dayRolloverHour: number; // default 4
  showRomaji: boolean;
  furiganaMode: 'always' | 'unlearned' | 'never';
  explanationLang: 'en' | 'my' | 'ja';
  targetRetention: number; // default 0.90
  dailyNewCap: number;     // default 30
  dailyReviewCap: number;  // default 200
  notificationSettings: {
    inApp: boolean;
    browser: boolean;
    calendarPopup: boolean;
    quietHoursStart: string; // 22:00
    quietHoursEnd: string;   // 07:00
  };
}
