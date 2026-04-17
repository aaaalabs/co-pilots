import { PilotInput } from "../game/GameState";

const EASE_DIST = 60;
const COAST_DECAY = 0.92;
const COAST_MIN = 0.01;
const FIRE_RADIUS = 36; // tap within this distance of the ship → hold-to-fire

export class TouchPilotControls {
  private touching = false;
  private touchX = 0;
  private touchY = 0;
  private lastMoveX = 0;
  private lastMoveY = 0;
  private scaleX = 1;
  private scaleY = 1;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener("touchstart", this.handleStart, { passive: false });
    canvas.addEventListener("touchmove", this.handleMove, { passive: false });
    canvas.addEventListener("touchend", this.handleEnd);
    canvas.addEventListener("touchcancel", this.handleEnd);
    this.updateScale();
  }

  isActive(): boolean {
    return this.touching || Math.abs(this.lastMoveX) > COAST_MIN || Math.abs(this.lastMoveY) > COAST_MIN;
  }

  getPilotInput(shipX: number, shipY: number): PilotInput {
    let fire = false;
    if (this.touching) {
      const dx = this.touchX - shipX;
      const dy = this.touchY - shipY;
      const dist = Math.hypot(dx, dy);
      if (dist < FIRE_RADIUS) {
        // Tap-and-hold on the ship → stay put and fire
        this.lastMoveX = 0;
        this.lastMoveY = 0;
        fire = true;
      } else {
        const speed = Math.min(1, dist / EASE_DIST);
        this.lastMoveX = (dx / Math.max(dist, 0.001)) * speed;
        this.lastMoveY = (dy / Math.max(dist, 0.001)) * speed;
      }
    } else {
      this.lastMoveX *= COAST_DECAY;
      this.lastMoveY *= COAST_DECAY;
      if (Math.abs(this.lastMoveX) < COAST_MIN) this.lastMoveX = 0;
      if (Math.abs(this.lastMoveY) < COAST_MIN) this.lastMoveY = 0;
    }
    return { moveX: this.lastMoveX, moveY: this.lastMoveY, fire };
  }

  destroy(): void {
    this.canvas.removeEventListener("touchstart", this.handleStart);
    this.canvas.removeEventListener("touchmove", this.handleMove);
    this.canvas.removeEventListener("touchend", this.handleEnd);
    this.canvas.removeEventListener("touchcancel", this.handleEnd);
  }

  private updateScale(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.scaleX = this.canvas.width / rect.width;
    this.scaleY = this.canvas.height / rect.height;
  }

  private setFromTouch(t: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    this.touchX = (t.clientX - rect.left) * this.scaleX;
    this.touchY = (t.clientY - rect.top) * this.scaleY;
  }

  private handleStart = (e: TouchEvent): void => {
    e.preventDefault();
    this.updateScale();
    if (e.touches.length > 0) {
      this.touching = true;
      this.setFromTouch(e.touches[0]);
    }
  };

  private handleMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.setFromTouch(e.touches[0]);
    }
  };

  private handleEnd = (): void => {
    this.touching = false;
  };
}
