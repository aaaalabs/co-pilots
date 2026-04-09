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

const SHIP: number[][] = [
  [0,0,0,4,1,0,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,4,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,0,0,1,1,0],
  [1,1,1,0,0,1,1,1],
  [1,0,0,0,0,0,0,1],
];

const TURRET: number[][] = [
  [0,0,0,2,2,0,0,0],
  [0,0,0,2,2,0,0,0],
  [0,0,0,2,2,0,0,0],
  [0,0,4,2,2,0,0,0],
  [0,0,2,2,2,2,0,0],
  [0,0,2,2,2,2,0,0],
  [0,0,0,2,2,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const DRONE: number[][] = [
  [0,0,0,2,2,0,0,0],
  [0,0,2,4,2,2,0,0],
  [0,2,2,2,2,2,2,0],
  [2,2,2,2,2,2,2,2],
  [2,2,5,2,2,5,2,2],
  [0,2,2,2,2,2,2,0],
  [0,0,2,0,0,2,0,0],
  [0,0,0,0,0,0,0,0],
];

const BULLET_PILOT: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,4,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const BULLET_GUNNER: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,2,0,0,0,0],
  [0,0,2,4,2,0,0,0],
  [0,0,0,2,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const EXPLOSION_1: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,2,0,0,0,0],
  [0,1,2,4,2,1,0,0],
  [0,0,0,2,0,0,0,0],
  [0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const EXPLOSION_2: number[][] = [
  [0,0,0,1,0,0,0,0],
  [0,1,0,0,0,2,0,0],
  [0,0,2,0,2,0,0,0],
  [1,0,0,4,0,0,1,0],
  [0,0,2,0,2,0,0,0],
  [0,2,0,0,0,1,0,0],
  [0,0,0,2,0,0,0,0],
  [0,0,0,0,0,0,0,0],
];

const POWERUP: number[][] = [
  [0,0,0,0,0,0,0,0],
  [0,0,0,3,0,0,0,0],
  [0,0,0,3,0,0,0,0],
  [0,3,3,4,3,3,0,0],
  [0,0,0,3,0,0,0,0],
  [0,0,0,3,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
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
