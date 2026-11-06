// =============================================================================
// SPIKE (Prompt 251 Part B, never merged): a finite-source search and the blend degeneracy
// -----------------------------------------------------------------------------
// Built on the merged inference core and the merged point-lens model (fit.js), whose rho is a setting. Here rho
// is searched by the profile chi-square over a grid of 0 and 36 log-spaced values in [0.005, 1] (warm starts, the
// other parameters and the two fluxes refitted at each), the interval is the crossing of the profile at the
// normal quantile squared, and a value is returned only when the lower end of the 0.95 interval is above zero
// (AM2). The blend share f_s is profiled on 0.05 to 1 in steps of 0.05 with the amplitude solved linearly, and is
// 'not constrained' when its 0.95 interval is wider than 0.5 (AM3).
// =============================================================================

import { createProblem, refine } from '../../../inference/fit.js';
import { MICROLENSING_MODEL } from '../fit.js';
import { normalQuantile } from '../../statistics/special.js';

function modelFor(fixedFs) {
  const m = Object.create(MICROLENSING_MODEL);
  m.noBlend = false;
  if (fixedFs !== undefined)
    m.solveLinear = function (data, w, shape) {
      const n = shape.length;
      let sss = 0;
      let ssy = 0;
      const s = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        s[i] = fixedFs * shape[i] + (1 - fixedFs);
        sss += w[i] * s[i] * s[i];
        ssy += w[i] * s[i] * data.y[i];
      }
      const B = sss > 0 ? ssy / sss : 1;
      return {
        fit: s.map(v => B * v),
        linear: { Fs: B * fixedFs, Fb: B * (1 - fixedFs) },
      };
    };
  return m;
}

function setup(data, { rho, fixedFs }) {
  const x = Float64Array.from(data.x);
  const y = Float64Array.from(data.y);
  const sigma = Float64Array.from(data.sigma);
  const tmin = Math.min(...x);
  const tmax = Math.max(...x);
  let peak = 0;
  for (let i = 1; i < y.length; i++) if (y[i] > y[peak]) peak = i;
  const params = [
    { name: 't0', mode: 'fitted', value: x[peak], lo: tmin, hi: tmax },
    { name: 'u0', mode: 'fitted', value: 0.3, lo: 0.001, hi: 3 },
    {
      name: 'tE',
      mode: 'fitted',
      value: (tmax - tmin) / 8,
      lo: 0.05,
      hi: 5000,
    },
  ];
  return {
    problem: createProblem(modelFor(fixedFs), { x, y, sigma }, params, { rho }),
    x,
    peak,
    span: tmax - tmin,
  };
}

/** The best of several starts (cold: the 12 of fitMicrolensing) or of the given warm starts. */
function fitAt(data, { rho, fixedFs }, starts) {
  const { problem, x, peak, span } = setup(data, { rho, fixedFs });
  const list =
    starts ??
    [span / 40, span / 12, span / 5].flatMap(tE =>
      [0.05, 0.2, 0.6, 1.2].map(u0 => [x[peak], u0, tE])
    );
  let best = null;
  for (const s of list) {
    const r = refine(problem, s, { maxIterations: 120 });
    if (!best || r.best.chi2 < best.best.chi2) best = r;
  }
  return { theta: best.theta, chi2: best.best.chi2, linear: best.best.linear };
}

/** Where the profile crosses c on one side of the minimum; null when it never does within the grid. */
function crossing(grid, chi2, from, step, c) {
  for (let j = from + step; j >= 0 && j < grid.length; j += step) {
    if (chi2[j] > c) {
      const a = j - step;
      const f = (c - chi2[a]) / (chi2[j] - chi2[a]);
      if (grid[a] > 0 && grid[j] > 0)
        return Math.exp(
          Math.log(grid[a]) + f * (Math.log(grid[j]) - Math.log(grid[a]))
        );
      return grid[a] + f * (grid[j] - grid[a]);
    }
  }
  return null;
}

export const RHO_GRID = [
  0,
  ...Array.from({ length: 36 }, (_, k) =>
    Math.exp(Math.log(0.005) + (k * Math.log(1 / 0.005)) / 35)
  ),
];

/**
 * Search rho. Returns {status: 'ok', rho, intervals} when the lower end of the 0.95 interval is above zero, else
 * {status: 'upper-limit', rho: null, upperLimit95} (AM2).
 */
export function fitFiniteSource(data, { levels = [0.68, 0.95] } = {}) {
  const grid = RHO_GRID;
  const chi2 = new Float64Array(grid.length);
  const base = fitAt(data, { rho: 0 });
  chi2[0] = base.chi2;
  const thetas = new Array(grid.length);
  thetas[0] = base.theta;
  const peakT = base.theta[0];
  let prev = base.theta;
  for (let i = 1; i < grid.length; i++) {
    const rho = grid[i];
    // run 2 (the optimiser repair, LENSING_DELAYS_GATE.md): warm starts plus three cold starts scaled to rho
    const cold = [0.3, 1, 2.5].map(k => [peakT, k * rho, base.theta[2]]);
    const r = fitAt(data, { rho }, [prev, base.theta, ...cold]);
    chi2[i] = r.chi2;
    thetas[i] = r.theta;
    prev = r.theta;
  }
  // a descending pass from the best point, keeping the better of the two fits at each grid value
  let ib = 0;
  for (let i = 1; i < grid.length; i++) if (chi2[i] < chi2[ib]) ib = i;
  prev = thetas[ib];
  for (let i = ib - 1; i >= 1; i--) {
    const r = fitAt(data, { rho: grid[i] }, [prev, thetas[i]]);
    if (r.chi2 < chi2[i]) {
      chi2[i] = r.chi2;
      thetas[i] = r.theta;
    }
    prev = thetas[i];
  }
  let im = 0;
  for (let i = 1; i < grid.length; i++) if (chi2[i] < chi2[im]) im = i;
  let rhoHat = grid[im];
  if (im >= 2 && im < grid.length - 1) {
    const [a, b, c] = [
      Math.log(grid[im - 1]),
      Math.log(grid[im]),
      Math.log(grid[im + 1]),
    ];
    const [fa, fb, fc] = [chi2[im - 1], chi2[im], chi2[im + 1]];
    const den = (b - a) * (fb - fc) - (b - c) * (fb - fa);
    if (Math.abs(den) > 1e-300) {
      const v =
        b - (0.5 * ((b - a) ** 2 * (fb - fc) - (b - c) ** 2 * (fb - fa))) / den;
      if (v > a && v < c) rhoHat = Math.exp(v);
    }
  }
  const intervals = {};
  for (const L of levels) {
    const z = normalQuantile((1 + L) / 2);
    const c = chi2[im] + z * z;
    const lo = im === 0 ? 0 : (crossing(grid, chi2, im, -1, c) ?? 0);
    const hi = crossing(grid, chi2, im, +1, c) ?? Infinity;
    intervals[L] = { lo, hi };
  }
  const i95 = intervals[0.95];
  const constrained = i95.lo > 0;
  return {
    status: constrained ? 'ok' : 'upper-limit',
    rho: constrained ? rhoHat : null,
    rhoBest: rhoHat,
    intervals,
    upperLimit95: constrained ? null : i95.hi,
    chi2Min: chi2[im],
    chi2AtZero: chi2[0],
  };
}

/**
 * The blend share's profile at a held rho (AM3): not constrained when the 0.95 interval is wider than 0.5, with
 * the degeneracy stated and tE returned with its range over the interval.
 */
export function assessBlend(data, { rho }) {
  const free = fitAt(data, { rho });
  const grid = Array.from({ length: 20 }, (_, k) => (k + 1) / 20);
  const chi2 = [];
  const tE = [];
  let prev = free.theta;
  for (const fs of grid) {
    const [t0f, u0f, tEf] = free.theta;
    const r = fitAt(data, { rho, fixedFs: fs }, [
      prev,
      free.theta,
      [t0f, 0.3 * u0f, tEf],
      [t0f, 3 * u0f, tEf],
    ]);
    chi2.push(r.chi2);
    tE.push(r.theta[2]);
    prev = r.theta;
  }
  const z = normalQuantile(0.975);
  const c = Math.min(free.chi2, ...chi2) + z * z;
  const inside = grid.map((_, i) => chi2[i] <= c);
  const idx = inside.flatMap((v, i) => (v ? [i] : []));
  const lo = idx.length ? (idx[0] === 0 ? 0 : grid[idx[0]] - 0.025) : NaN;
  const hi = idx.length ? Math.min(1, grid[idx[idx.length - 1]] + 0.025) : NaN;
  const width = hi - lo;
  const degenerate = !idx.length || width > 0.5;
  const tEs = idx.map(i => tE[i]);
  return {
    status: degenerate ? 'not-constrained' : 'ok',
    code: degenerate ? 'blend-degenerate' : undefined,
    fsFree: free.linear.Fs / (free.linear.Fs + free.linear.Fb),
    interval: { lo, hi, level: 0.95 },
    width,
    tE: free.theta[2],
    tERange: tEs.length ? [Math.min(...tEs), Math.max(...tEs)] : null,
  };
}
