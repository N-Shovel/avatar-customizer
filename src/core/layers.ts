import { SKIN_SIZE, type RGBA } from './constants';
import type { Rect } from './uvMap';

export const PIXEL_COUNT = SKIN_SIZE * SKIN_SIZE;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  /** RGBA bytes, SKIN_SIZE × SKIN_SIZE × 4. */
  pixels: Uint8ClampedArray;
  /** Set when the layer came from the part catalog, so picking another part replaces it. */
  partCategory?: string;
  partId?: string;
}

let nextId = 1;

export function createLayer(name: string, pixels?: Uint8ClampedArray, extra: Partial<Layer> = {}): Layer {
  return {
    id: `layer-${nextId++}`,
    name,
    visible: true,
    pixels: pixels ? new Uint8ClampedArray(pixels) : new Uint8ClampedArray(PIXEL_COUNT * 4),
    ...extra,
  };
}

export function cloneLayer(layer: Layer): Layer {
  return { ...layer, pixels: new Uint8ClampedArray(layer.pixels) };
}

export function getPixel(pixels: Uint8ClampedArray, x: number, y: number): RGBA {
  const i = (y * SKIN_SIZE + x) * 4;
  return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
}

export function setPixel(pixels: Uint8ClampedArray, x: number, y: number, color: RGBA): void {
  const i = (y * SKIN_SIZE + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

export function fillRect(pixels: Uint8ClampedArray, rect: Rect, color: RGBA): void {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) setPixel(pixels, x, y, color);
  }
}

/** Flattens visible layers (bottom first) with standard "source over" alpha blending. */
export function compositeLayers(layers: readonly Layer[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(PIXEL_COUNT * 4);
  for (const layer of layers) {
    if (!layer.visible) continue;
    const src = layer.pixels;
    for (let i = 0; i < out.length; i += 4) {
      const sa = src[i + 3] / 255;
      if (sa === 0) continue;
      const da = out[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        out[i + c] = (src[i + c] * sa + out[i + c] * da * (1 - sa)) / oa;
      }
      out[i + 3] = oa * 255;
    }
  }
  return out;
}

export interface LayerSnapshot {
  layers: Layer[];
  activeId: string;
}

/** Ordered layer list, index 0 = bottom. */
export class LayerStack {
  layers: Layer[];
  activeId: string;

  constructor(initial: Layer[]) {
    if (initial.length === 0) initial = [createLayer('Base')];
    this.layers = initial;
    this.activeId = initial[0].id;
  }

  get active(): Layer {
    return this.layers.find((l) => l.id === this.activeId) ?? this.layers[0];
  }

  get(id: string): Layer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  setActive(id: string): void {
    if (this.get(id)) this.activeId = id;
  }

  add(layer: Layer, index = this.layers.length): void {
    this.layers.splice(index, 0, layer);
    this.activeId = layer.id;
  }

  remove(id: string): void {
    if (this.layers.length <= 1) return;
    const index = this.layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    this.layers.splice(index, 1);
    if (this.activeId === id) this.activeId = this.layers[Math.max(0, index - 1)].id;
  }

  /** Moves a layer up (+1) or down (-1) in the stack. */
  move(id: string, delta: number): void {
    const from = this.layers.findIndex((l) => l.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= this.layers.length) return;
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, layer);
  }

  composite(): Uint8ClampedArray {
    return compositeLayers(this.layers);
  }

  snapshot(): LayerSnapshot {
    return { layers: this.layers.map(cloneLayer), activeId: this.activeId };
  }

  restore(snapshot: LayerSnapshot): void {
    this.layers = snapshot.layers.map(cloneLayer);
    this.activeId = snapshot.activeId;
  }
}
