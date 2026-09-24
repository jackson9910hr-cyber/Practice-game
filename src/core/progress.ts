/**
 * Save data model and play-day progression. Pure: every function returns a new SaveData.
 * Progress is counted in *play days* (days the child actually met the day's friend),
 * so skipping calendar days never skips content.
 */
import { LAST_DAY, getDay } from './content';
import { introduce, type WordStates } from './srs';
import type { AdaptiveState } from './adaptive';
import type { GameId, StationPlan } from './types';

export const SCHEMA_VERSION = 1;

export const STARLIGHT_PER_CORRECT = 1;
export const STARLIGHT_PER_STATION = 3;

export type Retention = 'session' | '1d' | '7d' | 'manual';

export interface Settings {
  dailyMinutes: number;
  recordingEnabled: boolean;
  recordingRetention: Retention;
  musicOn: boolean;
}

export interface TodayState {
  dayKey: string;
  playDay: number;
  seconds: number;
  stations: StationPlan[];
  stationsDone: number;
  friendMet: boolean;
  planted: boolean;
  goodnight: boolean;
  correct: number;
  wrong: number;
}

export interface GameStat {
  played: number;
  correct: number;
  wrong: number;
  lastPlayedDay: number;
  lastMode: number;
}

export interface DayLog {
  playDay: number;
  dayKey: string;
  seconds: number;
  stationsDone: number;
  correct: number;
  wrong: number;
}

export interface SaveData {
  schemaVersion: number;
  createdAt: number;
  playDay: number;
  lastDayKey: string | null;
  today: TodayState | null;
  log: DayLog[];
  starlight: number;
  starlightTotal: number;
  words: WordStates;
  adaptive: Partial<Record<GameId, AdaptiveState>>;
  games: Partial<Record<GameId, GameStat>>;
  letters: Record<string, { correct: number; wrong: number }>;
  patternsSeen: Record<string, number>;
  friendsMet: string[];
  decorations: Record<string, string>;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return { dailyMinutes: 15, recordingEnabled: false, recordingRetention: '7d', musicOn: true };
}

export function createSave(now: number): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    playDay: 0,
    lastDayKey: null,
    today: null,
    log: [],
    starlight: 0,
    starlightTotal: 0,
    words: {},
    adaptive: {},
    games: {},
    letters: {},
    patternsSeen: {},
    friendsMet: [],
    decorations: {},
    settings: defaultSettings(),
  };
}

function freshToday(dayKey: string, playDay: number): TodayState {
  return {
    dayKey,
    playDay,
    seconds: 0,
    stations: [],
    stationsDone: 0,
    friendMet: false,
    planted: false,
    goodnight: false,
    correct: 0,
    wrong: 0,
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type BeginStatus = 'first' | 'new-day' | 'returned' | 'same-day';

export function beginDay(save: SaveData, key: string): { save: SaveData; status: BeginStatus } {
  if (save.lastDayKey === key && save.today) return { save, status: 'same-day' };
  if (save.playDay === 0 || !save.today) {
    const day = Math.max(save.playDay, 1);
    return { save: { ...save, playDay: day, lastDayKey: key, today: freshToday(key, day) }, status: 'first' };
  }
  const prev = save.today;
  const log = prev.seconds > 0 || prev.friendMet ? [...save.log, toLog(prev)] : save.log;
  const advance = prev.friendMet;
  const day = advance ? save.playDay + 1 : save.playDay;
  const gap = save.lastDayKey ? daysBetween(save.lastDayKey, key) : 1;
  return {
    save: { ...save, playDay: day, lastDayKey: key, today: freshToday(key, day), log },
    status: gap > 1 ? 'returned' : 'new-day',
  };
}

function toLog(t: TodayState): DayLog {
  return {
    playDay: t.playDay,
    dayKey: t.dayKey,
    seconds: t.seconds,
    stationsDone: t.stationsDone,
    correct: t.correct,
    wrong: t.wrong,
  };
}

/** Curriculum day used for content (play days past 30 keep reviewing day-30 content). */
export function curriculumDay(save: SaveData): number {
  return Math.min(Math.max(save.playDay, 1), LAST_DAY);
}

export function meetFriend(save: SaveData): SaveData {
  if (!save.today || save.today.friendMet) return save;
  const day = curriculumDay(save);
  const cd = getDay(day);
  const already = save.friendsMet.includes(cd.friend);
  return {
    ...save,
    words: introduce(save.words, cd.words, day),
    friendsMet: already ? save.friendsMet : [...save.friendsMet, cd.friend],
    today: { ...save.today, friendMet: true },
  };
}

export function setStations(save: SaveData, stations: StationPlan[]): SaveData {
  if (!save.today) return save;
  return { ...save, today: { ...save.today, stations } };
}

export function addPlayTime(save: SaveData, seconds: number): SaveData {
  if (!save.today) return save;
  return { ...save, today: { ...save.today, seconds: save.today.seconds + seconds } };
}

export function secondsLeft(save: SaveData): number {
  const used = save.today?.seconds ?? 0;
  return Math.max(0, save.settings.dailyMinutes * 60 - used);
}

function statOf(save: SaveData, game: GameId): GameStat {
  return save.games[game] ?? { played: 0, correct: 0, wrong: 0, lastPlayedDay: 0, lastMode: 0 };
}

export function recordAnswerStats(save: SaveData, game: GameId, correct: boolean): SaveData {
  const st = statOf(save, game);
  const today = save.today
    ? {
        ...save.today,
        correct: save.today.correct + (correct ? 1 : 0),
        wrong: save.today.wrong + (correct ? 0 : 1),
      }
    : null;
  const gain = correct ? STARLIGHT_PER_CORRECT : 0;
  return {
    ...save,
    today,
    starlight: save.starlight + gain,
    starlightTotal: save.starlightTotal + gain,
    games: {
      ...save.games,
      [game]: { ...st, correct: st.correct + (correct ? 1 : 0), wrong: st.wrong + (correct ? 0 : 1) },
    },
  };
}

export function completeStation(save: SaveData, game: GameId | undefined, mode: number): SaveData {
  const today = save.today ? { ...save.today, stationsDone: save.today.stationsDone + 1 } : null;
  let games = save.games;
  if (game) {
    const st = statOf(save, game);
    games = {
      ...games,
      [game]: { ...st, played: st.played + 1, lastPlayedDay: save.playDay, lastMode: mode },
    };
  }
  return {
    ...save,
    today,
    games,
    starlight: save.starlight + STARLIGHT_PER_STATION,
    starlightTotal: save.starlightTotal + STARLIGHT_PER_STATION,
  };
}

export function spendStarlight(save: SaveData, amount: number): SaveData | null {
  if (save.starlight < amount) return null;
  return { ...save, starlight: save.starlight - amount };
}

export function markToday(
  save: SaveData,
  patch: Partial<Pick<TodayState, 'planted' | 'goodnight'>>,
): SaveData {
  if (!save.today) return save;
  return { ...save, today: { ...save.today, ...patch } };
}
