// =============================================================================
// Independent checks: the mission solvers against the validated 3-D kernel
// -----------------------------------------------------------------------------
// Every closed form and every solver in this directory is checked by a
// calculation that shares none of its algebra: the spacecraft's initial state
// is handed to the 3-D kernel (js/lab3d/kernel.js, VALIDATED_3D_LAB_GATE.md),
// integrated by its adaptive Dormand-Prince method, and the kernel's answer
// is compared with what the solver said would happen. The kernel knows
// nothing of conics, Stumpff functions or Kepler's equation: it adds up
// forces.
//
// It runs in canonical units of the problem (./bodies.js canonical): G = 1,
// the central body of mass 1 at rest at the origin, the spacecraft a test
// particle of mass 0 that pulls on nothing, and one length of the problem as
// the unit. The kernel's tolerance is mixed absolute and relative, so
// numbers of order one are what it is accurate for.
// =============================================================================

import { dopri5, makeState } from '../lab3d/kernel.js';
import { toElements } from '../lab3d/elements.js';
import { canonical } from './bodies.js';
import { norm, scale } from './twobody.js';

/** The kernel's tolerance for these checks. */
export const KERNEL_TOL = 1e-13;

/**
 * Integrate test particles about a point mass mu for `span` seconds.
 * @param {number} mu - km^3/s^2
 * @param {Array<{r: number[], v: number[]}>} particles - km and km/s
 * @param {number} span - s
 * @param {number} [length] - The canonical length, km (default: the first
 *   particle's distance)
 * @returns {Array<{r: number[], v: number[]}>} Their states at the end, km and km/s
 */
export function integrate(mu, particles, span, length = norm(particles[0].r)) {
  const u = canonical(mu, length);
  const bodies = [
    { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
    ...particles.map(p => ({
      m: 0,
      x: scale(p.r, 1 / u.DU),
      v: scale(p.v, 1 / u.VU),
    })),
  ];
  const s = makeState(bodies, { G: 1 });
  dopri5(s, span / u.TU, { tol: KERNEL_TOL, h0: 1e-3 });
  return particles.map((_, i) => {
    const k = 3 * (i + 1);
    return {
      r: [s.x[k], s.x[k + 1], s.x[k + 2]].map(x => x * u.DU),
      v: [s.v[k], s.v[k + 1], s.v[k + 2]].map(x => x * u.VU),
    };
  });
}

/**
 * Where the kernel carries one spacecraft, sampled: the closest approach to
 * the centre and the state at the end, for a flyby.
 */
export function integrateTracked(mu, r, v, span, length = norm(r), steps = 1) {
  const u = canonical(mu, length);
  const s = makeState(
    [
      { m: 1, x: [0, 0, 0], v: [0, 0, 0] },
      { m: 0, x: scale(r, 1 / u.DU), v: scale(v, 1 / u.VU) },
    ],
    { G: 1 }
  );
  let closest = Infinity;
  const onStep = () => {
    const d = Math.hypot(s.x[3], s.x[4], s.x[5]);
    if (d < closest) closest = d;
  };
  for (let k = 0; k < steps; k++)
    dopri5(s, span / u.TU / steps, { tol: KERNEL_TOL, h0: 1e-3, onStep });
  const end = {
    r: [s.x[3], s.x[4], s.x[5]].map(x => x * u.DU),
    v: [s.v[3], s.v[4], s.v[5]].map(x => x * u.VU),
  };
  return {
    ...end,
    closest: closest * u.DU,
    elements: toElements(end.r, end.v, mu),
  };
}
