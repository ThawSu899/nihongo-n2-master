/**
 * Nuance Interceptor Engine
 * Inspects grammar cloze inputs to detect valid Japanese synonyms, register mismatches,
 * or near-misses (e.g. typing 〜としたら when 〜ものなら was expected) and provides
 * instructive contrastive feedback without unfairly penalizing the learner's SRS score.
 */

export interface NuanceRule {
  targetPattern: string;
  acceptableSynonyms: string[];
  warningMessageEn: string;
  warningMessageMy?: string;
  conjugationNote?: string;
}

export interface NuanceCheckResult {
  status: 'exact_match' | 'synonym_warning' | 'incorrect';
  target: string;
  entered: string;
  warningMessageEn?: string;
  warningMessageMy?: string;
  conjugationNote?: string;
}

export const CURATED_NUANCE_RULES: Record<string, NuanceRule> = {
  // N2 Conditions & Hypotheses
  'ものなら': {
    targetPattern: 'ものなら',
    acceptableSynonyms: ['としたら', 'とすれば', 'なら', 'たら', 'ても', 'ば'],
    warningMessageEn: 'Looking for an unlikely or impossible wish/desire (V[辞書形] + ものなら), not a neutral conditional.',
    warningMessageMy: 'မဖြစ်နိုင်သော / ဖြစ်ရန်ခဲယဉ်းသော ဆန္ဒကို ဖော်ပြသည့် ပုံစံ (ものなら) ကို လိုချင်ပါသည်။',
    conjugationNote: 'Verb (Dictionary form) + ものなら',
  },
  'としたら': {
    targetPattern: 'としたら',
    acceptableSynonyms: ['ものなら', 'とすれば', 'と仮定して', 'なら'],
    warningMessageEn: 'Looking for a neutral hypothetical assumption ("supposing that...") (〜としたら).',
    warningMessageMy: 'အကယ်၍သာ ထိုသို့ဖြစ်ခဲ့လျှင် ဟူသော ယူဆချက်ပုံစံ (としたら) ကို လိုချင်ပါသည်။',
    conjugationNote: 'Plain form + としたら',
  },
  'ないことには': {
    targetPattern: 'ないことには',
    acceptableSynonyms: ['なければ', 'ないと', 'なくては', 'ない限り'],
    warningMessageEn: 'Looking for "Unless X happens, Y cannot be realized" (〜ないことには...ない).',
    warningMessageMy: 'မလုပ်ဘဲနှင့် နောက်ကိစ္စ မဖြစ်မြောက်နိုင် ဟူသော အဓိပ္ပာယ် (ないことには) ကို လိုချင်ပါသည်။',
    conjugationNote: 'Verb[ない形] + ことには',
  },

  // N2 Emotions & Empathy
  'てたまらない': {
    targetPattern: 'てたまらない',
    acceptableSynonyms: ['てならない', 'てしょうがない', 'て仕方がない'],
    warningMessageEn: 'Looking for overwhelming physical sensation or personal emotion (〜てたまらない).',
    warningMessageMy: 'ခံစားချက် သို့မဟုတ် ရုပ်ပိုင်းဆိုင်ရာ ခံစားမှု လွန်ကဲပြီး မခံမရပ်နိုင်ဖြစ်ခြင်း (てたまらない)။',
    conjugationNote: 'Te-form of verbs / adjectives + たまらない',
  },
  'てならない': {
    targetPattern: 'てならない',
    acceptableSynonyms: ['てたまらない', 'てしょうがない'],
    warningMessageEn: 'Looking for spontaneous, irresistible psychological intuition/feeling (〜てならない).',
    warningMessageMy: 'သဘာဝအလျောက် စိတ်ထဲမှ တားမရအောင် ခံစားနေရခြင်း (てならない)။',
    conjugationNote: 'Te-form + ならない (often with 思える, 気にする, 心配だ)',
  },
  'ないではいられない': {
    targetPattern: 'ないではいられない',
    acceptableSynonyms: ['ずにはいられない', 'ずにはおかない'],
    warningMessageEn: 'Looking for an irresistible internal impulse ("cannot help but...") (〜ないではいられない).',
    warningMessageMy: 'မလုပ်ဘဲ မနေနိုင်အောင် စိတ်ခံစားမှု ထိန်းမရခြင်း (ないではいられない)။',
    conjugationNote: 'Verb[ない形] + ではいられない',
  },

  // N2 Judgments & Assertions
  'に決まっている': {
    targetPattern: 'に決まっている',
    acceptableSynonyms: ['に違いない', 'に相違ない', 'はずだ'],
    warningMessageEn: 'Looking for strong subjective conviction based on intuition ("must surely be...") (〜に決まっている).',
    warningMessageMy: 'လုံးဝ သေချာပေါက် ဖြစ်မည်ဟု ကိုယ်ပိုင်ထင်မြင်ချက်ဖြင့် အခိုင်အမာယူဆခြင်း (に決まっている)။',
    conjugationNote: 'Plain form (Noun/Na-adj drop だ) + に決まっている',
  },
  'にほかならない': {
    targetPattern: 'にほかならない',
    acceptableSynonyms: ['にすぎない', 'わけだ', 'からだ'],
    warningMessageEn: 'Looking for emphatic assertion ("none other than / strictly because of") (〜にほかならない).',
    warningMessageMy: 'အခြားမဟုတ်၊ ဤအရာကြောင့်သာဖြစ်သည်ဟု အလေးအနက် အတည်ပြုပြောဆိုခြင်း (にほかならない)။',
    conjugationNote: 'Noun / Plain form + にほかならない',
  },
  'にすぎない': {
    targetPattern: 'にすぎない',
    acceptableSynonyms: ['だけだ', 'ばかりだ', 'にほかならない'],
    warningMessageEn: 'Looking for modest limitation ("merely / nothing more than") (〜にすぎない).',
    warningMessageMy: 'မျှသာဖြစ်သည် / ထိုထက်ပိုမရှိပါ ဟု အကန့်အသတ်ဖော်ပြခြင်း (にすぎない)။',
    conjugationNote: 'Noun / Plain form + にすぎない',
  },

  // N2 Tendencies & States
  'がち': {
    targetPattern: 'がち',
    acceptableSynonyms: ['気味', 'やすい', 'っぽい'],
    warningMessageEn: 'Looking for a frequent negative habit or tendency (V[ます形] / Noun + がち).',
    warningMessageMy: 'မကြာခဏ ဖြစ်လေ့ရှိသော မကောင်းသည့် သဘောထား (がち)။',
    conjugationNote: 'Verb stem + がち / Noun + がち',
  },
  '気味': {
    targetPattern: '気味',
    acceptableSynonyms: ['がち', 'っぽい', 'ぎみ'],
    warningMessageEn: 'Looking for a slight physical or mental symptom ("a touch of...") (〜気味/ぎみ).',
    warningMessageMy: 'အနည်းငယ် ထိုလက္ခဏာ ပေါ်ပေါက်နေခြင်း (風邪気味, 疲れ気味)။',
    conjugationNote: 'Verb stem / Noun + 気味 (ぎみ)',
  },
  'きり': {
    targetPattern: 'きり',
    acceptableSynonyms: ['だけ', 'ばかり', 'っきり'],
    warningMessageEn: 'Looking for "ever since that single event, the state remains unchanged" (〜きり).',
    warningMessageMy: 'တစ်ခါတည်းနှင့် ပြီးသွားပြီး ထပ်မဖြစ်တော့သည့် အခြေအနေ (きり)။',
    conjugationNote: 'Verb[た形] + きり / Noun + きり',
  },

  // N2 Simultaneous Actions & Changes
  'ついでに': {
    targetPattern: 'ついでに',
    acceptableSynonyms: ['がてら', 'かたがた', 'ながら'],
    warningMessageEn: 'Looking for taking opportunity of primary action to do secondary action (〜ついでに).',
    warningMessageMy: 'တစ်ခုလုပ်ရင်း ကြုံတုန်း နောက်တစ်ခုပါ တစ်ပါတည်း လုပ်ဆောင်ခြင်း (ついでに)။',
    conjugationNote: 'Verb[辞書形/た形] / Nounの + ついでに',
  },
  'つつある': {
    targetPattern: 'つつある',
    acceptableSynonyms: ['ている', 'ていく', 'つつ'],
    warningMessageEn: 'Looking for a gradual ongoing change in progress ("is in the process of...") (〜つつある).',
    warningMessageMy: 'တဖြည်းဖြည်း ပြောင်းလဲနေဆဲ အခြေအနေကို ဖော်ပြခြင်း (つつある)။',
    conjugationNote: 'Verb stem (ます形) + つつある',
  },
  'つつ': {
    targetPattern: 'つつ',
    acceptableSynonyms: ['ながら', 'つつも', 'のに'],
    warningMessageEn: 'Looking for formal simultaneous action or contrast ("while / although...") (〜つつ).',
    warningMessageMy: 'တစ်ပြိုင်နက်တည်း လုပ်ဆောင်ခြင်း သို့မဟုတ် ...သော်လည်း (つつ)။',
    conjugationNote: 'Verb stem (ます形) + つつ',
  },
};

export class NuanceInterceptor {
  /**
   * Normalizes Japanese string for comparison (strips whitespace, tildes, wave dashes)
   */
  static normalize(str: string): string {
    return str
      .trim()
      .replace(/^[〜～~]/, '')
      .replace(/[〜～~]$/, '')
      .replace(/\s+/g, '');
  }

  /**
   * Verifies an entered answer against the target pattern and synonym registry
   */
  static inspect(entered: string, target: string, acceptableSynonyms: string[] = []): NuanceCheckResult {
    const cleanEntered = this.normalize(entered);
    const cleanTarget = this.normalize(target);

    // 1. Direct exact match
    if (cleanEntered === cleanTarget) {
      return {
        status: 'exact_match',
        target,
        entered,
      };
    }

    // 2. Check rule catalog
    const rule = CURATED_NUANCE_RULES[cleanTarget] || CURATED_NUANCE_RULES[target];
    const allSynonyms = new Set<string>([
      ...acceptableSynonyms.map((s) => this.normalize(s)),
      ...(rule ? rule.acceptableSynonyms.map((s) => this.normalize(s)) : []),
    ]);

    // Check if the user entered an accepted synonym or near-miss
    for (const syn of allSynonyms) {
      if (cleanEntered === syn || cleanEntered.includes(syn) || syn.includes(cleanEntered)) {
        return {
          status: 'synonym_warning',
          target,
          entered,
          warningMessageEn: rule?.warningMessageEn || `Looking specifically for the pattern "${target}".`,
          warningMessageMy: rule?.warningMessageMy,
          conjugationNote: rule?.conjugationNote,
        };
      }
    }

    // 3. Otherwise incorrect
    return {
      status: 'incorrect',
      target,
      entered,
    };
  }
}
