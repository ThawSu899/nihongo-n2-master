# -*- coding: utf-8 -*-
"""
JLPT N3 Lexicon Data - 950+ authentic Japanese vocabulary items with Unicode Burmese
"""

def get_n3_words():
    items = []

    # 1. Abstract Nouns & Conceptual Terms
    abstract_nouns = [
        ('概念', 'がいねん', 'Concept / general idea', 'သဘောတရားအယူအဆ', 'noun', 'atamadaka', 1),
        ('本質', 'ほんしつ', 'Essence / true nature', 'ပင်ကိုယ်သဘာဝအနှစ်သာရ', 'noun', 'heiban', 0),
        ('現象', 'げんしょう', 'Phenomenon', 'ဖြစ်စဉ်သဘာဝ', 'noun', 'heiban', 0),
        ('傾向', 'けいこう', 'Tendency / trend', 'ဉာဉ် / လားရာသဘောထား', 'noun', 'heiban', 0),
        ('特徴', 'とくちょう', 'Characteristic / feature', 'ထူးခြားသောဝိသေသလက္ခဏာ', 'noun', 'heiban', 0),
        ('属性', 'ぞくせい', 'Attribute / property', 'ဂုဏ်သတ္တိ / ပင်ကိုယ်လက္ခဏာ', 'noun', 'heiban', 0),
        ('観点', 'かんてん', 'Point of view / perspective', 'ရှုထောင့် / အမြင်', 'noun', 'atamadaka', 1),
        ('視野', 'しや', 'Field of vision / outlook', 'မြင်ကွင်း / အမြင်ကျယ်မှု', 'noun', 'atamadaka', 1),
        ('基準', 'きじゅん', 'Standard / criterion', 'စံနှုန်း / စံသတ်မှတ်ချက်', 'noun', 'atamadaka', 1),
        ('規範', 'きはん', 'Norm / standard', 'စံပြစံနှုန်းစည်းကမ်း', 'noun', 'heiban', 0),
        ('理念', 'りねん', 'Ideal / philosophy', 'အခြေခံသဘောတရားခံယူချက်', 'noun', 'atamadaka', 1),
        ('意義', 'いぎ', 'Significance / meaning', 'အဓိပ္ပာယ်ပြည့်ဝမှု / တန်ဖိုး', 'noun', 'atamadaka', 1),
        ('価値', 'かち', 'Value / worth', 'တန်ဖိုး', 'noun', 'atamadaka', 1),
        ('目的', 'もくてき', 'Purpose / objective', 'ရည်ရွယ်ချက် / ပန်းတိုင်', 'noun', 'heiban', 0),
        ('手段', 'しゅだん', 'Means / measure / way', 'နည်းလမ်း / နည်းဗျူဟာ', 'noun', 'atamadaka', 1),
        ('対象', 'たいしょう', 'Target / subject of action', 'ပစ်မှတ် / ဦးတည်ရာအရာ', 'noun', 'heiban', 0),
        ('範囲', 'はんい', 'Scope / range / boundary', 'အတိုင်းအတာနယ်ပယ်', 'noun', 'atamadaka', 1),
        ('規模', 'きぼ', 'Scale / scope / dimension', 'အတိုင်းအတာပမာဏ', 'noun', 'atamadaka', 1),
        ('程度', 'ていど', 'Degree / grade / extent', 'အတိုင်းအတာ / အဆင့်', 'noun', 'atamadaka', 1),
        ('割合', 'わりあい', 'Rate / ratio / percentage', 'အချိုးအစား / ရာခိုင်နှုန်း', 'noun', 'heiban', 0),
        ('比率', 'ひりつ', 'Ratio / proportion', 'အချိုးကျနှုန်း', 'noun', 'heiban', 0),
        ('確率', 'かくりつ', 'Probability / likelihood', 'ဖြစ်တန်စွမ်း', 'noun', 'heiban', 0),
        ('統計', 'とうけい', 'Statistics', 'စာရင်းအင်းကိန်းဂဏန်း', 'noun', 'heiban', 0),
        ('要因', 'よういん', 'Factor / primary cause', 'အဓိကအကြောင်းရင်း', 'noun', 'heiban', 0),
        ('契機', 'けいき', 'Opportunity / turning point', 'အလှည့်အပြောင်းအခွင့်အရေး', 'noun', 'atamadaka', 1),
        ('動機', 'どうき', 'Motive / incentive', 'လှုံ့ဆော်မှုအကြောင်းရင်း', 'noun', 'atamadaka', 1),
        ('背景', 'はいけい', 'Background / context', 'နောက်ခံအကြောင်းတရား', 'noun', 'heiban', 0),
        ('根拠', 'こんきょ', 'Basis / foundation / evidence', 'အခြေအမြစ်အထောက်အထား', 'noun', 'atamadaka', 1),
        ('仮説', 'かせつ', 'Hypothesis', 'ယူဆချက် / ယာယီအဆို', 'noun', 'heiban', 0),
        ('結論', 'けつろん', 'Conclusion', 'နိဂုံးချုပ်ကောက်ချက်', 'noun', 'heiban', 0),
        ('命題', 'めいだい', 'Proposition / thesis', 'အဆိုပြုချက် / ပြဿနာအကြောင်းအရာ', 'noun', 'heiban', 0),
        ('論理', 'ろんり', 'Logic / reasoning', 'ယုတ္တိဗေဒ', 'noun', 'atamadaka', 1),
        ('体系', 'たいけい', 'System / organization', 'စနစ်ကျသောဖွဲ့စည်းမှု', 'noun', 'heiban', 0),
        ('構造', 'こうぞう', 'Structure / construction', 'တည်ဆောက်ပုံဖွဲ့စည်းပုံ', 'noun', 'heiban', 0),
        ('組織', 'そしき', 'Organization / structure', 'အဖွဲ့အစည်း', 'noun', 'atamadaka', 1),
        ('機能', 'きのう', 'Function / feature', 'လုပ်ဆောင်ချက်စွမ်းရည်', 'noun', 'atamadaka', 1),
        ('作用', 'さよう', 'Action / effect / operation', 'အကျိုးသက်ရောက်မှု / လုပ်ဆောင်ချက်', 'noun', 'atamadaka', 1),
        ('影響', 'えいきょう', 'Influence / impact', 'လွှမ်းမိုးသက်ရောက်မှု', 'noun', 'heiban', 0),
        ('効果', 'こうか', 'Effect / efficacy', 'ထိရောက်သောအကျိုးရလဒ်', 'noun', 'atamadaka', 1),
        ('成果', 'せいか', 'Result / outcome / fruit', 'အောင်မြင်သောအသီးအပွင့်', 'noun', 'atamadaka', 1),
        ('弊害', 'へいがい', 'Adverse effect / harmful influence', 'ဆိုးကျိုးအန္တရာယ်', 'noun', 'heiban', 0),
        ('障害', 'しょうがい', 'Obstacle / impediment', 'အတားအဆီး / အခက်အခဲ', 'noun', 'heiban', 0),
        ('矛盾', 'むじゅん', 'Contradiction / inconsistency', 'ဆန့်ကျင်ကွဲလွဲမှု', 'noun', 'heiban', 0),
        ('調和', 'ちょうわ', 'Harmony / accord', 'သဟဇာတဖြစ်မှု', 'noun', 'heiban', 0),
        ('均衡', 'きんこう', 'Equilibrium / balance', 'ဟန်ချက်ညီမျှမှု', 'noun', 'heiban', 0),
        ('限界', 'げんかい', 'Limit / boundary', 'အကန့်အသတ်အဆုံးအစ', 'noun', 'heiban', 0),
        ('可能性', 'かのうせい', 'Possibility / potential', 'ဖြစ်နိုင်ခြေစွမ်းရည်', 'noun', 'heiban', 0),
        ('妥当', 'だとう', 'Proper / appropriate / valid', 'သင့်လျော်လျောက်ပတ်သော', 'adjective', 'heiban', 0),
        ('必然', 'ひつぜん', 'Inevitable / necessity', 'မလွဲမသွေဖြစ်ရမည့်အရာ', 'noun', 'heiban', 0),
        ('偶然', 'ぐうぜん', 'Coincidence / accidental', 'တိုက်ဆိုင်မှု / မတော်တဆ', 'noun', 'heiban', 0),
        ('普遍', 'ふへん', 'Universal / omnipresent', 'တစ်လောကလုံးနှင့်ဆိုင်သော', 'noun', 'heiban', 0),
        ('特殊', 'とくしゅ', 'Special / peculiar', 'ထူးခြားထူးဆန်းသော', 'adjective', 'heiban', 0),
        ('独自', 'どくじ', 'Unique / original', 'ကိုယ်ပိုင်သီးသန့်ဖြစ်သော', 'adjective', 'atamadaka', 1),
        ('共通', 'きょうつう', 'Common / shared', 'ဘုံတူညီသော', 'noun', 'heiban', 0),
        ('形式', 'けいしき', 'Format / formality / style', 'ပုံစံသတ်မှတ်ချက်', 'noun', 'heiban', 0),
        ('内容', 'ないよう', 'Content / substance', 'ပါဝင်သောအကြောင်းအရာ', 'noun', 'heiban', 0),
        ('状態', 'じょうたい', 'State / condition', 'အခြေအနေ / အနေအထား', 'noun', 'heiban', 0),
        ('経過', 'けいか', 'Progress / lapse of time', 'ဖြစ်စဉ်အဆင့်ဆင့် / အချိန်ကုန်လွန်မှု', 'noun', 'heiban', 0),
        ('過程', 'かてい', 'Process / course', 'လုပ်ငန်းစဉ်', 'noun', 'heiban', 0),
        ('段階', 'だんかい', 'Stage / phase / step', 'အဆင့် / အဆင့်ဆင့်', 'noun', 'heiban', 0),
        ('局面', 'きょくめん', 'Aspect of an affair / phase', 'အခြေအနေအခင်းအကျင်း', 'noun', 'heiban', 0),
        ('事態', 'じたい', 'Situation / state of affairs', 'အရေးပေါ်အခြေအနေ', 'noun', 'atamadaka', 1),
        ('情勢', 'じょうせい', 'State of affairs / conditions', 'နိုင်ငံရေးစီးပွားရေးအခင်းအကျင်း', 'noun', 'heiban', 0),
        ('動向', 'どうこう', 'Trend / movement', 'လားရာလှုပ်ရှားမှု', 'noun', 'heiban', 0),
        ('展望', 'てんぼう', 'Outlook / prospect', 'ရှေ့အလားအလာမျှော်မှန်းချက်', 'noun', 'heiban', 0),
        ('見通し', 'みとおし', 'Prospect / forecast', 'အနာဂတ်ခန့်မှန်းချက်', 'noun', 'heiban', 0),
        ('予測', 'よそく', 'Prediction / estimation', 'ကြိုတင်ခန့်မှန်းချက်', 'noun', 'heiban', 0),
        ('認識', 'にんしき', 'Recognition / awareness', 'သိမြင်နားလည်မှု', 'noun', 'heiban', 0),
        ('自覚', 'じかく', 'Self-awareness / consciousness', 'မိမိကိုယ်ကိုသတိပြုမိခြင်း', 'noun', 'heiban', 0),
        ('直感', 'ちょっかん', 'Intuition / instinct', 'ပင်ကိုယ်အသိစိတ် / ထိုးထွင်းသိဉာဏ်', 'noun', 'heiban', 0),
        ('推測', 'すいそく', 'Conjecture / guess', 'ခန့်မှန်းတွက်ချက်မှု', 'noun', 'heiban', 0),
        ('洞察', 'どうさつ', 'Insight / discernment', 'ထိုးထွင်းသိမြင်မှု', 'noun', 'heiban', 0),
        ('思考', 'しこう', 'Thinking / thought process', 'အတွေးအခေါ်ဆင်ခြင်တုံတရား', 'noun', 'heiban', 0),
        ('判断', 'はんだん', 'Judgment / decision', 'ဆုံးဖြတ်ချက် / အကဲဖြတ်မှု', 'noun', 'atamadaka', 1),
        ('決断', 'けつだん', 'Firm decision / determination', 'ပြတ်သားသောဆုံးဖြတ်ချက်', 'noun', 'heiban', 0),
        ('覚悟', 'かくご', 'Readiness / prepared mind', 'စိတ်ပိုင်းဖြတ်ထားမှု / အသင့်ပြင်ဆင်ထားမှု', 'noun', 'nakadaka', 2),
        ('意思', 'いし', 'Intention / wish / mind', 'ဆန္ဒသဘောထား', 'noun', 'atamadaka', 1),
        ('意志', 'いし', 'Will / determination', 'ဇွဲလုံ့လစိတ်ဓာတ်', 'noun', 'atamadaka', 1),
        ('意図', 'いと', 'Intention / aim', 'ရည်ရွယ်ချက်', 'noun', 'atamadaka', 1),
        ('意欲', 'いよく', 'Will / ambition / desire', 'ထက်သန်သောစိတ်ဆန္ဒ', 'noun', 'atamadaka', 1),
        ('志望', 'しぼう', 'Wish / desire / ambition', 'ရည်မှန်းချက် / လိုလားချက်', 'noun', 'heiban', 0),
        ('願望', 'がんぼう', 'Desire / wish / aspiration', 'တောင့်တမှုဆန္ဒ', 'noun', 'heiban', 0),
        ('理想', 'りそう', 'Ideal', 'စံပြစံနမူနာ', 'noun', 'heiban', 0),
        ('現実', 'げんじつ', 'Reality / actuality', 'လက်တွေ့အရှိတရား', 'noun', 'heiban', 0),
        ('偏見', 'へんけん', 'Prejudice / bias', 'ဘက်လိုက်မှု / အစွဲအလမ်း', 'noun', 'heiban', 0),
        ('先入観', 'せんにゅうかん', 'Preconception / bias', 'ကြိုတင်ယူဆထားသောအစွဲ', 'noun', 'nakadaka', 3),
        ('常識', 'じょうしき', 'Common sense', 'အများလက်ခံသောအသိတရား', 'noun', 'heiban', 0),
        ('教養', 'きょうよう', 'Cultivation / culture / education', 'ယဉ်ကျေးသောအသိပညာ', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in abstract_nouns:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 2. Interpersonal Dynamics, Emotions & Psychology
    psychology = [
        ('緊張', 'きんちょう', 'Tension / nervousness', 'စိတ်လှုပ်ရှားရင်ခုန်ခြင်း', 'noun', 'heiban', 0),
        ('不安', 'ふあん', 'Anxiety / unease', 'မလုံခြုံစိတ်ပူခြင်း', 'adjective', 'heiban', 0),
        ('満足', 'まんぞく', 'Satisfaction / contentment', 'ကျေနပ်အားရခြင်း', 'noun', 'atamadaka', 1),
        ('後悔', 'こうかい', 'Regret / remorse', 'နောင်တရခြင်း', 'noun', 'heiban', 0),
        ('感謝', 'かんしゃ', 'Gratitude / appreciation', 'ကျေးဇူးတင်ခြင်း', 'noun', 'atamadaka', 1),
        ('感動', 'かんどう', 'Deep emotion / being touched', 'စိတ်ထိခိုက်ကြည်နူးခြင်း', 'noun', 'heiban', 0),
        ('尊敬', 'そんけい', 'Respect / esteem', 'လေးစားကြည်ညိုခြင်း', 'noun', 'heiban', 0),
        ('期待', 'きたい', 'Expectation / anticipation', 'မျှော်လင့်ချက်ထားရှိခြင်း', 'noun', 'heiban', 0),
        ('失望', 'しつぼう', 'Disappointment / despair', 'စိတ်ပျက်လက်လျှော့ခြင်း', 'noun', 'heiban', 0),
        ('信頼', 'しんらい', 'Reliance / trust', 'ယုံကြည်အားကိုးမှု', 'noun', 'heiban', 0),
        ('信用', 'しんよう', 'Confidence / credit', 'ဂုဏ်သတင်းယုံကြည်စိတ်ချရမှု', 'noun', 'heiban', 0),
        ('疑惑', 'ぎわく', 'Suspicion / doubt', 'သံသယမသင်္ကာမှု', 'noun', 'heiban', 0),
        ('不信', 'ふしん', 'Distrust / skepticism', 'မယုံကြည်မှု', 'noun', 'heiban', 0),
        ('葛藤', 'かっとう', 'Conflict / discord / dilemma', 'စိတ်တွင်းပဋိပက္ခ', 'noun', 'heiban', 0),
        ('摩擦', 'まさつ', 'Friction / strife', 'ပွတ်တိုက်မှု / သဘောထားကွဲလွဲမှု', 'noun', 'heiban', 0),
        ('協調', 'きょうちょう', 'Cooperation / harmony', 'ညီညွတ်စွာပူးပေါင်းဆောင်ရွက်မှု', 'noun', 'heiban', 0),
        ('妥協', 'だきょう', 'Compromise / concession', 'အလျှော့ပေးစေ့စပ်ခြင်း', 'noun', 'heiban', 0),
        ('譲歩', 'じょうほ', 'Concession / surrender', 'အလျှော့ပေးလိုက်လျောမှု', 'noun', 'atamadaka', 1),
        ('孤立', 'こりつ', 'Isolation / being solitary', 'အထီးကျန်တစ်ကိုယ်တည်းဖြစ်ခြင်း', 'noun', 'heiban', 0),
        ('親密', 'しんみつ', 'Intimate / close', 'ရင်းနှီးကျွမ်းဝင်သော', 'adjective', 'heiban', 0),
        ('疎遠', 'そえん', 'Distant / estranged', 'စိမ်းကားဝေးကွာသော', 'adjective', 'heiban', 0),
        ('羨望', 'せんぼう', 'Envy / admiration', 'အားကျငေးမောခြင်း', 'noun', 'heiban', 0),
        ('嫉妬', 'しっと', 'Jealousy / grudge', 'မနာလိုဝန်တိုခြင်း', 'noun', 'atamadaka', 1),
        ('憧れ', 'あこがれ', 'Yearning / longing', 'စိတ်ကူးယဉ်မျှော်လင့်ချက်', 'noun', 'heiban', 0),
        ('執着', 'しゅうちゃく', 'Attachment / obsession', 'တွယ်တာစွဲလမ်းခြင်း', 'noun', 'heiban', 0),
        ('愛着', 'あいちゃく', 'Attachment / affectionate feeling', 'ချစ်ခင်တွယ်တာမှု', 'noun', 'heiban', 0),
        ('焦燥', 'しょうそう', 'Impatience / irritability', 'စိတ်မရှည်ဒေါသထွက်မှု', 'noun', 'heiban', 0),
        ('憤り', 'いきどおり', 'Resentment / indignation', 'မကျေနပ်ဒေါသထွက်ခြင်း', 'noun', 'heiban', 0),
        ('同情', 'どうじょう', 'Sympathy / compassion', 'စာနာထောက်ထားခြင်း', 'noun', 'heiban', 0),
        ('共感', 'きょうかん', 'Empathy / sympathy', 'ခံစားချက်ချင်းထပ်တူကျခြင်း', 'noun', 'heiban', 0),
        ('好感', 'こうかん', 'Good feeling / favorable impression', 'သဘောကျနှစ်သက်စိတ်', 'noun', 'heiban', 0),
        ('違和感', 'いわかん', 'Sense of incongruity', 'ကွဲလွဲနေသလိုခံစားရမှု', 'noun', 'nakadaka', 2),
        ('劣等感', 'れっとうかん', 'Inferiority complex', 'နိမ့်ကျသည်ဟူသောစိတ်', 'noun', 'nakadaka', 3),
        ('優越感', 'ゆうえつかん', 'Superiority complex', 'သာလွန်သည်ဟူသောစိတ်', 'noun', 'nakadaka', 3),
        ('罪悪感', 'ざいあくかん', 'Guilt feelings', 'အပြစ်ရှိသည်ဟူသောခံစားချက်', 'noun', 'nakadaka', 3),
        ('誇り', 'ほこり', 'Pride / boast', 'ဂုဏ်ယူဝင့်ကြွားမှု', 'noun', 'heiban', 0),
        ('自尊心', 'じそんしん', 'Self-esteem / self-respect', 'မိမိကိုယ်ကိုလေးစားသောစိတ်', 'noun', 'nakadaka', 2),
        ('自信', 'じしん', 'Confidence / belief in oneself', 'မိမိကိုယ်ကိုယုံကြည်မှု', 'noun', 'heiban', 0),
        ('過信', 'かしん', 'Overconfidence', 'ကိုယ့်ကိုယ်ကိုအထင်ကြီးလွန်းခြင်း', 'noun', 'heiban', 0),
        ('傲慢', 'ごうまん', 'Arrogant / haughty', 'မောက်မာဝင့်ဝါသော', 'adjective', 'heiban', 0),
        ('忍耐', 'にんたい', 'Patience / perseverance', 'သည်းခံဇွဲရှိမှု', 'noun', 'atamadaka', 1),
        ('辛抱', 'しんぼう', 'Endurance / patience', 'ကြိတ်မှိတ်သည်းခံခြင်း', 'noun', 'atamadaka', 1),
        ('苦難', 'くなん', 'Hardship / suffering', 'ဆင်းရဲဒုက္ခအခက်အခဲ', 'noun', 'atamadaka', 1),
        ('試練', 'しれん', 'Ordeal / trial', 'ဘဝ၏စမ်းသပ်မှု', 'noun', 'atamadaka', 1),
        ('克服', 'こくふく', 'Overcoming / conquest', 'အောင်မြင်စွာကျော်လွှားခြင်း', 'noun', 'heiban', 0),
        ('挫折', 'ざせつ', 'Setback / breakdown', 'အရှုံးပေးလက်လျှော့ရခြင်း', 'noun', 'heiban', 0),
        ('落胆', 'らくたん', 'Disheartenment / discouragement', 'စိတ်ပျက်အားလျော့ခြင်း', 'noun', 'heiban', 0),
        ('歓喜', 'かんき', 'Great joy / delight', 'အလွန်ဝမ်းမြောက်ပျော်ရွှင်ခြင်း', 'noun', 'atamadaka', 1),
        ('冷静', 'れいせい', 'Calm / composed / cool', 'တည်ငြိမ်အေးဆေးသော', 'adjective', 'heiban', 0),
        ('動揺', 'どうよう', 'Shaken / unrest / turmoil', 'စိတ်လှုပ်ရှားတုန်လှုပ်ခြင်း', 'noun', 'heiban', 0),
        ('唖然', 'あぜん', 'Dumbfounded / in silent shock', 'ကြောင်အမ်းအမ်းဖြစ်သွားခြင်း', 'adjective', 'heiban', 0),
        ('称賛', 'しょうさん', 'Praise / admiration', 'ချီးကျူးဩဘာပေးခြင်း', 'noun', 'heiban', 0),
        ('批判', 'ひはん', 'Criticism / judgment', 'ဝေဖန်သုံးသပ်ခြင်း', 'noun', 'heiban', 0),
        ('非難', 'ひなん', 'Blame / accusation', 'အပြစ်တင်ရှုတ်ချခြင်း', 'noun', 'atamadaka', 1),
        ('叱責', 'しっせき', 'Reprimand / scolding', 'ပြင်းထန်စွာဆူပူကြိမ်းမောင်းခြင်း', 'noun', 'heiban', 0),
        ('激励', 'げきれい', 'Encouragement / cheering on', 'စိတ်ဓာတ်ခွန်အားပေးခြင်း', 'noun', 'heiban', 0),
        ('応援', 'おうえん', 'Support / cheer', 'အားပေးကူညီခြင်း', 'noun', 'heiban', 0),
        ('救済', 'きゅうさい', 'Relief / salvation', 'ကယ်ဆယ်ကူညီထောက်ပံ့ခြင်း', 'noun', 'heiban', 0),
        ('謝罪', 'しゃざい', 'Apology', 'တောင်းပန်ဝန်ချခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in psychology:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 3. Office, Business & Career
    business = [
        ('企画', 'きかく', 'Planning / project proposal', 'စီမံကိန်းရေးဆွဲခြင်း', 'noun', 'heiban', 0),
        ('立案', 'りつあん', 'Drafting a plan', 'အကြံအစည်မူကြမ်းရေးဆွဲခြင်း', 'noun', 'heiban', 0),
        ('提案', 'ていあん', 'Proposal / suggestion', 'အကြံပြုတင်ပြချက်', 'noun', 'heiban', 0),
        ('協議', 'きょうぎ', 'Deliberation / consultation', 'ညှိနှိုင်းတိုင်ပင်ဆွေးနွေးခြင်း', 'noun', 'atamadaka', 1),
        ('交渉', 'こうしょう', 'Negotiation / bargaining', 'စေ့စပ်ညှိနှိုင်းခြင်း', 'noun', 'heiban', 0),
        ('承認', 'しょうにん', 'Approval / authorization', 'အတည်ပြုခွင့်ပြုချက်ပေးခြင်း', 'noun', 'heiban', 0),
        ('委託', 'いたく', 'Consignment / delegation', 'လွှဲအပ်တာဝန်ပေးခြင်း', 'noun', 'heiban', 0),
        ('請負', 'うけおい', 'Contracting / undertaking work', 'ကန်ထရိုက်တာဝန်ယူခြင်း', 'noun', 'heiban', 0),
        ('履行', 'りこう', 'Fulfillment / performance of duty', 'တာဝန်ဝတ္တရားကျေပွန်စွာဆောင်ရွက်ခြင်း', 'noun', 'heiban', 0),
        ('損害', 'そんがい', 'Damage / loss', 'ပျက်စီးဆုံးရှုံးမှု', 'noun', 'heiban', 0),
        ('賠償', 'ばいしょう', 'Compensation / reparations', 'လျော်ကြေးပေးလျော်ခြင်း', 'noun', 'heiban', 0),
        ('請求書', 'せいきゅうしょ', 'Invoice / bill of claim', 'တောင်းခံလွှာ', 'noun', 'nakadaka', 4),
        ('見積書', 'みつもりしょ', 'Cost quotation / estimate', 'ကုန်ကျစရိတ်ခန့်မှန်းလွှာ', 'noun', 'nakadaka', 4),
        ('仕様書', 'しようしょ', 'Specification document', 'စံသတ်မှတ်ချက်စာရွက်စာတမ်း', 'noun', 'heiban', 0),
        ('企画書', 'きかくしょ', 'Project proposal document', 'စီမံကိန်းအဆိုပြုလွှာ', 'noun', 'heiban', 0),
        ('報告書', 'ほうこくしょ', 'Written report', 'အစီရင်ခံစာ', 'noun', 'nakadaka', 4),
        ('議事録', 'ぎじろく', 'Minutes of meeting', 'အစည်းအဝေးမှတ်တမ်း', 'noun', 'nakadaka', 2),
        ('配属', 'はいぞく', 'Assignment / posting', 'ဌာနခွဲတာဝန်ခွဲဝေချထားခြင်း', 'noun', 'heiban', 0),
        ('異動', 'いどう', 'Transfer / personnel shift', 'ရာထူးနေရာရွှေ့ပြောင်းခြင်း', 'noun', 'heiban', 0),
        ('転勤', 'てんきん', 'Job relocation to other city', 'အခြားမြို့သို့အလုပ်ပြောင်းရွှေ့ခြင်း', 'noun', 'heiban', 0),
        ('昇進', 'しょうしん', 'Promotion in rank', 'ရာထူးတိုးမြှင့်ခြင်း', 'noun', 'heiban', 0),
        ('退職', 'たいしょく', 'Retirement / resignation', 'အလုပ်မှနုတ်ထွက်ခြင်း', 'noun', 'heiban', 0),
        ('解雇', 'かいこ', 'Dismissal / discharge', 'အလုပ်မှထုတ်ပယ်ခြင်း', 'noun', 'atamadaka', 1),
        ('定年', 'ていねん', 'Retirement age', 'ပင်စင်အငြိမ်းစားယူသည့်အသက်', 'noun', 'heiban', 0),
        ('年金', 'ねんきん', 'Pension / annuity', 'ပင်စင်လစာ', 'noun', 'heiban', 0),
        ('手当', 'てあて', 'Allowance / compensation benefit', 'အပိုထောက်ပံ့ကြေး', 'noun', 'atamadaka', 1),
        ('賞与', 'しょうよ', 'Bonus payment', 'အပိုဆုကြေး / ဘောနပ်စ်', 'noun', 'atamadaka', 1),
        ('有給休暇', 'ゆうきゅうきゅうか', 'Paid annual leave', 'လစာပြည့်နှစ်စဉ်ခွင့်', 'noun', 'nakadaka', 5),
        ('労働組合', 'ろうどうくみあい', 'Labor union', 'အလုပ်သမားသမဂ္ဂ', 'noun', 'nakadaka', 4),
        ('派遣社員', 'はけんしゃいん', 'Temporary dispatched worker', 'ကန်ထရိုက်စေလွှတ်ဝန်ထမ်း', 'noun', 'nakadaka', 4),
        ('契約社員', 'けいやくしゃいん', 'Contract-based employee', 'စာချုပ်ချုပ်ဝန်ထမ်း', 'noun', 'nakadaka', 4),
        ('正社員', 'せいしゃいん', 'Regular full-time employee', 'အမြဲတမ်းဝန်ထမ်း', 'noun', 'nakadaka', 3),
        ('役員', 'やくいん', 'Executive board member', 'ဒါရိုက်တာအဖွဲ့ဝင်အရာရှိ', 'noun', 'atamadaka', 1),
        ('取締役', 'とりしまりやく', 'Director of board', 'ကုမ္ပဏီဒါရိုက်တာ', 'noun', 'nakadaka', 5),
        ('顧問', 'こもん', 'Advisor / consultant', 'အကြံပေးပုဂ္ဂိုလ်', 'noun', 'atamadaka', 1),
    ]
    for ja, kana, en, my, pos, pp, d in business:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 4. Academic, Science & Research
    academic = [
        ('学術', 'がくじゅつ', 'Science / learning / academic', 'ပညာရပ်ဆိုင်ရာ', 'noun', 'heiban', 0),
        ('論文', 'ろんぶん', 'Thesis / research paper', 'ကျမ်းစာတမ်း', 'noun', 'heiban', 0),
        ('学会', 'がっかい', 'Academic society conference', 'ပညာရှင်များညီလာခံ', 'noun', 'heiban', 0),
        ('引用', 'いんよう', 'Quotation / citation', 'ကိုးကားဖော်ပြချက်', 'noun', 'heiban', 0),
        ('参考文献', 'さんこうぶんけん', 'Reference literature', 'ကိုးကားကျမ်းစာရင်း', 'noun', 'nakadaka', 5),
        ('観察', 'かんさつ', 'Observation / survey', 'စောင့်ကြည့်လေ့လာမှု', 'noun', 'heiban', 0),
        ('検証', 'けんしょう', 'Verification / inspection', 'မှန်ကန်မှုစစ်ဆေးအတည်ပြုခြင်း', 'noun', 'heiban', 0),
        ('分析', 'ぶんせき', 'Analysis', 'ခွဲခြမ်းစိတ်ဖြာဆန်းစစ်မှု', 'noun', 'heiban', 0),
        ('総合', 'そうごう', 'Synthesis / integration', 'ဘက်စုံပေါင်းစပ်ဖွဲ့စည်းမှု', 'noun', 'heiban', 0),
        ('標本', 'ひょうほん', 'Sample / specimen', 'နမူနာပစ္စည်း', 'noun', 'heiban', 0),
        ('母集団', 'ぼしゅうだん', 'Statistical population', 'အခြေခံလူဦးရေအုပ်စု', 'noun', 'nakadaka', 2),
        ('誤差', 'ごさ', 'Error / margin of error', 'အမှားအယွင်းကွာဟချက်', 'noun', 'atamadaka', 1),
        ('相関', 'そうかん', 'Correlation / mutual relation', 'အပြန်အလှန်ဆက်စပ်မှု', 'noun', 'heiban', 0),
        ('因果関係', 'いんがかんけい', 'Causal relationship', 'အကြောင်းနှင့်အကျိုးဆက်စပ်မှု', 'noun', 'nakadaka', 4),
        ('変数', 'へんすう', 'Variable parameter', 'ပြောင်းလဲနိုင်သောကိန်း', 'noun', 'heiban', 0),
        ('図表', 'ずひょう', 'Chart / diagram / figure', 'ပုံကြမ်းနှင့်ဇယား', 'noun', 'heiban', 0),
        ('測定', 'そくてい', 'Measurement / calibration', 'တိုင်းတာစစ်ဆေးမှု', 'noun', 'heiban', 0),
        ('観測', 'かんそく', 'Observation / meteorological reading', 'မိုးလေဝသတိုင်းတာမှု', 'noun', 'heiban', 0),
        ('解明', 'かいめい', 'Elucidation / unraveling', 'ရှင်းလင်းဖော်ထုတ်ခြင်း', 'noun', 'heiban', 0),
        ('特許', 'とっきょ', 'Patent grant', 'မူပိုင်ခွင့်လိုင်စင်', 'noun', 'atamadaka', 1),
        ('著作権', 'ちょさくけん', 'Copyright ownership', 'စာပေမူပိုင်ခွင့်', 'noun', 'nakadaka', 3),
        ('博士号', 'はかせごう', 'Doctoral degree / PhD', 'ပါရဂူဘွဲ့', 'noun', 'nakadaka', 3),
        ('修士号', 'しゅうしごう', 'Master degree', 'မဟာဘွဲ့', 'noun', 'nakadaka', 3),
        ('学士号', 'がくしごう', 'Bachelor degree', 'ဘွဲ့ဒီဂရီ', 'noun', 'nakadaka', 3),
        ('共同研究', 'きょうどうけんきゅう', 'Joint collaborative research', 'ပူးတွဲသုတေသန', 'noun', 'nakadaka', 5),
        ('基礎研究', 'きそけんきゅう', 'Basic fundamental research', 'အခြေခံသုတေသန', 'noun', 'nakadaka', 4),
        ('応用研究', 'おうようけんきゅう', 'Applied research', 'လက်တွေ့အသုံးချသုတေသန', 'noun', 'nakadaka', 5),
        ('自然科学', 'しぜんかがく', 'Natural science', 'သဘာဝသိပ္ပံပညာ', 'noun', 'nakadaka', 4),
        ('社会科学', 'しゃかいかがく', 'Social science', 'လူမှုသိပ္ပံပညာ', 'noun', 'nakadaka', 4),
        ('カリキュラム', 'カリキュラム', 'Curriculum syllabus', 'သင်ရိုးညွှန်းတမ်း', 'noun', 'nakadaka', 4),
        ('シラバス', 'シラバス', 'Course syllabus', 'ဘာသာရပ်အသေးစိတ်သင်ရိုး', 'noun', 'atamadaka', 1),
        ('単位認定', 'たんいにんてい', 'Credit recognition', 'ယူနစ်အသိအမှတ်ပြုခြင်း', 'noun', 'nakadaka', 4),
        ('必修科目', 'ひっしゅうかもく', 'Compulsory subject', 'မသင်မနေရဘာသာရပ်', 'noun', 'nakadaka', 4),
        ('選択科目', 'せんたくかもく', 'Elective optional course', 'ရွေးချယ်သင်ယူရမည့်ဘာသာရပ်', 'noun', 'nakadaka', 4),
        ('教授', 'きょうじゅ', 'University professor', 'ပါမောက္ခ', 'noun', 'atamadaka', 1),
        ('准教授', 'じゅんきょうじゅ', 'Associate professor', 'တွဲဖက်ပါမောက္ခ', 'noun', 'nakadaka', 3),
        ('学長', 'がくちょう', 'University president', 'တက္ကသိုလ်ကျောင်းအုပ်ကြီး', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in academic:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 5. Media, Journalism & Information
    media = [
        ('報道', 'ほうどう', 'News reporting / media broadcast', 'သတင်းမီဒီယာထုတ်လွှင့်ချက်', 'noun', 'heiban', 0),
        ('取材', 'しゅざい', 'Covering news / data collection', 'သတင်းရယူစုဆောင်းခြင်း', 'noun', 'heiban', 0),
        ('記事', 'きじ', 'News article / write-up', 'သတင်းဆောင်းပါး', 'noun', 'atamadaka', 1),
        ('見出し', 'みだし', 'Headline / title header', 'သတင်းခေါင်းကြီးပိုင်း', 'noun', 'heiban', 0),
        ('特集', 'とくしゅう', 'Special feature edition', 'အထူးထုတ်အစီအစဉ်', 'noun', 'heiban', 0),
        ('コラム', 'コラム', 'Column article', 'ကော်လံဆောင်းပါး', 'noun', 'atamadaka', 1),
        ('社説', 'しゃせつ', 'Editorial opinion', 'အယ်ဒီတာ့အာဘော်', 'noun', 'heiban', 0),
        ('編集長', 'へんしゅうちょう', 'Editor-in-chief', 'အယ်ဒီတာချုပ်', 'noun', 'nakadaka', 4),
        ('出版', 'しゅっぱん', 'Publishing / publication', 'စာအုပ်စာစောင်ထုတ်ဝေခြင်း', 'noun', 'heiban', 0),
        ('購読', 'こうどく', 'Subscription reading', 'သတင်းစာပုံမှန်ဖတ်ရှုခြင်း', 'noun', 'heiban', 0),
        ('広告', 'こうこく', 'Advertisement / commercial', 'ကြော်ငြာ', 'noun', 'heiban', 0),
        ('宣伝', 'せんでん', 'Propaganda / publicity', 'လူသိရှင်ကြားဝါဒဖြန့်ခြင်း', 'noun', 'heiban', 0),
        ('広報', 'こうほう', 'Public relations / PR', 'ပြန်ကြားရေးဌာန', 'noun', 'heiban', 0),
        ('速報', 'そくほう', 'Breaking news bulletin', 'သတင်းအမြန်', 'noun', 'heiban', 0),
        ('号外', 'ごうがい', 'Extra newspaper edition', 'အထူးသတင်းစာထုတ်ဝေမှု', 'noun', 'heiban', 0),
        ('世論', 'よろん', 'Public opinion', 'လူထုသဘောထားဆန္ဒ', 'noun', 'atamadaka', 1),
        ('支持率', 'しじりつ', 'Approval rating percentage', 'ထောက်ခံမှုနှုန်းထား', 'noun', 'nakadaka', 2),
        ('拡散', 'かくさん', 'Diffusion / viral spreading', 'ပျံ့နှံ့ပြန့်ပွားခြင်း', 'noun', 'heiban', 0),
        ('情報漏洩', 'じょうほうろうえい', 'Data leakage / leak', 'လျှို့ဝှက်အချက်အလက်ပေါက်ကြားမှု', 'noun', 'nakadaka', 5),
        ('暗号化', 'あんごうか', 'Encryption', 'စကားဝှက်ဖြင့်ကုဒ်ပြောင်းလဲခြင်း', 'noun', 'heiban', 0),
        ('生放送', 'なまほうそう', 'Live broadcast', 'တိုက်ရိုက်ထုတ်လွှင့်မှု', 'noun', 'nakadaka', 3),
        ('視聴率', 'しちょうりつ', 'Viewership audience rating', 'ကြည့်ရှုသူပရိသတ်နှုန်း', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in media:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 6. Society, Economy & Finance
    economy = [
        ('不況', 'ふきょう', 'Economic recession / depression', 'စီးပွားရေးကျဆင်းမှု', 'noun', 'heiban', 0),
        ('景気', 'けいき', 'Economic conditions / climate', 'စီးပွားရေးအခြေအနေကောင်းမွန်မှု', 'noun', 'heiban', 0),
        ('インフレ', 'インフレ', 'Inflation', 'ငွေကြေးဖောင်းပွမှု', 'noun', 'heiban', 0),
        ('デフレ', 'デフレ', 'Deflation', 'ကုန်စျေးနှုန်းကျဆင်းမှု', 'noun', 'heiban', 0),
        ('為替', 'かわせ', 'Foreign currency exchange', 'နိုင်ငံခြားငွေလဲလှယ်နှုန်း', 'noun', 'heiban', 0),
        ('円高', 'えんだか', 'Strong Japanese Yen', 'ယန်းငွေတန်ဖိုးမြင့်တက်ခြင်း', 'noun', 'heiban', 0),
        ('円安', 'えんやす', 'Weak Japanese Yen', 'ယန်းငွေတန်ဖိုးကျဆင်းခြင်း', 'noun', 'heiban', 0),
        ('金利', 'きんり', 'Interest rate', 'အတိုးနှုန်း', 'noun', 'atamadaka', 1),
        ('預金', 'よきん', 'Bank savings deposit', 'ဘဏ်အပ်ငွေ', 'noun', 'heiban', 0),
        ('融資', 'ゆうし', 'Financing / bank loan', 'ချေးငွေထုတ်ပေးခြင်း', 'noun', 'atamadaka', 1),
        ('負債', 'ふさい', 'Debt / liabilities', 'ကြွေးမြီတာဝန်', 'noun', 'heiban', 0),
        ('債券', 'さいけん', 'Bond certificate', 'ငွေတိုက်စာချုပ်', 'noun', 'heiban', 0),
        ('株式', 'かぶしき', 'Stock shares', 'ရှယ်ယာစတော့ရှယ်ယာ', 'noun', 'nakadaka', 2),
        ('配当', 'はいとう', 'Dividend distribution', 'အမြတ်ဝေစုခွဲဝေမှု', 'noun', 'heiban', 0),
        ('投資', 'とうし', 'Investment', 'ရင်းနှီးမြှုပ်နှံမှု', 'noun', 'heiban', 0),
        ('資産', 'しさん', 'Assets / property', 'ပိုင်ဆိုင်မှုရွှေ့ပြောင်းမရသောပစ္စည်း', 'noun', 'heiban', 0),
        ('資本', 'しほん', 'Capital funds', 'မတည်ရင်းနှီးငွေ', 'noun', 'heiban', 0),
        ('決算', 'けっさん', 'Financial accounting settlement', 'စာရင်းပိတ်သိမ်းခြင်း', 'noun', 'heiban', 0),
        ('利益', 'りえき', 'Profit / gain', 'အမြတ်အစွန်း', 'noun', 'atamadaka', 1),
        ('損失', 'そんしつ', 'Loss / financial deficit', 'ဆုံးရှုံးနစ်နာမှု', 'noun', 'heiban', 0),
        ('赤字', 'あかじ', 'Deficit / in the red', 'လိုငွေပြမှု', 'noun', 'heiban', 0),
        ('黒字', 'くろじ', 'Surplus / in the black', 'ပိုငွေပြမှု', 'noun', 'heiban', 0),
        ('納税', 'のうぜい', 'Tax payment', 'အခွန်ပေးဆောင်ခြင်း', 'noun', 'heiban', 0),
        ('所得税', 'しょとくぜい', 'Income tax', 'ဝင်ငွေခွန်', 'noun', 'nakadaka', 3),
        ('法人税', 'ほうじんぜい', 'Corporate enterprise tax', 'ကုမ္ပဏီဝင်ငွေခွန်', 'noun', 'nakadaka', 3),
        ('関税', 'かんぜい', 'Tariff / customs duty', 'အကောက်ခွန်', 'noun', 'heiban', 0),
        ('予算', 'よさん', 'Budget', 'ဘတ်ဂျက်ငွေစာရင်း', 'noun', 'heiban', 0),
        ('国債', 'こくさい', 'Government national bond', 'အစိုးရငွေတိုက်စာချုပ်', 'noun', 'heiban', 0),
        ('物価', 'ぶっか', 'Commodity prices', 'ကုန်စျေးနှုန်း', 'noun', 'heiban', 0),
        ('失業率', 'しつぎょうりつ', 'Unemployment rate', 'အလုပ်လက်မဲ့နှုန်း', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in economy:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 7. Intermediate Verbs & Dynamic Expressions
    verbs = [
        ('扱う', 'あつかう', 'To handle / treat / manage', 'ကိုင်တွယ်ဖြေရှင်းသည်', 'verb', 'heiban', 0),
        ('伴う', 'ともなう', 'To accompany / go with', 'တွဲဖက်ပါရှိသည်', 'verb', 'nakadaka', 3),
        ('促す', 'うながす', 'To urge / prompt / stimulate', 'တိုက်တွန်းနှိုးဆော်သည်', 'verb', 'nakadaka', 3),
        ('阻む', 'はばむ', 'To block / prevent / hinder', 'တားဆီးပိတ်ပင်သည်', 'verb', 'nakadaka', 2),
        ('導く', 'みちびく', 'To lead / guide toward', 'လမ်းပြခေါ်ဆောင်သည်', 'verb', 'nakadaka', 3),
        ('避ける', 'さける', 'To avoid / dodge / ward off', 'ရှောင်တိမ်းသည်', 'verb', 'nakadaka', 2),
        ('妨げる', 'さまたげる', 'To disturb / obstruct / hinder', 'အနှောင့်အယှက်ပေးသည်', 'verb', 'nakadaka', 4),
        ('補う', 'おぎなう', 'To supplement / compensate for', 'ဖြည့်စွက်ကုစားသည်', 'verb', 'nakadaka', 3),
        ('担う', 'になう', 'To bear responsibility / carry', 'တာဝန်ထမ်းဆောင်သည်', 'verb', 'nakadaka', 2),
        ('覆う', 'おおう', 'To cover / envelop', 'ဖုံးအုပ်လွှမ်းခြုံသည်', 'verb', 'nakadaka', 2),
        ('費やす', 'ついやす', 'To spend / consume time/money', 'အချိန်ငွေကြေးဖြုန်းတီးသုံးစွဲသည်', 'verb', 'nakadaka', 3),
        ('尽くす', 'つくす', 'To exhaust / devote fully', 'အစွမ်းကုန်ကြိုးပမ်းသည်', 'verb', 'nakadaka', 2),
        ('施す', 'ほどこす', 'To perform / give alms / apply', 'လှူဒါန်းသည် / ကုသမှုပေးသည်', 'verb', 'nakadaka', 3),
        ('委ねる', 'ゆだねる', 'To entrust / surrender to', 'လွှဲအပ်ပုံအပ်သည်', 'verb', 'nakadaka', 3),
        ('訴える', 'うったえる', 'To sue / appeal to / complain of', 'တရားစွဲဆိုသည် / တိုင်တန်းသည်', 'verb', 'nakadaka', 4),
        ('唱える', 'となえる', 'To chant / recite / advocate', 'ရွတ်ဆိုသည် / တိုက်တွန်းဟောပြောသည်', 'verb', 'nakadaka', 3),
        ('告げる', 'つげる', 'To inform / tell / announce', 'အသိပေးပြောကြားသည်', 'verb', 'heiban', 0),
        ('授ける', 'さずける', 'To confer / award / grant', 'ဆုတံဆိပ်ချီးမြှင့်သည်', 'verb', 'nakadaka', 3),
        ('授かる', 'さずかる', 'To be awarded / blessed with child', 'ဆုလာဘ်ရရှိသည် / ကလေးရသည်', 'verb', 'nakadaka', 3),
        ('見逃す', 'みのがす', 'To overlook / miss seeing', 'မျက်ခြည်ပြတ်လွတ်သွားသည်', 'verb', 'nakadaka', 3),
        ('見落とす', 'みおとす', 'To overlook an error', 'သတိမမူဘဲကျော်သွားသည်', 'verb', 'nakadaka', 3),
        ('見極める', 'みきわめる', 'To ascertain / see through', 'သေချာစွာအကဲဖြတ်ပိုင်းခြားသည်', 'verb', 'nakadaka', 4),
        ('引き起こす', 'ひきおこす', 'To cause / bring about', 'ဖြစ်ပွားစေသည်', 'verb', 'nakadaka', 4),
        ('呼びかける', 'よびかける', 'To call out to / appeal', 'လှမ်းခေါ်သည် / မေတ္တာရပ်ခံသည်', 'verb', 'nakadaka', 4),
        ('突き止める', 'つきとめる', 'To pin down / investigate fully', 'အကြောင်းရင်းကိုဖော်ထုတ်သည်', 'verb', 'nakadaka', 5),
        ('立ち向かう', 'たちむかう', 'To stand up to / face bravely', 'ရဲဝံ့စွာရင်ဆိုင်သည်', 'verb', 'nakadaka', 4),
        ('割り込む', 'わりこむ', 'To cut in line / interrupt', 'တန်းစီရာ၌ကြားဖြတ်ဝင်သည်', 'verb', 'nakadaka', 3),
        ('踏み込む', 'ふみこむ', 'To step into / raid', 'ခြေချဝင်ရောက်သည်', 'verb', 'nakadaka', 3),
        ('落ち込む', 'おちこむ', 'To feel down / depressed', 'စိတ်ဓာတ်ကျဆင်းသည်', 'verb', 'heiban', 0),
        ('溶け込む', 'とけこむ', 'To melt into / blend in community', 'လိုက်လျောညီထွေပေါင်းစပ်သည်', 'verb', 'nakadaka', 3),
        ('染み込む', 'しみこむ', 'To soak into / permeate', 'စိမ့်ဝင်ပျံ့နှံ့သည်', 'verb', 'nakadaka', 3),
        ('飛び込む', 'とびこむ', 'To dive in / plunge into', 'ခုန်ဆင်းထိုးဆင်းသည်', 'verb', 'nakadaka', 3),
        ('率いる', 'ひきいる', 'To lead / command a troop', 'ခေါင်းဆောင်ကွပ်ကဲသည်', 'verb', 'nakadaka', 3),
        ('試みる', 'こころみる', 'To try / attempt', 'စမ်းသပ်လုပ်ဆောင်ကြည့်သည်', 'verb', 'nakadaka', 4),
        ('挑む', 'いどむ', 'To challenge / defy', 'စိန်ခေါ်ယှဉ်ပြိုင်သည်', 'verb', 'nakadaka', 2),
        ('争う', 'あらそう', 'To dispute / fight / contend', 'အငြင်းပွားယှဉ်ပြိုင်သည်', 'verb', 'nakadaka', 3),
        ('打ち破る', 'うちやぶる', 'To defeat / shatter', 'ချေမှုန်းအောင်နိုင်သည်', 'verb', 'nakadaka', 4),
        ('打ち勝つ', 'うちかつ', 'To conquer / overcome', 'အောင်ပွဲဆင်နွှဲသည်', 'verb', 'nakadaka', 3),
        ('屈する', 'くっする', 'To yield to / surrender', 'အရှုံးပေးဒူးထောက်သည်', 'verb', 'heiban', 0),
        ('降伏する', 'こうふくする', 'To surrender / capitulate', 'လက်နက်ချအညံ့ခံသည်', 'verb', 'heiban', 0),
        ('撤退する', 'てったいする', 'To withdraw / retreat', 'တပ်ဆုတ်ခွာသည်', 'verb', 'heiban', 0),
        ('締めくくる', 'しめくくる', 'To conclude / bring to close', 'နိဂုံးချုပ်အဆုံးသတ်သည်', 'verb', 'nakadaka', 4),
        ('成し遂げる', 'なしとげる', 'To accomplish / carry out', 'ပြီးမြောက်အောင်မြင်သည်', 'verb', 'nakadaka', 4),
        ('見直す', 'みなおす', 'To review / re-examine', 'ပြန်လည်စစ်ဆေးသုံးသပ်သည်', 'verb', 'nakadaka', 3),
        ('改める', 'あらためる', 'To reform / amend / renew', 'ပြုပြင်ပြောင်းလဲသည်', 'verb', 'nakadaka', 4),
        ('整える', 'ととのえる', 'To arrange / put in order', 'သပ်ရပ်အောင်ပြင်ဆင်သည်', 'verb', 'nakadaka', 4),
        ('乱れる', 'みだれる', 'To become disordered / disarrayed', 'ရှုပ်ထွေးပျက်ပြားသည်', 'verb', 'nakadaka', 3),
        ('崩れる', 'くずれる', 'To collapse / crumble', 'ပြိုကျပျက်စီးသည်', 'verb', 'nakadaka', 3),
        ('傾く', 'かたむく', 'To incline / lean / decline', 'စောင်းငဲ့သည် / ယိမ်းယိုင်သည်', 'verb', 'nakadaka', 3),
        ('澄む', 'すむ', 'To become clear / transparent', 'ကြည်လင်သွားသည်', 'verb', 'atamadaka', 1),
        ('濁る', 'にごる', 'To become muddy / turbid', 'နောက်ကျုသွားသည်', 'verb', 'nakadaka', 2),
        ('膨らむ', 'ふくらむ', 'To swell / expand', 'ဖောင်းပွလာသည်', 'verb', 'heiban', 0),
        ('縮む', 'ちぢむ', 'To shrink / contract', 'ကျုံ့သွားသည်', 'verb', 'heiban', 0),
        ('枯れる', 'かれる', 'To wither / die (plant)', 'ညှိုးနွမ်းခြောက်သွေ့သည်', 'verb', 'heiban', 0),
        ('茂る', 'しげる', 'To grow thick / luxuriant', 'ထူထပ်စိမ်းလန်းစွာပေါက်ရောက်သည်', 'verb', 'nakadaka', 2),
        ('芽生える', 'めばえる', 'To sprout / bud / dawn', 'အညှောက်ထွက်သည် / စတင်ဖြစ်ပေါ်သည်', 'verb', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in verbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 8. N3 Adjectives, Adverbs & Sentence Connectors
    adjectives_adverbs = [
        ('著しい', 'いちじるしい', 'Remarkable / conspicuous', 'သိသာထင်ရှားသော', 'adjective', 'nakadaka', 5),
        ('目覚ましい', 'めざましい', 'Brilliant / spectacular', 'အံ့မခန်းတိုးတက်သော', 'adjective', 'nakadaka', 4),
        ('喜ばしい', 'よろこばしい', 'Joyful / delightful', 'ဝမ်းမြောက်ဖွယ်ကောင်းသော', 'adjective', 'nakadaka', 5),
        ('嘆かわしい', 'なげかわしい', 'Lamentable / deplorable', 'စိတ်မကောင်းညည်းတွားဖွယ်သော', 'adjective', 'nakadaka', 5),
        ('紛らわしい', 'まぎらわしい', 'Confusing / misleading', 'အထင်မှားစေနိုင်သော', 'adjective', 'nakadaka', 5),
        ('煩わしい', 'わずらわしい', 'Troublesome / annoying', 'စိတ်ရှုပ်စရာရှုပ်ထွေးသော', 'adjective', 'nakadaka', 5),
        ('好ましい', 'このましい', 'Desirable / favorable', 'နှစ်သက်ဖွယ်ကောင်းသော', 'adjective', 'nakadaka', 4),
        ('望ましい', 'のぞましい', 'Desirable / wished for', 'လိုလားတောင့်တဖွယ်သော', 'adjective', 'nakadaka', 4),
        ('頼もしい', 'たのもしい', 'Reliable / dependable', 'အားကိုးထိုက်သော', 'adjective', 'nakadaka', 4),
        ('待ち遠しい', 'まちどおしい', 'Eagerly awaited', 'မ sabai မျှော်လင့်ရသော', 'adjective', 'nakadaka', 5),
        ('鬱陶しい', 'うっとうしい', 'Gloomy / irritating', 'စိတ်မကြည်မွန်းကျပ်သော', 'adjective', 'nakadaka', 5),
        ('浅ましい', 'あさましい', 'Shameful / wretched', 'စက်ဆုပ်ရွံရှာဖွယ်သော', 'adjective', 'nakadaka', 4),
        ('逞しい', 'たくましい', 'Burly / robust / resilient', 'သန်မာကြံ့ခိုင်သော', 'adjective', 'nakadaka', 4),
        ('勇ましい', 'いさましい', 'Brave / valiant', 'ရဲရင့်တက်ကြွသော', 'adjective', 'nakadaka', 4),
        ('甚だしい', 'はなはだしい', 'Extreme / severe', 'အလွန်အကျွံဆိုးရွားသော', 'adjective', 'nakadaka', 5),
        ('著しく', 'いちじるしく', 'Remarkably / considerably', 'ထင်ထင်ရှားရှား', 'adverb', 'nakadaka', 4),
        ('大幅に', 'おおはばに', 'Drastically / substantially', 'အကြီးအကျယ်ပမာဏများပြားစွာ', 'adverb', 'heiban', 0),
        ('僅かに', 'わずかに', 'Slightly / barely', 'အနည်းငယ်မျှသာ', 'adverb', 'atamadaka', 1),
        ('比較的', 'ひかくてき', 'Comparatively / relatively', 'နှိုင်းယှဉ်ချက်အရ', 'adverb', 'heiban', 0),
        ('概ね', 'おおむね', 'Generally / mostly', 'ယေဘုယျအားဖြင့်', 'adverb', 'heiban', 0),
        ('凡そ', 'およそ', 'Approximately / roughly', 'ခန့်မှန်းခြေအားဖြင့်', 'adverb', 'heiban', 0),
        ('単に', 'たんに', 'Simply / merely', 'ရိုးရိုးမျှသာ', 'adverb', 'atamadaka', 1),
        ('専ら', 'もっぱら', 'Solely / entirely', 'အဓိကအားဖြင့်', 'adverb', 'heiban', 0),
        ('殊に', 'ことに', 'Particularly / especially', 'အထူးသဖြင့်', 'adverb', 'atamadaka', 1),
        ('取り分け', 'とりわけ', 'Above all / especially', 'အထူးသဖြင့်ခွဲခြား၍', 'adverb', 'heiban', 0),
        ('なお', 'なお', 'Furthermore / still / yet', 'ထို့အပြင် / သို့သော်လည်း', 'conjunction', 'atamadaka', 1),
        ('ちなみに', 'ちなみに', 'By the way / incidentally', 'စကားမစပ်', 'conjunction', 'heiban', 0),
        ('したがって', 'したがって', 'Therefore / accordingly', 'ထို့ကြောင့် / အကျိုးဆက်အားဖြင့်', 'conjunction', 'heiban', 0),
        ('故に', 'ゆえに', 'Therefore / consequently', 'ထို့ကြောင့်ဖြစ်သည်', 'conjunction', 'atamadaka', 1),
        ('要するに', 'ようするに', 'In short / to sum up', 'အနှစ်ချုပ်အားဖြင့်ဆိုရသော်', 'adverb', 'atamadaka', 1),
        ('つまり', 'つまり', 'In other words / that is to say', 'ဆိုလိုသည်မှာ', 'adverb', 'atamadaka', 1),
        ('言い換えれば', 'いいかえれば', 'In other words', 'အခြားစကားဖြင့်ပြောရလျှင်', 'conjunction', 'nakadaka', 4),
        ('いわば', 'いわば', 'So to speak / as it were', 'ဥပမာအားဖြင့်ဆိုရသော်', 'adverb', 'atamadaka', 1),
        ('一方で', 'いっぽうで', 'On the other hand', 'တစ်ဖက်တွင်မူ', 'conjunction', 'nakadaka', 3),
        ('その反面', 'そのはんめん', 'On the flip side', 'အခြားတစ်ဖက်မှကြည့်လျှင်', 'conjunction', 'heiban', 0),
        ('にもかかわらず', 'にもかかわらず', 'Nevertheless / in spite of', 'သို့ဖြစ်လင့်ကစား', 'conjunction', 'heiban', 0),
        ('むしろ', 'むしろ', 'Rather / sooner', 'ထိုထက်ပို၍ပင်', 'adverb', 'atamadaka', 1),
        ('かえって', 'かえって', 'On the contrary / rather', 'ထင်ထားသည်နှင့်ဆန့်ကျင်ဘက်', 'adverb', 'atamadaka', 1),
        ('あえて', 'あえて', 'Daringly / boldly', 'ရဲရဲဝံ့ဝံ့ / အတင်းအကျပ်', 'adverb', 'atamadaka', 1),
        ('どうにか', 'どうにか', 'Somehow or other', 'မည်သို့ပင်ဖြစ်စေ အဆင်ပြေအောင်', 'adverb', 'atamadaka', 1),
        ('なんとか', 'なんとか', 'Somehow / in one way or another', 'တစ်နည်းနည်းနှင့်', 'adverb', 'atamadaka', 1),
        ('どうせ', 'どうせ', 'Anyhow / at all events', 'မည်သို့ပင်ဖြစ်စေကာမူ', 'adverb', 'heiban', 0),
        ('到底', 'とうてい', 'Possibly cannot (with neg)', 'မည်သို့မျှမဖြစ်နိုင်', 'adverb', 'heiban', 0),
        ('めったに', 'めったに', 'Rarely / seldom', 'အလွန်ရှားပါးစွာ', 'adverb', 'atamadaka', 1),
        ('まさか', 'まさか', 'By no means / surely not', 'ဘယ်လိုမှမဖြစ်နိုင်ပါ', 'adverb', 'atamadaka', 1),
        ('果たして', 'はたして', 'As expected / really?', 'အမှန်တကယ်ပင် / ထင်သည့်အတိုင်း', 'adverb', 'nakadaka', 2),
        ('いったい', 'いったい', 'What on earth?', 'အဘယ်အရာဖြစ်ပါသနည်း', 'adverb', 'heiban', 0),
        ('なぜなら', 'なぜなら', 'Because / reason being', 'အဘယ်ကြောင့်ဆိုသော်', 'conjunction', 'atamadaka', 1),
    ]
    for ja, kana, en, my, pos, pp, d in adjectives_adverbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 9. Culture, Tradition & Ceremonies
    culture = [
        ('伝統', 'でんとう', 'Tradition / convention', 'ရိုးရာအစဉ်အလာ', 'noun', 'heiban', 0),
        ('芸能', 'げいのう', 'Public entertainment / performing arts', 'ဖျော်ဖြေရေးအနုပညာ', 'noun', 'heiban', 0),
        ('歌舞伎', 'かぶき', 'Kabuki classical theater', 'ခါဘူကီရိုးရာပြဇာတ်', 'noun', 'heiban', 0),
        ('能楽', 'のうがく', 'Noh theater art', 'နိုရိုးရာဂီတပြဇာတ်', 'noun', 'atamadaka', 1),
        ('茶道', 'さどう', 'Tea ceremony way', 'လက်ဖက်ရည်ကြမ်းသဘင်ပညာ', 'noun', 'atamadaka', 1),
        ('華道', 'かどう', 'Flower arrangement art', 'ပန်းအလှဆင်ပညာ', 'noun', 'atamadaka', 1),
        ('書道', 'しょどう', 'Calligraphy', 'လက်ရေးလှပညာ', 'noun', 'atamadaka', 1),
        ('陶芸', 'とうげい', 'Ceramic art / pottery', 'မြေထည်အိုးလုပ်ငန်း', 'noun', 'heiban', 0),
        ('着物', 'きもの', 'Traditional Japanese Kimono', 'ကီမိုနိုရိုးရာဝတ်စုံ', 'noun', 'heiban', 0),
        ('浴衣', 'ゆかた', 'Light cotton summer kimono', 'နွေရာသီဝတ်ရုံ', 'noun', 'heiban', 0),
        ('神社', 'じんじゃ', 'Shinto shrine', 'ရှင်တိုနတ်ကွန်း', 'noun', 'atamadaka', 1),
        ('寺院', 'じいん', 'Buddhist temple', 'ဗုဒ္ဓဘာသာဘုရားကျောင်း', 'noun', 'atamadaka', 1),
        ('境内', 'けいだい', 'Shrine grounds', 'ဘုရားကျောင်းဝင်း', 'noun', 'atamadaka', 1),
        ('鳥居', 'とりい', 'Shrine archway gate', 'တိုရီအီနတ်တံခါး', 'noun', 'heiban', 0),
        ('お守り', 'おまもり', 'Amulet / lucky charm', 'အဆောင်လက်ဖွဲ့', 'noun', 'heiban', 0),
        ('祭礼', 'さいれい', 'Ritual festival', 'ဘာသာရေးပွဲတော်', 'noun', 'heiban', 0),
        ('神輿', 'みこし', 'Portable shrine', 'ပွဲတော်ထမ်းစင်နတ်ကွန်း', 'noun', 'heiban', 0),
        ('盆踊り', 'ぼんおどり', 'Bon festival dance', 'အိုဘွန်းရိုးရာအက', 'noun', 'nakadaka', 3),
        ('花火大会', 'はなびたいかい', 'Fireworks display show', 'မီးရှူးမီးပန်းပွဲတော်', 'noun', 'nakadaka', 4),
        ('初詣', 'はつもうで', 'First shrine visit of New Year', 'နှစ်သစ်ဦးဘုရားဖူးခြင်း', 'noun', 'nakadaka', 3),
        ('冠婚葬祭', 'かんこんそうさい', 'Ceremonial occasions of life', 'မင်္ဂလာဆောင်နှင့်နာရေးအခမ်းအနားများ', 'noun', 'nakadaka', 5),
        ('披露宴', 'ひろうえん', 'Wedding banquet reception', 'မင်္ဂလာဧည့်ခံပွဲ', 'noun', 'nakadaka', 3),
        ('香典', 'こうでん', 'Funeral condolence gift', 'နာရေးထောက်ပံ့ကြေး', 'noun', 'heiban', 0),
        ('遺言', 'ゆいごん', 'Last will and testament', 'သေတမ်းစာ', 'noun', 'heiban', 0),
        ('遺産', 'いさん', 'Inheritance / heritage', 'အမွေအနှစ်', 'noun', 'heiban', 0),
        ('相続', 'そうぞく', 'Succession / inheritance', 'အမွေဆက်ခံခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in culture:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 10. Society, Politics & Governance
    politics = [
        ('民主主義', 'みんしゅしゅぎ', 'Democracy', 'ဒီမိုကရေစီဝါဒ', 'noun', 'nakadaka', 4),
        ('資本主義', 'しほんしゅぎ', 'Capitalism', 'အရင်းရှင်ဝါဒ', 'noun', 'nakadaka', 4),
        ('選挙', 'せんきょ', 'Election', 'ရွေးကောက်ပွဲ', 'noun', 'atamadaka', 1),
        ('投票', 'とうひょう', 'Voting / poll', 'မဲပေးခြင်း', 'noun', 'heiban', 0),
        ('候補者', 'こうほしゃ', 'Election candidate', 'ရွေးကောက်ပွဲကိုယ်စားလှယ်လောင်း', 'noun', 'nakadaka', 3),
        ('政党', 'せいとう', 'Political party', 'နိုင်ငံရေးပါတီ', 'noun', 'heiban', 0),
        ('内閣', 'ないかく', 'Cabinet ministry', 'အစိုးရအဖွဲ့ဝန်ကြီးအဖွဲ့', 'noun', 'atamadaka', 1),
        ('首相', 'しゅしょう', 'Prime Minister', 'ဝန်ကြီးချုပ်', 'noun', 'heiban', 0),
        ('議会', 'ぎかい', 'Parliament / assembly', 'လွှတ်တော်', 'noun', 'atamadaka', 1),
        ('国会', 'こっかい', 'National Diet parliament', 'အမျိုးသားလွှတ်တော်', 'noun', 'heiban', 0),
        ('外交', 'がいこう', 'Diplomacy / foreign affairs', 'နိုင်ငံခြားရေးရာ / သံတမန်ရေးရာ', 'noun', 'heiban', 0),
        ('国際連合', 'こくさいれんごう', 'United Nations (UN)', 'ကုလသမဂ္ဂ', 'noun', 'nakadaka', 5),
        ('難民', 'なんみん', 'Refugees', 'ဒုက္ခသည်များ', 'noun', 'heiban', 0),
        ('援助', 'えんじょ', 'Aid / assistance', 'အကူအညီထောက်ပံ့မှု', 'noun', 'atamadaka', 1),
        ('紛争', 'ふんそう', 'Dispute / conflict', 'လက်နက်ကိုင်ပဋိပက္ခ', 'noun', 'heiban', 0),
        ('軍事', 'ぐんじ', 'Military affairs', 'စစ်ရေးကိစ္စများ', 'noun', 'atamadaka', 1),
        ('平和', 'へいわ', 'Peace / harmony', 'ငြိမ်းချမ်းရေး', 'noun', 'heiban', 0),
        ('独立', 'どくりつ', 'Independence', 'လွတ်လပ်ရေး', 'noun', 'heiban', 0),
        ('植民地', 'しょくみんち', 'Colony / territory', 'ကိုလိုနီနယ်မြေ', 'noun', 'nakadaka', 3),
        ('改革', 'かいかく', 'Reform / innovation', 'ပြုပြင်ပြောင်းလဲရေး', 'noun', 'heiban', 0),
        ('復興', 'ふっこう', 'Reconstruction / revival', 'ပြန်လည်ထူထောင်ရေး', 'noun', 'heiban', 0),
        ('過疎化', 'かそか', 'Depopulation of rural areas', 'လူဦးရေလျော့နည်းခြောက်ကပ်လာခြင်း', 'noun', 'heiban', 0),
        ('高齢化', 'こうれいか', 'Aging population', 'သက်ကြီးရွယ်အိုဦးရေတိုးပွားလာခြင်း', 'noun', 'heiban', 0),
        ('少子化', 'しょうしか', 'Declining birthrate', 'ကလေးမွေးဖွားနှုန်းကျဆင်းခြင်း', 'noun', 'heiban', 0),
        ('人権', 'じんけん', 'Human rights', 'လူ့အခွင့်အရေး', 'noun', 'heiban', 0),
        ('差別', 'さべつ', 'Discrimination', 'ခွဲခြားဆက်ဆံမှု', 'noun', 'atamadaka', 1),
        ('平等', 'びょうどう', 'Equality / impartiality', 'တန်းတူညီမျှမှု', 'noun', 'heiban', 0),
        ('福祉', 'ふくし', 'Social welfare', 'လူမှုဖူလုံရေး', 'noun', 'heiban', 0),
        ('介護', 'かいご', 'Nursing care for elderly', 'သက်ကြီးရွယ်အိုစောင့်ရှောက်မှု', 'noun', 'atamadaka', 1),
        ('保険', 'ほけん', 'Insurance guarantee', 'အာမခံ', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in politics:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 11. Intermediate Verbs & Compound Actions
    compound_actions = [
        ('思いつく', 'おもいつく', 'To think of / hit upon idea', 'အကြံတစ်ခုပေါ်လာသည်', 'verb', 'nakadaka', 4),
        ('考え込む', 'かんがえこむ', 'To ponder deeply / brood', 'လေးနက်စွာစဉ်းစားခန်းဝင်သည်', 'verb', 'nakadaka', 5),
        ('打ち明ける', 'うちあける', 'To confide / reveal heart', 'ရင်ဖွင့်ပြောပြသည်', 'verb', 'nakadaka', 4),
        ('問い詰める', 'といつめる', 'To press someone for an answer', 'အကျပ်ကိုင်မေးမြန်းသည်', 'verb', 'nakadaka', 4),
        ('言い張る', 'いいはる', 'To insist / persist in asserting', 'ဇွတ်အတင်းငြင်းဆိုပြောဆိုသည်', 'verb', 'nakadaka', 3),
        ('抱え込む', 'かかえこむ', 'To hold under arms / take on burden', 'ပိုက်ထွေးထားသည် / ပြဿနာကိုတစ်ယောက်တည်းခံသည်', 'verb', 'nakadaka', 4),
        ('突っ込む', 'つっこむ', 'To thrust into / plunge / plunge', 'ထိုးထည့်သည် / ဝင်ရောက်စွက်ဖက်သည်', 'verb', 'nakadaka', 3),
        ('踏み切る', 'ふみきる', 'To take the plunge / embark on', 'ပြတ်ပြတ်သားသားစတင်လုပ်ဆောင်သည်', 'verb', 'nakadaka', 3),
        ('引っかかる', 'ひっかかる', 'To get caught / trapped', 'ချိတ်မိသည် / လှည့်စားခံရသည်', 'verb', 'nakadaka', 4),
        ('取り組む', 'とりくむ', 'To tackle problem / engage in', 'အလေးအနက်ကြိုးပမ်းအားထုတ်သည်', 'verb', 'nakadaka', 3),
        ('取り入れる', 'とりいれる', 'To adopt / introduce / harvest', 'လက်ခံကျင့်သုံးသည် / ရိတ်သိမ်းသည်', 'verb', 'nakadaka', 4),
        ('取り扱う', 'とりあつかう', 'To handle / deal with / trade', 'ကိုင်တွယ်ရောင်းဝယ်သည်', 'verb', 'nakadaka', 4),
        ('受け入れる', 'うけいれる', 'To accept / agree / welcome', 'လက်ခံသဘောတူသည်', 'verb', 'nakadaka', 4),
        ('受け止める', 'うけとめる', 'To catch / react to / accept reality', 'လက်ခံခံယူသည် / ဖမ်းယူသည်', 'verb', 'nakadaka', 4),
        ('引き止める', 'ひきとめる', 'To detain / hold back / check', 'ဆွဲထားဆိုင်းငံ့သည်', 'verb', 'nakadaka', 4),
        ('切り替える', 'きりかえる', 'To switch over / change gear', 'ပြောင်းလဲတပ်ဆင်သည်', 'verb', 'nakadaka', 4),
        ('乗り切る', 'のりきる', 'To weather / surmount crisis', 'အခက်အခဲကိုကျော်လွှားသည်', 'verb', 'nakadaka', 3),
        ('持ち直す', 'もちなおす', 'To improve / rally / recover', 'ပြန်လည်ကောင်းမွန်လာသည်', 'verb', 'nakadaka', 4),
        ('立ち寄る', 'たちよる', 'To drop by / stop over', 'ခေတ္တဝင်ရောက်လည်ပတ်သည်', 'verb', 'nakadaka', 3),
        ('寄りかかる', 'よりかかる', 'To lean against / depend on', 'မှီခိုသည် / မှီတွယ်သည်', 'verb', 'nakadaka', 4),
        ('辿り着く', 'たどりつく', 'To arrive at after struggle', 'ခဲယဉ်းစွာရောက်ရှိသည်', 'verb', 'nakadaka', 4),
        ('駆けつける', 'かけつける', 'To rush to scene / hasten', 'အပြေးအလွှားရောက်လာသည်', 'verb', 'nakadaka', 4),
        ('逃げ出す', 'にげだす', 'To run away / flee', 'ထွက်ပြေးလွတ်မြောက်သည်', 'verb', 'nakadaka', 3),
        ('抜け出す', 'ぬけだす', 'To sneak out / slip away', 'ခိုးကြောင်ခိုးဝှက်ထွက်ပြေးသည်', 'verb', 'nakadaka', 3),
        ('追い詰める', 'おいつめる', 'To corner / drive to wall', 'ထောင့်စွန်းသို့ပိတ်ဆို့ဖိအားပေးသည်', 'verb', 'nakadaka', 4),
        ('思いやる', 'おもいやる', 'To be considerate / compassionate', 'စာနာထောက်ထားသည်', 'verb', 'nakadaka', 4),
        ('立ち去る', 'たちさる', 'To leave / depart', 'ထွက်ခွာသွားသည်', 'verb', 'nakadaka', 3),
        ('見守る', 'みまもる', 'To watch over / look on', 'စောင့်ရှောက်ကြည့်ရှုသည်', 'verb', 'heiban', 0),
        ('見つめる', 'みつめる', 'To stare at / gaze intently', 'စူးစူးစိုက်စိုက်ကြည့်သည်', 'verb', 'heiban', 0),
        ('見合わせる', 'みあわせる', 'To postpone / look at each other', 'ဆိုင်းငံ့ထားသည် / အချင်းချင်းကြည့်သည်', 'verb', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in compound_actions:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 12. Science, Environment & Nature
    science = [
        ('資源', 'しげん', 'Natural resources', 'သဘာဝသယံဇာတ', 'noun', 'atamadaka', 1),
        ('石油', 'せきゆ', 'Petroleum oil', 'ရေနံဆီ', 'noun', 'heiban', 0),
        ('天然ガス', 'てんねんガス', 'Natural gas', 'သဘာဝဓာတ်ငွေ့', 'noun', 'nakadaka', 4),
        ('原子力', 'げんしりょく', 'Nuclear atomic energy', 'နျူကလီးယားစွမ်းအင်', 'noun', 'nakadaka', 3),
        ('太陽光', 'たいようこう', 'Solar sunlight', 'နေရောင်ခြည်စွမ်းအင်', 'noun', 'nakadaka', 3),
        ('二酸化炭素', 'にさんかたんそ', 'Carbon dioxide CO2', 'ကာဗွန်ဒိုင်အောက်ဆိုဒ်', 'noun', 'nakadaka', 5),
        ('オゾン層', 'オゾンそう', 'Ozone layer', 'အိုဇုန်းလွှာ', 'noun', 'nakadaka', 3),
        ('異常気象', 'いじょうきしょう', 'Abnormal unusual weather', 'မိုးလေဝသဖောက်ပြန်မှု', 'noun', 'nakadaka', 4),
        ('旱魃', 'かんばつ', 'Drought / dry spell', 'မိုးခေါင်ရေရှားမှု', 'noun', 'heiban', 0),
        ('竜巻', 'たつまき', 'Tornado / waterspout', 'လေဆင်နှာမောင်း', 'noun', 'heiban', 0),
        ('津波', 'つなみ', 'Tsunami tidal wave', 'ဆူနာမီလှိုင်းကြီး', 'noun', 'heiban', 0),
        ('惑星', 'わくせい', 'Planet', 'ဂြိုဟ်', 'noun', 'heiban', 0),
        ('宇宙', 'うちゅう', 'Universe / cosmos / outer space', 'စကြာဝဠာ / အာကာသ', 'noun', 'atamadaka', 1),
        ('衛星', 'えいせい', 'Satellite', 'ဂြိုဟ်တု', 'noun', 'heiban', 0),
        ('重力', 'じゅうりょく', 'Gravity', 'ဆွဲငင်အား', 'noun', 'atamadaka', 1),
        ('分子', 'ぶんし', 'Molecule', 'မော်လီကျူး', 'noun', 'atamadaka', 1),
        ('原子', 'げんし', 'Atom', 'အက်တမ်', 'noun', 'atamadaka', 1),
        ('元素', 'げんそ', 'Chemical element', 'ဓာတုဒြပ်စင်', 'noun', 'atamadaka', 1),
        ('物質', 'ぶっしつ', 'Material / substance', 'ဒြပ်ဝတ္ထု', 'noun', 'heiban', 0),
        ('燃焼', 'ねんしょう', 'Combustion / burning', 'လောင်ကျွမ်းခြင်း', 'noun', 'heiban', 0),
        ('蒸発', 'じょうはつ', 'Evaporation', 'အငွေ့ပျံခြင်း', 'noun', 'heiban', 0),
        ('溶解', 'ようかい', 'Dissolution / melting', 'ပျော်ဝင်ခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in science:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 13. Health, Medicine & Rehabilitation
    medicine = [
        ('免疫', 'めんえき', 'Immunity / resistance', 'ရောဂါပြီးစနစ်', 'noun', 'heiban', 0),
        ('抗体', 'こうたい', 'Antibody', 'ပဋိပစ္စည်း', 'noun', 'heiban', 0),
        ('アレルギー', 'アレルギー', 'Allergy', 'ဓာတ်မတည့်မှု', 'noun', 'nakadaka', 2),
        ('精神', 'せいしん', 'Mind / spirit / psyche', 'စိတ်ပိုင်းဆိုင်ရာစွမ်းရည်', 'noun', 'atamadaka', 1),
        ('心理', 'しんり', 'Mentality / psychology', 'စိတ်ပညာသဘောထား', 'noun', 'atamadaka', 1),
        ('治療', 'ちりょう', 'Medical treatment', 'ဆေးကုသမှု', 'noun', 'heiban', 0),
        ('診断', 'しんだん', 'Diagnosis', 'ရောဂါရှာဖွေအတည်ပြုခြင်း', 'noun', 'heiban', 0),
        ('処置', 'しょち', 'Medical measure / disposition', 'ကုသမှုအစီအမံ', 'noun', 'atamadaka', 1),
        ('副作用', 'ふくさよう', 'Side effect', 'ဘေးထွက်ဆိုးကျိုး', 'noun', 'nakadaka', 2),
        ('麻酔', 'ますい', 'Anesthesia', 'ထုံဆေး / မေ့ဆေး', 'noun', 'heiban', 0),
        ('衛生', 'えいせい', 'Hygiene / sanitation', 'သန့်ရှင်းရေးကျန်းမာရေး', 'noun', 'heiban', 0),
        ('予防接種', 'よぼうせっしゅ', 'Vaccination injection', 'ကာကွယ်ဆေးထိုးခြင်း', 'noun', 'nakadaka', 4),
        ('応急処置', 'おうきゅうしょち', 'First-aid treatment', 'ရှေးဦးသူနာပြုကုသမှု', 'noun', 'nakadaka', 5),
        ('リハビリ', 'リハビリ', 'Rehabilitation', 'ပြန်လည်သန်စွမ်းရေးလေ့ကျင့်မှု', 'noun', 'heiban', 0),
        ('倦怠感', 'けんたいかん', 'Fatigue / malaise', 'မောပန်းနွမ်းနယ်ခြင်း', 'noun', 'nakadaka', 3),
        ('うつ病', 'うつびょう', 'Depression illness', 'စိတ်ကျရောဂါ', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in medicine:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 14. Commerce, Supply Chain & Management
    commerce = [
        ('流通', 'りゅうつう', 'Distribution / circulation of goods', 'ကုန်စည်ဖြန့်ဖြူးမှု', 'noun', 'heiban', 0),
        ('小売', 'こうり', 'Retail sale', 'လက်လီအရောင်း', 'noun', 'heiban', 0),
        ('卸売', 'おろしうり', 'Wholesale trade', 'လက်ကားအရောင်း', 'noun', 'nakadaka', 3),
        ('物流', 'ぶつりゅう', 'Logistics / cargo freight', 'သယ်ယူပို့ဆောင်ရေးထောက်ပံ့မှု', 'noun', 'heiban', 0),
        ('倉庫', 'そうこ', 'Warehouse / storehouse', 'ကုန်လှောင်ရုံ', 'noun', 'atamadaka', 1),
        ('輸送', 'ゆそう', 'Transportation / transit', 'ကုန်ပစ္စည်းသယ်ယူပို့ဆောင်ခြင်း', 'noun', 'heiban', 0),
        ('貿易', 'ぼうえき', 'Foreign international trade', 'နိုင်ငံတကာကုန်သွယ်ရေး', 'noun', 'heiban', 0),
        ('輸出', 'ゆしゅつ', 'Exporting goods', 'ပြည်ပသို့တင်ပို့ခြင်း', 'noun', 'heiban', 0),
        ('輸入', 'ゆにゅう', 'Importing goods', 'ပြည်ပမှတင်သွင်းခြင်း', 'noun', 'heiban', 0),
        ('相場', 'そうば', 'Market price quotation', 'စျေးကွက်ပေါက်စျေး', 'noun', 'heiban', 0),
        ('顧客', 'こきゃく', 'Customer / patron', 'ဖောက်သည်ဧည့်သည်', 'noun', 'heiban', 0),
        ('品質', 'ひんしつ', 'Quality of product', 'အရည်အသွေး', 'noun', 'heiban', 0),
        ('保証', 'ほしょう', 'Warranty / guarantee', 'အာမခံချက်', 'noun', 'heiban', 0),
        ('検査', 'けんさ', 'Inspection / audit test', 'စစ်ဆေးစမ်းသပ်မှု', 'noun', 'atamadaka', 1),
        ('クレーム', 'クレーム', 'Customer complaint', 'ဖောက်သည်၏တိုင်ကြားချက်', 'noun', 'nakadaka', 2),
        ('改善', 'かいぜん', 'Improvement / kaizen', 'တိုးတက်ကောင်းမွန်အောင်ပြုပြင်ခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in commerce:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 15. Mimetic Words & Descriptive Expressions
    mimetics = [
        ('ぎっしり', 'ぎっしり', 'Tightly packed / jam-full', 'ပြည့်သိပ်ကျပ်ညပ်လျက်', 'adverb', 'nakadaka', 3),
        ('びっしり', 'びっしり', 'Closely spaced / crammed', 'စိပ်စိပ်ပြည့်ကျပ်လျက်', 'adverb', 'nakadaka', 3),
        ('ぐったり', 'ぐったり', 'Exhausted / limp with fatigue', 'ပင်ပန်းနွမ်းနယ်ခွေယိုင်လျက်', 'adverb', 'nakadaka', 3),
        ('げっそり', 'げっそり', 'Emaciated / suddenly thin', 'ပိန်ချုံးကျဆင်းလျက်', 'adverb', 'nakadaka', 3),
        ('うっとり', 'うっとり', 'Enchanted / enraptured', 'စွဲမက်မိန်းမောလျက်', 'adverb', 'nakadaka', 3),
        ('じっくり', 'じっくり', 'Deliberately / taking time', 'သေချာစိတ်အေးလက်အေးအချိန်ယူ၍', 'adverb', 'nakadaka', 3),
        ('きっかり', 'きっかり', 'Exactly / on the dot', 'တိတိကျကျကွက်တိ', 'adverb', 'nakadaka', 3),
        ('くっきり', 'くっきり', 'Clearly distinct / sharp silhouette', 'ထင်းလင်းပြတ်သားစွာ', 'adverb', 'nakadaka', 3),
        ('さっと', 'さっと', 'Quickly / swiftly', 'ဖျတ်ခနဲသွက်လက်စွာ', 'adverb', 'atamadaka', 1),
        ('ざっと', 'ざっと', 'Roughly / cursorily', 'အကြမ်းဖျင်းအားဖြင့်', 'adverb', 'heiban', 0),
        ('ちらっと', 'ちらっと', 'At a glance / fleetingly', 'တစ်ချက်မျှဝေ့ကြည့်လျက်', 'adverb', 'nakadaka', 2),
        ('ふと', 'ふと', 'Inadvertently / by whim', 'ရုတ်တရက်သတိရလျက်', 'adverb', 'atamadaka', 1),
        ('はっと', 'はっと', 'Startled / sudden awakening', 'ထိတ်ခနဲသတိဝင်လျက်', 'adverb', 'heiban', 0),
        ('ほっと', 'ほっと', 'Relieved / sigh of relief', 'စိတ်သက်သာရာရလျက်', 'adverb', 'heiban', 0),
        ('どっと', 'どっと', 'Suddenly in large numbers', 'ရုတ်တရက်အလုံးအရင်းနှင့်', 'adverb', 'atamadaka', 1),
        ('堂々と', 'どうどうと', 'Magnificently / grandly', 'ရဲဝံ့ဂုဏ်သိက္ခာရှိစွာ', 'adverb', 'atamadaka', 1),
        ('黙々と', 'もくもくと', 'Silently and diligently', 'တိတ်တဆိတ်မနားတမ်း', 'adverb', 'heiban', 0),
        ('悠々と', 'ゆうゆうと', 'Leisurely / serenely', 'အေးအေးလူလူသက်သောင့်သက်သာ', 'adverb', 'atamadaka', 1),
        ('次々と', 'つぎつぎと', 'One after another / successively', 'တစ်ခုပြီးတစ်ခုဆက်တိုက်', 'adverb', 'nakadaka', 2),
        ('続々と', 'ぞくぞくと', 'In rapid continuous succession', 'ဆက်တိုက်မပြတ်မဆဲ', 'adverb', 'atamadaka', 1),
    ]
    for ja, kana, en, my, pos, pp, d in mimetics:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 16. Natural Geography, Topography & Weather Disasters
    geography = [
        ('半島', 'はんとう', 'Peninsula', 'ကျွန်းဆွယ်', 'noun', 'heiban', 0),
        ('海峡', 'かいきょう', 'Strait / channel', 'ရေလက်ကြား', 'noun', 'heiban', 0),
        ('盆地', 'ぼんち', 'Basin (geographical)', 'ချိုင့်ဝှမ်းမြေ', 'noun', 'heiban', 0),
        ('平野', 'へいや', 'Plain / open field', 'လွင်ပြင်', 'noun', 'heiban', 0),
        ('砂漠', 'さばく', 'Desert', 'သဲကန္တာရ', 'noun', 'heiban', 0),
        ('活火山', 'かっかざん', 'Active volcano', 'မီးတောင်ရှင်', 'noun', 'nakadaka', 3),
        ('噴火', 'ふんか', 'Eruption of volcano', 'မီးတောင်ပေါက်ကွဲခြင်း', 'noun', 'heiban', 0),
        ('溶岩', 'ようがん', 'Lava', 'ချော်ရည်', 'noun', 'atamadaka', 1),
        ('震源', 'しんげん', 'Epicenter of earthquake', 'ငလျင်ဗဟိုချက်', 'noun', 'heiban', 0),
        ('余震', 'よしん', 'Aftershock of earthquake', 'ငလျင်နောက်ဆက်တွဲလှုပ်ခတ်မှု', 'noun', 'heiban', 0),
        ('警戒', 'けいかい', 'Vigilance / precaution', 'သတိပေးတပ်လှန့်ခြင်း', 'noun', 'heiban', 0),
        ('警報', 'けいほう', 'Alarm / warning sirens', 'အရေးပေါ်သတိပေးဥဩသံ', 'noun', 'heiban', 0),
        ('氾濫', 'はんらん', 'Inundation / river overflow', 'မြစ်ရေလျှံခြင်း', 'noun', 'heiban', 0),
        ('土砂崩れ', 'どしゃくずれ', 'Landslide / mudslide', 'မြေပြိုကျခြင်း', 'noun', 'nakadaka', 3),
        ('雪崩', 'なだれ', 'Avalanche / snowslide', 'နှင်းပြိုကျခြင်း', 'noun', 'heiban', 0),
        ('突風', 'とっぷう', 'Sudden gust of wind', 'လေပြင်းမုန်တိုင်းတိုက်ခတ်ခြင်း', 'noun', 'heiban', 0),
        ('濃霧', 'のうむ', 'Dense fog / thick mist', 'ထူထပ်သောမြူခိုး', 'noun', 'atamadaka', 1),
    ]
    for ja, kana, en, my, pos, pp, d in geography:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 17. Legal, Justice & Crime Investigation
    justice = [
        ('裁判所', 'さいばんしょ', 'Law court', 'တရားရုံး', 'noun', 'nakadaka', 2),
        ('原告', 'げんこく', 'Plaintiff / accuser', 'တရားလို', 'noun', 'heiban', 0),
        ('被告', 'ひこく', 'Defendant / accused', 'တရားခံ', 'noun', 'heiban', 0),
        ('証言', 'しょうげん', 'Testimony / witness statement', 'သက်သေထွက်ဆိုချက်', 'noun', 'heiban', 0),
        ('判決', 'はんけつ', 'Judicial verdict', 'တရားရုံးစီရင်ချက်', 'noun', 'heiban', 0),
        ('懲役', 'ちょうえき', 'Penal servitude / prison with hard labor', 'အလုပ်ကြမ်းနှင့်ထောင်ဒဏ်', 'noun', 'heiban', 0),
        ('罰金', 'ばっきん', 'Fine / penalty money', 'ဒဏ်ငွေ', 'noun', 'heiban', 0),
        ('執行猶予', 'しっこうゆうよ', 'Stay of execution / suspended sentence', 'ထောင်ဒဏ်ဆိုင်းငံ့ခွင့်', 'noun', 'nakadaka', 4),
        ('被害者', 'ひがいしゃ', 'Victim / injured party', 'နစ်နာသူ / သားကောင်', 'noun', 'nakadaka', 2),
        ('加害者', 'かがいしゃ', 'Perpetrator / assailant', 'ကျူးလွန်သူ', 'noun', 'nakadaka', 2),
        ('少年非行', 'しょうねんひこう', 'Juvenile delinquency', 'ဆယ်ကျော်သက်လူငယ်ပြစ်မှု', 'noun', 'nakadaka', 4),
        ('刑務所', 'けいむしょ', 'Prison / penitentiary', 'အကျဉ်းထောင်', 'noun', 'nakadaka', 3),
        ('防犯カメラ', 'ぼうはんカメラ', 'Surveillance security camera', 'လုံခြုံရေးကင်မရာ', 'noun', 'nakadaka', 5),
        ('捜査', 'そうさ', 'Criminal investigation', 'ရာဇဝတ်စုံစမ်းစစ်ဆေးမှု', 'noun', 'atamadaka', 1),
        ('逮捕', 'たいほ', 'Arrest / apprehension', 'ဖမ်းဆီးထိန်းသိမ်းခြင်း', 'noun', 'atamadaka', 1),
        ('取り調べ', 'とりしらべ', 'Interrogation / questioning', 'စစ်ကြောမေးမြန်းခြင်း', 'noun', 'heiban', 0),
        ('容疑者', 'ようぎしゃ', 'Suspect', 'သံသယဖြစ်ခံရသူ', 'noun', 'nakadaka', 3),
        ('目撃者', 'もくげきしゃ', 'Eyewitness', 'မျက်မြင်သက်သေ', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in justice:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 18. Art, Literature & Performing Aesthetics
    arts = [
        ('彫刻', 'ちょうこく', 'Sculpture / carving', 'ပန်းပုရုပ်ထု', 'noun', 'heiban', 0),
        ('絵画', 'かいが', 'Painting / picture', 'ပန်းချီကား', 'noun', 'atamadaka', 1),
        ('建築', 'けんちく', 'Architecture / building', 'ဗိသုကာလက်ရာ', 'noun', 'heiban', 0),
        ('設計', 'せっけい', 'Plan / blueprint design', 'ပုံစံဒီဇိုင်းရေးဆွဲခြင်း', 'noun', 'heiban', 0),
        ('文学', 'ぶんがく', 'Literature', 'စာပေအနုပညာ', 'noun', 'atamadaka', 1),
        ('小説', 'しょうせつ', 'Novel / fiction', 'ဝတ္ထု', 'noun', 'heiban', 0),
        ('随筆', 'ずいひつ', 'Essay / miscellaneous jottings', 'အက်ဆေးစာပေ', 'noun', 'heiban', 0),
        ('俳句', 'はいく', 'Haiku seventeen-mora poem', 'ဟိုက္ကူကဗျာတို', 'noun', 'atamadaka', 1),
        ('戯曲', 'ぎきょく', 'Drama / theater play script', 'ဇာတ်ညွှန်းပြဇာတ်', 'noun', 'heiban', 0),
        ('演劇', 'えんげき', 'Theatrical drama play', 'ဇာတ်သဘင်ပြဇာတ်', 'noun', 'heiban', 0),
        ('俳優', 'はいゆう', 'Actor / performer', 'သရုပ်ဆောင်မင်းသား/မင်းသမီး', 'noun', 'heiban', 0),
        ('脚本', 'きゃくほん', 'Scenario / script', 'ဇာတ်လမ်းဇာတ်ညွှန်း', 'noun', 'heiban', 0),
        ('演出', 'えんしゅつ', 'Stage direction / production', 'ဇာတ်ခုံဒါရိုက်တာလုပ်ဆောင်ချက်', 'noun', 'heiban', 0),
        ('楽譜', 'がくふ', 'Musical score sheet', 'ဂီတသင်္ကေတစာရွက်', 'noun', 'heiban', 0),
        ('指揮者', 'しきしゃ', 'Orchestra conductor', 'တီးဝိုင်းခေါင်းဆောင်ကွပ်ကဲသူ', 'noun', 'nakadaka', 2),
        ('合唱', 'がっしょう', 'Chorus singing / choir', 'သံပြိုင်သီဆိုခြင်း', 'noun', 'heiban', 0),
        ('交響曲', 'こうきょうきょく', 'Symphony orchestra piece', 'ဆင်ဖိုနီဂီတသံစဉ်', 'noun', 'nakadaka', 3),
        ('鑑賞', 'かんしょう', 'Art appreciation', 'အနုပညာခံစားကြည်နူးခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in arts:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 19. Computing, IT Network & Telecommunications
    tech = [
        ('通信', 'つうしん', 'Telecommunication / transmission', 'ဆက်သွယ်ရေးကွန်ရက်', 'noun', 'heiban', 0),
        ('端末', 'たんまつ', 'Computer terminal / end device', 'အသုံးပြုသူလက်ကိုင်ကိရိယာ', 'noun', 'heiban', 0),
        ('回線', 'かいせん', 'Network telephone line', 'ဆက်သွယ်ရေးလိုင်း', 'noun', 'heiban', 0),
        ('帯域', 'たいいき', 'Bandwidth spectrum', 'လှိုင်းနှုန်းလှိုင်းခွင်', 'noun', 'atamadaka', 1),
        ('基地局', 'きちきょく', 'Base station transmitter', 'ဆက်သွယ်ရေးတာဝါတိုင်စခန်း', 'noun', 'nakadaka', 2),
        ('サーバー', 'サーバー', 'Network server', 'ဆာဗာစနစ်', 'noun', 'atamadaka', 1),
        ('データベース', 'データベース', 'Database archive', 'အချက်အလက်ဘဏ်', 'noun', 'nakadaka', 4),
        ('クラウド', 'クラウド', 'Cloud computing storage', 'ကလောက်ဒ်သိမ်းဆည်းမှု', 'noun', 'nakadaka', 2),
        ('復旧', 'ふっきゅう', 'Restoration / recovery of system', 'မူလအတိုင်းပြန်လည်ကောင်းမွန်စေခြင်း', 'noun', 'heiban', 0),
        ('認証', 'にんしょう', 'Authentication / verification', 'စစ်မှန်ကြောင်းအတည်ပြုခြင်း', 'noun', 'heiban', 0),
        ('指紋認証', 'しもんにんしょう', 'Fingerprint biometric scan', 'လက်ဗွေရာစစ်ဆေးအတည်ပြုခြင်း', 'noun', 'nakadaka', 4),
        ('顔認証', 'かおにんしょう', 'Facial recognition scan', 'မျက်နှာဖတ်စနစ်', 'noun', 'nakadaka', 3),
        ('自動化', 'じどうか', 'Automation', 'အလိုအလျောက်လုပ်ဆောင်မှု', 'noun', 'heiban', 0),
        ('センサー', 'センサー', 'Electronic sensor', 'အာရုံခံကိရိယာ', 'noun', 'atamadaka', 1),
        ('遠隔操作', 'えんかくそうさ', 'Remote operation control', 'အဝေးထိန်းစနစ်ဖြင့်ခုတ်မောင်းခြင်း', 'noun', 'nakadaka', 4),
        ('仮想現実', 'かそうげんじつ', 'Virtual reality (VR)', 'အတုမဲ့လက်တွေ့ဘဝ', 'noun', 'nakadaka', 4),
        ('拡張現実', 'かくちょうげんじつ', 'Augmented reality (AR)', 'ပေါင်းစပ်လက်တွေ့ဘဝ', 'noun', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in tech:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 20. Sports, Competitions & Hobbies
    sports = [
        ('競技', 'きょうぎ', 'Game / match / athletic sport', 'အားကစားပြိုင်ပွဲ', 'noun', 'atamadaka', 1),
        ('審判', 'しんぱん', 'Referee / umpire / judging', 'ဒိုင်လူကြီး', 'noun', 'atamadaka', 1),
        ('反則', 'はんそく', 'Foul / infraction of rules', 'စည်းမျဉ်းဖောက်ဖျက်မှု', 'noun', 'heiban', 0),
        ('延長戦', 'えんちょうせん', 'Overtime extra-innings game', 'အချိန်ပိုယှဉ်ပြိုင်မှု', 'noun', 'heiban', 0),
        ('決勝戦', 'けっしょうせん', 'Championship finals match', 'ဗိုလ်လုပွဲ', 'noun', 'nakadaka', 3),
        ('準決勝', 'じゅんけっしょう', 'Semi-final match', 'ဆီမီးဖိုင်နယ်ပွဲ', 'noun', 'nakadaka', 3),
        ('予選', 'よせん', 'Preliminary round heat', 'ခြေစစ်ပွဲ', 'noun', 'heiban', 0),
        ('表彰', 'ひょうしょう', 'Public commendation / award ceremony', 'ဂုဏ်ပြုချီးကျူးခြင်း', 'noun', 'heiban', 0),
        ('世界記録', 'せかいきろく', 'World record', 'ကမ္ဘာ့စံချိန်', 'noun', 'nakadaka', 4),
        ('開会式', 'かいかいしき', 'Opening ceremony', 'ဖွင့်ပွဲအခမ်းအနား', 'noun', 'nakadaka', 3),
        ('閉会式', 'へいかいしき', 'Closing ceremony', 'ပိတ်ပွဲအခမ်းအနား', 'noun', 'nakadaka', 3),
        ('登山', 'とざん', 'Mountain climbing', 'တောင်တက်ခြင်း', 'noun', 'atamadaka', 1),
        ('遭難', 'そうなん', 'Disaster at sea / shipwreck / mountain distress', 'ဘေးအန္တရာယ်နှင့်ကြုံတွေ့ခြင်း', 'noun', 'heiban', 0),
        ('救助', 'きゅうじょ', 'Rescue / relief operation', 'ကယ်ဆယ်ရေးလုပ်ငန်း', 'noun', 'atamadaka', 1),
        ('園芸', 'えんげい', 'Gardening / horticulture', 'ဥယျာဉ်ခြံစိုက်ပျိုးရေး', 'noun', 'heiban', 0),
        ('将棋', 'しょうぎ', 'Japanese chess (shogi)', 'ဂျပန်စစ်တုရင်', 'noun', 'heiban', 0),
        ('骨董品', 'こっとうひん', 'Antique / curio', 'ရှေးဟောင်းပစ္စည်း', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in sports:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 21. Cuisine, Delicacies & Culinary Traditions
    culinary = [
        ('燻製', 'くんせい', 'Smoked food / smoking', 'မီးခိုးကြပ်တိုက်အစားအစာ', 'noun', 'heiban', 0),
        ('惣菜', 'そうざい', 'Daily side dish / delicatessen', 'ချက်ပြီးသားအဆာပြေဟင်းလျာ', 'noun', 'heiban', 0),
        ('珍味', 'ちんみ', 'Delicacy / rare palate treat', 'ရှားပါးမြိန်ဖွယ်အရသာ', 'noun', 'atamadaka', 1),
        ('郷土料理', 'きょうどりょうり', 'Local regional cuisine', 'ဒေသထွက်ရိုးရာအစားအစာ', 'noun', 'nakadaka', 4),
        ('精進料理', 'しょうじんりょうり', 'Buddhist vegetarian cuisine', 'ဗုဒ္ဓဘာသာသတ်သတ်လွတ်ဟင်းလျာ', 'noun', 'nakadaka', 5),
        ('料亭', 'りょうてい', 'Traditional high-class Japanese restaurant', 'အဆင့်မြင့်ရိုးရာစားသောက်ဆိုင်', 'noun', 'heiban', 0),
        ('食べ放題', 'たべほうだい', 'All-you-can-eat buffet', 'စိတ်ကြိုက်အဝစားစနစ်', 'noun', 'heiban', 0),
        ('飲み放題', 'のみほうだい', 'All-you-can-drink system', 'စိတ်ကြိုက်အဝသောက်စနစ်', 'noun', 'heiban', 0),
        ('旬', 'しゅん', 'Peak season of fruit / fish', 'ရာသီပေါ်အစားအစာအရသာအရှိဆုံးအချိန်', 'noun', 'heiban', 0),
        ('銘柄', 'めいがら', 'Brand name / stock name', 'နာမည်ကြီးတံဆိပ်', 'noun', 'heiban', 0),
        ('有機栽培', 'ゆうきさいばい', 'Organic farming cultivation', 'သဘာဝမြေဩဇာသုံးစိုက်ပျိုးမှု', 'noun', 'nakadaka', 4),
        ('添加物', 'てんかぶつ', 'Chemical food additive', 'ဓာတုတာရှည်ခံပစ္စည်း', 'noun', 'nakadaka', 3),
        ('保存料', 'ほぞんりょう', 'Preservative', 'တာရှည်ခံဆေး', 'noun', 'nakadaka', 2),
        ('賞味期限', 'しょうみきげん', 'Best-before date for optimum taste', 'အရသာအကောင်းဆုံးခံနိုင်သည့်ရက်စွဲ', 'noun', 'nakadaka', 4),
        ('消費期限', 'しょうひきげん', 'Use-by expiration deadline date', 'နောက်ဆုံးစားသုံးရန်သက်တမ်းကုန်ရက်စွဲ', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in culinary:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 22. Textiles, Fabrics & Fashion Craft
    textiles = [
        ('繊維', 'せんい', 'Fiber / textile filament', 'အမျှင်ဓာတ် / အထည်အလိပ်မျှင်', 'noun', 'atamadaka', 1),
        ('織物', 'おりもの', 'Woven textile / cloth', 'ရက်ကန်းထည်', 'noun', 'heiban', 0),
        ('絹', 'きぬ', 'Silk', 'ပိုးထည်', 'noun', 'atamadaka', 1),
        ('木綿', 'もめん', 'Cotton cloth', 'ချည်ထည်', 'noun', 'heiban', 0),
        ('麻', 'あさ', 'Linen / hemp / flax', 'လျှော်တေထည်', 'noun', 'nakadaka', 2),
        ('毛皮', 'けがわ', 'Fur / pelt', 'သားမွေးထည်', 'noun', 'heiban', 0),
        ('合成繊維', 'ごうせいせんい', 'Synthetic synthetic fibers', 'ဓာတုချည်မျှင်တု', 'noun', 'nakadaka', 4),
        ('裁縫', 'さいほう', 'Sewing / needlework', 'အဝတ်ချုပ်လုပ်ငန်း', 'noun', 'heiban', 0),
        ('編み物', 'あみもの', 'Knitting / crochet', 'သိုးမွေးထိုးလုပ်ငန်း', 'noun', 'nakadaka', 2),
        ('流行', 'りゅうこう', 'Trend / fashion craze / epidemic', 'ခေတ်စားမှု / ရေပန်းစားမှု', 'noun', 'heiban', 0),
        ('定番', 'ていばん', 'Standard classic item', 'အမြဲတမ်းခေတ်မမီဘဲလူကြိုက်များသည့်ပစ္စည်း', 'noun', 'heiban', 0),
        ('身だしなみ', 'みだしなみ', 'Personal grooming / neat appearance', 'သပ်ရပ်ကျနစွာဝတ်ဆင်မှု', 'noun', 'nakadaka', 3),
        ('礼服', 'れいふく', 'Ceremonial formal attire', 'အခမ်းအနားတက်ဝတ်စုံ', 'noun', 'heiban', 0),
        ('普段着', 'ふだんぎ', 'Everyday casual clothes', 'သာမန်နေ့စဉ်ဝတ်အဝတ်အစား', 'noun', 'heiban', 0),
        ('部屋着', 'へやぎ', 'Loungewear / homewear', 'အိမ်နေရင်းဝတ်စုံ', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in textiles:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 23. More Advanced Intermediate Verbs
    more_verbs = [
        ('受け継ぐ', 'うけつぐ', 'To inherit / take over heritage', 'အမွေဆက်ခံယူသည်', 'verb', 'nakadaka', 3),
        ('差し引く', 'さしひく', 'To deduct / balance out', 'နုတ်ပယ်ချေဖျက်သည်', 'verb', 'nakadaka', 3),
        ('突き詰める', 'つきつめる', 'To investigate thoroughly / get to bottom', 'အစအဆုံးအမြစ်ပြတ်စူးစမ်းသည်', 'verb', 'nakadaka', 4),
        ('見せびらかす', 'みせびらかす', 'To show off / flaunt boastfully', 'ကြွားဝါပြသသည်', 'verb', 'nakadaka', 5),
        ('持ち越す', 'もちこす', 'To carry over to next phase', 'နောက်တစ်ကြိမ်သို့ရွှေ့ဆိုင်းသယ်ဆောင်သည်', 'verb', 'nakadaka', 3),
        ('打ち切る', 'うちきる', 'To discontinue / abort / break off', 'ရပ်စဲပယ်ဖျက်သည်', 'verb', 'nakadaka', 3),
        ('割り出す', 'わりだす', 'To calculate / infer from data', 'တွက်ချက်ခန့်မှန်းထုတ်ယူသည်', 'verb', 'nakadaka', 3),
        ('引き出す', 'ひきだす', 'To withdraw money / draw out talent', 'ငွေထုတ်သည် / အရည်အချင်းကိုဆွဲထုတ်သည်', 'verb', 'nakadaka', 3),
        ('立ち上げる', 'たちあげる', 'To launch a project / boot PC', 'စတင်မတည်ထူထောင်သည်', 'verb', 'nakadaka', 4),
        ('巻き込む', 'まきこむ', 'To involve / drag into trouble', 'ပါဝင်ပတ်သက်စေသည်', 'verb', 'nakadaka', 3),
        ('踏みとどまる', 'ふみとどまる', 'To hold one’s ground / stand firm', 'မဆုတ်မနစ်ခိုင်မြဲစွာရပ်တည်သည်', 'verb', 'nakadaka', 5),
        ('言いふらす', 'いいふらす', 'To spread rumors / broadcast news', 'ကောလာဟလဖြန့်ဝေသည်', 'verb', 'nakadaka', 4),
        ('聞き返す', 'ききかえす', 'To ask back / inquire again', 'ပြန်လည်မေးမြန်းသည်', 'verb', 'nakadaka', 3),
        ('読み落とす', 'よみおとす', 'To miss reading / overlook line', 'စာကြောင်းကျန်ဖတ်မိသည်', 'verb', 'nakadaka', 4),
        ('書き留める', 'かきとめる', 'To write down / record note', 'မှတ်တမ်းတင်ရေးမှတ်သည်', 'verb', 'nakadaka', 4),
        ('問い合わせる', 'といあわせる', 'To make an inquiry / check', 'စုံစမ်းမေးမြန်းသည်', 'verb', 'nakadaka', 5),
        ('申し出る', 'もうしでる', 'To offer / tender / propose', 'ကမ်းလှမ်းတင်ပြသည်', 'verb', 'nakadaka', 4),
        ('出くわす', 'でくわす', 'To run into / encounter by chance', 'မမျှော်လင့်ဘဲဆုံတွေ့သည်', 'verb', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in more_verbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 24. Intermediate Adverbs, Nuances & Modifiers
    nuances = [
        ('いかにも', 'いかにも', 'Truly / indeed / typically', 'အမှန်စင်စစ်အတိုင်း / အလွန်ပင်', 'adverb', 'nakadaka', 2),
        ('どうやら', 'どうやら', 'Appears to be / somehow', 'ကြည့်ရတာတော့ / တစ်နည်းနည်းဖြင့်', 'adverb', 'atamadaka', 1),
        ('かつて', 'かつて', 'Once / formerly in past', 'တစ်ချိန်တစ်ခါက', 'adverb', 'atamadaka', 1),
        ('おそらく', 'おそらく', 'Probably / in all likelihood', 'ဖြစ်နိုင်ခြေများစွာဖြင့်', 'adverb', 'nakadaka', 2),
        ('まさに', 'まさに', 'Exactly / precisely at that moment', 'အတိအကျထိုအချိန်၌ပင်', 'adverb', 'atamadaka', 1),
        ('とっくに', 'とっくに', 'Long ago / already', 'ကြာမြင့်စွာကတည်းက', 'adverb', 'heiban', 0),
        ('つくづく', 'つくづく', 'Deeply / thoroughly / keenly', 'နက်နက်ရှိုင်းရှိုင်းအလေးအနက်', 'adverb', 'heiban', 0),
        ('しみじみ', 'しみじみ', 'Heartfelt / keenly emotional', 'ရင်ထဲစွဲနစ်လျက်', 'adverb', 'nakadaka', 3),
        ('まんまと', 'まんまと', 'Completely tricked / slickly', 'အလိမ်မိလျက် / လုံးဝဥဿုံ', 'adverb', 'atamadaka', 1),
        ('すんなり', 'すんなり', 'Smoothly / easily without resistance', 'ချောချောမောမောလွယ်ကူစွာ', 'adverb', 'nakadaka', 3),
        ('めっきり', 'めっきり', 'Remarkably / noticeably (colder etc)', 'သိသိသာသာကြီး', 'adverb', 'nakadaka', 3),
        ('さほど', 'さほど', 'Not so much / not particularly', 'ထိုမျှလောက်မ...ပါ', 'adverb', 'heiban', 0),
        ('いわゆる', 'いわゆる', 'So-called', 'ခေါ်ဆိုအပ်သော', 'adverb', 'nakadaka', 2),
        ('ひいては', 'ひいては', 'Not only that but also / extending to', 'ထိုမှတစ်ဆင့်ကျယ်ပြန့်စွာ', 'adverb', 'nakadaka', 2),
        ('なまじ', 'なまじ', 'Half-heartedly / rashly', 'မရေမရာမပြတ်မသားဖြင့်', 'adverb', 'heiban', 0),
        ('あながち', 'あながち', 'Not necessarily (with neg)', 'လုံးလုံးလျားလျားဟုတော့မဆိုနိုင်', 'adverb', 'heiban', 0),
        ('かろうじて', 'かろうじて', 'Barely / only just managed to', 'မနည်းကပ်သီးကပ်သတ်', 'adverb', 'nakadaka', 2),
        ('なんとなく', 'なんとなく', 'Somehow or other / without reason', 'အကြောင်းပြချက်မရှိဘဲစိတ်ထဲတွင်', 'adverb', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in nuances:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 25. Psychological States & Human Sentiments
    sentiments = [
        ('虚無感', 'きょむかん', 'Sense of emptiness / nihilism', 'အရာရာဟာလာဟင်းလင်းဖြစ်သည်ဟူသောအသိ', 'noun', 'nakadaka', 3),
        ('躍動感', 'やくどうかん', 'Vibrancy / liveliness', 'တက်ကြွလန်းဆန်းသောခံစားမှု', 'noun', 'nakadaka', 3),
        ('充実感', 'じゅうじつかん', 'Sense of fulfillment / accomplishment', 'ပြည့်စုံတင်းတိမ်သောခံစားမှု', 'noun', 'nakadaka', 3),
        ('幸福感', 'こうふくかん', 'Feeling of happiness', 'ပျော်ရွှင်ချမ်းမြေ့မှုခံစားချက်', 'noun', 'nakadaka', 3),
        ('憂鬱', 'ゆううつ', 'Depression / melancholia', 'စိတ်ညစ်ညူးမှု', 'adjective', 'heiban', 0),
        ('歓声', 'かんせい', 'Cheer / shout of joy', 'ဝမ်းသာအားရအော်ဟစ်သံ', 'noun', 'heiban', 0),
        ('悲鳴', 'ひめい', 'Scream / shriek of pain', 'အော်ဟစ်အကူအညီတောင်းသံ', 'noun', 'heiban', 0),
        ('溜息', 'ためいき', 'Sigh of grief or relief', 'သက်ပြင်းချသံ', 'noun', 'heiban', 0),
        ('微笑', 'びしょう', 'Smile / faint beam', 'ပြုံးရွှင်မှု', 'noun', 'heiban', 0),
        ('苦笑', 'くしょう', 'Bittersweet smile / wry smile', 'မချိသွားဖြဲပြုံးခြင်း', 'noun', 'heiban', 0),
        ('嘲笑', 'ちょうしょう', 'Scornful laugh / sneer', 'လှောင်ပြောင်ရယ်မောခြင်း', 'noun', 'heiban', 0),
        ('瞑想', 'めいそう', 'Meditation / contemplation', 'တရားထိုင်ရှုမှတ်ခြင်း', 'noun', 'heiban', 0),
        ('昂揚', 'こうよう', 'Elevation of spirits / uplift', 'စိတ်ဓာတ်တက်ကြွမြှင့်မားခြင်း', 'noun', 'heiban', 0),
        ('狼狽', 'ろうばい', 'Confusion / fluster / panic', 'ပျာယာခတ်ရုန်းကန်ခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in sentiments:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 26. City, Architecture & Property Living
    housing_prop = [
        ('高層ビル', 'こうそうビル', 'Skyscraper / high-rise building', 'မိုးမျှော်တိုက်ကြီး', 'noun', 'nakadaka', 4),
        ('商店街', 'しょうてんがい', 'Shopping district arcade', 'စျေးဆိုင်တန်းလမ်းမ', 'noun', 'nakadaka', 3),
        ('地下街', 'ちかがい', 'Underground shopping mall', 'မြေအောက်စျေးတန်း', 'noun', 'heiban', 0),
        ('歩行者天国', 'ほこうしゃてんごく', 'Pedestrian mall paradise', 'လူလျှောက်လမ်းသီးသန့်ဇုန်', 'noun', 'nakadaka', 5),
        ('繁華街', 'はんかがい', 'Busy downtown district', 'စည်ကားသောမြို့လယ်ရပ်ကွက်', 'noun', 'nakadaka', 3),
        ('住宅街', 'じゅうたくがい', 'Residential neighborhood', 'လူနေအိမ်ခြေဧရိယာ', 'noun', 'nakadaka', 4),
        ('郊外', 'こうがい', 'Suburbs / outskirts', 'မြို့စွန်ဆင်ခြေဖုံး', 'noun', 'atamadaka', 1),
        ('敷地', 'しきち', 'Site / plot of land', 'မြေကွက်ဝင်း', 'noun', 'heiban', 0),
        ('耐震', 'たいしん', 'Earthquake-resistant structure', 'ငလျင်ဒဏ်ခံနိုင်သောတည်ဆောက်ပုံ', 'noun', 'heiban', 0),
        ('防音', 'ぼうおん', 'Soundproofing / acoustic insulation', 'အသံလုံစနစ်', 'noun', 'heiban', 0),
        ('断熱', 'だんねつ', 'Thermal insulation', 'အပူကာစနစ်', 'noun', 'heiban', 0),
        ('換気', 'かんき', 'Ventilation / airing', 'လေဝင်လေထွက်ကောင်းမွန်စေခြင်း', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in housing_prop:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 27. Education, Human Stages & School Events
    education = [
        ('思春期', 'ししゅんき', 'Puberty / adolescence', 'ဆယ်ကျော်သက်အရွယ်', 'noun', 'nakadaka', 2),
        ('恩師', 'おんし', 'Respected teacher / former mentor', 'ကျေးဇူးရှင်ဆရာသမား', 'noun', 'atamadaka', 1),
        ('母校', 'ぼこう', 'Alma mater school', 'မိခင်ကျောင်းတော်ကြီး', 'noun', 'atamadaka', 1),
        ('同窓会', 'どうそうかい', 'Alumni reunion gathering', 'ကျောင်းသားဟောင်းများပြန်လည်ဆုံဆည်းပွဲ', 'noun', 'nakadaka', 3),
        ('卒業証書', 'そつぎょうしょうしょ', 'Graduation diploma certificate', 'ဘွဲ့လက်မှတ် / ကျောင်းပြီးလက်မှတ်', 'noun', 'nakadaka', 5),
        ('部活動', 'ぶかつどう', 'Club extracurricular activities', 'ကျောင်းတွင်းကလပ်အသင်းလှုပ်ရှားမှု', 'noun', 'nakadaka', 3),
        ('合宿', 'がっしゅく', 'Training camp retreat', 'စခန်းသွင်းလေ့ကျင့်ပွဲ', 'noun', 'heiban', 0),
        ('修学旅行', 'しゅうがくりょこう', 'School excursion educational trip', 'ကျောင်းသားလေ့လာရေးခရီးစဉ်', 'noun', 'nakadaka', 5),
        ('文化祭', 'ぶんかさい', 'School cultural festival', 'ကျောင်းယဉ်ကျေးမှုပွဲတော်', 'noun', 'nakadaka', 3),
        ('体育祭', 'たいいくさい', 'Sports athletics festival', 'ကျောင်းအားကစားပွဲတော်', 'noun', 'nakadaka', 4),
    ]
    for ja, kana, en, my, pos, pp, d in education:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 28. Living Organisms, Zoology & Botany
    organisms = [
        ('哺乳類', 'ほにゅうるい', 'Mammals', 'နို့တိုက်သတ္တဝါများ', 'noun', 'nakadaka', 3),
        ('爬虫類', 'はちゅうるい', 'Reptiles', 'တွားသွားသတ္တဝါများ', 'noun', 'nakadaka', 3),
        ('両生類', 'りょうせいるい', 'Amphibians', 'ကုန်းနေရေနေသတ္တဝါများ', 'noun', 'nakadaka', 4),
        ('鳥類', 'ちょうるい', 'Birds / avian species', 'ငှက်မျိုးစိတ်များ', 'noun', 'atamadaka', 1),
        ('昆虫', 'こんちゅう', 'Insects / bugs', 'အင်းဆက်ပိုးမွှားများ', 'noun', 'heiban', 0),
        ('甲殻類', 'こうかくるい', 'Crustaceans', 'အခွံမာရေသတ္တဝါများ', 'noun', 'nakadaka', 4),
        ('渡り鳥', 'わたりどり', 'Migratory birds', 'ဆောင်းခိုငှက်များ', 'noun', 'nakadaka', 3),
        ('幼虫', 'ようちゅう', 'Larva / caterpillar', 'ပိုးလောင်း', 'noun', 'heiban', 0),
        ('蛹', 'さなぎ', 'Pupa / chrysalis', 'ပိုးတုံးလုံး', 'noun', 'heiban', 0),
        ('成虫', 'せいちゅう', 'Adult insect / imago', 'အင်းဆက်အရွယ်ရောက်ကောင်', 'noun', 'heiban', 0),
        ('孵化', 'ふか', 'Hatching of egg', 'ဥဖောက်ခြင်း', 'noun', 'atamadaka', 1),
        ('脱皮', 'だっぴ', 'Ecdysis / shedding skin / molting', 'အရေခွံလဲခြင်း', 'noun', 'heiban', 0),
        ('冬眠', 'とうみん', 'Hibernation winter sleep', 'ဆောင်းခိုအိပ်စက်ခြင်း', 'noun', 'heiban', 0),
        ('落葉樹', 'らくようじゅ', 'Deciduous tree', 'ရွက်ကြွေပင်', 'noun', 'nakadaka', 3),
        ('常緑樹', 'じょうりょくじゅ', 'Evergreen tree', 'အမြဲစိမ်းပင်', 'noun', 'nakadaka', 4),
        ('高山植物', 'こうざんしょくぶつ', 'Alpine flora plant', 'တောင်မြင့်ဒေသအပင်', 'noun', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in organisms:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 29. Traditional Japanese Utensils & Living Crafts
    utensils = [
        ('急須', 'きゅうす', 'Small teapot for green tea', 'ဂျပန်လက်ဖက်ရည်ကရား', 'noun', 'atamadaka', 1),
        ('湯呑み', 'ゆのみ', 'Tea teacup for green tea', 'ဂျပန်လက်ဖက်ရည်သောက်ခွက်', 'noun', 'heiban', 0),
        ('爪楊枝', 'つまようじ', 'Toothpick', 'သွားကြားထိုးတံ', 'noun', 'nakadaka', 3),
        ('栓抜き', 'せんぬき', 'Bottle opener', 'ပုလင်းဖွင့်တံ', 'noun', 'nakadaka', 3),
        ('缶切り', 'かんきり', 'Can opener', 'သံဗူးဖွင့်တံ', 'noun', 'nakadaka', 3),
        ('まな板', 'まないた', 'Cutting board / chopping board', 'စင်းတီတုံး', 'noun', 'heiban', 0),
        ('包丁', 'ほうちょう', 'Kitchen chef knife', 'မီးဖိုချောင်သုံးဓား', 'noun', 'heiban', 0),
        ('水筒', 'すいとう', 'Water bottle / canteen flask', 'ရေဗူး', 'noun', 'heiban', 0),
        ('弁当箱', 'べんとうばこ', 'Lunch box bento case', 'ထမင်းဘူး', 'noun', 'nakadaka', 3),
        ('箸置き', 'はしおき', 'Chopstick rest', 'တူတင်ခုံ', 'noun', 'nakadaka', 2),
    ]
    for ja, kana, en, my, pos, pp, d in utensils:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 30. More Essential Intermediate Verbs
    extra_n3_verbs = [
        ('打ち明ける', 'うちあける', 'To open heart / confide', 'ရင်ဖွင့်ပြောဆိုသည်', 'verb', 'nakadaka', 4),
        ('思い直す', 'おもいなおす', 'To rethink / change mind', 'ပြန်လည်စဉ်းစားဆုံးဖြတ်သည်', 'verb', 'nakadaka', 4),
        ('見合わせる', 'みあわせる', 'To look at each other / postpone', 'အပြန်အလှန်ကြည့်သည် / ရွှေ့ဆိုင်းသည်', 'verb', 'nakadaka', 4),
        ('引き寄せる', 'ひきよせる', 'To draw near / pull close', 'ဆွဲငင်နီးကပ်စေသည်', 'verb', 'nakadaka', 4),
        ('押し寄せる', 'おしよせる', 'To surge forward / advance on', 'လှိုင်းလုံးကြီးသဖွယ်အတင်းတိုးဝင်သည်', 'verb', 'nakadaka', 4),
        ('擦れ違う', 'すれちがう', 'To pass by each other / miss each other', 'ဘေးချင်းကပ်ဖြတ်သွားသည်', 'verb', 'nakadaka', 4),
        ('行き詰まる', 'いきづまる', 'To reach dead end / impasse', 'လမ်းဆုံး၍ရှေ့မဆက်နိုင်ဖြစ်သည်', 'verb', 'nakadaka', 4),
        ('行き渡る', 'いきわたる', 'To circulate / reach everyone', 'အနှံ့အပြားရောက်ရှိသည်', 'verb', 'nakadaka', 4),
        ('巡り会う', 'めぐりあう', 'To meet by chance after years', 'ကြာမြင့်စွာကွဲကွာပြီးမှပြန်တွေ့သည်', 'verb', 'nakadaka', 4),
        ('振り返る', 'ふりかえる', 'To turn around / reflect on past', 'လှည့်ကြည့်သည် / အတိတ်ကိုပြန်လည်တွေးတောသည်', 'verb', 'nakadaka', 4),
        ('立ち向かう', 'たちむかう', 'To stand up to danger / confront', 'အခက်အခဲကိုရဲရဲရင်ဆိုင်သည်', 'verb', 'nakadaka', 4),
        ('待ち構える', 'まちかまえる', 'To lie in wait for / expect', 'အသင့်ကြိုတင်စောင့်ဆိုင်းနေသည်', 'verb', 'nakadaka', 5),
        ('受け止める', 'うけとめる', 'To catch blow / take in feedback', 'ခံယူတုံ့ပြန်သည်', 'verb', 'nakadaka', 4),
        ('割り当てる', 'わりあてる', 'To allocate / assign share', 'ခွဲဝေချထားပေးသည်', 'verb', 'nakadaka', 4),
        ('切り出す', 'きりだす', 'To cut out timber / begin talking of topic', 'သစ်ခုတ်ထုတ်သည် / စကားစတင်ပြောဆိုသည်', 'verb', 'nakadaka', 3),
        ('投げ出す', 'なげだす', 'To throw down / abandon task halfway', 'ပစ်ချလိုက်သည် / လမ်းခုလတ်မှာလက်လျှော့သည်', 'verb', 'nakadaka', 3),
        ('逃げ惑う', 'にげまどう', 'To flee in confusion / panic', 'ဘယ်ပြေးရမှန်းမသိပြေးလွှားသည်', 'verb', 'nakadaka', 4),
        ('駆け引き', 'かけひき', 'Bargaining / tactical maneuvering', 'အကွက်ချကစားညှိနှိုင်းမှု', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in extra_n3_verbs:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 31. Four-Character Idioms & Proverbs (Yojijukugo)
    idioms = [
        ('一石二鳥', 'いっせきにちょう', 'Killing two birds with one stone', 'ခဲတစ်လုံးတည်းဖြင့် ငှက်နှစ်ကောင်ပစ်ခြင်း', 'noun', 'nakadaka', 5),
        ('十人十色', 'じゅうにんといろ', 'To each their own / ten men ten minds', 'လူဆယ်ယောက်ဆယ်စိတ်ဆယ်ပါး', 'noun', 'nakadaka', 5),
        ('自業自得', 'じごうじとく', 'Reaping what one sows', 'ကိုယ့်ကြမ္မာကိုယ်ဖန်တီးခြင်း / မိမိအကျိုးမိမိခံစားရခြင်း', 'noun', 'heiban', 0),
        ('危機一髪', 'ききいっぱつ', 'Hairbreadth escape / critical moment', 'ဆံခြည်တစ်မျှင်အရေးကြုံချိန်', 'noun', 'nakadaka', 4),
        ('一期一会', 'いちごいちえ', 'Once-in-a-lifetime encounter', 'ဘဝမှာတစ်ခါသာဆုံတွေ့ရခြင်း', 'noun', 'nakadaka', 4),
        ('異口同音', 'いくどうおん', 'With one accord / unanimous voice', 'တညီတညွတ်တည်းသံပြိုင်', 'noun', 'heiban', 0),
        ('以心伝心', 'いしんでんしん', 'Telepathy / tacit understanding', 'နှလုံးသားချင်းစကားပြောခြင်း', 'noun', 'heiban', 0),
        ('四面楚歌', 'しめんそか', 'Surrounded by enemies on all sides', 'လေးဖက်လေးတန်ရန်သူဝိုင်းထားခြင်း', 'noun', 'heiban', 0),
        ('試行錯誤', 'しこうさくご', 'Trial and error', 'မှားမှားမှန်မှန်စမ်းသပ်လုပ်ဆောင်ခြင်း', 'noun', 'nakadaka', 4),
        ('悪戦苦闘', 'あくせんくとう', 'Desperate struggle against odds', 'ခက်ခဲကြမ်းတမ်းစွာတိုက်ပွဲဝင်ခြင်း', 'noun', 'heiban', 0),
        ('起死回生', 'きしかいせい', 'Wake from death to life / miraculous revival', 'သေရာမှပြန်လည်ရှင်သန်ထမြောက်ခြင်း', 'noun', 'heiban', 0),
        ('絶体絶命', 'ぜったいぜつめい', 'Desperate situation / cornered', 'လမ်းဆုံး၍အသက်လုရသောအခြေအနေ', 'noun', 'heiban', 0),
        ('七転び八起き', 'ななころびやおき', 'Fall seven times stand eight / perseverance', 'ခုနစ်ကြိမ်လဲသော်လည်း ရှစ်ကြိမ်ထမြောက်ခြင်း', 'noun', 'nakadaka', 6),
        ('三日坊主', 'みっかぼうず', 'Quitter / giving up after three days', 'သုံးရက်သာစိတ်ပါပြီးလက်လျှော့တတ်သူ', 'noun', 'nakadaka', 4),
        ('一長一短', 'いっちょういったん', 'Advantages and disadvantages', 'ကောင်းကွက်နှင့်ဆိုးကွက်ဒွန်တွဲနေခြင်း', 'noun', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in idioms:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 32. Tools, Workshop & Repair
    workshop = [
        ('接着剤', 'せっちゃくざい', 'Adhesive glue', 'ကော်ရည် / ကော်စေး', 'noun', 'nakadaka', 4),
        ('粘着テープ', 'ねんちゃくテープ', 'Adhesive sticky tape', 'ကော်တိပ်', 'noun', 'nakadaka', 5),
        ('針金', 'はりがね', 'Metal wire', 'သံကြိုး / သတ္တုကြိုး', 'noun', 'heiban', 0),
        ('釘', 'くぎ', 'Iron nail', 'သံမှို', 'noun', 'heiban', 0),
        ('金槌', 'かなづち', 'Iron hammer', 'တူ', 'noun', 'nakadaka', 3),
        ('鋸', 'のこぎり', 'Hand saw', 'လွှ', 'noun', 'nakadaka', 3),
        ('ペンチ', 'ペンチ', 'Pliers / pincers', 'ပလာယာ', 'noun', 'atamadaka', 1),
        ('ドライバー', 'ドライバー', 'Screwdriver tool', 'ဝက်အူလှည့်', 'noun', 'nakadaka', 2),
        ('巻き尺', 'まきじゃく', 'Tape measure', 'ပေကြိုး', 'noun', 'heiban', 0),
        ('脚立', 'きゃたつ', 'Stepladder', 'လှေကားခုံ', 'noun', 'heiban', 0),
        ('ペンキ', 'ペンキ', 'Paint', 'ဆေးသုတ်ဆေး', 'noun', 'atamadaka', 1),
        ('研磨', 'けんま', 'Grinding / polishing', 'ပွတ်တိုက်ချောမွတ်စေခြင်း', 'noun', 'heiban', 0),
        ('切断', 'せつだん', 'Severance / cutting off', 'ဖြတ်တောက်ခြင်း', 'noun', 'heiban', 0),
        ('修繕', 'しゅうぜん', 'Repair / mending', 'ပြင်ဆင်မွမ်းမံခြင်း', 'noun', 'heiban', 0),
        ('補修', 'ほしゅう', 'Patching up / maintenance', 'ဖာထေးပြင်ဆင်ခြင်း', 'noun', 'heiban', 0),
        ('塗装', 'とそう', 'Coating / painting', 'ဆေးသုတ်ခြင်း', 'noun', 'heiban', 0),
        ('設置', 'せっち', 'Installation / establishment', 'တပ်ဆင်ထားရှိခြင်း', 'noun', 'heiban', 0),
        ('撤去', 'てっきょ', 'Removal / dismantling', 'ဖယ်ရှားဖျက်သိမ်းခြင်း', 'noun', 'atamadaka', 1),
    ]
    for ja, kana, en, my, pos, pp, d in workshop:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 33. Health, Wellness & Physical Checkups
    wellness = [
        ('偏食', 'へんしょく', 'Unbalanced diet / picky eating', 'အစားရွေးစားခြင်း', 'noun', 'heiban', 0),
        ('偏頭痛', 'へんずつう', 'Migraine headache', 'ခေါင်းတစ်ခြမ်းကိုက်ရောဂါ', 'noun', 'nakadaka', 3),
        ('歯周病', 'ししゅうびょう', 'Periodontal gum disease', 'သွားဖုံးရောဂါ', 'noun', 'heiban', 0),
        ('骨密度', 'こつみつど', 'Bone mineral density', 'အရိုးသိပ်သည်းဆ', 'noun', 'nakadaka', 3),
        ('視力検査', 'しりょくけんさ', 'Visual acuity eye test', 'မျက်စိအမြင်စစ်ဆေးခြင်း', 'noun', 'nakadaka', 4),
        ('聴力', 'ちょうりょく', 'Hearing ability', 'အကြားအာရုံစွမ်းရည်', 'noun', 'atamadaka', 1),
        ('近視', 'きんし', 'Short-sightedness / myopia', 'အဝေးမှုန်ခြင်း', 'noun', 'heiban', 0),
        ('遠視', 'えんし', 'Farsightedness / hyperopia', 'အနီးမှုန်ခြင်း', 'noun', 'heiban', 0),
        ('紫外線', 'しがいせん', 'Ultraviolet UV rays', 'ခရမ်းလွန်ရောင်ခြည်', 'noun', 'nakadaka', 2),
        ('新陳代謝', 'しんちんたいしゃ', 'Metabolism turnover', 'ဇီဝရုပ်ဖြစ်ပျက်မှု', 'noun', 'nakadaka', 4),
        ('体脂肪率', 'たいしぼうりつ', 'Body fat percentage', 'ခန္ဓာကိုယ်အဆီရာခိုင်နှုန်း', 'noun', 'nakadaka', 4),
        ('有酸素運動', 'ゆうさんそうんどう', 'Aerobic exercise', 'အောက်ဆီဂျင်သုံးအားကစား', 'noun', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in wellness:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 34. Social Etiquette, Seasonal Gifts & Community
    etiquette = [
        ('お中元', 'おちゅうげん', 'Mid-year summer gift', 'နွေလယ်လက်ဆောင်မွန်', 'noun', 'heiban', 0),
        ('お歳暮', 'おせいぼ', 'Year-end winter gift', 'နှစ်ကုန်လက်ဆောင်မွန်', 'noun', 'heiban', 0),
        ('年賀状', 'ねんがじょう', 'New Year greeting postcard', 'နှစ်သစ်မင်္ဂလာနှုတ်ခွန်းဆက်ကတ်', 'noun', 'nakadaka', 3),
        ('暑中見舞い', 'しょちゅうみまい', 'Summer greeting inquiry', 'နွေရာသီမေးမြန်းနှုတ်ဆက်စာ', 'noun', 'nakadaka', 4),
        ('手土産', 'てみやげ', 'Present brought by visitor', 'အလည်သွားရာ၌ယူဆောင်သောလက်ဆောင်', 'noun', 'nakadaka', 2),
        ('餞別', 'せんべつ', 'Farewell parting gift', 'နှုတ်ဆက်လက်ဆောင်ကြေး', 'noun', 'heiban', 0),
        ('寄付', 'きふ', 'Donation / contribution', 'အလှူငွေထည့်ဝင်ခြင်း', 'noun', 'atamadaka', 1),
        ('義援金', 'ぎえんきん', 'Disaster relief donation money', 'သဘာဝဘေးဒုက္ခသည်ထောက်ပံ့ငွေ', 'noun', 'nakadaka', 2),
        ('募金', 'ぼきん', 'Fund-raising campaign', 'ရန်ပုံငွေကောက်ခံခြင်း', 'noun', 'heiban', 0),
        ('粗品', 'そしな', 'Small humble token gift', 'အမှတ်တရပစ္စည်းအသေးစား', 'noun', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in etiquette:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 35. Prefixes, Suffixes & Common Lexical Derivatives
    derivatives = [
        ('近代化', 'きんだいか', 'Modernization', 'ခေတ်မီဖွံ့ဖြိုးတိုးတက်အောင်လုပ်ဆောင်ခြင်း', 'noun', 'heiban', 0),
        ('合理化', 'ごうりか', 'Rationalization / streamlining', 'ယုတ္တိကျကျထိရောက်အောင်ပြင်ဆင်ခြင်း', 'noun', 'heiban', 0),
        ('効率化', 'こうりつか', 'Efficiency promotion', 'လုပ်ငန်းစွမ်းဆောင်ရည်မြှင့်တင်ခြင်း', 'noun', 'heiban', 0),
        ('国際化', 'こくさいか', 'Internationalization', 'နိုင်ငံတကာအဆင့်မီစေခြင်း', 'noun', 'heiban', 0),
        ('情報化', 'じょうほうか', 'Informatization / digital transition', 'သတင်းအချက်အလက်ခေတ်သို့ကူးပြောင်းခြင်း', 'noun', 'heiban', 0),
        ('透明性', 'とうめいせい', 'Transparency', 'ပွင့်လင်းမြင်သာမှု', 'noun', 'heiban', 0),
        ('客観性', 'きゃっかんせい', 'Objectivity', 'ဓမ္မဓိဋ္ဌာန်ကျမှု', 'noun', 'heiban', 0),
        ('主観的', 'しゅかんてき', 'Subjective perspective', 'စိတ်ခံစားမှုအခြေခံသော', 'adjective', 'heiban', 0),
        ('客観的', 'きゃっかんてき', 'Objective perspective', 'အချက်အလက်ဓမ္မဓိဋ္ဌာန်ကျသော', 'adjective', 'heiban', 0),
        ('段階的', 'だんかいてき', 'Gradual / stepwise', 'အဆင့်ဆင့်ပြုလုပ်သော', 'adjective', 'heiban', 0),
        ('体系的', 'たいけいてき', 'Systematic', 'စနစ်ကျနသော', 'adjective', 'heiban', 0),
        ('倫理的', 'りんりてき', 'Ethical / moral', 'ကျင့်ဝတ်သိက္ခာနှင့်ညီသော', 'adjective', 'heiban', 0),
    ]
    for ja, kana, en, my, pos, pp, d in derivatives:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 36. Corporate Meetings, Events & Protocol
    corporate_events = [
        ('日程調整', 'にっていちょうせい', 'Schedule coordination', 'ရက်စွဲညှိနှိုင်းမှု', 'noun', 'nakadaka', 5),
        ('議題', 'ぎだい', 'Topic of discussion / agenda', 'ဆွေးနွေးမည့်အကြောင်းအရာ', 'noun', 'heiban', 0),
        ('招集', 'しょうしゅう', 'Summons / convening meeting', 'အစည်းအဝေးခေါ်ယူခြင်း', 'noun', 'heiban', 0),
        ('欠席届', 'けっせきとどけ', 'Notice of absence', 'ပျက်ကွက်ခွင့်တိုင်ကြားစာ', 'noun', 'nakadaka', 4),
        ('委任状', 'いにんじょう', 'Power of attorney proxy', 'ကိုယ်စားလှယ်လွှဲစာ', 'noun', 'heiban', 0),
        ('満場一致', 'まんじょういっち', 'Unanimous consent', 'တစ်ညီတစ်ညွတ်တည်းသဘောတူခြင်း', 'noun', 'nakadaka', 5),
        ('採決', 'さいけつ', 'Taking a vote', 'မဲခွဲဆုံးဖြတ်ခြင်း', 'noun', 'heiban', 0),
        ('延期', 'えんき', 'Postponement / adjournment', 'ရွှေ့ဆိုင်းခြင်း', 'noun', 'heiban', 0),
        ('主催', 'しゅさい', 'Sponsorship / hosting', 'ဦးစီးကျင်းပသူ', 'noun', 'heiban', 0),
        ('共催', 'きょうさい', 'Joint hosting', 'ပူးတွဲကျင်းပခြင်း', 'noun', 'heiban', 0),
        ('司会', 'しかい', 'Master of ceremonies / MC', 'အခမ်းအနားမှူး', 'noun', 'heiban', 0),
        ('進行', 'しんこう', 'Progress / program advance', 'အစီအစဉ်အတိုင်းဦးဆောင်သွားခြင်း', 'noun', 'heiban', 0),
        ('歓迎会', 'かんげいかい', 'Welcome party', 'ကြိုဆိုပွဲ', 'noun', 'nakadaka', 3),
        ('送別会', 'そうべつかい', 'Farewell party', 'နှုတ်ဆက်ပွဲ', 'noun', 'nakadaka', 3),
        ('忘年会', 'ぼうねんかい', 'Year-end party', 'နှစ်ကုန်ပါတီ', 'noun', 'nakadaka', 3),
        ('新年会', 'しんねんかい', 'New Year party', 'နှစ်သစ်ကြိုဆိုပွဲ', 'noun', 'nakadaka', 3),
        ('親睦会', 'しんぼくかい', 'Social friendly gathering', 'ရင်းနှီးကျွမ်းဝင်ပွဲ', 'noun', 'nakadaka', 3),
        ('懇談会', 'こんだんかい', 'Informal roundtable talk', 'ရင်းနှီးပွင့်လင်းစွာဆွေးနွေးပွဲ', 'noun', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in corporate_events:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 37. Packaging, Stationery & Office Supplies
    supplies = [
        ('段ボール', 'ダンボール', 'Corrugated cardboard box', 'စက္ကူဂျပ်ဖာ', 'noun', 'heiban', 0),
        ('包装紙', 'ほうそうし', 'Wrapping paper', 'လက်ဆောင်ထုပ်စက္ကူ', 'noun', 'nakadaka', 3),
        ('荷札', 'にふだ', 'Baggage tag / label', 'လိပ်စာကတ်ပြား', 'noun', 'nakadaka', 2),
        ('緩衝材', 'かんしょうざい', 'Cushioning packing material', 'အဖုအပိမ့်ပါပလတ်စတစ်ကာကွယ်ပစ္စည်း', 'noun', 'nakadaka', 4),
        ('結束バンド', 'けっそくバンド', 'Cable tie strap', 'ကြိုးစည်းကြိုး', 'noun', 'nakadaka', 5),
        ('封筒', 'ふうとう', 'Envelope for letters', 'စာအိတ်', 'noun', 'heiban', 0),
        ('便箋', 'びんせん', 'Writing letter paper', 'စာရေးစက္ကူ', 'noun', 'heiban', 0),
        ('修正テープ', 'しゅうせいテープ', 'Correction tape', 'မှားဖျက်တိပ်', 'noun', 'nakadaka', 5),
        ('クリップ', 'クリップ', 'Paper clip', 'စက္ကူညှပ်ကလစ်', 'noun', 'atamadaka', 1),
        ('輪ゴム', 'わゴム', 'Rubber elastic band', 'သားရေကွင်း', 'noun', 'nakadaka', 2),
        ('画鋲', 'がびょう', 'Drawing pin / thumbtack', 'တံစို့မှို', 'noun', 'heiban', 0),
        ('マグネット', 'マグネット', 'Magnet', 'သံလိုက်', 'noun', 'atamadaka', 1),
        ('バインダー', 'バインダー', 'Document binder folder', 'ဖိုင်တွဲ', 'noun', 'nakadaka', 2),
    ]
    for ja, kana, en, my, pos, pp, d in supplies:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 38. Additional Everyday Compound Actions
    more_actions = [
        ('呼び出す', 'よびだす', 'To summon / call out to', 'ခေါ်ယူမေးမြန်းသည်', 'verb', 'nakadaka', 3),
        ('呼び止める', 'よびとめる', 'To call someone to stop', 'လှမ်းခေါ်ရပ်တန့်စေသည်', 'verb', 'nakadaka', 4),
        ('連れ出す', 'つれだす', 'To take someone out with', 'အပြင်သို့ခေါ်ထုတ်သွားသည်', 'verb', 'nakadaka', 3),
        ('引き抜く', 'ひきぬく', 'To extract / pluck out / headhunt', 'ဆွဲထုတ်သည် / ဝန်ထမ်းခေါ်ယူသည်', 'verb', 'nakadaka', 3),
        ('汲み取る', 'くみとる', 'To understand feeling / draw up water', 'ခံစားချက်ကိုစာနာနားလည်ပေးသည်', 'verb', 'nakadaka', 3),
        ('買い替える', 'かいかえる', 'To buy new replacement', 'အသစ်လဲဝယ်သည်', 'verb', 'nakadaka', 4),
        ('着替える', 'きがえる', 'To change one’s clothes', 'အဝတ်လဲဝတ်သည်', 'verb', 'nakadaka', 3),
        ('履き替える', 'はきかえる', 'To change shoes / pants', 'ဖိနပ်ဘောင်းဘီလဲဝတ်သည်', 'verb', 'nakadaka', 4),
        ('詰め替える', 'つめかえる', 'To refill bottle / repack', 'ဗူးထဲသို့ပြန်လည်ဖြည့်သွင်းသည်', 'verb', 'nakadaka', 4),
        ('盛り付ける', 'もりつける', 'To dish up / arrange food nicely', 'ပန်းကန်ထဲအလှပြင်ဆင်ထည့်သည်', 'verb', 'nakadaka', 4),
        ('結び付ける', 'むすびつける', 'To tie together / connect logically', 'ချည်နှောင်ဆက်စပ်သည်', 'verb', 'nakadaka', 5),
    ]
    for ja, kana, en, my, pos, pp, d in more_actions:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 39. Civic, Biological & Environmental Systems
    systems = [
        ('交通網', 'こうつうもう', 'Transportation network system', 'သယ်ယူပို့ဆောင်ရေးကွန်ရက်', 'noun', 'heiban', 0),
        ('鉄道網', 'てつどうもう', 'Railway transit network', 'မီးရထားကွန်ရက်', 'noun', 'heiban', 0),
        ('通信網', 'つうしんもう', 'Telecommunications network', 'ဆက်သွယ်ရေးကွန်ရက်စနစ်', 'noun', 'heiban', 0),
        ('物流拠点', 'ぶつりゅうきょてん', 'Logistics hub center', 'ကုန်စည်ပို့ဆောင်ရေးဗဟိုစခန်း', 'noun', 'nakadaka', 4),
        ('地方自治体', 'ちほうじちたい', 'Local self-governing municipality', 'ဒေသန္တရကိုယ်ပိုင်အုပ်ချုပ်ရေးအဖွဲ့', 'noun', 'nakadaka', 5),
        ('住民票', 'じゅうみんひょう', 'Resident certificate of registration', 'သန်းခေါင်စာရင်းအထောက်အထား', 'noun', 'heiban', 0),
        ('戸籍謄本', 'こせきとうほん', 'Official family registry transcript', 'မိသားစုမှတ်ပုံတင်မိတ္တူမှန်', 'noun', 'nakadaka', 4),
        ('印鑑証明', 'いんかんしょうめい', 'Seal registration certificate', 'တရားဝင်တံဆိပ်တုံးမှတ်ပုံတင်လက်မှတ်', 'noun', 'nakadaka', 4),
        ('納税証明', 'のうぜいしょうめい', 'Tax payment tax clearance certificate', 'အခွန်ဆောင်ပြီးကြောင်းသက်သေခံလက်မှတ်', 'noun', 'nakadaka', 4),
        ('食生活', 'しょくせいかつ', 'Dietary eating lifestyle', 'စားသောက်နေထိုင်မှုဓလေ့', 'noun', 'nakadaka', 3),
        ('栄養素', 'えいようそ', 'Nutrient substance', 'အာဟာရဓာတ်', 'noun', 'nakadaka', 3),
        ('炭水化物', 'たんすいかぶつ', 'Carbohydrates', 'ကာဗိုဟိုက်ဒရိတ်', 'noun', 'nakadaka', 4),
        ('脂質', 'ししつ', 'Lipid / dietary fats', 'အဆီဓာတ်', 'noun', 'heiban', 0),
        ('食物繊維', 'しょくもつせんい', 'Dietary roughage fiber', 'အစာချေဖျက်လွယ်သောအမျှင်ဓာတ်', 'noun', 'nakadaka', 5),
        ('カルシウム', 'カルシウム', 'Calcium mineral', 'ကယ်လ်စီယမ်ဓာတ်', 'noun', 'nakadaka', 3),
        ('鉄分', 'てつぶん', 'Iron mineral nutrient', 'သံဓာတ်', 'noun', 'atamadaka', 1),
        ('呼吸器', 'こきゅうき', 'Respiratory organs', 'အသက်ရှူအင်္ဂါအဖွဲ့အစည်း', 'noun', 'nakadaka', 2),
        ('消化器', 'しょうかき', 'Digestive digestive organs', 'အစာခြေအင်္ဂါအဖွဲ့အစည်း', 'noun', 'nakadaka', 3),
        ('循環器', 'じゅんかんき', 'Circulatory cardiovascular organs', 'သွေးလှည့်ပတ်အင်္ဂါအဖွဲ့အစည်း', 'noun', 'nakadaka', 3),
        ('自律神経', 'じりつしんけい', 'Autonomic nervous system', 'ကိုယ်ပိုင်အလိုအလျောက်အာရုံကြောစနစ်', 'noun', 'nakadaka', 4),
        ('血液循環', 'けつえきじゅんかん', 'Blood vascular circulation', 'သွေးလှည့်ပတ်မှု', 'noun', 'nakadaka', 5),
        ('人工衛星', 'じんこうえいせい', 'Artificial man-made satellite', 'လူလုပ်ဂြိုဟ်တု', 'noun', 'nakadaka', 5),
        ('海面上昇', 'かいめんじょうしょう', 'Rising sea levels', 'ပင်လယ်ရေမျက်နှာပြင်မြင့်တက်ခြင်း', 'noun', 'nakadaka', 5),
        ('酸性雨', 'さんせいう', 'Acid rain precipitation', 'အက်ဆစ်မိုး', 'noun', 'nakadaka', 3),
        ('熱帯雨林', 'ねったいうりん', 'Tropical rainforest jungle', 'အပူပိုင်းမိုးသစ်တော', 'noun', 'nakadaka', 4),
        ('風力発電所', 'ふうりょくはつでんしょ', 'Wind power turbine station', 'လေအားလျှပ်စစ်စက်ရုံ', 'noun', 'nakadaka', 6),
        ('水力発電所', 'すいりょくはつでんしょ', 'Hydroelectric power plant station', 'ရေအားလျှပ်စစ်စက်ရုံ', 'noun', 'nakadaka', 6),
        ('太陽光パネル', 'たいようこうパネル', 'Solar photovoltaic panel', 'နေရောင်ခြည်စွမ်းအင်သုံးပြား', 'noun', 'nakadaka', 5),
        ('蓄電設備', 'ちくでんせつび', 'Electrical battery energy storage equipment', 'လျှပ်စစ်သိုလှောင်ကိရိယာစနစ်', 'noun', 'nakadaka', 4),
        ('送電線', 'そうでんせん', 'Electric power transmission cable', 'လျှပ်စစ်ဓာတ်အားလိုင်းကြိုး', 'noun', 'heiban', 0),
        ('変電所', 'へんでんしょ', 'Electric transformer substation', 'ဓာတ်အားခွဲရုံ', 'noun', 'heiban', 0),
        ('見当違い', 'けんとうちがい', 'Wrong guess / wide of mark', 'မှန်းဆချက်လွဲမှားခြင်း', 'noun', 'nakadaka', 4),
        ('場違い', 'ばちがい', 'Out of place / inappropriate setting', 'နေရာနှင့်မသင့်လျော်သော', 'adjective', 'nakadaka', 2),
        ('思い過ごし', 'おもいすごし', 'Overthinking / anxious imagining', 'တွေးလွန်ပြီးစိုးရိမ်ခြင်း', 'noun', 'heiban', 0),
        ('早とちり', 'はやとちり', 'Jumping rashly to conclusions', 'မစုံစမ်းဘဲအလျင်စလိုကောက်ချက်ချခြင်း', 'noun', 'heiban', 0),
        ('気のせい', 'きのせい', 'Mere figment of imagination', 'စိတ်ထင်မှုသက်သက်သာဖြစ်ခြင်း', 'noun', 'heiban', 0),
        ('空耳', 'そらみみ', 'Hearing things phantom acoustic', 'ကြားယောင်ခြင်း', 'noun', 'heiban', 0),
        ('見間違い', 'みまちがい', 'Mistake in seeing / misperception', 'အမြင်မှားခြင်း', 'noun', 'heiban', 0),
        ('聞き違い', 'ききちがい', 'Mishearing something spoken', 'အကြားမှားခြင်း', 'noun', 'heiban', 0),
        ('勘違い', 'かんちがい', 'Misunderstanding assumption', 'အထင်အမြင်လွဲမှားခြင်း', 'noun', 'nakadaka', 3),
        ('心構え', 'こころがまえ', 'Mental preparedness / readiness', 'စိတ်ပိုင်းဆိုင်ရာကြိုတင်ပြင်ဆင်မှု', 'noun', 'nakadaka', 4),
        ('意気込み', 'いきごみ', 'Enthusiasm / determination spirit', 'ထက်သန်သောစိတ်အားထက်သန်မှု', 'noun', 'heiban', 0),
        ('やる気', 'やるき', 'Motivation / drive to act', 'လုပ်ချင်ကိုင်ချင်သောစိတ်ဆန္ဒ', 'noun', 'heiban', 0),
        ('根気', 'こんき', 'Patience / perseverance stamina', 'ဇွဲလုံ့လဝီရိယ', 'noun', 'heiban', 0),
        ('負けん気', 'まけんき', 'Competitive unyielding spirit', 'အရှုံးမပေးလိုသောစိတ်ဓာတ်', 'noun', 'heiban', 0),
        ('粘り強さ', 'ねばりづよさ', 'Tenacity / stubborn persistence', 'မလျှော့သောဇွဲသတ္တိ', 'noun', 'nakadaka', 4),
        ('素直さ', 'すなおさ', 'Meekness / honesty of heart', 'ရိုးသားဖြူစင်မှု', 'noun', 'nakadaka', 2),
        ('誠実さ', 'せいじつさ', 'Sincerity / faithfulness of character', 'ရိုးသားဖြောင့်မတ်မှု', 'noun', 'nakadaka', 3),
        ('大雑把', 'おおざっぱ', 'Rough / sloppy / broad-brush', 'အကြမ်းဖျင်းပေါ့ပေါ့တန်တန်လုပ်တတ်သော', 'adjective', 'nakadaka', 3),
    ]
    for ja, kana, en, my, pos, pp, d in systems:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    # 40. Daily Urban Amenities & Public Safety
    amenities = [
        ('消火栓', 'しょうかせん', 'Fire hydrant', 'မီးသတ်ပိုက်ခေါင်း', 'noun', 'heiban', 0),
        ('避難訓練', 'ひなんくんれん', 'Disaster evacuation drill', 'ဘေးလွတ်ရာတိမ်းရှောင်ရေးဇာတ်တိုက်လေ့ကျင့်မှု', 'noun', 'nakadaka', 4),
        ('非常食', 'ひじょうしょく', 'Emergency disaster food ration', 'အရေးပေါ်စားနပ်ရိက္ခာ', 'noun', 'nakadaka', 2),
        ('簡易トイレ', 'かんいトイレ', 'Portable makeshift emergency toilet', 'အရေးပေါ်အိမ်သာ', 'noun', 'nakadaka', 4),
        ('給水車', 'きゅうすいしゃ', 'Water supply tank truck', 'ရေသယ်ယာဉ်', 'noun', 'nakadaka', 3),
        ('給食', 'きゅうしょく', 'School provided lunch meal', 'ကျောင်းမှကျွေးမွေးသောနေ့လယ်စာ', 'noun', 'heiban', 0),
        ('校内放送', 'こうないほうそう', 'School internal campus broadcast', 'ကျောင်းတွင်းအသံလွှင့်ကြေညာချက်', 'noun', 'nakadaka', 5),
        ('登校拒否', 'とうこうきょひ', 'Truancy / refusing school', 'ကျောင်းမသွားလိုဘဲငြင်းဆန်ခြင်း', 'noun', 'nakadaka', 4),
        ('引きこもり', 'ひきこもり', 'Social withdrawal recluse', 'လူ့အဖွဲ့အစည်းမှခွဲထွက်၍အိမ်တွင်းပုန်းနေခြင်း', 'noun', 'heiban', 0),
        ('高齢社会', 'こうれいしゃかい', 'Aging demographic society', 'သက်ကြီးရွယ်အိုများသောလူ့ဘောင်', 'noun', 'nakadaka', 4),
        ('少子高齢化', 'しょうしこうれいか', 'Declining birthrate with aging society', 'ကလေးမွေးနှုန်းကျဆင်းပြီးသက်ကြီးဦးရေတိုးပွားလာခြင်း', 'noun', 'nakadaka', 6),
        ('平均余命', 'へいきんよめい', 'Average life expectancy remaining', 'ကျန်ရှိသောပျမ်းမျှသက်တမ်း', 'noun', 'nakadaka', 4),
        ('平均寿命', 'へいきんじゅみょう', 'Average life expectancy lifespan', 'ပျမ်းမျှသက်တမ်း', 'noun', 'nakadaka', 4),
        ('乳幼児', 'にゅうようじ', 'Infants and toddlers', 'နို့စို့အရွယ်နှင့်ကလေးငယ်များ', 'noun', 'nakadaka', 3),
        ('保育園', 'ほいくえん', 'Daycare nursery school', 'ကလေးထိန်းကျောင်း', 'noun', 'nakadaka', 3),
        ('幼稚園', 'ようちえん', 'Kindergarten school', 'မူကြိုကျောင်း', 'noun', 'nakadaka', 3),
        ('待機児童', 'たいきじどう', 'Children on nursery waitlist', 'မူကြိုကျောင်းနေရာစောင့်ဆိုင်းနေရသောကလေးများ', 'noun', 'nakadaka', 4),
        ('育児休業', 'いくじきゅうぎょう', 'Childcare parental leave', 'ကလေးပြုစုစောင့်ရှောက်ရေးခွင့်', 'noun', 'nakadaka', 4),
        ('労働時間', 'ろうどうじかん', 'Working labor hours', 'အလုပ်ချိန်နာရီ', 'noun', 'nakadaka', 4),
        ('過労死', 'かろうし', 'Death from overwork', 'အလုပ်ပင်ပန်းလွန်၍သေဆုံးခြင်း', 'noun', 'heiban', 0),
        ('最低賃金', 'さいていちんぎん', 'Statutory minimum wage', 'အနိမ့်ဆုံးလုပ်ခလစာ', 'noun', 'nakadaka', 4),
        ('就業規則', 'しゅうぎょうきそく', 'Workplace employment employment regulations', 'အလုပ်ခွင်စည်းမျဉ်းဥပဒေ', 'noun', 'nakadaka', 5),
        ('労働基準法', 'ろうどうきじゅんほう', 'Labor Standards Act law', 'အလုပ်သမားစံချိန်စံညွှန်းဥပဒေ', 'noun', 'nakadaka', 5),
        ('就職活動', 'しゅうしょくかつどう', 'Job hunting search activity', 'အလုပ်အကိုင်ရှာဖွေရေးလှုပ်ရှားမှု', 'noun', 'nakadaka', 5),
        ('合同説明会', 'ごうどうせつめいかい', 'Joint corporate job fair seminar', 'ကုမ္ပဏီများပူးတွဲအလုပ်ခေါ်ရှင်းလင်းပွဲ', 'noun', 'nakadaka', 6),
    ]
    for ja, kana, en, my, pos, pp, d in amenities:
        items.append({'ja': ja, 'kana': kana, 'en': en, 'my': my, 'pos': pos, 'pitchPattern': pp, 'dropIndex': d})

    return items







