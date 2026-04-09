import { SHIP, BULLET, PLAYFIELD, ENEMY_DRONE } from "./constants";
import { circlesOverlap } from "./Collision";

export type PilotInput = {
  moveX: number;   // -1, 0, 1
  moveY: number;   // -1, 0, 1
  fire: boolean;
};

export type GunnerInput = {
  aimAngle: number;    // radians, 0 = up, clockwise positive
  fire: boolean;
};

export type Ship = {
  x: number;
  y: number;
  hp: number;
  fireCooldown: number;
  heat: number;           // 0–1, builds with each shot
  overheated: boolean;    // true = forced cooldown, can't fire
  turretAngle: number;
  gunnerFireCooldown: number;
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;          // seconds remaining
};

// Forward-declared for Task 6; populated then.
export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
};

export type GameState = {
  ship: Ship;
  bullets: Bullet[];
  enemies: Enemy[];
  score: number;
  gameOver: boolean;
  nextBulletId: number;
  nextEnemyId: number;
};

export function createInitialState(): GameState {
  return {
    ship: {
      x: SHIP.startX,
      y: SHIP.startY,
      hp: SHIP.maxHp,
      fireCooldown: 0,
      heat: 0,
      overheated: false,
      turretAngle: 0,
      gunnerFireCooldown: 0,
    },
    bullets: [],
    enemies: [],
    score: 0,
    gameOver: false,
    nextBulletId: 1,
    nextEnemyId: 1,
  };
}

export function updateGameState(
  state: GameState,
  dt: number,
  input: PilotInput,
  gunnerInput?: GunnerInput,
): GameState {
  if (state.gameOver) return state;

  // Ship movement (normalised, clamped)
  const { ship } = state;
  let mx = input.moveX;
  let my = input.moveY;
  const mag = Math.sqrt(mx * mx + my * my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }
  ship.x = clamp(
    ship.x + mx * SHIP.speed * dt,
    SHIP.bodyWidth / 2,
    PLAYFIELD.width - SHIP.bodyWidth / 2,
  );
  ship.y = clamp(
    ship.y + my * SHIP.speed * dt,
    SHIP.bodyHeight / 2,
    PLAYFIELD.height - SHIP.bodyHeight / 2,
  );

  // Heat decay (passive cooling)
  const decay = ship.overheated ? SHIP.heatDecayOverheated : SHIP.heatDecay;
  ship.heat = Math.max(0, ship.heat - decay * dt);

  // Clear overheat when cooled enough
  if (ship.overheated && ship.heat <= SHIP.cooldownThreshold) {
    ship.overheated = false;
  }

  // Cooldown tick
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);

  // Pilot fire (Space) — machine gun with overheat
  if (input.fire && !ship.overheated && ship.fireCooldown <= 0) {
    state.bullets.push({
      id: state.nextBulletId++,
      x: ship.x,
      y: ship.y - SHIP.bodyHeight / 2,
      vx: 0,
      vy: -BULLET.pilotSpeed,
      life: BULLET.maxLifetime,
    });
    ship.fireCooldown = SHIP.fireCooldown;
    ship.heat += SHIP.heatPerShot;
    if (ship.heat >= SHIP.overheatThreshold) {
      ship.overheated = true;
    }
  }

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

  // Bullet step + lifetime decay
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter(
    b => b.life > 0 && b.y > -BULLET.pilotHeight && b.x > -20 && b.x < PLAYFIELD.width + 20,
  );

  // Enemy step (drones fall straight down)
  for (const e of state.enemies) {
    e.y += ENEMY_DRONE.speed * dt;
  }
  // Cull off-screen drones
  state.enemies = state.enemies.filter(e => e.y < PLAYFIELD.height + ENEMY_DRONE.height);

  // Bullet vs enemy
  for (const e of state.enemies) {
    for (const b of state.bullets) {
      if (circlesOverlap(b.x, b.y, BULLET.radius, e.x, e.y, ENEMY_DRONE.radius)) {
        e.hp -= BULLET.pilotDamage;
        b.life = 0; // mark bullet for removal next frame
        if (e.hp <= 0) {
          state.score += ENEMY_DRONE.scoreValue;
          break; // this enemy is dead, no more bullets need to check it
        }
      }
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.bullets = state.bullets.filter(b => b.life > 0);

  // Enemy vs ship
  for (const e of state.enemies) {
    if (circlesOverlap(state.ship.x, state.ship.y, SHIP.radius, e.x, e.y, ENEMY_DRONE.radius)) {
      state.ship.hp = Math.max(0, state.ship.hp - ENEMY_DRONE.contactDamage);
      e.hp = 0;
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);

  if (state.ship.hp <= 0) {
    state.gameOver = true;
  }

  return state;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
