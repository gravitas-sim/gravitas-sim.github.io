// =============================================================================
// A PNG or a JPEG, checked before anything decodes it (Prompt 188)
// -----------------------------------------------------------------------------
// A picture a person chose on their own device. Gravitas reads its structure
// itself, in a few hundred bytes of arithmetic, and only a file whose header
// is sound, whose size is inside the bounds of ./limits.js and which ends where
// the format says it ends is handed to the browser's decoder. That keeps a
// declared 65,535 by 65,535 frame (a decompression bomb) and a file cut short
// (which a decoder may draw as a half-grey picture) from ever becoming pixels:
// a refusal here allocates nothing, and the decoder is never asked.
//
//   sniff         the format from the first bytes; the file's name is a hint
//   readPngHeader the signature, IHDR (with its checksum and every field), the
//                 chunk list to IEND (each chunk's length against the file,
//                 each checksum but IDAT's, which the decoder checks), no
//                 bytes after IEND
//   readJpegHeader the marker segments to the frame header (SOF), which codings
//                 the browsers read, the sample precision, the components, and
//                 the EOI marker at the end
//   lumaPlane     RGBA to a Float64 plane of 8-bit gray levels (Rec. 601)
//
// The picture is display-only whatever it holds (ITS PIXELS ARE LEVELS, NOT
// LIGHT: js/dataKinds/contract.js), so the plane's numbers are levels from 0 to
// 255 and say so. Pure: no DOM, no clock, safe in a Worker.
// =============================================================================

import { DataKindError, checkFrame } from './limits.js';

const fail = (code, message) => new DataKindError(code, message);
const hex = n => n.toString(16).padStart(2, '0');

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_MAX_DIM = 0x7fffffff;
const PNG_MAX_CHUNKS = 4096;
const PNG_DEPTHS = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/** The format of a file, from its first bytes, or null. */
export function sniff(bytes) {
  const b = bytes;
  if (
    b.length >= 9 &&
    String.fromCharCode.apply(null, b.subarray(0, 9)) === 'SIMPLE  ='
  )
    return 'fits';
  if (b.length >= 8 && PNG_SIG.every((v, i) => b[i] === v)) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return 'jpeg';
  return null;
}

/** Why a file is none of the formats, as a refusal. */
export function unknownFormat(bytes) {
  if (bytes.length === 0)
    return fail('empty-file', 'the file is empty: it holds no bytes');
  const first = Array.from(bytes.subarray(0, 4), hex).join(' ');
  return fail(
    'unknown-format',
    `this is not a FITS, PNG or JPEG file (its first bytes are ${first})`
  );
}

const u32 = (b, at) =>
  ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
/** CRC-32 of bytes[from, to), as PNG writes it. */
function crc32(b, from, to) {
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const typeAt = (b, at) =>
  String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);

/**
 * A PNG's header and structure, checked.
 * @param {Uint8Array} b
 * @returns {{width: number, height: number, depth: number, color: number, interlaced: boolean, chunks: number}}
 * @throws {DataKindError}
 */
export function readPngHeader(b) {
  if (b.length < 33)
    throw fail(
      'truncated',
      `the PNG ends at byte ${b.length}; its signature and header take 33`
    );
  const len = u32(b, 8);
  const type = typeAt(b, 12);
  if (len !== 13 || type !== 'IHDR')
    throw fail(
      'png-malformed',
      `the first chunk of a PNG is IHDR with 13 bytes of data; this one is ${type} with ${len}`
    );
  if (crc32(b, 12, 29) !== u32(b, 29))
    throw fail(
      'png-malformed',
      "the IHDR chunk's checksum does not match its bytes: the file is damaged or edited"
    );
  const width = u32(b, 16);
  const height = u32(b, 20);
  for (const [name, v] of [
    ['width', width],
    ['height', height],
  ])
    if (v > PNG_MAX_DIM)
      throw fail(
        'png-malformed',
        `the PNG gives a ${name} of ${v}, more than the ${PNG_MAX_DIM} the format allows`
      );
  const [depth, color, compression, filter, interlace] = [
    b[24],
    b[25],
    b[26],
    b[27],
    b[28],
  ];
  if (!PNG_DEPTHS[color]?.includes(depth))
    throw fail(
      'png-malformed',
      `a PNG with colour type ${color} cannot have a bit depth of ${depth}`
    );
  if (compression !== 0 || filter !== 0 || interlace > 1)
    throw fail(
      'png-malformed',
      `the PNG's compression method is ${compression}, its filter method ${filter}, its interlace method ${interlace}; the only methods are 0, 0 and 0 or 1`
    );
  const frame = checkFrame(width, height);
  if (!frame.ok) throw fail(frame.code, frame.message);
  let at = 33;
  let chunks = 1;
  let idat = false;
  let plte = false;
  for (;;) {
    if (at + 12 > b.length)
      throw fail(
        'truncated',
        `the PNG ends at byte ${b.length} with no IEND chunk`
      );
    if (++chunks > PNG_MAX_CHUNKS)
      throw fail(
        'png-malformed',
        `the PNG has more than ${PNG_MAX_CHUNKS} chunks`
      );
    const n = u32(b, at);
    const t = typeAt(b, at + 4);
    if (at + 12 + n > b.length)
      throw fail(
        'truncated',
        `a ${t} chunk of ${n} bytes at byte ${at} runs past the end of the file (${b.length} bytes)`
      );
    if (t !== 'IDAT' && crc32(b, at + 4, at + 8 + n) !== u32(b, at + 8 + n))
      throw fail(
        'png-malformed',
        `the ${t} chunk at byte ${at} fails its checksum`
      );
    if (t === 'IDAT') idat = true;
    else if (t === 'PLTE') plte = true;
    at += 12 + n;
    if (t === 'IEND') {
      if (!idat)
        throw fail(
          'png-malformed',
          'the PNG has no image data (IDAT) before its end'
        );
      if (color === 3 && !plte)
        throw fail('png-malformed', 'a palette PNG has no PLTE chunk');
      if (at !== b.length)
        throw fail(
          'png-malformed',
          `${b.length - at} bytes follow the IEND chunk`
        );
      return {
        width,
        height,
        depth,
        color,
        interlaced: interlace === 1,
        chunks,
      };
    }
  }
}

const SOF_KIND = {
  0xc0: 'baseline',
  0xc1: 'extended sequential',
  0xc2: 'progressive',
  0xc3: 'lossless',
  0xc5: 'differential',
  0xc6: 'differential',
  0xc7: 'differential',
  0xc9: 'arithmetic',
  0xca: 'arithmetic',
  0xcb: 'arithmetic',
  0xcd: 'differential arithmetic',
  0xce: 'differential arithmetic',
  0xcf: 'differential arithmetic',
};
const READ_SOF = new Set([0xc0, 0xc1, 0xc2]);

/**
 * A JPEG's frame header and ending, checked.
 * @param {Uint8Array} b
 * @returns {{width: number, height: number, components: number, progressive: boolean}}
 * @throws {DataKindError}
 */
export function readJpegHeader(b) {
  const noFrame = () =>
    fail(
      'truncated',
      `the JPEG ends at byte ${b.length} before its frame header (SOF)`
    );
  let at = 2;
  for (;;) {
    if (at + 2 > b.length) throw noFrame();
    if (b[at] !== 0xff)
      throw fail(
        'jpeg-malformed',
        `byte ${at} is not a marker (it is 0x${hex(b[at])})`
      );
    const m = b[at + 1];
    if (m === 0xff) {
      at++;
      continue;
    }
    if (m === 0x00 || m === 0xd8)
      throw fail(
        'jpeg-malformed',
        `byte ${at + 1} (0x${hex(m)}) is not a marker a JPEG may have here`
      );
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      at += 2;
      continue;
    }
    if (m === 0xd9)
      throw fail(
        'jpeg-malformed',
        'the JPEG reaches its end (EOI) before any frame header'
      );
    if (m === 0xda)
      throw fail(
        'jpeg-malformed',
        'the JPEG reaches a scan (SOS) before any frame header'
      );
    if (at + 4 > b.length) throw noFrame();
    const len = (b[at + 2] << 8) | b[at + 3];
    if (len < 2)
      throw fail(
        'jpeg-malformed',
        `the marker at byte ${at} (0x${hex(m)}) has a segment length of ${len}; the least is 2`
      );
    if (at + 2 + len > b.length)
      throw fail(
        'truncated',
        `a segment of ${len} bytes at byte ${at} runs past the end of the file (${b.length} bytes)`
      );
    if (SOF_KIND[m] !== undefined) {
      if (!READ_SOF.has(m))
        throw fail(
          'raster-unsupported',
          `the JPEG is coded as ${SOF_KIND[m]} (SOF${m - 0xc0}); only baseline, extended-sequential and progressive Huffman JPEGs are read`
        );
      if (len < 8)
        throw fail(
          'jpeg-malformed',
          `the frame header at byte ${at} is ${len} bytes long; it needs at least 8`
        );
      const precision = b[at + 4];
      if (precision !== 8)
        throw fail(
          'raster-unsupported',
          `the JPEG has ${precision}-bit samples; only 8-bit samples are read`
        );
      const comps = b[at + 9];
      if (comps < 1 || comps > 4)
        throw fail(
          'jpeg-malformed',
          `the frame header at byte ${at} lists ${comps} components; a JPEG has 1 to 4`
        );
      if (len !== 8 + 3 * comps)
        throw fail(
          'jpeg-malformed',
          `the frame header at byte ${at} is ${len} bytes long; ${comps} components need ${8 + 3 * comps}`
        );
      const height = (b[at + 5] << 8) | b[at + 6];
      const width = (b[at + 7] << 8) | b[at + 8];
      const frame = checkFrame(width, height);
      if (!frame.ok) throw fail(frame.code, frame.message);
      if (!(b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9))
        throw fail(
          'truncated',
          `the JPEG has no EOI marker at its end (it ends at byte ${b.length})`
        );
      return { width, height, components: comps, progressive: m === 0xc2 };
    }
    at += 2 + len;
  }
}

/**
 * The header of whichever of the two this is.
 * @param {Uint8Array} b
 * @param {'png'|'jpeg'} kind
 */
export const readRasterHeader = (b, kind) =>
  kind === 'png' ? readPngHeader(b) : readJpegHeader(b);

/**
 * RGBA bytes to a Float64 plane of gray levels, 0 to 255, by Rec. 601 weights
 * (0.299, 0.587, 0.114) on the 8-bit channels as the decoder gave them,
 * transparency ignored. Rows are polled for cancellation.
 * @param {Uint8ClampedArray|Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @param {{isCancelled?: () => boolean}} [hooks]
 * @returns {Float64Array} Top row first, as a picture is stored
 */
export function lumaPlane(rgba, width, height, { isCancelled } = {}) {
  if (rgba.length !== 4 * width * height)
    throw fail(
      'dimension-mismatch',
      `${rgba.length} bytes are not ${width} by ${height} pixels of 4 channels`
    );
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    if (y % 64 === 0 && isCancelled?.())
      throw fail('canceled', 'the read was canceled');
    for (let x = 0, i = y * width, o = 4 * i; x < width; x++, i++, o += 4)
      out[i] = (299 * rgba[o] + 587 * rgba[o + 1] + 114 * rgba[o + 2]) / 1000;
  }
  return out;
}

/** The rows of a picture (top first) turned over to FITS order (lowest row first). */
export function flipRows(values, width, height) {
  const out = new Float64Array(values.length);
  for (let y = 0; y < height; y++)
    out.set(
      values.subarray(y * width, (y + 1) * width),
      (height - 1 - y) * width
    );
  return out;
}
