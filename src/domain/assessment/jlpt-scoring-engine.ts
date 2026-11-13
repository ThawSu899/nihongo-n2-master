import { QuestionSkill } from '../models/types';

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type JLPTDomain = 'moji_goi' | 'bunpou_dokkai' | 'choukai';

export interface JLPTSectionThreshold {
  id: string;
  nameJa: string;
  nameMm: string;
  nameEn: string;
  maxScore: number;
  cutoffScore: number; // 基準点 (Minimum pass mark)
  scaledScore: number;
  passed: boolean;
  deficit: number;
  skills: QuestionSkill[];
}

export interface JLPTDomainDiagnosis {
  domain: JLPTDomain;
  titleJa: string;
  titleMm: string;
  titleEn: string;
  accuracyPct: number;
  targetPct: number;
  deficitPct: number;
  burmeseAdvice: string;
  actionTitle: string;
  drillSkill: QuestionSkill | 'mixed_leeches';
}

export interface JLPTExamSimulationReport {
  level: JLPTLevel;
  totalScaledScore: number; // 0 - 180
  totalMaxScore: 180;
  totalPassScore: number;   // N5: 80, N4: 90, N3: 95, N2: 90, N1: 100
  passedOverall: boolean;
  passedSectional: boolean;
  isSectionalDisqualified: boolean; // Total >= Pass Mark, but 1 or more sections < Cutoff
  passed: boolean;
  status: 'passed' | 'sectional_disqualified' | 'failed';
  statusLabelMm: string;
  statusLabelJa: string;
  sections: JLPTSectionThreshold[];
  weakestDomain: JLPTDomainDiagnosis;
  allDomains: JLPTDomainDiagnosis[];
}

export const OFFICIAL_JLPT_THRESHOLDS: Record<
  JLPTLevel,
  {
    totalPassScore: number;
    sections: Array<{
      id: string;
      nameJa: string;
      nameMm: string;
      nameEn: string;
      maxScore: number;
      cutoffScore: number;
      skills: QuestionSkill[];
    }>;
  }
> = {
  N5: {
    totalPassScore: 80,
    sections: [
      {
        id: 'lang_reading',
        nameJa: '言語知識（文字・語彙・文法）・読解',
        nameMm: 'ဘာသာစကားဗဟုသုတ (ဝေါဟာရ/သဒ္ဒါ) နှင့် စာဖတ်စွမ်းရည်',
        nameEn: 'Language Knowledge & Reading',
        maxScore: 120,
        cutoffScore: 38,
        skills: ['vocab', 'kanji', 'grammar', 'reading'],
      },
      {
        id: 'listening',
        nameJa: '聴解',
        nameMm: 'နားထောင်မှုစွမ်းရည်',
        nameEn: 'Listening',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['listening'],
      },
    ],
  },
  N4: {
    totalPassScore: 90,
    sections: [
      {
        id: 'lang_reading',
        nameJa: '言語知識（文字・語彙・文法）・読解',
        nameMm: 'ဘာသာစကားဗဟုသုတ (ဝေါဟာရ/သဒ္ဒါ) နှင့် စာဖတ်စွမ်းရည်',
        nameEn: 'Language Knowledge & Reading',
        maxScore: 120,
        cutoffScore: 38,
        skills: ['vocab', 'kanji', 'grammar', 'reading'],
      },
      {
        id: 'listening',
        nameJa: '聴解',
        nameMm: 'နားထောင်မှုစွမ်းရည်',
        nameEn: 'Listening',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['listening'],
      },
    ],
  },
  N3: {
    totalPassScore: 95,
    sections: [
      {
        id: 'language',
        nameJa: '言語知識（文字・語彙・文法）',
        nameMm: 'ဘာသာစကားဗဟုသုတ (ဝေါဟာရ/သဒ္ဒါ)',
        nameEn: 'Language Knowledge',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['vocab', 'kanji', 'grammar'],
      },
      {
        id: 'reading',
        nameJa: '読解',
        nameMm: 'စာဖတ်စွမ်းရည်',
        nameEn: 'Reading',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['reading'],
      },
      {
        id: 'listening',
        nameJa: '聴解',
        nameMm: 'နားထောင်မှုစွမ်းရည်',
        nameEn: 'Listening',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['listening'],
      },
    ],
  },
  N2: {
    totalPassScore: 90,
    sections: [
      {
        id: 'language',
        nameJa: '言語知識（文字・語彙・文法）',
        nameMm: 'ဘာသာစကားဗဟုသုတ (ဝေါဟာရ/သဒ္ဒါ)',
        nameEn: 'Language Knowledge',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['vocab', 'kanji', 'grammar'],
      },
      {
        id: 'reading',
        nameJa: '読解',
        nameMm: 'စာဖတ်စွမ်းရည်',
        nameEn: 'Reading',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['reading'],
      },
      {
        id: 'listening',
        nameJa: '聴解',
        nameMm: 'နားထောင်မှုစွမ်းရည်',
        nameEn: 'Listening',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['listening'],
      },
    ],
  },
  N1: {
    totalPassScore: 100,
    sections: [
      {
        id: 'language',
        nameJa: '言語知識（文字・語彙・文法）',
        nameMm: 'ဘာသာစကားဗဟုသုတ (ဝေါဟာရ/သဒ္ဒါ)',
        nameEn: 'Language Knowledge',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['vocab', 'kanji', 'grammar'],
      },
      {
        id: 'reading',
        nameJa: '読解',
        nameMm: 'စာဖတ်စွမ်းရည်',
        nameEn: 'Reading',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['reading'],
      },
      {
        id: 'listening',
        nameJa: '聴解',
        nameMm: 'နားထောင်မှုစွမ်းရည်',
        nameEn: 'Listening',
        maxScore: 60,
        cutoffScore: 19,
        skills: ['listening'],
      },
    ],
  },
};

export class JLPTScoringEngine {
  /**
   * Retrieves official cutoff metadata for a given level.
   */
  static getThresholds(level: JLPTLevel) {
    return OFFICIAL_JLPT_THRESHOLDS[level] || OFFICIAL_JLPT_THRESHOLDS.N2;
  }

  /**
   * Compute official 180-point scaled score simulation and sectional cutoffs
   * from skill accuracy percentages (0 - 100).
   */
  static simulateOfficialReport(
    level: JLPTLevel,
    skillAccuracies: Partial<Record<QuestionSkill, number>>
  ): JLPTExamSimulationReport {
    const config = this.getThresholds(level);

    // Default missing skills to 0 or neutral
    const accuracies: Record<QuestionSkill, number> = {
      vocab: skillAccuracies.vocab ?? 0,
      kanji: skillAccuracies.kanji ?? 0,
      grammar: skillAccuracies.grammar ?? 0,
      reading: skillAccuracies.reading ?? 0,
      listening: skillAccuracies.listening ?? 0,
    };

    // Calculate section scaled scores
    const calculatedSections: JLPTSectionThreshold[] = config.sections.map((sec) => {
      const relevantAccuracies = sec.skills.map((sk) => accuracies[sk] ?? 0);
      const avgAccuracy =
        relevantAccuracies.length > 0
          ? relevantAccuracies.reduce((a, b) => a + b, 0) / relevantAccuracies.length
          : 0;

      // Scaled score is proportion of maxScore (0-60 or 0-120)
      const scaledScore = Math.round((Math.max(0, Math.min(100, avgAccuracy)) / 100) * sec.maxScore);
      const passed = scaledScore >= sec.cutoffScore;
      const deficit = passed ? 0 : sec.cutoffScore - scaledScore;

      return {
        id: sec.id,
        nameJa: sec.nameJa,
        nameMm: sec.nameMm,
        nameEn: sec.nameEn,
        maxScore: sec.maxScore,
        cutoffScore: sec.cutoffScore,
        scaledScore,
        passed,
        deficit,
        skills: sec.skills,
      };
    });

    const totalScaledScore = calculatedSections.reduce((sum, s) => sum + s.scaledScore, 0);
    const passedOverall = totalScaledScore >= config.totalPassScore;
    const passedSectional = calculatedSections.every((s) => s.passed);
    const isSectionalDisqualified = passedOverall && !passedSectional;
    const passed = passedOverall && passedSectional;

    let status: 'passed' | 'sectional_disqualified' | 'failed' = 'failed';
    let statusLabelMm = 'မအောင်မြင်သေးပါ (အမှတ်မပြည့်မီ)';
    let statusLabelJa = '【不合格】';

    if (passed) {
      status = 'passed';
      statusLabelMm = 'အောင်မြင်သည် (合格)';
      statusLabelJa = '【合格】';
    } else if (isSectionalDisqualified) {
      status = 'sectional_disqualified';
      statusLabelMm = 'ကဏ္ဍအလိုက် အမှတ်မပြည့်မီ၍ ကျရှုံးသည် (基準点未達・足切り)';
      statusLabelJa = '【基準点未達（足切り）】';
    }

    // Domain diagnostics across the 3 key domains
    const domains: JLPTDomainDiagnosis[] = [
      {
        domain: 'moji_goi',
        titleJa: '文字・語彙',
        titleMm: 'စာလုံးနှင့် ဝေါဟာရ',
        titleEn: 'Kanji & Vocabulary',
        accuracyPct: Math.round(((accuracies.vocab + accuracies.kanji) / 2) * 10) / 10,
        targetPct: 60,
        deficitPct: Math.max(0, Math.round((60 - (accuracies.vocab + accuracies.kanji) / 2) * 10) / 10),
        burmeseAdvice:
          'ဝေါဟာရနှင့် ခန်းဂျီး အားနည်းနေပါသည်။ Leech Drill Mode နှင့် Active Recall Masking (ဖူရီဂါနာဖျောက်လေ့ကျင့်ခြင်း) ကို နေ့စဉ် အသုံးပြု၍ အမှားများသော စကားလုံးများကို ပြန်လည်ကျက်မှတ်ပါ။',
        actionTitle: 'Launch Vocab Leech Drill / ဝေါဟာရ အားနည်းချက်လေ့ကျင့်ရန်',
        drillSkill: 'vocab',
      },
      {
        domain: 'bunpou_dokkai',
        titleJa: '文法・読解',
        titleMm: 'သဒ္ဒါနှင့် စာဖတ်စွမ်းရည်',
        titleEn: 'Grammar & Reading',
        accuracyPct: Math.round(((accuracies.grammar + accuracies.reading) / 2) * 10) / 10,
        targetPct: 60,
        deficitPct: Math.max(0, Math.round((60 - (accuracies.grammar + accuracies.reading) / 2) * 10) / 10),
        burmeseAdvice:
          'သဒ္ဒါနှင့် စာဖတ်စွမ်းရည် အားနည်းနေပါသည်။ JLPT Star-Puzzle (★ ဝါကျစီ ပုစ္ဆာ) နှင့် Dokkai Reader workbench တွင် အဓိက အကြောင်းအရာ ရှာဖွေခြင်းများကို အထူးပြုလေ့ကျင့်ပါ။',
        actionTitle: 'Practice Star Puzzle & Grammar / သဒ္ဒါဝါကျစီ လေ့ကျင့်ရန်',
        drillSkill: 'grammar',
      },
      {
        domain: 'choukai',
        titleJa: '聴解',
        titleMm: 'နားထောင်မှုစွမ်းရည်',
        titleEn: 'Listening Comprehension',
        accuracyPct: Math.round(accuracies.listening * 10) / 10,
        targetPct: 60,
        deficitPct: Math.max(0, Math.round((60 - accuracies.listening) * 10) / 10),
        burmeseAdvice:
          'နားထောင်မှုစွမ်းရည် အားနည်းနေပါသည်။ Blind Listening Mode (အသံအရင်နားထောင်ပြီးမှ စာကြည့်ခြင်း) နှင့် 3x Shadowing Loop ဖြင့် ဂျပန်စကားပြော အရှိန်နှင့် အသံထွက်ကို အာရုံစိုက် လေ့ကျင့်ပါ။',
        actionTitle: 'Practice Blind Listening / နားထောင်မှု လေ့ကျင့်ရန်',
        drillSkill: 'listening',
      },
    ];

    // Weakest domain is the one with the lowest accuracy
    const sortedDomains = [...domains].sort((a, b) => a.accuracyPct - b.accuracyPct);
    const weakestDomain = sortedDomains[0];

    return {
      level,
      totalScaledScore,
      totalMaxScore: 180,
      totalPassScore: config.totalPassScore,
      passedOverall,
      passedSectional,
      isSectionalDisqualified,
      passed,
      status,
      statusLabelMm,
      statusLabelJa,
      sections: calculatedSections,
      weakestDomain,
      allDomains: domains,
    };
  }
}
