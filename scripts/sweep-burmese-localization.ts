import fs from 'fs';
import path from 'path';
import { KANJI_BURMESE_MAP } from './data/kanji-burmese-map';

const packsDir = path.resolve('content/packs');
const levels = ['n5', 'n4', 'n3', 'n2'];

// 1. Build comprehensive English/Japanese -> Burmese translation dictionary
const globalVocabDict = new Map<string, string>();

for (const level of levels) {
  const dir = path.join(packsDir, level);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const pack = JSON.parse(raw);

    for (const v of pack.vocabularies || []) {
      if (v.my) {
        if (v.en) {
          globalVocabDict.set(v.en.toLowerCase().trim(), v.my);
          // Split on slash or semicolon
          v.en.split(/[/;,]/).forEach((part: string) => {
            const clean = part.trim().toLowerCase();
            if (clean && !globalVocabDict.has(clean)) {
              globalVocabDict.set(clean, v.my);
            }
          });
        }
        if (v.ja) {
          globalVocabDict.set(v.ja, v.my);
        }
      }
    }
  }
}

console.log(`Global Vocab Dictionary terms populated: ${globalVocabDict.size}`);

// Common fallback translations
const COMMON_CHOICE_TRANSLATIONS: Record<string, string> = {
  'good morning': 'မင်္ဂလာနံနက်ခင်းပါ',
  'good afternoon': 'မင်္ဂလာနေ့လယ်ခင်းပါ',
  'good evening': 'မင်္ဂလာညနေခင်းပါ',
  'good night': 'ကောင်းသောညပါ',
  'thank you': 'ကျေးဇူးတင်ပါသည်',
  'thank you very much': 'အထူးကျေးဇူးတင်ပါသည်',
  'excuse me': 'ခွင့်လွှတ်ပါ / တောင်းပန်ပါသည်',
  'im sorry': 'တောင်းပန်ပါသည်',
  'i am sorry': 'တောင်းပန်ပါသည်',
  'hello': 'မင်္ဂလာပါ',
  'goodbye': 'နှုတ်ဆက်ပါတယ်',
  'see you': 'နောက်မှတွေ့မယ်',
  'yes': 'ဟုတ်ကဲ့',
  'no': 'မဟုတ်ပါ',
  'teacher': 'ဆရာ / ဆရာမ',
  'student': 'ကျောင်းသား / ကျောင်းသူ',
  'person': 'လူ',
  'japanese': 'ဂျပန်လူမျိုး',
  'book': 'စာအုပ်',
  'water': 'ရေ',
  'car': 'ကား',
  'friend': 'သူငယ်ချင်း',
  'today': 'ယနေ့',
  'tomorrow': 'မနက်ဖြန်',
  'yesterday': 'မနေ့က',
  'time': 'အချိန်',
  'hour': 'နာရီ',
  'minute': 'မိနစ်',
  'option a': 'ရွေးချယ်စရာ က',
  'option b': 'ရွေးချယ်စရာ ခ',
  'option c': 'ရွေးချယ်စရာ ဂ',
  'option d': 'ရွေးချယ်စရာ ဃ',
};

for (const [k, val] of Object.entries(COMMON_CHOICE_TRANSLATIONS)) {
  if (!globalVocabDict.has(k)) {
    globalVocabDict.set(k, val);
  }
}

function translateChoiceToBurmese(choice: string): string {
  if (!choice) return '';
  const lower = choice.toLowerCase().trim();
  if (globalVocabDict.has(lower)) {
    return globalVocabDict.get(lower)!;
  }
  // Try stripping "To " from verb infinitives e.g. "To eat" -> "eat"
  if (lower.startsWith('to ')) {
    const withoutTo = lower.substring(3).trim();
    if (globalVocabDict.has(withoutTo)) {
      return globalVocabDict.get(withoutTo)!;
    }
  }
  return choice;
}

function localizePrompt(prompt: string, skill: string, answer: string): string {
  if (!prompt) return '';

  // 1. What does 「X」 mean? or What is the meaning of 「X」?
  const meaningMatch = prompt.match(/(?:What does|What is the meaning of)\s+「([^」]+)」(?:\s+mean\??)?/i);
  if (meaningMatch) {
    return `「${meaningMatch[1]}」၏ အဓိပ္ပာယ်မှာ အဘယ်နည်း။`;
  }

  // 2. Type the reading for "X" in hiragana:
  const readingMatch = prompt.match(/Type (?:the )?(?:Japanese )?reading for\s+["“]([^"”]+)["”]\s+in hiragana:?/i);
  if (readingMatch) {
    return `"${readingMatch[1]}" ၏ အသံထွက်ကို ဟီရဂနဖြင့် ရိုက်ထည့်ပါ -`;
  }

  // 3. What is the primary onyomi for 「X」?
  const onyomiMatch = prompt.match(/What is the (?:primary )?onyomi for\s+「([^」]+)」\??/i);
  if (onyomiMatch) {
    return `「${onyomiMatch[1]}」၏ အဓိက အွန်းယောမိ (Onyomi) အသံထွက်မှာ အဘယ်နည်း။`;
  }

  // 4. Complete the sentence with pattern 「X」:
  const patternMatch = prompt.match(/Complete the sentence with (?:grammar )?pattern\s+「([^」]+)」:?/i);
  if (patternMatch) {
    return `「${patternMatch[1]}」သဒ္ဒါပုံစံဖြင့် ဝါကျကို ဖြည့်စွက်ပါ -`;
  }

  // 5. Which expression means "X"?
  const exprMatch = prompt.match(/Which expression (?:means|is used to say)\s+["“]([^"”]+)["”]\??/i);
  if (exprMatch) {
    return `အဘယ်စကားရပ်သည် "${exprMatch[1]}" ဟု အဓိပ္ပာယ်ရသနည်း။`;
  }

  // 6. Which word is an antonym for 「X」?
  const antonymMatch = prompt.match(/Which word is an antonym for\s+「([^」]+)」\??/i);
  if (antonymMatch) {
    return `「${antonymMatch[1]}」၏ ဆန့်ကျင်ဘက်စကားလုံးမှာ အဘယ်နည်း။`;
  }

  // 7. Which word is a synonym for 「X」?
  const synonymMatch = prompt.match(/Which word is a synonym for\s+「([^」]+)」\??/i);
  if (synonymMatch) {
    return `「${synonymMatch[1]}」၏ အဓိပ္ပာယ်တူစကားလုံးမှာ အဘယ်နည်း။`;
  }

  // 8. Listening Question X regarding dialogue turns:
  const listeningMatch = prompt.match(/Listening Question\s+(\d+)\s+regarding dialogue turns:?/i);
  if (listeningMatch) {
    return `စကားပြောခန်းနှင့် သက်ဆိုင်သော နားထောင်မှု မေးခွန်း ${listeningMatch[1]} -`;
  }

  // 9. Reading Comprehension Question X:
  const readingQMatch = prompt.match(/Reading Comprehension Question\s+(\d+):?/i);
  if (readingQMatch) {
    return `စာဖတ်နားလည်မှု မေးခွန်း ${readingQMatch[1]} -`;
  }

  // 10. Japanese cloze patterns
  if (prompt.includes('文の（　）に入れるのに最も適切なもの') || prompt.includes('文中の（　）に入れるのに最も適切なもの') || prompt.includes('（　）に入れるのに最も適切な')) {
    return `ဝါကျရှိ ကွက်လပ် ( ) အတွက် အသင့်တော်ဆုံးကို ရွေးချယ်ပါ -`;
  }
  if (prompt.includes('漢字「') && prompt.includes('の意味は何ですか')) {
    const kMatch = prompt.match(/漢字「([^」]+)」の意味は何ですか/);
    return `「${kMatch ? kMatch[1] : ''}」ကန်ဂျီ၏ အဓိပ္ပာယ်မှာ အဘယ်နည်း။`;
  }
  if (prompt.includes('漢字「') && prompt.includes('の読み方はどれですか')) {
    const kMatch = prompt.match(/漢字「([^」]+)」の読み方はどれですか/);
    return `「${kMatch ? kMatch[1] : ''}」ကန်ဂျီ၏ မှန်ကန်သော အသံထွက်မှာ အဘယ်နည်း။`;
  }
  if (prompt.includes('下線の漢字の正しい読み方')) {
    return `မျဉ်းသားထားသော ကန်ဂျီ၏ မှန်ကန်သော အသံထွက်ကို ရွေးချယ်ပါ -`;
  }
  if (prompt.includes('下線の言葉の意味')) {
    return `မျဉ်းသားထားသော စကားလုံး၏ အဓိပ္ပာယ်ကို ရွေးချယ်ပါ -`;
  }

  // Default fallback based on skill
  if (skill === 'vocab') return `မှန်ကန်သော ဝေါဟာရအဖြေကို ရွေးချယ်ပါ -`;
  if (skill === 'kanji') return `မှန်ကန်သော ကန်ဂျီအဖြေကို ရွေးချယ်ပါ -`;
  if (skill === 'grammar') return `မှန်ကန်သော သဒ္ဒါအဖြေကို ရွေးချယ်ပါ -`;
  if (skill === 'reading') return `စာပိုဒ်နှင့် ကိုက်ညီသော အဖြေမှန်ကို ရွေးချယ်ပါ -`;
  if (skill === 'listening') return `နားထောင်မှုနှင့် ကိုက်ညီသော အဖြေမှန်ကို ရွေးချယ်ပါ -`;

  return `မှန်ကန်သော အဖြေကို ရွေးချယ်ပါ -`;
}

function localizeExplanation(explanation: string, q: any, pack: any): string {
  if (!explanation) return 'အဖြေမှန်ကို ရွေးချယ်အတည်ပြုပါသည်';

  // If already contains Burmese unicode, return as is
  if (/[\u1000-\u109F]/.test(explanation)) {
    return explanation;
  }

  // Vocabulary explanation: "X (Y) means "Z"."
  const vocabMeanMatch = explanation.match(/^([^(\s]+)\s*\(([^)]+)\)\s+means\s+["“]([^"”]+)["”]\.?/i);
  if (vocabMeanMatch) {
    const [_, word, reading, enMean] = vocabMeanMatch;
    const burmese = globalVocabDict.get(enMean.toLowerCase().trim()) || enMean;
    return `${word} (${reading}) ၏ အဓိပ္ပာယ်မှာ "${burmese}" ဖြစ်ပါသည်။`;
  }

  const simpleMeanMatch = explanation.match(/^「([^」]+)」\s+means\s+["“]([^"”]+)["”]\.?/i);
  if (simpleMeanMatch) {
    const [_, word, enMean] = simpleMeanMatch;
    const burmese = globalVocabDict.get(enMean.toLowerCase().trim()) || enMean;
    return `「${word}」၏ အဓိပ္ပာယ်မှာ "${burmese}" ဖြစ်ပါသည်။`;
  }

  // Grammar explanation
  if (q.skill === 'grammar') {
    const gObj = pack.grammars?.find((g: any) => q.linkedItemIds?.includes(g.id));
    if (gObj && gObj.explanation?.my) {
      return gObj.explanation.my;
    }
    return `ဤဝါကျတွင် သဒ္ဒါပုံစံ「${q.answer}」ကို မှန်ကန်စွာ အသုံးပြုရပါမည်။`;
  }

  // Kanji explanation
  if (q.skill === 'kanji') {
    const kObj = pack.kanjis?.find((k: any) => q.linkedItemIds?.includes(k.id));
    if (kObj) {
      const kMy = KANJI_BURMESE_MAP[kObj.char] || kObj.meaning;
      return `ကန်ဂျီ「${kObj.char}」၏ အဓိပ္ပာယ်မှာ "${kMy}" ဖြစ်ပါသည်။ (အဖြေမှန်: ${q.answer})`;
    }
  }

  // General fallback
  return `အဖြေမှန်မှာ 「${q.answer}」 ဖြစ်ပါသည်။ (${explanation})`;
}

// 2. Perform the sweep across all lesson packs
let processedPacks = 0;
let updatedVocab = 0;
let updatedKanji = 0;
let updatedGrammar = 0;
let updatedSentences = 0;
let updatedQuestions = 0;

for (const level of levels) {
  const dir = path.join(packsDir, level);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const pack = JSON.parse(raw);

    // 1. Title & Description in Burmese
    if (!pack.titleMy) {
      pack.titleMy = `${pack.title} (မြန်မာဘာသာပြန်)`;
      pack.titleMyanmar = pack.titleMy;
    }
    if (!pack.descriptionMy) {
      pack.descriptionMy = `${pack.title} အတွက် အခြေခံနှင့် အဆင့်မြင့် ဂျပန်စာလေ့လာမှု သင်ခန်းစာ။`;
      pack.descriptionMyanmar = pack.descriptionMy;
    }

    // 2. Vocabulary
    for (const v of pack.vocabularies || []) {
      if (!v.meaningMyanmar && v.my) {
        v.meaningMyanmar = v.my;
        v.meaningMy = v.my;
        v.myanmar = v.my;
        updatedVocab++;
      }
    }

    // 3. Kanji
    for (const k of pack.kanjis || []) {
      const myMeaning = KANJI_BURMESE_MAP[k.char] || k.meaningMy || k.meaning;
      k.meaningMyanmar = myMeaning;
      k.meaningMy = myMeaning;
      k.myanmar = myMeaning;
      updatedKanji++;

      for (const ev of k.exampleVocab || []) {
        const evMy = globalVocabDict.get(ev.word) || globalVocabDict.get(ev.meaning.toLowerCase().trim()) || ev.meaning;
        ev.meaningMyanmar = evMy;
        ev.meaningMy = evMy;
      }
    }

    // 4. Grammar
    for (const g of pack.grammars || []) {
      const gMy = g.explanation?.my || 'ဤသဒ္ဒါပုံစံကို သတိပြုလေ့လာပါ။';
      g.explanationMy = gMy;
      g.meaningMyanmar = gMy;
      g.meaningMy = gMy;
      if (!g.nuanceExplanationMy) {
        g.nuanceExplanationMy = `${g.pattern} ၏ သဒ္ဒါအသုံးအနှုန်းနှင့် သတိပြုရမည့် အချက်များ။`;
      }
      updatedGrammar++;
    }

    // 5. Sentences
    for (const s of pack.sentences || []) {
      const sMy = s.translation?.my || s.translation?.en;
      s.translationMy = sMy;
      s.meaningMy = sMy;
      updatedSentences++;
    }

    // 6. Reading
    if (pack.reading) {
      if (!pack.reading.titleMy) {
        pack.reading.titleMy = `${pack.reading.title} (ဖတ်ရှုခြင်း)`;
        pack.reading.titleMyanmar = pack.reading.titleMy;
      }
      if (!pack.reading.translationMy) {
        pack.reading.translationMy = pack.reading.translation;
      }
      for (const item of pack.reading.glossary || []) {
        const termMy = globalVocabDict.get(item.term) || globalVocabDict.get(item.meaning.toLowerCase().trim()) || item.meaning;
        item.meaningMyanmar = termMy;
        item.meaningMy = termMy;
      }
    }

    // 7. Listening
    if (pack.listening) {
      if (!pack.listening.titleMy) {
        pack.listening.titleMy = `${pack.listening.title} (နားထောင်ခြင်း)`;
        pack.listening.titleMyanmar = pack.listening.titleMy;
      }
      if (!pack.listening.translationMy) {
        pack.listening.translationMy = pack.listening.translation;
      }
      for (const turn of pack.listening.turns || []) {
        if (!turn.my && turn.en) {
          const turnMy = globalVocabDict.get(turn.en.toLowerCase().trim()) || turn.en;
          turn.my = turnMy;
          turn.translationMy = turnMy;
          turn.myanmar = turnMy;
        } else if (turn.my) {
          turn.translationMy = turn.my;
          turn.myanmar = turn.my;
        }
      }
    }

    // 8. Questions
    for (const q of pack.questions || []) {
      // Localize Prompt
      if (!q.promptMy) {
        q.promptMy = localizePrompt(q.prompt, q.skill, q.answer);
        q.questionMy = q.promptMy;
      }

      // Localize Explanation
      if (!q.explanationMy) {
        q.explanationMy = localizeExplanation(q.explanation, q, pack);
      }

      // Localize Choices if choices are English words
      if (q.choices && q.choices.length > 0 && !q.choicesMy) {
        const hasEnglishChoices = q.choices.some((c: string) => /[a-zA-Z]/.test(c));
        if (hasEnglishChoices) {
          q.choicesMy = q.choices.map((c: string) => translateChoiceToBurmese(c));
        } else {
          q.choicesMy = [...q.choices];
        }
      }

      // Localize Hint
      if (q.hint && !q.hintMy) {
        q.hintMy = `အရိပ်အမြွက်: ${q.hint}`;
      }

      updatedQuestions++;
    }

    // Write back updated pack
    fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
    processedPacks++;
  }
}

console.log(`\n======================================================`);
console.log(`Curriculum Burmese Localization Sweep Complete!`);
console.log(`Packs Processed: ${processedPacks}`);
console.log(`Vocab Enriched: ${updatedVocab}`);
console.log(`Kanji Enriched: ${updatedKanji}`);
console.log(`Grammar Enriched: ${updatedGrammar}`);
console.log(`Sentences Enriched: ${updatedSentences}`);
console.log(`Questions Enriched: ${updatedQuestions}`);
console.log(`======================================================\n`);
