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
