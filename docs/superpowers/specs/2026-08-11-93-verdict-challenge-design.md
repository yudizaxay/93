# 9-3 Verdict Challenge — Design Spec

Date: 2026-08-11
Source of truth: `SOW_93.md` (58-section engineering SOW from client). This document resolves the open architectural decisions from that SOW and defines the concrete build design. Where this doc is silent on a detail, `SOW_93.md` governs.

## 1. Objective

Production Windows kiosk app for Acme Court Reporting's trade-show booth. Player presses one physical red USB arcade button to start a high-resolution timer, presses again to stop, tries to land on **0.93 seconds**. Runs 100% offline after installation. Reference prototype (design/UX only, not to be shipped): https://93secondtimergame.netlify.app/

## 2. Decisions Resolved This Session

| Decision | Resolution |
|---|---|
| TV orientation (SOW §2 conflict) | **Portrait primary.** Landscape supported as a secondary responsive layout via `@media (orientation: landscape)`, not equally weighted. |
| Winner name entry input device (SOW §20 gap) | **On-screen virtual keyboard**, mouse/touch driven. No physical keyboard assumed at the booth for the public-facing flow. |
| UI framework | **React + TypeScript + Vite**, per SOW's preferred stack. |
| Build scope | **One implementation plan**, following the SOW §58 build order exactly (state machine/timer → input → result engine → UI → admin → audio → winner capture → kiosk packaging → diagnostics → endurance testing). |

## 3. Architecture

```
Physical Arcade Button ──┐
Keyboard (SPACE) ────────┼──► InputManager.handleGameInput()
Mouse/Touch ──────────────┘         │
                              performance.now() captured immediately
                                     │
                                     ▼
                               GameEngine (state machine)
                            IDLE → RUNNING → RESULT_(WIN|NEAR|OTHER) → WINNER_ENTRY → IDLE
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼              ▼
                 TimerEngine   ResultEngine    SettingsStore
              (rAF display    (pure classify   (electron-store,
               loop only)      function)        atomic writes)
                                     │
                                     ▼
                              WinnerStore (electron-store)
```

- **`InputManager`**: single entry point for all input sources (USB-HID keyboard emulation, dev keyboard, mouse/touch). Applies `event.repeat` rejection, debounce (30–50ms configurable), and a 500ms post-stop lockout. Never contains game logic — only normalizes input and timestamps it.
- **`TimerEngine`**: captures `performance.now()` at START and STOP. Exposes a separate `requestAnimationFrame`-driven display value for the visible counter. The displayed value and the result-calculation value are computed independently; the display loop never feeds the result.
- **`GameEngine`**: owns the explicit state machine. All transitions happen here and only here — UI components read state, they never infer it.
- **`ResultEngine`**: pure function `classify(rawSeconds, settings) -> GameResult`. Priority WIN → NEAR → OTHER. No float equality; range checks only (`elapsed >= min && elapsed <= max`). Fully unit-testable in isolation from Electron.
- **`SettingsStore` / `WinnerStore`**: wrap `electron-store`. Atomic writes; on read/corruption failure, fall back to safe defaults without crashing.
- **Renderer (React)**: `IdleScreen`, `RunningScreen`, `ResultScreen` (WIN/NEAR/OTHER variants), `WinnerForm` (with on-screen keyboard subcomponent), `WinnerRotation`, `AdminPanel`, `Timer` (display-only component subscribed to `TimerEngine`'s rAF value). All components are pure renders of `GameEngine` state — no component owns its own copy of game state.
- **Electron main process**: window creation, kiosk/fullscreen config, global shortcuts (admin CTRL+SHIFT+A, exit CTRL+SHIFT+Q), IPC bridge via preload script. `contextIsolation: true`, `nodeIntegration: false`.

## 4. Winner Entry Flow (resolves SOW §20 gap)

On WIN, after celebration, optional prompt: "ADD YOUR NAME TO TODAY'S PLAINTIFF VERDICTS?" → `[ADD NAME] [SKIP]`. If ADD NAME is chosen, `WinnerForm` renders two text fields (Name, Law Firm) plus an on-screen QWERTY keyboard component driven entirely by mouse/touch clicks — no physical keyboard required. Save writes to `WinnerStore`; Skip or 8-second inactivity timeout returns to IDLE. If the user is actively interacting with the on-screen keyboard, the timeout resets on each keypress (per SOW §21: "If the user is actively typing, do not reset mid-entry").

## 5. Result Classification (SOW §13–14, 43)

```typescript
interface GameSettings {
  target: number;
  winMin: number; winMax: number;
  nearMin: number; nearMax: number;
  autoResetMs: number;
  soundEnabled: boolean; soundVolume: number;
  winnerCaptureEnabled: boolean;
  winnerRotationEnabled: boolean;
  buttonKey: string;
}

interface GameResult {
  rawSeconds: number;
  displaySeconds: string; // 2 decimals, no "s"
  differenceFromTarget: number;
  category: "WIN" | "NEAR" | "OTHER";
}

function classify(rawSeconds: number, settings: GameSettings): GameResult
```

Boundary test table from SOW §44 is the first unit test suite written (Vitest), before any UI work.

## 6. Source Layout

Per SOW §51, unchanged:
```
/src
  /main        main.ts, window.ts, ipc.ts, preload.ts
  /renderer
    App.tsx
    /components  Timer, IdleScreen, RunningScreen, ResultScreen,
                 WinnerForm, OnScreenKeyboard, WinnerRotation, AdminPanel
    /game        GameEngine.ts, TimerEngine.ts, ResultEngine.ts, InputManager.ts
    /storage     SettingsStore.ts, WinnerStore.ts
    /audio       AudioManager.ts
    /types       game.ts, settings.ts
    /assets      /logos /audio /fonts /images
/tests
/docs
```

## 7. Error Handling & Reliability (SOW §40, 47)

- RUNNING state auto-cancels after 30s (stuck-button protection).
- Invalid/corrupt settings fall back to safe defaults, never crash.
- Audio failure is silently ignored; gameplay continues.
- USB disconnect: app keeps running, keyboard backup remains active, no crash.
- Bounded/rotated diagnostic logs (SOW §41 event list) — no per-frame logging.

## 8. Testing Strategy

1. Vitest unit tests for `ResultEngine` boundary classification (first thing built, per SOW §44 table + edge cases: negative, NaN, invalid settings).
2. Manual hardware test pass with actual/equivalent USB arcade button (SOW §45 checklist) before delivery.
3. Multi-hour endurance/offline/restart pass (SOW §46) as the final gate before acceptance.

## 9. Out of Scope

Everything listed in SOW §56 (cloud backend, accounts, CRM/email/SMS, analytics dashboard, custom firmware, payments, etc.). Additionally flagged but **not building now** unless separately approved: winner-data CSV/USB export (no mechanism currently exists to get lead data off the kiosk after the show — noted as a likely fast-follow ask).

## 10. Acceptance

Full criteria per SOW §55 apply unchanged (gameplay, hardware, timing, admin, winner system, offline, kiosk, reliability). This spec doesn't relax or add to those criteria — it only resolves the implementation-level ambiguities needed to start building.
