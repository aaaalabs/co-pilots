import { Role, Difficulty } from "../network/Protocol";
import { LeaderboardClient } from "../network/LeaderboardClient";

const PLAYERS = ["Leander", "Finn", "Mama", "Papa", "Rivka", "Erin", "Nele", "Sören"];
const STORAGE_KEY = "co-pilots-player";

export interface LobbySettings {
  role: Role;
  difficulty: Difficulty;
  playerName: string;
}

export interface LobbyCallbacks {
  onSolo: () => void;
  onChallenge: () => void;
  onCancelChallenge: () => void;
  onAcceptChallenge: (opponent: string) => void;
  onSettingsChange: (settings: LobbySettings) => void;
  onStart: () => void;
}

type LobbyState = "initial" | "waiting" | "joined";

export class LobbyScreen {
  private container: HTMLDivElement;
  private state: LobbyState = "initial";
  private callbacks: LobbyCallbacks;
  private settings: LobbySettings;
  private statusMessage = "";
  private isHost = false;
  private peerReady = false;
  private lb = new LeaderboardClient();
  private challenges: { player: string; peerId: string }[] = [];
  private pollId: ReturnType<typeof setInterval> | null = null;

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.settings = {
      role: "pilot",
      difficulty: "normal",
      playerName: localStorage.getItem(STORAGE_KEY) ?? "Leander",
    };
    this.container = document.createElement("div");
    parent.appendChild(this.container);
    this.render();
    this.startPolling();
  }

  get selectedPlayer(): string {
    return this.settings.playerName;
  }

  setJoined(asHost: boolean): void {
    this.state = "joined";
    this.isHost = asHost;
    if (!asHost) {
      this.settings.role = "gunner";
    }
    this.render();
  }

  setStatus(msg: string): void {
    this.statusMessage = msg;
    const el = this.container.querySelector(".lobby-status");
    if (el) el.textContent = msg;
  }

  setPeerReady(ready: boolean): void {
    this.peerReady = ready;
    const btn = this.container.querySelector<HTMLButtonElement>("#start-btn");
    if (btn) btn.disabled = !ready || !this.isHost;
  }

  setWaiting(waiting: boolean): void {
    if (waiting) {
      this.state = "waiting";
    } else {
      this.state = "initial";
    }
    this.render();
  }

  destroy(): void {
    this.stopPolling();
    this.container.remove();
  }

  private startPolling(): void {
    this.poll();
    this.pollId = setInterval(() => this.poll(), 3000);
  }

  private stopPolling(): void {
    if (this.pollId !== null) { clearInterval(this.pollId); this.pollId = null; }
  }

  private async poll(): Promise<void> {
    try {
      const challenges = await this.lb.getActiveChallenges();
      this.challenges = challenges.filter(c => c.player !== this.settings.playerName);
      this.renderChallengeList();
    } catch {
      // silently fail on network issues
    }
  }

  private renderChallengeList(): void {
    const list = this.container.querySelector("#challenge-list");
    if (!list) return;
    if (this.challenges.length === 0) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = this.challenges.map(c => `
      <button class="lobby-btn" data-opponent="${escapeHtml(c.player)}" style="border-color: var(--magenta);">
        ${escapeHtml(c.player)} will spielen!
      </button>
    `).join("");
    list.querySelectorAll<HTMLButtonElement>("[data-opponent]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.callbacks.onAcceptChallenge(btn.dataset.opponent!);
      });
    });
  }

  private render(): void {
    if (this.state === "joined") {
      this.renderJoined();
    } else if (this.state === "waiting") {
      this.renderWaiting();
    } else {
      this.renderInitial();
    }
  }

  private renderInitial(): void {
    const selected = this.settings.playerName;
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">CO-PILOTS</h1>
        <p class="lobby-subtitle">Two players, one ship</p>
        <div class="lobby-actions">
          <label class="lobby-label">Wer bist du?</label>
          <div class="lobby-row" style="flex-wrap: wrap; gap: 6px;">
            ${PLAYERS.map(p => `
              <button class="lobby-btn ${p === selected ? "selected" : ""}" data-player="${escapeHtml(p)}" style="flex: 0 0 calc(25% - 6px); padding: 10px 4px; font-size: 11px;">
                ${escapeHtml(p)}
              </button>
            `).join("")}
          </div>
          <div id="challenge-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          <button class="lobby-btn primary" id="challenge-btn">Challenge</button>
          <button class="lobby-btn" id="solo-btn">Solo Play</button>
          <p class="lobby-status">${escapeHtml(this.statusMessage)}</p>
        </div>
      </div>
    `;
    this.container.querySelectorAll<HTMLButtonElement>("[data-player]").forEach(btn => {
      btn.addEventListener("click", () => this.handlePlayerSelect(btn.dataset.player!));
    });
    this.container.querySelector("#challenge-btn")!
      .addEventListener("click", () => this.callbacks.onChallenge());
    this.container.querySelector("#solo-btn")!
      .addEventListener("click", () => this.callbacks.onSolo());
    this.renderChallengeList();
  }

  private renderWaiting(): void {
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">CO-PILOTS</h1>
        <p class="lobby-subtitle">${escapeHtml(this.settings.playerName)} wartet...</p>
        <div class="lobby-actions">
          <div class="lobby-code" style="font-size: clamp(18px, 5vw, 28px);">${escapeHtml(this.settings.playerName)}</div>
          <button class="lobby-btn" id="cancel-btn">Abbrechen</button>
          <p class="lobby-status">${escapeHtml(this.statusMessage || "Warte auf Mitspieler...")}</p>
        </div>
      </div>
    `;
    this.container.querySelector("#cancel-btn")!
      .addEventListener("click", () => this.callbacks.onCancelChallenge());
  }

  private renderJoined(): void {
    const { role, difficulty } = this.settings;
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">CO-PILOTS</h1>
        <p class="lobby-subtitle">Choose your station</p>
        <div class="lobby-actions">
          <label class="lobby-label">Your role</label>
          <div class="lobby-row">
            <button class="lobby-btn ${role === "pilot" ? "selected" : ""}" data-role="pilot">🚀 Pilot</button>
            <button class="lobby-btn ${role === "gunner" ? "selected" : ""}" data-role="gunner">🎯 Gunner</button>
          </div>
          ${this.isHost ? `
            <label class="lobby-label">Difficulty</label>
            <div class="lobby-row">
              <button class="lobby-btn ${difficulty === "easy" ? "selected" : ""}" data-diff="easy">Easy</button>
              <button class="lobby-btn ${difficulty === "normal" ? "selected" : ""}" data-diff="normal">Normal</button>
              <button class="lobby-btn ${difficulty === "hard" ? "selected" : ""}" data-diff="hard">Hard</button>
            </div>
          ` : ""}
          <button class="lobby-btn primary" id="start-btn" ${!this.isHost || !this.peerReady ? "disabled" : ""}>
            ${this.isHost ? "Start Game" : "Waiting for host..."}
          </button>
          <p class="lobby-status">${escapeHtml(this.statusMessage)}</p>
        </div>
      </div>
    `;
    this.container.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(btn => {
      btn.addEventListener("click", () => this.handleRoleClick(btn.dataset.role as Role));
    });
    if (this.isHost) {
      this.container.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach(btn => {
        btn.addEventListener("click", () => this.handleDiffClick(btn.dataset.diff as Difficulty));
      });
      this.container.querySelector("#start-btn")!
        .addEventListener("click", () => this.handleStartClick());
    }
  }

  private handlePlayerSelect(name: string): void {
    this.settings.playerName = name;
    localStorage.setItem(STORAGE_KEY, name);
    this.render();
  }

  private handleRoleClick(role: Role): void {
    this.settings.role = role;
    this.render();
    this.callbacks.onSettingsChange(this.settings);
  }

  private handleDiffClick(diff: Difficulty): void {
    this.settings.difficulty = diff;
    this.render();
    this.callbacks.onSettingsChange(this.settings);
  }

  private handleStartClick(): void {
    this.callbacks.onStart();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
