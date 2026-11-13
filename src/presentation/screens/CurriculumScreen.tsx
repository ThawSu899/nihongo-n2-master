import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Lock,
  Play,
  CheckCircle,
  Search,
  Sparkles,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { ContentLoader } from '../../data/content/content-loader';
import { db } from '../../data/db/dexie-db';
import { CurriculumMapItem, MasteryRecord, SRSCard } from '../../domain/models/types';

interface CurriculumScreenProps {
  onSelectLesson: (lessonId: string) => void;
  masteryRecords: Record<string, MasteryRecord>;
  currentLessonId?: string;
  initialLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  srsCards?: SRSCard[];
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onSelectLesson,
  masteryRecords,
  currentLessonId,
  initialLevel = 'N5',
  srsCards,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'N5' | 'N4' | 'N3' | 'N2'>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedCards, setLoadedCards] = useState<SRSCard[]>(srsCards || []);

  // Fetch SRS cards from indexedDB if not provided or to stay up-to-date
  useEffect(() => {
    if (srsCards && srsCards.length > 0) {
      setLoadedCards(srsCards);
      return;
    }
    let isMounted = true;
    db.srs_cards
      .toArray()
      .then((cards) => {
        if (isMounted) {
          setLoadedCards(cards);
        }
      })
      .catch((err) => {
        console.warn('Failed to load srs_cards for curriculum:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [srsCards, masteryRecords]);

  // Group SRS cards by lessonId for fast lookup
  const cardsByLesson = useMemo(() => {
    const map: Record<string, SRSCard[]> = {};
    for (const card of loadedCards) {
      if (!map[card.lessonId]) {
        map[card.lessonId] = [];
      }
      map[card.lessonId].push(card);
    }
    return map;
  }, [loadedCards]);

  const allItems = useMemo(() => {
    return ContentLoader.getCurriculumMap().map((item) => ({
      ...item,
      status: 'published' as const,
    }));
  }, []);

  const filteredItems = allItems.filter((item) => {
    const matchesLevel = item.level === selectedLevel;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grammarTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const levelCounts: Record<'N5' | 'N4' | 'N3' | 'N2', number> = {
    N5: 30,
    N4: 36,
    N3: 48,
    N2: 60,
  };

  // Level-wide completion statistics
  const levelAllItems = useMemo(
    () => allItems.filter((i) => i.level === selectedLevel),
    [allItems, selectedLevel]
  );
  const levelPublishedItems = useMemo(
    () => levelAllItems.filter((i) => i.status === 'published'),
    [levelAllItems]
  );
  const levelCompletedCount = useMemo(() => {
    return levelAllItems.filter((i) => {
      const m = masteryRecords[i.id];
      return m?.state === 'mastered' || m?.state === 'retained' || Boolean(m?.passedThresholds);
    }).length;
  }, [levelAllItems, masteryRecords]);

  const levelPercent =
    levelPublishedItems.length > 0
      ? Math.round((levelCompletedCount / levelPublishedItems.length) * 100)
      : 0;

  const levelTotalSrsMastered = useMemo(() => {
    let count = 0;
    for (const item of levelAllItems) {
      const m = masteryRecords[item.id];
      const isM = m?.state === 'mastered' || m?.state === 'retained' || Boolean(m?.passedThresholds);
      const lCards = cardsByLesson[item.id] || [];
      const packCapacity = Math.max(lCards.length, item.targetVocabCount * 2 + item.targetKanjiCount, 1);
      if (isM) {
        count += packCapacity;
      } else if (lCards.length > 0) {
        count += lCards.filter((c) => c.state === 'review' || c.repetition >= 1 || c.intervalDays >= 1).length;
      }
    }
    return count;
  }, [levelAllItems, masteryRecords, cardsByLesson]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Curriculum Map (174 Lessons)</h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Complete N5 → N2 curriculum across 174 lesson packs. AI-assisted editorial authoring, not human-reviewed.
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex bg-stone-200/80 border border-stone-300 rounded-2xl p-1.5 shrink-0 shadow-2xs relative">
          {(['N5', 'N4', 'N3', 'N2'] as const).map((lvl) => {
            const isLvlActive = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-colors duration-200 cursor-pointer ${
                  isLvlActive ? 'text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {isLvlActive && (
                  <motion.div
                    layoutId="activeCurriculumLevel"
                    className="absolute inset-0 bg-indigo-600 rounded-xl shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {lvl} ({levelCounts[lvl]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Level Overview Progress Summary */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {selectedLevel} Track
            </span>
            <span className="text-sm font-semibold text-stone-900">
              Level Mastery Overview
            </span>
          </div>
          <p className="text-xs text-stone-600">
            {levelCompletedCount} of {levelPublishedItems.length} published lessons mastered ({levelPercent}%) • {levelTotalSrsMastered} SRS cards retained
          </p>
        </div>
        <div className="sm:w-72 space-y-2">
          <div className="flex justify-between text-xs text-stone-600 font-mono">
            <span>Overall Level Progress</span>
            <span className="text-emerald-700 font-semibold">{levelPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-stone-100 border border-stone-200 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(levelPercent > 0 ? 3 : 0, levelPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search in ${selectedLevel} lessons, topics, grammar...`}
          className="w-full bg-white border border-stone-300 rounded-2xl pl-11 pr-4 py-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-indigo-500 shadow-2xs font-japanese"
        />
      </div>

      {/* Lessons List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isPlayable = item.status === 'published';
          const mastery = masteryRecords[item.id];
          const isMastered =
            mastery?.state === 'mastered' ||
            mastery?.state === 'retained' ||
            Boolean(mastery?.passedThresholds);
          const isCurrentFocus = Boolean(currentLessonId && item.id === currentLessonId);
          const isInProgress = !isMastered && (mastery?.state === 'learning' || mastery?.state === 'familiar');

          // SRS card calculations
          const lessonCards = cardsByLesson[item.id] || [];
          const targetCardsCount = item.targetVocabCount * 2 + item.targetKanjiCount;
          const totalPackCards = Math.max(lessonCards.length, targetCardsCount > 0 ? targetCardsCount : 24);

          let masteredCardsCount = 0;
          if (lessonCards.length > 0) {
            masteredCardsCount = lessonCards.filter(
              (c) => c.state === 'review' || c.repetition >= 1 || c.intervalDays >= 1
            ).length;
          }

          let displayMastered = masteredCardsCount;
          let masteryPercentage = 0;

          if (isMastered) {
            displayMastered = totalPackCards;
            masteryPercentage = 100;
          } else if (lessonCards.length > 0) {
            displayMastered = Math.min(masteredCardsCount, totalPackCards);
            masteryPercentage = Math.min(100, Math.round((displayMastered / totalPackCards) * 100));
          } else if (mastery?.scores?.overall) {
            masteryPercentage = Math.min(100, Math.round(mastery.scores.overall * 100));
            displayMastered = Math.round((masteryPercentage / 100) * totalPackCards);
          } else if (isInProgress) {
            masteryPercentage = Math.max(12, Math.round((displayMastered / totalPackCards) * 100));
            displayMastered = Math.max(displayMastered, Math.round((masteryPercentage / 100) * totalPackCards));
          }

          // Distinct card styling
          let cardStyle = 'bg-stone-100/70 border-stone-200 text-stone-400 opacity-60';
          if (isPlayable) {
            if (isCurrentFocus) {
              cardStyle = 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md';
            } else if (isMastered) {
              cardStyle = 'bg-white border-stone-200 hover:border-emerald-400 shadow-sm';
            } else if (isInProgress) {
              cardStyle = 'bg-white border-stone-200 hover:border-amber-400 shadow-sm';
            } else {
              cardStyle = 'bg-white border-stone-200 hover:border-stone-300 shadow-sm';
            }
          }

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLesson(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLesson(item.id);
                }
              }}
              aria-label={`Study lesson ${item.number}: ${item.title}`}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] select-none ${cardStyle}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
                    {item.id} • Lesson {item.number}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {item.reviewStatus && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-medium">
                        {item.reviewStatus === 'human-reviewed' ? 'Human-Reviewed' : 'AI-Authored'}
                      </span>
                    )}

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        item.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-500 border border-stone-200'
                      }`}
                    >
                      {item.status === 'published' ? 'Published' : 'Planned'}
                    </span>

                    {/* Status Badges: Completed, Current Focus, In Progress, Ready, Locked */}
                    {!isPlayable ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-stone-400" />
                        Locked
                      </span>
                    ) : isMastered ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Completed
                      </span>
                    ) : isCurrentFocus ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Current Focus
                      </span>
                    ) : isInProgress ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                        In Progress
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-semibold">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                <h3 className={`text-sm font-semibold leading-snug ${isPlayable ? 'text-stone-900' : 'text-stone-500'}`}>
                  {item.title}
                </h3>

                <p className="text-[11px] text-stone-600">
                  {item.grammarTopics.join(' • ')}
                </p>

                <div className="flex items-center space-x-3 text-[10px] text-stone-500 pt-0.5">
                  <span>Target Kanji: {item.targetKanjiCount}</span>
                  <span>•</span>
                  <span>Target Vocab: {item.targetVocabCount}</span>
                </div>

                {/* Visual Progress Bar & Mastery Percentage */}
                <div className="pt-2 pb-0.5 space-y-1.5 border-t border-stone-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <Layers className="w-3 h-3 text-stone-400" />
                      <span>SRS Mastery</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span
                        className={
                          isMastered
                            ? 'text-emerald-700 font-bold'
                            : isCurrentFocus
                            ? 'text-indigo-700 font-medium'
                            : isInProgress
                            ? 'text-amber-800 font-medium'
                            : 'text-stone-500'
                        }
                      >
                        {isPlayable ? `${displayMastered} / ${totalPackCards} cards` : `${totalPackCards} cards planned`}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isMastered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isCurrentFocus
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isInProgress
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {masteryPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div
                    role="progressbar"
                    aria-valuenow={masteryPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.title} SRS mastery: ${masteryPercentage}%`}
                    className="w-full h-2 bg-stone-100 border border-stone-200 rounded-full overflow-hidden p-0.5"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isMastered
                          ? 'bg-emerald-600'
                          : isCurrentFocus
                          ? 'bg-indigo-600'
                          : isInProgress
                          ? 'bg-amber-500'
                          : masteryPercentage > 0
                          ? 'bg-stone-400'
                          : 'bg-stone-200'
                      }`}
                      style={{ width: `${Math.max(masteryPercentage > 0 ? 3 : 0, masteryPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-stone-200 flex items-center justify-between">
                {isPlayable ? (
                  <>
                    <div className="text-xs font-medium">
                      {isMastered ? (
                        <span className="text-emerald-700 flex items-center gap-1.5 text-[11px] font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mastered (100%)</span>
                        </span>
                      ) : isCurrentFocus ? (
                        <span className="text-indigo-700 flex items-center gap-1.5 text-[11px] font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Current Focus • {masteryPercentage}%</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="text-amber-800 text-[11px] font-medium">
                          In Progress • {masteryPercentage}%
                        </span>
                      ) : (
                        <span className="text-stone-500 text-[11px]">Ready to start • 0%</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLesson(item.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-xs cursor-pointer ${
                        isCurrentFocus
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : isMastered
                          ? 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isMastered ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isCurrentFocus ? 'Study Now' : 'Study'}</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between text-[11px] text-stone-500">
                    <span className="italic">Outline only — content not yet available</span>
                    <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
