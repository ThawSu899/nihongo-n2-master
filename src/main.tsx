import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { GlobalShortcutProvider } from './presentation/context/GlobalShortcutContext';
import { pwaUpdateManager } from './services/pwa-update-manager';

// Register PWA service worker with update lifecycle detection
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] New content detected; awaiting user reload confirmation.');
    pwaUpdateManager.triggerUpdateAvailable();
  },
  onOfflineReady() {
    console.info('[PWA] Nihongo N2 Master is fully primed for offline execution.');
  },
  onRegistered(r) {
    console.info('[PWA] Service Worker registered with scope:', r?.scope);
    if (r) {
      pwaUpdateManager.attachRegistration(r);
    }
  },
  onRegisterError(error) {
    console.warn('[PWA] Service Worker registration failed:', error);
  },
});

pwaUpdateManager.init(updateSW);

createRoot(document.getElementById('root')!).render(
  <GlobalShortcutProvider>
    <App />
  </GlobalShortcutProvider>
);

