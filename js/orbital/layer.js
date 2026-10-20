// =============================================================================
// The orbital layer: elements and state vectors, with the units named
// -----------------------------------------------------------------------------
// Elements, state vectors and anomalies are converted in several places - the
// 3-D kernel, the mission core, the forward models, the Orbital System Builder
// - and they differ in what a number means: simulation units or physical ones,
// radians or degrees, a clock that starts at the run or at a Julian date.
// This module converts between elements and a state, in two dimensions and in
// three, and refuses when two quantities do not mean the same thing. It does
// not convert between meanings: simulation to physical units, one frame to
// another beyond the one rotation an orbit needs, one time scale to another.
// Those stay with their authorities (js/units.js, js/mission/*, js/kernels/sky/).
// ORBITAL_LAYER.md has the table of what is adopted and what is not.
//
// Every public function takes and returns typed quantities:
//
//   quantity    { value, dim, units }: dim is one of DIMENSIONS; units is a
//               unit system (simulationUnits(G), PHYSICAL_UNITS) for a length,
//               time, speed, gm (G times a mass) or rate, and null for an
//               angle (always radians) or a dimensionless number
//   instant     a time with a time scale named: { value, dim: 'time', units,
//               scale }, scale one of TIME_SCALES. A duration has no scale
//   vector      a quantity whose value is an array (2 or 3 components)
//   elements    from keplerElements: a, e, omega (and i, Omega in 3-D), one
//               anomaly with its kind named, the epoch it holds at, and mu or
//               a period; always in the 'primary-reference' frame
//   state       from elementsToState: r and v in one named frame, at an epoch
//
// A refusal is an OrbitalLayerError with a code: 'quantity' (not typed),
// 'dimension', 'units', 'frame', 'timeScale', 'domain' (an orbit this layer
// does not describe), 'elements' (the 3-D kernel's own problem list), 'unbound'
// and 'degenerate'.
//
// The arithmetic is the arithmetic of its first consumers, operation for
// operation, so that adopting the layer changes no orbit's numbers by a bit:
// the planar branch is js/systemSpec.js's keplerState and the forward models'
// relativeState, the spatial branch is js/lab3d/elements.js. Two ways of
// writing the same perifocal state, then, and they agree to rounding; each is
// pinned bit for bit where a golden or a saved file depends on its bits.
//
// Pure: no DOM, no state of its own. Newtonian two-body orbits only: no
// perturbations, no relativistic terms, no third body.
// =============================================================================

import { solveKepler } from '../orbital.js';

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math } = globalThis;

const TAU = 2 * Math.PI;
const DEG = Math.PI / 180;
/** Below this, e is circular (as the 3-D kernel's SINGULAR) */
const SINGULAR = 1e-11;

const DIMENSIONAL = new Set(['length', 'time', 'speed', 'gm', 'rate']);
export const DIMENSIONS = Object.freeze([
  'length',
  'time',
  'speed',
  'gm',
  'rate',
  'angle',
  'dimensionless',
]);
/** The frames a state or an element set can be named in. */
export const FRAMES = Object.freeze(['perifocal', 'primary-reference']);
/**
 * The clocks. 'simulation' is the 2-D engine's, in its time unit, zero at the
 * start of a run; 'code' the 3-D kernel's; 'elapsed' a day count from a zero
 * the system's author chose (the forward models); TT, TDB and UTC the
 * astronomical scales, named so a later consumer cannot pass one for another.
 */
export const TIME_SCALES = Object.freeze([
  'simulation',
  'code',
  'elapsed',
  'TT',
  'TDB',
  'UTC',
]);
const SCALES = new Set(TIME_SCALES);
/** The anomalies. On a hyperbola, 'eccentric' is the hyperbolic anomaly H. */
export const ANOMALY_TYPES = Object.freeze(['mean', 'true', 'eccentric']);

/** A refusal. `code` says which rule, `detail` (when set) the specific problem. */
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

const simulationSets = new Map();
/**
 * The simulation's units: length, time and mass in the engine's own scale. The
 * time unit is a second only through G (js/systemSpec.js secondsPerTimeUnit),
 * so G is part of the identity: a quantity made at G = 2 is not one made at
 * G = 9000. G may be left unstated (null) where the caller does not know it;
 * that is its own unit system and mixes with no stated one.
 *
 * @param {number|null} [G] - Gravitational constant, simulation units
 * @param {string} [name] - 'simulation', or 'code' for the 3-D kernel's
 * @returns {object} The unit system (the same object for the same arguments)
 */
export function simulationUnits(G = null, name = 'simulation') {
  if (G !== null && !(Number.isFinite(G) && G > 0))
    refuse('units', `G must be a positive number or null, not ${G}`);
  const key = `${name}(G=${G === null ? 'unstated' : G})`;
  let u = simulationSets.get(key);
  if (!u) {
    u = Object.freeze({
      kind: 'simulation',
      id: key,
      G,
      length: `${name} length`,
      time: `${name} time`,
      mass: `${name} mass`,
    });
    simulationSets.set(key, u);
  }
  return u;
}

/** Physical unit systems, by what a length and a time are in each. */
export const PHYSICAL_UNITS = Object.freeze({
  'AU-day': Object.freeze({
    kind: 'physical',
    id: 'AU-day',
    length: 'AU',
    time: 'day',
    mass: 'solar mass',
  }),
  'km-s': Object.freeze({
    kind: 'physical',
    id: 'km-s',
    length: 'km',
    time: 's',
    mass: 'kg',
  }),
  'm-s': Object.freeze({
    kind: 'physical',
    id: 'm-s',
    length: 'm',
    time: 's',
    mass: 'kg',
  }),
});

const isUnits = u =>
  !!u &&
  (u.kind === 'simulation' || u.kind === 'physical') &&
  typeof u.id === 'string';
const isNumber = x => typeof x === 'number';

// --- Quantities --------------------------------------------------------------

/**
 * A typed quantity.
 * @param {number|number[]} value - A number, or an array for a vector
 * @param {string} dim - One of DIMENSIONS
 * @param {object|null} [units] - A unit system, for a dimensional quantity
 * @returns {{value, dim, units}} Frozen
 */
export function quantity(value, dim, units = null) {
  const bare = dim === 'angle' || dim === 'dimensionless';
  if (!bare && !DIMENSIONAL.has(dim))
    refuse('dimension', `unknown dimension "${dim}"`);
  if (bare && units !== null)
    refuse('units', `a ${dim} carries no unit system`);
  if (!bare && !isUnits(units))
    refuse(
      'units',
      `a ${dim} needs a unit system (simulationUnits or PHYSICAL_UNITS)`
    );
  const ok = Array.isArray(value) ? value.every(isNumber) : isNumber(value);
  if (!ok) refuse('quantity', `a ${dim} must be a number or numbers`);
  return Object.freeze({ value, dim, units });
}
export const length = (v, units) => quantity(v, 'length', units);
export const time = (v, units) => quantity(v, 'time', units);
export const speed = (v, units) => quantity(v, 'speed', units);
export const gm = (v, units) => quantity(v, 'gm', units);
export const rate = (v, units) => quantity(v, 'rate', units);
export const dimensionless = v => quantity(v, 'dimensionless');
/** An angle, in radians. */
export const angle = v => quantity(v, 'angle');
/** An angle given in degrees, held in radians. */
export const degrees = v => quantity(v * DEG, 'angle');
/** A vector quantity, 2 or 3 components. */
export function vector(values, dim, units) {
  if (!Array.isArray(values) || (values.length !== 2 && values.length !== 3))
    refuse('quantity', 'a vector has two or three components');
  return quantity(Object.freeze(values.slice()), dim, units);
}
/** A time with its scale named. */
export function instant(value, units, scale) {
  if (!SCALES.has(scale))
    refuse(
      'timeScale',
      `unknown time scale "${scale}"; one of ${TIME_SCALES.join(', ')}`
    );
  if (!isNumber(value)) refuse('quantity', 'an instant must be a number');
  if (!isUnits(units))
    refuse(
      'units',
      'a time needs a unit system (simulationUnits or PHYSICAL_UNITS)'
    );
  return Object.freeze({ value, dim: 'time', units, scale });
}

function need(x, dim, what, units) {
  if (!x || typeof x !== 'object' || !('dim' in x) || !('value' in x))
    refuse('quantity', `${what} must be a typed quantity`);
  if (x.dim !== dim)
    refuse('dimension', `${what} is a ${x.dim}; a ${dim} is needed`);
  if (units && x.units?.id !== units.id)
    refuse(
      'units',
      `${what} is in ${x.units?.id ?? 'no units'}; ${units.id} is needed`
    );
  return x;
}
function needInstant(x, what) {
  need(x, 'time', what);
  if (!TIME_SCALES.includes(x.scale))
    refuse('timeScale', `${what} is a duration; an instant names its scale`);
  return x;
}

/**
 * An angle reduced to the principal turn, (-pi, pi].
 * @param {{value: number}} a - An angle
 * @returns {object} The angle
 */
export function principalAngle(a) {
  need(a, 'angle', 'the angle');
  let M = a.value % TAU;
  if (M > Math.PI) M -= TAU;
  if (M <= -Math.PI) M += TAU;
  return angle(M);
}

// --- Anomalies ---------------------------------------------------------------
//
// Plain radians, in the forms the consumers wrote them.

const trueToEccentric = (nu, e) =>
  2 *
  Math.atan2(
    Math.sqrt(1 - e) * Math.sin(nu / 2),
    Math.sqrt(1 + e) * Math.cos(nu / 2)
  );
/** The true anomaly is always the principal one, (-pi, pi]. */
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
/** Newton's method on the hyperbolic Kepler equation, from asinh(M / e). */
function meanToHyperbolic(M, e) {
  let H = Math.asinh(M / e);
  for (let k = 0; k < 200; k++) {
    const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
    H -= d;
    if (Math.abs(d) < 1e-16 * (1 + Math.abs(H))) break;
  }
  return H;
}

/** One anomaly in the form asked for, plain radians; 'eccentric' is H when e > 1. */
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
    refuse('domain', "that true anomaly is past the hyperbola's asymptote");
  const H =
    type === 'mean'
      ? meanToHyperbolic(value, e)
      : type === 'true'
        ? trueToHyperbolic(value, e)
        : value;
  if (to === 'eccentric') return H;
  return to === 'mean' ? hyperbolicToMean(H, e) : hyperbolicToTrue(H, e);
}

/**
 * An anomaly in another kind, for an ellipse (e < 1) or a hyperbola (e > 1).
 * Mean to eccentric goes through js/orbital.js's solveKepler, on the mean
 * anomaly's own turn, and so does eccentric to mean; a true anomaly is always
 * the principal one, (-pi, pi], and the eccentric anomaly made from it too.
 *
 * @param {{type: string, value: object}} anomaly - { type, value: angle }
 * @param {string} to - One of ANOMALY_TYPES
 * @param {object} e - Eccentricity, dimensionless
 * @returns {{type: string, value: object}} The same position on the orbit
 */
export function convertAnomaly(anomaly, to, e) {
  if (!anomaly || !ANOMALY_TYPES.includes(anomaly.type))
    refuse(
      'quantity',
      `an anomaly names its kind: ${ANOMALY_TYPES.join(', ')}`
    );
  if (!ANOMALY_TYPES.includes(to))
    refuse('quantity', `no anomaly named "${to}"`);
  need(anomaly.value, 'angle', 'the anomaly');
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
  const finite = [a, e, i, Omega, omega, M, mu].every(Number.isFinite);
  if (!finite) return 'notFinite';
  if (!(mu > 0)) return 'mu';
  if (e < 0) return 'eccentricity';
  if (Math.abs(e - 1) < 1e-9) return 'parabolic';
  if (e < 1 && !(a > 0)) return 'ellipseAxis';
  if (e > 1 && !(a < 0)) return 'hyperbolaAxis';
  if (i < 0 || i > Math.PI) return 'inclination';
  return null;
}

/**
 * Elements of a two-body orbit, checked.
 *
 * @param {object} spec
 * @param {number} spec.dimension - 2 (planar: no i, no Omega, a sense) or 3
 * @param {object} spec.a - Semi-major axis, a length; negative on a hyperbola
 *   (3-D only)
 * @param {object} spec.e - Eccentricity, dimensionless; 3-D allows e > 1
 * @param {object} spec.omega - Argument of periapsis, an angle: from the
 *   reference axis in 2-D, from the ascending node in 3-D
 * @param {object} [spec.i] - Inclination, an angle (3-D)
 * @param {object} [spec.Omega] - Longitude of the ascending node (3-D)
 * @param {{type: string, value: object}} spec.anomaly - One anomaly, its kind
 *   named, at the epoch
 * @param {object} spec.epoch - An instant, in the unit system of `a`
 * @param {object} [spec.mu] - G times the mass(es), a gm (needed in 3-D)
 * @param {object} [spec.period] - The period, a time (2-D: either mu or this)
 * @param {number} [spec.sense] - 2-D only: 1 counter-clockwise, -1 clockwise
 * @param {string} [spec.frame] - Only 'primary-reference'
 * @returns {object} Frozen elements
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
  const an = spec.anomaly;
  if (!an || !ANOMALY_TYPES.includes(an.type))
    refuse(
      'quantity',
      `an anomaly names its kind: ${ANOMALY_TYPES.join(', ')}`
    );
  need(an.value, 'angle', 'the anomaly');
  const epoch = needInstant(spec.epoch, 'the epoch');
  if (epoch.units.id !== units.id)
    refuse('units', `the epoch is in ${epoch.units.id}; ${units.id} is needed`);
  const mu = spec.mu === undefined ? null : need(spec.mu, 'gm', 'mu', units);
  const period =
    spec.period === undefined
      ? null
      : need(spec.period, 'time', 'the period', units);
  const frame = spec.frame ?? 'primary-reference';
  if (!FRAMES.includes(frame)) refuse('frame', `unknown frame "${frame}"`);
  if (frame !== 'primary-reference')
    refuse(
      'frame',
      "elements are angles from the reference axes: 'primary-reference'"
    );
  const sense = spec.sense ?? 1;
  if (sense !== 1 && sense !== -1) refuse('domain', 'sense is 1 or -1');
  if (!planar && sense !== 1)
    refuse('domain', 'a 3-D orbit has no sense; its inclination carries it');

  let shape = 'ellipse';
  if (planar) {
    const ok = [
      a.value,
      e.value,
      omega.value,
      an.value.value,
      epoch.value,
    ].every(Number.isFinite);
    if (!ok) refuse('domain', 'every element must be finite');
    if (!(e.value >= 0 && e.value < 1))
      refuse(
        'domain',
        `e = ${e.value}: a planar orbit here is an ellipse, 0 <= e < 1`
      );
    if (!(a.value > 0)) refuse('domain', 'a must be positive');
    if (mu === null && period === null) refuse('domain', 'give mu or a period');
    if (mu !== null && !(mu.value > 0)) refuse('domain', 'mu must be positive');
    if (period !== null && !(period.value > 0))
      refuse('domain', 'the period must be positive');
  } else {
    if (mu === null) refuse('domain', 'a 3-D orbit needs mu');
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

/** The mean motion, a rate: sqrt(mu / a^3) or 2 pi / period. */
export function meanMotion(el) {
  return rate(meanMotionOf(checkElements(el)), el.units);
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

/** The mean anomaly at the epoch, plain radians. */
function meanAtEpoch(el) {
  return convert(el.anomaly.type, el.anomaly.value.value, 'mean', el.e.value);
}

/**
 * The mean anomaly at an instant: M at the epoch plus the mean motion times
 * the time since. The instant must be on the epoch's time scale, in its units.
 *
 * @param {object} el - Elements
 * @param {object} [t] - An instant; the epoch if omitted
 * @returns {object} An angle, not reduced
 */
export function meanAnomalyAt(el, t) {
  checkElements(el);
  if (t === undefined) return angle(meanAtEpoch(el));
  return angle(meanAt(el, timeSince(el, t)));
}
function timeSince(el, t) {
  needInstant(t, 'the time');
  if (t.scale !== el.epoch.scale)
    refuse(
      'timeScale',
      `the time is on ${t.scale} and the epoch on ${el.epoch.scale}; convert with the domain authority, not here`
    );
  if (t.units.id !== el.units.id)
    refuse('units', `the time is in ${t.units.id}; ${el.units.id} is needed`);
  return t.value - el.epoch.value;
}
const meanAt = (el, dt) => meanAtEpoch(el) + meanMotionOf(el) * dt;

// --- Elements to a state -----------------------------------------------------

/** The planar perifocal state, js/systemSpec.js keplerState's arithmetic. */
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

/** The spatial perifocal state, js/lab3d/elements.js fromElements's arithmetic. */
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

/**
 * A state vector, checked: position and velocity in one named frame, at an
 * instant, in one unit system.
 *
 * @param {object} spec
 * @param {object} spec.r - Position, a length vector of 2 or 3 components
 * @param {object} spec.v - Velocity, a speed vector of the same size and units
 * @param {string} spec.frame - One of FRAMES
 * @param {object} spec.epoch - The instant the state holds at, in those units
 * @returns {object} Frozen state
 */
export function makeState({ r, v, frame, epoch }) {
  need(r, 'length', 'the position');
  need(v, 'speed', 'the velocity', r.units);
  if (!Array.isArray(r.value) || r.value.length !== v.value?.length)
    refuse('dimension', 'position and velocity must have the same size');
  if (!FRAMES.includes(frame)) refuse('frame', `unknown frame "${frame}"`);
  needInstant(epoch, 'the epoch');
  if (epoch.units.id !== r.units.id)
    refuse(
      'units',
      `the epoch is in ${epoch.units.id}; ${r.units.id} is needed`
    );
  return Object.freeze({
    kind: 'state',
    dimension: r.value.length,
    frame,
    epoch,
    r,
    v,
  });
}
/** A state built by this module from parts it has already checked. */
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
 * The orbit's own frame: x toward periapsis, y a quarter turn along the motion
 * (z, in 3-D, along the angular momentum). The position and velocity relative
 * to the primary at the epoch, or at `t`.
 *
 * @param {object} el - Elements
 * @param {object} [t] - An instant on the epoch's time scale
 * @returns {object} A state in the 'perifocal' frame
 */
export function perifocalState(el, t) {
  checkElements(el);
  const when = t === undefined ? el.epoch : needInstant(t, 'the time');
  const { r, v } = perifocalOf(el, t);
  return stateOf('perifocal', el.dimension, when, r, v, el.units);
}

/** The perifocal position and velocity as plain arrays. */
function perifocalOf(el, t) {
  const M = t === undefined ? meanAtEpoch(el) : meanAt(el, timeSince(el, t));
  if (el.dimension === 2) {
    const p = planarPerifocal(el, M);
    return { r: [p[0], p[1]], v: [p[2], p[3]] };
  }
  const [r, v] = spatialPerifocal(el, M);
  return { r, v };
}

/**
 * The one frame change the layer makes: a perifocal state into the frame its
 * elements are measured in, the primary-centred reference axes.
 *
 * @param {object} state - A state in the 'perifocal' frame
 * @param {object} el - The elements that state belongs to
 * @returns {object} A state in the 'primary-reference' frame
 */
export function toReferenceFrame(state, el) {
  checkElements(el);
  if (!state || state.kind !== 'state')
    refuse('quantity', 'this is not a state from the layer');
  if (state.frame !== 'perifocal')
    refuse(
      'frame',
      `a ${state.frame} state is not perifocal; nothing to rotate`
    );
  if (state.dimension !== el.dimension)
    refuse(
      'dimension',
      `a ${state.dimension}-D state and ${el.dimension}-D elements`
    );
  if (state.r.units.id !== el.units.id)
    refuse(
      'units',
      `the state is in ${state.r.units.id}; ${el.units.id} is needed`
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

/** A perifocal position and velocity turned into the reference axes. */
function rotated(el, pos, vel) {
  if (el.dimension === 2) {
    const [px, py] = pos;
    const [pvx, pvy] = vel;
    const c = Math.cos(el.omega.value);
    const s = Math.sin(el.omega.value);
    return {
      r: [px * c - py * s, px * s + py * c],
      v: [pvx * c - pvy * s, pvx * s + pvy * c],
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

/**
 * Elements to the state relative to the primary, in the primary-reference
 * frame: the perifocal state turned into the reference axes.
 *
 * @param {object} el - Elements (keplerElements)
 * @param {object} [t] - An instant on the epoch's time scale and in its units;
 *   the state at the epoch if omitted
 * @returns {object} The state, frame 'primary-reference'
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
 * The elements of a state relative to its primary.
 *
 * 2-D: an ellipse of either sense (the clockwise orbit has sense -1); the
 * periapsis direction of a circular orbit is undefined and is the reference
 * axis. 3-D: the conventions of js/lab3d/elements.js (a negative for a
 * hyperbola, Omega 0 with no node, omega 0 with no periapsis, i from +z).
 * The anomaly returned is the mean, and `trueAnomaly` is beside it.
 *
 * @param {object} state - A state in the 'primary-reference' frame
 * @param {object} mu - G times the mass(es), a gm in the state's units
 * @returns {object} Elements at the state's epoch, with `trueAnomaly` and,
 *   for an ellipse, `period`
 * @throws {OrbitalLayerError} 'unbound' (2-D, not an ellipse), 'degenerate'
 *   (no angular momentum), or a unit, frame or dimension refusal
 */
export function stateToElements(state, mu) {
  if (!state || state.kind !== 'state')
    refuse('quantity', 'this is not a state from the layer');
  if (state.frame !== 'primary-reference')
    refuse(
      'frame',
      `a ${state.frame} state has no reference axes to measure from`
    );
  const units = state.r.units;
  need(state.v, 'speed', 'the velocity', units);
  need(mu, 'gm', 'mu', units);
  const m = mu.value;
  if (!(m > 0)) refuse('domain', 'mu must be positive');
  if (![...state.r.value, ...state.v.value].every(Number.isFinite))
    refuse('domain', 'every component of the state must be finite');
  return state.dimension === 2
    ? planarElementsOf(state, m, units)
    : spatialElementsOf(state, m, units);
}

function planarElementsOf(state, mu, units) {
  const [x, y] = state.r.value;
  const [vx, vy] = state.v.value;
  const r = Math.hypot(x, y);
  const v2 = vx * vx + vy * vy;
  const energy = v2 / 2 - mu / r;
  if (!(energy < 0))
    refuse(
      'unbound',
      'the orbit is not bound; this layer describes ellipses in 2-D'
    );
  const a = -mu / (2 * energy);
  const h = x * vy - y * vx;
  if (h === 0)
    refuse('degenerate', 'no angular momentum: a straight-line orbit');
  const sense = h > 0 ? 1 : -1;
  // The eccentricity vector points at periapsis.
  const ex = (vy * h) / mu - x / r;
  const ey = (-vx * h) / mu - y / r;
  const e = Math.hypot(ex, ey);
  const omega = e > 1e-12 ? Math.atan2(ey, ex) : 0;
  // True anomaly from the angle of the position past periapsis.
  const nu = sense * (Math.atan2(y, x) - omega);
  const E = trueToEccentric(nu, e);
  const M = eccentricToMean(E, e);
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
  if (!(hn > 0))
    refuse('degenerate', 'no angular momentum: a straight-line orbit');
  const ev = cross(v, h).map((c, k) => c / mu - x[k] / r);
  const e = norm(ev);
  const a = 1 / (2 / r - dot(v, v) / mu);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / hn)));
  const planar = i < SINGULAR || Math.PI - i < SINGULAR;
  const node = planar ? [1, 0, 0] : [-h[1], h[0], 0];
  const Omega = planar ? 0 : Math.atan2(node[1], node[0]);
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
