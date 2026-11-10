# -*- coding: utf-8 -*-
import json
import os
import re

def clean_kana(k):
    return k.strip()

def export_ts(filename, var_name, items):
    out = ["import { LexiconWord } from './types';\n", f"export const {var_name}: LexiconWord[] = [\n"]
    seen = set()
    deduped = []
    for it in items:
        key = f"{it['ja']}:{it['kana']}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)
        
        # Validate pure kana
        if not re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s]+$', it['kana']):
            raise ValueError(f"Invalid kana in {it['ja']}: {it['kana']}")
            
        ja_escaped = it['ja'].replace("'", "\\'")
        kana_escaped = it['kana'].replace("'", "\\'")
        en_escaped = it['en'].replace("'", "\\'")
        my_escaped = it['my'].replace("'", "\\'")
        pos = it['pos']
        pp = it['pitchPattern']
        drop = it['dropIndex']
        out.append(f"  {{ ja: '{ja_escaped}', kana: '{kana_escaped}', en: '{en_escaped}', my: '{my_escaped}', pos: '{pos}', pitchPattern: '{pp}', dropIndex: {drop} }},\n")
    out.append("];\n")
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(out)
    print(f"Wrote {len(deduped)} words to {filename}")
    return deduped

print("Export utility defined.")
