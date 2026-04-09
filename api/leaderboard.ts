import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CHALLENGE_KEY = "copilots:challenges"; // hash: player → peerId
const SCORE_KEY = "copilots:scores";         // hash: player → score

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const action = req.query.action as string;

      if (action === "challenges") {
        const challenges = await redis.hgetall(CHALLENGE_KEY) as Record<string, string> | null;
        const list = Object.entries(challenges ?? {})
          .map(([player, peerId]) => ({ player, peerId: String(peerId) }));
        return res.json({ challenges: list });
      }

      if (action === "scores") {
        const scores = await redis.hgetall(SCORE_KEY) as Record<string, string> | null;
        const list = Object.entries(scores ?? {})
          .map(([player, score]) => ({ player, score: parseInt(String(score), 10) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);
        return res.json({ scores: list });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    if (req.method === "POST") {
      const { action, player, peerId, opponent, score } = req.body;

      if (action === "challenge") {
        await redis.hset(CHALLENGE_KEY, { [player]: peerId });
        return res.json({ ok: true });
      }

      if (action === "cancel-challenge") {
        await redis.hdel(CHALLENGE_KEY, player);
        return res.json({ ok: true });
      }

      if (action === "accept") {
        const storedPeerId = await redis.hget(CHALLENGE_KEY, opponent) as string | null;
        if (!storedPeerId) return res.json({ ok: false, peerId: null });
        await redis.hdel(CHALLENGE_KEY, opponent);
        return res.json({ ok: true, peerId: String(storedPeerId) });
      }

      if (action === "score") {
        const current = await redis.hget(SCORE_KEY, player) as string | null;
        const currentScore = parseInt(String(current ?? "0"), 10);
        if (score > currentScore) {
          await redis.hset(SCORE_KEY, { [player]: score });
        }
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
