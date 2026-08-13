import { GameSettings } from './settings';
import { Winner, PlayRecord, ResultCategory } from './game';

export interface ElectronApi {
  getSettings(): Promise<GameSettings>;
  updateSettings(partial: Partial<GameSettings>): Promise<{ ok: boolean; errors?: string[]; settings: GameSettings }>;
  resetSettings(): Promise<GameSettings>;
  getWinners(): Promise<Winner[]>;
  addWinner(
    name: string,
    lawFirm: string,
    email: string,
    result: number,
    displayResult: string,
    category: ResultCategory
  ): Promise<Winner>;
  clearWinners(): Promise<void>;
  getPlays(): Promise<PlayRecord[]>;
  addPlay(category: ResultCategory, result: number, displayResult: string): Promise<PlayRecord>;
  clearPlays(): Promise<void>;
  onAdminToggle(cb: () => void): () => void;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
