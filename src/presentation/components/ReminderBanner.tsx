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
    <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6 text-stone-700 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-stone-900">Study Reminders &amp; Schedule Alarms</h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center font-medium"
              >
                <Info className="w-3.5 h-3.5 mr-0.5" /> {showDetails ? 'Hide details' : 'How it works'}
              </button>
            </div>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              Export an <strong className="text-stone-800">.ics calendar file</strong> with configured 10-minute alarms to import today&apos;s schedule into Apple Calendar, Google Calendar, or Outlook completely offline.
            </p>

            {showDetails && (
              <div className="mt-2.5 pt-2.5 border-t border-stone-200 text-xs text-stone-600 space-y-1.5 bg-stone-50 p-2.5 rounded-xl">
                <div className="font-medium text-stone-800">Offline Calendar Delivery:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-xs">
                    <span className="text-stone-900 font-semibold block">📱 Local .ics Export:</span>
                    <span className="text-emerald-700">Works 100% offline with no account login required</span> on any calendar app.
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-xs">
                    <span className="text-stone-900 font-semibold block">🌐 Local In-App Timer:</span>
                    <span className="text-emerald-700">Audio chime and visual alert</span> trigger when each study block finishes.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-stone-200">
          <button
            onClick={handleDownloadIcs}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export .ics Schedule
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

