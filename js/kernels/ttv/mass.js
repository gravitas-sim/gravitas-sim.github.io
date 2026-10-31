// =============================================================================
// A mass from a TTV amplitude, under an assumption that is stated (Prompt 226 Part B, TTV_MASS_GATE.md)
// -----------------------------------------------------------------------------
// The gate's verdict is B: a mass from an amplitude ships ONLY for a pair assumed circular
// (the free-eccentricity combination Z = 0), labeled as that assumption, with the measurement
// and the first-order relation's accuracy in its edges. The degeneracy interval for a declared
// bound on Z is NOT a bound the kernel hands out (its edges were 4.19 times apart against 4);
// what the kernel does offer is the forward statement: how far the same masses' amplitude moves
// for a given |Z| (`amplitudeSpread`), which is how the degeneracy is taught.
//
// For j:(j-1) outside the resonance width, from js/kernels/ttv/superperiod.js:
//   the outer planet's mass from the INNER planet's amplitude, mu2 = V pi j^(2/3) (j-1)^(1/3) |Delta| / (P1 |f|)
//   the inner planet's mass from the OUTER planet's amplitude, mu1 = V' pi j |Delta| / (P2 |g|)
// the amplitudes V being those of the fitted sinusoid at the super-period, in days.
//
// Pure: no DOM, no clock.
// =============================================================================

import { fgCoefficients, relationDomain } from './superperiod.js';

const { Math } = globalThis;

/** The first-order relation's committed accuracy against the engine (Part A, leg A4). */
export const FORMULA_TOLERANCE = Object.freeze({ inner: 0.15, outer: 0.25 });
/** The label every mass carries. */
export const ASSUMPTION = 'circular';

/**
 * @param {{amplitude: number, sigmaAmplitude: number, P1: number, P2: number,
 *   j?: number, who: 'outer'|'inner'}} o - `who` names the planet whose MASS is wanted: 'outer' from the
 *   inner planet's amplitude, 'inner' from the outer planet's; periods are the mean periods, days
 * @returns {{status: 'ok'|'refused', reason?: string, assumption?: 'circular', who?: string,
 *   ratio?: {central: number, lo: number, hi: number}, tolerance?: number}} mu = m / M*
 */
export function massFromAmplitude(o) {
  const dom = relationDomain({
    P1: o.P1,
    P2: o.P2,
    mu1: 1e-5,
    mu2: 1e-5,
    j: o.j,
  });
  if (!dom.ok) return { status: 'refused', reason: dom.reason };
  if (
    !(o.amplitude > 0) ||
    !(o.sigmaAmplitude >= 0) ||
    !Number.isFinite(o.sigmaAmplitude)
  )
    return { status: 'refused', reason: 'no-amplitude' };
  const j = dom.j;
  const D = Math.abs(dom.delta);
  const alpha = Math.pow(o.P1 / o.P2, 2 / 3);
  const { f, g } = fgCoefficients(j, alpha);
  const outer = o.who !== 'inner';
  const K = outer
    ? (Math.PI * Math.pow(j, 2 / 3) * Math.pow(j - 1, 1 / 3) * D) /
      (o.P1 * Math.abs(f))
    : (Math.PI * j * D) / (o.P2 * Math.abs(g));
  const s = outer ? FORMULA_TOLERANCE.inner : FORMULA_TOLERANCE.outer;
  const lo = (Math.max(0, o.amplitude - 2 * o.sigmaAmplitude) / (1 + s)) * K;
  const hi = ((o.amplitude + 2 * o.sigmaAmplitude) / (1 - s)) * K;
  return {
    status: 'ok',
    assumption: ASSUMPTION,
    who: outer ? 'outer' : 'inner',
    ratio: { central: o.amplitude * K, lo, hi },
    tolerance: s,
    j,
    delta: dom.delta,
  };
}

/**
 * How far one planet's TTV amplitude moves, for the SAME masses, when the pair's free
 * eccentricity combination has magnitude |Z| and any direction: the extremes over the direction,
 * as multiples of the circular amplitude. 1.5 |Z| / (|Delta| |f|) (or |g|) is the fraction.
 *
 * @param {{P1: number, P2: number, j?: number, Z: number, planet: 'inner'|'outer'}} o
 * @returns {{status: 'ok'|'refused', reason?: string, min?: number, max?: number, fraction?: number}}
 */
export function amplitudeSpread(o) {
  const dom = relationDomain({
    P1: o.P1,
    P2: o.P2,
    mu1: 1e-5,
    mu2: 1e-5,
    j: o.j,
  });
  if (!dom.ok) return { status: 'refused', reason: dom.reason };
  const { f, g } = fgCoefficients(dom.j, Math.pow(o.P1 / o.P2, 2 / 3));
  const c = o.planet === 'outer' ? Math.abs(g) : Math.abs(f);
  const fraction = (1.5 * Math.abs(o.Z)) / (Math.abs(dom.delta) * c);
  return {
    status: 'ok',
    min: Math.abs(1 - fraction),
    max: 1 + fraction,
    fraction,
  };
}
