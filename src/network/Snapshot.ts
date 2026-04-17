import { GameState } from "../game/GameState";
import { SnapshotData } from "./Protocol";

export function serializeSnapshot(state: GameState, wave: number): SnapshotData {
  return {
    ship: {
      x: state.ship.x,
      y: state.ship.y,
      hp: state.ship.hp,
      turretAngle: state.ship.turretAngle,
      upgradeActive: state.ship.upgradeActive,
    },
    bullets: state.bullets.map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      damage: b.damage,
      ...(b.enemy ? { enemy: true } : {}),
      ...(b.piercing ? { piercing: true } : {}),
    })),
    enemies: state.enemies.map(e => ({
      id: e.id,
      type: e.type,
      x: e.x,
      y: e.y,
      hp: e.hp,
    })),
    pickups: state.pickups.map(p => ({
      id: p.id,
      kind: p.kind,
      x: p.x,
      y: p.y,
    })),
    score: state.score,
    wave,
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
      heat: 0,
      overheated: false,
      gunnerFireCooldown: 0,
      upgradeActive: snap.ship.upgradeActive,
    },
    bullets: snap.bullets.map(b => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      life: 1,
      damage: b.damage ?? 0,
      enemy: b.enemy,
      piercing: b.piercing,
    })),
    enemies: snap.enemies.map(e => ({
      id: e.id,
      type: e.type,
      x: e.x,
      y: e.y,
      hp: e.hp,
    })),
    pickups: snap.pickups.map(p => ({
      id: p.id,
      kind: p.kind,
      x: p.x,
      y: p.y,
      baseX: p.x,
      age: 0,
    })),
    score: snap.score,
    gameOver: snap.gameOver,
    nextBulletId: 0,
    nextEnemyId: 0,
    nextPickupId: 0,
  };
}
