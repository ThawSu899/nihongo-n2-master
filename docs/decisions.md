# Architecture Decision Record: Nihongo N2 Master

**Date:** 2026-09-30  
**Status:** Approved  
**Scope:** Foundation (M0) and Vertical Slice (M1) — Lesson N5 Day 1 (`n5.l01`)

---

## 1. Stack & Architecture

- **Runtime & UI:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons.
- **Client Storage:** Offline-first via Dexie (IndexedDB) with transactional writes, schema versioning, and append-only `study_events` log for state rebuildability.
- **Answer Input & Kana:** `wanakana` for romaji-to-kana conversion, NFKC unicode normalization, and lenient punctuation/whitespace matching.
- **SRS Engine:** Primary: FSRS via `ts-fsrs` (target retention: 0.90, configurable 0.85–0.95); Secondary: Deterministic 7-step Interval Ladder (`New -> 10m -> 1d -> 3d -> 7d -> 14d -> 30d -> 60d+`) used as fallback and UI stage band categorization.
- **Layering Boundary:**
  - `domain/`: Pure TypeScript engines (Mastery, SRS, Scheduler, Timer, Assessment, Content Linter). Injected with `Clock` and deterministic PRNG; 0 I/O or browser dependency.
  - `data/`: Dexie database, event repository, content pack loader, snapshots, and backup import/export.
  - `integrations/`: Isolated adapter interfaces (`ContentSource`, `FileStore`, `CalendarService`, `ReminderChannel`, `AIProvider`) each with production-ready `NullAdapter` or local file equivalents.
  - `presentation/`: React components, screens, accessible keyboard handlers, audio player with Web Speech TTS fallback.

---

## 2. Stable Content ID Scheme

All curriculum IDs are hierarchical, human-readable, immutable strings:
- **Level & Lesson:** `n5.l01` (N5, Lesson 01).
- **Vocabulary:** `n5.l01.v001` to `n5.l01.v012`.
- **Kanji:** `n5.l01.k001` to `n5.l01.k003`.
- **Grammar:** `n5.l01.g001` to `n5.l01.g003`.
- **Sentences:** `n5.l01.s001` to `n5.l01.s010`.
- **Reading:** `n5.l01.r01`.
- **Listening:** `n5.l01.l01`.
- **Questions:** `n5.l01.q001` to `n5.l01.q035`.
- **SRS Cards:** `<itemId>:<facet>` (e.g. `n5.l01.v001:recog`, `n5.l01.v001:recall`, `n5.l01.k001:meaning`, `n5.l01.k001:reading`).

Modified content retains its ID and increments `rev: number`. Deprecated items are soft-retired (`status: 'retired'`) to protect learner history.

---

## 3. Mastery Formula & Thresholds

Mastery is **conjunctive** across all 5 skills and overall weighted score:
- **Skill Thresholds:**
  - Vocabulary: ≥ 90% (minimum 10 questions)
  - Kanji: ≥ 85% (minimum 6 questions)
  - Grammar: ≥ 85% (minimum 6 questions)
  - Reading: ≥ 80% (minimum 5 questions)
  - Listening: ≥ 80% (minimum 5 questions)
- **Overall Score:** Weighted average (Vocab 25%, Kanji 15%, Grammar 25%, Reading 17.5%, Listening 17.5%) must be ≥ 85%.
- **State Transitions:**
  - `new`: No interaction recorded.
  - `learning`: Any stage started.
  - `familiar`: Stages 2–9 completed and unhinted practice accuracy ≥ 70%.
  - `mastered`: Lesson test passed meeting all 5 skill thresholds, overall threshold, and minimum evidence question counts.
  - `retained`: ≥ 7 days after Mastered, ≥ 80% of lesson cards have SRS interval ≥ 21 days, and rolling 30-day lesson recall ≥ 90%.
  - `demoted`: Dropped to `learning` ("Needs Refresh") if rolling 30-day retention drops below 80%.
- **Safety Valve:** 3 failed attempts unlock "Proceed Provisionally" with targeted remediation remaining in the daily schedule.

---

## 4. SRS Engine & Multi-Facet Card Structure

- Separate cards per item facet to prevent false mastery:
  - Vocabulary: `recognition` (JP -> EN/MY), `recall` (EN/MY -> Typed JP), `listening` (Audio -> JP/Meaning).
  - Kanji: `meaning` (Kanji -> Meaning), `reading` (Kanji in word context -> Kana), `stroke` (Writing self-assessment).
  - Grammar: `recognition` (Pattern -> Meaning), `cloze` (Sentence completion).
  - Sentences: `cloze`, `translation`.
- **Performance Rating Mapping:**
  - Wrong: `Again` (due in ≤ 10 min, card interval resets, lapses increment).
  - Correct with hint or slow (> 2× median response time): `Hard`.
  - Clean correct within standard time: `Good`. Multiple-choice capped at `Good`.
  - Fast clean typed recall: `Easy`.
- **Leech Flag:** ≥ 8 lapses flags item as leech for alternative mnemonic display and extra remediation.
- **Rollover & Due Window:** Daily rollover at 04:00 local time. Reviews due before 04:00 next day count as "Due Today".

---

## 5. Daily Plan & Adaptive Scheduler

- **Schedule Baseline:** Six 60-minute blocks = 360 min (6 hours) goal:
  1. 07:45–08:45 Vocabulary + SRS (60m)
  2. 09:00–10:00 Kanji (60m)
  3. 10:15–11:15 Grammar (60m)
  4. 12:00–13:00 Reading (60m)
  5. 13:15–14:15 Listening + Shadowing (60m)
  6. 14:30–15:30 Mastery Test & Remediation (60m)
  *(Admin setup 07:30–07:45 and Daily Review 15:30–15:45 are tracked but do not count toward the 6h learning time).*
- **Pure Function:** `buildDailyPlan(state: LearnerState, clock: Clock): DailyPlan`.
- **Adaptation Rules:**
  - Calculates 14-day rolling accuracy per skill (minimum 20 attempts required to establish weakness/strength).
  - Deficit reallocation moves 15–30 minutes from strong skills to weak skills.
  - Every modification generates an explicit, human-readable mathematical justification.
- **Content Exhaustion:** When new content is finished, remaining block time is dedicated to due SRS, remediation, earlier lesson reviews, and shadowing. Material is never padded or fabricated.

---

## 6. Study Timer Architecture

- **Timestamp Persistence:** Stores `startedAt` (epoch timestamp), `accumulatedMs`, `state` (`idle | running | paused | completed`), and `blockId`.
- **Resilience:** Survives tab switching, sleep mode, page reloads, and browser throttling because elapsed time is computed as `now - startedAt + accumulatedMs`.
- **Idle Detection:** If interaction is idle for ≥ 2 minutes during active sessions, auto-pause kicks in with manual resume prompt.
- **Lifecycle Events:** Completing a block commits learning time to IndexedDB, dispatches a study event, and triggers a 15-minute break timer.

---

## 7. Reminders & Honest Delivery Strategy

Per §9 of specification, browser web applications cannot guarantee scheduled alerts when closed. We implement:
1. **In-App Visual/Audio Alerts:** Active while the app is open.
2. **Web Notifications API:** Request permission contextually; delivered when tab is open/backgrounded.
3. **iCalendar (.ics) Export:** Generates standardized `.ics` calendar files with configured ALARMs for any phone or desktop calendar app without network dependencies.
4. **Google Calendar Adapter:** Mirror app blocks to a dedicated "Nihongo N2 Master" calendar via OAuth with popup reminders.

---

## 8. Content Pack Format & Linter Rules

- Content stored in versioned JSON schema (`LessonPack`).
- **Linter Enforcements:**
  1. Referential integrity: Every referenced ID must exist.
  2. Kanji contextualization: Each kanji must have ≥ 2 example vocabulary words.
  3. Vocabulary usage: Every word must appear in at least one sentence.
  4. Grammar inclusion: Grammar targets must appear in reading or listening text.
  5. Vocabulary coverage: Reading/listening text must reach ≥ 95% known-word threshold or include explicit glosses.
  6. Unicode compliance: Myanmar script verified for standard Unicode (non-Zawgyi).

---

## 9. Isolation of External Integrations

- Study, SRS, tests, progress, and timer function 100% offline with zero external network calls.
- Google Sheets / Drive / Calendar and AI services implement strict adapter interfaces with `NullAdapter` and local mock/export alternatives.
- AI Tutor responses are explicitly labeled as *"AI-generated help — not part of the curriculum"* and stored in separate `ai_notes` tables.
- All learner state is local to IndexedDB with single-click JSON snapshot export and restore.
