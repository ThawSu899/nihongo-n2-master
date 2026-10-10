# Phase 5 Completion Record: Google Services Integration

**Project:** Nihongo N2 Master  
**Date:** 2026-10-04  
**Status:** Accepted with Documented Limitations  
**Documentation Location:** `docs/phase5-completion-record.md`

---

## 1. Verified Scope

### 1.1 Google Sheets Curriculum Pipeline
- **12-Tab Ingestion & Validation:** Implemented complete parsing and validation for all 12 official tabs (`Meta`, `Modules`, `Lessons`, `Vocabulary`, `Kanji`, `Grammar`, `Sentences`, `Reading`, `Listening`, `Questions`, `Tests`, `Audio`).
- **Data Quality & Quarantine:** Row-level validation using Zod schemas; Unicode NFC normalization and Zawgyi font detection; automatic quarantine of malformed rows with actionable diagnostics; duplicate ID detection per tab.
- **Referential Integrity:** Cross-tab validation verifying vocabulary references to sentences/kanji, test references to questions, and lesson references to modules.
- **Diff & Staging:** In-memory diff generation calculating added, updated, and unchanged counts; tab-by-tab summaries; explicit user approval gate prior to applying.
- **Client-Side Export:** Standardized 12-tab CSV generation (`exportLessonPackCsv`) compliant with the template schema.

### 1.2 Google Drive Cloud Vault
- **Scoped OAuth:** Restricted strictly to `https://www.googleapis.com/auth/drive.file`.
- **Folder Isolation:** All operations restricted to the dedicated app folder `Japanese-N2-Master/` without requesting broad Drive access.
- **Operations:** Progress backup upload, listing, downloading, and deletion; custom in-modal confirmation dialogs for destructive actions.
- **Offline Audio Fallback:** Seamless fallback to local Web Speech API synthesis (`ja-JP`) when external audio files are missing or unauthenticated.

### 1.3 Google Calendar Study Schedule Mirror
- **Dedicated Calendar Resolution:** Queries Google Calendar specifically for `Nihongo N2 Master`; never silently falls back to the user's primary calendar.
- **Opt-In Safety Gate:** If the dedicated calendar does not exist, primary calendar syncing requires explicit opt-in and confirmation in the UI; otherwise, zero event mutations occur.
- **Event Tagging & Isolation:** Events are tagged with private metadata (`app=nihongo_n2_master`, `blockId`). Synchronization deletes and replaces only app-tagged events, strictly protecting unrelated personal events.
- **Target-Date Timezone Offset:** Offsets are calculated dynamically for the target date's timezone, preserving learner wall-clock study times across daylight-saving transitions.
- **Offline Fallback:** Standalone `.ics` iCalendar generator produces RFC-5545 compliant files with 10-minute alarms with zero network requirements.

---

## 2. Documented Limitations

The following architectural limitations were identified during the Phase 5 completion audit and are officially recorded:

1. **Partial IndexedDB Persistence (8 of 12 Tabs):**
   - Only the 8 core lesson-pack content tabs (`Meta`, `Vocabulary`, `Kanji`, `Grammar`, `Sentences`, `Reading`, `Listening`, `Questions`) are written to Dexie IndexedDB (`db.lesson_packs`).
2. **Modules and Lessons Sourcing:**
   - The `Modules` and `Lessons` tabs are parsed and validated in memory for staging diffs, but are not persisted into `db.lesson_packs`. The application's curriculum navigation continues to source multi-lesson structure from `content/curriculum-map.json`.
3. **Dynamic Test Generation:**
   - The `Tests` tab header metadata is validated and staged in memory, but is not stored in a separate database table. The application's `AssessmentEngine` dynamically generates tests from persisted `Questions`.
4. **Embedded Audio References:**
   - The `Audio` tab registry is validated and staged in memory, but audio pointers remain embedded directly inside lesson items (`audio: AudioRef`) within `Vocabulary`, `Sentence`, and `Listening` records.
5. **Single-Depth Rollback:**
   - The rollback snapshot stored in `localStorage` (`rollback_pack_${packId}`) maintains only the single, immediately preceding version. Successive applies overwrite this single rollback slot.
6. **No Concurrency Revision Locking:**
   - Concurrent applies from multiple tabs or sessions rely on standard IndexedDB last-write-wins without optimistic locking or revision (`rev`) conflict resolution.
7. **Mocked API Test Coverage:**
   - Automated integration tests in `tests/sheets-integration.test.ts` and `tests/calendar-safety.test.ts` mock Google REST API endpoints via `fetch` interceptors. No live calls to Google APIs were performed during automated testing.

---

## 3. Test Verification Baseline

- **Automated Tests:** 90 tests passing across 7 test suites:
  - `tests/sheets-integration.test.ts` (14/14 passed)
  - `tests/calendar-safety.test.ts` (7/7 passed)
  - `tests/m2-m7.test.ts` (16/16 passed)
  - `tests/domain.test.ts` (17/17 passed)
  - `tests/assessment-shuffle.test.ts` (14/14 passed)
  - `tests/curriculum-audit-phase3.test.ts` (13/13 passed)
  - `tests/acceptance-flow.test.ts` (9/9 passed)
- **TypeScript Check:** `npm run lint` (`tsc --noEmit`) completed with 0 errors.
- **Production Build:** `npm run build` (`vite build`) completed successfully.
