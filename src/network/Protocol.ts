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
