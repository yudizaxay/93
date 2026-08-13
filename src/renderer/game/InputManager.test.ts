import { describe, it, expect, vi } from 'vitest';
import { InputManager } from './InputManager';
import { DEFAULT_SETTINGS } from '../types/settings';

/** Mock engine whose isRunning() stays consistent with the accepted start/stop calls. */
function makeEngine() {
  let running = false;
  return {
    handleStart: vi.fn(() => { running = true; }),
    handleStop: vi.fn(() => { running = false; }),
    isRunning: () => running,
  };
}

describe('InputManager', () => {
  it('ignores keydown events for keys other than the configured buttonKey', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Enter', repeat: false }, 1000);
    expect(engine.handleStart).not.toHaveBeenCalled();
  });

  it('ignores repeat keydown events', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Space', repeat: true }, 1000);
    expect(engine.handleStart).not.toHaveBeenCalled();
  });

  it('calls handleStart on the first valid press, handleStop on the second', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000);
    expect(engine.handleStart).toHaveBeenCalledWith(1000);
    im.handleKeydown({ code: 'Space', repeat: false }, 1200);
    expect(engine.handleStop).toHaveBeenCalledWith(1200);
  });

  it('debounces presses within debounceMs of the previous accepted press', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 40 };
    const im = new InputManager(engine as any, () => settings);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000); // start accepted
    im.handleKeydown({ code: 'Space', repeat: false }, 1020); // within 40ms, rejected
    expect(engine.handleStop).not.toHaveBeenCalled();
    im.handleKeydown({ code: 'Space', repeat: false }, 1100); // outside debounce, accepted as stop
    expect(engine.handleStop).toHaveBeenCalledWith(1100);
  });

  it('applies a post-stop lockout preventing an immediate new start', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 0, lockoutMs: 500 };
    const im = new InputManager(engine as any, () => settings);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000); // start
    im.handleKeydown({ code: 'Space', repeat: false }, 1100); // stop
    engine.handleStart.mockClear();
    im.handleKeydown({ code: 'Space', repeat: false }, 1200); // within 500ms lockout after stop
    expect(engine.handleStart).not.toHaveBeenCalled();
    im.handleKeydown({ code: 'Space', repeat: false }, 1700); // after lockout
    expect(engine.handleStart).toHaveBeenCalledWith(1700);
  });

  it('handleManualTrigger (mouse/touch backup) routes through the same start/stop toggle as keyboard', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 0, lockoutMs: 0 };
    const im = new InputManager(engine as any, () => settings);
    im.handleManualTrigger(1000);
    expect(engine.handleStart).toHaveBeenCalledWith(1000);
    im.handleManualTrigger(1200);
    expect(engine.handleStop).toHaveBeenCalledWith(1200);
  });
});
