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
  maxHp: 100,
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

export const ENEMY_DRONE = {
  width: 22,
  height: 22,
  radius: 12,
  speed: 90,             // pixels per second, downward
  maxHp: 25,
  contactDamage: 15,     // damage to ship on collision
  scoreValue: 10,
} as const;

export const WAVE = {
  spawnInterval: 1.4,    // seconds between drone spawns in wave 1
  spawnEdgeMargin: 32,   // px from playfield edges
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
