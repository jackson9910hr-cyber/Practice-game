/** 정원 허브: today's path of stations, friends living in the garden, starlight, codex, parent corner. */
import { Container, Graphics, Text } from 'pixi.js';
import { chapterOf, getDay, getFriend } from '../core/content';
import { curriculumDay, secondsLeft, spendStarlight } from '../core/progress';
import { hasFeature } from '../core/unlocks';
import type { StationPlan } from '../core/types';
import { vid } from '../core/voice-ids';
import { GardenBackground } from '../art/backgrounds';
import { Fairy } from '../art/fairy';
import { FriendSprite } from '../art/friends';
import { C, FONT_EN } from '../art/palette';
import { emojiText } from '../art/pictures';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Scene } from '../engine/scene';
import { ease, tween, wait } from '../engine/tween';
import { Button, earButton } from '../engine/ui';
import { Fx } from '../engine/fx';
import { nav } from '../flow';
import { store } from '../state';
import { openParent } from '../ui/parent';
import { DECORATIONS, stationIcon } from './icons';

export function restoreLevel(): number {
  const s = store.save;
  const day = curriculumDay(s);
  const [from, to] = chapterOf(day).days;
  const done = day - from + (s.today?.planted ? 1 : 0);
  return Math.min(1, 0.15 + (0.85 * done) / (to - from + 1));
}

export class HubScene extends Scene {
  private bg: GardenBackground;
  private fairy = new Fairy(170);
  private stones: Button[] = [];
  private moon!: Button;
  private path = new Graphics();
  private friendsLayer = new Container();
  private sprites: FriendSprite[] = [];
  private ear: Button;
  private gear: Button;
  private codex: Button;
  private deco: Button | null = null;
  private star = new Container();
  private starText: Text;
  private fx: Fx;
  private decoLayer = new Container();
  private decoSlots: Container[] = [];
  private sleeping = false;
  private instruction = vid.ko('hub.go');
  private unsub: () => void;

  constructor(game: GameApp) {
    super(game);
    const day = curriculumDay(store.save);
    this.bg = new GardenBackground(chapterOf(day).key, restoreLevel());
    this.fx = new Fx(game);
    this.ear = earButton(() => void voice.sayNow(this.instruction));
    this.gear = new Button({ icon: '⚙️', color: C.cream, onTap: () => openParent(), a11y: '보호자 메뉴' });
    this.gear.alpha = 0.8;
    this.codex = new Button({
      icon: '📖',
      color: C.cream,
      onTap: () => void nav.codex(this),
      a11y: '친구 도감',
    });
    if (hasFeature(day, 'decorate'))
      this.deco = new Button({
        icon: '🎨',
        color: C.cream,
        onTap: () => this.toggleDecorate(),
        a11y: '정원 꾸미기',
      });
    const sBg = new Graphics();
    sBg.roundRect(-110, -42, 220, 84, 42).fill({ color: 0x000000, alpha: 0.25 });
    this.starText = new Text({
      text: '0',
      style: { fontFamily: FONT_EN, fontSize: 48, fontWeight: '800', fill: C.gold },
    });
    this.starText.anchor.set(0, 0.5);
    this.starText.x = -20;
    const si = emojiText('✨', 52);
    si.x = -60;
    this.star.addChild(sBg, si, this.starText);
    this.addChild(this.bg, this.path, this.decoLayer, this.friendsLayer, this.fairy);
    this.buildStations();
    this.buildFriends();
    this.buildDecorations();
    this.addChild(this.ear, this.gear, this.codex, this.star, this.fx);
    if (this.deco) this.addChild(this.deco);
    this.unsub = store.subscribe((s) => (this.starText.text = String(s.starlight)));
    this.starText.text = String(store.save.starlight);
  }

  private get plan(): StationPlan[] {
    return store.save.today?.stations ?? [];
  }

  private buildStations() {
    const done = store.save.today?.stationsDone ?? 0;
    const all = done >= this.plan.length;
    this.plan.forEach((p, i) => {
      const state = i < done ? 'done' : i === done ? 'next' : 'later';
      const b = new Button({
        icon: stationIcon(p),
        size: 140,
        color: state === 'done' ? C.gold : state === 'next' ? C.cream : 0x8a93b8,
        onTap: () => this.enterStation(i, p),
        a11y: `놀이 ${i + 1}`,
      });
      if (state === 'later' && !all) b.enabled = false;
      if (state === 'done') {
        const ck = emojiText('✅', 44);
        ck.position.set(50, -50);
        b.addChild(ck);
      }
      if (state === 'next') b.pulse(true);
      this.stones.push(b);
      this.addChild(b);
    });
    this.moon = new Button({
      icon: '🌙',
      size: 140,
      color: all ? C.cream : 0x8a93b8,
      onTap: () => void nav.goodnight('done', this),
      a11y: '잘 자기',
    });
    this.moon.enabled = all;
    if (all && !store.save.today?.planted) this.moon.pulse(true);
    this.addChild(this.moon);
  }

  private buildFriends() {
    const day = curriculumDay(store.save);
    const [from] = chapterOf(day).days;
    const met = store.save.friendsMet.map(getFriend).filter((f) => f.day >= from || day > 30);
    const show = met.slice(-9);
    for (const f of show) {
      const sp = new FriendSprite(f, 120);
      sp.eventMode = 'static';
      sp.cursor = 'pointer';
      sp.on('pointertap', () => {
        sp.hop();
        sfx.pop();
        voice.cancel();
        void voice.say(vid.greet(f.id)).then(() => undefined);
        sp.talk(1800);
      });
      this.sprites.push(sp);
      this.friendsLayer.addChild(sp);
    }
  }

  private buildDecorations() {
    this.decoLayer.removeChildren();
    this.decoSlots = [];
    for (let i = 0; i < 4; i++) {
      const slot = new Container();
      const item = store.save.decorations[`slot${i}`];
      const d = DECORATIONS.find((x) => x.id === item);
      if (d) slot.addChild(emojiText(d.icon, 90));
      this.decoSlots.push(slot);
      this.decoLayer.addChild(slot);
    }
  }

  private decorating = false;
  private picker: Container | null = null;

  private toggleDecorate() {
    this.decorating = !this.decorating;
    this.picker?.destroy({ children: true });
    this.picker = null;
    this.decoSlots.forEach((slot, i) => {
      slot.removeChildren().forEach((c) => c.destroy());
      const item = DECORATIONS.find((x) => x.id === store.save.decorations[`slot${i}`]);
      if (item) slot.addChild(emojiText(item.icon, 90));
      if (this.decorating) {
        const ring = new Graphics();
        ring.circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.2 }).stroke({ width: 5, color: C.gold });
        slot.addChildAt(ring, 0);
        slot.eventMode = 'static';
        slot.cursor = 'pointer';
        slot.removeAllListeners();
        slot.on('pointertap', () => this.openPicker(i));
      } else slot.eventMode = 'none';
    });
    if (this.decorating) void voice.sayNow(vid.ko('decorate.go'));
  }

  private openPicker(slotIndex: number) {
    this.picker?.destroy({ children: true });
    const p = new Container();
    const bg = new Graphics();
    const w = Math.min(this.game.W - 40, DECORATIONS.length * 150 + 40);
    bg.roundRect(-w / 2, -110, w, 220, 40)
      .fill({ color: C.indigo, alpha: 0.95 })
      .stroke({ width: 5, color: C.gold });
    p.addChild(bg);
    DECORATIONS.forEach((d, i) => {
      const b = new Button({
        icon: d.icon,
        size: 125,
        color: store.save.starlight >= d.price ? C.cream : 0x8a93b8,
        onTap: () => {
          const next = spendStarlight(store.save, d.price);
          if (!next) {
            void voice.sayNow(vid.ko('decorate.need'));
            return;
          }
          store.update(() => ({ ...next, decorations: { ...next.decorations, [`slot${slotIndex}`]: d.id } }));
          sfx.plant();
          const s = this.decoSlots[slotIndex]!;
          this.fx.burst(s.x, s.y, { kind: 'petal' });
          this.decorating = true;
          this.toggleDecorate();
        },
        a11y: d.id,
      });
      const price = new Text({
        text: `✨${d.price}`,
        style: { fontFamily: FONT_EN, fontSize: 30, fontWeight: '800', fill: C.gold },
      });
      price.anchor.set(0.5);
      price.y = 80;
      b.addChild(price);
      b.x = (i - (DECORATIONS.length - 1) / 2) * 140 * Math.min(1, (w - 40) / (DECORATIONS.length * 140));
      b.scale.set(Math.min(1, (w - 40) / (DECORATIONS.length * 140)));
      p.addChild(b);
    });
    p.position.set(this.game.W / 2, this.game.H / 2);
    this.picker = p;
    this.addChild(p);
    void tween(p.scale, { x: 1, y: 1 }, { duration: 300, ease: ease.outBack });
  }

  layout(w: number, h: number) {
    this.bg.layout(w, h);
    this.ear.position.set(90, 90);
    this.gear.position.set(w - 90, 90);
    this.star.position.set(w / 2, 80);
    this.codex.position.set(90, h - 100);
    this.deco?.position.set(w - 90, h - 100);
    const portrait = h > w;
    const n = this.stones.length + 1;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      if (portrait) pts.push({ x: w * (i === 0 ? 0.5 : i % 2 ? 0.7 : 0.32), y: h * (0.22 + 0.5 * t) });
      else
        pts.push({ x: w * (0.2 + 0.62 * t), y: h * (0.46 - Math.sin(t * Math.PI) * 0.14 + (i % 2) * 0.06) });
    }
    this.path.clear();
    pts.forEach((p, i) => {
      if (i === 0) this.path.moveTo(p.x, p.y);
      else this.path.lineTo(p.x, p.y);
    });
    this.path.stroke({ width: 26, color: 0xffffff, alpha: 0.18, cap: 'round', join: 'round' });
    this.stones.forEach((s, i) => s.position.set(pts[i]!.x, pts[i]!.y));
    this.moon.position.set(pts[n - 1]!.x, pts[n - 1]!.y);
    this.fairy.position.set(portrait ? w * 0.14 : w * 0.08, portrait ? h * 0.46 : h * 0.45);
    const fy = h * 0.88;
    this.sprites.forEach((s, i) => {
      const k = this.sprites.length === 1 ? 0.5 : i / (this.sprites.length - 1);
      s.position.set(w * (0.2 + 0.6 * k), fy - (i % 2) * 40);
    });
    const slotPos = portrait
      ? [
          [w * 0.12, h * 0.6],
          [w * 0.88, h * 0.5],
          [w * 0.12, h * 0.36],
          [w * 0.88, h * 0.72],
        ]
      : [
          [w * 0.3, h * 0.74],
          [w * 0.7, h * 0.74],
          [w * 0.5, h * 0.7],
          [w * 0.9, h * 0.66],
        ];
    this.decoSlots.forEach((s, i) => s.position.set(slotPos[i]![0]!, slotPos[i]![1]!));
    if (this.picker) this.picker.position.set(w / 2, h / 2);
  }

  async start() {
    const s = store.save;
    music.play(chapterOf(curriculumDay(s)).key);
    const t = s.today!;
    const all = t.stationsDone >= this.plan.length;
    if (secondsLeft(s) <= 0) {
      if (!t.goodnight) return void nav.goodnight('time', this);
      return this.sleep();
    }
    if (!all) this.instruction = vid.ko(t.stationsDone === 0 ? 'hub.go' : 'hub.next');
    else if (!t.planted) this.instruction = vid.ko('hub.allDone');
    else this.instruction = vid.ko('hub.free');
    await wait(300);
    this.fairy.talk(1500);
    await voice.sayNow(this.instruction);
  }

  private sleep() {
    this.sleeping = true;
    this.stones.forEach((s) => (s.enabled = false));
    this.moon.enabled = false;
    const shade = new Graphics();
    shade.rect(0, 0, 4000, 4000).fill({ color: 0x0b1030, alpha: 0.55 });
    shade.eventMode = 'none';
    this.addChildAt(shade, this.getChildIndex(this.friendsLayer) + 1);
    const z = emojiText('💤', 90);
    z.position.set(this.fairy.x + 60, this.fairy.y - 80);
    this.addChild(z);
    void voice.sayNow(vid.ko('limitReached')).then(() => voice.say(vid.en('misc.goodnight')));
  }

  private enterStation(i: number, p: StationPlan) {
    if (this.sleeping) return;
    voice.cancel();
    void nav.station(i, p, this);
  }

  override update(dt: number) {
    this.bg.update(dt);
    this.fairy.update(dt);
    this.fx.update(dt);
    for (const s of this.sprites) s.update(dt);
  }

  override stop() {
    this.unsub();
    voice.cancel();
  }
}

/** Friend of a day, for arrival/goodnight scenes. */
export function friendOfDay(day: number) {
  return getFriend(getDay(day).friend);
}
