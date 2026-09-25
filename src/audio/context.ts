/**
 * Shared Web Audio graph. iOS only allows audio after a user gesture, so `unlock()` must be
 * called from the first tap (the "별을 눌러줘" boot screen).
 */
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

class AudioHub {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  voice!: GainNode;
  unlocked = false;

  private create() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.master);
    this.voice = this.ctx.createGain();
    this.voice.gain.value = 1;
    this.voice.connect(this.master);
  }

  /** Call synchronously inside a user gesture handler. */
  unlock() {
    this.create();
    const ctx = this.ctx!;
    // Play through the ring/silent switch where the Audio Session API exists (Safari 17+).
    const nav = navigator as AudioSessionNav;
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* not supported */
    }
    if (ctx.state !== 'running') void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    this.startKeepAlive();
    // iOS: the first speechSynthesis.speak must also happen inside a gesture.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    this.unlocked = true;
    this.hookLifecycle();
  }

  /**
   * Older iOS (no Audio Session API) mutes Web Audio when the ring/silent switch is on — but a
   * playing <audio> element moves the page into the "playback" category, which ignores the
   * switch. A looping silent WAV (made in memory → blob:, allowed by the CSP) does exactly that.
   */
  private keepAlive: HTMLAudioElement | null = null;
  private startKeepAlive() {
    if (this.keepAlive) return void this.keepAlive.play().catch(() => undefined);
    const sr = 8000;
    const n = sr; // 1 s of silence
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + n, true);
    str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); // PCM
    v.setUint16(22, 1, true); // mono
    v.setUint32(24, sr, true);
    v.setUint32(28, sr, true);
    v.setUint16(32, 1, true);
    v.setUint16(34, 8, true); // 8-bit
    str(36, 'data');
    v.setUint32(40, n, true);
    new Uint8Array(buf, 44).fill(128); // 8-bit silence
    const el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    el.loop = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('x-webkit-airplay', 'deny');
    this.keepAlive = el;
    void el.play().catch(() => undefined);
  }

  private hooked = false;
  /** Suspend when hidden (no background audio), resume when visible, recover iOS "interrupted". */
  private hookLifecycle() {
    if (this.hooked || !this.ctx) return;
    this.hooked = true;
    const ctx = this.ctx;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void ctx.suspend();
        this.keepAlive?.pause();
        this.onHidden?.();
      } else {
        void ctx.resume();
        void this.keepAlive?.play().catch(() => undefined);
        this.onVisible?.();
      }
    });
    // Siri / alarms / calls interrupt audio without a visibility change: resume on the next touch
    ctx.addEventListener('statechange', () => {
      if (ctx.state !== 'running' && document.visibilityState === 'visible') {
        window.addEventListener('pointerdown', () => void ctx.resume(), { once: true });
      }
    });
  }

  onHidden?: () => void;
  onVisible?: () => void;

  /** Recording needs the play-and-record session on iOS; switch back to playback afterwards. */
  setSession(type: 'playback' | 'play-and-record') {
    const nav = navigator as AudioSessionNav;
    try {
      if (nav.audioSession) nav.audioSession.type = type;
    } catch {
      /* not supported */
    }
  }

  get now() {
    return this.ctx?.currentTime ?? 0;
  }

  /** Lower music while someone speaks. */
  duck(on: boolean) {
    if (!this.ctx) return;
    const g = this.music.gain;
    g.cancelScheduledValues(this.now);
    g.setTargetAtTime(on ? 0.18 : 0.55, this.now, 0.15);
  }
}

export const audio = new AudioHub();
