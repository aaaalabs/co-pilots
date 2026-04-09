import { SHIP, BULLET, PLAYFIELD, ENEMY_DRONE, ENEMY_HUNTER, ENEMY_BOSS } from "./constants";
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

export type Enemy = {
  id: number;
  type: number;      // 0=drone, 1=hunter, 2=boss
  x: number;
  y: number;
  hp: number;
  fireTimer?: number; // boss only: seconds until next shot
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

  // Enemy movement (per type)
  for (const e of state.enemies) {
    if (e.type === 1) {
      // Hunter: chase the ship
      const dx = ship.x - e.x;
      const dy = ship.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        e.x += (dx / dist) * ENEMY_HUNTER.speed * dt;
        e.y += (dy / dist) * ENEMY_HUNTER.speed * dt;
      }
    } else if (e.type === 2) {
      // Boss: drift down slowly, park near top
      if (e.y < 80) {
        e.y += ENEMY_BOSS.speed * dt;
      }
      // Boss shoots at the ship
      e.fireTimer = (e.fireTimer ?? ENEMY_BOSS.fireInterval) - dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = ENEMY_BOSS.fireInterval;
        const dx = ship.x - e.x;
        const dy = ship.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          state.bullets.push({
            id: state.nextBulletId++,
            x: e.x,
            y: e.y + ENEMY_BOSS.height / 2,
            vx: (dx / dist) * ENEMY_BOSS.bulletSpeed,
            vy: (dy / dist) * ENEMY_BOSS.bulletSpeed,
            life: 3.0,
          });
        }
      }
    } else {
      // Drone: straight down
      e.y += ENEMY_DRONE.speed * dt;
    }
  }
  // Cull off-screen enemies (not bosses parked at top)
  state.enemies = state.enemies.filter(e => e.type === 2 || e.y < PLAYFIELD.height + 30);

  // Bullet vs enemy
  for (const e of state.enemies) {
    const er = e.type === 2 ? ENEMY_BOSS.radius : ENEMY_DRONE.radius;
    for (const b of state.bullets) {
      // Don't let boss bullets hit enemies
      if (b.vy > 0) continue;
      if (circlesOverlap(b.x, b.y, BULLET.radius, e.x, e.y, er)) {
        const dmg = b.vx === 0 ? BULLET.pilotDamage : BULLET.gunnerDamage;
        e.hp -= dmg;
        b.life = 0;
        if (e.hp <= 0) {
          const sv = e.type === 2 ? ENEMY_BOSS.scoreValue : e.type === 1 ? ENEMY_HUNTER.scoreValue : ENEMY_DRONE.scoreValue;
          state.score += sv;
          break;
        }
      }
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.bullets = state.bullets.filter(b => b.life > 0);

  // Enemy vs ship
  for (const e of state.enemies) {
    const er = e.type === 2 ? ENEMY_BOSS.radius : ENEMY_DRONE.radius;
    const cd = e.type === 2 ? ENEMY_BOSS.contactDamage : e.type === 1 ? ENEMY_HUNTER.contactDamage : ENEMY_DRONE.contactDamage;
    if (circlesOverlap(ship.x, ship.y, SHIP.radius, e.x, e.y, er)) {
      ship.hp = Math.max(0, ship.hp - cd);
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
