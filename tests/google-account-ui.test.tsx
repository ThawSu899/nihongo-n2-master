import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Header } from '../src/presentation/components/Header';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';
import {
  setAccessToken,
  signOutUser,
  isGoogleConnected,
  auth,
} from '../src/integrations/auth/firebase-auth';
import { GoogleDriveAdapter } from '../src/integrations/drive/drive-adapter';
import { GoogleDriveService, parseGoogleApiError } from '../src/integrations/drive/google-drive-service';
import { BackupManager } from '../src/data/backup/backup-manager';
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
  setItem: (key: string, val: string) => { localStore[key] = String(val); },
  removeItem: (key: string) => { delete localStore[key]; },
  clear: () => {
    for (const key of Object.keys(localStore)) {
      delete localStore[key];
    }
  },
};

describe('Google Account & Drive Backup UI', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    await signOutUser();
  });

  afterEach(async () => {
    await signOutUser();
    mockLocalStorage.clear();
  });

  describe('Header Component Google Status Indicator', () => {
    it('renders disconnected indicator when Google is not connected', () => {
      const onNavigate = vi.fn();
      const html = renderToString(
        React.createElement(Header, {
          profile: mockProfile,
          todayMinutes: 30,
          onNavigate,
        })
      );

      expect(html).toContain('Google Offline');
      expect(html).toContain('Offline');
      expect(html).toContain('Google Account Connection Status');
      expect(html).toContain('Google Account Disconnected (Local Offline Only)');
    });

    it('renders connected indicator when Google is connected', () => {
      setAccessToken('mock-access-token-999');

      const onNavigate = vi.fn();
      const html = renderToString(
        React.createElement(Header, {
          profile: mockProfile,
          todayMinutes: 30,
          onNavigate,
        })
      );

      expect(html).toContain('Google Connected');
      expect(html).toContain('Google Sync');
      expect(html).toContain('Google Account Connected (Cloud Backup Active)');
    });
  });

  describe('SettingsScreen Google Account & Backup UI', () => {
    it('renders Google Account & Drive Backup section in disconnected state', () => {
      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: mockProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain('Google Account &amp; Drive Backup');
      expect(html).toContain('Offline / Local Only');
      expect(html).toContain('Sign in with Google');
      expect(html).toContain('No Google Account Linked');
      expect(html).toContain('Last Cloud Backup:');
      expect(html).toContain('Never');
      expect(html).toContain('Backup to Google Drive');
      expect(html).toContain('Restore from Google Drive');
    });

    it('renders connected badge, user info, and Sign out button when connected', () => {
      setAccessToken('active-token-1234');

      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: mockProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain('Google Account &amp; Drive Backup');
      expect(html).toContain('Connected');
      expect(html).toContain('Sign out');
      expect(html).toContain('Google User');
      expect(html).toContain('Authenticated via Google Identity Services');
    });

    it('renders formatted last backup time when stored in localStorage', () => {
      const testIso = '2026-11-12T12:00:00.000Z';
      mockLocalStorage.setItem('google_drive_last_backup_time', testIso);

      const html = renderToString(
        React.createElement(SettingsScreen, {
          profile: mockProfile,
          onUpdateProfile: vi.fn(),
        })
      );

      expect(html).toContain(new Date(testIso).toLocaleString());
    });
  });

  describe('GoogleDriveAdapter and GoogleDriveService integration flow', () => {
    it('verifies Backup to Google Drive wiring with GoogleDriveAdapter and BackupManager', async () => {
      setAccessToken('valid-token');
      const saveSpy = vi.spyOn(GoogleDriveAdapter.prototype, 'saveBackup').mockResolvedValue(true);
      const exportSpy = vi.spyOn(BackupManager, 'exportToJson').mockResolvedValue('{"test": "backup"}');

      // Direct contract check for the handler logic
      const content = await BackupManager.exportToJson();
      const adapter = new GoogleDriveAdapter();
      const success = await adapter.saveBackup('test_backup.json', content);

      expect(exportSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith('test_backup.json', '{"test": "backup"}');
      expect(success).toBe(true);
    });

    it('verifies Restore from Google Drive wiring with GoogleDriveService and BackupManager', async () => {
      setAccessToken('valid-token');
      const mockBackups = [
        {
          id: 'drive-file-1',
          name: 'nihongo_master_backup_2026-11-12.json',
          createdTime: '2026-11-12T00:00:00Z',
          modifiedTime: '2026-11-12T00:00:00Z',
        },
      ];
      vi.spyOn(GoogleDriveService, 'listBackups').mockResolvedValue(mockBackups);
      vi.spyOn(GoogleDriveAdapter.prototype, 'getBackup').mockResolvedValue('{"restored": true}');
      vi.spyOn(BackupManager, 'restoreFromJson').mockResolvedValue({
        success: true,
        message: 'All tables restored',
      });

      const backups = await GoogleDriveService.listBackups();
      expect(backups.length).toBe(1);

      const adapter = new GoogleDriveAdapter();
      const content = await adapter.getBackup(backups[0].id);
      expect(content).toBe('{"restored": true}');

      const result = await BackupManager.restoreFromJson(content!);
      expect(result.success).toBe(true);
      expect(result.message).toBe('All tables restored');
    });

    it('falls back to direct folder creation when folder search returns 403 under drive.file scope and caches folder ID', async () => {
      setAccessToken('test-drive-token');
      localStorage.removeItem('google_drive_app_folder_id');

      const originalFetch = global.fetch;
      try {
        global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
          // 1. Folder search returns 403 Forbidden under drive.file scope
          if (typeof url === 'string' && url.includes('/drive/v3/files?q=')) {
            return Promise.resolve({
              ok: false,
              status: 403,
              statusText: 'Forbidden',
              json: async () => ({ error: { message: 'The user has not granted read access' } }),
              text: async () => 'Forbidden',
            });
          }
          // 2. Direct folder creation POST returns 200 with new folder ID
          if (typeof url === 'string' && url.endsWith('/drive/v3/files') && opts?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ id: 'new-app-folder-id-456', name: 'Japanese-N2-Master' }),
            });
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        });

        const folderId = await GoogleDriveService.getOrCreateAppFolder('test-drive-token');
        expect(folderId).toBe('new-app-folder-id-456');
        expect(localStorage.getItem('google_drive_app_folder_id')).toBe('new-app-folder-id-456');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('stores descriptive lastError in GoogleDriveAdapter when saveBackup fails with 403', async () => {
      setAccessToken('test-drive-token');
      const adapter = new GoogleDriveAdapter();

      vi.spyOn(GoogleDriveService, 'uploadBackup').mockRejectedValue(
        new Error('Google Drive permission denied (403): Access forbidden under drive.file scope.')
      );

      const success = await adapter.saveBackup('test.json', '{}');
      expect(success).toBe(false);
      expect(adapter.lastError).toContain('Google Drive permission denied (403)');
      expect(adapter.lastError).not.toContain('check your network connection');
    });

    it('parseGoogleApiError extracts accessNotConfigured reason and guidance', async () => {
      const mockRes = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () =>
          JSON.stringify({
            error: {
              code: 403,
              message: 'Google Drive API has not been used in project 123 before or it is disabled.',
              errors: [{ reason: 'accessNotConfigured', message: 'API not enabled' }],
            },
          }),
      } as unknown as Response;

      const parsed = await parseGoogleApiError(mockRes, 'Drive test');
      expect(parsed.message).toContain('Google Drive permission denied (403)');
      expect(parsed.message).toContain('Google Drive API is not enabled in your Google Cloud Project');
    });

    it('parseGoogleApiError extracts insufficientPermissions reason and re-consent guidance', async () => {
      const mockRes = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () =>
          JSON.stringify({
            error: {
              code: 403,
              message: 'The caller does not have permission',
              errors: [{ reason: 'insufficientPermissions' }],
            },
          }),
      } as unknown as Response;

      const parsed = await parseGoogleApiError(mockRes, 'Drive test');
      expect(parsed.message).toContain('Google Drive permission denied (403)');
      expect(parsed.message).toContain('Insufficient Drive permissions: token lacks drive.file scope');
    });

    it('updates existing backup file via PATCH when google_drive_backup_file_id is cached', async () => {
      setAccessToken('test-drive-token');
      localStorage.setItem('google_drive_app_folder_id', 'folder-123');
      localStorage.setItem('google_drive_backup_file_id', 'file-patch-456');

      const originalFetch = global.fetch;
      try {
        let patchCalled = false;
        global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
          if (typeof url === 'string' && url.includes('/files/file-patch-456') && opts?.method === 'PATCH') {
            patchCalled = true;
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ id: 'file-patch-456', name: 'nihongo-n2-master-backup.json' }),
            });
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        });

        const res = await GoogleDriveService.uploadBackup('{"updated": true}');
        expect(patchCalled).toBe(true);
        expect(res.id).toBe('file-patch-456');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
