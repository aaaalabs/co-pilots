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

  it("round-trips a snapshot message", () => {
    const msg: Message = {
      type: "snapshot",
      tick: 42,
      state: {
        ship: { x: 100, y: 200, hp: 80, turretAngle: 1.5 },
        bullets: [{ id: 1, x: 10, y: 20, vx: 0, vy: -540 }],
        enemies: [{ id: 1, x: 50, y: 30, hp: 25 }],
        score: 120,
        gameOver: false,
      },
    };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it("round-trips an input message", () => {
    const msg: Message = { type: "input", tick: 10, aim: 1.2, fire: true };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });

  it("round-trips a gameOver message", () => {
    const msg: Message = { type: "gameOver", score: 350 };
    expect(decodeMessage(encodeMessage(msg))).toEqual(msg);
  });
});
