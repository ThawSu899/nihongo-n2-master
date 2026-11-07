import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnkiSyncService } from '../src/services/anki-sync';
import { db } from '../src/data/db/dexie-db';
import { SRSCard } from '../src/domain/models/types';

describe('AnkiSyncService Background Worker', () => {
  const originalFetch = globalThis.fetch;
  let service: AnkiSyncService;

  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      mockLocalStorage.store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
      mockLocalStorage.store = {};
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    await db.srs_cards.clear();
    service = new AnkiSyncService();
    service.config.endpoint = 'http://localhost:8765';
    service.config.initialRetryDelayMs = 10; // fast tests
    service.config.maxRetries = 2;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (service) {
      service.stopAutoSync();
    }
  });

  it('checks connection to http://localhost:8765 successfully', async () => {
    const mockDecks = ['Default', 'Nihongo N2 Master'];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: mockDecks,
        error: null,
      }),
    } as Response);

    const connected = await service.checkConnection();
    expect(connected).toBe(true);

    const status = service.getStatus();
    expect(status.isConnected).toBe(true);
    expect(status.availableDecks).toEqual(mockDecks);
    expect(status.error).toBeNull();
  });

  it('handles connection failure to Anki Desktop gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to connect'));

    const connected = await service.checkConnection();
    expect(connected).toBe(false);

    const status = service.getStatus();
    expect(status.isConnected).toBe(false);
    expect(status.availableDecks).toEqual([]);
    expect(status.error).toContain('Failed to connect');
  });

  it('formats SRSCard to Anki note with Burmese translation and Nuance warning', () => {
    const card: SRSCard = {
      id: 'vocab_1:recog',
      itemId: 'vocab_1',
      lessonId: 'n2.l01',
      itemType: 'vocab',
      facet: 'recog',
      prompt: '契機',
      reading: 'けいき',
      meaning: 'opportunity, trigger',
      meaningMyanmar: 'အခွင့်အရေး၊ အကြောင်းတရား',
      nuanceExplanationMy: 'အပြောင်းအလဲကြီးတစ်ခု စတင်ရန် အကြောင်းရင်းဖြစ်သည်',
      exampleSentence: 'これを契機に日本語の勉強を始めた。',
      state: 'learning',
      intervalDays: 5,
      repetition: 2,
      stability: 2.5,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: '2026-10-20T00:00:00Z',
    };

    const note = service.formatCardToNote(card);
    expect(note.deckName).toBe('Nihongo N2 Master');
    expect(note.modelName).toBe('Basic');
    expect(note.fields.Front).toContain('契機');
    expect(note.fields.Front).toContain('けいき');
    expect(note.fields.Front).toContain('これを契機に日本語の勉強を始めた。');
    expect(note.fields.Back).toContain('opportunity, trigger');
    expect(note.fields.Back).toContain('အခွင့်အရေး၊ အကြောင်းတရား');
    expect(note.fields.Back).toContain('အပြောင်းအလဲကြီးတစ်ခု စတင်ရန် အကြောင်းရင်းဖြစ်သည်');
    expect(note.tags).toContain('JLPT_N2');
    expect(note.tags).toContain('NihongoN2Master');
    expect(note.tags).toContain('type_vocab');
    expect(note.tags).toContain('lesson_n2_l01');
  });

  it('queues cards and syncs them to Anki via createDeck and addNotes', async () => {
    const card: SRSCard = {
      id: 'grammar_1:cloze',
      itemId: 'grammar_1',
      lessonId: 'n2.l06',
      itemType: 'grammar',
      facet: 'cloze',
      prompt: '～としたら',
      meaning: 'if, supposing that',
      meaningMyanmar: 'အကယ်၍ ... ဆိုလျှင်',
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 1,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: '2026-10-19T00:00:00Z',
    };

    await db.srs_cards.put(card);
    await service.refreshCounts();

    expect(service.getStatus().queueCount).toBe(1);

    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'deckNames') {
        return {
          ok: true,
          json: async () => ({ result: ['Default'], error: null }),
        } as Response;
      }
      if (body.action === 'createDeck') {
        return {
          ok: true,
          json: async () => ({ result: 123456, error: null }),
        } as Response;
      }
      if (body.action === 'addNotes') {
        return {
          ok: true,
          json: async () => ({ result: [1111], error: null }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ result: null, error: null }),
      } as Response;
    });

    const result = await service.syncNow();
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const status = service.getStatus();
    expect(status.queueCount).toBe(0);
    expect(status.syncedCount).toBe(1);
    expect(status.lastSyncTime).not.toBeNull();
  });

  it('retries with exponential backoff on transient failure and succeeds on retry', async () => {
    const card: SRSCard = {
      id: 'kanji_1:recog',
      itemId: 'kanji_1',
      lessonId: 'n2.l01',
      itemType: 'kanji',
      facet: 'recog',
      prompt: '契',
      meaning: 'pledge, contract',
      meaningMyanmar: 'ကတိ၊ စာချုပ်',
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 1,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: '2026-10-19T00:00:00Z',
    };

    await db.srs_cards.put(card);
    service.queueCard(card.id);

    let createDeckCalls = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'deckNames') {
        return {
          ok: true,
          json: async () => ({ result: ['Default', 'Nihongo N2 Master'], error: null }),
        } as Response;
      }
      if (body.action === 'createDeck') {
        createDeckCalls++;
        // Fail for both endpoint attempts on attempt 0
        if (createDeckCalls <= 2) {
          throw new Error('Temporary socket timeout');
        }
        return {
          ok: true,
          json: async () => ({ result: 12345, error: null }),
        } as Response;
      }
      if (body.action === 'addNotes') {
        return {
          ok: true,
          json: async () => ({ result: [2222], error: null }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ result: null, error: null }),
      } as Response;
    });

    const result = await service.syncNow();
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);
    expect(result.retriesUsed).toBe(1);
  });

  it('stops retry when maxRetries is exceeded and leaves cards in queue', async () => {
    const card: SRSCard = {
      id: 'vocab_2:recog',
      itemId: 'vocab_2',
      lessonId: 'n2.l01',
      itemType: 'vocab',
      facet: 'recog',
      prompt: '単語',
      meaning: 'vocabulary word',
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 1,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: '2026-10-19T00:00:00Z',
    };

    await db.srs_cards.put(card);
    service.queueCard(card.id);

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection permanently refused'));

    const result = await service.syncNow();
    expect(result.success).toBe(false);
    expect(result.syncedCount).toBe(0);
    expect(result.error).toContain('Sync failed after 2 attempts');
    // Card should still be retained in queue
    expect(service.getStatus().queueCount).toBe(1);
  });

  it('toggles and manages auto-sync worker interval', () => {
    expect(service.getStatus().autoSyncActive).toBe(false);

    service.startAutoSync(5000);
    expect(service.getStatus().autoSyncActive).toBe(true);

    service.stopAutoSync();
    expect(service.getStatus().autoSyncActive).toBe(false);

    const toggledOn = service.toggleAutoSync();
    expect(toggledOn).toBe(true);
    expect(service.getStatus().autoSyncActive).toBe(true);

    const toggledOff = service.toggleAutoSync();
    expect(toggledOff).toBe(false);
    expect(service.getStatus().autoSyncActive).toBe(false);
  });

  it('persists and retrieves custom ankiTargetDeck preference', () => {
    // 1. Initial default check
    expect(service.getTargetDeck()).toBe('Nihongo N2 Master');
    expect(service.getStatus().targetDeck).toBe('Nihongo N2 Master');

    // 2. Set custom deck
    service.setTargetDeck('Japanese::N5 Bootcamp');
    expect(service.getTargetDeck()).toBe('Japanese::N5 Bootcamp');
    expect(service.getStatus().targetDeck).toBe('Japanese::N5 Bootcamp');
    expect(mockLocalStorage.store['nihongo_n2_anki_target_deck']).toBe('Japanese::N5 Bootcamp');

    // 3. New service instance reloads from localStorage
    const newService = new AnkiSyncService();
    expect(newService.getTargetDeck()).toBe('Japanese::N5 Bootcamp');
    expect(newService.getStatus().targetDeck).toBe('Japanese::N5 Bootcamp');

    // 4. Safely falls back to default if given empty or whitespace name
    service.setTargetDeck('   ');
    expect(service.getTargetDeck()).toBe('Nihongo N2 Master');
  });

  it('routes formatCardToNote and syncNow payload to the selected target deck', async () => {
    service.setTargetDeck('JLPT::N2 Special Drills');

    const card: SRSCard = {
      id: 'vocab_deck_test',
      itemId: 'vocab_deck_test',
      lessonId: 'n2.l01',
      itemType: 'vocab',
      facet: 'recog',
      prompt: '挑戦',
      reading: 'ちょうせん',
      meaning: 'challenge',
      meaningMyanmar: 'စိန်ခေါ်မှု',
      state: 'new',
      intervalDays: 0,
      repetition: 0,
      stability: 1,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: '2026-10-19T00:00:00Z',
    };

    // 1. formatCardToNote test
    const note = service.formatCardToNote(card);
    expect(note.deckName).toBe('JLPT::N2 Special Drills');

    // 2. syncNow JSON-RPC payload test
    await db.srs_cards.put(card);
    service.queueCard(card.id);

    const capturedBodies: any[] = [];
    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body);
      capturedBodies.push(body);
      if (body.action === 'deckNames') {
        return {
          ok: true,
          json: async () => ({ result: ['Default'], error: null }),
        } as Response;
      }
      if (body.action === 'createDeck') {
        return {
          ok: true,
          json: async () => ({ result: 99999, error: null }),
        } as Response;
      }
      if (body.action === 'addNotes') {
        return {
          ok: true,
          json: async () => ({ result: [3333], error: null }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ result: null, error: null }),
      } as Response;
    });

    const result = await service.syncNow();
    expect(result.success).toBe(true);

    // Assert createDeck action carried the custom target deck
    const createDeckCall = capturedBodies.find((b) => b.action === 'createDeck');
    expect(createDeckCall).toBeDefined();
    expect(createDeckCall.params.deck).toBe('JLPT::N2 Special Drills');

    // Assert addNotes action carried the custom target deck
    const addNotesCall = capturedBodies.find((b) => b.action === 'addNotes');
    expect(addNotesCall).toBeDefined();
    expect(addNotesCall.params.notes[0].deckName).toBe('JLPT::N2 Special Drills');
  });
});
