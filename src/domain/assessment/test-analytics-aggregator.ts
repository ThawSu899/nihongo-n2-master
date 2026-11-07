import { db } from '../../data/db/dexie-db';
import { AssessmentResult, MasteryRecord, QuestionSkill } from '../models/types';
import { SkillScoreData } from '../../presentation/components/SkillRadarChart';

export interface AggregatedSkillPerformance {
  skill: QuestionSkill;
  label: string;
  scorePct: number;
  thresholdPct: number;
  testedCount: number;
  correctCount: number;
  status: 'mastered' | 'progressing' | 'needs_work';
  radarData: SkillScoreData;
}

export interface TestAnalyticsSummary {
  totalTests: number;
  averageScorePct: number;
  passCount: number;
  failCount: number;
  passRatePct: number;
  totalTimeMinutes: number;
  averageTimeMinutes: number;
  skills: AggregatedSkillPerformance[];
  strongestSkill: { skill: QuestionSkill; label: string; scorePct: number } | null;
  weakestSkill: { skill: QuestionSkill; label: string; scorePct: number } | null;
  recentTrends: Array<{
    id: string;
    takenAt: string;
    formattedDate: string;
    type: string;
    score: number;
    passed: boolean;
    durationMinutes: number;
  }>;
  recentAssessmentList: AssessmentResult[];
}

const SKILL_THRESHOLDS: Record<QuestionSkill, { label: string; threshold: number }> = {
  vocab: { label: 'Vocab', threshold: 90 },
  kanji: { label: 'Kanji', threshold: 85 },
  grammar: { label: 'Grammar', threshold: 85 },
  reading: { label: 'Reading', threshold: 80 },
  listening: { label: 'Listening', threshold: 80 },
};

export class TestAnalyticsAggregator {
  /**
   * Aggregates test results and mastery records into structured skill analytics
   */
  static async getAnalyticsSummary(): Promise<TestAnalyticsSummary> {
    const assessments: AssessmentResult[] = await db.assessments
      .orderBy('takenAt')
      .reverse()
      .toArray();

    const masteryRecords: MasteryRecord[] = await db.mastery_records.toArray();

    // Accumulators per skill
    const skillStats: Record<
      QuestionSkill,
      {
        totalQuestions: number;
        correctQuestions: number;
        masterySum: number;
        masteryCount: number;
      }
    > = {
      vocab: { totalQuestions: 0, correctQuestions: 0, masterySum: 0, masteryCount: 0 },
      kanji: { totalQuestions: 0, correctQuestions: 0, masterySum: 0, masteryCount: 0 },
      grammar: { totalQuestions: 0, correctQuestions: 0, masterySum: 0, masteryCount: 0 },
      reading: { totalQuestions: 0, correctQuestions: 0, masterySum: 0, masteryCount: 0 },
      listening: { totalQuestions: 0, correctQuestions: 0, masterySum: 0, masteryCount: 0 },
    };

    // Aggregate from formal assessment history
    assessments.forEach((asmt) => {
      if (asmt.bySkill) {
        (Object.keys(SKILL_THRESHOLDS) as QuestionSkill[]).forEach((skill) => {
          const sData = asmt.bySkill[skill];
          if (sData) {
            skillStats[skill].totalQuestions += sData.total || 0;
            skillStats[skill].correctQuestions += sData.correct || 0;
          }
        });
      }
    });

    // Also blend lesson test mastery records
    masteryRecords.forEach((rec) => {
      if (rec.scores) {
        (Object.keys(SKILL_THRESHOLDS) as QuestionSkill[]).forEach((skill) => {
          const sc = rec.scores[skill];
          if (typeof sc === 'number' && !isNaN(sc)) {
            skillStats[skill].masterySum += sc;
            skillStats[skill].masteryCount += 1;
          }
        });
      }
      if (rec.evidenceCounts) {
        (Object.keys(SKILL_THRESHOLDS) as QuestionSkill[]).forEach((skill) => {
          const count = rec.evidenceCounts[skill];
          if (typeof count === 'number') {
            skillStats[skill].totalQuestions += count;
            const score = rec.scores?.[skill] ?? 0;
            skillStats[skill].correctQuestions += Math.round(count * score);
          }
        });
      }
    });

    // Compute skill percentages
    const skillsList: AggregatedSkillPerformance[] = (
      Object.keys(SKILL_THRESHOLDS) as QuestionSkill[]
    ).map((skill) => {
      const config = SKILL_THRESHOLDS[skill];
      const stats = skillStats[skill];

      let scorePct = 0;
      if (stats.totalQuestions > 0) {
        scorePct = Math.round((stats.correctQuestions / stats.totalQuestions) * 100);
      } else if (stats.masteryCount > 0) {
        scorePct = Math.round((stats.masterySum / stats.masteryCount) * 100);
      } else {
        // Initial baseline for learners starting out
        scorePct = 0;
      }

      // Clamp between 0 and 100
      scorePct = Math.max(0, Math.min(100, scorePct));

      let status: 'mastered' | 'progressing' | 'needs_work' = 'progressing';
      if (scorePct >= config.threshold) {
        status = 'mastered';
      } else if (scorePct < config.threshold * 0.75) {
        status = 'needs_work';
      }

      const radarData: SkillScoreData = {
        skill,
        label: config.label,
        scorePct,
        thresholdPct: config.threshold,
        testedCount: stats.totalQuestions,
        correctCount: stats.correctQuestions,
      };

      return {
        skill,
        label: config.label,
        scorePct,
        thresholdPct: config.threshold,
        testedCount: stats.totalQuestions,
        correctCount: stats.correctQuestions,
        status,
        radarData,
      };
    });

    // Find strongest and weakest skills
    const sortedSkills = [...skillsList].sort((a, b) => b.scorePct - a.scorePct);
    const strongestSkill = sortedSkills.length > 0 ? {
      skill: sortedSkills[0].skill,
      label: sortedSkills[0].label,
      scorePct: sortedSkills[0].scorePct,
    } : null;

    const weakestSkill = sortedSkills.length > 0 ? {
      skill: sortedSkills[sortedSkills.length - 1].skill,
      label: sortedSkills[sortedSkills.length - 1].label,
      scorePct: sortedSkills[sortedSkills.length - 1].scorePct,
    } : null;

    // Test metrics calculation
    const totalTests = assessments.length;
    const totalScore = assessments.reduce((acc, a) => acc + (a.score || 0), 0);
    const averageScorePct = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

    const passCount = assessments.filter((a) => a.passed).length;
    const failCount = totalTests - passCount;
    const passRatePct = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

    const totalSeconds = assessments.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
    const totalTimeMinutes = Math.round(totalSeconds / 60);
    const averageTimeMinutes = totalTests > 0 ? Math.round(totalTimeMinutes / totalTests) : 0;

    // Recent test trends (chronological for graph, up to 10 latest)
    const chronoAssessments = [...assessments].reverse().slice(-10);
    const recentTrends = chronoAssessments.map((a) => ({
      id: a.id,
      takenAt: a.takenAt,
      formattedDate: new Date(a.takenAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      type: a.type,
      score: a.score,
      passed: a.passed,
      durationMinutes: Math.max(1, Math.round((a.durationSeconds || 0) / 60)),
    }));

    return {
      totalTests,
      averageScorePct,
      passCount,
      failCount,
      passRatePct,
      totalTimeMinutes,
      averageTimeMinutes,
      skills: skillsList,
      strongestSkill,
      weakestSkill,
      recentTrends,
      recentAssessmentList: assessments.slice(0, 10),
    };
  }

  /**
   * Helper to seed a sample diagnostic test if learner has no prior tests
   * so they can immediately test out and see realistic analytics.
   */
  static async seedSampleDiagnosticTestIfEmpty(): Promise<boolean> {
    const count = await db.assessments.count();
    if (count > 0) return false;

    // Create a realistic baseline assessment for demonstration
    const sample: AssessmentResult = {
      id: `asmt_initial_${Date.now()}`,
      type: 'weekly',
      level: 'N5',
      takenAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      score: 82,
      accuracy: 0.82,
      totalQuestions: 32,
      correctQuestions: 26,
      durationSeconds: 1140, // 19 minutes
      bySkill: {
        vocab: { correct: 9, total: 10, accuracy: 0.90 },
        kanji: { correct: 5, total: 6, accuracy: 0.83 },
        grammar: { correct: 5, total: 6, accuracy: 0.83 },
        reading: { correct: 4, total: 5, accuracy: 0.80 },
        listening: { correct: 3, total: 5, accuracy: 0.60 },
      },
      passed: false, // failed listening threshold
      weakSkills: ['listening'],
      failedItemIds: ['n5_l01_sent_04', 'n5_l01_vocab_08'],
    };

    await db.assessments.add(sample);
    return true;
  }
}
