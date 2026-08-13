import { describe, it, expect } from 'vitest';
import { InputManager } from './InputManager';
import { GameEngine } from './GameEngine';
import { GameState } from '../types/game';
import { DEFAULT_SETTINGS, GameSettings } from '../types/settings';

/**
 * Regression coverage for the InputManager/GameEngine desync: InputManager used to
 * track start/stop direction in its own boolean, which drifted out of sync whenever
 * the engine no-opped a call (wrong state) or auto-transitioned on its own via tick().
 * These tests drive a REAL engine through a REAL input manager.
 */
function setup(overrides: Partial<GameSettings> = {}) {
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    debounceMs: 40,
    lockoutMs: 500,
    autoResetMs: 5000,
    maxRunningMs: 30000,
    winnerCaptureEnabled: false,
    ...overrides,
  };
  const engine = new GameEngine(() => settings);
  const input = new InputManager(engine, () => settings);
  const press = (nowMs: number) => input.handleKeydown({ code: settings.buttonKey, repeat: false }, nowMs);
  return { engine, input, press, settings };
}

describe('InputManager + real GameEngine', () => {
  it('responds on the very next press after an auto-reset, even with rejected presses in between', () => {
    const { engine, press } = setup({ nearMin: 0, nearMax: 10 }); // any stop lands in NEAR

    press(1000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);

    press(1600); // stop -> RESULT_NEAR
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_NEAR);

    // Impatient press: lockout has expired but the engine is still showing the result,
    // so handleStart legitimately no-ops. This must not flip any internal direction flag.
    press(2200);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_NEAR);

    engine.tick(1600 + 5000); // auto-reset fires
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);

    // The very next press must start a new game.
    press(7000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);
  });

  it('responds on the very next press after the stuck-RUNNING maxRunningMs auto-cancel', () => {
    const { engine, press } = setup();

    press(1000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);

    engine.tick(1000 + 30000); // stuck-RUNNING watchdog cancels back to IDLE
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);

    press(32000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);
  });

  it('still stops a running game on the second press (baseline toggle behaviour)', () => {
    const { engine, press } = setup({ winMin: 0, winMax: 10 });

    press(1000);
    press(1930);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_WIN);
  });

  it('keeps enforcing the post-stop lockout using real engine state', () => {
    const { engine, press } = setup({ nearMin: 0, nearMax: 10 });

    press(1000);
    press(1600); // stop
    press(1900); // inside 500ms lockout -> rejected
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_NEAR);

    engine.tick(1600 + 5000);
    press(7000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);
  });
});
