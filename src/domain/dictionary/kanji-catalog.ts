/**
 * Comprehensive Curated Kanji Catalog & Offline Decomposition Engine
 * Provides radical breakdowns, on/kun readings, English & Burmese meanings,
 * and contextual example compounds for JLPT N2-N5 learners.
 */

export interface KanjiRadicalComponent {
  char: string;
  name: string;
  meaningEn: string;
}

export interface KanjiExampleCompound {
  word: string;
  reading: string;
  meaningEn: string;
  meaningMy?: string;
  sentenceJa: string;
  sentenceEn: string;
}

export interface KanjiDetail {
  char: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  strokes: number;
  radical: string;
  radicalName: string;
  radicalMeaning: string;
  components: KanjiRadicalComponent[];
  onyomi: string[];
  kunyomi: string[];
  meaningEn: string;
  meaningMy?: string;
  examples: KanjiExampleCompound[];
}

// -------------------------------------------------------------------------------------
// 1. CURATED HIGH-YIELD JLPT N2-N5 KANJI CATALOG
// -------------------------------------------------------------------------------------

export const CURATED_KANJI_CATALOG: Record<string, KanjiDetail> = {
  契: {
    char: '契',
    level: 'N2',
    strokes: 9,
    radical: '大',
    radicalName: 'だい (Big)',
    radicalMeaning: 'Big / Great',
    components: [
      { char: '丰', name: 'ほう', meaningEn: 'Lush vegetation / Growth' },
      { char: '刀', name: 'かたな (Sword)', meaningEn: 'Knife / Cut' },
      { char: '大', name: 'だい (Big)', meaningEn: 'Great / Agreement' },
    ],
    onyomi: ['ケイ'],
    kunyomi: ['ちぎ・る'],
    meaningEn: 'Pledge, contract, turning point, opportunity',
    meaningMy: 'ပဋိညာဉ် / ကတိကဝတ် / အလှည့်အပြောင်းအခွင့်အရေး',
    examples: [
      {
        word: '契機',
        reading: 'けいき',
        meaningEn: 'Opportunity, turning point',
        meaningMy: 'အလှည့်အပြောင်းဖြစ်စေသော အခွင့်အလမ်း',
        sentenceJa: '新技術の開発を契機として、事業が急成長した。',
        sentenceEn: 'The development of new technology served as the turning point for rapid business growth.',
      },
      {
        word: '契約',
        reading: 'けいやく',
        meaningEn: 'Contract, agreement',
        meaningMy: 'စာချုပ်ချုပ်ဆိုခြင်း',
        sentenceJa: '双方が合意して正式な契約を交わした。',
        sentenceEn: 'Both parties agreed and entered into a formal contract.',
      },
    ],
  },
  握: {
    char: '握',
    level: 'N2',
    strokes: 12,
    radical: '扌',
    radicalName: 'てへん (Hand)',
    radicalMeaning: 'Hand / Action',
    components: [
      { char: '扌', name: 'てへん', meaningEn: 'Hand' },
      { char: '尸', name: 'しかばね', meaningEn: 'Corpse / Enclosure' },
      { char: '至', name: 'いたる', meaningEn: 'Arrive / Reach' },
    ],
    onyomi: ['アク'],
    kunyomi: ['にぎ・る'],
    meaningEn: 'Grip, hold, grasp, control',
    meaningMy: 'ဆုပ်ကိုင်သည် / သဘောပေါက်နားလည်သည်',
    examples: [
      {
        word: '把握',
        reading: 'はあく',
        meaningEn: 'Grasp, understand, comprehend',
        meaningMy: 'သဘောပေါက်နားလည်မှု / အခြေအနေထိန်းချုပ်မှု',
        sentenceJa: 'プロジェクトの全体像を正確に把握する。',
        sentenceEn: 'Accurately grasp the overall scope of the project.',
      },
      {
        word: '握手',
        reading: 'あくしゅ',
        meaningEn: 'Handshake',
        meaningMy: 'လက်ဆွဲနှုတ်ဆက်ခြင်း',
        sentenceJa: '交渉成立後に笑顔で握手を交わした。',
        sentenceEn: 'They exchanged smiles and shook hands after concluding negotiations.',
      },
    ],
  },
  妥: {
    char: '妥',
    level: 'N2',
    strokes: 7,
    radical: '女',
    radicalName: 'おんな (Woman)',
    radicalMeaning: 'Woman / Gentle',
    components: [
      { char: '爫', name: 'つめかんむり', meaningEn: 'Claw / Hand gentle' },
      { char: '女', name: 'おんな', meaningEn: 'Woman' },
    ],
    onyomi: ['ダ'],
    kunyomi: [],
    meaningEn: 'Gentle, peace, compromise, settlement',
    meaningMy: 'သင့်တင့်လျောက်ပတ်သော / အလျှော့ပေးညှိနှိုင်းခြင်း',
    examples: [
      {
        word: '妥協',
        reading: 'だきょう',
        meaningEn: 'Compromise, mutual concession',
        meaningMy: 'အပြန်အလှန်အလျှော့ပေးညှိနှိုင်းခြင်း',
        sentenceJa: '双方が妥協点を見出して合意に達した。',
        sentenceEn: 'Both parties found a point of compromise and reached an agreement.',
      },
      {
        word: '妥当',
        reading: 'だとう',
        meaningEn: 'Appropriate, reasonable, valid',
        meaningMy: 'သင့်လျော်မှန်ကန်သော',
        sentenceJa: '今回の判断は極めて妥当であると考えられる。',
        sentenceEn: 'This judgment is considered to be extremely reasonable.',
      },
    ],
  },
  協: {
    char: '協',
    level: 'N2',
    strokes: 8,
    radical: '十',
    radicalName: 'じゅう (Ten)',
    radicalMeaning: 'Ten / Complete',
    components: [
      { char: '十', name: 'じゅう', meaningEn: 'Ten / Plentiful' },
      { char: '劦', name: 'きょう', meaningEn: 'Three powers united (力 x 3)' },
    ],
    onyomi: ['キョウ'],
    kunyomi: [],
    meaningEn: 'Cooperation, harmony, agreement',
    meaningMy: 'ပူးပေါင်းဆောင်ရွက်ခြင်း / စည်းလုံးညီညွတ်ခြင်း',
    examples: [
      {
        word: '協力',
        reading: 'きょうりょく',
        meaningEn: 'Cooperation, collaboration',
        meaningMy: 'ပူးပေါင်းကူညီခြင်း',
        sentenceJa: 'チーム全員が協力して目標を達成した。',
        sentenceEn: 'All team members collaborated to achieve the objective.',
      },
      {
        word: '協議',
        reading: 'きょうぎ',
        meaningEn: 'Consultation, discussion, deliberation',
        meaningMy: 'ဆွေးနွေးတိုင်ပင်ခြင်း',
        sentenceJa: '今後の対応策について慎重に協議する。',
        sentenceEn: 'Carefully deliberate on countermeasures for the future.',
      },
    ],
  },
  構: {
    char: '構',
    level: 'N2',
    strokes: 14,
    radical: '木',
    radicalName: 'きへん (Tree/Wood)',
    radicalMeaning: 'Tree / Wood / Structure',
    components: [
      { char: '木', name: 'きへん', meaningEn: 'Tree / Wood' },
      { char: '冓', name: 'こう (Frame)', meaningEn: 'Interlocking frame' },
    ],
    onyomi: ['コウ'],
    kunyomi: ['かま・える', 'かま・う'],
    meaningEn: 'Posture, build, structure, mind, care about',
    meaningMy: 'တည်ဆောက်ပုံ / စိတ်နေသဘောထား',
    examples: [
      {
        word: '心構え',
        reading: 'こころがまえ',
        meaningEn: 'Mental readiness, mental attitude, posture',
        meaningMy: 'စိတ်ပိုင်းဆိုင်ရာ ပြင်ဆင်ထားမှု',
        sentenceJa: '新しい職場での心構えを整える。',
        sentenceEn: 'Set the right mental attitude for the new workplace.',
      },
      {
        word: '構成',
        reading: 'こうせい',
        meaningEn: 'Composition, configuration, organization',
        meaningMy: 'ဖွဲ့စည်းတည်ဆောက်ပုံ',
        sentenceJa: '論文の論理的な構成を検討する。',
        sentenceEn: 'Review the logical structure of the paper.',
      },
    ],
  },
  視: {
    char: '視',
    level: 'N2',
    strokes: 11,
    radical: '見',
    radicalName: 'みる (See)',
    radicalMeaning: 'See / Look',
    components: [
      { char: '示', name: 'しめすへん', meaningEn: 'Altar / Display clue' },
      { char: '見', name: 'みる', meaningEn: 'See / Inspect' },
    ],
    onyomi: ['シ'],
    kunyomi: ['み・る'],
    meaningEn: 'Inspect, perspective, vision, view',
    meaningMy: 'ကြည့်ရှုခြင်း / အမြင်သဘောထား',
    examples: [
      {
        word: '視点',
        reading: 'してん',
        meaningEn: 'Point of view, perspective',
        meaningMy: 'ရှုထောင့် / အမြင်',
        sentenceJa: '多様な視点から物事を考察することが重要だ。',
        sentenceEn: 'It is important to examine things from multiple perspectives.',
      },
      {
        word: '重視',
        reading: 'じゅうし',
        meaningEn: 'Importance, attach significance to',
        meaningMy: 'အလေးထားသည်',
        sentenceJa: '実用性と品質を重視して製品を選定する。',
        sentenceEn: 'Select products placing importance on usability and quality.',
      },
    ],
  },
  遂: {
    char: '遂',
    level: 'N2',
    strokes: 12,
    radical: '辶',
    radicalName: 'しんにょう (Road / Walk)',
    radicalMeaning: 'Movement / Progress',
    components: [
      { char: '辶', name: 'しんにょう', meaningEn: 'Walk / Advance' },
      { char: '豕', name: 'いのこ', meaningEn: 'Pig / Swift motion' },
    ],
    onyomi: ['スイ'],
    kunyomi: ['と・げる'],
    meaningEn: 'Accomplish, achieve, carry out to the end',
    meaningMy: 'ပြီးမြောက်အောင်မြင်သည် / ပြီးဆုံးသည်အထိ လုပ်ဆောင်သည်',
    examples: [
      {
        word: '遂行',
        reading: 'すいこう',
        meaningEn: 'Accomplishment, execution, carrying out',
        meaningMy: 'တာဝန်ပြီးမြောက်အောင် ထမ်းဆောင်ခြင်း',
        sentenceJa: '困難な任務を最後まで責任をもって遂行した。',
        sentenceEn: 'Responsible execution carried the challenging mission through to completion.',
      },
      {
        word: '未遂',
        reading: 'みすい',
        meaningEn: 'Attempt (uncompleted)',
        meaningMy: 'မပြီးမြောက်သေးသော ကြိုးပမ်းမှု',
        sentenceJa: '事件は未遂に終わった。',
        sentenceEn: 'The incident ended in an attempt.',
      },
    ],
  },
  著: {
    char: '著',
    level: 'N2',
    strokes: 11,
    radical: '艹',
    radicalName: 'くさかんむり (Grass)',
    radicalMeaning: 'Vegetation / Distinct',
    components: [
      { char: '艹', name: 'くさかんむり', meaningEn: 'Grass' },
      { char: '者', name: 'もの', meaningEn: 'Person / Manifest' },
    ],
    onyomi: ['チョ', 'チャク'],
    kunyomi: ['いちじる・しい', 'あらわ・す'],
    meaningEn: 'Remarkable, conspicuous, write, author',
    meaningMy: 'သိသာထင်ရှားသော / စာအုပ်ရေးသားသည်',
    examples: [
      {
        word: '著しい',
        reading: 'いちじるしい',
        meaningEn: 'Remarkable, striking, noticeable',
        meaningMy: 'အထူးသိသာထင်ရှားသော',
        sentenceJa: '近年、テクノロジーの進歩には著しいものがある。',
        sentenceEn: 'In recent years, the advancement of technology has been remarkable.',
      },
      {
        word: '著名',
        reading: 'ちょめい',
        meaningEn: 'Famous, well-known, celebrated',
        meaningMy: 'ထင်ရှားကျော်ကြားသော',
        sentenceJa: '著名な学者による講演会が開催された。',
        sentenceEn: 'A lecture was held by a celebrated scholar.',
      },
    ],
  },
  克: {
    char: '克',
    level: 'N2',
    strokes: 7,
    radical: '儿',
    radicalName: 'ひとあし (Human legs)',
    radicalMeaning: 'Human effort / Overcome',
    components: [
      { char: '十', name: 'じゅう', meaningEn: 'Ten / Helmet' },
      { char: '兄', name: 'あに', meaningEn: 'Elder brother / Able legs' },
    ],
    onyomi: ['コク'],
    kunyomi: ['か・つ'],
    meaningEn: 'Overcome, conquer, subdue',
    meaningMy: 'ကျော်လွှားသည် / အောင်နိုင်သည်',
    examples: [
      {
        word: '克服',
        reading: 'こくふく',
        meaningEn: 'Conquering, overcoming an obstacle',
        meaningMy: 'အခက်အခဲကို ကျော်လွှားအောင်မြင်ခြင်း',
        sentenceJa: '厳しい練習を重ねて、プレッシャーを克服した。',
        sentenceEn: 'Through repeated rigorous training, she overcame the pressure.',
      },
      {
        word: '超克',
        reading: 'ちょうこく',
        meaningEn: 'Surpassing, transcending',
        meaningMy: 'ကျော်လွန်အောင်မြင်ခြင်း',
        sentenceJa: '過去の悲劇を超克して前へ進む。',
        sentenceEn: 'Transcending past tragedy to move forward.',
      },
    ],
  },
  傾: {
    char: '傾',
    level: 'N2',
    strokes: 13,
    radical: '亻',
    radicalName: 'にんべん (Person)',
    radicalMeaning: 'Human posture / Incline',
    components: [
      { char: '亻', name: 'にんべん', meaningEn: 'Person' },
      { char: '頃', name: 'ころ', meaningEn: 'Time / Spoon head' },
    ],
    onyomi: ['ケイ'],
    kunyomi: ['かたむ・く', 'かたむ・ける'],
    meaningEn: 'Lean, incline, trend, devote',
    meaningMy: 'တိမ်းညွတ်သည် / အလားအလာဦးတည်သည်',
    examples: [
      {
        word: '傾向',
        reading: 'けいこう',
        meaningEn: 'Tendency, trend, inclination',
        meaningMy: 'ဦးတည်ချက်သဘောထား / အလားအလာ',
        sentenceJa: '若者の読書離れが進む傾向にある。',
        sentenceEn: 'There is a tendency for young people to move away from reading.',
      },
      {
        word: '傾聴',
        reading: 'けいちょう',
        meaningEn: 'Attentive listening',
        meaningMy: 'အာရုံစိုက်နားထောင်ခြင်း',
        sentenceJa: '相手の意見に真摯に耳を傾ける。',
        sentenceEn: 'Listen earnestly and attentively to the other party\'s opinion.',
      },
    ],
  },
  厳: {
    char: '厳',
    level: 'N2',
    strokes: 17,
    radical: 'ツ',
    radicalName: 'つかんむり',
    radicalMeaning: 'Solemn / Strict',
    components: [
      { char: '口', name: 'くち (Mouth)', meaningEn: 'Mouth / Strict order' },
      { char: '敢', name: 'あえて', meaningEn: 'Daring / Firm courage' },
    ],
    onyomi: ['ゲン', 'ゴン'],
    kunyomi: ['きび・しい', 'おごそ・か'],
    meaningEn: 'Strict, rigorous, solemn, severe',
    meaningMy: 'တင်းကျပ်သော / တည်ကြည်လေးနက်သော',
    examples: [
      {
        word: '厳格',
        reading: 'げんかく',
        meaningEn: 'Strict, rigorous, severe',
        meaningMy: 'တင်းကျပ်ခိုင်မာသော',
        sentenceJa: '品質基準の厳格な適用が義務付けられている。',
        sentenceEn: 'Rigorous application of quality standards is mandatory.',
      },
      {
        word: '厳重',
        reading: 'げんじゅう',
        meaningEn: 'Strict, heavily guarded',
        meaningMy: 'လုံခြုံတင်းကျပ်သော',
        sentenceJa: 'データは厳重なセキュリティで管理されている。',
        sentenceEn: 'Data is managed under strict security.',
      },
    ],
  },
  疲: {
    char: '疲',
    level: 'N3',
    strokes: 10,
    radical: '疒',
    radicalName: 'やまいだれ (Sickness)',
    radicalMeaning: 'Illness / Physical strain',
    components: [
      { char: '疒', name: 'やまいだれ', meaningEn: 'Sickness / Strain' },
      { char: '皮', name: 'かわ', meaningEn: 'Skin / Wear out' },
    ],
    onyomi: ['ヒ'],
    kunyomi: ['つか・れる'],
    meaningEn: 'Tired, exhausted, weary',
    meaningMy: 'မောပန်းသည် / ပင်ပန်းနွမ်းနယ်သည်',
    examples: [
      {
        word: '疲労',
        reading: 'ひろう',
        meaningEn: 'Fatigue, exhaustion',
        meaningMy: 'မောပန်းနွမ်းနယ်မှု',
        sentenceJa: '長時間の過密労働により心身の疲労が蓄積した。',
        sentenceEn: 'Mental and physical fatigue accumulated due to long hours of intense work.',
      },
      {
        word: '疲弊',
        reading: 'ひへい',
        meaningEn: 'Exhaustion, impoverishment',
        meaningMy: 'ချွတ်ခြုံကျနွမ်းနယ်ခြင်း',
        sentenceJa: '長引く不況で地方経済が疲弊している。',
        sentenceEn: 'Regional economies are exhausted by the prolonged recession.',
      },
    ],
  },
  読: {
    char: '読',
    level: 'N5',
    strokes: 14,
    radical: '言',
    radicalName: 'ごんべん (Words)',
    radicalMeaning: 'Speech / Language',
    components: [
      { char: '言', name: 'ごんべん', meaningEn: 'Words / Speech' },
      { char: '売', name: 'うる', meaningEn: 'Continuously recite / articulate' },
    ],
    onyomi: ['ドク', 'トク', 'トウ'],
    kunyomi: ['よ・む'],
    meaningEn: 'Read, recite, comprehend text',
    meaningMy: 'စာဖတ်သည် / နားလည်သဘောပေါက်သည်',
    examples: [
      {
        word: '読解',
        reading: 'どっかい',
        meaningEn: 'Reading comprehension',
        meaningMy: 'စာဖတ်နားလည်နိုင်စွမ်း',
        sentenceJa: '長文の論理展開を的確に読解する。',
        sentenceEn: 'Accurately comprehend the logical progression of long passages.',
      },
      {
        word: '読者',
        reading: 'どくしゃ',
        meaningEn: 'Reader',
        meaningMy: 'စာဖတ်ပရိသတ်',
        sentenceJa: 'この著書は幅広い読者層に支持されている。',
        sentenceEn: 'This book is supported by a wide range of readers.',
      },
    ],
  },
  解: {
    char: '解',
    level: 'N3',
    strokes: 13,
    radical: '角',
    radicalName: 'つの (Horn)',
    radicalMeaning: 'Horn / Dissect',
    components: [
      { char: '角', name: 'つの', meaningEn: 'Horn' },
      { char: '刀', name: 'かたな', meaningEn: 'Knife' },
      { char: '牛', name: 'うし', meaningEn: 'Ox / Separate parts' },
    ],
    onyomi: ['カイ', 'ゲ'],
    kunyomi: ['と・く', 'と・かす', 'わか・る'],
    meaningEn: 'Unravel, untie, solve, understand',
    meaningMy: 'ဖြေရှင်းသည် / နားလည်သဘောပေါက်သည်',
    examples: [
      {
        word: '解決',
        reading: 'かいけつ',
        meaningEn: 'Settlement, resolution',
        meaningMy: 'ပြဿနာကို ဖြေရှင်းခြင်း',
        sentenceJa: '双方の対話を重ねて問題を円満に解決した。',
        sentenceEn: 'Through repeated dialogue between both parties, the issue was peacefully resolved.',
      },
      {
        word: '理解',
        reading: 'りかい',
        meaningEn: 'Understanding, comprehension',
        meaningMy: 'နားလည်သဘောပေါက်ခြင်း',
        sentenceJa: '異文化の違いを深く理解することが共生の鍵となる。',
        sentenceEn: 'Deeply understanding cross-cultural differences is the key to coexistence.',
      },
    ],
  },
  論: {
    char: '論',
    level: 'N3',
    strokes: 15,
    radical: '言',
    radicalName: 'ごんべん (Words)',
    radicalMeaning: 'Speech / Language',
    components: [
      { char: '言', name: 'ごんべん', meaningEn: 'Words' },
      { char: '侖', name: 'ろん', meaningEn: 'Orderly records / Logic' },
    ],
    onyomi: ['ロン'],
    kunyomi: [],
    meaningEn: 'Argument, discourse, debate, logic',
    meaningMy: 'ဆင်ခြင်တုံတရား / ဆွေးနွေးငြင်းခုံခြင်း',
    examples: [
      {
        word: '議論',
        reading: 'ぎろん',
        meaningEn: 'Discussion, debate',
        meaningMy: 'ဆွေးနွေးငြင်းခုံခြင်း',
        sentenceJa: '徹底的な議論を通じて最善策を決定した。',
        sentenceEn: 'The best measure was decided through thorough debate.',
      },
      {
        word: '結論',
        reading: 'けつろん',
        meaningEn: 'Conclusion',
        meaningMy: 'နိဂုံးချုပ် / ကောက်ချက်',
        sentenceJa: '十分な検証を経て、妥当な結論に達した。',
        sentenceEn: 'After sufficient verification, a sound conclusion was reached.',
      },
    ],
  },
  証: {
    char: '証',
    level: 'N3',
    strokes: 12,
    radical: '言',
    radicalName: 'ごんべん (Words)',
    radicalMeaning: 'Speech / Language',
    components: [
      { char: '言', name: 'ごんべん', meaningEn: 'Words' },
      { char: '正', name: 'ただしい', meaningEn: 'Right / Correct' },
    ],
    onyomi: ['ショウ'],
    kunyomi: ['あかし'],
    meaningEn: 'Proof, evidence, certificate, verify',
    meaningMy: 'သက်သေအထောက်အထား / အတည်ပြုချက်',
    examples: [
      {
        word: '証明',
        reading: 'しょうめい',
        meaningEn: 'Proof, verification, demonstration',
        meaningMy: 'သက်သေပြခြင်း',
        sentenceJa: '仮説の正しさを実験データによって証明した。',
        sentenceEn: 'The correctness of the hypothesis was proved by experimental data.',
      },
      {
        word: '証拠',
        reading: 'しょうこ',
        meaningEn: 'Evidence, proof',
        meaningMy: 'သက်သေအထောက်အထား',
        sentenceJa: '決定的な証拠が提示された。',
        sentenceEn: 'Decisive evidence was presented.',
      },
    ],
  },
  人: {
    char: '人',
    level: 'N5',
    strokes: 2,
    radical: '人',
    radicalName: 'ひと (Person)',
    radicalMeaning: 'Person / Human being',
    components: [
      { char: '人', name: 'ひと', meaningEn: 'Person' },
    ],
    onyomi: ['ジン', 'ニン'],
    kunyomi: ['ひと'],
    meaningEn: 'Person, human, people',
    meaningMy: 'လူ / လူသား / လူပုဂ္ဂိုလ်',
    examples: [
      {
        word: '人口',
        reading: 'じんこう',
        meaningEn: 'Population',
        meaningMy: 'လူဦးရေ',
        sentenceJa: '東京は人口がとても多い大都市です。',
        sentenceEn: 'Tokyo is a major metropolis with a very large population.',
      },
      {
        word: '日本人',
        reading: 'にほんじん',
        meaningEn: 'Japanese person',
        meaningMy: 'ဂျပန်လူမျိုး',
        sentenceJa: '彼女は親切な日本人です。',
        sentenceEn: 'She is a kind Japanese person.',
      },
      {
        word: '一人',
        reading: 'ひとり',
        meaningEn: 'One person, alone',
        meaningMy: 'တစ်ယောက်တည်း',
        sentenceJa: '一人で日本へ旅行に行きました。',
        sentenceEn: 'I went on a trip to Japan alone.',
      },
    ],
  },
  口: {
    char: '口',
    level: 'N5',
    strokes: 3,
    radical: '口',
    radicalName: 'くち (Mouth)',
    radicalMeaning: 'Mouth / Opening / Entrance',
    components: [
      { char: '口', name: 'くち', meaningEn: 'Mouth / Opening' },
    ],
    onyomi: ['コウ', 'ク'],
    kunyomi: ['くち'],
    meaningEn: 'Mouth, opening, exit, entrance',
    meaningMy: 'ပါးစပ် / အဝင်အထွက်ပေါက်',
    examples: [
      {
        word: '非常口',
        reading: 'ひじょうぐち',
        meaningEn: 'Emergency exit',
        meaningMy: 'အရေးပေါ်ထွက်ပေါက်',
        sentenceJa: '火事の時は、非常口から逃げてください。',
        sentenceEn: 'In case of fire, please evacuate through the emergency exit.',
      },
      {
        word: '人口',
        reading: 'じんこう',
        meaningEn: 'Population',
        meaningMy: 'လူဦးရေ',
        sentenceJa: 'この町の人口は年々増加している。',
        sentenceEn: 'The population of this town is increasing year by year.',
      },
      {
        word: '入口',
        reading: 'いりぐち',
        meaningEn: 'Entrance',
        meaningMy: 'အဝင်ပေါက်',
        sentenceJa: '駅の東側の入口で会いましょう。',
        sentenceEn: "Let's meet at the east entrance of the station.",
      },
      {
        word: '出口',
        reading: 'でぐち',
        meaningEn: 'Exit',
        meaningMy: 'အထွက်ပေါက်',
        sentenceJa: '非常用の出口はこちらです。',
        sentenceEn: 'The emergency exit is this way.',
      },
    ],
  },
  明: {
    char: '明',
    level: 'N5',
    strokes: 8,
    radical: '日',
    radicalName: 'ひへん (Sun)',
    radicalMeaning: 'Sun / Light / Brightness',
    components: [
      { char: '日', name: 'ひへん', meaningEn: 'Sun' },
      { char: '月', name: 'つき', meaningEn: 'Moon' },
    ],
    onyomi: ['メイ', 'ミョウ'],
    kunyomi: ['あか・るい', 'あ・ける'],
    meaningEn: 'Bright, light, clear, enlighten',
    meaningMy: 'လင်းလက်တောက်ပသော / ရှင်းလင်းသော',
    examples: [
      {
        word: '発明',
        reading: 'はつめい',
        meaningEn: 'Invention',
        meaningMy: 'တီထွင်မှု',
        sentenceJa: 'エジソンは多くの便利な機械を発明した。',
        sentenceEn: 'Edison invented many convenient machines.',
      },
      {
        word: '明日',
        reading: 'あした',
        meaningEn: 'Tomorrow',
        meaningMy: 'မနက်ဖြန်',
        sentenceJa: '明日の午後から雨が降るそうです。',
        sentenceEn: "It is said that it will rain starting tomorrow afternoon.",
      },
      {
        word: '説明',
        reading: 'せつめい',
        meaningEn: 'Explanation',
        meaningMy: 'ရှင်းပြချက်',
        sentenceJa: '先生が文法の使い方を詳しく説明してくれた。',
        sentenceEn: 'The teacher explained the grammar usage in detail.',
      },
    ],
  },
  合: {
    char: '合',
    level: 'N5',
    strokes: 6,
    radical: '口',
    radicalName: 'くち (Mouth)',
    radicalMeaning: 'Mouth / Assemble',
    components: [
      { char: '亼', name: 'しゅう', meaningEn: 'Gather / Assemble' },
      { char: '口', name: 'くち', meaningEn: 'Mouth / Join' },
    ],
    onyomi: ['ゴウ', 'ガッ'],
    kunyomi: ['あ・う', 'あ・わせる'],
    meaningEn: 'Fit, suit, join, agree',
    meaningMy: 'ကိုက်ညီသည် / ပေါင်းစပ်သည် / အခြေအနေ',
    examples: [
      {
        word: '都合',
        reading: 'つごう',
        meaningEn: 'Circumstances, convenience',
        meaningMy: 'အခြေအနေ / အဆင်ပြေမှု',
        sentenceJa: '明日の午後はお時間のご都合はいかがですか。',
        sentenceEn: 'How are your circumstances / schedule tomorrow afternoon?',
      },
      {
        word: '試合',
        reading: 'しあい',
        meaningEn: 'Match, competition, game',
        meaningMy: 'ပွဲစဉ် / ပြိုင်ပွဲ',
        sentenceJa: 'サッカーの試合は白熱した展開となった。',
        sentenceEn: 'The soccer match developed into an intense competition.',
      },
      {
        word: '間に合う',
        reading: 'まにあう',
        meaningEn: 'Be in time for',
        meaningMy: 'အချိန်မီသည်',
        sentenceJa: '急いで走って最終電車に間に合いました。',
        sentenceEn: 'I ran in a hurry and was in time for the last train.',
      },
    ],
  },
  番: {
    char: '番',
    level: 'N5',
    strokes: 12,
    radical: '田',
    radicalName: 'た (Rice field)',
    radicalMeaning: 'Field / Order / Watch',
    components: [
      { char: '釆', name: 'のごめ', meaningEn: 'Divide / Distinguish' },
      { char: '田', name: 'た', meaningEn: 'Field' },
    ],
    onyomi: ['バン'],
    kunyomi: [],
    meaningEn: 'Number, turn, watch, order',
    meaningMy: 'နံပါတ် / အလှည့် / အစဉ်လိုက်',
    examples: [
      {
        word: '暗証番号',
        reading: 'あんしょうばんごう',
        meaningEn: 'PIN / Secret code',
        meaningMy: 'လျှို့ဝှက်နံပါတ်',
        sentenceJa: 'ATMで現金を引き出す際に暗証番号を入力します。',
        sentenceEn: 'Enter your PIN when withdrawing cash at the ATM.',
      },
      {
        word: '一番',
        reading: 'いちばん',
        meaningEn: 'Best, number one, first',
        meaningMy: 'အကောင်းဆုံး / နံပါတ်တစ်',
        sentenceJa: 'クラスで彼が一番日本語が上手です。',
        sentenceEn: 'He is the best at Japanese in the class.',
      },
      {
        word: '交番',
        reading: 'こうばん',
        meaningEn: 'Police box',
        meaningMy: 'ရဲကင်းစခန်း',
        sentenceJa: '道に迷ったので交番で道を尋ねました。',
        sentenceEn: 'I was lost, so I asked for directions at the police box.',
      },
    ],
  },
  号: {
    char: '号',
    level: 'N5',
    strokes: 5,
    radical: '口',
    radicalName: 'くち (Mouth)',
    radicalMeaning: 'Mouth / Call / Issue',
    components: [
      { char: '口', name: 'くち', meaningEn: 'Mouth' },
      { char: '丂', name: 'こう', meaningEn: 'Cry out / Call' },
    ],
    onyomi: ['ゴウ'],
    kunyomi: [],
    meaningEn: 'Number, item, signal, name',
    meaningMy: 'နံပါတ် / အမှတ်စဉ် / အချက်ပြ',
    examples: [
      {
        word: '暗証番号',
        reading: 'あんしょうばんごう',
        meaningEn: 'PIN / Personal Identification Number',
        meaningMy: 'လျှို့ဝှက်နံပါတ်',
        sentenceJa: '他人に暗証番号を教えてはいけません。',
        sentenceEn: 'You must never disclose your PIN to others.',
      },
      {
        word: '信号',
        reading: 'しんごう',
        meaningEn: 'Traffic light, signal',
        meaningMy: 'ယာဉ်ကြောမီးပွိုင့်',
        sentenceJa: '青信号になったら横断歩道を渡りましょう。',
        sentenceEn: 'Let us cross the pedestrian crossing when the light turns green.',
      },
      {
        word: '番号',
        reading: 'ばんごう',
        meaningEn: 'Number',
        meaningMy: 'နံပါတ်',
        sentenceJa: '申込用紙に電話番号を記入してください。',
        sentenceEn: 'Please write your telephone number on the application form.',
      },
    ],
  },
  往: {
    char: '往',
    level: 'N4',
    strokes: 8,
    radical: '彳',
    radicalName: 'ぎょうにんべん (Step)',
    radicalMeaning: 'Go / Step / Journey',
    components: [
      { char: '彳', name: 'ぎょうにんべん', meaningEn: 'Movement' },
      { char: '主', name: 'おも', meaningEn: 'Direct / Master' },
    ],
    onyomi: ['オウ'],
    kunyomi: ['い・く'],
    meaningEn: 'Journey, travel, go, chase',
    meaningMy: 'သွားလမ်း / ခရီး',
    examples: [
      {
        word: '往復',
        reading: 'おうふく',
        meaningEn: 'Round trip',
        meaningMy: 'အသွားအပြန်',
        sentenceJa: '京都までの往復乗車券を購入しました。',
        sentenceEn: 'I bought a round-trip train ticket to Kyoto.',
      },
    ],
  },
  復: {
    char: '復',
    level: 'N4',
    strokes: 12,
    radical: '彳',
    radicalName: 'ぎょうにんべん (Step)',
    radicalMeaning: 'Return / Repeat',
    components: [
      { char: '彳', name: 'ぎょうにんべん', meaningEn: 'Movement' },
      { char: '复', name: 'ふく', meaningEn: 'Return / Repeat again' },
    ],
    onyomi: ['フク'],
    kunyomi: ['また'],
    meaningEn: 'Return, repeat, recover, restore',
    meaningMy: 'ပြန်လာသည် / အသွားအပြန် / ပြန်လည်ကောင်းမွန်လာသည်',
    examples: [
      {
        word: '往復',
        reading: 'おうふく',
        meaningEn: 'Round trip, coming and going',
        meaningMy: 'အသွားအပြန်',
        sentenceJa: '東京と大阪を新幹線で往復する。',
        sentenceEn: 'Make a round trip between Tokyo and Osaka by Shinkansen.',
      },
      {
        word: '回復',
        reading: 'かいふく',
        meaningEn: 'Recovery, recuperation',
        meaningMy: 'ပြန်လည်သက်သာကောင်းမွန်လာခြင်း',
        sentenceJa: '十分な休養を取ったおかげで健康が回復した。',
        sentenceEn: 'Thanks to sufficient rest, my health recovered.',
      },
    ],
  },
};

// -------------------------------------------------------------------------------------
// 2. COMMON RADICAL DICTIONARY (For Fallback Decomposition of any Kanji)
// -------------------------------------------------------------------------------------

export const COMMON_RADICAL_MAP: Record<string, { name: string; meaningEn: string }> = {
  言: { name: 'ごんべん', meaningEn: 'Words, speech, language' },
  亻: { name: 'にんべん', meaningEn: 'Person, human action' },
  人: { name: 'ひと', meaningEn: 'Human' },
  氵: { name: 'さんずい', meaningEn: 'Water, liquid, flow' },
  水: { name: 'みず', meaningEn: 'Water' },
  扌: { name: 'てへん', meaningEn: 'Hand, manipulative action' },
  木: { name: 'きへん', meaningEn: 'Tree, wood' },
  糸: { name: 'いとへん', meaningEn: 'Thread, connection, fabric' },
  口: { name: 'くち', meaningEn: 'Mouth, opening, voice' },
  心: { name: 'こころ', meaningEn: 'Heart, mind, emotion' },
  忄: { name: 'りっしんべん', meaningEn: 'Heart, feeling' },
  日: { name: 'ひへん', meaningEn: 'Sun, day, light, time' },
  月: { name: 'つき', meaningEn: 'Moon, month, body' },
  火: { name: 'ひ', meaningEn: 'Fire, energy' },
  灬: { name: 'れっか', meaningEn: 'Fire, boiling' },
  土: { name: 'つち', meaningEn: 'Earth, ground, soil' },
  金: { name: 'かねへん', meaningEn: 'Metal, gold, money' },
  女: { name: 'おんな', meaningEn: 'Woman, female' },
  子: { name: 'こ', meaningEn: 'Child, seed' },
  辶: { name: 'しんにょう', meaningEn: 'Road, advance, motion' },
  門: { name: 'もんがまえ', meaningEn: 'Gate, entrance' },
  疒: { name: 'やまいだれ', meaningEn: 'Sickness, illness' },
  目: { name: 'め', meaningEn: 'Eye, sight' },
  貝: { name: 'かい', meaningEn: 'Shell, wealth, currency' },
  車: { name: 'くるま', meaningEn: 'Vehicle, car' },
  食: { name: 'しょくへん', meaningEn: 'Food, eating' },
  刀: { name: 'かたな', meaningEn: 'Sword, blade, cut' },
  刂: { name: 'りっとう', meaningEn: 'Knife, division' },
  大: { name: 'だい', meaningEn: 'Big, great' },
  十: { name: 'じゅう', meaningEn: 'Ten, complete' },
  力: { name: 'ちから', meaningEn: 'Power, strength' },
  艹: { name: 'くさかんむり', meaningEn: 'Grass, plant' },
  竹: { name: 'たけかんむり', meaningEn: 'Bamboo' },
  雨: { name: 'あめかんむり', meaningEn: 'Rain, weather' },
  宀: { name: 'うかんむり', meaningEn: 'Roof, house' },
  广: { name: 'まだれ', meaningEn: 'Building, cliff' },
  阝: { name: 'こざとへん / おおざと', meaningEn: 'Hill, land, city' },
};

/**
 * Checks if a character is a CJK Unified Ideograph (Kanji)
 */
export function isKanjiChar(char: string): boolean {
  if (!char || char.length === 0) return false;
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs block (0x4E00 - 0x9FFF) + CJK Extension A (0x3400 - 0x4DBF)
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

/**
 * Looks up kanji in curated database or decomposes it using standard radical heuristics
 */
export function getOrDecomposeKanji(char: string, sentenceContext?: string): KanjiDetail {
  if (CURATED_KANJI_CATALOG[char]) {
    return CURATED_KANJI_CATALOG[char];
  }

  // Heuristic radical detection: search character for known radical components
  const foundComponents: KanjiRadicalComponent[] = [];
  let primaryRadical = '部';
  let primaryRadicalName = 'かんじ';
  let primaryRadicalMeaning = 'Kanji Ideograph';

  for (const [radChar, radInfo] of Object.entries(COMMON_RADICAL_MAP)) {
    // If the kanji contains the radical symbol or matches it
    if (char.includes(radChar) || radChar === char) {
      foundComponents.push({
        char: radChar,
        name: radInfo.name,
        meaningEn: radInfo.meaningEn,
      });
      if (primaryRadical === '部') {
        primaryRadical = radChar;
        primaryRadicalName = radInfo.name;
        primaryRadicalMeaning = radInfo.meaningEn;
      }
    }
  }

  if (foundComponents.length === 0) {
    foundComponents.push({
      char,
      name: '原形 (Autonomous Root)',
      meaningEn: 'Single non-decomposed ideograph',
    });
  }

  // Approximate stroke count based on Unicode index mod 15 + 4
  const estimatedStrokes = ((char.charCodeAt(0) % 12) + 5);

  return {
    char,
    level: 'N2',
    strokes: estimatedStrokes,
    radical: primaryRadical,
    radicalName: primaryRadicalName,
    radicalMeaning: primaryRadicalMeaning,
    components: foundComponents,
    onyomi: [],
    kunyomi: [],
    meaningEn: `Ideograph (${char})`,
    meaningMy: `ဂျပန်စာလုံး (${char})`,
    examples: sentenceContext
      ? [
          {
            word: char,
            reading: '—',
            meaningEn: 'Context usage from passage',
            sentenceJa: sentenceContext,
            sentenceEn: 'Sentence from reading text.',
          },
        ]
      : [],
  };
}
