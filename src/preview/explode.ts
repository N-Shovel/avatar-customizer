import type { SkinObject } from 'skinview3d';
import type { Object3D } from 'three';
import { BODY_PARTS, type BodyPart } from '../core/constants';

/** How far each part moves (in skin pixels) when the model is fully exploded. */
const EXPLODE_OFFSETS: Record<BodyPart, [number, number, number]> = {
  head: [0, 4, 0],
  body: [0, 0, 0],
  rightArm: [-3.5, 0, 0],
  leftArm: [3.5, 0, 0],
  rightLeg: [-1.5, -3.5, 0],
  leftLeg: [1.5, -3.5, 0],
};

export function partObjects(skin: SkinObject): Record<BodyPart, Object3D> {
  return {
    head: skin.head,
    body: skin.body,
    rightArm: skin.rightArm,
    leftArm: skin.leftArm,
    rightLeg: skin.rightLeg,
    leftLeg: skin.leftLeg,
  };
}

/**
 * Moves every part by `amount` × its explode offset; call again with `-amount` to undo.
 * Offsets are applied only around rendering so skinview3d's animations never see them.
 */
export function shiftParts(skin: SkinObject, amount: number): void {
  if (amount === 0) return;
  const objects = partObjects(skin);
  for (const part of BODY_PARTS) {
    const [x, y, z] = EXPLODE_OFFSETS[part];
    const { position } = objects[part];
    position.x += x * amount;
    position.y += y * amount;
    position.z += z * amount;
  }
}
