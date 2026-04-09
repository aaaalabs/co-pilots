import { GunnerInput } from "../game/GameState";

export class MouseControls {
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  private scaleX = 1;
  private scaleY = 1;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.updateScale();
  }

  getGunnerInput(shipX: number, shipY: number): GunnerInput {
    this.updateScale();
    const dx = this.mouseX - shipX;
    const dy = this.mouseY - shipY;
    return {
      aimAngle: Math.atan2(dx, -dy),
      fire: this.mouseDown,
    };
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  private updateScale(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.scaleX = this.canvas.width / rect.width;
    this.scaleY = this.canvas.height / rect.height;
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * this.scaleX;
    this.mouseY = (e.clientY - rect.top) * this.scaleY;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.mouseDown = true;
  };

  private handleMouseUp = (): void => {
    this.mouseDown = false;
  };

  private handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };
}
