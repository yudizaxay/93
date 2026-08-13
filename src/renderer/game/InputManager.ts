import { GameSettings } from '../types/settings';

interface EngineLike {
  handleStart(nowMs: number): void;
  handleStop(nowMs: number): void;
  /**
   * Live engine state — the single source of truth for start-vs-stop direction.
   * InputManager must never track this itself: the engine silently no-ops
   * start/stop calls made in the wrong state (and auto-transitions on its own
   * via tick()), so any local toggle flag desyncs and deadens the button.
   */
  isRunning(): boolean;
}

export class InputManager {
  private lastAcceptedTimestamp = -Infinity;
  private lastStopTimestamp = -Infinity;

  constructor(
    private engine: EngineLike,
    private getSettings: () => GameSettings
  ) {}

  private trigger(nowMs: number): void {
    const settings = this.getSettings();
    const running = this.engine.isRunning();

    if (nowMs - this.lastAcceptedTimestamp < settings.debounceMs) {
      return;
    }
    if (!running && nowMs - this.lastStopTimestamp < settings.lockoutMs) {
      return;
    }

    this.lastAcceptedTimestamp = nowMs;

    if (running) {
      this.lastStopTimestamp = nowMs;
      this.engine.handleStop(nowMs);
    } else {
      this.engine.handleStart(nowMs);
    }
  }

  handleKeydown(event: { code: string; repeat: boolean }, nowMs: number): void {
    if (event.repeat) return;
    const settings = this.getSettings();
    if (event.code !== settings.buttonKey) return;
    this.trigger(nowMs);
  }

  /** Mouse/touch backup target — goes through the identical toggle logic as the keyboard/USB path. */
  handleManualTrigger(nowMs: number): void {
    this.trigger(nowMs);
  }
}
