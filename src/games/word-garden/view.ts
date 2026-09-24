/** 단어 정원 view — see logic.ts for question generation. */
import { Container, Graphics } from 'pixi.js';
import { getWord } from '../../core/content';
import type { StationPlan } from '../../core/types';
import { vid } from '../../core/voice-ids';
import { C } from '../../art/palette';
import { makePicture } from '../../art/pictures';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { makeDraggable, within } from '../../engine/drag';
import { ease, tween, wait } from '../../engine/tween';
import { Button, Card, speakerIcon } from '../../engine/ui';
import { store } from '../../state';
import { GameBase } from '../base';
import { arrange, bounce, dim, helpingHand, hintRing, popIn, shake } from '../common';
import { isMoving, makeWordGardenRound, type ChoiceQuestion } from './logic';

const CARD = 230;

/** A friendly talking bee (striped body, wings, face) — tap to hear, drag to answer. */
function drawBee(color: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(-34, -52, 30, 22)
    .ellipse(34, -52, 30, 22)
    .fill({ color: 0xffffff, alpha: 0.85 })
    .stroke({ width: 4, color: C.ink, alpha: 0.5 });
  g.ellipse(0, 0, 66, 54).fill(color).stroke({ width: 6, color: C.ink });
  for (const x of [-22, 8, 36]) g.rect(x - 6, -50, 12, 100).fill({ color: C.ink, alpha: 0.75 });
  g.ellipse(0, 0, 66, 54).stroke({ width: 6, color: C.ink });
  g.circle(-40, -8, 7).fill(C.ink).circle(-18, -8, 7).fill(C.ink);
  g.moveTo(-40, 14).quadraticCurveTo(-30, 22, -20, 14).stroke({ width: 4, color: C.ink, cap: 'round' });
  const s = speakerIcon(44, C.ink);
  s.position.set(40, 44);
  c.addChild(g, s);
  return c;
}

/** A picture that moves (for action / feeling words in mode 4). */
class Moving extends Container {
  private t = Math.random() * 1000;
  constructor(
    private pic: Container,
    private kind: string,
  ) {
    super();
    this.addChild(pic);
  }
  update(dt: number) {
    this.t += dt;
    const k = this.t / 1000;
    if (this.kind === 'jump') this.pic.y = -Math.abs(Math.sin(k * 4)) * 30;
    else if (this.kind === 'run' || this.kind === 'walk' || this.kind === 'swim')
      this.pic.x = Math.sin(k * 3) * 22;
    else if (this.kind === 'fly') this.pic.y = Math.sin(k * 4) * 16;
    else if (this.kind === 'dance' || this.kind === 'happy') this.pic.rotation = Math.sin(k * 6) * 0.2;
    else if (this.kind === 'sleep' || this.kind === 'sleepy' || this.kind === 'tired')
      this.pic.scale.set(1 + Math.sin(k * 2) * 0.05);
    else this.pic.scale.set(1 + Math.sin(k * 5) * 0.06);
  }
}

export class WordGardenView extends GameBase<'word-garden'> {
  private choices: ChoiceQuestion[] = [];
  private qi = 0;
  private cards: Card[] = [];
  private movers: Moving[] = [];
  private speaker!: Button;
  private bigPic: Container | null = null;
  private memory: string[] | null = null;
  private memCards: {
    card: Card;
    id: string;
    face: 'pic' | 'sound';
    open: boolean;
    done: boolean;
    front: Container;
    back: Container;
  }[] = [];
  private flipped: number[] = [];
  private mismatches = 0;
  private missStreak = 0;

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'word-garden', plan, index);
  }

  async start() {
    const round = makeWordGardenRound(store.save, this.day, this.mode, this.params, this.rng, this.scope);
    if ('memory' in round) {
      this.memory = round.memory.pairs;
      this.setTotal(this.memory.length);
      await this.startMemory();
      return;
    }
    this.choices = round.questions;
    this.setTotal(this.choices.length);
    this.speaker = new Button({
      icon: speakerIcon(90),
      size: 150,
      color: C.gold,
      onTap: () => this.sayTarget(),
      a11y: '단어 다시 듣기',
    });
    this.layer.addChild(this.speaker);
    // mode 2: the bees themselves speak; a second speaker would just repeat the instruction
    this.speaker.visible = this.mode !== 2;
    this.layoutGame(this.game.W, this.game.H);
    await this.instruct([vid.ko(`wordGarden.${this.mode === 4 ? 4 : this.mode === 2 ? 2 : 1}`)]);
    await this.showQuestion();
  }

  private sayTarget() {
    const q = this.choices[this.qi];
    if (!q) return;
    if (this.mode === 2) void voice.sayNow(vid.ko('wordGarden.2'));
    else void voice.sayNow(vid.word(q.target));
  }

  protected layoutGame(w: number, h: number) {
    if (this.memory) return this.layoutMemory(w, h);
    const portrait = h > w;
    if (this.mode === 2) {
      this.speaker?.position.set(w - 100, h - 100);
      if (this.bigPic) this.bigPic.position.set(w / 2, portrait ? h * 0.33 : h * 0.36);
      const pos = arrange(
        this.cards.length,
        w / 2,
        portrait ? h * 0.72 : h * 0.78,
        w - 80,
        portrait ? h * 0.3 : h * 0.3,
        190,
      );
      this.cards.forEach((c, i) => {
        c.position.set(pos[i]!.x, pos[i]!.y);
        c.scale.set(pos[i]!.scale);
      });
      return;
    }
    this.speaker?.position.set(w / 2, portrait ? h * 0.22 : h * 0.26);
    const pos = arrange(
      this.cards.length,
      w / 2,
      portrait ? h * 0.6 : h * 0.66,
      w - 60,
      portrait ? h * 0.62 : h * 0.55,
      CARD,
    );
    this.cards.forEach((c, i) => {
      c.position.set(pos[i]!.x, pos[i]!.y);
      c.scale.set(pos[i]!.scale);
    });
  }

  private clearCards() {
    for (const c of this.cards) c.destroy({ children: true });
    this.cards = [];
    this.movers = [];
    this.bigPic?.destroy({ children: true });
    this.bigPic = null;
  }

  private async showQuestion() {
    this.clearCards();
    const q = this.choices[this.qi]!;
    if (this.mode === 2) return this.showSoundQuestion(q);
    q.options.forEach((id, i) => {
      const c = new Card(CARD, CARD);
      const pic = makePicture(getWord(id).pic, CARD * 0.9);
      if (this.mode === 4 && isMoving(id)) {
        const m = new Moving(pic, id);
        this.movers.push(m);
        c.addChild(m);
      } else c.addChild(pic);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => void this.pick(c, id, q));
      this.layer.addChild(c);
      this.cards.push(c);
      void popIn(c, i * 90);
    });
    this.layoutGame(this.game.W, this.game.H);
    await wait(350);
    await voice.say(vid.word(q.target));
  }

  private async pick(card: Card, id: string, q: ChoiceQuestion) {
    if (this.busy) return;
    this.busy = true;
    const correct = id === q.target;
    const assist = this.record(correct, { words: [q.target] });
    if (correct) {
      card.draw(0xfff1b8, C.gold);
      void bounce(card);
      const p = card.getGlobalPosition();
      await this.celebrate(p.x / this.game.scale, p.y / this.game.scale, [vid.word(q.target)]);
      this.qi++;
      if (await this.next()) await this.showQuestion();
    } else {
      void shake(card);
      dim(card);
      await this.gentleNo(assist);
      await this.applyAssist(assist, q);
    }
    this.busy = false;
  }

  private async applyAssist(assist: string, q: ChoiceQuestion) {
    const idx = q.options.indexOf(q.target);
    const target = this.cards[idx];
    if (!target) return;
    if (assist === 'hint' || assist === 'together') {
      hintRing(target, CARD * 0.62);
      await voice.say(vid.word(q.target));
    }
    if (assist === 'together') {
      const hand = await helpingHand(this.layer, { x: this.game.W / 2, y: this.game.H }, target.position);
      setTimeout(() => hand.destroy(), 1200);
    }
  }

  /* ---------- mode 2: picture → sound (drag the talking bee to the picture) ---------- */
  private async showSoundQuestion(q: ChoiceQuestion) {
    const pic = new Card(300, 300, 0xfff7e8);
    pic.addChild(makePicture(getWord(q.target).pic, 280));
    this.bigPic = pic;
    this.layer.addChild(pic);
    void popIn(pic);
    const colors = [C.gold, C.pink, C.sky];
    q.options.forEach((id, i) => {
      const bee = new Card(170, 170, colors[i % 3]);
      bee.bg.alpha = 0;
      bee.addChild(drawBee(colors[i % 3]!));
      this.layer.addChild(bee);
      this.cards.push(bee);
      void popIn(bee, 200 + i * 100);
      makeDraggable(this.game, bee, {
        onTapOnly: () => {
          void bounce(bee);
          void voice.sayNow(vid.word(id));
        },
        onStart: () => void voice.sayNow(vid.word(id)),
        onDrop: (g) => {
          if (!this.bigPic || !within(this.game, g, this.bigPic)) return false;
          void this.dropSound(bee, id, q);
          return id === q.target;
        },
      });
    });
    this.layoutGame(this.game.W, this.game.H);
  }

  private async dropSound(bee: Card, id: string, q: ChoiceQuestion) {
    if (this.busy) return;
    this.busy = true;
    const correct = id === q.target;
    const assist = this.record(correct, { words: [q.target] });
    if (correct) {
      await tween(bee, { x: this.bigPic!.x, y: this.bigPic!.y }, { duration: 200 });
      await this.celebrate(this.bigPic!.x, this.bigPic!.y, [vid.word(q.target)]);
      this.qi++;
      if (await this.next()) await this.showQuestion();
    } else {
      await this.gentleNo(assist);
      const target = this.cards[q.options.indexOf(q.target)];
      if (target && assist !== 'none') {
        hintRing(target, 110);
        await voice.say(vid.word(q.target));
      }
      if (target && assist === 'together') {
        void helpingHand(this.layer, target.position, this.bigPic!.position).then((h) =>
          setTimeout(() => h.destroy(), 800),
        );
      }
    }
    this.busy = false;
  }

  /* ---------- mode 3: memory (picture ↔ sound) ---------- */
  private async startMemory() {
    const ids = this.memory!;
    const deck = this.rng.shuffle(
      ids.flatMap((id) => [
        { id, face: 'pic' as const },
        { id, face: 'sound' as const },
      ]),
    );
    for (const d of deck) {
      const card = new Card(170, 200, C.cream);
      const back = new Container();
      const bg = new Graphics();
      bg.roundRect(-85, -100, 170, 200, 26).fill(C.mint).stroke({ width: 6, color: 0xffffff });
      bg.star(0, 0, 5, 40, 18).fill({ color: 0xffffff, alpha: 0.7 });
      back.addChild(bg);
      const front = d.face === 'pic' ? makePicture(getWord(d.id).pic, 160) : speakerIcon(90, C.indigo);
      front.visible = false;
      card.addChild(front, back);
      card.eventMode = 'static';
      card.cursor = 'pointer';
      const entry = { card, id: d.id, face: d.face, open: false, done: false, front, back };
      card.on('pointertap', () => void this.flip(entry));
      this.memCards.push(entry);
      this.layer.addChild(card);
    }
    this.layoutGame(this.game.W, this.game.H);
    this.memCards.forEach((m, i) => void popIn(m.card, i * 60));
    await this.instruct([vid.ko('wordGarden.3')]);
  }

  private layoutMemory(w: number, h: number) {
    const n = this.memCards.length;
    const portrait = h > w;
    const cols = portrait ? (n <= 6 ? 3 : 4) : n <= 6 ? 3 : n <= 8 ? 4 : Math.ceil(n / 2);
    const rows = Math.ceil(n / cols);
    const availW = w - 60;
    const availH = h - 220;
    const s = Math.min(1, availW / (cols * 200), availH / (rows * 230));
    this.memCards.forEach((m, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      m.card.position.set(
        w / 2 + (c - (cols - 1) / 2) * 200 * s,
        190 + availH / 2 + (r - (rows - 1) / 2) * 230 * s,
      );
      m.card.scale.set(s);
    });
  }

  private async turn(m: (typeof this.memCards)[number], open: boolean) {
    const sx = m.card.scale.x;
    sfx.flip();
    await tween(m.card.scale, { x: 0.01 }, { duration: 110 });
    m.front.visible = open;
    m.back.visible = !open;
    m.open = open;
    await tween(m.card.scale, { x: sx }, { duration: 140, ease: ease.outBack });
  }

  private async flip(m: (typeof this.memCards)[number]) {
    const idx = this.memCards.indexOf(m);
    // claim the card synchronously so fast double taps can't flip a 3rd card or pair a card with itself
    if (this.busy || m.open || m.done || this.flipped.includes(idx) || this.flipped.length >= 2) return;
    this.flipped.push(idx);
    if (this.flipped.length === 2) this.busy = true;
    await this.turn(m, true);
    void voice.sayNow(vid.word(m.id));
    if (this.flipped.length < 2) return;
    const [a, b] = this.flipped.map((i) => this.memCards[i]!) as [typeof m, typeof m];
    await wait(700);
    if (a.id === b.id) {
      a.done = b.done = true;
      a.card.draw(0xfff1b8, C.gold);
      b.card.draw(0xfff1b8, C.gold);
      this.missStreak = 0;
      this.record(true, { words: [a.id] });
      await this.celebrate(b.card.x, b.card.y, [vid.word(a.id)]);
      this.flipped = [];
      await this.next();
    } else {
      this.mismatches++;
      this.missStreak++;
      sfx.soft();
      await wait(400);
      await Promise.all([this.turn(a, false), this.turn(b, false)]);
      this.flipped = [];
      if (this.missStreak >= 3) await this.peekHint();
      if (this.mismatches === this.memory!.length * 2) this.record(false, {});
    }
    this.busy = false;
  }

  /** After 3 misses in a row: briefly show one matching pair. */
  private async peekHint() {
    this.missStreak = 0;
    const left = this.memCards.filter((m) => !m.done);
    const id = left[0]?.id;
    if (!id) return;
    void voice.sayNow(vid.ko('hint.look'));
    const pair = left.filter((m) => m.id === id);
    await Promise.all(pair.map((m) => this.turn(m, true)));
    const rings = pair.map((m) => hintRing(m.card, 110));
    await wait(1300);
    await Promise.all(pair.map((m) => this.turn(m, false)));
    rings.forEach((r) => r.destroy());
  }

  protected override tick(dt: number) {
    for (const m of this.movers) if (!m.destroyed) m.update(dt);
  }
}
