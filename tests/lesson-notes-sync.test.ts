import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  USER_NOTES_STORAGE_KEY,
  getUserNotes,
  saveUserNotes,
  getLessonNote,
  setLessonBookmark,
  toggleLessonBookmark,
  setLessonNoteText,
  hasLessonNotes,
  isLessonBookmarked,
} from '../src/domain/notes/lesson-notes';
import { BackupManager, BackupData } from '../src/data/backup/backup-manager';
import { db } from '../src/data/db/dexie-db';

describe('Personal Burmese Notes & Bookmark System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly uses the specified storage key', () => {
    expect(USER_NOTES_STORAGE_KEY).toBe('nihongo_user_notes_v1');
  });

  it('saves and retrieves lesson notes and bookmark status', () => {
    const lessonId = 'n5-l01';

    expect(isLessonBookmarked(lessonId)).toBe(false);
    expect(hasLessonNotes(lessonId)).toBe(false);

    // Toggle bookmark on
    const updated = toggleLessonBookmark(lessonId);
    expect(updated.bookmarked).toBe(true);
    expect(isLessonBookmarked(lessonId)).toBe(true);

    // Set notes text
    setLessonNoteText(lessonId, '〜は〜です သဒ္ဒါ ရှင်းပြချက် မှတ်စု');
    expect(hasLessonNotes(lessonId)).toBe(true);

    const saved = getLessonNote(lessonId);
    expect(saved.bookmarked).toBe(true);
    expect(saved.notes).toBe('〜は〜です သဒ္ဒါ ရှင်းပြချက် မှတ်စု');

    // Toggle bookmark off
    toggleLessonBookmark(lessonId);
    expect(isLessonBookmarked(lessonId)).toBe(false);
    expect(getLessonNote(lessonId).notes).toBe('〜は〜です သဒ္ဒါ ရှင်းပြချက် မှတ်စု');
  });

  it('integrates personal notes into BackupManager full export and JSON export', async () => {
    // Seed personal notes in localStorage
    const sampleNotes = {
      'n5-l01': {
        lessonId: 'n5-l01',
        bookmarked: true,
        notes: 'N5 Lesson 1 Notes in Burmese',
        updatedAt: new Date().toISOString(),
      },
      'n2-l15': {
        lessonId: 'n2-l15',
        bookmarked: false,
        notes: '〜に際して (On the occasion of)',
        updatedAt: new Date().toISOString(),
      },
    };
    localStorage.setItem(USER_NOTES_STORAGE_KEY, JSON.stringify(sampleNotes));

    const fullBackup = await BackupManager.exportFullBackup();
    expect(fullBackup.userNotes).toBeDefined();
    expect(fullBackup.userNotes?.['n5-l01']?.bookmarked).toBe(true);
    expect(fullBackup.userNotes?.['n5-l01']?.notes).toBe('N5 Lesson 1 Notes in Burmese');
    expect(fullBackup.userNotes?.['n2-l15']?.notes).toBe('〜に際して (On the occasion of)');

    const jsonExport = await BackupManager.exportToJson();
    expect(jsonExport).toContain('N5 Lesson 1 Notes in Burmese');
    expect(jsonExport).toContain('〜に際して (On the occasion of)');
  });

  it('restores personal notes into localStorage on BackupManager.restoreFromJson()', async () => {
    localStorage.clear();
    expect(localStorage.getItem(USER_NOTES_STORAGE_KEY)).toBeNull();

    const mockBackup: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile: { id: 'current_user', level: 'N5' },
      srsCards: [],
      reviewLogs: [],
      masteryRecords: [],
      studySessions: [],
      studyEvents: [],
      userNotes: {
        'n4-l05': {
          lessonId: 'n4-l05',
          bookmarked: true,
          notes: 'Restored N4 Lesson 5 notes',
          updatedAt: new Date().toISOString(),
        },
      },
    };

    const restoreResult = await BackupManager.restoreFromJson(JSON.stringify(mockBackup));
    expect(restoreResult.success).toBe(true);

    const restoredRaw = localStorage.getItem(USER_NOTES_STORAGE_KEY);
    expect(restoredRaw).not.toBeNull();
    const parsed = JSON.parse(restoredRaw!);
    expect(parsed['n4-l05']?.bookmarked).toBe(true);
    expect(parsed['n4-l05']?.notes).toBe('Restored N4 Lesson 5 notes');
  });
});
