import { LearnerDiagnosticProfile, WeaknessFinding } from './weakness-diagnosis';

export const PERSONALIZATION_CONSENT_KEY = 'nihongo_ai_personalization_consent';

export interface CompactLearnerDiagnosticDigest {
  targetLevel: 'N5' | 'N4' | 'N3' | 'N2';
  currentLessonId?: string;
  confirmedWeaknesses: Array<{
    skill: string;
    severity: string;
    evidence: string;
    accuracyPct: number | null;
    relevantLessonIds: string[];
    relevantItemIds: string[];
    recommendedAction: string;
  }>;
  possibleWeaknesses: Array<{
    skill: string;
    evidence: string;
  }>;
  insufficientDataSkills: string[];
  strongSkills: string[];
  recommendedLessonIds: string[];
}

/**
 * Checks whether the user has consented to including compact diagnostic learning context in AI requests.
 * Defaults to true; user can disable this at any time in settings or dashboard.
 */
export function getPersonalizationConsent(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const val = localStorage.getItem(PERSONALIZATION_CONSENT_KEY);
    if (val === null) return true; // Default enabled
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Updates the user's personalization consent setting.
 */
export function setPersonalizationConsent(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PERSONALIZATION_CONSENT_KEY, String(enabled));
  } catch (err) {
    console.warn('[LearnerContext] Failed to save consent setting:', err);
  }
}

/**
 * Transforms a full in-memory diagnostic profile into a strictly bounded,
 * privacy-safe compact digest to be attached to AI prompts.
 * Respects data minimization principles: never sends credentials, personal info, or full history.
 */
export function buildLearnerDiagnosticDigest(
  profile: LearnerDiagnosticProfile,
  currentLessonId?: string,
  recommendedLessons: string[] = []
): CompactLearnerDiagnosticDigest | undefined {
  if (!getPersonalizationConsent()) {
    return undefined;
  }

  return {
    targetLevel: profile.targetLevel,
    currentLessonId,
    confirmedWeaknesses: profile.confirmedWeaknesses.slice(0, 5).map((w) => ({
      skill: w.skill,
      severity: w.severity,
      evidence: w.evidence,
      accuracyPct: w.accuracy !== null ? Math.round(w.accuracy * 100) : null,
      relevantLessonIds: w.relevantLessonIds.slice(0, 5),
      relevantItemIds: w.relevantItemIds.slice(0, 8),
      recommendedAction: w.recommendedAction,
    })),
    possibleWeaknesses: profile.possibleWeaknesses.slice(0, 3).map((w) => ({
      skill: w.skill,
      evidence: w.evidence,
    })),
    insufficientDataSkills: profile.insufficientDataSkills.map((i) => i.skill),
    strongSkills: profile.strongSkills,
    recommendedLessonIds: recommendedLessons.slice(0, 5),
  };
}
