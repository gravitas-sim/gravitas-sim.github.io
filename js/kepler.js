// =============================================================================
// Kepler's equation: the one solver
// -----------------------------------------------------------------------------
// Nine modules each solved E - e sin E = M for themselves, with their own start,
// tolerance and cap. Outside the range their callers use, six of them could miss
// the root: the three that start at pi wander for M below zero at e = 0.8 and
// up, and the radial-velocity, resonance and sky solvers do not settle at
// e = 0.995. This is the one that was bracketed, and the others import it
// (Prompt 142).
//
// The contract, which tests/keplerSolver.test.js holds on a grid:
//   input    M any finite real, radians; e in [0, 1). A hyperbola is the 3-D
//            lab's own branch (js/lab3d/elements.js), and e = 1 has no a.
//   output   the E that is on the same turn as M: E - e sin E = M to rounding
//            (periapsis and apoapsis come back as 0 and pi to rounding).
//   stop     the Newton step is below 1e-16 of |E|, or the bracket has closed.
//            The bracket [M - e, M + e] always holds the root, and a step that
//            would leave it is a bisection, so 200 iterations is a ceiling
//            nothing reaches.
//   e = 0    returns M. e near 1 is limited by the equation, not the solver: the
//            root's slope is 1 - e, so an error of 1 ulp in M is 1/(1 - e) in E.
//
// Pure, no imports. Math is bound once because in Jest's vm context every free
// global read goes through the context, which made hot loops over this 8-25x
// slower than in Node (the radial-velocity fits call it per observation).
// =============================================================================

const { Math } = globalThis;

/**
 * Kepler's equation E - e sin E = M, for 0 <= e < 1. Newton's method from
 * Danby's starting value, kept inside the bracket [M - e, M + e] that always
 * holds the root, with a bisection whenever a step would leave it: started
 * at pi, plain Newton wanders at high eccentricity (e = 0.95, M = -1.74
 * never converged).
 * @param {number} M - Mean anomaly, radians, any turn
 * @param {number} e - Eccentricity, [0, 1)
 * @returns {number} The eccentric anomaly on M's own turn, radians
 */
export function solveKepler(M, e) {
  const wrapped = M - 2 * Math.PI * Math.round(M / (2 * Math.PI));
  let lo = wrapped - e;
  let hi = wrapped + e;
  let E = wrapped + 0.85 * e * Math.sign(Math.sin(wrapped) || 1);
  for (let k = 0; k < 200; k++) {
    const f = E - e * Math.sin(E) - wrapped;
    if (f > 0) hi = E;
    else lo = E;
    let next = E - f / (1 - e * Math.cos(E));
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - E) <= 1e-16 * (1 + Math.abs(E))) {
      E = next;
      break;
    }
    E = next;
  }
  return E + (M - wrapped);
}
