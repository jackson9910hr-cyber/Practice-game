import { Container, Graphics } from 'pixi.js';
import type { GameApp } from './app';
import { tween } from './tween';

/** Thrown by `alive()` checks to silently end a scene script after the scene was left. */
export class SceneGone extends Error {}

export abstract class Scene extends Container {
  private offResize: (() => void) | null = null;
  private offUpdate: (() => void) | null = null;
  private gone = false;

  get alive() {
    return !this.gone && !this.destroyed;
  }
  /** Use after awaits in long scripts: stops the script if the scene has been left. */
  protected check() {
    if (!this.alive) throw new SceneGone();
  }
  constructor(protected game: GameApp) {
    super();
  }
  /** Called once after being added to the stage. */
  abstract start(): void | Promise<void>;
  abstract layout(w: number, h: number): void;
  update(_dt: number): void {}
  /** Stop audio/timers; the router destroys the scene afterwards. */
  stop(): void {}

  attach() {
    this.offResize = this.game.onResize((w, h) => this.layout(w, h));
    this.offUpdate = this.game.onUpdate((dt) => this.update(dt));
    this.layout(this.game.W, this.game.H);
  }
  detach() {
    this.gone = true;
    this.offResize?.();
    this.offUpdate?.();
  }
}

/** Scene switching with a soft fade through the night colour. */
export class Router {
  private current: Scene | null = null;
  private fade = new Graphics();
  private busy = Promise.resolve();

  constructor(private game: GameApp) {
    this.fade.alpha = 0;
    this.fade.eventMode = 'none';
    game.app.stage.addChild(this.fade);
    game.onResize(() => this.drawFade());
    this.drawFade();
  }

  private drawFade() {
    const s = this.game.app.screen;
    this.fade.clear().rect(0, 0, s.width, s.height).fill(0x151c3a);
  }

  go(make: () => Scene): Promise<void> {
    this.busy = this.busy.then(async () => {
      this.fade.eventMode = 'static';
      await tween(this.fade, { alpha: 1 }, { duration: 260 });
      const old = this.current;
      if (old) {
        old.stop();
        old.detach();
        this.game.root.removeChild(old);
        old.destroy({ children: true });
      }
      const next = make();
      this.current = next;
      this.game.root.addChild(next);
      next.attach();
      // start() runs the scene's whole script — never block navigation on it
      void Promise.resolve()
        .then(() => next.start())
        .catch((e) => {
          if (!(e instanceof SceneGone) && next.alive) console.error('scene error', e);
        });
      await tween(this.fade, { alpha: 0 }, { duration: 320 });
      this.fade.eventMode = 'none';
    });
    return this.busy;
  }

  get scene() {
    return this.current;
  }
}
