import { useEffect } from 'react';
import { Timer } from './Timer';
import { Dial } from './Dial';
import { secondsToFillPercent } from '../game/dialMath';
import { audioManager } from '../audio/AudioManager';
import './RunningScreen.css';

/** onTrigger is the mouse/touch backup input path — same toggle as the arcade button. */
export function RunningScreen({
  displaySeconds,
  targetSeconds,
  onTrigger,
}: {
  displaySeconds: string;
  targetSeconds?: number;
  onTrigger?: () => void;
}) {
  const elapsed = Number.parseFloat(displaySeconds) || 0;

  useEffect(() => {
    audioManager.play('start');
  }, []);

  return (
    <div className="running-screen" onPointerDown={onTrigger}>
      <div className="running-eyebrow">RECORDING THE TIME</div>
      <Dial fillPercent={secondsToFillPercent(elapsed)} targetSeconds={targetSeconds} tone="red" punch>
        <Timer displaySeconds={displaySeconds} />
      </Dial>
    </div>
  );
}
