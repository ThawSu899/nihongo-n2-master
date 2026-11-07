import { NihongoMasterDB } from '../../data/db/dexie-db';
import { QuestionSkill } from '../models/types';
import { getLogicalDate, getLogicalDayKey, formatLogicalDay } from './streak-calculator';

export interface Rolling14DayMetrics {
  rollingAccuracy14d: Record<QuestionSkill, { correct: number; total: number }>;
  recentDaysMissed: number;
  totalQuestions: number;
  totalCorrect: number;
}

const SUPPORTED_SKILLS: QuestionSkill[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening'];

/**
 * Calculates 14-day rolling question accuracy across all 5 skills and computes
 * recent days missed from actual IndexedDB assessments, events, and study sessions.
 */
export async function get14DayRollingAccuracy(
  dbInstance: NihongoMasterDB,
  rolloverHour = 4,
  referenceDate: Date = new Date()
): Promise<Rolling14DayMetrics> {
  const cutoffMs = referenceDate.getTime() - 14 * 24 * 60 * 60 * 1000;

  const rollingAccuracy14d: Record<QuestionSkill, { correct: number; total: number }> = {
    vocab: { correct: 0, total: 0 },
    kanji: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
  };

  // 1. Aggregate from formal assessments (Mock exams, weekly tests, drill tests) taken in last 14 days
  try {
    const assessments = await dbInstance.assessments.toArray();
    for (const asmt of assessments) {
      if (!asmt.takenAt) continue;
      const takenMs = new Date(asmt.takenAt).getTime();
      if (takenMs < cutoffMs) continue;

      if (asmt.bySkill) {
        for (const skill of SUPPORTED_SKILLS) {
          const sData = asmt.bySkill[skill];
          if (sData) {
            rollingAccuracy14d[skill].correct += sData.correct || 0;
            rollingAccuracy14d[skill].total += sData.total || 0;
          }
        }
      }
    }
  } catch {
    // Non-fatal if assessments table is empty or inaccessible
  }

  // 2. Aggregate from granular lesson question attempts (study_events) in last 14 days
  try {
    const events = await dbInstance.study_events.toArray();
    for (const evt of events) {
      if (evt.type !== 'exercise_attempted' || !evt.timestamp) continue;
      const evtMs = new Date(evt.timestamp).getTime();
      if (evtMs < cutoffMs) continue;

      const data = evt.data;
      if (data && data.skill && typeof data.isCorrect === 'boolean') {
        const skill = data.skill as QuestionSkill;
        if (SUPPORTED_SKILLS.includes(skill)) {
          rollingAccuracy14d[skill].total += 1;
          if (data.isCorrect) {
            rollingAccuracy14d[skill].correct += 1;
          }
        }
      }
    }
  } catch {
    // Non-fatal if study_events table is empty or inaccessible
  }

  // 3. Compute consecutive days missed prior to the current logical day
  let recentDaysMissed = 0;
  try {
    const sessions = await dbInstance.study_sessions.toArray();
    const activeDays = new Set<string>();

    for (const session of sessions) {
      if (!session.startedAt) continue;
      if (session.durationSeconds !== undefined && session.durationSeconds <= 0 && session.exercisesCompleted <= 0) {
        continue;
      }
      activeDays.add(getLogicalDayKey(session.startedAt, rolloverHour));
    }

    if (activeDays.size > 0) {
      const refShifted = getLogicalDate(referenceDate, rolloverHour);
      const curDate = new Date(refShifted.getFullYear(), refShifted.getMonth(), refShifted.getDate());
      const prevDate = new Date(curDate);
      prevDate.setDate(prevDate.getDate() - 1);

      // Count consecutive inactive days backwards from yesterday (capped at 14)
      const checkDate = new Date(prevDate);
      while (recentDaysMissed < 14 && !activeDays.has(formatLogicalDay(checkDate))) {
        recentDaysMissed++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  } catch {
    // Non-fatal fallback
  }

  let totalQuestions = 0;
  let totalCorrect = 0;
  for (const skill of SUPPORTED_SKILLS) {
    totalQuestions += rollingAccuracy14d[skill].total;
    totalCorrect += rollingAccuracy14d[skill].correct;
  }

  return {
    rollingAccuracy14d,
    recentDaysMissed,
    totalQuestions,
    totalCorrect,
  };
}
