import { TimerEngine } from './TimerEngine';
import { classify } from './ResultEngine';
import { GameState, GameResult } from '../types/game';
import { GameSettings } from '../types/settings';
import { Logger, LogEvent } from '../logging/Logger';

export interface GameSnapshot {
  state: GameState;
  displaySeconds: string;
  result: GameResult | null;
}

type Listener = (snapshot: GameSnapshot) => void;

export class GameEngine {
  private state: GameState = GameState.IDLE;
  private result: GameResult | null = null;
  private displaySeconds = '0.00';
  private timer = new TimerEngine();
  private listeners = new Set<Listener>();
  private resultEnteredAt: number | null = null;

  constructor(private getSettings: () => GameSettings, private logger?: Logger) {
    this.timer.onTick((display) => {
      this.displaySeconds = display;
      this.notify();
    });
  }

  getSnapshot(): GameSnapshot {
    return { state: this.state, displaySeconds: this.displaySeconds, result: this.result };
  }

  /** Live start/stop direction for InputManager — never mirror this in a local flag. */
  isRunning(): boolean {
    return this.state === GameState.RUNNING;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  private setState(state: GameState): void {
    this.state = state;
    this.notify();
  }

  handleStart(nowMs: number): void {
    if (this.state !== GameState.IDLE) return;
    this.result = null;
    this.displaySeconds = '0.00';
    this.timer.start(nowMs);
    this.setState(GameState.RUNNING);
    this.logger?.log('GAME_STARTED');
  }

  handleStop(nowMs: number): void {
    if (this.state !== GameState.RUNNING) return;
    const elapsedSeconds = this.timer.stop(nowMs);
    const result = classify(elapsedSeconds, this.getSettings());
    this.result = result;
    this.displaySeconds = result.displaySeconds;
    this.resultEnteredAt = nowMs;
    const nextState =
      result.category === 'WIN'
        ? GameState.RESULT_WIN
        : result.category === 'NEAR'
        ? GameState.RESULT_NEAR
        : GameState.RESULT_OTHER;
    this.setState(nextState);
    this.logger?.log('GAME_STOPPED');
    this.logger?.log(`RESULT_${result.category}` as LogEvent);
  }

  /** Called by ResultScreen after its celebration/display beat, or by tick()'s watchdog. */
  proceedFromResult(nowMs: number): void {
    if (
      this.state !== GameState.RESULT_WIN &&
      this.state !== GameState.RESULT_NEAR &&
      this.state !== GameState.RESULT_OTHER
    ) {
      // Already progressed (UI timeout and watchdog can both fire) — nothing to do.
      return;
    }
    const settings = this.getSettings();
    const shouldCapture =
      (this.state === GameState.RESULT_WIN && settings.winnerCaptureEnabled) ||
      ((this.state === GameState.RESULT_NEAR || this.state === GameState.RESULT_OTHER) &&
        settings.captureOnLossEnabled);
    if (shouldCapture) {
      this.resultEnteredAt = nowMs;
      this.setState(GameState.WINNER_ENTRY);
      return;
    }
    this.returnToIdle();
  }

  skipWinnerEntry(): void {
    if (this.state !== GameState.WINNER_ENTRY) return;
    this.returnToIdle();
  }

  notifyActivity(nowMs: number): void {
    if (this.state === GameState.WINNER_ENTRY) {
      this.resultEnteredAt = nowMs;
    }
  }

  private returnToIdle(): void {
    this.result = null;
    this.displaySeconds = '0.00';
    this.resultEnteredAt = null;
    this.timer.reset();
    this.setState(GameState.IDLE);
  }

  reset(): void {
    this.returnToIdle();
  }

  /** Drives display ticks (RUNNING) and time-based auto-transitions. Call from a rAF loop. */
  tick(nowMs: number): void {
    if (this.state === GameState.RUNNING) {
      const settings = this.getSettings();
      if (this.timer.getElapsedSeconds(nowMs) * 1000 >= settings.maxRunningMs) {
        this.returnToIdle();
        return;
      }
      this.timer.publishTick(nowMs);
      return;
    }

    if (
      (this.state === GameState.RESULT_WIN ||
        this.state === GameState.RESULT_NEAR ||
        this.state === GameState.RESULT_OTHER ||
        this.state === GameState.WINNER_ENTRY) &&
      this.resultEnteredAt !== null
    ) {
      const settings = this.getSettings();
      const timeoutMs =
        this.state === GameState.WINNER_ENTRY ? settings.winnerEntryTimeoutMs : settings.autoResetMs;
      if (nowMs - this.resultEnteredAt >= timeoutMs) {
        if (this.state === GameState.WINNER_ENTRY) {
          this.returnToIdle();
        } else {
          // Watchdog for all three result states: the UI normally advances WIN
          // after its celebration beat, but the engine must never depend on the
          // UI to leave a state — and NEAR/OTHER must also run through
          // proceedFromResult so captureOnLossEnabled gets a chance to route
          // into WINNER_ENTRY instead of straight back to IDLE.
          this.proceedFromResult(nowMs);
        }
      }
    }
  }
}
