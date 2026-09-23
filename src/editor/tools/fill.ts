import { sameColor } from '../../core/color';
import type { RGBA } from '../../core/constants';
import type { Skin } from '../../core/skin';
import { locatePixel } from '../../core/uvMap';
import { withMirror } from './mirror';
import type { Tool } from './types';

/** Flood fill on the active layer, kept inside the clicked face so it never leaks onto other parts. */
function floodFill(skin: Skin, startX: number, startY: number, color: RGBA): void {
  const hit = locatePixel(skin.model, startX, startY);
  if (!hit) return;
  const { rect } = hit;
  const target = skin.readActive(startX, startY);
  if (sameColor(target, color)) return;

  const stack: [number, number][] = [[startX, startY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h) continue;
    if (!sameColor(skin.readActive(x, y), target)) continue;
    skin.paint(x, y, color);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

export const fill: Tool = {
  id: 'fill',
  label: 'Fill',
  shortcut: 'g',
  continuous: false,
  modifiesSkin: true,
  apply(ctx, x, y) {
    withMirror(ctx, x, y, (px, py) => floodFill(ctx.skin, px, py, ctx.color));
  },
};
