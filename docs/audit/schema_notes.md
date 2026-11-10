# N5 Lesson Pack Schema Notes (Baseline Analysis)

## Overview
This document records the exact field paths, real TypeScript types, and structural patterns observed across the 30 N5 curriculum packs (`content/packs/n5/n5.l01.json` through `n5.l30.json`), with in-depth analysis of sample packs `n5.l01`, `n5.l11`, and `n5.l25`.

---

## 1. Sentences (`pack.sentences[]`)
Top-level array of example and practice sentences for the lesson.
- **Path**: `pack.sentences[i]`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.s\d{3}$`, e.g., `"n5.l01.s001"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `ja`: `string` (Japanese sentence text with Kanji/Kana)
  - `kana`: `string` (Furigana phonetic reading of sentence)
  - `translation`: `object`
    - `en`: `string` (English translation)
    - `my`?: `string` (Burmese translation)
  - `translationMy`?: `string` (Direct top-level Burmese translation mirror)
  - `meaningMy`?: `string` (Alternate top-level Burmese definition key)
  - `vocabIds`: `string[]` (IDs of vocabulary referenced, e.g., `["n5.l01.v001", ...]`)
  - `grammarIds`: `string[]` (IDs of grammar patterns demonstrated, e.g., `["n5.l01.g001"]`)
  - `audio`: `object`
    - `kind`: `"tts" | "file"` (default: `"tts"`)
    - `lang`: `"ja-JP"`
  - `prov`: `Provenance` object (`source`, `license`, `status`, `updatedAt`, `rev`)
- **Variations Across Packs**:
  - In earlier packs (e.g., `l01`), both `translation.my` and `translationMy` / `meaningMy` are present. In some packs, `translation` contains only `{ en: "..." }` while `translationMy` is stored directly on the sentence object.

---

## 2. Vocabulary (`pack.vocabularies[]`)
Lexical items for the lesson deck. Exactly 30 items per lesson pack.
- **Path**: `pack.vocabularies[i]`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.v\d{3}$`, e.g., `"n5.l01.v001"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `ja`: `string` (Kanji or Kana base form)
  - `kana`: `string` (Pure phonetic reading in Hiragana/Katakana)
  - `en`: `string` (English definition)
  - `my`: `string` (Burmese translation)
  - `meaningMy`?: `string` (Burmese translation alias)
  - `meaningMyanmar`?: `string` (Burmese translation alias)
  - `myanmar`?: `string` (Burmese translation alias)
  - `pos`: `string` (Part of speech: `"noun"`, `"verb"`, `"adjective"`, `"expression"`, etc.)
  - `exampleSentenceId`: `string` (Referenced sentence ID, e.g., `"n5.l01.s001"`)
  - `kanjiIds`: `string[]` (Referenced Kanji IDs within pack, e.g., `["n5.l01.k01"]` or `[]`)
  - `level`: `"N5"`
  - `difficulty`: `number` (1 to 5)
  - `importance`: `number` (1 to 5)
  - `audio`: `object` (`{ kind: "tts", lang: "ja-JP" }`)
  - `prov`: `Provenance` object
  - `pitchPattern`: `"heiban" | "atamadaka" | "nakadaka" | "odaka"`
  - `dropIndex`: `number` (0 for heiban; 1 for atamadaka; mora length for odaka; 2..mora-1 for nakadaka)
- **Variations Across Packs**:
  - Redundant Burmese keys (`my`, `meaningMy`, `meaningMyanmar`, `myanmar`) coexist across items to ensure cross-compatibility with legacy and modern readers.

---

## 3. Kanji (`pack.kanjis[]`)
Kanji characters introduced in the lesson.
- **Path**: `pack.kanjis[i]`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.k\d{2}$`, e.g., `"n5.l01.k01"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `char`: `string` (Single Kanji character, e.g., `"学"`)
  - `meaning`: `string` (English meaning)
  - `onyomi`: `string[]` (Pure Katakana onyomi readings, e.g., `["ガク"]`)
  - `kunyomi`: `string[]` (Pure Hiragana kunyomi readings, e.g., `["まな・ぶ"]`)
  - `exampleVocab`: `Array<object>`
    - `word`: `string` (Example word, e.g., `"学生 (がくせい)"` or `"学生"`)
    - `reading`: `string` (Hiragana reading, e.g., `"がくせい"`)
    - `meaning`: `string` (English meaning)
    - `preview`: `boolean` (Default: `false`)
    - `meaningMyanmar`?: `string` (Burmese definition)
    - `meaningMy`?: `string` (Burmese definition alias)
  - `exampleSentenceIds`: `string[]`
  - `components`: `string[]` (Radical parts, e.g., `["宀", "子"]`)
  - `strokes`: `number` (Kanjidic2 stroke count)
  - `difficulty`: `number`
  - `level`: `"N5"`
  - `prov`: `Provenance` object
  - `meaningMyanmar`?: `string` (Character Burmese meaning)
  - `meaningMy`?: `string`
  - `myanmar`?: `string`
- **Variations Across Packs**:
  - `exampleVocab` items in older packs often have both `meaningMyanmar` and `meaningMy`, whereas some packs have English-only `meaning` with identical fallback values in `meaningMyanmar`.

---

## 4. Reading Passage (`pack.reading`)
Reading comprehension passage object.
- **Path**: `pack.reading`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.r01$`, e.g., `"n5.l01.r01"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `title`: `string` (Japanese or English title)
  - `level`: `"N5"`
  - `text`: `string` (Full Japanese reading passage text)
  - `kanaText`: `string` (Phonetic kana transcription of full text)
  - `translation`: `string` (Full English translation text)
  - `translationMy`?: `string` (Burmese translation text)
  - `titleMy`?: `string` (Burmese title)
  - `titleMyanmar`?: `string` (Burmese title alias)
  - `questionIds`: `string[]` (Questions evaluating reading, e.g., `["n5.l01.q021", ...]`)
  - `difficulty`: `number`
  - `glossary`: `Array<{ term: string, reading: string, meaning: string }>`
  - `prov`: `Provenance` object
- **Variations Across Packs**:
  - `translation` is universally a `string` across all 30 N5 packs.
  - In many packs (e.g., `l01`, `l11`, `l25`), `translationMy` exists but currently contains an English copy of `translation` rather than authentic Burmese Unicode text (target for Phase 4 remediation).

---

## 5. Listening Dialogue (`pack.listening`)
Audio conversation and listening comprehension module.
- **Path**: `pack.listening`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.l01$`, e.g., `"n5.l01.l01"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `title`: `string`
  - `level`: `"N5"`
  - `audio`: `object` (`{ kind: "tts" | "file", fileId?: string }`)
  - `speakers`: `string[]` (List of dialogue participants, e.g., `["ケン", "アンナ"]`)
  - `transcript`: `string` (Full concatenated dialogue text)
  - `translation`: `string` (Full dialogue English translation)
  - `translationMy`?: `string` (Full dialogue Burmese translation)
  - `titleMy`?: `string`
  - `titleMyanmar`?: `string`
  - `turns`: `Array<object>`
    - `speaker`: `string` (Character name)
    - `ja`: `string` (Japanese dialogue utterance)
    - `kana`: `string` (Furigana reading of utterance)
    - `en`: `string` (English translation of utterance)
    - `my`: `string` (Burmese translation of utterance)
    - `myanmar`?: `string`
    - `translationMy`?: `string`
  - `questionIds`: `string[]` (Listening questions, e.g., `["n5.l01.q026", ..., "n5.l01.q030"]`)
  - `difficulty`: `number`
  - `prov`: `Provenance` object
- **Variations Across Packs**:
  - In some turns across packs (e.g., `l07`, `l18`, `l20`), `turns[].kana` was found to retain the speaker name prefix (e.g., `"こばやし："` or `"えみりー："`), which is targeted in Phase 2.
  - In multiple packs, `turns[].my` contains duplicate English text instead of Burmese.

---

## 6. Questions (`pack.questions[]`)
Assessment and practice item bank for the lesson pack. Typically 30 questions per lesson.
- **Path**: `pack.questions[i]`
- **Real Types & Observed Fields**:
  - `id`: `string` (Pattern: `^n5\.l\d{2}\.q\d{3}$`, e.g., `"n5.l01.q001"`)
  - `lessonId`: `string` (e.g., `"n5.l01"`)
  - `skill`: `"vocab" | "kanji" | "grammar" | "reading" | "listening"`
  - `type`: `"multiple_choice" | "reorder" | "typed_recall" | "listening_choice" | ...`
  - `prompt`: `string` (Question prompt in English or Japanese)
  - `choices`: `string[]` (Answer options; official multiple-choice expects 4 items)
  - `choicesMy`?: `string[]` (Burmese translation of choices)
  - `answer`: `string` (Correct answer value, matching one of `choices`)
  - `acceptedAnswers`?: `string[]`
  - `explanation`: `string` (Explanation text in English)
  - `explanationMy`?: `string` (Burmese explanation text)
  - `promptMy`?: `string`
  - `questionMy`?: `string`
  - `difficulty`: `number` (1 to 5)
  - `linkedItemIds`: `string[]` (Referenced IDs, e.g., `["n5.l01.v001"]`)
  - `generated`: `boolean`
  - `audio`?: `object`
- **Variations Across Packs**:
  - `choicesMy` is present in 790 questions, but **missing** (`undefined`) in 123 questions across the 30 packs.
  - `choices.length` is usually 4, but specific items (e.g., `l02.q018` and `l11.q014`) contain only 3 choices, to be remedied in Phase 3.
  - `linkedItemIds` is empty (`[]`) in several questions or references misaligned IDs (targeted in Phase 3).
