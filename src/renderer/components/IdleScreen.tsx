import { WinnerRotation } from './WinnerRotation';
import { Dial } from './Dial';
import './IdleScreen.css';

/** onTrigger is the mouse/touch backup input path — same toggle as the arcade button. */
export function IdleScreen({
  rotationEnabled = false,
  targetSeconds,
  onTrigger,
}: {
  rotationEnabled?: boolean;
  targetSeconds?: number;
  onTrigger?: () => void;
}) {
  return (
    <div className="idle-screen" onPointerDown={onTrigger}>
      <header className="idle-brand">
        <span className="idle-seal" aria-hidden="true">C</span>
        <span className="idle-brand-text">COALITION COURT REPORTERS</span>
      </header>

      <div className="idle-layout">
        <div className="idle-eyebrow">DOCKET NO. 0.93</div>
        <h1 className="idle-title">9-3 Verdict Challenge</h1>
        <p className="idle-prompt">Can you land on exactly 0.93 seconds?</p>

        <Dial fillPercent={0} tone="dim" targetSeconds={targetSeconds} ambient>
          <div className="idle-target">0.93</div>
        </Dial>
      </div>

      {/* Anchored to the bottom edge and partially clipped by it, like the
          physical arcade button mounted below the TV — the screen's own
          call-to-action, not just a floating shape. */}
      <div className="idle-press-button" aria-hidden="true">
        <span className="idle-press-button-label">TAP TO START</span>
      </div>

      <div className="idle-winners-panel">
        <WinnerRotation enabled={rotationEnabled} />
      </div>
    </div>
  );
}
