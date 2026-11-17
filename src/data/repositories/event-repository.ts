import { db } from '../db/dexie-db';
import { StudyEvent } from '../../domain/models/types';

export interface RecordEventOptions {
  timestamp?: string;
  sequence?: number;
}

export class EventRepository {
  private static sequenceCounter = 0;

  static resetSequenceCounter(): void {
    this.sequenceCounter = 0;
  }

  static async record(
    type: StudyEvent['type'],
    data: Record<string, any> = {},
    lessonId?: string,
    stageNumber?: number,
    options?: RecordEventOptions
  ): Promise<StudyEvent> {
    const event: StudyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: options?.timestamp || new Date().toISOString(),
      sequence: options?.sequence !== undefined ? options.sequence : ++this.sequenceCounter,
      type,
      lessonId,
      stageNumber,
      data,
    };

    await db.study_events.add(event);
    return event;
  }

  static sortEventsChronologically(events: StudyEvent[]): StudyEvent[] {
    return events.slice().sort((a, b) => {
      const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      const seqA = a.sequence ?? 0;
      const seqB = b.sequence ?? 0;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      return a.id.localeCompare(b.id);
    });
  }

  static async getEventsForLesson(lessonId: string): Promise<StudyEvent[]> {
    const events = await db.study_events.where('lessonId').equals(lessonId).toArray();
    return this.sortEventsChronologically(events);
  }

  static async getAllEvents(): Promise<StudyEvent[]> {
    const events = await db.study_events.orderBy('timestamp').toArray();
    return this.sortEventsChronologically(events);
  }
}
