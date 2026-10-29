// =============================================================================
// A detached eclipsing binary: two spheres on a Keplerian orbit (Prompt 217)
// -----------------------------------------------------------------------------
// Two stars, each a sphere with quadratic limb darkening, on a circular or
// eccentric orbit about their barycentre, seen from far away at inclination i.
// Nothing else: no reflection, no ellipsoidal variation, no Doppler beaming, no
// gravity darkening, no spots, no light-travel time, no apsidal motion, no third
// body. A star that has those effects is outside the model, and the residuals
// of a fit say so (BINARIES.md).
//
// Parameters (one band):
//   rsum   (R1 + R2) / a        the sum of the fractional radii
//   k      R2 / R1              the radius ratio
//   inc    inclination, degrees (90 is edge on)
//   J      S2 / S1              the central surface brightness ratio
//   ecosw, esinw                e cos w and e sin w
//   tc, P                       time of the primary conjunction, period
//   ldA, ldB                    quadratic coefficients [u1, u2] of each star
//   thirdLight                  l3, the fraction of the total light that is not
//                               from either star (fixed, never fitted here)
//
// Conventions. Star 1 is the star eclipsed at the primary eclipse, when star 2
// is in front of it, at time tc. w is the argument of periastron of the orbit
// of star 2 relative to star 1 as in Winn (2010, "Transits and Occultations"):
// the primary eclipse is at true anomaly pi/2 - w, the secondary at 3 pi/2 - w,
// and e cos w > 0 puts the secondary after phase 0.5. The argument of the
// primary star's own orbit, the one a radial-velocity paper quotes, is w + 180
// degrees. With J <= 1 star 1 has the higher central surface brightness and the
// primary eclipse is the deeper; the fitter keeps J there, so the two stars are
// never exchanged by the fit.
//
// The light of star i is S_i pi R_i^2 (1 - u1/3 - u2/6): the light ratio is
// L2/L1 = J k^2 (1 - uB1/3 - uB2/6) / (1 - uA1/3 - uA2/6). An eclipsed star's
// light lost is the occultation of its disk by the other star's, the quadrature
// of js/inference/transit.js `occultation` (Mandel and Agol 2002 by direct
// quadrature), valid for any radius ratio, so the same function serves both
// eclipses and a larger or a smaller occulter. The curve is exactly 1 out of
// eclipse. Pure: no DOM, no state.
//
// What eclipses fix, and what they do not (the review's corrections):
//   - the secondary's phase gives e cos w, and nearly alone: the phase minus
//     one half is (2/pi) e cos w to first order (A7), exactly Sterne's (1939)
//     expression at inc = 90;
//   - the ratio of the two durations gives e sin w, weakly: it is
//     (1 + e sin w)/(1 - e sin w) to first order (A8), a difference of two
//     durations each known to its own, larger, relative error;
//   - a grazing eclipse leaves k, rsum and inc along one curved valley: the
//     fit says so (identifiability(), the rank analysis of js/inference/fit.js).
// =============================================================================

import { solveKepler } from '../orbital.js';
import { occultation } from '../inference/transit.js';

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math, Float64Array, Number } = globalThis;

const RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

/** The limb-darkened disk's light, relative to the central intensity: pi (1 - u1/3 - u2/6). */
const diskLight = ([u1, u2]) => 1 - u1 / 3 - u2 / 6;

/**
 * The fixed numbers of an orbit: e, w, the fractional radii and the mean
 * anomaly at the primary conjunction.
 * @param {object} p - rsum, k, ecosw, esinw
 */
export function orbitConstants(p) {
  const e = Math.hypot(p.ecosw || 0, p.esinw || 0);
  const w = e > 0 ? Math.atan2(p.esinw, p.ecosw) : Math.PI / 2;
  const r1 = p.rsum / (1 + p.k);
  const r2 = p.k * r1;
  const anomaly = f =>
    e > 0
      ? 2 *
        Math.atan2(
          Math.sqrt(1 - e) * Math.sin(f / 2),
          Math.sqrt(1 + e) * Math.cos(f / 2)
        )
      : f;
  const meanAt = f => {
    const E = anomaly(f);
    return E - e * Math.sin(E);
  };
  return {
    e,
    w,
    r1,
    r2,
    sini: Math.sin(p.inc * RAD),
    cosi: Math.cos(p.inc * RAD),
    Mc: meanAt(Math.PI / 2 - w),
    Ms: meanAt((3 * Math.PI) / 2 - w),
  };
}

/** Light ratio L2/L1 in the band. */
export function lightRatio(p) {
  return (p.J * p.k * p.k * diskLight(p.ldB)) / diskLight(p.ldA);
}

/**
 * The sky separation of the centres, in units of a, and whether star 2 is in
 * front (the primary eclipse) at a time.
 * @returns {{d: number, front: boolean}}
 */
export function sky(t, p, c = orbitConstants(p)) {
  const M = c.Mc + (TWO_PI * (t - p.tc)) / p.P;
  let f;
  let r;
  if (c.e > 0) {
    const E = solveKepler(M, c.e);
    f =
      2 *
      Math.atan2(
        Math.sqrt(1 + c.e) * Math.sin(E / 2),
        Math.sqrt(1 - c.e) * Math.cos(E / 2)
      );
    r = (1 - c.e * c.e) / (1 + c.e * Math.cos(f));
  } else {
    f = M;
    r = 1;
  }
  const s = Math.sin(f + c.w) * c.sini;
  return { d: r * Math.sqrt(Math.max(0, 1 - s * s)), front: s > 0 };
}

/** Whether a point is at all inside either eclipse is the separation against r1 + r2. */
function pointFlux(t, p, c, L, la, lb) {
  const { d, front } = sky(t, p, c);
  const reach = c.r1 + c.r2;
  if (d >= reach) return 1;
  if (front) {
    const lost = occultation(d / c.r1, p.k, la[0], la[1], p.annuli);
    return (1 - lost + L) / (1 + L);
  }
  const lost = occultation(d / c.r2, 1 / p.k, lb[0], lb[1], p.annuli);
  return (1 + L * (1 - lost)) / (1 + L);
}

/**
 * The relative flux at each time, 1 out of eclipse, with the integration time
 * of each point averaged over `supersample` instants.
 * @param {ArrayLike<number>} times
 * @param {object} p - tc, P, rsum, k, inc, J, ecosw, esinw, ldA, ldB, thirdLight,
 *   annuli (quadrature nodes, 64)
 * @param {{exposure?: number, supersample?: number}} [opts]
 */
export function eclipseFlux(times, p, opts = {}) {
  const { exposure = 0, supersample = 1 } = opts;
  const c = orbitConstants(p);
  const L = lightRatio(p);
  const l3 = p.thirdLight || 0;
  const la = p.ldA;
  const lb = p.ldB;
  const n = exposure > 0 ? Math.max(1, Math.round(supersample)) : 1;
  const out = new Float64Array(times.length);
  for (let i = 0; i < times.length; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const tj =
        n === 1 ? times[i] : times[i] + exposure * ((j + 0.5) / n - 0.5);
      sum += pointFlux(tj, p, c, L, la, lb);
    }
    out[i] = (1 - l3) * (sum / n) + l3;
  }
  return out;
}

/** The time of the secondary conjunction (star 1 in front of star 2) after tc, within one period. */
export function secondaryTime(p, c = orbitConstants(p)) {
  let dM = c.Ms - c.Mc;
  dM -= TWO_PI * Math.floor(dM / TWO_PI);
  return p.tc + (p.P * dM) / TWO_PI;
}

/** The phase of the secondary conjunction after the primary's, in [0, 1). */
export function secondaryPhase(p) {
  return (secondaryTime(p) - p.tc) / p.P;
}

/**
 * The secondary's phase from e and w alone, at inc = 90: Sterne (1939),
 * 0.5 + (1/pi) [arctan(x / sqrt(1 - e^2)) + x sqrt(1 - e^2) / (1 - e^2 sin^2 w)],
 * x = e cos w. The closed form the validation holds the orbit to (A3).
 */
export function secondaryPhaseClosed(e, wDeg) {
  const w = wDeg * RAD;
  const x = e * Math.cos(w);
  const s = Math.sqrt(1 - e * e);
  return (
    0.5 +
    (Math.atan(x / s) + (x * s) / (1 - e * e * Math.sin(w) ** 2)) / Math.PI
  );
}

/** e cos w from a secondary phase, to first order in e: (pi/2)(phase - 0.5). */
export const ecoswFromPhase = phase => (Math.PI / 2) * (phase - 0.5);

/** The duration ratio secondary/primary to first order in e: (1 + e sin w)/(1 - e sin w). */
export const durationRatioFromEsinw = esinw => (1 + esinw) / (1 - esinw);

/** The time of least separation near a conjunction (golden section over +-0.05 P), and that separation. */
function leastSeparation(p, c, near) {
  let a = near - 0.05 * p.P;
  let b = near + 0.05 * p.P;
  const g = (Math.sqrt(5) - 1) / 2;
  let x1 = b - g * (b - a);
  let x2 = a + g * (b - a);
  let f1 = sky(x1, p, c).d;
  let f2 = sky(x2, p, c).d;
  for (let i = 0; i < 80; i++) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - g * (b - a);
      f1 = sky(x1, p, c).d;
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + g * (b - a);
      f2 = sky(x2, p, c).d;
    }
  }
  const t = (a + b) / 2;
  return { t, d: sky(t, p, c).d };
}

/**
 * First and fourth contact of one eclipse, exactly (the sky separation equals
 * r1 + r2), or null when the stars never touch there.
 * @param {object} p
 * @param {'primary'|'secondary'} which
 * @returns {{first: number, last: number, duration: number, middle: number,
 *   minSeparation: number}|null}
 */
export function contacts(p, which = 'primary') {
  const c = orbitConstants(p);
  const near = which === 'primary' ? p.tc : secondaryTime(p, c);
  const { t, d } = leastSeparation(p, c, near);
  const reach = c.r1 + c.r2;
  if (!(d < reach)) return null;
  const side = dir => {
    let lo = 0;
    let hi = 0.02 * p.P;
    // Out until the stars are apart, at most a quarter period.
    while (sky(t + dir * hi, p, c).d < reach && hi < 0.25 * p.P) hi *= 1.5;
    for (let i = 0; i < 100; i++) {
      const m = (lo + hi) / 2;
      if (sky(t + dir * m, p, c).d < reach) lo = m;
      else hi = m;
    }
    return t + (dir * (lo + hi)) / 2;
  };
  const first = side(-1);
  const last = side(1);
  return {
    first,
    last,
    duration: last - first,
    middle: (first + last) / 2,
    minSeparation: d,
  };
}

/**
 * Everything derived from a parameter set, with the formulas' own names.
 * @returns {object} r1, r2, e, w (degrees), lightRatio, b1 (the least
 *   separation in units of r1, primary), durations, secondaryPhase
 */
export function derivedQuantities(p) {
  const c = orbitConstants(p);
  const prim = contacts(p, 'primary');
  const sec = contacts(p, 'secondary');
  return {
    r1: c.r1,
    r2: c.r2,
    e: c.e,
    w: (c.w * 180) / Math.PI,
    lightRatio: lightRatio(p),
    impact: prim ? prim.minSeparation / c.r1 : Math.abs(c.cosi) / c.r1,
    primaryDuration: prim ? prim.duration : NaN,
    secondaryDuration: sec ? sec.duration : NaN,
    secondaryPhase: secondaryPhase(p),
  };
}

/** Kipping's lower bound check: a physical (u1, u2) pair keeps the star brightest at its centre. */
export function physicalLimbDarkening([u1, u2]) {
  return u1 + u2 < 1 && u1 >= 0 && u1 + 2 * u2 >= 0;
}

/**
 * What a finished fit says about each geometric parameter. A parameter is NOT
 * CONSTRAINED when the rank analysis of the fit lists it, or its uncertainty is
 * above `relSigma` (25%) of its value, or it sits on a bound; the radius ratio
 * of a grazing eclipse is the classic case (the three quantities rsum, k and
 * inc lie on one valley of chi-square, and any k in a wide range fits). The
 * rule is fixed by tests/fixtures/binaries/thresholds.json (D1) and measured
 * on a control ensemble that it must leave alone.
 * @param {{parameters: Array, rank?: {notConstrained?: string[]}}} fit
 * @param {{relSigma?: number}} [opts]
 * @returns {{status: 'constrained'|'not constrained', parameters: object, reasons: string[]}}
 */
export function identifiability(fit, { relSigma = 0.25 } = {}) {
  const listed = new Set(fit.rank?.notConstrained || []);
  const out = {};
  const reasons = [];
  for (const q of fit.parameters) {
    if (q.mode !== 'fitted') continue;
    let why = null;
    if (listed.has(q.name)) why = 'rank';
    else if (q.atBound) why = 'bound';
    else if (
      ['k', 'rsum', 'J'].includes(q.name) &&
      Number.isFinite(q.sigma) &&
      Math.abs(q.value) > 0 &&
      (q.sigmaScaled ?? q.sigma) / Math.abs(q.value) > relSigma
    )
      why = 'uncertain';
    else if (['k', 'rsum', 'J'].includes(q.name) && !Number.isFinite(q.sigma))
      why = 'singular';
    out[q.name] = why
      ? { status: 'not constrained', why }
      : { status: 'constrained' };
    if (why) reasons.push(`${q.name}: ${why}`);
  }
  return {
    status: reasons.length ? 'not constrained' : 'constrained',
    parameters: out,
    reasons,
  };
}

/** The residual test of the validation contract (D2): reduced chi-square or the red-noise factor above 1.5. */
export function residualsFail(fit, { reducedChi2 = 1.5, beta = 1.5 } = {}) {
  return (
    fit.reducedChi2 > reducedChi2 ||
    (Number.isFinite(fit.redNoise?.beta) && fit.redNoise.beta > beta)
  );
}

export { Number };
