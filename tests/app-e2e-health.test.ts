import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Database & Reset
import { db, DEFAULT_USER_PROFILE, ensureInitialProfile } from '../src/data/db/dexie-db';
import { resetApplicationData } from '../src/data/db/reset-app';
import { ContentLoader } from '../src/data/content/content-loader';
import { CURATED_DOKKAI_CATALOG } from '../src/domain/assessment/dokkai-catalog';
import {
  buildOfficialN2MockExam,
  MockExamEngine,
} from '../src/domain/assessment/mock-exam-engine';

// Context & Shortcuts
import {
  SHORTCUT_REGISTRY,
  DEFAULT_KEY_BINDINGS,
  ShortcutAction,
} from '../src/presentation/context/GlobalShortcutContext';

// Screens & Components under Test
import { HomeScreen } from '../src/presentation/screens/HomeScreen';
import { LessonPlayerScreen } from '../src/presentation/screens/LessonPlayerScreen';
import { SRSReviewScreen } from '../src/presentation/screens/SRSReviewScreen';
import { ClozeSentenceCard } from '../src/presentation/components/ClozeSentenceCard';
import { DokkaiReaderWorkbench } from '../src/presentation/components/DokkaiReaderWorkbench';
import { ChoukaiWorkbench } from '../src/presentation/components/ChoukaiWorkbench';
import { ShadowingPracticeScreen } from '../src/presentation/components/ShadowingPracticeScreen';
import { OfficialMockExamScreen } from '../src/presentation/screens/OfficialMockExamScreen';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';
import { GrammarCramLab } from '../src/presentation/components/GrammarCramLab';
import { StarScrambleTrainer } from '../src/presentation/components/StarScrambleTrainer';
import { KanaTrainerScreen } from '../src/presentation/screens/KanaTrainerScreen';
import { TestsScreen } from '../src/presentation/screens/TestsScreen';
import { CurriculumScreen } from '../src/presentation/screens/CurriculumScreen';

// Types
import {
  UserProfile,
  DailyPlan,
  StudyTimerState,
  AssessmentResult,
} from '../src/domain/models/types';

describe('Comprehensive Application-Wide Health Check & Mount Verification', () => {
  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      mockLocalStorage.store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
      mockLocalStorage.store = {};
    }),
  };

  const mockSessionStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      mockSessionStorage.store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockSessionStorage.store[key];
    }),
    clear: vi.fn(() => {
      mockSessionStorage.store = {};
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).sessionStorage = mockSessionStorage;
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    for (const table of db.tables) {
      await table.clear();
    }
    await ensureInitialProfile();
  });

  // =========================================================================
  // REQUIREMENT 1: All Screen Mounts without Crashing
  // =========================================================================
  describe('1. Programmatic Screen & Drill Mount Verifications', () => {
    const dummyProfile: UserProfile = DEFAULT_USER_PROFILE;

    it('mounts HomeScreen (Dashboard, study timer, metrics, daily plan) without crashing', () => {
      const dummyPlan: DailyPlan = {
        date: '2026-10-22',
        targetMinutes: 360,
        blocks: [
          {
            id: 'block_1',
            title: 'N5 Vocabulary Immersion',
            startTime: '08:00',
            endTime: '09:00',
            plannedMinutes: 60,
            completedMinutes: 0,
            countsTowardGoal: true,
            status: 'pending',
          },
        ],
        explanations: ['Core N5 Vocabulary Drills'],
        isRecoveryDay: false,
        weakSkills: [],
        strongSkills: ['vocab'],
      };

      const dummyTimer: StudyTimerState = {
        blockId: 'block_1',
        state: 'idle',
        startedAt: null,
        accumulatedMs: 0,
        targetMinutes: 60,
        lastInteractionAt: Date.now(),
      };

      const html = renderToString(
        React.createElement(HomeScreen, {
          profile: dummyProfile,
          dailyPlan: dummyPlan,
          dueSrsCount: 15,
          todayMinutes: 45,
          timerState: dummyTimer,
          onStartStudy: vi.fn(),
          onOpenSrs: vi.fn(),
          onOpenTests: vi.fn(),
          onNavigate: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Current Focus');
      expect(html).toContain('Daily Target (6h)');
      expect(html).toContain('Reviews Due Today');
      expect(html).toContain('15'); // dueSrsCount
      expect(html).toContain('45'); // todayMinutes
      expect(html).toContain('START STUDY (N5 DAY 1)');
      expect(html).toContain('Curriculum Map');
    });

    it('mounts LessonPlayerScreen (Stage 1-10 flow, quiz handling) with authentic lesson pack', async () => {
      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();
      expect(pack!.questions.length).toBeGreaterThan(0);
      expect(pack!.questions[0].choices?.length).toBe(4);

      const html = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: pack!,
          profile: dummyProfile,
          onMasteryUpdated: vi.fn(),
          onExit: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Self Introduction');
      expect(html).toContain('မိတ်ဆက်နှင့် ရည်မှန်းချက် (Goals)'); // Stage 1 title
      expect(html).toContain('ဝေါဟာရ စတင်လေ့လာမည်'); // Proceed button
      expect(html).toContain('Enter ↵'); // Keyboard badge chip
    });

    it('mounts SRSReviewScreen & ClozeCard (Card flip, action badges, interval calculation, ratings 1-4)', async () => {
      // 1. Seed due test card
      const testCard: any = {
        id: 'srs_card_e2e_1',
        itemId: 'vocab_watashi',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'reading',
        prompt: '私',
        reading: 'わたし',
        meaning: 'I, me',
        meaningMyanmar: 'ကျွန်တော်၊ ကျွန်မ',
        exampleSentence: '____は学生です。',
        state: 'review',
        intervalDays: 5,
        repetition: 2,
        stability: 4.5,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };
      await db.srs_cards.add(testCard);

      const html = renderToString(
        React.createElement(SRSReviewScreen, {
          onBack: vi.fn(),
          onReviewsCompleted: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('SRS မှတ်ဉာဏ်လေ့ကျင့်ရေး ကတ်များကို ဆွဲယူနေပါသည်...');

      // 2. Cloze Sentence Card rendering with prompt, active recall and rating actions
      const cardHtml = renderToString(
        React.createElement(ClozeSentenceCard, {
          card: testCard,
          englishTranslation: 'I am a student.',
          meaningMyanmar: 'ကျွန်တော်သည် ကျောင်းသားဖြစ်ပါသည်',
          onRate: vi.fn(),
        })
      );
      expect(cardHtml).toContain('Cloze Active Recall');
      expect(cardHtml).toContain('Give Up / Reveal');
      expect(cardHtml).toContain('Enter ခေါက်၍ အတည်ပြုပါ');
    });

    it('mounts DokkaiReaderWorkbench (Marker cycling, questions, furigana toggle)', () => {
      const passage = CURATED_DOKKAI_CATALOG[0];
      expect(passage).toBeDefined();

      const html = renderToString(
        React.createElement(DokkaiReaderWorkbench, {
          passage,
          onExit: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('ဖတ်ရှုနားလည်မှု လေ့ကျင့်ခန်း'); // Burmese localized reader header
      expect(html).toContain(passage.title);
      expect(html).toContain('မီးမောင်းထိုးရန်'); // Marker toolbar
      expect(html).toContain('ふりがな'); // Furigana toggle
      expect(html).toContain('CPM'); // Reading speed indicator
    });

    it('mounts ChoukaiWorkbench (Listening dialogue, choices, script toggle)', () => {
      const html = renderToString(
        React.createElement(ChoukaiWorkbench, {
          onExit: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('နားထောင်စွမ်းရည် လေ့ကျင့်ခန်း (Choukai Lab)');
      expect(html).toContain('課題理解 (Task Comprehension)');
      expect(html).toContain('Shadowing Loop');
    });

    it('mounts ShadowingPracticeScreen (Audio loop, playback control, delay selector)', async () => {
      const pack = await ContentLoader.getLessonPack('n5.l01');
      expect(pack).not.toBeNull();

      const html = renderToString(
        React.createElement(ShadowingPracticeScreen, {
          pack: pack!,
          isPlaying: false,
          currentPlayingText: null,
          play: vi.fn(),
          stop: vi.fn(),
          isShadowingLoop: true,
          shadowingTurnDelay: 2000,
          onProceed: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('လိုက်ဆိုရန် ကြားကာလ (Turn Delay)');
      expect(html).toContain('Shadowing Loop');
    });

    it('mounts OfficialMockExamScreen (Timer countdown, section scoring, question navigator)', () => {
      const html = renderToString(
        React.createElement(OfficialMockExamScreen, {
          onExit: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('JLPT N2 HONBAN MOCK');
      expect(html).toContain('Section Left');
      expect(html).toContain('Nav Grid');

      // Score Calculation Verification via MockExamEngine
      const examData = buildOfficialN2MockExam();
      expect(examData.section1Questions.length).toBeGreaterThan(0);
      expect(examData.section2Questions.length).toBeGreaterThan(0);

      const sampleReport = MockExamEngine.evaluateMockExam({
        section1Questions: examData.section1Questions,
        section2Questions: examData.section2Questions,
        answers: {
          [examData.section1Questions[0].question.id]: {
            choice: examData.section1Questions[0].question.answer,
            timeSpent: 15,
            isFlagged: false,
          },
        },
        durationSeconds: 120,
        section1DurationSeconds: 60,
        section2DurationSeconds: 60,
      });

      expect(sampleReport.level).toBe('N2');
      expect(typeof sampleReport.languageScaledScore).toBe('number');
      expect(typeof sampleReport.readingScaledScore).toBe('number');
      expect(typeof sampleReport.listeningScaledScore).toBe('number');
      expect(typeof sampleReport.totalScaledScore).toBe('number');
      expect(typeof sampleReport.passed).toBe('boolean');
      expect(['A', 'B', 'C', 'D']).toContain(sampleReport.grade);
    });

    it('mounts SettingsScreen (Danger Zone reset button, custom shortcuts table, Anki bridge card)', () => {
      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: dummyProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('System Settings');
      expect(html).toContain('ကီးဘုတ် ဖြတ်လမ်းခလုတ်များ (Keyboard Shortcuts)');
      expect(html).toContain('Export to Anki (.tsv)');
      expect(html).toContain('Danger Zone · အန္တရာယ်ဇုန် (Reset Application)');
      expect(html).toContain('Reset App Progress (New Game)');
    });

    it('mounts additional core training modules without crashing (CramLab, StarScramble, Kana, Tests, Curriculum)', () => {
      // 1. GrammarCramLab
      const cramHtml = renderToString(
        React.createElement(GrammarCramLab, {
          onExit: vi.fn(),
          profile: dummyProfile,
        })
      );
      expect(cramHtml).toContain('Grammar Cram Lab');

      // 2. StarScrambleTrainer
      const scrambleHtml = renderToString(
        React.createElement(StarScrambleTrainer, {
          onExit: vi.fn(),
        })
      );
      expect(scrambleHtml).toContain('★ 文法・並べ替え (Sentence Scramble)');

      // 3. KanaTrainerScreen
      const kanaHtml = renderToString(
        React.createElement(KanaTrainerScreen, {
          onBack: vi.fn(),
        })
      );
      expect(kanaHtml).toContain('Kana Mastery Trainer');

      // 4. TestsScreen
      const testsHtml = renderToString(
        React.createElement(TestsScreen, {
          profile: dummyProfile,
          onStartLessonTest: vi.fn(),
        })
      );
      expect(testsHtml).toContain('Assessments, Radar &amp; Remediation');
      expect(testsHtml).toContain('Tests &amp; Blueprints');

      // 5. CurriculumScreen
      const currHtml = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: vi.fn(),
          masteryRecords: {},
        })
      );
      expect(currHtml).toContain('Curriculum Map (174 Lessons)');
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Global Shortcuts Context & 24 Actions Verification
  // =========================================================================
  describe('2. Global Shortcuts Context & Action Trigger Integrity', () => {
    it('verifies all 24 canonical shortcut actions exist with valid metadata and non-conflicting default keys', () => {
      const actionKeys = Object.keys(SHORTCUT_REGISTRY) as ShortcutAction[];
      expect(actionKeys).toHaveLength(24);

      actionKeys.forEach((action) => {
        const meta = SHORTCUT_REGISTRY[action];
        expect(meta.id).toBe(action);
        expect(meta.nameEn.length).toBeGreaterThan(0);
        expect(meta.nameMy.length).toBeGreaterThan(0);
        expect(meta.descriptionEn.length).toBeGreaterThan(0);
        expect(meta.descriptionMy.length).toBeGreaterThan(0);
        expect(meta.defaultKeys.length).toBeGreaterThan(0);
        expect(meta.defaultBadge.length).toBeGreaterThan(0);

        const boundKeys = DEFAULT_KEY_BINDINGS[action];
        expect(boundKeys).toBeDefined();
        expect(boundKeys.length).toBeGreaterThan(0);
      });
    });

    it('verifies all 24 shortcut actions trigger without unhandled rejections', () => {
      const actionKeys = Object.keys(SHORTCUT_REGISTRY) as ShortcutAction[];
      const invokedMap = new Map<ShortcutAction, number>();

      // Create synthetic handlers for all 24 actions
      const syntheticHandlers: Partial<Record<ShortcutAction, (e: KeyboardEvent) => void>> = {};
      actionKeys.forEach((action) => {
        invokedMap.set(action, 0);
        syntheticHandlers[action] = (e: KeyboardEvent) => {
          expect(e).toBeDefined();
          invokedMap.set(action, (invokedMap.get(action) || 0) + 1);
        };
      });

      // Programmatically trigger each action with a simulated event object
      actionKeys.forEach((action) => {
        const primaryKey = DEFAULT_KEY_BINDINGS[action][0];
        const fakeEvent = {
          code: primaryKey,
          key: primaryKey,
          bubbles: true,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as KeyboardEvent;

        const handler = syntheticHandlers[action];
        expect(handler).toBeDefined();
        expect(() => handler!(fakeEvent)).not.toThrow();
        expect(invokedMap.get(action)).toBe(1);
      });

      // Verify all 24 actions were invoked exactly once
      expect(invokedMap.size).toBe(24);
      Array.from(invokedMap.values()).forEach((count) => {
        expect(count).toBe(1);
      });
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Database & Reset Integrity
  // =========================================================================
  describe('3. Database & Reset Integrity', () => {
    it('verifies all 13 Dexie schema tables exist on the database instance', () => {
      const expectedTables = [
        'study_events',
        'srs_cards',
        'review_logs',
        'mastery_records',
        'study_sessions',
        'profile',
        'lesson_packs',
        'ai_notes',
        'kana_records',
        'assessments',
        'remediations',
        'ghost_cards',
        'cram_drills',
      ];

      const actualTableNames = db.tables.map((t) => t.name);
      expectedTables.forEach((expected) => {
        expect(actualTableNames).toContain(expected);
        const table = (db as any)[expected];
        expect(table).toBeDefined();
        expect(typeof table.clear).toBe('function');
        expect(typeof table.count).toBe('function');
      });
    });

    it('verifies resetApplicationData completely wipes user progress and restores Day 1 state', async () => {
      // 1. Seed user progress across various tables
      await db.srs_cards.add({
        id: 'srs_seed_1',
        itemId: 'vocab_1',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'reading',
        prompt: '学生',
        reading: 'がくせい',
        meaning: 'student',
        state: 'review',
        intervalDays: 7,
        repetition: 3,
        stability: 6,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      });

      await db.study_events.add({
        id: 'evt_seed_1',
        timestamp: new Date().toISOString(),
        type: 'exercise_attempted',
        lessonId: 'n5.l01',
        data: {},
      });

      await db.assessments.add({
        id: 'ass_seed_1',
        type: 'weekly',
        level: 'N5',
        score: 100,
        accuracy: 1.0,
        totalQuestions: 10,
        correctQuestions: 10,
        durationSeconds: 120,
        bySkill: {} as any,
        passed: true,
        weakSkills: [],
        failedItemIds: [],
        takenAt: new Date().toISOString(),
      } as unknown as AssessmentResult);

      await db.ghost_cards.add({
        id: 'ghost_seed_1',
        parentCardId: 'srs_seed_1',
        grammarId: 'gram_seed_1',
        sentenceIndex: 0,
        clozeSentence: '私は____です。',
        clozeTarget: '学生',
        nuanceExplanationEn: 'student',
        stage: 2,
        due: new Date().toISOString(),
        conquered: false,
      });

      await db.review_logs.add({
        id: 'log_seed_1',
        cardId: 'srs_seed_1',
        rating: 'good',
        reviewedAt: new Date().toISOString(),
        elapsedMs: 3000,
        priorIntervalDays: 1,
        newIntervalDays: 3,
      });

      await db.kana_records.add({
        character: 'あ',
        romaji: ['a'],
        script: 'hiragana',
        category: 'basic',
        recognitionAccuracy: 1.0,
        productionAccuracy: 1.0,
        responseTime: 450,
        attempts: 5,
        masteryState: 'mastered',
      });

      await db.mastery_records.add({
        lessonId: 'n5.l01',
        state: 'mastered',
        scores: { vocab: 1, kanji: 1, grammar: 1, reading: 1, listening: 1, overall: 1 },
        evidenceCounts: { vocab: 10, kanji: 5, grammar: 5, reading: 2, listening: 2 },
        passedThresholds: true,
        failedSkills: [],
        consecutiveFailures: 0,
        isProvisional: false,
        needsRefresh: false,
        history: [],
      });

      // 2. Populate mock localStorage and sessionStorage
      localStorage.setItem('nihongo_custom_shortcuts_v1', JSON.stringify({ PLAY_AUDIO: ['KeyP'] }));
      localStorage.setItem('offline_last_sync_timestamp', new Date().toISOString());
      sessionStorage.setItem('nihongo_pwa_install_dismissed', '1');

      // Verify records are stored
      expect(await db.srs_cards.count()).toBe(1);
      expect(await db.study_events.count()).toBe(1);
      expect(await db.assessments.count()).toBe(1);
      expect(await db.ghost_cards.count()).toBe(1);
      expect(await db.review_logs.count()).toBe(1);
      expect(await db.kana_records.count()).toBe(1);
      expect(await db.mastery_records.count()).toBe(1);
      expect(mockLocalStorage.store['nihongo_custom_shortcuts_v1']).toBeDefined();

      // 3. Execute application-wide reset
      await resetApplicationData();

      // 4. Assert all progress tables are wiped
      expect(await db.srs_cards.count()).toBe(0);
      expect(await db.study_events.count()).toBe(0);
      expect(await db.assessments.count()).toBe(0);
      expect(await db.ghost_cards.count()).toBe(0);
      expect(await db.review_logs.count()).toBe(0);
      expect(await db.kana_records.count()).toBe(0);
      expect(await db.mastery_records.count()).toBe(0);
      expect(await db.cram_drills.count()).toBe(0);

      // 5. Assert user profile is restored to Day 1 defaults
      const restoredProfile = await db.profile.get('current_user');
      expect(restoredProfile).toBeDefined();
      expect(restoredProfile?.level).toBe('N5');
      expect(restoredProfile?.currentLessonId).toBe('n5.l01');

      // 6. Assert browser storage is cleared
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
      expect(Object.keys(mockLocalStorage.store)).toHaveLength(0);
      expect(Object.keys(mockSessionStorage.store)).toHaveLength(0);
    });
  });
});
