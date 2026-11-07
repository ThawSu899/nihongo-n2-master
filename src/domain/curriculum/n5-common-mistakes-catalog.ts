/**
 * N5 Common Mistakes & "言わない! (Don't Say This!)" Trap Catalog
 * Curated from Minna no Nihongo (1-25), Shin Nihongo 500 Mon N5, and JLPT N5 test traps.
 * Provides explicit contrastive warnings, linguistic rationale, and authentic Burmese explanations.
 */

export interface N5CommonMistake {
  id: string;
  incorrect: string;
  correct: string;
  category: 'i_adjective' | 'verb_state' | 'wear_verb' | 'particle_reciprocal' | 'particle_motion' | 'irregular_verb' | 'na_adjective' | 'manner_particle';
  ruleJa: string;
  ruleEn: string;
  ruleMy: string;
  warningBurmese: string;
  detailedExplanationMy: string;
  exampleContext: {
    incorrectSentence: string;
    correctSentence: string;
    sentenceMy: string;
  };
}

export const N5_COMMON_MISTAKES_CATALOG: N5CommonMistake[] = [
  {
    id: 'mistake_01_i_adj_past',
    incorrect: '× 寒いでした',
    correct: '○ 寒かったです',
    category: 'i_adjective',
    ruleJa: 'イ形容詞の過去形は「〜かったです」。絶対に「〜いでした」と言わない！',
    ruleEn: 'The past tense of い-adjectives is "〜かったです". Never say "〜いでした"!',
    ruleMy: 'い-နာမဝိသေသန (i-adj) များ၏ အတိတ်ကာလပုံစံမှာ 「〜かったです」ဖြစ်ပြီး 「〜いでした」ဟု လုံးဝမသုံးရပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 寒いでした မဟုတ်ပါ၊ ○ 寒かったです သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'い-နာမဝိသေသနများ (ဥပမာ 寒い, 暑い, 高い, おいしい) သည် အတိတ်ကာလပြောင်းသည့်အခါ နောက်ဆုံး「い」ကိုဖြုတ်ပြီး「かったです」ကို ပေါင်းရပါသည် (寒い -> 寒かったです)။ な-နာမဝိသေသနများသာ「〜でした」နှင့် ပေါင်းစပ်နိုင်ပါသည် (暇でした, 元気でした)။',
    exampleContext: {
      incorrectSentence: 'きのうはとても寒いでした。',
      correctSentence: 'きのうはとても寒かったです。',
      sentenceMy: 'မနေ့က အလွန် အေးခဲ့ပါသည်။',
    },
  },
  {
    id: 'mistake_02_shitte_imasen',
    incorrect: '× 知っていません',
    correct: '○ 知りません',
    category: 'verb_state',
    ruleJa: '「知っています」の否定形は「知りません」。「知っていません」とは言わない！',
    ruleEn: 'The negative form of "知っています" is "知りません". Never say "知っていません"!',
    ruleMy: '「知っています (သိပါသည်)」၏ အငြင်းသဘောဆောင်ပုံစံမှာ 「知りません」ဖြစ်ပြီး 「知っていません」ဟု လုံးဝမသုံးရပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 知っていません မဟုတ်ပါ၊ ○ 知りません သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'တစ်စုံတစ်ခုကို သိရှိနေသောအခြေအနေကို「知っています」ဟု သုံးသော်လည်း၊ မသိရှိကြောင်း ပြောဆိုသည့်အခါ သတင်းအချက်အလက်ကို လက်ခံရရှိထားခြင်း လုံးဝမရှိသဖြင့်「知りません」ဟုသာ အငြင်းပုံစံ သုံးရပါသည် (အင်္ဂလိပ် I do not know နှင့် တူညီသည်)။',
    exampleContext: {
      incorrectSentence: '田中さんの電話番号を知っていません。',
      correctSentence: '田中さんの電話番号を知りません。',
      sentenceMy: 'တာနာကာစံ၏ ဖုန်းနံပါတ်ကို မသိပါခင်ဗျာ။',
    },
  },
  {
    id: 'mistake_03_boushi_o_kiru',
    incorrect: '× 帽子を着る',
    correct: '○ 帽子をかぶる',
    category: 'wear_verb',
    ruleJa: '帽子は「かぶる」。上半身の服だけが「着る」。',
    ruleEn: 'Hats take the verb "かぶる". Only upper-body clothes use "着る".',
    ruleMy: 'ဦးထုပ်ဆောင်းရာတွင် 「かぶる」ကြိယာကို သုံးရပါသည် (အင်္ကျီဝတ်သကဲ့သို့ 「着る」မသုံးရပါ)！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 帽子を着る မဟုတ်ပါ၊ ○ 帽子をかぶる သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'ဂျပန်ဘာသာတွင် ခန္ဓာကိုယ်အစိတ်အပိုင်းအလိုက် ဝတ်ဆင်သည့်ကြိယာ ကွဲပြားပါသည်:\n• ဦးခေါင်းတွင် ဆောင်းခြင်း -> かぶる (帽子をかぶる)\n• ကိုယ်အထက်ပိုင်း အင်္ကျီဝတ်ခြင်း -> 着る (シャツを着る, 上着を着る)\n• ကိုယ်အောက်ပိုင်း ဘောင်းဘီ/ဖိနပ်စွပ်ခြင်း -> はく (ズボンをはく, 靴をはく)\n• မျက်မှန်တပ်ခြင်း -> かける (眼鏡をかける)',
    exampleContext: {
      incorrectSentence: '黒い帽子を着ています。',
      correctSentence: '黒い帽子をかぶっています。',
      sentenceMy: 'အနက်ရောင် ဦးထုပ်ကို ဆောင်းထားပါသည်။',
    },
  },
  {
    id: 'mistake_04_kekkon_particle',
    incorrect: '× イギリス人に結婚する',
    correct: '○ イギリス人と結婚する',
    category: 'particle_reciprocal',
    ruleJa: '結婚は相互的な相手を伴うため助詞「と」を用いる。「に」は言わない！',
    ruleEn: 'Marriage is a reciprocal action requiring the mutual particle "と". Never say "〜に結婚する"!',
    ruleMy: 'လက်ထပ်ထိမ်းမြားခြင်းသည် အပြန်အလှန်ပြုမူရသော ကိစ္စဖြစ်သဖြင့် ဝိဘတ်「と」ကို သုံးရပါသည် (「に」မသုံးရပါ)！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × イギリス人に結婚する မဟုတ်ပါ၊ ○ イギリス人と結婚する သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'လက်ထပ်ခြင်း (結婚する)၊ တိုင်ပင်ဆွေးနွေးခြင်း (相談する)၊ ရန်ဖြစ်ခြင်း (喧嘩する) ကဲ့သို့သော နှစ်ဦးနှစ်ဖက် အပြန်အလှန် ပူးတွဲပါဝင်ရသည့် လုပ်ရပ်များတွင် လက်တွဲဖော် သို့မဟုတ် ပါဝင်သူနောက်၌「と」ဝိဘတ်ကိုသာ သုံးစွဲရပါသည် (Xさんと結婚する)။',
    exampleContext: {
      incorrectSentence: '来年、イギリス人に結婚します。',
      correctSentence: '来年、イギリス人と結婚します。',
      sentenceMy: 'နောက်နှစ်တွင် အင်္ဂလိပ်လူမျိုးနှင့် လက်ထပ်ပါမည်။',
    },
  },
  {
    id: 'mistake_05_michi_motion_particle',
    incorrect: '× この道に行ってください',
    correct: '○ この道を行ってください',
    category: 'particle_motion',
    ruleJa: '道路や橋など通過する場所・移動経路には助詞「を」を用いる。「に」は言わない！',
    ruleEn: 'A path of motion or traversed space (roads, bridges, parks) takes "を", not "に"!',
    ruleMy: 'ဖြတ်သန်းသွားလာရာ လမ်းကြောင်း၊ လမ်း သို့မဟုတ် တံတားတွင် ဖြတ်သန်းခြင်းပြ ဝိဘတ်「を」ကို သုံးရပါသည် (「に」မသုံးရပါ)！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × この道に行ってください မဟုတ်ပါ၊ ○ この道を行ってください သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'လမ်းလျှောက်ခြင်း (歩く)၊ ဖြတ်ကျော်ခြင်း (渡る)၊ ပြေးခြင်း (走る)၊ သွားခြင်း (行く) ကဲ့သို့သော နေရာတစ်ခုကို ဖြတ်သန်းရွေ့လျားသည့် လှုပ်ရှားမှုများတွင် ဖြတ်သန်းရာ လမ်းကြောင်းနောက်၌ ဝိဘတ်「を」ကို သုံးပါသည် (道を渡る, 公園を散歩する, この道を行く)။ 「に」သည် ဆိုက်ရောက်ရာ ပန်းတိုင် (ဥပမာ 駅に行く) ကိုသာ ညွှန်းဆိုပါသည်။',
    exampleContext: {
      incorrectSentence: 'すみません、この道に行ってください。',
      correctSentence: 'すみません、この道を行ってください。',
      sentenceMy: 'တစ်ဆိတ်လောက်ပါ၊ ဤလမ်းအတိုင်း သွားပေးပါ။',
    },
  },
  {
    id: 'mistake_06_konai_irregular',
    incorrect: '× 来ない (きない)',
    correct: '○ 来ない (こない)',
    category: 'irregular_verb',
    ruleJa: 'カ行変格活用「来る」の否定形は「こない」。「きない」とは絶対に読まない！',
    ruleEn: 'The negative form of Group 3 irregular verb "来る" is read "こない", never "きない"!',
    ruleMy: 'အုပ်စု (၃) ပုံစံမမှန်ကြိယာ「来る (くる)」၏ ない-form အငြင်းပုံစံမှာ 「こない」ဖြစ်ပြီး 「きない」ဟု လုံးဝမဖတ်ရပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 来ない (きない) မဟုတ်ပါ၊ ○ 来ない (こない) သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'ကြိယာ「来る (くる)」သည် အသံထွက်ပြောင်းလဲမှု အလွန်ထူးခြားသော အုပ်စု (၃) ကြိယာဖြစ်ပါသည်:\n• Dictionary form: くる (来る)\n• ます-form: きます (来ます)\n• ない-form: こない (来ない) - (きない လုံးဝမဟုတ်ပါ)\n• て-form: きて (来て)\n• た-form: きた (来た)',
    exampleContext: {
      incorrectSentence: '明日は誰もきない（来ない）。',
      correctSentence: '明日は誰もこない（来ない）。',
      sentenceMy: 'မနက်ဖြန် မည်သူမျှ လာမည် မဟုတ်ပါ။',
    },
  },
  {
    id: 'mistake_07_suki_da_not_ga_aru',
    incorrect: '× 日本料理の好きがあります',
    correct: '○ 日本料理が好きです',
    category: 'na_adjective',
    ruleJa: '「好き」はナ形容詞。「好きがあります」とは言わない！',
    ruleEn: '"好き" is a na-adjective. Never say "好きがあります"!',
    ruleMy: '「好き」သည် နာမ်မဟုတ်ဘဲ な-နာမဝိသေသနဖြစ်သဖြင့် 「好きがあります」ဟု မသုံးရပါ၊ 「〜が好きです」ဟုသာ သုံးရပါသည်！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 好きがあります မဟုတ်ပါ၊ ○ 好きです သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: '「好き」သည် ကြိုက်နှစ်သက်ကြောင်း ဖော်ပြသော な-နာမဝိသေသန ဖြစ်ပြီး 「[အရာဝတ္ထု] が 好きです / 好きではありません」ဟု သုံးစွဲရပါသည် (အင်္ဂလိပ် like သကဲ့သို့ 動詞 မဟုတ်ဘဲ နာမဝိသေသန ဖြစ်သည်)။',
    exampleContext: {
      incorrectSentence: '私は日本料理の好きがあります。',
      correctSentence: '私は日本料理が好きです。',
      sentenceMy: 'ကျွန်တော်သည် ဂျပန်အစားအစာကို ကြိုက်နှစ်သက်ပါသည်။',
    },
  },
  {
    id: 'mistake_08_kirei_na_adj',
    incorrect: '× 綺麗い / 綺麗かった',
    correct: '○ 綺麗 / 綺麗でした',
    category: 'na_adjective',
    ruleJa: '「きれい」は最後が「い」で終わるがナ形容詞。「きれいかった」は言わない！',
    ruleEn: '"きれい" ends in "い" but is a na-adjective! Never say "きれいかった"!',
    ruleMy: '「きれい」သည် အဆုံးသတ်တွင်「い」ပါသော်လည်း な-နာမဝိသေသန ဖြစ်သဖြင့် အတိတ်ကာလမှာ 「きれいでした」ဖြစ်ပြီး 「きれいかった」ဟု လုံးဝမသုံးရပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 綺麗かった မဟုတ်ပါ၊ ○ 綺麗でした သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: '「きれい (綺麗)」နှင့်「ゆうめい (有名)」တို့သည် အဆုံးသတ်တွင်「い」သံပါသော်လည်း な-နာမဝိသေသနများ ဖြစ်ကြပါသည်။ ထို့ကြောင့် ပစ္စုပ္ပန်တွင်「きれいです / きれいな花」、အတိတ်ကာလတွင်「きれいでした / きれいではありませんでした」ဟု သုံးစွဲရပါသည် (い-adj ကဲ့သို့ かった မပြောင်းပါ)။',
    exampleContext: {
      incorrectSentence: '京都の桜はとても綺麗かった。',
      correctSentence: '京都の桜はとても綺麗でした。',
      sentenceMy: 'ကျိုတို၏ ချယ်ရီပန်းများသည် အလွန် လှပခဲ့ပါသည်။',
    },
  },
  {
    id: 'mistake_09_aruite_manner',
    incorrect: '× 歩いてで行きます',
    correct: '○ 歩いて行きます',
    category: 'manner_particle',
    ruleJa: '「歩いて」自体が手段・様態を表すため、助詞「で」は付けない！',
    ruleEn: '"歩いて" already conveys the means/manner of movement, so do not attach the particle "で"!',
    ruleMy: '「歩いて」ကိုယ်တိုင်က နည်းလမ်းပုံစံ (လမ်းလျှောက်လျက်) ကို ဖော်ပြပြီးဖြစ်သဖြင့် ဝိဘတ်「で」ထပ်မံထည့်သွင်းရန် မလိုပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 歩いてで行きます မဟုတ်ပါ၊ ○ 歩いて行きます သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'မော်တော်ကား၊ ရထား စသော ယာဉ်များဖြင့် သွားလာသည့်အခါ「電車で行く / 車で行く」ဟု「で」ဝိဘတ်ကို သုံးသော်လည်း၊ ခြေလျင်လျှောက်သွားသည့်အခါ「歩いて行く」ဟုသာ သုံးပြီး「歩いてで行く」ဟု ဝိဘတ်「で」မထည့်ရပါ။',
    exampleContext: {
      incorrectSentence: '駅から学校まで歩いてで行きます。',
      correctSentence: '駅から学校まで歩いて行きます。',
      sentenceMy: 'ဘူတာမှ ကျောင်းအထိ လမ်းလျှောက်သွားပါမည်။',
    },
  },
  {
    id: 'mistake_10_sayounara_workplace',
    incorrect: '× さようなら (to teacher/boss)',
    correct: '○ 失礼します / お先に失礼します',
    category: 'manner_particle',
    ruleJa: '目上の人や職場では「さようなら」を使わない！「失礼します」と言う！',
    ruleEn: 'Do NOT use "さようなら" with teachers, bosses, or colleagues when leaving. Say "失礼します" or "お先に失礼します"!',
    ruleMy: 'ဆရာ၊ လုပ်ငန်းခွင် အထက်လူကြီးနှင့် လုပ်ဖော်ကိုင်ဖက်များထံမှ ပြန်ချိန်တွင် 「さようなら」ဟု လုံးဝမပြောရပါ、「失礼します / お先に失礼します」ဟုသာ ပြောရပါသည်！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × さようなら မဟုတ်ပါ၊ ○ お先に失礼します / 失礼します သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: '「さようなら」သည် ကာလကြာရှည် ခွဲခွာမည့်အခါ သို့မဟုတ် ကျောင်းသားကလေးငယ်များ အချင်းချင်းနှုတ်ဆက်ရာတွင်သာ သုံးစွဲကြပါသည်။ လူကြီး၊ ဆရာ သို့မဟုတ် အလုပ်ခွင်တွင် နှုတ်ဆက်ရာ၌「失礼します / お先に失礼します」ဟု ယဉ်ကျေးစွာ ပြောဆိုရပါသည် (さようなら သည် ထာဝရခွဲခွာသကဲ့သို့ အဓိပ္ပာယ်သက်ရောက်နိုင်သည်)။',
    exampleContext: {
      incorrectSentence: '先生、さようなら。',
      correctSentence: '先生、失礼します。明日もよろしくお願いします。',
      sentenceMy: 'ဆရာ၊ ကျွန်တော် ပြန်ပါတော့မည် ခင်ဗျာ။',
    },
  },
  {
    id: 'mistake_11_iru_vs_aru',
    incorrect: '× 庭に犬があります',
    correct: '○ 庭に犬がいます',
    category: 'verb_state',
    ruleJa: '人や動物など、自力で動く生き物は「います」を使う。「あります」とは言わない！',
    ruleEn: 'For living creatures that move on their own (people, animals), use "います", not "あります"!',
    ruleMy: 'လူ၊ တိရစ္ဆာန် စသော သက်ရှိများ တည်ရှိမှုကို ဖော်ပြရာတွင် 「います」ကိုသာ သုံးပြီး 「あります」ဟု မသုံးရပါ！',
    warningBurmese: '言わない! (မှားယွင်းသုံးစွဲတတ်သော ပုံစံ) - × 犬があります မဟုတ်ပါ၊ ○ 犬がいます သာ ဖြစ်ပါသည်။',
    detailedExplanationMy: 'သစ်ပင်၊ စားပွဲ၊ ကား စသော သက်မဲ့အရာဝတ္ထုများအတွက်「あります」ကို သုံးပြီး၊ လူနှင့် တိရစ္ဆာန်များအတွက်「います」ကို မဖြစ်မနေ ခွဲခြားသုံးစွဲရပါသည် (Minna no Nihongo Lesson 10 အဓိကသဒ္ဒါ)။',
    exampleContext: {
      incorrectSentence: 'あそこに猫があります。',
      correctSentence: 'あそこに猫がいます。',
      sentenceMy: 'ဟိုနေရာတွင် ကြောင်တစ်ကောင် ရှိပါသည်။',
    },
  },
];
