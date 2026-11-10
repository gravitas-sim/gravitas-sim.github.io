// =============================================================================
// The two-step energy ledger and the reference Euler schemes
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I1 (the approved follow-up to Prompt
// 270). How wrong a fixed-step scheme is, read from the one quantity the exact
// motion keeps: the total energy. The ledger runs a scheme at a step h and at
// h / 2 over the same span and reports the relative energy error at the end
// and at its largest, the ratio of the two runs and the order that ratio
// implies. It refuses the three numbers that look like a result and are not:
// an order read at the rounding floor, an order for an orbit the scheme has
// unbound, and the end-of-run error of a scheme whose error oscillates (that
// number is the phase the run happened to stop at).
//
// State and forces are the 3-D kernel's (js/lab3d/kernel.js), so the units are
// its units: G = 1 unless a state says otherwise. Two schemes are added here
// as labelled references and belong to no engine table: the explicit Euler
// step (first order, not symplectic: the orbit spirals outward) and the
// symplectic Euler step (first order, the error bounded).
//
// Pure: values in, values out; + - * / and Math.sqrt in the steps, Math.log2
// only in the order. No uncertainty is reported: these are properties of a
// deterministic run. Imported by no shipped module (never precached).
// =============================================================================
import {
  makeState,
  accelerations,
  energy,
  leapfrog,
  rk4,
} from '../../lab3d/kernel.js';

const { Math, Number, Float64Array } = globalThis;

/** Below this relative energy error the finer run is rounding, and no ratio is read. */
export const FLOOR = 1e-13;
/** Fewer steps than this is not a run. */
export const MIN_STEPS = 8;

/** One explicit (forward) Euler step: x += h v, v += h a(x), both from the old state. */
export function explicitEuler(s, h, a = new Float64Array(3 * s.n)) {
  accelerations(s, s.x, a);
  const { x, v } = s;
  for (let k = 0; k < x.length; k++) x[k] += h * v[k];
  for (let k = 0; k < v.length; k++) v[k] += h * a[k];
  s.t += h;
}

/** One symplectic (semi-implicit) Euler step: v += h a(x), then x += h v with the new v. */
export function symplecticEuler(s, h, a = new Float64Array(3 * s.n)) {
  accelerations(s, s.x, a);
  const { x, v } = s;
  for (let k = 0; k < v.length; k++) v[k] += h * a[k];
  for (let k = 0; k < x.length; k++) x[k] += h * v[k];
  s.t += h;
}

export const LEDGER_SCHEMES = Object.freeze({
  'explicit-euler': explicitEuler,
  'symplectic-euler': symplecticEuler,
  'velocity-verlet': leapfrog,
  rk4,
});

/**
 * Two bodies on a relative orbit of semi-major axis a and eccentricity e,
 * started at periapsis in the barycentric frame, in the kernel's body form.
 * With the defaults G (m0 + m1) = 1 and a = 1, so the period is 2 pi.
 */
export function keplerPair({ e = 0, a = 1, m0 = 0.75, m1 = 0.25, G = 1 } = {}) {
  if (!(e >= 0 && e < 1) || !(a > 0) || !(m0 > 0) || !(m1 >= 0))
    throw new RangeError('need 0 <= e < 1, a > 0, m0 > 0 and m1 >= 0');
  const M = m0 + m1;
  const r = a * (1 - e);
  const v = Math.sqrt((G * M * (1 + e)) / r);
  return [
    { m: m0, x: [(-m1 / M) * r, 0, 0], v: [0, (-m1 / M) * v, 0] },
    { m: m1, x: [(m0 / M) * r, 0, 0], v: [0, (m0 / M) * v, 0] },
  ];
}

/** The same two bodies released at rest a distance `separation` apart. */
export function pairAtRest({ separation = 1, m0 = 0.75, m1 = 0.25 } = {}) {
  const M = m0 + m1;
  return [
    { m: m0, x: [(-m1 / M) * separation, 0, 0], v: [0, 0, 0] },
    { m: m1, x: [(m0 / M) * separation, 0, 0], v: [0, 0, 0] },
  ];
}

/** The distance between bodies 0 and 1 of a state. */
export function separation(s) {
  const dx = s.x[3] - s.x[0];
  const dy = s.x[4] - s.x[1];
  const dz = s.x[5] - s.x[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function checked(scheme, h, span) {
  const step = LEDGER_SCHEMES[scheme];
  if (!step) throw new RangeError(`no scheme '${scheme}'`);
  if (!(Number.isFinite(h) && h > 0))
    throw new RangeError('the step must be a positive number');
  if (!(Number.isFinite(span) && span > 0))
    throw new RangeError('the span must be a positive number');
  return step;
}

/**
 * One run of a scheme at a fixed step: the relative energy error
 * (E_k - E_0) / |E_0| at the last step (`end`) and at its largest (`maxAbs`).
 * @param {Array<{m: number, x: number[], v: number[]}>} bodies - Two or more
 * @param {string} scheme - A key of LEDGER_SCHEMES
 * @param {{h: number, span: number, G?: number}} opts
 * @returns {object} `{refused}` or the run
 */
export function ledger(bodies, scheme, { h, span, G = 1 } = {}) {
  const step = checked(scheme, h, span);
  const steps = Math.round(span / h);
  if (steps < MIN_STEPS) return { refused: 'too-few-steps', scheme, h, steps };
  const s = makeState(bodies, { G });
  const E0 = energy(s);
  const scale = Math.abs(E0);
  const start = separation(s);
  let end = 0;
  let maxAbs = 0;
  let taken = 0;
  for (let k = 1; k <= steps; k++) {
    step(s, h);
    taken = k;
    const E = energy(s);
    if (!Number.isFinite(E))
      return { refused: 'non-finite', scheme, h, steps, at: k };
    end = (E - E0) / scale;
    if (Math.abs(end) > maxAbs) maxAbs = Math.abs(end);
    if (E0 < 0 && E >= 0)
      return { refused: 'unbound', scheme, h, steps, at: k, end, maxAbs };
  }
  return {
    scheme,
    h,
    steps: taken,
    end,
    maxAbs,
    separation: { start, end: separation(s) },
  };
}

/**
 * The same span at h and at h / 2: the ratios of the two runs' errors and the
 * orders they imply. `kind` says whether the error accumulates ('secular') or
 * oscillates; for an oscillating error the end-of-run order is withheld.
 * @returns {object} `{refused, coarse, fine}` or `{coarse, fine, kind,
 *   ratioEnd, ratioMax, orderEnd, orderMax, reason}`
 */
export function twoStep(bodies, scheme, { h, span, G = 1 } = {}) {
  const coarse = ledger(bodies, scheme, { h, span, G });
  if (coarse.refused === 'too-few-steps')
    return { refused: 'too-few-steps', coarse };
  const fine = ledger(bodies, scheme, { h: h / 2, span, G });
  for (const reason of ['non-finite', 'unbound'])
    if (coarse.refused === reason || fine.refused === reason)
      return { refused: reason, coarse, fine };
  if (fine.maxAbs < FLOOR) return { refused: 'rounding-floor', coarse, fine };
  const secular =
    Math.abs(coarse.end) >= 0.5 * coarse.maxAbs &&
    Math.abs(fine.end) >= 0.5 * fine.maxAbs;
  const ratioEnd = fine.end === 0 ? null : coarse.end / fine.end;
  const ratioMax = coarse.maxAbs / fine.maxAbs;
  return {
    coarse,
    fine,
    kind: secular ? 'secular' : 'oscillating',
    ratioEnd,
    ratioMax,
    orderEnd:
      secular && ratioEnd !== null ? Math.log2(Math.abs(ratioEnd)) : null,
    orderMax: Math.log2(ratioMax),
    reason: secular ? '' : 'end-phase',
  };
}
