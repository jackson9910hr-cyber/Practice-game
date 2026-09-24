/**
 * 별빛 심기 + 잘 자 인사: plant the day's starlight (friend moves in, a constellation star lights),
 * recall 3 English words, "정원이 잠들 시간이야. Good night!", tomorrow's friend silhouette + first sound.
 */
import { Container, Graphics } from 'pixi.js';
import { LAST_DAY, chapterOf, getDay, getFriend, getLetter, getWord } from '../core/content';
import { exposeWords } from '../core/answers';
import { recapWords } from '../core/rounds';
import { curriculumDay, markToday, secondsLeft } from '../core/progress';
import { vid } from '../core/voice-ids';
import { GardenBackground } from '../art/backgrounds';
import { Fairy } from '../art/fairy';
import { FriendSprite } from '../art/friends';
import { C } from '../art/palette';
import { makePicture } from '../art/pictures';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Fx } from '../engine/fx';
import { Scene } from '../engine/scene';
import { ease, tween, wait } from '../engine/tween';
import { Button, Card } from '../engine/ui';
import { nav } from '../flow';
import { store } from '../state';
import { restoreLevel } from './hub';

export class GoodnightScene extends Scene {
  private bg: GardenBackground;
  private fairy = new Fairy(190);
  private friend: FriendSprite;
  private fx: Fx;
  private night = new Graphics();
  private sky = new Container();
  private stage = new Container();
  private day: number;

  constructor(
    game: GameApp,
    private reason: 'done' | 'time',
  ) {
    super(game);
    this.day = curriculumDay(store.save);
    this.bg = new GardenBackground(chapterOf(this.day).key, restoreLevel());
    this.friend = new FriendSprite(getFriend(getDay(this.day).friend), 200);
    this.fx = new Fx(game);
    this.night.alpha = 0;
    this.addChild(this.bg, this.sky, this.friend, this.fairy, this.night, this.stage, this.fx);
  }

  layout(w: number, h: number) {
    this.bg.layout(w, h);
    this.night.clear().rect(0, 0, w, h).fill(0x0b1030);
    this.fairy.position.set(w / 2, h * 0.5);
    this.friend.position.set(w * 0.75, h * 0.78);
    this.stage.position.set(w / 2, h * 0.52);
    this.drawConstellation(w, h);
  }

  private drawConstellation(w: number, _h: number) {
    this.sky.removeChildren().forEach((c) => c.destroy());
    const lit = Math.min(store.save.friendsMet.length, LAST_DAY);
    const g = new Graphics();
    const pts: [number, number][] = [];
    for (let i = 0; i < 30; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      pts.push([w * (0.1 + col * 0.09), 60 + row * 55 + Math.sin(i * 1.7) * 14]);
    }
    for (let i = 1; i < lit; i++)
      g.moveTo(...pts[i - 1]!)
        .lineTo(...pts[i]!)
        .stroke({ width: 3, color: C.gold, alpha: 0.5 });
    pts.forEach(([x, y], i) =>
      g
        .star(x, y, 5, i < lit ? 13 : 7, i < lit ? 6 : 3)
        .fill(i < lit ? C.gold : { color: 0xffffff, alpha: 0.3 }),
    );
    this.sky.addChild(g);
  }

  async start() {
    const t = store.save.today;
    if (t && !t.planted) await this.plant();
    await this.sayGoodnight();
  }

  private async plant() {
    music.play(chapterOf(this.day).key);
    await voice.sayNow(vid.ko('plant.go'));
    this.fairy.eventMode = 'static';
    this.fairy.cursor = 'pointer';
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 9000);
      this.fairy.once('pointertap', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.check();
    sfx.plant();
    for (let i = 0; i < 6; i++) {
      this.fx.burst(this.fairy.x, this.fairy.y, { count: 14, up: true, speed: 1.2 });
      await wait(120);
    }
    await tween(
      this.fairy,
      { x: this.friend.x - 150, y: this.friend.y - 120 },
      { duration: 700, ease: ease.inOutSine },
    );
    this.fx.burst(this.friend.x, this.friend.y, {
      kind: 'petal',
      count: 30,
      colors: [C.pink, C.gold, C.mint],
    });
    store.update((s) => markToday(s, { planted: true }));
    const from = restoreLevel() - 0.12;
    const to = restoreLevel();
    const o = { v: from };
    await tween(o, { v: to }, { duration: 900, onUpdate: () => this.bg.setRestore(o.v) });
    this.friend.hop();
    this.drawConstellation(this.game.W, this.game.H);
    sfx.chime();
    await voice.say(vid.ko('plant.done'));
    await tween(this.fairy, { x: this.game.W * 0.18, y: this.game.H * 0.66 }, { duration: 600 });
  }

  private async sayGoodnight() {
    music.play('night');
    void tween(this.fairy, { x: this.game.W * 0.18, y: this.game.H * 0.66 }, { duration: 600 });
    await tween(this.night, { alpha: 0.45 }, { duration: 1200 });
    const pick = recapWords(store.save, this.day);
    store.update((s) => exposeWords(s, pick, this.day));
    await voice.sayNow(vid.ko('goodnight.review'));
    for (const [i, id] of pick.entries()) {
      this.check();
      const c = new Card(200, 200);
      c.addChild(makePicture(getWord(id).pic, 180));
      c.x = (i - (pick.length - 1) / 2) * Math.min(240, (this.game.W - 60) / pick.length);
      const target = pick.length > 3 ? Math.min(1, (this.game.W - 80) / pick.length / 220) : 1;
      c.scale.set(0);
      this.stage.addChild(c);
      await tween(c.scale, { x: target, y: target }, { duration: 380, ease: ease.outBack });
      this.fairy.talk(900);
      await voice.say(vid.word(id));
      await wait(700);
    }
    await wait(400);
    await tween(this.stage, { alpha: 0 }, { duration: 500 });
    this.stage.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.stage.alpha = 1;
    await voice.say(vid.ko('goodnight.sleep'));
    await voice.say(vid.en('misc.goodnight'));
    await tween(this.night, { alpha: 0.65 }, { duration: 1000 });
    this.check();
    if (this.day < LAST_DAY) await this.teaseTomorrow();
    store.update((s) => markToday(s, { goodnight: true }));
    await store.flush();
    await voice.say(vid.ko('goodnight.bye'));
    if (this.reason === 'done' && secondsLeft(store.save) > 60) {
      const back = new Button({
        icon: '🏡',
        size: 140,
        color: C.cream,
        onTap: () => void nav.hub(this),
        a11y: '정원으로',
      });
      back.position.set(this.game.W - 110, this.game.H - 110);
      this.addChild(back);
    }
  }

  private async teaseTomorrow() {
    const next = getDay(this.day + 1);
    const f = new FriendSprite(getFriend(next.friend), 220);
    f.tint = 0x1b1b2f;
    f.alpha = 0.9;
    f.scale.set(0);
    this.stage.addChild(f);
    await tween(f.scale, { x: 1, y: 1 }, { duration: 500, ease: ease.outBack });
    const l = next.letters[0];
    if (l) {
      await voice.say(vid.ko('goodnight.tomorrow'));
      await voice.say(vid.phoneme(l));
      await voice.say(vid.pic(getLetter(l).keyword));
    }
    await wait(600);
  }

  override update(dt: number) {
    this.bg.update(dt);
    this.fairy.update(dt);
    this.friend.update(dt);
    this.fx.update(dt);
  }

  override stop() {
    voice.cancel();
  }
}
