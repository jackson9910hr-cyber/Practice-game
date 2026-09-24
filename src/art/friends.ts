/**
 * Code-drawn garden friends (GDD §8.2): one of 8 soft base shapes + big eyes + one signature part.
 * All original designs — no existing characters.
 */
import { Container, Graphics } from 'pixi.js';
import type { Friend } from '../core/types';
import { C, hex } from './palette';

const R = 100; // body radius in local units; the sprite is scaled to the requested size

function bodyShape(g: Graphics, base: string, color: number) {
  switch (base) {
    case 'bean':
      g.ellipse(0, 6, R * 0.95, R * 0.82);
      break;
    case 'drop':
      g.moveTo(0, -R * 1.15)
        .bezierCurveTo(R * 0.55, -R * 0.55, R * 0.95, 0, R * 0.9, R * 0.35)
        .bezierCurveTo(R * 0.8, R * 0.95, -R * 0.8, R * 0.95, -R * 0.9, R * 0.35)
        .bezierCurveTo(-R * 0.95, 0, -R * 0.55, -R * 0.55, 0, -R * 1.15);
      break;
    case 'drop-up':
      g.moveTo(0, R * 1.1)
        .bezierCurveTo(R * 0.55, R * 0.6, R * 0.95, R * 0.1, R * 0.88, -R * 0.3)
        .bezierCurveTo(R * 0.78, -R * 0.95, -R * 0.78, -R * 0.95, -R * 0.88, -R * 0.3)
        .bezierCurveTo(-R * 0.95, R * 0.1, -R * 0.55, R * 0.6, 0, R * 1.1);
      break;
    case 'tri':
      g.roundPoly(0, 12, R * 1.05, 3, R * 0.32, 0);
      break;
    case 'cloud':
      g.circle(-R * 0.45, R * 0.15, R * 0.55)
        .circle(R * 0.45, R * 0.15, R * 0.55)
        .circle(0, -R * 0.2, R * 0.65)
        .ellipse(0, R * 0.35, R * 0.9, R * 0.5);
      break;
    case 'segments':
      for (let i = 4; i >= 1; i--) g.circle(-R * 0.55 * i + R * 0.1, R * 0.35, R * 0.42);
      g.circle(0, 0, R * 0.8);
      break;
    case 'drops':
      g.circle(0, 0, R * 0.8);
      break;
    default:
      g.circle(0, 0, R * 0.9);
  }
  g.fill(color).stroke({ width: 7, color: C.ink, alpha: 0.9, join: 'round' });
}

function drop(g: Graphics, x: number, y: number, r: number, color: number) {
  g.moveTo(x, y - r * 1.3)
    .bezierCurveTo(x + r * 0.7, y - r * 0.4, x + r, y + r * 0.2, x, y + r)
    .bezierCurveTo(x - r, y + r * 0.2, x - r * 0.7, y - r * 0.4, x, y - r * 1.3)
    .fill(color)
    .stroke({ width: 5, color: C.ink, alpha: 0.9 });
}

/** Parts drawn BEHIND the body. */
function signatureBack(g: Graphics, sig: string, a: number, b: number) {
  switch (sig) {
    case 'petal-crown':
      // a flower-bud sprite: red petals fanned around the top of the head
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * 1.08 + (i / 6) * Math.PI * 0.84;
        const x = Math.cos(ang) * R * 0.92;
        const y = Math.sin(ang) * R * 0.92;
        g.ellipse(x, y, R * 0.3, R * 0.2)
          .fill(b)
          .stroke({ width: 4, color: C.ink, alpha: 0.7 });
      }
      g.moveTo(0, R * 0.85)
        .quadraticCurveTo(R * 0.1, R * 1.15, 0, R * 1.3)
        .stroke({ width: 10, color: 0x2d8a5a, cap: 'round' });
      g.ellipse(R * 0.22, R * 1.12, R * 0.2, R * 0.1).fill(0x5ed3a2);
      break;
    case 'brush-tail':
      g.moveTo(R * 0.7, R * 0.5)
        .bezierCurveTo(R * 1.4, R * 0.6, R * 1.5, 0, R * 1.3, -R * 0.4)
        .stroke({ width: 12, color: a, cap: 'round' });
      g.ellipse(R * 1.3, -R * 0.55, R * 0.16, R * 0.26)
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      break;
    case 'flower-shell':
      for (let i = 0; i < 5; i++) {
        const x = -R * 0.7 + i * R * 0.35;
        const y = -R * 0.72 + Math.abs(i - 2) * R * 0.12;
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          g.circle(x + Math.cos(ang) * 11, y + Math.sin(ang) * 11, 9).fill(b);
        }
        g.circle(x, y, 7).fill(C.gold);
      }
      break;
    case 'shell-house':
      g.circle(R * 0.55, -R * 0.2, R * 0.7)
        .fill(a)
        .stroke({ width: 6, color: C.ink, alpha: 0.8 });
      g.moveTo(R * 0.55, -R * 0.2);
      for (let t = 0; t < 12; t += 0.3)
        g.lineTo(R * 0.55 + Math.cos(t) * t * 4.2, -R * 0.2 + Math.sin(t) * t * 4.2);
      g.stroke({ width: 5, color: C.ink, alpha: 0.5 });
      break;
    case 'dandelion-mane':
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2;
        g.circle(Math.cos(ang) * R * 1.02, Math.sin(ang) * R * 1.02, R * 0.22).fill(b);
      }
      break;
    case 'lotus-shawl':
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * 0.05 + (i / 6) * Math.PI * 0.9;
        g.ellipse(Math.cos(ang) * R * 0.85, R * 0.45 + Math.sin(ang) * R * 0.1, R * 0.3, R * 0.18)
          .fill(a)
          .stroke({ width: 3, color: C.ink, alpha: 0.5 });
      }
      break;
    case 'banana-hammock':
      g.moveTo(-R * 1.3, R * 0.4)
        .quadraticCurveTo(0, R * 1.45, R * 1.3, R * 0.4)
        .quadraticCurveTo(0, R * 1.05, -R * 1.3, R * 0.4)
        .fill(C.gold)
        .stroke({ width: 4, color: C.ink, alpha: 0.7 });
      break;
    case 'milk-fluff':
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        g.circle(Math.cos(ang) * R * 0.95, Math.sin(ang) * R * 0.75, R * 0.28)
          .fill(0xffffff)
          .stroke({ width: 3, color: 0xd8e6f5 });
      }
      break;
    case 'pinwheel-tail':
      g.moveTo(R * 0.8, R * 0.3)
        .lineTo(R * 1.35, -R * 0.1)
        .stroke({ width: 6, color: C.ink });
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        g.poly([
          R * 1.35,
          -R * 0.1,
          R * 1.35 + Math.cos(ang) * 38,
          -R * 0.1 + Math.sin(ang) * 38,
          R * 1.35 + Math.cos(ang + 0.7) * 30,
          -R * 0.1 + Math.sin(ang + 0.7) * 30,
        ]).fill(i % 2 ? a : b);
      }
      break;
    case 'rainbow-wings':
    case 'cloud-wings':
      for (const s of [-1, 1]) {
        if (sig === 'rainbow-wings') {
          [0xe63946, 0xffd60a, 0x2dc653, 0x3a86ff].forEach((col, i) => {
            g.ellipse(s * (R * 1.0 + i * 3), -R * 0.1, R * (0.55 - i * 0.1), R * (0.4 - i * 0.07)).fill(col);
          });
        } else {
          g.circle(s * R * 1.05, -R * 0.1, R * 0.32)
            .circle(s * R * 1.3, -R * 0.25, R * 0.24)
            .circle(s * R * 1.25, R * 0.08, R * 0.22)
            .fill(0xffffff)
            .stroke({ width: 3, color: 0xcfe3f5 });
        }
      }
      break;
    case 'crayon-tail':
      g.roundRect(R * 0.6, R * 0.15, R * 0.9, R * 0.26, 8)
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      g.poly([R * 1.5, R * 0.15, R * 1.75, R * 0.28, R * 1.5, R * 0.41])
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      break;
    case 'comet-backpack':
      for (let i = 0; i < 4; i++)
        g.circle(-R * 1.0 - i * 22, R * 0.2 + i * 12, 16 - i * 3).fill({
          color: C.gold,
          alpha: 0.8 - i * 0.15,
        });
      g.roundRect(-R * 1.05, -R * 0.35, R * 0.45, R * 0.6, 12)
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      break;
    case 'spring-legs':
      for (const s of [-1, 1]) {
        g.moveTo(s * R * 0.4, R * 0.7);
        for (let i = 1; i <= 6; i++) g.lineTo(s * R * 0.4 + (i % 2 ? 14 : -14), R * 0.7 + i * 9);
        g.stroke({ width: 6, color: b, cap: 'round', join: 'round' });
        g.ellipse(s * R * 0.4, R * 0.7 + 58, 20, 9).fill(b);
      }
      break;
    case 'weed-hands':
      for (const s of [-1, 1]) {
        g.moveTo(s * R * 0.8, R * 0.2)
          .bezierCurveTo(s * R * 1.2, 0, s * R * 1.2, -R * 0.3, s * R * 1.45, -R * 0.35)
          .stroke({ width: 10, color: b, cap: 'round' });
        for (let f = 0; f < 5; f++)
          g.moveTo(s * R * 1.45, -R * 0.35)
            .lineTo(
              s * R * 1.45 + s * Math.cos(-0.9 + f * 0.45) * 26,
              -R * 0.35 + Math.sin(-0.9 + f * 0.45) * 26,
            )
            .stroke({ width: 5, color: b, cap: 'round' });
      }
      break;
    case 'tadpole-lilypad':
      g.moveTo(0, R * 0.9)
        .bezierCurveTo(R * 0.4, R * 1.4, -R * 0.3, R * 1.5, R * 0.2, R * 1.8)
        .stroke({ width: 14, color: a, cap: 'round' });
      break;
  }
}

/** Parts drawn IN FRONT of the body (above the face zone where possible). */
function signatureFront(g: Graphics, sig: string, a: number, b: number) {
  switch (sig) {
    case 'sprouts':
      for (const s of [-1, 1]) {
        g.moveTo(0, -R * 0.75)
          .quadraticCurveTo(s * R * 0.1, -R * 1.0, s * R * 0.08, -R * 1.05)
          .stroke({ width: 5, color: b });
        g.ellipse(s * R * 0.3, -R * 1.1, R * 0.28, R * 0.14)
          .fill(b)
          .stroke({ width: 3, color: C.ink, alpha: 0.7 });
      }
      break;
    case 'heart-antenna':
      for (const s of [-1, 1]) {
        g.moveTo(s * R * 0.25, -R * 0.75)
          .lineTo(s * R * 0.5, -R * 1.25)
          .stroke({ width: 5, color: C.ink });
        g.moveTo(s * R * 0.5, -R * 1.15)
          .bezierCurveTo(s * R * 0.5 - 22, -R * 1.4, s * R * 0.5 - 4, -R * 1.5, s * R * 0.5, -R * 1.35)
          .bezierCurveTo(s * R * 0.5 + 4, -R * 1.5, s * R * 0.5 + 22, -R * 1.4, s * R * 0.5, -R * 1.15)
          .fill(b);
      }
      break;
    case 'number-lights':
      for (let i = 1; i <= 4; i++) g.circle(-R * 0.55 * i + R * 0.1, R * 0.15, 8).fill(C.gold);
      g.moveTo(-R * 0.2, -R * 0.75)
        .lineTo(-R * 0.35, -R * 1.05)
        .stroke({ width: 5, color: C.ink });
      g.moveTo(R * 0.2, -R * 0.75)
        .lineTo(R * 0.35, -R * 1.05)
        .stroke({ width: 5, color: C.ink });
      g.circle(-R * 0.35, -R * 1.05, 10)
        .fill(C.gold)
        .circle(R * 0.35, -R * 1.05, 10)
        .fill(C.gold);
      break;
    case 'cake-hat':
      g.roundRect(-R * 0.4, -R * 1.25, R * 0.8, R * 0.3, 8)
        .fill(0xffffff)
        .stroke({ width: 4, color: C.ink });
      g.roundRect(-R * 0.28, -R * 1.5, R * 0.56, R * 0.27, 8)
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      g.rect(-4, -R * 1.72, 8, R * 0.22).fill(C.sky);
      g.ellipse(0, -R * 1.78, 7, 11).fill(0xffa94d);
      break;
    case 'tadpole-lilypad':
      g.ellipse(0, -R * 0.95, R * 0.75, R * 0.2)
        .fill(b)
        .stroke({ width: 4, color: C.ink, alpha: 0.8 });
      g.moveTo(0, -R * 0.95)
        .lineTo(R * 0.4, -R * 1.02)
        .stroke({ width: 3, color: C.ink, alpha: 0.5 });
      break;
    case 'family-drops':
      break;
    case 'pebble-nose':
      g.ellipse(0, R * 0.2, R * 0.28, R * 0.2)
        .fill(0xa8a8c8)
        .stroke({ width: 4, color: C.ink });
      break;
    case 'lotus-shawl':
      g.circle(-R * 0.3, -R * 0.12, R * 0.2)
        .circle(R * 0.3, -R * 0.12, R * 0.2)
        .stroke({ width: 4, color: C.ink, alpha: 0.6 });
      break;
    case 'root-whiskers':
      for (const s of [-1, 1])
        for (let i = 0; i < 2; i++)
          g.moveTo(s * R * 0.35, R * 0.2 + i * 10)
            .lineTo(s * R * 0.75, R * 0.12 + i * 20)
            .stroke({ width: 3, color: C.ink, alpha: 0.6 });
      for (let i = -1; i <= 1; i++)
        g.ellipse(i * R * 0.22, -R * 1.0, R * 0.12, R * 0.32)
          .fill(b)
          .stroke({ width: 3, color: C.ink, alpha: 0.6 });
      break;
    case 'acorn-hat':
      g.moveTo(-R * 0.8, -R * 0.55)
        .quadraticCurveTo(0, -R * 1.35, R * 0.8, -R * 0.55)
        .closePath()
        .fill(b)
        .stroke({ width: 5, color: C.ink });
      g.rect(-5, -R * 1.15, 10, R * 0.22).fill(b);
      break;
    case 'leaf-bag':
      g.moveTo(R * 0.55, R * 0.1)
        .lineTo(R * 0.2, -R * 0.6)
        .stroke({ width: 4, color: C.ink });
      g.ellipse(R * 0.7, R * 0.35, R * 0.3, R * 0.22)
        .fill(b)
        .stroke({ width: 4, color: C.ink });
      break;
    case 'mood-halo':
      g.ellipse(0, -R * 1.2, R * 0.55, R * 0.14).stroke({ width: 9, color: b });
      break;
    case 'belly-clock':
      g.circle(0, R * 0.42, R * 0.24)
        .fill(0xffffff)
        .stroke({ width: 4, color: C.ink });
      g.moveTo(0, R * 0.42)
        .lineTo(0, R * 0.28)
        .moveTo(0, R * 0.42)
        .lineTo(R * 0.1, R * 0.46)
        .stroke({ width: 3, color: C.ink });
      break;
    case 'box-hat':
      g.roundRect(-R * 0.45, -R * 1.35, R * 0.9, R * 0.6, 6)
        .fill(0xc68b59)
        .stroke({ width: 4, color: 0x6b4226 });
      g.moveTo(-R * 0.45, -R * 1.15)
        .lineTo(R * 0.45, -R * 1.15)
        .stroke({ width: 3, color: 0x6b4226, alpha: 0.6 });
      break;
    case 'star-pajamas':
      for (const [x, y] of [
        [-R * 0.5, R * 0.3],
        [R * 0.45, R * 0.4],
        [0, R * 0.55],
      ] as const)
        g.star(x, y, 5, 12, 5).fill(b);
      g.moveTo(-R * 0.6, -R * 0.6)
        .quadraticCurveTo(R * 0.2, -R * 1.2, R * 0.9, -R * 0.9)
        .lineTo(R * 0.55, -R * 0.55)
        .closePath()
        .fill(a)
        .stroke({ width: 4, color: C.ink });
      g.circle(R * 0.95, -R * 0.9, 12).fill(0xffffff);
      break;
    case 'crescent-crown':
      g.circle(0, -R * 1.2, R * 0.32).fill(b);
      g.circle(R * 0.13, -R * 1.28, R * 0.28).fill(0x23305e);
      break;
  }
}

export class FriendSprite extends Container {
  private body = new Container();
  private eyes = new Graphics();
  private mouth = new Graphics();
  private t = Math.random() * 1000;
  private nextBlink = 2000 + Math.random() * 2000;
  private talkUntil = 0;
  private hopT = -1;
  private eyesClosed = false;
  private mouthOpen = false;
  readonly friend: Friend;

  constructor(friend: Friend, size = 200) {
    super();
    this.friend = friend;
    const [a, b, c] = friend.colors.map(hex) as [number, number, number];
    const back = new Graphics();
    signatureBack(back, friend.signature, a, b);
    const g = new Graphics();
    bodyShape(g, friend.base, a);
    // belly highlight
    g.ellipse(0, R * 0.35, R * 0.45, R * 0.3).fill({ color: c, alpha: 0.55 });
    const extra = new Graphics();
    if (friend.base === 'drops') {
      drop(extra, -R * 0.95, R * 0.4, R * 0.35, b);
      drop(extra, R * 0.95, R * 0.55, R * 0.25, c);
    }
    const front = new Graphics();
    signatureFront(front, friend.signature, a, b);
    // cheeks
    const cheeks = new Graphics();
    cheeks.ellipse(-R * 0.48, R * 0.12, R * 0.14, R * 0.08).fill({ color: C.pink, alpha: 0.7 });
    cheeks.ellipse(R * 0.48, R * 0.12, R * 0.14, R * 0.08).fill({ color: C.pink, alpha: 0.7 });
    this.drawEyes();
    this.drawMouth(false);
    this.body.addChild(back, g, extra, cheeks, this.eyes, this.mouth, front);
    this.addChild(this.body);
    this.scale.set(size / (R * 2.2));
  }

  private drawEyes(closed = false) {
    const e = this.eyes;
    e.clear();
    for (const s of [-1, 1]) {
      const x = s * R * 0.3;
      if (closed) {
        e.moveTo(x - 14, -R * 0.12)
          .quadraticCurveTo(x, -R * 0.04, x + 14, -R * 0.12)
          .stroke({ width: 6, color: C.ink, cap: 'round' });
      } else {
        e.ellipse(x, -R * 0.12, R * 0.13, R * 0.19).fill(C.ink);
        e.circle(x + 6, -R * 0.2, 7).fill(0xffffff);
        e.circle(x - 5, -R * 0.06, 3.5).fill(0xffffff);
      }
    }
  }

  private drawMouth(open: boolean) {
    const m = this.mouth;
    m.clear();
    if (open) m.ellipse(0, R * 0.2, 13, 11).fill(0x8b2e4a);
    else
      m.moveTo(-14, R * 0.15)
        .quadraticCurveTo(0, R * 0.28, 14, R * 0.15)
        .stroke({ width: 6, color: C.ink, cap: 'round' });
  }

  /** Mouth + wobble for the duration of a line. */
  talk(ms: number) {
    this.talkUntil = this.t + ms;
  }

  hop() {
    this.hopT = 0;
  }

  update(dt: number) {
    this.t += dt;
    const bob = Math.sin(this.t / 380) * 4;
    let hopY = 0;
    let squash = 1;
    if (this.hopT >= 0) {
      this.hopT += dt;
      const k = this.hopT / 520;
      if (k >= 1) this.hopT = -1;
      else {
        hopY = -Math.sin(k * Math.PI) * 60;
        squash = k < 0.15 ? 1 - k * 0.8 : k > 0.85 ? 1 - (1 - k) * 0.8 : 1.05;
      }
    }
    this.body.y = bob + hopY;
    this.body.scale.set(1 / Math.sqrt(squash), squash);
    this.nextBlink -= dt;
    let closed = false;
    if (this.nextBlink < 0) {
      closed = true;
      if (this.nextBlink < -130) {
        closed = false;
        this.nextBlink = 2500 + Math.random() * 2500;
      }
    }
    if (closed !== this.eyesClosed) {
      this.eyesClosed = closed;
      this.drawEyes(closed);
    }
    const talking = this.t < this.talkUntil;
    const open = talking && Math.floor(this.t / 140) % 2 === 0;
    if (open !== this.mouthOpen) {
      this.mouthOpen = open;
      this.drawMouth(open);
    }
    this.body.rotation = talking ? Math.sin(this.t / 90) * 0.04 : 0;
  }
}
