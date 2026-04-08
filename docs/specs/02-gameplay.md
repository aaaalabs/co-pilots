---
title: Co-Pilots — Gameplay
date: 2026-04-08
status: draft
---

# Co-Pilots — Gameplay

## Roles

### Pilot 🚀

- **Steuert die Position** des Schiffs (8-Wege-Bewegung in einem begrenzten Spielfeld).
- **Schießt Vorwärts-Standard-Laser** automatisch oder per Tap (Hold-to-fire).
- Kann **nicht** nach hinten/seitlich zielen → der Gunner ist essentiell.
- Sieht das gesamte Spielfeld.

### Gunner 🎯

- **Dreht das 360°-Turret** unabhängig von der Schiffsposition.
- **Schießt unabhängig** vom Pilot-Schuss (eigener Cooldown / eigene Bullet-Pool).
- Hat die **Shield-Energie**-Ressource (siehe unten).
- Sieht **dasselbe** Spielfeld wie der Pilot (kein Split-Screen, kein eigener Viewport).

## Core loop

1. Lobby: Spieler 1 erstellt Raum (4-Buchstaben-Code wie bei Tetris), wählt Pilot oder Gunner und Difficulty (Easy / Normal / Hard).
2. Spieler 2 joined per Code, übernimmt die andere Rolle.
3. Spiel startet → Wellen spawnen.
4. Welle 1–4: Standard-Gegner. Welle 5: Boss. Welle 6–9: schwerer. Welle 10: großer Boss. Welle 11+ (post-MVP): endless.
5. Game over wenn Schiff zerstört. Scoreboard, "Rematch"-Button (wie in Tetris Battle).

## Enemies (MVP)

| # | Typ | Verhalten | Schwierigkeit |
|---|-----|-----------|---------------|
| 1 | Drohne | Fliegt geradeaus von oben, schießt nicht | Easy |
| 2 | Jäger | Verfolgt das Schiff, langsamer Schuss | Medium |
| 3 | Flanker | Spawnt seitlich/hinten, schießt aufs Schiff | Medium → Hard für Pilot, Hauptaufgabe für Gunner |
| 4 | Bomber | Langsam, dropt Mine die nach 3s explodiert | Hard |

**Boss 1 (Welle 5):** Großes Schiff oben am Screen, drei Schwachstellen. Schießt einfache Bullet-Pattern (kein Bullet-Hell).
**Boss 2 (Welle 10, MVP):** Re-skin von Boss 1 mit doppelter HP, schnelleren Bullets und einer zweiten Phase (sobald HP < 50% rotiert er und feuert Streumuster). Kein neuer Code für das große Boss-Verhalten — nutzt dieselbe Boss-Klasse mit anderen Parametern. Wenn das zu wenig "boss" wirkt, in v2 echtes neues Boss-Modell.

## Wingman / Familienmechaniken

### Shield Sacrifice Revive

Wenn das Schiff explodiert, hat der Gunner **3 Sekunden** Zeit, "Sacrifice Shield" zu drücken. Wenn er das tut:
- Schiff wird mit 50% HP wiederbelebt
- Gunner verliert seine gesamte Shield-Energie (kann den Rest des Runs keinen Shield mehr nutzen)
- **Max 1× pro Run**

Macht aus "Papa rettet das Spiel" eine echte Mechanik mit Trade-off.

### Difficulty Toggle

Vor dem Run wählt der Host:

- **Easy** ("mit Finn") — wenig Gegner, langsame Bullets, Boss mit halber HP
- **Normal** ("mit Leander") — Standard
- **Hard** — mehr Gegner, schnellere Bullets, voller Boss

Eine Zeile Config, drei Konstanten-Sets.

### Getrennte Score-Streams

Beide Spieler sehen am Screen ihren eigenen Score:

- **Pilot**: Flugkilometer + Vorwärts-Kills + Dodges (knapp ausgewichene Bullets)
- **Gunner**: Turret-Kills + Saves (Bullets die auf das Schiff zugingen und vom Turret abgeschossen wurden) + Shield-Blocks

Am Ende werden beide kombiniert. **Beide haben "ihre Zahl" die hochgeht** — das ist wichtig fürs Familiengefühl.

## Powerups (MVP)

Drop von Gegnern (~10% Chance):

- **Repair** — +25% HP
- **Rapid Fire** — Pilot-Cooldown -50% für 8s
- **Twin Turret** — Gunner schießt für 8s zwei Bullets parallel
- **Shield Recharge** — füllt Gunner-Shield-Energie auf

Powerups schweben zum Schiff wenn es nahe genug ist (kein präzises Einsammeln nötig — kid-friendly).

## Win/Loss

- **Loss**: Ship-HP auf 0 ohne Sacrifice-Revive verfügbar.
- **Win (MVP)**: Welle 10 Boss (parametrisierter Boss 1) besiegen → Victory-Screen mit beiden Scores.
- **Post-MVP**: Endless-Modus nach Welle 10, echter neuer Boss-Typ, mehr Wellen.
