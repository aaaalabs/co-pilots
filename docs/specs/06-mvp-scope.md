---
title: Co-Pilots — MVP Scope
date: 2026-04-08
status: draft
---

# Co-Pilots — MVP Scope

Was muss in v1 drin sein, was wartet auf v2.

## v1 — must-have (definition of done)

### Setup
- [ ] Vite + TS Projekt aufgesetzt, läuft mit `npm run dev`
- [ ] Vitest läuft, mindestens 1 Test grün
- [ ] PWA installierbar (Manifest, SW, Icon)
- [ ] Vercel-Deploy funktioniert

### Lobby
- [ ] Create-Room generiert 4-Buchstaben-Code
- [ ] Join-Room mit Code funktioniert
- [ ] Rollenwahl Pilot/Gunner
- [ ] Difficulty-Auswahl Easy/Normal/Hard
- [ ] Spielernamen-Eingabe
- [ ] "Start Game" wenn beide ready

### Gameplay (host-authoritative)
- [ ] Schiff bewegt sich, schießt vorwärts
- [ ] Turret dreht sich, schießt unabhängig
- [ ] 4 Gegner-Typen spawnen wellenweise
- [ ] Welle 1–10 mit Boss auf Welle 5
- [ ] Bullets kollidieren mit Gegnern und Schiff
- [ ] Powerups droppen und werden eingesammelt
- [ ] Shield Sacrifice Revive funktioniert

### Networking
- [ ] PeerJS-Verbindung wie in Tetris
- [ ] Snapshot-Sync 20Hz Host → Gunner
- [ ] Input-Sync 30Hz Gunner → Host
- [ ] Aim-Prediction für Gunner
- [ ] Pause/Unpause-Pattern
- [ ] Disconnect-Erkennung mit Reconnect-Try

### Controls
- [ ] Touch-Adapter für beide Rollen
- [ ] Keyboard/Maus-Adapter für beide Rollen
- [ ] Auto-Detection per `pointer: coarse`
- [ ] Auto-Fire-Toggles

### UI / Feedback
- [ ] HUD: HP, Shield-Energy, Welle, beide Scores
- [ ] Game-Over-Screen mit beiden Scores
- [ ] Rematch-Button
- [ ] Sound-FX (Schuss, Treffer, Explosion, Boss-Spawn) — Web Audio API
- [ ] Mute-Toggle (wie Tetris Battle)

### Tests
- [ ] `GameState.update` deterministisch — golden test
- [ ] `WaveSpawner` — korrekte Welle/Schwierigkeit
- [ ] `Collision` — AABB / circle helpers
- [ ] `Snapshot` — round-trip serialize/deserialize
- [ ] `InputAdapter` — Touch und Keyboard Mocks emittieren korrekte Inputs

## v2 — explicit later (NOT in v1)

- Echter neuer Boss-Typ für Welle 10 (v1 nutzt Boss 1 mit härteren Parametern + zweiter Phase)
- Endless-Modus nach Welle 10
- 3-Spieler-Modus (beide Kids + Dad)
- Highscore-Server (analog `LeaderboardClient.ts` in Tetris)
- Schiffs-Customisation
- Mehr Gegner-Typen
- Mehr Powerups
- Music-Engine
- Achievements / Stats
- Mobile-Landscape-Optimierung jenseits "es funktioniert"

## Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Lag macht Gunner-Aim unspielbar | Aim-Prediction (siehe networking spec). Wenn immer noch schlecht: Host-Authority lockern, Gunner darf eigene Bullets spawnen, Host validiert nur. |
| Snapshot-Bandbreite zu hoch | Binary-encode (post-MVP), Delta-snapshots (post-MVP). v1 startet mit JSON. |
| 7-Jähriger findet Pilot trotzdem zu schwer | Auto-Fire + Easy-Difficulty + Sacrifice-Revive. Wenn das nicht reicht: "Bullet-Time-Powerup" als Notbremse. |
| Boss-Pattern unfair für Pilot mit Lag | Pilot ist Host = nullzeit. Boss-Bullets sind in Pilot's Sicht immer authoritative. |
| Disconnect mitten im Boss | Pause-on-disconnect + Reconnect-Try wie in Tetris. State bleibt im Host-Memory. |

## Definition of "Spielspaß"

Subjektiv aber wichtig:

1. Du und Finn (7) schafft Welle 5 in 2/3 der Versuche.
2. Du und Leander (10) schafft Welle 10 in 1/3 der Versuche.
3. Beide Jungs sagen mindestens einmal "noch eine Runde!" pro Session.
4. Du langweilst dich nicht in der Gunner-Rolle.
5. Wenn das Schiff explodiert, will der Gunner reflexartig Sacrifice drücken.

Wenn 1–4 erfüllt sind, ist v1 erfolgreich.
