// Lobby + gameplay messages. Protocol for PeerJS DataChannel.

export type Role = "pilot" | "gunner";
export type Difficulty = "easy" | "normal" | "hard";

export type SnapshotData = {
  ship: { x: number; y: number; hp: number; turretAngle: number };
  bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number }>;
  enemies: Array<{ id: number; x: number; y: number; hp: number }>;
  score: number;
  gameOver: boolean;
};

export type Message =
  // Lobby
  | { type: "ready"; player?: string; role: Role }
  | { type: "start"; difficulty: Difficulty }
  // Gameplay (host → gunner)
  | { type: "snapshot"; tick: number; state: SnapshotData }
  // Gameplay (gunner → host)
  | { type: "input"; tick: number; aim: number; fire: boolean }
  // Lifecycle
  | { type: "pause" }
  | { type: "pauseAccept" }
  | { type: "pauseDeny" }
  | { type: "unpause" }
  | { type: "gameOver"; score: number };

const VALID_TYPES = new Set<Message["type"]>([
  "ready",
  "start",
  "snapshot",
  "input",
  "pause",
  "pauseAccept",
  "pauseDeny",
  "unpause",
  "gameOver",
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
