// =============================================================================
// The FITS the data-pack tools read, and nothing more
// -----------------------------------------------------------------------------
// FITS is 2880-byte blocks. Each header is 80-character cards ending in END;
// each data unit follows its header, padded to a block. A light curve's first
// extension is a BINTABLE: NAXIS1 bytes per row, NAXIS2 rows, TFIELDS columns
// described by TTYPEn / TFORMn / TUNITn, big-endian, with TSCALn and TZEROn
// turning a stored integer into the value it means (TZERO = 2^31 on a J column
// is how FITS writes an unsigned 32-bit integer).
//
// This reads headers; the scalar binary-table columns of the types a light
// curve uses: L, B, I, J, K, E, D; and two-dimensional images, with BSCALE
// and BZERO applied, which is what a light curve's aperture mask is. Anything
// else in a file it is asked to read - an image of more than two axes, a
// tile-compressed table, a variable-length array, an ASCII table, a column with
// a repeat count - is listed in `unread` rather than guessed at, and a column
// the caller asks for by name that is not readable is an error. The observation data-pack gate measured it at 1.5 KB and 11 ms on a
// 2 MB SPOC light curve; OBSERVATION_DATA_PACK_GATE.md has the numbers, and
// why FITS stays a developer-tool format until a browser reader has earned it.
// =============================================================================

const BLOCK = 2880;
const CARD = 80;

/** Read one header starting at `offset`. */
function readHeader(bytes, offset) {
  const cards = {};
  let at = offset;
  for (;;) {
    if (at + CARD > bytes.length) {
      throw new Error(`FITS header at byte ${offset} has no END card`);
    }
    const card = String.fromCharCode(...bytes.subarray(at, at + CARD));
    at += CARD;
    const key = card.slice(0, 8).trim();
    if (key === 'END') break;
    if (card.slice(8, 10) !== '= ') continue; // COMMENT, HISTORY, blank
    const text = card.slice(10).trimStart();
    let value;
    if (text.startsWith("'")) {
      // A quoted string; '' inside it is one quote.
      let end = 1;
      let s = '';
      while (end < text.length) {
        if (text[end] === "'" && text[end + 1] === "'") {
          s += "'";
          end += 2;
        } else if (text[end] === "'") break;
        else s += text[end++];
      }
      value = s.trimEnd();
    } else {
      const raw = text.split('/')[0].trim();
      if (raw === 'T' || raw === 'F') value = raw === 'T';
      else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
      else value = raw;
    }
    cards[key] = value;
  }
  return { cards, dataStart: Math.ceil(at / BLOCK) * BLOCK };
}

/** Bytes per element and a big-endian reader, by TFORM letter. */
const TYPES = {
  L: [1, (v, o) => v.getUint8(o) === 84], // 'T'
  B: [1, (v, o) => v.getUint8(o)],
  I: [2, (v, o) => v.getInt16(o, false)],
  J: [4, (v, o) => v.getInt32(o, false)],
  K: [8, (v, o) => Number(v.getBigInt64(o, false))],
  E: [4, (v, o) => v.getFloat32(o, false)],
  D: [8, (v, o) => v.getFloat64(o, false)],
};
/** Every TFORM letter's element size, readable or not, to step past it. */
const SIZES = {
  ...Object.fromEntries(Object.entries(TYPES).map(([k, [s]]) => [k, s])),
  A: 1,
  X: 1 / 8,
  C: 8,
  M: 16,
  P: 8,
  Q: 16,
};

/** The columns of one BINTABLE, and the ones it will not read. */
function readTable(bytes, cards, dataStart) {
  const rowBytes = cards.NAXIS1;
  const rows = cards.NAXIS2;
  if (dataStart + rowBytes * rows > bytes.length) {
    throw new Error('FITS table runs past the end of the file');
  }
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + dataStart,
    rowBytes * rows
  );
  const columns = {};
  const unread = [];
  let offset = 0;
  for (let c = 1; c <= cards.TFIELDS; c++) {
    const form = String(cards[`TFORM${c}`] || '');
    const m = /^(\d*)([A-Z])/.exec(form);
    if (!m)
      throw new Error(`TFORM${c} "${form}" is not a FITS binary-table format`);
    const repeat = m[1] === '' ? 1 : Number(m[1]);
    const letter = m[2];
    const name = cards[`TTYPE${c}`] || `COL${c}`;
    const size = SIZES[letter];
    if (size === undefined)
      throw new Error(`TFORM${c} "${form}": unknown type ${letter}`);
    const reader = TYPES[letter];
    if (reader && repeat === 1) {
      const read = reader[1];
      const scale = cards[`TSCAL${c}`] ?? 1;
      const zero = cards[`TZERO${c}`] ?? 0;
      const values = new Array(rows);
      for (let r = 0; r < rows; r++) {
        const v = read(view, r * rowBytes + offset);
        values[r] =
          typeof v === 'number' && (scale !== 1 || zero !== 0)
            ? zero + scale * v
            : v;
      }
      columns[name] = { values, unit: cards[`TUNIT${c}`] ?? null, form };
    } else {
      unread.push({ name, form });
    }
    offset += Math.ceil(size * repeat);
  }
  if (offset !== rowBytes) {
    throw new Error(
      `the columns take ${offset} bytes of a ${rowBytes}-byte row`
    );
  }
  return { columns, unread };
}

/** How each BITPIX is stored, big-endian. */
const PIXEL = {
  8: { bytes: 1, get: (v, o) => v.getUint8(o), array: Uint8Array },
  16: { bytes: 2, get: (v, o) => v.getInt16(o), array: Int16Array },
  32: { bytes: 4, get: (v, o) => v.getInt32(o), array: Int32Array },
  '-32': { bytes: 4, get: (v, o) => v.getFloat32(o), array: Float32Array },
  '-64': { bytes: 8, get: (v, o) => v.getFloat64(o), array: Float64Array },
};

/**
 * A two-dimensional image: NAXIS1 pixels a row, NAXIS2 rows, the first row
 * the lowest in FITS's convention. Stored integers come back as the integer
 * array of their type unless BSCALE or BZERO turns them into something else,
 * in which case they come back as numbers.
 */
function readImage(bytes, cards, dataStart) {
  const kind = PIXEL[cards.BITPIX];
  const width = cards.NAXIS1;
  const height = cards.NAXIS2;
  if (!kind) throw new Error(`BITPIX ${cards.BITPIX} is not a FITS pixel type`);
  const n = width * height;
  if (dataStart + n * kind.bytes > bytes.length) {
    throw new Error(
      `the ${width} x ${height} image runs past the end of the file`
    );
  }
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + dataStart,
    n * kind.bytes
  );
  const scale = cards.BSCALE ?? 1;
  const zero = cards.BZERO ?? 0;
  const plain = scale === 1 && zero === 0;
  const values = plain ? new kind.array(n) : new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = kind.get(view, i * kind.bytes);
    values[i] = plain ? v : v * scale + zero;
  }
  return { image: { width, height, values } };
}

/**
 * Every header-and-data unit in the file, with binary tables decoded.
 * @param {Uint8Array} bytes - The whole file
 * @returns {Array<{cards: object, columns?: object, image?: object,
 *   unread?: object[]}>}
 */
export function readFits(bytes) {
  if (String.fromCharCode(...bytes.subarray(0, 9)) !== 'SIMPLE  =') {
    throw new Error('not a FITS file: it does not start with SIMPLE');
  }
  const units = [];
  let offset = 0;
  while (offset < bytes.length) {
    const { cards, dataStart } = readHeader(bytes, offset);
    const axes = Array.from(
      { length: cards.NAXIS || 0 },
      (_, i) => cards[`NAXIS${i + 1}`]
    );
    const bits = Math.abs(cards.BITPIX || 8);
    const dataBytes = axes.length
      ? (axes.reduce((a, b) => a * b, 1) * bits) / 8 + (cards.PCOUNT || 0)
      : 0;
    const unit = { cards };
    if (cards.XTENSION === 'BINTABLE') {
      if (cards.ZIMAGE || cards.ZTABLE)
        unit.unread = [{ name: '(tile-compressed)', form: '' }];
      else Object.assign(unit, readTable(bytes, cards, dataStart));
    } else if (axes.length === 2) {
      Object.assign(unit, readImage(bytes, cards, dataStart));
    } else if (axes.length > 2) {
      unit.unread = [{ name: '(image)', form: `${axes.length} axes` }];
    }
    units.push(unit);
    offset = dataStart + Math.ceil(dataBytes / BLOCK) * BLOCK;
  }
  return units;
}

/**
 * The named columns of one extension, or an error naming the first missing.
 * @param {object} unit - One entry of readFits()
 * @param {string[]} names - Columns the caller needs
 */
export function requireColumns(unit, names) {
  for (const name of names) {
    if (!unit.columns?.[name]) {
      const why = unit.unread?.find(u => u.name === name);
      throw new Error(
        `column ${name} ${why ? `is ${why.form}, which this reader does not read` : 'is not in the table'}`
      );
    }
  }
  return Object.fromEntries(names.map(n => [n, unit.columns[n]]));
}
