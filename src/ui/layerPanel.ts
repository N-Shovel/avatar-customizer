import { createLayer } from '../core/layers';
import type { Skin } from '../core/skin';
import { h } from './dom';

export interface LayerPanel {
  render(): void;
}

/** Layer list (top of the stack shown first) with add/remove/reorder/visibility. */
export function mountLayerPanel(root: HTMLElement, skin: Skin, beforeChange: () => void): LayerPanel {
  const list = h('ul', { class: 'layer-list' });
  let lastSignature = '';

  const change = (fn: () => void) => {
    beforeChange();
    fn();
    skin.emit();
  };

  const actions = h(
    'div',
    { class: 'button-row' },
    h('button', {
      type: 'button',
      textContent: '+ Layer',
      title: 'Add an empty layer',
      onclick: () => change(() => skin.layers.add(createLayer(`Layer ${skin.layers.layers.length + 1}`))),
    }),
    h('button', { type: 'button', textContent: '↑', title: 'Move up', onclick: () => change(() => skin.layers.move(skin.layers.activeId, 1)) }),
    h('button', { type: 'button', textContent: '↓', title: 'Move down', onclick: () => change(() => skin.layers.move(skin.layers.activeId, -1)) }),
    h('button', { type: 'button', textContent: 'Delete', title: 'Delete layer', onclick: () => change(() => skin.layers.remove(skin.layers.activeId)) }),
  );

  root.replaceChildren(h('h2', { textContent: 'Layers' }), list, actions);

  const render = () => {
    const { layers, activeId } = skin.layers;
    // Painting emits on every pointer move; only rebuild the list when it actually changed.
    const signature = activeId + '|' + layers.map((l) => `${l.id}:${l.name}:${l.visible}`).join(',');
    if (signature === lastSignature) return;
    lastSignature = signature;

    list.replaceChildren(
      ...[...layers].reverse().map((layer) => {
        const visible = h('input', { type: 'checkbox', checked: layer.visible, title: 'Show / hide' });
        visible.addEventListener('click', (e) => e.stopPropagation());
        visible.addEventListener('change', () => change(() => (layer.visible = visible.checked)));
        const item = h('li', { class: layer.id === activeId ? 'layer active' : 'layer' }, visible, h('span', { textContent: layer.name }));
        item.addEventListener('click', () => {
          skin.layers.setActive(layer.id);
          skin.emit();
        });
        return item;
      }),
    );
  };

  return { render };
}
