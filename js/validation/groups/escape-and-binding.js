// ===========================================================================
// 6. Escape velocity and the bound/unbound boundary
// ===========================================================================

import { REF, makeTracer, makeStar, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  physics,
  orbital,
  energyWidgets,
  add,
  lab,
}) {
  const G = 1;
  const M = 1000;
  const r = 100;

  add({
    group: 'Escape and binding',
    kind: 'analytic',
    name: 'Escape speed is sqrt(2) times circular speed',
    measured: Math.sqrt((2 * G * M) / r) / Math.sqrt((G * M) / r),
    expected: Math.SQRT2,
    unit: '',
    tolerance: 1e-15,
    why: 'An identity. Checked at machine precision because there is nothing else it could be.',
  });

  add({
    group: 'Escape and binding',
    kind: 'data',
    name: "Earth's surface escape speed",
    measured: energyWidgets.escapeSpeed(5.972e24, 6.371e6) / 1000,
    expected: REF.earthEscapeKms,
    unit: 'km/s',
    tolerance: 2e-3,
    why: 'The investigation quotes this number to a student, so it has to be the real one. Published to four figures; 0.2% covers the difference between the equatorial radius used here and the mean radius the published figure uses.',
    source: 'NASA Earth fact sheet',
  });

  add({
    group: 'Escape and binding',
    kind: 'data',
    name: "The Sun's surface escape speed",
    measured: energyWidgets.escapeSpeed(1.989e30, 6.957e8) / 1000,
    expected: REF.sunEscapeKms,
    unit: 'km/s',
    tolerance: 2e-3,
    source: 'NASA Sun fact sheet',
    why: "Same reasoning as Earth. The solar mass in kilograms carries G's uncertainty, which is why 0.2% rather than something tighter.",
  });

  add({
    group: 'Escape and binding',
    kind: 'data',
    name: "The Moon's surface escape speed",
    measured: energyWidgets.escapeSpeed(7.346e22, 1.7374e6) / 1000,
    expected: REF.moonEscapeKms,
    unit: 'km/s',
    tolerance: 5e-3,
    source: 'NASA Moon fact sheet',
    why: 'Published to three figures as 2.38 km/s, so 0.5% is finer than the reference.',
  });

  add({
    group: 'Escape and binding',
    kind: 'data',
    name: "Jupiter's surface escape speed",
    measured: energyWidgets.escapeSpeed(1.898e27, 7.1492e7) / 1000,
    expected: REF.jupiterEscapeKms,
    unit: 'km/s',
    tolerance: 5e-3,
    source: 'NASA Jupiter fact sheet',
    why: 'Published to three figures; the radius is the equatorial one, which is what the published escape speed uses.',
  });

  // The boundary itself, through the orbital-elements solver the inspector
  // and the "Bound, Unbound and Escape" lesson both read.
  const at = fraction => {
    const primary = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: M };
    const vEsc = Math.sqrt((2 * G * M) / r);
    const body = {
      pos: { x: r, y: 0 },
      vel: { x: 0, y: fraction * vEsc },
      mass: 0,
    };
    return orbital.orbitalElements(body, primary, G);
  };

  add({
    group: 'Escape and binding',
    kind: 'analytic',
    name: 'Specific energy is exactly zero at escape speed',
    measured: at(1).energy,
    expected: 0,
    unit: 'energy units',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'v^2/2 = mu/r by definition of the escape speed, so the difference is the round-off of one square root and one division.',
  });

  add({
    group: 'Escape and binding',
    kind: 'analytic',
    name: 'Just below escape speed the orbit is bound',
    measured: at(0.999).bound,
    expected: true,
    why: 'The sign of the specific energy is the whole content of the investigation. A tenth of a percent below escape must still come back.',
  });

  add({
    group: 'Escape and binding',
    kind: 'analytic',
    name: 'Just above escape speed the orbit is unbound',
    measured: at(1.001).bound,
    expected: false,
    why: 'And a tenth of a percent above must not.',
  });

  add({
    group: 'Escape and binding',
    kind: 'analytic',
    name: 'Eccentricity is exactly 1 at escape speed',
    measured: at(1).e,
    expected: 1,
    unit: '',
    tolerance: 1e-9,
    why: 'A parabolic orbit. This is an independent route to the same boundary: the energy check uses the vis-viva relation, this one uses the eccentricity vector, and a mistake in either would break the agreement.',
  });

  // And the boundary as the integrator sees it, which is the version a
  // student actually watches.
  const dt = 0.1; // the application's own timestep
  const runAt = (fraction, bound) => {
    lab.reset({ min_interaction_distance: 1e-6 });
    const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
    const vEsc = Math.sqrt((2 * G * M) / r);
    const p = makeTracer(physics, { x: r, y: 0 }, { x: 0, y: fraction * vEsc });
    physics.stars.push(s);
    physics.planets.push(p);
    lab.commit();
    // Long enough to reach apoapsis and no longer. Launched tangentially at
    // 0.98 v_esc from r = 100 the orbit has a = 1263 and a period of 8914
    // time units, so the turning point is not reached until half of that; a
    // shorter run measures how far the body has got, not how far it goes.
    // An unbound path has no turning point, so it needs only long enough to
    // establish that the separation is still increasing.
    const horizon = bound ? 0.55 * 8914 : 600;
    let maxSep = r;
    lab.step(dt, Math.round(horizon / dt), () => {
      maxSep = Math.max(maxSep, hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y));
    });
    return { maxSep, final: hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y) };
  };

  const sub = runAt(0.98, true);
  add({
    group: 'Escape and binding',
    kind: 'integration',
    name: 'At 0.98 v_esc the body turns around',
    measured: sub.maxSep,
    // r_apo = r / (2 - v^2 r / mu) for a radial-ish launch; here the launch is
    // tangential, so a = mu r / (2 mu - v^2 r) and apoapsis = a(1+e).
    expected: (() => {
      const v = 0.98 * Math.sqrt((2 * G * M) / r);
      const energy = (v * v) / 2 - (G * M) / r;
      const aa = -(G * M) / (2 * energy);
      const ee = Math.abs(1 - (r * v * v) / (G * M));
      return aa * (1 + ee);
    })(),
    unit: 'units',
    tolerance: 1e-3,
    why: "A very eccentric bound orbit - e = 0.92, apoapsis 24 times the launch radius - integrated at the application's own dt = 0.1. The measured error is 6e-5 and it falls by a factor of four when the timestep halves, so the turning-point distance converges at second order even though the scheme is first order in energy: the apoapsis depends on the orbit-averaged energy, and symplectic Euler's energy error is oscillatory and largely cancels over a symmetric orbit. 1e-3 is fifteen times the measured error, which leaves room for the periapsis resolution without admitting a wrong semi-major axis.",
  });

  const sup = runAt(1.02, false);
  add({
    group: 'Escape and binding',
    kind: 'integration',
    name: 'At 1.02 v_esc the body never turns around',
    measured: sup.final >= sup.maxSep * 0.999,
    expected: true,
    why: 'On an unbound orbit the separation increases monotonically after launch, so the final separation is the largest one seen. Stated as a monotonicity test rather than a distance, because the distance an unbound body reaches depends only on how long the test runs.',
  });
}
