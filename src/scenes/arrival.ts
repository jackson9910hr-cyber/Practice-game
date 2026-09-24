/**
 * 친구 등장: a falling star lands, the day's friend pops out, greets in English, then teaches
 * the 5 words (sound → picture → usage sentence) and the day's letter sound.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { chapterOf, getDay, getFriend, getLetter, getWord, pictureOf } from '../core/content';
import { curriculumDay, meetFriend, setStations } from '../core/progress';
import { planDay } from '../core/scheduler';
import { soundIds, vid } from '../core/voice-ids';
import { GardenBackground } from '../art/backgrounds';
import { Fairy } from '../art/fairy';
import { FriendSprite } from '../art/friends';
import { C, FONT_EN, FONT_LETTER } from '../art/palette';
import { makePicture } from '../art/pictures';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Fx } from '../engine/fx';
import { Scene } from '../engine/scene';
import { ease, tween, wait } from '../engine/tween';
import { Button, Card, earButton } from '../engine/ui';
import { nav } from '../flow';
import { store } from '../state';
import { restoreLevel } from './hub';

/** Time for a 7-year-old to repeat a word: ~1 s plus 0.45 s per syllable (rough vowel-group count). */
export function echoGap(word: string): number {
  const syl = Math.max(
    1,
    (word.toLowerCase().match(/[aeiouy]+/g) ?? []).length - (/[^aeiou]e$/.test(word) ? 1 : 0),
  );
  return 1000 + 450 * syl;
}

export class ArrivalScene extends Scene {
  private bg: GardenBackground;
  private fairy = new Fairy(150);
  private friend: FriendSprite;
  private guests: FriendSprite[] = [];
  private fx: Fx;
  private stage = new Container();
  private bubble = new Container();
  private collected: Container[] = [];
  private ear: Button;
  private lastLine = '';
  private skip: Button;
  private day: number;

  constructor(game: GameApp) {
    super(game);
    this.day = curriculumDay(store.save);
    const cd = getDay(this.day);
    this.bg = new GardenBackground(chapterOf(this.day).key, restoreLevel());
    this.friend = new FriendSprite(getFriend(cd.friend), 260);
    this.friend.visible = false;
    this.fx = new Fx(game);
    this.ear = earButton(() => this.lastLine && void voice.sayNow(this.lastLine));
    this.skip = new Button({ icon: '➡️', color: C.gold, onTap: () => this.advance?.(), a11y: '다음' });
    this.skip.visible = false;
    if (cd.party) {
      const [from] = chapterOf(this.day).days;
      for (let d = from; d < this.day; d++) {
        const g = new FriendSprite(getFriend(getDay(d).friend), 120);
        g.visible = false;
        this.guests.push(g);
      }
    }
    this.addChild(
      this.bg,
      ...this.guests,
      this.fairy,
      this.friend,
      this.stage,
      this.bubble,
      this.fx,
      this.ear,
      this.skip,
    );
  }

  private advance: (() => void) | null = null;
  private waitTap(ms: number) {
    // auto-continue after ms, or earlier with the ➡ button
    return new Promise<void>((resolve) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        this.skip.visible = false;
        this.skip.pulse(false);
        this.advance = null;
        resolve();
      };
      this.advance = fin;
      this.skip.visible = true;
      setTimeout(fin, ms + 1200);
    });
  }

  layout(w: number, h: number) {
    this.bg.layout(w, h);
    const portrait = h > w;
    this.ear.position.set(90, 90);
    this.skip.position.set(w - 100, h - 100);
    this.fairy.position.set(w * 0.15, portrait ? h * 0.2 : h * 0.3);
    this.friend.position.set(w / 2, portrait ? h * 0.36 : h * 0.4);
    this.stage.position.set(w / 2, portrait ? h * 0.62 : h * 0.66);
    this.bubble.position.set(w / 2, portrait ? h * 0.16 : h * 0.13);
    this.guests.forEach((g, i) =>
      g.position.set(w * (0.12 + (0.76 * i) / Math.max(1, this.guests.length - 1)), h * 0.86),
    );
    this.collected.forEach((c, i) => c.position.set(w / 2 + (i - 2) * 120, h - 90));
  }

  private say(id: string, who: 'friend' | 'fairy' = 'friend') {
    this.lastLine = id;
    const ms = Math.max(900, voice.textOf(id).length * 75);
    if (who === 'friend') this.friend.talk(ms);
    else this.fairy.talk(ms);
    return voice.say(id);
  }

  private showBubble(text: string, font = FONT_EN) {
    this.bubble.removeChildren().forEach((c) => c.destroy());
    const t = new Text({
      text,
      style: {
        fontFamily: font,
        fontSize: 46,
        fontWeight: '800',
        fill: C.ink,
        wordWrap: true,
        wordWrapWidth: Math.min(900, this.game.W - 120),
        align: 'center',
      },
    });
    t.anchor.set(0.5);
    const g = new Graphics();
    g.roundRect(-t.width / 2 - 36, -t.height / 2 - 24, t.width + 72, t.height + 48, 36)
      .fill(C.cream)
      .stroke({ width: 6, color: 0xffffff });
    this.bubble.addChild(g, t);
    this.bubble.scale.set(0);
    void tween(this.bubble.scale, { x: 1, y: 1 }, { duration: 350, ease: ease.outBack });
  }

  async start() {
    const cd = getDay(this.day);
    music.play(chapterOf(this.day).key);
    const s = store.save;
    const first = s.playDay === 1 && s.friendsMet.length === 0;
    await wait(400);
    if (first) await this.say(vid.ko('welcome.first'), 'fairy');
    else if (s.log.length && s.log[s.log.length - 1]!.dayKey !== s.today?.dayKey)
      await this.say(vid.ko('welcome.back'), 'fairy');
    if (cd.party) {
      await this.say(vid.ko('party.intro'), 'fairy');
      for (const g of this.guests) {
        g.visible = true;
        g.scale.set(0);
        void tween(g.scale, { x: 1, y: 1 }, { duration: 400, ease: ease.outBack });
        g.hop();
        sfx.pop();
        await wait(180);
      }
    }
    await this.say(vid.ko('friend.coming'), 'fairy');
    await this.fallingStar();
    this.showBubble(voice.textOf(vid.greet(this.friend.friend.id)));
    const fr = this.friend.friend;
    // the friend's name carries the day's first sound (Appy → /æ/): say it unless the greeting does
    if (!fr.greeting.includes(fr.name)) await this.say(vid.friendName(fr.id));
    await this.say(vid.greet(fr.id));
    this.friend.hop();
    await wait(300);
    await this.say(vid.ko('friend.words'), 'fairy');
    for (const id of cd.words) {
      this.check();
      await this.teachWord(id);
    }
    this.check();
    this.bubble.removeChildren();
    await this.teachLetters(cd.letters);
    this.check();
    store.update((x) => {
      const met = meetFriend(x);
      return met.today && met.today.stations.length === 0 ? setStations(met, planDay(met)) : met;
    });
    await this.say(vid.ko('friend.done'), 'fairy');
    void nav.hub(this);
  }

  private async fallingStar() {
    const { W } = this.game;
    const st = new Graphics();
    st.star(0, 0, 5, 40, 18).fill(C.gold);
    st.position.set(W * 0.9, -60);
    this.addChild(st);
    sfx.whoosh();
    await tween(
      st,
      { x: this.friend.x, y: this.friend.y },
      {
        duration: 1000,
        ease: ease.inQuad,
        onUpdate: () => this.fx.burst(st.x, st.y, { count: 2, kind: 'dot', speed: 0.3 }),
      },
    );
    st.destroy();
    sfx.chime();
    this.fx.burst(this.friend.x, this.friend.y, { count: 40, speed: 1.4 });
    this.friend.visible = true;
    this.friend.scale.set(0.01);
    const target = 260 / 220;
    await tween(this.friend.scale, { x: target, y: target }, { duration: 600, ease: ease.outElastic });
    this.friend.hop();
  }

  private async teachWord(id: string) {
    this.check();
    const w = getWord(id);
    this.stage.removeChildren().forEach((c) => c.destroy({ children: true }));
    const card = new Card(300, 330);
    const pic = makePicture(w.pic, 240);
    pic.y = -30;
    const label = new Text({
      text: w.en,
      style: { fontFamily: FONT_EN, fontSize: 54, fontWeight: '800', fill: C.ink },
    });
    label.anchor.set(0.5);
    label.y = 120;
    card.addChild(pic, label);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    // queued, not interrupting: tapping never skips the rest of the lesson
    card.on('pointertap', () => void voice.say(vid.word(id)));
    this.stage.addChild(card);
    card.scale.set(0);
    await tween(card.scale, { x: 1, y: 1 }, { duration: 420, ease: ease.outBack });
    this.showBubble(w.sentence);
    await this.say(vid.word(id));
    await wait(echoGap(w.en)); // echo gap: child repeats (longer for longer words)
    await this.say(vid.word(id));
    await wait(250);
    await this.say(vid.wordSentence(id));
    await this.waitTap(1600);
    // fly to the collected row
    const mini = new Card(100, 100);
    mini.addChild(makePicture(w.pic, 90));
    const gp = this.toLocal(card.getGlobalPosition());
    mini.position.set(gp.x, gp.y);
    this.addChild(mini);
    this.collected.push(mini);
    card.visible = false;
    sfx.pop();
    const i = this.collected.length - 1;
    await tween(
      mini,
      { x: this.game.W / 2 + (i - 2) * 120, y: this.game.H - 90 },
      { duration: 450, ease: ease.outQuad },
    );
  }

  private async teachLetters(letters: string[]) {
    for (const l of letters) {
      const L = getLetter(l);
      this.stage.removeChildren().forEach((c) => c.destroy({ children: true }));
      const card = new Card(420, 300, C.cream);
      const big = new Text({
        text: `${l.toUpperCase()} ${l}`,
        style: { fontFamily: FONT_LETTER, fontSize: 150, fontWeight: '800', fill: C.indigo },
      });
      big.anchor.set(0.5);
      big.x = -60;
      const pic = makePicture(pictureOf(L.keyword), 150);
      pic.x = 130;
      card.addChild(big, pic);
      this.stage.addChild(card);
      card.scale.set(0);
      await tween(card.scale, { x: 1, y: 1 }, { duration: 420, ease: ease.outBack });
      this.showBubble(`${l.toUpperCase()}  ·  ${L.keyword}`);
      const sound = soundIds(l, L.keyword, (id) => voice.recorded(id));
      await this.say(vid.letter(l));
      for (const id of sound) await this.say(id);
      await wait(900);
      for (const id of sound) await this.say(id);
      await this.waitTap(1400);
    }
  }

  override update(dt: number) {
    this.bg.update(dt);
    this.fairy.update(dt);
    this.friend.update(dt);
    for (const g of this.guests) g.update(dt);
    this.fx.update(dt);
  }

  override stop() {
    voice.cancel();
  }
}
