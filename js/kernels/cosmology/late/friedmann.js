// =============================================================================
// The late-time FLRW kernel: matter, radiation, curvature and constant-w dark energy
// -----------------------------------------------------------------------------
// Prompt 255 (COSMOLOGY_II.md). An extension of js/kernels/cosmology/flrw.js, which it neither edits nor
// replaces: that file keeps its flat and open Lambda-CDM with radiation neglected (every cosmology lesson
// golden reads it); this one adds radiation, w, closed universes, the deceleration parameter and the
// transition, a stated domain with refusals, and the integrator's error estimate beside every integral.
// Pure and Worker-safe: no DOM, no clock; imports are the existing constants, the quadrature and the
// root finder. Nothing shipped imports it (D-R10-255-01).
//
//   E(z)^2 = Om x^3 + Or x^4 + Ok x^2 + Ode x^(3 (1 + w)),   x = 1 + z,   Ok = 1 - Om - Or - Ode
//   D_C = (c/H0) Int_0^z dz'/E,   D_M = D_C | (c/H0) sinh(s D_C H0/c)/s | (c/H0) sin(s D_C H0/c)/s,  s = sqrt|Ok|
//   D_L = (1 + z) D_M,  D_A = D_M/(1 + z),  mu = 5 log10(D_L/10 pc)
//   lookback = (1/H0) Int_0^z dz'/((1 + z') E),   age = (1/H0) Int_0^1 a da / sqrt(F(a)),  F = a^4 E^2
//   q(z) = [Om x^3 + 2 Or x^4 + (1 + 3 w) Ode x^(3 (1 + w))] / (2 E^2)
//
// Units: distances in Mpc, times in Gyr, H0 in km/s/Mpc, densities as fractions of the critical density.
// No sound horizon, no acoustic scale, no fitting formula for either (Prompts 257 and 258 own those).
// =============================================================================

import { adaptive } from '../../../numeric/quadrature.js';
import { brent } from '../../../numeric/roots.js';
import { C_KMS, GYR_PER_INV_H0 } from '../flrw.js';

const { Math, Number } = globalThis;
const EPS = Number.EPSILON;

/** The validated domain (COSMOLOGY_II.md section 2); outside it the kernel refuses. */
export const DOMAIN = Object.freeze({
  H0: [0, 1000],
  Om: [0, 10],
  Or: [0, 1],
  Ode: [0, 10],
  w: [-3, 0],
  z: [0, 1e4],
});

/** Refusal codes, in the order a set that breaks several rules is judged. */
export const REFUSAL_CODES = Object.freeze([
  'not-finite',
  'bad-H0',
  'negative-density',
  'density-out-of-domain',
  'w-out-of-domain',
  'bounce',
  'z-out-of-domain',
  'beyond-antipode',
  'age-unbounded',
  'not-converged',
  'bad-argument',
]);

/** Thrown for a parameter set or a redshift outside the validated domain; `code` is one of REFUSAL_CODES. */
export class FriedmannDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FriedmannDomainError';
    this.code = code;
  }
}

const refuse = (code, message) => {
  throw new FriedmannDomainError(code, message);
};

const A_MIN = 1e-10; // the age integral starts here, its leading small-a term added analytically
const PANEL = 1; // integration panels at most this wide in ln(1 + z) or ln a
const REL_TOL = 1e-12; // the adaptive rule's relative tolerance per panel
const SCAN_POINTS = 20000;
const SCAN_FROM = 1e-8;

/** Integral of f over [lo, hi] in panels at most PANEL wide, each adaptive; error estimate carried. */
function integrate(f, lo, hi) {
  const n = Math.max(1, Math.ceil((hi - lo) / PANEL));
  let value = 0;
  let error = 0;
  for (let k = 0; k < n; k++) {
    const a = lo + ((hi - lo) * k) / n;
    const b = lo + ((hi - lo) * (k + 1)) / n;
    const r = adaptive(f, a, b, {
      absTol: 0,
      relTol: REL_TOL,
      maxDepth: 20,
    });
    if (!r.converged || !Number.isFinite(r.value))
      refuse(
        'not-converged',
        'the quadrature did not converge for this parameter set (an integrand that is not finite or not smooth enough)'
      );
    value += r.value;
    error += r.error;
  }
  return { value, error: error + 8 * EPS * Math.abs(value) };
}

/** Validate a parameter set and return the normalized one; throws FriedmannDomainError. */
export function checkParameters(params) {
  if (params === null || typeof params !== 'object')
    refuse(
      'bad-argument',
      'the parameters must be an object {H0, Om, Or, Ode, w}'
    );
  const { H0, Om } = params;
  if (typeof H0 !== 'number' || typeof Om !== 'number')
    refuse('bad-argument', 'H0 and Om are required numbers');
  const Or = params.Or === undefined ? 0 : params.Or;
  const w = params.w === undefined ? -1 : params.w;
  const flat = params.Ode === undefined;
  const Ode = flat ? 1 - Om - Or : params.Ode;
  for (const [name, v] of [
    ['H0', H0],
    ['Om', Om],
    ['Or', Or],
    ['Ode', Ode],
    ['w', w],
  ])
    if (typeof v !== 'number' || !Number.isFinite(v))
      refuse(
        'not-finite',
        `${name} must be a finite number, but it is ${String(v)}: the Friedmann equation is not defined for it`
      );
  if (!(H0 > DOMAIN.H0[0] && H0 <= DOMAIN.H0[1]))
    refuse(
      'bad-H0',
      `H0 must be greater than 0 and at most ${DOMAIN.H0[1]} km/s/Mpc`
    );
  for (const [name, v] of [
    ['Om', Om],
    ['Or', Or],
    ['Ode', Ode],
  ])
    if (v < 0)
      refuse(
        'negative-density',
        `${name} is negative (${v}): a negative energy density is outside the validated domain` +
          (flat && name === 'Ode' ? ' (the flat closure 1 - Om - Or)' : '')
      );
  for (const [name, v] of [
    ['Om', Om],
    ['Or', Or],
    ['Ode', Ode],
  ])
    if (v > DOMAIN[name][1])
      refuse(
        'density-out-of-domain',
        `${name} = ${v} is above the validated bound ${DOMAIN[name][1]}`
      );
  if (!(w >= DOMAIN.w[0] && w <= DOMAIN.w[1]))
    refuse(
      'w-out-of-domain',
      `w = ${w} is outside the validated range [${DOMAIN.w[0]}, ${DOMAIN.w[1]}]`
    );
  const Ok = 1 - Om - Or - Ode;
  const pe = 1 - 3 * w;
  // The bounce scan: r(a) = F / (Or + Om a + |Ok| a^2 + Ode a^pe) at or below zero anywhere on [1e-8, 1].
  const ratio = a => {
    const t = Ode * Math.pow(a, pe);
    return (
      (Or + Om * a + Ok * a * a + t) / (Or + Om * a + Math.abs(Ok) * a * a + t)
    );
  };
  const l0 = Math.log(SCAN_FROM);
  let best = Infinity;
  let bestI = 0;
  for (let i = 0; i <= SCAN_POINTS; i++) {
    const r = ratio(Math.exp((l0 * (SCAN_POINTS - i)) / SCAN_POINTS));
    if (r < best) {
      best = r;
      bestI = i;
    }
  }
  if (best > 0) {
    // refine the minimum between its neighbours by golden section in ln a
    let lo = l0 * ((SCAN_POINTS - Math.max(bestI - 1, 0)) / SCAN_POINTS);
    let hi =
      l0 * ((SCAN_POINTS - Math.min(bestI + 1, SCAN_POINTS)) / SCAN_POINTS);
    if (lo > hi) [lo, hi] = [hi, lo];
    const g = (Math.sqrt(5) - 1) / 2;
    let c = hi - g * (hi - lo);
    let d = lo + g * (hi - lo);
    for (let i = 0; i < 80; i++) {
      if (ratio(Math.exp(c)) < ratio(Math.exp(d))) hi = d;
      else lo = c;
      c = hi - g * (hi - lo);
      d = lo + g * (hi - lo);
    }
    best = Math.min(best, ratio(Math.exp(0.5 * (lo + hi))));
  }
  if (!(best > 0))
    refuse(
      'bounce',
      `the set has a bounce or no big bang: the scale-free ratio F(a)/(Or + Om a + |Ok| a^2 + Ode a^${pe}) reaches ${best.toExponential(2)} at or below zero for some a in [1e-8, 1], so E(z)^2 is not positive for every z >= 0`
    );
  return { H0, Om, Or, Ode, w, Ok, flat };
}

const checkZ = z => {
  if (typeof z !== 'number' || !Number.isFinite(z))
    refuse('z-out-of-domain', 'the redshift must be a finite number');
  if (z < DOMAIN.z[0] || z > DOMAIN.z[1])
    refuse(
      'z-out-of-domain',
      `z = ${z} is outside the validated range [${DOMAIN.z[0]}, ${DOMAIN.z[1]}]`
    );
};

/**
 * A late-time cosmology. Every distance is in Mpc, every time in Gyr.
 * @param {{H0: number, Om: number, Or?: number, Ode?: number, w?: number}} params - Ode omitted means flat
 * @throws {FriedmannDomainError} for a set outside the validated domain, with a code and a reason
 */
export function createFriedmann(params) {
  const p = checkParameters(params);
  const { H0, Om, Or, Ode, w, Ok } = p;
  const dh = C_KMS / H0;
  const pw = 3 * (1 + w);
  const pe = 1 - 3 * w;
  const flat = Math.abs(Ok) < 1e-12;
  const E2 = x => {
    const x2 = x * x;
    return Om * x2 * x + Or * x2 * x2 + Ok * x2 + Ode * Math.pow(x, pw);
  };
  const F = a => Or + Om * a + Ok * a * a + Ode * Math.pow(a, pe);
  const E = z => Math.sqrt(E2(1 + z));

  // ln(1 + z) integrals
  const chi = z =>
    integrate(u => Math.exp(u) / Math.sqrt(E2(Math.exp(u))), 0, Math.log1p(z));
  const look = z =>
    integrate(u => 1 / Math.sqrt(E2(Math.exp(u))), 0, Math.log1p(z));

  // the leading small-a term of F: smallest exponent with a positive coefficient
  const lead = [
    [0, Or],
    [1, Om],
    [2, Ok],
    [pe, Ode],
  ]
    .filter(([, c]) => c > 0)
    .sort((a, b) => a[0] - b[0])[0];
  const ageUnbounded = !lead || lead[0] >= 4;
  const ageUpTo = aUp => {
    if (ageUnbounded)
      refuse(
        'age-unbounded',
        'the age integral diverges: no matter, radiation or curvature term leads at small a (a pure cosmological constant, de Sitter, has no beginning)'
      );
    const r = integrate(
      v => {
        const a = Math.exp(v);
        return (a * a) / Math.sqrt(F(a));
      },
      Math.log(A_MIN),
      Math.log(aUp)
    );
    const [pl, cl] = lead;
    const tail = Math.pow(A_MIN, 2 - pl / 2) / (Math.sqrt(cl) * (2 - pl / 2));
    return { value: r.value + tail, error: r.error + 8 * EPS * tail };
  };

  // D_M over dh and its derivative with respect to chi = D_C / dh; refuses past the antipode
  const geometry = x => {
    if (flat) return { m: x, d: 1 };
    const s = Math.sqrt(Math.abs(Ok));
    if (Ok > 0) return { m: Math.sinh(s * x) / s, d: Math.cosh(s * x) };
    if (s * x >= Math.PI)
      refuse(
        'beyond-antipode',
        `the light has crossed half of the closed space (sqrt|Ok| D_C H0/c = ${Math.round(s * x * 1e4) / 1e4} >= pi): D_M would be zero or negative`
      );
    return { m: Math.sin(s * x) / s, d: Math.cos(s * x) };
  };

  const quantity = (name, z = 0) => {
    checkZ(z);
    const g = GYR_PER_INV_H0 / H0;
    if (name === 'comoving') {
      if (z === 0) return { value: 0, error: 0 };
      const r = chi(z);
      return { value: dh * r.value, error: dh * r.error };
    }
    if (name === 'lookback') {
      if (z === 0) return { value: 0, error: 0 };
      const r = look(z);
      return { value: g * r.value, error: g * r.error };
    }
    if (name === 'ageAt' || name === 'age') {
      const r = ageUpTo(name === 'age' ? 1 : 1 / (1 + z));
      return { value: g * r.value, error: g * r.error };
    }
    if (
      name === 'transverse' ||
      name === 'luminosity' ||
      name === 'angularDiameter' ||
      name === 'modulus'
    ) {
      if (name === 'modulus' && z === 0)
        refuse(
          'z-out-of-domain',
          'the distance modulus is undefined at z = 0 (D_L = 0)'
        );
      const c = z === 0 ? { value: 0, error: 0 } : chi(z);
      const geo = geometry(c.value);
      const dm = dh * geo.m;
      const edm = dh * Math.abs(geo.d) * c.error;
      if (name === 'transverse') return { value: dm, error: edm };
      if (name === 'luminosity')
        return { value: (1 + z) * dm, error: (1 + z) * edm };
      if (name === 'angularDiameter')
        return { value: dm / (1 + z), error: edm / (1 + z) };
      return {
        value: 5 * Math.log10((1 + z) * dm) + 25,
        error: (5 / Math.LN10) * (edm / dm),
      };
    }
    return refuse('bad-argument', `unknown quantity '${name}'`);
  };

  const q = z => {
    checkZ(z);
    const x = 1 + z;
    const x2 = x * x;
    return (
      (Om * x2 * x + 2 * Or * x2 * x2 + (1 + 3 * w) * Ode * Math.pow(x, pw)) /
      (2 * E2(x))
    );
  };

  /** The transition redshift (q = 0), or null with the reason. */
  const transitionRedshift = () => {
    const g = x =>
      Om * Math.pow(x, -3 * w) + 2 * Or * Math.pow(x, pe) + (1 + 3 * w) * Ode;
    if (g(1) >= 0) return { z: null, reason: 'decelerating-today' };
    if (!(Om > 0 || Or > 0)) return { z: null, reason: 'always-accelerating' };
    let hi = 2;
    while (g(hi) < 0) {
      hi *= 2;
      if (hi > 1e15) return { z: null, reason: 'always-accelerating' };
    }
    const r = brent(g, 1, hi, { xTol: 1e-15, maxIter: 200 });
    return { z: r.x - 1, reason: null };
  };

  const fractions = z => {
    checkZ(z);
    const x = 1 + z;
    const x2 = x * x;
    const e2 = E2(x);
    return {
      matter: (Om * x2 * x) / e2,
      radiation: (Or * x2 * x2) / e2,
      curvature: (Ok * x2) / e2,
      darkEnergy: (Ode * Math.pow(x, pw)) / e2,
    };
  };

  const value = (name, z) => quantity(name, z).value;
  return {
    H0,
    Om,
    Or,
    Ode,
    w,
    /** 1 - Om - Or - Ode, as computed. */
    Ok,
    geometry: flat ? 'flat' : Ok > 0 ? 'open' : 'closed',
    /** H(z)/H0. */
    E: z => (checkZ(z), E(z)),
    hubbleParameter: z => (checkZ(z), H0 * E(z)),
    /** {value, error} for 'comoving', 'transverse', 'luminosity', 'angularDiameter', 'modulus', 'lookback', 'ageAt', 'age'. */
    quantity,
    comovingDistance: z => value('comoving', z),
    transverseComovingDistance: z => value('transverse', z),
    luminosityDistance: z => value('luminosity', z),
    angularDiameterDistance: z => value('angularDiameter', z),
    distanceModulus: z => value('modulus', z),
    lookbackTime: z => value('lookback', z),
    /** Gyr since the big bang at redshift z. */
    ageAtRedshift: z => value('ageAt', z),
    /** Gyr since the big bang to today; refused 'age-unbounded' for de Sitter. */
    age: () => value('age', 0),
    decelerationParameter: q,
    transitionRedshift,
    densityFractions: fractions,
    /** A table of the expansion history at the given redshifts: E, H, q, fractions, lookback time, age at z. */
    history(zs) {
      return zs.map(z => ({
        z,
        a: 1 / (1 + z),
        E: E(z),
        H: H0 * E(z),
        q: q(z),
        fractions: fractions(z),
        lookback: value('lookback', z),
        age: ageUnbounded ? null : value('ageAt', z),
      }));
    },
  };
}
