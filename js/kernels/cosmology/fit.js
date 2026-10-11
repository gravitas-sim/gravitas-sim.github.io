// =============================================================================
// Hubble diagrams through the inference core
// -----------------------------------------------------------------------------
// Two models, as model objects the core's fitter (js/inference/fit.js
// createProblem, refine, covarianceAt, profile, crossing) accepts unchanged:
//
//   hubble-law      cz = H0 d (optionally cz = v0 + H0 d): the straight line of
//                   the first rung, in km/s against Mpc
//   flat-lcdm-sn    mu(z; Om, H0) + offset, flat Lambda-CDM, for a table of
//                   supernova distance moduli; the offset is linear and solved
//                   exactly at every trial
//
// What supernovae alone cannot give is the scale. A distance modulus differs
// from another by 5 log10(H0 ratio) exactly as it does by a constant offset
// in the supernovae's absolute magnitude, so with an offset free, chi-square
// over H0 is flat (COSMOLOGY_GATE.md section 4 measured it flat to 3e-12), and
// the fit says so by returning no covariance for H0. The distance ladder
// (js/kernels/variables) supplies the scale; a supernova table supplies the
// shape of the curve, and so Omega_m.
//
// crossing() reads a profile correctly only when the best fit is one of the
// profile's grid values, so the best fit is always added to the grid.
// =============================================================================

import {
  createProblem,
  refine,
  covarianceAt,
  profile,
  crossing,
} from '../../inference/fit.js';
import { mulberry32, normalizeSeed } from '../../rng.js';
import { createCosmology, C_KMS } from './flrw.js';

const { Math, Float64Array } = globalThis;

export const HUBBLE_LAW_MODEL = {
  id: 'hubble-law',
  version: '1.0.0',
  quantity: 'recession velocity cz against distance',
  parameters: [
    { name: 'H0', unit: 'km/s/Mpc', label: 'Hubble constant', lo: 1, hi: 2000 },
    {
      name: 'v0',
      unit: 'km/s',
      label: 'velocity at zero distance',
      lo: -5000,
      hi: 5000,
    },
  ],
  assumptions: [
    'The velocity is proportional to the distance (the first term of the distance series, good to z of about 0.1).',
    'The distances are the measurements given, with the errors given; any error in their scale is an error in H0.',
  ],
  notClaimed: [
    'The expansion history: a straight line has no curvature to read.',
  ],
  predict: (v, x) => x.map(d => v.v0 + v.H0 * d),
  solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
};

/** mu(z) for a flat universe, one cosmology for the whole table. */
export const FLAT_LCDM_SN_MODEL = {
  id: 'flat-lcdm-sn',
  version: '1.0.0',
  quantity: 'distance modulus against redshift',
  parameters: [
    { name: 'Om', unit: '', label: 'matter density, Omega_m', lo: 0, hi: 1 },
    { name: 'H0', unit: 'km/s/Mpc', label: 'Hubble constant', lo: 20, hi: 150 },
  ],
  linear: [
    { name: 'offset', unit: 'mag', label: 'offset of the absolute magnitude' },
  ],
  assumptions: [
    'A spatially flat universe of matter and a cosmological constant (w = -1), radiation neglected (under 0.5% in distance up to z = 5).',
    'Gaussian errors of the size given, independent between supernovae: the covariance of the published analysis is not used.',
  ],
  notClaimed: [
    'H0, when the offset is free: a constant offset and a change of H0 are the same change to every distance modulus.',
  ],
  predict(v, x) {
    const c = createCosmology({ H0: v.H0, Om: v.Om, OL: 1 - v.Om });
    return x.map(z => c.distanceModulus(z));
  },
  /** y = shape + offset, weighted; no offset when the model is told the scale. */
  solveLinear(data, w, shape) {
    if (this.noOffset) return { fit: shape, linear: { offset: 0 } };
    let sw = 0;
    let s = 0;
    for (let i = 0; i < shape.length; i++) {
      sw += w[i];
      s += w[i] * (data.y[i] - shape[i]);
    }
    const offset = s / sw;
    return { fit: shape.map(v => v + offset), linear: { offset } };
  },
};

const P = (name, value, lo, hi, mode = 'fitted') => ({
  name,
  mode,
  value,
  lo,
  hi,
});
const cols = d => ({
  x: Float64Array.from(d.x),
  y: Float64Array.from(d.y),
  sigma: Float64Array.from(d.sigma),
});

/**
 * A straight line through (or near) the origin: cz against distance.
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>, sigma: ArrayLike<number>}} data
 *   distance in Mpc, cz in km/s, one-sigma errors in km/s
 * @param {{intercept?: boolean}} [opts] - fit v0 as well (default: through the origin)
 */
export function fitHubbleLaw(data, opts = {}) {
  const d = cols(data);
  const prob = createProblem(HUBBLE_LAW_MODEL, d, [
    P('H0', 70, 1, 2000),
    opts.intercept ? P('v0', 0, -5000, 5000) : P('v0', 0, -5000, 5000, 'fixed'),
  ]);
  const start = opts.intercept ? [70, 0] : [70];
  const r = refine(prob, start);
  const cov = covarianceAt(prob, r.theta);
  const n = d.x.length;
  const dof = n - r.theta.length;
  const out = {
    H0: r.theta[0],
    sigmaH0: cov.sigma[0],
    v0: opts.intercept ? r.theta[1] : 0,
    sigmaV0: opts.intercept ? cov.sigma[1] : 0,
    chi2: r.best.chi2,
    dof,
    n,
    converged: r.converged,
  };
  // The scatter, not the stated errors, when the fit's chi-square says the
  // errors are too small: the same rule the core states.
  out.sigmaH0Scaled = out.sigmaH0 * Math.sqrt(Math.max(1, out.chi2 / dof));
  return out;
}

/**
 * Fit flat Lambda-CDM to a supernova table.
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>, sigma: ArrayLike<number>}} data
 *   redshift, distance modulus (mag), error (mag)
 * @param {{H0?: number, offset?: 'free'|'none', freeH0?: boolean, grid?: number}} [opts]
 *   H0 held at this value (default 70); offset 'free' (default) solves the
 *   absolute magnitude, 'none' takes the moduli as calibrated; freeH0 searches
 *   H0 too, which is degenerate with a free offset.
 * @returns {{Om:number,H0:number,offset:number,chi2:number,dof:number,n:number,
 *   sigmaOm:number,sigmaH0:number,omInterval:(number|null)[],
 *   omProfile:{value:number,chi2:number}[],degenerate:boolean,converged:boolean}}
 */
export function fitSupernovae(data, opts = {}) {
  const d = cols(data);
  const model = Object.create(FLAT_LCDM_SN_MODEL);
  model.noOffset = opts.offset === 'none';
  const H0 = opts.H0 ?? 70;
  const free = opts.freeH0 === true;
  const prob = createProblem(model, d, [
    P('Om', 0.3, 0, 1),
    free ? P('H0', H0, 20, 150) : P('H0', H0, 20, 150, 'fixed'),
  ]);
  const r = refine(prob, free ? [0.3, H0] : [0.3]);
  const cov = covarianceAt(prob, r.theta);
  const steps = opts.grid ?? 19;
  const grid = Array.from({ length: steps }, (_, i) => (i + 1) / (steps + 1));
  const prof = profile(prob, r.theta, 0, [...grid, r.theta[0]]);
  const [lo, hi] = crossing(prof, r.best.chi2, 1);
  const n = d.x.length;
  return {
    Om: r.theta[0],
    H0: free ? r.theta[1] : H0,
    offset: r.best.linear.offset,
    chi2: r.best.chi2,
    dof: n - r.theta.length - (model.noOffset ? 0 : 1),
    n,
    sigmaOm: cov.sigma[0],
    sigmaH0: free ? cov.sigma[1] : 0,
    omInterval: [lo, hi],
    omProfile: prof
      .map(p => ({ value: p.value, chi2: p.chi2 }))
      .sort((a, b) => a.value - b.value),
    // An uncertainty on H0 wider than the whole range it may take (130
    // km/s/Mpc) says the data do not constrain it: with the offset free the
    // covariance is singular to rounding, and the error comes out in the
    // millions or as no covariance at all.
    degenerate:
      free &&
      !model.noOffset &&
      (cov.covariance === null || !(cov.sigma[1] < 130)),
    converged: r.converged,
  };
}

/**
 * Chi-square against H0 with the offset solved and Omega_m re-fitted at each
 * value: the degeneracy as a number. Its range is the largest difference.
 * @returns {{points: {H0: number, chi2: number}[], range: number}}
 */
export function h0Degeneracy(data, values = [50, 60, 70, 80, 90]) {
  const d = cols(data);
  const prob = createProblem(Object.create(FLAT_LCDM_SN_MODEL), d, [
    P('Om', 0.3, 0, 1),
    P('H0', 70, 20, 150),
  ]);
  const r = refine(prob, [0.3, 70]);
  const pts = profile(prob, r.theta, 1, values).map(p => ({
    H0: p.value,
    chi2: p.chi2,
  }));
  const chis = pts.map(p => p.chi2);
  return { points: pts, range: Math.max(...chis) - Math.min(...chis) };
}

/** One standard normal at a time, Box-Muller over the shared seeded generator. */
function normals(seed) {
  const u = mulberry32(normalizeSeed(String(seed)));
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a;
    do a = u();
    while (a <= 1e-12);
    const b = u();
    const r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}

/**
 * A synthetic Hubble diagram: redshifts spread as a survey spreads them (the
 * square of a uniform draw, thick at low z), distance moduli from the model,
 * an offset the fit does not know, and Gaussian noise of the stated size.
 * @param {{n?: number, zMin?: number, zMax?: number, sigma?: number|number[],
 *   cosmology?: {H0:number,Om:number,OL:number}, offset?: number, seed?: string|number}} [p]
 * @returns {{z: Float64Array, mu: Float64Array, sigma: Float64Array, truth: object}}
 */
export function syntheticHubbleDiagram(p = {}) {
  const {
    n = 300,
    zMin = 0.01,
    zMax = 1,
    sigma = 0.15,
    cosmology = { H0: 70, Om: 0.3, OL: 0.7 },
    offset = 0,
    seed = 'hubble',
  } = p;
  const u = mulberry32(normalizeSeed(`${seed}:z`));
  const g = normals(`${seed}:noise`);
  const cos = createCosmology(cosmology);
  const z = Float64Array.from({ length: n }, () => {
    const r = u();
    return zMin + (zMax - zMin) * r * r;
  }).sort();
  const s = Float64Array.from(z, (_, i) =>
    Array.isArray(sigma) ? sigma[i % sigma.length] : sigma
  );
  const mu = Float64Array.from(
    z,
    (zi, i) => cos.distanceModulus(zi) + offset + s[i] * g()
  );
  return { z, mu, sigma: s, truth: { ...cosmology, offset, c: C_KMS } };
}

/** Distance in Mpc from a distance modulus. */
export const distanceFromModulus = mu => 10 ** ((mu - 25) / 5);
