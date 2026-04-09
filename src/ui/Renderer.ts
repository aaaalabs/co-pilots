import { GameState } from "../game/GameState";
import { COLORS, PLAYFIELD } from "../game/constants";
import { drawSprite, getSpriteSize } from "./SpriteSheet";

const GRID_SIZE = 40;
const SPRITE_SCALE = 3;
const SS = getSpriteSize(SPRITE_SCALE);

// ── Stars ──
type Star = { x: number; y: number; speed: number; brightness: number; size: number };

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * PLAYFIELD.width,
      y: Math.random() * PLAYFIELD.height,
      speed: 8 + Math.random() * 40,
      brightness: 0.15 + Math.random() * 0.5,
      size: Math.random() < 0.15 ? 2 : 1,
    });
  }
  return stars;
}

// ── Nebula blobs ──
type Nebula = { x: number; y: number; r: number; hue: number; speed: number; alpha: number };

function createNebulae(): Nebula[] {
  const blobs: Nebula[] = [];
  for (let i = 0; i < 6; i++) {
    blobs.push({
      x: Math.random() * PLAYFIELD.width,
      y: Math.random() * PLAYFIELD.height,
      r: 40 + Math.random() * 80,
      hue: 240 + Math.random() * 60,
      speed: 3 + Math.random() * 8,
      alpha: 0.025 + Math.random() * 0.035,
    });
  }
  return blobs;
}

// ── Particles ──
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number };

// ── Bullet trail snapshot ──
type TrailDot = { x: number; y: number; age: number; color: string };

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private stars = createStars(80);
  private nebulae = createNebulae();
  private particles: Particle[] = [];
  private trails: TrailDot[] = [];
  private time = 0;
  private shakeAmount = 0;
  private prevHp = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  draw(state: GameState, dt: number): void {
    this.time += dt;
    this.detectHit(state);
    this.updateParticles(dt);
    this.updateTrails(state, dt);
    this.updateShake(dt);

    const ctx = this.ctx;
    const sx = (Math.random() - 0.5) * this.shakeAmount;
    const sy = (Math.random() - 0.5) * this.shakeAmount;

    ctx.save();
    ctx.translate(sx, sy);

    this.clear();
    this.drawNebulae();
    this.drawStars(dt);
    this.drawGrid();
    this.drawTrails();
    this.drawBullets(state);
    this.drawParticles();
    this.drawEnemies(state);
    this.drawEngineGlow(state);
    this.drawShip(state);

    if (state.gameOver) {
      this.drawGameOver();
    }

    ctx.restore();
  }

  // Ship hit → screen shake
  private detectHit(state: GameState): void {
    if (this.prevHp >= 0 && state.ship.hp < this.prevHp) {
      this.shakeAmount = 6;
    }
    this.prevHp = state.ship.hp;
  }

  spawnExplosionAt(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.3 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? COLORS.cyan : COLORS.magenta,
        size: 1 + Math.random() * 2.5,
      });
    }
  }

  // ── Update loops ──

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt; // gravity
      p.life -= dt / p.maxLife;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateTrails(state: GameState, dt: number): void {
    // Age existing trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].age += dt;
      if (this.trails[i].age > 0.15) this.trails.splice(i, 1);
    }
    // Add new trail dots from current bullets
    for (const b of state.bullets) {
      const isPilot = b.vx === 0;
      this.trails.push({
        x: b.x, y: b.y,
        age: 0,
        color: isPilot ? COLORS.cyan : COLORS.magenta,
      });
    }
  }

  private updateShake(dt: number): void {
    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 25);
  }

  // ── Draw layers ──

  private clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(-10, -10, PLAYFIELD.width + 20, PLAYFIELD.height + 20);
  }

  private drawNebulae(): void {
    const ctx = this.ctx;
    for (const b of this.nebulae) {
      const y = ((b.y + this.time * b.speed) % (PLAYFIELD.height + b.r * 2)) - b.r;
      const x = b.x + Math.sin(this.time * 0.3 + b.hue) * 15;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      grad.addColorStop(0, `hsla(${b.hue}, 60%, 18%, ${b.alpha * 1.5})`);
      grad.addColorStop(0.6, `hsla(${b.hue}, 50%, 10%, ${b.alpha})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
    }
  }

  private drawStars(dt: number): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      s.y = (s.y + s.speed * dt) % PLAYFIELD.height;
      const twinkle = 0.6 + 0.4 * Math.sin(this.time * 2 + s.x * 0.1);
      const alpha = s.brightness * twinkle;
      if (s.size === 2) {
        ctx.fillStyle = `rgba(0,240,240,${alpha * 0.5})`;
        ctx.fillRect(s.x, s.y, 2, 2);
      } else {
        ctx.fillStyle = `rgba(180,180,220,${alpha})`;
        ctx.fillRect(s.x, s.y, 1, 1);
      }
    }
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

  private drawTrails(): void {
    const ctx = this.ctx;
    for (const t of this.trails) {
      const alpha = 0.4 * (1 - t.age / 0.15);
      ctx.fillStyle = t.color.replace(")", `,${alpha})`).replace("rgb", "rgba").replace("#", "");
      // Simpler: just use globalAlpha
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.fillRect(t.x - 1, t.y - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  private drawEngineGlow(state: GameState): void {
    if (state.gameOver) return;
    const { x, y } = state.ship;
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
    const r = 14 + pulse * 8;
    const thrusterY = y + SS / 2;
    const grad = ctx.createRadialGradient(x, thrusterY, 0, x, thrusterY, r);
    grad.addColorStop(0, `rgba(0,240,240,${0.35 + pulse * 0.15})`);
    grad.addColorStop(0.4, `rgba(0,240,240,${0.08 + pulse * 0.04})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, thrusterY - r, r * 2, r * 2);

    // Thruster sparks
    for (let i = 0; i < 2; i++) {
      const sx = x + (Math.random() - 0.5) * 6;
      const sy = thrusterY + Math.random() * 6;
      ctx.fillStyle = `rgba(0,240,240,${0.3 + Math.random() * 0.3})`;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  private drawShip(state: GameState): void {
    const { x, y, turretAngle } = state.ship;
    this.drawSpriteGlow("ship", x - SS / 2, y - SS / 2, COLORS.cyan);

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

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
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
