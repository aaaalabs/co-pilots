import { SHIP, BULLET, PLAYFIELD } from "./constants";

export type PilotInput = {
  moveX: number;   // -1, 0, 1
  moveY: number;   // -1, 0, 1
  fire: boolean;
};

export type Ship = {
  x: number;
  y: number;
  hp: number;
  fireCooldown: number;  // remaining cooldown in seconds
};

export type Bullet = {
  id: number;
  x: number;
  y: number;
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

  // Cooldown tick
  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);

  // Fire
  if (input.fire && ship.fireCooldown <= 0) {
    state.bullets.push({
      id: state.nextBulletId++,
      x: ship.x,
      y: ship.y - SHIP.bodyHeight / 2,
      vy: -BULLET.pilotSpeed,
      life: BULLET.maxLifetime,
    });
    ship.fireCooldown = SHIP.fireCooldown;
  }

  // Bullet step + lifetime decay
  for (const b of state.bullets) {
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter(
    b => b.life > 0 && b.y > -BULLET.pilotHeight,
  );

  return state;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
