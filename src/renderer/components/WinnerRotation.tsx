import { useEffect, useState } from 'react';
import { Winner } from '../types/game';
import './WinnerRotation.css';

const ROTATION_INTERVAL_MS = 4000;

export function WinnerRotation({ enabled }: { enabled: boolean }) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [index, setIndex] = useState(-1); // -1 = showing the default prompt

  useEffect(() => {
    if (!enabled) return;
    // Leads captured after a NEAR/OTHER (non-winning) attempt live in the same
    // store but must never appear on the public "Recent Verdicts"
    // rotation as if they'd won — see captureOnLossEnabled.
    window.api.getWinners().then((w) => setWinners(w.filter((x) => x.category === 'WIN').slice(-10)));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || winners.length === 0) return;
    const interval = setInterval(() => {
      setIndex((i) => ((i + 2) % (winners.length + 1)) - 1);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, winners]);

  // The idle screen's own headline already asks the question, so the
  // rotation strip stays silent until there's an actual winner to show.
  if (!enabled || winners.length === 0 || index === -1) {
    return null;
  }

  const winner = winners[index];
  return (
    <div className="winner-rotation">
      <div className="winner-rotation-heading">RECENT VERDICTS</div>
      <div className="winner-rotation-name" key={winner.name + index}>
        {winner.name}
      </div>
    </div>
  );
}
