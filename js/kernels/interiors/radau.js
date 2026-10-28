// Darwin-Radau oblateness (Prompt 203, INTERIORS_GATE.md): the flattening of a
// hydrostatic, rigidly rotating body from its rotation and its moment of
// inertia, to first order in the flattening. The neglected terms are of order
// the flattening itself; not a third-order theory.
import { refuse, isPos, isNum, isSigma } from './constants.js';

const { Math } = globalThis;
const MODEL = 'Darwin-Radau relation';
const ASSUMES = [
  'hydrostatic equilibrium, rigid rotation, one rotation axis',
  'first order in the flattening: the neglected terms are of order f itself',
  'q = omega^2 a^3 / (G M) with the equatorial radius a; f = (a - b) / a',
  'a monotonic density profile (Radau closure)',
];
/** Largest rotation parameter the gate tested (Jupiter's is 0.089). */
export const Q_MAX = 0.1;
/** The closure's stated model term, as a fraction of f (INTERIORS_GATE.md, O6). */
export const MODEL_TERM = 0.01;

/**
 * q = omega^2 a^3 / (G M). gm in km^3 s^-2, equatorialRadius in km, period in s
 * (the sidereal rotation period).
 */
export function rotationParameter({
  gm,
  equatorialRadius,
  period,
  sigma = {},
}) {
  if (![gm, equatorialRadius, period].every(isPos))
    return refuse(
      MODEL,
      'input',
      'gm, the equatorial radius and the period must be positive and finite'
    );
  if (!['gm', 'equatorialRadius', 'period'].every(k => isSigma(sigma[k])))
    return refuse(
      MODEL,
      'sigma',
      'an uncertainty must be a finite number of at least 0'
    );
  const omega = (2 * Math.PI) / period;
  const q = (omega * omega * equatorialRadius ** 3) / gm;
  const rel = Math.hypot(
    (sigma.gm ?? 0) / gm,
    (3 * (sigma.equatorialRadius ?? 0)) / equatorialRadius,
    (2 * (sigma.period ?? 0)) / period
  );
  return { model: MODEL, kind: 'rotation parameter', q, sigma: q * rel };
}

const checkQ = q =>
  !isPos(q)
    ? refuse(
        MODEL,
        'input',
        'the rotation parameter must be positive and finite'
      )
    : q > Q_MAX
      ? refuse(
          MODEL,
          'q-range',
          `q = ${q.toPrecision(3)} is above ${Q_MAX}, the largest value tested: a third-order theory is needed`
        )
      : null;
const checkFactor = c =>
  !isNum(c)
    ? refuse(MODEL, 'input', 'the moment-of-inertia factor must be finite')
    : c >= 0.4
      ? refuse(
          MODEL,
          'moment-range',
          'a factor of 0.4 or more is a homogeneous or inverted body: there is no centrally condensed structure to flatten'
        )
      : c <= 0
        ? refuse(
            MODEL,
            'moment-range',
            'the moment-of-inertia factor must be above 0'
          )
        : null;

/**
 * The flattening f = (5 q / 2) / (1 + (25/4) (1 - 3 C / 2)^2), C the factor
 * C / (M a^2). `sigma.total` adds the closure's model term in quadrature.
 */
export function darwinRadauFlattening({ q, momentFactor, sigma = {} }) {
  const bad = checkQ(q) ?? checkFactor(momentFactor);
  if (bad) return bad;
  if (!isSigma(sigma.q) || !isSigma(sigma.momentFactor))
    return refuse(
      MODEL,
      'sigma',
      'an uncertainty must be a finite number of at least 0'
    );
  const s = 1 - 1.5 * momentFactor;
  const D = 1 + 6.25 * s * s;
  const f = (2.5 * q) / D;
  const propagated = Math.hypot(
    (f / q) * (sigma.q ?? 0),
    ((46.875 * q * s) / (D * D)) * (sigma.momentFactor ?? 0)
  );
  return {
    model: MODEL,
    assumes: ASSUMES,
    kind: 'flattening',
    flattening: f,
    sigma: propagated,
    sigmaTotal: Math.hypot(propagated, MODEL_TERM * f),
    convention: 'q = omega^2 a^3 / (G M), equatorial radius; f = (a - b) / a',
  };
}

/** The inverse: C / (M a^2) = (2/3) [1 - (2/5) sqrt(5 q / (2 f) - 1)]. */
export function darwinRadauMomentFactor({ q, flattening }) {
  const bad = checkQ(q);
  if (bad) return bad;
  if (!isPos(flattening))
    return refuse(MODEL, 'input', 'the flattening must be positive and finite');
  const inner = (5 * q) / (2 * flattening) - 1;
  if (inner < 0)
    return refuse(
      MODEL,
      'closure',
      'f above 5 q / 2: no hydrostatic body flattens more than a point-mass core allows'
    );
  return {
    model: MODEL,
    assumes: ASSUMES,
    kind: 'moment factor',
    momentFactor: (2 / 3) * (1 - 0.4 * Math.sqrt(inner)),
  };
}
