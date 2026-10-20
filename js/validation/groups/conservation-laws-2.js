// Energy and angular momentum, on a configuration where they are meaningful.
//
// Deliberately separated from the three-body run above. A chaotic system with
// close encounters conserves momentum exactly but not energy: a first-order
// integrator cannot resolve a near-miss, and reporting the resulting error as
// an energy-conservation failure would be blaming the scheme for the
// scenario. The claim Gravitas actually makes - and the one its lessons rest
// on - is that a *resolved* orbit conserves energy without secular drift.

import { makeStar, angularMomentum, totalEnergy } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const G = 1;
  const dt = 0.1;
  const M = 1000;
  const mp = 8; // massive enough that the primary moves measurably
  const a = 180;
  const e = 0.3;

  /**
   * Run an eccentric two-body orbit and report the worst energy and angular
   * momentum excursion seen.
   * @param {number} orbits - How many orbits to integrate
   * @returns {{energy: number, angular: number}} Worst relative errors
   */
  const runFor = orbits => {
    lab.reset();
    const rApo = a * (1 + e);
    const vApo = Math.sqrt(((G * (M + mp)) / a) * ((1 - e) / (1 + e)));
    const primary = makeStar(
      physics,
      { x: (-rApo * mp) / (M + mp), y: 0 },
      { x: 0, y: (-vApo * mp) / (M + mp) },
      M
    );
    const secondary = makeStar(
      physics,
      { x: (rApo * M) / (M + mp), y: 0 },
      { x: 0, y: (vApo * M) / (M + mp) },
      mp
    );
    physics.stars.push(primary, secondary);
    lab.commit();

    const pair = [primary, secondary];
    const total = M + mp;
    const com = () => ({
      x: (primary.pos.x * M + secondary.pos.x * mp) / total,
      y: (primary.pos.y * M + secondary.pos.y * mp) / total,
    });
    const E0b = totalEnergy(pair, G);
    const L0b = angularMomentum(pair, com());
    let worstE = 0;
    let worstL = 0;
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / (G * total));
    // The energy error oscillates once per orbit, and there are ~4800 steps
    // in an orbit at this timestep, so measuring every fifth step still
    // catches the periapsis peak with a thousand samples to spare. Measuring
    // every step doubles the runtime of the whole suite and changes no digit.
    const stride = 5;
    lab.step(dt, Math.round((orbits * period) / dt), i => {
      if (i % stride) return;
      worstE = Math.max(
        worstE,
        Math.abs(totalEnergy(pair, G) - E0b) / Math.abs(E0b)
      );
      worstL = Math.max(
        worstL,
        Math.abs(angularMomentum(pair, com()) - L0b) / Math.abs(L0b)
      );
    });
    return { energy: worstE, angular: worstL };
  };

  const short = runFor(6);
  const long = runFor(60);

  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'Total energy error over 60 orbits',
    measured: long.energy,
    expected: 0,
    unit: 'relative',
    tolerance: 5e-3,
    toleranceKind: 'absolute',
    why: "An e = 0.3 two-body orbit at dt = 0.1, which is the application's own timestep. The bound is set by the scheme: symplectic Euler's energy error oscillates with amplitude of order dt/P per unit binding energy, and at periapsis on this orbit that is a few parts in a thousand. 5e-3 is that amplitude, not a number chosen to fit.",
  });

  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'Energy error does not grow with run length (6 vs 60 orbits)',
    measured: long.energy / short.energy,
    expected: 1,
    unit: 'ratio of worst errors',
    tolerance: 0.05,
    why: 'The single most important check in this file. A symplectic integrator has a *bounded* energy error: ten times the run length must give the same worst error, not ten times as much. This is the check that failed before the integrator was fixed - the old sequential update lost energy secularly, about 1% of binding energy per orbit, so this ratio came out near 10 and binaries spiralled together on their own. A 5% tolerance distinguishes "bounded" from any accumulation worth the name.',
  });

  add({
    group: 'Conservation laws',
    kind: 'integration',
    name: 'Angular momentum is conserved to machine precision',
    measured: long.angular,
    expected: 0,
    unit: 'relative',
    tolerance: 1e-11,
    toleranceKind: 'absolute',
    why: 'Not an approximation, and worth spelling out because it is easy to assume otherwise. Symplectic Euler kicks with a(x) and then drifts with the new velocity, so over one step the total angular momentum changes by dt * sum_i m_i x_i cross a_i. Pair that sum up and each pair contributes (x_i - x_j) cross F_ij, which vanishes because gravity acts along the line joining the bodies. So the scheme conserves total angular momentum exactly, not to first order, and the measured 9e-14 is floating-point round-off over 60 orbits. This holds only because the accelerations are computed before anything moves: the previous sequential update did not have this property.',
  });
}
