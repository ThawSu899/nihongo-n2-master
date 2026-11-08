import React from 'react';
import { ArrowLeft, Mic } from 'lucide-react';
import { LessonPack } from '../../domain/models/types';
import { ShadowingPracticeScreen } from '../components/ShadowingPracticeScreen';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface ShadowingScreenProps {
  pack?: LessonPack | null;
  onBack: () => void;
  className?: string;
}

export const ShadowingScreen: React.FC<ShadowingScreenProps> = ({
  pack,
  onBack,
  className = '',
}) => {
  const {
    play,
    stop,
    isPlaying,
    currentPlayingText,
    playbackRate,
    setPlaybackRate,
    startShadowingLoop,
    stopShadowingLoop,
    isShadowingLoop,
    activeTurnIndex,
    shadowingTurnDelay,
    setShadowingTurnDelay,
  } = useAudioPlayer();

  if (!pack) {
    return (
      <div className={`p-8 text-center space-y-4 ${className}`}>
        <p className="text-sm text-zinc-400">Loading lesson dialogue audio...</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-medium cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Navigation Top Bar */}
      <div className="flex items-center space-x-3 pb-2">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[11px] font-bold text-cyan-300">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shadowing Audio Workbench (発音練習)</span>
            </span>
            <span className="text-xs font-mono text-zinc-500">
              {pack.id.toUpperCase()} • {pack.title}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Shadowing Practice Screen */}
      <ShadowingPracticeScreen
        pack={pack}
        isPlaying={isPlaying}
        currentPlayingText={currentPlayingText}
        play={play}
        stop={stop}
        isShadowingLoop={isShadowingLoop}
        shadowingTurnDelay={shadowingTurnDelay}
        setShadowingTurnDelay={setShadowingTurnDelay}
        activeTurnIndex={activeTurnIndex}
        startShadowingLoop={startShadowingLoop}
        stopShadowingLoop={stopShadowingLoop}
        playbackRate={playbackRate}
        setPlaybackRate={setPlaybackRate}
        onProceed={onBack}
      />
    </div>
  );
};
