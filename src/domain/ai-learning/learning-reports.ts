import { db, AINoteRecord } from '../../data/db/dexie-db';
import { LearnerDiagnosticProfile } from './weakness-diagnosis';
import { PersonalizedDailyStudyPlan } from './study-planner';

export type ReportType =
  | 'weakness_diagnosis'
  | 'weekly_report'
  | 'monthly_report'
  | 'study_plan'
  | 'exercise_summary';

export interface AIReportData {
  id: string;
  reportType: ReportType;
  title: string;
  summary: string;
  contentMarkdown: string;
  createdAt: string;
}

/**
 * Saves a structured diagnostic learning report to the existing Dexie ai_notes table.
 * Strictly requires learner action (never saves silently).
 */
export async function saveLearningReportToNotes(
  reportType: ReportType,
  level: string,
  profile: LearnerDiagnosticProfile,
  studyPlan?: PersonalizedDailyStudyPlan
): Promise<string> {
  const noteId = `ai_report_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const title = `[AI REPORT] ${getReportTypeName(reportType)} (${level})`;

  let markdown = `# ${title}\n- **Date:** ${new Date().toLocaleDateString()}\n- **Target Level:** ${level}\n\n`;

  markdown += `## 1. Executive Diagnostic Summary\n${profile.overallSummary.en}\n\n*${profile.overallSummary.my}*\n\n`;

  if (profile.confirmedWeaknesses.length > 0) {
    markdown += `## 2. Confirmed Weaknesses\n`;
    profile.confirmedWeaknesses.forEach((w) => {
      markdown += `- **${w.skill.toUpperCase()}** (Severity: ${w.severity}, Accuracy: ${w.accuracy !== null ? Math.round(w.accuracy * 100) : 0}%)\n`;
      markdown += `  - Evidence: ${w.evidence}\n`;
      markdown += `  - Recommended Action: ${w.recommendedAction}\n`;
    });
    markdown += '\n';
  }

  if (profile.insufficientDataSkills.length > 0) {
    markdown += `## 3. Skills Needing Practice (Insufficient Data)\n`;
    profile.insufficientDataSkills.forEach((s) => {
      markdown += `- **${s.skill.toUpperCase()}**: ${s.evidence} — *Practice more to evaluate mastery.*\n`;
    });
    markdown += '\n';
  }

  if (studyPlan) {
    markdown += `## 4. Suggested Daily Schedule (${studyPlan.totalPlannedMinutes} mins)\n`;
    studyPlan.activities.forEach((a, idx) => {
      markdown += `${idx + 1}. **${a.title}** (${a.estimatedMinutes} mins) — ${a.reason}\n`;
    });
    markdown += '\n';
  }

  const note: AINoteRecord = {
    id: noteId,
    topic: title,
    prompt: `Diagnostic report for JLPT ${level} performance analysis.`,
    response: markdown,
    provenance: 'ai',
    status: 'reviewed',
    createdAt: new Date().toISOString(),
  };

  await db.ai_notes.put(note);
  return noteId;
}

/**
 * Loads all saved AI learning reports from ai_notes.
 */
export async function loadSavedLearningReports(query = ''): Promise<AIReportData[]> {
  const allNotes = await db.ai_notes.toArray();
  const reportNotes = allNotes.filter((n) => n.topic.startsWith('[AI REPORT]'));

  const parsed = reportNotes.map((n) => {
    return {
      id: n.id,
      reportType: deriveReportType(n.topic),
      title: n.topic,
      summary: n.response.slice(0, 150) + '...',
      contentMarkdown: n.response,
      createdAt: n.createdAt,
    };
  });

  if (!query.trim()) {
    return parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const q = query.toLowerCase();
  return parsed
    .filter((r) => r.title.toLowerCase().includes(q) || r.contentMarkdown.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Deletes a saved learning report by ID.
 */
export async function deleteLearningReport(reportId: string): Promise<void> {
  await db.ai_notes.delete(reportId);
}

function getReportTypeName(type: ReportType): string {
  switch (type) {
    case 'weakness_diagnosis':
      return 'Weakness Diagnosis Report';
    case 'weekly_report':
      return 'Weekly Progress Report';
    case 'monthly_report':
      return 'Monthly Readiness Report';
    case 'study_plan':
      return 'Personalized Study Plan';
    case 'exercise_summary':
      return 'Targeted Exercise Summary';
  }
}

function deriveReportType(topic: string): ReportType {
  if (topic.includes('Weekly')) return 'weekly_report';
  if (topic.includes('Monthly')) return 'monthly_report';
  if (topic.includes('Study Plan')) return 'study_plan';
  if (topic.includes('Exercise')) return 'exercise_summary';
  return 'weakness_diagnosis';
}
