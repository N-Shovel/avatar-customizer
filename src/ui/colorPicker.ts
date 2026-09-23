import { hexToRgba, rgbaToHex } from '../core/color';
import type { RGBA } from '../core/constants';
import { h } from './dom';

const PALETTE = [
  '#000000', '#3f3f3f', '#7f7f7f', '#ffffff',
  '#6b3e26', '#a0673d', '#e0ac82', '#f6d2b0',
  '#b91c1c', '#f97316', '#facc15', '#65a30d',
  '#0d9488', '#2563eb', '#7c3aed', '#db2777',
];

const MAX_RECENT = 8;

export interface ColorPicker {
  setColor(color: RGBA): void;
}

export function mountColorPicker(root: HTMLElement, initial: RGBA, onChange: (color: RGBA) => void): ColorPicker {
  const input = h('input', { type: 'color', value: rgbaToHex(initial), class: 'color-input' });
  const recentRow = h('div', { class: 'swatches' });
  const recent: string[] = [];

  const choose = (hex: string) => {
    input.value = hex;
    remember(hex);
    onChange(hexToRgba(hex));
  };

  const remember = (hex: string) => {
    const i = recent.indexOf(hex);
    if (i !== -1) recent.splice(i, 1);
    recent.unshift(hex);
    recent.length = Math.min(recent.length, MAX_RECENT);
    recentRow.replaceChildren(...recent.map((c) => swatch(c, choose)));
  };

  input.addEventListener('change', () => choose(input.value));
  input.addEventListener('input', () => onChange(hexToRgba(input.value)));

  root.replaceChildren(
    h('h2', { textContent: 'Color' }),
    input,
    h('div', { class: 'swatches' }, ...PALETTE.map((c) => swatch(c, choose))),
    h('h3', { textContent: 'Recent' }),
    recentRow,
  );

  return {
    setColor(color) {
      const hex = rgbaToHex(color);
      input.value = hex;
      remember(hex);
    },
  };
}

function swatch(hex: string, onPick: (hex: string) => void): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'swatch', title: hex, onclick: () => onPick(hex) });
  button.style.background = hex;
  return button;
}
