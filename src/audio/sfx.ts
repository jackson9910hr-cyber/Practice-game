/** Procedural sound effects (no audio files). Soft, pentatonic, never harsh — even for mistakes. */
import { audio } from './context';

type Wave = OscillatorType;

function tone(
  freq: number,
  dur: number,
  opts: { type?: Wave; vol?: number; at?: number; glide?: number; attack?: number } = {},
) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime + (opts.at ?? 0);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t0 + dur);
  const vol = opts.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.sfx);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
/** One second of white noise, made once and reused (slices start at random offsets). */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function noise(
  dur: number,
  opts: { freq?: number; q?: number; vol?: number; at?: number; sweepTo?: number } = {},
) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime + (opts.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
  f.Q.value = opts.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.vol ?? 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(audio.sfx);
  src.start(t0, Math.random() * 0.8, dur);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98];

export const sfx = {
  tap: () => tone(660, 0.08, { type: 'triangle', vol: 0.18 }),
  pop: () => tone(420, 0.12, { glide: 900, vol: 0.25 }),
  pickup: () => tone(520, 0.09, { type: 'triangle', glide: 700, vol: 0.2 }),
  snap: () => {
    tone(784, 0.08, { type: 'triangle', vol: 0.22 });
    noise(0.04, { freq: 3000, vol: 0.08 });
  },
  flip: () => noise(0.12, { freq: 900, sweepTo: 3000, vol: 0.12 }),
  whoosh: () => noise(0.45, { freq: 400, sweepTo: 2500, q: 0.7, vol: 0.18 }),
  /** gentle "try again" — low and soft, never a buzzer */
  soft: () => tone(330, 0.22, { glide: 260, vol: 0.16, type: 'sine' }),
  correct: (streak = 0) => {
    const base = Math.min(streak, 3);
    [0, 2, 4, 5].forEach((n, i) =>
      tone(PENTA[n + base]!, 0.22, { type: 'triangle', vol: 0.22, at: i * 0.06 }),
    );
    tone(PENTA[5 + base]! * 2, 0.4, { vol: 0.06, at: 0.24 });
  },
  sparkle: () => {
    for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 1600, 0.12, { vol: 0.05, at: i * 0.05 });
  },
  chime: () => {
    tone(1046.5, 1.2, { vol: 0.16 });
    tone(2093, 0.8, { vol: 0.05 });
    tone(3136, 0.5, { vol: 0.03 });
  },
  fanfare: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, 0.28, { type: 'triangle', vol: 0.2, at: i * 0.13 }),
    );
    tone(1318.5, 0.7, { type: 'triangle', vol: 0.16, at: 0.55 });
  },
  whistle: () => {
    tone(587, 0.5, { type: 'sine', vol: 0.14 });
    tone(740, 0.5, { type: 'sine', vol: 0.12 });
    for (let i = 0; i < 4; i++) noise(0.09, { freq: 700, vol: 0.12, at: 0.5 + i * 0.16 });
  },
  plant: () => {
    tone(392, 0.9, { glide: 1568, vol: 0.14, type: 'triangle' });
    for (let i = 0; i < 8; i++) tone(PENTA[i % PENTA.length]! * 2, 0.15, { vol: 0.05, at: 0.3 + i * 0.07 });
  },
  twinkle: () => tone(2349, 0.25, { vol: 0.07 }),
  count: (n: number) => tone(PENTA[(n - 1) % PENTA.length]!, 0.14, { type: 'triangle', vol: 0.2 }),
  kick: (at = 0) => tone(120, 0.18, { glide: 45, vol: 0.35, at }),
  shaker: (at = 0) => noise(0.05, { freq: 6000, q: 0.8, vol: 0.06, at }),
  clap: (at = 0) => noise(0.08, { freq: 1500, q: 0.9, vol: 0.14, at }),
};
