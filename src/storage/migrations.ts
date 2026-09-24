/**
 * Save-data migrations. Each step upgrades exactly one version and must have a test.
 * Unknown / corrupt data never crashes the game: it falls back to a fresh save.
 */
import { SCHEMA_VERSION, createSave, defaultSettings, type SaveData } from '../core/progress';

type Step = (old: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] upgrades version n → n+1. Version 0 = pre-release prototype saves. */
export const migrations: Record<number, Step> = {
  0: (old) => ({
    ...old,
    schemaVersion: 1,
    decorations: old.decorations ?? {},
    letters: old.letters ?? {},
    patternsSeen: old.patternsSeen ?? {},
    settings: { ...defaultSettings(), ...((old.settings as object) ?? {}) },
  }),
};

function looksLikeSave(o: Record<string, unknown>): boolean {
  return typeof o.playDay === 'number' && typeof o.words === 'object' && o.words !== null;
}

export function migrate(raw: unknown, now: number): { save: SaveData; migrated: boolean; reset: boolean } {
  if (!raw || typeof raw !== 'object')
    return { save: createSave(now), migrated: false, reset: raw !== undefined && raw !== null };
  let o = raw as Record<string, unknown>;
  let v = typeof o.schemaVersion === 'number' ? o.schemaVersion : 0;
  if (v > SCHEMA_VERSION || !looksLikeSave(o)) return { save: createSave(now), migrated: false, reset: true };
  const start = v;
  while (v < SCHEMA_VERSION) {
    const step = migrations[v];
    if (!step) return { save: createSave(now), migrated: false, reset: true };
    o = step(o);
    v = o.schemaVersion as number;
  }
  const base = createSave(now);
  const save = { ...base, ...o, settings: { ...base.settings, ...(o.settings as object) } } as SaveData;
  return { save, migrated: v !== start, reset: false };
}
