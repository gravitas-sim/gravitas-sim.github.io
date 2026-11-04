// =============================================================================
// Galactic kernel: rotation-curve decomposition (Prompt 236, ROTATION_DECOMPOSITION.md)
// -----------------------------------------------------------------------------
// A circular-speed curve as a sum of three components in the disk's plane:
//
//   a Hernquist bulge        v^2 = G M r / (r + a)^2            (Hernquist 1990)
//   a razor-thin exp. disk   v^2 = (2 G M / R_d) g(r / 2 R_d)   (Freeman 1970)
//   one halo: NFW            v^2 = v_s^2 m(x) / x               (Navarro, Frenk and White 1996)
//             or pseudo-isothermal  v^2 = v_inf^2 (1 - (r_c / r) arctan(r / r_c))
//
// and a bounded weighted least-squares fit through the inference core
// (js/inference/fit.js), with the intervals the statistics kernel names, the
// disk-halo degeneracy as a profile over the disk mass, and "not constrained"
// for a halo the points do not fix. The disk's mass range is a stated input
// (a luminosity with a mass-to-light range, or the range itself): nothing here
// assumes what the stars weigh. No gas disk, stellar halo, bar, thick disk or
// non-circular motion: the fit says how well it does without them.
//
// Constants are definitions, not numbers: G is derived from the IAU nominal GM
// of the Sun and the parsec, as in js/kernels/dynamics/constants.js. The
// disk's shape function g is computed from the modified Bessel functions by
// trapezoid sums of their integral forms (exponentially convergent), tabulated
// once and interpolated by a cubic spline in ln y: js/darkMatter.js's
// polynomial Bessel functions are good to 1e-7 each, which the cancellation in
// I0 K0 - I1 K1 turns into a speed error of 2e-4 at 120 kpc (measured in
// ROTATION_DECOMPOSITION.md; that file is not changed here).
//
// Pure: no DOM, no clock, no randomness. Distances in kpc, speeds in km/s,
// masses in solar masses.
// =============================================================================

import {
  createProblem,
  refine,
  covarianceAt,
  rankAt,
  profile,
} from '../../inference/fit.js';
import { eigenSymmetric } from '../../numeric/linalg.js';
import { cubicSpline } from '../../numeric/interp.js';
import {
  covarianceInterval,
  profileInterval,
} from '../statistics/intervals.js';
import { chi2Sf } from '../statistics/special.js';
import { refused } from '../statistics/check.js';

const { Math, Number, Float64Array } = globalThis;

// --- constants -----------------------------------------------------------------

export const GM_SUN_M3S2 = 1.3271244e20;
export const AU_M = 149597870700;
export const PC_M = (648000 / Math.PI) * AU_M;
export const KPC_M = 1000 * PC_M;
/** G in kpc (km/s)^2 per solar mass, a consequence of the definitions above. */
export const G_KPC = GM_SUN_M3S2 / (KPC_M * 1e6);

// --- the disk's shape function ---------------------------------------------------

// e^{y} K_nu(y) for nu = 0 and 1: the integral of exp(y (1 - cosh t)) cosh(nu t),
// trapezoid with step min(0.2, 0.6 / sqrt(y)) up to where the integrand is e^-40.
function scaledK(y) {
  const h = Math.min(0.2, 0.6 / Math.sqrt(y));
  const n = Math.ceil(Math.acosh(1 + 40 / y) / h);
  let s0 = 0.5;
  let s1 = 0.5;
  for (let k = 1; k <= n; k++) {
    const t = k * h;
    const c = Math.cosh(t);
    const e = Math.exp(y * (1 - c));
    s0 += e;
    s1 += e * c;
  }
  return [s0 * h, s1 * h];
}

// e^{-y} I_nu(y) for nu = 0 and 1: (1 / pi) of the integral over [0, pi] of
// exp(y (cos th - 1)) cos(nu th). Up to y = 20 the periodic trapezoid sum with
// 24 + 1.5 y intervals; above it the Gaussian peak alone, to where it is e^-40.
function scaledI(y) {
  let top = Math.PI;
  let n;
  if (y <= 20) n = 24 + Math.ceil(1.5 * y);
  else {
    top = Math.acos(1 - 40 / y);
    n = Math.ceil(top / (0.6 / Math.sqrt(y)));
  }
  const h = top / n;
  const eTop = Math.exp(y * (Math.cos(top) - 1));
  let s0 = 0.5 * (1 + eTop);
  let s1 = 0.5 * (1 + Math.cos(top) * eTop);
  for (let k = 1; k < n; k++) {
    const th = k * h;
    const e = Math.exp(y * (Math.cos(th) - 1));
    s0 += e;
    s1 += e * Math.cos(th);
  }
  return [(s0 * h) / Math.PI, (s1 * h) / Math.PI];
}

/** g(y) = y^2 [I0(y) K0(y) - I1(y) K1(y)], by the integral forms (no table). */
export function diskShapeDirect(y) {
  const [i0, i1] = scaledI(y);
  const [k0, k1] = scaledK(y);
  return y * y * (i0 * k0 - i1 * k1);
}

const TABLE = { lnLo: Math.log(1e-6), lnHi: Math.log(1000), n: 4000 };
let spline = null;
function table() {
  if (!spline) {
    const xs = new Float64Array(TABLE.n);
    const ys = new Float64Array(TABLE.n);
    const step = (TABLE.lnHi - TABLE.lnLo) / (TABLE.n - 1);
    for (let j = 0; j < TABLE.n; j++) {
      xs[j] = TABLE.lnLo + j * step;
      ys[j] = Math.log(diskShapeDirect(Math.exp(xs[j])));
    }
    spline = cubicSpline(xs, ys);
  }
  return spline;
}

/**
 * g(y) for y = r / (2 R_d): the table inside [1e-6, 1000], the leading small-y form
 * below it (I0 K0 -> -ln(y/2) - gamma, I1 K1 -> 1/2) and the two-term asymptotic series
 * above it, g = (1 / 4y) (1 + 9 / (8 y^2)) (A&S 9.7.1, 9.7.2), whose next term is of
 * order y^-4, 1e-12 at the table's edge.
 */
export function diskShape(y) {
  if (!(y > 0)) return 0;
  if (y < 1e-6) return y * y * (-Math.log(y / 2) - 0.5772156649015329 - 0.5);
  if (y > 1000) return (1 / (4 * y)) * (1 + 9 / (8 * y * y));
  return Math.exp(table().at(Math.log(y)));
}

// --- the components ------------------------------------------------------------------

/** Hernquist bulge: v = sqrt(G M r) / (r + a). */
export function bulgeSpeed(r, mass, scale) {
  if (!(r > 0) || !(mass > 0)) return 0;
  return Math.sqrt(G_KPC * mass * r) / (r + scale);
}

/** Freeman's razor-thin exponential disk of total mass `mass` and scale length `scale`. */
export function diskSpeed(r, mass, scale) {
  if (!(r > 0) || !(mass > 0) || !(scale > 0)) return 0;
  return Math.sqrt(((2 * G_KPC * mass) / scale) * diskShape(r / (2 * scale)));
}

/** m(x) = ln(1 + x) - x / (1 + x), the NFW enclosed-mass function. */
export const nfwMass = x => Math.log1p(x) - x / (1 + x);

/** NFW: v = v_s sqrt(m(x) / x), x = r / r_s. */
export function nfwSpeed(r, speedScale, scaleRadius) {
  if (!(r > 0) || !(speedScale > 0) || !(scaleRadius > 0)) return 0;
  const x = r / scaleRadius;
  // m(x) / x loses digits to cancellation as x -> 0: its series is x/2 - 2x^2/3 + 3x^3/4 - ...
  const f =
    x < 1e-3
      ? x * (0.5 - x * (2 / 3 - x * (3 / 4 - x * (4 / 5))))
      : nfwMass(x) / x;
  return speedScale * Math.sqrt(f);
}

/** Pseudo-isothermal: v = v_inf sqrt(1 - (r_c / r) arctan(r / r_c)). */
export function isothermalSpeed(r, speedInfinity, coreRadius) {
  if (!(r > 0) || !(speedInfinity > 0) || !(coreRadius > 0)) return 0;
  const x = r / coreRadius;
  // 1 - arctan(x) / x loses digits as x -> 0: its series is x^2/3 - x^4/5 + x^6/7 - ...
  const f =
    x < 1e-2
      ? x * x * (1 / 3 - x * x * (1 / 5 - x * x * (1 / 7)))
      : 1 - Math.atan(x) / x;
  return speedInfinity * Math.sqrt(f);
}

export const HALO_FORMS = Object.freeze({
  nfw: {
    id: 'nfw',
    label: 'NFW halo',
    speed: nfwSpeed,
    parameter: 'v_s',
    cite: 'Navarro, Frenk and White 1996, ApJ 462, 563',
  },
  'pseudo-isothermal': {
    id: 'pseudo-isothermal',
    label: 'pseudo-isothermal halo',
    speed: isothermalSpeed,
    parameter: 'v_inf',
    cite: 'the form of js/darkMatter.js haloCircularSpeed (The Missing Mass); a cored profile as in the fits of Begeman 1989, A&A 223, 47',
  },
});

/** The enclosed mass a circular speed implies, v^2 r / G, spherical symmetry assumed (a stated limit). */
export const enclosedMass = (r, v) => (v * v * r) / G_KPC;

/**
 * The x = r / r_s at which an NFW halo's circular speed peaks: the root of
 * x^2 / (1 + x)^2 = ln(1 + x) - x / (1 + x), by bisection. Derived, not typed.
 */
export function nfwPeakRatio() {
  const f = x => (x * x) / ((1 + x) * (1 + x)) - nfwMass(x);
  let lo = 0.5;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Every component's speed at one radius for a set of parameter values (the
 * names `decomposeCurve` reports in `values`).
 * @param {number} r - kpc
 * @param {{bulgeMass?: number, bulgeScale?: number, diskMass: number, diskScale: number,
 *   haloSpeed?: number, haloScale?: number, halo?: string}} v
 */
export function componentSpeeds(r, v) {
  const bulge = bulgeSpeed(r, v.bulgeMass || 0, v.bulgeScale || 1);
  const disk = diskSpeed(r, v.diskMass, v.diskScale);
  const form = HALO_FORMS[v.halo || 'nfw'];
  const halo =
    v.haloSpeed > 0 && v.haloScale > 0
      ? form.speed(r, v.haloSpeed, v.haloScale)
      : 0;
  return {
    bulge,
    disk,
    halo,
    stars: Math.hypot(bulge, disk),
    total: Math.hypot(bulge, disk, halo),
  };
}

// --- the stated input: the disk's mass range -----------------------------------------------

/**
 * The disk's mass range from a luminosity and a mass-to-light range, all stated
 * by the caller (there is no default and no value is cited here).
 * @param {{luminosity: number, massToLight: {lo: number, hi: number}}} input
 */
export function diskMassRange({ luminosity, massToLight }) {
  if (!(luminosity > 0))
    return refused('luminosity', 'the luminosity is missing or not positive');
  if (!(massToLight && massToLight.lo > 0 && massToLight.hi >= massToLight.lo))
    return refused(
      'mass-to-light',
      'the mass-to-light range needs 0 < lo <= hi, stated by the caller'
    );
  return {
    status: 'ok',
    lo: luminosity * massToLight.lo,
    hi: luminosity * massToLight.hi,
  };
}

// --- the fit --------------------------------------------------------------------------------

/** Search bounds that are not inputs about the stars: wide, and not priors from the literature. */
export const DEFAULT_BOUNDS = Object.freeze({
  diskScale: [1, 6],
  haloSpeed: [1, 1000],
  logHaloScale: [0, 2.7],
});

const LABELS = {
  logDiskMass: { label: 'disk mass, log10', unit: 'log10 solar masses' },
  diskScale: { label: 'disk scale length', unit: 'kpc' },
  haloSpeed: { label: 'halo speed scale', unit: 'km/s' },
  logHaloScale: { label: 'halo scale radius, log10', unit: 'log10 kpc' },
  logBulgeMass: { label: 'bulge mass, log10', unit: 'log10 solar masses' },
};

const MODEL = {
  id: 'rotation-decomposition',
  version: '1.0.0',
  quantity: 'circular speed against galactocentric radius',
  parameters: [],
  assumes: [
    'An axisymmetric galaxy in which the tracers move on circular orbits in the disk plane at the speed the model gives; the curve is taken as measured, its errors as stated and independent.',
    'A Hernquist bulge of a stated scale, a razor-thin exponential disk and one spherical halo: no gas disk, stellar halo, bar, thick disk or non-circular motion.',
    'The disk mass is searched inside the range the caller states (a mass-to-light range times a luminosity, or a mass range), the other bounds are wide search bounds and not priors from the literature.',
  ],
  predict(v, x, s) {
    const form = HALO_FORMS[s.halo];
    const Mb = v.logBulgeMass <= -29 ? 0 : 10 ** v.logBulgeMass;
    const Md = 10 ** v.logDiskMass;
    const hs = v.haloSpeed;
    const hr = 10 ** v.logHaloScale;
    const out = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const r = x[i];
      const b = bulgeSpeed(r, Mb, s.bulgeScale);
      const d = diskSpeed(r, Md, v.diskScale);
      const h = hs > 0 && form ? form.speed(r, hs, hr) : 0;
      out[i] = Math.sqrt(b * b + d * d + h * h);
    }
    return out;
  },
  solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
};

function validate(points, opts) {
  if (!Array.isArray(points) && !(points && points.length >= 0))
    return refused('points', 'the curve is not a list of points');
  const halo = opts.halo ?? 'nfw';
  if (halo !== 'none' && !HALO_FORMS[halo])
    return refused(
      'halo-form',
      `unknown halo form '${halo}': nfw, pseudo-isothermal or none`
    );
  const disk = opts.disk;
  let range = null;
  if (disk?.massRange) {
    const [lo, hi] = disk.massRange;
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi >= lo)
      range = [lo, hi];
  } else if (disk?.luminosity !== undefined) {
    const r = diskMassRange(disk);
    if (r.status === 'ok') range = [r.lo, r.hi];
  }
  if (!range)
    return refused(
      'disk-mass-range',
      'the disk mass range is a stated input: give disk.massRange, or disk.luminosity with disk.massToLight {lo, hi}'
    );
  for (const p of points)
    if (!(p.r > 0) || !Number.isFinite(p.r))
      return refused('radius', 'a radius is not positive and finite');
  for (const p of points)
    if (!Number.isFinite(p.v))
      return refused('speed', 'a speed is not a finite number');
  for (const p of points)
    if (!(p.err > 0) || !Number.isFinite(p.err))
      return refused('error', 'an error is not positive and finite');
  const free = (halo === 'none' ? 2 : 4) + (opts.bulge?.free ? 1 : 0);
  if (points.length < free + 2)
    return refused(
      'points',
      `${points.length} points cannot fit ${free} free parameters and leave a degree of freedom to judge the fit by (at least ${free + 2} are needed)`
    );
  return { status: 'ok', halo, range };
}

const P = (name, value, lo, hi, mode = 'fitted') => ({
  name,
  mode,
  value,
  lo,
  hi,
});

function setup(points, opts, checked) {
  const { halo, range } = checked;
  const bounds = { ...DEFAULT_BOUNDS, ...(opts.bounds || {}) };
  const bulge = opts.bulge || { mass: 0, scale: 1 };
  const bulgeScale = bulge.scale > 0 ? bulge.scale : 1;
  const data = {
    x: Float64Array.from(points, p => p.r),
    y: Float64Array.from(points, p => p.v),
    sigma: Float64Array.from(points, p => p.err),
  };
  const lMd = [Math.log10(range[0]), Math.log10(range[1])];
  const noHalo = halo === 'none';
  const maxV = Math.max(...points.map(p => p.v));
  const bm = bulge.mass > 0 ? Math.log10(bulge.mass) : -30;
  const bmr = bulge.massRange
    ? [Math.log10(bulge.massRange[0]), Math.log10(bulge.massRange[1])]
    : [bm - 1, bm + 1];
  const parameters = [
    P(
      'logDiskMass',
      0.5 * (lMd[0] + lMd[1]),
      lMd[0],
      lMd[1],
      range[0] === range[1] ? 'fixed' : 'fitted'
    ),
    P('diskScale', 2.5, ...bounds.diskScale),
    P(
      'haloSpeed',
      noHalo ? 0 : 0.6 * maxV,
      ...bounds.haloSpeed,
      noHalo ? 'fixed' : 'fitted'
    ),
    P(
      'logHaloScale',
      Math.log10(15),
      ...bounds.logHaloScale,
      noHalo ? 'fixed' : 'fitted'
    ),
    P('logBulgeMass', bm, bmr[0], bmr[1], bulge.free ? 'fitted' : 'fixed'),
  ];
  const settings = { halo: noHalo ? 'nfw' : halo, bulgeScale };
  const problem = createProblem(MODEL, data, parameters, settings);
  return { problem, parameters, data, settings, bulgeScale, bm, halo, range };
}

function startsFor(parameters, free) {
  const get = n => parameters.find(p => p.name === n);
  const md = get('logDiskMass');
  const span = md.hi - md.lo;
  const hv = get('haloSpeed');
  const base = free.map(p => p.value);
  const idx = n => free.findIndex(p => p.name === n);
  const make = over => {
    const s = base.slice();
    for (const [n, v] of Object.entries(over)) {
      const i = idx(n);
      if (i >= 0) s[i] = v;
    }
    return s;
  };
  const out = [];
  const speeds = [0.25, 0.5, 0.9].map(f => f * (hv.value / 0.6));
  const scales = [4, 15, 60].map(Math.log10);
  for (const v of speeds)
    for (const s of scales) out.push(make({ haloSpeed: v, logHaloScale: s }));
  out.push(make({ logDiskMass: md.lo + 0.15 * span }));
  out.push(make({ logDiskMass: md.lo + 0.85 * span }));
  const seen = new Set();
  return out.filter(s => {
    const key = s.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestFit(problem, parameters) {
  let best = null;
  for (const s of startsFor(parameters, problem.free)) {
    const r = refine(problem, s);
    if (!best || r.best.chi2 < best.best.chi2) best = r;
  }
  return best;
}

/** The named values of the fitted state: physical masses and the halo's scale in kpc. */
function valuesOf(problem, theta, s) {
  const all = problem.full(theta);
  const noHalo = !(all.haloSpeed > 0);
  return {
    halo: noHalo ? 'none' : s.halo,
    bulgeMass: all.logBulgeMass <= -29 ? 0 : 10 ** all.logBulgeMass,
    bulgeScale: s.bulgeScale,
    diskMass: 10 ** all.logDiskMass,
    diskScale: all.diskScale,
    haloSpeed: all.haloSpeed,
    haloScale: 10 ** all.logHaloScale,
  };
}

const ENCLOSED_RADII = [20, 50];

/** Quantities derived from a parameter vector, in the order `derivedNames` lists. */
function derivedVector(problem, theta, s, atRadius) {
  const v = valuesOf(problem, theta, s);
  const form = HALO_FORMS[s.halo];
  const out = [];
  for (const R of ENCLOSED_RADII)
    out.push(
      v.haloSpeed > 0
        ? enclosedMass(R, form.speed(R, v.haloSpeed, v.haloScale))
        : 0
    );
  const c = componentSpeeds(atRadius, v);
  out.push(c.bulge, c.disk, c.halo, c.total);
  return out;
}

function derivedNames(atRadius) {
  return [
    ...ENCLOSED_RADII.map(R => ({
      name: `haloMass${R}`,
      label: `halo mass within ${R} kpc`,
      unit: 'solar masses',
      halo: true,
    })),
    {
      name: 'vBulge',
      label: `bulge speed at ${atRadius} kpc`,
      unit: 'km/s',
      halo: false,
    },
    {
      name: 'vDisk',
      label: `disk speed at ${atRadius} kpc`,
      unit: 'km/s',
      halo: false,
    },
    {
      name: 'vHalo',
      label: `halo speed at ${atRadius} kpc`,
      unit: 'km/s',
      halo: true,
    },
    {
      name: 'vTotal',
      label: `total speed at ${atRadius} kpc`,
      unit: 'km/s',
      halo: false,
    },
  ];
}

/** Central-difference gradient of f at theta, inside the bounds. */
function gradient(f, theta, lo, hi) {
  const g = [];
  for (let j = 0; j < theta.length; j++) {
    const span = hi[j] - lo[j];
    const h = 1e-6 * (Number.isFinite(span) ? span : Math.abs(theta[j]) || 1);
    const up = theta.slice();
    const dn = theta.slice();
    up[j] = Math.min(hi[j], theta[j] + h);
    dn[j] = Math.max(lo[j], theta[j] - h);
    const w = up[j] - dn[j];
    const a = f(up);
    const b = f(dn);
    g.push(a.map((v, k) => (w > 0 ? (v - b[k]) / w : 0)));
  }
  return g; // g[j][k] = d output k / d theta j
}

function profileGrid(lo, hi, best, n) {
  const g = [];
  for (let i = 0; i < n; i++) g.push(lo + ((hi - lo) * i) / (n - 1));
  g.push(best);
  return [...new Set(g)].sort((a, b) => a - b);
}

/**
 * Decompose a rotation curve.
 *
 * @param {Array<{r: number, v: number, err: number}>} points - kpc, km/s, km/s (one sigma)
 * @param {object} opts
 * @param {'nfw'|'pseudo-isothermal'|'none'} [opts.halo='nfw']
 * @param {{massRange?: [number, number], luminosity?: number, massToLight?: {lo: number, hi: number}}} opts.disk
 *   the disk mass range, a stated input (refused when missing)
 * @param {{mass?: number, scale?: number, free?: boolean, massRange?: [number, number]}} [opts.bulge]
 *   a Hernquist bulge; no bulge unless a mass is given; the scale is never fitted
 * @param {object} [opts.bounds] - replaces DEFAULT_BOUNDS for the names it lists
 * @param {string[]} [opts.profile] - parameters to profile besides the halo's (names of `parameters`)
 * @param {number} [opts.profileGrid=25] - values across each profiled parameter's bounds
 * @param {number} [opts.radius=8] - where the derived speeds are read, kpc
 * @returns {object} `{status: 'ok', ...}` or `{status: 'refused', code, why}`
 */
export function decomposeCurve(points, opts = {}) {
  const checked = validate(points, opts);
  if (checked.status === 'refused') return checked;
  const { problem, parameters, settings, halo } = setup(points, opts, checked);
  const fit = bestFit(problem, parameters);
  const theta = fit.theta;
  const n = points.length;
  const k = theta.length;
  const dof = n - k;
  const chi2 = fit.best.chi2;
  const reduced = chi2 / dof;
  const p = chi2Sf(chi2, dof);
  const adequate = p >= 0.001;
  const cov = covarianceAt(problem, theta);
  const rank = rankAt(problem, theta);
  const names = problem.free.map(q => q.name);
  const grid = opts.profileGrid ?? 25;

  // Profiles: the halo's parameters, and any the caller asks for.
  const wanted = new Set([
    ...(halo === 'none' ? [] : ['haloSpeed', 'logHaloScale']),
    ...(opts.profile || []),
  ]);
  const profiles = {};
  let lower = chi2;
  for (const name of wanted) {
    const j = names.indexOf(name);
    if (j < 0) continue;
    const pts = profile(
      problem,
      theta,
      j,
      profileGrid(problem.lo[j], problem.hi[j], theta[j], grid)
    ).map(q => ({ value: q.value, chi2: q.chi2 }));
    profiles[name] = pts;
    for (const q of pts) lower = Math.min(lower, q.chi2);
  }
  const profileFoundLower = lower < chi2 - 1e-6 * Math.max(1, chi2);
  const minimum = Math.min(chi2, lower);

  const scale = Math.sqrt(Math.max(1, reduced));
  const rows = names.map((name, j) => {
    const q = problem.free[j];
    const sigma = cov.covariance ? cov.sigma[j] : null;
    const onBound = theta[j] <= q.lo || theta[j] >= q.hi;
    const row = {
      name,
      ...LABELS[name],
      value: theta[j],
      lo: q.lo,
      hi: q.hi,
      onBound,
      sigma,
      sigmaScaled: sigma === null ? null : sigma * scale,
      covarianceInterval: null,
      covarianceInterval95: null,
      profileInterval: null,
      constrained: null,
    };
    if (sigma !== null && Number.isFinite(sigma)) {
      row.covarianceInterval = covarianceInterval(theta[j], sigma);
      row.covarianceInterval95 = covarianceInterval(theta[j], sigma, {
        level: 0.95,
      });
    }
    if (profiles[name]) {
      const pi = profileInterval(profiles[name], minimum, { deltaChi2: 1 });
      row.profileInterval = pi;
      row.constrained =
        pi.status === 'ok' && !pi.open[0] && !pi.open[1] && !onBound;
    }
    return row;
  });

  const haloRows = rows.filter(
    r => r.name === 'haloSpeed' || r.name === 'logHaloScale'
  );
  const haloConstrained =
    halo === 'none' ? null : haloRows.every(r => r.constrained === true);
  if (halo !== 'none' && !haloConstrained) {
    // No interval for a parameter the points do not fix: the covariance of such a fit is
    // the rounding noise of an inversion (js/inference/fit.js rankAt), and a profile open on
    // a side is a bound, not an interval.
    for (const r of haloRows) {
      if (!r.constrained) {
        r.covarianceInterval = null;
        r.covarianceInterval95 = null;
        r.profileInterval = null;
        r.sigma = null;
        r.sigmaScaled = null;
      }
    }
  }

  // Correlation, the weakest direction and the disk-halo coupling.
  let weakest = null;
  let diskHalo = null;
  if (cov.covariance) {
    const modes = eigenSymmetric(cov.correlation);
    const m = modes[modes.length - 1];
    weakest = {
      eigenvalue: m.value,
      loadings: Object.fromEntries(names.map((nm, i) => [nm, m.vector[i]])),
    };
    const a = names.indexOf('logDiskMass');
    const b = names.indexOf('haloSpeed');
    if (a >= 0 && b >= 0) diskHalo = cov.correlation[a][b];
  }

  // Derived quantities with the delta method; halo quantities only when the halo is constrained.
  const R = opts.radius ?? 8;
  const dn = derivedNames(R);
  const f = t => derivedVector(problem, t, settings, R);
  const dv = f(theta);
  const grad = cov.covariance
    ? gradient(f, theta, problem.lo, problem.hi)
    : null;
  const derived = dn.map((d, i) => {
    let sigma = null;
    if (grad && (!d.halo || halo === 'none' || haloConstrained)) {
      let s2 = 0;
      for (let a = 0; a < k; a++)
        for (let b = 0; b < k; b++)
          s2 += grad[a][i] * cov.covariance[a][b] * grad[b][i];
      sigma = s2 >= 0 ? Math.sqrt(s2) : null;
    }
    const reportable = !d.halo || halo === 'none' || haloConstrained;
    return {
      ...d,
      value: reportable ? dv[i] : null,
      sigma: reportable ? sigma : null,
      interval:
        reportable && sigma !== null ? covarianceInterval(dv[i], sigma) : null,
      interval95:
        reportable && sigma !== null
          ? covarianceInterval(dv[i], sigma, { level: 0.95 })
          : null,
    };
  });

  const values = valuesOf(problem, theta, settings);
  const model = fit.best.fit;
  const residuals = points.map((q, i) => ({
    r: q.r,
    v: q.v,
    err: q.err,
    model: model[i],
    residual: q.v - model[i],
    normalised: (q.v - model[i]) / q.err,
  }));
  const rms = Math.sqrt(residuals.reduce((s, q) => s + q.residual ** 2, 0) / n);

  return {
    status: 'ok',
    model: {
      id: MODEL.id,
      version: MODEL.version,
      halo,
      haloCite: halo === 'none' ? null : HALO_FORMS[halo].cite,
      bulge: {
        mass: values.bulgeMass,
        scale: settings.bulgeScale,
        free: Boolean(opts.bulge?.free),
      },
      diskMassRange: [
        10 ** problem.parameters[0].lo,
        10 ** problem.parameters[0].hi,
      ],
    },
    converged: fit.converged,
    chi2,
    dof,
    n,
    reduced,
    p,
    adequate,
    rms,
    parameters: rows,
    values,
    halo: {
      form: halo,
      constrained: haloConstrained,
      status:
        halo === 'none'
          ? 'no halo'
          : haloConstrained
            ? 'constrained'
            : 'not constrained',
      why:
        halo === 'none' || haloConstrained
          ? null
          : 'the points do not fix the halo: a profile interval of its speed or scale is open on a side or on its bound, so no halo number is reported (more outer points, or a smaller error, would)',
    },
    derived,
    names,
    covariance: cov.covariance,
    correlation: cov.correlation,
    rank,
    weakestMode: weakest,
    diskHaloCorrelation: diskHalo,
    profiles,
    profileFoundLower,
    residuals,
    scaledForMisfit: !adequate || reduced > 1 ? scale : 1,
    assumes: MODEL.assumes,
  };
}

/**
 * The disk-halo degeneracy as a profile over the disk mass: for each disk mass on
 * a grid across its stated range, the best fit of everything else, its chi-square,
 * the halo it needs and the masses it implies. A flat chi-square across the range
 * is the degeneracy; the two ends are the minimum-disk and maximum-disk decompositions.
 * @param {Array<{r: number, v: number, err: number}>} points
 * @param {object} opts - as decomposeCurve; `opts.diskMassGrid` values across the range (default 13)
 */
export function diskHaloProfile(points, opts = {}) {
  const checked = validate(points, opts);
  if (checked.status === 'refused') return checked;
  const cnt = opts.diskMassGrid ?? 13;
  const lo = Math.log10(checked.range[0]);
  const hi = Math.log10(checked.range[1]);
  const rows = [];
  for (let i = 0; i < cnt; i++) {
    const lm = cnt === 1 ? lo : lo + ((hi - lo) * i) / (cnt - 1);
    const at = { ...checked, range: [10 ** lm, 10 ** lm] };
    const { problem, parameters, settings } = setup(points, opts, at);
    const fit = bestFit(problem, parameters);
    const v = valuesOf(problem, fit.theta, settings);
    const form = HALO_FORMS[settings.halo];
    rows.push({
      logDiskMass: lm,
      diskMass: v.diskMass,
      chi2: fit.best.chi2,
      diskScale: v.diskScale,
      haloSpeed: v.haloSpeed,
      haloScale: v.haloScale,
      haloMass20:
        v.haloSpeed > 0
          ? enclosedMass(20, form.speed(20, v.haloSpeed, v.haloScale))
          : 0,
      converged: fit.converged,
    });
  }
  const chis = rows.map(r => r.chi2);
  return {
    status: 'ok',
    rows,
    chi2Min: Math.min(...chis),
    chi2Range: Math.max(...chis) - Math.min(...chis),
    minimumDisk: rows[0],
    maximumDisk: rows[rows.length - 1],
  };
}
