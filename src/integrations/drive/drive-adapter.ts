import { AudioRef } from '../../domain/models/types';
import { GoogleDriveService } from './google-drive-service';

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

  constructor(private accessToken?: string) {}

  isConfigured(): boolean {
    return Boolean(this.accessToken);
  }

  async saveBackup(filename: string, content: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Google Drive integration is not connected. Sign in with Google to enable Drive backups.');
    }
    try {
      await GoogleDriveService.uploadBackup(content, filename, this.accessToken);
      return true;
    } catch (err: any) {
      console.warn(`[GoogleDriveAdapter] saveBackup failed: ${err.message}`);
      return false;
    }
  }

  async getBackup(fileId: string): Promise<string | null> {
    if (!this.isConfigured()) return null;
    try {
      return await GoogleDriveService.downloadBackup(fileId, this.accessToken);
    } catch (err: any) {
      console.warn(`[GoogleDriveAdapter] getBackup failed: ${err.message}`);
      return null;
    }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await GoogleDriveService.deleteBackup(fileId, this.accessToken);
      return true;
    } catch (err: any) {
      console.warn(`[GoogleDriveAdapter] deleteBackup failed: ${err.message}`);
      return false;
    }
  }

  async exportCurriculum(pack: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await GoogleDriveService.uploadCurriculumExport(pack, this.accessToken);
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
