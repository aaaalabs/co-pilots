import { GameState } from "../game/GameState";
import { SnapshotData } from "./Protocol";

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
      life: 1,
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
