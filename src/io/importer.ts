import { FACES, SKIN_SIZE, type BodyPart, type ModelType } from '../core/constants';
import { PIXEL_COUNT } from '../core/layers';
import { getFaceRect, mirrorPixel } from '../core/uvMap';

export interface ImportedSkin {
  pixels: Uint8ClampedArray;
  model: ModelType;
}

export async function loadImagePixels(src: string | Blob): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { pixels: new Uint8ClampedArray(data), width: canvas.width, height: canvas.height };
  } finally {
    if (typeof src !== 'string') URL.revokeObjectURL(url);
  }
}

/** Reads a skin PNG. Accepts modern 64×64 skins and legacy 64×32 skins. */
export async function importSkinFile(file: Blob): Promise<ImportedSkin> {
  const { pixels, width, height } = await loadImagePixels(file);
  if (width !== SKIN_SIZE || (height !== SKIN_SIZE && height !== SKIN_SIZE / 2)) {
    throw new Error(`Expected a 64×64 or 64×32 skin, but this image is ${width}×${height}.`);
  }
  if (height === SKIN_SIZE / 2) return { pixels: upgradeLegacySkin(pixels), model: 'classic' };
  return { pixels, model: detectModel(pixels) };
}

/**
 * Converts a pre-1.8 64×32 skin to 64×64. Old skins had no separate left arm/leg,
 * so the game mirrored the right ones — we do the same.
 */
export function upgradeLegacySkin(legacy: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(PIXEL_COUNT * 4);
  out.set(legacy.subarray(0, SKIN_SIZE * (SKIN_SIZE / 2) * 4));

  const limbs: BodyPart[] = ['rightArm', 'rightLeg'];
  for (const part of limbs) {
    for (const face of FACES) {
      const { x, y, w, h } = getFaceRect('classic', part, face, 'base');
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const target = mirrorPixel('classic', px, py)!;
          const from = (py * SKIN_SIZE + px) * 4;
          const to = (target.y * SKIN_SIZE + target.x) * 4;
          out.set(out.subarray(from, from + 4), to);
        }
      }
    }
  }
  return out;
}

/** Slim skins leave the 4th column of the right arm's back face empty. */
export function detectModel(pixels: Uint8ClampedArray): ModelType {
  return pixels[(20 * SKIN_SIZE + 54) * 4 + 3] === 0 ? 'slim' : 'classic';
}
