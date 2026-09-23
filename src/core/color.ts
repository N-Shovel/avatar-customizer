import type { RGBA } from './constants';

export function hexToRgba(hex: string, alpha = 255): RGBA {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

export function rgbaToHex([r, g, b]: RGBA): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function sameColor(a: RGBA, b: RGBA): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

/** Multiplies each opaque pixel's color by the tint — works best on light grayscale art. */
export function tintPixels(pixels: Uint8ClampedArray, tint: RGBA): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    out[i] = (out[i] * tint[0]) / 255;
    out[i + 1] = (out[i + 1] * tint[1]) / 255;
    out[i + 2] = (out[i + 2] * tint[2]) / 255;
  }
  return out;
}
