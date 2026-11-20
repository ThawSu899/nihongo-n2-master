import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GoogleDriveAutoBackupService,
  AUTO_BACKUP_STORAGE_KEYS,
  DEFAULT_AUTO_BACKUP_INTERVAL_MS,
} from '../src/services/google-drive-auto-backup';
import {
  setAccessToken,
  signOutUser,
  isTokenExpired,
  getTokenExpiresAt,
} from '../src/integrations/auth/firebase-auth';
import { GoogleDriveService } from '../src/integrations/drive/google-drive-service';
import { GoogleDriveAdapter } from '../src/integrations/drive/drive-adapter';
import { BackupManager } from '../src/data/backup/backup-manager';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';
import { UserProfile } from '../src/domain/models/types';

const mockProfile: UserProfile = {
  name: 'Test Student',
  level: 'N2',
  dailyTargetMinutes: 120,
  dayRolloverHour: 4,
  studyStreakDays: 5,
  furiganaMode: 'always',
  explanationLang: 'en',
  showRomaji: false,
  targetRetention: 0.9,
  dailyNewCap: 30,
  dailyReviewCap: 200,
  currentLessonId: 'n2.l01',
  notificationSettings: {
    inApp: true,
    browser: false,
    calendarPopup: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
};

// In-memory localStorage mock for node test runner
const localStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStore[key] ?? null,
  setItem: (key: string, val: string) => {
    localStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete localStore[key];
  },
  clear: () => {
    for (const key of Object.keys(localStore)) {
      delete localStore[key];
    }
  },
};

describe('Google Drive Automatic 24-Hour Backup Scheduler', () => {
  let service: GoogleDriveAutoBackupService;

  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
    vi.spyOn(BackupManager, 'exportToJson').mockResolvedValue('{"version": 2, "test": true}');
    await signOutUser();
    service = GoogleDriveAutoBackupService.getInstance();
    service.resetForTesting();
  });

  afterEach(async () => {
    service.resetForTesting();
    await signOutUser();
    mockLocalStorage.clear();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });
    vi.useRealTimers();
  });

  describe('1. Settings & Persistence', () => {
    it('initializes with default 24-hour interval and disabled by default', () => {
      expect(service.isEnabled()).toBe(false);
      expect(service.getIntervalMs()).toBe(DEFAULT_AUTO_BACKUP_INTERVAL_MS);
      expect(service.getLastSuccessfulBackup()).toBeNull();
      expect(service.getNextScheduledBackup()).toBeNull();
    });

    it('enables and disables scheduler and persists preference across reloads', () => {
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
      expect(mockLocalStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.ENABLED)).toBe('true');

      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
      expect(mockLocalStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.ENABLED)).toBe('false');
    });

    it('allows customizing interval and persists across reloads', () => {
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      service.setIntervalMs(twelveHoursMs);
      expect(service.getIntervalMs()).toBe(twelveHoursMs);
      expect(mockLocalStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.INTERVAL_MS)).toBe(String(twelveHoursMs));
    });
  });

  describe('2. Schedule & Due Calculations', () => {
    it('reports backup due immediately upon enabling if never backed up before (initial backup)', () => {
      service.setEnabled(true);
      expect(service.isBackupDue()).toBe(true);
      expect(service.getNextScheduledBackup()).toBe('Pending initial backup');
    });

    it('calculates next scheduled backup exactly 24 hours after last success', () => {
      const now = new Date('2026-11-20T10:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, now.toISOString());
      service.setEnabled(true);

      const expectedNext = new Date(now.getTime() + DEFAULT_AUTO_BACKUP_INTERVAL_MS).toISOString();
      expect(service.getNextScheduledBackup()).toBe(expectedNext);
      expect(service.isBackupDue()).toBe(false);

      // Fast-forward 23 hours -> still not due
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);
      expect(service.isBackupDue()).toBe(false);

      // Fast-forward 1 more hour (24 hours total) -> due now
      vi.advanceTimersByTime(1 * 60 * 60 * 1000 + 1000);
      expect(service.isBackupDue()).toBe(true);
    });

    it('identifies overdue backup after application restart when last success > 24 hours ago', () => {
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, pastTime);
      service.setEnabled(true);

      expect(service.isBackupDue()).toBe(true);
    });
  });

  describe('3. Execution & Google Drive Upload Pipeline', () => {
    it('successfully uploads automatic backup, updates last success time, and preserves separate auto-backup file', async () => {
      setAccessToken('mock_valid_token_123', 3600);
      // Set recent success so setEnabled doesn't trigger initial background run prematurely
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      const uploadSpy = vi.spyOn(GoogleDriveService, 'uploadAutoBackup').mockResolvedValue({
        id: 'auto_file_id_999',
        name: 'nihongo-n2-master-auto-backup.json',
      });
      const exportSpy = vi.spyOn(BackupManager, 'exportToJson').mockResolvedValue('{"version": 2, "test": true}');

      const success = await service.triggerBackup();

      expect(success).toBe(true);
      expect(exportSpy).toHaveBeenCalled();
      expect(uploadSpy).toHaveBeenCalledWith('{"version": 2, "test": true}', 'mock_valid_token_123');

      const lastSuccess = service.getLastSuccessfulBackup();
      expect(lastSuccess).not.toBeNull();
      expect(service.getStatus().state).toBe('success');
      expect(service.getStatus().lastError).toBeNull();
    });

    it('prevents concurrent duplicate backup uploads while inProgress is true', async () => {
      setAccessToken('mock_valid_token_123', 3600);
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      let finishUpload: (val: any) => void = () => {};
      const pendingPromise = new Promise((resolve) => {
        finishUpload = resolve;
      });

      vi.spyOn(GoogleDriveService, 'uploadAutoBackup').mockReturnValue(pendingPromise as any);

      // Start first backup (will stay pending)
      const firstRunPromise = service.triggerBackup();
      expect(service.getStatus().inProgress).toBe(true);

      // Attempt second concurrent backup
      const secondRunResult = await service.triggerBackup();
      expect(secondRunResult).toBe(false);

      // Resolve first run
      finishUpload({ id: 'file_1', name: 'auto.json' });
      const firstResult = await firstRunPromise;
      expect(firstResult).toBe(true);
      expect(service.getStatus().inProgress).toBe(false);
    });

    it('does NOT update lastSuccessfulBackup when Google Drive upload fails', async () => {
      setAccessToken('mock_valid_token_123', 3600);
      const previousSuccessTime = '2026-11-19T00:00:00.000Z';
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, previousSuccessTime);

      vi.spyOn(GoogleDriveService, 'uploadAutoBackup').mockRejectedValue(new Error('Network upload failed 500'));

      const success = await service.triggerBackup();

      expect(success).toBe(false);
      // Last successful backup must remain untouched!
      expect(service.getLastSuccessfulBackup()).toBe(previousSuccessTime);
      expect(service.getStatus().state).toBe('error');
      expect(service.getStatus().lastError).toContain('Network upload failed 500');
    });
  });

  describe('4. OAuth Security & Token Lifecycle', () => {
    it('tracks token expiration in memory and correctly identifies expired token', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Token expires in 600 seconds (10 minutes)
      setAccessToken('test_token_abc', 600);

      expect(isTokenExpired()).toBe(false);
      expect(getTokenExpiresAt()).toBe(now + 600 * 1000);

      // Fast forward 9.5 minutes (within the 1 minute safety buffer)
      vi.advanceTimersByTime(9.5 * 60 * 1000);
      expect(isTokenExpired()).toBe(true);
    });

    it('pauses backup and transitions to auth_required when token is missing or expired without triggering popups', async () => {
      await signOutUser();
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      const uploadSpy = vi.spyOn(GoogleDriveService, 'uploadAutoBackup');

      const success = await service.triggerBackup();

      expect(success).toBe(false);
      expect(uploadSpy).not.toHaveBeenCalled();
      expect(service.getStatus().state).toBe('auth_required');
      expect(service.getStatus().lastError).toContain('Google Account is not connected');
    });

    it('handles Google 401/403 API responses by setting auth_required state', async () => {
      setAccessToken('expired_token_401', 3600);
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      vi.spyOn(GoogleDriveService, 'uploadAutoBackup').mockRejectedValue(
        new Error('Google authentication expired or invalid (401)')
      );

      const success = await service.triggerBackup();

      expect(success).toBe(false);
      expect(service.getStatus().state).toBe('auth_required');
    });

    it('resumes from auth_required when user re-authorizes via auth.onAuthStateChanged', async () => {
      service.init();
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      // Trigger unauthenticated run
      await service.triggerBackup();
      expect(service.getStatus().state).toBe('auth_required');

      vi.spyOn(GoogleDriveService, 'uploadAutoBackup').mockResolvedValue({
        id: 'file_reauth',
        name: 'nihongo-n2-master-auto-backup.json',
      });

      // Simulate user signing in with Google
      setAccessToken('fresh_token_after_reauth', 3600);

      expect(service.getStatus().state).not.toBe('auth_required');
    });
  });

  describe('5. Offline & Network Resilience', () => {
    it('pauses backup when navigator.onLine is false without updating lastSuccessfulBackup', async () => {
      setAccessToken('mock_valid_token_123', 3600);
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, new Date().toISOString());
      service.setEnabled(true);

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true,
      });

      const uploadSpy = vi.spyOn(GoogleDriveService, 'uploadAutoBackup');

      const success = await service.triggerBackup();

      expect(success).toBe(false);
      expect(uploadSpy).not.toHaveBeenCalled();
      expect(service.getStatus().state).toBe('offline');
      expect(service.getStatus().lastError).toContain('Browser is currently offline');

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        configurable: true,
        writable: true,
      });
    });
  });

  describe('6. Separation of Automatic & Manual Backup Files', () => {
    it('verifies automatic backup uses dedicated filename and cache key distinct from manual backup', async () => {
      setAccessToken('token_separation_test', 3600);

      // Verify GoogleDriveService constants
      expect(GoogleDriveService.AUTO_BACKUP_FILENAME).toBe('nihongo-n2-master-auto-backup.json');
      expect(GoogleDriveService.BACKUP_FILENAME).toBe('nihongo-n2-master-backup.json');
      expect(GoogleDriveService.AUTO_BACKUP_FILE_ID_KEY).toBe('google_drive_auto_backup_file_id');
      expect(GoogleDriveService.BACKUP_FILE_ID_KEY).toBe('google_drive_backup_file_id');

      // Mock fetch
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/drive/v3/files?q=')) {
          // ensureAppFolder search
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [{ id: 'app_folder_id' }] }),
          } as Response;
        }
        if (urlStr.includes('/upload/drive/v3/files?uploadType=multipart')) {
          // Multipart upload check
          const bodyStr = String(init.body);
          if (bodyStr.includes(GoogleDriveService.AUTO_BACKUP_FILENAME)) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ id: 'new_auto_file_id', name: GoogleDriveService.AUTO_BACKUP_FILENAME }),
            } as Response;
          }
          if (bodyStr.includes(GoogleDriveService.BACKUP_FILENAME)) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ id: 'new_manual_file_id', name: GoogleDriveService.BACKUP_FILENAME }),
            } as Response;
          }
        }
        return { ok: false, status: 404, text: async () => 'Not found' } as Response;
      });

      // 1. Run Auto Backup
      await GoogleDriveService.uploadAutoBackup('{"auto": true}', 'token_separation_test');
      expect(mockLocalStorage.getItem(GoogleDriveService.AUTO_BACKUP_FILE_ID_KEY)).toBe('new_auto_file_id');
      expect(mockLocalStorage.getItem(GoogleDriveService.BACKUP_FILE_ID_KEY)).toBeNull();

      // 2. Run Manual Backup
      await GoogleDriveService.uploadBackup('{"manual": true}', undefined, 'token_separation_test');
      expect(mockLocalStorage.getItem(GoogleDriveService.BACKUP_FILE_ID_KEY)).toBe('new_manual_file_id');
      expect(mockLocalStorage.getItem(GoogleDriveService.AUTO_BACKUP_FILE_ID_KEY)).toBe('new_auto_file_id');

      fetchSpy.mockRestore();
    });

    it('ensures existing manual GoogleDriveAdapter saveBackup and getBackup work without regression', async () => {
      setAccessToken('token_adapter_test', 3600);
      const adapter = new GoogleDriveAdapter();

      const uploadSpy = vi.spyOn(GoogleDriveService, 'uploadBackup').mockResolvedValue({
        id: 'manual_adapter_file',
        name: 'manual.json',
      });
      const downloadSpy = vi.spyOn(GoogleDriveService, 'downloadBackup').mockResolvedValue('{"restored": true}');

      const saveOk = await adapter.saveBackup('manual.json', '{"test": 1}');
      expect(saveOk).toBe(true);
      expect(uploadSpy).toHaveBeenCalledWith('{"test": 1}', 'manual.json', 'token_adapter_test');

      const restored = await adapter.getBackup('manual_adapter_file');
      expect(restored).toBe('{"restored": true}');
      expect(downloadSpy).toHaveBeenCalledWith('manual_adapter_file', 'token_adapter_test');
    });
  });

  describe('7. SettingsScreen UI Integration', () => {
    it('renders Automatic Cloud Backup card in SettingsScreen with schedule, status, and toggle', () => {
      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: mockProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain('Automatic Cloud Backup (24-Hour Schedule)');
      expect(html).toContain('Last Auto Backup:');
      expect(html).toContain('Next Scheduled Backup:');
      expect(html).toContain('Disabled');
    });

    it('renders active status and next scheduled backup when enabled', () => {
      setAccessToken('mock_auth_token_for_ui', 3600);
      const mockSuccessTime = '2026-11-20T08:00:00.000Z';
      mockLocalStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, mockSuccessTime);
      service.setEnabled(true);

      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: mockProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain('Automatic Cloud Backup (24-Hour Schedule)');
      expect(html).toContain('Active (24h)');
    });
  });
});
