/** Width and height of a modern Minecraft skin texture, in pixels. */
export const SKIN_SIZE = 64;

/** "classic" = Steve (4px arms), "slim" = Alex (3px arms). */
export type ModelType = 'classic' | 'slim';

export const ARM_WIDTH: Record<ModelType, number> = {
  classic: 4,
  slim: 3,
};

export type BodyPart = 'head' | 'body' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';
export type FaceName = 'top' | 'bottom' | 'right' | 'front' | 'left' | 'back';

/** "base" is the inner skin; "overlay" is the outer layer (hat, jacket, sleeves, pants). */
export type LayerKind = 'base' | 'overlay';

export const BODY_PARTS: readonly BodyPart[] = ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
export const FACES: readonly FaceName[] = ['top', 'bottom', 'right', 'front', 'left', 'back'];
export const LAYER_KINDS: readonly LayerKind[] = ['base', 'overlay'];

export const PART_LABELS: Record<BodyPart, string> = {
  head: 'Head',
  body: 'Body',
  rightArm: 'Right arm',
  leftArm: 'Left arm',
  rightLeg: 'Right leg',
  leftLeg: 'Left leg',
};

/** Red, green, blue, alpha — each 0–255. */
export type RGBA = [number, number, number, number];

export const TRANSPARENT: RGBA = [0, 0, 0, 0];
