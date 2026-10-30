// =============================================================================
// The spectroscopic orbit and the joint eclipse solution as models (Prompt 218)
// -----------------------------------------------------------------------------
// Two models of the inference core, each fitting ONE table whose rows belong to
// different data sets (the groups column of the observation), told apart by
// `settings.roles`, the role of each group in the order the groups appear:
//
//   'flux'  the eclipse light curve (relative flux),
//   'rv1'   star 1's radial velocities (km/s), star 1 the star eclipsed at the
//           primary eclipse,
//   'rv2'   star 2's radial velocities.
//
//   sb2-orbit      rv1 and rv2 only. Parameters tc, P, K1, K2, e cos w, e sin w
//                  (and an optional offset dgamma of star 2's zero point from
//                  star 1's). With rv1 only it is a single-lined orbit. It
//                  returns the mass ratio and the MINIMUM masses; nothing here
//                  is an absolute mass, and the labels say so.
//   eclipsing-sb2  flux, rv1 and rv2 in one fit with ONE orbit: the shared
//                  tc, P, e cos w and e sin w serve the eclipses and both
//                  velocity curves, the eclipse supplies rsum, k, inc and J
//                  (js/inference/binaryModel.js), the velocities supply K1 and
//                  K2. Absolute masses, radii, a and log g come out with the
//                  covariance of the whole fit carried through, so the
//                  inclination's correlation with the masses and the radii's
//                  with the inclination are in every uncertainty.
//
// The velocity curve is js/inference/rv.js's: the model adds a sign for star 2
// and the amplitudes. The linear parameters are solved exactly at every step:
// the flux baseline f0 and the systemic velocity gamma (one for both stars,
// plus dgamma when the reader fits one).
//
// What a single-lined system gives (no rv2): the mass function and, for a
// primary mass the reader states, a minimum companion mass. Never a mass.
// =============================================================================

import { ECLIPSING_BINARY } from './binaryModel.js';
import { identifiability } from './binaries.js';
import {
  absoluteProperties,
  asini,
  companionMinimumMass,
  massFunction,
  minimumMasses,
  rvPair,
} from './binaryMasses.js';
import { solveSpd } from './fit.js';

const { Math, Float64Array, Int8Array, Number, WeakMap } = globalThis;

const CODE = Object.freeze({ flux: 0, rv1: 1, rv2: 2 });
const DEFAULT_ROLES = Object.freeze({
  'eclipsing-sb2': ['flux', 'rv1', 'rv2'],
  'sb2-orbit': ['rv1', 'rv2'],
});

/** The role code of every row of a data set, kept for the linear solve that follows the prediction. */
const ROLES = new WeakMap();

function rowRoles(data, settings, id) {
  const roles =
    settings.roles ||
    DEFAULT_ROLES[id].slice(0, data?.groups ? maxGroup(data.groups) + 1 : 1);
  const n = data ? data.x.length : 0;
  const out = new Int8Array(n);
  if (data?.groups)
    for (let i = 0; i < n; i++) out[i] = CODE[roles[data.groups[i]]];
  else out.fill(CODE[roles[0]]);
  return out;
}

function maxGroup(g) {
  let m = 0;
  for (const v of g) if (v > m) m = v;
  return m;
}

/** Index lists of the rows of each role. */
function split(codes) {
  const idx = [[], [], []];
  for (let i = 0; i < codes.length; i++) idx[codes[i]].push(i);
  return idx;
}

const pick = (arr, ids) => Float64Array.from(ids, i => arr[i]);

const orbitOf = v => ({
  tc: v.tc,
  P: v.P,
  K1: v.K1,
  K2: v.K2,
  ecosw: v.ecosw || 0,
  esinw: v.esinw || 0,
});

/** The velocity part of a prediction at the rows of rv1 and rv2 (dgamma on star 2). */
function velocities(v, x, ids, out) {
  const times = pick(x, [...ids[1], ...ids[2]]);
  const { v1, v2 } = rvPair(times, orbitOf(v));
  const n1 = ids[1].length;
  ids[1].forEach((row, j) => (out[row] = v1[j]));
  ids[2].forEach((row, j) => (out[row] = v2[n1 + j] + (v.dgamma || 0)));
}

/** Weighted mean of what the velocities leave over: the systemic velocity. */
function systemic(data, w, shape, ids) {
  let a = 0;
  let c = 0;
  for (const row of [...ids[1], ...ids[2]]) {
    a += w[row] * (data.y[row] - shape[row]);
    c += w[row];
  }
  return c > 0 ? a / c : 0;
}

function solveLinear(data, w, shape) {
  const codes = ROLES.get(data) || new Int8Array(data.x.length);
  const ids = split(codes);
  const fit = new Float64Array(shape.length);
  const linear = {};
  if (ids[0].length) {
    let a = 0;
    let c = 0;
    for (const i of ids[0]) {
      a += w[i] * data.y[i] * shape[i];
      c += w[i] * shape[i] * shape[i];
    }
    const f0 = c > 0 ? a / c : 1;
    for (const i of ids[0]) fit[i] = f0 * shape[i];
    linear.f0 = f0;
  }
  if (ids[1].length + ids[2].length) {
    const gamma = systemic(data, w, shape, ids);
    for (const i of [...ids[1], ...ids[2]]) fit[i] = shape[i] + gamma;
    linear.gamma = gamma;
  }
  return { fit, linear };
}

// ---- starting values -------------------------------------------------------------------

/** A weighted fit of gamma + A cos(nt) + B sin(nt) at one period: chi-square and the coefficients. */
function sinusoidAt(x, y, w, P) {
  const n = (2 * Math.PI) / P;
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (let i = 0; i < x.length; i++) {
    const f = [1, Math.cos(n * x[i]), Math.sin(n * x[i])];
    for (let r = 0; r < 3; r++) {
      b[r] += w[i] * y[i] * f[r];
      for (let c = 0; c < 3; c++) M[r][c] += w[i] * f[r] * f[c];
    }
  }
  const s = solveSpd(M, b);
  if (!s) return null;
  let chi2 = 0;
  for (let i = 0; i < x.length; i++) {
    const r =
      y[i] - s[0] - s[1] * Math.cos(n * x[i]) - s[2] * Math.sin(n * x[i]);
    chi2 += w[i] * r * r;
  }
  return { chi2, A: s[1], B: s[2] };
}

/**
 * The best circular orbit of one star's velocities over [lo, hi] days: the
 * period, the time the velocity crosses its mean going down (the conjunction
 * of rv.js's convention, v = -K sin(n (t - tc))) and the amplitude.
 */
function circularStart(x, y, sigma, lo, hi, tcBounds) {
  const w = Float64Array.from(x, (_, i) => (sigma ? 1 / sigma[i] ** 2 : 1));
  const span = x[x.length - 1] - x[0] || 1;
  const fLo = 1 / hi;
  const fHi = 1 / lo;
  const df = 0.2 / span;
  const steps = Math.max(1, Math.ceil((fHi - fLo) / df));
  let best = null;
  for (let j = 0; j <= steps; j++) {
    const P = 1 / (steps === 0 ? fLo : fLo + ((fHi - fLo) * j) / steps);
    const s = sinusoidAt(x, y, w, P);
    if (s && (!best || s.chi2 < best.chi2)) best = { ...s, P };
  }
  if (!best) return null;
  const n = (2 * Math.PI) / best.P;
  const phi = Math.atan2(best.A, -best.B);
  let tc = phi / n;
  while (tc < x[0]) tc += best.P;
  if (tcBounds) {
    while (tc < tcBounds.lo) tc += best.P;
    while (tc > tcBounds.hi) tc -= best.P;
  }
  return { P: best.P, tc, K: Math.hypot(best.A, best.B) };
}

/** The amplitude that best scales a unit-amplitude curve onto data with a free mean. */
function amplitude(shape, y) {
  const m = shape.length;
  if (m < 3) return 50;
  let ms = 0;
  let my = 0;
  for (let i = 0; i < m; i++) {
    ms += shape[i];
    my += y[i];
  }
  ms /= m;
  my /= m;
  let a = 0;
  let c = 0;
  for (let i = 0; i < m; i++) {
    a += (shape[i] - ms) * (y[i] - my);
    c += (shape[i] - ms) ** 2;
  }
  const k = c > 0 ? a / c : 50;
  return Math.min(400, Math.max(1, Number.isFinite(k) ? k : 50));
}

function amplitudesFor(data, ids, orbit) {
  const t1 = pick(data.x, ids[1]);
  const t2 = pick(data.x, ids[2]);
  const unit = { ...orbit, K1: 1, K2: 1 };
  const out = { K1: 50, K2: 50 };
  if (t1.length) out.K1 = amplitude(rvPair(t1, unit).v1, pick(data.y, ids[1]));
  if (t2.length) out.K2 = amplitude(rvPair(t2, unit).v2, pick(data.y, ids[2]));
  else out.K2 = out.K1;
  return out;
}

// ---- the request ----------------------------------------------------------------------

/**
 * The request with the roles written out and, when there is no second star's
 * velocity, K2 and dgamma fixed (so the single-lined fit has no parameter
 * that no row depends on). Idempotent.
 */
function prepare(id) {
  return (request, data) => {
    const s = request.settings || {};
    const n = data.groups ? maxGroup(data.groups) + 1 : 1;
    const roles = s.roles || DEFAULT_ROLES[id].slice(0, n);
    if (roles.length < n)
      throw new Error(
        `the data have ${n} groups and settings.roles names only ${roles.length}`
      );
    if (!roles.includes('rv1'))
      throw new Error(
        "a spectroscopic orbit needs star 1's velocities (the role 'rv1')"
      );
    if (id === 'eclipsing-sb2' && !roles.includes('flux'))
      throw new Error(
        "the joint solution needs the eclipse light curve (the role 'flux'); a velocity-only fit is the model sb2-orbit"
      );
    const parameters = { ...request.parameters };
    if (!roles.includes('rv2')) {
      parameters.K2 = { mode: 'fixed', value: 1 };
      parameters.dgamma = { mode: 'fixed', value: 0 };
    } else if (!parameters.dgamma)
      parameters.dgamma = { mode: 'fixed', value: 0 };
    return { ...request, settings: { ...s, roles }, parameters };
  };
}

const K_PARAMETER = name => ({
  name,
  unit: 'km/s',
  label: `semi-amplitude of star ${name === 'K1' ? 1 : 2}`,
  lo: 1,
  hi: 400,
  start: 80,
});

const DGAMMA = {
  name: 'dgamma',
  unit: 'km/s',
  label: "offset of star 2's zero point from star 1's",
  lo: -50,
  hi: 50,
  start: 0,
};

const ECC = [
  ECLIPSING_BINARY.parameters.find(p => p.name === 'ecosw'),
  ECLIPSING_BINARY.parameters.find(p => p.name === 'esinw'),
];

const ORBIT_PARAMETERS = ECLIPSING_BINARY.parameters.filter(p =>
  ['tc', 'P'].includes(p.name)
);

const isSingleLined = s => !(s.roles || []).includes('rv2');

/** Eccentricity and periastron argument of the pair, as in the eclipse model. */
const orbitDerived = v => {
  const e = Math.hypot(v.ecosw || 0, v.esinw || 0);
  return {
    e: { value: e, unit: '', label: 'eccentricity' },
    omega: {
      value: e > 0 ? (Math.atan2(v.esinw, v.ecosw) * 180) / Math.PI : 90,
      unit: 'deg',
      label: 'argument of periastron (star 2 about star 1)',
    },
  };
};

const FUNCTION_LABEL =
  'mass function f(M) = M2^3 sin^3 i / (M1 + M2)^2 (a single-lined orbit fixes this, not a mass)';

/** What a single amplitude fixes: the mass function and a stated primary's minimum companion. */
function singleLinedDerived(v, settings) {
  const e = Math.hypot(v.ecosw || 0, v.esinw || 0);
  const f = massFunction(v.K1, v.P, e);
  const out = {
    ...orbitDerived(v),
    massFunction: { value: f, unit: 'Msun', label: FUNCTION_LABEL },
    a1sini: {
      value: asini(v.K1, 0, v.P, e),
      unit: 'Rsun',
      label: "a1 sin i, the primary's orbit about the barycentre",
    },
  };
  if (settings.assumedM1 > 0)
    out.m2min = {
      value: companionMinimumMass(f, settings.assumedM1),
      unit: 'Msun',
      label: `minimum companion mass for a primary of ${settings.assumedM1} solar masses that you stated, at i = 90 degrees`,
    };
  return out;
}

const MIN_LABEL = 'minimum mass';

/** Mass ratio and minimum masses from two amplitudes. */
function doubleLinedMinimum(v) {
  const e = Math.hypot(v.ecosw || 0, v.esinw || 0);
  const m = minimumMasses({ K1: v.K1, K2: v.K2, P: v.P, e });
  return {
    q: { value: m.q, unit: '', label: 'mass ratio M2/M1 = K1/K2' },
    asini: { value: m.asini, unit: 'Rsun', label: 'a sin i' },
    m1sin3i: {
      value: m.m1sin3i,
      unit: 'Msun',
      label: `${MIN_LABEL} M1 sin^3 i (the mass is this divided by sin^3 i, never less)`,
    },
    m2sin3i: {
      value: m.m2sin3i,
      unit: 'Msun',
      label: `${MIN_LABEL} M2 sin^3 i (the mass is this divided by sin^3 i, never less)`,
    },
  };
}

const COMMON_NOT_CLAIMED = [
  'A mass from velocities alone: they fix M sin^3 i, and the inclination needs an eclipse or another measurement.',
  'A mass from a single-lined system: one amplitude fixes the mass function; a companion mass needs a primary mass that you state, and then it is a minimum.',
  'The velocities themselves: they are taken as given, with the errors the table states. A template mismatch, a blend or a line-profile effect is not in the model, and a fit that does not reach its error bars says so in the residuals.',
  'Gravitational redshift, light-travel time and tidal distortion: not in the model. The zero points of the two stars may differ (dgamma); a wrong offset moves K2.',
];

/** The spectroscopic orbit alone (two velocity curves, or one). */
export const SB2_ORBIT = {
  id: 'sb2-orbit',
  version: '1.0.0',
  quantity: 'radial velocity against time',
  parameters: [
    ...ORBIT_PARAMETERS,
    K_PARAMETER('K1'),
    K_PARAMETER('K2'),
    ...ECC,
    DGAMMA,
  ],
  linear: [{ name: 'gamma', unit: 'km/s', label: 'systemic velocity' }],
  notClaimed: [
    "Absolute masses or radii: the velocities fix M sin^3 i and a sin i; the inclination is not in this model (the joint solution with an eclipse is 'eclipsing-sb2').",
    ...COMMON_NOT_CLAIMED,
  ],
  assumptions: [
    'Two stars on one Keplerian orbit; each velocity is the star around the barycentre, the sign of star 2 opposite to star 1.',
    'The times of the two stars share the orbit: period, conjunction time, e cos w and e sin w are common. Star 1 is the star eclipsed at the primary eclipse (the eclipse names it; velocities alone cannot).',
    'One systemic velocity for both stars unless dgamma is fitted.',
  ],
  prepare: prepare('sb2-orbit'),
  predict(v, x, settings = {}, data) {
    const codes = rowRoles(data, settings, 'sb2-orbit');
    if (data) ROLES.set(data, codes);
    const out = new Float64Array(x.length);
    velocities(v, x, split(codes), out);
    return out;
  },
  solveLinear,
  project: ECLIPSING_BINARY.project,
  requires(data) {
    if (data.x.length < 6) return 'fewer than six velocities to fit an orbit';
    return null;
  },
  starts(data, request) {
    const roles = request.settings.roles;
    const codes = Int8Array.from(data.x, (_, i) =>
      data.groups ? CODE[roles[data.groups[i]]] : CODE[roles[0]]
    );
    const ids = split(codes);
    const req = request.parameters || {};
    const P = req.P || {};
    const lo = P.lo ?? 0.2;
    const hi = P.hi ?? lo * 1.1;
    const tcB = req.tc?.lo !== undefined ? req.tc : null;
    const x1 = pick(data.x, ids[1]);
    const y1 = pick(data.y, ids[1]);
    const s1 = data.sigma ? pick(data.sigma, ids[1]) : null;
    const c =
      P.mode === 'fixed'
        ? circularStart(x1, y1, s1, P.value, P.value * 1.0000001, tcB)
        : circularStart(x1, y1, s1, lo, hi, tcB);
    if (!c) throw new Error('no orbit found in the velocities of star 1');
    const orbit = { tc: c.tc, P: c.P, ecosw: 0, esinw: 0 };
    const amps = amplitudesFor(data, ids, orbit);
    const base = { tc: c.tc, P: c.P, ...amps };
    return [
      { ...base, ecosw: 0, esinw: 0 },
      { ...base, ecosw: 0.1, esinw: 0.1 },
      { ...base, ecosw: -0.1, esinw: 0.1 },
    ];
  },
  derived(v, settings = {}) {
    return isSingleLined(settings)
      ? singleLinedDerived(v, settings)
      : { ...orbitDerived(v), ...doubleLinedMinimum(v) };
  },
  identify: out => ({ ...identifiabilityOfVelocities(out) }),
  redNoiseRows: () => null,
};

/** Rank-listed or bounded amplitudes are not constrained (the velocities' share of the rule). */
function identifiabilityOfVelocities(fit) {
  const listed = new Set(fit.rank?.notConstrained || []);
  const out = {};
  const reasons = [];
  for (const q of fit.parameters) {
    if (q.mode !== 'fitted') continue;
    const why = listed.has(q.name) ? 'rank' : q.atBound ? 'bound' : null;
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

/** The eclipse, the velocity curves of both stars and one orbit. */
export const ECLIPSING_SB2 = {
  id: 'eclipsing-sb2',
  version: '1.0.0',
  quantity: 'relative flux and radial velocity against time',
  parameters: [
    ...ECLIPSING_BINARY.parameters,
    K_PARAMETER('K1'),
    K_PARAMETER('K2'),
    DGAMMA,
  ],
  linear: [
    { name: 'f0', unit: '', label: 'baseline flux' },
    { name: 'gamma', unit: 'km/s', label: 'systemic velocity' },
  ],
  notClaimed: [
    ...ECLIPSING_BINARY.notClaimed.filter(s => !s.startsWith('Masses')),
    ...COMMON_NOT_CLAIMED,
    'A temperature or a luminosity: the surface brightness ratio of one band is not a temperature ratio, and a temperature is an input you supply when the diagram needs one.',
  ],
  assumptions: [
    ...ECLIPSING_BINARY.assumptions,
    "The same orbit serves the light curve and both velocity curves: one tc, P, e cos w, e sin w. The velocities' K1 and K2 are positive; star 2's velocity has the opposite sign to star 1's.",
    'The eclipse names star 1 (eclipsed at the primary eclipse): the velocity curve labelled star 1 must be that star, and a swap shows in the residuals.',
    "The inclination is the eclipse model's; the masses are M sin^3 i divided by sin^3 i and the radii are fractions of a = a sin i / sin i.",
  ],
  prepare: prepare('eclipsing-sb2'),
  predict(v, x, settings = {}, data) {
    const codes = rowRoles(data, settings, 'eclipsing-sb2');
    if (data) ROLES.set(data, codes);
    const ids = split(codes);
    const out = new Float64Array(x.length);
    if (ids[0].length) {
      const f = ECLIPSING_BINARY.predict(v, pick(x, ids[0]), settings);
      ids[0].forEach((row, j) => (out[row] = f[j]));
    }
    velocities(v, x, ids, out);
    return out;
  },
  solveLinear,
  project: ECLIPSING_BINARY.project,
  requires(data) {
    if (data.x.length < 20)
      return 'fewer than twenty rows for a joint solution';
    return null;
  },
  redNoiseRows(data, request) {
    const roles = request.settings.roles;
    const rows = [];
    for (let i = 0; i < data.x.length; i++)
      if (roles[data.groups ? data.groups[i] : 0] === 'flux') rows.push(i);
    return rows;
  },
  starts(data, request) {
    const roles = request.settings.roles;
    const codes = Int8Array.from(data.x, (_, i) =>
      data.groups ? CODE[roles[data.groups[i]]] : CODE[roles[0]]
    );
    const ids = split(codes);
    const flux = {
      x: pick(data.x, ids[0]),
      y: pick(data.y, ids[0]),
      sigma: data.sigma ? pick(data.sigma, ids[0]) : null,
    };
    const eclipse = ECLIPSING_BINARY.starts(flux, request);
    return eclipse.map(s => ({
      ...s,
      ...amplitudesFor(data, ids, s),
    }));
  },
  derived(v, settings = {}) {
    const base = ECLIPSING_BINARY.derived(v, settings);
    if (isSingleLined(settings))
      return { ...base, ...singleLinedDerived(v, settings) };
    const e = Math.hypot(v.ecosw || 0, v.esinw || 0);
    const p = absoluteProperties({
      K1: v.K1,
      K2: v.K2,
      P: v.P,
      e,
      inc: v.inc,
      rsum: v.rsum,
      k: v.k,
    });
    return {
      ...base,
      q: { value: p.q, unit: '', label: 'mass ratio M2/M1 = K1/K2' },
      a: {
        value: p.a,
        unit: 'Rsun',
        label: 'semi-major axis of the relative orbit',
      },
      M1: { value: p.M1, unit: 'Msun', label: 'mass of star 1' },
      M2: { value: p.M2, unit: 'Msun', label: 'mass of star 2' },
      R1: { value: p.R1, unit: 'Rsun', label: 'radius of star 1' },
      R2: { value: p.R2, unit: 'Rsun', label: 'radius of star 2' },
      logg1: { value: p.logg1, unit: 'dex', label: 'log g of star 1 (cgs)' },
      logg2: { value: p.logg2, unit: 'dex', label: 'log g of star 2 (cgs)' },
    };
  },
  /**
   * The eclipse model's rule (a radius ratio that is a valley, a bound, a rank
   * deficiency), carried to what depends on it: radii when k or rsum is open,
   * masses and a when the inclination or an amplitude is.
   */
  identify(out) {
    const base = identifiability(out);
    const open = n => base.parameters[n]?.status === 'not constrained';
    const derived = {};
    const flag = (names, why) => {
      for (const n of names) derived[n] = { status: 'not constrained', why };
    };
    if (open('k') || open('rsum'))
      flag(['R1', 'R2', 'logg1', 'logg2'], 'radii');
    if (open('inc') || open('K1') || open('K2'))
      flag(['a', 'M1', 'M2', 'R1', 'R2', 'logg1', 'logg2'], 'mass');
    return { ...base, derived };
  },
};
