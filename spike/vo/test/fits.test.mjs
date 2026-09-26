// SPIKE (Prompt 18): malformed FITS metadata, against the repository's reader.
// Run: node --test spike/vo/test/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFits } from '../../../tools/data-packs/fits.mjs';
import { readFitsBounded, FitsLimitError } from '../fitsBounded.js';

const BLOCK = 2880;
const card = (k, v) => (v === undefined ? k.padEnd(80) : `${k.padEnd(8)}= ${String(v).padStart(20)}`.padEnd(80));
function header(cards) {
  const text = cards.map(([k, v]) => card(k, v)).join('') + 'END'.padEnd(80);
  return new TextEncoder().encode(text.padEnd(Math.ceil(text.length / BLOCK) * BLOCK));
}
const join = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) out.set(p, (at += p.length) - p.length);
  return out;
};
const PRIMARY = [['SIMPLE', 'T'], ['BITPIX', 8], ['NAXIS', 0]];
/** A primary header and one BINTABLE of `rows` doubles. */
function table(rows, overrides = {}) {
  const cards = { XTENSION: "'BINTABLE'", BITPIX: 8, NAXIS: 2, NAXIS1: 8, NAXIS2: rows, PCOUNT: 0, GCOUNT: 1, TFIELDS: 1, TTYPE1: "'TIME'", TFORM1: "'D'", TUNIT1: "'d'", ...overrides };
  const data = new Uint8Array(Math.ceil((8 * rows) / BLOCK) * BLOCK || 0);
  const v = new DataView(data.buffer);
  for (let i = 0; i < rows; i++) v.setFloat64(8 * i, 1000 + i);
  return join(header(PRIMARY), header(Object.entries(cards).filter(([, x]) => x !== null)), data);
}

test('a well-formed table reads, bounded or not', () => {
  const f = table(10);
  assert.deepEqual(readFits(f)[1].columns.TIME.values.slice(0, 3), [1000, 1001, 1002]);
  assert.deepEqual(readFitsBounded(f)[1].columns.TIME.values.slice(0, 3), [1000, 1001, 1002]);
});

test('malformed FITS metadata is refused, never guessed at', () => {
  const noEnd = table(10).slice(0, BLOCK + 80 * 5);
  const cases = {
    'no END card': noEnd,
    'table past the end': table(10).slice(0, 2 * BLOCK + 16),
    'bad TFORM': table(10, { TFORM1: "'?'" }),
    'row width': table(10, { NAXIS1: 12 }),
    'not FITS': new TextEncoder().encode('<html>Maintenance</html>'.padEnd(BLOCK)),
  };
  for (const [what, bytes] of Object.entries(cases)) {
    assert.throws(() => readFitsBounded(bytes), Error, what);
  }
});

test('NAXIS is an array length: the bounded reader refuses a hostile one before allocating', () => {
  const hostile = join(header([['SIMPLE', 'T'], ['BITPIX', 8], ['NAXIS', 2_000_000_000]]));
  assert.throws(() => readFitsBounded(hostile), FitsLimitError);
  // readFits itself would hand 2e9 to Array.from; VO_ARCHIVE_GATE.md
  // records what that costs at a size this test can afford to run.
});

test('NAXISn whose product passes the file is refused before the product is used', () => {
  const hostile = join(header(PRIMARY), header([['XTENSION', "'BINTABLE'"], ['BITPIX', 8], ['NAXIS', 2], ['NAXIS1', 2 ** 40], ['NAXIS2', 2 ** 40], ['PCOUNT', 0], ['GCOUNT', 1], ['TFIELDS', 1]]));
  assert.throws(() => readFitsBounded(hostile), FitsLimitError);
});

test('a BITPIX FITS does not define is refused', () => {
  const hostile = join(header([['SIMPLE', 'T'], ['BITPIX', 7], ['NAXIS', 0]]));
  assert.throws(() => readFitsBounded(hostile), FitsLimitError);
});

test('more header-and-data units than a light curve has is refused', () => {
  const many = join(header(PRIMARY), ...Array.from({ length: 20 }, () => header([['XTENSION', "'IMAGE'"], ['BITPIX', 8], ['NAXIS', 0], ['PCOUNT', 0], ['GCOUNT', 1]])));
  assert.throws(() => readFitsBounded(many), FitsLimitError);
});
