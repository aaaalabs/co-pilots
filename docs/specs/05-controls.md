---
title: Co-Pilots — Controls
date: 2026-04-08
status: draft
---

# Co-Pilots — Controls

## Goal

Mixed input — jedes Gerät erkennt automatisch ob Touch oder Desktop, beide Rollen sind auf beiden Geräten spielbar. Code-Pattern wie in `tetris-battle/src/ui/TouchControls.ts`.

## Abstraction

`InputAdapter` emittiert pro Frame:

```ts
type PilotInput = {
  move: { x: number; y: number };  // -1..1, normalized
  fire: boolean;
};

type GunnerInput = {
  aimAngle: number;        // radians, world-space
  fire: boolean;
  sacrificeShield: boolean; // edge-triggered
};
```

Die Game-Logik weiß nichts über Touch/Maus/Tastatur. Nur der Adapter füllt die Strukturen.

## Pilot — Touch (Handy/Tablet)

- **Linker Daumen**: virtueller Joystick (gleiche Komponente wie Tetris-TouchControls). Bewegungs-Vektor.
- **Rechter Daumen**: dauerhaft anliegendes Tap-Pad → Hold-to-fire.
- Optional: auto-fire toggle in Lobby (für 7-Jährigen leichter).

## Pilot — Desktop

- **WASD oder Pfeiltasten**: 8-Wege-Bewegung.
- **Leertaste oder Maus links**: Schießen (hold).
- Maus-Aim: nicht für Pilot (Gunner-Sache).

## Gunner — Touch (Handy/Tablet)

- **Drag mit einem Finger**: Drag-Richtung relativ zum Schiff = Turret-Winkel. Loslassen ≠ Stop, der Winkel bleibt.
- **Tap mit zweitem Finger**: Schießen.
- Alternativer Modus (auswählbar in Lobby): **Auto-Fire bei aktivem Aim-Drag** — für jüngeres Kind, falls Finger-Multi-Tasking schwer ist.
- **Sacrifice-Button**: erscheint nur im 3-Sek-Fenster nach Schiff-Tod, großer roter Button mittig unten.

## Gunner — Desktop

- **Maus**: Cursor-Position relativ zum Schiff = Turret-Winkel.
- **Maus links**: Schießen.
- **S-Taste** (oder Leertaste): Sacrifice Shield.

## Gerät-Erkennung

```ts
// InputAdapter init
const isTouch = matchMedia("(pointer: coarse)").matches;
return isTouch ? new TouchInputAdapter(role) : new KeyboardMouseInputAdapter(role);
```

Beide Adapter implementieren dieselbe `InputAdapter`-Schnittstelle. Renderer / Game-Loop sehen keinen Unterschied.

## Lobby — Rollenwahl

Im Lobby-Screen wählt jeder Spieler **Pilot** oder **Gunner** (Buttons). Wenn beide dasselbe wählen → einer muss wechseln (UI-Hinweis). Default: Host = Pilot, Joiner = Gunner.

Difficulty wird **nur vom Host** gesetzt.

## Accessibility / kid-friendly toggles (Lobby)

- **Pilot Auto-Fire**: ON/OFF
- **Gunner Auto-Fire**: ON/OFF
- **Difficulty**: Easy / Normal / Hard
- **Spielername**: zwei freie Felder (wie Tetris)

Keine weiteren Settings in v1.
