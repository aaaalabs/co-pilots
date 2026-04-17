# Co-Pilots — Plan 2: Core Simulation (offline) + Visual Retrofit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A solo-playable, host-side space shooter loop running on the existing co-pilots scaffold. Pilot can move and fire, drones spawn from the top of the screen, bullets and ship can collide with enemies, and the score updates in real time. The lobby and the new game screen are rebuilt in the dropster/snakey "neon CRT arcade" family aesthetic. Networking stays untouched (Plan 3).

**Architecture:** Pure-functional `GameState.update(dt, inputs)` runs at a 60Hz fixed timestep inside a `GameScreen` controller. The renderer is a thin Canvas-2D layer that reads state and draws via a single `drawCell`-style helper, matching the family rendering convention (solid `fillRect` + `shadowBlur` self-glow). The pilot ship is rendered as a cyan body with a magenta turret stub on top — this two-color signature visualises the asymmetric two-player concept even when only one player is present. The gunner is mechanically inert in this plan; Plan 3 wires up its input.

**Tech Stack:** Same as Plan 1 (Vite + TS + Vitest + Canvas 2D). New: Google Fonts (Orbitron + Rajdhani) loaded via `<link>` in `index.html`.

**Scope of this plan:**
- ✅ Visual retrofit: fonts, CSS palette, glitch title, animated grid backdrop, button styles — match dropster/snakey family DNA
- ✅ `game/constants.ts` with all gameplay tuning
- ✅ `game/Collision.ts` (TDD, pure helpers)
- ✅ `game/GameState.ts` types + pure `update(dt, inputs)` (TDD)
- ✅ `game/WaveSpawner.ts` — continuous drone spawning (TDD)
- ✅ `ui/Renderer.ts` — canvas drawing in family style
- ✅ `ui/KeyboardControls.ts` + `ui/InputAdapter.ts` — pilot inputs only
- ✅ `ui/GameScreen.ts` — game loop, replaces the Plan-1 placeholder
- ✅ `main.ts` wiring update
- ❌ NO bosses, NO powerups, NO multiple enemy types (Plan 4)
- ❌ NO networking, NO gunner input (Plan 3)
- ❌ NO sound (Plan 5)
- ❌ NO touch controls (Plan 5; keyboard-only is fine for desktop testing)
- ❌ NO sprites — the spec mentioned Kenney sprites, but the family aesthetic uses neon `fillRect` + `shadowBlur` exclusively. **This plan overrides the sprite decision in favour of visual consistency with dropster/snakey.**

---

## Family Visual DNA (reference for every task in this plan)

These are the canonical values copied verbatim from dropster (`tetris-battle/index.html`) and snakey:

```css
:root {
  --cyan: #00f0f0;
  --magenta: #ff00aa;
  --yellow: #ffff00;
  --dark: #050510;
  --darker: #020208;
  --surface: #0a0a1a;
  --surface-light: #12122a;
  --text-dim: #4a4a6a;
  --text-mid: #8888aa;
  --glow-cyan: 0 0 20px rgba(0, 240, 240, 0.3), 0 0 60px rgba(0, 240, 240, 0.1);
  --glow-magenta: 0 0 20px rgba(255, 0, 170, 0.3), 0 0 60px rgba(255, 0, 170, 0.1);
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
}
```

Fonts (loaded via Google Fonts in `index.html`):
- **Display**: Orbitron 400/700/900
- **Body**: Rajdhani 300/400/500/600/700

Canvas-render conventions:
- Solid `fillRect` for entities, NO sprites, NO per-pixel gradients
- Self-glow via `ctx.shadowBlur = 6–12; ctx.shadowColor = entityColor;`
- White highlight strip on top-left of every cell (`rgba(255,255,255,0.15)`, 2px wide/tall)
- Background: `hsla(260, 50%, 4%, 1)` indigo-near-black
- Grid lines: thin `hsla(260, 35%, 18%, 0.18)` strokes every 40px
- Score popup font: `bold 14px Orbitron, monospace`, color `--yellow`, `shadowBlur: 8`

UI conventions:
- Zero `border-radius` on buttons/inputs
- All labels `text-transform: uppercase` with `letter-spacing` 0.1em–0.3em
- Buttons in display font Orbitron 700
- Glitch-title on the main heading (cyan body + magenta `clip-path` slice)
- Page-load: `fadeInUp` 0.6s ease-out

**Co-Pilots-specific signature**: ship body cyan (`--cyan`), turret stub magenta (`--magenta`). The pilot's color is the body, the gunner's color is the turret. Always render both even when only the pilot is interactive — this is the visual identity of the game.

---

## File Structure (delta from Plan 1)

```
co-pilots/
  index.html                 # MODIFY — load Google Fonts
  src/
    main.ts                  # MODIFY — replace placeholder game screen with GameScreen
    game/                    # NEW
      constants.ts           # NEW — gameplay tuning
      Collision.ts           # NEW — circle-circle helpers
      GameState.ts           # NEW — types + pure update
      WaveSpawner.ts         # NEW — drone spawn schedule
    ui/
      styles.css             # MODIFY — full retrofit to family DNA
      LobbyScreen.ts         # MODIFY — rework HTML to use family class names
      Renderer.ts            # NEW — canvas drawing
      InputAdapter.ts        # NEW — abstract pilot input
      KeyboardControls.ts    # NEW — keyboard listener → InputAdapter
      GameScreen.ts          # NEW — game loop + DOM mount
  tests/
    Collision.test.ts        # NEW
    GameState.test.ts        # NEW
    WaveSpawner.test.ts      # NEW
```

After this plan: 7 source files in `src/game/` + `src/ui/` (excluding the existing `network/`), 4 test files.

---

## Task 1: Visual retrofit — fonts, CSS variables, lobby HTML

**Files:**
- Modify: `index.html` (add Google Fonts links)
- Modify: `src/ui/styles.css` (full rewrite to family DNA)
- Modify: `src/ui/LobbyScreen.ts` (rework HTML class names + remove inline styles that conflict)

This task contains zero gameplay code — purely visual. Any future task that touches the lobby UI inherits the family aesthetic from this commit.

- [ ] **Step 1: Add Google Fonts to `index.html`**

Modify `co-pilots/index.html` — add the preconnect + stylesheet links inside `<head>`, before the existing `<link rel="stylesheet" href="/src/ui/styles.css" />`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

Final `<head>` block should be:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Co-Pilots</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/ui/styles.css" />
</head>
```

- [ ] **Step 2: Replace `src/ui/styles.css` entirely**

Overwrite `co-pilots/src/ui/styles.css`:

```css
:root {
  --cyan: #00f0f0;
  --magenta: #ff00aa;
  --yellow: #ffff00;
  --dark: #050510;
  --darker: #020208;
  --surface: #0a0a1a;
  --surface-light: #12122a;
  --text-dim: #4a4a6a;
  --text-mid: #8888aa;
  --glow-cyan: 0 0 20px rgba(0, 240, 240, 0.3), 0 0 60px rgba(0, 240, 240, 0.1);
  --glow-magenta: 0 0 20px rgba(255, 0, 170, 0.3), 0 0 60px rgba(255, 0, 170, 0.1);
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--darker);
  color: #fff;
  font-family: var(--font-body);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    linear-gradient(var(--dark) 1px, transparent 1px),
    linear-gradient(90deg, var(--dark) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center center;
  opacity: 0.4;
  animation: gridPulse 8s ease-in-out infinite;
  pointer-events: none;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(0, 240, 240, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(255, 0, 170, 0.06) 0%, transparent 50%);
  pointer-events: none;
}

@keyframes gridPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

#app {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: min(640px, 100vw);
  padding: clamp(16px, 4vw, 32px);
}

/* ===== Lobby ===== */

.lobby {
  text-align: center;
  padding: clamp(24px, 6vw, 60px) clamp(16px, 4vw, 40px);
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes glitchFlicker {
  0%, 94%, 100% { opacity: 1; }
  95% { opacity: 0.8; transform: translateX(-2px); }
  96% { opacity: 1; transform: translateX(2px); }
  97% { opacity: 0.9; transform: translateX(0); }
}

@keyframes glitchSlice {
  0%, 90%, 100% { transform: translateX(0); }
  92% { transform: translateX(4px); }
  94% { transform: translateX(-3px); }
  96% { transform: translateX(0); }
}

.lobby-title {
  font-family: var(--font-display);
  font-size: clamp(32px, 8vw, 52px);
  font-weight: 900;
  letter-spacing: 0.15em;
  color: var(--cyan);
  text-shadow: var(--glow-cyan);
  margin-bottom: 4px;
  animation: glitchFlicker 6s ease-in-out infinite;
  position: relative;
  display: inline-block;
}

.lobby-title::after {
  content: 'CO-PILOTS';
  position: absolute;
  inset: 0;
  color: var(--magenta);
  text-shadow: var(--glow-magenta);
  clip-path: polygon(0 60%, 100% 60%, 100% 65%, 0 65%);
  animation: glitchSlice 4s ease-in-out infinite;
  pointer-events: none;
}

.lobby-subtitle {
  font-family: var(--font-body);
  font-size: clamp(13px, 3vw, 16px);
  font-weight: 300;
  color: var(--text-dim);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-bottom: clamp(24px, 6vw, 40px);
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(320px, 85vw);
  margin: 0 auto;
}

.lobby-row {
  display: flex;
  gap: 8px;
}

.lobby-row > * {
  flex: 1;
}

.lobby-btn {
  padding: 14px 20px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  background: var(--surface);
  color: var(--text-mid);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.lobby-btn:hover:not(:disabled) {
  background: var(--surface-light);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.lobby-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.lobby-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.lobby-btn.primary {
  background: var(--cyan);
  color: var(--darker);
  box-shadow: var(--glow-cyan);
  border: none;
}

.lobby-btn.primary:hover:not(:disabled) {
  background: #5ffefe;
}

.lobby-btn.selected {
  background: var(--magenta);
  color: #fff;
  border: none;
  box-shadow: var(--glow-magenta);
}

.lobby-input {
  padding: 14px 20px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5em;
  text-align: center;
  text-transform: uppercase;
  background: var(--surface);
  color: var(--cyan);
  border: 1px solid rgba(0, 240, 240, 0.2);
  outline: none;
  transition: border-color 0.2s ease;
}

.lobby-input:focus {
  border-color: var(--cyan);
}

.lobby-input.name-input {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: normal;
  color: #fff;
  text-transform: none;
  text-align: center;
}

.lobby-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  text-align: left;
  margin-top: 8px;
}

.lobby-code {
  font-family: var(--font-display);
  font-size: clamp(36px, 9vw, 56px);
  font-weight: 900;
  letter-spacing: 0.5em;
  color: var(--cyan);
  text-shadow: var(--glow-cyan);
  padding: 24px 16px 24px 32px;
  background: var(--surface);
  border: 1px solid rgba(0, 240, 240, 0.3);
  animation: codePulse 2s ease-in-out infinite;
}

@keyframes codePulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 240, 0.2); }
  50% { box-shadow: 0 0 40px rgba(0, 240, 240, 0.4); }
}

.lobby-status {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-mid);
  min-height: 20px;
  margin-top: 8px;
}

/* ===== GameScreen ===== */

.game-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: fadeInUp 0.4s ease-out;
}

.game-canvas {
  display: block;
  background: #020208;
  border: 1px solid rgba(0, 240, 240, 0.15);
  box-shadow: 0 0 40px rgba(0, 240, 240, 0.05);
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.game-hud {
  display: flex;
  gap: 24px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.hud-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-value {
  font-size: 18px;
  font-weight: 900;
  color: var(--cyan);
  text-shadow: 0 0 8px rgba(0, 240, 240, 0.5);
  font-variant-numeric: tabular-nums;
}

.hud-value.danger {
  color: var(--magenta);
  text-shadow: 0 0 8px rgba(255, 0, 170, 0.5);
}
```

- [ ] **Step 3: Rework `LobbyScreen.ts` HTML to use new class names**

Replace the three render methods in `co-pilots/src/ui/LobbyScreen.ts` so the class names match the new CSS. Read the file first; only the `renderInitial`, `renderHosting`, and `renderJoined` methods change. The rest of the file (state, callbacks, handlers) is untouched.

Replace `renderInitial` with:

```ts
private renderInitial(): void {
  this.container.innerHTML = `
    <div class="lobby">
      <h1 class="lobby-title">CO-PILOTS</h1>
      <p class="lobby-subtitle">Two players, one ship</p>
      <div class="lobby-actions">
        <button class="lobby-btn primary" id="create-btn">Create Room</button>
        <p class="lobby-subtitle" style="margin: 4px 0;">— or —</p>
        <input class="lobby-input" id="code-input" placeholder="ABCD" maxlength="4" autocapitalize="characters" />
        <button class="lobby-btn" id="join-btn">Join Room</button>
        <p class="lobby-status">${escapeHtml(this.statusMessage)}</p>
      </div>
    </div>
  `;
  this.container.querySelector("#create-btn")!
    .addEventListener("click", () => this.handleCreateClick());
  this.container.querySelector("#join-btn")!
    .addEventListener("click", () => this.handleJoinClick());
}
```

Replace `renderHosting` with:

```ts
private renderHosting(): void {
  this.container.innerHTML = `
    <div class="lobby">
      <h1 class="lobby-title">CO-PILOTS</h1>
      <p class="lobby-subtitle">Share this code</p>
      <div class="lobby-actions">
        <div class="lobby-code">${escapeHtml(this.roomCode)}</div>
        <p class="lobby-status">${escapeHtml(this.statusMessage || "Waiting for co-pilot...")}</p>
      </div>
    </div>
  `;
}
```

Replace `renderJoined` with:

```ts
private renderJoined(): void {
  const { role, difficulty, playerName } = this.settings;
  this.container.innerHTML = `
    <div class="lobby">
      <h1 class="lobby-title">CO-PILOTS</h1>
      <p class="lobby-subtitle">Choose your station</p>
      <div class="lobby-actions">
        <label class="lobby-label">Your name</label>
        <input class="lobby-input name-input" id="name-input" value="${escapeHtml(playerName)}" placeholder="Name" maxlength="12" />
        <label class="lobby-label">Your role</label>
        <div class="lobby-row">
          <button class="lobby-btn ${role === "pilot" ? "selected" : ""}" data-role="pilot">🚀 Pilot</button>
          <button class="lobby-btn ${role === "gunner" ? "selected" : ""}" data-role="gunner">🎯 Gunner</button>
        </div>
        ${this.isHost ? `
          <label class="lobby-label">Difficulty</label>
          <div class="lobby-row">
            <button class="lobby-btn ${difficulty === "easy" ? "selected" : ""}" data-diff="easy">Easy</button>
            <button class="lobby-btn ${difficulty === "normal" ? "selected" : ""}" data-diff="normal">Normal</button>
            <button class="lobby-btn ${difficulty === "hard" ? "selected" : ""}" data-diff="hard">Hard</button>
          </div>
        ` : ""}
        <button class="lobby-btn primary" id="start-btn" ${!this.isHost || !this.peerReady ? "disabled" : ""}>
          ${this.isHost ? "Start Game" : "Waiting for host..."}
        </button>
        <p class="lobby-status">${escapeHtml(this.statusMessage)}</p>
      </div>
    </div>
  `;

  const nameInput = this.container.querySelector<HTMLInputElement>("#name-input")!;
  nameInput.addEventListener("input", () => this.handleNameChange(nameInput.value));

  this.container.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(btn => {
    btn.addEventListener("click", () => this.handleRoleClick(btn.dataset.role as Role));
  });

  if (this.isHost) {
    this.container.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach(btn => {
      btn.addEventListener("click", () => this.handleDiffClick(btn.dataset.diff as Difficulty));
    });
    this.container.querySelector("#start-btn")!
      .addEventListener("click", () => this.handleStartClick());
  }
}
```

Note: in the new selector, role buttons are queried by `[data-role]` instead of `.role-btn`, and difficulty buttons by `[data-diff]` instead of `.diff-btn`. This is because the new CSS uses `.lobby-btn` as the base class and `.selected` as the state — there is no separate `role-btn` / `diff-btn` class. The data attributes are the unique selector.

- [ ] **Step 4: Update the placeholder game screen in `main.ts` to match the family aesthetic**

The Plan-1 placeholder game screen still uses old class names. Replace `handleGameStart` in `co-pilots/src/main.ts` with:

```ts
function handleGameStart(difficulty: Difficulty): void {
  // PLACEHOLDER — replaced by GameScreen in Task 9 of this plan
  lobby?.destroy();
  lobby = null;
  app.innerHTML = `
    <div class="lobby">
      <h1 class="lobby-title">CO-PILOTS</h1>
      <p class="lobby-subtitle">Game starting — placeholder</p>
      <div class="lobby-actions">
        <p class="lobby-status">Role: ${escapeHtml(localSettings.role)} · Difficulty: ${escapeHtml(difficulty)}</p>
        <button id="back-btn" class="lobby-btn primary">Back to Lobby</button>
      </div>
    </div>
  `;
  app.querySelector("#back-btn")!.addEventListener("click", () => showLobby());
}
```

Add an `escapeHtml` helper at the bottom of `main.ts`:

```ts
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
```

Task 9 will replace this placeholder entirely with the real GameScreen — but keep it correct in the meantime so the visual smoke test in Step 6 of this task works.

- [ ] **Step 5: Run typecheck + tests + build**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
npm run typecheck && npm test && npm run build
```

Expected: typecheck exit 0, 7 tests pass, build produces `dist/`.

- [ ] **Step 6: Manual visual smoke test**

Ask the user to run `npm run dev` and visit http://localhost:5173. Verify:
1. Page background is `#020208` near-black with a faint animated grid
2. Title "CO-PILOTS" is in Orbitron, cyan, with a subtle magenta glitch slice
3. "Create Room" button is solid cyan with a glow
4. Code input and "Join Room" button match the dropster style (sharp corners, uppercase, letterspaced)
5. After joining, role/difficulty buttons highlight magenta when selected
6. Placeholder game screen also uses the family style

If anything looks off, fix it before committing.

- [ ] **Step 7: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add index.html src/ui/styles.css src/ui/LobbyScreen.ts src/main.ts
git commit -m "feat(ui): retrofit lobby to dropster/snakey neon family aesthetic [CP01]"
```

---

## Task 2: Game constants

**Files:**
- Create: `co-pilots/src/game/constants.ts`

This file holds all gameplay tuning. Every other game module imports from here.

- [ ] **Step 1: Create the file**

Write `co-pilots/src/game/constants.ts`:

```ts
// Gameplay tuning. Every magic number lives here.
// Coordinate system: 0,0 = top-left of playfield. Y grows downward.

export const PLAYFIELD = {
  width: 480,
  height: 720,
} as const;

export const SHIP = {
  startX: PLAYFIELD.width / 2,
  startY: PLAYFIELD.height - 80,
  radius: 14,            // collision radius
  bodyWidth: 22,         // visual half-width (cyan body rect)
  bodyHeight: 24,
  turretWidth: 8,        // visual magenta turret stub
  turretHeight: 12,
  speed: 220,            // pixels per second
  maxHp: 100,
  fireCooldown: 0.18,    // seconds between shots
} as const;

export const BULLET = {
  pilotSpeed: 540,       // pixels per second, upward
  pilotWidth: 4,
  pilotHeight: 12,
  pilotDamage: 25,
  radius: 4,             // collision radius (treated as circle)
  maxLifetime: 2.0,      // seconds before despawn
} as const;

export const ENEMY_DRONE = {
  width: 22,
  height: 22,
  radius: 12,
  speed: 90,             // pixels per second, downward
  maxHp: 25,
  contactDamage: 15,     // damage to ship on collision
  scoreValue: 10,
} as const;

export const WAVE = {
  spawnInterval: 1.4,    // seconds between drone spawns in wave 1
  spawnEdgeMargin: 32,   // px from playfield edges
} as const;

// Family palette (subset used by Renderer)
export const COLORS = {
  bg: "#020208",
  gridLine: "hsla(260, 35%, 18%, 0.18)",
  cyan: "#00f0f0",
  magenta: "#ff00aa",
  yellow: "#ffff00",
  textDim: "#4a4a6a",
  textMid: "#8888aa",
  white: "#ffffff",
} as const;
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck
```

Expected: PASS (this file has no consumers yet, so it just needs to parse).

- [ ] **Step 3: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/constants.ts
git commit -m "feat(game): add gameplay constants [CP01][NS01]"
```

---

## Task 3: Collision helpers (TDD)

**Files:**
- Create: `co-pilots/src/game/Collision.ts`
- Create: `co-pilots/tests/Collision.test.ts`

Pure functions, easily TDD-able.

- [ ] **Step 1: Write the failing tests first**

Write `co-pilots/tests/Collision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { circlesOverlap, pointInCircle } from "../src/game/Collision";

describe("Collision", () => {
  describe("circlesOverlap", () => {
    it("returns true for overlapping circles", () => {
      expect(circlesOverlap(0, 0, 10, 5, 0, 10)).toBe(true);
    });

    it("returns false for non-overlapping circles", () => {
      expect(circlesOverlap(0, 0, 5, 100, 100, 5)).toBe(false);
    });

    it("returns true for touching circles (edge case)", () => {
      // distance = 10, sum of radii = 10
      expect(circlesOverlap(0, 0, 5, 10, 0, 5)).toBe(true);
    });

    it("returns true for one circle fully inside another", () => {
      expect(circlesOverlap(0, 0, 20, 1, 1, 2)).toBe(true);
    });

    it("returns false for circles just barely apart", () => {
      // distance = 10.01, sum of radii = 10
      expect(circlesOverlap(0, 0, 5, 10.01, 0, 5)).toBe(false);
    });
  });

  describe("pointInCircle", () => {
    it("returns true for a point inside the circle", () => {
      expect(pointInCircle(1, 1, 0, 0, 5)).toBe(true);
    });

    it("returns false for a point outside the circle", () => {
      expect(pointInCircle(10, 10, 0, 0, 5)).toBe(false);
    });

    it("returns true for a point exactly on the circle edge", () => {
      expect(pointInCircle(5, 0, 0, 0, 5)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the tests, observe the failure**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Collision
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `Collision.ts`**

Write `co-pilots/src/game/Collision.ts`:

```ts
// Pure collision helpers. No state, no side effects.

export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const sumR = ar + br;
  return distSq <= sumR * sumR;
}

export function pointInCircle(
  px: number, py: number,
  cx: number, cy: number, cr: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= cr * cr;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Collision
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/Collision.ts tests/Collision.test.ts
git commit -m "feat(game): add Collision helpers [CP01][NS01]"
```

---

## Task 4: GameState core (types + ship/bullet update) — TDD

**Files:**
- Create: `co-pilots/src/game/GameState.ts`
- Create: `co-pilots/tests/GameState.test.ts`

This task introduces the simulation skeleton. Enemies are added in Task 5, collision wiring in Task 6.

- [ ] **Step 1: Write the failing tests first**

Write `co-pilots/tests/GameState.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createInitialState, updateGameState, PilotInput } from "../src/game/GameState";
import { SHIP, PLAYFIELD, BULLET } from "../src/game/constants";

const NO_INPUT: PilotInput = { moveX: 0, moveY: 0, fire: false };

describe("GameState", () => {
  describe("createInitialState", () => {
    it("places the ship at the configured start position", () => {
      const s = createInitialState();
      expect(s.ship.x).toBe(SHIP.startX);
      expect(s.ship.y).toBe(SHIP.startY);
      expect(s.ship.hp).toBe(SHIP.maxHp);
    });

    it("starts with zero bullets and zero score", () => {
      const s = createInitialState();
      expect(s.bullets).toHaveLength(0);
      expect(s.score).toBe(0);
    });

    it("starts not game-over", () => {
      const s = createInitialState();
      expect(s.gameOver).toBe(false);
    });
  });

  describe("updateGameState — ship movement", () => {
    it("moves the ship right when moveX = 1", () => {
      const s = createInitialState();
      const dt = 0.5;
      const next = updateGameState(s, dt, { moveX: 1, moveY: 0, fire: false });
      expect(next.ship.x).toBeCloseTo(SHIP.startX + SHIP.speed * dt);
    });

    it("clamps the ship to the playfield bounds (left edge)", () => {
      const s = createInitialState();
      s.ship.x = 0;
      const next = updateGameState(s, 1, { moveX: -1, moveY: 0, fire: false });
      expect(next.ship.x).toBeGreaterThanOrEqual(SHIP.bodyWidth / 2);
    });

    it("clamps the ship to the playfield bounds (right edge)", () => {
      const s = createInitialState();
      s.ship.x = PLAYFIELD.width;
      const next = updateGameState(s, 1, { moveX: 1, moveY: 0, fire: false });
      expect(next.ship.x).toBeLessThanOrEqual(PLAYFIELD.width - SHIP.bodyWidth / 2);
    });

    it("normalises diagonal movement so it isn't faster than straight", () => {
      const s = createInitialState();
      const dt = 1;
      const next = updateGameState(s, dt, { moveX: 1, moveY: -1, fire: false });
      const dx = next.ship.x - SHIP.startX;
      const dy = next.ship.y - SHIP.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeCloseTo(SHIP.speed * dt, 1);
    });
  });

  describe("updateGameState — firing", () => {
    it("spawns a bullet on fire when cooldown is ready", () => {
      const s = createInitialState();
      const next = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      expect(next.bullets).toHaveLength(1);
      expect(next.bullets[0].vy).toBeLessThan(0);
    });

    it("respects the fire cooldown", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      // Immediately try again — cooldown should block
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      expect(s.bullets).toHaveLength(1);
    });

    it("can fire again after cooldown elapses", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      // Advance time past cooldown
      s = updateGameState(s, SHIP.fireCooldown + 0.01, { moveX: 0, moveY: 0, fire: false });
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      expect(s.bullets).toHaveLength(2);
    });

    it("bullets despawn after maxLifetime", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      expect(s.bullets).toHaveLength(1);
      // Advance well beyond bullet lifetime
      s = updateGameState(s, BULLET.maxLifetime + 0.5, NO_INPUT);
      expect(s.bullets).toHaveLength(0);
    });

    it("bullets travel upward with the configured speed", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true });
      const startY = s.bullets[0].y;
      s = updateGameState(s, 0.5, NO_INPUT);
      expect(s.bullets[0].y).toBeCloseTo(startY - BULLET.pilotSpeed * 0.5, 1);
    });
  });
});
```

- [ ] **Step 2: Run tests, observe failures**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- GameState
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GameState.ts`**

Write `co-pilots/src/game/GameState.ts`:

```ts
import { SHIP, BULLET, PLAYFIELD } from "./constants";

export type PilotInput = {
  moveX: number;   // -1, 0, 1
  moveY: number;   // -1, 0, 1
  fire: boolean;
};

export type Ship = {
  x: number;
  y: number;
  hp: number;
  fireCooldown: number;  // remaining cooldown in seconds
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  vy: number;
  life: number;          // seconds remaining
};

export type GameState = {
  ship: Ship;
  bullets: Bullet[];
  enemies: Enemy[];      // populated in Task 5
  score: number;
  gameOver: boolean;
  nextBulletId: number;
  nextEnemyId: number;
};

// Forward-declared for Task 5; empty for Task 4.
export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
};

export function createInitialState(): GameState {
  return {
    ship: {
      x: SHIP.startX,
      y: SHIP.startY,
      hp: SHIP.maxHp,
      fireCooldown: 0,
    },
    bullets: [],
    enemies: [],
    score: 0,
    gameOver: false,
    nextBulletId: 1,
    nextEnemyId: 1,
  };
}

export function updateGameState(
  state: GameState,
  dt: number,
  input: PilotInput,
): GameState {
  if (state.gameOver) return state;

  // Ship movement (normalised, clamped)
  const { ship } = state;
  let mx = input.moveX;
  let my = input.moveY;
  const mag = Math.sqrt(mx * mx + my * my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }
  ship.x = clamp(
    ship.x + mx * SHIP.speed * dt,
    SHIP.bodyWidth / 2,
    PLAYFIELD.width - SHIP.bodyWidth / 2,
  );
  ship.y = clamp(
    ship.y + my * SHIP.speed * dt,
    SHIP.bodyHeight / 2,
    PLAYFIELD.height - SHIP.bodyHeight / 2,
  );

  // Cooldown tick
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);

  // Fire
  if (input.fire && ship.fireCooldown <= 0) {
    state.bullets.push({
      id: state.nextBulletId++,
      x: ship.x,
      y: ship.y - SHIP.bodyHeight / 2,
      vy: -BULLET.pilotSpeed,
      life: BULLET.maxLifetime,
    });
    ship.fireCooldown = SHIP.fireCooldown;
  }

  // Bullet step + lifetime decay
  for (const b of state.bullets) {
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter(
    b => b.life > 0 && b.y > -BULLET.pilotHeight,
  );

  return state;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
```

Note: this update function MUTATES `state` in place and returns the same reference. This is intentional for [CP01] — copying the state every frame is needless GC pressure for a 60Hz game loop. The caller treats the return value as the same object.

- [ ] **Step 4: Run tests, verify all pass**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- GameState
```

Expected: PASS — all 11 tests green.

- [ ] **Step 5: Run all tests + typecheck**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, all tests pass (smoke + Protocol + Collision + GameState).

- [ ] **Step 6: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/GameState.ts tests/GameState.test.ts
git commit -m "feat(game): GameState core with ship movement and bullet firing [CP01][NS01]"
```

---

## Task 5: WaveSpawner (TDD)

**Files:**
- Create: `co-pilots/src/game/WaveSpawner.ts`
- Create: `co-pilots/tests/WaveSpawner.test.ts`

For Plan 2 the spawner just continuously emits drones at fixed intervals across the top edge. Real wave structure (wave numbers, bosses) comes in Plan 4.

- [ ] **Step 1: Write the failing tests first**

Write `co-pilots/tests/WaveSpawner.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWaveSpawner, tickWaveSpawner } from "../src/game/WaveSpawner";
import { createInitialState } from "../src/game/GameState";
import { WAVE, ENEMY_DRONE, PLAYFIELD } from "../src/game/constants";

describe("WaveSpawner", () => {
  it("spawns no enemies before the first interval elapses", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, WAVE.spawnInterval - 0.01);
    expect(state.enemies).toHaveLength(0);
  });

  it("spawns one drone after exactly one interval", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, WAVE.spawnInterval);
    expect(state.enemies).toHaveLength(1);
  });

  it("spawns drones at the top of the playfield", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, WAVE.spawnInterval);
    const e = state.enemies[0];
    expect(e.y).toBeLessThan(0); // spawn above top edge
  });

  it("spawns drones within the playfield horizontal bounds", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    // Tick many times to catch random variation
    for (let i = 0; i < 50; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval);
    }
    for (const e of state.enemies) {
      expect(e.x).toBeGreaterThanOrEqual(WAVE.spawnEdgeMargin);
      expect(e.x).toBeLessThanOrEqual(PLAYFIELD.width - WAVE.spawnEdgeMargin);
    }
  });

  it("spawned drones start with full HP", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, WAVE.spawnInterval);
    expect(state.enemies[0].hp).toBe(ENEMY_DRONE.maxHp);
  });

  it("assigns unique ids to spawned drones", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    for (let i = 0; i < 5; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval);
    }
    const ids = state.enemies.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests, observe failures**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- WaveSpawner
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `WaveSpawner.ts`**

Write `co-pilots/src/game/WaveSpawner.ts`:

```ts
import { GameState } from "./GameState";
import { WAVE, ENEMY_DRONE, PLAYFIELD } from "./constants";

export type WaveSpawner = {
  spawnTimer: number;  // seconds until next spawn
};

export function createWaveSpawner(): WaveSpawner {
  return { spawnTimer: WAVE.spawnInterval };
}

export function tickWaveSpawner(
  spawner: WaveSpawner,
  state: GameState,
  dt: number,
): void {
  spawner.spawnTimer -= dt;
  while (spawner.spawnTimer <= 0) {
    spawnDrone(state);
    spawner.spawnTimer += WAVE.spawnInterval;
  }
}

function spawnDrone(state: GameState): void {
  const minX = WAVE.spawnEdgeMargin;
  const maxX = PLAYFIELD.width - WAVE.spawnEdgeMargin;
  const x = minX + Math.random() * (maxX - minX);
  state.enemies.push({
    id: state.nextEnemyId++,
    x,
    y: -ENEMY_DRONE.height,
    hp: ENEMY_DRONE.maxHp,
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- WaveSpawner
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/WaveSpawner.ts tests/WaveSpawner.test.ts
git commit -m "feat(game): WaveSpawner emits drones at fixed interval [CP01]"
```

---

## Task 6: Enemy update + collisions wired into GameState (TDD)

**Files:**
- Modify: `co-pilots/src/game/GameState.ts`
- Modify: `co-pilots/tests/GameState.test.ts`

This task adds the missing pieces to `updateGameState`: drone downward movement, bullet-vs-enemy collision (enemy dies, score goes up), and enemy-vs-ship collision (ship loses HP, enemy dies, game over when HP hits zero).

- [ ] **Step 1: Add the new tests**

Append to `co-pilots/tests/GameState.test.ts` (inside the top-level `describe("GameState", ...)`, after the existing nested describes):

```ts
  describe("updateGameState — enemies", () => {
    it("moves drones downward over time", () => {
      const s = createInitialState();
      s.enemies.push({ id: 1, x: 100, y: 50, hp: 25 });
      s.nextEnemyId = 2;
      const next = updateGameState(s, 1, NO_INPUT);
      expect(next.enemies[0].y).toBeCloseTo(50 + ENEMY_DRONE.speed);
    });

    it("removes drones that fall off the bottom of the playfield", () => {
      const s = createInitialState();
      s.enemies.push({ id: 1, x: 100, y: PLAYFIELD.height + 50, hp: 25 });
      s.nextEnemyId = 2;
      const next = updateGameState(s, 0.016, NO_INPUT);
      expect(next.enemies).toHaveLength(0);
    });
  });

  describe("updateGameState — collisions", () => {
    it("destroys an enemy hit by a pilot bullet and adds score", () => {
      const s = createInitialState();
      s.enemies.push({ id: 1, x: 100, y: 100, hp: 25 });
      s.bullets.push({ id: 1, x: 100, y: 100, vy: -BULLET.pilotSpeed, life: 1 });
      s.nextEnemyId = 2;
      s.nextBulletId = 2;
      const next = updateGameState(s, 0.016, NO_INPUT);
      expect(next.enemies).toHaveLength(0);
      expect(next.bullets).toHaveLength(0);
      expect(next.score).toBe(ENEMY_DRONE.scoreValue);
    });

    it("damages the ship on enemy contact and removes the enemy", () => {
      const s = createInitialState();
      s.enemies.push({ id: 1, x: s.ship.x, y: s.ship.y, hp: 25 });
      s.nextEnemyId = 2;
      const next = updateGameState(s, 0.016, NO_INPUT);
      expect(next.enemies).toHaveLength(0);
      expect(next.ship.hp).toBe(SHIP.maxHp - ENEMY_DRONE.contactDamage);
    });

    it("triggers game over when ship HP reaches zero", () => {
      const s = createInitialState();
      s.ship.hp = ENEMY_DRONE.contactDamage; // one hit will kill
      s.enemies.push({ id: 1, x: s.ship.x, y: s.ship.y, hp: 25 });
      s.nextEnemyId = 2;
      const next = updateGameState(s, 0.016, NO_INPUT);
      expect(next.ship.hp).toBe(0);
      expect(next.gameOver).toBe(true);
    });
  });
```

Also add this import line to the top of the test file (replace the existing `BULLET` import line):

```ts
import { SHIP, PLAYFIELD, BULLET, ENEMY_DRONE } from "../src/game/constants";
```

- [ ] **Step 2: Run the new tests, observe failures**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- GameState
```

Expected: FAIL — the new "enemies" and "collisions" describes fail because `updateGameState` doesn't move enemies or detect collisions yet.

- [ ] **Step 3: Update `GameState.ts` to handle enemies + collisions**

Modify `co-pilots/src/game/GameState.ts`. Replace the existing `import` block with:

```ts
import { SHIP, BULLET, PLAYFIELD, ENEMY_DRONE } from "./constants";
import { circlesOverlap } from "./Collision";
```

Then add this code to `updateGameState` AFTER the bullet lifecycle filter and BEFORE the `return state` line:

```ts
  // Enemy step (drones fall straight down)
  for (const e of state.enemies) {
    e.y += ENEMY_DRONE.speed * dt;
  }
  // Cull off-screen drones
  state.enemies = state.enemies.filter(e => e.y < PLAYFIELD.height + ENEMY_DRONE.height);

  // Bullet vs enemy
  for (const e of state.enemies) {
    for (const b of state.bullets) {
      if (circlesOverlap(b.x, b.y, BULLET.radius, e.x, e.y, ENEMY_DRONE.radius)) {
        e.hp -= BULLET.pilotDamage;
        b.life = 0; // mark bullet for removal next frame
        if (e.hp <= 0) {
          state.score += ENEMY_DRONE.scoreValue;
          break; // this enemy is dead, no more bullets need to check it
        }
      }
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.bullets = state.bullets.filter(b => b.life > 0);

  // Enemy vs ship
  for (const e of state.enemies) {
    if (circlesOverlap(state.ship.x, state.ship.y, SHIP.radius, e.x, e.y, ENEMY_DRONE.radius)) {
      state.ship.hp = Math.max(0, state.ship.hp - ENEMY_DRONE.contactDamage);
      e.hp = 0;
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);

  if (state.ship.hp <= 0) {
    state.gameOver = true;
  }
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test
```

Expected: PASS — smoke + Protocol + Collision + 16 GameState tests + 6 WaveSpawner tests.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/GameState.ts tests/GameState.test.ts
git commit -m "feat(game): enemy movement and collision resolution [CP01]"
```

---

## Task 7: Renderer

**Files:**
- Create: `co-pilots/src/ui/Renderer.ts`

No tests — canvas rendering is verified manually in Task 10. The renderer reads `GameState` and draws to a canvas; it holds zero state of its own beyond the canvas reference.

- [ ] **Step 1: Write `Renderer.ts`**

Write `co-pilots/src/ui/Renderer.ts`:

```ts
import { GameState } from "../game/GameState";
import { COLORS, PLAYFIELD, SHIP, BULLET, ENEMY_DRONE } from "../game/constants";

const GRID_SIZE = 40;

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  draw(state: GameState): void {
    this.clear();
    this.drawGrid();
    this.drawBullets(state);
    this.drawEnemies(state);
    this.drawShip(state);
    if (state.gameOver) {
      this.drawGameOver();
    }
  }

  private clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= PLAYFIELD.width; x += GRID_SIZE) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, PLAYFIELD.height);
    }
    for (let y = 0; y <= PLAYFIELD.height; y += GRID_SIZE) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(PLAYFIELD.width, y + 0.5);
    }
    ctx.stroke();
  }

  private drawShip(state: GameState): void {
    const { x, y } = state.ship;
    // Cyan body
    this.drawCell(
      x - SHIP.bodyWidth / 2,
      y - SHIP.bodyHeight / 2,
      SHIP.bodyWidth,
      SHIP.bodyHeight,
      COLORS.cyan,
      10,
    );
    // Magenta turret stub on top of the body (visualises the gunner role)
    this.drawCell(
      x - SHIP.turretWidth / 2,
      y - SHIP.bodyHeight / 2 - SHIP.turretHeight,
      SHIP.turretWidth,
      SHIP.turretHeight,
      COLORS.magenta,
      8,
    );
  }

  private drawBullets(state: GameState): void {
    for (const b of state.bullets) {
      this.drawCell(
        b.x - BULLET.pilotWidth / 2,
        b.y - BULLET.pilotHeight / 2,
        BULLET.pilotWidth,
        BULLET.pilotHeight,
        COLORS.cyan,
        6,
      );
    }
  }

  private drawEnemies(state: GameState): void {
    for (const e of state.enemies) {
      this.drawCell(
        e.x - ENEMY_DRONE.width / 2,
        e.y - ENEMY_DRONE.height / 2,
        ENEMY_DRONE.width,
        ENEMY_DRONE.height,
        COLORS.magenta,
        10,
      );
    }
  }

  private drawGameOver(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, PLAYFIELD.width, PLAYFIELD.height);

    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.magenta;
    ctx.fillStyle = COLORS.magenta;
    ctx.font = "bold 32px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", PLAYFIELD.width / 2, PLAYFIELD.height / 2);
    ctx.shadowBlur = 0;
  }

  // Family canonical drawCell — solid fillRect + self-glow + top-left highlight strip.
  private drawCell(x: number, y: number, w: number, h: number, color: string, glow: number): void {
    const ctx = this.ctx;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
  }
}
```

- [ ] **Step 2: Run typecheck + tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean (Renderer.ts only references existing exports), all tests still pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/Renderer.ts
git commit -m "feat(ui): Renderer with neon family aesthetic [CP01][CS05]"
```

---

## Task 8: Keyboard input

**Files:**
- Create: `co-pilots/src/ui/InputAdapter.ts`
- Create: `co-pilots/src/ui/KeyboardControls.ts`

`InputAdapter` is the abstract interface (so Plan 5 can plug in touch); `KeyboardControls` is the desktop implementation that listens on `window` and exposes the current `PilotInput`.

- [ ] **Step 1: Write `InputAdapter.ts`**

Write `co-pilots/src/ui/InputAdapter.ts`:

```ts
import { PilotInput } from "../game/GameState";

export interface InputAdapter {
  getPilotInput(): PilotInput;
  destroy(): void;
}
```

- [ ] **Step 2: Write `KeyboardControls.ts`**

Write `co-pilots/src/ui/KeyboardControls.ts`:

```ts
import { InputAdapter } from "./InputAdapter";
import { PilotInput } from "../game/GameState";

const KEYS_LEFT = new Set(["ArrowLeft", "KeyA"]);
const KEYS_RIGHT = new Set(["ArrowRight", "KeyD"]);
const KEYS_UP = new Set(["ArrowUp", "KeyW"]);
const KEYS_DOWN = new Set(["ArrowDown", "KeyS"]);
const KEYS_FIRE = new Set(["Space"]);

export class KeyboardControls implements InputAdapter {
  private pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  getPilotInput(): PilotInput {
    let moveX = 0;
    let moveY = 0;
    if (this.anyPressed(KEYS_LEFT)) moveX -= 1;
    if (this.anyPressed(KEYS_RIGHT)) moveX += 1;
    if (this.anyPressed(KEYS_UP)) moveY -= 1;
    if (this.anyPressed(KEYS_DOWN)) moveY += 1;
    const fire = this.anyPressed(KEYS_FIRE);
    return { moveX, moveY, fire };
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.pressed.clear();
  }

  private anyPressed(set: Set<string>): boolean {
    for (const code of set) {
      if (this.pressed.has(code)) return true;
    }
    return false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.pressed.add(e.code);
    // Prevent space-scrolling and arrow-scrolling
    if (KEYS_FIRE.has(e.code) || KEYS_LEFT.has(e.code) || KEYS_RIGHT.has(e.code) || KEYS_UP.has(e.code) || KEYS_DOWN.has(e.code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  private handleBlur = (): void => {
    this.pressed.clear();
  };
}
```

- [ ] **Step 3: Run typecheck + tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, all tests still pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/InputAdapter.ts src/ui/KeyboardControls.ts
git commit -m "feat(ui): InputAdapter interface and KeyboardControls [NS02]"
```

---

## Task 9: GameScreen + main.ts wiring

**Files:**
- Create: `co-pilots/src/ui/GameScreen.ts`
- Modify: `co-pilots/src/main.ts`

`GameScreen` owns the canvas, the `Renderer`, the `KeyboardControls`, the `GameState`, and the `WaveSpawner`. It runs a 60Hz fixed-timestep loop using `requestAnimationFrame`. The HUD (HP, score) is plain DOM next to the canvas, rendered via `innerHTML` updates each frame.

- [ ] **Step 1: Write `GameScreen.ts`**

Write `co-pilots/src/ui/GameScreen.ts`:

```ts
import { createInitialState, updateGameState, GameState } from "../game/GameState";
import { createWaveSpawner, tickWaveSpawner, WaveSpawner } from "../game/WaveSpawner";
import { PLAYFIELD, SHIP } from "../game/constants";
import { Renderer } from "./Renderer";
import { KeyboardControls } from "./KeyboardControls";
import { InputAdapter } from "./InputAdapter";

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1; // clamp to avoid huge catch-up after a tab pause

export interface GameScreenCallbacks {
  onExit: () => void;
}

export class GameScreen {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputAdapter;
  private state: GameState;
  private spawner: WaveSpawner;
  private rafId: number | null = null;
  private lastFrameMs = 0;
  private accumulator = 0;
  private hudEl: HTMLDivElement;
  private callbacks: GameScreenCallbacks;

  constructor(parent: HTMLElement, callbacks: GameScreenCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.className = "game-screen";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";
    this.canvas.width = PLAYFIELD.width;
    this.canvas.height = PLAYFIELD.height;

    this.hudEl = document.createElement("div");
    this.hudEl.className = "game-hud";

    this.container.appendChild(this.hudEl);
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    this.renderer = new Renderer(this.canvas);
    this.input = new KeyboardControls();
    this.state = createInitialState();
    this.spawner = createWaveSpawner();

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.input.destroy();
    this.container.remove();
  }

  private handleFrame = (nowMs: number): void => {
    const frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, MAX_FRAME_DT);
    this.lastFrameMs = nowMs;
    this.accumulator += frameDt;

    while (this.accumulator >= FIXED_DT) {
      const inputs = this.input.getPilotInput();
      tickWaveSpawner(this.spawner, this.state, FIXED_DT);
      this.state = updateGameState(this.state, FIXED_DT, inputs);
      this.accumulator -= FIXED_DT;
    }

    this.renderer.draw(this.state);
    this.renderHud();

    if (this.state.gameOver) {
      this.handleGameOver();
      return;
    }

    this.rafId = requestAnimationFrame(this.handleFrame);
  };

  private renderHud(): void {
    const hpPercent = Math.round((this.state.ship.hp / SHIP.maxHp) * 100);
    const danger = hpPercent <= 30 ? "danger" : "";
    this.hudEl.innerHTML = `
      <div class="hud-cell">
        <div class="hud-label">HP</div>
        <div class="hud-value ${danger}">${hpPercent}</div>
      </div>
      <div class="hud-cell">
        <div class="hud-label">Score</div>
        <div class="hud-value">${this.state.score}</div>
      </div>
    `;
  }

  private handleGameOver(): void {
    // Allow the game-over overlay to render for a moment, then attach a click-to-exit handler.
    this.canvas.style.cursor = "pointer";
    this.canvas.addEventListener("click", () => this.callbacks.onExit(), { once: true });
  }
}
```

- [ ] **Step 2: Update `main.ts` to mount `GameScreen` instead of the placeholder**

Modify `co-pilots/src/main.ts`. Add this import near the top:

```ts
import { GameScreen } from "./ui/GameScreen";
```

Add a module-level reference next to the existing `lobby` and `peer` declarations:

```ts
let gameScreen: GameScreen | null = null;
```

Update `cleanup()` to also destroy the game screen:

```ts
function cleanup(): void {
  lobby?.destroy();
  lobby = null;
  gameScreen?.destroy();
  gameScreen = null;
  peer?.destroy();
  peer = null;
  remoteRole = null;
  isHost = false;
}
```

Replace `handleGameStart` with the real implementation:

```ts
function handleGameStart(_difficulty: Difficulty): void {
  lobby?.destroy();
  lobby = null;
  gameScreen = new GameScreen(app, {
    onExit: () => showLobby(),
  });
}
```

The `_difficulty` parameter is intentionally unused in Plan 2 — Plan 4 will scale enemy parameters based on it.

If `noUnusedParameters` complains about `_difficulty`, the leading underscore is the conventional opt-out and tsconfig already accepts it. If it doesn't, prepend with the comment `// eslint-disable-next-line @typescript-eslint/no-unused-vars` or remove the parameter and ignore the type narrowing — but try the underscore first.

- [ ] **Step 3: Run typecheck + tests + build**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test && npm run build
```

Expected: all green. Build should produce a `dist/` folder with the bundled assets.

- [ ] **Step 4: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/GameScreen.ts src/main.ts
git commit -m "feat(ui): GameScreen with 60Hz fixed-step game loop [CP01][NS02]"
```

---

## Task 10: Manual gameplay smoke test

No new files. The user runs the dev server and verifies the playable loop end-to-end.

- [ ] **Step 1: Ask the user to start dev server**

Per the project's CLAUDE.md, do NOT run `npm run dev` yourself. Ask the user:

> "Please run `npm run dev` in `co-pilots/` and open one tab at the printed URL."

- [ ] **Step 2: Single-tab solo test**

Ask the user to:

1. Click "Create Room" — verify the lobby code appears in the family-aesthetic style (cyan glow, Orbitron, codePulse)
2. Open a SECOND tab and join with the code, choose "Gunner" — connect both tabs (we still need both peers for the lobby to advance to the joined state, even though only the pilot will play)
3. In the host tab (Tab A): pick "Pilot", "Normal", click "Start Game"
4. Verify Tab A switches to the game screen with: dark indigo bg + faint grid + cyan ship with magenta turret stub at the bottom
5. **Move the ship** with WASD or arrow keys — verify smooth motion in all 8 directions, ship clamped to playfield edges
6. **Fire** with Space — verify cyan bullets travel upward
7. **Drone spawn** — verify magenta drones appear from the top and fall toward the bottom roughly every 1.4 seconds
8. **Bullet vs drone** — verify hitting a drone destroys it AND increments the score in the HUD
9. **Drone vs ship** — let a drone hit the ship; verify HP decreases in the HUD and the value turns magenta when HP ≤ 30
10. **Game over** — keep dying; verify the "GAME OVER" overlay appears on the canvas and clicking the canvas returns to the lobby
11. **Re-enter** — start a new game from the lobby; verify HP/score/drones are reset

- [ ] **Step 3: Visual checklist**

Confirm the following match the family aesthetic:
- Background grid is animated (gridPulse) on the body
- Lobby title has glitch flicker + magenta slice
- Game canvas background is `#020208`
- All entities have visible self-glow (shadowBlur)
- Score popups in the HUD use cyan glow; HP turns magenta when low
- No system fonts visible — everything is Orbitron or Rajdhani

If any of these are off, fix them before the final commit.

- [ ] **Step 4: Final verification suite**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test && npm run build
```

Expected: typecheck clean, all tests pass (smoke + Protocol + Collision + GameState (16) + WaveSpawner (6) = 31 tests), build clean.

- [ ] **Step 5: Optional fix commit (if anything was patched during smoke test)**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add -u
git commit -m "fix: address issues from manual gameplay smoke test [CP01]"
```

Skip if no fixes were needed.

---

## Plan 2 — Definition of Done

All of these must be true:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (target: 31 tests across 5 test files)
- [ ] `npm run build` produces `dist/` without errors
- [ ] Lobby is rendered in the dropster/snakey neon family aesthetic (Orbitron, glitch title, cyan/magenta palette, sharp corners, animated grid backdrop)
- [ ] Game screen runs a smooth 60Hz loop with WASD/arrow movement and Space fire
- [ ] Drones spawn from the top and can be destroyed by bullets
- [ ] Score increments on enemy kills, HP decrements on contact
- [ ] Ship is rendered with cyan body + magenta turret stub (the asymmetric two-player visual identity)
- [ ] Game over → click-to-return-to-lobby works
- [ ] All work committed on `main`

When all boxes are checked, Plan 2 is done. Plan 3 (Networked Co-op) can begin immediately afterward.
