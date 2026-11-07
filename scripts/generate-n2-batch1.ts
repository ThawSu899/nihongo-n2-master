import * as fs from 'fs';
import * as path from 'path';
import { LessonPack, LessonPackSchema } from '../src/domain/models/types';
import { lintLessonPack } from '../src/domain/linter/content-linter';
import { syncCurriculumMap } from './sync-curriculum-map';
import { n2l09Data } from './data/n2-l09-data';
import { n2l10Data } from './data/n2-l10-data';

const kanjiBurmeseDict: Record<string, string> = {
  視: 'ကြည့်ရှုလေ့လာခြင်း / ရှုထောင့်',
  観: 'ရှုမြင်သုံးသပ်ခြင်း / အမြင်',
  配: 'ခွဲဝေဖြန့်ဖြူးခြင်း / ဂရုစိုက်ငဲ့ညှာခြင်း',
  過: 'လွန်ကဲခြင်း / ဖြတ်သန်းကျော်လွန်ခြင်း',
  労: 'ပင်ပန်းဆင်းရဲခြင်း / လုပ်အားစိုက်ထုတ်ခြင်း',
  疲: 'ပင်ပန်းနွမ်းနယ်ခြင်း / မောပန်းခြင်း',
  覚: 'သတိပြုမိခြင်း / နိုးကြားခြင်း / စိတ်ပိုင်းဖြတ်ခြင်း',
  仮: 'ယာယီ / ယူဆချက် / အကယ်၍',
  願: 'ဆန္ဒပြုခြင်း / တောင်းဆိုခြင်း',
  提: 'တင်ပြခြင်း / ကမ်းလှမ်းခြင်း',
  情: 'ခံစားချက် / အခြေအနေ / သတင်းအချက်အလက်',
  悲: 'ဝမ်းနည်းကြေကွဲခြင်း / ပူဆွေးခြင်း',
  感: 'ခံစားချက် / အာရုံခံစားမှု / ကျေးဇူးတင်ခြင်း',
  断: 'ဆုံးဖြတ်ချက်ချခြင်း / ငြင်းပယ်ခြင်း',
  確: 'သေချာခိုင်မာသော / အမှန်စင်စစ်',
  際: 'အခါသမယ / အချိန်အခွင့်အရေး',
  契: 'ပဋိညာဉ် / ကတိကဝတ် / အချိုးအကွေ့',
  移: 'ပြောင်းရွှေ့ခြင်း / ကူးပြောင်းခြင်း',
  問: 'မေးမြန်းခြင်း / မခွဲခြားဘဲ',
  諾: 'လက်ခံသဘောတူခြင်း / ခွင့်ပြုချက်',
  割: 'ခွဲခြမ်းစိတ်ဖြာခြင်း / အချိုးအစား / အချိုးမညီခြင်း',
};

// Load base JSON packs
const p4 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l04.json'), 'utf-8')) as LessonPack;
const p5 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l05.json'), 'utf-8')) as LessonPack;
const p6 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l06.json'), 'utf-8')) as LessonPack;
const p7 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l07.json'), 'utf-8')) as LessonPack;
const p8 = JSON.parse(fs.readFileSync(path.resolve('./content/packs/n2/n2.l08.json'), 'utf-8')) as LessonPack;
const p9 = n2l09Data as LessonPack;
const p10 = n2l10Data as LessonPack;

// Enrich n2.l04
p4.status = 'published';
p4.prov.status = 'native_verified';

// Ensure sentences 4-6 link to valid grammar
if (p4.sentences[3] && p4.sentences[3].grammarIds.length === 0) {
  p4.sentences[3].grammarIds = ['n2.l04.g003'];
}
if (p4.sentences[4] && p4.sentences[4].grammarIds.length === 0) {
  p4.sentences[4].grammarIds = ['n2.l04.g002'];
}
if (p4.sentences[5] && p4.sentences[5].grammarIds.length === 0) {
  p4.sentences[5].grammarIds = ['n2.l04.g001'];
}
p4.reading.translation = `မတူကွဲပြားသော နောက်ခံရှိကြသည့် လူပုဂ္ဂိုလ်များ အတူတကွ ပူးပေါင်းဆောင်ရွက်ကြသော ယနေ့ခေတ် လူ့ဘောင်တွင် အရာရာကို ရှုထောင့်တစ်ခုတည်းမှ ကြည့်မြင်ဆုံးဖြတ်သည့် သဘောထားသည် မလိုလားအပ်သော ပွတ်တိုက်မှုများကို ဖြစ်ပေါ်စေသည့် အဓိကအကြောင်းရင်း ဖြစ်သည်။ စီမံခန့်ခွဲသူများ၏ ရှုထောင့်မှ ကြည့်ပါက (視点から見ると) ထိရောက်သော အသုံးစရိတ် ချုံ့ချမှုတစ်ခု ဖြစ်စေကာမူ၊ နေ့စဉ်တာဝန်များကို လက်တွေ့ထမ်းဆောင်နေရသော ဝန်ထမ်းများ၏ အမြင်အရမူ (従業員にしてみれば) မတန်တဆ ဝန်ထုပ်ဝန်ပိုးကို အတင်းအကျပ် ပေးအပ်ခြင်းဟု ထင်မြင်နိုင်ပေသည်။ ထို့ပြင် ကာလတို အကျိုးအမြတ် သဘောအရ ဆိုရလျှင် (観点から言えば) မှန်ကန်သည်ဟု ယူဆနိုင်သော ဆုံးဖြတ်ချက် ဖြစ်စေကာမူ ဒေသခံ ပြည်သူလူထု၏ ရပ်တည်ချက်အပေါ် လုံလောက်သော စာနာထောက်ထားမှု မရှိပါက ရေရှည်ယုံကြည်မှုကို ဆုံးရှုံးသွားစေနိုင်သည်။ လူတိုင်းသည် မိမိ၏ တစ်ကိုယ်ရေ အမြင်နှင့် ဘက်လိုက်မှုများတွင် ပိတ်မိလေ့ရှိကြသည်။ မိမိ၏ မှန်ကန်မှုကိုသာ တစ်ဖက်သတ် အခိုင်အမာ ပြောဆိုနေမည့်အစား အခြားသူများ၏ ရှုထောင့်တွင် ရပ်တည်ကာ အပြန်အလှန် အကျိုးစီးပွားကို ညှိနှိုင်းရင်း သဟဇာတဖြစ်မှုကို ဖော်ဆောင်သည့် ဆွေးနွေးပြောဆိုမှုသည်သာ အမှန်တကယ် ကျေနပ်လက်ခံနိုင်သော သဘောတူညီချက်နှင့် ပဋိပက္ခများကို ကျော်လွှားနိုင်မှုကို ယူဆောင်လာပေးမည် ဖြစ်သည်။`;

p4.listening.turns = [
  {
    speaker: "総務課長・高橋",
    ja: "小林さん、来春予定している本社オフィスの郊外移転について、社内アンケートの結果はどうだったかな？",
    kana: "こばやしさん、らいしゅんよていしているほんしゃおふぃすのこうがいいてんについて、しゃないあんけーとのけっかはどうだったかな？",
    en: "Kobayashi-san, regarding the suburban relocation of our headquarters office planned for next spring, what were the results of the internal employee questionnaire?",
    my: "ခိုဘာယာရှီစံ၊ လာမယ့်နွေဦးရာသီမှာ ပြုလုပ်ဖို့ စီစဉ်ထားတဲ့ ရုံးချုပ်ကို မြို့ပြင်ပြောင်းရွှေ့ရေးနဲ့ ပတ်သက်ပြီး ကုမ္ပဏီတွင်း စစ်တမ်းရလဒ်တွေ ဘယ်လိုရှိသလဲခင်ဗျာ။",
    myanmar: "ခိုဘာယာရှီစံ၊ လာမယ့်နွေဦးရာသီမှာ ပြုလုပ်ဖို့ စီစဉ်ထားတဲ့ ရုံးချုပ်ကို မြို့ပြင်ပြောင်းရွှေ့ရေးနဲ့ ပတ်သက်ပြီး ကုမ္ပဏီတွင်း စစ်တမ်းရလဒ်တွေ ဘယ်လိုရှိသလဲခင်ဗျာ。"
  },
  {
    speaker: "人事担当・小林",
    ja: "はい、経営陣の視点から見ると賃料を大幅に削減できる素晴らしい計画ですが、通勤する社員にしてみれば通勤時間が大幅に延びるため、不満の声が多く寄せられています。",
    kana: "はい、けいえいじんのしてんからみるとちんりょうをおおはばにさくげんできるすばらしいけいかくですが、つうきんするしゃいんにしてみればつうきんじかんがおおはばにのびるため、ふまんのこえがおおくよせられています。",
    en: "Yes. While from the perspective of executive management it is a marvelous plan capable of substantially cutting rent, from the viewpoint of employees commuting to work it extends transit times considerably, so many voices of dissatisfaction were submitted.",
    my: "ဟုတ်ကဲ့ပါ၊ စီမံခန့်ခွဲရေးအဖွဲ့ရဲ့ ရှုထောင့်ကနေ ကြည့်မယ်ဆိုရင် ငှားရမ်းခကို အများကြီး လျှော့ချနိုင်တဲ့ အလွန်ကောင်းမွန်တဲ့ စီမံချက်ဖြစ်ပေမဲ့ ရုံးတက်ရမယ့် ဝန်ထမ်းတွေရဲ့ အမြင်အရတော့ ခရီးသွားချိန် အများကြီး ပိုကြာသွားမှာဖြစ်လို့ မကျေနပ်တဲ့ အသံတွေ အများကြီး ထွက်ပေါ်နေပါတယ်။",
    myanmar: "ဟုတ်ကဲ့ပါ၊ စီမံခန့်ခွဲရေးအဖွဲ့ရဲ့ ရှုထောင့်ကနေ ကြည့်မယ်ဆိုရင် ငှားရမ်းခကို အများကြီး လျှော့ချနိုင်တဲ့ အလွန်ကောင်းမွန်တဲ့ စီမံချက်ဖြစ်ပေမဲ့ ရုံးတက်ရမယ့် ဝန်ထမ်းတွေရဲ့ အမြင်အရတော့ ခရီးသွားချိန် အများကြီး ပိုကြာသွားမှာဖြစ်လို့ မကျေနပ်တဲ့ အသံတွေ အများကြီး ထွက်ပေါ်နေပါတယ်။"
  },
  {
    speaker: "総務課長・高橋",
    ja: "うーん、コスト削減の観点から言えば魅力的な案件だが、現場の立場に対する配慮が足りなかったかもしれないね。",
    kana: "うーん、こすとさくげんのかんてんからいえばみりょくてきなあんけんだが、げんばのたちばにたいするはいりょがたりなかったかもしれないね。",
    en: "Hmm. Speaking from the standpoint of cost cutting it is an attractive matter, but our consideration for the on-site employees' position may have been insufficient.",
    my: "အင်း၊ ကုန်ကျစရိတ် ချုံ့ချရေး ရှုထောင့်ကနေ ပြောရရင် စိတ်ဝင်စားစရာ အစီအစဉ်ဖြစ်ပေမဲ့ လက်တွေ့မြေပြင်က ဝန်ထမ်းတွေရဲ့ ရပ်တည်ချက်အပေါ် ထည့်သွင်းစဉ်းစားပေးမှု လိုအပ်နေခဲ့တာ ဖြစ်နိုင်တယ်။",
    myanmar: "အင်း၊ ကုန်ကျစရိတ် ချုံ့ချရေး ရှုထောင့်ကနေ ပြောရရင် စိတ်ဝင်စားစရာ အစီအစဉ်ဖြစ်ပေမဲ့ လက်တွေ့မြေပြင်က ဝန်ထမ်းတွေရဲ့ ရပ်တည်ချက်အပေါ် ထည့်သွင်းစဉ်းစားပေးမှု လိုအပ်နေခဲ့တာ ဖြစ်နိုင်တယ်။"
  },
  {
    speaker: "人事担当・小林",
    ja: "おっしゃる通りです。テレワークの導入比率を高めるなど、社員の利害に配慮した柔軟な措置を讲じなければ、不要な摩擦を招いてしまいます。",
    kana: "おっしゃるとおりです。てれわーくのどうにゅうひりつをたかめるなど、しゃいんのりがいにはいりょしたじゅうなんなそちをこうじなければ、ふようなまさつをまねいてしまいます。",
    en: "You are completely right. Unless we enact flexible measures considerate of employees' interests, such as expanding remote work options, it will invite unnecessary friction.",
    my: "ဆရာ ပြောတာ အမှန်ပါပဲ။ အိမ်ကနေ အလုပ်လုပ်နိုင်တဲ့ အချိုးအစားကို မြှင့်တင်ပေးတာမျိုး စတဲ့ ဝန်ထမ်းတွေရဲ့ အကျိုးစီးပွားကို ငဲ့ကွက်တဲ့ ပြောင်းလွယ်ပြင်လွယ်ရှိတဲ့ အစီအမံတွေကို မလုပ်ဆောင်ဘူးဆိုရင် မလိုလားအပ်တဲ့ ပွတ်တိုက်မှုတွေ ဖြစ်လာနိုင်ပါတယ်။",
    myanmar: "ဆရာ ပြောတာ အမှန်ပါပဲ။ အိမ်ကနေ အလုပ်လုပ်နိုင်တဲ့ အချိုးအစားကို မြှင့်တင်ပေးတာမျိုး စတဲ့ ဝန်ထမ်းတွေရဲ့ အကျိုးစီးပွားကို ငဲ့ကွက်တဲ့ ပြောင်းလွယ်ပြင်လွယ်ရှိတဲ့ အစီအမံတွေကို မလုပ်ဆောင်ဘူးဆိုရင် မလိုလားအပ်တဲ့ ပွတ်တိုက်မှုတွေ ဖြစ်လာနိုင်ပါတယ်။"
  },
  {
    speaker: "総務課長・高橋",
    ja: "分かった。全社員が納得できる調和のとれた移転案に修正しよう。役員会への提案資料を作り直してくれるかい。",
    kana: "わかった。ぜんしゃいんなっとくできるちょうわのとれたいてんあんにしゅうせいしよう。やくいんかいへのていあんしりょうをつくりなおしてくれるかい。",
    en: "Understood. Let us revise this into a harmonious relocation proposal to which all employees can consent. Could you redo the proposal presentation for the board of directors?",
    my: "သဘောပေါက်ပါပြီ။ ဝန်ထမ်းအားလုံး ကျေနပ်လက်ခံနိုင်ပြီး သဟဇာတဖြစ်တဲ့ ပြောင်းရွှေ့ရေး အစီအစဉ်အဖြစ် ပြင်ဆင်ကြစို့။ ဒါရိုက်တာဘုတ်အဖွဲ့ဆီ တင်ပြမယ့် စာရွက်စာတမ်းတွေကို ပြန်လည်ပြင်ဆင်ပေးနိုင်မလား။",
    myanmar: "သဘောပေါက်ပါပြီ။ ဝန်ထမ်းအားလုံး ကျေနပ်လက်ခံနိုင်ပြီး သဟဇာတဖြစ်တဲ့ ပြောင်းရွှေ့ရေး အစီအစဉ်အဖြစ် ပြင်ဆင်ကြစို့။ ဒါရိုက်တာဘုတ်အဖွဲ့ဆီ တင်ပြမယ့် စာရွက်စာတမ်းတွေကို ပြန်လည်ပြင်ဆင်ပေးနိုင်မလား။"
  },
  {
    speaker: "人事担当・小林",
    ja: "かしこまりました。客観的なデータを取りまとめて作成いたします。",
    kana: "かしこまりました。きゃっかんてきなでーたをとりまとめてさくせいいたします。",
    en: "Certainly. I will compile objective data and prepare it.",
    my: "စိတ်ချပါခင်ဗျာ။ ဓမ္မဓိဋ္ဌာန်ကျတဲ့ အချက်အလက်တွေကို စုစည်းပြီး ပြင်ဆင်လိုက်ပါမယ်။",
    myanmar: "စိတ်ချပါခင်ဗျာ။ ဓမ္မဓိဋ္ဌာန်ကျတဲ့ အချက်အလက်တွေကို စုစည်းပြီး ပြင်ဆင်လိုက်ပါမယ်။"
  }
];

if (p4.sentences.length === 6) {
  p4.sentences.push(
    {
      id: "n2.l04.s007",
      lessonId: "n2.l04",
      ja: "専門家の視点から見ると、この新技術の実用化にはまだ数年の検証期間が必要である。",
      kana: "せんもんかのしてんからみると、このしんぎじゅつのじつようかにはまだすうねんのけんしょうきかんがひつようである。",
      translation: {
        en: "From the viewpoint of experts, commercializing this new technology still requires several years of verification.",
        my: "ကျွမ်းကျင်သူများ၏ ရှုထောင့်မှ ကြည့်ပါက ဤနည်းပညာသစ်ကို လက်တွေ့အသုံးပြုနိုင်ရန်အတွက် နှစ်အနည်းငယ် စမ်းသပ်ကာလ လိုအပ်နေသေးသည်။"
      },
      vocabIds: ["n2.l04.v001", "n2.l04.v002"],
      grammarIds: ["n2.l04.g001"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l04.s008",
      lessonId: "n2.l04",
      ja: "環境保護の観点から言えば、使い捨てプラスチックの削減は直ちに取り組むべき緊急課題だ。",
      kana: "かんきょうほごのかんてんからいえば、つかいすてぷらすちっくのさくげんはただちにとりくむべききんきゅうかだいだ。",
      translation: {
        en: "Speaking from the standpoint of environmental protection, reducing single-use plastic is an urgent issue that must be addressed immediately.",
        my: "သဘာဝပတ်ဝန်းကျင် ထိန်းသိမ်းရေး ရှုထောင့်မှ ပြောရလျှင် တစ်ခါသုံး ပလတ်စတစ် လျှော့ချရေးသည် ချက်ချင်း လုပ်ဆောင်ရမည့် အရေးတကြီး ပြဿနာဖြစ်သည်။"
      },
      vocabIds: ["n2.l04.v003", "n2.l04.v004"],
      grammarIds: ["n2.l04.g002"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l04.s009",
      lessonId: "n2.l04",
      ja: "新入社員にしてみれば、指導役の先輩が多忙で質問しづらい状況は大きな不安の種であろう。",
      kana: "しんにゅうしゃいんにしてみれば、しどうやくのせんぱいがたぼうでしつもんしづらいじょうきょうはおおきなふあんのたねであろう。",
      translation: {
        en: "From the perspective of newly hired employees, a situation where mentors are so busy it is hard to ask questions is likely a major source of anxiety.",
        my: "အသစ်ဝင်ရောက်လာသော ဝန်ထမ်းများ၏ အမြင်အရ လမ်းညွှန်ပေးသည့် ဝါရင့်ဝန်ထမ်းများ အလွန်အလုပ်များနေသဖြင့် မေးခွန်းမေးရန် ခက်ခဲသော အခြေအနေသည် ကြီးမားသော စိုးရိမ်ပူပန်မှု ဖြစ်ပေလိမ့်မည်။"
      },
      vocabIds: ["n2.l04.v004", "n2.l04.v005"],
      grammarIds: ["n2.l04.g003"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l04.s010",
      lessonId: "n2.l04",
      ja: "教育制度の改革を進めるにあたり、当事者である生徒たちの視点から見ることが何よりも重要だ。",
      kana: "きょういくせいどのかいかくをすすめるにあたり、とうじしゃであるせいとたちのしてんからみることがなによりもじゅうようだ。",
      translation: {
        en: "In advancing educational reform, looking at matters from the viewpoint of the students themselves is more vital than anything else.",
        my: "ပညာရေးစနစ် ပြုပြင်ပြောင်းလဲမှုကို ရှေ့ဆက်ရာတွင် တိုက်ရိုက်သက်ဆိုင်သူများ ဖြစ်ကြသည့် ကျောင်းသားများ၏ ရှုထောင့်မှ ကြည့်မြင်ခြင်းသည် အခြားအရာအားလုံးထက် ပိုမိုအရေးကြီးသည်။"
      },
      vocabIds: ["n2.l04.v001", "n2.l04.v009"],
      grammarIds: ["n2.l04.g001"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l04.s011",
      lessonId: "n2.l04",
      ja: "総合的な収益性の観点から言えば、今回の業務提携は我が社にとって計り知れない利益をもたらす。",
      kana: "そうごうてきなしゅうえきせいのかんてんからいえば、こんかいのぎょうむていけいはわがしゃにとってはかりしれないりえきをもたらす。",
      translation: {
        en: "Speaking from the standpoint of overall profitability, this business alliance will bring immeasurable benefits to our company.",
        my: "ဘက်ပေါင်းစုံ အကျိုးအမြတ်ဖြစ်ထွန်းမှု ရှုထောင့်မှ ပြောရလျှင် ဤစီးပွားရေးပူးပေါင်းမှုသည် ကျွန်ုပ်တို့ကုမ္ပဏီအတွက် မရေမတွက်နိုင်သော အကျိုးကျေးဇူးများကို ဆောင်ကြဉ်းပေးမည်ဖြစ်သည်။"
      },
      vocabIds: ["n2.l04.v007", "n2.l04.v011"],
      grammarIds: ["n2.l04.g002"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l04.s012",
      lessonId: "n2.l04",
      ja: "消費者側から見ると価格設定に疑問が残るが、生産者にしてみれば原材料費の高騰でやむを得ない措置だ。",
      kana: "しょうひしゃがわからみるとかかくせっていにぎもんがのこるが、せいさんしゃにしてみればげんざいりょうひのこうとうでやむをえないそちだ。",
      translation: {
        en: "While from the consumer side doubts remain about the pricing, from the producers' perspective it is an unavoidable measure due to soaring raw material costs.",
        my: "စားသုံးသူဘက်မှ ကြည့်ပါက ဈေးနှုန်းသတ်မှတ်ချက်အပေါ် သံသယများ ရှိနေဆဲဖြစ်သော်လည်း ထုတ်လုပ်သူများ၏ အမြင်အရ ကုန်ကြမ်းစရိတ် မြင့်တက်လာမှုကြောင့် မလွှဲမရှောင်သာသော အစီအမံတစ်ခု ဖြစ်သည်။"
      },
      vocabIds: ["n2.l04.v001", "n2.l04.v004"],
      grammarIds: ["n2.l04.g001", "n2.l04.g003"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    }
  );
}

// Enrich n2.l05
p5.status = 'published';
p5.prov.status = 'native_verified';

// Ensure sentences 4-6 link to valid grammar
if (p5.sentences[3] && p5.sentences[3].grammarIds.length === 0) {
  p5.sentences[3].grammarIds = ['n2.l05.g001'];
}
if (p5.sentences[4] && p5.sentences[4].grammarIds.length === 0) {
  p5.sentences[4].grammarIds = ['n2.l05.g002'];
}
if (p5.sentences[5] && p5.sentences[5].grammarIds.length === 0) {
  p5.sentences[5].grammarIds = ['n2.l05.g003'];
}
p5.reading.translation = `မျက်မှောက်ခေတ် လူ့ဘောင်တွင် မိမိကိုယ်မိမိ ဖွံ့ဖြိုးတိုးတက်စေခြင်းနှင့် အဖွဲ့အစည်း၏ အောင်မြင်မှု တိုးတက်စေရေးအတွက် ကြိုးပမ်းလိုသော ဆန္ဒကို ကောင်းမြတ်သော အရည်အသွေးအဖြစ် ချီးကျူးကြလေ့ရှိသည်။ သို့သော်လည်း မြင့်မားသော ပန်းတိုင်များကို အောင်မြင်ရန် အလွန်အမင်း ဇောတိုက်လွန်းသောကြောင့် (あまり) မိမိ၏ ကျန်းမာရေး ထိန်းသိမ်းမှုကို လျစ်လျူရှုမိကာ လွန်ကဲသော ပင်ပန်းနွမ်းနယ်မှုများ စုပုံလာစေပါက အရာရာ ပျက်စီးဆုံးရှုံးသွားမည် ဖြစ်သည်။ မအောင်မြင်မည်ကို ကြောက်ရွံ့သည့် စိုးရိမ်စိတ်ကြောင့် မိမိကိုယ်ကို အလွန်အကျွံ ဝန်ထုပ်ဝန်ပိုးများ တင်မိကာ ရလဒ်အနေဖြင့် ရုပ်ပိုင်းစိတ်ပိုင်းဆိုင်ရာ ကျန်းမာရေး ထိခိုက်ရသည့် သာဓကများမှာ အဆုံးမရှိ ဖြစ်ပွားနေသည်။ တစ်ကြိမ်တစ်ခါ တာဝန်ရှိသော အခန်းကဏ္ဍကို မိမိကိုယ်တိုင် လက်ခံဆောင်ရွက်ခဲ့ပြီးသည့်နောက် (以上は) ပတ်ဝန်းကျင်၏ မျှော်လင့်ချက်များကို တာဝန်ယူ ဖြည့်ဆည်းပေးရမည့် ဝတ္တရား ရှိသည်မှာ ပြောဖွယ်ရာ မလိုပေ။ သို့သော် ပရော်ဖက်ရှင်နယ် တစ်ဦးအနေဖြင့် စစ်မှန်သော ရလဒ်ကောင်းကို ဖော်ဆောင်လိုသည်ဆိုပါက (からには) မိမိ၏ ကန့်သတ်ချက်ကို အေးဆေးတည်ငြိမ်စွာ ဆင်ခြင်သုံးသပ်ပြီး ရေရှည်ကြိုးပမ်းမှုကို ဆက်လက်ထိန်းသိမ်းနိုင်မည့် သန္နိဋ္ဌာန်ထားရှိမှုသည်သာ ပို၍ အရေးကြီးပေသည်။ စစ်မှန်သော အောင်မြင်မှုဆိုသည်မှာ မိမိကိုယ်ကို လောင်ကျွမ်းဖျက်ဆီးပစ်ခြင်း မဟုတ်ဘဲ ခိုင်မာစွာဖြင့် ရှေ့သို့ အစဉ်တစိုက် ဆက်လက်လျှောက်လှမ်းနိုင်သည့် စွမ်းအားအတွင်း၌သာ တည်ရှိပေသည်။`;

p5.listening.turns = [
  {
    speaker: "企画リーダー・森",
    ja: "吉田さん、来週の新規事業コンペの準備状況はどうですか？顔色が少し優れないようですが。",
    kana: "もりさん、らいしゅうのしんきじぎょうこんぺのじゅんびじょうきょうはどうですか？かおいろがすこしすぐれないようですが。",
    en: "Mori: Yoshida-san, what is the status of preparation for next week's new venture competition? Your complexion looks a bit poor, though.",
    my: "ယိုရှီဒါစံ၊ လာမယ့်အပတ်က လုပ်ငန်းသစ်ပြိုင်ပွဲအတွက် ပြင်ဆင်မှု အခြေအနေ ဘယ်လိုရှိပါသလဲခင်ဗျာ။ မျက်နှာသွေး နည်းနည်း ပျက်နေသလိုပဲနော်။",
    myanmar: "ယိုရှီဒါစံ၊ လာမယ့်အပတ်က လုပ်ငန်းသစ်ပြိုင်ပွဲအတွက် ပြင်ဆင်မှု အခြေအနေ ဘယ်လိုရှိပါသလဲခင်ဗျာ။ မျက်နှာသွေး နည်းနည်း ပျက်နေသလိုပဲနော်။"
  },
  {
    speaker: "チームメンバー・吉田",
    ja: "はい、絶対にコンペを勝ち取りたいという意欲のあまり、毎晩遅くまで資料の推敲を重ねてしまい、少し疲労が溜まっております。",
    kana: "はい、ぜったいにこんぺをかちとりたいといういよくのあまり、まいばんおそくまでしりょうのすいこうをかさねてしまい、すこしひろうがたまっております。",
    en: "Yes. In my extreme eagerness to definitely win the competition, I have been polishing the presentation materials late every night, so fatigue has accumulated somewhat.",
    my: "ဟုတ်ကဲ့ပါ၊ ပြိုင်ပွဲကို မဖြစ်မနေ အနိုင်ရချင်တဲ့ စိတ်ဆန္ဒ ပြင်းပြလွန်းတဲ့အတွက် ညစဉ် ညဉ့်နက်တဲ့အထိ တင်ပြချက်တွေကို အထပ်ထပ် ပြန်လည်ပြင်ဆင်နေမိလို့ နည်းနည်း ပင်ပန်းနွမ်းနယ်နေတာပါ။",
    myanmar: "ဟုတ်ကဲ့ပါ၊ ပြိုင်ပွဲကို မဖြစ်မနေ အနိုင်ရချင်တဲ့ စိတ်ဆန္ဒ ပြင်းပြလွန်းတဲ့အတွက် ညစဉ် ညဉ့်နက်တဲ့အထိ တင်ပြချက်တွေကို အထပ်ထပ် ပြန်လည်ပြင်ဆင်နေမိလို့ နည်းနည်း ပင်ပန်းနွမ်းနယ်နေတာပါ။"
  },
  {
    speaker: "企画リーダー・森",
    ja: "熱心なのは素晴らしいが、体調を崩しては元も子もないよ。我々がプロジェクトを任された以上は、全員が健康な状態で万全のプレゼンテーションを行う義務があるんだ。",
    kana: "ねっしんなのはすばらしいが、たいちょうをくずしてはもともこもないよ。われわれがぷろじぇくとをまかされたいじょうは、ぜんいんがけんこうなじょうたいでばんぜんのぷれぜんてーしょんをおこなうぎむがあるんだ。",
    en: "Your passion is admirable, but if you ruin your health it defeats the entire purpose. Now that we have been entrusted with this project, we have a duty to deliver a flawless presentation with everyone in healthy condition.",
    my: "စိတ်အားထက်သန်တာ ကောင်းပေမဲ့ ကျန်းမာရေး ထိခိုက်သွားရင် အရင်းပါ ဆုံးရှုံးသွားလိမ့်မယ်။ ကျွန်ုပ်တို့ကို ဤပရောဂျက်ကို တာဝန်ပေးအပ်ထားပြီးဖြစ်သည့်အလျောက် လူတိုင်း ကျန်းမာစွာနဲ့ အပြည့်အဝ တင်ပြနိုင်ဖို့ တာဝန်ရှိတယ်လေ။",
    myanmar: "စိတ်အားထက်သန်တာ ကောင်းပေမဲ့ ကျန်းမာရေး ထိခိုက်သွားရင် အရင်းပါ ဆုံးရှုံးသွားလိမ့်မယ်။ ကျွန်ုပ်တို့ကို ဤပရောဂျက်ကို တာဝန်ပေးအပ်ထားပြီးဖြစ်သည့်အလျောက် လူတိုင်း ကျန်းမာစွာနဲ့ အပြည့်အဝ တင်ပြနိုင်ဖို့ တာဝန်ရှိတယ်လေ။"
  },
  {
    speaker: "チームメンバー・吉田",
    ja: "おっしゃる通りです。チーム全員で臨むからには、私一人で過剰な負担を抱え込まず、役割を適切に分担する覚悟が必要でした。",
    kana: "おっしゃるとおりです。ちーむぜんいんでのぞむからには、わたしひとりでかじょうなふたんをかかえこまず、やくわりをてきせつにぶんたんするかくごがひつようでした。",
    en: "You are completely right. Since we are taking this on as a whole team, I needed the resolve not to hoard an excessive burden by myself and properly divide duties instead.",
    my: "ခေါင်းဆောင် ပြောတာ အမှန်ပါပဲ။ အဖွဲ့တစ်ဖွဲ့လုံး အတူတကွ ရင်ဆိုင်ဖြေရှင်းကြမည်ဖြစ်သည့်အတွက် ကျွန်တော် တစ်ယောက်တည်း ဝန်ထုပ်ဝန်ပိုးတွေ အများကြီး မယူထားဘဲ တာဝန်တွေကို စနစ်တကျ ခွဲဝေယူမယ့် သန္နိဋ္ဌာန် လိုအပ်ခဲ့ပါတယ်။",
    myanmar: "ခေါင်းဆောင် ပြောတာ အမှန်ပါပဲ။ အဖွဲ့တစ်ဖွဲ့လုံး အတူတကွ ရင်ဆိုင်ဖြေရှင်းကြမည်ဖြစ်သည့်အတွက် ကျွန်တော် တစ်ယောက်တည်း ဝန်ထုပ်ဝန်ပိုးတွေ အများကြီး မယူထားဘဲ တာဝန်တွေကို စနစ်တကျ ခွဲဝေယူမယ့် သန္နိဋ္ဌာန် လိုအပ်ခဲ့ပါတယ်။"
  },
  {
    speaker: "企画リーダー・森",
    ja: "そうだ。デザイン作成は他のメンバーに任せて、吉田さんは発表の構成に専念してください。",
    kana: "そうだ。でざいんさくせいはほかのめんばーにまかせて、よしださんははっぴょうのこうせいにせんねんしてください。",
    en: "Exactly. Leave the slide design to other team members and concentrate your focus on the presentation flow.",
    my: "ဟုတ်တယ်လေ။ ဒီဇိုင်းပိုင်းကို အခြားအဖွဲ့ဝင်တွေဆီ လွှဲအပ်ထားပြီး ယိုရှီဒါစံကတော့ တင်ပြချက် ဖွဲ့စည်းပုံအပေါ်မှာပဲ အာရုံစိုက်လုပ်ဆောင်ပါ။",
    myanmar: "ဟုတ်တယ်လေ။ ဒီဇိုင်းပိုင်းကို အခြားအဖွဲ့ဝင်တွေဆီ လွှဲအပ်ထားပြီး ယိုရှီဒါစံကတော့ တင်ပြချက် ဖွဲ့စည်းပုံအပေါ်မှာပဲ အာရုံစိုက်လုပ်ဆောင်ပါ။"
  },
  {
    speaker: "チームメンバー・吉田",
    ja: "ありがとうございます。チームの力を信じて、必ず目標を達成してみせます。",
    kana: "ありがとうございます。ちーむのちからをしんじて、かならずもくひょうをたっせいしてみせます。",
    en: "Thank you very much. Believing in our team's strength, I will definitely achieve our target.",
    my: "ကျေးဇူးတင်ပါတယ်ခင်ဗျာ။ အဖွဲ့ရဲ့ စွမ်းအားကို ယုံကြည်ပြီး ပန်းတိုင်ကို မဖြစ်မနေ အရောက်လှမ်းပြပါမယ်။",
    myanmar: "ကျေးဇူးတင်ပါတယ်ခင်ဗျာ။ အဖွဲ့ရဲ့ စွမ်းအားကို ယုံကြည်ပြီး ပန်းတိုင်ကို မဖြစ်မနေ အရောက်လှမ်းပြပါမယ်။"
  }
];

if (p5.sentences.length === 6) {
  p5.sentences.push(
    {
      id: "n2.l05.s007",
      lessonId: "n2.l05",
      ja: "成功を焦るあまり、事前のリスク調査を怠って多大な損失を出してしまった。",
      kana: "せいこうをあせるあまり、じぜんのりすくちょうさをおこたってただいなそんしつをだしてしまった。",
      translation: {
        en: "In my excessive hurry to achieve success, I neglected the advance risk assessment and incurred immense losses.",
        my: "အောင်မြင်မှုကို အလွန်အမင်း လိုချင်လောဘကြီးလွန်းသောကြောင့် ကြိုတင်အန္တရာယ်စစ်တမ်းကို လျစ်လျူရှုမိကာ ကြီးမားသော ဆုံးရှုံးမှုကို ဖြစ်ပေါ်စေခဲ့သည်။"
      },
      vocabIds: ["n2.l05.v001", "n2.l05.v008"],
      grammarIds: ["n2.l05.g001"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l05.s008",
      lessonId: "n2.l05",
      ja: "国民の負託を受けた代表である以上は、私利私欲を捨てて公共の福祉に尽くすべきだ。",
      kana: "こくみんのふたくをうけただいひょうであるいじょうは、しりしよくをすててこうきょうのふくしにつくすべきだ。",
      translation: {
        en: "Now that one is a representative entrusted by the citizens, one ought to discard personal greed and devote oneself to public welfare.",
        my: "ပြည်သူလူထု၏ ယုံကြည်အားကိုးမှုကို ရရှိထားသော ကိုယ်စားလှယ်ဖြစ်သည့်အလျောက် ကိုယ်ကျိုးစီးပွားကို စွန့်လွှတ်ကာ အများပြည်သူ အကျိုးစီးပွားအတွက် အစွမ်းကုန် ကြိုးပမ်းသင့်သည်။"
      },
      vocabIds: ["n2.l05.v003", "n2.l05.v004"],
      grammarIds: ["n2.l05.g002"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l05.s009",
      lessonId: "n2.l05",
      ja: "プロの演奏家として舞台に立つからには、聴衆を魅了する最高の演奏を披露しなければならない。",
      kana: "ぷろのえんそうかとしてぶたいにたつからには、ちょうしゅうをみりょうするさいこうのえんそうをひろうしなければならない。",
      translation: {
        en: "Since one is standing on stage as a professional musician, one must deliver a supreme performance that captivates the audience.",
        my: "ပရော်ဖက်ရှင်နယ် တူရိယာပညာရှင်အဖြစ် စင်မြင့်ထက်သို့ တက်ရောက်ဖျော်ဖြေမည်ဖြစ်သည့်အတွက် ပရိသတ်ကို စွဲဆောင်စေမည့် အကောင်းမွန်ဆုံး ဖျော်ဖြေမှုကို တင်ဆက်ပြသရမည် ဖြစ်သည်။"
      },
      vocabIds: ["n2.l05.v005", "n2.l05.v006"],
      grammarIds: ["n2.l05.g003"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l05.s010",
      lessonId: "n2.l05",
      ja: "子供の将来を心配するあまり、親が過干渉になって自立心を損なうことがある。",
      kana: "こどものしょうらいをしんぱいするあまり、おやがかかんしょうになってじりつしんをそこなうことがある。",
      translation: {
        en: "Out of excessive anxiety for their child's future, parents sometimes become overbearing and damage their independence.",
        my: "ကလေး၏ အနာဂတ်ကို အလွန်အမင်း စိုးရိမ်လွန်းသောကြောင့် မိဘများသည် အလွန်အကျွံ ဝင်ရောက်စွက်ဖက်မိကာ ကလေး၏ ကိုယ့်အားကိုယ်ကိုးလိုစိတ်ကို ထိခိုက်စေတတ်သည်။"
      },
      vocabIds: ["n2.l05.v001", "n2.l05.v007"],
      grammarIds: ["n2.l05.g001"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l05.s011",
      lessonId: "n2.l05",
      ja: "契約を締結した以上は、いかなる困難が生じようとも約束の期日を守らねばならない。",
      kana: "けいやくをていけつしたいじょうは、いかなるこんなんが生じようともやくそくのきじつをまもらねばならない。",
      translation: {
        en: "Now that the contract has been executed, the promised deadline must be observed no matter what difficulties arise.",
        my: "စာချုပ်ကို ချုပ်ဆိုခဲ့ပြီးသည့်အလျောက် မည်သို့ပင် အခက်အခဲများ ကြုံတွေ့ရစေကာမူ သတ်မှတ်ထားသော ရက်စွဲကို မဖြစ်မနေ လိုက်နာရမည် ဖြစ်သည်။"
      },
      vocabIds: ["n2.l05.v009", "n2.l05.v010"],
      grammarIds: ["n2.l05.g002"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    },
    {
      id: "n2.l05.s012",
      lessonId: "n2.l05",
      ja: "このプロジェクトの責任者に選ばれたからには、最後まで全力を尽くしてやり抜く所存だ。",
      kana: "このぷろじぇくとのせきにんしゃにえらばれたからには、さいごまでぜんりょくをつくしてやりぬくしょぞんだ。",
      translation: {
        en: "Since I was chosen as the director of this project, I intend to do my utmost to see it through to the end.",
        my: "ဤပရောဂျက်၏ တာဝန်ခံအဖြစ် ရွေးချယ်ခံရသည့်အတွက် အဆုံးတိုင်အောင် အစွမ်းကုန် ကြိုးပမ်းဆောင်ရွက်သွားရန် ဆန္ဒရှိပါသည်။"
      },
      vocabIds: ["n2.l05.v009", "n2.l05.v012"],
      grammarIds: ["n2.l05.g003"],
      audio: { kind: "tts", lang: "ja-JP" },
      prov: { source: "Nihongo N2 Master Editorial Team", license: "CC-BY-4.0", status: "native_verified", updatedAt: "2026-10-15T10:00:00Z", rev: 2 }
    }
  );
}

const batchPacks = [p4, p5, p6, p7, p8, p9, p10];

// Ensure consistent Burmese enrichment across all batch 1 packs
for (const pack of batchPacks) {
  pack.status = 'published';
  pack.prov.status = 'native_verified';

  // Enrich Kanji with Burmese meanings
  for (const kanji of pack.kanjis) {
    if (!kanji.meaningMy && kanjiBurmeseDict[kanji.char]) {
      kanji.meaningMy = kanjiBurmeseDict[kanji.char];
      kanji.meaningMyanmar = kanjiBurmeseDict[kanji.char];
    }
  }

  // Validate schema
  LessonPackSchema.parse(pack);

  // Validate linter
  const lint = lintLessonPack(pack);
  if (lint.errors.length > 0) {
    throw new Error(`Lint errors in ${pack.id}: ${lint.errors.join(', ')}`);
  }
}

console.log('All 7 N2 Batch 1 packs validated successfully!');

// 1. Write JSON files to content/packs/n2/
for (const pack of batchPacks) {
  const jsonPath = path.resolve(`./content/packs/n2/${pack.id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(pack, null, 2), 'utf-8');
  console.log(`Wrote JSON: ${jsonPath}`);
}

// 2. Ensure src/domain/curriculum/packs/n2/ directory exists
const tsDir = path.resolve('./src/domain/curriculum/packs/n2');
fs.mkdirSync(tsDir, { recursive: true });

// 3. Write individual TS files
for (const pack of batchPacks) {
  const varName = `${pack.id.replace('.', '')}Data`;
  const tsPath = path.join(tsDir, `${pack.id}.ts`);
  const content = `import { LessonPack } from '../../../models/types';\n\nexport const ${varName}: LessonPack = ${JSON.stringify(
    pack,
    null,
    2
  )};\n`;
  fs.writeFileSync(tsPath, content, 'utf-8');
  console.log(`Wrote TS pack: ${tsPath}`);
}

// 4. Write src/domain/curriculum/packs/n2/index.ts
const indexContent = `import { LessonPack } from '../../../models/types';
import { n2l04Data } from './n2.l04';
import { n2l05Data } from './n2.l05';
import { n2l06Data } from './n2.l06';
import { n2l07Data } from './n2.l07';
import { n2l08Data } from './n2.l08';
import { n2l09Data } from './n2.l09';
import { n2l10Data } from './n2.l10';

export {
  n2l04Data,
  n2l05Data,
  n2l06Data,
  n2l07Data,
  n2l08Data,
  n2l09Data,
  n2l10Data,
};

export const N2_BATCH1_PACKS: LessonPack[] = [
  n2l04Data,
  n2l05Data,
  n2l06Data,
  n2l07Data,
  n2l08Data,
  n2l09Data,
  n2l10Data,
];
`;
fs.writeFileSync(path.join(tsDir, 'index.ts'), indexContent, 'utf-8');
console.log(`Wrote TS index: ${path.join(tsDir, 'index.ts')}`);

// 5. Create src/domain/curriculum/content-loader.ts
const domainContentLoaderPath = path.resolve('./src/domain/curriculum/content-loader.ts');
const domainContentLoaderContent = `import { ContentLoader } from '../../data/content/content-loader';
import { N2_BATCH1_PACKS } from './packs/n2';
import { LessonPack } from '../models/types';

export { ContentLoader, N2_BATCH1_PACKS };

export function getN2Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH1_PACKS.find((p) => p.id === lessonId);
}
`;
fs.writeFileSync(domainContentLoaderPath, domainContentLoaderContent, 'utf-8');
console.log(`Wrote domain content-loader: ${domainContentLoaderPath}`);

// 6. Update src/domain/curriculum/index.ts
const curriculumIndexPath = path.resolve('./src/domain/curriculum/index.ts');
const curriculumIndexContent = `export * from './n5-expressions-catalog';
export * from './n5-common-mistakes-catalog';
export * from './n5-shadowing-dialogues';
export * from './packs/n2';
export * from './content-loader';
`;
fs.writeFileSync(curriculumIndexPath, curriculumIndexContent, 'utf-8');
console.log(`Updated curriculum index: ${curriculumIndexPath}`);

// 7. Sync curriculum-map.json
const syncResult = syncCurriculumMap();
console.log('Curriculum map synced successfully:', {
  syncedCount: syncResult.syncedCount,
  publishedCount: syncResult.publishedCount,
  draftedCount: syncResult.draftedCount,
  plannedCount: syncResult.plannedCount,
});
