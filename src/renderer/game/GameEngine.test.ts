import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { DEFAULT_SETTINGS } from '../types/settings';
import { GameState } from '../types/game';

describe('GameEngine', () => {
  it('starts in IDLE', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('transitions IDLE -> RUNNING on handleStart', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);
  });

  it('ignores handleStart while already RUNNING', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStart(1200); // should be a no-op, not a restart
    engine.handleStop(1933); // elapsed should be measured from 1000, not 1200
    expect(engine.getSnapshot().result?.rawSeconds).toBeCloseTo(0.933, 6);
  });

  it('transitions RUNNING -> RESULT_WIN on a winning stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1930); // 0.930s, inside winMin/winMax
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_WIN);
    expect(engine.getSnapshot().result?.category).toBe('WIN');
  });

  it('transitions RUNNING -> RESULT_NEAR on a near stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1950);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_NEAR);
  });

  it('transitions RUNNING -> RESULT_OTHER on a far stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(2170);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_OTHER);
  });

  it('ignores handleStop while IDLE', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStop(1000);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('moves RESULT_WIN -> WINNER_ENTRY only if winnerCaptureEnabled', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult();
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('moves RESULT_WIN straight to IDLE if winnerCaptureEnabled is false', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: false };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult();
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('isRunning() reflects RUNNING state only', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    expect(engine.isRunning()).toBe(false);
    engine.handleStart(1000);
    expect(engine.isRunning()).toBe(true);
    engine.handleStop(1930);
    expect(engine.isRunning()).toBe(false);
  });

  it('proceedFromResult() no-ops when the state has already moved past the result', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult(); // -> WINNER_ENTRY
    engine.proceedFromResult(); // duplicate (UI timeout + watchdog) must not reset
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('watchdogs RESULT_WIN out of the win screen even if the UI never proceeds', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000, winnerCaptureEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.tick(2000);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_WIN);
    engine.tick(2931);
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('watchdogs RESULT_WIN straight to IDLE when winner capture is disabled', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000, winnerCaptureEnabled: false };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.tick(2931);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('auto-resets from RESULT_NEAR/OTHER to IDLE after autoResetMs via tick()', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000 };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(2170);
    engine.tick(2170); // just after result
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_OTHER);
    engine.tick(3171); // 1001ms later
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('moves RESULT_NEAR/OTHER -> WINNER_ENTRY when captureOnLossEnabled is true', () => {
    const settings = { ...DEFAULT_SETTINGS, captureOnLossEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(2170); // RESULT_OTHER
    engine.proceedFromResult();
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('watchdogs RESULT_NEAR/OTHER into WINNER_ENTRY (not straight to IDLE) when captureOnLossEnabled via tick()', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000, captureOnLossEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(2170); // RESULT_OTHER
    engine.tick(3171); // 1001ms later — autoResetMs watchdog fires
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('does not route a WIN through captureOnLossEnabled, nor a loss through winnerCaptureEnabled', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: false, captureOnLossEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930); // RESULT_WIN
    engine.proceedFromResult();
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('auto-cancels a stuck RUNNING game after maxRunningMs via tick()', () => {
    const settings = { ...DEFAULT_SETTINGS, maxRunningMs: 30000 };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.tick(31001);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('skipWinnerEntry returns to IDLE from WINNER_ENTRY', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult();
    engine.skipWinnerEntry();
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('notifies subscribers on every state change and supports unsubscribe', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    const cb = vi.fn();
    const unsubscribe = engine.subscribe(cb);
    engine.handleStart(1000);
    expect(cb).toHaveBeenCalled();
    unsubscribe();
    const callCountAfterUnsub = cb.mock.calls.length;
    engine.handleStop(1930);
    expect(cb.mock.calls.length).toBe(callCountAfterUnsub);
  });

  it('WINNER_ENTRY never times out via tick() — only skipWinnerEntry()/save can leave it', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000 };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult();
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
    engine.tick(1_000_000); // arbitrarily long dwell — a winner/lead can take as long as they need to fill in the form
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
    engine.skipWinnerEntry();
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });
});
