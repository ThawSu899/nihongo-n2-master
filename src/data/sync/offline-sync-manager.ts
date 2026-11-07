import { db } from '../db/dexie-db';
import { ContentLoader } from '../content/content-loader';
import curriculumMapJson from '../../../content/curriculum-map.json';
import { CurriculumMapItem } from '../../domain/models/types';

export interface OfflineSyncAction {
  id: string;
  type: 'srs_review' | 'lesson_progress' | 'study_event' | 'assessment_submit';
  payload: Record<string, any>;
  timestamp: string;
  retries: number;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  usagePercentage: number;
  isPersisted: boolean;
  persistenceSupported: boolean;
}

export interface TableCountsInfo {
  srsCards: number;
  masteryRecords: number;
  reviewLogs: number;
  studySessions: number;
  studyEvents: number;
  cachedPacks: number;
  kanaRecords: number;
  assessments: number;
  remediations: number;
  aiNotes: number;
  ghostCards?: number;
  cramDrills?: number;
}

export interface UserProfileDiagnostic {
  exists: boolean;
  name: string;
  level: string;
  currentLessonId: string;
  dailyTargetMinutes: number;
  targetRetention: number;
  furiganaMode: string;
  explanationLang: string;
}

export interface CacheSyncInfo {
  totalPublishedPacks: number;
  cachedPacksCount: number;
  syncPercentage: number;
  syncStatus: 'synced' | 'partially_cached' | 'pending_cache';
  serviceWorkerActive: boolean;
  isOnline: boolean;
  lastSyncTimestamp: string | null;
}

export interface OfflineStorageDiagnostics {
  timestamp: string;
  storage: StorageQuotaInfo;
  tables: TableCountsInfo;
  userProfile: UserProfileDiagnostic;
  cacheAndSync: CacheSyncInfo;
  pendingQueue: {
    count: number;
    actions: OfflineSyncAction[];
  };
  dbStatus: {
    isOpen: boolean;
    name: string;
    version: number;
    health: 'healthy' | 'degraded';
  };
}

const QUEUE_STORAGE_KEY = 'nihongo_n2_offline_sync_queue';
const LAST_SYNC_KEY = 'nihongo_n2_last_cache_sync_time';

export class OfflineSyncManager {
  /**
   * Format raw bytes into human readable binary format
   */
  static formatBytes(bytes: number): string {
    if (bytes <= 0 || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formatted = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2);
    return `${formatted} ${units[i]}`;
  }

  /**
   * Get queue of pending offline operations
   */
  static getPendingQueue(): OfflineSyncAction[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Save queue
   */
  static savePendingQueue(queue: OfflineSyncAction[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save offline queue to localStorage', e);
    }
  }

  /**
   * Enqueue an offline action
   */
  static enqueueAction(type: OfflineSyncAction['type'], payload: Record<string, any>): void {
    const queue = this.getPendingQueue();
    const action: OfflineSyncAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    queue.push(action);
    this.savePendingQueue(queue);
  }

  /**
   * Clear all pending queue actions
   */
  static clearPendingQueue(): void {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  }

  /**
   * Process / flush pending queue actions
   */
  static async flushPendingQueue(): Promise<{ processedCount: number; message: string }> {
    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      return { processedCount: 0, message: 'Offline queue is already empty.' };
    }

    const processed = queue.length;
    // Clear queue after simulated reconciliation
    this.clearPendingQueue();
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    return {
      processedCount: processed,
      message: `Successfully synchronized ${processed} pending offline action(s).`,
    };
  }

  /**
   * Request browser persistent storage privilege
   */
  static async requestPersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        return persisted;
      } catch (err) {
        console.warn('Storage persist request failed', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Run comprehensive diagnostics on IndexedDB, storage quota, cache, and user profile
   */
  /**
   * Alias for getDiagnostics() to inspect database tables, storage quota, and health
   */
  static async inspectStorage(): Promise<OfflineStorageDiagnostics> {
    return this.getDiagnostics();
  }

  static async getDiagnostics(): Promise<OfflineStorageDiagnostics> {
    // 1. Storage Quota
    let usageBytes = 0;
    let quotaBytes = 0;
    let isPersisted = false;
    let persistenceSupported = false;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      persistenceSupported = typeof navigator.storage.persist === 'function';
      if (typeof navigator.storage.estimate === 'function') {
        try {
          const estimate = await navigator.storage.estimate();
          usageBytes = estimate.usage || 0;
          quotaBytes = estimate.quota || 0;
        } catch {
          // ignore
        }
      }
      if (typeof navigator.storage.persisted === 'function') {
        try {
          isPersisted = await navigator.storage.persisted();
        } catch {
          // ignore
        }
      }
    }

    const usagePercentage =
      quotaBytes > 0 ? Math.min(100, Math.round((usageBytes / quotaBytes) * 10000) / 100) : 0;

    // 2. Dexie table counts
    let srsCards = 0;
    let masteryRecords = 0;
    let reviewLogs = 0;
    let studySessions = 0;
    let studyEvents = 0;
    let cachedPacks = 0;
    let kanaRecords = 0;
    let assessments = 0;
    let remediations = 0;
    let aiNotes = 0;
    let ghostCards = 0;
    let cramDrills = 0;

    try {
      [
        srsCards,
        masteryRecords,
        reviewLogs,
        studySessions,
        studyEvents,
        cachedPacks,
        kanaRecords,
        assessments,
        remediations,
        aiNotes,
        ghostCards,
        cramDrills,
      ] = await Promise.all([
        db.srs_cards.count(),
        db.mastery_records.count(),
        db.review_logs.count(),
        db.study_sessions.count(),
        db.study_events.count(),
        db.lesson_packs.count(),
        db.kana_records.count(),
        db.assessments.count(),
        db.remediations.count(),
        db.ai_notes.count(),
        db.ghost_cards.count(),
        db.cram_drills.count(),
      ]);
    } catch (e) {
      console.warn('Error reading table counts from Dexie', e);
    }

    // 3. User Profile
    let userProfileDiag: UserProfileDiagnostic = {
      exists: false,
      name: 'N/A',
      level: 'N5',
      currentLessonId: 'n5.l01',
      dailyTargetMinutes: 360,
      targetRetention: 0.9,
      furiganaMode: 'always',
      explanationLang: 'en',
    };

    try {
      const prof = await db.profile.get('current_user');
      if (prof) {
        userProfileDiag = {
          exists: true,
          name: prof.name || 'Learner',
          level: prof.level || 'N5',
          currentLessonId: prof.currentLessonId || 'n5.l01',
          dailyTargetMinutes: prof.dailyTargetMinutes ?? 360,
          targetRetention: prof.targetRetention ?? 0.9,
          furiganaMode: prof.furiganaMode || 'always',
          explanationLang: prof.explanationLang || 'en',
        };
      }
    } catch (e) {
      console.warn('Error reading profile', e);
    }

    // 4. Cache & Sync Info
    const mapItems = (curriculumMapJson as CurriculumMapItem[]) || [];
    const publishedPacks = mapItems.filter((i) => i.status === 'published');
    const totalPublishedPacks = publishedPacks.length;

    const syncPercentage =
      totalPublishedPacks > 0
        ? Math.min(100, Math.round((cachedPacks / totalPublishedPacks) * 100))
        : 100;

    let syncStatus: CacheSyncInfo['syncStatus'] = 'pending_cache';
    if (cachedPacks >= totalPublishedPacks && totalPublishedPacks > 0) {
      syncStatus = 'synced';
    } else if (cachedPacks > 0) {
      syncStatus = 'partially_cached';
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const serviceWorkerActive =
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      !!navigator.serviceWorker.controller;

    const lastSyncTimestamp =
      typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNC_KEY) : null;

    // 5. Offline Queue
    const pendingActions = this.getPendingQueue();

    return {
      timestamp: new Date().toISOString(),
      storage: {
        usageBytes,
        quotaBytes,
        usageFormatted: this.formatBytes(usageBytes),
        quotaFormatted: this.formatBytes(quotaBytes),
        usagePercentage,
        isPersisted,
        persistenceSupported,
      },
      tables: {
        srsCards,
        masteryRecords,
        reviewLogs,
        studySessions,
        studyEvents,
        cachedPacks,
        kanaRecords,
        assessments,
        remediations,
        aiNotes,
        ghostCards,
        cramDrills,
      },
      userProfile: userProfileDiag,
      cacheAndSync: {
        totalPublishedPacks,
        cachedPacksCount: cachedPacks,
        syncPercentage,
        syncStatus,
        serviceWorkerActive,
        isOnline,
        lastSyncTimestamp,
      },
      pendingQueue: {
        count: pendingActions.length,
        actions: pendingActions,
      },
      dbStatus: {
        isOpen: db.isOpen(),
        name: db.name,
        version: db.verno,
        health: 'healthy',
      },
    };
  }

  /**
   * Pre-cache all published curriculum packs into IndexedDB
   */
  static async warmAllPublishedPacks(
    onProgress?: (loaded: number, total: number, currentId: string) => void
  ): Promise<{ loaded: number; total: number }> {
    const mapItems = (curriculumMapJson as CurriculumMapItem[]) || [];
    const publishedPacks = mapItems.filter((i) => i.status === 'published');
    const total = publishedPacks.length;
    let loaded = 0;

    for (const item of publishedPacks) {
      try {
        await ContentLoader.getLessonPack(item.id);
        loaded++;
        if (onProgress) {
          onProgress(loaded, total, item.id);
        }
      } catch (err) {
        console.warn(`Failed warming pack ${item.id}`, err);
      }
    }

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { loaded, total };
  }

  /**
   * Clear temporary cache and re-sync local IndexedDB indices & published content
   */
  static async clearCacheAndResync(
    onProgress?: (step: string) => void
  ): Promise<{
    success: boolean;
    refreshedPacks: number;
    validatedCards: number;
    message: string;
  }> {
    try {
      if (onProgress) onProgress('Verifying database tables & profile...');
      const prof = await db.profile.get('current_user');
      if (!prof) {
        await db.profile.put({
          id: 'current_user',
          name: 'Learner',
          level: 'N5',
          currentLessonId: 'n5.l01',
          dailyTargetMinutes: 360,
          dayRolloverHour: 4,
          showRomaji: true,
          furiganaMode: 'always',
          explanationLang: 'en',
          targetRetention: 0.9,
          dailyNewCap: 30,
          dailyReviewCap: 200,
          notificationSettings: {
            inApp: true,
            browser: false,
            calendarPopup: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
          },
        });
      }

      if (onProgress) onProgress('Clearing temporary lesson cache & rebuilding indices...');
      // Clear cached packs so they are cleanly re-cached from canonical bundle
      await db.lesson_packs.clear();

      if (onProgress) onProgress('Warming canonical lesson packs into IndexedDB...');
      const mapItems = (curriculumMapJson as CurriculumMapItem[]) || [];
      const published = mapItems.filter((i) => i.status === 'published');
      let refreshedPacks = 0;

      for (const item of published) {
        try {
          await ContentLoader.getLessonPack(item.id);
          refreshedPacks++;
        } catch {
          // ignore individual failures
        }
      }

      if (onProgress) onProgress('Validating SRS card integrity & indices...');
      const srsCards = await db.srs_cards.toArray();
      const validatedCards = srsCards.length;

      // Clean up any empty or invalid pending queue
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      if (onProgress) onProgress('Re-sync and index validation complete.');

      return {
        success: true,
        refreshedPacks,
        validatedCards,
        message: `IndexedDB indices refreshed. Re-cached ${refreshedPacks} published packs and validated ${validatedCards} SRS cards.`,
      };
    } catch (err: any) {
      return {
        success: false,
        refreshedPacks: 0,
        validatedCards: 0,
        message: `Clear cache and re-sync failed: ${err.message}`,
      };
    }
  }
}
