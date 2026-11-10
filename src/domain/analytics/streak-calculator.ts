import { StudySessionRecord, NihongoMasterDB } from '../../data/db/dexie-db';

/**
 * Returns a date shifted backwards by `rolloverHour` hours.
 * For example, with rolloverHour=4, a session at 2026-10-23 03:00 AM
 * shifts backwards into 2026-10-22 23:00 PM (belonging to logical day 2026-10-22).
 */
export function getLogicalDate(dateInput: string | number | Date, rolloverHour = 4): Date {
  const d = new Date(dateInput);
  return new Date(d.getTime() - rolloverHour * 3600 * 1000);
}

/**
 * Formats a Date object to local YYYY-MM-DD.
 */
export function formatLogicalDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts any timestamp or ISO string into a logical study day string (YYYY-MM-DD),
 * respecting the day rollover hour (default 04:00 AM).
 */
export function getLogicalDayKey(dateInput: string | number | Date, rolloverHour = 4): string {
  return formatLogicalDay(getLogicalDate(dateInput, rolloverHour));
}

/**
 * Calculates the active consecutive daily study streak from a collection of study sessions.
 * 
 * Rules:
 * 1. Sessions before `rolloverHour` (default 04:00 AM) are credited to the previous calendar day.
 * 2. If the user studied on the current logical day, the streak counts consecutive days up to today.
 * 3. If the user has not yet studied on the current logical day, but studied yesterday (the previous logical day),
 *    the streak remains intact and active (counting consecutive days ending yesterday).
 * 4. If neither today nor yesterday has a recorded study session, the streak resets to 0.
 */
export function calculateDailyStudyStreak(
  sessions: StudySessionRecord[],
  rolloverHour = 4,
  referenceDate: Date = new Date()
): number {
  if (!sessions || sessions.length === 0) {
    return 0;
  }

  // Extract unique logical study days with valid sessions (duration > 0 or recorded session)
  const activeDays = new Set<string>();
  for (const session of sessions) {
    if (!session.startedAt) continue;
    // Count sessions that have duration or were saved
    if (session.durationSeconds !== undefined && session.durationSeconds <= 0 && session.exercisesCompleted <= 0) {
      continue;
    }
    const dayKey = getLogicalDayKey(session.startedAt, rolloverHour);
    activeDays.add(dayKey);
  }

  if (activeDays.size === 0) {
    return 0;
  }

  // Determine current logical date and previous logical date
  const refShifted = getLogicalDate(referenceDate, rolloverHour);
  const curDate = new Date(refShifted.getFullYear(), refShifted.getMonth(), refShifted.getDate());
  const todayKey = formatLogicalDay(curDate);

  const prevDate = new Date(curDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const yesterdayKey = formatLogicalDay(prevDate);

  if (activeDays.has(todayKey)) {
    // User studied today: count consecutive days backwards starting today
    let streak = 0;
    const checkDate = new Date(curDate);
    while (activeDays.has(formatLogicalDay(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  } else if (activeDays.has(yesterdayKey)) {
    // User has not studied today yet, but studied yesterday: streak is active
    let streak = 0;
    const checkDate = new Date(prevDate);
    while (activeDays.has(formatLogicalDay(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }

  // Neither today nor yesterday had study activity
  return 0;
}

/**
 * Recomputes the user's study streak from Dexie study sessions and persists
 * `studyStreakDays` to the user profile table in IndexedDB.
 */
export async function syncUserStudyStreak(
  dbInstance: NihongoMasterDB,
  rolloverHour = 4,
  referenceDate: Date = new Date()
): Promise<number> {
  const sessions = await dbInstance.study_sessions.toArray();
  const streak = calculateDailyStudyStreak(sessions, rolloverHour, referenceDate);

  try {
    const existing = await dbInstance.profile.get('current_user');
    if (existing) {
      if (existing.studyStreakDays !== streak) {
        await dbInstance.profile.update('current_user', { studyStreakDays: streak });
      }
    }
  } catch {
    // Non-fatal if profile store is temporarily unavailable
  }

  return streak;
}

/**
 * Computes the longest consecutive daily study streak from study sessions.
 */
export function calculateLongestStreak(
  sessions: StudySessionRecord[],
  rolloverHour = 4
): number {
  if (!sessions || sessions.length === 0) return 0;

  const dayKeys = new Set<string>();
  for (const session of sessions) {
    if (!session.startedAt) continue;
    if (
      session.durationSeconds !== undefined &&
      session.durationSeconds <= 0 &&
      session.exercisesCompleted <= 0
    ) {
      continue;
    }
    dayKeys.add(getLogicalDayKey(session.startedAt, rolloverHour));
  }

  if (dayKeys.size === 0) return 0;

  const sortedDays = Array.from(dayKeys).sort();
  let longest = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dayStr of sortedDays) {
    const parts = dayStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffMs = date.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }
    prevDate = date;
    if (currentRun > longest) {
      longest = currentRun;
    }
  }

  return longest;
}

export interface WeeklyHabitDay {
  day: string;
  date: string;
  completed: boolean;
  isToday: boolean;
  count: number;
}

/**
 * Returns a 7-day habit breakdown for the 7 logical days ending on referenceDate.
 */
export function getWeeklyHabitHistory(
  sessions: StudySessionRecord[],
  rolloverHour = 4,
  referenceDate: Date = new Date()
): WeeklyHabitDay[] {
  const dayCounts: Record<string, number> = {};
  for (const session of sessions) {
    if (!session.startedAt) continue;
    if (
      session.durationSeconds !== undefined &&
      session.durationSeconds <= 0 &&
      session.exercisesCompleted <= 0
    ) {
      continue;
    }
    const dayKey = getLogicalDayKey(session.startedAt, rolloverHour);
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + (session.exercisesCompleted || 1);
  }

  const refShifted = getLogicalDate(referenceDate, rolloverHour);
  const curDate = new Date(refShifted.getFullYear(), refShifted.getMonth(), refShifted.getDate());
  const todayKey = formatLogicalDay(curDate);

  const result: WeeklyHabitDay[] = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(curDate);
    d.setDate(d.getDate() - i);
    const key = formatLogicalDay(d);
    const dayName = daysOfWeek[d.getDay()];
    const count = dayCounts[key] || 0;

    result.push({
      day: dayName,
      date: key,
      completed: count > 0,
      isToday: key === todayKey,
      count,
    });
  }

  return result;
}
