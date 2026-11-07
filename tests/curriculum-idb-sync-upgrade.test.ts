import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/data/db/dexie-db';
import { ContentLoader } from '../src/data/content/content-loader';
import { CurriculumScreen } from '../src/presentation/screens/CurriculumScreen';
import { LessonPack } from '../src/domain/models/types';

describe('Curriculum & IndexedDB Auto-Upgrade Synchronization Suite', () => {
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

    for (const table of db.tables) {
      await table.clear();
    }
  });

  describe('1. CurriculumMap Single Source of Truth & 100% Published Guarantee', () => {
    it('returns all 174 lessons from ContentLoader.getCurriculumMap() with status published', () => {
      const map = ContentLoader.getCurriculumMap();
      expect(map).toHaveLength(174);

      const n5 = map.filter((i) => i.level === 'N5');
      const n4 = map.filter((i) => i.level === 'N4');
      const n3 = map.filter((i) => i.level === 'N3');
      const n2 = map.filter((i) => i.level === 'N2');

      expect(n5).toHaveLength(30);
      expect(n4).toHaveLength(36);
      expect(n3).toHaveLength(48);
      expect(n2).toHaveLength(60);

      // Verify zero planned, quarantined, or placeholder items
      for (const item of map) {
        expect(item.status).toBe('published');
        expect(item.title).not.toContain('X を Y します');
        for (const topic of item.grammarTopics) {
          expect(topic).not.toContain('X を Y します');
          expect(topic).not.toMatch(/Grammar Point \d/i);
        }
      }
    });
  });

  describe('2. Auto-Upgrade of Stale / Placeholder IndexedDB State on Boot', () => {
    it('detects and purges stale planned, quarantined, or placeholder packs from IndexedDB', async () => {
      // Seed IndexedDB with simulated stale legacy packs from older versions
      const stalePlannedPack: any = {
        id: 'n2.l04',
        title: 'Lesson 4: Stale Placeholder (X を Y します)',
        level: 'N2',
        module: 'N2 Core',
        number: 4,
        status: 'planned',
        stages: [],
      };

      const staleCorruptPack: any = {
        id: 'n3.l35',
        title: 'Lesson 35: Incomplete Old Cache',
        level: 'N3',
        module: 'N3 Core',
        number: 35,
        status: 'published',
        vocabularies: [], // empty vocab
        grammars: [{ id: 'g1', title: 'g' }],
        questions: [{ id: 'q1', text: 'q' }],
      };

      const stalePlaceholderPack: any = {
        id: 'n2.l10',
        title: 'Lesson 10: X を Y します',
        level: 'N2',
        module: 'N2 Core',
        number: 10,
        status: 'published',
        vocabularies: [{ id: 'v1', ja: 'X を Y します' }],
        grammars: [{ id: 'g1', pattern: 'X を Y します' }],
        questions: [{ id: 'q1', prompt: 'X を Y します' }],
      };

      await db.lesson_packs.bulkAdd([stalePlannedPack, staleCorruptPack, stalePlaceholderPack]);

      // Set snapshot with stale planned pack
      mockLocalStorage.store['nihongo_n2_local_snapshot'] = JSON.stringify({
        version: 2,
        exportedAt: '2026-10-01T00:00:00Z',
        lessonPacks: [stalePlannedPack, stalePlaceholderPack],
      });

      expect(await db.lesson_packs.count()).toBe(3);

      // Run boot auto-upgrade
      const upgradeResult = await ContentLoader.autoUpgradeStaleIndexedDB();

      expect(upgradeResult.upgraded).toBe(true);
      expect(upgradeResult.purgedPacksCount).toBe(3);
      expect(await db.lesson_packs.count()).toBe(0);

      // Verify snapshot was sanitized
      const sanitizedSnapshot = JSON.parse(mockLocalStorage.store['nihongo_n2_local_snapshot']);
      expect(sanitizedSnapshot.lessonPacks).toEqual([]);
    });

    it('ContentLoader.getLessonPack automatically evicts stale IDB entries on demand and loads valid canonical pack', async () => {
      // Seed a stale planned pack into IndexedDB
      await db.lesson_packs.put({
        id: 'n2.l04',
        title: 'Lesson 4 (Planned)',
        level: 'N2',
        module: 'N2 Core',
        number: 4,
        status: 'planned',
        stages: [],
      } as any);

      // Requesting the pack should evict the stale pack and load the canonical published pack
      const pack = await ContentLoader.getLessonPack('n2.l04');
      expect(pack).not.toBeNull();
      expect(pack?.id).toBe('n2.l04');
      expect(pack?.status).toBe('published');
      expect(pack?.vocabularies.length).toBeGreaterThan(0);
      expect(pack?.grammars.length).toBeGreaterThan(0);
      expect(pack?.questions.length).toBeGreaterThan(0);
      expect(JSON.stringify(pack)).not.toContain('X を Y します');

      // Verify IndexedDB now holds the updated canonical pack
      const updatedInDb = await db.lesson_packs.get('n2.l04');
      expect(updatedInDb).toBeDefined();
      expect(updatedInDb?.status).toBe('published');
      expect(updatedInDb?.vocabularies.length).toBeGreaterThan(0);
    });
  });

  describe('3. CurriculumScreen UI Rendering & Clickable Study Navigation', () => {
    it('renders N2 track with 60 published lessons (never "0 of 3 published lessons")', () => {
      const htmlN2 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: vi.fn(),
          masteryRecords: {},
          initialLevel: 'N2',
        })
      ).replace(/<!-- -->/g, '');

      // Check header counts & published progress text
      expect(htmlN2).toContain('N2 (60)');
      expect(htmlN2).toContain('0 of 60 published lessons mastered');
      expect(htmlN2).not.toContain('0 of 3 published lessons');

      // Verify zero "Outline only" or "Locked" badges
      expect(htmlN2).not.toContain('Outline only');
      expect(htmlN2).not.toContain('Locked');

      // Check that N2 lessons have "Study" or "Study Now" button
      expect(htmlN2).toContain('n2.l01');
      expect(htmlN2).toContain('n2.l04');
      expect(htmlN2).toContain('n2.l30');
      expect(htmlN2).toContain('n2.l60');
      expect(htmlN2).toContain('Study');
    });

    it('renders N3 track with 48 published lessons (never "0 of 30 published lessons")', () => {
      const htmlN3 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: vi.fn(),
          masteryRecords: {},
          initialLevel: 'N3',
        })
      ).replace(/<!-- -->/g, '');

      expect(htmlN3).toContain('N3 (48)');
      expect(htmlN3).toContain('0 of 48 published lessons mastered');
      expect(htmlN3).not.toContain('Outline only');
      expect(htmlN3).toContain('n3.l01');
      expect(htmlN3).toContain('n3.l31');
      expect(htmlN3).toContain('n3.l48');
    });

    it('renders interactive card containers with role="button", tabIndex, and aria-labels for keyboard & mouse access', () => {
      const html = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: vi.fn(),
          masteryRecords: {},
          initialLevel: 'N4',
        })
      ).replace(/<!-- -->/g, '');

      expect(html).toContain('N4 (36)');
      expect(html).toContain('0 of 36 published lessons mastered');
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-label="Study lesson 1:');
    });
  });
});
