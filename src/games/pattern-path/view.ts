/** 패턴 꽃길 view: a row of flowers with a missing one; the row "plays" its pattern as notes. */
import { Container, Graphics, Text } from 'pixi.js';
import { hasWord } from '../../core/content';
import type { StationPlan } from '../../core/types';
import { vid } from '../../core/voice-ids';
import { C, COLOR_WORDS, FONT_EN } from '../../art/palette';
import { drawShape } from '../../art/pictures';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { wait } from '../../engine/tween';
import { Button, Card, speakerIcon } from '../../engine/ui';
import { GameBase } from '../base';
import { arrange, bounce, hintRing, popIn, shake } from '../common';
import { makePatternRound, nameOf, same, type Flower, type PatternQuestion } from './logic';

export function drawFlower(f: Flower): Container {
  const c = new Container();
  const g = new Graphics();
  const r = f.size === 'small' ? 34 : 56;
  const col = COLOR_WORDS[f.color] ?? C.pink;
  if (f.shape === 'flower') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.circle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.42).fill(col);
    }
    g.circle(0, 0, r * 0.38)
      .fill(C.gold)
      .stroke({ width: 3, color: C.ink, alpha: 0.6 });
  } else drawShape(g, f.shape, r * 0.9, col);
  c.addChild(g);
  return c;
}

const NOTE: Record<string, number> = { A: 1, B: 3, C: 5, D: 6 };

export class PatternView extends GameBase<'pattern-path'> {
  private qs: PatternQuestion[] = [];
  private qi = 0;
  private row: Container[] = [];
  private stems = new Graphics();
  private cards: Card[] = [];
  private speaker: Button;

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'pattern-path', plan, index);
    this.speaker = new Button({
      icon: speakerIcon(80),
      size: 130,
      color: C.gold,
      onTap: () => void this.playRow(),
      a11y: '규칙 다시 듣기',
    });
    this.layer.addChild(this.stems, this.speaker);
  }

  async start() {
    this.qs = makePatternRound(this.mode, this.params, this.rng);
    this.setTotal(this.qs.length);
    await this.instruct([vid.ko(this.mode >= 4 ? 'pattern.english' : 'pattern.go')]);
    await this.show();
  }

  private get q() {
    return this.qs[this.qi]!;
  }

  private clear() {
    this.row.forEach((r) => r.destroy({ children: true }));
    this.cards.forEach((c) => c.destroy({ children: true }));
    this.row = [];
    this.cards = [];
  }

  private async show() {
    this.clear();
    const q = this.q;
    q.row.forEach((f, i) => {
      let node: Container;
      if (i === q.blank) {
        node = new Container();
        const g = new Graphics();
        g.circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.15 }).stroke({ width: 5, color: C.gold });
        const t = new Text({
          text: '?',
          style: { fontFamily: FONT_EN, fontSize: 70, fontWeight: '800', fill: C.gold },
        });
        t.anchor.set(0.5);
        node.addChild(g, t);
      } else node = drawFlower(f);
      this.row.push(node);
      this.layer.addChild(node);
      void popIn(node, i * 60);
    });
    q.options.forEach((f, i) => {
      const c = new Card(190, 190);
      c.addChild(drawFlower(f));
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => void this.answer(f, c));
      this.cards.push(c);
      this.layer.addChild(c);
      void popIn(c, 400 + i * 90);
    });
    this.layoutGame(this.game.W, this.game.H);
    await wait(q.row.length * 60 + 300);
    await this.playRow();
  }

  /** Each flower bounces with a note (A/B/C/D → pitch); in mode 4 it's also named in English. */
  private async playRow() {
    const q = this.q;
    voice.cancel();
    for (const [i, node] of this.row.entries()) {
      void bounce(node);
      if (i === q.blank) {
        sfx.twinkle();
        await wait(420);
        continue;
      }
      sfx.count(NOTE[q.unit[i % q.unit.length]!] ?? 1);
      if (this.mode >= 4) {
        for (const w of nameOf(q.row[i]!, q.dims)) if (hasWord(w)) await voice.say(vid.word(w));
      } else await wait(380);
    }
  }

  private async answer(f: Flower, c: Card) {
    if (this.busy) return;
    this.busy = true;
    const q = this.q;
    const ok = same(f, q.answer);
    const named = nameOf(q.answer, q.dims).filter(hasWord);
    const assist = this.record(ok, { words: this.mode >= 4 ? named : [] });
    if (ok) {
      const slot = this.row[q.blank]!;
      const fl = drawFlower(f);
      fl.position.copyFrom(slot.position);
      slot.visible = false;
      this.layer.addChild(fl);
      this.row[q.blank] = fl;
      await popIn(fl);
      await this.celebrate(fl.x, fl.y, this.mode >= 3 ? named.map((w) => vid.word(w)) : []);
      this.qi++;
      if (await this.next()) await this.show();
    } else {
      void shake(c);
      await this.gentleNo(assist);
      if (assist !== 'none') {
        await this.playRow();
        const right = this.cards[q.options.findIndex((o) => same(o, q.answer))];
        if (right) hintRing(right, 110);
      }
    }
    this.busy = false;
  }

  protected layoutGame(w: number, h: number) {
    const portrait = h > w;
    const n = this.row.length;
    const cell = Math.min(140, (w - 60) / Math.max(n, 1));
    const y = portrait ? h * 0.38 : h * 0.4;
    this.stems.clear();
    this.row.forEach((r, i) => {
      const x = w / 2 + (i - (n - 1) / 2) * cell;
      r.position.set(x, y);
      r.scale.set(cell / 140);
      this.stems
        .moveTo(x, y + 30)
        .lineTo(x, y + 110)
        .stroke({ width: 6, color: 0x2d8a5a });
    });
    this.stems
      .moveTo(w / 2 - (n / 2) * cell, y + 110)
      .lineTo(w / 2 + (n / 2) * cell, y + 110)
      .stroke({ width: 10, color: 0x8d5524, alpha: 0.6, cap: 'round' });
    this.speaker.position.set(w / 2, portrait ? h * 0.2 : 180);
    const pos = arrange(this.cards.length, w / 2, portrait ? h * 0.72 : h * 0.78, w - 60, 220, 190);
    this.cards.forEach((c, i) => {
      c.position.set(pos[i]!.x, pos[i]!.y);
      c.scale.set(pos[i]!.scale);
    });
  }
}
