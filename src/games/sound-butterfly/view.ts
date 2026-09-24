/** 소리 나비 view (phonics). */
import { Container, Graphics, Text } from 'pixi.js';
import { getLetter, pictureOf } from '../../core/content';
import { pickLetters } from '../../core/rounds';
import type { StationPlan } from '../../core/types';
import { soundIds, vid } from '../../core/voice-ids';
import { C, FONT_LETTER } from '../../art/palette';
import { makePicture } from '../../art/pictures';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { wait } from '../../engine/tween';
import { Button, Card, speakerIcon } from '../../engine/ui';
import { store } from '../../state';
import { GameBase } from '../base';
import { arrange, bounce, dim, helpingHand, hintRing, popIn, shake } from '../common';
import { correctOption, makeButterflyRound, type ButterflyQuestion } from './logic';

const WING = [C.pink, C.sky, C.gold, C.mint];

class Butterfly extends Container {
  private t = Math.random() * 5000;
  private wings = new Graphics();
  baseX = 0;
  baseY = 0;
  constructor(
    public letter: string,
    color: number,
    private speed: number,
  ) {
    super();
    this.wings
      .ellipse(-62, -30, 60, 48)
      .ellipse(62, -30, 60, 48)
      .fill(color)
      .stroke({ width: 5, color: 0xffffff });
    this.wings
      .ellipse(-46, 38, 40, 32)
      .ellipse(46, 38, 40, 32)
      .fill(color)
      .stroke({ width: 5, color: 0xffffff });
    const body = new Graphics();
    body.roundRect(-9, -50, 18, 100, 9).fill(C.ink);
    body.moveTo(-4, -50).lineTo(-18, -78).moveTo(4, -50).lineTo(18, -78).stroke({ width: 4, color: C.ink });
    const badge = new Graphics();
    badge.roundRect(-62, -48, 124, 84, 30).fill(0xffffff).stroke({ width: 5, color: C.ink, alpha: 0.8 });
    badge.y = -8;
    const t = new Text({
      text: `${letter.toUpperCase()}${letter}`,
      style: { fontFamily: FONT_LETTER, fontSize: 60, fontWeight: '800', fill: C.ink },
    });
    t.anchor.set(0.5);
    t.y = -10;
    this.addChild(this.wings, body, badge, t);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x: number, y: number) => x * x + y * y < 110 * 110 };
  }
  update(dt: number) {
    this.t += dt * this.speed;
    const k = this.t / 1000;
    this.x = this.baseX + Math.sin(k * 0.9) * 40;
    this.y = this.baseY + Math.sin(k * 1.8) * 22;
    this.wings.scale.x = 0.75 + Math.abs(Math.sin(k * 6)) * 0.25;
  }
}

export class ButterflyView extends GameBase<'sound-butterfly'> {
  private qs: ButterflyQuestion[] = [];
  private qi = 0;
  private flies: Butterfly[] = [];
  private cards: Card[] = [];
  private prompt = new Container();
  private speaker: Button;

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'sound-butterfly', plan, index);
    this.speaker = new Button({
      icon: speakerIcon(80),
      size: 140,
      color: C.gold,
      onTap: () => void this.sayPrompt(),
      a11y: '소리 다시 듣기',
    });
    this.layer.addChild(this.prompt, this.speaker);
  }

  async start() {
    const letters = this.mode <= 2 ? pickLetters(store.save, this.day, 6, this.rng) : [];
    this.qs = makeButterflyRound(this.mode, letters, this.day, this.params, this.rng);
    this.setTotal(this.qs.length);
    const q0 = this.qs[0]!;
    const key =
      this.mode === 2 && q0.kind === 'sound-match' && q0.position === 'final'
        ? 'butterfly.2final'
        : `butterfly.${Math.min(this.mode, 4)}`;
    await this.instruct([vid.ko(key)]);
    await this.show();
  }

  private get q() {
    return this.qs[this.qi]!;
  }

  /** Letter sound prompt: native phoneme recording if present, then the keyword. */
  private phonemeIds(l: string): string[] {
    return soundIds(l, getLetter(l).keyword, (id) => voice.recorded(id));
  }

  private async sayPrompt() {
    const q = this.q;
    voice.cancel();
    if (q.kind === 'letter') {
      await voice.say(vid.pic(getLetter(q.letter).keyword));
    } else if (q.kind === 'sound-match') {
      for (const id of this.phonemeIds(q.letter)) await voice.say(id);
    } else if (q.kind === 'blend') {
      await this.blend(q.word);
    } else {
      await voice.say(vid.pic(q.word));
    }
  }

  private clear() {
    this.flies.forEach((f) => f.destroy({ children: true }));
    this.cards.forEach((c) => c.destroy({ children: true }));
    this.prompt.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.flies = [];
    this.cards = [];
  }

  private async show() {
    this.clear();
    this.frozen = false;
    const q = this.q;
    if (q.kind === 'letter') {
      // keyword picture in the bubble; catch the butterfly of its first letter
      const pc = new Card(200, 200);
      pc.addChild(makePicture(pictureOf(getLetter(q.letter).keyword), 180));
      this.prompt.addChild(pc);
      q.options.forEach((l, i) => {
        const b = new Butterfly(l, WING[i % WING.length]!, this.params.speed);
        b.on('pointertap', () => void this.answer(l, b));
        this.flies.push(b);
        this.layer.addChild(b);
        void popIn(b, i * 100);
      });
    } else if (q.kind === 'sound-match') {
      const b = new Butterfly(q.letter, C.pink, 0.3);
      b.on('pointertap', () => void this.sayPrompt());
      this.flies.push(b);
      this.prompt.addChild(b);
      q.options.forEach((id, i) => this.addCard(id, i, () => makePicture(pictureOf(id), 190)));
    } else if (q.kind === 'blend') {
      [...q.word].forEach((ch, i) => {
        const b = new Butterfly(ch, WING[i % WING.length]!, 0.2);
        b.scale.set(0.7);
        b.baseX = (i - 1) * 190;
        b.on(
          'pointertap',
          () => void voice.sayNow(voice.recorded(vid.phoneme(ch)) ? vid.phoneme(ch) : vid.letter(ch)),
        );
        this.flies.push(b);
        this.prompt.addChild(b);
      });
      q.options.forEach((w, i) => this.addCard(w, i, () => makePicture(pictureOf(w), 190)));
    } else {
      q.options.forEach((w, i) =>
        this.addCard(w, i, () => {
          const t = new Text({
            text: w,
            style: { fontFamily: FONT_LETTER, fontSize: 84, fontWeight: '800', fill: C.ink },
          });
          t.anchor.set(0.5);
          return t;
        }),
      );
    }
    this.layoutGame(this.game.W, this.game.H);
    await wait(300);
    if (q.kind === 'sound-match') {
      // name every picture once so the child can hear their first sounds
      const epoch = voice.epoch;
      for (const [i, id] of q.options.entries()) {
        if (voice.epoch !== epoch || !this.alive) return; // answered/left meanwhile: stop naming
        void bounce(this.cards[i]!);
        await voice.say(vid.pic(id));
        await wait(200);
      }
    }
    if (q.kind === 'blend') return this.blend(q.word);
    await this.sayPrompt();
  }

  /**
   * Sound blending: with native phoneme recordings each butterfly says its sound (c… a… t…);
   * without them the whole word is said slowly while the butterflies light up left to right.
   */
  private async blend(word: string) {
    const letters = [...word];
    if (letters.every((ch) => voice.recorded(vid.phoneme(ch)))) {
      for (const [i, ch] of letters.entries()) {
        void bounce(this.flies[i]!);
        await voice.say(vid.phoneme(ch));
        await wait(250);
      }
      return;
    }
    const said = voice.say(vid.pic(word), { rate: 0.5 });
    for (const [i] of letters.entries()) {
      if (this.flies[i]) void bounce(this.flies[i]!);
      await wait(260);
    }
    await said;
  }

  private addCard(id: string, i: number, content: () => Container) {
    const c = new Card(220, 220);
    c.addChild(content());
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => void this.answer(id, c));
    this.cards.push(c);
    this.layer.addChild(c);
    void popIn(c, i * 90);
  }

  protected layoutGame(w: number, h: number) {
    const portrait = h > w;
    const q = this.qs[this.qi];
    this.prompt.position.set(w / 2, portrait ? h * 0.26 : h * 0.3);
    this.speaker.position.set(w - 100, h - 100);
    if (q?.kind === 'letter') {
      const pos = arrange(this.flies.length, w / 2, portrait ? h * 0.64 : h * 0.68, w - 120, h * 0.45, 260);
      this.flies.forEach((f, i) => {
        f.baseX = pos[i]!.x;
        f.baseY = pos[i]!.y;
        f.scale.set(pos[i]!.scale * 0.9);
      });
    }
    const pos = arrange(this.cards.length, w / 2, portrait ? h * 0.66 : h * 0.72, w - 60, h * 0.4, 220);
    this.cards.forEach((c, i) => {
      c.position.set(pos[i]!.x, pos[i]!.y);
      c.scale.set(pos[i]!.scale);
    });
  }

  private async answer(choice: string, node: Container) {
    if (this.busy) return;
    this.busy = true;
    const q = this.q;
    const ok = choice === correctOption(q);
    const letter = q.kind === 'letter' || q.kind === 'sound-match' ? q.letter : undefined;
    const assist = this.record(ok, { letter });
    const gp = node.getGlobalPosition();
    if (ok) {
      void bounce(node);
      const content =
        q.kind === 'letter'
          ? [vid.letter(q.letter), ...this.phonemeIds(q.letter)]
          : q.kind === 'sound-match'
            ? [vid.pic(q.answer)]
            : [vid.pic(q.word)];
      if (q.kind === 'read') {
        const pic = makePicture(pictureOf(q.word), 160);
        pic.position.set(0, -170);
        node.addChild(pic);
        void popIn(pic);
      }
      await this.celebrate(gp.x / this.game.scale, gp.y / this.game.scale, content);
      this.qi++;
      if (await this.next()) await this.show();
    } else {
      void shake(node);
      dim(node);
      await this.gentleNo(assist);
      const correct = correctOption(q);
      const target =
        q.kind === 'letter'
          ? this.flies.find((f) => f.letter === correct)
          : this.cards[q.options.indexOf(correct)];
      if (target && assist !== 'none') {
        this.frozen = true; // butterflies hold still while we point at the answer
        hintRing(target, 120);
        await this.sayPrompt();
      }
      if (target && assist === 'together') {
        const h = await helpingHand(this.layer, { x: this.game.W / 2, y: this.game.H }, target.position);
        setTimeout(() => h.destroy(), 900);
      }
    }
    this.busy = false;
  }

  private frozen = false;
  protected override tick(dt: number) {
    if (this.frozen) return;
    for (const f of this.flies) if (!f.destroyed) f.update(dt);
  }
}
