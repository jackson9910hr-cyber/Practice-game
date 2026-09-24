/** IndexedDB persistence (device-local only): one save document + on-device voice recordings. */
import { openDB, type IDBPDatabase } from 'idb';
import type { SaveData, Retention } from '../core/progress';
import { migrate } from './migrations';

interface RecordingRow {
  id?: number;
  at: number;
  sentence: string;
  blob: Blob;
}

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  dbp ??= openDB('starlight-garden', 1, {
    upgrade(d) {
      d.createObjectStore('kv');
      const r = d.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
      r.createIndex('at', 'at');
    },
  });
  return dbp;
}

export async function loadSave(now: number): Promise<{ save: SaveData; reset: boolean }> {
  try {
    const raw = await (await db()).get('kv', 'save');
    const r = migrate(raw, now);
    return { save: r.save, reset: r.reset };
  } catch {
    return { save: migrate(undefined, now).save, reset: false };
  }
}

export async function writeSave(save: SaveData): Promise<void> {
  try {
    await (await db()).put('kv', save, 'save');
  } catch (e) {
    console.error('save failed', e);
  }
}

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function addRecording(sentence: string, blob: Blob, at: number): Promise<number> {
  return (await (await db()).add('recordings', { at, sentence, blob } satisfies RecordingRow)) as number;
}

export async function listRecordings(): Promise<RecordingRow[]> {
  return (await (await db()).getAll('recordings')) as RecordingRow[];
}

export async function deleteRecording(id: number): Promise<void> {
  await (await db()).delete('recordings', id);
}

export async function clearRecordings(): Promise<void> {
  await (await db()).clear('recordings');
}

const RETENTION_MS: Record<Retention, number | null> = {
  session: 0,
  '1d': 86_400_000,
  '7d': 7 * 86_400_000,
  manual: null,
};

/** Deletes recordings older than the parent's retention setting (run at startup). */
export async function applyRetention(retention: Retention, now: number): Promise<number> {
  const keep = RETENTION_MS[retention];
  if (keep === null) return 0;
  const d = await db();
  const rows = (await d.getAll('recordings')) as RecordingRow[];
  let n = 0;
  for (const r of rows) {
    if (now - r.at >= keep) {
      await d.delete('recordings', r.id!);
      n++;
    }
  }
  return n;
}

export async function wipeAll(): Promise<void> {
  const d = await db();
  await d.clear('kv');
  await d.clear('recordings');
}
