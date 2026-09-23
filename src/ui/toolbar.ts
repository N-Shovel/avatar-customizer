import type { Tool } from '../editor/tools';
import { h } from './dom';

export interface ToolbarOptions {
  tools: readonly Tool[];
  onTool(tool: Tool): void;
  onUndo(): void;
  onRedo(): void;
  onMirror(on: boolean): void;
  onGrid(on: boolean): void;
}

export interface Toolbar {
  setActiveTool(id: string): void;
  setHistoryState(canUndo: boolean, canRedo: boolean): void;
}

export function mountToolbar(root: HTMLElement, opts: ToolbarOptions): Toolbar {
  const toolButtons = opts.tools.map((tool) =>
    h('button', {
      type: 'button',
      class: 'tool-button',
      textContent: tool.label,
      title: `${tool.label} (${tool.shortcut.toUpperCase()})`,
      onclick: () => opts.onTool(tool),
    }),
  );
  toolButtons.forEach((b, i) => (b.dataset.tool = opts.tools[i].id));

  const undo = h('button', { type: 'button', textContent: 'Undo', title: 'Undo (Ctrl+Z)', onclick: opts.onUndo });
  const redo = h('button', { type: 'button', textContent: 'Redo', title: 'Redo (Ctrl+Y)', onclick: opts.onRedo });

  root.replaceChildren(
    h('h2', { textContent: 'Tools' }),
    h('div', { class: 'tool-grid' }, ...toolButtons),
    h('div', { class: 'button-row' }, undo, redo),
    toggle('Mirror left/right', false, opts.onMirror),
    toggle('Show grid', true, opts.onGrid),
  );

  return {
    setActiveTool(id) {
      for (const b of toolButtons) b.classList.toggle('active', b.dataset.tool === id);
    },
    setHistoryState(canUndo, canRedo) {
      undo.disabled = !canUndo;
      redo.disabled = !canRedo;
    },
  };
}

function toggle(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLLabelElement {
  const input = h('input', { type: 'checkbox', checked: initial });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'checkbox' }, input, ` ${label}`);
}
