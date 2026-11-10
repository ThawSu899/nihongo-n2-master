import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Layers,
  Radio,
  Laptop,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AnkiConnectClient } from '../../data/backup/anki-connect';
import {
  ankiSyncService,
  AnkiSyncStatus,
  DEFAULT_ANKI_TARGET_DECK,
} from '../../services/anki-sync';

export type AnkiConnectionStatus = 'checking' | 'connected' | 'disconnected';

export interface AnkiSyncManagerProps {
  className?: string;
  onStatusChange?: (status: AnkiConnectionStatus) => void;
}

export const AnkiSyncManager: React.FC<AnkiSyncManagerProps> = ({
  className = '',
  onStatusChange,
}) => {
  const [syncStatus, setSyncStatus] = useState<AnkiSyncStatus>(ankiSyncService.getStatus());
  const [showDeckList, setShowDeckList] = useState<boolean>(false);
  const [recentSyncMessage, setRecentSyncMessage] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customDeckInput, setCustomDeckInput] = useState<string>('');
  const [deckSearchQuery, setDeckSearchQuery] = useState<string>('');

  // Subscribe to AnkiSyncService updates
  useEffect(() => {
    const unsubscribe = ankiSyncService.subscribe((status) => {
      setSyncStatus(status);
      const conn: AnkiConnectionStatus = status.isChecking
        ? 'checking'
        : status.isConnected
        ? 'connected'
        : 'disconnected';
      onStatusChange?.(conn);
    });

    // Initial check on mount
    ankiSyncService.checkConnection();
    ankiSyncService.refreshCounts();

    return () => {
      unsubscribe();
    };
  }, [onStatusChange]);

  const handleTestConnection = useCallback(async () => {
    await ankiSyncService.checkConnection();
    await ankiSyncService.refreshCounts();
  }, []);

  const handleSyncNow = useCallback(async () => {
    setRecentSyncMessage(null);
    const result = await ankiSyncService.syncNow();
    if (result.success) {
      if (result.syncedCount > 0) {
        setRecentSyncMessage(`✓ ကတ် ${result.syncedCount} ခုကို Anki Desktop သို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။`);
      } else {
        setRecentSyncMessage('✓ အသစ်ထည့်သွင်းရန် ကတ်မရှိပါ (ကတ်အားလုံး Sync လုပ်ပြီးဖြစ်ပါသည်)။');
      }
    }
  }, []);

  const handleToggleAutoSync = useCallback(() => {
    ankiSyncService.toggleAutoSync();
  }, []);

  const handleSelectDeck = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomMode(true);
      setCustomDeckInput(syncStatus.targetDeck || DEFAULT_ANKI_TARGET_DECK);
    } else if (val) {
      ankiSyncService.setTargetDeck(val);
      setIsCustomMode(false);
      setRecentSyncMessage(`✓ အသုံးပြုမည့် Deck အဖြစ် "${val}" ကို သတ်မှတ်လိုက်ပါပြီ။`);
    }
  }, [syncStatus.targetDeck]);

  const handleSaveCustomDeck = useCallback(() => {
    const trimmed = customDeckInput.trim();
    if (trimmed) {
      ankiSyncService.setTargetDeck(trimmed);
      setIsCustomMode(false);
      setRecentSyncMessage(`✓ အသုံးပြုမည့် Deck အဖြစ် "${trimmed}" ကို သတ်မှတ်လိုက်ပါပြီ။`);
    }
  }, [customDeckInput]);

  const handleCancelCustomMode = useCallback(() => {
    setIsCustomMode(false);
    setCustomDeckInput('');
  }, []);

  const filteredDecks = useMemo(() => {
    const base = syncStatus.availableDecks;
    if (!deckSearchQuery.trim()) return base;
    const q = deckSearchQuery.toLowerCase();
    return base.filter((d) => d.toLowerCase().includes(q));
  }, [syncStatus.availableDecks, deckSearchQuery]);

  const connectionStatus: AnkiConnectionStatus = syncStatus.isChecking
    ? 'checking'
    : syncStatus.isConnected
    ? 'connected'
    : 'disconnected';

  // Card style based on status
  const cardTheme = {
    connected: {
      border: 'border-emerald-200',
      glow: 'shadow-xs',
      bg: 'bg-emerald-50/40',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      indicator: 'bg-emerald-500',
    },
    disconnected: {
      border: 'border-stone-200',
      glow: 'shadow-xs',
      bg: 'bg-white',
      badge: 'bg-stone-100 text-stone-600 border-stone-200',
      indicator: 'bg-rose-500',
    },
    checking: {
      border: 'border-amber-200',
      glow: 'shadow-xs',
      bg: 'bg-amber-50/40',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      indicator: 'bg-amber-500',
    },
  }[connectionStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${cardTheme.border} ${cardTheme.bg} ${cardTheme.glow} backdrop-blur-md p-4 sm:p-5 transition-all duration-300 ${className}`}
    >
      {/* Header Row: Title, Port Badge & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide">
              Anki Desktop Live Bridge & Auto-Sync
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-mono">
              http://localhost:8765
            </span>
          </div>
          <p className="text-[11px] text-stone-600">
            AnkiConnect REST API အခြေအနေ၊ ကတ်များ Auto-Sync နှင့် Deck စီမံမှု
          </p>
        </div>

        {/* Action Buttons: Sync Now & Test Connection */}
        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0 flex-wrap gap-y-2">
          {/* Sync Now Button */}
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={!syncStatus.isConnected || syncStatus.isSyncing}
            className={`inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs ${
              syncStatus.isConnected
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-stone-100 text-stone-400 border border-stone-200'
            }`}
          >
            {syncStatus.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span className="font-myanmar">
              {syncStatus.isSyncing
                ? syncStatus.retryAttempt > 0
                  ? `ပြန်ကြိုးစားနေဆဲ (${syncStatus.retryAttempt}/${syncStatus.maxRetries})...`
                  : 'Sync လုပ်နေသည်...'
                : 'Sync Now (အခုပဲ တင်မည်)'}
            </span>
            {syncStatus.queueCount > 0 && !syncStatus.isSyncing && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-[10px] font-mono text-indigo-700 border border-indigo-200">
                {syncStatus.queueCount}
              </span>
            )}
          </button>

          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={syncStatus.isChecking || syncStatus.isSyncing}
            className="inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-stone-500 ${
                syncStatus.isChecking ? 'animate-spin text-amber-500' : ''
              }`}
            />
            <span className="font-myanmar">စစ်ဆေးမည်</span>
          </button>
        </div>
      </div>

      {/* Main Status Display Banner */}
      <div className="pt-3.5 space-y-3">
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
          {/* Status Label */}
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              {connectionStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              {connectionStatus === 'checking' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${cardTheme.indicator}`}
              ></span>
            </span>

            <div className="text-xs sm:text-sm font-bold font-myanmar leading-relaxed">
              {connectionStatus === 'connected' && (
                <span className="text-emerald-700">
                  🟢 Anki ချိတ်ဆက်ထားပါသည် (Connected)
                </span>
              )}
              {connectionStatus === 'disconnected' && (
                <span className="text-rose-700">
                  🔴 Anki Desktop ကို ဖွင့်ရန် လိုအပ်ပါသည် (Disconnected)
                </span>
              )}
              {connectionStatus === 'checking' && (
                <span className="text-amber-700">
                  🟡 Anki ချိတ်ဆက်မှုကို စစ်ဆေးနေပါသည်...
                </span>
              )}
            </div>
          </div>

          {/* Latency & Timestamp Badge */}
          {syncStatus.lastCheckedTime && (
            <div className="flex items-center space-x-2 text-[10px] text-stone-600 font-mono">
              {syncStatus.latencyMs !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                  {syncStatus.latencyMs}ms
                </span>
              )}
              <span>{new Date(syncStatus.lastCheckedTime).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Sync Metric Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Pending in Queue */}
          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-stone-600 font-myanmar">တန်းစီဇယား (Queue)</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className={`text-base font-bold font-mono ${syncStatus.queueCount > 0 ? 'text-amber-700' : 'text-stone-800'}`}>
                {syncStatus.queueCount}
              </span>
              <span className="text-[10px] text-stone-500 font-myanmar">ကတ်</span>
            </div>
          </div>

          {/* Total Synced */}
          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-stone-600 font-myanmar">Anki သို့ တင်ပြီး (Synced)</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-base font-bold font-mono text-emerald-700">
                {syncStatus.syncedCount}
              </span>
              <span className="text-[10px] text-stone-500 font-myanmar">ကတ်</span>
            </div>
          </div>

          {/* Last Sync Time */}
          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex flex-col justify-between shadow-xs">
            <span className="text-[10px] text-stone-600 font-myanmar">နောက်ဆုံး Sync ချိန်</span>
            <span className="text-xs font-mono text-stone-800 mt-1 truncate">
              {syncStatus.lastSyncTime
                ? new Date(syncStatus.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'မရှိသေးပါ'}
            </span>
          </div>

          {/* Auto-Sync Toggle Status */}
          <button
            type="button"
            onClick={handleToggleAutoSync}
            className={`p-2.5 rounded-xl border flex flex-col justify-between text-left transition cursor-pointer shadow-xs ${
              syncStatus.autoSyncActive
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60'
                : 'bg-white border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] text-stone-600 font-myanmar">Auto-Sync</span>
              <Zap className={`w-3 h-3 ${syncStatus.autoSyncActive ? 'text-emerald-600 animate-pulse' : 'text-stone-400'}`} />
            </div>
            <span className={`text-xs font-semibold mt-1 ${syncStatus.autoSyncActive ? 'text-emerald-700' : 'text-stone-500'}`}>
              {syncStatus.autoSyncActive ? 'ဖွင့်ထားသည် (Active)' : 'ပိတ်ထားသည်'}
            </span>
          </button>
        </div>

        {/* Target Deck (ရည်ရွယ်ရာ Deck) Selector Row */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-stone-900">
                Target Deck (ရည်ရွယ်ရာ Deck):
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[11px] font-bold shadow-2xs">
                {syncStatus.targetDeck || DEFAULT_ANKI_TARGET_DECK}
              </span>
            </div>

            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => {
                  setCustomDeckInput(syncStatus.targetDeck || DEFAULT_ANKI_TARGET_DECK);
                  setIsCustomMode(true);
                }}
                className="text-[11px] text-stone-600 hover:text-indigo-600 transition flex items-center space-x-1 cursor-pointer self-start sm:self-auto font-myanmar"
              >
                <span>+ အမည်သစ် ရိုက်ထည့်မည်</span>
              </button>
            ) : null}
          </div>

          {!isCustomMode ? (
            <div className="space-y-2">
              {/* If user has many decks (e.g. > 6), provide search filter */}
              {syncStatus.availableDecks.length > 6 && (
                <div className="relative">
                  <input
                    type="text"
                    value={deckSearchQuery}
                    onChange={(e) => setDeckSearchQuery(e.target.value)}
                    placeholder="Deck အမည် ရှာဖွေရန် (Search decks)..."
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {deckSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDeckSearchQuery('')}
                      className="absolute right-2 top-1.5 text-[10px] text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Deck Dropdown Selector */}
              <select
                value={syncStatus.targetDeck || DEFAULT_ANKI_TARGET_DECK}
                onChange={handleSelectDeck}
                aria-label="Target Anki Deck"
                className="w-full bg-white border border-stone-200 hover:border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
              >
                {/* Ensure current target deck is visible in options if not in filtered list */}
                {syncStatus.targetDeck && !filteredDecks.includes(syncStatus.targetDeck) && (
                  <option value={syncStatus.targetDeck}>
                    ★ {syncStatus.targetDeck} (Current Target)
                  </option>
                )}

                {/* Default fallback option if list empty */}
                {filteredDecks.length === 0 && !syncStatus.targetDeck && (
                  <option value={DEFAULT_ANKI_TARGET_DECK}>
                    {DEFAULT_ANKI_TARGET_DECK}
                  </option>
                )}

                {/* Render fetched / available decks */}
                {filteredDecks.map((deck) => (
                  <option key={deck} value={deck}>
                    {deck}
                  </option>
                ))}

                <option value="__CUSTOM__">
                  ✍️ Custom Deck Name... (စိတ်ကြိုက်အမည် ရိုက်ထည့်မည်)
                </option>
              </select>
            </div>
          ) : (
            /* Custom Deck Name Input Form */
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={customDeckInput}
                onChange={(e) => setCustomDeckInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveCustomDeck();
                  } else if (e.key === 'Escape') {
                    handleCancelCustomMode();
                  }
                }}
                placeholder="e.g. Japanese::N5 Bootcamp"
                autoFocus
                className="flex-1 bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono shadow-2xs"
              />
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveCustomDeck}
                  disabled={!customDeckInput.trim()}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs font-myanmar"
                >
                  အတည်ပြုမည် (Save)
                </button>
                <button
                  type="button"
                  onClick={handleCancelCustomMode}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs transition cursor-pointer font-myanmar shadow-xs"
                >
                  မလုပ်တော့ပါ
                </button>
              </div>
            </div>
          )}

          {/* Active target deck confirmation text */}
          <div className="text-[11px] text-stone-600 font-myanmar flex items-center space-x-1.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>
              Auto-Sync နှင့် Manual Sync ပြုလုပ်ချိန်တွင် ကတ်များကို <strong className="text-stone-900 font-mono">{syncStatus.targetDeck || DEFAULT_ANKI_TARGET_DECK}</strong> ထဲသို့ တိုက်ရိုက်ထည့်သွင်းပေးပါမည်။
            </span>
          </div>
        </div>

        {/* Sync Success Notification Banner */}
        <AnimatePresence>
          {recentSyncMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-myanmar flex items-center space-x-2 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{recentSyncMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Retry / Error Banner with Exponential Backoff Indicator */}
        <AnimatePresence>
          {syncStatus.error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center space-x-2 shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{syncStatus.error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connected View: Deck Count & Expandable Deck List */}
        {connectionStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-800">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span className="font-myanmar font-medium">
                  ရရှိနိုင်သော Deck အရေအတွက် (Available Decks):
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {syncStatus.availableDecks.length}
                </span>
                <span className="text-stone-600 font-myanmar">ခု</span>
              </div>

              {syncStatus.availableDecks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeckList((prev) => !prev)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 cursor-pointer transition font-medium"
                >
                  <span>{showDeckList ? 'ဝှက်မည်' : 'အသေးစိတ် ကြည့်မည်'}</span>
                  {showDeckList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Expandable Deck Names Pill List */}
            <AnimatePresence>
              {showDeckList && syncStatus.availableDecks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="pt-2 border-t border-stone-200 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1"
                >
                  {syncStatus.availableDecks.map((deck) => (
                    <span
                      key={deck}
                      className="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-[11px] font-mono shadow-2xs"
                    >
                      {deck}
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Disconnected View: Troubleshooting Instructions */}
        {connectionStatus === 'disconnected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-2 text-xs"
          >
            <div className="flex items-center space-x-2 text-rose-800 font-medium">
              <Laptop className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-myanmar">ချိတ်ဆက်နိုင်ရန် အောက်ပါအချက်များကို စစ်ဆေးပါ:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-700 font-myanmar pl-1 text-[11px] leading-relaxed">
              <li>သင့် Laptop/PC တွင် <strong>Anki Desktop</strong> ကို ဖွင့်ထားပါ။</li>
              <li>
                Anki Desktop တွင် <strong>AnkiConnect Add-on</strong> (Code: <code className="font-mono text-rose-700 bg-white border border-rose-200 px-1 py-0.5 rounded">2055492159</code>) ထည့်သွင်းထားရပါမည်။
              </li>
              <li>
                Local Port <code className="font-mono text-stone-800 bg-white border border-stone-200 px-1 py-0.5 rounded">8765</code> (http://localhost:8765) ပွင့်နေပြီး Web CORS ခွင့်ပြုထားကြောင်း စစ်ဆေးပါ။
              </li>
            </ul>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
