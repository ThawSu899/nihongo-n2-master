import glob, json, sys, re
sys.path.insert(0, 'scripts/lexicon')
from generate_banks_data import get_n5_words
from n4_data import get_n4_words
from n3_data import get_n3_words
from n2_data import get_n2_words
from n2_expander import get_more_n2_words
from n2_massive_bank import get_n2_massive
from n2_supplemental import get_n2_supplemental
from n2_extra_bank import get_n2_extra
from n2_extra_bank2 import get_n2_extra2

levels = {
    'n5': (get_n5_words(), 30, 30*18),
    'n4': (get_n4_words(), 36, 36*18),
    'n3': (get_n3_words(), 48, 48*18),
    'n2': (get_n2_words() + get_more_n2_words() + get_n2_massive() + get_n2_supplemental() + get_n2_extra() + get_n2_extra2(), 60, 60*18),
}

kana_regex = re.compile(r'^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s]+$')

for lvl, (bank, pack_count, needed_slots) in levels.items():
    files = sorted(glob.glob(f'content/packs/{lvl}/*.json'))
    assert len(files) == pack_count, f"{lvl} expected {pack_count} packs, got {len(files)}"
    core_set = set()
    for f in files:
        data = json.load(open(f, encoding='utf-8'))
        for v in data.get('vocabularies', [])[:12]:
            core_set.add(f"{v.get('ja','')}:{v.get('kana','')}")

    bank_set = set(f"{w['ja']}:{w['kana']}" for w in bank)
    non_core = bank_set - core_set
    bad_kana = [w for w in bank if not kana_regex.match(w['kana'])]

    print(f"=== {lvl.upper()} ===")
    print(f"Total Bank Items: {len(bank)}")
    print(f"Unique Bank Items: {len(bank_set)}")
    print(f"Core Items in Packs: {len(core_set)}")
    print(f"Non-Core Bank Items: {len(non_core)} (Needed: {needed_slots})")
    print(f"Bad Kana Count: {len(bad_kana)}")
    assert len(non_core) >= needed_slots, f"{lvl} has {len(non_core)} non-core, needs {needed_slots}!"
    assert len(bad_kana) == 0, f"{lvl} has bad kana: {bad_kana}"

print("\nALL 4 JLPT LEVEL BANKS FULLY VERIFIED AND PASS ALL CONSTRAINTS!")
