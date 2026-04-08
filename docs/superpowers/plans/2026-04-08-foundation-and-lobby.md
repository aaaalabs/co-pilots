# Co-Pilots — Plan 1: Foundation & Lobby

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working Vite+TypeScript+Vitest project with a code-based PeerJS lobby where two browser tabs can connect, exchange role/difficulty/name settings, and both press "Start" to trigger a (stubbed) game-start callback.

**Architecture:** Identisch zu `tetris-battle` (gleicher Ordner `_games/tetris-battle`). PeerConnection und Protocol-Pattern werden literal kopiert und auf den `cp-` Prefix angepasst. Der `LobbyScreen` ist neu und minimaler als der Tetris-Lobby (kein Leaderboard, kein Challenge-System, nur create/join-by-code wie der "private room" Flow). Der `main.ts` Router schaltet zwischen Lobby und einem Placeholder-Game-Screen, damit nachfolgende Pläne diesen Placeholder ersetzen können.

**Tech Stack:** TypeScript (strict), Vite, Vitest, PeerJS über WebRTC, Canvas 2D (erst ab Plan 2 relevant), HTML/CSS für Lobby.

**Scope dieses Plans:**
- ✅ Projekt-Scaffold (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`)
- ✅ `network/Protocol.ts` mit Lobby-Messages (TDD)
- ✅ `network/PeerConnection.ts` (aus Tetris adaptiert, Prefix `cp-`)
- ✅ `ui/LobbyScreen.ts` (create/join, Rollen, Difficulty, Namen, Start)
- ✅ `main.ts` Screen-Router mit Placeholder-Game-Screen
- ❌ KEIN GameState, keine Simulation, keine Snapshots (Plan 3)
- ❌ KEINE Sound-Engine (Plan 5)
- ❌ KEIN PWA, KEIN Vercel-Deploy (Plan 5)
- ❌ KEINE Touch-Controls (Plan 5; Desktop-Test reicht für Plan 1)
- ❌ KEIN Rendering / Canvas-Setup (Plan 2)

---

## File Structure (end state of this plan)

```
co-pilots/
  index.html                 # NEW
  package.json               # NEW
  tsconfig.json              # NEW
  vite.config.ts             # NEW
  .gitignore                 # NEW
  public/
    (empty for now; icon in Plan 5)
  src/
    main.ts                  # NEW — screen router
    network/
      PeerConnection.ts      # NEW — copy of tetris with cp- prefix
      Protocol.ts            # NEW — lobby message types only
    ui/
      LobbyScreen.ts         # NEW — create/join + settings form
      styles.css             # NEW — minimal lobby styles
  tests/
    Protocol.test.ts         # NEW — round-trip + validation
  docs/
    specs/                   # already exists
    superpowers/plans/       # already exists
```

**File responsibilities:**
- `Protocol.ts` — pure type definitions + `encodeMessage`/`decodeMessage`. No side effects. <80 lines.
- `PeerConnection.ts` — WebRTC-Wrapper, erzeugt Peer, sendet/empfängt Messages. Identisch zu Tetris bis auf Peer-ID-Prefix. ~260 lines (same as tetris).
- `LobbyScreen.ts` — DOM-Component. Rendert Lobby-HTML, sammelt Settings, dispatched Callbacks. <200 lines.
- `main.ts` — Entry, bootet Lobby, dispatched zwischen Screens, hält PeerConnection-Singleton. <150 lines.

---

## Task 1: Project scaffold

**Files:**
- Create: `co-pilots/package.json`
- Create: `co-pilots/tsconfig.json`
- Create: `co-pilots/vite.config.ts`
- Create: `co-pilots/index.html`
- Create: `co-pilots/.gitignore`

- [ ] **Step 1: Create `package.json`**

Write `co-pilots/package.json`:

```json
{
  "name": "co-pilots",
  "version": "0.1.0",
  "description": "Asymmetric co-op space shooter — two players, one ship.",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "peerjs": "^1.5.5"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "typescript": "^5.9.3",
    "vite": "^6.4.1",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

Write `co-pilots/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

Write `co-pilots/vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

Note: we use `jsdom` for tests so `LobbyScreen` DOM-handling can be tested later. Add `jsdom` to devDependencies — amend `package.json` from Step 1 to include `"jsdom": "^25.0.0"` under `devDependencies`.

- [ ] **Step 4: Create `index.html`**

Write `co-pilots/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Co-Pilots</title>
    <link rel="stylesheet" href="/src/ui/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

Write `co-pilots/.gitignore`:

```
node_modules
dist
.DS_Store
*.log
.env
.env.local
```

- [ ] **Step 6: Install dependencies**

Run: `cd co-pilots && npm install`
Expected: exits 0, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 7: Verify typecheck passes on empty project**

Run: `cd co-pilots && npm run typecheck`
Expected: Error — no files in `src/`. This is OK; just confirms tsc works. Skip to next task (Step 8 will fix this).

- [ ] **Step 8: Create stub `src/main.ts`**

Write `co-pilots/src/main.ts`:

```ts
const app = document.getElementById("app");
if (app) {
  app.textContent = "Co-Pilots — scaffold ready.";
}
```

- [ ] **Step 9: Re-run typecheck**

Run: `cd co-pilots && npm run typecheck`
Expected: PASS (no output, exit 0).

- [ ] **Step 10: Commit**

```bash
cd co-pilots
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src/main.ts
git commit -m "chore: scaffold co-pilots vite+ts+vitest project [CP01]"
```

---

## Task 2: Verify Vitest baseline (smoke test)

**Files:**
- Create: `co-pilots/tests/smoke.test.ts`

- [ ] **Step 1: Write the smoke test**

Write `co-pilots/tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd co-pilots && npm test`
Expected: PASS — `1 passed`.

If vitest complains about `jsdom` not being found, run `npm install --save-dev jsdom` and re-run.

- [ ] **Step 3: Commit**

```bash
cd co-pilots
git add tests/smoke.test.ts
git commit -m "test: add vitest smoke test [CP01]"
```

---

## Task 3: Protocol types and codec (TDD)

**Files:**
- Create: `co-pilots/src/network/Protocol.ts`
- Create: `co-pilots/tests/Protocol.test.ts`

This task defines only the **lobby-phase** messages. Gameplay messages (`snapshot`, `input`, `event`) are added in Plan 3.

- [ ] **Step 1: Write the failing tests first**

Write `co-pilots/tests/Protocol.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { encodeMessage, decodeMessage, Message } from "../src/network/Protocol";

describe("Protocol", () => {
  it("round-trips a ready message", () => {
    const msg: Message = { type: "ready", player: "Papa", role: "pilot" };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("round-trips a start message", () => {
    const msg: Message = { type: "start", difficulty: "normal" };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("round-trips lifecycle messages", () => {
    const msgs: Message[] = [
      { type: "pause" },
      { type: "pauseAccept" },
      { type: "pauseDeny" },
      { type: "unpause" },
    ];
    for (const m of msgs) {
      expect(decodeMessage(encodeMessage(m))).toEqual(m);
    }
  });

  it("returns null for invalid JSON", () => {
    expect(decodeMessage("not json {{{")).toBeNull();
  });

  it("returns null for unknown message type", () => {
    expect(decodeMessage(JSON.stringify({ type: "bogus" }))).toBeNull();
  });

  it("returns null for missing type field", () => {
    expect(decodeMessage(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd co-pilots && npm test -- Protocol`
Expected: FAIL with `Cannot find module '../src/network/Protocol'` or similar.

- [ ] **Step 3: Implement `Protocol.ts`**

Write `co-pilots/src/network/Protocol.ts`:

```ts
// Lobby + lifecycle messages only. Gameplay messages added in Plan 3.

export type Role = "pilot" | "gunner";
export type Difficulty = "easy" | "normal" | "hard";

export type Message =
  | { type: "ready"; player?: string; role: Role }
  | { type: "start"; difficulty: Difficulty }
  | { type: "pause" }
  | { type: "pauseAccept" }
  | { type: "pauseDeny" }
  | { type: "unpause" };

const VALID_TYPES = new Set<Message["type"]>([
  "ready",
  "start",
  "pause",
  "pauseAccept",
  "pauseDeny",
  "unpause",
]);

export function encodeMessage(msg: Message): string {
  return JSON.stringify(msg);
}

export function decodeMessage(data: string): Message | null {
  try {
    const parsed = JSON.parse(data);
    if (
      parsed &&
      typeof parsed.type === "string" &&
      VALID_TYPES.has(parsed.type as Message["type"])
    ) {
      return parsed as Message;
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd co-pilots && npm test -- Protocol`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Run typecheck**

Run: `cd co-pilots && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd co-pilots
git add src/network/Protocol.ts tests/Protocol.test.ts
git commit -m "feat(network): add lobby Protocol types and codec [CP01][NS01]"
```

---

## Task 4: PeerConnection (adapted from tetris-battle)

**Files:**
- Create: `co-pilots/src/network/PeerConnection.ts`

This is a near-literal copy of `../tetris-battle/src/network/PeerConnection.ts` with the `tb-` prefix changed to `cp-`. Do NOT add tests for this file — it is WebRTC-integration code and is tested manually in Task 7.

- [ ] **Step 1: Write `PeerConnection.ts`**

Write `co-pilots/src/network/PeerConnection.ts`:

```ts
import Peer, { DataConnection } from "peerjs";
import { Message, encodeMessage, decodeMessage } from "./Protocol";

export type ConnectionCallback = (msg: Message) => void;
export type StatusCallback = (status: string) => void;

const CONNECTION_TIMEOUT = 12000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const METERED_API_URL = (import.meta as any).env?.VITE_METERED_API_URL as string | undefined;

async function fetchIceServers(): Promise<RTCIceServer[]> {
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  if (!METERED_API_URL) return fallback;
  try {
    const res = await fetch(METERED_API_URL);
    const servers = await res.json();
    return servers;
  } catch {
    return fallback;
  }
}

function createPeerWithIce(iceServers: RTCIceServer[], id?: string): Peer {
  const opts = { config: { iceServers } };
  return id ? new Peer(id, opts) : new Peer(opts);
}

export class PeerConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onMessage: ConnectionCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private onDisconnect: (() => void) | null = null;
  private iceServers: RTCIceServer[] = [];

  setHandlers(handlers: {
    onMessage: ConnectionCallback;
    onStatus: StatusCallback;
    onDisconnect: () => void;
  }): void {
    this.onMessage = handlers.onMessage;
    this.onStatus = handlers.onStatus;
    this.onDisconnect = handlers.onDisconnect;
  }

  private async ensureIce(): Promise<void> {
    if (this.iceServers.length === 0) {
      this.iceServers = await fetchIceServers();
    }
  }

  async createRoom(): Promise<string> {
    await this.ensureIce();
    return new Promise((resolve, reject) => {
      const code = this.generateCode();
      const peerId = `cp-${code}`;
      this.peer = createPeerWithIce(this.iceServers, peerId);

      this.peer.on("open", () => {
        this.onStatus?.("Waiting for co-pilot...");
        resolve(code);
      });

      this.peer.on("connection", (conn) => {
        this.conn = conn;
        if (conn.open) {
          this.setupConnection();
        } else {
          conn.on("open", () => this.setupConnection());
        }
      });

      this.peer.on("error", (err) => {
        reject(err);
      });
    });
  }

  async joinRoom(code: string): Promise<void> {
    await this.ensureIce();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timed out"));
      }, CONNECTION_TIMEOUT);

      this.peer = createPeerWithIce(this.iceServers);
      this.peer.on("open", () => {
        this.onStatus?.("Connecting...");
        this.conn = this.peer!.connect(`cp-${code.toUpperCase()}`);
        this.conn.on("open", () => {
          clearTimeout(timeout);
          this.setupConnection();
          resolve();
        });
        this.conn.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      this.peer.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  send(msg: Message): void {
    if (this.conn?.open) {
      this.conn.send(encodeMessage(msg));
    }
  }

  destroy(): void {
    this.conn?.close();
    this.peer?.destroy();
    this.conn = null;
    this.peer = null;
  }

  private setupConnection(): void {
    if (!this.conn) return;

    this.detectConnectionType();

    this.conn.on("data", (data) => {
      const msg = decodeMessage(data as string);
      if (msg) this.onMessage?.(msg);
    });

    this.conn.on("close", () => {
      this.onDisconnect?.();
    });
  }

  private detectConnectionType(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (this.conn as any)?.peerConnection as RTCPeerConnection | undefined;
    if (!pc) {
      this.onStatus?.("Connected!");
      return;
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "checking") this.onStatus?.("Establishing route...");
      if (state === "connected" || state === "completed") {
        this.reportConnectionDetails(pc);
      }
      if (state === "failed") this.onStatus?.("Connection failed.");
    };

    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      this.reportConnectionDetails(pc);
    } else {
      this.onStatus?.("Connected! Optimizing...");
    }
  }

  private reportConnectionDetails(pc: RTCPeerConnection): void {
    pc.getStats().then(stats => {
      let relayed = false;
      let protocol = "";

      stats.forEach(report => {
        if (report.type === "candidate-pair" && (report as RTCIceCandidatePairStats).state === "succeeded") {
          const pair = report as RTCIceCandidatePairStats;
          const localId = pair.localCandidateId;
          const remoteId = pair.remoteCandidateId;

          stats.forEach(c => {
            if (c.id === localId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              protocol = (c as any).protocol ?? "";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((c as any).candidateType === "relay") relayed = true;
            }
            if (c.id === remoteId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if ((c as any).candidateType === "relay") relayed = true;
            }
          });
        }
      });

      const mode = relayed ? "relay" : "direct";
      const proto = protocol ? ` ${protocol.toUpperCase()}` : "";
      this.onStatus?.(`Connected! (${mode}${proto})`);
    }).catch(() => {
      this.onStatus?.("Connected!");
    });
  }

  private generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd co-pilots && npm run typecheck`
Expected: PASS (no errors). If `RTCIceCandidatePairStats` is missing, add `"DOM"` is already in `lib`, so it should be there. If errors persist about `state`, use `(report as any).state === "succeeded"`.

- [ ] **Step 3: Run existing tests to make sure nothing broke**

Run: `cd co-pilots && npm test`
Expected: PASS — Protocol tests + smoke test still green.

- [ ] **Step 4: Commit**

```bash
cd co-pilots
git add src/network/PeerConnection.ts
git commit -m "feat(network): add PeerConnection with cp- prefix [CP01]"
```

---

## Task 5: LobbyScreen component

**Files:**
- Create: `co-pilots/src/ui/LobbyScreen.ts`
- Create: `co-pilots/src/ui/styles.css`

The Lobby is a single HTML form that can be in one of three states: `initial` (choose create/join), `hosting` (showing room code, waiting for joiner), `joined` (both connected, showing settings). The LobbyScreen is DUMB — it just emits callbacks. `main.ts` (Task 6) wires up the network.

- [ ] **Step 1: Write `styles.css`**

Write `co-pilots/src/ui/styles.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0a0e27;
  color: #e0e6ff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

#app {
  width: 100%;
  max-width: 500px;
  padding: 24px;
}

.lobby {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
}

.lobby h1 {
  font-size: 32px;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.lobby .subtitle {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 16px;
}

.lobby input,
.lobby button {
  font-family: inherit;
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #2a3366;
  background: #141a3a;
  color: #e0e6ff;
}

.lobby input {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.lobby button {
  cursor: pointer;
  transition: background 0.15s;
}

.lobby button:hover:not(:disabled) {
  background: #1f2a55;
}

.lobby button.primary {
  background: #4a7fff;
  border-color: #4a7fff;
  color: #fff;
  font-weight: bold;
}

.lobby button.primary:hover:not(:disabled) {
  background: #5b8fff;
}

.lobby button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lobby .row {
  display: flex;
  gap: 8px;
}

.lobby .row > * {
  flex: 1;
}

.lobby .code-display {
  font-size: 36px;
  font-weight: bold;
  letter-spacing: 0.3em;
  padding: 20px;
  background: #141a3a;
  border-radius: 12px;
  border: 2px solid #4a7fff;
}

.lobby .status {
  font-size: 14px;
  opacity: 0.7;
  min-height: 20px;
}

.lobby .role-btn,
.lobby .diff-btn {
  flex: 1;
}

.lobby .role-btn.selected,
.lobby .diff-btn.selected {
  background: #4a7fff;
  border-color: #4a7fff;
}

.lobby label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
  text-align: left;
}
```

- [ ] **Step 2: Write `LobbyScreen.ts`**

Write `co-pilots/src/ui/LobbyScreen.ts`:

```ts
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
        <button class="primary" id="start-btn" ${!this.isHost ? "disabled" : ""}>
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
```

- [ ] **Step 3: Run typecheck**

Run: `cd co-pilots && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run tests (should still all pass)**

Run: `cd co-pilots && npm test`
Expected: PASS — smoke + Protocol tests.

- [ ] **Step 5: Commit**

```bash
cd co-pilots
git add src/ui/LobbyScreen.ts src/ui/styles.css
git commit -m "feat(ui): add LobbyScreen with create/join and settings [CP01][CS03][NS02]"
```

---

## Task 6: main.ts entry and screen router

**Files:**
- Modify: `co-pilots/src/main.ts` (replaces stub from Task 1)

The router wires `LobbyScreen` to `PeerConnection` and handles the message flow:

1. Host clicks Create → `peer.createRoom()` → show code.
2. Joiner enters code → `peer.joinRoom(code)` → both transition to `joined` state.
3. Both send `ready` messages with their settings; both know the peer's settings.
4. Host clicks Start → `peer.send({type:"start",difficulty})` → both call `handleGameStart`.
5. `handleGameStart` is stubbed (placeholder game screen) — next plans fill it in.

- [ ] **Step 1: Replace `src/main.ts`**

Write `co-pilots/src/main.ts`:

```ts
import { PeerConnection } from "./network/PeerConnection";
import { Message, Difficulty, Role } from "./network/Protocol";
import { LobbyScreen, LobbySettings } from "./ui/LobbyScreen";

const app = document.getElementById("app")!;

let lobby: LobbyScreen | null = null;
let peer: PeerConnection | null = null;
let isHost = false;
let localSettings: LobbySettings = {
  role: "pilot",
  difficulty: "normal",
  playerName: "",
};
let remoteRole: Role | null = null;
let remoteReady = false;

function showLobby(): void {
  cleanup();
  lobby = new LobbyScreen(app, {
    onCreateRoom: handleCreateRoom,
    onJoinRoom: handleJoinRoom,
    onSettingsChange: handleSettingsChange,
    onStart: handleStartClick,
  });
}

function cleanup(): void {
  lobby?.destroy();
  lobby = null;
  peer?.destroy();
  peer = null;
  remoteRole = null;
  remoteReady = false;
}

async function handleCreateRoom(): Promise<void> {
  isHost = true;
  localSettings.role = "pilot";
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });
  try {
    const code = await peer.createRoom();
    lobby?.setRoomCode(code);
  } catch (err) {
    lobby?.setStatus(`Error: ${(err as Error).message}`);
  }
}

async function handleJoinRoom(code: string): Promise<void> {
  isHost = false;
  localSettings.role = "gunner";
  peer = new PeerConnection();
  peer.setHandlers({
    onMessage: handleMessage,
    onStatus: (s) => lobby?.setStatus(s),
    onDisconnect: handleDisconnect,
  });
  try {
    await peer.joinRoom(code);
    lobby?.setJoined(false);
    sendReady();
  } catch (err) {
    lobby?.setStatus(`Error: ${(err as Error).message}`);
  }
}

function handleSettingsChange(settings: LobbySettings): void {
  localSettings = settings;
  sendReady();
}

function sendReady(): void {
  if (!peer) return;
  peer.send({
    type: "ready",
    player: localSettings.playerName,
    role: localSettings.role,
  });
}

function handleMessage(msg: Message): void {
  if (msg.type === "ready") {
    remoteReady = true;
    remoteRole = msg.role;
    // If host sees the joiner for the first time, transition host lobby to joined
    if (isHost && lobby) {
      lobby.setJoined(true);
      // Re-send our own ready so joiner has our info
      sendReady();
    }
    lobby?.setPeerReady(true);
    if (remoteRole === localSettings.role) {
      lobby?.setStatus(`Role conflict: both are ${localSettings.role}`);
    } else {
      lobby?.setStatus(`Co-pilot ready (${msg.player || "Player"})`);
    }
  } else if (msg.type === "start" && "difficulty" in msg) {
    handleGameStart(msg.difficulty);
  }
}

function handleStartClick(): void {
  if (!isHost || !peer) return;
  if (remoteRole === localSettings.role) {
    lobby?.setStatus("Can't start: role conflict");
    return;
  }
  peer.send({ type: "start", difficulty: localSettings.difficulty });
  handleGameStart(localSettings.difficulty);
}

function handleGameStart(difficulty: Difficulty): void {
  // PLACEHOLDER — replaced by GameScreen in Plan 2+
  lobby?.destroy();
  lobby = null;
  app.innerHTML = `
    <div class="lobby">
      <h1>CO-PILOTS</h1>
      <p class="subtitle">Game starting — placeholder</p>
      <p class="status">Role: ${localSettings.role} · Difficulty: ${difficulty}</p>
      <button id="back-btn" class="primary">Back to Lobby</button>
    </div>
  `;
  app.querySelector("#back-btn")!.addEventListener("click", () => showLobby());
}

function handleDisconnect(): void {
  lobby?.setStatus("Co-pilot disconnected");
  lobby?.setPeerReady(false);
  remoteReady = false;
  remoteRole = null;
}

showLobby();
```

- [ ] **Step 2: Run typecheck**

Run: `cd co-pilots && npm run typecheck`
Expected: PASS. If `noUnusedLocals` complains about `remoteReady`, note it is referenced in `handleDisconnect` — that's still a usage. If strict unused warning fires, that means the variable is read-only; mark it used by keeping the `remoteReady = false` assignment (which is present). If typecheck still complains, add `void remoteReady;` in `handleDisconnect` or remove the variable and rely solely on `remoteRole !== null`.

- [ ] **Step 3: Run tests**

Run: `cd co-pilots && npm test`
Expected: PASS — smoke + Protocol tests still green.

- [ ] **Step 4: Run the build**

Run: `cd co-pilots && npm run build`
Expected: PASS — `dist/` folder created with bundled assets.

- [ ] **Step 5: Commit**

```bash
cd co-pilots
git add src/main.ts
git commit -m "feat: wire LobbyScreen to PeerConnection in main router [CP01][NS02]"
```

---

## Task 7: Manual two-tab smoke test

**No new files.** This is a manual verification that the full stack works end-to-end. Automating WebRTC + two-browser-tab integration is out of scope for v1.

- [ ] **Step 1: Ask the user to start the dev server**

Per `CLAUDE.md` project preferences, **do not run `npm run dev` yourself** — ask the user to run it:

> "Please run `npm run dev` in the `co-pilots` folder, then open two browser tabs at the printed URL."

- [ ] **Step 2: Verify Tab A (host)**

Ask the user to:
1. In Tab A: click "Create Room"
2. Verify: a 4-character code appears (e.g., `XKLM`)
3. Verify: status shows "Waiting for co-pilot..."

- [ ] **Step 3: Verify Tab B (joiner)**

Ask the user to:
1. In Tab B: type the code from Tab A, click "Join Room"
2. Verify: both tabs transition to the "joined" state with role/name/difficulty UI
3. Verify: Tab A shows "Co-pilot ready (Player)" status
4. Verify: Tab B role defaults to "gunner", Tab A role defaults to "pilot"
5. Verify: Tab B's Start button is disabled ("Waiting for host...")
6. Verify: Tab A's difficulty buttons are visible, Tab B's are not

- [ ] **Step 4: Verify the Start flow**

Ask the user to:
1. In Tab A: click "Normal" difficulty, then "Start Game"
2. Verify: both tabs show the placeholder "Game starting — placeholder" screen
3. Verify: placeholder shows correct role (Tab A=pilot, Tab B=gunner) and difficulty (normal)
4. Click "Back to Lobby" in one tab — verify that tab returns to the initial lobby screen

- [ ] **Step 5: Verify role conflict detection**

Ask the user to:
1. Start fresh, create/join again
2. In Tab B: click "Pilot" role
3. Verify: Tab A shows "Role conflict: both are pilot" status
4. In Tab A: click "Gunner" → verify conflict clears
5. Verify: Tab A Start button is enabled again and starts the game

- [ ] **Step 6: Verify disconnect handling**

Ask the user to:
1. Start fresh, create/join again
2. Close Tab B
3. Verify: Tab A shows "Co-pilot disconnected" within a few seconds
4. Verify: Tab A's Start button becomes disabled again

- [ ] **Step 7: Final commit (if any fixes were needed)**

If any bugs were found and fixed during manual testing, commit them:

```bash
cd co-pilots
git add -u
git commit -m "fix(lobby): address issues from manual smoke test [CP01]"
```

If no fixes were needed, skip this step.

- [ ] **Step 8: Run final verification suite**

Run these in sequence:

```bash
cd co-pilots
npm run typecheck
npm test
npm run build
```

Expected: all three exit 0.

---

## Plan 1 — Definition of Done

All of these must be true:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (smoke test + 6 Protocol tests = 7 tests)
- [ ] `npm run build` produces `dist/` without errors
- [ ] Two browser tabs can create and join a room via 4-letter code
- [ ] Both players can set role, name, and (host only) difficulty
- [ ] Role conflict is detected and shown in the UI
- [ ] Host clicking "Start Game" transitions both tabs to the placeholder screen
- [ ] Closing one tab shows "Co-pilot disconnected" in the other
- [ ] All work committed on `main` (or a feature branch if you prefer)

When all boxes are checked, Plan 1 is done and Plan 2 (Core Simulation) can begin.
