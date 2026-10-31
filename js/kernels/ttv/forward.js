// =============================================================================
// The engine as the forward model (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// Two planets and a star integrated by the engine's own updatePhysics (js/physics.js)
// and read for the moments each planet crosses in front of the star, as an observer
// on +y of the orbital plane sees it. The engine is injected, never imported: this
// module stays pure, and a caller that has the engine (the validator, a Worker, the
// page) hands it in with a `lab` that clears and commits a world (the shape of
// js/validation/harness.js makeLab).
//
// Units: G = 1, the star 1000 mass units, and one time unit is called one day. By
// Newtonian scale invariance only the period ratio, the mass ratios mu = m / M* and the
// phases matter, so a system stated in days and in mu is the same system in any units.
//
// The planes are flat: the engine is two-dimensional, so a transit is the instant the
// planet's x equals the star's x with the planet at larger y, and the light curve's
// impact parameter is an input of the template and not a result of the orbit.
//
// Accuracy is the integrator's: second order for Velocity Verlet, so the phase error of
// a transit time grows with the number of orbits and shrinks as the square of the step.
// TTV.md gives the measured error against the independent oracle.
// =============================================================================

const { Math } = globalThis;

export const FORWARD = Object.freeze({
  G: 1,
  starMass: 1000,
  integrator: 'Velocity Verlet',
  stepsPerInnerPeriod: 2000,
});

/** The astrocentric circular start of both planets, in code units. */
export function initialState(
  system,
  { G = FORWARD.G, M = FORWARD.starMass } = {}
) {
  const lam1 = system.lambda1_rad ?? Math.PI / 2;
  const planets = [];
  for (const [period, mu, lam] of [
    [system.P1, system.mu1, lam1],
    [system.P2, system.mu2, lam1 + (system.lambda2_offset_rad ?? 0.7)],
  ]) {
    const m = mu * M;
    const a = Math.cbrt(G * (M + m) * (period / (2 * Math.PI)) ** 2);
    const v = (a * 2 * Math.PI) / period;
    planets.push({
      m,
      x: a * Math.cos(lam),
      y: a * Math.sin(lam),
      vx: -v * Math.sin(lam),
      vy: v * Math.cos(lam),
    });
  }
  return planets;
}

/**
 * The transit times of both planets over `baseline` days.
 *
 * @param {{physics: object, lab: {reset: Function, commit: Function},
 *   system: object, baseline: number, stepsPerInnerPeriod?: number,
 *   integrator?: string, shouldStop?: Function}} o
 * @returns {{times: number[][], dt: number, steps: number}} Times in days; the instant 0 is dropped
 */
export function engineTransitTimes(o) {
  const { physics: P, lab, system, baseline } = o;
  const steps = o.stepsPerInnerPeriod ?? FORWARD.stepsPerInnerPeriod;
  lab.reset({
    integrator: o.integrator ?? FORWARD.integrator,
    gravitational_constant: FORWARD.G,
  });
  const star = new P.StarObject(
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    FORWARD.starMass / 1000
  );
  star.mass = FORWARD.starMass;
  star.radius = 0.5;
  star.intact = true;
  star.persistent = true;
  P.stars.push(star);
  const bodies = initialState(system).map(d => {
    const p = new P.Planet({ x: d.x, y: d.y }, { x: d.vx, y: d.vy }, 1);
    p.mass = d.m;
    p.radius = 0.01;
    p.persistent = true;
    P.planets.push(p);
    return p;
  });
  lab.commit();
  const dt = system.P1 / steps;
  const n = Math.round(baseline / dt);
  const read = () =>
    bodies.map(b => ({
      dx: b.pos.x - star.pos.x,
      dy: b.pos.y - star.pos.y,
      vx: b.vel.x - star.vel.x,
    }));
  const times = [[], []];
  let before = read();
  for (let i = 0; i < n; i++) {
    if (o.shouldStop?.()) break;
    P.updatePhysics(dt);
    const after = read();
    for (let k = 0; k < 2; k++) {
      if (before[k].dx > 0 && after[k].dx <= 0 && after[k].dy > 0) {
        const f0 = before[k].dx;
        const f1 = after[k].dx;
        const d0 = before[k].vx;
        const d1 = after[k].vx;
        let lo = 0;
        let hi = 1;
        const hermite = u => {
          const u2 = u * u;
          const u3 = u2 * u;
          return (
            (2 * u3 - 3 * u2 + 1) * f0 +
            (u3 - 2 * u2 + u) * dt * d0 +
            (-2 * u3 + 3 * u2) * f1 +
            (u3 - u2) * dt * d1
          );
        };
        for (let it = 0; it < 60; it++) {
          const mid = (lo + hi) / 2;
          if (hermite(mid) > 0) lo = mid;
          else hi = mid;
        }
        times[k].push(i * dt + (dt * (lo + hi)) / 2);
      }
    }
    before = after;
  }
  return { times: times.map(a => a.filter(t => t > 1e-3)), dt, steps: n };
}
