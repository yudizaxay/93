export type LogEvent =
  | 'APP_STARTED'
  | 'GAME_STARTED'
  | 'GAME_STOPPED'
  | 'RESULT_WIN'
  | 'RESULT_NEAR'
  | 'RESULT_OTHER'
  | 'WINNER_SAVED'
  | 'SETTINGS_UPDATED'
  | 'INPUT_ERROR'
  | 'UNEXPECTED_ERROR';

export interface LogEntry {
  event: LogEvent;
  timestamp: string;
}

export class Logger {
  private entries: LogEntry[] = [];

  constructor(private maxEntries = 500) {}

  log(event: LogEvent): void {
    this.entries.push({ event, timestamp: new Date().toISOString() });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }
  }

  getRecent(): LogEntry[] {
    return this.entries;
  }
}
