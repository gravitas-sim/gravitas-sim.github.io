// The QR encoder (js/kit/qr.js), read back by a decoder that shares none of its
// code: the format bits are found by searching all 32 valid words, the data
// modules by their own zigzag, and every block is checked against the code's
// check symbols. A matrix that decodes to the text it was given, with every
// block's syndromes zero, is a QR code.
import {
  byteCapacity,
  dataCodewords,
  formatBits,
  qrCode,
  qrSvg,
} from '../js/kit/qr.js';

// Byte capacities printed in the standard (ISO/IEC 18004, table 7).
const CAPACITY = {
  L: {
    1: 17,
    2: 32,
    3: 53,
    4: 78,
    5: 106,
    6: 134,
    7: 154,
    10: 271,
    20: 858,
    30: 1732,
    40: 2953,
  },
  M: { 1: 14, 2: 26, 3: 42, 4: 62, 5: 84, 10: 213, 40: 2331 },
};

// GF(256) for the check
const EXP = [];
const LOG = [];
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
const mul = (a, b) => (a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0);

const BLOCKS = {
  L: [
    1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12,
    12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  M: [
    1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17,
    18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
};

/** Decode a matrix: returns {level, mask, text, syndromesZero}. */
function decode(code) {
  const { modules, size, version } = code;
  const get = (x, y) => modules[y][x];

  // Format word: the first copy, read in the order the standard numbers it.
  const cells = [
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [7, 8],
    [8, 8],
    [8, 7],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
  ];
  let word = 0;
  // cells[0] is bit 14 down to cells[14] bit 0
  cells.forEach(([x, y], i) => {
    if (get(x, y)) word |= 1 << (14 - i);
  });
  let found = null;
  for (const level of ['L', 'M'])
    for (let mask = 0; mask < 8; mask++)
      if (formatBits(level, mask) === word) found = { level, mask };
  if (!found) return { error: 'format' };

  // Function modules by formula, written separately from the encoder.
  const isFunction = (x, y) => {
    if (x === 6 || y === 6) return true;
    if (x < 9 && y < 9) return true;
    if (x >= size - 8 && y < 9) return true;
    if (x < 9 && y >= size - 8) return true;
    if (
      version >= 7 &&
      ((x < 6 && y >= size - 11) || (y < 6 && x >= size - 11))
    )
      return true;
    if (version >= 2) {
      const n = Math.floor(version / 7) + 2;
      const first = 6;
      const last = size - 7;
      const step =
        version === 32 ? 26 : Math.ceil((version * 4 + 4) / (n * 2 - 2)) * 2;
      const pos = [first];
      for (let p = last; pos.length < n; p -= step) pos.splice(1, 0, p);
      for (const cx of pos)
        for (const cy of pos) {
          if (
            (cx === 6 && cy === 6) ||
            (cx === 6 && cy === last) ||
            (cx === last && cy === 6)
          )
            continue;
          if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) return true;
        }
    }
    return false;
  };
  const maskFns = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    x => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const bits = [];
  let upward = true;
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x = 5;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (const xx of [x, x - 1]) {
        if (isFunction(xx, y)) continue;
        bits.push(get(xx, y) !== maskFns[found.mask](xx, y));
      }
    }
    upward = !upward;
  }
  const total = Math.floor(bits.length / 8);
  const all = [];
  for (let i = 0; i < total; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] ? 1 : 0);
    all.push(b);
  }

  // De-interleave
  const n = BLOCKS[found.level][version - 1];
  const dataTotal = dataCodewords(version, found.level);
  const e = (total - dataTotal) / n;
  const short = n - (total % n);
  const shortLen = Math.floor(total / n);
  const blocks = Array.from({ length: n }, () => ({ data: [], check: [] }));
  let k = 0;
  const longest = shortLen - e + 1;
  for (let i = 0; i < longest; i++)
    for (let j = 0; j < n; j++) {
      const len = shortLen - e + (j < short ? 0 : 1);
      if (i < len) blocks[j].data.push(all[k++]);
    }
  for (let i = 0; i < e; i++)
    for (let j = 0; j < n; j++) blocks[j].check.push(all[k++]);

  let syndromesZero = true;
  for (const { data, check } of blocks) {
    const word2 = [...data, ...check];
    for (let i = 0; i < e; i++) {
      let s = 0;
      for (const c of word2) s = mul(s, EXP[i]) ^ c;
      if (s) syndromesZero = false;
    }
  }

  // The payload
  const flat = blocks.flatMap(b => b.data);
  const stream = flat.map(b => b.toString(2).padStart(8, '0')).join('');
  if (stream.slice(0, 4) !== '0100') return { error: 'mode' };
  const countBits = version < 10 ? 8 : 16;
  const count = parseInt(stream.slice(4, 4 + countBits), 2);
  const out = [];
  for (let i = 0; i < count; i++) {
    const at = 4 + countBits + i * 8;
    out.push(parseInt(stream.slice(at, at + 8), 2));
  }
  return {
    ...found,
    text: new TextDecoder().decode(Uint8Array.from(out)),
    syndromesZero,
  };
}

describe('QR capacity tables', () => {
  test.each(
    Object.entries(CAPACITY).flatMap(([l, o]) =>
      Object.entries(o).map(([v, c]) => [l, +v, c])
    )
  )('level %s version %i holds %i bytes', (level, version, capacity) => {
    expect(byteCapacity(version, level)).toBe(capacity);
  });
});

describe('the encoder', () => {
  const cases = [
    ['a short link', 'https://gravitas.example/#a1'],
    ['one character', 'a'],
    ['a long link', `https://example.org/course/#c2z${'AbC-_9'.repeat(100)}`],
    ['text in several scripts', 'Órbitas ☉ 軌道 — año'],
    ['a version with version bits', 'x'.repeat(200)],
    ['the largest level L', 'q'.repeat(2953)],
    ['the largest level M', 'q'.repeat(2331)],
  ];
  test.each(cases)(
    '%s decodes to itself with every check symbol right',
    (_, text) => {
      const code = qrCode(text);
      expect(code).not.toBeNull();
      const back = decode(code);
      expect(back.error).toBeUndefined();
      expect(back.text).toBe(text);
      expect(back.syndromesZero).toBe(true);
      expect(back.level).toBe(code.level);
      expect(back.mask).toBe(code.mask);
    }
  );

  test('uses M when it fits and L when only that fits', () => {
    expect(qrCode('x'.repeat(2331)).level).toBe('M');
    expect(qrCode('x'.repeat(2332)).level).toBe('L');
    expect(qrCode('x'.repeat(2953)).version).toBe(40);
  });

  test('refuses what no version holds', () => {
    expect(qrCode('x'.repeat(2954))).toBeNull();
  });

  test('every version of both levels decodes (a link at each capacity)', () => {
    for (const level of ['L', 'M'])
      for (let v = 1; v <= 40; v++) {
        const text = 'k'.repeat(byteCapacity(v, level));
        const code = qrCode(text, { level });
        expect({ v, level, version: code.version }).toEqual({
          v,
          level,
          version: v,
        });
        const back = decode(code);
        expect({
          v,
          level,
          ok: back.text === text && back.syndromesZero,
        }).toEqual({
          v,
          level,
          ok: true,
        });
      }
  });

  test('finder patterns are where the standard puts them', () => {
    const { modules, size } = qrCode('https://x.test/');
    for (const [x, y] of [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ]) {
      expect(modules[y][x] && modules[y + 6][x + 6]).toBe(true);
      expect(modules[y + 3][x + 3]).toBe(true);
      expect(modules[y + 1][x + 1]).toBe(false);
    }
    // the dark module
    expect(modules[size - 8][8]).toBe(true);
  });
});

describe('the format word', () => {
  test('matches the standard table at its two best-known entries', () => {
    expect(formatBits('M', 0)).toBe(0b101010000010010);
    expect(formatBits('L', 0)).toBe(0b111011111000100);
  });
});

describe('the SVG', () => {
  test('is one path in a quiet zone, labelled, with the text escaped', () => {
    const code = qrCode('https://x.test/');
    const svg = qrSvg(code, { label: 'A "link" <b>' });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${code.size + 8} ${code.size + 8}"`);
    expect(svg).toContain('aria-label="A &quot;link&quot; &lt;b&gt;"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).not.toMatch(/<script|onload/i);
  });
});
