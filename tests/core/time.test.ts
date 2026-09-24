import { describe, expect, it } from 'vitest';
import { dayKey } from '../../src/core/time';

const KST = 540;

describe('dayKey (Korean day with 04:00 boundary)', () => {
  it('uses the local calendar date during the day', () => {
    // 2026-09-24 12:00 KST == 03:00 UTC
    expect(dayKey(Date.UTC(2026, 8, 24, 3, 0), KST)).toBe('2026-09-24');
  });

  it('counts late night before 04:00 as the previous day', () => {
    // 2026-09-25 02:30 KST == 2026-09-24 17:30 UTC
    expect(dayKey(Date.UTC(2026, 8, 24, 17, 30), KST)).toBe('2026-09-24');
  });

  it('switches at exactly 04:00', () => {
    // 2026-09-25 04:00 KST == 2026-09-24 19:00 UTC
    expect(dayKey(Date.UTC(2026, 8, 24, 19, 0), KST)).toBe('2026-09-25');
  });

  it('handles month and year rollover', () => {
    expect(dayKey(Date.UTC(2026, 11, 31, 20, 0), KST)).toBe('2027-01-01');
  });

  it('supports other offsets', () => {
    expect(dayKey(Date.UTC(2026, 0, 1, 10, 0), 0)).toBe('2026-01-01');
    expect(dayKey(Date.UTC(2026, 0, 1, 2, 0), 0)).toBe('2025-12-31');
  });
});
