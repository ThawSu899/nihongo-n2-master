import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Shield,
  Globe,
  Bell,
  Calendar,
  Database,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Smartphone,
  BookOpen,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Keyboard,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Volume2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import {
  signInWithGoogle,
  signOutUser,
  isGoogleConnected,
  auth,
  UserAuthProfile,
} from '../../integrations/auth/firebase-auth';
import { GoogleDriveAdapter } from '../../integrations/drive/drive-adapter';
import { GoogleDriveService } from '../../integrations/drive/google-drive-service';
import {
  checkJapaneseVoiceSupport,
  testJapaneseVoiceSpeech,
  JapaneseVoiceDiagnostics,
} from '../../services/audio-resiliency';
import { UserProfile } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import { resetApplicationData } from '../../data/db/reset-app';
import { BackupManager } from '../../data/backup/backup-manager';
import { AnkiExporter, AnkiExportScope } from '../../data/backup/anki-exporter';
import {
  OfflineSyncManager,
  OfflineStorageDiagnostics,
} from '../../data/sync/offline-sync-manager';
import { StorageDiagnosticsModal } from '../components/StorageDiagnosticsModal';
import { AnkiSyncManager } from '../components/AnkiSyncManager';
import { PWAInstallGuideCard } from '../components/PWAInstallGuideCard';
import {
  useGlobalShortcuts,
  SHORTCUT_REGISTRY,
  ShortcutAction,
} from '../context/GlobalShortcutContext';

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onDataRestored?: () => void;
  onOpenDiagnosticsModal?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onUpdateProfile,
  onDataRestored,
  onOpenDiagnosticsModal,
}) => {
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [diag, setDiag] = useState<OfflineStorageDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [ankiScope, setAnkiScope] = useState<AnkiExportScope>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    keyBindings,
    updateKeyBinding,
    resetAllBindings,
    getDisplayBadge,
    registerModal,
    unregisterModal,
  } = useGlobalShortcuts();

  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [selectedShortcutCategory, setSelectedShortcutCategory] = useState<
    'all' | 'study' | 'choices' | 'srs' | 'shadowing' | 'dokkai' | 'global'
  >('all');
  const [shortcutFeedbackMsg, setShortcutFeedbackMsg] = useState<string | null>(null);

  // Reset App / New Game state
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Google Account & Cloud Backup State
  const [isGoogleAuthConnected, setIsGoogleAuthConnected] = useState<boolean>(() => isGoogleConnected());
  const [googleUser, setGoogleUser] = useState<UserAuthProfile | null>(() => auth.currentUser);
  const [googleAuthLoading, setGoogleAuthLoading] = useState<boolean>(false);
  const [driveActionLoading, setDriveActionLoading] = useState<'backup' | 'restore' | null>(null);
  const [driveStatus, setDriveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [lastDriveBackupTime, setLastDriveBackupTime] = useState<string | null>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('google_drive_last_backup_time');
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    setIsGoogleAuthConnected(isGoogleConnected());
    setGoogleUser(auth.currentUser);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsGoogleAuthConnected(isGoogleConnected());
      setGoogleUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Audio Resiliency & TTS Diagnostic State
  const [ttsDiag, setTtsDiag] = useState<JapaneseVoiceDiagnostics | null>(null);
  const [ttsTesting, setTtsTesting] = useState<boolean>(false);
  const [ttsTestResult, setTtsTestResult] = useState<string | null>(null);

  useEffect(() => {
    checkJapaneseVoiceSupport().then(setTtsDiag);
  }, []);

  const handleTestVoice = async () => {
    setTtsTesting(true);
    setTtsTestResult(null);
    const res = await testJapaneseVoiceSpeech();
    setTtsTesting(false);
    if (res.success) {
      setTtsTestResult(`အသံထွက် စမ်းသပ်မှု အောင်မြင်ပါသည် (${res.voiceName})`);
    } else {
      setTtsTestResult(`အသံထွက် ချို့ယွင်းချက်: ${res.error}`);
    }
  };

  useEffect(() => {
    if (isResetModalOpen) {
      registerModal('reset_confirm_modal');
    } else {
      unregisterModal('reset_confirm_modal');
    }
  }, [isResetModalOpen, registerModal, unregisterModal]);

  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      await resetApplicationData();
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Failed to reset app data:', err);
      setIsResetting(false);
      setBackupStatus({
        type: 'error',
        message: `Reset failed: ${err.message || 'Unknown error'}`,
      });
      setIsResetModalOpen(false);
    }
  };

  // Global key capture listener when remapping an action
  useEffect(() => {
    if (!recordingAction) return;

    registerModal('shortcut_key_recorder');

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingAction(null);
        unregisterModal('shortcut_key_recorder');
        return;
      }

      const newKey = e.code || e.key;
      updateKeyBinding(recordingAction, [newKey]);
      setShortcutFeedbackMsg(`"${SHORTCUT_REGISTRY[recordingAction]?.nameMy}" အတွက် ခလုတ်ပြောင်းလဲပြီးပါပြီ`);
      setTimeout(() => setShortcutFeedbackMsg(null), 3500);
      setRecordingAction(null);
      unregisterModal('shortcut_key_recorder');
    };

    window.addEventListener('keydown', handleKeyCapture, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyCapture, { capture: true });
      unregisterModal('shortcut_key_recorder');
    };
  }, [recordingAction, updateKeyBinding, registerModal, unregisterModal]);

  const fetchDiagnostics = async () => {
    try {
      setLoadingDiag(true);
      const data = await OfflineSyncManager.getDiagnostics();
      setDiag(data);
    } catch (e: any) {
      console.warn('Diagnostics fetch failed:', e);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
      }
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleChange = async (field: keyof UserProfile, value: any) => {
    const updated = { ...profile, [field]: value };
    onUpdateProfile(updated);
    await db.profile.put({ ...updated, id: 'current_user' });
    fetchDiagnostics();
  };

  const handleExportBackup = async () => {
    try {
      setActionLoading('export');
      const json = await BackupManager.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nihongo-n2-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus({ type: 'success', message: 'Local backup JSON successfully exported.' });
      fetchDiagnostics();
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActionLoading('import');
      const text = await file.text();
      const result = await BackupManager.restoreFromJson(text);
      if (result.success) {
        setBackupStatus({ type: 'success', message: result.message || 'Backup successfully restored.' });
        if (onDataRestored) {
          onDataRestored();
        }
        fetchDiagnostics();
      } else {
        setBackupStatus({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: 'Failed to parse backup file.' });
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportAnki = async () => {
    try {
      setActionLoading('anki');
      const result = await AnkiExporter.downloadStandard5ColTsv({ scope: ankiScope });
      setBackupStatus({
        type: 'success',
        message: `Successfully exported ${result.count} cards to Anki TSV (${result.filename}). Clean UTF-8 TSV ready for import.`,
      });
      fetchDiagnostics();
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Anki export failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCacheAndResync = async () => {
    if (!window.confirm('Clear temporary lesson cache and re-sync local IndexedDB indices? Your study records, SRS cards, and profile will be safely preserved and verified.')) {
      return;
    }

    try {
      setActionLoading('resync');
      const res = await OfflineSyncManager.clearCacheAndResync();
      if (res.success) {
        setBackupStatus({ type: 'success', message: res.message });
        if (onDataRestored) {
          onDataRestored();
        }
        fetchDiagnostics();
      } else {
        setBackupStatus({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: `Re-sync failed: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrecacheAll = async () => {
    try {
      setActionLoading('precache');
      await OfflineSyncManager.warmAllPublishedPacks();
      setBackupStatus({
        type: 'success',
        message: 'All published lesson packs pre-cached into IndexedDB for offline access.',
      });
      fetchDiagnostics();
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: `Pre-cache failed: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleAuthLoading(true);
      setDriveStatus({ type: null, message: '' });
      await signInWithGoogle();
      setIsGoogleAuthConnected(isGoogleConnected());
      setGoogleUser(auth.currentUser);
      setDriveStatus({
        type: 'success',
        message: 'Successfully signed in with Google. Cloud backup is now active.',
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        message: err?.message || 'Google sign-in failed.',
      });
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      setGoogleAuthLoading(true);
      setDriveStatus({ type: null, message: '' });
      await signOutUser();
      setIsGoogleAuthConnected(isGoogleConnected());
      setGoogleUser(null);
      setDriveStatus({
        type: 'success',
        message: 'Signed out of Google Account. Operating in offline-first mode with IndexedDB.',
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        message: err?.message || 'Google sign-out failed.',
      });
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleGoogleDriveBackup = async () => {
    try {
      setDriveActionLoading('backup');
      setDriveStatus({ type: null, message: '' });

      if (!isGoogleConnected()) {
        setDriveStatus({
          type: 'error',
          message: 'Please sign in with Google first to backup to Google Drive.',
        });
        return;
      }

      const jsonContent = await BackupManager.exportToJson();
      const driveAdapter = new GoogleDriveAdapter();
      const filename = `nihongo_master_backup_${new Date().toISOString().substring(0, 10)}.json`;
      const success = await driveAdapter.saveBackup(filename, jsonContent);

      if (success) {
        const now = new Date().toISOString();
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem('google_drive_last_backup_time', now);
        }
        setLastDriveBackupTime(now);
        setDriveStatus({
          type: 'success',
          message: `Successfully backed up study progress to Google Drive (${filename}).`,
        });
      } else {
        const detail = driveAdapter.lastError;
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setDriveStatus({
          type: 'error',
          message: isOffline
            ? 'Failed to backup to Google Drive. You appear to be offline. Please check your network connection.'
            : detail
            ? `Failed to backup to Google Drive: ${detail}`
            : 'Failed to backup to Google Drive. Please verify your Google Drive permissions.',
        });
      }
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        message: err?.message || 'Failed to backup to Google Drive.',
      });
    } finally {
      setDriveActionLoading(null);
    }
  };

  const handleGoogleDriveRestore = async () => {
    try {
      setDriveActionLoading('restore');
      setDriveStatus({ type: null, message: '' });

      if (!isGoogleConnected()) {
        setDriveStatus({
          type: 'error',
          message: 'Please sign in with Google first to restore from Google Drive.',
        });
        return;
      }

      const backups = await GoogleDriveService.listBackups();
      if (!backups || backups.length === 0) {
        setDriveStatus({
          type: 'error',
          message: 'No Nihongo N2 Master backups found in your Google Drive folder.',
        });
        return;
      }

      const latestBackup = backups[0];
      const driveAdapter = new GoogleDriveAdapter();
      const backupJson = await driveAdapter.getBackup(latestBackup.id);

      if (!backupJson) {
        const detail = driveAdapter.lastError;
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setDriveStatus({
          type: 'error',
          message: isOffline
            ? 'Could not retrieve backup file from Google Drive. You appear to be offline. Please check your network connection.'
            : detail
            ? `Could not retrieve backup file from Google Drive: ${detail}`
            : `Could not retrieve backup file "${latestBackup.name}" from Google Drive.`,
        });
        return;
      }

      const restoreResult = await BackupManager.restoreFromJson(backupJson);
      if (restoreResult.success) {
        setDriveStatus({
          type: 'success',
          message: `Successfully restored study progress from Google Drive (${latestBackup.name}).`,
        });
        if (onDataRestored) {
          onDataRestored();
        }
        fetchDiagnostics();
      } else {
        setDriveStatus({
          type: 'error',
          message: restoreResult.message || 'Failed to parse backup content from Google Drive.',
        });
      }
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        message: err?.message || 'Failed to restore from Google Drive.',
      });
    } finally {
      setDriveActionLoading(null);
    }
  };

  const handleOpenModal = () => {
    if (onOpenDiagnosticsModal) {
      onOpenDiagnosticsModal();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-stone-600 mt-0.5">
          Configure learning parameters, study schedule goals, kana display policies, and offline storage.
        </p>
      </div>

      {/* Curriculum & Display Preferences */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900 flex items-center">
          <Globe className="w-4 h-4 mr-2 text-indigo-600" /> Language &amp; Kana Policy
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Furigana Display Policy</label>
            <select
              value={profile.furiganaMode}
              onChange={(e) => handleChange('furiganaMode', e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="always">Always Show Furigana (Default N5)</option>
              <option value="unlearned">Only Unlearned / New Kanji</option>
              <option value="never">Hide Furigana (Kanji Mastery Mode)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Explanation Language</label>
            <select
              value={profile.explanationLang}
              onChange={(e) => handleChange('explanationLang', e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="en">English (Primary)</option>
              <option value="my">Myanmar / Burmese (Unicode)</option>
              <option value="ja">Japanese (Monolingual)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">Romaji Reading Assist</span>
              <span className="text-[11px] text-stone-600">
                Displays romanized spelling under furigana. Recommended for beginners on N5 Day 1.
              </span>
            </div>
            <button
              onClick={() => handleChange('showRomaji', !profile.showRomaji)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.showRomaji ? 'bg-indigo-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Speech & Japanese Audio Resiliency Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900 flex items-center justify-between">
          <span className="flex items-center">
            <Volume2 className="w-4 h-4 mr-2 text-indigo-600" /> Japanese Speech Synthesis (TTS) &amp; Voice Health
          </span>
          <span className="text-xs text-stone-500 font-myanmar">အသံထွက် အခြေအနေ</span>
        </h2>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    ttsDiag?.hasJaVoice
                      ? 'bg-emerald-500 shadow-xs'
                      : 'bg-amber-500 shadow-xs'
                  }`}
                />
                <span className="text-xs font-bold text-stone-900 font-mono">
                  {ttsDiag?.hasJaVoice
                    ? `Native Japanese Voice Detected: ${ttsDiag.defaultVoiceName || 'Default ja-JP'}`
                    : 'No Native Japanese Voice Found — Fallback Visual Phonetics Active'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-myanmar">
                {ttsDiag?.hasJaVoice
                  ? `စက်အတွင်း ဂျပန်အသံထွက် (${ttsDiag.japaneseVoices.length} ခု) အဆင်သင့်ရှိပါသည်။ Shadowing နှင့် Listening များတွင် အလိုအလျောက် သုံးစွဲမည်။`
                  : 'စက်တွင် ဂျပန်အသံထွက် မရှိသေးပါသဖြင့် Romaji ဖတ်နည်းနှင့် Pitch Accent အသံအတက်အကျ မျဉ်းကွေးများဖြင့် အထောက်အကူပြုထားပါသည်။'}
              </p>
            </div>

            <button
              onClick={handleTestVoice}
              disabled={ttsTesting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{ttsTesting ? 'စမ်းသပ်နေသည်...' : 'Test Voice (အသံ စမ်းသပ်မည်)'}</span>
            </button>
          </div>

          {ttsTestResult && (
            <div className="text-xs font-myanmar p-2.5 rounded-lg bg-white border border-stone-200 text-stone-800">
              {ttsTestResult}
            </div>
          )}
        </div>
      </div>

      {/* Daily Schedule & Rollover Settings */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-indigo-600" /> Study Schedule &amp; SRS Rollover
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Daily Study Target</label>
            <select
              value={profile.dailyTargetMinutes}
              onChange={(e) => handleChange('dailyTargetMinutes', Number(e.target.value))}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value={360}>6 Hours (360 min) — Standard Full-Day Immersion</option>
              <option value={180}>3 Hours (180 min) — Accelerated Part-Time</option>
              <option value={120}>2 Hours (120 min) — Consistent Pace</option>
              <option value={60}>1 Hour (60 min) — Maintenance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Daily Rollover Hour</label>
            <select
              value={profile.dayRolloverHour}
              onChange={(e) => handleChange('dayRolloverHour', Number(e.target.value))}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value={4}>04:00 AM (Default — Night-owl friendly)</option>
              <option value={0}>00:00 Midnight</option>
              <option value={5}>05:00 AM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences & Quiet Hours */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900 flex items-center">
          <Bell className="w-4 h-4 mr-2 text-indigo-600" /> Reminders &amp; Quiet Hours
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">In-App Sound &amp; Banners</span>
              <span className="text-[11px] text-stone-600">Alerts when blocks finish or break starts</span>
            </div>
            <button
              onClick={() =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  inApp: !profile.notificationSettings.inApp,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.notificationSettings.inApp ? 'bg-indigo-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-xs font-semibold text-stone-800 block">Browser Notifications</span>
              <span className="text-[11px] text-stone-600">Best-effort notification API alerts</span>
            </div>
            <button
              onClick={() =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  browser: !profile.notificationSettings.browser,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.notificationSettings.browser ? 'bg-indigo-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Quiet Hours Start</label>
            <input
              type="time"
              value={profile.notificationSettings.quietHoursStart || '22:00'}
              onChange={(e) =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  quietHoursStart: e.target.value,
                })
              }
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700">Quiet Hours End</label>
            <input
              type="time"
              value={profile.notificationSettings.quietHoursEnd || '07:00'}
              onChange={(e) =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  quietHoursEnd: e.target.value,
                })
              }
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Customization Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Keyboard className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                ကီးဘုတ် ဖြတ်လမ်းခလုတ်များ (Keyboard Shortcuts)
              </h2>
              <p className="text-[11px] text-stone-600">
                လေ့ကျင့်ခန်း၊ အသံဖွင့်ခြင်းနှင့် SRS ကတ်များအတွက် မိမိစိတ်ကြိုက် ကီးဘုတ်ခလုတ်များကို သတ်မှတ်နိုင်ပါသည်
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetAllBindings();
              setShortcutFeedbackMsg('မူလဖြတ်လမ်းခလုတ်များအတိုင်း အားလုံးပြန်လည်သတ်မှတ်ပြီးပါပြီ');
              setTimeout(() => setShortcutFeedbackMsg(null), 3500);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>မူလအတိုင်း ပြန်ထားမည် (Reset Defaults)</span>
          </button>
        </div>

        {shortcutFeedbackMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-myanmar">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{shortcutFeedbackMsg}</span>
          </div>
        )}

        {recordingAction && (
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shrink-0" />
              <span>
                <strong>{SHORTCUT_REGISTRY[recordingAction]?.nameMy}</strong> ({SHORTCUT_REGISTRY[recordingAction]?.nameEn}) အတွက် ကီးဘုတ်ခလုတ်အသစ်ကို နှိပ်ပါ...
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRecordingAction(null)}
              className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-[11px] text-stone-700 hover:text-stone-900 cursor-pointer self-end sm:self-auto shadow-xs"
            >
              ပယ်ဖျက်ရန် (Esc)
            </button>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'အားလုံး (All)' },
            { id: 'study', label: 'လေ့ကျင့်ခန်း (Study)' },
            { id: 'choices', label: 'ရွေးချယ်မှု (Choices)' },
            { id: 'srs', label: 'SRS ကတ်များ' },
            { id: 'shadowing', label: 'လိုက်ဆိုမှု (Shadowing)' },
            { id: 'dokkai', label: 'စာဖတ် (Dokkai)' },
            { id: 'global', label: 'အထွေထွေ (Global)' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedShortcutCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer text-xs ${
                selectedShortcutCategory === cat.id
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Shortcut Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {Object.values(SHORTCUT_REGISTRY)
            .filter((s) => selectedShortcutCategory === 'all' || s.category === selectedShortcutCategory)
            .map((s) => {
              const isRecording = recordingAction === s.id;
              const currentBadge = getDisplayBadge(s.id);
              const isCustomized =
                keyBindings[s.id] &&
                JSON.stringify(keyBindings[s.id]) !== JSON.stringify(s.defaultKeys);

              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-xl bg-stone-50 border ${
                    isRecording
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40'
                      : 'border-stone-200 hover:border-stone-300'
                  } transition flex items-center justify-between gap-3`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-stone-900 truncate">
                        {s.nameMy}
                      </span>
                      {isCustomized && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                          စိတ်ကြိုက်
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {s.nameEn} &bull; {s.descriptionMy}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRecordingAction(s.id)}
                      className={`min-w-[58px] px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer flex items-center justify-center ${
                        isRecording
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-xs'
                          : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-xs'
                      }`}
                      title="ကလစ်နှိပ်၍ ခလုတ်ပြောင်းလဲနိုင်ပါသည်"
                    >
                      {isRecording ? 'နှိပ်ပါ...' : currentBadge}
                    </button>

                    {isCustomized && (
                      <button
                        type="button"
                        onClick={() => updateKeyBinding(s.id, s.defaultKeys)}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                        title="မူလခလုတ်အတိုင်း ပြန်ထားမည်"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Google Account & Drive Cloud Backup Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isGoogleAuthConnected ? 'bg-indigo-50 text-indigo-600' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                Google Account &amp; Drive Backup
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isGoogleAuthConnected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {isGoogleAuthConnected ? 'Connected' : 'Offline / Local Only'}
                </span>
              </h2>
              <p className="text-xs text-stone-500 font-myanmar">
                Google Drive သို့ သင်ယူမှုမှတ်တမ်းများ Cloud Backup သိမ်းဆည်းခြင်းနှင့် ပြန်လည်ရယူခြင်း
              </p>
            </div>
          </div>

          <div>
            {isGoogleAuthConnected ? (
              <button
                type="button"
                onClick={handleGoogleSignOut}
                disabled={googleAuthLoading || !!driveActionLoading}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{googleAuthLoading ? 'Signing out...' : 'Sign out'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleAuthLoading || !!driveActionLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{googleAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* User / Connection Details */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <User className={`w-4 h-4 ${isGoogleAuthConnected ? 'text-indigo-600' : 'text-stone-400'}`} />
            <div>
              <span className="font-semibold text-stone-800 block">
                {isGoogleAuthConnected
                  ? googleUser?.displayName || 'Google Connected User'
                  : 'No Google Account Linked'}
              </span>
              <span className="text-[11px] text-stone-500">
                {isGoogleAuthConnected
                  ? 'Authenticated via Google Identity Services (Drive, Sheets & Calendar Scopes)'
                  : 'Operating in 100% offline-first mode with IndexedDB local storage.'}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-stone-500 block">Last Cloud Backup:</span>
            <span className="font-mono font-medium text-stone-800 text-[11px]">
              {lastDriveBackupTime ? new Date(lastDriveBackupTime).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>

        {/* Drive Action Status Banner */}
        {driveStatus.message && (
          <div
            className={`p-3 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 ${
              driveStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {driveStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="break-words">{driveStatus.message}</span>
            </div>
            {driveStatus.type === 'error' &&
              /permission|unauthorized|expired|insufficient|401|403|scope/i.test(driveStatus.message) && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleAuthLoading}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  Re-Authorize • ပြန်လည်ချိတ်ဆက်မည်
                </button>
              )}
          </div>
        )}

        {/* Cloud Backup & Restore Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleDriveBackup}
            disabled={!isGoogleAuthConnected || !!driveActionLoading}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className={`w-3.5 h-3.5 ${driveActionLoading === 'backup' ? 'animate-bounce' : ''}`} />
            <span>
              {driveActionLoading === 'backup' ? 'Backing up to Drive...' : 'Backup to Google Drive'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleGoogleDriveRestore}
            disabled={!isGoogleAuthConnected || !!driveActionLoading}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className={`w-3.5 h-3.5 ${driveActionLoading === 'restore' ? 'animate-bounce' : ''}`} />
            <span>
              {driveActionLoading === 'restore' ? 'Restoring from Drive...' : 'Restore from Google Drive'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-stone-500">
          Backups are encrypted in transit and saved to your personal Google Drive in the{' '}
          <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-[10px]">Japanese-N2-Master</code> folder.
        </p>
      </div>

      {/* PWA Offline Storage & Sync Diagnostics Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-stone-900">
              PWA Offline Storage &amp; Sync Diagnostics
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenModal}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 transition cursor-pointer active:scale-95 shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Diagnostic Inspector</span>
            </button>
            <span className="text-[11px] text-emerald-700 font-medium flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 100% Offline-First
            </span>
          </div>
        </div>

        {backupStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              backupStatus.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {backupStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{backupStatus.message}</span>
          </div>
        )}

        {/* Clear Health Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Local Storage Usage / Quota Status */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 flex items-center">
                <HardDrive className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Storage Usage
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {diag?.storage.isPersisted ? 'Persistent' : 'Best-effort'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-stone-900 font-mono">
                  {diag?.storage.usageFormatted || '0 B'}
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  / {diag?.storage.quotaFormatted || 'Quota'}
                </span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.max(2, diag?.storage.usagePercentage || 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                {diag?.storage.usagePercentage || 0}% of allocated disk quota
              </span>
            </div>
          </div>

          {/* 2. Total Cached Lesson Packs Count & Sync Status */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Cached Lesson Packs
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  diag?.cacheAndSync.syncStatus === 'synced'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {diag?.cacheAndSync.syncStatus === 'synced' ? 'Synced (100%)' : 'Partial Cache'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-stone-900 font-mono">
                  {diag?.cacheAndSync.cachedPacksCount ?? 0}
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  / {diag?.cacheAndSync.totalPublishedPacks ?? 0} published
                </span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-indigo-600"
                  style={{ width: `${diag?.cacheAndSync.syncPercentage || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                <span>{diag?.cacheAndSync.syncPercentage || 0}% cached offline</span>
                {diag?.cacheAndSync.syncStatus !== 'synced' && (
                  <button
                    onClick={handlePrecacheAll}
                    disabled={!!actionLoading}
                    className="text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                  >
                    Pre-cache all
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Pending Offline Actions Queue Count */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Offline Action Queue
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  (diag?.pendingQueue.count || 0) === 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {(diag?.pendingQueue.count || 0) === 0 ? 'In Sync' : 'Queued'}
              </span>
            </div>
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-stone-900 font-mono">
                  {diag?.pendingQueue.count ?? 0}
                </span>
                <span className="text-[11px] text-stone-500">
                  pending operations
                </span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(diag?.pendingQueue.count || 0) > 0 ? 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                {(diag?.pendingQueue.count || 0) === 0
                  ? 'Local IndexedDB state up-to-date'
                  : 'Pending local synchronization'}
              </span>
            </div>
          </div>
        </div>

        {/* Live IndexedDB Record Inspection Snapshot */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700">
              IndexedDB (Dexie) Live Entity Breakdown
            </span>
            <span className="text-[10px] text-stone-500 font-mono">
              Database: {diag?.dbStatus.name || 'NihongoN2MasterDB'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white border border-stone-200 shadow-xs">
              <span className="text-sm font-bold text-indigo-600 font-mono block">
                {diag?.tables.srsCards ?? 0}
              </span>
              <span className="text-[10px] text-stone-600">SRS Cards</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-stone-200 shadow-xs">
              <span className="text-sm font-bold text-emerald-600 font-mono block">
                {diag?.tables.masteryRecords ?? 0}
              </span>
              <span className="text-[10px] text-stone-600">Mastery Records</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-stone-200 shadow-xs">
              <span className="text-sm font-bold text-stone-800 font-mono block">
                {diag?.tables.kanaRecords ?? 0}
              </span>
              <span className="text-[10px] text-stone-600">Kana Records</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-stone-200 shadow-xs">
              <span className="text-sm font-bold text-stone-800 font-mono block">
                {diag?.tables.assessments ?? 0}
              </span>
              <span className="text-[10px] text-stone-600">Readiness Tests</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Action 1: Export JSON Backup */}
          <button
            onClick={handleExportBackup}
            disabled={!!actionLoading}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          {/* Action 2: Import JSON Backup */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!actionLoading}
              className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>Import JSON Backup</span>
            </button>
          </div>

          {/* Action 3: Clear Cache & Re-sync */}
          <button
            onClick={handleClearCacheAndResync}
            disabled={!!actionLoading}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'resync' ? 'animate-spin' : ''}`} />
            <span>Clear Cache &amp; Re-sync</span>
          </button>
        </div>

        {/* Anki Live Connection Status & Bridge */}
        <AnkiSyncManager className="mt-2" />

        {/* Anki Flashcard Deck Exporter Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-stone-900 font-myanmar">
                  📤 Export Weak Items / Level to Anki (.tsv)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold">
                  Anki 2.1+ / AnkiDroid
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Generate clean UTF-8 tab-separated values (<strong>Japanese_Kanji</strong>, <strong>Reading_Furigana</strong>, <strong>Burmese_Meaning</strong>, <strong>Example_Sentence</strong>, <strong>JLPT_Level_Tag</strong>) ready for 1-click import into Anki Desktop or AnkiDroid.
              </p>
            </div>

            {/* 1-Click Download Trigger */}
            <button
              onClick={handleExportAnki}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{actionLoading === 'anki' ? 'Exporting...' : 'Download Anki (.tsv)'}</span>
            </button>
          </div>

          {/* Scope Selector Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] text-stone-500 font-mono uppercase tracking-wider font-semibold">
              Deck Scope:
            </span>
            <button
              type="button"
              onClick={() => setAnkiScope('weak_items')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'weak_items'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              🔥 Weak Items (အားနည်းချက်များ)
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('n2')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'n2'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              N2 Level
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('n3')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'n3'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              N3 Level
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('n4')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'n4'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              N4 Level
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('n5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'n5'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              N5 Level
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              All Saved ({diag?.tables.srsCards ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setAnkiScope('mined')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
                ankiScope === 'mined'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs'
              }`}
            >
              Mined Only
            </button>
          </div>
        </div>
      </div>

      {/* 📲 PWA Installation & Share Guide Hub in Burmese */}
      <PWAInstallGuideCard
        isInstalled={isInstalled}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallApp}
      />

      {/* Danger Zone: Reset App / New Game */}
      <div className="bg-white border border-rose-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-rose-700">
              Danger Zone · အန္တရာယ်ဇုန် (Reset Application)
            </h2>
            <p className="text-[11px] text-stone-600">
              လေ့ကျင့်ထားသော တိုးတက်မှုများ၊ စာမေးပွဲရလဒ်များနှင့် ဆက်တင်အားလုံးကို အပြီးတိုင် ဖျက်ပစ်ပြီး ပထမနေ့အတိုင်း အသစ်ပြန်စတင်ပါမည်
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-900 block">
              Reset App Progress (New Game)
            </span>
            <p className="text-[11px] text-stone-600 max-w-xl leading-relaxed">
              Permanently wipes all SRS review intervals, mastery records, grammar cram logs, customized keyboard shortcuts, and local storage. The app will immediately reload into a fresh, Day 1 state.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-xs shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset App Progress (New Game)</span>
          </button>
        </div>
      </div>

      {/* Strict Confirmation Modal for Reset Application / New Game */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">
                  Are you sure you want to completely wipe all learning progress and start from zero?
                </h3>
                <p className="text-xs text-rose-700 font-medium">
                  This action cannot be undone. (ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်၍ မရနိုင်ပါ။)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-700">
              <span className="text-[11px] font-semibold text-stone-600 block uppercase tracking-wider">
                အောက်ပါ အချက်အလက်များ အားလုံး အပြီးတိုင် ပျက်ပြယ်သွားပါမည်:
              </span>
              <ul className="space-y-1.5 text-[11px] text-stone-600">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>All SRS Flashcards &amp; Repetition Intervals (SRS ကတ်များ)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Grammar Cram, Star Scramble &amp; Choukai Drills (လေ့ကျင့်ခန်းမှတ်တမ်းများ)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Official Mock Exam Scores &amp; Readiness Tests (စာမေးပွဲရလဒ်များ)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Custom Keyboard Shortcuts &amp; Preferences (စိတ်ကြိုက်ဆက်တင်များ)</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                မဖျက်တော့ပါ (Cancel)
              </button>

              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>အချက်အလက်များ ရှင်းလင်းနေပါသည်...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ဟုတ်ကဲ့၊ အကုန်ဖျက်ပြီး အသစ်ပြန်စမည် (Wipe &amp; Restart)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Diagnostics Modal */}
      <StorageDiagnosticsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataRestored={() => {
          if (onDataRestored) onDataRestored();
          fetchDiagnostics();
        }}
      />
    </div>
  );
};
