/**
 * PWA Service Worker Update Manager
 * Handles update lifecycle, tab-visibility checks, periodic background checks,
 * SKIP_WAITING signaling, and clean single-execution controller reloads.
 */

export type PWAUpdateListener = (hasUpdate: boolean) => void;

export class PWAUpdateManager {
  private static instance: PWAUpdateManager;
  private registration: ServiceWorkerRegistration | null = null;
  private waitingWorker: ServiceWorker | null = null;
  private updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private hasUpdate = false;
  private isDismissed = false;
  private listeners: Set<PWAUpdateListener> = new Set();
  private refreshing = false;
  private periodicIntervalId: any = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private initialized = false;

  private constructor() {
    if (typeof sessionStorage !== 'undefined') {
      try {
        this.isDismissed = sessionStorage.getItem('nihongo_pwa_update_dismissed') === '1';
      } catch {
        this.isDismissed = false;
      }
    }
  }

  public static getInstance(): PWAUpdateManager {
    if (!PWAUpdateManager.instance) {
      PWAUpdateManager.instance = new PWAUpdateManager();
    }
    return PWAUpdateManager.instance;
  }

  /**
   * Initializes the Service Worker Update detection lifecycle.
   * Safe to call multiple times; guards against duplicate listeners.
   */
  public init(customUpdateSW?: (reloadPage?: boolean) => Promise<void>): void {
    if (customUpdateSW) {
      this.updateSWFn = customUpdateSW;
    }

    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // 1. Controller change listener with single reload guard
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.refreshing) return;
        this.refreshing = true;
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });

      // 2. Discover registration and attach lifecycle listeners
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) {
            this.attachRegistration(reg);
          }
        })
        .catch(() => {});

      if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (reg) {
              this.attachRegistration(reg);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('[PWA] Service worker initialization error:', e);
    }

    // 3. Proactive update check whenever user returns to the app tab
    if (typeof document !== 'undefined') {
      this.boundVisibilityHandler = () => {
        if (
          document.visibilityState === 'visible' &&
          typeof navigator !== 'undefined' &&
          navigator.onLine
        ) {
          this.checkForUpdates();
        }
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    // 4. Periodic background check: every 30 minutes while online
    if (typeof window !== 'undefined') {
      if (this.periodicIntervalId) {
        clearInterval(this.periodicIntervalId);
      }
      this.periodicIntervalId = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.checkForUpdates();
        }
      }, 30 * 60 * 1000);
    }
  }

  /**
   * Attaches update detection listeners to a ServiceWorkerRegistration:
   * (a) registration.waiting on initial load (if controller exists)
   * (b) registration updatefound -> newWorker.state === 'installed' (if controller exists)
   */
  public attachRegistration(reg: ServiceWorkerRegistration): void {
    this.registration = reg;

    // (a) If a new worker is already waiting to take over
    if (reg.waiting) {
      const hasController =
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        Boolean(navigator.serviceWorker.controller);

      if (hasController || reg.active) {
        this.setWaitingWorker(reg.waiting);
      }
    }

    // (b) Listen for updatefound -> installing worker -> installed state
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          const hasController =
            typeof navigator !== 'undefined' &&
            'serviceWorker' in navigator &&
            Boolean(navigator.serviceWorker.controller);

          // An installed worker while a controller is present indicates an updated version
          if (hasController) {
            this.setWaitingWorker(newWorker);
          }
        }
      });
    });
  }

  /**
   * Proactively triggers registration.update() when online
   */
  public async checkForUpdates(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }

    if (!this.registration || typeof this.registration.update !== 'function') {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            this.attachRegistration(reg);
            if (typeof reg.update === 'function') {
              await reg.update();
            }
          }
        } catch {
          // Graceful fallback
        }
      }
      return;
    }

    try {
      await this.registration.update();
    } catch (err) {
      console.warn('[PWA] Proactive update check failed:', err);
    }
  }

  /**
   * Called when a new waiting service worker is detected
   */
  public setWaitingWorker(worker: ServiceWorker): void {
    this.waitingWorker = worker;
    this.hasUpdate = true;
    this.notify();
  }

  /**
   * External hook for virtual:pwa-register onNeedRefresh()
   */
  public triggerUpdateAvailable(): void {
    this.hasUpdate = true;
    if (!this.waitingWorker && this.registration?.waiting) {
      this.waitingWorker = this.registration.waiting;
    }
    this.notify();
  }

  /**
   * Sends SKIP_WAITING to waiting worker and reloads into the fresh build
   */
  public applyUpdate(): void {
    if (this.waitingWorker) {
      try {
        this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } catch (err) {
        console.warn('[PWA] Failed to postMessage SKIP_WAITING to waiting worker:', err);
      }
    }

    if (this.updateSWFn) {
      try {
        this.updateSWFn(true);
      } catch (err) {
        console.warn('[PWA] updateSW invocation failed:', err);
      }
    }

    // Fallback: If controllerchange does not fire within 500ms, force reload
    setTimeout(() => {
      if (!this.refreshing && typeof window !== 'undefined') {
        this.refreshing = true;
        window.location.reload();
      }
    }, 500);
  }

  /**
   * Dismisses update notification for current session without losing offline capabilities
   */
  public dismiss(): void {
    this.isDismissed = true;
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('nihongo_pwa_update_dismissed', '1');
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  public getHasUpdate(): boolean {
    return this.hasUpdate && !this.isDismissed;
  }

  public getWaitingWorker(): ServiceWorker | null {
    return this.waitingWorker;
  }

  public isUpdateDismissed(): boolean {
    return this.isDismissed;
  }

  public subscribe(listener: PWAUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.getHasUpdate());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getHasUpdate();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[PWAUpdateManager] Listener invocation failed:', err);
      }
    });
  }

  /**
   * Test environment helper to reset singleton state
   */
  public _resetForTesting(): void {
    this.registration = null;
    this.waitingWorker = null;
    this.updateSWFn = null;
    this.hasUpdate = false;
    this.isDismissed = false;
    this.refreshing = false;
    this.initialized = false;
    this.listeners.clear();
    if (this.periodicIntervalId) {
      clearInterval(this.periodicIntervalId);
      this.periodicIntervalId = null;
    }
    if (this.boundVisibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
  }
}

export const pwaUpdateManager = PWAUpdateManager.getInstance();
