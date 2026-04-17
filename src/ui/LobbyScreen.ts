import { Role, Difficulty } from "../network/Protocol";
import { LeaderboardClient, ScoreEntry } from "../network/LeaderboardClient";

const PLAYERS = ["Leander", "Finn", "Mama", "Papa", "Rivka", "Erin", "Nele", "Sören"];
const STORAGE_KEY = "co-pilots-player";
const ROLE_KEY = "co-pilots-role";
const DIFF_KEY = "co-pilots-difficulty";

export interface LobbyCallbacks {
  onSolo: () => void;
  onChallenge: () => void;
  onCancelChallenge: () => void;
  onAcceptChallenge: (opponent: string) => void;
}

export class LobbyScreen {
  private container: HTMLDivElement;
  private callbacks: LobbyCallbacks;
  private playerName: string;
  private role: Role;
  private difficulty: Difficulty;
  private waiting = false;
  private statusMessage = "";
  private lb = new LeaderboardClient();
  private challenges: { player: string; peerId: string }[] = [];
  private pollId: ReturnType<typeof setInterval> | null = null;
  private scores: ScoreEntry[] = [];

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.playerName = localStorage.getItem(STORAGE_KEY) ?? "Leander";
    this.role = (localStorage.getItem(ROLE_KEY) as Role) ?? "pilot";
    this.difficulty = (localStorage.getItem(DIFF_KEY) as Difficulty) ?? "normal";
    this.container = document.createElement("div");
    parent.appendChild(this.container);
    this.render();
    this.startPolling();
    this.loadScores();
  }

  private async loadScores(): Promise<void> {
    try {
      this.scores = await this.lb.getLeaderboard();
      this.renderScores();
    } catch {
      // ignore
    }
  }

  private renderScores(): void {
    const el = this.container.querySelector("#highscore-display");
    if (!el) return;
    if (this.scores.length === 0) {
      el.innerHTML = "";
      return;
    }
    const top = this.scores.slice(0, 5);
    el.innerHTML = top.map((s, i) => {
      const medal = i === 0 ? "👑" : `${i + 1}.`;
      const active = s.player === this.playerName ? "color: var(--cyan);" : "color: var(--text-mid);";
      return `<div style="${active} font-size: 12px;">${medal} ${escapeHtml(s.player)} <span style="opacity:0.6;">${s.score.toLocaleString()}</span></div>`;
    }).join("");
  }

  get selectedPlayer(): string { return this.playerName; }
  get selectedRole(): Role { return this.role; }
  get selectedDifficulty(): Difficulty { return this.difficulty; }

  setStatus(msg: string): void {
    this.statusMessage = msg;
    const el = this.container.querySelector(".lobby-status");
    if (el) el.textContent = msg;
  }

  setWaiting(waiting: boolean): void {
    this.waiting = waiting;
    this.updateChallengeButton();
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
      this.challenges = challenges.filter(c => c.player !== this.playerName);
      this.renderChallengeList();
    } catch (err) {
      console.warn("Challenge poll failed:", err);
      this.setStatus("⚠ Verbindungsproblem");
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="lobby">
        <a href="https://hdc.ngo" class="lobby-title-link"><h1 class="lobby-title">CO-PILOTS</h1></a>
        <p class="lobby-subtitle">Two players, one ship</p>
        <div class="lobby-actions">
          <label class="lobby-label">Wer bist du?</label>
          <div class="lobby-row" id="player-row" style="flex-wrap: wrap; gap: 6px;">
            ${PLAYERS.map(p => `
              <button class="lobby-btn" data-player="${escapeHtml(p)}" style="flex: 0 0 calc(25% - 6px); padding: 10px 4px; font-size: 11px;">
                ${escapeHtml(p)}
              </button>
            `).join("")}
          </div>
          <label class="lobby-label">Deine Rolle (im Challenge)</label>
          <div class="lobby-row" id="role-row">
            <button class="lobby-btn" data-role="pilot">🚀 Pilot</button>
            <button class="lobby-btn" data-role="gunner">🎯 Gunner</button>
          </div>
          <label class="lobby-label">Schwierigkeit</label>
          <div class="lobby-row" id="diff-row">
            <button class="lobby-btn" data-diff="easy">Easy</button>
            <button class="lobby-btn" data-diff="normal">Normal</button>
            <button class="lobby-btn" data-diff="hard">Hard</button>
          </div>
          <div id="challenge-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          <button class="lobby-btn primary" id="challenge-btn">Challenge</button>
          <button class="lobby-btn" id="solo-btn">Solo Play</button>
          <p class="lobby-status">${escapeHtml(this.statusMessage)}</p>
          <div id="highscore-display" style="display:flex; flex-direction:column; gap:4px; align-items:center; margin-top:12px;"></div>
          <div class="controls-hint">
            <p>🚀 Pilot: Tippen zum Fliegen · Pfeile / WASD am Desktop</p>
            <p>🎯 Gunner: Tippen zum Zielen & Schießen · Maus am Desktop</p>
          </div>
        </div>
      </div>
    `;

    this.bindPlayerButtons();
    this.bindRoleButtons();
    this.bindDiffButtons();
    this.updateSelections();
    this.renderScores();

    this.container.querySelector("#challenge-btn")!
      .addEventListener("click", () => this.handleChallengeClick());
    this.container.querySelector("#solo-btn")!
      .addEventListener("click", () => this.callbacks.onSolo());

    this.renderChallengeList();
  }

  private bindPlayerButtons(): void {
    this.container.querySelectorAll<HTMLButtonElement>("[data-player]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.playerName = btn.dataset.player!;
        localStorage.setItem(STORAGE_KEY, this.playerName);
        this.updateSelections();
      });
    });
  }

  private bindRoleButtons(): void {
    this.container.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.role = btn.dataset.role as Role;
        localStorage.setItem(ROLE_KEY, this.role);
        this.updateSelections();
      });
    });
  }

  private bindDiffButtons(): void {
    this.container.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.difficulty = btn.dataset.diff as Difficulty;
        localStorage.setItem(DIFF_KEY, this.difficulty);
        this.updateSelections();
      });
    });
  }

  private updateSelections(): void {
    this.container.querySelectorAll<HTMLButtonElement>("[data-player]").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.player === this.playerName);
    });
    this.container.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.role === this.role);
    });
    this.container.querySelectorAll<HTMLButtonElement>("[data-diff]").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.diff === this.difficulty);
    });
  }

  private handleChallengeClick(): void {
    if (this.waiting) {
      this.callbacks.onCancelChallenge();
    } else {
      this.callbacks.onChallenge();
    }
  }

  private updateChallengeButton(): void {
    const btn = this.container.querySelector<HTMLButtonElement>("#challenge-btn");
    if (!btn) return;
    btn.textContent = this.waiting ? "Abbrechen" : "Challenge";
  }

  private renderChallengeList(): void {
    const list = this.container.querySelector("#challenge-list");
    if (!list) return;
    if (this.challenges.length === 0) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = this.challenges.map(c => `
      <button class="lobby-btn challenge-entry" data-opponent="${escapeHtml(c.player)}" style="border-color: var(--magenta);">
        ${escapeHtml(c.player)} will spielen!
      </button>
    `).join("");
    list.querySelectorAll<HTMLButtonElement>("[data-opponent]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.callbacks.onAcceptChallenge(btn.dataset.opponent!);
      });
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
