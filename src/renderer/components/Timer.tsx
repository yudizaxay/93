import './Timer.css';

export function Timer({ displaySeconds }: { displaySeconds: string }) {
  return <div className="timer-display">{displaySeconds}</div>;
}
