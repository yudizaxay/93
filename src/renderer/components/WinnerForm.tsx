import { useEffect, useRef, useState } from 'react';
import { OnScreenKeyboard } from './OnScreenKeyboard';
import { GameResult } from '../types/game';
import './WinnerForm.css';

type Field = 'name' | 'lawFirm' | 'email';

const FIELD_MAX_LENGTH: Record<Field, number> = { name: 40, lawFirm: 60, email: 60 };

// Deliberately permissive (just "text@text.text") — this only needs to
// catch obvious garbage/incomplete addresses before they're persisted,
// not fully validate RFC 5322 email syntax.
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function WinnerForm({
  result,
  onSaved,
  onSkip,
  onActivity,
}: {
  result: GameResult;
  onSaved: () => void;
  onSkip: () => void;
  onActivity: () => void;
}) {
  const [name, setName] = useState('');
  const [lawFirm, setLawFirm] = useState('');
  const [email, setEmail] = useState('');
  const [activeField, setActiveField] = useState<Field>('name');

  const values: Record<Field, [string, (v: string) => void]> = {
    name: [name, setName],
    lawFirm: [lawFirm, setLawFirm],
    email: [email, setEmail],
  };

  const handleKey = (char: string) => {
    const [value, setValue] = values[activeField];
    if (value.length >= FIELD_MAX_LENGTH[activeField]) return;
    setValue(value + char);
    onActivity();
  };

  const handleBackspace = () => {
    const [value, setValue] = values[activeField];
    setValue(value.slice(0, -1));
    onActivity();
  };

  const selectField = (f: Field) => {
    setActiveField(f);
    onActivity();
  };

  // Email is optional (SOW allows leaving it blank), but if something was
  // typed it must look like an address — otherwise obviously-broken input
  // (stray keystrokes, "asdasd") would silently get stored as the winner's
  // contact info.
  const emailValid = email.trim().length === 0 || EMAIL_PATTERN.test(email.trim());
  const canSave = name.trim().length > 0 && emailValid;

  const save = async () => {
    // An empty entry would show as a blank line in the idle rotation.
    if (!canSave) return;
    await window.api.addWinner(
      name.trim(),
      lawFirm.trim(),
      email.trim(),
      result.rawSeconds,
      result.displaySeconds,
      result.category
    );
    onSaved();
  };

  const handleDone = () => {
    if (activeField === 'name') {
      selectField('lawFirm');
      return;
    }
    if (activeField === 'lawFirm') {
      selectField('email');
      return;
    }
    if (!canSave) {
      // Send them to whichever field is actually blocking save — name if
      // it's still empty, otherwise stay on email so they can fix the format.
      selectField(name.trim().length === 0 ? 'name' : 'email');
      return;
    }
    onActivity();
    void save();
  };

  // A physical/USB keyboard should type into whichever field is active, the
  // same as the on-screen keyboard — booth staff filling this in for a
  // winner shouldn't be forced to tap glass letter-by-letter. The listener
  // itself is attached exactly once for the component's lifetime (empty
  // dependency array) and always reads the current handlers through a ref
  // — re-attaching it on every keystroke (the first attempt) opened a race
  // window under fast typing where two listeners were briefly both live,
  // occasionally double-processing a keydown into a stray character. The
  // global arcade-button listener (bound to Space in useGameEngine) safely
  // no-ops while the engine is in WINNER_ENTRY, so typing a space here
  // never fights the game input.
  const latestHandlers = useRef({ handleKey, handleBackspace, handleDone });
  latestHandlers.current = { handleKey, handleBackspace, handleDone };

  useEffect(() => {
    const onPhysicalKeydown = (e: KeyboardEvent) => {
      const { handleKey, handleBackspace, handleDone } = latestHandlers.current;
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDone();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        handleKey(' ');
        return;
      }
      if (e.key === '@' || e.key === '.') {
        handleKey(e.key);
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onPhysicalKeydown);
    return () => window.removeEventListener('keydown', onPhysicalKeydown);
  }, []);

  return (
    <div className="winner-form">
      <div className="winner-form-eyebrow">DOCKET NO. 0.93 — VERDICT RECORDED</div>
      {result.category === 'WIN' ? (
        <h1>ADD YOUR NAME TO<br />CAALA PLAINTIFF VERDICTS?</h1>
      ) : (
        <h1>WANT US TO<br />FOLLOW UP WITH YOU?</h1>
      )}
      <div className="winner-card">
        <div className="winner-fields">
          <label className={activeField === 'name' ? 'active' : ''} onClick={() => selectField('name')}>
            Name<div className="winner-input">{name || ' '}</div>
          </label>
          <label className={activeField === 'lawFirm' ? 'active' : ''} onClick={() => selectField('lawFirm')}>
            Law Firm<div className="winner-input">{lawFirm || ' '}</div>
          </label>
          <label className={activeField === 'email' ? 'active' : ''} onClick={() => selectField('email')}>
            Email
            <div className={`winner-input${email.trim().length > 0 && !emailValid ? ' invalid' : ''}`}>
              {email || ' '}
            </div>
            {email.trim().length > 0 && !emailValid && (
              <div className="winner-field-error">Enter a valid email, or leave it blank</div>
            )}
          </label>
        </div>
        <div className="winner-actions">
          <button onClick={save} disabled={!canSave}>SAVE</button>
          <button onClick={onSkip}>SKIP</button>
        </div>
      </div>
      <OnScreenKeyboard onKey={handleKey} onBackspace={handleBackspace} onDone={handleDone} />
    </div>
  );
}
