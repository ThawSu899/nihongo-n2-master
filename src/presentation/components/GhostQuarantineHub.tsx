import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { GhostCardRecord } from '../../domain/models/types';
import { GhostScheduler, GHOST_STAGE_INTERVALS_HOURS } from '../../domain/srs/ghost-scheduler';

export interface GhostQuarantineHubProps {
  onStartGhostReview?: (ghost: GhostCardRecord) => void;
  onRefreshParentQueue?: () => void;
}

export const GhostQuarantineHub: React.FC<GhostQuarantineHubProps> = ({
  onStartGhostReview,
  onRefreshParentQueue,
}) => {
  const [ghosts, setGhosts] = useState<GhostCardRecord[]>([]);
  const [conqueredCount, setConqueredCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadGhostData = async () => {
    setLoading(true);
    try {
      const active = await GhostScheduler.getActiveGhosts();
      const conquered = await GhostScheduler.getConqueredCount();
      // Sort: due first, then stage descending
      active.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
      setGhosts(active);
      setConqueredCount(conquered);
    } catch (e) {
      console.error('Failed to load ghost cards', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGhostData();
  }, []);

  const handleExorcise = async (ghostId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await GhostScheduler.exorciseGhost(ghostId);
    setActionMessage('Ghost exorcised and conquered!');
    setTimeout(() => setActionMessage(null), 3000);
    await loadGhostData();
    if (onRefreshParentQueue) onRefreshParentQueue();
  };

  const handleDelete = async (ghostId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await GhostScheduler.deleteGhost(ghostId);
    setActionMessage('Ghost dismissed from quarantine.');
    setTimeout(() => setActionMessage(null), 3000);
    await loadGhostData();
    if (onRefreshParentQueue) onRefreshParentQueue();
  };

  const formatDue = (isoString: string) => {
    const dueTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = dueTime - now;

    if (diffMs <= 0) {
      return { text: 'Ready for Review', isReady: true };
    }
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffMinutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));

    if (diffHours === 0) {
      return { text: `Due in ${diffMinutes}m`, isReady: false };
    }
    return { text: `Due in ${diffHours}h ${diffMinutes}m`, isReady: false };
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-xs text-stone-500 font-mono">Loading Ghost Quarantine...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Quarantine Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 opacity-60" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-stone-900 tracking-tight">Ghost Review Quarantine</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-mono text-rose-700 font-bold uppercase">
                  Leech Isolation
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                Persistent leeches (&ge; 3 lapses) isolated into an accelerated 4-stage micro-schedule (4h &rarr; 8h &rarr; 24h &rarr; 48h) with rotated context sentences.
              </p>
            </div>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-xs">
              <span className="block text-xl font-bold font-mono text-rose-600 leading-none">
                {ghosts.length}
              </span>
              <span className="text-[10px] uppercase font-mono text-stone-500 tracking-wider">Active</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-center shadow-xs">
              <span className="block text-xl font-bold font-mono text-emerald-600 leading-none">
                {conqueredCount}
              </span>
              <span className="text-[10px] uppercase font-mono text-stone-500 tracking-wider">Conquered</span>
            </div>
          </div>
        </div>

        {/* Action toast message */}
        <AnimatePresence>
          {actionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono flex items-center space-x-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{actionMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ghost List */}
      {ghosts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl bg-stone-50 border border-stone-200 p-8 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-stone-900">Quarantine Clean</h4>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            No active ghost cards in quarantine. Difficult cards that accumulate 3 or more lapses will automatically spawn here for targeted micro-reviews.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3.5">
          {ghosts.map((ghost) => {
            const dueInfo = formatDue(ghost.due);
            return (
              <motion.div
                key={ghost.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-2xl bg-white border ${
                  dueInfo.isReady
                    ? 'border-rose-400 shadow-sm'
                    : 'border-stone-200 shadow-sm'
                } p-4 sm:p-5 transition hover:border-rose-300`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Sentence & Pattern */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-japanese font-bold text-xs tracking-wide">
                        {ghost.clozeTarget}
                      </span>
                      <span className="text-[10px] font-mono text-stone-500 uppercase">
                        Grammar: {ghost.grammarId}
                      </span>
                      {dueInfo.isReady ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-bold flex items-center space-x-1 animate-pulse">
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>Ready Now</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-[10px] font-mono flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{dueInfo.text}</span>
                        </span>
                      )}
                    </div>

                    {/* Cloze Sentence Context */}
                    <div className="font-japanese text-base font-semibold text-stone-900 tracking-wide leading-relaxed">
                      {ghost.clozeSentence}
                    </div>

                    {/* Nuance Explanations */}
                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                      {ghost.nuanceExplanationEn}
                    </p>
                    {ghost.nuanceExplanationMy && (
                      <p className="text-[11px] text-amber-700 font-myanmar leading-normal">
                        {ghost.nuanceExplanationMy}
                      </p>
                    )}
                  </div>

                  {/* Right: 4-Stage Micro-Interval Timeline & Actions */}
                  <div className="flex flex-col items-start md:items-end justify-between space-y-3 shrink-0">
                    {/* Stage Timeline */}
                    <div className="flex items-center space-x-1.5">
                      {([1, 2, 3, 4] as const).map((s) => {
                        const isCurrent = ghost.stage === s;
                        const isPassed = ghost.stage > s;
                        const intervalHours = GHOST_STAGE_INTERVALS_HOURS[s];
                        return (
                          <div
                            key={s}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center space-x-1 transition ${
                              isPassed
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : isCurrent
                                ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200 shadow-2xs'
                                : 'bg-stone-100 border-stone-200 text-stone-400'
                            }`}
                            title={`Stage ${s}: +${intervalHours}h`}
                          >
                            <span>S{s}</span>
                            <span className="text-[8px] font-normal opacity-70">
                              {intervalHours}h
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {onStartGhostReview && (
                        <button
                          onClick={() => onStartGhostReview(ghost)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold font-mono flex items-center space-x-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Drill Cloze</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleExorcise(ghost.id, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 hover:border-emerald-300 text-xs font-mono transition cursor-pointer flex items-center space-x-1 shadow-2xs"
                        title="Force Conquer Ghost"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Exorcise</span>
                      </button>

                      <button
                        onClick={(e) => handleDelete(ghost.id, e)}
                        className="p-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-700 border border-stone-200 transition cursor-pointer shadow-2xs"
                        title="Dismiss Ghost"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
