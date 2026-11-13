import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db, DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';
import { BackupManager } from '../src/data/backup/backup-manager';
import { SnapshotIndexedDBStore } from '../src/data/backup/snapshot-store';
import { OfflineSyncManager } from '../src/data/sync/offline-sync-manager';
import { StorageDiagnosticsModal } from '../src/presentation/components/StorageDiagnosticsModal';
import {
  TestAnalyticsScreen,
  createDefaultTestAnalyticsSummary,
  createDefaultWeaknessReport,
} from '../src/presentation/screens/TestAnalyticsScreen';
import {
  GhostCardRecord,
  CramDrillRecord,
  RemediationPlan,
  UserProfile,
} from '../src/domain/models/types';

describe('Option D: Database Backup Integrity & Remediation History Hub', () => {
  const dummyProfile: UserProfile = DEFAULT_USER_PROFILE;

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

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockLocalStorage.setItem.mockImplementation((key: string, val: string) => {
      mockLocalStorage.store[key] = val;
    });
    mockLocalStorage.getItem.mockImplementation((key: string) => mockLocalStorage.store[key] || null);
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    await SnapshotIndexedDBStore.clear();
    for (const table of db.tables) {
      await table.clear();
    }
  });

  describe('1. BackupManager Export & Restore Schema Coverage', () => {
    it('exports ghost_cards and cram_drills in JSON backup snapshot', async () => {
      // 1. Seed ghost card and cram drill
      const sampleGhost: GhostCardRecord = {
        id: 'ghost_test_001',
        parentCardId: 'srs_001',
        grammarId: 'gram_n2_01',
        sentenceIndex: 0,
        clozeSentence: '彼女は____笑った。',
        clozeTarget: 'にこにこ',
        nuanceExplanationEn: 'Smiled cheerfully',
        stage: 2,
        due: new Date().toISOString(),
        conquered: false,
      };
      await db.ghost_cards.add(sampleGhost);

      const sampleCram: CramDrillRecord = {
        id: 'cram_drill_001',
        category: 'grammar',
        level: 'N2',
        totalQuestions: 15,
        correctAnswers: 13,
        accuracy: 0.87,
        testedGrammarIds: ['gram_n2_01', 'gram_n2_02'],
        failedGrammarIds: ['gram_n2_02'],
        startedAt: new Date(Date.now() - 300000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 300,
      };
      await db.cram_drills.add(sampleCram);

      // 2. Export JSON snapshot
      const json = await BackupManager.exportToJson();
      const backup = JSON.parse(json);

      expect(backup.version).toBe(2);
      expect(backup.ghost_cards).toHaveLength(1);
      expect(backup.ghost_cards[0].id).toBe('ghost_test_001');
      expect(backup.ghost_cards[0].clozeTarget).toBe('にこにこ');
      expect(backup.ghostCards).toHaveLength(1);

      expect(backup.cram_drills).toHaveLength(1);
      expect(backup.cram_drills[0].id).toBe('cram_drill_001');
      expect(backup.cram_drills[0].correctAnswers).toBe(13);
      expect(backup.cramDrills).toHaveLength(1);
    });

    it('restores ghost_cards and cram_drills atomically from JSON snapshot', async () => {
      const sampleGhost: GhostCardRecord = {
        id: 'ghost_restore_123',
        parentCardId: 'srs_123',
        grammarId: 'gram_n2_99',
        sentenceIndex: 1,
        clozeSentence: '結果は____だった。',
        clozeTarget: '上々',
        nuanceExplanationEn: 'Very satisfactory result',
        stage: 3,
        due: new Date().toISOString(),
        conquered: true,
        conqueredAt: new Date().toISOString(),
      };

      const sampleCram: CramDrillRecord = {
        id: 'cram_restore_456',
        category: 'kanji',
        level: 'N2',
        totalQuestions: 20,
        correctAnswers: 18,
        accuracy: 0.9,
        testedGrammarIds: ['k_01'],
        failedGrammarIds: [],
        startedAt: new Date(Date.now() - 400000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 400,
      };

      const backupData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        profile: dummyProfile,
        srsCards: [],
        reviewLogs: [],
        masteryRecords: [],
        studySessions: [],
        studyEvents: [],
        ghost_cards: [sampleGhost],
        cram_drills: [sampleCram],
      };

      const result = await BackupManager.restoreFromJson(JSON.stringify(backupData));
      expect(result.success).toBe(true);
      expect(result.stats?.ghostCards).toBe(1);
      expect(result.stats?.cramDrills).toBe(1);

      expect(await db.ghost_cards.count()).toBe(1);
      expect(await db.cram_drills.count()).toBe(1);

      const restoredGhost = await db.ghost_cards.get('ghost_restore_123');
      expect(restoredGhost).toBeDefined();
      expect(restoredGhost?.conquered).toBe(true);

      const restoredCram = await db.cram_drills.get('cram_restore_456');
      expect(restoredCram).toBeDefined();
      expect(restoredCram?.accuracy).toBe(0.9);
    });

    it('gracefully handles legacy backups without ghost_cards or cram_drills', async () => {
      const legacyBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: dummyProfile,
        srsCards: [],
        reviewLogs: [],
        masteryRecords: [],
        studySessions: [],
        studyEvents: [],
      };

      const result = await BackupManager.restoreFromJson(JSON.stringify(legacyBackup));
      expect(result.success).toBe(true);
      expect(result.stats?.ghostCards).toBe(0);
      expect(result.stats?.cramDrills).toBe(0);
      expect(await db.ghost_cards.count()).toBe(0);
      expect(await db.cram_drills.count()).toBe(0);
    });
  });

  describe('2. Storage Diagnostics Live Row Counts', () => {
    it('inspectStorage() reports live counts for ghostCards and cramDrills', async () => {
      await db.ghost_cards.add({
        id: 'ghost_diag_1',
        parentCardId: 'srs_1',
        grammarId: 'g_1',
        sentenceIndex: 0,
        clozeSentence: 'test',
        clozeTarget: 'target',
        nuanceExplanationEn: 'nuance',
        stage: 1,
        due: new Date().toISOString(),
        conquered: false,
      });

      await db.cram_drills.add({
        id: 'cram_diag_1',
        category: 'vocab',
        level: 'N5',
        totalQuestions: 10,
        correctAnswers: 10,
        accuracy: 1.0,
        testedGrammarIds: [],
        failedGrammarIds: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 60,
      });

      const diagnostics = await OfflineSyncManager.inspectStorage();
      expect(diagnostics.tables.ghostCards).toBe(1);
      expect(diagnostics.tables.cramDrills).toBe(1);
    });

    it('StorageDiagnosticsModal renders Ghost Cards and Cram Drills inspection badges', () => {
      const modalHtml = renderToString(
        React.createElement(StorageDiagnosticsModal, {
          isOpen: true,
          onClose: vi.fn(),
        })
      );

      expect(modalHtml).toContain('Ghost Cards');
      expect(modalHtml).toContain('Leech Remediation');
      expect(modalHtml).toContain('Cram Drills');
      expect(modalHtml).toContain('Targeted Practice');
    });
  });

  describe('3. Remediation History & Weakness Drills Hub in TestAnalyticsScreen', () => {
    it('renders the hub title and empty state cleanly when no drills exist', () => {
      const html = renderToString(
        React.createElement(TestAnalyticsScreen, {
          profile: dummyProfile,
          initialData: createDefaultTestAnalyticsSummary(),
          initialWeaknessReport: createDefaultWeaknessReport(),
          initialRemediations: [],
          initialCramDrills: [],
          onLaunchDrill: vi.fn(),
        })
      );

      expect(html).toContain('Remediation History &amp; Weakness Drills (အားနည်းချက် ပြန်လည်လေ့ကျင့်မှု မှတ်တမ်းများ)');
      expect(html).toContain('No past remediation or cram drill records found yet');
      expect(html).toContain('ယခင် ပြန်လည်လေ့ကျင့်ထားသော မှတ်တမ်း မရှိသေးပါ');
    });

    it('renders drill records, localized Burmese date, score/accuracy, and retake button', () => {
      // 1. Remediation plan
      const sampleRemediation: RemediationPlan = {
        id: 'rem_plan_001',
        lessonId: 'n5.l03',
        attemptId: 'att_001',
        createdAt: '2026-10-22T10:00:00Z',
        weakSkills: ['grammar'],
        failedItemIds: ['item_1'],
        exercises: [
          {
            itemId: 'item_1',
            itemType: 'grammar',
            exerciseType: 'cloze',
            prompt: 'Q1',
            answer: 'A1',
            choices: ['A1', 'A2'],
            explanation: 'Test expl',
            completed: true,
          },
          {
            itemId: 'item_2',
            itemType: 'grammar',
            exerciseType: 'cloze',
            prompt: 'Q2',
            answer: 'A2',
            choices: ['A1', 'A2'],
            explanation: 'Test expl 2',
            completed: true,
          },
        ],
        status: 'completed',
        retestRequired: false,
      };

      // 2. Cram drill
      const sampleCram: CramDrillRecord = {
        id: 'cram_drill_history_001',
        category: 'kanji',
        level: 'N2',
        totalQuestions: 10,
        correctAnswers: 8,
        accuracy: 0.8,
        testedGrammarIds: ['k1', 'k2'],
        failedGrammarIds: ['k2'],
        startedAt: '2026-10-22T09:30:00Z',
        completedAt: '2026-10-22T09:35:00Z',
        durationSeconds: 300,
      };

      const mockLaunchDrill = vi.fn();

      const html = renderToString(
        React.createElement(TestAnalyticsScreen, {
          profile: dummyProfile,
          initialData: createDefaultTestAnalyticsSummary(),
          initialWeaknessReport: createDefaultWeaknessReport(),
          initialRemediations: [sampleRemediation],
          initialCramDrills: [sampleCram],
          onLaunchDrill: mockLaunchDrill,
        })
      );

      expect(html).toContain('Remediation History &amp; Weakness Drills (အားနည်းချက် ပြန်လည်လေ့ကျင့်မှု မှတ်တမ်းများ)');
      expect(html).toContain('Kanji');
      expect(html).toContain('ခန်ဂျီ');
      expect(html).toContain('8 / 10');
      expect(html).toContain('80% Clear');
      expect(html).toContain('Retake Drill (ထပ်မံလေ့ကျင့်မည်)');
      expect(html).toContain('Remediation Plan');
      expect(html).toContain('n5.l03');
      // Burmese numeral check (2026 -> ၂၀၂၆)
      expect(html).toContain('၂၀၂၆');
    });

    it('supports camelCase and snake_case backup payloads seamlessly', async () => {
      const camelCaseBackup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        profile: dummyProfile,
        srsCards: [],
        reviewLogs: [],
        masteryRecords: [],
        studySessions: [],
        studyEvents: [],
        ghostCards: [
          {
            id: 'ghost_camel_01',
            parentCardId: 'srs_c1',
            grammarId: 'g_c1',
            sentenceIndex: 0,
            clozeSentence: 'test',
            clozeTarget: 'test',
            nuanceExplanationEn: 'test',
            stage: 1,
            due: new Date().toISOString(),
            conquered: false,
          },
        ],
        cramDrills: [
          {
            id: 'cram_camel_01',
            category: 'mixed_leeches',
            level: 'N2',
            totalQuestions: 5,
            correctAnswers: 5,
            accuracy: 1.0,
            testedGrammarIds: [],
            failedGrammarIds: [],
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationSeconds: 90,
          },
        ],
      };

      const result = await BackupManager.restoreFromJson(JSON.stringify(camelCaseBackup));
      expect(result.success).toBe(true);
      expect(result.stats?.ghostCards).toBe(1);
      expect(result.stats?.cramDrills).toBe(1);

      expect(await db.ghost_cards.count()).toBe(1);
      expect(await db.cram_drills.count()).toBe(1);
    });

    it('verifies BackupManager local snapshot and integrity recovery cycle', async () => {
      await db.ghost_cards.add({
        id: 'ghost_snapshot_test',
        parentCardId: 'srs_s1',
        grammarId: 'g_s1',
        sentenceIndex: 0,
        clozeSentence: 'test',
        clozeTarget: 'test',
        nuanceExplanationEn: 'test',
        stage: 4,
        due: new Date().toISOString(),
        conquered: true,
      });

      await BackupManager.saveLocalSnapshot();
      const snapshot = mockLocalStorage.store['nihongo_n2_local_snapshot'];
      expect(snapshot).toBeDefined();

      const parsed = JSON.parse(snapshot);
      expect(parsed.ghost_cards).toHaveLength(1);
      expect(parsed.ghost_cards[0].id).toBe('ghost_snapshot_test');

      const integrity = await BackupManager.checkIntegrityAndAutoRecover();
      expect(integrity.corrupted).toBe(false);
      expect(integrity.restored).toBe(false);
    });
  });

  describe('4. Quota-Safe Dual-Tier Storage & QuotaExceededError Resilience', () => {
    it('gracefully handles QuotaExceededError during saveLocalSnapshot without throwing uncaught exceptions', async () => {
      await db.ghost_cards.add({
        id: 'ghost_quota_01',
        parentCardId: 'srs_q1',
        grammarId: 'g_q1',
        sentenceIndex: 0,
        clozeSentence: '彼女は____走った。',
        clozeTarget: '速く',
        nuanceExplanationEn: 'Fast',
        stage: 1,
        due: new Date().toISOString(),
        conquered: false,
      });

      // Simulate browser localStorage quota exhausted (DOMException code 22 / QuotaExceededError)
      mockLocalStorage.setItem.mockImplementation((key: string) => {
        if (key === 'nihongo_n2_local_snapshot') {
          const quotaErr = new DOMException('Storage quota exceeded for origin', 'QuotaExceededError');
          throw quotaErr;
        }
      });

      // saveLocalSnapshot should never throw an uncaught exception
      await expect(BackupManager.saveLocalSnapshot()).resolves.not.toThrow();

      // Primary tier in IndexedDB must have the full uncompressed snapshot
      const idbData = await SnapshotIndexedDBStore.getSnapshot();
      expect(idbData).not.toBeNull();
      expect(idbData?.ghost_cards).toHaveLength(1);
      expect(idbData?.ghost_cards?.[0].id).toBe('ghost_quota_01');

      // loadLocalSnapshot must transparently read from IndexedDB primary store
      const loaded = await BackupManager.loadLocalSnapshot();
      expect(loaded).not.toBeNull();
      expect(loaded?.ghost_cards?.[0].id).toBe('ghost_quota_01');
    });

    it('checkIntegrityAndAutoRecover does NOT falsely report corruption when localStorage.setItem throws QuotaExceededError', async () => {
      // Seed healthy database
      await db.profile.put({ ...DEFAULT_USER_PROFILE, id: 'current_user' });
      await db.mastery_records.put({
        lessonId: 'n2.l01',
        state: 'mastered',
        lastTestedAt: new Date().toISOString(),
        drillScores: {},
        stageAttempts: {},
      } as any);

      // Simulate QuotaExceededError during rolling snapshot write
      mockLocalStorage.setItem.mockImplementation((key: string) => {
        if (key === 'nihongo_n2_local_snapshot') {
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
      });

      const result = await BackupManager.checkIntegrityAndAutoRecover();

      // Crucial: Must be healthy (not corrupted) because database read checks succeeded
      expect(result.corrupted).toBe(false);
      expect(result.restored).toBe(false);
    });

    it('auto-recovers from IndexedDB primary snapshot when database is corrupted and localStorage was quota-constrained', async () => {
      // 1. Save valid snapshot while localStorage simulates QuotaExceededError
      await db.profile.put({ ...DEFAULT_USER_PROFILE, id: 'current_user', name: 'RecoveryUser' });
      await db.ghost_cards.add({
        id: 'ghost_recover_99',
        parentCardId: 'srs_99',
        grammarId: 'g_99',
        sentenceIndex: 0,
        clozeSentence: 'test',
        clozeTarget: 'test',
        nuanceExplanationEn: 'test',
        stage: 2,
        due: new Date().toISOString(),
        conquered: false,
      });

      mockLocalStorage.setItem.mockImplementation((key: string) => {
        if (key === 'nihongo_n2_local_snapshot') {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
      });

      await BackupManager.saveLocalSnapshot();

      // Verify IndexedDB has the full backup
      const idbData = await SnapshotIndexedDBStore.getSnapshot();
      expect(idbData?.ghost_cards).toHaveLength(1);

      // 2. Wipe database and simulate database corruption during checkIntegrityAndAutoRecover
      await db.ghost_cards.clear();
      await db.profile.clear();

      vi.spyOn(db.profile, 'toArray').mockRejectedValueOnce(new Error('IndexedDB disk read corruption'));

      // 3. Run integrity check and auto-recovery
      const recovery = await BackupManager.checkIntegrityAndAutoRecover();

      expect(recovery.corrupted).toBe(true);
      expect(recovery.restored).toBe(true);

      // Verify records are restored in IndexedDB
      const restoredGhost = await db.ghost_cards.get('ghost_recover_99');
      expect(restoredGhost).toBeDefined();
      expect(restoredGhost?.id).toBe('ghost_recover_99');

      const restoredProfile = await db.profile.get('current_user');
      expect(restoredProfile?.name).toBe('RecoveryUser');
    });

    it('strips redundant static lessonPacks in localStorage mirror to prevent payload bloat', async () => {
      // Seed lesson packs in db.lesson_packs
      await db.lesson_packs.bulkAdd([
        {
          id: 'n2.l01',
          level: 'N2',
          module: 'Core',
          number: 1,
          status: 'published',
          title: 'Lesson 1',
          vocabularies: [{ id: 'v1', ja: '単語' }],
          grammars: [],
          questions: [],
          stages: [],
        } as any,
      ]);

      await BackupManager.saveLocalSnapshot();

      // Check localStorage mirror: lessonPacks must be stripped to prevent multi-megabyte payload bloat
      const snapshotRaw = mockLocalStorage.store['nihongo_n2_local_snapshot'];
      expect(snapshotRaw).toBeDefined();

      const parsed = JSON.parse(snapshotRaw);
      expect(parsed.lessonPacks).toEqual([]);

      // But IndexedDB primary tier retains the full pack data
      const idbData = await SnapshotIndexedDBStore.getSnapshot();
      expect(idbData?.lessonPacks).toHaveLength(1);
      expect(idbData?.lessonPacks?.[0].id).toBe('n2.l01');
    });
  });
});
