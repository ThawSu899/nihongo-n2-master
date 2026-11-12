import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PWAUpdateBanner } from '../src/presentation/components/PWAUpdateBanner';
import { PWAUpdateManager } from '../src/services/pwa-update-manager';

describe('PWA Service Worker Update Notification & Lifecycle Suite', () => {
  let manager: PWAUpdateManager;
  const store: Record<string, string> = {};

  const fakeSessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };

  const originalSessionStorage = (global as any).sessionStorage;

  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).sessionStorage = fakeSessionStorage;
    fakeSessionStorage.clear();
    manager = PWAUpdateManager.getInstance();
    manager._resetForTesting();
  });

  afterEach(() => {
    manager._resetForTesting();
    fakeSessionStorage.clear();
    (global as any).sessionStorage = originalSessionStorage;
  });

  describe('1. PWAUpdateBanner UI Rendering & Theme Contrast', () => {
    it('renders null when no update is available', () => {
      expect(manager.getHasUpdate()).toBe(false);

      const html = renderToString(React.createElement(PWAUpdateBanner, { customManager: manager }));
      expect(html).toBe('');
    });

    it('renders the update banner with bilingual text, reload & dismiss buttons when update is available', () => {
      // Simulate waiting worker detected
      const mockWorker = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;

      manager.setWaitingWorker(mockWorker);
      expect(manager.getHasUpdate()).toBe(true);

      const html = renderToString(React.createElement(PWAUpdateBanner, { customManager: manager }));

      // Bilingual Title & Subtitle verification
      expect(html).toContain('Update Available • ဗားရှင်းအသစ် ရရှိနေပါပြီ');
      expect(html).toContain('A new version of Nihongo Master is ready. Reload to apply the latest fixes.');

      // Action buttons & data-testids
      expect(html).toContain('data-testid="pwa-update-reload-btn"');
      expect(html).toContain('Reload Now • အသစ်ပြောင်းမည်');
      expect(html).toContain('data-testid="pwa-update-dismiss-btn"');
      expect(html).toContain('Later • နောက်မှ');

      // High-contrast Light/Dark theme classes
      expect(html).toContain('bg-white dark:bg-zinc-900');
      expect(html).toContain('text-stone-900 dark:text-zinc-100');
      expect(html).toContain('text-stone-600 dark:text-zinc-400');
      expect(html).toContain('border-stone-200 dark:border-zinc-800');
    });

    it('renders top floating container preventing overlap with bottom-floating PWAInstallBanner', () => {
      const mockWorker = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;

      manager.setWaitingWorker(mockWorker);
      const html = renderToString(React.createElement(PWAUpdateBanner, { customManager: manager }));

      // Floating top positioning
      expect(html).toContain('fixed top-4');
      expect(html).toContain('z-50');
    });
  });

  describe('2. Reload Action & SKIP_WAITING Signaling', () => {
    it('dispatches { type: "SKIP_WAITING" } to waiting worker when applyUpdate is invoked', () => {
      const postMessageSpy = vi.fn();
      const mockWorker = {
        postMessage: postMessageSpy,
      } as unknown as ServiceWorker;

      manager.setWaitingWorker(mockWorker);
      expect(manager.getWaitingWorker()).toBe(mockWorker);

      manager.applyUpdate();

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('invokes updateSW callback if registered when applyUpdate is called', () => {
      const customUpdateSW = vi.fn().mockResolvedValue(undefined);
      manager.init(customUpdateSW);

      const mockWorker = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;

      manager.setWaitingWorker(mockWorker);
      manager.applyUpdate();

      expect(customUpdateSW).toHaveBeenCalledWith(true);
    });
  });

  describe('3. Dismissal Action & Session Persistence', () => {
    it('dismisses banner for the current session and records dismissal in sessionStorage', () => {
      const mockWorker = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;

      manager.setWaitingWorker(mockWorker);
      expect(manager.getHasUpdate()).toBe(true);

      manager.dismiss();

      expect(manager.isUpdateDismissed()).toBe(true);
      expect(manager.getHasUpdate()).toBe(false);
      expect(sessionStorage.getItem('nihongo_pwa_update_dismissed')).toBe('1');

      // Re-rendering banner after dismissal returns null
      const html = renderToString(React.createElement(PWAUpdateBanner, { customManager: manager }));
      expect(html).toBe('');
    });

    it('notifies subscribers upon dismissal', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.dismiss();

      expect(listener).toHaveBeenCalledWith(false);
      unsubscribe();
    });
  });

  describe('4. Service Worker Lifecycle & Offline Guardrails', () => {
    it('does NOT call registration.update() when navigator.onLine is false', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined);
      const mockReg = {
        update: updateSpy,
        addEventListener: vi.fn(),
      } as unknown as ServiceWorkerRegistration;

      manager.attachRegistration(mockReg);

      const originalNavigator = global.navigator;
      try {
        Object.defineProperty(global, 'navigator', {
          value: { onLine: false },
          configurable: true,
          writable: true,
        });

        await manager.checkForUpdates();
        expect(updateSpy).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      }
    });

    it('calls registration.update() when online', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined);
      const mockReg = {
        update: updateSpy,
        addEventListener: vi.fn(),
      } as unknown as ServiceWorkerRegistration;

      manager.attachRegistration(mockReg);

      const originalNavigator = global.navigator;
      try {
        Object.defineProperty(global, 'navigator', {
          value: { onLine: true },
          configurable: true,
          writable: true,
        });

        await manager.checkForUpdates();
        expect(updateSpy).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      }
    });

    it('detects waiting worker on registration attach when controller exists', () => {
      const mockWaitingWorker = { postMessage: vi.fn() } as unknown as ServiceWorker;
      const mockController = { postMessage: vi.fn() } as unknown as ServiceWorker;

      const originalNavigator = global.navigator;
      try {
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {
              controller: mockController,
            },
            onLine: true,
          },
          configurable: true,
          writable: true,
        });

        const mockReg = {
          waiting: mockWaitingWorker,
          addEventListener: vi.fn(),
        } as unknown as ServiceWorkerRegistration;

        manager.attachRegistration(mockReg);

        expect(manager.getHasUpdate()).toBe(true);
        expect(manager.getWaitingWorker()).toBe(mockWaitingWorker);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      }
    });

    it('detects update when updatefound fires and installing worker transitions to installed', () => {
      const mockController = { postMessage: vi.fn() } as unknown as ServiceWorker;
      let stateChangeHandler: (() => void) | null = null;
      let updateFoundHandler: (() => void) | null = null;

      const mockInstallingWorker = {
        state: 'installing',
        postMessage: vi.fn(),
        addEventListener: vi.fn().mockImplementation((event: string, handler: () => void) => {
          if (event === 'statechange') {
            stateChangeHandler = handler;
          }
        }),
      } as unknown as ServiceWorker;

      const mockReg = {
        installing: mockInstallingWorker,
        addEventListener: vi.fn().mockImplementation((event: string, handler: () => void) => {
          if (event === 'updatefound') {
            updateFoundHandler = handler;
          }
        }),
      } as unknown as ServiceWorkerRegistration;

      const originalNavigator = global.navigator;
      try {
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {
              controller: mockController,
            },
            onLine: true,
          },
          configurable: true,
          writable: true,
        });

        manager.attachRegistration(mockReg);
        expect(manager.getHasUpdate()).toBe(false);

        // Trigger updatefound
        if (updateFoundHandler) {
          (updateFoundHandler as () => void)();
        }

        // Worker transitions to 'installed'
        (mockInstallingWorker as any).state = 'installed';
        if (stateChangeHandler) {
          (stateChangeHandler as () => void)();
        }

        expect(manager.getHasUpdate()).toBe(true);
        expect(manager.getWaitingWorker()).toBe(mockInstallingWorker);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
      }
    });

    it('attaches controllerchange listener that triggers clean reload', () => {
      let controllerChangeHandler: (() => void) | null = null;
      const reloadMock = vi.fn();

      const originalNavigator = global.navigator;
      const originalWindow = global.window;

      try {
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {
              addEventListener: vi.fn().mockImplementation((event: string, handler: () => void) => {
                if (event === 'controllerchange') {
                  controllerChangeHandler = handler;
                }
              }),
              getRegistration: vi.fn().mockResolvedValue(null),
              ready: Promise.resolve(null),
            },
            onLine: true,
          },
          configurable: true,
          writable: true,
        });

        Object.defineProperty(global, 'window', {
          value: {
            location: {
              reload: reloadMock,
            },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
          configurable: true,
          writable: true,
        });

        manager.init();

        expect(controllerChangeHandler).toBeDefined();

        // Trigger controller change
        if (controllerChangeHandler) {
          (controllerChangeHandler as () => void)();
          // Second trigger should be ignored by the refreshing guard flag
          (controllerChangeHandler as () => void)();
        }

        expect(reloadMock).toHaveBeenCalledTimes(1);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          configurable: true,
        });
        Object.defineProperty(global, 'window', {
          value: originalWindow,
          configurable: true,
        });
      }
    });
  });
});
