import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';

export interface PersistenceAdapter {
  read(): unknown;
  write(value: GameSettings): void;
}

function isValidShape(value: unknown): value is Partial<GameSettings> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.target === 'number' &&
    typeof v.winMin === 'number' &&
    typeof v.winMax === 'number' &&
    typeof v.nearMin === 'number' &&
    typeof v.nearMax === 'number' &&
    typeof v.autoResetMs === 'number' &&
    typeof v.buttonKey === 'string'
  );
}

function validate(settings: GameSettings): string[] {
  const errors: string[] = [];
  if (!(settings.winMin <= settings.winMax)) errors.push('winMin must be <= winMax');
  if (!(settings.nearMin <= settings.nearMax)) errors.push('nearMin must be <= nearMax');
  if (!(settings.target > 0)) errors.push('target must be > 0');
  if (!(settings.autoResetMs > 0)) errors.push('autoResetMs must be > 0');
  return errors;
}

export class SettingsStore {
  private current: GameSettings;

  constructor(private adapter: PersistenceAdapter) {
    const stored = this.safeRead();
    // Always merge over defaults: a settings file written by an older build can be
    // missing newer fields, and an undefined debounceMs/lockoutMs/maxRunningMs
    // silently disables debounce, lockout and the stuck-RUNNING watchdog.
    this.current = { ...DEFAULT_SETTINGS, ...(isValidShape(stored) ? stored : {}) };
  }

  private safeRead(): unknown {
    try {
      return this.adapter.read();
    } catch {
      return undefined;
    }
  }

  private safeWrite(settings: GameSettings): void {
    try {
      this.adapter.write(settings);
    } catch {
      // Persistence failure must never crash gameplay (SOW §40).
    }
  }

  get(): GameSettings {
    return this.current;
  }

  update(partial: Partial<GameSettings>): { ok: true; settings: GameSettings } | { ok: false; errors: string[] } {
    const defined = Object.fromEntries(
      Object.entries(partial).filter(([, v]) => v !== undefined),
    ) as Partial<GameSettings>;
    const candidate: GameSettings = { ...DEFAULT_SETTINGS, ...this.current, ...defined };
    const errors = validate(candidate);
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    this.current = candidate;
    this.safeWrite(this.current);
    return { ok: true, settings: this.current };
  }

  resetToDefaults(): GameSettings {
    this.current = { ...DEFAULT_SETTINGS };
    this.safeWrite(this.current);
    return this.current;
  }
}
