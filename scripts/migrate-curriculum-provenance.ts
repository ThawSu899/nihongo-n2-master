import * as fs from 'fs';
import * as path from 'path';
import {
  AuthoringOrigin,
  VerificationStatus,
  CurriculumMapItemSchema,
  LessonPackSchema,
  LessonPack,
} from '../src/domain/models/types';

export const EXPECTED_LESSON_RANGES = {
  n5: { min: 1, max: 30, count: 30 },
  n4: { min: 1, max: 36, count: 36 },
  n3: { min: 1, max: 48, count: 48 },
  n2: { min: 1, max: 60, count: 60 },
} as const;

export function normalizeLineEndingsForComparison(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function getAllExpectedLessonIds(): Set<string> {
  const ids = new Set<string>();
  for (let i = 1; i <= 30; i++) ids.add(`n5.l${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 36; i++) ids.add(`n4.l${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 48; i++) ids.add(`n3.l${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 60; i++) ids.add(`n2.l${String(i).padStart(2, '0')}`);
  return ids;
}

export function getApprovedProvenance(lessonId: string): {
  authoringOrigin: AuthoringOrigin;
  verificationStatus: VerificationStatus;
} {
  if (typeof lessonId !== 'string' || !lessonId.trim()) {
    throw new Error(`Invalid lesson ID: "${lessonId}". Lesson ID cannot be empty.`);
  }

  const match = lessonId.match(/^n([2-5])\.l(\d{2})$/);
  if (!match) {
    throw new Error(
      `Invalid lesson ID format: "${lessonId}". Expected exact format: n[2-5].l[0-9]{2} (e.g. n5.l01, n2.l60)`
    );
  }

  const levelNum = match[1];
  const num = parseInt(match[2], 10);

  if (levelNum === '5') {
    if (num < 1 || num > 30) {
      throw new Error(`Rejected lesson ID "${lessonId}": N5 range is strictly L01-L30.`);
    }
    return {
      authoringOrigin: 'unknown',
      verificationStatus: 'automated-structure-checked',
    };
  }

  if (levelNum === '4') {
    if (num < 1 || num > 36) {
      throw new Error(`Rejected lesson ID "${lessonId}": N4 range is strictly L01-L36.`);
    }
    return {
      authoringOrigin: 'unknown',
      verificationStatus: 'automated-structure-checked',
    };
  }

  if (levelNum === '3') {
    if (num < 1 || num > 48) {
      throw new Error(`Rejected lesson ID "${lessonId}": N3 range is strictly L01-L48.`);
    }
    if (num >= 1 && num <= 30) {
      return {
        authoringOrigin: 'ai-assisted',
        verificationStatus: 'editorial-reviewed',
      };
    } else {
      return {
        authoringOrigin: 'unknown',
        verificationStatus: 'automated-structure-checked',
      };
    }
  }

  if (levelNum === '2') {
    if (num < 1 || num > 60) {
      throw new Error(`Rejected lesson ID "${lessonId}": N2 range is strictly L01-L60.`);
    }
    return {
      authoringOrigin: 'unknown',
      verificationStatus: 'automated-structure-checked',
    };
  }

  throw new Error(`Rejected unexpected lesson level for ID: "${lessonId}".`);
}

export function verifyLearningContentDeepEquality(
  rawPack: any,
  updatedPack: any,
  lessonId: string
): void {
  // 1. Arrays: vocabularies, kanjis, grammars, sentences, questions
  const arrayFields = ['vocabularies', 'kanjis', 'grammars', 'sentences', 'questions'] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(rawPack[field]) || !Array.isArray(updatedPack[field])) {
      throw new Error(`Content integrity failure in ${lessonId}: ${field} must be an array.`);
    }
    if (JSON.stringify(rawPack[field]) !== JSON.stringify(updatedPack[field])) {
      throw new Error(`Content integrity failure in ${lessonId}: ${field} content was altered.`);
    }
  }

  // 2. Objects: reading, listening
  if (JSON.stringify(rawPack.reading) !== JSON.stringify(updatedPack.reading)) {
    throw new Error(`Content integrity failure in ${lessonId}: reading content was altered.`);
  }
  if (JSON.stringify(rawPack.listening) !== JSON.stringify(updatedPack.listening)) {
    throw new Error(`Content integrity failure in ${lessonId}: listening content was altered.`);
  }

  // 3. Provenance historical fields
  if (rawPack.prov?.source !== updatedPack.prov?.source) {
    throw new Error(
      `Historical provenance source corrupted in ${lessonId}. Expected: "${rawPack.prov?.source}", Got: "${updatedPack.prov?.source}"`
    );
  }
  if (rawPack.prov?.status !== updatedPack.prov?.status) {
    throw new Error(
      `Historical provenance status corrupted in ${lessonId}. Expected: "${rawPack.prov?.status}", Got: "${updatedPack.prov?.status}"`
    );
  }
  if (rawPack.prov?.license !== updatedPack.prov?.license) {
    throw new Error(`Historical provenance license corrupted in ${lessonId}.`);
  }
  if (rawPack.prov?.rev !== updatedPack.prov?.rev) {
    throw new Error(`Historical provenance rev corrupted in ${lessonId}.`);
  }

  // 4. Core lesson metadata
  const metaFields = [
    'id',
    'title',
    'level',
    'module',
    'number',
    'description',
    'status',
    'masteryThresholds',
  ] as const;
  for (const field of metaFields) {
    if (rawPack[field] !== undefined && JSON.stringify(rawPack[field]) !== JSON.stringify(updatedPack[field])) {
      throw new Error(`Lesson metadata field "${field}" corrupted in ${lessonId}.`);
    }
  }
}

export interface MigrationFileSystem {
  existsSync(p: string): boolean;
  readFileSync(p: string, encoding: 'utf-8'): string;
  writeFileSync(p: string, content: string, encoding: 'utf-8'): void;
  copyFileSync(src: string, dest: string): void;
  mkdirSync(p: string, options?: { recursive?: boolean }): void;
  rmSync(p: string, options?: { recursive?: boolean; force?: boolean }): void;
}

export const defaultFileSystem: MigrationFileSystem = {
  existsSync: (p) => fs.existsSync(p),
  readFileSync: (p, enc) => fs.readFileSync(p, enc),
  writeFileSync: (p, c, enc) => fs.writeFileSync(p, c, enc),
  copyFileSync: (src, dest) => fs.copyFileSync(src, dest),
  mkdirSync: (p, opt) => fs.mkdirSync(p, opt),
  rmSync: (p, opt) => fs.rmSync(p, opt),
};

export type TransactionState =
  | 'initialized'
  | 'staged'
  | 'backing_up'
  | 'backed_up'
  | 'applying'
  | 'verifying'
  | 'committed'
  | 'rolling_back'
  | 'rolled_back'
  | 'failed';

export interface TransactionEntry {
  id: string;
  targetPath: string;
  stagedPath: string;
  backupPath: string;
  applied: boolean;
  attempted?: boolean;
}

export interface TransactionManifest {
  transactionId: string;
  timestamp: string;
  state: TransactionState;
  rootDir: string;
  txDir: string;
  entries: TransactionEntry[];
  error?: string;
  recoveryReportPath?: string;
}

export class MigrationTransactionError extends Error {
  public manifest?: TransactionManifest;
  public recoveryReport?: any;
  constructor(
    message: string,
    options?: { cause?: unknown; manifest?: TransactionManifest; recoveryReport?: any }
  ) {
    super(message);
    this.name = 'MigrationTransactionError';
    if (options?.cause) (this as any).cause = options.cause;
    this.manifest = options?.manifest;
    this.recoveryReport = options?.recoveryReport;
  }
}

export interface MigrationOptions {
  dryRun?: boolean;
  rootDir?: string;
  fs?: MigrationFileSystem;
  faultInjection?: {
    failDuringStagedWriteAt?: number;
    failDuringBackupAt?: number;
    failDuringReplacementAt?: number;
    failDuringVerification?: boolean;
    failDuringRollback?: boolean;
  };
}

export interface MigrationResult {
  updatedMapCount: number;
  updatedPacksCount: number;
  changedMapCount: number;
  changedPacksCount: number;
  changedFilesCount: number;
  counts: {
    authoring: Record<AuthoringOrigin, number>;
    verification: Record<VerificationStatus, number>;
  };
  dryRun: boolean;
  transactionId?: string;
  verifiedCommitted?: boolean;
}

export function runCurriculumProvenanceMigration(options?: MigrationOptions): MigrationResult {
  const dryRun = options?.dryRun ?? process.argv.includes('--dry-run');
  const rootDir = options?.rootDir ? path.resolve(options.rootDir) : path.resolve('.');
  const io = options?.fs || defaultFileSystem;
  const fault = options?.faultInjection;

  const txDir = path.join(rootDir, '.migration-transaction');

  // Safety Gate: Never silently delete or overwrite existing transaction artifacts.
  // They may contain vital backups and recovery reports from a previous failed run.
  if (io.existsSync(txDir)) {
    let existingManifest: TransactionManifest | undefined;
    let existingReport: any = undefined;
    const manifestPath = path.join(txDir, 'manifest.json');
    const reportPath = path.join(txDir, 'recovery-report.json');
    try {
      if (io.existsSync(manifestPath)) {
        existingManifest = JSON.parse(io.readFileSync(manifestPath, 'utf-8'));
      }
      if (io.existsSync(reportPath)) {
        existingReport = JSON.parse(io.readFileSync(reportPath, 'utf-8'));
      }
    } catch {
      // ignore parse errors
    }

    throw new MigrationTransactionError(
      `Unresolved migration transaction directory detected at ${txDir}. ` +
        `Existing transaction artifacts may contain vital original backups or recovery reports from an earlier run. ` +
        `Migration stopped safely to prevent unrecoverable data loss. ` +
        `Please manually inspect, restore, or archive/remove ${txDir} before proceeding.`,
      {
        manifest: existingManifest,
        recoveryReport: existingReport,
      }
    );
  }

  const mapPath = path.join(rootDir, 'content', 'curriculum-map.json');
  if (!io.existsSync(mapPath)) {
    throw new Error(`Curriculum map file not found at: ${mapPath}`);
  }

  const rawMapText = io.readFileSync(mapPath, 'utf-8');
  const rawMap = JSON.parse(rawMapText);
  if (!Array.isArray(rawMap)) {
    throw new Error('Curriculum map must be an array');
  }

  // Preflight 1: Exact Lesson ID Set Validation
  const expectedIds = getAllExpectedLessonIds();
  const seenMapIds = new Set<string>();

  for (const item of rawMap) {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Curriculum map item missing or invalid id property: ${JSON.stringify(item)}`);
    }
    if (seenMapIds.has(item.id)) {
      throw new Error(`Duplicate lesson ID detected in curriculum map: ${item.id}`);
    }
    seenMapIds.add(item.id);
  }

  if (rawMap.length !== 174 || seenMapIds.size !== 174) {
    throw new Error(`Expected exactly 174 curriculum items, found ${rawMap.length}`);
  }

  // Validate complete expected ID set
  for (const actId of seenMapIds) {
    if (!expectedIds.has(actId)) {
      throw new Error(`Curriculum map contains unexpected lesson ID: "${actId}"`);
    }
  }
  for (const expId of expectedIds) {
    if (!seenMapIds.has(expId)) {
      throw new Error(`Curriculum map is missing expected lesson ID: "${expId}"`);
    }
  }

  const counts = {
    authoring: {
      'human-authored': 0,
      'ai-assisted': 0,
      'ai-authored': 0,
      'unknown': 0,
    } as Record<AuthoringOrigin, number>,
    verification: {
      'native-speaker-verified': 0,
      'editorial-reviewed': 0,
      'automated-structure-checked': 0,
      'unverified': 0,
    } as Record<VerificationStatus, number>,
  };

  // Preflight 2: Build and validate updated curriculum map in memory
  const updatedMap = rawMap.map((item: any) => {
    const approved = getApprovedProvenance(item.id);
    counts.authoring[approved.authoringOrigin]++;
    counts.verification[approved.verificationStatus]++;

    const updated = {
      ...item,
      authoringOrigin: approved.authoringOrigin,
      verificationStatus: approved.verificationStatus,
    };

    // Validate with CurriculumMapItemSchema
    CurriculumMapItemSchema.parse(updated);
    return updated;
  });

  const updatedMapText = JSON.stringify(updatedMap, null, 2) + '\n';
  const mapNeedsUpdate =
    normalizeLineEndingsForComparison(rawMapText) !== normalizeLineEndingsForComparison(updatedMapText);
  const changedMapCount = mapNeedsUpdate ? 1 : 0;

  // Preflight 3: Stage and deep-validate all 174 lesson packs in memory
  const stagedPacks: Array<{
    lessonId: string;
    packPath: string;
    rawPack: any;
    updatedPack: LessonPack;
    updatedPackText: string;
    needsUpdate: boolean;
  }> = [];

  let changedPacksCount = 0;

  for (const item of updatedMap) {
    const levelDir = item.level.toLowerCase();
    const packPath = path.join(rootDir, 'content', 'packs', levelDir, `${item.id}.json`);
    if (!io.existsSync(packPath)) {
      throw new Error(`Preflight check failed: Missing pack file at ${packPath}`);
    }

    const rawPackText = io.readFileSync(packPath, 'utf-8');
    const rawPack = JSON.parse(rawPackText);
    const approved = getApprovedProvenance(rawPack.id);

    // Byte-for-byte source preservation check
    const originalSource = rawPack.prov?.source;
    if (!originalSource) {
      throw new Error(`Preflight check failed: Missing prov.source in ${item.id}`);
    }

    // Strip duplicate root-level authoringOrigin and verificationStatus
    const {
      authoringOrigin: _rootAuthoring,
      verificationStatus: _rootVerification,
      ...cleanedRawPack
    } = rawPack;

    // Update pack provenance strictly inside pack.prov
    const updatedPack: LessonPack = {
      ...cleanedRawPack,
      prov: {
        ...rawPack.prov,
        source: originalSource, // strictly preserved byte-for-byte
        authoringOrigin: approved.authoringOrigin,
        verificationStatus: approved.verificationStatus,
      },
    };

    // Deep equality verification for all learning content
    verifyLearningContentDeepEquality(rawPack, updatedPack, item.id);

    // Ensure root duplicates are not present
    if (
      (updatedPack as any).authoringOrigin !== undefined ||
      (updatedPack as any).verificationStatus !== undefined
    ) {
      throw new Error(
        `Preflight check failed: Root-level provenance fields still present in ${item.id}`
      );
    }

    // Validate against canonical LessonPackSchema
    LessonPackSchema.parse(updatedPack);

    const updatedPackText = JSON.stringify(updatedPack, null, 2) + '\n';
    const packNeedsUpdate =
      normalizeLineEndingsForComparison(rawPackText) !== normalizeLineEndingsForComparison(updatedPackText);
    if (packNeedsUpdate) {
      changedPacksCount++;
    }

    stagedPacks.push({
      lessonId: item.id,
      packPath,
      rawPack,
      updatedPack,
      updatedPackText,
      needsUpdate: packNeedsUpdate,
    });
  }

  const changedFilesCount = changedMapCount + changedPacksCount;

  // Preflight passed! If dry-run, exit without writing any files
  if (dryRun) {
    return {
      updatedMapCount: updatedMap.length,
      updatedPacksCount: stagedPacks.length,
      changedMapCount,
      changedPacksCount,
      changedFilesCount,
      counts,
      dryRun: true,
    };
  }

  // Idempotency fast path: if all files already match target provenance, perform zero filesystem writes
  if (changedFilesCount === 0) {
    return {
      updatedMapCount: updatedMap.length,
      updatedPacksCount: stagedPacks.length,
      changedMapCount: 0,
      changedPacksCount: 0,
      changedFilesCount: 0,
      counts,
      dryRun: false,
      transactionId: undefined,
      verifiedCommitted: true,
    };
  }

  // =========================================================================
  // TRANSACTION PHASE: Multi-File Staged Migration with Rollback Protection
  // =========================================================================
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const transactionId = `tx_${Date.now()}`;
  const stagedDir = path.join(txDir, 'staged');
  const backupsDir = path.join(txDir, 'backups');

  io.mkdirSync(txDir, { recursive: true });
  io.mkdirSync(stagedDir, { recursive: true });
  io.mkdirSync(backupsDir, { recursive: true });

  const manifest: TransactionManifest = {
    transactionId,
    timestamp,
    state: 'initialized',
    rootDir,
    txDir,
    entries: [],
  };

  // Build entry list: only files that actually need modification
  if (mapNeedsUpdate) {
    manifest.entries.push({
      id: 'curriculum-map',
      targetPath: mapPath,
      stagedPath: path.join(stagedDir, 'curriculum-map.json'),
      backupPath: path.join(backupsDir, 'curriculum-map.json.bak'),
      applied: false,
      attempted: false,
    });
  }

  for (const pack of stagedPacks) {
    if (pack.needsUpdate) {
      manifest.entries.push({
        id: pack.lessonId,
        targetPath: pack.packPath,
        stagedPath: path.join(stagedDir, `${pack.lessonId}.json`),
        backupPath: path.join(backupsDir, `${pack.lessonId}.json.bak`),
        applied: false,
        attempted: false,
      });
    }
  }

  const manifestPath = path.join(txDir, 'manifest.json');
  const saveManifest = () => {
    io.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  };
  saveManifest();

  // 1. Write Staged Files
  try {
    for (let i = 0; i < manifest.entries.length; i++) {
      if (fault?.failDuringStagedWriteAt === i) {
        throw new Error(`Fault injected: Staged write failure at index ${i} (${manifest.entries[i].id})`);
      }
      const entry = manifest.entries[i];
      if (entry.id === 'curriculum-map') {
        io.writeFileSync(entry.stagedPath, updatedMapText, 'utf-8');
      } else {
        const pack = stagedPacks.find((p) => p.lessonId === entry.id)!;
        io.writeFileSync(entry.stagedPath, pack.updatedPackText, 'utf-8');
      }
    }
    manifest.state = 'staged';
    saveManifest();
  } catch (err: any) {
    manifest.state = 'failed';
    manifest.error = `Staged write phase failed: ${err.message || String(err)}`;
    saveManifest();
    throw new MigrationTransactionError(manifest.error, { cause: err, manifest });
  }

  // 2. Preserve Backups of Every Original File
  manifest.state = 'backing_up';
  saveManifest();
  try {
    for (let i = 0; i < manifest.entries.length; i++) {
      if (fault?.failDuringBackupAt === i) {
        throw new Error(`Fault injected: Backup creation failure at entry index ${i}`);
      }
      const entry = manifest.entries[i];
      io.copyFileSync(entry.targetPath, entry.backupPath);
      if (!io.existsSync(entry.backupPath)) {
        throw new Error(`Failed to create backup for ${entry.targetPath}`);
      }
    }
    manifest.state = 'backed_up';
    saveManifest();
  } catch (err: any) {
    manifest.state = 'failed';
    manifest.error = `Backup preservation phase failed: ${err.message || String(err)}`;
    saveManifest();
    throw new MigrationTransactionError(manifest.error, { cause: err, manifest });
  }

  // 3. Apply Replacements with Rollback Protection
  manifest.state = 'applying';
  saveManifest();

  const rollback = (triggerError: any, failedEntry?: TransactionEntry | null) => {
    manifest.state = 'rolling_back';
    manifest.error = `Trigger error: ${triggerError.message || String(triggerError)}`;
    try {
      saveManifest();
    } catch {
      // Non-fatal if manifest write fails while entering rollback; restoration of target files must proceed
    }

    let rollbackFailure: any = null;
    const restoredCount = { success: 0, failed: 0 };

    try {
      if (fault?.failDuringRollback) {
        throw new Error('Fault injected: Rollback failure simulated');
      }

      // Restore every entry that was successfully applied OR was attempted/partially written when failure occurred
      for (const entry of manifest.entries) {
        const needsRestoration =
          entry.applied ||
          entry.attempted ||
          (failedEntry && entry.id === failedEntry.id);

        if (needsRestoration) {
          try {
            io.copyFileSync(entry.backupPath, entry.targetPath);
            entry.applied = false;
            entry.attempted = false;
            restoredCount.success++;
          } catch (rErr) {
            restoredCount.failed++;
            throw rErr;
          }
        }
      }
    } catch (rbErr: any) {
      rollbackFailure = rbErr;
    }

    const recoveryReport = {
      transactionId,
      timestamp: new Date().toISOString(),
      triggerError: String(triggerError),
      rollbackSuccessful: !rollbackFailure && restoredCount.failed === 0,
      rollbackFailure: rollbackFailure ? String(rollbackFailure) : null,
      restoredCount,
      backupsDirectory: backupsDir,
      stagedDirectory: stagedDir,
      instructions: rollbackFailure
        ? 'CRITICAL: Rollback failed. Original files must be manually restored from backupsDirectory.'
        : 'All changes were successfully rolled back to original pre-migration state.',
    };

    const recoveryReportPath = path.join(txDir, 'recovery-report.json');
    manifest.recoveryReportPath = recoveryReportPath;
    manifest.state = rollbackFailure ? 'failed' : 'rolled_back';
    try {
      io.writeFileSync(recoveryReportPath, JSON.stringify(recoveryReport, null, 2) + '\n', 'utf-8');
      saveManifest();
    } catch {
      // ignore
    }

    const finalMessage = rollbackFailure
      ? `CRITICAL MIGRATION FAILURE: Migration failed during replacement and rollback also failed. Recovery artifacts preserved in ${txDir}. Cause: ${rollbackFailure.message}`
      : `Migration failed during replacement/verification. All ${restoredCount.success} applied files were safely rolled back from backups. Cause: ${triggerError.message}`;

    throw new MigrationTransactionError(finalMessage, {
      cause: rollbackFailure || triggerError,
      manifest,
      recoveryReport,
    });
  };

  let activeReplacingEntry: TransactionEntry | null = null;
  try {
    for (let i = 0; i < manifest.entries.length; i++) {
      const entry = manifest.entries[i];
      activeReplacingEntry = entry;
      entry.attempted = true;
      // Persist attempted-state to disk BEFORE calling copyFileSync
      saveManifest();

      if (fault?.failDuringReplacementAt === i) {
        throw new Error(`Fault injected: File replacement failure at entry index ${i} (${manifest.entries[i].id})`);
      }
      io.copyFileSync(entry.stagedPath, entry.targetPath);
      entry.applied = true;
      saveManifest();
      activeReplacingEntry = null;
    }
  } catch (replaceErr: any) {
    rollback(replaceErr, activeReplacingEntry);
  }

  // 4. Post-Replacement Verification
  manifest.state = 'verifying';
  saveManifest();

  try {
    if (fault?.failDuringVerification) {
      throw new Error('Fault injected: Post-replacement verification failed');
    }

    // Read and verify updated map on disk
    const committedMap = JSON.parse(io.readFileSync(mapPath, 'utf-8'));
    if (!Array.isArray(committedMap) || committedMap.length !== 174) {
      throw new Error('Post-replacement verification failed: committed map count mismatch');
    }
    for (const item of committedMap) {
      CurriculumMapItemSchema.parse(item);
      const expected = getApprovedProvenance(item.id);
      if (item.authoringOrigin !== expected.authoringOrigin) {
        throw new Error(
          `Post-replacement verification failed: authoringOrigin mismatch for curriculum map item ${item.id}. Expected: ${expected.authoringOrigin}, Found: ${item.authoringOrigin}`
        );
      }
      if (item.verificationStatus !== expected.verificationStatus) {
        throw new Error(
          `Post-replacement verification failed: verificationStatus mismatch for curriculum map item ${item.id}. Expected: ${expected.verificationStatus}, Found: ${item.verificationStatus}`
        );
      }
    }

    // Read and verify all 174 packs on disk
    for (const pack of stagedPacks) {
      const committedPack = JSON.parse(io.readFileSync(pack.packPath, 'utf-8'));
      LessonPackSchema.parse(committedPack);
      // Ensure deep equality against original learning content
      verifyLearningContentDeepEquality(pack.rawPack, committedPack, pack.lessonId);
      if (committedPack.prov.authoringOrigin !== pack.updatedPack.prov.authoringOrigin) {
        throw new Error(
          `Post-replacement verification failed: authoringOrigin mismatch on committed pack ${pack.lessonId}. Expected: ${pack.updatedPack.prov.authoringOrigin}, Found: ${committedPack.prov.authoringOrigin}`
        );
      }
      if (committedPack.prov.verificationStatus !== pack.updatedPack.prov.verificationStatus) {
        throw new Error(
          `Post-replacement verification failed: verificationStatus mismatch on committed pack ${pack.lessonId}. Expected: ${pack.updatedPack.prov.verificationStatus}, Found: ${committedPack.prov.verificationStatus}`
        );
      }
      if (
        (committedPack as any).authoringOrigin !== undefined ||
        (committedPack as any).verificationStatus !== undefined
      ) {
        throw new Error(
          `Post-replacement verification failed: Root-level duplicate provenance fields still present on committed pack ${pack.lessonId}`
        );
      }
    }
  } catch (verifyErr: any) {
    rollback(verifyErr);
  }

  // 5. Commit & Clean Up
  manifest.state = 'committed';
  saveManifest();

  // Remove temporary staged and backup directories on successful verification
  try {
    io.rmSync(txDir, { recursive: true, force: true });
  } catch {
    // Non-fatal if folder removal is delayed by OS
  }

  return {
    updatedMapCount: updatedMap.length,
    updatedPacksCount: stagedPacks.length,
    changedMapCount,
    changedPacksCount,
    changedFilesCount,
    counts,
    dryRun: false,
    transactionId,
    verifiedCommitted: true,
  };
}

// Execute if run directly
if (process.argv[1]?.includes('migrate-curriculum-provenance')) {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting P1 Curriculum Provenance Migration${isDryRun ? ' [DRY RUN]' : ''}...`);
  try {
    const result = runCurriculumProvenanceMigration();
    console.log(`Migration completed successfully! (dryRun: ${result.dryRun})`);
    console.log(`Curriculum Map Entries: ${result.updatedMapCount} (changed: ${result.changedMapCount})`);
    console.log(`Lesson Pack Files: ${result.updatedPacksCount} (changed: ${result.changedPacksCount})`);
    console.log(`Total Files Changed: ${result.changedFilesCount}`);
    console.log('Counts Breakdown:');
    console.log('  Authoring Origin:', JSON.stringify(result.counts.authoring, null, 2));
    console.log('  Verification Status:', JSON.stringify(result.counts.verification, null, 2));
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
