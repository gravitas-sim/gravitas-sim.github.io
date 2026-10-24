// =============================================================================
// Astrometric time series: motion and well-sampled parallax (Prompt 186, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// The positions of one source at several epochs, fitted over time. Three tools,
// each with what it may and may not say:
//
//   twoEpochShift   the displacement between two epochs and its uncertainty,
//                   always labelled "shift under a fixed-motion assumption; not a
//                   parallax": two epochs cannot tell motion from parallax
//   fitMotion       a proper motion linear in time (4 parameters, residual table)
//   fitJoint        proper motion and parallax together, permitted only when the
//                   epochs sample the parallactic ellipse (8 epochs, 0.9 year, 3 of
//                   the 4 sectors of the Earth's orbit), else "not constrained" and
//                   why; the parallax is RELATIVE to the reference frame of the
//                   positions and every distance carries that statement and an
//                   interval
//
// Standard (tangent-plane) coordinates xi east and eta north, arcseconds, about a
// reference direction; weighted linear least squares with the stated independent
// per-axis uncertainties; no distortion, no aberration, no light deflection, no
// orbital motion and no relativistic term. The Earth's position is a provider
// (`createEarth`) so this module imports no ephemeris and a test can give it a
// circular orbit. Pure: no DOM, no clock, no network.
//
// A refusal is { ok: false, status: 'not-constrained', code, message, data }:
// the code and the English message are the kernel's; `data` is what a page needs
// to say it in another language.
// =============================================================================

import { fixed } from '../format.js';
import { invertSpd } from '../numeric/linalg.js';
import { chi2Survival } from './astrometry.js';
import { profileInterval, METHODS } from '../kernels/statistics/intervals.js';

const { Math, Number } = globalThis;
const RAD = Math.PI / 180;
const ARCSEC = RAD / 3600;
const YEAR = 365.25;
const finite = Number.isFinite;

export const VERSION = 1;
export const STEP = 'image-series';
export const FIT_KINDS = Object.freeze([
  'two-epoch-shift',
  'proper-motion',
  'parallax-and-proper-motion',
]);

/** The rules fixed before any measurement (tests hold them equal to thresholds.json). */
export const RULES = Object.freeze({
  properMotionMinEpochs: 2,
  minSpanDays: 1,
  checkNeeds: 3,
  jointMinEpochs: 8,
  jointMinSpanYears: 0.9,
  jointMinQuadrants: 3,
  consistentPValue: 0.001,
  maxOffsetArcsec: 3600,
  maxEpochs: 2000,
  levels: Object.freeze([0.6827, 0.95]),
  lowSignificance: 5,
});
/** The label every two-epoch shift carries. */
export const SHIFT_LABEL =
  'shift under a fixed-motion assumption; not a parallax';

const OBLIQUITY = 23.439291111 * RAD;
const AU_KM = 149597870.7;
/** The first JD (UTC) at which TAI - UTC = 37 s holds: 2017-01-01. */
const JD_UTC_37 = 2457754.5;
export const TT_MINUS_UTC = 69.184;

/** A refusal: the code and the English message are the kernel's; `data` is what a page needs to say it in another language. */
const refuse = (code, message, data = {}) => ({
  ok: false,
  status: 'not-constrained',
  code,
  message,
  data,
});

// ---- time ---------------------------------------------------------------------------

/** TDB - TT in seconds (the two largest terms of Fairhead and Bretagnon; at most 1.7 ms). */
export function tdbMinusTt(jdTt) {
  const g = (357.53 + 0.98560028 * (jdTt - 2451545.0)) * RAD;
  return 0.001657 * Math.sin(g) + 0.000014 * Math.sin(2 * g);
}

/** The offset in seconds from a scale to TDB at a Julian date given in that scale. */
export function offsetToTdb(jd, scale) {
  if (scale === 'tdb') return 0;
  const tt = scale === 'tt' ? jd : jd + TT_MINUS_UTC / 86400;
  const base = scale === 'tt' ? 0 : TT_MINUS_UTC;
  return base + tdbMinusTt(tt);
}

/** A number a record holds, or the digits of one a header kept as text. */
const recordNumber = v => (typeof v === 'string' ? Number(v) : v);

/**
 * An epoch as a TDB Julian date.
 * @param {{value: number, format?: string, scale?: string}} time - format jd or mjd, scale utc, tt or tdb (any case)
 * @param {{utcBefore2017?: 'refuse'|'keep'}} [opts] - UTC before 2017 needs leap seconds the module does not hold: refused, or kept as given (a proper motion needs no more)
 */
export function epochJd(time, { utcBefore2017 = 'refuse' } = {}) {
  const format = String(time?.format ?? 'jd').toLowerCase();
  const scale = String(time?.scale ?? '').toLowerCase();
  if (!['jd', 'mjd'].includes(format) || !finite(recordNumber(time?.value)))
    return refuse(
      'bad-epoch',
      'an epoch needs a number and a format, jd or mjd',
      {
        format: time?.format ?? null,
      }
    );
  if (!['utc', 'tt', 'tdb'].includes(scale))
    return refuse('bad-epoch', 'an epoch needs a time scale: utc, tt or tdb', {
      scale: time?.scale ?? null,
    });
  const jd = recordNumber(time.value) + (format === 'mjd' ? 2400000.5 : 0);
  if (scale === 'utc' && jd < JD_UTC_37) {
    if (utcBefore2017 === 'keep') return { ok: true, jd, format, scale };
    return refuse(
      'utc-before-2017',
      'UTC before 2017-01-01 needs leap seconds this tool does not hold: give the epoch in TT or TDB',
      { jd }
    );
  }
  return { ok: true, jd: jd + offsetToTdb(jd, scale) / 86400, format, scale };
}

// ---- the Earth ----------------------------------------------------------------------

/**
 * Ratios of the Sun's mass to each planet system's (the DE440 values, Park et al.
 * 2021): the Sun's offset from the barycentre is the mass-weighted mean of the
 * planets' heliocentric positions.
 */
export const MASS_RATIOS = Object.freeze({
  venus: 408523.72,
  earth: 328900.56,
  mars: 3098703.59,
  jupiter: 1047.348625,
  saturn: 3497.901768,
  uranus: 22902.944,
  neptune: 19412.237,
});

const PACK_BODIES = ['venus', 'earth', 'mars', 'jupiter'];
const OUTER = ['saturn', 'uranus', 'neptune'];

/**
 * The Earth's geocentre relative to the solar-system barycentre, au, in the
 * equatorial frame, at a TDB Julian date. The Earth, Venus, Mars and the Jupiter
 * system come from an ephemeris (`stateAt(id, jd)` -> km, heliocentric, ecliptic of
 * J2000: js/mission/ephemeris.js over the repository's pack); Saturn, Uranus and
 * Neptune from `heliocentric(body, jd)` -> au (the sky kernel's elements) if given.
 * Mercury (1.7e-7 of the Sun's mass) is left out; the sum of what is left out is
 * below 2e-5 au (ASTROMETRY.md).
 * @param {{ephemeris: {range: {startJd, stopJd}, stateAt: Function}, heliocentric?: Function}} sources
 */
export function createEarth({ ephemeris, heliocentric = null }) {
  const { startJd, stopJd } = ephemeris.range;
  const ce = Math.cos(OBLIQUITY);
  const se = Math.sin(OBLIQUITY);
  return {
    id: 'ephemeris-pack-barycentric',
    range: { startJd, stopJd },
    outer: Boolean(heliocentric),
    /** [X, Y, Z] in au, equatorial, barycentric. */
    at(jd) {
      const helio = ephemeris.stateAt('earth', jd).r.map(v => v / AU_KM);
      const sum = [0, 0, 0];
      let mass = 0;
      const add = (r, ratio) => {
        for (let k = 0; k < 3; k++) sum[k] += r[k] / ratio;
        mass += 1 / ratio;
      };
      for (const b of PACK_BODIES)
        add(
          b === 'earth'
            ? helio
            : ephemeris.stateAt(b, jd).r.map(v => v / AU_KM),
          MASS_RATIOS[b]
        );
      if (heliocentric)
        for (const b of OUTER) add(heliocentric(b, jd), MASS_RATIOS[b]);
      // The barycentre lies at sum / (1 + mass) from the Sun; the Earth from it:
      const e = [0, 1, 2].map(k => helio[k] - sum[k] / (1 + mass));
      return [e[0], e[1] * ce - e[2] * se, e[1] * se + e[2] * ce];
    },
  };
}

/** The parallax factors (arcsec of shift per arcsec of parallax) at a direction, from the Earth's barycentric position in au. */
export function parallaxFactors(earth, raDeg, decDeg) {
  const a = raDeg * RAD;
  const d = decDeg * RAD;
  const [X, Y, Z] = earth;
  return {
    x: X * Math.sin(a) - Y * Math.cos(a),
    y:
      X * Math.cos(a) * Math.sin(d) +
      Y * Math.sin(a) * Math.sin(d) -
      Z * Math.cos(d),
  };
}

/** The Earth's heliocentric-like ecliptic longitude in degrees from its equatorial position (the sector of its orbit). */
const eclipticLongitude = ([X, Y, Z]) => {
  const ce = Math.cos(OBLIQUITY);
  const se = Math.sin(OBLIQUITY);
  return (((Math.atan2(Y * ce + Z * se, X) / RAD) % 360) + 360) % 360;
};

// ---- the series -------------------------------------------------------------------------

const unitOf = (ra, dec) => [
  Math.cos(dec * RAD) * Math.cos(ra * RAD),
  Math.cos(dec * RAD) * Math.sin(ra * RAD),
  Math.sin(dec * RAD),
];

function tangentPoint(epochs) {
  const m = [0, 0, 0];
  for (const e of epochs) {
    const u = unitOf(e.ra, e.dec);
    for (let k = 0; k < 3; k++) m[k] += u[k];
  }
  const n = Math.hypot(...m);
  if (!(n > 0)) return null;
  return [
    (((Math.atan2(m[1], m[0]) / RAD) % 360) + 360) % 360,
    Math.asin(m[2] / n) / RAD,
  ];
}

/** Standard coordinates of a position about a tangent point, arcsec, or null behind the plane. */
export function standard(t, ra, dec) {
  const a0 = t[0] * RAD;
  const d0 = t[1] * RAD;
  const a = ra * RAD;
  const d = dec * RAD;
  const c =
    Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  if (!(c > 0)) return null;
  return {
    x: (Math.cos(d) * Math.sin(a - a0)) / c / ARCSEC,
    y:
      (Math.cos(d0) * Math.sin(d) -
        Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) /
      c /
      ARCSEC,
  };
}

/** The sky position of standard coordinates (arcsec) about a tangent point: degrees. */
export function unstandard(t, x, y) {
  const a0 = t[0] * RAD;
  const d0 = t[1] * RAD;
  const xi = x * ARCSEC;
  const eta = y * ARCSEC;
  const denom = Math.cos(d0) - eta * Math.sin(d0);
  return {
    ra: ((((a0 + Math.atan2(xi, denom)) / RAD) % 360) + 360) % 360,
    dec:
      Math.atan2(Math.sin(d0) + eta * Math.cos(d0), Math.hypot(xi, denom)) /
      RAD,
  };
}

/**
 * A series, checked and put in order: epochs as TDB Julian dates, positions in
 * standard coordinates, sigmas per axis. Refuses what it cannot fit.
 * @param {{epochs: object[], reference?: object}} series - each epoch {time: {value, format, scale}, ra, dec, sigma: number | [sx, sy]} (degrees; arcseconds on the sky)
 * @param {{tangent?: number[], utcBefore2017?: string}} [opts]
 */
export function prepare(series, opts = {}) {
  const list = series?.epochs;
  if (!Array.isArray(list) || !list.length)
    return refuse('no-series', 'the series has no epochs', { n: 0 });
  if (list.length > RULES.maxEpochs)
    return refuse(
      'too-many',
      `a series of more than ${RULES.maxEpochs} epochs is refused`,
      {
        n: list.length,
        max: RULES.maxEpochs,
      }
    );
  const rows = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i] ?? {};
    const t = epochJd(e.time, {
      utcBefore2017: opts.utcBefore2017 ?? 'refuse',
    });
    if (!t.ok) return { ...t, data: { ...t.data, index: i } };
    if (!(finite(e.ra) && finite(e.dec) && Math.abs(e.dec) <= 90))
      return refuse(
        'bad-position',
        'an epoch has a position that is not a right ascension and a declination in degrees',
        {
          index: i,
        }
      );
    const s = Array.isArray(e.sigma) ? e.sigma : [e.sigma, e.sigma];
    if (!(s.length === 2 && s.every(v => finite(v) && v > 0)))
      return refuse(
        'bad-sigma',
        'an epoch has an uncertainty that is not a positive number of arcseconds',
        {
          index: i,
        }
      );
    rows.push({
      i,
      jd: t.jd,
      ra: e.ra,
      dec: e.dec,
      sx: s[0],
      sy: s[1],
      scale: t.scale,
      format: t.format,
    });
  }
  rows.sort((a, b) => a.jd - b.jd || a.i - b.i);
  const given = opts.tangent;
  const tangent =
    given && finite(given[0]) && finite(given[1])
      ? [given[0], given[1]]
      : tangentPoint(rows);
  if (!tangent)
    return refuse('bad-position', 'the positions have no mean direction', {});
  for (const r of rows) {
    const s = standard(tangent, r.ra, r.dec);
    if (!s || Math.hypot(s.x, s.y) > RULES.maxOffsetArcsec)
      return refuse(
        'too-wide',
        'a position is more than 3600 arcseconds from the others: these are not one source',
        { index: r.i, max: RULES.maxOffsetArcsec }
      );
    r.x = s.x;
    r.y = s.y;
  }
  const spanDays = rows[rows.length - 1].jd - rows[0].jd;
  return {
    ok: true,
    rows,
    tangent,
    tangentHow: given ? 'given' : 'mean',
    spanDays,
    scales: [...new Set(rows.map(r => r.scale))],
  };
}

// ---- least squares -----------------------------------------------------------------------

/** Weighted linear least squares: columns scaled to unit rms for the solve. */
function wls(A, y, w) {
  const n = A.length;
  const k = A[0].length;
  const s = [];
  for (let j = 0; j < k; j++) {
    let q = 0;
    for (let i = 0; i < n; i++) q += A[i][j] * A[i][j];
    s.push(Math.sqrt(q / n) || 1);
  }
  const N = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const aj = A[i][j] / s[j];
      b[j] += w[i] * aj * y[i];
      for (let l = 0; l <= j; l++) N[j][l] += (w[i] * aj * A[i][l]) / s[l];
    }
  }
  for (let j = 0; j < k; j++) for (let l = j + 1; l < k; l++) N[j][l] = N[l][j];
  const C = invertSpd(N);
  if (!C || !C.every((r, j) => r.every(Number.isFinite) && C[j][j] > 0))
    return null;
  const sd = C.map((r, j) => Math.sqrt(r[j]));
  for (let j = 0; j < k; j++)
    for (let l = 0; l < j; l++)
      if (Math.abs(C[j][l] / (sd[j] * sd[l])) > 1 - 1e-12) return null;
  const theta = C.map(r => r.reduce((t, v, l) => t + v * b[l], 0));
  const params = theta.map((v, j) => v / s[j]);
  const cov = C.map((r, j) => r.map((v, l) => v / (s[j] * s[l])));
  let chi2 = 0;
  const res = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = 0; j < k; j++) m += A[i][j] * params[j];
    res.push(y[i] - m);
    chi2 += w[i] * res[i] * res[i];
  }
  return { params, cov, chi2, res };
}

/** Residual table, chi-squared verdict and, when inconsistent, what to check. */
function judge(rows, resX, resY, chi2, k) {
  const dof = 2 * rows.length - k;
  const residuals = rows.map((r, i) => ({
    i: r.i,
    jd: r.jd,
    dx: resX[i],
    dy: resY[i],
    zx: resX[i] / r.sx,
    zy: resY[i] / r.sy,
  }));
  let worst = 0;
  residuals.forEach((r, i) => {
    if (
      Math.max(Math.abs(r.zx), Math.abs(r.zy)) >
      Math.max(Math.abs(residuals[worst].zx), Math.abs(residuals[worst].zy))
    )
      worst = i;
  });
  const rms = Math.sqrt(
    residuals.reduce((t, r) => t + r.dx * r.dx + r.dy * r.dy, 0) /
      (2 * rows.length)
  );
  if (dof <= 0)
    return {
      dof,
      chi2,
      p: null,
      verdict: 'exact',
      residuals,
      rms,
      worst: null,
      hints: [],
    };
  const p = chi2Survival(chi2, dof);
  const consistent = p >= RULES.consistentPValue;
  return {
    dof,
    chi2,
    p,
    verdict: consistent ? 'consistent' : 'inconsistent',
    residuals,
    rms,
    worst: residuals[worst].i,
    hints: consistent ? [] : ['epoch-time-scale', 'uncertainties', 'model'],
  };
}

const inconsistentMessage = j =>
  `The residuals are larger than the stated uncertainties allow (chi-squared ${fixed(j.chi2, 1, 'en')} on ${j.dof} degrees of freedom, p = ${j.p.toExponential(1)}). Check the epoch time scale and origin, the stated uncertainties, and whether the source moves in a straight line.`;

const bundle = (kind, prep, fit, names, units, j, extra = {}) => {
  const params = {};
  names.forEach((nm, i) => {
    params[nm] = { value: fit.params[i], sigma: Math.sqrt(fit.cov[i][i]) };
  });
  return {
    ok: true,
    kind,
    version: VERSION,
    reference: {
      ra: prep.tangent[0],
      dec: prep.tangent[1],
      how: prep.tangentHow,
    },
    epochs: prep.rows.length,
    spanDays: prep.spanDays,
    spanYears: prep.spanDays / YEAR,
    scales: prep.scales,
    tRefJd: extra.tRefJd,
    order: names,
    units,
    params,
    covariance: fit.cov,
    chi2: j.chi2,
    dof: j.dof,
    p: j.p,
    verdict: j.verdict,
    hints: j.hints,
    message: j.verdict === 'inconsistent' ? inconsistentMessage(j) : null,
    rms: j.rms,
    worst: j.worst,
    residuals: j.residuals,
    limits: [
      'no orbital motion',
      'no relativistic terms, no aberration, no light deflection',
      "independent uncertainties: the calibration's common errors are not modelled",
    ],
  };
};

/** The inverse-variance weighted mean epoch of the series (the reference epoch of the motion). */
const meanEpoch = rows => {
  let sw = 0;
  let sj = 0;
  for (const r of rows) {
    const w = 1 / (r.sx * r.sx) + 1 / (r.sy * r.sy);
    sw += w;
    sj += w * (r.jd - rows[0].jd);
  }
  return rows[0].jd + sj / sw;
};

// ---- the proper-motion fit ------------------------------------------------------------------

/**
 * A proper motion: xi = x0 + mux (t - tRef), eta = y0 + muy (t - tRef), mu in
 * arcsec per Julian year (mux is the right-ascension rate times cos dec). Two
 * epochs give an exact solution (no residual to check); three or more a verdict.
 * @param {object} series - see `prepare`
 * @param {{tangent?: number[]}} [opts]
 */
export function fitMotion(series, opts = {}) {
  const prep = prepare(series, { ...opts, utcBefore2017: 'keep' });
  if (!prep.ok) return prep;
  const { rows } = prep;
  if (rows.length < RULES.properMotionMinEpochs)
    return refuse('too-few-epochs', 'a proper motion needs at least 2 epochs', {
      n: rows.length,
      min: RULES.properMotionMinEpochs,
    });
  if (prep.spanDays < RULES.minSpanDays)
    return refuse(
      'no-baseline',
      'the epochs are less than a day apart: there is no baseline to measure a motion over',
      {
        spanDays: prep.spanDays,
        min: RULES.minSpanDays,
      }
    );
  const tRef = meanEpoch(rows);
  const A = [];
  const y = [];
  const w = [];
  for (const r of rows) {
    const t = (r.jd - tRef) / YEAR;
    A.push([1, 0, t, 0], [0, 1, 0, t]);
    y.push(r.x, r.y);
    w.push(1 / (r.sx * r.sx), 1 / (r.sy * r.sy));
  }
  const f = wls(A, y, w);
  if (!f)
    return refuse(
      'degenerate',
      'the epochs do not fix a motion (the system is singular)',
      {}
    );
  const j = judge(
    rows,
    rows.map((_, i) => f.res[2 * i]),
    rows.map((_, i) => f.res[2 * i + 1]),
    f.chi2,
    4
  );
  const out = bundle(
    'proper-motion',
    prep,
    f,
    ['x0', 'y0', 'mux', 'muy'],
    ['arcsec', 'arcsec', 'arcsec/yr', 'arcsec/yr'],
    j,
    { tRefJd: tRef }
  );
  if (rows.length === 2) out.label = SHIFT_LABEL;
  return out;
}

// ---- the two-epoch shift -------------------------------------------------------------------

/**
 * The displacement between two epochs, and nothing more: it is a shift under the
 * assumption that the source moved in a straight line, and it is not a parallax.
 * With an Earth provider it also says how much of a parallax the shift could hide
 * (the difference of the parallax factors of the two epochs).
 * @param {object} a - an epoch of `prepare`'s form
 * @param {object} b
 * @param {{earth?: object, tangent?: number[]}} [opts]
 */
export function twoEpochShift(a, b, opts = {}) {
  const prep = prepare(
    { epochs: [a, b] },
    { utcBefore2017: 'keep', tangent: opts.tangent }
  );
  if (!prep.ok) return prep;
  const [r1, r2] = prep.rows;
  const dt = (r2.jd - r1.jd) / YEAR;
  if (prep.spanDays < RULES.minSpanDays)
    return refuse(
      'no-baseline',
      'the epochs are less than a day apart: there is no baseline to measure a shift over',
      {
        spanDays: prep.spanDays,
        min: RULES.minSpanDays,
      }
    );
  const dx = r2.x - r1.x;
  const dy = r2.y - r1.y;
  const sx = Math.hypot(r1.sx, r2.sx);
  const sy = Math.hypot(r1.sy, r2.sy);
  const out = {
    ok: true,
    kind: 'two-epoch-shift',
    version: VERSION,
    label: SHIFT_LABEL,
    reference: {
      ra: prep.tangent[0],
      dec: prep.tangent[1],
      how: prep.tangentHow,
    },
    baselineYears: dt,
    displacement: { x: { value: dx, sigma: sx }, y: { value: dy, sigma: sy } },
    separation: Math.hypot(dx, dy),
    rate: {
      x: { value: dx / dt, sigma: sx / dt },
      y: { value: dy / dt, sigma: sy / dt },
    },
    assumes: [
      'the source moved in a straight line at a constant rate between the epochs',
      'there is no parallax in the shift: with two epochs a parallax and a motion cannot be told apart',
    ],
    parallaxLever: null,
  };
  if (opts.earth && opts.earth.at) {
    try {
      const f1 = parallaxFactors(
        opts.earth.at(r1.jd),
        prep.tangent[0],
        prep.tangent[1]
      );
      const f2 = parallaxFactors(
        opts.earth.at(r2.jd),
        prep.tangent[0],
        prep.tangent[1]
      );
      out.parallaxLever = { x: f2.x - f1.x, y: f2.y - f1.y };
    } catch {
      out.parallaxLever = null;
    }
  }
  return out;
}

// ---- the joint parallax and proper-motion fit -------------------------------------------------

/** The distance of a parallax interval: the image of [lo, hi] under 1/p (parsecs), open above when the interval reaches zero. */
export function distanceInterval(lo, hi) {
  if (!(hi > 0))
    return { empty: true, lo: null, hi: null, open: [false, false] };
  return {
    empty: false,
    lo: 1 / hi,
    hi: lo > 0 ? 1 / lo : null,
    open: [false, !(lo > 0)],
  };
}

/**
 * The reference-frame statement of a parallax: relative to the frame of the
 * positions, with the correction to absolute only if the caller gave its size and
 * its source (there is no default and no universal value).
 */
export function zeroPointOf(reference) {
  const c = reference?.correction;
  if (c === undefined || c === null)
    return {
      kind: 'relative',
      frame: reference?.name ?? null,
      correction: null,
      id: 'relative',
      statement:
        'Relative parallax: measured against the reference frame of the positions, not absolute. No correction to absolute was applied. A relative parallax is smaller than the absolute one by the mean parallax of the reference stars, so the distance it gives is never smaller than the true distance if that mean parallax is positive.',
    };
  return {
    kind: 'relative',
    frame: reference?.name ?? null,
    correction: { value: c.value, sigma: c.sigma, source: c.source },
    id: 'corrected',
    statement:
      'Relative parallax plus a correction to absolute that you supplied: the correction and its source are shown beside it, and the absolute parallax is only as good as that correction.',
  };
}

const checkReference = ref => {
  const c = ref?.correction;
  if (c === undefined || c === null) return null;
  if (!(finite(c.value) && finite(c.sigma) && c.sigma >= 0))
    return refuse(
      'correction',
      'a correction to absolute parallax needs its size and its uncertainty in arcseconds',
      {}
    );
  if (typeof c.source !== 'string' || !c.source.trim())
    return refuse(
      'correction-source',
      'a correction to absolute parallax needs its source: there is no default or universal value',
      {}
    );
  return null;
};

/** The chi-square profile of the parallax of a linear fit: exact (a parabola), at k sigma steps. */
function profileOf(value, sigma, chi2) {
  const pts = [];
  for (let k = -80; k <= 80; k++)
    pts.push({ value: value + (k / 10) * sigma, chi2: chi2 + (k / 10) ** 2 });
  return pts;
}

/**
 * The joint fit: proper motion plus parallax. Permitted only when the epochs
 * sample the ellipse (RULES), else a refusal that says which rule and how far.
 * @param {object} series - see `prepare`; `series.reference` {name?, correction?: {value, sigma, source}}
 * @param {{at: Function, range?: object}} earth - from `createEarth` (or any provider of the Earth's barycentric position in au)
 * @param {{tangent?: number[], levels?: number[]}} [opts]
 */
export function fitJoint(series, earth, opts = {}) {
  const bad = checkReference(series?.reference);
  if (bad) return bad;
  const prep = prepare(series, opts);
  if (!prep.ok) return prep;
  const { rows } = prep;
  if (prep.spanDays < RULES.minSpanDays)
    return refuse(
      'no-baseline',
      'the epochs are less than a day apart: there is no baseline',
      {
        spanDays: prep.spanDays,
        min: RULES.minSpanDays,
      }
    );
  if (rows.length < RULES.jointMinEpochs)
    return refuse(
      'too-few-epochs',
      `a parallax needs at least ${RULES.jointMinEpochs} epochs sampling the parallactic ellipse; ${rows.length} do not: this is not constrained (a two-epoch series gives only a shift)`,
      { n: rows.length, min: RULES.jointMinEpochs }
    );
  if (prep.spanDays / YEAR < RULES.jointMinSpanYears)
    return refuse(
      'span',
      `a parallax needs epochs over at least ${RULES.jointMinSpanYears} year; these span ${fixed(prep.spanDays / YEAR, 2, 'en')}`,
      { spanYears: prep.spanDays / YEAR, min: RULES.jointMinSpanYears }
    );
  const range = earth.range ?? null;
  if (range && rows.some(r => r.jd < range.startJd || r.jd > range.stopJd))
    return refuse(
      'epoch-range',
      `the epochs, read as ${prep.rows[0].format.toUpperCase()} in ${prep.scales.join(', ').toUpperCase()}, fall outside the ephemeris (JD ${range.startJd} to ${range.stopJd}): check that they are Julian dates, not modified ones, and the other way round`,
      {
        format: prep.rows[0].format,
        scale: prep.scales[0],
        first: rows[0].jd,
        last: rows[rows.length - 1].jd,
        startJd: range.startJd,
        stopJd: range.stopJd,
      }
    );
  const earths = rows.map(r => earth.at(r.jd));
  const sectors = new Set(
    earths.map(e => Math.floor(eclipticLongitude(e) / 90) % 4)
  );
  if (sectors.size < RULES.jointMinQuadrants)
    return refuse(
      'phase-coverage',
      `the epochs fall in ${sectors.size} of the 4 sectors of the Earth's orbit; at least ${RULES.jointMinQuadrants} are needed to sample the parallactic ellipse`,
      { sectors: sectors.size, min: RULES.jointMinQuadrants }
    );
  const tRef = meanEpoch(rows);
  const [a0, d0] = prep.tangent;
  const A = [];
  const y = [];
  const w = [];
  const factors = [];
  rows.forEach((r, i) => {
    const t = (r.jd - tRef) / YEAR;
    const f = parallaxFactors(earths[i], a0, d0);
    factors.push(f);
    A.push([1, 0, t, 0, f.x], [0, 1, 0, t, f.y]);
    y.push(r.x, r.y);
    w.push(1 / (r.sx * r.sx), 1 / (r.sy * r.sy));
  });
  const f = wls(A, y, w);
  if (!f)
    return refuse(
      'degenerate',
      'the epochs do not separate the parallax from the motion (the system is singular)',
      {}
    );
  const j = judge(
    rows,
    rows.map((_, i) => f.res[2 * i]),
    rows.map((_, i) => f.res[2 * i + 1]),
    f.chi2,
    5
  );
  const out = bundle(
    'parallax-and-proper-motion',
    prep,
    f,
    ['x0', 'y0', 'mux', 'muy', 'parallax'],
    ['arcsec', 'arcsec', 'arcsec/yr', 'arcsec/yr', 'arcsec'],
    j,
    { tRefJd: tRef }
  );
  out.factors = factors.map(v => [v.x, v.y]);
  // The correlation of the parallax with the proper motion: how well the epochs separate them.
  const s = out.covariance.map((r, i) => Math.sqrt(r[i]));
  out.correlation = {
    parallaxMux: out.covariance[4][2] / (s[4] * s[2]),
    parallaxMuy: out.covariance[4][3] / (s[4] * s[3]),
  };
  out.sectors = sectors.size;
  out.zeroPoint = zeroPointOf(series.reference);
  out.distance = distanceOf(out, series.reference, opts.levels ?? RULES.levels);
  // A parallax below zero by more than 3 sigma is not a measurement any source can give.
  // Added after the first measurement of check d3: shifting every epoch by half a year turns
  // the parallax into its negative, and the residuals cannot tell (the verdict stays
  // consistent); the result says so instead.
  out.warnings = [];
  if (out.params.parallax.value + 3 * out.params.parallax.sigma < 0) {
    out.warnings.push('negative-parallax');
    out.hints = ['epoch-time-scale', 'reference-frame', 'model'];
    out.message =
      'The parallax is negative by more than 3 times its uncertainty, which no source can have. Check the epoch time scale and origin (a shift of half a year turns a parallax into its negative), the reference stars and the stated uncertainties.';
  }
  if (out.verdict === 'inconsistent' || out.warnings.length)
    out.distance.withheld =
      out.verdict === 'inconsistent'
        ? 'the residuals are larger than the stated uncertainties allow, so no distance is presented'
        : 'the parallax is negative by more than 3 sigma, so no distance is presented';
  return out;
}

/** The parallax and its distance, with every interval, method and the frame statement. */
function distanceOf(fit, reference, levels) {
  const rel = fit.params.parallax;
  const c = reference?.correction;
  const used = c ? 'absolute' : 'relative';
  const value = c ? rel.value + c.value : rel.value;
  const sigma = c ? Math.hypot(rel.sigma, c.sigma) : rel.sigma;
  const chi2 = fit.chi2;
  const intervals = [];
  for (const level of levels) {
    const p = profileInterval(profileOf(value, sigma, chi2), chi2, { level });
    if (p.status && p.status !== 'ok') continue;
    const plo = p.lo ?? -Infinity;
    const phi = p.hi ?? Infinity;
    const d = distanceInterval(plo, phi);
    intervals.push({
      level,
      parallax: { lo: p.lo, hi: p.hi },
      distance: d,
      method: p.method,
      assumes: p.assumes,
    });
  }
  return {
    parallax: {
      relative: { ...rel },
      absolute: c ? { value, sigma } : null,
      used,
    },
    value: value > 0 ? 1 / value : null,
    lowSignificance: !(value > 0) || value / sigma < RULES.lowSignificance,
    significance: value / sigma,
    unit: 'pc',
    intervals,
    method: METHODS.profile.label,
    assumptions: [
      'the parallax is the image of a linear least-squares fit with the stated uncertainties: its interval is a profile interval, a statement about repeated data and not a probability of the distance',
      'the distance interval is the image of the parallax interval under 1/p: open above when the interval reaches zero',
      'a point distance 1/p is not an unbiased estimate: use the interval',
      ...(c
        ? []
        : [
            "the parallax is relative to the reference frame: add the reference stars' mean parallax, with its source, to make it absolute",
          ]),
    ],
  };
}

/** The model's position (arcsec, standard coordinates) of a fit at a TDB Julian date, for drawing; needs the Earth for a joint fit. */
export function predict(fit, jd, earth = null) {
  const t = (jd - fit.tRefJd) / YEAR;
  const p = fit.params;
  let x = p.x0.value + p.mux.value * t;
  let y = p.y0.value + p.muy.value * t;
  if (p.parallax) {
    if (!earth) return null;
    const f = parallaxFactors(
      earth.at(jd),
      fit.reference.ra,
      fit.reference.dec
    );
    x += p.parallax.value * f.x;
    y += p.parallax.value * f.y;
  }
  return { x, y };
}

// ---- the record -------------------------------------------------------------------------------

const MAS = 1000;
const mas = v => (finite(v) ? v * MAS : v);

/**
 * The fit as the envelope's quantities (Prompt 150's uncertainty kinds), in
 * milliarcseconds: the parameters with their sigmas, and for a joint fit the
 * distance as an interval, or as a lower limit when it is open above, never
 * without its frame statement (kept in the record's reduction).
 */
export function quantitiesOf(fit) {
  const out = [];
  const sigma = (id, value, unit, s, label) =>
    out.push({
      id,
      label,
      value,
      unit,
      origin: 'fitted',
      uncertainty: { kind: 'sigma', basis: 'data', sigma: s },
    });
  const p = fit.params;
  sigma('series.x0', mas(p.x0.value), 'mas', mas(p.x0.sigma), 'offset east');
  sigma('series.y0', mas(p.y0.value), 'mas', mas(p.y0.sigma), 'offset north');
  sigma(
    'series.mux',
    mas(p.mux.value),
    'mas/yr',
    mas(p.mux.sigma),
    'proper motion in right ascension'
  );
  sigma(
    'series.muy',
    mas(p.muy.value),
    'mas/yr',
    mas(p.muy.sigma),
    'proper motion in declination'
  );
  if (p.parallax) {
    const d = fit.distance;
    sigma(
      'series.parallax',
      mas(
        d.parallax.used === 'absolute'
          ? d.parallax.absolute.value
          : p.parallax.value
      ),
      'mas',
      mas(
        d.parallax.used === 'absolute'
          ? d.parallax.absolute.sigma
          : p.parallax.sigma
      ),
      d.parallax.used === 'absolute'
        ? 'parallax (corrected to absolute)'
        : 'parallax (relative)'
    );
    const i68 = d.intervals[0];
    if (fit.verdict === 'inconsistent')
      out.push({
        id: 'series.distance',
        label: 'distance',
        value: null,
        unit: 'pc',
        origin: 'derived',
        uncertainty: { kind: 'failed', reason: 'residuals-inconsistent' },
      });
    else if (!i68 || i68.distance.empty)
      out.push({
        id: 'series.distance',
        label: 'distance',
        value: null,
        unit: 'pc',
        origin: 'derived',
        uncertainty: { kind: 'not-constrained' },
      });
    else if (i68.distance.hi === null)
      out.push({
        id: 'series.distance',
        label: 'distance (lower limit)',
        value: i68.distance.lo,
        unit: 'pc',
        origin: 'derived',
        uncertainty: {
          kind: 'limit',
          bound: 'lower',
          basis: 'profile',
          level: i68.level,
        },
      });
    else
      out.push({
        id: 'series.distance',
        label: 'distance',
        value: d.value,
        unit: 'pc',
        origin: 'derived',
        uncertainty: {
          kind: 'interval',
          basis: 'profile',
          level: i68.level,
          lo: i68.distance.lo,
          hi: i68.distance.hi,
        },
      });
  }
  return out;
}

/** The Prompt 150 fit-result record: the model, parameters, covariance (mas, mas/yr), the statistic and the residuals. */
export function fitRecordOf(fit) {
  const ids = fit.order.map(n => `series.${n}`);
  const scale = fit.units.map(() => MAS);
  const units = fit.units.map(u => (u === 'arcsec' ? 'mas' : 'mas/yr'));
  return {
    model: {
      id:
        fit.kind === 'proper-motion'
          ? 'astrometric-proper-motion'
          : 'astrometric-parallax-proper-motion',
      version: String(VERSION),
    },
    parameters: ids,
    covariance: {
      order: ids,
      values: fit.covariance.map((r, i) =>
        r.map((v, j) => v * scale[i] * scale[j])
      ),
      units,
    },
    statistic: { name: 'chi2', value: fit.chi2, dof: Math.max(0, fit.dof) },
    residuals: { n: fit.epochs * 2, rms: mas(fit.rms) },
    convergence: { converged: true },
    rank: {
      free: ids.length,
      rank: ids.length,
      status: 'full',
      notConstrained: [],
    },
  };
}

/** What lets a fit be made again: the checked series, its settings, and the numbers it gave. */
export function reductionOf(series, fit, opts = {}) {
  return {
    step: STEP,
    version: VERSION,
    kind: fit.kind,
    series: {
      epochs: series.epochs.map(e => ({
        time: {
          value: e.time.value,
          format: e.time.format ?? 'jd',
          scale: e.time.scale,
        },
        ra: e.ra,
        dec: e.dec,
        sigma: e.sigma,
      })),
      ...(series.reference ? { reference: series.reference } : {}),
    },
    options: { ...(opts.tangent ? { tangent: opts.tangent } : {}) },
    earth: fit.params.parallax
      ? { id: 'ephemeris-pack-barycentric', pack: 'solar-system-2025-2045' }
      : null,
    result: {
      order: fit.order,
      values: fit.order.map(n => fit.params[n].value),
      chi2: fit.chi2,
      dof: fit.dof,
    },
    ...(fit.zeroPoint ? { zeroPoint: fit.zeroPoint } : {}),
  };
}

/**
 * Run a record again: refit the stored series and say whether the numbers are
 * the same (relative agreement of 1e-9; a trigonometric sum is not bit-stable).
 */
export function replay(red, earth = null) {
  if (red?.step !== STEP || red.version !== VERSION)
    return refuse('record', 'this is not a record of this tool', {});
  const fit =
    red.kind === 'proper-motion'
      ? fitMotion(red.series, red.options)
      : red.kind === 'parallax-and-proper-motion' && earth
        ? fitJoint(red.series, earth, red.options)
        : null;
  if (!fit)
    return refuse(
      'record',
      'this record needs the ephemeris to be run again',
      {}
    );
  if (!fit.ok) return fit;
  const same = fit.order.every((n, i) => {
    const a = fit.params[n].value;
    const b = red.result.values[i];
    return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-12);
  });
  return { ok: true, agrees: same, fit };
}

/** The epochs and residuals as CSV rows (header supplied by the page, in the reader's words). */
export function csvRows(fit, header, num) {
  return [
    header,
    ...fit.residuals.map(r => [
      String(r.i + 1),
      num(r.jd),
      num(r.dx),
      num(r.dy),
      num(r.zx),
      num(r.zy),
    ]),
  ];
}
