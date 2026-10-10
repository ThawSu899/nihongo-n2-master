import { LessonPack } from '../../domain/models/types';
import { ContentLoader } from '../../data/content/content-loader';
import { GoogleSheetsPipeline } from './sheets-pipeline';
import { getAccessToken } from '../auth/firebase-auth';

export interface ContentSource {
  name: string;
  fetchLesson(lessonId: string): Promise<LessonPack | null>;
  isConfigured(): boolean;
}

export class LocalJsonContentSource implements ContentSource {
  name = 'Local Bundled / IndexedDB';

  async fetchLesson(lessonId: string): Promise<LessonPack | null> {
    return ContentLoader.getLessonPack(lessonId);
  }

  isConfigured(): boolean {
    return true;
  }
}

export class GoogleSheetsAdapter implements ContentSource {
  name = 'Google Sheets Curriculum Sync';

  constructor(private spreadsheetId?: string, private accessToken?: string) {}

  /**
   * Resolves effective access token, using explicit token if passed or falling back to in-memory OAuth token.
   */
  getEffectiveAccessToken(): string | null {
    return this.accessToken || getAccessToken();
  }

  isConfigured(): boolean {
    return Boolean(this.spreadsheetId && this.getEffectiveAccessToken());
  }

  /**
   * Fetches, stages, and validates curriculum pack from Google Sheets
   * Returns valid LessonPack or null if validation fails or IDs don't match.
   * If offline or unconfigured, logs a clean notice and safely degrades.
   */
  async fetchLesson(lessonId: string): Promise<LessonPack | null> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets is not configured or not authorized. Sign in with Google to sync live curriculum.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[GoogleSheetsAdapter] Offline detected. Cannot fetch curriculum from Google Sheets.');
      return null;
    }

    const token = this.getEffectiveAccessToken()!;

    try {
      const { stagedPack, report } = await GoogleSheetsPipeline.fetchAndStage(
        this.spreadsheetId!,
        token
      );

      if (!report.canApply || !stagedPack.id) {
        console.warn(`[GoogleSheetsAdapter] Lesson pack could not be applied: ${report.quarantinedRows} quarantined rows`);
        return null;
      }

      if (stagedPack.id !== lessonId) {
        console.warn(`[GoogleSheetsAdapter] Requested ${lessonId} but sheet provided ${stagedPack.id}`);
        return null;
      }

      return stagedPack as LessonPack;
    } catch (err: any) {
      console.warn(`[GoogleSheetsAdapter] Failed to fetch lesson pack ${lessonId} from Google Sheets: ${err.message}`);
      return null;
    }
  }
}

