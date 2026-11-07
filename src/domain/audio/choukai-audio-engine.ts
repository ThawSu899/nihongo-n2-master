import { ChoukaiScenario, ChoukaiLine, ChoukaiSpeaker } from '../assessment/choukai-catalog';

export type ChoukaiSpeed = 0.75 | 1.0 | 1.25 | 1.5;

export interface ChoukaiAudioCallbacks {
  onLineChange?: (lineIndex: number, line: ChoukaiLine) => void;
  onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  onComplete?: () => void;
  onWaveformTick?: (amplitude: number) => void;
}

export class ChoukaiAudioEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private scenario: ChoukaiScenario | null = null;
  private currentLineIndex = 0;
  private speed: ChoukaiSpeed = 1.0;
  private isShadowingLoop = false;
  private shadowingTurnDelayMs = 2000; // configurable speaker turn delay (1s-3s)
  private isPlaying = false;
  private isPaused = false;
  private callbacks: ChoukaiAudioCallbacks = {};
  private waveInterval: any = null;
  private loopTimeout: any = null;
  private japaneseVoices: SpeechSynthesisVoice[] = [];

  constructor(callbacks?: ChoukaiAudioCallbacks) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  private initVoices(): void {
    if (!this.synth) return;
    const allVoices = this.synth.getVoices();
    this.japaneseVoices = allVoices.filter(
      (v) => v.lang.includes('ja') || v.lang.includes('JA') || v.name.includes('Japanese')
    );
  }

  private resolveBestVoice(speaker?: ChoukaiSpeaker): SpeechSynthesisVoice | null {
    if (this.japaneseVoices.length === 0) return null;

    if (!speaker || speaker.gender === 'neutral') {
      return this.japaneseVoices[0];
    }

    // Try to match gender in voice name if available
    const genderKey = speaker.gender === 'male' ? /male|ichiro|ken|takumi|otoko/i : /female|kyoko|yuka|sakura|onna/i;
    const genderVoice = this.japaneseVoices.find((v) => genderKey.test(v.name));
    return genderVoice || this.japaneseVoices[0];
  }

  public setCallbacks(callbacks: ChoukaiAudioCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setSpeed(newSpeed: ChoukaiSpeed): void {
    this.speed = newSpeed;
    if (this.isPlaying && !this.isPaused && this.scenario) {
      // Re-trigger current line at new speed seamlessly
      this.playLine(this.currentLineIndex);
    }
  }

  public getSpeed(): ChoukaiSpeed {
    return this.speed;
  }

  public setShadowingLoop(enabled: boolean): void {
    this.isShadowingLoop = enabled;
  }

  public getIsShadowingLoop(): boolean {
    return this.isShadowingLoop;
  }

  public setShadowingTurnDelay(delayMs: number): void {
    this.shadowingTurnDelayMs = Math.max(1000, Math.min(3000, delayMs));
  }

  public getShadowingTurnDelay(): number {
    return this.shadowingTurnDelayMs;
  }

  public loadScenario(scenario: ChoukaiScenario): void {
    this.stop();
    this.scenario = scenario;
    this.currentLineIndex = 0;
  }

  public play(startLineIndex = 0): void {
    if (!this.synth || !this.scenario) return;

    if (this.isPaused && this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
      this.isPlaying = true;
      this.notifyState();
      this.startWaveformSimulation();
      return;
    }

    this.currentLineIndex = Math.max(0, Math.min(startLineIndex, this.scenario.dialogue.length - 1));
    this.playLine(this.currentLineIndex);
  }

  public playLine(lineIndex: number): void {
    if (!this.synth || !this.scenario) return;
    this.stopUtteranceOnly();

    if (lineIndex < 0 || lineIndex >= this.scenario.dialogue.length) {
      this.stop();
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
      return;
    }

    this.currentLineIndex = lineIndex;
    const line = this.scenario.dialogue[lineIndex];
    const speaker = this.scenario.speakers.find((s) => s.id === line.speakerId);

    const utterance = new SpeechSynthesisUtterance(line.japanese);
    utterance.lang = 'ja-JP';

    // Acoustic modulation: Pitch & Rate based on speaker profile and selected speed
    const basePitch = speaker?.pitch || (speaker?.gender === 'female' ? 1.2 : speaker?.gender === 'male' ? 0.85 : 1.0);
    const speakerRateMultiplier = speaker?.rateMultiplier || 1.0;

    utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch));
    utterance.rate = Math.max(0.5, Math.min(2.0, this.speed * speakerRateMultiplier));

    const bestVoice = this.resolveBestVoice(speaker);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.notifyState();
      this.startWaveformSimulation();
      if (this.callbacks.onLineChange) {
        this.callbacks.onLineChange(this.currentLineIndex, line);
      }
    };

    utterance.onend = () => {
      this.stopWaveformSimulation();

      if (this.isShadowingLoop) {
        // Continuous shadowing loop mode: wait for the configured speaker turn delay (1s-3s), then advance to next line (looping)
        this.loopTimeout = setTimeout(() => {
          if (this.isPlaying && this.isShadowingLoop && this.scenario) {
            const nextLineIdx = (this.currentLineIndex + 1) % this.scenario.dialogue.length;
            this.playLine(nextLineIdx);
          }
        }, this.shadowingTurnDelayMs);
      } else {
        // Normal progression to next dialogue turn
        if (this.currentLineIndex < this.scenario!.dialogue.length - 1) {
          this.loopTimeout = setTimeout(() => {
            if (this.isPlaying) {
              this.playLine(this.currentLineIndex + 1);
            }
          }, 350);
        } else {
          this.isPlaying = false;
          this.notifyState();
          if (this.callbacks.onComplete) {
            this.callbacks.onComplete();
          }
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      this.stopWaveformSimulation();
      this.isPlaying = false;
      this.notifyState();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause(): void {
    if (!this.synth) return;
    if (this.synth.speaking) {
      this.synth.pause();
      this.isPaused = true;
      this.isPlaying = false;
      this.stopWaveformSimulation();
      this.notifyState();
    }
  }

  public resume(): void {
    if (!this.synth) return;
    if (this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
      this.isPlaying = true;
      this.startWaveformSimulation();
      this.notifyState();
    } else {
      this.play(this.currentLineIndex);
    }
  }

  public stop(): void {
    this.stopUtteranceOnly();
    this.isPlaying = false;
    this.isPaused = false;
    this.stopWaveformSimulation();
    this.notifyState();
  }

  private stopUtteranceOnly(): void {
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  private notifyState(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.isPlaying, this.isPaused);
    }
  }

  private startWaveformSimulation(): void {
    this.stopWaveformSimulation();
    if (!this.callbacks.onWaveformTick) return;

    // Generates simulated rhythm pulses for the audio waveform bars
    this.waveInterval = setInterval(() => {
      const amp = 0.2 + Math.random() * 0.8;
      this.callbacks.onWaveformTick?.(amp);
    }, 100);
  }

  private stopWaveformSimulation(): void {
    if (this.waveInterval) {
      clearInterval(this.waveInterval);
      this.waveInterval = null;
    }
    this.callbacks.onWaveformTick?.(0.05);
  }

  public getCurrentLineIndex(): number {
    return this.currentLineIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }
}
