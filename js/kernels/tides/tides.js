// Analytic tides in the constant-Q model: the equilibrium bulge, the heating of
// a synchronous satellite, the recession of a circular orbit and the spin-down
// of the planet that raises the tide, and the locking time. SI in, SI out, no
// DOM, no clock. The equations, limits and references are TIDAL_KERNEL.md's;
// the Roche limits are roche.js's.
import { G_SI } from '../../constants.js';
import { TidesError, finite, params, positive } from './errors.js';

/** The smallest Q the model accepts: below it the lag is no longer small. */
export const Q_MIN = 5;
/** The largest: nothing is known to be that dissipation-free. */
export const Q_MAX = 1e7;
/** The largest Love number k2: the homogeneous fluid body. */
export const K2_MAX = 1.5;
/** The largest eccentricity the leading-order heating formula is used at. */
export const HEATING_E_MAX = 0.1;
/** The Earth's moment-of-inertia factor, the default. */
export const ALPHA_EARTH = 0.3307;

const SECONDS_PER_YEAR = 31557600;
export { SECONDS_PER_YEAR };

/** k2 and Q, checked against the model's range; returns k2 / Q. */
function dissipation(p) {
  const k2 = finite(p.k2, 'k2');
  const Q = finite(p.Q, 'Q');
  if (!(k2 > 0 && k2 <= K2_MAX)) {
    throw new TidesError('k2-range', `k2 must lie in (0, ${K2_MAX}]`, {
      k2,
      max: K2_MAX,
    });
  }
  if (!(Q >= Q_MIN && Q <= Q_MAX)) {
    throw new TidesError(
      'q-range',
      `Q must lie in [${Q_MIN}, ${Q_MAX}] for the constant-Q model`,
      { Q, min: Q_MIN, max: Q_MAX }
    );
  }
  return k2 / Q;
}

function alphaOf(p) {
  const alpha = p.alpha === undefined ? ALPHA_EARTH : p.alpha;
  if (typeof alpha !== 'number' || !(alpha > 0 && alpha <= 0.4)) {
    throw new TidesError(
      'alpha-range',
      'the moment-of-inertia factor must lie in (0, 0.4]'
    );
  }
  return alpha;
}

/**
 * The equilibrium tide, peak to trough: (3/2) h2 (m/M) (R/d)^3 R. The sub-
 * and anti-perturber bulges stand at P2 = 1 and the belt at P2 = -1/2 of the
 * potential's height G m R^2 / d^3 over g.
 *
 * @param {{perturberMass:number, distance:number, bodyMass:number, bodyRadius:number, h2?:number}} p
 * @returns {{height:number, bulgeHeight:number, troughDepth:number}} metres
 */
export function tidalBulge(p) {
  params(p);
  const m = positive(p.perturberMass, 'perturberMass');
  const d = positive(p.distance, 'distance');
  const M = positive(p.bodyMass, 'bodyMass');
  const R = positive(p.bodyRadius, 'bodyRadius');
  const h2 = p.h2 === undefined ? 1 : positive(p.h2, 'h2');
  if (d <= R) {
    throw new TidesError(
      'orbit-inside-body',
      'the perturber is inside the body'
    );
  }
  const unit = h2 * (m / M) * (R / d) ** 3 * R;
  return { height: 1.5 * unit, bulgeHeight: unit, troughDepth: 0.5 * unit };
}

/**
 * Tidal heating of a synchronous satellite on an eccentric orbit about a
 * primary (Peale, Cassen and Reynolds 1979): (21/2) (k2/Q) G M^2 n R^5 e^2 / a^6,
 * leading order in e. The answer is proportional to the unknown k2/Q; use
 * heatingRange or requiredK2OverQ to state it as the bound it is.
 *
 * @param {{primaryMass:number, satelliteRadius:number, semiMajorAxis:number, eccentricity:number, k2:number, Q:number, satelliteMass?:number}} p
 * @returns {{power:number, energyPerOrbit:number, period:number, n:number}} W, J, s, rad/s
 */
export function tidalHeating(p) {
  params(p);
  return heatingFrom(p, dissipation(p));
}

function heatingFrom(p, k2OverQ) {
  const M = positive(p.primaryMass, 'primaryMass');
  const R = positive(p.satelliteRadius, 'satelliteRadius');
  const a = positive(p.semiMajorAxis, 'semiMajorAxis');
  const e = finite(p.eccentricity, 'eccentricity');
  const m =
    p.satelliteMass === undefined
      ? 0
      : positive(p.satelliteMass, 'satelliteMass');
  if (!(e >= 0 && e <= HEATING_E_MAX)) {
    throw new TidesError(
      'eccentricity',
      `the heating formula is leading order in e: e must lie in [0, ${HEATING_E_MAX}]`,
      { e, max: HEATING_E_MAX }
    );
  }
  if (a <= R) {
    throw new TidesError(
      'orbit-inside-body',
      'the orbit is inside the satellite'
    );
  }
  const n = Math.sqrt((G_SI * (M + m)) / (a * a * a));
  const power = (10.5 * k2OverQ * G_SI * M * M * n * R ** 5 * e * e) / a ** 6;
  const period = (2 * Math.PI) / n;
  return { power, energyPerOrbit: power * period, period, n };
}

/**
 * The heating over a stated range of k2/Q: the order-of-magnitude bound. The
 * lowest and highest the model allows are k2/Q from `k2OverQMin` to
 * `k2OverQMax` (defaults: the hydrostatic maximum k2 = 3/2 over the smallest
 * accepted Q, and a thousandth of it).
 */
export function heatingRange(p) {
  params(p);
  const hi =
    p.k2OverQMax === undefined
      ? K2_MAX / Q_MIN
      : positive(p.k2OverQMax, 'k2OverQMax');
  const lo =
    p.k2OverQMin === undefined
      ? hi / 1000
      : positive(p.k2OverQMin, 'k2OverQMin');
  if (lo > hi) throw new TidesError('input', 'k2OverQMin exceeds k2OverQMax');
  return {
    low: heatingFrom(p, lo).power,
    high: heatingFrom(p, hi).power,
    k2OverQMin: lo,
    k2OverQMax: hi,
  };
}

/** The k2/Q a stated heating power requires, for the same orbit. */
export function requiredK2OverQ(p) {
  params(p);
  const observed = positive(p.power, 'power');
  const unit = heatingFrom(p, 1).power;
  if (!(unit > 0)) {
    throw new TidesError(
      'eccentricity',
      'zero eccentricity gives no heating at any k2/Q'
    );
  }
  const k2OverQ = observed / unit;
  return { k2OverQ, withinModel: k2OverQ <= K2_MAX / Q_MIN };
}

// ---- Evolution of a circular orbit and the planet's spin -----------------------

/** The orbit's constants: everything evolution and recession share. */
function orbitOf(p) {
  params(p);
  const M = positive(p.primaryMass, 'primaryMass');
  const R = positive(p.primaryRadius, 'primaryRadius');
  const m = positive(p.satelliteMass, 'satelliteMass');
  const a0 = positive(p.semiMajorAxis, 'semiMajorAxis');
  const spin = finite(p.spin, 'spin');
  if (!(spin > 0)) throw new TidesError('input', 'spin must be above zero');
  if (a0 <= R) {
    throw new TidesError(
      'orbit-inside-body',
      'the orbit is inside the primary'
    );
  }
  const k2OverQ = dissipation(p);
  const alpha = alphaOf(p);
  // The caller's own units (an engine's G) and a stated rate multiplier: the
  // real tide is about 1e-12 of the central pull, so a scenario that shows it
  // within minutes says how many times faster it runs.
  const G = p.G === undefined ? G_SI : positive(p.G, 'G');
  const rate = p.rate === undefined ? 1 : positive(p.rate, 'rate');
  const mu = (M * m) / (M + m);
  const muTot = G * (M + m);
  const I = alpha * M * R * R;
  const n0 = Math.sqrt(muTot / (a0 * a0 * a0));
  const C = rate * 3 * k2OverQ * (m / M) * R ** 5 * Math.sqrt(muTot);
  return { M, R, m, a0, spin, k2OverQ, mu, muTot, I, n0, C, alpha, G, rate };
}

const orbitalL = (o, a) => o.mu * Math.sqrt(o.muTot * a);

/**
 * The instantaneous rates for a circular orbit raised by constant-Q tides in
 * the primary: the torque, da/dt, d(omega)/dt, and the sign (+1 when the spin
 * is ahead of the orbit and the moon recedes, -1 when it is behind and the
 * moon falls, 0 exactly at corotation).
 */
export function recession(p) {
  const o = orbitOf(p);
  const sign = Math.sign(o.spin - o.n0);
  const torque =
    (o.rate * 1.5 * o.k2OverQ * o.G * o.m * o.m * o.R ** 5) / o.a0 ** 6;
  const dadt = sign * o.C * o.a0 ** -5.5;
  const dLdt = (0.5 * orbitalL(o, o.a0) * dadt) / o.a0;
  return {
    n: o.n0,
    sign,
    torque,
    dadt,
    dOmegaDt: -dLdt / o.I,
    momentOfInertia: o.I,
    C: o.C,
  };
}

/** The state after `time` seconds (negative for the past), from the closed form. */
function stateAt(o, sign, time) {
  const x = o.a0 ** 6.5 + 6.5 * sign * o.C * time;
  if (!(x > 0)) {
    throw new TidesError(
      'orbit-inside-body',
      'the orbit has shrunk to nothing before this time',
      { contactTime: (0 - o.a0 ** 6.5) / (6.5 * sign * o.C) }
    );
  }
  const a = x ** (2 / 13);
  const spin = o.spin - (orbitalL(o, a) - orbitalL(o, o.a0)) / o.I;
  const n = Math.sqrt(o.muTot / (a * a * a));
  return { a, spin, n };
}

/**
 * Evolve a circular orbit and the planet's spin for `time` seconds by the
 * closed form a^(13/2) = a0^(13/2) + (13/2) s C t. Refuses where the model
 * stops: the orbit reaching the primary's surface ('orbit-inside-body') or the
 * spin meeting the orbital rate ('corotation', with the time in `detail`).
 *
 * @param {object} p - recession's parameters plus `time` in seconds
 */
export function evolveCircular(p) {
  const o = orbitOf(p);
  const time = finite(p.time, 'time');
  const sign = Math.sign(o.spin - o.n0);
  if (sign === 0) {
    throw new TidesError(
      'corotation',
      'the spin equals the orbital rate: nothing evolves',
      {
        time: 0,
      }
    );
  }
  const end = stateAt(o, sign, time);
  if (end.a <= o.R) {
    throw new TidesError(
      'orbit-inside-body',
      'the orbit reaches the primary',
      {}
    );
  }
  if ((end.spin - end.n) * sign <= 0) {
    // Bisect the closed form for the moment spin and orbit meet.
    let lo = 0;
    let hi = time;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      let s;
      try {
        s = stateAt(o, sign, mid);
      } catch {
        hi = mid;
        continue;
      }
      if ((s.spin - s.n) * sign <= 0) hi = mid;
      else lo = mid;
    }
    throw new TidesError(
      'corotation',
      'the spin meets the orbital rate inside this interval: the model ends there',
      { time: hi }
    );
  }
  const L = orbitalL(o, end.a);
  return {
    time,
    a: end.a,
    spin: end.spin,
    n: end.n,
    sign,
    orbitalAngularMomentum: L,
    totalAngularMomentum: L + o.I * end.spin,
    energy: (-o.G * o.M * o.m) / (2 * end.a) + 0.5 * o.I * end.spin * end.spin,
  };
}

/** The time (s, signed) for the orbit to go from a0 to `target`, from the closed form. */
export function timeToReach(p) {
  const o = orbitOf(p);
  const target = positive(p.target, 'target');
  const sign = Math.sign(o.spin - o.n0);
  if (sign === 0) {
    throw new TidesError(
      'corotation',
      'the spin equals the orbital rate: nothing evolves',
      {
        time: 0,
      }
    );
  }
  return (target ** 6.5 - o.a0 ** 6.5) / (6.5 * sign * o.C);
}

/**
 * The time for the constant tidal torque to remove the satellite's spin:
 * t = I omega / N, N = (3/2) (k2/Q) G m_p^2 R^5 / a^6, I = alpha m_s R^2.
 *
 * @param {{perturberMass:number, satelliteMass:number, satelliteRadius:number, semiMajorAxis:number, k2:number, Q:number, spin:number, alpha?:number}} p
 * @returns {{time:number, years:number, torque:number}}
 */
export function lockingTime(p) {
  params(p);
  const mp = positive(p.perturberMass, 'perturberMass');
  const ms = positive(p.satelliteMass, 'satelliteMass');
  const R = positive(p.satelliteRadius, 'satelliteRadius');
  const a = positive(p.semiMajorAxis, 'semiMajorAxis');
  const spin = positive(p.spin, 'spin');
  if (a <= R)
    throw new TidesError(
      'orbit-inside-body',
      'the orbit is inside the satellite'
    );
  const k2OverQ = dissipation(p);
  const I = alphaOf(p) * ms * R * R;
  const torque = (1.5 * k2OverQ * G_SI * mp * mp * R ** 5) / a ** 6;
  const time = (I * spin) / torque;
  return { time, years: time / SECONDS_PER_YEAR, torque };
}
