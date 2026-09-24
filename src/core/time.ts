/** Hour (local) at which a new play day starts, so late-night play still counts as "today". */
export const DAY_BOUNDARY_HOUR = 4;
/** Asia/Seoul offset in minutes (UTC+9, no DST). */
export const KST_OFFSET_MIN = 540;

export interface Clock {
  now(): number;
}

/**
 * Stable key for the local "game day": YYYY-MM-DD in the given UTC offset,
 * shifted so that the day changes at DAY_BOUNDARY_HOUR instead of midnight.
 */
export function dayKey(
  epochMs: number,
  offsetMin = KST_OFFSET_MIN,
  boundaryHour = DAY_BOUNDARY_HOUR,
): string {
  const shifted = new Date(epochMs + (offsetMin - boundaryHour * 60) * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
