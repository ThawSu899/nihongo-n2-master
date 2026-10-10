import { StudyBlock } from '../../domain/models/types';
import { generateIcsCalendar } from '../../domain/reminders/reminder-service';
import { getAccessToken } from '../auth/firebase-auth';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties: {
    private: {
      app: 'nihongo_n2_master';
      blockId: string;
      planVersion: string;
    };
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{ method: 'popup'; minutes: number }>;
  };
}

export interface TargetCalendarResolution {
  id: string;
  name: string;
  isDedicated: boolean;
}

export interface CalendarService {
  name: string;
  syncBlocks(
    blocks: StudyBlock[],
    dateIso: string,
    options?: { allowPrimaryFallback?: boolean; explicitCalendarId?: string }
  ): Promise<{ success: boolean; urlOrFile?: string; message: string; conflicts?: string[]; targetCalendarName?: string; isDedicated?: boolean }>;
  isConfigured(): boolean;
}

export class IcsExportCalendarService implements CalendarService {
  name = 'iCalendar (.ics) Offline Exporter';

  async syncBlocks(
    blocks: StudyBlock[],
    dateIso: string
  ): Promise<{ success: boolean; urlOrFile?: string; message: string }> {
    try {
      const ics = generateIcsCalendar(blocks, dateIso);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return {
        success: true,
        urlOrFile: url,
        message: 'iCalendar file generated with 10-minute pre-block reminder alarms.',
      };
    } catch (err: any) {
      return { success: false, message: `Failed to export .ics: ${err.message}` };
    }
  }

  isConfigured(): boolean {
    return true;
  }
}

export class GoogleCalendarAdapter implements CalendarService {
  name = 'Google Calendar App Mirror';
  public static readonly DEDICATED_CALENDAR_NAME = 'Nihongo N2 Master';
  private static readonly API_BASE = 'https://www.googleapis.com/calendar/v3';

  constructor(private accessToken?: string) {}

  /**
   * Resolves effective access token, using explicit token if passed or falling back to in-memory OAuth token.
   */
  getEffectiveAccessToken(): string | null {
    return this.accessToken || getAccessToken();
  }

  isConfigured(): boolean {
    return Boolean(this.getEffectiveAccessToken());
  }

  /**
   * Builds formatted calendar event payloads tagged with private metadata.
   * Calculates the exact timezone offset for the target event date (not current runtime date),
   * preserving the learner's local wall-clock time across daylight-saving transitions.
   */
  createEventPayloads(blocks: StudyBlock[], dateIso: string): CalendarEventPayload[] {
    const userTimeZone = typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';

    const pad = (n: number) => String(n).padStart(2, '0');
    const [year, month, day] = dateIso.split('-').map(Number);

    return blocks.map((b) => {
      const [startH, startM] = (b.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (b.endTime || '09:00').split(':').map(Number);

      // Target-date specific timezone offset (handles DST transitions on target date)
      const targetStartDate = new Date(year, month - 1, day, startH, startM, 0);
      const targetEndDate = new Date(year, month - 1, day, endH, endM, 0);

      const localOffsetMinutes = -targetStartDate.getTimezoneOffset();
      const sign = localOffsetMinutes >= 0 ? '+' : '-';
      const offsetHours = pad(Math.floor(Math.abs(localOffsetMinutes) / 60));
      const offsetMins = pad(Math.abs(localOffsetMinutes) % 60);
      const tzOffset = `${sign}${offsetHours}:${offsetMins}`;

      const localEndOffsetMinutes = -targetEndDate.getTimezoneOffset();
      const endSign = localEndOffsetMinutes >= 0 ? '+' : '-';
      const endOffsetHours = pad(Math.floor(Math.abs(localEndOffsetMinutes) / 60));
      const endOffsetMins = pad(Math.abs(localEndOffsetMinutes) % 60);
      const endTzOffset = `${endSign}${endOffsetHours}:${endOffsetMins}`;

      return {
        summary: `Nihongo N2: ${b.title}`,
        description: `${b.reason || 'JLPT Mastery Curriculum Study Block'}\n\nScheduled via Nihongo N2 Master app. Focus on active recall and retention.`,
        start: {
          dateTime: `${dateIso}T${b.startTime}:00${tzOffset}`,
          timeZone: userTimeZone,
        },
        end: {
          dateTime: `${dateIso}T${b.endTime}:00${endTzOffset}`,
          timeZone: userTimeZone,
        },
        extendedProperties: {
          private: {
            app: 'nihongo_n2_master',
            blockId: b.id,
            planVersion: 'v1',
          },
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 10 }],
        },
      };
    });
  }

  /**
   * Resolves target calendar.
   * NEVER silently selects primary calendar. If dedicated 'Nihongo N2 Master' calendar
   * is not found, returns null unless allowPrimaryFallback is explicitly set to true.
   */
  async resolveTargetCalendar(allowPrimaryFallback = false): Promise<TargetCalendarResolution | null> {
    const token = this.getEffectiveAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`${GoogleCalendarAdapter.API_BASE}/users/me/calendarList`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        if (allowPrimaryFallback) {
          return { id: 'primary', name: 'Primary Calendar', isDedicated: false };
        }
        return null;
      }

      const data = await res.json();
      const calendars: any[] = data.items || [];
      const dedicated = calendars.find(
        (c) => c.summary === GoogleCalendarAdapter.DEDICATED_CALENDAR_NAME
      );

      if (dedicated) {
        return { id: dedicated.id, name: dedicated.summary, isDedicated: true };
      }

      // Dedicated calendar not present: only return primary if explicitly allowed
      if (allowPrimaryFallback) {
        return { id: 'primary', name: 'Primary Calendar', isDedicated: false };
      }

      return null;
    } catch {
      if (allowPrimaryFallback) {
        return { id: 'primary', name: 'Primary Calendar', isDedicated: false };
      }
      return null;
    }
  }

  /**
   * Synchronizes study blocks directly to Google Calendar.
   * If dedicated calendar does not exist and allowPrimaryFallback is false,
   * performs ZERO event mutations and returns failure with explanation.
   */
  async syncBlocks(
    blocks: StudyBlock[],
    dateIso: string,
    options?: { allowPrimaryFallback?: boolean; explicitCalendarId?: string }
  ): Promise<{ success: boolean; urlOrFile?: string; message: string; conflicts?: string[]; targetCalendarName?: string; isDedicated?: boolean }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Google Calendar is not connected. Sign in with Google or use offline .ics export.',
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        message: 'You appear to be offline. Live Google Calendar sync requires an active internet connection. Please use offline .ics export instead.',
      };
    }

    if (!blocks || blocks.length === 0) {
      return {
        success: false,
        message: 'No study blocks scheduled for this date.',
      };
    }

    const token = this.getEffectiveAccessToken()!;

    try {
      const target = options?.explicitCalendarId
        ? { id: options.explicitCalendarId, name: 'Selected Calendar', isDedicated: false }
        : await this.resolveTargetCalendar(options?.allowPrimaryFallback ?? false);

      if (!target) {
        return {
          success: false,
          message: 'Dedicated "Nihongo N2 Master" calendar was not found. To prevent mixing study blocks with your personal events, primary calendar syncing requires explicit confirmation.',
        };
      }

      const encodedCalendarId = encodeURIComponent(target.id);

      // 1. Query ONLY existing study events carrying app's private metadata
      const timeMin = new Date(`${dateIso}T00:00:00.000Z`).toISOString();
      const timeMax = new Date(`${dateIso}T23:59:59.999Z`).toISOString();

      const existingRes = await fetch(
        `${GoogleCalendarAdapter.API_BASE}/calendars/${encodedCalendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&privateExtendedProperty=app=nihongo_n2_master`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const existingItems: any[] = existingData.items || [];
        for (const item of existingItems) {
          if (item.id) {
            await fetch(
              `${GoogleCalendarAdapter.API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(item.id)}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          }
        }
      }

      // 2. Insert new event payloads with target-date timezone and private metadata
      const payloads = this.createEventPayloads(blocks, dateIso);
      let insertedCount = 0;

      for (const payload of payloads) {
        const insertRes = await fetch(
          `${GoogleCalendarAdapter.API_BASE}/calendars/${encodedCalendarId}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (insertRes.ok) {
          insertedCount++;
        } else {
          const errText = await insertRes.text();
          console.warn(`[GoogleCalendarAdapter] Failed to insert event: ${errText}`);
        }
      }

      if (insertedCount === 0) {
        throw new Error('Failed to insert calendar events. Please check your Google Calendar permissions.');
      }

      return {
        success: true,
        urlOrFile: 'https://calendar.google.com',
        message: `Successfully synchronized ${insertedCount} study block(s) to "${target.name}" with 10-minute notification alarms.`,
        targetCalendarName: target.name,
        isDedicated: target.isDedicated,
      };
    } catch (err: any) {
      const isNetworkError = /failed to fetch|network|load failed/i.test(err?.message || '');
      const errMsg = isNetworkError
        ? 'Network connection error while communicating with Google Calendar. Please check your internet connection or use offline .ics export.'
        : `Google Calendar synchronization failed: ${err.message}`;

      return {
        success: false,
        message: errMsg,
      };
    }
  }
}


