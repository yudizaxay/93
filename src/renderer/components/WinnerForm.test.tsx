import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WinnerForm } from './WinnerForm';
import { GameResult } from '../types/game';

const result: GameResult = {
  rawSeconds: 0.93,
  displaySeconds: '0.93',
  differenceFromTarget: 0,
  category: 'WIN',
};

function typeChar(char: string) {
  fireEvent.keyDown(window, { key: char });
}

function pressKey(key: string) {
  fireEvent.keyDown(window, { key });
}

describe('WinnerForm physical keyboard field progression', () => {
  beforeEach(() => {
    (window as unknown as { api: { addWinner: ReturnType<typeof vi.fn> } }).api = {
      addWinner: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('Tab advances name -> lawFirm -> email -> save, same as Enter', async () => {
    const onSaved = vi.fn();
    render(<WinnerForm result={result} onSaved={onSaved} onSkip={() => {}} />);

    typeChar('A');
    pressKey('Tab'); // name -> lawFirm
    typeChar('B');
    pressKey('Tab'); // lawFirm -> email
    typeChar('C');
    typeChar('@');
    typeChar('X');
    typeChar('.');
    typeChar('Y');
    pressKey('Tab'); // email -> save (canSave true)

    expect(window.api.addWinner).toHaveBeenCalledWith('A', 'B', 'C@X.Y', 0.93, '0.93', 'WIN');
  });

  it('a lone Tab press after typing a name does not jump straight to save', () => {
    const { container } = render(<WinnerForm result={result} onSaved={() => {}} onSkip={() => {}} />);
    typeChar('A');
    pressKey('Tab');
    // Law Firm field should now be active/typeable — typing lands there, not swallowed.
    typeChar('B');
    const lawFirmInput = container.querySelectorAll('.winner-input')[1];
    expect(lawFirmInput).toHaveTextContent('B');
  });
});
