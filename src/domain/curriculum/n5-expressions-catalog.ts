/**
 * N5 Essential Conversational Expressions & Counters Catalog
 * Standard reference aligned with Minna no Nihongo (1-25), Shin Nihongo 500 Mon,
 * TRY! N5, Tsukimi N5 Conversation, and authentic JLPT N5 materials.
 * Includes situational greetings, courteous quick-responses, comprehensive counters,
 * calendar dates (1日-31日), and irregular phonetic changes with full Burmese translations.
 */

export interface N5Expression {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  burmese: string;
  category: 'greetings' | 'workplace' | 'dining' | 'hospitality' | 'responses' | 'shopping_travel';
  situationMy: string;
  nuanceMy?: string;
  exampleDialogues?: Array<{
    speaker: string;
    ja: string;
    my: string;
  }>;
}

export interface N5CounterEntry {
  counterKanji: string;
  counterKana: string;
  targetCategoryEn: string;
  targetCategoryMy: string;
  items: Array<{
    count: number;
    japanese: string;
    kana: string;
    romaji: string;
    isIrregular: boolean;
    burmese: string;
  }>;
  questionWord: {
    japanese: string;
    kana: string;
    meaningMy: string;
  };
}

export interface N5DateEntry {
  day: number;
  japanese: string;
  kana: string;
  romaji: string;
  isIrregular: boolean;
  burmese: string;
  phoneticNoteMy?: string;
}

export interface N5PhoneticShift {
  number: number | string;
  baseKanji: string;
  reading: string;
  shiftType: 'rendaku' | 'gemination' | 'special_reading';
  burmese: string;
  explanationMy: string;
}

// -------------------------------------------------------------------------------------
// 1. CORE SITUATIONAL GREETINGS & QUICK RESPONSES
// -------------------------------------------------------------------------------------

export const N5_CONVERSATIONAL_EXPRESSIONS: N5Expression[] = [
  {
    id: 'exp_01_kashikomarimashita',
    japanese: 'かしこまりました',
    kana: 'かしこまりました',
    romaji: 'kashikomarimashita',
    english: 'Certainly / Understood (humble/polite acknowledgment)',
    burmese: 'ကောင်းပါပြီ ခင်ဗျာ/ရှင့် (အထက်လူကြီး သို့မဟုတ် ဖောက်သည်အား ရိုသေလေးစားစွာ ပြန်ကြားခြင်း)',
    category: 'workplace',
    situationMy: 'လုပ်ငန်းခွင်တွင် အထက်လူကြီး၊ ဧည့်သည် သို့မဟုတ် ဖောက်သည်၏ ညွှန်ကြားချက်ကို လက်ခံရယူချိန်',
    nuanceMy: '「わかりました」ထက် ပိုမိုယဉ်ကျေးသော ဝန်ဆောင်မှုစကားလုံး ဖြစ်ပါသည်။',
    exampleDialogues: [
      { speaker: '部長', ja: 'ミラーさん、この書類を５部コピーしてください。', my: 'မီလာစံ၊ ဒီစာရွက်စာတမ်းကို ၅ စုံ မိတ္တူကူးပေးပါ။' },
      { speaker: 'ミラー', ja: 'かしこまりました。すぐに行います。', my: 'ကောင်းပါပြီခင်ဗျာ။ အခုချက်ချင်း ဆောင်ရွက်လိုက်ပါမည်။' },
    ],
  },
  {
    id: 'exp_02_osakini_shitsurei',
    japanese: 'お先に失礼します',
    kana: 'おさきにしつれいします',
    romaji: 'osaki ni shitsurei shimasu',
    english: 'Excuse me for leaving before you / Goodbye (workplace)',
    burmese: 'ကျွန်တော်/မ အရင်ပြန်နှင့်ပါရစေ ခင်ဗျာ/ရှင့် (ရုံးဆင်းချိန်တွင် ကျန်ရှိနေသူများအား နှုတ်ဆက်ခြင်း)',
    category: 'workplace',
    situationMy: 'အလုပ်ခွင်မှ လုပ်ဖော်ကိုင်ဖက်များထက် အရင်ဦးစွာ ပြန်ချိန်တွင် အသုံးပြုရမည့် မရှိမဖြစ် နှုတ်ဆက်စကား',
    nuanceMy: 'တုံ့ပြန်သူက 「お疲れ様でした」(ပင်ပန်းသွားပါပြီ) ဟု အမြဲတမ်း ပြန်လည်နှုတ်ဆက်ရပါသည်။',
    exampleDialogues: [
      { speaker: '田中', ja: '皆さん、お先に失礼します。', my: 'အားလုံးပဲ၊ ကျွန်တော် အရင်ပြန်နှင့်ပါရစေ ခင်ဗျာ။' },
      { speaker: '同僚', ja: 'お疲れ様でした。気をつけて。', my: 'ပင်ပန်းသွားပါပြီ။ ဂရုစိုက်သွားပါနော်။' },
    ],
  },
  {
    id: 'exp_03_otsukaresama',
    japanese: 'お疲れ様でした',
    kana: 'おつかれさまでした',
    romaji: 'otsukaresama deshita',
    english: 'Thank you for your hard work / Good job today',
    burmese: 'ပင်ပန်းသွားပါပြီ / အလုပ်ကြိုးစားမှုအတွက် ကျေးဇူးတင်ပါသည်',
    category: 'workplace',
    situationMy: 'အလုပ်ပြီးဆုံးချိန်၊ ပူးပေါင်းဆောင်ရွက်မှုပြီးချိန်တွင် လုပ်ဖော်ကိုင်ဖက်အချင်းချင်း အသိအမှတ်ပြု နှုတ်ဆက်ခြင်း',
  },
  {
    id: 'exp_04_gochisousama',
    japanese: 'ごちそうさまでした',
    kana: 'ごちそうさまでした',
    romaji: 'gochisousama deshita',
    english: 'Thank you for the meal / It was a feast',
    burmese: 'စားသောက်ပြီးပါပြီ / ကျွေးမွေးဧည့်ခံမှုအတွက် ကျေးဇူးတင်ပါသည်',
    category: 'dining',
    situationMy: 'ထမင်းစားသောက်ပြီးချိန် သို့မဟုတ် စားသောက်ဆိုင်မှ ထွက်ခွာချိန်တွင် ပြောဆိုရသည့် စကား',
    nuanceMy: 'စားသောက်ဆိုင်မှ ငွေရှင်းပြီး ထွက်ခွာချိန်တွင် စားဖိုမှူး သို့မဟုတ် ဝန်ထမ်းအား ကျေးဇူးတင်စကားအဖြစ် ပြောဆိုနိုင်ပါသည်။',
  },
  {
    id: 'exp_05_itadakimasu',
    japanese: 'いただきます',
    kana: 'いただきます',
    romaji: 'itadakimasu',
    english: 'Thank you for the food / Let us eat (said before meals)',
    burmese: 'စားသောက်ပါတော့မည် (အစားအစာမစားမီ အစားအစာနှင့် ပြင်ဆင်ပေးသူအား ကျေးဇူးတင်သောအားဖြင့် ပြောဆိုခြင်း)',
    category: 'dining',
    situationMy: 'အစာမစားမီ လက်အုပ်ချီ၍ ရိုသေစွာ ပြောဆိုရသော စကား',
  },
  {
    id: 'exp_06_odaijini',
    japanese: 'お大事に',
    kana: 'おだいじに',
    romaji: 'odaiji ni',
    english: 'Take care of yourself / Get well soon',
    burmese: 'ဂရုစိုက်ပါနော် / အမြန်သက်သာပါစေ (ဖျားနာနေသူအား နှုတ်ဆက်ခြင်း)',
    category: 'hospitality',
    situationMy: 'နေမကောင်းသူ၊ ဆေးခန်းပြသပြီး ပြန်လာသူ သို့မဟုတ် ဆေးရုံတက်နေသူအား အားပေးနှုတ်ဆက်ချိန်',
    exampleDialogues: [
      { speaker: '医者', ja: '薬を飲んで、暖かくして寝てください。お大事に。', my: 'ဆေးသောက်ပြီး နွေးနွေးထွေးထွေး အိပ်လိုက်ပါ။ အမြန်သက်သာပါစေနော်။' },
      { speaker: '患者', ja: 'どうもありがとうございました。', my: 'ကျေးဇူးအများကြီး တင်ပါတယ် ခင်ဗျာ။' },
    ],
  },
  {
    id: 'exp_07_madamada_desu',
    japanese: 'まだまだです',
    kana: 'まだまだです',
    romaji: 'madamada desu',
    english: 'Not yet / I still have a long way to go (humble reply to compliments)',
    burmese: 'မတော်သေးပါဘူး / လိုပါသေးတယ် (ချီးကျူးခံရချိန်တွင် နှိမ့်ချစွာ တုံ့ပြန်ငြင်းဆိုခြင်း)',
    category: 'responses',
    situationMy: 'မိမိ၏ ဂျပန်စာ သို့မဟုတ် ကျွမ်းကျင်မှုကို သူတစ်ပါးက ချီးကျူးချိန်တွင် ဂျပန်ယဉ်ကျေးမှုအရ နှိမ့်ချပြောဆိုခြင်း',
    exampleDialogues: [
      { speaker: '日本人', ja: '日本語がとてもお上手ですね！', my: 'ဂျပန်စကား အရမ်းတော်တာပဲနော်။' },
      { speaker: '学習者', ja: 'いいえ、まだまだです。もっと勉強します。', my: 'မဟုတ်ပါဘူး၊ မတော်သေးပါဘူးခင်ဗျာ။ ပိုပြီး ကြိုးစားလေ့လာပါဦးမယ်။' },
    ],
  },
  {
    id: 'exp_08_douitashimashite',
    japanese: 'どういたしまして',
    kana: 'どういたしまして',
    romaji: 'dou itashimashite',
    english: "You're welcome / Don't mention it",
    burmese: 'ရပါတယ် / ကိစ္စမရှိပါဘူး (ကျေးဇူးတင်စကားအား ပြန်လည်တုံ့ပြန်ခြင်း)',
    category: 'responses',
    situationMy: 'ကျေးဇူးတင်စကား「ありがとう」ကို ပြန်လည်ဖြေကြားချိန်',
  },
  {
    id: 'exp_09_ittekimasu',
    japanese: 'いってきます',
    kana: 'いってきます',
    romaji: 'itte kimasu',
    english: "I'm off / See you later (leaving home/office)",
    burmese: 'သွားပါတော့မည် (အိမ် သို့မဟုတ် အလုပ်နေရာမှ ခေတ္တထွက်ခွာချိန်)',
    category: 'greetings',
    situationMy: 'အပြင်သို့ ထွက်ခွာခါနီးတွင် အိမ်တွင်ကျန်ရှိသူများအား အသိပေးပြောဆိုခြင်း',
  },
  {
    id: 'exp_10_itterasshai',
    japanese: 'いってらっしゃい',
    kana: 'いってらっしゃい',
    romaji: 'itterasshai',
    english: 'Take care / Have a good day (said to someone leaving)',
    burmese: 'ကောင်းကောင်းသွားပါနော် (ထွက်ခွာသွားသူအား နှုတ်ဆက်ခြင်း)',
    category: 'greetings',
    situationMy: 'အပြင်သို့ ထွက်သွားသူ「いってきます」ကို ပြန်လည်နှုတ်ဆက်စကား',
  },
  {
    id: 'exp_11_tadaima',
    japanese: 'ただいま',
    kana: 'ただいま',
    romaji: 'tadaima',
    english: "I'm home / I'm back",
    burmese: 'ပြန်ရောက်ပါပြီ (အိမ် သို့မဟုတ် ဌာနသို့ ပြန်လည်ရောက်ရှိချိန်)',
    category: 'greetings',
    situationMy: 'အပြင်မှ ပြန်ရောက်ရောက်ချင်း အသံထွက်နှုတ်ဆက်ခြင်း',
  },
  {
    id: 'exp_12_okaerinasai',
    japanese: 'おかえりなさい',
    kana: 'おかえりなさい',
    romaji: 'okaerinasai',
    english: 'Welcome home / Welcome back',
    burmese: 'ပြန်ရောက်လာပြီလား / ကြိုဆိုပါတယ် (ပြန်ရောက်လာသူအား နှုတ်ဆက်ခြင်း)',
    category: 'greetings',
    situationMy: 'ပြန်ရောက်လာသူ「ただいま」အား ပြန်လည်ကြိုဆိုနှုတ်ဆက်ခြင်း',
  },
  {
    id: 'exp_13_shitsureishimasu',
    japanese: '失礼します',
    kana: 'しつれいします',
    romaji: 'shitsurei shimasu',
    english: 'Excuse me (entering a room / hanging up phone)',
    burmese: 'ခွင့်ပြုပါဦး / ဝင်ခွင့်ပြုပါ (အခန်းထဲသို့ ဝင်ရောက်ချိန် သို့မဟုတ် ဖုန်းချချိန်)',
    category: 'workplace',
    situationMy: 'ဆရာ့ရုံးခန်း၊ လူကြီးများ၏ အခန်းတွင်းသို့ ဝင်ရောက်ချိန် သို့မဟုတ် ရုံးဖုန်းပြောဆိုပြီးချိန်',
  },
  {
    id: 'exp_14_irasshaimase',
    japanese: 'いらっしゃいませ',
    kana: 'いらっしゃいませ',
    romaji: 'irasshaimase',
    english: 'Welcome (to our store/restaurant)',
    burmese: 'ကြိုဆိုပါသည် ခင်ဗျာ/ရှင့် (ဆိုင်သို့ ရောက်ရှိလာသော ဧည့်သည်အား ဝန်ထမ်းများက နှုတ်ဆက်ခြင်း)',
    category: 'hospitality',
    situationMy: 'စတိုးဆိုင်၊ စူပါမားကတ် သို့မဟုတ် စားသောက်ဆိုင်သို့ ဧည့်သည်ဝင်ရောက်လာချိန်',
  },
  {
    id: 'exp_15_shoushou_omachikudasai',
    japanese: '少々お待ちください',
    kana: 'しょうしょうおまちください',
    romaji: 'shoushou omachi kudasai',
    english: 'Please wait a moment (polite)',
    burmese: 'ခဏလောက် စောင့်ဆိုင်းပေးပါ ခင်ဗျာ/ရှင့် (ယဉ်ကျေးသော ဝန်ဆောင်မှုအသုံး)',
    category: 'hospitality',
    situationMy: 'ဖုန်းလွှဲပေးချိန်၊ စာရွက်စာတမ်း သို့မဟုတ် ပစ္စည်းသွားယူချိန်တွင် ဖောက်သည်အား စောင့်ခိုင်းခြင်း',
  },
  {
    id: 'exp_16_ojamashimasu',
    japanese: 'お邪魔します',
    kana: 'おじゃまします',
    romaji: 'ojama shimasu',
    english: 'Excuse me for intruding (entering someone else’s home)',
    burmese: 'အနှောင့်အယှက်ပေးမိပါပြီ / ဝင်ခွင့်ပြုပါ (သူတစ်ပါးအိမ်သို့ ဝင်ရောက်လည်ပတ်ချိန်)',
    category: 'hospitality',
    situationMy: 'သူငယ်ချင်း သို့မဟုတ် လုပ်ဖော်ကိုင်ဖက်၏ အိမ်တံခါးဝမှ အိမ်ထဲသို့ ခြေလှမ်းစလှမ်းချိန်',
  },
  {
    id: 'exp_17_yoroshiku_onegai',
    japanese: 'よろしくお願いします',
    kana: 'よろしくおねがいします',
    romaji: 'yoroshiku onegai shimasu',
    english: 'Pleasure to meet you / Please treat me well / Thank you in advance',
    burmese: 'ကျေးဇူးပြု၍ ကူညီစောင့်ရှောက်ပေးပါ / ကောင်းမွန်စွာ ဆက်ဆံပေးပါ ခင်ဗျာ/ရှင့်',
    category: 'workplace',
    situationMy: 'မိတ်ဆက်ချိန်၊ အလုပ်စတင်ချိန် သို့မဟုတ် အကူအညီတောင်းခံချိန်တွင် မရှိမဖြစ် သုံးစွဲသော အဓိကစကား',
  },
  {
    id: 'exp_18_okagesamade',
    japanese: 'おかげさまで',
    kana: 'おかげさまで',
    romaji: 'okagesama de',
    english: 'Thanks to you / Fortunately, all is well',
    burmese: 'သင့်ကျေးဇူးကြောင့်ပါ / အားလုံး အဆင်ပြေပါတယ် ခင်ဗျာ/ရှင့်',
    category: 'responses',
    situationMy: 'ကျန်းမာရေး သို့မဟုတ် အခြေအနေမေးမြန်းမှု「お元気ですか」ကို ပြန်လည်ဖြေကြားချိန်',
  },
  {
    id: 'exp_19_gomen_kudasai',
    japanese: 'ごめんください',
    kana: 'ごめんください',
    romaji: 'gomen kudasai',
    english: 'Excuse me, is anyone there? (at front door)',
    burmese: 'ရှိကြပါသလား ခင်ဗျာ/ရှင့် (သူတစ်ပါးအိမ်ရှေ့ တံခါးဝမှ အသံပေးခေါ်ဆိုခြင်း)',
    category: 'hospitality',
    situationMy: 'ဧည့်သည်အဖြစ် အခြားသူအိမ်သို့ သွားရောက်လည်ပတ်၍ တံခါးခေါက်ချိန်',
  },
  {
    id: 'exp_20_kiotsukete',
    japanese: '気をつけて',
    kana: 'きをつけて',
    romaji: 'ki o tsukete',
    english: 'Take care / Be careful on your way',
    burmese: 'ဂရုစိုက်သွားပါနော် / သတိထားပါ',
    category: 'greetings',
    situationMy: 'မိုးရွာနေချိန်၊ နှင်းကျနေချိန် သို့မဟုတ် ခရီးထွက်မည့်သူအား သတိပေးနှုတ်ဆက်ခြင်း',
  },
];

// -------------------------------------------------------------------------------------
// 2. COMPREHENSIVE N5 COUNTER REFERENCE TABLES
// -------------------------------------------------------------------------------------

export const N5_COUNTERS_TABLE: Record<string, N5CounterEntry> = {
  tsu: {
    counterKanji: 'つ',
    counterKana: 'つ',
    targetCategoryEn: 'General objects / Unclassified items',
    targetCategoryMy: 'အထွေထွေပစ္စည်းများ၊ သဘာဝအရာဝတ္ထုများ (၁ ခု မှ ၁၀ ခုအထိ)',
    questionWord: { japanese: 'いくつ', kana: 'いくつ', meaningMy: 'ဘယ်နှစ်ခုပါလဲ' },
    items: [
      { count: 1, japanese: '一つ', kana: 'ひとつ', romaji: 'hitotsu', isIrregular: false, burmese: '၁ ခု' },
      { count: 2, japanese: '二つ', kana: 'ふたつ', romaji: 'futatsu', isIrregular: false, burmese: '၂ ခု' },
      { count: 3, japanese: '三つ', kana: 'みっつ', romaji: 'mittsu', isIrregular: false, burmese: '၃ ခု' },
      { count: 4, japanese: '四つ', kana: 'よっつ', romaji: 'yottsu', isIrregular: false, burmese: '၄ ခု' },
      { count: 5, japanese: '五つ', kana: 'いつつ', romaji: 'itsutsu', isIrregular: false, burmese: '၅ ခု' },
      { count: 6, japanese: '六つ', kana: 'むっつ', romaji: 'muttsu', isIrregular: false, burmese: '၆ ခု' },
      { count: 7, japanese: '七つ', kana: 'ななつ', romaji: 'nanatsu', isIrregular: false, burmese: '၇ ခု' },
      { count: 8, japanese: '八つ', kana: 'やっつ', romaji: 'yattsu', isIrregular: false, burmese: '၈ ခု' },
      { count: 9, japanese: '九つ', kana: 'ここのつ', romaji: 'kokonotsu', isIrregular: false, burmese: '၉ ခု' },
      { count: 10, japanese: '十', kana: 'とお', romaji: 'too', isIrregular: true, burmese: '၁၀ ခု (つ မပါပါ)' },
    ],
  },
  nin: {
    counterKanji: '人',
    counterKana: 'にん',
    targetCategoryEn: 'People / Persons',
    targetCategoryMy: 'လူဦးရေ (ယောက်)',
    questionWord: { japanese: '何人', kana: 'なんにん', meaningMy: 'ဘယ်နှစ်ယောက်ပါလဲ' },
    items: [
      { count: 1, japanese: '一人', kana: 'ひとり', romaji: 'hitori', isIrregular: true, burmese: '၁ ယောက်' },
      { count: 2, japanese: '二人', kana: 'ふたり', romaji: 'futari', isIrregular: true, burmese: '၂ ယောက်' },
      { count: 3, japanese: '三人', kana: 'さんにん', romaji: 'sannin', isIrregular: false, burmese: '၃ ယောက်' },
      { count: 4, japanese: '四人', kana: 'よにん', romaji: 'yonin', isIrregular: true, burmese: '၄ ယောက် (よんにん/しにん မဟုတ်ပါ)' },
      { count: 5, japanese: '五人', kana: 'ごにん', romaji: 'gonin', isIrregular: false, burmese: '၅ ယောက်' },
      { count: 6, japanese: '六人', kana: 'ろくにん', romaji: 'rokunin', isIrregular: false, burmese: '၆ ယောက်' },
      { count: 7, japanese: '七人', kana: 'しちにん / ななにん', romaji: 'shichinin / nananin', isIrregular: false, burmese: '၇ ယောက်' },
      { count: 8, japanese: '八人', kana: 'はちにん', romaji: 'hachinin', isIrregular: false, burmese: '၈ ယောက်' },
      { count: 9, japanese: '九人', kana: 'きゅうにん / くにん', romaji: 'kyuunin / kunin', isIrregular: false, burmese: '၉ ယောက်' },
      { count: 10, japanese: '十人', kana: 'じゅうにん', romaji: 'juunin', isIrregular: false, burmese: '၁၀ ယောက်' },
    ],
  },
  mai: {
    counterKanji: '枚',
    counterKana: 'まい',
    targetCategoryEn: 'Thin, flat objects (paper, shirts, plates, tickets)',
    targetCategoryMy: 'ပါးလွှာပြားချပ်သော အရာများ (စက္ကူ၊ လက်မှတ်၊ ရှပ်အင်္ကျီ၊ ပန်းကန်ပြား)',
    questionWord: { japanese: '何枚', kana: 'なんまい', meaningMy: 'ဘယ်နှစ်ချပ်/ရွက်/ထည်ပါလဲ' },
    items: [
      { count: 1, japanese: '一枚', kana: 'いちまい', romaji: 'ichimai', isIrregular: false, burmese: '၁ ချပ်' },
      { count: 2, japanese: '二枚', kana: 'にまい', romaji: 'nimai', isIrregular: false, burmese: '၂ ချပ်' },
      { count: 3, japanese: '三枚', kana: 'さんまい', romaji: 'sanmai', isIrregular: false, burmese: '၃ ချပ်' },
      { count: 4, japanese: '四枚', kana: 'よんまい', romaji: 'yonmai', isIrregular: false, burmese: '၄ ချပ်' },
      { count: 5, japanese: '五枚', kana: 'ごまい', romaji: 'gomai', isIrregular: false, burmese: '၅ ချပ်' },
      { count: 6, japanese: '六枚', kana: 'ろくまい', romaji: 'rokumai', isIrregular: false, burmese: '၆ ချပ်' },
      { count: 7, japanese: '七枚', kana: 'ななまい', romaji: 'nanamai', isIrregular: false, burmese: '၇ ချပ်' },
      { count: 8, japanese: '八枚', kana: 'はちまい', romaji: 'hachimai', isIrregular: false, burmese: '၈ ချပ်' },
      { count: 9, japanese: '九枚', kana: 'きゅうまい', romaji: 'kyuumai', isIrregular: false, burmese: '၉ ချပ်' },
      { count: 10, japanese: '十枚', kana: 'じゅうまい', romaji: 'juumai', isIrregular: false, burmese: '၁၀ ချပ်' },
    ],
  },
  dai: {
    counterKanji: '台',
    counterKana: 'だい',
    targetCategoryEn: 'Vehicles and electrical appliances (cars, PCs, TVs)',
    targetCategoryMy: 'စက်ယန္တရား၊ ကား၊ ကွန်ပျူတာ၊ တီဗွီ၊ စက်ပစ္စည်း (စီး/လုံး)',
    questionWord: { japanese: '何台', kana: 'なんだい', meaningMy: 'ဘယ်နှစ်စီး/လုံးပါလဲ' },
    items: [
      { count: 1, japanese: '一台', kana: 'いちだい', romaji: 'ichidai', isIrregular: false, burmese: '၁ စီး/လုံး' },
      { count: 2, japanese: '二台', kana: 'にだい', romaji: 'nidai', isIrregular: false, burmese: '၂ စီး/လုံး' },
      { count: 3, japanese: '三台', kana: 'さんだい', romaji: 'sandai', isIrregular: false, burmese: '၃ စီး/လုံး' },
      { count: 4, japanese: '四台', kana: 'よんだい', romaji: 'yondai', isIrregular: false, burmese: '၄ စီး/လုံး' },
      { count: 5, japanese: '五台', kana: 'ごだい', romaji: 'godai', isIrregular: false, burmese: '၅ စီး/လုံး' },
      { count: 6, japanese: '六台', kana: 'ろくだい', romaji: 'rokudai', isIrregular: false, burmese: '၆ စီး/လုံး' },
      { count: 7, japanese: '七台', kana: 'ななだい', romaji: 'nanadai', isIrregular: false, burmese: '၇ စီး/လုံး' },
      { count: 8, japanese: '八台', kana: 'はちだい', romaji: 'hachidai', isIrregular: false, burmese: '၈ စီး/လုံး' },
      { count: 9, japanese: '九台', kana: 'きゅうだい', romaji: 'kyuudai', isIrregular: false, burmese: '၉ စီး/လုံး' },
      { count: 10, japanese: '十台', kana: 'じゅうだい', romaji: 'juudai', isIrregular: false, burmese: '၁၀ စီး/လုံး' },
    ],
  },
  satsu: {
    counterKanji: '冊',
    counterKana: 'さつ',
    targetCategoryEn: 'Bound volumes (books, magazines, notebooks)',
    targetCategoryMy: 'စာအုပ်များ၊ မဂ္ဂဇင်းများ၊ မှတ်စုစာအုပ်များ (အုပ်)',
    questionWord: { japanese: '何冊', kana: 'なんさつ', meaningMy: 'ဘယ်နှစ်အုပ်ပါလဲ' },
    items: [
      { count: 1, japanese: '一冊', kana: 'いっさつ', romaji: 'issatsu', isIrregular: true, burmese: '၁ အုပ် (အသံတွဲဆက်)' },
      { count: 2, japanese: '二冊', kana: 'にさつ', romaji: 'nisatsu', isIrregular: false, burmese: '၂ အုပ်' },
      { count: 3, japanese: '三冊', kana: 'さんさつ', romaji: 'sansatsu', isIrregular: false, burmese: '၃ အုပ်' },
      { count: 4, japanese: '四冊', kana: 'よんさつ', romaji: 'yonsatsu', isIrregular: false, burmese: '၄ အုပ်' },
      { count: 5, japanese: '五冊', kana: 'ごさつ', romaji: 'gosatsu', isIrregular: false, burmese: '၅ အုပ်' },
      { count: 6, japanese: '六冊', kana: 'ろくさつ', romaji: 'rokusatsu', isIrregular: false, burmese: '၆ အုပ်' },
      { count: 7, japanese: '七冊', kana: 'ななさつ', romaji: 'nanasatsu', isIrregular: false, burmese: '၇ အုပ်' },
      { count: 8, japanese: '八冊', kana: 'はっさつ', romaji: 'hassatsu', isIrregular: true, burmese: '၈ အုပ် (အသံတွဲဆက်)' },
      { count: 9, japanese: '九冊', kana: 'きゅうさつ', romaji: 'kyuusatsu', isIrregular: false, burmese: '၉ အုပ်' },
      { count: 10, japanese: '十冊', kana: 'じゅっさつ / じっさつ', romaji: 'jussatsu / jissatsu', isIrregular: true, burmese: '၁၀ အုပ် (အသံတွဲဆက်)' },
    ],
  },
  hon: {
    counterKanji: '本',
    counterKana: 'ほん',
    targetCategoryEn: 'Long cylindrical objects (bottles, pens, trees, umbrellas, roads)',
    targetCategoryMy: 'ရှည်လျားသောအရာများ (ပုလင်း၊ ဘောပင်၊ သစ်ပင်၊ ထီး၊ လမ်း)',
    questionWord: { japanese: '何本', kana: 'なんぼん', meaningMy: 'ဘယ်နှစ်ချောင်း/လက်/ပင်/ပုလင်းပါလဲ' },
    items: [
      { count: 1, japanese: '一本', kana: 'いっぽん', romaji: 'ippon', isIrregular: true, burmese: '၁ ချောင်း (ぽん)' },
      { count: 2, japanese: '二本', kana: 'にほん', romaji: 'nihon', isIrregular: false, burmese: '၂ ချောင်း (ほん)' },
      { count: 3, japanese: '三本', kana: 'さんぼん', romaji: 'sanbon', isIrregular: true, burmese: '၃ ချောင်း (ぼん - အသံပျော့)' },
      { count: 4, japanese: '四本', kana: 'よんほん', romaji: 'yonhon', isIrregular: false, burmese: '၄ ချောင်း' },
      { count: 5, japanese: '五本', kana: 'ごほん', romaji: 'gohon', isIrregular: false, burmese: '၅ ချောင်း' },
      { count: 6, japanese: '六本', kana: 'ろっぽん', romaji: 'roppon', isIrregular: true, burmese: '၆ ချောင်း (ぽん)' },
      { count: 7, japanese: '七本', kana: 'ななほん', romaji: 'nanahon', isIrregular: false, burmese: '၇ ချောင်း' },
      { count: 8, japanese: '八本', kana: 'はっぽん', romaji: 'happon', isIrregular: true, burmese: '၈ ချောင်း (ぽん)' },
      { count: 9, japanese: '九本', kana: 'きゅうほん', romaji: 'kyuuhon', isIrregular: false, burmese: '၉ ချောင်း' },
      { count: 10, japanese: '十本', kana: 'じゅっぽん / じっぽん', romaji: 'juppon / jippon', isIrregular: true, burmese: '၁၀ ချောင်း (ぽん)' },
    ],
  },
  hai: {
    counterKanji: '杯',
    counterKana: 'はい',
    targetCategoryEn: 'Cups and glasses of liquid (coffee, tea, water, beer)',
    targetCategoryMy: 'ခွက်၊ ဖန်ခွက် (ရေ၊ ကော်ဖီ၊ လက်ဖက်ရည်၊ ဘီယာ)',
    questionWord: { japanese: '何杯', kana: 'なんばい', meaningMy: 'ဘယ်နှစ်ခွက်ပါလဲ' },
    items: [
      { count: 1, japanese: '一杯', kana: 'いっぱい', romaji: 'ippai', isIrregular: true, burmese: '၁ ခွက် (ぱい)' },
      { count: 2, japanese: '二杯', kana: 'にはい', romaji: 'nihai', isIrregular: false, burmese: '၂ ခွက် (はい)' },
      { count: 3, japanese: '三杯', kana: 'さんばい', romaji: 'sanbai', isIrregular: true, burmese: '၃ ခွက် (ばい)' },
      { count: 4, japanese: '四杯', kana: 'よんはい', romaji: 'yonhai', isIrregular: false, burmese: '၄ ခွက်' },
      { count: 5, japanese: '五杯', kana: 'ごはい', romaji: 'gohai', isIrregular: false, burmese: '၅ ခွက်' },
      { count: 6, japanese: '六杯', kana: 'ろっぱい', romaji: 'roppai', isIrregular: true, burmese: '၆ ခွက် (ぱい)' },
      { count: 7, japanese: '七杯', kana: 'ななはい', romaji: 'nanahai', isIrregular: false, burmese: '၇ ခွက်' },
      { count: 8, japanese: '八杯', kana: 'はっぱい', romaji: 'happai', isIrregular: true, burmese: '၈ ခွက် (ぱい)' },
      { count: 9, japanese: '九杯', kana: 'きゅうはい', romaji: 'kyuuhai', isIrregular: false, burmese: '၉ ခွက်' },
      { count: 10, japanese: '十杯', kana: 'じゅっぱい / じっぱい', romaji: 'juppai / jippai', isIrregular: true, burmese: '၁၀ ခွက် (ぱい)' },
    ],
  },
  hiki: {
    counterKanji: '匹',
    counterKana: 'ひき',
    targetCategoryEn: 'Small animals, fish, insects (dogs, cats, fish)',
    targetCategoryMy: 'တိရစ္ဆာန်အသေးများ (ခွေး၊ ကြောင်၊ ငါး၊ အင်းဆက်)',
    questionWord: { japanese: '何匹', kana: 'なんびき', meaningMy: 'ဘယ်နှစ်ကောင်ပါလဲ' },
    items: [
      { count: 1, japanese: '一匹', kana: 'いっぴき', romaji: 'ippiki', isIrregular: true, burmese: '၁ ကောင် (ぴき)' },
      { count: 2, japanese: '二匹', kana: 'にひき', romaji: 'nihiki', isIrregular: false, burmese: '၂ ကောင် (ひき)' },
      { count: 3, japanese: '三匹', kana: 'さんびき', romaji: 'sanbiki', isIrregular: true, burmese: '၃ ကောင် (びき)' },
      { count: 4, japanese: '四匹', kana: 'よんひき', romaji: 'yonhiki', isIrregular: false, burmese: '၄ ကောင်' },
      { count: 5, japanese: '五匹', kana: 'ごひき', romaji: 'gohiki', isIrregular: false, burmese: '၅ ကောင်' },
      { count: 6, japanese: '六匹', kana: 'ろっぴき', romaji: 'roppiki', isIrregular: true, burmese: '၆ ကောင် (ぴき)' },
      { count: 7, japanese: '七匹', kana: 'ななひき', romaji: 'nanahiki', isIrregular: false, burmese: '၇ ကောင်' },
      { count: 8, japanese: '八匹', kana: 'はっぴき', romaji: 'happiki', isIrregular: true, burmese: '၈ ကောင် (ぴき)' },
      { count: 9, japanese: '九匹', kana: 'きゅうひき', romaji: 'kyuuhiki', isIrregular: false, burmese: '၉ ကောင်' },
      { count: 10, japanese: '十匹', kana: 'じゅっぴき / じっぴき', romaji: 'juppiki / jippiki', isIrregular: true, burmese: '၁၀ ကောင် (ぴき)' },
    ],
  },
};

// -------------------------------------------------------------------------------------
// 3. CALENDAR DATES REFERENCE TABLE (1日 - 31日 & 何日)
// -------------------------------------------------------------------------------------

export const N5_CALENDAR_DATES: N5DateEntry[] = [
  { day: 1, japanese: '一日', kana: 'ついたち', romaji: 'tsuitachi', isIrregular: true, burmese: 'လဆန်း ၁ ရက်နေ့', phoneticNoteMy: 'ကြာချိန်「いちにち (တစ်ရက်)」နှင့် ကွဲပြားသည်' },
  { day: 2, japanese: '二日', kana: 'ふつか', romaji: 'futsuka', isIrregular: true, burmese: '၂ ရက်နေ့' },
  { day: 3, japanese: '三日', kana: 'みっか', romaji: 'mikka', isIrregular: true, burmese: '၃ ရက်နေ့' },
  { day: 4, japanese: '四日', kana: 'よっか', romaji: 'yokka', isIrregular: true, burmese: '၄ ရက်နေ့' },
  { day: 5, japanese: '五日', kana: 'いつか', romaji: 'itsuka', isIrregular: true, burmese: '၅ ရက်နေ့' },
  { day: 6, japanese: '六日', kana: 'むいか', romaji: 'muika', isIrregular: true, burmese: '၆ ရက်နေ့' },
  { day: 7, japanese: '七日', kana: 'なのか', romaji: 'nanoka', isIrregular: true, burmese: '၇ ရက်နေ့' },
  { day: 8, japanese: '八日', kana: 'ようか', romaji: 'youka', isIrregular: true, burmese: '၈ ရက်နေ့', phoneticNoteMy: '၄ ရက်နေ့「よっか」နှင့် အသံဆင်တူသဖြင့် သတိပြုရန်' },
  { day: 9, japanese: '九日', kana: 'ここのか', romaji: 'kokonoka', isIrregular: true, burmese: '၉ ရက်နေ့' },
  { day: 10, japanese: '十日', kana: 'とおか', romaji: 'tooka', isIrregular: true, burmese: '၁၀ ရက်နေ့' },
  { day: 11, japanese: '十一日', kana: 'じゅういちにち', romaji: 'juuichinichi', isIrregular: false, burmese: '၁၁ ရက်နေ့' },
  { day: 12, japanese: '十二日', kana: 'じゅうににち', romaji: 'juuninichi', isIrregular: false, burmese: '၁၂ ရက်နေ့' },
  { day: 13, japanese: '十三日', kana: 'じゅうさんにち', romaji: 'juusannichi', isIrregular: false, burmese: '၁၃ ရက်နေ့' },
  { day: 14, japanese: '十四日', kana: 'じゅうよっか', romaji: 'juuyokka', isIrregular: true, burmese: '၁၄ ရက်နေ့ (အထူးအသံထွက်)' },
  { day: 15, japanese: '十五日', kana: 'じゅうごにち', romaji: 'juugonichi', isIrregular: false, burmese: '၁၅ ရက်နေ့' },
  { day: 16, japanese: '十六日', kana: 'じゅうろくにち', romaji: 'juurokunichi', isIrregular: false, burmese: '၁၆ ရက်နေ့' },
  { day: 17, japanese: '十七日', kana: 'じゅうしちにち / じゅうななにち', romaji: 'juushichinichi / juunananichi', isIrregular: false, burmese: '၁၇ ရက်နေ့' },
  { day: 18, japanese: '十八日', kana: 'じゅうはちにち', romaji: 'juuhachinichi', isIrregular: false, burmese: '၁၈ ရက်နေ့' },
  { day: 19, japanese: '十九日', kana: 'じゅうくにち', romaji: 'juukunichi', isIrregular: false, burmese: '၁၉ ရက်နေ့' },
  { day: 20, japanese: '二十日', kana: 'はつか', romaji: 'hatsuka', isIrregular: true, burmese: '၂၀ ရက်နေ့ (အထူးအသံထွက်)' },
  { day: 21, japanese: '二十一日', kana: 'にじゅういちにち', romaji: 'nijuuichinichi', isIrregular: false, burmese: '၂၁ ရက်နေ့' },
  { day: 22, japanese: '二十二日', kana: 'にじゅうににち', romaji: 'nijuuninichi', isIrregular: false, burmese: '၂၂ ရက်နေ့' },
  { day: 23, japanese: '二十三日', kana: 'にじゅうさんにち', romaji: 'nijuusannichi', isIrregular: false, burmese: '၂၃ ရက်နေ့' },
  { day: 24, japanese: '二十四日', kana: 'にじゅうよっか', romaji: 'nijuuyokka', isIrregular: true, burmese: '၂၄ ရက်နေ့ (အထူးအသံထွက်)' },
  { day: 25, japanese: '二十五日', kana: 'にじゅうごにち', romaji: 'nijuugonichi', isIrregular: false, burmese: '၂၅ ရက်နေ့' },
  { day: 26, japanese: '二十六日', kana: 'にじゅうろくにち', romaji: 'nijuurokunichi', isIrregular: false, burmese: '၂၆ ရက်နေ့' },
  { day: 27, japanese: '二十七日', kana: 'にじゅうしちにち / にじゅうななにち', romaji: 'nijuushichinichi', isIrregular: false, burmese: '၂၇ ရက်နေ့' },
  { day: 28, japanese: '二十八日', kana: 'にじゅうはちにち', romaji: 'nijuuhachinichi', isIrregular: false, burmese: '၂၈ ရက်နေ့' },
  { day: 29, japanese: '二十九日', kana: 'にじゅうくにち', romaji: 'nijuukunichi', isIrregular: false, burmese: '၂၉ ရက်နေ့' },
  { day: 30, japanese: '三十日', kana: 'さんじゅうにち', romaji: 'sanjuunichi', isIrregular: false, burmese: '၃၀ ရက်နေ့' },
  { day: 31, japanese: '三十一日', kana: 'さんじゅういちにち', romaji: 'sanjuuichinichi', isIrregular: false, burmese: '၃၁ ရက်နေ့' },
];

// -------------------------------------------------------------------------------------
// 4. IRREGULAR PHONETIC SHIFTS & HIGH-YIELD VOCABULARY
// -------------------------------------------------------------------------------------

export const N5_PHONETIC_SHIFTS: N5PhoneticShift[] = [
  {
    number: 300,
    baseKanji: '三百',
    reading: 'さんびゃく',
    shiftType: 'rendaku',
    burmese: '၃၀၀ (ဆန်ဗျခု)',
    explanationMy: 'ひゃく မှ びゃく သို့ အသံပြောင်းလဲသွားပါသည် (Rendaku / 連濁)။',
  },
  {
    number: 600,
    baseKanji: '六百',
    reading: 'ろっぴゃく',
    shiftType: 'gemination',
    burmese: '၆၀၀ (ရော့ပျခု)',
    explanationMy: 'ろくひゃく မဟုတ်ဘဲ ろっぴゃく အဖြစ် အသံတွဲဆက်ပြောင်းလဲပါသည် (Sokuon / 促音化)။',
  },
  {
    number: 800,
    baseKanji: '八百',
    reading: 'はっぴゃく',
    shiftType: 'gemination',
    burmese: '၈၀၀ (ဟတ်ပျခု)',
    explanationMy: 'はちひゃく မဟုတ်ဘဲ はっぴゃく အဖြစ် အသံတွဲဆက်ပြောင်းလဲပါသည် (促音化)။',
  },
  {
    number: 3000,
    baseKanji: '三千',
    reading: 'さんぜん',
    shiftType: 'rendaku',
    burmese: '၃,၀၀၀ (ဆန်ဇန်)',
    explanationMy: 'せん မှ ぜん သို့ အသံပြော့ပြောင်းလဲသွားပါသည် (連濁)။',
  },
  {
    number: 8000,
    baseKanji: '八千',
    reading: 'はっせん',
    shiftType: 'gemination',
    burmese: '၈,၀၀၀ (ဟတ်ဆန်)',
    explanationMy: 'はちせん မဟုတ်ဘဲ はっせん အဖြစ် အသံတွဲဆက်ပြောင်းလဲပါသည် (促音化)။',
  },
  {
    number: 'yao-ya',
    baseKanji: '八百屋',
    reading: 'やおや',
    shiftType: 'special_reading',
    burmese: 'သစ်သီးနှင့် ဟင်းသီးဟင်းရွက်ဆိုင် (ယာအိုယ)',
    explanationMy: '八百 (ဟတ်ပျခု) မှ ဆင်းသက်လာသော အထူးအသံထွက်စကားလုံး ဖြစ်ပါသည်။',
  },
  {
    number: 'tsuitachi',
    baseKanji: '一日',
    reading: 'ついたち',
    shiftType: 'special_reading',
    burmese: 'လဆန်းတစ်ရက်နေ့ (ဆွီသာချိ)',
    explanationMy: 'လ၏ ပထမဆုံးနေ့ဖြစ်ပြီး 「つきたち (လစတင်ခြင်း)」မှ ပြောင်းလဲလာသော ရှေးဟောင်းအသံထွက် ဖြစ်ပါသည်။',
  },
  {
    number: 'hatachi',
    baseKanji: '二十歳',
    reading: 'はたち',
    shiftType: 'special_reading',
    burmese: 'အသက် ၂၀ ပြည့် (ဟာသာချိ)',
    explanationMy: 'ဂျပန်နိုင်ငံ၏ လူလားမြောက်သော အသက်အရွယ်ဖြစ်ပြီး 「にじゅっさい」အစား「はたち」ဟုသာ အထူးသုံးစွဲပါသည်။',
  },
  {
    number: 'kesa',
    baseKanji: '今朝',
    reading: 'けさ',
    shiftType: 'special_reading',
    burmese: 'ယနေ့မနက် (ခဲဆာ)',
    explanationMy: '「いまあさ」မဟုတ်ဘဲ「けさ」ဟု အထူးဖတ်ရှုရပါသည်။',
  },
  {
    number: 'kotoshi',
    baseKanji: '今年',
    reading: 'ことし',
    shiftType: 'special_reading',
    burmese: 'ယခုနှစ် (ခိုသိုရှိ)',
    explanationMy: '「こんねん」ထက် နေ့စဉ်စကားပြောတွင်「ことし」ဟုသာ အသုံးများပါသည်။',
  },
  {
    number: 'ototoi',
    baseKanji: '一昨日',
    reading: 'おととい',
    shiftType: 'special_reading',
    burmese: 'တစ်နေ့က / မနေ့ကတစ်နေ့ (အိုသိုသိုအိ)',
    explanationMy: 'မနေ့က မတိုင်မီနေ့ကို ခေါ်ဆိုသော အထူးအသံထွက် ဖြစ်ပါသည်။',
  },
  {
    number: 'asatte',
    baseKanji: '明後日',
    reading: 'あさって',
    shiftType: 'special_reading',
    burmese: 'သဘက်ခါ (အာဆတ်သဲ)',
    explanationMy: 'မနက်ဖြန်ပြီးနောက်တစ်နေ့ကို ခေါ်ဆိုသော အသုံးအနှုန်း ဖြစ်ပါသည်။',
  },
];
