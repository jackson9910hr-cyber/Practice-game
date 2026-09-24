/** Twinkle (반짝이): the player's star fairy. Rounded five-point star with a soft glow. */
import { Container, Graphics } from 'pixi.js';
import { C } from './palette';

export class Fairy extends Container {
  private body = new Container();
  private face = new Graphics();
  private glow = new Graphics();
  private t = 0;
  private talkUntil = 0;
  private blinkIn = 2500;
  private faceState = 0;

  constructor(size = 160) {
    super();
    const r = 100;
    this.glow.star(0, 0, 5, r * 1.35, r * 0.72).fill({ color: C.gold, alpha: 0.18 });
    this.glow.star(0, 0, 5, r * 1.18, r * 0.62).fill({ color: C.gold, alpha: 0.22 });
    const g = new Graphics();
    g.star(0, 0, 5, r, r * 0.52)
      .fill(C.gold)
      .stroke({ width: 22, color: C.gold, join: 'round' });
    g.star(0, 0, 5, r, r * 0.52).stroke({ width: 6, color: 0xe0a93a, join: 'round', alpha: 0.9 });
    g.ellipse(-r * 0.28, -r * 0.35, r * 0.12, r * 0.07).fill({ color: 0xffffff, alpha: 0.7 });
    // signature: a small pink bow on the upper-right point (makes the silhouette its own)
    const bx = r * 0.62;
    const by = -r * 0.62;
    g.poly([bx, by, bx + 26, by - 16, bx + 26, by + 14])
      .fill(C.pink)
      .stroke({ width: 3, color: C.ink, alpha: 0.6 });
    g.poly([bx, by, bx - 22, by - 20, bx - 18, by + 12])
      .fill(C.pink)
      .stroke({ width: 3, color: C.ink, alpha: 0.6 });
    g.circle(bx, by, 8).fill(0xff6f91);
    this.body.addChild(this.glow, g, this.face);
    this.addChild(this.body);
    this.drawFace(false, false);
    this.scale.set(size / 240);
  }

  private drawFace(blink: boolean, open: boolean) {
    const f = this.face;
    f.clear();
    for (const s of [-1, 1]) {
      if (blink)
        f.moveTo(s * 26 - 10, 0)
          .quadraticCurveTo(s * 26, 7, s * 26 + 10, 0)
          .stroke({ width: 5, color: C.ink, cap: 'round' });
      else {
        f.ellipse(s * 26, 0, 9, 13).fill(C.ink);
        f.circle(s * 26 + 3, -5, 4).fill(0xffffff);
      }
      f.ellipse(s * 44, 22, 11, 6).fill({ color: C.pink, alpha: 0.8 });
    }
    if (open) f.ellipse(0, 26, 10, 8).fill(0x8b2e4a);
    else f.moveTo(-11, 22).quadraticCurveTo(0, 32, 11, 22).stroke({ width: 5, color: C.ink, cap: 'round' });
  }

  talk(ms: number) {
    this.talkUntil = this.t + ms;
  }

  update(dt: number) {
    this.t += dt;
    this.body.y = Math.sin(this.t / 500) * 10;
    this.body.rotation = Math.sin(this.t / 900) * 0.06;
    this.glow.alpha = 0.75 + Math.sin(this.t / 300) * 0.25;
    this.blinkIn -= dt;
    const talking = this.t < this.talkUntil;
    const open = talking && Math.floor(this.t / 150) % 2 === 0;
    let blink = false;
    if (this.blinkIn < 0) {
      blink = true;
      if (this.blinkIn < -120) this.blinkIn = 2600 + Math.random() * 2000;
    }
    const state = (blink ? 1 : 0) + (open ? 2 : 0);
    if (state !== this.faceState) {
      this.faceState = state;
      this.drawFace(blink, open);
    }
  }
}
