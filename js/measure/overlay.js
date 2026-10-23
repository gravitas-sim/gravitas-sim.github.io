// =============================================================================
// Catalogue overlays, blink and compare (Prompt 182, OVERLAYS.md)
// -----------------------------------------------------------------------------
// What sits on top of Prompt 181's sky coordinates and registration: which
// catalogue stars and planets fall in a frame and where, at the frame's time; how
// well the fitted coordinates predict a star's pixel; how a second frame is
// carried onto the first (through the sky, through matched stars, or not at
// all); when the two may be subtracted; and the blink's schedule. Pure: no DOM,
// no clock, no network. Imports the astrometry kernel and the sky kernel's
// planets and time, nothing that pulls an interface catalogue.
//
// Rules fixed before any measurement (tests/fixtures/overlay/thresholds.json):
//   - an entry is listed only when its pixel is inside the frame: nothing outside
//     it is given a position; at most 500 are listed, the brightest first
//   - stars are the pack's J2000.0 positions moved by linear proper motion (as
//     js/kernels/sky/stars.js does; a test holds the two equal); with no usable
//     time they are not moved, and say so; planets need a time
//   - the difference of two frames is a picture for the eye: bilinear, never a
//     measurement; it is refused unless both frames are quantitative with one
//     calibration state, one unit and (in a count unit) one exposure
// =============================================================================

import {
  applyRegistration,
  fromHeader,
  invertRegistration,
  pixelOf,
  skyOf,
  tangentOf,
} from './astrometry.js';
import { tdbMinusTt, ttFromUt } from '../kernels/sky/time.js';
import {
  geocentricEquatorial,
  planetProvenance,
} from '../kernels/sky/planets.js';

const { Math, Number } = globalThis;
const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
const J2000 = 2451545.0;
const MJD_JD = 2400000.5;
const DAY = 86400;
const finite = Number.isFinite;

/** The rules fixed in advance (tests hold them equal to thresholds.json). */
export const RULES = Object.freeze({
  maxEntries: 500,
  magnitudeLimitDefault: 4.5,
  planets: Object.freeze(['mercury', 'venus', 'mars', 'jupiter', 'saturn']),
  blinkRatesPerSecond: Object.freeze([0.5, 1, 2, 4]),
  blinkRateDefault: 1,
  differenceNeedsResidentFrames: 4,
});
/** Decoded-memory bound of js/dataKinds/limits.js, written out (a test holds the two equal): this chunk shares no module with the marks instrument. */
export const RESIDENT = Object.freeze({ maxBytes: 67108864, bytesPerPixel: 8 });
/** The codes a difference is refused with. */
export const DIFFERENCE_REFUSALS = Object.freeze([
  'display-only',
  'incomplete-contract',
  'not-flux',
  'calibration-state',
  'unit',
  'exposure',
  'shape',
  'too-large',
  'registration',
]);
const COUNT_UNITS = ['adu', 'electron', 'count', 'photon'];

const no = (code, message, data = {}) => ({ ok: false, code, message, data });

// ---- the sky coordinates a frame has ------------------------------------------------

/**
 * Which sky coordinates the overlay uses, or why there are none: the calibration
 * the reader solved first, else the image's own header. A frame whose sidecar is
 * display-only, or whose pixels were moved without the coordinates following,
 * refuses whatever else is on offer.
 * @param {{sidecar?: object, header?: object|null, solved?: object|null,
 *   permits: Function}} a - `header` is the image's own WCS as it stands, `solved`
 *   a calibration's WCS; `permits` is js/dataKinds/contract.js's, lent
 * @returns {{ok: true, wcs: object, source: 'calibration'|'header'}|{ok: false, code: string, message: string, data: object}}
 */
export function skyFor({ sidecar, header, solved, permits }) {
  if (sidecar) {
    const p = permits(sidecar, 'astrometry');
    if (!p.ok && ['display-only', 'geometry-unrecorded'].includes(p.code))
      return no(p.code, p.message);
  }
  if (solved) return { ok: true, wcs: solved, source: 'calibration' };
  const h = fromHeader(header);
  return h.ok ? { ok: true, wcs: h.wcs, source: 'header' } : h;
}

// ---- time -------------------------------------------------------------------------

/**
 * A frame's time as a TT Julian date.
 * @param {{value: *, scale?: string, format?: string, reference?: string}|null} time
 * @param {number} [exposureSeconds] - Moves a start or an end time to the middle
 * @returns {{ok: true, jdTt: number, scale: string}|{ok: false, code: string, message: string}}
 */
export function toTt(time, exposureSeconds) {
  if (!time || time.value === undefined || time.value === null)
    return no('no-time', 'the frame has no time');
  const scale = String(time.scale ?? '');
  if (!scale) return no('no-time', 'the frame’s time has no scale');
  const format = time.format ?? 'mjd';
  let jd;
  if (format === 'iso') {
    const s = String(time.value);
    jd =
      Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}Z`) / 86400000 +
      2440587.5;
  } else if (format === 'jd') jd = Number(time.value);
  else if (format === 'mjd') jd = Number(time.value) + MJD_JD;
  else jd = NaN;
  if (!finite(jd)) return no('time', 'the frame’s time cannot be read');
  if (finite(exposureSeconds) && exposureSeconds > 0) {
    if (time.reference === 'start') jd += exposureSeconds / 2 / DAY;
    else if (time.reference === 'end') jd -= exposureSeconds / 2 / DAY;
  }
  let jdTt;
  if (scale === 'UTC' || scale === 'UT1') jdTt = ttFromUt(jd);
  else if (scale === 'TAI') jdTt = jd + 32.184 / DAY;
  else if (scale === 'TT') jdTt = jd;
  else if (scale === 'TDB') jdTt = jd - tdbMinusTt(jd) / DAY;
  else
    return no(
      'time-scale',
      `the time scale ${scale} cannot be moved to Terrestrial Time here`,
      { scale }
    );
  return { ok: true, jdTt, scale };
}

// ---- catalogue stars ----------------------------------------------------------------

/**
 * A star of the bright-star pack from its row, in the fields this module uses.
 * @param {Array} r - [hr, ra, dec, v, bv, pmra, pmde, desig, name, sp, tcol] as the sidecar has them
 */
export const starOfRow = r => ({
  hr: r[0],
  raDeg: r[1] / 1e4,
  decDeg: r[2] / 1e4,
  v: r[3] / 100,
  pmRaArcsecYr: r[5] / 1000,
  pmDecArcsecYr: r[6] / 1000,
  desig: r[7] || '',
  name: r[8] || '',
});

/**
 * A star's J2000 position moved to a TT Julian date by linear proper motion in
 * the unit vector, as js/kernels/sky/stars.js starAtEpoch (held equal by a test).
 * @param {{raDeg: number, decDeg: number, pmRaArcsecYr: number, pmDecArcsecYr: number}} s
 * @returns {{ra: number, dec: number}} degrees
 */
export function moveStar(s, jdTt) {
  const a = s.raDeg * DEG;
  const d = s.decDeg * DEG;
  const yr = (jdTt - J2000) / 365.25;
  const vx = [-Math.sin(a), Math.cos(a), 0];
  const vy = [
    -Math.sin(d) * Math.cos(a),
    -Math.sin(d) * Math.sin(a),
    Math.cos(d),
  ];
  const p = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const v = [0, 1, 2].map(
    i => (s.pmRaArcsecYr * vx[i] + s.pmDecArcsecYr * vy[i]) * ARCSEC
  );
  const x = p[0] + v[0] * yr;
  const y = p[1] + v[1] * yr;
  const z = p[2] + v[2] * yr;
  const n = Math.hypot(x, y, z);
  return {
    ra: (((Math.atan2(y, x) / DEG) % 360) + 360) % 360,
    dec: Math.asin(z / n) / DEG,
  };
}

const inside = (p, w, h) =>
  Boolean(p) && p.x >= 0.5 && p.x <= w + 0.5 && p.y >= 0.5 && p.y <= h + 0.5;

/**
 * The catalogue stars in a frame, at a time.
 * @param {object[]} stars - From starOfRow (or the same fields)
 * @param {object} wcs - {crpix, crval, cd}
 * @param {{width: number, height: number}} size
 * @param {{jdTt?: number|null, magnitude?: number, limit?: number}} [opts] -
 *   `jdTt` null or missing leaves the stars at J2000.0
 * @returns {{entries: object[], leftOut: number, moved: boolean, magnitude: number}}
 */
export function starsIn(stars, wcs, size, opts = {}) {
  const magnitude = opts.magnitude ?? RULES.magnitudeLimitDefault;
  const limit = opts.limit ?? RULES.maxEntries;
  const moved = finite(opts.jdTt);
  const found = [];
  for (const s of stars) {
    if (!(s.v <= magnitude)) continue;
    const at = moved ? moveStar(s, opts.jdTt) : { ra: s.raDeg, dec: s.decDeg };
    const p = pixelOf(wcs, at.ra, at.dec);
    if (!inside(p, size.width, size.height)) continue;
    found.push({
      kind: 'star',
      id: `hr${s.hr}`,
      hr: s.hr,
      name: s.name || s.desig || `HR ${s.hr}`,
      mag: s.v,
      ra: at.ra,
      dec: at.dec,
      x: p.x,
      y: p.y,
    });
  }
  found.sort((a, b) => a.mag - b.mag || a.hr - b.hr);
  return {
    entries: found.slice(0, limit),
    leftOut: Math.max(0, found.length - limit),
    moved,
    magnitude,
  };
}

// ---- planets ------------------------------------------------------------------------

/**
 * The planets in a frame at a TT Julian date, each with the bound of its
 * position. A planet outside the frame is not given a pixel; one whose bound
 * reaches the frame is named in `reach` with how far outside its predicted
 * position is.
 * @returns {{entries: object[], reach: object[]}}
 */
export function planetsIn(wcs, size, jdTt) {
  const scale = Math.sqrt(
    Math.abs(wcs.cd[0][0] * wcs.cd[1][1] - wcs.cd[0][1] * wcs.cd[1][0])
  );
  const entries = [];
  const reach = [];
  for (const id of RULES.planets) {
    const g = geocentricEquatorial(id, jdTt);
    const bound = planetProvenance(null, id, jdTt).boundDeg;
    const p = pixelOf(wcs, g.raDeg, g.decDeg);
    if (!p) continue;
    const boundPix = bound / scale;
    if (inside(p, size.width, size.height)) {
      entries.push({
        kind: 'planet',
        id,
        name: id,
        ra: g.raDeg,
        dec: g.decDeg,
        x: p.x,
        y: p.y,
        distanceAu: g.distanceAu,
        boundDeg: bound,
        boundPix,
      });
      continue;
    }
    const dx = Math.max(0.5 - p.x, 0, p.x - (size.width + 0.5));
    const dy = Math.max(0.5 - p.y, 0, p.y - (size.height + 0.5));
    const away = Math.hypot(dx, dy);
    if (away <= boundPix)
      reach.push({ id, name: id, awayPix: away, boundDeg: bound, boundPix });
  }
  return { entries, reach };
}

// ---- how well the sky coordinates predict a pixel -----------------------------------

/**
 * The uncertainty of the pixel a fitted WCS gives an exactly known sky position:
 * the covariance of its six numbers (pixel = p0 + P (xi, eta)) carried to that
 * position. Pixels.
 * @param {{params: number[], covariance: number[][], tangent: number[]}} fit
 * @returns {{sx: number, sy: number, covariance: number[][]}|null} null behind the tangent plane
 */
export function predictionSigma(fit, ra, dec) {
  const t = tangentOf(fit.tangent, ra, dec);
  if (!t) return null;
  const J = [
    [1, 0, t.xi, t.eta, 0, 0],
    [0, 1, 0, 0, t.xi, t.eta],
  ];
  const C = [0, 1].map(i =>
    [0, 1].map(j => {
      let v = 0;
      for (let a = 0; a < 6; a++)
        for (let b = 0; b < 6; b++)
          v += J[i][a] * fit.covariance[a][b] * J[j][b];
      return v;
    })
  );
  return {
    sx: Math.sqrt(Math.max(0, C[0][0])),
    sy: Math.sqrt(Math.max(0, C[1][1])),
    covariance: C,
  };
}

// ---- two frames --------------------------------------------------------------------

/**
 * The map between two frames' pixels.
 * @param {{kind: 'sky', first: object, second: object}
 *   |{kind: 'pairs', registration: object}|{kind: 'identity'}} how - `first` and
 *   `second` are WCS ({crpix, crval, cd}); `registration` is
 *   astrometry.register's answer, which carries the first frame onto the second
 * @returns {{kind: string, toSecond: Function, toFirst: Function}}
 */
export function tieOf(how) {
  if (how.kind === 'sky') {
    const through = (from, to) => (x, y) => {
      const s = skyOf(from, x, y);
      const p = pixelOf(to, s.ra, s.dec);
      return p ? [p.x, p.y] : null;
    };
    return {
      kind: 'sky',
      toSecond: through(how.first, how.second),
      toFirst: through(how.second, how.first),
    };
  }
  if (how.kind === 'pairs')
    return {
      kind: 'pairs',
      registration: how.registration,
      toSecond: (x, y) => applyRegistration(how.registration, x, y),
      toFirst: (x, y) => invertRegistration(how.registration, x, y),
    };
  return {
    kind: 'identity',
    toSecond: (x, y) => [x, y],
    toFirst: (x, y) => [x, y],
  };
}

/**
 * The second frame carried onto the first frame's grid: bilinear. An output pixel
 * is NaN where its position in the second frame is outside it, or where a
 * neighbour that carries weight is NaN; a position on a pixel's centre needs
 * that pixel alone.
 * @param {{width: number, height: number, data: ArrayLike<number>}} second
 * @param {{width: number, height: number}} size - The first frame's
 * @param {{toSecond: Function}} tie
 * @returns {Float64Array} row by row, row 1 first, as every frame in this code
 */
export function carry(second, size, tie) {
  const { width: W, height: H } = size;
  const { width: w, height: h, data } = second;
  const out = new Float64Array(W * H).fill(NaN);
  for (let y = 1; y <= H; y++)
    for (let x = 1; x <= W; x++) {
      const m = tie.toSecond(x, y);
      if (!m) continue;
      const [bx, by] = m;
      if (!(bx >= 1 && bx <= w && by >= 1 && by <= h)) continue;
      const ix = Math.min(Math.floor(bx), w);
      const iy = Math.min(Math.floor(by), h);
      const fx = bx - ix;
      const fy = by - iy;
      let v = 0;
      let ok = true;
      for (let j = 0; j < 2 && ok; j++) {
        const wy = j ? fy : 1 - fy;
        if (wy === 0) continue;
        for (let i = 0; i < 2; i++) {
          const wx = i ? fx : 1 - fx;
          if (wx === 0) continue;
          const px = ix + i;
          const py = iy + j;
          if (px > w || py > h) {
            ok = false;
            break;
          }
          const q = data[(py - 1) * w + (px - 1)];
          if (!(q === q)) {
            ok = false;
            break;
          }
          v += wx * wy * q;
        }
      }
      if (ok) out[(y - 1) * W + (x - 1)] = v;
    }
  return out;
}

/** The carried second frame less the first, NaN where either is. */
export function subtract(first, carried) {
  const out = new Float64Array(first.length);
  for (let i = 0; i < out.length; i++) out[i] = carried[i] - first[i];
  return out;
}

/**
 * Whether two frames may be subtracted, and if not, why (a code from
 * DIFFERENCE_REFUSALS and a reason). The checks run in that order.
 * @param {{width: number, height: number, sidecar?: object}} a - the first frame
 * @param {{width: number, height: number, sidecar?: object}} b - the second frame
 * @param {{permits: Function, tie?: object}} how - `permits` is
 *   js/dataKinds/contract.js's, lent (this chunk shares no module with it);
 *   `tie` is tieOf's answer, its registration carrying a verdict when it has one
 */
export function differenceVerdict(a, b, { permits, tie }) {
  for (const [name, f] of [
    ['first', a],
    ['second', b],
  ]) {
    if (!f.sidecar)
      return no(
        'incomplete-contract',
        `The ${name} frame states no pixel contract, so its pixels are not known to measure light.`,
        { which: name, missing: [], reason: 'none' }
      );
    const p = permits(f.sidecar, 'photometry');
    if (!p.ok) {
      const code = ['display-only', 'not-flux'].includes(p.code)
        ? p.code
        : 'incomplete-contract';
      return no(code, `The ${name} frame: ${p.message}`, {
        which: name,
        missing: p.missing ?? [],
        reason: p.code,
      });
    }
  }
  const sa = a.sidecar;
  const sb = b.sidecar;
  if (sa.calibration?.state !== sb.calibration?.state)
    return no(
      'calibration-state',
      `The frames are at different stages of calibration (${sa.calibration?.state} and ${sb.calibration?.state}), so their difference would be the calibration and not the sky.`,
      { first: sa.calibration?.state, second: sb.calibration?.state }
    );
  if (sa.pixels.unit !== sb.pixels.unit)
    return no(
      'unit',
      `The frames' pixels are in different units (${sa.pixels.unit} and ${sb.pixels.unit}).`,
      {
        first: sa.pixels.unit,
        second: sb.pixels.unit,
      }
    );
  const ea = sa.exposure?.seconds;
  const eb = sb.exposure?.seconds;
  if (
    COUNT_UNITS.includes(sa.pixels.unit) &&
    !(Math.abs(ea - eb) <= 1e-9 * Math.max(ea, eb))
  )
    return no(
      'exposure',
      `The frames are in a count unit (${sa.pixels.unit}) with different exposures (${ea} s and ${eb} s), so their difference would be the exposure and not the sky.`,
      { first: ea, second: eb }
    );
  if (
    tie?.kind === 'identity' &&
    (a.width !== b.width || a.height !== b.height)
  )
    return no(
      'shape',
      `The frames are ${a.width} by ${a.height} and ${b.width} by ${b.height} pixels, so the same pixels are not the same places.`,
      {
        first: `${a.width} by ${a.height}`,
        second: `${b.width} by ${b.height}`,
      }
    );
  const bytes =
    RESIDENT.bytesPerPixel * (3 * a.width * a.height + b.width * b.height);
  if (bytes > RESIDENT.maxBytes)
    return no(
      'too-large',
      `The difference holds four pictures of ${a.width} by ${a.height} pixels, more than the ${RESIDENT.maxBytes} decoded bytes a page may hold.`,
      { bytes, max: RESIDENT.maxBytes }
    );
  if (tie?.registration && tie.registration.verdict === 'inconsistent')
    return no(
      'registration',
      'The matched stars do not agree with one rotation and shift, so the frames are not known to be aligned.',
      {}
    );
  return { ok: true };
}

// ---- the blink --------------------------------------------------------------------

/**
 * How the blink runs: a timer at a chosen rate, or by hand.
 * @param {number} rate - frames a second, one of RULES.blinkRatesPerSecond
 * @param {{reducedMotion?: boolean}} [opts]
 * @returns {{ok: true, mode: 'timer', intervalMs: number}|{ok: true, mode: 'manual'}|{ok: false, code: string, message: string}}
 */
export function blinkPlan(rate, { reducedMotion = false } = {}) {
  if (!RULES.blinkRatesPerSecond.includes(rate))
    return no(
      'rate',
      `${rate} a second is not one of ${RULES.blinkRatesPerSecond.join(', ')}`
    );
  if (reducedMotion) return { ok: true, mode: 'manual' };
  return { ok: true, mode: 'timer', intervalMs: 1000 / rate };
}
