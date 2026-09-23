import { BODY_PARTS, PART_LABELS, type BodyPart } from '../core/constants';
import { h } from './dom';

export interface BodyPartBar {
  setActive(part: BodyPart | null): void;
}

/** "All / Head / Body / …" buttons that isolate one body part in the editor and 3D view. */
export function mountBodyPartBar(root: HTMLElement, onSelect: (part: BodyPart | null) => void): BodyPartBar {
  const options: { part: BodyPart | null; label: string }[] = [
    { part: null, label: 'All' },
    ...BODY_PARTS.map((part) => ({ part, label: PART_LABELS[part] })),
  ];
  const buttons = options.map(({ part, label }) =>
    h('button', { type: 'button', class: 'part-chip', textContent: label, onclick: () => onSelect(part) }),
  );

  root.className = 'part-bar';
  root.replaceChildren(...buttons);

  return {
    setActive(part) {
      buttons.forEach((b, i) => b.classList.toggle('active', options[i].part === part));
    },
  };
}
