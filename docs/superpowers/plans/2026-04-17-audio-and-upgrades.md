# Co-Pilots — Audio Samples + Weapon Upgrades

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the eight MP3 assets in `public/audios/` and add a role-specific weapon-upgrade system driven by a new bonus pickup. Upgrades last until the current wave ends; Pilot gains Mega-Gun (double damage, larger hitbox); Gunner gains Beam-Laser (piercing through up to 3 enemies). Boss waves get a dedicated looping music theme.

**Architecture:** A new `AudioSampleBank` decodes and plays MP3 samples through the existing compressor graph. `SoundEngine` gains sample-aware methods with synth fallbacks. `MusicEngine` supports theme swapping. `GameState` gains per-bullet `damage` and `piercing`, plus `ship.upgradeActive`. `Pickup.kind` widens to `"heart" | "bonus"`. `WaveSpawner` owns bonus-drop logic and upgrade expiry on wave++. `Snapshot`/`Protocol` carry the new fields. `Renderer` draws the existing `powerup` sprite for bonuses and a gold aura for upgraded ships. `GameScreen` wires the new sound triggers and music swap.

**Tech Stack:** TypeScript 5.9, Vite 6, Vitest 2, Web Audio API. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-17-audio-and-upgrades-design.md`

---

## File Structure

```
co-pilots/
  public/audios/                    # already present — 8 MP3s
  src/
    audio/
      AudioSampleBank.ts            # NEW — decode + play MP3 samples
      SoundEngine.ts                # MODIFY — new sample-aware methods, synth fallback
      MusicEngine.ts                # MODIFY — boss theme switch with crossfade
    game/
      constants.ts                  # MODIFY — add BONUS
      GameState.ts                  # MODIFY — Bullet.damage, Bullet.piercing, Ship.upgradeActive, Pickup.kind, upgrade logic
      WaveSpawner.ts                # MODIFY — bonus drop triggers, upgrade expiry on wave++
    network/
      Protocol.ts                   # MODIFY — extend SnapshotData (ship.upgradeActive, pickup.kind, bullet.piercing)
      Snapshot.ts                   # MODIFY — serialize/apply the new fields
    ui/
      Renderer.ts                   # MODIFY — draw bonus pickup + ship aura
      GameScreen.ts                 # MODIFY — wire sample triggers, boss-theme switching
  tests/
    GameState.test.ts               # MODIFY — add bullet damage field to fixtures, new upgrade tests
    WaveSpawner.test.ts             # MODIFY — new bonus drop tests
    Snapshot.test.ts                # MODIFY — include new fields in fixtures
    Protocol.test.ts                # MODIFY — snapshot round-trip uses new fields
```

---

## Task 1: Constants + Type Scaffolding

Adds `BONUS` constants and extends types. No behavior change yet — but existing tests need tiny bullet-fixture updates because `damage` becomes required on `Bullet`.

**Files:**
- Modify: `src/game/constants.ts` (append `BONUS` block)
- Modify: `src/game/GameState.ts` (types + bullet-spawn sites set `damage`)
- Modify: `tests/GameState.test.ts` (add `damage` to manual bullet fixtures)
- Modify: `tests/Snapshot.test.ts` (add `damage` to manual bullet fixtures)

- [ ] **Step 1: Add `BONUS` constants**

Append to `src/game/constants.ts`:

```ts
// Bonus pickup — timed weapon upgrade
export const BONUS = {
  width: 30, height: 30, radius: 18,
  fallSpeed: 50,
  swayAmplitude: 20,
  swayFrequency: 2.0,
  dropThreshold: 0.5,         // fraction of wave kills before guaranteed drop
  randomDropChance: 0.03,     // per-kill chance for early drop
  bossDropHpFraction: 0.5,    // boss wave drops a bonus at ≤50% HP
  pilotDamageMultiplier: 2,   // Mega-Gun damage multiplier
  pilotRadiusBonus: 4,        // Mega-Gun hitbox radius bonus (px)
  pierceMax: 3,               // Beam-Laser: max enemies per shot
} as const;
```

- [ ] **Step 2: Widen `Pickup.kind`, add `Ship.upgradeActive`, add `Bullet.damage` + `Bullet.piercing`**

In `src/game/GameState.ts`, change the type declarations:

```ts
export type Ship = {
  x: number;
  y: number;
  hp: number;
  fireCooldown: number;
  heat: number;
  overheated: boolean;
  turretAngle: number;
  gunnerFireCooldown: number;
  upgradeActive: boolean;       // NEW
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;               // NEW — per-bullet damage
  enemy?: boolean;
  piercing?: boolean;           // NEW — set on upgraded gunner shots
  pierceHits?: number;          // NEW — counts enemies pierced
  radiusBonus?: number;         // NEW — extra collision radius for Mega-Gun
};

export type Pickup = {
  id: number;
  kind: "heart" | "bonus";      // CHANGED — widened
  x: number;
  y: number;
  baseX: number;
  age: number;
};
```

In `createInitialState`, add `upgradeActive: false,` to the ship.

- [ ] **Step 3: Set `damage` on every bullet spawn site**

Four spawn sites in `GameState.ts`. Update them:

Pilot shot (around line 141):

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: ship.x,
  y: ship.y - SHIP.bodyHeight / 2,
  vx: 0,
  vy: -BULLET.pilotSpeed,
  life: BULLET.maxLifetime,
  damage: BULLET.pilotDamage,
});
```

Gunner shot (around line 163):

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: ship.x,
  y: ship.y - SHIP.bodyHeight / 2,
  vx,
  vy,
  life: BULLET.maxLifetime,
  damage: BULLET.gunnerDamage,
});
```

Sniper boss projectile (around line 207):

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: e.x,
  y: e.y + ENEMY_BOSS.height / 2,
  vx: (dx / dist) * ENEMY_BOSS.bulletSpeed,
  vy: (dy / dist) * ENEMY_BOSS.bulletSpeed,
  life: 3.0,
  damage: 0,                    // enemy bullets damage ship via ENEMY_BOSS.contactDamage
  enemy: true,
});
```

Strafer boss spread (around line 235):

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: e.x,
  y: e.y + ENEMY_BOSS_STRAFER.height / 2,
  vx: Math.sin(a) * ENEMY_BOSS_STRAFER.bulletSpeed,
  vy: Math.cos(a) * ENEMY_BOSS_STRAFER.bulletSpeed,
  life: 3.0,
  damage: 0,
  enemy: true,
});
```

- [ ] **Step 4: Replace `vx`-heuristic in bullet-vs-enemy with `b.damage`**

In `GameState.ts` around line 298, change:

```ts
const dmg = b.vx === 0 ? BULLET.pilotDamage : BULLET.gunnerDamage;
e.hp -= dmg;
```

to:

```ts
const dmg = b.damage;
e.hp -= dmg;
```

Also update the collision radius expression in the same block:

```ts
if (circlesOverlap(b.x, b.y, BULLET.radius + (b.radiusBonus ?? 0), e.x, e.y, er)) {
```

- [ ] **Step 5: Fix existing test fixtures that construct bullets manually**

In `tests/GameState.test.ts` find the two `s.bullets.push({...})` sites (around lines 159 and the pilot-bullet-vs-enemy collision test):

```ts
s.bullets.push({ id: 1, x: 100, y: 100, vx: 0, vy: -BULLET.pilotSpeed, life: 1, damage: BULLET.pilotDamage });
```

In `tests/Snapshot.test.ts`:

```ts
state.bullets.push({ id: 1, x: 10, y: 20, vx: 3, vy: -540, life: 1, damage: BULLET.gunnerDamage });
```

Add `BULLET` to the import at the top of that file:

```ts
import { BULLET } from "../src/game/constants";
```

And in the "applySnapshot produces a renderable GameState" test:

```ts
state.bullets.push({ id: 1, x: 10, y: 20, vx: 0, vy: -540, life: 1, damage: BULLET.pilotDamage });
```

- [ ] **Step 6: Run typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: All green. No compile errors, no failing tests. (Existing behavior unchanged since we replaced the vx-heuristic with an equivalent per-bullet damage.)

- [ ] **Step 7: Commit**

```bash
git add src/game/constants.ts src/game/GameState.ts tests/GameState.test.ts tests/Snapshot.test.ts
git commit -m "feat(game): add BONUS constants + per-bullet damage + ship upgrade flag (no behavior change yet)"
```

---

## Task 2: Pilot Mega-Gun Upgrade

Adds the pilot-side effect: when `ship.upgradeActive`, pilot shots deal 2× damage with a wider hitbox. Also wires the bonus pickup to activate the upgrade.

**Files:**
- Modify: `src/game/GameState.ts`
- Modify: `tests/GameState.test.ts`

- [ ] **Step 1: Write failing test — pilot shot gets 2× damage while upgraded**

Add to the "pilot firing + overheat" describe block in `tests/GameState.test.ts`:

```ts
it("spawns a Mega-Gun bullet when upgrade is active", () => {
  const s = createInitialState();
  s.ship.upgradeActive = true;
  const next = updateGameState(s, 0.016, FIRE);
  expect(next.bullets).toHaveLength(1);
  expect(next.bullets[0].damage).toBe(BULLET.pilotDamage * 2);
  expect(next.bullets[0].radiusBonus).toBe(4);
});
```

Run: `npx vitest run tests/GameState.test.ts -t "Mega-Gun"`
Expected: FAIL — `damage` will be `BULLET.pilotDamage`, not 2×.

- [ ] **Step 2: Write failing test — bonus pickup activates the upgrade**

Add to the end of the `GameState` describe block:

```ts
describe("updateGameState — bonus pickup", () => {
  it("activates ship.upgradeActive when ship touches a bonus pickup", () => {
    const s = createInitialState();
    s.pickups.push({
      id: 1, kind: "bonus",
      x: s.ship.x, y: s.ship.y,
      baseX: s.ship.x, age: 0,
    });
    s.nextPickupId = 2;
    const next = updateGameState(s, 0.016, NO_INPUT);
    expect(next.ship.upgradeActive).toBe(true);
    expect(next.pickups).toHaveLength(0);
  });

  it("does not change hp when collecting a bonus (heart-only effect)", () => {
    const s = createInitialState();
    s.ship.hp = 5;
    s.pickups.push({
      id: 1, kind: "bonus",
      x: s.ship.x, y: s.ship.y,
      baseX: s.ship.x, age: 0,
    });
    const next = updateGameState(s, 0.016, NO_INPUT);
    expect(next.ship.hp).toBe(5);
  });
});
```

Run: `npx vitest run tests/GameState.test.ts -t "bonus pickup"`
Expected: FAIL — no bonus-handling code exists yet.

- [ ] **Step 3: Implement Mega-Gun at pilot-shot spawn site**

In `src/game/GameState.ts` pilot-fire branch, change:

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: ship.x,
  y: ship.y - SHIP.bodyHeight / 2,
  vx: 0,
  vy: -BULLET.pilotSpeed,
  life: BULLET.maxLifetime,
  damage: ship.upgradeActive
    ? BULLET.pilotDamage * BONUS.pilotDamageMultiplier
    : BULLET.pilotDamage,
  ...(ship.upgradeActive ? { radiusBonus: BONUS.pilotRadiusBonus } : {}),
});
```

Import `BONUS` at the top:

```ts
import {
  SHIP, BULLET, PLAYFIELD,
  ENEMY_DRONE, ENEMY_HUNTER, ENEMY_BOSS,
  ENEMY_BOSS_STRAFER, ENEMY_BOSS_SPLITTER, ENEMY_BOSS_CHARGER,
  HEART, BONUS, isBossType,
} from "./constants";
```

- [ ] **Step 4: Implement bonus pickup handling**

In the pickup-collection block (around line 353) in `GameState.ts`, replace:

```ts
state.pickups = state.pickups.filter(p => {
  if (circlesOverlap(p.x, p.y, HEART.radius, ship.x, ship.y, SHIP.radius)) {
    ship.hp = Math.min(SHIP.maxHp, ship.hp + HEART.healAmount);
    return false;
  }
  return p.y < PLAYFIELD.height + HEART.height;
});
```

with:

```ts
state.pickups = state.pickups.filter(p => {
  const r = p.kind === "bonus" ? BONUS.radius : HEART.radius;
  if (circlesOverlap(p.x, p.y, r, ship.x, ship.y, SHIP.radius)) {
    if (p.kind === "heart") {
      ship.hp = Math.min(SHIP.maxHp, ship.hp + HEART.healAmount);
    } else {
      ship.upgradeActive = true;
    }
    return false;
  }
  const maxHeight = p.kind === "bonus" ? BONUS.height : HEART.height;
  return p.y < PLAYFIELD.height + maxHeight;
});
```

Also update the pickup-movement block just above to use per-kind fall speed:

```ts
for (const p of state.pickups) {
  p.age += dt;
  const fall = p.kind === "bonus" ? BONUS.fallSpeed : HEART.fallSpeed;
  const swayFreq = p.kind === "bonus" ? BONUS.swayFrequency : HEART.swayFrequency;
  const swayAmp = p.kind === "bonus" ? BONUS.swayAmplitude : HEART.swayAmplitude;
  p.y += fall * dt;
  p.x = p.baseX + Math.sin(p.age * swayFreq) * swayAmp;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/GameState.test.ts`
Expected: All green, including the two new tests.

- [ ] **Step 6: Commit**

```bash
git add src/game/GameState.ts tests/GameState.test.ts
git commit -m "feat(game): pilot Mega-Gun upgrade activates on bonus pickup"
```

---

## Task 3: Gunner Beam-Laser Upgrade (Piercing)

Adds the gunner-side effect: when `ship.upgradeActive`, gunner bullets pierce up to `BONUS.pierceMax` enemies before despawning.

**Files:**
- Modify: `src/game/GameState.ts`
- Modify: `tests/GameState.test.ts`

- [ ] **Step 1: Write failing test — gunner bullet is flagged piercing while upgraded**

Add to the "gunner" describe block in `tests/GameState.test.ts`:

```ts
it("spawns a piercing Beam-Laser bullet when upgrade is active", () => {
  const s = createInitialState();
  s.ship.upgradeActive = true;
  s.ship.fireCooldown = 999; // suppress pilot auto-fire
  const next = updateGameState(s, 0.016, NO_INPUT, gunnerInput(0, true));
  expect(next.bullets).toHaveLength(1);
  expect(next.bullets[0].piercing).toBe(true);
  expect(next.bullets[0].pierceHits).toBe(0);
});
```

- [ ] **Step 2: Write failing test — piercing bullet hits up to 3 enemies**

```ts
it("piercing bullet kills up to pierceMax enemies in a line", () => {
  const s = createInitialState();
  s.ship.fireCooldown = 999;
  // 4 low-HP enemies stacked vertically at x=100
  for (let i = 0; i < 4; i++) {
    s.enemies.push({ id: i + 1, type: 0, x: 100, y: 100 + i * 2, hp: 1 });
  }
  s.nextEnemyId = 5;
  // Piercing bullet moving upward through them (vy negative)
  s.bullets.push({
    id: 1, x: 100, y: 110,
    vx: 0, vy: -10,
    life: 1,
    damage: BULLET.gunnerDamage,
    piercing: true,
    pierceHits: 0,
  });
  const next = updateGameState(s, 0.016, NO_INPUT);
  // 3 killed (pierceMax), 1 survivor
  expect(next.enemies).toHaveLength(1);
});
```

Run: `npx vitest run tests/GameState.test.ts -t "piercing"`
Expected: FAIL — piercing logic not yet implemented.

- [ ] **Step 3: Implement piercing flag on gunner shot**

In `GameState.ts` gunner-fire branch (after Step 1 of Task 1), extend to:

```ts
state.bullets.push({
  id: state.nextBulletId++,
  x: ship.x,
  y: ship.y - SHIP.bodyHeight / 2,
  vx,
  vy,
  life: BULLET.maxLifetime,
  damage: BULLET.gunnerDamage,
  ...(ship.upgradeActive ? { piercing: true, pierceHits: 0 } : {}),
});
```

- [ ] **Step 4: Implement piercing behavior in bullet-vs-enemy block**

Around line 293 in `GameState.ts`, replace:

```ts
for (const e of state.enemies) {
  const er = enemyRadius(e.type);
  for (const b of state.bullets) {
    if (b.enemy) continue;
    if (circlesOverlap(b.x, b.y, BULLET.radius + (b.radiusBonus ?? 0), e.x, e.y, er)) {
      const dmg = b.damage;
      e.hp -= dmg;
      b.life = 0;
      if (e.hp <= 0) {
        state.score += enemyScore(e.type);
        break;
      }
    }
  }
}
```

with:

```ts
for (const e of state.enemies) {
  const er = enemyRadius(e.type);
  for (const b of state.bullets) {
    if (b.enemy) continue;
    if (e.hp <= 0) continue;
    if (circlesOverlap(b.x, b.y, BULLET.radius + (b.radiusBonus ?? 0), e.x, e.y, er)) {
      e.hp -= b.damage;
      if (b.piercing) {
        b.pierceHits = (b.pierceHits ?? 0) + 1;
        if (b.pierceHits >= BONUS.pierceMax) b.life = 0;
      } else {
        b.life = 0;
      }
      if (e.hp <= 0) {
        state.score += enemyScore(e.type);
      }
    }
  }
}
```

Note the `if (e.hp <= 0) continue;` guard: a piercing bullet may traverse multiple enemies on the same tick, but once an enemy is dead we don't double-score or re-hit it with the same bullet.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/GameState.test.ts`
Expected: All green.

- [ ] **Step 6: Commit**

```bash
git add src/game/GameState.ts tests/GameState.test.ts
git commit -m "feat(game): gunner Beam-Laser upgrade pierces through enemies"
```

---

## Task 4: Bonus Drop Logic in WaveSpawner

Adds guaranteed + random + boss-wave bonus drops, and clears `ship.upgradeActive` at wave boundaries.

**Files:**
- Modify: `src/game/WaveSpawner.ts`
- Modify: `tests/WaveSpawner.test.ts`

- [ ] **Step 1: Write failing test — bonus drops after 50% wave kills**

Add to `tests/WaveSpawner.test.ts`:

```ts
it("drops a bonus pickup after 50% of wave kills", () => {
  const spawner = createWaveSpawner();
  const state = createInitialState();
  // Simulate killing half the wave
  spawner.killsThisWave = Math.ceil(WAVE.enemiesPerWave * 0.5);
  tickWaveSpawner(spawner, state, 0.016);
  const bonus = state.pickups.find(p => p.kind === "bonus");
  expect(bonus).toBeDefined();
});

it("does not drop a second bonus in the same wave", () => {
  const spawner = createWaveSpawner();
  const state = createInitialState();
  spawner.killsThisWave = WAVE.enemiesPerWave;
  spawner.bonusDroppedInWave = true;
  tickWaveSpawner(spawner, state, 0.016);
  const bonuses = state.pickups.filter(p => p.kind === "bonus");
  expect(bonuses).toHaveLength(0);
});

it("clears ship.upgradeActive when wave advances", () => {
  const spawner = createWaveSpawner();
  const state = createInitialState();
  state.ship.upgradeActive = true;
  // Enough spawns + kills to finish a wave
  for (let i = 0; i < WAVE.enemiesPerWave + 2; i++) {
    tickWaveSpawner(spawner, state, WAVE.spawnInterval + 0.01);
  }
  state.enemies = [];
  tickWaveSpawner(spawner, state, 0.016);
  expect(spawner.wave).toBe(2);
  expect(state.ship.upgradeActive).toBe(false);
});
```

Add to imports at the top of the file:

```ts
// (WAVE is already imported)
```

Run: `npx vitest run tests/WaveSpawner.test.ts -t "bonus"`
Expected: FAIL — `killsThisWave`/`bonusDroppedInWave` don't exist yet.

- [ ] **Step 2: Extend `WaveSpawner` type and initializer**

In `src/game/WaveSpawner.ts`:

```ts
export type WaveSpawner = {
  spawnTimer: number;
  wave: number;
  spawned: number;
  bossActive: boolean;
  heartTimer: number;
  bonusDroppedInWave: boolean;   // NEW
  killsThisWave: number;         // NEW
  prevEnemyIds: Set<number>;     // NEW — for kill detection
};

export function createWaveSpawner(): WaveSpawner {
  return {
    spawnTimer: 1.5,
    wave: 1,
    spawned: 0,
    bossActive: false,
    heartTimer: HEART.spawnIntervalMin,
    bonusDroppedInWave: false,
    killsThisWave: 0,
    prevEnemyIds: new Set<number>(),
  };
}
```

Import `BONUS` at the top:

```ts
import {
  WAVE, ENEMY_DRONE, ENEMY_HUNTER,
  ENEMY_BOSS, ENEMY_BOSS_STRAFER, ENEMY_BOSS_SPLITTER, ENEMY_BOSS_CHARGER,
  HEART, BONUS, PLAYFIELD, isBossType,
} from "./constants";
```

- [ ] **Step 3: Add kill detection + bonus drop trigger**

At the top of `tickWaveSpawner` (before any existing logic), add:

```ts
// Count kills this wave by diffing enemy ids since last tick.
// An id that was present before but is absent now → killed (off-screen drones
// are also filtered, but those are rare enough that we accept the noise —
// the 50% threshold is a floor, early drops can happen via random trigger).
const currentIds = new Set(state.enemies.map(e => e.id));
for (const prevId of spawner.prevEnemyIds) {
  if (!currentIds.has(prevId)) {
    spawner.killsThisWave++;
    // Per-kill random drop chance
    if (
      !spawner.bonusDroppedInWave &&
      !state.ship.upgradeActive &&
      Math.random() < BONUS.randomDropChance
    ) {
      spawnBonus(spawner, state);
    }
  }
}
spawner.prevEnemyIds = currentIds;

// Guaranteed drop at 50% of wave kills
const threshold = Math.ceil(WAVE.enemiesPerWave * BONUS.dropThreshold);
if (
  !spawner.bonusDroppedInWave &&
  !state.ship.upgradeActive &&
  spawner.killsThisWave >= threshold
) {
  spawnBonus(spawner, state);
}

// Boss-wave drop: when the boss crosses 50% HP
if (isBossWave(spawner.wave) && !spawner.bonusDroppedInWave) {
  const boss = state.enemies.find(e => isBossType(e.type));
  if (boss && boss.hp <= bossMaxHp(boss.type) * BONUS.bossDropHpFraction) {
    spawnBonus(spawner, state);
  }
}
```

Add the helper functions at the bottom of the file:

```ts
function isBossWave(wave: number): boolean {
  return wave % WAVE.bossEveryN === 0;
}

function bossMaxHp(type: number): number {
  switch (type) {
    case 2: return ENEMY_BOSS.maxHp;
    case 3: return ENEMY_BOSS_STRAFER.maxHp;
    case 4: return ENEMY_BOSS_SPLITTER.maxHp;
    case 5: return ENEMY_BOSS_CHARGER.maxHp;
    default: return 1;
  }
}

function spawnBonus(spawner: WaveSpawner, state: import("./GameState").GameState): void {
  const margin = BONUS.swayAmplitude + 20;
  const baseX = margin + Math.random() * (PLAYFIELD.width - margin * 2);
  state.pickups.push({
    id: state.nextPickupId++,
    kind: "bonus",
    x: baseX,
    y: -BONUS.height,
    baseX,
    age: 0,
  });
  spawner.bonusDroppedInWave = true;
}
```

- [ ] **Step 4: Reset per-wave state on `wave++` and clear upgrade**

In `tickWaveSpawner`, there are two places where `spawner.wave++` happens (boss-wave clear + normal-wave clear). Add the reset at both:

Boss-wave clear branch:

```ts
if (spawner.bossActive && !state.enemies.some(e => isBossType(e.type))) {
  spawner.bossActive = false;
  spawner.wave++;
  spawner.spawned = 0;
  spawner.bonusDroppedInWave = false;
  spawner.killsThisWave = 0;
  state.ship.upgradeActive = false;
}
```

Normal-wave clear branch:

```ts
if (spawner.spawned >= WAVE.enemiesPerWave) {
  if (state.enemies.length === 0) {
    spawner.wave++;
    spawner.spawned = 0;
    spawner.bonusDroppedInWave = false;
    spawner.killsThisWave = 0;
    state.ship.upgradeActive = false;
  }
  return;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/WaveSpawner.test.ts`
Expected: All green (old + 3 new tests).

- [ ] **Step 6: Run full test suite + typecheck**

Run: `npm run typecheck && npm test`
Expected: All green.

- [ ] **Step 7: Commit**

```bash
git add src/game/WaveSpawner.ts tests/WaveSpawner.test.ts
git commit -m "feat(game): bonus pickup drops (guaranteed + random + boss) and wave-end upgrade expiry"
```

---

## Task 5: Snapshot + Protocol Extension

Carries `ship.upgradeActive`, `pickup.kind`, and `bullet.piercing` across the network so the gunner client renders correctly.

**Files:**
- Modify: `src/network/Protocol.ts`
- Modify: `src/network/Snapshot.ts`
- Modify: `tests/Snapshot.test.ts`
- Modify: `tests/Protocol.test.ts`

- [ ] **Step 1: Extend `SnapshotData` type**

In `src/network/Protocol.ts`:

```ts
export type SnapshotData = {
  ship: { x: number; y: number; hp: number; turretAngle: number; upgradeActive: boolean };
  bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number; enemy?: boolean; piercing?: boolean }>;
  enemies: Array<{ id: number; type: number; x: number; y: number; hp: number }>;
  pickups: Array<{ id: number; kind: "heart" | "bonus"; x: number; y: number }>;
  score: number;
  wave: number;
  gameOver: boolean;
};
```

- [ ] **Step 2: Update `serializeSnapshot` and `applySnapshot`**

In `src/network/Snapshot.ts`, `serializeSnapshot`:

```ts
ship: {
  x: state.ship.x,
  y: state.ship.y,
  hp: state.ship.hp,
  turretAngle: state.ship.turretAngle,
  upgradeActive: state.ship.upgradeActive,
},
bullets: state.bullets.map(b => ({
  id: b.id,
  x: b.x, y: b.y,
  vx: b.vx, vy: b.vy,
  ...(b.enemy ? { enemy: true } : {}),
  ...(b.piercing ? { piercing: true } : {}),
})),
```

and `applySnapshot`:

```ts
ship: {
  x: snap.ship.x,
  y: snap.ship.y,
  hp: snap.ship.hp,
  turretAngle: snap.ship.turretAngle,
  fireCooldown: 0,
  heat: 0,
  overheated: false,
  gunnerFireCooldown: 0,
  upgradeActive: snap.ship.upgradeActive,
},
bullets: snap.bullets.map(b => ({
  id: b.id,
  x: b.x, y: b.y,
  vx: b.vx, vy: b.vy,
  life: 1,
  damage: 0,                    // client-only render state, collision runs on host
  enemy: b.enemy,
  piercing: b.piercing,
})),
```

- [ ] **Step 3: Update test fixtures to include new required fields**

In `tests/Snapshot.test.ts`, the `serializeSnapshot` round-trip tests now produce snapshots with `upgradeActive: false` on `ship`. The existing assertions will still pass, but add an explicit test:

```ts
it("round-trips ship.upgradeActive", () => {
  const state = createInitialState();
  state.ship.upgradeActive = true;
  const snap = serializeSnapshot(state, 1);
  expect(snap.ship.upgradeActive).toBe(true);
  const restored = applySnapshot(snap);
  expect(restored.ship.upgradeActive).toBe(true);
});

it("round-trips bonus pickups", () => {
  const state = createInitialState();
  state.pickups.push({ id: 1, kind: "bonus", x: 100, y: 50, baseX: 100, age: 0 });
  const snap = serializeSnapshot(state, 1);
  expect(snap.pickups[0].kind).toBe("bonus");
  const restored = applySnapshot(snap);
  expect(restored.pickups[0].kind).toBe("bonus");
});

it("round-trips piercing bullets", () => {
  const state = createInitialState();
  state.bullets.push({
    id: 1, x: 10, y: 20, vx: 0, vy: -540, life: 1,
    damage: BULLET.gunnerDamage, piercing: true, pierceHits: 0,
  });
  const snap = serializeSnapshot(state, 1);
  expect(snap.bullets[0].piercing).toBe(true);
});
```

In `tests/Protocol.test.ts`, the existing "round-trips a snapshot message" test uses `ship: { x, y, hp, turretAngle }` — add `upgradeActive: false`:

```ts
state: {
  ship: { x: 100, y: 200, hp: 80, turretAngle: 1.5, upgradeActive: false },
  ...
}
```

- [ ] **Step 4: Run tests**

Run: `npm run typecheck && npm test`
Expected: All green.

- [ ] **Step 5: Commit**

```bash
git add src/network/Protocol.ts src/network/Snapshot.ts tests/Snapshot.test.ts tests/Protocol.test.ts
git commit -m "feat(net): sync ship.upgradeActive, pickup.kind, bullet.piercing"
```

---

## Task 6: AudioSampleBank

New class that decodes MP3 samples from `public/audios/` and plays them through the shared compressor graph. Graceful fallback when decode fails or samples aren't loaded yet.

**Files:**
- Create: `src/audio/AudioSampleBank.ts`

- [ ] **Step 1: Create `AudioSampleBank`**

Create `src/audio/AudioSampleBank.ts`:

```ts
// Loads and plays MP3 samples through a shared AudioContext + destination node.
// Samples decode on `preload()`; `play()` returns false if the sample isn't
// ready so the caller can synth-fallback.

export class AudioSampleBank {
  private ctx: AudioContext;
  private destination: AudioNode;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<void>>();

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
  }

  preload(names: string[]): Promise<void> {
    return Promise.all(names.map(n => this.loadOne(n))).then(() => undefined);
  }

  private loadOne(name: string): Promise<void> {
    if (this.buffers.has(name)) return Promise.resolve();
    const existing = this.loading.get(name);
    if (existing) return existing;
    const p = fetch(`/audios/${name}.mp3`)
      .then(r => {
        if (!r.ok) throw new Error(`fetch ${name}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buf => this.ctx.decodeAudioData(buf))
      .then(buffer => { this.buffers.set(name, buffer); })
      .catch(err => {
        console.warn(`[AudioSampleBank] failed to load ${name}:`, err);
      });
    this.loading.set(name, p);
    return p;
  }

  isReady(name: string): boolean {
    return this.buffers.has(name);
  }

  play(name: string, opts?: { gain?: number; loop?: boolean }): AudioBufferSourceNode | null {
    const buf = this.buffers.get(name);
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts?.loop ?? false;
    const gain = this.ctx.createGain();
    gain.gain.value = opts?.gain ?? 1.0;
    src.connect(gain);
    gain.connect(this.destination);
    src.start();
    return src;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/audio/AudioSampleBank.ts
git commit -m "feat(audio): AudioSampleBank for MP3 playback through shared graph"
```

---

## Task 7: SoundEngine Integration (Hybrid Sample/Synth)

Add sample-aware methods, keep synth fallback for every event.

**Files:**
- Modify: `src/audio/SoundEngine.ts`

- [ ] **Step 1: Wire up `AudioSampleBank` inside `SoundEngine`**

In `src/audio/SoundEngine.ts`, add the import and a private field:

```ts
import { AudioSampleBank } from "./AudioSampleBank";

// ...inside the class:
private bank: AudioSampleBank | null = null;
```

Modify `getCtx()` to create the bank after the compressor node exists and kick off preload:

```ts
private getCtx(): AudioContext {
  if (!this.ctx) {
    this.ctx = new AudioContext();
    this.compNode = this.ctx.createDynamicsCompressor();
    this.compNode.connect(this.ctx.destination);
    this.delayNode = this.ctx.createDelay(0.2);
    this.delayNode.delayTime.value = 0.08;
    this.feedbackNode = this.ctx.createGain();
    this.feedbackNode.gain.value = 0.3;
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.compNode);
    this.bank = new AudioSampleBank(this.ctx, this.compNode);
    void this.bank.preload([
      "laser_shoot_tiny",
      "shot-ship",
      "shot-ship_mega-gun",
      "laser_shoot_long",
      "heart_collect",
      "bonus_collect",
      "level_win",
    ]);
  }
  return this.ctx;
}

getBank(): AudioSampleBank | null {
  this.getCtx();
  return this.bank;
}
```

- [ ] **Step 2: Add new sample-aware methods**

Append to the class body (after `play()`):

```ts
playPilotShot(upgraded: boolean): void {
  if (this._muted) return;
  this.getCtx();
  const name = upgraded ? "shot-ship_mega-gun" : "laser_shoot_tiny";
  if (this.bank?.play(name, { gain: 0.7 })) return;
  // Synth fallback
  this.layeredOsc("square", upgraded ? 600 : 880, 0.12, upgraded ? 0.10 : 0.06, {
    freqEnd: upgraded ? 300 : 440, layers: 1, filterFreq: 2500,
  });
}

playGunnerShot(upgraded: boolean): void {
  if (this._muted) return;
  this.getCtx();
  const name = upgraded ? "laser_shoot_long" : "shot-ship";
  if (this.bank?.play(name, { gain: 0.7 })) return;
  // Synth fallback
  this.layeredOsc("sawtooth", 330, 0.15, upgraded ? 0.2 : 0.1, {
    freqEnd: 220, layers: 2, detune: 10, filterFreq: 1800, reverb: true,
  });
}

playHeartCollect(): void {
  if (this._muted) return;
  this.getCtx();
  if (this.bank?.play("heart_collect", { gain: 0.8 })) return;
  this.layeredOsc("sine", 660, 0.2, 0.2, { freqEnd: 1320, filterFreq: 4000 });
}

playBonusCollect(): void {
  if (this._muted) return;
  this.getCtx();
  if (this.bank?.play("bonus_collect", { gain: 0.9 })) return;
  // Synth fallback: triumphant arpeggio
  const ctx = this.getCtx();
  const t = ctx.currentTime;
  [660, 880, 1320].forEach((f, i) => {
    setTimeout(() => {
      if (this._muted) return;
      this.layeredOsc("sine", f, 0.2, 0.15, { filterFreq: 4500 });
    }, i * 80);
  });
  void t;
}

playWaveClear(): void {
  if (this._muted) return;
  this.getCtx();
  if (this.bank?.play("level_win", { gain: 0.8 })) return;
  this.layeredOsc("square", 880, 0.2, 0.15, { freqEnd: 1760, filterFreq: 3000 });
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/audio/SoundEngine.ts
git commit -m "feat(audio): SoundEngine sample methods with synth fallback"
```

---

## Task 8: MusicEngine Boss Theme Switching

Add `switchToBossTheme` / `switchToNormalTheme` with a 0.5s gain crossfade. The boss theme is a looping sample; the normal theme is the existing procedural arp.

**Files:**
- Modify: `src/audio/MusicEngine.ts`

- [ ] **Step 1: Add sample playback fields + methods**

In `src/audio/MusicEngine.ts`, add to the class:

```ts
import { AudioSampleBank } from "./AudioSampleBank";

// New class fields (place after existing ones):
private bank: AudioSampleBank | null = null;
private bossSource: AudioBufferSourceNode | null = null;
private bossGain: GainNode | null = null;
private onBossTheme = false;
```

Extend `start()` to build the bank and preload:

```ts
start(): void {
  if (!this.ctx) {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._muted ? 0 : 0.10;
    this.masterGain.connect(this.ctx.destination);
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.05);
    this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.bank = new AudioSampleBank(this.ctx, this.masterGain);
    void this.bank.preload(["boss-fight-theme"]);
  }
  this.scheduleInterval();
}
```

Extend `stop()` to clean up the boss source:

```ts
stop(): void {
  if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
  for (const o of this.padOscs) { try { o.stop(); } catch { /* noop */ } }
  this.padOscs = [];
  this.padGain = null;
  if (this.bossSource) { try { this.bossSource.stop(); } catch { /* noop */ } this.bossSource = null; }
  this.bossGain = null;
  if (this.ctx) { void this.ctx.close(); this.ctx = null; this.masterGain = null; this.noiseBuffer = null; this.bank = null; }
  this.step = 0;
  this.totalSteps = 0;
  this.patternB = false;
  this.onBossTheme = false;
}
```

Add the two new methods:

```ts
switchToBossTheme(): void {
  if (!this.ctx || !this.masterGain || !this.bank || this.onBossTheme) return;
  this.onBossTheme = true;
  const t = this.ctx.currentTime;
  // Fade out the procedural arp by silencing the masterGain pad/arp path is not
  // easily decoupled — instead, mute the arp by stopping the step scheduler and
  // fading the masterGain down, then starting the boss source at full volume.
  if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
  // Start the boss theme through its own gain node for independent control
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(this._muted ? 0 : 0.22, t + 0.5);
  g.connect(this.ctx.destination);
  const src = this.bank.play("boss-fight-theme", { loop: true, gain: 1.0 });
  if (src) {
    try { src.disconnect(); } catch { /* noop */ }
    src.connect(g);
  }
  this.bossSource = src;
  this.bossGain = g;
  // Fade down the arp/pad master
  this.masterGain.gain.cancelScheduledValues(t);
  this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
  this.masterGain.gain.linearRampToValueAtTime(0, t + 0.5);
}

switchToNormalTheme(): void {
  if (!this.ctx || !this.masterGain || !this.onBossTheme) return;
  this.onBossTheme = false;
  const t = this.ctx.currentTime;
  // Fade out boss source
  if (this.bossGain) {
    this.bossGain.gain.cancelScheduledValues(t);
    this.bossGain.gain.setValueAtTime(this.bossGain.gain.value, t);
    this.bossGain.gain.linearRampToValueAtTime(0, t + 0.5);
  }
  const bossSrc = this.bossSource;
  setTimeout(() => { try { bossSrc?.stop(); } catch { /* noop */ } }, 520);
  this.bossSource = null;
  this.bossGain = null;
  // Fade master back up and restart step scheduler
  this.masterGain.gain.cancelScheduledValues(t);
  this.masterGain.gain.setValueAtTime(0, t);
  this.masterGain.gain.linearRampToValueAtTime(this._muted ? 0 : 0.10, t + 0.5);
  if (this.intervalId === null) this.scheduleInterval();
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/audio/MusicEngine.ts
git commit -m "feat(audio): MusicEngine boss-theme switch with 0.5s crossfade"
```

---

## Task 9: Renderer — Bonus Pickup + Upgrade Aura

Render the bonus pickup using the existing `powerup` sprite (yellow/white crystal), and draw a gold aura around the ship while `upgradeActive`.

**Files:**
- Modify: `src/ui/Renderer.ts`

- [ ] **Step 1: Branch `drawPickups` on kind**

In `src/ui/Renderer.ts`, replace the existing `drawPickups` (around line 308):

```ts
private drawPickups(state: GameState): void {
  for (const p of state.pickups) {
    const pulse = 1 + Math.sin(p.age * 6) * 0.08;
    const size = SS * pulse;
    if (p.kind === "bonus") {
      this.drawSpriteGlow("powerup", p.x - size / 2, p.y - size / 2, COLORS.yellow);
    } else {
      this.drawSpriteGlow("heart", p.x - size / 2, p.y - size / 2, COLORS.magenta);
    }
  }
}
```

- [ ] **Step 2: Draw upgrade aura behind the ship**

In `drawShip` (around line 282), add an aura pass before the sprite:

```ts
private drawShip(state: GameState): void {
  const { x, y, turretAngle, upgradeActive } = state.ship;
  if (upgradeActive) {
    const ctx = this.ctx;
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);
    const r = SS * 0.9 + pulse * 4;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255, 255, 0, ${0.35 + pulse * 0.15})`);
    grad.addColorStop(0.6, `rgba(255, 200, 0, ${0.12})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  this.drawSpriteGlow("ship", x - SS / 2, y - SS / 2, upgradeActive ? COLORS.yellow : COLORS.cyan);

  const ctx = this.ctx;
  ctx.save();
  ctx.translate(x, y - SS / 2);
  ctx.rotate(turretAngle);
  this.drawSpriteGlow("turret", -SS / 2, -SS, upgradeActive ? COLORS.yellow : COLORS.magenta);
  ctx.restore();
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Renderer.ts
git commit -m "feat(ui): draw bonus pickup + gold aura while upgrade active"
```

---

## Task 10: GameScreen — Wire Sample Triggers + Boss Theme

Replace the existing `sound.play("pilotShoot"|"gunnerShoot"|"coolReady"|"waveStart")` calls with the new sample-aware methods. Swap music on boss-wave transitions. Play `level_win.mp3` on non-boss wave clear. Play `bonus_collect.mp3` / `heart_collect.mp3` on pickup collection.

**Files:**
- Modify: `src/ui/GameScreen.ts`

- [ ] **Step 1: Track the previous bonus-pickup presence to detect collection**

The existing code at `GameScreen.ts` line 274 detects collected pickups via `prevPickupY` but uses a single `coolReady` sound. Replace with kind-aware logic.

Add a field to remember each pickup's kind at the top of the class (near `prevPickupY`):

```ts
private prevPickupKind = new Map<number, "heart" | "bonus">();
```

In `render()`, replace the pickup-detection block:

```ts
// Detect collected pickups → correct sample per kind
const currentPickupIds = new Set(this.state.pickups.map(p => p.id));
for (const [id, prevKind] of this.prevPickupKind) {
  const lastY = this.prevPickupY.get(id);
  if (!currentPickupIds.has(id) && lastY !== undefined && lastY < PLAYFIELD.height) {
    if (prevKind === "bonus") this.sound.playBonusCollect();
    else this.sound.playHeartCollect();
  }
}
this.prevPickupKind.clear();
this.prevPickupY.clear();
for (const p of this.state.pickups) {
  this.prevPickupY.set(p.id, p.y);
  this.prevPickupKind.set(p.id, p.kind);
}
```

- [ ] **Step 2: Replace pilot/gunner shot triggers**

Replace the bullet-detection block (around line 286):

```ts
// Detect new bullets → shooting sounds
const bulletCount = this.state.bullets.length;
if (bulletCount > this.prevBulletCount) {
  const newest = this.state.bullets[this.state.bullets.length - 1];
  if (newest.enemy) {
    this.sound.play("bossShoot");
  } else if (newest.vx === 0) {
    // Pilot shot; Mega-Gun when upgrade active
    this.sound.playPilotShot(this.state.ship.upgradeActive);
  } else {
    // Gunner shot; Beam-Laser when piercing flag present
    this.sound.playGunnerShot(!!newest.piercing);
  }
}
this.prevBulletCount = bulletCount;
```

- [ ] **Step 3: Wave-clear fanfare + boss theme swap**

Replace the existing wave-change block (around line 300):

```ts
// Detect wave change
if (this.spawner.wave > this.prevWave) {
  this.sound.play("waveStart");
  this.music.setBpm(100 + (this.spawner.wave - 1) * 5);
  // Previous wave was a boss wave → play fanfare only for non-boss transitions
  const prevWasBoss = this.prevWave % WAVE.bossEveryN === 0;
  const nowIsBoss = this.spawner.wave % WAVE.bossEveryN === 0;
  if (!prevWasBoss) {
    this.sound.playWaveClear();
  }
  if (nowIsBoss) {
    this.music.switchToBossTheme();
  } else if (prevWasBoss) {
    this.music.switchToNormalTheme();
  }
  this.prevWave = this.spawner.wave;
}
```

- [ ] **Step 4: Typecheck + run full test suite**

Run: `npm run typecheck && npm test`
Expected: All green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/GameScreen.ts
git commit -m "feat(ui): wire sample-aware sound triggers and boss-theme music swap"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Full build + typecheck**

Run: `npm run build`
Expected: Build succeeds, no type errors, no bundle failures.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests green.

- [ ] **Step 3: Manual E2E checklist (user runs `npm run dev` themselves)**

Ask the user to verify in a browser:

- [ ] Pilot default shots play `laser_shoot_tiny.mp3`
- [ ] Gunner default shots play `shot-ship.mp3`
- [ ] Heart pickup plays `heart_collect.mp3` on collection
- [ ] Bonus pickup (gold crystal) appears after ~4 kills in wave 1
- [ ] Bonus collection plays `bonus_collect.mp3`
- [ ] While upgraded: ship has gold aura, pilot shots use Mega-Gun sample + deal 2× damage, gunner shots use Beam-Laser sample + pierce 3 enemies
- [ ] Upgrade expires at wave boundary (aura gone, sounds revert)
- [ ] Wave 1→2 and 2→3 transitions play `level_win.mp3`
- [ ] Wave 5 (boss): boss-fight theme crossfades in, bonus drops at 50% boss HP
- [ ] After boss kill: normal music fades back in, no `level_win.mp3` (boss-kill synth covers it)

- [ ] **Step 4: No final commit unless the user reports issues to fix.**

---

## Self-Review Checklist (used once, before handoff)

Spec coverage (all items from `2026-04-17-audio-and-upgrades-design.md`):
- Audio-mapping table → Tasks 7, 10
- AudioSampleBank architecture → Task 6
- SoundEngine extension → Task 7
- MusicEngine boss theme → Task 8
- Pickup.kind widening + Ship.upgradeActive + Bullet.damage/piercing → Tasks 1, 2, 3
- WaveSpawner drop + expiry → Task 4
- Renderer bonus sprite + aura → Task 9
- GameScreen wiring → Task 10
- Protocol/Snapshot sync → Task 5
- Constants block (BONUS) → Task 1
- Heart drop behavior unchanged → preserved (Task 2 Step 4 keeps HEART behavior untouched)

Placeholder scan: None. All code steps contain concrete diffs. All test steps contain full test code.

Type consistency:
- `ship.upgradeActive: boolean` — consistent across GameState.ts, Snapshot.ts, Protocol.ts.
- `Pickup.kind: "heart" | "bonus"` — consistent.
- `Bullet.damage: number` (required), `Bullet.piercing?: boolean`, `Bullet.pierceHits?: number`, `Bullet.radiusBonus?: number` — consistent.
- `BONUS.pierceMax = 3` referenced in Task 3.
- `BONUS.dropThreshold = 0.5` referenced in Task 4.
- `switchToBossTheme` / `switchToNormalTheme` — consistent across Task 8 definition and Task 10 consumption.
