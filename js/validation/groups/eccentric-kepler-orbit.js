// ===========================================================================
// 3. Eccentric Kepler orbit
// ===========================================================================

import { makeTracer, makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, orbital, add, lab }) {
  const G = 1;
  const M = 1000;
  const a = 150;
  const e = 0.6;
  // Finer than the application's own 0.1, because periapsis is fast on an
  // eccentric orbit and a fixed step resolves the turn worst exactly there.
  const dt = 0.05;

  lab.reset({ min_interaction_distance: 1e-6 });
  const star = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
  // Start at apoapsis, where the motion is slowest and the initial condition
  // is least sensitive to the timestep.
  const rApo = a * (1 + e);
  const vApo = Math.sqrt(((G * M) / a) * ((1 - e) / (1 + e)));
  // A test particle: it must not move the star.
  const body = makeTracer(physics, { x: rApo, y: 0 }, { x: 0, y: vApo });
  physics.stars.push(star);
  physics.planets.push(body);
  lab.commit();

  const analyticPeriod = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
  const orbits = 8;
  const steps = Math.round((orbits * analyticPeriod) / dt);

  const timer = orbital.createPeriodTimer();
  let minR = Infinity;
  let maxR = -Infinity;
  let t = 0;
  // Kepler's second law: the rate at which the radius vector sweeps area is
  // the specific angular momentum over two, and it must not change.
  let minSweep = Infinity;
  let maxSweep = -Infinity;
  let prev = { x: body.pos.x, y: body.pos.y };

  lab.step(dt, steps, () => {
    t += dt;
    const rx = body.pos.x - star.pos.x;
    const ry = body.pos.y - star.pos.y;
    const sep = hypot(rx, ry);
    minR = Math.min(minR, sep);
    maxR = Math.max(maxR, sep);
    timer.sample(sep, t);
    // Triangle swept since the previous sample, per unit time.
    const sweep =
      Math.abs(prev.x * body.pos.y - prev.y * body.pos.x) / (2 * dt);
    minSweep = Math.min(minSweep, sweep);
    maxSweep = Math.max(maxSweep, sweep);
    prev = { x: body.pos.x, y: body.pos.y };
  });

  add({
    group: 'Eccentric Kepler orbit',
    kind: 'integration',
    name: 'Apoapsis distance a(1+e)',
    measured: maxR,
    expected: a * (1 + e),
    unit: 'units',
    tolerance: 2e-3,
    why: 'The run starts at apoapsis, so this is the turning point the integrator has to return to. Symplectic Euler at dt = 0.05 against a 365-unit period gives a radial error near 1e-4 at the turning point; 0.2% is a generous multiple of that and would still catch a wrong semi-major axis.',
  });

  add({
    group: 'Eccentric Kepler orbit',
    kind: 'integration',
    name: 'Periapsis distance a(1-e)',
    measured: minR,
    expected: a * (1 - e),
    unit: 'units',
    tolerance: 6e-3,
    why: 'Looser than apoapsis, and necessarily so: periapsis is where the body moves fastest and where a fixed timestep resolves the turn worst. The sampled minimum can also fall either side of the true one by up to half a step. 0.6% at e = 0.6 is the expected size of both effects together at dt = 0.05.',
  });

  add({
    group: 'Eccentric Kepler orbit',
    kind: 'integration',
    name: "Kepler's second law: areal sweep rate is constant",
    measured: (maxSweep - minSweep) / ((maxSweep + minSweep) / 2),
    expected: 0,
    unit: 'fractional range',
    tolerance: 2e-2,
    toleranceKind: 'absolute',
    why: 'Angular momentum is conserved exactly by the force law, but the areal rate is measured here from finite chords, and a chord under-measures the swept area by O((v dt / r)^2). At periapsis on an e = 0.6 orbit that geometric term is about 1%. The check is that the rate does not vary by more than the chord error, which is what distinguishes it from a real torque.',
  });

  add({
    group: 'Eccentric Kepler orbit',
    kind: 'integration',
    name: 'Measured period matches the analytic period',
    measured: timer.mean(),
    expected: analyticPeriod,
    unit: 'time units',
    tolerance: 3e-3,
    why: 'Periapsis timing resolution is dt/P = 1.4e-4 here; the rest is the first-order shift in mean motion at e = 0.6, which is larger than for a circle because the error accumulates unevenly around the orbit.',
  });

  // Kepler's third law, measured rather than assumed: run the same primary at
  // four different radii and fit the slope of log P against log a.
  const radii = [60, 100, 160, 260];
  const logA = [];
  const logP = [];
  for (const rr of radii) {
    lab.reset({ min_interaction_distance: 1e-6 });
    const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
    const p = makeTracer(
      physics,
      { x: rr, y: 0 },
      { x: 0, y: Math.sqrt((G * M) / rr) }
    );
    physics.stars.push(s);
    physics.planets.push(p);
    lab.commit();

    const per = 2 * Math.PI * Math.sqrt(rr ** 3 / (G * M));
    const tm = orbital.createPeriodTimer();
    let tt = 0;
    const fitDt = 0.1;
    const n = Math.round((6 * per) / fitDt);
    lab.step(fitDt, n, () => {
      tt += fitDt;
      tm.sample(hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y), tt);
    });
    logA.push(Math.log(rr));
    logP.push(Math.log(tm.mean()));
  }
  const meanA = logA.reduce((x, y) => x + y, 0) / logA.length;
  const meanP = logP.reduce((x, y) => x + y, 0) / logP.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < logA.length; i++) {
    num += (logA[i] - meanA) * (logP[i] - meanP);
    den += (logA[i] - meanA) ** 2;
  }
  add({
    group: 'Eccentric Kepler orbit',
    kind: 'integration',
    name: "Kepler's third law: slope of log P against log a",
    measured: num / den,
    expected: 1.5,
    unit: 'slope',
    tolerance: 2e-3,
    why: 'The number the Kepler investigation asks a student to recover. Measured from four integrated orbits by the same periapsis timer the investigation uses, not from the analytic formula. The residual is the timing resolution at each radius; 0.2% on the slope is well inside what a student could read off a plot and far outside anything a broken force law would produce.',
  });
}
