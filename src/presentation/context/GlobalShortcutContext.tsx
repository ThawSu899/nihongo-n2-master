import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react';

export type ShortcutAction =
  // Core Drill & Study
  | 'PLAY_AUDIO'
  | 'NEXT_ITEM'
  | 'PREV_ITEM'
  | 'SUBMIT_ANSWER'
  | 'SELECT_CHOICE_1'
  | 'SELECT_CHOICE_2'
  | 'SELECT_CHOICE_3'
  | 'SELECT_CHOICE_4'
  | 'TOGGLE_HINT'

  // Flashcards & SRS
  | 'FLIP_CARD'
  | 'SRS_AGAIN'
  | 'SRS_HARD'
  | 'SRS_GOOD'
  | 'SRS_EASY'

  // Shadowing & Audio Studio
  | 'TOGGLE_LOOP'
  | 'NEXT_TURN'
  | 'PREV_TURN'
  | 'SPEED_CYCLE'
  | 'DELAY_CYCLE'

  // Reading (Dokkai)
  | 'CYCLE_MARKER'
  | 'JUMP_EVIDENCE'
  | 'TOGGLE_TRANSLATION'

  // Global & Modals
  | 'COMMAND_PALETTE'
  | 'CLOSE_MODAL';

export interface ShortcutMetadata {
  id: ShortcutAction;
  nameEn: string;
  nameMy: string;
  descriptionEn: string;
  descriptionMy: string;
  category: 'study' | 'choices' | 'srs' | 'shadowing' | 'dokkai' | 'global';
  defaultKeys: string[];
  defaultBadge: string;
}

export const SHORTCUT_REGISTRY: Record<ShortcutAction, ShortcutMetadata> = {
  PLAY_AUDIO: {
    id: 'PLAY_AUDIO',
    nameEn: 'Play Native Audio',
    nameMy: 'ဂျပန်အသံထွက် နားထောင်မည်',
    descriptionEn: 'Plays or replays current word, sentence, or question prompt audio',
    descriptionMy: 'လက်ရှိ ဝေါဟာရ၊ ဝါကျ သို့မဟုတ် မေးခွန်း၏ ဂျပန်အသံထွက်ကို ဖွင့်ပြသည်',
    category: 'study',
    defaultKeys: ['Space', 'KeyR'],
    defaultBadge: 'Space',
  },
  NEXT_ITEM: {
    id: 'NEXT_ITEM',
    nameEn: 'Next Item / Proceed',
    nameMy: 'နောက်တစ်ခုသို့ ဆက်သွားမည်',
    descriptionEn: 'Advances to the next vocabulary card, sentence, or question',
    descriptionMy: 'နောက်ဝေါဟာရ၊ ဝါကျ သို့မဟုတ် မေးခွန်းသို့ ဆက်လက်ကူးပြောင်းသည်',
    category: 'study',
    defaultKeys: ['Enter', 'ArrowRight'],
    defaultBadge: 'Enter ↵',
  },
  PREV_ITEM: {
    id: 'PREV_ITEM',
    nameEn: 'Previous Item',
    nameMy: 'ရှေ့တစ်ခုသို့ ပြန်သွားမည်',
    descriptionEn: 'Navigates back to preceding card or question',
    descriptionMy: 'ရှေ့ဝေါဟာရကတ် သို့မဟုတ် မေးခွန်းဆီသို့ ပြန်သွားသည်',
    category: 'study',
    defaultKeys: ['ArrowLeft'],
    defaultBadge: '←',
  },
  SUBMIT_ANSWER: {
    id: 'SUBMIT_ANSWER',
    nameEn: 'Check / Submit Answer',
    nameMy: 'အဖြေစစ်ဆေးမည်',
    descriptionEn: 'Submits selected choice or checks typed recall input',
    descriptionMy: 'ရွေးချယ်ထားသော အဖြေ သို့မဟုတ် ရိုက်ထည့်ထားသော စာလုံးကို စစ်ဆေးသည်',
    category: 'study',
    defaultKeys: ['Enter'],
    defaultBadge: 'Enter ↵',
  },
  SELECT_CHOICE_1: {
    id: 'SELECT_CHOICE_1',
    nameEn: 'Select Option 1',
    nameMy: 'ရွေးချယ်စရာ ၁ ကို ရွေးမည်',
    descriptionEn: 'Selects the first multiple choice option',
    descriptionMy: 'နံပါတ် ၁ ရွေးချယ်စရာ အဖြေကို ရွေးချယ်သည်',
    category: 'choices',
    defaultKeys: ['Digit1', '1', 'Numpad1'],
    defaultBadge: '1',
  },
  SELECT_CHOICE_2: {
    id: 'SELECT_CHOICE_2',
    nameEn: 'Select Option 2',
    nameMy: 'ရွေးချယ်စရာ ၂ ကို ရွေးမည်',
    descriptionEn: 'Selects the second multiple choice option',
    descriptionMy: 'နံပါတ် ၂ ရွေးချယ်စရာ အဖြေကို ရွေးချယ်သည်',
    category: 'choices',
    defaultKeys: ['Digit2', '2', 'Numpad2'],
    defaultBadge: '2',
  },
  SELECT_CHOICE_3: {
    id: 'SELECT_CHOICE_3',
    nameEn: 'Select Option 3',
    nameMy: 'ရွေးချယ်စရာ ၃ ကို ရွေးမည်',
    descriptionEn: 'Selects the third multiple choice option',
    descriptionMy: 'နံပါတ် ၃ ရွေးချယ်စရာ အဖြေကို ရွေးချယ်သည်',
    category: 'choices',
    defaultKeys: ['Digit3', '3', 'Numpad3'],
    defaultBadge: '3',
  },
  SELECT_CHOICE_4: {
    id: 'SELECT_CHOICE_4',
    nameEn: 'Select Option 4',
    nameMy: 'ရွေးချယ်စရာ ၄ ကို ရွေးမည်',
    descriptionEn: 'Selects the fourth multiple choice option',
    descriptionMy: 'နံပါတ် ၄ ရွေးချယ်စရာ အဖြေကို ရွေးချယ်သည်',
    category: 'choices',
    defaultKeys: ['Digit4', '4', 'Numpad4'],
    defaultBadge: '4',
  },
  TOGGLE_HINT: {
    id: 'TOGGLE_HINT',
    nameEn: 'Toggle Hint',
    nameMy: 'အရိပ်အမြွက် ကြည့်မည်',
    descriptionEn: 'Reveals the hint or grammar tip for the active question',
    descriptionMy: 'မေးခွန်းအတွက် အရိပ်အမြွက် သို့မဟုတ် သဒ္ဒါသတိပြုစရာကို ဖော်ပြသည်',
    category: 'study',
    defaultKeys: ['KeyH', 'h'],
    defaultBadge: 'H',
  },
  FLIP_CARD: {
    id: 'FLIP_CARD',
    nameEn: 'Flip Flashcard',
    nameMy: 'ကတ်ကို လှန်ကြည့်မည်',
    descriptionEn: 'Flips SRS card to reveal answer and pronunciation',
    descriptionMy: 'အဖြေနှင့် အသံထွက်ကို ကြည့်ရှုရန် ကတ်ကို လှန်ပြသည်',
    category: 'srs',
    defaultKeys: ['Space'],
    defaultBadge: 'Space',
  },
  SRS_AGAIN: {
    id: 'SRS_AGAIN',
    nameEn: 'SRS: Again (Failed)',
    nameMy: 'SRS: မမှတ်မိပါ (ပြန်လည်လေ့ကျင့်)',
    descriptionEn: 'Rates card as failed; resets SRS interval',
    descriptionMy: 'ကတ်ကို မှားယွင်းကြောင်း သတ်မှတ်ပြီး ထပ်မံလေ့ကျင့်ရန် စီစဉ်သည်',
    category: 'srs',
    defaultKeys: ['Digit1', '1', 'Numpad1'],
    defaultBadge: '1',
  },
  SRS_HARD: {
    id: 'SRS_HARD',
    nameEn: 'SRS: Hard',
    nameMy: 'SRS: ခက်ခဲပါသည်',
    descriptionEn: 'Rates card as difficult with shorter interval multiplier',
    descriptionMy: 'ခက်ခဲစွာ မှတ်မိသဖြင့် ရက်တိုအတွင်း ထပ်မံစစ်ဆေးရန် သတ်မှတ်သည်',
    category: 'srs',
    defaultKeys: ['Digit2', '2', 'Numpad2'],
    defaultBadge: '2',
  },
  SRS_GOOD: {
    id: 'SRS_GOOD',
    nameEn: 'SRS: Good (Passed)',
    nameMy: 'SRS: ကောင်းမွန်ပါသည်',
    descriptionEn: 'Standard successful recall; expands interval normally',
    descriptionMy: 'ပုံမှန် မှတ်မိသဖြင့် ကြားကာလကို စနစ်တကျ တိုးမြှင့်သည်',
    category: 'srs',
    defaultKeys: ['Digit3', '3', 'Numpad3'],
    defaultBadge: '3',
  },
  SRS_EASY: {
    id: 'SRS_EASY',
    nameEn: 'SRS: Easy',
    nameMy: 'SRS: အလွန်လွယ်ကူပါသည်',
    descriptionEn: 'Effortless recall; applies ease bonus to review interval',
    descriptionMy: 'အလွန်လွယ်ကူစွာ မှတ်မိသဖြင့် ကြားကာလကို ပိုမိုတိုးမြှင့်သည်',
    category: 'srs',
    defaultKeys: ['Digit4', '4', 'Numpad4'],
    defaultBadge: '4',
  },
  TOGGLE_LOOP: {
    id: 'TOGGLE_LOOP',
    nameEn: 'Toggle Shadowing Loop',
    nameMy: 'အသံဆက်တိုက် ဖွင့်/ပိတ်မည်',
    descriptionEn: 'Starts or pauses continuous shadowing loop studio mode',
    descriptionMy: 'စကားပြောအသံကို ဆက်တိုက် အလှည့်ကျ ဖွင့်ပြသည့်စနစ်ကို စတင်/ခေတ္တရပ်သည်',
    category: 'shadowing',
    defaultKeys: ['Space', 'KeyL'],
    defaultBadge: 'Space',
  },
  NEXT_TURN: {
    id: 'NEXT_TURN',
    nameEn: 'Next Dialogue Turn',
    nameMy: 'နောက်စကားပြော အလှည့်',
    descriptionEn: 'Moves to next dialogue turn in shadowing practice',
    descriptionMy: 'လိုက်ဆိုလေ့ကျင့်ခန်းတွင် နောက်စကားပြောအလှည့်ဆီ ကူးပြောင်းသည်',
    category: 'shadowing',
    defaultKeys: ['ArrowDown'],
    defaultBadge: '↓',
  },
  PREV_TURN: {
    id: 'PREV_TURN',
    nameEn: 'Previous Dialogue Turn',
    nameMy: 'ရှေ့စကားပြော အလှည့်',
    descriptionEn: 'Moves to previous dialogue turn in shadowing practice',
    descriptionMy: 'လိုက်ဆိုလေ့ကျင့်ခန်းတွင် ရှေ့စကားပြောအလှည့်ဆီ ပြန်သွားသည်',
    category: 'shadowing',
    defaultKeys: ['ArrowUp'],
    defaultBadge: '↑',
  },
  SPEED_CYCLE: {
    id: 'SPEED_CYCLE',
    nameEn: 'Cycle Playback Speed',
    nameMy: 'အသံအမြန်နှုန်း အဆင့်ပြောင်းမည်',
    descriptionEn: 'Cycles TTS playback speed between 0.75x, 1.0x, 1.25x, and 1.5x',
    descriptionMy: 'အသံဖွင့်နှုန်းကို ၀.၇၅ဆ၊ ၁ဆ၊ ၁.၂၅ဆ၊ ၁.၅ဆ သို့ ပြောင်းလဲသည်',
    category: 'shadowing',
    defaultKeys: ['KeyS', 's'],
    defaultBadge: 'S',
  },
  DELAY_CYCLE: {
    id: 'DELAY_CYCLE',
    nameEn: 'Cycle Turn Delay',
    nameMy: 'စကားပြောကြားကာလ ပြောင်းမည်',
    descriptionEn: 'Cycles shadowing turn pause interval between 1s, 2s, and 3s',
    descriptionMy: 'စကားပြောအလှည့်ကြား စောင့်ဆိုင်းချိန် ၁စက္ကန့်၊ ၂စက္ကန့်၊ ၃စက္ကန့် ပြောင်းသည်',
    category: 'shadowing',
    defaultKeys: ['KeyD', 'd'],
    defaultBadge: 'D',
  },
  CYCLE_MARKER: {
    id: 'CYCLE_MARKER',
    nameEn: 'Cycle Reading Marker Tool',
    nameMy: 'စာပိုဒ်မီးမောင်းထိုး ဘောပင်ပြောင်းမည်',
    descriptionEn: 'Cycles between Claim, Evidence, Contrast, and Eraser marker highlighters',
    descriptionMy: 'သဘောထား၊ အထောက်အထား၊ ဆန့်ကျင်ဘက်နှင့် ဖျက်ဆေးများအကြား ပြောင်းသည်',
    category: 'dokkai',
    defaultKeys: ['KeyM', 'm'],
    defaultBadge: 'M',
  },
  JUMP_EVIDENCE: {
    id: 'JUMP_EVIDENCE',
    nameEn: 'Jump to Evidence in Text',
    nameMy: 'အထောက်အထားနေရာသို့ သွားမည်',
    descriptionEn: 'Scrolls passage directly to the linked question clue',
    descriptionMy: 'မေးခွန်း၏ အဖြေပါရှိသော စာပိုဒ်နေရာသို့ တိုက်ရိုက် ရွေ့လျားပြသည်',
    category: 'dokkai',
    defaultKeys: ['KeyJ', 'j'],
    defaultBadge: 'J',
  },
  TOGGLE_TRANSLATION: {
    id: 'TOGGLE_TRANSLATION',
    nameEn: 'Toggle Translation Overlay',
    nameMy: 'ဘာသာပြန်စာသား ဖွင့်/ပိတ်မည်',
    descriptionEn: 'Shows or hides Burmese / English passage translation assistance',
    descriptionMy: 'မြန်မာ/အင်္ဂလိပ် ဘာသာပြန်အကူအညီကို ဖွင့်ပြခြင်း သို့မဟုတ် ဖုံးကွယ်ခြင်း',
    category: 'dokkai',
    defaultKeys: ['KeyT', 't'],
    defaultBadge: 'T',
  },
  COMMAND_PALETTE: {
    id: 'COMMAND_PALETTE',
    nameEn: 'Open Command Palette / Search',
    nameMy: 'ရှာဖွေရေး အကွက်ဖွင့်မည်',
    descriptionEn: 'Opens instant dictionary search and quick navigation',
    descriptionMy: 'အဘိဓာန်နှင့် ပင်မလုပ်ဆောင်ချက်များ ရှာဖွေရေးကို ချက်ချင်းဖွင့်သည်',
    category: 'global',
    defaultKeys: ['Slash', '/'],
    defaultBadge: '/',
  },
  CLOSE_MODAL: {
    id: 'CLOSE_MODAL',
    nameEn: 'Close Modal / Dismiss Drawer',
    nameMy: 'အကွက်/စာမျက်နှာ ပိတ်မည်',
    descriptionEn: 'Dismisses active popup modal, drawer, or search window',
    descriptionMy: 'ဖွင့်ထားသော မော်ဒယ်အကွက် သို့မဟုတ် အံဆွဲကို ပိတ်သိမ်းသည်',
    category: 'global',
    defaultKeys: ['Escape'],
    defaultBadge: 'Esc',
  },
};

export const DEFAULT_KEY_BINDINGS: Record<ShortcutAction, string[]> = Object.fromEntries(
  Object.entries(SHORTCUT_REGISTRY).map(([action, meta]) => [action, [...meta.defaultKeys]])
) as Record<ShortcutAction, string[]>;

const STORAGE_KEY = 'nihongo_custom_shortcuts_v1';

export interface ScopedRegistration {
  scopeId: string;
  handlers: Partial<Record<ShortcutAction, (e: KeyboardEvent) => void | boolean>>;
  priority: number;
  allowInInputs?: boolean;
}

export interface GlobalShortcutContextValue {
  keyBindings: Record<ShortcutAction, string[]>;
  updateKeyBinding: (action: ShortcutAction, newKeys: string[]) => void;
  resetAllBindings: () => void;
  getDisplayBadge: (action: ShortcutAction) => string;
  registerScope: (reg: ScopedRegistration) => void;
  unregisterScope: (scopeId: string) => void;
  registerModal: (modalId: string) => void;
  unregisterModal: (modalId: string) => void;
  isModalActive: boolean;
}

const GlobalShortcutContext = createContext<GlobalShortcutContextValue | null>(null);

export interface GlobalShortcutProviderProps {
  children: ReactNode;
}

export const GlobalShortcutProvider: React.FC<GlobalShortcutProviderProps> = ({ children }) => {
  // Load custom bindings or fallback to defaults
  const [keyBindings, setKeyBindings] = useState<Record<ShortcutAction, string[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_KEY_BINDINGS, ...parsed };
      }
    } catch {
      // Fallback on parse failure
    }
    return DEFAULT_KEY_BINDINGS;
  });

  // Modal / Drawer stack registry
  const [modalStack, setModalStack] = useState<string[]>([]);
  const isModalActive = modalStack.length > 0;

  // Active scopes registered by mounting screens & components
  const scopesRef = useRef<Map<string, ScopedRegistration>>(new Map());

  const registerScope = useCallback((reg: ScopedRegistration) => {
    scopesRef.current.set(reg.scopeId, reg);
  }, []);

  const unregisterScope = useCallback((scopeId: string) => {
    scopesRef.current.delete(scopeId);
  }, []);

  const registerModal = useCallback((modalId: string) => {
    setModalStack((prev) => (prev.includes(modalId) ? prev : [...prev, modalId]));
  }, []);

  const unregisterModal = useCallback((modalId: string) => {
    setModalStack((prev) => prev.filter((id) => id !== modalId));
  }, []);

  const updateKeyBinding = useCallback((action: ShortcutAction, newKeys: string[]) => {
    setKeyBindings((prev) => {
      const updated = { ...prev, [action]: newKeys };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Handle storage write limit
      }
      return updated;
    });
  }, []);

  const resetAllBindings = useCallback(() => {
    setKeyBindings(DEFAULT_KEY_BINDINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Format visual badge for any action
  const getDisplayBadge = useCallback(
    (action: ShortcutAction): string => {
      const boundKeys = keyBindings[action] || DEFAULT_KEY_BINDINGS[action] || [];
      if (boundKeys.length === 0) return SHORTCUT_REGISTRY[action]?.defaultBadge || '';

      const firstKey = boundKeys[0];
      if (firstKey === 'Space') return 'Space';
      if (firstKey === 'Enter') return 'Enter ↵';
      if (firstKey === 'ArrowLeft') return '←';
      if (firstKey === 'ArrowRight') return '→';
      if (firstKey === 'ArrowUp') return '↑';
      if (firstKey === 'ArrowDown') return '↓';
      if (firstKey === 'Escape') return 'Esc';
      if (firstKey.startsWith('Key')) return firstKey.slice(3);
      if (firstKey.startsWith('Digit')) return firstKey.slice(5);
      if (firstKey === 'Slash') return '/';
      return firstKey;
    },
    [keyBindings]
  );

  // Single centralized window keydown listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Guard Japanese IME composition
      if (e.isComposing || e.keyCode === 229) {
        return;
      }

      // 2. Identify active target element
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.getAttribute('data-shortcut-ignore') === 'true');

      // 3. Modal Layer Guard: when modal/drawer is open, only allow Escape
      if (modalStack.length > 0) {
        if (e.key === 'Escape' || e.code === 'Escape') {
          // Dispatch to any registered close handlers or pop top modal
          const topModal = modalStack[modalStack.length - 1];
          if (topModal) {
            unregisterModal(topModal);
          }
        }
        return;
      }

      // 4. Find matching action(s) for the current key event
      const matchedActions: ShortcutAction[] = [];
      const eventCode = e.code;
      const eventKey = e.key;

      for (const [actionName, keys] of Object.entries(keyBindings)) {
        const action = actionName as ShortcutAction;
        const matches = keys.some((k) => {
          if (k === eventCode || k === eventKey) return true;
          // Case-insensitive letter matching (e.g. 'KeyR' or 'r')
          if (k.startsWith('Key') && k.slice(3).toLowerCase() === eventKey.toLowerCase()) return true;
          if (k.startsWith('Digit') && k.slice(5) === eventKey) return true;
          return false;
        });

        if (matches) {
          matchedActions.push(action);
        }
      }

      if (matchedActions.length === 0) return;

      // 5. Gather all active scopes sorted by descending priority
      const sortedScopes = Array.from(scopesRef.current.values()).sort(
        (a, b) => b.priority - a.priority
      );

      // 6. Dispatch action through priority hierarchy
      for (const action of matchedActions) {
        for (const scope of sortedScopes) {
          const handler = scope.handlers[action];
          if (!handler) continue;

          // If in input field, only execute handlers that explicitly allow inputs (e.g. Enter to submit)
          if (isInput && !scope.allowInInputs) {
            continue;
          }

          // Special case: prevent spacebar scroll
          if (eventCode === 'Space') {
            e.preventDefault();
          }

          const handled = handler(e);
          // If handler returned false, pass through; otherwise consume event
          if (handled !== false) {
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyBindings, modalStack, unregisterModal]);

  const value = useMemo<GlobalShortcutContextValue>(
    () => ({
      keyBindings,
      updateKeyBinding,
      resetAllBindings,
      getDisplayBadge,
      registerScope,
      unregisterScope,
      registerModal,
      unregisterModal,
      isModalActive,
    }),
    [
      keyBindings,
      updateKeyBinding,
      resetAllBindings,
      getDisplayBadge,
      registerScope,
      unregisterScope,
      registerModal,
      unregisterModal,
      isModalActive,
    ]
  );

  return (
    <GlobalShortcutContext.Provider value={value}>
      {children}
    </GlobalShortcutContext.Provider>
  );
};

export const FALLBACK_SHORTCUT_CONTEXT: GlobalShortcutContextValue = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  updateKeyBinding: () => {},
  resetAllBindings: () => {},
  getDisplayBadge: (action: ShortcutAction) => SHORTCUT_REGISTRY[action]?.defaultBadge || '',
  registerScope: () => {},
  unregisterScope: () => {},
  registerModal: () => {},
  unregisterModal: () => {},
  isModalActive: false,
};

export const useGlobalShortcuts = (): GlobalShortcutContextValue => {
  try {
    const ctx = useContext(GlobalShortcutContext);
    return ctx || FALLBACK_SHORTCUT_CONTEXT;
  } catch {
    return FALLBACK_SHORTCUT_CONTEXT;
  }
};

/**
 * Declarative hook for screens & components to register scoped shortcut handlers.
 * Automatically cleans up on unmount.
 */
export function useScopedShortcuts(registration: {
  scopeId: string;
  handlers: Partial<Record<ShortcutAction, (e: KeyboardEvent) => void | boolean>>;
  priority?: number;
  allowInInputs?: boolean;
  enabled?: boolean;
}) {
  const { registerScope, unregisterScope } = useGlobalShortcuts();
  const { scopeId, handlers, priority = 0, allowInInputs = false, enabled = true } = registration;

  // Keep latest handlers ref to avoid re-subscribing on inline closures
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) {
      unregisterScope(scopeId);
      return;
    }

    registerScope({
      scopeId,
      handlers: handlersRef.current,
      priority,
      allowInInputs,
    });

    return () => {
      unregisterScope(scopeId);
    };
  }, [scopeId, priority, allowInInputs, enabled, registerScope, unregisterScope]);

  // Update handlers ref on each render
  useEffect(() => {
    if (enabled) {
      registerScope({
        scopeId,
        handlers: handlersRef.current,
        priority,
        allowInInputs,
      });
    }
  });
}
