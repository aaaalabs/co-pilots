type Dir = "up" | "down" | "left" | "right";

const IS_TABLET = window.innerWidth >= 600;
const BTN_W = IS_TABLET ? 64 : 48;
const BTN_H = IS_TABLET ? 48 : 36;
const BTN_GAP = IS_TABLET ? 8 : 4;

export class OnScreenDpad {
  private overlay: HTMLElement;
  private pressed = new Set<Dir>();

  constructor() {
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);
  }

  getInput(): { moveX: number; moveY: number } {
    let moveX = 0;
    let moveY = 0;
    if (this.pressed.has("left")) moveX -= 1;
    if (this.pressed.has("right")) moveX += 1;
    if (this.pressed.has("up")) moveY -= 1;
    if (this.pressed.has("down")) moveY += 1;
    return { moveX, moveY };
  }

  isActive(): boolean {
    return this.pressed.size > 0;
  }

  destroy(): void {
    this.overlay.remove();
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: IS_TABLET ? "10px" : "6px",
      zIndex: "999",
      pointerEvents: "none",
    });

    const dpad = document.createElement("div");
    Object.assign(dpad.style, {
      display: "grid",
      gridTemplateColumns: `${BTN_W}px ${BTN_W}px ${BTN_W}px`,
      gridTemplateRows: `${BTN_H}px ${BTN_H}px`,
      gap: `${BTN_GAP}px`,
      pointerEvents: "auto",
    });

    dpad.appendChild(this.makeBtn("◀", "left"));
    dpad.appendChild(this.makeBtn("▲", "up"));
    dpad.appendChild(this.makeBtn("▶", "right"));
    dpad.appendChild(this.makeSpacer());
    dpad.appendChild(this.makeBtn("▼", "down"));
    dpad.appendChild(this.makeSpacer());

    overlay.appendChild(dpad);
    return overlay;
  }

  private makeSpacer(): HTMLElement {
    const spacer = document.createElement("div");
    spacer.style.pointerEvents = "none";
    return spacer;
  }

  private makeBtn(label: string, dir: Dir): HTMLElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      width: `${BTN_W}px`,
      height: `${BTN_H}px`,
      background: "rgba(10, 10, 26, 0.6)",
      color: "#00f0f0",
      border: "1px solid rgba(0, 240, 240, 0.2)",
      borderRadius: "10px",
      fontSize: IS_TABLET ? "18px" : "14px",
      cursor: "pointer",
      opacity: "0.5",
      touchAction: "none",
      userSelect: "none",
      fontFamily: "Orbitron, monospace",
      backdropFilter: "blur(4px)",
      transition: "all 0.1s",
      boxShadow: "0 0 6px rgba(0, 240, 240, 0.08)",
    });

    const press = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      this.pressed.add(dir);
      btn.style.opacity = "1";
      btn.style.boxShadow = "0 0 12px rgba(0, 240, 240, 0.3)";
      btn.style.borderColor = "rgba(0, 240, 240, 0.5)";
    };
    const release = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      this.pressed.delete(dir);
      btn.style.opacity = "0.5";
      btn.style.boxShadow = "0 0 6px rgba(0, 240, 240, 0.08)";
      btn.style.borderColor = "rgba(0, 240, 240, 0.2)";
    };

    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);

    return btn;
  }
}
