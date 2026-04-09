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
// Top-down fighter: pointed nose, swept wings, cockpit detail, engine exhausts.
// Dark outline gives depth. White cockpit + wing edge highlights.
const SHIP: number[][] = [
  [0,0,0,5,1,5,0,0],  // nose tip with dark outline
  [0,0,5,4,1,1,5,0],  // cockpit (white) behind nose
  [0,0,5,1,1,1,5,0],  // fuselage
  [0,5,1,1,1,1,1,5],  // wing root
  [5,4,1,1,1,1,4,5],  // full wingspan, white wing-edge highlights
  [5,1,1,5,5,1,1,5],  // wing gap / engine bay (dark center)
  [0,5,1,5,5,1,5,0],  // engine nacelles
  [0,0,4,0,0,4,0,0],  // twin exhaust glow (white = hot)
];

// ── TURRET ──
// Rotating cannon: barrel pointing up, round base, muzzle flash hint.
// Compact so it reads well at any rotation angle.
const TURRET: number[][] = [
  [0,0,0,4,0,0,0,0],  // muzzle flash / tip (white)
  [0,0,0,2,0,0,0,0],  // barrel
  [0,0,5,2,5,0,0,0],  // barrel with dark edge
  [0,0,5,2,5,0,0,0],  // barrel continued
  [0,5,2,2,2,2,5,0],  // base top (wide)
  [0,5,2,4,2,2,5,0],  // base with highlight
  [0,0,5,2,2,5,0,0],  // base bottom
  [0,0,0,5,5,0,0,0],  // mount point
];

// ── DRONE ENEMY ──
// Alien insectoid: angular carapace, glowing eyes, dangling limbs.
// Inverted silhouette from player ship so they're instantly distinguishable.
const DRONE: number[][] = [
  [0,2,0,0,0,0,2,0],  // antennae
  [0,0,2,5,5,2,0,0],  // head with dark eye sockets
  [0,5,4,2,2,4,5,0],  // eyes (white = glowing) + dark outline
  [5,2,2,2,2,2,2,5],  // thorax, full width
  [5,2,2,2,2,2,2,5],  // abdomen
  [0,5,2,5,5,2,5,0],  // waist with dark segments
  [0,2,5,0,0,5,2,0],  // legs dangling
  [2,0,0,0,0,0,0,2],  // leg tips
];

// ── PILOT BULLET ──
// Energy lance: white-hot tip fading to cyan trail, 2px wide for visibility.
const BULLET_PILOT: number[][] = [
  [0,0,0,4,0,0,0,0],  // white-hot tip
  [0,0,0,4,0,0,0,0],  // white core
  [0,0,0,1,1,0,0,0],  // cyan body
  [0,0,0,1,1,0,0,0],  // cyan body
  [0,0,0,1,1,0,0,0],  // cyan body
  [0,0,0,1,0,0,0,0],  // trail narrows
  [0,0,0,5,0,0,0,0],  // trail fade (dark)
  [0,0,0,0,0,0,0,0],
];

// ── GUNNER BULLET ──
// Plasma orb: magenta ring with white-hot core, dark outline for pop.
const BULLET_GUNNER: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,5,5,0,0,0],  // dark outline top
  [0,0,5,2,2,5,0,0],  // magenta ring top
  [0,5,2,4,4,2,5,0],  // white-hot core
  [0,5,2,4,4,2,5,0],  // white-hot core
  [0,0,5,2,2,5,0,0],  // magenta ring bottom
  [0,0,0,5,5,0,0,0],  // dark outline bottom
  [0,0,0,0,0,0,0,0],
];

// ── EXPLOSION FRAME 1 ──
// Impact flash: bright core, radiating shards in both team colors.
const EXPLOSION_1: number[][] = [
  [0,0,0,1,0,0,0,0],  // top shard (cyan)
  [0,0,0,4,2,0,0,0],  // white flash + magenta
  [0,0,2,4,4,1,0,0],  // expanding core
  [1,4,4,4,4,4,4,2],  // full flash line
  [0,0,1,4,4,2,0,0],  // expanding core
  [0,0,0,2,4,0,0,0],  // white flash + magenta
  [0,0,0,2,0,0,0,0],  // bottom shard (magenta)
  [0,0,0,0,0,1,0,0],  // stray spark
];

// ── EXPLOSION FRAME 2 ──
// Dissipating debris: scattered fragments, mostly faded, asymmetric.
const EXPLOSION_2: number[][] = [
  [1,0,0,0,0,0,2,0],  // far-flung debris
  [0,0,2,0,0,1,0,0],  // scattered
  [0,0,0,5,2,0,0,0],  // cooling center (dark)
  [0,1,5,5,5,5,0,2],  // dark remnant core
  [0,0,0,5,5,0,1,0],  // still hot edges
  [0,2,0,0,0,0,0,0],  // debris
  [0,0,0,1,0,2,0,0],  // sparks
  [0,0,0,0,0,0,0,1],  // final spark
];

// ── POWERUP ──
// Rotating energy capsule: yellow diamond with white core, dark outline,
// designed to catch the eye against the dark playfield.
const POWERUP: number[][] = [
  [0,0,0,5,5,0,0,0],  // top outline
  [0,0,5,3,3,5,0,0],  // yellow under dark frame
  [0,5,3,4,4,3,5,0],  // white-hot center
  [5,3,4,4,4,4,3,5],  // full bright core
  [5,3,4,4,4,4,3,5],  // full bright core
  [0,5,3,4,4,3,5,0],  // white-hot center
  [0,0,5,3,3,5,0,0],  // yellow under dark frame
  [0,0,0,5,5,0,0,0],  // bottom outline
];

export const SPRITES = {
  ship: SHIP,
  turret: TURRET,
  drone: DRONE,
  bulletPilot: BULLET_PILOT,
  bulletGunner: BULLET_GUNNER,
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
