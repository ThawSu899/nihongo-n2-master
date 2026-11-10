import glob, json, sys, re
sys.path.insert(0, 'scripts/lexicon')
from n2_data import get_n2_words
from n2_expander import get_more_n2_words
from n2_massive_bank import get_n2_massive
from n2_supplemental import get_n2_supplemental
from n2_extra_bank import get_n2_extra

files = sorted(glob.glob('content/packs/n2/*.json'))
core_set = set()
for f in files:
    data = json.load(open(f, encoding='utf-8'))
    for v in data.get('vocabularies', [])[:12]:
        core_set.add(f"{v.get('ja','')}:{v.get('kana','')}")

all_n2 = get_n2_words() + get_more_n2_words() + get_n2_massive() + get_n2_supplemental() + get_n2_extra()
bank_set = set(f"{w['ja']}:{w['kana']}" for w in all_n2)
non_core = bank_set - core_set

bad_kana = []
for w in all_n2:
    if not re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s]+$', w['kana']):
        bad_kana.append((w['ja'], w['kana']))

print(f"N2: Total bank = {len(bank_set)}, Core = {len(core_set)}, Bank non-core = {len(non_core)}, Needed slots = {60*18}")
print(f"Bad kana: {len(bad_kana)}")
if bad_kana:
    print("Bad items:", bad_kana[:5])
