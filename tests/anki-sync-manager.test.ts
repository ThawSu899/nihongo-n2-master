import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnkiConnectClient } from '../src/data/backup/anki-connect';
import { AnkiSyncManager } from '../src/presentation/components/AnkiSyncManager';

describe('AnkiConnectClient & AnkiSyncManager Integration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('AnkiConnectClient.checkConnection', () => {
    it('successfully connects to AnkiConnect and returns deck names', async () => {
      const mockDecks = ['Default', 'Nihongo N2 Master', 'Leech Quarantine'];
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: mockDecks,
          error: null,
        }),
      } as Response);

      const result = await AnkiConnectClient.checkConnection('http://127.0.0.1:8765');

      expect(result.connected).toBe(true);
      expect(result.decks).toEqual(mockDecks);
      expect(result.error).toBeUndefined();
      expect(typeof result.latencyMs).toBe('number');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deckNames', version: 6 }),
        })
      );
    });

    it('handles AnkiConnect application-level error response properly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: null,
          error: 'AnkiConnect plugin disabled by user configuration',
        }),
      } as Response);

      const result = await AnkiConnectClient.checkConnection('http://127.0.0.1:8765');

      expect(result.connected).toBe(false);
      expect(result.decks).toEqual([]);
      expect(result.error).toBe('AnkiConnect plugin disabled by user configuration');
    });

    it('safely handles non-200 HTTP responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      const result = await AnkiConnectClient.checkConnection('http://127.0.0.1:8765');

      expect(result.connected).toBe(false);
      expect(result.decks).toEqual([]);
      expect(result.error).toContain('HTTP 503');
    });

    it('safely catches network disconnection when Anki Desktop is closed', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const result = await AnkiConnectClient.checkConnection('http://127.0.0.1:8765');

      expect(result.connected).toBe(false);
      expect(result.decks).toEqual([]);
      expect(result.error).toBe('Failed to fetch');
    });

    it('handles request timeout gracefully', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await AnkiConnectClient.checkConnection('http://127.0.0.1:8765', 50);

      expect(result.connected).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('AnkiSyncManager Component Verification', () => {
    it('exports AnkiSyncManager as a valid React component', () => {
      expect(AnkiSyncManager).toBeDefined();
      expect(typeof AnkiSyncManager).toBe('function');
    });

    it('renders Target Deck Selector row with default deck badge and options', () => {
      const html = renderToString(React.createElement(AnkiSyncManager));
      expect(html).toBeDefined();
      expect(html).toContain('Target Deck (ရည်ရွယ်ရာ Deck)');
      expect(html).toContain('Nihongo N2 Master');
      expect(html).toContain('Custom Deck Name...');
    });
  });
});
