/** Pooled particle bursts: stars for success, petals for planting. Halved in low-power mode. */
import { Container, Graphics } from 'pixi.js';
import { C } from '../art/palette';
import type { GameApp } from './app';

interface P {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
}

export class Fx extends Container {
  private parts: P[] = [];
  private pool: Graphics[] = [];
  constructor(private game: GameApp) {
    super();
    this.eventMode = 'none';
  }

  burst(
    x: number,
    y: number,
    opts: {
      count?: number;
      colors?: number[];
      kind?: 'star' | 'dot' | 'petal';
      speed?: number;
      up?: boolean;
    } = {},
  ) {
    const n = Math.round((opts.count ?? 18) * (this.game.lowPower ? 0.5 : 1));
    const colors = opts.colors ?? [C.gold, 0xffffff, C.pink, C.sky];
    for (let i = 0; i < n; i++) {
      const g = this.pool.pop() ?? new Graphics();
      g.clear();
      const col = colors[i % colors.length]!;
      const r = 6 + Math.random() * 9;
      if (opts.kind === 'dot') g.circle(0, 0, r * 0.6).fill(col);
      else if (opts.kind === 'petal') g.ellipse(0, 0, r, r * 0.55).fill(col);
      else g.star(0, 0, 5, r, r * 0.45).fill(col);
      g.x = x;
      g.y = y;
      g.alpha = 1;
      g.scale.set(1);
      const a = opts.up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 1) * (0.25 + Math.random() * 0.55);
      this.addChild(g);
      this.parts.push({
        g,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 700 + Math.random() * 500,
        spin: (Math.random() - 0.5) * 0.01,
      });
    }
  }

  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.life += dt;
      p.vy += 0.0009 * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.rotation += p.spin * dt;
      const k = p.life / p.max;
      p.g.alpha = 1 - k;
      p.g.scale.set(1 - k * 0.5);
      if (k >= 1) {
        this.removeChild(p.g);
        this.pool.push(p.g);
        this.parts.splice(i, 1);
      }
    }
  }
}
