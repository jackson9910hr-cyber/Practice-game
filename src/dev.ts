/** Dev-only helpers (never shipped): jump to any play day with a plausible history. */
import { words } from './core/content';
import { beginDay, createSave, meetFriend, setStations } from './core/progress';
import { planDay } from './core/scheduler';
import { introduce, recordExposure } from './core/srs';
import { store } from './state';
import { nav } from './flow';
import type { StationPlan } from './core/types';

export function simulateTo(day: number) {
  let s = beginDay(createSave(Date.now()), '2026-01-01').save;
  s = { ...s, playDay: day, starlight: 40 };
  for (let d = 1; d < day; d++) {
    const ids = words.filter((w) => w.day === d).map((w) => w.id);
    s = { ...s, words: introduce(s.words, ids, d) };
    for (const id of ids) s = { ...s, words: recordExposure(s.words, id, d, 'correct') };
    s = meetFriend({ ...s, playDay: d, today: { ...s.today!, friendMet: false } });
  }
  s = meetFriend({ ...s, playDay: day, today: { ...s.today!, friendMet: false, stations: [] } });
  s = setStations(s, planDay(s));
  store.init(s);
  return s.today!.stations;
}

export function play(plan: StationPlan, index = 0) {
  return nav.station(index, plan);
}
