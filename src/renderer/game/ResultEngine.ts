import { GameResult, ResultCategory } from '../types/game';
import { GameSettings } from '../types/settings';

function classifyCategory(rawSeconds: number, settings: GameSettings): ResultCategory {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) {
    return 'OTHER';
  }
  if (rawSeconds >= settings.winMin && rawSeconds <= settings.winMax) {
    return 'WIN';
  }
  if (rawSeconds >= settings.nearMin && rawSeconds <= settings.nearMax) {
    return 'NEAR';
  }
  return 'OTHER';
}

export function classify(rawSeconds: number, settings: GameSettings): GameResult {
  const category = classifyCategory(rawSeconds, settings);
  const safeRaw = Number.isFinite(rawSeconds) ? rawSeconds : 0;
  const displaySeconds = Math.max(0, safeRaw).toFixed(2);
  const differenceFromTarget = Math.abs(safeRaw - settings.target);

  return {
    rawSeconds: safeRaw,
    displaySeconds,
    differenceFromTarget,
    category,
  };
}
