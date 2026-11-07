import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db, DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';
import { resetApplicationData } from '../src/data/db/reset-app';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';
import { SRSCard, MasteryRecord, AssessmentResult, GhostCardRecord, CramDrillRecord } from '../src/domain/models/types';

describe('Reset App / New Game Feature', () => {
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
  });

  describe('resetApplicationData logic', () => {
    it('completely clears all Dexie IndexedDB tables and re-seeds initial default profile', async () => {
      // 1. Seed dummy user progress
      const testCard: SRSCard = {
        id: 'srs_test_1',
        itemId: 'vocab_1',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'reading',
        prompt: '私',
        reading: 'わたし',
        meaning: 'I, me',
        state: 'review',
        intervalDays: 14,
        repetition: 4,
        stability: 12,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };
      await db.srs_cards.add(testCard);

      const testMastery = {
        lessonId: 'n5.l01',
        state: 'mastered',
        scores: {
          vocab: 1,
          kanji: 1,
          grammar: 1,
          reading: 1,
          listening: 1,
          overall: 1,
        },
        evidenceCounts: {
          vocab: 1,
          kanji: 1,
          grammar: 1,
          reading: 1,
          listening: 1,
        },
        passedThresholds: true,
        failedSkills: [],
        consecutiveFailures: 0,
        isProvisional: false,
        needsRefresh: false,
        lastTestedAt: new Date().toISOString(),
        history: [],
      } as unknown as MasteryRecord;
      await db.mastery_records.add(testMastery);

      const testAssessment = {
        id: 'assessment_1',
        type: 'weekly',
        level: 'N5',
        score: 95,
        accuracy: 0.95,
        totalQuestions: 20,
        correctQuestions: 19,
        durationSeconds: 300,
        bySkill: {} as any,
        passed: true,
        weakSkills: [],
        failedItemIds: [],
        takenAt: new Date().toISOString(),
      } as unknown as AssessmentResult;
      await db.assessments.add(testAssessment);

      const testGhost: GhostCardRecord = {
        id: 'ghost_1',
        parentCardId: 'srs_test_1',
        grammarId: 'gram_1',
        sentenceIndex: 0,
        clozeSentence: '今日は____です。',
        clozeTarget: 'いい天気',
        nuanceExplanationEn: 'Fine weather',
        stage: 1,
        due: new Date().toISOString(),
        conquered: false,
      };
      await db.ghost_cards.add(testGhost);

      const testCram: CramDrillRecord = {
        id: 'cram_1',
        category: 'conditions',
        level: 'N2',
        totalQuestions: 10,
        correctAnswers: 9,
        accuracy: 0.9,
        testedGrammarIds: ['gram_1'],
        failedGrammarIds: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 120,
      };
      await db.cram_drills.add(testCram);

      // Verify records exist
      expect(await db.srs_cards.count()).toBe(1);
      expect(await db.mastery_records.count()).toBe(1);
      expect(await db.assessments.count()).toBe(1);
      expect(await db.ghost_cards.count()).toBe(1);
      expect(await db.cram_drills.count()).toBe(1);

      // 2. Seed mock localStorage and sessionStorage items
      localStorage.setItem('nihongo_custom_shortcuts_v1', JSON.stringify({ PLAY_AUDIO: ['KeyP'] }));
      localStorage.setItem('offline_last_sync_timestamp', '2026-10-21T00:00:00Z');
      sessionStorage.setItem('nihongo_pwa_install_dismissed', '1');

      expect(mockLocalStorage.store['nihongo_custom_shortcuts_v1']).toBeDefined();
      expect(mockSessionStorage.store['nihongo_pwa_install_dismissed']).toBeDefined();

      // 3. Execute application reset
      await resetApplicationData();

      // 4. Assert all progress tables are wiped
      expect(await db.srs_cards.count()).toBe(0);
      expect(await db.mastery_records.count()).toBe(0);
      expect(await db.assessments.count()).toBe(0);
      expect(await db.ghost_cards.count()).toBe(0);
      expect(await db.cram_drills.count()).toBe(0);

      // 5. Assert baseline user profile exists and is reset to default
      const profile = await db.profile.get('current_user');
      expect(profile).toBeDefined();
      expect(profile?.level).toBe('N5');
      expect(profile?.currentLessonId).toBe(DEFAULT_USER_PROFILE.currentLessonId);

      // 6. Assert browser storage is cleared
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockSessionStorage.clear).toHaveBeenCalled();
      expect(Object.keys(mockLocalStorage.store).length).toBe(0);
      expect(Object.keys(mockSessionStorage.store).length).toBe(0);
    });

    it('supports preservePacksCache option to keep cached offline lesson packs', async () => {
      await db.lesson_packs.add({
        id: 'n5.l01',
        level: 'N5',
        module: 1,
        number: 1,
        title: 'Basic Greetings',
        status: 'published',
        targetVocabCount: 10,
        targetKanjiCount: 2,
        vocabularies: [],
        kanjis: [],
        sentences: [],
        listening: {
          audio: '',
          transcript: '',
          turns: [],
          question: '',
          choices: [],
          answer: 0,
        },
        reading: {
          passage: '',
          questions: [],
        },
        grammarPoints: [],
        culturalNotes: [],
      } as any);

      await db.srs_cards.add({
        id: 'card_to_wipe',
        itemId: 'vocab_1',
        lessonId: 'n5.l01',
        itemType: 'vocab',
        facet: 'reading',
        prompt: 'test',
        reading: 'test',
        meaning: 'test',
        state: 'new',
        intervalDays: 1,
        repetition: 0,
        stability: 1,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      });

      await resetApplicationData({ preservePacksCache: true });

      // srs_cards wiped, lesson_packs preserved
      expect(await db.srs_cards.count()).toBe(0);
      expect(await db.lesson_packs.count()).toBe(1);
    });
  });

  describe('SettingsScreen Danger Zone UI', () => {
    it('renders the Danger Zone section and Reset App Progress button', () => {
      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: { ...DEFAULT_USER_PROFILE, id: 'current_user' } as any,
          onUpdateProfile: () => {},
        })
      );

      expect(html).toContain('Danger Zone');
      expect(html).toContain('Reset App Progress (New Game)');
      expect(html).toContain('အန္တရာယ်ဇုန်');
      expect(html).toContain('Permanently wipes all SRS review intervals');
    });
  });
});
