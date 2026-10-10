import { db } from '../db/dexie-db';
import { StudyEvent } from '../../domain/models/types';

export class EventRepository {
  static async record(
    type: StudyEvent['type'],
    data: Record<string, any> = {},
    lessonId?: string,
    stageNumber?: number
  ): Promise<StudyEvent> {
    const event: StudyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      type,
      lessonId,
      stageNumber,
      data,
    };

    await db.study_events.add(event);
    return event;
  }

  static async getEventsForLesson(lessonId: string): Promise<StudyEvent[]> {
    return db.study_events.where('lessonId').equals(lessonId).toArray();
  }

  static async getAllEvents(): Promise<StudyEvent[]> {
    return db.study_events.orderBy('timestamp').toArray();
  }
}
