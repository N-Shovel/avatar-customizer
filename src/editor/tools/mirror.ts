import { mirrorPixel } from '../../core/uvMap';
import type { ToolContext } from './types';

/** Runs `fn` on (x, y) and, when mirror mode is on, on the mirrored pixel too. */
export function withMirror(ctx: ToolContext, x: number, y: number, fn: (x: number, y: number) => void): void {
  fn(x, y);
  if (!ctx.mirror) return;
  const mirrored = mirrorPixel(ctx.skin.model, x, y);
  if (mirrored && (mirrored.x !== x || mirrored.y !== y)) fn(mirrored.x, mirrored.y);
}
