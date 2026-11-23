import { SkillType, WeaknessFinding } from './weakness-diagnosis';

export interface PlannedActivity {
  id: string;
  title: string;
  titleMy: string;
  skill: SkillType;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  reason: string;
  reasonMy: string;
  completed: boolean;
  skipped: boolean;
  suggestedLessonId?: string;
}

export interface PersonalizedDailyStudyPlan {
  date: string; // YYYY-MM-DD
  targetMinutes: number;
  totalPlannedMinutes: number;
  completedMinutes: number;
  activities: PlannedActivity[];
  breakSuggestionMinutes: number;
  focusMessage: {
    en: string;
    my: string;
  };
}

export const DAILY_PLAN_STORAGE_KEY = 'nihongo_ai_daily_plan_v3';

/**
 * Builds a realistic, balanced, personalized daily study plan.
 * Allocates available study time across SRS reviews, weakness remediation, and current lesson work.
 */
export function buildPersonalizedStudyPlan(params: {
  targetMinutes?: number;
  dueSrsCount?: number;
  weaknesses?: WeaknessFinding[];
  currentLessonId?: string;
  targetLevel?: 'N5' | 'N4' | 'N3' | 'N2';
}): PersonalizedDailyStudyPlan {
  const targetMinutes = Math.max(15, params.targetMinutes || 30);
  const dueSrs = params.dueSrsCount || 0;
  const weaknesses = params.weaknesses || [];
  const level = params.targetLevel || 'N5';
  const lessonId = params.currentLessonId || 'n5.l01';

  const activities: PlannedActivity[] = [];
  let allocatedMinutes = 0;

  // 1. SRS Review Block (Always prioritized if reviews are due)
  if (dueSrs > 0) {
    const srsMinutes = Math.min(15, Math.max(5, Math.ceil(dueSrs * 0.4)));
    activities.push({
      id: `act_srs_${Date.now()}`,
      title: `SRS Flashcards Review (${dueSrs} due)`,
      titleMy: `SRS ဝေါဟာရနှင့် သဒ္ဒါ ကတ်များ ပြန်လှန်လေ့ကျင့်ခြင်း (${dueSrs} ခု)`,
      skill: 'vocabulary',
      priority: 'high',
      estimatedMinutes: srsMinutes,
      reason: `${dueSrs} cards are due for optimal spaced repetition memory retention.`,
      reasonMy: `မှတ်ဉာဏ်ခိုင်မာစေရန် အချိန်ကိုက်ပြန်လှန်လေ့ကျင့်ရမည့် ကတ် ${dueSrs} ခု ရှိပါသည်။`,
      completed: false,
      skipped: false,
    });
    allocatedMinutes += srsMinutes;
  }

  // 2. Confirmed Weakness Targeted Activity
  const confirmedWeakness = weaknesses.find((w) => w.classification === 'Confirmed Weakness');
  if (confirmedWeakness && allocatedMinutes < targetMinutes) {
    const remMinutes = Math.min(15, targetMinutes - allocatedMinutes);
    activities.push({
      id: `act_weakness_${Date.now()}`,
      title: `Remediate ${confirmedWeakness.skill.toUpperCase()}: ${confirmedWeakness.recommendedAction.slice(0, 40)}`,
      titleMy: `${confirmedWeakness.skill.toUpperCase()} အားနည်းချက် သီးသန့် လေ့ကျင့်မှု`,
      skill: confirmedWeakness.skill,
      priority: 'high',
      estimatedMinutes: remMinutes,
      reason: confirmedWeakness.evidence,
      reasonMy: `လေ့လာမှုမှတ်တမ်းအရ ${confirmedWeakness.skill} တွင် အမှားများနေသဖြင့် သီးသန့် အာရုံစိုက်ရန် လိုအပ်ပါသည်။`,
      completed: false,
      skipped: false,
      suggestedLessonId: confirmedWeakness.relevantLessonIds[0],
    });
    allocatedMinutes += remMinutes;
  }

  // 3. Current Lesson Progression
  if (allocatedMinutes < targetMinutes) {
    const lessonMinutes = Math.min(15, targetMinutes - allocatedMinutes);
    activities.push({
      id: `act_lesson_${Date.now()}`,
      title: `Study Lesson ${lessonId.toUpperCase()}`,
      titleMy: `သင်ခန်းစာ ${lessonId.toUpperCase()} အသစ် လေ့လာခြင်း`,
      skill: 'grammar',
      priority: 'medium',
      estimatedMinutes: lessonMinutes,
      reason: `Advance through core ${level} curriculum.`,
      reasonMy: `${level} သင်ရိုးညွှန်းတမ်း တိုးတက်စေရန် သင်ခန်းစာအသစ် လေ့လာပါ။`,
      completed: false,
      skipped: false,
      suggestedLessonId: lessonId,
    });
    allocatedMinutes += lessonMinutes;
  }

  // 4. AI Targeted Practice or Shadowing / Reading
  if (allocatedMinutes < targetMinutes) {
    const remaining = targetMinutes - allocatedMinutes;
    activities.push({
      id: `act_drill_${Date.now()}`,
      title: 'AI Interactive Quiz & Recall Drills',
      titleMy: 'AI ဉာဏ်စမ်း နှင့် အပြန်အလှန် လေ့ကျင့်ခန်းများ',
      skill: 'grammar',
      priority: 'low',
      estimatedMinutes: remaining,
      reason: 'Reinforce learned concepts with targeted adaptive questions.',
      reasonMy: 'သင်ယူပြီးသော အကြောင်းအရာများကို ဉာဏ်စမ်းမေးခွန်းများဖြင့် ပြန်လည်စစ်ဆေးပါ။',
      completed: false,
      skipped: false,
    });
    allocatedMinutes += remaining;
  }

  const breakMinutes = targetMinutes >= 45 ? 5 : 0;
  const today = new Date().toISOString().slice(0, 10);

  return {
    date: today,
    targetMinutes,
    totalPlannedMinutes: allocatedMinutes,
    completedMinutes: 0,
    activities,
    breakSuggestionMinutes: breakMinutes,
    focusMessage: {
      en: `Today focus: ${confirmedWeakness ? `${confirmedWeakness.skill.toUpperCase()} remediation` : 'Steady curriculum progression'} with ${allocatedMinutes} planned minutes.`,
      my: `ယနေ့ အဓိကရည်မှန်းချက်: ${confirmedWeakness ? `${confirmedWeakness.skill.toUpperCase()} အားနည်းချက် ဖြည့်ဆည်းခြင်း` : 'ပုံမှန် သင်ရိုးတိုးတက်မှု'} (စုစုပေါင်း ${allocatedMinutes} မိနစ်)`,
    },
  };
}

/**
 * Loads the current daily plan from localStorage, or generates a fresh one if missing or outdated.
 */
export function loadPersistedDailyPlan(params: {
  targetMinutes?: number;
  dueSrsCount?: number;
  weaknesses?: WeaknessFinding[];
  currentLessonId?: string;
  targetLevel?: 'N5' | 'N4' | 'N3' | 'N2';
}): PersonalizedDailyStudyPlan {
  const today = new Date().toISOString().slice(0, 10);
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(DAILY_PLAN_STORAGE_KEY);
      if (stored) {
        const parsed: PersonalizedDailyStudyPlan = JSON.parse(stored);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch {}
  }

  const fresh = buildPersonalizedStudyPlan(params);
  savePersistedDailyPlan(fresh);
  return fresh;
}

/**
 * Persists an edited study plan to localStorage.
 */
export function savePersistedDailyPlan(plan: PersonalizedDailyStudyPlan): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch (err) {
    console.warn('[StudyPlanner] Failed to save daily plan:', err);
  }
}

/**
 * Toggles an activity's completed state and recalculates completed minutes.
 */
export function toggleActivityCompletion(
  plan: PersonalizedDailyStudyPlan,
  activityId: string,
  completed?: boolean
): PersonalizedDailyStudyPlan {
  const updatedActivities = plan.activities.map((a) => {
    if (a.id === activityId) {
      const nextCompleted = completed !== undefined ? completed : !a.completed;
      return { ...a, completed: nextCompleted };
    }
    return a;
  });

  const completedMinutes = updatedActivities
    .filter((a) => a.completed)
    .reduce((sum, a) => sum + a.estimatedMinutes, 0);

  return {
    ...plan,
    activities: updatedActivities,
    completedMinutes,
  };
}

/**
 * Toggles or marks an activity as skipped.
 */
export function toggleActivitySkipped(
  plan: PersonalizedDailyStudyPlan,
  activityId: string,
  skipped = true
): PersonalizedDailyStudyPlan {
  const updatedActivities = plan.activities.map((a) => {
    if (a.id === activityId) {
      return { ...a, skipped };
    }
    return a;
  });

  return {
    ...plan,
    activities: updatedActivities,
  };
}
