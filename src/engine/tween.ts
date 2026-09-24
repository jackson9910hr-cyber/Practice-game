/** Tiny promise-based tween engine driven by the Pixi ticker (delta-time based → 30fps safe). */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

type Target = Record<string, unknown> & { destroyed?: boolean };

interface Active {
  target: Target;
  from: Record<string, number>;
  to: Record<string, number>;
  duration: number;
  delay: number;
  t: number;
  ease: Ease;
  resolve: () => void;
  onUpdate?: (k: number) => void;
}

const active: Active[] = [];
const timers: { at: number; resolve: () => void }[] = [];
let clock = 0;

function get(obj: Target, path: string): number {
  const parts = path.split('.');
  let o: unknown = obj;
  for (const p of parts) o = (o as Record<string, unknown>)[p];
  return o as number;
}
function set(obj: Target, path: string, v: number) {
  const parts = path.split('.');
  let o: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]!] as Record<string, unknown>;
  o[parts[parts.length - 1]!] = v;
}

export interface TweenOpts {
  duration?: number;
  delay?: number;
  ease?: Ease;
  onUpdate?: (k: number) => void;
}

/** Animate numeric props (dot paths allowed, e.g. "scale.x"). Resolves when done or target destroyed. */
export function tween(target: object, to: Record<string, number>, opts: TweenOpts = {}): Promise<void> {
  const t = target as Target;
  // Pixi nulls .scale/.position on destroy → never tween a dead object (it would kill the ticker)
  if (!t || t.destroyed) return Promise.resolve();
  killTweens(target, Object.keys(to));
  return new Promise((resolve) => {
    active.push({
      target: t,
      from: {},
      to,
      duration: Math.max(1, opts.duration ?? 300),
      delay: opts.delay ?? 0,
      t: 0,
      ease: opts.ease ?? ease.outQuad,
      resolve,
      onUpdate: opts.onUpdate,
    });
  });
}

export function killTweens(target: object, props?: string[]) {
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]!;
    if (a.target !== target) continue;
    if (props) {
      for (const p of props) {
        delete a.to[p];
        delete a.from[p];
      }
      if (Object.keys(a.to).length > 0) continue;
    }
    active.splice(i, 1);
    a.resolve();
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => timers.push({ at: clock + ms, resolve }));
}

export function updateTweens(dtMs: number) {
  clock += dtMs;
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i]!.at <= clock) {
      const tm = timers.splice(i, 1)[0]!;
      tm.resolve();
    }
  }
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]!;
    if (
      !a.target ||
      a.target.destroyed ||
      (a.target as { _observer?: { destroyed?: boolean } })._observer?.destroyed
    ) {
      active.splice(i, 1);
      a.resolve();
      continue;
    }
    if (a.delay > 0) {
      a.delay -= dtMs;
      continue;
    }
    if (a.t === 0) for (const k of Object.keys(a.to)) a.from[k] = get(a.target, k);
    a.t = Math.min(1, a.t + dtMs / a.duration);
    const k = a.ease(a.t);
    for (const key of Object.keys(a.to)) set(a.target, key, a.from[key]! + (a.to[key]! - a.from[key]!) * k);
    a.onUpdate?.(k);
    if (a.t >= 1) {
      active.splice(i, 1);
      a.resolve();
    }
  }
}

export function now(): number {
  return clock;
}
