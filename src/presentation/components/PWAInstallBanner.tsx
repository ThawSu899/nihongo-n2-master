import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check session dismissal
    if (sessionStorage.getItem('nihongo_pwa_install_dismissed') === '1') {
      setIsDismissed(true);
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // 4. Capture beforeinstallprompt event (Chromium, Edge, Samsung Internet)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstallSuccess(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('nihongo_pwa_install_dismissed', '1');
  };

  // If already installed or explicitly dismissed, don't show
  if (isInstalled && !installSuccess) return null;
  if (isDismissed && !installSuccess) return null;

  // Only show when prompt is captured or on iOS if not dismissed
  const shouldShow = Boolean(deferredPrompt) || (isIOS && !isDismissed) || installSuccess;
  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-40 max-w-md mx-auto sm:mx-0 pointer-events-auto"
      >
        <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 shadow-md p-3.5 sm:p-4 text-stone-900 group">
          {/* Subtle ambient accent hairline */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-indigo-500 to-emerald-500 opacity-80" />

          {installSuccess ? (
            <div className="flex items-center space-x-3 py-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800">Nihongo N2 Master Installed!</p>
                <p className="text-[11px] text-stone-600">Launch from your home screen anytime offline.</p>
              </div>
            </div>
          ) : showIOSGuide ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Install on iOS Safari
                </span>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-stone-700 space-y-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <p className="flex items-center gap-1.5">
                  1. Tap the <Share className="w-3.5 h-3.5 text-indigo-600 inline" /> <strong>Share</strong> button in Safari toolbar.
                </p>
                <p className="flex items-center gap-1.5">
                  2. Scroll down and choose <PlusSquare className="w-3.5 h-3.5 text-emerald-600 inline" /> <strong>Add to Home Screen</strong>.
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                {/* App Icon Mon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-900 border border-rose-500/40 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                  <span className="font-japanese text-sm">日</span>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-stone-900 truncate font-sans">
                      Install Nihongo N2 Master
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-mono text-emerald-700 font-semibold">
                      Offline PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 truncate">
                    Fast cold boots &amp; zero-latency IndexedDB study.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={handleInstallClick}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-95 shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </button>

                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
