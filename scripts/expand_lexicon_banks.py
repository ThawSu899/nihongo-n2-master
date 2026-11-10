# -*- coding: utf-8 -*-
"""
Expands N4, N3, and N2 banks with high-frequency authentic words to guarantee 100% zero-overlap across all 174 packs.
"""
import sys, re
sys.path.insert(0, 'scripts/lexicon')

from n4_data import get_n4_words
from n3_data import get_n3_words
from n2_data import get_n2_words
from n2_expander import get_more_n2_words
from n2_massive_bank import get_n2_massive
from n2_supplemental import get_n2_supplemental
from n2_extra_bank import get_n2_extra
from n2_extra_bank2 import get_n2_extra2

print("Checking existing bank counts...")
