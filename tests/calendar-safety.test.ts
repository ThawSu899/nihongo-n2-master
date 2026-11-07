import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleCalendarAdapter } from '../src/integrations/calendar/calendar-adapter';
import { StudyBlock } from '../src/domain/models/types';

describe('Google Calendar Integration Safety & Timezone Audit', () => {
  const sampleBlocks: StudyBlock[] = [
    {
      id: 'block_vocab_1',
      title: 'Vocabulary & Kanji Mastery',
      startTime: '08:00',
      endTime: '08:45',
      plannedMinutes: 45,
      completedMinutes: 0,
      countsTowardGoal: true,
      status: 'pending',
      reason: 'Morning recall sprint',
    },
    {
      id: 'block_grammar_1',
      title: 'Grammar Deep Dive',
      startTime: '19:30',
      endTime: '20:15',
      plannedMinutes: 45,
      completedMinutes: 0,
      countsTowardGoal: true,
      status: 'pending',
      reason: 'Evening synthesis',
    },
  ];

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Priority 1: Calendar Safety & Silent Fallback Prevention', () => {
    it('proves missing dedicated calendar causes NO silent primary-calendar write', async () => {
      const calls: Array<{ url: string; method?: string; body?: any }> = [];

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method || 'GET', body: init?.body });

        // Calendar list returns only primary calendar (no 'Nihongo N2 Master')
        if (url.includes('/users/me/calendarList')) {
          return {
            ok: true,
            json: async () => ({
              items: [
                { id: 'primary', summary: 'Personal Primary Calendar' },
                { id: 'work@example.com', summary: 'Work Schedule' },
              ],
            }),
          };
        }

        return { ok: true, json: async () => ({}) };
      }) as any;

      const adapter = new GoogleCalendarAdapter('test-token');

      // Attempt sync with default options (allowPrimaryFallback = false)
      const result = await adapter.syncBlocks(sampleBlocks, '2026-10-15');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Dedicated "Nihongo N2 Master" calendar was not found');
      expect(result.message).toContain('primary calendar syncing requires explicit confirmation');

      // Crucial Safety Verification: Zero mutation calls (no DELETE, no POST to events)
      const eventMutations = calls.filter(
        (c) => (c.method === 'POST' || c.method === 'DELETE' || c.method === 'PUT') && c.url.includes('/events')
      );
      expect(eventMutations).toHaveLength(0);

      // Verify no requests were made to /calendars/primary/events
      const primaryEventCalls = calls.filter((c) => c.url.includes('/calendars/primary/'));
      expect(primaryEventCalls).toHaveLength(0);
    });

    it('proves declining primary-calendar use causes zero event mutations', async () => {
      const mutationCalls: string[] = [];

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const method = init?.method || 'GET';
        if (method !== 'GET') {
          mutationCalls.push(`${method} ${url}`);
        }

        if (url.includes('/users/me/calendarList')) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: 'primary', summary: 'Personal Calendar' }],
            }),
          };
        }

        return { ok: true, json: async () => ({}) };
      }) as any;

      const adapter = new GoogleCalendarAdapter('test-token');

      // Explicitly pass allowPrimaryFallback: false (simulating user declining or not checking opt-in)
      const result = await adapter.syncBlocks(sampleBlocks, '2026-10-15', {
        allowPrimaryFallback: false,
      });

      expect(result.success).toBe(false);
      expect(mutationCalls).toHaveLength(0);
    });

    it('proves explicitly confirming primary-calendar use targets the primary calendar with app tags', async () => {
      const calls: Array<{ url: string; method?: string; body?: any }> = [];

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const method = init?.method || 'GET';
        calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined });

        if (url.includes('/users/me/calendarList')) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: 'primary', summary: 'Personal Calendar' }],
            }),
          };
        }

        if (url.includes('/events?') && method === 'GET') {
          return {
            ok: true,
            json: async () => ({ items: [] }),
          };
        }

        if (method === 'POST') {
          return {
            ok: true,
            json: async () => ({ id: 'new_evt_1', status: 'confirmed' }),
          };
        }

        return { ok: true, json: async () => ({}) };
      }) as any;

      const adapter = new GoogleCalendarAdapter('test-token');

      // User has explicitly confirmed opt-in to sync to primary calendar
      const result = await adapter.syncBlocks(sampleBlocks, '2026-10-15', {
        allowPrimaryFallback: true,
      });

      expect(result.success).toBe(true);
      expect(result.targetCalendarName).toBe('Primary Calendar');
      expect(result.isDedicated).toBe(false);

      // Verify POST requests targeted primary calendar
      const postCalls = calls.filter((c) => c.method === 'POST');
      expect(postCalls.length).toBe(sampleBlocks.length);
      for (const call of postCalls) {
        expect(call.url).toContain('/calendars/primary/events');
        // Verify all events are tagged with app metadata
        expect(call.body.extendedProperties.private.app).toBe('nihongo_n2_master');
      }
    });

    it('proves unrelated events are never deleted during sync', async () => {
      const deletedEventIds: string[] = [];
      let queriedUrl = '';

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const method = init?.method || 'GET';

        if (url.includes('/users/me/calendarList')) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: 'cal_dedicated_123', summary: 'Nihongo N2 Master' }],
            }),
          };
        }

        // Querying existing events
        if (url.includes('/events?') && method === 'GET') {
          queriedUrl = url;
          // The API returns ONLY events matching privateExtendedProperty=app=nihongo_n2_master
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  id: 'app_study_event_old_1',
                  summary: 'Nihongo N2: Old Study Block',
                  extendedProperties: { private: { app: 'nihongo_n2_master', blockId: 'block_old' } },
                },
              ],
            }),
          };
        }

        if (method === 'DELETE') {
          const match = url.match(/\/events\/([^?]+)/);
          if (match) deletedEventIds.push(match[1]);
          return { ok: true, json: async () => ({}) };
        }

        if (method === 'POST') {
          return { ok: true, json: async () => ({ id: 'new_evt', status: 'confirmed' }) };
        }

        return { ok: true, json: async () => ({}) };
      }) as any;

      const adapter = new GoogleCalendarAdapter('test-token');
      const result = await adapter.syncBlocks(sampleBlocks, '2026-10-15');

      expect(result.success).toBe(true);

      // Verify that query URL strictly enforces privateExtendedProperty filter
      expect(queriedUrl).toContain('privateExtendedProperty=app=nihongo_n2_master');

      // Verify only the app-tagged old event was deleted, never arbitrary personal events
      expect(deletedEventIds).toEqual(['app_study_event_old_1']);
      expect(deletedEventIds).not.toContain('unrelated_birthday_party');
      expect(deletedEventIds).not.toContain('doctor_appointment');
    });

    it('proves repeated sync does not create duplicate events', async () => {
      // In-memory representation of Google Calendar storage
      const calendarStore: Array<{
        id: string;
        summary: string;
        date: string;
        extendedProperties: { private: { app: string; blockId: string } };
      }> = [];

      let idCounter = 1;

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const method = init?.method || 'GET';

        if (url.includes('/users/me/calendarList')) {
          return {
            ok: true,
            json: async () => ({
              items: [{ id: 'cal_dedicated_123', summary: 'Nihongo N2 Master' }],
            }),
          };
        }

        // GET events with private filter
        if (url.includes('/events?') && method === 'GET') {
          const isAppFiltered = url.includes('privateExtendedProperty=app=nihongo_n2_master');
          const matching = isAppFiltered
            ? calendarStore.filter((e) => e.extendedProperties.private.app === 'nihongo_n2_master')
            : calendarStore;
          return {
            ok: true,
            json: async () => ({ items: matching.map((e) => ({ ...e })) }),
          };
        }

        // DELETE event
        if (method === 'DELETE') {
          const match = url.match(/\/events\/([^?]+)/);
          if (match) {
            const idx = calendarStore.findIndex((e) => e.id === match[1]);
            if (idx >= 0) calendarStore.splice(idx, 1);
          }
          return { ok: true, json: async () => ({}) };
        }

        // POST event
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const newEvent = {
            id: `event_${idCounter++}`,
            summary: body.summary,
            date: '2026-10-15',
            extendedProperties: body.extendedProperties,
          };
          calendarStore.push(newEvent);
          return { ok: true, json: async () => newEvent };
        }

        return { ok: true, json: async () => ({}) };
      }) as any;

      const adapter = new GoogleCalendarAdapter('test-token');

      // First sync run:
      const res1 = await adapter.syncBlocks(sampleBlocks, '2026-10-15');
      expect(res1.success).toBe(true);
      expect(calendarStore).toHaveLength(sampleBlocks.length);

      // Second sync run on the exact same date (e.g. re-syncing daily plan):
      const res2 = await adapter.syncBlocks(sampleBlocks, '2026-10-15');
      expect(res2.success).toBe(true);

      // Duplicate check: Count should still be exactly 2, not 4!
      expect(calendarStore).toHaveLength(sampleBlocks.length);
      expect(calendarStore.map((e) => e.extendedProperties.private.blockId)).toEqual([
        'block_vocab_1',
        'block_grammar_1',
      ]);
    });
  });

  describe('Priority 2: Target-Date Timezone Offset & Wall-Clock Preservation', () => {
    it('calculates the timezone offset for the target event date, not merely current runtime date', () => {
      const adapter = new GoogleCalendarAdapter('test-token');

      // Target summer date (July) and target winter date (January)
      const summerPayloads = adapter.createEventPayloads(sampleBlocks, '2026-07-15');
      const winterPayloads = adapter.createEventPayloads(sampleBlocks, '2026-01-15');

      expect(summerPayloads).toHaveLength(2);
      expect(winterPayloads).toHaveLength(2);

      // Verify that the wall-clock times are strictly preserved in ISO dateTime
      expect(summerPayloads[0].start.dateTime).toMatch(/^2026-07-15T08:00:00[+-]\d{2}:\d{2}$/);
      expect(summerPayloads[0].end.dateTime).toMatch(/^2026-07-15T08:45:00[+-]\d{2}:\d{2}$/);

      expect(winterPayloads[0].start.dateTime).toMatch(/^2026-01-15T08:00:00[+-]\d{2}:\d{2}$/);
      expect(winterPayloads[0].end.dateTime).toMatch(/^2026-01-15T08:45:00[+-]\d{2}:\d{2}$/);

      // Calculate expected offsets on those dates from local Date runtime
      const expectedSummerOffset = -new Date(2026, 6, 15, 8, 0).getTimezoneOffset();
      const pad = (n: number) => String(n).padStart(2, '0');
      const sSign = expectedSummerOffset >= 0 ? '+' : '-';
      const sHours = pad(Math.floor(Math.abs(expectedSummerOffset) / 60));
      const sMins = pad(Math.abs(expectedSummerOffset) % 60);
      const expectedSummerTz = `${sSign}${sHours}:${sMins}`;

      expect(summerPayloads[0].start.dateTime).toContain(expectedSummerTz);

      const expectedWinterOffset = -new Date(2026, 0, 15, 8, 0).getTimezoneOffset();
      const wSign = expectedWinterOffset >= 0 ? '+' : '-';
      const wHours = pad(Math.floor(Math.abs(expectedWinterOffset) / 60));
      const wMins = pad(Math.abs(expectedWinterOffset) % 60);
      const expectedWinterTz = `${wSign}${wHours}:${wMins}`;

      expect(winterPayloads[0].start.dateTime).toContain(expectedWinterTz);
    });

    it('preserves the learner local wall-clock study times across different dates', () => {
      const adapter = new GoogleCalendarAdapter('test-token');
      const testDates = ['2026-03-01', '2026-03-29', '2026-06-21', '2026-10-25', '2026-12-31'];

      for (const dateIso of testDates) {
        const payloads = adapter.createEventPayloads(sampleBlocks, dateIso);
        // Start time must always match block 08:00
        expect(payloads[0].start.dateTime.slice(11, 16)).toBe('08:00');
        // End time must always match block 08:45
        expect(payloads[0].end.dateTime.slice(11, 16)).toBe('08:45');

        // Evening block
        expect(payloads[1].start.dateTime.slice(11, 16)).toBe('19:30');
        expect(payloads[1].end.dateTime.slice(11, 16)).toBe('20:15');

        // Extended properties must always be present
        expect(payloads[0].extendedProperties.private.app).toBe('nihongo_n2_master');
        expect(payloads[0].reminders.overrides[0].minutes).toBe(10);
      }
    });

    it('returns clean offline message when browser is offline during syncBlocks', async () => {
      const adapter = new GoogleCalendarAdapter('test-token');
      const originalNavigator = global.navigator;
      try {
        Object.defineProperty(global, 'navigator', {
          value: { onLine: false },
          configurable: true,
          writable: true,
        });

        const res = await adapter.syncBlocks(sampleBlocks, '2026-10-15');
        expect(res.success).toBe(false);
        expect(res.message).toContain('You appear to be offline');
        expect(res.message).toContain('.ics export');
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
          writable: true,
        });
      }
    });

    it('resolves effective token from in-memory OAuth store when not passed explicitly', async () => {
      const mockAuth = await import('../src/integrations/auth/firebase-auth');
      vi.spyOn(mockAuth, 'getAccessToken').mockReturnValue('in-memory-token');

      const adapter = new GoogleCalendarAdapter(); // No explicit token
      expect(adapter.isConfigured()).toBe(true);
      expect(adapter.getEffectiveAccessToken()).toBe('in-memory-token');
    });
  });
});
