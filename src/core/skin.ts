import { SKIN_SIZE, type ModelType, type RGBA } from './constants';
import { LayerStack, getPixel, setPixel, type Layer, type LayerSnapshot } from './layers';

export interface SkinSnapshot {
  model: ModelType;
  layers: LayerSnapshot;
}

/** The skin being edited: model type plus a stack of layers. Notifies listeners on change. */
export class Skin {
  model: ModelType;
  readonly layers: LayerStack;
  private listeners = new Set<() => void>();

  constructor(model: ModelType, layers: Layer[]) {
    this.model = model;
    this.layers = new LayerStack(layers);
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    for (const listener of this.listeners) listener();
  }

  setModel(model: ModelType): void {
    if (this.model === model) return;
    this.model = model;
    this.emit();
  }

  /** Writes a pixel to the active layer. Does not emit — callers emit once per stroke segment. */
  paint(x: number, y: number, color: RGBA): void {
    if (!inBounds(x, y)) return;
    setPixel(this.layers.active.pixels, x, y, color);
  }

  /** Reads a pixel from the active layer. */
  readActive(x: number, y: number): RGBA {
    return getPixel(this.layers.active.pixels, x, y);
  }

  /** Reads the final, flattened color of a pixel. */
  sample(x: number, y: number): RGBA {
    return getPixel(this.layers.composite(), x, y);
  }

  replace(model: ModelType, layers: Layer[]): void {
    this.model = model;
    this.layers.restore({ layers, activeId: layers[layers.length - 1].id });
    this.emit();
  }

  snapshot(): SkinSnapshot {
    return { model: this.model, layers: this.layers.snapshot() };
  }

  restore(snapshot: SkinSnapshot): void {
    this.model = snapshot.model;
    this.layers.restore(snapshot.layers);
    this.emit();
  }
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < SKIN_SIZE && y < SKIN_SIZE;
}
