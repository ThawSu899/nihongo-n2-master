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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Header Status Banner */}
        <div
          className={`relative overflow-hidden rounded-2xl p-6 border text-center transition-all ${
            report.passed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex justify-center mb-3">
            {report.passed ? (
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-xs">
                <Award className="w-9 h-9 text-emerald-700 animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-9 h-9 text-rose-700" />
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {report.passed ? '🎉 စာမေးပွဲ အောင်မြင်ပါသည်!' : '⚠️ မအောင်မြင်သေးပါ'}
          </h2>
          <p className="text-xs sm:text-sm mt-1 font-medium text-muted-foreground">
            {report.passed
              ? `ဂုဏ်ယူပါသည်! သတ်မှတ်ရမှတ် (${report.passThreshold}) ကို ကျော်လွန်အောင်မြင်ခဲ့ပါသည်။`
              : `အောင်မှတ် (${report.passThreshold}) ပြည့်မီရန် လိုအပ်နေပါသေးသည်။ ပြန်လည်ကြိုးစားပါ။`}
          </p>

          {/* Scaled Score Callout */}
          <div className="mt-4 inline-flex items-baseline space-x-2 bg-card border border-border px-6 py-2.5 rounded-full shadow-2xs">
            <span className="text-3xl sm:text-4xl font-black font-mono text-foreground">
              {report.scaledScore}
            </span>
            <span className="text-sm font-bold text-muted-foreground">/ 180 မှတ်</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 my-6 space-y-6">
          {/* Section Score Breakdown Grid */}
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span>ကဏ္ဍအလိုက် ရမှတ်များ (Section Breakdown)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vocab Section */}
              <div className="bg-muted/50 border border-border rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">文字・語彙</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Vocab</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  {report.sections.vocabulary.scaledScore}{' '}
                  <span className="text-xs text-muted-foreground font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {report.sections.vocabulary.correct} / {report.sections.vocabulary.total} မေးခွန်းမှန်
                </div>
              </div>

              {/* Grammar Section */}
              <div className="bg-muted/50 border border-border rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">文法</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Grammar</span>
                </div>
                <div className="text-xl font-bold font-mono text-sky-700">
                  {report.sections.grammar.scaledScore}{' '}
                  <span className="text-xs text-muted-foreground font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {report.sections.grammar.correct} / {report.sections.grammar.total} မေးခွန်းမှန်
                </div>
              </div>

              {/* Reading Section */}
              <div className="bg-muted/50 border border-border rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">読解</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Reading</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-700">
                  {report.sections.reading.scaledScore}{' '}
                  <span className="text-xs text-muted-foreground font-normal">/ 60</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {report.sections.reading.correct} / {report.sections.reading.total} မေးခွန်းမှန်
                </div>
              </div>
            </div>
          </div>

          {/* FSRS Quarantine Feedback Banner */}
          {quarantinedCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-900">
              <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 shrink-0">
                <Flame className="w-5 h-5 text-amber-700 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  FSRS Ghost Cards သို့ သီးသန့်ခွဲထုတ်ပြီးပါပြီ
                </p>
                <p className="text-foreground text-[11px] leading-relaxed">
                  မှားယွင်းခဲ့သော မေးခွန်း <strong>{quarantinedCount}</strong> ခုကို အားနည်းချက်အဖြစ်
                  သတ်မှတ်ပြီး FSRS အယ်လဂိုရီသမ်ဖြင့် အထူးပြန်လည်လေ့ကျင့်ပေးရန် စနစ်ထဲသို့
                  ထည့်သွင်းပြီးပါပြီ။
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>အံ့ဩဖွယ်ရာ! မေးခွန်းအားလုံး မှန်ကန်သဖြင့် Quarantine စာရင်းသို့ ထည့်သွင်းရန် မလိုပါ။</span>
            </div>
          )}

          {/* Review Incorrect Answers Collapsible Section */}
          {report.missedQuestions.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden bg-muted/50">
              <button
                onClick={() => setShowReview(!showReview)}
                className="w-full flex items-center justify-between p-4 text-xs font-bold text-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>
                    မှားယွင်းခဲ့သော မေးခွန်းများ စစ်ဆေးရန် ({report.missedQuestions.length} ခု)
                  </span>
                </div>
                {showReview ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {showReview && (
                <div className="p-4 pt-0 space-y-3 divide-y divide-border">
                  {report.missedQuestions.map((q, idx) => {
                    const ans = report.answers[q.id];
                    return (
                      <div key={q.id} className="pt-3 text-xs space-y-1.5">
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground">
                          <span className="font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="px-2 py-0.5 rounded-full bg-card border border-border text-foreground">
                            {q.sectionTitleJa}
                          </span>
                        </div>
                        <div className="font-medium text-foreground whitespace-pre-wrap">{q.prompt}</div>
                        {q.promptMy && (
                          <div className="text-[11px] text-muted-foreground font-burmese">{q.promptMy}</div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1">
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-rose-800 text-[11px] flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              သင့်အဖြေ:{' '}
                              <strong>
                                {ans?.selectedChoice ? ans.selectedChoice : 'မဖြေဆိုခဲ့ပါ'}
                              </strong>
                            </span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-[11px] flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              အဖြေမှန်: <strong>{q.correctAnswer}</strong>
                            </span>
                          </div>
                        </div>
                        {q.explanation && (
                          <div className="text-[11px] text-muted-foreground bg-card rounded-xl p-2.5 mt-1 border border-border">
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
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3 px-5 rounded-2xl bg-muted hover:bg-muted text-foreground font-bold text-xs flex items-center justify-center space-x-2 border border-border transition active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            <span>စာမေးပွဲ ပြန်လည်ဖြေဆိုမည် (Retake)</span>
          </button>
          <button
            onClick={onExit}
            className="flex-1 py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Home className="w-4 h-4 text-indigo-200" />
            <span>ပင်မစာမျက်နှာသို့ (Home)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
