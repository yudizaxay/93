import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameSnapshot } from './GameEngine';
import { InputManager } from './InputManager';
import { Logger } from '../logging/Logger';
import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';
import { GameResult } from '../types/game';

/**
 * @param settings live settings owned by App — every change (including admin saves)
 *   is pushed straight into the ref the engine and input manager read from.
 * @param enabled when false the global keydown listener is ignored, so overlays
 *   (Admin Panel / Hardware Test) can't start a hidden game behind themselves.
 */
export function useGameEngine(settings: GameSettings | null, enabled = true) {
  const settingsRef = useRef<GameSettings>(settings ?? DEFAULT_SETTINGS);
  const loggerRef = useRef<Logger>(undefined);
  const engineRef = useRef<GameEngine>(undefined);
  const inputRef = useRef<InputManager>(undefined);
  const [snapshot, setSnapshot] = useState<GameSnapshot>();

  if (!engineRef.current) {
    loggerRef.current = new Logger();
    loggerRef.current.log('APP_STARTED');
    engineRef.current = new GameEngine(() => settingsRef.current, loggerRef.current);
    inputRef.current = new InputManager(engineRef.current, () => settingsRef.current);
  }

  // Single source of truth: settings live in App, the engine reads them through this ref.
  useEffect(() => {
    if (settings) settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const engine = engineRef.current!;
    // Booth Stats needs one persisted record per completed round regardless of
    // outcome. GameEngine stays framework-free (no IPC), so this is recorded
    // here instead — the last-recorded ref guards against re-subscribes or
    // re-renders replaying the same result object into a duplicate entry.
    let lastRecordedResult: GameResult | null = null;
    const recordPlay = (snap: GameSnapshot) => {
      if (snap.result && snap.result !== lastRecordedResult) {
        lastRecordedResult = snap.result;
        void window.api.addPlay(snap.result.category, snap.result.rawSeconds, snap.result.displaySeconds);
      }
    };
    const unsubscribe = engine.subscribe((snap) => {
      recordPlay(snap);
      setSnapshot(snap);
    });
    setSnapshot(engine.getSnapshot());
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!enabled) return;
      inputRef.current!.handleKeydown({ code: e.code, repeat: e.repeat }, performance.now());
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [enabled]);

  useEffect(() => {
    let rafId: number;
    const tickLoop = () => {
      engineRef.current!.tick(performance.now());
      rafId = requestAnimationFrame(tickLoop);
    };
    rafId = requestAnimationFrame(tickLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return {
    snapshot,
    engine: engineRef.current!,
    logger: loggerRef.current!,
    manualTrigger: () => inputRef.current!.handleManualTrigger(performance.now()),
  };
}
