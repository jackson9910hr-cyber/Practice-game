/** 숫자 반딧불 view: tap-to-count fireflies (English numbers) and gentle +/−. */
import { Container, Graphics, Text } from 'pixi.js';
import type { StationPlan } from '../../core/types';
import { NUMBER_WORDS, vid } from '../../core/voice-ids';
import { C, FONT_EN } from '../../art/palette';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { ease, tween, wait } from '../../engine/tween';
import { Card } from '../../engine/ui';
import { GameBase } from '../base';
import { arrange, bounce, dim, hintRing, popIn, shake } from '../common';
import { answerOf, makeFireflyRound, type FireflyQuestion } from './logic';

class Firefly extends Container {
  private glow = new Graphics();
  lit = false;
  private t = Math.random() * 3000;
  hx = 0;
  hy = 0;
  constructor(color: number = C.gold) {
    super();
    this.glow.circle(0, 0, 44).fill({ color, alpha: 0.25 });
    const g = new Graphics();
    g.ellipse(-16, -14, 16, 10).ellipse(16, -14, 16, 10).fill({ color: 0xffffff, alpha: 0.7 });
    g.ellipse(0, 0, 14, 20).fill(0x3b2f2f);
    g.circle(0, 14, 14).fill(color);
    this.addChild(this.glow, g);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y < 64 * 64 };
  }
  light() {
    this.lit = true;
    this.glow.scale.set(1.6);
    this.glow.alpha = 1;
  }
  update(dt: number) {
    this.t += dt;
    this.x = this.hx + Math.sin(this.t / 700) * 6;
    this.y = this.hy + Math.cos(this.t / 900) * 6;
    if (!this.lit) this.glow.alpha = 0.5 + Math.sin(this.t / 300) * 0.3;
  }
}

export class FireflyView extends GameBase<'number-fireflies'> {
  private qs: FireflyQuestion[] = [];
  private qi = 0;
  private flies: Firefly[] = [];
  private cards: Card[] = [];
  private jar = new Graphics();
  private eq: Text;
  private counted = 0;

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'number-fireflies', plan, index);
    this.eq = new Text({
      text: '',
      style: { fontFamily: FONT_EN, fontSize: 80, fontWeight: '800', fill: C.cream },
    });
    this.eq.anchor.set(0.5);
    this.layer.addChild(this.jar, this.eq);
  }

  async start() {
    this.qs = makeFireflyRound(this.mode, this.params, this.rng);
    this.setTotal(this.qs.length);
    // the instruction matches what this mode actually asks (counting vs. adding/taking away)
    await this.instruct([vid.ko(this.mode >= 3 ? 'fireflies.add' : 'fireflies.count')]);
    await this.show();
  }

  private get q() {
    return this.qs[this.qi]!;
  }

  private clear() {
    this.flies.forEach((f) => f.destroy({ children: true }));
    this.cards.forEach((c) => c.destroy({ children: true }));
    this.flies = [];
    this.cards = [];
    this.counted = 0;
    this.eq.text = '';
  }

  /** Home positions: neat rows (ten-frame feel) at low scatter, looser later. */
  private homes(n: number, cx: number, cy: number, w: number, h: number) {
    const cols = Math.min(5, n);
    const rows = Math.ceil(n / cols);
    const cell = Math.min(130, w / cols, h / rows);
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const jx = (this.rng.next() - 0.5) * cell * 0.7 * this.params.scatter;
      const jy = (this.rng.next() - 0.5) * cell * 0.7 * this.params.scatter;
      out.push({ x: cx + (c - (cols - 1) / 2) * cell + jx, y: cy + (r - (rows - 1) / 2) * cell + jy });
    }
    return out;
  }

  private async show() {
    this.clear();
    const q = this.q;
    const { W, H } = this.game;
    const portrait = H > W;
    const cx = W / 2;
    const cy = portrait ? H * 0.4 : H * 0.42;
    const areaW = Math.min(W - 80, 700);
    const areaH = portrait ? H * 0.36 : H * 0.44;
    if (q.kind === 'count') {
      const hs = this.homes(q.n, cx, cy, areaW, areaH);
      hs.forEach((p, i) => this.addFly(p.x, p.y, C.gold, i, true));
      if (this.qi > 0 && this.qi % 2 === 0) void voice.say(vid.ko('fireflies.count'));
      return;
    }
    // add / sub
    const a = q.a;
    const hs = this.homes(q.kind === 'add' ? a + q.b : a, cx, cy, areaW, areaH);
    for (let i = 0; i < a; i++) this.addFly(hs[i]!.x, hs[i]!.y, C.gold, i, false);
    this.eq.text = `${a}`;
    await voice.say(vid.numKo(a));
    await wait(400);
    if (q.kind === 'add') {
      this.eq.text = `${a} + ${q.b}`;
      for (let i = 0; i < q.b; i++) {
        const f = this.addFly(W + 60, cy - 100, C.pink, a + i, false);
        f.hx = W + 60;
        await tween(f, { hx: hs[a + i]!.x, hy: hs[a + i]!.y }, { duration: 500, ease: ease.outQuad });
        sfx.count(i + 1);
      }
      void voice.say(vid.ko('fireflies.add'));
    } else {
      this.eq.text = `${a} − ${q.b}`;
      const leaving = this.flies.slice(a - q.b);
      for (const f of leaving) {
        sfx.whoosh();
        await tween(f, { hx: f.hx + W, hy: f.hy - 300, alpha: 0 }, { duration: 600, ease: ease.inQuad });
      }
      void voice.say(vid.ko('fireflies.sub'));
    }
    this.eq.text += ' = ?';
    this.showOptions();
  }

  private addFly(x: number, y: number, color: number, i: number, tappable: boolean) {
    const f = new Firefly(color);
    f.hx = x;
    f.hy = y;
    f.position.set(x, y);
    if (tappable) f.on('pointertap', () => this.countTap(f));
    this.flies.push(f);
    this.layer.addChild(f);
    void popIn(f, i * 40);
    return f;
  }

  private countTap(f: Firefly) {
    if (f.lit || this.busy) return;
    f.light();
    this.counted += 1;
    const n = this.counted;
    sfx.count(n);
    void bounce(f);
    const lbl = new Text({
      text: String(n),
      style: { fontFamily: FONT_EN, fontSize: 40, fontWeight: '800', fill: C.cream },
    });
    lbl.anchor.set(0.5);
    lbl.y = -56;
    f.addChild(lbl);
    // count in Korean (how children count objects); the English number comes with the answer
    void voice.sayNow(vid.numKo(n));
    if (this.counted === this.flies.length) {
      setTimeout(() => {
        void voice.say(vid.ko('fireflies.pick'));
        this.showOptions();
      }, 500);
    }
  }

  private showOptions() {
    const q = this.q;
    const { W, H } = this.game;
    const pos = arrange(q.options.length, W / 2, H > W ? H * 0.8 : H * 0.84, W - 60, 200, 180);
    q.options.forEach((n, i) => {
      const c = new Card(170, 170);
      const t = new Text({
        text: String(n),
        style: { fontFamily: FONT_EN, fontSize: 88, fontWeight: '800', fill: C.ink },
      });
      t.anchor.set(0.5);
      c.addChild(t);
      c.position.set(pos[i]!.x, pos[i]!.y);
      c.scale.set(pos[i]!.scale);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => void this.answer(n, c));
      this.cards.push(c);
      this.layer.addChild(c);
      void popIn(c, i * 80);
    });
  }

  private async answer(n: number, c: Card) {
    if (this.busy) return;
    this.busy = true;
    const ans = answerOf(this.q);
    const ok = n === ans;
    const words = ans >= 1 && ans <= 10 ? [NUMBER_WORDS[ans]!] : [];
    const assist = this.record(ok, { words });
    if (ok) {
      c.draw(0xfff1b8, C.gold);
      if (this.q.kind !== 'count') this.eq.text = this.eq.text.replace('?', String(ans));
      await this.celebrate(c.x, c.y, [vid.numKo(ans), vid.num(ans)]);
      this.qi++;
      if (await this.next()) await this.show();
    } else {
      void shake(c);
      dim(c);
      await this.gentleNo(assist);
      if (assist !== 'none') {
        // recount together: light fireflies one by one with English numbers
        const live = this.flies.filter((f) => f.alpha > 0.5);
        for (const [i, f] of live.entries()) {
          void bounce(f);
          await voice.say(vid.numKo(i + 1));
        }
        const right = this.cards[this.q.options.indexOf(ans)];
        if (right) hintRing(right, 100);
      }
    }
    this.busy = false;
  }

  protected layoutGame(w: number, h: number) {
    this.eq.position.set(w / 2, h > w ? h * 0.16 : 170);
    this.jar.clear();
    const jw = Math.min(w - 60, 760);
    const jh = h > w ? h * 0.42 : h * 0.5;
    const cy = h > w ? h * 0.4 : h * 0.42;
    this.jar
      .roundRect(w / 2 - jw / 2, cy - jh / 2, jw, jh, 60)
      .fill({ color: 0x0b1030, alpha: 0.35 })
      .stroke({ width: 6, color: 0xffffff, alpha: 0.25 });
  }

  protected override tick(dt: number) {
    for (const f of this.flies) if (!f.destroyed) f.update(dt);
  }
}
