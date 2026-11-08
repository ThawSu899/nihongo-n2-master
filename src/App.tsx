import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserProfile,
  MasteryRecord,
  DailyPlan,
  LessonPack,
  CurriculumMapItem,
  SRSCard,
} from './domain/models/types';
import { ensureInitialProfile, db } from './data/db/dexie-db';
import { ContentLoader } from './data/content/content-loader';
import { buildDailyPlan } from './domain/scheduler/daily-scheduler';
import { getCardsDueToday, calculateTrueRetention } from './domain/srs/srs-scheduler';
import { syncUserStudyStreak } from './domain/analytics/streak-calculator';
import { get14DayRollingAccuracy, Rolling14DayMetrics } from './domain/analytics/rolling-accuracy';
import { SystemClock } from './domain/common/clock';
import { BackupManager } from './data/backup/backup-manager';
import { useTimer } from './presentation/hooks/useTimer';
import { ankiSyncService } from './services/anki-sync';

import { Header } from './presentation/components/Header';
import { Navigation } from './presentation/components/Navigation';
import { TimerWidget } from './presentation/components/TimerWidget';
import { StorageDiagnosticsModal } from './presentation/components/StorageDiagnosticsModal';
import { CommandPaletteModal } from './presentation/components/CommandPaletteModal';
import { KanjiDrawer } from './presentation/components/KanjiDrawer';
import { PWAInstallBanner } from './presentation/components/PWAInstallBanner';
import { N5ReferenceWorkbench } from './presentation/components/N5ReferenceWorkbench';
import { KanjiDetail } from './domain/dictionary/kanji-catalog';
import { useGlobalShortcuts, useScopedShortcuts } from './presentation/context/GlobalShortcutContext';

import { HomeScreen } from './presentation/screens/HomeScreen';
import { CurriculumScreen } from './presentation/screens/CurriculumScreen';
import { LessonPlayerScreen } from './presentation/screens/LessonPlayerScreen';
import { SRSReviewScreen } from './presentation/screens/SRSReviewScreen';
import { TestsScreen } from './presentation/screens/TestsScreen';
import { ProgressScreen } from './presentation/screens/ProgressScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { KanaTrainerScreen } from './presentation/screens/KanaTrainerScreen';
import { ShadowingScreen } from './presentation/screens/ShadowingScreen';
import { QuarantineDrillScreen } from './presentation/screens/QuarantineDrillScreen';

function getNextActiveLessonId(
  curriculum: CurriculumMapItem[],
  records: Record<string, MasteryRecord>,
  preferredLessonId?: string
): string {
  if (preferredLessonId) {
    const savedRecord = records[preferredLessonId];
    // If the saved lesson is not yet mastered/retained, keep it as focus!
    if (!savedRecord || (savedRecord.state !== 'mastered' && savedRecord.state !== 'retained')) {
      return preferredLessonId;
    }
    // If it is mastered, advance to the next sequential published lesson
    const savedIndex = curriculum.findIndex((item) => item.id === preferredLessonId);
    if (savedIndex !== -1) {
      for (let i = savedIndex + 1; i < curriculum.length; i++) {
        if (curriculum[i].status === 'published') {
          return curriculum[i].id;
        }
      }
    }
  }
  // Otherwise, find the first unmastered published lesson
  const firstUnmastered = curriculum.find(
    (item) =>
      item.status === 'published' &&
      (!records[item.id] || (records[item.id].state !== 'mastered' && records[item.id].state !== 'retained'))
  );
  return firstUnmastered?.id || 'n5.l01';
}

export default function App() {
  const clock = useMemo(() => new SystemClock(), []);
  const [currentView, setCurrentView] = useState<string>('home');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [masteryRecords, setMasteryRecords] = useState<Record<string, MasteryRecord>>({});
  const [dueSrsCount, setDueSrsCount] = useState<number>(0);
  const [srsCards, setSrsCards] = useState<SRSCard[]>([]);
  const [todayStudiedMinutes, setTodayStudiedMinutes] = useState<number>(0);
  const [studyStreak, setStudyStreak] = useState<number>(0);
  const [trueRetentionRate, setTrueRetentionRate] = useState<number>(1.0);
  const [rollingMetrics, setRollingMetrics] = useState<Rolling14DayMetrics>({
    rollingAccuracy14d: {
      vocab: { correct: 0, total: 0 },
      kanji: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
    },
    recentDaysMissed: 0,
    totalQuestions: 0,
    totalCorrect: 0,
  });
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [paletteSelectedKanji, setPaletteSelectedKanji] = useState<KanjiDetail | null>(null);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState<boolean>(false);
  const [referenceWorkbenchTab, setReferenceWorkbenchTab] = useState<'counters' | 'expressions' | 'mistakes'>('counters');
  const [loading, setLoading] = useState<boolean>(true);

  const { registerModal, unregisterModal } = useGlobalShortcuts();

  // Modal active tracking
  useEffect(() => {
    if (isCommandPaletteOpen) {
      registerModal('command_palette');
    } else {
      unregisterModal('command_palette');
    }
  }, [isCommandPaletteOpen, registerModal, unregisterModal]);

  useEffect(() => {
    if (isDiagnosticsOpen) {
      registerModal('storage_diagnostics');
    } else {
      unregisterModal('storage_diagnostics');
    }
  }, [isDiagnosticsOpen, registerModal, unregisterModal]);

  useEffect(() => {
    if (Boolean(paletteSelectedKanji)) {
      registerModal('kanji_drawer');
    } else {
      unregisterModal('kanji_drawer');
    }
  }, [paletteSelectedKanji, registerModal, unregisterModal]);

  useEffect(() => {
    if (isReferenceModalOpen) {
      registerModal('n5_reference_workbench');
    } else {
      unregisterModal('n5_reference_workbench');
    }
  }, [isReferenceModalOpen, registerModal, unregisterModal]);

  // Scoped global command palette shortcut
  useScopedShortcuts({
    scopeId: 'app_global',
    handlers: {
      COMMAND_PALETTE: () => {
        setIsCommandPaletteOpen((prev) => !prev);
      },
    },
    priority: 1,
  });

  // Secondary Ctrl+K handler
  useEffect(() => {
    const handleCtrlK = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleCtrlK);
    return () => window.removeEventListener('keydown', handleCtrlK);
  }, []);

  // Timer hook
  const {
    timerState,
    elapsedSec,
    remainingSec,
    isIdlePaused,
    startBlock,
    pauseTimer,
    resumeTimer,
    finishBlock,
    skipBlock,
  } = useTimer((blockId, durationSec) => {
    // When block finishes, recalculate study minutes and refresh app data
    setTodayStudiedMinutes((prev) => prev + Math.round(durationSec / 60));
    refreshAppData();
  });

  // Load database state & integrity check
  const refreshAppData = useCallback(async () => {
    await ContentLoader.autoUpgradeStaleIndexedDB();
    await BackupManager.checkIntegrityAndAutoRecover();
    const prof = await ensureInitialProfile();

    const records = await db.mastery_records.toArray();
    const recordsMap: Record<string, MasteryRecord> = {};
    records.forEach((r) => {
      recordsMap[r.lessonId] = r;
    });
    setMasteryRecords(recordsMap);

    const curriculum = ContentLoader.getCurriculumMap();
    const targetLessonId = getNextActiveLessonId(curriculum, recordsMap, prof.currentLessonId);

    let activeProf = prof;
    if (prof.currentLessonId !== targetLessonId) {
      activeProf = { ...prof, currentLessonId: targetLessonId };
      await db.profile.put({ ...activeProf, id: 'current_user' });
    }

    // Dynamic streak calculation with 04:00 AM rollover & DB persistence
    const rolloverHour = prof.dayRolloverHour || 4;
    const streak = await syncUserStudyStreak(db, rolloverHour, clock.now());
    setStudyStreak(streak);
    if (activeProf.studyStreakDays !== streak) {
      activeProf = { ...activeProf, studyStreakDays: streak };
    }
    setProfile(activeProf);

    // Dynamic 14-day rolling accuracy across all 5 skills & missed days
    const rollingData = await get14DayRollingAccuracy(db, rolloverHour, clock.now());
    setRollingMetrics(rollingData);

    // 30-day true retention metric from review logs
    const logs = await db.review_logs.toArray();
    const retention = calculateTrueRetention(logs, clock);
    setTrueRetentionRate(retention);

    const loadedPack = await ContentLoader.getLessonPack(targetLessonId);
    setPack(loadedPack || (await ContentLoader.getLessonPack('n5.l01')));

    const allCards = await db.srs_cards.toArray();
    setSrsCards(allCards);
    const due = getCardsDueToday(allCards, clock, rolloverHour);
    setDueSrsCount(due.length);

    // Calculate today's studied minutes
    const todayIso = clock.nowIso().substring(0, 10);
    const sessions = await db.study_sessions.toArray();
    const todaySessions = sessions.filter((s) => s.startedAt?.startsWith(todayIso));
    const totalTodaySec = todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    setTodayStudiedMinutes(Math.round(totalTodaySec / 60));

    setLoading(false);
    ankiSyncService.refreshCounts().catch(() => {});
  }, [clock]);

  useEffect(() => {
    refreshAppData();
    ankiSyncService.startAutoSync();
    return () => {
      ankiSyncService.stopAutoSync();
    };
  }, [refreshAppData]);

  // Compute adaptive daily plan
  const dailyPlan: DailyPlan = useMemo(() => {
    return buildDailyPlan(
      {
        level: profile?.level || 'N5',
        currentLessonId: profile?.currentLessonId || 'n5.l01',
        targetDailyMinutes: profile?.dailyTargetMinutes || 360,
        srsDueCount: dueSrsCount,
        srsAvgSecondsPerReview: 15,
        srsDailyCap: profile?.dailyReviewCap || 200,
        recentDaysMissed: rollingMetrics.recentDaysMissed,
        rollingAccuracy14d: rollingMetrics.rollingAccuracy14d,
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
      },
      clock
    );
  }, [profile, dueSrsCount, rollingMetrics, clock]);

  const curriculumMap = useMemo(() => ContentLoader.getCurriculumMap(), []);
  const activeLessonId = profile?.currentLessonId || 'n5.l01';
  const focusedLesson = useMemo(() => {
    return curriculumMap.find((m) => m.id === activeLessonId) || curriculumMap[0];
  }, [curriculumMap, activeLessonId]);

  const currentMastery = focusedLesson ? masteryRecords[focusedLesson.id] : masteryRecords['n5.l01'];

  const handleStartStudy = async (lessonId?: string) => {
    const targetId = lessonId || profile?.currentLessonId || 'n5.l01';
    let targetPack = pack;
    if (!targetPack || targetPack.id !== targetId) {
      let loaded = await ContentLoader.getLessonPack(targetId);
      if (!loaded) {
        loaded = await ContentLoader.getLessonPack(targetId, { forceRefresh: true });
      }
      if (loaded && loaded.status === 'published') {
        targetPack = loaded;
        setPack(loaded);
      }
    }
    if (profile && profile.currentLessonId !== targetId) {
      const updated = { ...profile, currentLessonId: targetId };
      setProfile(updated);
      await db.profile.put({ ...updated, id: 'current_user' });
    }
    if (timerState.state === 'idle') {
      startBlock('block_vocab_srs', 60);
    }
    setCurrentView('player');
  };

  const handleSelectLesson = async (lessonId: string) => {
    let loaded = await ContentLoader.getLessonPack(lessonId);
    if (!loaded) {
      loaded = await ContentLoader.getLessonPack(lessonId, { forceRefresh: true });
    }
    if (loaded && loaded.status === 'published') {
      setPack(loaded);
      if (profile) {
        const updated = { ...profile, currentLessonId: lessonId };
        setProfile(updated);
        await db.profile.put({ ...updated, id: 'current_user' });
      }
      if (timerState.state === 'idle') {
        startBlock('block_vocab_srs', 60);
      }
      setCurrentView('player');
    } else {
      console.error(`[App] Failed to load pack for ${lessonId}`);
    }
  };

  const handleLessonCompleted = async (lessonId: string) => {
    const curriculum = ContentLoader.getCurriculumMap();
    const currentIndex = curriculum.findIndex((m) => m.id === lessonId);
    let nextLessonId: string | null = null;

    if (currentIndex !== -1) {
      for (let i = currentIndex + 1; i < curriculum.length; i++) {
        if (curriculum[i].status === 'published') {
          nextLessonId = curriculum[i].id;
          break;
        }
      }
    }

    // Fallback: search for first unmastered published lesson
    if (!nextLessonId) {
      const records = await db.mastery_records.toArray();
      const masteredMap = new Set(
        records.filter((r) => r.state === 'mastered' || r.state === 'retained').map((r) => r.lessonId)
      );
      const unmastered = curriculum.find(
        (m) => m.status === 'published' && !masteredMap.has(m.id) && m.id !== lessonId
      );
      if (unmastered) {
        nextLessonId = unmastered.id;
      }
    }

    if (nextLessonId && profile) {
      const updated = { ...profile, currentLessonId: nextLessonId };
      setProfile(updated);
      await db.profile.put({ ...updated, id: 'current_user' });
      const nextPack = await ContentLoader.getLessonPack(nextLessonId);
      if (nextPack) {
        setPack(nextPack);
      }
    }
    await refreshAppData();
  };

  if (loading || !profile || !pack) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-stone-300 space-y-3">
        <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">BOOTING NIHONGO N2 MASTER...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 bg-pattern-asanoha flex flex-col md:flex-row font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* Persistent Desktop Sidebar & Mobile Bottom Navigation */}
      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        dueSrsCount={dueSrsCount}
        hasActiveSession={timerState.state === 'running' || timerState.state === 'paused'}
        isTestActive={isTestActive || currentView === 'player'}
        todayMinutes={todayStudiedMinutes}
        goalMinutes={profile.dailyTargetMinutes || 360}
        profile={profile}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          profile={profile}
          todayMinutes={todayStudiedMinutes}
          onNavigate={setCurrentView}
          isTestActive={isTestActive}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
        />

        {/* Main View Area with Bottom Dock Clearance on Mobile */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {currentView === 'home' && (
              <HomeScreen
                profile={profile}
                masteryRecord={currentMastery}
                dailyPlan={dailyPlan}
                dueSrsCount={dueSrsCount}
                todayMinutes={todayStudiedMinutes}
                timerState={timerState}
                onStartStudy={handleStartStudy}
                onOpenSrs={() => setCurrentView('srs')}
                onOpenTests={() => setCurrentView('tests')}
                onNavigate={setCurrentView}
                onOpenReference={(tab) => {
                  setReferenceWorkbenchTab(tab || 'counters');
                  setIsReferenceModalOpen(true);
                }}
                focusedLesson={focusedLesson}
                streakDays={studyStreak}
                trueRetention={trueRetentionRate}
              />
            )}

            {currentView === 'curriculum' && (
              <CurriculumScreen
                onSelectLesson={handleSelectLesson}
                masteryRecords={masteryRecords}
                currentLessonId={profile?.currentLessonId}
                srsCards={srsCards}
              />
            )}

            {currentView === 'kana' && (
              <KanaTrainerScreen onBack={() => setCurrentView('home')} />
            )}

            {currentView === 'player' && (
              <LessonPlayerScreen
                pack={pack}
                profile={profile}
                masteryRecord={currentMastery}
                onMasteryUpdated={(rec) => {
                  setMasteryRecords((prev) => ({ ...prev, [rec.lessonId]: rec }));
                }}
                onExit={() => setCurrentView('home')}
                onLessonCompleted={handleLessonCompleted}
                onBlockProgress={(mins) => setTodayStudiedMinutes((p) => p + mins)}
                onTestActiveChange={setIsTestActive}
              />
            )}

            {currentView === 'srs' && (
              <SRSReviewScreen
                onBack={() => setCurrentView('home')}
                onReviewsCompleted={refreshAppData}
              />
            )}

            {currentView === 'tests' && (
              <TestsScreen
                profile={profile}
                masteryRecord={currentMastery}
                onStartLessonTest={async (lessonId) => {
                  if (lessonId) {
                    await handleStartStudy(lessonId);
                  } else {
                    if (timerState.state === 'idle') {
                      startBlock('block_test', 60);
                    }
                    setCurrentView('player');
                  }
                }}
                onTestActiveChange={setIsTestActive}
              />
            )}

            {currentView === 'progress' && (
              <ProgressScreen
                profile={profile}
                onNavigate={setCurrentView}
              />
            )}

            {currentView === 'settings' && (
              <SettingsScreen
                profile={profile}
                onUpdateProfile={setProfile}
                onDataRestored={refreshAppData}
                onOpenDiagnosticsModal={() => setIsDiagnosticsOpen(true)}
              />
            )}

            {currentView === 'shadowing' && (
              <ShadowingScreen
                pack={pack}
                onBack={() => setCurrentView('home')}
              />
            )}

            {currentView === 'quarantine' && (
              <QuarantineDrillScreen
                onBack={() => {
                  refreshAppData();
                  setCurrentView('home');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Persistent Docked Timer Widget */}
      <TimerWidget
        timerState={timerState}
        elapsedSec={elapsedSec}
        remainingSec={remainingSec}
        isIdlePaused={isIdlePaused}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onFinish={finishBlock}
        onSkip={skipBlock}
        todayStudiedMinutes={todayStudiedMinutes}
      />

      {/* Global PWA Offline Storage & Sync Diagnostics Modal */}
      <StorageDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onDataRestored={refreshAppData}
      />

      {/* Global Command Palette & Quick Dictionary Search (Ctrl+K / Cmd+K / Slash) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onInspectKanji={(k) => setPaletteSelectedKanji(k)}
        onOpenReference={(tab) => {
          setReferenceWorkbenchTab(tab);
          setIsReferenceModalOpen(true);
        }}
      />

      {/* Kanji Drawer for Instant Inspection from Command Palette */}
      <KanjiDrawer
        kanji={paletteSelectedKanji}
        isOpen={Boolean(paletteSelectedKanji)}
        onClose={() => setPaletteSelectedKanji(null)}
      />

      {/* N5 Reference Workbench Modal (Counters, Expressions, Common Traps) */}
      <N5ReferenceWorkbench
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        initialTab={referenceWorkbenchTab}
      />

      {/* Floating PWA Install Prompt Banner */}
      <PWAInstallBanner />
    </div>
  );
}
