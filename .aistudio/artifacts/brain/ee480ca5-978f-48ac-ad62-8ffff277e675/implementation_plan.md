# Implementation Plan: Standalone KanjiDrawer Component & Dokkai Workbench Trigger

Create a dedicated `KanjiDrawer.tsx` component with interactive state for radical decomposition and contextual example sentences, and ensure seamless triggering via touch long-press ($\ge 500\text{ms}$) and desktop double-click/right-click inside `DokkaiReaderWorkbench.tsx`.

---

### User Review & Critical Design Decisions

- **Dedicated Component**: Create `src/presentation/components/KanjiDrawer.tsx` as a first-class, standalone component that exports `KanjiDrawer` (and re-exports in `KanjiSlideOverDrawer` for backward compatibility).
- **Interactive State for Decomposition & Examples**:
  - `activeRadicalTab` / `selectedComponent`: Allows learners to click into constituent radicals (e.g. clicking `丰` or `刀` inside `契`) to view individual radical etymology, stroke counts, and sub-meanings.
  - `showAllExamples`: Toggle between high-yield core N2 compounds and expanded contextual example sentences with Japanese furigana, English, and Burmese (`my`) definitions.
  - `audioState`: Live audio indicator when pronouncing kanji readings, radical names, or compound sentences via Web Speech API.
  - `isMined` & `toastMessage`: Emerald glow success indicator linked to the user's active SRS deck.
- **Trigger Ergonomics in `DokkaiReaderWorkbench.tsx`**:
  - Long-press on mobile touch screens ($\ge 500\text{ms}$ holding threshold with $>10\text{px}$ movement scroll-cancellation and haptic vibration feedback).
  - Desktop double-click and right-click (context menu) support on all kanji ideographs across reading paragraphs and vocabulary tokens.
  - Preserve single-click highlighting and vocabulary miner popover without conflict.

---

### Proposed Changes

#### 1. `src/presentation/components/KanjiDrawer.tsx`
- Build the standalone `KanjiDrawer` component:
  - Header: Kanji display, JLPT level tag, stroke count, primary radical badge, close button (`Esc` key listener).
  - State:
    - `selectedComponent: KanjiRadicalComponent | null`: Sub-radical inspection state.
    - `showAllExamples: boolean`: Expanding beyond initial 2 examples to full catalog sentences.
    - `toastMessage`: Emerald glow notification state.
    - `isMined`: Active SRS tracking via Dexie.
  - Sections:
    - Character showcase with native Web Speech synthesis.
    - Interactive Radical Decomposition Grid with clickable components showing name, meaning, and role.
    - On'yomi & Kun'yomi pronunciation badges.
    - Contextual Example Compounds and sentences with bilingual English/Burmese translations.
    - 1-Click Add to active SRS deck with emerald glow toast.

#### 2. `src/presentation/components/DokkaiReaderWorkbench.tsx`
- Ensure direct import from `./KanjiDrawer`.
- Validate that `InteractiveKanjiSpan` correctly binds:
  - `onTouchStart` / `onTouchMove` / `onTouchEnd` for 500ms long-press.
  - `onDoubleClick` and `onContextMenu` for desktop mouse users.
- Mount `<KanjiDrawer kanji={selectedKanji} onClose={() => setSelectedKanji(null)} sentenceContext={selectedKanjiContext} />`.

#### 3. `tests/kanji-drawer.test.ts`
- Update unit tests to verify:
  - `KanjiDrawer` rendering and exports.
  - Radical decomposition state and retrieval for N2 kanji.
  - Example sentences structure and contextual usage.
  - 1-Click SRS persistence into `db.srs_cards` and `db.study_events`.

---

### Verification Plan

1. **Automated Testing**:
   - Run `npx vitest run tests/kanji-drawer.test.ts` to verify decomposition, examples, and SRS operations.
   - Run full test suite `npx vitest run`.
2. **Type Checking & Linting**:
   - Run `npm run lint` (`tsc --noEmit`) to verify 0 errors.
3. **Applet Compilation**:
   - Run `compile_applet` to confirm successful build.
