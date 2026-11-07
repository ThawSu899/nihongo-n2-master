import { StudyBlock } from '../models/types';

export interface ReminderNotification {
  id: string;
  type:
    | 'study_start'
    | 'next_block'
    | 'break_time'
    | 'srs_due'
    | 'mastery_test'
    | 'daily_review'
    | 'evening_nudge';
  title: string;
  message: string;
  scheduledTime: string; // HH:mm or ISO
  channel: 'in_app' | 'browser' | 'calendar';
}

export interface ReminderChannel {
  send(notification: ReminderNotification): Promise<boolean>;
  isSupported(): boolean;
  requestPermission(): Promise<boolean>;
}

export class InAppReminderChannel implements ReminderChannel {
  private listener?: (notification: ReminderNotification) => void;

  setListener(fn: (notification: ReminderNotification) => void) {
    this.listener = fn;
  }

  async send(notification: ReminderNotification): Promise<boolean> {
    if (this.listener) {
      this.listener(notification);
      return true;
    }
    return false;
  }

  isSupported(): boolean {
    return true;
  }

  async requestPermission(): Promise<boolean> {
    return true;
  }
}

export class BrowserNotificationChannel implements ReminderChannel {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }

  async send(notification: ReminderNotification): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
      return true;
    } catch {
      return false;
    }
  }
}

export function isWithinQuietHours(
  now: Date,
  quietStart: string = '22:00',
  quietEnd: string = '07:00'
): boolean {
  const [startH, startM] = quietStart.split(':').map(Number);
  const [endH, endM] = quietEnd.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Generates an iCalendar (.ics) string containing study blocks with alarms
 * Enables reliable reminders when browser is closed, completely offline with no Google account needed!
 */
export function generateIcsCalendar(
  blocks: StudyBlock[],
  dateIso: string = new Date().toISOString().substring(0, 10)
): string {
  const dateFormatted = dateIso.replace(/-/g, '');

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nihongo N2 Master//Study Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nihongo N2 Master',
    'X-WR-TIMEZONE:UTC',
  ];

  blocks.forEach((block) => {
    const [startH, startM] = block.startTime.split(':');
    const [endH, endM] = block.endTime.split(':');

    const dtStart = `${dateFormatted}T${startH}${startM}00`;
    const dtEnd = `${dateFormatted}T${endH}${endM}00`;
    const uid = `${dateFormatted}-${block.id}@nihongo-n2-master`;

    ics.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dateFormatted}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Nihongo N2: ${block.title}`,
      `DESCRIPTION:${block.reason || 'JLPT Mastery Curriculum Study Block'}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT10M', // 10 minutes before
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${block.title} starts in 10 minutes`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}
