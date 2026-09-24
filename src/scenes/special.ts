/**
 * Special stations: chapter chant (call & response over a generated beat), greeting medley,
 * the chapter transition, and the Day-30 Starlight Festival finale.
 */
import { Container, Text } from 'pixi.js';
import { chants, chapterOf, chapters, friends, getDay, getFriend, getWord, sentences } from '../core/content';
import { exposeWords } from '../core/answers';
import { festivalWords } from '../core/rounds';
import { completeStation, curriculumDay } from '../core/progress';
import type { StationPlan } from '../core/types';
import { vid } from '../core/voice-ids';
import { GardenBackground } from '../art/backgrounds';
import { Fairy } from '../art/fairy';
import { FriendSprite } from '../art/friends';
import { C, FONT_EN } from '../art/palette';
import { makePicture } from '../art/pictures';
import { audio } from '../audio/context';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Fx } from '../engine/fx';
import { Scene } from '../engine/scene';
import { ease, tween, wait } from '../engine/tween';
import { Button, Card, earButton, homeButton } from '../engine/ui';
import { nav } from '../flow';
import { store } from '../state';
import { restoreLevel } from './hub';

abstract class SpecialBase extends Scene {
  protected bg: GardenBackground;
  protected fx: Fx;
  protected fairy = new Fairy(150);
  protected day = curriculumDay(store.save);
  protected home: Button;
  constructor(
    game: GameApp,
    protected plan: StationPlan | null,
    protected index: number,
  ) {
    super(game);
    this.bg = new GardenBackground(chapterOf(this.day).key, restoreLevel());
    this.fx = new Fx(game);
    this.home = homeButton(() => void nav.hub(this));
    this.addChild(this.bg, this.fairy);
  }
  protected finishStation() {
    const counts = this.index >= (store.save.today?.stationsDone ?? 0);
    if (this.plan && counts) store.update((s) => completeStation(s, undefined, 0));
  }
  layout(w: number, h: number) {
    this.bg.layout(w, h);
    this.home.position.set(w - 90, 90);
    this.fairy.position.set(w * 0.12, h * 0.25);
    this.layoutSpecial(w, h);
  }
  protected abstract layoutSpecial(w: number, h: number): void;
  override update(dt: number) {
    this.bg.update(dt);
    this.fairy.update(dt);
    this.fx.update(dt);
  }
  override stop() {
    voice.cancel();
    this.beatOn = false;
  }
  protected beatOn = false;
  /** Soft chant beat: kick on 1 & 3, clap on 2 & 4, shaker on eighths. */
  protected startBeat(bpm: number) {
    if (!audio.ctx) return;
    this.beatOn = true;
    const beat = 60 / bpm;
    let next = audio.now + 0.1;
    let i = 0;
    const loop = () => {
      if (!this.beatOn) return;
      while (next < audio.now + 0.3) {
        const at = next - audio.now;
        if (i % 4 === 0 || i % 4 === 2) sfx.kick(at);
        else sfx.clap(at);
        sfx.shaker(at + beat / 2);
        next += beat;
        i++;
      }
      setTimeout(loop, 80);
    };
    loop();
  }
}

export class ChantScene extends SpecialBase {
  private cards = new Container();
  private lineText: Text;
  private ear: Button;
  constructor(game: GameApp, plan: StationPlan | null, index: number) {
    super(game, plan, index);
    this.lineText = new Text({
      text: '',
      style: {
        fontFamily: FONT_EN,
        fontSize: 52,
        fontWeight: '800',
        fill: C.cream,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 900,
      },
    });
    this.lineText.anchor.set(0.5);
    this.ear = earButton(() => void voice.sayNow(vid.ko('chant.go')));
    this.addChild(this.cards, this.lineText, this.home, this.ear, this.fx);
  }
  protected layoutSpecial(w: number, h: number) {
    this.ear.position.set(90, 90);
    this.cards.position.set(w / 2, h * 0.45);
    this.lineText.position.set(w / 2, h * 0.75);
    this.lineText.style.wordWrapWidth = w - 80;
  }
  async start() {
    const chapter = chapterOf(this.day).id;
    const chant = chants.find((c) => c.chapter === chapter)!;
    music.stop();
    await voice.sayNow(vid.ko('chant.go'));
    this.startBeat(chant.bpm);
    const bar = (60 / chant.bpm) * 4 * 1000;
    await wait(bar);
    for (let round = 0; round < 2; round++) {
      for (const line of chant.lines) {
        this.showLine(line.text, line.words);
        const t0 = Date.now();
        this.fairy.talk(bar * 0.8);
        await voice.say(vid.sentence(line.text), { rate: 0.9 });
        // call (fairy) … then a full bar of silence for the child's response
        await wait(Math.max(0, bar - (Date.now() - t0)));
        this.check();
        this.pulseCards();
        await wait(bar);
        this.check();
      }
    }
    this.beatOn = false;
    this.check();
    this.expose(chant.lines.flatMap((l) => l.words));
    sfx.fanfare();
    this.fx.burst(this.game.W / 2, this.game.H / 2, { count: 40, speed: 1.4 });
    await voice.say(vid.praiseEn(0));
    this.finishStation();
    await nav.hub(this);
  }
  private expose(ids: string[]) {
    store.update((s) => exposeWords(s, ids, this.day));
  }
  private showLine(text: string, ws: string[]) {
    this.lineText.text = text;
    this.cards.removeChildren().forEach((c) => c.destroy({ children: true }));
    ws.forEach((id, i) => {
      const c = new Card(170, 170);
      c.addChild(makePicture(getWord(id).pic, 150));
      c.x = (i - (ws.length - 1) / 2) * 190;
      c.scale.set(0);
      this.cards.addChild(c);
      void tween(c.scale, { x: 1, y: 1 }, { duration: 300, delay: i * 80, ease: ease.outBack });
    });
    const s = Math.min(1, (this.game.W - 60) / (ws.length * 190));
    this.cards.scale.set(s);
  }
  private pulseCards() {
    for (const c of this.cards.children) {
      void tween(c.scale, { x: 1.15, y: 1.15 }, { duration: 150 }).then(() =>
        tween(c.scale, { x: 1, y: 1 }, { duration: 300, ease: ease.outBack }),
      );
    }
  }
}

/** Friends greet one after another (D27 medley, D30 finale parade). */
async function parade(
  scene: Scene & { fx: Fx },
  layer: Container,
  game: GameApp,
  ids: string[],
  opts: { sentence: boolean },
) {
  const shown: FriendSprite[] = [];
  const cols = Math.min(10, ids.length);
  for (const [i, id] of ids.entries()) {
    if (!scene.alive) return shown;
    const f = getFriend(id);
    const sp = new FriendSprite(f, 150);
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cell = (game.W - 80) / cols;
    sp.position.set(40 + cell * (c + 0.5), game.H * 0.32 + r * 150);
    sp.scale.set(0);
    layer.addChild(sp);
    shown.push(sp);
    const target = Math.min(150, cell * 1.1) / 220;
    void tween(sp.scale, { x: target, y: target }, { duration: 400, ease: ease.outBack });
    sp.hop();
    sfx.pop();
    scene.fx.burst(sp.x, sp.y, { count: 10 });
    sp.talk(1500);
    if (opts.sentence) {
      // each friend says the sentence pattern they taught
      const s = sentences.find((x) => x.pattern === getDay(f.day).pattern)!;
      store.update((sv) => exposeWords(sv, s.words, curriculumDay(sv)));
      await voice.say(vid.sentence(s.text));
    } else await voice.say(vid.greet(id));
    await wait(120);
  }
  return shown;
}

export class MedleyScene extends SpecialBase {
  private layer = new Container();
  private sprites: FriendSprite[] = [];
  constructor(game: GameApp, plan: StationPlan | null, index: number) {
    super(game, plan, index);
    this.addChild(this.layer, this.home, this.fx);
  }
  protected layoutSpecial() {}
  async start() {
    await voice.sayNow(vid.ko('medley.go'));
    this.sprites = await parade(
      this as unknown as Scene & { fx: Fx },
      this.layer,
      this.game,
      store.save.friendsMet,
      { sentence: false },
    );
    this.check();
    sfx.fanfare();
    this.finishStation();
    await wait(800);
    await nav.hub(this);
  }
  override update(dt: number) {
    super.update(dt);
    for (const s of this.sprites) s.update(dt);
  }
}

export class FinaleScene extends SpecialBase {
  private layer = new Container();
  private sprites: FriendSprite[] = [];
  private title: Text;
  constructor(game: GameApp, plan: StationPlan | null, index: number) {
    super(game, plan, index);
    this.title = new Text({
      text: '⭐ Starlight Festival ⭐',
      style: { fontFamily: FONT_EN, fontSize: 64, fontWeight: '800', fill: C.gold },
    });
    this.title.anchor.set(0.5);
    this.addChild(this.title, this.layer, this.home, this.fx);
    this.bg.setRestore(1);
  }
  protected layoutSpecial(w: number, h: number) {
    this.title.position.set(w / 2, h * 0.13);
    this.title.scale.set(Math.min(1, (w - 60) / 900));
  }
  async start() {
    music.play('festival');
    await voice.sayNow(vid.ko('finale.intro'));
    await voice.say(vid.en('misc.festival'));
    const all = friends.map((f) => f.id);
    this.sprites = await parade(this as unknown as Scene & { fx: Fx }, this.layer, this.game, all, {
      sentence: true,
    });
    this.check();
    for (let i = 0; i < 8; i++) {
      sfx.sparkle();
      this.fx.burst(this.game.W * (0.15 + Math.random() * 0.7), this.game.H * (0.15 + Math.random() * 0.3), {
        count: 30,
        speed: 1.6,
      });
      await wait(260);
    }
    sfx.fanfare();
    await voice.say(vid.ko('finale.end'));
    await voice.say(vid.en('misc.goodnight'));
    this.check();
    this.finishStation();
    await nav.goodnight('done', this);
  }
  override update(dt: number) {
    super.update(dt);
    for (const s of this.sprites) s.update(dt);
  }

  /** Lumi's gift: today's five words, each shown and said once more. */
  private async wordGift() {
    await voice.say(vid.ko('finale.gift'));
    const ids = getDay(30).words;
    store.update((s) => exposeWords(s, ids, this.day));
    await this.showWords(ids, 900);
  }

  /** Festival chant: the last two days' words on the beat, friends bouncing along. */
  private async festivalChant() {
    await voice.say(vid.ko('finale.chant'));
    const ids = festivalWords();
    store.update((s) => exposeWords(s, ids, this.day));
    this.startBeat(108);
    await this.showWords(ids, 450);
    this.beatOn = false;
  }

  private async showWords(ids: string[], gap: number) {
    const row = new Container();
    row.position.set(this.game.W / 2, this.game.H * 0.8);
    this.addChild(row);
    const size = Math.min(150, (this.game.W - 40) / Math.min(ids.length, 5));
    for (const [i, id] of ids.entries()) {
      this.check();
      const c = new Card(size - 10, size - 10);
      c.addChild(makePicture(getWord(id).pic, size - 20));
      c.x = ((i % 5) - 2) * size;
      c.y = Math.floor(i / 5) * size - (ids.length > 5 ? size / 2 : 0);
      c.scale.set(0);
      row.addChild(c);
      void tween(c.scale, { x: 1, y: 1 }, { duration: 300, ease: ease.outBack });
      this.sprites.forEach((s) => i % 2 === 0 && s.hop());
      await voice.say(vid.word(id));
      await wait(gap);
    }
    await wait(500);
    row.destroy({ children: true });
  }
}

export class ChapterScene extends SpecialBase {
  private newBg: GardenBackground;
  private title: Text;
  constructor(
    game: GameApp,
    private chapter: number,
  ) {
    super(game, null, 0);
    const prev = chapters[chapter - 2]!;
    this.removeChild(this.bg);
    this.bg = new GardenBackground(prev.key, 1);
    this.newBg = new GardenBackground(chapters[chapter - 1]!.key, 0.15);
    this.newBg.alpha = 0;
    this.title = new Text({
      text: chapters[chapter - 1]!.name,
      style: { fontFamily: FONT_EN, fontSize: 80, fontWeight: '800', fill: C.gold },
    });
    this.title.anchor.set(0.5);
    this.title.alpha = 0;
    this.addChildAt(this.bg, 0);
    this.addChildAt(this.newBg, 1);
    this.addChild(this.title, this.fx);
  }
  protected layoutSpecial(w: number, h: number) {
    this.newBg.layout(w, h);
    this.title.position.set(w / 2, h * 0.4);
  }
  async start() {
    music.play(chapters[this.chapter - 1]!.key);
    sfx.whoosh();
    await wait(600);
    await tween(this.newBg, { alpha: 1 }, { duration: 1600, ease: ease.inOutSine });
    const o = { v: 0.15 };
    void tween(o, { v: 0.5 }, { duration: 1500, onUpdate: () => this.newBg.setRestore(o.v) });
    sfx.chime();
    this.fx.burst(this.game.W / 2, this.game.H * 0.4, { count: 50, speed: 1.5 });
    await tween(this.title, { alpha: 1 }, { duration: 500 });
    await voice.sayNow(vid.ko(`chapter.${this.chapter}`));
    await wait(500);
    this.check();
    await nav.arrival(this);
  }
  override update(dt: number) {
    super.update(dt);
    this.newBg.update(dt);
  }
}

/** A quick rehearsal card view is served by the regular sentence train (review: all). */
export function specialFor(game: GameApp, plan: StationPlan, index: number): Scene {
  if (plan.kind === 'chant') return new ChantScene(game, plan, index);
  if (plan.kind === 'medley') return new MedleyScene(game, plan, index);
  return new FinaleScene(game, plan, index);
}
