import { describe, expect, it } from 'vitest';
import { assistFor, createPraiser } from '../../src/core/feedback';
import { createRng } from '../../src/core/rng';

describe('assist ladder', () => {
  it('no help for the first mistake, hint on the 2nd, together on the 3rd', () => {
    expect(assistFor(0)).toBe('none');
    expect(assistFor(1)).toBe('none');
    expect(assistFor(2)).toBe('hint');
    expect(assistFor(3)).toBe('together');
    expect(assistFor(7)).toBe('together');
  });
});

describe('praise rotation', () => {
  it('never repeats the same line twice in a row', () => {
    const p = createPraiser(['a', 'b', 'c'], ['BIG'], createRng(5));
    let prev = '';
    for (let i = 0; i < 200; i++) {
      const { text } = p.next(1);
      expect(text).not.toBe(prev);
      prev = text;
    }
  });

  it('gives a big praise on every 3rd streak answer', () => {
    const p = createPraiser(['a', 'b'], ['BIG', 'HUGE'], createRng(1));
    expect(p.next(3).big).toBe(true);
    expect(p.next(4).big).toBe(false);
    expect(p.next(0).big).toBe(false);
  });

  it('works with a single line', () => {
    const p = createPraiser(['only'], [], createRng(1));
    expect(p.next(3).text).toBe('only');
  });
});
