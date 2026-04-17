import { describe, it, expect } from "vitest";
import { createWaveSpawner, tickWaveSpawner } from "../src/game/WaveSpawner";
import { createInitialState } from "../src/game/GameState";
import { WAVE, ENEMY_DRONE, PLAYFIELD } from "../src/game/constants";

describe("WaveSpawner", () => {
  it("spawns no enemies before the initial timer elapses", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, 0.5);
    expect(state.enemies).toHaveLength(0);
  });

  it("spawns one enemy after the initial timer elapses", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, 2.0); // enough for initial 1.5s timer
    expect(state.enemies.length).toBeGreaterThanOrEqual(1);
  });

  it("spawns enemies at the top of the playfield", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, 2.0);
    const e = state.enemies[0];
    expect(e.y).toBeLessThan(0);
  });

  it("spawns enemies within playfield horizontal bounds", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    for (let i = 0; i < 20; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval + 0.01);
    }
    for (const e of state.enemies) {
      expect(e.x).toBeGreaterThanOrEqual(WAVE.spawnEdgeMargin);
      expect(e.x).toBeLessThanOrEqual(PLAYFIELD.width - WAVE.spawnEdgeMargin);
    }
  });

  it("spawned drones have correct HP", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    tickWaveSpawner(spawner, state, 2.0);
    // Wave 1 only has drones (type 0)
    const drones = state.enemies.filter(e => e.type === 0);
    expect(drones.length).toBeGreaterThan(0);
    for (const d of drones) {
      expect(d.hp).toBe(ENEMY_DRONE.maxHp);
    }
  });

  it("assigns unique ids", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    for (let i = 0; i < 5; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval + 0.01);
    }
    const ids = state.enemies.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("advances waves after enemies are cleared", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
    // Spawn all enemies for wave 1
    for (let i = 0; i < WAVE.enemiesPerWave + 2; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval + 0.01);
    }
    expect(spawner.wave).toBe(1);
    // Clear all enemies
    state.enemies = [];
    tickWaveSpawner(spawner, state, 0.016);
    expect(spawner.wave).toBe(2);
  });

  it("drops a bonus pickup after 50% of wave kills", () => {
    const spawner = createWaveSpawner();
    const state = createInitialState();
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
    for (let i = 0; i < WAVE.enemiesPerWave + 2; i++) {
      tickWaveSpawner(spawner, state, WAVE.spawnInterval + 0.01);
    }
    state.enemies = [];
    tickWaveSpawner(spawner, state, 0.016);
    expect(spawner.wave).toBe(2);
    expect(state.ship.upgradeActive).toBe(false);
  });
});
