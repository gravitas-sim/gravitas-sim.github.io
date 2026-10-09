// =============================================================================
// A QR code, made here
// -----------------------------------------------------------------------------
// The distribution kit (INSTRUCTOR_FLOW.md) prints a student link as a QR code,
// and nothing about a link leaves the browser to do it: this is the whole
// encoder, byte mode only, versions 1 to 40, error correction L or M. Byte mode
// is the one a URL needs, and one mode with two levels is a few kilobytes
// instead of a library.
//
// It follows ISO/IEC 18004 and the layout described by Project Nayuki's public
// QR Code generator (which this is not a copy of): function patterns, then the
// data and Reed-Solomon codewords interleaved by block, then the one of eight
// masks with the lowest penalty. tests/qrCode.test.js reads a matrix back with
// a decoder written separately and checks every codeword against the code's
// own check symbols; a link that cannot be encoded says so, and the kit shows
// the link without a code.
//
// No DOM, no storage, no network.
// =============================================================================

/** Error-correction codewords per block, then blocks, for versions 1 to 40. */
const LEVELS = {
  L: {
    bits: 1,
    ecc: [
      7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
      28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
      30, 30, 30,
    ],
    blocks: [
      1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
      12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
    ],
  },
  M: {
    bits: 0,
    ecc: [
      10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26,
      26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
      28, 28, 28, 28,
    ],
    blocks: [
      1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17,
      18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
    ],
  },
};

export const MAX_VERSION = 40;

/** Modules available to data and check symbols at a version. */
const rawModules = v => {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2;
    n -= (25 * a - 10) * a - 55;
    if (v >= 7) n -= 36;
  }
  return n;
};

/** Data codewords at a version and level. */
export const dataCodewords = (v, level) =>
  Math.floor(rawModules(v) / 8) -
  LEVELS[level].ecc[v - 1] * LEVELS[level].blocks[v - 1];

/** The most bytes a version and level hold. */
export const byteCapacity = (v, level) =>
  dataCodewords(v, level) - 2 - (v < 10 ? 0 : 1);

// GF(256), x^8 + x^4 + x^3 + x^2 + 1
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x > 255) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** The check symbols of a block: the remainder of data * x^n by the generator. */
function remainder(data, n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    g.forEach((c, j) => {
      next[j] ^= c;
      next[j + 1] ^= mul(c, EXP[i]);
    });
    g = next;
  }
  const out = new Array(n).fill(0);
  for (const byte of data) {
    const lead = byte ^ out.shift();
    out.push(0);
    if (lead) for (let i = 0; i < n; i++) out[i] ^= mul(g[i + 1], lead);
  }
  return out;
}

const alignments = v => {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let p = v * 4 + 17 - 7; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
};

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The data and check codewords, interleaved, for a message. */
function codewords(bytes, v, level) {
  const total = dataCodewords(v, level);
  const bits = [];
  const put = (value, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < total; pad ^= 0xec ^ 0x11) data.push(pad);

  const { ecc, blocks } = LEVELS[level];
  const n = blocks[v - 1];
  const e = ecc[v - 1];
  const raw = Math.floor(rawModules(v) / 8);
  const short = n - (raw % n);
  const shortLen = Math.floor(raw / n);
  const parts = [];
  for (let i = 0, k = 0; i < n; i++) {
    const len = shortLen - e + (i < short ? 0 : 1);
    const block = data.slice(k, k + len);
    k += len;
    parts.push({ block, check: remainder(block, e) });
  }
  const out = [];
  const longest = shortLen - e + 1;
  for (let i = 0; i < longest; i++)
    for (const { block } of parts) if (i < block.length) out.push(block[i]);
  for (let i = 0; i < e; i++) for (const { check } of parts) out.push(check[i]);
  return out;
}

const bit = (value, i) => ((value >>> i) & 1) === 1;

/**
 * The 15 format bits: the level, the mask and their BCH check, masked.
 * @param {string} level - 'L' or 'M'
 * @param {number} mask - 0 to 7
 * @returns {number} The 15-bit value
 */
export function formatBits(level, mask) {
  const data = (LEVELS[level].bits << 3) | mask;
  let r = data;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((data << 10) | r) ^ 0x5412;
}

/** The penalty of a finished matrix, by the four rules of the standard. */
function penalty(m) {
  const size = m.length;
  let score = 0;
  let dark = 0;
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(m[i].map(Number).join(''));
    lines.push(m.map(row => Number(row[i])).join(''));
    for (let j = 0; j < size; j++) {
      if (m[i][j]) dark++;
      if (
        i < size - 1 &&
        j < size - 1 &&
        m[i][j] === m[i + 1][j] &&
        m[i][j] === m[i][j + 1] &&
        m[i][j] === m[i + 1][j + 1]
      )
        score += 3;
    }
  }
  for (const line of lines) {
    for (const run of line.match(/0{5,}|1{5,}/g) || []) score += run.length - 2;
    for (const re of [/(?=10111010000)/g, /(?=00001011101)/g])
      score += 40 * (line.match(re) || []).length;
  }
  const total = size * size;
  return score + 10 * (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1);
}

/**
 * Encode text.
 *
 * Level M is used when the text fits it and L when only that fits, so a short
 * link is the more forgiving code and a long one still has one.
 *
 * @param {string} text - What the code holds, as UTF-8
 * @param {object} [options] - Options
 * @param {'L'|'M'} [options.level] - Force a level
 * @returns {?{version: number, level: string, size: number, mask: number,
 *   modules: boolean[][]}} The code, or null when the text is too long
 */
export function qrCode(text, { level } = {}) {
  const bytes = [...new TextEncoder().encode(String(text))];
  const order = level ? [level] : ['M', 'L'];
  let v = 0;
  let lvl = null;
  for (const l of order) {
    for (let k = 1; k <= MAX_VERSION && !v; k++)
      if (bytes.length <= byteCapacity(k, l)) {
        v = k;
        lvl = l;
      }
    if (v) break;
  }
  if (!v) return null;

  const size = v * 4 + 17;
  const grid = () =>
    Array.from({ length: size }, () => Array(size).fill(false));
  const base = grid();
  const fn = grid();
  const set = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    base[y][x] = dark;
    fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
  const a = alignments(v);
  a.forEach((x, i) =>
    a.forEach((y, j) => {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === a.length - 1) ||
        (i === a.length - 1 && j === 0)
      )
        return;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    })
  );
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const bits = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const dark = bit(bits, i);
      const p = size - 11 + (i % 3);
      const q = Math.floor(i / 3);
      set(p, q, dark);
      set(q, p, dark);
    }
  }
  const formats = mask => {
    const f = formatBits(lvl, mask);
    for (let i = 0; i < 6; i++) set(8, i, bit(f, i));
    set(8, 7, bit(f, 6));
    set(8, 8, bit(f, 7));
    set(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(f, i));
    set(8, size - 8, true);
  };
  formats(0);

  const data = codewords(bytes, v, lvl);
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fn[y][x] && k < data.length * 8) {
          base[y][x] = bit(data[k >>> 3], 7 - (k & 7));
          k++;
        }
      }
  }

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    formats(mask);
    const m = base.map((row, y) =>
      row.map((d, x) => (fn[y][x] ? d : d !== MASKS[mask](x, y)))
    );
    const score = penalty(m);
    if (!best || score < best.score) best = { score, mask, modules: m };
  }
  return {
    version: v,
    level: lvl,
    size,
    mask: best.mask,
    modules: best.modules,
  };
}

/**
 * A code as an SVG with the four-module quiet zone the standard asks for.
 *
 * Dark modules are one path, a rectangle per run in a row, so a large code is
 * a few kilobytes of markup and prints sharp at any size.
 *
 * @param {{size: number, modules: boolean[][]}} code - From qrCode()
 * @param {object} [options] - Options
 * @param {string} [options.label] - Accessible name
 * @returns {string} SVG markup
 */
export function qrSvg(code, { label = '' } = {}) {
  const q = 4;
  let d = '';
  code.modules.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      if (!row[x]) {
        x++;
        continue;
      }
      let run = 0;
      while (row[x + run]) run++;
      d += `M${x + q} ${y + q}h${run}v1h-${run}z`;
      x += run;
    }
  });
  const n = code.size + 2 * q;
  const esc = String(label).replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" ` +
    `role="img" aria-label="${esc}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`
  );
}
