import { WeaknessFinding } from './weakness-diagnosis';
import { LessonPack, Grammar, Vocabulary, Kanji } from '../models/types';

export type ExerciseCategory = 'grammar' | 'vocabulary' | 'kanji' | 'reading' | 'listening';
export type ExerciseFormat = 'multiple_choice' | 'cloze' | 'fill_in' | 'reading_qa';

export interface PersonalizedExercise {
  id: string;
  category: ExerciseCategory;
  format: ExerciseFormat;
  prompt: string;
  promptMy?: string;
  targetItem: string;
  targetSkill: string;
  relatedLessonId?: string;
  question: string;
  choices?: string[];
  answer: string;
  hint: string;
  hintMy?: string;
  explanation: string;
  explanationMy?: string;
  isAIGenerated: true;
}

/**
 * Deterministic generator that constructs targeted drills based on confirmed/possible weaknesses.
 * Links to existing curriculum content and creates interactive questions.
 */
export function generatePersonalizedExercises(
  weaknesses: WeaknessFinding[],
  packs: LessonPack[] = [],
  maxExercises = 5
): PersonalizedExercise[] {
  const exercises: PersonalizedExercise[] = [];
  const packMap = new Map<string, LessonPack>(packs.map((p) => [p.id, p]));

  // Prioritize Confirmed Weaknesses, then Possible Weaknesses
  const prioritizedWeaknesses = [
    ...weaknesses.filter((w) => w.classification === 'Confirmed Weakness'),
    ...weaknesses.filter((w) => w.classification === 'Possible Weakness'),
  ];

  if (prioritizedWeaknesses.length === 0) {
    // If no weaknesses, generate general reinforcement drills from available packs
    return generateGeneralReinforcementExercises(packs, maxExercises);
  }

  for (const finding of prioritizedWeaknesses) {
    if (exercises.length >= maxExercises) break;

    // Find relevant lesson packs
    const candidatePacks = finding.relevantLessonIds
      .map((id) => packMap.get(id))
      .filter((p): p is LessonPack => Boolean(p));

    const pack = candidatePacks[0] || packs[0];

    if (finding.skill === 'grammar') {
      const grammarExercises = generateGrammarDrills(finding, pack);
      exercises.push(...grammarExercises);
    } else if (finding.skill === 'vocabulary') {
      const vocabExercises = generateVocabDrills(finding, pack);
      exercises.push(...vocabExercises);
    } else if (finding.skill === 'kanji') {
      const kanjiExercises = generateKanjiDrills(finding, pack);
      exercises.push(...kanjiExercises);
    } else if (finding.skill === 'reading') {
      const readingExercises = generateReadingDrills(finding, pack);
      exercises.push(...readingExercises);
    } else if (finding.skill === 'listening') {
      const listeningExercises = generateListeningDrills(finding, pack);
      exercises.push(...listeningExercises);
    }
  }

  return exercises.slice(0, maxExercises);
}

// ==============================================================================
// Sub-generators by Skill
// ==============================================================================

function generateGrammarDrills(finding: WeaknessFinding, pack?: LessonPack): PersonalizedExercise[] {
  if (!pack || !pack.grammars || pack.grammars.length === 0) {
    return [
      {
        id: `drill_grammar_${Date.now()}_1`,
        category: 'grammar',
        format: 'multiple_choice',
        prompt: 'Choose the correct grammatical particle or form:',
        promptMy: 'မှန်ကန်သော သဒ္ဒါ သို့မဟုတ် ဝါစင်္ဂ (助詞) ကို ရွေးချယ်ပါ:',
        targetItem: '助詞・文法',
        targetSkill: 'Grammar Particle Choice',
        relatedLessonId: pack?.id,
        question: '日曜日、図書館（　）本を借りました。',
        choices: ['で', 'に', 'へ', 'を'],
        answer: 'で',
        hint: 'Actions taking place in a location use "で".',
        hintMy: 'နေရာတစ်ခုခုတွင် လုပ်ဆောင်မှု ပြုလုပ်ခြင်းဖြစ်ပါက "で" ကို သုံးသည်။',
        explanation: '図書館で (At the library) describes the location of the action 借りました.',
        explanationMy: 'စာကြည့်တိုက်တွင် စာအုပ်ငှားသည့် လုပ်ဆောင်ချက်ဖြစ်သောကြောင့် "で" ကို သုံးပါသည်။',
        isAIGenerated: true,
      },
    ];
  }

  const g = pack.grammars[0];
  const exampleSentence = pack.sentences?.find((s) => s.grammarIds?.includes(g.id)) || pack.sentences?.[0];
  const questionText = exampleSentence
    ? exampleSentence.ja.replace(g.pattern, '（　　）')
    : `次の文の（　　）に入る正しい文法を選んでください：彼が来ない（　　）がない。`;

  return [
    {
      id: `drill_grammar_${g.id}_${Date.now()}`,
      category: 'grammar',
      format: 'multiple_choice',
      prompt: `Target Grammar: ${g.pattern}`,
      promptMy: `ပစ်မှတ် သဒ္ဒါ: ${g.pattern} (${g.meaningMy || g.meaning})`,
      targetItem: g.pattern,
      targetSkill: `Grammar Point: ${g.pattern}`,
      relatedLessonId: pack.id,
      question: questionText.includes('（') ? questionText : `${questionText} （　　）`,
      choices: [g.pattern, '〜わけではない', '〜にかぎって', '〜どころではない'].sort(() => 0.5 - Math.random()),
      answer: g.pattern,
      hint: g.formation ? `Formation hint: ${g.formation}` : 'Check the meaning and context.',
      hintMy: g.nuanceExplanationMy || g.meaningMy || 'သဒ္ဒါအဓိပ္ပာယ်နှင့် စကားဆက်စပ်မှုကို သတိပြုပါ။',
      explanation: `${g.pattern} expresses: ${g.meaning}.`,
      explanationMy: `${g.pattern} ၏ အဓိပ္ပာယ်မှာ "${g.meaningMy || g.meaning}" ဖြစ်ပါသည်။`,
      isAIGenerated: true,
    },
  ];
}

function generateVocabDrills(finding: WeaknessFinding, pack?: LessonPack): PersonalizedExercise[] {
  if (!pack || !pack.vocabularies || pack.vocabularies.length === 0) {
    return [
      {
        id: `drill_vocab_${Date.now()}_1`,
        category: 'vocabulary',
        format: 'multiple_choice',
        prompt: 'Select the correct meaning for the vocabulary word:',
        promptMy: 'စကားလုံး၏ မှန်ကန်သော အဓိပ္ပာယ်ကို ရွေးချယ်ပါ:',
        targetItem: '単語 (Vocabulary)',
        targetSkill: 'Vocabulary Meaning Recall',
        relatedLessonId: pack?.id,
        question: '「大切 (たいせつ)」の正しい意味を選んでください。',
        choices: ['Important / အရေးကြီးသော', 'Difficult / ခက်ခဲသော', 'Busy / အလုပ်များသော', 'Convenient / အဆင်ပြေသော'],
        answer: 'Important / အရေးကြီးသော',
        hint: 'Used when something has great value or significance.',
        hintMy: 'တန်ဖိုးရှိသော သို့မဟုတ် အလေးထားရသော အရာများတွင် သုံးသည်။',
        explanation: '大切 (たいせつ) means Important or Precious.',
        explanationMy: '大切 (たいせつ) သည် "အရေးကြီးသော၊ တန်ဖိုးထားရသော" ဟု အဓိပ္ပာယ်ရပါသည်။',
        isAIGenerated: true,
      },
    ];
  }

  const v = pack.vocabularies[0];
  const meaningText = v.my || v.meaningMy || v.en;
  return [
    {
      id: `drill_vocab_${v.id}_${Date.now()}`,
      category: 'vocabulary',
      format: 'multiple_choice',
      prompt: `Vocabulary: ${v.ja} [${v.kana}]`,
      promptMy: `ဝေါဟာရ: ${v.ja} [${v.kana}]`,
      targetItem: v.ja,
      targetSkill: `Vocabulary: ${v.ja}`,
      relatedLessonId: pack.id,
      question: `「${v.ja}」の読み方と意味を選んでください。`,
      choices: [
        `${v.kana} — ${meaningText}`,
        `別の読み方 — အခြားအဓိပ္ပာယ်`,
        `似た単語 — ဆင်တူစကားလုံး`,
        `反対語 — ဆန့်ကျင်ဘက်`,
      ].sort(() => 0.5 - Math.random()),
      answer: `${v.kana} — ${meaningText}`,
      hint: `Part of speech: ${v.pos || 'Noun/Verb'}`,
      hintMy: `စကားလုံးဖတ်နည်း: ${v.kana}`,
      explanation: `${v.ja} is read as "${v.kana}" and means "${meaningText}".`,
      explanationMy: `${v.ja} ကို "${v.kana}" ဟု ဖတ်ပြီး အဓိပ္ပာယ်မှာ "${meaningText}" ဖြစ်ပါသည်။`,
      isAIGenerated: true,
    },
  ];
}

function generateKanjiDrills(finding: WeaknessFinding, pack?: LessonPack): PersonalizedExercise[] {
  if (!pack || !pack.kanjis || pack.kanjis.length === 0) {
    return [
      {
        id: `drill_kanji_${Date.now()}_1`,
        category: 'kanji',
        format: 'multiple_choice',
        prompt: 'Identify the Onyomi reading of the Kanji:',
        promptMy: 'ခန်းဂျီး၏ အွန်ယောမိ ဖတ်နည်းကို ရွေးပါ:',
        targetItem: '日',
        targetSkill: 'Kanji Reading',
        relatedLessonId: pack?.id,
        question: '「日」の音読みとして正しいものはどれですか。',
        choices: ['ニチ', 'ゲツ', 'カ', 'スイ'],
        answer: 'ニチ',
        hint: 'Used in 日曜日 (にちようび).',
        hintMy: 'တနင်္ဂနွေနေ့ (日曜日) စကားလုံးတွင် တွေ့ရသည်။',
        explanation: '「日」 has the Onyomi reading ニチ (nichi) and ジツ (jitsu).',
        explanationMy: '「日」 ၏ အွန်ယောမိ ဖတ်နည်းမှာ ニチ ဖြစ်ပါသည်။',
        isAIGenerated: true,
      },
    ];
  }

  const k = pack.kanjis[0];
  const onyomiStr = k.onyomi?.length ? k.onyomi.join(', ') : 'None';
  const kunyomiStr = k.kunyomi?.length ? k.kunyomi.join(', ') : 'None';
  const meaning = k.meaningMy || k.meaning;

  return [
    {
      id: `drill_kanji_${k.id}_${Date.now()}`,
      category: 'kanji',
      format: 'multiple_choice',
      prompt: `Kanji Character: ${k.char}`,
      promptMy: `ခန်းဂျီး စာလုံး: ${k.char} (${meaning})`,
      targetItem: k.char,
      targetSkill: `Kanji: ${k.char}`,
      relatedLessonId: pack.id,
      question: `漢字「${k.char}」の正しい読み方と意味を選んでください。`,
      choices: [
        `On: ${onyomiStr} | Kun: ${kunyomiStr} — ${meaning}`,
        `On: シン | Kun: あたら.しい — အသစ်`,
        `On: コウ | Kun: い.く — သွားသည်`,
        `On: ジン | Kun: ひと — လူ`,
      ].sort(() => 0.5 - Math.random()),
      answer: `On: ${onyomiStr} | Kun: ${kunyomiStr} — ${meaning}`,
      hint: `Stroke count: ${k.strokes || 'Standard'}`,
      hintMy: `အဓိပ္ပာယ်: ${meaning}`,
      explanation: `「${k.char}」: Onyomi [${onyomiStr}], Kunyomi [${kunyomiStr}]. Meaning: ${meaning}.`,
      explanationMy: `「${k.char}」 ၏ ဖတ်နည်းမှာ Onyomi [${onyomiStr}]၊ Kunyomi [${kunyomiStr}] ဖြစ်ပြီး အဓိပ္ပာယ်မှာ "${meaning}" ဖြစ်ပါသည်။`,
      isAIGenerated: true,
    },
  ];
}

function generateReadingDrills(finding: WeaknessFinding, pack?: LessonPack): PersonalizedExercise[] {
  const reading = pack?.reading;
  const passageSnippet = reading?.text ? reading.text.slice(0, 150) + '...' : '短文を読んで質問に答えてください。';
  return [
    {
      id: `drill_reading_${Date.now()}_1`,
      category: 'reading',
      format: 'reading_qa',
      prompt: 'Short Passage Comprehension:',
      promptMy: 'စာပိုဒ်တို ဖတ်ရှုနားလည်မှု လေ့ကျင့်ခန်း:',
      targetItem: '読解 (Reading Passage)',
      targetSkill: 'Reading Comprehension',
      relatedLessonId: pack?.id,
      question: `${passageSnippet}\n\n質問：この文章のテーマは何ですか。`,
      choices: [
        '日常の出来事についての感想',
        '旅行の計画と日程',
        '仕事の連絡事項',
        '天気の変化と注意点',
      ],
      answer: '日常の出来事についての感想',
      hint: 'Read the first and concluding sentences carefully.',
      hintMy: 'ပထမဆုံး စာကြောင်းနှင့် နောက်ဆုံး နိဂုံးချုပ် စာကြောင်းကို သေချာဖတ်ပါ။',
      explanation: 'The passage describes personal impressions of daily events.',
      explanationMy: 'စာပိုဒ်သည် နေ့စဉ်ဘဝအကြောင်း အတွေ့အကြုံနှင့် ခံစားချက်ကို ဖော်ပြထားပါသည်။',
      isAIGenerated: true,
    },
  ];
}

function generateListeningDrills(finding: WeaknessFinding, pack?: LessonPack): PersonalizedExercise[] {
  const dialogue = pack?.listening;
  const transcriptSnippet = dialogue?.turns && dialogue.turns.length > 0
    ? dialogue.turns.map((t) => `${t.speaker}: ${t.ja}`).slice(0, 3).join('\n')
    : 'A: 明日の待ち合わせは何時にしますか。\nB: 駅の前に１０時でどうですか。\nA: わかりました。そうしましょう。';

  return [
    {
      id: `drill_listening_${Date.now()}_1`,
      category: 'listening',
      format: 'multiple_choice',
      prompt: 'Dialogue Transcript Listening Comprehension:',
      promptMy: 'စကားပြော နားထောင်မှု လေ့ကျင့်ခန်း:',
      targetItem: '聴解 (Listening Dialogue)',
      targetSkill: 'Dialogue Comprehension',
      relatedLessonId: pack?.id,
      question: `${transcriptSnippet}\n\n質問：二人は明日、何時にどこで会いますか。`,
      choices: [
        '駅の前に１０時',
        '駅の前に９時',
        '図書館に１０時',
        '喫茶店に１１時',
      ],
      answer: '駅の前に１０時',
      hint: 'Listen/read Speaker B response carefully.',
      hintMy: 'စကားပြောသူ B ၏ အဖြေကို သေချာကြည့်ပါ။',
      explanation: 'Speaker B suggested "駅の前に１０時でどうですか", and Speaker A agreed.',
      explanationMy: 'စကားပြောသူ B က "ဘူတာရုံရှေ့ ၁၀ နာရီ" ဟု အဆိုပြုခဲ့ပြီး နှစ်ဦးစလုံး သဘောတူခဲ့ပါသည်။',
      isAIGenerated: true,
    },
  ];
}

function generateGeneralReinforcementExercises(packs: LessonPack[], maxExercises: number): PersonalizedExercise[] {
  const pack = packs[0];
  return [
    {
      id: `drill_general_${Date.now()}_1`,
      category: 'grammar',
      format: 'multiple_choice',
      prompt: 'General Review Practice:',
      promptMy: 'အထွေထွေ ပြန်လှန်လေ့ကျင့်ခန်း:',
      targetItem: '総合練習',
      targetSkill: 'General Grammar & Vocabulary',
      relatedLessonId: pack?.id,
      question: '毎朝、新聞を（　　）から会社へ行きます。',
      choices: ['読んで', '読んだ', '読む', '読み'],
      answer: '読んで',
      hint: 'The pattern 〜てから indicates sequential action ("after doing...").',
      hintMy: 'တစ်ခုခု လုပ်ပြီးမှ နောက်တစ်ခုဆက်လုပ်ခြင်းကို 〜てから ဖြင့် ဖော်ပြသည်။',
      explanation: 'Verb -te form + から expresses "after doing": 読んでから = after reading.',
      explanationMy: 'ကြိယာ て ပုံစံ + から သည် "လုပ်ပြီးနောက်" ဟု အဓိပ္ပာယ်ရပါသည်။',
      isAIGenerated: true,
    },
  ];
}
