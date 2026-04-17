import { createInitialState, updateGameState, GameState, GunnerInput } from "../game/GameState";
import { createWaveSpawner, tickWaveSpawner, WaveSpawner } from "../game/WaveSpawner";
import { PLAYFIELD, SHIP, WAVE } from "../game/constants";
import { Renderer } from "./Renderer";
import { KeyboardControls } from "./KeyboardControls";
import { MouseControls } from "./MouseControls";
import { TouchPilotControls } from "./TouchPilotControls";
import { OnScreenDpad } from "./OnScreenDpad";
import { PeerConnection } from "../network/PeerConnection";
import { Message } from "../network/Protocol";
import { serializeSnapshot, applySnapshot } from "../network/Snapshot";
import { Role } from "../network/Protocol";
import { SoundEngine } from "../audio/SoundEngine";
import { MusicEngine } from "../audio/MusicEngine";
import { LeaderboardClient } from "../network/LeaderboardClient";

const FIXED_DT = 1 / 60;

const BOSS_DISPLAY = [
  { type: 2, color: "var(--magenta)", label: "Sniper" },
  { type: 3, color: "var(--cyan)", label: "Strafer" },
  { type: 4, color: "var(--yellow)", label: "Splitter" },
  { type: 5, color: "#ff8800", label: "Charger" },
];
const MAX_FRAME_DT = 0.1;
const SNAPSHOT_INTERVAL = 1 / 20; // 20 Hz
const INPUT_INTERVAL = 1 / 30;    // 30 Hz

export interface GameScreenCallbacks {
  onExit: (finalScore: number) => void;
}

export interface GameScreenOptions {
  playerName: string;
  leaderboard: LeaderboardClient;
}

export class GameScreen {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private keyboard: KeyboardControls | null = null;
  private mouse: MouseControls | null = null;
  private touch: TouchPilotControls | null = null;
  private dpad: OnScreenDpad | null = null;
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
  private prevEnemyPositions = new Map<number, { x: number; y: number; type: number }>();
  private prevPickupY = new Map<number, number>();
  private sound = new SoundEngine();
  private music = new MusicEngine();
  private prevBulletCount = 0;
  private prevWave = 1;
  private prevOverheated = false;
  private playerName: string;
  private leaderboard: LeaderboardClient;
  private gameOverShown = false;

  constructor(
    parent: HTMLElement,
    callbacks: GameScreenCallbacks,
    role: Role,
    peer: PeerConnection | null,
    options: GameScreenOptions,
  ) {
    this.callbacks = callbacks;
    this.role = role;
    this.peer = peer;
    this.playerName = options.playerName;
    this.leaderboard = options.leaderboard;

    this.container = document.createElement("div");
    this.container.className = "game-screen";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";
    this.canvas.width = PLAYFIELD.width;
    this.canvas.height = PLAYFIELD.height;

    this.hudEl = document.createElement("div");
    this.hudEl.className = "game-hud";

    const exitBtn = document.createElement("button");
    exitBtn.className = "game-exit-btn";
    exitBtn.textContent = "✕";
    exitBtn.setAttribute("aria-label", "Exit to lobby");
    exitBtn.addEventListener("click", () => this.handleExit());

    this.container.appendChild(exitBtn);
    this.container.appendChild(this.hudEl);
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    window.addEventListener("keydown", this.handleKeyDown);

    this.renderer = new Renderer(this.canvas);
    this.state = createInitialState();
    this.spawner = createWaveSpawner();

    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;
    if (role === "pilot") {
      this.keyboard = new KeyboardControls();
      if (hasTouch) {
        this.touch = new TouchPilotControls(this.canvas);
        this.dpad = new OnScreenDpad();
      }
      // Solo mode: also enable mouse for gunner aiming
      if (!peer) {
        this.mouse = new MouseControls(this.canvas);
      }
    } else {
      this.mouse = new MouseControls(this.canvas);
    }

    this.music.start();
    this.lastFrameMs = performance.now();
    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener("keydown", this.handleKeyDown);
    this.keyboard?.destroy();
    this.mouse?.destroy();
    this.touch?.destroy();
    this.dpad?.destroy();
    this.music.stop();
    this.sound.stopAll();
    this.container.remove();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.handleExit();
    }
  };

  private handleExit(): void {
    this.callbacks.onExit(this.state.score);
  }

  handleNetworkMessage(msg: Message): void {
    if (msg.type === "snapshot" && this.role === "gunner") {
      this.state = applySnapshot(msg.state);
      this.spawner.wave = msg.state.wave;
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

  private getPilotInput() {
    const kb = this.keyboard!.getPilotInput();
    const t = this.touch?.getPilotInput(this.state.ship.x, this.state.ship.y);
    const touchActive = this.touch?.isActive() ?? false;
    if (this.dpad && this.dpad.isActive()) {
      const d = this.dpad.getInput();
      return { moveX: d.moveX, moveY: d.moveY, fire: kb.fire || (t?.fire ?? false) };
    }
    if (touchActive && t) {
      return { moveX: t.moveX, moveY: t.moveY, fire: kb.fire || t.fire };
    }
    return kb;
  }

  private updateHost(frameDt: number): void {
    // Solo mode: read local mouse as gunner input
    const gunnerInput = this.mouse
      ? this.mouse.getGunnerInput(this.state.ship.x, this.state.ship.y)
      : this.remoteGunnerInput ?? undefined;

    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      const pilotInput = this.getPilotInput();
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
          state: serializeSnapshot(this.state, this.spawner.wave),
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
    // Detect killed enemies → explosion particles + sound
    const currentIds = new Set(this.state.enemies.map(e => e.id));
    for (const [id, prev] of this.prevEnemyPositions) {
      if (!currentIds.has(id)) {
        const isBoss = prev.type >= 2 && prev.type <= 5;
        if (isBoss) {
          this.renderer.spawnBossExplosionAt(prev.x, prev.y);
          this.sound.play("bossKill");
        } else {
          this.renderer.spawnExplosionAt(prev.x, prev.y);
          this.sound.play("enemyKill");
        }
      }
    }
    this.prevEnemyPositions.clear();
    for (const e of this.state.enemies) {
      this.prevEnemyPositions.set(e.id, { x: e.x, y: e.y, type: e.type });
    }

    // Detect collected pickups (removed while still on-screen) → heal sound
    const currentPickupIds = new Set(this.state.pickups.map(p => p.id));
    for (const [id, lastY] of this.prevPickupY) {
      if (!currentPickupIds.has(id) && lastY < PLAYFIELD.height) {
        this.sound.play("coolReady");
      }
    }
    this.prevPickupY.clear();
    for (const p of this.state.pickups) {
      this.prevPickupY.set(p.id, p.y);
    }

    // Detect new bullets → shooting sounds
    const bulletCount = this.state.bullets.length;
    if (bulletCount > this.prevBulletCount) {
      const newest = this.state.bullets[this.state.bullets.length - 1];
      if (newest.enemy) {
        this.sound.play("bossShoot");
      } else if (newest.vx === 0) {
        this.sound.play("pilotShoot");
      } else {
        this.sound.play("gunnerShoot");
      }
    }
    this.prevBulletCount = bulletCount;

    // Detect wave change
    if (this.spawner.wave > this.prevWave) {
      this.sound.play("waveStart");
      // Speed up music slightly each wave
      this.music.setBpm(100 + (this.spawner.wave - 1) * 5);
      this.prevWave = this.spawner.wave;
    }

    // Detect overheat state change
    if (this.state.ship.overheated && !this.prevOverheated) {
      this.sound.play("overheat");
    } else if (!this.state.ship.overheated && this.prevOverheated) {
      this.sound.play("coolReady");
    }
    this.prevOverheated = this.state.ship.overheated;

    // For the gunner: override turret angle with local aim for instant feedback
    if (this.role === "gunner") {
      this.state.ship.turretAngle = this.localAimAngle;
    }
    this.renderer.draw(this.state, this.frameDt);
    this.renderHud();
  }

  private renderTrophies(): string {
    const wave = this.spawner.wave;
    const completedBossWaves = Math.floor((wave - 1) / WAVE.bossEveryN);
    const isBossWave = wave % WAVE.bossEveryN === 0;
    const bossExists = this.state.enemies.some(e => e.type >= 2 && e.type <= 5);
    const currentSlot = isBossWave && bossExists ? (completedBossWaves % BOSS_DISPLAY.length) : -1;
    const cells = BOSS_DISPLAY.map((b, i) => {
      const isCurrent = i === currentSlot;
      const isDefeated = !isCurrent && completedBossWaves > i;
      const state = isCurrent ? "current" : isDefeated ? "defeated" : "upcoming";
      return `<span class="trophy ${state}" title="${b.label}" style="--c:${b.color};"></span>`;
    });
    return cells.join("");
  }

  private renderHud(): void {
    const hp = Math.max(0, Math.min(SHIP.maxHp, this.state.ship.hp));
    const heat = this.state.ship.heat;
    const heatClass = this.state.ship.overheated ? "overheated" : heat >= 0.7 ? "hot" : "";
    const hearts =
      "❤".repeat(hp) +
      `<span class="empty">${"❤".repeat(SHIP.maxHp - hp)}</span>`;
    const trophies = this.renderTrophies();
    const score = this.state.score.toLocaleString();
    this.hudEl.innerHTML = `
      <div class="hud-stack hud-left">
        <div class="hud-hearts-row ${hp <= 3 ? "danger" : ""}">${hearts}</div>
        <div class="hud-meta">
          <span class="hud-tag">BOSS</span>
          <span class="hud-trophies">${trophies}</span>
        </div>
      </div>
      <div class="hud-stack hud-center">
        <span class="hud-tag">HEAT</span>
        <div class="heat-bar ${heatClass}">
          <div class="heat-fill" style="width:${Math.round(heat * 100)}%"></div>
        </div>
      </div>
      <div class="hud-stack hud-right">
        <div class="hud-line">
          <span class="hud-tag">WAVE</span>
          <span class="hud-num cyan">${this.spawner.wave}</span>
        </div>
        <div class="hud-line">
          <span class="hud-tag">SCORE</span>
          <span class="hud-num magenta">${score}</span>
        </div>
      </div>
    `;
  }

  private async handleGameOver(): Promise<void> {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    this.music.stop();
    this.sound.gameOver();

    const overlay = document.createElement("div");
    overlay.className = "game-over-overlay";
    overlay.innerHTML = `
      <div class="game-over-card">
        <h2 class="game-over-title">GAME OVER</h2>
        <div class="game-over-score">
          <div class="game-over-label">Score</div>
          <div class="game-over-value">${this.state.score}</div>
        </div>
        <div class="game-over-label">Highscores</div>
        <div class="game-over-scores" id="go-scores">
          <div style="opacity:0.5;">Lade...</div>
        </div>
        <button class="lobby-btn primary" id="go-exit">Zurück zur Lobby</button>
      </div>
    `;
    this.container.appendChild(overlay);

    const exitBtn = overlay.querySelector<HTMLButtonElement>("#go-exit")!;
    exitBtn.addEventListener("click", () => this.handleExit());

    // Pilot/host submits the score; gunner only fetches.
    if (this.role === "pilot" && this.state.score > 0) {
      this.leaderboard.submitScore(this.playerName, this.state.score).catch(() => {});
    }

    try {
      const scores = await this.leaderboard.getLeaderboard();
      const list = overlay.querySelector("#go-scores");
      if (list) {
        if (scores.length === 0) {
          list.innerHTML = `<div style="opacity:0.5;">Keine Einträge</div>`;
        } else {
          list.innerHTML = scores.slice(0, 5).map((s, i) => {
            const medal = i === 0 ? "👑" : `${i + 1}.`;
            const active = s.player === this.playerName ? "color: var(--cyan);" : "color: var(--text-mid);";
            return `<div style="${active} font-size:13px; display:flex; gap:8px; justify-content:space-between;">
              <span>${medal} ${escapeHtml(s.player)}</span>
              <span style="opacity:0.7;">${s.score.toLocaleString()}</span>
            </div>`;
          }).join("");
        }
      }
    } catch {
      const list = overlay.querySelector("#go-scores");
      if (list) list.innerHTML = `<div style="opacity:0.5;">⚠ Lade fehlgeschlagen</div>`;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
