/**
 * Balance simulator (Stage 4): plays 30 play-days with virtual children through the *real*
 * scheduler, round builders, game logic and bookkeeping, then reports exposures, missed
 * reviews, stuck days and boring days. Pure & deterministic (seeded).
 */
import { applyAnswer, exposeWords, startLevel } from './answers';
import { assistFor, needsHelp } from './feedback';
import { LAST_DAY, chants, getDay, getWord, hasWord, sentences, words as allWords } from './content';
import { levelParams } from './levels';
import {
  addPlayTime,
  beginDay,
  completeStation,
  createSave,
  curriculumDay,
  meetFriend,
  setStations,
  type SaveData,
} from './progress';
import { createRng, type Rng } from './rng';
import { festivalWords, pickLetters, pickSentences, recapWords } from './rounds';
import { planDay } from './scheduler';
import { REVIEW_OFFSETS } from './srs';
import type { GameId, StationPlan } from './types';
import { makeWordGardenRound } from '../games/word-garden/logic';
import { makeButterflyRound } from '../games/sound-butterfly/logic';
import { makeHangulRound } from '../games/hangul-pieces/logic';
import { answerOf, makeFireflyRound } from '../games/number-fireflies/logic';
import { makePatternRound, nameOf } from '../games/pattern-path/logic';
import { makeAntRound } from '../games/ant-path/logic';
import { makeTrainQuestion } from '../games/sentence-train/logic';

export interface Kid {
  name: string;
  /** first-try success probability on an easy, familiar item */
  base: number;
  /** seconds per question on the first try */
  secPerQuestion: number;
}

export const KIDS: Kid[] = [
  { name: '빠른 아이', base: 0.9, secPerQuestion: 7 },
  { name: '보통 아이', base: 0.78, secPerQuestion: 10 },
  { name: '느린 아이', base: 0.64, secPerQuestion: 14 },
];

const ARRIVAL_SEC = 100;
const GOODNIGHT_SEC = 45;
const STATION_OVERHEAD_SEC = 20;

interface Item {
  words?: string[];
  letter?: string;
  /** extra passive exposures heard while answering */
  heard?: string[];
}

function level(save: SaveData, game: GameId, mode: number) {
  return save.adaptive[`${game}:${mode}`]?.level ?? startLevel(save, game, mode);
}

function itemsFor(save: SaveData, plan: StationPlan, day: number, rng: Rng): Item[] {
  const game = plan.game!;
  const mode = plan.mode;
  const lvl = level(save, game, mode);
  switch (game) {
    case 'word-garden': {
      const r = makeWordGardenRound(save, day, mode, levelParams(game, lvl), rng, plan.review);
      return 'memory' in r
        ? r.memory.pairs.map((id) => ({ words: [id] }))
        : r.questions.map((q) => ({ words: [q.target] }));
    }
    case 'sound-butterfly': {
      const letters = mode <= 2 ? pickLetters(save, day, 6, rng) : [];
      return makeButterflyRound(mode, letters, day, levelParams(game, lvl), rng).map((q) =>
        q.kind === 'letter' || q.kind === 'sound-match'
          ? { letter: q.letter, heard: q.kind === 'sound-match' ? q.options.filter(hasWord) : [] }
          : { words: hasWord(q.word) ? [q.word] : [] },
      );
    }
    case 'sentence-train': {
      const learned = Object.keys(save.words);
      const tp = levelParams(game, lvl);
      return pickSentences(save, day, tp.sentences, mode, rng, plan.review, tp.maxCardsL1).map((s) => {
        const q = makeTrainQuestion(s, mode, levelParams(game, lvl), rng, learned);
        return { words: [...s.words, ...(q.answer?.colorWord ? [q.answer.colorWord] : [])] };
      });
    }
    case 'hangul-pieces':
      return makeHangulRound(mode, levelParams(game, lvl), rng).map(() => ({}));
    case 'number-fireflies':
      return makeFireflyRound(mode, levelParams(game, lvl), rng).map((q) => {
        const n = answerOf(q);
        // counting aloud in English: "one, two, three…" (children tap each firefly)
        const heard =
          q.kind === 'count'
            ? Array.from({ length: Math.min(q.n, 10) - 1 }, (_, i) => numberWord(i + 1))
            : [];
        return { words: n >= 1 && n <= 10 ? [numberWord(n)] : [], heard };
      });
    case 'pattern-path':
      return makePatternRound(mode, levelParams(game, lvl), rng).map((q) => ({
        words: mode >= 3 ? nameOf(q.answer, q.dims).filter(hasWord) : [],
        heard: mode >= 4 ? q.row.flatMap((f) => nameOf(f, q.dims)).filter(hasWord) : [],
      }));
    case 'ant-path':
      return makeAntRound(levelParams(game, lvl), rng, 4).map(() => ({}));
  }
}

const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function numberWord(n: number) {
  return NUM[n]!;
}

function successP(kid: Kid, save: SaveData, plan: StationPlan, item: Item, day: number): number {
  const lvl = level(save, plan.game!, plan.mode);
  let p = kid.base - 0.012 * (lvl - 1) - 0.03 * (plan.mode - 1) + 0.004 * day;
  const ws = (item.words ?? []).map((id) => save.words[id]).filter((w) => !!w);
  if (ws.length) {
    // familiarity is averaged over the item's words (a longer sentence is not "easier")
    const fam = ws.reduce((a, w) => a + Math.min(w.correct, 4) / 4, 0) / ws.length;
    const fresh = ws.filter((w) => w.introducedDay === day && w.correct === 0).length / ws.length;
    p += 0.14 * fam - 0.12 * fresh;
  }
  if (plan.game === 'sentence-train') p -= 0.03 * Math.max(0, (item.words?.length ?? 1) - 1);
  return Math.min(0.97, Math.max(0.2, p));
}

export interface DayRow {
  day: number;
  minutes: number;
  planned: number;
  done: number;
  correct: number;
  wrong: number;
  lineup: string;
  perGame: Record<string, { c: number; w: number }>;
  stuck: string[];
  bored: string[];
}

export interface SimResult {
  kid: Kid;
  days: DayRow[];
  exposures: Record<string, number>;
  missedReviews: { word: string; offset: number }[];
  finalLevels: Record<string, number>;
  save: SaveData;
}

export function simulateKid(kid: Kid, seed = 1, dailyMinutes = 15): SimResult {
  const rng = createRng(seed);
  let save = createSave(0);
  save = { ...save, settings: { ...save.settings, dailyMinutes } };
  const rows: DayRow[] = [];
  let prevLineup = '';
  const sessions: Record<string, number[]> = {};
  for (let d = 1; d <= LAST_DAY; d++) {
    const key = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
    save = beginDay(save, key).save;
    const day = curriculumDay(save);
    save = meetFriend(save);
    save = setStations(save, planDay(save));
    save = addPlayTime(save, ARRIVAL_SEC);
    const limit = dailyMinutes * 60;
    const plan = save.today!.stations;
    const row: DayRow = {
      day,
      minutes: 0,
      planned: plan.length,
      done: 0,
      correct: 0,
      wrong: 0,
      lineup: plan.map((p) => `${p.game ?? p.kind}:${p.mode}`).join(' '),
      perGame: {},
      stuck: [],
      bored: [],
    };
    for (const st of plan) {
      if (save.today!.seconds >= limit - GOODNIGHT_SEC) break;
      if (!st.game) {
        if (st.kind === 'chant') {
          const ch = chants.find((c) => c.chapter === getDay(day).chapter)!;
          save = exposeWords(
            save,
            ch.lines.flatMap((l) => l.words),
            day,
          );
          save = addPlayTime(save, 70);
        } else if (st.kind === 'finale') {
          save = exposeWords(
            save,
            sentences.filter((s) => s.id.endsWith('-1')).flatMap((s) => s.words),
            day,
          );
          save = exposeWords(save, getDay(day).words, day); // Lumi's word gift
          save = exposeWords(save, festivalWords(), day); // festival chant
          save = addPlayTime(save, 150);
        } else save = addPlayTime(save, 60);
        save = completeStation(save, undefined, 0);
        row.done++;
        continue;
      }
      const items = itemsFor(save, st, day, rng);
      const help = needsHelp(save.adaptive[`${st.game}:${st.mode}`]);
      for (const it of items) {
        let wrongs = 0;
        // the UI: every wrong tap is recorded; hint after 2, together after 3
        while (true) {
          const assist = assistFor(wrongs, help);
          const p = Math.min(0.98, successP(kid, save, st, it, day) + (assist === 'hint' ? 0.25 : 0));
          const ok = assist === 'together' || rng.chance(p);
          save = applyAnswer(save, {
            game: st.game,
            mode: st.mode,
            day,
            correct: ok,
            assisted: assist === 'together',
            words: it.words,
            letter: it.letter,
          });
          const g = (row.perGame[`${st.game}:${st.mode}`] ??= { c: 0, w: 0 });
          if (ok) {
            if (wrongs === 0) g.c++;
            else g.w++;
            break;
          }
          wrongs++;
        }
        if (it.heard?.length) save = exposeWords(save, it.heard, day);
        save = addPlayTime(save, kid.secPerQuestion * (1 + 0.6 * wrongs));
      }
      save = addPlayTime(save, STATION_OVERHEAD_SEC);
      save = completeStation(save, st.game, st.mode);
      row.done++;
    }
    // goodnight recap: 3 of today's words
    save = exposeWords(save, recapWords(save, day), day);
    save = addPlayTime(save, GOODNIGHT_SEC);
    row.minutes = Math.round(save.today!.seconds / 6) / 10;
    for (const [g, v] of Object.entries(row.perGame)) {
      row.correct += v.c;
      row.wrong += v.w;
      const acc = v.c / Math.max(1, v.c + v.w);
      const hist = (sessions[g] ??= []);
      hist.push(acc);
      // persistent struggle: this game mode below 60% first-try in two sessions in a row
      if (hist.length >= 2 && hist.slice(-2).every((a) => a < 0.6))
        row.stuck.push(
          `${g} ${hist
            .slice(-2)
            .map((a) => Math.round(a * 100))
            .join('→')}%`,
        );
      // plateau: ≥95% in three sessions in a row despite the adaptive level rising
      if (hist.length >= 3 && hist.slice(-3).every((a) => a >= 0.95))
        row.bored.push(`${g} ${Math.round(acc * 100)}%×3`);
    }
    if (row.done < row.planned) row.stuck.push(`시간 부족 ${row.done}/${row.planned}`);
    if (row.lineup === prevLineup) row.bored.push('어제와 같은 구성');
    prevLineup = row.lineup;
    rows.push(row);
  }
  const exposures: Record<string, number> = {};
  const missed: { word: string; offset: number }[] = [];
  for (const w of allWords) {
    const ws = save.words[w.id];
    exposures[w.id] = ws?.exposures ?? 0;
    for (const off of REVIEW_OFFSETS) {
      if (w.day + off + 1 <= LAST_DAY && !(ws?.reviewsDone.includes(off) ?? false))
        missed.push({ word: w.id, offset: off });
    }
  }
  const finalLevels: Record<string, number> = {};
  for (const [k, a] of Object.entries(save.adaptive)) finalLevels[k] = a.level;
  return { kid, days: rows, exposures, missedReviews: missed, finalLevels, save };
}

export function simulateAll(seed = 7) {
  return KIDS.map((k, i) => simulateKid(k, seed + i));
}

export function wordLabel(id: string) {
  const w = getWord(id);
  return `${w.en}(D${w.day})`;
}
