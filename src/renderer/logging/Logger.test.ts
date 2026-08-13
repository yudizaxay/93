import { describe, it, expect } from 'vitest';
import { Logger } from './Logger';

describe('Logger', () => {
  it('records logged events with a timestamp', () => {
    const logger = new Logger(100);
    logger.log('GAME_STARTED');
    const entries = logger.getRecent();
    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe('GAME_STARTED');
    expect(typeof entries[0].timestamp).toBe('string');
  });

  it('bounds the log to maxEntries, dropping the oldest first', () => {
    const logger = new Logger(3);
    logger.log('GAME_STARTED');
    logger.log('GAME_STOPPED');
    logger.log('RESULT_WIN');
    logger.log('WINNER_SAVED');
    const entries = logger.getRecent();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.event)).toEqual(['GAME_STOPPED', 'RESULT_WIN', 'WINNER_SAVED']);
  });
});
