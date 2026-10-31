import { Container, Graphics, Text } from "pixi.js";
import type { Theme } from "@/hooks/useTheme";
import { getUiFontSize, UI_FONT_FAMILY } from "@/themes/typography";
import { readableTextColor } from "@/themes/gameTheme";
import { hexToNum } from "@/pixi/colorUtils";
import { animationsEnabled } from "@/pixi/effects/enabled";
import type { PlayerSeat } from "@/components/game/game.types";

const ENTER_MS = 220;
const HOLD_MS = 1100;
const EXIT_MS = 220;

export class TurnAnnouncement {
  readonly container = new Container({ eventMode: "none" });
  private readonly tab = new Container({ eventMode: "none" });
  private readonly clip = new Graphics();
  private readonly glow = new Graphics();
  private readonly frame = new Graphics();
  private readonly text = new Text({
    text: "",
    style: { fontFamily: UI_FONT_FAMILY, fontWeight: "700", fontSize: getUiFontSize("label") },
  });
  private startedAt: number | null = null;
  private seat: PlayerSeat = "self";
  private title = "";
  private width = 0;
  private height = 0;
  private clearance = 0;
  private tabHeight = 0;
  private theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;
    this.text.anchor.set(0.5);
    this.tab.addChild(this.glow, this.frame, this.text);
    this.clip.eventMode = "none";
    this.tab.mask = this.clip;
    this.container.addChild(this.clip, this.tab);
    this.container.visible = false;
  }

  show(title: string, seat: PlayerSeat): void {
    this.title = title;
    this.seat = seat;
    this.startedAt = performance.now();
    this.draw();
    this.tick();
  }

  resize(width: number, height: number, clearance = height / 2): void {
    if (this.width === width && this.height === height && this.clearance === clearance) return;
    this.width = width;
    this.height = height;
    this.clearance = clearance;
    if (this.startedAt !== null) this.draw();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    if (this.startedAt !== null) this.draw();
  }

  private draw(): void {
    const theme = this.theme.gameTheme;
    const accent = hexToNum(theme.playerColors[this.seat]);
    this.text.style.fontSize = getUiFontSize("label");
    this.text.style.fill = readableTextColor(
      theme.phaseStrip.background,
      theme.canvas.shadow,
      theme.textOnTinted,
    );
    this.text.text = this.title;
    this.text.scale.set(1);
    const width = Math.max(1, Math.min(this.width - 24, Math.max(192, this.text.width + 68)));
    this.text.scale.set(Math.min(1, Math.max(1, width - 48) / Math.max(1, this.text.width)));
    this.tabHeight = Math.max(34, this.text.height + 16);
    const reach = this.clearance + this.tabHeight + 32;
    this.clip
      .clear()
      .rect(
        -this.width / 2,
        this.seat === "self" ? this.clearance : -reach,
        this.width,
        reach - this.clearance,
      )
      .fill({ color: hexToNum(theme.canvas.neutral) });
    const left = -width / 2;
    const top = -this.tabHeight / 2;
    this.frame
      .clear()
      .roundRect(left, top, width, this.tabHeight, 8)
      .fill({ color: hexToNum(theme.phaseStrip.background), alpha: 0.97 })
      .stroke({ color: accent, width: 1.5 });
    this.glow.clear();
    for (let band = 3; band > 0; band--) {
      this.glow
        .roundRect(
          left - band * 2,
          top - band * 2,
          width + band * 4,
          this.tabHeight + band * 4,
          8 + band * 2,
        )
        .stroke({ color: accent, width: 2, alpha: 0.08 });
    }
    for (const x of [left + 18, -left - 18]) {
      this.frame.poly([x, -5, x + 3, 0, x, 5, x - 3, 0], true).fill({ color: accent });
    }
    const direction = this.seat === "self" ? 1 : -1;
    this.frame
      .moveTo(-6, direction * (this.tabHeight / 2 + 4))
      .lineTo(0, direction * (this.tabHeight / 2 + 10))
      .lineTo(6, direction * (this.tabHeight / 2 + 4))
      .stroke({ color: accent, width: 2 });
  }

  tick(): void {
    if (this.startedAt === null) return;
    const elapsed = performance.now() - this.startedAt;
    const motion = animationsEnabled();
    const duration = motion ? ENTER_MS + HOLD_MS + EXIT_MS : HOLD_MS;
    if (elapsed >= duration) {
      this.container.visible = false;
      this.startedAt = null;
      return;
    }
    const enter = Math.min(1, elapsed / ENTER_MS);
    const exit = Math.max(0, (elapsed - ENTER_MS - HOLD_MS) / EXIT_MS);
    const reveal = motion ? (1 - (1 - enter) ** 3) * (1 - exit ** 3) : 1;
    const direction = this.seat === "self" ? 1 : -1;
    this.container.position.set(this.width / 2, this.height / 2);
    this.tab.position.set(0, direction * (this.clearance + this.tabHeight / 2 + 12) * reveal);
    this.tab.alpha = reveal;
    this.glow.alpha = motion ? 0.55 + Math.sin(Math.min(1, elapsed / 900) * Math.PI) * 0.45 : 0;
    this.container.visible = this.width > 0;
  }
}
