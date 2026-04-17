import { describe, it, expect } from "vitest";
import { serializeSnapshot, applySnapshot } from "../src/network/Snapshot";
import { createInitialState } from "../src/game/GameState";

describe("Snapshot", () => {
  it("round-trips a clean initial state", () => {
    const state = createInitialState();
    const snap = serializeSnapshot(state, 1);
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
    const snap = serializeSnapshot(state, 1);
    expect(snap.bullets).toHaveLength(1);
    expect(snap.bullets[0]).toEqual({ id: 1, x: 10, y: 20, vx: 3, vy: -540 });
  });

  it("includes enemies", () => {
    const state = createInitialState();
    state.enemies.push({ id: 5, type: 0, x: 100, y: 50, hp: 20 });
    const snap = serializeSnapshot(state, 1);
    expect(snap.enemies).toHaveLength(1);
    expect(snap.enemies[0]).toEqual({ id: 5, type: 0, x: 100, y: 50, hp: 20 });
  });

  it("strips internal fields (cooldowns, nextIds)", () => {
    const state = createInitialState();
    const snap = serializeSnapshot(state, 1);
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
    state.enemies.push({ id: 2, type: 0, x: 50, y: 30, hp: 25 });
    const snap = serializeSnapshot(state, 1);
    const restored = applySnapshot(snap);
    expect(restored.ship.x).toBe(200);
    expect(restored.ship.hp).toBe(50);
    expect(restored.ship.turretAngle).toBe(1.5);
    expect(restored.score).toBe(999);
    expect(restored.bullets).toHaveLength(1);
    expect(restored.enemies).toHaveLength(1);
  });
});
