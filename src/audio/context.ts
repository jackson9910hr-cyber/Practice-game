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
    // iOS: the first speechSynthesis.speak must also happen inside a gesture.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    this.unlocked = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx?.state !== 'running') void this.ctx?.resume();
    });
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
