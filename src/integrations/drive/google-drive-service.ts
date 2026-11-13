import { getDriveAccessToken } from '../auth/firebase-auth';

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

/**
 * Extracts detailed, actionable Google API error information from response bodies.
 * Distinguishes missing project API enablement (accessNotConfigured),
 * missing scope permissions (insufficientPermissions), and expired credentials (401).
 */
export async function parseGoogleApiError(res: Response, defaultAction = 'Google Drive operation'): Promise<Error> {
  let errJson: any = null;
  let rawText = '';
  try {
    const text = await res.text();
    rawText = text;
    errJson = JSON.parse(text);
  } catch {
    // Non-JSON response body
  }

  const errObj = errJson?.error;
  const status = res.status;
  const apiMessage = errObj?.message || rawText || res.statusText || defaultAction;
  const reason = errObj?.errors?.[0]?.reason || (status === 401 ? 'unauthorized' : undefined);

  let explanation = '';
  if (reason === 'accessNotConfigured' || /accessNotConfigured|API has not been used/i.test(apiMessage)) {
    explanation = ' (Google Drive API is not enabled in your Google Cloud Project. Please enable it in the Google Cloud Console)';
  } else if (
    reason === 'insufficientPermissions' ||
    /insufficientPermissions|insufficient scope|not granted.*access/i.test(apiMessage)
  ) {
    explanation = ' (Insufficient Drive permissions: token lacks drive.file scope. Please sign out and sign in with Google again to grant Drive access)';
  } else if (status === 401 || /unauthorized|expired|invalid.*credential/i.test(apiMessage)) {
    explanation = ' (Google authentication expired or invalid. Please sign out and sign in with Google again)';
  } else if (reason) {
    explanation = ` [reason: ${reason}]`;
  }

  if (status === 403) {
    return new Error(`Google Drive permission denied (403): ${apiMessage}${explanation}`);
  }
  if (status === 401) {
    return new Error(`Google authentication expired or invalid (401): ${apiMessage}${explanation}`);
  }
  return new Error(`${defaultAction} failed (${status}): ${apiMessage}${explanation}`);
}

export class GoogleDriveService {
  private static readonly API_BASE = 'https://www.googleapis.com';
  public static readonly APP_FOLDER_NAME = 'Japanese-N2-Master';
  public static readonly BACKUP_FILENAME = 'nihongo-n2-master-backup.json';

  /**
   * Helper to format human-readable error messages for network/offline and Google API issues
   */
  private static formatError(error: any, actionDescription: string): Error {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new Error(`You appear to be offline. ${actionDescription} requires an active internet connection.`);
    }
    const msg = error?.message || String(error);
    if (/permission denied|forbidden|403/i.test(msg)) {
      return new Error(msg.startsWith('Google Drive permission denied') ? msg : `Google Drive permission denied (403): ${msg}`);
    }
    if (/unauthorized|expired|401/i.test(msg)) {
      return new Error(msg.startsWith('Google authentication expired') ? msg : `Google authentication expired or invalid (401). Please sign out and sign in with Google again.`);
    }
    if (/failed to fetch|network|load failed/i.test(msg)) {
      return new Error(`Network connection error. Could not connect to Google Drive while trying to ${actionDescription}. Please check your internet connection.`);
    }
    return new Error(`${actionDescription} failed: ${msg}`);
  }

  /**
   * Search for or create the root folder 'Japanese-N2-Master'
   * Works cleanly under the restricted 'drive.file' scope by caching the created folder ID
   * and avoiding failing on broad search queries that drive.file forbids.
   */
  static async ensureAppFolder(customToken?: string): Promise<string> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    // 1. Check for cached folder ID in localStorage
    const cachedFolderId =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('google_drive_app_folder_id')
        : null;

    if (cachedFolderId) {
      try {
        const verifyRes = await fetch(
          `${this.API_BASE}/drive/v3/files/${cachedFolderId}?fields=id,name,trashed`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (verifyRes.ok) {
          const folderData = await verifyRes.json();
          if (!folderData.trashed) {
            return folderData.id;
          }
        } else if (verifyRes.status === 401) {
          throw await parseGoogleApiError(verifyRes, 'Google authentication expired');
        } else if (verifyRes.status === 404) {
          // Folder was deleted remotely; clear cache and re-create
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('google_drive_app_folder_id');
          }
        }
      } catch (verifyErr: any) {
        if (/401|expired/i.test(verifyErr?.message)) throw verifyErr;
        // Ignore other verify errors and proceed to search/create
      }
    }

    try {
      // 2. Search for existing folder created by this app
      const query = encodeURIComponent(`name = '${this.APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await fetch(
        `${this.API_BASE}/drive/v3/files?q=${query}&fields=files(id,name)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const foundId = searchData.files[0].id;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('google_drive_app_folder_id', foundId);
          }
          return foundId;
        }
      } else {
        // Under drive.file scope, searching for files not created by the app or unrestricted queries returns 403 Forbidden.
        // We gracefully proceed to direct creation rather than failing.
        console.warn(`[GoogleDriveService] Folder search returned ${searchRes.status}; creating or accessing ${this.APP_FOLDER_NAME} folder directly.`);
      }

      // 3. Create folder directly if not found or search was restricted
      const createRes = await fetch(`${this.API_BASE}/drive/v3/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: this.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'NIHONGO N2 MASTER Curriculum, Backups, and Audio Assets',
        }),
      });

      if (!createRes.ok) {
        throw await parseGoogleApiError(createRes, 'Failed to create Google Drive folder');
      }

      const folder = await createRes.json();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('google_drive_app_folder_id', folder.id);
      }
      return folder.id;
    } catch (err: any) {
      throw this.formatError(err, 'access or create app folder in Google Drive');
    }
  }

  /**
   * Alias for ensureAppFolder to preserve complete backward compatibility.
   */
  static async getOrCreateAppFolder(customToken?: string): Promise<string> {
    return this.ensureAppFolder(customToken);
  }

  /**
   * Helper to store local index of backups in localStorage.
   */
  private static recordLocalBackupFile(fileId: string, filename: string, contentLength: number): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('google_drive_backup_files');
      const list: DriveBackupFile[] = raw ? JSON.parse(raw) : [];
      const now = new Date().toISOString();
      const newEntry: DriveBackupFile = {
        id: fileId,
        name: filename,
        createdTime: now,
        modifiedTime: now,
        size: `${Math.round(contentLength / 1024)} KB`,
      };
      const updated = [newEntry, ...list.filter((f) => f.id !== fileId)];
      localStorage.setItem('google_drive_backup_files', JSON.stringify(updated.slice(0, 20)));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Upload a learner progress backup JSON to Google Drive.
   * If a backup file was previously created and cached in localStorage, updates it in-place via PATCH
   * to avoid generating duplicate files and bypassing restrictive drive.file searches.
   */
  static async uploadBackup(content: string, filename?: string, customToken?: string): Promise<{ id: string; name: string }> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    try {
      const folderId = await this.ensureAppFolder(token);
      const targetFilename = filename || this.BACKUP_FILENAME;

      // 1. Check if we have a cached backup file ID in localStorage
      const cachedFileId =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('google_drive_backup_file_id')
          : null;

      if (cachedFileId) {
        try {
          const patchRes = await fetch(
            `${this.API_BASE}/upload/drive/v3/files/${cachedFileId}?uploadType=media`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: content,
            }
          );

          if (patchRes.ok) {
            const updated = await patchRes.json();
            const resultId = updated.id || cachedFileId;
            this.recordLocalBackupFile(resultId, targetFilename, content.length);
            return { id: resultId, name: targetFilename };
          } else if (patchRes.status === 404) {
            // File deleted in Google Drive; clear cache and fall through to create
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('google_drive_backup_file_id');
            }
          } else if (patchRes.status === 401 || patchRes.status === 403) {
            throw await parseGoogleApiError(patchRes, 'Failed to update backup file');
          }
        } catch (patchErr: any) {
          if (/401|403|permission denied|expired/i.test(patchErr?.message)) {
            throw patchErr;
          }
          // Other transient errors: proceed to fresh creation
        }
      }

      // 2. Create new backup file via multipart upload
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
        throw await parseGoogleApiError(res, 'Google Drive upload failed');
      }

      const uploaded = await res.json();
      if (typeof localStorage !== 'undefined' && uploaded?.id) {
        localStorage.setItem('google_drive_backup_file_id', uploaded.id);
        this.recordLocalBackupFile(uploaded.id, uploaded.name || targetFilename, content.length);
      }
      return uploaded;
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
      const folderId = await this.ensureAppFolder(token);
      const query = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/json' and trashed = false`);
      const res = await fetch(
        `${this.API_BASE}/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,modifiedTime)&orderBy=modifiedTime desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const files: DriveBackupFile[] = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : undefined,
          createdTime: f.createdTime,
          modifiedTime: f.modifiedTime,
        }));
        if (typeof localStorage !== 'undefined' && files.length > 0) {
          localStorage.setItem('google_drive_backup_files', JSON.stringify(files.slice(0, 20)));
          if (!localStorage.getItem('google_drive_backup_file_id')) {
            localStorage.setItem('google_drive_backup_file_id', files[0].id);
          }
        }
        return files;
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[GoogleDriveService] listBackups query returned ${res.status}: ${errText}`);
      }
    } catch (e) {
      console.warn('Could not list Google Drive backups via folder query:', e);
    }

    // Fallback: Return locally recorded backup file metadata if available
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('google_drive_backup_files');
        if (raw) {
          return JSON.parse(raw);
        }
      } catch {
        // Fallback failed
      }
    }

    return [];
  }

  /**
   * Download a backup's JSON content from Google Drive
   */
  static async downloadBackup(fileId?: string, customToken?: string): Promise<string> {
    const token = customToken || getDriveAccessToken();
    if (!token) throw new Error('Not authenticated with Google Drive. Please sign in with Google first.');

    let targetFileId = fileId;
    if (!targetFileId && typeof localStorage !== 'undefined') {
      targetFileId = localStorage.getItem('google_drive_backup_file_id') || undefined;
    }

    if (!targetFileId) {
      const backups = await this.listBackups(token);
      if (backups && backups.length > 0) {
        targetFileId = backups[0].id;
      }
    }

    if (!targetFileId) {
      throw new Error('No backup file found in Google Drive to restore.');
    }

    try {
      const res = await fetch(
        `${this.API_BASE}/drive/v3/files/${targetFileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw await parseGoogleApiError(res, 'Failed to download backup file from Drive');
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
        throw await parseGoogleApiError(res, 'Failed to delete backup from Drive');
      }

      if (typeof localStorage !== 'undefined') {
        try {
          if (localStorage.getItem('google_drive_backup_file_id') === fileId) {
            localStorage.removeItem('google_drive_backup_file_id');
          }
          const raw = localStorage.getItem('google_drive_backup_files');
          if (raw) {
            const list: DriveBackupFile[] = JSON.parse(raw);
            localStorage.setItem(
              'google_drive_backup_files',
              JSON.stringify(list.filter((f) => f.id !== fileId))
            );
          }
        } catch {
          // Ignore
        }
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
      const folderId = await this.ensureAppFolder(token);
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
        throw await parseGoogleApiError(res, 'Curriculum upload failed');
      }

      return await res.json();
    } catch (err: any) {
      throw this.formatError(err, 'upload curriculum export to Google Drive');
    }
  }
}
