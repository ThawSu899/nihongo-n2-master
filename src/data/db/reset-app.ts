import { db, ensureInitialProfile } from './dexie-db';

export interface ResetAppOptions {
  /**
   * If true, preserves pre-cached lesson pack JSON files in IndexedDB
   * so offline bundles do not need to re-download. Defaults to false (full wipe).
   */
  preservePacksCache?: boolean;
}

/**
 * Completely clears all user learning progress, SRS tracker data, assessments,
 * mastery logs, and local/session settings to reset the application to Day 1.
 */
export async function resetApplicationData(options?: ResetAppOptions): Promise<void> {
  // 1. Clear all Dexie IndexedDB tables
  for (const table of db.tables) {
    if (options?.preservePacksCache && table.name === 'lesson_packs') {
      continue;
    }
    await table.clear();
  }

  // 2. Re-initialize baseline user profile so the app is immediately usable
  await ensureInitialProfile();

  // 3. Clear all browser storage items
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage during reset:', e);
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear sessionStorage during reset:', e);
    }
  }
}
