import {
  SHIP, BULLET, PLAYFIELD,
  ENEMY_DRONE, ENEMY_HUNTER, ENEMY_BOSS,
  ENEMY_BOSS_STRAFER, ENEMY_BOSS_SPLITTER, ENEMY_BOSS_CHARGER,
  HEART, BONUS, isBossType,
} from "./constants";
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
  upgradeActive: boolean;       // NEW
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;               // NEW — per-bullet damage
  enemy?: boolean;              // true for boss projectiles
  piercing?: boolean;           // NEW — set on upgraded gunner shots
  pierceHits?: number;          // NEW — counts enemies pierced
  radiusBonus?: number;         // NEW — extra collision radius for Mega-Gun
};

export type Enemy = {
  id: number;
  type: number;      // 0=drone, 1=hunter, 2=sniper, 3=strafer, 4=splitter, 5=charger
  x: number;
  y: number;
  hp: number;
  fireTimer?: number; // sniper/strafer: seconds until next shot
  vx?: number;        // strafer: horizontal velocity sign
  phase?: number;     // charger: 0=approach, 1=diving
  phaseTimer?: number; // charger: time left in current phase
  targetX?: number;   // charger: dive target x
  targetY?: number;   // charger: dive target y
};

export type Pickup = {
  id: number;
  kind: "heart" | "bonus";      // CHANGED — widened
  x: number;
  y: number;
  baseX: number;
  age: number;
};

export type GameState = {
  ship: Ship;
  bullets: Bullet[];
  enemies: Enemy[];
  pickups: Pickup[];
  score: number;
  gameOver: boolean;
  nextBulletId: number;
  nextEnemyId: number;
  nextPickupId: number;
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
      upgradeActive: false,
    },
    bullets: [],
    enemies: [],
    pickups: [],
    score: 0,
    gameOver: false,
    nextBulletId: 1,
    nextEnemyId: 1,
    nextPickupId: 1,
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
      damage: ship.upgradeActive
        ? BULLET.pilotDamage * BONUS.pilotDamageMultiplier
        : BULLET.pilotDamage,
      ...(ship.upgradeActive ? { radiusBonus: BONUS.pilotRadiusBonus } : {}),
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
        damage: BULLET.gunnerDamage,
        ...(ship.upgradeActive ? { piercing: true, pierceHits: 0 } : {}),
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
      // Sniper Boss: drift down slowly, park near top, aim at ship
      if (e.y < 80) {
        e.y += ENEMY_BOSS.speed * dt;
      }
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
            damage: 0,                    // enemy bullets damage ship via ENEMY_BOSS.contactDamage
            enemy: true,
          });
        }
      }
    } else if (e.type === 3) {
      // Strafer Boss: hover at parkY, bounce side-to-side, fire 3-shot downward spread
      if (e.y < ENEMY_BOSS_STRAFER.parkY) {
        e.y += ENEMY_BOSS_STRAFER.speed * 0.4 * dt;
      } else {
        if (e.vx === undefined) e.vx = 1;
        e.x += e.vx * ENEMY_BOSS_STRAFER.speed * dt;
        const margin = ENEMY_BOSS_STRAFER.radius;
        if (e.x < margin) { e.x = margin; e.vx = 1; }
        if (e.x > PLAYFIELD.width - margin) { e.x = PLAYFIELD.width - margin; e.vx = -1; }
      }
      e.fireTimer = (e.fireTimer ?? ENEMY_BOSS_STRAFER.fireInterval) - dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = ENEMY_BOSS_STRAFER.fireInterval;
        const angles = [-ENEMY_BOSS_STRAFER.spreadAngle, 0, ENEMY_BOSS_STRAFER.spreadAngle];
        for (const a of angles) {
          state.bullets.push({
            id: state.nextBulletId++,
            x: e.x,
            y: e.y + ENEMY_BOSS_STRAFER.height / 2,
            vx: Math.sin(a) * ENEMY_BOSS_STRAFER.bulletSpeed,
            vy: Math.cos(a) * ENEMY_BOSS_STRAFER.bulletSpeed,
            life: 3.0,
            damage: 0,
            enemy: true,
          });
        }
      }
    } else if (e.type === 4) {
      // Splitter Boss: drift down to parkY, then hover (split happens on death)
      if (e.y < ENEMY_BOSS_SPLITTER.parkY) {
        e.y += ENEMY_BOSS_SPLITTER.speed * dt;
      }
    } else if (e.type === 5) {
      // Charger Boss: phase 0 = approach, phase 1 = dive at target
      if (e.phase === undefined) {
        e.phase = 0;
        e.phaseTimer = ENEMY_BOSS_CHARGER.diveInterval;
      }
      if (e.phase === 0) {
        if (e.y < 70) {
          e.y += ENEMY_BOSS_CHARGER.speed * dt;
        }
        e.phaseTimer = (e.phaseTimer ?? 0) - dt;
        if (e.phaseTimer <= 0) {
          e.phase = 1;
          e.phaseTimer = ENEMY_BOSS_CHARGER.diveDuration;
          e.targetX = ship.x;
          e.targetY = ship.y;
        }
      } else {
        const tx = e.targetX ?? e.x;
        const ty = e.targetY ?? PLAYFIELD.height;
        const dx = tx - e.x;
        const dy = ty - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 4) {
          e.x += (dx / dist) * ENEMY_BOSS_CHARGER.diveSpeed * dt;
          e.y += (dy / dist) * ENEMY_BOSS_CHARGER.diveSpeed * dt;
        }
        e.phaseTimer = (e.phaseTimer ?? 0) - dt;
        if (e.phaseTimer <= 0) {
          e.phase = 0;
          e.phaseTimer = ENEMY_BOSS_CHARGER.diveInterval;
        }
      }
    } else {
      // Drone: straight down
      e.y += ENEMY_DRONE.speed * dt;
    }
  }
  // Cull off-screen enemies (bosses persist regardless of y)
  state.enemies = state.enemies.filter(e => isBossType(e.type) || e.y < PLAYFIELD.height + 30);

  // Bullet vs enemy
  for (const e of state.enemies) {
    const er = enemyRadius(e.type);
    for (const b of state.bullets) {
      if (b.enemy) continue;
      if (e.hp <= 0) continue;
      if (b.life <= 0) continue;
      if (circlesOverlap(b.x, b.y, BULLET.radius + (b.radiusBonus ?? 0), e.x, e.y, er)) {
        e.hp -= b.damage;
        if (b.piercing) {
          b.pierceHits = (b.pierceHits ?? 0) + 1;
          if (b.pierceHits >= BONUS.pierceMax) b.life = 0;
        } else {
          b.life = 0;
        }
        if (e.hp <= 0) {
          state.score += enemyScore(e.type);
        }
      }
    }
  }
  // Splitter death → spray drones outward in a ring (quantity over quality)
  const deadSplitters = state.enemies.filter(e => e.hp <= 0 && e.type === 4);
  for (const s of deadSplitters) {
    for (let i = 0; i < ENEMY_BOSS_SPLITTER.splitCount; i++) {
      const angle = (i / ENEMY_BOSS_SPLITTER.splitCount) * Math.PI * 2;
      state.enemies.push({
        id: state.nextEnemyId++,
        type: ENEMY_DRONE.type,
        x: s.x + Math.cos(angle) * ENEMY_BOSS_SPLITTER.splitRadius,
        y: s.y + Math.sin(angle) * ENEMY_BOSS_SPLITTER.splitRadius,
        hp: ENEMY_DRONE.maxHp,
      });
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.bullets = state.bullets.filter(b => b.life > 0);

  // Enemy bullets vs ship (boss projectiles)
  for (const b of state.bullets) {
    if (!b.enemy) continue;
    if (circlesOverlap(b.x, b.y, BULLET.radius, ship.x, ship.y, SHIP.radius)) {
      ship.hp = Math.max(0, ship.hp - ENEMY_BOSS.contactDamage);
      b.life = 0;
    }
  }
  state.bullets = state.bullets.filter(b => b.life > 0);

  // Enemy vs ship
  for (const e of state.enemies) {
    const er = enemyRadius(e.type);
    const cd = enemyContactDamage(e.type);
    if (circlesOverlap(ship.x, ship.y, SHIP.radius, e.x, e.y, er)) {
      ship.hp = Math.max(0, ship.hp - cd);
      // Bosses survive contact (don't disappear); only mooks die
      if (!isBossType(e.type)) e.hp = 0;
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);

  // Pickup movement (leaf-like sway) and collection
  for (const p of state.pickups) {
    p.age += dt;
    const fall = p.kind === "bonus" ? BONUS.fallSpeed : HEART.fallSpeed;
    const swayFreq = p.kind === "bonus" ? BONUS.swayFrequency : HEART.swayFrequency;
    const swayAmp = p.kind === "bonus" ? BONUS.swayAmplitude : HEART.swayAmplitude;
    p.y += fall * dt;
    p.x = p.baseX + Math.sin(p.age * swayFreq) * swayAmp;
  }
  state.pickups = state.pickups.filter(p => {
    const r = p.kind === "bonus" ? BONUS.radius : HEART.radius;
    if (circlesOverlap(p.x, p.y, r, ship.x, ship.y, SHIP.radius)) {
      if (p.kind === "heart") {
        ship.hp = Math.min(SHIP.maxHp, ship.hp + HEART.healAmount);
      } else {
        ship.upgradeActive = true;
      }
      return false;
    }
    const maxHeight = p.kind === "bonus" ? BONUS.height : HEART.height;
    return p.y < PLAYFIELD.height + maxHeight;
  });

  if (state.ship.hp <= 0) {
    state.gameOver = true;
  }

  return state;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function enemyRadius(type: number): number {
  switch (type) {
    case 1: return ENEMY_HUNTER.radius;
    case 2: return ENEMY_BOSS.radius;
    case 3: return ENEMY_BOSS_STRAFER.radius;
    case 4: return ENEMY_BOSS_SPLITTER.radius;
    case 5: return ENEMY_BOSS_CHARGER.radius;
    default: return ENEMY_DRONE.radius;
  }
}

function enemyContactDamage(type: number): number {
  switch (type) {
    case 1: return ENEMY_HUNTER.contactDamage;
    case 2: return ENEMY_BOSS.contactDamage;
    case 3: return ENEMY_BOSS_STRAFER.contactDamage;
    case 4: return ENEMY_BOSS_SPLITTER.contactDamage;
    case 5: return ENEMY_BOSS_CHARGER.contactDamage;
    default: return ENEMY_DRONE.contactDamage;
  }
}

function enemyScore(type: number): number {
  switch (type) {
    case 1: return ENEMY_HUNTER.scoreValue;
    case 2: return ENEMY_BOSS.scoreValue;
    case 3: return ENEMY_BOSS_STRAFER.scoreValue;
    case 4: return ENEMY_BOSS_SPLITTER.scoreValue;
    case 5: return ENEMY_BOSS_CHARGER.scoreValue;
    default: return ENEMY_DRONE.scoreValue;
  }
}
