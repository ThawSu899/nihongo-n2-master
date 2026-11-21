import { ContentLoader } from '../../data/content/content-loader';
import { CurriculumMapItem, MasteryRecord } from '../models/types';
import { WeaknessFinding } from './weakness-diagnosis';

export interface SmartLessonRecommendation {
  lessonId: string;
  title: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  priority: 'high' | 'medium' | 'low';
  reason: {
    en: string;
    my: string;
  };
  evidence: string;
  learningObjective: string;
  grammarTopics: string[];
}

/**
 * Generates personalized lesson recommendations strictly anchored to real, published lessons.
 * Never invents nonexistent lesson IDs.
 */
export function recommendSmartLessons(
  weaknesses: WeaknessFinding[],
  masteryRecords: MasteryRecord[] = [],
  currentLessonId?: string,
  targetLevel?: 'N5' | 'N4' | 'N3' | 'N2',
  maxRecommendations = 4
): SmartLessonRecommendation[] {
  const publishedLessons = ContentLoader.getCurriculumMap().filter(
    (item) => item.status === 'published'
  );

  if (publishedLessons.length === 0) {
    return [];
  }

  const level = targetLevel || (currentLessonId?.slice(0, 2).toUpperCase() as any) || 'N5';
  const levelLessons = publishedLessons.filter((l) => l.level === level);
  const masteryMap = new Map<string, MasteryRecord>(masteryRecords.map((m) => [m.lessonId, m]));

  const recommendations: SmartLessonRecommendation[] = [];
  const addedIds = new Set<string>();

  // 1. Weakness-driven recommendations
  for (const w of weaknesses) {
    if (recommendations.length >= maxRecommendations) break;

    for (const lessonId of w.relevantLessonIds) {
      if (addedIds.has(lessonId)) continue;
      const lesson = publishedLessons.find((l) => l.id.toLowerCase() === lessonId.toLowerCase());
      if (lesson) {
        addedIds.add(lesson.id);
        recommendations.push({
          lessonId: lesson.id,
          title: lesson.title,
          level: lesson.level,
          priority: w.severity === 'high' ? 'high' : 'medium',
          reason: {
            en: `Targeted remediation for ${w.skill.toUpperCase()} weakness: ${w.evidence}`,
            my: `${w.skill.toUpperCase()} အားနည်းချက်အတွက် သီးသန့် ပြန်လည်လေ့လာရန် အကြံပြုထားသော သင်ခန်းစာ ဖြစ်ပါသည်။`,
          },
          evidence: w.evidence,
          learningObjective: `Master ${lesson.grammarTopics.slice(0, 3).join(', ')} and strengthen ${w.skill} accuracy.`,
          grammarTopics: lesson.grammarTopics,
        });
      }
    }
  }

  // 2. Unmastered or failed lessons in the current level
  for (const lesson of levelLessons) {
    if (recommendations.length >= maxRecommendations) break;
    if (addedIds.has(lesson.id)) continue;

    const mastery = masteryMap.get(lesson.id);
    if (!mastery || mastery.state === 'new' || mastery.state === 'learning' || !mastery.passedThresholds) {
      addedIds.add(lesson.id);
      recommendations.push({
        lessonId: lesson.id,
        title: lesson.title,
        level: lesson.level,
        priority: recommendations.length === 0 ? 'high' : 'medium',
        reason: {
          en: mastery && !mastery.passedThresholds
            ? 'Recent lesson assessment did not pass mastery threshold.'
            : 'Core curriculum lesson pending completion.',
          my: mastery && !mastery.passedThresholds
            ? 'သင်ခန်းစာ စာမေးပွဲတွင် သတ်မှတ် အမှတ်မပြည့်မီသေးသဖြင့် ထပ်မံလေ့လာသင့်ပါသည်။'
            : 'သင်ရိုးညွှန်းတမ်းအရ ဆက်လက်လေ့လာရန် လိုအပ်သော သင်ခန်းစာ ဖြစ်ပါသည်။',
        },
        evidence: mastery ? `Mastery state: ${mastery.state}, overall score: ${Math.round(mastery.scores.overall * 100)}%` : 'Not yet completed',
        learningObjective: `Complete all stages and pass assessment for ${lesson.title}.`,
        grammarTopics: lesson.grammarTopics,
      });
    }
  }

  // 3. Fallback: Next sequential lesson if all current are mastered
  if (recommendations.length === 0 && levelLessons.length > 0) {
    const nextLesson = levelLessons[0];
    recommendations.push({
      lessonId: nextLesson.id,
      title: nextLesson.title,
      level: nextLesson.level,
      priority: 'low',
      reason: {
        en: 'Next recommended lesson in curriculum progression.',
        my: 'သင်ရိုးစဉ်အတိုင်း ဆက်လက်လေ့လာရန် အကြံပြုထားသော သင်ခန်းစာ ဖြစ်ပါသည်။',
      },
      evidence: 'Curriculum sequential order',
      learningObjective: `Study ${nextLesson.title} vocabulary, grammar, and reading.`,
      grammarTopics: nextLesson.grammarTopics,
    });
  }

  return recommendations.slice(0, maxRecommendations);
}
