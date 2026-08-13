type TickListener = (displaySeconds: string) => void;

export class TimerEngine {
  private startTimestamp: number | null = null;
  private listeners = new Set<TickListener>();

  isRunning(): boolean {
    return this.startTimestamp !== null;
  }

  start(nowMs: number): void {
    this.startTimestamp = nowMs;
  }

  getElapsedSeconds(nowMs: number): number {
    if (this.startTimestamp === null) return 0;
    return (nowMs - this.startTimestamp) / 1000;
  }

  stop(nowMs: number): number {
    const elapsed = this.getElapsedSeconds(nowMs);
    this.startTimestamp = null;
    return elapsed;
  }

  reset(): void {
    this.startTimestamp = null;
  }

  onTick(cb: TickListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Called from a requestAnimationFrame loop owned by the caller (see
   * GameEngine/Timer.tsx). Never used to compute the result — display only.
   */
  publishTick(nowMs: number): void {
    if (this.startTimestamp === null) return;
    const display = Math.max(0, this.getElapsedSeconds(nowMs)).toFixed(2);
    this.listeners.forEach((cb) => cb(display));
  }
}
