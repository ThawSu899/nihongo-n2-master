/**
 * AnkiConnect REST Client for Local Anki Desktop Integration
 * Default endpoint: http://127.0.0.1:8765
 */

export interface AnkiConnectResponse<T = unknown> {
  result: T;
  error: string | null;
}

export interface AnkiConnectionResult {
  connected: boolean;
  decks: string[];
  error?: string;
  latencyMs?: number;
}

export class AnkiConnectClient {
  static readonly DEFAULT_URL = 'http://127.0.0.1:8765';
  static readonly DEFAULT_TIMEOUT_MS = 3500;

  /**
   * Pings AnkiConnect on local host with `deckNames` action
   */
  static async checkConnection(
    endpoint: string = this.DEFAULT_URL,
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS
  ): Promise<AnkiConnectionResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deckNames',
          version: 6,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          connected: false,
          decks: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
          latencyMs,
        };
      }

      const data: AnkiConnectResponse<string[]> = await response.json();

      if (data.error) {
        return {
          connected: false,
          decks: [],
          error: String(data.error),
          latencyMs,
        };
      }

      const decks = Array.isArray(data.result) ? data.result : [];
      return {
        connected: true,
        decks,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const isAbort = err?.name === 'AbortError';

      return {
        connected: false,
        decks: [],
        error: isAbort ? 'Connection timed out (3.5s)' : (err?.message || 'Failed to connect to Anki Desktop'),
        latencyMs,
      };
    }
  }
}
