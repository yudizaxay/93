export type SoundName = 'win' | 'near' | 'other' | 'start' | 'stop';

type ToneStage = {
  freq: number;
  atMs: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  /** Optional pitch slide target — the oscillator glides from `freq` to this
   * value over the stage's duration instead of holding a flat pitch. */
  slideTo?: number;
};

/**
 * Every sound is synthesized with the Web Audio API rather than shipped as an
 * audio asset — a kiosk build has no business depending on licensed/sourced
 * music files that may go missing or carry unclear rights. Each SoundName maps
 * to a short sequence of oscillator tones (a "score"), which also makes each
 * effect trivially auditionable from the Admin Panel's test buttons.
 */
const SCORES: Record<SoundName, ToneStage[]> = {
  // Rising sweep as the timer starts — signals "go".
  start: [
    { freq: 320, atMs: 0, durationMs: 90, type: 'sine' },
    { freq: 640, atMs: 60, durationMs: 90, type: 'sine' },
  ],
  // Short, dry click — the tactile "stop" acknowledgement (the buzzer).
  stop: [{ freq: 180, atMs: 0, durationMs: 45, type: 'square', gain: 0.5 }],
  // A brief descending two-note dip — "so close, but not quite".
  near: [
    { freq: 520, atMs: 0, durationMs: 110, type: 'triangle' },
    { freq: 420, atMs: 90, durationMs: 140, type: 'triangle' },
  ],
  // A theatrical "you lose" riff for the defense verdict: four quick
  // descending square-wave notes (the comedic "stumble"), then a classic
  // two-part "womp womp" sad-trombone slide for the punchline. Captures the
  // same silly-defeat energy as a classic arcade game-over jingle without
  // reusing anyone's copyrighted melody — an original composition, built
  // entirely with the Web Audio API.
  other: [
    { freq: 466.16, atMs: 0, durationMs: 80, type: 'square', gain: 0.42 }, // Bb4
    { freq: 415.3, atMs: 80, durationMs: 80, type: 'square', gain: 0.42 }, // Ab4
    { freq: 349.23, atMs: 160, durationMs: 80, type: 'square', gain: 0.42 }, // F4
    { freq: 293.66, atMs: 240, durationMs: 80, type: 'square', gain: 0.42 }, // D4
    { freq: 220, atMs: 340, durationMs: 260, type: 'sawtooth', gain: 0.42, slideTo: 174.61 }, // "womp" — A3 to F3
    { freq: 174.61, atMs: 620, durationMs: 460, type: 'sawtooth', gain: 0.48, slideTo: 103.83 }, // "womp" — F3 to Ab2, the punchline
  ],
  // A rising three-note fanfare arpeggio — the celebration beat.
  win: [
    { freq: 523.25, atMs: 0, durationMs: 140, type: 'triangle' }, // C5
    { freq: 659.25, atMs: 120, durationMs: 140, type: 'triangle' }, // E5
    { freq: 783.99, atMs: 240, durationMs: 320, type: 'triangle' }, // G5
  ],
};

export class AudioManager {
  private enabled = true;
  private volume = 0.8;
  private ctx: AudioContext | null = null;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
    } catch {
      return null;
    }
    return this.ctx;
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    // A kiosk's AudioContext starts suspended until a user gesture; the
    // arcade button press that triggers every sound in this app IS that
    // gesture, so resuming here is always safe and never silently dropped.
    if (ctx.state === 'suspended') void ctx.resume();

    try {
      const startAt = ctx.currentTime;
      for (const stage of SCORES[name]) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = stage.type ?? 'sine';
        oscillator.frequency.value = stage.freq;

        const stageStart = startAt + stage.atMs / 1000;
        const stageEnd = stageStart + stage.durationMs / 1000;
        const peakGain = this.volume * (stage.gain ?? 0.6);

        if (stage.slideTo !== undefined) {
          oscillator.frequency.setValueAtTime(stage.freq, stageStart);
          oscillator.frequency.linearRampToValueAtTime(stage.slideTo, stageEnd);
        }

        gainNode.gain.setValueAtTime(0, stageStart);
        gainNode.gain.linearRampToValueAtTime(peakGain, stageStart + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, stageEnd);

        oscillator.connect(gainNode).connect(ctx.destination);
        oscillator.start(stageStart);
        oscillator.stop(stageEnd + 0.02);
      }
    } catch {
      // Playback failure must not affect gameplay (SOW §40).
    }
  }
}

// Singleton instance shared across all components
export const audioManager = new AudioManager();
