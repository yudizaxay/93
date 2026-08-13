import { describe, it, expect } from 'vitest';
import { classify } from './ResultEngine';
import { DEFAULT_SETTINGS } from '../types/settings';

describe('classify', () => {
  it('classifies below win range as OTHER or NEAR depending on near range', () => {
    expect(classify(0.9249, DEFAULT_SETTINGS).category).toBe('NEAR');
  });

  it('classifies winMin boundary as WIN', () => {
    expect(classify(0.925, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies mid win range as WIN', () => {
    expect(classify(0.929, DEFAULT_SETTINGS).category).toBe('WIN');
    expect(classify(0.93, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies winMax boundary as WIN', () => {
    expect(classify(0.934999, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies just above winMax as NEAR (within near range)', () => {
    expect(classify(0.935, DEFAULT_SETTINGS).category).toBe('NEAR');
  });

  it('classifies 0.95 as NEAR', () => {
    const r = classify(0.95, DEFAULT_SETTINGS);
    expect(r.category).toBe('NEAR');
  });

  it('classifies far values as OTHER', () => {
    expect(classify(1.1, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('never classifies a WIN as NEAR even if near range overlaps win range', () => {
    const settings = { ...DEFAULT_SETTINGS, nearMin: 0.9, nearMax: 0.94 };
    expect(classify(0.93, settings).category).toBe('WIN');
  });

  it('handles negative values as OTHER without throwing', () => {
    expect(classify(-1, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('handles NaN as OTHER without throwing', () => {
    expect(classify(NaN, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('handles extremely large results as OTHER', () => {
    expect(classify(999999, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('formats displaySeconds to exactly two decimals with no s suffix', () => {
    const r = classify(0.932741, DEFAULT_SETTINGS);
    expect(r.displaySeconds).toBe('0.93');
    expect(r.displaySeconds).not.toMatch(/s$/);
  });

  it('retains full raw precision separate from display value', () => {
    const r = classify(0.932741, DEFAULT_SETTINGS);
    expect(r.rawSeconds).toBeCloseTo(0.932741, 6);
  });

  it('computes differenceFromTarget using absolute value', () => {
    const r = classify(0.95, DEFAULT_SETTINGS);
    expect(r.differenceFromTarget).toBeCloseTo(Math.abs(0.95 - DEFAULT_SETTINGS.target), 3);
  });
});
