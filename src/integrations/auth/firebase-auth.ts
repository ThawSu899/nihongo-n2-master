/**
 * Google Identity Services & OAuth2 Token Management
 * Enables Google Drive, Google Sheets, and Google Calendar integrations.
 * Runs offline-first with graceful IndexedDB / local storage fallback when offline.
 */

// Global GIS typing
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }): GoogleTokenClient;
          hasGrantedAllScopes(tokenResponse: GoogleTokenResponse, firstScope: string, ...restScopes: string[]): boolean;
          hasGrantedAnyScope(tokenResponse: GoogleTokenResponse, firstScope: string, ...restScopes: string[]): boolean;
          revoke(accessToken: string, done: () => void): void;
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  hd?: string;
  prompt?: string;
  token_type?: string;
  scope: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

export interface UserAuthProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// Workspace OAuth Scopes constant
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

// In-memory token & scope state
let inMemoryAccessToken: string | null = null;
let grantedScopes: string[] = [];
let currentUser: UserAuthProfile | null = null;
const authListeners = new Set<(user: UserAuthProfile | null) => void>();

/**
 * Auth state listener facade for compatibility
 */
export const auth = {
  get currentUser() {
    return currentUser;
  },
  onAuthStateChanged: (callback: (user: UserAuthProfile | null) => void) => {
    authListeners.add(callback);
    callback(currentUser);
    return () => {
      authListeners.delete(callback);
    };
  },
};

function notifyAuthChange() {
  authListeners.forEach((listener) => {
    try {
      listener(currentUser);
    } catch (e) {
      console.error('[GoogleAuth] Auth listener error:', e);
    }
  });
}

/**
 * Resolves the Google OAuth Client ID from Vite environment or configuration fallback
 */
export function getGoogleClientId(): string {
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (envClientId && typeof envClientId === 'string' && envClientId.trim() !== '') {
    return envClientId.trim();
  }
  return '125414361236-lfa86bkpp0smnf3827r87c2a0pm3lsvb.apps.googleusercontent.com';
}

/**
 * Dynamically loads the Google Identity Services script if not already present
 */
export async function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.accounts?.oauth2) return;

  const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script')));
      }
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
}

/**
 * Requests an OAuth2 access token using Google Identity Services (GIS) Token Client.
 * Enables Drive, Sheets, and Calendar API synchronization when online.
 */
export async function signInWithGoogle(customScopes?: string[]): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Online connection required for Google sign-in.');
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Client ID (VITE_GOOGLE_CLIENT_ID) is not configured.');
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services library is unavailable.');
  }

  const scopes = customScopes && customScopes.length > 0 ? customScopes : [...WORKSPACE_SCOPES];

  return new Promise<string>((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        callback: (response: GoogleTokenResponse) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token received from Google Identity Services.'));
            return;
          }

          setAccessToken(response.access_token);
          if (response.scope) {
            grantedScopes = response.scope.split(' ').map((s) => s.trim()).filter(Boolean);
          } else {
            grantedScopes = scopes;
          }

          currentUser = {
            uid: `google_user_${Date.now()}`,
            displayName: 'Google Connected User',
            email: null,
            photoURL: null,
          };
          notifyAuthChange();

          resolve(response.access_token);
        },
        error_callback: (error: any) => {
          reject(new Error(error?.message || 'Google OAuth authentication failed.'));
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(new Error(`Failed to initialize Google OAuth2 client: ${err?.message || err}`));
    }
  });
}

/**
 * Signs out user, revokes token if possible, and clears in-memory state
 */
export async function signOutUser(): Promise<void> {
  const currentToken = inMemoryAccessToken;
  inMemoryAccessToken = null;
  grantedScopes = [];
  currentUser = null;
  notifyAuthChange();

  if (currentToken && typeof window !== 'undefined' && window.google?.accounts?.oauth2?.revoke) {
    try {
      await new Promise<void>((resolve) => {
        window.google!.accounts.oauth2.revoke(currentToken, () => resolve());
      });
    } catch {
      // Ignore revocation errors on logout
    }
  }
}

/**
 * Get current in-memory access token for API calls
 */
export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Alias for backward compatibility with Drive integration
 */
export function getDriveAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Update in-memory token (e.g. for mock testing or restored state)
 */
export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (token) {
    if (!currentUser) {
      currentUser = {
        uid: 'stored_user',
        displayName: 'Google User',
        email: null,
        photoURL: null,
      };
    }
  } else {
    currentUser = null;
    grantedScopes = [];
  }
  notifyAuthChange();
}

export function setDriveAccessToken(token: string | null): void {
  setAccessToken(token);
}

/**
 * Check if connected (true when valid token is available)
 */
export function isGoogleConnected(): boolean {
  return Boolean(inMemoryAccessToken);
}

/**
 * Check if a specific scope is granted
 */
export function hasScope(scope: string): boolean {
  return grantedScopes.includes(scope);
}

