import { describe, it, expect, vi } from 'vitest';
import { TimerEngine } from './TimerEngine';

describe('TimerEngine', () => {
  it('is not running before start', () => {
    const t = new TimerEngine();
    expect(t.isRunning()).toBe(false);
  });

  it('is running after start', () => {
    const t = new TimerEngine();
    t.start(1000);
    expect(t.isRunning()).toBe(true);
  });

  it('computes elapsed seconds from caller-supplied timestamps, not wall clock', () => {
    const t = new TimerEngine();
    t.start(1000);
    expect(t.getElapsedSeconds(1932.481)).toBeCloseTo(0.932481, 6);
  });

  it('stop returns elapsed seconds and stops running', () => {
    const t = new TimerEngine();
    t.start(1000);
    const elapsed = t.stop(1933);
    expect(elapsed).toBeCloseTo(0.933, 6);
    expect(t.isRunning()).toBe(false);
  });

  it('reset clears state back to not-running with zero elapsed', () => {
    const t = new TimerEngine();
    t.start(1000);
    t.stop(1500);
    t.reset();
    expect(t.isRunning()).toBe(false);
    expect(t.getElapsedSeconds(9999)).toBe(0);
  });

  it('onTick subscribers receive display-formatted seconds and can unsubscribe', () => {
    const t = new TimerEngine();
    const cb = vi.fn();
    const unsubscribe = t.onTick(cb);
    t.start(1000);
    t.publishTick(1470); // simulated rAF-driven tick, see Step 3
    expect(cb).toHaveBeenCalledWith('0.47');
    unsubscribe();
    t.publishTick(1500);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
