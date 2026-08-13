import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnScreenKeyboard } from './OnScreenKeyboard';

describe('OnScreenKeyboard', () => {
  it('calls onKey with the letter when a key button is clicked', () => {
    const onKey = vi.fn();
    render(<OnScreenKeyboard onKey={onKey} onBackspace={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onKey).toHaveBeenCalledWith('A');
  });

  it('calls onBackspace when backspace is clicked', () => {
    const onBackspace = vi.fn();
    render(<OnScreenKeyboard onKey={() => {}} onBackspace={onBackspace} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /backspace/i }));
    expect(onBackspace).toHaveBeenCalled();
  });

  it('calls onDone when Done is clicked', () => {
    const onDone = vi.fn();
    render(<OnScreenKeyboard onKey={() => {}} onBackspace={() => {}} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('emits a space character when the space bar is clicked', () => {
    const onKey = vi.fn();
    render(<OnScreenKeyboard onKey={onKey} onBackspace={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^space$/i }));
    expect(onKey).toHaveBeenCalledWith(' ');
  });

  it('emits @ and . for email entry', () => {
    const onKey = vi.fn();
    render(<OnScreenKeyboard onKey={onKey} onBackspace={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /at sign/i }));
    expect(onKey).toHaveBeenCalledWith('@');
    fireEvent.click(screen.getByRole('button', { name: /period/i }));
    expect(onKey).toHaveBeenCalledWith('.');
  });
});
