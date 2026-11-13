import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActiveRecallMaskState,
  cycleActiveRecallMask,
  loadSavedMaskState,
  saveMaskState,
  ACTIVE_RECALL_MASK_STORAGE_KEY,
} from '../src/presentation/components/ActiveRecallMaskingBar';

describe('Active Recall Masking Bar Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cycles smoothly through masking modes in the defined progression', () => {
    let state: ActiveRecallMaskState = {
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: false,
    };

    // 1. None active -> Hide Furigana (forces Kanji reading recall)
    state = cycleActiveRecallMask(state);
    expect(state).toEqual({
      hideFurigana: true,
      hideBurmese: false,
      hideKanji: false,
    });

    // 2. Hide Furigana -> Hide Burmese (forces meaning recall)
    state = cycleActiveRecallMask(state);
    expect(state).toEqual({
      hideFurigana: false,
      hideBurmese: true,
      hideKanji: false,
    });

    // 3. Hide Burmese -> Hide Kanji/Vocab (forces reverse recall)
    state = cycleActiveRecallMask(state);
    expect(state).toEqual({
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: true,
    });

    // 4. Hide Kanji -> Hide Furigana + Burmese
    state = cycleActiveRecallMask(state);
    expect(state).toEqual({
      hideFurigana: true,
      hideBurmese: true,
      hideKanji: false,
    });

    // 5. Hide Furigana + Burmese -> All off
    state = cycleActiveRecallMask(state);
    expect(state).toEqual({
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: false,
    });
  });

  it('correctly persists and recovers masking preferences from localStorage', () => {
    const targetState: ActiveRecallMaskState = {
      hideFurigana: true,
      hideBurmese: true,
      hideKanji: false,
    };

    saveMaskState(targetState);
    expect(localStorage.getItem(ACTIVE_RECALL_MASK_STORAGE_KEY)).toBe(
      JSON.stringify(targetState)
    );

    const loaded = loadSavedMaskState();
    expect(loaded).toEqual(targetState);
  });

  it('returns safe default all-off state when localStorage is empty or corrupt', () => {
    localStorage.removeItem(ACTIVE_RECALL_MASK_STORAGE_KEY);
    expect(loadSavedMaskState()).toEqual({
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: false,
    });

    localStorage.setItem(ACTIVE_RECALL_MASK_STORAGE_KEY, 'corrupt-json{');
    expect(loadSavedMaskState()).toEqual({
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: false,
    });
  });

  it('supports independent toggling of individual chips', () => {
    let state: ActiveRecallMaskState = {
      hideFurigana: false,
      hideBurmese: false,
      hideKanji: false,
    };

    // Toggle Furigana on
    state = { ...state, hideFurigana: !state.hideFurigana };
    expect(state.hideFurigana).toBe(true);

    // Toggle Burmese on independently
    state = { ...state, hideBurmese: !state.hideBurmese };
    expect(state.hideFurigana).toBe(true);
    expect(state.hideBurmese).toBe(true);

    // Toggle Furigana off while keeping Burmese on
    state = { ...state, hideFurigana: !state.hideFurigana };
    expect(state.hideFurigana).toBe(false);
    expect(state.hideBurmese).toBe(true);
  });
});
