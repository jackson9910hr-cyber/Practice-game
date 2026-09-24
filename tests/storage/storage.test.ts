import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, beginDay, createSave, meetFriend } from '../../src/core/progress';
import { migrate, migrations } from '../../src/storage/migrations';
import { exportBackup, importBackup } from '../../src/storage/backup';
import {
  addRecording,
  applyRetention,
  clearRecordings,
  listRecordings,
  loadSave,
  wipeAll,
  writeSave,
} from '../../src/storage/db';

describe('save migrations', () => {
  it('creates a fresh save for empty storage', () => {
    const r = migrate(undefined, 1);
    expect(r.save.playDay).toBe(0);
    expect(r.reset).toBe(false);
  });

  it('resets (without crashing) on garbage or future versions', () => {
    expect(migrate('garbage', 1).reset).toBe(true);
    expect(migrate({ schemaVersion: SCHEMA_VERSION + 5, playDay: 3, words: {} }, 1).reset).toBe(true);
    expect(migrate({ schemaVersion: 1, nope: true }, 1).reset).toBe(true);
  });

  it('upgrades a v0 prototype save to the current version, keeping progress', () => {
    const v0 = {
      playDay: 4,
      words: { red: { introducedDay: 1 } },
      friendsMet: ['sami'],
      settings: { dailyMinutes: 20 },
    };
    const r = migrate(v0, 1);
    expect(r.migrated).toBe(true);
    expect(r.save.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.save.playDay).toBe(4);
    expect(r.save.settings.dailyMinutes).toBe(20);
    expect(r.save.settings.recordingEnabled).toBe(false);
    expect(r.save.decorations).toEqual({});
  });

  it('keeps current saves as-is', () => {
    const s = meetFriend(beginDay(createSave(1), '2026-01-01').save);
    const r = migrate(JSON.parse(JSON.stringify(s)), 2);
    expect(r.migrated).toBe(false);
    expect(r.save).toEqual(s);
  });

  it('has a migration step for every older version', () => {
    for (let v = 0; v < SCHEMA_VERSION; v++) expect(migrations[v]).toBeTypeOf('function');
  });

  it('fails safe when a migration step is missing', () => {
    const saved = migrations[0];
    delete migrations[0];
    expect(migrate({ schemaVersion: 0, playDay: 1, words: {} }, 1).reset).toBe(true);
    migrations[0] = saved!;
  });
});

describe('backup', () => {
  const s = meetFriend(beginDay(createSave(1), '2026-01-01').save);

  it('round-trips', () => {
    const r = importBackup(exportBackup(s, 5), 6);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.save.words).toEqual(s.words);
  });

  it('rejects tampered, foreign and broken files', () => {
    const txt = exportBackup(s, 5);
    const obj = JSON.parse(txt);
    obj.data = obj.data.replace('"playDay":1', '"playDay":29');
    expect(importBackup(JSON.stringify(obj), 6)).toEqual({ ok: false, reason: 'checksum' });
    expect(importBackup('{"hello":1}', 6)).toEqual({ ok: false, reason: 'format' });
    expect(importBackup('not json', 6)).toEqual({ ok: false, reason: 'format' });
    const bad = JSON.parse(txt);
    bad.data = '{"x":1}';
    const sum = JSON.parse(exportBackup({ x: 1 } as never, 1)).sum;
    bad.sum = sum;
    expect(importBackup(JSON.stringify(bad), 6)).toEqual({ ok: false, reason: 'version' });
  });
});

describe('IndexedDB persistence', () => {
  it('writes and loads the save', async () => {
    const s = meetFriend(beginDay(createSave(1), '2026-01-01').save);
    await writeSave(s);
    const r = await loadSave(2);
    expect(r.save.friendsMet).toEqual(['sami']);
  });

  it('stores recordings on device and applies retention', async () => {
    await clearRecordings();
    const blob = new Blob(['x'], { type: 'audio/mp4' });
    await addRecording('I like red.', blob, 1000);
    await addRecording('I like blue.', blob, 1000 + 2 * 86_400_000);
    expect(await listRecordings()).toHaveLength(2);
    expect(await applyRetention('manual', 1000 + 3 * 86_400_000)).toBe(0);
    expect(await applyRetention('1d', 1000 + 2.5 * 86_400_000)).toBe(1);
    expect(await listRecordings()).toHaveLength(1);
    expect(await applyRetention('session', 1000 + 2.5 * 86_400_000)).toBe(1);
    await wipeAll();
    expect(await listRecordings()).toHaveLength(0);
    expect((await loadSave(3)).save.playDay).toBe(0);
  });
});
