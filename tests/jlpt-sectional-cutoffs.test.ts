import { describe, it, expect } from 'vitest';
import {
  JLPTScoringEngine,
  OFFICIAL_JLPT_THRESHOLDS,
} from '../src/domain/assessment/jlpt-scoring-engine';

describe('JLPTScoringEngine - Official Sectional Cutoffs & Domain Diagnostics', () => {
  it('correctly retrieves official thresholds for N2, N3, N4, N5', () => {
    const n2 = JLPTScoringEngine.getThresholds('N2');
    expect(n2.totalPassScore).toBe(90);
    expect(n2.sections).toHaveLength(3);
    expect(n2.sections[0].cutoffScore).toBe(19);
    expect(n2.sections[1].cutoffScore).toBe(19);
    expect(n2.sections[2].cutoffScore).toBe(19);

    const n3 = JLPTScoringEngine.getThresholds('N3');
    expect(n3.totalPassScore).toBe(95);
    expect(n3.sections).toHaveLength(3);

    const n4 = JLPTScoringEngine.getThresholds('N4');
    expect(n4.totalPassScore).toBe(90);
    expect(n4.sections).toHaveLength(2);
    expect(n4.sections[0].maxScore).toBe(120);
    expect(n4.sections[0].cutoffScore).toBe(38);
    expect(n4.sections[1].maxScore).toBe(60);
    expect(n4.sections[1].cutoffScore).toBe(19);

    const n5 = JLPTScoringEngine.getThresholds('N5');
    expect(n5.totalPassScore).toBe(80);
    expect(n5.sections).toHaveLength(2);
    expect(n5.sections[0].cutoffScore).toBe(38);
    expect(n5.sections[1].cutoffScore).toBe(19);
  });

  it('evaluates N2 passing status when both total score and all section benchmarks are met', () => {
    const report = JLPTScoringEngine.simulateOfficialReport('N2', {
      vocab: 70,
      kanji: 70,
      grammar: 70,
      reading: 65,
      listening: 60,
    });

    expect(report.level).toBe('N2');
    expect(report.totalScaledScore).toBeGreaterThanOrEqual(90);
    expect(report.passedOverall).toBe(true);
    expect(report.passedSectional).toBe(true);
    expect(report.isSectionalDisqualified).toBe(false);
    expect(report.passed).toBe(true);
    expect(report.status).toBe('passed');
    expect(report.statusLabelJa).toContain('合格');
  });

  it('triggers Sectional Disqualification (足切り) when total >= 90 but one section is below cutoff', () => {
    // Very high language and reading, but listening failed (e.g. 10%)
    const report = JLPTScoringEngine.simulateOfficialReport('N2', {
      vocab: 90,
      kanji: 90,
      grammar: 90,
      reading: 90,
      listening: 20, // 20% of 60 = 12 points, which is < 19 cutoff!
    });

    // Language: ~54, Reading: ~54, Listening: ~12 => Total ~120 >= 90
    expect(report.totalScaledScore).toBeGreaterThanOrEqual(90);
    expect(report.passedOverall).toBe(true);
    expect(report.passedSectional).toBe(false);
    expect(report.isSectionalDisqualified).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.status).toBe('sectional_disqualified');
    expect(report.statusLabelJa).toContain('基準点未達');
    expect(report.statusLabelMm).toContain('ကျရှုံး');
  });

  it('evaluates N4 dual sections (120 pt Language/Reading & 60 pt Listening)', () => {
    const passingReport = JLPTScoringEngine.simulateOfficialReport('N4', {
      vocab: 60,
      kanji: 60,
      grammar: 60,
      reading: 60,
      listening: 60,
    });

    expect(passingReport.sections).toHaveLength(2);
    expect(passingReport.sections[0].maxScore).toBe(120);
    expect(passingReport.sections[0].scaledScore).toBe(72);
    expect(passingReport.sections[0].passed).toBe(true);
    expect(passingReport.sections[1].scaledScore).toBe(36);
    expect(passingReport.sections[1].passed).toBe(true);
    expect(passingReport.totalScaledScore).toBe(108);
    expect(passingReport.passed).toBe(true);

    // Sectional disqualification in N4
    const disqReport = JLPTScoringEngine.simulateOfficialReport('N4', {
      vocab: 90,
      kanji: 90,
      grammar: 90,
      reading: 90, // Lang & Reading = ~108/120
      listening: 15, // 15% of 60 = 9/60 (< 19 cutoff!)
    });

    expect(disqReport.totalScaledScore).toBeGreaterThanOrEqual(90);
    expect(disqReport.isSectionalDisqualified).toBe(true);
    expect(disqReport.passed).toBe(false);
  });

  it('diagnoses weakest domain and outputs actionable Burmese study advice', () => {
    // Vocab & Kanji are weakest
    const reportVocabWeak = JLPTScoringEngine.simulateOfficialReport('N2', {
      vocab: 35,
      kanji: 40,
      grammar: 80,
      reading: 85,
      listening: 75,
    });

    expect(reportVocabWeak.weakestDomain.domain).toBe('moji_goi');
    expect(reportVocabWeak.weakestDomain.titleJa).toBe('文字・語彙');
    expect(reportVocabWeak.weakestDomain.burmeseAdvice).toContain('ဝေါဟာရနှင့် ခန်းဂျီး');
    expect(reportVocabWeak.weakestDomain.drillSkill).toBe('vocab');

    // Listening is weakest
    const reportListeningWeak = JLPTScoringEngine.simulateOfficialReport('N2', {
      vocab: 85,
      kanji: 85,
      grammar: 80,
      reading: 80,
      listening: 30,
    });

    expect(reportListeningWeak.weakestDomain.domain).toBe('choukai');
    expect(reportListeningWeak.weakestDomain.titleJa).toBe('聴解');
    expect(reportListeningWeak.weakestDomain.burmeseAdvice).toContain('နားထောင်မှု');
    expect(reportListeningWeak.weakestDomain.drillSkill).toBe('listening');
  });

  describe('TestAnalyticsScreen Hook Invariance Regression Test (P0.2)', () => {
    it('renders cleanly in loading state without Hook ordering violations', async () => {
      const React = await import('react');
      const { renderToString } = await import('react-dom/server');
      const { TestAnalyticsScreen, createDefaultTestAnalyticsSummary, createDefaultWeaknessReport } = await import(
        '../src/presentation/screens/TestAnalyticsScreen'
      );
      const { DEFAULT_USER_PROFILE } = await import('../src/data/db/dexie-db');

      // 1. Initial loading render (data is null, early return active)
      const loadingHtml = renderToString(
        React.createElement(TestAnalyticsScreen, {
          profile: DEFAULT_USER_PROFILE,
        })
      );
      expect(loadingHtml).toContain('Aggregating test metrics');

      // 2. Hydrated loaded render (data is present, full dashboard active)
      const loadedHtml = renderToString(
        React.createElement(TestAnalyticsScreen, {
          profile: DEFAULT_USER_PROFILE,
          initialData: createDefaultTestAnalyticsSummary(),
          initialWeaknessReport: createDefaultWeaknessReport(),
        })
      );
      expect(loadedHtml).toContain('Test Analytics &amp; Skill Radar');
      expect(loadedHtml).toContain('Official JLPT Scaled Scoring Engine');
    });

    it('statically and dynamically verifies zero Hooks declared after early returns', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve('src/presentation/screens/TestAnalyticsScreen.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Find the index of the first early return guard
      const earlyReturnIndex = content.indexOf('if (loading || !data || !weaknessReport)');
      expect(earlyReturnIndex).toBeGreaterThan(0);

      // Extract the rest of the component body after the early return
      const bodyAfterEarlyReturn = content.substring(earlyReturnIndex);

      // Verify that no React Hook calls (useMemo, useState, useEffect, useCallback, useRef) exist after the early return
      const hookMatch = bodyAfterEarlyReturn.match(/\b(React\.)?use(Memo|State|Effect|Callback|Ref|Context)\b/);
      expect(hookMatch).toBeNull();
    });
  });
});
