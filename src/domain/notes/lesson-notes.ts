/**
 * Personal Burmese Lesson Notes & Bookmark System
 * Persists to localStorage under `nihongo_user_notes_v1` and integrates with BackupManager.
 */

export const USER_NOTES_STORAGE_KEY = 'nihongo_user_notes_v1';

export interface UserLessonNote {
  lessonId: string;
  bookmarked?: boolean;
  notes?: string;
  updatedAt?: string;
}

export type UserNotesMap = Record<string, UserLessonNote>;

export function getUserNotes(): UserNotesMap {
  if (typeof globalThis.localStorage === 'undefined') return {};
  try {
    const raw = globalThis.localStorage.getItem(USER_NOTES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUserNotes(notesMap: UserNotesMap): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(USER_NOTES_STORAGE_KEY, JSON.stringify(notesMap));
  } catch (err) {
    console.warn('[saveUserNotes] Failed to persist notes to localStorage:', err);
  }
}

export function getLessonNote(lessonId: string): UserLessonNote {
  const all = getUserNotes();
  return all[lessonId] || { lessonId, bookmarked: false, notes: '' };
}

export function setLessonBookmark(lessonId: string, bookmarked: boolean): UserLessonNote {
  const all = getUserNotes();
  const current = all[lessonId] || { lessonId, bookmarked: false, notes: '' };
  const updated: UserLessonNote = {
    ...current,
    lessonId,
    bookmarked,
    updatedAt: new Date().toISOString(),
  };
  all[lessonId] = updated;
  saveUserNotes(all);
  return updated;
}

export function toggleLessonBookmark(lessonId: string): UserLessonNote {
  const current = getLessonNote(lessonId);
  return setLessonBookmark(lessonId, !current.bookmarked);
}

export function setLessonNoteText(lessonId: string, notes: string): UserLessonNote {
  const all = getUserNotes();
  const current = all[lessonId] || { lessonId, bookmarked: false, notes: '' };
  const updated: UserLessonNote = {
    ...current,
    lessonId,
    notes,
    updatedAt: new Date().toISOString(),
  };
  all[lessonId] = updated;
  saveUserNotes(all);
  return updated;
}

export function hasLessonNotes(lessonId: string): boolean {
  const note = getLessonNote(lessonId);
  return Boolean(note.notes && note.notes.trim().length > 0);
}

export function isLessonBookmarked(lessonId: string): boolean {
  const note = getLessonNote(lessonId);
  return Boolean(note.bookmarked);
}
