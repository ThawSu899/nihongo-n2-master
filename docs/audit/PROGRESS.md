# N5 Curriculum Remediation Progress Tracker

## Phase Overview

| Phase | Description | Status | Commit Hash | Open Questions / Notes |
| :---: | :--- | :---: | :---: | :--- |
| **0** | Baseline & Schema Notes | Completed | `9ca2b1f` | Schema notes written for `sentences`, `vocab`, `kanji`, `reading`, `listening`, `questions`. Baseline tsc & vitest: 100% green. |
| **1** | Validator Script (`validate-n5.ts`) | Completed | `9ca2b1f` | Implemented 8 validation checks, baseline dump saved to `scripts/out/n5_validation_baseline.json`. Total baseline issues: 3,013. |
| **2** | Kana & Typo Fixes | Next (Awaiting 'go') | - | Applies verified fixes in l03, l05, l07, l09, l12, l14, l15, l16, l18, l20, l21, l25, l26, l27, l28, l30. |
| **3** | Structure, IDs, Links (2 gates) | Planned | - | Proposal first (3a), apply after "go" (3b). |
| **4** | Burmese Translations (Batching) | Planned | - | Glossary first (4a), 5-lesson batches (4b). |
| **5** | Pitch Accent (Data-driven only) | Planned | - | Kanjium accent dataset integration. |
| **6** | Final Remediation Report | Planned | - | Final audit diff & summary. |

---

## Baseline Validation Counts (Phases 0 & 1 Baseline)
- **Check 1 (Kana charset validation)**: 14 issues
- **Check 2 (Speaker prefix in kana)**: 3 issues
- **Check 3 (Kana vs Ja mismatch)**: 35 issues
- **Check 4 (Pitch dropIndex / pattern inconsistency)**: 48 issues
- **Check 5 (Questions structure & referential integrity)**: 176 issues
- **Check 6 (Sentence IDs formatting & sequence gaps)**: 2 issues
- **Check 7 (Burmese fields missing / English duplicate)**: 2,735 issues
- **Check 8 (Zawgyi encoding heuristic)**: 0 issues
- **Total Detected Issues**: 3,013 issues across 30 lesson packs

---

## Verification Gateway
- `npx tsc --noEmit`: 0 errors (clean)
- `npx vitest run --maxWorkers=2`: 44/44 test files passed, 977/977 tests passed (100%)
- **Active Branch**: `fix/n5-audit`
