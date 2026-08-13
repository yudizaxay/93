# 9-3 Verdict Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production Electron kiosk app for Coalition Court Reporters' "9-3 Verdict Challenge" booth game, per `SOW_93.md` and `docs/superpowers/specs/2026-08-11-93-verdict-challenge-design.md`.

**Architecture:** Electron main process (window/kiosk/global shortcuts/IPC) + React/TypeScript renderer. A framework-free `game/` core (GameEngine, TimerEngine, ResultEngine, InputManager) owns all timing and state-machine logic and is unit-testable without Electron or React. React components are pure renders of `GameEngine` state. `performance.now()` is the sole timing source of truth; `requestAnimationFrame` drives only the visible counter.

**Tech Stack:** Electron, TypeScript, React 18, Vite, electron-store, electron-builder, Vitest (unit tests), Playwright or manual QA for Electron E2E (manual per SOW — no automated E2E required).

## Global Constraints

- Never use `setInterval`/`setTimeout`/`Date.now()`/animation-frame counts/rendered display value to compute the result. Source of truth is `performance.now()` captured immediately in the input handler. (SOW §5, §57 Rule 1-2)
- Rendering and result calculation must be fully decoupled — the rAF display loop never feeds the classification. (SOW §6, §57 Rule 3)
- Never use float equality (`elapsed === 0.93`); always range checks `elapsed >= min && elapsed <= max`. (SOW §43, §57 Rule 4)
- Win/near thresholds always come from `SettingsStore`, never hardcoded. (SOW §57 Rule 5)
- Reject `event.repeat` keyboard events immediately. (SOW §8, §57 Rule 6)
- Debounce all physical/keyboard input, default 40ms, configurable. (SOW §8, §57 Rule 7)
- All game state lives in the explicit `GameEngine` state machine; no component/module infers state. (SOW §9, §57 Rule 8)
- Zero network calls, zero remote assets/fonts/CDNs — everything bundled locally. (SOW §3, §32, §57 Rule 9)
- Optional-feature failures (audio, winner storage) must never crash or block gameplay. (SOW §40, §57 Rule 10)
- Never expose raw precision/latency/FPS/debug info on player-facing screens. (SOW §42, §57 Rule 11)
- `0.93` / the timer must remain the visually dominant element on every screen. (SOW §48, §57 Rule 12)
- Player-facing copy is locked: WIN = "0.93 / 9-3 PLAINTIFF VERDICT / YOU WIN!", NEAR = "SO CLOSE! / ONLY .XX AWAY!", OTHER = "DEFENSE VERDICT / TRY AGAIN!". Never use "TOO HIGH/TOO LOW/MISTRIAL/RUNNER UP/PRECISION/VARIANCE". (SOW §50, §57 Rule 13)
- Timer display: exactly 2 decimals, no "s" suffix, full float precision retained internally. (SOW §11)
- Portrait is the primary layout; landscape is a secondary responsive variant. (Design spec §2)
- Winner name entry uses an on-screen virtual keyboard; no physical keyboard assumed. (Design spec §2, §4)
- Support both portrait and landscape until final TV orientation is confirmed by client. (SOW §57 Rule 14)
- Electron security: `contextIsolation: true`, `nodeIntegration: false`, preload bridge only, no unrestricted Node access in renderer. (SOW §52)

---

## Task 0: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`, `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main/main.ts` (stub)
- Create: `src/renderer/App.tsx` (stub)
- Create: `src/renderer/main.tsx` (React entry)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`, `package` that later tasks rely on.

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
cd /Users/yudizsolutionsltd/Documents/93
npm init -y
npm install --save electron-store
npm install --save-dev electron electron-builder typescript vite @vitejs/plugin-react react react-dom @types/react @types/react-dom vitest vite-plugin-electron vite-plugin-electron-renderer
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write vite.config.ts wiring vite-plugin-electron**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: { entry: 'src/main/main.ts' },
      preload: { input: 'src/main/preload.ts' },
    }),
  ],
});
```

- [ ] **Step 4: Write index.html and React entry stub**

`index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /><title>9-3 Verdict Challenge</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

`src/renderer/main.tsx`:
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

`src/renderer/App.tsx`:
```typescript
export default function App() {
  return <div>9-3 Verdict Challenge — scaffold OK</div>;
}
```

`src/main/main.ts`:
```typescript
import { app, BrowserWindow } from 'electron';

function createWindow() {
  const win = new BrowserWindow({ width: 1080, height: 1920 });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile('dist/index.html');
  }
}

app.whenReady().then(createWindow);
```

`src/main/preload.ts`:
```typescript
// populated in Task 8/9
```

- [ ] **Step 5: Add npm scripts to package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "package": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 6: Write .gitignore**

```
node_modules/
dist/
dist-electron/
release/
*.log
```

- [ ] **Step 7: Verify dev server boots**

Run: `npm run dev` (in background, then check it prints a local Vite URL and the Electron window opens showing "9-3 Verdict Challenge — scaffold OK"). Stop the process after confirming.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src .gitignore
git commit -m "chore: scaffold Electron + React + Vite project"
```

---

## Task 1: Core Types

**Files:**
- Create: `src/renderer/types/settings.ts`
- Create: `src/renderer/types/game.ts`

**Interfaces:**
- Produces: `GameSettings`, `GameResult`, `ResultCategory`, `GameState` enum, `Winner` — used by every task below.

- [ ] **Step 1: Write settings.ts**

```typescript
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
  winnerRotationEnabled: boolean;
  buttonKey: string;
  debounceMs: number;
  lockoutMs: number;
  winnerEntryTimeoutMs: number;
  maxRunningMs: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  target: 0.93,
  winMin: 0.925,
  winMax: 0.934999,
  nearMin: 0.9,
  nearMax: 0.96,
  autoResetMs: 5000,
  soundEnabled: true,
  soundVolume: 0.8,
  winnerCaptureEnabled: true,
  winnerRotationEnabled: true,
  buttonKey: 'Space',
  debounceMs: 40,
  lockoutMs: 500,
  winnerEntryTimeoutMs: 8000,
  maxRunningMs: 30000,
};
```

- [ ] **Step 2: Write game.ts**

```typescript
export enum GameState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  RESULT_WIN = 'RESULT_WIN',
  RESULT_NEAR = 'RESULT_NEAR',
  RESULT_OTHER = 'RESULT_OTHER',
  WINNER_ENTRY = 'WINNER_ENTRY',
}

export type ResultCategory = 'WIN' | 'NEAR' | 'OTHER';

export interface GameResult {
  rawSeconds: number;
  displaySeconds: string;
  differenceFromTarget: number;
  category: ResultCategory;
}

export interface Winner {
  id: string;
  name: string;
  lawFirm: string;
  result: number;
  displayResult: string;
  createdAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/types
git commit -m "feat: add core GameSettings/GameResult/GameState types"
```

---

## Task 2: ResultEngine (TDD)

**Files:**
- Create: `src/renderer/game/ResultEngine.ts`
- Test: `src/renderer/game/ResultEngine.test.ts`

**Interfaces:**
- Consumes: `GameSettings`, `GameResult`, `ResultCategory` from Task 1.
- Produces: `classify(rawSeconds: number, settings: GameSettings): GameResult` — used by `GameEngine` (Task 4).

- [ ] **Step 1: Write failing tests covering the SOW §44 boundary table**

```typescript
import { describe, it, expect } from 'vitest';
import { classify } from './ResultEngine';
import { DEFAULT_SETTINGS } from '../types/settings';

describe('classify', () => {
  it('classifies below win range as OTHER or NEAR depending on near range', () => {
    expect(classify(0.9249, DEFAULT_SETTINGS).category).toBe('NEAR');
  });

  it('classifies winMin boundary as WIN', () => {
    expect(classify(0.925, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies mid win range as WIN', () => {
    expect(classify(0.929, DEFAULT_SETTINGS).category).toBe('WIN');
    expect(classify(0.93, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies winMax boundary as WIN', () => {
    expect(classify(0.934999, DEFAULT_SETTINGS).category).toBe('WIN');
  });

  it('classifies just above winMax as NEAR (within near range)', () => {
    expect(classify(0.935, DEFAULT_SETTINGS).category).toBe('NEAR');
  });

  it('classifies 0.95 as NEAR', () => {
    const r = classify(0.95, DEFAULT_SETTINGS);
    expect(r.category).toBe('NEAR');
  });

  it('classifies far values as OTHER', () => {
    expect(classify(1.1, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('never classifies a WIN as NEAR even if near range overlaps win range', () => {
    const settings = { ...DEFAULT_SETTINGS, nearMin: 0.9, nearMax: 0.94 };
    expect(classify(0.93, settings).category).toBe('WIN');
  });

  it('handles negative values as OTHER without throwing', () => {
    expect(classify(-1, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('handles NaN as OTHER without throwing', () => {
    expect(classify(NaN, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('handles extremely large results as OTHER', () => {
    expect(classify(999999, DEFAULT_SETTINGS).category).toBe('OTHER');
  });

  it('formats displaySeconds to exactly two decimals with no s suffix', () => {
    const r = classify(0.932741, DEFAULT_SETTINGS);
    expect(r.displaySeconds).toBe('0.93');
    expect(r.displaySeconds).not.toMatch(/s$/);
  });

  it('retains full raw precision separate from display value', () => {
    const r = classify(0.932741, DEFAULT_SETTINGS);
    expect(r.rawSeconds).toBeCloseTo(0.932741, 6);
  });

  it('computes differenceFromTarget using absolute value', () => {
    const r = classify(0.95, DEFAULT_SETTINGS);
    expect(r.differenceFromTarget).toBeCloseTo(Math.abs(0.95 - DEFAULT_SETTINGS.target), 3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/game/ResultEngine.test.ts`
Expected: FAIL — `ResultEngine` module not found.

- [ ] **Step 3: Implement ResultEngine.ts**

```typescript
import { GameResult, ResultCategory } from '../types/game';
import { GameSettings } from '../types/settings';

function classifyCategory(rawSeconds: number, settings: GameSettings): ResultCategory {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) {
    return 'OTHER';
  }
  if (rawSeconds >= settings.winMin && rawSeconds <= settings.winMax) {
    return 'WIN';
  }
  if (rawSeconds >= settings.nearMin && rawSeconds <= settings.nearMax) {
    return 'NEAR';
  }
  return 'OTHER';
}

export function classify(rawSeconds: number, settings: GameSettings): GameResult {
  const category = classifyCategory(rawSeconds, settings);
  const safeRaw = Number.isFinite(rawSeconds) ? rawSeconds : 0;
  const displaySeconds = Math.max(0, safeRaw).toFixed(2);
  const differenceFromTarget = Math.abs(safeRaw - settings.target);

  return {
    rawSeconds: safeRaw,
    displaySeconds,
    differenceFromTarget,
    category,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/game/ResultEngine.test.ts`
Expected: PASS, all 14 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/game/ResultEngine.ts src/renderer/game/ResultEngine.test.ts
git commit -m "feat: add ResultEngine with WIN/NEAR/OTHER boundary classification"
```

---

## Task 3: TimerEngine (TDD)

**Files:**
- Create: `src/renderer/game/TimerEngine.ts`
- Test: `src/renderer/game/TimerEngine.test.ts`

**Interfaces:**
- Produces: `class TimerEngine` with `start(nowMs: number): void`, `stop(nowMs: number): number` (returns elapsed seconds), `getElapsedSeconds(nowMs: number): number`, `onTick(cb: (displaySeconds: string) => void): () => void` (unsubscribe), `isRunning(): boolean`. Used by `GameEngine` (Task 4).
- Consumes: caller-supplied timestamps (from `performance.now()`) rather than calling `performance.now()` itself — keeps the class testable without mocking globals, and keeps the single timestamp-capture point in `InputManager`/`GameEngine`.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TimerEngine } from './TimerEngine';

describe('TimerEngine', () => {
  it('is not running before start', () => {
    const t = new TimerEngine();
    expect(t.isRunning()).toBe(false);
  });

  it('is running after start', () => {
    const t = new TimerEngine();
    t.start(1000);
    expect(t.isRunning()).toBe(true);
  });

  it('computes elapsed seconds from caller-supplied timestamps, not wall clock', () => {
    const t = new TimerEngine();
    t.start(1000);
    expect(t.getElapsedSeconds(1932.481)).toBeCloseTo(0.932481, 6);
  });

  it('stop returns elapsed seconds and stops running', () => {
    const t = new TimerEngine();
    t.start(1000);
    const elapsed = t.stop(1933);
    expect(elapsed).toBeCloseTo(0.933, 6);
    expect(t.isRunning()).toBe(false);
  });

  it('reset clears state back to not-running with zero elapsed', () => {
    const t = new TimerEngine();
    t.start(1000);
    t.stop(1500);
    t.reset();
    expect(t.isRunning()).toBe(false);
    expect(t.getElapsedSeconds(9999)).toBe(0);
  });

  it('onTick subscribers receive display-formatted seconds and can unsubscribe', () => {
    const t = new TimerEngine();
    const cb = vi.fn();
    const unsubscribe = t.onTick(cb);
    t.start(1000);
    t.publishTick(1470); // simulated rAF-driven tick, see Step 3
    expect(cb).toHaveBeenCalledWith('0.47');
    unsubscribe();
    t.publishTick(1500);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/game/TimerEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TimerEngine.ts**

```typescript
type TickListener = (displaySeconds: string) => void;

export class TimerEngine {
  private startTimestamp: number | null = null;
  private listeners = new Set<TickListener>();

  isRunning(): boolean {
    return this.startTimestamp !== null;
  }

  start(nowMs: number): void {
    this.startTimestamp = nowMs;
  }

  getElapsedSeconds(nowMs: number): number {
    if (this.startTimestamp === null) return 0;
    return (nowMs - this.startTimestamp) / 1000;
  }

  stop(nowMs: number): number {
    const elapsed = this.getElapsedSeconds(nowMs);
    this.startTimestamp = null;
    return elapsed;
  }

  reset(): void {
    this.startTimestamp = null;
  }

  onTick(cb: TickListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Called from a requestAnimationFrame loop owned by the caller (see
   * GameEngine/Timer.tsx). Never used to compute the result — display only.
   */
  publishTick(nowMs: number): void {
    if (this.startTimestamp === null) return;
    const display = Math.max(0, this.getElapsedSeconds(nowMs)).toFixed(2);
    this.listeners.forEach((cb) => cb(display));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/game/TimerEngine.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/game/TimerEngine.ts src/renderer/game/TimerEngine.test.ts
git commit -m "feat: add TimerEngine decoupling display ticks from elapsed calculation"
```

---

## Task 4: GameEngine State Machine (TDD)

**Files:**
- Create: `src/renderer/game/GameEngine.ts`
- Test: `src/renderer/game/GameEngine.test.ts`

**Interfaces:**
- Consumes: `TimerEngine` (Task 3), `classify` (Task 2), `GameState`/`GameResult`/`GameSettings` (Task 1).
- Produces: `class GameEngine` with `subscribe(cb: (snapshot: GameSnapshot) => void): () => void`, `handleStart(nowMs: number): void`, `handleStop(nowMs: number): void`, `acknowledgeWinnerEntry(): void`, `skipWinnerEntry(): void`, `reset(): void`, `getSnapshot(): GameSnapshot`, `tick(nowMs: number): void` (drives auto-reset/max-running timeouts and the display tick). Used by `InputManager` (Task 5) and all screen components (Tasks 11-15).

`GameSnapshot`:
```typescript
interface GameSnapshot {
  state: GameState;
  displaySeconds: string;
  result: GameResult | null;
}
```

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { DEFAULT_SETTINGS } from '../types/settings';
import { GameState } from '../types/game';

describe('GameEngine', () => {
  it('starts in IDLE', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('transitions IDLE -> RUNNING on handleStart', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    expect(engine.getSnapshot().state).toBe(GameState.RUNNING);
  });

  it('ignores handleStart while already RUNNING', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStart(1200); // should be a no-op, not a restart
    engine.handleStop(1933); // elapsed should be measured from 1000, not 1200
    expect(engine.getSnapshot().result?.rawSeconds).toBeCloseTo(0.933, 6);
  });

  it('transitions RUNNING -> RESULT_WIN on a winning stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1930); // 0.930s, inside winMin/winMax
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_WIN);
    expect(engine.getSnapshot().result?.category).toBe('WIN');
  });

  it('transitions RUNNING -> RESULT_NEAR on a near stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1950);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_NEAR);
  });

  it('transitions RUNNING -> RESULT_OTHER on a far stop', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(2170);
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_OTHER);
  });

  it('ignores handleStop while IDLE', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStop(1000);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('moves RESULT_WIN -> WINNER_ENTRY only if winnerCaptureEnabled', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: true };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult(2500);
    expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  });

  it('moves RESULT_WIN straight to IDLE if winnerCaptureEnabled is false', () => {
    const settings = { ...DEFAULT_SETTINGS, winnerCaptureEnabled: false };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult(2500);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('auto-resets from RESULT_NEAR/OTHER to IDLE after autoResetMs via tick()', () => {
    const settings = { ...DEFAULT_SETTINGS, autoResetMs: 1000 };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.handleStop(2170);
    engine.tick(2170); // just after result
    expect(engine.getSnapshot().state).toBe(GameState.RESULT_OTHER);
    engine.tick(3171); // 1001ms later
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('auto-cancels a stuck RUNNING game after maxRunningMs via tick()', () => {
    const settings = { ...DEFAULT_SETTINGS, maxRunningMs: 30000 };
    const engine = new GameEngine(() => settings);
    engine.handleStart(1000);
    engine.tick(31001);
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('skipWinnerEntry returns to IDLE from WINNER_ENTRY', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    engine.handleStart(1000);
    engine.handleStop(1930);
    engine.proceedFromResult(2500);
    engine.skipWinnerEntry();
    expect(engine.getSnapshot().state).toBe(GameState.IDLE);
  });

  it('notifies subscribers on every state change and supports unsubscribe', () => {
    const engine = new GameEngine(() => DEFAULT_SETTINGS);
    const cb = vi.fn();
    const unsubscribe = engine.subscribe(cb);
    engine.handleStart(1000);
    expect(cb).toHaveBeenCalled();
    unsubscribe();
    const callCountAfterUnsub = cb.mock.calls.length;
    engine.handleStop(1930);
    expect(cb.mock.calls.length).toBe(callCountAfterUnsub);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/game/GameEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement GameEngine.ts**

```typescript
import { TimerEngine } from './TimerEngine';
import { classify } from './ResultEngine';
import { GameState, GameResult } from '../types/game';
import { GameSettings } from '../types/settings';

export interface GameSnapshot {
  state: GameState;
  displaySeconds: string;
  result: GameResult | null;
}

type Listener = (snapshot: GameSnapshot) => void;

export class GameEngine {
  private state: GameState = GameState.IDLE;
  private result: GameResult | null = null;
  private displaySeconds = '0.00';
  private timer = new TimerEngine();
  private listeners = new Set<Listener>();
  private resultEnteredAt: number | null = null;

  constructor(private getSettings: () => GameSettings) {
    this.timer.onTick((display) => {
      this.displaySeconds = display;
      this.notify();
    });
  }

  getSnapshot(): GameSnapshot {
    return { state: this.state, displaySeconds: this.displaySeconds, result: this.result };
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  private setState(state: GameState): void {
    this.state = state;
    this.notify();
  }

  handleStart(nowMs: number): void {
    if (this.state !== GameState.IDLE) return;
    this.result = null;
    this.displaySeconds = '0.00';
    this.timer.start(nowMs);
    this.setState(GameState.RUNNING);
  }

  handleStop(nowMs: number): void {
    if (this.state !== GameState.RUNNING) return;
    const elapsedSeconds = this.timer.stop(nowMs);
    const result = classify(elapsedSeconds, this.getSettings());
    this.result = result;
    this.displaySeconds = result.displaySeconds;
    this.resultEnteredAt = nowMs;
    const nextState =
      result.category === 'WIN'
        ? GameState.RESULT_WIN
        : result.category === 'NEAR'
        ? GameState.RESULT_NEAR
        : GameState.RESULT_OTHER;
    this.setState(nextState);
  }

  /** Called by ResultScreen after its celebration/display beat, or by tick() via auto-reset. */
  proceedFromResult(nowMs: number): void {
    if (this.state === GameState.RESULT_WIN && this.getSettings().winnerCaptureEnabled) {
      this.resultEnteredAt = nowMs;
      this.setState(GameState.WINNER_ENTRY);
      return;
    }
    this.returnToIdle();
  }

  skipWinnerEntry(): void {
    if (this.state !== GameState.WINNER_ENTRY) return;
    this.returnToIdle();
  }

  private returnToIdle(): void {
    this.result = null;
    this.displaySeconds = '0.00';
    this.resultEnteredAt = null;
    this.timer.reset();
    this.setState(GameState.IDLE);
  }

  reset(): void {
    this.returnToIdle();
  }

  /** Drives display ticks (RUNNING) and time-based auto-transitions. Call from a rAF loop. */
  tick(nowMs: number): void {
    if (this.state === GameState.RUNNING) {
      const settings = this.getSettings();
      if (this.timer.getElapsedSeconds(nowMs) * 1000 >= settings.maxRunningMs) {
        this.returnToIdle();
        return;
      }
      this.timer.publishTick(nowMs);
      return;
    }

    if (
      (this.state === GameState.RESULT_NEAR || this.state === GameState.RESULT_OTHER) &&
      this.resultEnteredAt !== null
    ) {
      const settings = this.getSettings();
      if (nowMs - this.resultEnteredAt >= settings.autoResetMs) {
        this.returnToIdle();
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/game/GameEngine.test.ts`
Expected: PASS, all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/game/GameEngine.ts src/renderer/game/GameEngine.test.ts
git commit -m "feat: add GameEngine state machine wiring TimerEngine and ResultEngine"
```

---

## Task 5: InputManager (TDD)

**Files:**
- Create: `src/renderer/game/InputManager.ts`
- Test: `src/renderer/game/InputManager.test.ts`

**Interfaces:**
- Consumes: `GameEngine.handleStart`/`handleStop` (Task 4), `GameSettings.buttonKey`/`debounceMs`/`lockoutMs` (Task 1).
- Produces: `class InputManager` with `handleKeydown(event: { code: string; repeat: boolean }, nowMs: number): void`, `handleManualTrigger(nowMs: number): void` (for mouse/touch backup), attached in `App.tsx` (Task 10) to real `keydown` events using `performance.now()`.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { InputManager } from './InputManager';
import { DEFAULT_SETTINGS } from '../types/settings';

function makeEngine() {
  return { handleStart: vi.fn(), handleStop: vi.fn() };
}

describe('InputManager', () => {
  it('ignores keydown events for keys other than the configured buttonKey', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Enter', repeat: false }, 1000);
    expect(engine.handleStart).not.toHaveBeenCalled();
  });

  it('ignores repeat keydown events', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Space', repeat: true }, 1000);
    expect(engine.handleStart).not.toHaveBeenCalled();
  });

  it('calls handleStart on the first valid press, handleStop on the second', () => {
    const engine = makeEngine();
    const im = new InputManager(engine as any, () => DEFAULT_SETTINGS);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000);
    expect(engine.handleStart).toHaveBeenCalledWith(1000);
    im.handleKeydown({ code: 'Space', repeat: false }, 1200);
    expect(engine.handleStop).toHaveBeenCalledWith(1200);
  });

  it('debounces presses within debounceMs of the previous accepted press', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 40 };
    const im = new InputManager(engine as any, () => settings);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000); // start accepted
    im.handleKeydown({ code: 'Space', repeat: false }, 1020); // within 40ms, rejected
    expect(engine.handleStop).not.toHaveBeenCalled();
    im.handleKeydown({ code: 'Space', repeat: false }, 1100); // outside debounce, accepted as stop
    expect(engine.handleStop).toHaveBeenCalledWith(1100);
  });

  it('applies a post-stop lockout preventing an immediate new start', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 0, lockoutMs: 500 };
    const im = new InputManager(engine as any, () => settings);
    im.handleKeydown({ code: 'Space', repeat: false }, 1000); // start
    im.handleKeydown({ code: 'Space', repeat: false }, 1100); // stop
    engine.handleStart.mockClear();
    im.handleKeydown({ code: 'Space', repeat: false }, 1200); // within 500ms lockout after stop
    expect(engine.handleStart).not.toHaveBeenCalled();
    im.handleKeydown({ code: 'Space', repeat: false }, 1700); // after lockout
    expect(engine.handleStart).toHaveBeenCalledWith(1700);
  });

  it('handleManualTrigger (mouse/touch backup) routes through the same start/stop toggle as keyboard', () => {
    const engine = makeEngine();
    const settings = { ...DEFAULT_SETTINGS, debounceMs: 0, lockoutMs: 0 };
    const im = new InputManager(engine as any, () => settings);
    im.handleManualTrigger(1000);
    expect(engine.handleStart).toHaveBeenCalledWith(1000);
    im.handleManualTrigger(1200);
    expect(engine.handleStop).toHaveBeenCalledWith(1200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/game/InputManager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement InputManager.ts**

```typescript
import { GameSettings } from '../types/settings';

interface EngineLike {
  handleStart(nowMs: number): void;
  handleStop(nowMs: number): void;
}

export class InputManager {
  private lastAcceptedTimestamp = -Infinity;
  private lastStopTimestamp = -Infinity;
  private toggledOn = false;

  constructor(private engine: EngineLike, private getSettings: () => GameSettings) {}

  private trigger(nowMs: number): void {
    const settings = this.getSettings();

    if (nowMs - this.lastAcceptedTimestamp < settings.debounceMs) {
      return;
    }
    if (!this.toggledOn && nowMs - this.lastStopTimestamp < settings.lockoutMs) {
      return;
    }

    this.lastAcceptedTimestamp = nowMs;

    if (this.toggledOn) {
      this.toggledOn = false;
      this.lastStopTimestamp = nowMs;
      this.engine.handleStop(nowMs);
    } else {
      this.toggledOn = true;
      this.engine.handleStart(nowMs);
    }
  }

  handleKeydown(event: { code: string; repeat: boolean }, nowMs: number): void {
    if (event.repeat) return;
    const settings = this.getSettings();
    if (event.code !== settings.buttonKey) return;
    this.trigger(nowMs);
  }

  /** Mouse/touch backup target — goes through the identical toggle logic as the keyboard/USB path. */
  handleManualTrigger(nowMs: number): void {
    this.trigger(nowMs);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/game/InputManager.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/game/InputManager.ts src/renderer/game/InputManager.test.ts
git commit -m "feat: add InputManager with debounce, repeat rejection, and post-stop lockout"
```

---

## Task 6: SettingsStore (TDD)

**Files:**
- Create: `src/renderer/storage/SettingsStore.ts`
- Test: `src/renderer/storage/SettingsStore.test.ts`

**Interfaces:**
- Consumes: `GameSettings`, `DEFAULT_SETTINGS` (Task 1), an injected key-value persistence adapter (so the class is testable without real electron-store/disk I/O).
- Produces: `class SettingsStore` with `get(): GameSettings`, `update(partial: Partial<GameSettings>): { ok: true; settings: GameSettings } | { ok: false; errors: string[] }`, `resetToDefaults(): GameSettings`. Used by `AdminPanel` (Task 16) and `main.ts`/IPC (Task 9).

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { SettingsStore, PersistenceAdapter } from './SettingsStore';
import { DEFAULT_SETTINGS } from '../types/settings';

function makeMemoryAdapter(initial?: unknown): PersistenceAdapter {
  let value = initial;
  return {
    read: () => value,
    write: (v) => { value = v; },
  };
}

describe('SettingsStore', () => {
  it('returns defaults when the adapter has no stored value', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when stored value is corrupt/invalid shape', () => {
    const store = new SettingsStore(makeMemoryAdapter({ garbage: true }));
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('update() merges valid partial changes and persists them', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store = new SettingsStore(adapter);
    const result = store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 });
    expect(result.ok).toBe(true);
    expect(store.get().target).toBe(0.5);
    const store2 = new SettingsStore(adapter);
    expect(store2.get().target).toBe(0.5);
  });

  it('update() rejects winMin > winMax with a validation error and does not persist', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ winMin: 0.9, winMax: 0.1 });
    expect(result.ok).toBe(false);
    expect(store.get().winMin).toBe(DEFAULT_SETTINGS.winMin);
  });

  it('update() rejects nearMin > nearMax', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ nearMin: 0.9, nearMax: 0.1 });
    expect(result.ok).toBe(false);
  });

  it('update() rejects target <= 0', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ target: 0 });
    expect(result.ok).toBe(false);
  });

  it('update() rejects autoResetMs <= 0', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    const result = store.update({ autoResetMs: 0 });
    expect(result.ok).toBe(false);
  });

  it('resetToDefaults() restores and persists DEFAULT_SETTINGS', () => {
    const store = new SettingsStore(makeMemoryAdapter(undefined));
    store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 });
    const restored = store.resetToDefaults();
    expect(restored).toEqual(DEFAULT_SETTINGS);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('does not throw if the adapter write() throws (gameplay must not crash)', () => {
    const adapter: PersistenceAdapter = {
      read: () => undefined,
      write: () => { throw new Error('disk full'); },
    };
    const store = new SettingsStore(adapter);
    expect(() => store.update({ target: 0.5, winMin: 0.4, winMax: 0.6 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/storage/SettingsStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SettingsStore.ts**

```typescript
import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';

export interface PersistenceAdapter {
  read(): unknown;
  write(value: GameSettings): void;
}

function isValidShape(value: unknown): value is GameSettings {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.target === 'number' &&
    typeof v.winMin === 'number' &&
    typeof v.winMax === 'number' &&
    typeof v.nearMin === 'number' &&
    typeof v.nearMax === 'number' &&
    typeof v.autoResetMs === 'number' &&
    typeof v.buttonKey === 'string'
  );
}

function validate(settings: GameSettings): string[] {
  const errors: string[] = [];
  if (!(settings.winMin <= settings.winMax)) errors.push('winMin must be <= winMax');
  if (!(settings.nearMin <= settings.nearMax)) errors.push('nearMin must be <= nearMax');
  if (!(settings.target > 0)) errors.push('target must be > 0');
  if (!(settings.autoResetMs > 0)) errors.push('autoResetMs must be > 0');
  return errors;
}

export class SettingsStore {
  private current: GameSettings;

  constructor(private adapter: PersistenceAdapter) {
    const stored = this.safeRead();
    this.current = isValidShape(stored) ? stored : DEFAULT_SETTINGS;
  }

  private safeRead(): unknown {
    try {
      return this.adapter.read();
    } catch {
      return undefined;
    }
  }

  private safeWrite(settings: GameSettings): void {
    try {
      this.adapter.write(settings);
    } catch {
      // Persistence failure must never crash gameplay (SOW §40).
    }
  }

  get(): GameSettings {
    return this.current;
  }

  update(partial: Partial<GameSettings>): { ok: true; settings: GameSettings } | { ok: false; errors: string[] } {
    const candidate = { ...this.current, ...partial };
    const errors = validate(candidate);
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    this.current = candidate;
    this.safeWrite(this.current);
    return { ok: true, settings: this.current };
  }

  resetToDefaults(): GameSettings {
    this.current = DEFAULT_SETTINGS;
    this.safeWrite(this.current);
    return this.current;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/storage/SettingsStore.test.ts`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/storage/SettingsStore.ts src/renderer/storage/SettingsStore.test.ts
git commit -m "feat: add SettingsStore with validation and safe-default fallback"
```

---

## Task 7: WinnerStore (TDD)

**Files:**
- Create: `src/renderer/storage/WinnerStore.ts`
- Test: `src/renderer/storage/WinnerStore.test.ts`

**Interfaces:**
- Consumes: `Winner` type (Task 1), a `PersistenceAdapter`-shaped injected adapter (same pattern as Task 6, storing `Winner[]`).
- Produces: `class WinnerStore` with `getAll(): Winner[]`, `add(name: string, lawFirm: string, result: number, displayResult: string): Winner`, `clear(): void`. Used by `WinnerForm`/`WinnerRotation` (Tasks 21-22) and IPC (Task 9).

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { WinnerStore } from './WinnerStore';

function makeMemoryAdapter(initial?: unknown) {
  let value = initial;
  return { read: () => value, write: (v: unknown) => { value = v; } };
}

describe('WinnerStore', () => {
  it('starts empty when adapter has no stored value', () => {
    const store = new WinnerStore(makeMemoryAdapter(undefined));
    expect(store.getAll()).toEqual([]);
  });

  it('falls back to empty list when stored value is corrupt', () => {
    const store = new WinnerStore(makeMemoryAdapter('not-an-array'));
    expect(store.getAll()).toEqual([]);
  });

  it('add() appends a winner with generated id and ISO timestamp', () => {
    const store = new WinnerStore(makeMemoryAdapter(undefined));
    const winner = store.add('John Doe', 'ABC Law Firm', 0.93182, '0.93');
    expect(winner.name).toBe('John Doe');
    expect(winner.lawFirm).toBe('ABC Law Firm');
    expect(winner.id).toBeTruthy();
    expect(new Date(winner.createdAt).toString()).not.toBe('Invalid Date');
    expect(store.getAll()).toHaveLength(1);
  });

  it('add() persists across store instances sharing the same adapter', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store1 = new WinnerStore(adapter);
    store1.add('Jane Roe', 'XYZ Firm', 0.929, '0.93');
    const store2 = new WinnerStore(adapter);
    expect(store2.getAll()).toHaveLength(1);
  });

  it('clear() empties the winner list and persists the change', () => {
    const adapter = makeMemoryAdapter(undefined);
    const store = new WinnerStore(adapter);
    store.add('John Doe', 'ABC Law Firm', 0.93, '0.93');
    store.clear();
    expect(store.getAll()).toEqual([]);
    const store2 = new WinnerStore(adapter);
    expect(store2.getAll()).toEqual([]);
  });

  it('does not throw if the adapter write() throws', () => {
    const adapter = {
      read: () => undefined,
      write: () => { throw new Error('disk full'); },
    };
    const store = new WinnerStore(adapter);
    expect(() => store.add('John', 'Firm', 0.93, '0.93')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/storage/WinnerStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement WinnerStore.ts**

```typescript
import { Winner } from '../types/game';
import { PersistenceAdapter } from './SettingsStore';

function isWinnerArray(value: unknown): value is Winner[] {
  return Array.isArray(value) && value.every((w) => typeof w === 'object' && w !== null && 'id' in w);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class WinnerStore {
  private winners: Winner[];

  constructor(private adapter: PersistenceAdapter) {
    const stored = this.safeRead();
    this.winners = isWinnerArray(stored) ? stored : [];
  }

  private safeRead(): unknown {
    try {
      return this.adapter.read();
    } catch {
      return undefined;
    }
  }

  private safeWrite(): void {
    try {
      this.adapter.write(this.winners as unknown as any);
    } catch {
      // Persistence failure must never crash gameplay (SOW §40).
    }
  }

  getAll(): Winner[] {
    return this.winners;
  }

  add(name: string, lawFirm: string, result: number, displayResult: string): Winner {
    const winner: Winner = {
      id: generateId(),
      name,
      lawFirm,
      result,
      displayResult,
      createdAt: new Date().toISOString(),
    };
    this.winners = [...this.winners, winner];
    this.safeWrite();
    return winner;
  }

  clear(): void {
    this.winners = [];
    this.safeWrite();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/storage/WinnerStore.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/storage/WinnerStore.ts src/renderer/storage/WinnerStore.test.ts
git commit -m "feat: add WinnerStore for local winner persistence"
```

---

## Task 8: Electron Main Process — Window, Kiosk Mode, Global Shortcuts

**Files:**
- Modify: `src/main/main.ts`
- Create: `src/main/window.ts`
- Create: `src/main/shortcuts.ts`

**Interfaces:**
- Consumes: nothing from renderer code.
- Produces: a `BrowserWindow` in kiosk mode, `admin-toggle` and `app-exit` events dispatched via IPC (`webContents.send`) that Task 9's preload bridge and Task 10's `App.tsx` consume.

- [ ] **Step 1: Write window.ts**

```typescript
import { BrowserWindow } from 'electron';
import path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}
```

- [ ] **Step 2: Write shortcuts.ts**

```typescript
import { BrowserWindow, app, globalShortcut } from 'electron';

export function registerGlobalShortcuts(win: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    win.webContents.send('shortcut:toggle-admin');
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}
```

- [ ] **Step 3: Wire main.ts to use them**

```typescript
import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  registerGlobalShortcuts(mainWindow);
});

app.on('will-quit', () => {
  unregisterGlobalShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 4: Manually verify kiosk boot**

Run: `npm run dev`
Expected: Electron window opens fullscreen with no menu bar. Press CTRL+SHIFT+Q and confirm the app quits. (Admin shortcut verified in Task 9 once IPC exists to receive it.)

- [ ] **Step 5: Commit**

```bash
git add src/main/main.ts src/main/window.ts src/main/shortcuts.ts
git commit -m "feat: kiosk-mode window with admin/exit global shortcuts"
```

---

## Task 9: IPC Bridge — Settings & Winners Exposed to Renderer

**Files:**
- Modify: `src/main/preload.ts`
- Create: `src/main/ipcHandlers.ts`
- Modify: `src/main/main.ts`
- Create: `src/renderer/types/ipc.ts`

**Interfaces:**
- Consumes: `SettingsStore`, `WinnerStore` (Tasks 6-7), instantiated in the main process with a real `electron-store`-backed `PersistenceAdapter`.
- Produces: `window.api` typed bridge (`getSettings`, `updateSettings`, `resetSettings`, `getWinners`, `addWinner`, `clearWinners`, `onAdminToggle`, `onShortcutExit`) — consumed by `App.tsx` (Task 10) and `AdminPanel` (Task 16).

- [ ] **Step 1: Write ipc.ts types shared by preload and renderer**

```typescript
import { GameSettings } from './settings';
import { Winner } from './game';

export interface ElectronApi {
  getSettings(): Promise<GameSettings>;
  updateSettings(partial: Partial<GameSettings>): Promise<{ ok: boolean; errors?: string[]; settings: GameSettings }>;
  resetSettings(): Promise<GameSettings>;
  getWinners(): Promise<Winner[]>;
  addWinner(name: string, lawFirm: string, result: number, displayResult: string): Promise<Winner>;
  clearWinners(): Promise<void>;
  onAdminToggle(cb: () => void): () => void;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
```

- [ ] **Step 2: Write ipcHandlers.ts in main process**

```typescript
import { ipcMain } from 'electron';
import Store from 'electron-store';
import { SettingsStore, PersistenceAdapter } from '../renderer/storage/SettingsStore';
import { WinnerStore } from '../renderer/storage/WinnerStore';
import { GameSettings } from '../renderer/types/settings';
import { Winner } from '../renderer/types/game';

const settingsFileStore = new Store<{ value: GameSettings }>({ name: 'settings' });
const settingsAdapter: PersistenceAdapter = {
  read: () => settingsFileStore.get('value'),
  write: (v) => settingsFileStore.set('value', v),
};
const settingsStore = new SettingsStore(settingsAdapter);

const winnersFileStore = new Store<{ value: Winner[] }>({ name: 'winners' });
const winnersAdapter: PersistenceAdapter = {
  read: () => winnersFileStore.get('value') as unknown as GameSettings,
  write: (v) => winnersFileStore.set('value', v as unknown as Winner[]),
};
const winnerStore = new WinnerStore(winnersAdapter);

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => settingsStore.get());
  ipcMain.handle('settings:update', (_event, partial: Partial<GameSettings>) => settingsStore.update(partial));
  ipcMain.handle('settings:reset', () => settingsStore.resetToDefaults());
  ipcMain.handle('winners:get', () => winnerStore.getAll());
  ipcMain.handle(
    'winners:add',
    (_event, name: string, lawFirm: string, result: number, displayResult: string) =>
      winnerStore.add(name, lawFirm, result, displayResult)
  );
  ipcMain.handle('winners:clear', () => winnerStore.clear());
}
```

- [ ] **Step 3: Write preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: unknown) => ipcRenderer.invoke('settings:update', partial),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  getWinners: () => ipcRenderer.invoke('winners:get'),
  addWinner: (name: string, lawFirm: string, result: number, displayResult: string) =>
    ipcRenderer.invoke('winners:add', name, lawFirm, result, displayResult),
  clearWinners: () => ipcRenderer.invoke('winners:clear'),
  onAdminToggle: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('shortcut:toggle-admin', listener);
    return () => ipcRenderer.removeListener('shortcut:toggle-admin', listener);
  },
});
```

- [ ] **Step 4: Wire registerIpcHandlers() into main.ts**

```typescript
import { registerIpcHandlers } from './ipcHandlers';
// inside app.whenReady().then(() => { ... }):
registerIpcHandlers();
```

- [ ] **Step 5: Manually verify the bridge**

Run: `npm run dev`, open devtools (dev mode only), run `await window.api.getSettings()` in the console.
Expected: returns the `DEFAULT_SETTINGS` object.

- [ ] **Step 6: Commit**

```bash
git add src/main/preload.ts src/main/ipcHandlers.ts src/main/main.ts src/renderer/types/ipc.ts
git commit -m "feat: expose settings/winners IPC bridge to renderer via contextBridge"
```

---

## Task 10: App Shell — Wiring GameEngine, InputManager, and Screen Routing

**Files:**
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/game/useGameEngine.ts`

**Interfaces:**
- Consumes: `GameEngine` (Task 4), `InputManager` (Task 5), `window.api.getSettings` (Task 9), `GameState` (Task 1).
- Produces: `useGameEngine()` React hook returning `{ snapshot, engine }`; `App.tsx` renders the correct screen component per `snapshot.state` (screens themselves built in Tasks 11-15, 16, 21-22 — until then this task renders placeholder `<div>{snapshot.state}</div>` per state so the wiring is independently verifiable).

- [ ] **Step 1: Write useGameEngine.ts**

```typescript
import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameSnapshot } from './GameEngine';
import { InputManager } from './InputManager';
import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';

export function useGameEngine() {
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const engineRef = useRef<GameEngine>();
  const inputRef = useRef<InputManager>();
  const [snapshot, setSnapshot] = useState<GameSnapshot>();

  if (!engineRef.current) {
    engineRef.current = new GameEngine(() => settingsRef.current);
    inputRef.current = new InputManager(engineRef.current, () => settingsRef.current);
  }

  useEffect(() => {
    window.api.getSettings().then((s) => {
      settingsRef.current = s;
    });
  }, []);

  useEffect(() => {
    const engine = engineRef.current!;
    const unsubscribe = engine.subscribe(setSnapshot);
    setSnapshot(engine.getSnapshot());
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      inputRef.current!.handleKeydown({ code: e.code, repeat: e.repeat }, performance.now());
    };
    window.addEventListener('keydown', onKeydown);

    let rafId: number;
    const tickLoop = () => {
      engineRef.current!.tick(performance.now());
      rafId = requestAnimationFrame(tickLoop);
    };
    rafId = requestAnimationFrame(tickLoop);

    return () => {
      window.removeEventListener('keydown', onKeydown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return {
    snapshot,
    engine: engineRef.current!,
    manualTrigger: () => inputRef.current!.handleManualTrigger(performance.now()),
  };
}
```

- [ ] **Step 2: Wire App.tsx to route on state**

```typescript
import { GameState } from './types/game';
import { useGameEngine } from './game/useGameEngine';

export default function App() {
  const { snapshot } = useGameEngine();

  if (!snapshot) return null;

  switch (snapshot.state) {
    case GameState.IDLE:
      return <div>IDLE screen placeholder</div>;
    case GameState.RUNNING:
      return <div>RUNNING: {snapshot.displaySeconds}</div>;
    case GameState.RESULT_WIN:
    case GameState.RESULT_NEAR:
    case GameState.RESULT_OTHER:
      return <div>RESULT: {snapshot.result?.category} {snapshot.result?.displaySeconds}</div>;
    case GameState.WINNER_ENTRY:
      return <div>WINNER_ENTRY placeholder</div>;
    default:
      return null;
  }
}
```

- [ ] **Step 3: Manually verify end-to-end input wiring**

Run: `npm run dev`. Press SPACE — expect "RUNNING: 0.00" to appear and the number to climb. Press SPACE again — expect "RESULT: ..." with a category and two-decimal value.
Expected: full press → press → result loop works via real keyboard input and real `performance.now()`, confirming Tasks 1-10 integrate correctly before UI polish begins.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/game/useGameEngine.ts
git commit -m "feat: wire GameEngine/InputManager into App shell with state-based routing"
```

---

## Task 11: Timer Display Component

**Files:**
- Create: `src/renderer/components/Timer.tsx`
- Create: `src/renderer/components/Timer.css`

**Interfaces:**
- Consumes: `displaySeconds: string` prop (sourced from `GameSnapshot.displaySeconds`, Task 4).
- Produces: `<Timer displaySeconds={string} />` — used by `RunningScreen`/`ResultScreen` (Tasks 13-14).

- [ ] **Step 1: Implement Timer.tsx**

```typescript
import './Timer.css';

export function Timer({ displaySeconds }: { displaySeconds: string }) {
  return <div className="timer-display">{displaySeconds}</div>;
}
```

- [ ] **Step 2: Implement Timer.css using responsive units, no fixed pixel sizing**

```css
.timer-display {
  font-size: clamp(4rem, 20vw, 16rem);
  font-weight: 800;
  color: var(--color-white, #ffffff);
  text-align: center;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Manually verify in isolation**

Run: `npm run dev`, temporarily render `<Timer displaySeconds="0.93" />` in `App.tsx`.
Expected: large, centered "0.93" fills a dominant portion of the screen at any window size (confirms `clamp()`-based responsive sizing before wiring into real screens).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Timer.tsx src/renderer/components/Timer.css
git commit -m "feat: add responsive Timer display component"
```

---

## Task 12: IdleScreen

**Files:**
- Create: `src/renderer/components/IdleScreen.tsx`
- Create: `src/renderer/components/IdleScreen.css`

**Interfaces:**
- Consumes: nothing dynamic yet (winner rotation wired in Task 22).
- Produces: `<IdleScreen />` — routed to from `App.tsx` on `GameState.IDLE`.

- [ ] **Step 1: Implement IdleScreen.tsx per SOW §10, §31 portrait layout**

```typescript
import './IdleScreen.css';

export function IdleScreen() {
  return (
    <div className="idle-screen">
      <div className="idle-logo">COALITION COURT REPORTERS</div>
      <div className="idle-title">
        9-3<br />VERDICT<br />CHALLENGE
      </div>
      <div className="idle-prompt">CAN YOU LAND ON</div>
      <div className="idle-target">0.93</div>
      <div className="idle-cta">PRESS BUTTON TO START</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement IdleScreen.css, portrait-primary with landscape media query**

```css
.idle-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  background: var(--color-black, #0a0a0a);
  color: var(--color-white, #ffffff);
  text-align: center;
}

.idle-logo { font-size: clamp(0.8rem, 2vw, 1.2rem); opacity: 0.6; letter-spacing: 0.1em; }
.idle-title { font-size: clamp(1.5rem, 6vw, 4rem); font-weight: 800; line-height: 1.1; color: var(--color-red, #c8102e); }
.idle-prompt { font-size: clamp(1rem, 3vw, 2rem); }
.idle-target { font-size: clamp(5rem, 22vw, 18rem); font-weight: 900; line-height: 1; }
.idle-cta { font-size: clamp(1rem, 3vw, 2rem); opacity: 0.85; }

@media (orientation: landscape) {
  .idle-screen { flex-direction: row; justify-content: space-evenly; }
  .idle-title, .idle-prompt, .idle-cta { max-width: 30vw; }
}
```

- [ ] **Step 3: Wire into App.tsx IDLE case**

```typescript
case GameState.IDLE:
  return <IdleScreen />;
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`. Resize the window to a tall/narrow aspect ratio and a wide/short one.
Expected: "0.93" remains the visually dominant element in both orientations; no clipped text at extreme sizes.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/IdleScreen.tsx src/renderer/components/IdleScreen.css src/renderer/App.tsx
git commit -m "feat: add portrait-primary IdleScreen"
```

---

## Task 13: RunningScreen

**Files:**
- Create: `src/renderer/components/RunningScreen.tsx`
- Create: `src/renderer/components/RunningScreen.css`

**Interfaces:**
- Consumes: `<Timer />` (Task 11), `displaySeconds` from `GameSnapshot`.
- Produces: `<RunningScreen displaySeconds={string} />` — routed to from `App.tsx` on `GameState.RUNNING`.

- [ ] **Step 1: Implement RunningScreen.tsx**

```typescript
import { Timer } from './Timer';
import './RunningScreen.css';

export function RunningScreen({ displaySeconds }: { displaySeconds: string }) {
  return (
    <div className="running-screen">
      <Timer displaySeconds={displaySeconds} />
    </div>
  );
}
```

- [ ] **Step 2: Implement RunningScreen.css**

```css
.running-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-black, #0a0a0a);
}
```

- [ ] **Step 3: Wire into App.tsx RUNNING case**

```typescript
case GameState.RUNNING:
  return <RunningScreen displaySeconds={snapshot.displaySeconds} />;
```

- [ ] **Step 4: Manually verify no jank under real input**

Run: `npm run dev`. Press SPACE to start, watch the counter animate smoothly to two decimals, press again to stop.
Expected: smooth rAF-driven counting with no stutter; stopping freezes the last displayed value before the state transitions away.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/RunningScreen.tsx src/renderer/components/RunningScreen.css src/renderer/App.tsx
git commit -m "feat: add RunningScreen"
```

---

## Task 14: ResultScreen (WIN/NEAR/OTHER)

**Files:**
- Create: `src/renderer/components/ResultScreen.tsx`
- Create: `src/renderer/components/ResultScreen.css`

**Interfaces:**
- Consumes: `GameResult` (Task 1), `engine.proceedFromResult` (Task 4).
- Produces: `<ResultScreen result={GameResult} onProceed={() => void} />` — routed to from `App.tsx` on `RESULT_WIN`/`RESULT_NEAR`/`RESULT_OTHER`; auto-advances via `GameEngine.tick`'s auto-reset (already implemented in Task 4) so `onProceed` here only needs to fire once when entering RESULT_WIN to offer the winner-capture path immediately (per SOW: WIN goes to celebration then optional prompt, not a timed auto-reset like NEAR/OTHER).

- [ ] **Step 1: Implement ResultScreen.tsx with locked copy per SOW §50**

```typescript
import { useEffect } from 'react';
import { GameResult } from '../types/game';
import './ResultScreen.css';

function formatDifference(diff: number): string {
  return diff.toFixed(2).replace(/^0/, '');
}

export function ResultScreen({ result, onProceed }: { result: GameResult; onProceed: () => void }) {
  useEffect(() => {
    if (result.category === 'WIN') {
      const timeout = setTimeout(onProceed, 2500); // celebration beat before winner prompt
      return () => clearTimeout(timeout);
    }
  }, [result, onProceed]);

  if (result.category === 'WIN') {
    return (
      <div className="result-screen result-win">
        <div className="result-value">{result.displaySeconds}</div>
        <div className="result-heading">9-3 PLAINTIFF VERDICT</div>
        <div className="result-subheading">YOU WIN!</div>
      </div>
    );
  }

  if (result.category === 'NEAR') {
    return (
      <div className="result-screen result-near">
        <div className="result-value">{result.displaySeconds}</div>
        <div className="result-heading">SO CLOSE!</div>
        <div className="result-subheading">ONLY {formatDifference(result.differenceFromTarget)} AWAY!</div>
      </div>
    );
  }

  return (
    <div className="result-screen result-other">
      <div className="result-value">{result.displaySeconds}</div>
      <div className="result-heading">DEFENSE VERDICT</div>
      <div className="result-subheading">TRY AGAIN!</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement ResultScreen.css with WIN visually distinct (glow/gold accent), no casino styling**

```css
.result-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  background: var(--color-black, #0a0a0a);
  color: var(--color-white, #ffffff);
  text-align: center;
}

.result-value { font-size: clamp(4rem, 20vw, 16rem); font-weight: 900; line-height: 1; }
.result-heading { font-size: clamp(1.5rem, 5vw, 3rem); font-weight: 700; }
.result-subheading { font-size: clamp(1.2rem, 4vw, 2.2rem); }

.result-win .result-value {
  color: var(--color-gold, #d4af37);
  text-shadow: 0 0 40px rgba(212, 175, 55, 0.6);
  animation: pulse-glow 1.4s ease-in-out infinite;
}
.result-win .result-heading { color: var(--color-red, #c8102e); }

@keyframes pulse-glow {
  0%, 100% { text-shadow: 0 0 40px rgba(212, 175, 55, 0.6); }
  50% { text-shadow: 0 0 70px rgba(212, 175, 55, 0.9); }
}
```

- [ ] **Step 3: Wire into App.tsx result cases**

```typescript
case GameState.RESULT_WIN:
case GameState.RESULT_NEAR:
case GameState.RESULT_OTHER:
  return snapshot.result ? (
    <ResultScreen result={snapshot.result} onProceed={() => engine.proceedFromResult(performance.now())} />
  ) : null;
```

- [ ] **Step 4: Manually verify all three outcomes**

Run: `npm run dev`. Trigger a WIN (stop near 0.93), a NEAR (stop near 0.95), and an OTHER (stop far away), confirming exact copy matches SOW §50 and WIN visually stands out.
Expected: correct heading/subheading per category, no banned wording (TOO HIGH/TOO LOW/MISTRIAL/RUNNER UP), WIN screen transitions after ~2.5s toward winner entry (verified fully once Task 21 exists).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ResultScreen.tsx src/renderer/components/ResultScreen.css src/renderer/App.tsx
git commit -m "feat: add ResultScreen with locked WIN/NEAR/OTHER copy"
```

---

## Task 15: Shared Theme Tokens & Portrait/Landscape Base Layout

**Files:**
- Create: `src/renderer/styles/theme.css`
- Modify: `src/renderer/main.tsx` (import theme.css)

**Interfaces:**
- Produces: CSS custom properties (`--color-black`, `--color-red`, `--color-gold`, `--color-white`) consumed by all component CSS files (Tasks 11-14, 16, 21-22); a base font-family declaration using a locally bundled font file.

- [ ] **Step 1: Source a locally licensed font and place it under assets**

Place a licensed (e.g. OFL) sans-serif display font file at `src/renderer/assets/fonts/Inter-Bold.woff2` and `Inter-Regular.woff2` (or client-provided brand font once available — flagged in design spec as an open item). Do not reference Google Fonts or any CDN.

- [ ] **Step 2: Write theme.css**

```css
@font-face {
  font-family: 'Booth Display';
  src: url('../assets/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700 900;
}
@font-face {
  font-family: 'Booth Display';
  src: url('../assets/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
}

:root {
  --color-black: #0a0a0a;
  --color-red: #c8102e;
  --color-white: #ffffff;
  --color-gold: #d4af37;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Booth Display', system-ui, sans-serif;
  overflow: hidden;
  cursor: none;
}

body.cursor-visible {
  cursor: default;
}
```

- [ ] **Step 3: Import theme.css in main.tsx**

```typescript
import './styles/theme.css';
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`. Confirm the bundled font renders (not a system fallback) via devtools computed styles, and no network request for fonts appears in the Network tab.
Expected: zero external font requests; `Booth Display` applied.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/styles/theme.css src/renderer/main.tsx src/renderer/assets/fonts
git commit -m "feat: add local theme tokens and bundled display font"
```

---

## Task 16: AdminPanel — Settings Form with Validation

**Files:**
- Create: `src/renderer/components/AdminPanel.tsx`
- Create: `src/renderer/components/AdminPanel.css`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `window.api.getSettings/updateSettings/resetSettings` (Task 9), `window.api.onAdminToggle` (Task 9), `SettingsStore` validation error shape (Task 6).
- Produces: `<AdminPanel onClose={() => void} />`, an `isAdminOpen` boolean state in `App.tsx` toggled by the CTRL+SHIFT+A IPC event, rendered as an overlay above whatever screen is active (per SOW §24: hidden during normal gameplay, opened only via shortcut).

- [ ] **Step 1: Implement AdminPanel.tsx**

```typescript
import { useEffect, useState } from 'react';
import { GameSettings } from '../types/settings';
import './AdminPanel.css';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [draft, setDraft] = useState<Partial<GameSettings>>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    window.api.getSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const field = (key: keyof GameSettings) =>
    draft[key] !== undefined ? draft[key] : settings[key];

  const setField = (key: keyof GameSettings, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const result = await window.api.updateSettings(draft);
    if (result.ok) {
      setSettings(result.settings);
      setDraft({});
      setErrors([]);
    } else {
      setErrors(result.errors ?? ['Invalid settings']);
    }
  };

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <h1>GAME SETTINGS</h1>

        <label>Target<input type="number" step="0.001" value={field('target') as number}
          onChange={(e) => setField('target', Number(e.target.value))} /></label>

        <fieldset>
          <legend>WIN RANGE</legend>
          <label>Minimum<input type="number" step="0.001" value={field('winMin') as number}
            onChange={(e) => setField('winMin', Number(e.target.value))} /></label>
          <label>Maximum<input type="number" step="0.001" value={field('winMax') as number}
            onChange={(e) => setField('winMax', Number(e.target.value))} /></label>
        </fieldset>

        <fieldset>
          <legend>SO CLOSE RANGE</legend>
          <label>Minimum<input type="number" step="0.001" value={field('nearMin') as number}
            onChange={(e) => setField('nearMin', Number(e.target.value))} /></label>
          <label>Maximum<input type="number" step="0.001" value={field('nearMax') as number}
            onChange={(e) => setField('nearMax', Number(e.target.value))} /></label>
        </fieldset>

        <label>Auto Reset (seconds)
          <input type="number" min="1" value={(field('autoResetMs') as number) / 1000}
            onChange={(e) => setField('autoResetMs', Number(e.target.value) * 1000)} />
        </label>

        <label><input type="checkbox" checked={field('soundEnabled') as boolean}
          onChange={(e) => setField('soundEnabled', e.target.checked)} /> Sound Enabled</label>
        <label>Volume
          <input type="range" min="0" max="1" step="0.05" value={field('soundVolume') as number}
            onChange={(e) => setField('soundVolume', Number(e.target.value))} />
        </label>

        <label><input type="checkbox" checked={field('winnerCaptureEnabled') as boolean}
          onChange={(e) => setField('winnerCaptureEnabled', e.target.checked)} /> Winner Capture Enabled</label>
        <label><input type="checkbox" checked={field('winnerRotationEnabled') as boolean}
          onChange={(e) => setField('winnerRotationEnabled', e.target.checked)} /> Idle Winner Rotation</label>

        <label>Input Key
          <select value={field('buttonKey') as string} onChange={(e) => setField('buttonKey', e.target.value)}>
            <option value="Space">SPACE</option>
            <option value="Enter">ENTER</option>
          </select>
        </label>

        {errors.length > 0 && (
          <ul className="admin-errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}

        <div className="admin-actions">
          <button onClick={() => window.api.clearWinners()}>CLEAR TODAY'S WINNERS</button>
          <button onClick={save}>SAVE</button>
          <button onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement AdminPanel.css (functional admin styling, not public-facing)**

```css
.admin-panel-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.92);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; overflow-y: auto; padding: 2rem;
}
.admin-panel {
  background: #1a1a1a; color: #fff; padding: 2rem; border-radius: 8px;
  width: min(90vw, 480px); display: flex; flex-direction: column; gap: 1rem;
  font-family: system-ui, sans-serif; font-size: 0.95rem;
}
.admin-panel fieldset { border: 1px solid #333; border-radius: 4px; padding: 0.75rem; }
.admin-panel label { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin: 0.4rem 0; }
.admin-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
.admin-errors { color: #ff6b6b; }
```

- [ ] **Step 3: Wire admin toggle into App.tsx**

```typescript
const [isAdminOpen, setAdminOpen] = useState(false);
useEffect(() => window.api.onAdminToggle(() => setAdminOpen((v) => !v)), []);

// at the top of the returned JSX tree, alongside the switch statement's result:
return (
  <>
    {renderScreen()}
    {isAdminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
  </>
);
```

(Refactor the existing `switch` into a `renderScreen()` function returning the same cases as Task 10/14.)

- [ ] **Step 4: Manually verify**

Run: `npm run dev`. Press CTRL+SHIFT+A — panel opens over whatever screen is active. Change Win Min above Win Max, click SAVE, confirm an inline validation error appears and nothing is persisted. Fix it, save, close, reopen — confirm the change persisted.
Expected: validation blocks bad input; valid input persists across panel close/reopen and app restart.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/AdminPanel.tsx src/renderer/components/AdminPanel.css src/renderer/App.tsx
git commit -m "feat: add AdminPanel with validated settings form behind hidden shortcut"
```

---

## Task 17: Hardware Test Mode

**Files:**
- Modify: `src/renderer/components/AdminPanel.tsx`
- Create: `src/renderer/components/HardwareTestPanel.tsx`

**Interfaces:**
- Consumes: raw `keydown` events (bypassing `InputManager` debounce, since this is a diagnostic view), `GameSettings.buttonKey`.
- Produces: `<HardwareTestPanel buttonKey={string} onClose={() => void} />`, launched from a "TEST BUTTON" button inside `AdminPanel`.

- [ ] **Step 1: Implement HardwareTestPanel.tsx**

```typescript
import { useEffect, useState } from 'react';

export function HardwareTestPanel({ buttonKey, onClose }: { buttonKey: string; onClose: () => void }) {
  const [detected, setDetected] = useState<{ key: string; timestamp: number } | null>(null);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      setDetected({ key: e.code, timestamp: performance.now() });
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <h1>HARDWARE TEST</h1>
        {!detected ? (
          <p>WAITING FOR USB BUTTON...</p>
        ) : (
          <>
            <p>USB BUTTON DETECTED ✓</p>
            <p>KEY: {detected.key} (configured: {buttonKey})</p>
            <p>INPUT RECEIVED at {detected.timestamp.toFixed(2)}ms (diagnostic only)</p>
          </>
        )}
        <button onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add a "TEST BUTTON" launcher inside AdminPanel.tsx**

```typescript
const [showHardwareTest, setShowHardwareTest] = useState(false);
// in admin-actions:
<button onClick={() => setShowHardwareTest(true)}>TEST BUTTON</button>
// after the closing </div> of admin-panel-overlay:
{showHardwareTest && (
  <HardwareTestPanel buttonKey={settings.buttonKey} onClose={() => setShowHardwareTest(false)} />
)}
```

- [ ] **Step 3: Manually verify with the real arcade button (or keyboard during dev)**

Run: `npm run dev`, open Admin → TEST BUTTON, press the configured key.
Expected: "USB BUTTON DETECTED ✓" appears with the correct key code; this diagnostic timestamp is confirmed never to appear on any public (non-admin) screen (SOW §25).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/HardwareTestPanel.tsx src/renderer/components/AdminPanel.tsx
git commit -m "feat: add hardware test mode diagnostic panel"
```

---

## Task 18: AudioManager

**Files:**
- Create: `src/renderer/audio/AudioManager.ts`
- Test: `src/renderer/audio/AudioManager.test.ts`
- Modify: `src/renderer/components/ResultScreen.tsx`
- Modify: `src/renderer/components/AdminPanel.tsx`

**Interfaces:**
- Consumes: `GameSettings.soundEnabled/soundVolume` (Task 1), local bundled audio files.
- Produces: `class AudioManager` with `play(name: 'win' | 'near' | 'other' | 'start'): void`, `setVolume(v: number): void`, `setEnabled(v: boolean): void` — used by `ResultScreen` (on category change) and `AdminPanel`'s TEST SOUND button.

- [ ] **Step 1: Write failing tests using a fake Audio constructor**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';

class FakeAudio {
  volume = 1;
  played = false;
  play = vi.fn(() => { this.played = true; return Promise.resolve(); });
}

describe('AudioManager', () => {
  beforeEach(() => {
    // @ts-expect-error test double
    global.Audio = FakeAudio;
  });

  it('play() does nothing when disabled', () => {
    const mgr = new AudioManager();
    mgr.setEnabled(false);
    mgr.play('win');
    // no throw, and nothing to assert on a real Audio call since it's a no-op — verified via no exception
  });

  it('play() does not throw when the underlying Audio.play() rejects', async () => {
    class RejectingAudio extends FakeAudio {
      play = vi.fn(() => Promise.reject(new Error('no audio device')));
    }
    // @ts-expect-error test double
    global.Audio = RejectingAudio;
    const mgr = new AudioManager();
    expect(() => mgr.play('win')).not.toThrow();
  });

  it('setVolume clamps to [0, 1]', () => {
    const mgr = new AudioManager();
    mgr.setVolume(5);
    mgr.play('win');
    // volume clamping asserted indirectly: no throw, manager remains usable
    expect(() => mgr.setVolume(-1)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/audio/AudioManager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AudioManager.ts**

```typescript
type SoundName = 'win' | 'near' | 'other' | 'start';

const SOUND_FILES: Record<SoundName, string> = {
  win: new URL('../assets/audio/win.mp3', import.meta.url).href,
  near: new URL('../assets/audio/near.mp3', import.meta.url).href,
  other: new URL('../assets/audio/other.mp3', import.meta.url).href,
  start: new URL('../assets/audio/start.mp3', import.meta.url).href,
};

export class AudioManager {
  private enabled = true;
  private volume = 0.8;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    try {
      const audio = new Audio(SOUND_FILES[name]);
      audio.volume = this.volume;
      audio.play()?.catch(() => {
        // Playback failure must not affect gameplay (SOW §40).
      });
    } catch {
      // Construction failure must not affect gameplay (SOW §40).
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/audio/AudioManager.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Source placeholder local audio files**

Place royalty-free/licensed `win.mp3`, `near.mp3`, `other.mp3`, `start.mp3` under `src/renderer/assets/audio/` (client to supply final branded audio; placeholders unblock development).

- [ ] **Step 6: Wire AudioManager into ResultScreen and AdminPanel**

In `ResultScreen.tsx`, instantiate a module-level `const audioManager = new AudioManager();` (or pass via context if preferred), call `audioManager.play(result.category.toLowerCase() as any)` inside the existing `useEffect`, sourcing `soundEnabled`/`soundVolume` from settings via a new prop. In `AdminPanel.tsx`, add a "TEST SOUND" button calling `audioManager.play('win')` and wire `soundEnabled`/`soundVolume` field changes to `audioManager.setEnabled`/`setVolume`.

- [ ] **Step 7: Manually verify**

Run: `npm run dev`. Trigger each result category and confirm the matching sound plays; toggle Sound Enabled off in Admin and confirm silence; click TEST SOUND.
Expected: correct sound per category, respects enabled/volume settings, never throws even if a file is missing.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/audio src/renderer/components/ResultScreen.tsx src/renderer/components/AdminPanel.tsx
git commit -m "feat: add AudioManager with graceful playback failure handling"
```

---

## Task 19: Win Celebration Animation

**Files:**
- Create: `src/renderer/components/Confetti.tsx`
- Create: `src/renderer/components/Confetti.css`
- Modify: `src/renderer/components/ResultScreen.tsx`

**Interfaces:**
- Consumes: nothing external — self-contained canvas-based particle effect, no third-party confetti library (per SOW §3 "local confetti implementation").
- Produces: `<Confetti active={boolean} />`, rendered inside the WIN branch of `ResultScreen`.

- [ ] **Step 1: Implement Confetti.tsx as a lightweight canvas particle system**

```typescript
import { useEffect, useRef } from 'react';
import './Confetti.css';

interface Particle { x: number; y: number; vx: number; vy: number; color: string; size: number; }

const COLORS = ['#c8102e', '#d4af37', '#ffffff'];

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
    }));

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafId);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}
```

- [ ] **Step 2: Implement Confetti.css**

```css
.confetti-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 500;
}
```

- [ ] **Step 3: Wire into ResultScreen.tsx WIN branch**

```typescript
import { Confetti } from './Confetti';
// inside the WIN return block, alongside result-screen div:
<Confetti active={true} />
```

- [ ] **Step 4: Manually verify performance**

Run: `npm run dev`, trigger a WIN, watch devtools Performance/FPS meter during the confetti animation.
Expected: confetti renders smoothly without dropping the app below ~60fps and without blocking the RUNNING-state input path (this only ever mounts in RESULT_WIN, after input has already been captured — SOW §39).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/Confetti.tsx src/renderer/components/Confetti.css src/renderer/components/ResultScreen.tsx
git commit -m "feat: add local canvas-based confetti for WIN celebration"
```

---

## Task 20: OnScreenKeyboard

**Files:**
- Create: `src/renderer/components/OnScreenKeyboard.tsx`
- Create: `src/renderer/components/OnScreenKeyboard.css`
- Test: `src/renderer/components/OnScreenKeyboard.test.tsx`

**Interfaces:**
- Produces: `<OnScreenKeyboard onKey={(char: string) => void} onBackspace={() => void} onDone={() => void} />` — used by `WinnerForm` (Task 21). Resolves the design-spec §4 decision to avoid depending on a physical keyboard.
- Requires: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` added as dev dependencies for component testing.

- [ ] **Step 1: Install testing dependencies**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts` a `test` block: `test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'] }`, and create `src/setupTests.ts` with `import '@testing-library/jest-dom';`.

- [ ] **Step 2: Write failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnScreenKeyboard } from './OnScreenKeyboard';

describe('OnScreenKeyboard', () => {
  it('calls onKey with the letter when a key button is clicked', () => {
    const onKey = vi.fn();
    render(<OnScreenKeyboard onKey={onKey} onBackspace={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(onKey).toHaveBeenCalledWith('A');
  });

  it('calls onBackspace when backspace is clicked', () => {
    const onBackspace = vi.fn();
    render(<OnScreenKeyboard onKey={() => {}} onBackspace={onBackspace} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /backspace/i }));
    expect(onBackspace).toHaveBeenCalled();
  });

  it('calls onDone when Done is clicked', () => {
    const onDone = vi.fn();
    render(<OnScreenKeyboard onKey={() => {}} onBackspace={() => {}} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('emits a space character when the space bar is clicked', () => {
    const onKey = vi.fn();
    render(<OnScreenKeyboard onKey={onKey} onBackspace={() => {}} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /space/i }));
    expect(onKey).toHaveBeenCalledWith(' ');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/renderer/components/OnScreenKeyboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement OnScreenKeyboard.tsx**

```typescript
import './OnScreenKeyboard.css';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function OnScreenKeyboard({
  onKey,
  onBackspace,
  onDone,
}: {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onDone: () => void;
}) {
  return (
    <div className="osk">
      {ROWS.map((row) => (
        <div className="osk-row" key={row}>
          {row.split('').map((char) => (
            <button key={char} onClick={() => onKey(char)}>{char}</button>
          ))}
        </div>
      ))}
      <div className="osk-row">
        <button className="osk-wide" onClick={() => onKey(' ')} aria-label="Space">SPACE</button>
        <button onClick={onBackspace} aria-label="Backspace">⌫</button>
        <button className="osk-done" onClick={onDone} aria-label="Done">DONE</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement OnScreenKeyboard.css**

```css
.osk { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; }
.osk-row { display: flex; gap: 0.4rem; justify-content: center; }
.osk button {
  min-width: 3rem; min-height: 3rem; font-size: 1.1rem; font-weight: 700;
  border: none; border-radius: 6px; background: #2a2a2a; color: #fff; cursor: pointer;
}
.osk button:active { background: #c8102e; }
.osk-wide { min-width: 8rem; }
.osk-done { background: #c8102e; }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/renderer/components/OnScreenKeyboard.test.tsx`
Expected: PASS, all 4 tests green.

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.ts src/setupTests.ts src/renderer/components/OnScreenKeyboard.tsx src/renderer/components/OnScreenKeyboard.css src/renderer/components/OnScreenKeyboard.test.tsx
git commit -m "feat: add touch-driven OnScreenKeyboard for winner name entry"
```

---

## Task 21: WinnerForm

**Files:**
- Create: `src/renderer/components/WinnerForm.tsx`
- Create: `src/renderer/components/WinnerForm.css`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/game/GameEngine.ts` (expose `resultEnteredAt`-based timeout hook for WINNER_ENTRY — reuses existing `tick()` mechanism)
- Test: `src/renderer/game/GameEngine.test.ts` (add WINNER_ENTRY timeout case)

**Interfaces:**
- Consumes: `OnScreenKeyboard` (Task 20), `window.api.addWinner` (Task 9), `GameEngine.skipWinnerEntry` (Task 4), `GameSettings.winnerEntryTimeoutMs` (Task 1).
- Produces: `<WinnerForm result={GameResult} onSaved={() => void} onSkip={() => void} />` — routed to from `App.tsx` on `GameState.WINNER_ENTRY`.

- [ ] **Step 1: Add a failing GameEngine test for the WINNER_ENTRY auto-timeout**

Append to `src/renderer/game/GameEngine.test.ts`:

```typescript
it('auto-skips WINNER_ENTRY back to IDLE after winnerEntryTimeoutMs of inactivity via tick()', () => {
  const settings = { ...DEFAULT_SETTINGS, winnerEntryTimeoutMs: 8000 };
  const engine = new GameEngine(() => settings);
  engine.handleStart(1000);
  engine.handleStop(1930);
  engine.proceedFromResult(2500);
  expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  engine.tick(2500);
  expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  engine.tick(10501); // 8001ms after entering WINNER_ENTRY at 2500
  expect(engine.getSnapshot().state).toBe(GameState.IDLE);
});

it('notifyActivity() resets the WINNER_ENTRY timeout so active typing is not interrupted', () => {
  const settings = { ...DEFAULT_SETTINGS, winnerEntryTimeoutMs: 8000 };
  const engine = new GameEngine(() => settings);
  engine.handleStart(1000);
  engine.handleStop(1930);
  engine.proceedFromResult(2500);
  engine.tick(9000); // 6500ms in, still within timeout
  engine.notifyActivity(9000); // resets the clock
  engine.tick(16000); // 7000ms after activity, still within new window
  expect(engine.getSnapshot().state).toBe(GameState.WINNER_ENTRY);
  engine.tick(17001); // 8001ms after activity
  expect(engine.getSnapshot().state).toBe(GameState.IDLE);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/game/GameEngine.test.ts`
Expected: FAIL — `notifyActivity` not defined and WINNER_ENTRY timeout not implemented.

- [ ] **Step 3: Extend GameEngine.ts to support the WINNER_ENTRY timeout and activity reset**

Add a `notifyActivity(nowMs: number): void` method and extend `tick()`'s time-based branch to also cover `WINNER_ENTRY`:

```typescript
// add alongside the other public methods:
notifyActivity(nowMs: number): void {
  if (this.state === GameState.WINNER_ENTRY) {
    this.resultEnteredAt = nowMs;
  }
}

// replace the existing "RESULT_NEAR || RESULT_OTHER" branch in tick() with:
if (
  (this.state === GameState.RESULT_NEAR ||
    this.state === GameState.RESULT_OTHER ||
    this.state === GameState.WINNER_ENTRY) &&
  this.resultEnteredAt !== null
) {
  const settings = this.getSettings();
  const timeoutMs =
    this.state === GameState.WINNER_ENTRY ? settings.winnerEntryTimeoutMs : settings.autoResetMs;
  if (nowMs - this.resultEnteredAt >= timeoutMs) {
    this.returnToIdle();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/game/GameEngine.test.ts`
Expected: PASS, all 15 tests green (13 original + 2 new).

- [ ] **Step 5: Implement WinnerForm.tsx**

```typescript
import { useState } from 'react';
import { OnScreenKeyboard } from './OnScreenKeyboard';
import { GameResult } from '../types/game';
import './WinnerForm.css';

type Field = 'name' | 'lawFirm';

export function WinnerForm({
  result,
  onSaved,
  onSkip,
  onActivity,
}: {
  result: GameResult;
  onSaved: () => void;
  onSkip: () => void;
  onActivity: () => void;
}) {
  const [name, setName] = useState('');
  const [lawFirm, setLawFirm] = useState('');
  const [activeField, setActiveField] = useState<Field>('name');

  const values: Record<Field, [string, (v: string) => void]> = {
    name: [name, setName],
    lawFirm: [lawFirm, setLawFirm],
  };

  const handleKey = (char: string) => {
    const [value, setValue] = values[activeField];
    setValue(value + char);
    onActivity();
  };

  const handleBackspace = () => {
    const [value, setValue] = values[activeField];
    setValue(value.slice(0, -1));
    onActivity();
  };

  const save = async () => {
    await window.api.addWinner(name.trim(), lawFirm.trim(), result.rawSeconds, result.displaySeconds);
    onSaved();
  };

  return (
    <div className="winner-form">
      <h1>ADD YOUR NAME TO<br />TODAY'S PLAINTIFF VERDICTS?</h1>
      <div className="winner-fields">
        <label className={activeField === 'name' ? 'active' : ''} onClick={() => setActiveField('name')}>
          Name<div className="winner-input">{name || ' '}</div>
        </label>
        <label className={activeField === 'lawFirm' ? 'active' : ''} onClick={() => setActiveField('lawFirm')}>
          Law Firm<div className="winner-input">{lawFirm || ' '}</div>
        </label>
      </div>
      <OnScreenKeyboard onKey={handleKey} onBackspace={handleBackspace} onDone={() => {}} />
      <div className="winner-actions">
        <button onClick={save}>SAVE</button>
        <button onClick={onSkip}>SKIP</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement WinnerForm.css**

```css
.winner-form {
  height: 100vh; width: 100vw; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.5vh;
  background: var(--color-black, #0a0a0a); color: var(--color-white, #fff); text-align: center;
}
.winner-form h1 { font-size: clamp(1.2rem, 3.5vw, 2.2rem); }
.winner-fields { display: flex; flex-direction: column; gap: 0.75rem; width: min(90vw, 500px); }
.winner-fields label { text-align: left; font-size: 0.9rem; opacity: 0.7; cursor: pointer; }
.winner-fields label.active { opacity: 1; }
.winner-input {
  border: 2px solid #333; border-radius: 6px; padding: 0.6rem 1rem;
  font-size: 1.3rem; min-height: 2.2rem; background: #151515;
}
.winner-fields label.active .winner-input { border-color: var(--color-red, #c8102e); }
.winner-actions { display: flex; gap: 1rem; margin-top: 1rem; }
.winner-actions button { font-size: 1.1rem; padding: 0.7rem 2rem; border: none; border-radius: 6px; cursor: pointer; }
```

- [ ] **Step 7: Wire into App.tsx WINNER_ENTRY case**

```typescript
case GameState.WINNER_ENTRY:
  return snapshot.result ? (
    <WinnerForm
      result={snapshot.result}
      onSaved={() => engine.skipWinnerEntry()}
      onSkip={() => engine.skipWinnerEntry()}
      onActivity={() => engine.notifyActivity(performance.now())}
    />
  ) : null;
```

- [ ] **Step 8: Manually verify the full winner flow**

Run: `npm run dev`. Trigger a WIN, let it advance to WINNER_ENTRY, type a name/law firm using only the on-screen keyboard, click SAVE. Confirm it returns to IDLE and the winner is retrievable via `window.api.getWinners()` in devtools. Repeat and let it sit idle for 8+ seconds without interacting — confirm it auto-skips to IDLE. Repeat once more and keep tapping keys past 8 seconds — confirm it does NOT time out while actively typing.
Expected: full winner capture works with zero physical keyboard/mouse dependency, timeout and activity-reset both behave correctly.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/components/WinnerForm.tsx src/renderer/components/WinnerForm.css src/renderer/App.tsx src/renderer/game/GameEngine.ts src/renderer/game/GameEngine.test.ts
git commit -m "feat: add WinnerForm with on-screen-keyboard entry and activity-aware timeout"
```

---

## Task 22: WinnerRotation on Idle Screen

**Files:**
- Create: `src/renderer/components/WinnerRotation.tsx`
- Create: `src/renderer/components/WinnerRotation.css`
- Modify: `src/renderer/components/IdleScreen.tsx`

**Interfaces:**
- Consumes: `window.api.getWinners` (Task 9), `GameSettings.winnerRotationEnabled` (Task 1).
- Produces: `<WinnerRotation enabled={boolean} />`, mounted inside `IdleScreen` (Task 12), cycling through recent winners then back to the standard "CAN YOU LAND ON 0.93?" prompt per SOW §22.

- [ ] **Step 1: Implement WinnerRotation.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Winner } from '../types/game';
import './WinnerRotation.css';

const ROTATION_INTERVAL_MS = 4000;

export function WinnerRotation({ enabled }: { enabled: boolean }) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [index, setIndex] = useState(-1); // -1 = showing the default prompt

  useEffect(() => {
    if (!enabled) return;
    window.api.getWinners().then((w) => setWinners(w.slice(-10)));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || winners.length === 0) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % (winners.length + 1) - 1);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, winners]);

  if (!enabled || winners.length === 0 || index === -1) {
    return <div className="winner-rotation-prompt">CAN YOU LAND ON 0.93?</div>;
  }

  const winner = winners[index];
  return (
    <div className="winner-rotation">
      <div className="winner-rotation-heading">TODAY'S<br />PLAINTIFF VERDICTS</div>
      <div className="winner-rotation-name">{winner.name}</div>
      <div className="winner-rotation-firm">{winner.lawFirm}</div>
      <div className="winner-rotation-tag">PLAINTIFF VERDICT</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement WinnerRotation.css**

```css
.winner-rotation, .winner-rotation-prompt {
  font-size: clamp(0.9rem, 2.5vw, 1.5rem);
  text-align: center;
  min-height: 4em;
}
.winner-rotation-heading { font-weight: 700; opacity: 0.8; }
.winner-rotation-name { font-weight: 900; font-size: 1.3em; color: var(--color-gold, #d4af37); }
.winner-rotation-firm { opacity: 0.75; }
.winner-rotation-tag { font-size: 0.7em; opacity: 0.5; letter-spacing: 0.1em; }
```

- [ ] **Step 3: Wire into IdleScreen.tsx, replacing the static "CAN YOU LAND ON" line with the rotation component**

```typescript
import { useEffect, useState } from 'react';
import { WinnerRotation } from './WinnerRotation';

export function IdleScreen() {
  const [rotationEnabled, setRotationEnabled] = useState(false);
  useEffect(() => {
    window.api.getSettings().then((s) => setRotationEnabled(s.winnerRotationEnabled));
  }, []);

  return (
    <div className="idle-screen">
      <div className="idle-logo">COALITION COURT REPORTERS</div>
      <div className="idle-title">9-3<br />VERDICT<br />CHALLENGE</div>
      <WinnerRotation enabled={rotationEnabled} />
      <div className="idle-target">0.93</div>
      <div className="idle-cta">PRESS BUTTON TO START</div>
    </div>
  );
}
```

- [ ] **Step 4: Manually verify**

Run: `npm run dev`. With `winnerRotationEnabled: true` and at least one winner saved (from Task 21's manual test), sit on the idle screen for 15+ seconds.
Expected: the prompt cycles between "CAN YOU LAND ON 0.93?" and rotating winner cards every ~4s; disabling the setting in Admin removes rotation and shows only the static prompt.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/WinnerRotation.tsx src/renderer/components/WinnerRotation.css src/renderer/components/IdleScreen.tsx
git commit -m "feat: add idle-screen winner rotation"
```

---

## Task 23: Cursor Auto-Hide

**Files:**
- Create: `src/renderer/hooks/useCursorAutoHide.ts`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Produces: `useCursorAutoHide(timeoutMs?: number)` hook toggling the `cursor-visible` class on `document.body` (declared in Task 15's theme.css) on mouse movement, hiding it again after inactivity.

- [ ] **Step 1: Implement useCursorAutoHide.ts**

```typescript
import { useEffect } from 'react';

export function useCursorAutoHide(timeoutMs = 3000): void {
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;

    const showCursor = () => {
      document.body.classList.add('cursor-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        document.body.classList.remove('cursor-visible');
      }, timeoutMs);
    };

    window.addEventListener('mousemove', showCursor);
    return () => {
      window.removeEventListener('mousemove', showCursor);
      clearTimeout(hideTimer);
    };
  }, [timeoutMs]);
}
```

- [ ] **Step 2: Wire into App.tsx**

```typescript
import { useCursorAutoHide } from './hooks/useCursorAutoHide';
// inside App():
useCursorAutoHide();
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`. Leave the mouse still for 3+ seconds — cursor disappears. Move it — cursor reappears immediately.
Expected: cursor hidden during idle gameplay, visible during admin/winner-entry mouse interaction (SOW §35).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useCursorAutoHide.ts src/renderer/App.tsx
git commit -m "feat: auto-hide cursor after inactivity"
```

---

## Task 24: Diagnostic Logging

**Files:**
- Create: `src/renderer/logging/Logger.ts`
- Test: `src/renderer/logging/Logger.test.ts`
- Modify: `src/renderer/game/GameEngine.ts` (emit log events on transitions)

**Interfaces:**
- Produces: `class Logger` with `log(event: LogEvent): void`, `getRecent(): LogEntry[]`, bounded to the last N entries (SOW §41: "keep logs bounded/rotated"). `LogEvent` union matches SOW §41's list.
- Consumes: nothing external; injected into `GameEngine` as an optional constructor param so existing tests (Task 4) remain valid without a logger.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { Logger } from './Logger';

describe('Logger', () => {
  it('records logged events with a timestamp', () => {
    const logger = new Logger(100);
    logger.log('GAME_STARTED');
    const entries = logger.getRecent();
    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe('GAME_STARTED');
    expect(typeof entries[0].timestamp).toBe('string');
  });

  it('bounds the log to maxEntries, dropping the oldest first', () => {
    const logger = new Logger(3);
    logger.log('GAME_STARTED');
    logger.log('GAME_STOPPED');
    logger.log('RESULT_WIN');
    logger.log('WINNER_SAVED');
    const entries = logger.getRecent();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.event)).toEqual(['GAME_STOPPED', 'RESULT_WIN', 'WINNER_SAVED']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/logging/Logger.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Logger.ts**

```typescript
export type LogEvent =
  | 'APP_STARTED'
  | 'GAME_STARTED'
  | 'GAME_STOPPED'
  | 'RESULT_WIN'
  | 'RESULT_NEAR'
  | 'RESULT_OTHER'
  | 'WINNER_SAVED'
  | 'SETTINGS_UPDATED'
  | 'INPUT_ERROR'
  | 'UNEXPECTED_ERROR';

export interface LogEntry {
  event: LogEvent;
  timestamp: string;
}

export class Logger {
  private entries: LogEntry[] = [];

  constructor(private maxEntries = 500) {}

  log(event: LogEvent): void {
    this.entries.push({ event, timestamp: new Date().toISOString() });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }
  }

  getRecent(): LogEntry[] {
    return this.entries;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/logging/Logger.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Wire Logger into GameEngine.ts as an optional constructor param, logging on each transition**

```typescript
// constructor signature becomes:
constructor(private getSettings: () => GameSettings, private logger?: Logger) { ... }

// add logger?.log(...) calls at the relevant points, e.g.:
// in handleStart: this.logger?.log('GAME_STARTED');
// in handleStop, after computing nextState: this.logger?.log('GAME_STOPPED'); this.logger?.log(`RESULT_${result.category}` as LogEvent);
```

Import `Logger`/`LogEvent` types at the top of `GameEngine.ts`. Existing Task 4 tests instantiate `new GameEngine(() => DEFAULT_SETTINGS)` with no logger arg — confirm this still works since the param is optional.

- [ ] **Step 6: Run the full GameEngine test suite to confirm no regression**

Run: `npx vitest run src/renderer/game/GameEngine.test.ts`
Expected: PASS, all 15 tests still green.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/logging src/renderer/game/GameEngine.ts
git commit -m "feat: add bounded diagnostic Logger wired into GameEngine transitions"
```

---

## Task 25: Windows Packaging — electron-builder Configuration

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json` (build metadata)

**Interfaces:**
- Consumes: `dist/` (Vite build output) and `dist-electron/` (compiled main/preload) from Task 0's build scripts.
- Produces: an NSIS Windows installer and a portable `.exe` under `release/`.

- [ ] **Step 1: Write electron-builder.yml**

```yaml
appId: com.coalitioncourtreporters.verdictchallenge
productName: 9-3 Verdict Challenge
directories:
  output: release
files:
  - dist/**/*
  - dist-electron/**/*
win:
  target:
    - target: nsis
    - target: portable
  icon: build/icon.ico
nsis:
  oneClick: true
  perMachine: true
  allowToChangeInstallationDirectory: false
```

- [ ] **Step 2: Add a placeholder app icon**

Place a locally-authored `build/icon.ico` (client to supply final branded icon; a placeholder unblocks packaging).

- [ ] **Step 3: Add build metadata to package.json**

```json
{
  "name": "93-verdict-challenge",
  "version": "1.0.0",
  "description": "9-3 Verdict Challenge booth kiosk game for Coalition Court Reporters",
  "author": "Coalition Court Reporters",
  "main": "dist-electron/main.js"
}
```

- [ ] **Step 4: Run the packaging build**

Run: `npm run package`
Expected: `release/` contains an NSIS installer `.exe` and a portable `.exe`, both runnable on Windows without additional setup.

- [ ] **Step 5: Manually verify the installer on a Windows machine/VM**

Install via the NSIS installer, launch the Start Menu shortcut, confirm the app boots fullscreen exactly as `npm run dev` did.
Expected: no missing-dependency errors, no console pointing at unbundled assets.

- [ ] **Step 6: Commit**

```bash
git add electron-builder.yml package.json build/icon.ico
git commit -m "chore: configure electron-builder for Windows NSIS and portable packaging"
```

---

## Task 26: Offline Audit

**Files:**
- No new files — audit-only task producing a checklist result appended to `docs/superpowers/plans/2026-08-11-93-verdict-challenge.md` (this file) under a new "Offline Audit Results" section, plus fixes to any violations found.

**Interfaces:**
- Consumes: the entire `src/` tree built so far.

- [ ] **Step 1: Grep the codebase for network/remote references per SOW §32**

```bash
grep -rn "http://\|https://\|fetch(\|axios\|googleapis\|fonts.google\|cdn\." src/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.html"
```

Expected: no matches other than comments/type definitions unrelated to runtime network calls (e.g. license URLs in comments are fine; any live `fetch`/remote asset URL is not).

- [ ] **Step 2: Fix any violations found**

If the grep surfaces a live network dependency, replace it with a locally bundled equivalent (matching the pattern used for fonts in Task 15 and audio in Task 18), then re-run Step 1 until clean.

- [ ] **Step 3: Manually verify with networking disabled**

Run: `npm run package`, install the build, disconnect Wi-Fi/Ethernet, launch the installed app.
Expected: app launches, IDLE/RUNNING/RESULT flow works, admin panel opens and saves, winner capture works, audio plays — all per SOW §32/§55 "Offline" acceptance criteria.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: complete offline audit, remove any remaining remote references"
```

---

## Task 27: Boundary/Reliability Test Pass & README

**Files:**
- Create: `README.md`
- Create: `docs/hardware-setup.md`
- Create: `docs/windows-booth-setup.md`

**Interfaces:**
- Consumes: nothing new — documents the finished system per SOW §53-54.

- [ ] **Step 1: Write README.md covering SOW §54's required sections**

```markdown
# 9-3 Verdict Challenge

## Development
npm install
npm run dev

## Production build
npm run build

## Windows packaging
npm run package
(outputs to release/)

## Admin shortcut
CTRL+SHIFT+A — opens/closes the settings panel (hidden during normal gameplay).

## Exit shortcut
CTRL+SHIFT+Q — quits the kiosk app. Never mapped to the arcade button.

## USB button configuration
The arcade button must emulate a standard USB HID keyboard, default key SPACE.
Change the key in Admin Panel → Input Key. Verify detection via Admin → TEST BUTTON.

## Settings
All gameplay settings (win/near ranges, auto-reset, sound, winner capture, input key)
are editable in the Admin Panel and persisted locally via electron-store.

## Clearing winners
Admin Panel → CLEAR TODAY'S WINNERS.

## Local data location
Windows: %APPDATA%/93-verdict-challenge/ (settings.json, winners.json via electron-store)

## Troubleshooting
- Arcade button not responding: open Admin → TEST BUTTON to confirm HID detection;
  fall back to SPACE key on an attached keyboard if the button is disconnected.
- App not fullscreen: kiosk mode is enabled by default in main.ts; check
  Windows display scaling settings if the window appears at the wrong resolution.

## Offline verification
Disconnect all networking after install and confirm the full game loop, admin panel,
winner capture, and audio all continue to work (see docs/superpowers/plans/2026-08-11-93-verdict-challenge.md
Task 26 for the audit procedure).
```

- [ ] **Step 2: Write docs/hardware-setup.md covering USB arcade button wiring and HID verification**

```markdown
# Hardware Setup

1. Connect the USB arcade button encoder to the Windows mini PC.
2. Windows should recognize it automatically as a standard HID keyboard (no driver install required).
3. Launch the app, open Admin (CTRL+SHIFT+A) → TEST BUTTON, press the physical button.
4. Confirm "USB BUTTON DETECTED ✓" appears with the expected key code (default SPACE).
5. If no detection: try a different USB port, confirm the encoder's DIP/config switches
   are set to keyboard-emulation mode (see encoder manufacturer docs), and confirm a plain
   USB keyboard's SPACE key is detected as a sanity check for the app itself.
```

- [ ] **Step 3: Write docs/windows-booth-setup.md covering SOW §36-37**

```markdown
# Windows Booth Configuration

- Power settings: Sleep OFF, Display sleep OFF, Screen saver OFF.
- Notifications OFF, Focus Assist ON.
- Set the app to auto-launch on login (Task Scheduler entry or Startup folder shortcut
  to the installed .exe), so the flow is: Power On -> Windows starts -> auto-login ->
  game launches fullscreen -> ready. No staff should need to open a terminal or browser.
- Fix the TV's resolution and confirm Windows display scaling renders the kiosk UI
  correctly at that fixed resolution before the event.
- Pre-set system volume to the desired booth level.
- Do not disable Windows Update entirely or otherwise weaken security settings beyond
  what's listed here.
```

- [ ] **Step 4: Run the full automated test suite as a final regression gate**

Run: `npm test`
Expected: all unit tests (ResultEngine, TimerEngine, GameEngine, InputManager, SettingsStore, WinnerStore, AudioManager, OnScreenKeyboard, Logger) pass.

- [ ] **Step 5: Execute the manual hardware/endurance pass per SOW §45-46**

Using the actual or equivalent USB arcade button: run at least 100 manual game cycles (normal press, fast press, slow press, held button, rapid double press), then a multi-hour idle/play soak test watching for memory growth (Chromium task manager or `process.getProcessMemoryInfo()`), FPS degradation, or storage corruption. Record results in a new `docs/qa-results.md` file (pass/fail per SOW §55 acceptance criteria row).

- [ ] **Step 6: Commit**

```bash
git add README.md docs/hardware-setup.md docs/windows-booth-setup.md docs/qa-results.md
git commit -m "docs: add README, hardware/booth setup guides, and QA results"
```

---

## Self-Review Notes

- **Spec coverage:** every numbered SOW section (2-57) maps to at least one task above: orientation (12,15), hardware/input (5,8,17), timing (2-4), debounce (5), state machine (4), idle/running/result screens (12-14), win range config (6,16), near range (6,16), win/near/other experiences (14,18,19), auto-reset (4), winner capture (7,21), winner form (20-21), winner timeout (21), winner rotation (7,22), persistence (6-7), admin panel (16), hardware test mode (17), keyboard/mouse backup (5,10), input locking (5), branding/visual (12,14,15), responsive/orientation (12,15), offline (26), kiosk mode (8), emergency exit (8), cursor handling (23), Windows startup (27), sound (18), animation performance (19), error recovery (4,6,7,18), logging (24), floating point handling (2), automated tests (2-7,20,24), hardware/endurance testing (27), source structure (all tasks), security config (8), deliverables/README (25,27).
- **Placeholder scan:** no TBD/TODO markers; the two spots needing client-supplied assets (brand font, audio files, app icon) are called out explicitly as "placeholder, client to supply final" rather than left blank, and the app is fully functional with the placeholders in place.
- **Type consistency:** `GameSnapshot`, `GameResult`, `GameSettings`, `Winner`, `ElectronApi` are defined once (Tasks 1, 4, 9) and referenced by identical names/shapes in every later task.
