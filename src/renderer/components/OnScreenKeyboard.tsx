import './OnScreenKeyboard.css';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function OnScreenKeyboard({
  onKey,
  onBackspace,
  onDone,
}: {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onDone: () => void;
}) {
  return (
    <div className="osk">
      {ROWS.map((row) => (
        <div className="osk-row" key={row}>
          {row.split('').map((char) => (
            <button key={char} onClick={() => onKey(char)}>
              {char}
            </button>
          ))}
        </div>
      ))}
      <div className="osk-row">
        <button onClick={() => onKey('@')} aria-label="At sign">
          @
        </button>
        <button onClick={() => onKey('.')} aria-label="Period">
          .
        </button>
        <button className="osk-wide" onClick={() => onKey(' ')} aria-label="Space">
          SPACE
        </button>
        <button onClick={onBackspace} aria-label="Backspace">
          ⌫
        </button>
        <button className="osk-done" onClick={onDone} aria-label="Done">
          DONE
        </button>
      </div>
    </div>
  );
}
