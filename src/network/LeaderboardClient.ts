interface ChallengeEntry {
  player: string;
  peerId: string;
}

export interface ScoreEntry {
  player: string;
  score: number;
}

export class LeaderboardClient {
  private baseUrl = "/api";

  private post(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${this.baseUrl}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async postChallenge(player: string, peerId: string): Promise<void> {
    await this.post({ action: "challenge", player, peerId });
  }

  async cancelChallenge(player: string): Promise<void> {
    await this.post({ action: "cancel-challenge", player });
  }

  async acceptChallenge(player: string, opponent: string): Promise<string | null> {
    const res = await this.post({ action: "accept", player, opponent });
    const data = await res.json();
    return data.peerId ?? null;
  }

  async getActiveChallenges(): Promise<ChallengeEntry[]> {
    const res = await fetch(`${this.baseUrl}/leaderboard?action=challenges`);
    const data = await res.json();
    return data.challenges ?? [];
  }

  async submitScore(player: string, score: number): Promise<void> {
    await this.post({ action: "score", player, score });
  }

  async getLeaderboard(): Promise<ScoreEntry[]> {
    const res = await fetch(`${this.baseUrl}/leaderboard?action=scores`);
    const data = await res.json();
    return data.scores ?? [];
  }
}
