import React, { useState, useRef } from 'react';
import {
  Settings,
  Shield,
  Globe,
  Bell,
  Calendar,
  Database,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { UserProfile } from '../../domain/models/types';
import { db } from '../../data/db/dexie-db';
import { BackupManager } from '../../data/backup/backup-manager';

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onDataRestored?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onUpdateProfile,
  onDataRestored,
}) => {
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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
  };

  const handleExportBackup = async () => {
    try {
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
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Export failed.' });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await BackupManager.restoreFromJson(text);
      if (result.success) {
        setBackupStatus({ type: 'success', message: 'Backup successfully restored.' });
        if (onDataRestored) {
          onDataRestored();
        }
      } else {
        setBackupStatus({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: 'Failed to parse backup file.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100 tracking-tight">System Settings</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Configure learning parameters, study schedule goals, kana display policies, and integrations.
        </p>
      </div>

      {/* Curriculum & Display Preferences */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-stone-200 flex items-center">
          <Globe className="w-4 h-4 mr-2 text-rose-400" /> Language &amp; Kana Policy
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Furigana Display Policy</label>
            <select
              value={profile.furiganaMode}
              onChange={(e) => handleChange('furiganaMode', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            >
              <option value="always">Always Show Furigana (Default N5)</option>
              <option value="unlearned">Only Unlearned / New Kanji</option>
              <option value="never">Hide Furigana (Kanji Mastery Mode)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Explanation Language</label>
            <select
              value={profile.explanationLang}
              onChange={(e) => handleChange('explanationLang', e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            >
              <option value="en">English (Primary)</option>
              <option value="my">Myanmar / Burmese (Unicode)</option>
              <option value="ja">Japanese (Monolingual)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">Romaji Reading Assist</span>
              <span className="text-[11px] text-stone-500">
                Displays romanized spelling under furigana. Recommended for beginners on N5 Day 1.
              </span>
            </div>
            <button
              onClick={() => handleChange('showRomaji', !profile.showRomaji)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.showRomaji ? 'bg-rose-600 justify-end' : 'bg-stone-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Schedule & Rollover Settings */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-stone-200 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-rose-400" /> Study Schedule &amp; SRS Rollover
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Daily Study Target</label>
            <select
              value={profile.dailyTargetMinutes}
              onChange={(e) => handleChange('dailyTargetMinutes', Number(e.target.value))}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            >
              <option value={360}>6 Hours (360 min) — Standard Full-Day Immersion</option>
              <option value={180}>3 Hours (180 min) — Accelerated Part-Time</option>
              <option value={120}>2 Hours (120 min) — Consistent Pace</option>
              <option value={60}>1 Hour (60 min) — Maintenance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Daily Rollover Hour</label>
            <select
              value={profile.dayRolloverHour}
              onChange={(e) => handleChange('dayRolloverHour', Number(e.target.value))}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            >
              <option value={4}>04:00 AM (Default — Night-owl friendly)</option>
              <option value={0}>00:00 Midnight</option>
              <option value={5}>05:00 AM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences & Quiet Hours (§12) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-stone-200 flex items-center">
          <Bell className="w-4 h-4 mr-2 text-rose-400" /> Reminders &amp; Quiet Hours
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">In-App Sound &amp; Banners</span>
              <span className="text-[11px] text-stone-500">Alerts when blocks finish or break starts</span>
            </div>
            <button
              onClick={() =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  inApp: !profile.notificationSettings.inApp,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.notificationSettings.inApp ? 'bg-rose-600 justify-end' : 'bg-stone-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">Browser Notifications</span>
              <span className="text-[11px] text-stone-500">Best-effort notification API alerts</span>
            </div>
            <button
              onClick={() =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  browser: !profile.notificationSettings.browser,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                profile.notificationSettings.browser ? 'bg-rose-600 justify-end' : 'bg-stone-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Quiet Hours Start</label>
            <input
              type="time"
              value={profile.notificationSettings.quietHoursStart || '22:00'}
              onChange={(e) =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  quietHoursStart: e.target.value,
                })
              }
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-300">Quiet Hours End</label>
            <input
              type="time"
              value={profile.notificationSettings.quietHoursEnd || '07:00'}
              onChange={(e) =>
                handleChange('notificationSettings', {
                  ...profile.notificationSettings,
                  quietHoursEnd: e.target.value,
                })
              }
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Local Storage & Offline Backup Vault */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-200 flex items-center">
            <Database className="w-4 h-4 mr-2 text-emerald-400" /> Local Storage &amp; Offline Backup Vault
          </h2>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 100% Offline-First (No Account Needed)
          </span>
        </div>

        {backupStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              backupStatus.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {backupStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{backupStatus.message}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Storage Engine Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">IndexedDB Local Storage Engine</span>
              <span className="text-[11px] text-stone-400">
                All SRS cards, study sessions, and mastery records are saved locally in your browser.
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
              Persistent &amp; Offline
            </span>
          </div>

          {/* Export Backup JSON */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">Export Full Local Backup (.json)</span>
              <span className="text-[11px] text-stone-400">
                Download a complete portable snapshot of your study progress and SRS database.
              </span>
            </div>
            <button
              onClick={handleExportBackup}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </button>
          </div>

          {/* Import Backup JSON */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">Import Local Backup (.json)</span>
              <span className="text-[11px] text-stone-400">
                Restore your previous progress from a JSON snapshot with schema validation.
              </span>
            </div>
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
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-stone-300" />
                <span>Import Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Android & Mobile PWA Installation Guide */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-200 flex items-center">
            <Smartphone className="w-4 h-4 mr-2 text-rose-400" /> Android &amp; Mobile App Support
          </h2>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Standalone PWA Ready
          </span>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Nihongo N2 Master is fully optimized for <strong>Android phones and tablets</strong>. You can run it directly in Chrome, Firefox, or Samsung Internet, or install it as a native home-screen app that works 100% offline.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-850 space-y-1.5">
            <div className="text-xs font-semibold text-stone-200 flex items-center">
              <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center text-[11px] mr-2">1</span>
              Option A: In-Browser Use
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Open the app link in <strong>Chrome</strong> or any Android browser. All lessons, audio playback, and IndexedDB flashcards run locally without needing an account.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-850 space-y-1.5">
            <div className="text-xs font-semibold text-stone-200 flex items-center">
              <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center text-[11px] mr-2">2</span>
              Option B: Home Screen Install
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Tap browser menu <strong className="text-stone-300">⋮</strong> (three dots) &rarr; select <strong className="text-stone-300">Install app</strong> or <strong className="text-stone-300">Add to Home screen</strong>. Launches full-screen like a native app.
            </p>
          </div>
        </div>

        {deferredPrompt && !isInstalled && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleInstallApp}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-rose-950/60 active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install to Android Home Screen</span>
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Currently running as an installed standalone app.</span>
          </div>
        )}
      </div>
    </div>
  );
};
