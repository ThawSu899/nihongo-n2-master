import { AudioRef, Question } from '../models/types';

export type ChoukaiType = 'kadai_rikai' | 'point_rikai' | 'sokuji_outou';

export interface ChoukaiSpeaker {
  id: string;
  name: string;
  nameJa: string;
  role: string;
  gender: 'male' | 'female' | 'neutral';
  pitch: number;
  rateMultiplier: number;
  avatarBg: string; // Tailwind class
}

export interface ChoukaiLine {
  id: string;
  speakerId: string;
  japanese: string;
  reading?: string;
  english: string;
  burmese?: string;
  isAnswerClue?: boolean; // Marks the definitive sentence providing the answer
  clueRationaleEn?: string;
  clueRationaleMy?: string;
  pitchAccent?: 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka';
  dropMora?: number;
}

export interface ChoukaiDistractorAnalysis {
  choiceText: string;
  isCorrect: boolean;
  trapType?: string; // e.g. "別の人の行動", "時間順序の混同", "本文に記述なし", "逆の結論"
  explanationEn: string;
  explanationMy?: string;
}

export interface ChoukaiScenario {
  id: string;
  type: ChoukaiType;
  typeLabel: string;
  typeDescription: string;
  level: 'N2' | 'N3';
  title: string;
  titleJa: string;
  situation: string; // The contextual prompt read by announcer (e.g. "会社で男の人と女の人が話しています。")
  speakers: ChoukaiSpeaker[];
  dialogue: ChoukaiLine[];
  questionPromptJa: string;
  questionPromptEn: string;
  choices: string[];
  correctAnswer: string;
  answerIndex: number; // 0-based
  distractorAnalyses: ChoukaiDistractorAnalysis[];
  strategyTipEn: string;
  strategyTipJa: string;
  keyVocabulary: Array<{
    term: string;
    reading: string;
    pos: string;
    meaningEn: string;
    meaningMy?: string;
  }>;
}

export const CHOUKAI_SCENARIOS: ChoukaiScenario[] = [
  // -------------------------------------------------------------
  // 1. KADAI RIKAI (課題理解 - Task Comprehension)
  // Question Type: "What must the person do first/next?"
  // -------------------------------------------------------------
  {
    id: 'choukai_n2_01_kadai',
    type: 'kadai_rikai',
    typeLabel: '課題理解 (Task Comprehension)',
    typeDescription: 'Identify the immediate next action required among competing tasks and deferred requests.',
    level: 'N2',
    title: 'Urgent Client Presentation Prep',
    titleJa: 'クライアント向けプレゼン資料の修正（課題理解）',
    situation: 'オフィスで課長と女性の部下が明日のプレゼンについて話しています。',
    speakers: [
      {
        id: 'announcer',
        name: 'Announcer',
        nameJa: 'ナレーション',
        role: 'Exam Proctor',
        gender: 'female',
        pitch: 1.05,
        rateMultiplier: 0.95,
        avatarBg: 'bg-stone-700',
      },
      {
        id: 'manager_m',
        name: 'Manager Tanaka',
        nameJa: '田中課長',
        role: 'Department Head',
        gender: 'male',
        pitch: 0.85,
        rateMultiplier: 0.95,
        avatarBg: 'bg-indigo-900',
      },
      {
        id: 'staff_f',
        name: 'Sato',
        nameJa: '佐藤さん',
        role: 'Junior Staff',
        gender: 'female',
        pitch: 1.18,
        rateMultiplier: 1.0,
        avatarBg: 'bg-rose-900',
      },
    ],
    dialogue: [
      {
        id: 'l1',
        speakerId: 'announcer',
        japanese: 'オフィスで、課長と女性の部下が明日のプレゼンについて話しています。女の人はこの後、まず何をしなければなりませんか。',
        english: 'In an office, a manager and a female subordinate are talking about tomorrow’s presentation. What must the woman do first after this?',
        burmese: 'ရုံးခန်းထဲတွင် မန်နေဂျာနှင့် အမျိုးသမီးဝန်ထမ်းသည် မနက်ဖြန်တင်ပြချက်အကြောင်း ဆွေးနွေးနေကြသည်။ အမျိုးသမီးသည် ဤအရာပြီးနောက် ပထမဆုံး ဘာလုပ်ရမည်နည်း။',
        pitchAccent: 'heiban',
      },
      {
        id: 'l2',
        speakerId: 'manager_m',
        japanese: '佐藤さん、明日のA社向けの企画書、最終確認したよ。全体的によくまとまっているね。',
        english: 'Sato-san, I did the final check on tomorrow’s project proposal for Company A. Overall it is put together well.',
        burmese: 'ဆာတိုစံ၊ မနက်ဖြန် ကုမ္ပဏီ A အတွက် ပရိုဂျက်အစီရင်ခံစာကို စစ်ဆေးပြီးပါပြီ။ ခြုံငုံကြည့်ရင် သေချာပြင်ဆင်ထားတာ တွေ့ရတယ်။',
        pitchAccent: 'nakadaka',
      },
      {
        id: 'l3',
        speakerId: 'staff_f',
        japanese: 'ありがとうございます。会議室のプロジェクターの予約と資料の印刷はすでに済ませてあります。',
        english: 'Thank you very much. I have already reserved the meeting room projector and printed out the handouts.',
        burmese: 'ကျေးဇူးတင်ပါတယ်။ အစည်းအဝေးခန်း ပရိုဂျက်တာ ကြိုတင်စာရင်းသွင်းခြင်းနဲ့ စာရွက်စာတမ်းများ ပရင့်ထုတ်ခြင်းကို လုပ်ဆောင်ပြီးပါပြီ။',
        pitchAccent: 'heiban',
      },
      {
        id: 'l4',
        speakerId: 'manager_m',
        japanese: '手回しがいいね。ただね、5ページの売上予測のグラフなんだけど、去年のデータが一部古いままになっているようだ。',
        english: 'Prompt preparation as always. However, looking at the sales forecast graph on page 5, it seems some of last year’s data remains outdated.',
        burmese: 'ကြိုတင်ပြင်ဆင်မှု ကောင်းလှပေသည်။ သို့သော် စာမျက်နှာ ၅ ရှိ အရောင်းခန့်မှန်းချက် ဂရပ်တွင် မနှစ်က အချက်အလက်တချို့ အဟောင်းအတိုင်း ကျန်နေသေးပုံရသည်။',
        pitchAccent: 'atamadaka',
      },
      {
        id: 'l5',
        speakerId: 'staff_f',
        japanese: 'あ、大変失礼いたしました！すぐに最新の数値に差し替えて、全員分を印刷し直します。',
        english: 'Oh, I am deeply sorry! I will replace it with the latest figures immediately and reprint them for everyone.',
        burmese: 'အာ၊ အားနာလိုက်တာ။ အခုချက်ချင်း နောက်ဆုံးရ ကိန်းဂဏန်းများနဲ့ အစားထိုးပြီး အားလုံးအတွက် ပြန်ပရင့်ထုတ်လိုက်ပါမည်။',
        pitchAccent: 'nakadaka',
      },
      {
        id: 'l6',
        speakerId: 'manager_m',
        japanese: 'いや、印刷し直す前に、差し替えるグラフの数値を僕にもう一度メールで見せてくれるかい？数値の妥当性をチェックしたいんだ。会議室のレイアウト変更は僕の方でやっておくからさ。',
        english: 'No, before you reprint, could you email me the revised graph figures once more to see? I want to check the validity of the numbers. I will handle the meeting room layout change myself.',
        burmese: 'မဟုတ်ဘူး၊ ပြန်မပရင့်ခင်မှာ အစားထိုးမယ့် ဂရပ်ကိန်းဂဏန်းတွေကို ကျွန်တော့်ဆီ အီးမေးလ်နဲ့ နောက်တစ်ကြိမ် ပြပေးနိုင်မလား။ ကိန်းဂဏန်းတွေ မှန်ကန်မှုကို စစ်ဆေးချင်လို့ပါ။ အစည်းအဝေးခန်း နေရာချထားမှုကိုတော့ ကျွန်တော် လုပ်လိုက်ပါ့မယ်။',
        isAnswerClue: true,
        clueRationaleEn: 'The manager explicitly overrides reprinting: "Before reprinting, could you email me the revised figures to check?"',
        clueRationaleMy: 'မန်နေဂျာက ပြန်ပရင့်ထုတ်ခြင်းမပြုမီ "ကိန်းဂဏန်းများကို ဦးစွာ အီးမေးလ်ဖြင့် ပြသရန်" တိုက်ရိုက် ညွှန်ကြားထားသည်။',
        pitchAccent: 'nakadaka',
      },
      {
        id: 'l7',
        speakerId: 'staff_f',
        japanese: '承知いたしました。すぐにデータを修正して、メールでお送りします。',
        english: 'Understood. I will amend the data right away and send it to you via email.',
        burmese: 'နားလည်ပါပြီခင်ဗျာ။ အချက်အလက်ကို ချက်ချင်းပြင်ဆင်ပြီး အီးမေးလ်ဖြင့် ပို့ပေးပါမည်။',
        pitchAccent: 'heiban',
      },
      {
        id: 'l8',
        speakerId: 'announcer',
        japanese: '女の人はこの後、まず何をしなければなりませんか。',
        english: 'What must the woman do first after this?',
        burmese: 'အမျိုးသမီးသည် ဤအရာပြီးနောက် ပထမဆုံး ဘာလုပ်ရမည်နည်း။',
        pitchAccent: 'odaka',
      },
    ],
    questionPromptJa: '女の人はこの後、まず何をしなければなりませんか。',
    questionPromptEn: 'What must the woman do first after this discussion?',
    choices: [
      '修正した数値を課長にメールで送る',
      '会議室の配布資料を印刷し直す',
      '会議室の机のレイアウトを変更する',
      'プロジェクターの動作確認をする',
    ],
    correctAnswer: '修正した数値を課長にメールで送る',
    answerIndex: 0,
    distractorAnalyses: [
      {
        choiceText: '修正した数値を課長にメールで送る',
        isCorrect: true,
        explanationEn: 'Correct. The manager instructs: "Before reprinting, email me the revised graph figures so I can check their validity."',
        explanationMy: 'မှန်ကန်ပါသည်။ မန်နေဂျာက ပြန်မပရင့်မီ ပြင်ဆင်ထားသော ကိန်းဂဏန်းများကို အီးမေးလ်ပို့ရန် ဦးစွာ ညွှန်ကြားခဲ့သည်။',
      },
      {
        choiceText: '会議室の配布資料を印刷し直す',
        isCorrect: false,
        trapType: '後で行う行動 (Deferred Action)',
        explanationEn: 'Trap: The woman initially suggested reprinting, but the manager explicitly stopped her: "いや、印刷し直す前に..." (No, before reprinting...).',
        explanationMy: 'လှည့်စားမှု - အမျိုးသမီးက ပြန်ပရင့်မည်ဟု ပြောသော်လည်း မန်နေဂျာက "မပရင့်ခင်..." ဟု တားမြစ်ခဲ့သည်။',
      },
      {
        choiceText: '会議室の机のレイアウトを変更する',
        isCorrect: false,
        trapType: '別の人の担当 (Handled by Manager)',
        explanationEn: 'Trap: The manager explicitly says: "会議室のレイアウト変更は僕の方でやっておくから" (I will handle the layout change myself).',
        explanationMy: 'လှည့်စားမှု - မန်နေဂျာကိုယ်တိုင်က "နေရာပြင်ဆင်မှုကို ငါလုပ်လိုက်မည်" ဟု ပြောကြားခဲ့သည်။',
      },
      {
        choiceText: 'プロジェクターの動作確認をする',
        isCorrect: false,
        trapType: '完了済みの行動 (Already Done)',
        explanationEn: 'Trap: The woman stated earlier that projector reservation was already finished, and testing is not requested.',
        explanationMy: 'လှည့်စားမှု - ပရိုဂျက်တာ ကြိုတင်စာရင်းသွင်းပြီးသားဖြစ်ကြောင်း အစောပိုင်းက ပြောခဲ့ပြီးဖြစ်သည်။',
      },
    ],
    strategyTipEn: 'In Kadai Rikai, watch out for "〜前に" (before doing X) and "〜は僕がやる" (someone else will do Y). The speaker will often propose an action that is immediately overridden.',
    strategyTipJa: '課題理解では「〜する前に」「〜は私がやっておく」という修正・打ち消し表現が正解の決め手となります。',
    keyVocabulary: [
      { term: '手回し', reading: 'てまわし', pos: '名詞', meaningEn: 'Preparation / arrangement', meaningMy: 'ကြိုတင်ပြင်ဆင်မှု' },
      { term: '妥当性', reading: 'だとうせい', pos: '名詞', meaningEn: 'Validity / appropriateness', meaningMy: 'မှန်ကန်သင့်တော်မှု' },
      { term: '差し替える', reading: 'さしかえる', pos: '動詞', meaningEn: 'To replace / substitute', meaningMy: 'အစားထိုးလဲလှယ်သည်' },
      { term: '承知', reading: 'しょうち', pos: '名詞・する', meaningEn: 'Consent / understanding (humble)', meaningMy: 'နားလည်သဘောပေါက်ခြင်း' },
    ],
  },

  // -------------------------------------------------------------
  // 2. POINT RIKAI (ポイント理解 - Key Point Comprehension)
  // Question Type: "Why did X happen?" / "What is the primary reason?"
  // -------------------------------------------------------------
  {
    id: 'choukai_n2_02_point',
    type: 'point_rikai',
    typeLabel: 'ポイント理解 (Key Point Comprehension)',
    typeDescription: 'Extract the central underlying rationale or reason, filtering out secondary or discarded causes.',
    level: 'N2',
    title: 'Postponing Eco-Bottle Product Launch',
    titleJa: 'エコボトル新商品の発売延期の理由（ポイント理解）',
    situation: '飲料メーカーの開発会議で、担当者が新商品の発売時期について説明しています。',
    speakers: [
      {
        id: 'announcer',
        name: 'Announcer',
        nameJa: 'ナレーション',
        role: 'Exam Proctor',
        gender: 'female',
        pitch: 1.05,
        rateMultiplier: 0.95,
        avatarBg: 'bg-stone-700',
      },
      {
        id: 'presenter_m',
        name: 'Developer Yamada',
        nameJa: '山田担当者',
        role: 'R&D Lead',
        gender: 'male',
        pitch: 0.9,
        rateMultiplier: 0.95,
        avatarBg: 'bg-sky-900',
      },
    ],
    dialogue: [
      {
        id: 'p1',
        speakerId: 'announcer',
        japanese: '飲料メーカーの開発会議で、担当者が話しています。新商品の発売が延期された最大の理由は何ですか。',
        english: 'At a beverage maker’s development meeting, a representative is speaking. What is the main reason the new product release was postponed?',
        burmese: 'အဖျော်ယမကာထုတ်လုပ်ရေး ကုမ္ပဏီ အစည်းအဝေးတွင် တာဝန်ခံက ရှင်းပြနေသည်။ ကုန်ပစ္စည်းအသစ် ဖြန့်ချိမှုကို ရွှေ့ဆိုင်းရသည့် အဓိကအကြောင်းအရင်းမှာ အဘယ်နည်း။',
      },
      {
        id: 'p2',
        speakerId: 'presenter_m',
        japanese: '来春発売を予定しておりました新型エコボトル「グリーン・ウェーブ」ですが、発売を秋まで半年延期することとなりました。',
        english: 'Regarding our new eco-bottle "Green Wave" scheduled for launch next spring, we have decided to postpone release by six months until autumn.',
        burmese: 'လာမည့်နွေဦးတွင် ဖြန့်ချိရန် စီစဉ်ထားသော "Green Wave" ပုလင်းအသစ်ကို ဆောင်းဦးပေါက်အထိ ၆ လ ရွှေ့ဆိုင်းရန် ဆုံးဖြတ်ခဲ့ပါသည်။',
      },
      {
        id: 'p3',
        speakerId: 'presenter_m',
        japanese: '原料となるバイオプラスチックの調達コストの高騰が当初懸念されておりましたが、こちらは代替サプライヤーの確保により解決いたしました。また、テレビCMの制作スケジュールにも遅れは生じておりません。',
        english: 'Initially, soaring procurement costs for bioplastic raw materials were a concern, but this was resolved by securing an alternative supplier. Additionally, there are no delays in the TV commercial production schedule.',
        burmese: 'ဇီဝပလတ်စတစ် ကုန်ကြမ်းရရှိမှု ကုန်ကျစရိတ် မြင့်တက်လာခြင်းကို အစောပိုင်းက စိုးရိမ်ခဲ့သော်လည်း အခြားရောင်းချသူရှာဖွေပြီး ဖြေရှင်းနိုင်ခဲ့သည်။ တီဗွီကြော်ငြာရိုက်ကူးရေးတွင်လည်း နောက်ကျမှု မရှိပါ။',
      },
      {
        id: 'p4',
        speakerId: 'presenter_m',
        japanese: 'しかしながら、先週実施した耐熱性能の耐久テストにおいて、一部の蓋の密閉構造に変形が生じる不具合が発覚いたしました。ブランドの信頼性に関わる重大な安全面の問題であるため、金型を根本から設計し直す判断に至った次第です。',
        english: 'However, in the heat resistance durability test conducted last week, a defect was uncovered where deformation occurred in some lid sealing structures. As this is a critical safety issue affecting brand credibility, we reached the decision to fundamentally redesign the casting mold.',
        burmese: 'သို့သော်ငြားလည်း ပြီးခဲ့သည့်အပတ် အပူဒဏ်ခံနိုင်မှု စမ်းသပ်မှုတွင် အဖုံးတချို့ ပုံပျက်သွားသည့် ချို့ယွင်းချက် ပေါ်ပေါက်ခဲ့သည်။ အမှတ်တံဆိပ် ယုံကြည်စိတ်ချရမှုအတွက် အရေးကြီးသော ဘေးကင်းရေးကိစ္စဖြစ်သဖြင့် ပုံစံခွက်ကို အခြေခံမှစ၍ ပြန်လည်ဒီဇိုင်းဆွဲရန် ဆုံးဖြတ်ခဲ့ပါသည်။',
        isAnswerClue: true,
        clueRationaleEn: 'The speaker states: "In the heat durability test, deformation occurred in the lid sealing, leading to a fundamental redesign of the mold."',
        clueRationaleMy: 'အပူဒဏ်ခံစမ်းသပ်မှုတွင် အဖုံးပုံသဏ္ဌာန် ချို့ယွင်းချက်တွေ့ရှိသဖြင့် ပုံစံခွက်ကို ပြန်လည်ဒီဇိုင်းဆွဲရခြင်းကြောင့် ရွှေ့ဆိုင်းခဲ့သည်။',
      },
      {
        id: 'p5',
        speakerId: 'announcer',
        japanese: '新商品の発売が延期された最大の理由は何ですか。',
        english: 'What is the main reason the new product release was postponed?',
        burmese: 'ကုန်ပစ္စည်းအသစ် ဖြန့်ချိမှုကို ရွှေ့ဆိုင်းရသည့် အဓိကအကြောင်းအရင်းမှာ အဘယ်နည်း။',
      },
    ],
    questionPromptJa: '新商品の発売が延期された最大の理由は何ですか。',
    questionPromptEn: 'What is the primary reason the new product launch was postponed?',
    choices: [
      '耐久テストで蓋の密閉構造に欠陥が見つかったため',
      'バイオプラスチックの調達コストが高騰したため',
      'テレビコマーシャルの制作が大幅に遅れているため',
      '競合他社が類似商品を先に発売してしまったため',
    ],
    correctAnswer: '耐久テストで蓋の密閉構造に欠陥が見つかったため',
    answerIndex: 0,
    distractorAnalyses: [
      {
        choiceText: '耐久テストで蓋の密閉構造に欠陥が見つかったため',
        isCorrect: true,
        explanationEn: 'Correct. Explicitly pointed out: "耐熱性能の耐久テストにおいて、一部の蓋の密閉構造に変形が生じる不具合が発覚いたしました".',
        explanationMy: 'မှန်ကန်ပါသည်။ အပူဒဏ်ခံစမ်းသပ်မှုတွင် အဖုံးချို့ယွင်းချက်တွေ့ရှိခဲ့ခြင်းကြောင့် ဖြစ်သည်။',
      },
      {
        choiceText: 'バイオプラスチックの調達コストが高騰したため',
        isCorrect: false,
        trapType: '解決済みの問題 (Already Resolved)',
        explanationEn: 'Trap: The cost was initially a concern, but the speaker said: "代替サプライヤーの確保により解決いたしました" (Resolved by securing alternative suppliers).',
        explanationMy: 'လှည့်စားမှု - ကုန်ကြမ်းကုန်ကျစရိတ်ကို အခြားရောင်းချသူဖြင့် ဖြေရှင်းပြီးဖြစ်ကြောင်း ပြောကြားခဲ့သည်။',
      },
      {
        choiceText: 'テレビコマーシャルの制作が大幅に遅れているため',
        isCorrect: false,
        trapType: '逆の事実 (Opposite of Fact)',
        explanationEn: 'Trap: The speaker clearly noted: "CMの制作スケジュールにも遅れは生じておりません" (No delay in CM production).',
        explanationMy: 'လှည့်စားမှု - ကြော်ငြာထုတ်လုပ်မှုတွင် နောက်ကျမှုမရှိကြောင်း ရှင်းလင်းစွာ ဖော်ပြခဲ့သည်။',
      },
      {
        choiceText: '競合他社が類似商品を先に発売してしまったため',
        isCorrect: false,
        trapType: '本文に記述なし (Not Mentioned in Dialogue)',
        explanationEn: 'Trap: Competitor products were never mentioned at all in the audio transcript.',
        explanationMy: 'လှည့်စားမှု - အသံဖိုင်ထဲတွင် ပြိုင်ဘက်ကုမ္ပဏီအကြောင်း တစ်ခွန်းမျှ မပါဝင်ပါ။',
      },
    ],
    strategyTipEn: 'In Point Rikai, speakers will state problems that were ALREADY resolved ("〜は解決しましたが..."). Listen for "しかしながら" or "ただ" which introduces the actual persisting reason.',
    strategyTipJa: 'ポイント理解では「〜は解決しましたが、しかしながら...」という逆説の後に本物の延期・中止理由が述べられます。',
    keyVocabulary: [
      { term: '調達', reading: 'ちょうたつ', pos: '名詞・する', meaningEn: 'Procurement / supply', meaningMy: 'ဝယ်ယူဖြည့်ဆည်းခြင်း' },
      { term: '高騰', reading: 'こうとう', pos: '名詞・する', meaningEn: 'Sudden price jump / surge', meaningMy: 'ဈေးနှုန်းထိုးတက်ခြင်း' },
      { term: '密閉', reading: 'みっぺい', pos: '名詞・する', meaningEn: 'Airtight / hermetic seal', meaningMy: 'လေလုံအောင်ပိတ်ခြင်း' },
      { term: '金型', reading: 'かながた', pos: '名詞', meaningEn: 'Mold / casting die', meaningMy: 'ပုံသွန်းပုံစံခွက်' },
    ],
  },

  // -------------------------------------------------------------
  // 3. SOKUJI OUTOU (即時応答 - Quick Response)
  // Question Type: Rapid pragmatic Japanese utterance & polite response
  // -------------------------------------------------------------
  {
    id: 'choukai_n2_03_sokuji',
    type: 'sokuji_outou',
    typeLabel: '即時応答 (Quick Response)',
    typeDescription: 'Select the contextually appropriate conversational response to formal requests and business idioms.',
    level: 'N2',
    title: 'Reviewing Draft Document with Manager',
    titleJa: '企画書の確認依頼への適切な応答（即時応答）',
    situation: '職場で部下が上司に書類を見せながら話しかけています。',
    speakers: [
      {
        id: 'subordinate_f',
        name: 'Staff Suzuki',
        nameJa: '部下の鈴木さん',
        role: 'Subordinate',
        gender: 'female',
        pitch: 1.15,
        rateMultiplier: 1.0,
        avatarBg: 'bg-emerald-900',
      },
    ],
    dialogue: [
      {
        id: 's1',
        speakerId: 'subordinate_f',
        japanese: '課長、こちらの企画書ですが、お時間のある時にでも目を通していただけないでしょうか。',
        english: 'Section Chief, regarding this proposal document, could you perhaps take a look through it when you have a moment?',
        burmese: 'ဌာနမှူးရှင့်၊ ဤအစီရင်ခံစာမူကြမ်းကို အချိန်ရသည့်အခါ တစ်ချက်လောက် ကြည့်ရှုပေးနိုင်မလားရှင့်။',
        isAnswerClue: true,
        clueRationaleEn: 'The subordinate is using humble request form 「目を通していただけないでしょうか」(Could you please take a look?). Appropriate supervisor reply accepts or postpones viewing.',
        clueRationaleMy: 'လက်အောက်ငယ်သားက ရိုသေသော အသုံးအနှုန်းဖြင့် "တစ်ချက်လောက် ကြည့်ပေးပါရန်" တောင်းဆိုနေခြင်းဖြစ်သည်။',
      },
    ],
    questionPromptJa: 'これに対する課長の返答として、最も適切なものはどれか。',
    questionPromptEn: 'Which is the most pragmatically appropriate reply from the Section Chief?',
    choices: [
      'うん、午後の会議が終わったら目を通しておくよ。',
      'ええ、私の目はすでによく通っていますよ。',
      'いいえ、まだ企画書には目を通していませんよ。',
    ],
    correctAnswer: 'うん、午後の会議が終わったら目を通しておくよ。',
    answerIndex: 0,
    distractorAnalyses: [
      {
        choiceText: 'うん、午後の会議が終わったら目を通しておくよ。',
        isCorrect: true,
        explanationEn: 'Correct. Accepts the request warmly with a future time frame using the standard business phrase 「目を通しておく」 (I will look it over).',
        explanationMy: 'မှန်ကန်ပါသည်။ မွန်းလွဲအစည်းအဝေးပြီးလျှင် ကြည့်ထားပေးမည်ဟု သင့်လျော်စွာ တုံ့ပြန်ခြင်းဖြစ်သည်။',
      },
      {
        choiceText: 'ええ、私の目はすでによく通っていますよ。',
        isCorrect: false,
        trapType: '慣用句の誤解 (Idiom Literal Confusion)',
        explanationEn: 'Trap: Confuses the idiom 「目を通す」 (to look over) literally with eyesight passing through something. Unnatural Japanese.',
        explanationMy: 'လှည့်စားမှု - "မျက်စိဖောက်မြင်သည်" ဟု စကားအသုံးအနှုန်းကို တိုက်ရိုက်အဓိပ္ပာယ်လွဲမှားခြင်းဖြစ်သည်။',
      },
      {
        choiceText: 'いいえ、まだ企画書には目を通していませんよ。',
        isCorrect: false,
        trapType: '文脈不一致 (Contextual Misalignment)',
        explanationEn: 'Trap: The subordinate is asking the manager to read it now/later, not asking whether the manager has already read it.',
        explanationMy: 'လှည့်စားမှု - "ဖတ်ပြီးပြီလား" မေးခြင်းမဟုတ်ဘဲ "ဖတ်ပေးပါ" ဟု တောင်းဆိုခြင်းဖြစ်သဖြင့် မကိုက်ညီပါ။',
      },
    ],
    strategyTipEn: 'In Sokuji Outou, pay special attention to the pragmatics of keigo: 「〜ていただけないでしょうか」 is a polite request to the listener. The answer must accept, decline, or schedule the requested action.',
    strategyTipJa: '即時応答では「〜ていただけないでしょうか」という依頼表現に対し、行動を引き受けるかどうかの返答を選びます。',
    keyVocabulary: [
      { term: '目を通す', reading: 'めをとおす', pos: '慣用句', meaningEn: 'To scan / glance through / review', meaningMy: 'တစ်ချက်ကြည့်ရှုစစ်ဆေးသည်' },
      { term: '〜ておく', reading: '〜ておく', pos: '文法', meaningEn: 'To do something in advance', meaningMy: 'ကြိုတင်လုပ်ထားသည်' },
    ],
  },
];
