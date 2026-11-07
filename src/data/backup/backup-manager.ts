import { db } from '../db/dexie-db';
import type { GhostCardRecord, CramDrillRecord } from '../../domain/models/types';

export interface BackupData {
  version: number;
  exportedAt: string;
  profile: any;
  srsCards: any[];
  reviewLogs: any[];
  masteryRecords: any[];
  studySessions: any[];
  studyEvents: any[];
  lessonPacks?: any[];
  kanaRecords?: any[];
  assessments?: any[];
  remediations?: any[];
  aiNotes?: any[];
  ghost_cards?: GhostCardRecord[] | any[];
  ghostCards?: GhostCardRecord[] | any[];
  cram_drills?: CramDrillRecord[] | any[];
  cramDrills?: CramDrillRecord[] | any[];
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
    const lessonPacks = await db.lesson_packs.toArray();
    const kanaRecords = await db.kana_records.toArray();
    const assessments = await db.assessments.toArray();
    const remediations = await db.remediations.toArray();
    const aiNotes = await db.ai_notes.toArray();
    const ghostCards = await db.ghost_cards.toArray();
    const cramDrills = await db.cram_drills.toArray();

    const backup: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile,
      srsCards,
      reviewLogs,
      masteryRecords,
      studySessions,
      studyEvents,
      lessonPacks,
      kanaRecords,
      assessments,
      remediations,
      aiNotes,
      ghost_cards: ghostCards,
      ghostCards: ghostCards,
      cram_drills: cramDrills,
      cramDrills: cramDrills,
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

  static async restoreFromJson(jsonString: string): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> {
    try {
      const backup: BackupData = JSON.parse(jsonString);
      if (!backup.version || !backup.exportedAt) {
        throw new Error('Invalid backup file structure: missing version or timestamp.');
      }

      const ghostCardsList = backup.ghost_cards || backup.ghostCards || [];
      const cramDrillsList = backup.cram_drills || backup.cramDrills || [];

      const stats: Record<string, number> = {
        srsCards: backup.srsCards?.length || 0,
        masteryRecords: backup.masteryRecords?.length || 0,
        reviewLogs: backup.reviewLogs?.length || 0,
        studySessions: backup.studySessions?.length || 0,
        kanaRecords: backup.kanaRecords?.length || 0,
        assessments: backup.assessments?.length || 0,
        ghostCards: ghostCardsList.length,
        cramDrills: cramDrillsList.length,
      };

      await db.transaction(
        'rw',
        [
          db.profile,
          db.srs_cards,
          db.review_logs,
          db.mastery_records,
          db.study_sessions,
          db.study_events,
          db.lesson_packs,
          db.kana_records,
          db.assessments,
          db.remediations,
          db.ai_notes,
          db.ghost_cards,
          db.cram_drills,
        ],
        async () => {
          if (backup.profile) {
            await db.profile.put({ ...backup.profile, id: 'current_user' });
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
          if (backup.lessonPacks?.length) {
            await db.lesson_packs.clear();
            await db.lesson_packs.bulkAdd(backup.lessonPacks);
          }
          if (backup.kanaRecords?.length) {
            await db.kana_records.clear();
            await db.kana_records.bulkAdd(backup.kanaRecords);
          }
          if (backup.assessments?.length) {
            await db.assessments.clear();
            await db.assessments.bulkAdd(backup.assessments);
          }
          if (backup.remediations?.length) {
            await db.remediations.clear();
            await db.remediations.bulkAdd(backup.remediations);
          }
          if (backup.aiNotes?.length) {
            await db.ai_notes.clear();
            await db.ai_notes.bulkAdd(backup.aiNotes);
          }
          if (ghostCardsList.length) {
            await db.ghost_cards.clear();
            await db.ghost_cards.bulkAdd(ghostCardsList);
          }
          if (cramDrillsList.length) {
            await db.cram_drills.clear();
            await db.cram_drills.bulkAdd(cramDrillsList);
          }
        }
      );

      return {
        success: true,
        message: `Restored ${stats.srsCards} SRS cards, ${stats.masteryRecords} mastery records, and ${stats.kanaRecords} kana items.`,
        stats,
      };
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
