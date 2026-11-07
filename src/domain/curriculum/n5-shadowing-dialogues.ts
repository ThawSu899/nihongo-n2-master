/**
 * Authentic Beginner N5 Shadowing Dialogues Catalog
 * Designed for 2-to-4 turn natural shadowing practice with native Japanese phrasing,
 * conversational nuance, pitch cues, and authentic Burmese translations.
 * Standard scenarios: restaurant ordering, train platform numbers, declining with ちょっと..., health/fever.
 */

export interface ShadowingTurn {
  turnIndex: number;
  speaker: string;
  speakerRoleEn: string;
  speakerRoleMy: string;
  ja: string;
  kana: string;
  romaji: string;
  en: string;
  my: string;
  pitchAccent?: 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka';
}

export interface ShadowingScenario {
  id: string;
  titleJa: string;
  titleEn: string;
  titleMy: string;
  level: 'N5' | 'N4';
  turnsCount: number;
  situationEn: string;
  situationMy: string;
  turns: ShadowingTurn[];
  shadowingTipEn: string;
  shadowingTipMy: string;
}

export const BEGINNER_SHADOWING_SCENARIOS: ShadowingScenario[] = [
  // -----------------------------------------------------------------------------------
  // 1. ORDERING AT A RESTAURANT (レストランでの注文)
  // -----------------------------------------------------------------------------------
  {
    id: 'shadowing_n5_01_restaurant',
    titleJa: 'レストランでの注文',
    titleEn: 'Ordering at a Restaurant',
    titleMy: 'စားသောက်ဆိုင်တွင် အစားအသောက် မှာယူခြင်း',
    level: 'N5',
    turnsCount: 4,
    situationEn: 'A customer enters a restaurant and orders food and drinks with a waiter.',
    situationMy: 'ဖောက်သည်တစ်ဦး စားသောက်ဆိုင်သို့ ဝင်ရောက်ပြီး စားပွဲထိုးနှင့်အတူ အစားအစာနှင့် သောက်စရာ မှာယူနေခြင်း။',
    turns: [
      {
        turnIndex: 1,
        speaker: '店員',
        speakerRoleEn: 'Waiter',
        speakerRoleMy: 'စားပွဲထိုး',
        ja: 'いらっしゃいませ。何名様ですか。',
        kana: 'いらっしゃいませ。なんめいさまですか。',
        romaji: 'Irasshaimase. Nan-mei-sama desu ka.',
        en: 'Welcome! How many guests in your party?',
        my: 'ကြိုဆိုပါတယ် ခင်ဗျာ။ လူဘယ်နှစ်ယောက်ပါလဲ ခင်ဗျာ။',
        pitchAccent: 'heiban',
      },
      {
        turnIndex: 2,
        speaker: '客',
        speakerRoleEn: 'Customer',
        speakerRoleMy: 'ဧည့်သည်',
        ja: '二人です。',
        kana: 'ふたりです。',
        romaji: 'Futari desu.',
        en: 'Two people, please.',
        my: 'နှစ်ယောက်ပါ ခင်ဗျာ။',
        pitchAccent: 'nakadaka',
      },
      {
        turnIndex: 3,
        speaker: '店員',
        speakerRoleEn: 'Waiter',
        speakerRoleMy: 'စားပွဲထိုး',
        ja: 'こちらの席へどうぞ。ご注文はお決まりですか。',
        kana: 'こちらのせきへどうぞ。ごちゅうもんはおきまりですか。',
        romaji: 'Kochira no seki e douzo. Gochuumon wa okimari desu ka.',
        en: 'This way to your table, please. Are you ready to order?',
        my: 'ဒီဘက်ခုံကို ကြွပါ ခင်ဗျာ။ မှာယူမယ့် အစားအစာ ရွေးချယ်ပြီးပြီလား ခင်ဗျာ။',
        pitchAccent: 'heiban',
      },
      {
        turnIndex: 4,
        speaker: '客',
        speakerRoleEn: 'Customer',
        speakerRoleMy: 'ဧည့်သည်',
        ja: 'ハンバーガーを二つと、アイスコーヒーを二つお願いします。',
        kana: 'はんばーがーをふたつと、あいすこーひーをふたつおねがいします。',
        romaji: 'Hanbaagaa o futatsu to, aisu koohii o futatsu onegai shimasu.',
        en: 'Two hamburgers and two iced coffees, please.',
        my: 'ဟမ်ဘာဂါ နှစ်ခုနဲ့ အအေးကော်ဖီ နှစ်ခွက် ကျေးဇူးပြုပြီး ပေးပါခင်ဗျာ။',
        pitchAccent: 'nakadaka',
      },
    ],
    shadowingTipEn: 'Practice saying "〜を二つ (futatsu) と、〜をおねがいします" smoothly without pausing mid-counter.',
    shadowingTipMy: 'အရေအတွက်ရေတွက်စကားလုံး「二つ (ふたつ)」နှင့်「お願いします」ကို အသံအဆက်အစပ် ချောမွေ့စွာ လိုက်ဆိုပါ။',
  },

  // -----------------------------------------------------------------------------------
  // 2. ASKING TRAIN PLATFORM NUMBERS (電車の乗り場を尋ねる)
  // -----------------------------------------------------------------------------------
  {
    id: 'shadowing_n5_02_train_platform',
    titleJa: '駅で電車の乗り場を尋ねる',
    titleEn: 'Asking Train Platform Numbers at the Station',
    titleMy: 'ဘူတာရုံတွင် ရထားပလက်ဖောင်းနံပါတ် မေးမြန်းခြင်း',
    level: 'N5',
    turnsCount: 4,
    situationEn: 'A passenger at a train station asks station staff for the platform and departure time for Kyoto.',
    situationMy: 'ခရီးသည်တစ်ဦးက ဘူတာရုံဝန်ထမ်းအား ကျိုတိုသို့သွားမည့် ရထားပလက်ဖောင်းနှင့် ထွက်ခွာချိန် မေးမြန်းနေခြင်း။',
    turns: [
      {
        turnIndex: 1,
        speaker: '乗客',
        speakerRoleEn: 'Passenger',
        speakerRoleMy: 'ခရီးသည်',
        ja: 'すみません、京都行きの電車は何番線ですか。',
        kana: 'すみません、きょうとゆきのでんしゃはなんばんせんですか。',
        romaji: 'Sumimasen, Kyouto-yuki no densha wa nan-ban-sen desu ka.',
        en: 'Excuse me, which platform does the train for Kyoto depart from?',
        my: 'တစ်ဆိတ်လောက်ပါ ခင်ဗျာ၊ ကျိုတိုသွားမယ့် ရထားက ဘယ်နှစ်နံပါတ် ပလက်ဖောင်းပါလဲ။',
        pitchAccent: 'nakadaka',
      },
      {
        turnIndex: 2,
        speaker: '駅員',
        speakerRoleEn: 'Station Staff',
        speakerRoleMy: 'ဘူတာဝန်ထမ်း',
        ja: '京都行きは三番線ですよ。',
        kana: 'きょうとゆきはさんばんせんですよ。',
        romaji: 'Kyouto-yuki wa san-ban-sen desu yo.',
        en: 'The Kyoto train is on platform 3.',
        my: 'ကျိုတိုသွား ရထားက ၃ နံပါတ် ပလက်ဖောင်းပါ ခင်ဗျာ။',
        pitchAccent: 'heiban',
      },
      {
        turnIndex: 3,
        speaker: '乗客',
        speakerRoleEn: 'Passenger',
        speakerRoleMy: 'ခရီးသည်',
        ja: 'ありがとうございます。次の電車は何時に発車しますか。',
        kana: 'ありがとうございます。つぎのでんしゃはなんじにはっしゃしますか。',
        romaji: 'Arigatou gozaimasu. Tsugi no densha wa nan-ji ni hassha shimasu ka.',
        en: 'Thank you. What time does the next train depart?',
        my: 'ကျေးဇူးတင်ပါတယ်။ နောက်ရထားက ဘယ်အချိန် ထွက်ပါမလဲ ခင်ဗျာ။',
        pitchAccent: 'atamadaka',
      },
      {
        turnIndex: 4,
        speaker: '駅員',
        speakerRoleEn: 'Station Staff',
        speakerRoleMy: 'ဘူတာဝန်ထမ်း',
        ja: '十時十五分です。階段を上がってすぐですよ。',
        kana: 'じゅうじじゅうごふんです。かいだんをあがってすぐですよ。',
        romaji: 'Juu-ji juu-go-fun desu. Kaidan o agatte sugu desu yo.',
        en: 'At 10:15. It is right up the stairs.',
        my: '၁၀ နာရီ ၁၅ မိနစ်မှာ ထွက်ပါမယ်။ လှေကားတက်ပြီးတာနဲ့ ချက်ချင်းတွေ့ပါမယ် ခင်ဗျာ။',
        pitchAccent: 'heiban',
      },
    ],
    shadowingTipEn: 'Notice the rising intonation on question phrases like "何番線ですか" and crisp number pronunciation.',
    shadowingTipMy: 'မေးခွန်းဝါကျအဆုံး「何番線ですか」၏ အသံမြှင့်တက်မှုနှင့် နံပါတ်အသံထွက်「三番線 (さんばんせん)」ကို အတိအကျ လိုက်ဆိုပါ။',
  },

  // -----------------------------------------------------------------------------------
  // 3. DECLINING INVITATIONS POLITELY (「ちょっと...」で丁寧に断る)
  // -----------------------------------------------------------------------------------
  {
    id: 'shadowing_n5_03_declining_chotto',
    titleJa: '「ちょっと...」で丁寧に誘いを断る',
    titleEn: 'Declining Invitations Politely with "ちょっと..."',
    titleMy: 'ဖိတ်ခေါ်ချက်ကို "ちょっと..." ဖြင့် ယဉ်ကျေးစွာ ငြင်းပယ်ခြင်း',
    level: 'N5',
    turnsCount: 4,
    situationEn: 'A colleague invites someone out for a drink, and the person politely declines using the standard Japanese soft-refusal technique "ちょっと...".',
    situationMy: 'လုပ်ဖော်ကိုင်ဖက်က အတူတူ သောက်စားရန် ဖိတ်ခေါ်ရာတွင် ဂျပန်ရိုးရာ ယဉ်ကျေးသော သွယ်ဝိုက်ငြင်းဆိုနည်း 「ちょっと...」ကို သုံး၍ ငြင်းပယ်နေခြင်း။',
    turns: [
      {
        turnIndex: 1,
        speaker: '同僚',
        speakerRoleEn: 'Colleague',
        speakerRoleMy: 'လုပ်ဖော်ကိုင်ဖက်',
        ja: '今日の夜、一緒に飲みに行きませんか。',
        kana: 'きょうのよる、いっしょにのみにいきませんか。',
        romaji: 'Kyou no yoru, issho ni nomi ni ikimasen ka.',
        en: "Would you like to go out for a drink together tonight?",
        my: 'ဒီနေ့ည အတူတူ သောက်ဖို့ မသွားကြဘူးလား။',
        pitchAccent: 'nakadaka',
      },
      {
        turnIndex: 2,
        speaker: '自分',
        speakerRoleEn: 'Learner',
        speakerRoleMy: 'မိမိ',
        ja: 'すみません、今夜はちょっと用事がありまして...',
        kana: 'すみません、こんやはちょっとようじがありまして...',
        romaji: 'Sumimasen, konya wa chotto youji ga arimashite...',
        en: 'I am so sorry, I have a little business tonight...',
        my: 'အားနာလိုက်တာ၊ ဒီည ကိစ္စလေး နည်းနည်းရှိနေလို့ပါ...',
        pitchAccent: 'odaka',
      },
      {
        turnIndex: 3,
        speaker: '同僚',
        speakerRoleEn: 'Colleague',
        speakerRoleMy: 'လုပ်ဖော်ကိုင်ဖက်',
        ja: 'あ、そうですか。じゃ、また今度誘いますね。',
        kana: 'あ、そうですか。じゃ、またこんどさそいますね。',
        romaji: 'A, sou desu ka. Ja, mata kondo sasoimasu ne.',
        en: 'Ah, I see! Then I will invite you again next time.',
        my: 'ဪ၊ ဟုတ်လား။ ဒါဆို နောက်တစ်ခေါက် ထပ်ဖိတ်ပါ့မယ်နော်။',
        pitchAccent: 'heiban',
      },
      {
        turnIndex: 4,
        speaker: '自分',
        speakerRoleEn: 'Learner',
        speakerRoleMy: 'မိမိ',
        ja: 'はい、ありがとうございます。またぜひ誘ってください。',
        kana: 'はい、ありがとうございます。またぜひさそってください。',
        romaji: 'Hai, arigatou gozaimasu. Mata zehi sasotte kudasai.',
        en: 'Yes, thank you so much! Please definitely invite me again.',
        my: 'ဟုတ်ကဲ့ပါ၊ ကျေးဇူးတင်ပါတယ်။ နောက်တစ်ခေါက်လည်း သေချာပေါက် ဖိတ်ခေါ်ပေးပါနော်။',
        pitchAccent: 'heiban',
      },
    ],
    shadowingTipEn: 'Trail off softly on "ちょっと用事がありまして..." to replicate authentic Japanese apologetic hesitation.',
    shadowingTipMy: '「ちょっと用事がありまして...」ဟု ပြောဆိုရာတွင် အသံကို တိုက်ရိုက်မဖြတ်ဘဲ သွယ်ဝိုက်အားနာသော လေသံဖြင့် အဆုံးသတ် လိုက်ဆိုပါ။',
  },

  // -----------------------------------------------------------------------------------
  // 4. TALKING ABOUT HEALTH & FEVER (体調・熱についての相談)
  // -----------------------------------------------------------------------------------
  {
    id: 'shadowing_n5_04_health_fever',
    titleJa: '体調不良と発熱の相談',
    titleEn: 'Talking About Health & Fever',
    titleMy: 'ကျန်းမာရေးနှင့် ကိုယ်ပူဖျားနာခြင်းအကြောင်း ပြောဆိုခြင်း',
    level: 'N5',
    turnsCount: 4,
    situationEn: 'A coworker notices someone looking unwell with a fever and headache, advising them to go home and rest.',
    situationMy: 'လုပ်ဖော်ကိုင်ဖက်တစ်ဦးက ဖျားနာနေသူ၏ မျက်နှာမကောင်းသည်ကို သတိပြုမိပြီး အိမ်ပြန်အနားယူရန် အကြံပေးနေခြင်း။',
    turns: [
      {
        turnIndex: 1,
        speaker: '同僚',
        speakerRoleEn: 'Coworker',
        speakerRoleMy: 'လုပ်ဖော်ကိုင်ဖက်',
        ja: 'どうしましたか。顔色が悪いですね。',
        kana: 'どうしましたか。かおいろがわるいですね。',
        romaji: 'Dou shimashita ka. Kaoiro ga warui desu ne.',
        en: 'What happened? You look rather pale.',
        my: 'ဘာဖြစ်လို့ပါလဲ။ မျက်နှာ သိပ်မကောင်းပါလား။',
        pitchAccent: 'nakadaka',
      },
      {
        turnIndex: 2,
        speaker: '自分',
        speakerRoleEn: 'Learner',
        speakerRoleMy: 'မိမိ',
        ja: '今朝から熱があって、頭も痛いんです。',
        kana: 'けさからねつがあって、あたまもいたいんです。',
        romaji: 'Kesa kara netsu ga atte, atama mo itai n desu.',
        en: 'I have had a fever since this morning, and my head hurts too.',
        my: 'ဒီနေ့မနက်ကတည်းက ကိုယ်ပူနေပြီး ခေါင်းလည်း ကိုက်နေလို့ပါခင်ဗျာ။',
        pitchAccent: 'nakadaka',
      },
      {
        turnIndex: 3,
        speaker: '同僚',
        speakerRoleEn: 'Coworker',
        speakerRoleMy: 'လုပ်ဖော်ကိုင်ဖက်',
        ja: 'それはいけませんね。無理をしないで、今日は早く帰って休んでください。',
        kana: 'それはいけませんね。むりをしないで、きょうははやくかえってやすんでください。',
        romaji: 'Sore wa ikemasen ne. Muri o shinaide, kyou wa hayaku kaette yasunde kudasai.',
        en: 'That sounds terrible. Please do not overexert yourself; go home early today and rest.',
        my: 'ဒါတော့ မကောင်းဘူးနော်။ အတင်းအကျပ် မလုပ်ဘဲ ဒီနေ့ စောစောပြန်ပြီး အနားယူလိုက်ပါ။',
        pitchAccent: 'heiban',
      },
      {
        turnIndex: 4,
        speaker: '自分',
        speakerRoleEn: 'Learner',
        speakerRoleMy: 'မိမိ',
        ja: 'はい、ありがとうございます。そうします。',
        kana: 'はい、ありがとうございます。そうします。',
        romaji: 'Hai, arigatou gozaimasu. Sou shimasu.',
        en: 'Yes, thank you very much. I will do that.',
        my: 'ဟုတ်ကဲ့ပါ၊ ကျေးဇူးတင်ပါတယ်။ အဲဒီလိုပဲ လုပ်လိုက်ပါ့မယ်။',
        pitchAccent: 'heiban',
      },
    ],
    shadowingTipEn: 'Emphasize the explanatory "~んです" in "頭も痛いんです" to convey personal physical discomfort naturally.',
    shadowingTipMy: '「頭も痛いんです」၏ အကြောင်းပြချက်ဖော်ပြသည့်「〜んです」ကို သဘာဝကျသော အသံနေအထားဖြင့် လိုက်ဆိုပါ။',
  },
];
