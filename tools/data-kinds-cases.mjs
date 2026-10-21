// =============================================================================
// The data kinds' cases, limits and tolerances (Prompt 157)
// -----------------------------------------------------------------------------
// Committed BEFORE the modules they judge exist (js/dataKinds/): every limit,
// every refusal code, every tolerance and every reference value below was
// written down first, and tests/dataKinds.test.js runs the modules against
// them. Nothing here imports the code under test; the FITS builder, the
// analytic values and the oracles are independent of it.
//
// Node 20 and 24 differ in the last bit of Math.atan, atan2, asin, sin and cos,
// so nothing that passes through them is stored as a golden value: those cases
// are formulas the test evaluates in the same process, with the tolerances in
// TOL, which hold on both. What is exact (integer decoding, scale and offset
// with binary fractions, bounds arithmetic, block means of integers, linear
// interpolation weights of a multilinear function) is compared with Object.is.
// =============================================================================

import { Buffer } from 'node:buffer';

// --- The limits, as committed ------------------------------------------------

/**
 * What js/dataKinds/limits.js must say. A decoded plane of the largest frame,
 * 2,048 x 2,048 pixels, is a Float64 plane of 33,554,432 bytes (32 MiB); the
 * page may hold 67,108,864 bytes (64 MiB) of decoded images, which is the
 * ceiling `decodedImageBytesPerPage` of tools/data-budget.json (Prompt 133).
 */
export const LIMITS_EXPECTED = Object.freeze({
  maxAxis: 8192,
  maxPixels: 4194304,
  bytesPerPixel: { data: 8, variance: 8, mask: 2 },
  maxDecodedBytes: 67108864,
  // One frame behind an empty primary header: two headers of at most 16
  // blocks, and 4,194,304 pixels of an 8-byte type padded to whole blocks.
  maxHeaderBlocks: 16,
  maxHdus: 8,
  maxFileBytes: 33647040,
  maxCards: 576,
  maxFrames: 256,
  maxGridAxes: 6,
  maxGridAxisLength: 4096,
  maxGridValues: 4194304,
  maxDisplaySide: 1024,
});

/** Tolerances, each with the reason it holds on Node 20 and on Node 24. */
export const TOL = Object.freeze({
  pixelDecode: {
    value: 0,
    why: 'integers, float32 and float64 are read byte for byte, and v * BSCALE + BZERO with binary-fraction scales is one IEEE multiply and add: the same result everywhere (Object.is)',
  },
  wcsDegrees: {
    value: 1e-10,
    why: 'atan, atan2, asin, sin and cos differ by a unit in the last place between Node versions (about 6e-14 degrees at 360); the points keep |dec| <= 70 degrees and the offset within 0.2 rad of the tangent point, so nothing cancels badly',
  },
  wcsMatrixForms: {
    value: 1e-12,
    why: 'CD, CDELT with PC and CROTA2 reach the same matrix by different products of the same numbers, differing by a few ulps of 0.01 degrees',
  },
  blockMeanFloat: {
    value: 1e-12,
    why: 'a block mean of floats sums in a stated order; the oracle sums in another, differing by ulps of the total',
  },
  gridMultilinear: {
    value: 1e-12,
    why: 'a multilinear function is reproduced by multilinear interpolation up to the rounding of the weights, a few ulps of the value',
  },
  noiseRatio: {
    min: 0.9,
    max: 1.1,
    why: 'the variance of the difference of two committed frames over at least 10,000 pixels has a sampling error of sqrt(2/N), 1.4%; a band of +-10% is seven standard errors',
  },
  regeneratedAdu: {
    value: 1,
    why: 'the example frames are committed; regenerating them on another Node version can move a count across a rounding boundary by one count at most, because Math.log, cos and exp differ in the last bit',
  },
  memoryPeak: {
    value: 1.25,
    why: 'the reading realm holds the file and the Float64 plane; its measured peak (heap and buffers) may be at most 1.25 times their sum, the rest being the reader and its result record',
  },
});

// --- An independent FITS builder ----------------------------------------------

export const BLOCK = 2880;

const pad80 = s => s.padEnd(80, ' ').slice(0, 80);
const fmtValue = v => {
  if (typeof v === 'boolean') return (v ? 'T' : 'F').padStart(20, ' ');
  if (typeof v === 'number') return String(v).padStart(20, ' ');
  return `'${String(v).replaceAll("'", "''").padEnd(8, ' ')}'`;
};

/** One header card: KEY = value, or a raw 80-character string. */
export const card = (key, value) =>
  typeof value === 'object' && value !== null && 'raw' in value
    ? pad80(value.raw)
    : pad80(`${key.padEnd(8, ' ')}= ${fmtValue(value)}`);

/** Big-endian bytes of `values` stored as `bitpix`. */
export function store(bitpix, values) {
  const size = Math.abs(bitpix) / 8;
  const out = Buffer.alloc(values.length * size);
  values.forEach((v, i) => {
    const o = i * size;
    if (bitpix === 8) out.writeUInt8(v, o);
    else if (bitpix === 16) out.writeInt16BE(v, o);
    else if (bitpix === 32) out.writeInt32BE(v, o);
    else if (bitpix === -32) out.writeFloatBE(v, o);
    else if (bitpix === -64) out.writeDoubleBE(v, o);
    else throw new Error(`the builder does not store BITPIX ${bitpix}`);
  });
  return out;
}

const blocks = buf =>
  Buffer.concat([
    buf,
    Buffer.alloc((BLOCK - (buf.length % BLOCK)) % BLOCK, 0x20),
  ]);
const padData = buf =>
  Buffer.concat([buf, Buffer.alloc((BLOCK - (buf.length % BLOCK)) % BLOCK, 0)]);

/**
 * One header-and-data unit. `cards` are [key, value] pairs after the
 * structural ones, or [key, {raw}] for a card written as is; `data` is a
 * Buffer, or `values` are stored as `bitpix`.
 */
export function hdu({
  kind = 'primary',
  bitpix = 16,
  axes = [],
  cards = [],
  values = null,
  data = null,
  pcount = 0,
  structural = null,
  noEnd = false,
  padding = true,
} = {}) {
  const head = structural ?? [
    kind === 'primary'
      ? card('SIMPLE', true)
      : card('XTENSION', kind === 'IMAGE' ? 'IMAGE' : kind),
    card('BITPIX', bitpix),
    card('NAXIS', axes.length),
    ...axes.map((n, i) => card(`NAXIS${i + 1}`, n)),
    ...(kind === 'primary' ? [] : [card('PCOUNT', pcount), card('GCOUNT', 1)]),
  ];
  const text = [...head, ...cards.map(([k, v]) => card(k, v))];
  if (!noEnd) text.push(pad80('END'));
  const header = blocks(Buffer.from(text.join(''), 'latin1'));
  const body = data ?? (values ? store(bitpix, values) : Buffer.alloc(0));
  return Buffer.concat([header, padding ? padData(body) : body]);
}

/** A file: the HDUs in order. */
export const file = (...units) => Buffer.concat(units);

/** A plain two-axis image file. */
export function image({
  bitpix = 16,
  width,
  height,
  values,
  cards = [],
  ...rest
}) {
  const n = width * height;
  return hdu({
    bitpix,
    axes: [width, height],
    cards,
    values: values ?? Array.from({ length: n }, (_, i) => i % 100),
    ...rest,
  });
}

/** The tangent-plane header of the TESS aperture pack (data-packs/tess-hd209458-s56-aperture.json). */
export const tanCards = ({
  crpix = [6, 7],
  crval = [330.7950845247853, 18.884206107937736],
  pc = [
    [0.8513512737077913, -0.46043911374994434],
    [-0.5219565893104138, -0.8923117801814796],
  ],
  cdelt = [-0.005395091119529, 0.005395091119528831],
} = {}) => [
  ['CTYPE1', 'RA---TAN'],
  ['CTYPE2', 'DEC--TAN'],
  ['CRPIX1', crpix[0]],
  ['CRPIX2', crpix[1]],
  ['CRVAL1', crval[0]],
  ['CRVAL2', crval[1]],
  ['CDELT1', cdelt[0]],
  ['CDELT2', cdelt[1]],
  ['PC1_1', pc[0][0]],
  ['PC1_2', pc[0][1]],
  ['PC2_1', pc[1][0]],
  ['PC2_2', pc[1][1]],
  ['RADESYS', 'ICRS'],
];

// --- Files the reader must read, with their decoded values ---------------------

const withScale = (raw, scale, zero, blank) =>
  raw.map(v => (blank !== undefined && v === blank ? NaN : v * scale + zero));

const RAW16 = [-32768, -1, 0, 1, 32767, 12345];
const RAW32 = [-2147483648, 2147483647, 0, 7];
const F32 = [0.1, -2.5, 1e30, 0, 123456.789, NaN];
const F64 = [Math.PI, -1e300, 5e-324, 0, -0, 1.7976931348623157e308];

/**
 * Each: a file, and what a correct reader returns, from the stored values and
 * the scale, computed here and not by the reader. `values` are Float64.
 */
export const ACCEPT = [
  {
    name: 'BITPIX 8, unsigned bytes',
    file: () =>
      image({
        bitpix: 8,
        width: 3,
        height: 2,
        values: [0, 1, 2, 128, 254, 255],
      }),
    width: 3,
    height: 2,
    values: [0, 1, 2, 128, 254, 255],
  },
  {
    name: 'BITPIX 16, signed extremes',
    file: () => image({ bitpix: 16, width: 3, height: 2, values: RAW16 }),
    width: 3,
    height: 2,
    values: RAW16,
  },
  {
    name: 'BITPIX 16 with BZERO 32768: the unsigned convention',
    file: () =>
      image({
        bitpix: 16,
        width: 2,
        height: 2,
        values: [-32768, 0, 32767, -1],
        cards: [
          ['BSCALE', 1],
          ['BZERO', 32768],
        ],
      }),
    width: 2,
    height: 2,
    values: [0, 32768, 65535, 32767],
  },
  {
    name: 'BITPIX 32, signed extremes',
    file: () => image({ bitpix: 32, width: 2, height: 2, values: RAW32 }),
    width: 2,
    height: 2,
    values: RAW32,
  },
  {
    name: 'BITPIX -32, a NaN pixel is a blank',
    file: () => image({ bitpix: -32, width: 3, height: 2, values: F32 }),
    width: 3,
    height: 2,
    values: F32.map(Math.fround),
    nanPixels: 1,
  },
  {
    name: 'BITPIX -64, negative zero and the extremes',
    file: () => image({ bitpix: -64, width: 3, height: 2, values: F64 }),
    width: 3,
    height: 2,
    values: F64,
  },
  {
    name: 'BSCALE 0.5 and BZERO 100 on 16 bits',
    file: () =>
      image({
        bitpix: 16,
        width: 3,
        height: 2,
        values: RAW16,
        cards: [
          ['BSCALE', 0.5],
          ['BZERO', 100],
        ],
      }),
    width: 3,
    height: 2,
    values: withScale(RAW16, 0.5, 100),
  },
  {
    name: 'BLANK on 16 bits makes that pixel NaN, before scaling',
    file: () =>
      image({
        bitpix: 16,
        width: 3,
        height: 2,
        values: RAW16,
        cards: [
          ['BLANK', -32768],
          ['BSCALE', 2],
          ['BZERO', 1],
        ],
      }),
    width: 3,
    height: 2,
    values: withScale(RAW16, 2, 1, -32768),
    nanPixels: 1,
  },
  {
    name: 'commentary, long strings and a D exponent',
    file: () =>
      image({
        bitpix: 16,
        width: 2,
        height: 1,
        values: [3, 4],
        cards: [
          ['COMMENT', { raw: 'COMMENT a note with = signs = inside' }],
          ['HISTORY', { raw: 'HISTORY processed by nobody' }],
          ['OBJECT', "it's a star"],
          [
            'BSCALE',
            { raw: 'BSCALE  =               1.0D+0 / the D exponent' },
          ],
        ],
      }),
    width: 2,
    height: 1,
    values: [3, 4],
  },
  {
    name: 'the image in an extension behind an empty primary header',
    file: () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({ kind: 'IMAGE', bitpix: 16, axes: [2, 2], values: [9, 8, 7, 6] })
      ),
    width: 2,
    height: 2,
    values: [9, 8, 7, 6],
    hdu: 1,
  },
  {
    name: 'a table after the image is not read',
    file: () =>
      file(
        image({ bitpix: 16, width: 2, height: 1, values: [1, 2] }),
        hdu({
          kind: 'BINTABLE',
          bitpix: 8,
          axes: [8, 4],
          data: Buffer.alloc(32),
        })
      ),
    width: 2,
    height: 1,
    values: [1, 2],
  },
  {
    name: 'the last block unpadded',
    file: () =>
      image({
        bitpix: 16,
        width: 2,
        height: 1,
        values: [1, 2],
        padding: false,
      }),
    width: 2,
    height: 1,
    values: [1, 2],
  },
  {
    name: 'a single pixel',
    file: () => image({ bitpix: -32, width: 1, height: 1, values: [0.5] }),
    width: 1,
    height: 1,
    values: [0.5],
  },
];

/** At the limits: accepted, and one past: refused as too large. */
export const BOUNDARY = [
  { width: 2048, height: 2048, ok: true },
  { width: 8192, height: 512, ok: true },
  { width: 2049, height: 2048, ok: false },
  { width: 8192, height: 513, ok: false },
  { width: 8193, height: 1, ok: false },
  { width: 1, height: 8193, ok: false },
];

// --- Files the reader must refuse, each with its code -------------------------

const tiny = (cards = [], over = {}) =>
  image({
    bitpix: 16,
    width: 2,
    height: 2,
    values: [1, 2, 3, 4],
    cards,
    ...over,
  });
const bytesOf = f => Buffer.from(f);
const replaceCard = (buf, key, text) => {
  const b = Buffer.from(buf);
  const at = b.indexOf(key.padEnd(8, ' ') + '=');
  if (at < 0) throw new Error(`no ${key} card to replace`);
  b.write(pad80(text), at, 'latin1');
  return b;
};
const bigAxis = (n1, n2) =>
  hdu({ bitpix: 16, axes: [n1, n2], data: Buffer.alloc(0) });

/**
 * [name, build, code]. A file that is malformed, truncated, non-finite,
 * oversized or of a kind the reader does not read must be refused with that
 * code and a reason, and never read as if it were something else.
 */
export const REFUSE = [
  // not FITS
  ['an empty buffer', () => Buffer.alloc(0), 'not-fits'],
  [
    'a GIF',
    () => Buffer.from('GIF89a\u0001\u0000\u0001\u0000', 'latin1'),
    'not-fits',
  ],
  [
    'plain text',
    () => Buffer.from('hello world, this is not an image', 'latin1'),
    'not-fits',
  ],
  [
    'SIMPLE = F',
    () => replaceCard(tiny(), 'SIMPLE', 'SIMPLE  =                    F'),
    'not-fits',
  ],
  [
    'the first card is not SIMPLE',
    () =>
      hdu({
        structural: [
          card('BITPIX', 16),
          card('SIMPLE', true),
          card('NAXIS', 0),
        ],
      }),
    'not-fits',
  ],
  // truncated
  [
    'a header cut inside a card',
    () => bytesOf(tiny()).subarray(0, 100),
    'truncated',
  ],
  [
    'a header with no END at the end of the file',
    () =>
      hdu({ axes: [2, 2], noEnd: true, values: [1, 2, 3, 4] }).subarray(
        0,
        BLOCK
      ),
    'truncated',
  ],
  [
    'the data cut short',
    () =>
      bytesOf(image({ bitpix: 16, width: 32, height: 32 })).subarray(
        0,
        BLOCK + 1000
      ),
    'truncated',
  ],
  [
    'an extension header cut',
    () =>
      bytesOf(
        file(
          hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
          hdu({ kind: 'IMAGE', bitpix: 16, axes: [2, 2], values: [1, 2, 3, 4] })
        )
      ).subarray(0, BLOCK + 500),
    'truncated',
  ],
  // header too large
  [
    'no END in 17 blocks',
    () =>
      hdu({
        axes: [2, 2],
        cards: Array.from({ length: 17 * 36 }, (_, i) => [
          'COMMENT',
          { raw: `COMMENT line ${i}` },
        ]),
        values: [1, 2, 3, 4],
      }),
    'header-too-large',
  ],
  // malformed cards
  [
    'a control character in a card',
    () => tiny([['OBJECT', { raw: "OBJECT  = 'bad\u0001byte'" }]]),
    'card-malformed',
  ],
  [
    'NAXIS1 as a string',
    () => replaceCard(tiny(), 'NAXIS1', "NAXIS1  = 'abc'"),
    'card-malformed',
  ],
  [
    'NAXIS1 = 3.5',
    () => replaceCard(tiny(), 'NAXIS1', 'NAXIS1  =                  3.5'),
    'card-malformed',
  ],
  [
    'BITPIX = 16.0, not an integer literal',
    () => replaceCard(tiny(), 'BITPIX', 'BITPIX  =                 16.0'),
    'card-malformed',
  ],
  [
    'NAXIS1 with no value',
    () => replaceCard(tiny(), 'NAXIS1', 'NAXIS1  =                     '),
    'card-malformed',
  ],
  // missing and duplicate cards
  [
    'no BITPIX card',
    () => hdu({ structural: [card('SIMPLE', true), card('NAXIS', 0)] }),
    'missing-card',
  ],
  [
    'no NAXIS2 card',
    () =>
      hdu({
        structural: [
          card('SIMPLE', true),
          card('BITPIX', 16),
          card('NAXIS', 2),
          card('NAXIS1', 2),
        ],
        data: Buffer.alloc(4),
      }),
    'missing-card',
  ],
  ['BITPIX twice', () => tiny([['BITPIX', 8]]), 'duplicate-card'],
  ['NAXIS1 twice', () => tiny([['NAXIS1', 3]]), 'duplicate-card'],
  [
    'BSCALE twice',
    () =>
      tiny([
        ['BSCALE', 1],
        ['BSCALE', 2],
      ]),
    'duplicate-card',
  ],
  [
    'CRPIX1 twice',
    () => tiny([...tanCards(), ['CRPIX1', 3]]),
    'duplicate-card',
  ],
  // pixel type
  [
    'BITPIX 64',
    () => replaceCard(tiny(), 'BITPIX', 'BITPIX  =                   64'),
    'bitpix-unsupported',
  ],
  [
    'BITPIX 24',
    () => replaceCard(tiny(), 'BITPIX', 'BITPIX  =                   24'),
    'bitpix-unsupported',
  ],
  [
    'BITPIX 0',
    () => replaceCard(tiny(), 'BITPIX', 'BITPIX  =                    0'),
    'bitpix-unsupported',
  ],
  [
    'BITPIX -16',
    () => replaceCard(tiny(), 'BITPIX', 'BITPIX  =                  -16'),
    'bitpix-unsupported',
  ],
  // shape
  [
    'a cube, 2 x 2 x 2',
    () => hdu({ bitpix: 16, axes: [2, 2, 2], values: new Array(8).fill(1) }),
    'axes-unsupported',
  ],
  [
    'a cube of one plane, 2 x 2 x 1',
    () => hdu({ bitpix: 16, axes: [2, 2, 1], values: [1, 2, 3, 4] }),
    'axes-unsupported',
  ],
  [
    'a one-dimensional array',
    () => hdu({ bitpix: 16, axes: [4], values: [1, 2, 3, 4] }),
    'axes-unsupported',
  ],
  ['no axes and no extension', () => hdu({ bitpix: 8, axes: [] }), 'no-image'],
  [
    'a table and nothing else',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({
          kind: 'BINTABLE',
          bitpix: 8,
          axes: [8, 4],
          data: Buffer.alloc(32),
        })
      ),
    'no-image',
  ],
  [
    'a tile-compressed image',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({
          kind: 'BINTABLE',
          bitpix: 8,
          axes: [8, 4],
          data: Buffer.alloc(32),
          cards: [
            ['ZIMAGE', true],
            ['ZBITPIX', 16],
            ['ZNAXIS', 2],
          ],
        })
      ),
    'compressed',
  ],
  [
    'an extension type the reader does not know',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({ kind: 'FOO', bitpix: 8, axes: [], data: Buffer.alloc(0) })
      ),
    'hdu-unsupported',
  ],
  [
    'random groups',
    () =>
      hdu({
        bitpix: 16,
        structural: [
          card('SIMPLE', true),
          card('BITPIX', 16),
          card('NAXIS', 2),
          card('NAXIS1', 0),
          card('NAXIS2', 3),
          card('GROUPS', true),
        ],
      }),
    'hdu-unsupported',
  ],
  [
    'nine extensions before the image',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        ...Array.from({ length: 9 }, () =>
          hdu({ kind: 'IMAGE', bitpix: 8, axes: [] })
        ),
        hdu({ kind: 'IMAGE', bitpix: 16, axes: [1, 1], values: [1] })
      ),
    'too-many-hdus',
  ],
  // axes
  ['NAXIS1 = 0', () => bigAxis(0, 4), 'axis-invalid'],
  ['NAXIS2 = 0', () => bigAxis(4, 0), 'axis-invalid'],
  [
    'NAXIS1 = -5',
    () => replaceCard(tiny(), 'NAXIS1', 'NAXIS1  =                   -5'),
    'axis-invalid',
  ],
  // bounds, before any allocation
  ['NAXIS1 = 8193', () => bigAxis(8193, 1), 'too-large'],
  ['2049 x 2049 pixels', () => bigAxis(2049, 2049), 'too-large'],
  ['8192 x 513 pixels', () => bigAxis(8192, 513), 'too-large'],
  [
    '65536 x 65536 pixels, a header of 2,880 bytes',
    () => bigAxis(65536, 65536),
    'too-large',
  ],
  [
    '2^32 x 2^32, whose product is 2^64',
    () => bigAxis(4294967296, 4294967296),
    'too-large',
  ],
  [
    'an axis beyond the integers a double holds',
    () => replaceCard(tiny(), 'NAXIS1', 'NAXIS1  =     9007199254740993'),
    'dimension-overflow',
  ],
  [
    'a table whose declared size overflows, behind an empty primary',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({
          kind: 'BINTABLE',
          bitpix: 8,
          axes: [4294967296, 4294967296],
          data: Buffer.alloc(0),
        }),
        hdu({ kind: 'IMAGE', bitpix: 16, axes: [1, 1], values: [1] })
      ),
    'dimension-overflow',
  ],
  [
    'a table whose declared size runs past the file, before the image',
    () =>
      file(
        hdu({ bitpix: 8, axes: [], cards: [['EXTEND', true]] }),
        hdu({
          kind: 'BINTABLE',
          bitpix: 8,
          axes: [1000000, 1000],
          data: Buffer.alloc(0),
        }),
        hdu({ kind: 'IMAGE', bitpix: 16, axes: [1, 1], values: [1] })
      ),
    'truncated',
  ],
  // scale and blank
  [
    'BSCALE = 0',
    () =>
      tiny([
        ['BSCALE', 0],
        ['BZERO', 0],
      ]),
    'scale-invalid',
  ],
  [
    'BSCALE = 1E999',
    () => tiny([['BSCALE', { raw: 'BSCALE  =               1E999' }]]),
    'nonfinite-header',
  ],
  [
    'BZERO = 1E999',
    () => tiny([['BZERO', { raw: 'BZERO   =               1E999' }]]),
    'nonfinite-header',
  ],
  [
    'BZERO = NaN',
    () => tiny([['BZERO', { raw: 'BZERO   =                  NaN' }]]),
    'nonfinite-header',
  ],
  ['BSCALE as a string', () => tiny([['BSCALE', 'two']]), 'card-malformed'],
  [
    'BLANK on a floating-point image',
    () =>
      image({
        bitpix: -32,
        width: 2,
        height: 2,
        values: [1, 2, 3, 4],
        cards: [['BLANK', -1]],
      }),
    'blank-invalid',
  ],
  [
    'BLANK outside the 16-bit range',
    () => tiny([['BLANK', 70000]]),
    'blank-invalid',
  ],
  [
    'BLANK = 1.5',
    () => tiny([['BLANK', { raw: 'BLANK   =                  1.5' }]]),
    'card-malformed',
  ],
  // non-finite pixels
  [
    'an infinite pixel, BITPIX -32',
    () =>
      image({ bitpix: -32, width: 2, height: 2, values: [1, Infinity, 3, 4] }),
    'nonfinite-pixel',
  ],
  [
    'a negative infinite pixel, BITPIX -64',
    () =>
      image({ bitpix: -64, width: 2, height: 2, values: [1, 2, -Infinity, 4] }),
    'nonfinite-pixel',
  ],
  // world coordinates
  [
    'SIN projection',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CTYPE1' ? 'RA---SIN' : k === 'CTYPE2' ? 'DEC--SIN' : v,
        ])
      ),
    'wcs-projection',
  ],
  [
    'galactic TAN',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CTYPE1' ? 'GLON-TAN' : k === 'CTYPE2' ? 'GLAT-TAN' : v,
        ])
      ),
    'wcs-projection',
  ],
  [
    'ARC projection',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CTYPE1' ? 'RA---ARC' : k === 'CTYPE2' ? 'DEC--ARC' : v,
        ])
      ),
    'wcs-projection',
  ],
  [
    'mixed projections',
    () =>
      tiny(tanCards().map(([k, v]) => [k, k === 'CTYPE2' ? 'DEC--SIN' : v])),
    'wcs-projection',
  ],
  [
    'a linear axis',
    () => tiny(tanCards().map(([k, v]) => [k, k === 'CTYPE1' ? 'LINEAR' : v])),
    'wcs-projection',
  ],
  [
    'SIP distortion by suffix',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CTYPE1' ? 'RA---TAN-SIP' : k === 'CTYPE2' ? 'DEC--TAN-SIP' : v,
        ])
      ),
    'wcs-distortion',
  ],
  [
    'SIP coefficients under a plain TAN',
    () => tiny([...tanCards(), ['A_ORDER', 2], ['B_ORDER', 2]]),
    'wcs-distortion',
  ],
  [
    'TPV distortion',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CTYPE1' ? 'RA---TPV' : k === 'CTYPE2' ? 'DEC--TPV' : v,
        ])
      ),
    'wcs-distortion',
  ],
  [
    'PV terms under TAN',
    () => tiny([...tanCards(), ['PV1_1', 0.5]]),
    'wcs-distortion',
  ],
  [
    'more than two world axes',
    () => tiny([...tanCards(), ['WCSAXES', 3]]),
    'wcs-projection',
  ],
  [
    'TAN without CRPIX2',
    () => tiny(tanCards().filter(([k]) => k !== 'CRPIX2')),
    'wcs-incomplete',
  ],
  [
    'TAN without a matrix',
    () => tiny(tanCards().filter(([k]) => !/^(PC|CDELT)/.test(k))),
    'wcs-incomplete',
  ],
  [
    'TAN with CDELT = 0',
    () => tiny(tanCards({ cdelt: [0, 0.001] })),
    'wcs-incomplete',
  ],
  [
    'a singular CD matrix',
    () =>
      tiny([
        ...tanCards().filter(([k]) => !/^(PC|CDELT)/.test(k)),
        ['CD1_1', 0.001],
        ['CD1_2', 0.002],
        ['CD2_1', 0.0005],
        ['CD2_2', 0.001],
      ]),
    'wcs-incomplete',
  ],
  [
    'a declination of 95 degrees',
    () => tiny(tanCards({ crval: [10, 95] })),
    'wcs-incomplete',
  ],
  [
    'CRVAL1 beyond the doubles',
    () =>
      tiny(
        tanCards().map(([k, v]) => [
          k,
          k === 'CRVAL1' ? { raw: 'CRVAL1  =               1E999' } : v,
        ])
      ),
    'nonfinite-header',
  ],
  [
    'CD and PC together',
    () =>
      tiny([
        ...tanCards(),
        ['CD1_1', 0.001],
        ['CD1_2', 0],
        ['CD2_1', 0],
        ['CD2_2', 0.001],
      ]),
    'wcs-ambiguous',
  ],
  [
    'CROTA2 with PC',
    () => tiny([...tanCards(), ['CROTA2', 10]]),
    'wcs-ambiguous',
  ],
];

/** The input is not a file at all: refused, not thrown at. */
export const NOT_BUFFERS = ['text', 12, null, undefined, {}, [1, 2, 3]];

// --- The adversarial sweep: the reader never throws a stranger ----------------

/** A small deterministic generator for the sweeps (not js/rng.js: independent). */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Seeds, sizes and counts of the mutation sweep. */
export const SWEEP = Object.freeze({
  seed: 20261021,
  headerMutations: 3000,
  dataMutations: 500,
});

// --- World coordinates ---------------------------------------------------------

const RAD = Math.PI / 180;

/**
 * The independent oracle: the sky position of tangent-plane offsets (xi, eta)
 * in degrees by a rotation of vectors, not by the gnomonic formulae.
 */
export function skyByVectors(ra0, dec0, xiDeg, etaDeg) {
  const a = ra0 * RAD;
  const d = dec0 * RAD;
  const xi = xiDeg * RAD;
  const eta = etaDeg * RAD;
  const r = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const e = [-Math.sin(a), Math.cos(a), 0];
  const n = [
    -Math.sin(d) * Math.cos(a),
    -Math.sin(d) * Math.sin(a),
    Math.cos(d),
  ];
  const p = [0, 1, 2].map(i => r[i] + xi * e[i] + eta * n[i]);
  const norm = Math.hypot(...p);
  return {
    ra: (((Math.atan2(p[1], p[0]) / RAD) % 360) + 360) % 360,
    dec: Math.asin(p[2] / norm) / RAD,
  };
}

/** Closed forms on the axes of the tangent plane. */
export const WCS_ANALYTIC = [
  {
    name: 'the reference pixel is the reference position',
    crval: [150, 2.2],
    dx: 0,
    dy: 0,
    ra: () => 150,
    dec: () => 2.2,
  },
  {
    name: 'the reference pixel at a high declination',
    crval: [10, -69.5],
    dx: 0,
    dy: 0,
    ra: () => 10,
    dec: () => -69.5,
  },
  {
    name: 'along the equator: ra = ra0 + atan(xi), dec = 0',
    crval: [180, 0],
    cdelt: [0.1, 0.1],
    dx: 60,
    dy: 0,
    ra: ({ xi }) => 180 + Math.atan(xi) / RAD,
    dec: () => 0,
  },
  {
    name: 'along a meridian: dec = dec0 + atan(eta), ra = ra0',
    crval: [40, 30],
    cdelt: [0.1, 0.1],
    dx: 0,
    dy: 100,
    ra: () => 40,
    dec: ({ eta }) => 30 + Math.atan(eta) / RAD,
  },
  {
    name: 'south along a meridian',
    crval: [200, -20],
    cdelt: [0.05, 0.05],
    dx: 0,
    dy: -150,
    ra: () => 200,
    dec: ({ eta }) => -20 + Math.atan(eta) / RAD,
  },
];

/** A sweep of points compared with skyByVectors. */
export const WCS_SWEEP = Object.freeze({
  seed: 157,
  points: 200,
  maxAbsDec0: 70,
  maxOffsetRadians: 0.2,
});

// --- The display rule ----------------------------------------------------------

/** [width, height, factor]: ceil(max(width, height) / 1024). */
export const DISPLAY_FACTORS = [
  [1, 1, 1],
  [1024, 1024, 1],
  [1025, 10, 2],
  [2048, 2048, 2],
  [2049, 2048, 3],
  [4096, 512, 4],
  [8192, 512, 8],
];

/** Block means by an independent sum, edge blocks over the pixels they have. */
export function blockMean(values, width, height, k) {
  const w = Math.ceil(width / k);
  const h = Math.ceil(height / k);
  const out = new Array(w * h);
  for (let by = 0; by < h; by++)
    for (let bx = 0; bx < w; bx++) {
      let sum = 0;
      let n = 0;
      for (let y = by * k; y < Math.min(height, by * k + k); y++)
        for (let x = bx * k; x < Math.min(width, bx * k + k); x++) {
          const v = values[y * width + x];
          if (!Number.isNaN(v)) {
            sum += v;
            n++;
          }
        }
      out[by * w + bx] = n ? sum / n : NaN;
    }
  return { width: w, height: h, values: out };
}

export const DOWNSAMPLE = [
  {
    name: '4 x 4 by 2, integers',
    width: 4,
    height: 4,
    k: 2,
    values: Array.from({ length: 16 }, (_, i) => i),
  },
  {
    name: '5 x 3 by 2, the edge blocks have fewer pixels',
    width: 5,
    height: 3,
    k: 2,
    values: Array.from({ length: 15 }, (_, i) => i * 3 - 7),
  },
  {
    name: '6 x 6 by 3 with a NaN',
    width: 6,
    height: 6,
    k: 3,
    values: Array.from({ length: 36 }, (_, i) => (i === 10 ? NaN : i)),
  },
  {
    name: 'a whole block of NaN is NaN',
    width: 4,
    height: 2,
    k: 2,
    values: [NaN, NaN, 1, 2, NaN, NaN, 3, 4],
  },
  {
    name: 'by 1 is the same image',
    width: 3,
    height: 2,
    k: 1,
    values: [5, 4, 3, 2, 1, 0],
  },
];

/** Divisible sizes conserve the total: sum(out) * k^2 equals sum(in). */
export const CONSERVE = { seed: 99, width: 64, height: 48, k: 4 };

// --- Memory arithmetic ----------------------------------------------------------

/** [width, height, planes, bytes]. */
export const DECODED_BYTES = [
  [2048, 2048, { data: true }, 33554432],
  [2048, 2048, { data: true, variance: true }, 67108864],
  [2048, 2048, { data: true, variance: true, mask: true }, 75497472],
  [1024, 1024, { data: true }, 8388608],
  [8192, 512, { data: true }, 33554432],
  [1, 1, { data: true }, 8],
];

/** [width, height, planes, frames resident at once under 64 MiB]. */
export const RESIDENT = [
  [2048, 2048, { data: true }, 2],
  [2048, 2048, { data: true, variance: true }, 1],
  [1024, 1024, { data: true }, 8],
  [64, 64, { data: true }, 2048],
];

// --- Sidecars: the pixel contract -----------------------------------------------

const fresh = o => JSON.parse(JSON.stringify(o));

/** A quantitative frame with its contract complete. */
export const GOOD_IMAGE = Object.freeze({
  format: 'gravitas.image',
  formatVersion: 1,
  id: 'example-frame',
  title: 'An example frame',
  use: 'quantitative',
  width: 64,
  height: 48,
  pixels: {
    unit: 'adu',
    linearity: {
      status: 'linear',
      limit: 50000,
      source: 'detector characterisation in the instrument manual',
    },
    saturation: { level: 60000, source: 'header SATURATE' },
    gain: { value: 1.5, unit: 'electron/adu', source: 'header' },
    readNoise: { value: 4, unit: 'electron', source: 'measured' },
  },
  planes: { data: { encoding: 'float32-le' } },
  time: {
    value: '2026-03-01T04:05:06Z',
    scale: 'UTC',
    format: 'iso',
    reference: 'mid',
  },
  exposure: { seconds: 30, kind: 'effective' },
  scale: { arcsecPerPixel: 0.5 },
  wcs: {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [32.5, 24.5],
    crval: [150, 2.2],
    cdelt: [-0.000138888889, 0.000138888889],
    pc: [
      [1, 0],
      [0, 1],
    ],
    radesys: 'ICRS',
  },
  calibration: { state: 'bias-subtracted', steps: ['overscan', 'bias'] },
  history: [
    {
      step: 'decode',
      tool: 'js/dataKinds/fits.js',
      version: '1',
      lossy: false,
    },
  ],
  source: { kind: 'upload', note: 'a frame the student chose' },
});

/**
 * [label, change, expectation]. valid: whether the document is a well-formed
 * image; marking, photometry and astrometry: true, or the refusal code. A
 * change edits a copy in place.
 */
export const IMAGE_CASES = [
  [
    'the good frame',
    () => {},
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'no WCS: astrometry is refused, photometry is not',
    d => {
      delete d.wcs;
    },
    { valid: true, marking: true, photometry: true, astrometry: 'no-wcs' },
  ],
  [
    'a WCS in another projection is refused by name',
    d => {
      d.wcs.ctype = ['RA---SIN', 'DEC--SIN'];
    },
    {
      valid: true,
      marking: true,
      photometry: true,
      astrometry: 'wcs-unsupported',
    },
  ],
  [
    'display-only: marking only',
    d => {
      d.use = 'display-only';
    },
    {
      valid: true,
      marking: true,
      photometry: 'display-only',
      astrometry: 'display-only',
    },
  ],
  [
    'display-only needs no contract',
    d => {
      d.use = 'display-only';
      delete d.pixels.gain;
      delete d.pixels.readNoise;
      delete d.pixels.linearity;
      delete d.pixels.saturation;
      delete d.calibration;
      delete d.time;
      delete d.exposure;
    },
    {
      valid: true,
      marking: true,
      photometry: 'display-only',
      astrometry: 'display-only',
    },
  ],
  [
    'a display unit is not flux',
    d => {
      d.pixels.unit = 'display';
    },
    { valid: true, marking: true, photometry: 'not-flux', astrometry: true },
  ],
  [
    'bit flags are not flux',
    d => {
      d.pixels.unit = 'flags';
    },
    { valid: true, marking: true, photometry: 'not-flux', astrometry: true },
  ],
  [
    'no pixel unit at all',
    d => {
      delete d.pixels.unit;
    },
    { valid: false },
  ],
  [
    'an unknown pixel unit',
    d => {
      d.pixels.unit = 'photons per fortnight';
    },
    { valid: false },
  ],
  [
    'no linearity: photometry waits for it',
    d => {
      delete d.pixels.linearity;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['pixels.linearity'],
      astrometry: true,
    },
  ],
  [
    'linearity unknown',
    d => {
      d.pixels.linearity = { status: 'unknown' };
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['pixels.linearity'],
      astrometry: true,
    },
  ],
  [
    'no saturation level',
    d => {
      delete d.pixels.saturation;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['pixels.saturation'],
      astrometry: true,
    },
  ],
  [
    'saturation declared absent with a reason',
    d => {
      d.pixels.saturation = {
        level: null,
        reason: 'a 16-bit counter that the star cannot reach',
      };
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'saturation absent without a reason',
    d => {
      d.pixels.saturation = { level: null };
    },
    { valid: false },
  ],
  [
    'no gain: noise provenance is missing',
    d => {
      delete d.pixels.gain;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['noise'],
      astrometry: true,
    },
  ],
  [
    'no read noise: noise provenance is missing',
    d => {
      delete d.pixels.readNoise;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['noise'],
      astrometry: true,
    },
  ],
  [
    'a variance plane stands for gain and read noise',
    d => {
      delete d.pixels.gain;
      delete d.pixels.readNoise;
      d.planes.variance = {
        encoding: 'float32-le',
        unit: 'adu2',
        source: 'the pipeline',
      };
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'a gain with no source',
    d => {
      delete d.pixels.gain.source;
    },
    { valid: false },
  ],
  [
    'a gain of zero',
    d => {
      d.pixels.gain.value = 0;
    },
    { valid: false },
  ],
  [
    'a negative read noise',
    d => {
      d.pixels.readNoise.value = -1;
    },
    { valid: false },
  ],
  [
    'an assumed gain, said so',
    d => {
      d.pixels.gain.source = 'assumed';
      d.pixels.gain.note = 'typical for this camera';
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'an assumed gain with no note',
    d => {
      d.pixels.gain.source = 'assumed';
    },
    { valid: false },
  ],
  [
    'no calibration state',
    d => {
      delete d.calibration;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['calibration.state'],
      astrometry: true,
    },
  ],
  [
    'no time',
    d => {
      delete d.time;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['time'],
      astrometry: true,
    },
  ],
  [
    'a time without its scale',
    d => {
      delete d.time.scale;
    },
    { valid: false },
  ],
  [
    'an unknown time scale',
    d => {
      d.time.scale = 'sidereal-ish';
    },
    { valid: false },
  ],
  [
    'a Julian date as a number',
    d => {
      d.time = {
        value: 2461100.5,
        scale: 'TDB',
        format: 'jd',
        reference: 'mid',
      };
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'an ISO time that is not one',
    d => {
      d.time.value = 'yesterday';
    },
    { valid: false },
  ],
  [
    'no exposure',
    d => {
      delete d.exposure;
    },
    {
      valid: true,
      marking: true,
      photometry: 'incomplete-contract',
      missing: ['exposure'],
      astrometry: true,
    },
  ],
  [
    'a zero exposure',
    d => {
      d.exposure.seconds = 0;
    },
    { valid: false },
  ],
  [
    'a stretch in the history',
    d => {
      d.history.push({
        step: 'stretch',
        tool: 'a viewer',
        version: '1',
        lossy: true,
      });
    },
    {
      valid: true,
      marking: true,
      photometry: 'lossy-history',
      astrometry: true,
    },
  ],
  [
    'a JPEG re-encode in the history',
    d => {
      d.history.push({
        step: 'reencode',
        tool: 'a camera',
        version: '2',
        lossy: true,
        format: 'jpeg',
      });
    },
    {
      valid: true,
      marking: true,
      photometry: 'lossy-history',
      astrometry: true,
    },
  ],
  [
    'a lossless re-encode is fine',
    d => {
      d.history.push({
        step: 'reencode',
        tool: 'a tool',
        version: '1',
        lossy: false,
      });
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'a resample that does not conserve flux',
    d => {
      d.history.push({
        step: 'resample',
        tool: 'a tool',
        version: '1',
        lossy: false,
        fluxConserving: false,
        wcsUpdated: true,
      });
    },
    {
      valid: true,
      marking: true,
      photometry: 'lossy-history',
      astrometry: true,
    },
  ],
  [
    'a flux-conserving resample with its WCS updated',
    d => {
      d.history.push({
        step: 'resample',
        tool: 'a tool',
        version: '1',
        lossy: false,
        fluxConserving: true,
        wcsUpdated: true,
      });
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'a crop whose WCS was not updated: astrometry waits',
    d => {
      d.history.push({
        step: 'crop',
        tool: 'a tool',
        version: '1',
        lossy: false,
        wcsUpdated: false,
      });
    },
    {
      valid: true,
      marking: true,
      photometry: true,
      astrometry: 'geometry-unrecorded',
    },
  ],
  [
    'a history step with no tool',
    d => {
      d.history.push({ step: 'crop', version: '1', lossy: false });
    },
    { valid: false },
  ],
  [
    'an unknown history step',
    d => {
      d.history.push({
        step: 'enhance',
        tool: 't',
        version: '1',
        lossy: false,
      });
    },
    { valid: false },
  ],
  [
    'a history step that does not say if it is lossy',
    d => {
      d.history.push({
        step: 'crop',
        tool: 't',
        version: '1',
        wcsUpdated: true,
      });
    },
    { valid: false },
  ],
  [
    'no history at all',
    d => {
      delete d.history;
    },
    { valid: false },
  ],
  [
    'a different format',
    d => {
      d.format = 'gravitas.something';
    },
    { valid: false },
  ],
  [
    'a later version',
    d => {
      d.formatVersion = 2;
    },
    { valid: false },
  ],
  [
    'an unknown use',
    d => {
      d.use = 'beautiful';
    },
    { valid: false },
  ],
  [
    'no id',
    d => {
      delete d.id;
    },
    { valid: false },
  ],
  [
    '2,049 pixels square',
    d => {
      d.width = 2049;
      d.height = 2049;
    },
    { valid: false, code: 'too-large' },
  ],
  [
    'a width of 0',
    d => {
      d.width = 0;
    },
    { valid: false },
  ],
  [
    'a width of 2.5',
    d => {
      d.width = 2.5;
    },
    { valid: false },
  ],
  [
    'the mask pushes the frame past 64 MiB',
    d => {
      d.width = 2048;
      d.height = 2048;
      d.planes.variance = { encoding: 'float32-le', unit: 'adu2', source: 'p' };
      d.planes.mask = {
        encoding: 'uint16-le',
        bits: [{ value: 1, meaning: 'bad' }],
        bitsSource: 'the pipeline',
      };
    },
    { valid: false, code: 'too-large' },
  ],
  [
    'a mask with bits and where they are documented',
    d => {
      d.planes.mask = {
        encoding: 'uint16-le',
        bits: [
          { value: 1, meaning: 'bad pixel' },
          { value: 2, meaning: 'cosmic ray' },
        ],
        bitsSource: 'the pipeline manual',
      };
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'a mask without bitsSource',
    d => {
      d.planes.mask = {
        encoding: 'uint16-le',
        bits: [{ value: 1, meaning: 'bad pixel' }],
      };
    },
    { valid: false },
  ],
  [
    'an unknown plane encoding',
    d => {
      d.planes.data.encoding = 'float16-be';
    },
    { valid: false },
  ],
  [
    'synthetic data without its truth manifest',
    d => {
      d.source = { kind: 'synthetic' };
    },
    { valid: false },
  ],
  [
    'synthetic data with its truth manifest',
    d => {
      d.source = {
        kind: 'synthetic',
        model: {
          name: 'forward image model 1.0.0',
          parameters: { fwhm: 2.2 },
          seed: 'a',
        },
      };
    },
    { valid: true, marking: true, photometry: true, astrometry: true },
  ],
  [
    'a source that is not an object',
    d => {
      d.source = 'somewhere';
    },
    { valid: false },
  ],
];

export const goodImage = () => fresh(GOOD_IMAGE);

// --- Sequences --------------------------------------------------------------------

export const GOOD_SEQUENCE = Object.freeze({
  format: 'gravitas.image-sequence',
  formatVersion: 1,
  id: 'example-sequence',
  title: 'An example sequence',
  frame: (() => {
    const f = fresh(GOOD_IMAGE);
    delete f.format;
    delete f.formatVersion;
    delete f.time;
    delete f.exposure;
    f.id = 'example-frame-shape';
    return f;
  })(),
  frames: [
    {
      index: 0,
      time: {
        value: '2026-03-01T04:00:00Z',
        scale: 'UTC',
        format: 'iso',
        reference: 'mid',
      },
      exposure: { seconds: 30, kind: 'effective' },
    },
    {
      index: 1,
      time: {
        value: '2026-03-01T04:01:00Z',
        scale: 'UTC',
        format: 'iso',
        reference: 'mid',
      },
      exposure: { seconds: 30, kind: 'effective' },
    },
    {
      index: 2,
      time: {
        value: '2026-03-01T04:02:00Z',
        scale: 'UTC',
        format: 'iso',
        reference: 'mid',
      },
      exposure: { seconds: 30, kind: 'effective' },
    },
  ],
});

export const goodSequence = () => fresh(GOOD_SEQUENCE);

const part = (id, n = 1000) => ({
  id,
  url: `/parts/${id}.${'ab12cd34ef567890'}.bin`,
  sha256: `ab12cd34ef567890${'0'.repeat(48)}`,
  bytes: n,
});

/** [label, change, valid, code?]. */
export const SEQUENCE_CASES = [
  ['the good sequence', () => {}, true],
  [
    'one frame is a sequence of one',
    d => {
      d.frames.length = 1;
    },
    true,
  ],
  [
    'times in order, equal times allowed',
    d => {
      d.frames[1].time = fresh(d.frames[0].time);
    },
    true,
  ],
  [
    'times out of order',
    d => {
      d.frames[1].time.value = '2026-03-01T03:00:00Z';
    },
    false,
  ],
  [
    'frame indices not 0..n-1',
    d => {
      d.frames[2].index = 5;
    },
    false,
  ],
  [
    'a frame with no time',
    d => {
      delete d.frames[1].time;
    },
    false,
  ],
  [
    'a frame with no exposure',
    d => {
      delete d.frames[1].exposure;
    },
    false,
  ],
  [
    'two time scales in one sequence',
    d => {
      d.frames[1].time.scale = 'TDB';
    },
    false,
  ],
  [
    'no frames',
    d => {
      d.frames = [];
    },
    false,
  ],
  [
    '257 frames',
    d => {
      d.frames = Array.from({ length: 257 }, (_, i) => ({
        index: i,
        time: {
          value: 60000 + i,
          scale: 'TDB',
          format: 'mjd',
          reference: 'mid',
        },
        exposure: { seconds: 1, kind: 'nominal' },
      }));
      d.frame.use = 'display-only';
    },
    false,
    'too-large',
  ],
  [
    '256 frames of a small shape',
    d => {
      d.frames = Array.from({ length: 256 }, (_, i) => ({
        index: i,
        time: {
          value: 60000 + i / 100,
          scale: 'TDB',
          format: 'mjd',
          reference: 'mid',
        },
        exposure: { seconds: 1, kind: 'nominal' },
      }));
    },
    true,
  ],
  [
    'a frame that changes the shape',
    d => {
      d.frames[1].width = 10;
    },
    false,
  ],
  [
    'a shared shape that carries a time',
    d => {
      d.frame.time = {
        value: '2026-03-01T04:05:06Z',
        scale: 'UTC',
        format: 'iso',
        reference: 'mid',
      };
    },
    false,
  ],
  [
    'frames held as parts with immutable URLs',
    d => {
      d.frames.forEach((f, i) => {
        f.part = part(`frame-${i}`);
      });
    },
    true,
  ],
  [
    'a part whose URL has a query',
    d => {
      d.frames[0].part = {
        ...part('f0'),
        url: '/parts/f0.ab12cd34ef567890.bin?x=1',
      };
    },
    false,
  ],
  [
    'a part whose URL lacks the digest',
    d => {
      d.frames[0].part = { ...part('f0'), url: '/parts/f0.bin' };
    },
    false,
  ],
  [
    'a part from another origin',
    d => {
      d.frames[0].part = {
        ...part('f0'),
        url: 'https://example.org/f0.ab12cd34ef567890.bin',
      };
    },
    false,
  ],
  [
    'a shape that is itself too large',
    d => {
      d.frame.width = 4096;
      d.frame.height = 4096;
    },
    false,
    'too-large',
  ],
  [
    'a different format',
    d => {
      d.format = 'gravitas.image';
    },
    false,
  ],
];

// --- Grids ------------------------------------------------------------------------

/** The multilinear function of the good grid: exactly representable weights. */
export const gridFn = (teff, logg) =>
  0.001 * teff + 0.5 * logg + 0.0001 * teff * logg;

const TEFF = [3000, 4000, 5000];
const LOGG = [3.5, 4, 4.5, 5];

/** Row-major, the last axis varying fastest, as Float64 little-endian. */
export function gridBytes(fn = gridFn) {
  const out = Buffer.alloc(8 * TEFF.length * LOGG.length);
  let i = 0;
  for (const t of TEFF)
    for (const g of LOGG) out.writeDoubleLE(fn(t, g), 8 * i++);
  return out;
}

export const GOOD_GRID = Object.freeze({
  format: 'gravitas.grid',
  formatVersion: 1,
  id: 'example-grid',
  title: 'An example grid',
  axes: [
    { name: 'teff', unit: 'K', values: TEFF },
    { name: 'logg', unit: 'dex', values: LOGG },
  ],
  outputs: [{ name: 'bolometric correction', unit: 'mag' }],
  layout: 'dense',
  storage: { encoding: 'float64-le', data: gridBytes().toString('base64') },
  generator: {
    name: 'a linear model in this file',
    version: '1.0.0',
    tool: 'tools/data-kinds-cases.mjs gridFn',
    inputs: {
      teff: TEFF,
      logg: LOGG,
      formula: '0.001 teff + 0.5 logg + 0.0001 teff logg',
    },
  },
});

export const goodGrid = () => fresh(GOOD_GRID);

/** [label, change, valid, code?]. */
export const GRID_CASES = [
  ['the good grid', () => {}, true],
  [
    'an axis out of order',
    d => {
      d.axes[0].values = [4000, 3000, 5000];
    },
    false,
  ],
  [
    'an axis with a repeated value',
    d => {
      d.axes[1].values = [3.5, 4, 4, 5];
    },
    false,
  ],
  [
    'an axis with a NaN',
    d => {
      d.axes[1].values = [3.5, null, 4.5, 5];
    },
    false,
  ],
  [
    'an axis of one value',
    d => {
      d.axes[0].values = [3000];
      d.storage.data = gridBytes().subarray(0, 32).toString('base64');
    },
    true,
  ],
  [
    'two axes of one name',
    d => {
      d.axes[1].name = 'teff';
    },
    false,
  ],
  [
    'an axis with no unit',
    d => {
      delete d.axes[0].unit;
    },
    false,
  ],
  [
    'no outputs',
    d => {
      d.outputs = [];
    },
    false,
  ],
  [
    'two outputs of one name',
    d => {
      d.outputs.push({ name: 'bolometric correction', unit: 'mag' });
    },
    false,
  ],
  [
    'the data is a value short',
    d => {
      d.storage.data = gridBytes().subarray(0, 88).toString('base64');
    },
    false,
    'bad-size',
  ],
  [
    'the data is a value long',
    d => {
      d.storage.data = Buffer.concat([gridBytes(), Buffer.alloc(8)]).toString(
        'base64'
      );
    },
    false,
    'bad-size',
  ],
  [
    'an unknown encoding',
    d => {
      d.storage.encoding = 'float16-le';
    },
    false,
  ],
  [
    'no generator',
    d => {
      delete d.generator;
    },
    false,
  ],
  [
    'no generator inputs',
    d => {
      d.generator.inputs = {};
    },
    false,
  ],
  [
    'a generator with no version',
    d => {
      delete d.generator.version;
    },
    false,
  ],
  [
    'seven axes',
    d => {
      d.axes = Array.from({ length: 7 }, (_, i) => ({
        name: `p${i}`,
        unit: '',
        values: [0, 1],
      }));
      d.storage.data = Buffer.alloc(8 * 128).toString('base64');
    },
    false,
    'too-large',
  ],
  [
    'an axis of 4,097 values',
    d => {
      d.axes = [
        {
          name: 'a',
          unit: '',
          values: Array.from({ length: 4097 }, (_, i) => i),
        },
      ];
      d.storage.data = '';
    },
    false,
    'too-large',
  ],
  [
    'two axes of 4,096: 16.7 million cells',
    d => {
      const v = Array.from({ length: 4096 }, (_, i) => i);
      d.axes = [
        { name: 'a', unit: '', values: v },
        { name: 'b', unit: '', values: v },
      ];
      d.storage.data = '';
    },
    false,
    'too-large',
  ],
  [
    'a part in place of inline data',
    d => {
      d.storage = { encoding: 'float64-le', part: part('grid-1', 96) };
    },
    true,
  ],
  [
    'a part of the wrong size',
    d => {
      d.storage = { encoding: 'float64-le', part: part('grid-1', 95) };
    },
    false,
    'bad-size',
  ],
  [
    'data and a part together',
    d => {
      d.storage.part = part('grid-1', 96);
    },
    false,
  ],
  [
    'a keyed layout with no keys',
    d => {
      d.layout = 'keyed';
      d.storage = {
        kind: 'pack-table',
        pack: 'a-pack',
        sha256: '0'.repeat(64),
      };
    },
    false,
  ],
];

/** Interpolation: at nodes exact, between nodes the multilinear function. */
export const GRID_POINTS = [
  { at: [3000, 3.5], exact: true },
  { at: [5000, 5], exact: true },
  { at: [4000, 4.5], exact: true },
  { at: [3500, 3.75], exact: false },
  { at: [4500, 4.9], exact: false },
  { at: [3123.456, 4.321], exact: false },
];

/** Points the grid refuses: outside its domain, or not numbers. */
export const GRID_REFUSED = [
  [2999.9, 4],
  [4000, 5.0001],
  [5000.0001, 3.5],
  [NaN, 4],
  [4000, Infinity],
];

// --- Keyed grids over a pack's table ------------------------------------------------

/** What the MIST isochrone pack's table must give as a grid of (feh, logAge). */
export const MIST_GRID = Object.freeze({
  pack: 'mist-sdss-isochrones',
  axes: ['feh', 'logAge'],
  // The cells must tile the table exactly: each row in one cell, in order.
  tile: true,
});

// --- Added before the examples were written ---------------------------------------

/**
 * A frame of bit flags (a mask: the TESS aperture) says what each bit means and
 * where that is documented; it is not light, so photometry is refused.
 */
export const FLAGS_CASES = [
  [
    'a flags image with its bits and their source',
    d => {
      d.pixels = {
        unit: 'flags',
        bits: [
          { value: 1, meaning: 'collected' },
          { value: 2, meaning: 'in the aperture' },
        ],
        bitsSource: 'the data products document, table 15',
      };
    },
    { valid: true, marking: true, photometry: 'not-flux', astrometry: true },
  ],
  [
    'a flags image without bits',
    d => {
      d.pixels = { unit: 'flags' };
    },
    { valid: false },
  ],
  [
    'a flags image whose bits have no source',
    d => {
      d.pixels = { unit: 'flags', bits: [{ value: 1, meaning: 'collected' }] };
    },
    { valid: false },
  ],
  [
    'bits on an image that is light',
    d => {
      d.pixels.bits = [{ value: 1, meaning: 'collected' }];
      d.pixels.bitsSource = 'somewhere';
    },
    { valid: false },
  ],
];

/** Data packs of the new kinds: [label, change to the aperture pack's manifest, valid or the field it is about]. */
export const PACK_CASES = [
  ['the aperture pack as it is', () => {}, true],
  [
    'an image pack with a sidecar of its own size',
    (m, k) => {
      m.image.sidecar = k.image(m.image.width, m.image.height);
    },
    true,
  ],
  [
    'a sidecar of another size',
    (m, k) => {
      m.image.sidecar = k.image(m.image.width + 1, m.image.height);
    },
    'image.sidecar',
  ],
  [
    'a sidecar that is not a valid image',
    (m, k) => {
      m.image.sidecar = k.image(m.image.width, m.image.height);
      delete m.image.sidecar.pixels;
    },
    'image.sidecar',
  ],
  [
    'an image-sequence pack with its sequence',
    (m, k) => {
      m.dataType = 'image-sequence';
      delete m.image;
      m.sequence = k.sequence();
    },
    true,
  ],
  [
    'an image-sequence pack without one',
    m => {
      m.dataType = 'image-sequence';
      delete m.image;
    },
    'sequence',
  ],
  [
    'an image-sequence pack with a bad one',
    (m, k) => {
      m.dataType = 'image-sequence';
      delete m.image;
      m.sequence = k.sequence();
      m.sequence.frames.reverse();
    },
    'sequence',
  ],
  [
    'a grid pack with its grid',
    (m, k) => {
      m.dataType = 'grid';
      delete m.image;
      m.grid = k.grid();
    },
    true,
  ],
  [
    'a grid pack without one',
    m => {
      m.dataType = 'grid';
      delete m.image;
    },
    'grid',
  ],
  [
    'a grid pack with a bad one',
    (m, k) => {
      m.dataType = 'grid';
      delete m.image;
      m.grid = k.grid();
      m.grid.axes[0].values = [3, 2, 1];
    },
    'grid',
  ],
];

/** The examples from existing material, and what each must show. */
export const EXAMPLES = Object.freeze({
  dir: 'tests/fixtures/dataKinds',
  image: {
    file: 'image-tess-hd209458-aperture.json',
    pack: 'tess-hd209458-s56-aperture',
    width: 11,
    height: 13,
    // The pixels carrying bit 2 (the optimal aperture), as the pack's check counts them.
    optimalAperture: 23,
    photometry: 'not-flux',
    astrometry: true,
  },
  sequence: {
    file: 'image-sequence-forward-ccd.json',
    frames: 2,
    width: 128,
    height: 96,
    // Frames from the forward ccd model (js/forward/models/ccd.js), same seed, two labels.
    model: 'ccd',
  },
  grid: {
    file: 'grid-mist-sdss-isochrones.json',
    pack: 'mist-sdss-isochrones',
    axes: ['feh', 'logAge'],
  },
});
