import { tintPixels } from '../core/color';
import type { RGBA } from '../core/constants';
import { createLayer } from '../core/layers';
import type { Skin } from '../core/skin';
import { loadImagePixels } from '../io/importer';
import { CATEGORIES, partUrl, type PartCategory, type PartDef } from './partCatalog';

const pixelCache = new Map<string, Uint8ClampedArray>();

async function loadPart(part: PartDef): Promise<Uint8ClampedArray> {
  let pixels = pixelCache.get(part.id);
  if (!pixels) {
    ({ pixels } = await loadImagePixels(partUrl(part)));
    pixelCache.set(part.id, pixels);
  }
  return pixels;
}

/** Puts a part on the skin as its own layer, replacing any part already in that category. */
export async function applyPart(skin: Skin, part: PartDef, tint?: RGBA): Promise<void> {
  const source = await loadPart(part);
  const pixels = part.recolorable && tint ? tintPixels(source, tint) : new Uint8ClampedArray(source);
  const label = CATEGORIES.find((c) => c.id === part.category)?.label ?? part.category;
  const name = `${label}: ${part.name}`;

  const existing = skin.layers.layers.find((l) => l.partCategory === part.category);
  if (existing) {
    existing.pixels = pixels;
    existing.name = name;
    existing.partId = part.id;
    existing.visible = true;
  } else {
    skin.layers.add(createLayer(name, pixels, { partCategory: part.category, partId: part.id }));
  }
  skin.emit();
}

export function removePart(skin: Skin, category: PartCategory): void {
  const existing = skin.layers.layers.find((l) => l.partCategory === category);
  if (!existing) return;
  skin.layers.remove(existing.id);
  skin.emit();
}

export function hasPart(skin: Skin, category: PartCategory): boolean {
  return skin.layers.layers.some((l) => l.partCategory === category);
}
