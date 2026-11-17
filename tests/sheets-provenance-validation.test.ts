import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { GoogleSheetsPipeline } from '../src/integrations/sheets/sheets-pipeline';
import {
  LessonPackProvenanceSchema,
  LessonPackSchema,
  LessonPack,
  AuthoringOrigin,
} from '../src/domain/models/types';
import n5l01Json from '../content/packs/n5/n5.l01.json';

describe('P1 Final Fix: Google Sheets Trusted Verification Policy & Provenance Boundary', () => {
  describe('1. Default Provenance & Explicit Unverified Handling', () => {
    it('Google Sheets row with missing verification status defaults to unverified', () => {
      const row: Record<string, string> = {
        source: 'Custom Google Sheet',
        license: 'CC-BY-4.0',
      };

      const prov = GoogleSheetsPipeline.buildProvenance(row);
      expect(prov.verificationStatus).toBe('unverified');
      expect(prov.verificationStatus).not.toBe('automated-structure-checked');
    });

    it('explicit unverified is accepted directly without warnings', () => {
      const row: Record<string, string> = {
        verificationStatus: 'unverified',
        authoringOrigin: 'unknown',
      };

      const audit = GoogleSheetsPipeline.evaluateProvenance(row);
      expect(audit.effectiveVerificationStatus).toBe('unverified');
      expect(audit.statusDowngraded).toBe(false);
      expect(audit.downgradeReason).toBeUndefined();
      expect(audit.prov.verificationStatus).toBe('unverified');
    });

    it('missing authoring origin defaults to unknown', () => {
      const row: Record<string, string> = {
        source: 'Custom Google Sheet',
      };

      const prov = GoogleSheetsPipeline.buildProvenance(row);
      expect(prov.authoringOrigin).toBe('unknown');
    });

    it('legacy status defaults to reviewed for backward compatibility without treating it as modern verification evidence', () => {
      const row: Record<string, string> = {};

      const prov = GoogleSheetsPipeline.buildProvenance(row);
      expect(prov.status).toBe('reviewed');
      expect(prov.verificationStatus).toBe('unverified');
    });

    it('completely empty row constructs valid provenance passing LessonPackProvenanceSchema', () => {
      const emptyRow: Record<string, string> = {};

      const prov = GoogleSheetsPipeline.buildProvenance(emptyRow);
      const parsed = LessonPackProvenanceSchema.safeParse(prov);
      expect(parsed.success).toBe(true);
      expect(prov.authoringOrigin).toBe('unknown');
      expect(prov.verificationStatus).toBe('unverified');
      expect(prov.status).toBe('reviewed');
      expect(prov.rev).toBe(1);
    });
  });

  describe('2. Trusted Verification Policy: Untrusted Input Downgrade', () => {
    it('spreadsheet-only automated-structure-checked cannot bypass real automated checks and is downgraded to unverified', () => {
      const row = {
        verificationStatus: 'automated-structure-checked',
      };

      const audit = GoogleSheetsPipeline.evaluateProvenance(row);
      expect(audit.effectiveVerificationStatus).toBe('unverified');
      expect(audit.statusDowngraded).toBe(true);
      expect(audit.downgradeReason).toContain('Spreadsheet cell declared "automated-structure-checked"');
      expect(audit.prov.verificationStatus).toBe('unverified');
    });

    it('spreadsheet-only editorial-reviewed is not accepted without trusted review evidence and is downgraded to unverified', () => {
      const row = {
        verificationStatus: 'editorial-reviewed',
      };

      const audit = GoogleSheetsPipeline.evaluateProvenance(row);
      expect(audit.effectiveVerificationStatus).toBe('unverified');
      expect(audit.statusDowngraded).toBe(true);
      expect(audit.downgradeReason).toContain('no authenticated reviewer approval mechanism currently exists');
      expect(audit.prov.verificationStatus).toBe('unverified');
    });

    it('spreadsheet-only native-speaker-verified is not accepted without trusted native-speaker evidence and is downgraded to unverified', () => {
      const row = {
        verificationStatus: 'native-speaker-verified',
      };

      const audit = GoogleSheetsPipeline.evaluateProvenance(row);
      expect(audit.effectiveVerificationStatus).toBe('unverified');
      expect(audit.statusDowngraded).toBe(true);
      expect(audit.downgradeReason).toContain('no authenticated native-speaker verification mechanism currently exists');
      expect(audit.prov.verificationStatus).toBe('unverified');
    });

    it('a plain reviewer name does not establish verification and remains downgraded to unverified', () => {
      const rowEditorialWithReviewer = {
        verificationStatus: 'editorial-reviewed',
        reviewer: 'John Doe, Senior Curriculum Editor',
      };

      const auditEditorial = GoogleSheetsPipeline.evaluateProvenance(rowEditorialWithReviewer);
      expect(auditEditorial.effectiveVerificationStatus).toBe('unverified');
      expect(auditEditorial.statusDowngraded).toBe(true);
      expect(auditEditorial.prov.reviewer).toBe('John Doe, Senior Curriculum Editor');
      expect(auditEditorial.prov.verificationStatus).toBe('unverified');
      expect(auditEditorial.downgradeReason).toContain('no authenticated reviewer approval mechanism currently exists');

      const rowNativeWithReviewer = {
        verificationStatus: 'native-speaker-verified',
        reviewer: 'Yamada Taro, Native Japanese Reviewer',
      };

      const auditNative = GoogleSheetsPipeline.evaluateProvenance(rowNativeWithReviewer);
      expect(auditNative.effectiveVerificationStatus).toBe('unverified');
      expect(auditNative.statusDowngraded).toBe(true);
      expect(auditNative.prov.reviewer).toBe('Yamada Taro, Native Japanese Reviewer');
      expect(auditNative.prov.verificationStatus).toBe('unverified');
      expect(auditNative.downgradeReason).toContain('no authenticated native-speaker verification mechanism currently exists');
    });
  });

  describe('3. Removal of Caller-Controlled Verification Trust & Security Hardening', () => {
    it('caller-supplied automatedStructureCertified boolean cannot bypass certification and remains downgraded to unverified', () => {
      const row = { verificationStatus: 'automated-structure-checked' };

      const audit = GoogleSheetsPipeline.evaluateProvenance(row, {
        automatedStructureCertified: true,
      } as any);

      expect(audit.effectiveVerificationStatus).toBe('unverified');
      expect(audit.statusDowngraded).toBe(true);
      expect(audit.prov.verificationStatus).toBe('unverified');
      expect(audit.downgradeReason).toContain('Spreadsheet cell declared "automated-structure-checked"');
    });

    it('arbitrary reviewer objects or approval payloads cannot bypass the trust policy and remain downgraded', () => {
      const rowEditorial = {
        verificationStatus: 'editorial-reviewed',
        reviewer: 'Editorial Board',
      };

      const auditEditorial = GoogleSheetsPipeline.evaluateProvenance(rowEditorial, {
        trustedReviewApproval: {
          workflowId: 'wf-editorial-pass-2026',
          approvedAt: '2026-11-15T12:00:00Z',
          verifiedSignature: 'sig_ed_9831',
        },
      } as any);

      expect(auditEditorial.effectiveVerificationStatus).toBe('unverified');
      expect(auditEditorial.statusDowngraded).toBe(true);
      expect(auditEditorial.prov.verificationStatus).toBe('unverified');
      expect(auditEditorial.downgradeReason).toContain('no authenticated reviewer approval mechanism currently exists');

      const rowNative = {
        verificationStatus: 'native-speaker-verified',
        reviewer: 'Tokyo Native Review Team',
      };

      const auditNative = GoogleSheetsPipeline.evaluateProvenance(rowNative, {
        trustedNativeReviewApproval: {
          workflowId: 'wf-native-review-tokyo',
          approvedAt: '2026-11-15T14:00:00Z',
          verifiedSignature: 'sig_nat_4412',
        },
      } as any);

      expect(auditNative.effectiveVerificationStatus).toBe('unverified');
      expect(auditNative.statusDowngraded).toBe(true);
      expect(auditNative.prov.verificationStatus).toBe('unverified');
      expect(auditNative.downgradeReason).toContain('no authenticated native-speaker verification mechanism currently exists');
    });

    it('preserves explicit valid authoring origin across all allowed enum values', () => {
      const allowedOrigins: AuthoringOrigin[] = [
        'human-authored',
        'ai-assisted',
        'ai-authored',
        'unknown',
      ];

      for (const origin of allowedOrigins) {
        const row = { authoringOrigin: origin };
        const prov = GoogleSheetsPipeline.buildProvenance(row);
        expect(prov.authoringOrigin).toBe(origin);
      }
    });
  });

  describe('4. Automated Structural Certification Pipeline', () => {
    const validPack = n5l01Json as unknown as LessonPack;

    it('certifyAutomatedStructure successfully verifies and upgrades a compliant pack', () => {
      const unverifiedPack: LessonPack = {
        ...validPack,
        prov: {
          ...validPack.prov,
          verificationStatus: 'unverified',
        },
      };

      const certified = GoogleSheetsPipeline.certifyAutomatedStructure(unverifiedPack);
      expect(certified.prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.vocabularies[0].prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.kanjis[0].prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.grammars[0].prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.sentences[0].prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.reading.prov.verificationStatus).toBe('automated-structure-checked');
      expect(certified.listening.prov.verificationStatus).toBe('automated-structure-checked');
    });

    it('certifyAutomatedStructure fails when pack has broken vocabulary exampleSentenceId references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        vocabularies: [
          {
            ...validPack.vocabularies[0],
            exampleSentenceId: 'non-existent-sentence-id',
          },
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Vocabulary .* references missing exampleSentenceId/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken kanjiId references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        vocabularies: [
          {
            ...validPack.vocabularies[0],
            kanjiIds: ['missing-kanji-id'],
          },
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Vocabulary .* references missing kanjiId/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken grammar example sentence references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        grammars: [
          {
            ...validPack.grammars[0],
            examples: [
              {
                sentenceId: 'non-existent-sentence-id',
                note: 'test note',
              },
            ],
          },
          ...validPack.grammars.slice(1),
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Grammar .* example references missing sentenceId 'non-existent-sentence-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken sentence vocabIds references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        sentences: [
          {
            ...validPack.sentences[0],
            vocabIds: ['non-existent-vocab-id'],
          },
          ...validPack.sentences.slice(1),
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Sentence .* references missing vocabId 'non-existent-vocab-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken sentence grammarIds references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        sentences: [
          {
            ...validPack.sentences[0],
            grammarIds: ['non-existent-grammar-id'],
          },
          ...validPack.sentences.slice(1),
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Sentence .* references missing grammarId 'non-existent-grammar-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken reading questionIds references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        reading: {
          ...validPack.reading,
          questionIds: ['non-existent-question-id'],
        },
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Reading passage .* references missing questionId 'non-existent-question-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken listening questionIds references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        listening: {
          ...validPack.listening,
          questionIds: ['non-existent-question-id'],
        },
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Listening dialogue .* references missing questionId 'non-existent-question-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has broken question linkedItemIds references', () => {
      const brokenPack: LessonPack = {
        ...validPack,
        questions: [
          {
            ...validPack.questions[0],
            linkedItemIds: ['non-existent-item-id'],
          },
          ...validPack.questions.slice(1),
        ],
      };

      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(brokenPack)).toThrowError(
        /Automated certification failed: Question .* references missing linkedItemId 'non-existent-item-id'/
      );
    });

    it('certifyAutomatedStructure fails when pack has invalid lesson ID format or out-of-range lesson number', () => {
      const invalidIdPack: LessonPack = {
        ...validPack,
        id: 'n5.lesson01',
      };
      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(invalidIdPack)).toThrowError(
        /Automated certification failed: Invalid lesson ID format/
      );

      const outOfRangePack: LessonPack = {
        ...validPack,
        id: 'n5.l31',
        number: 31,
      };
      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(outOfRangePack)).toThrowError(
        /Automated certification failed: Lesson number 31 is out of allowed range/
      );

      const mismatchedLevelPack: LessonPack = {
        ...validPack,
        id: 'n5.l01',
        level: 'N4',
      };
      expect(() => GoogleSheetsPipeline.certifyAutomatedStructure(mismatchedLevelPack)).toThrowError(
        /Automated certification failed: Lesson ID level 'n5' does not match pack level 'N4'/
      );
    });
  });

  describe('5. Rejection of Invalid Metadata & Row Quarantine', () => {
    it('rejects invalid verification status with a Zod error', () => {
      const invalidRow = {
        verificationStatus: 'automated-qa-certified', // Not in enum
      };

      expect(() => GoogleSheetsPipeline.buildProvenance(invalidRow)).toThrowError();
    });

    it('rejects invalid authoring origin with a Zod error', () => {
      const invalidRow = {
        authoringOrigin: 'gpt-4o-generated', // Not in enum
      };

      expect(() => GoogleSheetsPipeline.buildProvenance(invalidRow)).toThrowError();
    });

    it('rejects invalid legacy status with a Zod error', () => {
      const invalidRow = {
        status: 'published_and_approved', // Not in enum: 'draft' | 'reviewed' | 'native_verified'
      };

      expect(() => GoogleSheetsPipeline.buildProvenance(invalidRow)).toThrowError();
    });

    it('quarantines Vocabulary row with invalid verificationStatus during parseAndStage', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Meta: [{ id: 'n5.l01', level: 'N5', title: 'Test Lesson' }],
        Vocabulary: [
          {
            id: 'n5.l01.v001',
            lessonId: 'n5.l01',
            ja: '水',
            kana: 'みず',
            en: 'Water',
            pos: 'noun',
            verificationStatus: 'invalid-verification-value', // Invalid!
          },
        ],
      };

      const { stagedPack, report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.quarantinedRows).toBeGreaterThanOrEqual(1);
      expect(report.canApply).toBe(false);

      const quarantinedVocab = report.rowReports.find((r) => r.tab === 'Vocabulary' && r.status === 'quarantined');
      expect(quarantinedVocab).toBeDefined();
      expect(quarantinedVocab?.errors.some((e) => e.includes('verificationStatus') || e.includes('Invalid enum value'))).toBe(true);
      expect(stagedPack.vocabularies).toHaveLength(0);
    });

    it('quarantines Meta row with invalid authoringOrigin during parseAndStage', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Meta: [
          {
            id: 'n5.l01',
            level: 'N5',
            title: 'Test Lesson',
            authoringOrigin: 'crowdsourced-unverified', // Invalid!
          },
        ],
      };

      const { report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      expect(report.quarantinedRows).toBe(1);
      expect(report.canApply).toBe(false);

      const quarantinedMeta = report.rowReports.find((r) => r.tab === 'Meta' && r.status === 'quarantined');
      expect(quarantinedMeta).toBeDefined();
      expect(quarantinedMeta?.errors[0]).toContain('Invalid Meta provenance');
    });
  });

  describe('6. Full Pipeline Auditability & Warning Preservation', () => {
    it('records provenance downgrade warnings in rowReports and provenanceAuditTrail during parseAndStage', () => {
      const tabsData: Record<string, Array<Record<string, string>>> = {
        Meta: [
          {
            id: 'n5.l01',
            level: 'N5',
            module: 'Module 1',
            number: '1',
            title: 'Test Lesson',
            description: 'Test description',
            status: 'draft',
            verificationStatus: 'editorial-reviewed', // Untrusted claim in Meta!
          },
        ],
        Vocabulary: [
          {
            id: 'n5.l01.v001',
            lessonId: 'n5.l01',
            ja: '本',
            kana: 'ほん',
            en: 'Book',
            pos: 'noun',
            verificationStatus: 'native-speaker-verified', // Untrusted claim in Vocab!
            reviewer: 'Tanaka-san',
          },
        ],
      };

      const { stagedPack, report } = GoogleSheetsPipeline.parseAndStage(tabsData);

      // Must be usable (canApply) since row data is structurally valid, but downgraded
      expect(report.canApply).toBe(true);
      expect(report.warningsCount).toBeGreaterThanOrEqual(2);

      // Meta provenance was downgraded to unverified
      expect(stagedPack.prov?.verificationStatus).toBe('unverified');
      // Vocabulary provenance was downgraded to unverified
      expect(stagedPack.vocabularies![0].prov.verificationStatus).toBe('unverified');

      // Check provenanceAuditTrail exists and records why
      expect(report.provenanceAuditTrail).toBeDefined();
      expect(report.provenanceAuditTrail!.length).toBeGreaterThanOrEqual(2);

      const metaAudit = report.provenanceAuditTrail!.find((a) => a.tab === 'Meta');
      expect(metaAudit).toBeDefined();
      expect(metaAudit?.requestedStatus).toBe('editorial-reviewed');
      expect(metaAudit?.effectiveStatus).toBe('unverified');
      expect(metaAudit?.downgradeReason).toContain('no authenticated reviewer approval mechanism currently exists');

      const vocabAudit = report.provenanceAuditTrail!.find((a) => a.tab === 'Vocabulary');
      expect(vocabAudit).toBeDefined();
      expect(vocabAudit?.requestedStatus).toBe('native-speaker-verified');
      expect(vocabAudit?.effectiveStatus).toBe('unverified');
      expect(vocabAudit?.downgradeReason).toContain('no authenticated native-speaker verification mechanism currently exists');
    });
  });
});
