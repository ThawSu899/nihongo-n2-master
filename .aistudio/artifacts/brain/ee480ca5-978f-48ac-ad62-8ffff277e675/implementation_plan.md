# Dynamic Lesson Progression & Current Focus Auto-Advance

This update resolves the issue where the dashboard permanently displays Lesson 1 as the "Current Focus" even after completing or mastering lessons. It makes the Current Focus card fully dynamic based on user progress and automatically advances the active focus to the next lesson upon lesson completion.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Progression & Focus Behavior Upon Lesson Completion:**
> - **Auto-Advance to Next Sequence**: When all 15 stages of a lesson or the mastery test are completed, the system will record the mastery result, save the updated `currentLessonId` (e.g., advancing from `n5.l01` to `n5.l02`) to IndexedDB, and transition the active focus.
> - **Dynamic Home Hero Card**: The "Current Focus" card on the Home dashboard will no longer hardcode Lesson 1. It dynamically renders the curriculum metadata (Day, Lesson number, Japanese kanji title, description, and real-time mastery badge) of whichever lesson is currently active.
> - **Seamless Modal/View Closing**: Finishing the lesson in the player automatically commits progress and returns to the updated dashboard showing the next lesson ready to start.

- **Confirmed Decision 1**: The user indicated that the dashboard was stuck on Lesson 1 even after completing the lesson because both `HomeScreen.tsx` and `App.tsx` were hardcoded to `n5.l01`.
- **Confirmed Decision 2**: Replace all static Lesson 1 references with a dynamic resolver that tracks `profile.currentLessonId`, calculates the next unmastered or sequential lesson from `curriculum-map.json`, and allows the user to switch or progress smoothly.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the static Lesson 1 hero card into a living curriculum tracker. When a learner finishes Lesson 1 (or any lesson pack), the application updates the mastery state in IndexedDB, computes the next lesson in the N5–N2 sequence, sets `currentLessonId` to the next lesson, and updates the dashboard immediately upon exiting the player.
- **Target Audience / Persona**: Japanese language learners studying JLPT N5 through N2 in an offline-first environment who need accurate progression tracking.
- **Key Value**: Eliminates the confusing "stuck on Lesson 1" bug, providing immediate visual confirmation of lesson completion and clear momentum into subsequent curriculum packs.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Dashboard Zero/Active State**: Learner opens the dashboard and sees their true current focus (e.g., *Lesson 1: Greetings & Self Introduction* if new, or *Lesson 2: Daily Routines* if Lesson 1 has been completed).
  2. **Starting Study**: Clicking **START STUDY** launches the exact lesson indicated in the focus card, setting the active pack in state.
  3. **Curriculum Selection**: Selecting any published lesson in the Curriculum Map updates the learner's active focus to that pack.
  4. **Lesson Completion**: At Stage 15 (Progress Committed) or on test completion, clicking **Return to Dashboard** advances the active lesson pointer to the next lesson in the curriculum order and brings the user back to the Home view.
  5. **Updated Focus State**: The dashboard now displays the next lesson with a **NEW** or **LEARNING** badge, with the button ready to **START STUDY (N5 DAY 2)**.

- **Visual Identity & Theme**:
  - Maintains the established Japanese traditional motif (Matcha green accents, Sumi charcoal surfaces, Sakura crimson highlights `#e11d48`, Clover Mon watermark pattern).
  - Dynamic mastery status pill replaced with clean Japanese typography and anti-slop badge tokens (`NEW`, `LEARNING`, `MASTERED`, `RETAINED`).
  - Hero card displays actual Japanese ruby annotations and lesson descriptions derived from `curriculum-map.json`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Next Lesson Derivation Logic**
  - *Chosen Approach*: Sequential lookup within the current JLPT level in `curriculumMapJson`. When `n5.l01` is completed, the next published lesson is `n5.l02`. If a level is fully finished, it suggests the first lesson of the next level (N4).
  - *Why*: Predictable, chronological study curriculum aligned with JLPT day-by-day study plans.
  - *Alternatives Considered*: Pure mastery scan (jumping to any unmastered lesson regardless of level). Passed over because it disrupts linear learning pacing.

- **Decision 2: Local Persistence via Dexie / IndexedDB**
  - *Chosen Approach*: When a lesson completes or when a user selects a lesson from the curriculum map, update `profile.currentLessonId` in `db.profile` and trigger `refreshAppData()` in React.
  - *Why*: Keeps the entire experience 100% offline-first and persists across browser refreshes and device restarts.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       App.tsx Root State                     │
│  - profile (currentLessonId)                                │
│  - activePack (LessonPack)                                  │
│  - masteryRecords (Record<string, MasteryRecord>)           │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│        HomeScreen.tsx        │ │    LessonPlayerScreen.tsx   │
│ - Reads dynamic activeLesson │ │ - Completes Stage 15        │
│   metadata from curriculum   │ │ - Commits Mastery Record    │
│ - Dynamic Title, Ruby, Day   │ │ - Calls onComplete / onExit │
│ - Start/Continue button      │ │ - Triggers profile advance  │
└──────────────┬───────────────┘ └─────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Dexie IndexedDB (Local-First)                │
│  - db.profile ('current_user' -> currentLessonId)            │
│  - db.mastery_records (scores, state, history)              │
│  - db.study_sessions & db.srs_cards                         │
└─────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - `App.tsx`:
    - Derive `focusedLessonItem`: Match `profile.currentLessonId` against `ContentLoader.getCurriculumMap()`. Fall back to `n5.l01` if not found.
    - Compute `focusedMastery`: `masteryRecords[focusedLessonItem.id]`.
    - In `onStartStudy(lessonId)`: Load the specified `lessonId` pack via `ContentLoader.getLessonPack(lessonId || profile.currentLessonId)` and set `pack`.
    - In `LessonPlayerScreen.onExit` / `onCompleteLesson`: After committing Stage 15 progress, advance `profile.currentLessonId` to the next lesson item in `curriculum-map.json`, update `db.profile`, and refresh state before navigating back to `'home'`.
  - `HomeScreen.tsx`:
    - Accept `focusedLesson: CurriculumMapItem` and `masteryRecord?: MasteryRecord` as props.
    - Render dynamic title (`focusedLesson.title`), level day (`${focusedLesson.level} Day ${focusedLesson.day || focusedLesson.number} • Lesson ${focusedLesson.number}`), topics, and mastery badge.
    - Start button dynamically displays `START STUDY (${focusedLesson.level} DAY ${focusedLesson.number})` or `CONTINUE LESSON`.
  - `CurriculumScreen.tsx`:
    - When a lesson is clicked, update both the active pack and the user's `currentLessonId` in `profile`.
