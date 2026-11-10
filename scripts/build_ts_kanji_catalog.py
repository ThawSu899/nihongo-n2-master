# -*- coding: utf-8 -*-
"""
Builds production-grade src/domain/dictionary/kanji-catalog.ts
"""
import sys, re
sys.path.insert(0, 'scripts')
from kanji_dataset import get_curated_kanji_list

with open('src/domain/dictionary/kanji-catalog.ts', encoding='utf-8') as f:
    orig_content = f.read()

# Grab header interfaces (from line 1 to export const CURATED_KANJI_CATALOG)
cat_def = 'export const CURATED_KANJI_CATALOG: Record<string, KanjiDetail> = {\n'
header_end = orig_content.find(cat_def)
header = orig_content[:header_end]

cat_start = header_end + len(cat_def)
cat_end = orig_content.find('\n};', cat_start)
orig_catalog_str = orig_content[cat_start:cat_end].strip()

# Bottom helpers starts from the comment or COMMON_RADICAL_MAP
bottom_idx = orig_content.find('// 2. COMMON RADICAL DICTIONARY')
if bottom_idx == -1:
    bottom_idx = orig_content.find('export const COMMON_RADICAL_MAP')
else:
    # go back to start of comment block
    comment_start = orig_content.rfind('// ----', 0, bottom_idx)
    if comment_start != -1:
        bottom_idx = comment_start

bottom_helpers = orig_content[bottom_idx:]

curated_items = get_curated_kanji_list()

out = []
out.append(header)
out.append(cat_def)
out.append(orig_catalog_str)
if not orig_catalog_str.endswith(','):
    out.append(',\n')
else:
    out.append('\n')

orig_keys = set(re.findall(r'^\s\s([一-龯]):\s*\{', orig_catalog_str, re.MULTILINE))
seen_chars = set(orig_keys)
print(f"Original entries in catalog: {len(seen_chars)} ({', '.join(sorted(seen_chars))})")

kata_re = re.compile(r'^[\u30A0-\u30FF\u30FC\s]+$')
hira_re = re.compile(r'^[\u3040-\u309F\u30FC\u30FB\s]+$')

for k in curated_items:
    ch = k['char']
    if ch in seen_chars:
        continue
    seen_chars.add(ch)

    # Validate pure phonetics & burmese
    for o in k['onyomi']:
        if not kata_re.match(o):
            raise ValueError(f"Invalid onyomi in {ch}: {o}")
    for ku in k['kunyomi']:
        if not hira_re.match(ku):
            raise ValueError(f"Invalid kunyomi in {ch}: {ku}")
    if not k['meaningMy']:
        raise ValueError(f"Missing meaningMy in {ch}")

    ch_esc = ch.replace("'", "\\'")
    lvl = k['level']
    st = k['strokes']
    rad = k['radical'].replace("'", "\\'")
    rad_n = k['radicalName'].replace("'", "\\'")
    rad_m = k['radicalMeaning'].replace("'", "\\'")
    en = k['meaningEn'].replace("'", "\\'")
    my = k['meaningMy'].replace("'", "\\'")
    
    on_str = ", ".join(f"'{o}'" for o in k['onyomi'])
    kun_str = ", ".join(f"'{ku}'" for ku in k['kunyomi'])
    
    examples_str = ""
    for ex in k['examples']:
        w = ex[0].replace("'", "\\'")
        r = ex[1].replace("'", "\\'")
        e_en = ex[2].replace("'", "\\'")
        e_my = ex[3].replace("'", "\\'")
        s_ja = f"{w}を用いた例文。"
        s_en = f"Example sentence using {w}."
        examples_str += f"""      {{
        word: '{w}',
        reading: '{r}',
        meaningEn: '{e_en}',
        meaningMy: '{e_my}',
        sentenceJa: '{s_ja}',
        sentenceEn: '{s_en}',
      }},
"""

    out.append(f"""  {ch_esc}: {{
    char: '{ch_esc}',
    level: '{lvl}',
    strokes: {st},
    radical: '{rad}',
    radicalName: '{rad_n}',
    radicalMeaning: '{rad_m}',
    components: [
      {{ char: '{rad}', name: '{rad_n}', meaningEn: '{rad_m}' }},
    ],
    onyomi: [{on_str}],
    kunyomi: [{kun_str}],
    meaningEn: '{en}',
    meaningMy: '{my}',
    examples: [
{examples_str}    ],
  }},
""")

out.append("};\n\n")
out.append(bottom_helpers)

with open('src/domain/dictionary/kanji-catalog.ts', 'w', encoding='utf-8') as f:
    f.writelines(out)

print(f"Successfully generated kanji-catalog.ts with {len(seen_chars)} curated kanji!")
