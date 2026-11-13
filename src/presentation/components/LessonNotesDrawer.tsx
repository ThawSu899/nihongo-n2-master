import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Save, Trash2, Check, FileText } from 'lucide-react';
import {
  getLessonNote,
  setLessonNoteText,
  toggleLessonBookmark,
} from '../../domain/notes/lesson-notes';

export interface LessonNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onNotesUpdated?: (notes: string) => void;
}

export const LessonNotesDrawer: React.FC<LessonNotesDrawerProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  isBookmarked: externalIsBookmarked,
  onToggleBookmark: externalOnToggleBookmark,
  onNotesUpdated,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [internalBookmarked, setInternalBookmarked] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when drawer opens or lesson changes
  useEffect(() => {
    if (isOpen && lessonId) {
      const data = getLessonNote(lessonId);
      setNotes(data.notes || '');
      setInternalBookmarked(Boolean(data.bookmarked));
      setSaved(false);
    }
  }, [isOpen, lessonId]);

  const bookmarked =
    externalIsBookmarked !== undefined ? externalIsBookmarked : internalBookmarked;

  const handleToggleStar = () => {
    if (externalOnToggleBookmark) {
      externalOnToggleBookmark();
    } else {
      const updated = toggleLessonBookmark(lessonId);
      setInternalBookmarked(Boolean(updated.bookmarked));
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setSaved(false);
    // Auto-save on edit
    setLessonNoteText(lessonId, val);
    onNotesUpdated?.(val);
  };

  const handleSaveExplicit = () => {
    setLessonNoteText(lessonId, notes);
    onNotesUpdated?.(notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('မှတ်စုအားလုံးကို ဖျက်မည်မှာ သေချာပါသလား? (Clear all notes?)')) {
      setNotes('');
      setLessonNoteText(lessonId, '');
      onNotesUpdated?.('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] bg-white dark:bg-zinc-900 border-l border-stone-200 dark:border-zinc-800 shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Personal Lesson Notes"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-stone-50 dark:bg-zinc-950">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-zinc-100 font-myanmar truncate">
                    📝 ကိုယ်ပိုင်မှတ်စု (Personal Notes)
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-zinc-400 font-mono truncate">
                  {lessonTitle || lessonId}
                </p>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={handleToggleStar}
                  className={`p-2 rounded-xl transition cursor-pointer border ${
                    bookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-500 shadow-2xs'
                      : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200'
                  }`}
                  title={bookmarked ? 'Remove Bookmark (★)' : 'Add Bookmark (★)'}
                >
                  <Star
                    className={`w-4 h-4 ${bookmarked ? 'fill-amber-400 text-amber-500' : ''}`}
                  />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 transition cursor-pointer"
                  title="Close notes drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Editor Body */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400 font-myanmar">
                <span>သဒ္ဒါစည်းမျဉ်းများနှင့် ဝေါဟာရ မှတ်စုများ ရေးရန်:</span>
                <span className="font-mono text-[11px]">{notes.length} စာလုံး</span>
              </div>

              <textarea
                ref={textareaRef}
                value={notes}
                onChange={handleNotesChange}
                onKeyDown={(e) => {
                  // Stop all keyboard events from leaking to global quiz listeners
                  e.stopPropagation();
                }}
                placeholder="ဤသင်ခန်းစာအတွက် ကိုယ်ပိုင်မှတ်စု၊ သဒ္ဒါအသုံးအနှုန်းများနှင့် အလွတ်ကျက် အကူအညီများကို စိတ်ကြိုက်ရေးသားပါ...&#10;&#10;ဥပမာ -&#10;• 〜てから နှင့် 〜たあとで ကွာခြားချက်&#10;• ခက်ခဲသော စာလုံး: 準備 (じゅんび)&#10;• ဆရာ့ရှင်းပြချက် မှတ်စု"
                className="flex-1 w-full p-4 rounded-2xl bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 text-xs sm:text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition resize-none font-myanmar leading-relaxed shadow-inner"
              />
            </div>

            {/* Footer Toolbar */}
            <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 text-xs text-stone-500 dark:text-zinc-400 font-myanmar">
                {saved ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    သိမ်းဆည်းပြီးပါပြီ
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-stone-400">
                    Auto-saved to cloud sync
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {notes && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-zinc-400 hover:text-rose-600 border border-stone-200 dark:border-zinc-700 hover:border-rose-300 text-xs font-medium transition cursor-pointer flex items-center space-x-1"
                    title="Clear note text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ဖျက်မည်</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveExplicit}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>သိမ်းမည်</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
