import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/data/db/dexie-db';
import { EventRepository } from '../src/data/repositories/event-repository';
import { StudyEvent } from '../src/domain/models/types';

describe('EventRepository Data Layer', () => {
  beforeEach(async () => {
    await db.study_events.clear();
    EventRepository.resetSequenceCounter();
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

  it('deterministically orders events sharing identical ISO timestamp strings using sequence', async () => {
    const sharedTimestamp = '2026-03-30T10:00:00.000Z';
    const e1 = await EventRepository.record(
      'block_completed',
      { blockId: 'b1' },
      undefined,
      undefined,
      { timestamp: sharedTimestamp, sequence: 10 }
    );
    const e2 = await EventRepository.record(
      'test_completed',
      { testId: 't1' },
      undefined,
      undefined,
      { timestamp: sharedTimestamp, sequence: 5 }
    );
    const e3 = await EventRepository.record(
      'srs_reviewed',
      { cardId: 'c1' },
      undefined,
      undefined,
      { timestamp: sharedTimestamp, sequence: 20 }
    );

    const all = await EventRepository.getAllEvents();
    expect(all.map((e) => e.id)).toEqual([e2.id, e1.id, e3.id]);
  });

  it('deterministically breaks ties using ID when timestamps and sequences are equal', async () => {
    const sharedTimestamp = '2026-03-30T10:00:00.000Z';
    const eA: StudyEvent = {
      id: 'evt_fixed_aaa',
      timestamp: sharedTimestamp,
      sequence: 1,
      type: 'block_completed',
      data: {},
    };
    const eB: StudyEvent = {
      id: 'evt_fixed_bbb',
      timestamp: sharedTimestamp,
      sequence: 1,
      type: 'test_completed',
      data: {},
    };
    await db.study_events.bulkAdd([eB, eA]);

    const all = await EventRepository.getAllEvents();
    expect(all.map((e) => e.id)).toEqual(['evt_fixed_aaa', 'evt_fixed_bbb']);
  });

  it('orders multiple rapid consecutive calls to record chronologically even within the same millisecond', async () => {
    const events = await Promise.all([
      EventRepository.record('block_completed', { idx: 1 }),
      EventRepository.record('block_completed', { idx: 2 }),
      EventRepository.record('block_completed', { idx: 3 }),
      EventRepository.record('block_completed', { idx: 4 }),
      EventRepository.record('block_completed', { idx: 5 }),
    ]);

    const all = await EventRepository.getAllEvents();
    expect(all).toHaveLength(5);
    expect(all.map((e) => e.id)).toEqual(events.map((e) => e.id));
  });
});
