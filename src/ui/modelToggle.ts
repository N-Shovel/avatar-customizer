import type { ModelType } from '../core/constants';
import { h } from './dom';

export interface ModelToggle {
  set(model: ModelType): void;
}

export function mountModelToggle(root: HTMLElement, initial: ModelType, onChange: (model: ModelType) => void): ModelToggle {
  const options: { id: ModelType; label: string }[] = [
    { id: 'classic', label: 'Classic (4px arms)' },
    { id: 'slim', label: 'Slim (3px arms)' },
  ];
  const inputs = options.map(({ id }) => {
    const input = h('input', { type: 'radio', name: 'model', value: id, checked: id === initial });
    input.addEventListener('change', () => input.checked && onChange(id));
    return input;
  });

  root.className = 'segmented';
  root.replaceChildren(...options.map((o, i) => h('label', {}, inputs[i], ` ${o.label}`)));

  return {
    set(model) {
      inputs.forEach((input) => (input.checked = input.value === model));
    },
  };
}
