/** Big, friendly, always-≥64px buttons and common HUD pieces. */
import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';
import { C, FONT_EN, FONT_KO } from '../art/palette';
import { emojiText } from '../art/pictures';
import { sfx } from '../audio/sfx';
import { MIN_HIT } from './app';
import { ease, tween } from './tween';

export interface ButtonOpts {
  size?: number;
  color?: number;
  icon?: string | Container;
  label?: string;
  labelFont?: 'ko' | 'en';
  shape?: 'circle' | 'pill';
  width?: number;
  onTap: (e: FederatedPointerEvent) => void;
  silent?: boolean;
  a11y?: string;
}

export class Button extends Container {
  readonly bg = new Graphics();
  private enabledFlag = true;
  constructor(public opts: ButtonOpts) {
    super();
    const size = Math.max(opts.size ?? MIN_HIT, MIN_HIT);
    const w = opts.shape === 'pill' ? Math.max(opts.width ?? size * 2, size) : size;
    const color = opts.color ?? C.cream;
    if (opts.shape === 'pill') {
      this.bg.roundRect(-w / 2, -size / 2 + 6, w, size, size / 2).fill({ color: 0x000000, alpha: 0.18 });
      this.bg
        .roundRect(-w / 2, -size / 2, w, size, size / 2)
        .fill(color)
        .stroke({ width: 5, color: 0xffffff, alpha: 0.9 });
    } else {
      this.bg.circle(0, 6, size / 2).fill({ color: 0x000000, alpha: 0.18 });
      this.bg
        .circle(0, 0, size / 2)
        .fill(color)
        .stroke({ width: 5, color: 0xffffff, alpha: 0.9 });
    }
    this.addChild(this.bg);
    if (opts.icon) {
      const ic = typeof opts.icon === 'string' ? emojiText(opts.icon, size * 0.5) : opts.icon;
      if (opts.label && opts.shape === 'pill') ic.x = -w / 2 + size * 0.5;
      this.addChild(ic);
    }
    if (opts.label) {
      const t = new Text({
        text: opts.label,
        style: {
          fontFamily: opts.labelFont === 'en' ? FONT_EN : FONT_KO,
          fontSize: size * 0.34,
          fontWeight: '800',
          fill: C.ink,
        },
      });
      t.anchor.set(0.5);
      if (opts.icon && opts.shape === 'pill') t.x = size * 0.3;
      this.addChild(t);
    }
    this.eventMode = 'static';
    this.cursor = 'pointer';
    if (opts.a11y) this.accessibleTitle = opts.a11y;
    this.on('pointerdown', () => {
      if (!this.enabledFlag) return;
      void tween(this.scale, { x: 0.9, y: 0.9 }, { duration: 80 });
    });
    const release = () => void tween(this.scale, { x: 1, y: 1 }, { duration: 260, ease: ease.outBack });
    this.on('pointerupoutside', release);
    this.on('pointertap', (e) => {
      release();
      if (!this.enabledFlag) return;
      if (!opts.silent) sfx.tap();
      opts.onTap(e);
    });
  }

  set enabled(v: boolean) {
    this.enabledFlag = v;
    this.alpha = v ? 1 : 0.45;
    this.eventMode = v ? 'static' : 'none';
  }
  get enabled() {
    return this.enabledFlag;
  }

  /** Gentle attention pulse (e.g. "tap me next"). */
  pulse(on = true) {
    (this as unknown as { _pulse: boolean })._pulse = on;
    const loop = async () => {
      while ((this as unknown as { _pulse: boolean })._pulse && !this.destroyed) {
        await tween(this.scale, { x: 1.12, y: 1.12 }, { duration: 500, ease: ease.inOutSine });
        if (this.destroyed) return;
        await tween(this.scale, { x: 1, y: 1 }, { duration: 500, ease: ease.inOutSine });
      }
    };
    if (on) void loop();
  }
}

/** Speaker icon drawn in code (so it never depends on an emoji font). */
export function speakerIcon(size: number, color: number = C.indigo): Graphics {
  const g = new Graphics();
  const s = size / 100;
  g.poly([
    -30 * s,
    -12 * s,
    -12 * s,
    -12 * s,
    8 * s,
    -30 * s,
    8 * s,
    30 * s,
    -12 * s,
    12 * s,
    -30 * s,
    12 * s,
  ]).fill(color);
  for (const r of [18, 32]) g.arc(10 * s, 0, r * s, -0.8, 0.8).stroke({ width: 6 * s, color, cap: 'round' });
  return g;
}

export function earButton(onTap: () => void): Button {
  return new Button({ icon: speakerIcon(70), color: C.cream, onTap, a11y: '다시 듣기' });
}

export function homeButton(onTap: () => void): Button {
  return new Button({ icon: '🏡', color: C.cream, onTap, a11y: '정원으로' });
}

/** Progress as little stars (no numbers needed). */
export class StarProgress extends Container {
  private stars: Graphics[] = [];
  constructor(total: number) {
    super();
    for (let i = 0; i < total; i++) {
      const g = new Graphics();
      g.star(0, 0, 5, 18, 8).fill({ color: 0xffffff, alpha: 0.25 });
      g.x = (i - (total - 1) / 2) * 44;
      this.stars.push(g);
      this.addChild(g);
    }
  }
  set(n: number) {
    this.stars.forEach((g, i) => {
      g.clear()
        .star(0, 0, 5, 18, 8)
        .fill(i < n ? { color: C.gold, alpha: 1 } : { color: 0xffffff, alpha: 0.25 });
      if (i === n - 1) {
        g.scale.set(1.6);
        void tween(g.scale, { x: 1, y: 1 }, { duration: 400, ease: ease.outBack });
      }
    });
  }
}

/** Rounded card with optional content, used for answer choices. */
export class Card extends Container {
  readonly bg = new Graphics();
  constructor(
    public w: number,
    public h: number,
    color: number = C.cream,
  ) {
    super();
    this.draw(color);
    this.addChild(this.bg);
  }
  draw(color: number, border: number = 0xffffff) {
    this.bg.clear();
    this.bg
      .roundRect(-this.w / 2, -this.h / 2 + 7, this.w, this.h, 26)
      .fill({ color: 0x000000, alpha: 0.18 });
    this.bg
      .roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 26)
      .fill(color)
      .stroke({ width: 6, color: border });
  }
}
