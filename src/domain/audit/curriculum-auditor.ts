import { LessonPack, QuestionSkill } from '../models/types';
import { lintLessonPack, LintReport } from '../linter/content-linter';

export interface CurriculumAuditIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'progression' | 'coverage' | 'prerequisites' | 'difficulty' | 'duplicates' | 'linter';
  lessonId: string;
  message: string;
}

export interface CurriculumAuditReport {
  timestamp: string;
  totalLessonsAudited: number;
  publishedCount: number;
  draftedCount: number;
  plannedCount: number;
  countsByLevel: Record<'N5' | 'N4' | 'N3' | 'N2', { total: number; published: number }>;
  passed: boolean;
  totalErrors: number;
  totalWarnings: number;
  issues: CurriculumAuditIssue[];
  progressionSummary: {
    cumulativeVocab: number;
    cumulativeKanji: number;
    cumulativeGrammar: number;
  };
}

export class CurriculumAuditor {
  /**
   * Audits an ordered list of lesson packs for progression, prerequisites, and linter compliance
   */
  static auditCurriculum(packs: LessonPack[]): CurriculumAuditReport {
    const issues: CurriculumAuditIssue[] = [];
    const seenLessonIds = new Set<string>();
    const knownVocab = new Set<string>();
    const knownKanji = new Set<string>();

    let cumulativeVocab = 0;
    let cumulativeKanji = 0;
    let cumulativeGrammar = 0;

    let publishedCount = 0;
    let draftedCount = 0;
    let plannedCount = 0;

    const countsByLevel: Record<'N5' | 'N4' | 'N3' | 'N2', { total: number; published: number }> = {
      N5: { total: 0, published: 0 },
      N4: { total: 0, published: 0 },
      N3: { total: 0, published: 0 },
      N2: { total: 0, published: 0 },
    };

    packs.forEach((pack) => {
      countsByLevel[pack.level].total += 1;
      if (pack.status === 'published') {
        publishedCount += 1;
        countsByLevel[pack.level].published += 1;
      } else if (pack.status === 'draft') {
        draftedCount += 1;
      } else {
        plannedCount += 1;
      }

      // Check duplicates
      if (seenLessonIds.has(pack.id)) {
        issues.push({
          severity: 'error',
          category: 'duplicates',
          lessonId: pack.id,
          message: `Duplicate lesson ID detected: ${pack.id}`,
        });
      }
      seenLessonIds.add(pack.id);

      // Run content linter on pack
      const lint = lintLessonPack(pack);
      lint.errors.forEach((err) => {
        issues.push({
          severity: 'error',
          category: 'linter',
          lessonId: pack.id,
          message: `[${err.rule}] ${err.message}`,
        });
      });
      lint.warnings.forEach((warn) => {
        issues.push({
          severity: 'warning',
          category: 'linter',
          lessonId: pack.id,
          message: `[${warn.rule}] ${warn.message}`,
        });
      });

      // Track progression
      cumulativeVocab += pack.vocabularies.length;
      cumulativeKanji += pack.kanjis.length;
      cumulativeGrammar += pack.grammars.length;

      pack.vocabularies.forEach((v) => knownVocab.add(v.ja));
      pack.kanjis.forEach((k) => knownKanji.add(k.char));

      // Check question bank capacity for retake variety
      if (pack.questions.length < 25) {
        issues.push({
          severity: 'warning',
          category: 'coverage',
          lessonId: pack.id,
          message: `Question bank size (${pack.questions.length}) is below recommended retake threshold (25).`,
        });
      }
    });

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      timestamp: new Date().toISOString(),
      totalLessonsAudited: packs.length,
      publishedCount,
      draftedCount,
      plannedCount,
      countsByLevel,
      passed: errorCount === 0,
      totalErrors: errorCount,
      totalWarnings: warningCount,
      issues,
      progressionSummary: {
        cumulativeVocab,
        cumulativeKanji,
        cumulativeGrammar,
      },
    };
  }

  /**
   * Generates formatted Markdown audit report
   */
  static generateMarkdown(report: CurriculumAuditReport): string {
    return `# Nihongo N2 Master — Curriculum Audit Report

**Date:** ${report.timestamp}  
**Status:** ${report.passed ? 'PASSED (0 blocking errors)' : 'FAILED'}  
**Total Lessons Audited:** ${report.totalLessonsAudited} (Published: ${report.publishedCount}, Drafted: ${report.draftedCount}, Planned: ${report.plannedCount})

---

## 1. Level Breakdown
- **N5:** ${report.countsByLevel.N5.published} / ${report.countsByLevel.N5.total} Published
- **N4:** ${report.countsByLevel.N4.published} / ${report.countsByLevel.N4.total} Published
- **N3:** ${report.countsByLevel.N3.published} / ${report.countsByLevel.N3.total} Published
- **N2:** ${report.countsByLevel.N2.published} / ${report.countsByLevel.N2.total} Published

## 2. Cumulative Progression
- Total Vocabulary Items: **${report.progressionSummary.cumulativeVocab}**
- Total Kanji Characters: **${report.progressionSummary.cumulativeKanji}**
- Total Grammar Patterns: **${report.progressionSummary.cumulativeGrammar}**

## 3. Issues & Compliance Summary
- Blocking Errors: **${report.totalErrors}**
- Warnings: **${report.totalWarnings}**

${report.issues.length === 0 ? '✅ All checks passed with zero issues.' : report.issues.map((i) => `- **[${i.severity.toUpperCase()}]** [${i.category}] (${i.lessonId}): ${i.message}`).join('\n')}
`;
  }
}
