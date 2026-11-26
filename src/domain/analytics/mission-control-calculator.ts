export interface MissionControlReadinessParams {
  remainingLessons: number;
  daysRemaining: number;
  targetMinutesPerLesson?: number; // default 60 minutes
  configuredDailyTargetMinutes?: number; // default 360 minutes
}

export interface MissionControlReadinessResult {
  requiredDailyVelocity: number; // e.g. 1.25 lessons/day
  estimatedDailyStudyMinutes: number; // e.g. 75 min
  configuredDailyTargetMinutes: number; // e.g. 360 min
  isOnTrack: boolean;
  status: 'PASSING' | 'BOOST';
  readinessStatusEn: 'On Track' | 'Accelerate';
  readinessStatusMy: 'အချိန်မီနေသည်' | 'အရှိန်မြှင့်ရန်လိုသည်';
  readinessTextCombined: string;
  explanationEn: string;
  explanationMy: string;
}

/**
 * Pure calculation of JLPT Mission Control Readiness and Required Daily Velocity.
 *
 * Mathematical Criteria:
 * - requiredDailyVelocity = remainingLessons / max(1, daysRemaining)
 * - estimatedDailyStudyMinutes = round(requiredDailyVelocity * targetMinutesPerLesson)
 *
 * Status Thresholds:
 * - PASSING (On Track): remainingLessons === 0 (all syllabus completed) OR
 *   (daysRemaining > 0 AND requiredDailyVelocity <= 1.0 lesson/day [≤ 60 min/day pacing]).
 * - BOOST (Accelerate): daysRemaining <= 0 with uncompleted lessons, OR
 *   requiredDailyVelocity > 1.0 lesson/day (> 60 min/day pacing).
 *
 * The pacing requirement is strictly separate from the user's configured immersion
 * daily target (e.g. 360 minutes / 6 hours).
 */
export function calculateMissionControlReadiness(
  params: MissionControlReadinessParams
): MissionControlReadinessResult {
  const {
    remainingLessons,
    daysRemaining,
    targetMinutesPerLesson = 60,
    configuredDailyTargetMinutes = 360,
  } = params;

  const safeDays = Math.max(0, daysRemaining);
  const requiredDailyVelocity =
    remainingLessons === 0 ? 0 : remainingLessons / Math.max(1, safeDays);
  const estimatedDailyStudyMinutes = Math.round(
    requiredDailyVelocity * targetMinutesPerLesson
  );

  const isOnTrack =
    remainingLessons === 0 || (safeDays > 0 && requiredDailyVelocity <= 1.0);

  const status: 'PASSING' | 'BOOST' = isOnTrack ? 'PASSING' : 'BOOST';
  const readinessStatusEn = isOnTrack ? 'On Track' : 'Accelerate';
  const readinessStatusMy = isOnTrack ? 'အချိန်မီနေသည်' : 'အရှိန်မြှင့်ရန်လိုသည်';
  const readinessTextCombined = `${readinessStatusEn} / ${readinessStatusMy}`;

  let explanationEn: string;
  let explanationMy: string;

  if (remainingLessons === 0) {
    explanationEn =
      'All syllabus units completed. You are in final exam revision mode.';
    explanationMy =
      'သင်ရိုးသင်ခန်းစာအားလုံး ပြီးမြောက်ပြီးဖြစ်၍ ပြန်လှန်လေ့ကျင့်မှု အဆင့်သို့ ရောက်ရှိနေပါသည်။';
  } else if (safeDays === 0) {
    explanationEn = `BOOST Critical: Target exam date reached with ${remainingLessons} uncompleted lessons. Urgent acceleration required.`;
    explanationMy = `အရေးပေါ် အရှိန်မြှင့်ရန်လိုသည် (BOOST): စာမေးပွဲရက်သို့ ရောက်ရှိနေသော်လည်း သင်ခန်းစာ ${remainingLessons} ခု ကျန်ရှိနေသေးပါသည်။`;
  } else if (isOnTrack) {
    explanationEn = `PASSING Pacing: Required velocity is ${requiredDailyVelocity.toFixed(
      2
    )} lessons/day (≤ 1.0 threshold), requiring ~${estimatedDailyStudyMinutes} min/day. Pacing is aligned with target exam date.`;
    explanationMy = `သတ်မှတ်နှုန်းမှာ တစ်နေ့လျှင် ${requiredDailyVelocity.toFixed(
      2
    )} သင်ခန်းစာ (~${estimatedDailyStudyMinutes} မိနစ်) ဖြစ်ပြီး စာမေးပွဲရက်အတွက် အချိန်မီနေပါသည်။`;
  } else {
    explanationEn = `BOOST Required: Required velocity of ${requiredDailyVelocity.toFixed(
      2
    )} lessons/day exceeds sustainable 1.0 lesson/day baseline (~${estimatedDailyStudyMinutes} min/day needed vs. standard 60m). Increase daily study blocks to stay on track.`;
    explanationMy = `အရှိန်မြှင့်ရန်လိုသည် (BOOST): တစ်နေ့လျှင် ${requiredDailyVelocity.toFixed(
      2
    )} သင်ခန်းစာ (~${estimatedDailyStudyMinutes} မိနစ်) လိုအပ်နေပြီး ပုံမှန်သတ်မှတ်နှုန်းထက် ကျော်လွန်နေပါသည်။ နေ့စဉ်လေ့လာချိန်ကို တိုးမြှင့်ပါ။`;
  }

  return {
    requiredDailyVelocity,
    estimatedDailyStudyMinutes,
    configuredDailyTargetMinutes,
    isOnTrack,
    status,
    readinessStatusEn,
    readinessStatusMy,
    readinessTextCombined,
    explanationEn,
    explanationMy,
  };
}
