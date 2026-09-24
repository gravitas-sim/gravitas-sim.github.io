// Spike: the smallest FITS reader that reads a TESS light curve.
//
// FITS is 2880-byte blocks. Each header is 80-character cards ending in END;
// each data unit follows its header, padded to a block. A light curve's first
// extension is a BINTABLE: NAXIS1 bytes per row, NAXIS2 rows, TFIELDS columns
// described by TTYPEn / TFORMn / TUNITn, all big-endian. This reads headers,
// and binary-table columns of the scalar types a light curve uses. It does not
// read images, compressed tiles, variable-length arrays or ASCII tables -
// which is the measured point: that much is enough for a light curve, and a
// general FITS library is not needed for one.

const BLOCK = 2880;
const CARD = 80;

/** Read one header starting at `offset`. */
function readHeader(bytes, offset) {
  const cards = {};
  const order = [];
  let at = offset;
  for (;;) {
    if (at + CARD > bytes.length) throw new Error('FITS header runs past the file');
    const card = String.fromCharCode(...bytes.subarray(at, at + CARD));
    at += CARD;
    const key = card.slice(0, 8).trim();
    if (key === 'END') break;
    if (card[8] !== '=') continue; // COMMENT, HISTORY, blank
    let raw = card.slice(10);
    let value;
    const text = raw.trimStart();
    if (text.startsWith("'")) {
      const end = text.indexOf("'", 1);
      value = text.slice(1, end).trimEnd();
    } else {
      raw = text.split('/')[0].trim();
      if (raw === 'T' || raw === 'F') value = raw === 'T';
      else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
      else value = raw;
    }
    cards[key] = value;
    order.push(key);
  }
  const dataStart = Math.ceil(at / BLOCK) * BLOCK;
  return { cards, order, dataStart };
}

const TYPES = {
  L: [1, (v, o) => v.getUint8(o) === 84], // 'T'
  B: [1, (v, o) => v.getUint8(o)],
  I: [2, (v, o) => v.getInt16(o, false)],
  J: [4, (v, o) => v.getInt32(o, false)],
  K: [8, (v, o) => Number(v.getBigInt64(o, false))],
  E: [4, (v, o) => v.getFloat32(o, false)],
  D: [8, (v, o) => v.getFloat64(o, false)],
};

/**
 * Every header-and-data unit in the file, with binary tables decoded.
 * @param {Uint8Array} bytes - The whole file
 * @returns {Array<{cards: Object, columns?: Object}>}
 */
export function readFits(bytes) {
  const units = [];
  let offset = 0;
  while (offset < bytes.length) {
    const { cards, dataStart } = readHeader(bytes, offset);
    const axes = Array.from({ length: cards.NAXIS || 0 }, (_, i) => cards[`NAXIS${i + 1}`]);
    const bits = Math.abs(cards.BITPIX || 8);
    const dataBytes = axes.length ? (axes.reduce((a, b) => a * b, 1) * bits) / 8 + (cards.PCOUNT || 0) : 0;
    const unit = { cards };
    if (cards.XTENSION === 'BINTABLE') {
      const view = new DataView(bytes.buffer, bytes.byteOffset + dataStart, cards.NAXIS1 * cards.NAXIS2);
      const columns = {};
      let rowOffset = 0;
      for (let c = 1; c <= cards.TFIELDS; c++) {
        const form = String(cards[`TFORM${c}`]);
        const m = /^(\d*)([A-Z])/.exec(form);
        const repeat = m[1] === '' ? 1 : Number(m[1]);
        const [size, read] = TYPES[m[2]] || [];
        const name = cards[`TTYPE${c}`] || `COL${c}`;
        if (read && repeat === 1) {
          const out = new Array(cards.NAXIS2);
          for (let r = 0; r < cards.NAXIS2; r++) out[r] = read(view, r * cards.NAXIS1 + rowOffset);
          columns[name] = { values: out, unit: cards[`TUNIT${c}`] ?? null, form };
        }
        const width = m[2] === 'A' ? repeat : (size || 0) * repeat;
        rowOffset += width;
      }
      unit.columns = columns;
    }
    units.push(unit);
    offset = dataStart + Math.ceil(dataBytes / BLOCK) * BLOCK;
  }
  return units;
}
