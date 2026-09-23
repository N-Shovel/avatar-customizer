import { describe, expect, it } from 'vitest';
import { SKIN_SIZE, type ModelType } from '../src/core/constants';
import { allRegions, getFaceRect, locatePixel, mirrorPixel } from '../src/core/uvMap';

describe('uvMap', () => {
  it('places the head front at the standard location', () => {
    expect(getFaceRect('classic', 'head', 'front', 'base')).toEqual({ x: 8, y: 8, w: 8, h: 8 });
    expect(getFaceRect('classic', 'head', 'front', 'overlay')).toEqual({ x: 40, y: 8, w: 8, h: 8 });
  });

  it('uses 3px wide arms for the slim model', () => {
    expect(getFaceRect('slim', 'rightArm', 'front', 'base')).toEqual({ x: 44, y: 20, w: 3, h: 12 });
    expect(getFaceRect('classic', 'rightArm', 'front', 'base')).toEqual({ x: 44, y: 20, w: 4, h: 12 });
  });

  it('never overlaps two regions', () => {
    for (const model of ['classic', 'slim'] as ModelType[]) {
      const seen = new Set<number>();
      for (const { rect } of allRegions(model)) {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
          for (let x = rect.x; x < rect.x + rect.w; x++) {
            expect(seen.has(y * SKIN_SIZE + x)).toBe(false);
            seen.add(y * SKIN_SIZE + x);
          }
        }
      }
    }
  });

  it('locates pixels and ignores unused ones', () => {
    expect(locatePixel('classic', 10, 12)).toMatchObject({ part: 'head', face: 'front', layer: 'base', localX: 2, localY: 4 });
    expect(locatePixel('classic', 0, 0)).toBeNull();
    expect(locatePixel('classic', -1, 5)).toBeNull();
  });

  it('mirrors the right arm onto the left arm', () => {
    const right = getFaceRect('classic', 'rightArm', 'front', 'base');
    const left = getFaceRect('classic', 'leftArm', 'front', 'base');
    expect(mirrorPixel('classic', right.x, right.y)).toEqual({ x: left.x + left.w - 1, y: left.y });
  });

  it('mirroring twice returns the original pixel', () => {
    for (const model of ['classic', 'slim'] as ModelType[]) {
      for (let y = 0; y < SKIN_SIZE; y++) {
        for (let x = 0; x < SKIN_SIZE; x++) {
          const once = mirrorPixel(model, x, y);
          if (!once) continue;
          expect(mirrorPixel(model, once.x, once.y)).toEqual({ x, y });
        }
      }
    }
  });
});
