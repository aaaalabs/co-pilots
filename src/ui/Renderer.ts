import { GameState } from "../game/GameState";
import { COLORS, PLAYFIELD } from "../game/constants";
import { drawSprite, getSpriteSize } from "./SpriteSheet";

const GRID_SIZE = 40;
const SPRITE_SCALE = 3; // 8px × 3 = 24px rendered size
const SS = getSpriteSize(SPRITE_SCALE); // sprite size in game pixels

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  draw(state: GameState): void {
    this.clear();
    this.drawGrid();
    this.drawBullets(state);
    this.drawEnemies(state);
    this.drawShip(state);
    if (state.gameOver) {
      this.drawGameOver();
    }
  }

  private clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= PLAYFIELD.width; x += GRID_SIZE) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, PLAYFIELD.height);
    }
    for (let y = 0; y <= PLAYFIELD.height; y += GRID_SIZE) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(PLAYFIELD.width, y + 0.5);
    }
    ctx.stroke();
  }

  private drawShip(state: GameState): void {
    const { x, y, turretAngle } = state.ship;

    // Ship body (does not rotate)
    this.drawSpriteGlow("ship", x - SS / 2, y - SS / 2, COLORS.cyan);

    // Turret — rotated around ship top-center
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y - SS / 2);
    ctx.rotate(turretAngle);
    this.drawSpriteGlow("turret", -SS / 2, -SS, COLORS.magenta);
    ctx.restore();
  }

  private drawBullets(state: GameState): void {
    for (const b of state.bullets) {
      const isPilot = b.vx === 0;
      const key = isPilot ? "bulletPilot" : "bulletGunner";
      const color = isPilot ? COLORS.cyan : COLORS.magenta;
      this.drawSpriteGlow(key, b.x - SS / 2, b.y - SS / 2, color);
    }
  }

  private drawEnemies(state: GameState): void {
    for (const e of state.enemies) {
      this.drawSpriteGlow("drone", e.x - SS / 2, e.y - SS / 2, COLORS.magenta);
    }
  }

  private drawGameOver(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, PLAYFIELD.width, PLAYFIELD.height);

    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.magenta;
    ctx.fillStyle = COLORS.magenta;
    ctx.font = "bold 32px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", PLAYFIELD.width / 2, PLAYFIELD.height / 2);
    ctx.shadowBlur = 0;
  }

  // Draw a sprite with neon self-glow (family convention).
  private drawSpriteGlow(
    key: "ship" | "turret" | "drone" | "bulletPilot" | "bulletGunner" | "explosion1" | "explosion2" | "powerup",
    x: number, y: number,
    glowColor: string,
  ): void {
    const ctx = this.ctx;
    ctx.shadowBlur = 10;
    ctx.shadowColor = glowColor;
    drawSprite(ctx, key, x, y, SPRITE_SCALE);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
}
