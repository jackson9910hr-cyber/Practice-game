/**
 * Generated chapter loops (Web Audio, pentatonic → no clashes). 8-bar deterministic loop per chapter.
 */
import { ambience } from './ambience';
import { audio } from './context';

interface Style {
  bpm: number;
  root: number; // MIDI
  lead: OscillatorType;
  decay: number;
  seed: number;
}

const STYLES: Record<string, Style> = {
  flowerbed: { bpm: 92, root: 72, lead: 'triangle', decay: 0.5, seed: 11 },
  pond: { bpm: 84, root: 65, lead: 'sine', decay: 0.8, seed: 23 },
  forest: { bpm: 88, root: 67, lead: 'sine', decay: 0.25, seed: 37 },
  skybridge: { bpm: 96, root: 74, lead: 'triangle', decay: 0.7, seed: 51 },
  night: { bpm: 60, root: 69, lead: 'sine', decay: 1.2, seed: 7 },
  festival: { bpm: 108, root: 72, lead: 'square', decay: 0.2, seed: 99 },
};
const PENTA = [0, 2, 4, 7, 9];
const CHORDS = [0, 5, 7, 0, 9, 5, 7, 0]; // I IV V I vi IV V I (as semitone offsets)

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

class Music {
  private timer: number | null = null;
  private style: Style | null = null;
  private melody: (number | null)[] = [];
  private step = 0;
  private nextTime = 0;
  current = '';
  enabled = true;

  play(name: string) {
    ambience.play(name);
    if (this.current === name && this.timer !== null) return;
    this.stop();
    this.current = name;
    if (!this.enabled || !audio.ctx) return;
    const st = STYLES[name] ?? STYLES.flowerbed!;
    this.style = st;
    const rnd = seeded(st.seed);
    // 8 bars × 8 eighth notes, gentle random walk on the pentatonic scale
    let idx = 5;
    this.melody = Array.from({ length: 64 }, (_, i) => {
      if (i % 8 === 7 || rnd() < 0.3) return null;
      idx = Math.max(0, Math.min(9, idx + Math.round((rnd() - 0.5) * 3)));
      return idx;
    });
    this.step = 0;
    this.nextTime = audio.now + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  /** pause for background; `resume()` restarts the same track */
  private paused = '';
  pause() {
    if (!this.current) return;
    this.paused = this.current;
    this.stop();
    ambience.stop();
  }
  resume() {
    if (this.paused && !this.current) this.play(this.paused);
    this.paused = '';
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = '';
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    ambience.setEnabled(on);
    if (!on) this.stop();
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private schedule() {
    const st = this.style;
    if (!st || !audio.ctx) return;
    // after the tab was throttled/suspended, don't fire the missed notes all at once
    if (this.nextTime < audio.now) this.nextTime = audio.now + 0.05;
    const eighth = 60 / st.bpm / 2;
    while (this.nextTime < audio.now + 0.3) {
      const i = this.step % 64;
      const bar = Math.floor(i / 8);
      const chord = CHORDS[bar]!;
      const t = this.nextTime;
      if (i % 8 === 0) {
        this.note(midi(st.root - 24 + chord), t, eighth * 7, 'sine', 0.12);
        for (const iv of [0, 4, 7])
          this.note(midi(st.root - 12 + chord + iv), t, eighth * 8, 'triangle', 0.025);
      }
      if (i % 8 === 4) this.note(midi(st.root - 24 + chord + 7), t, eighth * 3, 'sine', 0.08);
      const m = this.melody[i];
      if (m !== null && m !== undefined) {
        const oct = Math.floor(m / 5);
        const semis = PENTA[m % 5]! + 12 * oct + chord * 0;
        const vol = st.lead === 'square' ? 0.018 : 0.05;
        this.note(midi(st.root - 12 + semis), t, Math.max(eighth, st.decay), st.lead, vol);
      }
      this.step++;
      this.nextTime += eighth;
    }
  }
}

export const music = new Music();
