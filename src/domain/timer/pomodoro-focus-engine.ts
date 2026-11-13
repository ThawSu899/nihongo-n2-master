export interface PomodoroSession {
  id: string;
  completedAt: string;
  durationMinutes: number;
  blockId: string;
  dateString: string;
}

export interface PomodoroMilestone {
  burmese: string;
  english: string;
  badge: string;
}

const POMODORO_STORAGE_KEY = 'nihongo_pomodoro_sessions_v1';

export class PomodoroFocusEngine {
  /**
   * Get all stored Pomodoro focus sessions.
   */
  static getSessions(): PomodoroSession[] {
    try {
      const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Get today's completed session count (streak for the day).
   */
  static getTodayStreak(): number {
    const today = new Date().toISOString().slice(0, 10);
    const sessions = this.getSessions();
    return sessions.filter((s) => s.dateString === today).length;
  }

  /**
   * Log a completed Pomodoro focus session and calculate updated streak.
   */
  static logCompletedSession(
    durationMinutes: number = 25,
    blockId: string = 'block_pomodoro_sprint'
  ): {
    session: PomodoroSession;
    streakCount: number;
    milestone: PomodoroMilestone;
  } {
    const now = new Date();
    const dateString = now.toISOString().slice(0, 10);
    const session: PomodoroSession = {
      id: `pomodoro_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
      completedAt: now.toISOString(),
      durationMinutes,
      blockId,
      dateString,
    };

    const existing = this.getSessions();
    const updated = [session, ...existing].slice(0, 100); // keep recent 100

    try {
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // quota or local storage disabled
    }

    const streakCount = updated.filter((s) => s.dateString === dateString).length;
    const milestone = this.getMilestoneCelebration(streakCount);

    return { session, streakCount, milestone };
  }

  /**
   * Get milestone celebration message in Burmese and English.
   */
  static getMilestoneCelebration(streak: number): PomodoroMilestone {
    if (streak <= 0) {
      return {
        burmese: '၂၅ မိနစ် အာရုံစိုက် စာလေ့လာမှုကို စတင်လိုက်ပါ!',
        english: 'Ready to start your 25-minute JLPT focus sprint!',
        badge: '🎯 Ready',
      };
    }
    if (streak === 1) {
      return {
        burmese: '🎯 ပထမဆုံး ၂၅ မိနစ် အာရုံစိုက်ချိန် အောင်မြင်စွာ ပြီးမြောက်ပါပြီ! (၅ မိနစ် အနားယူပါ)',
        english: '1st 25-minute Pomodoro sprint completed! Take a 5-min break.',
        badge: '🎯 1x Sprint',
      };
    }
    if (streak === 2) {
      return {
        burmese: '🔥 ၂ ကြိမ်ဆက် အာရုံစိုက်မှု အထူးကောင်းမွန်နေပါသည်! ဇွဲမလျှော့ပါနှင့်။',
        english: '2 consecutive sprints completed! Momentum is building.',
        badge: '🔥 2x Streak',
      };
    }
    if (streak === 3) {
      return {
        burmese: '⚡ ၃ ကြိမ်ဆက် ဇွဲရှိမှု စံချိန်တင်နေပါပြီ! JLPT အောင်မှတ်ဆီသို့ နီးကပ်လာပါပြီ။',
        english: '3 consecutive sprints completed! Superb consistency.',
        badge: '⚡ 3x Streak',
      };
    }
    return {
      burmese: `🏆 ${streak} ကြိမ်ဆက် စူပါ အာရုံစိုက်မှု အထွတ်အထိပ် စံချိန်တင်ပါပြီ! ၁၅-၃၀ မိနစ် အနားယူရန် အကြံပြုပါသည်။`,
      english: `${streak} consecutive sprints completed! Outstanding mastery streak! Take a longer break.`,
      badge: `🏆 ${streak}x Master Streak`,
    };
  }
}
