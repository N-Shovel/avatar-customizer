import { IdleAnimation, SkinViewer } from 'skinview3d';
import { Box3, Group, Spherical, Vector3 } from 'three';
import { BODY_PARTS, type BodyPart, type FaceName, type ModelType } from '../core/constants';
import { partObjects, shiftParts } from './explode';
import { Tweens, easeInOutCubic, easeOutBack, lerp, nearestAngle } from './motion';
import { pickPart } from './partPicking';

const BASE_ZOOM = 0.85;
const FOCUS_ZOOM: Record<BodyPart, number> = {
  head: 2.2,
  body: 1.5,
  rightArm: 1.3,
  leftArm: 1.3,
  rightLeg: 1.3,
  leftLeg: 1.3,
};

/** Model rotation that turns each face toward the camera. Top/bottom tilt instead of turning. */
const FACE_YAW: Record<FaceName, number | null> = {
  front: 0,
  back: Math.PI,
  right: Math.PI / 2,
  left: -Math.PI / 2,
  top: null,
  bottom: null,
};
const FACE_TILT: Record<FaceName, number> = { front: 0, back: 0, right: 0, left: 0, top: 0.6, bottom: -0.6 };

const TURN_MS = 700;
const FOCUS_MS = 600;
const EXPLODE_MS = 550;
const CLICK_SLOP_PX = 5;

/** 3D player model that shows the current skin, with turning, exploded view and part focus. */
export class SkinPreview {
  readonly viewer: SkinViewer;
  /** Turn the model toward whichever face is being painted. */
  followEdits = true;

  private readonly tweens = new Tweens();
  /** Sits between skinview3d's wrapper and the player so a focused part can be centred. */
  private readonly focusGroup = new Group();
  private explodeTarget = 0;
  private explodeAmount = 0;
  private focus: BodyPart | null = null;
  private lastFace: FaceName | null = null;

  private queued = false;
  private source: HTMLCanvasElement | null = null;
  private model: ModelType = 'classic';

  constructor(canvas: HTMLCanvasElement, private readonly host: HTMLElement) {
    this.viewer = new SkinViewer({
      canvas,
      width: host.clientWidth,
      height: host.clientHeight,
      zoom: BASE_ZOOM,
    });
    this.viewer.animation = new IdleAnimation();

    const { playerWrapper, playerObject } = this.viewer;
    playerWrapper.remove(playerObject);
    this.focusGroup.add(playerObject);
    playerWrapper.add(this.focusGroup);

    // Run our tweens every frame and apply the exploded offsets only while drawing.
    const render = this.viewer.render.bind(this.viewer);
    this.viewer.render = () => {
      this.tweens.update();
      this.withExplodeOffsets(render);
    };

    new ResizeObserver(() => this.resize()).observe(host);
  }

  /** Reloads the texture, at most once per animation frame. */
  update(source: HTMLCanvasElement, model: ModelType): void {
    this.source = source;
    this.model = model;
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      if (!this.source) return;
      this.viewer.loadSkin(this.source, { model: this.model === 'slim' ? 'slim' : 'default' });
    });
  }

  /** Smoothly turns the model to face the camera from the given side. */
  turnToFace(face: FaceName): void {
    const yaw = FACE_YAW[face] ?? this.viewer.playerWrapper.rotation.y;
    this.turnTo(yaw, FACE_TILT[face]);
  }

  /** Rotates the model by a number of quarter turns (positive = counter-clockwise from above). */
  turnBy(quarterTurns: number): void {
    const current = this.viewer.playerWrapper.rotation.y;
    const snapped = Math.round(current / (Math.PI / 2)) * (Math.PI / 2);
    this.turnTo(snapped + quarterTurns * (Math.PI / 2), 0, false);
  }

  /** Called when painting starts — turns toward the edited face if it changed. */
  showEditedFace(face: FaceName): void {
    if (!this.followEdits || this.viewer.autoRotate || face === this.lastFace) return;
    this.lastFace = face;
    this.turnToFace(face);
  }

  setExploded(on: boolean): void {
    const from = this.explodeAmount;
    this.explodeTarget = on ? 1 : 0;
    const ease = on ? easeOutBack : easeInOutCubic;
    this.tweens.run('explode', EXPLODE_MS, (t) => {
      this.explodeAmount = lerp(from, this.explodeTarget, ease(t));
    });
    if (this.focus) this.setFocus(this.focus);
  }

  /** Shows only one body part, centred and zoomed in. Pass null to show the whole player. */
  setFocus(part: BodyPart | null): void {
    this.focus = part;
    const objects = partObjects(this.viewer.playerObject.skin);
    for (const p of BODY_PARTS) objects[p].visible = part === null || p === part;

    const fromPos = this.focusGroup.position.clone();
    const toPos = part ? this.partCenter(part).negate() : new Vector3();
    const fromZoom = this.viewer.zoom;
    const toZoom = part ? FOCUS_ZOOM[part] : BASE_ZOOM;
    this.tweens.run('focus', FOCUS_MS, (t) => {
      const e = easeInOutCubic(t);
      this.focusGroup.position.lerpVectors(fromPos, toPos, e);
      this.viewer.zoom = lerp(fromZoom, toZoom, e);
    });
  }

  /** Calls back with the body part clicked on the model (null = empty space). Drags are ignored. */
  onPartClick(callback: (part: BodyPart | null) => void): void {
    const canvas = this.viewer.canvas;
    let down: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) return;
      down = null;
      const part = this.withExplodeOffsets(() => {
        this.viewer.scene.updateMatrixWorld();
        return pickPart(this.viewer, e.clientX, e.clientY);
      });
      callback(part);
    });
  }

  private turnTo(yaw: number, tilt: number, resetCamera = true): void {
    const wrapper = this.viewer.playerWrapper;
    const camera = this.viewer.camera;
    const fromYaw = wrapper.rotation.y;
    const toYaw = nearestAngle(fromYaw, yaw);
    const fromTilt = wrapper.rotation.x;

    // Also swing the camera back in front so "front" really faces you after orbiting.
    const fromCam = new Spherical().setFromVector3(camera.position);
    const toTheta = nearestAngle(fromCam.theta, 0);

    this.tweens.run('turn', TURN_MS, (t) => {
      const e = easeInOutCubic(t);
      wrapper.rotation.y = lerp(fromYaw, toYaw, e);
      wrapper.rotation.x = lerp(fromTilt, tilt, e);
      // A small hop mid-turn makes the rotation feel physical.
      wrapper.position.y = Math.sin(Math.PI * t) * 0.8;
      if (resetCamera) {
        const radius = camera.position.length();
        const s = new Spherical(radius, lerp(fromCam.phi, Math.PI / 2, e), lerp(fromCam.theta, toTheta, e));
        camera.position.setFromSpherical(s);
        camera.lookAt(this.viewer.controls.target);
      }
    });
  }

  /** Centre of a part's bounding box in focus-group space, as it will be once the explode tween ends. */
  private partCenter(part: BodyPart): Vector3 {
    const skin = this.viewer.playerObject.skin;
    shiftParts(skin, this.explodeTarget);
    this.viewer.scene.updateMatrixWorld();
    const center = new Box3().setFromObject(partObjects(skin)[part]).getCenter(new Vector3());
    shiftParts(skin, -this.explodeTarget);
    return this.focusGroup.worldToLocal(center);
  }

  private withExplodeOffsets<T>(fn: () => T): T {
    const skin = this.viewer.playerObject.skin;
    const amount = this.explodeAmount;
    shiftParts(skin, amount);
    try {
      return fn();
    } finally {
      shiftParts(skin, -amount);
    }
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.host;
    if (clientWidth > 0 && clientHeight > 0) this.viewer.setSize(clientWidth, clientHeight);
  }
}
