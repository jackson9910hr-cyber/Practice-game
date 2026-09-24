/**
 * Serialised voice queue. Every line is an id from the audio manifest: a native recording is
 * played if `file` is set, otherwise Web Speech (en-US rate 0.8 / ko-KR) is used.
 * iOS quirks handled: voices load async, `onend` may never fire (timeout fallback),
 * utterances must be referenced to avoid GC, language switches get a 250ms gap.
 */
import manifestJson from '../data/audio-manifest.json';
import { audio } from './context';

interface Entry {
  lang: string;
  text: string;
  file: string | null;
}
const manifest = (manifestJson as unknown as { entries: Record<string, Entry> }).entries;

const NOVELTY =
  /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;
const PREFERRED: Record<string, RegExp[]> = {
  'en-US': [/samantha/i, /ava/i, /allison/i, /susan/i, /google us english/i, /aria/i, /jenny/i, /zira/i],
  'ko-KR': [/yuna/i, /sora/i, /google 한국/i, /heami/i, /sunhi/i],
};

export interface SpeakEvent {
  id: string;
  lang: string;
  text: string;
  ms: number;
}

class Voice {
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private voices: Record<string, SpeechSynthesisVoice | null> = {};
  private buffers = new Map<string, AudioBuffer>();
  private live = new Set<SpeechSynthesisUtterance>();
  private current: AudioBufferSourceNode | null = null;
  private lastLang = '';
  private listeners = new Set<(e: SpeakEvent | null) => void>();
  enRate = 0.8;
  koRate = 1.0;

  init() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const all = window.speechSynthesis.getVoices();
      for (const lang of ['en-US', 'ko-KR']) {
        const cands = all.filter(
          (v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)) && !NOVELTY.test(v.name),
        );
        const exact = cands.filter((v) => v.lang.replace('_', '-') === lang);
        const pool = exact.length ? exact : cands;
        let best: SpeechSynthesisVoice | null = null;
        for (const re of PREFERRED[lang]!) {
          const enhanced = pool.find((v) => re.test(v.name) && /enhanced|premium|natural/i.test(v.name));
          best = enhanced ?? pool.find((v) => re.test(v.name)) ?? null;
          if (best) break;
        }
        this.voices[lang] = best ?? pool.find((v) => v.localService) ?? pool[0] ?? null;
      }
    };
    pick();
    window.speechSynthesis.addEventListener?.('voiceschanged', pick);
  }

  voiceInfo() {
    return { en: this.voices['en-US']?.name ?? '기본', ko: this.voices['ko-KR']?.name ?? '기본' };
  }

  onSpeak(f: (e: SpeakEvent | null) => void) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  has(id: string) {
    return !!manifest[id];
  }

  textOf(id: string) {
    return manifest[id]?.text ?? '';
  }

  /** Queue a line; resolves when it finished (or was cancelled). */
  say(id: string, opts: { rate?: number } = {}): Promise<void> {
    const gen = this.generation;
    const run = async () => {
      if (gen !== this.generation) return;
      await this.play(id, opts.rate, gen);
    };
    this.chain = this.chain.then(run, run);
    return this.chain;
  }

  /** Several lines in order with small pauses. */
  async sayAll(ids: string[], gapMs = 250) {
    for (const id of ids) {
      await this.say(id);
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  /** Stop everything queued and speaking now. */
  cancel() {
    this.generation++;
    this.chain = Promise.resolve();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try {
      this.current?.stop();
    } catch {
      /* already stopped */
    }
    this.current = null;
    this.emit(null);
  }

  /** Cancel then speak immediately (e.g. ear button, tapping a card). */
  sayNow(id: string, opts: { rate?: number } = {}) {
    this.cancel();
    return this.say(id, opts);
  }

  private emit(e: SpeakEvent | null) {
    audio.duck(!!e);
    for (const f of this.listeners) f(e);
  }

  private async play(id: string, rate: number | undefined, gen: number) {
    const e = manifest[id];
    if (!e) {
      console.warn('missing voice line', id);
      return;
    }
    if (this.lastLang && this.lastLang !== e.lang) await new Promise((r) => setTimeout(r, 250));
    if (gen !== this.generation) return;
    this.lastLang = e.lang;
    if (e.file && audio.ctx) {
      const ok = await this.playFile(id, e.file, gen);
      if (ok) return;
    }
    await this.speak(id, e, rate, gen);
  }

  private async playFile(id: string, file: string, gen: number): Promise<boolean> {
    try {
      let buf = this.buffers.get(file);
      if (!buf) {
        const res = await fetch(`${import.meta.env.BASE_URL}${file}`);
        if (!res.ok) return false;
        buf = await audio.ctx!.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(file, buf);
      }
      if (gen !== this.generation) return true;
      const src = audio.ctx!.createBufferSource();
      src.buffer = buf;
      src.connect(audio.voice);
      this.current = src;
      const e = manifest[id]!;
      this.emit({ id, lang: e.lang, text: e.text, ms: buf.duration * 1000 });
      await new Promise<void>((resolve) => {
        src.onended = () => resolve();
        src.start();
      });
      this.emit(null);
      return true;
    } catch {
      return false;
    }
  }

  private speak(id: string, e: Entry, rate: number | undefined, gen: number): Promise<void> {
    if (!('speechSynthesis' in window)) {
      return new Promise((r) => setTimeout(r, 400));
    }
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(e.text);
      u.lang = e.lang;
      const v = this.voices[e.lang];
      if (v) u.voice = v;
      u.rate = rate ?? (e.lang === 'en-US' ? this.enRate : this.koRate);
      u.pitch = e.lang === 'en-US' ? 1.1 : 1.05;
      const perChar = e.lang === 'en-US' ? 85 : 170;
      const est = Math.max(600, (e.text.length * perChar) / u.rate);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.live.delete(u);
        clearTimeout(timer);
        this.emit(null);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      const timer = setTimeout(finish, est + 2500);
      this.live.add(u);
      if (gen !== this.generation) return finish();
      this.emit({ id, lang: e.lang, text: e.text, ms: est });
      window.speechSynthesis.speak(u);
    });
  }
}

export const voice = new Voice();
