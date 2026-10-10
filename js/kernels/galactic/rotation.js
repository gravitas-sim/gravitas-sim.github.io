// =============================================================================
// Galactic kernel: the axisymmetric rotation-curve model and its fit
// -----------------------------------------------------------------------------
// The Milky Way's circular speed as a bulge, an exponential disk and a
// pseudo-isothermal halo, which is js/darkMatter.js's model (the one The
// Missing Mass fits to NGC 3198): a point-mass bulge, a Freeman exponential
// disk and a halo that flattens the curve. Reused, not copied, so the two
// lessons cannot disagree about what a "halo" is. It is a deliberately simple
// model: three components with the parameters a student can read, no gas
// disk, no stellar halo, no bar. The fit says how well it does and where it
// does not.
//
// Pure: no DOM, no clock. Distances in kpc, speeds in km/s, masses in solar
// masses.
// =============================================================================

import { galaxyCurveAt, G_GALACTIC } from '../../darkMatter.js';

/** The parameters the fit may vary, with their search bounds. */
export const FREE = Object.freeze({
  // The disk's bounds are physical ones: the Galaxy's stellar disk is about
  // 5e10 solar masses with a scale length near 2.6 kpc (Bland-Hawthorn and
  // Gerhard 2016, ARA&A 54, 529), so a disk of 8e10 and scale 1.5 to 4.5 kpc
  // is generous. Without such bounds a disk alone can be made as massive as
  // the halo's work needs, which fits the curve and says nothing.
  discMass: [5e9, 8e10],
  discScale: [1.5, 4.5],
  haloVFlat: [0, 400],
  haloCore: [0.5, 40],
  bulgeMass: [0, 2.5e10],
});

/** A starting model for the Milky Way: the shape, not a claim of a value. */
export const START_MODEL = Object.freeze({
  bulgeMass: 1.5e10,
  discMass: 5e10,
  discScale: 2.6,
  haloVFlat: 150,
  haloCore: 8,
});

/**
 * The model's circular speed and its components at one radius.
 * @param {number} r - kpc
 * @param {object} model - as js/darkMatter.js galaxyCurveAt takes
 */
export function curveAt(r, model) {
  return galaxyCurveAt(r, model, G_GALACTIC);
}

/**
 * Chi-square of a model against a measured curve.
 * @param {Array<{r: number, v: number, err: number}>} points
 * @param {object} model
 * @returns {{chi2: number, n: number, rms: number}}
 */
export function chiSquare(points, model) {
  let chi2 = 0;
  let sum = 0;
  let n = 0;
  for (const p of points) {
    if (!(p.r > 0) || !(p.err > 0) || !Number.isFinite(p.v)) continue;
    const d = curveAt(p.r, model).total - p.v;
    chi2 += (d / p.err) ** 2;
    sum += d * d;
    n++;
  }
  return { chi2, n, rms: n ? Math.sqrt(sum / n) : NaN };
}

/**
 * Nelder-Mead minimisation of f over a box, deterministic. The simplex starts
 * from x0 and a fraction of each bound's range; points outside the box are
 * clamped to it.
 */
export function nelderMead(
  f,
  x0,
  lo,
  hi,
  { iterations = 600, tol = 1e-9 } = {}
) {
  const n = x0.length;
  const clamp = x => x.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));
  let simplex = [clamp(x0)];
  for (let i = 0; i < n; i++) {
    const p = [...simplex[0]];
    p[i] +=
      0.15 * (hi[i] - lo[i]) * (p[i] + 0.15 * (hi[i] - lo[i]) > hi[i] ? -1 : 1);
    simplex.push(clamp(p));
  }
  let values = simplex.map(f);
  for (let it = 0; it < iterations; it++) {
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map(i => simplex[i]);
    values = order.map(i => values[i]);
    if (Math.abs(values[n] - values[0]) <= tol * (Math.abs(values[0]) + tol))
      break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) c[j] += simplex[i][j] / n;
    const at = t => clamp(c.map((v, j) => v + t * (simplex[n][j] - v)));
    const r = at(-1);
    const fr = f(r);
    if (fr < values[0]) {
      const e = at(-2);
      const fe = f(e);
      if (fe < fr) [simplex[n], values[n]] = [e, fe];
      else [simplex[n], values[n]] = [r, fr];
    } else if (fr < values[n - 1]) {
      [simplex[n], values[n]] = [r, fr];
    } else {
      const k = at(fr < values[n] ? -0.5 : 0.5);
      const fk = f(k);
      if (fk < Math.min(fr, values[n])) [simplex[n], values[n]] = [k, fk];
      else
        for (let i = 1; i <= n; i++) {
          simplex[i] = clamp(
            simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]))
          );
          values[i] = f(simplex[i]);
        }
    }
  }
  const best = values.indexOf(Math.min(...values));
  return { x: simplex[best], value: values[best] };
}

/**
 * Fit the mass model to a measured curve. Masses are searched in logarithm.
 * Free parameters default to the disk's mass and scale and the halo's speed
 * and core; the bulge stays at the starting model's value unless freed.
 *
 * @param {Array<{r: number, v: number, err: number}>} points
 * @param {{start?: object, free?: string[], noHalo?: boolean, bounds?: object}} [opts] - bounds
 *   replaces FREE's for the names it lists; noHalo
 *   fixes the halo at zero, to ask what the stars and gas alone can do
 * @returns {{model: object, chi2: number, dof: number, reduced: number, rms: number, n: number}}
 */
export function fitMassModel(points, opts = {}) {
  const start = { ...START_MODEL, ...(opts.start || {}) };
  const free = opts.free || ['discMass', 'discScale', 'haloVFlat', 'haloCore'];
  const names = opts.noHalo ? free.filter(k => !k.startsWith('halo')) : free;
  const isMass = k => k.endsWith('Mass');
  const enc = (k, v) => (isMass(k) ? Math.log10(Math.max(v, 1)) : v);
  const dec = (k, v) => (isMass(k) ? 10 ** v : v);
  const bounds = { ...FREE, ...(opts.bounds || {}) };
  const lo = names.map(k => enc(k, Math.max(bounds[k][0], 1)));
  const hi = names.map(k => enc(k, bounds[k][1]));
  const build = x => {
    const m = { ...start };
    names.forEach((k, i) => (m[k] = dec(k, x[i])));
    if (opts.noHalo) m.haloVFlat = 0;
    return m;
  };
  const x0 = names.map(k => enc(k, start[k]));
  let best = null;
  // A few starting scales, because the surface is not convex in the halo.
  for (const s of [1, 0.4, 2.2]) {
    const xs = x0.map((v, i) =>
      isMass(names[i])
        ? v + Math.log10(s)
        : v * (names[i] === 'haloVFlat' ? 1 : s)
    );
    const r = nelderMead(x => chiSquare(points, build(x)).chi2, xs, lo, hi);
    if (!best || r.value < best.value) best = r;
  }
  const model = build(best.x);
  const c = chiSquare(points, model);
  const dof = Math.max(1, c.n - names.length);
  return {
    model,
    chi2: c.chi2,
    dof,
    reduced: c.chi2 / dof,
    rms: c.rms,
    n: c.n,
  };
}

/**
 * The mass inside a radius implied by a circular speed, M = v^2 r / G, in solar
 * masses (spherical symmetry assumed, which a disk is not: a stated limit).
 */
export function enclosedMass(r, v) {
  return (v * v * r) / G_GALACTIC;
}
