// =============================================================================
// The image import's cases, bounds and thresholds (Prompt 188)
// -----------------------------------------------------------------------------
// Committed BEFORE the modules they judge exist (js/dataKinds/raster.js,
// rasterJob.js, js/observatory/imageImport.js): every hostile file, every code,
// every exact English message of the PNG and JPEG readers and every bound
// below was written down first, and tests/imageImport.test.js and
// e2e/imageImport.spec.js run the modules against them. Nothing here imports
// the code under test. The FITS cases are Prompt 157's own (REFUSE in
// tools/data-kinds-cases.mjs, 73 files, committed then); the page must show
// each of them, in both languages, never hang and never read one as an image.
//
// What is generated, and how: every file is built here, byte for byte, from
// code, deterministic (no clock, no random source, no file read). PNG chunks
// carry real CRC-32s and zlib streams from node:zlib at a fixed level; JPEG
// files are marker skeletons (a structure the reader can walk, not a picture a
// decoder can draw), which is the point of a hostile file. Nothing is
// downloaded, fetched or read from the network.
//
// Nothing that passes through log, exp, pow or trigonometry is stored as a
// golden value, and no digest is taken over deflate bytes (Node 20, 22 and 24
// do not agree on the last bit of deflate output across versions of zlib).
// =============================================================================

import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';

// --- The bounds, as committed -------------------------------------------------

/**
 * What the import holds a hostile file to. The sizes are Prompt 157's
 * (js/dataKinds/limits.js, committed in tools/data-kinds-cases.mjs): a frame
 * of 4,194,304 pixels at most, 8,192 a side, a file of 33,647,040 bytes at
 * most. The times and bytes below are this prompt's, fixed before any
 * measurement and never moved afterwards.
 */
export const BOUNDS = Object.freeze({
  maxFileBytes: 33647040,
  maxPixels: 4194304,
  maxAxis: 8192,
  // A refusal that needs no allocation allocates none: the ArrayBuffer bytes
  // a refusal adds to the process (Node, arrayBuffers) stay under 1 MiB.
  refusalArrayBufferBytes: 1048576,
  // Pure header refusals, per file, in Node: from the bytes to the verdict.
  refusalMsNode: 250,
  // In the page: from the file chosen to the refusal on screen, Chromium.
  refusalMsPage: 2000,
  // The largest frame (2,048 by 2,048, FITS BITPIX -64) opened in the page,
  // chosen to shown: the gate's 330 ms at CPU x4 with a wide allowance for a
  // loaded runner.
  largestOpenMsPage: 5000,
  // A file over the limit is refused with no byte of it read.
  oversizeBytesRead: 0,
  // After a cancelled decode: the ledger is empty at once, no import Worker
  // is alive within 2 s, and the page's JS heap, after a collection, is within
  // 8 MiB of where it was before the import began.
  cancelledLedgerBytes: 0,
  cancelledWorkersAfterMs: 2000,
  cancelledHeapBytes: 8388608,
  // Every control and inline link of the import panel.
  targetPx: 24,
});

// --- Builders -----------------------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 as PNG states it (ISO 3309), of a Buffer. */
export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32 = n => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};

export const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** One chunk; `crc` overrides the checksum (a wrong one), `length` the stated length. */
export function pngChunk(type, data = Buffer.alloc(0), { crc, length } = {}) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  return Buffer.concat([
    u32(length ?? data.length),
    body,
    u32(crc ?? crc32(body)),
  ]);
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** The unfiltered rows of a width x height picture: a fixed gradient, filter 0. */
export function pngRows(width, height, depth = 8, color = 0) {
  const bits = CHANNELS[color] * depth;
  const row = Math.ceil((width * bits) / 8);
  const out = Buffer.alloc(height * (row + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < row; x++)
      out[y * (row + 1) + 1 + x] = (x * 7 + y * 13) & 0xff;
  return out;
}

/**
 * A PNG. By default a valid one: 8-bit gray, `width` by `height`, the gradient,
 * IHDR, IDAT, IEND. Every part can be broken on purpose.
 */
export function png({
  width = 16,
  height = 12,
  depth = 8,
  color = 0,
  compression = 0,
  filter = 0,
  interlace = 0,
  ihdrData = null,
  ihdrCrc,
  ihdrLength,
  idat = null,
  idatChunks = null,
  middle = [],
  iend = true,
  iendCrc,
  trailing = null,
  plte = false,
} = {}) {
  const ihdr =
    ihdrData ??
    Buffer.concat([
      u32(width),
      u32(height),
      Buffer.from([depth, color, compression, filter, interlace]),
    ]);
  const data =
    idat ?? deflateSync(pngRows(width, height, depth, color), { level: 6 });
  const parts = [
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr, { crc: ihdrCrc, length: ihdrLength }),
  ];
  if (plte) parts.push(pngChunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])));
  parts.push(...middle);
  if (idatChunks) parts.push(...idatChunks);
  else if (data !== false) parts.push(pngChunk('IDAT', data));
  if (iend) parts.push(pngChunk('IEND', Buffer.alloc(0), { crc: iendCrc }));
  if (trailing) parts.push(trailing);
  return Buffer.concat(parts);
}

/** A JPEG marker segment: FF marker, a length that counts itself, the payload. */
export const jpegSegment = (marker, payload = Buffer.alloc(0), length) =>
  Buffer.concat([
    Buffer.from([0xff, marker]),
    Buffer.from([
      ((length ?? payload.length + 2) >> 8) & 0xff,
      (length ?? payload.length + 2) & 0xff,
    ]),
    payload,
  ]);

/** A frame header's payload: precision, height, width, components of (id, sampling, table). */
export function sofPayload({
  precision = 8,
  width,
  height,
  comps = 1,
  length,
}) {
  const b = Buffer.alloc(6 + 3 * comps);
  b[0] = precision;
  b.writeUInt16BE(height, 1);
  b.writeUInt16BE(width, 3);
  b[5] = comps;
  for (let i = 0; i < comps; i++) {
    b[6 + 3 * i] = i + 1;
    b[7 + 3 * i] = 0x11;
    b[8 + 3 * i] = 0;
  }
  return length === undefined ? b : b.subarray(0, length);
}

/**
 * A JPEG skeleton: SOI, a JFIF header, one quantization table, the frame
 * header, a scan header with a few entropy bytes, EOI. Every part can be
 * broken. It is a structure a reader can walk and a decoder will refuse.
 */
export function jpeg({
  marker = 0xc0,
  precision = 8,
  width = 16,
  height = 12,
  comps = 1,
  sofLength,
  sofSegmentLength,
  skipSof = false,
  scan = true,
  eoi = true,
  beforeSof = [],
  afterSof = [],
  soi = true,
  cutAt = null,
} = {}) {
  const parts = [];
  if (soi) parts.push(Buffer.from([0xff, 0xd8]));
  parts.push(
    jpegSegment(
      0xe0,
      Buffer.from([0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
    )
  );
  parts.push(jpegSegment(0xdb, Buffer.alloc(65, 1)));
  parts.push(...beforeSof);
  if (!skipSof)
    parts.push(
      jpegSegment(
        marker,
        sofPayload({ precision, width, height, comps, length: sofLength }),
        sofSegmentLength
      )
    );
  parts.push(...afterSof);
  if (scan) {
    parts.push(
      jpegSegment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
      Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a])
    );
  }
  if (eoi) parts.push(Buffer.from([0xff, 0xd9]));
  const all = Buffer.concat(parts);
  return cutAt === null ? all : all.subarray(0, cutAt);
}

// --- The raster refusals ------------------------------------------------------

/** Fixed pixel-data bytes where a case must not depend on what zlib writes (offsets are then exact). */
const FIXED = Buffer.alloc(40, 7);

const frameLimit = (w, h) =>
  `${w} by ${h} is ${w * h} pixels; a frame may have 4194304 (2,048 by 2,048)`;
const sideLimit = side =>
  `a side of ${side} pixels is more than the 8192 a frame may have`;
const notWhole = (w, h) =>
  `a frame is a whole number of pixels each way, at least 1; this is ${w} by ${h}`;

/**
 * [name, file name, build, code, exact English message]. The reader must
 * refuse each with that code and that message, and nothing is allocated for
 * the pixels. `undecodable` cases are the browser's to refuse (the reader
 * accepts the structure): they are marked `browser: true` and are judged in
 * the page only.
 */
export const RASTER_REFUSE = [
  // The file as a whole
  [
    'an empty file',
    'empty.png',
    () => Buffer.alloc(0),
    'empty-file',
    'the file is empty: it holds no bytes',
  ],
  [
    'plain text named .png',
    'notes.png',
    () => Buffer.from('hello world, this is not an image', 'latin1'),
    'unknown-format',
    'this is not a FITS, PNG or JPEG file (its first bytes are 68 65 6c 6c)',
  ],
  [
    'a GIF named .png',
    'anim.png',
    () => Buffer.from('GIF89a\u0001\u0000\u0001\u0000', 'latin1'),
    'unknown-format',
    'this is not a FITS, PNG or JPEG file (its first bytes are 47 49 46 38)',
  ],
  [
    'one byte',
    'one.jpg',
    () => Buffer.from([0xff]),
    'unknown-format',
    'this is not a FITS, PNG or JPEG file (its first bytes are ff)',
  ],
  // PNG: truncation
  [
    'a PNG signature and nothing else',
    'sig.png',
    () => PNG_SIGNATURE,
    'truncated',
    'the PNG ends at byte 8; its signature and header take 33',
  ],
  [
    'a PNG cut inside IHDR',
    'cut.png',
    () => png().subarray(0, 20),
    'truncated',
    'the PNG ends at byte 20; its signature and header take 33',
  ],
  [
    'a PNG cut inside IDAT',
    'cut2.png',
    () => {
      const f = png({ idat: FIXED });
      return f.subarray(0, f.length - 20);
    },
    'truncated',
    'a IDAT chunk of 40 bytes at byte 33 runs past the end of the file (77 bytes)',
  ],
  [
    'a PNG with no IEND',
    'noiend.png',
    () => png({ idat: FIXED, iend: false }),
    'truncated',
    'the PNG ends at byte 85 with no IEND chunk',
  ],
  [
    'an IDAT whose length runs past the end',
    'overrun.png',
    () =>
      Buffer.concat([
        png({ idat: false, iend: false }),
        pngChunk('IDAT', Buffer.alloc(10), { length: 1000 }),
      ]),
    'truncated',
    'a IDAT chunk of 1000 bytes at byte 33 runs past the end of the file (55 bytes)',
  ],
  // PNG: malformed
  [
    'IHDR with the wrong length',
    'ihdrlen.png',
    () => png({ ihdrLength: 12 }),
    'png-malformed',
    'the first chunk of a PNG is IHDR with 13 bytes of data; this one is IHDR with 12',
  ],
  [
    'IHDR with a wrong checksum',
    'ihdrcrc.png',
    () => png({ ihdrCrc: 0x12345678 }),
    'png-malformed',
    "the IHDR chunk's checksum does not match its bytes: the file is damaged or edited",
  ],
  [
    'the first chunk is not IHDR',
    'first.png',
    () =>
      Buffer.concat([
        PNG_SIGNATURE,
        pngChunk('IDAT', Buffer.alloc(13)),
        pngChunk('IEND'),
      ]),
    'png-malformed',
    'the first chunk of a PNG is IHDR with 13 bytes of data; this one is IDAT with 13',
  ],
  [
    'a width above what PNG allows',
    'wide.png',
    () => png({ width: 0x80000000, height: 1, idat: FIXED }),
    'png-malformed',
    'the PNG gives a width of 2147483648, more than the 2147483647 the format allows',
  ],
  [
    'a height above what PNG allows',
    'tall.png',
    () => png({ width: 1, height: 0xffffffff, idat: FIXED }),
    'png-malformed',
    'the PNG gives a height of 4294967295, more than the 2147483647 the format allows',
  ],
  [
    'colour type 5',
    'color5.png',
    () => png({ color: 5, idat: FIXED }),
    'png-malformed',
    'a PNG with colour type 5 cannot have a bit depth of 8',
  ],
  [
    'gray at 3 bits',
    'depth3.png',
    () => png({ depth: 3 }),
    'png-malformed',
    'a PNG with colour type 0 cannot have a bit depth of 3',
  ],
  [
    'RGB at 4 bits',
    'rgb4.png',
    () => png({ color: 2, depth: 4 }),
    'png-malformed',
    'a PNG with colour type 2 cannot have a bit depth of 4',
  ],
  [
    'compression method 1',
    'comp.png',
    () => png({ compression: 1 }),
    'png-malformed',
    "the PNG's compression method is 1, its filter method 0, its interlace method 0; the only methods are 0, 0 and 0 or 1",
  ],
  [
    'interlace method 2',
    'interlace.png',
    () => png({ interlace: 2 }),
    'png-malformed',
    "the PNG's compression method is 0, its filter method 0, its interlace method 2; the only methods are 0, 0 and 0 or 1",
  ],
  [
    'a palette image with no PLTE',
    'palette.png',
    () => png({ color: 3 }),
    'png-malformed',
    'a palette PNG has no PLTE chunk',
  ],
  [
    'no IDAT before IEND',
    'noidat.png',
    () => png({ idat: false }),
    'png-malformed',
    'the PNG has no image data (IDAT) before its end',
  ],
  [
    'bytes after IEND',
    'trail.png',
    () => png({ trailing: Buffer.from([1, 2, 3, 4, 5]) }),
    'png-malformed',
    '5 bytes follow the IEND chunk',
  ],
  [
    'an ancillary chunk with a wrong checksum',
    'chunkcrc.png',
    () =>
      png({
        idat: FIXED,
        middle: [
          pngChunk('tEXt', Buffer.from('Comment\0hi', 'latin1'), { crc: 1 }),
        ],
      }),
    'png-malformed',
    'the tEXt chunk at byte 33 fails its checksum',
  ],
  // PNG: bounds
  [
    'a PNG of 0 by 5 pixels',
    'zero.png',
    () => png({ width: 0, height: 5, idat: Buffer.alloc(8) }),
    'axis-invalid',
    notWhole(0, 5),
  ],
  [
    'a PNG of 5 by 0 pixels',
    'zeroh.png',
    () => png({ width: 5, height: 0, idat: Buffer.alloc(8) }),
    'axis-invalid',
    notWhole(5, 0),
  ],
  [
    'a PNG 8,193 pixels wide',
    'axis.png',
    () => png({ width: 8193, height: 1, idat: Buffer.alloc(8) }),
    'too-large',
    sideLimit(8193),
  ],
  [
    'a PNG of 2,049 by 2,049 pixels',
    'square.png',
    () => png({ width: 2049, height: 2049, idat: Buffer.alloc(8) }),
    'too-large',
    frameLimit(2049, 2049),
  ],
  [
    'a decompression bomb: 65,535 by 65,535 in 20 bytes of data',
    'bomb.png',
    () =>
      png({
        width: 65535,
        height: 65535,
        idat: deflateSync(Buffer.alloc(4), { level: 9 }),
      }),
    'too-large',
    sideLimit(65535),
  ],
  [
    'a decompression bomb: 2,147,483,647 square',
    'bomb2.png',
    () => png({ width: 0x7fffffff, height: 0x7fffffff, idat: Buffer.alloc(8) }),
    'too-large',
    sideLimit(2147483647),
  ],
  // JPEG: truncation and structure
  [
    'a JPEG that is its signature only',
    'sig.jpg',
    () => Buffer.from([0xff, 0xd8, 0xff]),
    'truncated',
    'the JPEG ends at byte 3 before its frame header (SOF)',
  ],
  [
    'a JPEG cut before its frame header',
    'cutsof.jpg',
    () => jpeg({ cutAt: 30 }),
    'truncated',
    'a segment of 67 bytes at byte 20 runs past the end of the file (30 bytes)',
  ],
  [
    'a JPEG with no EOI',
    'noeoi.jpg',
    () => jpeg({ eoi: false }),
    'truncated',
    'the JPEG has no EOI marker at its end (it ends at byte 117)',
  ],
  [
    'a JPEG cut inside its scan',
    'cutscan.jpg',
    () => {
      const f = jpeg();
      return f.subarray(0, f.length - 4);
    },
    'truncated',
    'the JPEG has no EOI marker at its end (it ends at byte 115)',
  ],
  [
    'a segment that runs past the end',
    'segover.jpg',
    () =>
      Buffer.concat([
        jpeg({ eoi: false, scan: false, skipSof: true }),
        jpegSegment(0xe1, Buffer.alloc(4), 5000),
      ]),
    'truncated',
    'a segment of 5000 bytes at byte 89 runs past the end of the file (97 bytes)',
  ],
  [
    'a segment length of 1',
    'seglen.jpg',
    () => jpeg({ beforeSof: [Buffer.from([0xff, 0xe1, 0x00, 0x01])] }),
    'jpeg-malformed',
    'the marker at byte 89 (0xe1) has a segment length of 1; the least is 2',
  ],
  [
    'a frame header with no components',
    'comps0.jpg',
    () => jpeg({ comps: 0 }),
    'jpeg-malformed',
    'the frame header at byte 89 lists 0 components; a JPEG has 1 to 4',
  ],
  [
    'five components',
    'comps5.jpg',
    () => jpeg({ comps: 5 }),
    'jpeg-malformed',
    'the frame header at byte 89 lists 5 components; a JPEG has 1 to 4',
  ],
  [
    'a frame header whose length does not match its components',
    'soflen.jpg',
    () => jpeg({ comps: 3, sofSegmentLength: 8 + 3 * 3 + 5 }),
    'jpeg-malformed',
    'the frame header at byte 89 is 22 bytes long; 3 components need 17',
  ],
  [
    'a scan before any frame header',
    'nosof.jpg',
    () => jpeg({ skipSof: true }),
    'jpeg-malformed',
    'the JPEG reaches a scan (SOS) before any frame header',
  ],
  [
    'an end marker before any frame header',
    'eoionly.jpg',
    () => jpeg({ skipSof: true, scan: false }),
    'jpeg-malformed',
    'the JPEG reaches its end (EOI) before any frame header',
  ],
  // JPEG: unsupported codings
  [
    'a lossless JPEG (SOF3)',
    'lossless.jpg',
    () => jpeg({ marker: 0xc3 }),
    'raster-unsupported',
    'the JPEG is coded as lossless (SOF3); only baseline, extended-sequential and progressive Huffman JPEGs are read',
  ],
  [
    'an arithmetic-coded JPEG (SOF9)',
    'arith.jpg',
    () => jpeg({ marker: 0xc9 }),
    'raster-unsupported',
    'the JPEG is coded as arithmetic (SOF9); only baseline, extended-sequential and progressive Huffman JPEGs are read',
  ],
  [
    'a hierarchical JPEG (SOF5)',
    'hier.jpg',
    () => jpeg({ marker: 0xc5 }),
    'raster-unsupported',
    'the JPEG is coded as differential (SOF5); only baseline, extended-sequential and progressive Huffman JPEGs are read',
  ],
  [
    'a 12-bit JPEG',
    'bits12.jpg',
    () => jpeg({ precision: 12 }),
    'raster-unsupported',
    'the JPEG has 12-bit samples; only 8-bit samples are read',
  ],
  // JPEG: bounds
  [
    'a JPEG of 0 by 5 pixels',
    'zero.jpg',
    () => jpeg({ width: 0, height: 5 }),
    'axis-invalid',
    notWhole(0, 5),
  ],
  [
    'a JPEG of 5 by 0 pixels (height from a DNL marker)',
    'dnl.jpg',
    () => jpeg({ width: 5, height: 0 }),
    'axis-invalid',
    notWhole(5, 0),
  ],
  [
    'a JPEG of 65,535 by 65,535 pixels',
    'bomb.jpg',
    () => jpeg({ width: 65535, height: 65535 }),
    'too-large',
    sideLimit(65535),
  ],
  [
    'a JPEG of 2,049 by 2,049 pixels',
    'square.jpg',
    () => jpeg({ width: 2049, height: 2049 }),
    'too-large',
    frameLimit(2049, 2049),
  ],
  // The browser's to refuse: a structure the reader accepts and a decoder does not
  [
    'a PNG whose pixel data is not a zlib stream',
    'garbage.png',
    () => png({ idat: Buffer.from('this is not deflate data at all') }),
    'undecodable',
    null,
    { browser: true },
  ],
  [
    'a JPEG skeleton no decoder can draw',
    'skeleton.jpg',
    () => jpeg(),
    'undecodable',
    null,
    { browser: true },
  ],
  [
    'a PNG whose IDAT holds too few rows for its header',
    'short.png',
    () =>
      png({
        width: 16,
        height: 12,
        idat: deflateSync(pngRows(16, 3), { level: 6 }),
      }),
    'undecodable',
    null,
    { browser: true },
  ],
];

/** Files the reader must accept: the structure and the size it reports. */
export const RASTER_ACCEPT = [
  ['a gray PNG', 'gray.png', () => png(), 'png', 16, 12],
  [
    'an RGB PNG',
    'rgb.png',
    () => png({ color: 2, width: 7, height: 5 }),
    'png',
    7,
    5,
  ],
  [
    'a 16-bit gray PNG',
    'g16.png',
    () => png({ depth: 16, width: 9, height: 4 }),
    'png',
    9,
    4,
  ],
  [
    'an RGBA PNG',
    'rgba.png',
    () => png({ color: 6, width: 5, height: 5 }),
    'png',
    5,
    5,
  ],
  [
    'an interlaced gray PNG',
    'adam7.png',
    () => png({ interlace: 1 }),
    'png',
    16,
    12,
  ],
  [
    'the largest PNG header (2,048 by 2,048)',
    'big.png',
    () => png({ width: 2048, height: 2048, idat: Buffer.alloc(8) }),
    'png',
    2048,
    2048,
  ],
  ['a baseline JPEG skeleton', 'base.jpg', () => jpeg(), 'jpeg', 16, 12],
  [
    'a progressive JPEG skeleton',
    'prog.jpg',
    () => jpeg({ marker: 0xc2 }),
    'jpeg',
    16,
    12,
  ],
  [
    'an extended sequential JPEG skeleton',
    'ext.jpg',
    () => jpeg({ marker: 0xc1, width: 33, height: 7 }),
    'jpeg',
    33,
    7,
  ],
  [
    'a three-component JPEG skeleton',
    'color.jpg',
    () => jpeg({ comps: 3 }),
    'jpeg',
    16,
    12,
  ],
];

// --- FITS the import must read ------------------------------------------------

/** The header a school telescope's pipeline writes, as claims the panel shows with their cards. */
export const CLAIMS_CARDS = [
  ['BUNIT', 'adu'],
  ['GAIN', 1.5],
  ['RDNOISE', 4.25],
  ['SATURATE', 60000],
  ['EXPTIME', 30],
  ['DATE-OBS', '2026-03-14T02:15:30'],
  ['TIMESYS', 'UTC'],
  ['OBJECT', 'M 67'],
];

// --- What the panel says, and is held to ---------------------------------------

/**
 * The sidecar fields a reader fills, with what each does (stated in both
 * languages by the panel, in the order below), and the rule each is held to.
 */
export const FIELDS = Object.freeze({
  time: {
    needs: 'a time and its scale together; a time with no scale is not a time',
    rule: 'ISO date and time or a number of days, with one of UTC, TAI, TT, TDB, TCB, UT1, local',
  },
  scale: {
    needs: 'arcseconds per pixel, a positive number',
    rule: 'greater than 0 and at most 3600',
  },
  orientation: {
    needs:
      'the angle of north, measured from the image up toward east, in degrees, with which side east is on',
    rule: 'at least 0 and under 360',
  },
});

/** The words a student must be able to read, as the panel's own ids; both languages carry each. */
export const REQUIRED_WORD_IDS = Object.freeze([
  'obs.imp.title',
  'obs.imp.kind.fits',
  'obs.imp.kind.png',
  'obs.imp.kind.jpeg',
  'obs.imp.displayOnly',
  'obs.imp.quantitative',
  'obs.imp.field.time',
  'obs.imp.field.scale',
  'obs.imp.field.orientation',
  'obs.imp.effect.time',
  'obs.imp.effect.scale',
  'obs.imp.effect.orientation',
  'obs.imp.open',
  'obs.imp.cancel',
  'obs.imp.canceled',
  'obs.imp.local',
]);

/** Every refusal code the reader can give, each of which the panel must say in a sentence of its own. */
export const REFUSAL_CODES = Object.freeze([
  // The FITS reader (Prompt 157)
  'not-fits',
  'truncated',
  'header-too-large',
  'card-malformed',
  'duplicate-card',
  'missing-card',
  'dimension-overflow',
  'nonfinite-header',
  'axis-invalid',
  'hdu-unsupported',
  'bitpix-unsupported',
  'compressed',
  'axes-unsupported',
  'too-large',
  'file-too-large',
  'too-many-hdus',
  'no-image',
  'scale-invalid',
  'blank-invalid',
  'nonfinite-pixel',
  'canceled',
  'wcs-projection',
  'wcs-distortion',
  'wcs-incomplete',
  'wcs-ambiguous',
  // This prompt's
  'empty-file',
  'unknown-format',
  'png-malformed',
  'jpeg-malformed',
  'raster-unsupported',
  'undecodable',
  'dimension-mismatch',
  'no-decoder',
  'unreadable',
  // The pool's, when a realm fails
  'timeout',
  'resourceLimit',
  'workerFailed',
]);
