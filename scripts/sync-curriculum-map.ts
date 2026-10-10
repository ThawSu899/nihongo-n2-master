import * as fs from 'fs';
import * as path from 'path';
import { LessonPackSchema, CurriculumMapItemSchema, CurriculumMapItem } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

export function syncCurriculumMap(curriculumMapPath = './content/curriculum-map.json', packsDir = './content/packs'): {
  syncedCount: number;
  publishedCount: number;
  draftedCount: number;
  plannedCount: number;
  items: CurriculumMapItem[];
} {
  // Load existing map if present to preserve module categorizations
  let existingMap: any[] = [];
  if (fs.existsSync(curriculumMapPath)) {
    try {
      existingMap = JSON.parse(fs.readFileSync(curriculumMapPath, 'utf-8'));
    } catch {
      existingMap = [];
    }
  }
  const existingMapById = new Map<string, any>(existingMap.map((item) => [item.id, item]));

  const levels: Array<{ code: 'N5' | 'N4' | 'N3' | 'N2'; dir: string; count: number }> = [
    { code: 'N5', dir: 'n5', count: 30 },
    { code: 'N4', dir: 'n4', count: 36 },
    { code: 'N3', dir: 'n3', count: 48 },
    { code: 'N2', dir: 'n2', count: 60 },
  ];

  const updatedItems: CurriculumMapItem[] = [];
  let publishedCount = 0;
  let draftedCount = 0;
  let plannedCount = 0;

  for (const { code, dir, count } of levels) {
    for (let i = 1; i <= count; i++) {
      const numStr = i.toString().padStart(2, '0');
      const lessonId = `${dir}.l${numStr}`;
      const packFilePath = path.join(packsDir, dir, `${lessonId}.json`);

      const existingEntry = existingMapById.get(lessonId);
      const moduleName = existingEntry?.module || getDefaultModule(code, i);

      if (!fs.existsSync(packFilePath)) {
        // Pack does not exist yet: planned
        const plannedItem: CurriculumMapItem = {
          id: lessonId,
          level: code,
          module: moduleName,
          number: i,
          title: existingEntry?.title || `${code} Lesson ${i}`,
          grammarTopics: [],
          targetKanjiCount: 0,
          targetVocabCount: 0,
          status: 'planned',
          reviewStatus: 'ai-authored',
        };
        CurriculumMapItemSchema.parse(plannedItem);
        updatedItems.push(plannedItem);
        plannedCount++;
        continue;
      }

      // Pack exists: read and validate
      const rawContent = JSON.parse(fs.readFileSync(packFilePath, 'utf-8'));
      const zodParsed = LessonPackSchema.safeParse(rawContent);

      if (!zodParsed.success) {
        console.warn(`[Sync] Lesson ${lessonId} failed Zod validation; marking as drafted.`);
        const draftedItem: CurriculumMapItem = {
          id: lessonId,
          level: code,
          module: moduleName,
          number: i,
          title: rawContent.title || existingEntry?.title || `${code} Lesson ${i}`,
          grammarTopics: Array.isArray(rawContent.grammars)
            ? rawContent.grammars.map((g: any) => g.pattern || g.title || '')
            : [],
          targetKanjiCount: Array.isArray(rawContent.kanjis) ? rawContent.kanjis.length : 0,
          targetVocabCount: Array.isArray(rawContent.vocabularies) ? rawContent.vocabularies.length : 0,
          status: 'drafted',
          reviewStatus: 'ai-authored',
        };
        CurriculumMapItemSchema.parse(draftedItem);
        updatedItems.push(draftedItem);
        draftedCount++;
        continue;
      }

      const pack = zodParsed.data;

      // Lint check for blocking errors
      const lintResult = lintLessonPack(pack);
      if (lintResult.errors.length > 0) {
        console.warn(`[Sync] Lesson ${lessonId} has blocking linter errors; marking as drafted.`);
        const draftedItem: CurriculumMapItem = {
          id: lessonId,
          level: code,
          module: moduleName,
          number: i,
          title: pack.title,
          grammarTopics: pack.grammars.map((g) => g.pattern || (g as any).title || ''),
          targetKanjiCount: pack.kanjis.length,
          targetVocabCount: pack.vocabularies.length,
          status: 'drafted',
          reviewStatus: 'ai-authored',
        };
        CurriculumMapItemSchema.parse(draftedItem);
        updatedItems.push(draftedItem);
        draftedCount++;
        continue;
      }

      // Real pack state: verified schema & 0 blocking errors
      // A lesson is published only if pack.status is 'published'
      const status: 'published' | 'drafted' | 'reviewed' | 'planned' =
        pack.status === 'draft' ? 'drafted' : pack.status;
      if (status === 'published') {
        publishedCount++;
      } else if (status === 'drafted') {
        draftedCount++;
      } else {
        plannedCount++;
      }

      const item: CurriculumMapItem = {
        id: lessonId,
        level: code,
        module: moduleName,
        number: i,
        title: pack.title,
        grammarTopics: pack.grammars.map((g) => g.pattern || (g as any).title || ''),
        targetKanjiCount: pack.kanjis.length,
        targetVocabCount: pack.vocabularies.length,
        status: status,
        reviewStatus: 'ai-authored',
      };

      CurriculumMapItemSchema.parse(item);
      updatedItems.push(item);
    }
  }

  // Write synchronized map
  fs.writeFileSync(curriculumMapPath, JSON.stringify(updatedItems, null, 2) + '\n', 'utf-8');
  console.log(`[Sync] Successfully synchronized ${updatedItems.length} lessons to ${curriculumMapPath}.`);
  console.log(`[Sync] Published: ${publishedCount}, Drafted: ${draftedCount}, Planned: ${plannedCount}`);

  return {
    syncedCount: updatedItems.length,
    publishedCount,
    draftedCount,
    plannedCount,
    items: updatedItems,
  };
}

function getDefaultModule(level: 'N5' | 'N4' | 'N3' | 'N2', lessonNum: number): string {
  switch (level) {
    case 'N5':
      return lessonNum <= 10 ? 'N5 Foundation 1' : lessonNum <= 20 ? 'N5 Core Conjugations' : 'N5 Communication & Integration';
    case 'N4':
      return lessonNum <= 12 ? 'N4 Intermediate Grammar 1' : lessonNum <= 24 ? 'N4 Expressions & Relations' : 'N4 Complex Structures';
    case 'N3':
      return lessonNum <= 16 ? 'N3 Bridging Intermediate' : lessonNum <= 32 ? 'N3 Nuance & Natural Discourse' : 'N3 Formal & Expository';
    case 'N2':
      return lessonNum <= 20 ? 'N2 Advanced Grammar 1' : lessonNum <= 40 ? 'N2 Advanced Discourse' : 'N2 Mastery & Precision';
  }
}

// Run directly when executed
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCurriculumMap();
}
