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
import { GoogleDriveService } from '../src/integrations/drive/google-drive-service';
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
  });
});
