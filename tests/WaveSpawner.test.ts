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
