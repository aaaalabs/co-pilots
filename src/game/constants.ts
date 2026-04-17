// Gameplay tuning. Every magic number lives here.
// Coordinate system: 0,0 = top-left of playfield. Y grows downward.

export const PLAYFIELD = {
  width: 480,
  height: 720,
} as const;

export const SHIP = {
  startX: PLAYFIELD.width / 2,
  startY: PLAYFIELD.height - 80,
  radius: 14,            // collision radius
  bodyWidth: 22,         // visual half-width (cyan body rect)
  bodyHeight: 24,
  turretWidth: 8,        // visual magenta turret stub
  turretHeight: 12,
  speed: 220,            // pixels per second
  maxHp: 10,             // 10 hearts
  fireCooldown: 0.10,    // seconds between shots (fast burst)
  heatPerShot: 0.10,     // heat added per pilot shot (0–1 scale)
  heatDecay: 0.25,       // heat decay per second (passive cooling)
  heatDecayOverheated: 0.5, // faster decay during forced cooldown
  overheatThreshold: 1.0,   // triggers overheat
  cooldownThreshold: 0.2,   // clears overheat
  gunnerFireCooldown: 0.25, // seconds between gunner shots
} as const;

export const BULLET = {
  pilotSpeed: 540,       // pixels per second, upward
  pilotWidth: 4,
  pilotHeight: 12,
  pilotDamage: 25,
  radius: 4,             // collision radius (treated as circle)
  maxLifetime: 2.0,      // seconds before despawn
  gunnerSpeed: 480,        // pixels per second
  gunnerWidth: 5,
  gunnerHeight: 5,
  gunnerDamage: 20,
} as const;

// Enemy type 0: Drone — flies straight down
export const ENEMY_DRONE = {
  type: 0 as const,
  width: 22, height: 22, radius: 12,
  speed: 90,
  maxHp: 25,
  contactDamage: 1,
  scoreValue: 10,
} as const;

// Enemy type 1: Hunter — chases the ship
export const ENEMY_HUNTER = {
  type: 1 as const,
  width: 22, height: 22, radius: 12,
  speed: 70,
  maxHp: 40,
  contactDamage: 2,
  scoreValue: 25,
} as const;

// Enemy type 2: Sniper Boss — parks, aims at the ship
export const ENEMY_BOSS = {
  type: 2 as const,
  width: 48, height: 48, radius: 26,
  speed: 30,
  maxHp: 300,
  contactDamage: 4,
  scoreValue: 200,
  fireInterval: 1.2,
  bulletSpeed: 180,
} as const;

// Enemy type 3: Strafer Boss — side-to-side, downward 3-bullet spread
export const ENEMY_BOSS_STRAFER = {
  type: 3 as const,
  width: 56, height: 36, radius: 26,
  speed: 140,
  parkY: 70,
  maxHp: 280,
  contactDamage: 3,
  scoreValue: 220,
  fireInterval: 1.4,
  bulletSpeed: 220,
  spreadAngle: 0.35,
} as const;

// Enemy type 4: Splitter Boss — drifts down, spawns 4 hunters on death
export const ENEMY_BOSS_SPLITTER = {
  type: 4 as const,
  width: 50, height: 50, radius: 26,
  speed: 35,
  parkY: 90,
  maxHp: 340,
  contactDamage: 3,
  scoreValue: 250,
  splitCount: 4,
} as const;

// Enemy type 5: Charger Boss — slow approach + fast dive
export const ENEMY_BOSS_CHARGER = {
  type: 5 as const,
  width: 44, height: 44, radius: 24,
  speed: 32,
  diveSpeed: 320,
  maxHp: 280,
  contactDamage: 5,
  scoreValue: 240,
  diveInterval: 3.2,
  diveDuration: 0.9,
} as const;

// Heart pickup — drifts down like a leaf
export const HEART = {
  width: 20, height: 20, radius: 14,
  fallSpeed: 50,         // pixels per second
  swayAmplitude: 60,     // px around base x
  swayFrequency: 1.6,    // radians per second
  healAmount: 2,         // restore N hearts
  spawnHpThreshold: 5,   // only spawn when ship hp < this
  spawnIntervalMin: 8,   // seconds
  spawnIntervalMax: 14,
} as const;

// Bonus pickup — timed weapon upgrade
export const BONUS = {
  width: 30, height: 30, radius: 18,
  fallSpeed: 50,
  swayAmplitude: 20,
  swayFrequency: 2.0,
  dropThreshold: 0.5,         // fraction of wave kills before guaranteed drop
  randomDropChance: 0.03,     // per-kill chance for early drop
  bossDropHpFraction: 0.5,    // boss wave drops a bonus at ≤50% HP
  pilotDamageMultiplier: 2,   // Mega-Gun damage multiplier
  pilotRadiusBonus: 4,        // Mega-Gun hitbox radius bonus (px)
  pierceMax: 3,               // Beam-Laser: max enemies per shot
} as const;

export function isBossType(type: number): boolean {
  return type === 2 || type === 3 || type === 4 || type === 5;
}

export const WAVE = {
  spawnInterval: 1.4,    // base seconds between spawns
  spawnEdgeMargin: 32,
  enemiesPerWave: 8,     // drones to kill before wave ends
  bossEveryN: 5,         // boss appears every N waves
} as const;

// Family palette (subset used by Renderer)
export const COLORS = {
  bg: "#020208",
  gridLine: "hsla(260, 35%, 18%, 0.18)",
  cyan: "#00f0f0",
  magenta: "#ff00aa",
  yellow: "#ffff00",
  textDim: "#4a4a6a",
  textMid: "#8888aa",
  white: "#ffffff",
} as const;
