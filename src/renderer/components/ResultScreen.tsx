import { useEffect, useState } from 'react';
import { GameResult } from '../types/game';
import { audioManager } from '../audio/AudioManager';
import { Confetti } from './Confetti';
import { Dial } from './Dial';
import { secondsToFillPercent } from '../game/dialMath';
import { BrandHeader } from './BrandHeader';
import './ResultScreen.css';

function formatDifference(diff: number): string {
  return diff.toFixed(2).replace(/^0/, '');
}

export function ResultScreen({
  result,
  onProceed,
  soundEnabled = true,
  soundVolume = 0.8,
  targetSeconds,
  winSubtitle = 'YOU WIN!',
}: {
  result: GameResult;
  onProceed: () => void;
  soundEnabled?: boolean;
  soundVolume?: number;
  targetSeconds?: number;
  winSubtitle?: string;
}) {
  const [showBuzzer, setShowBuzzer] = useState(true);

  useEffect(() => {
    audioManager.setEnabled(soundEnabled);
    audioManager.setVolume(soundVolume);
  }, [soundEnabled, soundVolume]);

  useEffect(() => {
    // The buzzer is the immediate "stop" acknowledgement, independent of
    // whether the attempt turns out to be a win — it plays/flashes the
    // instant this screen mounts, before the category-specific beat below.
    audioManager.play('stop');
    setShowBuzzer(true);
    const buzzerTimeout = setTimeout(() => setShowBuzzer(false), 220);

    const soundName = result.category === 'WIN' ? 'win' : result.category === 'NEAR' ? 'near' : 'other';
    audioManager.play(soundName as 'win' | 'near' | 'other' | 'start' | 'stop');

    if (result.category === 'WIN') {
      const timeout = setTimeout(onProceed, 4200); // celebration beat before winner prompt — longer dwell on the win animation
      return () => {
        clearTimeout(timeout);
        clearTimeout(buzzerTimeout);
      };
    }
    return () => clearTimeout(buzzerTimeout);
  }, [result, onProceed]);

  const buzzer = showBuzzer && <div className="result-buzzer-flash" />;

  if (result.category === 'WIN') {
    return (
      <>
        {buzzer}
        <Confetti active={true} />
        <div className="result-screen result-win">
          <BrandHeader />
          <Dial fillPercent={100} targetSeconds={targetSeconds} tone="brass" punch>
            <div className="result-value">{result.displaySeconds}</div>
          </Dial>
          <div className="result-heading">9-3 PLAINTIFF VERDICT</div>
          <div className="result-subheading">{winSubtitle}</div>
        </div>
      </>
    );
  }

  // NEAR/OTHER show the ring exactly where the real elapsed time left it —
  // matching RunningScreen's fill so the dial reads as a genuine record of
  // the attempt, not a decoration unrelated to the number next to it.
  const fillPercent = secondsToFillPercent(result.rawSeconds);

  if (result.category === 'NEAR') {
    return (
      <>
        {buzzer}
        <div className="result-screen result-near">
          <BrandHeader />
          <Dial fillPercent={fillPercent} targetSeconds={targetSeconds} tone="dim" punch>
            <div className="result-value">{result.displaySeconds}</div>
          </Dial>
          <div className="result-heading">SO CLOSE!</div>
          <div className="result-subheading">ONLY {formatDifference(result.differenceFromTarget)} AWAY!</div>
        </div>
      </>
    );
  }

  return (
    <>
      {buzzer}
      <div className="result-screen result-other">
        <BrandHeader />
        <Dial fillPercent={fillPercent} targetSeconds={targetSeconds} tone="dim" punch>
          <div className="result-value">{result.displaySeconds}</div>
        </Dial>
        <div className="result-heading">DEFENSE VERDICT</div>
        <div className="result-subheading">TRY AGAIN!</div>
      </div>
    </>
  );
}
