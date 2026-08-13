import { describe, it, expect } from 'vitest';
import { SettingsStore, PersistenceAdapter } from './SettingsStore';
import { DEFAULT_SETTINGS } from '../types/settings';

function makeMemoryAdapter(initial?: unknown): PersistenceAdapter {
  let value = initial;
  return {
    read: () => value,
    write: (v) => { value = v; },
  };
}

describe('SettingsStore', () => {
  it('returns defaults when the adapter has no stored value', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when stored value is corrupt/invalid shape', () => {
    const store = new SettingsStore(makeMemoryAdapter({ garbage: true }));
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a persisted object missing newer fields over defaults', () => {
    const store = new SettingsStore(makeMemoryAdapter({
      target: 0.5, winMin: 0.4, winMax: 0.6, nearMin: 0.3, nearMax: 0.7,
      autoResetMs: 4000, buttonKey: 'Enter',
      // debounceMs / lockoutMs / maxRunningMs / winnerEntryTimeoutMs absent (older build)
    }));
    const s = store.get();
    expect(s.target).toBe(0.5);
    expect(s.buttonKey).toBe('Enter');
    expect(s.debounceMs).toBe(DEFAULT_SETTINGS.debounceMs);
    expect(s.lockoutMs).toBe(DEFAULT_SETTINGS.lockoutMs);
    expect(s.maxRunningMs).toBe(DEFAULT_SETTINGS.maxRunningMs);
    expect(s.winnerEntryTimeoutMs).toBe(DEFAULT_SETTINGS.winnerEntryTimeoutMs);
  });

  it('update() merges valid partial changes and persists them', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store = new SettingsStore(adapter);
    const result = store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 });
    expect(result.ok).toBe(true);
    expect(store.get().target).toBe(0.5);
    const store2 = new SettingsStore(adapter);
    expect(store2.get().target).toBe(0.5);
  });

  it('update() rejects winMin > winMax with a validation error and does not persist', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ winMin: 0.9, winMax: 0.1 });
    expect(result.ok).toBe(false);
    expect(store.get().winMin).toBe(DEFAULT_SETTINGS.winMin);
  });

  it('update() rejects nearMin > nearMax', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ nearMin: 0.9, nearMax: 0.1 });
    expect(result.ok).toBe(false);
  });

  it('update() rejects target <= 0', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ target: 0 });
    expect(result.ok).toBe(false);
  });

  it('update() rejects autoResetMs <= 0', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ autoResetMs: 0 });
    expect(result.ok).toBe(false);
  });

  it('resetToDefaults() restores and persists DEFAULT_SETTINGS', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 });
    const restored = store.resetToDefaults();
    expect(restored).toEqual(DEFAULT_SETTINGS);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('does not throw if the adapter write() throws (gameplay must not crash)', () => {
    const adapter: PersistenceAdapter = {
      read: () => undefined,
      write: () => { throw new Error('disk full'); },
    };
    const store = new SettingsStore(adapter);
    expect(() => store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 })).not.toThrow();
  });
});
