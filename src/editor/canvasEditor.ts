import { SKIN_SIZE, type BodyPart } from '../core/constants';
import type { Skin } from '../core/skin';
import { allRegions, locatePixel } from '../core/uvMap';
import type { Tool, ToolContext } from './tools';

export interface EditorOptions {
  getTool(): Tool;
  getContext(): ToolContext;
  /** Called once before a stroke changes the skin — record undo state here. */
  onStrokeStart(pixel: { x: number; y: number }): void;
  onHover?(pixel: { x: number; y: number } | null): void;
}

type Point = { x: number; y: number };

/** Zoomed 2D view of the 64×64 texture that you paint on. */
export class CanvasEditor {
  showGrid = true;
  showGuides = true;
  /** When set, only this body part can be painted and everything else is dimmed. */
  focusPart: BodyPart | null = null;

  private readonly ctx2d: CanvasRenderingContext2D;
  private readonly buffer = document.createElement('canvas');
  private painting = false;
  private last: Point | null = null;
  private hover: Point | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly skin: Skin,
    private readonly opts: EditorOptions,
  ) {
    this.ctx2d = canvas.getContext('2d')!;
    this.buffer.width = SKIN_SIZE;
    this.buffer.height = SKIN_SIZE;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
  }

  private get scale(): number {
    return this.canvas.width / SKIN_SIZE;
  }

  private toPixel(e: PointerEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * SKIN_SIZE),
      y: Math.floor(((e.clientY - r.top) / r.height) * SKIN_SIZE),
    };
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.toPixel(e);
    const tool = this.opts.getTool();
    if (tool.modifiesSkin && !this.canPaint(p.x, p.y)) return;
    if (tool.modifiesSkin) this.opts.onStrokeStart(p);
    tool.apply(this.opts.getContext(), p.x, p.y);
    this.painting = tool.continuous;
    this.last = p;
    this.skin.emit();
  };

  private onMove = (e: PointerEvent): void => {
    const p = this.toPixel(e);
    this.setHover(p);
    if (!this.painting || !this.last) {
      this.render();
      return;
    }
    const tool = this.opts.getTool();
    const ctx = this.opts.getContext();
    // Fill in every pixel between pointer events so fast strokes have no gaps.
    for (const q of linePoints(this.last, p).slice(1)) {
      if (this.canPaint(q.x, q.y)) tool.apply(ctx, q.x, q.y);
    }
    this.last = p;
    this.skin.emit();
  };

  private onUp = (): void => {
    this.painting = false;
    this.last = null;
  };

  private onLeave = (): void => {
    this.setHover(null);
    this.render();
  };

  private canPaint(x: number, y: number): boolean {
    if (!this.focusPart) return true;
    return locatePixel(this.skin.model, x, y)?.part === this.focusPart;
  }

  private setHover(p: Point | null): void {
    const inside = p && p.x >= 0 && p.y >= 0 && p.x < SKIN_SIZE && p.y < SKIN_SIZE;
    this.hover = inside ? p : null;
    this.opts.onHover?.(this.hover);
  }

  render(): void {
    const { ctx2d: ctx, canvas, scale } = this;
    const size = canvas.width;
    ctx.imageSmoothingEnabled = false;

    // Checkerboard shows transparency.
    for (let y = 0; y < SKIN_SIZE; y++) {
      for (let x = 0; x < SKIN_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#2a2d36' : '#23262e';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    const bctx = this.buffer.getContext('2d')!;
    const image = bctx.createImageData(SKIN_SIZE, SKIN_SIZE);
    image.data.set(this.skin.layers.composite());
    bctx.putImageData(image, 0, 0);
    ctx.drawImage(this.buffer, 0, 0, size, size);

    if (this.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < SKIN_SIZE; i++) {
        ctx.moveTo(i * scale + 0.5, 0);
        ctx.lineTo(i * scale + 0.5, size);
        ctx.moveTo(0, i * scale + 0.5);
        ctx.lineTo(size, i * scale + 0.5);
      }
      ctx.stroke();
    }

    if (this.showGuides) {
      for (const { rect, layer } of allRegions(this.skin.model)) {
        ctx.strokeStyle = layer === 'base' ? 'rgba(125,211,252,0.45)' : 'rgba(251,191,36,0.45)';
        ctx.strokeRect(rect.x * scale + 0.5, rect.y * scale + 0.5, rect.w * scale - 1, rect.h * scale - 1);
      }
    }

    if (this.focusPart) {
      // Darken everything except the focused part's faces (even-odd cuts them out).
      ctx.fillStyle = 'rgba(10, 12, 16, 0.72)';
      ctx.beginPath();
      ctx.rect(0, 0, size, size);
      for (const { part, rect } of allRegions(this.skin.model)) {
        if (part === this.focusPart) ctx.rect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
      }
      ctx.fill('evenodd');
    }

    if (this.hover) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.hover.x * scale + 1, this.hover.y * scale + 1, scale - 2, scale - 2);
    }
  }
}

/** Bresenham line between two pixels, inclusive of both ends. */
function linePoints(a: Point, b: Point): Point[] {
  const points: Point[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = -Math.abs(b.y - y);
  const sx = x < b.x ? 1 : -1;
  const sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    points.push({ x, y });
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}
