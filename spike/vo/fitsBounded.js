// =============================================================================
// SPIKE (Prompt 18): the checks a FITS file from the network needs first
// -----------------------------------------------------------------------------
// tools/data-packs/fits.mjs reads files a maintainer downloaded and checked.
// A file a reader's browser fetched is another matter: its header is the
// attacker's, and the reader trusts three numbers before it checks them.
//
//   NAXIS    becomes an array length: NAXIS = 2e9 asks for two billion slots
//            from a 2880-byte file. The standard caps it at 999.
//   NAXISn   multiplied together become a byte count; the reader compares it
//            with the file only after the product, which can pass 2^53.
//   BITPIX   must be one of six values.
//
// This walks every header first, with nothing but those checks, and refuses
// a file before the reader allocates anything. The production prompt moves
// these checks into fits.mjs itself (VO_ARCHIVE_GATE.md, "FITS").
// =============================================================================

import { readFits } from '../../tools/data-packs/fits.mjs';

const BLOCK = 2880;
const CARD = 80;
const BITPIX = new Set([8, 16, 32, 64, -32, -64]);

export class FitsLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FitsLimitError';
    this.code = 'fitsLimit';
  }
}

function headerInts(bytes, offset) {
  const out = {};
  let at = offset;
  for (let n = 0; ; n++) {
    if (at + CARD > bytes.length) throw new FitsLimitError(`the header at byte ${offset} has no END`);
    if (n > 36 * 100) throw new FitsLimitError('a header of more than 100 blocks');
    const card = String.fromCharCode(...bytes.subarray(at, at + CARD));
    at += CARD;
    const key = card.slice(0, 8).trim();
    if (key === 'END') break;
    if (/^(NAXIS\d*|BITPIX|PCOUNT|GCOUNT|TFIELDS)$/.test(key) && card.slice(8, 10) === '= ') {
      const v = Number(card.slice(10).split('/')[0].trim());
      if (!Number.isSafeInteger(v)) throw new FitsLimitError(`${key} is not an integer`);
      out[key] = v;
    }
  }
  return { cards: out, dataStart: Math.ceil(at / BLOCK) * BLOCK };
}

/**
 * readFits, after every header has passed the limits.
 * @param {Uint8Array} bytes
 * @param {{maxUnits?: number}} [opts]
 */
export function readFitsBounded(bytes, { maxUnits = 16 } = {}) {
  let offset = 0;
  let units = 0;
  while (offset < bytes.length) {
    if (++units > maxUnits) throw new FitsLimitError(`more than ${maxUnits} header-and-data units`);
    const { cards, dataStart } = headerInts(bytes, offset);
    const naxis = cards.NAXIS ?? 0;
    if (naxis < 0 || naxis > 999) throw new FitsLimitError(`NAXIS = ${naxis}; FITS allows 0 to 999`);
    if (!BITPIX.has(cards.BITPIX)) throw new FitsLimitError(`BITPIX = ${cards.BITPIX}`);
    if (cards.TFIELDS !== undefined && (cards.TFIELDS < 0 || cards.TFIELDS > 999))
      throw new FitsLimitError(`TFIELDS = ${cards.TFIELDS}; FITS allows 0 to 999`);
    let size = naxis ? Math.abs(cards.BITPIX) / 8 : 0;
    for (let i = 1; i <= naxis; i++) {
      const n = cards[`NAXIS${i}`];
      if (!(n >= 0)) throw new FitsLimitError(`NAXIS${i} is missing or negative`);
      size *= n;
      if (size > bytes.length) throw new FitsLimitError(`the data unit claims more bytes than the file has`);
    }
    size += Math.max(0, cards.PCOUNT ?? 0);
    if (dataStart + size > bytes.length) throw new FitsLimitError('the data unit runs past the end of the file');
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
  }
  return readFits(bytes);
}
