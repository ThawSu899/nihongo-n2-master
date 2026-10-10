import * as fs from 'fs';
import * as path from 'path';
import { LessonPackSchema } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';

const levels = ['n5', 'n4', 'n3', 'n2'];
const stats = {
  totalFiles: 0,
  validZodPacks: 0,
  invalidZodPacks: 0,
  publishedCount: 0,
  draftedCount: 0,
  plannedCount: 0,
  byLevel: {
    N5: { total: 0, published: 0, totalVocab: 0, totalKanji: 0, totalGrammar: 0, totalSentences: 0, totalQuestions: 0 },
    N4: { total: 0, published: 0, totalVocab: 0, totalKanji: 0, totalGrammar: 0, totalSentences: 0, totalQuestions: 0 },
    N3: { total: 0, published: 0, totalVocab: 0, totalKanji: 0, totalGrammar: 0, totalSentences: 0, totalQuestions: 0 },
    N2: { total: 0, published: 0, totalVocab: 0, totalKanji: 0, totalGrammar: 0, totalSentences: 0, totalQuestions: 0 },
  },
  brokenReferences: 0,
  duplicateIds: 0,
  missingRequiredFields: 0,
  linterErrors: 0,
  linterWarnings: 0,
  curriculumMapMismatches: 0,
  handAuthoredVerticalSlice: [] as string[],
  nativeReviewedPacks: [] as string[],
  programmaticPacks: [] as string[],
  fullyStructuredPacks: [] as string[],
};

const allSeenGlobalIds = new Set<string>();

// Load curriculum-map.json to ensure the audit and UI share the same source of truth
const curriculumMapPath = path.resolve('./content/curriculum-map.json');
const rawCurriculumMap: any[] = fs.existsSync(curriculumMapPath)
  ? JSON.parse(fs.readFileSync(curriculumMapPath, 'utf-8'))
  : [];
const curriculumMapById = new Map<string, any>(rawCurriculumMap.map((item) => [item.id, item]));

for (const lvl of levels) {
  const dirPath = path.resolve(`./content/packs/${lvl}`);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    stats.totalFiles++;
    const fullPath = path.join(dirPath, file);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const levelKey = content.level as 'N5' | 'N4' | 'N3' | 'N2';

    // 1. Check Zod validation
    const parsed = LessonPackSchema.safeParse(content);
    if (!parsed.success) {
      stats.invalidZodPacks++;
      console.error(`Zod validation failed for ${file}:`, parsed.error.issues);
      continue;
    }
    stats.validZodPacks++;

    const pack = parsed.data;
    if (pack.status === 'published') {
      stats.publishedCount++;
      stats.byLevel[levelKey].published++;
    } else if (pack.status === 'draft') {
      stats.draftedCount++;
    } else {
      stats.plannedCount++;
    }

    stats.byLevel[levelKey].total++;
    stats.byLevel[levelKey].totalVocab += pack.vocabularies.length;
    stats.byLevel[levelKey].totalKanji += pack.kanjis.length;
    stats.byLevel[levelKey].totalGrammar += pack.grammars.length;
    stats.byLevel[levelKey].totalSentences += pack.sentences.length;
    stats.byLevel[levelKey].totalQuestions += pack.questions.length;

    // Check duplicate global IDs
    if (allSeenGlobalIds.has(pack.id)) {
      stats.duplicateIds++;
    } else {
      allSeenGlobalIds.add(pack.id);
    }

    // Check item level uniqueness
    const localIds = new Set<string>();
    for (const v of pack.vocabularies) {
      if (localIds.has(v.id)) stats.duplicateIds++;
      localIds.add(v.id);
    }
    for (const k of pack.kanjis) {
      if (localIds.has(k.id)) stats.duplicateIds++;
      localIds.add(k.id);
    }
    for (const g of pack.grammars) {
      if (localIds.has(g.id)) stats.duplicateIds++;
      localIds.add(g.id);
    }
    for (const s of pack.sentences) {
      if (localIds.has(s.id)) stats.duplicateIds++;
      localIds.add(s.id);
    }
    for (const q of pack.questions) {
      if (localIds.has(q.id)) stats.duplicateIds++;
      localIds.add(q.id);
    }

    // 2. Check internal referential integrity
    const sentenceIdSet = new Set(pack.sentences.map((s) => s.id));
    const kanjiIdSet = new Set(pack.kanjis.map((k) => k.id));
    const vocabIdSet = new Set(pack.vocabularies.map((v) => v.id));

    for (const v of pack.vocabularies) {
      if (v.exampleSentenceId && !sentenceIdSet.has(v.exampleSentenceId)) {
        stats.brokenReferences++;
      }
      for (const kid of v.kanjiIds) {
        if (!kanjiIdSet.has(kid)) {
          stats.brokenReferences++;
        }
      }
    }

    for (const s of pack.sentences) {
      for (const vid of s.vocabIds) {
        if (!vocabIdSet.has(vid)) {
          stats.brokenReferences++;
        }
      }
    }

    // 3. Run content linter
    const lintResult = lintLessonPack(pack);
    stats.linterErrors += lintResult.errors.length;
    stats.linterWarnings += lintResult.warnings.length;

    // 4. Check Curriculum Map parity (Single Source of Truth verification)
    const mapEntry = curriculumMapById.get(pack.id);
    if (!mapEntry) {
      stats.curriculumMapMismatches++;
      console.error(`[Curriculum Map Mismatch] Pack ${pack.id} missing from curriculum-map.json!`);
    } else {
      if (mapEntry.status !== pack.status) {
        stats.curriculumMapMismatches++;
        console.error(`[Curriculum Map Mismatch] ${pack.id} status mismatch: map=${mapEntry.status}, pack=${pack.status}`);
      }
      if (mapEntry.targetVocabCount !== pack.vocabularies.length) {
        stats.curriculumMapMismatches++;
        console.error(`[Curriculum Map Mismatch] ${pack.id} vocab count mismatch: map=${mapEntry.targetVocabCount}, pack=${pack.vocabularies.length}`);
      }
      if (mapEntry.targetKanjiCount !== pack.kanjis.length) {
        stats.curriculumMapMismatches++;
        console.error(`[Curriculum Map Mismatch] ${pack.id} kanji count mismatch: map=${mapEntry.targetKanjiCount}, pack=${pack.kanjis.length}`);
      }
      if (mapEntry.title !== pack.title) {
        stats.curriculumMapMismatches++;
        console.error(`[Curriculum Map Mismatch] ${pack.id} title mismatch: map="${mapEntry.title}", pack="${pack.title}"`);
      }
      if (Array.isArray(mapEntry.grammarTopics)) {
        for (const topic of mapEntry.grammarTopics) {
          if (/Grammar Point \d/i.test(topic)) {
            stats.curriculumMapMismatches++;
            console.error(`[Curriculum Map Mismatch] ${pack.id} contains placeholder grammar: "${topic}"`);
          }
        }
      }
      if (mapEntry.status === 'published') {
        const entryStr = JSON.stringify(mapEntry);
        if (/Outline only/i.test(entryStr)) {
          stats.curriculumMapMismatches++;
          console.error(`[Curriculum Map Mismatch] Published lesson ${pack.id} has "Outline only" text`);
        }
      }
    }

    if (pack.id === 'n5.l01' || (pack.prov?.source && (pack.prov.source.includes('Native Review') || pack.prov.source.includes('AI-Assisted Editorial')))) {
      if (pack.id === 'n5.l01') stats.handAuthoredVerticalSlice.push(pack.id);
      stats.nativeReviewedPacks.push(pack.id);
    } else {
      stats.programmaticPacks.push(pack.id);
    }
    stats.fullyStructuredPacks.push(pack.id);
  }
}

console.log('=== AUDIT RESULTS ===');
console.log(JSON.stringify(stats, null, 2));
