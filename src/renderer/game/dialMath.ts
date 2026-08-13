// Purely visual: how many seconds correspond to a full ring. Shared by
// RunningScreen and ResultScreen (via secondsToFillPercent below) so the ring
// appears to "freeze" exactly where it stopped rather than jumping to an
// unrelated position. Never feeds the game's result calculation, which stays
// entirely in GameEngine/ResultEngine.
const DIAL_VISUAL_MAX_SECONDS = 1.6;

export function secondsToFillPercent(seconds: number): number {
  return (seconds / DIAL_VISUAL_MAX_SECONDS) * 100;
}
