import { InputAdapter } from "./InputAdapter";
import { PilotInput } from "../game/GameState";

const KEYS_LEFT = new Set(["ArrowLeft", "KeyA"]);
const KEYS_RIGHT = new Set(["ArrowRight", "KeyD"]);
const KEYS_UP = new Set(["ArrowUp", "KeyW"]);
const KEYS_DOWN = new Set(["ArrowDown", "KeyS"]);
const KEYS_FIRE = new Set(["Space"]);

export class KeyboardControls implements InputAdapter {
  private pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  getPilotInput(): PilotInput {
    let moveX = 0;
    let moveY = 0;
    if (this.anyPressed(KEYS_LEFT)) moveX -= 1;
    if (this.anyPressed(KEYS_RIGHT)) moveX += 1;
    if (this.anyPressed(KEYS_UP)) moveY -= 1;
    if (this.anyPressed(KEYS_DOWN)) moveY += 1;
    const fire = this.anyPressed(KEYS_FIRE);
    return { moveX, moveY, fire };
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.pressed.clear();
  }

  private anyPressed(set: Set<string>): boolean {
    for (const code of set) {
      if (this.pressed.has(code)) return true;
    }
    return false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.pressed.add(e.code);
    // Prevent space-scrolling and arrow-scrolling
    if (KEYS_FIRE.has(e.code) || KEYS_LEFT.has(e.code) || KEYS_RIGHT.has(e.code) || KEYS_UP.has(e.code) || KEYS_DOWN.has(e.code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  private handleBlur = (): void => {
    this.pressed.clear();
  };
}
