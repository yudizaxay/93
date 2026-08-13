export interface GameSettings {
  target: number;
  winMin: number;
  winMax: number;
  nearMin: number;
  nearMax: number;
  autoResetMs: number;
  soundEnabled: boolean;
  soundVolume: number;
  winnerCaptureEnabled: boolean;
  /** Same prompt as winnerCaptureEnabled, but shown after a NEAR/OTHER (non-winning)
   * result — lets the booth capture leads from players who didn't win too. */
  captureOnLossEnabled: boolean;
  winnerRotationEnabled: boolean;
  buttonKey: string;
  debounceMs: number;
  lockoutMs: number;
  winnerEntryTimeoutMs: number;
  maxRunningMs: number;
  /** Text shown under "9-3 PLAINTIFF VERDICT" on the WIN screen — admin-editable
   * so booth staff can rename the prize copy per event without a code change. */
  winSubtitleText: string;
  /** Screen touch/mouse click as a backup to the physical arcade button. */
  allowManualTrigger: boolean;
  /** Forces the kiosk layout independent of the physical screen's aspect ratio —
   * lets staff preview/verify the booth's TV layout on any monitor. */
  orientation: 'landscape' | 'portrait';
  /** Auto-hides the mouse cursor after inactivity; off keeps it always visible
   * (useful when testing with a mouse instead of the arcade button). */
  hideCursor: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  target: 0.93,
  winMin: 0.925,
  winMax: 0.934999,
  nearMin: 0.9,
  nearMax: 0.96,
  autoResetMs: 8000,
  soundEnabled: true,
  soundVolume: 0.8,
  winnerCaptureEnabled: true,
  captureOnLossEnabled: false,
  winnerRotationEnabled: true,
  buttonKey: 'Space',
  debounceMs: 40,
  lockoutMs: 500,
  winnerEntryTimeoutMs: 8000,
  maxRunningMs: 30000,
  winSubtitleText: 'YOU WIN!',
  allowManualTrigger: true,
  orientation: 'landscape',
  hideCursor: true,
};
