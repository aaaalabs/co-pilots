# Co-Pilots — Plan 3: Networked Co-op

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two players share one ship over the internet. The pilot (host) moves the ship and fires forward; the gunner (client) aims a 360-degree turret and fires independently. The host runs the authoritative simulation and streams snapshots to the gunner at 20Hz. The gunner sends aim/fire input to the host at 30Hz. The gunner's turret angle is shown locally with zero lag (aim prediction).

**Architecture:** Host-authoritative model per the networking spec. The `GameScreen` class gains a `role` parameter and branches: in host mode it runs the simulation and sends snapshots via `PeerConnection`; in gunner mode it receives snapshots and renders from them. Solo mode (no peer) works exactly as in Plan 2. The `PilotInput` is read locally on the host; the `GunnerInput` is received over the network. On the gunner client, a `MouseControls` adapter reads mouse/touch position to compute turret angle, which is sent to the host AND rendered locally for instant feedback (aim prediction).

**Tech Stack:** Same as Plans 1–2. No new dependencies.

**Scope:**
- ✅ Protocol extended: `snapshot`, `input`, `gameOver` message types
- ✅ GameState extended: turretAngle on Ship, gunner firing, directional bullets (vx+vy)
- ✅ Snapshot serialization (JSON, full state)
- ✅ MouseControls for gunner aiming (desktop: cursor, touch later in Plan 5)
- ✅ Renderer: turret rotated by turretAngle, gunner bullets in magenta
- ✅ GameScreen: host/gunner/solo modes in one class
- ✅ Aim prediction: gunner sees own turret angle instantly
- ❌ NO fire prediction / ghost bullets (gunner's bullets appear when snapshot confirms)
- ❌ NO interpolation between snapshots (may add in Plan 4 if gunner view is choppy)
- ❌ NO pause/disconnect overlay during gameplay (basic disconnect from Plan 1 stays)
- ❌ NO gameOver/rematch network sync (both tabs run independent game-over for now)
- ❌ NO touch gunner controls (Plan 5)

---

## File Structure (delta from Plan 2)

```
co-pilots/
  src/
    game/
      GameState.ts           # MODIFY — add turretAngle, GunnerInput, vx on Bullet, gunner fire
      constants.ts           # MODIFY — add BULLET.gunnerSpeed, SHIP.gunnerFireCooldown
    network/
      Protocol.ts            # MODIFY — add snapshot, input, gameOver message types
      Snapshot.ts             # NEW — serialize/deserialize GameState ↔ SnapshotData
    ui/
      Renderer.ts            # MODIFY — rotated turret, bullet color by owner
      MouseControls.ts       # NEW — mouse → GunnerInput
      GameScreen.ts          # MODIFY — host/gunner/solo branching, network send/receive
    main.ts                  # MODIFY — pass role + peer to GameScreen, route messages
  tests/
    Protocol.test.ts         # MODIFY — add snapshot/input round-trip tests
    GameState.test.ts        # MODIFY — add gunner firing tests
    Snapshot.test.ts         # NEW
```

---

## Task 1: Protocol extension (TDD)

**Files:**
- Modify: `co-pilots/src/network/Protocol.ts`
- Modify: `co-pilots/tests/Protocol.test.ts`

Add gameplay message types to the existing lobby protocol. The existing `Message` union and `VALID_TYPES` set grow; `encodeMessage`/`decodeMessage` remain unchanged.

- [ ] **Step 1: Add new tests to `Protocol.test.ts`**

Read `co-pilots/tests/Protocol.test.ts`. Append these tests inside the existing `describe("Protocol", ...)`:

```ts
  it("round-trips a snapshot message", () => {
    const msg: Message = {
      type: "snapshot",
      tick: 42,
      state: {
        ship: { x: 100, y: 200, hp: 80, turretAngle: 1.5 },
        bullets: [{ id: 1, x: 10, y: 20, vx: 0, vy: -540 }],
        enemies: [{ id: 1, x: 50, y: 30, hp: 25 }],
        score: 120,
        gameOver: false,
      },
    };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it("round-trips an input message", () => {
    const msg: Message = { type: "input", tick: 10, aim: 1.2, fire: true };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it("round-trips a gameOver message", () => {
    const msg: Message = { type: "gameOver", score: 350 };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });
```

- [ ] **Step 2: Run tests, observe failures**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Protocol
```

Expected: new tests fail because `snapshot`, `input`, `gameOver` aren't in the Message type or VALID_TYPES yet.

- [ ] **Step 3: Extend Protocol.ts**

Modify `co-pilots/src/network/Protocol.ts`. Replace the Message type and VALID_TYPES:

```ts
export type SnapshotData = {
  ship: { x: number; y: number; hp: number; turretAngle: number };
  bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number }>;
  enemies: Array<{ id: number; x: number; y: number; hp: number }>;
  score: number;
  gameOver: boolean;
};

export type Message =
  // Lobby
  | { type: "ready"; player?: string; role: Role }
  | { type: "start"; difficulty: Difficulty }
  // Gameplay (host → gunner)
  | { type: "snapshot"; tick: number; state: SnapshotData }
  // Gameplay (gunner → host)
  | { type: "input"; tick: number; aim: number; fire: boolean }
  // Lifecycle
  | { type: "pause" }
  | { type: "pauseAccept" }
  | { type: "pauseDeny" }
  | { type: "unpause" }
  | { type: "gameOver"; score: number };

const VALID_TYPES = new Set<Message["type"]>([
  "ready",
  "start",
  "snapshot",
  "input",
  "pause",
  "pauseAccept",
  "pauseDeny",
  "unpause",
  "gameOver",
]);
```

`encodeMessage` and `decodeMessage` remain unchanged — they work with any JSON-serializable Message.

- [ ] **Step 4: Run tests, verify all pass**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Protocol
```

Expected: all 9 Protocol tests pass (6 existing + 3 new).

- [ ] **Step 5: Typecheck + all tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, 41 total tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/network/Protocol.ts tests/Protocol.test.ts
git commit -m "feat(network): extend Protocol with snapshot, input, gameOver messages [CP01]"
```

---

## Task 2: GameState — turret angle + gunner firing (TDD)

**Files:**
- Modify: `co-pilots/src/game/constants.ts`
- Modify: `co-pilots/src/game/GameState.ts`
- Modify: `co-pilots/tests/GameState.test.ts`

This task adds: turretAngle on Ship, vx on Bullet, GunnerInput type, and gunner bullet spawning.

- [ ] **Step 1: Update constants**

Add to `co-pilots/src/game/constants.ts` inside the existing `SHIP` block (before `} as const;`):

```ts
  gunnerFireCooldown: 0.25, // seconds between gunner shots
```

Add to `BULLET` block:

```ts
  gunnerSpeed: 480,        // pixels per second
  gunnerWidth: 5,
  gunnerHeight: 5,
  gunnerDamage: 20,
```

- [ ] **Step 2: Write new tests**

Read `co-pilots/tests/GameState.test.ts`. Add import for the new constants if needed. Add `GunnerInput` to the existing import from `../src/game/GameState`. Append these test blocks inside the top-level describe:

```ts
  describe("updateGameState — gunner", () => {
    const gunnerInput = (aim: number, fire: boolean): GunnerInput => ({ aimAngle: aim, fire });

    it("updates turret angle from gunner input", () => {
      const s = createInitialState();
      const next = updateGameState(s, 0.016, NO_INPUT, gunnerInput(Math.PI / 2, false));
      expect(next.ship.turretAngle).toBeCloseTo(Math.PI / 2);
    });

    it("spawns a gunner bullet when firing", () => {
      const s = createInitialState();
      const next = updateGameState(s, 0.016, NO_INPUT, gunnerInput(0, true));
      expect(next.bullets).toHaveLength(1);
      // Angle 0 = up → vy should be negative, vx should be ~0
      expect(next.bullets[0].vy).toBeLessThan(0);
      expect(next.bullets[0].vx).toBeCloseTo(0, 1);
    });

    it("gunner bullets travel at the aimed angle", () => {
      const s = createInitialState();
      const angle = Math.PI / 2; // pointing right
      const next = updateGameState(s, 0.016, NO_INPUT, gunnerInput(angle, true));
      expect(next.bullets[0].vx).toBeCloseTo(BULLET.gunnerSpeed, 0);
      expect(next.bullets[0].vy).toBeCloseTo(0, 0);
    });

    it("respects gunner fire cooldown", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, NO_INPUT, gunnerInput(0, true));
      s = updateGameState(s, 0.016, NO_INPUT, gunnerInput(0, true));
      expect(s.bullets).toHaveLength(1); // second shot blocked
    });

    it("pilot and gunner can fire independently", () => {
      let s = createInitialState();
      s = updateGameState(s, 0.016, { moveX: 0, moveY: 0, fire: true }, gunnerInput(Math.PI, true));
      expect(s.bullets).toHaveLength(2); // one pilot bullet, one gunner bullet
    });
  });
```

- [ ] **Step 3: Run tests, observe failures**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- GameState
```

Expected: new tests fail (GunnerInput not exported, turretAngle not on Ship, etc.).

- [ ] **Step 4: Update GameState.ts**

Modify `co-pilots/src/game/GameState.ts`:

a) Add GunnerInput type:

```ts
export type GunnerInput = {
  aimAngle: number;    // radians, 0 = up, clockwise positive
  fire: boolean;
};
```

b) Add `turretAngle` and `gunnerFireCooldown` to Ship type:

```ts
export type Ship = {
  x: number;
  y: number;
  hp: number;
  fireCooldown: number;
  turretAngle: number;
  gunnerFireCooldown: number;
};
```

c) Add `vx` to Bullet type:

```ts
export type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};
```

d) Update `createInitialState` to include the new fields:

```ts
ship: {
  x: SHIP.startX,
  y: SHIP.startY,
  hp: SHIP.maxHp,
  fireCooldown: 0,
  turretAngle: 0,
  gunnerFireCooldown: 0,
},
```

e) Update `updateGameState` signature to accept optional gunner input:

```ts
export function updateGameState(
  state: GameState,
  dt: number,
  input: PilotInput,
  gunnerInput?: GunnerInput,
): GameState {
```

f) Existing pilot bullet spawn: add `vx: 0`:

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: ship.x,
  y: ship.y - SHIP.bodyHeight / 2,
  vx: 0,
  vy: -BULLET.pilotSpeed,
  life: BULLET.maxLifetime,
});
```

g) Existing bullet step: add vx movement:

```ts
for (const b of state.bullets) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
}
```

h) Add gunner input handling AFTER pilot fire and BEFORE the bullet step:

```ts
  // Gunner input
  if (gunnerInput) {
    ship.turretAngle = gunnerInput.aimAngle;
    ship.gunnerFireCooldown = Math.max(0, ship.gunnerFireCooldown - dt);
    if (gunnerInput.fire && ship.gunnerFireCooldown <= 0) {
      const vx = Math.sin(ship.turretAngle) * BULLET.gunnerSpeed;
      const vy = -Math.cos(ship.turretAngle) * BULLET.gunnerSpeed;
      state.bullets.push({
        id: state.nextBulletId++,
        x: ship.x,
        y: ship.y - SHIP.bodyHeight / 2,
        vx,
        vy,
        life: BULLET.maxLifetime,
      });
      ship.gunnerFireCooldown = SHIP.gunnerFireCooldown;
    }
  }
```

i) Existing bullet cull filter: also cull bullets that leave the playfield horizontally:

```ts
state.bullets = state.bullets.filter(
  b => b.life > 0 && b.y > -BULLET.pilotHeight && b.x > -20 && b.x < PLAYFIELD.width + 20,
);
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- GameState
```

Expected: all 22 GameState tests pass (17 existing + 5 new).

- [ ] **Step 6: Typecheck + all tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, 46 total tests.

- [ ] **Step 7: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/game/constants.ts src/game/GameState.ts tests/GameState.test.ts
git commit -m "feat(game): add turret angle and gunner firing to GameState [CP01]"
```

---

## Task 3: Snapshot serialize/deserialize (TDD)

**Files:**
- Create: `co-pilots/src/network/Snapshot.ts`
- Create: `co-pilots/tests/Snapshot.test.ts`

Converts between `GameState` (internal) and `SnapshotData` (wire format). The snapshot strips host-internal fields (cooldowns, IDs).

- [ ] **Step 1: Write failing tests**

Write `co-pilots/tests/Snapshot.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeSnapshot, applySnapshot } from "../src/network/Snapshot";
import { createInitialState } from "../src/game/GameState";

describe("Snapshot", () => {
  it("round-trips a clean initial state", () => {
    const state = createInitialState();
    const snap = serializeSnapshot(state);
    const restored = applySnapshot(snap);
    expect(restored.ship.x).toBe(state.ship.x);
    expect(restored.ship.y).toBe(state.ship.y);
    expect(restored.ship.hp).toBe(state.ship.hp);
    expect(restored.ship.turretAngle).toBe(state.ship.turretAngle);
    expect(restored.score).toBe(state.score);
    expect(restored.gameOver).toBe(false);
  });

  it("includes bullets with vx and vy", () => {
    const state = createInitialState();
    state.bullets.push({ id: 1, x: 10, y: 20, vx: 3, vy: -540, life: 1 });
    const snap = serializeSnapshot(state);
    expect(snap.bullets).toHaveLength(1);
    expect(snap.bullets[0]).toEqual({ id: 1, x: 10, y: 20, vx: 3, vy: -540 });
  });

  it("includes enemies", () => {
    const state = createInitialState();
    state.enemies.push({ id: 5, x: 100, y: 50, hp: 20 });
    const snap = serializeSnapshot(state);
    expect(snap.enemies).toHaveLength(1);
    expect(snap.enemies[0]).toEqual({ id: 5, x: 100, y: 50, hp: 20 });
  });

  it("strips internal fields (cooldowns, nextIds)", () => {
    const state = createInitialState();
    const snap = serializeSnapshot(state);
    const json = JSON.stringify(snap);
    expect(json).not.toContain("fireCooldown");
    expect(json).not.toContain("nextBulletId");
    expect(json).not.toContain("nextEnemyId");
    expect(json).not.toContain("life");
  });

  it("applySnapshot produces a renderable GameState", () => {
    const state = createInitialState();
    state.ship.x = 200;
    state.ship.hp = 50;
    state.ship.turretAngle = 1.5;
    state.score = 999;
    state.bullets.push({ id: 1, x: 10, y: 20, vx: 0, vy: -540, life: 1 });
    state.enemies.push({ id: 2, x: 50, y: 30, hp: 25 });
    const snap = serializeSnapshot(state);
    const restored = applySnapshot(snap);
    expect(restored.ship.x).toBe(200);
    expect(restored.ship.hp).toBe(50);
    expect(restored.ship.turretAngle).toBe(1.5);
    expect(restored.score).toBe(999);
    expect(restored.bullets).toHaveLength(1);
    expect(restored.enemies).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests, observe failure**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Snapshot
```

- [ ] **Step 3: Implement Snapshot.ts**

Write `co-pilots/src/network/Snapshot.ts`:

```ts
import { GameState } from "../game/GameState";
import { SnapshotData } from "./Protocol";
import { SHIP } from "../game/constants";

export function serializeSnapshot(state: GameState): SnapshotData {
  return {
    ship: {
      x: state.ship.x,
      y: state.ship.y,
      hp: state.ship.hp,
      turretAngle: state.ship.turretAngle,
    },
    bullets: state.bullets.map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
    })),
    enemies: state.enemies.map(e => ({
      id: e.id,
      x: e.x,
      y: e.y,
      hp: e.hp,
    })),
    score: state.score,
    gameOver: state.gameOver,
  };
}

export function applySnapshot(snap: SnapshotData): GameState {
  return {
    ship: {
      x: snap.ship.x,
      y: snap.ship.y,
      hp: snap.ship.hp,
      turretAngle: snap.ship.turretAngle,
      fireCooldown: 0,
      gunnerFireCooldown: 0,
    },
    bullets: snap.bullets.map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      life: 1, // placeholder — gunner doesn't sim, just renders
    })),
    enemies: snap.enemies.map(e => ({
      id: e.id,
      x: e.x,
      y: e.y,
      hp: e.hp,
    })),
    score: snap.score,
    gameOver: snap.gameOver,
    nextBulletId: 0,
    nextEnemyId: 0,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm test -- Snapshot
```

Expected: 5 Snapshot tests pass.

- [ ] **Step 5: Typecheck + all tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: 51 total tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/network/Snapshot.ts tests/Snapshot.test.ts
git commit -m "feat(network): Snapshot serialize/deserialize [CP01]"
```

---

## Task 4: MouseControls for gunner

**Files:**
- Create: `co-pilots/src/ui/MouseControls.ts`

The gunner aims with the mouse cursor. `MouseControls` listens on the canvas for `mousemove` and `mousedown`/`mouseup`, and computes `GunnerInput` given the ship's position.

- [ ] **Step 1: Write MouseControls.ts**

Write `co-pilots/src/ui/MouseControls.ts`:

```ts
import { GunnerInput } from "../game/GameState";

export class MouseControls {
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private scaleX = 1;
  private scaleY = 1;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.updateScale();
  }

  getGunnerInput(shipX: number, shipY: number): GunnerInput {
    this.updateScale();
    const dx = this.mouseX - shipX;
    const dy = this.mouseY - shipY;
    return {
      aimAngle: Math.atan2(dx, -dy),
      fire: this.mouseDown,
    };
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  private updateScale(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.scaleX = this.canvas.width / rect.width;
    this.scaleY = this.canvas.height / rect.height;
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * this.scaleX;
    this.mouseY = (e.clientY - rect.top) * this.scaleY;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.mouseDown = true;
  };

  private handleMouseUp = (): void => {
    this.mouseDown = false;
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault(); // prevent right-click menu on canvas
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/MouseControls.ts
git commit -m "feat(ui): MouseControls for gunner aiming [NS02]"
```

---

## Task 5: Renderer — rotated turret + bullet colors

**Files:**
- Modify: `co-pilots/src/ui/Renderer.ts`

Two changes: (a) draw the turret rotated by `state.ship.turretAngle`, and (b) colour bullets by their vx/vy (pilot bullets go straight up → vx===0 → cyan; gunner bullets go in arbitrary directions → vx!==0 → magenta).

- [ ] **Step 1: Update drawShip**

Read `co-pilots/src/ui/Renderer.ts`. Replace the `drawShip` method:

```ts
private drawShip(state: GameState): void {
  const { x, y, turretAngle } = state.ship;
  // Cyan body (does not rotate)
  this.drawCell(
    x - SHIP.bodyWidth / 2,
    y - SHIP.bodyHeight / 2,
    SHIP.bodyWidth,
    SHIP.bodyHeight,
    COLORS.cyan,
    10,
  );
  // Magenta turret — rotated by turretAngle around ship center
  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x, y - SHIP.bodyHeight / 2);
  ctx.rotate(turretAngle);
  this.drawCell(
    -SHIP.turretWidth / 2,
    -SHIP.turretHeight,
    SHIP.turretWidth,
    SHIP.turretHeight,
    COLORS.magenta,
    8,
  );
  ctx.restore();
}
```

- [ ] **Step 2: Update drawBullets**

Replace the `drawBullets` method to colour by owner:

```ts
private drawBullets(state: GameState): void {
  for (const b of state.bullets) {
    // Pilot bullets (vx===0): cyan, tall rect. Gunner bullets: magenta, square.
    const isPilot = b.vx === 0;
    const w = isPilot ? BULLET.pilotWidth : BULLET.gunnerWidth;
    const h = isPilot ? BULLET.pilotHeight : BULLET.gunnerHeight;
    const color = isPilot ? COLORS.cyan : COLORS.magenta;
    this.drawCell(
      b.x - w / 2,
      b.y - h / 2,
      w,
      h,
      color,
      6,
    );
  }
}
```

- [ ] **Step 3: Typecheck + tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/Renderer.ts
git commit -m "feat(ui): rotated turret and colour-coded bullets [CP01]"
```

---

## Task 6: GameScreen — host/gunner/solo modes + network

**Files:**
- Modify: `co-pilots/src/ui/GameScreen.ts`

This is the core integration task. GameScreen gains `role` and `peer` parameters. The game loop branches:

**Solo (role=pilot, peer=null):** same as Plan 2 — local sim, keyboard input.
**Host (role=pilot, peer=PeerConnection):** local sim, keyboard input, receives gunner input from peer, sends snapshots at 20Hz.
**Gunner (role=gunner, peer=PeerConnection):** no local sim — receives snapshots from peer, renders from them, sends mouse input at 30Hz. Turret angle rendered from local mouse (aim prediction), not from snapshot.

- [ ] **Step 1: Rewrite GameScreen.ts**

Read `co-pilots/src/ui/GameScreen.ts`. Replace the entire file with:

```ts
import { createInitialState, updateGameState, GameState, GunnerInput } from "../game/GameState";
import { createWaveSpawner, tickWaveSpawner, WaveSpawner } from "../game/WaveSpawner";
import { PLAYFIELD, SHIP } from "../game/constants";
import { Renderer } from "./Renderer";
import { KeyboardControls } from "./KeyboardControls";
import { MouseControls } from "./MouseControls";
import { PeerConnection } from "../network/PeerConnection";
import { Message, SnapshotData } from "../network/Protocol";
import { serializeSnapshot, applySnapshot } from "../network/Snapshot";
import { Role } from "../network/Protocol";

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;
const SNAPSHOT_INTERVAL = 1 / 20; // 20 Hz
const INPUT_INTERVAL = 1 / 30;    // 30 Hz

export interface GameScreenCallbacks {
  onExit: () => void;
  onMessage?: (msg: Message) => void;
}

export class GameScreen {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private keyboard: KeyboardControls | null = null;
  private mouse: MouseControls | null = null;
  private state: GameState;
  private spawner: WaveSpawner;
  private rafId: number | null = null;
  private lastFrameMs = 0;
  private accumulator = 0;
  private hudEl: HTMLDivElement;
  private callbacks: GameScreenCallbacks;
  private role: Role;
  private peer: PeerConnection | null;
  private tick = 0;
  private snapshotTimer = 0;
  private inputTimer = 0;
  private remoteGunnerInput: GunnerInput | null = null;
  private localAimAngle = 0;

  constructor(
    parent: HTMLElement,
    callbacks: GameScreenCallbacks,
    role: Role,
    peer: PeerConnection | null,
  ) {
    this.callbacks = callbacks;
    this.role = role;
    this.peer = peer;

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
    this.state = createInitialState();
    this.spawner = createWaveSpawner();

    if (role === "pilot") {
      this.keyboard = new KeyboardControls();
    } else {
      this.mouse = new MouseControls(this.canvas);
    }

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.keyboard?.destroy();
    this.mouse?.destroy();
    this.container.remove();
  }

  handleNetworkMessage(msg: Message): void {
    if (msg.type === "snapshot" && this.role === "gunner") {
      this.state = applySnapshot(msg.state);
    } else if (msg.type === "input" && this.role === "pilot") {
      this.remoteGunnerInput = { aimAngle: msg.aim, fire: msg.fire };
    }
  }

  private handleFrame = (nowMs: number): void => {
    const frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, MAX_FRAME_DT);
    this.lastFrameMs = nowMs;

    if (this.role === "pilot") {
      this.updateHost(frameDt);
    } else {
      this.updateGunner(frameDt);
    }

    this.render();

    if (this.state.gameOver) {
      this.handleGameOver();
      return;
    }

    this.rafId = requestAnimationFrame(this.handleFrame);
  };

  private updateHost(frameDt: number): void {
    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      const pilotInput = this.keyboard!.getPilotInput();
      tickWaveSpawner(this.spawner, this.state, FIXED_DT);
      this.state = updateGameState(
        this.state, FIXED_DT, pilotInput, this.remoteGunnerInput ?? undefined,
      );
      this.tick++;
      this.accumulator -= FIXED_DT;
    }

    // Send snapshot to gunner
    if (this.peer) {
      this.snapshotTimer += frameDt;
      if (this.snapshotTimer >= SNAPSHOT_INTERVAL) {
        this.snapshotTimer -= SNAPSHOT_INTERVAL;
        this.peer.send({
          type: "snapshot",
          tick: this.tick,
          state: serializeSnapshot(this.state),
        });
      }
    }
  }

  private updateGunner(frameDt: number): void {
    // Read local mouse for aim + send to host
    if (this.mouse && this.peer) {
      const gi = this.mouse.getGunnerInput(this.state.ship.x, this.state.ship.y);
      this.localAimAngle = gi.aimAngle;

      this.inputTimer += frameDt;
      if (this.inputTimer >= INPUT_INTERVAL) {
        this.inputTimer -= INPUT_INTERVAL;
        this.peer.send({
          type: "input",
          tick: this.tick,
          aim: gi.aimAngle,
          fire: gi.fire,
        });
      }
    }
  }

  private render(): void {
    // For the gunner: override turret angle with local aim for instant feedback
    if (this.role === "gunner") {
      this.state.ship.turretAngle = this.localAimAngle;
    }
    this.renderer.draw(this.state);
    this.renderHud();
  }

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
    this.canvas.style.cursor = "pointer";
    this.canvas.addEventListener("click", () => this.callbacks.onExit(), { once: true });
  }
}
```

- [ ] **Step 2: Typecheck + tests**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test
```

Expected: typecheck clean, all tests pass. (GameScreen has no tests; only integration test in Task 8.)

- [ ] **Step 3: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/ui/GameScreen.ts
git commit -m "feat(ui): GameScreen with host/gunner/solo network modes [CP01][NS02]"
```

---

## Task 7: main.ts wiring

**Files:**
- Modify: `co-pilots/src/main.ts`

Wire `handleGameStart` to pass `role` and `peer` into `GameScreen`, and route gameplay messages.

- [ ] **Step 1: Update main.ts**

Read `co-pilots/src/main.ts`. Apply these changes:

a) Update `handleGameStart` to pass role + peer:

```ts
function handleGameStart(_difficulty: Difficulty): void {
  lobby?.destroy();
  lobby = null;
  const role = localSettings.role;
  gameScreen = new GameScreen(app, {
    onExit: () => showLobby(),
  }, role, peer);
}
```

Note: for solo mode (`handleSolo`), there's no peer and role is "pilot". The current `handleSolo` calls `handleGameStart("normal")` which will pass `localSettings.role` (default: "pilot") and `peer` (null). That's correct.

b) Update `handleMessage` to route gameplay messages to the GameScreen:

```ts
function handleMessage(msg: Message): void {
  if (msg.type === "ready") {
    remoteRole = msg.role;
    if (isHost && lobby) {
      lobby.setJoined(true);
      sendReady();
    }
    lobby?.setPeerReady(true);
    if (remoteRole === localSettings.role) {
      lobby?.setStatus(`Role conflict: both are ${localSettings.role}`);
    } else {
      lobby?.setStatus(`Co-pilot ready (${msg.player || "Player"})`);
    }
  } else if (msg.type === "start") {
    handleGameStart(msg.difficulty);
  } else if (gameScreen && (msg.type === "snapshot" || msg.type === "input")) {
    gameScreen.handleNetworkMessage(msg);
  }
}
```

- [ ] **Step 2: Typecheck + tests + build**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test && npm run build
```

Expected: all clean. Build produces dist/.

- [ ] **Step 3: Commit**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add src/main.ts
git commit -m "feat: wire role and peer into GameScreen for networked co-op [CP01]"
```

---

## Task 8: Manual two-tab co-op test

No files. Ask the user to start `npm run dev` and run through the following:

- [ ] **Step 1: Solo still works**

Click "Solo Play" → game plays as before (pilot only, no gunner). Turret should still show as a magenta stub pointing up (angle=0). Press Space → cyan bullets go up. Drones → magenta. Works? ✓

- [ ] **Step 2: Two-tab co-op**

1. Tab A: "Create Room" → code
2. Tab B: join with code
3. Tab A: "Pilot" + "Normal" + "Start Game"
4. **Tab A (host/pilot):** WASD moves the ship, Space fires cyan bullets upward. Drones spawn. Score + HP update.
5. **Tab B (gunner):** the ship moves in sync with Tab A's input (at 20Hz). Move the mouse cursor around the canvas — the magenta turret rotates to follow the mouse. Click → magenta bullets fire in the aimed direction. Bullets and enemies render.
6. **Verify turret rotation:** move the mouse to the right of the ship → turret points right. Above → points up. Below → points down.
7. **Verify gunner bullets hit drones:** aim at a drone on Tab B, click → bullet goes in the right direction. When it hits, the drone should disappear and the score should go up (confirmed next snapshot).
8. **Verify HUD syncs:** both tabs show the same HP and Score (gunner's HUD updates every snapshot, 50ms lag).
9. **Verify game over:** let the ship die. Both tabs should show "GAME OVER".

- [ ] **Step 3: Fix commit if needed**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots
git add -u
git commit -m "fix: address issues from co-op smoke test"
```

- [ ] **Step 4: Final verification**

```bash
cd /Users/livingmydesign/GitHub/_games/co-pilots && npm run typecheck && npm test && npm run build
```

Expected: typecheck clean, ~51 tests pass, build clean.

---

## Plan 3 — Definition of Done

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (~51 tests across 7 test files)
- [ ] `npm run build` produces `dist/`
- [ ] Solo play still works identically to Plan 2
- [ ] Two tabs: host=pilot moves ship, gunner=mouse aims turret + fires
- [ ] Gunner turret rotates instantly with mouse (aim prediction)
- [ ] Gunner bullets are magenta, pilot bullets are cyan
- [ ] Both tabs show same HP/Score (within 50ms snapshot lag)
- [ ] Game over displays on both tabs

When done, Plan 3 is complete. Plan 4 (Content & Mechanics) can begin.
