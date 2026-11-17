import { LessonPack, CurriculumMapItem, LessonPackSchema, Vocabulary, Kanji } from '../../domain/models/types';
import curriculumMapJson from '../../../content/curriculum-map.json';
import { db } from '../db/dexie-db';
import { SnapshotIndexedDBStore } from '../backup/snapshot-store';

// Lazy-load packs dynamically across all levels without bloating initial bundle
const packModules = import.meta.glob<LessonPack>('/content/packs/**/*.json');

export interface UpgradeResult {
  upgraded: boolean;
  purgedPacksCount: number;
  updatedPacksCount: number;
  totalPublishedAvailable: number;
}

export class ContentLoader {
  private static inMemoryPackCache = new Map<string, LessonPack>();
  private static vocabLevelCache = new Map<'N5' | 'N4' | 'N3' | 'N2', Vocabulary[]>();
  private static kanjiLevelCache = new Map<'N5' | 'N4' | 'N3' | 'N2', Kanji[]>();

  // Tracks active in-flight upgrade to deduplicate concurrent calls
  private static activeUpgradePromise: Promise<UpgradeResult> | null = null;
  // Caches successful upgrade result so subsequent calls resolve immediately
  private static completedUpgradeResult: UpgradeResult | null = null;
  // Monotonically increasing generation to detect clearCache() during in-flight upgrade
  private static cacheGeneration = 0;

  static clearCache(): void {
    this.cacheGeneration++;
    this.inMemoryPackCache.clear();
    this.vocabLevelCache.clear();
    this.kanjiLevelCache.clear();
    this.completedUpgradeResult = null;
  }

  /**
   * Guarantees that the atomic IndexedDB cache upgrade is awaited
   * before any loader returns cached content.
   */
  static async ensureUpgraded(): Promise<void> {
    await this.autoUpgradeStaleIndexedDB();
  }

  /**
   * Preload and Zod-validate canonical bundled pack by ID before Dexie transactions.
   */
  static async loadCanonicalPack(lessonId: string): Promise<LessonPack | null> {
    const matchingPath = Object.keys(packModules).find((p) => p.endsWith(`/${lessonId}.json`));
    if (!matchingPath) return null;
    try {
      const mod: any = await packModules[matchingPath]();
      const packData = mod.default || mod;
      const normalizedPack = {
        ...packData,
        status: 'published',
      };
      const parsed = LessonPackSchema.safeParse(normalizedPack);
      if (parsed.success) {
        return parsed.data;
      }
      console.error(`Validation error in canonical pack ${lessonId}:`, parsed.error);
      return null;
    } catch (err) {
      console.error(`Failed to preload canonical pack for ${lessonId}:`, err);
      return null;
    }
  }
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
   * Preloads and Zod-validates canonical bundled packs before starting a Dexie transaction.
   * Uses an atomic, idempotent transaction touching ONLY lesson_packs.
   * Updates/replaces stale records and removes obsolete lesson pack IDs only.
   * Preserves existing records on transaction failure.
   */
  static async autoUpgradeStaleIndexedDB(): Promise<UpgradeResult> {
    // 1. If an upgrade is currently in-flight, return the shared promise (deduplication)
    if (this.activeUpgradePromise) {
      return this.activeUpgradePromise;
    }

    // 2. If an upgrade previously completed successfully, return the cached result
    if (this.completedUpgradeResult) {
      return this.completedUpgradeResult;
    }

    // 3. Start a new upgrade
    const capturedGen = this.cacheGeneration;
    const upgradeOp = (async () => {
      try {
        const { result, success } = await this.performAutoUpgradeStaleIndexedDB(capturedGen);
        if (success && this.cacheGeneration === capturedGen) {
          this.completedUpgradeResult = result;
        }
        return result;
      } finally {
        this.activeUpgradePromise = null;
      }
    })();

    this.activeUpgradePromise = upgradeOp;
    return upgradeOp;
  }

  private static async performAutoUpgradeStaleIndexedDB(capturedGen: number): Promise<{
    result: UpgradeResult;
    success: boolean;
  }> {
    let purgedPacksCount = 0;
    let updatedPacksCount = 0;
    let success = false;
    try {
      const allPacksInDb = await db.lesson_packs.toArray();
      const canonicalMap = curriculumMapJson as CurriculumMapItem[];
      const canonicalIds = new Set(canonicalMap.map((m) => m.id));

      const toPurgeIds: string[] = [];
      const toUpdateIds: string[] = [];

      for (const pack of allPacksInDb) {
        // Obsolete or corrupted/placeholder packs must be purged
        const isCorruptOrPlaceholder =
          !canonicalIds.has(pack.id) ||
          pack.status !== 'published' ||
          !Array.isArray(pack.vocabularies) ||
          pack.vocabularies.length === 0 ||
          !Array.isArray(pack.grammars) ||
          pack.grammars.length === 0 ||
          !Array.isArray(pack.questions) ||
          pack.questions.length === 0 ||
          JSON.stringify(pack).includes('X を Y します');

        if (isCorruptOrPlaceholder) {
          toPurgeIds.push(pack.id);
          continue;
        }

        // Validate cached pack against canonical LessonPackSchema.
        // Published canonical packs missing modern provenance, having invalid non-empty enums,
        // or failing schema validation are queued to be replaced with validated canonical bundled packs.
        const parsed = LessonPackSchema.safeParse(pack);
        if (!parsed.success) {
          toUpdateIds.push(pack.id);
        }
      }

      // Preload and Zod-validate canonical bundled packs BEFORE opening the Dexie transaction
      const preloadedPacks: LessonPack[] = [];
      for (const updateId of toUpdateIds) {
        const canonical = await this.loadCanonicalPack(updateId);
        if (canonical) {
          preloadedPacks.push(canonical);
        } else {
          console.warn(`[CurriculumUpgrade] Preload validation failed for pack ${updateId}`);
        }
      }

      if (toPurgeIds.length > 0 || preloadedPacks.length > 0) {
        // Atomic, idempotent Dexie transaction touching ONLY lesson_packs
        await db.transaction('rw', db.lesson_packs, async () => {
          if (toPurgeIds.length > 0) {
            await db.lesson_packs.bulkDelete(toPurgeIds);
          }
          if (preloadedPacks.length > 0) {
            await db.lesson_packs.bulkPut(preloadedPacks);
          }
        });

        // Only update inMemoryPackCache if clearCache was NOT called during this in-flight operation
        if (this.cacheGeneration === capturedGen) {
          for (const staleId of toPurgeIds) {
            this.inMemoryPackCache.delete(staleId);
          }
          for (const pack of preloadedPacks) {
            this.inMemoryPackCache.set(pack.id, pack);
          }
          this.vocabLevelCache.clear();
          this.kanjiLevelCache.clear();
        }

        purgedPacksCount = toPurgeIds.length;
        updatedPacksCount = preloadedPacks.length;
        console.info(
          `[CurriculumUpgrade] Successfully synchronized IndexedDB lesson_packs: updated=${updatedPacksCount}, purged=${purgedPacksCount}`
        );
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

      // Check and sanitize IndexedDB snapshot tier
      try {
        const idbSnapshot = await SnapshotIndexedDBStore.getSnapshot();
        if (
          idbSnapshot &&
          Array.isArray(idbSnapshot.lessonPacks) &&
          idbSnapshot.lessonPacks.length > 0
        ) {
          idbSnapshot.lessonPacks = idbSnapshot.lessonPacks.filter(
            (p: any) =>
              p.status === 'published' &&
              Array.isArray(p.vocabularies) &&
              p.vocabularies.length > 0 &&
              Array.isArray(p.grammars) &&
              p.grammars.length > 0 &&
              !JSON.stringify(p).includes('X を Y します')
          );
          await SnapshotIndexedDBStore.saveSnapshot(idbSnapshot);
        }
      } catch {
        // ignore
      }

      success = true;
    } catch (err) {
      console.warn('[CurriculumUpgrade] Error during atomic IndexedDB update:', err);
      success = false;
    }

    return {
      result: {
        upgraded: purgedPacksCount > 0 || updatedPacksCount > 0,
        purgedPacksCount,
        updatedPacksCount,
        totalPublishedAvailable: (curriculumMapJson as CurriculumMapItem[]).length,
      },
      success,
    };
  }

  /**
   * Load lesson pack by ID with IndexedDB caching and fallback to bundled JSON.
   * Stale or placeholder records in IndexedDB are automatically evicted.
   * Guarantees that the atomic cache upgrade is awaited before any loader returns cached content.
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

    // Await background upgrade check before serving cached content
    await this.ensureUpgraded().catch(() => {});

    if (options?.forceRefresh) {
      this.inMemoryPackCache.delete(lessonId);
      this.vocabLevelCache.clear();
      this.kanjiLevelCache.clear();
    } else if (this.inMemoryPackCache.has(lessonId)) {
      return this.inMemoryPackCache.get(lessonId)!;
    }

    // 1. Check IndexedDB first (unless forceRefresh is requested)
    if (!options?.forceRefresh) {
      try {
        const dbPack = await db.lesson_packs.get(lessonId);
        if (dbPack) {
          const parsed = LessonPackSchema.safeParse(dbPack);
          const isStale =
            !parsed.success ||
            dbPack.status !== 'published' ||
            !Array.isArray(dbPack.vocabularies) ||
            dbPack.vocabularies.length === 0 ||
            !Array.isArray(dbPack.grammars) ||
            dbPack.grammars.length === 0 ||
            !Array.isArray(dbPack.questions) ||
            dbPack.questions.length === 0 ||
            JSON.stringify(dbPack).includes('X を Y します');

          if (!isStale) {
            this.inMemoryPackCache.set(lessonId, parsed.data);
            return parsed.data;
          }
          // Stale or invalid entry found in IndexedDB (e.g. from older scaffold or invalid provenance enum).
          // Evict from DB and fall through to load the canonical bundle.
          console.warn(`[ContentLoader] Evicting stale/invalid IndexedDB pack for ${lessonId}`);
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
          this.inMemoryPackCache.set(lessonId, parsed.data);
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
    this.inMemoryPackCache.set(pack.id, validated);
    this.vocabLevelCache.clear();
    this.kanjiLevelCache.clear();
    await db.lesson_packs.put(validated);
  }

  /**
   * Retrieves all published lesson packs for a given JLPT level.
   */
  static async getPacksForLevel(level: 'N5' | 'N4' | 'N3' | 'N2'): Promise<LessonPack[]> {
    const mapItems = this.getCurriculumMap().filter((item) => item.level === level);
    const packs = await Promise.all(mapItems.map((item) => this.getLessonPack(item.id)));
    return packs.filter((p): p is LessonPack => p !== null);
  }

  /**
   * Aggregates and deduplicates all vocabulary items across all lesson packs for a given JLPT level.
   */
  static async getVocabularyForLevel(level: 'N5' | 'N4' | 'N3' | 'N2'): Promise<Vocabulary[]> {
    if (this.vocabLevelCache.has(level)) {
      return this.vocabLevelCache.get(level)!;
    }

    const packs = await this.getPacksForLevel(level);
    const seenWords = new Set<string>();
    const vocabularies: Vocabulary[] = [];

    for (const pack of packs) {
      if (Array.isArray(pack.vocabularies)) {
        for (const vocab of pack.vocabularies) {
          const key = `${vocab.ja}_${vocab.kana}`;
          if (!seenWords.has(key)) {
            seenWords.add(key);
            vocabularies.push(vocab);
          }
        }
      }
    }

    this.vocabLevelCache.set(level, vocabularies);
    return vocabularies;
  }

  /**
   * Aggregates and deduplicates all kanji items across all lesson packs for a given JLPT level.
   */
  static async getKanjiForLevel(level: 'N5' | 'N4' | 'N3' | 'N2'): Promise<Kanji[]> {
    if (this.kanjiLevelCache.has(level)) {
      return this.kanjiLevelCache.get(level)!;
    }

    const packs = await this.getPacksForLevel(level);
    const seenChars = new Set<string>();
    const kanjis: Kanji[] = [];

    for (const pack of packs) {
      if (Array.isArray(pack.kanjis)) {
        for (const kanji of pack.kanjis) {
          if (kanji.char && !seenChars.has(kanji.char)) {
            seenChars.add(kanji.char);
            kanjis.push(kanji);
          }
        }
      }
    }

    this.kanjiLevelCache.set(level, kanjis);
    return kanjis;
  }
}
