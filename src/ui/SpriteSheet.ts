// 8×8 pixel art sprites defined as color-index grids.
// 0 = transparent, 1 = cyan, 2 = magenta, 3 = yellow, 4 = white, 5 = dark

import { COLORS } from "../game/constants";

const PALETTE = [
  null,          // 0 = transparent
  COLORS.cyan,   // 1
  COLORS.magenta,// 2
  COLORS.yellow, // 3
  COLORS.white,  // 4
  "#050510",     // 5 = dark outline
];

// Each sprite is an 8×8 grid, top-to-bottom, left-to-right.
// Design at 1x, rendered scaled up with nearest-neighbor (image-rendering: pixelated).

// ── PLAYER SHIP ──
// Top-down fighter with visible structure: cockpit canopy, hull plating,
// swept delta wings, thruster ports. Uses dithered shading (5/1 mix)
// on wing edges for depth. Fills most of the 8x8 canvas.
const SHIP: number[][] = [
  [0,0,0,4,4,0,0,0],  // cockpit canopy (white, 2px wide = visible)
  [0,0,5,1,1,5,0,0],  // cockpit surround, dark frame
  [0,5,1,4,1,1,5,0],  // hull with panel line (white accent left)
  [5,1,1,1,1,1,1,5],  // main fuselage, full width, dark outline
  [1,5,1,1,1,1,5,1],  // wing with dark stripe (dithered depth)
  [1,1,5,1,1,5,1,1],  // inner wing shadow lines
  [1,0,5,5,5,5,0,1],  // engine bay cutout (dark), wingtips remain
  [0,0,1,4,4,1,0,0],  // twin thruster glow (white-hot nozzles)
];

// ── TURRET ──
// Double-barrel cannon with ammo drum. Must read at any rotation.
// Symmetrical around vertical axis for clean 360° spin.
const TURRET: number[][] = [
  [0,0,4,0,0,4,0,0],  // twin muzzle flash tips
  [0,0,2,0,0,2,0,0],  // twin barrels
  [0,0,2,5,5,2,0,0],  // barrel housing (dark gap between)
  [0,5,2,2,2,2,5,0],  // receiver / ammo drum top
  [0,5,2,4,4,2,5,0],  // ammo drum with indicator lights (white)
  [0,5,2,2,2,2,5,0],  // receiver bottom
  [0,0,5,2,2,5,0,0],  // mount collar
  [0,0,0,5,5,0,0,0],  // pivot pin
];

// ── DRONE ENEMY ──
// Menacing alien drone: armored carapace, sensor eye, mandibles,
// asymmetric antenna. Silhouette reads as "wide + squat" — opposite
// of the player ship's "tall + narrow" to be instantly distinguishable.
const DRONE: number[][] = [
  [0,2,0,5,5,0,0,0],  // asymmetric antenna + head plate
  [2,5,2,2,2,2,5,0],  // armored head, dark edges
  [5,2,2,4,4,2,2,5],  // sensor eyes (white glow), full width
  [2,2,5,2,2,5,2,2],  // mandible gap (dark), armored cheeks
  [5,2,2,2,2,2,2,5],  // thorax plate, outlined
  [0,5,2,5,5,2,5,0],  // segmented waist
  [0,2,5,0,0,5,2,0],  // grasping legs with joints (dark)
  [2,5,0,0,0,0,5,2],  // claw tips with dark accents
];

// ── PILOT BULLET ──
// Elongated energy bolt, 2px wide. Intensity gradient: white-hot tip,
// bright cyan core, fading dithered tail, dark exhaust pixel.
const BULLET_PILOT: number[][] = [
  [0,0,0,4,4,0,0,0],  // white-hot tip (2px wide for visibility)
  [0,0,0,1,4,0,0,0],  // transition (cyan + white dither)
  [0,0,0,1,1,0,0,0],  // bright cyan core
  [0,0,0,1,1,0,0,0],  // bright cyan core
  [0,0,0,5,1,0,0,0],  // fading (dark + cyan dither)
  [0,0,0,5,5,0,0,0],  // dark exhaust
  [0,0,0,0,5,0,0,0],  // trail end
  [0,0,0,0,0,0,0,0],
];

// ── GUNNER BULLET ──
// Spinning plasma orb. Dark outline ring → magenta shell → white core.
// Slightly asymmetric (highlight offset) to imply rotation.
const BULLET_GUNNER: number[][] = [
  [0,0,5,5,5,0,0,0],  // top outline arc
  [0,5,2,2,2,5,0,0],  // magenta shell top
  [5,2,4,4,2,2,5,0],  // highlight offset left (rotation implied)
  [5,2,4,4,4,2,5,0],  // white-hot center
  [5,2,2,4,2,2,5,0],  // center fading
  [0,5,2,2,2,5,0,0],  // magenta shell bottom
  [0,0,5,5,5,0,0,0],  // bottom outline arc
  [0,0,0,0,0,0,0,0],
];

// ── EXPLOSION FRAME 1 ──
// Initial detonation: white-hot center expands outward, mixed cyan/magenta
// shrapnel radiates in 8 directions. Dithered edges for energy dissipation.
const EXPLOSION_1: number[][] = [
  [1,0,0,2,1,0,0,2],  // outer spark ring
  [0,1,0,4,4,0,2,0],  // inner sparks + flash
  [0,0,2,4,4,1,0,0],  // fireball edge
  [2,4,4,4,4,4,4,1],  // full detonation line
  [1,4,4,4,4,4,4,2],  // full detonation line (offset = asymmetric)
  [0,0,1,4,4,2,0,0],  // fireball edge
  [0,2,0,4,4,0,1,0],  // inner sparks + flash
  [2,0,0,1,2,0,0,1],  // outer spark ring
];

// ── EXPLOSION FRAME 2 ──
// Dissipation: debris scatters outward, center cools to dark, mostly empty.
// Sparse pixels at edges = particles flying away. Dark core = smoke.
const EXPLOSION_2: number[][] = [
  [1,0,0,0,0,2,0,0],  // far debris
  [0,0,2,0,0,0,0,1],  // scattered embers
  [0,1,5,5,0,0,2,0],  // cooling core edge
  [0,0,5,5,5,1,0,0],  // dark smoke remnant
  [0,0,0,5,5,5,0,0],  // smoke center
  [0,2,0,0,5,0,1,0],  // cooling core edge
  [0,0,0,0,0,2,0,0],  // ember
  [0,0,1,0,0,0,0,2],  // final sparks at max radius
];

// ── POWERUP ──
// Pulsating energy crystal: octagonal shape with layered glow.
// Dark outer ring → yellow shell → white-hot inner facets.
// Designed to pop against the dark playfield and be unmissable.
const POWERUP: number[][] = [
  [0,0,5,5,5,5,0,0],  // top edge (dark frame)
  [0,5,3,3,3,3,5,0],  // outer glow (yellow)
  [5,3,3,4,4,3,3,5],  // inner facets (white)
  [5,3,4,3,3,4,3,5],  // hollow center effect (yellow gap)
  [5,3,4,3,3,4,3,5],  // hollow center effect
  [5,3,3,4,4,3,3,5],  // inner facets
  [0,5,3,3,3,3,5,0],  // outer glow
  [0,0,5,5,5,5,0,0],  // bottom edge
];

// ── HUNTER ──
// Faster, sleeker pursuit drone. V-shape pointing down (chasing).
// Yellow accents to distinguish from regular drones.
const HUNTER: number[][] = [
  [3,0,0,0,0,0,0,3],  // wingtip sensors (yellow)
  [5,3,0,0,0,0,3,5],  // wing edges
  [0,5,2,0,0,2,5,0],  // inner wings
  [0,0,5,2,2,5,0,0],  // converging
  [0,0,0,4,4,0,0,0],  // cockpit (white = targeting)
  [0,0,5,2,2,5,0,0],  // body
  [0,0,0,5,5,0,0,0],  // thruster
  [0,0,0,3,3,0,0,0],  // engine glow (yellow)
];

// ── BOSS ──
// Massive warship, 8x8 but rendered at 2x sprite scale.
// Dark armored hull, magenta core, white weapon ports.
const BOSS: number[][] = [
  [5,5,2,4,4,2,5,5],  // top armor + weapon ports (white)
  [5,2,2,2,2,2,2,5],  // upper hull
  [2,2,5,2,2,5,2,2],  // armor plates (dark seams)
  [2,4,2,2,2,2,4,2],  // side cannons (white)
  [2,2,2,5,5,2,2,2],  // central reactor gap (dark)
  [5,2,5,4,4,5,2,5],  // reactor core (white glow)
  [5,2,2,2,2,2,2,5],  // lower hull
  [0,5,2,5,5,2,5,0],  // engine bay
];

// ── BOSS BULLET ──
// Red-ish enemy projectile (uses magenta + yellow for "danger" feel).
const BOSS_BULLET: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,3,0,0,0,0],  // yellow tip (warning!)
  [0,0,2,4,2,0,0,0],  // magenta + white hot core
  [0,0,2,2,2,0,0,0],  // magenta body
  [0,0,0,2,0,0,0,0],  // trail
  [0,0,0,5,0,0,0,0],  // dark tail
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

export const SPRITES = {
  ship: SHIP,
  turret: TURRET,
  drone: DRONE,
  hunter: HUNTER,
  boss: BOSS,
  bulletPilot: BULLET_PILOT,
  bulletGunner: BULLET_GUNNER,
  bossBullet: BOSS_BULLET,
  explosion1: EXPLOSION_1,
  explosion2: EXPLOSION_2,
  powerup: POWERUP,
} as const;

export type SpriteKey = keyof typeof SPRITES;

// Pre-render all sprites to offscreen canvases at a given scale for fast blitting.
const spriteCache = new Map<string, HTMLCanvasElement>();

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  key: SpriteKey,
  x: number,
  y: number,
  scale: number,
): void {
  const cacheKey = `${key}_${scale}`;
  let cached = spriteCache.get(cacheKey);
  if (!cached) {
    cached = renderSpriteToCanvas(SPRITES[key], scale);
    spriteCache.set(cacheKey, cached);
  }
  ctx.drawImage(cached, Math.round(x), Math.round(y));
}

export function getSpriteSize(scale: number): number {
  return 8 * scale;
}

function renderSpriteToCanvas(grid: number[][], scale: number): HTMLCanvasElement {
  const size = 8 * scale;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const colorIdx = grid[row][col];
      if (colorIdx === 0) continue; // transparent
      const color = PALETTE[colorIdx];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * scale, row * scale, scale, scale);
    }
  }

  return canvas;
}
