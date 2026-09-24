/** Parent-initiated local backup: a JSON file the parent keeps. Nothing leaves the device by itself. */
import { migrate } from './migrations';
import type { SaveData } from '../core/progress';

const MAGIC = 'starlight-garden-backup';

function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function exportBackup(save: SaveData, now: number): string {
  const data = JSON.stringify(save);
  return JSON.stringify({ magic: MAGIC, exportedAt: now, sum: checksum(data), data });
}

export type ImportResult =
  { ok: true; save: SaveData } | { ok: false; reason: 'format' | 'checksum' | 'version' };

export function importBackup(text: string, now: number): ImportResult {
  let parsed: { magic?: string; sum?: string; data?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'format' };
  }
  if (parsed.magic !== MAGIC || typeof parsed.data !== 'string') return { ok: false, reason: 'format' };
  if (checksum(parsed.data) !== parsed.sum) return { ok: false, reason: 'checksum' };
  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data);
  } catch {
    return { ok: false, reason: 'format' };
  }
  const r = migrate(raw, now);
  if (r.reset) return { ok: false, reason: 'version' };
  return { ok: true, save: r.save };
}
