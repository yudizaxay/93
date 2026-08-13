import { Winner, ResultCategory } from '../types/game';
import { PersistenceAdapter } from './SettingsStore';

function isWinnerArray(value: unknown): value is Winner[] {
  return Array.isArray(value) && value.every((w) => typeof w === 'object' && w !== null && 'id' in w);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class WinnerStore {
  private winners: Winner[];

  constructor(private adapter: PersistenceAdapter) {
    const stored = this.safeRead();
    this.winners = isWinnerArray(stored) ? stored : [];
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
      this.adapter.write(this.winners as unknown as any);
    } catch {
      // Persistence failure must never crash gameplay (SOW §40).
    }
  }

  getAll(): Winner[] {
    return this.winners;
  }

  add(
    name: string,
    lawFirm: string,
    email: string,
    result: number,
    displayResult: string,
    category: ResultCategory = 'WIN'
  ): Winner {
    const winner: Winner = {
      id: generateId(),
      name,
      lawFirm,
      email,
      result,
      displayResult,
      category,
      createdAt: new Date().toISOString(),
    };
    this.winners = [...this.winners, winner];
    this.safeWrite();
    return winner;
  }

  clear(): void {
    this.winners = [];
    this.safeWrite();
  }
}
