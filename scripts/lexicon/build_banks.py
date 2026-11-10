# -*- coding: utf-8 -*-
"""
Unified JLPT Lexicon Bank Builder
Generates high-capacity, non-overlapping vocabulary banks for N5, N4, N3, and N2.
"""
import re
import json

def is_pure_kana(text):
    # Hiragana: 3040-309F, Katakana: 30A0-30FF, Prolonged sound mark: 30FC, middle dot: 30FB
    return bool(re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u30FC\u30FB\s]+$', text))

def calc_pitch(kana):
    # Default pitch heuristic if not explicitly set
    mora_count = len(re.sub(r'[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]', '', kana))
    if mora_count <= 2:
        return 'heiban', 0
    elif kana.endswith(('る', 'く', 'す', 'つ', 'ぬ', 'む', 'ぐ', 'ぶ')):
        return 'nakadaka', 2
    else:
        return 'heiban', 0

print("Lexicon builder helper ready.")
