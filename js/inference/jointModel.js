// =============================================================================
// The joint transit and radial-velocity model, with the star inside (Prompt 227)
// -----------------------------------------------------------------------------
// One model of the inference core, `transit-rv-joint`, fitting ONE table whose
// rows belong to different data sets (the groups column of the observation),
// told apart by `settings.roles`, the role of each group in the order the
// groups appear:
//
//   'flux'  the transit light curve (relative flux),
//   'rv'    a radial-velocity series in m/s; every rv group is one instrument
//           and has its own zero point (solved exactly).
//
// ONE orbit serves both: the period P, the epoch of inferior conjunction t0
// (a transit is the time the planet is in front; rv.js's tc is the same
// instant), and the eccentricity of the velocity orbit as sqrt(e) cos w and
// sqrt(e) sin w (js/inference/rv.js, w the planet's). The transit is the
// circular-orbit model of js/inference/transit.js with the first-order
// eccentric scaling of the duration: a/R* is the TRUE ratio, the circular
// equivalent a/R* (1 + e sin w) / sqrt(1 - e^2) draws the light curve, so what
// the velocities say of e and w sharpens what the transit says of a/R*.
// Jitter, the scatter an instrument's error bars leave out, adds in
// quadrature to the VELOCITIES' errors only (js/inference/infer.js reads
// jitterRows below).
//
// What it returns beyond the parameters (./jointPlanet.js has the formulas):
//   with a transit, velocities and a stated star: the planet's mass, radius
//   and bulk density, each with the fit's covariance and the star's own
//   uncertainty and correlation carried through (externalVariance), the share
//   the star holds, and the star's density from the transit beside its
//   density from the stated mass and radius;
//   with velocities alone: the MINIMUM mass Mp sin i and the mass function,
//   never a mass, never a radius, never a density;
//   and a named refusal for every quantity the inputs do not give.
// =============================================================================

import {
  halfDuration,
  limbDarkening,
  transitFlux,
  stellarDensity,
} from './transit.js';
import { eccentricity, rvCurve } from './rv.js';
import {
  GM,
  MJUP_PER_MEARTH,
  circularEquivalent,
  planetOf,
  sinInclination,
  starDensityOf,
  stellarInputs,
  stellarVariance,
} from './jointPlanet.js';
import { constraintKB } from './transitDelta.js';

const { Math, Float64Array, Int8Array, Int32Array, WeakMap, Number: Num } =
  globalThis;

const FLUX = 0;
const RV = 1;
/** The role code of every row of a data set, kept for the linear solve that follows the prediction. */
const ROLES = new WeakMap();

/** The roles written out: the first group is the light curve, the others velocities. */
export function rolesOf(settings, data) {
  if (settings.roles) return settings.roles;
  const n = data?.groups ? maxGroup(data.groups) + 1 : 1;
  return Array.from({ length: n }, (_, i) => (i === 0 ? 'flux' : 'rv'));
}

function maxGroup(g) {
  let m = 0;
  for (const v of g) if (v > m) m = v;
  return m;
}

function rowCodes(data, settings) {
  const roles = rolesOf(settings, data);
  const out = new Int8Array(data ? data.x.length : 0);
  for (let i = 0; i < out.length; i++)
    out[i] = roles[data.groups ? data.groups[i] : 0] === 'flux' ? FLUX : RV;
  return out;
}

const hasRole = (settings, data, role) =>
  rolesOf(settings, data).includes(role);

// ---- the star ------------------------------------------------------------------

function starOf(settings) {
  const s = stellarInputs(settings.stellar);
  return s;
}

/** Why a planetary quantity is not reported, for a request (no fit needed). */
export function refusalsFor(settings, roles) {
  const out = [];
  const flux = roles.includes('flux');
  const rv = roles.includes('rv');
  const st = starOf(settings);
  const add = (quantities, code, why) => {
    for (const quantity of quantities) out.push({ quantity, code, why });
  };
  if (!flux)
    add(
      ['Mp', 'Rp', 'rhoP', 'inclination', 'rhoStar'],
      'noTransit',
      'velocities alone fix the minimum mass Mp sin i and nothing of the planet’s size, inclination or density: a transit is needed for those'
    );
  if (!rv)
    add(
      ['Mp', 'MpSini', 'rhoP'],
      'noVelocities',
      'a transit alone gives no mass: the velocities’ amplitude is needed'
    );
  const massWhy = !st.mass
    ? ['stellarMassMissing', 'no stellar mass was stated']
    : !st.massOk
      ? [
          'stellarUncertaintyMissing',
          'the stellar mass was stated without its uncertainty; the star is never taken as exact',
        ]
      : null;
  const radiusWhy = !st.radius
    ? ['stellarRadiusMissing', 'no stellar radius was stated']
    : !st.radiusOk
      ? [
          'stellarUncertaintyMissing',
          'the stellar radius was stated without its uncertainty; the star is never taken as exact',
        ]
      : null;
  if (rv && massWhy) add(['Mp', 'MpSini', 'rhoP'], massWhy[0], massWhy[1]);
  if (flux && radiusWhy) add(['Rp', 'rhoP'], radiusWhy[0], radiusWhy[1]);
  if (flux && (massWhy || radiusWhy)) {
    const why = massWhy || radiusWhy;
    add(['rhoStarStated'], why[0], why[1]);
  }
  // One entry per quantity and code.
  const seen = new Set();
  return out.filter(r => {
    const key = `${r.quantity}:${r.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const refused = (settings, roles) =>
  new Set(refusalsFor(settings, roles).map(r => r.quantity));

// ---- the prediction --------------------------------------------------------------

/** The transit light curve at the flux rows: the circular equivalent of the orbit the velocities fix. */
function lightCurve(v, times, settings) {
  const { e, omega } = eccentricity(v.sqrtEcosw, v.sqrtEsinw);
  const { u1, u2 } = limbDarkening(v.q1, v.q2);
  const aC = circularEquivalent(v.aRs, e, omega);
  const shape = transitFlux(
    times,
    { t0: v.t0, P: v.P, k: v.k, aRs: aC, b: v.b, u1, u2 },
    settings
  );
  const dilution = settings.dilution || 0;
  if (dilution > 0)
    for (let i = 0; i < shape.length; i++)
      shape[i] = 1 - (1 - shape[i]) * (1 - dilution);
  return shape;
}

const pick = (arr, ids) => Float64Array.from(ids, i => arr[i]);

function solveLinear(data, w, shape) {
  const codes = ROLES.get(data) || new Int8Array(data.x.length);
  const groups = data.groups || new Int32Array(shape.length);
  const fit = new Float64Array(shape.length);
  const linear = {};
  let a = 0;
  let c = 0;
  const sums = new Map();
  for (let i = 0; i < shape.length; i++) {
    if (codes[i] === FLUX) {
      a += w[i] * data.y[i] * shape[i];
      c += w[i] * shape[i] * shape[i];
    } else {
      const g = groups[i];
      const s = sums.get(g) || { a: 0, c: 0 };
      s.a += w[i] * (data.y[i] - shape[i]);
      s.c += w[i];
      sums.set(g, s);
    }
  }
  const f0 = c > 0 ? a / c : 1;
  const gamma = {};
  for (const [g, s] of sums) gamma[g] = s.c > 0 ? s.a / s.c : 0;
  for (let i = 0; i < shape.length; i++)
    fit[i] = codes[i] === FLUX ? f0 * shape[i] : shape[i] + gamma[groups[i]];
  if (c > 0) linear.f0 = f0;
  if (sums.size) linear.gamma = gamma;
  return { fit, linear };
}

// ---- starting values ---------------------------------------------------------------

function subset(data, rows) {
  return {
    ...data,
    x: pick(data.x, rows),
    y: pick(data.y, rows),
    sigma: data.sigma ? pick(data.sigma, rows) : null,
    groups: data.groups ? Int32Array.from(rows, i => data.groups[i]) : null,
    rows: rows.map(i => data.rows[i]),
  };
}

/** The amplitude that best scales -sin(n (t - t0)) onto the velocities, each group's mean removed. */
function amplitudeStart(data, rows, P, t0) {
  const n = (2 * Math.PI) / P;
  const groups = new Map();
  for (const i of rows) {
    const g = data.groups ? data.groups[i] : 0;
    const e = groups.get(g) || { y: 0, c: 0 };
    e.y += data.y[i];
    e.c++;
    groups.set(g, e);
  }
  let a = 0;
  let c = 0;
  for (const i of rows) {
    const g = data.groups ? data.groups[i] : 0;
    const e = groups.get(g);
    const f = -Math.sin(n * (data.x[i] - t0));
    a += (data.y[i] - e.y / e.c) * f;
    c += f * f;
  }
  const K = c > 0 ? a / c : 50;
  return Math.min(1500, Math.max(1, Num.isFinite(K) ? Math.abs(K) : 50));
}

function startsFor(data, request, tools) {
  const s = request.settings;
  const codes = rowCodes(data, s);
  const fluxRows = [];
  const rvRows = [];
  codes.forEach((c, i) => (c === FLUX ? fluxRows : rvRows).push(i));
  const search = {};
  let base;
  if (fluxRows.length) {
    const t = tools.transitStarts(
      request,
      subset(data, fluxRows),
      tools.hooks,
      search
    );
    base = t.map(x => ({ ...x }));
    for (const x of base) {
      x.q1 = 0.36;
      x.q2 = 0.3;
      x.K = rvRows.length ? amplitudeStart(data, rvRows, x.P, x.t0) : 1;
    }
  } else {
    const r = tools.rvStarts(request, subset(data, rvRows), tools.hooks, search);
    base = r.map(x => ({
      t0: x.tc,
      P: x.P,
      K: x.K,
      sqrtEcosw: x.sqrtEcosw,
      sqrtEsinw: x.sqrtEsinw,
      k: 0.1,
      aRs: 10,
      b: 0.3,
      q1: 0.36,
      q2: 0.3,
    }));
  }
  const out = [];
  const mode = n => request.parameters?.[n]?.mode;
  const eFixed = mode('sqrtEcosw') === 'fixed' && mode('sqrtEsinw') === 'fixed';
  const ecc = eFixed
    ? [[0, 0]]
    : [
        [0, 0],
        [0.3, 0.3],
        [-0.3, 0.3],
      ];
  for (const x of base) {
    for (const [cx, cy] of ecc)
      out.push({ ...x, sqrtEcosw: cx, sqrtEsinw: cy });
  }
  return out;
}

// ---- the model ------------------------------------------------------------------------

const T0 = { name: 't0', unit: 'd', label: 'mid-transit time (conjunction)' };
const PERIOD = { name: 'P', unit: 'd', label: 'period' };

const PARAMETERS = [
  T0,
  PERIOD,
  { name: 'k', unit: '', label: 'Rp/R*', lo: 0.005, hi: 0.5 },
  { name: 'aRs', unit: '', label: 'a/R* (true)', lo: 1.5, hi: 200 },
  { name: 'b', unit: '', label: 'impact parameter at conjunction', lo: 0, hi: 1.5 },
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
];

const TRANSIT_ONLY = ['k', 'aRs', 'b', 'q1', 'q2'];

/** Fixed values for the parameters no row depends on, so no parameter is free without data. */
function prepare(request, data) {
  const s = request.settings || {};
  const n = data.groups ? maxGroup(data.groups) + 1 : 1;
  const roles = s.roles || rolesOf({}, data);
  if (roles.length < n)
    throw new Error(
      `the data have ${n} groups and settings.roles names only ${roles.length}`
    );
  if (!roles.includes('flux') && !roles.includes('rv'))
    throw new Error("settings.roles names no 'flux' and no 'rv' group");
  const parameters = { ...request.parameters };
  if (!roles.includes('rv'))
    for (const p of ['K', 'sqrtEcosw', 'sqrtEsinw'])
      parameters[p] = { mode: 'fixed', value: p === 'K' ? 1 : 0 };
  if (!roles.includes('flux'))
    for (const [p, v] of [
      ['k', 0.1],
      ['aRs', 10],
      ['b', 0.3],
      ['q1', 0.36],
      ['q2', 0.3],
    ])
      parameters[p] = { mode: 'fixed', value: v };
  return { ...request, settings: { ...s, roles }, parameters };
}

/** The fit and the star's share of what depends on it, for one planetary quantity. */
function planetDerived(v, settings, roles) {
  const out = {};
  const st = starOf(settings);
  const flux = roles.includes('flux');
  const rv = roles.includes('rv');
  const gone = refused(settings, roles);
  const { e, omega } = eccentricity(v.sqrtEcosw, v.sqrtEsinw);
  const Pd = v.P / (settings.perDay || 1);
  const aTrue = v.aRs;
  const base = {
    K: v.K,
    P: Pd,
    e,
    w: omega,
    aRs: aTrue,
    b: v.b,
    k: v.k,
  };
  const star = {
    sigmaMs: st.mass?.sigma ?? 0,
    sigmaRs: st.radius?.sigma ?? 0,
    correlation: st.correlation,
  };
  const at = (Ms, Rs) => planetOf(base, { Ms, Rs }, flux);
  const Ms = st.mass?.value;
  const Rs = st.radius?.value;
  const value = at(Ms ?? 1, Rs ?? 1);
  /** The gradient with respect to the star's two inputs, central differences. */
  const external = fn => {
    const hM = 1e-4 * (Ms ?? 1);
    const hR = 1e-4 * (Rs ?? 1);
    const g = {
      Ms: Ms ? (fn(Ms + hM, Rs ?? 1) - fn(Ms - hM, Rs ?? 1)) / (2 * hM) : 0,
      Rs: Rs ? (fn(Ms ?? 1, Rs + hR) - fn(Ms ?? 1, Rs - hR)) / (2 * hR) : 0,
    };
    return {
      externalVariance: stellarVariance(g, star),
      external: {
        stellarMass: st.mass,
        stellarRadius: st.radius,
        correlation: st.correlation,
      },
    };
  };
  const add = (name, unit, label, v0, fn) => {
    if (gone.has(name)) return;
    out[name] = { value: v0, unit, label, ...external(fn) };
  };
  if (rv)
    add(
      'MpSini',
      'MJup',
      flux
        ? 'minimum mass Mp sin i (the mass is this divided by sin i)'
        : 'MINIMUM mass Mp sin i: the velocities alone fix this and nothing more',
      value.MpSini,
      (m, r) => at(m, r).MpSini
    );
  if (flux && rv) {
    add('Mp', 'MJup', 'planet mass', value.Mp, (m, r) => at(m, r).Mp);
    add(
      'MpEarth',
      'Mearth',
      'planet mass in Earth masses',
      value.Mp * MJUP_PER_MEARTH,
      (m, r) => at(m, r).Mp * MJUP_PER_MEARTH
    );
  }
  if (flux) {
    add('Rp', 'RJup', 'planet radius', value.Rp, (m, r) => at(m, r).Rp);
  }
  if (flux && rv)
    add(
      'rhoP',
      'g/cm3',
      "planet's bulk density, with the star's mass and radius inside it",
      value.rhoP,
      (m, r) => at(m, r).rhoP
    );
  return out;
}

export const TRANSIT_RV_JOINT = {
  id: 'transit-rv-joint',
  version: '1.0.0',
  quantity: 'relative flux and radial velocity against time',
  parameters: PARAMETERS,
  linear: [
    { name: 'f0', unit: '', label: 'baseline flux' },
    { name: 'gamma', unit: 'm/s', label: 'zero point, per instrument' },
  ],
  nuisance: [{ name: 'jitter', unit: 'm/s', label: 'jitter', lo: 0, hi: 200 }],
  notClaimed: [
    "A planet's mass from velocities alone: they fix Mp sin i, and a mass needs the transit's inclination; without a transit the result is the minimum mass and is labelled so.",
    "A planet's radius, mass or density without the star's uncertainty: the stellar mass and radius are inputs with a stated uncertainty and are never taken as exact, and no planetary quantity is reported without the ones it needs.",
    "The stellar parameters themselves: they are stated by the reader with a source (a catalog or an isochrone fit); this model does not fit them, and a density is only as good as they are.",
    'A second planet, a trend, stellar activity or a transit-timing variation: one planet on one Keplerian orbit; a velocity scatter beyond the errors is the jitter, one value for all instruments, and a large one says the model is not describing the velocities.',
    "An exact eccentric transit: the light curve is the circular-orbit model with the first-order scaling of the duration by e and w (Winn 2010), whose error is under 2 percent of the duration for e up to 0.2.",
    'The Rossiter-McLaughlin effect and the planet’s atmosphere: not in the model.',
  ],
  assumptions: [
    'One planet; the same period, conjunction epoch, eccentricity and periastron serve the light curve and the velocities. w is the planet’s argument of periastron.',
    "The quadratic limb-darkening law in Kipping's q1, q2; a/R* is the true ratio, and the circular equivalent a/R* (1 + e sin w) / sqrt(1 - e^2) draws the transit.",
    'Each flux point is the mean over its exposure, sampled at `supersample` instants; each instrument has its own zero point.',
    'The planet is much lighter than the star in the transit, but not in the mass: the full relation with the sum of the masses is solved.',
    'The stellar mass and radius are independent of the fit with the correlation the reader states, and Gaussian.',
  ],
  prepare,
  predict(v, x, settings = {}, data) {
    const codes = rowCodes(data, settings);
    if (data) ROLES.set(data, codes);
    const out = new Float64Array(x.length);
    const flux = [];
    const rv = [];
    codes.forEach((c, i) => (c === FLUX ? flux : rv).push(i));
    if (flux.length) {
      const f = lightCurve(v, pick(x, flux), settings);
      flux.forEach((row, j) => (out[row] = f[j]));
    }
    if (rv.length) {
      const c = rvCurve(pick(x, rv), { ...v, tc: v.t0 });
      rv.forEach((row, j) => (out[row] = c[j]));
    }
    return out;
  },
  solveLinear,
  /** Keep b inside 1 + k and e below 0.95^2. */
  project(theta, free) {
    const out = theta.slice();
    const bi = free.findIndex(p => p.name === 'b');
    const ki = free.findIndex(p => p.name === 'k');
    if (bi >= 0) {
      const k = ki >= 0 ? theta[ki] : (free.fixedK ?? 0);
      out[bi] = Math.min(out[bi], 1 + k - 1e-6);
    }
    const a = free.findIndex(p => p.name === 'sqrtEcosw');
    const c = free.findIndex(p => p.name === 'sqrtEsinw');
    if (a >= 0 && c >= 0) {
      const r = Math.hypot(out[a], out[c]);
      if (r > 0.95) {
        out[a] *= 0.95 / r;
        out[c] *= 0.95 / r;
      }
    }
    return out;
  },
  requires(data) {
    if (data.x.length < 20) return 'fewer than twenty rows for a joint fit';
    return null;
  },
  jitterRows(data, request) {
    const roles = request.settings.roles;
    return Int8Array.from(data.x, (_, i) =>
      roles[data.groups ? data.groups[i] : 0] === 'rv' ? 1 : 0
    );
  },
  redNoiseRows(data, request) {
    const roles = request.settings.roles;
    const rows = [];
    for (let i = 0; i < data.x.length; i++)
      if (roles[data.groups ? data.groups[i] : 0] === 'flux') rows.push(i);
    return rows;
  },
  starts: startsFor,
  refusals(settings, roles) {
    return refusalsFor(settings, roles || rolesOf(settings));
  },
  derived(v, settings = {}) {
    const roles = settings.roles || ['flux', 'rv'];
    const flux = roles.includes('flux');
    const rv = roles.includes('rv');
    const { e, omega } = eccentricity(v.sqrtEcosw, v.sqrtEsinw);
    const Pd = v.P / (settings.perDay || 1);
    const out = {
      e: { value: e, unit: '', label: 'eccentricity' },
      omega: {
        value: (omega * 180) / Math.PI,
        unit: 'deg',
        label: "argument of periastron (the planet's)",
      },
    };
    if (rv) {
      // f(m) = P K^3 (1 - e^2)^(3/2) / (2 pi G), in solar masses: G cancels against the Sun's GM.
      out.massFunction = {
        value: (Pd * 86400 * v.K ** 3 * (1 - e * e) ** 1.5) / (2 * Math.PI * GM.sun),
        unit: 'Msun',
        label: 'mass function f(m) = Mp^3 sin^3 i / (Ms + Mp)^2',
      };
    }
    if (flux) {
      const { u1, u2 } = limbDarkening(v.q1, v.q2);
      const aC = circularEquivalent(v.aRs, e, omega);
      const sini = sinInclination(v.b, v.aRs, e, omega);
      const half = halfDuration({ P: v.P, k: v.k, aRs: aC, b: v.b });
      const center = transitFlux(
        [v.t0],
        { t0: v.t0, P: v.P, k: v.k, aRs: aC, b: v.b, u1, u2 },
        {}
      )[0];
      out.depth = { value: 1 - center, unit: '', label: 'depth at mid-transit' };
      out.T14 = {
        value: Num.isFinite(half) ? 2 * half : NaN,
        unit: 'd',
        label: 'total duration',
      };
      out.inclination = {
        value: (Math.asin(Math.min(1, Math.max(0, sini))) * 180) / Math.PI,
        unit: 'deg',
        label: 'inclination',
      };
      out.sini = { value: sini, unit: '', label: 'sin i' };
      out.u1 = { value: u1, unit: '', label: 'limb darkening u1' };
      out.u2 = { value: u2, unit: '', label: 'limb darkening u2' };
      out.rhoStar = {
        value: stellarDensity(v.aRs, Pd) / 1000,
        unit: 'g/cm3',
        label:
          "star's mean density from the transit (the true a/R*, so the orbit's eccentricity is in it)",
      };
    }
    const st = starOf(settings);
    if (flux && st.massOk && st.radiusOk) {
      const star = {
        sigmaMs: st.mass.sigma,
        sigmaRs: st.radius.sigma,
        correlation: st.correlation,
      };
      const Ms = st.mass.value;
      const Rs = st.radius.value;
      const hM = 1e-4 * Ms;
      const hR = 1e-4 * Rs;
      out.rhoStarStated = {
        value: starDensityOf(Ms, Rs),
        unit: 'g/cm3',
        label: "star's mean density from its stated mass and radius",
        externalVariance: stellarVariance(
          {
            Ms: (starDensityOf(Ms + hM, Rs) - starDensityOf(Ms - hM, Rs)) / (2 * hM),
            Rs: (starDensityOf(Ms, Rs + hR) - starDensityOf(Ms, Rs - hR)) / (2 * hR),
          },
          star
        ),
        fitIndependent: true,
      };
    }
    return { ...out, ...planetDerived(v, settings, roles) };
  },
  /**
   * What the data fix. The radius and so the density are open when the
   * radius ratio and the impact parameter are (Prompt 225's rule); the
   * inclination with them; the mass only when the sine of the inclination is
   * itself uncertain by more than a tenth.
   */
  identify(out) {
    const kb = constraintKB(out);
    const derived = {};
    const reasons = [];
    const flag = (names, why) => {
      for (const n of names) derived[n] = { status: 'not constrained', why };
    };
    if (kb && kb.status === 'not-constrained') {
      flag(['Rp', 'rhoP', 'inclination', 'sini'], 'k-b');
      reasons.push('k-b');
    }
    const sini = out.derived.find(d => d.name === 'sini');
    if (sini && Num.isFinite(sini.sigma) && sini.sigma > 0.1 * sini.value) {
      flag(['Mp', 'MpEarth', 'rhoP'], 'inclination');
      reasons.push('inclination');
    }
    const listed = new Set(out.rank?.notConstrained || []);
    const parameters = {};
    for (const q of out.parameters) {
      if (q.mode !== 'fitted') continue;
      const why = listed.has(q.name) ? 'rank' : null;
      parameters[q.name] = why
        ? { status: 'not constrained', why }
        : { status: 'constrained' };
    }
    return {
      status: reasons.length ? 'not constrained' : 'constrained',
      parameters,
      derived,
      reasons,
    };
  },
  /** Warnings only the joint model can give. */
  warnings(out, data, request) {
    const w = [];
    const jit = out.nuisance?.jitter?.value ?? 0;
    const req = request.parameters?.jitter || {};
    const hi = req.hi ?? TRANSIT_RV_JOINT.nuisance[0].hi;
    if (req.mode !== 'fixed' && jit >= hi * (1 - 1e-3))
      w.push({ code: 'jitterAtBound', value: jit, bound: hi });
    const roles = request.settings.roles;
    const sig = [];
    for (let i = 0; i < data.x.length; i++)
      if (roles[data.groups ? data.groups[i] : 0] === 'rv' && data.sigma)
        sig.push(data.sigma[i]);
    sig.sort((a, b) => a - b);
    const med = sig.length ? sig[sig.length >> 1] : NaN;
    if (jit > med)
      w.push({ code: 'jitterExceedsErrors', jitter: jit, medianError: med });
    const t = out.derived.find(d => d.name === 'rhoStar');
    const s = out.derived.find(d => d.name === 'rhoStarStated');
    if (t && s && t.sigma > 0 && s.sigma >= 0) {
      const z = (t.value - s.value) / Math.hypot(t.sigma, s.sigma);
      if (Math.abs(z) > 3)
        w.push({
          code: 'stellarDensityTension',
          z,
          transit: t.value,
          stated: s.value,
        });
    }
    return w;
  },
};
