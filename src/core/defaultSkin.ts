import { BODY_PARTS, FACES, type ModelType, type RGBA } from './constants';
import { PIXEL_COUNT, fillRect, setPixel } from './layers';
import { getFaceRect } from './uvMap';

const SKIN_TONE: RGBA = [224, 172, 130, 255];
const EYE_WHITE: RGBA = [255, 255, 255, 255];
const EYE_PUPIL: RGBA = [60, 45, 110, 255];

/** A plain base body: skin tone on every base face, plus a pair of eyes. */
export function createDefaultBase(model: ModelType): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(PIXEL_COUNT * 4);
  for (const part of BODY_PARTS) {
    for (const face of FACES) fillRect(pixels, getFaceRect(model, part, face, 'base'), SKIN_TONE);
  }
  const front = getFaceRect(model, 'head', 'front', 'base');
  const eyeRow = front.y + 4;
  setPixel(pixels, front.x + 1, eyeRow, EYE_WHITE);
  setPixel(pixels, front.x + 2, eyeRow, EYE_PUPIL);
  setPixel(pixels, front.x + 5, eyeRow, EYE_PUPIL);
  setPixel(pixels, front.x + 6, eyeRow, EYE_WHITE);
  return pixels;
}
