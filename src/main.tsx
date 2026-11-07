import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { GlobalShortcutProvider } from './presentation/context/GlobalShortcutContext';

// Register PWA service worker with immediate cache-first activation and auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] New content detected; applying cache-first update...');
    updateSW(true);
    if (typeof window !== 'undefined' && !sessionStorage.getItem('pwa_refreshed_v174')) {
      sessionStorage.setItem('pwa_refreshed_v174', 'true');
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.info('[PWA] Nihongo N2 Master is fully primed for offline execution.');
  },
  onRegistered(r) {
    console.info('[PWA] Service Worker registered with scope:', r?.scope);
    if (r) {
      setInterval(() => {
        r.update().catch(() => {});
      }, 15 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service Worker registration failed:', error);
  },
});

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing && !sessionStorage.getItem('pwa_controller_refreshed_v174')) {
      refreshing = true;
      sessionStorage.setItem('pwa_controller_refreshed_v174', 'true');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <GlobalShortcutProvider>
    <App />
  </GlobalShortcutProvider>
);

