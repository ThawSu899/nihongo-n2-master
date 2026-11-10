# -*- coding: utf-8 -*-
import json
import os
import re
import sys

sys.path.insert(0, 'scripts/lexicon')
from generate_banks_data import get_n5_words
from n4_data import get_n4_words
from n4_extra_bank import get_n4_extra_words
from n3_data import get_n3_words
from n3_extra_bank import get_n3_extra_words
from n2_data import get_n2_words
from n2_expander import get_more_n2_words
from n2_massive_bank import get_n2_massive
from n2_supplemental import get_n2_supplemental
from n2_extra_bank import get_n2_extra
from n2_extra_bank2 import get_n2_extra2
from n2_extra_bank3 import get_n2_extra3

def export_ts(filename, var_name, items):
    out = ["import { LexiconWord } from './types';\n\n", f"export const {var_name}: LexiconWord[] = [\n"]
    seen = set()
    deduped = []
    kana_regex = re.compile(r'^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s]+$')

    for it in items:
        key = f"{it['ja']}:{it['kana']}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)
        
        # Validate pure kana
        if not kana_regex.match(it['kana']):
            raise ValueError(f"Invalid kana in {it['ja']}: {it['kana']}")
            
        ja_escaped = it['ja'].replace("\\", "\\\\").replace("'", "\\'")
        kana_escaped = it['kana'].replace("\\", "\\\\").replace("'", "\\'")
        en_escaped = it['en'].replace("\\", "\\\\").replace("'", "\\'")
        my_escaped = it['my'].replace("\\", "\\\\").replace("'", "\\'")
        pos = it['pos']
        pp = it['pitchPattern']
        drop = it['dropIndex']
        out.append(f"  {{ ja: '{ja_escaped}', kana: '{kana_escaped}', en: '{en_escaped}', my: '{my_escaped}', pos: '{pos}', pitchPattern: '{pp}', dropIndex: {drop} }},\n")
    out.append("];\n")
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(out)
    print(f"Wrote {len(deduped)} words to {filename}")
    return deduped

if __name__ == '__main__':
    n5 = get_n5_words()
    export_ts('scripts/lexicon/n5-bank.ts', 'N5_SUPPLEMENTAL_BANK', n5)

    n4 = get_n4_words() + get_n4_extra_words()
    export_ts('scripts/lexicon/n4-bank.ts', 'N4_SUPPLEMENTAL_BANK', n4)

    n3 = get_n3_words() + get_n3_extra_words()
    export_ts('scripts/lexicon/n3-bank.ts', 'N3_SUPPLEMENTAL_BANK', n3)

    n2 = (get_n2_words() + get_more_n2_words() + get_n2_massive() +
          get_n2_supplemental() + get_n2_extra() + get_n2_extra2() + get_n2_extra3())
    export_ts('scripts/lexicon/n2-bank.ts', 'N2_SUPPLEMENTAL_BANK', n2)

    with open('scripts/lexicon/index.ts', 'w', encoding='utf-8') as f:
        f.write("""export * from './types';
export * from './n5-bank';
export * from './n4-bank';
export * from './n3-bank';
export * from './n2-bank';
""")
    print("All lexicon banks successfully built!")
