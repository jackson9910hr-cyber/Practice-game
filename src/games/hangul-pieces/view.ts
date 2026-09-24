/** 한글 조각 view: drag consonant/vowel pieces into the syllable block slots. */
import { Container, Graphics, Text } from 'pixi.js';
import type { StationPlan } from '../../core/types';
import { vid } from '../../core/voice-ids';
import { C, FONT_KO } from '../../art/palette';
import { makePicture } from '../../art/pictures';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { makeDraggable } from '../../engine/drag';
import { tween, wait } from '../../engine/tween';
import { Card } from '../../engine/ui';
import { GameBase } from '../base';
import { bounce, helpingHand, hintRing, popIn } from '../common';
import {
  isVerticalVowel,
  makeHangulRound,
  slotsOf,
  type HangulQuestion,
  type HangulSyllable,
  type Piece,
  type SlotKind,
} from './logic';

const BLOCK = 210;

interface Slot {
  syl: HangulSyllable;
  kind: SlotKind;
  box: Container;
  filled: boolean;
  w: number;
  h: number;
}

function slotRects(s: HangulSyllable): Record<string, [number, number, number, number]> {
  const v = isVerticalVowel(s.jamo.jung);
  if (!s.jamo.jong) {
    return v
      ? { cho: [-48, 0, 96, 176], jung: [52, 0, 84, 176] }
      : { cho: [0, -48, 176, 96], jung: [0, 52, 176, 84] };
  }
  return v
    ? { cho: [-48, -42, 96, 104], jung: [52, -42, 84, 104], jong: [0, 62, 176, 70] }
    : { cho: [0, -62, 176, 62], jung: [0, 4, 176, 56], jong: [0, 70, 176, 56] };
}

export class HangulView extends GameBase<'hangul-pieces'> {
  private qs: HangulQuestion[] = [];
  private qi = 0;
  private blocks: Container[] = [];
  private slots: Slot[] = [];
  private tiles: { c: Container; piece: Piece; used: boolean }[] = [];
  private pic: Container | null = null;
  private model: Text | null = null;

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'hangul-pieces', plan, index);
  }

  async start() {
    this.qs = makeHangulRound(this.mode, this.params, this.rng);
    this.setTotal(this.qs.length);
    await this.instruct([vid.ko(this.mode <= 1 ? 'hangul.1' : 'hangul.2')]);
    await this.show();
  }

  private clear() {
    for (const b of this.blocks) b.destroy({ children: true });
    for (const t of this.tiles) t.c.destroy({ children: true });
    this.pic?.destroy({ children: true });
    this.model?.destroy();
    this.blocks = [];
    this.tiles = [];
    this.slots = [];
    this.pic = null;
    this.model = null;
  }

  private async show() {
    this.clear();
    const q = this.qs[this.qi]!;
    if (q.pic) {
      const card = new Card(220, 220);
      card.addChild(makePicture(q.pic, 200));
      card.eventMode = 'static';
      card.on('pointertap', () => void voice.sayNow(vid.hangul(q.word)));
      this.pic = card;
      this.layer.addChild(card);
      void popIn(card);
    } else if (this.params.ghost) {
      this.model = new Text({
        text: q.word,
        style: { fontFamily: FONT_KO, fontSize: 90, fontWeight: '800', fill: 0xffffff },
      });
      this.model.anchor.set(0.5);
      this.model.alpha = 0.35;
      this.layer.addChild(this.model);
    }
    for (const s of q.syllables) {
      const b = new Container();
      const bg = new Graphics();
      bg.roundRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 28)
        .fill(C.cream)
        .stroke({ width: 6, color: s.blank ? C.gold : 0xffffff });
      b.addChild(bg);
      if (!s.blank) {
        b.addChild(this.glyph(s.text, 150, C.ink));
      } else {
        const rects = slotRects(s);
        for (const kind of slotsOf(s)) {
          const [x, y, w, h] = rects[kind]!;
          const box = new Container();
          const g = new Graphics();
          g.roundRect(-w / 2, -h / 2, w, h, 16)
            .fill({ color: kind === 'jung' ? C.sky : C.pink, alpha: 0.18 })
            .stroke({ width: 4, color: kind === 'jung' ? C.sky : C.pink });
          box.addChild(g);
          if (this.params.ghost) {
            const gh = this.glyph(s.jamo[kind], Math.min(w, h) * 0.8, C.ink);
            gh.alpha = 0.18;
            box.addChild(gh);
          }
          box.position.set(x, y);
          b.addChild(box);
          this.slots.push({ syl: s, kind, box, filled: false, w, h });
        }
      }
      this.layer.addChild(b);
      this.blocks.push(b);
      void popIn(b, 100);
    }
    q.pieces.forEach((p, i) => {
      const c = new Container();
      const g = new Graphics();
      const col = p.kind === 'vowel' ? C.sky : C.pink;
      g.roundRect(-62, -62 + 6, 124, 124, 24).fill({ color: 0, alpha: 0.18 });
      g.roundRect(-62, -62, 124, 124, 24).fill(col).stroke({ width: 5, color: 0xffffff });
      c.addChild(g, this.glyph(p.jamo, 86, C.ink));
      const tile = { c, piece: p, used: false };
      this.tiles.push(tile);
      this.layer.addChild(c);
      void popIn(c, 200 + i * 60);
      makeDraggable(this.game, c, { onDrop: (gp) => this.drop(tile, gp) });
    });
    this.layoutGame(this.game.W, this.game.H);
    await wait(300);
    await voice.say(vid.hangul(q.word));
  }

  private glyph(t: string, size: number, color: number) {
    const x = new Text({
      text: t,
      style: { fontFamily: FONT_KO, fontSize: size, fontWeight: '800', fill: color },
    });
    x.anchor.set(0.5);
    return x;
  }

  protected layoutGame(w: number, h: number) {
    const portrait = h > w;
    const n = this.blocks.length;
    const rowY = portrait ? h * 0.42 : h * 0.4;
    const s = Math.min(1, (w - 80) / (n * (BLOCK + 24) + (this.pic && !portrait ? 260 : 0)));
    let startX = w / 2 - ((n - 1) * (BLOCK + 24) * s) / 2;
    if (this.pic) {
      if (portrait) this.pic.position.set(w / 2, h * 0.2);
      else {
        startX += 130 * s;
        this.pic.position.set(startX - (BLOCK / 2 + 150) * s, rowY);
      }
      this.pic.scale.set(s);
    }
    this.model?.position.set(w / 2, portrait ? h * 0.22 : h * 0.2);
    this.blocks.forEach((b, i) => {
      b.position.set(startX + i * (BLOCK + 24) * s, rowY);
      b.scale.set(s);
    });
    const unused = this.tiles.filter((t) => !t.used);
    const perRow = Math.max(1, Math.floor((w - 40) / 150));
    unused.forEach((t, i) => {
      const r = Math.floor(i / perRow);
      const inRow = Math.min(perRow, unused.length - r * perRow);
      const x = w / 2 + ((i % perRow) - (inRow - 1) / 2) * 150;
      const y = (portrait ? h * 0.72 : h * 0.76) + r * 150;
      t.c.position.set(x, y);
    });
  }

  private nearestSlot(gx: number, gy: number): Slot | null {
    let best: Slot | null = null;
    let bd = Infinity;
    for (const s of this.slots) {
      if (s.filled) continue;
      const p = s.box.getGlobalPosition();
      const d = Math.hypot(p.x - gx, p.y - gy);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    // forgiving: 96 CSS px + half the slot size
    return best && bd <= 96 + (Math.max(best.w, best.h) * this.game.scale) / 2 ? best : null;
  }

  private drop(tile: { c: Container; piece: Piece; used: boolean }, gp: { x: number; y: number }): boolean {
    if (this.busy) return false;
    const slot = this.nearestSlot(gp.x, gp.y);
    if (!slot) return false;
    // accept into ANY empty slot of that syllable that this piece fits (kids needn't be exact)
    const fitting = this.slots.find(
      (s) => !s.filled && s.syl === slot.syl && s.syl.jamo[s.kind] === tile.piece.jamo,
    );
    if (!fitting) {
      void this.wrong();
      return false;
    }
    void this.place(tile, fitting);
    return true;
  }

  private async place(tile: { c: Container; piece: Piece; used: boolean }, slot: Slot) {
    this.busy = true;
    tile.used = true;
    slot.filled = true;
    sfx.snap();
    const p = slot.box.getGlobalPosition();
    const local = this.layer.toLocal(p);
    const block = slot.box.parent!;
    const s = Math.min(slot.w, slot.h) / 124;
    await tween(tile.c, { x: local.x, y: local.y }, { duration: 180 });
    await tween(tile.c.scale, { x: s * block.scale.x, y: s * block.scale.y }, { duration: 120 });
    const sylDone = this.slots.filter((x) => x.syl === slot.syl).every((x) => x.filled);
    if (sylDone) await this.completeSyllable(slot.syl, block);
    this.busy = false;
    if (this.slots.every((x) => x.filled)) await this.completeWord();
  }

  private async completeSyllable(syl: HangulSyllable, block: Container) {
    const mine = this.tiles.filter((t) => t.used && t.c.visible && this.slots.some((s) => s.syl === syl));
    await wait(150);
    for (const t of mine) {
      const d = Math.hypot(t.c.x - block.x, t.c.y - block.y);
      if (d < BLOCK) void tween(t.c, { alpha: 0 }, { duration: 200 }).then(() => (t.c.visible = false));
    }
    const g = this.glyph(syl.text, 150, C.ink);
    block.addChild(g);
    await popIn(g);
    void bounce(block);
    await voice.say(vid.hangul(syl.text));
  }

  private async completeWord() {
    const q = this.qs[this.qi]!;
    this.record(this.wrongs < 2, {});
    const mid = this.blocks[Math.floor(this.blocks.length / 2)]!;
    await this.celebrate(mid.x, mid.y, [vid.hangul(q.word)]);
    this.qi++;
    if (await this.next()) await this.show();
  }

  private async wrong() {
    this.busy = true;
    const assist = this.miss();
    await this.gentleNo(assist);
    const nextSlot = this.slots.find((s) => !s.filled);
    const tile =
      nextSlot && this.tiles.find((t) => !t.used && t.piece.jamo === nextSlot.syl.jamo[nextSlot.kind]);
    if (tile && nextSlot && assist !== 'none') {
      const ring = hintRing(tile.c, 80);
      setTimeout(() => ring.destroy(), 2500);
    }
    if (tile && nextSlot && assist === 'together') {
      const target = this.layer.toLocal(nextSlot.box.getGlobalPosition());
      const hand = await helpingHand(this.layer, tile.c.position, target);
      hand.destroy();
      this.busy = false;
      await this.place(tile, nextSlot);
      return;
    }
    this.busy = false;
  }
}
