import React, { useState } from 'react';
import { BookOpen, Lock, Play, CheckCircle, Search, Filter } from 'lucide-react';
import { ContentLoader } from '../../data/content/content-loader';
import { CurriculumMapItem, MasteryRecord } from '../../domain/models/types';

interface CurriculumScreenProps {
  onSelectLesson: (lessonId: string) => void;
  masteryRecords: Record<string, MasteryRecord>;
  initialLevel?: 'N5' | 'N4' | 'N3' | 'N2';
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({
  onSelectLesson,
  masteryRecords,
  initialLevel = 'N5',
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'N5' | 'N4' | 'N3' | 'N2'>(initialLevel);
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = ContentLoader.getCurriculumMap();

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Curriculum Map (174 Lessons)</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Complete N5 → N2 curriculum across 174 lesson packs. AI-assisted editorial authoring, not human-reviewed.
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 shrink-0">
          {(['N5', 'N4', 'N3', 'N2'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedLevel === lvl
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {lvl} ({levelCounts[lvl]})
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search in ${selectedLevel} lessons, topics, grammar...`}
          className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* Lessons List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isPlayable = item.status === 'published';
          const mastery = masteryRecords[item.id];
          const isMastered = mastery?.state === 'mastered' || mastery?.state === 'retained';

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition ${
                isPlayable
                  ? 'bg-stone-900/90 border-stone-700/80 shadow-md hover:border-rose-500/80'
                  : 'bg-stone-950/40 border-stone-900/80 text-stone-500'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-semibold">
                    {item.id} • Lesson {item.number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {item.reviewStatus && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-medium">
                        {item.reviewStatus === 'human-reviewed' ? 'Human-Reviewed' : 'AI-Authored'}
                      </span>
                    )}
                    {isPlayable ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-500 border border-stone-800">
                        Planned
                      </span>
                    )}
                  </div>
                </div>

                <h3 className={`text-sm font-semibold leading-snug ${isPlayable ? 'text-stone-100' : 'text-stone-400'}`}>
                  {item.title}
                </h3>

                <p className="text-[11px] text-stone-400">
                  {item.grammarTopics.join(' • ')}
                </p>

                <div className="flex items-center space-x-3 text-[10px] text-stone-500 pt-1">
                  <span>Target Kanji: {item.targetKanjiCount}</span>
                  <span>•</span>
                  <span>Target Vocab: {item.targetVocabCount}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                {isPlayable ? (
                  <>
                    <div className="text-xs font-medium">
                      {isMastered ? (
                        <span className="text-emerald-400 flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mastered
                        </span>
                      ) : mastery?.state === 'learning' ? (
                        <span className="text-amber-400 font-mono text-[11px]">In Progress</span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Ready to start</span>
                      )}
                    </div>
                    <button
                      onClick={() => onSelectLesson(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Study</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between text-[11px] text-stone-500">
                    <span className="italic">Outline only — content not yet available</span>
                    <Lock className="w-3.5 h-3.5 text-stone-600 shrink-0" />
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
