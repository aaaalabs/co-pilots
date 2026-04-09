# Co-Pilots Sprite Sheet — Image Generation Prompt

## Prompt

```
Create a single pixel art sprite sheet PNG for a neon arcade space shooter game.

LAYOUT:
- Grid: 8 columns × 1 row
- Each cell: 8×8 pixels
- Total image size: 64×8 pixels
- Background: fully transparent (alpha = 0)
- NO spacing between cells — sprites packed edge to edge

PALETTE (strict, no other colors):
- Cyan: #00F0F0 (player/friendly elements)
- Magenta: #FF00AA (enemy/danger elements)
- Yellow: #FFFF00 (powerups)
- White: #FFFFFF (highlights only, max 1-2 pixels per sprite)
- Dark: #050510 (outlines/shadows, optional, max 2-3 pixels per sprite)
- Transparent: everything else

STYLE RULES:
- NO anti-aliasing, NO gradients, NO sub-pixel rendering, NO dithering
- Every pixel is intentional — at 8×8, each pixel matters
- Top-down perspective (camera looks down at the playfield)
- Place 1 white pixel at top-left of each main shape for light-source highlight
- Silhouettes must be readable when scaled 3× with nearest-neighbor interpolation

SPRITE POSITIONS (left to right, cells 0-7):

Cell 0 — PLAYER SHIP (cyan)
Arrow/chevron shape pointing up. 6-7px tall, 5-6px wide, centered.
Main color: #00F0F0. One #FFFFFF highlight pixel top-left of body.

Cell 1 — TURRET (magenta)
Small barrel/cannon pointing up. 3-4px wide, 5-6px tall, centered.
Main color: #FF00AA. Will be rotated 360° in-game.

Cell 2 — DRONE ENEMY (magenta)
Menacing diamond or inverted chevron shape. Visually distinct from player ship.
Main color: #FF00AA. One #FFFFFF highlight pixel.

Cell 3 — PILOT BULLET (cyan)
Thin vertical bolt. 1-2px wide, 4-5px tall, centered horizontally.
Main color: #00F0F0.

Cell 4 — GUNNER BULLET (magenta)
Small diamond or circle. 3×3px centered.
Main color: #FF00AA.

Cell 5 — EXPLOSION FRAME 1 (cyan + magenta)
Small cross/plus burst. Mix of #00F0F0 and #FF00AA pixels.

Cell 6 — EXPLOSION FRAME 2 (cyan + magenta)
Larger expanding burst. More spread out than frame 1.

Cell 7 — POWERUP (yellow)
Plus/cross or star shape. Main color: #FFFF00. One #FFFFFF highlight.

CRITICAL:
- The output must be EXACTLY 64×8 pixels
- Use only the 5 listed colors + transparent
- Pixel-perfect edges, no blur
- PNG format with alpha channel
```

## Usage

Paste the prompt into an image generation tool (e.g. ChatGPT with DALL-E, Midjourney, or a pixel-art-specific generator). The output is a 64×8 sprite sheet.

## Integration

Once generated, save as `public/sprites/sheet.png`. The Renderer loads it once and draws sprites via `ctx.drawImage(sheet, srcX, 0, 8, 8, destX, destY, renderSize, renderSize)` where `srcX = cellIndex * 8`.

## Sprite Index

| Cell | Index | Element | Color |
|------|-------|---------|-------|
| 0 | 0 | Player ship | Cyan |
| 1 | 8 | Turret | Magenta |
| 2 | 16 | Drone enemy | Magenta |
| 3 | 24 | Pilot bullet | Cyan |
| 4 | 32 | Gunner bullet | Magenta |
| 5 | 40 | Explosion 1 | Mixed |
| 6 | 48 | Explosion 2 | Mixed |
| 7 | 56 | Powerup | Yellow |
