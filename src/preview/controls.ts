import { CrouchAnimation, IdleAnimation, RunningAnimation, WalkingAnimation, WaveAnimation, type PlayerAnimation } from 'skinview3d';
import type { SkinPreview } from './viewer';

const POSES: Record<string, { label: string; create: () => PlayerAnimation | null }> = {
  idle: { label: 'Idle', create: () => new IdleAnimation() },
  walk: { label: 'Walk', create: () => new WalkingAnimation() },
  run: { label: 'Run', create: () => new RunningAnimation() },
  wave: { label: 'Wave', create: () => new WaveAnimation() },
  crouch: { label: 'Crouch', create: () => new CrouchAnimation() },
  none: { label: 'Still', create: () => null },
};

/** Turn buttons, pose picker and view toggles under the 3D preview. */
export function mountPreviewControls(root: HTMLElement, preview: SkinPreview): void {
  const { viewer } = preview;

  const turnRow = document.createElement('div');
  turnRow.className = 'turn-row';
  turnRow.append(
    button('⟲', 'Turn left', () => preview.turnBy(-1)),
    button('Front', 'Show the front', () => preview.turnToFace('front')),
    button('Back', 'Show the back', () => preview.turnToFace('back')),
    button('⟳', 'Turn right', () => preview.turnBy(1)),
  );

  const pose = document.createElement('select');
  pose.setAttribute('aria-label', 'Pose');
  for (const [id, { label }] of Object.entries(POSES)) pose.add(new Option(label, id));
  pose.addEventListener('change', () => {
    viewer.animation = POSES[pose.value].create();
  });

  const toggles = document.createElement('div');
  toggles.className = 'toggle-row';
  toggles.append(
    pose,
    checkbox('Explode', false, (on) => preview.setExploded(on)),
    checkbox('Follow edits', preview.followEdits, (on) => (preview.followEdits = on)),
    checkbox('Spin', false, (on) => (viewer.autoRotate = on)),
    checkbox('Outer layer', true, (on) => viewer.playerObject.skin.setOuterLayerVisible(on)),
  );

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Drag to orbit · scroll to zoom · click a body part to focus it';

  root.replaceChildren(turnRow, toggles, hint);
}

function button(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.title = title;
  el.addEventListener('click', onClick);
  return el;
}

function checkbox(label: string, initial: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = initial;
  input.addEventListener('change', () => onChange(input.checked));
  wrapper.append(input, ` ${label}`);
  return wrapper;
}
