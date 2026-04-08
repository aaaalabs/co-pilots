import { createInitialState, updateGameState, GameState } from "../game/GameState";
import { createWaveSpawner, tickWaveSpawner, WaveSpawner } from "../game/WaveSpawner";
import { PLAYFIELD, SHIP } from "../game/constants";
import { Renderer } from "./Renderer";
import { KeyboardControls } from "./KeyboardControls";
import { InputAdapter } from "./InputAdapter";

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1; // clamp to avoid huge catch-up after a tab pause

export interface GameScreenCallbacks {
  onExit: () => void;
}

export class GameScreen {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputAdapter;
  private state: GameState;
  private spawner: WaveSpawner;
  private rafId: number | null = null;
  private lastFrameMs = 0;
  private accumulator = 0;
  private hudEl: HTMLDivElement;
  private callbacks: GameScreenCallbacks;

  constructor(parent: HTMLElement, callbacks: GameScreenCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.className = "game-screen";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";
    this.canvas.width = PLAYFIELD.width;
    this.canvas.height = PLAYFIELD.height;

    this.hudEl = document.createElement("div");
    this.hudEl.className = "game-hud";

    this.container.appendChild(this.hudEl);
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    this.renderer = new Renderer(this.canvas);
    this.input = new KeyboardControls();
    this.state = createInitialState();
    this.spawner = createWaveSpawner();

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.input.destroy();
    this.container.remove();
  }

  private handleFrame = (nowMs: number): void => {
    const frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, MAX_FRAME_DT);
    this.lastFrameMs = nowMs;
    this.accumulator += frameDt;

    while (this.accumulator >= FIXED_DT) {
      const inputs = this.input.getPilotInput();
      tickWaveSpawner(this.spawner, this.state, FIXED_DT);
      this.state = updateGameState(this.state, FIXED_DT, inputs);
      this.accumulator -= FIXED_DT;
    }

    this.renderer.draw(this.state);
    this.renderHud();

    if (this.state.gameOver) {
      this.handleGameOver();
      return;
    }

    this.rafId = requestAnimationFrame(this.handleFrame);
  };

  private renderHud(): void {
    const hpPercent = Math.round((this.state.ship.hp / SHIP.maxHp) * 100);
    const danger = hpPercent <= 30 ? "danger" : "";
    this.hudEl.innerHTML = `
      <div class="hud-cell">
        <div class="hud-label">HP</div>
        <div class="hud-value ${danger}">${hpPercent}</div>
      </div>
      <div class="hud-cell">
        <div class="hud-label">Score</div>
        <div class="hud-value">${this.state.score}</div>
      </div>
    `;
  }

  private handleGameOver(): void {
    // Allow the game-over overlay to render for a moment, then attach a click-to-exit handler.
    this.canvas.style.cursor = "pointer";
    this.canvas.addEventListener("click", () => this.callbacks.onExit(), { once: true });
  }
}
