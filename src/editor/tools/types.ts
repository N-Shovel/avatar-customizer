import type { RGBA } from '../../core/constants';
import type { Skin } from '../../core/skin';

export interface ToolContext {
  skin: Skin;
  readonly color: RGBA;
  readonly mirror: boolean;
  setColor(color: RGBA): void;
}

export interface Tool {
  id: string;
  label: string;
  /** Keyboard shortcut (single key). */
  shortcut: string;
  /** Applied to every pixel along a drag, not just the first click. */
  continuous: boolean;
  /** Whether using the tool changes the skin (and so needs an undo entry). */
  modifiesSkin: boolean;
  apply(ctx: ToolContext, x: number, y: number): void;
}
