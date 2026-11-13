/**
 * JLPT N2 Star Question (★ 文法・並べ替え) Sentence Scramble Engine
 * Models authentic JLPT N2 sentence scramble puzzles with 4 slots [1] [2] [★] [4],
 * grammatical connection reasoning chains, and accuracy scoring.
 */

export interface ScrambleToken {
  id: string;
  optionNumber: number; // 1, 2, 3, 4 (as printed on JLPT exam)
  text: string;
}

export interface GrammaticalChainLink {
  fromText: string;
  toText: string;
  ruleJa: string;
  ruleEn: string;
  ruleMy?: string;
}

export interface StarScramblePuzzle {
  id: string;
  title: string;
  prefix: string; // The sentence beginning before the 4 slots
  suffix: string; // The sentence ending after the 4 slots
  starSlotIndex: number; // 0, 1, 2, 3 (typically slot 2, which is the 3rd blank ★)
  tokens: ScrambleToken[]; // The 4 options (1, 2, 3, 4)
  correctTokenOrder: number[]; // Correct sequence of option numbers, e.g. [3, 1, 4, 2]
  starOptionNumber: number; // The option number (1-4) that belongs in the ★ slot
  fullSentenceJa: string;
  fullSentenceEn: string;
  fullSentenceMy?: string;
  grammarFocus: string;
  chainReasoning: GrammaticalChainLink[];
  detailedExplanation: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
}

export const STAR_SCRAMBLE_CATALOG: StarScramblePuzzle[] = [
  {
    id: 'star_n2_01',
    title: 'プロジェクトの成功と努力',
    prefix: '今回のプロジェクトが成功したのは、',
    suffix: 'にほかならない。',
    starSlotIndex: 2, // Slot 3 is the star
    tokens: [
      { id: 't1', optionNumber: 1, text: 'チーム全員が' },
      { id: 't2', optionNumber: 2, text: '結果' },
      { id: 't3', optionNumber: 3, text: '最後まで諦めずに' },
      { id: 't4', optionNumber: 4, text: '努力した' },
    ],
    // Correct sentence: 今回のプロジェクトが成功したのは、チーム全員が (1) 最後まで諦めずに (3) 努力した (4)★ 結果 (2) にほかならない。
    correctTokenOrder: [1, 3, 4, 2],
    starOptionNumber: 4, // Option 4 belongs in the ★ slot
    fullSentenceJa: '今回のプロジェクトが成功したのは、チーム全員が最後まで諦めずに努力した結果にほかならない。',
    fullSentenceEn: 'The success of this project was nothing other than the result of the entire team striving persistently without giving up.',
    fullSentenceMy: 'ဤပရောဂျက် အောင်မြင်ရခြင်းမှာ အဖွဲ့သားအားလုံး နောက်ဆုံးအချိန်အထိ လက်မလျှော့ဘဲ ကြိုးစားအားထုတ်ခဲ့သည့် ရလဒ်ကြောင့်သာ ဖြစ်သည်။',
    grammarFocus: '〜た結果 (As a result of) / 〜にほかならない (Nothing other than)',
    chainReasoning: [
      {
        fromText: 'チーム全員が (1)',
        toText: '最後まで諦めずに (3)',
        ruleJa: '主語＋副詞的修飾: 「チーム全員が」の動作の様子を「最後まで諦めずに」で修飾。',
        ruleEn: 'Subject + Adverbial clause: Describes the persistent manner of the team.',
        ruleMy: 'ကတ္တား + ကြိယာဝိသေသန: အဖွဲ့တစ်ခုလုံး၏ ဇွဲနပဲပုံစံကို ဖော်ပြသည်။',
      },
      {
        fromText: '最後まで諦めずに (3)',
        toText: '努力した (4)★',
        ruleJa: '連用接続: 「〜ずに（副詞的）」が後続の動詞「努力した」に接続。',
        ruleEn: 'Conjunctive connection: Negative adverbial (-zuni) connects to verb "努力した".',
        ruleMy: 'ဆက်စပ်စကားလုံး: -zuni ပုံစံသည် နောက်ဆက်ကြိယာကို အထောက်အကူပြုသည်။',
      },
      {
        fromText: '努力した (4)★',
        toText: '結果 (2)',
        ruleJa: '連体修飾: 動詞た形「努力した」が名詞「結果」を連体修飾。',
        ruleEn: 'Noun modification: Past tense verb modifies noun "結果 (result)".',
        ruleMy: 'နာမ်အထူးပြု: အတိတ်ကာလကြိယာက "ရလဒ်" နာမ်ကို အထူးပြုသည်။',
      },
      {
        fromText: '結果 (2)',
        toText: 'にほかならない (文末)',
        ruleJa: '文型接続: 名詞「結果」＋「にほかならない（〜に他ならない）」。',
        ruleEn: 'Grammar pattern: Noun connects directly to "〜にほかならない".',
        ruleMy: 'သဒ္ဒါပုံစံ: နာမ်သည် "〜にほかならない" ပုံစံနှင့် တိုက်ရိုက်တွဲစပ်သည်။',
      },
    ],
    detailedExplanation:
      '文末の「にほかならない」は名詞に接続するため、末尾の空欄4には名詞「結果(2)」が入ります。「結果」を修飾する連体形動詞として「努力した(4)」がその前に置かれ、「チーム全員が(1)」「最後まで諦めずに(3)」がその前の節を構成します。よって並び順は 1 → 3 → 4 → 2 となり、★に入るのは「4」です。',
    level: 'N2',
  },
  {
    id: 'star_n2_02',
    title: '転勤を契機とした変化',
    prefix: '彼が海外への',
    suffix: 'きっかけとなった。',
    starSlotIndex: 2, // Slot 3 is the star
    tokens: [
      { id: 't1', optionNumber: 1, text: '視野を広げる' },
      { id: 't2', optionNumber: 2, text: '転勤を' },
      { id: 't3', optionNumber: 3, text: '自身の' },
      { id: 't4', optionNumber: 4, text: '契機として' },
    ],
    // Correct sentence: 彼が海外への 転勤を (2) 契機として (4) 自身の (3)★ 視野を広げる (1) きっかけとなった。
    correctTokenOrder: [2, 4, 3, 1],
    starOptionNumber: 3, // Option 3 in the star slot
    fullSentenceJa: '彼が海外への転勤を契機として自身の視野を広げるきっかけとなった。',
    fullSentenceEn: 'Taking his overseas transfer as an opportunity, it became a catalyst for expanding his own horizons.',
    fullSentenceMy: 'နိုင်ငံရပ်ခြားသို့ အလုပ်ပြောင်းရွှေ့ခြင်းကို အခွင့်ကောင်းယူ၍ မိမိ၏အမြင်ကျယ်စေရန် အကြောင်းဖန်လာခဲ့သည်။',
    grammarFocus: '〜を契機として (Taking ... as an opportunity / turning point)',
    chainReasoning: [
      {
        fromText: '海外への',
        toText: '転勤を (2)',
        ruleJa: '助詞「への」＋名詞: 海外への転勤。',
        ruleEn: 'Particle combination "への" connects to noun "転勤".',
        ruleMy: '"への" သည် "အလုပ်ပြောင်းခြင်း" နာမ်သို့ ဆက်စပ်သည်။',
      },
      {
        fromText: '転勤を (2)',
        toText: '契機として (4)',
        ruleJa: 'N2文法: 名詞＋「を契機として」。',
        ruleEn: 'N2 grammar: Noun + を契機として (as a turning point).',
        ruleMy: 'N2 သဒ္ဒါ: နာမ် + ကို အခွင့်ကောင်းယူ၍။',
      },
      {
        fromText: '契機として (4)',
        toText: '自身の (3)★',
        ruleJa: '後続節主格: 転換後の新たな主格所有関係「自身の」へ移行。',
        ruleEn: 'Possessive connection: Sets up ownership for the upcoming noun phrase.',
        ruleMy: 'ပိုင်ဆိုင်မှု ဆက်စပ်ခြင်း: "မိမိ၏"။',
      },
      {
        fromText: '自身の (3)★',
        toText: '視野を広げる (1)',
        ruleJa: '連体所有＋連体修飾: 「自身の視野」＋文末名詞「きっかけ」を修飾。',
        ruleEn: 'Connects "自身の視野 (own horizons)" and modifies noun "きっかけ".',
        ruleMy: '"မိမိ၏ အမြင်" ကို "きっかけ" နာမ်နှင့် ဆက်စပ်အထူးပြုသည်။',
      },
    ],
    detailedExplanation:
      '冒頭の「海外への」に続く名詞は「転勤を(2)」しかありません。「〜を契機として(4)」というN2頻出文型が続き、文末の「きっかけ」を修飾する「視野を広げる(1)」の前に所有格「自身の(3)」が置かれます。並び順は 2 → 4 → 3 → 1 となり、★に入るのは「3」です。',
    level: 'N2',
  },
  {
    id: 'star_n2_03',
    title: '引き受けた責任と全う',
    prefix: '一度',
    suffix: 'わけにはいかない。',
    starSlotIndex: 2, // Slot 3 is the star
    tokens: [
      { id: 't1', optionNumber: 1, text: '引き受けた' },
      { id: 't2', optionNumber: 2, text: '途中で' },
      { id: 't3', optionNumber: 3, text: '仕事を' },
      { id: 't4', optionNumber: 4, text: '投げ出す' },
    ],
    // Correct sentence: 一度 引き受けた (1) 仕事を (3) 途中で (2)★ 投げ出す (4) わけにはいかない。
    correctTokenOrder: [1, 3, 2, 4],
    starOptionNumber: 2, // Option 2 in the star slot
    fullSentenceJa: '一度引き受けた仕事を途中で投げ出すわけにはいかない。',
    fullSentenceEn: 'Having once accepted the job, I cannot afford to abandon it halfway through.',
    fullSentenceMy: 'တစ်ခါလက်ခံထားပြီးသော အလုပ်ကို လမ်းခုလတ်တွင် ပစ်ထားခဲ့၍ မဖြစ်နိုင်ပေ။',
    grammarFocus: '〜わけにはいかない (Cannot afford to / Impossible for social/moral reasons)',
    chainReasoning: [
      {
        fromText: '一度',
        toText: '引き受けた (1)',
        ruleJa: '副詞「一度」＋動詞た形「引き受けた」。',
        ruleEn: 'Adverb "一度 (once)" naturally modifies the past-tense verb "accepted".',
        ruleMy: '"တစ်ခါ" ကြိယာဝိသေသနသည် "လက်ခံခဲ့သည်" ကို အထူးပြုသည်။',
      },
      {
        fromText: '引き受けた (1)',
        toText: '仕事を (3)',
        ruleJa: '連体修飾: 「引き受けた」が名詞「仕事」を修飾し、対格助詞「を」を伴う。',
        ruleEn: 'Relative clause: "accepted" modifies "job", marked with object particle を.',
        ruleMy: 'လက်ခံထားသော အလုပ်ကို (ကံပုဒ်)။',
      },
      {
        fromText: '仕事を (3)',
        toText: '途中で (2)★',
        ruleJa: '動詞句修飾副詞: 「途中で（halfway）」が後続動詞を修飾。',
        ruleEn: 'Adverbial temporal phrase: "途中で" qualifies the action.',
        ruleMy: '"လမ်းခုလတ်တွင်" အချိန်ပြစကားလုံးက ကြိယာကို အထောက်အပံ့ပြုသည်။',
      },
      {
        fromText: '途中で (2)★',
        toText: '投げ出す (4)',
        ruleJa: '述語結合: 「途中で投げ出す」＋文末「わけにはいかない」。',
        ruleEn: 'Predicate construction: "abandon halfway" connects to "わけにはいかない".',
        ruleMy: 'ကြိယာ + "わけにはいかない" (မဖြစ်နိုင်ပါ)။',
      },
    ],
    detailedExplanation:
      '文末の「わけにはいかない」には動詞辞書形が接続するため、直前には「投げ出す(4)」が来ます。「仕事を(3)」の修飾語として「一度引き受けた(1)」が先行し、投げ出す様子として「途中で(2)」が挟まります。並び順は 1 → 3 → 2 → 4 となり、★に入るのは「2」です。',
    level: 'N2',
  },
  {
    id: 'star_n2_04',
    title: '客観的データに基づく判断',
    prefix: 'この方針は、',
    suffix: '決定されたものだ。',
    starSlotIndex: 2,
    tokens: [
      { id: 't1', optionNumber: 1, text: '基づいて' },
      { id: 't2', optionNumber: 2, text: '調査結果に' },
      { id: 't3', optionNumber: 3, text: '慎重に' },
      { id: 't4', optionNumber: 4, text: '客観的な' },
    ],
    // Correct sentence: この方針は、客観的な (4) 調査結果に (2) 基づいて (1)★ 慎重に (3) 決定されたものだ。
    correctTokenOrder: [4, 2, 1, 3],
    starOptionNumber: 1,
    fullSentenceJa: 'この方針は、客観的な調査結果に基づいて慎重に決定されたものだ。',
    fullSentenceEn: 'This policy was carefully decided on the basis of objective investigation findings.',
    fullSentenceMy: 'ဤမူဝါဒသည် ဘက်မလိုက်သော စုံစမ်းစစ်ဆေးမှုရလဒ်များအပေါ် အခြေခံ၍ သေချာစွာ ဆုံးဖြတ်ထားခြင်း ဖြစ်သည်။',
    grammarFocus: '〜に基づいて (On the basis of / Based on)',
    chainReasoning: [
      {
        fromText: '客観的な (4)',
        toText: '調査結果に (2)',
        ruleJa: 'な形容詞連体形＋名詞: 「客観的な」が「調査結果」を修飾。',
        ruleEn: 'Na-adjective modifies noun "survey results".',
        ruleMy: 'နာမဝိသေသနက နာမ်ကို အထူးပြုသည်။',
      },
      {
        fromText: '調査結果に (2)',
        toText: '基づいて (1)★',
        ruleJa: 'N2文法: 名詞に＋「基づいて」。',
        ruleEn: 'N2 grammar pattern: Noun + に基づいて (based on).',
        ruleMy: 'N2 သဒ္ဒါ: နာမ် + に基づいて (အခြေခံ၍)။',
      },
      {
        fromText: '基づいて (1)★',
        toText: '慎重に (3)',
        ruleJa: '連用副詞配置: 根拠句の後に決定の態勢を示す副詞「慎重に」が後続。',
        ruleEn: 'Adverb placement: Connects basis phrase to the careful execution manner.',
        ruleMy: 'ကြိယာဝိသေသန ဆက်စပ်မှု: "သေချာစွာ"။',
      },
      {
        fromText: '慎重に (3)',
        toText: '決定されたものだ (文末)',
        ruleJa: '副詞＋受身述語: 「慎重に」＋「決定された」。',
        ruleEn: 'Adverb modifies passive predicate "was decided".',
        ruleMy: 'ကြိယာဝိသေသနက ဆုံးဖြတ်ခြင်းခံရသည်ကို အထူးပြုသည်။',
      },
    ],
    detailedExplanation:
      '「調査結果に(2)」の前に形容詞「客観的な(4)」がつき、「〜に基づいて(1)」という文型が完成します。その根拠に基づき「慎重に(3)」決定されたという述語へとつながります。並び順は 4 → 2 → 1 → 3 となり、★に入るのは「1」です。',
    level: 'N2',
  },
];

export interface ScrambleEvaluation {
  isComplete: boolean;
  isFullyCorrect: boolean;
  isStarCorrect: boolean;
  starOptionSelected: number | null;
  starOptionCorrect: number;
  userOrder: number[];
  correctOrder: number[];
  score: number; // 0 to 100
  feedbackMessage: string;
}

export class StarScrambleEngine {
  static getAllPuzzles(): StarScramblePuzzle[] {
    return STAR_SCRAMBLE_CATALOG;
  }

  static getPuzzleById(id: string): StarScramblePuzzle | undefined {
    return STAR_SCRAMBLE_CATALOG.find((p) => p.id === id);
  }

  static evaluate(
    puzzle: StarScramblePuzzle,
    userOptionOrder: (number | null)[]
  ): ScrambleEvaluation {
    const isComplete =
      userOptionOrder.length === 4 &&
      userOptionOrder.every((opt) => opt !== null && opt !== undefined);

    if (!isComplete) {
      return {
        isComplete: false,
        isFullyCorrect: false,
        isStarCorrect: false,
        starOptionSelected: null,
        starOptionCorrect: puzzle.starOptionNumber,
        userOrder: userOptionOrder.filter((n): n is number => n !== null),
        correctOrder: puzzle.correctTokenOrder,
        score: 0,
        feedbackMessage: 'すべての空欄に語句を配置してください。',
      };
    }

    const cleanOrder = userOptionOrder as number[];
    const isFullyCorrect = cleanOrder.every(
      (opt, idx) => opt === puzzle.correctTokenOrder[idx]
    );

    const userStarOption = cleanOrder[puzzle.starSlotIndex];
    const isStarCorrect = userStarOption === puzzle.starOptionNumber;

    let score = 0;
    let feedbackMessage = '';

    if (isFullyCorrect) {
      score = 100;
      feedbackMessage = '完璧です！語順も★の選択肢も完全に正解です。';
    } else if (isStarCorrect) {
      score = 75; // On real JLPT, only the star slot counts for official marks!
      feedbackMessage = '正解です！公式試験では★の位置（配点対象）が合っていれば得点になります。';
    } else {
      score = 0;
      feedbackMessage = '不正解です。文脈の接続関係と文末の呼応を確認しましょう。';
    }

    return {
      isComplete: true,
      isFullyCorrect,
      isStarCorrect,
      starOptionSelected: userStarOption,
      starOptionCorrect: puzzle.starOptionNumber,
      userOrder: cleanOrder,
      correctOrder: puzzle.correctTokenOrder,
      score,
      feedbackMessage,
    };
  }

  static createFromSentence(
    id: string,
    title: string,
    sentenceJa: string,
    meta: {
      fullSentenceMy?: string;
      fullSentenceEn?: string;
      grammarFocus?: string;
      detailedExplanationMy?: string;
      level?: 'N5' | 'N4' | 'N3' | 'N2';
    } = {}
  ): StarScramblePuzzle | null {
    return createPuzzleFromSentence(id, title, sentenceJa, meta);
  }
}

/**
 * Automatically splits a Japanese sentence into:
 * prefix, 4 non-empty clickable segments, and suffix.
 */
export function splitSentenceIntoFourSegments(fullSentence: string): {
  prefix: string;
  segments: [string, string, string, string];
  suffix: string;
} | null {
  const clean = fullSentence.trim();
  if (clean.length < 8) return null;

  // Potential grammatical particle / clause boundaries
  const particles = [
    '、',
    'だけでなく',
    'ばかりでなく',
    'に限らず',
    'において',
    'に関して',
    'によって',
    'につれて',
    'に従って',
    'に際して',
    'を通じて',
    'を通して',
    'を中心に',
    'を契機に',
    'にほかならない',
    'にすぎない',
    'わけがない',
    'に違いない',
    'おそれがある',
    'ものがある',
    'ことになっている',
    'どころではない',
    'わけではない',
    'ので',
    'から',
    'のに',
    'ても',
    'たら',
    'なら',
    'は',
    'が',
    'を',
    'に',
    'で',
    'へ',
    'と',
    'も',
  ];

  const splitPoints: number[] = [];
  for (const p of particles) {
    let idx = clean.indexOf(p);
    while (idx !== -1) {
      const endIdx = idx + p.length;
      if (endIdx > 2 && endIdx < clean.length - 2 && !splitPoints.includes(endIdx)) {
        splitPoints.push(endIdx);
      }
      idx = clean.indexOf(p, idx + 1);
    }
  }

  splitPoints.sort((a, b) => a - b);

  // Filter split points that are at least 2 characters apart
  const filteredPoints: number[] = [];
  for (const pt of splitPoints) {
    if (filteredPoints.length === 0 || pt - filteredPoints[filteredPoints.length - 1] >= 2) {
      filteredPoints.push(pt);
    }
  }

  let prefix = '';
  let suffix = '';
  let segs: string[] = [];

  if (filteredPoints.length >= 3) {
    if (filteredPoints.length === 3) {
      segs = [
        clean.slice(0, filteredPoints[0]),
        clean.slice(filteredPoints[0], filteredPoints[1]),
        clean.slice(filteredPoints[1], filteredPoints[2]),
        clean.slice(filteredPoints[2]),
      ];
    } else if (filteredPoints.length >= 5) {
      prefix = clean.slice(0, filteredPoints[0]);
      segs = [
        clean.slice(filteredPoints[0], filteredPoints[1]),
        clean.slice(filteredPoints[1], filteredPoints[2]),
        clean.slice(filteredPoints[2], filteredPoints[3]),
        clean.slice(filteredPoints[3], filteredPoints[4]),
      ];
      suffix = clean.slice(filteredPoints[4]);
    } else {
      segs = [
        clean.slice(0, filteredPoints[0]),
        clean.slice(filteredPoints[0], filteredPoints[1]),
        clean.slice(filteredPoints[1], filteredPoints[2]),
        clean.slice(filteredPoints[2]),
      ];
    }
  }

  // Fallback: If not enough natural boundaries or segments are invalid, split body into 4 equal segments
  if (segs.length !== 4 || segs.some((s) => !s || s.trim().length === 0)) {
    const endPunct = clean.endsWith('。') ? '。' : '';
    const body = clean.endsWith('。') ? clean.slice(0, -1) : clean;
    const len = body.length;
    const chunk = Math.max(1, Math.floor(len / 4));
    segs = [
      body.slice(0, chunk),
      body.slice(chunk, chunk * 2),
      body.slice(chunk * 2, chunk * 3),
      body.slice(chunk * 3),
    ];
    suffix = endPunct;
  }

  if (segs.length === 4 && segs.every((s) => s.trim().length > 0)) {
    return {
      prefix,
      segments: [segs[0], segs[1], segs[2], segs[3]],
      suffix,
    };
  }
  return null;
}

/**
 * Creates an authentic Star Scramble puzzle from an existing Japanese sentence.
 * Automatically designates the 3rd slot (index 2) as the ★ target slot.
 */
export function createPuzzleFromSentence(
  id: string,
  title: string,
  fullSentenceJa: string,
  meta: {
    fullSentenceMy?: string;
    fullSentenceEn?: string;
    grammarFocus?: string;
    detailedExplanationMy?: string;
    level?: 'N5' | 'N4' | 'N3' | 'N2';
  } = {}
): StarScramblePuzzle | null {
  const split = splitSentenceIntoFourSegments(fullSentenceJa);
  if (!split) return null;

  const { prefix, segments, suffix } = split;
  // Designate the 3rd slot as the ★ target slot (0-indexed: index 2)
  const starSlotIndex = 2;
  const starSegmentText = segments[starSlotIndex];

  // Shuffled permutation for options (0, 1, 2, 3 -> e.g. 1, 3, 0, 2)
  const orderIndices = [1, 3, 0, 2];
  const tokens: ScrambleToken[] = orderIndices.map((origIdx, optIdx) => ({
    id: `tok_${id}_${optIdx + 1}`,
    optionNumber: optIdx + 1,
    text: segments[origIdx],
  }));

  // Find option numbers corresponding to segments in correct grammatical order
  const correctTokenOrder = segments.map((seg) => {
    const tok = tokens.find((t) => t.text === seg);
    return tok ? tok.optionNumber : 1;
  });

  const starOptionNumber = correctTokenOrder[starSlotIndex];
  const level = meta.level || 'N2';
  const grammarFocus = meta.grammarFocus || 'JLPT Grammar Syntax Connection';
  const fullSentenceMy = meta.fullSentenceMy || '';
  const fullSentenceEn = meta.fullSentenceEn || '';

  const explanation =
    meta.detailedExplanationMy ||
    `★ အကွက် (တတိယနေရာ) တွင် ရွေးချယ်မှု (${starOptionNumber}) "${starSegmentText}" ဝင်ရောက်ရပါမည်။ သဒ္ဒါဆက်စပ်မှုအရ မှန်ကန်သော ဝါကျအစီအစဉ်မှာ [${correctTokenOrder.join(
      ' → '
    )}] ဖြစ်ပါသည်။ ${fullSentenceMy ? `မြန်မာပြန်: ${fullSentenceMy}` : ''}`;

  const chainReasoning: GrammaticalChainLink[] = [
    {
      fromText: prefix || segments[0],
      toText: segments[1],
      ruleJa: '文脈接続: 語句と主語・修飾節の接続',
      ruleEn: 'Semantic cohesion and noun/verb modification',
      ruleMy: 'ဝါကျဆက်စပ်မှု: အဓိပ္ပာယ်စီးဆင်းမှုနှင့် သဒ္ဒါဆက်စပ်ပုံ',
    },
    {
      fromText: segments[1],
      toText: `${starSegmentText} (★)`,
      ruleJa: '★対象接続: 文法パターンの接続',
      ruleEn: 'Target star slot grammatical linkage',
      ruleMy: '★ အကွက်ပစ်မှတ်: အဓိက သဒ္ဒါပုံစံ ချိတ်ဆက်မှု',
    },
    {
      fromText: `${starSegmentText} (★)`,
      toText: segments[3] + (suffix || ''),
      ruleJa: '述語・文末呼応: 適切な文末接続',
      ruleEn: 'Predicate and sentence-final agreement',
      ruleMy: 'ဝါကျအဆုံးသတ်: ကြိယာအဆုံးနှင့် လျော်ကန်စွာ ပေါင်းစပ်ပုံ',
    },
  ];

  return {
    id,
    title,
    prefix,
    suffix,
    starSlotIndex,
    tokens,
    correctTokenOrder,
    starOptionNumber,
    fullSentenceJa,
    fullSentenceEn,
    fullSentenceMy,
    grammarFocus,
    chainReasoning,
    detailedExplanation: explanation,
    level,
  };
}
