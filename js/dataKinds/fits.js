// =============================================================================
// A local two-dimensional FITS image, read within bounds or refused (Prompt 157)
// -----------------------------------------------------------------------------
// The reader for an image a person chose on their own device (D-ODP-05, reopened
// for local images only; FITS from the network stays refused, D-VO-04). It reads
// one thing: the first two-dimensional image in the file, BITPIX 8, 16, 32, -32
// or -64, with BSCALE, BZERO and BLANK applied, big-endian as FITS is, into a
// Float64 plane. A tangent-plane world coordinate system comes with it when the
// header has one. Everything else is refused with a code and a reason, and
// nothing in the header is believed before it is checked:
//
//   - the file's size, before a byte is read; the header's cards, 16 blocks at
//     most, each one printable ASCII; the structural cards as integer literals,
//     the scale and the world coordinates as finite numbers;
//   - the axes, as whole numbers, with the pixel count and the decoded bytes
//     checked against ./limits.js before the plane is allocated;
//   - a header and a data unit that run past the end of the file;
//   - the units before the image are walked only by their declared sizes, in
//     exact integers, so a table that claims 2^64 bytes is refused and never
//     stepped over.
//
// Refused by name: a cube (any other number of axes than two), a tile-compressed
// image, BITPIX 64, random groups, an extension type this reader does not know,
// a projection other than TAN, SIP and TPV distortion, a singular matrix. An
// infinite pixel is refused; NaN is a blank (a float image's own), and so is a
// pixel equal to BLANK. The reader stops after the image: later units are
// neither read nor validated.
//
// `isCancelled` is polled between rows, and a Worker is cancelled by terminating
// it (js/workers/pool.js), which no loop here has to answer.
// =============================================================================

import { DataKindError, LIMITS, checkFrame } from './limits.js';
import { wcsUnusable } from './contract.js';

const BLOCK = 2880;
const CARD = 80;
const SUPPORTED = new Set([8, 16, 32, -32, -64]);
const WALKABLE = new Set([8, 16, 32, 64, -32, -64]);
/** Cards that are read as values and must each appear once. */
const GUARDED =
  /^(SIMPLE|XTENSION|BITPIX|NAXIS\d*|PCOUNT|GCOUNT|BSCALE|BZERO|BLANK|CTYPE\d|CRPIX\d|CRVAL\d|CDELT\d|CROTA\d|CD\d_\d|PC\d_\d|LONPOLE|LATPOLE|WCSAXES|RADESYS|EQUINOX|ZIMAGE|GROUPS|EXTEND)$/;
const INT = /^[+-]?\d+$/;
const REAL = /^[+-]?(\d+\.?\d*|\.\d+)([EeDd][+-]?\d+)?$/;
const NONFINITE = /^[+-]?(nan|inf|infinity)$/i;
const fail = (code, message, detail) =>
  new DataKindError(code, message, detail);

/** The bytes of whatever was handed in, or a refusal. */
function bytesOf(source) {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (ArrayBuffer.isView(source))
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  throw fail(
    'not-fits',
    'expected the bytes of a file (an ArrayBuffer or a typed array)'
  );
}

/** One header: its cards, and where its data begins. Nothing in it is trusted yet. */
function readHeader(bytes, offset, index) {
  const cards = new Map();
  const order = [];
  const limit = LIMITS.maxHeaderBlocks * (BLOCK / CARD);
  for (let n = 0; ; n++) {
    const at = offset + n * CARD;
    if (at + CARD > bytes.length)
      throw fail(
        'truncated',
        `the header of unit ${index} ends at byte ${bytes.length} with no END card`
      );
    if (n >= limit)
      throw fail(
        'header-too-large',
        `the header of unit ${index} has no END card in its first ${LIMITS.maxHeaderBlocks} blocks (${limit} cards)`
      );
    for (let i = 0; i < CARD; i++) {
      const c = bytes[at + i];
      if (c < 0x20 || c > 0x7e)
        throw fail(
          'card-malformed',
          `card ${n + 1} of unit ${index} holds byte ${c} at column ${i + 1}, which is not printable ASCII`
        );
    }
    const text = String.fromCharCode.apply(null, bytes.subarray(at, at + CARD));
    const key = text.slice(0, 8).trimEnd();
    if (key === 'END' && text.slice(3).trim() === '') {
      return {
        cards,
        order,
        dataStart: offset + Math.ceil(((n + 1) * CARD) / BLOCK) * BLOCK,
      };
    }
    if (text.slice(8, 10) !== '= ') continue;
    if (!/^[A-Z0-9_-]+$/.test(key))
      throw fail(
        'card-malformed',
        `card ${n + 1} of unit ${index}: "${key}" is not a keyword`
      );
    if (GUARDED.test(key) && cards.has(key))
      throw fail(
        'duplicate-card',
        `${key} appears twice in the header of unit ${index}`
      );
    let rest = text.slice(10).trimStart();
    let value;
    if (rest.startsWith("'")) {
      let s = '';
      let i = 1;
      let closed = false;
      while (i < rest.length) {
        if (rest[i] === "'" && rest[i + 1] === "'") {
          s += "'";
          i += 2;
        } else if (rest[i] === "'") {
          closed = true;
          break;
        } else s += rest[i++];
      }
      if (!closed)
        throw fail(
          'card-malformed',
          `${key} in unit ${index} has a string with no closing quote`
        );
      value = { t: 's', v: s.trimEnd() };
    } else {
      const slash = rest.indexOf('/');
      if (slash >= 0) rest = rest.slice(0, slash);
      rest = rest.trim();
      if (rest === '') value = { t: 'e', v: '' };
      else if (rest === 'T' || rest === 'F')
        value = { t: 'l', v: rest === 'T' };
      else value = { t: 'n', v: rest };
    }
    cards.set(key, value);
    order.push(key);
  }
}

/** A structural card as an integer, or the reason it is not one. */
function integer(cards, key, index, { optional = false } = {}) {
  const c = cards.get(key);
  if (!c) {
    if (optional) return null;
    throw fail('missing-card', `unit ${index} has no ${key} card`);
  }
  if (c.t !== 'n' || !INT.test(c.v))
    throw fail(
      'card-malformed',
      `${key} in unit ${index} is not a whole number: ${shown(c)}`
    );
  const n = BigInt(c.v);
  if (
    n > BigInt(Number.MAX_SAFE_INTEGER) ||
    n < -BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw fail(
      'dimension-overflow',
      `${key} = ${c.v} in unit ${index} is more than a double holds exactly`
    );
  return Number(n);
}

function shown(c) {
  return c.t === 's' ? `'${c.v}'` : String(c.v);
}

/** A real-valued card, finite; or null when it is absent. */
function real(cards, key, index) {
  const c = cards.get(key);
  if (!c) return null;
  if (c.t === 'n' && NONFINITE.test(c.v))
    throw fail(
      'nonfinite-header',
      `${key} = ${c.v} in unit ${index} is not a finite number`
    );
  if (c.t !== 'n' || !REAL.test(c.v))
    throw fail(
      'card-malformed',
      `${key} in unit ${index} is not a number: ${shown(c)}`
    );
  const v = Number(c.v.replace(/[Dd]/, 'E'));
  if (!Number.isFinite(v))
    throw fail(
      'nonfinite-header',
      `${key} = ${c.v} in unit ${index} is not a finite number`
    );
  return v;
}

const text = (cards, key) =>
  cards.get(key)?.t === 's' ? cards.get(key).v : null;

/** What one unit is, and how long its data is, in exact integers. */
function describe(bytes, offset, index) {
  const { cards, dataStart } = readHeader(bytes, offset, index);
  const primary = index === 0;
  const first = primary ? cards.get('SIMPLE') : cards.get('XTENSION');
  if (primary && !(first?.t === 'l' && first.v === true))
    throw fail(
      'not-fits',
      'SIMPLE is not T: this file does not conform to FITS'
    );
  if (!primary && first?.t !== 's')
    throw fail(
      'hdu-unsupported',
      `the bytes after unit ${index - 1} are not an extension header`
    );
  const xtension = primary ? 'PRIMARY' : first.v.trim();
  const bitpix = integer(cards, 'BITPIX', index);
  const naxis = integer(cards, 'NAXIS', index);
  if (naxis < 0 || naxis > 999)
    throw fail(
      'axis-invalid',
      `NAXIS = ${naxis} in unit ${index}: FITS allows 0 to 999`
    );
  if (cards.get('GROUPS')?.v === true)
    throw fail(
      'hdu-unsupported',
      `unit ${index} is random groups, which this reader does not read`
    );
  const axes = [];
  for (let i = 1; i <= naxis; i++)
    axes.push(integer(cards, `NAXIS${i}`, index));
  for (let i = 0; i < axes.length; i++)
    if (axes[i] < 0)
      throw fail(
        'axis-invalid',
        `NAXIS${i + 1} = ${axes[i]} in unit ${index} is negative`
      );
  const pcount = primary
    ? 0
    : (integer(cards, 'PCOUNT', index, { optional: true }) ?? 0);
  const gcount = primary
    ? 1
    : (integer(cards, 'GCOUNT', index, { optional: true }) ?? 1);
  return {
    cards,
    dataStart,
    xtension,
    bitpix,
    naxis,
    axes,
    pcount,
    gcount,
    index,
  };
}

/** The bytes of a unit's data, as a BigInt: |BITPIX| / 8 * GCOUNT * (PCOUNT + product of axes). */
function dataLength(u) {
  if (!WALKABLE.has(u.bitpix))
    throw fail(
      'bitpix-unsupported',
      `BITPIX = ${u.bitpix} in unit ${u.index} is not a FITS pixel type`
    );
  let prod = u.naxis ? 1n : 0n;
  for (const a of u.axes) prod *= BigInt(a);
  return (
    (BigInt(Math.abs(u.bitpix)) / 8n) *
    BigInt(u.gcount) *
    (BigInt(u.pcount) + prod)
  );
}

/** The tangent-plane WCS of the header, or null when it states none. */
function worldCoordinates(cards, index) {
  const names = [...cards.keys()];
  const has = k => cards.has(k);
  const axesCard = cards.get('WCSAXES');
  if (axesCard && integer(cards, 'WCSAXES', index) !== 2)
    throw fail(
      'wcs-projection',
      `WCSAXES = ${axesCard.v}: only two world axes are read`
    );
  if (!has('CTYPE1') && !has('CTYPE2')) return null;
  const ct = [text(cards, 'CTYPE1'), text(cards, 'CTYPE2')];
  if (!ct[0] || !ct[1])
    throw fail(
      'wcs-incomplete',
      'the header names one celestial axis and not the other (CTYPE1, CTYPE2)'
    );
  const part = c => ({
    axis: c.slice(0, 5),
    proj: c.slice(5, 8),
    rest: c.slice(8),
  });
  const [a, b] = ct.map(part);
  if (a.axis !== 'RA---' || b.axis !== 'DEC--')
    throw fail(
      'wcs-projection',
      `${ct[0]} / ${ct[1]}: only right ascension and declination in TAN are read`
    );
  const sip = a.rest === '-SIP' || b.rest === '-SIP';
  const tpv = a.proj === 'TPV' || b.proj === 'TPV';
  if (sip || tpv)
    throw fail(
      'wcs-distortion',
      `${ct[0]} / ${ct[1]} carries a distortion (${sip ? 'SIP' : 'TPV'}) this reader does not apply`
    );
  if (a.proj !== 'TAN' || b.proj !== 'TAN' || a.rest !== '' || b.rest !== '')
    throw fail(
      'wcs-projection',
      `${ct[0]} / ${ct[1]}: the ${a.proj === 'TAN' ? b.proj : a.proj} projection is not read, only TAN`
    );
  const sipKey = names.find(k => /^(A|B|AP|BP)_(ORDER|\d+_\d+)$/.test(k));
  if (sipKey)
    throw fail(
      'wcs-distortion',
      `${sipKey} gives SIP distortion coefficients, which this reader does not apply`
    );
  const pvKey = names.find(k => /^PV\d+_\d+$/.test(k));
  if (pvKey)
    throw fail(
      'wcs-distortion',
      `${pvKey} gives a projection term; TAN with PV terms is a distortion this reader does not apply`
    );
  const need = (k, why = 'is missing') => {
    const v = real(cards, k, index);
    if (v === null)
      throw fail(
        'wcs-incomplete',
        `${k} ${why}, so the world coordinates cannot be used`
      );
    return v;
  };
  const crpix = [need('CRPIX1'), need('CRPIX2')];
  const crval = [need('CRVAL1'), need('CRVAL2')];
  if (Math.abs(crval[1]) > 90)
    throw fail('wcs-incomplete', `CRVAL2 = ${crval[1]} is not a declination`);
  const cdKeys = ['CD1_1', 'CD1_2', 'CD2_1', 'CD2_2'];
  const pcKeys = ['PC1_1', 'PC1_2', 'PC2_1', 'PC2_2'];
  const anyCd = cdKeys.some(has);
  const anyPc = pcKeys.some(has);
  const anyScale = has('CDELT1') || has('CDELT2');
  const rota = has('CROTA2');
  if (anyCd && (anyPc || anyScale || rota))
    throw fail(
      'wcs-ambiguous',
      'the header has a CD matrix and also PC, CDELT or CROTA2: FITS allows one form'
    );
  if (rota && anyPc)
    throw fail(
      'wcs-ambiguous',
      'the header has CROTA2 and a PC matrix: FITS allows one form'
    );
  let wcs;
  let m;
  if (anyCd) {
    if (!cdKeys.every(has))
      throw fail(
        'wcs-incomplete',
        'the CD matrix is not all four of CD1_1, CD1_2, CD2_1, CD2_2'
      );
    const cd = [
      [need('CD1_1'), need('CD1_2')],
      [need('CD2_1'), need('CD2_2')],
    ];
    wcs = { ctype: ct, crpix, crval, cd };
    m = cd;
  } else {
    if (!(has('CDELT1') && has('CDELT2')))
      throw fail(
        'wcs-incomplete',
        'the header has neither a CD matrix nor CDELT1 and CDELT2'
      );
    const cdelt = [need('CDELT1'), need('CDELT2')];
    let pc;
    if (rota) {
      const rho = (need('CROTA2') * Math.PI) / 180;
      pc = [
        [Math.cos(rho), -(cdelt[1] / cdelt[0]) * Math.sin(rho)],
        [(cdelt[0] / cdelt[1]) * Math.sin(rho), Math.cos(rho)],
      ];
    } else if (anyPc) {
      if (!pcKeys.every(has))
        throw fail(
          'wcs-incomplete',
          'the PC matrix is not all four of PC1_1, PC1_2, PC2_1, PC2_2'
        );
      pc = [
        [need('PC1_1'), need('PC1_2')],
        [need('PC2_1'), need('PC2_2')],
      ];
    } else
      pc = [
        [1, 0],
        [0, 1],
      ];
    wcs = { ctype: ct, crpix, crval, cdelt, pc };
    m = [
      [cdelt[0] * pc[0][0], cdelt[0] * pc[0][1]],
      [cdelt[1] * pc[1][0], cdelt[1] * pc[1][1]],
    ];
  }
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const size = Math.abs(m[0][0] * m[1][1]) + Math.abs(m[0][1] * m[1][0]);
  if (!(size > 0) || !(Math.abs(det) > 1e-9 * size))
    throw fail(
      'wcs-incomplete',
      'the transformation matrix is singular, so pixels do not map to the sky'
    );
  const radesys = text(cards, 'RADESYS');
  if (radesys) wcs.radesys = radesys;
  const why = wcsUnusable(wcs);
  if (why)
    throw fail(
      'wcs-incomplete',
      `the world coordinates cannot be used: ${why}`
    );
  return wcs;
}

/** What the header says about the frame, each with the card it came from. */
function claimsOf(cards) {
  const claims = {};
  const pick = (name, keys, kind) => {
    for (const key of keys) {
      const c = cards.get(key);
      if (!c) continue;
      if (kind === 'string' && c.t === 's')
        return void (claims[name] = { value: c.v, source: `header ${key}` });
      if (kind === 'number' && c.t === 'n' && REAL.test(c.v)) {
        const v = Number(c.v.replace(/[Dd]/, 'E'));
        if (Number.isFinite(v))
          return void (claims[name] = { value: v, source: `header ${key}` });
      }
    }
  };
  pick('gain', ['GAIN'], 'number');
  pick('readNoise', ['RDNOISE', 'READNOIS', 'RON'], 'number');
  pick('saturation', ['SATURATE', 'SATLEVEL'], 'number');
  pick('exposureSeconds', ['EXPTIME', 'EXPOSURE'], 'number');
  pick('dateObs', ['DATE-OBS'], 'string');
  pick('mjdObs', ['MJD-OBS'], 'number');
  pick('timeScale', ['TIMESYS'], 'string');
  pick('unit', ['BUNIT'], 'string');
  pick('object', ['OBJECT'], 'string');
  return claims;
}

/**
 * Find the image and check its header, without decoding a pixel.
 * @param {ArrayBuffer|ArrayBufferView} source - The whole file
 * @returns {{bytes: Uint8Array, hdu: number, width: number, height: number, bitpix: number,
 *   dataStart: number, fileBytes: number, decodedBytes: number, cards: Map, skipped: object[]}}
 * @throws {DataKindError}
 */
export function locateImage(source) {
  const bytes = bytesOf(source);
  if (bytes.length > LIMITS.maxFileBytes)
    throw fail(
      'file-too-large',
      `the file is ${bytes.length} bytes; the most a frame and its headers can take is ${LIMITS.maxFileBytes}`
    );
  const magic = 'SIMPLE  =';
  if (
    bytes.length < magic.length ||
    String.fromCharCode.apply(null, bytes.subarray(0, 9)) !== magic
  )
    throw fail(
      'not-fits',
      'this is not a FITS file: it does not begin with SIMPLE  ='
    );
  const skipped = [];
  let offset = 0;
  for (let index = 0; offset < bytes.length; index++) {
    if (index >= LIMITS.maxHdus)
      throw fail(
        'too-many-hdus',
        `no image in the first ${LIMITS.maxHdus} units of the file; the reader looks no further`
      );
    const u = describe(bytes, offset, index);
    if (u.cards.get('ZIMAGE')?.v === true)
      throw fail(
        'compressed',
        `unit ${index} is a tile-compressed image, which this reader does not read`
      );
    const image = u.xtension === 'PRIMARY' || u.xtension === 'IMAGE';
    if (image && u.naxis > 0) {
      if (u.naxis !== 2)
        throw fail(
          'axes-unsupported',
          `unit ${index} has ${u.naxis} axes; only two-dimensional images are read (a cube is not sliced)`
        );
      const [width, height] = u.axes;
      if (width < 1 || height < 1)
        throw fail(
          'axis-invalid',
          `unit ${index} has an axis of ${width < 1 ? width : height} pixels`
        );
      if (!SUPPORTED.has(u.bitpix))
        throw fail(
          'bitpix-unsupported',
          `BITPIX = ${u.bitpix} in unit ${index}: only 8, 16, 32, -32 and -64 are read`
        );
      const frame = checkFrame(width, height);
      if (!frame.ok) throw fail(frame.code, frame.message);
      const length = (Math.abs(u.bitpix) / 8) * width * height;
      if (u.dataStart + length > bytes.length)
        throw fail(
          'truncated',
          `the ${width} by ${height} image needs ${length} bytes from byte ${u.dataStart} and the file has ${bytes.length - u.dataStart}`
        );
      return {
        bytes,
        hdu: index,
        width,
        height,
        bitpix: u.bitpix,
        dataStart: u.dataStart,
        fileBytes: bytes.length,
        decodedBytes: frame.bytes,
        cards: u.cards,
        skipped,
      };
    }
    // Not the image: walk past it by its declared size, in exact integers.
    if (!image && u.xtension !== 'BINTABLE' && u.xtension !== 'TABLE')
      throw fail(
        'hdu-unsupported',
        `unit ${index} is an extension of type ${u.xtension}, which this reader does not know`
      );
    const length = dataLength(u);
    if (length > BigInt(Number.MAX_SAFE_INTEGER))
      throw fail(
        'dimension-overflow',
        `unit ${index} declares a data unit of ${length} bytes, more than a double holds`
      );
    if (BigInt(u.dataStart) + length > BigInt(bytes.length))
      throw fail(
        'truncated',
        `unit ${index} declares ${length} bytes of data from byte ${u.dataStart} and the file ends at ${bytes.length}`
      );
    skipped.push({
      hdu: index,
      kind: image ? 'empty' : u.xtension.toLowerCase(),
    });
    offset = u.dataStart + Math.ceil(Number(length) / BLOCK) * BLOCK;
  }
  throw fail(
    'no-image',
    `the file holds no two-dimensional image (${skipped.map(s => `unit ${s.hdu}: ${s.kind}`).join(', ') || 'no units'})`
  );
}

/**
 * Read the image: decoded to Float64, scaled, with its world coordinates and
 * the claims its header makes.
 *
 * @param {ArrayBuffer|ArrayBufferView} source - The whole file
 * @param {object} [hooks]
 * @param {() => boolean} [hooks.isCancelled] - Polled between rows
 * @param {(fraction: number) => void} [hooks.onProgress]
 * @returns {{width: number, height: number, values: Float64Array, bitpix: number,
 *   bscale: number, bzero: number, blank: number|null, nanPixels: number, hdu: number,
 *   wcs: object|null, claims: object, header: object, skipped: object[], decodedBytes: number}}
 * @throws {DataKindError} with a `code` for every refusal, `canceled` included
 */
export function readFits(source, { isCancelled, onProgress } = {}) {
  const found = locateImage(source);
  const { bytes, cards, width, height, bitpix, dataStart, hdu } = found;
  const index = hdu;
  const bscale = real(cards, 'BSCALE', index) ?? 1;
  const bzero = real(cards, 'BZERO', index) ?? 0;
  if (bscale === 0)
    throw fail(
      'scale-invalid',
      'BSCALE = 0 would make every pixel the same value'
    );
  let blank = null;
  if (cards.has('BLANK')) {
    if (bitpix < 0)
      throw fail(
        'blank-invalid',
        'BLANK is for integer images; a floating-point image marks a blank with NaN'
      );
    blank = integer(cards, 'BLANK', index);
    const lo = bitpix === 8 ? 0 : -(2 ** (bitpix - 1));
    const hi = bitpix === 8 ? 255 : 2 ** (bitpix - 1) - 1;
    if (blank < lo || blank > hi)
      throw fail(
        'blank-invalid',
        `BLANK = ${blank} is outside what BITPIX ${bitpix} can store (${lo} to ${hi})`
      );
  }
  const wcs = worldCoordinates(cards, index);
  const size = Math.abs(bitpix) / 8;
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + dataStart,
    width * height * size
  );
  // Allocated only now, after every header check and the bounds.
  const values = new Float64Array(width * height);
  const plain = bscale === 1 && bzero === 0;
  let nanPixels = 0;
  for (let y = 0; y < height; y++) {
    if (y % 64 === 0) {
      if (isCancelled?.()) throw fail('canceled', 'the read was canceled');
      onProgress?.(y / height);
    }
    let o = y * width * size;
    let i = y * width;
    for (let x = 0; x < width; x++, o += size, i++) {
      let v;
      if (bitpix === 16) v = view.getInt16(o, false);
      else if (bitpix === 8) v = view.getUint8(o);
      else if (bitpix === 32) v = view.getInt32(o, false);
      else if (bitpix === -32) v = view.getFloat32(o, false);
      else v = view.getFloat64(o, false);
      if (bitpix < 0) {
        if (v !== v) {
          nanPixels++;
          values[i] = NaN;
          continue;
        }
        if (v === Infinity || v === -Infinity)
          throw fail(
            'nonfinite-pixel',
            `pixel (${x + 1}, ${y + 1}) is infinite; a blank is NaN and nothing in an image is infinite`
          );
      } else if (blank !== null && v === blank) {
        nanPixels++;
        values[i] = NaN;
        continue;
      }
      values[i] = plain ? v : v * bscale + bzero;
    }
  }
  onProgress?.(1);
  const header = {};
  for (const [key, c] of cards)
    if (!GUARDED.test(key))
      header[key] =
        c.t === 'n' && REAL.test(c.v) ? Number(c.v.replace(/[Dd]/, 'E')) : c.v;
  return {
    width,
    height,
    values,
    bitpix,
    bscale,
    bzero,
    blank,
    nanPixels,
    hdu,
    wcs,
    claims: claimsOf(cards),
    header,
    skipped: found.skipped,
    decodedBytes: found.decodedBytes,
  };
}
