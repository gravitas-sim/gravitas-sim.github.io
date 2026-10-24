// =============================================================================
// Hostile PNGs made from an authentic frame (Prompt 189, leg import.hostilePng)
// -----------------------------------------------------------------------------
// The contract (tests/fixtures/imagePacks/analysis-contract.json) names the leg:
// the authentic Galileo Moon frame of the pack, written as an 8-bit gray PNG by
// the committed deterministic builder of Prompt 188 (png in
// tools/image-import-cases.mjs), and hostile variants made from that file. Each
// variant is one named edit. Nothing here is downloaded or random; no digest is
// taken over deflate bytes (Node 20, 22 and 24 differ in the last bit of zlib
// output), only over the rows that were compressed.
//
// `stage` says where the contract expects the variant to be judged: `header`
// (js/dataKinds/raster.js reads the structure in Node, and the page does the
// same before any decoder) or `pixels` (the damage is inside the compressed
// rows, which only a decoder reaches: judged in the page by e2e/imagePacks.spec.js,
// and in Node only held to the time bound and to throwing nothing but the
// reader's own error). `expect` is what the contract says the outcome is.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG_SIGNATURE, png, pngChunk } from './image-import-cases.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = 'galileo-moon-19921207';

/** The pack's pixels, 496 by 496 display levels, row 1 at the bottom (the frames file). */
export function moonLevels() {
  const doc = JSON.parse(
    readFileSync(path.join(ROOT, `frames/${PACK}.json`), 'utf8')
  );
  return {
    width: doc.width,
    height: doc.height,
    values: Uint8Array.from(Buffer.from(doc.planes.data.base64, 'base64')),
  };
}

/** The filter-0 rows of the picture, top row first (a PNG's order). */
export function moonRows() {
  const { width, height, values } = moonLevels();
  const out = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    const from = (height - 1 - y) * width;
    out.set(values.subarray(from, from + width), y * (width + 1) + 1);
  }
  return { width, height, rows: out };
}

const u32 = n => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const ihdr = (w, h, depth = 8, color = 0, interlace = 0) =>
  Buffer.concat([u32(w), u32(h), Buffer.from([depth, color, 0, 0, interlace])]);

/** The intact file, and the hostile variants made from it. */
export function variants() {
  const { width: W, height: H, rows } = moonRows();
  const idat = deflateSync(rows, { level: 6 });
  const intact = png({ width: W, height: H, idat });
  const flip = (buf, at) => {
    const b = Buffer.from(buf);
    b[at] ^= 0xff;
    return b;
  };
  // the first IDAT chunk starts after the signature (8) and IHDR (25)
  const idatAt = 33;
  return [
    ['intact', 'read', 'header', () => intact],
    [
      'truncated after the signature',
      'refuse',
      'header',
      () => intact.subarray(0, 8),
    ],
    ['truncated inside IHDR', 'refuse', 'header', () => intact.subarray(0, 20)],
    [
      'truncated inside the first IDAT',
      'refuse',
      'header',
      () => intact.subarray(0, idatAt + 8 + 1000),
    ],
    [
      'truncated before IEND',
      'refuse',
      'header',
      () => intact.subarray(0, intact.length - 12),
    ],
    ['IHDR checksum flipped', 'refuse', 'header', () => flip(intact, 29)],
    [
      'IDAT checksum flipped',
      'refuse',
      'pixels',
      () => flip(intact, idatAt + 8 + idat.length),
    ],
    [
      'IHDR width and height 65535',
      'refuse',
      'header',
      () => png({ ihdrData: ihdr(65535, 65535), idat }),
    ],
    [
      'IHDR width 0',
      'refuse',
      'header',
      () => png({ ihdrData: ihdr(0, H), idat }),
    ],
    [
      'bit depth 16 with colour type 3',
      'refuse',
      'header',
      () => png({ ihdrData: ihdr(W, H, 16, 3), idat }),
    ],
    [
      'interlace method 1 with a short IDAT',
      'refuse',
      'pixels',
      () =>
        png({
          ihdrData: ihdr(W, H, 8, 0, 1),
          idat: deflateSync(rows.subarray(0, 3 * (W + 1))),
        }),
    ],
    [
      'chunk length 4294967295',
      'refuse',
      'header',
      () =>
        png({
          width: W,
          height: H,
          idat,
          middle: [
            pngChunk('tEXt', Buffer.from('k\0v'), { length: 0xffffffff }),
          ],
        }),
    ],
    [
      'IDAT that inflates past the declared size',
      'refuse',
      'pixels',
      () =>
        png({
          width: W,
          height: H,
          idat: deflateSync(Buffer.concat([rows, Buffer.alloc(1 << 20)]), {
            level: 6,
          }),
        }),
    ],
    [
      'IDAT of zeros that inflates to 64 MiB',
      'refuse',
      'pixels',
      () =>
        png({
          width: W,
          height: H,
          idat: deflateSync(Buffer.alloc(64 << 20), { level: 9 }),
        }),
    ],
    [
      'a second IHDR',
      'refuse',
      'pixels',
      () =>
        png({
          width: W,
          height: H,
          idat,
          middle: [pngChunk('IHDR', ihdr(W, H))],
        }),
    ],
    [
      'a PLTE before IHDR',
      'refuse',
      'header',
      () =>
        Buffer.concat([
          PNG_SIGNATURE,
          pngChunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])),
          pngChunk('IHDR', ihdr(W, H)),
          pngChunk('IDAT', idat),
          pngChunk('IEND'),
        ]),
    ],
    [
      'extra bytes after IEND',
      'read',
      'header',
      () =>
        png({ width: W, height: H, idat, trailing: Buffer.from('trailing') }),
    ],
  ];
}
