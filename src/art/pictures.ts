/** Renders a word picture from its spec: an emoji, or `draw:<kind>:<arg>` code drawings. */
import { Container, Graphics, Text } from 'pixi.js';
import { C, FONT_EMOJI, FONT_EN, hex } from './palette';

export function emojiText(e: string, size: number): Text {
  const t = new Text({ text: e, style: { fontFamily: FONT_EMOJI, fontSize: size, align: 'center' } });
  t.anchor.set(0.5);
  return t;
}

function graphemes(s: string): string[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (l: string, o: object) => { segment(s: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Seg) return [...new Seg('en', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment);
  return Array.from(s);
}

function blob(g: Graphics, r: number, color: number) {
  // paint splash: circle with 6 soft bumps
  g.circle(0, 0, r * 0.78).fill(color);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.circle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.3).fill(color);
  }
  if (color === 0xffffff) {
    g.circle(0, 0, r * 0.78).stroke({ width: 4, color: 0xc9c9d6 });
  }
  g.ellipse(-r * 0.28, -r * 0.3, r * 0.18, r * 0.11).fill({ color: 0xffffff, alpha: 0.55 });
}

function heartPath(g: Graphics, r: number) {
  g.moveTo(0, r * 0.75)
    .bezierCurveTo(-r * 1.2, -r * 0.1, -r * 0.6, -r * 0.95, 0, -r * 0.35)
    .bezierCurveTo(r * 0.6, -r * 0.95, r * 1.2, -r * 0.1, 0, r * 0.75)
    .closePath();
}

export function drawShape(g: Graphics, shape: string, r: number, color: number, stroke = true) {
  switch (shape) {
    case 'circle':
      g.circle(0, 0, r);
      break;
    case 'square':
      g.roundRect(-r * 0.88, -r * 0.88, r * 1.76, r * 1.76, r * 0.18);
      break;
    case 'triangle':
      g.poly([0, -r, r * 1.02, r * 0.78, -r * 1.02, r * 0.78]);
      break;
    case 'heart':
      heartPath(g, r * 1.05);
      break;
    case 'star':
      g.star(0, 0, 5, r * 1.05, r * 0.48, 0);
      break;
    default:
      g.circle(0, 0, r);
  }
  g.fill(color);
  if (stroke) g.stroke({ width: Math.max(3, r * 0.08), color: C.ink, join: 'round', alpha: 0.85 });
}

function drawNumber(c: Container, n: number, size: number) {
  const t = new Text({
    text: String(n),
    style: { fontFamily: FONT_EN, fontSize: size * 0.5, fontWeight: '800', fill: C.ink },
  });
  t.anchor.set(0.5);
  t.y = -size * 0.14;
  c.addChild(t);
  const g = new Graphics();
  const per = n > 5 ? 5 : n;
  const rows = Math.ceil(n / 5);
  const r = size * 0.045;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const cnt = row === rows - 1 ? n - row * 5 : per;
    g.circle((col - (cnt - 1) / 2) * r * 2.6, size * 0.2 + row * r * 2.6, r)
      .fill(C.gold)
      .stroke({ width: 2, color: 0xc99a2e });
  }
  c.addChild(g);
}

function drawPrep(c: Container, prep: string, size: number) {
  const g = new Graphics();
  const bw = size * 0.46;
  const bh = size * 0.3;
  const cat = emojiText('🐱', size * 0.3);
  if (prep === 'under') {
    // box lifted on legs, cat beneath
    g.rect(-bw / 2 + 6, -bh * 0.2, 8, bh * 1.2).fill(0x8d5524);
    g.rect(bw / 2 - 14, -bh * 0.2, 8, bh * 1.2).fill(0x8d5524);
    g.roundRect(-bw / 2, -bh * 1.1, bw, bh * 0.9, 8)
      .fill(0xc68b59)
      .stroke({ width: 3, color: 0x6b4226 });
    cat.y = bh * 0.55;
    c.addChild(g, cat);
    return;
  }
  const box = new Graphics();
  box
    .roundRect(-bw / 2, 0, bw, bh, 8)
    .fill(0xc68b59)
    .stroke({ width: 3, color: 0x6b4226 });
  box
    .moveTo(-bw / 2, bh * 0.35)
    .lineTo(bw / 2, bh * 0.35)
    .stroke({ width: 3, color: 0x6b4226, alpha: 0.5 });
  if (prep === 'on') {
    box.y = size * 0.02;
    cat.y = -size * 0.13;
    c.addChild(box, cat);
  } else {
    cat.y = size * 0.02;
    box.y = size * 0.02;
    c.addChild(cat, box);
  }
}

function drawTable(c: Container, size: number) {
  const g = new Graphics();
  const w = size * 0.62;
  g.roundRect(-w / 2, -size * 0.12, w, size * 0.08, 6)
    .fill(0xc68b59)
    .stroke({ width: 3, color: 0x6b4226 });
  for (const x of [-w / 2 + 10, w / 2 - 22]) g.rect(x, -size * 0.05, 12, size * 0.3).fill(0x8d5524);
  c.addChild(g);
}

function drawPool(c: Container, size: number) {
  const g = new Graphics();
  const w = size * 0.7;
  const h = size * 0.46;
  g.roundRect(-w / 2, -h / 2, w, h, 18)
    .fill(0x7cc6fe)
    .stroke({ width: 5, color: 0xffffff });
  for (let i = 0; i < 3; i++) {
    const y = -h / 4 + i * (h / 4);
    g.moveTo(-w / 2 + 14, y);
    for (let x = -w / 2 + 14; x < w / 2 - 14; x += 18) g.quadraticCurveTo(x + 9, y - 6, x + 18, y);
    g.stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
  }
  // ladder
  g.rect(w / 2 - 34, -h / 2 - 16, 5, 40).fill(0xb0b0c0);
  g.rect(w / 2 - 18, -h / 2 - 16, 5, 40).fill(0xb0b0c0);
  c.addChild(g);
}

function drawSky(c: Container, size: number) {
  const g = new Graphics();
  const w = size * 0.72;
  const h = size * 0.56;
  g.roundRect(-w / 2, -h / 2, w, h, 22).fill(0x8fd3ff);
  g.roundRect(-w / 2, 0, w, h / 2, 22).fill({ color: 0xbfe6ff, alpha: 0.7 });
  for (const [x, y] of [
    [-w * 0.18, -h * 0.12],
    [w * 0.1, -h * 0.22],
  ] as const) {
    g.moveTo(x - 12, y)
      .quadraticCurveTo(x - 6, y - 8, x, y)
      .quadraticCurveTo(x + 6, y - 8, x + 12, y);
    g.stroke({ width: 3, color: C.ink, cap: 'round' });
  }
  g.circle(w * 0.14, h * 0.14, 16).fill(0xffffff);
  g.circle(w * 0.24, h * 0.1, 20).fill(0xffffff);
  g.circle(w * 0.33, h * 0.16, 14).fill(0xffffff);
  c.addChild(g);
}

function drawSize(c: Container, which: string, size: number) {
  const g = new Graphics();
  const big = size * 0.28;
  const small = size * 0.09;
  if (which === 'big') {
    g.circle(-size * 0.06, 0, big)
      .fill(0xff8fab)
      .stroke({ width: 4, color: C.ink, alpha: 0.8 });
    g.circle(size * 0.3, big - small, small).fill({ color: 0xff8fab, alpha: 0.35 });
  } else {
    g.circle(-size * 0.12, 0, big).stroke({ width: 3, color: 0xffffff, alpha: 0.35 });
    g.circle(size * 0.26, big - small, small)
      .fill(0xff8fab)
      .stroke({ width: 3, color: C.ink, alpha: 0.8 });
  }
  c.addChild(g);
}

/** Creates a picture roughly `size` units wide, centred on (0,0). */
export function makePicture(spec: string, size: number): Container {
  const c = new Container();
  if (!spec.startsWith('draw:')) {
    c.addChild(emojiText(spec, size * 0.72));
    return c;
  }
  const [, kind, arg = ''] = spec.split(':');
  const rest = spec.slice(`draw:${kind}:`.length);
  switch (kind) {
    case 'color': {
      const g = new Graphics();
      blob(g, size * 0.36, hex(arg));
      c.addChild(g);
      break;
    }
    case 'num':
      drawNumber(c, Number(arg), size);
      break;
    case 'shape': {
      const g = new Graphics();
      drawShape(g, arg, size * 0.32, C.sky);
      c.addChild(g);
      break;
    }
    case 'size':
      drawSize(c, arg, size);
      break;
    case 'mark': {
      const kid = emojiText('🧒', size * 0.62);
      const ring = new Graphics();
      ring.circle(0, -size * 0.1, size * 0.27).stroke({ width: 6, color: C.gold });
      c.addChild(kid, ring);
      break;
    }
    case 'act': {
      const kid = emojiText('🧒', size * 0.5);
      kid.y = -size * 0.1;
      const g = new Graphics();
      for (const x of [-18, 0, 18])
        g.moveTo(x, size * 0.2)
          .lineTo(x, size * 0.3)
          .stroke({ width: 4, color: C.gold, cap: 'round' });
      c.addChild(g, kid);
      break;
    }
    case 'combo': {
      const parts = graphemes(rest);
      const s = (size * 0.9) / Math.max(parts.length, 1.6);
      parts.forEach((p, i) => {
        const t = emojiText(p, s);
        t.x = (i - (parts.length - 1) / 2) * s * 0.95;
        c.addChild(t);
      });
      break;
    }
    case 'prep':
      drawPrep(c, arg, size);
      break;
    case 'thing':
      drawTable(c, size);
      break;
    case 'place':
      if (arg === 'pool') drawPool(c, size);
      else drawSky(c, size);
      break;
    default:
      c.addChild(emojiText('❓', size * 0.6));
  }
  return c;
}
