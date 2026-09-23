import type { SkinViewer } from 'skinview3d';
import { Raycaster, Vector2, type Object3D } from 'three';
import { BODY_PARTS, type BodyPart } from '../core/constants';
import { partObjects } from './explode';

const raycaster = new Raycaster();

/** Which body part is under the pointer, or null for empty space. */
export function pickPart(viewer: SkinViewer, clientX: number, clientY: number): BodyPart | null {
  const rect = viewer.canvas.getBoundingClientRect();
  const pointer = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, viewer.camera);

  const objects = partObjects(viewer.playerObject.skin);
  for (const hit of raycaster.intersectObject(viewer.playerObject.skin, true)) {
    // The raycaster also hits hidden meshes (e.g. an unfocused part), so skip those.
    if (!isShown(hit.object)) continue;
    for (let node: Object3D | null = hit.object; node; node = node.parent) {
      const part = BODY_PARTS.find((p) => objects[p] === node);
      if (part) return part;
    }
  }
  return null;
}

function isShown(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}
