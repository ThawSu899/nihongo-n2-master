import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUDIO_SPEED_STORAGE_KEY,
  BLIND_LISTENING_STORAGE_KEY,
  TTS_SPEED_PRESETS,
  play3xShadowingTts,
  sanitizePhoneticText,
} from '../src/domain/audio/tts-engine';

describe('Audio Shadowing & Multi-speed TTS Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('exports expected storage keys and multi-speed presets', () => {
    expect(AUDIO_SPEED_STORAGE_KEY).toBe('nihongo_audio_speed');
    expect(BLIND_LISTENING_STORAGE_KEY).toBe('nihongo_blind_listening_mode');

    expect(TTS_SPEED_PRESETS).toHaveLength(3);
    expect(TTS_SPEED_PRESETS[0]).toEqual({ rate: 0.75, label: '0.75x', labelBurmese: '0.75x နှေး' });
    expect(TTS_SPEED_PRESETS[1]).toEqual({ rate: 1.0, label: '1.0x', labelBurmese: '1.0x ပုံမှန်' });
    expect(TTS_SPEED_PRESETS[2]).toEqual({ rate: 1.2, label: '1.2x', labelBurmese: '1.2x မြန်' });
  });

  it('persists and restores audio preferences in localStorage', () => {
    localStorage.setItem(AUDIO_SPEED_STORAGE_KEY, '0.75');
    localStorage.setItem(BLIND_LISTENING_STORAGE_KEY, 'true');

    expect(localStorage.getItem(AUDIO_SPEED_STORAGE_KEY)).toBe('0.75');
    expect(localStorage.getItem(BLIND_LISTENING_STORAGE_KEY)).toBe('true');
  });

  it('executes 3-repetition shadowing loop with 1.5-second pause between iterations', () => {
    const iterations: number[] = [];
    let completed = false;

    // Mock window.speechSynthesis
    const speakMock = vi.fn();
    const cancelMock = vi.fn();

    const originalWindow = global.window;
    (global as any).window = {
      speechSynthesis: {
        speak: speakMock,
        cancel: cancelMock,
        paused: false,
        resume: vi.fn(),
        getVoices: () => [],
      },
      SpeechSynthesisUtterance: class {
        text: string;
        lang = 'ja-JP';
        rate = 1.0;
        pitch = 1.0;
        onstart?: () => void;
        onend?: () => void;
        onerror?: (e: any) => void;
        constructor(text: string) {
          this.text = text;
        }
      },
    };

    const controller = play3xShadowingTts(
      { ja: '猫', kana: 'ねこ' },
      {
        onEnd: () => {
          completed = true;
        },
      },
      (iter) => {
        iterations.push(iter);
      }
    );

    expect(iterations).toEqual([1]);
    expect(speakMock).toHaveBeenCalledTimes(1);

    // Simulate completion of iteration 1
    const utterance1 = speakMock.mock.calls[0][0];
    utterance1.onend?.();

    // Before 1.5 seconds, iteration 2 should not have started
    vi.advanceTimersByTime(1000);
    expect(iterations).toEqual([1]);

    // Advance remaining 500ms to hit 1500ms (1.5s pause)
    vi.advanceTimersByTime(500);
    expect(iterations).toEqual([1, 2]);
    expect(speakMock).toHaveBeenCalledTimes(2);

    // Simulate completion of iteration 2
    const utterance2 = speakMock.mock.calls[1][0];
    utterance2.onend?.();

    // Advance 1500ms for iteration 3
    vi.advanceTimersByTime(1500);
    expect(iterations).toEqual([1, 2, 3]);
    expect(speakMock).toHaveBeenCalledTimes(3);

    // Simulate completion of iteration 3
    const utterance3 = speakMock.mock.calls[2][0];
    utterance3.onend?.();

    expect(completed).toBe(true);

    (global as any).window = originalWindow;
  });

  it('allows premature cancellation of the 3x shadowing loop', () => {
    const iterations: number[] = [];
    const speakMock = vi.fn();
    const cancelMock = vi.fn();

    const originalWindow = global.window;
    (global as any).window = {
      speechSynthesis: {
        speak: speakMock,
        cancel: cancelMock,
        paused: false,
        resume: vi.fn(),
        getVoices: () => [],
      },
      SpeechSynthesisUtterance: class {
        text: string;
        onend?: () => void;
        constructor(text: string) {
          this.text = text;
        }
      },
    };

    const controller = play3xShadowingTts(
      '本を読む',
      {},
      (iter) => iterations.push(iter)
    );

    expect(iterations).toEqual([1]);
    const utterance1 = speakMock.mock.calls[0][0];
    utterance1.onend?.();

    // Cancel before 1.5s completes
    controller.cancel();
    expect(controller.isCancelled()).toBe(true);

    vi.advanceTimersByTime(2000);
    // Iteration 2 should not have run because it was cancelled
    expect(iterations).toEqual([1]);

    (global as any).window = originalWindow;
  });
});
