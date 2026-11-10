import glob, json

def get_pack_kanji(level):
    packs = sorted(glob.glob(f'content/packs/{level}/*.json'))
    res = {}
    for p in packs:
        d = json.load(open(p, encoding='utf-8'))
        for k in d.get('kanjis', []):
            ch = k.get('char') or k.get('kanji')
            if ch:
                res[ch] = k
    return res

n5_pack = get_pack_kanji('n5')
n4_pack = get_pack_kanji('n4')
n3_pack = get_pack_kanji('n3')
n2_pack = get_pack_kanji('n2')

print(f"Pack kanji: N5={len(n5_pack)}, N4={len(n4_pack)}, N3={len(n3_pack)}, N2={len(n2_pack)}")
