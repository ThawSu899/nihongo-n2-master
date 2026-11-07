import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  BookOpen,
  X,
  Activity,
  Archive,
  Clock,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  OfflineSyncManager,
  OfflineStorageDiagnostics,
} from '../../data/sync/offline-sync-manager';
import { BackupManager } from '../../data/backup/backup-manager';
import { AnkiExporter, AnkiExportScope } from '../../data/backup/anki-exporter';
import { AnkiSyncManager } from './AnkiSyncManager';

interface StorageDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const StorageDiagnosticsModal: React.FC<StorageDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [diag, setDiag] = useState<OfflineStorageDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; text: string } | null>(null);
  const [ankiScope, setAnkiScope] = useState<AnkiExportScope>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDiagnostics = async () => {
    try {
      setLoading(true);
      const data = await OfflineSyncManager.getDiagnostics();
      setDiag(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed loading storage diagnostics: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
      setNotification(null);
      setSyncProgress(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Export JSON Backup
  const handleExportBackup = async () => {
    try {
      setActionLoading('export');
      const json = await BackupManager.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nihongo-master-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({
        type: 'success',
        message: 'Complete local JSON backup exported and downloaded successfully.',
      });
      await loadDiagnostics();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Export failed: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Import JSON Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setActionLoading('import');
      const text = await file.text();
      const result = await BackupManager.restoreFromJson(text);
      if (result.success) {
        setNotification({
          type: 'success',
          message: result.message || 'Data successfully restored from backup snapshot.',
        });
        await loadDiagnostics();
        if (onDataRestored) {
          onDataRestored();
        }
      } else {
        setNotification({
          type: 'error',
          message: result.message,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to restore file: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Export to Anki
  const handleExportAnki = async () => {
    try {
      setActionLoading('anki');
      const result = await AnkiExporter.downloadAnkiExport({ scope: ankiScope });
      setNotification({
        type: 'success',
        message: `Exported ${result.count} cards to Anki TSV (${result.filename}).`,
      });
      await loadDiagnostics();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Anki export failed: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Clear Cache & Re-sync
  const handleClearCacheAndResync = async () => {
    if (!window.confirm('Clear temporary lesson cache and re-sync all local IndexedDB indices? Your study records, SRS cards, and profile will be safely preserved and verified.')) {
      return;
    }

    try {
      setActionLoading('resync');
      setNotification(null);
      const res = await OfflineSyncManager.clearCacheAndResync((step) => {
        setSyncProgress({ current: 0, total: 100, text: step });
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message,
        });
        await loadDiagnostics();
        if (onDataRestored) {
          onDataRestored();
        }
      } else {
        setNotification({
          type: 'error',
          message: res.message,
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Re-sync failed: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
      setSyncProgress(null);
    }
  };

  // Pre-cache all published packs
  const handlePrecacheAllPacks = async () => {
    try {
      setActionLoading('precache');
      setNotification(null);
      await OfflineSyncManager.warmAllPublishedPacks((loaded, total, currentId) => {
        setSyncProgress({
          current: loaded,
          total,
          text: `Caching pack ${currentId} (${loaded}/${total})...`,
        });
      });
      setNotification({
        type: 'success',
        message: 'All published lesson packs are now cached offline in IndexedDB.',
      });
      await loadDiagnostics();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Pre-cache failed: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
      setSyncProgress(null);
    }
  };

  // Request Persistent Storage
  const handleRequestPersistence = async () => {
    try {
      setActionLoading('persist');
      const granted = await OfflineSyncManager.requestPersistence();
      if (granted) {
        setNotification({
          type: 'success',
          message: 'Persistent storage granted by browser. Data will not be cleared during low disk space.',
        });
      } else {
        setNotification({
          type: 'info',
          message: 'Browser did not grant persistence or already at system policy level.',
        });
      }
      await loadDiagnostics();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Persistence request failed: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Flush pending offline queue
  const handleFlushQueue = async () => {
    try {
      setActionLoading('queue');
      const res = await OfflineSyncManager.flushPendingQueue();
      setNotification({
        type: 'success',
        message: res.message,
      });
      await loadDiagnostics();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to flush queue: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Subtle decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-rose-500 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-rose-400 shadow-inner">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-100 tracking-tight">
                  PWA Offline Storage &amp; Sync Diagnostics
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono font-medium">
                  IndexedDB Dexie v{diag?.dbStatus.version || 2}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Real-time inspection of local storage quota, cached lesson packs, SRS database, and sync queues.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadDiagnostics}
              disabled={loading || !!actionLoading}
              title="Refresh Diagnostics"
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Notification banner */}
          {notification && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between space-x-2 animate-in fade-in ${
                notification.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                  : notification.type === 'error'
                  ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                  : 'bg-stone-800 border border-stone-700 text-stone-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-stone-400 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-stone-400 hover:text-stone-200 ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Sync Progress Indicator */}
          {syncProgress && (
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-300">
                <span className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  <span>{syncProgress.text}</span>
                </span>
                {syncProgress.total > 0 && (
                  <span className="font-mono text-stone-400">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                )}
              </div>
              {syncProgress.total > 0 && (
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-200"
                    style={{
                      width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Key Health Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Storage Usage & Quota */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-400 flex items-center">
                  <HardDrive className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Storage Quota
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                    diag?.storage.isPersisted
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {diag?.storage.isPersisted ? 'Persisted' : 'Best-effort'}
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-lg font-bold text-stone-100 font-mono">
                    {diag?.storage.usageFormatted || '0 B'}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    / {diag?.storage.quotaFormatted || 'Unknown'}
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-rose-500"
                    style={{ width: `${Math.max(2, Math.min(100, diag?.storage.usagePercentage || 0))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                  <span>{diag?.storage.usagePercentage || 0}% used</span>
                  {!diag?.storage.isPersisted && diag?.storage.persistenceSupported && (
                    <button
                      onClick={handleRequestPersistence}
                      disabled={!!actionLoading}
                      className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Enable Persistent
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Total Cached Lesson Packs & Sync Status */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-400 flex items-center">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> Cached Lesson Packs
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                    diag?.cacheAndSync.syncStatus === 'synced'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {diag?.cacheAndSync.syncStatus === 'synced'
                    ? '100% Synced'
                    : `${diag?.cacheAndSync.syncPercentage || 0}% Cached`}
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-lg font-bold text-stone-100 font-mono">
                    {diag?.cacheAndSync.cachedPacksCount ?? 0}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    / {diag?.cacheAndSync.totalPublishedPacks ?? 0} published
                  </span>
                </div>
                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-emerald-500"
                    style={{ width: `${diag?.cacheAndSync.syncPercentage || 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                  <span>
                    {diag?.cacheAndSync.syncStatus === 'synced'
                      ? 'All packs offline ready'
                      : 'Partial cache'}
                  </span>
                  {diag?.cacheAndSync.syncStatus !== 'synced' && (
                    <button
                      onClick={handlePrecacheAllPacks}
                      disabled={!!actionLoading}
                      className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Pre-cache All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Pending Offline Actions Queue */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-400 flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Pending Offline Queue
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                    (diag?.pendingQueue.count || 0) === 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {(diag?.pendingQueue.count || 0) === 0 ? 'Queue Clear' : 'Pending Actions'}
                </span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-lg font-bold text-stone-100 font-mono">
                    {diag?.pendingQueue.count ?? 0}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    pending operations
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">
                  {diag?.cacheAndSync.isOnline ? 'Online · Live Sync Active' : 'Offline · Storing to Local Queue'}
                </p>
                <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                  <span>
                    {(diag?.pendingQueue.count || 0) > 0 ? 'Awaiting cloud flush' : 'Zero lag'}
                  </span>
                  {(diag?.pendingQueue.count || 0) > 0 && (
                    <button
                      onClick={handleFlushQueue}
                      disabled={!!actionLoading}
                      className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Flush Queue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* System Environment & Network Status Banner */}
          <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-stone-950/70 border border-stone-850 text-xs text-stone-400 gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5">
                {diag?.cacheAndSync.isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-stone-300">Network: Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Network: Offline Mode</span>
                  </>
                )}
              </span>
              <span className="text-stone-700">|</span>
              <span className="flex items-center space-x-1.5">
                {diag?.cacheAndSync.serviceWorkerActive ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-stone-300">PWA Service Worker: Active</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-400">PWA Service Worker: Registered</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-500">
              <span>Database: {diag?.dbStatus.name}</span>
            </div>
          </div>

          {/* IndexedDB Database Tables Inspection Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center">
              <Archive className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> IndexedDB Table Inspection (Live Row Counts)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">SRS Flashcards</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.srsCards ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">FSRS Interval Items</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Mastery Records</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.masteryRecords ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Lesson Progress States</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Kana Records</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.kanaRecords ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Hiragana / Katakana</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Review Logs</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.reviewLogs ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Audit Trails</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Study Sessions</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.studySessions ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Completed Blocks</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Study Events</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.studyEvents ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Telemetry Log</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Mock Assessments</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.assessments ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">JLPT Readiness Tests</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Cached Packs</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.cachedPacks ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Offline Content Packs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Ghost Cards</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.ghostCards ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Leech Remediation</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-850">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Cram Drills</span>
                <span className="text-base font-bold text-stone-100 font-mono">
                  {diag?.tables.cramDrills ?? 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Targeted Practice</span>
              </div>
            </div>
          </div>

          {/* User Profile Inspection */}
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300 flex items-center">
                <UserCheck className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> User Profile State Inspection
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300 font-mono">
                ID: current_user
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 block">Learner Name</span>
                <span className="font-semibold text-stone-200">{diag?.userProfile.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Target Level / Current Focus</span>
                <span className="font-semibold text-stone-200 font-mono">
                  {diag?.userProfile.level} · {diag?.userProfile.currentLessonId}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Daily Goal / Rollover</span>
                <span className="font-semibold text-stone-200 font-mono">
                  {diag?.userProfile.dailyTargetMinutes} min ({(diag?.userProfile.dailyTargetMinutes || 0) / 60}h)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">Target Retention</span>
                <span className="font-semibold text-stone-200 font-mono">
                  {Math.round((diag?.userProfile.targetRetention || 0.9) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Operations Section */}
          <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-rose-400" /> Database &amp; Storage Maintenance Operations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Action 1: Export JSON Backup */}
              <button
                onClick={handleExportBackup}
                disabled={!!actionLoading}
                className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
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
                  className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-md disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-stone-300" />
                  <span>Import JSON Backup</span>
                </button>
              </div>

              {/* Action 3: Clear Cache & Re-sync */}
              <button
                onClick={handleClearCacheAndResync}
                disabled={!!actionLoading}
                className="flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-stone-850 hover:bg-rose-950 hover:border-rose-800 hover:text-rose-200 text-stone-300 border border-stone-800 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading === 'resync' ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
                <span>Clear Cache &amp; Re-sync</span>
              </button>
            </div>

            {/* Anki Live Connection Status & Bridge */}
            <AnkiSyncManager className="mt-2.5" />

            {/* Anki Flashcard Deck Exporter Section */}
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/90 space-y-2.5 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-stone-200">
                      Export to Anki (.tsv)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-mono">
                      8-Field Note Directives
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    TSV format ready for direct import into Anki Desktop and AnkiMobile with full tags and formatting.
                  </p>
                </div>

                <button
                  onClick={handleExportAnki}
                  disabled={!!actionLoading}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-md shadow-indigo-950/60 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{actionLoading === 'anki' ? 'Exporting...' : 'Download Anki TSV'}</span>
                </button>
              </div>

              {/* Scope filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-stone-400 font-mono uppercase">Scope:</span>
                <button
                  type="button"
                  onClick={() => setAnkiScope('all')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    ankiScope === 'all'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                  }`}
                >
                  All Cards ({diag?.tables.srsCards ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setAnkiScope('mined')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    ankiScope === 'mined'
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                  }`}
                >
                  Mined Cards Only
                </button>
                <button
                  type="button"
                  onClick={() => setAnkiScope('leeches')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                    ankiScope === 'leeches'
                      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                  }`}
                >
                  Quarantined Leeches Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs text-stone-400">
          <span className="text-[11px] text-stone-500">
            Last Checked: {diag ? new Date(diag.timestamp).toLocaleTimeString() : 'Just now'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
