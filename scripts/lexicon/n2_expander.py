# -*- coding: utf-8 -*-
"""
High-capacity N2 Lexicon Expander
Supplements n2_data.py to exceed 1,150+ unique N2 vocabulary items
"""

def get_more_n2_words():
    items = []

    # 1. Corporate Governance & Business Management
    corporate = [
        ('取締役会', 'とりしまりやくかい', 'Board of directors meeting', 'ဒါရိုက်တာများဘုတ်အဖွဲ့အစည်းအဝေး', 'noun', 'nakadaka', 6),
        ('監査役', 'かんさやく', 'Corporate auditor / inspector', 'ကုမ္ပဏီစာရင်းစစ်အရာရှိ', 'noun', 'heiban', 0),
        ('株主総会', 'かぶぬしそうかい', 'General shareholders meeting', 'ရှယ်ယာရှင်များအထွေထွေညီလာခံ', 'noun', 'nakadaka', 5),
        ('議決権', 'ぎけつけん', 'Voting right at assembly', 'မဲပေးပိုင်ခွင့်အာဏာ', 'noun', 'nakadaka', 3),
        ('委任状', 'いにんじょう', 'Proxy form authorization', 'ကိုယ်စားလှယ်လွှဲအပ်လွှာ', 'noun', 'heiban', 0),
        ('資本提携', 'しほんていけい', 'Capital alliance partnership', 'အရင်းအနှီးမဟာမိတ်ဖွဲ့ခြင်း', 'noun', 'nakadaka', 4),
        ('業務提携', 'ぎょうむていけい', 'Business operational tie-up', 'လုပ်ငန်းပူးပေါင်းဆောင်ရွက်မှု', 'noun', 'nakadaka', 4),
        ('合弁会社', 'ごうべんがいしゃ', 'Joint venture company', 'ဖက်စပ်ကုမ္ပဏီ', 'noun', 'nakadaka', 5),
        ('吸収合併', 'きゅうしゅうがっぺい', 'Merger by absorption', 'ဝါးမျိုပေါင်းစည်းခြင်း', 'noun', 'nakadaka', 5),
        ('新設合併', 'しんせつがっぺい', 'Consolidation merger', 'အသစ်ဖွဲ့စည်းပေါင်းစည်းခြင်း', 'noun', 'nakadaka', 5),
        ('会社分割', 'かいしゃぶんかつ', 'Corporate company split', 'ကုမ္ပဏီခွဲထုတ်ခြင်း', 'noun', 'nakadaka', 4),
        ('事業譲渡', 'じぎょうじょうと', 'Business transfer / asset sale', 'လုပ်ငန်းလွှဲပြောင်းရောင်းချခြင်း', 'noun', 'nakadaka', 4),
        ('株式交換', 'かぶしきこうかん', 'Stock swap share exchange', 'ရှယ်ယာလဲလှယ်ခြင်း', 'noun', 'nakadaka', 5),
        ('自己株式', 'じこかぶしき', 'Treasury stock shares', 'မိမိကုမ္ပဏီရှယ်ယာပြန်ဝယ်ထားမှု', 'noun', 'nakadaka', 4),
        ('内部留保', 'ないぶりゅうほ', 'Internal retained earnings', 'ကုမ္ပဏီတွင်းအမြတ်စုဆောင်းငွေ', 'noun', 'nakadaka', 4),
        ('純資産', 'じゅんしさん', 'Net assets net worth', 'အသားတင်ပိုင်ဆိုင်မှု', 'noun', 'nakadaka', 3),
        ('総資産', 'そうしさん', 'Total gross assets', 'စုစုပေါင်းပိုင်ဆိုင်မှု', 'noun', 'nakadaka', 3),
        ('資金繰り', 'しきんぐり', 'Cash flow management', 'ရန်ပုံငွေလည်ပတ်မှုစီမံခန့်ခွဲခြင်း', 'noun', 'heiban', 0),
        ('借入金', 'かりいれきん', 'Borrowed money debt', 'ချေးယူငွေကြွေးမြီ', 'noun', 'heiban', 0),
        ('転換社債', 'てんかんしゃさい', 'Convertible bond', 'ရှယ်ယာပြောင်းလဲနိုင်သောငွေတိုက်စာချုပ်', 'noun', 'nakadaka', 5),
        ('信用格付け', 'しんようかくづけ', 'Credit rating score', 'ကြွေးမြီယုံကြည်စိတ်ချရမှုအဆင့်', 'noun', 'nakadaka', 5),
        ('為替予約', 'かわせよやく', 'Forward exchange contract', 'ကြိုတင်ငွေလဲလှယ်နှုန်းစာချုပ်', 'noun', 'nakadaka', 4),
        ('機関投資家', 'きかんとうしか', 'Institutional investor', 'အဖွဲ့အစည်းဆိုင်ရာရင်းနှီးမြှုပ်နှံသူ', 'noun', 'nakadaka', 6),
        ('個人投資家', 'こじんとうしか', 'Individual retail investor', 'တစ်ဦးချင်းရင်းနှီးမြှုပ်နှံသူ', 'noun', 'nakadaka', 5),
        ('説明責任', 'せつめいせきにん', 'Accountability', 'ရှင်းလင်းတင်ပြရန်တာဝန်ယူမှု', 'noun', 'nakadaka', 4),
        ('法令遵守', 'ほうれいじゅんしゅ', 'Legal compliance', 'ဥပဒေစည်းမျဉ်းလိုက်နာမှု', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in corporate:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 2. Formal Written Epistolary & Business Mail
    mail_terms = [
        ('拝啓', 'はいけい', 'Dear Sir or Madam (letter opening)', 'လေးစားစွာဖြင့် (စာအဖွင့်နှုတ်ခွန်းဆက်)', 'noun', 'atamadaka', 1),
        ('敬具', 'けいぐ', 'Sincerely yours (letter close)', 'ရိုသေလေးစားစွာဖြင့် (စာအပိတ်နှုတ်ခွန်းဆက်)', 'noun', 'atamadaka', 1),
        ('謹啓', 'きんけい', 'Respectfully opening formal letter', 'အလွန်ရိုသေလေးစားစွာဖြင့်', 'noun', 'atamadaka', 1),
        ('謹白', 'きんぱく', 'Respectfully closing formal letter', 'အလွန်ရိုသေစွာဖြင့်နိဂုံးချုပ်အပ်ပါသည်', 'noun', 'atamadaka', 1),
        ('貴社', 'きしゃ', 'Your esteemed company', 'လူကြီးမင်းတို့၏ကုမ္ပဏီ', 'noun', 'atamadaka', 1),
        ('弊社', 'へいしゃ', 'Our humble company', 'ကျွန်ုပ်တို့၏ကုမ္ပဏီ', 'noun', 'atamadaka', 1),
        ('各位', 'かくい', 'To all concerned / Ladies and gentlemen', 'သက်ဆိုင်သူလူကြီးမင်းများခင်ဗျာ', 'noun', 'atamadaka', 1),
        ('平素', 'へいそ', 'Ordinary daily times / normally', 'သာမန်နေ့စဉ်ကာလများ', 'noun', 'atamadaka', 1),
        ('格別', 'かくべつ', 'Exceptional / extraordinary favor', 'ထူးထူးခြားခြားအထူးဂရုစိုက်မှု', 'adjective', 'heiban', 0),
        ('深謝', 'しんしゃ', 'Deep heartfelt gratitude', 'အထူးပင်ကျေးဇူးတင်ရှိခြင်း', 'noun', 'heiban', 0),
        ('衷心', 'ちゅうしん', 'Innermost heart / bottom of heart', 'နှလုံးသား၏အတွင်းဆုံးမှ', 'noun', 'heiban', 0),
        ('慶賀', 'けいが', 'Congratulation / felicitation', 'ဝမ်းမြောက်ဂုဏ်ယူခြင်း', 'noun', 'atamadaka', 1),
        ('哀悼', 'あいとう', 'Condolence / mourning sorrow', 'ဝမ်းနည်းကြေကွဲခြင်း', 'noun', 'heiban', 0),
        ('清祥', 'せいしょう', 'Health and prosperity (greeting)', 'ကျန်းမာရွှင်လန်းခြင်းရှိပါစေ', 'noun', 'heiban', 0),
        ('健勝', 'けんしょう', 'Good health / robust spirit', 'ကျန်းမာကြံ့ခိုင်မှု', 'noun', 'heiban', 0),
        ('自愛', 'じあい', 'Taking care of one’s health', 'မိမိကိုယ်ကိုဂရုစိုက်ပါရန်', 'noun', 'heiban', 0),
        ('略儀', 'りゃくぎ', 'Informal simplified procedure', 'ရိုးရှင်းသောအကျဉ်းနည်းလမ်း', 'noun', 'heiban', 0),
        ('取り急ぎ', 'とりいそぎ', 'In haste / just a quick note', 'အလျင်အမြန်အသိပေးအပ်ပါသည်', 'adverb', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in mail_terms:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 3. Law, Jurisprudence & Criminal Enforcement
    jurisprudence = [
        ('傍論', 'ぼうろん', 'Obiter dictum judicial comment', 'တရားသူကြီး၏ဘေးထွက်မှတ်ချက်', 'noun', 'heiban', 0),
        ('鑑定人', 'かんていにん', 'Expert witness appraiser', 'ကျွမ်းကျင်သူသက်သေ', 'noun', 'nakadaka', 3),
        ('証拠能力', 'しょうこのうりょく', 'Admissibility of evidence', 'သက်သေအထောက်အထားခိုင်လုံမှုစွမ်းရည်', 'noun', 'nakadaka', 4),
        ('口頭弁論', 'こうとうべんろん', 'Oral legal pleadings in court', 'နှုတ်ဖြင့်လျှောက်လဲချက်ပေးခြင်း', 'noun', 'nakadaka', 4),
        ('破棄差戻し', 'はきさしもどし', 'Quashing verdict and remanding', 'စီရင်ချက်ကိုပယ်ဖျက်၍ပြန်လွှဲပို့ခြင်း', 'noun', 'nakadaka', 4),
        ('確定判決', 'かくていはんけつ', 'Final irrevocable judicial verdict', 'အပြီးသတ်အတည်ဖြစ်သောတရားရုံးစီရင်ချက်', 'noun', 'nakadaka', 4),
        ('略式命令', 'りゃくしきめいれい', 'Summary court order', 'အကျဉ်းရုံးအမိန့်', 'noun', 'nakadaka', 4),
        ('家宅捜索', 'かたくそうさく', 'Domiciliary house search raid', 'နေအိမ်ရှာဖွေစီးနင်းမှု', 'noun', 'nakadaka', 4),
        ('差押え', 'さしおさえ', 'Seizure / attachment of property', 'ပစ္စည်းသိမ်းဆည်းဝရမ်းကပ်ခြင်း', 'noun', 'heiban', 0),
        ('通信傍受', 'つうしんぼうじゅ', 'Wiretapping interception', 'တယ်လီဖုန်းလိုင်းခိုးယူနားထောင်ခြင်း', 'noun', 'nakadaka', 4),
        ('司法取引', 'しほうとりひき', 'Plea bargaining deal', 'ပြစ်ဒဏ်လျော့ပေါ့ရန်အပြန်အလှန်သဘောတူညီချက်', 'noun', 'nakadaka', 4),
        ('禁錮', 'きんこ', 'Imprisonment without hard labor', 'အလုပ်ကြမ်းမပါသောထောင်ဒဏ်', 'noun', 'atamadaka', 1),
        ('追徴', 'ついちょう', 'Additional supplementary collection', 'နောက်ဆက်တွဲဒဏ်ကြေးကောက်ခံခြင်း', 'noun', 'heiban', 0),
        ('鑑別所', 'かんべつしょ', 'Juvenile classification home', 'ဆယ်ကျော်သက်အကျင့်စာရိတ္တစစ်ဆေးရေးစခန်း', 'noun', 'nakadaka', 3),
        ('少年院', 'しょうねんいん', 'Juvenile training school reformatory', 'လူငယ်ပြုပြင်ထိန်းသိမ်းရေးသင်တန်းကျောင်း', 'noun', 'nakadaka', 3),
        ('開示請求', 'かいじせいきゅう', 'Information disclosure request', 'အချက်အလက်ထုတ်ဖော်ခွင့်တောင်းဆိုခြင်း', 'noun', 'nakadaka', 4),
        ('国家賠償', 'こっかばいしょう', 'State redress compensation', 'နိုင်ငံတော်လျော်ကြေးပေးမှု', 'noun', 'heiban', 0),
        ('損失補償', 'そんしつほしょう', 'Loss compensation indemnification', 'နစ်နာကြေးပေးလျော်မှု', 'noun', 'nakadaka', 4),
        ('公用収用', 'こうようしゅうよう', 'Expropriation for public use', 'အများပြည်သူအကျိုးငှာမြေသိမ်းယူခြင်း', 'noun', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in jurisprudence:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 4. Global Economics, Supply Chains & Geopolitics
    geopolitics = [
        ('サプライチェーン', 'サプライチェーン', 'Global supply chain network', 'ကမ္ဘာလုံးဆိုင်ရာကုန်ထုတ်ထောက်ပံ့ရေးကွင်းဆက်', 'noun', 'nakadaka', 5),
        ('バリューチェーン', 'バリューチェーン', 'Value chain network', 'တန်ဖိုးမြှင့်ကွင်းဆက်စနစ်', 'noun', 'nakadaka', 5),
        ('グローバルサウス', 'グローバルサウス', 'Global South emerging states', 'ဖွံ့ဖြိုးဆဲတောင်ဘက်ကမ္ဘာ့နိုင်ငံများ', 'noun', 'nakadaka', 5),
        ('資源確保', 'しげんかくほ', 'Securing natural resources', 'သဘာဝသယံဇာတပိုင်ဆိုင်ခိုင်မာစေခြင်း', 'noun', 'nakadaka', 4),
        ('オフショアリング', 'オフショアリング', 'Offshoring relocation', 'လုပ်ငန်းကိုပြည်ပသို့ရွှေ့ပြောင်းထုတ်လုပ်ခြင်း', 'noun', 'nakadaka', 5),
        ('リショアリング', 'リショアリング', 'Reshoring bringing back home', 'ပြည်တွင်းသို့လုပ်ငန်းပြန်လည်ခေါ်ဆောင်ခြင်း', 'noun', 'nakadaka', 5),
        ('デカップリング', 'デカップリング', 'Decoupling economic separation', 'စီးပွားရေးသီးခြားခွဲထုတ်ခြင်း', 'noun', 'nakadaka', 4),
        ('デリスキング', 'デリスキング', 'De-risking exposure mitigation', 'ဘေးအန္တရာယ်စွန့်စားရမှုလျှော့ချခြင်း', 'noun', 'nakadaka', 3),
        ('経済安全保障', 'けいざいあんぜんほしょう', 'Economic security protection', 'စီးပွားရေးလုံခြုံရေးအာမခံချက်', 'noun', 'nakadaka', 7),
        ('半導体製造', 'はんどうたいせいぞう', 'Semiconductor manufacturing', 'ဆီမီးကွန်ဒပ်တာထုတ်လုပ်မှု', 'noun', 'nakadaka', 5),
        ('レアアース', 'レアアース', 'Rare earth metals', 'ရှားပါးသတ္တုဒြပ်စင်များ', 'noun', 'nakadaka', 3),
        ('リスト規制', 'リストきせい', 'Export control list regulation', 'ပို့ကုန်ကန့်သတ်စာရင်းစည်းမျဉ်း', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in geopolitics:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 5. Advanced Literary & Classical Register
    literary = [
        ('怨念', 'おんねん', 'Grudge / deep malice', 'စွဲလမ်းနာကျည်းသောမုန်းတီးမှု', 'noun', 'atamadaka', 1),
        ('遺恨', 'いこん', 'Lingering grudge / regretful malice', 'နောင်တနှင့်ကျန်ရစ်သောအာဃာတ', 'noun', 'heiban', 0),
        ('慙愧', 'ざんき', 'Shame / poignant regret', 'ရှက်ရွံ့နောင်တရသောစိတ်', 'noun', 'atamadaka', 1),
        ('羞恥', 'しゅうち', 'Shyness / bashfulness / shame', 'အရှက်တရား', 'noun', 'atamadaka', 1),
        ('煩悩', 'ぼんのう', 'Worldly desires / passions of flesh', 'ကိလေသာအပူမီးများ', 'noun', 'heiban', 0),
        ('達見', 'たっけん', 'Farsighted view / wisdom', 'အမြော်အမြင်ကြီးမားသောအသိ', 'noun', 'heiban', 0),
        ('卓説', 'たくせつ', 'Brilliant exposition / eminent view', 'ပြောင်မြောက်သောအယူအဆ', 'noun', 'heiban', 0),
        ('卓抜', 'たくばつ', 'Excellence / preeminence / outstanding', 'အထူးချွန်ဆုံးပြောင်မြောက်သော', 'adjective', 'heiban', 0),
        ('希代', 'きだい', 'Uncommon / rare through ages', 'သမိုင်းတစ်လျှောက်ရှားပါးသော', 'adjective', 'heiban', 0),
        ('稀有', 'けう', 'Extremely rare / marvelous occurrence', 'အလွန်အံ့ဩဖွယ်ရှားပါးသော', 'adjective', 'atamadaka', 1),
        ('篤農家', 'とくのうか', 'Exemplary devoted farmer', 'စံပြကြိုးစားသောတောင်သူကြီး', 'noun', 'heiban', 0),
        ('篤志家', 'とくしか', 'Benevolent person / philanthropist', 'စေတနာရှင်ပရဟိတသမား', 'noun', 'heiban', 0),
        ('篤学', 'とくがく', 'Devotion to learning / scholarship', 'ပညာကိုရိုသေစွာကြိုးပမ်းဆည်းပူးခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in literary:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 6. Advanced Transitive, Intransitive & Phrasal Verbs
    verbs = [
        ('欺瞞', 'ぎまん', 'Deception / trickery / fraud', 'လှည့်ဖြားလိမ်လည်မှု', 'noun', 'heiban', 0),
        ('弄する', 'ろうする', 'To play with / manipulate tactics', 'ပရိယာယ်သုံးကစားသည်', 'verb', 'atamadaka', 1),
        ('騙る', 'かたる', 'To swindle / assume false name', 'လိမ်လည်လှည့်ဖျားသည်', 'verb', 'heiban', 0),
        ('損なう', 'そこなう', 'To harm / damage health', 'ထိခိုက်ပျက်စီးစေသည်', 'verb', 'nakadaka', 3),
        ('廃れる', 'すたれる', 'To decline / fall into disuse', 'ခေတ်ကုန်တိမ်ကောသည်', 'verb', 'heiban', 0),
        ('綻びる', 'ほころびる', 'To rip open / faint smile', 'ချုပ်ရိုးပြေသည် / အပြုံးဆင်သည်', 'verb', 'nakadaka', 4),
        ('労わる', 'いたわる', 'To console / soothe with care', 'ယုယကြင်နာစွာပြုစုသည်', 'verb', 'nakadaka', 3),
        ('宥める', 'なだめる', 'To pacify / soothe irritation', 'ချော့မြှူစိတ်အေးစေသည်', 'verb', 'nakadaka', 3),
        ('紛れる', 'まぎれる', 'To be distracted / lost in crowd', 'အာရုံလွဲသည် / ရောနှောပျောက်ကွယ်သည်', 'verb', 'nakadaka', 3),
        ('途切れる', 'とぎれる', 'To pause / break off', 'ပြတ်တောက်သွားသည်', 'verb', 'nakadaka', 3),
        ('途絶える', 'とだえる', 'To stop completely / cease', 'အဆက်အသွယ်ပြတ်တောက်သည်', 'verb', 'nakadaka', 3),
        ('押し寄せる', 'おしよせる', 'To surge forward in wave', 'လှိုင်းတံပိုးကဲ့သို့အတင်းတိုးဝင်သည်', 'verb', 'nakadaka', 4),
        ('擦れ違う', 'すれちがう', 'To brush past / miss crossing', 'ဘေးချင်းပွတ်ဖြတ်ကျော်သည်', 'verb', 'nakadaka', 4),
        ('行き詰まる', 'いきづまる', 'To hit deadlock / impasse', 'လမ်းဆုံး၍ရှေ့မတိုးနိုင်ဖြစ်သည်', 'verb', 'nakadaka', 4),
        ('行き渡る', 'いきわたる', 'To reach every corner / circulate', 'အနှံ့အပြားသို့ရောက်ရှိသည်', 'verb', 'nakadaka', 4),
        ('巡り会う', 'めぐりあう', 'To reunite after long journey', 'ကြာမြင့်စွာကွဲကွာပြီးမှပြန်တွေ့သည်', 'verb', 'nakadaka', 4),
        ('待ち構える', 'まちかまえる', 'To lie in wait preparedly', 'အသင့်ကြိုတင်စောင့်ဆိုင်းသည်', 'verb', 'nakadaka', 5),
        ('割り当てる', 'わりあてる', 'To apportion / assign share', 'ခွဲဝေတာဝန်ပေးအပ်သည်', 'verb', 'nakadaka', 4),
        ('切り出す', 'きりだす', 'To broach subject / cut timber', 'စကားစတင်ပြောဆိုသည်', 'verb', 'nakadaka', 3),
        ('投げ出す', 'なげだす', 'To throw away / abandon midway', 'ပစ်ချစွန့်လွှတ်လိုက်သည်', 'verb', 'nakadaka', 3),
        ('駆け引き', 'かけひき', 'Bargaining tactic / maneuvering', 'အကွက်ချကစားညှိနှိုင်းမှု', 'noun', 'nakadaka', 3),
        ('手落ち', 'ておち', 'Omission / oversight / blunder', 'ပေါ့ဆမှုချွတ်ယွင်းချက်', 'noun', 'heiban', 0),
        ('手遅れ', 'ておくれ', 'Too late / being belated', 'အချိန်နှောင်းလွန်သွားခြင်း', 'noun', 'nakadaka', 2),
        ('手際', 'てぎわ', 'Skill / performance dexterity', 'လက်စွမ်းလက်စကျွမ်းကျင်မှု', 'noun', 'heiban', 0),
        ('手回し', 'てまわし', 'Preparation / arrangements beforehand', 'ကြိုတင်ပြင်ဆင်စီစဉ်မှု', 'noun', 'heiban', 0),
        ('手探り', 'てさぐり', 'Groping / fumbling in dark', 'စမ်းတဝါးဝါးရှာဖွေခြင်း', 'noun', 'nakadaka', 2),
        ('手加減', 'てかげん', 'Going easy on someone / discretion', 'ညှာတာသက်ညှာပေးခြင်း', 'noun', 'nakadaka', 2),
        ('身の回り', 'みのまわり', 'One’s personal belongings / surroundings', 'ကိုယ်လက်အသုံးအဆောင်များ', 'noun', 'heiban', 0),
        ('身振り', 'みぶり', 'Gesture / body movement', 'ကိုယ်လက်အမူအရာ', 'noun', 'atamadaka', 1),
        ('身元', 'みもと', 'Identity / origin / background', 'မိသားစုနောက်ခံအထောက်အထား', 'noun', 'heiban', 0),
        ('身分', 'みぶん', 'Social status / standing', 'လူမှုအဆင့်အတန်း', 'noun', 'atamadaka', 1),
        ('身の丈', 'みのたけ', 'One’s stature / one’s bounds', 'မိမိအရည်အချင်းအဆင့်အတန်း', 'noun', 'heiban', 0),
        ('気配り', 'きくばり', 'Attentiveness / thoughtfulness', 'အလိုက်တသိဂရုစိုက်မှု', 'noun', 'nakadaka', 2),
        ('気兼ね', 'きがね', 'Hesitation / being ill at ease', 'အားနာဝန်လေးမှု', 'noun', 'heiban', 0),
        ('気立て', 'きだて', 'Disposition / good nature', 'စိတ်သဘောထားကောင်းမွန်မှု', 'noun', 'heiban', 0),
        ('気後れ', 'きおくれ', 'Diffidence / feeling intimidated', 'စိတ်ဓာတ်ကျတွန့်ဆုတ်ခြင်း', 'noun', 'heiban', 0),
        ('気前', 'きまえ', 'Generosity / openhandedness', 'ရက်ရောသောသဘောထား', 'noun', 'heiban', 0),
        ('気品', 'きひん', 'Elegance / grace / dignity', 'တင့်တယ်ဂုဏ်သရေရှိမှု', 'noun', 'heiban', 0),
        ('気迫', 'きはく', 'Spirit / soul force / vigor', 'ခွန်အားပြည့်ဝသောစိတ်ဓာတ်', 'noun', 'heiban', 0),
        ('根回し', 'ねまわし', 'Laying groundwork beforehand', 'ကြိုတင်ညှိနှိုင်းပြင်ဆင်မှု', 'noun', 'heiban', 0),
        ('目処', 'めど', 'Aim / goal / prospect of success', 'မျှော်မှန်းချက်ပန်းတိုင်', 'noun', 'atamadaka', 1),
        ('目論見', 'もくろみ', 'Plan / scheme / intention', 'အကြံအစည်စီမံကိန်း', 'noun', 'heiban', 0),
        ('間際', 'まぎわ', 'On the verge of / critical brink', 'နောက်ဆုံးအချိန်နီးကပ်ချိန်', 'noun', 'heiban', 0),
        ('土壇場', 'どたんば', 'Last minute / eleventh hour', 'နောက်ဆုံးအဆုံးအဖြတ်ကာလ', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in verbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    return items
