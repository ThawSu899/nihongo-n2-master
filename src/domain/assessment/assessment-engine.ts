import {
  AssessmentResult,
  AssessmentType,
  LessonPack,
  N2ReadinessMetric,
  Question,
  QuestionSkill,
} from '../models/types';
import { Clock } from '../common/clock';

export interface AssessmentBlueprint {
  type: AssessmentType;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  title: string;
  sectionTargets: Record<QuestionSkill, number>;
  timeLimitMinutes?: number;
  passOverallThreshold: number; // default 0.80
  passSectionThreshold: number; // default 0.65
}

export class AssessmentEngine {
  constructor(private clock: Clock) {}

  /**
   * Builds an assessment blueprint for weekly, monthly, or full level tests
   */
  getBlueprint(type: AssessmentType, level: 'N5' | 'N4' | 'N3' | 'N2'): AssessmentBlueprint {
    switch (type) {
      case 'weekly':
        return {
          type: 'weekly',
          level,
          title: `${level} Weekly Review Assessment`,
          sectionTargets: {
            vocab: 10,
            kanji: 6,
            grammar: 6,
            reading: 5,
            listening: 5,
          },
          timeLimitMinutes: 45,
          passOverallThreshold: 0.75,
          passSectionThreshold: 0.60,
        };
      case 'monthly':
        return {
          type: 'monthly',
          level,
          title: `${level} Monthly Synthesis Assessment`,
          sectionTargets: {
            vocab: 15,
            kanji: 10,
            grammar: 10,
            reading: 8,
            listening: 8,
          },
          timeLimitMinutes: 75,
          passOverallThreshold: 0.80,
          passSectionThreshold: 0.65,
        };
      case 'level':
        return {
          type: 'level',
          level,
          title: `JLPT ${level} Comprehensive Level Readiness Test`,
          sectionTargets: {
            vocab: 20,
            kanji: 15,
            grammar: 15,
            reading: 10,
            listening: 10,
          },
          timeLimitMinutes: 90,
          passOverallThreshold: 0.80,
          passSectionThreshold: 0.65,
        };
    }
  }

  /**
   * Evaluates an assessment attempt against blueprint thresholds
   */
  evaluateAssessment(
    blueprint: AssessmentBlueprint,
    answers: Array<{ question: Question; isCorrect: boolean }>,
    durationSeconds: number,
    priorResult?: AssessmentResult
  ): AssessmentResult {
    const totalQuestions = answers.length;
    const correctQuestions = answers.filter((a) => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) / 100 : 0;
    const score = Math.round(accuracy * 100);

    const bySkill: Record<QuestionSkill, { correct: number; total: number; accuracy: number }> = {
      vocab: { correct: 0, total: 0, accuracy: 0 },
      kanji: { correct: 0, total: 0, accuracy: 0 },
      grammar: { correct: 0, total: 0, accuracy: 0 },
      reading: { correct: 0, total: 0, accuracy: 0 },
      listening: { correct: 0, total: 0, accuracy: 0 },
    };

    const failedItemIds: string[] = [];
    const weakSkills: QuestionSkill[] = [];

    answers.forEach(({ question, isCorrect }) => {
      bySkill[question.skill].total += 1;
      if (isCorrect) {
        bySkill[question.skill].correct += 1;
      } else {
        failedItemIds.push(...question.linkedItemIds);
      }
    });

    let allSectionsPassed = true;
    (Object.keys(bySkill) as QuestionSkill[]).forEach((skill) => {
      const data = bySkill[skill];
      data.accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) / 100 : 0;
      if (data.accuracy < blueprint.passSectionThreshold) {
        weakSkills.push(skill);
        allSectionsPassed = false;
      }
    });

    const passed = accuracy >= blueprint.passOverallThreshold && allSectionsPassed;

    let comparisonWithPrior: AssessmentResult['comparisonWithPrior'] = undefined;
    if (priorResult) {
      comparisonWithPrior = {
        scoreDiff: score - priorResult.score,
        accuracyDiff: Math.round((accuracy - priorResult.accuracy) * 100) / 100,
        speedDiff: Math.round(durationSeconds - priorResult.durationSeconds),
      };
    }

    return {
      id: `asmt_${this.clock.nowMs()}_${Math.random().toString(36).substring(2, 7)}`,
      type: blueprint.type,
      level: blueprint.level,
      takenAt: this.clock.nowIso(),
      score,
      accuracy,
      totalQuestions,
      correctQuestions,
      durationSeconds,
      bySkill,
      passed,
      weakSkills,
      failedItemIds: Array.from(new Set(failedItemIds)),
      comparisonWithPrior,
    };
  }

  /**
   * Pure calculation of JLPT N2 Learning Readiness
   */
  calculateReadiness(params: {
    totalCurriculumLessons: number; // 174
    masteredLessonsCount: number;
    retainedLessonsCount: number;
    srs30DayRetention: number;
    recentWeeklyTestAccuracies: number[]; // e.g. [0.82, 0.88]
    skillRollingAccuracies: Record<QuestionSkill, number>;
    srsBacklogCount: number;
    srsDailyCap: number;
    levelTestPassed: boolean;
  }): N2ReadinessMetric {
    const lessonMasteryPct = Math.round((params.masteredLessonsCount / Math.max(1, params.totalCurriculumLessons)) * 100);
    const lessonRetentionPct = Math.round((params.retainedLessonsCount / Math.max(1, params.totalCurriculumLessons)) * 100);
    const srs30DayRetentionPct = Math.round(params.srs30DayRetention * 100);

    const weeklyTestsAvgPct =
      params.recentWeeklyTestAccuracies.length > 0
        ? Math.round(
            (params.recentWeeklyTestAccuracies.reduce((a, b) => a + b, 0) /
              params.recentWeeklyTestAccuracies.length) *
              100
          )
        : 0;

    const srsBacklogClean = params.srsBacklogCount <= params.srsDailyCap;

    // Benchmark targets: lessonMastery: >= 90%, lessonRetention: >= 50%, srs30Day: >= 85%, weeklyTests: >= 75%, levelTest: pass
    const masteryScore = Math.min(100, (lessonMasteryPct / 90) * 100);
    const retentionScore = Math.min(100, (lessonRetentionPct / 50) * 100);
    const srsScore = Math.min(100, (srs30DayRetentionPct / 85) * 100);
    const testScore = Math.min(100, (weeklyTestsAvgPct / 75) * 100);
    const levelScore = params.levelTestPassed ? 100 : 0;

    // Overall readiness weighted index against JLPT benchmarks
    const overallReadinessPct = Math.min(
      100,
      Math.round(
        masteryScore * 0.30 +
        retentionScore * 0.20 +
        srsScore * 0.20 +
        testScore * 0.15 +
        levelScore * 0.15
      )
    );

    let status: N2ReadinessMetric['status'] = 'not_ready';
    if (
      lessonMasteryPct >= 90 &&
      lessonRetentionPct >= 50 &&
      srs30DayRetentionPct >= 85 &&
      weeklyTestsAvgPct >= 75 &&
      params.levelTestPassed &&
      srsBacklogClean
    ) {
      status = 'ready';
    } else if (overallReadinessPct >= 70) {
      status = 'approaching_readiness';
    } else if (overallReadinessPct >= 30) {
      status = 'progressing';
    }

    return {
      lessonMasteryPct,
      lessonRetentionPct,
      srs30DayRetentionPct,
      weeklyTestsAvgPct,
      skillRollingAccuracies: params.skillRollingAccuracies,
      srsBacklogCount: params.srsBacklogCount,
      levelTestPassed: params.levelTestPassed,
      overallReadinessPct,
      status,
      disclaimer: 'Learning readiness indicator — not a prediction of actual JLPT results.',
    };
  }
}
