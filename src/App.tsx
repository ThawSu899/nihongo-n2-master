import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserProfile,
  MasteryRecord,
  DailyPlan,
  LessonPack,
  CurriculumMapItem,
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
    setProfile(activeProf);

    const loadedPack = await ContentLoader.getLessonPack(targetLessonId);
    setPack(loadedPack || (await ContentLoader.getLessonPack('n5.l01')));

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
      const loaded = await ContentLoader.getLessonPack(targetId);
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
    const loaded = await ContentLoader.getLessonPack(lessonId);
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
                onStartStudy={handleStartStudy}
                onOpenSrs={() => setCurrentView('srs')}
                onOpenTests={() => setCurrentView('tests')}
                onNavigate={setCurrentView}
                focusedLesson={focusedLesson}
              />
            )}

            {currentView === 'curriculum' && (
              <CurriculumScreen
                onSelectLesson={handleSelectLesson}
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
