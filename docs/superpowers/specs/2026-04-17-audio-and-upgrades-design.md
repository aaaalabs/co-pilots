# Audio Samples + Weapon Upgrades — Design

Date: 2026-04-17
Status: Approved, pending implementation plan.

## Goal

Integrate the eight new MP3 assets in `public/audios/` into the game, and introduce a role-specific weapon-upgrade system driven by a new "bonus" pickup. The feature should maximize arcade-fun (big audible payoff, clear co-op hype moments) without adding HUD complexity.

## Audio Asset Mapping

High-frequency hit/kill events stay synthesized — sampling them at 10×/sec would fatigue the player and inflate bundle size. Hero moments switch to samples.

| Game Event | Asset | Notes |
|---|---|---|
| Pilot default shot | `laser_shoot_tiny.mp3` | Replaces synth `pilotShoot` |
| Pilot shot while upgraded (Mega-Gun) | `shot-ship_mega-gun.mp3` | Fired only when `ship.upgradeActive` |
| Gunner default shot | `shot-ship.mp3` | Replaces synth `gunnerShoot` |
| Gunner shot while upgraded (Beam-Laser) | `laser_shoot_long.mp3` | Fired only when `ship.upgradeActive` |
| Heart pickup collect | `heart_collect.mp3` | Replaces synth on heart pickup |
| Bonus pickup collect | `bonus_collect.mp3` | New event |
| Non-boss wave clear | `level_win.mp3` | New event, fires on `wave++` when not a boss wave |
| Boss-wave music | `boss-fight-theme.mp3` | Looping music layer, replaces normal theme during boss waves |
| Remaining synth events | — | `enemyHit`, `shipHit`, `bossShoot`, `enemyKill`, `bossKill`, `overheat`, `coolReady`, `waveStart` stay synthesized |

## Architecture

### New unit: `AudioSampleBank`

File: `src/audio/AudioSampleBank.ts` (~80 LoC).

Responsibilities:
- Loads named MP3 assets via `fetch` → `AudioContext.decodeAudioData` on first user gesture.
- Exposes `play(name, gain?)` that creates an `AudioBufferSourceNode`, connects it to the shared compressor node, and starts it.
- Graceful degradation: if decode fails or asset missing, caller receives `false` and can fall back to synth.

Interface:
```ts
class AudioSampleBank {
  constructor(ctx: AudioContext, destination: AudioNode);
  preload(names: string[]): Promise<void>;
  play(name: string, opts?: { gain?: number }): boolean;
  isReady(name: string): boolean;
}
```

Dependencies: shared `AudioContext` and compressor node from `SoundEngine`.

### Extended: `SoundEngine`

File: `src/audio/SoundEngine.ts` (existing).

Changes:
- Owns a private `AudioSampleBank` instance, built in `getCtx()` alongside the compressor.
- New public methods replace the old `play(name)` switch entries for events covered by samples:
  - `playPilotShot(upgraded: boolean)` → sample `laser_shoot_tiny` or `shot-ship_mega-gun`
  - `playGunnerShot(upgraded: boolean)` → sample `shot-ship` or `laser_shoot_long`
  - `playHeartCollect()`
  - `playBonusCollect()`
  - `playWaveClear()`
- Old synth entries for `pilotShoot`/`gunnerShoot` removed from the switch (callers migrated).
- Fallback: if `bank.play(...)` returns `false`, call the old synth path. Keeps dev-mode and asset-less envs working.

### Extended: `MusicEngine`

File: `src/audio/MusicEngine.ts` (existing).

Changes:
- New method `switchToBossTheme()` loads `boss-fight-theme.mp3` via the shared `AudioSampleBank` (single decode path, reused across SoundEngine and MusicEngine).
- New method `switchToNormalTheme()` returns to the previous procedural/synth track.
- Crossfade over ~0.5s via gain ramps on the two audio nodes.
- Called from the GameScreen wave-transition hook.

### Extended: `GameState`

File: `src/game/GameState.ts`.

Type changes:
```ts
export type Pickup = {
  id: number;
  kind: "heart" | "bonus";  // widened
  x: number;
  y: number;
  baseX: number;
  age: number;
};

export type Ship = {
  // ...existing fields
  upgradeActive: boolean;   // new — true while a weapon upgrade is in effect
};

export type Bullet = {
  // ...existing fields
  damage: number;           // new — per-bullet damage (removes vx-based branching in collision)
  piercing?: boolean;       // new — set on gunner bullets when upgraded
  pierceHits?: number;      // new — counts enemies already hit (max BONUS.pierceMax)
};
```

Logic changes:
- Pilot fire branch: when `ship.upgradeActive`, spawn bullet with `damage` effectively `BULLET.pilotDamage * BONUS.pilotDamageMultiplier` (2×) and enlarge hitbox radius by `BONUS.pilotRadiusBonus` (+4px). Implementation: carry the multiplier through the bullet-vs-enemy block (easier: new field `bullet.damage` set at spawn, so the collision block does not branch on upgrade state).
- Gunner fire branch: when `ship.upgradeActive`, set `piercing: true` on the bullet and initialize `pierceHits: 0`.
- Bullet-vs-enemy block: for piercing bullets, do NOT set `b.life = 0` on hit; increment `pierceHits` and zero it only when `pierceHits >= BONUS.pierceMax`. For non-piercing bullets behavior is unchanged.
- Pickup collection: on `kind === "bonus"` → set `ship.upgradeActive = true`. On `kind === "heart"` → existing heal behavior.
- The bullet collision block now uses per-bullet `damage` rather than `vx === 0 ? pilotDamage : gunnerDamage`. This is a small refactor that also makes future weapon tweaks trivial.

### Extended: `WaveSpawner`

File: `src/game/WaveSpawner.ts`.

State changes:
```ts
type WaveSpawner = {
  // ...existing fields
  bonusDroppedInWave: boolean;  // reset on wave++
  killsThisWave: number;        // incremented externally or derived
};
```

Logic changes:
- On `wave++`: set `bonusDroppedInWave = false`, `killsThisWave = 0`, and also clear `state.ship.upgradeActive = false` so the upgrade expires at wave boundaries as designed.
- Drop triggers (checked on every tick or on kill callback):
  - **Guaranteed (normal wave)**: when `killsThisWave >= WAVE.enemiesPerWave * BONUS.dropThreshold` (0.5) and `!bonusDroppedInWave && !ship.upgradeActive` → spawn bonus pickup at a random x, same sway mechanic as heart.
  - **Random (per kill)**: 3% chance (`BONUS.randomDropChance`) on any kill to spawn early, if `!bonusDroppedInWave && !ship.upgradeActive`.
  - **Boss wave**: when boss `hp <= maxHp * 0.5` and `!bonusDroppedInWave` → spawn one bonus pickup at boss `x`.
  - **Never** drop if `ship.upgradeActive` (avoids waste).
- Wave clear detection: when `wave++` happens on a non-boss wave, trigger `sound.playWaveClear()`. When `wave++` happens *after* a boss wave, trigger nothing (boss death already has `bossKill` synth).
- Kill counting: increment `killsThisWave` when an enemy transitions `hp > 0 → hp <= 0`. Either the WaveSpawner observes `state.enemies` diff each tick, or `GameState` passes a kill count back. Pick the diff approach to keep the responsibility in WaveSpawner.

### Extended: `Renderer`

File: `src/ui/Renderer.ts`.

Changes:
- Draw `Pickup.kind === "bonus"` as a gold/yellow pulsing star (4-point or 5-point star, ~18px radius, sin-based scale pulse on `age`).
- When `ship.upgradeActive`, draw a soft gold outline/aura around the ship (additive-blend circle, same `age`-based pulse).

### Extended: `GameScreen` and network layer

File: `src/ui/GameScreen.ts`.

Changes:
- Replace existing `sound.play("pilotShoot")` / `sound.play("gunnerShoot")` calls with the new shot methods, passing `ship.upgradeActive`.
- Detect pickup collection transitions (or emit from GameState) to call `playHeartCollect()` / `playBonusCollect()`.
- Detect wave transition to call `playWaveClear()` / `MusicEngine.switchToBossTheme()` / `switchToNormalTheme()`.

File: `src/network/Protocol.ts`, `src/network/Snapshot.ts`.

Changes:
- Add `upgradeActive` bit to the `Ship` encoding.
- Extend pickup encoding with 1 bit for `kind` (heart=0, bonus=1).
- Update `tests/Protocol.test.ts` / `tests/Snapshot.test.ts` to cover the new bits.

### Constants additions

File: `src/game/constants.ts`.

```ts
export const BONUS = {
  radius: 18,                  // pickup collision radius
  width: 30,
  height: 30,
  fallSpeed: 50,
  swayFrequency: 2.0,
  swayAmplitude: 20,
  dropThreshold: 0.5,          // fraction of wave kills before guaranteed drop
  randomDropChance: 0.03,      // per-kill chance for early drop
  bossDropHpFraction: 0.5,     // boss drops one bonus at ≤50% HP
  pilotDamageMultiplier: 2,    // Mega-Gun damage multiplier
  pilotRadiusBonus: 4,         // Mega-Gun hitbox radius bonus
  pierceMax: 3,                // Beam-Laser: max enemies per shot
};
```

## Data Flow

Host authoritative (existing pattern):
1. Host WaveSpawner decides when to spawn a bonus pickup → pushes into `state.pickups`.
2. Host GameState detects collision between ship and bonus pickup → sets `ship.upgradeActive = true`.
3. Snapshot encodes `ship.upgradeActive` + pickup `kind` bits → sent to clients.
4. Client decodes snapshot → Renderer draws bonus pickup + aura; GameScreen observes transition and plays `bonus_collect.mp3` locally.
5. When local ship fires, GameScreen reads local `ship.upgradeActive` (client-rendered) and picks the sample + passes upgrade flag to prediction. (Since firing-sound is cosmetic, eventual consistency is fine — a one-frame mismatch is inaudible.)

## Error Handling

- Audio decode failure: SoundEngine falls back to existing synth for the affected event. The game never blocks on asset load.
- Missing asset (404): logged once to console, same fallback.
- Locked AudioContext before first gesture: existing pattern in SoundEngine (`getCtx()` on first `play`) continues to apply. SampleBank preloads on first gesture.
- Network loss: upgrade state is host-owned, so a disconnected client sees stale state until re-sync — same behavior as other ship state.

## Testing

- **Unit (existing pattern in `tests/`)**:
  - `tests/Snapshot.test.ts` + `tests/Protocol.test.ts` — new bits round-trip correctly.
  - New test `tests/WaveSpawner.test.ts` (if not present) — bonus drops at 50% kills, doesn't double-drop, doesn't drop during active upgrade.
  - New test `tests/GameState.test.ts` entry — piercing bullet hits up to `pierceMax` enemies, pilot damage doubles while upgraded.
- **Integration / manual**:
  - Play through a wave, confirm bonus drops around kill 5/10, pickup plays sample, pilot shot switches to mega-gun sample, gunner shot pierces.
  - Trigger boss wave, confirm boss-theme music switches in, confirm boss drops a bonus at half-HP.
  - Wave clear plays `level_win.mp3` on non-boss waves only.

## Out of Scope

- New HUD widget for upgrade timer (duration tied to wave, so none needed).
- Permanent/stacking upgrades (this is a duration design, not a roguelike).
- Changes to heart-pickup drop behavior: hearts continue to drop only while `ship.hp < HEART.spawnHpThreshold`, unchanged.
- Per-player upgrade (both roles get their respective upgrade together — design decision already made).
- Additional pickup types beyond heart + bonus.

## KISS Checks

- [CP01/CP02] AudioSampleBank is a single focused class; SoundEngine extension is additive.
- [CS03] Each file stays small: AudioSampleBank ~80 LoC, WaveSpawner diff ~30 LoC, GameState diff ~40 LoC.
- [CS05] No file approaches 400 LoC after changes.
- [PS02] No refactor beyond the per-bullet `damage` field, which pays for itself in collision simplicity.
