/**
 * Boot: the HTML star screen is visible instantly; on the first tap we unlock audio (iOS),
 * then load Pixi + the save and route to the right scene.
 */
import './styles.css';
// CSP-safe Pixi (no eval/new Function for shader uniforms)
import 'pixi.js/unsafe-eval';
import { GameApp } from './engine/app';
import { Router } from './engine/scene';
import { nav } from './flow';
import { store } from './state';
import { audio } from './audio/context';
import { voice } from './audio/voice';
import { music } from './audio/music';
import { dayKey } from './core/time';
import { addPlayTime, beginDay, curriculumDay, setStations } from './core/progress';
import { planDay } from './core/scheduler';
import { getDay } from './core/content';
import { applyRetention, loadSave, requestPersistence } from './storage/db';
import { HubScene } from './scenes/hub';
import { ArrivalScene } from './scenes/arrival';
import { GoodnightScene } from './scenes/goodnight';
import { CodexScene } from './scenes/codex';
import { ChapterScene, specialFor } from './scenes/special';
import { FinaleScene } from './scenes/special';
import { makeGameView } from './games/registry';
import { parentOpen } from './ui/parent';

const bootEl = document.getElementById('boot')!;
const startBtn = document.getElementById('start') as HTMLButtonElement;

async function boot() {
  const game = new GameApp();
  await game.init(document.getElementById('app')!);
  nav.game = game;
  nav.router = new Router(game);
  nav.f = {
    hub: () => new HubScene(game),
    arrival: () => new ArrivalScene(game),
    station: (i, plan) => (plan.game ? makeGameView(game, plan, i) : specialFor(game, plan, i)),
    goodnight: (r) => new GoodnightScene(game, r),
    codex: () => new CodexScene(game),
    chapter: (n) => new ChapterScene(game, n),
    finale: () => new FinaleScene(game, null, 0),
  };

  const now = Date.now();
  const { save } = await loadSave(now);
  const tz = -new Date().getTimezoneOffset();
  const r = beginDay(save, dayKey(now, tz));
  let s = r.save;
  if (s.today && s.today.friendMet && s.today.stations.length === 0) s = setStations(s, planDay(s));
  store.init(s);
  await store.flush();
  music.setEnabled(s.settings.musicOn);
  void requestPersistence();
  void applyRetention(s.settings.recordingRetention, now);

  // play-time accounting (paused while hidden or while a parent is in the settings)
  setInterval(() => {
    if (document.visibilityState === 'visible' && !parentOpen) store.update((x) => addPlayTime(x, 5));
  }, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      voice.cancel();
      void store.flush();
    }
  });
  window.addEventListener('pagehide', () => void store.flush());

  const today = store.save.today!;
  const day = curriculumDay(store.save);
  if (!today.friendMet && store.save.playDay <= 30) {
    const cd = getDay(day);
    const chapterStart = [8, 15, 22].includes(day);
    if (chapterStart) await nav.chapter(cd.chapter);
    else await nav.arrival();
  } else {
    await nav.hub();
  }
}

let started = false;
startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  audio.unlock();
  voice.init();
  bootEl.classList.add('leaving');
  boot()
    .then(() => setTimeout(() => bootEl.remove(), 600))
    .catch((e) => {
      console.error(e);
      bootEl.classList.remove('leaving');
      bootEl.querySelector('.msg')!.textContent = '앗, 다시 한 번 눌러줘!';
      started = false;
    });
});

// Offline support (production only)
const isNative = !!(
  window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
).Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative) {
  window.addEventListener(
    'load',
    () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`),
  );
}

// Dev-only hooks for automated play-testing (stripped from production builds).
if (import.meta.env.DEV) {
  void import('./dev').then((dev) => {
    (window as unknown as Record<string, unknown>).__sg = { store, nav, ...dev };
  });
}
