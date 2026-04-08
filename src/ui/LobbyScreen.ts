import { Role, Difficulty } from "../network/Protocol";

export interface LobbySettings {
  role: Role;
  difficulty: Difficulty;
  playerName: string;
}

export interface LobbyCallbacks {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onSettingsChange: (settings: LobbySettings) => void;
  onStart: () => void;
}

type LobbyState = "initial" | "hosting" | "joined";

export class LobbyScreen {
  private container: HTMLDivElement;
  private state: LobbyState = "initial";
  private callbacks: LobbyCallbacks;
  private settings: LobbySettings;
  private roomCode = "";
  private statusMessage = "";
  private isHost = false;
  private peerReady = false;

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.settings = {
      role: "pilot",
      difficulty: "normal",
      playerName: localStorage.getItem("co-pilots-name") ?? "",
    };
    this.container = document.createElement("div");
    parent.appendChild(this.container);
    this.render();
  }

  setRoomCode(code: string): void {
    this.roomCode = code;
    this.state = "hosting";
    this.isHost = true;
    this.render();
  }

  setJoined(asHost: boolean): void {
    this.state = "joined";
    this.isHost = asHost;
    if (!asHost) {
      // Joiner defaults to gunner
      this.settings.role = "gunner";
    }
    this.render();
  }

  setStatus(msg: string): void {
    this.statusMessage = msg;
    const el = this.container.querySelector(".status");
    if (el) el.textContent = msg;
  }

  setPeerReady(ready: boolean): void {
    this.peerReady = ready;
    const btn = this.container.querySelector<HTMLButtonElement>("#start-btn");
    if (btn) btn.disabled = !ready || !this.isHost;
  }

  destroy(): void {
    this.container.remove();
  }

  private render(): void {
    if (this.state === "initial") {
      this.renderInitial();
    } else if (this.state === "hosting") {
      this.renderHosting();
    } else {
      this.renderJoined();
    }
  }

  private renderInitial(): void {
    this.container.innerHTML = `
      <div class="lobby">
        <h1>CO-PILOTS</h1>
        <p class="subtitle">Two players, one ship</p>
        <button class="primary" id="create-btn">Create Room</button>
        <p class="subtitle">or</p>
        <input id="code-input" placeholder="ABCD" maxlength="4" autocapitalize="characters" />
        <button id="join-btn">Join Room</button>
        <p class="status">${this.statusMessage}</p>
      </div>
    `;
    this.container.querySelector("#create-btn")!
      .addEventListener("click", () => this.handleCreateClick());
    this.container.querySelector("#join-btn")!
      .addEventListener("click", () => this.handleJoinClick());
  }

  private renderHosting(): void {
    this.container.innerHTML = `
      <div class="lobby">
        <h1>CO-PILOTS</h1>
        <p class="subtitle">Share this code with your co-pilot</p>
        <div class="code-display">${this.roomCode}</div>
        <p class="status">${this.statusMessage || "Waiting for co-pilot..."}</p>
      </div>
    `;
  }

  private renderJoined(): void {
    const { role, difficulty, playerName } = this.settings;
    this.container.innerHTML = `
      <div class="lobby">
        <h1>CO-PILOTS</h1>
        <label>Your name</label>
        <input id="name-input" value="${escapeHtml(playerName)}" placeholder="Name" maxlength="12" style="text-transform:none;letter-spacing:normal;" />
        <label>Your role</label>
        <div class="row">
          <button class="role-btn ${role === "pilot" ? "selected" : ""}" data-role="pilot">🚀 Pilot</button>
          <button class="role-btn ${role === "gunner" ? "selected" : ""}" data-role="gunner">🎯 Gunner</button>
        </div>
        ${this.isHost ? `
          <label>Difficulty (host only)</label>
          <div class="row">
            <button class="diff-btn ${difficulty === "easy" ? "selected" : ""}" data-diff="easy">Easy</button>
            <button class="diff-btn ${difficulty === "normal" ? "selected" : ""}" data-diff="normal">Normal</button>
            <button class="diff-btn ${difficulty === "hard" ? "selected" : ""}" data-diff="hard">Hard</button>
          </div>
        ` : ""}
        <button class="primary" id="start-btn" ${!this.isHost || !this.peerReady ? "disabled" : ""}>
          ${this.isHost ? "Start Game" : "Waiting for host..."}
        </button>
        <p class="status">${this.statusMessage}</p>
      </div>
    `;

    const nameInput = this.container.querySelector<HTMLInputElement>("#name-input")!;
    nameInput.addEventListener("input", () => this.handleNameChange(nameInput.value));

    this.container.querySelectorAll<HTMLButtonElement>(".role-btn").forEach(btn => {
      btn.addEventListener("click", () => this.handleRoleClick(btn.dataset.role as Role));
    });

    if (this.isHost) {
      this.container.querySelectorAll<HTMLButtonElement>(".diff-btn").forEach(btn => {
        btn.addEventListener("click", () => this.handleDiffClick(btn.dataset.diff as Difficulty));
      });
      this.container.querySelector("#start-btn")!
        .addEventListener("click", () => this.handleStartClick());
    }
  }

  private handleCreateClick(): void {
    this.callbacks.onCreateRoom();
  }

  private handleJoinClick(): void {
    const input = this.container.querySelector<HTMLInputElement>("#code-input")!;
    const code = input.value.trim().toUpperCase();
    if (code.length !== 4) {
      this.setStatus("Code must be 4 characters");
      return;
    }
    this.callbacks.onJoinRoom(code);
  }

  private handleNameChange(value: string): void {
    this.settings.playerName = value;
    localStorage.setItem("co-pilots-name", value);
    this.callbacks.onSettingsChange(this.settings);
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
