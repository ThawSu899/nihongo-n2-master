import { LessonPack, CurriculumMapItem, LessonPackSchema } from '../../domain/models/types';
import curriculumMapJson from '../../../content/curriculum-map.json';
import { db } from '../db/dexie-db';

// Lazy-load packs dynamically across all levels without bloating initial bundle
const packModules = import.meta.glob<LessonPack>('/content/packs/**/*.json');

export class ContentLoader {
  static getCurriculumMap(): CurriculumMapItem[] {
    return curriculumMapJson as CurriculumMapItem[];
  }

  static async getLessonPack(lessonId: string): Promise<LessonPack | null> {
    // 0. Guard: Check canonical curriculum map; reject if not published
    const mapItem = (curriculumMapJson as CurriculumMapItem[]).find((m) => m.id === lessonId);
    if (!mapItem || mapItem.status !== 'published') {
      return null;
    }

    // 1. Check IndexedDB first (allows offline edits and persistent state)
    try {
      const dbPack = await db.lesson_packs.get(lessonId);
      if (dbPack) {
        if (dbPack.status === 'published') {
          return dbPack;
        }
        return null;
      }
    } catch {
      // Continue to bundled files if DB is warming up
    }

    // 2. Resolve matching path from lazy-loaded packs
    const matchingPath = Object.keys(packModules).find((p) => p.endsWith(`/${lessonId}.json`));
    if (matchingPath) {
      try {
        const mod: any = await packModules[matchingPath]();
        const packData = mod.default || mod;
        const parsed = LessonPackSchema.safeParse(packData);
        if (parsed.success) {
          if (parsed.data.status !== 'published') {
            return null;
          }
          try {
            await db.lesson_packs.put(parsed.data);
          } catch {
            // Non-blocking if IndexedDB is warming up or unavailable in runtime/SSR
          }
          return parsed.data;
        } else {
          console.error(`Validation error in lesson pack ${lessonId}:`, parsed.error);
          return null;
        }
      } catch (err) {
        console.error(`Failed to load pack for ${lessonId}:`, err);
        return null;
      }
    }

    return null;
  }

  static async saveLessonPack(pack: LessonPack): Promise<void> {
    const validated = LessonPackSchema.parse(pack);
    await db.lesson_packs.put(validated);
  }
}
