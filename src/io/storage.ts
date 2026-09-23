import type { ModelType } from '../core/constants';
import { createLayer, type Layer } from '../core/layers';
import type { Skin } from '../core/skin';

const STORAGE_KEY = 'avatar-customizer:skin';

interface SavedLayer {
  name: string;
  visible: boolean;
  data: string;
  partCategory?: string;
  partId?: string;
}

interface SavedSkin {
  version: 1;
  model: ModelType;
  activeIndex: number;
  layers: SavedLayer[];
}

export function saveSkin(skin: Skin): void {
  const saved: SavedSkin = {
    version: 1,
    model: skin.model,
    activeIndex: skin.layers.layers.findIndex((l) => l.id === skin.layers.activeId),
    layers: skin.layers.layers.map((l) => ({
      name: l.name,
      visible: l.visible,
      data: toBase64(l.pixels),
      partCategory: l.partCategory,
      partId: l.partId,
    })),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked (private mode) — autosave is best-effort.
  }
}

export function loadSavedSkin(): { model: ModelType; layers: Layer[]; activeIndex: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSkin;
    if (saved.version !== 1 || saved.layers.length === 0) return null;
    const layers = saved.layers.map((l) =>
      createLayer(l.name, fromBase64(l.data), { visible: l.visible, partCategory: l.partCategory, partId: l.partId }),
    );
    return { model: saved.model, layers, activeIndex: saved.activeIndex };
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8ClampedArray): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(text: string): Uint8ClampedArray {
  const binary = atob(text);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
