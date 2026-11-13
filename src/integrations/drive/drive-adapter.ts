import { AudioRef } from '../../domain/models/types';
import { GoogleDriveService } from './google-drive-service';
import { getDriveAccessToken } from '../auth/firebase-auth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  folderPath: string; // e.g. "Japanese-N2-Master/Audio"
  modifiedTime: string;
  md5Checksum?: string;
  size?: number;
}

export interface FileStore {
  name: string;
  saveBackup(filename: string, content: string): Promise<boolean>;
  getBackup(filename: string): Promise<string | null>;
  resolveAudio(filename: string): Promise<AudioRef>;
  isConfigured(): boolean;
}

export class LocalFileStore implements FileStore {
  name = 'Local Storage Snapshot & Assets';

  async saveBackup(filename: string, content: string): Promise<boolean> {
    try {
      localStorage.setItem(`backup_${filename}`, content);
      return true;
    } catch {
      return false;
    }
  }

  async getBackup(filename: string): Promise<string | null> {
    return localStorage.getItem(`backup_${filename}`);
  }

  async resolveAudio(filename: string): Promise<AudioRef> {
    // If local recorded file is missing, fall back to Web Speech API ja-JP (TTS)
    return {
      kind: 'tts',
      lang: 'ja-JP',
    };
  }

  isConfigured(): boolean {
    return true;
  }
}

export class GoogleDriveAdapter implements FileStore {
  name = 'Google Drive Asset Vault';

  public static readonly FOLDER_STRUCTURE = [
    'Japanese-N2-Master/Curriculum/N5',
    'Japanese-N2-Master/Curriculum/N4',
    'Japanese-N2-Master/Curriculum/N3',
    'Japanese-N2-Master/Curriculum/N2',
    'Japanese-N2-Master/Vocabulary',
    'Japanese-N2-Master/Kanji',
    'Japanese-N2-Master/Grammar',
    'Japanese-N2-Master/Reading',
    'Japanese-N2-Master/Listening',
    'Japanese-N2-Master/Audio',
    'Japanese-N2-Master/Images',
  ];

  public lastError: string | null = null;

  constructor(private accessToken?: string) {}

  /**
   * Resolves effective access token, using explicit token if passed or falling back to in-memory OAuth token.
   */
  getEffectiveAccessToken(): string | null {
    return this.accessToken || getDriveAccessToken();
  }

  isConfigured(): boolean {
    return Boolean(this.getEffectiveAccessToken());
  }

  async saveBackup(filename: string, content: string): Promise<boolean> {
    this.lastError = null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.lastError = 'You appear to be offline. Saving backup requires an active internet connection.';
      console.warn(`[GoogleDriveAdapter] Offline detected. ${this.lastError}`);
      return false;
    }
    if (!this.isConfigured()) {
      this.lastError = 'Google Drive integration is not connected. Sign in with Google to enable Drive backups.';
      throw new Error(this.lastError);
    }
    try {
      await GoogleDriveService.uploadBackup(content, filename, this.getEffectiveAccessToken() || undefined);
      return true;
    } catch (err: any) {
      this.lastError = err?.message || String(err);
      console.warn(`[GoogleDriveAdapter] saveBackup failed: ${this.lastError}`);
      return false;
    }
  }

  async getBackup(fileId?: string): Promise<string | null> {
    this.lastError = null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.lastError = 'You appear to be offline. Downloading backup requires an active internet connection.';
      console.warn(`[GoogleDriveAdapter] Offline detected. ${this.lastError}`);
      return null;
    }
    if (!this.isConfigured()) {
      this.lastError = 'Google Drive integration is not connected. Sign in with Google to enable Drive restores.';
      return null;
    }
    try {
      return await GoogleDriveService.downloadBackup(fileId, this.getEffectiveAccessToken() || undefined);
    } catch (err: any) {
      this.lastError = err?.message || String(err);
      console.warn(`[GoogleDriveAdapter] getBackup failed: ${this.lastError}`);
      return null;
    }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    this.lastError = null;
    if (!this.isConfigured()) {
      this.lastError = 'Google Drive integration is not connected.';
      return false;
    }
    try {
      await GoogleDriveService.deleteBackup(fileId, this.getEffectiveAccessToken() || undefined);
      return true;
    } catch (err: any) {
      this.lastError = err?.message || String(err);
      console.warn(`[GoogleDriveAdapter] deleteBackup failed: ${this.lastError}`);
      return false;
    }
  }

  async exportCurriculum(pack: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await GoogleDriveService.uploadCurriculumExport(pack, this.getEffectiveAccessToken() || undefined);
      return true;
    } catch (err: any) {
      console.warn(`[GoogleDriveAdapter] exportCurriculum failed: ${err.message}`);
      return false;
    }
  }

  async resolveAudio(filename: string): Promise<AudioRef> {
    if (!this.isConfigured()) {
      return { kind: 'tts', lang: 'ja-JP' };
    }
    // Remote audio resolve with TTS fallback
    return { kind: 'tts', lang: 'ja-JP' };
  }
}
