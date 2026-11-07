# Recon Map: Bunpro (https://bunpro.jp/)
**Target Product**: Bunpro Web & Mobile Apps  
**Analyst**: Nihongo N2 Master Architecture Team  
**Scope**: Core Japanese Grammar Mastery Loop (Production SRS, Cloze Testing, Ghost Quarantine, Cram Lab)

---

## 1. Scope
- **Which app, which platform**: Bunpro (https://bunpro.jp/), Responsive Web & iOS/Android mobile clients.
- **Which slice**: The Core Grammar Mastery Loop — Dashboard & SRS Forecast, Grammar Catalog & Paths, Detail Breakdown Pages, Cloze Review Engine (Active Production), Ghost Quarantine, and Cram Drills.
- **Who it is for**: Enhancing "Nihongo N2 Master" (Offline-first JLPT N5–N2 mastery platform) with Bunpro's battle-tested grammar retention mechanics and active production workflows.

---

## 2. Sources Table

| Source | URL | What It Gives You |
| --- | --- | --- |
| Public Marketing Site | https://bunpro.jp/ | Value proposition, core cloze-test loop, path system |
| Official FAQ & Knowledgebase | https://bunpro.jp/faq | SRS intervals, ghost review algorithm, keyboard shortcuts, scoring rules |
| Pricing Page | https://bunpro.jp/pricing | Feature gating: what users pay for (unlimited audio, cram mode, ghost reviews) |
| Community Forums & Release Notes | https://community.bunpro.jp/ | Nuance interceptors, synonym handling rules, user friction points |
| App Store & Google Play Listings | https://apps.apple.com/app/bunpro-japanese/id1527850893 | Mobile layouts, offline mode limitations, UX flows |
| Public Walkthroughs & Demos | YouTube / Bunpro Community | Click-by-click flow through cloze SRS reviews, mistake handling, and cram setup |

---

## 3. Screen Inventory

| ID | Screen | Route / How You Get There | Purpose | Key Components | States Seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Dashboard | `/dashboard` (Home) | Daily study hub, review forecast, streak, quick launch | Header, Review Forecast Bar, JLPT Level Progress Rings, Quick Action Bar | Empty (zero reviews), Normal, Busy queue |
| S02 | Path & Curriculum Browser | `/paths` (Nav &rarr; Paths) | Browse grammar by JLPT level or popular textbooks | Level Filter Tabs, Path Cards (Shin Kanzen, Tobira, Quartet), Lesson Accordions | Normal, Filtered, In-progress |
| S03 | Grammar Detail Page | `/grammar_points/:id` | Deep dive into formation rules, nuance, and audio | Hero Header, Structure Formula (接続), Nuance Card, Sentence Lab, Pitfalls/Differences, External Readings | Normal, Furigana Hidden, Audio Loading |
| S04 | Cloze SRS Review Session | `/study` (Dashboard &rarr; Start Reviews) | Active production grammar testing with auto-kana input | Cloze Sentence Prompt, Input Field, Romaji-Kana Engine, Hint Drawer, Audio Player, Oops Button | Prompt, Typing, Synonym Warning (Orange), Correct, Incorrect |
| S05 | Review Summary | `/study/summary` (Auto upon queue end) | Review results, SRS level promotions, ghost notifications | Score Pie Chart, Reviewed Items List, SRS Level Shift Badges, Ghost Spawn Badges | All Correct, Mixed, High Leech/Ghost |
| S06 | Ghost Review Quarantine | `/ghosts` (Dashboard badge) | Clear troubled leeches using accelerated micro-intervals | Ghost Item Cards, Micro-interval Timeline (4h/8h/24h/48h), Alternate Sentence Viewer | Empty (Conquered), Active Ghosts |
| S07 | Cram Mode Studio | `/cram` (Dashboard &rarr; Cram) | Unranked targeted drills outside standard SRS schedule | Level Filter, Category Selector (Hypothetical, Emotions, etc.), Leech Selector, Start Drill Button | Configuration, Empty selection, Active Drill |
| S08 | Search & Dictionary Modal | `Ctrl+K` or `/search` | Global quick search across grammar, vocab, and decks | Fuzzy Search Input, Result List with Level & Category Badges, Quick-add to Deck | Empty query, Searching, Results, No matches |

---

## 4. User Flows

### F01: The Daily Review Loop (Core Loop)
- **Flow**: `S01 (Dashboard)` &rarr; `S04 (Cloze Review Session)` &rarr; `S05 (Review Summary)` &rarr; `S01 (Dashboard)`
- **Steps**:
  1. User checks S01 and clicks "Start Reviews (24 Due)".
  2. S04 displays a cloze sentence: `彼女の歌声を聞く____、感動を抑えられない。` with prompt meaning *"Cannot help but"*.
  3. User types `たび` (valid synonym) &rarr; Bunpro shakes input orange with toast: *"Looking for: 〜ないではいられない"*.
  4. User types `ないではいられない` &rarr; Presses Enter &rarr; Turns emerald green &rarr; Native audio auto-plays.
  5. Repeat until queue reaches 0 &rarr; S05 displays accuracy breakdown and SRS stage promotions.
- **Edge cases**: Accidental typo triggers "Oops" (`Ctrl+Z` / button), network disruption, rapid skipping.
- **Happy Path Action Count**: **2 actions per card** (Type + Enter).

### F02: New Grammar Acquisition Flow
- **Flow**: `S01 (Dashboard)` &rarr; `S02 (Paths)` &rarr; `S03 (Grammar Detail)` &rarr; `S04 (Guided Cloze Check)` &rarr; `S01 (Dashboard)`
- **Steps**:
  1. User navigates to JLPT N2 Path &rarr; Selects "Conditions & Hypotheses".
  2. Inspects `〜ないことには` structure formula and 3 sample sentences with audio.
  3. Solves 1 guided cloze check sentence to verify understanding.
  4. Clicks "Add to Review Deck" &rarr; Seeded into Level 1 SRS queue.
- **Edge cases**: Grammar point already in queue (shows current SRS rank), user switches textbook ordering.
- **Happy Path Action Count**: **4 clicks**.

### F03: Ghost Quarantine Recovery Flow
- **Flow**: `S01 (Dashboard Ghost Badge)` &rarr; `S06 (Ghost Quarantine)` &rarr; `S04 (Ghost Cloze Session)` &rarr; `S06 (Conquered)`
- **Steps**:
  1. Grammar item fails 3 times in main deck &rarr; Automatically clones into Ghost Quarantine.
  2. User opens S06 &rarr; Launches Ghost Session using *alternate context sentences* (not seen in main deck).
  3. Passes 4 consecutive micro-interval reviews (4h &rarr; 8h &rarr; 24h &rarr; 48h) &rarr; Ghost is retired.
- **Edge cases**: Item lapses again during ghost review (resets to Stage 1 micro-interval).
- **Happy Path Action Count**: **3 clicks + reviews**.

### F04: Cram Session Flow
- **Flow**: `S01 (Dashboard)` &rarr; `S07 (Cram Studio)` &rarr; Filter by Category &rarr; `S04 (Cram Drill)` &rarr; `S07 (Cram Results)`
- **Steps**:
  1. User selects "N2 Empathy & Emotions" before a test.
  2. Sets session to 15 questions.
  3. Completes cloze drill without altering main SRS review intervals.
- **Happy Path Action Count**: **3 clicks to launch**.

---

## 5. UI Components

- **C01 `ClozeSentenceBlock`**: Japanese sentence display with underlined target blank `[ _____ ]`, furigana toggle, and highlighted context tokens.
- **C02 `KanaAutoInput`**: Input field with integrated Wanakana IME conversion, auto-complete, and Enter-to-submit.
- **C03 `NuanceWarningToast`**: Ambient amber badge alerting user when input is grammatically valid but another synonym was expected.
- **C04 `SRSForecastBar`**: 24-hour bar chart displaying pending reviews by hour.
- **C05 `StructureMatrix`**: Visual formula badge (`V[辞書形] + ものなら`) with stem and conjugation breakdown.
- **C06 `GradedSentenceRow`**: Context sentence row with dual native audio button (male/female), furigana switch, and translation spoiler.
- **C07 `ContrastiveDiffTable`**: Side-by-side comparison matrix for easily confused grammar points.
- **C08 `OopsButton`**: Reverses the last rating or corrects accidental typos.

---

## 6. Inferred Data Model

- **`GrammarPoint`**: `id`, `level`, `title`, `formula (接続)`, `meaningEn`, `nuance`, `cautionNotes`, `externalReferences`
- **`ExampleSentence`**: `id`, `grammarPointId`, `ja`, `kana`, `en`, `audioUrl`, `clozeTarget`, `acceptableSynonyms`
- **`SRSCard`**: `id`, `userId`, `grammarPointId`, `currentSentenceIndex`, `srsStage`, `streak`, `nextReviewAt`, `lapses`, `isGhost`
- **`GhostCard`**: `id`, `parentCardId`, `grammarPointId`, `alternateSentenceId`, `stage`, `nextReviewAt`

---

## 7. What Cannot / Should Not Be Cloned

- **Proprietary Studio Audio Assets**: Replaced with clean Web Speech TTS + pre-cached authentic audio clips.
- **Proprietary Community Forum Posts**: Replaced with curated offline grammatical connection chains (`接続`) and bilingual notes.
- **Paid Cloud Subscription Backend**: Nihongo N2 Master remains **100% offline-first with IndexedDB persistence and zero subscription fees**.

---

## 8. Sizing & Effort

- **Screens**: 8 screens
- **Flows**: 4 primary user flows
- **Hardest Parts**: Realtime Wanakana cloze input with nuance interceptor; Ghost alternate sentence rotation; offline audio caching.
- **Scope Size**: **M (2–3 weeks)** for integrating Bunpro's best UX patterns into Nihongo N2 Master.
