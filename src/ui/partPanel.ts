import { hexToRgba } from '../core/color';
import type { RGBA } from '../core/constants';
import { CATEGORIES, partUrl, partsIn, type PartCategory, type PartDef } from '../customizer/partCatalog';
import { h } from './dom';

export interface PartPanelOptions {
  onApply(part: PartDef, tint: RGBA): void;
  onRemove(category: PartCategory): void;
}

/** Tabs per category, a grid of parts, and a tint color for recolorable parts. */
export function mountPartPanel(root: HTMLElement, opts: PartPanelOptions): void {
  let category: PartCategory = CATEGORIES[0].id;
  let selected: PartDef | null = null;

  const tabs = h('div', { class: 'tabs' });
  const grid = h('div', { class: 'part-grid' });
  const tint = h('input', { type: 'color', class: 'color-input', title: 'Part color' });
  const tintRow = h('label', { class: 'tint-row' }, 'Part color ', tint);

  tint.addEventListener('input', () => {
    if (selected?.recolorable) opts.onApply(selected, hexToRgba(tint.value));
  });

  const renderTabs = () => {
    tabs.replaceChildren(
      ...CATEGORIES.map((c) =>
        h('button', {
          type: 'button',
          class: c.id === category ? 'tab active' : 'tab',
          textContent: c.label,
          onclick: () => {
            category = c.id;
            selected = null;
            renderTabs();
            renderGrid();
          },
        }),
      ),
    );
  };

  const renderGrid = () => {
    const parts = partsIn(category);
    if (parts.length === 0) {
      grid.replaceChildren(h('p', { class: 'muted', textContent: 'No parts in this category yet.' }));
      return;
    }
    grid.replaceChildren(
      h('button', { type: 'button', class: 'part none', textContent: 'None', onclick: () => opts.onRemove(category) }),
      ...parts.map((part) =>
        h(
          'button',
          {
            type: 'button',
            class: part === selected ? 'part active' : 'part',
            title: part.name,
            onclick: () => {
              selected = part;
              if (part.defaultColor) tint.value = part.defaultColor;
              tintRow.hidden = !part.recolorable;
              opts.onApply(part, hexToRgba(tint.value));
              renderGrid();
            },
          },
          h('img', { src: partUrl(part), alt: '' }),
          h('span', { textContent: part.name }),
        ),
      ),
    );
  };

  tintRow.hidden = true;
  root.replaceChildren(h('h2', { textContent: 'Parts' }), tabs, grid, tintRow);
  renderTabs();
  renderGrid();
}
