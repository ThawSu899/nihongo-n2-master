import React, { useState, useEffect } from 'react';
import { BarChart2, Download, Upload, ShieldCheck, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { db } from '../../data/db/dexie-db';
import { BackupManager } from '../../data/backup/backup-manager';
import { calculateTrueRetention } from '../../domain/srs/srs-scheduler';
import { SystemClock } from '../../domain/common/clock';

interface ProgressScreenProps {
  profile?: any;
  onNavigate?: (view: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  profile,
  onNavigate,
}) => {
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalStudiedSec, setTotalStudiedSec] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [trueRetention, setTrueRetention] = useState(1.0);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const clock = new SystemClock();

  const loadData = async () => {
    const sessions = await db.study_sessions.toArray();
    const totalSec = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    setTotalSessions(sessions.length);
    setTotalStudiedSec(totalSec);

    const records = await db.mastery_records.toArray();
    const mastered = records.filter((r) => r.state === 'mastered' || r.state === 'retained').length;
    setMasteredCount(mastered);

    const cards = await db.srs_cards.toArray();
    setTotalCards(cards.length);

    const logs = await db.review_logs.toArray();
    const retention = calculateTrueRetention(logs, clock);
    setTrueRetention(retention);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportJson = async () => {
    try {
      const json = await BackupManager.exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nihongo-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus('JSON snapshot downloaded successfully.');
    } catch (err: any) {
      setBackupStatus(`Export failed: ${err.message}`);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await BackupManager.restoreFromJson(content);
      setBackupStatus(res.message);
      if (res.success) {
        await loadData();
      }
    };
    reader.readAsText(file);
  };

  const totalHours = Math.round((totalStudiedSec / 3600) * 10) / 10;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Progress &amp; Learning Analytics</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Metrics derived from your append-only local event log. Learner data is stored exclusively offline on your device.
        </p>
      </div>

      {/* Metrics Grid with Obsidian Glass & Neon Accents */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4.5 space-y-1.5 shadow-xl hover:border-zinc-700/80 transition">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold font-mono">Total Study Time</span>
          <div className="text-2xl font-bold font-mono text-zinc-100">{totalHours}h</div>
          <p className="text-[10px] text-zinc-500">{totalSessions} recorded sessions</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4.5 space-y-1.5 shadow-xl hover:border-rose-500/40 transition">
          <span className="text-[10px] text-rose-400 uppercase font-semibold font-mono">Mastered Lessons</span>
          <div className="text-2xl font-bold font-mono text-rose-300">{masteredCount}</div>
          <p className="text-[10px] text-zinc-500">of 174 total curriculum</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4.5 space-y-1.5 shadow-xl hover:border-indigo-500/40 transition">
          <span className="text-[10px] text-indigo-400 uppercase font-semibold font-mono">Active SRS Cards</span>
          <div className="text-2xl font-bold font-mono text-indigo-300">{totalCards}</div>
          <p className="text-[10px] text-zinc-500">Multi-facet retention cards</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4.5 space-y-1.5 shadow-xl hover:border-emerald-500/40 transition">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold font-mono">30-Day True Retention</span>
          <div className="text-2xl font-bold font-mono text-emerald-300">{Math.round(trueRetention * 100)}%</div>
          <p className="text-[10px] text-zinc-500">Target: ≥ 90% (FSRS)</p>
        </div>
      </div>

      {/* Accessible Table Alternative for Skill Analytics & Radar Link */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Skill Competency Summary (Table Alternative)</h2>
            <span className="text-[11px] text-zinc-400">WCAG 2.2 AA Accessible • Vocab, Kanji, Grammar, Reading, Listening</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('tests')}
              className="px-4 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-750 text-rose-300 border border-zinc-700/80 text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto cursor-pointer shadow-md"
            >
              <BarChart2 className="w-3.5 h-3.5 text-rose-400" />
              <span>View Interactive Radar Charts →</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold font-mono">
                <th className="py-2.5 px-3">Skill Area</th>
                <th className="py-2.5 px-3">Curriculum Weight</th>
                <th className="py-2.5 px-3">Mastery Threshold</th>
                <th className="py-2.5 px-3">Minimum Test Items</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-3 px-3 font-medium">Vocabulary</td>
                <td className="py-3 px-3 font-mono">25%</td>
                <td className="py-3 px-3 font-mono">≥ 90%</td>
                <td className="py-3 px-3 font-mono">10 questions</td>
                <td className="py-3 px-3 text-emerald-400 font-mono">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Kanji in Context</td>
                <td className="py-3 px-3 font-mono">15%</td>
                <td className="py-3 px-3 font-mono">≥ 85%</td>
                <td className="py-3 px-3 font-mono">6 questions</td>
                <td className="py-3 px-3 text-emerald-400 font-mono">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Grammar</td>
                <td className="py-3 px-3 font-mono">25%</td>
                <td className="py-3 px-3 font-mono">≥ 85%</td>
                <td className="py-3 px-3 font-mono">6 questions</td>
                <td className="py-3 px-3 text-emerald-400 font-mono">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Reading Comprehension</td>
                <td className="py-3 px-3 font-mono">17.5%</td>
                <td className="py-3 px-3 font-mono">≥ 80%</td>
                <td className="py-3 px-3 font-mono">5 questions</td>
                <td className="py-3 px-3 text-emerald-400 font-mono">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Listening &amp; Shadowing</td>
                <td className="py-3 px-3 font-mono">17.5%</td>
                <td className="py-3 px-3 font-mono">≥ 80%</td>
                <td className="py-3 px-3 font-mono">5 questions</td>
                <td className="py-3 px-3 text-emerald-400 font-mono">Tracking Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Learner Data Sacredness: Local Backup & Snapshot Export */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-semibold text-zinc-100">Data Integrity &amp; Backup</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          In adherence to <em>Principle 4: Learner data is sacred</em>, you can export your complete study history, cards, and attempts as a portable JSON snapshot or restore previous records anytime.
        </p>

        {backupStatus && (
          <div className="bg-zinc-950/90 p-3.5 rounded-2xl border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{backupStatus}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-2 transition border border-zinc-700 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>Export Local JSON Snapshot</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-2 transition border border-zinc-700 cursor-pointer shadow-md">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Restore from JSON File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
