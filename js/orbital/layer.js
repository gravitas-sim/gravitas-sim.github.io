// =============================================================================
// The orbital layer: elements and state vectors, with the units named
// -----------------------------------------------------------------------------
// Elements to a state vector and back, in 2-D and 3-D, with every quantity
// typed (dimension, unit system, frame, epoch on a named time scale) and a
// mismatch refused. It converts nothing across meanings: simulation to
// physical units, one time scale to another, one frame to another beyond the
// rotation an orbit needs stay with their authorities (js/units.js,
// js/mission/*, js/kernels/sky/). The arithmetic is its first consumers',
// operation for operation: the planar branch is js/systemSpec.js keplerState
// and the forward models' relativeState, the spatial branch js/lab3d/elements.js
// (two roundings of one state, each pinned to the bit where something depends
// on it). Newtonian two-body orbits: no perturbation, no relativistic term.
// Contract, frames, time scales, consumers and validation: ORBITAL_LAYER.md.
//
// A refusal is an OrbitalLayerError with a `code`: quantity, dimension, units,
// frame, timeScale, domain, elements (the 3-D kernel's own words), unbound,
// degenerate. Pure: no DOM, no state of its own.
// =============================================================================

import { solveKepler } from '../orbital.js';

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math } = globalThis;

const TAU = 2 * Math.PI;
const DEG = Math.PI / 180;
/** Below this, e is circular (the 3-D kernel's SINGULAR). */
const SINGULAR = 1e-11;

export const DIMENSIONS = Object.freeze([
  'length',
  'time',
  'speed',
  'gm',
  'rate',
  'angle',
  'dimensionless',
]);
const DIMENSIONAL = new Set(DIMENSIONS.slice(0, 5));
export const FRAMES = Object.freeze(['perifocal', 'primary-reference']);
/** The clocks: the 2-D engine's, the 3-D kernel's, day counts, and the astronomical scales. */
export const TIME_SCALES = Object.freeze([
  'simulation',
  'code',
  'elapsed',
  'TT',
  'TDB',
  'UTC',
]);
const SCALES = new Set(TIME_SCALES);
/** On a hyperbola, 'eccentric' is the hyperbolic anomaly H. */
export const ANOMALY_TYPES = Object.freeze(['mean', 'true', 'eccentric']);

export class OrbitalLayerError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'OrbitalLayerError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}
const refuse = (code, message, detail) => {
  throw new OrbitalLayerError(code, message, detail);
};

// --- Unit systems ------------------------------------------------------------

const sets = new Map();
/**
 * The engine's own length, time and mass. The time unit is a second only
 * through G, so G is part of the identity (null: unstated, mixes with no
 * stated one). The same arguments give the same object.
 */
export function simulationUnits(G = null, name = 'simulation') {
  if (G !== null && !(Number.isFinite(G) && G > 0))
    refuse('units', `G must be a positive number or null, not ${G}`);
  const id = `${name}(G=${G === null ? 'unstated' : G})`;
  if (!sets.has(id))
    sets.set(
      id,
      Object.freeze({
        kind: 'simulation',
        id,
        G,
        length: `${name} length`,
        time: `${name} time`,
        mass: `${name} mass`,
      })
    );
  return sets.get(id);
}
const physical = (id, length, time, mass) =>
  Object.freeze({ kind: 'physical', id, length, time, mass });
export const PHYSICAL_UNITS = Object.freeze({
  'AU-day': physical('AU-day', 'AU', 'day', 'solar mass'),
  'km-s': physical('km-s', 'km', 's', 'kg'),
});

const isUnits = u =>
  !!u &&
  (u.kind === 'simulation' || u.kind === 'physical') &&
  typeof u.id === 'string';
const isNumber = x => typeof x === 'number';
const UNITS_HINT = '(simulationUnits or PHYSICAL_UNITS)';

// --- Quantities --------------------------------------------------------------

/** A typed quantity, frozen: a number or an array of them, a dimension and units. */
export function quantity(value, dim, units = null) {
  const bare = dim === 'angle' || dim === 'dimensionless';
  if (!bare && !DIMENSIONAL.has(dim))
    refuse('dimension', `unknown dimension "${dim}"`);
  if (bare && units !== null) refuse('units', `a ${dim} has no unit system`);
  if (!bare && !isUnits(units))
    refuse('units', `a ${dim} needs a unit system ${UNITS_HINT}`);
  if (!(Array.isArray(value) ? value.every(isNumber) : isNumber(value)))
    refuse('quantity', `a ${dim} must be a number or numbers`);
  return Object.freeze({ value, dim, units });
}
export const length = (v, units) => quantity(v, 'length', units);
export const time = (v, units) => quantity(v, 'time', units);
export const speed = (v, units) => quantity(v, 'speed', units);
export const gm = (v, units) => quantity(v, 'gm', units);
export const rate = (v, units) => quantity(v, 'rate', units);
export const dimensionless = v => quantity(v, 'dimensionless');
/** An angle in radians; `degrees` takes degrees and holds radians. */
export const angle = v => quantity(v, 'angle');
export const degrees = v => quantity(v * DEG, 'angle');
/** A vector quantity of two or three components. */
export function vector(values, dim, units) {
  if (!Array.isArray(values) || (values.length !== 2 && values.length !== 3))
    refuse('quantity', 'a vector has two or three components');
  return quantity(Object.freeze(values.slice()), dim, units);
}
/** A time with its scale named (a duration, `time`, has none). */
export function instant(value, units, scale) {
  if (!SCALES.has(scale)) refuse('timeScale', `unknown time scale "${scale}"`);
  if (!isNumber(value)) refuse('quantity', 'an instant must be a number');
  if (!isUnits(units))
    refuse('units', `a time needs a unit system ${UNITS_HINT}`);
  return Object.freeze({ value, dim: 'time', units, scale });
}

function need(x, dim, what, units) {
  if (!x || typeof x !== 'object' || !('dim' in x) || !('value' in x))
    refuse('quantity', `${what} must be a typed quantity`);
  if (x.dim !== dim)
    refuse('dimension', `${what} is a ${x.dim}; a ${dim} is needed`);
  if (units && x.units?.id !== units.id)
    refuse('units', `${what} is in ${x.units?.id}; ${units.id} is needed`);
  return x;
}
function needInstant(x, what) {
  need(x, 'time', what);
  if (!SCALES.has(x.scale)) refuse('timeScale', `${what} is a duration`);
  return x;
}

/** An angle reduced to the principal turn, (-pi, pi]. */
export function principalAngle(a) {
  need(a, 'angle', 'the angle');
  let M = a.value % TAU;
  if (M > Math.PI) M -= TAU;
  if (M <= -Math.PI) M += TAU;
  return angle(M);
}

// --- Anomalies (plain radians, in the consumers' own forms) ------------------

const trueToEccentric = (nu, e) =>
  2 *
  Math.atan2(
    Math.sqrt(1 - e) * Math.sin(nu / 2),
    Math.sqrt(1 + e) * Math.cos(nu / 2)
  );
/** A true anomaly is always the principal one, (-pi, pi]. */
const eccentricToTrue = (E, e) => {
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  return nu - TAU * Math.round(nu / TAU);
};
const eccentricToMean = (E, e) => E - e * Math.sin(E);
const trueToHyperbolic = (nu, e) =>
  2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
const hyperbolicToTrue = (H, e) =>
  2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
const hyperbolicToMean = (H, e) => e * Math.sinh(H) - H;
/** Newton's method on e sinh H - H = M, from asinh(M / e). */
function meanToHyperbolic(M, e) {
  let H = Math.asinh(M / e);
  for (let k = 0; k < 200; k++) {
    const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
    H -= d;
    if (Math.abs(d) < 1e-16 * (1 + Math.abs(H))) break;
  }
  return H;
}

function convert(type, value, to, e) {
  if (type === to) return value;
  if (e < 1) {
    const E =
      type === 'mean'
        ? solveKepler(value, e)
        : type === 'true'
          ? trueToEccentric(value, e)
          : value;
    if (to === 'eccentric') return E;
    return to === 'mean' ? eccentricToMean(E, e) : eccentricToTrue(E, e);
  }
  if (type === 'true' && !(1 + e * Math.cos(value) > 0))
    refuse('domain', "a true anomaly past the hyperbola's asymptote");
  const H =
    type === 'mean'
      ? meanToHyperbolic(value, e)
      : type === 'true'
        ? trueToHyperbolic(value, e)
        : value;
  if (to === 'eccentric') return H;
  return to === 'mean' ? hyperbolicToMean(H, e) : hyperbolicToTrue(H, e);
}

const kind = (an, what = 'an anomaly') => {
  if (!an || !ANOMALY_TYPES.includes(an.type))
    refuse('quantity', `${what} names its kind: ${ANOMALY_TYPES.join(', ')}`);
  need(an.value, 'angle', 'the anomaly');
  return an;
};

/**
 * An anomaly `{ type, value: angle }` in another kind, for an ellipse or a
 * hyperbola. Mean to eccentric is solveKepler's, on the mean anomaly's own turn.
 */
export function convertAnomaly(anomaly, to, e) {
  kind(anomaly);
  if (!ANOMALY_TYPES.includes(to)) refuse('quantity', `no anomaly "${to}"`);
  need(e, 'dimensionless', 'e');
  if (!(e.value >= 0) || Math.abs(e.value - 1) < 1e-9)
    refuse('domain', `e = ${e.value}: an ellipse or a hyperbola is needed`);
  return Object.freeze({
    type: to,
    value: angle(convert(anomaly.type, anomaly.value.value, to, e.value)),
  });
}

// --- Elements ----------------------------------------------------------------

const ZERO = angle(0);

/** The 3-D kernel's list of why elements are unusable (js/lab3d/elements.js). */
function spatialProblem({ a, e, i, Omega, omega, M }, mu) {
  if (![a, e, i, Omega, omega, M, mu].every(Number.isFinite))
    return 'notFinite';
  if (!(mu > 0)) return 'mu';
  if (e < 0) return 'eccentricity';
  if (Math.abs(e - 1) < 1e-9) return 'parabolic';
  if (e < 1 && !(a > 0)) return 'ellipseAxis';
  if (e > 1 && !(a < 0)) return 'hyperbolaAxis';
  if (i < 0 || i > Math.PI) return 'inclination';
  return null;
}

/**
 * Checked elements. `dimension` 2: an ellipse, `omega` from the reference
 * axis, `sense` 1 or -1, `mu` or `period`. `dimension` 3: i, Omega, omega as
 * the kernel has them, a negative a on a hyperbola, `mu` required. `anomaly`
 * is `{ type, value }` at `epoch` (an instant in a's unit system).
 */
export function keplerElements(spec) {
  const planar = spec?.dimension === 2;
  if (!planar && spec?.dimension !== 3) refuse('domain', 'dimension is 2 or 3');
  const a = need(spec.a, 'length', 'a');
  const units = a.units;
  const e = need(spec.e, 'dimensionless', 'e');
  const omega = need(spec.omega, 'angle', 'omega');
  const i = planar ? ZERO : need(spec.i, 'angle', 'i');
  const Omega = planar ? ZERO : need(spec.Omega, 'angle', 'Omega');
  const an = kind(spec.anomaly);
  const epoch = needInstant(spec.epoch, 'the epoch');
  if (epoch.units.id !== units.id)
    refuse('units', `the epoch is in ${epoch.units.id}; ${units.id} is needed`);
  const opt = (q, dim, what) =>
    q === undefined ? null : need(q, dim, what, units);
  const mu = opt(spec.mu, 'gm', 'mu');
  const period = opt(spec.period, 'time', 'the period');
  const frame = spec.frame ?? 'primary-reference';
  if (!FRAMES.includes(frame)) refuse('frame', `unknown frame "${frame}"`);
  if (frame !== 'primary-reference')
    refuse('frame', 'elements are measured in the primary-reference frame');
  const sense = spec.sense ?? 1;
  if (sense !== 1 && sense !== -1) refuse('domain', 'sense is 1 or -1');
  if (!planar && sense !== 1) refuse('domain', 'a 3-D orbit has no sense');

  let shape = 'ellipse';
  if (planar) {
    if (
      ![a.value, e.value, omega.value, an.value.value, epoch.value].every(
        Number.isFinite
      )
    )
      refuse('domain', 'every element must be finite');
    if (!(e.value >= 0 && e.value < 1))
      refuse('domain', `e = ${e.value}: a planar orbit here is 0 <= e < 1`);
    if (!(a.value > 0)) refuse('domain', 'a must be positive');
    if (!mu && !period) refuse('domain', 'give mu or a period');
    if ((mu && !(mu.value > 0)) || (period && !(period.value > 0)))
      refuse('domain', 'mu and the period must be positive');
  } else {
    if (!mu) refuse('domain', 'a 3-D orbit needs mu');
    const problem = spatialProblem(
      {
        a: a.value,
        e: e.value,
        i: i.value,
        Omega: Omega.value,
        omega: omega.value,
        M: an.value.value,
      },
      mu.value
    );
    if (problem) refuse('elements', `elements: ${problem}`, problem);
    if (e.value > 1) shape = 'hyperbola';
  }
  return Object.freeze({
    kind: 'elements',
    dimension: planar ? 2 : 3,
    shape,
    a,
    e,
    i,
    Omega,
    omega,
    anomaly: Object.freeze({ type: an.type, value: an.value }),
    epoch,
    mu,
    period,
    sense,
    frame,
    units,
  });
}

function checkElements(el) {
  if (!el || el.kind !== 'elements')
    refuse('quantity', 'these are not elements from keplerElements');
  return el;
}
function meanMotionOf(el) {
  const a = el.a.value;
  if (el.shape === 'hyperbola') {
    const A = -a;
    return Math.sqrt(el.mu.value / (A * A * A));
  }
  return el.mu !== null
    ? Math.sqrt(el.mu.value / (a * a * a))
    : TAU / el.period.value;
}
/** The mean motion, a rate: sqrt(mu / a^3), or 2 pi / period. */
export const meanMotion = el => rate(meanMotionOf(checkElements(el)), el.units);

const meanAtEpoch = el =>
  convert(el.anomaly.type, el.anomaly.value.value, 'mean', el.e.value);
function timeSince(el, t) {
  needInstant(t, 'the time');
  if (t.scale !== el.epoch.scale)
    refuse(
      'timeScale',
      `the time is on ${t.scale} and the epoch on ${el.epoch.scale}; convert with the domain authority`
    );
  if (t.units.id !== el.units.id)
    refuse('units', `the time is in ${t.units.id}; ${el.units.id} is needed`);
  return t.value - el.epoch.value;
}
const meanAt = (el, dt) => meanAtEpoch(el) + meanMotionOf(el) * dt;
/** The mean anomaly at an instant on the epoch's scale (the epoch's if omitted), not reduced. */
export function meanAnomalyAt(el, t) {
  checkElements(el);
  return angle(
    t === undefined ? meanAtEpoch(el) : meanAt(el, timeSince(el, t))
  );
}

// --- Elements to a state -----------------------------------------------------

/** js/systemSpec.js keplerState's arithmetic. */
function planarPerifocal(el, M) {
  const a = el.a.value;
  const e = el.e.value;
  const n = meanMotionOf(el);
  const E = solveKepler(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const root = Math.sqrt(1 - e * e);
  const denom = 1 - e * cosE;
  const sense = el.sense;
  return [
    a * (cosE - e),
    sense * a * root * sinE,
    (-a * n * sinE) / denom,
    (sense * a * n * root * cosE) / denom,
  ];
}

/** js/lab3d/elements.js fromElements's arithmetic. */
function spatialPerifocal(el, M) {
  const a = el.a.value;
  const e = el.e.value;
  const mu = el.mu.value;
  if (e < 1) {
    const E = solveKepler(M, e);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const b = a * Math.sqrt(1 - e * e);
    const dE = Math.sqrt(mu / (a * a * a)) / (1 - e * cosE);
    return [
      [a * (cosE - e), b * sinE, 0],
      [-a * sinE * dE, b * cosE * dE, 0],
    ];
  }
  const A = -a;
  const H = meanToHyperbolic(M, e);
  const b = A * Math.sqrt(e * e - 1);
  const dH = Math.sqrt(mu / (A * A * A)) / (e * Math.cosh(H) - 1);
  return [
    [A * (e - Math.cosh(H)), b * Math.sinh(H), 0],
    [-A * Math.sinh(H) * dH, b * Math.cosh(H) * dH, 0],
  ];
}

/** A state built here from parts already checked. */
const stateOf = (frame, dimension, epoch, r, v, units) =>
  Object.freeze({
    kind: 'state',
    dimension,
    frame,
    epoch,
    r: Object.freeze({ value: Object.freeze(r), dim: 'length', units }),
    v: Object.freeze({ value: Object.freeze(v), dim: 'speed', units }),
  });

/**
 * A checked state vector: `r` (a length vector), `v` (a speed vector of the
 * same size and units), a `frame` from FRAMES and the `epoch` it holds at.
 */
export function makeState({ r, v, frame, epoch }) {
  need(r, 'length', 'the position');
  need(v, 'speed', 'the velocity', r.units);
  if (!Array.isArray(r.value) || r.value.length !== v.value?.length)
    refuse('dimension', 'position and velocity must have the same size');
  if (!FRAMES.includes(frame)) refuse('frame', `unknown frame "${frame}"`);
  needInstant(epoch, 'the epoch');
  if (epoch.units.id !== r.units.id)
    refuse('units', `the epoch is in ${epoch.units.id}; ${r.units.id} needed`);
  return Object.freeze({
    kind: 'state',
    dimension: r.value.length,
    frame,
    epoch,
    r,
    v,
  });
}

function perifocalOf(el, t) {
  const M = t === undefined ? meanAtEpoch(el) : meanAt(el, timeSince(el, t));
  if (el.dimension === 2) {
    const p = planarPerifocal(el, M);
    return { r: [p[0], p[1]], v: [p[2], p[3]] };
  }
  const [r, v] = spatialPerifocal(el, M);
  return { r, v };
}

/** The state in the orbit's own frame: x toward periapsis, z along the angular momentum. */
export function perifocalState(el, t) {
  checkElements(el);
  const when = t === undefined ? el.epoch : needInstant(t, 'the time');
  const { r, v } = perifocalOf(el, t);
  return stateOf('perifocal', el.dimension, when, r, v, el.units);
}

function rotated(el, pos, vel) {
  if (el.dimension === 2) {
    const c = Math.cos(el.omega.value);
    const s = Math.sin(el.omega.value);
    return {
      r: [pos[0] * c - pos[1] * s, pos[0] * s + pos[1] * c],
      v: [vel[0] * c - vel[1] * s, vel[0] * s + vel[1] * c],
    };
  }
  const cO = Math.cos(el.Omega.value);
  const sO = Math.sin(el.Omega.value);
  const co = Math.cos(el.omega.value);
  const so = Math.sin(el.omega.value);
  const ci = Math.cos(el.i.value);
  const si = Math.sin(el.i.value);
  const R = [
    [cO * co - sO * so * ci, -cO * so - sO * co * ci, sO * si],
    [sO * co + cO * so * ci, -sO * so + cO * co * ci, -cO * si],
    [so * si, co * si, ci],
  ];
  const rot = p => R.map(row => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
  return { r: rot(pos), v: rot(vel) };
}

/** The one frame change: a perifocal state into its elements' reference axes. */
export function toReferenceFrame(state, el) {
  checkElements(el);
  if (!state || state.kind !== 'state')
    refuse('quantity', 'this is not a state from the layer');
  if (state.frame !== 'perifocal')
    refuse('frame', `a ${state.frame} state is not perifocal`);
  if (state.dimension !== el.dimension)
    refuse(
      'dimension',
      `a ${state.dimension}-D state, ${el.dimension}-D elements`
    );
  if (state.r.units.id !== el.units.id)
    refuse(
      'units',
      `the state is in ${state.r.units.id}; ${el.units.id} needed`
    );
  const { r, v } = rotated(el, state.r.value, state.v.value);
  return stateOf(
    'primary-reference',
    el.dimension,
    state.epoch,
    r,
    v,
    el.units
  );
}

/**
 * The state relative to the primary in the primary-reference frame, at the
 * epoch or at an instant on its scale: the mean anomaly advanced by the mean
 * motion, Kepler's equation by solveKepler, the perifocal state turned.
 */
export function elementsToState(el, t) {
  checkElements(el);
  const when = t === undefined ? el.epoch : needInstant(t, 'the time');
  const p = perifocalOf(el, t);
  const { r, v } = rotated(el, p.r, p.v);
  return stateOf('primary-reference', el.dimension, when, r, v, el.units);
}

// --- A state to elements -----------------------------------------------------

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => Math.sqrt(dot(a, a));

/**
 * The elements of a primary-reference state, at its epoch, with the mean
 * anomaly and `trueAnomaly` beside it. 2-D: an ellipse of either sense, with
 * a `period` ('unbound' or 'degenerate' otherwise). 3-D: the kernel's
 * conventions.
 */
export function stateToElements(state, mu) {
  if (!state || state.kind !== 'state')
    refuse('quantity', 'this is not a state from the layer');
  if (state.frame !== 'primary-reference')
    refuse('frame', `a ${state.frame} state has no reference axes`);
  const units = state.r.units;
  need(state.v, 'speed', 'the velocity', units);
  need(mu, 'gm', 'mu', units);
  if (!(mu.value > 0)) refuse('domain', 'mu must be positive');
  if (![...state.r.value, ...state.v.value].every(Number.isFinite))
    refuse('domain', 'every component of the state must be finite');
  return state.dimension === 2
    ? planarElementsOf(state, mu.value, units)
    : spatialElementsOf(state, mu.value, units);
}

function planarElementsOf(state, mu, units) {
  const [x, y] = state.r.value;
  const [vx, vy] = state.v.value;
  const r = Math.hypot(x, y);
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0)) refuse('unbound', 'the orbit is not an ellipse');
  const a = -mu / (2 * energy);
  const h = x * vy - y * vx;
  if (h === 0) refuse('degenerate', 'no angular momentum');
  const sense = h > 0 ? 1 : -1;
  // The eccentricity vector points at periapsis.
  const ex = (vy * h) / mu - x / r;
  const ey = (-vx * h) / mu - y / r;
  const e = Math.hypot(ex, ey);
  const omega = e > 1e-12 ? Math.atan2(ey, ex) : 0;
  const nu = sense * (Math.atan2(y, x) - omega);
  const M = eccentricToMean(trueToEccentric(nu, e), e);
  const el = keplerElements({
    dimension: 2,
    a: length(a, units),
    e: dimensionless(e),
    omega: angle(omega),
    anomaly: { type: 'mean', value: angle(M) },
    epoch: state.epoch,
    mu: gm(mu, units),
    sense,
  });
  return Object.freeze({
    ...el,
    trueAnomaly: angle(nu),
    period: time(2 * Math.PI * Math.sqrt((a * a * a) / mu), units),
  });
}

function spatialElementsOf(state, mu, units) {
  const x = state.r.value;
  const v = state.v.value;
  const h = cross(x, v);
  const hn = norm(h);
  const r = norm(x);
  if (!(hn > 0)) refuse('degenerate', 'no angular momentum');
  const ev = cross(v, h).map((c, k) => c / mu - x[k] / r);
  const e = norm(ev);
  const a = 1 / (2 / r - dot(v, v) / mu);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hn)));
  const flat = i < SINGULAR || Math.PI - i < SINGULAR;
  const node = flat ? [1, 0, 0] : [-h[1], h[0], 0];
  const Omega = flat ? 0 : Math.atan2(node[1], node[0]);
  const nn = norm(node);
  // The in-plane direction the phase is measured from: periapsis, or the node
  // on a circular orbit.
  const along = (vec, from) =>
    Math.atan2(dot(cross(from, vec), h) / hn, dot(from, vec));
  const circular = e < SINGULAR;
  const omega = circular
    ? 0
    : along(
        ev,
        node.map(c => c / nn)
      );
  const ref = circular ? node.map(c => c / nn) : ev.map(c => c / e);
  const nu = along(x, ref);
  const M =
    e < 1
      ? eccentricToMean(trueToEccentric(nu, e), e)
      : hyperbolicToMean(trueToHyperbolic(nu, e), e);
  const el = keplerElements({
    dimension: 3,
    a: length(a, units),
    e: dimensionless(e),
    i: angle(i),
    Omega: angle(Omega),
    omega: angle(omega),
    anomaly: { type: 'mean', value: angle(M) },
    epoch: state.epoch,
    mu: gm(mu, units),
  });
  return Object.freeze({ ...el, trueAnomaly: angle(nu) });
}
