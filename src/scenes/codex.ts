/** 친구 도감: 30 slots; met friends greet in English when tapped and show their 5 words. */
import { Container, Graphics, Text } from 'pixi.js';
import { friends, getDay, getWord } from '../core/content';
import { vid } from '../core/voice-ids';
import { FriendSprite } from '../art/friends';
import { C, FONT_EN } from '../art/palette';
import { makePicture } from '../art/pictures';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Scene } from '../engine/scene';
import { ease, tween } from '../engine/tween';
import { Button, Card, earButton, homeButton } from '../engine/ui';
import { nav } from '../flow';
import { store } from '../state';
import { sfx } from '../audio/sfx';

export class CodexScene extends Scene {
  private bg = new Graphics();
  private grid = new Container();
  private slots: { c: Container; sprite: FriendSprite | null }[] = [];
  private home: Button;
  private ear: Button;
  private detail: Container | null = null;
  private detailSprite: FriendSprite | null = null;

  constructor(game: GameApp) {
    super(game);
    this.home = homeButton(() => void nav.hub(this));
    this.ear = earButton(() => void voice.sayNow(vid.ko('codex.go')));
    const met = new Set(store.save.friendsMet);
    for (const f of friends) {
      const c = new Container();
      const g = new Graphics();
      g.roundRect(-70, -70, 140, 140, 28)
        .fill({ color: 0xffffff, alpha: met.has(f.id) ? 0.2 : 0.07 })
        .stroke({ width: 4, color: met.has(f.id) ? C.gold : 0x5a6399 });
      c.addChild(g);
      let sprite: FriendSprite | null = null;
      if (met.has(f.id)) {
        sprite = new FriendSprite(f, 110);
        c.addChild(sprite);
        c.eventMode = 'static';
        c.cursor = 'pointer';
        c.on('pointertap', () => this.open(f.id));
      } else {
        const q = new Text({
          text: String(f.day),
          style: { fontFamily: FONT_EN, fontSize: 44, fontWeight: '800', fill: 0x5a6399 },
        });
        q.anchor.set(0.5);
        c.addChild(q);
      }
      this.slots.push({ c, sprite });
      this.grid.addChild(c);
    }
    this.addChild(this.bg, this.grid, this.home, this.ear);
  }

  layout(w: number, h: number) {
    this.bg.clear().rect(0, 0, w, h).fill(C.indigo);
    this.home.position.set(w - 90, 90);
    this.ear.position.set(90, 90);
    const cols = w > h ? 10 : 5;
    const rows = Math.ceil(30 / cols);
    const cell = Math.min((w - 40) / cols, (h - 200) / rows);
    const s = Math.min(1, cell / 150);
    this.slots.forEach((sl, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      sl.c.position.set(
        w / 2 + (c - (cols - 1) / 2) * cell,
        190 + (h - 200) / 2 + (r - (rows - 1) / 2) * cell - 20,
      );
      sl.c.scale.set(s);
    });
    this.detail?.position.set(w / 2, h / 2);
  }

  async start() {
    await voice.sayNow(vid.ko('codex.go'));
  }

  private open(id: string) {
    this.detail?.destroy({ children: true });
    const f = friends.find((x) => x.id === id)!;
    const d = new Container();
    const shade = new Graphics();
    shade.rect(-3000, -3000, 6000, 6000).fill({ color: 0x000000, alpha: 0.5 });
    shade.eventMode = 'static';
    shade.on('pointertap', () => this.closeDetail());
    const panel = new Graphics();
    const w = Math.min(this.game.W - 40, 900);
    panel
      .roundRect(-w / 2, -300, w, 600, 40)
      .fill(C.cream)
      .stroke({ width: 8, color: C.gold });
    const sp = new FriendSprite(f, 220);
    sp.position.set(0, -140);
    sp.eventMode = 'static';
    sp.on('pointertap', () => this.greet(sp, id));
    const name = new Text({
      text: f.name,
      style: { fontFamily: FONT_EN, fontSize: 48, fontWeight: '800', fill: C.indigo },
    });
    name.anchor.set(0.5);
    name.y = -10;
    d.addChild(shade, panel, sp, name);
    const ws = getDay(f.day).words;
    const cw = Math.min(150, (w - 60) / 5);
    ws.forEach((wid, i) => {
      const c = new Card(cw - 12, cw - 12);
      c.addChild(makePicture(getWord(wid).pic, cw - 24));
      c.position.set((i - 2) * cw, 130);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => void voice.sayNow(vid.word(wid)));
      d.addChild(c);
    });
    const close = new Button({
      icon: '✖️',
      size: 120,
      color: C.cream,
      onTap: () => this.closeDetail(),
      a11y: '닫기',
    });
    close.position.set(w / 2 - 50, -250);
    d.addChild(close);
    d.position.set(this.game.W / 2, this.game.H / 2);
    d.scale.set(0.6);
    this.detail = d;
    this.detailSprite = sp;
    this.addChild(d);
    void tween(d.scale, { x: 1, y: 1 }, { duration: 320, ease: ease.outBack });
    this.greet(sp, id);
  }

  private greet(sp: FriendSprite, id: string) {
    sfx.pop();
    sp.hop();
    sp.talk(2000);
    void voice.sayNow(vid.greet(id));
  }

  private closeDetail() {
    this.detail?.destroy({ children: true });
    this.detail = null;
    this.detailSprite = null;
    voice.cancel();
  }

  override update(dt: number) {
    for (const s of this.slots) s.sprite?.update(dt);
    this.detailSprite?.update(dt);
  }

  override stop() {
    voice.cancel();
  }
}
