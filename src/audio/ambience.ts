/**
 * Soft procedural ambience per place, under the music (and ducked with it while someone speaks):
 * flower bed wind-chimes, pond drips + frogs, forest birds, sky-bridge breeze, night crickets.
 * Sparse random events — never a constant drone, never loud.
 */
import { audio } from './context';

type Place = 'flowerbed' | 'pond' | 'forest' | 'skybridge' | 'night' | 'festival' | string;

let timer: number | null = null;
let current = '';
let enabled = true;

function out(): GainNode | null {
  if (!audio.ctx) return null;
  const g = audio.ctx.createGain();
  g.gain.value = 0.5;
  g.connect(audio.music);
  return g;
}

function blip(
  freq: number,
  dur: number,
  vol: number,
  glideTo?: number,
  type: OscillatorType = 'sine',
  at = 0,
) {
  const ctx = audio.ctx;
  const dest = out();
  if (!ctx || !dest) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function breeze(dur: number, vol: number) {
  const ctx = audio.ctx;
  const dest = out();
  if (!ctx || !dest) return;
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, t0);
  f.frequency.linearRampToValueAtTime(900, t0 + dur / 2);
  f.frequency.linearRampToValueAtTime(300, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + dur / 2);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t0);
}

const r = (a: number, b: number) => a + Math.random() * (b - a);

const EVENTS: Record<string, { every: [number, number]; play: () => void }[]> = {
  flowerbed: [
    {
      every: [4, 9],
      play: () =>
        [0, 0.18, 0.36].forEach((at, i) =>
          blip(r(1900, 2700) * (1 + i * 0.12), 1.2, 0.02, undefined, 'sine', at),
        ),
    },
    { every: [10, 16], play: () => breeze(3, 0.025) },
  ],
  pond: [
    { every: [2, 5], play: () => blip(r(900, 1300), 0.12, 0.04, r(350, 500)) },
    {
      every: [8, 15],
      play: () => [0, 0.14].forEach((at) => blip(r(110, 140), 0.16, 0.05, 90, 'square', at)),
    },
  ],
  forest: [
    {
      every: [4, 9],
      play: () =>
        [0, 0.11, 0.22].forEach((at) => blip(r(2600, 3400), 0.08, 0.025, r(3600, 4200), 'sine', at)),
    },
    { every: [9, 15], play: () => breeze(3.5, 0.03) },
  ],
  skybridge: [
    { every: [6, 10], play: () => breeze(4, 0.035) },
    { every: [3, 7], play: () => blip(r(2200, 3000), 0.5, 0.015) },
  ],
  night: [
    {
      every: [1.2, 2.6],
      play: () => [0, 0.06, 0.12, 0.18].forEach((at) => blip(4600, 0.035, 0.012, undefined, 'sine', at)),
    },
  ],
};

export const ambience = {
  play(place: Place) {
    if (current === place && timer !== null) return;
    this.stop();
    current = place;
    const evs = EVENTS[place];
    if (!enabled || !evs || !audio.ctx) return;
    const next = evs.map((e) => performance.now() + r(...e.every) * 1000);
    timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = performance.now();
      evs.forEach((e, i) => {
        if (now >= next[i]!) {
          e.play();
          next[i] = now + r(...e.every) * 1000;
        }
      });
    }, 250);
  },
  stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    current = '';
  },
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) this.stop();
  },
};
