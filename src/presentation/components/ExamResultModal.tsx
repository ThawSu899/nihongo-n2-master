import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Flame,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ExamScoreReport } from '../../domain/exam/exam-engine';

interface ExamResultModalProps {
  report: ExamScoreReport;
  quarantinedCount: number;
  onRetake: () => void;
  onExit: () => void;
}

export const ExamResultModal: React.FC<ExamResultModalProps> = ({
  report,
  quarantinedCount,
  onRetake,
  onExit,
}) => {
  const [showReview, setShowReview] = useState<boolean>(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Header Status Banner */}
        <div
          className={`relative overflow-hidden rounded-2xl p-6 border text-center transition-all ${
            report.passed
              ? 'bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-teal-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-gradient-to-br from-rose-950/80 via-zinc-900 to-amber-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex justify-center mb-3">
            {report.passed ? (
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                <Award className="w-9 h-9 text-emerald-400 animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shadow-[0_0_24px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-9 h-9 text-rose-400" />
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {report.passed ? '🎉 စာမေးပွဲ အောင်မြင်ပါသည်!' : '⚠️ မအောင်မြင်သေးပါ'}
          </h2>
          <p className="text-xs sm:text-sm mt-1 text-zinc-300 font-medium">
            {report.passed
              ? `ဂုဏ်ယူပါသည်! သတ်မှတ်ရမှတ် (${report.passThreshold}) ကို ကျော်လွန်အောင်မြင်ခဲ့ပါသည်။`
              : `အောင်မှတ် (${report.passThreshold}) ပြည့်မီရန် လိုအပ်နေပါသေးသည်။ ပြန်လည်ကြိုးစားပါ။`}
          </p>

          {/* Scaled Score Callout */}
          <div className="mt-4 inline-flex items-baseline space-x-2 bg-zinc-950/70 border border-zinc-800 px-6 py-2.5 rounded-full shadow-inner">
            <span className="text-3xl sm:text-4xl font-black font-mono text-white">
              {report.scaledScore}
            </span>
            <span className="text-sm font-bold text-zinc-400">/ 180 မှတ်</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 my-6 space-y-6">
          {/* Section Score Breakdown Grid */}
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
              <span>ကဏ္ဍအလိုက် ရမှတ်များ (Section Breakdown)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vocab Section */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-semibold text-zinc-300">文字・語彙</span>
                  <span className="text-[10px] font-mono text-zinc-500">Vocab</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {report.sections.vocabulary.scaledScore}{' '}
                  <span className="text-xs text-zinc-500 font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {report.sections.vocabulary.correct} / {report.sections.vocabulary.total} မေးခွန်းမှန်
                </div>
              </div>

              {/* Grammar Section */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-semibold text-zinc-300">文法</span>
                  <span className="text-[10px] font-mono text-zinc-500">Grammar</span>
                </div>
                <div className="text-xl font-bold font-mono text-sky-400">
                  {report.sections.grammar.scaledScore}{' '}
                  <span className="text-xs text-zinc-500 font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {report.sections.grammar.correct} / {report.sections.grammar.total} မေးခွန်းမှန်
                </div>
              </div>

              {/* Reading Section */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-semibold text-zinc-300">読解</span>
                  <span className="text-[10px] font-mono text-zinc-500">Reading</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {report.sections.reading.scaledScore}{' '}
                  <span className="text-xs text-zinc-500 font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {report.sections.reading.correct} / {report.sections.reading.total} မေးခွန်းမှန်
                </div>
              </div>
            </div>
          </div>

          {/* FSRS Quarantine Feedback Banner */}
          {quarantinedCount > 0 ? (
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-rose-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-200">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 shrink-0">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-amber-300">
                  FSRS Ghost Cards သို့ သီးသန့်ခွဲထုတ်ပြီးပါပြီ
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  မှားယွင်းခဲ့သော မေးခွန်း <strong>{quarantinedCount}</strong> ခုကို အားနည်းချက်အဖြစ်
                  သတ်မှတ်ပြီး FSRS အယ်လဂိုရီသမ်ဖြင့် အထူးပြန်လည်လေ့ကျင့်ပေးရန် စနစ်ထဲသို့
                  ထည့်သွင်းပြီးပါပြီ။
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>အံ့ဩဖွယ်ရာ! မေးခွန်းအားလုံး မှန်ကန်သဖြင့် Quarantine စာရင်းသို့ ထည့်သွင်းရန် မလိုပါ။</span>
            </div>
          )}

          {/* Review Incorrect Answers Collapsible Section */}
          {report.missedQuestions.length > 0 && (
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between p-4 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>
                    မှားယွင်းခဲ့သော မေးခွန်းများ စစ်ဆေးရန် ({report.missedQuestions.length} ခု)
                  </span>
                </div>
                {showReview ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showReview && (
                <div className="p-4 pt-0 space-y-3 divide-y divide-zinc-800/80">
                  {report.missedQuestions.map((q, idx) => {
                    const ans = report.answers[q.id];
                    return (
                      <div key={q.id} className="pt-3 text-xs space-y-1.5">
                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                          <span className="font-mono font-bold text-zinc-500">#{idx + 1}</span>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                            {q.sectionTitleJa}
                          </span>
                        </div>
                        <div className="font-medium text-zinc-100 whitespace-pre-wrap">{q.prompt}</div>
                        {q.promptMy && (
                          <div className="text-[11px] text-zinc-400 font-burmese">{q.promptMy}</div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1">
                          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 text-rose-300 text-[11px] flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                              သင့်အဖြေ:{' '}
                              <strong>
                                {ans?.selectedChoice ? ans.selectedChoice : 'မဖြေဆိုခဲ့ပါ'}
                              </strong>
                            </span>
                          </div>
                          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-emerald-300 text-[11px] flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              အဖြေမှန်: <strong>{q.correctAnswer}</strong>
                            </span>
                          </div>
                        </div>
                        {q.explanation && (
                          <div className="text-[11px] text-zinc-400 bg-zinc-900/80 rounded-xl p-2.5 mt-1 border border-zinc-800/80">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <span>စာမေးပွဲ ပြန်လည်ဖြေဆိုမည် (Retake)</span>
          </button>
          <button
            onClick={onExit}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition active:scale-98 cursor-pointer"
          >
            <Home className="w-4 h-4 text-emerald-200" />
            <span>ပင်မစာမျက်နှာသို့ (Home)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
