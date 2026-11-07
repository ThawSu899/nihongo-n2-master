import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Search,
  AlertTriangle,
  X,
  Calendar,
  Layers,
  MessageSquare,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  N5_COUNTERS_TABLE,
  N5_CONVERSATIONAL_EXPRESSIONS,
  N5_CALENDAR_DATES,
  N5_PHONETIC_SHIFTS,
  N5Expression,
  N5CounterEntry,
} from '../../domain/curriculum/n5-expressions-catalog';
import {
  N5_COMMON_MISTAKES_CATALOG,
  N5CommonMistake,
} from '../../domain/curriculum/n5-common-mistakes-catalog';

export interface N5ReferenceWorkbenchProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'counters' | 'expressions' | 'mistakes';
  highlightId?: string;
}

export const N5ReferenceWorkbench: React.FC<N5ReferenceWorkbenchProps> = ({
  isOpen = true,
  onClose,
  initialTab = 'counters',
  highlightId,
}) => {
  const [activeTab, setActiveTab] = useState<'counters' | 'expressions' | 'mistakes'>(initialTab);
  const [counterSubTab, setCounterSubTab] = useState<'tables' | 'dates' | 'shifts'>('tables');

  // Keep activeTab in sync with initialTab prop if updated externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Interactive Number Tester State
  const [testerCounterKey, setTesterCounterKey] = useState<string>('hon');
  const [testerNumber, setTesterNumber] = useState<number>(3);

  // Expression Filters
  const [expressionCategory, setExpressionCategory] = useState<string>('all');
  const [expressionSearch, setExpressionSearch] = useState<string>('');

  // Mistakes Filters
  const [mistakeCategory, setMistakeCategory] = useState<string>('all');
  const [mistakeSearch, setMistakeSearch] = useState<string>('');

  // Native Speech Synthesis
  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Tester calculation
  const currentTesterCounter: N5CounterEntry = N5_COUNTERS_TABLE[testerCounterKey] || N5_COUNTERS_TABLE['tsu'];
  const testerResultItem = currentTesterCounter.items.find((it) => it.count === testerNumber) || currentTesterCounter.items[0];

  // Filtered Expressions
  const filteredExpressions = useMemo(() => {
    return N5_CONVERSATIONAL_EXPRESSIONS.filter((exp) => {
      const matchCat = expressionCategory === 'all' || exp.category === expressionCategory;
      if (!matchCat) return false;
      if (!expressionSearch.trim()) return true;
      const q = expressionSearch.toLowerCase().trim();
      return (
        exp.japanese.toLowerCase().includes(q) ||
        exp.kana.toLowerCase().includes(q) ||
        exp.romaji.toLowerCase().includes(q) ||
        exp.english.toLowerCase().includes(q) ||
        exp.burmese.toLowerCase().includes(q) ||
        exp.situationMy.toLowerCase().includes(q)
      );
    });
  }, [expressionCategory, expressionSearch]);

  // Filtered Common Mistakes
  const filteredMistakes = useMemo(() => {
    return N5_COMMON_MISTAKES_CATALOG.filter((m) => {
      const matchCat = mistakeCategory === 'all' || m.category === mistakeCategory;
      if (!matchCat) return false;
      if (!mistakeSearch.trim()) return true;
      const q = mistakeSearch.toLowerCase().trim();
      return (
        m.incorrect.toLowerCase().includes(q) ||
        m.correct.toLowerCase().includes(q) ||
        m.ruleJa.toLowerCase().includes(q) ||
        m.ruleEn.toLowerCase().includes(q) ||
        m.ruleMy.toLowerCase().includes(q) ||
        m.warningBurmese.toLowerCase().includes(q) ||
        m.detailedExplanationMy.toLowerCase().includes(q)
      );
    });
  }, [mistakeCategory, mistakeSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-5xl bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl"
        >
          {/* Top Header */}
          <div className="px-6 py-4.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/60">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <span>N5 Master Reference Workbench</span>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
                    JLPT N5
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-myanmar">
                  အခြေခံ ရေတွက်ပုံများ၊ အသုံးများသော နှုတ်ဆက်စကားများနှင့် သတိပြုရန် အမှားများ
                </p>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 3 Main Tabs Nav */}
          <div className="px-6 pt-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center space-x-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('counters')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer border-b-2 ${
                activeTab === 'counters'
                  ? 'border-rose-500 text-rose-300 bg-zinc-900/80 shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4 text-rose-400" />
              <span>Counters &amp; Dates (အရေအတွက် ရေတွက်ပုံများ)</span>
            </button>

            <button
              onClick={() => setActiveTab('expressions')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer border-b-2 ${
                activeTab === 'expressions'
                  ? 'border-indigo-500 text-indigo-300 bg-zinc-900/80 shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Expressions &amp; Greetings (နှုတ်ဆက်စကားများ)</span>
            </button>

            <button
              onClick={() => setActiveTab('mistakes')}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition cursor-pointer border-b-2 ${
                activeTab === 'mistakes'
                  ? 'border-amber-500 text-amber-300 bg-zinc-900/80 shadow-sm'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Common Traps (言わない! အမှားများ)</span>
            </button>
          </div>

          {/* Tab Contents Container */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* ========================================================================= */}
            {/* TAB 1: COUNTERS & DATES                                                   */}
            {/* ========================================================================= */}
            {activeTab === 'counters' && (
              <div className="space-y-6">
                {/* Sub-tab navigation */}
                <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
                  <button
                    onClick={() => setCounterSubTab('tables')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      counterSubTab === 'tables'
                        ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    All Counters (~つ, ~人, ~本, ~枚...)
                  </button>
                  <button
                    onClick={() => setCounterSubTab('dates')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      counterSubTab === 'dates'
                        ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Calendar Dates (1日 – 31日)
                  </button>
                  <button
                    onClick={() => setCounterSubTab('shifts')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      counterSubTab === 'shifts'
                        ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    Phonetic Shifts (300, 600, 800, 八百屋...)
                  </button>
                </div>

                {counterSubTab === 'tables' && (
                  <>
                    {/* Interactive Number Tester Hero Card */}
                    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-rose-950/30 border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono font-semibold">
                            <Sparkles className="w-4 h-4" />
                            <span>INTERACTIVE NUMBER TESTER</span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                            အရေအတွက် ရေတွက်ပုံ အစမ်းလေ့ကျင့်ရန်
                          </h3>
                        </div>

                        {/* Select Counter Type */}
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-zinc-400 font-myanmar">ရေတွက်နည်း:</label>
                          <select
                            value={testerCounterKey}
                            onChange={(e) => setTesterCounterKey(e.target.value)}
                            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                          >
                            <option value="hon">本 (~hon / ရှည်လျားသောအရာ)</option>
                            <option value="nin">人 (~nin / လူဦးရေ)</option>
                            <option value="tsu">つ (~tsu / အထွေထွေပစ္စည်း)</option>
                            <option value="mai">枚 (~mai / အပြားချပ်အရာ)</option>
                            <option value="hai">杯 (~hai / အရည်ခွက်)</option>
                            <option value="hiki">匹 (~hiki / တိရစ္ဆာန်အသေး)</option>
                            <option value="satsu">冊 (~satsu / စာအုပ်)</option>
                            <option value="dai">台 (~dai / စက်ပစ္စည်း/ကား)</option>
                          </select>
                        </div>
                      </div>

                      {/* Number Selector Pills 1..10 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            onClick={() => setTesterNumber(num)}
                            className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                              testerNumber === num
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 scale-105 ring-2 ring-rose-400/40'
                                : 'bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* Tester Result Box */}
                      <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl sm:text-3xl font-bold font-japanese text-zinc-100">
                              {testerResultItem.japanese}
                            </span>
                            <span className="text-base text-rose-300 font-japanese">
                              （{testerResultItem.kana}）
                            </span>
                            <button
                              onClick={(e) => handleSpeak(testerResultItem.kana, e)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                              title="အသံထွက် နားထောင်မည်"
                            >
                              <Volume2 className="w-4 h-4 text-rose-400" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-400 font-mono">
                            Romaji: <span className="text-zinc-200">{testerResultItem.romaji}</span> • {testerResultItem.burmese}
                          </p>
                        </div>

                        {/* Irregular Alert Badge */}
                        <div>
                          {testerResultItem.isIrregular ? (
                            <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-950/70 text-amber-300 border border-amber-500/50 text-xs font-medium shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span>အထူး အသံပြောင်းလဲမှု (Irregular Sound Change)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ပုံမှန် အသံထွက် (Regular Reading)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* All Counters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {Object.entries(N5_COUNTERS_TABLE).map(([key, counter]) => (
                        <div
                          key={key}
                          className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition"
                        >
                          <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xl font-bold font-japanese text-rose-300">
                                  {`〜${counter.counterKanji}`}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">
                                  （{counter.counterKana}）
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 font-myanmar mt-0.5">
                                {counter.targetCategoryMy}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-400 block font-mono">မေးခွန်းစကားလုံး:</span>
                              <span className="text-xs font-bold text-amber-300 font-japanese">
                                {counter.questionWord.japanese} ({counter.questionWord.kana})
                              </span>
                            </div>
                          </div>

                          {/* 1-10 Mini Table */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {counter.items.map((it) => (
                              <div
                                key={it.count}
                                className={`p-2 rounded-xl flex items-center justify-between border transition ${
                                  it.isIrregular
                                    ? 'bg-amber-950/30 border-amber-600/40 text-amber-200'
                                    : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-1.5 font-japanese">
                                    <span className="font-bold text-sm">{it.japanese}</span>
                                    <span className="text-[11px] text-zinc-400">({it.kana})</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-myanmar">
                                    {it.burmese}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleSpeak(it.kana, e)}
                                  className="p-1 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                                  title="Play Audio"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Sub-tab: Calendar Dates */}
                {counterSubTab === 'dates' && (
                  <div className="space-y-4">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-300 space-y-1 font-myanmar">
                      <span className="font-bold text-rose-300 block text-sm">
                        📅 ဂျပန်ရက်စွဲ ရေတွက်ပုံ (၁ ရက် မှ ၃၁ ရက်နေ့အထိ)
                      </span>
                      <p className="text-zinc-400 leading-relaxed">
                        ၁ ရက်နေ့မှ ၁၀ ရက်နေ့၊ ၁၄ ရက်နေ့၊ ၂၀ ရက်နေ့နှင့် ၂၄ ရက်နေ့များသည် အထူးအသံထွက်ပြောင်းလဲသဖြင့် မဖြစ်မနေ အလွတ်ကျက်မှတ်ထားရန် လိုအပ်ပါသည်။
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {N5_CALENDAR_DATES.map((date) => (
                        <div
                          key={date.day}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                            date.isIrregular
                              ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 shadow-sm'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold font-japanese text-zinc-100">
                                {date.japanese}
                              </span>
                              <span className="text-xs text-rose-300 font-japanese font-medium">
                                （{date.kana}）
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 font-myanmar">
                              {date.burmese}
                            </div>
                            {date.phoneticNoteMy && (
                              <div className="text-[10px] text-amber-300 font-myanmar">
                                • {date.phoneticNoteMy}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => handleSpeak(date.kana, e)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-tab: Irregular Phonetic Shifts */}
                {counterSubTab === 'shifts' && (
                  <div className="space-y-4">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-300 space-y-1 font-myanmar">
                      <span className="font-bold text-amber-300 block text-sm">
                        ⚡ အထူးအသံပြောင်းလဲမှုများနှင့် အရေးကြီးသော ဂဏန်းဝေါဟာရများ
                      </span>
                      <p className="text-zinc-400 leading-relaxed">
                        ဂဏန်းအရေအတွက်များနှင့် ပေါင်းစပ်ရာတွင် ဖြစ်ပေါ်တတ်သော အသံပျော့ပြောင်းလဲမှု (Rendaku / 連濁) နှင့် အသံတွဲဆက်ပြောင်းလဲမှု (促音化) များကို စုစည်းဖော်ပြထားပါသည်။
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {N5_PHONETIC_SHIFTS.map((shift, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4.5 space-y-2 hover:border-zinc-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-lg font-bold font-japanese text-zinc-100">
                                {shift.baseKanji}
                              </span>
                              <span className="text-sm font-semibold text-rose-300 font-japanese">
                                （{shift.reading}）
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleSpeak(shift.reading, e)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4 text-rose-400" />
                            </button>
                          </div>
                          <div className="text-xs text-zinc-300 font-myanmar font-medium">
                            {shift.burmese}
                          </div>
                          <p className="text-xs text-zinc-400 font-myanmar leading-relaxed">
                            {shift.explanationMy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: SITUATIONAL EXPRESSIONS & GREETINGS                                */}
            {/* ========================================================================= */}
            {activeTab === 'expressions' && (
              <div className="space-y-5">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={expressionSearch}
                      onChange={(e) => setExpressionSearch(e.target.value)}
                      placeholder="နှုတ်ဆက်စကား ရှာဖွေရန် (ဂျပန်၊ အင်္ဂလိပ်၊ မြန်မာ)..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'အားလုံး' },
                      { id: 'greetings', label: 'နှုတ်ဆက်' },
                      { id: 'workplace', label: 'လုပ်ငန်းခွင်' },
                      { id: 'dining', label: 'စားသောက်' },
                      { id: 'hospitality', label: 'ဧည့်ဝတ်' },
                      { id: 'responses', label: 'တုံ့ပြန်စကား' },
                      { id: 'shopping_travel', label: 'ခရီးသွား/ဈေးဝယ်' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setExpressionCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                          expressionCategory === cat.id
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expressions Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredExpressions.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3.5 hover:border-indigo-500/40 transition shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <h3 className="text-lg font-bold font-japanese text-zinc-100 flex items-center gap-2">
                            <span>{exp.japanese}</span>
                          </h3>
                          <div className="text-xs text-indigo-300 font-mono">
                            {exp.romaji}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleSpeak(exp.japanese, e)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                          title="အသံထွက် နားထောင်မည်"
                        >
                          <Volume2 className="w-4 h-4 text-indigo-400" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs font-myanmar">
                        <p className="text-zinc-200 font-semibold leading-relaxed">
                          {exp.burmese}
                        </p>
                        <p className="text-zinc-400 font-mono text-[11px]">
                          En: {exp.english}
                        </p>
                      </div>

                      {/* Usage Situation & Cultural Nuance */}
                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-1.5 text-xs font-myanmar">
                        <div className="text-zinc-400">
                          <span className="text-indigo-400 font-semibold">သုံးစွဲရမည့် အခြေအနေ: </span>
                          {exp.situationMy}
                        </div>
                        {exp.nuanceMy && (
                          <div className="text-amber-300/90 text-[11px]">
                            <span className="font-semibold text-amber-300">မှတ်ချက်: </span>
                            {exp.nuanceMy}
                          </div>
                        )}
                      </div>

                      {/* Example Dialogue if present */}
                      {exp.exampleDialogues && exp.exampleDialogues.length > 0 && (
                        <div className="bg-zinc-950/50 rounded-xl p-2.5 space-y-1 text-xs border border-zinc-800/60">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                            နမူနာ စကားပြောခန်း (Dialogue Example):
                          </span>
                          {exp.exampleDialogues.map((dlg, dIdx) => (
                            <div key={dIdx} className="space-y-0.5">
                              <div className="flex items-baseline space-x-1 font-japanese text-zinc-200">
                                <span className="text-indigo-400 font-bold">{dlg.speaker}:</span>
                                <span>{dlg.ja}</span>
                              </div>
                              <div className="text-[11px] text-zinc-400 font-myanmar pl-3">
                                {dlg.my}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredExpressions.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-xs font-myanmar">
                    ရှာဖွေမှုနှင့် ကိုက်ညီသော နှုတ်ဆက်စကား မရှိပါ။
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: COMMON MISTAKES & LEARNER TRAPS (言わない!)                        */}
            {/* ========================================================================= */}
            {activeTab === 'mistakes' && (
              <div className="space-y-5">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={mistakeSearch}
                      onChange={(e) => setMistakeSearch(e.target.value)}
                      placeholder="သတိပြုရန် အမှားများ ရှာဖွေရန် (ဥပမာ 寒い, 知っ, 帽子, きれい)..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'အားလုံး' },
                      { id: 'i_adjective', label: 'い-Adjectives' },
                      { id: 'na_adjective', label: 'な-Adjectives' },
                      { id: 'verb_state', label: 'Verbs (知る)' },
                      { id: 'wear_verb', label: 'ဝတ်ဆင်ခြင်း (着る)' },
                      { id: 'particle_reciprocal', label: 'ဝိဘတ် (と/に)' },
                      { id: 'particle_motion', label: 'လမ်းကြောင်း (を/に)' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMistakeCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                          mistakeCategory === cat.id
                            ? 'bg-amber-600 text-white font-semibold shadow-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Traps Contrastive Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredMistakes.map((mistake) => (
                    <div
                      key={mistake.id}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 space-y-4 hover:border-amber-500/50 transition shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        {/* Incorrect vs Correct Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* ❌ Incorrect */}
                          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-1">
                            <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-xs font-mono">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span>言わない! (Don&apos;t say)</span>
                            </div>
                            <div className="text-base font-bold font-japanese text-rose-200 line-through">
                              {mistake.incorrect}
                            </div>
                          </div>

                          {/* ⭕ Correct */}
                          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs font-mono">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>○ Correct (အမှန်)</span>
                              </div>
                              <button
                                onClick={(e) => handleSpeak(mistake.correct.replace('○ ', ''), e)}
                                className="p-1 rounded text-zinc-400 hover:text-white"
                                title="Play Audio"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </div>
                            <div className="text-base font-bold font-japanese text-emerald-200">
                              {mistake.correct}
                            </div>
                          </div>
                        </div>

                        {/* Burmese Rule Warning */}
                        <div className="text-xs text-amber-300 font-myanmar font-semibold">
                          {mistake.warningBurmese}
                        </div>

                        {/* Explanation Rationale */}
                        <div className="text-xs text-zinc-300 font-myanmar leading-relaxed bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
                          <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                            ဘာသာစကားဆိုင်ရာ ရှင်းလင်းချက် (Rationale):
                          </span>
                          <p className="whitespace-pre-line text-zinc-300">
                            {mistake.detailedExplanationMy}
                          </p>
                        </div>

                        {/* Example Sentences */}
                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">
                            ဝါကျတွင်း နှိုင်းယှဉ်ချက် (Context):
                          </span>
                          <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-1 font-japanese">
                            <div className="text-rose-400 line-through text-xs">
                              {mistake.exampleContext.incorrectSentence}
                            </div>
                            <div className="text-emerald-300 text-xs font-medium">
                              {mistake.exampleContext.correctSentence}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-myanmar font-sans pt-0.5">
                              {mistake.exampleContext.sentenceMy}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredMistakes.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-xs font-myanmar">
                    ရှာဖွေမှုနှင့် ကိုက်ညီသော အမှားပုံစံ မရှိပါ။
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
