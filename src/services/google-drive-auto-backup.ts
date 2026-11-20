/**
 * Google Drive Automatic 24-Hour Backup Scheduler Service
 *
 * Provides resilient, privacy-preserving automated backups to Google Drive:
 * - 24-Hour default schedule with persistent settings across reloads
 * - Dedicated automatic backup filename & separate cached file ID
 * - In-place PATCH updates to prevent duplicate file sprawl
 * - Browser tab visibility and online recovery triggers
 * - In-memory token expiration tracking (never stores tokens in localStorage)
 * - Safe error handling: pauses on 401/403/expired without popup spam
 * - Never touches or overwrites local IndexedDB user data
 */

import { BackupManager } from '../data/backup/backup-manager';
import { GoogleDriveService } from '../integrations/drive/google-drive-service';
import {
  isGoogleConnected,
  isTokenExpired,
  getDriveAccessToken,
  auth,
  UserAuthProfile,
} from '../integrations/auth/firebase-auth';

export type AutoBackupStatusState =
  | 'idle'
  | 'backing_up'
  | 'success'
  | 'error'
  | 'offline'
  | 'auth_required';

export interface AutoBackupStatus {
  enabled: boolean;
  state: AutoBackupStatusState;
  lastSuccessfulBackup: string | null;
  nextScheduledBackup: string | null;
  lastError: string | null;
  inProgress: boolean;
}

export const AUTO_BACKUP_STORAGE_KEYS = {
  ENABLED: 'google_drive_auto_backup_enabled',
  INTERVAL_MS: 'google_drive_auto_backup_interval_ms',
  LAST_SUCCESS: 'google_drive_auto_backup_last_success',
  LAST_ERROR: 'google_drive_auto_backup_last_error',
} as const;

export const DEFAULT_AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export class GoogleDriveAutoBackupService {
  private static instance: GoogleDriveAutoBackupService | null = null;

  private enabled: boolean = false;
  private intervalMs: number = DEFAULT_AUTO_BACKUP_INTERVAL_MS;
  private state: AutoBackupStatusState = 'idle';
  private inProgress: boolean = false;
  private lastError: string | null = null;
  private timerId: any = null;
  private retryCount: number = 0;
  private initialized: boolean = false;

  private listeners = new Set<(status: AutoBackupStatus) => void>();
  private unsubscribeAuth: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private boundOnlineHandler: (() => void) | null = null;

  public static getInstance(): GoogleDriveAutoBackupService {
    if (!this.instance) {
      this.instance = new GoogleDriveAutoBackupService();
    }
    return this.instance;
  }

  constructor() {
    this.loadPersistedPreferences();
  }

  /**
   * Load saved preferences and history from localStorage.
   */
  private loadPersistedPreferences(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const storedEnabled = localStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.ENABLED);
      this.enabled = storedEnabled === 'true';

      const storedInterval = localStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.INTERVAL_MS);
      if (storedInterval) {
        const parsed = Number(storedInterval);
        if (!isNaN(parsed) && parsed > 0) {
          this.intervalMs = parsed;
        }
      }

      this.lastError = localStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.LAST_ERROR);
    } catch {
      // Storage access disabled or quota restricted
    }
  }

  /**
   * Initialize service at application startup.
   * Registers event handlers (visibility change, online status, auth changes)
   * and starts schedule if enabled.
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Browser tab visibility listener (checks due backup when tab is refocused)
    if (typeof document !== 'undefined') {
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this.handleVisibilityOrOnlineTrigger('tab_visible');
        }
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    // 2. Browser online status listener (retries when network connection restores)
    if (typeof window !== 'undefined') {
      this.boundOnlineHandler = () => {
        this.handleVisibilityOrOnlineTrigger('network_online');
      };
      window.addEventListener('online', this.boundOnlineHandler);
    }

    // 3. Auth state listener (resumes scheduled checks when user connects or re-authorizes)
    this.unsubscribeAuth = auth.onAuthStateChanged((user: UserAuthProfile | null) => {
      if (user && isGoogleConnected() && !isTokenExpired()) {
        if (this.state === 'auth_required') {
          this.state = 'idle';
          this.lastError = null;
          this.notify();
        }
        if (this.enabled) {
          this.checkAndSchedule();
        }
      } else if (!user || !isGoogleConnected()) {
        if (this.enabled && this.state !== 'auth_required') {
          this.state = 'auth_required';
          this.notify();
        }
      }
    });

    if (this.enabled) {
      this.checkAndSchedule();
    }
  }

  /**
   * Tear down event listeners and active timers.
   */
  public destroy(): void {
    this.clearTimer();
    if (this.boundVisibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
    if (this.boundOnlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundOnlineHandler);
      this.boundOnlineHandler = null;
    }
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.initialized = false;
  }

  /**
   * Reset internal service state for testing isolation.
   */
  public resetForTesting(): void {
    this.destroy();
    this.enabled = false;
    this.intervalMs = DEFAULT_AUTO_BACKUP_INTERVAL_MS;
    this.state = 'idle';
    this.inProgress = false;
    this.lastError = null;
    this.retryCount = 0;
  }

  /**
   * Toggle or set Automatic Backup enabled state.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.ENABLED, String(enabled));
      } catch {}
    }

    if (enabled) {
      this.retryCount = 0;
      this.checkAndSchedule();
    } else {
      this.clearTimer();
      this.state = 'idle';
      this.notify();
    }
  }

  /**
   * Set custom backup interval (defaults to 24 hours).
   */
  public setIntervalMs(intervalMs: number): void {
    if (intervalMs <= 0) return;
    this.intervalMs = intervalMs;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.INTERVAL_MS, String(intervalMs));
      } catch {}
    }
    if (this.enabled) {
      this.checkAndSchedule();
    }
  }

  public getIntervalMs(): number {
    return this.intervalMs;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getLastSuccessfulBackup(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS);
    } catch {
      return null;
    }
  }

  public getNextScheduledBackup(): string | null {
    if (!this.enabled) return null;
    const lastSuccess = this.getLastSuccessfulBackup();
    if (!lastSuccess) {
      return 'Pending initial backup';
    }
    const nextTime = new Date(lastSuccess).getTime() + this.intervalMs;
    return new Date(nextTime).toISOString();
  }

  public getStatus(): AutoBackupStatus {
    return {
      enabled: this.enabled,
      state: this.state,
      lastSuccessfulBackup: this.getLastSuccessfulBackup(),
      nextScheduledBackup: this.getNextScheduledBackup(),
      lastError: this.lastError,
      inProgress: this.inProgress,
    };
  }

  public onStatusChange(callback: (status: AutoBackupStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('[GoogleDriveAutoBackup] Listener notification error:', err);
      }
    });
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Determines if a backup is currently overdue.
   */
  public isBackupDue(): boolean {
    if (!this.enabled) return false;
    const lastSuccess = this.getLastSuccessfulBackup();
    if (!lastSuccess) return true; // Initial backup due immediately upon enabling

    const lastSuccessMs = new Date(lastSuccess).getTime();
    if (isNaN(lastSuccessMs)) return true;

    return Date.now() >= lastSuccessMs + this.intervalMs;
  }

  /**
   * Internal scheduler loop. Computes exact delay until next due run.
   */
  public checkAndSchedule(): void {
    this.clearTimer();
    if (!this.enabled) return;

    // Check if backup is due now
    if (this.isBackupDue()) {
      this.triggerBackup();
      return;
    }

    // Otherwise calculate remaining delay
    const lastSuccess = this.getLastSuccessfulBackup();
    const lastSuccessMs = lastSuccess ? new Date(lastSuccess).getTime() : Date.now();
    const nextDueMs = lastSuccessMs + this.intervalMs;
    const delayMs = Math.max(1000, nextDueMs - Date.now());

    this.timerId = setTimeout(() => {
      this.checkAndSchedule();
    }, delayMs);
  }

  /**
   * Handler invoked when the browser tab becomes visible or network reconnects.
   */
  private handleVisibilityOrOnlineTrigger(triggerSource: 'tab_visible' | 'network_online'): void {
    if (!this.enabled || this.inProgress) return;

    if (this.state === 'offline' && typeof navigator !== 'undefined' && navigator.onLine) {
      this.state = 'idle';
      this.notify();
    }

    if (this.isBackupDue()) {
      this.triggerBackup();
    }
  }

  /**
   * Triggers an automatic backup run with all security & network pre-flight checks.
   */
  public async triggerBackup(): Promise<boolean> {
    if (!this.enabled && !this.inProgress) {
      // Allowed if called explicitly, but guard against duplicate runs
    }
    if (this.inProgress) {
      return false;
    }

    // 1. Network check
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.state = 'offline';
      this.lastError = 'Browser is currently offline. Scheduled backup will resume when online.';
      this.notify();
      return false;
    }

    // 2. Auth check (no background popups)
    if (!isGoogleConnected()) {
      this.state = 'auth_required';
      this.lastError = 'Google Account is not connected. Sign in with Google to enable automatic cloud backups.';
      this.notify();
      return false;
    }

    if (isTokenExpired()) {
      this.state = 'auth_required';
      this.lastError = 'Google authentication token has expired. Please re-authorize in Settings.';
      this.notify();
      return false;
    }

    const token = getDriveAccessToken();
    if (!token) {
      this.state = 'auth_required';
      this.lastError = 'Missing Google Drive access token.';
      this.notify();
      return false;
    }

    this.inProgress = true;
    this.state = 'backing_up';
    this.notify();

    try {
      // 3. Export learner data to JSON (read-only export; never modifies DB)
      const content = await BackupManager.exportToJson();

      // 4. Upload to Google Drive using dedicated auto-backup filename & file ID cache
      await GoogleDriveService.uploadAutoBackup(content, token);

      // 5. Update success state ONLY on successful upload
      const nowIso = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_SUCCESS, nowIso);
          localStorage.removeItem(AUTO_BACKUP_STORAGE_KEYS.LAST_ERROR);
        } catch {}
      }

      this.lastError = null;
      this.retryCount = 0;
      this.state = 'success';
      this.inProgress = false;
      this.notify();

      // 6. Schedule next 24-hour backup
      this.checkAndSchedule();
      return true;
    } catch (err: any) {
      this.inProgress = false;
      const errMsg = err?.message || String(err);
      this.lastError = errMsg;

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(AUTO_BACKUP_STORAGE_KEYS.LAST_ERROR, errMsg);
        } catch {}
      }

      if (/unauthorized|expired|401|invalid.*credential/i.test(errMsg)) {
        this.state = 'auth_required';
      } else if (/permission denied|insufficient|403|scope/i.test(errMsg)) {
        this.state = 'auth_required';
      } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.state = 'offline';
      } else {
        this.state = 'error';
        // Exponential backoff for transient errors: 1m, 2m, 4m... max 1hr
        this.scheduleRetry();
      }

      this.notify();
      return false;
    }
  }

  /**
   * Schedules a retry with exponential backoff for transient errors.
   */
  private scheduleRetry(): void {
    this.clearTimer();
    if (!this.enabled) return;

    this.retryCount = Math.min(this.retryCount + 1, 6);
    // Base 60s * 2^(retry - 1): 60s, 120s, 240s, 480s, 960s, 1920s (~32min)
    const backoffMs = Math.min(60 * 1000 * Math.pow(2, this.retryCount - 1), 60 * 60 * 1000);

    this.timerId = setTimeout(() => {
      this.triggerBackup();
    }, backoffMs);
  }
}

// Export singleton instance
export const googleDriveAutoBackup = GoogleDriveAutoBackupService.getInstance();
