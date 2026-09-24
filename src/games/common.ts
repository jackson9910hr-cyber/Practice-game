/** Layout + animation helpers shared by the game views. */
import { Container, Graphics } from 'pixi.js';
import { emojiText } from '../art/pictures';
import { ease, tween, wait } from '../engine/tween';

/** Positions for n items inside a box: one row if it fits (landscape), else a grid. */
export function arrange(
  n: number,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  item: number,
  gap = 36,
) {
  const perRowMax = Math.max(1, Math.floor((maxW + gap) / (item + gap)));
  const cols = n <= perRowMax ? n : Math.min(perRowMax, Math.ceil(n / Math.ceil(n / perRowMax)));
  const rows = Math.ceil(n / cols);
  const scale = Math.min(1, maxH / (rows * item + (rows - 1) * gap));
  const it = item * scale;
  const g = gap * scale;
  const out: { x: number; y: number; scale: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i % cols;
    out.push({ x: cx + (c - (inRow - 1) / 2) * (it + g), y: cy + (r - (rows - 1) / 2) * (it + g), scale });
  }
  return out;
}

export async function popIn(obj: Container, delay = 0) {
  obj.scale.set(0);
  await tween(obj.scale, { x: 1, y: 1 }, { duration: 420, delay, ease: ease.outBack });
}

export async function shake(obj: Container) {
  const x = obj.x;
  for (const dx of [-18, 16, -12, 8, 0]) await tween(obj, { x: x + dx }, { duration: 55 });
}

export async function bounce(obj: Container) {
  const s = obj.scale.x;
  await tween(obj.scale, { x: s * 1.18, y: s * 1.18 }, { duration: 140 });
  await tween(obj.scale, { x: s, y: s }, { duration: 320, ease: ease.outBack });
}

/** Pulsing gold ring used for the "look here" hint. */
export function hintRing(target: Container, radius: number): Container {
  const g = new Graphics();
  g.circle(0, 0, radius).stroke({ width: 10, color: 0xffd166, alpha: 0.95 });
  target.addChild(g);
  const loop = async () => {
    while (!g.destroyed) {
      await tween(g.scale, { x: 1.12, y: 1.12 }, { duration: 420 });
      if (g.destroyed) return;
      await tween(g.scale, { x: 1, y: 1 }, { duration: 420 });
    }
  };
  void loop();
  return g;
}

/** "Do it together": a helping hand glides to the target. */
export async function helpingHand(
  parent: Container,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const hand = emojiText('👆', 90);
  hand.position.set(from.x, from.y);
  parent.addChild(hand);
  await tween(hand, { x: to.x + 20, y: to.y + 50 }, { duration: 700, ease: ease.inOutSine });
  for (let i = 0; i < 2; i++) {
    await tween(hand, { y: to.y + 35 }, { duration: 160 });
    await tween(hand, { y: to.y + 55 }, { duration: 160 });
  }
  await wait(200);
  return hand;
}
