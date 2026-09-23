import { eraser } from './eraser';
import { eyedropper } from './eyedropper';
import { fill } from './fill';
import { pencil } from './pencil';
import type { Tool } from './types';

export const TOOLS: readonly Tool[] = [pencil, eraser, fill, eyedropper];

export type { Tool, ToolContext } from './types';
