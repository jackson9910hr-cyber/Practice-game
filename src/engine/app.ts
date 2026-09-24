import { Application, Container } from 'pixi.js';
import { updateTweens } from './tween';

/** Every scene is laid out in logical units where the SHORT side of the screen is 720. */
export const DESIGN_SHORT = 720;
/** Minimum hit target: 64 CSS px on the smallest supported phone (≈ 118 units) → use 120. */
export const MIN_HIT = 120;

export type ResizeFn = (w: number, h: number) => void;

export class GameApp {
  readonly app = new Application();
  readonly root = new Container();
  W = DESIGN_SHORT;
  H = DESIGN_SHORT;
  /** CSS px per logical unit */
  scale = 1;
  private resizeFns = new Set<ResizeFn>();
  private updateFns = new Set<(dt: number) => void>();
  lowPower = false;
  private frameTimes: number[] = [];

  async init(parent: HTMLElement) {
    await this.app.init({
      resizeTo: parent,
      background: '#23305E',
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'low-power',
      preference: 'webgl',
    });
    parent.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', '별빛 정원 게임 화면');
    this.app.stage.addChild(this.root);
    this.app.stage.eventMode = 'static';
    this.app.ticker.add((t) => {
      // Pixi resizes the canvas lazily (next frame) → pick up size changes here
      const sc = this.app.screen;
      if (sc.width !== this.lastW || sc.height !== this.lastH) this.resize();
      const dt = Math.min(t.deltaMS, 100);
      this.trackFps(dt);
      // one bad frame must never stop the ticker (Pixi would not re-request animation frames)
      try {
        updateTweens(dt);
        for (const f of this.updateFns) f(dt);
      } catch (e) {
        console.error('frame error', e);
      }
    });
    this.resize();
  }

  private trackFps(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    if (this.frameTimes.length === 120) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / 120;
      // iOS low power mode caps at 30fps → halve particles etc.
      this.lowPower = avg > 26;
    }
  }

  private lastW = 0;
  private lastH = 0;

  resize() {
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    this.lastW = sw;
    this.lastH = sh;
    // lay the game out inside the notch-free area; the canvas background fills the edges
    const cs = getComputedStyle(this.app.canvas.parentElement ?? document.body);
    const px = (v: string) => parseFloat(cs.getPropertyValue(v)) || 0;
    const [t, r, b, l] = [px('--sat'), px('--sar'), px('--sab'), px('--sal')];
    const w = Math.max(1, sw - l - r);
    const h = Math.max(1, sh - t - b);
    this.scale = Math.min(w, h) / DESIGN_SHORT;
    this.W = w / this.scale;
    this.H = h / this.scale;
    this.root.scale.set(this.scale);
    this.root.position.set(l, t);
    this.app.stage.hitArea = this.app.screen;
    for (const f of this.resizeFns) f(this.W, this.H);
  }

  get portrait() {
    return this.H > this.W;
  }

  onResize(f: ResizeFn): () => void {
    this.resizeFns.add(f);
    return () => this.resizeFns.delete(f);
  }

  onUpdate(f: (dt: number) => void): () => void {
    this.updateFns.add(f);
    return () => this.updateFns.delete(f);
  }

  /** Converts CSS pixels to logical units (e.g. the 96px drag snap radius). */
  cssToUnits(px: number) {
    return px / this.scale;
  }
}
