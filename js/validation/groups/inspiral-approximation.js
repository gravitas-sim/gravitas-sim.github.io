// ===========================================================================
// 15. The gravitational-wave inspiral approximation
// ---------------------------------------------------------------------------
// Explicitly not general relativity. Validated against the equation the model
// page says it uses, and then measured against the equation it does not, so
// the documented departure is a number rather than a disclaimer.
// ===========================================================================

import { hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, add, lab }) {
  const lambda = 0.01;
  const dt = 0.05;
  const steps = 2000;

  // One black hole, alone, so gravity contributes nothing and only the decay
  // term acts. v should follow v0 * (1 - lambda dt)^n exactly.
  lab.reset({ bh_behavior: 'Orbiting', orbit_decay_rate: lambda });
  const solo = new physics.BlackHole(
    { x: 0, y: 0 },
    1000,
    { x: 4, y: 0 },
    true
  );
  solo.isNewlyCreated = false;
  physics.bh_list.push(solo);
  lab.commit();
  lab.step(dt, steps);

  add({
    group: 'Inspiral (approximation)',
    kind: 'approximation',
    name: 'Velocity damping matches the stated constant fractional decay',
    measured: hypot(solo.vel.x, solo.vel.y),
    expected: 4 * (1 - lambda * dt) ** steps,
    unit: 'units per time',
    tolerance: 1e-12,
    why: 'The model page states the inspiral is "each black hole\'s velocity multiplied by a factor slightly less than one on every step". This is that claim, isolated from gravity and checked to machine precision. It validates what the code does, not what nature does.',
  });

  // Now the separation decay of an actual binary under the same term.
  //
  // Damping the speed at rate lambda removes orbital energy at
  // lambda * G M m / a, and with E = -G M m / (2a) that gives
  //
  //     adot = -2 lambda a
  //
  // so the separation decays exponentially with an e-folding time of
  // 1/(2 lambda). That derivation is only valid when the damping is slow
  // compared with the orbit - it assumes the orbit stays near-circular while
  // it shrinks - so lambda is chosen here to make lambda * P about 0.02.
  // The default orbit_decay_rate of 0.005 is *not* in that regime for a
  // typical scenario separation, which is a property of the model worth
  // knowing and is recorded in PHYSICS_VALIDATION.md rather than checked
  // here: this check is about whether the implemented term obeys the law it
  // is derived from, not about whether every scenario uses it adiabatically.
  const M = 1000;
  const sep0 = 300;
  const orbitPeriod = 2 * Math.PI * Math.sqrt(sep0 ** 3 / (1 * 2 * M));
  const slowLambda = 0.02 / orbitPeriod;
  lab.reset({ bh_behavior: 'Orbiting', orbit_decay_rate: slowLambda });
  const vRel = Math.sqrt((1 * (2 * M)) / sep0);
  const h1 = new physics.BlackHole(
    { x: -sep0 / 2, y: 0 },
    M,
    { x: 0, y: -vRel / 2 },
    true
  );
  const h2 = new physics.BlackHole(
    { x: sep0 / 2, y: 0 },
    M,
    { x: 0, y: vRel / 2 },
    true
  );
  h1.isNewlyCreated = false;
  h2.isNewlyCreated = false;
  physics.bh_list.push(h1, h2);
  lab.commit();

  const samples = [];
  const bdt = 0.1;
  // Long enough for the separation to fall by about a third, which is plenty
  // to fit an exponential and still far from the radii touching.
  const totalTime = 0.4 / (2 * slowLambda);
  const nSteps = Math.round(totalTime / bdt);
  const sampleEvery = Math.max(1, Math.floor(nSteps / 200));
  lab.step(bdt, nSteps, i => {
    if (i % sampleEvery === 0) {
      samples.push({
        t: i * bdt,
        a: hypot(h1.pos.x - h2.pos.x, h1.pos.y - h2.pos.y),
      });
    }
  });

  /** Slope of ln a against t, which is adot/a. */
  const logSlope = arr => {
    const mt = arr.reduce((acc, q) => acc + q.t, 0) / arr.length;
    const ml = arr.reduce((acc, q) => acc + Math.log(q.a), 0) / arr.length;
    let nn = 0;
    let dd = 0;
    for (const q of arr) {
      nn += (q.t - mt) * (Math.log(q.a) - ml);
      dd += (q.t - mt) ** 2;
    }
    return nn / dd;
  };

  add({
    group: 'Inspiral (approximation)',
    kind: 'approximation',
    name: 'Separation decays exponentially at -2 * decay rate',
    measured: logSlope(samples) / -slowLambda,
    expected: 2,
    unit: 'multiples of the decay rate',
    tolerance: 5e-2,
    why: 'The consequence of the damping term for a near-circular orbit: adot = -2 lambda a, derived above and measured here from an integrated black-hole binary rather than assumed. 5% covers the orbit acquiring a small eccentricity as it shrinks and the fit being over a finite window.',
  });

  add({
    group: 'Inspiral (approximation)',
    kind: 'approximation',
    name: 'Decay is exponential in time, not the GR power law',
    // Peters (1964): adot is proportional to a^-3, so the fractional decay
    // rate adot/a goes as a^-4 and accelerates violently as the binary
    // tightens. Here adot/a is a constant, so the late-window rate and the
    // early-window rate are the same.
    measured: (() => {
      const half = Math.floor(samples.length / 2);
      return logSlope(samples.slice(half)) / logSlope(samples.slice(0, half));
    })(),
    expected: 1,
    unit: 'late rate / early rate',
    tolerance: 5e-2,
    why: 'A documented departure from general relativity, quantified rather than merely disclaimed. Real gravitational-wave emission gives adot proportional to a^-3, so the fractional decay rate goes as a^-4: across a window in which the separation falls by a third, the late rate would be 3.4 times the early one. Here it is 1, because the model is a constant fractional damping of velocity. This check PASSES when the code matches its own documentation - the model page states that "the characteristic runaway at the end is not reproduced" - and it would FAIL if someone silently swapped in a different decay law without updating that page.',
    source: 'Peters (1964) Phys. Rev. 136, B1224',
  });

  // And the size of the departure, stated as the number it actually is.
  add({
    group: 'Inspiral (approximation)',
    kind: 'approximation',
    name: 'GR would give a late/early rate ratio of 3.4 over this window',
    measured: (samples[0].a / samples[samples.length - 1].a) ** 4,
    // The window is sized so that ln(a_start / a_end) = 0.4, so GR's a^-4
    // fractional decay rate would grow by exp(4 * 0.4) across it.
    expected: Math.exp(1.6),
    unit: 'ratio GR would show',
    tolerance: 0.1,
    why: "Not a test of Gravitas, but the number that makes the previous check mean something. The window is deliberately sized so the separation falls by a factor exp(0.4); under Peters' quadrupole formula the fractional decay rate goes as a^-4, so it would rise by exp(1.6) = 4.95 across the same window. The previous check confirms the implemented model holds that ratio at 1.00 within 5%. In other words: the quantity this model does not reproduce is one general relativity would move by a factor of five, and the suite measures the gap rather than asserting it.",
    source: 'Peters (1964) Phys. Rev. 136, B1224',
  });
}
