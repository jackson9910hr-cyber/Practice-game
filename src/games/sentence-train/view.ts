/** 문장 기차 view: hear a sentence, load word cards onto the train, then say it along. */
import { Container, Graphics, Text } from 'pixi.js';
import { getWord } from '../../core/content';
import { pickSentences } from '../../core/rounds';
import type { StationPlan } from '../../core/types';
import { vid } from '../../core/voice-ids';
import { C, COLOR_WORDS, FONT_EN } from '../../art/palette';
import { makePicture } from '../../art/pictures';
import { canRecord, playBlob, Recorder } from '../../audio/recorder';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { makeDraggable } from '../../engine/drag';
import { ease, tween, wait } from '../../engine/tween';
import { Button, Card, speakerIcon } from '../../engine/ui';
import { store } from '../../state';
import { addRecording } from '../../storage/db';
import { GameBase } from '../base';
import { arrange, bounce, helpingHand, hintRing, popIn, shake } from '../common';
import { makeTrainQuestion, type TrainCard, type TrainQuestion } from './logic';

const CARD_H = 150;

function cardWidth(t: string) {
  return Math.max(150, t.length * 30 + 70);
}

class WordCard extends Container {
  readonly w: number;
  readonly bg = new Graphics();
  constructor(public card: TrainCard) {
    super();
    this.w = cardWidth(card.t);
    this.draw(C.cream);
    this.addChild(this.bg);
    const txt = new Text({
      text: card.t,
      style: { fontFamily: FONT_EN, fontSize: 50, fontWeight: '800', fill: C.ink },
    });
    txt.anchor.set(0.5);
    if (card.w) {
      const pic = makePicture(getWord(card.w).pic, 70);
      pic.y = -32;
      txt.y = 34;
      txt.style.fontSize = 42;
      this.addChild(pic);
    }
    this.addChild(txt);
  }
  draw(color: number, border = 0xffffff) {
    this.bg.clear();
    this.bg.roundRect(-this.w / 2, -CARD_H / 2 + 6, this.w, CARD_H, 22).fill({ color: 0, alpha: 0.18 });
    this.bg
      .roundRect(-this.w / 2, -CARD_H / 2, this.w, CARD_H, 22)
      .fill(color)
      .stroke({ width: 5, color: border });
  }
}

function locomotive(): Container {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(-110, -70, 200, 130, 28).fill(C.pink).stroke({ width: 6, color: C.ink });
  g.roundRect(-100, -150, 90, 90, 18).fill(C.cream).stroke({ width: 6, color: C.ink });
  g.rect(40, -125, 36, 60).fill(C.ink);
  g.ellipse(58, -130, 30, 12).fill(C.ink);
  g.poly([90, -20, 140, 50, 90, 50]).fill(C.gold).stroke({ width: 5, color: C.ink });
  for (const x of [-70, 30])
    g.circle(x, 70, 30).fill(C.indigo).stroke({ width: 6, color: C.ink }).circle(x, 70, 10).fill(C.gold);
  g.circle(-70, -110, 9).fill(C.ink).circle(-40, -110, 9).fill(C.ink);
  g.moveTo(-68, -88).quadraticCurveTo(-55, -78, -42, -88).stroke({ width: 5, color: C.ink, cap: 'round' });
  c.addChild(g);
  return c;
}

interface Car {
  c: Container;
  expected: string;
  filled: WordCard | null;
  w: number;
}

export class SentenceTrainView extends GameBase<'sentence-train'> {
  private qs: TrainQuestion[] = [];
  private qi = 0;
  private train = new Container();
  private loco = locomotive();
  private cars: Car[] = [];
  private tray: WordCard[] = [];
  private cargo: Container | null = null;
  private speaker: Button;
  private panel = new Container();
  private recorder = new Recorder();
  private options: Card[] = [];

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'sentence-train', plan, index);
    this.speaker = new Button({
      icon: speakerIcon(80),
      size: 140,
      color: C.gold,
      onTap: () => this.saySentence(),
      a11y: '문장 다시 듣기',
    });
    this.train.addChild(this.loco);
    this.layer.addChild(this.train, this.speaker, this.panel);
  }

  async start() {
    const save = store.save;
    const sents = pickSentences(save, this.day, 3, this.mode, this.rng, this.scope);
    const learned = Object.keys(save.words);
    this.qs = sents.map((s) => makeTrainQuestion(s, this.mode, this.params, this.rng, learned));
    this.setTotal(this.qs.length);
    await this.instruct([vid.ko(this.mode >= 4 ? 'train.picture' : 'train.go')]);
    await this.show();
  }

  private get q() {
    return this.qs[this.qi]!;
  }

  private async saySentence() {
    const q = this.q;
    voice.cancel();
    if (q.prompt) await voice.say(vid.sentence(q.prompt));
    await voice.say(vid.sentence(q.sentence.text));
  }

  private clear() {
    for (const c of this.cars) c.c.destroy({ children: true });
    for (const t of this.tray) t.destroy({ children: true });
    for (const o of this.options) o.destroy({ children: true });
    this.cargo?.destroy({ children: true });
    this.panel.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.cars = [];
    this.tray = [];
    this.options = [];
    this.cargo = null;
  }

  private async show() {
    this.clear();
    const q = this.q;
    if (this.mode >= 4 && q.pictureOptions) return this.showPictureChoice(q);
    // cargo picture (meaning support)
    const main = q.answer?.colorWord ?? q.sentence.words[q.sentence.words.length - 1];
    if (main) {
      const cg = new Card(150, 150);
      cg.addChild(
        makePicture(
          q.answer?.colorWord
            ? `draw:color:#${COLOR_WORDS[main]!.toString(16).padStart(6, '0')}`
            : getWord(main).pic,
          140,
        ),
      );
      this.cargo = cg;
      this.train.addChild(cg);
    }
    q.sentence.cards.forEach((card, i) => {
      const w = cardWidth(card.t) + 20;
      const c = new Container();
      const g = new Graphics();
      g.roundRect(-w / 2, -20, w, 90, 16)
        .fill(C.sky)
        .stroke({ width: 6, color: C.ink });
      for (const x of [-w / 2 + 34, w / 2 - 34])
        g.circle(x, 76, 22).fill(C.indigo).stroke({ width: 5, color: C.ink });
      g.roundRect(-w / 2 + 10, -CARD_H / 2 - 50, w - 20, CARD_H, 20).stroke({
        width: 4,
        color: 0xffffff,
        alpha: 0.6,
      });
      c.addChild(g);
      this.train.addChild(c);
      const car: Car = { c, expected: card.t, filled: null, w };
      this.cars.push(car);
      if (i < q.fixed) {
        const wc = new WordCard({ ...card, id: -100 - i });
        wc.position.set(0, -50);
        c.addChild(wc);
        car.filled = wc;
      }
    });
    for (const tc of q.cards.slice(q.fixed)) {
      const wc = new WordCard(tc);
      this.tray.push(wc);
      this.layer.addChild(wc);
      makeDraggable(this.game, wc, {
        onTapOnly: () => {
          void bounce(wc);
          void voice.sayNow(vid.card(tc.t));
        },
        onStart: () => void voice.sayNow(vid.card(tc.t)),
        onDrop: (gp) => this.drop(wc, gp),
      });
    }
    this.layoutGame(this.game.W, this.game.H);
    // chug in
    const tx = this.train.x;
    this.train.x = tx + this.game.W;
    sfx.whistle();
    await tween(this.train, { x: tx }, { duration: 900, ease: ease.outQuad });
    this.tray.forEach((t, i) => void popIn(t, i * 70));
    await this.saySentence();
    if (this.qi === 0 && this.mode <= 2) await voice.say(vid.ko('train.tapHint'));
  }

  protected layoutGame(w: number, h: number) {
    const portrait = h > w;
    // train: locomotive + cars laid out left→right, scaled to fit
    let x = 0;
    this.loco.position.set(x, 0);
    x += 130;
    if (this.cargo) {
      this.cargo.position.set(-10, -190);
    }
    for (const car of this.cars) {
      x += car.w / 2 + 12;
      car.c.position.set(x, 0);
      x += car.w / 2;
    }
    const trainW = x + 120;
    const s = Math.min(1, (w - 60) / trainW);
    this.train.scale.set(s);
    this.train.position.set((w - trainW * s) / 2 + 110 * s, portrait ? h * 0.4 : h * 0.44);
    this.speaker.position.set(w / 2, portrait ? h * 0.18 : 175);
    if (this.cargo && !portrait) this.speaker.position.set(w * 0.72, 175);
    const trayY = portrait ? h * 0.72 : h * 0.8;
    const pos = this.flowTray(w, trayY);
    this.tray.forEach((t, i) => {
      if (this.cars.some((c) => c.filled === t)) return;
      t.position.set(pos[i]!.x, pos[i]!.y);
    });
    this.panel.position.set(w / 2, portrait ? h * 0.74 : h * 0.8);
    const opt = arrange(this.options.length, w / 2, portrait ? h * 0.62 : h * 0.62, w - 80, h * 0.4, 240);
    this.options.forEach((o, i) => o.position.set(opt[i]!.x, opt[i]!.y));
  }

  private flowTray(w: number, y: number) {
    const out: { x: number; y: number }[] = [];
    let row: WordCard[] = [];
    const rows: WordCard[][] = [];
    let rw = 0;
    for (const t of this.tray) {
      if (rw + t.w + 30 > w - 60 && row.length) {
        rows.push(row);
        row = [];
        rw = 0;
      }
      row.push(t);
      rw += t.w + 30;
    }
    if (row.length) rows.push(row);
    const idx = new Map<WordCard, { x: number; y: number }>();
    rows.forEach((r, ri) => {
      const total = r.reduce((a, t) => a + t.w + 30, -30);
      let x = w / 2 - total / 2;
      for (const t of r) {
        idx.set(t, { x: x + t.w / 2, y: y + ri * (CARD_H + 24) });
        x += t.w + 30;
      }
    });
    for (const t of this.tray) out.push(idx.get(t)!);
    return out;
  }

  private carAt(gx: number, gy: number): Car | null {
    let best: Car | null = null;
    let bd = Infinity;
    for (const c of this.cars) {
      if (c.filled) continue;
      const p = c.c.getGlobalPosition();
      const d = Math.hypot(p.x - gx, p.y - 50 * this.train.scale.x * this.game.scale - gy);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best && bd <= 96 + (best.w * this.train.scale.x * this.game.scale) / 2 ? best : null;
  }

  private drop(wc: WordCard, gp: { x: number; y: number }): boolean {
    if (this.busy) return false;
    const car = this.carAt(gp.x, gp.y);
    if (!car) return false;
    // forgiving: if the card belongs in ANY empty car (duplicates, or dropped on a neighbour), use it
    const right =
      car.expected === wc.card.t
        ? car
        : this.cars.find(
            (c) =>
              !c.filled &&
              c.expected === wc.card.t &&
              Math.abs(this.cars.indexOf(c) - this.cars.indexOf(car)) <= 1,
          );
    if (!right) {
      void this.wrongCard(wc);
      return false;
    }
    void this.load(wc, right);
    return true;
  }

  private async load(wc: WordCard, car: Car) {
    car.filled = wc;
    sfx.snap();
    this.layer.removeChild(wc);
    car.c.addChild(wc);
    wc.position.set(0, -50);
    wc.scale.set(1);
    void bounce(wc);
    if (this.cars.every((c) => c.filled)) await this.complete();
  }

  private async wrongCard(wc: WordCard) {
    this.busy = true;
    void shake(wc);
    const assist = this.miss();
    await this.gentleNo(assist);
    const nextCar = this.cars.find((c) => !c.filled)!;
    const right = this.tray.find(
      (t) => t.card.t === nextCar.expected && !this.cars.some((c) => c.filled === t),
    );
    if (right && assist !== 'none') {
      await voice.say(vid.card(nextCar.expected));
      const r = hintRing(right, right.w / 2 + 10);
      setTimeout(() => r.destroy(), 2500);
    }
    if (right && assist === 'together') {
      const to = this.layer.toLocal(nextCar.c.getGlobalPosition());
      const hand = await helpingHand(this.layer, right.position, to);
      hand.destroy();
      this.busy = false;
      await this.load(right, nextCar);
      return;
    }
    this.busy = false;
  }

  private async complete() {
    this.busy = true;
    const q = this.q;
    this.record(this.wrongs < 2, { words: q.sentence.words });
    store.update((s) => ({
      ...s,
      patternsSeen: {
        ...s.patternsSeen,
        [q.sentence.pattern]: (s.patternsSeen[q.sentence.pattern] ?? 0) + 1,
      },
    }));
    sfx.whistle();
    // each car lights up with its word
    for (const car of this.cars) {
      car.filled!.draw(0xfff1b8, C.gold);
      void bounce(car.c);
      await voice.say(vid.card(car.expected));
      await wait(120);
    }
    await wait(250);
    await voice.say(vid.sentence(q.sentence.text));
    this.fx.burst(this.game.W / 2, this.train.y, { count: 24 });
    await tween(this.train, { x: this.train.x + 40 }, { duration: 300, ease: ease.outBack });
    if (q.answer) await this.askAnswer(q);
    else await this.sayAlong(q.sentence.text);
    this.busy = false;
  }

  /* ----- mode 3: answer the question ----- */
  private async askAnswer(q: TrainQuestion) {
    await voice.say(vid.ko('train.answer'));
    const a = q.answer!;
    this.tray.forEach((t) => (t.visible = false));
    await new Promise<void>((resolve) => {
      a.options.forEach((text, i) => {
        const card = new Card(Math.max(300, text.length * 26 + 80), 130, i ? C.cream : C.cream);
        const t = new Text({
          text,
          style: { fontFamily: FONT_EN, fontSize: 46, fontWeight: '800', fill: C.ink },
        });
        t.anchor.set(0.5);
        card.addChild(t);
        card.eventMode = 'static';
        card.cursor = 'pointer';
        card.on('pointertap', async () => {
          if (this.busy && card.alpha < 1) return;
          await voice.sayNow(vid.sentence(text));
          if (text === a.correct) {
            card.draw(0xfff1b8, C.gold);
            await this.celebrate(card.x, card.y, []);
            this.options.forEach((o) => o.destroy({ children: true }));
            this.options = [];
            await this.sayAlong(a.correct);
            resolve();
          } else {
            void shake(card);
            sfx.soft();
          }
        });
        this.options.push(card);
        this.layer.addChild(card);
        void popIn(card, i * 120);
      });
      this.layoutGame(this.game.W, this.game.H);
      const pos = arrange(
        this.options.length,
        this.game.W / 2,
        this.game.H * 0.78,
        this.game.W - 80,
        200,
        340,
      );
      this.options.forEach((o, i) => o.position.set(pos[i]!.x, pos[i]!.y));
    });
  }

  /* ----- mode 4: sentence → picture ----- */
  private async showPictureChoice(q: TrainQuestion) {
    const opts = q.pictureOptions!;
    const main = q.sentence.words[q.sentence.words.length - 1]!;
    opts.forEach((id, i) => {
      const c = new Card(220, 220);
      c.addChild(makePicture(getWord(id).pic, 200));
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', async () => {
        if (this.busy) return;
        this.busy = true;
        const ok = id === main;
        const assist = this.record(ok, { words: ok ? q.sentence.words : [] });
        if (ok) {
          c.draw(0xfff1b8, C.gold);
          await this.celebrate(c.x, c.y, [vid.sentence(q.sentence.text)]);
          this.options.forEach((o) => o !== c && o.destroy({ children: true }));
          this.options = [c];
          await this.sayAlong(q.sentence.text);
        } else {
          void shake(c);
          await this.gentleNo(assist);
          const right = this.options[opts.indexOf(main)];
          if (right && assist !== 'none') {
            hintRing(right, 130);
            await voice.say(vid.sentence(q.sentence.text));
          }
        }
        this.busy = false;
      });
      this.options.push(c);
      this.layer.addChild(c);
      void popIn(c, i * 90);
    });
    this.train.visible = false;
    this.speaker.position.set(this.game.W / 2, 200);
    this.layoutGame(this.game.W, this.game.H);
    await wait(300);
    await this.saySentence();
  }

  /* ----- echo: listen, repeat (optionally record + play back; never scored) ----- */
  private async sayAlong(text: string) {
    await voice.say(vid.ko('say.go'));
    await voice.say(vid.sentence(text));
    await wait(2200); // time for the child to repeat out loud
    const recOn = store.save.settings.recordingEnabled && canRecord();
    let blob: Blob | null = null;
    await new Promise<void>((resolve) => {
      const row: Button[] = [];
      const again = new Button({
        icon: speakerIcon(70),
        color: C.cream,
        onTap: () => void voice.sayNow(vid.sentence(text)),
        a11y: '다시 듣기',
      });
      row.push(again);
      if (recOn) {
        let recording = false;
        const play = new Button({
          icon: '▶️',
          color: C.mint,
          onTap: async () => {
            if (!blob) return;
            await playBlob(blob);
            void voice.say(vid.ko('say.nice'));
          },
          a11y: '내 목소리 듣기',
        });
        play.enabled = false;
        const mic = new Button({
          icon: '🎤',
          color: C.pink,
          size: 150,
          onTap: async () => {
            if (recording) {
              this.recorder.stop();
              return;
            }
            recording = true;
            voice.cancel();
            mic.pulse(true);
            const r = await this.recorder.start(5000);
            mic.pulse(false);
            recording = false;
            if (r) {
              blob = r.blob;
              play.enabled = true;
              play.pulse(true);
              void addRecording(text, r.blob, Date.now());
              void voice.say(vid.ko('say.playback'));
            }
          },
          a11y: '녹음하기',
        });
        row.push(mic, play);
        void voice.say(vid.ko('say.record'));
      }
      const nextBtn = new Button({
        icon: '➡️',
        color: C.gold,
        size: 150,
        onTap: () => resolve(),
        a11y: '다음',
      });
      nextBtn.pulse(true);
      row.push(nextBtn);
      row.forEach((b, i) => {
        b.x = (i - (row.length - 1) / 2) * 190;
        this.panel.addChild(b);
        void popIn(b, i * 80);
      });
      this.tray.forEach((t) => (t.visible = false));
    });
    this.qi++;
    if (await this.next()) await this.show();
  }

  override stop() {
    super.stop();
    this.recorder.stop();
  }
}
