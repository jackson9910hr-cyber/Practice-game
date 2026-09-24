/**
 * Chapter backgrounds: night sky + ground + chapter features. `restore` (0..1) blends from the
 * wilted grey garden to full colour — "colour coming back" is the main visual reward.
 */
import { Container, Graphics } from 'pixi.js';
import { C, mix, wilt } from './palette';

interface StarDot {
  g: Graphics;
  phase: number;
  speed: number;
}

export class GardenBackground extends Container {
  private sky = new Graphics();
  private stars = new Container();
  private ground = new Graphics();
  private features = new Graphics();
  private dots: StarDot[] = [];
  private t = 0;
  private w = 0;
  private h = 0;

  constructor(
    private chapter: string,
    private restore = 1,
  ) {
    super();
    this.addChild(this.sky, this.stars, this.ground, this.features);
  }

  /** Only the land changes colour, so only it is redrawn (cheap enough for per-frame tweens). */
  setRestore(v: number) {
    this.restore = Math.max(0, Math.min(1, v));
    this.drawLand();
  }

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.drawSky();
    this.drawLand();
  }

  private col(c: number) {
    return wilt(c, 1 - this.restore);
  }

  private drawSky() {
    const { w, h } = this;
    if (!w) return;
    const s = this.sky;
    s.clear();
    const top = this.chapter === 'skybridge' ? 0x1a2350 : 0x1b2550;
    const bottom =
      this.chapter === 'pond'
        ? 0x3a5a8c
        : this.chapter === 'forest'
          ? 0x2f4a6b
          : this.chapter === 'skybridge'
            ? 0x5d4d8c
            : 0x3d4a86;
    const bands = 24;
    for (let i = 0; i < bands; i++)
      s.rect(0, (h * i) / bands, w, h / bands + 1).fill(mix(top, bottom, i / (bands - 1)));
    // moon
    // moon kept clear of the HUD corners
    const mx = w * 0.7;
    const my = Math.max(150, h * 0.16);
    s.circle(mx, my, 46).fill({ color: 0xfff3c4, alpha: 0.95 });
    s.circle(mx + 18, my - 10, 40).fill(mix(top, bottom, my / h));

    // stars: a handful of layers that twinkle as groups (few Graphics, nothing leaks on resize)
    this.stars.removeChildren().forEach((c) => c.destroy());
    this.dots = [];
    const n = Math.round((w * h) / 16000);
    const layers = Array.from({ length: 6 }, () => new Graphics());
    for (let i = 0; i < n; i++) {
      const r = 1.5 + Math.random() * 2.5;
      layers[i % layers.length]!.circle(Math.random() * w, Math.random() * h * 0.55, r).fill(0xffffff);
    }
    for (const g of layers) {
      this.stars.addChild(g);
      this.dots.push({ g, phase: Math.random() * 6, speed: 0.5 + Math.random() * 1.5 });
    }
  }

  private drawLand() {
    const { w, h } = this;
    if (!w) return;
    const gr = this.ground;
    gr.clear();
    const hill1 = this.col(this.chapter === 'skybridge' ? 0x6f7fc4 : 0x2f8f6a);
    const hill2 = this.col(this.chapter === 'skybridge' ? 0x8c9ad8 : 0x3fae7e);
    gr.ellipse(w * 0.2, h * 1.02, w * 0.75, h * 0.3).fill(hill1);
    gr.ellipse(w * 0.85, h * 1.05, w * 0.7, h * 0.28).fill(hill2);
    gr.rect(0, h * 0.86, w, h * 0.14).fill(this.col(this.chapter === 'skybridge' ? 0x9aa6e0 : 0x4cc28a));

    const f = this.features;
    f.clear();
    const base = h * 0.8;
    if (this.chapter === 'flowerbed') {
      const cols = [C.pink, C.gold, 0xe63946, C.sky, 0xb784e0];
      for (let i = 0; i < 14; i++) {
        const x = (w / 14) * i + 20 + (i % 3) * 8;
        const y = base + (i % 2) * 30 + 20;
        f.moveTo(x, y)
          .lineTo(x, y - 40)
          .stroke({ width: 5, color: this.col(0x2d8a5a) });
        const pc = this.col(cols[i % cols.length]!);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          f.circle(x + Math.cos(a) * 11, y - 44 + Math.sin(a) * 11 * (0.4 + 0.6 * this.restore), 9).fill(pc);
        }
        f.circle(x, y - 44, 7).fill(this.col(C.gold));
      }
    } else if (this.chapter === 'pond') {
      f.ellipse(w * 0.5, base + 30, w * 0.34, h * 0.07).fill(this.col(0x4aa3df));
      f.ellipse(w * 0.5, base + 30, w * 0.34, h * 0.07).stroke({
        width: 4,
        color: this.col(0x2d6fa3),
        alpha: 0.6,
      });
      for (let i = 0; i < 4; i++) {
        const x = w * 0.3 + i * w * 0.13;
        f.ellipse(x, base + 28 + (i % 2) * 10, 28, 10).fill(this.col(0x3fae7e));
      }
      for (let i = 0; i < 6; i++) {
        const x = i < 3 ? w * 0.08 + i * 18 : w * 0.86 + (i - 3) * 18;
        f.moveTo(x, base + 50)
          .lineTo(x + 4, base - 30)
          .stroke({ width: 5, color: this.col(0x2d8a5a) });
        f.ellipse(x + 4, base - 30, 6, 18).fill(this.col(0x8d5524));
      }
    } else if (this.chapter === 'forest') {
      for (let i = 0; i < 7; i++) {
        const x = (w / 6) * i;
        const th = 120 + (i % 3) * 30;
        f.rect(x - 9, base - th * 0.3, 18, th * 0.45).fill(this.col(0x6b4226));
        f.circle(x, base - th * 0.55, 50 + (i % 2) * 12).fill(this.col(i % 2 ? 0x2d8a5a : 0x3fae7e));
        f.circle(x - 30, base - th * 0.4, 36).fill(this.col(0x2d8a5a));
      }
      for (let i = 0; i < 5; i++) {
        const x = w * 0.1 + i * w * 0.2;
        f.rect(x - 5, base + 40, 10, 16).fill(this.col(0xfff7e8));
        f.ellipse(x, base + 40, 20, 12).fill(this.col(0xe63946));
      }
    } else {
      // sky bridge: clouds + an arch of light
      for (let i = 0; i < 5; i++) {
        const x = (w / 4) * i;
        const y = base + 20 - (i % 2) * 20;
        f.circle(x, y, 40)
          .circle(x + 36, y + 6, 32)
          .circle(x - 34, y + 8, 30)
          .fill(this.col(0xffffff));
      }
      f.moveTo(w * 0.12, base)
        .quadraticCurveTo(w * 0.5, base - h * 0.35, w * 0.88, base)
        .stroke({ width: 16, color: this.col(C.gold), alpha: 0.85 });
      f.moveTo(w * 0.12, base + 10)
        .quadraticCurveTo(w * 0.5, base - h * 0.33, w * 0.88, base + 10)
        .stroke({ width: 6, color: this.col(C.pink), alpha: 0.7 });
    }
  }

  update(dt: number) {
    this.t += dt / 1000;
    for (const d of this.dots) d.g.alpha = 0.45 + 0.55 * Math.abs(Math.sin(this.t * d.speed + d.phase));
  }
}
