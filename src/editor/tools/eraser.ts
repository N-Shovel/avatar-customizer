import { TRANSPARENT } from '../../core/constants';
import { withMirror } from './mirror';
import type { Tool } from './types';

export const eraser: Tool = {
  id: 'eraser',
  label: 'Eraser',
  shortcut: 'e',
  continuous: true,
  modifiesSkin: true,
  apply(ctx, x, y) {
    withMirror(ctx, x, y, (px, py) => ctx.skin.paint(px, py, TRANSPARENT));
  },
};
