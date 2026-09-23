import type { Tool } from './types';

export const eyedropper: Tool = {
  id: 'eyedropper',
  label: 'Pick color',
  shortcut: 'i',
  continuous: false,
  modifiesSkin: false,
  apply(ctx, x, y) {
    const color = ctx.skin.sample(x, y);
    if (color[3] > 0) ctx.setColor(color);
  },
};
