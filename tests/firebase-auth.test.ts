import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
  signInWithGoogle,
  signOutUser,
  getAccessToken,
  getDriveAccessToken,
  setAccessToken,
  setDriveAccessToken,
  isGoogleConnected,
  hasScope,
  auth,
  WORKSPACE_SCOPES,
  GoogleTokenResponse,
} from '../src/integrations/auth/firebase-auth';
import { GoogleDriveAdapter } from '../src/integrations/drive/drive-adapter';
import { GoogleSheetsAdapter } from '../src/integrations/sheets/sheets-adapter';
import { GoogleCalendarAdapter } from '../src/integrations/calendar/calendar-adapter';

describe('Google Identity Services (GIS) OAuth2 & Firebase Auth Facade', () => {
  const originalNavigator = global.navigator;

  beforeEach(async () => {
    vi.restoreAllMocks();
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = {};
    }
    if (typeof (globalThis as any).document === 'undefined') {
      (globalThis as any).document = {
        querySelector: vi.fn(),
        createElement: vi.fn(() => ({})),
        head: { appendChild: vi.fn() },
      };
    }
    await signOutUser();
    delete (window as any).google;
  });

  afterEach(async () => {
    await signOutUser();
    if (typeof (globalThis as any).window !== 'undefined') {
      delete (window as any).google;
    }
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  describe('Client ID resolution', () => {
    it('returns a valid Google OAuth Client ID', () => {
      const clientId = getGoogleClientId();
      expect(clientId).toBeDefined();
      expect(typeof clientId).toBe('string');
      expect(clientId.length).toBeGreaterThan(10);
      expect(clientId).toContain('apps.googleusercontent.com');
    });
  });

  describe('In-memory Token & Scope State Management', () => {
    it('initializes in disconnected state', () => {
      expect(getAccessToken()).toBeNull();
      expect(getDriveAccessToken()).toBeNull();
      expect(isGoogleConnected()).toBe(false);
      expect(auth.currentUser).toBeNull();
    });

    it('sets and retrieves access token and notifies auth state listeners', () => {
      const listener = vi.fn();
      const unsubscribe = auth.onAuthStateChanged(listener);

      // Initial call with null
      expect(listener).toHaveBeenCalledWith(null);
      listener.mockClear();

      setAccessToken('test-oauth-token-123');
      expect(getAccessToken()).toBe('test-oauth-token-123');
      expect(getDriveAccessToken()).toBe('test-oauth-token-123');
      expect(isGoogleConnected()).toBe(true);
      expect(auth.currentUser).not.toBeNull();
      expect(auth.currentUser?.displayName).toBe('Google User');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ uid: 'stored_user' }));

      // Setting via setDriveAccessToken
      setDriveAccessToken('test-drive-token-456');
      expect(getAccessToken()).toBe('test-drive-token-456');

      unsubscribe();
    });

    it('clears token and profile on signOutUser and triggers revocation', async () => {
      const revokeMock = vi.fn((_token: string, done: () => void) => done());
      (window as any).google = {
        accounts: {
          oauth2: {
            revoke: revokeMock,
          },
        },
      };

      setAccessToken('token-to-revoke');
      expect(isGoogleConnected()).toBe(true);

      await signOutUser();

      expect(getAccessToken()).toBeNull();
      expect(isGoogleConnected()).toBe(false);
      expect(auth.currentUser).toBeNull();
      expect(revokeMock).toHaveBeenCalledWith('token-to-revoke', expect.any(Function));
    });
  });

  describe('signInWithGoogle via GIS Token Client', () => {
    it('rejects immediately when offline (navigator.onLine === false)', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { ...originalNavigator, onLine: false },
        configurable: true,
        writable: true,
      });

      await expect(signInWithGoogle()).rejects.toThrow(/You appear to be offline/i);
    });

    it('successfully acquires token and scopes when online', async () => {
      let tokenCallback: ((response: GoogleTokenResponse) => void) | null = null;
      const requestAccessTokenMock = vi.fn();

      (window as any).google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(({ callback }) => {
              tokenCallback = callback;
              return {
                requestAccessToken: requestAccessTokenMock.mockImplementation(() => {
                  setTimeout(() => {
                    tokenCallback?.({
                      access_token: 'mock-gis-access-token',
                      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets.readonly',
                      token_type: 'Bearer',
                      expires_in: 3600,
                    });
                  }, 10);
                }),
              };
            }),
          },
        },
      };

      const tokenPromise = signInWithGoogle();
      const token = await tokenPromise;

      expect(token).toBe('mock-gis-access-token');
      expect(getAccessToken()).toBe('mock-gis-access-token');
      expect(isGoogleConnected()).toBe(true);
      expect(hasScope('https://www.googleapis.com/auth/drive.file')).toBe(true);
      expect(hasScope('https://www.googleapis.com/auth/spreadsheets.readonly')).toBe(true);
      expect(hasScope('https://www.googleapis.com/auth/calendar.events')).toBe(false);
      expect(auth.currentUser).not.toBeNull();
    });

    it('handles OAuth error response correctly', async () => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(({ callback }) => ({
              requestAccessToken: () => {
                callback({
                  error: 'access_denied',
                  error_description: 'The user denied request.',
                  scope: '',
                  access_token: '',
                });
              },
            })),
          },
        },
      };

      await expect(signInWithGoogle()).rejects.toThrow('The user denied request.');
    });

    it('handles missing access token in response', async () => {
      (window as any).google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(({ callback }) => ({
              requestAccessToken: () => {
                callback({
                  access_token: '',
                  scope: '',
                });
              },
            })),
          },
        },
      };

      await expect(signInWithGoogle()).rejects.toThrow('No access token received from Google Identity Services.');
    });
  });

  describe('Integration with GoogleDriveAdapter, GoogleSheetsAdapter & CalendarAdapter', () => {
    it('enables GoogleDriveAdapter to use acquired token and save backups when online', async () => {
      setAccessToken('valid-gis-drive-token');

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('drive/v3/files?q=')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ files: [{ id: 'folder-root-id', name: 'Japanese-N2-Master' }] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'file-12345', name: 'nihongo_backup.json' }),
        });
      });
      global.fetch = mockFetch;

      const driveAdapter = new GoogleDriveAdapter();
      expect(driveAdapter.isConfigured()).toBe(true);

      const result = await driveAdapter.saveBackup('nihongo_backup.json', JSON.stringify({ version: '1.0.0' }));

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('drive/v3/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-gis-drive-token',
          }),
        })
      );
    });

    it('GoogleDriveAdapter gracefully returns false and does not crash when offline', async () => {
      setAccessToken('valid-gis-drive-token');

      Object.defineProperty(global, 'navigator', {
        value: { ...originalNavigator, onLine: false },
        configurable: true,
        writable: true,
      });

      const driveAdapter = new GoogleDriveAdapter();
      const result = await driveAdapter.saveBackup('nihongo_backup.json', JSON.stringify({ version: '1.0.0' }));

      expect(result).toBe(false);
    });

    it('enables GoogleSheetsAdapter to use acquired token', () => {
      setAccessToken('valid-gis-sheets-token');
      const sheetsAdapter = new GoogleSheetsAdapter('test-sheet-id');
      expect(sheetsAdapter.isConfigured()).toBe(true);
    });

    it('enables GoogleCalendarAdapter to use acquired token', () => {
      setAccessToken('valid-gis-calendar-token');
      const calendarAdapter = new GoogleCalendarAdapter();
      expect(calendarAdapter.isConfigured()).toBe(true);
      expect(calendarAdapter.getEffectiveAccessToken()).toBe('valid-gis-calendar-token');
    });
  });
});
