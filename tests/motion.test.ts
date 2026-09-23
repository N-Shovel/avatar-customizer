import { describe, expect, it } from 'vitest';
import { Tweens, easeInOutCubic, nearestAngle } from '../src/preview/motion';

describe('motion', () => {
  it('turns the short way round', () => {
    // From just past a full turn, "front" (0) is a small step back, not a full spin.
    expect(nearestAngle(2 * Math.PI + 0.1, 0)).toBeCloseTo(2 * Math.PI);
    expect(nearestAngle(0, (3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2);
    expect(nearestAngle(-3, Math.PI)).toBeCloseTo(-Math.PI);
  });

  it('eases from 0 to 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('finishes tweens and lets a new one replace an old one', () => {
    const tweens = new Tweens();
    const seen: number[] = [];
    tweens.run('a', 100, (t) => seen.push(t));
    tweens.run('a', 100, (t) => seen.push(t * 10));
    tweens.update(performance.now() + 1000);
    tweens.update(performance.now() + 2000);
    expect(seen).toEqual([10]);
  });
});
