import React, { useMemo } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export interface LevelMasteryStat {
  level: 'N5' | 'N4' | 'N3' | 'N2';
  totalLessons: number;
  completedLessons: number;
  totalVocab: number;
  masteredVocab: number;
  accentColor: string;
  glowBorder: string;
}

export interface LevelMasteryWidgetProps {
  stats: Record<'N5' | 'N4' | 'N3' | 'N2', { completedLessons: number; masteredVocab: number }>;
  onSelectLevel: (level: 'N5' | 'N4' | 'N3' | 'N2') => void;
}

const LEVEL_CONFIGS: Record<
  'N5' | 'N4' | 'N3' | 'N2',
  { totalLessons: number; totalVocab: number; accent: string; glow: string; badgeBg: string }
> = {
  N5: {
    totalLessons: 30,
    totalVocab: 900,
    accent: 'from-emerald-500 to-teal-600',
    glow: 'border-emerald-500/30 hover:border-emerald-500/60',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  N4: {
    totalLessons: 36,
    totalVocab: 1080,
    accent: 'from-sky-500 to-indigo-600',
    glow: 'border-sky-500/30 hover:border-sky-500/60',
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  N3: {
    totalLessons: 48,
    totalVocab: 1440,
    accent: 'from-amber-500 to-orange-600',
    glow: 'border-amber-500/30 hover:border-amber-500/60',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  N2: {
    totalLessons: 60,
    totalVocab: 1800,
    accent: 'from-rose-500 to-purple-600',
    glow: 'border-rose-500/30 hover:border-rose-500/60',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
};

export const LevelMasteryWidget: React.FC<LevelMasteryWidgetProps> = ({ stats, onSelectLevel }) => {
  const levels: ('N5' | 'N4' | 'N3' | 'N2')[] = ['N5', 'N4', 'N3', 'N2'];

  const { totalCompletedLessons, totalMasteredVocab, overallLessonPercent, overallVocabPercent } =
    useMemo(() => {
      const lessons = levels.reduce((acc, lvl) => acc + (stats[lvl]?.completedLessons || 0), 0);
      const vocab = levels.reduce((acc, lvl) => acc + (stats[lvl]?.masteredVocab || 0), 0);
      return {
        totalCompletedLessons: lessons,
        totalMasteredVocab: vocab,
        overallLessonPercent: Math.min(100, Math.round((lessons / 174) * 100)),
        overallVocabPercent: Math.min(100, Math.round((vocab / 5220) * 100)),
      };
    }, [stats]);

  return (
    <section
      aria-label="JLPT Level Progress & Mastery"
      className="w-full bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-stone-900 font-bold text-base sm:text-lg flex items-center gap-2">
              JLPT Level Progress &amp; Mastery
              <span className="text-xs font-mono font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                N5–N2
              </span>
            </h3>
            <p className="text-stone-600 text-xs font-burmese mt-0.5">
              အဆင့်အလိုက် သင်ခန်းစာများနှင့် ဝေါဟာရ ကျွမ်းကျင်မှု တိုးတက်မှု အခြေအနေ
            </p>
          </div>
        </div>

        {/* Global Curriculum Progress Indicators */}
        <div className="flex items-center gap-4 text-xs font-mono bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-auto">
          <div>
            <div className="text-stone-900 font-bold">
              {`${totalCompletedLessons} `}<span className="text-zinc-500">/ 174</span>
            </div>
            <div className="text-[10px] text-stone-500">{`Lessons (${overallLessonPercent}%)`}</div>
          </div>
          <div className="h-6 w-[1px] bg-stone-200" />
          <div>
            <div className="text-stone-900 font-bold">
              {`${totalMasteredVocab} `}<span className="text-zinc-500">/ 5,220</span>
            </div>
            <div className="text-[10px] text-stone-500">{`Vocab (${overallVocabPercent}%)`}</div>
          </div>
        </div>
      </div>

      {/* 4-Level Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((lvl) => {
          const cfg = LEVEL_CONFIGS[lvl];
          const cur = stats[lvl] || { completedLessons: 0, masteredVocab: 0 };
          const lessonPercent = Math.min(
            100,
            Math.round((cur.completedLessons / cfg.totalLessons) * 100)
          );
          const vocabPercent = Math.min(
            100,
            Math.round((cur.masteredVocab / cfg.totalVocab) * 100)
          );

          return (
            <div
              key={lvl}
              onClick={() => onSelectLevel(lvl)}
              className="group relative overflow-hidden rounded-2xl bg-stone-50/70 border border-stone-200 hover:border-indigo-300 p-4.5 hover:bg-white transition-all duration-300 cursor-pointer hover:scale-[1.02] shadow-xs hover:shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Level Title & Badge */}
                <div className="flex items-center justify-between mb-3.5">
                  <span
                    className={`text-xl font-black bg-gradient-to-r ${cfg.accent} bg-clip-text text-transparent`}
                  >
                    {`JLPT ${lvl}`}
                  </span>
                  <span
                    className={`text-[11px] font-mono border px-2 py-0.5 rounded-full ${cfg.badgeBg}`}
                  >
                    {`${cur.completedLessons}/${cfg.totalLessons} Lessons`}
                  </span>
                </div>

                {/* Progress Bar: Lessons */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-stone-500" /> သင်ခန်းစာ
                    </span>
                    <span className="font-mono text-stone-800 font-semibold">{`${lessonPercent}%`}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cfg.accent} transition-all duration-500`}
                      style={{ width: `${lessonPercent}%` }}
                    />
                  </div>
                </div>

                {/* Progress Bar: Vocabularies */}
                <div className="space-y-1.5 mb-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" /> ဝေါဟာရ ကျွမ်းကျင်မှု
                    </span>
                    <span className="font-mono text-stone-800 font-semibold">{`${vocabPercent}%`}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cfg.accent} transition-all duration-500`}
                      style={{ width: `${vocabPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono text-right">
                    {`${cur.masteredVocab}/${cfg.totalVocab} Vocab`}
                  </div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="flex items-center justify-between pt-2.5 border-t border-stone-200 text-xs text-stone-500 group-hover:text-stone-900 transition-colors">
                <span className="font-burmese text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> အသေးစိတ်လေ့လာရန်
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
