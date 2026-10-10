import { z } from 'zod';
import {
  LessonPack,
  LessonPackSchema,
  VocabularySchema,
  KanjiSchema,
  GrammarSchema,
  SentenceSchema,
  QuestionSchema,
  ReadingPassageSchema,
  ListeningDialogueSchema,
  Vocabulary,
  Kanji,
  Grammar,
  Sentence,
  Question,
  ReadingPassage,
  ListeningDialogue,
  Provenance,
} from '../../domain/models/types';
import { isZawgyi } from '../../domain/linter/content-linter';
import { db } from '../../data/db/dexie-db';

export interface StagingRowReport {
  tab: string;
  rowNumber: number;
  id?: string;
  status: 'valid' | 'quarantined' | 'warning';
  errors: string[];
  warnings: string[];
  raw: Record<string, string>;
}

export interface StagedModule {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  number: number;
  title: string;
  description: string;
}

export interface StagedLesson {
  id: string;
  module: string;
  number: number;
  title: string;
  description: string;
  status: 'planned' | 'drafted' | 'draft' | 'reviewed' | 'published';
}

export interface StagedTest {
  testId: string;
  lessonId: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  questionIds: string[];
}

export interface StagedAudio {
  fileId: string;
  lessonId: string;
  kind: 'file' | 'tts' | 'missing';
  lang: string;
  speaker?: string;
  url?: string;
  status: string;
}

export interface StagedPackData extends Partial<LessonPack> {
  modules?: StagedModule[];
  lessons?: StagedLesson[];
  tests?: StagedTest[];
  audio?: StagedAudio[];
}

export interface SheetsValidationReport {
  timestamp: string;
  spreadsheetId?: string;
  totalRows: number;
  validRows: number;
  quarantinedRows: number;
  warningsCount: number;
  rowReports: StagingRowReport[];
  diffSummary: {
    added: number;
    updated: number;
    unchanged: number;
  };
  canApply: boolean;
  packId?: string;
  schemaBlockers?: Record<string, string>;
  tabSummaries?: Record<string, { total: number; valid: number; quarantined: number; warnings: number }>;
}

export interface SpreadsheetTemplateTab {
  tabName: string;
  description: string;
  headers: string[];
  sampleRow: Record<string, string>;
}

/**
 * Normalizes text to Unicode NFC and checks for Zawgyi artifacts
 */
function normalizeAndCheckUnicode(
  text: string | undefined,
  fieldName: string,
  tab: string
): { normalized?: string; error?: string } {
  if (text === undefined || text === null) return {};
  const normalized = String(text).normalize('NFC').trim();
  if (isZawgyi(normalized)) {
    return {
      normalized,
      error: `Field '${fieldName}' on tab '${tab}' contains Zawgyi font encoding. Standard Myanmar Unicode is required.`,
    };
  }
  return { normalized };
}

/**
 * Parses pipe-delimited values (e.g. "one | two | three") into string array
 */
function parsePipeArray(val: string | undefined): string[] {
  if (!val) return [];
  return String(val)
    .split('|')
    .map((s) => s.trim().normalize('NFC'))
    .filter(Boolean);
}

/**
 * Safe JSON cell parser with quarantine reporting
 */
function parseJsonCell<T>(val: string | undefined, defaultValue: T, fieldName: string): { data: T; error?: string } {
  if (!val || !val.trim()) return { data: defaultValue };
  try {
    return { data: JSON.parse(val.trim()) };
  } catch (err: any) {
    return {
      data: defaultValue,
      error: `Malformed JSON in column '${fieldName}': ${err.message}`,
    };
  }
}

export class GoogleSheetsPipeline {
  /**
   * The 12 official tabs required by the curriculum specification
   */
  public static readonly OFFICIAL_TABS = [
    'Meta',
    'Modules',
    'Lessons',
    'Vocabulary',
    'Kanji',
    'Grammar',
    'Sentences',
    'Reading',
    'Listening',
    'Questions',
    'Tests',
    'Audio',
  ] as const;

  /**
   * Parses raw tabular spreadsheet rows into staged and validated records across all 12 tabs.
   * Quarantines invalid rows, checks referential integrity, detects duplicates, and generates diffs.
   */
  static parseAndStage(
    tabsData: Record<string, Array<Record<string, string>>>,
    existingPack?: LessonPack
  ): { stagedPack: StagedPackData; report: SheetsValidationReport } {
    const rowReports: StagingRowReport[] = [];
    let validCount = 0;
    let quarantinedCount = 0;
    let warningsCount = 0;

    const seenIdsByTab = new Map<string, Set<string>>();
    function checkDuplicateId(tab: string, id: string, rowNum: number, raw: Record<string, string>): boolean {
      if (!seenIdsByTab.has(tab)) seenIdsByTab.set(tab, new Set());
      const set = seenIdsByTab.get(tab)!;
      if (set.has(id)) {
        quarantinedCount += 1;
        rowReports.push({
          tab,
          rowNumber: rowNum,
          id,
          status: 'quarantined',
          errors: [`Duplicate ID '${id}' found on tab '${tab}'. IDs must be globally unique per tab.`],
          warnings: [],
          raw,
        });
        return false;
      }
      set.add(id);
      return true;
    }

    // Default provenance
    const nowIso = new Date().toISOString();
    function buildProvenance(row: Record<string, string>): Provenance {
      return {
        source: row['source'] || row['Source'] || 'Google Sheets Curriculum Sync',
        license: row['license'] || row['License'] || 'CC-BY-4.0',
        status: (['draft', 'reviewed', 'native_verified'].includes(row['status'] || row['Status'])
          ? (row['status'] || row['Status'])
          : 'reviewed') as any,
        updatedAt: row['updatedAt'] || row['UpdatedAt'] || nowIso,
        rev: Number(row['rev'] || row['Rev'] || 1),
      };
    }

    // 1. Parse Meta Tab
    const metaRows = tabsData['Meta'] || [];
    const metaRow = metaRows[0] || {};
    const packId = metaRow['id'] || metaRow['ID'] || existingPack?.id || 'n5.l01';
    const level = (metaRow['level'] || metaRow['Level'] || existingPack?.level || 'N5') as any;
    const moduleName = metaRow['module'] || metaRow['Module'] || existingPack?.module || 'Module 1';
    const number = Number(metaRow['number'] || metaRow['Number'] || existingPack?.number || 1);
    const title = metaRow['title'] || metaRow['Title'] || existingPack?.title || 'Imported Lesson';
    const description = metaRow['description'] || metaRow['Description'] || existingPack?.description || '';
    const status = (metaRow['status'] || metaRow['Status'] || existingPack?.status || 'draft') as any;

    const thresholdsParsed = parseJsonCell(
      metaRow['masteryThresholds'] || metaRow['MasteryThresholds'],
      existingPack?.masteryThresholds || {
        vocab: 0.9,
        kanji: 0.85,
        grammar: 0.85,
        reading: 0.8,
        listening: 0.8,
        overall: 0.85,
      },
      'masteryThresholds'
    );
    if (thresholdsParsed.error) {
      warningsCount++;
      rowReports.push({
        tab: 'Meta',
        rowNumber: 2,
        id: packId,
        status: 'warning',
        errors: [],
        warnings: [thresholdsParsed.error],
        raw: metaRow,
      });
    } else if (metaRows.length > 0) {
      validCount++;
      rowReports.push({
        tab: 'Meta',
        rowNumber: 2,
        id: packId,
        status: 'valid',
        errors: [],
        warnings: [],
        raw: metaRow,
      });
    }

    // 2. Parse Modules Tab
    const modulesRows = tabsData['Modules'] || tabsData['modules'] || [];
    const stagedModules: StagedModule[] = [];
    modulesRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Modules',
          rowNumber: rowNum,
          status: 'quarantined',
          errors: ['Missing required column: id'],
          warnings: [],
          raw: row,
        });
        return;
      }
      if (!checkDuplicateId('Modules', id, rowNum, row)) return;

      const levelVal = (row['level'] || row['Level'] || '').trim().toUpperCase();
      const numVal = Number(row['number'] || row['Number']);
      const titleVal = (row['title'] || row['Title'] || '').trim().normalize('NFC');
      const descVal = (row['description'] || row['Description'] || '').trim().normalize('NFC');

      const errors: string[] = [];
      if (!['N5', 'N4', 'N3', 'N2'].includes(levelVal)) {
        errors.push(`Invalid level '${levelVal}': must be N5, N4, N3, or N2.`);
      }
      if (!numVal || isNaN(numVal) || numVal < 1) {
        errors.push(`Invalid number '${row['number'] || row['Number']}': must be a positive integer.`);
      }
      if (!titleVal) {
        errors.push('Module title cannot be empty.');
      }

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Modules', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      stagedModules.push({
        id,
        level: levelVal as any,
        number: numVal,
        title: titleVal,
        description: descVal,
      });
      validCount++;
      rowReports.push({ tab: 'Modules', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
    });

    // 3. Parse Lessons Tab
    const lessonsRows = tabsData['Lessons'] || tabsData['lessons'] || [];
    const stagedLessons: StagedLesson[] = [];
    lessonsRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Lessons',
          rowNumber: rowNum,
          status: 'quarantined',
          errors: ['Missing required column: id'],
          warnings: [],
          raw: row,
        });
        return;
      }
      if (!checkDuplicateId('Lessons', id, rowNum, row)) return;

      const modVal = (row['module'] || row['Module'] || '').trim();
      const numVal = Number(row['number'] || row['Number']);
      const titleVal = (row['title'] || row['Title'] || '').trim().normalize('NFC');
      const descVal = (row['description'] || row['Description'] || '').trim().normalize('NFC');
      const statusVal = (row['status'] || row['Status'] || 'planned').trim().toLowerCase();

      const errors: string[] = [];
      if (!modVal) errors.push('Lesson module cannot be empty.');
      if (!numVal || isNaN(numVal) || numVal < 1) {
        errors.push(`Invalid number '${row['number'] || row['Number']}': must be a positive integer.`);
      }
      if (!titleVal) errors.push('Lesson title cannot be empty.');
      if (!['planned', 'drafted', 'draft', 'reviewed', 'published'].includes(statusVal)) {
        errors.push(`Invalid status '${statusVal}': must be planned, drafted, draft, reviewed, or published.`);
      }

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Lessons', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      stagedLessons.push({
        id,
        module: modVal,
        number: numVal,
        title: titleVal,
        description: descVal,
        status: statusVal as any,
      });
      validCount++;
      rowReports.push({ tab: 'Lessons', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
    });

    // 4. Parse Vocabulary Tab
    const vocabRows = tabsData['Vocabulary'] || [];
    const stagedVocab: Vocabulary[] = [];
    vocabRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Vocabulary',
          rowNumber: rowNum,
          status: 'quarantined',
          errors: ['Missing required column: id'],
          warnings: [],
          raw: row,
        });
        return;
      }
      if (!checkDuplicateId('Vocabulary', id, rowNum, row)) return;

      const jaCheck = normalizeAndCheckUnicode(row['ja'] || row['JA'] || '', 'ja', 'Vocabulary');
      const kanaCheck = normalizeAndCheckUnicode(row['kana'] || row['Kana'] || '', 'kana', 'Vocabulary');
      const myCheck = normalizeAndCheckUnicode(row['my'] || row['MY'], 'my', 'Vocabulary');

      const errors: string[] = [];
      if (jaCheck.error) errors.push(jaCheck.error);
      if (kanaCheck.error) errors.push(kanaCheck.error);
      if (myCheck.error) errors.push(myCheck.error);

      if (!jaCheck.normalized) errors.push('Japanese text (ja) cannot be empty.');
      if (!kanaCheck.normalized) errors.push('Kana reading (kana) cannot be empty.');

      const audioParsed = parseJsonCell(row['audio'] || row['Audio'], { kind: 'tts' as const, lang: 'ja-JP' as const }, 'audio');
      if (audioParsed.error) errors.push(audioParsed.error);

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Vocabulary', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      try {
        const item: Vocabulary = VocabularySchema.parse({
          id,
          lessonId: row['lessonId'] || packId,
          ja: jaCheck.normalized!,
          kana: kanaCheck.normalized!,
          en: (row['en'] || row['EN'] || '').trim().normalize('NFC'),
          my: myCheck.normalized,
          pos: (row['pos'] || row['POS'] || 'noun').trim().toLowerCase(),
          exampleSentenceId: row['exampleSentenceId'] || row['ExampleSentenceId'] || undefined,
          kanjiIds: parsePipeArray(row['kanjiIds'] || row['KanjiIds']),
          level,
          difficulty: Number(row['difficulty'] || row['Difficulty'] || 1),
          importance: Number(row['importance'] || row['Importance'] || 5),
          audio: audioParsed.data,
          prov: buildProvenance(row),
        });
        stagedVocab.push(item);
        validCount++;
        rowReports.push({ tab: 'Vocabulary', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Vocabulary',
          rowNumber: rowNum,
          id,
          status: 'quarantined',
          errors: [err.message || 'Validation error'],
          warnings: [],
          raw: row,
        });
      }
    });

    // 3. Parse Kanji Tab
    const kanjiRows = tabsData['Kanji'] || [];
    const stagedKanji: Kanji[] = [];
    kanjiRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({ tab: 'Kanji', rowNumber: rowNum, status: 'quarantined', errors: ['Missing required column: id'], warnings: [], raw: row });
        return;
      }
      if (!checkDuplicateId('Kanji', id, rowNum, row)) return;

      const exampleVocabParsed = parseJsonCell(row['exampleVocab'] || row['ExampleVocab'], [], 'exampleVocab');
      const errors: string[] = [];
      if (exampleVocabParsed.error) errors.push(exampleVocabParsed.error);

      const char = (row['char'] || row['Char'] || '').trim().normalize('NFC');
      if (!char) errors.push('Kanji character (char) cannot be empty.');

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Kanji', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      try {
        const item: Kanji = KanjiSchema.parse({
          id,
          lessonId: row['lessonId'] || packId,
          char,
          meaning: (row['meaning'] || row['Meaning'] || '').trim(),
          onyomi: parsePipeArray(row['onyomi'] || row['Onyomi']),
          kunyomi: parsePipeArray(row['kunyomi'] || row['Kunyomi']),
          exampleVocab: exampleVocabParsed.data,
          exampleSentenceIds: parsePipeArray(row['exampleSentenceIds'] || row['ExampleSentenceIds']),
          components: parsePipeArray(row['components'] || row['Components']),
          strokes: row['strokes'] ? Number(row['strokes']) : undefined,
          difficulty: Number(row['difficulty'] || row['Difficulty'] || 1),
          level,
          audio: { kind: 'tts', lang: 'ja-JP' },
          prov: buildProvenance(row),
        });
        stagedKanji.push(item);
        validCount++;
        rowReports.push({ tab: 'Kanji', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Kanji', rowNumber: rowNum, id, status: 'quarantined', errors: [err.message], warnings: [], raw: row });
      }
    });

    // 4. Parse Grammar Tab
    const grammarRows = tabsData['Grammar'] || [];
    const stagedGrammar: Grammar[] = [];
    grammarRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({ tab: 'Grammar', rowNumber: rowNum, status: 'quarantined', errors: ['Missing required column: id'], warnings: [], raw: row });
        return;
      }
      if (!checkDuplicateId('Grammar', id, rowNum, row)) return;

      const explParsed = parseJsonCell(
        row['explanation'] || row['Explanation'],
        { en: row['meaning'] || row['Meaning'] || '', my: undefined },
        'explanation'
      );
      const examplesParsed = parseJsonCell(row['examples'] || row['Examples'], [], 'examples');
      const errors: string[] = [];
      if (explParsed.error) errors.push(explParsed.error);
      if (examplesParsed.error) errors.push(examplesParsed.error);

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Grammar', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      try {
        const item: Grammar = GrammarSchema.parse({
          id,
          lessonId: row['lessonId'] || packId,
          pattern: (row['pattern'] || row['Pattern'] || '').trim().normalize('NFC'),
          meaning: (row['meaning'] || row['Meaning'] || '').trim().normalize('NFC'),
          formation: (row['formation'] || row['Formation'] || '').trim().normalize('NFC'),
          explanation: explParsed.data,
          examples: examplesParsed.data,
          similarGrammarIds: parsePipeArray(row['similarGrammarIds'] || row['SimilarGrammarIds']),
          commonMistakes: parsePipeArray(row['commonMistakes'] || row['CommonMistakes']),
          difficulty: Number(row['difficulty'] || row['Difficulty'] || 1),
          level,
          prov: buildProvenance(row),
        });
        stagedGrammar.push(item);
        validCount++;
        rowReports.push({ tab: 'Grammar', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Grammar', rowNumber: rowNum, id, status: 'quarantined', errors: [err.message], warnings: [], raw: row });
      }
    });

    // 5. Parse Sentences Tab
    const sentenceRows = tabsData['Sentences'] || [];
    const stagedSentences: Sentence[] = [];
    sentenceRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({ tab: 'Sentences', rowNumber: rowNum, status: 'quarantined', errors: ['Missing required column: id'], warnings: [], raw: row });
        return;
      }
      if (!checkDuplicateId('Sentences', id, rowNum, row)) return;

      const jaCheck = normalizeAndCheckUnicode(row['ja'] || row['JA'] || '', 'ja', 'Sentences');
      const kanaCheck = normalizeAndCheckUnicode(row['kana'] || row['Kana'] || '', 'kana', 'Sentences');
      const transParsed = parseJsonCell(
        row['translation'] || row['Translation'],
        { en: row['en'] || '', my: row['my'] || undefined },
        'translation'
      );

      const errors: string[] = [];
      if (jaCheck.error) errors.push(jaCheck.error);
      if (kanaCheck.error) errors.push(kanaCheck.error);
      if (transParsed.error) errors.push(transParsed.error);
      if (!jaCheck.normalized) errors.push('Sentence text (ja) cannot be empty.');

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Sentences', rowNumber: rowNum, id, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      try {
        const item: Sentence = SentenceSchema.parse({
          id,
          lessonId: row['lessonId'] || packId,
          ja: jaCheck.normalized!,
          kana: kanaCheck.normalized || jaCheck.normalized!,
          translation: transParsed.data,
          vocabIds: parsePipeArray(row['vocabIds'] || row['VocabIds']),
          grammarIds: parsePipeArray(row['grammarIds'] || row['GrammarIds']),
          audio: { kind: 'tts', lang: 'ja-JP' },
          prov: buildProvenance(row),
        });
        stagedSentences.push(item);
        validCount++;
        rowReports.push({ tab: 'Sentences', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Sentences', rowNumber: rowNum, id, status: 'quarantined', errors: [err.message], warnings: [], raw: row });
      }
    });

    // 6. Parse Reading Tab
    const readingRows = tabsData['Reading'] || [];
    let stagedReading: ReadingPassage = existingPack?.reading || {
      id: `${packId}.r01`,
      lessonId: packId,
      title: 'Reading Passage',
      level,
      text: '',
      kanaText: '',
      translation: '',
      questionIds: [],
      difficulty: 1,
      glossary: [],
      prov: { source: 'Default', license: 'CC-BY-4.0', status: 'reviewed', updatedAt: nowIso, rev: 1 },
    };
    if (readingRows.length > 0) {
      const r = readingRows[0];
      const glossaryParsed = parseJsonCell(r['glossary'] || r['Glossary'], [], 'glossary');
      try {
        stagedReading = ReadingPassageSchema.parse({
          id: r['id'] || `${packId}.r01`,
          lessonId: r['lessonId'] || packId,
          title: (r['title'] || r['Title'] || 'Reading Passage').trim().normalize('NFC'),
          level,
          text: (r['text'] || r['Text'] || '').trim().normalize('NFC'),
          kanaText: (r['kanaText'] || r['KanaText'] || '').trim().normalize('NFC'),
          translation: (r['translation'] || r['Translation'] || '').trim().normalize('NFC'),
          questionIds: parsePipeArray(r['questionIds'] || r['QuestionIds']),
          difficulty: Number(r['difficulty'] || 1),
          glossary: glossaryParsed.data,
          prov: buildProvenance(r),
        });
        validCount++;
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Reading', rowNumber: 2, id: stagedReading.id, status: 'quarantined', errors: [err.message], warnings: [], raw: r });
      }
    }

    // 7. Parse Listening Tab
    const listeningRows = tabsData['Listening'] || [];
    let stagedListening: ListeningDialogue = existingPack?.listening || {
      id: `${packId}.l01`,
      lessonId: packId,
      title: 'Listening Dialogue',
      level,
      audio: { kind: 'tts', lang: 'ja-JP' },
      speakers: ['Person A', 'Person B'],
      transcript: '',
      translation: '',
      turns: [],
      questionIds: [],
      difficulty: 1,
      prov: { source: 'Default', license: 'CC-BY-4.0', status: 'reviewed', updatedAt: nowIso, rev: 1 },
    };
    if (listeningRows.length > 0) {
      const l = listeningRows[0];
      const turnsParsed = parseJsonCell(l['turns'] || l['Turns'], [], 'turns');
      try {
        stagedListening = ListeningDialogueSchema.parse({
          id: l['id'] || `${packId}.l01`,
          lessonId: l['lessonId'] || packId,
          title: (l['title'] || l['Title'] || 'Listening Dialogue').trim().normalize('NFC'),
          level,
          audio: { kind: 'tts', lang: 'ja-JP' },
          speakers: parsePipeArray(l['speakers'] || l['Speakers']),
          transcript: (l['transcript'] || l['Transcript'] || '').trim().normalize('NFC'),
          translation: (l['translation'] || l['Translation'] || '').trim().normalize('NFC'),
          turns: turnsParsed.data,
          questionIds: parsePipeArray(l['questionIds'] || l['QuestionIds']),
          difficulty: Number(l['difficulty'] || 1),
          prov: buildProvenance(l),
        });
        validCount++;
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Listening', rowNumber: 2, id: stagedListening.id, status: 'quarantined', errors: [err.message], warnings: [], raw: l });
      }
    }

    // 8. Parse Questions Tab
    const questionRows = tabsData['Questions'] || [];
    const stagedQuestions: Question[] = [];
    questionRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const id = row['id'] || row['ID'];
      if (!id) {
        quarantinedCount++;
        rowReports.push({ tab: 'Questions', rowNumber: rowNum, status: 'quarantined', errors: ['Missing required column: id'], warnings: [], raw: row });
        return;
      }
      if (!checkDuplicateId('Questions', id, rowNum, row)) return;

      try {
        const item: Question = QuestionSchema.parse({
          id,
          lessonId: row['lessonId'] || packId,
          skill: (row['skill'] || row['Skill'] || 'vocab') as any,
          type: (row['type'] || row['Type'] || 'multiple_choice') as any,
          prompt: (row['prompt'] || row['Prompt'] || '').trim().normalize('NFC'),
          choices: row['choices'] ? parsePipeArray(row['choices'] || row['Choices']) : undefined,
          answer: (row['answer'] || row['Answer'] || '').trim().normalize('NFC'),
          acceptedAnswers: row['acceptedAnswers'] ? parsePipeArray(row['acceptedAnswers'] || row['AcceptedAnswers']) : undefined,
          explanation: (row['explanation'] || row['Explanation'] || '').trim().normalize('NFC'),
          difficulty: Number(row['difficulty'] || row['Difficulty'] || 1),
          linkedItemIds: parsePipeArray(row['linkedItemIds'] || row['LinkedItemIds']),
          generated: row['generated'] === 'true' || row['generated'] === '1',
          hint: row['hint'] || undefined,
        });
        stagedQuestions.push(item);
        validCount++;
        rowReports.push({ tab: 'Questions', rowNumber: rowNum, id, status: 'valid', errors: [], warnings: [], raw: row });
      } catch (err: any) {
        quarantinedCount++;
        rowReports.push({ tab: 'Questions', rowNumber: rowNum, id, status: 'quarantined', errors: [err.message], warnings: [], raw: row });
      }
    });

    // 11. Parse Tests Tab
    const testsRows = tabsData['Tests'] || tabsData['tests'] || [];
    const stagedTests: StagedTest[] = [];
    testsRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const testId = (row['testId'] || row['TestId'] || row['id'] || row['ID'] || '').trim();
      if (!testId) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Tests',
          rowNumber: rowNum,
          status: 'quarantined',
          errors: ['Missing required column: testId'],
          warnings: [],
          raw: row,
        });
        return;
      }
      if (!checkDuplicateId('Tests', testId, rowNum, row)) return;

      const lessonId = (row['lessonId'] || row['LessonId'] || packId).trim();
      const titleVal = (row['title'] || row['Title'] || '').trim().normalize('NFC');
      const durVal = Number(row['durationMinutes'] || row['DurationMinutes'] || 20);
      const scoreVal = Number(row['passingScore'] || row['PassingScore'] || 80);
      const qIds = parsePipeArray(row['questionIds'] || row['QuestionIds']);

      const errors: string[] = [];
      if (!titleVal) errors.push('Test title cannot be empty.');
      if (isNaN(durVal) || durVal <= 0) errors.push('durationMinutes must be a positive number.');
      if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) errors.push('passingScore must be between 0 and 100.');

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Tests', rowNumber: rowNum, id: testId, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      stagedTests.push({
        testId,
        lessonId,
        title: titleVal,
        durationMinutes: durVal,
        passingScore: scoreVal,
        questionIds: qIds,
      });
      validCount++;
      rowReports.push({ tab: 'Tests', rowNumber: rowNum, id: testId, status: 'valid', errors: [], warnings: [], raw: row });
    });

    // 12. Parse Audio Tab
    const audioRows = tabsData['Audio'] || tabsData['audio'] || [];
    const stagedAudio: StagedAudio[] = [];
    audioRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const fileId = (row['fileId'] || row['FileId'] || row['id'] || row['ID'] || '').trim();
      if (!fileId) {
        quarantinedCount++;
        rowReports.push({
          tab: 'Audio',
          rowNumber: rowNum,
          status: 'quarantined',
          errors: ['Missing required column: fileId'],
          warnings: [],
          raw: row,
        });
        return;
      }
      if (!checkDuplicateId('Audio', fileId, rowNum, row)) return;

      const lessonId = (row['lessonId'] || row['LessonId'] || packId).trim();
      const kindVal = (row['kind'] || row['Kind'] || 'tts').trim().toLowerCase();
      const langVal = (row['lang'] || row['Lang'] || 'ja-JP').trim();
      const speakerVal = (row['speaker'] || row['Speaker'] || '').trim() || undefined;
      const urlVal = (row['url'] || row['Url'] || '').trim() || undefined;
      const statusVal = (row['status'] || row['Status'] || 'ready').trim();

      const errors: string[] = [];
      if (!['file', 'tts', 'missing'].includes(kindVal)) {
        errors.push(`Invalid audio kind '${kindVal}': must be file, tts, or missing.`);
      }

      if (errors.length > 0) {
        quarantinedCount++;
        rowReports.push({ tab: 'Audio', rowNumber: rowNum, id: fileId, status: 'quarantined', errors, warnings: [], raw: row });
        return;
      }

      stagedAudio.push({
        fileId,
        lessonId,
        kind: kindVal as any,
        lang: langVal,
        speaker: speakerVal,
        url: urlVal,
        status: statusVal,
      });
      validCount++;
      rowReports.push({ tab: 'Audio', rowNumber: rowNum, id: fileId, status: 'valid', errors: [], warnings: [], raw: row });
    });

    // 13. Referential Integrity Validation
    const allSentenceIds = new Set([
      ...stagedSentences.map((s) => s.id),
      ...(existingPack?.sentences.map((s) => s.id) || []),
    ]);
    const allKanjiIds = new Set([
      ...stagedKanji.map((k) => k.id),
      ...(existingPack?.kanjis.map((k) => k.id) || []),
    ]);
    const allQuestionIds = new Set([
      ...stagedQuestions.map((q) => q.id),
      ...(existingPack?.questions.map((q) => q.id) || []),
    ]);
    const allModuleIds = new Set([
      ...stagedModules.map((m) => m.id),
      ...stagedModules.map((m) => m.title),
      existingPack?.module,
    ].filter(Boolean));

    // Check vocabulary references
    stagedVocab.forEach((v) => {
      if (v.exampleSentenceId && !allSentenceIds.has(v.exampleSentenceId)) {
        warningsCount++;
        rowReports.push({
          tab: 'Vocabulary',
          rowNumber: 0,
          id: v.id,
          status: 'warning',
          errors: [],
          warnings: [`Vocabulary '${v.id}' references exampleSentenceId '${v.exampleSentenceId}' which does not exist in sentences.`],
          raw: {},
        });
      }
      for (const kId of v.kanjiIds) {
        if (!allKanjiIds.has(kId)) {
          warningsCount++;
          rowReports.push({
            tab: 'Vocabulary',
            rowNumber: 0,
            id: v.id,
            status: 'warning',
            errors: [],
            warnings: [`Vocabulary '${v.id}' references kanjiId '${kId}' not found in lesson kanji pool.`],
            raw: {},
          });
        }
      }
    });

    // Check tests question references
    stagedTests.forEach((t) => {
      for (const qId of t.questionIds) {
        if (!allQuestionIds.has(qId)) {
          warningsCount++;
          rowReports.push({
            tab: 'Tests',
            rowNumber: 0,
            id: t.testId,
            status: 'warning',
            errors: [],
            warnings: [`Test '${t.testId}' references questionId '${qId}' which does not exist in questions.`],
            raw: {},
          });
        }
      }
    });

    // Check lessons module references
    if (stagedModules.length > 0) {
      stagedLessons.forEach((l) => {
        if (!allModuleIds.has(l.module)) {
          warningsCount++;
          rowReports.push({
            tab: 'Lessons',
            rowNumber: 0,
            id: l.id,
            status: 'warning',
            errors: [],
            warnings: [`Lesson '${l.id}' references module '${l.module}' not found in staged modules.`],
            raw: {},
          });
        }
      });
    }

    // 14. Compute Diff vs Existing Pack
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    if (existingPack) {
      const existingVocabMap = new Map(existingPack.vocabularies.map((v) => [v.id, v]));
      stagedVocab.forEach((v) => {
        const existing = existingVocabMap.get(v.id);
        if (!existing) {
          added++;
        } else if (JSON.stringify(v) !== JSON.stringify(existing)) {
          updated++;
        } else {
          unchanged++;
        }
      });
    } else {
      added = stagedVocab.length + stagedKanji.length + stagedGrammar.length + stagedModules.length + stagedLessons.length + stagedTests.length + stagedAudio.length;
    }

    // Total rows across all 12 tabs
    const totalRowsCount =
      metaRows.length +
      modulesRows.length +
      lessonsRows.length +
      vocabRows.length +
      kanjiRows.length +
      grammarRows.length +
      sentenceRows.length +
      readingRows.length +
      listeningRows.length +
      questionRows.length +
      testsRows.length +
      audioRows.length;

    // Build tab summaries
    const tabSummaries: Record<string, { total: number; valid: number; quarantined: number; warnings: number }> = {};
    for (const officialTab of GoogleSheetsPipeline.OFFICIAL_TABS) {
      const tabReports = rowReports.filter((r) => r.tab.toLowerCase() === officialTab.toLowerCase());
      tabSummaries[officialTab] = {
        total: (tabsData[officialTab] || []).length,
        valid: tabReports.filter((r) => r.status === 'valid').length,
        quarantined: tabReports.filter((r) => r.status === 'quarantined').length,
        warnings: tabReports.reduce((sum, r) => sum + r.warnings.length, 0),
      };
    }

    const schemaBlockers: Record<string, string> = {
      Tests:
        'Tests are staged and validated with referential question checks. The LessonPack domain schema scopes assessment items under pack.questions: Question[] rather than an independent tests collection.',
      Audio:
        'Audio assets are staged and validated with format/provenance checks. The LessonPack domain schema embeds audio references directly in Vocabulary, Sentence, and Listening items via AudioRef.',
      Modules:
        'Modules represent high-level multi-lesson syllabus stages staged for curriculum-map sync, outside single-lesson LessonPackSchema.',
      Lessons:
        'Lessons represent curriculum index entries staged for curriculum-map sync, outside single-lesson LessonPackSchema.',
    };

    const report: SheetsValidationReport = {
      timestamp: nowIso,
      packId,
      totalRows: totalRowsCount,
      validRows: validCount,
      quarantinedRows: quarantinedCount,
      warningsCount,
      rowReports,
      diffSummary: { added, updated, unchanged },
      canApply: quarantinedCount === 0 && validCount > 0,
      schemaBlockers,
      tabSummaries,
    };

    const stagedPack: Partial<LessonPack> & {
      modules?: StagedModule[];
      lessons?: StagedLesson[];
      tests?: StagedTest[];
      audio?: StagedAudio[];
    } = {
      id: packId,
      level,
      module: moduleName,
      number,
      title,
      description,
      status,
      masteryThresholds: thresholdsParsed.data,
      vocabularies: stagedVocab.length > 0 ? stagedVocab : existingPack?.vocabularies || [],
      kanjis: stagedKanji.length > 0 ? stagedKanji : existingPack?.kanjis || [],
      grammars: stagedGrammar.length > 0 ? stagedGrammar : existingPack?.grammars || [],
      sentences: stagedSentences.length > 0 ? stagedSentences : existingPack?.sentences || [],
      reading: stagedReading,
      listening: stagedListening,
      questions: stagedQuestions.length > 0 ? stagedQuestions : existingPack?.questions || [],
      modules: stagedModules,
      lessons: stagedLessons,
      tests: stagedTests,
      audio: stagedAudio,
      prov: buildProvenance(metaRow),
    };

    return { stagedPack, report };
  }

  /**
   * Applies the staged content pack atomically to IndexedDB after explicit user approval.
   * Preserves previous version for rollback in case of issues.
   */
  static async applyStagedPack(pack: LessonPack, backupExisting = true): Promise<{ success: boolean; message: string }> {
    try {
      const validated = LessonPackSchema.parse(pack);

      if (backupExisting) {
        const existing = await db.lesson_packs.get(pack.id);
        if (existing) {
          // Backup previous version to localStorage rollback slot
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(`rollback_pack_${pack.id}`, JSON.stringify(existing));
            }
          } catch (e) {
            console.warn('Could not save rollback snapshot:', e);
          }
        }
      }

      await db.lesson_packs.put(validated);
      return {
        success: true,
        message: `Successfully applied lesson pack ${pack.id} (${pack.title}) with ${pack.vocabularies.length} vocabulary, ${pack.kanjis.length} kanji, and ${pack.grammars.length} grammar items.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to apply staged pack: ${err.message}`,
      };
    }
  }

  /**
   * Rollback to the previous version of the lesson pack if available
   */
  static async rollbackPack(packId: string): Promise<{ success: boolean; message: string }> {
    if (typeof localStorage === 'undefined') {
      return { success: false, message: 'LocalStorage is not supported in this runtime environment.' };
    }
    const raw = localStorage.getItem(`rollback_pack_${packId}`);
    if (!raw) {
      return { success: false, message: `No rollback snapshot found for ${packId}.` };
    }
    try {
      const parsed = JSON.parse(raw);
      const validated = LessonPackSchema.parse(parsed);
      await db.lesson_packs.put(validated);
      localStorage.removeItem(`rollback_pack_${packId}`);
      return { success: true, message: `Successfully rolled back ${packId} to previous version.` };
    } catch (err: any) {
      return { success: false, message: `Rollback failed: ${err.message}` };
    }
  }

  /**
   * Generates a documented spreadsheet template specification for all 12 tabs
   */
  static generateTemplate(): SpreadsheetTemplateTab[] {
    return [
      {
        tabName: 'Meta',
        description: 'Lesson pack metadata, difficulty level, and module configuration',
        headers: ['id', 'level', 'module', 'number', 'title', 'description', 'status', 'masteryThresholds', 'source', 'license', 'updatedAt', 'rev'],
        sampleRow: {
          id: 'n5.l01',
          level: 'N5',
          module: 'Module 1',
          number: '1',
          title: 'Introductions and Greetings',
          description: 'Master basic self-introductions with X は Y です',
          status: 'reviewed',
          masteryThresholds: '{"vocab":0.90,"kanji":0.85,"grammar":0.85,"reading":0.80,"listening":0.80,"overall":0.85}',
          source: 'Editorial Team',
          license: 'CC-BY-4.0',
          updatedAt: '2026-10-01T00:00:00Z',
          rev: '1',
        },
      },
      {
        tabName: 'Modules',
        description: 'Curriculum module overview and stage metadata',
        headers: ['id', 'level', 'number', 'title', 'description'],
        sampleRow: {
          id: 'n5.m01',
          level: 'N5',
          number: '1',
          title: 'Foundations & Introductions',
          description: 'Basic pronouns, greetings, and daily identity statements',
        },
      },
      {
        tabName: 'Lessons',
        description: 'Lesson index and syllabus mapping',
        headers: ['id', 'module', 'number', 'title', 'description', 'status'],
        sampleRow: {
          id: 'n5.l01',
          module: 'n5.m01',
          number: '1',
          title: 'Introductions: X は Y です',
          description: 'Self-introductions and identity statements',
          status: 'published',
        },
      },
      {
        tabName: 'Vocabulary',
        description: 'Core vocabulary entries. Delimit multi-values with |',
        headers: ['id', 'lessonId', 'ja', 'kana', 'en', 'my', 'pos', 'exampleSentenceId', 'kanjiIds', 'level', 'difficulty', 'importance', 'source', 'license', 'status', 'updatedAt'],
        sampleRow: {
          id: 'n5.l01.v001',
          lessonId: 'n5.l01',
          ja: '私',
          kana: 'わたし',
          en: 'I / Me',
          my: 'ကျွန်တော် / ကျွန်မ',
          pos: 'pronoun',
          exampleSentenceId: 'n5.l01.s001',
          kanjiIds: 'n5.l01.k001',
          level: 'N5',
          difficulty: '1',
          importance: '5',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
          updatedAt: '2026-10-01T00:00:00Z',
        },
      },
      {
        tabName: 'Kanji',
        description: 'Kanji characters, stroke counts, on/kun readings, and example vocabulary',
        headers: ['id', 'lessonId', 'char', 'meaning', 'onyomi', 'kunyomi', 'exampleVocab', 'exampleSentenceIds', 'components', 'strokes', 'difficulty', 'level', 'source', 'license', 'status'],
        sampleRow: {
          id: 'n5.l01.k001',
          lessonId: 'n5.l01',
          char: '私',
          meaning: 'I / Private',
          onyomi: 'シ',
          kunyomi: 'わたし|わたくし',
          exampleVocab: '[{"word":"私","reading":"わたし","meaning":"I/me","preview":false},{"word":"私立","reading":"しりつ","meaning":"private","preview":true}]',
          exampleSentenceIds: 'n5.l01.s001',
          components: '禾|厶',
          strokes: '7',
          difficulty: '1',
          level: 'N5',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
        },
      },
      {
        tabName: 'Grammar',
        description: 'Grammar patterns, formations, structural explanations, and example linkages',
        headers: ['id', 'lessonId', 'pattern', 'meaning', 'formation', 'explanation', 'examples', 'similarGrammarIds', 'commonMistakes', 'difficulty', 'level', 'source', 'license', 'status'],
        sampleRow: {
          id: 'n5.l01.g001',
          lessonId: 'n5.l01',
          pattern: 'X は Y です',
          meaning: 'X is Y',
          formation: '[Noun X] は [Noun Y] です',
          explanation: '{"en":"The topic particle は marks X, and です states that it is Y.","my":"は သည် ခေါင်းစဉ်ကို ပြပြီး です က ဖြစ်ပါသည်ဟု ဆိုလိုသည်။"}',
          examples: '[{"sentenceId":"n5.l01.s001","note":"Basic self-introduction"}]',
          similarGrammarIds: '',
          commonMistakes: 'Confusing topic particle は with subject particle が',
          difficulty: '1',
          level: 'N5',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
        },
      },
      {
        tabName: 'Sentences',
        description: 'Authentic example sentences with translations and linked item references',
        headers: ['id', 'lessonId', 'ja', 'kana', 'translation', 'vocabIds', 'grammarIds', 'source', 'license', 'status'],
        sampleRow: {
          id: 'n5.l01.s001',
          lessonId: 'n5.l01',
          ja: '私は田中です。',
          kana: 'わたしはたなかです。',
          translation: '{"en":"I am Tanaka.","my":"ကျွန်တော် တာနာကာ ဖြစ်ပါတယ်။"}',
          vocabIds: 'n5.l01.v001',
          grammarIds: 'n5.l01.g001',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
        },
      },
      {
        tabName: 'Reading',
        description: 'Reading comprehension passages with furigana text and glossary',
        headers: ['id', 'lessonId', 'title', 'level', 'text', 'kanaText', 'translation', 'questionIds', 'difficulty', 'glossary', 'source', 'license', 'status'],
        sampleRow: {
          id: 'n5.l01.r01',
          lessonId: 'n5.l01',
          title: 'Self Introductions',
          level: 'N5',
          text: 'はじめまして。私はスミスです。アメリカから来ました。どうぞよろしくお願いします。',
          kanaText: 'はじめまして。わたしはすみすです。あめりかからきました。どうぞよろしくおねがいします。',
          translation: 'Nice to meet you. I am Smith. I came from America. Pleased to meet you.',
          questionIds: 'n5.l01.q021|n5.l01.q022',
          difficulty: '1',
          glossary: '[{"term":"はじめまして","reading":"はじめまして","meaning":"Nice to meet you"}]',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
        },
      },
      {
        tabName: 'Listening',
        description: 'Listening comprehension dialogues with speaker turns and transcripts',
        headers: ['id', 'lessonId', 'title', 'level', 'speakers', 'transcript', 'translation', 'turns', 'questionIds', 'difficulty', 'source', 'license', 'status'],
        sampleRow: {
          id: 'n5.l01.l01',
          lessonId: 'n5.l01',
          title: 'Meeting a Colleague',
          level: 'N5',
          speakers: '田中|スミス',
          transcript: '田中：こんにちは。スミス：こんにちは、田中さん。',
          translation: 'Tanaka: Hello. Smith: Hello, Tanaka-san.',
          turns: '[{"speaker":"田中","ja":"こんにちは。","kana":"こんにちは。","en":"Hello."},{"speaker":"スミス","ja":"こんにちは、田中さん。","kana":"こんにちは、たなかさん。","en":"Hello, Tanaka-san."}]',
          questionIds: 'n5.l01.q026|n5.l01.q027',
          difficulty: '1',
          source: 'Editorial Review',
          license: 'CC-BY-4.0',
          status: 'reviewed',
        },
      },
      {
        tabName: 'Questions',
        description: 'Assessment questions for vocab, kanji, grammar, reading, and listening',
        headers: ['id', 'lessonId', 'skill', 'type', 'prompt', 'choices', 'answer', 'acceptedAnswers', 'explanation', 'difficulty', 'linkedItemIds', 'generated', 'hint'],
        sampleRow: {
          id: 'n5.l01.q001',
          lessonId: 'n5.l01',
          skill: 'vocab',
          type: 'multiple_choice',
          prompt: '「私」の読み方はどれですか。',
          choices: 'わたし|あなた|かれ|かのじょ',
          answer: 'わたし',
          acceptedAnswers: 'わたし|私',
          explanation: '「私」は「わたし」と読みます。',
          difficulty: '1',
          linkedItemIds: 'n5.l01.v001',
          generated: 'false',
          hint: 'First person singular pronoun',
        },
      },
      {
        tabName: 'Tests',
        description: 'Lesson end-of-module tests and benchmark assessments',
        headers: ['testId', 'lessonId', 'title', 'durationMinutes', 'passingScore', 'questionIds'],
        sampleRow: {
          testId: 'n5.l01.t01',
          lessonId: 'n5.l01',
          title: 'Lesson 1 Mastery Assessment',
          durationMinutes: '20',
          passingScore: '85',
          questionIds: 'n5.l01.q001|n5.l01.q002|n5.l01.q003',
        },
      },
      {
        tabName: 'Audio',
        description: 'Audio recording registry and pronunciation assets',
        headers: ['fileId', 'lessonId', 'kind', 'lang', 'speaker', 'url', 'status'],
        sampleRow: {
          fileId: 'n5.l01.v001.audio',
          lessonId: 'n5.l01',
          kind: 'tts',
          lang: 'ja-JP',
          speaker: 'Kyoko',
          url: '',
          status: 'ready',
        },
      },
    ];
  }

  /**
   * Extracts clean spreadsheet ID from full Google Sheets URL or raw ID
   */
  static extractSpreadsheetId(urlOrId: string): string {
    const trimmed = (urlOrId || '').trim();
    if (!trimmed) return '';
    // Format: https://docs.google.com/spreadsheets/d/{id}/edit...
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Remove query params or trailing slashes if raw ID pasted with trailing chars
    return trimmed.split('/')[0].split('?')[0];
  }

  /**
   * Fetches raw 2D sheet rows from live Google Sheets REST API v4 across all matching official tabs
   */
  static async fetchSpreadsheetData(
    spreadsheetIdOrUrl: string,
    accessToken: string
  ): Promise<{ title: string; tabsData: Record<string, Array<Record<string, string>>> }> {
    const spreadsheetId = this.extractSpreadsheetId(spreadsheetIdOrUrl);
    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL or ID. Please provide a valid spreadsheet reference.');
    }
    if (!accessToken) {
      throw new Error('Google OAuth access token is missing. Please sign in with Google first.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('You appear to be offline. Fetching curriculum from Google Sheets requires an active internet connection.');
    }

    const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

    // 1. Fetch metadata to discover available tabs
    let metaRes: Response;
    try {
      metaRes = await fetch(
        `${API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
    } catch (err: any) {
      if (/failed to fetch|network|load failed/i.test(err?.message || '')) {
        throw new Error(`Failed to fetch from Google Sheets: ${err?.message || 'Network connection offline or unreachable'}`);
      }
      throw err;
    }

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      let message = `Failed to connect to Google Sheets (${metaRes.status}): ${metaRes.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          message = `Google Sheets error: ${errJson.error.message}`;
        }
      } catch {
        // use fallback message
      }
      if (metaRes.status === 403 || metaRes.status === 404) {
        message += ' Please verify that the spreadsheet exists and is shared with your signed-in Google account (or set to "Anyone with link can view").';
      }
      throw new Error(message);
    }

    const metaData = await metaRes.json();
    const spreadsheetTitle: string = metaData.properties?.title || 'Google Sheet Curriculum';
    const remoteSheets: string[] = (metaData.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean);

    if (remoteSheets.length === 0) {
      throw new Error(`The spreadsheet "${spreadsheetTitle}" contains no visible worksheets.`);
    }

    // 2. Identify which official tabs are present (case-insensitive match)
    const matchedSheets: Array<{ officialName: string; remoteName: string }> = [];
    for (const official of this.OFFICIAL_TABS) {
      const found = remoteSheets.find(
        (rs) => rs.trim().toLowerCase() === official.toLowerCase()
      );
      if (found) {
        matchedSheets.push({ officialName: official, remoteName: found });
      }
    }

    // If none of the official names match exactly, try fetching all remote sheets
    const sheetsToFetch = matchedSheets.length > 0
      ? matchedSheets
      : remoteSheets.map((rs) => ({ officialName: rs, remoteName: rs }));

    // 3. Batch get values for all matching worksheets in one single API roundtrip
    const rangesQuery = sheetsToFetch
      .map((s) => `ranges=${encodeURIComponent(s.remoteName)}`)
      .join('&');

    let batchRes: Response;
    try {
      batchRes = await fetch(
        `${API_BASE}/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=FORMATTED_VALUE`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
    } catch (err: any) {
      if (/failed to fetch|network|load failed/i.test(err?.message || '')) {
        throw new Error('Network connection error: Failed to retrieve cell ranges from Google Sheets. Please check your internet connection.');
      }
      throw err;
    }

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      throw new Error(`Failed to read tab values from Google Sheet (${batchRes.status}): ${errText}`);
    }

    const batchData = await batchRes.json();
    const valueRanges: Array<{ range: string; values?: string[][] }> = batchData.valueRanges || [];

    const tabsData: Record<string, Array<Record<string, string>>> = {};

    sheetsToFetch.forEach((item, idx) => {
      const vr = valueRanges[idx];
      const rawValues = vr?.values || [];
      if (rawValues.length < 2) {
        tabsData[item.officialName] = [];
        return;
      }

      // First row contains column headers
      const headers = rawValues[0].map((h) => String(h || '').trim());
      const dataRows = rawValues.slice(1).map((row) => {
        const rowObj: Record<string, string> = {};
        headers.forEach((header, colIdx) => {
          if (!header) return;
          rowObj[header] = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';
        });
        return rowObj;
      });

      tabsData[item.officialName] = dataRows;
    });

    return { title: spreadsheetTitle, tabsData };
  }

  /**
   * Fetches, validates, and stages curriculum content from live Google Sheets API
   */
  static async fetchAndStage(
    spreadsheetIdOrUrl: string,
    accessToken: string,
    existingPack?: LessonPack
  ): Promise<{ spreadsheetTitle: string; stagedPack: StagedPackData; report: SheetsValidationReport }> {
    const { title, tabsData } = await this.fetchSpreadsheetData(spreadsheetIdOrUrl, accessToken);
    const { stagedPack, report } = this.parseAndStage(tabsData, existingPack);
    report.spreadsheetId = this.extractSpreadsheetId(spreadsheetIdOrUrl);
    return { spreadsheetTitle: title, stagedPack, report };
  }

  /**
   * Generates CSV format text for any given lesson pack across the 12 tabs
   */
  static exportLessonPackCsv(pack: LessonPack): Record<string, string> {
    const csvFiles: Record<string, string> = {};

    function escapeCsvCell(cell: any): string {
      const str = cell === undefined || cell === null ? '' : String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    function toCsv(headers: string[], rows: Array<Record<string, any>>): string {
      const headerLine = headers.map(escapeCsvCell).join(',');
      const rowLines = rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(','));
      return [headerLine, ...rowLines].join('\r\n');
    }

    // 1. Meta
    csvFiles['Meta.csv'] = toCsv(
      ['id', 'level', 'module', 'number', 'title', 'description', 'status', 'masteryThresholds', 'source', 'license', 'updatedAt', 'rev'],
      [
        {
          id: pack.id,
          level: pack.level,
          module: pack.module,
          number: pack.number,
          title: pack.title,
          description: pack.description,
          status: pack.status,
          masteryThresholds: JSON.stringify(pack.masteryThresholds),
          source: pack.prov?.source || 'Nihongo N2 Master',
          license: pack.prov?.license || 'CC-BY-4.0',
          updatedAt: pack.prov?.updatedAt || new Date().toISOString(),
          rev: pack.prov?.rev || 1,
        },
      ]
    );

    // 2. Vocabulary
    csvFiles['Vocabulary.csv'] = toCsv(
      ['id', 'lessonId', 'ja', 'kana', 'en', 'my', 'pos', 'exampleSentenceId', 'kanjiIds', 'level', 'difficulty', 'importance', 'source', 'license', 'status', 'updatedAt'],
      pack.vocabularies.map((v) => ({
        id: v.id,
        lessonId: v.lessonId,
        ja: v.ja,
        kana: v.kana,
        en: v.en,
        my: v.my || '',
        pos: v.pos,
        exampleSentenceId: v.exampleSentenceId || '',
        kanjiIds: (v.kanjiIds || []).join('|'),
        level: v.level,
        difficulty: v.difficulty,
        importance: v.importance,
        source: v.prov?.source || 'Editorial Team',
        license: v.prov?.license || 'CC-BY-4.0',
        status: v.prov?.status || 'reviewed',
        updatedAt: v.prov?.updatedAt || new Date().toISOString(),
      }))
    );

    // 3. Kanji
    csvFiles['Kanji.csv'] = toCsv(
      ['id', 'lessonId', 'char', 'meaning', 'onyomi', 'kunyomi', 'exampleVocab', 'exampleSentenceIds', 'components', 'strokes', 'difficulty', 'level', 'source', 'license', 'status'],
      pack.kanjis.map((k) => ({
        id: k.id,
        lessonId: k.lessonId,
        char: k.char,
        meaning: k.meaning,
        onyomi: (k.onyomi || []).join('|'),
        kunyomi: (k.kunyomi || []).join('|'),
        exampleVocab: JSON.stringify(k.exampleVocab || []),
        exampleSentenceIds: (k.exampleSentenceIds || []).join('|'),
        components: (k.components || []).join('|'),
        strokes: k.strokes,
        difficulty: k.difficulty,
        level: k.level,
        source: k.prov?.source || 'Editorial Team',
        license: k.prov?.license || 'CC-BY-4.0',
        status: k.prov?.status || 'reviewed',
      }))
    );

    // 4. Grammar
    csvFiles['Grammar.csv'] = toCsv(
      ['id', 'lessonId', 'pattern', 'meaning', 'formation', 'explanation', 'examples', 'similarGrammarIds', 'commonMistakes', 'difficulty', 'level', 'source', 'license', 'status'],
      pack.grammars.map((g) => ({
        id: g.id,
        lessonId: g.lessonId,
        pattern: g.pattern,
        meaning: g.meaning,
        formation: g.formation,
        explanation: typeof g.explanation === 'string' ? g.explanation : JSON.stringify(g.explanation),
        examples: JSON.stringify(g.examples || []),
        similarGrammarIds: (g.similarGrammarIds || []).join('|'),
        commonMistakes: g.commonMistakes || '',
        difficulty: g.difficulty,
        level: g.level,
        source: g.prov?.source || 'Editorial Team',
        license: g.prov?.license || 'CC-BY-4.0',
        status: g.prov?.status || 'reviewed',
      }))
    );

    // 5. Sentences
    csvFiles['Sentences.csv'] = toCsv(
      ['id', 'lessonId', 'ja', 'kana', 'translation', 'vocabIds', 'grammarIds', 'source', 'license', 'status'],
      pack.sentences.map((s) => ({
        id: s.id,
        lessonId: s.lessonId,
        ja: s.ja,
        kana: s.kana,
        translation: typeof s.translation === 'string' ? s.translation : JSON.stringify(s.translation),
        vocabIds: (s.vocabIds || []).join('|'),
        grammarIds: (s.grammarIds || []).join('|'),
        source: s.prov?.source || 'Editorial Team',
        license: s.prov?.license || 'CC-BY-4.0',
        status: s.prov?.status || 'reviewed',
      }))
    );

    // 6. Reading
    csvFiles['Reading.csv'] = toCsv(
      ['id', 'lessonId', 'title', 'level', 'text', 'kanaText', 'translation', 'questionIds', 'difficulty', 'glossary', 'source', 'license', 'status'],
      pack.reading
        ? [
            {
              id: pack.reading.id,
              lessonId: pack.reading.lessonId,
              title: pack.reading.title,
              level: pack.reading.level,
              text: pack.reading.text,
              kanaText: pack.reading.kanaText,
              translation: pack.reading.translation,
              questionIds: (pack.reading.questionIds || []).join('|'),
              difficulty: pack.reading.difficulty,
              glossary: JSON.stringify(pack.reading.glossary || []),
              source: pack.reading.prov?.source || 'Editorial Team',
              license: pack.reading.prov?.license || 'CC-BY-4.0',
              status: pack.reading.prov?.status || 'reviewed',
            },
          ]
        : []
    );

    // 7. Listening
    csvFiles['Listening.csv'] = toCsv(
      ['id', 'lessonId', 'title', 'level', 'speakers', 'transcript', 'translation', 'turns', 'questionIds', 'difficulty', 'source', 'license', 'status'],
      pack.listening
        ? [
            {
              id: pack.listening.id,
              lessonId: pack.listening.lessonId,
              title: pack.listening.title,
              level: pack.listening.level,
              speakers: (pack.listening.speakers || []).join('|'),
              transcript: pack.listening.transcript,
              translation: pack.listening.translation,
              turns: JSON.stringify(pack.listening.turns || []),
              questionIds: (pack.listening.questionIds || []).join('|'),
              difficulty: pack.listening.difficulty,
              source: pack.listening.prov?.source || 'Editorial Team',
              license: pack.listening.prov?.license || 'CC-BY-4.0',
              status: pack.listening.prov?.status || 'reviewed',
            },
          ]
        : []
    );

    // 8. Questions
    csvFiles['Questions.csv'] = toCsv(
      ['id', 'lessonId', 'skill', 'type', 'prompt', 'choices', 'answer', 'acceptedAnswers', 'explanation', 'difficulty', 'linkedItemIds', 'generated', 'hint'],
      pack.questions.map((q) => ({
        id: q.id,
        lessonId: q.lessonId,
        skill: q.skill,
        type: q.type,
        prompt: q.prompt,
        choices: (q.choices || []).join('|'),
        answer: q.answer,
        acceptedAnswers: (q.acceptedAnswers || []).join('|'),
        explanation: q.explanation || '',
        difficulty: q.difficulty,
        linkedItemIds: (q.linkedItemIds || []).join('|'),
        generated: q.generated ? 'true' : 'false',
        hint: q.hint || '',
      }))
    );

    // 9. Modules
    csvFiles['Modules.csv'] = toCsv(
      ['id', 'level', 'number', 'title', 'description'],
      [
        {
          id: `${pack.level.toLowerCase()}.m01`,
          level: pack.level,
          number: 1,
          title: pack.module,
          description: `${pack.level} Curriculum Module: ${pack.module}`,
        },
      ]
    );

    // 10. Lessons
    csvFiles['Lessons.csv'] = toCsv(
      ['id', 'module', 'number', 'title', 'description', 'status'],
      [
        {
          id: pack.id,
          module: pack.module,
          number: pack.number,
          title: pack.title,
          description: pack.description,
          status: pack.status,
        },
      ]
    );

    // 11. Tests
    csvFiles['Tests.csv'] = toCsv(
      ['testId', 'lessonId', 'title', 'durationMinutes', 'passingScore', 'questionIds'],
      [
        {
          testId: `${pack.id}.t01`,
          lessonId: pack.id,
          title: `${pack.title} Comprehensive Mastery Test`,
          durationMinutes: 20,
          passingScore: 85,
          questionIds: pack.questions.map((q) => q.id).join('|'),
        },
      ]
    );

    // 12. Audio
    const audioRows: Array<Record<string, any>> = [];
    pack.vocabularies.forEach((v) => {
      audioRows.push({
        fileId: v.audio?.fileId || `${v.id}.audio`,
        lessonId: pack.id,
        kind: v.audio?.kind || 'tts',
        lang: v.audio?.lang || 'ja-JP',
        speaker: v.audio?.speaker || 'Kyoko',
        url: '',
        status: 'ready',
      });
    });
    pack.sentences.forEach((s) => {
      audioRows.push({
        fileId: s.audio?.fileId || `${s.id}.audio`,
        lessonId: pack.id,
        kind: s.audio?.kind || 'tts',
        lang: s.audio?.lang || 'ja-JP',
        speaker: s.audio?.speaker || 'Kenji',
        url: '',
        status: 'ready',
      });
    });
    csvFiles['Audio.csv'] = toCsv(
      ['fileId', 'lessonId', 'kind', 'lang', 'speaker', 'url', 'status'],
      audioRows
    );

    return csvFiles;
  }
}
