import { db } from '../data/db/dexie-db';
import { SRSCard } from '../domain/models/types';
import { getOrDecomposeKanji } from '../domain/dictionary/kanji-catalog';

export interface AnkiConnectRequest<T = any> {
  action: string;
  version: number;
  params?: T;
}

export interface AnkiConnectResponse<T = any> {
  result: T;
  error: string | null;
}

export interface AnkiNoteFields {
  Front: string;
  Back: string;
  [key: string]: string;
}

export interface AnkiNotePayload {
  deckName: string;
  modelName: string;
  fields: AnkiNoteFields;
  tags: string[];
  options?: {
    allowDuplicate?: boolean;
    duplicateScope?: 'deck' | 'collection';
    duplicateScopeOptions?: {
      deckName?: string;
      checkChildren?: boolean;
      checkAllModels?: boolean;
    };
  };
}

export interface AnkiSyncConfig {
  endpoint: string;
  deckName: string;
  modelName: string;
  maxRetries: number;
  initialRetryDelayMs: number;
  autoSyncIntervalMs: number;
  autoSyncEnabled: boolean;
  timeoutMs: number;
}

export interface AnkiSyncStatus {
  isChecking: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastCheckedTime: string | null;
  queueCount: number;
  syncedCount: number;
  totalCardCount: number;
  retryAttempt: number;
  maxRetries: number;
  error: string | null;
  availableDecks: string[];
  targetDeck: string;
  latencyMs?: number;
  autoSyncActive: boolean;
}

export interface AnkiSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
  retriesUsed: number;
}

export const STORAGE_SYNCED_KEY = 'nihongo_n2_anki_synced_ids';
export const STORAGE_QUEUE_KEY = 'nihongo_n2_anki_queue_ids';
export const STORAGE_LAST_SYNC_KEY = 'nihongo_n2_anki_last_sync';
export const STORAGE_AUTOSYNC_KEY = 'nihongo_n2_anki_autosync_enabled';
export const STORAGE_TARGET_DECK_KEY = 'nihongo_n2_anki_target_deck';
export const DEFAULT_ANKI_TARGET_DECK = 'Nihongo N2 Master';

export class AnkiSyncService {
  private static instance: AnkiSyncService | null = null;

  public config: AnkiSyncConfig = {
    endpoint: 'http://localhost:8765',
    deckName: DEFAULT_ANKI_TARGET_DECK,
    modelName: 'Basic',
    maxRetries: 3,
    initialRetryDelayMs: 1000,
    autoSyncIntervalMs: 60000,
    autoSyncEnabled: true,
    timeoutMs: 3500,
  };

  private status: AnkiSyncStatus = {
    isChecking: false,
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    lastCheckedTime: null,
    queueCount: 0,
    syncedCount: 0,
    totalCardCount: 0,
    retryAttempt: 0,
    maxRetries: 3,
    error: null,
    availableDecks: [],
    targetDeck: DEFAULT_ANKI_TARGET_DECK,
    latencyMs: undefined,
    autoSyncActive: false,
  };

  private listeners: Set<(status: AnkiSyncStatus) => void> = new Set();
  private autoSyncTimer: any = null;
  private syncedCardIds: Set<string> = new Set();
  private queuedCardIds: Set<string> = new Set();

  constructor() {
    this.loadPersistedState();
    this.refreshCounts().catch(() => {});
  }

  public static getInstance(): AnkiSyncService {
    if (!AnkiSyncService.instance) {
      AnkiSyncService.instance = new AnkiSyncService();
    }
    return AnkiSyncService.instance;
  }

  /**
   * Load persisted state from localStorage
   */
  private loadPersistedState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const syncedRaw = localStorage.getItem(STORAGE_SYNCED_KEY);
      if (syncedRaw) {
        const arr = JSON.parse(syncedRaw);
        if (Array.isArray(arr)) {
          this.syncedCardIds = new Set(arr);
        }
      }

      const queueRaw = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (queueRaw) {
        const arr = JSON.parse(queueRaw);
        if (Array.isArray(arr)) {
          this.queuedCardIds = new Set(arr);
        }
      }

      const lastSync = localStorage.getItem(STORAGE_LAST_SYNC_KEY);
      if (lastSync) {
        this.status.lastSyncTime = lastSync;
      }

      const autoSync = localStorage.getItem(STORAGE_AUTOSYNC_KEY);
      if (autoSync !== null) {
        this.config.autoSyncEnabled = autoSync === 'true';
      }

      const targetDeck = localStorage.getItem(STORAGE_TARGET_DECK_KEY);
      if (targetDeck && targetDeck.trim()) {
        this.config.deckName = targetDeck.trim();
      } else {
        this.config.deckName = DEFAULT_ANKI_TARGET_DECK;
      }
      this.status.targetDeck = this.config.deckName;
    } catch (e) {
      console.warn('[AnkiSyncService] Failed to load persisted state:', e);
    }
  }

  /**
   * Save synced set and queue to localStorage
   */
  private persistState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_SYNCED_KEY, JSON.stringify(Array.from(this.syncedCardIds)));
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(Array.from(this.queuedCardIds)));
      if (this.status.lastSyncTime) {
        localStorage.setItem(STORAGE_LAST_SYNC_KEY, this.status.lastSyncTime);
      }
      localStorage.setItem(STORAGE_AUTOSYNC_KEY, String(this.config.autoSyncEnabled));
      localStorage.setItem(STORAGE_TARGET_DECK_KEY, this.config.deckName || DEFAULT_ANKI_TARGET_DECK);
    } catch (e) {
      console.warn('[AnkiSyncService] Failed to persist state:', e);
    }
  }

  /**
   * Sets the target Anki deck name and persists it to localStorage
   */
  public setTargetDeck(deckName: string): void {
    const trimmed = deckName.trim() || DEFAULT_ANKI_TARGET_DECK;
    this.config.deckName = trimmed;
    this.status.targetDeck = trimmed;
    this.persistState();
    this.notifyListeners();
  }

  /**
   * Retrieves the current target Anki deck name
   */
  public getTargetDeck(): string {
    return this.config.deckName || DEFAULT_ANKI_TARGET_DECK;
  }

  /**
   * Recalculates card counts from Dexie and sync caches
   */
  public async refreshCounts(): Promise<void> {
    try {
      const allCards = await db.srs_cards.toArray();
      const totalCount = allCards.length;
      const unsyncedCards = allCards.filter((c) => !this.syncedCardIds.has(c.id));

      // Auto-populate queued set with all unsynced cards
      for (const card of unsyncedCards) {
        this.queuedCardIds.add(card.id);
      }
      this.persistState();

      this.status.totalCardCount = totalCount;
      this.status.queueCount = this.queuedCardIds.size;
      this.status.syncedCount = this.syncedCardIds.size;
      this.notifyListeners();
    } catch {
      // In SSR or non-browser environments
    }
  }

  /**
   * Send REST command to AnkiConnect with fallback endpoint support
   */
  public async invokeAnkiConnect<T = any>(
    action: string,
    params?: Record<string, any>,
    timeoutMs: number = this.config.timeoutMs
  ): Promise<T> {
    const endpoints = [this.config.endpoint];
    // Add 127.0.0.1 fallback if localhost was specified, or vice versa
    if (this.config.endpoint.includes('localhost')) {
      endpoints.push(this.config.endpoint.replace('localhost', '127.0.0.1'));
    } else if (this.config.endpoint.includes('127.0.0.1')) {
      endpoints.push(this.config.endpoint.replace('127.0.0.1', 'localhost'));
    }

    let lastError: any = null;

    for (const url of endpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            version: 6,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AnkiConnectResponse<T> = await response.json();
        if (data.error) {
          throw new Error(String(data.error));
        }

        return data.result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    throw lastError || new Error(`Failed to communicate with AnkiConnect at ${this.config.endpoint}`);
  }

  /**
   * Check connection status to Anki Desktop
   */
  public async checkConnection(): Promise<boolean> {
    this.status.isChecking = true;
    this.status.error = null;
    this.notifyListeners();

    const startTime = Date.now();
    try {
      const decks = await this.invokeAnkiConnect<string[]>('deckNames');
      const latencyMs = Date.now() - startTime;

      this.status.isChecking = false;
      this.status.isConnected = true;
      this.status.availableDecks = Array.isArray(decks) ? decks : [];
      this.status.latencyMs = latencyMs;
      this.status.lastCheckedTime = new Date().toISOString();
      this.status.error = null;
      this.notifyListeners();
      return true;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort
        ? 'Connection timed out (3.5s)'
        : (err?.message || 'Failed to connect to Anki Desktop');

      this.status.isChecking = false;
      this.status.isConnected = false;
      this.status.availableDecks = [];
      this.status.latencyMs = latencyMs;
      this.status.lastCheckedTime = new Date().toISOString();
      this.status.error = msg;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Enqueue a card ID for synchronization
   */
  public queueCard(cardId: string): void {
    if (!this.syncedCardIds.has(cardId)) {
      this.queuedCardIds.add(cardId);
      this.status.queueCount = this.queuedCardIds.size;
      this.persistState();
      this.notifyListeners();
    }
  }

  /**
   * Enqueue multiple card IDs
   */
  public queueCards(cardIds: string[]): void {
    let added = 0;
    for (const id of cardIds) {
      if (!this.syncedCardIds.has(id)) {
        this.queuedCardIds.add(id);
        added++;
      }
    }
    if (added > 0) {
      this.status.queueCount = this.queuedCardIds.size;
      this.persistState();
      this.notifyListeners();
    }
  }

  /**
   * Formats an SRSCard into an Anki note payload with rich Obsidian Glass aesthetic HTML
   */
  public formatCardToNote(card: SRSCard): AnkiNotePayload {
    const reading = card.reading || '';
    const meaningMyanmar = card.meaningMyanmar || card.meaningMy || '';
    const nuance = card.nuanceExplanationMy || '';

    // Enrich Kanji details if kanji item
    let kanjiExtra = '';
    if (card.itemType === 'kanji') {
      const kanjiDetail = getOrDecomposeKanji(card.prompt);
      if (kanjiDetail) {
        if (kanjiDetail.onyomi?.length || kanjiDetail.kunyomi?.length) {
          kanjiExtra += `<div style="font-size: 14px; color: #a1a1aa; margin-top: 4px;">音: ${kanjiDetail.onyomi?.join('、') || '—'} / 訓: ${kanjiDetail.kunyomi?.join('、') || '—'}</div>`;
        }
        if (kanjiDetail.radical) {
          kanjiExtra += `<div style="font-size: 12px; color: #71717a; margin-top: 2px;">部首: ${kanjiDetail.radical} (${kanjiDetail.radicalMeaning || ''}) · 画数: ${kanjiDetail.strokes || '—'}</div>`;
        }
      }
    }

    // Front styling
    const frontHtml = `
<div style="font-family: 'Noto Sans JP', sans-serif; text-align: center; padding: 16px;">
  <div style="font-size: 32px; font-weight: 700; color: #f43f5e; margin-bottom: 6px;">
    ${card.prompt}
  </div>
  ${reading ? `<div style="font-size: 18px; color: #94a3b8; margin-bottom: 12px;">${reading}</div>` : ''}
  ${kanjiExtra}
  ${
    card.exampleSentence
      ? `<div style="font-size: 14px; text-align: left; color: #e2e8f0; background: #1e1e24; border: 1px solid #334155; padding: 10px 14px; border-radius: 8px; margin-top: 12px; line-height: 1.5;">${card.exampleSentence}</div>`
      : ''
  }
</div>
`.trim();

    // Back styling with localized Burmese and nuance indicators
    const backHtml = `
<div style="font-family: 'Noto Sans JP', sans-serif; text-align: center; padding: 16px;">
  <div style="font-size: 20px; font-weight: 600; color: #38bdf8; margin-bottom: 6px;">
    ${card.meaning}
  </div>
  ${
    meaningMyanmar
      ? `<div style="font-family: 'Noto Sans Myanmar', sans-serif; font-size: 17px; font-weight: 500; color: #fbbf24; margin-bottom: 8px;">${meaningMyanmar}</div>`
      : ''
  }
  ${
    nuance
      ? `<div style="font-family: 'Noto Sans Myanmar', sans-serif; font-size: 13px; color: #a1a1aa; background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 6px 10px; margin: 8px auto; text-align: left; max-width: 90%;">💡 ${nuance}</div>`
      : ''
  }
  <div style="font-size: 11px; color: #71717a; border-top: 1px solid #27272a; padding-top: 8px; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
    JLPT N2 • ${card.facet || card.itemType} • ${card.lessonId}
  </div>
</div>
`.trim();

    // Construct tags
    const tags = [
      'JLPT_N2',
      'NihongoN2Master',
      `type_${card.itemType}`,
      `lesson_${card.lessonId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    ];
    if (card.isLeech || card.lapses >= 3) {
      tags.push('leech_quarantined');
    }
    if (card.intervalDays >= 21) {
      tags.push('mature_interval');
    }

    return {
      deckName: this.config.deckName,
      modelName: this.config.modelName,
      fields: {
        Front: frontHtml,
        Back: backHtml,
      },
      tags,
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck',
      },
    };
  }

  /**
   * Helper delay for backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Performs synchronization with exponential backoff retry logic
   */
  public async syncNow(options?: { forceAll?: boolean }): Promise<AnkiSyncResult> {
    if (this.status.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        error: 'Sync is already in progress',
        retriesUsed: 0,
      };
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.status.retryAttempt = 0;
    this.notifyListeners();

    let attempt = 0;
    const maxRetries = this.config.maxRetries;

    while (attempt <= maxRetries) {
      this.status.retryAttempt = attempt;
      this.notifyListeners();

      try {
        // Step 1: Ensure Anki Desktop is running & connected
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          throw new Error('Anki Desktop is not running or unreachable at ' + this.config.endpoint);
        }

        // Step 2: Ensure target deck exists
        try {
          await this.invokeAnkiConnect('createDeck', { deck: this.config.deckName });
        } catch (deckErr: any) {
          const msg = String(deckErr?.message || '').toLowerCase();
          // Only tolerate if Anki returned an application-level deck collision or already-exists response
          if (msg.includes('already exists') || msg.includes('deck exists')) {
            console.warn(`[AnkiSyncService] Target deck "${this.config.deckName}" note:`, deckErr?.message);
          } else {
            throw deckErr;
          }
        }

        // Step 3: Fetch cards to sync
        const allCards = await db.srs_cards.toArray();
        const cardsToSync: SRSCard[] = [];

        for (const card of allCards) {
          if (options?.forceAll || !this.syncedCardIds.has(card.id) || this.queuedCardIds.has(card.id)) {
            cardsToSync.push(card);
          }
        }

        if (cardsToSync.length === 0) {
          this.status.isSyncing = false;
          this.status.lastSyncTime = new Date().toISOString();
          this.status.queueCount = 0;
          this.persistState();
          this.notifyListeners();
          return {
            success: true,
            syncedCount: 0,
            failedCount: 0,
            retriesUsed: attempt,
          };
        }

        // Step 4: Convert to notes
        const notes = cardsToSync.map((c) => this.formatCardToNote(c));

        // Step 5: Push notes in batches of 50 to avoid payload overflow
        const BATCH_SIZE = 50;
        let syncedCount = 0;

        for (let i = 0; i < notes.length; i += BATCH_SIZE) {
          const batch = notes.slice(i, i + BATCH_SIZE);
          const cardBatch = cardsToSync.slice(i, i + BATCH_SIZE);

          try {
            await this.invokeAnkiConnect('addNotes', { notes: batch });
            for (const c of cardBatch) {
              this.syncedCardIds.add(c.id);
              this.queuedCardIds.delete(c.id);
            }
            syncedCount += batch.length;
          } catch (batchErr: any) {
            // Fallback: add note-by-note if duplicate or schema collision occurs in batch
            for (let j = 0; j < batch.length; j++) {
              const note = batch[j];
              const card = cardBatch[j];
              try {
                await this.invokeAnkiConnect('addNote', { note });
                this.syncedCardIds.add(card.id);
                this.queuedCardIds.delete(card.id);
                syncedCount++;
              } catch (singleErr: any) {
                // If already duplicate in Anki, mark as synced to prevent infinite loop
                if (String(singleErr?.message).includes('duplicate')) {
                  this.syncedCardIds.add(card.id);
                  this.queuedCardIds.delete(card.id);
                  syncedCount++;
                }
              }
            }
          }
        }

        // Success!
        this.status.isSyncing = false;
        this.status.lastSyncTime = new Date().toISOString();
        this.status.queueCount = this.queuedCardIds.size;
        this.status.syncedCount = this.syncedCardIds.size;
        this.status.error = null;
        this.status.retryAttempt = 0;
        this.persistState();
        this.notifyListeners();

        return {
          success: true,
          syncedCount,
          failedCount: cardsToSync.length - syncedCount,
          retriesUsed: attempt,
        };
      } catch (err: any) {
        attempt++;
        if (attempt <= maxRetries) {
          const delayMs = this.config.initialRetryDelayMs * Math.pow(2, attempt - 1);
          this.status.error = `Sync failed: ${err?.message || 'Error'}. Retrying in ${Math.round(delayMs / 1000)}s (Attempt ${attempt}/${maxRetries})...`;
          this.notifyListeners();
          await this.delay(delayMs);
        } else {
          this.status.isSyncing = false;
          this.status.error = `Sync failed after ${maxRetries} attempts: ${err?.message || 'Unreachable'}`;
          this.notifyListeners();
          return {
            success: false,
            syncedCount: 0,
            failedCount: this.queuedCardIds.size,
            error: this.status.error,
            retriesUsed: attempt - 1,
          };
        }
      }
    }

    this.status.isSyncing = false;
    this.notifyListeners();
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: 'Unexpected sync termination',
      retriesUsed: attempt,
    };
  }

  /**
   * Starts the background auto-sync worker
   */
  public startAutoSync(intervalMs: number = this.config.autoSyncIntervalMs): void {
    this.config.autoSyncIntervalMs = intervalMs;
    this.config.autoSyncEnabled = true;
    this.status.autoSyncActive = true;
    this.persistState();

    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    this.autoSyncTimer = setInterval(async () => {
      if (!this.config.autoSyncEnabled || this.status.isSyncing) return;

      // Periodically refresh counts and sync if queue is non-empty
      await this.refreshCounts();
      if (this.queuedCardIds.size > 0 && this.status.isConnected) {
        await this.syncNow();
      } else if (!this.status.isConnected) {
        await this.checkConnection();
      }
    }, intervalMs);

    this.notifyListeners();
  }

  /**
   * Stops the background auto-sync worker
   */
  public stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    this.config.autoSyncEnabled = false;
    this.status.autoSyncActive = false;
    this.persistState();
    this.notifyListeners();
  }

  /**
   * Toggles auto-sync
   */
  public toggleAutoSync(): boolean {
    if (this.status.autoSyncActive) {
      this.stopAutoSync();
      return false;
    } else {
      this.startAutoSync();
      return true;
    }
  }

  /**
   * Subscribe to status updates
   */
  public subscribe(listener: (status: AnkiSyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns current snapshot of status
   */
  public getStatus(): AnkiSyncStatus {
    return {
      ...this.status,
      targetDeck: this.config.deckName || DEFAULT_ANKI_TARGET_DECK,
    };
  }

  private notifyListeners(): void {
    const current = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (e) {
        console.error('[AnkiSyncService] Listener error:', e);
      }
    }
  }
}

export const ankiSyncService = AnkiSyncService.getInstance();
