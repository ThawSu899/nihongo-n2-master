import * as fs from 'fs';
import * as path from 'path';

interface CurriculumEntry {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  module: string;
  number: number;
  title: string;
  grammarTopics: string[];
  targetKanjiCount: number;
  targetVocabCount: number;
  status: 'planned' | 'drafted' | 'reviewed' | 'published';
}

const entries: CurriculumEntry[] = [];

// N5: 30 lessons
const n5Titles = [
  'Greetings & Self Introduction',
  'This, That, and Over There (これ・それ・あれ)',
  'Places and Locations (ここ・そこ・あそこ)',
  'Time, Dates, and Schedules (何時・何日)',
  'Daily Routine & Motion Verbs (行きます・来ます)',
  'Actions with Objects (を・で)',
  'Giving and Receiving Tools (あげます・もらいます)',
  'Adjectives: Describing Things (い形容詞・な形容詞)',
  'Preferences and Abilities (好き・上手)',
  'Existence and Location (います・あります)',
  'Counting and Quantities (つ・人・本)',
  'Past Tense of Adjectives and Verbs',
  'Comparisons (より・のほうが)',
  'Desires and Wants (ほしい・〜たい)',
  'The Te-form: Requests and Continuous (てください・ています)',
  'Permission and Prohibition (てもいい・てはいけません)',
  'Connecting Actions (て、てから)',
  'The Nai-form: Obligations (ないでください・なければなりません)',
  'Ability and Possibility (ことができます)',
  'Experience (たことがあります)',
  'Listing Actions (たり〜たりします)',
  'Informal Plain Form (話す・話さない)',
  'Opinions and Thoughts (と思います)',
  'Quotations and Hearsay (と言いました)',
  'Noun Modification by Clauses (修飾節)',
  'Giving Directions and When (とき・道案内)',
  'Conditions: If and When (と・たら)',
  'Permission and Advice (たほうがいい)',
  'Reasons and Explanations (から・ので)',
  'N5 Review & Comprehensive Can-do Check',
];

for (let i = 1; i <= 30; i++) {
  const numStr = i.toString().padStart(2, '0');
  entries.push({
    id: `n5.l${numStr}`,
    level: 'N5',
    module: i <= 10 ? 'N5 Foundation 1' : i <= 20 ? 'N5 Core Conjugations' : 'N5 Communication & Integration',
    number: i,
    title: n5Titles[i - 1] || `N5 Lesson ${i}`,
    grammarTopics: i === 1 ? ['X は Y です', 'X は Y ですか', 'X の Y'] : [`N5 Grammar Point ${i}.1`, `N5 Grammar Point ${i}.2`],
    targetKanjiCount: i === 1 ? 3 : 4,
    targetVocabCount: i === 1 ? 12 : 25,
    status: i === 1 ? 'published' : 'planned',
  });
}

// N4: 36 lessons
for (let i = 1; i <= 36; i++) {
  const numStr = i.toString().padStart(2, '0');
  entries.push({
    id: `n4.l${numStr}`,
    level: 'N4',
    module: i <= 12 ? 'N4 Intermediate Grammar 1' : i <= 24 ? 'N4 Expressions & Relations' : 'N4 Complex Structures',
    number: i,
    title: `N4 Lesson ${i}: ${getN4Topic(i)}`,
    grammarTopics: [`N4 Grammar Point ${i}.1`, `N4 Grammar Point ${i}.2`],
    targetKanjiCount: 6,
    targetVocabCount: 30,
    status: 'planned',
  });
}

// N3: 48 lessons
for (let i = 1; i <= 48; i++) {
  const numStr = i.toString().padStart(2, '0');
  entries.push({
    id: `n3.l${numStr}`,
    level: 'N3',
    module: i <= 16 ? 'N3 Bridging Intermediate' : i <= 32 ? 'N3 Nuance & Natural Discourse' : 'N3 Formal & Expository',
    number: i,
    title: `N3 Lesson ${i}: ${getN3Topic(i)}`,
    grammarTopics: [`N3 Grammar Point ${i}.1`, `N3 Grammar Point ${i}.2`],
    targetKanjiCount: 8,
    targetVocabCount: 45,
    status: 'planned',
  });
}

// N2: 60 lessons
for (let i = 1; i <= 60; i++) {
  const numStr = i.toString().padStart(2, '0');
  entries.push({
    id: `n2.l${numStr}`,
    level: 'N2',
    module: i <= 20 ? 'N2 Advanced Grammar & Argumentation' : i <= 40 ? 'N2 Editorial & Socio-Cultural' : 'N2 Mastery & Professional Japanese',
    number: i,
    title: `N2 Lesson ${i}: ${getN2Topic(i)}`,
    grammarTopics: [`N2 Grammar Point ${i}.1`, `N2 Grammar Point ${i}.2`],
    targetKanjiCount: 10,
    targetVocabCount: 60,
    status: 'planned',
  });
}

function getN4Topic(n: number): string {
  const topics = [
    'Potential Form (読める・話せる)', 'Volitional Form (行こう・食べよう)', 'Imperative & Prohibitive (読め・読むな)',
    'Conditional ば-form', 'Conditional なら', 'Transitive vs Intransitive Verbs', 'State Continuance (〜てある・〜ている)',
    'Preparation & Completion (〜ておく・〜てしまう)', 'Hearsay そうだ vs Appearance そうだ', 'Giving & Receiving (あげる・くれる・もらう)',
    'Honorifics: Passive Form (受け身)', 'Causative Form (使役)', 'Causative-Passive Form', 'Respectful Keigo (尊敬語)',
    'Humble Keigo (謙譲語)', 'Conjecture (〜かもしれない・〜はずだ)', 'Decisions & Plans (〜ことにする・〜ことになる)',
    'Excess & Ease (〜すぎる・〜やすい・〜にくい)', 'Change of State (〜ようになる・〜なくなる)', 'N4 Reading Comprehension Strategies'
  ];
  return topics[(n - 1) % topics.length];
}

function getN3Topic(n: number): string {
  const topics = [
    'Regarding & Concerning (〜について・〜に関して)', 'In Terms of & From Viewpoint (〜にとって・〜に対して)',
    'Purpose & Intent (〜ために・〜ように)', 'Cause & Result (〜せいで・〜おかげで)', 'Degree & Extent (〜ほど・〜くらい)',
    'Limit & Exclusivity (〜に限る・〜ばかり)', 'Contrast & Concession (〜にもかかわらず・〜わりに)',
    'Simultaneity (〜つつ・〜最中に)', 'Tendency (〜がち・〜気味)', 'Natural Consequence (〜わけだ・〜わけがない)',
    'Obligation & Inevitability (〜ざるを得ない)', 'Time Sequence (〜次第・〜とたん)', 'N3 Formal Announcements & Long Passages'
  ];
  return topics[(n - 1) % topics.length];
}

function getN2Topic(n: number): string {
  const topics = [
    'Emphatic Contrast (〜どころか・〜に対して)', 'Extreme Concession (〜たとえ〜ても・〜にあたって)',
    'Professional Directives (〜べからず・〜を皮切りに)', 'Perspective & Subjective Judgment (〜から見ると・〜を踏まえて)',
    'Causation & Consequence (〜あまり・〜結果)', 'Inevitability & Logical Reasoning (〜に相違ない・〜にほかならない)',
    'Formal Written Disconnects (〜ぬきで・〜を契機に)', 'Editorial & Column Nuances (〜に伴って・〜に沿って)',
    'Abstract Societal Analysis', 'Author Stance & Implied Intentions', 'Lecture-Style Multi-Speaker Discourse'
  ];
  return topics[(n - 1) % topics.length];
}

fs.mkdirSync(path.resolve('./content'), { recursive: true });
fs.writeFileSync(path.resolve('./content/curriculum-map.json'), JSON.stringify(entries, null, 2));
console.log(`Generated curriculum-map.json with ${entries.length} lessons.`);
