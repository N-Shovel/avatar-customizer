import {
  ARM_WIDTH,
  BODY_PARTS,
  FACES,
  LAYER_KINDS,
  SKIN_SIZE,
  type BodyPart,
  type FaceName,
  type LayerKind,
  type ModelType,
} from './constants';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BoxDef {
  /** Width, height, depth of the cuboid in pixels. */
  size: [number, number, number];
  /** Top-left corner of the unfolded box in the texture. */
  base: [number, number];
  overlay: [number, number];
}

function boxDefs(model: ModelType): Record<BodyPart, BoxDef> {
  const arm = ARM_WIDTH[model];
  return {
    head: { size: [8, 8, 8], base: [0, 0], overlay: [32, 0] },
    body: { size: [8, 12, 4], base: [16, 16], overlay: [16, 32] },
    rightArm: { size: [arm, 12, 4], base: [40, 16], overlay: [40, 32] },
    leftArm: { size: [arm, 12, 4], base: [32, 48], overlay: [48, 48] },
    rightLeg: { size: [4, 12, 4], base: [0, 16], overlay: [0, 32] },
    leftLeg: { size: [4, 12, 4], base: [16, 48], overlay: [0, 48] },
  };
}

/** Unfolds a w×h×d box whose texture starts at (u, v) into its six face rectangles. */
export function unfoldBox(u: number, v: number, w: number, h: number, d: number): Record<FaceName, Rect> {
  return {
    top: { x: u + d, y: v, w, h: d },
    bottom: { x: u + d + w, y: v, w, h: d },
    right: { x: u, y: v + d, w: d, h },
    front: { x: u + d, y: v + d, w, h },
    left: { x: u + d + w, y: v + d, w: d, h },
    back: { x: u + d + w + d, y: v + d, w, h },
  };
}

export function getPartFaces(model: ModelType, part: BodyPart, layer: LayerKind): Record<FaceName, Rect> {
  const def = boxDefs(model)[part];
  const [u, v] = def[layer];
  const [w, h, d] = def.size;
  return unfoldBox(u, v, w, h, d);
}

export function getFaceRect(model: ModelType, part: BodyPart, face: FaceName, layer: LayerKind): Rect {
  return getPartFaces(model, part, layer)[face];
}

export interface UVRegion {
  part: BodyPart;
  face: FaceName;
  layer: LayerKind;
  rect: Rect;
}

export interface UVHit extends UVRegion {
  localX: number;
  localY: number;
}

/** Every face rectangle in the texture for the given model. */
export function allRegions(model: ModelType): UVRegion[] {
  const regions: UVRegion[] = [];
  for (const layer of LAYER_KINDS) {
    for (const part of BODY_PARTS) {
      const faces = getPartFaces(model, part, layer);
      for (const face of FACES) regions.push({ part, face, layer, rect: faces[face] });
    }
  }
  return regions;
}

const lookupCache = new Map<ModelType, (UVRegion | null)[]>();

function lookupTable(model: ModelType): (UVRegion | null)[] {
  let table = lookupCache.get(model);
  if (!table) {
    table = new Array<UVRegion | null>(SKIN_SIZE * SKIN_SIZE).fill(null);
    for (const region of allRegions(model)) {
      const { x, y, w, h } = region.rect;
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) table[py * SKIN_SIZE + px] = region;
      }
    }
    lookupCache.set(model, table);
  }
  return table;
}

/** Which body part / face a texture pixel belongs to, or null for unused pixels. */
export function locatePixel(model: ModelType, x: number, y: number): UVHit | null {
  if (x < 0 || y < 0 || x >= SKIN_SIZE || y >= SKIN_SIZE) return null;
  const region = lookupTable(model)[y * SKIN_SIZE + x];
  if (!region) return null;
  return { ...region, localX: x - region.rect.x, localY: y - region.rect.y };
}

const MIRROR_PART: Record<BodyPart, BodyPart> = {
  head: 'head',
  body: 'body',
  rightArm: 'leftArm',
  leftArm: 'rightArm',
  rightLeg: 'leftLeg',
  leftLeg: 'rightLeg',
};

const MIRROR_FACE: Record<FaceName, FaceName> = {
  top: 'top',
  bottom: 'bottom',
  front: 'front',
  back: 'back',
  right: 'left',
  left: 'right',
};

/**
 * The pixel on the opposite side of the character (mirrored left ↔ right).
 * Limbs map to the opposite limb; head and body map onto themselves.
 */
export function mirrorPixel(model: ModelType, x: number, y: number): { x: number; y: number } | null {
  const hit = locatePixel(model, x, y);
  if (!hit) return null;
  const target = getFaceRect(model, MIRROR_PART[hit.part], MIRROR_FACE[hit.face], hit.layer);
  return { x: target.x + (target.w - 1 - hit.localX), y: target.y + hit.localY };
}
