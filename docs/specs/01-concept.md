---
title: Co-Pilots — Concept
date: 2026-04-08
status: draft
---

# Co-Pilots — Concept

## Pitch

A top-down 2D space shooter for **two players who share one ship**. One pilots, one mans the 360° turret. Connected over the internet via PeerJS (same stack as `tetris-battle`). Wave-based progression with bosses every 5 waves. Built for a dad to play with his 7- and 10-year-old sons.

## Why this design

Existing family games (Tetris Battle, Snakey) are competitive. The kids enjoy them, but the dad wants a **co-op** experience where he can be a "wingman" / safety net for the younger son without the older one getting bored. Asymmetric roles on a single shared ship solve this:

- The kid plays the **Pilot** — pure flying and dodging, no aim pressure. Suitable for the 7-year-old.
- The dad plays the **Gunner** — 360° turret, primary damage dealer. Gives the dad real agency, not a buff role.
- Either kid can pilot; the difficulty toggle scales the game to age.

Reference for the feel: *Lovers in a Dangerous Spacetime* (commercial). One ship, multiple stations, true teamwork.

## Vibe & constraints

- Bunt, kinderfreundlich. Kenney "Space Shooter Redux" sprites (CC0).
- Short runs (3–8 min) — same "one more round" rhythm as Tetris/Snakey.
- No story, no text walls. Sofort spielbar.
- PWA-installierbar wie Tetris Battle (Mobile-Homescreen).
- Familienspiel, keine Gewaltdarstellung jenseits "Raumschiff explodiert in Pixel-Funken".

## Goals

1. **Shared-ship co-op fühlt sich wie echtes Teamwork an** — keiner kann allein gewinnen, beide müssen kommunizieren.
2. **Low friction**: Lobby-Code eingeben → Schiff fliegt in 30 Sekunden.
3. **Skaliert über Alter**: 7-Jähriger schafft die ersten Wellen mit Dad-Support, 10-Jähriger schafft Boss-Fights.
4. **Technisch realistisch**: nutzt nur die Bausteine, die in Tetris/Snakey schon laufen.

## Non-goals (explicit YAGNI)

- Kein Matchmaking — Code-basierte Räume reichen, wie bei Tetris.
- Keine Accounts, kein Login.
- Keine Story / Cutscenes.
- Keine 3+ Spieler in v1 (auch wenn beide Kids gleichzeitig spielen wollen — das ist v2).
- Keine PvP-Modi.
- Kein Level-Editor, keine Schiffs-Customisation in v1.
- Keine Sound-Engine von Null — Web Audio API direkt wie in Tetris reicht.
