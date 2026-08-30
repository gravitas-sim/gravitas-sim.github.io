#!/usr/bin/env node
/**
 * Generate social-card.png (1200x630) for the Open Graph / Twitter preview.
 *
 *   node tools/make-social-card.js
 *
 * Written as a generator rather than a checked-in binary so the card can be
 * regenerated when the branding changes, and reviewed as a diff. Uses only
 * Node's built-in zlib: no image dependencies.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 1200;
const H = 630;

// --- Canvas ------------------------------------------------------------------
const px = new Float64Array(W * H * 3);

const setPx = (x, y, r, g, b) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
};

const addPx = (x, y, r, g, b, a) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] += r * a;
  px[i + 1] += g * a;
  px[i + 2] += b * a;
};

// --- Deterministic noise ------------------------------------------------------
// A fixed seed keeps the output byte-identical between runs, so regenerating
// the card produces an empty diff unless the design actually changed.
let seed = 0x9e3779b9;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 100000) / 100000;
};

// --- Background: the --space-near / --space-far token gradient ----------------
const NEAR = [0x14, 0x18, 0x33];
const FAR = [0x05, 0x06, 0x0d];
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const r = NEAR[0] + (FAR[0] - NEAR[0]) * t;
  const g = NEAR[1] + (FAR[1] - NEAR[1]) * t;
  const b = NEAR[2] + (FAR[2] - NEAR[2]) * t;
  for (let x = 0; x < W; x++) setPx(x, y, r, g, b);
}

// --- Starfield ---------------------------------------------------------------
for (let i = 0; i < 1400; i++) {
  const x = Math.floor(rand() * W);
  const y = Math.floor(rand() * H);
  const b = 90 + rand() * 165;
  const size = rand() < 0.06 ? 1.6 : rand() < 0.3 ? 1.1 : 0.7;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const d = Math.hypot(dx, dy);
      const a = Math.max(0, 1 - d / size);
      if (a > 0) addPx(x + dx, y + dy, b, b, b * 1.03, a * a);
    }
  }
}

/**
 * Draw a soft radial glow.
 * @param {number} cx - Center x
 * @param {number} cy - Center y
 * @param {number} radius - Falloff radius
 * @param {Array<number>} rgb - Color
 * @param {number} strength - Peak intensity
 */
function glow(cx, cy, radius, rgb, strength) {
  const r0 = Math.ceil(radius);
  for (let dy = -r0; dy <= r0; dy++) {
    for (let dx = -r0; dx <= r0; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const a = (1 - d / radius) ** 2.2 * strength;
      addPx(cx + dx, cy + dy, rgb[0], rgb[1], rgb[2], a);
    }
  }
}

/** Draw a filled disk (the event horizon). */
function disk(cx, cy, radius, rgb) {
  const r0 = Math.ceil(radius) + 2;
  for (let dy = -r0; dy <= r0; dy++) {
    for (let dx = -r0; dx <= r0; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > radius + 1) continue;
      const edge = Math.min(1, Math.max(0, radius - d));
      const i = ((cy + dy) * W + (cx + dx)) * 3;
      if (cx + dx < 0 || cy + dy < 0 || cx + dx >= W || cy + dy >= H) continue;
      px[i] = px[i] * (1 - edge) + rgb[0] * edge;
      px[i + 1] = px[i + 1] * (1 - edge) + rgb[1] * edge;
      px[i + 2] = px[i + 2] * (1 - edge) + rgb[2] * edge;
    }
  }
}

/**
 * Draw an accretion disk as a thin ellipse, brighter on one side to stand in
 * for the Doppler beaming the simulation renders.
 */
function accretionDisc(cx, cy, rx, ry, tilt, rgb, strength) {
  const steps = 2600;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const beam = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(th));
    for (let w = -3; w <= 3; w++) {
      const ex = (rx + w) * Math.cos(th);
      const ey = (ry + w * 0.35) * Math.sin(th);
      const x = Math.round(cx + ex * cos - ey * sin);
      const y = Math.round(cy + ex * sin + ey * cos);
      const fade = 1 - Math.abs(w) / 4;
      addPx(x, y, rgb[0], rgb[1], rgb[2], strength * beam * fade * 0.5);
    }
  }
}

// Two black holes, echoing the default Binary BH scenario
accretionDisc(455, 330, 210, 30, -0.22, [255, 205, 140], 0.5);
glow(455, 330, 105, [255, 190, 120], 0.5);
disk(455, 330, 40, [3, 3, 6]);

accretionDisc(775, 300, 165, 24, -0.22, [255, 214, 165], 0.42);
glow(775, 300, 82, [255, 200, 140], 0.42);
disk(775, 300, 31, [3, 3, 6]);

// --- Vignette ----------------------------------------------------------------
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2);
    const dy = (y - H / 2) / (H / 2);
    const d = Math.min(1, Math.hypot(dx, dy) / 1.32);
    const k = 1 - 0.62 * d * d;
    const i = (y * W + x) * 3;
    px[i] *= k;
    px[i + 1] *= k;
    px[i + 2] *= k;
  }
}

// --- Wordmark ----------------------------------------------------------------
// A 5x7 bitmap font, just the glyphs this card needs. Cheaper and more honest
// than shipping a font file to render eight letters.
const FONT = {
  G: ['01110', '10001', '10000', '10011', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
};

/**
 * Render text with the bitmap font.
 * @param {string} text - Characters to draw (must exist in FONT)
 * @param {number} cx - Center x
 * @param {number} y - Top y
 * @param {number} scale - Pixels per font cell
 * @param {number} tracking - Extra pixels between glyphs
 * @param {Array<number>} rgb - Color
 */
function drawText(text, cx, y, scale, tracking, rgb) {
  const glyphW = 5 * scale + tracking;
  const totalW = text.length * glyphW - tracking;
  let x = Math.round(cx - totalW / 2);
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] !== '1') continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPx(x + col * scale + sx, y + row * scale + sy, ...rgb);
            }
          }
        }
      }
    }
    x += glyphW;
  }
}

drawText('GRAVITAS', W / 2, 452, 11, 9, [233, 237, 247]);

// Rule under the wordmark
for (let x = W / 2 - 210; x < W / 2 + 210; x++) {
  const t = 1 - Math.abs(x - W / 2) / 210;
  addPx(x, 556, 56, 189, 248, t * 0.85);
  addPx(x, 557, 56, 189, 248, t * 0.5);
}

// --- PNG encode --------------------------------------------------------------
const raw = Buffer.alloc(H * (W * 3 + 1));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i])));
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i + 1])));
    raw[p++] = Math.max(0, Math.min(255, Math.round(px[i + 2])));
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: truecolour
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'social-card.png'
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`social-card.png  ${W}x${H}  ${(png.length / 1024).toFixed(1)} KB`);
