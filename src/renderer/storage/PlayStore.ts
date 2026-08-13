import { PlayRecord, ResultCategory } from '../types/game';
import { PersistenceAdapter } from './SettingsStore';

function isPlayArray(value: unknown): value is PlayRecord[] {
  return Array.isArray(value) && value.every((p) => typeof p === 'object' && p !== null && 'id' in p);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Every completed round (WIN, NEAR, or OTHER) — the source of truth for the
 * Admin Panel's Booth Stats & Export tab. Separate from WinnerStore, which
 * only ever holds the subset of WIN rounds a player chose to leave details for. */
export class PlayStore {
  private plays: PlayRecord[];

  constructor(private adapter: PersistenceAdapter) {
    const stored = this.safeRead();
    this.plays = isPlayArray(stored) ? stored : [];
  }

  private safeRead(): unknown {
    try {
      return this.adapter.read();
    } catch {
      return undefined;
    }
  }

  private safeWrite(): void {
    try {
      this.adapter.write(this.plays as unknown as any);
    } catch {
      // Persistence failure must never crash gameplay (SOW §40).
    }
  }

  getAll(): PlayRecord[] {
    return this.plays;
  }

  add(category: ResultCategory, result: number, displayResult: string): PlayRecord {
    const play: PlayRecord = {
      id: generateId(),
      category,
      result,
      displayResult,
      createdAt: new Date().toISOString(),
    };
    this.plays = [...this.plays, play];
    this.safeWrite();
    return play;
  }

  clear(): void {
    this.plays = [];
    this.safeWrite();
  }
}
