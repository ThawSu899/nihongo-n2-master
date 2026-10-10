import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioRef } from '../../domain/models/types';

export interface SpeakerAcoustics {
  pitch: number;
  rateMultiplier: number;
  genderPreference: 'male' | 'female' | 'neutral';
}

export interface DialogueTurn {
  speaker?: string;
  text: string;
}

/**
 * Extracts pure Japanese text from question prompts, quotes, or conversational brackets.
 * If input contains Japanese in brackets 「...」 or 『...』, extracts the inner content.
 * If input has a speaker prefix like "ケン：...", extracts the spoken utterance.
 * Strips leading/trailing English prefixes if quotation marks surround Japanese content.
 */
export function cleanJapanesePrompt(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // 1. Japanese quotation brackets 「...」 or 『...』
  const bracketMatch = trimmed.match(/[「『]([^」』]+)[」』]/);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }

  // 2. Dialogue speaker prefix: "ケン：..." or "Ken: ..."
  const colonMatch = trimmed.match(/^[^：:\n]{1,25}[：:]\s*(.+)$/s);
  if (colonMatch && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(colonMatch[1])) {
    return colonMatch[1].trim();
  }

  // 3. Western quotation marks enclosing Japanese text: "..." or “...”
  const quoteMatch = trimmed.match(/["“]([^"”]+)["”]/);
  if (quoteMatch && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(quoteMatch[1])) {
    return quoteMatch[1].trim();
  }

  return trimmed;
}

/**
 * Parses full dialogue transcripts into speaker turns for turn-by-turn playback.
 */
export function parseDialogueTranscript(transcript: string): DialogueTurn[] {
  if (!transcript) return [];
  const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
  const turns: DialogueTurn[] = [];

  for (const line of lines) {
    const sepIdx = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
    if (sepIdx !== -1) {
      const spk = line.slice(0, sepIdx).trim();
      const txt = line.slice(sepIdx + 1).trim();
      if (txt) {
        turns.push({ speaker: spk, text: txt });
        continue;
      }
    }
    turns.push({ speaker: undefined, text: line });
  }

  return turns;
}

/**
 * Resolves acoustic parameters (pitch, rate multiplier, gender preference)
 * based on speaker name, character role, or honorific tags.
 * e.g., Tanaka-sensei (authoritative, deeper pitch, male), Ken (youthful learner, higher pitch, male),
 * female characters (higher pitch, female voice preference).
 */
export function resolveSpeakerAcoustics(speaker?: string): SpeakerAcoustics {
  if (!speaker) {
    return { pitch: 1.0, rateMultiplier: 1.0, genderPreference: 'neutral' };
  }

  const s = speaker.trim().toLowerCase();

  // Sensei / Professor / Senior Teachers (e.g. Tanaka-sensei, Kawaguchi-sensei, Mori-kyouju)
  if (
    s.includes('先生') ||
    s.includes('sensei') ||
    s.includes('教授') ||
    s.includes('tanaka') ||
    s.includes('たなか') ||
    s.includes('田中') ||
    s.includes('川口') ||
    s.includes('部長') ||
    s.includes('課長')
  ) {
    return { pitch: 0.88, rateMultiplier: 0.96, genderPreference: 'male' };
  }

  // Female characters / roles (e.g., Kyoko, Karina, Lisa, Yumi, Maya, Emi, Anna, female clerks)
  if (
    s.includes('kyoko') ||
    s.includes('きょうこ') ||
    s.includes('京子') ||
    s.includes('女性') ||
    s.includes('女') ||
    s.includes('カリナ') ||
    s.includes('リサ') ||
    s.includes('ユミ') ||
    s.includes('マヤ') ||
    s.includes('エミ') ||
    s.includes('アンナ') ||
    s.includes('ユキ') ||
    s.includes('エミリー') ||
    s.includes('マナ') ||
    s.includes('母') ||
    s.includes('姉') ||
    s.includes('妹')
  ) {
    return { pitch: 1.18, rateMultiplier: 1.0, genderPreference: 'female' };
  }

  // Young learners / students / energetic speakers (e.g., Ken, Takeshi, Mike, Carlos)
  if (
    s.includes('ケン') ||
    s.includes('ken') ||
    s.includes('マイク') ||
    s.includes('タケシ') ||
    s.includes('カルロス') ||
    s.includes('生徒') ||
    s.includes('後輩')
  ) {
    return { pitch: 1.12, rateMultiplier: 1.02, genderPreference: 'male' };
  }

  // Dialogue Turn A vs B default separation if only generic letters are provided
  if (speaker === 'A' || speaker === 'Person A') {
    return { pitch: 1.08, rateMultiplier: 1.0, genderPreference: 'female' };
  }
  if (speaker === 'B' || speaker === 'Person B') {
    return { pitch: 0.92, rateMultiplier: 0.98, genderPreference: 'male' };
  }

  return { pitch: 1.0, rateMultiplier: 1.0, genderPreference: 'neutral' };
}

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingText, setCurrentPlayingText] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [hasJaVoice, setHasJaVoice] = useState(false);
  const [voiceName, setVoiceName] = useState<string>('');
  const [replayCount, setReplayCount] = useState<Record<string, number>>({});
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isPlayingRef = useRef(false);

  // Sync ref with state for event callbacks
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load and cache voices reliably across browser engines (Chrome, Safari, Firefox, Edge)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const checkVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        voicesRef.current = voices;

        // Find primary Japanese voice
        const jaVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith('ja') ||
            v.lang.toLowerCase().replace('_', '-').startsWith('ja-jp')
        );

        if (jaVoice) {
          setHasJaVoice(true);
          setVoiceName(jaVoice.name);
        } else {
          // If no explicitly tagged ja voice, check if any voice has Japanese in its name
          const namedJaVoice = voices.find((v) => /japanese|nihongo/i.test(v.name));
          if (namedJaVoice) {
            setHasJaVoice(true);
            setVoiceName(namedJaVoice.name);
          } else {
            setHasJaVoice(false);
            setVoiceName('');
          }
        }
      } catch {
        setHasJaVoice(false);
      }
    };

    checkVoices();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectBestVoice = useCallback(
    (genderPreference: 'male' | 'female' | 'neutral'): SpeechSynthesisVoice | undefined => {
      const allVoices = voicesRef.current.length > 0 ? voicesRef.current : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
      const jaVoices = allVoices.filter(
        (v) =>
          v.lang.toLowerCase().startsWith('ja') ||
          v.lang.toLowerCase().replace('_', '-').startsWith('ja-jp') ||
          /japanese|nihongo/i.test(v.name)
      );

      if (jaVoices.length === 0) return undefined;
      if (jaVoices.length === 1 || genderPreference === 'neutral') return jaVoices[0];

      // Try matching preferred gender in voice name if multiple Japanese voices exist
      if (genderPreference === 'female') {
        const femaleVoice = jaVoices.find((v) =>
          /female|woman|girl|kyoko|haruka|ayumi|sayaka|nanami|otoya/i.test(v.name)
        );
        if (femaleVoice) return femaleVoice;
      } else if (genderPreference === 'male') {
        const maleVoice = jaVoices.find((v) =>
          /male|man|boy|kenji|keita|daichi|naoki|ichiro|takumi/i.test(v.name)
        );
        if (maleVoice) return maleVoice;
      }

      return jaVoices[0];
    },
    []
  );

  const speakTts = useCallback(
    (text: string, speaker?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsPlaying(false);
        setCurrentPlayingText(null);
        setActiveSpeaker(null);
        return;
      }

      try {
        // Resume in case speech synthesis was paused by the browser engine
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';

        const acoustics = resolveSpeakerAcoustics(speaker);
        utterance.pitch = acoustics.pitch;
        utterance.rate = Math.max(0.5, Math.min(2.0, playbackRate * acoustics.rateMultiplier));

        const matchedVoice = selectBestVoice(acoustics.genderPreference);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setCurrentPlayingText(text);
          setActiveSpeaker(speaker || null);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentPlayingText(null);
          setActiveSpeaker(null);
        };

        utterance.onerror = (e) => {
          // 'canceled' or 'interrupted' is expected when stopping or starting a new sound
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('SpeechSynthesis error:', e.error);
          }
          setIsPlaying(false);
          setCurrentPlayingText(null);
          setActiveSpeaker(null);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis invocation failed:', err);
        setIsPlaying(false);
        setCurrentPlayingText(null);
        setActiveSpeaker(null);
      }
    },
    [playbackRate, selectBestVoice]
  );

  const playDialogue = useCallback(
    (transcript: string, onComplete?: () => void) => {
      if (typeof window === 'undefined') return;

      const turns = parseDialogueTranscript(transcript);
      if (turns.length === 0) {
        setIsPlaying(false);
        setCurrentPlayingText(null);
        setActiveSpeaker(null);
        return;
      }

      // Cancel any prior speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current.currentTime = 0;
      }

      let currentTurnIdx = 0;

      const playNextTurn = () => {
        if (currentTurnIdx >= turns.length) {
          setIsPlaying(false);
          setCurrentPlayingText(null);
          setActiveSpeaker(null);
          if (onComplete) onComplete();
          return;
        }

        const turn = turns[currentTurnIdx];
        currentTurnIdx++;

        if (!('speechSynthesis' in window)) {
          setIsPlaying(false);
          return;
        }

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(turn.text);
          utterance.lang = 'ja-JP';

          const acoustics = resolveSpeakerAcoustics(turn.speaker);
          utterance.pitch = acoustics.pitch;
          utterance.rate = Math.max(0.5, Math.min(2.0, playbackRate * acoustics.rateMultiplier));

          const matchedVoice = selectBestVoice(acoustics.genderPreference);
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }

          utterance.onstart = () => {
            setIsPlaying(true);
            setCurrentPlayingText(turn.text);
            setActiveSpeaker(turn.speaker || null);
          };

          utterance.onend = () => {
            // Small pause between speakers
            setTimeout(() => {
              playNextTurn();
            }, 350);
          };

          utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              console.warn('SpeechSynthesis turn error:', e.error);
            }
            setIsPlaying(false);
            setCurrentPlayingText(null);
            setActiveSpeaker(null);
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          setIsPlaying(false);
        }
      };

      playNextTurn();
    },
    [playbackRate, selectBestVoice]
  );

  const play = useCallback(
    (text: string, audioRef?: AudioRef, speaker?: string) => {
      if (typeof window === 'undefined') return;

      // Extract spoken Japanese text accurately if embedded in prompts or quotes
      const spokenText = cleanJapanesePrompt(text);
      if (!spokenText) return;

      // Update replay count for the requested item
      setReplayCount((prev) => ({
        ...prev,
        [text]: (prev[text] || 0) + 1,
      }));

      // Cancel any ongoing speech or audio
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current.currentTime = 0;
      }

      // If audio file is provided and valid, try playing HTML5 Audio
      if (audioRef?.kind === 'file' && audioRef.fileId) {
        try {
          if (!audioElemRef.current) {
            audioElemRef.current = new Audio();
          }

          const elem = audioElemRef.current;
          elem.src = audioRef.fileId;
          elem.playbackRate = playbackRate;

          elem.onended = () => {
            setIsPlaying(false);
            setCurrentPlayingText(null);
            setActiveSpeaker(null);
          };

          elem.onerror = () => {
            // Smoothly degrade to Japanese TTS on file missing / 404 / format error
            speakTts(spokenText, speaker || audioRef.speaker);
          };

          setIsPlaying(true);
          setCurrentPlayingText(text);
          setActiveSpeaker(speaker || audioRef.speaker || null);

          elem.play().catch(() => {
            // Audio element play failed (e.g. autoplay policy or unreachable URL) -> degrade to TTS
            speakTts(spokenText, speaker || audioRef.speaker);
          });
          return;
        } catch {
          // Degradation path
          speakTts(spokenText, speaker || audioRef.speaker);
          return;
        }
      }

      // If text looks like a multi-speaker dialogue transcript and has no specific audio file,
      // use multi-speaker dialogue playback with correct pitch switches!
      if (text.includes('\n') && (text.includes('：') || text.includes(':'))) {
        playDialogue(text);
        return;
      }

      // Default or TTS kind
      speakTts(spokenText, speaker || audioRef?.speaker);
    },
    [playbackRate, speakTts, playDialogue]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentPlayingText(null);
    setActiveSpeaker(null);
  }, []);

  return {
    play,
    playDialogue,
    stop,
    isPlaying,
    currentPlayingText,
    activeSpeaker,
    playbackRate,
    setPlaybackRate,
    hasJaVoice,
    voiceName,
    replayCount,
  };
}
