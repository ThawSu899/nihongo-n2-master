import React, { useState, useMemo } from 'react';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Flame,
  Zap,
  Target,
  ChevronRight,
  BookOpen,
  Headphones,
  Sparkles,
} from 'lucide-react';
import {
  JLPTLevel,
  JLPTScoringEngine,
  JLPTExamSimulationReport,
} from '../../domain/assessment/jlpt-scoring-engine';
import { QuestionSkill } from '../../domain/models/types';

interface JLPTSectionalScoringCardProps {
  currentLevel: JLPTLevel;
  skillAccuracies: Partial<Record<QuestionSkill, number>>;
  onLaunchDrill?: (skill?: QuestionSkill | 'mixed_leeches') => void;
}

export const JLPTSectionalScoringCard: React.FC<JLPTSectionalScoringCardProps> = ({
  currentLevel,
  skillAccuracies,
  onLaunchDrill,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(currentLevel || 'N2');

  const report: JLPTExamSimulationReport = useMemo(() => {
    return JLPTScoringEngine.simulateOfficialReport(selectedLevel, skillAccuracies);
  }, [selectedLevel, skillAccuracies]);

  const levelOptions: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2'];

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header and Level Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold font-mono uppercase">
              <Award className="w-3.5 h-3.5" />
              <span>Official JLPT Scaled Scoring Engine</span>
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-500 font-medium">180-Point Scaled Simulation</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1">
            JLPT အမှတ်ပေးစနစ်နှင့် ကဏ္ဍအလိုက် အနိမ့်ဆုံးသတ်မှတ်ချက် (基準点)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            တရားဝင် JLPT စာမေးပွဲ အောင်မြင်ရန် စုစုပေါင်းရမှတ် ပြည့်မီရုံသာမက ကဏ္ဍတိုင်းတွင် အနိမ့်ဆုံးသတ်မှတ်ချက် (基準点) ကျော်လွန်ရပါမည်။
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
          {levelOptions.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Score & Status Hero Banner */}
      <div
        className={`rounded-2xl p-5 border transition-all ${
          report.status === 'passed'
            ? 'bg-emerald-50/70 border-emerald-200'
            : report.status === 'sectional_disqualified'
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-rose-50/60 border-rose-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Score readout */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                  report.status === 'passed'
                    ? 'bg-emerald-600 text-white'
                    : report.status === 'sectional_disqualified'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {report.statusLabelJa}
              </span>
              <span className="text-xs font-bold text-stone-800">{report.statusLabelMm}</span>
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-stone-900">
                {report.totalScaledScore}
              </span>
              <span className="text-sm font-mono text-stone-500">/ {report.totalMaxScore} 点</span>
              <span className="text-xs font-mono font-medium text-stone-600 bg-white/80 px-2.5 py-1 rounded-lg border border-stone-200">
                Pass Mark (合格点): ≥ {report.totalPassScore} 点
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
              {report.status === 'passed' && (
                <span>
                  ဂုဏ်ယူပါသည်။ စုစုပေါင်းရမှတ် ({report.totalScaledScore}/{report.totalMaxScore}) ပြည့်မီသည့်အပြင် ကဏ္ဍအားလုံး၏ အနိမ့်ဆုံးသတ်မှတ်ချက် (基準点) ကို ကျော်လွန်အောင်မြင်ထားပါသည်။
                </span>
              )}
              {report.status === 'sectional_disqualified' && (
                <span className="text-amber-900 font-medium">
                  <strong>သတိပြုရန် (足切り):</strong> စုစုပေါင်းရမှတ် ({report.totalScaledScore}/{report.totalMaxScore}) သည် သတ်မှတ်အောင်မှတ်ထက် ကျော်လွန်သော်လည်း အချို့ကဏ္ဍများတွင် အနိမ့်ဆုံးသတ်မှတ်ချက် (基準点) မပြည့်မီသဖြင့် တရားဝင် စာမေးပွဲတွင် ကျရှုံးမည်ဖြစ်ပါသည်။ အားနည်းသော ကဏ္ဍကို အထူးပြန်လည်လေ့ကျင့်ပါ။
                </span>
              )}
              {report.status === 'failed' && (
                <span>
                  စုစုပေါင်းရမှတ်သည် သတ်မှတ်အောင်မှတ် ({report.totalPassScore} 点) သို့ မရောက်ရှိသေးပါ။ နေ့စဉ်လေ့လာမှုဖြင့် အားနည်းချက်များကို ဖြည့်ဆည်းပါ။
                </span>
              )}
            </p>
          </div>

          {/* Right: Dual condition checklists */}
          <div className="bg-white/90 backdrop-blur-xs border border-stone-200/80 rounded-xl p-3.5 space-y-2.5 shrink-0 min-w-[240px]">
            <div className="text-[11px] font-mono uppercase font-bold text-stone-500">
              Pass Criteria Verification (စစ်ဆေးချက်)
            </div>

            {/* Condition 1: Overall Score */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700">1. စုစုပေါင်းရမှတ် (≥ {report.totalPassScore} 点):</span>
              <span className="flex items-center space-x-1 font-bold">
                {report.passedOverall ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">ပြည့်မီ</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-rose-700">မပြည့်မီ</span>
                  </>
                )}
              </span>
            </div>

            {/* Condition 2: Sectional Minimum (基準点) */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700">2. ကဏ္ဍစုံ 基準点 ပြည့်မီမှု:</span>
              <span className="flex items-center space-x-1 font-bold">
                {report.passedSectional ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">ပြည့်မီ</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-rose-700">မပြည့်မီ (足切り)</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sectional Cutoffs Breakdown Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase text-stone-700 tracking-wider flex items-center space-x-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Official Sectional Minimum Cutoffs Breakdown (ကဏ္ဍအလိုက် 基準点)</span>
          </h3>
          <span className="text-[11px] font-mono text-stone-500">
            {selectedLevel} Exam Structure
          </span>
        </div>

        <div
          className={`grid gap-3.5 ${
            report.sections.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
          }`}
        >
          {report.sections.map((sec) => (
            <div
              key={sec.id}
              className={`rounded-xl border p-4 space-y-3 transition relative overflow-hidden ${
                sec.passed
                  ? 'bg-stone-50/60 border-stone-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-stone-900 leading-snug">
                    {sec.nameJa}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                    {sec.nameMm}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${
                    sec.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {sec.passed ? '合格' : `基準点未達 (-${sec.deficit})`}
                </span>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black font-mono text-stone-900">
                    {sec.scaledScore}
                  </span>
                  <span className="text-xs font-mono text-stone-500"> / {sec.maxScore} 点</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-stone-500 block">基準点 Cutoff</span>
                  <span className="text-xs font-mono font-bold text-stone-700">
                    ≥ {sec.cutoffScore} 点
                  </span>
                </div>
              </div>

              {/* Progress bar with cutoff notch indicator */}
              <div className="space-y-1">
                <div className="relative w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sec.passed ? 'bg-indigo-600' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, (sec.scaledScore / sec.maxScore) * 100)}%` }}
                  />
                  {/* Cutoff Marker notch */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-500"
                    title={`Cutoff: ${sec.cutoffScore} points`}
                    style={{ left: `${(sec.cutoffScore / sec.maxScore) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-400">
                  <span>0</span>
                  <span className="text-amber-700 font-bold">Cutoff {sec.cutoffScore}</span>
                  <span>{sec.maxScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WEAKEST DOMAIN DIAGNOSTICS & BURMESE ACTIONABLE STUDY ADVICE */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold font-mono">
              <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>အားနည်းချက် သုံးသပ်ချက် (Domain Diagnostics)</span>
            </span>
            <span className="text-xs text-stone-600 font-medium">
              အနိမ့်ဆုံး စွမ်းဆောင်ရည်: <strong>{report.weakestDomain.titleJa}</strong> ({report.weakestDomain.titleMm})
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-rose-700 self-start sm:self-auto">
            စွမ်းဆောင်ရည်: {report.weakestDomain.accuracyPct}% (လိုငွေ: -{report.weakestDomain.deficitPct}%)
          </span>
        </div>

        {/* 3 Domains Comparison Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {report.allDomains.map((dom) => {
            const isWeakest = dom.domain === report.weakestDomain.domain;
            return (
              <div
                key={dom.domain}
                className={`p-3 rounded-xl border transition ${
                  isWeakest
                    ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-200'
                    : 'bg-white border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">{dom.titleJa}</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      dom.accuracyPct >= 60 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {dom.accuracyPct}%
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">{dom.titleMm}</div>
              </div>
            );
          })}
        </div>

        {/* Burmese Actionable Study Advice */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-900">
                တိုက်ရိုက်လေ့လာရန် လမ်းညွှန်ချက် (Study Action Plan):
              </h4>
              <p className="text-xs text-stone-700 leading-relaxed">
                {report.weakestDomain.burmeseAdvice}
              </p>
            </div>
          </div>

          {/* Drill shortcut button */}
          {onLaunchDrill && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => onLaunchDrill(report.weakestDomain.drillSkill)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{report.weakestDomain.actionTitle}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
