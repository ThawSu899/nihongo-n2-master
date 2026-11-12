import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/data/db/dexie-db';
import { EventRepository } from '../src/data/repositories/event-repository';

describe('EventRepository Data Layer', () => {
  beforeEach(async () => {
    await db.study_events.clear();
  });

  it('records an event with auto-generated ID, ISO timestamp, and metadata', async () => {
    const event = await EventRepository.record(
      'lesson_started',
      { score: 95, durationSec: 120 },
      'n5.l01',
      5
    );

    expect(event).toBeDefined();
    expect(event.id).toMatch(/^evt_\d+_[a-z0-9]+$/);
    expect(event.type).toBe('lesson_started');
    expect(event.lessonId).toBe('n5.l01');
    expect(event.stageNumber).toBe(5);
    expect(event.data).toEqual({ score: 95, durationSec: 120 });
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();

    const stored = await db.study_events.get(event.id);
    expect(stored).toEqual(event);
  });

  it('retrieves events filtered by lessonId', async () => {
    await EventRepository.record('stage_completed', { stage: 1 }, 'n5.l01');
    await EventRepository.record('stage_completed', { stage: 2 }, 'n5.l01');
    await EventRepository.record('stage_completed', { stage: 1 }, 'n5.l02');

    const l01Events = await EventRepository.getEventsForLesson('n5.l01');
    expect(l01Events).toHaveLength(2);
    expect(l01Events.every((e) => e.lessonId === 'n5.l01')).toBe(true);

    const l02Events = await EventRepository.getEventsForLesson('n5.l02');
    expect(l02Events).toHaveLength(1);
    expect(l02Events[0].lessonId === 'n5.l02').toBe(true);

    const emptyEvents = await EventRepository.getEventsForLesson('n5.l99');
    expect(emptyEvents).toHaveLength(0);
  });

  it('retrieves all events ordered by timestamp', async () => {
    const e1 = await EventRepository.record('block_completed', { blockId: 'b1' });
    const e2 = await EventRepository.record('test_completed', { testId: 't1' });
    const e3 = await EventRepository.record('srs_reviewed', { cardId: 'c1' });

    const all = await EventRepository.getAllEvents();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.id)).toEqual([e1.id, e2.id, e3.id]);
  });
});
