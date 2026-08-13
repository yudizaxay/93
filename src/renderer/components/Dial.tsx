import './Dial.css';

// Purely visual: how many seconds correspond to a full ring. Shared by
// RunningScreen and ResultScreen so the ring appears to "freeze" exactly
// where it stopped rather than jumping to an unrelated position. Never
// feeds the game's result calculation, which stays entirely in
// GameEngine/ResultEngine.
export const DIAL_VISUAL_MAX_SECONDS = 1.6;

export function secondsToFillPercent(seconds: number): number {
  return (seconds / DIAL_VISUAL_MAX_SECONDS) * 100;
}

// The ring's fill is a conic-gradient starting at 9 o'clock (`from -90deg`)
// and sweeping clockwise, so a fill percentage P ends at clock-angle
// (270 + P*3.6) mod 360, measured clockwise from 12 o'clock — the same
// system CSS `transform: rotate()` uses. The target mark must be rotated
// by exactly this angle for a given percentage, or it silently drifts out
// of sync with where the fill ring actually stops (this happened once: a
// hardcoded 135deg mark represented 1.00s, not the intended 0.93s target,
// so a genuine 0.98s result appeared to fall short of the marker).
function percentToClockAngle(percent: number): number {
  return (270 + percent * 3.6) % 360;
}

/**
 * The booth's signature visual: a courtroom-clock dial standing in for the
 * timer. `fillPercent` is purely decorative — it never feeds the game's
 * result calculation, which stays entirely in GameEngine/ResultEngine.
 */
export function Dial({
  fillPercent,
  targetSeconds,
  tone = 'red',
  punch = false,
  ambient = false,
  children,
}: {
  fillPercent: number;
  /** The real (possibly admin-configured) target, in seconds — defaults to
   * 0.93 so callers that don't have settings handy still calibrate correctly. */
  targetSeconds?: number;
  tone?: 'red' | 'brass' | 'dim';
  /** Plays a short punch/settle animation on mount — the visual echo of the
   * button press that produced this screen (physical button, keyboard, or
   * on-screen click all land here alike). */
  punch?: boolean;
  /** Idle-only: a slow breathing glow + scanning sweep so the booth reads as
   * "waiting for you" from across the room instead of a dead, static ring. */
  ambient?: boolean;
  children: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, fillPercent));
  const targetAngle = percentToClockAngle(secondsToFillPercent(targetSeconds ?? 0.93));
  const classes = ['dial', `dial-${tone}`, punch && 'dial-punch', ambient && 'dial-ambient']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={classes}
      style={{ '--fill': `${clamped}%`, '--target-angle': `${targetAngle}deg` } as React.CSSProperties}
    >
      <div className="dial-ticks" />
      {ambient && <div className="dial-sweep" />}
      <div className="dial-target-mark" />
      <div className="dial-face">
        <div className="dial-content">{children}</div>
      </div>
    </div>
  );
}
