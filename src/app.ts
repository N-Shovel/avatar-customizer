import { PART_LABELS, type BodyPart, type RGBA } from './core/constants';
import { createDefaultBase } from './core/defaultSkin';
import { History } from './core/history';
import { createLayer } from './core/layers';
import { Skin, type SkinSnapshot } from './core/skin';
import { locatePixel } from './core/uvMap';
import { applyPart, removePart } from './customizer/partSelector';
import { CanvasEditor } from './editor/canvasEditor';
import { TOOLS, type Tool, type ToolContext } from './editor/tools';
import { exportPng, renderToCanvas } from './io/exporter';
import { importSkinFile } from './io/importer';
import { loadSavedSkin, saveSkin } from './io/storage';
import { mountPreviewControls } from './preview/controls';
import { SkinPreview } from './preview/viewer';
import { mountBodyPartBar } from './ui/bodyPartBar';
import { mountColorPicker } from './ui/colorPicker';
import { byId } from './ui/dom';
import { mountLayerPanel } from './ui/layerPanel';
import { mountModelToggle } from './ui/modelToggle';
import { mountPartPanel } from './ui/partPanel';
import { mountToolbar } from './ui/toolbar';

const AUTOSAVE_DELAY_MS = 500;

function createStartingSkin(): Skin {
  const saved = loadSavedSkin();
  if (saved) {
    const skin = new Skin(saved.model, saved.layers);
    const active = saved.layers[saved.activeIndex];
    if (active) skin.layers.setActive(active.id);
    return skin;
  }
  return new Skin('classic', [createLayer('Base', createDefaultBase('classic'))]);
}

export function startApp(): void {
  const skin = createStartingSkin();
  const history = new History<SkinSnapshot>();

  let tool: Tool = TOOLS[0];
  let color: RGBA = [37, 99, 235, 255];
  let mirror = false;

  const record = () => {
    history.record(skin.snapshot());
    toolbar.setHistoryState(history.canUndo, history.canRedo);
  };

  const undo = () => {
    const previous = history.undo(skin.snapshot());
    if (previous) skin.restore(previous);
  };

  const redo = () => {
    const next = history.redo(skin.snapshot());
    if (next) skin.restore(next);
  };

  const selectTool = (next: Tool) => {
    tool = next;
    toolbar.setActiveTool(next.id);
  };

  // --- Panels -------------------------------------------------------------
  const toolbar = mountToolbar(byId('toolbar'), {
    tools: TOOLS,
    onTool: selectTool,
    onUndo: undo,
    onRedo: redo,
    onMirror: (on) => (mirror = on),
    onGrid: (on) => {
      editor.showGrid = on;
      editor.render();
    },
  });

  const colorPicker = mountColorPicker(byId('color-picker'), color, (c) => (color = c));

  const modelToggle = mountModelToggle(byId('model-toggle'), skin.model, (model) => {
    record();
    skin.setModel(model);
  });

  const layerPanel = mountLayerPanel(byId('layer-panel'), skin, record);

  mountPartPanel(byId('part-panel'), {
    onApply: (part, tint) => {
      record();
      applyPart(skin, part, tint).catch((err) => showStatus(`Could not load part: ${err.message}`));
    },
    onRemove: (category) => {
      record();
      removePart(skin, category);
    },
  });

  // --- Editor & preview ---------------------------------------------------
  const status = byId('status');
  const showStatus = (text: string) => (status.textContent = text || ' ');

  const toolContext: ToolContext = {
    skin,
    get color() {
      return color;
    },
    get mirror() {
      return mirror;
    },
    setColor(c) {
      color = c;
      colorPicker.setColor(c);
    },
  };

  const editor = new CanvasEditor(byId<HTMLCanvasElement>('editor-canvas'), skin, {
    getTool: () => tool,
    getContext: () => toolContext,
    onStrokeStart: (p) => {
      record();
      const hit = locatePixel(skin.model, p.x, p.y);
      if (hit) preview.showEditedFace(hit.face);
    },
    onHover: (p) => {
      if (!p) return showStatus('');
      const hit = locatePixel(skin.model, p.x, p.y);
      const where = hit ? `${PART_LABELS[hit.part]} · ${hit.face} (${hit.layer === 'base' ? 'base' : 'outer layer'})` : 'unused';
      showStatus(`x ${p.x}, y ${p.y} — ${where}`);
    },
  });

  const preview = new SkinPreview(byId<HTMLCanvasElement>('preview-canvas'), byId('preview-host'));
  mountPreviewControls(byId('preview-controls'), preview);
  const texture = document.createElement('canvas');

  // --- Body part focus (shared by the 2D editor and the 3D preview) --------
  let focus: BodyPart | null = null;
  const setFocus = (part: BodyPart | null) => {
    focus = part;
    bodyPartBar.setActive(part);
    editor.focusPart = part;
    editor.render();
    preview.setFocus(part);
  };
  const bodyPartBar = mountBodyPartBar(byId('body-part-bar'), setFocus);
  // Clicking a part focuses it; clicking it again (or empty space) shows the whole player.
  preview.onPartClick((part) => setFocus(part === focus ? null : part));
  bodyPartBar.setActive(null);

  const previewPane = byId('preview-pane');
  byId('preview-collapse').addEventListener('click', (e) => {
    const collapsed = previewPane.classList.toggle('collapsed');
    (e.currentTarget as HTMLButtonElement).textContent = collapsed ? '▢' : '–';
  });

  // --- Change handling ----------------------------------------------------
  let saveTimer: number | undefined;
  skin.onChange(() => {
    editor.render();
    preview.update(renderToCanvas(skin, texture), skin.model);
    layerPanel.render();
    modelToggle.set(skin.model);
    toolbar.setHistoryState(history.canUndo, history.canRedo);
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveSkin(skin), AUTOSAVE_DELAY_MS);
  });

  // --- Header actions -----------------------------------------------------
  byId('btn-new').addEventListener('click', () => {
    if (!confirm('Start a new skin? You can undo this.')) return;
    record();
    skin.replace(skin.model, [createLayer('Base', createDefaultBase(skin.model))]);
  });

  byId('btn-export').addEventListener('click', () => {
    exportPng(skin).catch((err) => showStatus(err.message));
  });

  const fileInput = byId<HTMLInputElement>('file-import');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const imported = await importSkinFile(file);
      record();
      skin.replace(imported.model, [createLayer(file.name.replace(/\.png$/i, ''), imported.pixels)]);
      showStatus(`Imported ${file.name} (${imported.model} model).`);
    } catch (err) {
      showStatus((err as Error).message);
    }
  });

  // --- Keyboard shortcuts -------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      redo();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const match = TOOLS.find((t) => t.shortcut === key);
      if (match) selectTool(match);
    }
  });

  selectTool(tool);
  skin.emit();
}
