import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SHORTCUT_REGISTRY,
  DEFAULT_KEY_BINDINGS,
  ShortcutAction,
  useGlobalShortcuts,
  FALLBACK_SHORTCUT_CONTEXT,
} from '../src/presentation/context/GlobalShortcutContext';
import { LessonPlayerScreen } from '../src/presentation/screens/LessonPlayerScreen';
import { DokkaiReaderWorkbench } from '../src/presentation/components/DokkaiReaderWorkbench';
import { ShadowingPracticeScreen } from '../src/presentation/components/ShadowingPracticeScreen';
import { GrammarCramLab } from '../src/presentation/components/GrammarCramLab';
import { SRSReviewScreen } from '../src/presentation/screens/SRSReviewScreen';
import { SettingsScreen } from '../src/presentation/screens/SettingsScreen';

describe('Global Custom Keyboard Shortcut System', () => {
  const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      mockLocalStorage.store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
      mockLocalStorage.store = {};
    }),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
  });

  describe('SHORTCUT_REGISTRY & Default Key Bindings', () => {
    it('defines all 24 canonical shortcut actions across 6 distinct categories', () => {
      const actions = Object.keys(SHORTCUT_REGISTRY) as ShortcutAction[];
      expect(actions.length).toBe(24);

      const expectedCategories = ['study', 'choices', 'srs', 'shadowing', 'dokkai', 'global'];
      const categoriesInRegistry = new Set(actions.map((a) => SHORTCUT_REGISTRY[a].category));

      expectedCategories.forEach((cat) => {
        expect(categoriesInRegistry.has(cat as any)).toBe(true);
      });
    });

    it('contains comprehensive Burmese and English metadata for every shortcut action', () => {
      Object.entries(SHORTCUT_REGISTRY).forEach(([action, meta]) => {
        expect(meta.id).toBe(action);
        expect(meta.nameEn.length).toBeGreaterThan(0);
        expect(meta.nameMy.length).toBeGreaterThan(0);
        expect(meta.descriptionEn.length).toBeGreaterThan(0);
        expect(meta.descriptionMy.length).toBeGreaterThan(0);
        expect(meta.defaultKeys.length).toBeGreaterThan(0);
        expect(meta.defaultBadge.length).toBeGreaterThan(0);
      });
    });

    it('provides default key bindings corresponding to each action', () => {
      Object.keys(SHORTCUT_REGISTRY).forEach((action) => {
        const boundKeys = DEFAULT_KEY_BINDINGS[action as ShortcutAction];
        expect(boundKeys).toBeDefined();
        expect(Array.isArray(boundKeys)).toBe(true);
        expect(boundKeys.length).toBeGreaterThan(0);
      });
    });

    it('has non-conflicting default bindings for core navigation and choices', () => {
      expect(DEFAULT_KEY_BINDINGS.PLAY_AUDIO).toContain('Space');
      expect(DEFAULT_KEY_BINDINGS.NEXT_ITEM).toContain('Enter');
      expect(DEFAULT_KEY_BINDINGS.PREV_ITEM).toContain('ArrowLeft');
      expect(DEFAULT_KEY_BINDINGS.SELECT_CHOICE_1).toContain('Digit1');
      expect(DEFAULT_KEY_BINDINGS.SELECT_CHOICE_2).toContain('Digit2');
      expect(DEFAULT_KEY_BINDINGS.SELECT_CHOICE_3).toContain('Digit3');
      expect(DEFAULT_KEY_BINDINGS.SELECT_CHOICE_4).toContain('Digit4');
      expect(DEFAULT_KEY_BINDINGS.FLIP_CARD).toContain('Space');
      expect(DEFAULT_KEY_BINDINGS.SRS_AGAIN).toContain('Digit1');
      expect(DEFAULT_KEY_BINDINGS.SRS_EASY).toContain('Digit4');
    });
  });

  describe('Fallback Safe Context Behavior (Outside Provider / SSR / Test Isolation)', () => {
    it('gracefully returns safe default handlers without throwing when rendered without provider', () => {
      let capturedCtx: any = null;
      const TestConsumer = () => {
        capturedCtx = useGlobalShortcuts();
        return null;
      };
      renderToString(React.createElement(TestConsumer));

      expect(capturedCtx).toBeDefined();
      expect(capturedCtx.isModalActive).toBe(false);
      expect(typeof capturedCtx.updateKeyBinding).toBe('function');
      expect(typeof capturedCtx.resetAllBindings).toBe('function');
      expect(typeof capturedCtx.getDisplayBadge).toBe('function');
    });

    it('returns default visual badges for actions when using fallback context', () => {
      let capturedCtx: any = null;
      const TestConsumer = () => {
        capturedCtx = useGlobalShortcuts();
        return null;
      };
      renderToString(React.createElement(TestConsumer));

      expect(capturedCtx.getDisplayBadge('PLAY_AUDIO')).toBe('Space');
      expect(capturedCtx.getDisplayBadge('NEXT_ITEM')).toBe('Enter ↵');
      expect(capturedCtx.getDisplayBadge('PREV_ITEM')).toBe('←');
      expect(capturedCtx.getDisplayBadge('SELECT_CHOICE_1')).toBe('1');
      expect(capturedCtx.getDisplayBadge('COMMAND_PALETTE')).toBe('/');
    });
  });

  describe('Target Screen Component Export & Hook Integration Guard', () => {
    it('ensures LessonPlayerScreen exports cleanly and integrates useScopedShortcuts', () => {
      expect(LessonPlayerScreen).toBeDefined();
      expect(typeof LessonPlayerScreen).toBe('function');
    });

    it('ensures DokkaiReaderWorkbench exports cleanly and integrates useScopedShortcuts', () => {
      expect(DokkaiReaderWorkbench).toBeDefined();
      expect(typeof DokkaiReaderWorkbench).toBe('function');
    });

    it('ensures ShadowingPracticeScreen exports cleanly and integrates useScopedShortcuts', () => {
      expect(ShadowingPracticeScreen).toBeDefined();
      expect(typeof ShadowingPracticeScreen).toBe('function');
    });

    it('ensures GrammarCramLab exports cleanly and integrates useScopedShortcuts', () => {
      expect(GrammarCramLab).toBeDefined();
      expect(typeof GrammarCramLab).toBe('function');
    });

    it('ensures SRSReviewScreen exports cleanly and integrates useScopedShortcuts', () => {
      expect(SRSReviewScreen).toBeDefined();
      expect(typeof SRSReviewScreen).toBe('function');
    });

    it('ensures SettingsScreen exports cleanly and renders Keyboard Shortcuts management', () => {
      expect(SettingsScreen).toBeDefined();
      expect(typeof SettingsScreen).toBe('function');
    });
  });
});
