---
title: Co-Pilots — Architecture
date: 2026-04-08
status: draft
---

# Co-Pilots — Architecture

## Tech stack

Identisch zu `tetris-battle`. Keine neuen Dependencies in v1.

- **TypeScript** (strict)
- **Vite** (Dev-Server + Build)
- **Vitest** (Unit-Tests)
- **PeerJS** über WebRTC DataChannel
- **HTML Canvas 2D** (kein WebGL, kein Pixi/Phaser)
- **Web Audio API** direkt (kein Tone.js etc.)
- **PWA**: Service Worker + Manifest, gleicher Pattern wie Tetris

Hosting: Vercel (gleiches Setup, gleiches `vercel.json`-Pattern).

## Module / file layout

```
co-pilots/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  vercel.json
  public/
    icon.svg
    manifest.json
    sw.js
    sprites/        # Kenney Space Shooter Redux PNGs
  src/
    main.ts                  # Entry, screen routing
    game/
      constants.ts           # Tuning (HP, speeds, cooldowns, difficulty sets)
      Ship.ts                # Shared ship entity (position, HP, turret angle)
      Bullet.ts              # Bullet pool
      Enemy.ts               # Enemy types + base class
      Boss.ts                # Boss definitions
      Powerup.ts
      WaveSpawner.ts         # Wave/level scheduling
      GameState.ts           # Authoritative simulation (host runs this)
      Collision.ts           # AABB / circle collision helpers
    network/
      PeerConnection.ts      # Copy from tetris-battle, rename code prefix to "cp-"
      Protocol.ts            # New message types (see networking spec)
      Snapshot.ts            # Serialize/deserialize game state for sync
      InputBuffer.ts         # Gunner input buffering + send rate limiter
    ui/
      LobbyScreen.ts         # Create/join room, role select, difficulty
      GameScreen.ts          # Main game loop, render, input dispatch
      Renderer.ts            # Canvas draw routines
      TouchControls.ts       # Reuse pattern from tetris
      KeyboardControls.ts    # WASD / arrow keys / mouse
      InputAdapter.ts        # Polymorphic — emits abstract Pilot/Gunner inputs
      HUD.ts                 # Score streams, HP, shield, wave indicator
    audio/
      SoundEngine.ts         # Reuse pattern from tetris
      MusicEngine.ts         # Optional, can stub for v1
  tests/
    GameState.test.ts
    WaveSpawner.test.ts
    Collision.test.ts
    Snapshot.test.ts
    InputAdapter.test.ts
  docs/
    specs/                   # this folder
```

## Critical files (CS05: under 300–400 lines each)

- `GameState.ts` — die Simulation. Pure functional updates, keine Renderer-Calls. Testbar.
- `Snapshot.ts` — der einzige Ort wo State serialisiert wird. Versioniert, falls Protocol später wächst.
- `InputAdapter.ts` — übersetzt Touch/Keyboard/Mouse zu abstrakten Inputs (`{ pilotMove: Vec2, pilotFire: bool, gunnerAimAngle: number, gunnerFire: bool, sacrificeShield: bool }`). Halt die anderen Module gerätunabhängig.

## Game loop (host)

```
60Hz fixed timestep:
  1. read local input (host = pilot)
  2. read remote input (gunner, from InputBuffer)
  3. GameState.update(dt, inputs) → new state
  4. spawn enemies/bullets via WaveSpawner
  5. detect collisions
  6. resolve damage / score
  7. render (Renderer reads state)

20Hz network tick:
  8. Snapshot.serialize(state) → send to gunner
```

## Game loop (gunner client)

```
60Hz:
  1. read local input
  2. send InputDelta if changed (rate-limited 30Hz)
  3. apply incoming Snapshot when available (lerp turret angle for smoothness)
  4. local prediction: own turret angle = local input immediately
  5. render
```

## Constraints driven by CLAUDE.md

- **CS03/CS05**: keine Datei > 300–400 Zeilen, keine Komponente > ~100 Zeilen.
- **CP01/CP02**: KISS, minimaler Code. Wenn ein Feature 200 Zeilen braucht und v1-Spielspaß sich nicht ändert, wird es gestrichen.
- **CS01**: Struktur nach Domain (`game/`, `network/`, `ui/`, `audio/`).
- **NS02**: alle Event-Handler `handleX`.

## Reuse from tetris-battle (literal copy + adapt)

- `PeerConnection.ts` — Code-Präfix `tb-` → `cp-`, Rest unverändert.
- `SoundEngine.ts`, `MusicEngine.ts` — Pattern + ggf. Code direkt.
- `TouchControls.ts` — Joystick-Pattern wiederverwenden.
- PWA Manifest + Service Worker — Pfade anpassen.
- `vercel.json`, `vite.config.ts`, `package.json` — Templates.
- Lobby-Code-Generator (4 Buchstaben).

## What is NEW vs tetris-battle

- **Shared simulation** mit Authority (Tetris hatte zwei unabhängige Sims).
- **Snapshot/Reconciliation** (Tetris brauchte das nicht).
- **Mehr Entities** im Frame (Tetris hat Grid, hier ist's free-form).
- **InputAdapter**-Layer (Tetris hat Pilot-only Inputs).
