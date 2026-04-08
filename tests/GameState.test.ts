import { describe, it, expect } from "vitest";
import { createInitialState, updateGameState, PilotInput } from "../src/game/GameState";
import { SHIP, PLAYFIELD, BULLET, ENEMY_DRONE } from "../src/game/constants";

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
});
