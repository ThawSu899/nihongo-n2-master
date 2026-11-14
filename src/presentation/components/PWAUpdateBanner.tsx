import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { pwaUpdateManager, PWAUpdateManager } from '../../services/pwa-update-manager';

export interface PWAUpdateBannerProps {
  customManager?: PWAUpdateManager;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({
  customManager = pwaUpdateManager,
}) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(() => customManager.getHasUpdate());
  const [isReloading, setIsReloading] = useState<boolean>(false);

  useEffect(() => {
    // 1. Subscribe to update notifications from update manager
    const unsubscribe = customManager.subscribe((updateAvailable) => {
      setHasUpdate(updateAvailable);
    });

    // 2. Ensure update manager is initialized
    customManager.init();

    return () => {
      unsubscribe();
    };
  }, [customManager]);

  const handleReload = () => {
    setIsReloading(true);
    customManager.applyUpdate();
  };

  const handleDismiss = () => {
    customManager.dismiss();
    setHasUpdate(false);
  };

  if (!hasUpdate) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="polite"
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-5 z-50 max-w-md mx-auto sm:mx-0 pointer-events-none"
      >
        <div className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xl p-4 text-stone-900 dark:text-zinc-100 group">
          {/* Subtle ambient accent hairline */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 opacity-90" />

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-zinc-100 leading-tight">
                Update Available • ဗားရှင်းအသစ် ရရှိနေပါပြီ
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-600 dark:text-zinc-400 mt-1 leading-normal">
                A new version of Nihongo Master is ready. Reload to apply the latest fixes.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  data-testid="pwa-update-reload-btn"
                  onClick={handleReload}
                  disabled={isReloading}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                  <span>Reload Now • အသစ်ပြောင်းမည်</span>
                </button>

                <button
                  type="button"
                  data-testid="pwa-update-dismiss-btn"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Later • နောက်မှ
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss update notification"
              className="absolute top-3.5 right-3.5 p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
