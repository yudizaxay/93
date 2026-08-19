Below is the **final implementation SOW / engineering specification** I would give directly to Codex or Claude Code. It includes the client's original brief, latest feedback, booth reference, offline requirement, USB hardware handling, timing/latency strategy, winner flow, admin panel, kiosk behavior, testing, and acceptance criteria.

You can paste this as the project master prompt.

# 9-3 VERDICT CHALLENGE

## Final Scope of Work & Technical Implementation Specification

### 1. Project Objective

Build a production-ready, premium interactive booth game for **Acme Court Reporting** called:

**9-3 VERDICT CHALLENGE**

The objective is extremely simple:

> A player presses one physical red USB arcade button to start a timer, then presses the same button again to stop it, attempting to land exactly on **0.93 seconds**.

The application will operate at a convention/trade-show booth on a Windows mini PC connected to a 43-inch TV.

The experience must be immediately understandable without staff explanation:

**PRESS → PRESS → RESULT → NEXT PLAYER**

The application must work **100% offline** after installation.

The current prototype/reference is:

[Existing 9-3 Verdict Challenge Demo](https://93secondtimergame.netlify.app/?utm_source=chatgpt.com)

The existing prototype is a functional/design reference only. The final application should be treated as a production kiosk application rather than simply deploying the website.

---

# 2. Physical Booth Environment

The provided booth reference should guide UI visibility, typography, proportions, colors and interaction.

Physical setup:

```text
10' × 10' Corner Booth
        │
        ├── 43" TV on roller stand
        │
        ├── Windows Mini PC
        │
        ├── HDMI → TV
        │
        ├── USB Arcade Button
        │      └── Red physical button
        │
        ├── 6' branded table
        │
        ├── Acme Court Reporting branding
        │
        └── Roll-up banner / signage
```

The game must remain readable from several feet away.

The timer and **0.93 challenge** must visually dominate the screen.

### IMPORTANT: Display orientation discrepancy

The original requirement specifies:

**43" TV — landscape**

However, the latest booth reference explicitly shows:

**43" TV on roller stand — VERTICAL ORIENTATION**

and the game itself is presented in portrait orientation.

Therefore, architecture and CSS must be responsive enough to support both orientations, but **portrait should be treated as the primary layout based on the latest booth reference unless the client confirms otherwise.**

Do not hard-code the UI around a single pixel resolution.

---

# 3. Recommended Technology Stack

Build as an offline Windows desktop/kiosk application.

Recommended stack:

```text
Electron
+
HTML5
+
CSS
+
JavaScript / TypeScript
```

React can be used if useful, but is not mandatory.

Preferred implementation:

```text
Electron
TypeScript
React (optional)
Vite
Local JSON/electron-store
Howler/Web Audio or local HTML Audio
Canvas/CSS/local confetti implementation
Electron Builder
```

The application must NOT require:

```text
Internet
Cloud API
Remote database
Netlify
Firebase
Supabase
Google Fonts
CDN
External JavaScript
Remote image URLs
Remote sound URLs
Authentication service
```

All runtime dependencies/assets must be bundled locally.

---

# 4. Hardware Architecture

The client will use:

**ONE physical red USB arcade button**

The button/encoder will emulate a standard keyboard key through USB HID.

Recommended mapping:

```text
SPACE
```

Alternative mappings such as Enter may be supported through admin configuration.

Architecture:

```text
┌──────────────────────┐
│ Physical Arcade      │
│ Button               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ USB HID Encoder      │
│ Keyboard Emulation   │
└──────────┬───────────┘
           │ USB
           ▼
┌──────────────────────┐
│ Windows Mini PC      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Electron Application │
│                      │
│ HID/Keyboard Event   │
│ High-res Timer       │
│ Game State           │
│ UI                   │
│ Local Storage        │
└──────────┬───────────┘
           │ HDMI
           ▼
┌──────────────────────┐
│ 43" TV               │
└──────────────────────┘
```

No custom USB driver should be required if the encoder correctly identifies itself as a standard HID keyboard.

---

# 5. Critical Timing Architecture

This is a core engineering requirement.

## DO NOT implement timing using:

```javascript
setInterval(() => {
  time += 0.01;
}, 10);
```

Do not determine the winner using:

- `setInterval`
- `setTimeout`
- animation frame counts
- displayed timer value
- CSS animation duration
- system clock / `Date.now()`

These are not reliable enough for the source-of-truth measurement.

## Source of truth

Use:

```javascript
performance.now();
```

The Performance API provides a high-resolution monotonic timestamp suitable for measuring elapsed durations. ([93 Second Timer Game][1])

Conceptually:

```javascript
let startTimestamp = 0;

function startGame() {
  startTimestamp = performance.now();
}

function stopGame() {
  const stopTimestamp = performance.now();

  const elapsedMilliseconds = stopTimestamp - startTimestamp;

  const elapsedSeconds = elapsedMilliseconds / 1000;

  evaluateResult(elapsedSeconds);
}
```

Keep the internal elapsed value at full precision.

Example:

```text
Internal:

0.931842 seconds

Displayed:

0.93
```

Do NOT prematurely round before evaluating the configured ranges.

---

# 6. Separate Measurement From Rendering

The visible timer and actual timer measurement are two different systems.

Use:

```javascript
requestAnimationFrame();
```

for the animated timer display.

Example:

```text
performance.now()
        │
        │
        ├──────────────► Actual result calculation
        │
        │
        └──────────────► requestAnimationFrame()
                              │
                              ▼
                        Visual timer
```

The TV refresh rate must NOT determine the result.

For example, a 60 Hz TV updates approximately every:

```text
16.67 ms
```

The screen may visually move:

```text
0.90
0.92
0.93
0.95
```

while internally the stop event might occur at:

```text
932.481 ms
```

The application should evaluate:

```text
0.932481
```

not whatever number happened to be painted on the previous TV frame.

---

# 7. USB/Input Latency Strategy

Do NOT claim the physical system has "zero latency."

The real input path is:

```text
Finger
 ↓
Mechanical Switch
 ↓
USB Encoder
 ↓
USB Polling
 ↓
Windows HID
 ↓
Electron Keyboard Event
 ↓
performance.now()
```

Every stage can introduce small latency.

However, the same input path is used for START and STOP.

Therefore, relatively consistent input latency largely cancels when calculating elapsed duration.

Example:

```text
Physical START:
1000 ms

Application receives START:
1004 ms

Physical STOP:
1933 ms

Application receives STOP:
1937 ms


Measured:

1937 - 1004
= 933 ms
```

Therefore:

```text
0.933 sec
```

remains correct despite approximately 4 ms of consistent input latency.

### Main latency risk

The important variable is **latency jitter**, not absolute latency.

Example:

```text
START latency = 3 ms
STOP latency  = 8 ms

Measurement error ≈ 5 ms
```

For that reason:

- Use a reputable USB HID arcade encoder.
- Test using the actual production button/encoder.
- Avoid unknown ultra-cheap controllers if possible.
- Do not perform expensive work inside the input event before recording the timestamp.

The timestamp must be captured immediately.

Correct:

```javascript
function onButtonPress() {
  const inputTimestamp = performance.now();

  // game logic AFTER timestamp
}
```

Avoid:

```javascript
function onButtonPress() {
  playSound();
  updateDOM();
  runAnimation();

  const inputTimestamp = performance.now();
}
```

---

# 8. Input Debouncing

Physical controls must not accidentally generate multiple game actions.

Implement software protection.

### Keyboard repeat

Immediately reject:

```javascript
if (event.repeat) return;
```

### Debounce

Use a small configurable/internal debounce window.

Recommended starting point:

```text
30–50 ms
```

Example:

```javascript
const DEBOUNCE_MS = 40;

if (currentTimestamp - lastInputTimestamp < DEBOUNCE_MS) {
  return;
}
```

The debounce must NOT affect legitimate stop attempts around 0.93 seconds.

---

# 9. Game State Machine

Implement explicit state management.

Do not infer state from UI elements.

States:

```typescript
enum GameState {
  IDLE,
  RUNNING,
  RESULT_WIN,
  RESULT_NEAR,
  RESULT_OTHER,
  WINNER_ENTRY,
}
```

Primary state flow:

```text
             ┌─────────┐
             │  IDLE   │
             └────┬────┘
                  │
              BUTTON
                  │
                  ▼
             ┌─────────┐
             │ RUNNING │
             └────┬────┘
                  │
              BUTTON
                  │
                  ▼
          ┌──────────────┐
          │ CALCULATE    │
          │ RESULT       │
          └──────┬───────┘
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
      WIN       NEAR       OTHER
       │         │          │
       ▼         ▼          ▼
 Celebration   Result     Result
       │         │          │
       └─────────┼──────────┘
                 │
              Timeout
                 │
                 ▼
               IDLE
```

---

# 10. Idle Screen

Primary messaging:

```text
9-3
VERDICT
CHALLENGE

CAN YOU LAND ON

0.93

PRESS BUTTON TO START
```

The wording can be refined during visual implementation.

The idle screen must:

- be readable from a distance
- make 0.93 visually dominant
- immediately communicate what to do
- subtly display brand identity
- avoid clutter
- periodically support winner rotation

---

# 11. Running State

After first physical button press:

```text
0.00
```

begins counting upward.

Example:

```text
0.01
0.02
0.03
...
0.91
0.92
0.93
...
```

Do NOT display:

```text
0.93s
```

Client specifically requested:

```text
0.93
```

without the `s`.

The timer must display exactly **two decimal places** to the player.

Internal timing must retain full precision.

---

# 12. Stop/Result Evaluation

On second button press:

1. Immediately capture high-resolution timestamp.
2. Calculate elapsed duration.
3. Freeze visible timer.
4. Format result to two decimals.
5. Evaluate against configured ranges.
6. Trigger corresponding state.

---

# 13. Configurable Winning Range

The target is:

```text
0.93
```

However, do NOT hard-code one exact floating-point number as the only winning condition.

Admin must be able to configure:

```text
Winning Minimum
Winning Maximum
```

Example:

```text
Min = 0.925
Max = 0.934999
```

which naturally displays as:

```text
0.93
```

Alternatively, the client may intentionally configure a wider promotional win range.

Example:

```text
0.92 – 0.94
```

The game engine must support either approach without code changes.

---

# 14. Near-Win Range

Admin must also configure a:

**SO CLOSE range**

Possible implementation:

```text
Target = 0.93
Near tolerance = ±0.03
```

or explicit:

```text
Near Minimum
Near Maximum
```

Explicit min/max configuration is preferable because it removes ambiguity.

Priority must always be:

```text
WIN
↓
NEAR
↓
OTHER
```

Never classify a winning result as Near.

---

# 15. WIN Experience

Example:

```text
        0.93

9-3 PLAINTIFF VERDICT

       YOU WIN!
```

The win must feel dramatically more exciting than other outcomes.

Trigger:

- confetti
- premium particle animation
- red/gold visual accents
- glow/pulse
- victory sound
- subtle screen animation

Avoid:

- casino imagery
- slot-machine visuals
- cartoon styling
- cheesy jackpot graphics

The design must remain sophisticated and consistent with brand identity.

---

# 16. SO CLOSE Experience

Remove:

```text
Runner Up
Variance
Technical timing information
```

Display something similar to:

```text
0.95

SO CLOSE!

ONLY .02 AWAY!
```

Calculate difference dynamically.

Concept:

```javascript
difference = Math.abs(elapsedSeconds - target);
```

Player-facing difference should be formatted appropriately.

Example:

```text
Actual result = 0.952
Target = 0.93

Displayed:

0.95

SO CLOSE!

ONLY .02 AWAY!
```

Do not expose internal precision.

---

# 17. Other Result

For all non-win/non-near results:

```text
1.17

DEFENSE VERDICT

TRY AGAIN!
```

Client specifically requested removing:

```text
TOO LOW
TOO HIGH
MISTRIAL
```

Do not include these concepts in the final player-facing UI.

---

# 18. Automatic Reset

After result display:

```text
Result
 ↓
Wait configurable duration
 ↓
IDLE
```

Recommended default:

```text
4–5 seconds
```

Admin should be able to change this.

The application must never require staff to reset normal games manually.

---

# 19. Winner Capture

Only actual WIN results qualify.

Do NOT ask every player for their information.

Normal flow must remain:

```text
PRESS
↓
PRESS
↓
RESULT
↓
NEXT PLAYER
```

After a win:

```text
WIN
 ↓
Celebration
 ↓
Optional Winner Prompt
```

Example:

```text
ADD YOUR NAME TO
TODAY'S PLAINTIFF VERDICTS?

[ ADD NAME ]

[ SKIP ]
```

Winner capture must be configurable:

```text
Enabled
Disabled
```

---

# 20. Winner Form

If player/staff chooses Add Name:

```text
Name
[________________]

Law Firm
[________________]

[SAVE]

[SKIP]
```

Only these fields are required.

Do not introduce:

- email
- phone
- login
- account
- marketing signup

unless separately requested later.

Name entry will use keyboard/mouse unless the hardware setup later includes a touchscreen.

---

# 21. Winner Entry Timeout

Winner entry must never block the booth indefinitely.

Example:

```text
Winner prompt timeout:
8 seconds
```

If no interaction:

```text
Automatically Skip
↓
Return to IDLE
```

If the user is actively typing, do not reset mid-entry.

---

# 22. Today's Plaintiff Verdicts

Store successful winner records locally.

Example:

```json
{
  "id": "...",
  "name": "John Doe",
  "lawFirm": "ABC Law Firm",
  "result": 0.93182,
  "displayResult": "0.93",
  "createdAt": "2026-08-11T..."
}
```

The idle screen should periodically rotate winners.

Example:

```text
TODAY'S
PLAINTIFF VERDICTS

JOHN DOE
ABC LAW FIRM

PLAINTIFF VERDICT
```

Then return to:

```text
CAN YOU LAND ON 0.93?
```

Winner rotation must be optional.

---

# 23. Local Persistence

Use local persistent storage.

Recommended:

```text
electron-store / JSON
```

rather than introducing a database server.

Suggested data:

```json
{
  "settings": {
    "target": 0.93,
    "winMin": 0.925,
    "winMax": 0.934999,
    "nearMin": 0.9,
    "nearMax": 0.96,
    "soundEnabled": true,
    "soundVolume": 0.8,
    "autoResetMs": 5000,
    "winnerCaptureEnabled": true,
    "winnerRotationEnabled": true,
    "buttonKey": "Space"
  },

  "winners": []
}
```

Use atomic/safe persistence so an unexpected shutdown is unlikely to corrupt configuration.

---

# 24. Admin / Settings Area

Admin UI must NOT be visible during normal gameplay.

Suggested shortcut:

```text
CTRL + SHIFT + A
```

Settings:

```text
GAME SETTINGS

Target
[0.93]

WIN RANGE

Minimum
[0.925]

Maximum
[0.934999]


SO CLOSE RANGE

Minimum
[0.90]

Maximum
[0.96]


AUTO RESET

[5] seconds


SOUND

[x] Enabled

Volume
[-------]


WINNER CAPTURE

[x] Enabled


IDLE WINNER ROTATION

[x] Enabled


INPUT KEY

[SPACE]


[TEST BUTTON]

[TEST WIN]

[TEST SOUND]

[CLEAR TODAY'S WINNERS]

[SAVE]

[CLOSE]
```

Validate all values.

For example:

```text
winMin <= winMax
nearMin <= nearMax
target > 0
autoReset > 0
```

---

# 25. Hardware Test Mode

Include a simple hardware diagnostic.

Admin selects:

**TEST BUTTON**

Screen displays:

```text
WAITING FOR USB BUTTON...
```

When button is detected:

```text
USB BUTTON DETECTED ✓

KEY: SPACE

INPUT RECEIVED
```

Optionally display event timestamp for admin diagnostics only.

This information must never appear on the public game screen.

---

# 26. Keyboard/Mouse Backup

Game must remain playable if arcade hardware fails.

Support:

```text
SPACE
```

as start/stop.

Optional mouse/touch target can also start/stop.

The physical USB button and keyboard must go through the **same game input handler**.

Do not create separate timing implementations.

Example:

```text
USB Button ─────┐
                │
Keyboard ───────┼──► handleGameInput()
                │
Mouse ──────────┘
```

This prevents inconsistent behavior.

---

# 27. Input Locking

During:

```text
WIN animation
SO CLOSE result
OTHER result
Admin
Winner form
```

the arcade button must not accidentally start another game unless explicitly designed to do so.

Immediately after stopping, implement a short lockout.

Example:

```text
500 ms
```

to prevent accidental repeated presses.

---

# 28. Branding / Visual Design

Use the booth reference as the primary aesthetic direction.

Palette:

```text
BLACK
BRAND RED
WHITE
SUBTLE GOLD
```

Visual personality:

```text
Premium
Professional
Legal
Sophisticated
Modern
High contrast
Clean
Minimal
```

Avoid:

```text
Casino styling
Cartoon graphics
Neon overload
Slot machines
Cheap gradients
Excessive animations
Clutter
```

---

# 29. Company Logo

Include the:

**Acme Court Reporting**

logo subtly.

The logo must NOT overpower:

```text
0.93
```

or:

```text
9-3 VERDICT CHALLENGE
```

The booth itself already has heavy brand identity.

---

# 30. Responsive Display Design

Primary target:

```text
43" TV
```

The app should properly handle common resolutions such as:

```text
1920 × 1080
1080 × 1920
3840 × 2160
2160 × 3840
```

Use responsive sizing:

```css
vw
vh
clamp()
aspect-ratio
flex/grid
```

rather than hard-coded desktop pixel positioning.

---

# 31. Portrait/Landscape Handling

Because the client materials conflict regarding orientation, support both.

Example:

```css
@media (orientation: portrait) {
  /* primary booth design */
}

@media (orientation: landscape) {
  /* alternate arrangement */
}
```

Portrait should visually resemble the provided booth concept:

```text
        LOGO

        9-3
      VERDICT
     CHALLENGE

   CAN YOU LAND ON

        0.93

  PRESS TO START
```

Landscape can redistribute secondary elements horizontally.

---

# 32. Offline Requirement

After installation, disconnect:

```text
Ethernet
Wi-Fi
Internet
```

and the application must retain **all functionality**.

Audit source code for:

```text
http://
https://
fetch()
axios remote requests
Google Fonts
CDN imports
remote CSS
remote JS
remote audio
remote images
analytics
telemetry dependencies
```

The production game should not rely on any of these for functionality.

---

# 33. Windows Kiosk Mode

The final app should run fullscreen.

Recommended Electron configuration:

```text
fullscreen: true
kiosk: true
autoHideMenuBar: true
```

Player should not see:

```text
Browser chrome
URL
Windows taskbar
Developer tools
Menus
Scrollbars
Cursor during gameplay
```

Provide a hidden admin/exit mechanism.

---

# 34. Emergency Exit

Suggested:

```text
CTRL + SHIFT + Q
```

This should exit kiosk/application.

The physical arcade button must NEVER trigger exit.

---

# 35. Cursor Handling

During game:

```text
hide cursor after inactivity
```

When mouse movement occurs:

```text
show cursor
```

This allows admin/winner interaction without leaving a mouse cursor sitting on the public screen.

---

# 36. Windows Startup

Configure or document automatic launch.

Desired experience:

```text
POWER ON PC
     ↓
WINDOWS STARTS
     ↓
AUTO LOGIN
     ↓
GAME STARTS
     ↓
FULLSCREEN
     ↓
READY
```

No staff should need to:

```text
open Chrome
enter URL
start server
run npm
open terminal
```

---

# 37. Windows Booth Configuration

Deployment guide should recommend:

```text
Sleep                 OFF
Display sleep         OFF
Screen saver          OFF
Notifications         OFF
Focus Assist          ON
Automatic restart     Controlled
TV resolution         Fixed
Windows scaling       Tested
Volume                Preconfigured
```

Do not modify security-critical Windows settings unnecessarily.

---

# 38. Sound

Support local audio for:

```text
WIN
SO CLOSE (optional)
TRY AGAIN (optional)
Button/start (optional)
```

Winning sound should be significantly more rewarding.

Admin:

```text
Sound ON/OFF
Volume
Test Sound
```

All audio files bundled locally.

---

# 39. Animation Performance

Animations must not interfere with timer input processing.

Do not execute heavy synchronous JavaScript during `RUNNING`.

Avoid expensive DOM operations every millisecond.

Rendering loop should only update what is required.

Recommended:

```text
RUNNING

performance.now()
       ↓
requestAnimationFrame
       ↓
update timer text only
```

Animations should primarily occur after STOP.

---

# 40. Error Recovery

Application should recover gracefully from unexpected state.

Examples:

If game remains RUNNING beyond a reasonable maximum duration:

```text
30 seconds
```

automatically cancel/reset.

If invalid settings are detected:

```text
load safe defaults
```

If winner storage cannot be read:

```text
do not crash game
```

If audio fails:

```text
continue without audio
```

Game functionality must take priority over optional features.

---

# 41. Logging

Maintain minimal local diagnostic logs.

Useful events:

```text
APP_STARTED
GAME_STARTED
GAME_STOPPED
RESULT_WIN
RESULT_NEAR
RESULT_OTHER
WINNER_SAVED
SETTINGS_UPDATED
INPUT_ERROR
UNEXPECTED_ERROR
```

Do NOT log every animation frame.

Keep logs bounded/rotated so they cannot grow indefinitely during a convention.

---

# 42. Development Mode vs Production Mode

Development may expose:

```text
Timing precision
Raw elapsed value
Input timestamps
FPS
Keyboard events
Debug information
```

Production must NOT show these.

Player-facing screens must never display:

```text
Precision
Variance
Raw milliseconds
Latency
Debug output
FPS
```

---

# 43. Floating Point / Result Handling

Avoid equality checks like:

```javascript
elapsed === 0.93;
```

Instead:

```javascript
elapsed >= winMin && elapsed <= winMax;
```

Keep raw result separate:

```typescript
interface GameResult {
  rawSeconds: number;
  displaySeconds: string;
  differenceFromTarget: number;
  category: "WIN" | "NEAR" | "OTHER";
}
```

Example:

```text
rawSeconds:
0.932741

displaySeconds:
"0.93"

difference:
0.002741

category:
WIN
```

---

# 44. Automated Tests

At minimum create unit tests for result classification.

Examples:

```text
0.9249 → depends on configured near range
0.9250 → WIN
0.9299 → WIN
0.9300 → WIN
0.9349 → WIN
0.9350 → expected boundary behavior
0.9500 → NEAR
1.1000 → OTHER
```

Test exact boundaries.

Also test:

```text
negative values
NaN
invalid settings
extremely large result
rapid input
held key
```

---

# 45. Hardware Testing

Final QA should use the actual or equivalent USB arcade button.

Test:

```text
Normal press
Fast press
Slow press
Button held down
Rapid double press
100+ repeated games
USB disconnect
USB reconnect
PC restart
App restart
```

Ideally run several hundred to 1,000 simulated/manual game cycles before final delivery.

---

# 46. Endurance Testing

Application is intended for continuous convention operation.

Perform an extended test of several hours.

Verify:

```text
No memory leak
No growing DOM nodes
No accumulating timers
No duplicate keyboard listeners
No audio resource leak
No FPS degradation
No storage corruption
No progressive slowdown
```

This is particularly important in Electron.

---

# 47. USB Disconnect Behavior

If the arcade button is disconnected, application must NOT crash.

Keyboard/mouse backup should continue functioning.

After reconnecting a standard keyboard-emulating USB controller, Windows should normally restore keyboard input without requiring application restart.

---

# 48. Screen Visibility

Because attendees may see the game from across the aisle:

Prioritize:

**1. 0.93**

**2. VERDICT CHALLENGE**

**3. PRESS BUTTON**

**4. Result**

Branding is secondary.

Do not fill the game screen with instructions.

The table signage already provides detailed instructions.

---

# 49. Booth User Journey

Target journey:

```text
Attendee walks past
        ↓
Sees huge 0.93 challenge
        ↓
Understands physical red button
        ↓
Presses button
        ↓
Timer starts
        ↓
Presses again
        ↓
Immediate result
        ↓
Celebration / So Close / Try Again
        ↓
Automatic reset
        ↓
Next attendee
```

Total explanation required:

**zero staff explanation ideally.**

---

# 50. Final Player-Facing Copy

## IDLE

```text
9-3 VERDICT CHALLENGE

CAN YOU LAND ON 0.93?

PRESS BUTTON TO START
```

## RUNNING

```text
0.47
```

## WIN

```text
0.93

9-3 PLAINTIFF VERDICT

YOU WIN!
```

## NEAR

```text
0.95

SO CLOSE!

ONLY .02 AWAY!
```

## OTHER

```text
1.17

DEFENSE VERDICT

TRY AGAIN!
```

Do NOT include:

```text
TOO HIGH
TOO LOW
MISTRIAL
RUNNER UP
PRECISION
VARIANCE
```

---

# 51. Source Code Structure

Keep architecture clean.

Suggested:

```text
/src

  /main
    main.ts
    window.ts

  /renderer
    App.tsx

    /components
      Timer.tsx
      IdleScreen.tsx
      RunningScreen.tsx
      ResultScreen.tsx
      WinnerForm.tsx
      WinnerRotation.tsx
      AdminPanel.tsx

    /game
      GameEngine.ts
      TimerEngine.ts
      ResultEngine.ts
      InputManager.ts

    /storage
      SettingsStore.ts
      WinnerStore.ts

    /audio
      AudioManager.ts

    /types
      game.ts
      settings.ts

    /assets
      /logos
      /audio
      /fonts
      /images

/tests

/docs
```

Do not put the entire application into one giant React component.

---

# 52. Security / Electron Configuration

Follow standard Electron security practices.

Where possible:

```text
contextIsolation: true
nodeIntegration: false
sandbox appropriately
preload bridge
disable unnecessary navigation
disable new windows
```

The renderer should not have unrestricted Node access.

This is an offline kiosk, but poor Electron architecture is still unnecessary.

---

# 53. Deliverables

Final delivery must include:

```text
1. Complete source code

2. package.json / lock file

3. All local assets

4. Production Windows installer

5. Portable build if practical

6. Admin/settings functionality

7. USB button support

8. Keyboard/mouse backup

9. Winner functionality

10. Offline operation

11. README

12. Windows setup instructions

13. Hardware setup instructions

14. Build instructions

15. Source project files
```

---

# 54. README Requirements

README should explain:

```text
Development setup

npm install
npm run dev

Production build

npm run build

Windows packaging

npm run package

Admin shortcut

Exit shortcut

USB button configuration

How to modify settings

How to clear winners

Where local data is stored

Troubleshooting

Offline verification
```

---

# 55. Acceptance Criteria

Project is complete only when all of the following work.

### Gameplay

- One button starts timer.
- Same button stops timer.
- Timer displays exactly two decimals.
- No `s` suffix.
- Result appears immediately.
- Correct WIN classification.
- Correct NEAR classification.
- Correct OTHER classification.
- Automatic reset works.

### Hardware

- USB HID arcade button works.
- Held button doesn't immediately stop timer.
- Keyboard backup works.
- Mouse backup works if implemented.
- USB disconnect doesn't crash application.

### Timing

- `performance.now()` is source of truth.
- Result is NOT calculated from rendered frames.
- Full internal precision retained.
- Configurable ranges work.
- Boundary tests pass.

### Admin

- Win range editable.
- Near range editable.
- Sound editable.
- Auto reset editable.
- Winner feature editable.
- Settings survive restart.
- Button test available.

### Winner System

- Only winners can enter details.
- Entry is optional.
- Name + law firm saved locally.
- Idle screen can rotate winners.
- Winners can be cleared.
- Feature can be disabled.

### Offline

With network completely disabled:

- Game launches.
- Game works.
- USB button works.
- Audio works.
- Animation works.
- Admin works.
- Winner storage works.
- Restart works.

### Kiosk

- Fullscreen.
- No browser chrome.
- No accidental exit.
- Hidden admin shortcut works.
- Hidden exit shortcut works.
- Automatic startup documented/configured.

### Reliability

- Repeated games do not degrade performance.
- No duplicate event handlers.
- No timer accumulation.
- No obvious memory leak.
- Unexpected optional-feature failure doesn't crash gameplay.

---

# 56. Explicit Non-Goals / Out of Scope

Unless separately approved, do NOT implement:

```text
Cloud backend
Online leaderboard
User accounts
Email collection
SMS
CRM integration
Remote admin
Multi-PC synchronization
Analytics dashboard
Custom arcade firmware
Custom USB drivers
Mobile application
Prize inventory system
Online database
Convention registration system
Facial recognition
Camera integration
Payment functionality
```

This prevents scope creep.

---

# 57. Critical Engineering Rules for Codex / Claude

Treat these as non-negotiable:

**Rule 1:** Never use `setInterval` as the timing source of truth.

**Rule 2:** Capture `performance.now()` immediately when the button event arrives.

**Rule 3:** Rendering and timing calculations must remain separate.

**Rule 4:** Never compare elapsed time using `elapsed === 0.93`.

**Rule 5:** Win/near thresholds come from settings.

**Rule 6:** Ignore keyboard `event.repeat`.

**Rule 7:** Debounce physical input.

**Rule 8:** Use an explicit game state machine.

**Rule 9:** All assets must work offline.

**Rule 10:** Gameplay must survive optional feature failures.

**Rule 11:** Never expose technical timing/latency information to players.

**Rule 12:** Keep the 0.93 challenge visually dominant.

**Rule 13:** Do not copy outdated "Too High / Too Low / Mistrial / Runner Up" wording from the booth concept.

**Rule 14:** Support both portrait and landscape layouts until final TV orientation is confirmed.

**Rule 15:** Optimize for continuous convention operation, not just a browser demo.

---

# 58. Final Architecture

```text
                       PHYSICAL
                    ARCADE BUTTON
                          │
                          ▼
                    USB HID ENCODER
                          │
                          ▼
                    WINDOWS HID
                          │
                          ▼
                   INPUT MANAGER
                          │
                 performance.now()
                          │
                          ▼
                   ┌─────────────┐
                   │ GAME ENGINE │
                   └──────┬──────┘
                          │
          ┌───────────────┼──────────────┐
          │               │              │
          ▼               ▼              ▼
       TIMER           RESULT         SETTINGS
       ENGINE          ENGINE           STORE
          │               │              │
          │        ┌──────┼──────┐       │
          │        ▼      ▼      ▼       │
          │       WIN    NEAR   OTHER    │
          │        │                      │
          ▼        ▼                      ▼
      UI RENDER  CELEBRATION        LOCAL STORAGE
          │        │                      │
          │        ▼                      ▼
          │    OPTIONAL             WINNER STORE
          │    WINNER FORM                │
          │        │                      │
          └────────┴──────────┬───────────┘
                              │
                              ▼
                         IDLE SCREEN
                              │
                              ▼
                    WINNER ROTATION / 0.93
```

## Final implementation priority

Tell Codex/Claude to build this in this order:

1. **Game state machine + high-resolution timer**
2. **USB/keyboard input handling + debounce**
3. **Win/Near/Other result engine + automated boundary tests**
4. **Core portrait/landscape UI**
5. **Admin settings + persistent configuration**
6. **Win animation/audio**
7. **Optional winner capture + idle rotation**
8. **Electron kiosk/offline packaging**
9. **Hardware diagnostics**
10. **Endurance/offline/restart testing**

Don't start with confetti and UI polish. **The timer, input state machine, result boundaries, and physical-button behavior need to be correct first.** Once those are solid, polish the booth experience around them.

[1]: https://93secondtimergame.netlify.app/ "Acme Court Reporting | 9-3 Verdict Challenge"
