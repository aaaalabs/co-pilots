// Generates individual PNG files from SpriteSheet definitions.
// Run: npx tsx scripts/generate-sprites.ts

const PALETTE: (string | null)[] = [
  null,          // 0 = transparent
  "#00F0F0",     // 1 = cyan
  "#FF00AA",     // 2 = magenta
  "#FFFF00",     // 3 = yellow
  "#FFFFFF",     // 4 = white
  "#050510",     // 5 = dark
];

const SPRITES: Record<string, number[][]> = {
  ship: [
    [0,0,0,4,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,4,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,1,0,0,1,1,0],
    [1,1,1,0,0,1,1,1],
    [1,0,0,0,0,0,0,1],
  ],
  turret: [
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,4,2,2,0,0,0],
    [0,0,2,2,2,2,0,0],
    [0,0,2,2,2,2,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  drone: [
    [0,0,0,2,2,0,0,0],
    [0,0,2,4,2,2,0,0],
    [0,2,2,2,2,2,2,0],
    [2,2,2,2,2,2,2,2],
    [2,2,5,2,2,5,2,2],
    [0,2,2,2,2,2,2,0],
    [0,0,2,0,0,2,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  bullet_pilot: [
    [0,0,0,0,0,0,0,0],
    [0,0,0,4,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  bullet_gunner: [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,2,0,0,0,0],
    [0,0,2,4,2,0,0,0],
    [0,0,0,2,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  explosion_1: [
    [0,0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,2,0,0,0,0],
    [0,1,2,4,2,1,0,0],
    [0,0,0,2,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  explosion_2: [
    [0,0,0,1,0,0,0,0],
    [0,1,0,0,0,2,0,0],
    [0,0,2,0,2,0,0,0],
    [1,0,0,4,0,0,1,0],
    [0,0,2,0,2,0,0,0],
    [0,2,0,0,0,1,0,0],
    [0,0,0,2,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  powerup: [
    [0,0,0,0,0,0,0,0],
    [0,0,0,3,0,0,0,0],
    [0,0,0,3,0,0,0,0],
    [0,3,3,4,3,3,0,0],
    [0,0,0,3,0,0,0,0],
    [0,0,0,3,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Minimal PNG encoder — no dependencies needed for tiny 8×8 images
function createPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crc32Table[i] = c;
  }
  function crc32(data: Uint8Array, start: number, len: number): number {
    let c = 0xffffffff;
    for (let i = start; i < start + len; i++) c = crc32Table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return c ^ 0xffffffff;
  }

  // Raw pixel data with filter byte per row
  const raw: number[] = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }

  // Deflate: store blocks (no compression — fine for tiny images)
  const rawBuf = new Uint8Array(raw);
  const MAX_BLOCK = 65535;
  const blocks: Uint8Array[] = [];
  for (let off = 0; off < rawBuf.length; off += MAX_BLOCK) {
    const end = Math.min(off + MAX_BLOCK, rawBuf.length);
    const last = end === rawBuf.length ? 1 : 0;
    const len = end - off;
    const block = new Uint8Array(5 + len);
    block[0] = last;
    block[1] = len & 0xff;
    block[2] = (len >> 8) & 0xff;
    block[3] = (~len) & 0xff;
    block[4] = ((~len) >> 8) & 0xff;
    block.set(rawBuf.subarray(off, end), 5);
    blocks.push(block);
  }

  // zlib wrapper
  const deflatedLen = blocks.reduce((s, b) => s + b.length, 0);
  const zlib = new Uint8Array(2 + deflatedLen + 4);
  zlib[0] = 0x78; zlib[1] = 0x01; // CMF, FLG
  let pos = 2;
  for (const b of blocks) { zlib.set(b, pos); pos += b.length; }
  // Adler-32
  let a = 1, b2 = 0;
  for (const byte of rawBuf) { a = (a + byte) % 65521; b2 = (b2 + a) % 65521; }
  const adler = ((b2 << 16) | a) >>> 0;
  zlib[pos++] = (adler >> 24) & 0xff;
  zlib[pos++] = (adler >> 16) & 0xff;
  zlib[pos++] = (adler >> 8) & 0xff;
  zlib[pos++] = adler & 0xff;

  // PNG chunks
  function chunk(type: string, data: Uint8Array): Uint8Array {
    const buf = new Uint8Array(12 + data.length);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, data.length);
    buf[4] = type.charCodeAt(0); buf[5] = type.charCodeAt(1);
    buf[6] = type.charCodeAt(2); buf[7] = type.charCodeAt(3);
    buf.set(data, 8);
    const crcBuf = new Uint8Array(4 + data.length);
    crcBuf.set(buf.subarray(4, 8)); crcBuf.set(data, 4);
    dv.setUint32(8 + data.length, crc32(crcBuf, 0, crcBuf.length));
    return buf;
  }

  const ihdr = new Uint8Array(13);
  const ihdrDv = new DataView(ihdr.buffer);
  ihdrDv.setUint32(0, width);
  ihdrDv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = new Uint8Array([137,80,78,71,13,10,26,10]);
  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", zlib);
  const iendChunk = chunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let p = 0;
  png.set(sig, p); p += sig.length;
  png.set(ihdrChunk, p); p += ihdrChunk.length;
  png.set(idatChunk, p); p += idatChunk.length;
  png.set(iendChunk, p);
  return png;
}

function spriteToPixels(grid: number[][], scale: number): { width: number; height: number; pixels: Uint8Array } {
  const w = 8 * scale;
  const h = 8 * scale;
  const pixels = new Uint8Array(w * h * 4); // RGBA

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = grid[row][col];
      if (idx === 0) continue; // transparent (already 0,0,0,0)
      const color = PALETTE[idx];
      if (!color) continue;
      const [r, g, b] = hexToRgb(color);
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = col * scale + sx;
          const py = row * scale + sy;
          const i = (py * w + px) * 4;
          pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255;
        }
      }
    }
  }
  return { width: w, height: h, pixels };
}

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/sprites");
const SCALE = 8; // 8×8 → 64×64 preview PNGs

for (const [name, grid] of Object.entries(SPRITES)) {
  const { width, height, pixels } = spriteToPixels(grid, SCALE);
  const png = createPng(width, height, pixels);
  const path = join(outDir, `${name}.png`);
  writeFileSync(path, png);
  console.log(`${name}.png (${width}×${height})`);
}

// Also generate the combined sheet at 1x (64×8)
const sheetPixels = new Uint8Array(64 * 8 * 4);
const names = Object.keys(SPRITES);
for (let si = 0; si < names.length; si++) {
  const grid = SPRITES[names[si]];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = grid[row][col];
      if (idx === 0) continue;
      const color = PALETTE[idx];
      if (!color) continue;
      const [r, g, b] = hexToRgb(color);
      const px = si * 8 + col;
      const py = row;
      const i = (py * 64 + px) * 4;
      sheetPixels[i] = r; sheetPixels[i+1] = g; sheetPixels[i+2] = b; sheetPixels[i+3] = 255;
    }
  }
}
const sheetPng = createPng(64, 8, sheetPixels);
writeFileSync(join(outDir, "sheet.png"), sheetPng);
console.log("sheet.png (64×8) — all sprites at 1x");

console.log(`\nDone. ${names.length + 1} files in ${outDir}`);
