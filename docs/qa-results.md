# QA Results — 9-3 Verdict Challenge

Status as of 2026-08-12. This document separates work that has actually
been **verified by automated tooling in this environment** from work that
requires **physical hardware and/or multi-hour wall-clock time and has
not yet been performed**. Nothing below is fabricated or simulated on
its owner's behalf — pending items are marked PENDING, not passed.

## 1. Automated test suite (SOW §44) — VERIFIED

Command: `npm test` (`vitest run`)

```
Test Files  18 passed (18)
     Tests  130 passed (130)
  Duration  2.82s
```

Note: the 18 test files are 9 unique suites, each present twice — once
as the `.ts`/`.tsx` source under version control and once as a `.js`
copy left in `src/` by a prior local `tsc -b` run (pre-existing,
untracked build artifacts, not created or modified by this task). Both
copies pass identically; the unique suite count is 9:

- `ResultEngine.test.ts` — boundary classification (WIN/NEAR/OTHER),
  negative values, NaN, extremely large results, two-decimal display
  formatting, raw-precision retention. PASS
- `TimerEngine.test.ts` — start/stop/reset, elapsed time computed from
  caller-supplied timestamps (not wall clock), tick subscription.
  PASS
- `GameEngine.test.ts` — full state machine (IDLE → RUNNING →
  RESULT_* → WINNER_ENTRY → IDLE), auto-reset, stuck-RUNNING
  auto-cancel, winner-entry timeout/activity reset. PASS
- `InputManager.test.ts` — debounce, repeat-keydown ignoring, held-key
  handling, post-stop lockout, mouse/touch backup routing through the
  same start/stop toggle. PASS
- `SettingsStore.test.ts` — persistence and defaults. PASS
- `WinnerStore.test.ts` — add/clear/persist-across-instances, corrupt
  stored value fallback, write-failure resilience. PASS
- `AudioManager.test.ts` — graceful handling of missing/failed audio
  assets. PASS
- `OnScreenKeyboard.test.tsx` — on-screen keyboard backup input. PASS
- `Logger.test.ts` — logging behavior. PASS

Result: **all automated unit tests pass.** This satisfies SOW §44's
minimum requirement (boundary tests for result classification, plus
negative/NaN/invalid-settings/extremely-large/rapid-input/held-key
cases) and the broader unit coverage across the engine/storage/input
layers.

## 2. Offline audit (Task 26) — VERIFIED

Static source audit (`grep` for network/remote references across
`src/**/*.ts`, `*.tsx`, `*.css`, `*.html`, plus a manual review of
`index.html`, `theme.css`, and `package.json` dependencies) found
**zero** network or remote-asset references. Full detail in
`.superpowers/sdd/2026-08-11-93-verdict-challenge/task-26-report.md`.

The physical half of that same task (install the packaged app, disable
Wi-Fi, confirm end-to-end operation on real hardware) is itself flagged
in the Task 26 report as an open manual-verification item — it is
carried forward into the hardware pass below rather than duplicated
here.

## 3. Build / packaging verification — VERIFIED (build only)

- `npm run build` (`tsc -b && vite build`) completes successfully:
  renderer, Electron main process, and preload script all build
  without type errors. Output: `dist/index.html` (0.3 kB),
  `dist/assets/index-*.js` (207 kB), `dist-electron/main.js` (191 kB),
  `dist-electron/preload.js` (0.55 kB).
- Build emits four expected warnings for
  `../assets/audio/{win,near,other,start}.mp3` — these are the
  placeholder audio assets called out in prior tasks (18/25/26) as
  "client to supply final"; the app resolves them at runtime and fails
  gracefully if absent (covered by `AudioManager.test.ts`).
- `npm run package` (`electron-builder`, NSIS + portable targets) was
  **not** run as part of this task — producing and installing a real
  Windows installer is exercised together with the hardware pass below,
  not as a standalone step here.

## 4. Manual hardware / endurance pass (SOW §45-46) — PENDING

These items require the actual (or equivalent) USB arcade button, a
physical Windows kiosk PC, a display running for multiple hours, and a
human observer. They **cannot be simulated or fabricated** in this
sandboxed, non-interactive environment, so they are recorded here as an
explicit checklist for the client/dev team to execute before final
sign-off — not as completed results.

### Hardware testing (SOW §45)

| #   | Test                                                  | Status                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1   | Normal press                                          | PENDING — needs physical arcade button                   |
| 2   | Fast press                                            | PENDING — needs physical arcade button                   |
| 3   | Slow press                                            | PENDING — needs physical arcade button                   |
| 4   | Button held down                                      | PENDING — needs physical arcade button                   |
| 5   | Rapid double press                                    | PENDING — needs physical arcade button                   |
| 6   | 100+ repeated games                                   | PENDING — needs physical arcade button                   |
| 7   | USB disconnect (app must not crash)                   | PENDING — needs physical hardware                        |
| 8   | USB reconnect (input resumes without app restart)     | PENDING — needs physical hardware                        |
| 9   | PC restart                                            | PENDING — needs physical kiosk PC                        |
| 10  | App restart                                           | PENDING — needs physical kiosk PC                        |
| 11  | Several hundred to 1,000 simulated/manual game cycles | PENDING — needs physical arcade button, extended session |

### Endurance testing (SOW §46)

| #   | Check                                           | Status                                                                                     |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Multi-hour continuous operation (several hours) | PENDING — needs multi-hour wall-clock session                                              |
| 2   | No memory leak                                  | PENDING — needs Chromium task manager / `process.getProcessMemoryInfo()` over hours        |
| 3   | No growing DOM nodes                            | PENDING — needs live DevTools inspection over hours                                        |
| 4   | No accumulating timers                          | PENDING — needs live inspection over hours                                                 |
| 5   | No duplicate keyboard listeners                 | PENDING — needs live inspection over hours                                                 |
| 6   | No audio resource leak                          | PENDING — needs live inspection over hours, and real audio assets (currently placeholders) |
| 7   | No FPS degradation                              | PENDING — needs live monitoring over hours                                                 |
| 8   | No storage corruption                           | PENDING — needs extended real-usage session against `electron-store` files                 |
| 9   | No progressive slowdown                         | PENDING — needs multi-hour session                                                         |

**How to execute this section:** connect the real USB arcade-button
encoder per `docs/hardware-setup.md`, deploy the packaged build
(`npm run package`) to the target Windows mini PC configured per
`docs/windows-booth-setup.md`, then work through both tables in order,
recording pass/fail and any observations (e.g. via Chromium's built-in
task manager, `chrome://gpu`, or `Logger` output) directly in this file.

## 5. SOW §55 Acceptance Criteria cross-check

| Category      | Item                                               | Status                                                                                                                                                                                           |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gameplay      | One button starts timer                            | VERIFIED (unit) — `GameEngine.test.ts`, `InputManager.test.ts`                                                                                                                                   |
| Gameplay      | Same button stops timer                            | VERIFIED (unit)                                                                                                                                                                                  |
| Gameplay      | Timer displays exactly two decimals, no `s` suffix | VERIFIED (unit) — `ResultEngine.test.ts`                                                                                                                                                         |
| Gameplay      | Result appears immediately                         | VERIFIED (unit, state transition)                                                                                                                                                                |
| Gameplay      | Correct WIN/NEAR/OTHER classification              | VERIFIED (unit) — boundary tests                                                                                                                                                                 |
| Gameplay      | Automatic reset works                              | VERIFIED (unit) — auto-reset + stuck-RUNNING auto-cancel                                                                                                                                         |
| Hardware      | USB HID arcade button works                        | PENDING — physical hardware                                                                                                                                                                      |
| Hardware      | Held button doesn't immediately stop timer         | VERIFIED (unit) + PENDING (physical confirmation)                                                                                                                                                |
| Hardware      | Keyboard backup works                              | VERIFIED (unit)                                                                                                                                                                                  |
| Hardware      | Mouse/touch backup works                           | VERIFIED (unit) — `InputManager.test.ts`; now wired into the UI (`onPointerDown` on the Idle and Running screen containers, `App.tsx`), but PENDING manual click/touch confirmation on the booth |
| Hardware      | USB disconnect doesn't crash application           | PENDING — physical hardware                                                                                                                                                                      |
| Timing        | `performance.now()` is source of truth             | VERIFIED (code review, prior tasks)                                                                                                                                                              |
| Timing        | Result NOT calculated from rendered frames         | VERIFIED (code review, prior tasks)                                                                                                                                                              |
| Timing        | Full internal precision retained                   | VERIFIED (unit) — `ResultEngine.test.ts`                                                                                                                                                         |
| Timing        | Configurable ranges work                           | VERIFIED (unit) — `SettingsStore.test.ts`, `ResultEngine.test.ts`                                                                                                                                |
| Timing        | Boundary tests pass                                | VERIFIED (unit)                                                                                                                                                                                  |
| Admin         | Win/near range editable                            | VERIFIED (unit + prior task review)                                                                                                                                                              |
| Admin         | Sound editable                                     | VERIFIED (prior task review)                                                                                                                                                                     |
| Admin         | Auto reset editable                                | VERIFIED (prior task review)                                                                                                                                                                     |
| Admin         | Winner feature editable                            | VERIFIED (prior task review)                                                                                                                                                                     |
| Admin         | Settings survive restart                           | VERIFIED (unit) — `SettingsStore.test.ts`                                                                                                                                                        |
| Admin         | Button test available                              | VERIFIED (prior task review) + PENDING (physical confirmation)                                                                                                                                   |
| Winner System | Only winners can enter details                     | VERIFIED (unit) — `GameEngine.test.ts`                                                                                                                                                           |
| Winner System | Entry is optional                                  | VERIFIED (unit) — `skipWinnerEntry`                                                                                                                                                              |
| Winner System | Name + law firm saved locally                      | VERIFIED (unit) — `WinnerStore.test.ts`                                                                                                                                                          |
| Winner System | Idle screen can rotate winners                     | VERIFIED (prior task review)                                                                                                                                                                     |
| Winner System | Winners can be cleared                             | VERIFIED (unit) — `WinnerStore.test.ts`                                                                                                                                                          |
| Winner System | Feature can be disabled                            | VERIFIED (unit) — `GameEngine.test.ts`                                                                                                                                                           |

"VERIFIED (unit)" means covered by a passing automated test in this
run. "VERIFIED (prior task review)" means implemented and reviewed in
an earlier task but not exercised by an automated test in this suite.
"PENDING" items require the physical hardware pass in Section 4 before
they can be marked verified.

## Summary

- Automated regression gate: **130/130 tests passing, 0 failing.**
- Offline/static audit: **clean, verified.**
- Build: **succeeds.**
- Hardware and multi-hour endurance testing per SOW §45-46: **not yet
  performed** — requires physical USB arcade-button hardware and a
  real multi-hour kiosk session, both outside the reach of this
  sandboxed environment. This is the one remaining gate before final
  client sign-off.
