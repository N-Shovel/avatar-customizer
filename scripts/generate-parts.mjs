// Generates starter part PNGs into public/assets/parts/ and writes src/data/parts.json.
// Each part is a full 64×64 transparent skin texture that only paints its own region.
// Recolorable parts are drawn in light gray so the app can tint them to any color.
//
// Run with: npm run generate:parts

import { crc32, deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS_DIR = join(ROOT, 'public/assets/parts');
const CATALOG_FILE = join(ROOT, 'src/data/parts.json');
const SIZE = 64;

// Classic-model UV layout (mirrors src/core/uvMap.ts).
const BOXES = {
  head: { size: [8, 8, 8], base: [0, 0], overlay: [32, 0] },
  body: { size: [8, 12, 4], base: [16, 16], overlay: [16, 32] },
  rightArm: { size: [4, 12, 4], base: [40, 16], overlay: [40, 32] },
  leftArm: { size: [4, 12, 4], base: [32, 48], overlay: [48, 48] },
  rightLeg: { size: [4, 12, 4], base: [0, 16], overlay: [0, 32] },
  leftLeg: { size: [4, 12, 4], base: [16, 48], overlay: [0, 48] },
};

const SIDE_FACES = ['front', 'right', 'left', 'back'];
const ALL_FACES = ['top', 'bottom', ...SIDE_FACES];

// Simple lighting so parts look 3D even before tinting.
const SHADE = { top: 1, front: 0.95, right: 0.86, left: 0.86, back: 0.8, bottom: 0.7 };

function faceRect(part, face, layer = 'base') {
  const { size, [layer]: uv } = BOXES[part];
  const [w, h, d] = size;
  const [u, v] = uv;
  return {
    top: { x: u + d, y: v, w, h: d },
    bottom: { x: u + d + w, y: v, w, h: d },
    right: { x: u, y: v + d, w: d, h },
    front: { x: u + d, y: v + d, w, h },
    left: { x: u + d + w, y: v + d, w: d, h },
    back: { x: u + d + w + d, y: v + d, w, h },
  }[face];
}

class Texture {
  pixels = Buffer.alloc(SIZE * SIZE * 4);

  set(x, y, [r, g, b, a = 255]) {
    const i = (y * SIZE + x) * 4;
    this.pixels[i] = r;
    this.pixels[i + 1] = g;
    this.pixels[i + 2] = b;
    this.pixels[i + 3] = a;
  }

  /** Fills rows [fromRow, toRow) of a face (rows are relative to the face). */
  face(part, face, color, { layer = 'base', fromRow = 0, toRow = Infinity, shade = true } = {}) {
    const r = faceRect(part, face, layer);
    const k = shade ? SHADE[face] : 1;
    const c = [color[0] * k, color[1] * k, color[2] * k, color[3] ?? 255].map(Math.round);
    for (let y = r.y + fromRow; y < r.y + Math.min(r.h, toRow); y++) {
      for (let x = r.x; x < r.x + r.w; x++) this.set(x, y, c);
    }
  }

  faces(part, faces, color, opts) {
    for (const f of faces) this.face(part, f, color, opts);
  }

  /** Sets a pixel at (col, row) inside a face. */
  at(part, face, col, row, color, layer = 'base') {
    const r = faceRect(part, face, layer);
    this.set(r.x + col, r.y + row, color);
  }
}

const GRAY = [245, 245, 245];
const DARK = [60, 60, 60];

const PARTS = [
  {
    id: 'hair-short', name: 'Short', category: 'hair', recolorable: true, defaultColor: '#5a3825',
    draw(t) {
      t.face('head', 'top', GRAY);
      t.face('head', 'front', GRAY, { toRow: 2 });
      t.at('head', 'front', 0, 2, GRAY.map((c) => c * 0.95));
      t.at('head', 'front', 7, 2, GRAY.map((c) => c * 0.95));
      t.faces('head', ['right', 'left'], GRAY, { toRow: 3 });
      t.face('head', 'back', GRAY, { toRow: 6 });
    },
  },
  {
    id: 'hair-long', name: 'Long', category: 'hair', recolorable: true, defaultColor: '#d9a441',
    draw(t) {
      t.face('head', 'top', GRAY);
      t.face('head', 'front', GRAY, { toRow: 2 });
      for (let row = 2; row < 8; row++) {
        t.at('head', 'front', 0, row, GRAY.map((c) => c * 0.95));
        t.at('head', 'front', 7, row, GRAY.map((c) => c * 0.95));
      }
      t.faces('head', ['right', 'left', 'back'], GRAY);
      t.face('body', 'back', GRAY, { toRow: 5 });
    },
  },
  {
    id: 'face-smile', name: 'Smile', category: 'faces', recolorable: false,
    draw(t) {
      const brow = [74, 48, 32];
      const white = [255, 255, 255];
      const iris = [46, 90, 170];
      const mouth = [150, 70, 70];
      for (const col of [1, 2, 5, 6]) t.at('head', 'front', col, 3, brow);
      t.at('head', 'front', 1, 4, white);
      t.at('head', 'front', 2, 4, iris);
      t.at('head', 'front', 5, 4, iris);
      t.at('head', 'front', 6, 4, white);
      // Mouth corners one row higher than the middle make a smile.
      t.at('head', 'front', 2, 6, mouth);
      t.at('head', 'front', 3, 7, mouth);
      t.at('head', 'front', 4, 7, mouth);
      t.at('head', 'front', 5, 6, mouth);
    },
  },
  {
    id: 'shirt-tee', name: 'T-shirt', category: 'shirts', recolorable: true, defaultColor: '#2563eb',
    draw(t) {
      t.faces('body', ALL_FACES, GRAY);
      for (const arm of ['rightArm', 'leftArm']) {
        t.face(arm, 'top', GRAY);
        t.faces(arm, SIDE_FACES, GRAY, { toRow: 4 });
      }
    },
  },
  {
    id: 'shirt-hoodie', name: 'Hoodie', category: 'shirts', recolorable: true, defaultColor: '#6b7280',
    draw(t) {
      t.faces('body', ALL_FACES, GRAY);
      for (const arm of ['rightArm', 'leftArm']) t.faces(arm, ALL_FACES, GRAY);
      // Pocket and drawstrings.
      for (let col = 2; col < 6; col++) t.at('body', 'front', col, 8, GRAY.map((c) => c * 0.8));
      t.at('body', 'front', 3, 1, [255, 255, 255]);
      t.at('body', 'front', 3, 2, [255, 255, 255]);
      t.at('body', 'front', 4, 1, [255, 255, 255]);
      t.at('body', 'front', 4, 2, [255, 255, 255]);
    },
  },
  {
    id: 'pants-jeans', name: 'Jeans', category: 'pants', recolorable: true, defaultColor: '#1e3a8a',
    draw(t) {
      for (const leg of ['rightLeg', 'leftLeg']) t.faces(leg, ALL_FACES, GRAY);
      t.faces('body', SIDE_FACES, GRAY, { fromRow: 10 });
      t.face('body', 'bottom', GRAY);
    },
  },
  {
    id: 'pants-shorts', name: 'Shorts', category: 'pants', recolorable: true, defaultColor: '#65a30d',
    draw(t) {
      for (const leg of ['rightLeg', 'leftLeg']) {
        t.face(leg, 'top', GRAY);
        t.faces(leg, SIDE_FACES, GRAY, { toRow: 5 });
      }
      t.faces('body', SIDE_FACES, GRAY, { fromRow: 10 });
      t.face('body', 'bottom', GRAY);
    },
  },
  {
    id: 'shoes-sneakers', name: 'Sneakers', category: 'shoes', recolorable: true, defaultColor: '#f5f5f5',
    draw(t) {
      for (const leg of ['rightLeg', 'leftLeg']) {
        t.faces(leg, SIDE_FACES, GRAY, { fromRow: 10 });
        t.face(leg, 'bottom', GRAY.map((c) => c * 0.6), { shade: false });
      }
    },
  },
  {
    id: 'acc-cap', name: 'Cap', category: 'accessories', recolorable: true, defaultColor: '#dc2626',
    draw(t) {
      const opts = { layer: 'overlay' };
      t.face('head', 'top', GRAY, opts);
      t.face('head', 'front', GRAY, { ...opts, toRow: 2 });
      t.faces('head', ['right', 'left'], GRAY, { ...opts, toRow: 2 });
      t.face('head', 'back', GRAY, { ...opts, toRow: 3 });
    },
  },
  {
    id: 'acc-glasses', name: 'Glasses', category: 'accessories', recolorable: false,
    draw(t) {
      const frame = [25, 25, 25];
      const lens = [30, 30, 40, 140];
      for (let col = 0; col < 8; col++) t.at('head', 'front', col, 3, frame, 'overlay');
      for (const col of [0, 3, 4, 7]) t.at('head', 'front', col, 4, frame, 'overlay');
      for (const col of [1, 2, 5, 6]) t.at('head', 'front', col, 4, lens, 'overlay');
      t.at('head', 'right', 7, 3, frame, 'overlay');
      t.at('head', 'left', 0, 3, frame, 'overlay');
    },
  },
];

// --- Minimal PNG encoder (RGBA, 8-bit, no dependencies) ---------------------

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA
  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Write files ------------------------------------------------------------

const catalog = [];
for (const { draw, ...def } of PARTS) {
  const texture = new Texture();
  draw(texture);
  const file = `${def.category}/${def.id}.png`;
  mkdirSync(join(PARTS_DIR, def.category), { recursive: true });
  writeFileSync(join(PARTS_DIR, file), encodePng(texture.pixels));
  catalog.push({ ...def, file });
}

mkdirSync(dirname(CATALOG_FILE), { recursive: true });
writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Wrote ${catalog.length} parts to public/assets/parts and src/data/parts.json`);
