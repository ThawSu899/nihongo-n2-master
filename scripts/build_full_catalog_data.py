# -*- coding: utf-8 -*-
"""
Canonical JLPT Kanji Catalog Generator
Generates full typescript file for src/domain/dictionary/kanji-catalog.ts
Includes:
- 16 original N2/N3 items preserved
- 45 canonical N5 missing kanji
- 50+ canonical N4 kanji
- 130+ canonical N3 kanji (including 果, 能, 度)
- 190+ canonical N2 kanji
- Pure Katakana onyomi, pure Hiragana kunyomi, authentic Burmese meanings, Kanjidic2 strokes
"""
import glob, json, re, sys

# 1. Existing items in kanji-catalog.ts
EXISTING_CHARS = [
    '契', '握', '妥', '協', '構', '視', '遂', '著', '克', '傾', '厳', '疲', '読', '解', '論', '証'
]

# Check existing entries in kanji-catalog.ts
with open('src/domain/dictionary/kanji-catalog.ts', encoding='utf-8') as f:
    orig_text = f.read()

# We can parse the 16 existing entries from orig_text or keep them intact!
