// =============================================================================
// Lensing kernel: fitting a microlensing event with the inference core
// -----------------------------------------------------------------------------
// The point-lens model as a model object the inference core's fitter
// (js/inference/fit.js createProblem and refine) accepts: three searched
// parameters (t0, u0, tE) and two linear ones solved exactly at every trial
// (the source flux Fs and the blend flux Fb, or Fs alone when blending is
// held at none). The fitted quantity is flux in the data's own unit; the
// blend share fs = Fs / (Fs + Fb) is derived. Finite-source size rho is a
// setting, held, not searched.
//
// What a single light curve cannot give: the lens mass, its distance or its
// speed. It gives tE, and tE = theta_E D_l / v is one number for three
// unknowns. With blending free, u0 and tE trade against fs when the event is
// not highly magnified: the covariance this returns says how much.
// =============================================================================

import { createProblem, refine, covarianceAt } from '../../inference/fit.js';
import { microlensingFlux, separationAt } from './microlensing.js';
import { gaussianNoise } from './noise.js';

export const MICROLENSING_MODEL = {
  id: 'microlensing-point-lens',
  version: '1.0.0',
  quantity: 'flux against time',
  parameters: [
    { name: 't0', unit: 'd', label: 'time of closest approach' },
    {
      name: 'u0',
      unit: '',
      label: 'impact parameter (Einstein radii)',
      lo: 0.001,
      hi: 3,
    },
    {
      name: 'tE',
      unit: 'd',
      label: 'Einstein-radius crossing time',
      lo: 0.05,
      hi: 5000,
    },
  ],
  linear: [
    { name: 'Fs', unit: '', label: 'source flux' },
    { name: 'Fb', unit: '', label: 'blend flux' },
  ],
  assumptions: [
    'A single point lens and a single source moving in straight lines at constant speed.',
    'A uniform source disk (rho held, not searched); no limb darkening, no parallax, no orbital motion.',
    'White Gaussian noise of the stated size.',
  ],
  notClaimed: [
    "The lens's mass, distance or speed: tE is one number for the three.",
    'The blend share when the event is of low magnification, where it is degenerate with u0 and tE.',
  ],
  predict(v, x, settings) {
    return microlensingFlux(x, {
      t0: v.t0,
      u0: v.u0,
      tE: v.tE,
      fs: 1,
      rho: settings.rho,
    });
  },
  /** y = Fs A + Fb, weighted least squares; Fb = 0 when blending is held at none. */
  solveLinear(data, w, shape) {
    const n = shape.length;
    let sw = 0;
    let sa = 0;
    let saa = 0;
    let sy = 0;
    let say = 0;
    for (let i = 0; i < n; i++) {
      sw += w[i];
      sa += w[i] * shape[i];
      saa += w[i] * shape[i] * shape[i];
      sy += w[i] * data.y[i];
      say += w[i] * shape[i] * data.y[i];
    }
    let Fs;
    let Fb;
    if (this.noBlend) {
      Fs = saa > 0 ? say / saa : 1;
      Fb = 0;
    } else {
      const det = sw * saa - sa * sa;
      if (!(Math.abs(det) > 1e-300)) {
        Fs = saa > 0 ? say / saa : 1;
        Fb = 0;
      } else {
        Fs = (sw * say - sa * sy) / det;
        Fb = (saa * sy - sa * say) / det;
      }
    }
    return { fit: shape.map(s => Fs * s + Fb), linear: { Fs, Fb } };
  },
};

/**
 * Fit a point-lens event. Several starts (u0 against tE is a curved valley),
 * the best chi-square kept.
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>, sigma: ArrayLike<number>}} data
 * @param {{blend?: 'free'|'none', rho?: number}} [opts]
 * @returns {{t0:number,u0:number,tE:number,Fs:number,Fb:number,fs:number,
 *   chi2:number,dof:number,sigma:{t0:number,u0:number,tE:number},converged:boolean}}
 */
export function fitMicrolensing(data, opts = {}) {
  const x = Float64Array.from(data.x);
  const y = Float64Array.from(data.y);
  const sigma = Float64Array.from(data.sigma);
  const model = Object.create(MICROLENSING_MODEL);
  model.noBlend = opts.blend === 'none';
  const tmin = Math.min(...x);
  const tmax = Math.max(...x);
  let peak = 0;
  for (let i = 1; i < y.length; i++) if (y[i] > y[peak]) peak = i;
  const span = tmax - tmin;
  const params = [
    { name: 't0', mode: 'fitted', value: x[peak], lo: tmin, hi: tmax },
    { name: 'u0', mode: 'fitted', value: 0.3, lo: 0.001, hi: 3 },
    { name: 'tE', mode: 'fitted', value: span / 8, lo: 0.05, hi: 5000 },
  ];
  const problem = createProblem(model, { x, y, sigma }, params, {
    rho: opts.rho ?? 0,
  });
  let best = null;
  for (const tE of [span / 40, span / 12, span / 5]) {
    for (const u0 of [0.05, 0.2, 0.6, 1.2]) {
      const r = refine(problem, [x[peak], u0, tE], { maxIterations: 120 });
      if (!best || r.best.chi2 < best.best.chi2) best = r;
    }
  }
  const [t0, u0, tE] = best.theta;
  const { Fs, Fb } = best.best.linear;
  const cov = covarianceAt(problem, best.theta);
  const s = cov.sigma ?? [NaN, NaN, NaN];
  return {
    t0,
    u0,
    tE,
    Fs,
    Fb,
    fs: Fs / (Fs + Fb),
    chi2: best.best.chi2,
    dof: y.length - (opts.blend === 'none' ? 4 : 5),
    sigma: { t0: s[0], u0: s[1], tE: s[2] },
    converged: best.converged,
  };
}

/**
 * A synthetic event: the model curve times a baseline flux, with seeded white
 * noise of relative size `noise` (of the baseline) on every point.
 * @param {{seed:string, times:ArrayLike<number>, truth:{t0:number,u0:number,tE:number,fs?:number,rho?:number}, noise:number, base?:number}} o
 */
export function syntheticEvent(o) {
  const base = o.base ?? 1;
  const clean = microlensingFlux(o.times, o.truth);
  const g = gaussianNoise(o.seed);
  const x = Float64Array.from(o.times);
  const y = new Float64Array(x.length);
  const sigma = new Float64Array(x.length).fill(o.noise * base);
  for (let i = 0; i < x.length; i++)
    y[i] = base * clean[i] + o.noise * base * g();
  return { x, y, sigma, clean: clean.map(c => c * base) };
}

export { separationAt };
