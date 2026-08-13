import { useCallback, useEffect, useState } from 'react';
import { GameState } from './types/game';
import { GameSettings, DEFAULT_SETTINGS } from './types/settings';
import { useGameEngine } from './game/useGameEngine';
import { useCursorAutoHide } from './hooks/useCursorAutoHide';
import { IdleScreen } from './components/IdleScreen';
import { RunningScreen } from './components/RunningScreen';
import { ResultScreen } from './components/ResultScreen';
import { AdminPanel } from './components/AdminPanel';
import { WinnerForm } from './components/WinnerForm';

export default function App() {
  const [isAdminOpen, setAdminOpen] = useState(false);
  // Single source of truth for settings: loaded once, updated on every admin save,
  // and pushed into the engine/input manager through useGameEngine.
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const { snapshot, engine, logger, manualTrigger } = useGameEngine(settings, !isAdminOpen);

  useCursorAutoHide(settings?.hideCursor ?? DEFAULT_SETTINGS.hideCursor);

  useEffect(() => window.api.onAdminToggle(() => setAdminOpen((v) => !v)), []);

  useEffect(() => {
    window.api.getSettings().then(setSettings);
  }, []);

  // Forces the kiosk layout independent of the physical screen's aspect
  // ratio, so staff can verify the booth's TV layout on any monitor — see
  // the matching `[data-orientation="portrait"]` rules alongside each
  // screen's `@media (orientation: portrait)` fallback.
  useEffect(() => {
    document.documentElement.dataset.orientation = settings?.orientation ?? DEFAULT_SETTINGS.orientation;
  }, [settings?.orientation]);

  // Stable identity: a fresh callback would re-arm ResultScreen's celebration
  // timeout (and replay its sound) on every unrelated re-render.
  const onProceed = useCallback(() => engine.proceedFromResult(performance.now()), [engine]);

  // Never block rendering on the settings IPC: a screen that never renders is a
  // frozen kiosk. Defaults stand in until the real settings arrive.
  const active = settings ?? DEFAULT_SETTINGS;
  const backupTrigger = active.allowManualTrigger ? manualTrigger : undefined;

  const renderScreen = () => {
    if (!snapshot) return null;

    switch (snapshot.state) {
      case GameState.IDLE:
        return <IdleScreen rotationEnabled={active.winnerRotationEnabled} targetSeconds={active.target} onTrigger={backupTrigger} />;
      case GameState.RUNNING:
        return <RunningScreen displaySeconds={snapshot.displaySeconds} targetSeconds={active.target} onTrigger={backupTrigger} />;
      case GameState.RESULT_WIN:
      case GameState.RESULT_NEAR:
      case GameState.RESULT_OTHER:
        return snapshot.result ? (
          <ResultScreen
            result={snapshot.result}
            onProceed={onProceed}
            soundEnabled={active.soundEnabled}
            soundVolume={active.soundVolume}
            targetSeconds={active.target}
            winSubtitle={active.winSubtitleText}
          />
        ) : null;
      case GameState.WINNER_ENTRY:
        return snapshot.result ? (
          <WinnerForm
            result={snapshot.result}
            onSaved={() => engine.skipWinnerEntry()}
            onSkip={() => engine.skipWinnerEntry()}
            onActivity={() => engine.notifyActivity(performance.now())}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      {renderScreen()}
      {isAdminOpen && (
        <AdminPanel
          settings={active}
          logger={logger}
          onClose={() => setAdminOpen(false)}
          onSettingsChange={setSettings}
        />
      )}
    </>
  );
}
