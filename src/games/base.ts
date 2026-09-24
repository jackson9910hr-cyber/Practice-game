/**
 * Shared frame for every mini-game: HUD (ear, home, star progress), Korean instruction voice,
 * the 2-mistakes-hint / 3-mistakes-together ladder, praise, and all bookkeeping
 * (adaptive level, spaced-repetition exposures, stats, starlight, time limit).
 */
import { Container, Text } from 'pixi.js';
import { createAdaptive } from '../core/adaptive';
import { applyAnswer, exposeWords, startLevel } from '../core/answers';
import { chapterOf, praise } from '../core/content';
import { assistFor, createPraiser, needsHelp, type Assist, type Praiser } from '../core/feedback';
import { levelParams } from '../core/levels';
import type { LevelParamsMap } from '../core/levelgen';
import { completeStation, curriculumDay, secondsLeft } from '../core/progress';
import { createRng, type Rng } from '../core/rng';
import type { Scope } from '../core/rounds';
import type { GameId, StationPlan } from '../core/types';
import { vid } from '../core/voice-ids';
import { GardenBackground } from '../art/backgrounds';
import { C, FONT_KO } from '../art/palette';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { voice } from '../audio/voice';
import type { GameApp } from '../engine/app';
import { Fx } from '../engine/fx';
import { Scene } from '../engine/scene';
import { ease, tween, wait } from '../engine/tween';
import { Button, StarProgress, earButton, homeButton } from '../engine/ui';
import { nav } from '../flow';
import { store } from '../state';

/** the 2-minute warning is said once per app session */
let warnedTimeSoon = false;

export abstract class GameBase<G extends GameId> extends Scene {
  protected bg: GardenBackground;
  protected layer = new Container();
  protected hud = new Container();
  protected fx: Fx;
  protected ear: Button;
  protected home: Button;
  protected progress!: StarProgress;
  protected rng: Rng;
  protected day: number;
  protected mode: number;
  protected scope: Scope;
  protected params: LevelParamsMap[G];
  private praiser: Praiser;
  private instructionIds: string[] = [];
  protected wrongs = 0;
  protected streak = 0;
  protected total = 1;
  protected doneCount = 0;
  private finished = false;
  protected busy = false;
  /** struggling at the easiest level → hints come one mistake sooner */
  protected helpMode = false;

  constructor(
    game: GameApp,
    protected readonly gameId: G,
    protected readonly plan: StationPlan,
    protected readonly stationIndex: number,
  ) {
    super(game);
    const save = store.save;
    this.day = curriculumDay(save);
    this.mode = plan.mode;
    this.scope = plan.review;
    this.rng = createRng((Date.now() ^ (this.day * 7919)) >>> 0);
    const a = save.adaptive[this.adaptiveKey] ?? createAdaptive(startLevel(save, gameId, plan.mode));
    this.params = levelParams(gameId, a.level);
    this.helpMode = needsHelp(save.adaptive[this.adaptiveKey]);
    this.praiser = createPraiser(praise.en, praise.big, this.rng);
    this.bg = new GardenBackground(chapterOf(this.day).key, 1);
    this.fx = new Fx(game);
    this.ear = earButton(() => this.replayInstruction());
    this.home = homeButton(() => this.leave());
    this.hud.addChild(this.ear, this.home);
    this.addChild(this.bg, this.layer, this.hud, this.fx);
    music.play(chapterOf(this.day).key);
  }

  private get adaptiveKey() {
    return `${this.gameId}:${this.mode}`;
  }

  protected setTotal(n: number) {
    this.total = n;
    if (this.progress) this.hud.removeChild(this.progress);
    this.progress = new StarProgress(n);
    this.hud.addChild(this.progress);
    this.layoutHud(this.game.W);
  }

  private layoutHud(w: number) {
    this.ear.position.set(90, 90);
    this.home.position.set(w - 90, 90);
    if (this.progress) this.progress.position.set(w / 2, 70);
  }

  layout(w: number, h: number) {
    this.bg.layout(w, h);
    this.layoutHud(w);
    this.layoutGame(w, h);
  }

  protected abstract layoutGame(w: number, h: number): void;

  override update(dt: number) {
    this.bg.update(dt);
    this.fx.update(dt);
    this.tick(dt);
  }
  protected tick(_dt: number) {}

  override stop() {
    voice.cancel();
  }

  /** Korean instruction (+ optional English content line) — replayable with the ear button. */
  protected instruct(ids: string[]) {
    this.instructionIds = ids;
    voice.cancel();
    return voice.sayAll(ids, 150);
  }

  /** Change what the ear button replays without speaking now. */
  protected setInstruction(ids: string[]) {
    this.instructionIds = ids;
  }

  protected replayInstruction() {
    void this.instruct(this.instructionIds);
  }

  /**
   * Record an answer. Returns the assist level to show next (after a wrong answer).
   * `words` get a spaced-repetition exposure, `letter` updates phonics stats.
   */
  protected record(correct: boolean, opts: { words?: string[]; letter?: string } = {}): Assist {
    const assisted = assistFor(this.wrongs, this.helpMode) === 'together';
    store.update((s) =>
      applyAnswer(s, {
        game: this.gameId,
        mode: this.mode,
        day: this.day,
        correct,
        assisted,
        words: opts.words,
        letter: opts.letter,
      }),
    );
    if (correct) {
      this.streak = this.wrongs === 0 ? this.streak + 1 : 0;
      return 'none';
    }
    this.streak = 0;
    this.wrongs += 1;
    return assistFor(this.wrongs, this.helpMode);
  }

  /** A mistake inside a multi-step task (scored once at the end via `record`). */
  protected miss(): Assist {
    this.wrongs += 1;
    this.streak = 0;
    return assistFor(this.wrongs, this.helpMode);
  }

  /** Passive exposure (word heard in a non-target role, e.g. counting in English). */
  protected expose(words: string[]) {
    store.update((s) => exposeWords(s, words, this.day));
  }

  /** Soft "not this one" feedback + the assist ladder voice. */
  protected async gentleNo(assist: Assist) {
    sfx.soft();
    if (assist === 'hint') await voice.sayNow(vid.ko('hint.listen'));
    else if (assist === 'together') await voice.sayNow(vid.ko('together'));
    else await voice.sayNow(vid.ko('retry'));
  }

  /** Celebrate a correct answer: sparkle, (re)say the content, praise. */
  protected async celebrate(x: number, y: number, contentIds: string[] = []) {
    sfx.correct(this.streak);
    this.fx.burst(x, y, { count: 20 });
    voice.cancel();
    for (const id of contentIds) await voice.say(id);
    // effort, not "you're smart": after help, praise the process; otherwise English/Korean 50:50
    if (assistFor(this.wrongs, this.helpMode) === 'together')
      return void (await voice.say('ko.together.done'));
    if (this.wrongs > 0)
      return void (await voice.say(vid.praiseProcess(this.rng.int(0, praise.process.length - 1))));
    const useKo = this.rng.chance(0.5);
    const p = this.praiser.next(this.streak);
    const idx = useKo ? this.rng.int(0, praise.ko.length - 1) : p.index;
    await voice.say(useKo ? vid.praiseKo(idx) : p.big ? vid.bigPraise(idx) : vid.praiseEn(idx));
  }

  /** Move on to the next question; ends the station when all are done or time is up. */
  protected async next(): Promise<boolean> {
    if (!this.alive) return false;
    this.doneCount += 1;
    this.progress?.set(this.doneCount);
    this.wrongs = 0;
    if (this.doneCount >= this.total) {
      await this.finish();
      return false;
    }
    const left = secondsLeft(store.save);
    if (left <= 0) {
      // time is up: this round still counts, then a warm goodnight
      this.completeHere();
      await voice.sayNow(vid.ko('timeUp'));
      await nav.goodnight('time', this);
      return false;
    }
    if (left <= 120 && !warnedTimeSoon) {
      warnedTimeSoon = true;
      await voice.say(vid.ko('timeSoon'));
    }
    return true;
  }

  private completeHere() {
    if (this.finished) return;
    this.finished = true;
    const counts = this.stationIndex >= (store.save.today?.stationsDone ?? 0);
    if (counts) store.update((s) => completeStation(s, this.gameId, this.mode));
  }

  private async finish() {
    if (this.finished || !this.alive) return;
    this.finished = true;
    const counts = this.stationIndex >= (store.save.today?.stationsDone ?? 0);
    // replaying an earlier station in free play still earns starlight but does not advance the path
    store.update((s) =>
      counts
        ? completeStation(s, this.gameId, this.mode)
        : { ...s, starlight: s.starlight + 1, starlightTotal: s.starlightTotal + 1 },
    );
    await this.stationCelebration();
    await nav.hub(this);
  }

  private async stationCelebration() {
    const { W, H } = this.game;
    sfx.fanfare();
    const jar = new Container();
    const glow = new Text({ text: '✨', style: { fontSize: 160, fontFamily: FONT_KO } });
    glow.anchor.set(0.5);
    jar.addChild(glow);
    jar.position.set(W / 2, H / 2);
    jar.scale.set(0);
    this.addChild(jar);
    for (let i = 0; i < 4; i++)
      this.fx.burst(W / 2 + (i - 1.5) * 120, H / 2, { count: 16, up: true, speed: 1.3 });
    await tween(jar.scale, { x: 1, y: 1 }, { duration: 500, ease: ease.outBack });
    await voice.sayNow(vid.ko('station.done'));
    await wait(300);
  }

  /** Home needs a second, deliberate tap (a thumb resting on the corner must not end the round). */
  private confirm: Button | null = null;
  private leave() {
    if (this.confirm) return;
    voice.cancel();
    void voice.say(vid.ko('leave.ask'));
    const ok = new Button({
      icon: '✔️',
      color: C.mint,
      onTap: () => void nav.hub(this),
      a11y: '정원으로 가기',
    });
    ok.position.set(this.home.x - 150, this.home.y);
    this.hud.addChild(ok);
    this.confirm = ok;
    setTimeout(() => {
      if (!ok.destroyed) ok.destroy({ children: true });
      this.confirm = null;
    }, 3500);
  }

  protected koText(text: string, size = 44, color: number = C.cream) {
    const t = new Text({
      text,
      style: { fontFamily: FONT_KO, fontSize: size, fontWeight: '800', fill: color },
    });
    t.anchor.set(0.5);
    return t;
  }
}
