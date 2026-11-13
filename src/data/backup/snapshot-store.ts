import type { BackupData } from './backup-manager';

/**
 * Checks whether an exception represents a browser storage quota exceeded error.
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const name = err.name || '';
  const message = err.message || '';
  const code = err.code;

  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    /quota/i.test(name) ||
    /quota/i.test(message)
  );
}

/**
 * Isolated IndexedDB store for rolling snapshots.
 * Immune to quota limits of localStorage (~5MB) and independent from main app database errors.
 */
export class SnapshotIndexedDBStore {
  private static DB_NAME = 'NihongoSnapshotDB';
  private static STORE_NAME = 'snapshots';
  private static KEY = 'rolling_snapshot';

  private static open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is unavailable in this environment.'));
      }
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Persists the complete, uncompressed rolling snapshot to IndexedDB.
   */
  static async saveSnapshot(data: BackupData): Promise<boolean> {
    try {
      const db = await this.open();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put({
          id: this.KEY,
          updatedAt: new Date().toISOString(),
          data,
        });

        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          console.warn('[SnapshotIndexedDBStore] save error:', req.error);
          resolve(false);
        };
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn('[SnapshotIndexedDBStore] Failed to open IndexedDB for snapshot save:', err);
      return false;
    }
  }

  /**
   * Retrieves the latest uncompressed rolling snapshot from IndexedDB.
   */
  static async getSnapshot(): Promise<BackupData | null> {
    try {
      const db = await this.open();
      return new Promise<BackupData | null>((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(this.KEY);

        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve(req.result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => {
          console.warn('[SnapshotIndexedDBStore] read error:', req.error);
          resolve(null);
        };
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn('[SnapshotIndexedDBStore] Failed to open IndexedDB for snapshot read:', err);
      return null;
    }
  }

  /**
   * Clears the snapshot stored in IndexedDB (used during reset or testing).
   */
  static async clear(): Promise<void> {
    try {
      const db = await this.open();
      return new Promise<void>((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(this.KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        tx.oncomplete = () => db.close();
      });
    } catch {
      // Ignore
    }
  }
}
