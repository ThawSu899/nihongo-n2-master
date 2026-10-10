import React, { useState } from 'react';
import { Bell, Calendar, Download, X, Info } from 'lucide-react';
import { StudyBlock } from '../../domain/models/types';
import { generateIcsCalendar } from '../../domain/reminders/reminder-service';

interface ReminderBannerProps {
  blocks: StudyBlock[];
  dateIso?: string;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({ blocks, dateIso }) => {
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (dismissed) return null;

  const handleDownloadIcs = () => {
    const ics = generateIcsCalendar(blocks, dateIso);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nihongo-study-schedule-${dateIso || 'today'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 rounded-xl p-3.5 mb-6 text-stone-300 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-stone-100">Study Reminders &amp; Schedule Alarms</h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center"
              >
                <Info className="w-3.5 h-3.5 mr-0.5" /> {showDetails ? 'Hide details' : 'How it works'}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Export an <strong className="text-stone-300">.ics calendar file</strong> with configured 10-minute alarms to import today&apos;s schedule into Apple Calendar, Google Calendar, or Outlook completely offline.
            </p>

            {showDetails && (
              <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 text-xs text-stone-400 space-y-1.5 bg-stone-900/40 p-2.5 rounded-lg">
                <div className="font-medium text-stone-300">Offline Calendar Delivery:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                    <span className="text-stone-200 font-semibold block">📱 Local .ics Export:</span>
                    <span className="text-emerald-400">Works 100% offline with no account login required</span> on any calendar app.
                  </div>
                  <div className="bg-stone-950/60 p-2 rounded border border-stone-800">
                    <span className="text-stone-200 font-semibold block">🌐 Local In-App Timer:</span>
                    <span className="text-emerald-400">Audio chime and visual alert</span> trigger when each study block finishes.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadIcs}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export .ics Schedule
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

