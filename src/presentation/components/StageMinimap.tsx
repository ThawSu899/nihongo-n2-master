import React, { useState } from 'react';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';

export interface StageMinimapItem {
  stage: number;
  shortNameMm: string;
  shortNameEn: string;
  hasQuiz: boolean;
}

export const STAGE_MINIMAP_DEFINITIONS: StageMinimapItem[] = [
  { stage: 1, shortNameMm: 'ရည်မှန်းချက်', shortNameEn: 'Goals', hasQuiz: false },
  { stage: 2, shortNameMm: 'ဝေါဟာရ', shortNameEn: 'Vocab', hasQuiz: false },
  { stage: 3, shortNameMm: 'ခန်းဂျီး', shortNameEn: 'Kanji', hasQuiz: false },
  { stage: 4, shortNameMm: 'သဒ္ဒါ', shortNameEn: 'Grammar', hasQuiz: false },
  { stage: 5, shortNameMm: 'နမူနာဝါကျ', shortNameEn: 'Sentences', hasQuiz: false },
  { stage: 6, shortNameMm: 'လမ်းညွှန်', shortNameEn: 'Practice', hasQuiz: true },
  { stage: 7, shortNameMm: 'အလွတ်မှတ်မိ', shortNameEn: 'Recall', hasQuiz: true },
  { stage: 8, shortNameMm: 'စာဖတ်', shortNameEn: 'Dokkai', hasQuiz: true },
  { stage: 9, shortNameMm: 'နားထောင်', shortNameEn: 'Choukai', hasQuiz: true },
  { stage: 10, shortNameMm: 'လိုက်ဆို', shortNameEn: 'Shadow', hasQuiz: false },
  { stage: 11, shortNameMm: 'မေးခွန်းများ', shortNameEn: 'Mastery Q', hasQuiz: true },
  { stage: 12, shortNameMm: 'SRS ကတ်', shortNameEn: 'SRS Cards', hasQuiz: false },
  { stage: 13, shortNameMm: 'စာမေးပွဲ', shortNameEn: 'Test', hasQuiz: true },
  { stage: 14, shortNameMm: 'ကုစားခြင်း', shortNameEn: 'Remediation', hasQuiz: false },
  { stage: 15, shortNameMm: 'တိုးတက်မှု', shortNameEn: 'Progress', hasQuiz: false },
];

export interface StageMinimapProps {
  currentStage: number;
  completedStages: Set<number>;
  stageAccuracies: Record<number, number | undefined>;
  onJumpToStage: (stage: number) => void;
}

export const StageMinimap: React.FC<StageMinimapProps> = ({
  currentStage,
  completedStages,
  stageAccuracies,
  onJumpToStage,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const completedCount = STAGE_MINIMAP_DEFINITIONS.filter(
    (item) => completedStages.has(item.stage) || item.stage < currentStage
  ).length;

  return (
    <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2">
      {/* Header and Toggle Pill Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="p-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
            <MapPin className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center space-x-1.5 font-medium">
            <span className="font-bold text-stone-900 font-myanmar">
              Stage Minimap (အဆင့် ၁ မှ ၁၅ အမြန်သွားရန်)
            </span>
            <span className="text-stone-400">•</span>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {completedCount}/15 ပြီးစီး
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Shortcuts */}
          <button
            onClick={() => onJumpToStage(13)}
            className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-medium transition cursor-pointer font-mono"
            title="Jump to Stage 13 Test"
          >
            <Zap className="w-3 h-3 text-amber-600" />
            <span>St 13 Test</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition cursor-pointer text-xs font-medium shadow-2xs"
            title={isExpanded ? 'Collapse Stage Minimap' : 'Expand Stage Minimap'}
          >
            <span className="font-myanmar text-[11px] hidden xs:inline">
              {isExpanded ? 'ခေါက်သိမ်းမည်' : 'အပြည့်ဖွင့်မည်'}
            </span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mini Progress Micro-Bar (Always Visible) */}
      <div className="grid grid-cols-15 gap-1 w-full pt-0.5">
        {STAGE_MINIMAP_DEFINITIONS.map((def) => {
          const isDone = completedStages.has(def.stage) || def.stage < currentStage;
          const isCurrent = def.stage === currentStage;
          const accuracy = stageAccuracies[def.stage];

          return (
            <button
              key={def.stage}
              onClick={() => onJumpToStage(def.stage)}
              className={`h-2 rounded-full transition-all cursor-pointer relative group ${
                isCurrent
                  ? 'bg-indigo-600 ring-2 ring-indigo-400 shadow-xs'
                  : isDone
                  ? accuracy !== undefined && accuracy < 60
                    ? 'bg-rose-400'
                    : 'bg-emerald-500'
                  : 'bg-stone-200 hover:bg-stone-300'
              }`}
              title={`Stage ${def.stage}: ${def.shortNameMm} (${def.shortNameEn})${
                accuracy !== undefined ? ` • Accuracy: ${accuracy}%` : ''
              }`}
            />
          );
        })}
      </div>

      {/* Expanded Interactive 15-Stage Minimap Grid */}
      {isExpanded && (
        <div className="pt-2 border-t border-stone-200/80 space-y-2.5 animate-in fade-in duration-150">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {STAGE_MINIMAP_DEFINITIONS.map((def) => {
              const isDone = completedStages.has(def.stage) || def.stage < currentStage;
              const isCurrent = def.stage === currentStage;
              const accuracy = stageAccuracies[def.stage];

              return (
                <button
                  key={def.stage}
                  onClick={() => onJumpToStage(def.stage)}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden active:scale-95 ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400/40 shadow-xs'
                      : isDone
                      ? 'bg-white hover:bg-emerald-50/50 border-stone-200 hover:border-emerald-300'
                      : 'bg-white/80 hover:bg-stone-100 border-stone-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top: Stage number and completion tick */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {def.stage}
                    </span>

                    {/* Completion Tick ✓ */}
                    {isDone && (
                      <span className="flex items-center space-x-0.5 text-emerald-600">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  {/* Middle: Short Name in Burmese & English */}
                  <div className="mt-1">
                    <div className="text-xs font-bold text-stone-900 truncate font-myanmar">
                      {def.shortNameMm}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono truncate">
                      {def.shortNameEn}
                    </div>
                  </div>

                  {/* Bottom: Accuracy badge if quiz stage */}
                  {accuracy !== undefined ? (
                    <div className="mt-1 pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className="text-stone-400">Acc:</span>
                      <span
                        className={
                          accuracy >= 80
                            ? 'text-emerald-700'
                            : accuracy >= 60
                            ? 'text-amber-700'
                            : 'text-rose-600'
                        }
                      >
                        {accuracy}%
                      </span>
                    </div>
                  ) : def.hasQuiz && !isDone ? (
                    <div className="mt-1 pt-1 border-t border-stone-100 text-[9px] font-mono text-stone-400">
                      Quiz Pending
                    </div>
                  ) : isDone ? (
                    <div className="mt-1 pt-1 border-t border-stone-100 text-[9px] font-mono text-emerald-700 font-semibold">
                      ✓ Done
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Quick jump navigation footer */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
            <span className="font-myanmar">
              💡 အဆင့်ခလုတ်ကို နှိပ်၍ သက်ဆိုင်ရာ သင်ခန်းစာအပိုင်းသို့ ချက်ချင်း သွားရောက်နိုင်ပါသည်။
            </span>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => onJumpToStage(1)}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono transition cursor-pointer"
              >
                ⏮ St 1
              </button>
              <button
                onClick={() => onJumpToStage(15)}
                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold transition cursor-pointer"
              >
                🏆 St 15
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
