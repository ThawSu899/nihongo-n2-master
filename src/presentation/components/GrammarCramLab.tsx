import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as wanakana from 'wanakana';
import {
  Flame,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Volume2,
  ChevronRight,
  HelpCircle,
  ArrowLeft,
  BookOpen,
  Heart,
  Scale,
  Compass,
  Repeat,
  Bug,
  ShieldCheck,
  Check,
  X,
  Award,
  Clock,
  Shuffle,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, CramDrillRecord } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import { NuanceInterceptor, NuanceCheckResult } from '../../domain/srs/nuance-interceptor';
import { NuanceWarningBanner } from './NuanceWarningBanner';
import { useGlobalShortcuts, useScopedShortcuts } from '../context/GlobalShortcutContext';

export type CramCategoryKey =
  | 'conditions'
  | 'emotions'
  | 'assertions'
  | 'tendencies'
  | 'simultaneous'
  | 'ghosts'
  | 'all';

export type CramDrillMode = 'cloze' | 'multiple_choice';

export interface CramQuestion {
  id: string;
  grammarPattern: string;
  category: CramCategoryKey;
  sentenceWithBlank: string;
  prefix: string;
  suffix: string;
  target: string;
  choices: [string, string, string, string];
  meaningEn: string;
  meaningMy: string;
  formation: string;
  hint: string;
  explanationEn: string;
  explanationMy: string;
}

export interface GrammarCategoryMeta {
  key: CramCategoryKey;
  titleEn: string;
  titleMy: string;
  patterns: string[];
  descriptionEn: string;
  descriptionMy: string;
  icon: React.ReactNode;
  accentGlow: string;
  badgeClass: string;
}

export const CRAM_CATEGORIES: GrammarCategoryMeta[] = [
  {
    key: 'conditions',
    titleEn: 'Conditions & Hypotheses',
    titleMy: 'အခြေအနေနှင့် ယူဆချက်များ',
    patterns: ['ものなら', 'としたら', 'ないことには'],
    descriptionEn: 'Unlikely wishes, hypothetical assumptions, and indispensable prerequisites.',
    descriptionMy: 'ဖြစ်နိုင်ခြေနည်းသော ဆန္ဒများ၊ ယူဆချက်များနှင့် မဖြစ်မနေ လိုအပ်ချက်များ။',
    icon: <Compass className="w-5 h-5 text-emerald-400" />,
    accentGlow: 'hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.2)]',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  {
    key: 'emotions',
    titleEn: 'Emotions & Empathy',
    titleMy: 'ခံစားချက်နှင့် စိတ်လှုပ်ရှားမှုများ',
    patterns: ['てたまらない', 'てならない', 'ないではいられない'],
    descriptionEn: 'Overwhelming sensations, psychological intuitions, and irresistible impulses.',
    descriptionMy: 'မခံမရပ်နိုင်သော ခံစားမှု၊ သဘာဝအလျောက် စိတ်ထဲဖြစ်ပေါ်မှုနှင့် မနေနိုင်သော စိတ်ခံစားမှုများ။',
    icon: <Heart className="w-5 h-5 text-rose-400" />,
    accentGlow: 'hover:border-rose-500/50 hover:shadow-[0_0_24px_rgba(244,63,94,0.2)]',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  },
  {
    key: 'assertions',
    titleEn: 'Judgments & Assertions',
    titleMy: 'ဆုံးဖြတ်ချက်နှင့် အခိုင်အမာဆိုခြင်း',
    patterns: ['に決まっている', 'にほかならない', 'にすぎない'],
    descriptionEn: 'Strong subjective conviction, exclusive causation, and modest limitation.',
    descriptionMy: 'လုံးဝသေချာကြောင်း အခိုင်အမာဆိုခြင်း၊ အဓိကအကြောင်းအရင်းနှင့် ကန့်သတ်ဖော်ပြခြင်းများ။',
    icon: <Scale className="w-5 h-5 text-indigo-400" />,
    accentGlow: 'hover:border-indigo-500/50 hover:shadow-[0_0_24px_rgba(99,102,241,0.2)]',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
  },
  {
    key: 'tendencies',
    titleEn: 'Tendencies & States',
    titleMy: 'သဘောထားနှင့် အခြေအနေများ',
    patterns: ['がち', '気味', 'きり'],
    descriptionEn: 'Frequent negative tendencies, mild symptoms, and persistent single states.',
    descriptionMy: 'ဖြစ်လေ့ဖြစ်ထရှိသော သဘောထား၊ အနည်းငယ် လက္ခဏာပြခြင်းနှင့် နောက်ဆက်တွဲအခြေအနေများ။',
    icon: <Repeat className="w-5 h-5 text-amber-400" />,
    accentGlow: 'hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.2)]',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  {
    key: 'simultaneous',
    titleEn: 'Simultaneous Actions & Changes',
    titleMy: 'တစ်ပြိုင်နက်လုပ်ဆောင်ချက်များ',
    patterns: ['ついでに', 'つつある', 'つつ'],
    descriptionEn: 'Opportunistic secondary actions, gradual changes, and formal simultaneous contrasts.',
    descriptionMy: 'ကြုံတုန်း လုပ်ဆောင်ခြင်း၊ တဖြည်းဖြည်း ပြောင်းလဲနေဆဲ အခြေအနေများနှင့် တစ်ပြိုင်နက်တည်း ပြုလုပ်ခြင်း။',
    icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    accentGlow: 'hover:border-cyan-500/50 hover:shadow-[0_0_24px_rgba(6,182,212,0.2)]',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
  },
  {
    key: 'ghosts',
    titleEn: 'Lapsed Ghosts & Leeches',
    titleMy: 'အခက်အခဲရှိသော သဒ္ဒါများ (Ghosts)',
    patterns: ['Leech Items', 'Repeated Lapses'],
    descriptionEn: 'Targeted unranked sprints on quarantined items and persistent review hurdles.',
    descriptionMy: 'SRS တွင် အကြိမ်ကြိမ် မှားယွင်းခဲ့သော သဒ္ဒါများကို သီးသန့် အထူးလေ့ကျင့်ခြင်း။',
    icon: <Bug className="w-5 h-5 text-rose-500" />,
    accentGlow: 'hover:border-rose-600/50 hover:shadow-[0_0_24px_rgba(225,29,72,0.25)]',
    badgeClass: 'bg-rose-950 text-rose-300 border-rose-600/50',
  },
  {
    key: 'all',
    titleEn: 'All Published N2 Grammar',
    titleMy: 'အားလုံး ရောနှော လေ့ကျင့်မည်',
    patterns: ['15 Curated N2 Patterns'],
    descriptionEn: 'Full spectrum mixed cram sprint spanning every published N2 grammar topic.',
    descriptionMy: 'N2 သဒ္ဒါအမျိုးအစား အားလုံးကို ရောနှော၍ စုံလင်စွာ လေ့ကျင့်ခြင်း။',
    icon: <Flame className="w-5 h-5 text-amber-400 animate-pulse" />,
    accentGlow: 'hover:border-amber-400/50 hover:shadow-[0_0_24px_rgba(251,191,36,0.25)]',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-400/50',
  },
];

export const CRAM_QUESTION_BANK: CramQuestion[] = [
  // --- CONDITIONS & HYPOTHESES ---
  {
    id: 'cram_cond_01',
    grammarPattern: 'ものなら',
    category: 'conditions',
    sentenceWithBlank: '戻れる____、あの学生時代に戻ってやり直したい。',
    prefix: '戻れる',
    suffix: '、あの学生時代に戻ってやり直したい。',
    target: 'ものなら',
    choices: ['ものなら', 'としたら', 'ないことには', 'ながら'],
    meaningEn: 'If I could return, I would want to go back to my student days and start over.',
    meaningMy: 'ပြန်သွားနိုင်မည်ဆိုပါက ထိုကျောင်းသားဘဝသို့ ပြန်သွားပြီး အစမှ ပြန်စချင်ပါသည်။',
    formation: 'Verb [Potential / Dictionary Form] + ものなら',
    hint: 'Unlikely or impossible desire (V[可能形] + ものなら)',
    explanationEn: '「〜ものなら」 expresses an impossible or highly unlikely desire or wish.',
    explanationMy: '「〜ものなら」 သည် လက်တွေ့တွင် မဖြစ်နိုင်သော / ဖြစ်ရန် အလွန်ခဲယဉ်းသော ဆန္ဒကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_cond_02',
    grammarPattern: 'ものなら',
    category: 'conditions',
    sentenceWithBlank: '彼が約束を守る____、最初からこんなに苦労はしない。',
    prefix: '彼が約束を守る',
    suffix: '、最初からこんなに苦労はしない。',
    target: 'ものなら',
    choices: ['ものなら', 'としたら', 'ないことには', 'つつ'],
    meaningEn: 'If he would actually keep his promise, we would not have struggled this much from the start.',
    meaningMy: 'သူသာ ကတိတည်မည်ဆိုလျှင် အစကတည်းက ဤမျှ ဒုက္ခရောက်မည် မဟုတ်ပါ။',
    formation: 'Verb [Dictionary Form] + ものなら',
    hint: 'Skeptical / improbable condition',
    explanationEn: 'Indicates extreme skepticism that the action will actually occur.',
    explanationMy: 'သူကတိတည်ရန် အခွင့်အလမ်း အလွန်နည်းပါးသည်ဟု ယူဆ၍ ပြောဆိုခြင်းဖြစ်သည်။',
  },
  {
    id: 'cram_cond_03',
    grammarPattern: 'としたら',
    category: 'conditions',
    sentenceWithBlank: 'もし明日世界が終わる____、あなたは何をしますか。',
    prefix: 'もし明日世界が終わる',
    suffix: '、あなたは何をしますか。',
    target: 'としたら',
    choices: ['としたら', 'ものなら', 'ないことには', 'がち'],
    meaningEn: 'Supposing the world were to end tomorrow, what would you do?',
    meaningMy: 'အကယ်၍ မနက်ဖြန် ကမ္ဘာပျက်မည်ဆိုပါက သင် ဘာလုပ်မည်နည်း။',
    formation: 'Plain Form + としたら',
    hint: 'Neutral hypothetical assumption ("supposing that...")',
    explanationEn: '「〜としたら」 posits a hypothetical scenario for open consideration.',
    explanationMy: '「〜としたら」 သည် အကယ်၍သာ ဤသို့ဖြစ်ခဲ့လျှင် ဟူသော ဘက်မလိုက်သည့် ယူဆချက်ဖြစ်သည်။',
  },
  {
    id: 'cram_cond_04',
    grammarPattern: 'としたら',
    category: 'conditions',
    sentenceWithBlank: 'その話が本当だ____、すぐに警察に通報するべきだ。',
    prefix: 'その話が本当だ',
    suffix: '、すぐに警察に通報するべきだ。',
    target: 'としたら',
    choices: ['としたら', 'ものなら', 'ないことには', 'きり'],
    meaningEn: 'If that story is true, we should report it to the police immediately.',
    meaningMy: 'ထိုစကားသာ အမှန်ဖြစ်ပါက ရဲစခန်းသို့ ချက်ချင်း အကြောင်းကြားသင့်သည်။',
    formation: 'Plain Form (Noun + だ) + としたら',
    hint: 'Hypothetical premise requiring urgent action',
    explanationEn: 'Supposing the premise is factual, the resulting logical action follows.',
    explanationMy: 'ထိုအချက်သာ အမှန်ဖြစ်ခဲ့လျှင် ချက်ချင်းလုပ်ဆောင်သင့်သော ကိစ္စကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_cond_05',
    grammarPattern: 'ないことには',
    category: 'conditions',
    sentenceWithBlank: '実際にやってみ____、できるかどうかわからない。',
    prefix: '実際にやってみ',
    suffix: '、できるかどうかわからない。',
    target: 'ないことには',
    choices: ['ないことには', 'ものなら', 'としたら', 'ついでに'],
    meaningEn: 'Unless you actually try it, you will never know whether you can do it.',
    meaningMy: 'လက်တွေ့ စမ်းမလုပ်ကြည့်ဘဲနှင့် လုပ်နိုင်မလုပ်နိုင် သိနိုင်မည် မဟုတ်ပါ။',
    formation: 'Verb [ない-form] + ことには',
    hint: 'Indispensable prerequisite: "Unless X happens, Y cannot..."',
    explanationEn: '「〜ないことには...ない」 indicates that action X is an absolute condition for result Y.',
    explanationMy: '「〜ないことには」 သည် ရှေ့ကိစ္စ မလုပ်ဆောင်ဘဲ နောက်ကိစ္စ မဖြစ်မြောက်နိုင်ကြောင်း ဖော်ပြသည်။',
  },
  {
    id: 'cram_cond_06',
    grammarPattern: 'ないことには',
    category: 'conditions',
    sentenceWithBlank: '本人の同意を得____、手術を始めることはできない。',
    prefix: '本人の同意を得',
    suffix: '、手術を始めることはできない。',
    target: 'ないことには',
    choices: ['ないことには', 'としたら', 'ものなら', 'つつある'],
    meaningEn: 'Unless we obtain the patient\'s personal consent, we cannot begin the surgery.',
    meaningMy: 'ကာယကံရှင်၏ သဘောတူညီချက် မရရှိဘဲ ခွဲစိတ်မှုကို စတင်နိုင်မည် မဟုတ်ပါ။',
    formation: 'Verb [ない-form] + ことには',
    hint: 'Prerequisite condition followed by negative potential',
    explanationEn: 'Consent is an essential requirement without which the procedure cannot proceed.',
    explanationMy: 'သဘောတူညီချက်မရရှိဘဲ မည်သို့မျှ ဆက်လက်ဆောင်ရွက်၍ မရနိုင်ကြောင်း ဖော်ပြသည်။',
  },

  // --- EMOTIONS & EMPATHY ---
  {
    id: 'cram_emo_01',
    grammarPattern: 'てたまらない',
    category: 'emotions',
    sentenceWithBlank: '一人暮らしを始めて、家族に会いたく____。',
    prefix: '一人暮らしを始めて、家族に会いたく',
    suffix: '。',
    target: 'てたまらない',
    choices: ['てたまらない', 'てならない', 'ないではいられない', 'にすぎない'],
    meaningEn: 'Having started living alone, I miss seeing my family so much I cannot bear it.',
    meaningMy: 'တစ်ယောက်တည်း စတင်နေထိုင်ရသဖြင့် မိသားစုနှင့် တွေ့ချင်လွန်း၍ မခံမရပ်နိုင် ဖြစ်ရသည်။',
    formation: 'い-Adj [〜くて] + たまらない / Verb [て形] + たまらない',
    hint: 'Overwhelming subjective emotion / physical craving',
    explanationEn: '「〜てたまらない」 emphasizes an overwhelming personal emotional or physical feeling.',
    explanationMy: '「〜てたまらない」 သည် စိတ်ခံစားမှု သို့မဟုတ် ရုပ်ပိုင်းဆိုင်ရာ ခံစားမှု လွန်ကဲပြီး မခံမရပ်နိုင် ဖြစ်ခြင်းကို ပြသည်။',
  },
  {
    id: 'cram_emo_02',
    grammarPattern: 'てたまらない',
    category: 'emotions',
    sentenceWithBlank: '虫に刺されたところが痒く____、掻くのを我慢できない。',
    prefix: '虫に刺されたところが痒く',
    suffix: '、掻くのを我慢できない。',
    target: 'てたまらない',
    choices: ['てたまらない', 'てならない', 'ないではいられない', 'がち'],
    meaningEn: 'The insect bite is so unbearably itchy that I cannot stop scratching it.',
    meaningMy: 'ပိုးကောင်ကိုက်ခံရသည့် နေရာသည် ယားလွန်း၍ မကုတ်ဘဲ မနေနိုင်အောင် ဖြစ်ရသည်။',
    formation: 'い-Adj [〜くて] + たまらない',
    hint: 'Unbearable physical sensation (itchy/painful)',
    explanationEn: 'Used for intense physical bodily sensations (痒い, 痛い, 暑い).',
    explanationMy: 'ယားယံခြင်း၊ နာကျင်ခြင်း စသည့် ရုပ်ပိုင်းဆိုင်ရာ ခံစားချက် ပြင်းထန်မှုကို ပြသည်။',
  },
  {
    id: 'cram_emo_03',
    grammarPattern: 'てならない',
    category: 'emotions',
    sentenceWithBlank: 'この新しい事業計画はうまくいかないような気がし____。',
    prefix: 'この新しい事業計画はうまくいかないような気がし',
    suffix: '。',
    target: 'てならない',
    choices: ['てならない', 'てたまらない', 'ないではいられない', 'きり'],
    meaningEn: 'I cannot help but feel that this new business plan will not succeed.',
    meaningMy: 'ဤစီးပွားရေး အစီအစဉ်သစ်သည် အောင်မြင်မည်မဟုတ်ဟု စိတ်ထဲတွင် တားမရအောင် ခံစားနေရသည်။',
    formation: 'Verb [て-form] + ならない (often with 気がする, 思える)',
    hint: 'Spontaneous psychological premonition / intuition',
    explanationEn: '「〜てならない」 denotes a spontaneous, irresistible feeling bubbling from within.',
    explanationMy: '「〜てならない」 သည် စိတ်ထဲမှ သဘာဝအလျောက် တားမရအောင် ပေါ်ပေါက်လာသော ခံစားချက်ကို ပြသည်။',
  },
  {
    id: 'cram_emo_04',
    grammarPattern: 'てならない',
    category: 'emotions',
    sentenceWithBlank: '遠方で暮らす祖父の健康状態が心配で____。',
    prefix: '遠方で暮らす祖父の健康状態が心配で',
    suffix: '。',
    target: 'てならない',
    choices: ['てならない', 'てたまらない', 'ないではいられない', 'にほかならない'],
    meaningEn: 'I am irresistibly worried about the health of my grandfather living far away.',
    meaningMy: 'အဝေးတွင် နေထိုင်သော အဖိုး၏ ကျန်းမာရေးအတွက် အလွန်ပင် စိုးရိမ်မကင်း ဖြစ်နေမိသည်။',
    formation: 'な-Adj [〜で] + ならない',
    hint: 'Persistent mental anxiety / concern (心配で)',
    explanationEn: 'Frequently pairs with 心配, 気懸かり, 不安 to express deep emotional concern.',
    explanationMy: 'စိုးရိမ်ပူပန်မှု (心配でならない) ကဲ့သို့ စိတ်ပိုင်းဆိုင်ရာ စိုးရိမ်မှုကို ဖော်ပြရာတွင် သုံးသည်။',
  },
  {
    id: 'cram_emo_05',
    grammarPattern: 'ないではいられない',
    category: 'emotions',
    sentenceWithBlank: 'その映画のあまりに悲しい結末を見て、泣か____。',
    prefix: 'その映画のあまりに悲しい結末を見て、泣か',
    suffix: '。',
    target: 'ないではいられない',
    choices: ['ないではいられない', 'てたまらない', 'てならない', 'つつある'],
    meaningEn: 'Watching that deeply tragic movie ending, I could not help but weep.',
    meaningMy: 'ထိုရုပ်ရှင်၏ အလွန်ဝမ်းနည်းဖွယ် ဇာတ်သိမ်းကို ကြည့်ပြီး မငိုဘဲ မနေနိုင်ခဲ့ပါ။',
    formation: 'Verb [ない-form] + ではいられない',
    hint: 'Irresistible impulse to perform an action ("cannot help but...")',
    explanationEn: '「〜ないではいられない」 conveys that one cannot control the impulse to do something.',
    explanationMy: '「〜ないではいられない」 သည် မလုပ်ဘဲ မနေနိုင်အောင် စိတ်ခံစားမှု ထိန်းမရခြင်းကို ပြသည်။',
  },
  {
    id: 'cram_emo_06',
    grammarPattern: 'ないではいられない',
    category: 'emotions',
    sentenceWithBlank: 'あまりにも理不尽な上司の態度に、一言文句を言わ____。',
    prefix: 'あまりにも理不尽な上司の態度に、一言文句を言わ',
    suffix: '。',
    target: 'ないではいられない',
    choices: ['ないではいられない', 'てならない', 'てたまらない', 'に決まっている'],
    meaningEn: 'Faced with the boss\'s utterly unreasonable attitude, I couldn\'t help speaking up.',
    meaningMy: 'မန်နေဂျာ၏ အလွန်တရားလွန်သော သဘောထားကြောင့် မပြောဘဲ မနေနိုင်အောင် စကားတစ်ခွန်း ပြောလိုက်မိသည်။',
    formation: 'Verb [ない-form] + ではいられない',
    hint: 'Compulsive psychological reaction / vocal response',
    explanationEn: 'Suppressed emotion forces out an inevitable verbal or physical action.',
    explanationMy: 'မတရားမှုကို သည်းမခံနိုင်တော့ဘဲ မပြောဘဲ မနေနိုင်သည့် အခြေအနေကို ဖော်ပြသည်။',
  },

  // --- JUDGMENTS & ASSERTIONS ---
  {
    id: 'cram_asrt_01',
    grammarPattern: 'に決まっている',
    category: 'assertions',
    sentenceWithBlank: '毎日これだけ猛練習を重ねたのだから、絶対に合格する____。',
    prefix: '毎日これだけ猛練習を重ねたのだから、絶対に合格する',
    suffix: '。',
    target: 'に決まっている',
    choices: ['に決まっている', 'にほかならない', 'にすぎない', 'がち'],
    meaningEn: 'Since they practiced so intensively every day, they must surely pass.',
    meaningMy: 'နေ့တိုင်း ဤမျှ ပြင်းပြင်းထန်ထန် လေ့ကျင့်ထားသောကြောင့် သေချာပေါက် အောင်မြင်မည်သာ ဖြစ်သည်။',
    formation: 'Plain Form + に決まっている',
    hint: 'Strong intuitive conviction ("must surely be...")',
    explanationEn: '「〜に決まっている」 expresses absolute confidence based on speaker\'s conviction.',
    explanationMy: '「〜に決まっている」 သည် လုံးဝ သေချာပေါက် ဖြစ်မည်ဟု ကိုယ်ပိုင် အခိုင်အမာ ယူဆခြင်းဖြစ်သည်။',
  },
  {
    id: 'cram_asrt_02',
    grammarPattern: 'に決まっている',
    category: 'assertions',
    sentenceWithBlank: 'そんな簡単にお金が儲かる話なんて、嘘____。',
    prefix: 'そんな簡単にお金が儲かる話なんて、嘘',
    suffix: '。',
    target: 'に決まっている',
    choices: ['に決まっている', 'にすぎない', 'にほかならない', '気味'],
    meaningEn: 'Such a talk about getting rich so easily is bound to be a scam.',
    meaningMy: 'ထိုသို့ လွယ်လွယ်ကူကူ ငွေကြေးရမည့် စကားမျိုးသည် လိမ်လည်မှု ဖြစ်မည်မှာ သေချာသည်။',
    formation: 'Noun + に決まっている (no だ)',
    hint: 'Clear certainty dismissing doubt',
    explanationEn: 'Attached directly to nouns to assert unquestionable certainty.',
    explanationMy: 'သံသယဖြစ်စရာမလိုဘဲ လိမ်လည်မှုသာ ဖြစ်မည်ဟု ပြတ်သားစွာ အတည်ပြုပြောဆိုခြင်းဖြစ်သည်။',
  },
  {
    id: 'cram_asrt_03',
    grammarPattern: 'にほかならない',
    category: 'assertions',
    sentenceWithBlank: '彼が大きな成功を収めたのは、日々の地道な努力の賜物____。',
    prefix: '彼が大きな成功を収めたのは、日々の地道な努力の賜物',
    suffix: '。',
    target: 'にほかならない',
    choices: ['にほかならない', 'にすぎない', 'に決まっている', 'ついでに'],
    meaningEn: 'His achieving immense success is nothing other than the fruit of daily diligent effort.',
    meaningMy: 'သူကြီးမားသော အောင်မြင်မှုရရှိခြင်းသည် နေ့စဉ် ကြိုးစားအားထုတ်မှု၏ ရလဒ်မှတစ်ပါး အခြားမဟုတ်ပါ။',
    formation: 'Noun + にほかならない',
    hint: 'Exclusive assertion ("none other than...")',
    explanationEn: '「〜にほかならない」 asserts that something is strictly and solely attributable to one cause.',
    explanationMy: '「〜にほかならない」 သည် အခြားအကြောင်း မဟုတ်ဘဲ ဤအရာကြောင့်သာ ဖြစ်သည်ဟု အတည်ပြုသည်။',
  },
  {
    id: 'cram_asrt_04',
    grammarPattern: 'にほかならない',
    category: 'assertions',
    sentenceWithBlank: '今回の事故の最大の原因は、現場の安全確認の怠り____。',
    prefix: '今回の事故の最大の原因は、現場の安全確認の怠り',
    suffix: '。',
    target: 'にほかならない',
    choices: ['にほかならない', 'にすぎない', 'に決まっている', 'つつ'],
    meaningEn: 'The primary cause of this accident is none other than negligence in safety verification.',
    meaningMy: 'ယခုမတော်တဆမှု၏ အဓိကအကြောင်းအရင်းမှာ ဘေးကင်းရေးစစ်ဆေးမှု ပေါ့ဆခြင်းမှတစ်ပါး အခြားမဟုတ်ပါ။',
    formation: 'Noun + にほかならない',
    hint: 'Formal identification of core responsibility',
    explanationEn: 'Used in journalistic and official statements to declare singular truth.',
    explanationMy: 'တရားဝင် သုံးသပ်ချက်များတွင် အဓိက တရားခံ သို့မဟုတ် အကြောင်းအရင်းကို အတည်ပြုရန် သုံးသည်။',
  },
  {
    id: 'cram_asrt_05',
    grammarPattern: 'にすぎない',
    category: 'assertions',
    sentenceWithBlank: '私は上司から命じられた仕事をマニュアル通りにこなした____。',
    prefix: '私は上司から命じられた仕事をマニュアル通りにこなした',
    suffix: '。',
    target: 'にすぎない',
    choices: ['にすぎない', 'にほかならない', 'に決まっている', 'ないことには'],
    meaningEn: 'I merely carried out the task assigned by my supervisor according to the manual.',
    meaningMy: 'ကျွန်ုပ်သည် အထက်လူကြီး ခိုင်းစေသည့် အလုပ်ကို လမ်းညွှန်ချက်အတိုင်း လုပ်ဆောင်ခဲ့ခြင်း မျှသာဖြစ်သည်။',
    formation: 'Plain Form + にすぎない',
    hint: 'Modest limitation ("merely / nothing more than")',
    explanationEn: '「〜にすぎない」 downplays importance to declare it is nothing beyond that boundary.',
    explanationMy: '「〜にすぎない」 သည် ထိုအရာထက် မပိုပါ၊ ဤမျှသာဖြစ်သည်ဟု ကန့်သတ်ဖော်ပြသည်။',
  },
  {
    id: 'cram_asrt_06',
    grammarPattern: 'にすぎない',
    category: 'assertions',
    sentenceWithBlank: 'それは表面的な応急処置____、根本的な解決にはなっていない。',
    prefix: 'それは表面的な応急処置',
    suffix: '、根本的な解決にはなっていない。',
    target: 'にすぎない',
    choices: ['にすぎない', 'にほかならない', 'に決まっている', 'てならない'],
    meaningEn: 'That is merely a superficial emergency measure; it is not a fundamental solution.',
    meaningMy: 'ထိုအရာသည် အပေါ်ယံ အရေးပေါ် ကုစားမှုမျှသာ ဖြစ်ပြီး အခြေခံကျသော ဖြေရှင်းချက် မဟုတ်ပါ။',
    formation: 'Noun + にすぎない (no だ)',
    hint: 'Minimizing qualification of significance',
    explanationEn: 'Emphasizes that an action is limited in value or scale.',
    explanationMy: 'တန်ဖိုး သို့မဟုတ် အကျိုးသက်ရောက်မှု အတိုင်းအတာ နည်းပါးကြောင်း နှိမ့်ချဖော်ပြသည်။',
  },

  // --- TENDENCIES & STATES ---
  {
    id: 'cram_tend_01',
    grammarPattern: 'がち',
    category: 'tendencies',
    sentenceWithBlank: '最近仕事が立て込んでいて、つい運動不足になり____だ。',
    prefix: '最近仕事が立て込んでいて、つい運動不足になり',
    suffix: 'だ。',
    target: 'がち',
    choices: ['がち', '気味', 'きり', 'ついでに'],
    meaningEn: 'Lately work has been hectic, so I tend to be prone to lack of exercise.',
    meaningMy: 'လတ်တလော အလုပ်များနေသဖြင့် မကြာခဏ ကိုယ်လက်လှုပ်ရှားမှု နည်းပါးလေ့ရှိသည်။',
    formation: 'Verb [ます-stem] + がち',
    hint: 'Frequent undesirable tendency / habit (なりがち)',
    explanationEn: '「〜がち」 denotes a frequent propensity toward an undesirable state.',
    explanationMy: '「〜がち」 သည် မကြာခဏ ဖြစ်လေ့ရှိသော မကောင်းသည့် သဘောထားကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_tend_02',
    grammarPattern: 'がち',
    category: 'tendencies',
    sentenceWithBlank: '冬の乾燥した季節は、喉を痛め____なので加湿器をつける。',
    prefix: '冬の乾燥した季節は、喉を痛め',
    suffix: 'なので加湿器をつける。',
    target: 'がち',
    choices: ['がち', '気味', 'きり', 'つつある'],
    meaningEn: 'In the dry winter season, one tends to get sore throats, so I use a humidifier.',
    meaningMy: 'ဆောင်းတွင်း ခြောက်သွေ့သော ရာသီတွင် လည်ချောင်းနာလေ့ရှိသဖြင့် အစိုဓာတ်ထိန်းစက် ဖွင့်ထားသည်။',
    formation: 'Verb [ます-stem] + がち',
    hint: 'Common recurring environmental tendency',
    explanationEn: 'Indicates a recurring tendency triggered by recurring situations.',
    explanationMy: 'ရာသီဥတုကြောင့် မကြာခဏ ဖြစ်တတ်သော အခြေအနေကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_tend_03',
    grammarPattern: '気味',
    category: 'tendencies',
    sentenceWithBlank: '昨日の夜から少し風邪____なので、今夜は早めに寝ます。',
    prefix: '昨日の夜から少し風邪',
    suffix: 'なので、今夜は早めに寝ます。',
    target: '気味',
    choices: ['気味', 'がち', 'きり', 'てたまらない'],
    meaningEn: 'Since yesterday evening I\'ve had a slight touch of a cold, so I will sleep early.',
    meaningMy: 'မနေ့ညကတည်းက အအေးမိချင်သလို ဖြစ်နေသဖြင့် ယနေ့ည စောစော အိပ်ပါမည်။',
    formation: 'Noun + 気味 (ぎみ)',
    hint: 'Slight early symptom of sickness or fatigue (風邪気味)',
    explanationEn: '「〜気味 (ぎみ)」 indicates a slight, perceptible symptom of an undesirable condition.',
    explanationMy: '「〜気味」 သည် ဖျားနာခြင်း သို့မဟုတ် မောပန်းခြင်း လက္ခဏာ အနည်းငယ် စတင်ပြသနေခြင်း ဖြစ်သည်။',
  },
  {
    id: 'cram_tend_04',
    grammarPattern: '気味',
    category: 'tendencies',
    sentenceWithBlank: '連日の残業続きで疲れ____の社員が増えている。',
    prefix: '連日の残業続きで疲れ',
    suffix: 'の社員が増えている。',
    target: '気味',
    choices: ['気味', 'がち', 'きり', 'つつ'],
    meaningEn: 'With overtime day after day, employees showing signs of fatigue are on the rise.',
    meaningMy: 'ဆက်တိုက် အချိန်ပိုဆင်းရသဖြင့် မောပန်းနွမ်းနယ်သည့် လက္ခဏာပြနေသော ဝန်ထမ်းများ များပြားလာသည်။',
    formation: 'Verb [ます-stem] + 気味',
    hint: 'Observable subtle physical weariness (疲れ気味)',
    explanationEn: 'Attached to 疲れ to describe perceptible mild exhaustion.',
    explanationMy: 'ပင်ပန်းနွမ်းနယ်သည့် အသွင်အပြင် အနည်းငယ် ပေါ်ပေါက်နေခြင်းကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_tend_05',
    grammarPattern: 'きり',
    category: 'tendencies',
    sentenceWithBlank: '息子は今朝「出かけてくる」と言った____、夜遅くなっても戻らない。',
    prefix: '息子は今朝「出かけてくる」と言った',
    suffix: '、夜遅くなっても戻らない。',
    target: 'きり',
    choices: ['きり', 'がち', '気味', 'ついでに'],
    meaningEn: 'My son said this morning "I\'m heading out", and has not returned even though it is late.',
    meaningMy: 'သားဖြစ်သူသည် ယနေ့နံနက် အပြင်သွားမည်ဟု ပြောသွားပြီးနောက် ယခု ညဉ့်နက်သည်အထိ ပြန်မလာသေးပါ။',
    formation: 'Verb [た-form] + きり',
    hint: 'Ever since that single past event, no change has occurred ("after that... nothing")',
    explanationEn: '「〜きり」 means that after one definitive event, the subsequent expected action hasn\'t occurred.',
    explanationMy: '「〜きり」 သည် ထိုတစ်ကြိမ်သာ ဖြစ်ပွားခဲ့ပြီးနောက် နောက်ဆက်တွဲ ပြောင်းလဲမှု မရှိတော့သည့် အခြေအနေဖြစ်သည်။',
  },
  {
    id: 'cram_tend_06',
    grammarPattern: 'きり',
    category: 'tendencies',
    sentenceWithBlank: '高校の同窓会で一度会った____、彼とは十年間音信不通だ。',
    prefix: '高校の同窓会で一度会った',
    suffix: '、彼とは十年間音信不通だ。',
    target: 'きり',
    choices: ['きり', 'がち', '気味', 'ないことには'],
    meaningEn: 'After meeting just once at the high school reunion, I haven\'t heard from him for ten years.',
    meaningMy: 'အထက်တန်း ကျောင်းသားဟောင်းများ တွေ့ဆုံပွဲတွင် တစ်ကြိမ်သာ တွေ့ဆုံခဲ့ပြီးနောက် ဆယ်နှစ်တိုင် အဆက်အသွယ် ပြတ်တောက်သွားခဲ့သည်။',
    formation: 'Verb [た-form] + きり',
    hint: 'Single isolated contact in the past',
    explanationEn: 'Highlights that an encounter happened only once and was never repeated.',
    explanationMy: 'ထိုအချိန်က တစ်ခါသာ တွေ့ခဲ့ပြီး ထိုနောက်ပိုင်း တစ်ခါမျှ မတွေ့ရတော့ကြောင်း ဖော်ပြသည်။',
  },

  // --- SIMULTANEOUS ACTIONS & CHANGES ---
  {
    id: 'cram_sim_01',
    grammarPattern: 'ついでに',
    category: 'simultaneous',
    sentenceWithBlank: '郵便局へ切手を買いに行く____、コンビニで公共料金を支払った。',
    prefix: '郵便局へ切手を買いに行く',
    suffix: '、コンビニで公共料金を支払った。',
    target: 'ついでに',
    choices: ['ついでに', 'つつある', 'つつ', 'がち'],
    meaningEn: 'Taking the opportunity of going to the post office for stamps, I paid my utilities at the convenience store.',
    meaningMy: 'စာတိုက်သို့ တံဆိပ်ခေါင်းဝယ်ရန် သွားရင်း ကြုံတုန်း စတိုးဆိုင်တွင် ရေမီးမီတာခ ပေးဆောင်ခဲ့သည်။',
    formation: 'Verb [Dictionary Form] + ついでに',
    hint: 'Opportunistic secondary action during primary movement',
    explanationEn: '「〜ついでに」 expresses seizing a convenient opportunity during an existing errand.',
    explanationMy: '「〜ついでに」 သည် ပင်မကိစ္စလုပ်ဆောင်ရင်း ကြုံကြိုက်တုန်း နောက်ကိစ္စတစ်ခုပါ တစ်ပါတည်း လုပ်ဆောင်ခြင်းဖြစ်သည်။',
  },
  {
    id: 'cram_sim_02',
    grammarPattern: 'ついでに',
    category: 'simultaneous',
    sentenceWithBlank: '図書館へ本を返却する____、隣のカフェで少し読書をした。',
    prefix: '図書館へ本を返却する',
    suffix: '、隣のカフェで少し読書をした。',
    target: 'ついでに',
    choices: ['ついでに', 'つつある', 'つつ', '気味'],
    meaningEn: 'While going to return books at the library, I also did some reading at the adjacent cafe.',
    meaningMy: 'စာကြည့်တိုက်သို့ စာအုပ်ပြန်အပ်ရန် သွားရင်း ကြုံတုန်း ဘေးရှိ ကော်ဖီဆိုင်တွင် စာအနည်းငယ် ဖတ်ခဲ့သည်။',
    formation: 'Verb [Dictionary Form] + ついでに',
    hint: 'Incidental secondary stop',
    explanationEn: 'The primary errand makes the secondary convenient and secondary in priority.',
    explanationMy: 'စာအုပ်ပြန်အပ်ခြင်း ပင်မခရီးတွင် ကြုံတုန်း ကော်ဖီဆိုင်ဝင်ခြင်း ဖြစ်သည်။',
  },
  {
    id: 'cram_sim_03',
    grammarPattern: 'つつある',
    category: 'simultaneous',
    sentenceWithBlank: '長年低迷していた我が国の経済は、緩やかに回復し____。',
    prefix: '長年低迷していた我が国の経済は、緩やかに回復し',
    suffix: '。',
    target: 'つつある',
    choices: ['つつある', 'ついでに', 'つつ', 'にすぎない'],
    meaningEn: 'Our nation\'s economy, sluggish for many years, is gradually in the process of recovering.',
    meaningMy: 'နှစ်ပေါင်းများစွာ ကျဆင်းနေခဲ့သော ကျွန်ုပ်တို့နိုင်ငံ၏ စီးပွားရေးသည် တဖြည်းဖြည်း ပြန်လည်ဦးမော့လာနေပြီဖြစ်သည်။',
    formation: 'Verb [ます-stem] + つつある',
    hint: 'Gradual ongoing change in motion ("is in the process of...")',
    explanationEn: '「〜つつある」 indicates that a continuous, gradual shift is currently taking place.',
    explanationMy: '「〜つつある」 သည် တဖြည်းဖြည်း ပြောင်းလဲတိုးတက်နေဆဲ အခြေအနေကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_sim_04',
    grammarPattern: 'つつある',
    category: 'simultaneous',
    sentenceWithBlank: '都市開発によって、昔ながらの美しい自然が失われ____。',
    prefix: '都市開発によって、昔ながらの美しい自然が失われ',
    suffix: '。',
    target: 'つつある',
    choices: ['つつある', 'ついでに', 'つつ', 'きり'],
    meaningEn: 'Due to urban development, traditional pristine nature is in the process of being lost.',
    meaningMy: 'မြို့ပြဖွံ့ဖြိုးရေးကြောင့် ရှေးယခင် သဘာဝအလှတရားများသည် တဖြည်းဖြည်း ပျောက်ကွယ်လျက် ရှိသည်။',
    formation: 'Verb [ます-stem] + つつある',
    hint: 'Gradual macro shift / ongoing erosion',
    explanationEn: 'Frequently used in social commentaries describing macro trends.',
    explanationMy: 'လူမှုရေးနှင့် သဘာဝပတ်ဝန်းကျင် အပြောင်းအလဲများတွင် အဆင့်ဆင့် ဖြစ်ပျက်နေမှုကို ပြသည်။',
  },
  {
    id: 'cram_sim_05',
    grammarPattern: 'つつ',
    category: 'simultaneous',
    sentenceWithBlank: '健康に悪いと知り____、深夜のラーメンをやめられない。',
    prefix: '健康に悪いと知り',
    suffix: '、深夜のラーメンをやめられない。',
    target: 'つつ',
    choices: ['つつ', 'つつある', 'ついでに', 'てたまらない'],
    meaningEn: 'Even while fully aware it is bad for health, I cannot quit late-night ramen.',
    meaningMy: 'ကျန်းမာရေးအတွက် မကောင်းမှန်း သိပါသော်လည်း ညဉ့်နက်ခေါက်ဆွဲ စားခြင်းကို မရပ်တန့်နိုင်ပါ။',
    formation: 'Verb [ます-stem] + つつ',
    hint: 'Formal contrast / contradiction ("although / even while...")',
    explanationEn: '「〜つつ」 can mean "although / while doing X, doing contrary Y" (often paired with も).',
    explanationMy: '「〜つつ」 သည် တစ်ဖက်မှ သိပါသော်လည်း ဆန့်ကျင်ဘက် အပြုအမူကို ပြုလုပ်မိခြင်းကို ဖော်ပြသည်။',
  },
  {
    id: 'cram_sim_06',
    grammarPattern: 'つつ',
    category: 'simultaneous',
    sentenceWithBlank: '将来のキャリアに悩み____、目の前の課題に全力で取り組んでいる。',
    prefix: '将来のキャリアに悩み',
    suffix: '、目の前の課題に全力で取り組んでいる。',
    target: 'つつ',
    choices: ['つつ', 'つつある', 'ついでに', 'ものなら'],
    meaningEn: 'While worrying over my future career, I am tackling the current tasks with all my might.',
    meaningMy: 'အနာဂတ်အလုပ်အကိုင်အတွက် စိတ်ပူနေရင်း တစ်ပြိုင်နက်တည်းမှာပင် လက်ရှိတာဝန်များကို အစွမ်းကုန် လုပ်ဆောင်နေသည်။',
    formation: 'Verb [ます-stem] + つつ',
    hint: 'Formal simultaneous mental action alongside physical effort',
    explanationEn: 'Denotes two simultaneous ongoing actions in formal written style.',
    explanationMy: 'စိတ်ထဲတွင် တွေးတောရင်း လက်တွေ့တွင်လည်း လုပ်ဆောင်နေသော တစ်ပြိုင်နက်တည်း လုပ်ဆောင်ချက်ဖြစ်သည်။',
  },
];

interface GrammarCramLabProps {
  profile: UserProfile;
  onExit?: () => void;
}

export const GrammarCramLab: React.FC<GrammarCramLabProps> = ({ profile, onExit }) => {
  // Navigation & Drill State
  const [viewState, setViewState] = useState<'setup' | 'drilling' | 'summary'>('setup');
  const [selectedCategory, setSelectedCategory] = useState<CramCategoryKey>('conditions');
  const [drillSize, setDrillSize] = useState<number>(10);
  const [drillMode, setDrillMode] = useState<CramDrillMode>('cloze');

  // Active Session Questions
  const [sessionQuestions, setSessionQuestions] = useState<CramQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionAnswers, setSessionAnswers] = useState<
    Array<{ question: CramQuestion; isCorrect: boolean; entered: string }>
  >([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Input & Evaluation State for Current Question
  const [clozeInput, setClozeInput] = useState<string>('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean>(false);
  const [nuanceWarning, setNuanceWarning] = useState<NuanceCheckResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [quarantinedGhostsCount, setQuarantinedGhostsCount] = useState<number>(0);
  const [speechAvailable, setSpeechAvailable] = useState<boolean>(false);

  const clozeInputRef = useRef<HTMLInputElement>(null);

  // Check speech synthesis availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechAvailable(true);
    }
  }, []);

  // Fetch ghost count for setup badge
  useEffect(() => {
    const loadGhostCount = async () => {
      try {
        const count = await db.ghost_cards.filter((g) => !g.conquered).count();
        setQuarantinedGhostsCount(count);
      } catch {
        // Non-blocking
      }
    };
    loadGhostCount();
  }, [viewState]);

  // Focus Cloze input on question switch
  useEffect(() => {
    if (viewState === 'drilling' && drillMode === 'cloze') {
      setClozeInput('');
      setNuanceWarning(null);
      setShowHint(false);
      setIsEvaluated(false);
      setIsCurrentCorrect(false);
      setSelectedChoice(null);
      setTimeout(() => clozeInputRef.current?.focus(), 80);
    } else if (viewState === 'drilling' && drillMode === 'multiple_choice') {
      setSelectedChoice(null);
      setIsEvaluated(false);
      setIsCurrentCorrect(false);
      setNuanceWarning(null);
      setShowHint(false);
    }
  }, [currentIndex, viewState, drillMode]);

  // Speech TTS handler
  const playSentenceAudio = (sentence: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Launch Drill Session
  const handleStartDrill = async () => {
    let pool: CramQuestion[] = [];

    if (selectedCategory === 'all') {
      pool = [...CRAM_QUESTION_BANK];
    } else if (selectedCategory === 'ghosts') {
      // Query active ghost cards from Dexie
      try {
        const activeGhosts = await db.ghost_cards.filter((g) => !g.conquered).toArray();
        if (activeGhosts.length > 0) {
          pool = activeGhosts.map((g, idx) => {
            const pattern = g.clozeTarget;
            const parts = g.clozeSentence.split('____');
            return {
              id: `ghost_cram_${g.id}_${idx}`,
              grammarPattern: pattern,
              category: 'ghosts' as const,
              sentenceWithBlank: g.clozeSentence,
              prefix: parts[0] || '',
              suffix: parts[1] || '',
              target: pattern,
              choices: [
                pattern,
                'ものなら',
                'としたら',
                'ないことには',
              ] as [string, string, string, string],
              meaningEn: g.nuanceExplanationEn,
              meaningMy: g.nuanceExplanationMy || 'ပြန်လည်လေ့ကျင့်ရမည့် သဒ္ဒါပုံစံ ဖြစ်သည်။',
              formation: 'Quarantined Leech Item',
              hint: g.nuanceExplanationMy || g.nuanceExplanationEn,
              explanationEn: g.nuanceExplanationEn,
              explanationMy: g.nuanceExplanationMy || 'ကျက်မှတ်ရ ခက်ခဲသော အရာများကို ထပ်ခါတလဲလဲ လေ့ကျင့်ပါ။',
            };
          });
        }
      } catch (e) {
        console.error('Failed to query ghost cards:', e);
      }

      // If no ghosts exist, fallback to curated high-frequency items
      if (pool.length === 0) {
        pool = CRAM_QUESTION_BANK.filter(
          (q) => q.category === 'conditions' || q.category === 'emotions'
        );
      }
    } else {
      pool = CRAM_QUESTION_BANK.filter((q) => q.category === selectedCategory);
    }

    // Shuffle and cap by drill size
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, drillSize);

    setSessionQuestions(chosen);
    setCurrentIndex(0);
    setSessionAnswers([]);
    setSessionStartTime(Date.now());
    setViewState('drilling');
  };

  // Cloze Input change with Wanakana auto-conversion
  const handleClozeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const kana = wanakana.toHiragana(raw, { IMEMode: true });
    setClozeInput(kana);
    if (nuanceWarning) {
      setNuanceWarning(null);
    }
  };

  // Submit Cloze Answer
  const handleClozeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clozeInput.trim() || isEvaluated) return;

    const currentQ = sessionQuestions[currentIndex];
    const check = NuanceInterceptor.inspect(clozeInput, currentQ.target);

    if (check.status === 'exact_match') {
      setIsEvaluated(true);
      setIsCurrentCorrect(true);
      setNuanceWarning(null);
      const updated = [
        ...sessionAnswers,
        { question: currentQ, isCorrect: true, entered: clozeInput.trim() },
      ];
      setSessionAnswers(updated);
      playSentenceAudio(currentQ.prefix + currentQ.target + currentQ.suffix);
    } else if (check.status === 'synonym_warning') {
      // Nuance warning triggered: alert learner without penalizing
      setNuanceWarning(check);
    } else {
      setIsEvaluated(true);
      setIsCurrentCorrect(false);
      setNuanceWarning(null);
      const updated = [
        ...sessionAnswers,
        { question: currentQ, isCorrect: false, entered: clozeInput.trim() },
      ];
      setSessionAnswers(updated);
    }
  };

  // Select Multiple Choice option
  const handleSelectMultipleChoice = (choice: string) => {
    if (isEvaluated) return;
    const currentQ = sessionQuestions[currentIndex];
    setSelectedChoice(choice);
    const isCorrect = choice.trim() === currentQ.target.trim();

    setIsEvaluated(true);
    setIsCurrentCorrect(isCorrect);
    const updated = [
      ...sessionAnswers,
      { question: currentQ, isCorrect, entered: choice },
    ];
    setSessionAnswers(updated);

    if (isCorrect) {
      playSentenceAudio(currentQ.prefix + currentQ.target + currentQ.suffix);
    }
  };

  // Advance to next question or finalize session
  const handleNextQuestion = async () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Complete Cram Session and Save Record in Dexie
      const correctCount = sessionAnswers.filter((a) => a.isCorrect).length;
      const accuracy = sessionQuestions.length > 0 ? correctCount / sessionQuestions.length : 0;
      const testedPatterns = [...new Set(sessionQuestions.map((q) => q.grammarPattern))];
      const failedPatterns = [
        ...new Set(sessionAnswers.filter((a) => !a.isCorrect).map((a) => a.question.grammarPattern)),
      ];

      const cramRecord: CramDrillRecord = {
        id: `cram_${Date.now()}`,
        category: selectedCategory,
        level: profile.level,
        totalQuestions: sessionQuestions.length,
        correctAnswers: correctCount,
        accuracy: Math.round(accuracy * 100) / 100,
        testedGrammarIds: testedPatterns,
        failedGrammarIds: failedPatterns,
        startedAt: new Date(sessionStartTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: Math.round((Date.now() - sessionStartTime) / 1000),
      };

      try {
        await db.cram_drills.add(cramRecord);
      } catch (err) {
        console.error('Failed to log cram drill telemetry:', err);
      }

      setViewState('summary');
    }
  };

  const { getDisplayBadge } = useGlobalShortcuts();

  const handleSelectChoiceByIndex = useCallback(
    (idx: number) => {
      if (viewState !== 'drilling' || drillMode !== 'multiple_choice' || isEvaluated) return;
      const currentQ = sessionQuestions[currentIndex];
      if (currentQ && currentQ.choices[idx]) {
        handleSelectMultipleChoice(currentQ.choices[idx]);
      }
    },
    [viewState, drillMode, isEvaluated, sessionQuestions, currentIndex, handleSelectMultipleChoice]
  );

  // Scoped keyboard shortcut listener via centralized GlobalShortcutContext
  useScopedShortcuts({
    scopeId: 'grammar_cram_lab',
    handlers: {
      SELECT_CHOICE_1: () => handleSelectChoiceByIndex(0),
      SELECT_CHOICE_2: () => handleSelectChoiceByIndex(1),
      SELECT_CHOICE_3: () => handleSelectChoiceByIndex(2),
      SELECT_CHOICE_4: () => handleSelectChoiceByIndex(3),
      PLAY_AUDIO: () => {
        if (viewState === 'drilling' && sessionQuestions[currentIndex]) {
          const q = sessionQuestions[currentIndex];
          playSentenceAudio(q.prefix + q.target + q.suffix);
        }
      },
      TOGGLE_HINT: () => {
        if (viewState === 'drilling') {
          setShowHint((prev) => !prev);
        }
      },
      SUBMIT_ANSWER: () => {
        if (viewState !== 'drilling') return;
        if (isEvaluated) {
          handleNextQuestion();
        } else if (drillMode === 'cloze') {
          handleClozeSubmit();
        }
      },
      NEXT_ITEM: () => {
        if (viewState === 'drilling' && isEvaluated) {
          handleNextQuestion();
        }
      },
    },
    priority: 20,
    allowInInputs: true,
    enabled: viewState === 'drilling',
  });

  // ==========================================
  // VIEW 1: SETUP & CONFIGURATION SCREEN
  // ==========================================
  if (viewState === 'setup') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Modern Academic Paper Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-sm">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-2xs">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>Grammar Cram Lab · သဒ္ဒါ အထူးလေ့ကျင့်ရေး</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-mono">
                  Unranked • No FSRS Penalty
                </span>
                {quarantinedGhostsCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono flex items-center space-x-1">
                    <Bug className="w-3 h-3 text-rose-600" />
                    <span>{quarantinedGhostsCount} Ghosts in Quarantine</span>
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-japanese">
                  Grammar Cram Lab (သဒ္ဒါ လေ့ကျင့်ရေးစခန်း)
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed font-myanmar">
                  ပုံမှန် SRS ပြက္ခဒိန်ကို မထိခိုက်စေဘဲ သင်လိုချင်သော သဒ္ဒါအုပ်စုများကို စိတ်ကြိုက် ရွေးချယ်လေ့ကျင့်နိုင်ပါသည်။ Cloze စာစီကွက်လပ်ဖြည့်နည်း သို့မဟုတ် ၄ ခုရွေး မေးခွန်းများဖြင့် သဒ္ဒါကွဲပြားချက်များကို အလွတ်သဘော ကျွမ်းကျင်အောင် လေ့ကျင့်ပါ။
                </p>
              </div>

              {/* Mode Badges */}
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-stone-500">
                <span className="px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nuance Interceptor Active</span>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Native Audio Pronunciation</span>
                </span>
              </div>
            </div>

            {/* Back Button if present */}
            {onExit && (
              <div className="self-start sm:self-auto">
                <button
                  onClick={onExit}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer flex items-center space-x-2 shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ပြန်ထွက်မည် (Back)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Thematic Category Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-800 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>၁။ သဒ္ဒါ အုပ်စု ရွေးချယ်ပါ (Select Thematic Category)</span>
            </h2>
            <span className="text-[11px] font-mono text-stone-500">
              {CRAM_CATEGORIES.length} Categories Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CRAM_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group flex flex-col justify-between shadow-2xs ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-500 ring-1 ring-amber-400'
                      : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 shrink-0">
                        {cat.icon}
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cat.badgeClass}`}>
                        {cat.patterns.length > 2 ? `${cat.patterns.length} Patterns` : cat.patterns[0]}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-indigo-600 transition">
                        {cat.titleEn}
                      </h3>
                      <p className="text-xs font-semibold text-amber-700 font-myanmar mt-0.5">
                        {cat.titleMy}
                      </p>
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed font-myanmar">
                      {cat.descriptionMy}
                    </p>
                  </div>

                  {/* Grammar Patterns Badges */}
                  <div className="pt-3 flex flex-wrap gap-1 mt-auto">
                    {cat.patterns.map((p, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono font-japanese px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-stone-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Drill Settings (Mode & Size) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Drill Size Selector */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-800">
                ၂။ မေးခွန်း အရေအတွက် (Drill Size)
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[10, 15, 25].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setDrillSize(size)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center shadow-2xs ${
                    drillSize === size
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-400'
                      : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                  }`}
                >
                  <span className="text-lg font-bold font-mono">{size}</span>
                  <span className="text-[10px] font-myanmar text-stone-500 mt-0.5">
                    {size === 10 ? 'အမြန် (Quick)' : size === 15 ? 'စံနှုန်း (Standard)' : 'အပြည့် (Marathon)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Drill Mode Selector */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-800">
                ၃။ လေ့ကျင့်မှု ပုံစံ (Drill Mode)
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDrillMode('cloze')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between shadow-2xs ${
                  drillMode === 'cloze'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cloze Active Recall</span>
                  </span>
                  <p className="text-[11px] text-amber-800 font-myanmar mt-1">
                    ကွက်လပ် ရိုက်ထည့်ခြင်း
                  </p>
                </div>
                <span className="text-[9px] font-mono text-stone-500 mt-2 block">
                  Hiragana Typing + Nuance Shield
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDrillMode('multiple_choice')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between shadow-2xs ${
                  drillMode === 'multiple_choice'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-400'
                    : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Multiple Choice</span>
                  </span>
                  <p className="text-[11px] text-emerald-800 font-myanmar mt-1">
                    ၄ ခုရွေး မေးခွန်း
                  </p>
                </div>
                <span className="text-[9px] font-mono text-stone-500 mt-2 block">
                  Keys 1-4 • Rapid Sprint
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Launch Sprint CTA Banner */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStartDrill}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition active:scale-[0.99] flex items-center justify-center space-x-2.5 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="font-myanmar font-semibold text-base">
              သဒ္ဒါ လေ့ကျင့်ခန်း စတင်မည် (Launch Cram Sprint)
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DRILLING / INTERACTIVE SPRINT
  // ==========================================
  if (viewState === 'drilling') {
    const currentQ = sessionQuestions[currentIndex];
    const progressPct = ((currentIndex + 1) / sessionQuestions.length) * 100;
    const currentCorrectCount = sessionAnswers.filter((a) => a.isCorrect).length;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Header & Progress HUD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewState('setup')}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200 transition cursor-pointer"
              title="Cancel drill"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 uppercase font-bold">
                  {currentQ.category}
                </span>
                <span className="text-xs font-mono text-stone-700">
                  Question {currentIndex + 1} of {sessionQuestions.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] font-mono text-stone-500 uppercase block">Current Score</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {currentCorrectCount} / {sessionAnswers.length} correct
              </span>
            </div>
            {speechAvailable && (
              <button
                type="button"
                onClick={() =>
                  playSentenceAudio(currentQ.prefix + currentQ.target + currentQ.suffix)
                }
                className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
                title="Play native Japanese pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden border border-stone-300">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Question Card Container */}
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-3xl bg-white border ${
            isEvaluated && isCurrentCorrect
              ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
              : isEvaluated && !isCurrentCorrect
              ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
              : nuanceWarning
              ? 'border-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
              : 'border-stone-200 shadow-sm'
          } p-6 sm:p-8 min-h-[360px] flex flex-col justify-between transition-all duration-300`}
        >
          {/* Micro Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

          {/* Top Card Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQ.formation}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-myanmar text-[11px]">
                {showHint ? 'အရိပ်အမြွက် ဝှက်မည်' : 'အရိပ်အမြွက် ကြည့်မည် (Hint)'}
              </span>
            </button>
          </div>

          {/* Japanese Sentence Centerpiece */}
          <div className="my-auto py-6 text-center space-y-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold font-japanese text-stone-900 tracking-tight leading-relaxed">
              <span>{currentQ.prefix}</span>

              {drillMode === 'cloze' ? (
                /* Cloze Interactive Input Slot */
                <span className="inline-block mx-2.5 px-3 py-1 rounded-xl bg-indigo-50 border-2 border-indigo-500 text-indigo-900 font-mono shadow-inner min-w-[140px] align-middle ring-2 ring-indigo-500/20">
                  {!isEvaluated ? (
                    <form onSubmit={handleClozeSubmit} className="inline">
                      <input
                        ref={clozeInputRef}
                        type="text"
                        value={clozeInput}
                        onChange={handleClozeInputChange}
                        placeholder="〜"
                        className="bg-transparent text-center font-japanese text-lg sm:text-xl font-bold text-amber-800 outline-none w-28 sm:w-36 placeholder-stone-400"
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </form>
                  ) : (
                    <span
                      className={`font-japanese font-bold ${
                        isCurrentCorrect ? 'text-emerald-300' : 'text-rose-300 line-through'
                      }`}
                    >
                      {clozeInput || '空欄'}
                    </span>
                  )}
                </span>
              ) : (
                /* Multiple Choice Blank Highlight */
                <span className="inline-block mx-2.5 px-4 py-1 rounded-xl bg-amber-50 border-2 border-amber-500/60 text-amber-900 font-mono align-middle shadow-inner">
                  {isEvaluated ? currentQ.target : '[ _____ ]'}
                </span>
              )}

              <span>{currentQ.suffix}</span>
            </div>

            {/* Burmese Definition & Meaning */}
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-semibold text-stone-900 font-myanmar">
                &ldquo;{currentQ.meaningMy}&rdquo;
              </p>
              <p className="text-xs text-stone-600 font-sans italic">
                {currentQ.meaningEn}
              </p>
            </div>

            {/* Nuance Warning Interceptor Banner if Synonym Triggered */}
            <AnimatePresence>
              {nuanceWarning && (
                <NuanceWarningBanner
                  enteredSynonym={nuanceWarning.entered}
                  expectedTarget={nuanceWarning.target}
                  nuanceMessage={nuanceWarning.warningMessageEn || ''}
                  nuanceMessageMy={nuanceWarning.warningMessageMy}
                  warningMessageEn={nuanceWarning.warningMessageEn || ''}
                  warningMessageMy={nuanceWarning.warningMessageMy}
                  conjugationNote={nuanceWarning.conjugationNote}
                  onRetry={() => {
                    setClozeInput('');
                    setNuanceWarning(null);
                    clozeInputRef.current?.focus();
                  }}
                />
              )}
            </AnimatePresence>

            {/* Progressive Hint Drawer */}
            <AnimatePresence>
              {showHint && !isEvaluated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-700 space-y-1 max-w-lg mx-auto shadow-sm text-left"
                >
                  <span className="font-mono text-[10px] uppercase text-indigo-400 font-bold block">
                    Grammar Formation &amp; Clue:
                  </span>
                  <p className="font-mono text-stone-900 font-semibold">{currentQ.formation}</p>
                  <p className="text-amber-700 font-myanmar text-xs">{currentQ.hint}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multiple Choice Options Grid */}
            {drillMode === 'multiple_choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto pt-2">
                {currentQ.choices.map((choice, i) => {
                  const isSelected = selectedChoice === choice;
                  const isCorrect = choice.trim() === currentQ.target.trim();

                  let style =
                    'bg-white border-stone-200 text-stone-800 hover:border-stone-300 hover:bg-stone-50';

                  if (isEvaluated) {
                    if (isCorrect) {
                      style = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.3)]';
                    } else if (isSelected && !isCorrect) {
                      style = 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.3)]';
                    } else {
                      style = 'bg-stone-100 border-stone-200 text-stone-400 opacity-50';
                    }
                  } else if (isSelected) {
                    style = 'bg-indigo-950/80 border-indigo-500 text-indigo-100 shadow-[0_0_16px_rgba(99,102,241,0.3)]';
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isEvaluated}
                      onClick={() => handleSelectMultipleChoice(choice)}
                      className={`p-3.5 rounded-xl border text-left text-sm font-japanese font-semibold transition flex items-center justify-between cursor-pointer ${style}`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[10px] flex items-center justify-center font-mono shrink-0">
                          {i + 1}
                        </span>
                        <span>{choice}</span>
                      </span>

                      {isEvaluated && (
                        <span>
                          {isCorrect ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : isSelected ? (
                            <X className="w-4 h-4 text-rose-400" />
                          ) : null}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Post-Answer Feedback & Next Action */}
          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {!isEvaluated ? (
              <>
                <span className="text-[11px] text-stone-500 font-mono font-myanmar">
                  {drillMode === 'cloze'
                    ? 'ဟီရဂနဖြင့် ရိုက်ထည့်ပါ • Enter ခေါက်၍ အတည်ပြုပါ'
                    : 'ကီးဘုတ် 1-4 နှိပ်၍ လျင်မြန်စွာ ရွေးချယ်နိုင်သည်'}
                </span>
                {drillMode === 'cloze' && (
                  <button
                    type="button"
                    onClick={() => handleClozeSubmit()}
                    disabled={!clozeInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-950"
                  >
                    စစ်ဆေးမည် (Submit)
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Result Explanation */}
                <div className="space-y-1 text-left w-full sm:max-w-xl">
                  <div className="flex items-center space-x-2">
                    {isCurrentCorrect ? (
                      <span className="text-emerald-400 text-xs font-bold font-mono flex items-center space-x-1">
                        <Check className="w-4 h-4" />
                        <span>မှန်ကန်ပါသည် (CORRECT)</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 text-xs font-bold font-mono flex items-center space-x-1">
                        <X className="w-4 h-4" />
                        <span>မှားယွင်းပါသည် • မှန်ကန်သောအဖြေ: 「{currentQ.target}」</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-myanmar">
                    {currentQ.explanationMy}
                  </p>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold text-xs transition flex items-center space-x-2 cursor-pointer shadow-lg shrink-0"
                >
                  <span className="font-myanmar">
                    {currentIndex < sessionQuestions.length - 1
                      ? 'နောက်တစ်ခု (Next)'
                      : 'ရလဒ် ကြည့်မည် (Finish)'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: SUMMARY & CRAM DEBRIEF SCREEN
  // ==========================================
  const totalQuestions = sessionQuestions.length;
  const correctCount = sessionAnswers.filter((a) => a.isCorrect).length;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
  const isMastered = accuracyPct >= 80;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Completion Trophy Card with Radial Glass Glow */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-8 shadow-sm text-center space-y-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 shadow-2xl ${
            isMastered
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-[0_0_32px_rgba(16,185,129,0.3)]'
              : 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-[0_0_32px_rgba(245,158,11,0.3)]'
          }`}
        >
          {isMastered ? (
            <Award className="w-10 h-10 text-emerald-400" />
          ) : (
            <Flame className="w-10 h-10 text-amber-400" />
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
            Unranked Sprint Completed • စိတ်ကြိုက် လေ့ကျင့်မှု ပြီးဆုံးပါပြီ
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-japanese">
            {isMastered ? 'Cram Sprint Cleared!' : 'Targeted Practice Completed'}
          </h2>
          <p className="text-sm text-stone-600 font-myanmar max-w-md mx-auto">
            {isMastered
              ? 'ဂုဏ်ယူပါသည်! သဒ္ဒါအသုံးအနှုန်းများကို ကောင်းစွာ ကျွမ်းကျင်နေပါပြီ။'
              : 'ထပ်မံလေ့ကျင့်ရန် လိုအပ်ပါသည်။ အခက်အခဲရှိသော သဒ္ဒါများကို သေချာပြန်လည်ကြည့်ရှုပါ။'}
          </p>
        </div>

        {/* 4-Stat Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Accuracy</span>
            <span className="text-2xl font-extrabold font-mono text-stone-900">{accuracyPct}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Score</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400">
              {correctCount} / {totalQuestions}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Duration</span>
            <span className="text-2xl font-extrabold font-mono text-indigo-400">{elapsedSeconds}s</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] font-mono text-stone-500 uppercase block">Drill Mode</span>
            <span className="text-xs font-bold font-mono text-amber-600 mt-2 block uppercase">
              {drillMode === 'cloze' ? 'Cloze Recall' : '4-Choice'}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleStartDrill}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-myanmar">ထပ်မံ လေ့ကျင့်မည် (Cram Again)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewState('setup')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium transition cursor-pointer"
          >
            <span className="font-myanmar">အမျိုးအစား အသစ်ရွေးမည် (Change Category)</span>
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-xs font-medium transition cursor-pointer"
            >
              <span className="font-myanmar">စမ်းသပ်မှုများသို့ ပြန်သွားမည် (Back)</span>
            </button>
          )}
        </div>
      </div>

      {/* Review Item Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-stone-800 flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>မေးခွန်းများ ပြန်လည်စစ်ဆေးခြင်း (Question Review Breakdown)</span>
        </h3>

        <div className="space-y-2.5">
          {sessionAnswers.map((ans, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                ans.isCorrect
                  ? 'bg-white border-stone-200 hover:border-emerald-500/40'
                  : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      ans.isCorrect
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {ans.isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-700 font-japanese">
                    「{ans.question.grammarPattern}」
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    Q{idx + 1}
                  </span>
                </div>
                <p className="text-sm font-japanese text-stone-900">
                  {ans.question.prefix}
                  <span
                    className={`font-bold underline decoration-2 mx-1 ${
                      ans.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {ans.question.target}
                  </span>
                  {ans.question.suffix}
                </p>
                <p className="text-xs text-stone-600 font-myanmar">
                  {ans.question.meaningMy}
                </p>
              </div>

              {/* Native audio listener & entered value */}
              <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                <span className="text-[11px] font-mono text-stone-600">
                  Entered: <span className="text-stone-900 font-japanese font-bold">{ans.entered}</span>
                </span>
                {speechAvailable && (
                  <button
                    type="button"
                    onClick={() =>
                      playSentenceAudio(
                        ans.question.prefix + ans.question.target + ans.question.suffix
                      )
                    }
                    className="p-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                    title="Pronounce Japanese sentence"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
