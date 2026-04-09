import { createInitialState, updateGameState, GameState, GunnerInput } from "../game/GameState";
import { createWaveSpawner, tickWaveSpawner, WaveSpawner } from "../game/WaveSpawner";
import { PLAYFIELD, SHIP } from "../game/constants";
import { Renderer } from "./Renderer";
import { KeyboardControls } from "./KeyboardControls";
import { MouseControls } from "./MouseControls";
import { PeerConnection } from "../network/PeerConnection";
import { Message } from "../network/Protocol";
import { serializeSnapshot, applySnapshot } from "../network/Snapshot";
import { Role } from "../network/Protocol";

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1;
const SNAPSHOT_INTERVAL = 1 / 20; // 20 Hz
const INPUT_INTERVAL = 1 / 30;    // 30 Hz

export interface GameScreenCallbacks {
  onExit: () => void;
}

export class GameScreen {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private keyboard: KeyboardControls | null = null;
  private mouse: MouseControls | null = null;
  private state: GameState;
  private spawner: WaveSpawner;
  private rafId: number | null = null;
  private lastFrameMs = 0;
  private accumulator = 0;
  private hudEl: HTMLDivElement;
  private callbacks: GameScreenCallbacks;
  private role: Role;
  private peer: PeerConnection | null;
  private tick = 0;
  private snapshotTimer = 0;
  private inputTimer = 0;
  private remoteGunnerInput: GunnerInput | null = null;
  private localAimAngle = 0;
  private frameDt = 0;
  private prevEnemyPositions = new Map<number, { x: number; y: number }>();

  constructor(
    parent: HTMLElement,
    callbacks: GameScreenCallbacks,
    role: Role,
    peer: PeerConnection | null,
  ) {
    this.callbacks = callbacks;
    this.role = role;
    this.peer = peer;

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
    this.state = createInitialState();
    this.spawner = createWaveSpawner();

    if (role === "pilot") {
      this.keyboard = new KeyboardControls();
      // Solo mode: also enable mouse for gunner aiming
      if (!peer) {
        this.mouse = new MouseControls(this.canvas);
      }
    } else {
      this.mouse = new MouseControls(this.canvas);
    }

    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.keyboard?.destroy();
    this.mouse?.destroy();
    this.container.remove();
  }

  handleNetworkMessage(msg: Message): void {
    if (msg.type === "snapshot" && this.role === "gunner") {
      this.state = applySnapshot(msg.state);
    } else if (msg.type === "input" && this.role === "pilot") {
      this.remoteGunnerInput = { aimAngle: msg.aim, fire: msg.fire };
    }
  }

  private handleFrame = (nowMs: number): void => {
    this.frameDt = Math.min((nowMs - this.lastFrameMs) / 1000, MAX_FRAME_DT);
    this.lastFrameMs = nowMs;

    if (this.role === "pilot") {
      this.updateHost(this.frameDt);
    } else {
      this.updateGunner(this.frameDt);
    }

    this.render();

    if (this.state.gameOver) {
      this.handleGameOver();
      return;
    }

    this.rafId = requestAnimationFrame(this.handleFrame);
  };

  private updateHost(frameDt: number): void {
    // Solo mode: read local mouse as gunner input
    const gunnerInput = this.mouse
      ? this.mouse.getGunnerInput(this.state.ship.x, this.state.ship.y)
      : this.remoteGunnerInput ?? undefined;

    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      const pilotInput = this.keyboard!.getPilotInput();
      tickWaveSpawner(this.spawner, this.state, FIXED_DT);
      this.state = updateGameState(
        this.state, FIXED_DT, pilotInput, gunnerInput,
      );
      this.tick++;
      this.accumulator -= FIXED_DT;
    }

    // Send snapshot to gunner
    if (this.peer) {
      this.snapshotTimer += frameDt;
      if (this.snapshotTimer >= SNAPSHOT_INTERVAL) {
        this.snapshotTimer -= SNAPSHOT_INTERVAL;
        this.peer.send({
          type: "snapshot",
          tick: this.tick,
          state: serializeSnapshot(this.state),
        });
      }
    }
  }

  private updateGunner(frameDt: number): void {
    // Read local mouse for aim + send to host
    if (this.mouse && this.peer) {
      const gi = this.mouse.getGunnerInput(this.state.ship.x, this.state.ship.y);
      this.localAimAngle = gi.aimAngle;

      this.inputTimer += frameDt;
      if (this.inputTimer >= INPUT_INTERVAL) {
        this.inputTimer -= INPUT_INTERVAL;
        this.peer.send({
          type: "input",
          tick: this.tick,
          aim: gi.aimAngle,
          fire: gi.fire,
        });
      }
    }
  }

  private render(): void {
    // Detect killed enemies → spawn explosion particles at their last position
    const currentIds = new Set(this.state.enemies.map(e => e.id));
    for (const [id, pos] of this.prevEnemyPositions) {
      if (!currentIds.has(id)) {
        this.renderer.spawnExplosionAt(pos.x, pos.y);
      }
    }
    this.prevEnemyPositions.clear();
    for (const e of this.state.enemies) {
      this.prevEnemyPositions.set(e.id, { x: e.x, y: e.y });
    }

    // For the gunner: override turret angle with local aim for instant feedback
    if (this.role === "gunner") {
      this.state.ship.turretAngle = this.localAimAngle;
    }
    this.renderer.draw(this.state, this.frameDt);
    this.renderHud();
  }

  private renderHud(): void {
    const hpPercent = Math.round((this.state.ship.hp / SHIP.maxHp) * 100);
    const heatPercent = Math.round(this.state.ship.heat * 100);
    const hpDanger = hpPercent <= 30 ? "danger" : "";
    const heatDanger = this.state.ship.overheated ? "danger" : heatPercent >= 70 ? "warning" : "";
    this.hudEl.innerHTML = `
      <div class="hud-cell">
        <div class="hud-label">HP</div>
        <div class="hud-value ${hpDanger}">${hpPercent}</div>
      </div>
      <div class="hud-cell">
        <div class="hud-label">${this.state.ship.overheated ? "COOL" : "HEAT"}</div>
        <div class="hud-value ${heatDanger}">${heatPercent}</div>
      </div>
      <div class="hud-cell">
        <div class="hud-label">Score</div>
        <div class="hud-value">${this.state.score}</div>
      </div>
    `;
  }

  private handleGameOver(): void {
    this.canvas.style.cursor = "pointer";
    this.canvas.addEventListener("click", () => this.callbacks.onExit(), { once: true });
  }
}
