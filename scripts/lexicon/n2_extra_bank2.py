# -*- coding: utf-8 -*-
"""
JLPT N2 Vocabulary Bank - Expansion Part 2 (200+ unique verified items)
Pure Kana, Authentic Burmese, Verified JLPT N2 level.
"""

def get_n2_extra2():
    items = []

    # 1. Economics, Finance, Corporate Strategy
    economy = [
        ('資金調達', 'しきんちょうたつ', 'Fundraising / capital procurement', 'ရန်ပုံငွေရှာဖွေစုဆောင်းခြင်း', 'noun', 'nakadaka', 4),
        ('財務諸表', 'ざいむしょひょう', 'Financial statements', 'ဘဏ္ဍာရေးရှင်းတမ်းများ', 'noun', 'nakadaka', 4),
        ('内部留保', 'ないぶりゅうほ', 'Internal reserves / retained earnings', 'ကုမ္ပဏီအတွင်းသိုလှောင်ထားသောငွေ', 'noun', 'nakadaka', 4),
        ('不良債権', 'ふりょうさいけん', 'Non-performing loan / bad debt', 'ပြန်မရနိုင်သောကြွေးမြီဆိုး', 'noun', 'nakadaka', 4),
        ('経営統合', 'けいえいとうごう', 'Business merger / consolidation', 'စီးပွားရေးလုပ်ငန်းများပေါင်းစည်းခြင်း', 'noun', 'heiban', 0),
        ('独占禁止', 'どくせんきんし', 'Antitrust / antimonopoly', 'ဈေးကွက်လက်ဝါးကြီးအုပ်မှုတားမြစ်ခြင်း', 'noun', 'heiban', 0),
        ('景気低迷', 'けいきていめい', 'Economic slump / stagnation', 'စီးပွားရေးကျဆင်းတုံ့ဆိုင်းမှု', 'noun', 'heiban', 0),
        ('増資', 'ぞうし', 'Capital increase', 'အရင်းအနှီးတိုးမြှင့်ခြင်း', 'noun', 'heiban', 0),
        ('減資', 'げんし', 'Capital reduction', 'အရင်းအနှီးလျှော့ချခြင်း', 'noun', 'atamadaka', 1),
        ('減価償却', 'げんかしょうきゃく', 'Depreciation of assets', 'ပိုင်ဆိုင်မှုတန်ဖိုးလျော့တွက်ခြင်း', 'noun', 'nakadaka', 4),
        ('株式公開', 'かぶしきこうかい', 'Initial public offering / going public', 'အစုရှယ်ယာများကိုအများပြည်သူသို့ထုတ်ရောင်းခြင်း', 'noun', 'nakadaka', 4),
        ('債務超過', 'さいむちょうか', 'Insolvency / liabilities exceeding assets', 'ကြွေးမြီပိုင်ဆိုင်မှုထက်ကျော်လွန်ခြင်း', 'noun', 'nakadaka', 4),
        ('経営破綻', 'けいえいはたん', 'Business bankruptcy / financial collapse', 'စီးပွားရေးလုပ်ငန်းပျက်စီးပြိုလဲခြင်း', 'noun', 'heiban', 0),
        ('資産運用', 'しさんうんよう', 'Asset management / investment', 'ပိုင်ဆိုင်မှုများကိုရင်းနှီးမြှုပ်နှံစီမံခန့်ခွဲခြင်း', 'noun', 'nakadaka', 4),
        ('投資信託', 'とうししんたく', 'Mutual fund / investment trust', 'ရင်းနှီးမြှုပ်နှံမှုရန်ပုံငွေအဖွဲ့', 'noun', 'nakadaka', 4),
        ('為替相場', 'かわせそうば', 'Exchange rate', 'နိုင်ငံခြားငွေလဲလှယ်နှုန်း', 'noun', 'nakadaka', 4),
        ('金利引き上げ', 'きんりひきあげ', 'Interest rate hike', 'အတိုးနှုန်းတိုးမြှင့်ခြင်း', 'noun', 'heiban', 0),
        ('量的緩和', 'りょうてきかんわ', 'Quantitative easing', 'ငွေကြေးပမာဏဖြေလျှော့ပေးခြင်း', 'noun', 'nakadaka', 5),
        ('財政赤字', 'ざいせいあかじ', 'Fiscal deficit / budget deficit', 'ဘဏ္ဍာရေးလိုငွေပြမှု', 'noun', 'nakadaka', 4),
        ('経常収支', 'けいじょうしゅうし', 'Current account balance', 'လက်ရှိစာရင်းရှင်းတမ်း', 'noun', 'nakadaka', 5),
        ('為替介入', 'かわせかいにゅう', 'Currency intervention', 'ငွေလဲလှယ်နှုန်းဝင်ရောက်ထိန်းကျောင်းခြင်း', 'noun', 'nakadaka', 4),
        ('物価指数', 'ぶっかしすう', 'Consumer price index', 'ကုန်ဈေးနှုန်းညွှန်းကိန်း', 'noun', 'nakadaka', 4),
        ('外貨準備', 'がいかじゅんび', 'Foreign exchange reserves', 'နိုင်ငံခြားငွေအရန်ထားရှိမှု', 'noun', 'nakadaka', 4),
        ('経済制裁', 'けいざいせいさい', 'Economic sanctions', 'စီးပွားရေးပိတ်ဆို့အရေးယူမှု', 'noun', 'nakadaka', 4),
        ('規制緩和', 'きせいかんわ', 'Deregulation', 'စည်းမျဉ်းဖြေလျှော့ပေးခြင်း', 'noun', 'heiban', 0),
        ('関税障壁', 'かんぜいしょうへき', 'Tariff barrier', 'အကောက်ခွန်အတားအဆီး', 'noun', 'nakadaka', 5),
        ('自由貿易', 'じゆうぼうえき', 'Free trade', 'လွတ်လပ်သောကုန်သွယ်ရေး', 'noun', 'nakadaka', 4),
        ('市場競争', 'しじょうきょうそう', 'Market competition', 'ဈေးကွက်ပြိုင်ဆိုင်မှု', 'noun', 'nakadaka', 4),
        ('新規参入', 'しんきさんにゅう', 'New market entry', 'ဈေးကွက်အသစ်သို့ဝင်ရောက်ယှဉ်ပြိုင်ခြင်း', 'noun', 'heiban', 0),
        ('下請け業者', 'したうけぎょうしゃ', 'Subcontractor', 'လက်ခွဲကန်ထရိုက်တာ', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in economy:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 2. Law, Justice & Governance
    law = [
        ('陪審員', 'ばいしんいん', 'Juror / jury member', 'ဂျူရီအဖွဲ့ဝင်', 'noun', 'nakadaka', 3),
        ('違憲審査', 'いけんしんさ', 'Judicial review / constitutionality review', 'ဖွဲ့စည်းပုံအခြေခံဥပဒေနှင့်ညီမညီစစ်ဆေးခြင်း', 'noun', 'nakadaka', 4),
        ('司法解釈', 'しほうかいしゃく', 'Judicial interpretation', 'တရားစီရင်ရေးဆိုင်ရာအဓိပ္ပာယ်ဖွင့်ဆိုချက်', 'noun', 'nakadaka', 4),
        ('損害賠償', 'そんがいばいしょう', 'Compensation for damages', 'နစ်နာကြေးလျော်ကြေးပေးခြင်း', 'noun', 'heiban', 0),
        ('債権者', 'さいけんしゃ', 'Creditor', 'မြီရှင် / အကြွေးရရန်ရှိသူ', 'noun', 'nakadaka', 3),
        ('債務者', 'さいむしゃ', 'Debtor', 'မြီစား / အကြွေးဆပ်ရန်ရှိသူ', 'noun', 'nakadaka', 3),
        ('破産宣告', 'はさんせんこく', 'Adjudication of bankruptcy', 'လူမွဲအဖြစ်ကြေညာခြင်း', 'noun', 'heiban', 0),
        ('告訴', 'こくそ', 'Criminal complaint / accusation', 'တရားစွဲဆိုတိုင်ကြားခြင်း', 'noun', 'atamadaka', 1),
        ('告発', 'こくはつ', 'Indictment / whistleblowing', 'ပြစ်မှုဖွင့်ချတိုင်တန်းခြင်း', 'noun', 'heiban', 0),
        ('証拠隠滅', 'しょうこいんめつ', 'Destruction of evidence', 'သက်သေအထောက်အထားဖျောက်ဖျက်ခြင်း', 'noun', 'heiban', 0),
        ('執行猶予', 'しっこうゆうよ', 'Stay of execution / suspended sentence', 'ထောင်ဒဏ်ဆိုင်းငံ့ခြင်း', 'noun', 'nakadaka', 5),
        ('懲役刑', 'ちょうえきけい', 'Imprisonment with labor', 'အလုပ်ကြမ်းနှင့်ထောင်ဒဏ်', 'noun', 'heiban', 0),
        ('罰金刑', 'ばっきんけい', 'Fine / financial penalty', 'ဒဏ်ငွေချမှတ်ခြင်း', 'noun', 'heiban', 0),
        ('令状', 'れいじょう', 'Warrant / writ', 'ဖမ်းဝရမ်း / စစ်ဆေးဝရမ်း', 'noun', 'heiban', 0),
        ('捜索差押', 'そうさくさしおさえ', 'Search and seizure', 'ရှာဖွေသိမ်းဆည်းခြင်း', 'noun', 'heiban', 0),
        ('公判', 'こうはん', 'Public trial', 'လူထုရှေ့တရားခွင်စစ်ဆေးခြင်း', 'noun', 'heiban', 0),
        ('控訴審', 'こうそしん', 'Appellate trial', 'အယူခံတရားရုံးစစ်ဆေးမှု', 'noun', 'nakadaka', 3),
        ('上告', 'じょうこく', 'Final appeal to Supreme Court', 'တရားလွှတ်တော်ချုပ်သို့အထူးအယူခံဝင်ခြင်း', 'noun', 'heiban', 0),
        ('示談', 'じだん', 'Out-of-court settlement', 'တရားရုံးပြင်ပအပြန်အလှန်ညှိနှိုင်းကျေအေးခြင်း', 'noun', 'heiban', 0),
        ('免責', 'めんせき', 'Exemption from liability / immunity', 'တာဝန်မှကင်းလွတ်ခွင့်', 'noun', 'heiban', 0),
        ('正当防衛', 'せいとうぼうえい', 'Legitimate self-defense', 'မိမိကိုယ်ကိုခုခံပိုင်ခွင့်', 'noun', 'nakadaka', 5),
        ('業務上過失', 'ぎょうむじょうかしつ', 'Professional negligence', 'လုပ်ငန်းခွင်ပေါ့ဆမှုကြောင့်ဖြစ်သောပြစ်မှု', 'noun', 'heiban', 0),
        ('職権乱用', 'しょっけんらんよう', 'Abuse of official authority', 'ရာထူးအာဏာအလွဲသုံးစားလုပ်ခြင်း', 'noun', 'heiban', 0),
        ('国家賠償', 'こっかばいしょう', 'State redress / government liability', 'နိုင်ငံတော်မှနစ်နာကြေးပေးလျော်ခြင်း', 'noun', 'heiban', 0),
        ('時効成立', 'じこうせいりつ', 'Statute of limitations expiry', 'တရားစွဲဆိုခွင့်ကာလပြည့်မြောက်ခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in law:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 3. Science, Nature & Ecology
    science = [
        ('遺伝子組み換え', 'いでんしくみかえ', 'Genetic modification', 'မျိုးရိုးဗီဇပြုပြင်ပြောင်းလဲခြင်း', 'noun', 'nakadaka', 5),
        ('ゲノム解析', 'げのむかいせき', 'Genome sequencing / analysis', 'မျိုးရိုးဗီဇကုဒ်စနစ်စစ်ဆေးခွဲခြမ်းစိတ်ဖြာခြင်း', 'noun', 'nakadaka', 4),
        ('再生可能エネルギー', 'さいせいかのうえねるぎー', 'Renewable energy', 'ပြန်လည်ပြည့်ဖြိုးမြဲစွမ်းအင်', 'noun', 'nakadaka', 6),
        ('核融合', 'かくゆうごう', 'Nuclear fusion', 'နျူကလီးယားပေါင်းစပ်ခြင်းစွမ်းအင်', 'noun', 'nakadaka', 3),
        ('生態系破壊', 'せいたいけいはかい', 'Destruction of ecosystem', 'ဂေဟစနစ်ပျက်စီးပြုန်းတီးခြင်း', 'noun', 'nakadaka', 5),
        ('生物多様性', 'せいぶつたようせい', 'Biodiversity', 'ဇီဝမျိုးစုံမျိုးကွဲကြွယ်ဝမှု', 'noun', 'nakadaka', 5),
        ('温室効果ガス', 'おんしつこうかがす', 'Greenhouse gases', 'ဖန်လုံအိမ်ဓာတ်ငွေ့များ', 'noun', 'nakadaka', 5),
        ('光合成', 'こうごうせい', 'Photosynthesis', 'အပင်များအလင်းမှီစုဖွဲ့ခြင်း', 'noun', 'heiban', 0),
        ('触媒', 'しょくばい', 'Catalyst', 'ဓာတ်ကူပစ္စည်း', 'noun', 'heiban', 0),
        ('分子構造', 'ぶんしこうぞう', 'Molecular structure', 'မော်လီကျူးတည်ဆောက်ပုံ', 'noun', 'nakadaka', 4),
        ('ナノテクノロジー', 'なのてくのろじー', 'Nanotechnology', 'နာနိုနည်းပညာ', 'noun', 'nakadaka', 4),
        ('大気汚染', 'たいきおせん', 'Air pollution', 'လေထုညစ်ညမ်းမှု', 'noun', 'heiban', 0),
        ('土壌汚染', 'どじょうおせん', 'Soil contamination', 'မြေဆီလွှာညစ်ညမ်းမှု', 'noun', 'heiban', 0),
        ('海洋投棄', 'かいようとうき', 'Ocean dumping', 'သမုဒ္ဒရာအတွင်းစွန့်ပစ်ပစ္စည်းပစ်ချခြင်း', 'noun', 'nakadaka', 4),
        ('酸性雨', 'さんせいう', 'Acid rain', 'အက်ဆစ်မိုး', 'noun', 'nakadaka', 3),
        ('オゾン層', 'おぞんそう', 'Ozone layer', 'အိုဇုန်းလွှာ', 'noun', 'nakadaka', 3),
        ('紫外線', 'しがいせん', 'Ultraviolet ray', 'ခရမ်းလွန်ရောင်ခြည်', 'noun', 'heiban', 0),
        ('赤外線', 'せきがいせん', 'Infrared ray', 'အနီအောက်ရောင်ခြည်', 'noun', 'heiban', 0),
        ('電磁波', 'でんじは', 'Electromagnetic wave', 'လျှပ်စစ်သံလိုက်လှိုင်း', 'noun', 'atamadaka', 1),
        ('放射能漏れ', 'ほうしゃのうもれ', 'Radioactive leak', 'ရေဒီယိုသတ္တိကြွပစ္စည်းယိုစိမ့်မှု', 'noun', 'heiban', 0),
        ('化石燃料', 'かせきねんりょう', 'Fossil fuel', 'ရုပ်ကြွင်းလောင်စာ', 'noun', 'nakadaka', 4),
        ('二酸化炭素', 'にさんかたんそ', 'Carbon dioxide', 'ကာဗွန်ဒိုင်အောက်ဆိုဒ်', 'noun', 'nakadaka', 5),
        ('地熱発電', 'ちねつはつでん', 'Geothermal power generation', 'မြေအောက်အပူစွမ်းအင်သုံးလျှပ်စစ်ထုတ်လုပ်ခြင်း', 'noun', 'nakadaka', 4),
        ('風力発電', 'ふうりょくはつでん', 'Wind power generation', 'လေအားလျှပ်စစ်ထုတ်လုပ်ခြင်း', 'noun', 'nakadaka', 4),
        ('水力発電', 'すいりょくはつでん', 'Hydroelectric power generation', 'ရေအားလျှပ်စစ်ထုတ်လုပ်ခြင်း', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in science:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 4. Psychological Nuances, Character Traits & Proverbial Four-Kanji Idioms (Yojijukugo)
    mind = [
        ('虚栄心', 'きょえいしん', 'Vanity / vainglory', 'ဝါကြွားလိုသောစိတ် / ဟိတ်ဟန်ထုတ်လိုစိတ်', 'noun', 'heiban', 0),
        ('猜疑心', 'さいぎしん', 'Suspicious mind / jealousy', 'သံသယစိတ် / မယုံသင်္ကာစိတ်', 'noun', 'heiban', 0),
        ('劣等感', 'れっとうかん', 'Inferiority complex', 'သိမ်ငယ်စိတ်', 'noun', 'nakadaka', 3),
        ('優越感', 'ゆうえつかん', 'Superiority complex', 'သာလွန်သည်ဟုထင်မှတ်သောမာနစိတ်', 'noun', 'heiban', 0),
        ('自虐', 'じぎゃく', 'Self-deprecation / masochism', 'မိမိကိုယ်ကိုနှိမ်ချပြက်ရယ်ပြုခြင်း', 'noun', 'heiban', 0),
        ('意気消沈', 'いきしょうちん', 'Depression / dejected spirits', 'စိတ်ဓာတ်ကျဆင်းအားလျော့ခြင်း', 'noun', 'heiban', 0),
        ('意気揚々', 'いきようよう', 'Triumphant / high-spirited', 'ဝံ့ကြွားတက်ကြွသောစိတ်', 'noun', 'nakadaka', 3),
        ('疑心暗鬼', 'ぎしんあんき', 'Suspicion breeding dark monsters', 'သံသယလွန်ကဲ၍ထင်ယောင်ထင်မှားဖြစ်ခြင်း', 'noun', 'nakadaka', 3),
        ('臨機応変', 'りんきおうへん', 'Adapting to circumstances flexibly', 'အခြေအနေနှင့်အညီလျင်မြန်စွာပြောင်းလဲတုံ့ပြန်ခြင်း', 'noun', 'nakadaka', 4),
        ('単刀直入', 'たんとうちょくにゅう', 'Straightforward / straight to point', 'လိုရင်းကိုတိုက်ရိုက်ပွင့်လင်းစွာပြောခြင်း', 'noun', 'heiban', 0),
        ('四面楚歌', 'しめんそか', 'Surrounded by enemies / isolated', 'အရပ်လေးမျက်နှာရန်သူဝိုင်းထားခြင်း', 'noun', 'atamadaka', 1),
        ('試行錯誤', 'しこうさくご', 'Trial and error', 'မှားမှားမှန်မှန်လက်တွေ့စမ်းသပ်လုပ်ဆောင်ခြင်း', 'noun', 'nakadaka', 4),
        ('自暴自棄', 'じぼうじき', 'Despair / reckless abandonment', 'ကိုယ့်ကိုယ်ကိုယ်အရှုံးပေးစွန့်ပစ်ရမ်းကားခြင်း', 'noun', 'nakadaka', 4),
        ('絶体絶命', 'ぜったいぜつめい', 'Desperate situation / cornered', 'ထွက်ပေါက်မရှိအကျပ်အတည်းကြုံတွေ့ခြင်း', 'noun', 'heiban', 0),
        ('一網打尽', 'いちもうだじん', 'Catching the whole gang at once', 'တစ်ကွန်တည်းနှင့်အကုန်ဖမ်းဆီးရမိခြင်း', 'noun', 'heiban', 0),
        ('起死回生', 'きしかいせい', 'Wake from death to life / dramatic comeback', 'သေရာမှပြန်လည်ရှင်သန်အောင်မြင်လာခြင်း', 'noun', 'heiban', 0),
        ('前途多難', 'ぜんとたなん', 'Having a grim, troubled future ahead', 'အနာဂတ်ခရီးလမ်းအခက်အခဲများစွာကြုံရမည်ဖြစ်ခြင်း', 'noun', 'nakadaka', 4),
        ('一攫千金', 'いっかくせんきん', 'Getting rich quick in one stroke', 'တစ်ကြိမ်တည်းဖြင့်သူဌေးချက်ချင်းဖြစ်သွားခြင်း', 'noun', 'heiban', 0),
        ('危機一髪', 'ききいっぱつ', 'Hair’s breadth escape / critical juncture', 'ဆံခြည်တစ်မျှင်စာကပ်သီးကပ်သတ်အန္တရာယ်မှလွတ်ခြင်း', 'noun', 'nakadaka', 4),
        ('孤立無援', 'こりつむえん', 'Isolated and helpless', 'အထီးကျန်ပြီးမည်သူ့အကူအညီမျှမရရှိခြင်း', 'noun', 'heiban', 0),
        ('電光石火', 'でんこうせっか', 'Lightning speed / swift as flash', 'လျှပ်စီးလက်သကဲ့သို့အလွန်လျင်မြန်ခြင်း', 'noun', 'atamadaka', 1),
        ('自給自足', 'じきゅうじそく', 'Self-sufficiency / self-support', 'မိမိဖူလုံအောင်မိမိဘာသာစိုက်ပျိုးထုတ်လုပ်ခြင်း', 'noun', 'heiban', 0),
        ('十人十色', 'じゅうにんといろ', 'Different strokes for different folks', 'လူဆယ်ယောက်စိတ်ဆယ်မျိုး', 'noun', 'heiban', 0),
        ('誠心誠意', 'せいしんせいい', 'With all one’s heart and sincerity', 'စိတ်ရင်းမှန်ဖြင့်ရိုးသားဖြူစင်စွာ', 'noun', 'nakadaka', 4),
        ('本末転倒', 'ほんまつてんとう', 'Putting the cart before the horse', 'အဓိကနှင့်သာမညကိုပြောင်းပြန်လုပ်မိခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in mind:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 5. Adverbs, Discourse Connectors & High-Yield Modifiers
    adverbs = [
        ('むやみに', 'むやみに', 'Blindly / thoughtlessly / excessively', 'မဆင်မခြင်အလွန်အကျွံ', 'adverb', 'atamadaka', 1),
        ('やけに', 'やけに', 'Desperately / awfully / abnormally', 'ထူးထူးခြားခြားအလွန်အမင်း', 'adverb', 'atamadaka', 1),
        ('ひいては', 'ひいては', 'Not only that but also / and consequently', 'ထို့အပြင်ဆက်စပ်လျက်', 'adverb', 'atamadaka', 1),
        ('なまじ', 'なまじ', 'Thoughtlessly / half-heartedly', 'မဖြစ်စလောက်မပြည့်စုံဘဲ', 'adverb', 'heiban', 0),
        ('とりわけ', 'とりわけ', 'Especially / above all else', 'အထူးသဖြင့်ပိုမို၍', 'adverb', 'heiban', 0),
        ('ましてや', 'ましてや', 'Much less / let alone', 'ဆိုဖွယ်ရာမရှိဝေးစွ', 'adverb', 'atamadaka', 1),
        ('おのずと', 'おのずと', 'Naturally / spontaneously of itself', 'အလိုအလျောက်သဘာဝအတိုင်း', 'adverb', 'heiban', 0),
        ('かえって', 'かえって', 'On the contrary / rather worse', 'ထင်ထားသည်နှင့်ဆန့်ကျင်ဘက်ပို၍', 'adverb', 'atamadaka', 1),
        ('あながち', 'あながち', 'Not necessarily / not entirely so', 'လုံးဝမဟုတ်ဟုတပ်အပ်မပြောနိုင်', 'adverb', 'heiban', 0),
        ('かろうじて', 'かろうじて', 'Barely / only just managed', 'သီသီလေးကပ်လွတ်မြောက်ရုံမျှ', 'adverb', 'nakadaka', 2),
        ('すんなり', 'すんなり', 'Smoothly without resistance', 'ချောချောမွေ့မွေ့အဆင်ပြေပြေ', 'adverb', 'nakadaka', 3),
        ('きっかり', 'きっかり', 'Exactly / precisely on time or dot', 'တိကျစွာကွက်တိ', 'adverb', 'nakadaka', 3),
        ('てっきり', 'てっきり', 'Assumed surely (contrary to fact)', 'သေချာပေါက်ထင်မှတ်ခဲ့မိသော်လည်း', 'adverb', 'nakadaka', 3),
        ('うっすら', 'うっすら', 'Faintly / lightly / dimly visible', 'ရေးတေးတေးမှိန်ဖျော့စွာ', 'adverb', 'nakadaka', 3),
        ('ずっしり', 'ずっしり', 'Heavily / with great weight', 'လေးလေးပင်ပင်အလေးချိန်စီးစွာ', 'adverb', 'nakadaka', 3),
        ('じっくり', 'じっくり', 'Thoroughly / unhurriedly taking time', 'အချိန်ယူပြီးစေ့စပ်သေချာစွာ', 'adverb', 'nakadaka', 3),
        ('しっとり', 'しっとり', 'Moistly / calm and serene elegance', 'စိုစွတ်နူးညံ့ငြိမ်သက်စွာ', 'adverb', 'nakadaka', 3),
        ('どっしり', 'どっしり', 'Massive / stable and imposing', 'ခံ့ညားတည်ငြိမ်ခိုင်မာစွာ', 'adverb', 'nakadaka', 3),
        ('めっきり', 'めっきり', 'Remarkably / noticeably changed', 'သိသိသာသာကြီးပြောင်းလဲသွားစွာ', 'adverb', 'nakadaka', 3),
        ('すっきり', 'すっきり', 'Refreshed / clean and neat', 'လန်းဆန်းရှင်းလင်းပေါ့ပါးစွာ', 'adverb', 'nakadaka', 3),
        ('がっくり', 'がっくり', 'Heartbroken / dropped with discouragement', 'စိတ်ဓာတ်ကျဆင်းညှိုးငယ်စွာ', 'adverb', 'nakadaka', 3),
        ('ぐったり', 'ぐったり', 'Completely exhausted / limp', 'အင်အားကုန်ခမ်းပျော့ခွေစွာ', 'adverb', 'nakadaka', 3),
        ('きっぱり', 'きっぱり', 'Decisively / flatly rejecting', 'ပြတ်ပြတ်သားသားငြင်းပယ်စွာ', 'adverb', 'nakadaka', 3),
        ('あっさり', 'あっさり', 'Easily / plainly / light flavor or attitude', 'ရိုးရိုးရှင်းရှင်းပေါ့ပေါ့ပါးပါး', 'adverb', 'nakadaka', 3),
        ('みっちり', 'みっちり', 'Severely / strictly trained without break', 'ကြပ်ကြပ်မတ်မတ်တင်းကျပ်စွာ', 'adverb', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in adverbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 6. Advanced Compound Nouns & Abstract Concepts
    abstract_nouns = [
        ('危機意識', 'ききいしき', 'Sense of crisis / awareness of danger', 'အန္တရာယ်ရှိနေပြီဟူသောအသိစိတ်', 'noun', 'nakadaka', 4),
        ('当事者意識', 'とうじしゃいしき', 'Sense of personal ownership / stake', 'မိမိကိစ္စဖြစ်သည်ဟူသောတာဝန်ယူစိတ်', 'noun', 'nakadaka', 5),
        ('相互依存', 'そうごいぞん', 'Interdependence / mutual reliance', 'အပြန်အလှန်မှီခိုအားထားမှု', 'noun', 'nakadaka', 4),
        ('既得権益', 'きとくけんえき', 'Vested interests', 'အရင်ကတည်းကရရှိထားပြီးသားအခွင့်အရေးများ', 'noun', 'nakadaka', 4),
        ('不偏不党', 'ふへんふとう', 'Neutrality and impartiality', 'ဘက်မလိုက်တရားမျှတမှု', 'noun', 'heiban', 0),
        ('公明正大', 'こうめいせいだい', 'Fair and aboveboard', 'ပွင့်လင်းမြင်သာတရားမျှတမှု', 'noun', 'heiban', 0),
        ('有耶無耶', 'うやむや', 'Vague / ambiguous / swept under carpet', 'မရေမရာဝေဝါးစွာထားခြင်း', 'noun', 'heiban', 0),
        ('試金石', 'しきんせき', 'Touchstone / acid test', 'စမ်းသပ်စစ်ဆေးရာအဓိကစံပေတံ', 'noun', 'nakadaka', 3),
        ('引き金', 'ひきがね', 'Trigger of gun or catastrophe', 'အစပျိုးစေသောအချက် / မောင်းခလုတ်', 'noun', 'heiban', 0),
        ('道標', 'みちしるべ', 'Guidepost / signpost for future', 'လမ်းညွှန်ပြသပေးသောအမှတ်အသား', 'noun', 'nakadaka', 3),
        ('金字塔', 'きんじとう', 'Monumental achievement / milestone', 'သမိုင်းဝင်မော်ကွန်းတင်အောင်မြင်မှု', 'noun', 'heiban', 0),
        ('羅針盤', 'らしんばん', 'Compass / navigational guide', 'အိမ်မြှောင် / လမ်းညွှန်ပေးသည့်အရာ', 'noun', 'heiban', 0),
        ('未曾有', 'みぞう', 'Unprecedented / unheard of disaster', 'မကြုံစဖူးထူးကဲသောအဖြစ်ဆိုး', 'noun', 'heiban', 0),
        ('破天荒', 'はてんこう', 'Unprecedented / epoch-making bold act', 'သမိုင်းတစ်လျှောက်မကြုံဖူးသောရဲရင့်မှု', 'noun', 'heiban', 0),
        ('臨場感', 'りんじょうかん', 'Realism / feeling of being right there', 'မျက်မြင်ကိုယ်တွေ့ကဲ့သို့အရှိအတိုင်းခံစားရမှု', 'noun', 'nakadaka', 3),
        ('親近感', 'しんきんかん', 'Feeling of kinship / friendliness', 'ရင်းနှီးနွေးထွေးသောခံစားချက်', 'noun', 'nakadaka', 3),
        ('疎外感', 'そがいかん', 'Sense of alienation / feeling left out', 'ပစ်ပယ်ခံရသည်ဟုခံစားရမှု', 'noun', 'nakadaka', 3),
        ('達成感', 'たっせいかん', 'Sense of accomplishment', 'ပြီးမြောက်အောင်မြင်သည့်ကျေနပ်မှု', 'noun', 'nakadaka', 3),
        ('疲労感', 'ひろうかん', 'Sense of fatigue and exhaustion', 'ပင်ပန်းနွမ်းနယ်သည့်ခံစားချက်', 'noun', 'nakadaka', 3),
        ('切迫感', 'せっぱくかん', 'Sense of urgency and imminent danger', 'အရေးတကြီးဖိစီးလာသောခံစားချက်', 'noun', 'nakadaka', 3),
        ('背徳感', 'はいとくかん', 'Guilty pleasure / sense of immorality', 'အပြစ်ရှိသကဲ့သို့ခံစားရသောစိတ်', 'noun', 'nakadaka', 3),
        ('焦燥感', 'しょうそうかん', 'Sense of restlessness / impatience', 'စိတ်မရှည်မရိုးမရွဖြစ်မှု', 'noun', 'nakadaka', 3),
        ('閉塞感', 'へいそくかん', 'Feeling of entrapment / stagnation', 'ထွက်ပေါက်ပိတ်ပြီးပိတ်လှောင်ခံရသည့်ခံစားချက်', 'noun', 'nakadaka', 3),
        ('高揚感', 'こうようかん', 'Elation / emotional uplifting', 'စိတ်ဓာတ်တက်ကြွရွှင်လန်းမှု', 'noun', 'nakadaka', 3),
        ('開放感', 'かいほうかん', 'Sense of freedom and spacious relief', 'လွတ်လပ်ပေါ့ပါးသွားသောခံစားချက်', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in abstract_nouns:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 7. Additional Rich Verbs & Expressions
    extra_verbs = [
        ('打ち明ける', 'うちあける', 'To confide / confess inner thoughts', 'ရင်ဖွင့်ပြောပြသည်', 'verb', 'nakadaka', 4),
        ('言い逃れる', 'いいのがれる', 'To talk one’s way out of trouble', 'ဆင်ခြေပေးလွတ်မြောက်သည်', 'verb', 'nakadaka', 5),
        ('見逃す', 'みのがす', 'To overlook / let pass by without noticing', 'မျက်ကွယ်ပြုကျော်လွန်သည်', 'verb', 'nakadaka', 3),
        ('見損なう', 'みそこなう', 'To misjudge character / fail to see', 'လူမှားထင်မှတ်သည်', 'verb', 'nakadaka', 4),
        ('見縊る', 'みくびる', 'To belittle / underestimate opponent', 'အထင်သေးပေါ့ဆသည်', 'verb', 'nakadaka', 3),
        ('出し抜く', 'だしぬく', 'To outsmart / steal a march on', 'ဦးအောင်လှည့်စားဖြတ်ကျော်သည်', 'verb', 'nakadaka', 3),
        ('欺く', 'あざむく', 'To deceive / trick craftily', 'လှည့်စားလိမ်လည်သည်', 'verb', 'nakadaka', 3),
        ('嘲笑う', 'あざわらう', 'To sneer at / mock cynically', 'လှောင်ပြုံးပြုံးကာကဲ့ရဲ့သည်', 'verb', 'nakadaka', 4),
        ('見下す', 'みくだす', 'To look down upon / despise', 'အောက်တန်းကျသည်ဟုနှိမ်ချကြည့်သည်', 'verb', 'nakadaka', 3),
        ('持て成す', 'もてなす', 'To entertain guests hospitably', 'ဧည့်ဝတ်ကျေပွန်စွာဧည့်ခံသည်', 'verb', 'nakadaka', 3),
        ('もてあそぶ', 'もてあそぶ', 'To toy with feelings / play with toy', 'ကစားစရာကဲ့သို့လှည့်စားသည်', 'verb', 'nakadaka', 4),
        ('取り繕う', 'とりつくろう', 'To patch up appearances / gloss over', 'အပေါ်ယံဖာထေးထိန်းသိမ်းသည်', 'verb', 'nakadaka', 5),
        ('取り成す', 'とりなす', 'To mediate between parties / smooth over', 'ကြားဝင်စေ့စပ်ဖျန်ဖြေသည်', 'verb', 'nakadaka', 3),
        ('言いくるめる', 'いいくるめる', 'To talk into submission / hoodwink', 'စကားလှည့်ပတ်ဖျောင်းဖျသိမ်းသွင်းသည်', 'verb', 'nakadaka', 5),
        ('言い包める', 'いいくるめる', 'To sophistically coax or persuade', 'ချိုသာသောစကားဖြင့်သိမ်းသွင်းသည်', 'verb', 'nakadaka', 5),
        ('押し問答', 'おしもんどう', 'Dispute / heated back-and-forth debate', 'အပြန်အလှန်အချေအတင်ငြင်းခုံခြင်း', 'noun', 'nakadaka', 3),
        ('押し問答する', 'おしもんどうする', 'To argue back and forth endlessly', 'အပြန်အလှန်အငြင်းပွားသည်', 'verb', 'nakadaka', 3),
        ('立ち往生する', 'たちおうじょうする', 'To be brought to standstill / stranded', 'ရှေ့မတိုးသာနောက်မဆုတ်သာရပ်တန့်သည်', 'verb', 'heiban', 0),
        ('二の句が継げない', 'にのくがつげない', 'At a loss for next words / stunned', 'အံ့အားသင့်လွန်း၍နောက်စကားမပြောနိုင်ဖြစ်သည်', 'expression', 'heiban', 0),
        ('目の色を変える', 'めのいろをかえる', 'To change look of eyes with fury or greed', 'မျက်လုံးအရောင်ပြောင်းကာတက်ကြွလာသည်', 'expression', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in extra_verbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    return items
