import { SKIN_SIZE } from '../core/constants';
import type { Skin } from '../core/skin';

/** Draws the flattened skin onto a 64×64 canvas (creates one if not given). */
export function renderToCanvas(skin: Skin, canvas = document.createElement('canvas')): HTMLCanvasElement {
  canvas.width = SKIN_SIZE;
  canvas.height = SKIN_SIZE;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(SKIN_SIZE, SKIN_SIZE);
  image.data.set(skin.layers.composite());
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Downloads the skin as a Minecraft-ready 64×64 PNG. */
export async function exportPng(skin: Skin, filename = 'skin.png'): Promise<void> {
  const canvas = renderToCanvas(skin);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the skin as PNG.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
