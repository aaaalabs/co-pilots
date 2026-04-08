---
title: Co-Pilots — Networking
date: 2026-04-08
status: draft
---

# Co-Pilots — Networking

## Authority model

**Pilot device = Host = single source of truth** für die Simulation.

Begründung:
- Pilot-Bewegung ist die latenz-kritischste Aktion (Kid spürt das Schiff direkt). Auf dem Host läuft sie ohne Lag.
- Gunner-Aim ist ebenfalls wichtig, aber lässt sich **lokal predicten** (siehe unten) — der Gunner sieht seinen eigenen Turret-Winkel sofort, der Host bestätigt im nächsten Snapshot.
- Spawning, Collisions, Damage, Scoring → alles deterministisch auf dem Host. Keine Sync-Konflikte.
- Im Disconnect-Fall pausiert der Host wie in Tetris (Pause-Pattern wiederverwendet).

## Transport

Identisch zu `tetris-battle`:
- PeerJS über WebRTC DataChannel
- STUN: `stun.l.google.com:19302`
- TURN: Metered API Fallback (gleicher `VITE_METERED_API_URL`-Mechanismus)
- Lobby-Code: 4 Buchstaben (z.B. `cp-XKLM`)

## Message protocol

```ts
// src/network/Protocol.ts

export type Message =
  // Lobby
  | { type: "ready"; player?: string; role: "pilot" | "gunner" }
  | { type: "start"; difficulty: "easy" | "normal" | "hard" }

  // Gameplay (host → gunner)
  | { type: "snapshot"; tick: number; state: SnapshotData }
  | { type: "event"; tick: number; event: GameEvent }  // hits, deaths, powerups

  // Gameplay (gunner → host)
  | { type: "input"; tick: number; aim: number; fire: boolean; sacrifice: boolean }

  // Lifecycle
  | { type: "pause" }
  | { type: "pauseAccept" }
  | { type: "pauseDeny" }
  | { type: "unpause" }
  | { type: "gameOver"; pilotScore: number; gunnerScore: number }
  | { type: "rematch" };

export type SnapshotData = {
  ship: { x: number; y: number; vx: number; vy: number; hp: number; turretAngle: number };
  bullets: Array<{ id: number; x: number; y: number; vx: number; vy: number; owner: 0 | 1 }>;
  enemies: Array<{ id: number; type: number; x: number; y: number; hp: number }>;
  powerups: Array<{ id: number; type: number; x: number; y: number }>;
  wave: number;
  pilotScore: number;
  gunnerScore: number;
  shieldEnergy: number;
};

export type GameEvent =
  | { kind: "enemyKilled"; enemyId: number; killedBy: "pilot" | "gunner" }
  | { kind: "shipHit"; damage: number }
  | { kind: "powerupCollected"; type: number }
  | { kind: "shieldBlocked" }
  | { kind: "bossDefeated"; bossId: number };
```

## Send rates

| Direction | Message | Rate |
|-----------|---------|------|
| Host → Gunner | `snapshot` | 20 Hz (every 50ms) |
| Host → Gunner | `event` | on-demand (max 30 Hz) |
| Gunner → Host | `input` | 30 Hz, only if changed |

## Bandwidth budget

Worst case: 30 enemies + 50 bullets + 5 powerups in scene.

- `snapshot` payload: ~1.5 KB (JSON, full state)
- 20 Hz × 1.5 KB = **30 KB/s downstream** (host → gunner)
- Gunner input: ~50 bytes × 30 Hz = **1.5 KB/s upstream**

Beide Werte sind weit unter WebRTC DataChannel Kapazitäten (typisch >100 KB/s). Auf 4G easy.

**Optimierung wenn nötig (post-MVP):**
- Binary-encoding (statt JSON) — spart ~60%
- Delta-snapshots (nur Änderungen) — spart ~80%
- Nicht in v1 nötig.

## Latency & prediction strategy

**Erwartete RTT:**
- Direct WebRTC: 30–80 ms (gleiche Stadt) bis 100–150 ms (Deutschland-weit)
- TURN-Relay: +30–100 ms
- Worst-case Design-Target: **200 ms** Gunner-zu-Host-zu-Gunner

**Pilot:** Kein Problem, ist auf dem Host. Nullzeit.

**Gunner:**
1. **Aim-Prediction**: Gunner-Client zeigt seinen Turret-Winkel **sofort** lokal, ohne auf Host zu warten. Wenn Snapshot kommt, **lerp** vom predicted Winkel zum authoritativen Winkel über 100 ms (smooth correction).
2. **Fire-Prediction**: Gunner sieht eigene Bullet-Spawns lokal als "Ghost Bullet" (visuell, nicht in Sim). Wenn der nächste Snapshot die echte Bullet vom Host enthält, fadet die Ghost weg und die echte Bullet wird gerendert. Vermeidet "tap → 100ms Stille → Schuss".
3. **Enemy/Bullet-Position**: Gunner rendert was im Snapshot steht. Falls flüssig nötig: zwischen den 20Hz-Snapshots **interpolieren** (50ms Buffer). Macht die Bewegung smooth bei Kosten von 50ms zusätzlicher Anzeige-Latenz — akzeptabel weil Pilot eh authoritative ist.

## Fairness / cheating

Nicht relevant. Familien-Coop, kein Wettkampf, kein Anti-Cheat nötig.

## Disconnect handling

Wiederverwendung des Tetris-Patterns:
- DataConnection `close` event → "Verbindung verloren"-Overlay
- Spiel pausiert sofort
- "Reconnect"-Button versucht erneut zu verbinden (mit gleichem Code)
- Nach 30s ohne Reconnect → "Game over (disconnected)"

## What we are NOT building

- Keine Authoritative-Server-Architektur (kein Backend für Sim)
- Keine Anti-Lag-Compensation jenseits von Aim-Prediction
- Keine Lockstep-Sync (Host-Authority reicht völlig)
- Keine Spectator-Modes
- Kein Server-Side State (außer optional Highscore-Endpoint analog `LeaderboardClient.ts` in Tetris)
