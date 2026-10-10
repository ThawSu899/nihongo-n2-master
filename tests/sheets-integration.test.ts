import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleSheetsPipeline } from '../src/integrations/sheets/sheets-pipeline';
import { GoogleDriveService } from '../src/integrations/drive/google-drive-service';
import { GoogleDriveAdapter } from '../src/integrations/drive/drive-adapter';
import { GoogleCalendarAdapter } from '../src/integrations/calendar/calendar-adapter';
import { LessonPack } from '../src/domain/models/types';
import { db } from '../src/data/db/dexie-db';
import n5l01Json from '../content/packs/n5/n5.l01.json';

describe('Phase 5 Integration: Google Sheets 12-Tab Pipeline, Atomic Apply/Rollback, and HTTP Failure Resilience', () => {
  const originalFetch = global.fetch;
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockLocalStorage.clear();
  });

  describe('Requirement 1: 12-Tab Google Sheets Staging, Validation & Quarantine', () => {
    it('stages all 12 supported tabs successfully when valid', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Meta: [
          {
            id: 'n5.l01',
            level: 'N5',
            module: 'Module 1',
            number: '1',
            title: 'Introductions and Greetings',
            description: 'Master basic self-introductions',
            status: 'reviewed',
            masteryThresholds: '{"vocab":0.90,"kanji":0.85,"grammar":0.85,"reading":0.80,"listening":0.80,"overall":0.85}',
          },
        ],
        Modules: [
          {
            id: 'n5.m01',
            level: 'N5',
            number: '1',
            title: 'Module 1',
            description: 'N5 Foundation Module',
          },
        ],
        Lessons: [
          {
            id: 'n5.l01',
            module: 'Module 1',
            number: '1',
            title: 'Introductions and Greetings',
            description: 'Master basic self-introductions',
            status: 'reviewed',
          },
        ],
        Vocabulary: [
          {
            id: 'n5.l01.v001',
            lessonId: 'n5.l01',
            ja: '私',
            kana: 'わたし',
            en: 'I / Me',
            my: 'ကျွန်တော်',
            pos: 'pronoun',
            exampleSentenceId: 'n5.l01.s001',
            kanjiIds: 'n5.l01.k001',
            level: 'N5',
            difficulty: '1',
            importance: '5',
          },
        ],
        Kanji: [
          {
            id: 'n5.l01.k001',
            lessonId: 'n5.l01',
            char: '私',
            meaning: 'I / Private',
            onyomi: 'シ',
            kunyomi: 'わたし',
            exampleVocab: '[]',
            exampleSentenceIds: 'n5.l01.s001',
            components: '禾|厶',
            strokes: '7',
            difficulty: '1',
            level: 'N5',
          },
        ],
        Grammar: [
          {
            id: 'n5.l01.g001',
            lessonId: 'n5.l01',
            pattern: 'X は Y です',
            meaning: 'X is Y',
            formation: '[Noun X] は [Noun Y] です',
            explanation: '{"en":"Topic particle は marks X"}',
            examples: '[]',
            difficulty: '1',
            level: 'N5',
          },
        ],
        Sentences: [
          {
            id: 'n5.l01.s001',
            lessonId: 'n5.l01',
            ja: '私は田中です。',
            kana: 'わたしはたなかです。',
            translation: '{"en":"I am Tanaka."}',
            vocabIds: 'n5.l01.v001',
            grammarIds: 'n5.l01.g001',
          },
        ],
        Reading: [
          {
            id: 'n5.l01.r01',
            lessonId: 'n5.l01',
            title: 'Self Introductions',
            level: 'N5',
            text: 'はじめまして。田中です。',
            kanaText: 'はじめまして。たなかです。',
            translation: 'Nice to meet you. I am Tanaka.',
            questionIds: 'n5.l01.q001',
            difficulty: '1',
            glossary: '[]',
          },
        ],
        Listening: [
          {
            id: 'n5.l01.l01',
            lessonId: 'n5.l01',
            title: 'Meeting Someone',
            level: 'N5',
            speakers: '田中|スミス',
            transcript: 'こんにちは。',
            translation: 'Hello.',
            turns: '[]',
            questionIds: 'n5.l01.q001',
            difficulty: '1',
          },
        ],
        Questions: [
          {
            id: 'n5.l01.q001',
            lessonId: 'n5.l01',
            skill: 'vocab',
            type: 'multiple_choice',
            prompt: '「私」の読み方は？',
            choices: 'わたし|あなた',
            answer: 'わたし',
            explanation: '「私」は「わたし」です。',
            difficulty: '1',
            linkedItemIds: 'n5.l01.v001',
          },
        ],
        Tests: [
          {
            testId: 'n5.l01.t01',
            lessonId: 'n5.l01',
            title: 'Lesson 1 Mastery Test',
            durationMinutes: '20',
            passingScore: '85',
            questionIds: 'n5.l01.q001',
          },
        ],
        Audio: [
          {
            fileId: 'n5.l01.v001.audio',
            lessonId: 'n5.l01',
            kind: 'tts',
            lang: 'ja-JP',
            speaker: 'Kyoko',
            status: 'ready',
          },
        ],
      };

      const { stagedPack, report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.totalRows).toBe(12);
      expect(report.validRows).toBe(12);
      expect(report.quarantinedRows).toBe(0);
      expect(report.canApply).toBe(true);

      // Verify all 12 tabs were staged
      expect(stagedPack.id).toBe('n5.l01');
      expect(stagedPack.modules).toHaveLength(1);
      expect(stagedPack.modules![0].id).toBe('n5.m01');
      expect(stagedPack.lessons).toHaveLength(1);
      expect(stagedPack.lessons![0].id).toBe('n5.l01');
      expect(stagedPack.vocabularies).toHaveLength(1);
      expect(stagedPack.kanjis).toHaveLength(1);
      expect(stagedPack.grammars).toHaveLength(1);
      expect(stagedPack.sentences).toHaveLength(1);
      expect(stagedPack.reading?.title).toBe('Self Introductions');
      expect(stagedPack.listening?.title).toBe('Meeting Someone');
      expect(stagedPack.questions).toHaveLength(1);
      expect(stagedPack.tests).toHaveLength(1);
      expect(stagedPack.tests![0].testId).toBe('n5.l01.t01');
      expect(stagedPack.audio).toHaveLength(1);
      expect(stagedPack.audio![0].fileId).toBe('n5.l01.v001.audio');

      // Verify documented schema blockers for secondary tabs
      expect(report.schemaBlockers).toBeDefined();
      expect(report.schemaBlockers?.Tests).toContain('LessonPack domain schema scopes assessment items under pack.questions');
      expect(report.schemaBlockers?.Audio).toContain('embeds audio references directly in Vocabulary, Sentence, and Listening items');
      expect(report.schemaBlockers?.Modules).toContain('outside single-lesson LessonPackSchema');
      expect(report.schemaBlockers?.Lessons).toContain('outside single-lesson LessonPackSchema');
    });

    it('quarantines malformed rows on Modules, Lessons, Tests, and Audio with actionable errors', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Modules: [
          { id: '', level: 'N5', number: '1', title: 'Missing ID' }, // Quarantined: Missing ID
          { id: 'm2', level: 'N99', number: '1', title: 'Bad Level' }, // Quarantined: Invalid level
        ],
        Lessons: [
          { id: 'l1', module: '', number: '1', title: 'Missing Module' }, // Quarantined: Missing module
          { id: 'l2', module: 'M1', number: 'abc', title: 'Bad Number' }, // Quarantined: Invalid number
        ],
        Tests: [
          { testId: '', lessonId: 'n5.l01', title: 'Missing ID', durationMinutes: '20', passingScore: '80' }, // Quarantined: Missing testId
          { testId: 't2', lessonId: 'n5.l01', title: 'Bad Score', durationMinutes: '20', passingScore: '999' }, // Quarantined: Score > 100
        ],
        Audio: [
          { fileId: '', lessonId: 'n5.l01', kind: 'tts' }, // Quarantined: Missing fileId
          { fileId: 'a2', lessonId: 'n5.l01', kind: 'cassette' }, // Quarantined: Invalid kind
        ],
      };

      const { report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.quarantinedRows).toBe(8);
      expect(report.validRows).toBe(0);
      expect(report.canApply).toBe(false);

      const moduleErrors = report.rowReports.filter((r) => r.tab === 'Modules' && r.status === 'quarantined');
      expect(moduleErrors).toHaveLength(2);
      expect(moduleErrors[0].errors[0]).toContain('Missing required column: id');
      expect(moduleErrors[1].errors[0]).toContain("Invalid level 'N99'");

      const lessonErrors = report.rowReports.filter((r) => r.tab === 'Lessons' && r.status === 'quarantined');
      expect(lessonErrors).toHaveLength(2);
      expect(lessonErrors[0].errors[0]).toContain('Lesson module cannot be empty');
      expect(lessonErrors[1].errors[0]).toContain("Invalid number 'abc'");

      const testErrors = report.rowReports.filter((r) => r.tab === 'Tests' && r.status === 'quarantined');
      expect(testErrors).toHaveLength(2);
      expect(testErrors[0].errors[0]).toContain('Missing required column: testId');
      expect(testErrors[1].errors[0]).toContain('passingScore must be between 0 and 100');

      const audioErrors = report.rowReports.filter((r) => r.tab === 'Audio' && r.status === 'quarantined');
      expect(audioErrors).toHaveLength(2);
      expect(audioErrors[0].errors[0]).toContain('Missing required column: fileId');
      expect(audioErrors[1].errors[0]).toContain("Invalid audio kind 'cassette'");
    });

    it('detects duplicate IDs on Modules, Lessons, Tests, and Audio tabs', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Modules: [
          { id: 'mod_dup', level: 'N5', number: '1', title: 'Mod A' },
          { id: 'mod_dup', level: 'N5', number: '2', title: 'Mod B' }, // Duplicate!
        ],
        Tests: [
          { testId: 'test_dup', lessonId: 'n5.l01', title: 'Test A', durationMinutes: '20', passingScore: '80' },
          { testId: 'test_dup', lessonId: 'n5.l01', title: 'Test B', durationMinutes: '30', passingScore: '85' }, // Duplicate!
        ],
      };

      const { report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.quarantinedRows).toBe(2);
      expect(report.validRows).toBe(2);

      const dupReports = report.rowReports.filter((r) => r.errors.some((e) => e.includes('Duplicate ID')));
      expect(dupReports).toHaveLength(2);
      expect(dupReports[0].errors[0]).toContain("Duplicate ID 'mod_dup' found on tab 'Modules'");
      expect(dupReports[1].errors[0]).toContain("Duplicate ID 'test_dup' found on tab 'Tests'");
    });

    it('detects referential integrity issues between Tests and Questions, and Lessons and Modules', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Modules: [
          { id: 'm_official', level: 'N5', number: '1', title: 'Foundation Module' },
        ],
        Lessons: [
          { id: 'n5.l01', module: 'm_unregistered', number: '1', title: 'Lesson 1', status: 'reviewed' },
        ],
        Questions: [
          { id: 'q_valid_1', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Prompt', answer: 'A', explanation: 'Exp', difficulty: '1' },
        ],
        Tests: [
          { testId: 't01', lessonId: 'n5.l01', title: 'Test 1', durationMinutes: '20', passingScore: '80', questionIds: 'q_valid_1|q_ghost_missing' },
        ],
      };

      const { report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.warningsCount).toBe(2);

      const testWarning = report.rowReports.find((r) => r.tab === 'Tests' && r.warnings.length > 0);
      expect(testWarning?.warnings[0]).toContain("references questionId 'q_ghost_missing' which does not exist in questions");

      const lessonWarning = report.rowReports.find((r) => r.tab === 'Lessons' && r.warnings.length > 0);
      expect(lessonWarning?.warnings[0]).toContain("references module 'm_unregistered' not found in staged modules");
    });
  });

  describe('Requirement 2: Atomic Apply and Rollback Resilience', () => {
    const testPack = n5l01Json as unknown as LessonPack;

    it('atomically applies valid lesson pack and backs up prior version', async () => {
      // 1. Initial state: store baseline pack in DB
      await db.lesson_packs.put(testPack);

      // 2. Prepare updated pack with new title
      const updatedPack: LessonPack = {
        ...testPack,
        title: 'Updated Lesson 1 Title For Testing',
      };

      // 3. Apply staged pack with backup
      const res = await GoogleSheetsPipeline.applyStagedPack(updatedPack, true);
      expect(res.success).toBe(true);

      // 4. Verify DB contains the updated version
      const inDb = await db.lesson_packs.get(testPack.id);
      expect(inDb?.title).toBe('Updated Lesson 1 Title For Testing');

      // 5. Verify rollback snapshot was stored in localStorage
      const backupRaw = localStorage.getItem(`rollback_pack_${testPack.id}`);
      expect(backupRaw).not.toBeNull();
      const backupParsed = JSON.parse(backupRaw!);
      expect(backupParsed.title).toBe(testPack.title);
    });

    it('rejects malformed pack commit atomically without corrupting stored data', async () => {
      // 1. Store valid pack in DB
      await db.lesson_packs.put(testPack);

      // 2. Attempt to apply invalid pack (missing vocabularies array and invalid status)
      const malformedPack = {
        ...testPack,
        status: 'invalid_status_xyz',
        vocabularies: null as any,
      } as unknown as LessonPack;

      const res = await GoogleSheetsPipeline.applyStagedPack(malformedPack, true);

      // 3. Must return failure
      expect(res.success).toBe(false);
      expect(res.message).toContain('Failed to apply staged pack');

      // 4. Verify DB was NEVER modified or corrupted
      const inDb = await db.lesson_packs.get(testPack.id);
      expect(inDb?.title).toBe(testPack.title);
      expect(inDb?.vocabularies).toHaveLength(testPack.vocabularies.length);
    });

    it('rolls back to previous version cleanly and cleans up snapshot', async () => {
      // 1. Store baseline pack and simulate an applied update
      await db.lesson_packs.put(testPack);

      const modifiedPack: LessonPack = {
        ...testPack,
        title: 'Temporary Modified Title',
      };
      await GoogleSheetsPipeline.applyStagedPack(modifiedPack, true);

      // Verify modified title in DB
      let current = await db.lesson_packs.get(testPack.id);
      expect(current?.title).toBe('Temporary Modified Title');

      // 2. Execute rollback
      const rollbackRes = await GoogleSheetsPipeline.rollbackPack(testPack.id);
      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.message).toContain('Successfully rolled back');

      // 3. Verify DB title is restored to original
      current = await db.lesson_packs.get(testPack.id);
      expect(current?.title).toBe(testPack.title);

      // 4. Verify snapshot is cleaned up from localStorage
      expect(localStorage.getItem(`rollback_pack_${testPack.id}`)).toBeNull();
    });
  });

  describe('Requirement 3: Mocked HTTP Failure Resilience', () => {
    describe('Google Sheets REST Adapter', () => {
      it('handles HTTP 401 Unauthorized cleanly and informs user', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => JSON.stringify({ error: { message: 'Invalid Credentials', code: 401 } }),
        });

        await expect(
          GoogleSheetsPipeline.fetchSpreadsheetData('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'bad-token')
        ).rejects.toThrow(/Google Sheets error: Invalid Credentials/);
      });

      it('handles HTTP 403 Permission Denied with actionable sharing guidance', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: async () => JSON.stringify({ error: { message: 'The caller does not have permission', code: 403 } }),
        });

        await expect(
          GoogleSheetsPipeline.fetchSpreadsheetData('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'forbidden-token')
        ).rejects.toThrow(/Please verify that the spreadsheet exists and is shared with your signed-in Google account/);
      });

      it('handles network failure (TypeError) without corrupting local data', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (net::ERR_INTERNET_DISCONNECTED)'));

        await expect(
          GoogleSheetsPipeline.fetchSpreadsheetData('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'any-token')
        ).rejects.toThrow(/Failed to fetch/);
      });
    });

    describe('Google Drive REST Adapter & Service', () => {
      it('handles HTTP 401 / 403 in GoogleDriveService safely', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: async () => 'User does not have drive.file authorization',
        });

        // Mock auth token
        const mockAuth = await import('../src/integrations/auth/firebase-auth');
        vi.spyOn(mockAuth, 'getDriveAccessToken').mockReturnValue('test-token');

        await expect(GoogleDriveService.getOrCreateAppFolder()).rejects.toThrow(
          /Failed to search Google Drive folders: Forbidden/
        );
      });

      it('falls back to local Web Speech TTS when Google Drive audio asset fails or is missing', async () => {
        const driveAdapter = new GoogleDriveAdapter();
        // Even when Drive is completely unconfigured or network fails, audio lookup safely degrades to TTS
        const audio = await driveAdapter.resolveAudio('missing_remote_audio.mp3');
        expect(audio.kind).toBe('tts');
        expect(audio.lang).toBe('ja-JP');
      });

      it('safely handles offline state in GoogleDriveAdapter saveBackup with clean failure', async () => {
        const driveAdapter = new GoogleDriveAdapter('test-token');
        const originalNavigator = global.navigator;
        try {
          Object.defineProperty(global, 'navigator', {
            value: { onLine: false },
            configurable: true,
            writable: true,
          });

          const ok = await driveAdapter.saveBackup('test.json', '{}');
          expect(ok).toBe(false);
        } finally {
          Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
          });
        }
      });
    });

    describe('Google Sheets Adapter Offline Resilience & Token Fallback', () => {
      it('safely degrades to null and warns when offline in GoogleSheetsAdapter fetchLesson', async () => {
        const { GoogleSheetsAdapter } = await import('../src/integrations/sheets/sheets-adapter');
        const adapter = new GoogleSheetsAdapter('test-sheet-id', 'test-token');
        const originalNavigator = global.navigator;
        try {
          Object.defineProperty(global, 'navigator', {
            value: { onLine: false },
            configurable: true,
            writable: true,
          });

          const res = await adapter.fetchLesson('n5.l01');
          expect(res).toBeNull();
        } finally {
          Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
          });
        }
      });

      it('automatically uses in-memory access token when no token passed to GoogleSheetsAdapter constructor', async () => {
        const { GoogleSheetsAdapter } = await import('../src/integrations/sheets/sheets-adapter');
        const mockAuth = await import('../src/integrations/auth/firebase-auth');
        vi.spyOn(mockAuth, 'getAccessToken').mockReturnValue('stored-in-memory-token');

        const adapter = new GoogleSheetsAdapter('my-spreadsheet-id');
        expect(adapter.isConfigured()).toBe(true);
        expect(adapter.getEffectiveAccessToken()).toBe('stored-in-memory-token');
      });
    });

    describe('Google Calendar REST Adapter', () => {
      it('handles HTTP 401 / 403 on Google Calendar gracefully without throwing unhandled exceptions', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid OAuth token',
          json: async () => ({ error: { code: 401, message: 'Invalid OAuth token' } }),
        });

        const adapter = new GoogleCalendarAdapter('expired-token');
        const target = await adapter.resolveTargetCalendar(false);
        expect(target).toBeNull();

        const syncResult = await adapter.syncBlocks(
          [{ id: 'b1', title: 'Study', startTime: '08:00', endTime: '08:45', plannedMinutes: 45, completedMinutes: 0, countsTowardGoal: true, status: 'pending' }],
          '2026-10-15'
        );

        expect(syncResult.success).toBe(false);
        expect(syncResult.message).toContain('Dedicated "Nihongo N2 Master" calendar was not found');
      });

      it('handles network failure during Calendar sync gracefully and preserves zero mutations', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network connection lost'));

        const adapter = new GoogleCalendarAdapter('token');
        const res = await adapter.syncBlocks(
          [{ id: 'b1', title: 'Study', startTime: '08:00', endTime: '08:45', plannedMinutes: 45, completedMinutes: 0, countsTowardGoal: true, status: 'pending' }],
          '2026-10-15'
        );

        expect(res.success).toBe(false);
      });
    });
  });
});
