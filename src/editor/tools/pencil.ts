import { withMirror } from './mirror';
import type { Tool } from './types';

export const pencil: Tool = {
  id: 'pencil',
  label: 'Pencil',
  shortcut: 'b',
  continuous: true,
  modifiesSkin: true,
  apply(ctx, x, y) {
    withMirror(ctx, x, y, (px, py) => ctx.skin.paint(px, py, ctx.color));
  },
};
