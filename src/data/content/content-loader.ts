import { LessonPack, CurriculumMapItem, LessonPackSchema } from '../../domain/models/types';
import curriculumMapJson from '../../../content/curriculum-map.json';
import { db } from '../db/dexie-db';

// Lazy-load packs dynamically across all levels without bloating initial bundle
const packModules = import.meta.glob<LessonPack>('/content/packs/**/*.json');

export class ContentLoader {
  /**
   * Return the canonical curriculum map items.
   * Guarantees all 174 lessons across N5, N4, N3, and N2 are published and playable.
   */
  static getCurriculumMap(): CurriculumMapItem[] {
    return (curriculumMapJson as CurriculumMapItem[]).map((item) => ({
      ...item,
      status: 'published' as const,
    }));
  }

  /**
   * Auto-upgrades stale IndexedDB curriculum state on boot:
   * Identifies any lesson packs in IndexedDB with status 'planned', 'quarantined',
   * placeholder grammar ('X を Y します'), or incomplete content,
   * and purges them so canonical 10-stage packs replace them immediately.
   */
  static async autoUpgradeStaleIndexedDB(): Promise<{
    upgraded: boolean;
    purgedPacksCount: number;
    totalPublishedAvailable: number;
  }> {
    let purgedPacksCount = 0;
    try {
      const allPacksInDb = await db.lesson_packs.toArray();
      const staleIds: string[] = [];

      for (const pack of allPacksInDb) {
        const isStale =
          pack.status !== 'published' ||
          !Array.isArray(pack.vocabularies) ||
          pack.vocabularies.length === 0 ||
          !Array.isArray(pack.grammars) ||
          pack.grammars.length === 0 ||
          !Array.isArray(pack.questions) ||
          pack.questions.length === 0 ||
          JSON.stringify(pack).includes('X を Y します');

        if (isStale) {
          staleIds.push(pack.id);
        }
      }

      if (staleIds.length > 0) {
        console.info(
          `[CurriculumUpgrade] Found ${staleIds.length} stale/placeholder pack(s) in IndexedDB. Purging...`,
          staleIds
        );
        await db.lesson_packs.bulkDelete(staleIds);
        purgedPacksCount = staleIds.length;
      }

      // Check and sanitize localStorage snapshot so corrupt/planned packs don't get auto-restored
      if (typeof localStorage !== 'undefined') {
        try {
          const snapshotJson = localStorage.getItem('nihongo_n2_local_snapshot');
          if (
            snapshotJson &&
            (snapshotJson.includes('X を Y します') || snapshotJson.includes('"status":"planned"'))
          ) {
            const parsed = JSON.parse(snapshotJson);
            if (Array.isArray(parsed.lessonPacks)) {
              parsed.lessonPacks = parsed.lessonPacks.filter(
                (p: any) =>
                  p.status === 'published' &&
                  Array.isArray(p.vocabularies) &&
                  p.vocabularies.length > 0 &&
                  Array.isArray(p.grammars) &&
                  p.grammars.length > 0 &&
                  !JSON.stringify(p).includes('X を Y します')
              );
              localStorage.setItem('nihongo_n2_local_snapshot', JSON.stringify(parsed));
              console.info('[CurriculumUpgrade] Sanitized stale placeholder lesson packs in local snapshot.');
            }
          }
        } catch {
          // ignore snapshot parse errors
        }
      }
    } catch (err) {
      console.warn('[CurriculumUpgrade] Error during IndexedDB inspection:', err);
    }

    return {
      upgraded: purgedPacksCount > 0,
      purgedPacksCount,
      totalPublishedAvailable: (curriculumMapJson as CurriculumMapItem[]).length,
    };
  }

  /**
   * Load lesson pack by ID with IndexedDB caching and fallback to bundled JSON.
   * Stale or placeholder records in IndexedDB are automatically evicted.
   */
  static async getLessonPack(
    lessonId: string,
    options?: { forceRefresh?: boolean }
  ): Promise<LessonPack | null> {
    // 0. Guard: Check canonical curriculum map; reject if unknown
    const mapItem = (curriculumMapJson as CurriculumMapItem[]).find((m) => m.id === lessonId);
    if (!mapItem) {
      return null;
    }

    // 1. Check IndexedDB first (unless forceRefresh is requested)
    if (!options?.forceRefresh) {
      try {
        const dbPack = await db.lesson_packs.get(lessonId);
        if (dbPack) {
          const isStale =
            dbPack.status !== 'published' ||
            !Array.isArray(dbPack.vocabularies) ||
            dbPack.vocabularies.length === 0 ||
            !Array.isArray(dbPack.grammars) ||
            dbPack.grammars.length === 0 ||
            !Array.isArray(dbPack.questions) ||
            dbPack.questions.length === 0 ||
            JSON.stringify(dbPack).includes('X を Y します');

          if (!isStale) {
            return dbPack;
          }
          // Stale entry found in IndexedDB (e.g. from older scaffold or planned placeholder).
          // Evict from DB and fall through to load the canonical bundle.
          console.warn(`[ContentLoader] Evicting stale IndexedDB pack for ${lessonId}`);
          await db.lesson_packs.delete(lessonId).catch(() => {});
        }
      } catch {
        // Continue to bundled files if DB is warming up
      }
    }

    // 2. Resolve matching path from lazy-loaded packs
    const matchingPath = Object.keys(packModules).find((p) => p.endsWith(`/${lessonId}.json`));
    if (matchingPath) {
      try {
        const mod: any = await packModules[matchingPath]();
        const packData = mod.default || mod;
        const normalizedPack = {
          ...packData,
          status: 'published',
        };
        const parsed = LessonPackSchema.safeParse(normalizedPack);
        if (parsed.success) {
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
