import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  AuthoringOrigin,
  VerificationStatus,
  CurriculumMapItem,
  CurriculumMapItemSchema,
  LessonPack,
  LessonPackSchema,
} from '../src/domain/models/types';
import curriculumMapJson from '../content/curriculum-map.json';
import {
  getAuthoringOriginBadge,
  getVerificationStatusBadge,
} from '../src/presentation/screens/CurriculumScreen';
import { renderToString } from 'react-dom/server';
import {
  getApprovedProvenance,
  getAllExpectedLessonIds,
  runCurriculumProvenanceMigration,
  verifyLearningContentDeepEquality,
  MigrationFileSystem,
  MigrationTransactionError,
} from '../scripts/migrate-curriculum-provenance';

describe('P1 Curriculum Provenance Migration: Truthful Metadata & Governance', () => {
  const mapItems = curriculumMapJson as CurriculumMapItem[];

  it('contains exactly 174 curriculum map entries spanning N5, N4, N3, N2', () => {
    expect(mapItems).toHaveLength(174);
  });

  describe('Exact Approved Metadata Mapping & Counts', () => {
    it('verifies exact counts: 144 unknown authoring, 30 ai-assisted; 144 automated-structure-checked, 30 editorial-reviewed', () => {
      const authoringCounts: Record<AuthoringOrigin, number> = {
        'human-authored': 0,
        'ai-assisted': 0,
        'ai-authored': 0,
        'unknown': 0,
      };
      const verificationCounts: Record<VerificationStatus, number> = {
        'native-speaker-verified': 0,
        'editorial-reviewed': 0,
        'automated-structure-checked': 0,
        'unverified': 0,
      };

      for (const item of mapItems) {
        if (item.authoringOrigin) {
          authoringCounts[item.authoringOrigin]++;
        }
        if (item.verificationStatus) {
          verificationCounts[item.verificationStatus]++;
        }
      }

      expect(authoringCounts).toEqual({
        'unknown': 144,
        'ai-assisted': 30,
        'ai-authored': 0,
        'human-authored': 0,
      });

      expect(verificationCounts).toEqual({
        'automated-structure-checked': 144,
        'editorial-reviewed': 30,
        'native-speaker-verified': 0,
        'unverified': 0,
      });
    });

    it('enforces exact level-by-level approved provenance mapping across all 174 map items and packs', () => {
      for (const item of mapItems) {
        const level = item.level;
        const num = item.number;

        if (level === 'N5') {
          expect(item.authoringOrigin).toBe('unknown');
          expect(item.verificationStatus).toBe('automated-structure-checked');
        } else if (level === 'N4') {
          expect(item.authoringOrigin).toBe('unknown');
          expect(item.verificationStatus).toBe('automated-structure-checked');
        } else if (level === 'N3') {
          if (num >= 1 && num <= 30) {
            expect(item.authoringOrigin).toBe('ai-assisted');
            expect(item.verificationStatus).toBe('editorial-reviewed');
          } else {
            expect(item.authoringOrigin).toBe('unknown');
            expect(item.verificationStatus).toBe('automated-structure-checked');
          }
        } else if (level === 'N2') {
          expect(item.authoringOrigin).toBe('unknown');
          expect(item.verificationStatus).toBe('automated-structure-checked');
        }

        // Pack file validation
        const packPath = path.resolve(`./content/packs/${level.toLowerCase()}/${item.id}.json`);
        expect(fs.existsSync(packPath), `Pack file must exist at ${packPath}`).toBe(true);

        const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8')) as LessonPack;
        expect(pack.prov.authoringOrigin).toBe(item.authoringOrigin);
        expect(pack.prov.verificationStatus).toBe(item.verificationStatus);
        // Canonical model: root-level authoringOrigin and verificationStatus removed from pack JSON
        expect((pack as Record<string, unknown>).authoringOrigin).toBeUndefined();
        expect((pack as Record<string, unknown>).verificationStatus).toBeUndefined();

        // Zod validation
        expect(() => CurriculumMapItemSchema.parse(item)).not.toThrow();
        expect(() => LessonPackSchema.parse(pack)).not.toThrow();
      }
    });
  });

  describe('Historical Provenance String Preservation', () => {
    it('preserves historical provenance.source strings byte-for-byte across all tiers', () => {
      const n5_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n5/n5.l01.json'), 'utf-8'));
      expect(n5_01.prov.source).toBe('Nihongo N2 Master Editorial Team');

      const n5_02 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n5/n5.l02.json'), 'utf-8'));
      expect(n5_02.prov.source).toBe('Nihongo N2 Master Editorial Team (Native Review)');

      const n4_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n4/n4.l01.json'), 'utf-8'));
      expect(n4_01.prov.source).toBe('Nihongo N2 Master Editorial Team (Native Review)');

      const n3_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n3/n3.l01.json'), 'utf-8'));
      expect(n3_01.prov.source).toBe('Nihongo N2 Master Editorial Team (AI-Assisted Editorial Authoring)');

      const n3_31 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n3/n3.l31.json'), 'utf-8'));
      expect(n3_31.prov.source).toBe('Nihongo N2 Master Editorial Team');

      const n2_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l01.json'), 'utf-8'));
      expect(n2_01.prov.source).toBe('Nihongo N2 Master Editorial Team');
    });

    it('preserves legacy prov.status without rewriting historical values', () => {
      const n2_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l01.json'), 'utf-8'));
      expect(n2_01.prov.status).toBe('native_verified');

      const n3_01 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n3/n3.l01.json'), 'utf-8'));
      expect(n3_01.prov.status).toBe('native_verified');
    });
  });

  describe('UI Badge Rendering & Trust Boundary', () => {
    it('renders correct authoring badges with exhaustive switch coverage and safe fallback', () => {
      const humanHtml = renderToString(getAuthoringOriginBadge('human-authored'));
      expect(humanHtml).toContain('Human-Authored');

      const assistedHtml = renderToString(getAuthoringOriginBadge('ai-assisted'));
      expect(assistedHtml).toContain('AI-Assisted');

      const aiHtml = renderToString(getAuthoringOriginBadge('ai-authored'));
      expect(aiHtml).toContain('AI-Authored');

      const unknownHtml = renderToString(getAuthoringOriginBadge('unknown'));
      expect(unknownHtml).toContain('Origin Unspecified');

      const undefinedFallback = renderToString(getAuthoringOriginBadge(undefined));
      expect(undefinedFallback).toContain('Origin Unspecified');
    });

    it('renders correct verification badges with informative tooltip for editorial-reviewed', () => {
      const nativeHtml = renderToString(getVerificationStatusBadge('native-speaker-verified'));
      expect(nativeHtml).toContain('Native-Verified');

      const editorialHtml = renderToString(getVerificationStatusBadge('editorial-reviewed'));
      expect(editorialHtml).toContain('Editorial-Reviewed');
      expect(editorialHtml).toContain('Internal editorial pass documented; not native-speaker verified');

      const autoHtml = renderToString(getVerificationStatusBadge('automated-structure-checked'));
      expect(autoHtml).toContain('Automated QA Passed');

      const unverifiedHtml = renderToString(getVerificationStatusBadge('unverified'));
      expect(unverifiedHtml).toContain('Pending Review');

      // Safe fallback for legacy/missing values: never map to QA passed
      const fallbackHtml = renderToString(getVerificationStatusBadge(undefined));
      expect(fallbackHtml).toContain('Pending Review');
      expect(fallbackHtml).not.toContain('Automated QA Passed');
    });

    it('ensures legacy native_verified in prov.status cannot trigger a Native-Verified UI badge', () => {
      // Historical pack with native_verified legacy status, but automated-structure-checked verification
      const n2Pack = JSON.parse(
        fs.readFileSync(path.resolve('./content/packs/n2/n2.l01.json'), 'utf-8')
      );
      expect(n2Pack.prov.status).toBe('native_verified');
      expect(n2Pack.prov.verificationStatus).toBe('automated-structure-checked');

      // The UI badge is exclusively driven by verificationStatus, NOT prov.status
      const badgeHtml = renderToString(getVerificationStatusBadge(n2Pack.prov.verificationStatus));
      expect(badgeHtml).toContain('Automated QA Passed');
      expect(badgeHtml).not.toContain('Native-Verified');
    });
  });

  describe('Canonical Schema Enforcement & Field Decoupling', () => {
    it('requires authoringOrigin and verificationStatus in LessonPackProvenanceSchema', () => {
      const invalidProv = {
        source: 'Test Source',
        license: 'CC-BY-4.0',
        status: 'reviewed',
        updatedAt: '2026-11-01',
        rev: 1,
      };

      // LessonPackProvenanceSchema must reject missing modern fields
      expect(() => {
        LessonPackSchema.shape.prov.parse(invalidProv);
      }).toThrow();

      // Valid provenance passes
      expect(() => {
        LessonPackSchema.shape.prov.parse({
          ...invalidProv,
          authoringOrigin: 'unknown',
          verificationStatus: 'automated-structure-checked',
        });
      }).not.toThrow();
    });

    it('confirms all 174 lesson packs have removed duplicate root-level authoringOrigin and verificationStatus', () => {
      for (const item of mapItems) {
        const levelDir = item.level.toLowerCase();
        const packPath = path.resolve(`./content/packs/${levelDir}/${item.id}.json`);
        const rawJson = JSON.parse(fs.readFileSync(packPath, 'utf-8'));

        expect(
          rawJson.authoringOrigin,
          `Root authoringOrigin must be stripped from ${item.id}`
        ).toBeUndefined();
        expect(
          rawJson.verificationStatus,
          `Root verificationStatus must be stripped from ${item.id}`
        ).toBeUndefined();

        expect(rawJson.prov.authoringOrigin).toBeDefined();
        expect(rawJson.prov.verificationStatus).toBeDefined();
      }
    });
  });

  describe('Exact Lesson ID Set Validation', () => {
    it('accepts all 174 exact expected lesson IDs and maps to approved provenance', () => {
      const expectedIds = getAllExpectedLessonIds();
      expect(expectedIds.size).toBe(174);

      for (const id of expectedIds) {
        const approved = getApprovedProvenance(id);
        expect(approved.authoringOrigin).toBeDefined();
        expect(approved.verificationStatus).toBeDefined();
      }
    });

    it('rejects out-of-range lesson numbers across all tiers', () => {
      expect(() => getApprovedProvenance('n5.l31')).toThrow(
        /Rejected lesson ID "n5.l31": N5 range is strictly L01-L30/
      );
      expect(() => getApprovedProvenance('n4.l37')).toThrow(
        /Rejected lesson ID "n4.l37": N4 range is strictly L01-L36/
      );
      expect(() => getApprovedProvenance('n3.l49')).toThrow(
        /Rejected lesson ID "n3.l49": N3 range is strictly L01-L48/
      );
      expect(() => getApprovedProvenance('n2.l61')).toThrow(
        /Rejected lesson ID "n2.l61": N2 range is strictly L01-L60/
      );
    });

    it('rejects boundary values and zero-indexed lesson IDs', () => {
      expect(() => getApprovedProvenance('n5.l00')).toThrow(/N5 range is strictly L01-L30/);
      expect(() => getApprovedProvenance('n4.l00')).toThrow(/N4 range is strictly L01-L36/);
      expect(() => getApprovedProvenance('n3.l00')).toThrow(/N3 range is strictly L01-L48/);
      expect(() => getApprovedProvenance('n2.l00')).toThrow(/N2 range is strictly L01-L60/);
    });

    it('rejects malformed lesson IDs, single-digit formats, and unsupported levels', () => {
      expect(() => getApprovedProvenance('n5.l1')).toThrow(/Expected exact format/);
      expect(() => getApprovedProvenance('n1.l01')).toThrow(/Expected exact format/);
      expect(() => getApprovedProvenance('n6.l01')).toThrow(/Expected exact format/);
      expect(() => getApprovedProvenance('invalid-id')).toThrow(/Expected exact format/);
      expect(() => getApprovedProvenance('')).toThrow(/Lesson ID cannot be empty/);
    });
  });

  describe('Deep Content Preservation & Integrity Verification', () => {
    it('passes when learning content arrays and objects are deeply identical', () => {
      const n5_01 = JSON.parse(
        fs.readFileSync(path.resolve('./content/packs/n5/n5.l01.json'), 'utf-8')
      );
      const cloned = JSON.parse(JSON.stringify(n5_01));

      expect(() => verifyLearningContentDeepEquality(n5_01, cloned, 'n5.l01')).not.toThrow();
    });

    it('throws error when Japanese or Burmese learning content is altered', () => {
      const n5_01 = JSON.parse(
        fs.readFileSync(path.resolve('./content/packs/n5/n5.l01.json'), 'utf-8')
      );
      const corruptedVocab = JSON.parse(JSON.stringify(n5_01));
      corruptedVocab.vocabularies[0].ja = 'こんにちは_MODIFIED';

      expect(() =>
        verifyLearningContentDeepEquality(n5_01, corruptedVocab, 'n5.l01')
      ).toThrow(/vocabularies content was altered/);

      const corruptedReading = JSON.parse(JSON.stringify(n5_01));
      corruptedReading.reading.passage = 'Altered passage text';

      expect(() =>
        verifyLearningContentDeepEquality(n5_01, corruptedReading, 'n5.l01')
      ).toThrow(/reading content was altered/);
    });

    it('throws error when historical provenance source or legacy status is altered', () => {
      const n5_01 = JSON.parse(
        fs.readFileSync(path.resolve('./content/packs/n5/n5.l01.json'), 'utf-8')
      );
      const corruptedSource = JSON.parse(JSON.stringify(n5_01));
      corruptedSource.prov.source = 'Altered Team Name';

      expect(() =>
        verifyLearningContentDeepEquality(n5_01, corruptedSource, 'n5.l01')
      ).toThrow(/Historical provenance source corrupted/);

      const corruptedStatus = JSON.parse(JSON.stringify(n5_01));
      corruptedStatus.prov.status = 'draft';

      expect(() =>
        verifyLearningContentDeepEquality(n5_01, corruptedStatus, 'n5.l01')
      ).toThrow(/Historical provenance status corrupted/);
    });
  });

  describe('Multi-File Transaction Safety, Staged Migration & Rollback Mechanics', () => {
    function createMemoryFS(options?: { alreadyMigrated?: boolean }) {
      const files = new Map<string, string>();
      const writes: string[] = [];

      // Seed with real curriculum-map.json
      const root = path.resolve('.');
      const mapPath = path.join(root, 'content', 'curriculum-map.json');
      const rawMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
      if (!options?.alreadyMigrated) {
        // Strip modern provenance to simulate unmigrated repository
        const legacyMap = rawMap.map((item: any) => {
          const { authoringOrigin: _a, verificationStatus: _v, ...rest } = item;
          return rest;
        });
        files.set(mapPath, JSON.stringify(legacyMap, null, 2) + '\n');
      } else {
        files.set(mapPath, fs.readFileSync(mapPath, 'utf-8'));
      }

      // Seed with all 174 real lesson pack files
      for (const expId of getAllExpectedLessonIds()) {
        const level = expId.substring(0, 2);
        const p = path.join(root, 'content', 'packs', level, `${expId}.json`);
        const rawPack = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (!options?.alreadyMigrated) {
          // Strip modern provenance from prov to simulate unmigrated repository
          const { authoringOrigin: _a, verificationStatus: _v, ...legacyProv } = rawPack.prov;
          const legacyPack = {
            ...rawPack,
            prov: legacyProv,
          };
          files.set(p, JSON.stringify(legacyPack, null, 2) + '\n');
        } else {
          files.set(p, fs.readFileSync(p, 'utf-8'));
        }
      }

      const memFS: MigrationFileSystem = {
        existsSync: (p: string) => files.has(p),
        readFileSync: (p: string) => {
          const content = files.get(p);
          if (content === undefined) {
            throw new Error(`ENOENT: no such file or directory, open '${p}'`);
          }
          return content;
        },
        writeFileSync: (p: string, content: string) => {
          writes.push(p);
          files.set(p, content);
        },
        copyFileSync: (src: string, dest: string) => {
          const content = files.get(src);
          if (content === undefined) {
            throw new Error(`ENOENT: cannot copy '${src}' -> '${dest}'`);
          }
          writes.push(dest);
          files.set(dest, content);
        },
        mkdirSync: (_p: string) => {
          // in-memory map handles paths directly
        },
        rmSync: (p: string) => {
          for (const k of Array.from(files.keys())) {
            if (k.startsWith(p)) {
              files.delete(k);
            }
          }
        },
      };

      return { fs: memFS, files, writes, root, mapPath };
    }

    it('performs NO filesystem writes during --dry-run', () => {
      const mem = createMemoryFS();
      const result = runCurriculumProvenanceMigration({
        dryRun: true,
        fs: mem.fs,
        rootDir: mem.root,
      });

      expect(result.dryRun).toBe(true);
      expect(result.updatedMapCount).toBe(174);
      expect(result.updatedPacksCount).toBe(174);
      expect(result.changedMapCount).toBe(1);
      expect(result.changedPacksCount).toBe(174);
      expect(result.changedFilesCount).toBe(175);
      // Assert zero write operations occurred
      expect(mem.writes).toHaveLength(0);
    });

    it('rejects missing pack files during preflight before writing any files', () => {
      const mem = createMemoryFS();
      const targetPack = path.join(mem.root, 'content', 'packs', 'n2', 'n2.l60.json');
      mem.files.delete(targetPack);

      expect(() =>
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
        })
      ).toThrow(/Preflight check failed: Missing pack file/);

      // No staged files or backups were written
      expect(mem.writes).toHaveLength(0);
    });

    it('rejects duplicate lesson IDs in curriculum map during preflight', () => {
      const mem = createMemoryFS();
      const rawMap = JSON.parse(mem.files.get(mem.mapPath)!);
      rawMap[1].id = rawMap[0].id; // duplicate ID
      mem.files.set(mem.mapPath, JSON.stringify(rawMap));

      expect(() =>
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
        })
      ).toThrow(/Duplicate lesson ID detected in curriculum map/);

      expect(mem.writes).toHaveLength(0);
    });

    it('rejects unexpected lesson IDs in curriculum map during preflight', () => {
      const mem = createMemoryFS();
      const rawMap = JSON.parse(mem.files.get(mem.mapPath)!);
      rawMap[173].id = 'n5.l31'; // out of range ID
      mem.files.set(mem.mapPath, JSON.stringify(rawMap));

      expect(() =>
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
        })
      ).toThrow(/Curriculum map contains unexpected lesson ID: "n5.l31"/);

      expect(mem.writes).toHaveLength(0);
    });

    it('leaves all original files untouched when staged write phase fails', () => {
      const mem = createMemoryFS();
      const originalMap = mem.files.get(mem.mapPath)!;
      const originalPack = mem.files.get(
        path.join(mem.root, 'content', 'packs', 'n5', 'n5.l01.json')
      )!;

      expect(() =>
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
          faultInjection: { failDuringStagedWriteAt: 5 },
        })
      ).toThrow(MigrationTransactionError);

      // Verify original map and pack are completely identical to pre-migration
      expect(mem.files.get(mem.mapPath)).toBe(originalMap);
      expect(
        mem.files.get(path.join(mem.root, 'content', 'packs', 'n5', 'n5.l01.json'))
      ).toBe(originalPack);
    });

    it('triggers rollback and restores every previously replaced file when replacement fails', () => {
      const mem = createMemoryFS();
      const originalMap = mem.files.get(mem.mapPath)!;
      const originalP01 = mem.files.get(
        path.join(mem.root, 'content', 'packs', 'n5', 'n5.l01.json')
      )!;
      const originalP02 = mem.files.get(
        path.join(mem.root, 'content', 'packs', 'n5', 'n5.l02.json')
      )!;

      let caughtError: any = null;
      try {
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
          faultInjection: { failDuringReplacementAt: 3 }, // Map + L01 + L02 replaced, then fail at L03
        });
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(MigrationTransactionError);
      expect(caughtError.manifest?.state).toBe('rolled_back');
      expect(caughtError.recoveryReport?.rollbackSuccessful).toBe(true);

      // Assert that replaced entries (map, l01, l02) were restored back to original
      expect(mem.files.get(mem.mapPath)).toBe(originalMap);
      expect(
        mem.files.get(path.join(mem.root, 'content', 'packs', 'n5', 'n5.l01.json'))
      ).toBe(originalP01);
      expect(
        mem.files.get(path.join(mem.root, 'content', 'packs', 'n5', 'n5.l02.json'))
      ).toBe(originalP02);
    });

    it('triggers rollback when post-replacement verification fails', () => {
      const mem = createMemoryFS();
      const originalMap = mem.files.get(mem.mapPath)!;

      let caughtError: any = null;
      try {
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
          faultInjection: { failDuringVerification: true },
        });
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(MigrationTransactionError);
      expect(caughtError.manifest?.state).toBe('rolled_back');
      expect(caughtError.recoveryReport?.rollbackSuccessful).toBe(true);
      expect(mem.files.get(mem.mapPath)).toBe(originalMap);
    });

    it('preserves recovery artifacts and manifest if rollback itself fails', () => {
      const mem = createMemoryFS();

      let caughtError: any = null;
      try {
        runCurriculumProvenanceMigration({
          dryRun: false,
          fs: mem.fs,
          rootDir: mem.root,
          faultInjection: { failDuringReplacementAt: 2, failDuringRollback: true },
        });
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(MigrationTransactionError);
      expect(caughtError.manifest?.state).toBe('failed');
      expect(caughtError.recoveryReport?.rollbackSuccessful).toBe(false);

      // Verify recovery artifacts are preserved in .migration-transaction
      const manifestPath = path.join(mem.root, '.migration-transaction', 'manifest.json');
      const reportPath = path.join(
        mem.root,
        '.migration-transaction',
        'recovery-report.json'
      );
      expect(mem.files.has(manifestPath)).toBe(true);
      expect(mem.files.has(reportPath)).toBe(true);
    });

    it('executes successful migration updating exactly 174 packs and 174 map entries and is idempotent with zero rewrites on re-run', () => {
      const mem = createMemoryFS();

      // First run: applies migration
      const result1 = runCurriculumProvenanceMigration({
        dryRun: false,
        fs: mem.fs,
        rootDir: mem.root,
      });

      expect(result1.updatedMapCount).toBe(174);
      expect(result1.updatedPacksCount).toBe(174);
      expect(result1.changedMapCount).toBe(1);
      expect(result1.changedPacksCount).toBe(174);
      expect(result1.changedFilesCount).toBe(175);
      expect(result1.verifiedCommitted).toBe(true);

      // Verify committed curriculum-map.json
      const updatedMap = JSON.parse(mem.files.get(mem.mapPath)!);
      expect(updatedMap).toHaveLength(174);
      for (const item of updatedMap) {
        expect(item.authoringOrigin).toBeDefined();
        expect(item.verificationStatus).toBeDefined();
      }

      // Verify committed packs on disk
      for (const expId of getAllExpectedLessonIds()) {
        const level = expId.substring(0, 2);
        const p = path.join(mem.root, 'content', 'packs', level, `${expId}.json`);
        const committedPack = JSON.parse(mem.files.get(p)!);

        expect(committedPack.prov.authoringOrigin).toBeDefined();
        expect(committedPack.prov.verificationStatus).toBeDefined();
        expect(committedPack.authoringOrigin).toBeUndefined();
        expect(committedPack.verificationStatus).toBeUndefined();
      }

      // Second run: idempotency check on already migrated content
      // Wrap fs write and copy methods to prove zero filesystem writes/replacements happen on run 2
      let copyCount = 0;
      let writeCount = 0;
      const trackingFs: MigrationFileSystem = {
        ...mem.fs,
        copyFileSync: (src, dest) => {
          copyCount++;
          mem.fs.copyFileSync(src, dest);
        },
        writeFileSync: (p, c, enc) => {
          writeCount++;
          mem.fs.writeFileSync(p, c, enc);
        },
      };

      const result2 = runCurriculumProvenanceMigration({
        dryRun: false,
        fs: trackingFs,
        rootDir: mem.root,
      });

      // Operational idempotency: report 0 changed files and perform 0 disk writes/replacements
      expect(result2.updatedMapCount).toBe(174);
      expect(result2.updatedPacksCount).toBe(174);
      expect(result2.changedMapCount).toBe(0);
      expect(result2.changedPacksCount).toBe(0);
      expect(result2.changedFilesCount).toBe(0);
      expect(result2.verifiedCommitted).toBe(true);
      expect(copyCount).toBe(0); // Zero unnecessary replacements or backup copies
      expect(writeCount).toBe(0); // Zero unnecessary file writes
    }, 20000);

    it('running migration directly on already-migrated repository returns changedFilesCount: 0 without any filesystem writes', () => {
      const mem = createMemoryFS({ alreadyMigrated: true });
      let writeCount = 0;
      let copyCount = 0;
      const trackingFs: MigrationFileSystem = {
        ...mem.fs,
        writeFileSync: (p, c, enc) => {
          writeCount++;
          mem.fs.writeFileSync(p, c, enc);
        },
        copyFileSync: (src, dest) => {
          copyCount++;
          mem.fs.copyFileSync(src, dest);
        },
      };

      const result = runCurriculumProvenanceMigration({
        dryRun: false,
        fs: trackingFs,
        rootDir: mem.root,
      });

      expect(result.updatedMapCount).toBe(174);
      expect(result.updatedPacksCount).toBe(174);
      expect(result.changedMapCount).toBe(0);
      expect(result.changedPacksCount).toBe(0);
      expect(result.changedFilesCount).toBe(0);
      expect(result.verifiedCommitted).toBe(true);
      expect(writeCount).toBe(0);
      expect(copyCount).toBe(0);
    });
  });
});
