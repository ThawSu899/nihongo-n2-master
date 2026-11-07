import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface NuanceWarningBannerProps {
  enteredSynonym: string;
  expectedTarget?: string;
  nuanceMessage?: string;
  nuanceMessageMy?: string;
  warningMessageEn?: string;
  warningMessageMy?: string;
  conjugationNote?: string;
  onRetry: () => void;
}

export const NuanceWarningBanner: React.FC<NuanceWarningBannerProps> = ({
  enteredSynonym,
  expectedTarget,
  nuanceMessage,
  nuanceMessageMy,
  warningMessageEn,
  warningMessageMy,
  conjugationNote,
  onRetry,
}) => {
  nuanceMessage = nuanceMessage || warningMessageEn || '';
  nuanceMessageMy = nuanceMessageMy || warningMessageMy;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        x: [-5, 5, -4, 4, -2, 2, 0],
      }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      className="bg-amber-950/90 backdrop-blur-2xl border border-amber-500/50 rounded-2xl p-4 text-amber-200 shadow-[0_0_24px_-4px_rgba(245,158,11,0.35)] flex items-start space-x-3.5 max-w-lg mx-auto select-none"
    >
      {/* Amber Glowing Warning Icon */}
      <div className="w-8 h-8 rounded-xl bg-amber-900/60 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
      </div>

      <div className="space-y-1.5 min-w-0 flex-1 text-left">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-bold text-xs text-amber-300 font-myanmar tracking-wider">
            သဒ္ဒါအသုံးအနှုန်း ခွဲခြားခြင်း
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-900/80 border border-amber-500/30 text-[9px] font-myanmar text-amber-300 font-semibold shadow-sm">
            အမှတ်မလျှော့ပါ
          </span>
        </div>

        <p className="text-xs text-amber-100 font-japanese leading-relaxed">
          <span className="line-through text-amber-400/80 mr-1.5 font-mono">{enteredSynonym}</span>
          <span className="text-amber-200 font-bold">{nuanceMessageMy || nuanceMessage}</span>
        </p>

        {nuanceMessageMy && nuanceMessage && (
          <p className="text-[11px] text-amber-300/75 leading-normal font-sans">
            {nuanceMessage}
          </p>
        )}

        {conjugationNote && (
          <div className="pt-0.5 text-[10px] text-amber-400/80 font-mono">
            <span>接続: {conjugationNote}</span>
          </div>
        )}
      </div>

      {/* Try Again CTA */}
      <button
        onClick={onRetry}
        className="px-2.5 py-1.5 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-500/40 text-xs font-myanmar font-semibold transition active:scale-95 shrink-0 flex items-center space-x-1 cursor-pointer self-center"
      >
        <RefreshCw className="w-3 h-3" />
        <span>ပြန်လည်ကြိုးစားရန်</span>
      </button>
    </motion.div>
  );
};
