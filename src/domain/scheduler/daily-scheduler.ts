import {
  DailyPlan,
  QuestionSkill,
  StudyBlock,
} from '../models/types';
import { Clock } from '../common/clock';

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

  // Construct the official schedule blocks
  // 07:30–07:45 Admin setup (not counted)
  // 07:45–08:45 Vocab + SRS
  // 09:00–10:00 Kanji
  // 10:15–11:15 Grammar
  // 12:00–13:00 Reading
  // 13:15–14:15 Listening + Shadowing
  // 14:30–15:30 Mastery Test
  // 15:30–15:45 Wrap-up (not counted)

  const blocks: StudyBlock[] = [
    {
      id: 'block_setup',
      title: 'Daily Setup & Goal Setting',
      startTime: '07:30',
      endTime: '07:45',
      plannedMinutes: 15,
      completedMinutes: 0,
      countsTowardGoal: false,
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
      status: 'pending',
      reason: 'End-of-day analytics and tomorrow preview',
    },
  ];

  return {
    date: clock.nowIso().substring(0, 10),
    targetMinutes,
    blocks,
    explanations,
    isRecoveryDay: isBacklogSevere,
    weakSkills,
    strongSkills,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimeOffset(startTime: string, minutesToAdd: number): string {
  const [hStr, mStr] = startTime.split(':');
  const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutesToAdd;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
