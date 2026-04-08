import { GameState } from "../game/GameState";
import { COLORS, PLAYFIELD, SHIP, BULLET, ENEMY_DRONE } from "../game/constants";

const GRID_SIZE = 40;

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
    const { x, y } = state.ship;
    // Cyan body
    this.drawCell(
      x - SHIP.bodyWidth / 2,
      y - SHIP.bodyHeight / 2,
      SHIP.bodyWidth,
      SHIP.bodyHeight,
      COLORS.cyan,
      10,
    );
    // Magenta turret stub on top of the body (visualises the gunner role)
    this.drawCell(
      x - SHIP.turretWidth / 2,
      y - SHIP.bodyHeight / 2 - SHIP.turretHeight,
      SHIP.turretWidth,
      SHIP.turretHeight,
      COLORS.magenta,
      8,
    );
  }

  private drawBullets(state: GameState): void {
    for (const b of state.bullets) {
      this.drawCell(
        b.x - BULLET.pilotWidth / 2,
        b.y - BULLET.pilotHeight / 2,
        BULLET.pilotWidth,
        BULLET.pilotHeight,
        COLORS.cyan,
        6,
      );
    }
  }

  private drawEnemies(state: GameState): void {
    for (const e of state.enemies) {
      this.drawCell(
        e.x - ENEMY_DRONE.width / 2,
        e.y - ENEMY_DRONE.height / 2,
        ENEMY_DRONE.width,
        ENEMY_DRONE.height,
        COLORS.magenta,
        10,
      );
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

  // Family canonical drawCell — solid fillRect + self-glow + top-left highlight strip.
  private drawCell(x: number, y: number, w: number, h: number, color: string, glow: number): void {
    const ctx = this.ctx;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
  }
}
