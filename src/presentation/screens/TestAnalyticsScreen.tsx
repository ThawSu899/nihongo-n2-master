import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Headphones,
  FileText,
  Target,
  Shield,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Flame,
  Bug,
  ShieldCheck,
  Play,
  Filter,
  Check,
  ChevronRight,
  History,
} from 'lucide-react';
import { db } from '../../data/db/dexie-db';
import {
  TestAnalyticsAggregator,
  TestAnalyticsSummary,
} from '../../domain/assessment/test-analytics-aggregator';
import {
  WeaknessRemediator,
  WeaknessReport,
  LeechItem,
} from '../../domain/assessment/weakness-remediator';
import { SkillRadarChart, SkillScoreData } from '../components/SkillRadarChart';
import { UserProfile, QuestionSkill, RemediationPlan, CramDrillRecord } from '../../domain/models/types';

export interface TestAnalyticsScreenProps {
  profile: UserProfile;
  onNavigateToTests?: () => void;
  onLaunchDrill?: (skill?: QuestionSkill | 'mixed_leeches') => void;
  initialData?: TestAnalyticsSummary;
  initialWeaknessReport?: WeaknessReport;
  initialRemediations?: RemediationPlan[];
  initialCramDrills?: CramDrillRecord[];
}

export const createDefaultTestAnalyticsSummary = (): TestAnalyticsSummary => {
  const defaultSkills: QuestionSkill[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening'];
  const labels: Record<QuestionSkill, string> = {
    vocab: 'Vocabulary',
    kanji: 'Kanji',
    grammar: 'Grammar',
    reading: 'Reading',
    listening: 'Listening',
  };

  const skills = defaultSkills.map((skill) => ({
    skill,
    label: labels[skill],
    scorePct: 85,
    testedCount: 10,
    correctCount: 8,
    thresholdPct: 80,
    status: 'mastered' as const,
    radarData: {
      skill,
      label: labels[skill],
      scorePct: 85,
      thresholdPct: 80,
      testedCount: 10,
      correctCount: 8,
    },
  }));

  return {
    totalTests: 0,
    averageScorePct: 0,
    passCount: 0,
    failCount: 0,
    passRatePct: 0,
    totalTimeMinutes: 0,
    averageTimeMinutes: 0,
    skills,
    strongestSkill: { skill: 'vocab', label: 'Vocabulary', scorePct: 85 },
    weakestSkill: { skill: 'grammar', label: 'Grammar', scorePct: 85 },
    recentTrends: [],
    recentAssessmentList: [],
  };
};

export const createDefaultWeaknessReport = (): WeaknessReport => ({
  weakestSkill: 'grammar',
  weakestSkillLabel: 'Grammar',
  weakestSkillScore: 0,
  targetThresholdPct: 80,
  deficitPct: 80,
  allSkills: [
    { skill: 'vocab', label: 'Vocabulary', scorePct: 0, thresholdPct: 80, isWeak: false, testedCount: 0 },
    { skill: 'kanji', label: 'Kanji', scorePct: 0, thresholdPct: 80, isWeak: false, testedCount: 0 },
    { skill: 'grammar', label: 'Grammar', scorePct: 0, thresholdPct: 80, isWeak: false, testedCount: 0 },
    { skill: 'reading', label: 'Reading', scorePct: 0, thresholdPct: 80, isWeak: false, testedCount: 0 },
    { skill: 'listening', label: 'Listening', scorePct: 0, thresholdPct: 80, isWeak: false, testedCount: 0 },
  ],
  leeches: [],
  totalLeechCount: 0,
  totalCardsCount: 0,
  recommendedAction: 'Focus on core grammar and vocabulary consolidation.',
});

const SKILL_ICONS: Record<QuestionSkill, React.FC<{ className?: string }>> = {
  vocab: BookOpen,
  kanji: Target,
  grammar: Layers,
  reading: FileText,
  listening: Headphones,
};

const formatBurmeseDate = (isoString?: string): string => {
  if (!isoString) return 'ရက်စွဲ မရှိပါ';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const burmeseDigits: Record<string, string> = {
      '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄',
      '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉',
    };
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const raw = `${y}-${m}-${day} ${hours}:${mins}`;
    return raw.replace(/[0-9]/g, (c) => burmeseDigits[c] || c);
  } catch {
    return isoString;
  }
};

const mapCategoryToSkill = (cat?: string): QuestionSkill | 'mixed_leeches' => {
  if (!cat) return 'grammar';
  const lower = cat.toLowerCase();
  if (lower.includes('vocab')) return 'vocab';
  if (lower.includes('kanji')) return 'kanji';
  if (lower.includes('gram')) return 'grammar';
  if (lower.includes('read') || lower.includes('dokkai')) return 'reading';
  if (lower.includes('listen') || lower.includes('choukai')) return 'listening';
  if (lower.includes('leech')) return 'mixed_leeches';
  return 'grammar';
};

const getCategoryDisplay = (cat?: string): { name: string; burmese: string } => {
  const lower = (cat || 'grammar').toLowerCase();
  if (lower.includes('vocab')) return { name: 'Vocabulary', burmese: 'ဝေါဟာရ' };
  if (lower.includes('kanji')) return { name: 'Kanji', burmese: 'ခန်ဂျီ' };
  if (lower.includes('gram')) return { name: 'Grammar', burmese: 'သဒ္ဒါ' };
  if (lower.includes('read') || lower.includes('dokkai')) return { name: 'Reading', burmese: 'စာဖတ်' };
  if (lower.includes('listen') || lower.includes('choukai')) return { name: 'Listening', burmese: 'နားထောင်' };
  return { name: cat || 'Targeted Practice', burmese: 'အထူးလေ့ကျင့်' };
};

export const TestAnalyticsScreen: React.FC<TestAnalyticsScreenProps> = ({
  profile,
  onNavigateToTests,
  onLaunchDrill,
  initialData,
  initialWeaknessReport,
  initialRemediations,
  initialCramDrills,
}) => {
  const [loading, setLoading] = useState(!initialData || !initialWeaknessReport);
  const [data, setData] = useState<TestAnalyticsSummary | null>(initialData || null);
  const [weaknessReport, setWeaknessReport] = useState<WeaknessReport | null>(initialWeaknessReport || null);
  const [selectedViewTab, setSelectedViewTab] = useState<'radar' | 'bars'>('radar');
  const [quarantineFilter, setQuarantineFilter] = useState<'all' | 'vocab' | 'kanji' | 'grammar'>('all');
  const [drillHistoryFilter, setDrillHistoryFilter] = useState<'all' | 'cram' | 'remediation'>('all');
  const [remediations, setRemediations] = useState<RemediationPlan[]>(initialRemediations || []);
  const [cramDrills, setCramDrills] = useState<CramDrillRecord[]>(initialCramDrills || []);
  const [rehabilitatingId, setRehabilitatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!initialData || !initialWeaknessReport) {
      setLoading(true);
    }
    const summary = await TestAnalyticsAggregator.getAnalyticsSummary();
    const report = await WeaknessRemediator.analyzeWeaknesses();
    setData(summary);
    setWeaknessReport(report);

    try {
      const remList = await db.remediations.toArray();
      remList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRemediations(remList);

      const cramList = await db.cram_drills.toArray();
      cramList.sort(
        (a, b) =>
          new Date(b.completedAt || b.startedAt || 0).getTime() -
          new Date(a.completedAt || a.startedAt || 0).getTime()
      );
      setCramDrills(cramList);
    } catch (e) {
      console.warn('Error reading remediations or cram drills from Dexie:', e);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSeedDemoSample = async () => {
    await TestAnalyticsAggregator.seedSampleDiagnosticTestIfEmpty();
    await WeaknessRemediator.seedSampleLeechesIfEmpty();
    await loadAnalytics();
    setActionMessage('Diagnostic assessment baseline and sample quarantine cards loaded.');
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleSeedLeeches = async () => {
    await WeaknessRemediator.seedSampleLeechesIfEmpty();
    await loadAnalytics();
    setActionMessage('Quarantine populated with high-lapse stubborn items.');
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleRehabilitate = async (cardId: string) => {
    setRehabilitatingId(cardId);
    await WeaknessRemediator.rehabilitateLeech(cardId);
    await loadAnalytics();
    setRehabilitatingId(null);
    setActionMessage('Card successfully rehabilitated and returned to review cycle.');
    setTimeout(() => setActionMessage(null), 3000);
  };

  if (loading || !data || !weaknessReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RotateCcw className="w-8 h-8 text-rose-500 animate-spin" />
        <span className="text-xs text-stone-400 font-mono">Aggregating test metrics, radar scores &amp; leech logs...</span>
      </div>
    );
  }

  const radarSkills: SkillScoreData[] = data.skills.map(
    (s) =>
      s.radarData || {
        skill: s.skill,
        label: s.label,
        scorePct: s.scorePct,
        thresholdPct: s.thresholdPct,
        testedCount: s.testedCount,
        correctCount: s.correctCount,
      }
  );

  const filteredLeeches = (weaknessReport.leeches || []).filter((l) => {
    if (quarantineFilter === 'all') return true;
    return l.itemType === quarantineFilter;
  });

  const WeakestIcon = SKILL_ICONS[weaknessReport.weakestSkill] || AlertTriangle;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Toast Alert Message */}
      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold uppercase">
              {profile.level} Assessment OS
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-600 font-medium">JLPT Skill Competency</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1 flex items-center space-x-2">
            <span>Test Analytics &amp; Skill Radar</span>
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Holistic aggregation across Vocab, Kanji, Grammar, Reading, and Listening connected directly to targeted drills.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onLaunchDrill && (
            <button
              onClick={() => onLaunchDrill(weaknessReport.weakestSkill)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Weak-Point Drill</span>
            </button>
          )}
          {onNavigateToTests && (
            <button
              onClick={onNavigateToTests}
              className="px-3 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Award className="w-4 h-4 text-stone-500" />
              <span>Tests &amp; Blueprints</span>
            </button>
          )}
          <button
            onClick={loadAnalytics}
            title="Refresh analytics data"
            className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards with Paper Styling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-1 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-600 uppercase font-semibold font-mono">Average Score</span>
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {data.averageScorePct}%
          </div>
          <p className="text-[10px] text-stone-500">
            {data.totalTests > 0 ? `Across ${data.totalTests} tests taken` : 'No formal tests logged yet'}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-1 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-600 uppercase font-semibold font-mono">Pass / Fail Rate</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {data.passRatePct}%
          </div>
          <p className="text-[10px] text-stone-500">
            {data.passCount} passed • {data.failCount} failed
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-1 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-600 uppercase font-semibold font-mono">Total Tests</span>
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700">
            {data.totalTests}
          </div>
          <p className="text-[10px] text-stone-500">
            Weekly &amp; Level simulations
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4.5 space-y-1 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-600 uppercase font-semibold font-mono">Leech Quarantine</span>
            <Bug className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800">
            {weaknessReport.totalLeechCount}
          </div>
          <p className="text-[10px] text-stone-500">
            High-lapse stubborn items
          </p>
        </div>
      </div>

      {/* HIGHLIGHTED HERO CARD: Launch Weak-Point Drill Engine */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold uppercase tracking-wider font-mono">
                <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>Weak-Point Drill &amp; Remediation Engine</span>
              </span>
              <span className="text-xs text-amber-800 font-mono font-medium">
                Lowest Radar Axis: {weaknessReport.weakestSkillLabel}
              </span>
            </div>

            <div className="flex items-baseline space-x-3">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center space-x-2.5">
                <WeakestIcon className="w-6 h-6 text-rose-600" />
                <span>Bridge Your {weaknessReport.weakestSkillLabel} Gap</span>
              </h2>
              <span className="text-sm font-mono font-bold text-rose-700">
                {weaknessReport.weakestSkillScore}% / Req {weaknessReport.targetThresholdPct}%
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Your radar analysis identifies <strong>{weaknessReport.weakestSkillLabel}</strong> as the primary bottleneck holding back your conjunctive scoring score. Launch an immediate, targeted 12-question custom practice session with 1 click.
            </p>

            {/* Gap indicator gauge */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-stone-600 font-mono">
                <span>Current Mastery: {weaknessReport.weakestSkillScore}%</span>
                <span className="text-amber-800 font-semibold">
                  Deficit: -{weaknessReport.deficitPct}% below threshold
                </span>
                <span>Target: {weaknessReport.targetThresholdPct}%</span>
              </div>
              <div className="relative w-full bg-stone-100 rounded-full h-2.5 overflow-hidden border border-stone-200">
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                  style={{ left: `${weaknessReport.targetThresholdPct}%` }}
                />
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                  style={{ width: `${Math.max(5, weaknessReport.weakestSkillScore)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onLaunchDrill && onLaunchDrill(weaknessReport.weakestSkill)}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-xs transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer group"
            >
              <Zap className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform" />
              <span>Launch Weak-Point Drill (1-Click)</span>
            </button>

            {weaknessReport.totalLeechCount > 0 ? (
              <button
                onClick={() => onLaunchDrill && onLaunchDrill('mixed_leeches')}
                className="px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Bug className="w-4 h-4 text-amber-600" />
                <span>Drill Stubborn Leeches ({weaknessReport.totalLeechCount})</span>
              </button>
            ) : (
              <button
                onClick={handleSeedLeeches}
                className="px-4 py-2 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-[11px] font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                <span>Simulate Quarantine Items</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Analysis Section: Radar Chart & Skill Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Radar Chart Card */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>JLPT Skill Competency Radar</span>
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Multi-axis visualization showing strengths and gaps across all 5 JLPT core areas.
              </p>
            </div>

            {/* Toggle between Radar and Bar view */}
            <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                onClick={() => setSelectedViewTab('radar')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                  selectedViewTab === 'radar'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Radar Pentagram
              </button>
              <button
                onClick={() => setSelectedViewTab('bars')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                  selectedViewTab === 'bars'
                    ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Progress Bars
              </button>
            </div>
          </div>

          {selectedViewTab === 'radar' ? (
            <div className="py-2 flex justify-center">
              <SkillRadarChart skills={radarSkills} size={310} showComparisonTarget={true} />
            </div>
          ) : (
            /* Progress Comparison Bars View */
            <div className="space-y-4 py-2">
              {data.skills.map((item) => {
                const Icon = SKILL_ICONS[item.skill];
                const isPassing = item.scorePct >= item.thresholdPct;
                return (
                  <div key={item.skill} className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-stone-500" />
                        <span className="font-semibold text-stone-900">{item.label}</span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          ({item.correctCount}/{item.testedCount} items)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold ${isPassing ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.scorePct}%
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">/ Req {item.thresholdPct}%</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isPassing ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isPassing ? 'Cleared' : 'Below Target'}
                        </span>
                      </div>
                    </div>

                    <div className="relative w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                      {/* Target line indicator */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-10"
                        style={{ left: `${item.thresholdPct}%` }}
                        title={`Target threshold: ${item.thresholdPct}%`}
                      />
                      {/* Actual user progress bar */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPassing
                            ? 'bg-emerald-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${item.scorePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Strength & Weakness Callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 text-emerald-700">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Strongest Skill Area</span>
                <span className="text-xs font-bold text-stone-900">
                  {data.strongestSkill ? `${data.strongestSkill.label} (${data.strongestSkill.scorePct}%)` : 'Not determined yet'}
                </span>
                <p className="text-[10px] text-stone-600 mt-0.5">
                  Your primary anchor area for scoring efficiency.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5 text-rose-700">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Key Growth Opportunity</span>
                <span className="text-xs font-bold text-rose-700">
                  {data.weakestSkill ? `${data.weakestSkill.label} (${data.weakestSkill.scorePct}%)` : 'Not determined yet'}
                </span>
                <p className="text-[10px] text-stone-600 mt-0.5">
                  Conjunctive scoring requires this skill to clear the threshold.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Test Trends & Summary List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Trend Bar Chart */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-stone-900">Score Improvement Trends</h3>
              </div>
              <span className="text-[10px] font-mono text-stone-500">Latest 10 Attempts</span>
            </div>

            {data.recentTrends.length > 0 ? (
              <div className="space-y-3">
                <div className="h-36 flex items-end justify-between space-x-1.5 pt-4 pb-2 px-1 bg-stone-50 rounded-xl border border-stone-200">
                  {data.recentTrends.map((attempt, idx) => (
                    <div key={attempt.id || idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-white text-stone-900 border border-stone-200 px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-20 shadow-md">
                        {attempt.type.toUpperCase()}: {attempt.score}% ({attempt.passed ? 'Pass' : 'Fail'})
                      </div>

                      {/* Bar */}
                      <div
                        className={`w-full max-w-[20px] rounded-t-sm transition-all duration-300 ${
                          attempt.passed
                            ? 'bg-emerald-600 group-hover:bg-emerald-500'
                            : 'bg-rose-600 group-hover:bg-rose-500'
                        }`}
                        style={{ height: `${Math.max(8, attempt.score)}%` }}
                      />
                      <span className="text-[9px] font-mono text-stone-500 mt-1 truncate max-w-[28px]">
                        {attempt.formattedDate}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-500 px-1 font-mono">
                  <span>Earliest</span>
                  <span>Target: ≥80% Overall</span>
                  <span>Most Recent</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <Award className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-600 max-w-xs mx-auto">
                  No assessment tests recorded yet. Complete your first weekly or level test to populate trend metrics.
                </p>
                <button
                  onClick={handleSeedDemoSample}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                >
                  Generate Initial Baseline Sample
                </button>
              </div>
            )}
          </div>

          {/* Recent Assessment Log List */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
              <span>Assessment History</span>
              <span className="text-[10px] text-stone-500 font-normal">
                {data.recentAssessmentList.length} recorded
              </span>
            </h3>

            {data.recentAssessmentList.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {data.recentAssessmentList.map((test) => (
                  <div
                    key={test.id}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs hover:border-stone-300 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-stone-900 capitalize">
                          {test.type} Test
                        </span>
                        <span className="text-[10px] font-mono text-stone-500">
                          {new Date(test.takenAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-600">
                        {test.correctQuestions}/{test.totalQuestions} items • {Math.round(test.durationSeconds / 60)} min
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono font-bold text-stone-900">
                        {test.score}%
                      </span>
                      <span
                        className={`p-1 rounded-md ${
                          test.passed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {test.passed ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic py-2">
                Assessments taken from the Tests screen will automatically register in this log.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* REMEDIATION HISTORY & WEAKNESS DRILLS HUB */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wide flex items-center space-x-1">
                <History className="w-3 h-3 text-rose-600" />
                <span>Targeted Recovery Log</span>
              </span>
              <span className="text-xs text-stone-400">•</span>
              <span className="text-xs text-stone-500 font-mono">
                {cramDrills.length + remediations.length} total sessions
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
              <span>Remediation History &amp; Weakness Drills (အားနည်းချက် ပြန်လည်လေ့ကျင့်မှု မှတ်တမ်းများ)</span>
            </h3>
            <p className="text-xs text-stone-600">
              Audit past targeted drills and automated remediation plans to monitor retention recovery. Retake past drills anytime to solidify mastery.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter tabs */}
            <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              {(['all', 'cram', 'remediation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrillHistoryFilter(tab)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer capitalize ${
                    drillHistoryFilter === tab
                      ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab === 'all'
                    ? `အားလုံး (${cramDrills.length + remediations.length})`
                    : tab === 'cram'
                    ? `Cram Drills (${cramDrills.length})`
                    : `Remediations (${remediations.length})`}
                </button>
              ))}
            </div>

            {onLaunchDrill && (
              <button
                onClick={() => onLaunchDrill('mixed_leeches')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch New Drill (အသစ် လေ့ကျင့်မည်)</span>
              </button>
            )}
          </div>
        </div>

        {/* Drill & Remediation Records List */}
        {(() => {
          const showCram = drillHistoryFilter === 'all' || drillHistoryFilter === 'cram';
          const showRem = drillHistoryFilter === 'all' || drillHistoryFilter === 'remediation';

          const hasRecords = (showCram && cramDrills.length > 0) || (showRem && remediations.length > 0);

          if (!hasRecords) {
            return (
              <div className="text-center py-8 space-y-3 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <RotateCcw className="w-8 h-8 text-stone-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs text-stone-700 font-medium">
                    No past remediation or cram drill records found yet.
                  </p>
                  <p className="text-[11px] text-stone-500 font-burmese">
                    ယခင် ပြန်လည်လေ့ကျင့်ထားသော မှတ်တမ်း မရှိသေးပါ။ အထူးလေ့ကျင့်ခန်း ပြီးမြောက်ပါက ဤနေရာတွင် မှတ်တမ်းတင်ပါမည်။
                  </p>
                </div>
                {onLaunchDrill && (
                  <button
                    onClick={() => onLaunchDrill('mixed_leeches')}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                  >
                    Launch Weakness Drill (အားနည်းချက် စတင်လေ့ကျင့်မည်)
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {/* Render Cram Drills */}
              {showCram &&
                cramDrills.map((drill, idx) => {
                  const catInfo = getCategoryDisplay(drill.category);
                  const isSuccess = (drill.accuracy ?? 0) >= 0.8;
                  const dateStr = drill.completedAt || drill.startedAt;
                  return (
                    <div
                      key={drill.id || `cram_${idx}`}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                            Cram Drill
                          </span>
                          <span className="text-xs font-bold text-stone-900">
                            {catInfo.name} ({catInfo.burmese})
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-stone-200 text-stone-600">
                            {drill.level || 'N2'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-stone-500">
                          <span className="font-burmese text-stone-700">{formatBurmeseDate(dateStr)}</span>
                          <span className="text-stone-400 font-mono">({new Date(dateStr).toLocaleDateString()})</span>
                          {drill.durationSeconds > 0 && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="text-stone-500 font-mono flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-stone-400" />
                                <span>{Math.round(drill.durationSeconds / 60) || 1} min</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-stone-900">
                            {`${drill.correctAnswers} / ${drill.totalQuestions}`}
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {`${Math.round((drill.accuracy ?? 0) * 100)}% Clear`}
                          </span>
                        </div>

                        {onLaunchDrill && (
                          <button
                            onClick={() => onLaunchDrill(mapCategoryToSkill(drill.category))}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 hover:border-indigo-300 text-stone-700 hover:text-indigo-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Retake Drill (ထပ်မံလေ့ကျင့်မည်)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Render Remediation Plans */}
              {showRem &&
                remediations.map((rem, idx) => {
                  const targetCat = rem.weakSkills?.[0] || 'grammar';
                  const catInfo = getCategoryDisplay(targetCat);
                  const isCompleted = rem.status === 'completed';
                  const exercisesCount = rem.exercises?.length || 0;
                  const failedCount = rem.failedItemIds?.length || 0;
                  const correctCount = Math.max(0, exercisesCount - failedCount);
                  const dateStr = rem.createdAt;
                  return (
                    <div
                      key={rem.id || `rem_${idx}`}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                            Remediation Plan
                          </span>
                          <span className="text-xs font-bold text-stone-900">
                            {catInfo.name} ({catInfo.burmese})
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            {rem.lessonId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-stone-500">
                          <span className="font-burmese text-stone-700">{formatBurmeseDate(dateStr)}</span>
                          <span className="text-stone-400 font-mono">({new Date(dateStr).toLocaleDateString()})</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-stone-900">
                            {`${correctCount} / ${exercisesCount || 1}`}
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isCompleted ? 'ပြီးစီး (Completed)' : 'လုပ်ဆောင်ဆဲ (Pending)'}
                          </span>
                        </div>

                        {onLaunchDrill && (
                          <button
                            onClick={() => onLaunchDrill(mapCategoryToSkill(targetCat))}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 hover:border-indigo-300 text-stone-700 hover:text-indigo-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Retake Drill (ထပ်မံလေ့ကျင့်မည်)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })()}
      </div>

      {/* LEECH QUARANTINE SECTION: Stubborn Items & Error Counts */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wide flex items-center space-x-1">
                <Bug className="w-3 h-3 text-amber-600" />
                <span>Active Isolation Zone</span>
              </span>
              <span className="text-xs text-stone-400">•</span>
              <span className="text-xs text-stone-500 font-mono">
                {weaknessReport.totalLeechCount} quarantined items
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
              <span>Leech Quarantine &amp; Stubborn Items</span>
            </h3>
            <p className="text-xs text-stone-600">
              Items with high lapse counts or persistent retrieval friction. Practice them in isolated sessions to break interference patterns.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              {(['all', 'vocab', 'kanji', 'grammar'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setQuarantineFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer capitalize ${
                    quarantineFilter === cat
                      ? 'bg-white text-amber-800 font-semibold shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {weaknessReport.totalLeechCount > 0 && onLaunchDrill && (
              <button
                onClick={() => onLaunchDrill('mixed_leeches')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Drill All ({weaknessReport.totalLeechCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quarantine Items Table / Grid */}
        {filteredLeeches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {filteredLeeches.map((item) => (
              <div
                key={item.cardId}
                className="bg-stone-50 border border-stone-200 hover:border-amber-300 rounded-xl p-4 space-y-3 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600 uppercase">
                        {item.itemType}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500">{item.lessonId}</span>
                    </div>
                    <h4 className="text-lg font-bold font-japanese text-stone-900 tracking-wide mt-1">
                      {item.prompt}
                    </h4>
                    {item.reading && item.reading !== item.prompt && (
                      <p className="text-xs text-rose-700 font-japanese font-medium">
                        「{item.reading}」
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono font-bold">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>{item.lapses} Lapses</span>
                    </span>
                    <div className="text-[10px] font-mono text-stone-500">
                      {item.errorCount} fails / {item.reviewCount || item.lapses} reviews
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 space-y-1">
                  <div className="text-stone-600 text-[11px]">
                    <strong>Meaning:</strong> {item.meaning}
                  </div>
                  {item.exampleSentence && (
                    <div className="text-[11px] text-stone-600 font-japanese italic truncate">
                      {item.exampleSentence}
                    </div>
                  )}
                </div>

                {/* Card Item Action Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => onLaunchDrill && onLaunchDrill('mixed_leeches')}
                    className="text-amber-700 hover:text-amber-800 font-medium flex items-center space-x-1 transition cursor-pointer"
                  >
                    <span>Practice in Isolation</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRehabilitate(item.cardId)}
                    disabled={rehabilitatingId === item.cardId}
                    className="px-2.5 py-1 rounded bg-white hover:bg-stone-50 border border-stone-300 hover:border-emerald-500 text-stone-600 hover:text-emerald-700 text-[11px] font-medium transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {rehabilitatingId === item.cardId ? (
                      <RotateCcw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Rehabilitate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3 bg-stone-50 rounded-xl border border-dashed border-stone-300">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-stone-900">Quarantine Zone Clear!</h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                No stubborn leech items currently detected with excessive failure lapses. As you review SRS cards, persistent errors will automatically isolate here.
              </p>
            </div>
            <button
              onClick={handleSeedLeeches}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-medium transition cursor-pointer shadow-2xs"
            >
              Populate Diagnostic Leeches for Testing
            </button>
          </div>
        )}
      </div>

      {/* Conjunctive Scoring Explainer Banner */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-stone-700">
        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-stone-900">Conjunctive Scoring Rule:</strong>
          <span className="text-stone-600">
            In JLPT assessments, high performance in one skill (e.g., Vocabulary at 98%) does not compensate for a failing sub-score in another (e.g., Listening below 80%). The radar polygon highlights where balance is achieved across all 5 areas.
          </span>
        </div>
      </div>
    </div>
  );
};
