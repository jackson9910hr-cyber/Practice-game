import { words } from '../../src/core/content';
import { beginDay, createSave, meetFriend, type SaveData } from '../../src/core/progress';
import { introduce, recordExposure } from '../../src/core/srs';

/** A save where every day before `day` was played normally. */
export function saveAt(day: number): SaveData {
  let s = beginDay(createSave(0), '2026-01-01').save;
  s = { ...s, playDay: day };
  for (let d = 1; d < day; d++) {
    const ids = words.filter((w) => w.day === d).map((w) => w.id);
    s = { ...s, words: introduce(s.words, ids, d) };
    for (const id of ids) s = { ...s, words: recordExposure(s.words, id, d, 'correct') };
  }
  return meetFriend(s);
}
