import { describe, it, expect } from "vitest";
import { serializeSnapshot, applySnapshot } from "../src/network/Snapshot";
import { createInitialState } from "../src/game/GameState";
import { BULLET } from "../src/game/constants";

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
    state.bullets.push({ id: 1, x: 10, y: 20, vx: 3, vy: -540, life: 1, damage: BULLET.gunnerDamage });
    const snap = serializeSnapshot(state, 1);
    expect(snap.bullets).toHaveLength(1);
    expect(snap.bullets[0]).toEqual({ id: 1, x: 10, y: 20, vx: 3, vy: -540, damage: BULLET.gunnerDamage });
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
    state.bullets.push({ id: 1, x: 10, y: 20, vx: 0, vy: -540, life: 1, damage: BULLET.pilotDamage });
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
    const restored = applySnapshot(snap);
    expect(restored.bullets[0].piercing).toBe(true);
  });
});
