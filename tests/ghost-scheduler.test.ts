import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/data/db/dexie-db';
import { GhostScheduler, GHOST_STAGE_INTERVALS_HOURS } from '../src/domain/srs/ghost-scheduler';
import { SRSCard } from '../src/domain/models/types';

describe('GhostScheduler Quarantine Engine', () => {
  beforeEach(async () => {
    await db.ghost_cards.clear();
    await db.srs_cards.clear();
  });

  const createSampleCard = (overrides: Partial<SRSCard> = {}): SRSCard => ({
    id: 'n2.l06.g002:cloze',
    itemId: 'n2.l06.g002',
    lessonId: 'n2.l06',
    itemType: 'grammar',
    facet: 'cloze',
    prompt: 'ものなら',
    reading: 'ものなら',
    meaning: 'if one could (unlikely / wishful desire)',
    exampleSentence: '彼が約束を守るものなら、最初から苦労はしない。',
    state: 'review',
    intervalDays: 1,
    repetition: 2,
    stability: 2.0,
    difficulty: 4.5,
    lapses: 0,
    isLeech: false,
    due: new Date().toISOString(),
    ...overrides,
  });

  describe('Ghost Spawning & Quarantine Isolation', () => {
    it('does not spawn a ghost if card lapses < 3 and not leech', async () => {
      const card = createSampleCard({ lapses: 2, isLeech: false });
      const ghost = await GhostScheduler.spawnGhost(card);
      expect(ghost).toBeNull();
      const count = await db.ghost_cards.count();
      expect(count).toBe(0);
    });

    it('spawns a stage-1 ghost when lapses >= 3', async () => {
      const card = createSampleCard({ lapses: 3, isLeech: true });
      const ghost = await GhostScheduler.spawnGhost(card);

      expect(ghost).not.toBeNull();
      expect(ghost?.parentCardId).toBe(card.id);
      expect(ghost?.grammarId).toBe(card.itemId);
      expect(ghost?.stage).toBe(1);
      expect(ghost?.conquered).toBe(false);
      expect(ghost?.clozeTarget).toBe('ものなら');
      expect(ghost?.clozeSentence).toContain('____');

      const dueDeltaHours = (new Date(ghost!.due).getTime() - Date.now()) / (3600 * 1000);
      expect(dueDeltaHours).toBeGreaterThan(3.9);
      expect(dueDeltaHours).toBeLessThan(4.1);
    });

    it('prevents duplicate ghosts for the same parent card', async () => {
      const card = createSampleCard({ lapses: 4, isLeech: true });
      const ghost1 = await GhostScheduler.spawnGhost(card);
      const ghost2 = await GhostScheduler.spawnGhost(card);

      expect(ghost1?.id).toBe(ghost2?.id);
      const total = await db.ghost_cards.count();
      expect(total).toBe(1);
    });
  });

  describe('Micro-Interval Progression (4h -> 8h -> 24h -> 48h -> Conquered)', () => {
    it('advances through all 4 stages upon consecutive passes', async () => {
      const card = createSampleCard({ lapses: 3 });
      const initial = await GhostScheduler.spawnGhost(card);
      expect(initial).not.toBeNull();

      // Stage 1 -> Stage 2 (+8h)
      const stage2 = await GhostScheduler.advanceGhost(initial!.id, true);
      expect(stage2?.stage).toBe(2);
      expect(stage2?.conquered).toBe(false);

      // Stage 2 -> Stage 3 (+24h)
      const stage3 = await GhostScheduler.advanceGhost(initial!.id, true);
      expect(stage3?.stage).toBe(3);
      expect(stage3?.conquered).toBe(false);

      // Stage 3 -> Stage 4 (+48h)
      const stage4 = await GhostScheduler.advanceGhost(initial!.id, true);
      expect(stage4?.stage).toBe(4);
      expect(stage4?.conquered).toBe(false);

      // Stage 4 -> Conquered!
      const conquered = await GhostScheduler.advanceGhost(initial!.id, true);
      expect(conquered?.stage).toBe(4);
      expect(conquered?.conquered).toBe(true);
      expect(conquered?.conqueredAt).toBeDefined();

      const active = await GhostScheduler.getActiveGhosts();
      expect(active.length).toBe(0);

      const conqueredTotal = await GhostScheduler.getConqueredCount();
      expect(conqueredTotal).toBe(1);
    });

    it('demotes back to Stage 1 on failure', async () => {
      const card = createSampleCard({ lapses: 3 });
      const initial = await GhostScheduler.spawnGhost(card);

      // Advance to stage 3
      await GhostScheduler.advanceGhost(initial!.id, true); // to stage 2
      await GhostScheduler.advanceGhost(initial!.id, true); // to stage 3

      // Fail review at stage 3
      const demoted = await GhostScheduler.advanceGhost(initial!.id, false);
      expect(demoted?.stage).toBe(1);
      expect(demoted?.conquered).toBe(false);

      const dueDeltaHours = (new Date(demoted!.due).getTime() - Date.now()) / (3600 * 1000);
      expect(dueDeltaHours).toBeGreaterThan(3.9);
      expect(dueDeltaHours).toBeLessThan(4.1);
    });
  });

  describe('Exorcism & Deletion', () => {
    it('allows forceful exorcism of an active ghost', async () => {
      const card = createSampleCard({ lapses: 5, isLeech: true });
      const ghost = await GhostScheduler.spawnGhost(card);

      const success = await GhostScheduler.exorciseGhost(ghost!.id);
      expect(success).toBe(true);

      const active = await GhostScheduler.getActiveGhosts();
      expect(active.length).toBe(0);

      const conqueredCount = await GhostScheduler.getConqueredCount();
      expect(conqueredCount).toBe(1);
    });

    it('allows deleting a ghost record', async () => {
      const card = createSampleCard({ lapses: 3 });
      const ghost = await GhostScheduler.spawnGhost(card);

      await GhostScheduler.deleteGhost(ghost!.id);
      const total = await db.ghost_cards.count();
      expect(total).toBe(0);
    });
  });
});
