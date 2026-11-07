# Database Schema & Entity Specification: Nihongo N2 Master
**Database**: Dexie.js (HTML5 IndexedDB)  
**Database Name**: `NihongoN2MasterDB`  
**Current Version**: `v5` (Upgrading to `v6` for Bunpro Cloze, Ghosts, and Cram Lab)  

---

## 1. Schema Version Migration Matrix

```typescript
// Dexie DB Version Evolution
db.version(6).stores({
  profile: 'id',
  srs_cards: 'id, itemId, lessonId, itemType, facet, state, due, intervalDays, isLeech, lapses',
  review_logs: '++id, cardId, reviewedAt, rating, priorIntervalDays, newIntervalDays',
  mastery_records: 'lessonId, state',
  study_sessions: '++id, startedAt, endedAt',
  study_events: '++id, eventType, timestamp',
  lesson_packs: 'id, level',
  kana_records: 'character, script, masteryState',
  assessments: 'id, type, level, takenAt',
  remediations: 'itemId, itemType',
  ai_notes: '++id, targetId, createdAt',
  
  // NEW BUNPRO-ENHANCED TABLES (v6):
  ghost_cards: 'id, parentCardId, grammarId, stage, due, conquered',
  cram_drills: '++id, category, startedAt, completedAt, score',
  contrastive_pairs: 'id, primaryGrammarId, confusingGrammarId, level'
});
```

---

## 2. Table & Entity Definitions

### 1. Enhanced `srs_cards` Table (Existing + Cloze Extensions)
Stores all spaced repetition items (Kanji, Vocab, Grammar, Sentences).

```typescript
export interface SRSCard {
  id: string; // Composite key: `${itemId}:${facet}` (e.g. "n2.l06.g001:cloze")
  itemId: string;
  lessonId: string;
  itemType: 'vocab' | 'kanji' | 'grammar' | 'sentence' | 'kana';
  facet: 'meaning' | 'reading' | 'cloze' | 'production' | 'recog';
  
  // Flashcard & Cloze Prompts
  prompt: string;               // Main expression or Japanese sentence with blank
  reading?: string;             // Furigana / Kana reading
  meaning: string;              // English core meaning
  meaningMyanmar?: string;       // Burmese definition
  
  // Bunpro Cloze Extensions:
  clozeSentence?: string;        // Full sentence: "彼が約束を守る____、最初から期待していない。"
  clozeTarget?: string;          // Correct string: "ものなら"
  clozeHint?: string;            // Progressive hint: "unlikely hypothesis (plain form)"
  acceptableSynonyms?: string[]; // ["としたら", "とすれば"] -> triggers nuance toast
  
  // FSRS Scheduling Metrics
  state: 'new' | 'learning' | 'review' | 'relearning';
  intervalDays: number;
  repetition: number;
  stability: number;
  difficulty: number;
  lapses: number;
  isLeech: boolean;
  due: string;                  // ISO 8601 UTC string
  lastReviewed?: string;
}
```

---

### 2. New `ghost_cards` Table (Leech Quarantine System)
Spawns automatically when a card accumulates &ge; 3 lapses, running an isolated micro-SRS schedule using an alternate sentence.

```typescript
export interface GhostCard {
  id: string;                    // `ghost_${parentCardId}_${Date.now()}`
  parentCardId: string;          // Links back to original SRSCard.id
  grammarId: string;             // e.g. "n2.l06.g001"
  
  // Context sentence rotation
  sentenceIndex: number;         // Index of the sentence used (2, 3, or 4 from pack)
  clozeSentence: string;         // Alternate Japanese sentence
  clozeTarget: string;           // Target grammar pattern
  nuanceExplanationEn: string;
  nuanceExplanationMy?: string;
  
  // Accelerated Micro-Interval Schedule
  // Stage 1 (4h) -> Stage 2 (8h) -> Stage 3 (24h) -> Stage 4 (48h) -> Conquered
  stage: 1 | 2 | 3 | 4;
  due: string;                   // ISO 8601 UTC
  conquered: boolean;            // true when stage 4 is passed
  conqueredAt?: string;
}
```

---

### 3. New `contrastive_pairs` Table (Nuance & Pitfalls Engine)
Powers the inline Nuance Warnings during reviews and the "Common Confusions" tab in lessons.

```typescript
export interface ContrastivePair {
  id: string;                    // e.g. "pair_n2_mono_nara_vs_to_shitara"
  level: 'N5' | 'N4' | 'N3' | 'N2';
  title: string;                 // "〜ものなら vs 〜としたら"
  
  primaryGrammarId: string;      // "n2.l06.g002" (〜ものなら)
  confusingGrammarId: string;    // "n2.l06.g001" (〜としたら)
  
  distinctionRuleEn: string;     // "〜ものなら implies an impossible or highly unlikely desire; 〜としたら is a neutral conditional assumption."
  distinctionRuleMy?: string;    // Burmese nuance explanation
  
  warningTriggerWords: string[]; // ["としたら", "とすれば", "なら"]
  warningMessage: string;        // "Looking for an impossible or wishful condition."
}
```

---

### 4. New `cram_drills` Table (Targeted Drill Lab Telemetry)
Tracks on-demand unranked grammar practice sessions without contaminating FSRS intervals.

```typescript
export interface CramDrill {
  id?: number;                   // Auto-increment primary key
  category: string;              // "Conditions & Hypotheses", "Emotions", "Ghosts Only"
  level: 'N5' | 'N4' | 'N3' | 'N2';
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;              // 0.0 - 1.0
  testedGrammarIds: string[];
  failedGrammarIds: string[];
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}
```
