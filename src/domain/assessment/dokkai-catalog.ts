import { LessonPack, Question } from '../models/types';

export type DokkaiPassageFormat = 'tanki' | 'chuki' | 'choubun';

export interface DokkaiGlossaryItem {
  term: string;
  reading: string;
  pos?: string;
  meaningEn: string;
  meaningMy?: string;
  level?: string;
}

export interface DokkaiSentence {
  id: string; // e.g. "p1_s1"
  paragraphIndex: number;
  sentenceIndex: number;
  text: string;
  furiganaText?: string; // With ruby annotations e.g. "現代[げんだい]社会[しゃかい]"
  isAuthorClaim?: boolean;
  isEvidenceForQuestionId?: string;
}

export interface DokkaiParagraph {
  index: number;
  sentences: DokkaiSentence[];
  rawText: string;
}

export interface DokkaiQuestion {
  id: string;
  prompt: string;
  promptJa?: string;
  choices: string[];
  answer: string;
  explanation: string;
  evidenceSentenceIds: string[];
  distractorExplanations?: Record<string, string>;
  strategyTip?: string;
}

export interface DokkaiPassageModel {
  id: string;
  title: string;
  titleJa: string;
  format: DokkaiPassageFormat;
  formatLabel: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  targetMinutes: number;
  targetCpm: number;
  paragraphs: DokkaiParagraph[];
  fullText: string;
  translation: string;
  glossary: DokkaiGlossaryItem[];
  questions: DokkaiQuestion[];
}

/**
 * Split raw Japanese text into clean sentences ending in 「。」「！」「？」
 */
export function splitJapaneseSentences(text: string): string[] {
  if (!text) return [];
  const normalized = text.trim();
  // Match sentences ending in punctuation or end of line
  const regex = /[^。！？\n]+[。！？]?/g;
  const matches = normalized.match(regex);
  if (!matches || matches.length === 0) {
    return [normalized];
  }
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Split text into paragraphs by newline
 */
export function parseJapaneseParagraphs(text: string): DokkaiParagraph[] {
  const rawParagraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (rawParagraphs.length === 0) {
    return [
      {
        index: 1,
        rawText: text,
        sentences: [
          {
            id: 'p1_s1',
            paragraphIndex: 1,
            sentenceIndex: 1,
            text: text,
          },
        ],
      },
    ];
  }

  return rawParagraphs.map((paraText, pIdx) => {
    const sentences = splitJapaneseSentences(paraText).map((sText, sIdx) => ({
      id: `p${pIdx + 1}_s${sIdx + 1}`,
      paragraphIndex: pIdx + 1,
      sentenceIndex: sIdx + 1,
      text: sText,
    }));

    return {
      index: pIdx + 1,
      rawText: paraText,
      sentences,
    };
  });
}

/**
 * Converts a standard LessonPack reading passage into the rich DokkaiPassageModel
 */
export function convertLessonReadingToDokkai(pack: LessonPack): DokkaiPassageModel {
  const reading = pack.reading;
  const paragraphs = parseJapaneseParagraphs(reading.text);

  // Link reading questions from the pack
  const readingQuestions = pack.questions.filter(
    (q) => reading.questionIds.includes(q.id) || q.skill === 'reading'
  );

  const dokkaiQuestions: DokkaiQuestion[] = readingQuestions.map((q, idx) => {
    // Pick first or last sentence as tentative evidence if none annotated
    const allSentences = paragraphs.flatMap((p) => p.sentences);
    const fallbackSentence =
      allSentences[Math.min(idx, allSentences.length - 1)]?.id || 'p1_s1';

    return {
      id: q.id,
      prompt: (q as any).promptMy || (q as any).questionMy || q.prompt,
      promptJa: `設問 ${idx + 1}：文章の内容と合致するものを一つ選びなさい。`,
      choices: q.choices && q.choices.length > 0 ? q.choices : [q.answer, '選択肢 B', '選択肢 C', '選択肢 D'],
      answer: q.answer,
      explanation: q.explanation || '本文の該当箇所と選択肢を照らし合わせて確認しましょう。',
      evidenceSentenceIds: [fallbackSentence],
      strategyTip: 'မေးခွန်းရှိ ကတ္တရာနှင့် ကြိယာကို ရှာဖွေပြီး၊ ရှေ့နောက် စကားဆက်များကို သတိပြုပါ။',
    };
  });

  // Extract vocabulary from lesson pack for the miner
  const glossary: DokkaiGlossaryItem[] = pack.vocabularies.map((v) => ({
    term: v.ja,
    reading: v.kana,
    pos: v.pos,
    meaningEn: v.en,
    meaningMy: v.my,
    level: pack.level,
  }));

  const fullText = reading.text;
  const charCount = fullText.replace(/\s+/g, '').length;
  let format: DokkaiPassageFormat = 'chuki';
  if (charCount < 260) format = 'tanki';
  else if (charCount > 550) format = 'choubun';

  const formatLabels: Record<DokkaiPassageFormat, string> = {
    tanki: 'စာပိုဒ်တို (Tanki)',
    chuki: 'စာပိုဒ်လတ် (Chuki)',
    choubun: 'စာပိုဒ်ရှည် (Choubun)',
  };

  return {
    id: reading.id,
    title: (reading as any).titleMy || reading.title,
    titleJa: `【${pack.level} 読解】${(reading as any).titleMy || reading.title}`,
    format,
    formatLabel: formatLabels[format],
    level: pack.level,
    targetMinutes: format === 'tanki' ? 3 : format === 'chuki' ? 6 : 10,
    targetCpm: pack.level === 'N2' ? 300 : pack.level === 'N3' ? 220 : 160,
    paragraphs,
    fullText,
    translation: reading.translation,
    glossary,
    questions: dokkaiQuestions,
  };
}

/**
 * Curated authentic JLPT Dokkai passages across Tanki, Chuki, and Choubun formats
 */
export const CURATED_DOKKAI_CATALOG: DokkaiPassageModel[] = [
  // 1. N2 TANKI (短文 - Short Passage, 185 chars)
  {
    id: 'dokkai_n2_tanki_01',
    title: 'Modern Work and Instant Replies',
    titleJa: '現代における即時返信への疑問（短文・主張把握）',
    format: 'tanki',
    formatLabel: '短文 (Tanki • ~200字)',
    level: 'N2',
    targetMinutes: 3,
    targetCpm: 300,
    fullText:
      '近年、チャットツールの普及に伴い、常に迅速な返信を求める風潮が強まっている。しかし、即座に返事をすることが必ずしも誠実な対応を意味するわけではない。十分に思考を深めずに送られた言葉は、時に誤解を生み、かえって業務の効率を損ねることすらある。真に相手を尊重するならば、スピードよりも内容の熟慮を最優先にすべきではないだろうか。',
    translation:
      'In recent years, along with the spread of chat tools, the trend of demanding immediate replies has grown stronger. However, responding instantaneously does not necessarily equate to sincere communication. Words sent without deep reflection sometimes create misunderstandings and may even harm business efficiency. If one truly respects the other party, should we not prioritize careful deliberation of content over mere speed?',
    paragraphs: [
      {
        index: 1,
        rawText:
          '近年、チャットツールの普及に伴い、常に迅速な返信を求める風潮が強まっている。しかし、即座に返事をすることが必ずしも誠実な対応を意味するわけではない。十分に思考を深めずに送られた言葉は、時に誤解を生み、かえって業務の効率を損ねることすらある。真に相手を尊重するならば、スピードよりも内容の熟慮を最優先にすべきではないだろうか。',
        sentences: [
          {
            id: 'n2_t1_p1_s1',
            paragraphIndex: 1,
            sentenceIndex: 1,
            text: '近年、チャットツールの普及に伴い、常に迅速な返信を求める風潮が強まっている。',
          },
          {
            id: 'n2_t1_p1_s2',
            paragraphIndex: 1,
            sentenceIndex: 2,
            text: 'しかし、即座に返事をすることが必ずしも誠実な対応を意味するわけではない。',
          },
          {
            id: 'n2_t1_p1_s3',
            paragraphIndex: 1,
            sentenceIndex: 3,
            text: '十分に思考を深めずに送られた言葉は、時に誤解を生み、かえって業務の効率を損ねることすらある。',
          },
          {
            id: 'n2_t1_p1_s4',
            paragraphIndex: 1,
            sentenceIndex: 4,
            text: '真に相手を尊重するならば、スピードよりも内容の熟慮を最優先にすべきではないだろうか。',
            isAuthorClaim: true,
            isEvidenceForQuestionId: 'n2_t1_q1',
          },
        ],
      },
    ],
    glossary: [
      { term: '普及', reading: 'ふきゅう', pos: '名詞・する', meaningEn: 'Diffusion / widespread adoption', meaningMy: 'ပျံ့နှံ့ခြင်း', level: 'N2' },
      { term: '迅速', reading: 'じんそく', pos: 'な形容詞', meaningEn: 'Prompt / swift / rapid', meaningMy: 'လျင်မြန်သော', level: 'N2' },
      { term: '風潮', reading: 'ふうちょう', pos: '名詞', meaningEn: 'Prevailing trend / tide', meaningMy: 'ခေတ်ရေစီးကြောင်း', level: 'N2' },
      { term: '誠実', reading: 'せいじつ', pos: 'な形容詞', meaningEn: 'Sincere / honest / faithful', meaningMy: 'ရိုးသားဖြောင့်မတ်သော', level: 'N2' },
      { term: '熟慮', reading: 'じゅくりょ', pos: '名詞・する', meaningEn: 'Mature deliberation / careful thought', meaningMy: 'သေချာစဉ်းစားဆင်ခြင်ခြင်း', level: 'N2' },
      { term: '尊重', reading: 'そんちょう', pos: '名詞・する', meaningEn: 'Respect / esteem', meaningMy: 'လေးစားတန်ဖိုးထားခြင်း', level: 'N2' },
    ],
    questions: [
      {
        id: 'n2_t1_q1',
        prompt: '筆者の考えと最も合致するものはどれか。',
        promptJa: '【筆者の主張】筆者が最も言いたいことは何か。',
        choices: [
          'チャットツールを使用する際は、できる限り即座に返信すべきである。',
          '迅速な返信よりも、内容をよく考えた丁寧なやり取りを重視すべきである。',
          '言葉の誤解を防ぐためには、チャットツールの使用自体をやめるべきである。',
          '業務の効率化のためには、思考を深める時間を短縮することが求められる。',
        ],
        answer: '迅速な返信よりも、内容をよく考えた丁寧なやり取りを重視すべきである。',
        explanation:
          '第4文「スピードよりも内容の熟慮を最優先にすべきではないだろうか」という修辞疑問文に筆者の核心的な主張が直接述べられています。',
        evidenceSentenceIds: ['n2_t1_p1_s4'],
        distractorExplanations: {
          'チャットツールを使用する際は、できる限り即座に返信すべきである。': '本文第2文で「即座に返事をすることが必ずしも誠実な対応を意味するわけではない」と否定されています。',
          '言葉の誤解を防ぐためには、チャットツールの使用自体をやめるべきである。': '本文ではツールの使用中止までは主張しておらず、飛躍した解釈です。',
          '業務の効率化のためには、思考を深める時間を短縮することが求められる。': '本文では「十分に思考を深めずに送られた言葉は効率を損ねる」とあり、逆の論理です。',
        },
        strategyTip: '「〜ではないだろうか」はJLPT N2で最重要の「筆者の主張の合図（シグナルフレーズ）」です。',
      },
    ],
  },

  // 2. N2 CHUKI (中文 - Medium Passage, 420 chars, 2 questions)
  {
    id: 'dokkai_n2_chuki_01',
    title: 'Artificial Intelligence and Human Empathy',
    titleJa: '人工知能の発展と人間の「共感力」（中文・段落展開）',
    format: 'chuki',
    formatLabel: '中文 (Chuki • ~400字)',
    level: 'N2',
    targetMinutes: 6,
    targetCpm: 310,
    fullText:
      '人工知能（AI）の技術革新は目覚ましく、膨大なデータの分析や定型的な判断においては、すでに人間をはるかに凌駕している。これによって、多くの専門職が代替されるのではないかという懸念が各方面で囁かれている。\n\nだが、私はこの変化を過度に恐れる必要はないと考えている。いかに高度な知能であっても、他者の痛みを自らの経験と重ね合わせて理解する「共感」の機能は持ち得ないからである。AIが出力する回答は統計的確率の産物にすぎず、そこに血の通った心情は存在しない。\n\nしたがって、これからの時代に求められるのは、知識の暗記や処理能力ではなく、他者の曖昧な感情を汲み取る力にほかならない。機械が得意な領域は機械に委ね、人間は人間にしか成し得ない絆を深めることに注力すべきである。',
    translation:
      'Technological innovation in AI is remarkable; in analyzing huge amounts of data and routine judgments, it has already far surpassed humans. Consequently, concerns are whispered across various fields that many specialized professions may be replaced.\n\nHowever, I believe there is no need to be excessively afraid of this change. No matter how advanced intelligence becomes, it cannot possess the capacity for "empathy"—understanding another\'s pain by superimposing it onto one\'s own experience. The answers AI outputs are merely products of statistical probabilities, without a living, breathing emotional heart.\n\nTherefore, what will be demanded in the coming era is not memorization of knowledge or processing prowess, but nothing less than the ability to comprehend the nuanced emotions of others. We should entrust machine-proficient domains to machines, and humans should focus on deepening connections that only humans can forge.',
    paragraphs: [
      {
        index: 1,
        rawText:
          '人工知能（AI）の技術革新は目覚ましく、膨大なデータの分析や定型的な判断においては、すでに人間をはるかに凌駕している。これによって、多くの専門職が代替されるのではないかという懸念が各方面で囁かれている。',
        sentences: [
          {
            id: 'n2_c1_p1_s1',
            paragraphIndex: 1,
            sentenceIndex: 1,
            text: '人工知能（AI）の技術革新は目覚ましく、膨大なデータの分析や定型的な判断においては、すでに人間をはるかに凌駕している。',
          },
          {
            id: 'n2_c1_p1_s2',
            paragraphIndex: 1,
            sentenceIndex: 2,
            text: 'これによって、多くの専門職が代替されるのではないかという懸念が各方面で囁かれている。',
          },
        ],
      },
      {
        index: 2,
        rawText:
          'だが、私はこの変化を過度に恐れる必要はないと考えている。いかに高度な知能であっても、他者の痛みを自らの経験と重ね合わせて理解する「共感」の機能は持ち得ないからである。AIが出力する回答は統計的確率の産物にすぎず、そこに血の通った心情は存在しない。',
        sentences: [
          {
            id: 'n2_c1_p2_s1',
            paragraphIndex: 2,
            sentenceIndex: 1,
            text: 'だが、私はこの変化を過度に恐れる必要はないと考えている。',
          },
          {
            id: 'n2_c1_p2_s2',
            paragraphIndex: 2,
            sentenceIndex: 2,
            text: 'いかに高度な知能であっても、他者の痛みを自らの経験と重ね合わせて理解する「共感」の機能は持ち得ないからである。',
            isEvidenceForQuestionId: 'n2_c1_q1',
          },
          {
            id: 'n2_c1_p2_s3',
            paragraphIndex: 2,
            sentenceIndex: 3,
            text: 'AIが出力する回答は統計的確率の産物にすぎず、そこに血の通った心情は存在しない。',
          },
        ],
      },
      {
        index: 3,
        rawText:
          'したがって、これからの時代に求められるのは、知識の暗記や処理能力ではなく、他者の曖昧な感情を汲み取る力にほかならない。機械が得意な領域は機械に委ね、人間は人間にしか成し得ない絆を深めることに注力すべきである。',
        sentences: [
          {
            id: 'n2_c1_p3_s1',
            paragraphIndex: 3,
            sentenceIndex: 1,
            text: 'したがって、これからの時代に求められるのは、知識の暗記や処理能力ではなく、他者の曖昧な感情を汲み取る力にほかならない。',
            isAuthorClaim: true,
            isEvidenceForQuestionId: 'n2_c1_q2',
          },
          {
            id: 'n2_c1_p3_s2',
            paragraphIndex: 3,
            sentenceIndex: 2,
            text: '機械が得意な領域は機械に委ね、人間は人間にしか成し得ない絆を深めることに注力すべきである。',
          },
        ],
      },
    ],
    glossary: [
      { term: '凌駕', reading: 'りょうが', pos: '名詞・する', meaningEn: 'Surpassing / outstripping', meaningMy: 'ကျော်လွန်သာလွန်ခြင်း', level: 'N2' },
      { term: '懸念', reading: 'けねん', pos: '名詞・する', meaningEn: 'Worry / concern / fear', meaningMy: 'စိုးရိမ်ပူပန်မှု', level: 'N2' },
      { term: '共感', reading: 'きょうかん', pos: '名詞・する', meaningEn: 'Empathy / sympathy', meaningMy: 'စာနာနားလည်မှု', level: 'N2' },
      { term: '汲み取る', reading: 'くみとる', pos: '他動詞', meaningEn: 'To sense / comprehend / sympathize with', meaningMy: 'ခံစားနားလည်ပေးသည်', level: 'N2' },
      { term: '委ねる', reading: 'ゆだねる', pos: '他動詞', meaningEn: 'To entrust to / yield to', meaningMy: 'လွှဲအပ်သည်', level: 'N2' },
    ],
    questions: [
      {
        id: 'n2_c1_q1',
        prompt: '筆者が「この変化を過度に恐れる必要はない」と述べる理由は何か。',
        promptJa: '【理由説明】段落2で筆者が恐れる必要はないとする根拠はどれか。',
        choices: [
          'AIの計算能力には限界があり、専門職の仕事を奪うことは絶対にないから。',
          'AIはいかに高度になっても、人間の経験に基づく共感の機能を持てないから。',
          'AI技術の発展はまもなく停止し、人間との協力関係が成立するから。',
          '人間が知識の暗記量を増やせば、AIの能力に追いつくことができるから。',
        ],
        answer: 'AIはいかに高度になっても、人間の経験に基づく共感の機能を持てないから。',
        explanation:
          '第2段落の「いかに高度な知能であっても、他者の痛みを自らの経験と重ね合わせて理解する『共感』の機能は持ち得ないからである」に直結しています。',
        evidenceSentenceIds: ['n2_c1_p2_s2'],
        distractorExplanations: {
          'AIの計算能力には限界があり、専門職の仕事を奪うことは絶対にないから。': '第1段落で「人間をはるかに凌駕している」とあり、矛盾します。',
          'AI技術の発展はまもなく停止し、人間との協力関係が成立するから。': '発展が停止するとは本文に一切書かれていません。',
          '人間が知識の暗記量を増やせば、AIの能力に追いつくことができるから。': '第3段落で「知識の暗記や処理能力ではなく」と否定されています。',
        },
        strategyTip: '「〜からである」「〜ためだ」という文末は、直前の主張に対する明確な根拠文です。',
      },
      {
        id: 'n2_c1_q2',
        prompt: 'これからの社会で人間に最も求められることとして、筆者は何を挙げているか。',
        promptJa: '【最終的主張】筆者がこれからの時代に最も必要だと考えているものは何か。',
        choices: [
          'AIを適切にプログラミングし、管理するための高度な技術力。',
          '膨大なデータを素早く正確に分析し、処理する能力。',
          '相手の心情や繊細な感情を理解し、人間同士の絆を深める力。',
          '機械に頼ることなく、すべての業務を自分自身の手で行う意志。',
        ],
        answer: '相手の心情や繊細な感情を理解し、人間同士の絆を深める力。',
        explanation:
          '第3段落「他者の曖昧な感情を汲み取る力にほかならない」「人間は人間にしか成し得ない絆を深めることに注力すべきである」と完全に一致します。',
        evidenceSentenceIds: ['n2_c1_p3_s1'],
        distractorExplanations: {
          'AIを適切にプログラミングし、管理するための高度な技術力。': '本文の焦点は感情や共感であり、プログラミング技術ではありません。',
          '膨大なデータを素早く正確に分析し、処理する能力。': 'これは第1段落で機械が得意とする領域として対比されています。',
          '機械に頼ることなく、すべての業務を自分自身の手で行う意志。': '「機械が得意な領域は機械に委ね」とあるため正反対です。',
        },
        strategyTip: '「したがって」「〜にほかならない」は結論段落で著者が最も伝えたいメッセージを強調する文型です。',
      },
    ],
  },

  // 3. N2 CHOUBUN (長文 - Long Passage, 720 chars, 3 questions)
  {
    id: 'dokkai_n2_choubun_01',
    title: 'Urban Development and Historical Heritage',
    titleJa: '都市開発と歴史的建造物の共存に関する考察（長文・対比と総合主張）',
    format: 'choubun',
    formatLabel: '長文 (Choubun • ~750字)',
    level: 'N2',
    targetMinutes: 10,
    targetCpm: 320,
    fullText:
      '近代都市の景観は、機能性と効率性をひたすら追い求めてきた。古い木造家屋や歴史ある町並みは、防災や再開発の名のもとに次々と取り壊され、画一的な高層ビルへと姿を変えている。確かに、耐震性の向上や近代的な設備の充実は、住民の安全や利便性を確保する上で不可欠な要素であろう。\n\nしかし、街の魅力とは、単に利便性の高さだけで測れるものだろうか。歴史的建造物が街に醸し出す趣や時間の重みは、一度失われてしまえば、どんなに潤沢な資金を投じても二度と再生することはできない。古い建物を残すことは、過去への感傷に浸るためではなく、その土地固有の記憶やアイデンティティを未来へと継承するための営みである。\n\n欧州の諸都市に目を向ければ、外観の歴史的保存と内部の最新改装を両立させる「適応的再利用」が定着している。日本においても、単に「保存か開発か」という二者択一の対立にとらわれるのではなく、共存の道を真剣に模索すべき時が来ているのではないか。\n\n都市の真の豊かさとは、最先端の利便性を享受しつつも、歴史の息づかいを肌で感じられる重層的な空間にこそ宿るのである。',
    translation:
      'The landscape of modern cities has persistently pursued functionality and efficiency. Old wooden houses and historic streetscapes have been demolished one after another in the name of disaster prevention and redevelopment, transformed into uniform high-rise buildings. To be sure, improving earthquake resistance and enhancing modern amenities are indispensable elements for ensuring residents\' safety and convenience.\n\nHowever, can a city\'s charm truly be measured solely by its level of convenience? The historic atmosphere and weight of time that historical buildings impart to a town, once lost, cannot be recreated no matter how abundant the capital invested. Preserving old architecture is not meant for indulging in nostalgia toward the past, but is an endeavor to bequeath that land\'s unique memory and identity to future generations.\n\nLooking at European cities, "adaptive reuse"—balancing historical exterior preservation with state-of-the-art interior refurbishment—has taken firm root. In Japan as well, rather than remaining trapped in a binary opposition of "preservation versus development," has the time not arrived to earnestly seek a path toward coexistence?\n\nA city\'s true richness resides precisely in multilayered spaces where one can enjoy cutting-edge convenience while simultaneously feeling the living breath of history firsthand.',
    paragraphs: [
      {
        index: 1,
        rawText:
          '近代都市の景観は、機能性と効率性をひたすら追い求めてきた。古い木造家屋や歴史ある町並みは、防災や再開発の名のもとに次々と取り壊され、画一的な高層ビルへと姿を変えている。確かに、耐震性の向上や近代的な設備の充実は、住民の安全や利便性を確保する上で不可欠な要素であろう。',
        sentences: [
          {
            id: 'n2_l1_p1_s1',
            paragraphIndex: 1,
            sentenceIndex: 1,
            text: '近代都市の景観は、機能性と効率性をひたすら追い求めてきた。',
          },
          {
            id: 'n2_l1_p1_s2',
            paragraphIndex: 1,
            sentenceIndex: 2,
            text: '古い木造家屋や歴史ある町並みは、防災や再開発の名のもとに次々と取り壊され、画一的な高層ビルへと姿を変えている。',
          },
          {
            id: 'n2_l1_p1_s3',
            paragraphIndex: 1,
            sentenceIndex: 3,
            text: '確かに、耐震性の向上や近代的な設備の充実は、住民の安全や利便性を確保する上で不可欠な要素であろう。',
          },
        ],
      },
      {
        index: 2,
        rawText:
          'しかし、街の魅力とは、単に利便性の高さだけで測れるものだろうか。歴史的建造物が街に醸し出す趣や時間の重みは、一度失われてしまえば、どんなに潤沢な資金を投じても二度と再生することはできない。古い建物を残すことは、過去への感傷に浸るためではなく、その土地固有の記憶やアイデンティティを未来へと継承するための営みである。',
        sentences: [
          {
            id: 'n2_l1_p2_s1',
            paragraphIndex: 2,
            sentenceIndex: 1,
            text: 'しかし、街の魅力とは、単に利便性の高さだけで測れるものだろうか。',
          },
          {
            id: 'n2_l1_p2_s2',
            paragraphIndex: 2,
            sentenceIndex: 2,
            text: '歴史的建造物が街に醸し出す趣や時間の重みは、一度失われてしまえば、どんなに潤沢な資金を投じても二度と再生することはできない。',
          },
          {
            id: 'n2_l1_p2_s3',
            paragraphIndex: 2,
            sentenceIndex: 3,
            text: '古い建物を残すことは、過去への感傷に浸るためではなく、その土地固有の記憶やアイデンティティを未来へと継承するための営みである。',
            isEvidenceForQuestionId: 'n2_l1_q1',
          },
        ],
      },
      {
        index: 3,
        rawText:
          '欧州の諸都市に目を向ければ、外観の歴史的保存と内部の最新改装を両立させる「適応的再利用」が定着している。日本においても、単に「保存か開発か」という二者択一の対立にとらわれるのではなく、共存の道を真剣に模索すべき時が来ているのではないか。',
        sentences: [
          {
            id: 'n2_l1_p3_s1',
            paragraphIndex: 3,
            sentenceIndex: 1,
            text: '欧州の諸都市に目を向ければ、外観の歴史的保存と内部の最新改装を両立させる「適応的再利用」が定着している。',
            isEvidenceForQuestionId: 'n2_l1_q2',
          },
          {
            id: 'n2_l1_p3_s2',
            paragraphIndex: 3,
            sentenceIndex: 2,
            text: '日本においても、単に「保存か開発か」という二者択一の対立にとらわれるのではなく、共存の道を真剣に模索すべき時が来ているのではないか。',
          },
        ],
      },
      {
        index: 4,
        rawText:
          '都市の真の豊かさとは、最先端の利便性を享受しつつも、歴史の息づかいを肌で感じられる重層的な空間にこそ宿るのである。',
        sentences: [
          {
            id: 'n2_l1_p4_s1',
            paragraphIndex: 4,
            sentenceIndex: 1,
            text: '都市の真の豊かさとは、最先端の利便性を享受しつつも、歴史の息づかいを肌で感じられる重層的な空間にこそ宿るのである。',
            isAuthorClaim: true,
            isEvidenceForQuestionId: 'n2_l1_q3',
          },
        ],
      },
    ],
    glossary: [
      { term: '画一的', reading: 'かくいつてき', pos: 'な形容詞', meaningEn: 'Uniform / standardized / monolithic', meaningMy: 'တစ်ပုံစံတည်းဖြစ်သော', level: 'N2' },
      { term: '醸し出す', reading: 'かもしだす', pos: '他動詞', meaningEn: 'To brew / engender / create (atmosphere)', meaningMy: 'ဖန်တီးဖြစ်ပေါ်စေသည်', level: 'N2' },
      { term: '潤沢', reading: 'じゅんたく', pos: 'な形容詞', meaningEn: 'Abundant / plentiful', meaningMy: 'ပေါများကြွယ်ဝသော', level: 'N2' },
      { term: '感傷', reading: 'かんしょう', pos: '名詞', meaningEn: 'Sentimentality / nostalgia', meaningMy: 'စိတ်ခံစားမှုလွန်ကဲခြင်း', level: 'N2' },
      { term: '継承', reading: 'けいしょう', pos: '名詞・する', meaningEn: 'Inheritance / succession / passing on', meaningMy: 'အမွေဆက်ခံခြင်း', level: 'N2' },
      { term: '二者択一', reading: 'にしゃたくいつ', pos: '名詞', meaningEn: 'Choosing between two alternatives / dilemma', meaningMy: 'နှစ်ခုအနက်တစ်ခုရွေးချယ်ခြင်း', level: 'N2' },
      { term: '重層的', reading: 'じゅうそうてき', pos: 'な形容詞', meaningEn: 'Multilayered / stratified', meaningMy: 'အလွှာပေါင်းစုံပါဝင်သော', level: 'N2' },
    ],
    questions: [
      {
        id: 'n2_l1_q1',
        prompt: '第2段落において、筆者が歴史的建物を残すべきだと考える本質的な理由は何か。',
        promptJa: '【理由・論拠把握】段落2で筆者が保存の意義として挙げているものはどれか。',
        choices: [
          '過去の生活に対する懐かしさや感傷に浸ることができるから。',
          '一度取り壊しても、資金さえあればいつでも再現できるから。',
          'その土地独自の歴史や記憶を、将来の世代へと引き継ぐため。',
          '木造家屋の方が鉄筋の高層ビルよりも地震の揺れに強いから。',
        ],
        answer: 'その土地独自の歴史や記憶を、将来の世代へと引き継ぐため。',
        explanation:
          '第2段落最後の文「その土地固有の記憶やアイデンティティを未来へと継承するための営みである」が直接の根拠です。',
        evidenceSentenceIds: ['n2_l1_p2_s3'],
        distractorExplanations: {
          '過去の生活に対する懐かしさや感傷に浸ることができるから。': '「過去への感傷に浸るためではなく」と明示的に否定されています。',
          '一度取り壊しても、資金さえあればいつでも再現できるから。': '「どんなに潤沢な資金を投じても二度と再生することはできない」と書かれています。',
          '木造家屋の方が鉄筋の高層ビルよりも地震の揺れに強いから。': '第1段落で耐震性向上は近代設備の利点と述べられており、誤りです。',
        },
        strategyTip: '「〜ためではなく、〜ためである」構文は、Aを否定してBを主張する最重要レトリックです。',
      },
      {
        id: 'n2_l1_q2',
        prompt: '第3段落の「適応的再利用」について、欧州の事例として正しいものはどれか。',
        promptJa: '【詳細理解】欧州で定着している再利用方法の説明として正しいものはどれか。',
        choices: [
          '外観の歴史的な景観を保ちながら、内部を現代の基準で最新設備に改装する。',
          '建物の内外すべてを元の状態のまま保存し、人が立ち入らないようにする。',
          '古い建物をすべて解体し、外観のみを昔に似せた新しいビルを建設する。',
          '開発を完全に禁止し、住民に昔ながらの不便な生活を義務付ける。',
        ],
        answer: '外観の歴史的な景観を保ちながら、内部を現代の基準で最新設備に改装する。',
        explanation:
          '第3段落第1文「外観の歴史的保存と内部の最新改装を両立させる」と一致します。',
        evidenceSentenceIds: ['n2_l1_p3_s1'],
        distractorExplanations: {
          '建物の内外すべてを元の状態のまま保存し、人が立ち入らないようにする。': '内部を最新改装して実際に利用するため誤りです。',
          '古い建物をすべて解体し、外観のみを昔に似せた新しいビルを建設する。': '外観は保存するため解体ではありません。',
          '開発を完全に禁止し、住民に昔ながらの不便な生活を義務付ける。': '利便性と歴史の共存を目指しているため極端な誤りです。',
        },
        strategyTip: '「AとBを両立させる」という対比表現の具体的内容を正確に押さえましょう。',
      },
      {
        id: 'n2_l1_q3',
        prompt: '文章全体を通じて、筆者が都市のあり方について最も強く主張していることは何か。',
        promptJa: '【総合的主張】筆者が考える都市の「真の豊かさ」とは何か。',
        choices: [
          '防災と効率性を最優先し、すべての建物を超高層ビルに統一すること。',
          '開発を放棄して昔の姿のまま固定し、利便性を追求しないこと。',
          '最新の生活の便利さを享受しながら、歴史や文化の趣が共存していること。',
          '欧州の都市開発の手法を、そのまま日本の全都市に強制的に適用すること。',
        ],
        answer: '最新の生活の便利さを享受しながら、歴史や文化の趣が共存していること。',
        explanation:
          '最終段落「最先端の利便性を享受しつつも、歴史の息づかいを肌で感じられる重層的な空間にこそ宿る」が文章全体の結びとなる筆者の結論です。',
        evidenceSentenceIds: ['n2_l1_p4_s1'],
        distractorExplanations: {
          '防災と効率性を最優先し、すべての建物を超高層ビルに統一すること。': '第1段落で批判的に言及されている画一的な開発です。',
          '開発を放棄して昔の姿のまま固定し、利便性を追求しないこと。': '二者択一を乗り越える共存を提唱しているため誤りです。',
          '欧州の都市開発の手法を、そのまま日本の全都市に強制的に適用すること。': '欧州は参考事例であり、日本での模索を述べています。',
        },
        strategyTip: '長文の主題問題では、最終段落の「〜にこそ宿る」「〜べきである」に注目します。',
      },
    ],
  },
];
