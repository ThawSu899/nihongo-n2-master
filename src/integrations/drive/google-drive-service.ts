import { getDriveAccessToken } from '../auth/firebase-auth';

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private static readonly API_BASE = 'https://www.googleapis.com';

  /**
   * Helper to format human-readable error messages for network/offline and Google API issues
   */
  private static formatError(error: any, actionDescription: string): Error {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new Error(`You appear to be offline. ${actionDescription} requires an active internet connection.`);
    }
    const msg = error?.message || String(error);
    if (/failed to fetch|network|load failed/i.test(msg)) {
      return new Error(`Network connection error. Could not connect to Google Drive while trying to ${actionDescription}. Please check your internet connection.`);
    }
    return new Error(`${actionDescription} failed: ${msg}`);
  }

  /**
   * Search for or create the root folder 'Japanese-N2-Master'
   */
  static async getOrCreateAppFolder(customToken?: string): Promise<string> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      // 1. Search for existing folder
      const query = encodeURIComponent("name = 'Japanese-N2-Master' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const searchRes = await fetch(
        `${this.API_BASE}/drive/v3/files?q=${query}&fields=files(id,name)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!searchRes.ok) {
        throw new Error(`Failed to search Google Drive folders: ${searchRes.statusText}`);
      }

      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }

      // 2. Create folder if not found
      const createRes = await fetch(`${this.API_BASE}/drive/v3/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Japanese-N2-Master',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'NIHONGO N2 MASTER Curriculum, Backups, and Audio Assets',
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create Google Drive folder: ${createRes.statusText}`);
      }

      const folder = await createRes.json();
      return folder.id;
    } catch (err: any) {
      throw this.formatError(err, 'access or create app folder in Google Drive');
    }
  }

  /**
   * Upload a learner progress backup JSON to Google Drive
   */
  static async uploadBackup(content: string, filename?: string, customToken?: string): Promise<{ id: string; name: string }> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      const folderId = await this.getOrCreateAppFolder(token);
      const targetFilename = filename || `nihongo_master_backup_${new Date().toISOString().substring(0, 10)}.json`;

      const metadata = {
        name: targetFilename,
        mimeType: 'application/json',
        parents: [folderId],
        description: 'Nihongo N2 Master Learning Progress Snapshot',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelimiter;

      const res = await fetch(
        `${this.API_BASE}/upload/drive/v3/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google Drive upload failed (${res.status}): ${errText}`);
      }

      return await res.json();
    } catch (err: any) {
      throw this.formatError(err, 'upload backup to Google Drive');
    }
  }

  /**
   * List available study backups in Google Drive
   */
  static async listBackups(customToken?: string): Promise<DriveBackupFile[]> {
    const token = customToken || getDriveAccessToken();
    if (!token) return [];

    try {
      const folderId = await this.getOrCreateAppFolder(token);
      const query = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/json' and trashed = false`);
      const res = await fetch(
        `${this.API_BASE}/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : undefined,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
      }));
    } catch (e) {
      console.warn('Could not list Google Drive backups:', e);
      return [];
    }
  }

  /**
   * Download a backup's JSON content from Google Drive
   */
  static async downloadBackup(fileId: string, customToken?: string): Promise<string> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      const res = await fetch(
        `${this.API_BASE}/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to download backup file from Drive: ${res.statusText}`);
      }

      return await res.text();
    } catch (err: any) {
      throw this.formatError(err, 'download backup from Google Drive');
    }
  }

  /**
   * Delete a backup file from Google Drive (requires user confirmation before calling)
   */
  static async deleteBackup(fileId: string, customToken?: string): Promise<void> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      const res = await fetch(`${this.API_BASE}/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const errText = await res.text();
        throw new Error(`Failed to delete backup from Drive (${res.status}): ${errText}`);
      }
    } catch (err: any) {
      throw this.formatError(err, 'delete backup from Google Drive');
    }
  }

  /**
   * Upload curriculum pack export JSON to Google Drive
   */
  static async uploadCurriculumExport(pack: any, customToken?: string): Promise<{ id: string; name: string }> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      const folderId = await this.getOrCreateAppFolder(token);
      const filename = `${pack.id}_curriculum_export_${new Date().toISOString().substring(0, 10)}.json`;

      const metadata = {
        name: filename,
        mimeType: 'application/json',
        parents: [folderId],
        description: `Nihongo N2 Master Curriculum Pack Export for ${pack.id} (${pack.title})`,
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(pack, null, 2) +
        closeDelimiter;

      const res = await fetch(
        `${this.API_BASE}/upload/drive/v3/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Curriculum upload failed (${res.status}): ${errText}`);
      }

      return await res.json();
    } catch (err: any) {
      throw this.formatError(err, 'upload curriculum export to Google Drive');
    }
  }
}

