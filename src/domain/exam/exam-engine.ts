import { ContentLoader } from '../../data/content/content-loader';
import { db, ExamResultRecord } from '../../data/db/dexie-db';
import { quarantineCard } from '../fsrs/quarantine-engine';
import { LessonPack, Vocabulary, Grammar, Question } from '../models/types';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2';
export type ExamSection = 'vocabulary' | 'grammar' | 'reading';

export interface JLPTExamConfig {
  level: JLPTLevel;
  durationMinutes: number;
  durationSeconds: number;
  totalQuestions: number;
  passThreshold: number; // e.g. 80, 90, 95, 90 out of 180
  sectionDistribution: Record<ExamSection, number>;
  titleBurmese: string;
  descriptionBurmese: string;
}

export const JLPT_EXAM_CONFIGS: Record<JLPTLevel, JLPTExamConfig> = {
  N5: {
    level: 'N5',
    durationMinutes: 50,
    durationSeconds: 50 * 60,
    totalQuestions: 30,
    passThreshold: 80,
    sectionDistribution: {
      vocabulary: 12,
      grammar: 10,
      reading: 8,
    },
    titleBurmese: 'JLPT N5 တရားဝင် ပုံစံတူ စာမေးပွဲ',
    descriptionBurmese: '၅၀ မိနစ်အတွင်း မေးခွန်း ၃၀ ကို ဖြေဆိုရမည်။ အောင်မှတ် ၈၀/၁၈၀ ဖြစ်ပါသည်။',
  },
  N4: {
    level: 'N4',
    durationMinutes: 55,
    durationSeconds: 55 * 60,
    totalQuestions: 35,
    passThreshold: 90,
    sectionDistribution: {
      vocabulary: 14,
      grammar: 12,
      reading: 9,
    },
    titleBurmese: 'JLPT N4 တရားဝင် ပုံစံတူ စာမေးပွဲ',
    descriptionBurmese: '၅၅ မိနစ်အတွင်း မေးခွန်း ၃၅ ခုကို ဖြေဆိုရမည်။ အောင်မှတ် ၉၀/၁၈၀ ဖြစ်ပါသည်။',
  },
  N3: {
    level: 'N3',
    durationMinutes: 65,
    durationSeconds: 65 * 60,
    totalQuestions: 40,
    passThreshold: 95,
    sectionDistribution: {
      vocabulary: 16,
      grammar: 14,
      reading: 10,
    },
    titleBurmese: 'JLPT N3 တရားဝင် ပုံစံတူ စာမေးပွဲ',
    descriptionBurmese: '၆၅ မိနစ်အတွင်း မေးခွန်း ၄၀ ကို ဖြေဆိုရမည်။ အောင်မှတ် ၉၅/၁၈၀ ဖြစ်ပါသည်။',
  },
  N2: {
    level: 'N2',
    durationMinutes: 105,
    durationSeconds: 105 * 60,
    totalQuestions: 50,
    passThreshold: 90,
    sectionDistribution: {
      vocabulary: 20,
      grammar: 18,
      reading: 12,
    },
    titleBurmese: 'JLPT N2 တရားဝင် ပုံစံတူ စာမေးပွဲ',
    descriptionBurmese: '၁၀၅ မိနစ်အတွင်း မေးခွန်း ၅၀ ကို ဖြေဆိုရမည်။ အောင်မှတ် ၉၀/၁၈၀ ဖြစ်ပါသည်။',
  },
};

export interface ExamQuestion {
  id: string;
  originalId: string;
  level: JLPTLevel;
  section: ExamSection;
  sectionTitleJa: string;
  sectionTitleMy: string;
  prompt: string;
  promptMy?: string;
  choices: string[];
  choicesMy?: string[];
  correctAnswer: string;
  explanation?: string;
  explanationMy?: string;
  wordOrPattern?: string;
  reading?: string;
  meaningBurmese?: string;
  itemType?: 'vocabulary' | 'grammar';
}

export interface UserExamAnswer {
  selectedChoice: string | null;
  isFlagged: boolean;
  timeSpentSeconds?: number;
}

export interface ExamScoreReport {
  id: string;
  level: JLPTLevel;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctQuestions: number;
  scaledScore: number; // 0 - 180
  passed: boolean;
  passThreshold: number;
  sections: Record<
    ExamSection,
    {
      correct: number;
      total: number;
      scaledScore: number; // 0 - 60
    }
  >;
  answers: Record<
    string,
    {
      selectedChoice: string | null;
      correctAnswer: string;
      isCorrect: boolean;
      isFlagged: boolean;
    }
  >;
  missedQuestions: ExamQuestion[];
  quarantinedCount: number;
}

/**
 * Fisher-Yates shuffle helper
 */
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function getBurmeseMeaning(vocab: Vocabulary): string {
  return vocab.meaningMyanmar || vocab.meaningMy || vocab.my || vocab.en || '';
}

/**
 * Synthesizes exactly 4 unique choices containing the correct answer.
 */
export function synthesizeChoices(correctAnswer: string, distractorPool: string[]): string[] {
  const cleanCorrect = correctAnswer.trim();
  const uniqueDistractors = Array.from(
    new Set(
      distractorPool
        .map((d) => d.trim())
        .filter((d) => d && d !== cleanCorrect)
    )
  );

  const shuffledDistractors = shuffleArray(uniqueDistractors);
  const selectedDistractors = shuffledDistractors.slice(0, 3);

  // Fallback fillers if pool is insufficient
  let fillerIdx = 1;
  while (selectedDistractors.length < 3) {
    const filler = `${cleanCorrect} (${fillerIdx})`;
    if (!selectedDistractors.includes(filler) && filler !== cleanCorrect) {
      selectedDistractors.push(filler);
    }
    fillerIdx++;
  }

  const choices = shuffleArray([cleanCorrect, ...selectedDistractors]);
  return choices;
}

/**
 * Dynamically generates a balanced, official-style JLPT Mock Exam for the specified level.
 */
export async function generateMockExam(level: JLPTLevel): Promise<ExamQuestion[]> {
  const config = JLPT_EXAM_CONFIGS[level];
  const packs = await ContentLoader.getPacksForLevel(level);

  const allVocab: Vocabulary[] = [];
  const allGrammar: Grammar[] = [];
  const allPackQuestions: Question[] = [];

  for (const pack of packs) {
    if (Array.isArray(pack.vocabularies)) allVocab.push(...pack.vocabularies);
    if (Array.isArray(pack.grammars)) allGrammar.push(...pack.grammars);
    if (Array.isArray(pack.questions)) allPackQuestions.push(...pack.questions);
  }

  // Pools for distractor generation
  const allKanaPool = Array.from(new Set(allVocab.map((v) => v.kana).filter(Boolean)));
  const allMyMeaningPool = Array.from(new Set(allVocab.map(getBurmeseMeaning).filter(Boolean)));
  const allGrammarPatternPool = Array.from(new Set(allGrammar.map((g) => g.pattern).filter(Boolean)));

  // Section 1: Vocabulary Questions
  const vocabQuestions: ExamQuestion[] = [];
  const targetVocabCount = config.sectionDistribution.vocabulary;

  // 1a. Sample from native pack questions with skill = 'vocab' or 'kanji'
  const nativeVocabQuestions = allPackQuestions.filter(
    (q) => (q.skill === 'vocab' || q.skill === 'kanji') && q.answer
  );
  const shuffledNativeVocab = shuffleArray(nativeVocabQuestions);

  for (const q of shuffledNativeVocab) {
    if (vocabQuestions.length >= targetVocabCount) break;

    let choices: string[];
    if (Array.isArray(q.choices) && q.choices.length >= 4 && q.choices.includes(q.answer)) {
      choices = shuffleArray(Array.from(new Set(q.choices)).slice(0, 4));
      if (!choices.includes(q.answer)) {
        choices[0] = q.answer;
        choices = shuffleArray(choices);
      }
    } else {
      choices = synthesizeChoices(q.answer, allKanaPool.concat(allMyMeaningPool));
    }

    if (new Set(choices).size === 4 && choices.includes(q.answer)) {
      vocabQuestions.push({
        id: `mock-${level}-v-${vocabQuestions.length + 1}`,
        originalId: q.id,
        level,
        section: 'vocabulary',
        sectionTitleJa: '文字・語彙',
        sectionTitleMy: 'စာလုံးနှင့် ဝေါဟာရ',
        prompt: q.prompt,
        promptMy: q.promptMy || q.questionMy || 'အောက်ပါ မေးခွန်းအတွက် မှန်ကန်သော အဖြေကို ရွေးပါ',
        choices,
        choicesMy: q.choicesMy,
        correctAnswer: q.answer,
        explanation: q.explanation,
        explanationMy: q.explanationMy,
        itemType: 'vocabulary',
        wordOrPattern: q.prompt.replace(/.*「(.*?)」.*/, '$1') || q.answer,
        reading: q.answer,
        meaningBurmese: q.explanationMy || q.promptMy || 'ဝေါဟာရ မေးခွန်း',
      });
    }
  }

  // 1b. Synthesize additional vocabulary questions if needed
  if (vocabQuestions.length < targetVocabCount && allVocab.length > 0) {
    const shuffledVocabList = shuffleArray(allVocab);
    for (const v of shuffledVocabList) {
      if (vocabQuestions.length >= targetVocabCount) break;
      const useReadingFormat = vocabQuestions.length % 2 === 0;

      if (useReadingFormat && v.kana && v.ja !== v.kana) {
        const choices = synthesizeChoices(v.kana, allKanaPool);
        vocabQuestions.push({
          id: `mock-${level}-v-${vocabQuestions.length + 1}`,
          originalId: v.id,
          level,
          section: 'vocabulary',
          sectionTitleJa: '文字・語彙',
          sectionTitleMy: 'စာလုံးနှင့် ဝေါဟာရ',
          prompt: `「${v.ja}」の読み方として最も適切なものを1つ選びなさい。`,
          promptMy: `「${v.ja}」၏ မှန်ကန်သော အသံထွက်ကို ရွေးချယ်ပါ:`,
          choices,
          correctAnswer: v.kana,
          explanation: `「${v.ja}」は「${v.kana}」と読みます。意味: ${getBurmeseMeaning(v)}`,
          explanationMy: `「${v.ja}」၏ အသံထွက်မှာ「${v.kana}」ဖြစ်ပြီး အဓိပ္ပာယ်မှာ "${getBurmeseMeaning(v)}" ဖြစ်ပါသည်။`,
          itemType: 'vocabulary',
          wordOrPattern: v.ja,
          reading: v.kana,
          meaningBurmese: getBurmeseMeaning(v),
        });
      } else {
        const myMeaning = getBurmeseMeaning(v);
        if (myMeaning) {
          const choices = synthesizeChoices(myMeaning, allMyMeaningPool);
          vocabQuestions.push({
            id: `mock-${level}-v-${vocabQuestions.length + 1}`,
            originalId: v.id,
            level,
            section: 'vocabulary',
            sectionTitleJa: '文字・語彙',
            sectionTitleMy: 'စာလုံးနှင့် ဝေါဟာရ',
            prompt: `下線部の言葉の意味として最も適切なものを1つ選びなさい。\n「${v.ja}」`,
            promptMy: `「${v.ja}」၏ အဓိပ္ပာယ်နှင့် အကိုက်ညီဆုံးကို ရွေးချယ်ပါ:`,
            choices,
            correctAnswer: myMeaning,
            explanation: `「${v.ja}（${v.kana}）」の意味: ${myMeaning}`,
            explanationMy: `「${v.ja}（${v.kana}）」၏ အဓိပ္ပာယ်မှာ "${myMeaning}" ဖြစ်ပါသည်။`,
            itemType: 'vocabulary',
            wordOrPattern: v.ja,
            reading: v.kana,
            meaningBurmese: myMeaning,
          });
        }
      }
    }
  }

  // Section 2: Grammar Questions
  const grammarQuestions: ExamQuestion[] = [];
  const targetGrammarCount = config.sectionDistribution.grammar;

  // 2a. Sample native grammar questions
  const nativeGrammarQuestions = allPackQuestions.filter(
    (q) => q.skill === 'grammar' && q.answer
  );
  const shuffledNativeGrammar = shuffleArray(nativeGrammarQuestions);

  for (const q of shuffledNativeGrammar) {
    if (grammarQuestions.length >= targetGrammarCount) break;

    let choices: string[];
    if (Array.isArray(q.choices) && q.choices.length >= 4 && q.choices.includes(q.answer)) {
      choices = shuffleArray(Array.from(new Set(q.choices)).slice(0, 4));
      if (!choices.includes(q.answer)) {
        choices[0] = q.answer;
        choices = shuffleArray(choices);
      }
    } else {
      choices = synthesizeChoices(q.answer, allGrammarPatternPool);
    }

    if (new Set(choices).size === 4 && choices.includes(q.answer)) {
      grammarQuestions.push({
        id: `mock-${level}-g-${grammarQuestions.length + 1}`,
        originalId: q.id,
        level,
        section: 'grammar',
        sectionTitleJa: '文法',
        sectionTitleMy: 'သဒ္ဒါ',
        prompt: q.prompt,
        promptMy: q.promptMy || q.questionMy || 'ကွက်လပ်တွင် အသင့်တော်ဆုံး သဒ္ဒါပုံစံကို ရွေးပါ',
        choices,
        choicesMy: q.choicesMy,
        correctAnswer: q.answer,
        explanation: q.explanation,
        explanationMy: q.explanationMy,
        itemType: 'grammar',
        wordOrPattern: q.answer,
        meaningBurmese: q.explanationMy || q.promptMy || 'သဒ္ဒါ မေးခွန်း',
      });
    }
  }

  // 2b. Synthesize additional grammar questions if needed
  if (grammarQuestions.length < targetGrammarCount && allGrammar.length > 0) {
    const shuffledGrammarList = shuffleArray(allGrammar);
    for (const g of shuffledGrammarList) {
      if (grammarQuestions.length >= targetGrammarCount) break;
      const choices = synthesizeChoices(g.pattern, allGrammarPatternPool);
      const meaningText = g.meaningMy || g.meaning || '';

      grammarQuestions.push({
        id: `mock-${level}-g-${grammarQuestions.length + 1}`,
        originalId: g.id,
        level,
        section: 'grammar',
        sectionTitleJa: '文法',
        sectionTitleMy: 'သဒ္ဒါ',
        prompt: `次の文の（　★　）に入る最もよいものを、1・2・3・4から一つ選びなさい。\n「${g.pattern}」を用いる文脈。`,
        promptMy: `「${g.pattern}」(${meaningText}) သဒ္ဒါပုံစံကို ရွေးချယ်ပါ:`,
        choices,
        correctAnswer: g.pattern,
        explanation: `文法: ${g.pattern}。意味: ${meaningText}`,
        explanationMy: `သဒ္ဒါပုံစံ: ${g.pattern}။ အဓိပ္ပာယ်: ${meaningText}`,
        itemType: 'grammar',
        wordOrPattern: g.pattern,
        meaningBurmese: meaningText,
      });
    }
  }

  // Section 3: Reading Questions
  const readingQuestions: ExamQuestion[] = [];
  const targetReadingCount = config.sectionDistribution.reading;

  // 3a. Native reading questions
  const nativeReadingQuestions = allPackQuestions.filter(
    (q) => q.skill === 'reading' && q.answer
  );
  const shuffledNativeReading = shuffleArray(nativeReadingQuestions);

  for (const q of shuffledNativeReading) {
    if (readingQuestions.length >= targetReadingCount) break;

    let choices: string[];
    if (Array.isArray(q.choices) && q.choices.length >= 4 && q.choices.includes(q.answer)) {
      choices = shuffleArray(Array.from(new Set(q.choices)).slice(0, 4));
      if (!choices.includes(q.answer)) {
        choices[0] = q.answer;
        choices = shuffleArray(choices);
      }
    } else {
      choices = synthesizeChoices(q.answer, ['はい', 'いいえ', '分かりません', '違います']);
    }

    if (new Set(choices).size === 4 && choices.includes(q.answer)) {
      readingQuestions.push({
        id: `mock-${level}-r-${readingQuestions.length + 1}`,
        originalId: q.id,
        level,
        section: 'reading',
        sectionTitleJa: '読解',
        sectionTitleMy: 'စာဖတ်စွမ်းရည်',
        prompt: q.prompt,
        promptMy: q.promptMy || q.questionMy || 'စာပိုဒ်ကိုဖတ်ပြီး မှန်ကန်သောအဖြေကို ရွေးပါ',
        choices,
        choicesMy: q.choicesMy,
        correctAnswer: q.answer,
        explanation: q.explanation,
        explanationMy: q.explanationMy,
        itemType: 'vocabulary',
        wordOrPattern: q.answer,
        meaningBurmese: q.explanationMy || q.promptMy || 'စာဖတ်စွမ်းရည် မေးခွန်း',
      });
    }
  }

  // 3b. Synthesize reading comprehension questions if needed
  if (readingQuestions.length < targetReadingCount) {
    const readingContexts = [
      {
        prompt: '【案内文】図書館の利用について\n本は一人3冊まで借りることができます。返却期限は2週間です。\n\n質問：本は何冊まで借りられますか。',
        promptMy: 'စာကြည့်တိုက်တွင် စာအုပ် ဘယ်နှစ်အုပ်အထိ ငှားနိုင်သနည်း။',
        answer: '3冊まで',
        distractors: ['1冊まで', '2冊まで', '5冊まで'],
      },
      {
        prompt: '【メール】山田さんへ\n明日の会議は午後2時から第3会議室で行います。資料を印刷して持ってきてください。\n\n質問：会議は何時から始まりますか。',
        promptMy: 'အစည်းအဝေး မည်သည့်အချိန်တွင် စတင်မည်နည်း။',
        answer: '午後2時',
        distractors: ['午前10時', '午後1時', '午後3時'],
      },
      {
        prompt: '【メモ】買い物のメモ\nスーパーで牛乳と卵を買ってください。りんごは家にあるので買わなくていいです。\n\n質問：何を買う必要がありますか。',
        promptMy: 'ဘာကို ဝယ်ရန် လိုအပ်သနည်း။',
        answer: '牛乳と卵',
        distractors: ['りんごだけ', '牛乳とりんご', '卵とりんご'],
      },
      {
        prompt: '【お知らせ】休業日のお知らせ\n来週の月曜日は祝日のため、窓口はお休みとなります。火曜日から通常通り開館します。\n\n質問：休みは何曜日ですか。',
        promptMy: 'မည်သည့်နေ့တွင် ပိတ်မည်နည်း။',
        answer: '月曜日',
        distractors: ['日曜日', '火曜日', '水曜日'],
      },
      {
        prompt: '【短文】旅行の計画\n私たちは土曜日の朝、新幹線で京都へ向かいます。日曜日の夜に新幹線で東京へ帰ります。\n\n質問：何を使って旅行しますか。',
        promptMy: 'မည်သည့် ယာဉ်ဖြင့် ခရီးသွားမည်နည်း။',
        answer: '新幹線',
        distractors: ['飛行機', 'バス', '船'],
      },
      {
        prompt: '【案内】健康診断のご案内\n当日は朝食を食べずに来てください。水は飲んでも構いません。\n\n質問：当日の朝、してはいけないことは何ですか。',
        promptMy: 'ထိုနေ့နံနက်တွင် မပြုလုပ်ရမည့်အရာမှာ အဘယ်နည်း။',
        answer: '朝食を食べること',
        distractors: ['水を飲むこと', '病院に行くこと', '薬を飲むこと'],
      },
      {
        prompt: '【掲示板】ゴミの分別について\n燃えるゴミは月曜日と木曜日、ビン・カンは水曜日の朝8時までに出してください。\n\n質問：ビンのゴミはいつ出しますか。',
        promptMy: 'ဖန်ပုလင်း အမှိုက်ကို မည်သည့်နေ့တွင် ထုတ်ပစ်ရမည်နည်း။',
        answer: '水曜日',
        distractors: ['月曜日', '木曜日', '金曜日'],
      },
      {
        prompt: '【手紙】佐藤様\n先日はお忙しい中、ご挨拶にお越しいただき誠にありがとうございました。\n\n質問：この手紙は何のために書かれましたか。',
        promptMy: 'ဤစာကို အဘယ်ကြောင့် ရေးသားခဲ့သနည်း။',
        answer: 'お礼を伝えるため',
        distractors: ['抗議をするため', '注文をするため', '断るため'],
      },
      {
        prompt: '【お知らせ】台風接近に伴う授業について\n明日午前7時の時点で警報が出ている場合、午前の授業はすべて休講となります。\n\n質問：午前の授業が休みになる条件は何ですか。',
        promptMy: 'နံနက်ပိုင်း အတန်းများ ပိတ်ရန် အခြေအနေမှာ အဘယ်နည်း။',
        answer: '午前7時の時点で警報が出ている場合',
        distractors: ['雨が降っている場合', '午後1時になる場合', '電車が遅れた場合'],
      },
      {
        prompt: '【短文】田中さんの日課\n毎朝6時に起きて、近所の公園を30分ジョギングしてからシャワーを浴びます。\n\n質問：田中さんは朝起きてから何をしますか。',
        promptMy: 'နံနက်နိုးပြီးနောက် ဘာလုပ်သနည်း။',
        answer: 'ジョギングをする',
        distractors: ['テレビを見る', '朝ご飯を食べる', 'すぐに出勤する'],
      },
      {
        prompt: '【案内】パスポートの更新窓口\n受付時間は平日の午前9時から午後4時30分までです。土日祝日は受け付けておりません。\n\n質問：土曜日に受付はできますか。',
        promptMy: 'စနေနေ့တွင် လက်ခံပါသလား။',
        answer: 'できない',
        distractors: ['できる', '午前中だけできる', '予約すればできる'],
      },
      {
        prompt: '【短文】天候とイベント\n明日の運動会は雨天順延です。雨が降った場合は翌週の日曜日に開催されます。\n\n質問：明日雨が降ったらどうなりますか。',
        promptMy: 'မနက်ဖြန် မိုးရွာပါက ဘာဖြစ်မည်နည်း။',
        answer: '翌週の日曜日に延期される',
        distractors: ['中止になる', '体育館で行う', '雨の中でも行う'],
      },
    ];

    const shuffledReadingContexts = shuffleArray(readingContexts);
    for (const ctx of shuffledReadingContexts) {
      if (readingQuestions.length >= targetReadingCount) break;
      const choices = synthesizeChoices(ctx.answer, ctx.distractors);
      readingQuestions.push({
        id: `mock-${level}-r-${readingQuestions.length + 1}`,
        originalId: `synth-read-${readingQuestions.length + 1}`,
        level,
        section: 'reading',
        sectionTitleJa: '読解',
        sectionTitleMy: 'စာဖတ်စွမ်းရည်',
        prompt: ctx.prompt,
        promptMy: ctx.promptMy,
        choices,
        correctAnswer: ctx.answer,
        explanation: `正解: ${ctx.answer}`,
        explanationMy: `မှန်ကန်သောအဖြေ: ${ctx.answer}`,
        itemType: 'vocabulary',
        wordOrPattern: ctx.answer,
        meaningBurmese: ctx.promptMy,
      });
    }
  }

  // Combine into canonical JLPT order: Vocabulary -> Grammar -> Reading
  const allQuestions = [...vocabQuestions, ...grammarQuestions, ...readingQuestions];

  // Re-index questions cleanly 1..N
  return allQuestions.map((q, idx) => ({
    ...q,
    id: `mock-${level}-q${String(idx + 1).padStart(2, '0')}`,
  }));
}

/**
 * Calculates scaled score (0–180 scale) across sections:
 * - Vocabulary: 0–60
 * - Grammar: 0–60
 * - Reading: 0–60
 * Overall Pass threshold depends on the level.
 */
export function calculateScaledScore(
  answers: Record<
    string,
    | UserExamAnswer
    | { choice: string | null; isFlagged?: boolean; timeSpentSeconds?: number }
    | string
    | null
  >,
  questions: ExamQuestion[],
  level: JLPTLevel
): ExamScoreReport {
  const config = JLPT_EXAM_CONFIGS[level];

  const sectionTotals: Record<ExamSection, number> = {
    vocabulary: 0,
    grammar: 0,
    reading: 0,
  };

  const sectionCorrect: Record<ExamSection, number> = {
    vocabulary: 0,
    grammar: 0,
    reading: 0,
  };

  const formattedAnswers: ExamScoreReport['answers'] = {};
  const missedQuestions: ExamQuestion[] = [];
  let correctCount = 0;

  for (const q of questions) {
    sectionTotals[q.section]++;

    const ansEntry = answers[q.id];
    let selectedChoice: string | null = null;
    let isFlagged = false;

    if (ansEntry !== null && ansEntry !== undefined) {
      if (typeof ansEntry === 'string') {
        selectedChoice = ansEntry;
      } else if (typeof ansEntry === 'object') {
        if ('selectedChoice' in ansEntry) {
          selectedChoice = ansEntry.selectedChoice ?? null;
        } else if ('choice' in ansEntry) {
          selectedChoice = (ansEntry as { choice: string | null }).choice ?? null;
        }
        if ('isFlagged' in ansEntry) {
          isFlagged = Boolean(ansEntry.isFlagged);
        }
      }
    }

    const isCorrect = selectedChoice !== null && selectedChoice.trim() === q.correctAnswer.trim();

    if (isCorrect) {
      sectionCorrect[q.section]++;
      correctCount++;
    } else {
      missedQuestions.push(q);
    }

    formattedAnswers[q.id] = {
      selectedChoice,
      correctAnswer: q.correctAnswer,
      isCorrect,
      isFlagged,
    };
  }

  // Section scaling: 0-60 points each
  const vocabScaled =
    sectionTotals.vocabulary > 0
      ? Math.round((sectionCorrect.vocabulary / sectionTotals.vocabulary) * 60)
      : 0;

  const grammarScaled =
    sectionTotals.grammar > 0
      ? Math.round((sectionCorrect.grammar / sectionTotals.grammar) * 60)
      : 0;

  const readingScaled =
    sectionTotals.reading > 0
      ? Math.round((sectionCorrect.reading / sectionTotals.reading) * 60)
      : 0;

  const totalScaledScore = Math.min(180, Math.max(0, vocabScaled + grammarScaled + readingScaled));
  const passed = totalScaledScore >= config.passThreshold;

  return {
    id: `exam_${level.toLowerCase()}_${Date.now()}`,
    level,
    completedAt: new Date().toISOString(),
    durationSeconds: config.durationSeconds,
    totalQuestions: questions.length,
    correctQuestions: correctCount,
    scaledScore: totalScaledScore,
    passed,
    passThreshold: config.passThreshold,
    sections: {
      vocabulary: {
        correct: sectionCorrect.vocabulary,
        total: sectionTotals.vocabulary,
        scaledScore: vocabScaled,
      },
      grammar: {
        correct: sectionCorrect.grammar,
        total: sectionTotals.grammar,
        scaledScore: grammarScaled,
      },
      reading: {
        correct: sectionCorrect.reading,
        total: sectionTotals.reading,
        scaledScore: readingScaled,
      },
    },
    answers: formattedAnswers,
    missedQuestions,
    quarantinedCount: 0,
  };
}

/**
 * Sends missed exam questions to the FSRS Quarantine engine and marks them with MOCK_TEST_REPEATED_MISS
 */
export async function quarantineMissedExamQuestions(
  missedQuestions: ExamQuestion[]
): Promise<number> {
  let quarantinedCount = 0;
  for (const q of missedQuestions) {
    try {
      await quarantineCard({
        id: q.originalId || q.id,
        itemType: q.itemType || (q.section === 'grammar' ? 'grammar' : 'vocabulary'),
        wordOrPattern: q.wordOrPattern || q.prompt,
        reading: q.reading,
        meaningBurmese: q.meaningBurmese || q.promptMy || 'Mock Exam မေးခွန်းမှား',
        meaningEn: q.explanation || 'Missed in Mock Exam',
        jlptLevel: q.level,
        quarantineReason: 'MOCK_TEST_REPEATED_MISS',
      });
      quarantinedCount++;
    } catch (e) {
      console.warn(`[ExamEngine] Failed to quarantine question ${q.id}:`, e);
    }
  }
  return quarantinedCount;
}

/**
 * Persists full exam score report to IndexedDB exam_results
 */
export async function persistExamResult(report: ExamScoreReport): Promise<ExamResultRecord> {
  const record: ExamResultRecord = {
    id: report.id,
    level: report.level,
    completedAt: report.completedAt,
    durationSeconds: report.durationSeconds,
    totalQuestions: report.totalQuestions,
    correctQuestions: report.correctQuestions,
    scaledScore: report.scaledScore,
    passed: report.passed,
    passThreshold: report.passThreshold,
    sections: report.sections,
    answers: Object.entries(report.answers).map(([qid, a]) => ({
      questionId: qid,
      selectedChoice: a.selectedChoice,
      correctAnswer: a.correctAnswer,
      isCorrect: a.isCorrect,
      isFlagged: a.isFlagged,
    })),
    quarantinedCount: report.quarantinedCount,
  };

  await db.saveExamResult(record);
  return record;
}
