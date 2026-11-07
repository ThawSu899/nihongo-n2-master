/**
 * Local offline token holder and authentication state.
 * Firebase Authentication and Google cloud login have been removed.
 * The application runs entirely as a local offline-first N2 learning platform.
 */
export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    callback(null);
    return () => {};
  },
};

// Workspace OAuth Scopes constant
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

// In-memory token cache
let inMemoryAccessToken: string | null = null;
let grantedScopes: string[] = [];

/**
 * Sign in is disabled in offline-first mode.
 */
export async function signInWithGoogle(_customScopes?: string[]): Promise<never> {
  throw new Error('Google Sign-in and Firebase Authentication have been removed. Nihongo N2 Master runs 100% offline-first.');
}

/**
 * Sign out user and clear in-memory access token
 */
export async function signOutUser(): Promise<void> {
  inMemoryAccessToken = null;
  grantedScopes = [];
}

/**
 * Get current in-memory access token for API calls (if explicitly set)
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
 * Update in-memory token (e.g. from local configuration)
 */
export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function setDriveAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

/**
 * Check if connected (always false in pure offline mode unless explicit token set)
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
