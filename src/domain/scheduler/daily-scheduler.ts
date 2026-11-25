import {
  DailyPlan,
  QuestionSkill,
  StudyBlock,
} from '../models/types';
import { Clock } from '../common/clock';

export interface WorkHoursConfig {
  enabled: boolean;
  start: string; // e.g. '09:00'
  end: string;   // e.g. '18:00'
}

export const WORK_HOURS_STORAGE_KEY = 'nihongo_work_hours';
export const DEFAULT_WORK_HOURS: WorkHoursConfig = {
  enabled: false,
  start: '09:00',
  end: '18:00',
};

export function getStoredWorkHours(): WorkHoursConfig {
  if (typeof globalThis.localStorage === 'undefined') return DEFAULT_WORK_HOURS;
  try {
    const raw = globalThis.localStorage.getItem(WORK_HOURS_STORAGE_KEY);
    if (!raw) return DEFAULT_WORK_HOURS;
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed?.enabled),
      start: typeof parsed?.start === 'string' ? parsed.start : DEFAULT_WORK_HOURS.start,
      end: typeof parsed?.end === 'string' ? parsed.end : DEFAULT_WORK_HOURS.end,
    };
  } catch {
    return DEFAULT_WORK_HOURS;
  }
}

export function saveStoredWorkHours(config: WorkHoursConfig): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(WORK_HOURS_STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nihongo_work_hours_updated', { detail: config }));
    }
  } catch (err) {
    console.warn('Failed to save work hours to localStorage:', err);
  }
}

export interface SchedulerInputState {
  level: string;
  currentLessonId: string;
  targetDailyMinutes: number; // default 360
  srsDueCount: number;
  srsAvgSecondsPerReview: number; // default 15
  srsDailyCap: number; // default 200
  recentDaysMissed: number;
  rollingAccuracy14d: Record<QuestionSkill, { correct: number; total: number }>;
  skillThresholds: Record<QuestionSkill, number>;
  workHours?: WorkHoursConfig;
}

export function buildDailyPlan(
  state: SchedulerInputState,
  clock: Clock
): DailyPlan {
  const targetMinutes = state.targetDailyMinutes || 360;
  const explanations: string[] = [];
  const weakSkills: QuestionSkill[] = [];
  const strongSkills: QuestionSkill[] = [];

  // Determine weak and strong skills
  const skills: QuestionSkill[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening'];

  skills.forEach((skill) => {
    const data = state.rollingAccuracy14d[skill] || { correct: 0, total: 0 };
    if (data.total >= 20) {
      const acc = data.correct / data.total;
      const target = state.skillThresholds[skill] || 0.85;
      if (acc < target) {
        weakSkills.push(skill);
      } else if (acc >= target + 0.05) {
        strongSkills.push(skill);
      }
    }
  });

  // Edge case 1: Massive Backlog recovery day
  const isBacklogSevere = state.srsDueCount > state.srsDailyCap;
  if (isBacklogSevere) {
    explanations.push(
      `Backlog Recovery Mode: You have ${state.srsDueCount} due cards (cap is ${state.srsDailyCap}). Today's blocks prioritize SRS reviews and weak-skill reinforcement to stabilize retention.`
    );
  }

  // Edge case 2: Welcome back after missed days
  if (state.recentDaysMissed >= 2) {
    explanations.push(
      `Welcome back! After ${state.recentDaysMissed} days away, study blocks are balanced with gentle pacing and SRS catching-up.`
    );
  }

  // Baseline time per skill (6 blocks x 60 min = 360 min)
  const skillMinutes: Record<QuestionSkill, number> = {
    vocab: 60,
    kanji: 60,
    grammar: 60,
    reading: 60,
    listening: 60,
  };
  let testBlockMinutes = 60;

  // Reserve SRS time within Vocab+SRS block
  const estSrsMins = Math.min(
    Math.round((state.srsDueCount * (state.srsAvgSecondsPerReview || 15)) / 60),
    Math.round(targetMinutes * 0.4)
  );

  // Dynamic skill reallocation based on 14d weakness
  if (weakSkills.length > 0 && strongSkills.length > 0 && !isBacklogSevere) {
    const weakSkill = weakSkills[0]; // focus on primary weak skill
    const strongSkill = strongSkills[0];
    const weakData = state.rollingAccuracy14d[weakSkill];
    const strongData = state.rollingAccuracy14d[strongSkill];

    const weakAcc = Math.round((weakData.correct / weakData.total) * 100);
    const weakTarget = Math.round((state.skillThresholds[weakSkill] || 0.85) * 100);

    const shiftMinutes = 15;
    skillMinutes[strongSkill] = Math.max(30, skillMinutes[strongSkill] - shiftMinutes);
    skillMinutes[weakSkill] = Math.min(120, skillMinutes[weakSkill] + shiftMinutes);

    explanations.push(
      `${capitalize(weakSkill)} +${shiftMinutes} min (${60}→${skillMinutes[weakSkill]}): your 14-day ${weakSkill} accuracy is ${weakAcc}% vs. an ${weakTarget}% target (${weakData.total} questions). Time reallocated from ${capitalize(strongSkill)} (−${shiftMinutes} min), which is performing above target.`
    );
  } else if (weakSkills.length === 0 && strongSkills.length === 0) {
    explanations.push(
      `Balanced Baseline Schedule: 6 core 60-minute blocks (360 min total) aligned with JLPT mastery distribution.`
    );
  }

  const resolvedWorkHours = state.workHours || getStoredWorkHours();
  const isWorkSchedule = Boolean(resolvedWorkHours?.enabled);
  let blocks: StudyBlock[] = [];

  if (isWorkSchedule && resolvedWorkHours) {
    const workStart = resolvedWorkHours.start || '09:00';
    const workEnd = resolvedWorkHours.end || '18:00';
    const morningStudyMinutes = skillMinutes.vocab + skillMinutes.kanji; // e.g. 120 min
    const setupMinutes = 15;
    const morningStart = formatTimeOffset(workStart, -(morningStudyMinutes + setupMinutes)); // e.g. 06:45

    const setupEnd = formatTimeOffset(morningStart, setupMinutes); // e.g. 07:00
    const vocabEnd = formatTimeOffset(setupEnd, skillMinutes.vocab); // e.g. 08:00
    const kanjiEnd = formatTimeOffset(vocabEnd, skillMinutes.kanji); // e.g. 09:00

    const eveningStart = formatTimeOffset(workEnd, 30); // 30 min commute/dinner buffer e.g. 18:30
    const grammarEnd = formatTimeOffset(eveningStart, skillMinutes.grammar); // e.g. 19:30
    const readingEnd = formatTimeOffset(grammarEnd, skillMinutes.reading); // e.g. 20:30
    const listeningEnd = formatTimeOffset(readingEnd, skillMinutes.listening); // e.g. 21:30
    const testEnd = formatTimeOffset(listeningEnd, testBlockMinutes); // e.g. 22:30
    const reviewEnd = formatTimeOffset(testEnd, 15); // e.g. 22:45

    explanations.push(
      `Work-Adaptive Schedule: 6 focused study blocks (360 min) are scheduled around your protected work hours (${workStart}–${workEnd}), with ${morningStudyMinutes}m before work and ${
        skillMinutes.grammar + skillMinutes.reading + skillMinutes.listening + testBlockMinutes
      }m in the evening.`
    );

    blocks = [
      {
        id: 'block_setup',
        title: 'Daily Setup & Goal Setting',
        startTime: morningStart,
        endTime: setupEnd,
        plannedMinutes: setupMinutes,
        completedMinutes: 0,
        countsTowardGoal: false,
        category: 'admin',
        status: 'pending',
        reason: 'Admin alignment and review queue check (before work)',
      },
      {
        id: 'block_vocab_srs',
        title: `Vocabulary + SRS (${estSrsMins > 0 ? `${estSrsMins}m SRS` : 'Study'})`,
        skill: 'vocab',
        startTime: setupEnd,
        endTime: vocabEnd,
        plannedMinutes: skillMinutes.vocab,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_kanji',
        title: 'Kanji in Context & Radicals',
        skill: 'kanji',
        startTime: vocabEnd,
        endTime: kanjiEnd,
        plannedMinutes: skillMinutes.kanji,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_work',
        title: `Work Hours (Protected: ${workStart}–${workEnd})`,
        startTime: workStart,
        endTime: workEnd,
        plannedMinutes: calculateDurationMinutes(workStart, workEnd),
        completedMinutes: 0,
        countsTowardGoal: false,
        category: 'work',
        status: 'pending',
        reason: 'Protected professional hours — zero study blocks scheduled',
      },
      {
        id: 'block_grammar',
        title: 'Grammar Patterns & Formations',
        skill: 'grammar',
        startTime: eveningStart,
        endTime: grammarEnd,
        plannedMinutes: skillMinutes.grammar,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_reading',
        title: 'Reading Comprehension',
        skill: 'reading',
        startTime: grammarEnd,
        endTime: readingEnd,
        plannedMinutes: skillMinutes.reading,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_listening',
        title: 'Listening & Shadowing',
        skill: 'listening',
        startTime: readingEnd,
        endTime: listeningEnd,
        plannedMinutes: skillMinutes.listening,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_test',
        title: 'Mastery Test & Targeted Remediation',
        startTime: listeningEnd,
        endTime: testEnd,
        plannedMinutes: testBlockMinutes,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
        reason: 'Timed test followed by weak item remediation',
      },
      {
        id: 'block_review',
        title: 'Daily Review & SRS Rollover Wrap-up',
        startTime: testEnd,
        endTime: reviewEnd,
        plannedMinutes: 15,
        completedMinutes: 0,
        countsTowardGoal: false,
        category: 'admin',
        status: 'pending',
        reason: 'End-of-day analytics and tomorrow preview',
      },
    ];
  } else {
    // Construct the standard immersion schedule blocks (07:30–15:45)
    // 07:30–07:45 Admin setup (not counted)
    // 07:45–08:45 Vocab + SRS
    // 09:00–10:00 Kanji
    // 10:15–11:15 Grammar
    // 12:00–13:00 Reading
    // 13:15–14:15 Listening + Shadowing
    // 14:30–15:30 Mastery Test
    // 15:30–15:45 Wrap-up (not counted)

    blocks = [
      {
        id: 'block_setup',
        title: 'Daily Setup & Goal Setting',
        startTime: '07:30',
        endTime: '07:45',
        plannedMinutes: 15,
        completedMinutes: 0,
        countsTowardGoal: false,
        category: 'admin',
        status: 'pending',
        reason: 'Admin alignment and review queue check',
      },
      {
        id: 'block_vocab_srs',
        title: `Vocabulary + SRS (${estSrsMins > 0 ? `${estSrsMins}m SRS` : 'Study'})`,
        skill: 'vocab',
        startTime: '07:45',
        endTime: formatTimeOffset('07:45', skillMinutes.vocab),
        plannedMinutes: skillMinutes.vocab,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_kanji',
        title: 'Kanji in Context & Radicals',
        skill: 'kanji',
        startTime: '09:00',
        endTime: formatTimeOffset('09:00', skillMinutes.kanji),
        plannedMinutes: skillMinutes.kanji,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_grammar',
        title: 'Grammar Patterns & Formations',
        skill: 'grammar',
        startTime: '10:15',
        endTime: formatTimeOffset('10:15', skillMinutes.grammar),
        plannedMinutes: skillMinutes.grammar,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_reading',
        title: 'Reading Comprehension',
        skill: 'reading',
        startTime: '12:00',
        endTime: formatTimeOffset('12:00', skillMinutes.reading),
        plannedMinutes: skillMinutes.reading,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_listening',
        title: 'Listening & Shadowing',
        skill: 'listening',
        startTime: '13:15',
        endTime: formatTimeOffset('13:15', skillMinutes.listening),
        plannedMinutes: skillMinutes.listening,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
      },
      {
        id: 'block_test',
        title: 'Mastery Test & Targeted Remediation',
        startTime: '14:30',
        endTime: formatTimeOffset('14:30', testBlockMinutes),
        plannedMinutes: testBlockMinutes,
        completedMinutes: 0,
        countsTowardGoal: true,
        category: 'focused_study',
        status: 'pending',
        reason: 'Timed test followed by weak item remediation',
      },
      {
        id: 'block_review',
        title: 'Daily Review & SRS Rollover Wrap-up',
        startTime: '15:30',
        endTime: '15:45',
        plannedMinutes: 15,
        completedMinutes: 0,
        countsTowardGoal: false,
        category: 'admin',
        status: 'pending',
        reason: 'End-of-day analytics and tomorrow preview',
      },
    ];
  }

  // Calculate distinct metrics: focused study vs admin time vs breaks
  const focusedMinutes = blocks
    .filter((b) => b.countsTowardGoal)
    .reduce((sum, b) => sum + b.plannedMinutes, 0);

  const adminMinutes = blocks
    .filter((b) => b.category === 'admin')
    .reduce((sum, b) => sum + b.plannedMinutes, 0);

  const firstBlockStart = blocks[0]?.startTime || '07:30';
  const lastBlockEnd = blocks[blocks.length - 1]?.endTime || '15:45';
  const totalElapsedMinutes = calculateDurationMinutes(firstBlockStart, lastBlockEnd);
  const breakMinutes = Math.max(0, totalElapsedMinutes - focusedMinutes - adminMinutes);

  return {
    date: clock.nowIso().substring(0, 10),
    targetMinutes,
    blocks,
    explanations,
    isRecoveryDay: isBacklogSevere,
    weakSkills,
    strongSkills,
    focusedMinutes,
    adminMinutes,
    breakMinutes,
    totalElapsedMinutes,
    scheduleMode: isWorkSchedule ? 'around_work' : 'standard',
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map((v) => parseInt(v, 10));
  const [eh, em] = endTime.split(':').map((v) => parseInt(v, 10));
  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) {
    endTotal += 24 * 60; // wraps past midnight
  }
  return endTotal - startTotal;
}

function formatTimeOffset(startTime: string, minutesToAdd: number): string {
  const [hStr, mStr] = startTime.split(':');
  let totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutesToAdd;
  if (totalMins < 0) {
    totalMins += 24 * 60;
  }
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
