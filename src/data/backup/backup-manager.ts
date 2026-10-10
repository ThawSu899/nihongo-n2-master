import { db } from '../db/dexie-db';

export interface BackupData {
  version: number;
  exportedAt: string;
  profile: any;
  srsCards: any[];
  reviewLogs: any[];
  masteryRecords: any[];
  studySessions: any[];
  studyEvents: any[];
}

export class BackupManager {
  private static SNAPSHOT_KEY = 'nihongo_n2_local_snapshot';
  private static QUARANTINE_KEY = 'nihongo_n2_quarantined_corrupt';

  static async exportToJson(): Promise<string> {
    const profile = await db.profile.get('current_user');
    const srsCards = await db.srs_cards.toArray();
    const reviewLogs = await db.review_logs.toArray();
    const masteryRecords = await db.mastery_records.toArray();
    const studySessions = await db.study_sessions.toArray();
    const studyEvents = await db.study_events.toArray();

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      srsCards,
      reviewLogs,
      masteryRecords,
      studySessions,
      studyEvents,
    };

    return JSON.stringify(backup, null, 2);
  }

  static async saveLocalSnapshot(): Promise<void> {
    try {
      const json = await this.exportToJson();
      localStorage.setItem(this.SNAPSHOT_KEY, json);
    } catch (e) {
      console.warn('Failed to save rolling local snapshot:', e);
    }
  }

  static async restoreFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const backup: BackupData = JSON.parse(jsonString);
      if (!backup.version || !backup.exportedAt) {
        throw new Error('Invalid backup file structure: missing version or timestamp.');
      }

      await db.transaction(
        'rw',
        [db.profile, db.srs_cards, db.review_logs, db.mastery_records, db.study_sessions, db.study_events],
        async () => {
          if (backup.profile) {
            await db.profile.put(backup.profile);
          }
          if (backup.srsCards?.length) {
            await db.srs_cards.clear();
            await db.srs_cards.bulkAdd(backup.srsCards);
          }
          if (backup.reviewLogs?.length) {
            await db.review_logs.clear();
            await db.review_logs.bulkAdd(backup.reviewLogs);
          }
          if (backup.masteryRecords?.length) {
            await db.mastery_records.clear();
            await db.mastery_records.bulkAdd(backup.masteryRecords);
          }
          if (backup.studySessions?.length) {
            await db.study_sessions.clear();
            await db.study_sessions.bulkAdd(backup.studySessions);
          }
          if (backup.studyEvents?.length) {
            await db.study_events.clear();
            await db.study_events.bulkAdd(backup.studyEvents);
          }
        }
      );

      return { success: true, message: 'Data successfully restored from backup.' };
    } catch (err: any) {
      return { success: false, message: `Restore failed: ${err.message}` };
    }
  }

  static async checkIntegrityAndAutoRecover(): Promise<{ corrupted: boolean; restored: boolean }> {
    try {
      // Basic read check
      await db.profile.toArray();
      await db.mastery_records.toArray();
      await db.srs_cards.toArray();
      // Periodically take snapshot
      await this.saveLocalSnapshot();
      return { corrupted: false, restored: false };
    } catch (err) {
      console.error('Database integrity check failed! Attempting recovery from snapshot...', err);
      // Quarantine
      const snapshot = localStorage.getItem(this.SNAPSHOT_KEY);
      if (snapshot) {
        localStorage.setItem(this.QUARANTINE_KEY, `corrupted_at_${new Date().toISOString()}`);
        await this.restoreFromJson(snapshot);
        return { corrupted: true, restored: true };
      }
      return { corrupted: true, restored: false };
    }
  }
}
