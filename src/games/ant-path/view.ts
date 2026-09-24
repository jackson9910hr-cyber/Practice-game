/** 길 찾기 개미 view: plan arrows then run (modes 1–2) or follow English directions (mode 3). */
import { Container, Graphics } from 'pixi.js';
import type { StationPlan } from '../../core/types';
import { vid } from '../../core/voice-ids';
import { C } from '../../art/palette';
import { emojiText } from '../../art/pictures';
import { sfx } from '../../audio/sfx';
import { voice } from '../../audio/voice';
import type { GameApp } from '../../engine/app';
import { ease, tween, wait } from '../../engine/tween';
import { Button } from '../../engine/ui';
import { GameBase } from '../base';
import { bounce, hintRing, popIn } from '../common';
import { DIRS, makeAntRound, move, simulate, type AntPuzzle, type Cell, type Dir } from './logic';

const ROT: Record<Dir, number> = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

function arrow(size: number, color: number = C.indigo): Graphics {
  const g = new Graphics();
  const s = size / 100;
  g.poly([
    -34 * s,
    -14 * s,
    6 * s,
    -14 * s,
    6 * s,
    -34 * s,
    40 * s,
    0,
    6 * s,
    34 * s,
    6 * s,
    14 * s,
    -34 * s,
    14 * s,
  ])
    .fill(color)
    .stroke({ width: 4 * s, color: 0xffffff, join: 'round' });
  return g;
}

export class AntView extends GameBase<'ant-path'> {
  private puzzles: AntPuzzle[] = [];
  private pi = 0;
  private board = new Container();
  private tiles = new Graphics();
  private ant = emojiText('🐜', 80);
  private candy = emojiText('🍬', 80);
  private rocks: Container[] = [];
  private pads: Button[] = [];
  private seq: Dir[] = [];
  private chips = new Container();
  private go: Button;
  private undo: Button;
  private cell = 120;
  private cmdIndex = 0;
  private antCell: Cell = { x: 0, y: 0 };
  private trail = new Graphics();

  constructor(game: GameApp, plan: StationPlan, index: number) {
    super(game, 'ant-path', plan, index);
    this.board.addChild(this.tiles, this.trail, this.candy, this.ant);
    for (const d of DIRS) {
      const b = new Button({
        icon: arrow(90),
        size: 130,
        color: C.cream,
        onTap: () => void this.press(d),
        a11y: d,
      });
      (b.children[b.children.length - 1] as Graphics).rotation = ROT[d];
      this.pads.push(b);
    }
    this.go = new Button({
      icon: '▶️',
      size: 140,
      color: C.mint,
      onTap: () => void this.run(),
      a11y: '출발',
    });
    this.undo = new Button({
      icon: '↩️',
      size: 120,
      color: C.cream,
      onTap: () => this.pop(),
      a11y: '지우기',
    });
    this.layer.addChild(this.board, this.chips, ...this.pads);
    if (this.mode < 3) this.layer.addChild(this.go, this.undo);
  }

  async start() {
    this.puzzles = makeAntRound(this.params, this.rng, 4);
    this.setTotal(this.puzzles.length);
    await this.instruct([vid.ko(this.mode >= 3 ? 'ant.english' : 'ant.plan')]);
    await this.show();
  }

  private get pz() {
    return this.puzzles[this.pi]!;
  }

  private show() {
    const pz = this.pz;
    this.rocks.forEach((r) => r.destroy());
    this.rocks = pz.rocks.map(() => emojiText('🪨', 80));
    if (this.rocks.length) this.board.addChild(...this.rocks);
    this.board.addChild(this.ant);
    this.seq = [];
    this.cmdIndex = 0;
    this.antCell = { ...pz.start };
    this.trail.clear();
    this.drawChips();
    this.layoutGame(this.game.W, this.game.H);
    void popIn(this.board);
    if (this.mode >= 3) return this.sayCommand();
  }

  private place(obj: Container, c: Cell) {
    const n = this.pz.size;
    obj.position.set((c.x - (n - 1) / 2) * this.cell, (c.y - (n - 1) / 2) * this.cell);
  }

  protected layoutGame(w: number, h: number) {
    if (!this.puzzles.length) return;
    const portrait = h > w;
    const pz = this.pz;
    const area = portrait ? Math.min(w - 80, h * 0.46) : Math.min(h * 0.62, w * 0.5);
    this.cell = area / pz.size;
    const n = pz.size;
    this.tiles.clear();
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const px = (x - (n - 1) / 2) * this.cell;
        const py = (y - (n - 1) / 2) * this.cell;
        this.tiles
          .roundRect(px - this.cell / 2 + 4, py - this.cell / 2 + 4, this.cell - 8, this.cell - 8, 14)
          .fill((x + y) % 2 ? 0x4cc28a : 0x5ed3a2);
      }
    const es = this.cell / 120;
    for (const e of [this.ant, this.candy, ...this.rocks]) e.scale.set(es);
    this.place(this.candy, pz.goal);
    this.place(this.ant, this.antCell);
    pz.rocks.forEach((r, i) => this.place(this.rocks[i]!, r));
    this.board.position.set(portrait ? w / 2 : w * 0.34, portrait ? h * 0.38 : h * 0.54);
    // controls: a + shaped pad
    const px = portrait ? w / 2 : w * 0.78;
    const py = portrait ? h * 0.8 : h * 0.6;
    // ≥145 units apart so neighbouring big buttons never overlap; ▶ and ↩ sit outside the cross
    const gap = 145;
    const off: Record<Dir, [number, number]> = {
      up: [0, -gap],
      down: [0, gap],
      left: [-gap, 0],
      right: [gap, 0],
    };
    DIRS.forEach((d, i) => this.pads[i]!.position.set(px + off[d][0], py + off[d][1]));
    this.go.position.set(px + gap * 1.15, py + gap);
    this.undo.position.set(px - gap * 1.15, py + gap);
    this.chips.position.set(portrait ? w / 2 : w * 0.78, portrait ? h * 0.63 : h * 0.26);
  }

  private drawChips() {
    this.chips.removeChildren().forEach((c) => c.destroy());
    if (this.mode >= 3) return;
    const max = this.pz.solution.length + 2;
    const size = Math.min(70, (this.game.W * 0.9) / max);
    for (let i = 0; i < max; i++) {
      const slot = new Graphics();
      slot.roundRect(-size / 2, -size / 2, size, size, 12).fill({ color: 0xffffff, alpha: 0.2 });
      slot.x = (i - (max - 1) / 2) * (size + 8);
      this.chips.addChild(slot);
      const d = this.seq[i];
      if (d) {
        const a = arrow(size * 0.9, C.gold);
        a.rotation = ROT[d];
        a.x = slot.x;
        this.chips.addChild(a);
      }
    }
  }

  private async press(d: Dir) {
    if (this.busy) return;
    if (this.mode >= 3) return this.follow(d);
    if (this.seq.length >= this.pz.solution.length + 2) return;
    this.seq.push(d);
    sfx.snap();
    this.drawChips();
  }

  private pop() {
    if (this.busy) return;
    this.seq.pop();
    this.drawChips();
  }

  private async walk(path: Cell[]) {
    const n = this.pz.size;
    for (let i = 1; i < path.length; i++) {
      const c = path[i]!;
      const prev = path[i - 1]!;
      const d = DIRS.find((x) => move(prev, x).x === c.x && move(prev, x).y === c.y)!;
      this.ant.rotation = ROT[d] + Math.PI / 2;
      sfx.tap();
      if (this.mode >= 2) void voice.say(vid.en(`dir.${d}`));
      await tween(
        this.ant,
        { x: (c.x - (n - 1) / 2) * this.cell, y: (c.y - (n - 1) / 2) * this.cell },
        { duration: 380, ease: ease.inOutSine },
      );
    }
  }

  private async run() {
    if (this.busy) return;
    if (!this.seq.length) {
      this.pads.forEach((p) => void bounce(p));
      return void voice.sayNow(vid.ko('ant.needArrows'));
    }
    this.busy = true;
    const r = simulate(this.pz, this.seq);
    await this.walk(r.path);
    if (r.result === 'goal') await this.win();
    else {
      // bump, then slide back to the start
      await tween(
        this.ant.scale,
        { x: this.ant.scale.x * 1.2, y: this.ant.scale.y * 0.8 },
        { duration: 120 },
      );
      await tween(
        this.ant.scale,
        { x: this.cell / 120, y: this.cell / 120 },
        { duration: 200, ease: ease.outBack },
      );
      const assist = this.record(false, {});
      await voice.sayNow(vid.ko('ant.oops'));
      this.antCell = { ...this.pz.start };
      this.place(this.ant, this.antCell);
      this.ant.rotation = 0;
      if (assist !== 'none') this.showHint(assist === 'together' ? this.pz.solution.length : 2);
      if (assist === 'together') {
        this.seq = [...this.pz.solution];
        this.drawChips();
        hintRing(this.go, 80);
      }
    }
    this.busy = false;
  }

  private showHint(steps: number) {
    const n = this.pz.size;
    let c = this.pz.start;
    this.trail.clear();
    for (const d of this.pz.solution.slice(0, steps)) {
      const nx = move(c, d);
      this.trail
        .moveTo((c.x - (n - 1) / 2) * this.cell, (c.y - (n - 1) / 2) * this.cell)
        .lineTo((nx.x - (n - 1) / 2) * this.cell, (nx.y - (n - 1) / 2) * this.cell)
        .stroke({ width: 12, color: C.gold, alpha: 0.7, cap: 'round' });
      c = nx;
    }
  }

  /* ----- mode 3: English commands ----- */
  private async sayCommand() {
    const d = this.pz.solution[this.cmdIndex];
    if (!d) return;
    await wait(200);
    // the ear button repeats the current English direction too
    this.setInstruction([vid.ko('ant.english'), vid.en(`dir.${d}`)]);
    await voice.sayNow(vid.en(`dir.${d}`));
  }

  private async follow(d: Dir) {
    const want = this.pz.solution[this.cmdIndex];
    if (!want) return;
    this.busy = true;
    if (d === want) {
      const nx = move(this.antCell, d);
      await this.walk([this.antCell, nx]);
      this.antCell = nx;
      this.cmdIndex++;
      if (this.cmdIndex >= this.pz.solution.length) {
        this.record(this.wrongs < 2, {});
        await this.win(true);
      } else await this.sayCommand();
    } else {
      const assist = this.miss();
      sfx.soft();
      void bounce(this.pads[DIRS.indexOf(d)]!);
      if (assist !== 'none') {
        const r = hintRing(this.pads[DIRS.indexOf(want)]!, 80);
        setTimeout(() => r.destroy(), 2000);
      }
      await this.sayCommand();
    }
    this.busy = false;
  }

  private async win(recorded = false) {
    if (!recorded) this.record(true, {});
    this.fx.burst(this.board.x + this.candy.x, this.board.y + this.candy.y, { count: 26 });
    await this.celebrate(this.board.x, this.board.y, []);
    this.pi++;
    if (await this.next()) await this.show();
  }
}
