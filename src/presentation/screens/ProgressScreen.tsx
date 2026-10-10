import React, { useState, useEffect } from 'react';
import { BarChart2, Download, Upload, ShieldCheck, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { db } from '../../data/db/dexie-db';
import { BackupManager } from '../../data/backup/backup-manager';
import { calculateTrueRetention } from '../../domain/srs/srs-scheduler';
import { SystemClock } from '../../domain/common/clock';

export const ProgressScreen: React.FC = () => {
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
        <h1 className="text-2xl font-bold text-stone-100 tracking-tight">Progress &amp; Learning Analytics</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Metrics derived from your append-only local event log. Learner data is stored exclusively offline on your device.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">Total Study Time</span>
          <div className="text-2xl font-bold font-mono text-stone-100">{totalHours}h</div>
          <p className="text-[10px] text-stone-500">{totalSessions} recorded sessions</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">Mastered Lessons</span>
          <div className="text-2xl font-bold font-mono text-rose-400">{masteredCount}</div>
          <p className="text-[10px] text-stone-500">of 174 total curriculum</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">Active SRS Cards</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">{totalCards}</div>
          <p className="text-[10px] text-stone-500">Multi-facet retention cards</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-stone-400 uppercase font-semibold">30-Day True Retention</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{Math.round(trueRetention * 100)}%</div>
          <p className="text-[10px] text-stone-500">Target: ≥ 90% (FSRS)</p>
        </div>
      </div>

      {/* Accessible Table Alternative for Skill Analytics */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-200">Skill Competency Summary (Table Alternative)</h2>
          <span className="text-[11px] text-stone-500">WCAG 2.2 AA Accessible</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-semibold">
                <th className="py-2 px-3">Skill Area</th>
                <th className="py-2 px-3">Curriculum Weight</th>
                <th className="py-2 px-3">Mastery Threshold</th>
                <th className="py-2 px-3">Minimum Test Items</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              <tr>
                <td className="py-2.5 px-3 font-medium">Vocabulary</td>
                <td className="py-2.5 px-3 font-mono">25%</td>
                <td className="py-2.5 px-3 font-mono">≥ 90%</td>
                <td className="py-2.5 px-3 font-mono">10 questions</td>
                <td className="py-2.5 px-3 text-emerald-400">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Kanji in Context</td>
                <td className="py-2.5 px-3 font-mono">15%</td>
                <td className="py-2.5 px-3 font-mono">≥ 85%</td>
                <td className="py-2.5 px-3 font-mono">6 questions</td>
                <td className="py-2.5 px-3 text-emerald-400">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Grammar</td>
                <td className="py-2.5 px-3 font-mono">25%</td>
                <td className="py-2.5 px-3 font-mono">≥ 85%</td>
                <td className="py-2.5 px-3 font-mono">6 questions</td>
                <td className="py-2.5 px-3 text-emerald-400">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Reading Comprehension</td>
                <td className="py-2.5 px-3 font-mono">17.5%</td>
                <td className="py-2.5 px-3 font-mono">≥ 80%</td>
                <td className="py-2.5 px-3 font-mono">5 questions</td>
                <td className="py-2.5 px-3 text-emerald-400">Tracking Active</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Listening &amp; Shadowing</td>
                <td className="py-2.5 px-3 font-mono">17.5%</td>
                <td className="py-2.5 px-3 font-mono">≥ 80%</td>
                <td className="py-2.5 px-3 font-mono">5 questions</td>
                <td className="py-2.5 px-3 text-emerald-400">Tracking Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Learner Data Sacredness: Local Backup & Snapshot Export */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-semibold text-stone-100">Data Integrity &amp; Backup</h2>
        </div>
        <p className="text-xs text-stone-400">
          In adherence to <em>Principle 4: Learner data is sacred</em>, you can export your complete study history, cards, and attempts as a portable JSON snapshot or restore previous records anytime.
        </p>

        {backupStatus && (
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{backupStatus}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center space-x-2 transition border border-stone-700"
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>Export Local JSON Snapshot</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center space-x-2 transition border border-stone-700 cursor-pointer">
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
