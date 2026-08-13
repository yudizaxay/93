export enum GameState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  RESULT_WIN = 'RESULT_WIN',
  RESULT_NEAR = 'RESULT_NEAR',
  RESULT_OTHER = 'RESULT_OTHER',
  WINNER_ENTRY = 'WINNER_ENTRY',
}

export type ResultCategory = 'WIN' | 'NEAR' | 'OTHER';

export interface GameResult {
  rawSeconds: number;
  displaySeconds: string;
  differenceFromTarget: number;
  category: ResultCategory;
}

export interface Winner {
  id: string;
  name: string;
  lawFirm: string;
  email: string;
  result: number;
  displayResult: string;
  /** WIN entries are real prize winners; NEAR/OTHER entries are leads captured
   * from players who didn't win but left details anyway (see captureOnLossEnabled). */
  category: ResultCategory;
  createdAt: string;
}

/** One completed round, logged regardless of outcome — the raw material for
 * the Admin Panel's Booth Stats & Export tab. */
export interface PlayRecord {
  id: string;
  category: ResultCategory;
  result: number;
  displayResult: string;
  createdAt: string;
}
