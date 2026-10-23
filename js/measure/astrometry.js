// =============================================================================
// WCS-lite and registration (Prompt 181, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// Sky coordinates for a frame, from reference stars, and the shift between two
// frames, from matched sources. Pure: no DOM, no clock, no network; the only
// import is Prompt 152's small linear algebra.
//
// The model is the tangent-plane (gnomonic, TAN) projection about a reference
// sky position T, with a linear map to pixels:
//     pixel = p0 + P (xi, eta)        xi east, eta north, radians
// six parameters (the affine model: two scales and a skew) or four (similarity:
// one scale, one rotation and a stated parity). CRPIX is p0 and the CD matrix
// is the inverse of P. The fit is ordinary linear least squares on the stars'
// pixels (the noise is in the measured pixels, not in the catalogue), weighted
// by their stated uncertainty. There are no distortion terms: over a field of
// several degrees the choice of T matters at second order (half the field,
// squared, times the offset), and a field wider than 60 degrees is refused.
// A fit that cannot be constrained says "not-constrained" and why, and never
// returns a number; a fit that can returns its residuals, the degrees of
// freedom and a verdict: no solution without them.
//
// Pixels are FITS: 1 is the centre of the first pixel, y runs up.
// =============================================================================

import { invertSpd } from '../numeric/linalg.js';

const { Math, Number } = globalThis;
const RAD = Math.PI / 180;
const ARCSEC = RAD / 3600;

/** The rules fixed before any measurement (tests hold them equal to thresholds.json). */
export const RULES = Object.freeze({
  minStars: 3,
  minSpreadRatio: 0.02,
  maxRadiusDeg: 60,
  consistentPValue: 0.001,
  minRegistrationSources: 3,
  minRegistrationRms: 1,
});
/** A star with no stated uncertainty is taken to be placed to this many pixels. */
export const DEFAULT_SIGMA = 0.5;

const finite = Number.isFinite;
const fin2 = a => Array.isArray(a) && a.length === 2 && a.every(finite);
const wrap360 = d => ((d % 360) + 360) % 360;
/** A refusal: the code and the English message are the kernel's; `data` is what a page needs to say it in another language. */
const refuse = (code, message, data = {}) => ({
  ok: false,
  status: 'not-constrained',
  code,
  message,
  data,
});

// ---- the projection ---------------------------------------------------------------

/**
 * Standard coordinates of a sky position about a tangent point, in radians, or
 * null when it is not in the tangent point's hemisphere.
 * @param {number[]} t - [ra, dec] degrees
 */
export function tangentOf(t, ra, dec) {
  const a0 = t[0] * RAD;
  const d0 = t[1] * RAD;
  const a = ra * RAD;
  const d = dec * RAD;
  const da = a - a0;
  const c =
    Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(da);
  if (!(c > 0)) return null;
  return {
    xi: (Math.cos(d) * Math.sin(da)) / c,
    eta:
      (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(da)) /
      c,
  };
}

/** The sky position of standard coordinates (radians) about a tangent point: degrees. */
export function untangent(t, xi, eta) {
  const a0 = t[0] * RAD;
  const d0 = t[1] * RAD;
  const denom = Math.cos(d0) - eta * Math.sin(d0);
  return {
    ra: wrap360((a0 + Math.atan2(xi, denom)) / RAD),
    dec:
      Math.atan2(Math.sin(d0) + eta * Math.cos(d0), Math.hypot(xi, denom)) /
      RAD,
  };
}

/** The CD matrix of a WCS in radians per pixel. */
const cdRad = wcs => wcs.cd.map(r => r.map(v => v * RAD));

/**
 * Right ascension and declination of a pixel, in degrees, from a WCS of this
 * module's form ({crpix, crval, cd} with the CD matrix in degrees per pixel).
 * @returns {{ra: number, dec: number}}
 */
export function skyOf(wcs, x, y) {
  const m = cdRad(wcs);
  const dx = x - wcs.crpix[0];
  const dy = y - wcs.crpix[1];
  return untangent(
    wcs.crval,
    m[0][0] * dx + m[0][1] * dy,
    m[1][0] * dx + m[1][1] * dy
  );
}

/** The pixel of a sky position, or null when it is behind the tangent plane or the matrix is singular. */
export function pixelOf(wcs, ra, dec) {
  const s = tangentOf(wcs.crval, ra, dec);
  const m = cdRad(wcs);
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (!s || !det) return null;
  return {
    x: wcs.crpix[0] + (m[1][1] * s.xi - m[0][1] * s.eta) / det,
    y: wcs.crpix[1] + (-m[1][0] * s.xi + m[0][0] * s.eta) / det,
  };
}

/** The sky angle between two positions, degrees (haversine: exact for small angles). */
export function separation(a, b) {
  const d1 = a.dec * RAD;
  const d2 = b.dec * RAD;
  const s =
    Math.sin((d2 - d1) / 2) ** 2 +
    Math.cos(d1) * Math.cos(d2) * Math.sin(((b.ra - a.ra) * RAD) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / RAD;
}

// ---- a WCS in words ---------------------------------------------------------------

/**
 * What a WCS says in the terms a person uses. The position angle is that of the
 * image's +y axis, from north through east; the parity is `standard` when east
 * is to the left with north up (the CD matrix has a negative determinant).
 */
export function describeWcs(wcs) {
  const m = wcs.cd.map(r => r.map(v => v * 3600));
  const sx = Math.hypot(m[0][0], m[1][0]);
  const sy = Math.hypot(m[0][1], m[1][1]);
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const dot = m[0][0] * m[0][1] + m[1][0] * m[1][1];
  return {
    scaleX: sx,
    scaleY: sy,
    scale: Math.sqrt(Math.abs(det)),
    positionAngle: Math.atan2(m[0][1], m[1][1]) / RAD,
    parity: det < 0 ? 'standard' : 'mirrored',
    skew: Math.asin(Math.max(-1, Math.min(1, dot / (sx * sy)))) / RAD,
    axisRatio: sx / sy,
  };
}

/** The projection's own six numbers as a WCS: theta = [p0x, p0y, Pxx, Pxe, Pyx, Pye] (pixels, pixels per radian). */
function wcsOf(T, th) {
  const det = th[2] * th[5] - th[3] * th[4];
  // CD = P^-1, in degrees per pixel.
  const cd = [
    [th[5] / det / RAD, -th[3] / det / RAD],
    [-th[4] / det / RAD, th[2] / det / RAD],
  ];
  return {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [th[0], th[1]],
    crval: [T[0], T[1]],
    cd,
  };
}

// ---- reading a header's WCS ----------------------------------------------------------

/**
 * Read the WCS a pack or an image's header carries. Only a plain TAN
 * projection of right ascension and declination is used; anything else is
 * refused by name, never read as if it were TAN.
 * @param {object} h - {ctype, crpix, crval, cd} or {..., cdelt, pc}
 * @returns {{ok: true, wcs: object}|{ok: false, code: string, message: string}}
 */
export function fromHeader(h) {
  const no = (code, message, data = {}) => ({ ok: false, code, message, data });
  if (!h || typeof h !== 'object')
    return no('no-wcs', 'the image has no world coordinates');
  const ct = h.ctype;
  if (!Array.isArray(ct) || ct.length !== 2)
    return no(
      'axes',
      `it has ${Array.isArray(ct) ? ct.length : 'no'} celestial axes, and only two are read`,
      { names: Array.isArray(ct) ? ct.join(' / ') : '?' }
    );
  const [a, b] = ct.map(c => String(c ?? ''));
  const ax = (c, want) => c.slice(0, 5) === want;
  if (!ax(a, 'RA---') || !ax(b, 'DEC--'))
    return no(
      'axes',
      `${a || '?'} / ${b || '?'}: only right ascension and declination, in that order, are read`,
      { names: `${a || '?'} / ${b || '?'}` }
    );
  const pa = a.slice(5, 8);
  const pb = b.slice(5, 8);
  const restA = a.slice(8);
  const restB = b.slice(8);
  if (restA === '-SIP' || restB === '-SIP')
    return no(
      'distortion',
      `${a} / ${b} carries a SIP distortion, which is not applied here`,
      { name: 'SIP' }
    );
  if (pa === 'TPV' || pb === 'TPV')
    return no(
      'distortion',
      `${a} / ${b} carries a TPV distortion, which is not applied here`,
      { name: 'TPV' }
    );
  if (pa !== 'TAN' || pb !== 'TAN' || restA || restB)
    return no(
      'projection',
      `${a} / ${b}: the ${pa !== 'TAN' ? pa || '?' : pb || '?'} projection is not read, only TAN`,
      { name: pa !== 'TAN' ? pa || '?' : pb || '?' }
    );
  if (!fin2(h.crpix) || !fin2(h.crval))
    return no('incomplete', 'its reference pixel or position is missing');
  if (!(h.crval[1] >= -90 && h.crval[1] <= 90))
    return no('incomplete', `CRVAL2 = ${h.crval[1]} is not a declination`);
  let cd = null;
  const mat = m => Array.isArray(m) && m.length === 2 && m.every(r => fin2(r));
  if (h.cd !== undefined && h.cd !== null) {
    if (!mat(h.cd))
      return no('incomplete', 'its CD matrix is not a finite 2 by 2 matrix');
    cd = h.cd.map(r => r.slice());
  } else if (fin2(h.cdelt) && mat(h.pc)) {
    cd = [
      [h.cdelt[0] * h.pc[0][0], h.cdelt[0] * h.pc[0][1]],
      [h.cdelt[1] * h.pc[1][0], h.cdelt[1] * h.pc[1][1]],
    ];
  } else return no('incomplete', 'it has neither a CD matrix nor PC and CDELT');
  const det = cd[0][0] * cd[1][1] - cd[0][1] * cd[1][0];
  const big = Math.max(...cd.flat().map(Math.abs));
  if (!(Math.abs(det) > 1e-12 * big * big))
    return no(
      'singular',
      'its CD matrix is singular: two pixel axes point the same way'
    );
  return {
    ok: true,
    wcs: {
      ctype: ['RA---TAN', 'DEC--TAN'],
      crpix: h.crpix.slice(),
      crval: h.crval.slice(),
      cd,
      ...(h.radesys ? { radesys: h.radesys } : {}),
    },
  };
}

// ---- statistics -------------------------------------------------------------------

/** ln Gamma (Lanczos, g = 7). */
function lnGamma(x) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const y = x - 1;
  let s = c[0];
  for (let i = 1; i < 9; i++) s += c[i] / (y + i);
  const t = y + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(s)
  );
}

/**
 * The upper regularised incomplete gamma function Q(a, x) (series below
 * a + 1, continued fraction above): the survival function of chi-squared with
 * 2a degrees of freedom at 2x.
 */
function gammaQ(a, x) {
  if (x <= 0) return 1;
  const lg = lnGamma(a);
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - lg));
  }
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - lg) * h;
}

/** The chance of a chi-squared this large or larger with `dof` degrees of freedom. */
export const chi2Survival = (chi2, dof) => gammaQ(dof / 2, chi2 / 2);

/** The verdict the residuals earn: p, and consistent / inconsistent / exact. */
function judge(chi2, dof) {
  if (dof <= 0) return { p: null, consistent: null, verdict: 'exact' };
  const p = chi2Survival(chi2, dof);
  const consistent = p >= RULES.consistentPValue;
  return { p, consistent, verdict: consistent ? 'consistent' : 'inconsistent' };
}

// ---- the fit ----------------------------------------------------------------------

const MODELS = ['affine', 'similarity'];

/** The mean direction of unit vectors of (ra, dec) degrees, as [ra, dec], or null. */
function meanDirection(stars) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const s of stars) {
    const a = s.ra * RAD;
    const d = s.dec * RAD;
    x += Math.cos(d) * Math.cos(a);
    y += Math.cos(d) * Math.sin(a);
    z += Math.sin(d);
  }
  const n = Math.hypot(x, y, z);
  if (!(n > 1e-9 * stars.length)) return null;
  return [wrap360(Math.atan2(y, x) / RAD), Math.asin(z / n) / RAD];
}

/** Rows of the design matrix for one star, and the map from the fitted numbers to theta. */
function designOf(model, parity, S, mean) {
  const [mx, me] = mean;
  if (model === 'affine') {
    return {
      k: 6,
      // x = a0 + a1 u + a2 v ; y = b0 + b1 u + b2 v  (u, v scaled and centred)
      rows: (u, v) => [
        [1, u, v, 0, 0, 0],
        [0, 0, 0, 1, u, v],
      ],
      // theta = L phi
      L: [
        [1, -mx / S, -me / S, 0, 0, 0],
        [0, 0, 0, 1, -mx / S, -me / S],
        [0, 1 / S, 0, 0, 0, 0],
        [0, 0, 1 / S, 0, 0, 0],
        [0, 0, 0, 0, 1 / S, 0],
        [0, 0, 0, 0, 0, 1 / S],
      ],
    };
  }
  const p = parity;
  // x = cx + a u - p b v ; y = cy + b u + p a v   (phi = cx, cy, a, b)
  return {
    k: 4,
    rows: (u, v) => [
      [1, 0, u, -p * v],
      [0, 1, p * v, u],
    ],
    L: [
      [1, 0, -mx / S, (p * me) / S],
      [0, 1, (-p * me) / S, -mx / S],
      [0, 0, 1 / S, 0],
      [0, 0, 0, -p / S],
      [0, 0, 0, 1 / S],
      [0, 0, p / S, 0],
    ],
  };
}

const matVec = (A, x) => A.map(r => r.reduce((s, v, j) => s + v * x[j], 0));
const matMul = (A, B) =>
  A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const transpose = A => A[0].map((_, j) => A.map(r => r[j]));

/** Weighted least squares phi, its covariance and the design, or null when singular. */
function solveWls(design, pts, w) {
  const { k, rows } = design;
  const N = Array.from({ length: k }, () => new Array(k).fill(0));
  const rhs = new Array(k).fill(0);
  pts.forEach((p, i) => {
    const r = rows(p.u, p.v);
    const obs = [p.x, p.y];
    for (let q = 0; q < 2; q++)
      for (let a = 0; a < k; a++) {
        rhs[a] += w[i] * r[q][a] * obs[q];
        for (let b = 0; b < k; b++) N[a][b] += w[i] * r[q][a] * r[q][b];
      }
  });
  const C = invertSpd(N);
  if (!C || !C.flat().every(finite)) return null;
  return { phi: matVec(C, rhs), C };
}

/**
 * Fit a WCS to matched reference stars.
 * @param {{id?: string, name?: string, x: number, y: number, ra: number, dec: number,
 *   sigma?: number, catalogSigma?: number}[]} stars - FITS pixels; degrees; `sigma`
 *   the star's pixel uncertainty (default DEFAULT_SIGMA, flagged), `catalogSigma`
 *   the catalogue position's arcseconds (default 0)
 * @param {{model?: 'affine'|'similarity', parity?: 1|-1, tangent?: number[]}} [opts]
 *   `parity` for the similarity model: -1 (default) east left with north up;
 *   `tangent` the reference sky position, else the stars' mean direction
 * @returns {object} `{ok: false, status: 'not-constrained', code, message}`, or
 *   `{ok: true, status: 'solved', wcs, model, tangent, params, covariance, derived,
 *   sigmas, residuals, stats, consistent, verdict}`
 */
export function fitWcs(stars, opts = {}) {
  const model = opts.model ?? 'affine';
  if (!MODELS.includes(model)) throw new RangeError(`not a model: ${model}`);
  const parity = opts.parity === 1 ? 1 : -1;
  if (!Array.isArray(stars)) throw new TypeError('stars must be a list');
  if (stars.length < RULES.minStars)
    return refuse(
      'too-few',
      `${stars.length} matched star${stars.length === 1 ? '' : 's'}: at least ${RULES.minStars} are needed to put sky coordinates on a frame`,
      { n: stars.length, min: RULES.minStars }
    );
  for (const [i, s] of stars.entries()) {
    const bad =
      !finite(s?.x) || !finite(s?.y)
        ? 'a pixel position'
        : !finite(s.ra) || !finite(s.dec) || s.dec < -90 || s.dec > 90
          ? 'a sky position'
          : s.sigma !== undefined && !(s.sigma > 0 && s.sigma < Infinity)
            ? 'a pixel uncertainty (it must be positive)'
            : s.catalogSigma !== undefined &&
                !(s.catalogSigma >= 0 && s.catalogSigma < Infinity)
              ? 'a catalogue uncertainty'
              : null;
    if (bad)
      return refuse('malformed', `star ${s?.id ?? i + 1} has not got ${bad}`, {
        id: String(s?.id ?? i + 1),
      });
  }
  for (let i = 0; i < stars.length; i++)
    for (let j = 0; j < i; j++)
      if (Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y) < 1e-9)
        return refuse(
          'duplicate',
          `stars ${stars[j].id ?? j + 1} and ${stars[i].id ?? i + 1} are at one pixel`,
          { a: String(stars[j].id ?? j + 1), b: String(stars[i].id ?? i + 1) }
        );
  const T =
    opts.tangent && fin2(opts.tangent) ? opts.tangent : meanDirection(stars);
  if (!T)
    return refuse(
      'too-wide',
      'the stars surround the sky: there is no tangent plane for them',
      { id: null, deg: RULES.maxRadiusDeg }
    );
  const pts = [];
  for (const [i, s] of stars.entries()) {
    const c = tangentOf(T, s.ra, s.dec);
    const far = c
      ? separation({ ra: T[0], dec: T[1] }, s) > RULES.maxRadiusDeg
      : true;
    if (far)
      return refuse(
        'too-wide',
        `star ${s.id ?? i + 1} is more than ${RULES.maxRadiusDeg} degrees from the reference position: the tangent plane does not describe a field this wide`,
        { id: String(s.id ?? i + 1), deg: RULES.maxRadiusDeg }
      );
    pts.push({ x: s.x, y: s.y, xi: c.xi, eta: c.eta });
  }
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.xi, 0) / n;
  const me = pts.reduce((a, p) => a + p.eta, 0) / n;
  let sxx = 0;
  let sxe = 0;
  let see = 0;
  for (const p of pts) {
    sxx += (p.xi - mx) ** 2;
    sxe += (p.xi - mx) * (p.eta - me);
    see += (p.eta - me) ** 2;
  }
  sxx /= n;
  sxe /= n;
  see /= n;
  const tr = sxx + see;
  const disc = Math.sqrt(Math.max(0, ((sxx - see) / 2) ** 2 + sxe ** 2));
  const l1 = tr / 2 + disc;
  const l2 = Math.max(0, tr / 2 - disc);
  const ratio = l1 > 0 ? Math.sqrt(l2 / l1) : 0;
  if (!(ratio >= RULES.minSpreadRatio))
    return refuse(
      'collinear',
      `the stars lie along a line (their spread across it is ${Math.round(ratio * 1000) / 10}% of their spread along it, and at least ${RULES.minSpreadRatio * 100}% is needed): a line of stars cannot fix the scale and rotation across it`,
      {
        pct: Math.round(ratio * 1000) / 10,
        min: RULES.minSpreadRatio * 100,
      }
    );
  const S = Math.sqrt(tr);
  pts.forEach(p => {
    p.u = (p.xi - mx) / S;
    p.v = (p.eta - me) / S;
  });
  const design = designOf(model, parity, S, [mx, me]);
  const sig = stars.map(s => s.sigma ?? DEFAULT_SIGMA);
  const catS = stars.map(s => (s.catalogSigma ?? 0) * ARCSEC);
  let w = sig.map(s => 1 / (s * s));
  let fit = solveWls(design, pts, w);
  if (!fit)
    return refuse(
      'singular',
      'the stars do not fix the six numbers of the model'
    );
  let theta = matVec(design.L, fit.phi);
  if (catS.some(c => c > 0)) {
    // The catalogue's own error, in pixels at the scale a first pass found.
    const k = Math.sqrt(Math.abs(theta[2] * theta[5] - theta[3] * theta[4]));
    w = sig.map((s, i) => 1 / (s * s + (catS[i] * k) ** 2));
    fit = solveWls(design, pts, w);
    if (!fit)
      return refuse(
        'singular',
        'the stars do not fix the six numbers of the model'
      );
    theta = matVec(design.L, fit.phi);
  }
  const det = theta[2] * theta[5] - theta[3] * theta[4];
  const cdMax = Math.max(
    Math.abs(theta[2]),
    Math.abs(theta[3]),
    Math.abs(theta[4]),
    Math.abs(theta[5])
  );
  if (!theta.every(finite) || !(Math.abs(det) > 1e-12 * cdMax * cdMax))
    return refuse(
      'singular',
      'the fitted matrix is singular: the stars do not fix a scale and a rotation'
    );
  // Covariance of theta, and the residuals in the scaled coordinates.
  const cov = matMul(matMul(design.L, fit.C), transpose(design.L));
  const wcs = wcsOf(T, theta);
  const dsc = describeWcs(wcs);
  let chi2 = 0;
  let sq = 0;
  let big = 0;
  const residuals = pts.map((p, i) => {
    const r = design.rows(p.u, p.v);
    const mod = r.map(row => row.reduce((a, v, j) => a + v * fit.phi[j], 0));
    const dx = p.x - mod[0];
    const dy = p.y - mod[1];
    chi2 += w[i] * (dx * dx + dy * dy);
    sq += dx * dx + dy * dy;
    big = Math.max(big, Math.hypot(dx, dy));
    return {
      id: stars[i].id ?? String(i + 1),
      dx,
      dy,
      pix: Math.hypot(dx, dy),
      arcsec: Math.hypot(dx, dy) * dsc.scale,
      sigma: Math.sqrt(1 / w[i]),
    };
  });
  const dof = 2 * n - design.k;
  const j = judge(chi2, dof);
  const sigmas = derivedSigmas(theta, cov);
  return {
    ok: true,
    status: 'solved',
    wcs,
    model,
    ...(model === 'similarity' ? { parity } : {}),
    tangent: T.slice(),
    tangentGiven: Boolean(opts.tangent && fin2(opts.tangent)),
    params: theta,
    covariance: cov,
    derived: dsc,
    sigmas,
    residuals,
    stats: {
      n,
      dof,
      chi2,
      p: j.p,
      rmsPix: Math.sqrt(sq / n),
      rmsArcsec: Math.sqrt(sq / n) * dsc.scale,
      maxPix: big,
      sigmaAssumed: stars.some(s => s.sigma === undefined),
    },
    consistent: j.consistent,
    verdict: j.verdict,
  };
}

/** Sigmas of the derived numbers by the delta method (central differences on theta). */
function derivedSigmas(theta, cov) {
  const T0 = [0, 0];
  const f = th => {
    const d = describeWcs(wcsOf(T0, th));
    return [d.scale, d.scaleX, d.scaleY, d.positionAngle, d.skew, d.axisRatio];
  };
  const big = Math.max(...theta.slice(2).map(Math.abs));
  const J = [];
  for (let j = 0; j < 6; j++) {
    const h = 1e-6 * (j < 2 ? Math.max(1, Math.abs(theta[j])) : big);
    const a = theta.slice();
    const b = theta.slice();
    a[j] += h;
    b[j] -= h;
    const fa = f(a);
    const fb = f(b);
    // The position angle is periodic: difference it across +-180.
    J.push(
      fa.map(
        (v, q) =>
          (q === 3 ? ((v - fb[q] + 540) % 360) - 180 : v - fb[q]) / (2 * h)
      )
    );
  }
  const names = [
    'scale',
    'scaleX',
    'scaleY',
    'positionAngle',
    'skew',
    'axisRatio',
  ];
  const out = {
    crpix: [Math.sqrt(cov[0][0]), Math.sqrt(cov[1][1])],
  };
  names.forEach((nm, q) => {
    let v = 0;
    for (let a = 0; a < 6; a++)
      for (let b = 0; b < 6; b++) v += J[a][q] * cov[a][b] * J[b][q];
    out[nm] = Math.sqrt(Math.max(0, v));
  });
  return out;
}

/**
 * The uncertainty of the sky position of a pixel under a solved fit, from the
 * covariance of its numbers: standard-coordinate offsets east and north in
 * arcseconds (the reference position itself is a choice, not an estimate).
 * @returns {{east: number, north: number, radius: number, covariance: number[][]}}
 */
export function uncertaintyAt(fit, x, y) {
  const th = fit.params;
  const det = th[2] * th[5] - th[3] * th[4];
  const inv = [
    [th[5] / det, -th[3] / det],
    [-th[4] / det, th[2] / det],
  ];
  const d = [x - th[0], y - th[1]];
  const s = matVec(inv, d);
  // d s / d theta: p0 -> -inv ; P_jk -> -inv[:, j] * s_k
  const J = [[], []];
  for (let q = 0; q < 2; q++) {
    J[q][0] = -inv[q][0];
    J[q][1] = -inv[q][1];
    J[q][2] = -inv[q][0] * s[0];
    J[q][3] = -inv[q][0] * s[1];
    J[q][4] = -inv[q][1] * s[0];
    J[q][5] = -inv[q][1] * s[1];
  }
  const C = matMul(matMul(J, fit.covariance), transpose(J)).map(r =>
    r.map(v => v / ARCSEC ** 2)
  );
  const east = Math.sqrt(Math.max(0, C[0][0]));
  const north = Math.sqrt(Math.max(0, C[1][1]));
  return {
    east,
    north,
    radius: Math.sqrt(Math.max(0, C[0][0] + C[1][1])),
    covariance: C,
  };
}

/**
 * The residuals of stars against a WCS that was not fitted to them (a header's,
 * say): the same numbers a fit returns, with the verdict they earn.
 * @param {object} wcs - {crpix, crval, cd}
 */
export function checkWcs(wcs, stars) {
  const dsc = describeWcs(wcs);
  let chi2 = 0;
  let sq = 0;
  let big = 0;
  const residuals = [];
  for (const [i, s] of stars.entries()) {
    const p = pixelOf(wcs, s.ra, s.dec);
    if (!p || !finite(s.x) || !finite(s.y))
      return refuse('malformed', `star ${s.id ?? i + 1} cannot be placed`, {
        id: String(s.id ?? i + 1),
      });
    const sg = s.sigma ?? DEFAULT_SIGMA;
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    chi2 += (dx * dx + dy * dy) / (sg * sg);
    sq += dx * dx + dy * dy;
    big = Math.max(big, Math.hypot(dx, dy));
    residuals.push({
      id: s.id ?? String(i + 1),
      dx,
      dy,
      pix: Math.hypot(dx, dy),
      arcsec: Math.hypot(dx, dy) * dsc.scale,
      sigma: sg,
    });
  }
  const n = stars.length;
  // Nothing was fitted: every residual is a test, so the degrees of freedom are all 2n.
  const j = judge(chi2, 2 * n);
  return {
    ok: true,
    status: 'checked',
    residuals,
    stats: {
      n,
      dof: 2 * n,
      chi2,
      p: j.p,
      rmsPix: Math.sqrt(sq / n),
      rmsArcsec: Math.sqrt(sq / n) * dsc.scale,
      maxPix: big,
      sigmaAssumed: stars.some(s => s.sigma === undefined),
    },
    consistent: j.consistent,
    verdict: j.verdict,
  };
}

// ---- registration -----------------------------------------------------------------

/**
 * The translation and rotation that carry one frame's sources onto another's:
 * b = R(theta) a + t, from matched pairs, a weighted Procrustes fit (closed
 * form), with the residual distribution.
 * @param {{id?: string, a: number[], b: number[], sigmaA?: number, sigmaB?: number}[]} pairs
 * @param {{sigma?: number}} [opts] - the default pixel uncertainty of each centroid
 */
export function register(pairs, opts = {}) {
  const dflt = opts.sigma ?? DEFAULT_SIGMA;
  if (!Array.isArray(pairs)) throw new TypeError('pairs must be a list');
  if (pairs.length < RULES.minRegistrationSources)
    return refuse(
      'too-few',
      `${pairs.length} matched source${pairs.length === 1 ? '' : 's'}: at least ${RULES.minRegistrationSources} are needed to register two frames and say how well`,
      { n: pairs.length, min: RULES.minRegistrationSources }
    );
  for (const [i, p] of pairs.entries())
    if (
      !fin2(p?.a) ||
      !fin2(p?.b) ||
      ![p.sigmaA, p.sigmaB].every(
        v => v === undefined || (v > 0 && v < Infinity)
      )
    )
      return refuse(
        'malformed',
        `pair ${p?.id ?? i + 1} has not got two finite positions and positive uncertainties`,
        { id: String(p?.id ?? i + 1) }
      );
  const w = pairs.map(
    p => 1 / ((p.sigmaA ?? dflt) ** 2 + (p.sigmaB ?? dflt) ** 2)
  );
  const W = w.reduce((a, v) => a + v, 0);
  const cen = k => [
    pairs.reduce((s, p, i) => s + w[i] * p[k][0], 0) / W,
    pairs.reduce((s, p, i) => s + w[i] * p[k][1], 0) / W,
  ];
  const ca = cen('a');
  const cb = cen('b');
  let cross = 0;
  let dot = 0;
  let saa = 0;
  for (const [i, p] of pairs.entries()) {
    const ax = p.a[0] - ca[0];
    const ay = p.a[1] - ca[1];
    const bx = p.b[0] - cb[0];
    const by = p.b[1] - cb[1];
    cross += w[i] * (ax * by - ay * bx);
    dot += w[i] * (ax * bx + ay * by);
    saa += w[i] * (ax * ax + ay * ay);
  }
  const rmsA = Math.sqrt(
    pairs.reduce(
      (s, p) => s + (p.a[0] - ca[0]) ** 2 + (p.a[1] - ca[1]) ** 2,
      0
    ) / pairs.length
  );
  if (!(rmsA >= RULES.minRegistrationRms) || !(saa > 0))
    return refuse(
      'degenerate',
      `the sources lie within ${Math.round(rmsA * 100) / 100} pixel (rms) of one another in the first frame: they cannot fix a rotation`,
      { rms: Math.round(rmsA * 100) / 100 }
    );
  const theta = Math.atan2(cross, dot);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const t = [cb[0] - (c * ca[0] - s * ca[1]), cb[1] - (s * ca[0] + c * ca[1])];
  const reg = { theta, t, about: ca, centre: cb };
  let chi2 = 0;
  let sq = 0;
  const rad = [];
  const residuals = pairs.map((p, i) => {
    const m = applyRegistration(reg, p.a[0], p.a[1]);
    const dx = p.b[0] - m[0];
    const dy = p.b[1] - m[1];
    chi2 += w[i] * (dx * dx + dy * dy);
    sq += dx * dx + dy * dy;
    rad.push(Math.hypot(dx, dy));
    return {
      id: p.id ?? String(i + 1),
      dx,
      dy,
      pix: Math.hypot(dx, dy),
      sigma: Math.sqrt(1 / w[i]),
    };
  });
  const sorted = rad.slice().sort((a, b) => a - b);
  const q = f => {
    const h = (sorted.length - 1) * f;
    const lo = Math.floor(h);
    return (
      sorted[lo] +
      (sorted[Math.min(sorted.length - 1, lo + 1)] - sorted[lo]) * (h - lo)
    );
  };
  const dof = 2 * pairs.length - 3;
  const j = judge(chi2, dof);
  return {
    ok: true,
    status: 'solved',
    ...reg,
    thetaDeg: theta / RAD,
    sigmaTheta: Math.sqrt(1 / saa),
    sigmaCentre: Math.sqrt(1 / W),
    residuals,
    distribution: {
      n: rad.length,
      rms: Math.sqrt(sq / rad.length),
      median: q(0.5),
      p90: q(0.9),
      max: sorted[sorted.length - 1],
    },
    stats: { n: pairs.length, dof, chi2, p: j.p },
    consistent: j.consistent,
    verdict: j.verdict,
  };
}

/** A position of the first frame in the second. */
export function applyRegistration(reg, x, y) {
  const c = Math.cos(reg.theta);
  const s = Math.sin(reg.theta);
  return [c * x - s * y + reg.t[0], s * x + c * y + reg.t[1]];
}

/** A position of the second frame in the first. */
export function invertRegistration(reg, x, y) {
  const c = Math.cos(reg.theta);
  const s = Math.sin(reg.theta);
  const dx = x - reg.t[0];
  const dy = y - reg.t[1];
  return [c * dx + s * dy, -s * dx + c * dy];
}

/**
 * The uncertainty of where a first-frame position lands in the second: the
 * centroid's (about the sources) and the rotation's, growing with the distance
 * from the sources. Pixels; the covariance is in x and y of the second frame.
 */
export function registrationUncertaintyAt(reg, x, y) {
  const q = [x - reg.about[0], y - reg.about[1]];
  const c = Math.cos(reg.theta);
  const s = Math.sin(reg.theta);
  const r = [c * q[0] - s * q[1], s * q[0] + c * q[1]];
  const v = reg.sigmaCentre ** 2;
  const t2 = reg.sigmaTheta ** 2;
  const C = [
    [v + t2 * r[1] * r[1], -t2 * r[0] * r[1]],
    [-t2 * r[0] * r[1], v + t2 * r[0] * r[0]],
  ];
  return { sx: Math.sqrt(C[0][0]), sy: Math.sqrt(C[1][1]), covariance: C };
}

/**
 * The WCS of the second frame, given the first frame's and the registration of
 * the first onto the second: the same sky, carried by the shift and rotation.
 */
export function carryWcs(wcs, reg) {
  const c = Math.cos(reg.theta);
  const s = Math.sin(reg.theta);
  const [x0, y0] = applyRegistration(reg, wcs.crpix[0], wcs.crpix[1]);
  // pixels_A = R^T (pixels_B - t): CD_B = CD_A R^T
  const m = wcs.cd;
  return {
    ...wcs,
    crpix: [x0, y0],
    cd: [
      [m[0][0] * c + m[0][1] * -s, m[0][0] * s + m[0][1] * c],
      [m[1][0] * c + m[1][1] * -s, m[1][0] * s + m[1][1] * c],
    ],
  };
}

// ---- angles as text -----------------------------------------------------------------

/**
 * An angle typed as decimal degrees, or as sexagesimal (`5h34m30s`, `5:34:30`,
 * `-5 23 28.1`): degrees, or hours for a right ascension when `hours` is set.
 * NaN when it is neither.
 */
export function parseAngle(text, { hours = false } = {}) {
  const t = String(text ?? '')
    .trim()
    .replace(/[°′″'"]/g, ' ')
    .replace(/[hdms:]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return NaN;
  const parts = t.split(' ');
  if (parts.length > 3 || !parts.every(p => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(p)))
    return NaN;
  const neg = parts[0].startsWith('-');
  const v = parts.map(Number);
  if (v.slice(1).some(a => a < 0)) return NaN;
  const mag = Math.abs(v[0]) + (v[1] ?? 0) / 60 + (v[2] ?? 0) / 3600;
  if (parts.length > 1 && (v[1] >= 60 || (v[2] ?? 0) >= 60)) return NaN;
  return (neg ? -mag : mag) * (hours ? 15 : 1);
}

const pad = (v, w, tenths = false) =>
  `${Math.floor(v)}`.padStart(w, '0') +
  (tenths ? `.${Math.round((v - Math.floor(v)) * 10) % 10}` : '');
/** Right ascension in degrees as `hh:mm:ss.s`. */
export function formatRa(deg) {
  const s = Math.round((wrap360(deg) / 15) * 36000) / 10;
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s % 60, 2, true)}`;
}
/** Declination in degrees as `+dd:mm:ss`. */
export function formatDec(deg) {
  const a = Math.round(Math.abs(deg) * 3600);
  return `${deg < 0 ? '-' : '+'}${pad(Math.floor(a / 3600), 2)}:${pad(Math.floor((a % 3600) / 60), 2)}:${pad(a % 60, 2)}`;
}
