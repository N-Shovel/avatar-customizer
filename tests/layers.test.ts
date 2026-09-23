import { describe, expect, it } from 'vitest';
import { LayerStack, compositeLayers, createLayer, getPixel, setPixel } from '../src/core/layers';

describe('layers', () => {
  it('draws upper layers over lower ones', () => {
    const bottom = createLayer('bottom');
    const top = createLayer('top');
    setPixel(bottom.pixels, 0, 0, [255, 0, 0, 255]);
    setPixel(top.pixels, 0, 0, [0, 0, 255, 255]);
    setPixel(bottom.pixels, 1, 0, [255, 0, 0, 255]);

    const out = compositeLayers([bottom, top]);
    expect(getPixel(out, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(getPixel(out, 1, 0)).toEqual([255, 0, 0, 255]);
  });

  it('blends semi-transparent pixels', () => {
    const bottom = createLayer('bottom');
    const top = createLayer('top');
    setPixel(bottom.pixels, 0, 0, [0, 0, 0, 255]);
    setPixel(top.pixels, 0, 0, [255, 255, 255, 128]);
    const [r, , , a] = getPixel(compositeLayers([bottom, top]), 0, 0);
    expect(r).toBeCloseTo(128, -1);
    expect(a).toBe(255);
  });

  it('skips hidden layers', () => {
    const layer = createLayer('hidden');
    setPixel(layer.pixels, 0, 0, [255, 255, 255, 255]);
    layer.visible = false;
    expect(getPixel(compositeLayers([layer]), 0, 0)).toEqual([0, 0, 0, 0]);
  });

  it('snapshots are independent copies', () => {
    const stack = new LayerStack([createLayer('base')]);
    const snapshot = stack.snapshot();
    setPixel(stack.active.pixels, 0, 0, [1, 2, 3, 255]);
    stack.restore(snapshot);
    expect(getPixel(stack.active.pixels, 0, 0)).toEqual([0, 0, 0, 0]);
  });

  it('keeps at least one layer', () => {
    const stack = new LayerStack([createLayer('only')]);
    stack.remove(stack.activeId);
    expect(stack.layers).toHaveLength(1);
  });
});
