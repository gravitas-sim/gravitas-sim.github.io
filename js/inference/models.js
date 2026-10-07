// =============================================================================
// The models the inference core fits, each a small named parameter set
// -----------------------------------------------------------------------------
// A model says, for every parameter: its name, unit, physical bounds, a
// default start, and whether a reader may fit it or fix it. The fitter
// (./fit.js) asks it for three things - a prediction, the exact solution of
// its linear parameters, and its derived quantities - and nothing else.
//
// Three kinds of parameter, never confused in a result:
//   fitted    searched within its bounds
//   fixed     held at a value the reader or the model supplies
//   derived   computed from the fitted and fixed ones, with an uncertainty
//             propagated through the covariance (linearized), never searched
//
// What each model deliberately does not claim is in `notClaimed`, and a result
// carries it.
// =============================================================================

import { halfDuration, limbDarkening, transitFlux } from './transit.js';
import { eccentricity, rvCurve } from './rv.js';
import { solveSpd } from './fit.js';

/**
 * A transit: circular orbit, quadratic limb darkening, a baseline flux.
 * Time in the data's own days; the epoch t0 is a time in that same format.
 */
export const TRANSIT = {
  id: 'transit-quadratic',
  version: '1.0.0',
  quantity: 'relative flux against time',
  parameters: [
    { name: 't0', unit: 'd', label: 'mid-transit time' },
    { name: 'P', unit: 'd', label: 'period' },
    { name: 'k', unit: '', label: 'Rp/R*', lo: 0.005, hi: 0.5 },
    { name: 'aRs', unit: '', label: 'a/R*', lo: 1.5, hi: 200 },
    { name: 'b', unit: '', label: 'impact parameter', lo: 0, hi: 1.5 },
    {
      name: 'q1',
      unit: '',
      label: 'limb darkening q1',
      lo: 0,
      hi: 1,
      start: 0.36,
    },
    {
      name: 'q2',
      unit: '',
      label: 'limb darkening q2',
      lo: 0,
      hi: 1,
      start: 0.3,
    },
  ],
  linear: [{ name: 'f0', unit: '', label: 'baseline flux' }],
  notClaimed: [
    "The planet's mass and density: a transit alone does not measure them, and no radial-velocity data for this star is paired with it.",
    "The star's density from a/R* and P: it assumes a circular orbit, and density claims wait for a joint fit.",
    'Eccentricity: the orbit is taken as circular, which changes the duration if it is not.',
    "Dilution by other stars' light as a result: it is a fixed setting (default 0, for data already corrected, as TESS PDCSAP is), because a light curve alone cannot tell it from a smaller planet.",
  ],
  assumptions: [
    'A circular orbit.',
    'The quadratic limb-darkening law, parameterized by q1, q2 in [0, 1] (Kipping 2013), which keeps the star brightest at its center.',
    'Each point is the mean over its exposure, sampled at `supersample` instants.',
  ],

  predict(v, x, settings) {
    const { u1, u2 } = limbDarkening(v.q1, v.q2);
    const shape = transitFlux(
      x,
      { t0: v.t0, P: v.P, k: v.k, aRs: v.aRs, b: v.b, u1, u2 },
      settings
    );
    // Light from other stars in the aperture, as a fraction of the total:
    // it fills the transit in by that fraction. Fixed, never fitted - a
    // light curve alone cannot tell it from a smaller planet.
    const dilution = settings.dilution || 0;
    if (dilution > 0) {
      for (let i = 0; i < shape.length; i++)
        shape[i] = 1 - (1 - shape[i]) * (1 - dilution);
    }
    return shape;
  },

  /** y = f0 * shape: f0 is the weighted mean ratio, exactly. */
  solveLinear(data, w, shape) {
    let a = 0;
    let c = 0;
    for (let i = 0; i < shape.length; i++) {
      a += w[i] * data.y[i] * shape[i];
      c += w[i] * shape[i] * shape[i];
    }
    const f0 = c > 0 ? a / c : 1;
    return { fit: shape.map(s => f0 * s), linear: { f0 } };
  },

  /** A transit that has b past 1 + k never touches the star: keep inside. */
  project(theta, free) {
    const bi = free.findIndex(p => p.name === 'b');
    const ki = free.findIndex(p => p.name === 'k');
    if (bi < 0) return theta;
    const k = ki >= 0 ? theta[ki] : (free.fixedK ?? 0);
    const out = theta.slice();
    out[bi] = Math.min(out[bi], 1 + k - 1e-6);
    return out;
  },

  derived(v, settings) {
    const { u1, u2 } = limbDarkening(v.q1, v.q2);
    const cosi = v.b / v.aRs;
    const half = halfDuration(v);
    const center = transitFlux([v.t0], { ...v, u1, u2 })[0];
    const out = {
      // The planet's own depth, before any dilution the data carries.
      depth: { value: 1 - center, unit: '', label: 'depth at mid-transit' },
      // In the time column's own unit, like t0 and P: a light curve counted
      // in hours has its duration in hours.
      T14: {
        value: Number.isFinite(half) ? 2 * half : NaN,
        unit: 'd',
        label: 'total duration',
      },
      inclination: {
        value: (Math.acos(Math.min(1, cosi)) * 180) / Math.PI,
        unit: 'deg',
        label: 'inclination',
      },
      u1: { value: u1, unit: '', label: 'limb darkening u1' },
      u2: { value: u2, unit: '', label: 'limb darkening u2' },
    };
    if (settings.stellarRadius) {
      // R_sun / R_Jup (IAU 2015 nominal, equatorial): 695700 / 71492 km.
      const rj = (v.k * settings.stellarRadius.value * 695700) / 71492;
      out.Rp = {
        value: rj,
        unit: 'RJup',
        label: 'planet radius',
        external: { stellarRadius: settings.stellarRadius },
      };
    }
    return out;
  },
};

/**
 * A Keplerian radial-velocity orbit, with a zero point and a jitter for each
 * instrument. Velocities in the data's own unit; times in days.
 */
export const RV = {
  id: 'rv-keplerian',
  version: '1.0.0',
  quantity: 'radial velocity against time',
  parameters: [
    { name: 'P', unit: 'd', label: 'period' },
    { name: 'tc', unit: 'd', label: 'time of inferior conjunction' },
    { name: 'K', unit: 'm/s', label: 'semi-amplitude', lo: 0, hi: 2000 },
    {
      name: 'sqrtEcosw',
      unit: '',
      label: 'sqrt(e) cos(omega)',
      lo: -0.95,
      hi: 0.95,
      start: 0,
    },
    {
      name: 'sqrtEsinw',
      unit: '',
      label: 'sqrt(e) sin(omega)',
      lo: -0.95,
      hi: 0.95,
      start: 0,
    },
  ],
  linear: [{ name: 'gamma', unit: 'm/s', label: 'zero point, per instrument' }],
  // Not a least-squares parameter: with jitter s the objective is
  //   -2 ln L = sum r^2 / (sigma^2 + s^2) + sum ln(sigma^2 + s^2),
  // so s is found by a bounded one-dimensional search outside the fit, and
  // the fit inside is weighted least squares at each trial s (./infer.js).
  nuisance: [{ name: 'jitter', unit: 'm/s', label: 'jitter', lo: 0, hi: 200 }],
  notClaimed: [
    "The planet's true mass: radial velocity alone gives Mp sin i, and only with the star's mass.",
    'Anything paired with a transit: the joint fit is later work.',
  ],
  assumptions: [
    'One planet on a Keplerian orbit.',
    "Jitter adds in quadrature to every point's error bar, one value for all instruments.",
  ],

  predict(v, x) {
    return rvCurve(x, v);
  },

  /** y = shape + gamma_g: each instrument's zero point, weighted, exactly. */
  solveLinear(data, w, shape) {
    const groups = data.groups || new Int32Array(shape.length);
    const sums = new Map();
    for (let i = 0; i < shape.length; i++) {
      const g = groups[i];
      const s = sums.get(g) || { a: 0, c: 0 };
      s.a += w[i] * (data.y[i] - shape[i]);
      s.c += w[i];
      sums.set(g, s);
    }
    const gamma = {};
    for (const [g, s] of sums) gamma[g] = s.c > 0 ? s.a / s.c : 0;
    return {
      fit: shape.map((s, i) => s + gamma[groups[i]]),
      linear: { gamma },
    };
  },

  /** Keep e below 0.95^2 by scaling the pair back onto the circle. */
  project(theta, free) {
    const a = free.findIndex(p => p.name === 'sqrtEcosw');
    const b = free.findIndex(p => p.name === 'sqrtEsinw');
    if (a < 0 || b < 0) return theta;
    const r = Math.hypot(theta[a], theta[b]);
    if (r <= 0.95) return theta;
    const out = theta.slice();
    out[a] *= 0.95 / r;
    out[b] *= 0.95 / r;
    return out;
  },

  derived(v) {
    const { e, omega } = eccentricity(v.sqrtEcosw, v.sqrtEsinw);
    return {
      e: { value: e, unit: '', label: 'eccentricity' },
      omega: {
        value: (omega * 180) / Math.PI,
        unit: 'deg',
        label: 'argument of periastron',
      },
    };
  },
};

// --- Models for a table of x against y --------------------------------------------
// A table - an experiment's means against a setting, a measured series that is
// not a time series - has no physics of its own to claim, so these say only
// what their formula says. Units are sentinels the panel and the notebook
// envelope resolve from the data's own (js/analysis/seams.js modelUnit()):
// 'y' is the value column's unit, 'x' the argument's.
//
// Every one is fitted by the same weighted least squares as the others, from
// an exact or log-log start, with the covariance, the profile interval and the
// scaled uncertainty of ./infer.js. Each `starts()` is only a start: the
// search is bounded by the reader's bounds, so a start never decides a result.

const { Math: M, Float64Array: F64 } = globalThis;

/** Weighted normal equations of y = sum c_j u^j, u = x - x0, or null. */
function polynomialStart(data, degree, x0) {
  const n = degree + 1;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (let i = 0; i < data.x.length; i++) {
    const w = data.sigma ? 1 / (data.sigma[i] * data.sigma[i]) : 1;
    const u = data.x[i] - x0;
    for (let j = 0; j < n; j++) {
      b[j] += w * data.y[i] * u ** j;
      for (let k = 0; k < n; k++) A[j][k] += w * u ** (j + k);
    }
  }
  return solveSpd(A, b);
}

/**
 * A polynomial in the distance from a center x0, which the manifest records
 * (settings.x0): centering is what keeps the coefficients from being all but
 * the same number, and it is a setting rather than a guess.
 */
function polynomial(degree, label) {
  const names = ['c0', 'c1', 'c2'].slice(0, degree + 1);
  return {
    id: `poly-${degree}`,
    version: '1.0.0',
    quantity: `${label} of y against x`,
    tabular: true,
    centered: true,
    // The constant is this model with the slope(s) at zero, an interior point
    // of their range, so the likelihood-ratio test against it is not on a
    // boundary (js/analysis/modelCompare.js nestedIn()).
    nullAtBoundary: false,
    parameters: names.map((n, j) => ({
      name: n,
      unit: j === 0 ? 'y' : j === 1 ? 'y/x' : 'y/x^2',
      label: ['value at the center', 'slope at the center', 'curvature term'][
        j
      ],
    })),
    linear: [],
    notClaimed: [
      `Why y changes with x: ${label} describes the table, and does not say what produced it.`,
      'Anything beyond the range of x measured: the polynomial has no reason to hold there.',
      'That the error bars are right: they are taken as given, and a reduced chi-square above 1 says they may not be.',
    ],
    assumptions: [
      `y = ${names.map((n, j) => (j === 0 ? n : `${n} (x - x0)${j > 1 ? `^${j}` : ''}`)).join(' + ')}, with x0 recorded in the settings.`,
      'The uncertainty column is the standard deviation of each y, independent between rows; without one every row weighs the same.',
    ],
    predict(v, x, settings) {
      const x0 = settings.x0 ?? 0;
      const out = new F64(x.length);
      for (let i = 0; i < x.length; i++) {
        const u = x[i] - x0;
        let y = 0;
        for (let j = degree; j >= 0; j--) y = y * u + v[`c${j}`];
        out[i] = y;
      }
      return out;
    },
    solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
    starts(data, request) {
      const c = polynomialStart(data, degree, request.settings?.x0 ?? 0);
      return [Object.fromEntries(names.map((n, j) => [n, c ? c[j] : 0]))];
    },
    derived: () => ({}),
  };
}

/** y = A x^p for x > 0. */
export const POWER_LAW = {
  id: 'power-law',
  version: '1.0.0',
  quantity: 'y as a power of x',
  tabular: true,
  parameters: [
    { name: 'A', unit: 'y/x^p', label: 'value at x = 1' },
    { name: 'p', unit: '', label: 'exponent' },
  ],
  linear: [],
  notClaimed: [
    'That the relation is a law: a power law is the straight line on log-log axes, and a curve that is not a power law can look like one over a short range.',
    "The exponent's uncertainty away from the data: it is the fit's own, at the rows given, with the error bars as given.",
    "A has the unit of y over the unit of x to the power p: it is the value at x = 1 in the column's unit, so it moves with the unit chosen for x.",
  ],
  assumptions: [
    'y = A x^p, fitted to y itself by weighted least squares, not to its logarithm: each row keeps the weight its uncertainty gives it.',
    'Every x is positive.',
    'The uncertainty column is the standard deviation of each y, independent between rows; without one every row weighs the same.',
  ],
  /** x must be positive, or x^p is not a real number for every p. */
  requires(data) {
    for (const v of data.x)
      if (!(v > 0)) return 'a power law needs every x above zero';
    return null;
  },
  predict(v, x) {
    const out = new F64(x.length);
    for (let i = 0; i < x.length; i++) out[i] = v.A * M.pow(x[i], v.p);
    return out;
  },
  solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
  starts(data) {
    const n = data.x.length;
    const out = [];
    // A, for a given p, is linear: exactly the weighted fit of y to x^p.
    const at = p => {
      let a = 0;
      let c = 0;
      for (let i = 0; i < n; i++) {
        const w = data.sigma ? 1 / (data.sigma[i] * data.sigma[i]) : 1;
        const g = M.pow(data.x[i], p);
        a += w * data.y[i] * g;
        c += w * g * g;
      }
      return { A: c > 0 ? a / c : 0, p };
    };
    // The straight line through ln y against ln x, where y is positive.
    if (data.y.every(v => v > 0)) {
      const lx = Array.from(data.x, M.log);
      const ly = Array.from(data.y, M.log);
      const w = Array.from(data.y, (v, i) =>
        data.sigma ? (v / data.sigma[i]) ** 2 : 1
      );
      const S = w.reduce((a, b) => a + b, 0);
      const mx = w.reduce((a, b, i) => a + b * lx[i], 0) / S;
      const my = w.reduce((a, b, i) => a + b * ly[i], 0) / S;
      let sxy = 0;
      let sxx = 0;
      for (let i = 0; i < n; i++) {
        sxy += w[i] * (lx[i] - mx) * (ly[i] - my);
        sxx += w[i] * (lx[i] - mx) ** 2;
      }
      if (sxx > 0) out.push({ A: M.exp(my - (sxy / sxx) * mx), p: sxy / sxx });
    }
    for (const p of [1, -1, 2]) out.push(at(p));
    return out;
  },
  derived: () => ({}),
};

export const POLY_1 = polynomial(1, 'a straight line');
export const POLY_2 = polynomial(2, 'a quadratic');

export const MODELS = Object.freeze({
  [TRANSIT.id]: TRANSIT,
  [RV.id]: RV,
  [POLY_1.id]: POLY_1,
  [POLY_2.id]: POLY_2,
  [POWER_LAW.id]: POWER_LAW,
});
