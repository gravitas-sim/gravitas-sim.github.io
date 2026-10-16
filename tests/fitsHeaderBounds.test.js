import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readFits, requireColumns } from '../tools/data-packs/fits.mjs';
import { PACKS } from '../tools/build-data-packs.mjs';

// =============================================================================
// The FITS reader checks every header against the file before it reads data
// -----------------------------------------------------------------------------
// A header is the file's own account of itself. tools/data-packs/fits.mjs used
// to take it at its word: NAXIS became an array length before anything looked
// at it (VO_ARCHIVE_GATE.md, finding 4: NAXIS = 5e7 in a 2880-byte file took
// 32 s and 421 MB, and 2e9 ran out of heap), the axes were multiplied into a
// byte count before it was compared with the file, and a negative PCOUNT sent
// the walk back onto the header it had just read, forever. These are the
// checks spike/vo/fitsBounded.js prototyped, now in the reader itself, and a
// file that breaks one is refused with the card named, before anything is
// allocated for its data.
//
// The last block holds the reader to the files it exists for. The two TESS
// light curves the packs are built from are not in the repository (2 MB each,
// pinned by checksum), so tests/fixtures/fits/ keeps their headers, verbatim,
// and each file is rebuilt here around data units of the sizes its headers
// state. `npm run packs:provenance` is the byte-for-byte rebuild from the real
// files.
// =============================================================================

const REPO = process.cwd();
const BLOCK = 2880;

// --- A FITS file, written by hand ---------------------------------------------

/** One card. A string value is passed with its quotes: "'BINTABLE'". */
const card = (key, value) =>
  value === undefined
    ? key.padEnd(80)
    : `${key.padEnd(8)}= ${String(value).padStart(20)}`.padEnd(80);
/** Card text, padded with spaces to whole blocks. */
const pad = text => {
  const b = Buffer.alloc(Math.ceil(text.length / BLOCK) * BLOCK, ' ');
  b.write(text, 'latin1');
  return b;
};
const header = cards =>
  pad(cards.map(([k, v]) => card(k, v)).join('') + 'END'.padEnd(80));
const file = (...parts) => new Uint8Array(Buffer.concat(parts));

const PRIMARY = [
  ['SIMPLE', 'T'],
  ['BITPIX', 8],
  ['NAXIS', 0],
];

/** A primary header and one BINTABLE of `rows` doubles, 1000 upwards. */
function table(rows, overrides = {}) {
  const cards = {
    XTENSION: "'BINTABLE'",
    BITPIX: 8,
    NAXIS: 2,
    NAXIS1: 8,
    NAXIS2: rows,
    PCOUNT: 0,
    GCOUNT: 1,
    TFIELDS: 1,
    TTYPE1: "'TIME'",
    TFORM1: "'D'",
    TUNIT1: "'d'",
    ...overrides,
  };
  const data = Buffer.alloc(Math.ceil((8 * rows) / BLOCK) * BLOCK);
  for (let i = 0; i < rows; i++) data.writeDoubleBE(1000 + i, 8 * i);
  return file(
    header(PRIMARY),
    header(Object.entries(cards).filter(([, v]) => v !== null)),
    data
  );
}

/** A primary header and one IMAGE extension with these cards, and no data. */
const image = cards =>
  file(
    header(PRIMARY),
    header([['XTENSION', "'IMAGE'"], ...cards, ['PCOUNT', 0], ['GCOUNT', 1]])
  );

// --- The checks ---------------------------------------------------------------

describe('the FITS reader checks each header before it reads any data', () => {
  test('a well-formed table reads', () => {
    expect(readFits(table(10))[1].columns.TIME.values.slice(0, 3)).toEqual([
      1000, 1001, 1002,
    ]);
  });

  test('malformed metadata is refused, never guessed at', () => {
    const cases = [
      [table(10).slice(0, BLOCK + 80 * 5), /has no END card/],
      [table(10, { TFORM1: "'?'" }), /TFORM1 "\?" is not a FITS binary-table/],
      [table(10, { NAXIS1: 12 }), /the columns take 8 bytes of a 12-byte row/],
      [
        new Uint8Array(Buffer.from('<html>Maintenance</html>'.padEnd(BLOCK))),
        /not a FITS file/,
      ],
    ];
    for (const [bytes, error] of cases)
      expect(() => readFits(bytes)).toThrow(error);
  });

  test('NAXIS is bounded before it is used: 2e9 in a 2880-byte file is refused', () => {
    // The old reader handed this to Array.from and ran out of heap.
    const hostile = file(
      header([
        ['SIMPLE', 'T'],
        ['BITPIX', 8],
        ['NAXIS', 2_000_000_000],
      ])
    );
    expect(() => readFits(hostile)).toThrow(
      'NAXIS = 2000000000 in the FITS header at byte 0: FITS allows 0 to 999'
    );
    for (const naxis of [1000, -1, 2.5, "'2'"]) {
      expect(() =>
        readFits(
          file(
            header([
              ['SIMPLE', 'T'],
              ['BITPIX', 8],
              ['NAXIS', naxis],
            ])
          )
        )
      ).toThrow(/^NAXIS = .* FITS allows 0 to 999$/);
    }
    expect(() =>
      readFits(
        file(
          header([
            ['SIMPLE', 'T'],
            ['BITPIX', 8],
          ])
        )
      )
    ).toThrow('FITS header at byte 0 has no NAXIS card');
  });

  test('999 axes, the most FITS allows, still read', () => {
    const axes = Array.from({ length: 999 }, (_, i) => [`NAXIS${i + 1}`, 1]);
    const units = readFits(
      file(
        header([['SIMPLE', 'T'], ['BITPIX', 8], ['NAXIS', 999], ...axes]),
        Buffer.alloc(BLOCK)
      )
    );
    expect(units[0].unread).toEqual([{ name: '(image)', form: '999 axes' }]);
  });

  test('an axis length that is missing, negative or not a whole number is refused', () => {
    const shape = extra => [
      ['BITPIX', 8],
      ['NAXIS', 2],
      ['NAXIS1', 4],
      ...extra,
    ];
    expect(() => readFits(image(shape([])))).toThrow(
      'FITS header at byte 2880 has no NAXIS2 card'
    );
    expect(() => readFits(image(shape([['NAXIS2', -1]])))).toThrow(
      'NAXIS2 = -1 in the FITS header at byte 2880: FITS allows a whole number, 0 or more'
    );
    expect(() => readFits(image(shape([['NAXIS2', 1.5]])))).toThrow(
      /^NAXIS2 = 1.5 in/
    );
    expect(() => readFits(image(shape([['NAXIS2', 'T']])))).toThrow(
      /^NAXIS2 = true in/
    );
  });

  test('the product of the axes is compared with the file at every step, before it can overflow', () => {
    // 2^40 x 2^40 is past 2^53, where the product stops being exact: the
    // check has to come at NAXIS1, not after the multiplication.
    const hostile = file(
      header(PRIMARY),
      header([
        ['XTENSION', "'BINTABLE'"],
        ['BITPIX', 8],
        ['NAXIS', 2],
        ['NAXIS1', 2 ** 40],
        ['NAXIS2', 2 ** 40],
        ['PCOUNT', 0],
        ['GCOUNT', 1],
        ['TFIELDS', 1],
      ])
    );
    expect(() => readFits(hostile)).toThrow(
      'NAXIS1 = 1099511627776 in the FITS header at byte 2880 makes its data unit larger than the 5760-byte file'
    );
  });

  test('an axis of length 0 is an empty data unit, however long the others are', () => {
    const [, empty] = readFits(
      image([
        ['BITPIX', 16],
        ['NAXIS', 2],
        ['NAXIS1', 2 ** 40],
        ['NAXIS2', 0],
      ])
    );
    expect(empty.image.width).toBe(2 ** 40);
    expect(empty.image.values).toHaveLength(0);
  });

  test('a data unit that runs past the end of the file is refused', () => {
    expect(() => readFits(table(10).slice(0, 2 * BLOCK + 16))).toThrow(
      'the data unit of the FITS header at byte 2880 runs past the end of the file: 80 bytes from byte 5760 of 5776'
    );
    // Before, an image the reader lists as unread was never checked at all.
    const cube = [
      ['BITPIX', -32],
      ['NAXIS', 3],
      ['NAXIS1', 10],
      ['NAXIS2', 10],
      ['NAXIS3', 10],
    ];
    expect(() => readFits(image(cube))).toThrow(
      /runs past the end of the file/
    );
    // And so is a heap, which PCOUNT counts.
    expect(() => readFits(table(10, { PCOUNT: BLOCK }))).toThrow(
      /runs past the end of the file: 2960 bytes/
    );
  });

  test('a negative PCOUNT cannot walk the reader back onto its own header', () => {
    // NAXIS1 = 0 makes the data unit PCOUNT bytes, so -2880 used to set the
    // next header's offset to this one's, and the old reader never returned.
    const loop = file(
      header([
        ['SIMPLE', 'T'],
        ['BITPIX', 8],
        ['NAXIS', 1],
        ['NAXIS1', 0],
        ['PCOUNT', -BLOCK],
      ])
    );
    expect(() => readFits(loop)).toThrow(
      'PCOUNT = -2880 in the FITS header at byte 0: FITS allows a whole number, 0 or more'
    );
  });

  test('a BITPIX FITS does not define is refused, and each one it does reads', () => {
    const primary = bitpix =>
      file(
        header([
          ['SIMPLE', 'T'],
          ['BITPIX', bitpix],
          ['NAXIS', 0],
        ])
      );
    expect(() => readFits(primary(7))).toThrow(
      'BITPIX = 7 in the FITS header at byte 0 is not a FITS pixel type'
    );
    expect(() => readFits(primary("'8'"))).toThrow(/^BITPIX = "8" in/);
    expect(() =>
      readFits(
        file(
          header([
            ['SIMPLE', 'T'],
            ['NAXIS', 0],
          ])
        )
      )
    ).toThrow('FITS header at byte 0 has no BITPIX card');
    for (const bitpix of [8, 16, 32, 64, -32, -64]) {
      expect(readFits(primary(bitpix))[0].cards.BITPIX).toBe(bitpix);
    }
  });

  test('TFIELDS outside 0 to 999 is refused', () => {
    expect(() => readFits(table(10, { TFIELDS: 1000 }))).toThrow(
      'TFIELDS = 1000 in the FITS header at byte 2880: FITS allows 0 to 999'
    );
    expect(() => readFits(table(10, { TFIELDS: -1 }))).toThrow(/^TFIELDS = -1/);
  });

  test('a BINTABLE is refused unless it has two axes', () => {
    expect(() => readFits(table(10, { NAXIS: 1, NAXIS2: null }))).toThrow(
      'NAXIS = 1 in the FITS header at byte 2880: a BINTABLE has 2 axes'
    );
  });

  test('a header with no END in its first 100 blocks is refused; one that ends in its 100th reads', () => {
    const comments = n => Array.from({ length: n }, () => ['COMMENT']);
    // SIMPLE, BITPIX, NAXIS, the comments and END: 3600 cards is 100 blocks.
    const full = file(header([...PRIMARY, ...comments(3600 - 4)]));
    expect(full).toHaveLength(100 * BLOCK);
    expect(readFits(full)).toHaveLength(1);
    const over = file(header([...PRIMARY, ...comments(3600 - 3)]));
    expect(over).toHaveLength(101 * BLOCK);
    expect(() => readFits(over)).toThrow(
      'FITS header at byte 0 has no END card in its first 100 blocks'
    );
  });

  test('more header-and-data units than maxUnits (16) is refused', () => {
    const units = n =>
      file(
        header(PRIMARY),
        ...Array.from({ length: n - 1 }, () =>
          header([
            ['XTENSION', "'IMAGE'"],
            ['BITPIX', 8],
            ['NAXIS', 0],
            ['PCOUNT', 0],
            ['GCOUNT', 1],
          ])
        )
      );
    expect(readFits(units(16))).toHaveLength(16);
    expect(() => readFits(units(17))).toThrow(
      'the file has more than 16 header-and-data units; readFits(bytes, { maxUnits }) reads more'
    );
    expect(readFits(units(21), { maxUnits: 21 })).toHaveLength(21);
    expect(() => readFits(units(3), { maxUnits: 2 })).toThrow(
      /more than 2 header-and-data units/
    );
  });
});

// --- The files it exists for ----------------------------------------------------

/**
 * A real file's headers from tests/fixtures/fits/, with each data unit the
 * size FITS says its header describes, as zeros. The arithmetic is written
 * out here rather than taken from the reader, so the two are checked against
 * each other: if the reader stepped differently, it would not find the next
 * header.
 */
function rebuilt(name) {
  const lines = readFileSync(
    path.join(REPO, 'tests/fixtures/fits', `${name}.headers.txt`),
    'latin1'
  )
    .split('\n')
    .slice(0, -1);
  const parts = [];
  let cards = [];
  for (const line of lines) {
    cards.push(line.padEnd(80));
    if (line !== 'END') continue;
    const value = key => {
      const c = cards.find(x => x.startsWith(`${key.padEnd(8)}=`));
      return c && Number(c.slice(10).split('/')[0]);
    };
    const naxis = value('NAXIS');
    let bytes = 0;
    if (naxis > 0) {
      bytes = Math.abs(value('BITPIX')) / 8;
      for (let i = 1; i <= naxis; i++) bytes *= value(`NAXIS${i}`);
      bytes += value('PCOUNT') ?? 0;
    }
    parts.push(
      pad(cards.join('')),
      Buffer.alloc(Math.ceil(bytes / BLOCK) * BLOCK)
    );
    cards = [];
  }
  return file(...parts);
}

describe('the real TESS light curves still read', () => {
  const lc = PACKS.find(p => p.id === 'tess-hd209458-s56-lc').raw[0];
  const suDra = JSON.parse(
    readFileSync(
      path.join(REPO, 'extensions/su-dra-tess-s15/pack.json'),
      'utf8'
    )
  ).raw[0];

  test.each([
    [
      'HD 209458, sector 56, the built-in packs',
      lc,
      'TIC 420814525',
      56,
      [11, 13],
    ],
    ['SU Dra, sector 15, the extension', suDra, 'TIC 142848794', 15, [11, 11]],
  ])('%s', (_, pin, object, sector, [width, height]) => {
    const bytes = rebuilt(path.basename(pin.file, '.fits'));
    // The headers and the arithmetic give the file MAST served, to the byte.
    expect(bytes).toHaveLength(pin.bytes);
    const units = readFits(bytes);
    expect(units.map(u => u.cards.EXTNAME ?? 'PRIMARY')).toEqual([
      'PRIMARY',
      'LIGHTCURVE',
      'APERTURE',
    ]);
    const [primary, curve, aperture] = units;
    expect(primary.cards).toMatchObject({ OBJECT: object, SECTOR: sector });
    expect(curve.cards.TIMESYS).toBe('TDB');
    // What the transform asks for, and every row the header counts.
    const columns = requireColumns(curve, [
      'TIME',
      'PDCSAP_FLUX',
      'PDCSAP_FLUX_ERR',
      'QUALITY',
    ]);
    expect(columns.TIME.values).toHaveLength(curve.cards.NAXIS2);
    expect(curve.unread).toEqual([]);
    expect(aperture.image).toMatchObject({ width, height });
    expect(aperture.image.values).toBeInstanceOf(Int32Array);
  });
});
