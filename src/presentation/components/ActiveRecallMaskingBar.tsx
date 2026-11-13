import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, RotateCcw } from 'lucide-react';

export interface ActiveRecallMaskState {
  hideFurigana: boolean;
  hideBurmese: boolean;
  hideKanji: boolean;
}

export const ACTIVE_RECALL_MASK_STORAGE_KEY = 'nihongo_active_recall_mask';

export function loadSavedMaskState(): ActiveRecallMaskState {
  if (typeof globalThis.localStorage === 'undefined') {
    return { hideFurigana: false, hideBurmese: false, hideKanji: false };
  }
  try {
    const raw = globalThis.localStorage.getItem(ACTIVE_RECALL_MASK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hideFurigana: Boolean(parsed.hideFurigana),
        hideBurmese: Boolean(parsed.hideBurmese),
        hideKanji: Boolean(parsed.hideKanji),
      };
    }
  } catch {
    // fallback
  }
  return { hideFurigana: false, hideBurmese: false, hideKanji: false };
}

export function saveMaskState(state: ActiveRecallMaskState): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  try {
    globalThis.localStorage.setItem(ACTIVE_RECALL_MASK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function cycleActiveRecallMask(current: ActiveRecallMaskState): ActiveRecallMaskState {
  // 1. None active -> Hide Furigana (forces Kanji reading recall)
  if (!current.hideFurigana && !current.hideBurmese && !current.hideKanji) {
    return { hideFurigana: true, hideBurmese: false, hideKanji: false };
  }
  // 2. Hide Furigana -> Hide Burmese (forces meaning recall)
  if (current.hideFurigana && !current.hideBurmese && !current.hideKanji) {
    return { hideFurigana: false, hideBurmese: true, hideKanji: false };
  }
  // 3. Hide Burmese -> Hide Kanji/Vocab (reverse recall)
  if (!current.hideFurigana && current.hideBurmese && !current.hideKanji) {
    return { hideFurigana: false, hideBurmese: false, hideKanji: true };
  }
  // 4. Hide Kanji -> Hide Furigana + Burmese
  if (!current.hideFurigana && !current.hideBurmese && current.hideKanji) {
    return { hideFurigana: true, hideBurmese: true, hideKanji: false };
  }
  // 5. Reset to all off
  return { hideFurigana: false, hideBurmese: false, hideKanji: false };
}

export interface ActiveRecallMaskingBarProps {
  maskState: ActiveRecallMaskState;
  onToggleFurigana: () => void;
  onToggleBurmese: () => void;
  onToggleKanji: () => void;
  onResetAll?: () => void;
  className?: string;
  sticky?: boolean;
}

export const ActiveRecallMaskingBar: React.FC<ActiveRecallMaskingBarProps> = ({
  maskState,
  onToggleFurigana,
  onToggleBurmese,
  onToggleKanji,
  onResetAll,
  className = '',
  sticky = true,
}) => {
  const isAnyMaskActive =
    maskState.hideFurigana || maskState.hideBurmese || maskState.hideKanji;

  return (
    <div
      className={`${
        sticky
          ? 'sticky top-0 z-20 backdrop-blur-md bg-white/95 dark:bg-zinc-900/95'
          : 'bg-white dark:bg-zinc-900'
      } border-y sm:border border-stone-200 dark:border-zinc-800 sm:rounded-2xl p-2.5 sm:p-3 shadow-xs transition-colors ${className}`}
      role="region"
      aria-label="Active Recall Masking Bar"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Title & Status */}
        <div className="flex items-center space-x-2">
          <span className="text-base select-none">🧠</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-stone-800 dark:text-zinc-100 font-myanmar">
              Active Recall Masking
            </span>
            <span className="text-[11px] text-stone-500 dark:text-zinc-400 font-myanmar hidden md:inline">
              (အလွတ်ပြန်လည်မှတ်မိခြင်း အကူ)
            </span>
          </div>

          {isAnyMaskActive && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
              Active
            </span>
          )}
        </div>

        {/* Toggle Chips */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Chip (a): Hide Furigana */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onToggleFurigana}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition cursor-pointer font-myanmar ${
              maskState.hideFurigana
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-semibold'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700'
            }`}
            title="Hide Furigana (ဖူရီဂါနာ ဖျောက်) — Forces Kanji reading recall"
          >
            {maskState.hideFurigana ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>Hide Furigana (ဖူရီဂါနာ ဖျောက်)</span>
          </motion.button>

          {/* Chip (b): Hide Burmese */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onToggleBurmese}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition cursor-pointer font-myanmar ${
              maskState.hideBurmese
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700'
            }`}
            title="Hide Burmese (မြန်မာအဓိပ္ပာယ် ဖျောက်) — Forces meaning recall; tap blurred text to reveal"
          >
            {maskState.hideBurmese ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>Hide Burmese (မြန်မာအဓိပ္ပာယ် ဖျောက်)</span>
          </motion.button>

          {/* Chip (c): Hide Kanji/Vocab */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onToggleKanji}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition cursor-pointer font-myanmar ${
              maskState.hideKanji
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700'
            }`}
            title="Hide Kanji/Vocab (ဂျပန်စာလုံး ဖျောက်) — Reverse recall from Burmese to Japanese production"
          >
            {maskState.hideKanji ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>Hide Kanji/Vocab (ဂျပန်စာလုံး ဖျောက်)</span>
          </motion.button>

          {/* Reset button when any active */}
          {isAnyMaskActive && onResetAll && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onResetAll}
              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700 transition cursor-pointer"
              title="အကုန်ပြန်ဖွင့်မည် (Reset all masks)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.button>
          )}

          {/* Shortcut Legend */}
          <div className="hidden lg:flex items-center space-x-1 pl-1 text-[11px] font-mono text-stone-500 dark:text-zinc-400">
            <span>Cycle:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 font-bold text-stone-700 dark:text-zinc-200">
              M
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
