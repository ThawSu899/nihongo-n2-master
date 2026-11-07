import { Question, QuestionSkill, AssessmentResult } from '../models/types';
import { db } from '../../data/db/dexie-db';
import { DokkaiPassageModel, CURATED_DOKKAI_CATALOG } from './dokkai-catalog';
import { ChoukaiScenario, CHOUKAI_SCENARIOS } from './choukai-catalog';

export type MockExamSection = 'section_1' | 'section_2';

export interface MockExamSectionInfo {
  id: MockExamSection;
  title: string;
  titleJa: string;
  allocatedMinutes: number;
  allocatedSeconds: number;
  description: string;
}

export const OFFICIAL_N2_SECTIONS: Record<MockExamSection, MockExamSectionInfo> = {
  section_1: {
    id: 'section_1',
    title: 'Language Knowledge (Vocabulary & Grammar) and Reading',
    titleJa: '言語知識（文字・語彙・文法）・読解',
    allocatedMinutes: 105,
    allocatedSeconds: 105 * 60,
    description: 'Strict 105-minute test covering Kanji, Vocabulary, Grammar, and authentic Reading Passages.',
  },
  section_2: {
    id: 'section_2',
    title: 'Listening Comprehension',
    titleJa: '聴解',
    allocatedMinutes: 50,
    allocatedSeconds: 50 * 60,
    description: '50-minute continuous aural session simulating live exam tape conditions.',
  },
};

export interface MockExamQuestionMeta {
  index: number; // 1-based overall index
  section: MockExamSection;
  mondaiNumber: number; // e.g. Mondai 1, 2, ...
  mondaiTitleJa: string; // e.g. "問題1：漢字読み"
  mondaiInstructionJa: string;
  subskill: 'kanji' | 'vocab' | 'grammar' | 'reading' | 'listening';
  question: Question;
  starParts?: string[]; // For Mondai 8: scrambled chunks 1,2,3,4
  starAnswerIndex?: number; // 1-4 position of ★
  dokkaiPassageId?: string;
  choukaiScenarioId?: string;
}

export interface UserQuestionAnswer {
  questionId: string;
  selectedChoice: string | null;
  selectedChoiceIndex: number | null; // 0-based
  isCorrect: boolean;
  timeSpentSeconds: number;
  isFlaggedForReview: boolean;
}

export interface MockExamScoreReport {
  id: string;
  examTitle: string;
  level: 'N2';
  completedAt: string;
  durationSeconds: number;
  section1DurationSeconds: number;
  section2DurationSeconds: number;

  // Raw counts
  languageRawScore: { correct: number; total: number; pct: number };
  readingRawScore: { correct: number; total: number; pct: number };
  listeningRawScore: { correct: number; total: number; pct: number };
  overallRawScore: { correct: number; total: number; pct: number };

  // Scaled scores (0 - 60 each, total 180)
  languageScaledScore: number; // 0 - 60
  readingScaledScore: number;  // 0 - 60
  listeningScaledScore: number; // 0 - 60
  totalScaledScore: number;    // 0 - 180

  // Official Pass / Fail / Disqualification criteria
  passed: boolean;
  isSectionalDisqualified: boolean; // Scored >= 90 overall but < 19 in at least one section
  disqualificationReason?: string;
  grade: 'A' | 'B' | 'C' | 'D'; // A: >=80%, B: >=60%, C: >=50%, D: <50%

  // Section threshold benchmarks (19/60 per section, 90/180 overall)
  thresholds: {
    totalRequired: 90;
    sectionRequired: 19;
  };

  // Detailed skill mappings
  bySkill: Record<QuestionSkill, { correct: number; total: number; accuracy: number }>;
  answers: UserQuestionAnswer[];
  missedQuestionIds: string[];
}

// -----------------------------------------------------------------------------------------
// AUTHENTIC N2 MOCK EXAM QUESTION POOL GENERATOR
// -----------------------------------------------------------------------------------------

/**
 * Builds the canonical 50-question representative N2 Mock Exam session
 * structured into exact official Mondai divisions.
 */
export function buildOfficialN2MockExam(): {
  section1Questions: MockExamQuestionMeta[];
  section2Questions: MockExamQuestionMeta[];
  dokkaiPassages: DokkaiPassageModel[];
  choukaiScenarios: ChoukaiScenario[];
} {
  const section1: MockExamQuestionMeta[] = [];
  const section2: MockExamQuestionMeta[] = [];
  let qNum = 1;

  // =========================================================================
  // SECTION 1: 言語知識（文字・語彙・文法）・読解 (105 min)
  // =========================================================================

  // MONDAI 1: 漢字読み (5 items)
  const mondai1Items = [
    { prompt: "新社長の就任を契機として組織改革が行われた。", target: "契機", choices: ["けいき", "かいき", "こうき", "けいぎ"], ans: "けいき", exp: "「契機（けいき）」は良いきっかけ・転機を意味します。" },
    { prompt: "重大な決定を下す前に、リスクを慎重に見極める必要がある。", target: "慎重", choices: ["しんちょう", "じんちょう", "ちんちょう", "しんじゅう"], ans: "しんちょう", exp: "「慎重（しんちょう）」は注意深く軽率に行動しないさま。" },
    { prompt: "与えられた職務を責任を持って遂行した。", target: "遂行", choices: ["すいこう", "ついこう", "しっこう", "ずいこう"], ans: "すいこう", exp: "「遂行（すいこう）」は任務を最後まで成し遂げること。" },
    { prompt: "双方の意見を調整し、妥当な結論を導き出した。", target: "妥当", choices: ["だとう", "たいとう", "じょうとう", "だこう"], ans: "だとう", exp: "「妥当（だとう）」は適切で理にかなっているさま。" },
    { prompt: "物事を多角的な視点から考察する。", target: "視点", choices: ["してん", "みてん", "けんてん", "してい"], ans: "してん", exp: "「視点（してん）」は観点・着眼の角度。" },
  ];

  mondai1Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 1,
      mondaiTitleJa: '問題1：漢字読み',
      mondaiInstructionJa: '＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'kanji',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'kanji',
        type: 'multiple_choice',
        prompt: `次の文の＿＿の漢字の読み方を答えなさい。\n「${item.prompt.replace(item.target, `<u>${item.target}</u>`)}」`,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 2: 表記 (4 items)
  const mondai2Items = [
    { prompt: "現場の状況を正しく［はあく］することが不可欠だ。", choices: ["把握", "把掘", "破握", "波握"], ans: "把握", exp: "「把握（はあく）」はしっかりと理解し掴むこと。" },
    { prompt: "不測の事態に対して［じゅうなん］な対応が求められる。", choices: ["柔軟", "渋難", "柔男", "重難"], ans: "柔軟", exp: "「柔軟（じゅうなん）」はしなやかで適応力があること。" },
    { prompt: "安全基準の［げんかく］な遵守を徹底する。", choices: ["厳格", "厳革", "言格", "原格"], ans: "厳格", exp: "「厳格（げんかく）」は手加減せず厳しいさま。" },
    { prompt: "長時間の過密労働により心身の［ひろう］が蓄積した。", choices: ["疲労", "皮労", "被労", "疲波"], ans: "疲労", exp: "「疲労（ひろう）」は心身のつかれ・消耗。" },
  ];

  mondai2Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 2,
      mondaiTitleJa: '問題2：表記',
      mondaiInstructionJa: '＿＿の言葉を漢字で書くとき、最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'kanji',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'kanji',
        type: 'multiple_choice',
        prompt: `次の文の［　］の言葉を漢字で表したものを答えなさい。\n「${item.prompt}」`,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 3: 語形成 (3 items)
  const mondai3Items = [
    { prompt: "現代の若者にとって、スマートフォンの利便（　）は手放せない魅力だ。", choices: ["性", "化", "的", "風"], ans: "性", exp: "「利便性（りべんせい）」は都合がよく便利な性質。" },
    { prompt: "市場の動向を鑑みて、工場の（　）稼働に踏み切った。", choices: ["再", "新", "復", "重"], ans: "再", exp: "「再稼働（さいかどう）」は一度止まった操業を再び動かすこと。" },
    { prompt: "突然の発表に、社内には動揺（　）が広がった。", choices: ["感", "気", "調", "観"], ans: "感", exp: "「動揺感（どうようかん）」は動揺している感情・雰囲気。" },
  ];

  mondai3Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 3,
      mondaiTitleJa: '問題3：語形成',
      mondaiInstructionJa: '（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'vocab',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'vocab',
        type: 'multiple_choice',
        prompt: item.prompt,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 4: 文脈規定 (5 items)
  const mondai4Items = [
    { prompt: "市場の変化を（　）に察知して、迅速に対応策を打つ。", choices: ["的確", "過剰", "率直", "膨大"], ans: "的確", exp: "「的確（てきかく）」は的を射て正確なさま。" },
    { prompt: "激しい交渉の末、双方が（　）点を見出して合意した。", choices: ["妥協", "克服", "維持", "念願"], ans: "妥協", exp: "「妥協点（だきょうてん）」は双方が譲り合って合致する点。" },
    { prompt: "消費者の動向に（　）な変化が現れている。", choices: ["著しい", "慎重", "柔軟", "妥当"], ans: "著しい", exp: "「著しい（いちじるしい）」は非常に目立つさま。" },
    { prompt: "他者の異なる立場に対して、細やかな（　）を払う。", choices: ["配慮", "偏見", "摩擦", "主観"], ans: "配慮", exp: "「配慮（はいりょ）」は心を配り気遣うこと。" },
    { prompt: "短期間での利益を急ぐ（　）、品質管理を軽視してしまった。", choices: ["あまり", "以上", "からには", "にしては"], ans: "あまり", exp: "「〜のあまり」は極度の感情・状態により好ましくない結果が生じる表現。" },
  ];

  mondai4Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 4,
      mondaiTitleJa: '問題4：文脈規定',
      mondaiInstructionJa: '（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'vocab',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'vocab',
        type: 'multiple_choice',
        prompt: item.prompt,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 5: 言い換え類義 (3 items)
  const mondai5Items = [
    { prompt: "彼女は<u>念願</u>だった海外支社への赴任を果たした。", choices: ["長年望んでいたこと", "突然命じられたこと", "一時的に引き受けたこと", "断念しかけたこと"], ans: "長年望んでいたこと", exp: "「念願（ねんがん）」は長年心から願っていたこと。" },
    { prompt: "危機的な事態にも、彼は<u>躊躇</u>することなく決断を下した。", choices: ["迷ったりためらったり", "焦って急いだり", "他人に相談したり", "恐怖に震えたり"], ans: "迷ったりためらったり", exp: "「躊躇（ちゅうちょ）」は決断をためらい迷うこと。" },
    { prompt: "図書館には<u>膨大</u>な量の歴史文書が保管されている。", choices: ["非常に莫大な", "極めて貴重な", "整理されていない", "最新の"], ans: "非常に莫大な", exp: "「膨大（ぼうだい）」は量や規模が途方もなく大きいさま。" },
  ];

  mondai5Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 5,
      mondaiTitleJa: '問題5：言い換え類義',
      mondaiInstructionJa: '＿＿の言葉に意味が最も近いものを、1・2・3・4から一つ選びなさい。',
      subskill: 'vocab',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'vocab',
        type: 'multiple_choice',
        prompt: item.prompt,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 6: 用法 (3 items)
  const mondai6Items = [
    {
      prompt: "「調和」の使い方が最も適切な文を選びなさい。",
      choices: [
        "歴史ある古い寺院と近代的な高層ビルが、美しい調和を見せている。",
        "毎朝規則正しい生活を調和することで、健康を維持している。",
        "雨で延期された試合の日程を来週の日曜日に調和した。",
        "難しい計算問題を公式を使って瞬時に調和した。",
      ],
      ans: "歴史ある古い寺院と近代的な高層ビルが、美しい調和を見せている。",
      exp: "「調和（ちょうわ）」は互いにつりあい、よくまとまっている状態を表します。",
    },
    {
      prompt: "「克服」の使い方が最も適切な文を選びなさい。",
      choices: [
        "数々の困難やプレッシャーをチーム一丸となって克服し、優勝を勝ち取った。",
        "新しいパソコンの操作法を友人に克服してもらった。",
        "明日のプレゼン資料を深夜までかけて克服した。",
        "会議室の冷房を強めにして室温を克服した。",
      ],
      ans: "数々の困難やプレッシャーをチーム一丸となって克服し、優勝を勝ち取った。",
      exp: "「克服（こくふく）」は努力によって困難や弱点に打ち勝つことを表します。",
    },
    {
      prompt: "「遵守」の使い方が最も適切な文を選びなさい。",
      choices: [
        "企業活動においては、環境関連の諸法令の遵守が何より求められる。",
        "新商品の発売日を遵守するために、広告を新聞に掲載した。",
        "昨晩の飲み会で遅くなったが、睡眠時間を遵守した。",
        "駅前の交差点で友人と待ち合わせを遵守した。",
      ],
      ans: "企業活動においては、環境関連の諸法令の遵守が何より求められる。",
      exp: "「遵守（じゅんしゅ）」は法律や規則、規範に正しく従うことを意味します。",
    },
  ];

  mondai6Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 6,
      mondaiTitleJa: '問題6：用法',
      mondaiInstructionJa: '次の言葉の使い方として最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'vocab',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'vocab',
        type: 'multiple_choice',
        prompt: item.prompt,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 7: 文法形式の判断 (6 items)
  const mondai7Items = [
    { prompt: "景気は回復する（　）、ますます悪化の一途をたどっている。", choices: ["どころか", "はおろか", "にしては", "に値して"], ans: "どころか", exp: "「〜どころか」は予想とは正反対に極端な事実が起きていることを表します。" },
    { prompt: "怪我をしてしまい、走る（　）立つことさえできない。", choices: ["はおろか", "どころか", "にしては", "からして"], ans: "はおろか", exp: "「AはおろかBさえ」は当然のAだけでなく基本のBさえ不可能であることを表します。" },
    { prompt: "人命に関わる医療機器である以上、安全基準を厳格に（　）。", choices: ["遵守せざるを得ない", "遵守してやまない", "遵守に値する", "遵守どころではない"], ans: "遵守せざるを得ない", exp: "「〜ざるを得ない」は状況から判断してそうするより他に道がないことを表します。" },
    { prompt: "被災地の一日も早い復興と住民の安全を心から（　）。", choices: ["祈ってやまない", "祈らざるを得ない", "祈るに値する", "祈るどころではない"], ans: "祈ってやまない", exp: "「〜てやまない」は心から強く願念し続けている状態を表すフォーマル表現です。" },
    { prompt: "長年の過酷な研究と献身的な功績は、世界的な（　）。", choices: ["称賛に値する", "称賛せざるを得ない", "称賛してやまない", "称賛どころではない"], ans: "称賛に値する", exp: "「〜に値する」は、それだけの十分な価値や資格を備えていることを表します。" },
    { prompt: "プロジェクトの責任者を引き受けた（　）、最後までやり抜く覚悟がある。", choices: ["以上は", "あまり", "から見ると", "にしては"], ans: "以上は", exp: "「〜以上は」は、既成事実となった前提を受け、当然守るべき義務や覚悟を述べる表現です。" },
  ];

  mondai7Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 7,
      mondaiTitleJa: '問題7：文法形式の判断',
      mondaiInstructionJa: '次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'grammar',
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'grammar',
        type: 'multiple_choice',
        prompt: item.prompt,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 8: 文の組み立て（★星問題） (3 items)
  const mondai8Items = [
    {
      prompt: "山田監督＿＿　＿＿　＿★＿　＿＿作品が一堂に会した。",
      parts: ["1: をはじめ", "2: 映画人の", "3: 著名な", "4: とする"],
      correctOrder: ["1: をはじめ", "4: とする", "3: 著名な", "2: 映画人の"],
      starIndex: 3, // 3rd position is "3: 著名な"
      choices: ["1: をはじめ", "4: とする", "3: 著名な", "2: 映画人の"],
      ans: "3: 著名な",
      exp: "正しい順序は「山田監督［をはじめ］［とする］［★著名な］［映画人の］作品が一堂に会した」となります。したがって★に入るのは「3: 著名な」です。",
    },
    {
      prompt: "現場の従業員＿＿　＿＿　＿★＿　＿＿受け入れ難いものだ。",
      parts: ["1: から言えば", "2: にしてみれば", "3: 突然の賃下げは", "4: 到底"],
      correctOrder: ["2: にしてみれば", "4: 到底", "3: 突然の賃下げは", "1: から言えば"], // or 現場の従業員にしてみれば、突然の賃下げは到底受け入れ難いものだ
      starIndex: 3,
      choices: ["1: から言えば", "2: にしてみれば", "3: 突然の賃下げは", "4: 到底"],
      ans: "3: 突然の賃下げは",
      exp: "正しい順序は「現場の従業員［にしてみれば］、［到底］［★突然の賃下げは］受け入れ難いものだ」となります。",
    },
    {
      prompt: "勝利への執着の＿＿　＿＿　＿★＿　＿＿反則を犯してしまった。",
      parts: ["1: 焦る", "2: あまり", "3: 危険な", "4: 相手に"],
      correctOrder: ["2: あまり", "1: 焦る", "4: 相手に", "3: 危険な"],
      starIndex: 3,
      choices: ["1: 焦る", "2: あまり", "3: 危険な", "4: 相手に"],
      ans: "4: 相手に",
      exp: "正しい順序は「勝利への執着の［あまり］［焦る］［★相手に］［危険な］反則を犯してしまった」となります。",
    },
  ];

  mondai8Items.forEach((item) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 8,
      mondaiTitleJa: '問題8：文の組み立て',
      mondaiInstructionJa: '次の文の＿★＿に入る最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'grammar',
      starParts: item.parts,
      starAnswerIndex: item.starIndex,
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'grammar',
        type: 'multiple_choice',
        prompt: `${item.prompt}\n\n選択肢：\n${item.parts.join('　')}`,
        choices: item.choices,
        answer: item.ans,
        explanation: item.exp,
        difficulty: 4,
        linkedItemIds: [],
        generated: false,
      },
    });
  });

  // MONDAI 10 & 11: 読解（短文・中文・長文） (6 items integrated with Dokkai Catalog)
  const dokkaiPassage1 = CURATED_DOKKAI_CATALOG[0]; // Tanki / 短文
  const dokkaiPassage2 = CURATED_DOKKAI_CATALOG[1] || CURATED_DOKKAI_CATALOG[0]; // Chuki / 中文

  // Map 3 questions from dokkaiPassage1
  dokkaiPassage1.questions.slice(0, 3).forEach((dq, idx) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 10,
      mondaiTitleJa: '問題10：短文読解',
      mondaiInstructionJa: '次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'reading',
      dokkaiPassageId: dokkaiPassage1.id,
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'reading',
        type: 'multiple_choice',
        prompt: `【短文】${dokkaiPassage1.titleJa || dokkaiPassage1.title}\n\n${dq.prompt}`,
        choices: dq.choices,
        answer: dq.answer,
        explanation: dq.explanation,
        difficulty: 4,
        linkedItemIds: [dokkaiPassage1.id],
        generated: false,
      },
    });
  });

  // Map 3 questions from dokkaiPassage2
  dokkaiPassage2.questions.slice(0, 3).forEach((dq, idx) => {
    section1.push({
      index: qNum++,
      section: 'section_1',
      mondaiNumber: 11,
      mondaiTitleJa: '問題11：中文読解',
      mondaiInstructionJa: '次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      subskill: 'reading',
      dokkaiPassageId: dokkaiPassage2.id,
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'reading',
        type: 'multiple_choice',
        prompt: `【中文】${dokkaiPassage2.titleJa || dokkaiPassage2.title}\n\n${dq.prompt}`,
        choices: dq.choices,
        answer: dq.answer,
        explanation: dq.explanation,
        difficulty: 4,
        linkedItemIds: [dokkaiPassage2.id],
        generated: false,
      },
    });
  });

  // =========================================================================
  // SECTION 2: 聴解 (50 min)
  // =========================================================================

  // MONDAI 1-4: 聴解シナリオ（課題理解・ポイント理解・即時応答） (6 items)
  CHOUKAI_SCENARIOS.slice(0, 6).forEach((sc: ChoukaiScenario, idx: number) => {
    const mondaiNum = sc.type === 'kadai_rikai' ? 1 : sc.type === 'point_rikai' ? 2 : 4;
    section2.push({
      index: qNum++,
      section: 'section_2',
      mondaiNumber: mondaiNum,
      mondaiTitleJa: `問題${mondaiNum}：${sc.typeLabel}`,
      mondaiInstructionJa: sc.typeDescription,
      subskill: 'listening',
      choukaiScenarioId: sc.id,
      question: {
        id: `mock_n2_q_${qNum - 1}`,
        lessonId: 'mock.n2',
        skill: 'listening',
        type: 'listening_choice',
        prompt: `${sc.questionPromptJa}\n（${sc.situation}）`,
        choices: sc.choices,
        answer: sc.correctAnswer,
        explanation: sc.strategyTipJa,
        difficulty: 4,
        linkedItemIds: [sc.id],
        generated: false,
      },
    });
  });

  return {
    section1Questions: section1,
    section2Questions: section2,
    dokkaiPassages: CURATED_DOKKAI_CATALOG,
    choukaiScenarios: CHOUKAI_SCENARIOS,
  };
}

// -----------------------------------------------------------------------------------------
// OFFICIAL SCORING & PASS / FAIL EVALUATION ENGINE
// -----------------------------------------------------------------------------------------

export class MockExamEngine {
  /**
   * Calculates official JLPT scaled scores (0-60 per section, 0-180 total),
   * evaluates sectional minimum thresholds (19 points) and aggregate passing (90 points).
   */
  static evaluateMockExam(params: {
    section1Questions: MockExamQuestionMeta[];
    section2Questions: MockExamQuestionMeta[];
    answers: Record<string, { choice: string | null; timeSpent: number; isFlagged: boolean }>;
    durationSeconds: number;
    section1DurationSeconds: number;
    section2DurationSeconds: number;
  }): MockExamScoreReport {
    const allQuestions = [...params.section1Questions, ...params.section2Questions];
    const userAnswers: UserQuestionAnswer[] = [];
    const missedQuestionIds: string[] = [];

    // Tally by subskills
    const stats: Record<QuestionSkill, { correct: number; total: number }> = {
      vocab: { correct: 0, total: 0 },
      kanji: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
    };

    allQuestions.forEach((qMeta) => {
      const q = qMeta.question;
      const ansEntry = params.answers[q.id];
      const selectedChoice = ansEntry?.choice || null;
      const isCorrect = selectedChoice !== null && selectedChoice === q.answer;
      const choiceIndex = q.choices ? q.choices.indexOf(selectedChoice || '') : -1;

      userAnswers.push({
        questionId: q.id,
        selectedChoice,
        selectedChoiceIndex: choiceIndex >= 0 ? choiceIndex : null,
        isCorrect,
        timeSpentSeconds: ansEntry?.timeSpent || 0,
        isFlaggedForReview: Boolean(ansEntry?.isFlagged),
      });

      if (!isCorrect) {
        missedQuestionIds.push(q.id);
      }

      stats[q.skill].total++;
      if (isCorrect) {
        stats[q.skill].correct++;
      }
    });

    // 1. Language Knowledge (Vocab + Kanji + Grammar)
    const langCorrect = stats.vocab.correct + stats.kanji.correct + stats.grammar.correct;
    const langTotal = stats.vocab.total + stats.kanji.total + stats.grammar.total;
    const langPct = langTotal > 0 ? langCorrect / langTotal : 0;
    const languageScaledScore = Math.min(60, Math.round(langPct * 60));

    // 2. Reading Knowledge (Dokkai)
    const readingCorrect = stats.reading.correct;
    const readingTotal = stats.reading.total;
    const readingPct = readingTotal > 0 ? readingCorrect / readingTotal : 0;
    const readingScaledScore = Math.min(60, Math.round(readingPct * 60));

    // 3. Listening Knowledge (Choukai)
    const listeningCorrect = stats.listening.correct;
    const listeningTotal = stats.listening.total;
    const listeningPct = listeningTotal > 0 ? listeningCorrect / listeningTotal : 0;
    const listeningScaledScore = Math.min(60, Math.round(listeningPct * 60));

    // Total Scaled Score
    const totalScaledScore = languageScaledScore + readingScaledScore + listeningScaledScore;

    // Pass / Fail Rules:
    // Total >= 90 AND every individual section >= 19
    const meetsTotal = totalScaledScore >= 90;
    const meetsLanguageSection = languageScaledScore >= 19;
    const meetsReadingSection = readingScaledScore >= 19;
    const meetsListeningSection = listeningScaledScore >= 19;

    const meetsAllSections = meetsLanguageSection && meetsReadingSection && meetsListeningSection;
    const isSectionalDisqualified = meetsTotal && !meetsAllSections;
    const passed = meetsTotal && meetsAllSections;

    let disqualificationReason: string | undefined;
    if (isSectionalDisqualified) {
      const failedSections: string[] = [];
      if (!meetsLanguageSection) failedSections.push(`言語知識（${languageScaledScore}/60点）`);
      if (!meetsReadingSection) failedSections.push(`読解（${readingScaledScore}/60点）`);
      if (!meetsListeningSection) failedSections.push(`聴解（${listeningScaledScore}/60点）`);
      disqualificationReason = `総合得点は${totalScaledScore}点（合格基準90点以上）を達成していますが、${failedSections.join('・')}が基準点（19点以上）を下回ったため、公式JLPT規定（足切り）により不合格となります。`;
    }

    // Letter grade
    let grade: 'A' | 'B' | 'C' | 'D' = 'D';
    if (totalScaledScore >= 144) grade = 'A';
    else if (totalScaledScore >= 108) grade = 'B';
    else if (totalScaledScore >= 90) grade = 'C';

    const bySkill: Record<QuestionSkill, { correct: number; total: number; accuracy: number }> = {
      vocab: { correct: stats.vocab.correct, total: stats.vocab.total, accuracy: stats.vocab.total > 0 ? stats.vocab.correct / stats.vocab.total : 0 },
      kanji: { correct: stats.kanji.correct, total: stats.kanji.total, accuracy: stats.kanji.total > 0 ? stats.kanji.correct / stats.kanji.total : 0 },
      grammar: { correct: stats.grammar.correct, total: stats.grammar.total, accuracy: stats.grammar.total > 0 ? stats.grammar.correct / stats.grammar.total : 0 },
      reading: { correct: stats.reading.correct, total: stats.reading.total, accuracy: stats.reading.total > 0 ? stats.reading.correct / stats.reading.total : 0 },
      listening: { correct: stats.listening.correct, total: stats.listening.total, accuracy: stats.listening.total > 0 ? stats.listening.correct / stats.listening.total : 0 },
    };

    const overallTotal = allQuestions.length;
    const overallCorrect = userAnswers.filter((a) => a.isCorrect).length;

    return {
      id: `mock_report_${Date.now()}`,
      examTitle: 'JLPT N2 Official Mock Exam (Honban Simulation)',
      level: 'N2',
      completedAt: new Date().toISOString(),
      durationSeconds: params.durationSeconds,
      section1DurationSeconds: params.section1DurationSeconds,
      section2DurationSeconds: params.section2DurationSeconds,
      languageRawScore: { correct: langCorrect, total: langTotal, pct: Math.round(langPct * 100) },
      readingRawScore: { correct: readingCorrect, total: readingTotal, pct: Math.round(readingPct * 100) },
      listeningRawScore: { correct: listeningCorrect, total: listeningTotal, pct: Math.round(listeningPct * 100) },
      overallRawScore: { correct: overallCorrect, total: overallTotal, pct: Math.round((overallCorrect / overallTotal) * 100) },
      languageScaledScore,
      readingScaledScore,
      listeningScaledScore,
      totalScaledScore,
      passed,
      isSectionalDisqualified,
      disqualificationReason,
      grade,
      thresholds: {
        totalRequired: 90,
        sectionRequired: 19,
      },
      bySkill,
      answers: userAnswers,
      missedQuestionIds,
    };
  }

  /**
   * Persists completed Mock Exam score report into db.assessments
   * and study events.
   */
  static async persistMockExamResult(report: MockExamScoreReport): Promise<AssessmentResult> {
    const weakSkills: QuestionSkill[] = [];
    if (report.languageScaledScore < 19 || report.bySkill.vocab.accuracy < 0.6) weakSkills.push('vocab');
    if (report.bySkill.kanji.accuracy < 0.6) weakSkills.push('kanji');
    if (report.bySkill.grammar.accuracy < 0.6) weakSkills.push('grammar');
    if (report.readingScaledScore < 19 || report.bySkill.reading.accuracy < 0.6) weakSkills.push('reading');
    if (report.listeningScaledScore < 19 || report.bySkill.listening.accuracy < 0.6) weakSkills.push('listening');

    const assessmentResult: AssessmentResult = {
      id: `asmt_mock_n2_${Date.now()}`,
      type: 'level',
      level: 'N2',
      takenAt: report.completedAt,
      score: Math.round((report.totalScaledScore / 180) * 100),
      accuracy: Math.round(report.overallRawScore.pct) / 100,
      totalQuestions: report.overallRawScore.total,
      correctQuestions: report.overallRawScore.correct,
      durationSeconds: report.durationSeconds,
      bySkill: report.bySkill,
      passed: report.passed,
      weakSkills,
      failedItemIds: report.missedQuestionIds,
    };

    await db.assessments.add(assessmentResult);

    await db.study_events.add({
      id: `evt_mock_${Date.now()}`,
      timestamp: report.completedAt,
      type: 'exercise_attempted',
      lessonId: 'n2.mock_exam',
      data: {
        score: assessmentResult.score,
        totalScaled: report.totalScaledScore,
        passed: report.passed,
        isDisqualified: report.isSectionalDisqualified,
      },
    });

    return assessmentResult;
  }
}
