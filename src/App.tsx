import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserProfile,
  MasteryRecord,
  DailyPlan,
  LessonPack,
} from './domain/models/types';
import { ensureInitialProfile, db } from './data/db/dexie-db';
import { ContentLoader } from './data/content/content-loader';
import { buildDailyPlan } from './domain/scheduler/daily-scheduler';
import { getCardsDueToday } from './domain/srs/srs-scheduler';
import { SystemClock } from './domain/common/clock';
import { BackupManager } from './data/backup/backup-manager';
import { useTimer } from './presentation/hooks/useTimer';

import { Header } from './presentation/components/Header';
import { Navigation } from './presentation/components/Navigation';
import { TimerWidget } from './presentation/components/TimerWidget';

import { HomeScreen } from './presentation/screens/HomeScreen';
import { CurriculumScreen } from './presentation/screens/CurriculumScreen';
import { LessonPlayerScreen } from './presentation/screens/LessonPlayerScreen';
import { SRSReviewScreen } from './presentation/screens/SRSReviewScreen';
import { TestsScreen } from './presentation/screens/TestsScreen';
import { ProgressScreen } from './presentation/screens/ProgressScreen';
import { SettingsScreen } from './presentation/screens/SettingsScreen';
import { KanaTrainerScreen } from './presentation/screens/KanaTrainerScreen';

export default function App() {
  const clock = useMemo(() => new SystemClock(), []);
  const [currentView, setCurrentView] = useState<string>('home');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [masteryRecords, setMasteryRecords] = useState<Record<string, MasteryRecord>>({});
  const [dueSrsCount, setDueSrsCount] = useState<number>(0);
  const [todayStudiedMinutes, setTodayStudiedMinutes] = useState<number>(0);
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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
    // When block finishes, recalculate study minutes
    setTodayStudiedMinutes((prev) => prev + Math.round(durationSec / 60));
  });

  // Load database state & integrity check
  const refreshAppData = useCallback(async () => {
    await BackupManager.checkIntegrityAndAutoRecover();
    const prof = await ensureInitialProfile();
    setProfile(prof);

    const loadedPack = await ContentLoader.getLessonPack('n5.l01');
    setPack(loadedPack);

    const records = await db.mastery_records.toArray();
    const recordsMap: Record<string, MasteryRecord> = {};
    records.forEach((r) => {
      recordsMap[r.lessonId] = r;
    });
    setMasteryRecords(recordsMap);

    const allCards = await db.srs_cards.toArray();
    const due = getCardsDueToday(allCards, clock, prof.dayRolloverHour || 4);
    setDueSrsCount(due.length);

    // Calculate today's studied minutes
    const todayIso = clock.nowIso().substring(0, 10);
    const sessions = await db.study_sessions.toArray();
    const todaySessions = sessions.filter((s) => s.startedAt?.startsWith(todayIso));
    const totalTodaySec = todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    setTodayStudiedMinutes(Math.round(totalTodaySec / 60));

    setLoading(false);
  }, [clock]);

  useEffect(() => {
    refreshAppData();
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
        recentDaysMissed: 0,
        rollingAccuracy14d: {
          vocab: { correct: 0, total: 0 },
          kanji: { correct: 0, total: 0 },
          grammar: { correct: 0, total: 0 },
          reading: { correct: 0, total: 0 },
          listening: { correct: 0, total: 0 },
        },
        skillThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8 },
      },
      clock
    );
  }, [profile, dueSrsCount, clock]);

  if (loading || !profile || !pack) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-stone-300 space-y-3">
        <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">BOOTING NIHONGO N2 MASTER...</span>
      </div>
    );
  }

  const currentMastery = masteryRecords['n5.l01'];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        profile={profile}
        todayMinutes={todayStudiedMinutes}
        onNavigate={setCurrentView}
        isTestActive={isTestActive}
      />

      {/* Navigation Bar */}
      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        dueSrsCount={dueSrsCount}
        hasActiveSession={timerState.state === 'running' || timerState.state === 'paused'}
      />

      {/* Main View Area */}
      <main className="flex-1 px-4 py-6">
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
                onStartStudy={(lessonId) => {
                  if (timerState.state === 'idle') {
                    startBlock('block_vocab_srs', 60);
                  }
                  setCurrentView('player');
                }}
                onOpenSrs={() => setCurrentView('srs')}
                onOpenTests={() => setCurrentView('tests')}
                onNavigate={setCurrentView}
              />
            )}

            {currentView === 'curriculum' && (
              <CurriculumScreen
                onSelectLesson={async (lessonId) => {
                  const loaded = await ContentLoader.getLessonPack(lessonId);
                  if (loaded && loaded.status === 'published') {
                    setPack(loaded);
                    if (timerState.state === 'idle') {
                      startBlock('block_vocab_srs', 60);
                    }
                    setCurrentView('player');
                  }
                }}
                masteryRecords={masteryRecords}
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
                onStartLessonTest={(lessonId) => {
                  if (timerState.state === 'idle') {
                    startBlock('block_test', 60);
                  }
                  setCurrentView('player');
                }}
                onTestActiveChange={setIsTestActive}
              />
            )}

            {currentView === 'progress' && <ProgressScreen />}

            {currentView === 'settings' && (
              <SettingsScreen
                profile={profile}
                onUpdateProfile={setProfile}
                onDataRestored={refreshAppData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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
    </div>
  );
}
